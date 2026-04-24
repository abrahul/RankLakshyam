import TopicPracticeClient from "./topic-practice-client";

export default async function TopicPracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ topicId: string }>;
  searchParams: Promise<{ subTopic?: string; categoryId?: string; level?: string; exam?: string }>;
}) {
  const { topicId } = await params;
  const { subTopic, categoryId, level, exam } = await searchParams;
  return <TopicPracticeClient topicId={topicId} subTopic={subTopic} categoryId={categoryId || level} exam={exam} />;
}
