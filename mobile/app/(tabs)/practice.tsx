import React, { useState } from "react";
import { ScrollView, Text, View, StyleSheet, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import SafeScreen from "../../src/components/layout/SafeScreen";
import Card from "../../src/components/ui/Card";
import Loading from "../../src/components/ui/Loading";
import { categoriesApi, topicsApi } from "../../src/api/services";
import { queryKeys } from "../../src/constants/queryKeys";
import { colors } from "../../src/constants/colors";

export default function PracticeScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  const categories = useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      const res = await categoriesApi.list();
      if (!res.success) throw new Error("Failed to load categories");
      return res.data;
    },
    staleTime: 1000 * 60 * 30, // Cache 30 min
  });

  const topics = useQuery({
    queryKey: queryKeys.topics(selectedCategory),
    queryFn: async () => {
      const res = await topicsApi.list(selectedCategory);
      if (!res.success) throw new Error("Failed to load topics");
      return res.data;
    },
    staleTime: 1000 * 60 * 15,
  });

  if (categories.isLoading) return <Loading />;

  return (
    <SafeScreen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={topics.isRefetching}
            onRefresh={() => topics.refetch()}
            tintColor={colors.primary[400]}
          />
        }
      >
        <Text style={styles.title}>Practice</Text>
        <Text style={styles.subtitle}>Choose a category and topic</Text>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          <Pressable
            style={[styles.chip, !selectedCategory && styles.chipActive]}
            onPress={() => setSelectedCategory(undefined)}
          >
            <Text style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>All</Text>
          </Pressable>
          {(categories.data || []).map((cat: any) => (
            <Pressable
              key={cat._id}
              style={[styles.chip, selectedCategory === cat._id && styles.chipActive]}
              onPress={() => setSelectedCategory(cat._id)}
            >
              <Text style={[styles.chipText, selectedCategory === cat._id && styles.chipTextActive]}>
                {cat.name?.en || cat.slug}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* PYQ Card */}
        <Pressable
          style={({ pressed }) => [styles.pyqCard, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => router.push("/practice/pyq")}
        >
          <Text style={styles.pyqEmoji}>📋</Text>
          <View>
            <Text style={styles.pyqTitle}>Previous Year Questions</Text>
            <Text style={styles.pyqSubtitle}>Practice real exam papers</Text>
          </View>
        </Pressable>

        {/* Topics */}
        {topics.isLoading ? (
          <Loading message="Loading topics..." />
        ) : (
          <View style={styles.topicGrid}>
            {(topics.data || []).map((topic: any) => (
              <Pressable
                key={topic.id}
                style={({ pressed }) => [styles.topicCard, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => router.push(`/practice/${topic.id}`)}
              >
                <Text style={styles.topicIcon}>{topic.icon || "📚"}</Text>
                <Text style={styles.topicName} numberOfLines={2}>
                  {topic.name?.en || topic.id}
                </Text>
                <Text style={styles.topicCount}>{topic.questionCount || 0} q</Text>
                {topic.subTopics?.length > 0 && (
                  <Text style={styles.topicSubs}>{topic.subTopics.length} subtopics</Text>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  title: { fontSize: 24, fontWeight: "800", color: colors.white, marginBottom: 4 },
  subtitle: { fontSize: 14, color: "rgba(226,232,240,0.5)", marginBottom: 16 },

  chipScroll: { marginBottom: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: "rgba(99,102,241,0.2)",
    borderColor: "rgba(99,102,241,0.4)",
  },
  chipText: { fontSize: 13, fontWeight: "600", color: "rgba(226,232,240,0.5)" },
  chipTextActive: { color: colors.primary[300] },

  pyqCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  pyqEmoji: { fontSize: 28 },
  pyqTitle: { fontSize: 15, fontWeight: "700", color: colors.white },
  pyqSubtitle: { fontSize: 12, color: "rgba(226,232,240,0.5)", marginTop: 2 },

  topicGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  topicCard: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  topicIcon: { fontSize: 28 },
  topicName: { fontSize: 14, fontWeight: "600", color: colors.white },
  topicCount: { fontSize: 11, color: "rgba(226,232,240,0.4)" },
  topicSubs: { fontSize: 11, color: colors.primary[400] },
});
