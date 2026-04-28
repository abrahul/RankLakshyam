import { redirect } from "next/navigation";

function getFirst(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value[0] || "" : value;
}

export default async function LegacyPracticePyqPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  const categoryId = getFirst(sp.categoryId || sp.level);
  const exam = getFirst(sp.exam);
  const year = getFirst(sp.year);

  if (categoryId) params.set("categoryId", categoryId);
  if (exam) params.set("exam", exam);
  if (year) params.set("year", year);

  const query = params.toString();
  redirect(`/pyq${query ? `?${query}` : ""}`);
}
