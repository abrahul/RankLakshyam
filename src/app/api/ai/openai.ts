type OpenAIResponsesInput =
  | string
  | Array<{
      role: "system" | "user" | "assistant";
      content:
        | Array<{
            type: "input_text";
            text: string;
          }>;
    }>;

function extractOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const maybe = payload as {
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  if (typeof maybe.output_text === "string" && maybe.output_text.trim()) {
    return maybe.output_text;
  }

  const output = Array.isArray(maybe.output) ? maybe.output : [];
  const parts: string[] = [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (c?.type === "output_text" && typeof c.text === "string") {
        parts.push(c.text);
      }
    }
  }
  const merged = parts.join("");
  return merged.trim() ? merged : null;
}

export async function createOpenAIJsonResponse<T>({
  apiKey,
  model,
  system,
  user,
  schemaName,
  jsonSchema,
  temperature = 0.4,
}: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  schemaName: string;
  jsonSchema: unknown;
  temperature?: number;
}): Promise<{ rawText: string; json: T }> {
  const input: OpenAIResponsesInput = [
    { role: "system", content: [{ type: "input_text", text: system }] },
    { role: "user", content: [{ type: "input_text", text: user }] },
  ];

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input,
      temperature,
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema: jsonSchema,
        },
      },
    }),
  });

  const body = (await res.json()) as unknown;
  if (!res.ok) {
    const msg = (() => {
      if (!body || typeof body !== "object") return "OpenAI request failed";
      const error = (body as { error?: unknown }).error;
      if (!error || typeof error !== "object") return "OpenAI request failed";
      const message = (error as { message?: unknown }).message;
      return typeof message === "string" && message.trim()
        ? message
        : "OpenAI request failed";
    })();
    throw new Error(msg);
  }

  const rawText = extractOutputText(body);
  if (!rawText) throw new Error("OpenAI response missing output text");

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("OpenAI returned non-JSON output");
  }

  return { rawText, json: parsed as T };
}
