import TopicPracticeClient from "./topic-practice-client";

export default async function TopicPracticePage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  return <TopicPracticeClient topicId={topicId} />;
}

