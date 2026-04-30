import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Card from "../ui/Card";
import { colors } from "../../constants/colors";

interface ExplanationPanelProps {
  isCorrect: boolean;
  explanationEn: string;
  explanationMl?: string;
  correctOption: string;
  lang?: "en" | "ml" | "both";
}

export default function ExplanationPanel({
  isCorrect,
  explanationEn,
  explanationMl,
  correctOption,
  lang = "both",
}: ExplanationPanelProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.verdict, { color: isCorrect ? colors.success[400] : colors.error[400] }]}>
          {isCorrect ? "✓ Correct!" : "✕ Wrong"}
        </Text>
        <Text style={styles.correctLabel}>Answer: {correctOption}</Text>
      </View>
      {lang !== "ml" && explanationEn ? (
        <Text style={styles.explanation}>{explanationEn}</Text>
      ) : null}
      {lang !== "en" && explanationMl ? (
        <Text style={styles.explanationMl}>{explanationMl}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  verdict: {
    fontSize: 14,
    fontWeight: "700",
  },
  correctLabel: {
    fontSize: 12,
    color: "rgba(226,232,240,0.5)",
  },
  explanation: {
    fontSize: 13,
    color: "rgba(226,232,240,0.75)",
    lineHeight: 20,
  },
  explanationMl: {
    fontSize: 13,
    color: "rgba(226,232,240,0.6)",
    lineHeight: 20,
    marginTop: 4,
  },
});
