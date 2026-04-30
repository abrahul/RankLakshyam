import React from "react";
import { ScrollView, Text, View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import SafeScreen from "../../src/components/layout/SafeScreen";
import Card from "../../src/components/ui/Card";
import Loading from "../../src/components/ui/Loading";
import { reviewApi } from "../../src/api/services";
import { queryKeys } from "../../src/constants/queryKeys";
import { colors } from "../../src/constants/colors";

export default function UnattemptedReviewScreen() {
  const router = useRouter();

  const review = useQuery({
    queryKey: queryKeys.review("unattempted"),
    queryFn: async () => {
      const res = await reviewApi.get("unattempted", 1, 50);
      if (!res.success) throw new Error("Failed");
      return res.data || [];
    },
  });

  if (review.isLoading) return <Loading />;

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Review</Text>
        </Pressable>
        <Text style={styles.title}>Unattempted</Text>
        <Text style={styles.subtitle}>Questions you skipped</Text>

        {(review.data || []).length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>⏭️</Text>
            <Text style={styles.emptyText}>No skipped questions</Text>
          </View>
        ) : (
          (review.data || []).map((q: any) => (
            <Card key={q._id} style={styles.card}>
              <Text style={styles.questionText}>{q.text?.en}</Text>
              <View style={styles.meta}>
                <Text style={styles.metaText}>{q.topicId}</Text>
                <Text style={styles.metaText}>Answer: {q.correctOption}</Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  back: { fontSize: 14, color: "rgba(226,232,240,0.5)", marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "800", color: colors.white, marginBottom: 4 },
  subtitle: { fontSize: 14, color: "rgba(226,232,240,0.5)", marginBottom: 16 },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 15, color: "rgba(226,232,240,0.5)" },
  card: { marginBottom: 10 },
  questionText: { fontSize: 14, fontWeight: "600", color: colors.white, lineHeight: 22 },
  meta: { flexDirection: "row", gap: 12, marginTop: 8 },
  metaText: { fontSize: 11, color: "rgba(226,232,240,0.4)", backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
});
