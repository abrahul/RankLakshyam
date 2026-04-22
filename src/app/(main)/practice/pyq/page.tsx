import { Suspense } from "react";
import PyqPracticeClient from "./pyq-practice-client";

function getFirst(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value[0] || "" : value;
}

export default async function PyqPracticePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const exam = getFirst(sp.exam).toLowerCase();
  const year = getFirst(sp.year);

  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-dvh px-6">
          <div className="w-12 h-12 border-3 border-primary-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-surface-200/60">Loading PYQ practice...</p>
        </div>
      }
    >
      <PyqPracticeClient exam={exam} year={year} />
    </Suspense>
  );
}

