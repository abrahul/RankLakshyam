import TopicPracticeClient from "./topic-practice-client";

export default async function TopicPracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ topicId: string }>;
  searchParams: Promise<{ subTopic?: string; exam?: string; pscLevel?: string; pscExam?: string }>;
}) {
  const { topicId } = await params;
  const { subTopic, exam, pscLevel, pscExam } = await searchParams;
  return <TopicPracticeClient topicId={topicId} subTopic={subTopic} exam={exam} pscLevel={pscLevel} pscExam={pscExam} />;
}
