import React, { useState, useCallback, useRef, useEffect } from "react";
import { ScrollView, Text, View, StyleSheet, Pressable, Alert } from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import SafeScreen from "../../src/components/layout/SafeScreen";
import Card from "../../src/components/ui/Card";
import Button from "../../src/components/ui/Button";
import ProgressBar from "../../src/components/ui/ProgressBar";
import OptionButton from "../../src/components/question/OptionButton";
import ExplanationPanel from "../../src/components/question/ExplanationPanel";
import Loading from "../../src/components/ui/Loading";
import { dailyChallengeApi, sessionsApi, attemptsApi } from "../../src/api/services";
import { queryKeys } from "../../src/constants/queryKeys";
import { colors } from "../../src/constants/colors";
import type { Question, AttemptResult } from "../../src/types/question";

export default function ChallengeScreen() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [timer, setTimer] = useState(0);
  const [lang, setLang] = useState<"en" | "ml" | "both">("both");
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const challenge = useQuery({
    queryKey: queryKeys.dailyChallenge,
    queryFn: async () => {
      const res = await dailyChallengeApi.get();
      if (!res.success) throw new Error("Failed to load challenge");
      return res.data;
    },
  });

  const data = challenge.data;
  const questions: Question[] = data?.questions || [];
  const current = questions[currentIndex];
  const isCompleted = data?.existingSession?.status === "completed";

  // Start/resume session
  useEffect(() => {
    if (!data) return;
    if (data.existingSession) {
      setSessionId(data.existingSession.id);
      setCurrentIndex(data.existingSession.currentIndex || 0);
      if (data.existingSession.status === "completed") {
        setShowResults(true);
      }
    }
  }, [data]);

  // Timer
  useEffect(() => {
    if (result || showResults || !current) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIndex, result, showResults, current]);

  // Create session
  const createSession = useMutation({
    mutationFn: async () => {
      const res = await sessionsApi.create({
        type: "daily",
        questionIds: questions.map((q) => q._id),
        context: { dailyChallengeDate: data?.date },
      });
      if (!res.success) throw new Error("Failed to create session");
      return res.data;
    },
    onSuccess: (d) => {
      setSessionId(d.sessionId);
      setCurrentIndex(d.currentIndex || 0);
    },
  });

  // Submit answer
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId || !selectedOption || !current) throw new Error("Missing data");
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
      if (data.isComplete) {
        // Allow viewing explanation, then show results
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
    setCurrentIndex((i) => i + 1);
  };

  const handleStart = () => {
    if (!sessionId) {
      createSession.mutate();
    }
  };

  if (challenge.isLoading) return <Loading message="Loading challenge..." />;

  if (!data || questions.length === 0) {
    return (
      <SafeScreen>
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>No challenge available today</Text>
          <Button title="Retry" onPress={() => challenge.refetch()} />
        </View>
      </SafeScreen>
    );
  }

  // Results screen
  if (showResults) {
    const session = data.existingSession;
    const correct = session?.correctCount || 0;
    const total = questions.length;
    const accuracy = total ? Math.round((correct / total) * 100) : 0;
    return (
      <SafeScreen>
        <ScrollView contentContainerStyle={styles.resultScroll}>
          <Text style={styles.resultEmoji}>🏁</Text>
          <Text style={styles.resultTitle}>Challenge Complete!</Text>
          <Text style={styles.resultScore}>
            {correct} / {total} correct ({accuracy}%)
          </Text>
          <View style={styles.resultGrid}>
            <Card style={styles.resultStat}>
              <Text style={[styles.resultStatValue, { color: colors.success[400] }]}>{correct}</Text>
              <Text style={styles.resultStatLabel}>Correct</Text>
            </Card>
            <Card style={styles.resultStat}>
              <Text style={[styles.resultStatValue, { color: colors.error[400] }]}>{total - correct}</Text>
              <Text style={styles.resultStatLabel}>Wrong</Text>
            </Card>
          </View>
        </ScrollView>
      </SafeScreen>
    );
  }

  // Pre-start
  if (!sessionId) {
    return (
      <SafeScreen>
        <View style={styles.center}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>⚡</Text>
          <Text style={styles.preTitle}>Daily Challenge</Text>
          <Text style={styles.preSubtitle}>{questions.length} questions • Mixed topics</Text>
          <Button
            title={createSession.isPending ? "Starting..." : "Start Challenge"}
            onPress={handleStart}
            disabled={createSession.isPending}
            style={{ marginTop: 24, paddingHorizontal: 40 }}
          />
        </View>
      </SafeScreen>
    );
  }

  if (!current) return <Loading />;

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.questionNum}>
            Q {currentIndex + 1} / {questions.length}
          </Text>
          <Pressable onPress={() => setLang(lang === "both" ? "en" : lang === "en" ? "ml" : "both")}>
            <Text style={styles.langToggle}>{lang === "both" ? "EN+ML" : lang.toUpperCase()}</Text>
          </Pressable>
          <Text style={styles.timer}>{timer}s</Text>
        </View>

        <ProgressBar
          progress={((currentIndex + (result ? 1 : 0)) / questions.length) * 100}
          height={3}
        />

        {/* Question */}
        <Card style={styles.questionCard}>
          {lang !== "ml" && <Text style={styles.questionText}>{current.text.en}</Text>}
          {lang !== "en" && current.text.ml && (
            <Text style={styles.questionTextMl}>{current.text.ml}</Text>
          )}
        </Card>

        {/* Options */}
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

        {/* Explanation */}
        {result && !result.skipped && (
          <ExplanationPanel
            isCorrect={result.isCorrect}
            explanationEn={result.explanation?.en || ""}
            explanationMl={result.explanation?.ml}
            correctOption={result.correctOption}
            lang={lang}
          />
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {result ? (
            <Button title={result.isComplete ? "View Results" : "Next →"} onPress={handleNext} style={{ flex: 1 }} />
          ) : (
            <Button
              title={submitMutation.isPending ? "Submitting..." : "Submit"}
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  questionNum: { fontSize: 12, color: "rgba(226,232,240,0.5)" },
  langToggle: { fontSize: 12, fontWeight: "600", color: "rgba(226,232,240,0.6)", backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  timer: { fontSize: 12, color: "rgba(226,232,240,0.4)" },
  questionCard: { marginTop: 12 },
  questionText: { fontSize: 15, fontWeight: "600", color: colors.white, lineHeight: 24 },
  questionTextMl: { fontSize: 14, color: "rgba(226,232,240,0.7)", lineHeight: 22, marginTop: 4 },
  options: { gap: 10, marginTop: 16 },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 },

  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: "rgba(226,232,240,0.6)", marginBottom: 16 },

  preTitle: { fontSize: 24, fontWeight: "800", color: colors.white },
  preSubtitle: { fontSize: 14, color: "rgba(226,232,240,0.5)", marginTop: 6 },

  resultScroll: { paddingHorizontal: 16, paddingTop: 60, alignItems: "center" },
  resultEmoji: { fontSize: 48, marginBottom: 16 },
  resultTitle: { fontSize: 24, fontWeight: "800", color: colors.white, marginBottom: 8 },
  resultScore: { fontSize: 15, color: "rgba(226,232,240,0.6)", marginBottom: 24 },
  resultGrid: { flexDirection: "row", gap: 12, width: "100%" },
  resultStat: { flex: 1, alignItems: "center", paddingVertical: 20 },
  resultStatValue: { fontSize: 28, fontWeight: "800" },
  resultStatLabel: { fontSize: 12, color: "rgba(226,232,240,0.5)", marginTop: 4 },
});
