import React from "react";
import { ScrollView, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import SafeScreen from "../../src/components/layout/SafeScreen";
import Card from "../../src/components/ui/Card";
import Loading from "../../src/components/ui/Loading";
import ProgressBar from "../../src/components/ui/ProgressBar";
import { weakAreasApi } from "../../src/api/services";
import { queryKeys } from "../../src/constants/queryKeys";
import { colors } from "../../src/constants/colors";

export default function WeakAreasScreen() {
  const router = useRouter();
  const q = useQuery({
    queryKey: queryKeys.weakAreas,
    queryFn: async () => {
      const res = await weakAreasApi.get();
      if (!res.success) throw new Error("Failed");
      return res.data;
    },
  });
  if (q.isLoading) return <Loading />;
  const topics = q.data?.weakTopics || [];
  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={s.scroll}>
        <Pressable onPress={() => router.back()}>
          <Text style={s.back}>← Review</Text>
        </Pressable>
        <Text style={s.title}>Weak Areas</Text>
        {topics.map((t: any) => (
          <Card key={t.topicId} style={s.card}>
            <Text style={s.topic}>{t.topicId.replace(/_/g, " ")}</Text>
            <Text style={s.acc}>{t.accuracy}% ({t.attempts} attempts)</Text>
            <ProgressBar progress={t.accuracy} color={t.accuracy < 40 ? colors.error[400] : colors.warning[400]} />
          </Card>
        ))}
      </ScrollView>
    </SafeScreen>
  );
}
const s = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  back: { fontSize: 14, color: "rgba(226,232,240,0.5)", marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "800", color: colors.white, marginBottom: 16 },
  card: { marginBottom: 10, gap: 6 },
  topic: { fontSize: 14, fontWeight: "600", color: colors.white, textTransform: "capitalize" },
  acc: { fontSize: 12, color: "rgba(226,232,240,0.5)" },
});
