import React, { useState, useRef, useEffect } from "react";
import { ScrollView, Text, View, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import SafeScreen from "../../src/components/layout/SafeScreen";
import Card from "../../src/components/ui/Card";
import Button from "../../src/components/ui/Button";
import ProgressBar from "../../src/components/ui/ProgressBar";
import OptionButton from "../../src/components/question/OptionButton";
import ExplanationPanel from "../../src/components/question/ExplanationPanel";
import Loading from "../../src/components/ui/Loading";
import { questionsApi, sessionsApi, attemptsApi } from "../../src/api/services";
import { queryKeys } from "../../src/constants/queryKeys";
import { colors } from "../../src/constants/colors";
import type { Question, AttemptResult } from "../../src/types/question";

export default function TopicPracticeScreen() {
  const { topicId, subtopicId, subtopicName } = useLocalSearchParams<{
    topicId: string;
    subtopicId?: string;
    subtopicName?: string;
  }>();
  const router = useRouter();
  const decodedTopicId = decodeURIComponent(topicId || "");
  const decodedSubtopicName = subtopicName ? decodeURIComponent(subtopicName) : "";

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [lang, setLang] = useState<"en" | "ml" | "both">("both");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const questionsQuery = useQuery({
    queryKey: queryKeys.questions({
      topic: decodedTopicId,
      ...(subtopicId ? { subtopicId } : {}),
      all: "1",
      limit: "500",
    }),
    queryFn: async () => {
      const res = await questionsApi.list({
        topic: decodedTopicId,
        ...(subtopicId ? { subtopicId } : {}),
        all: "1",
        limit: "500",
      });
      if (!res.success) throw new Error("Failed to load questions");
      return (res.data || []) as Question[];
    },
    enabled: !!decodedTopicId,
  });

  const questions = questionsQuery.data || [];
  const current = questions[currentIndex];

  // Timer
  useEffect(() => {
    if (result || showResults || !current) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIndex, result, showResults, current]);

  // Create session when questions load
  const createSession = useMutation({
    mutationFn: async () => {
      const res = await sessionsApi.create({
        type: "topic",
        questionIds: questions.map((q) => q._id),
        context: { topicId: decodedTopicId, subtopicId, all: "1" },
      });
      if (!res.success) throw new Error("Failed to create session");
      return res.data;
    },
    onSuccess: (d) => {
      setSessionId(d.sessionId);
      setCurrentIndex(d.currentIndex || 0);
    },
  });

  useEffect(() => {
    if (questions.length > 0 && !sessionId) {
      createSession.mutate();
    }
  }, [questions.length]);

  // Submit
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId || !selectedOption || !current) throw new Error("Missing");
      const res = await attemptsApi.submit({
        sessionId,
        questionId: current._id,
        selectedOption,
        timeTakenSec: timer,
      });
      if (!res.success) throw new Error("Submit failed");
      return res.data as AttemptResult;
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.isCorrect) setCorrectCount((c) => c + 1);
    },
  });

  // Skip
  const skipMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId || !current) throw new Error("Missing");
      const res = await attemptsApi.submit({
        sessionId,
        questionId: current._id,
        selectedOption: null,
        timeTakenSec: timer,
        action: "skip",
      });
      if (!res.success) throw new Error("Skip failed");
      return res.data as AttemptResult;
    },
    onSuccess: (data) => {
      if (data.isComplete) {
        setShowResults(true);
      } else {
        handleNext();
      }
    },
  });

  const handleNext = () => {
    if (result?.isComplete) {
      setShowResults(true);
      return;
    }
    setSelectedOption(null);
    setResult(null);
    setTimer(0);
    setCurrentIndex((i) => Math.min(i + 1, questions.length - 1));
  };

  if (questionsQuery.isLoading || createSession.isPending) return <Loading message="Loading practice..." />;

  if (questions.length === 0) {
    return (
      <SafeScreen>
        <View style={styles.center}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>📭</Text>
          <Text style={styles.emptyText}>
            No questions available for this {subtopicId ? "subtopic" : "topic"}
          </Text>
          <Button title="Back" onPress={() => router.back()} style={{ marginTop: 16 }} />
        </View>
      </SafeScreen>
    );
  }

  if (showResults) {
    const attempted = currentIndex + 1;
    const accuracy = attempted ? Math.round((correctCount / attempted) * 100) : 0;
    return (
      <SafeScreen>
        <ScrollView contentContainerStyle={styles.resultScroll}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🏁</Text>
          <Text style={styles.resultTitle}>Session Complete</Text>
          <Text style={styles.resultScore}>{correctCount} / {attempted} correct ({accuracy}%)</Text>
          <Button title="Back to Practice" onPress={() => router.back()} style={{ marginTop: 24 }} />
        </ScrollView>
      </SafeScreen>
    );
  }

  if (!current) return <Loading />;

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>
          <Text style={styles.topicLabel}>{decodedTopicId.replace(/_/g, " ")}</Text>
        </View>

        {decodedSubtopicName && (
          <Text style={styles.subtopicLabel} numberOfLines={2}>
            {decodedSubtopicName}
          </Text>
        )}

        <View style={styles.subHeader}>
          <Text style={styles.questionNum}>Q {currentIndex + 1} / {questions.length}</Text>
          <Pressable onPress={() => setLang(lang === "both" ? "en" : lang === "en" ? "ml" : "both")}>
            <Text style={styles.langToggle}>{lang === "both" ? "EN+ML" : lang.toUpperCase()}</Text>
          </Pressable>
          <Text style={styles.timer}>{timer}s</Text>
        </View>

        <ProgressBar progress={((currentIndex + (result ? 1 : 0)) / questions.length) * 100} height={3} />

        <Card style={styles.questionCard}>
          {lang !== "ml" && <Text style={styles.questionText}>{current.text.en}</Text>}
          {lang !== "en" && current.text.ml && (
            <Text style={styles.questionTextMl}>{current.text.ml}</Text>
          )}
        </Card>

        <View style={styles.options}>
          {current.options.map((opt, idx) => {
            const key = (opt.key || ["A", "B", "C", "D"][idx] || "A").toUpperCase();
            return (
              <OptionButton
                key={`${key}-${idx}`}
                optionKey={key}
                textEn={opt.en}
                textMl={opt.ml}
                isSelected={selectedOption === key}
                isCorrect={result ? key === result.correctOption : undefined}
                isWrong={result ? key === selectedOption && !result.isCorrect : undefined}
                showResult={!!result && !result.skipped}
                disabled={!!result}
                onPress={() => setSelectedOption(key)}
                lang={lang}
              />
            );
          })}
        </View>

        {result && !result.skipped && (
          <ExplanationPanel
            isCorrect={result.isCorrect}
            explanationEn={result.explanation?.en || ""}
            explanationMl={result.explanation?.ml}
            correctOption={result.correctOption}
            lang={lang}
          />
        )}

        <View style={styles.actions}>
          {!result && (
            <Button
              title="Skip"
              variant="secondary"
              onPress={() => skipMutation.mutate()}
              disabled={skipMutation.isPending}
              style={{ flex: 0.4 }}
            />
          )}
          {result ? (
            <Button title={result.isComplete ? "Finish" : "Next →"} onPress={handleNext} style={{ flex: 1 }} />
          ) : (
            <Button
              title={submitMutation.isPending ? "..." : "Submit"}
              onPress={() => submitMutation.mutate()}
              disabled={!selectedOption || submitMutation.isPending}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  emptyText: { fontSize: 15, color: "rgba(226,232,240,0.6)" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  back: { fontSize: 14, color: "rgba(226,232,240,0.5)" },
  topicLabel: { fontSize: 12, color: "rgba(226,232,240,0.3)", textTransform: "uppercase" },
  subtopicLabel: { fontSize: 15, fontWeight: "700", color: colors.white, marginBottom: 8 },
  subHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  questionNum: { fontSize: 12, color: "rgba(226,232,240,0.5)" },
  langToggle: { fontSize: 12, fontWeight: "600", color: "rgba(226,232,240,0.6)", backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  timer: { fontSize: 12, color: "rgba(226,232,240,0.4)" },
  questionCard: { marginTop: 12 },
  questionText: { fontSize: 15, fontWeight: "600", color: colors.white, lineHeight: 24 },
  questionTextMl: { fontSize: 14, color: "rgba(226,232,240,0.7)", lineHeight: 22, marginTop: 4 },
  options: { gap: 10, marginTop: 16 },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  resultScroll: { paddingHorizontal: 16, paddingTop: 60, alignItems: "center" },
  resultTitle: { fontSize: 24, fontWeight: "800", color: colors.white, marginBottom: 8 },
  resultScore: { fontSize: 15, color: "rgba(226,232,240,0.6)" },
});
