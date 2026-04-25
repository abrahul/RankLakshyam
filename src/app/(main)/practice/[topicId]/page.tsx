import TopicPracticeClient from "./topic-practice-client";

function normalizeTopicId(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function TopicPracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ topicId: string }>;
  searchParams: Promise<{ subTopic?: string; categoryId?: string; level?: string; exam?: string }>;
}) {
  const { topicId: rawTopicId } = await params;
  const { subTopic, categoryId, level, exam } = await searchParams;
  return (
    <TopicPracticeClient
      topicId={normalizeTopicId(rawTopicId)}
      subTopic={subTopic}
      categoryId={categoryId || level}
      exam={exam}
    />
  );
}
