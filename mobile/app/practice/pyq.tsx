import React from "react";
import { ScrollView, Text, View, StyleSheet, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import SafeScreen from "../../src/components/layout/SafeScreen";
import Card from "../../src/components/ui/Card";
import Loading from "../../src/components/ui/Loading";
import { examsApi } from "../../src/api/services";
import { queryKeys } from "../../src/constants/queryKeys";
import { colors } from "../../src/constants/colors";

export default function PYQScreen() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");

  const exams = useQuery({
    queryKey: queryKeys.exams(),
    queryFn: async () => {
      const res = await examsApi.list();
      if (!res.success) throw new Error("Failed");
      return res.data || [];
    },
    staleTime: 1000 * 60 * 30,
  });

  const filteredExams = (exams.data || []).filter((e: any) =>
    `${e.name} ${e.code || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  if (exams.isLoading) return <Loading />;

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Previous Year Questions</Text>
        <Text style={styles.subtitle}>Search and practice real exam papers</Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Search exam name or code..."
          placeholderTextColor="rgba(226,232,240,0.3)"
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.grid}>
          {filteredExams.slice(0, 30).map((exam: any) => (
            <Pressable
              key={exam._id}
              style={({ pressed }) => [styles.examCard, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => {
                // Navigate to practice with pyq params
                router.push(`/practice/${encodeURIComponent(exam.name)}` as any);
              }}
            >
              <Text style={styles.examName} numberOfLines={2}>{exam.name}</Text>
              {exam.code && <Text style={styles.examCode}>{exam.code}</Text>}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  back: { fontSize: 14, color: "rgba(226,232,240,0.5)", marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "800", color: colors.white, marginBottom: 4 },
  subtitle: { fontSize: 14, color: "rgba(226,232,240,0.5)", marginBottom: 16 },
  searchInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.white,
    marginBottom: 16,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  examCard: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  examName: { fontSize: 13, fontWeight: "600", color: colors.white },
  examCode: { fontSize: 11, color: "rgba(226,232,240,0.4)" },
});
