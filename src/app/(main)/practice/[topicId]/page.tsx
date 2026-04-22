import TopicPracticeClient from "./topic-practice-client";

export default async function TopicPracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ topicId: string }>;
  searchParams: Promise<{ subTopic?: string; exam?: string }>;
}) {
  const { topicId } = await params;
  const { subTopic, exam } = await searchParams;
  return <TopicPracticeClient topicId={topicId} subTopic={subTopic} exam={exam} />;
}
