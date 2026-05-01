import React, { useState } from "react";
import { ScrollView, Text, View, StyleSheet, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import SafeScreen from "../../src/components/layout/SafeScreen";
import Loading from "../../src/components/ui/Loading";
import { categoriesApi, topicsApi } from "../../src/api/services";
import { queryKeys } from "../../src/constants/queryKeys";
import { colors } from "../../src/constants/colors";

type LocalizedName = {
  en?: string;
  ml?: string;
};

type Category = {
  _id: string;
  slug?: string;
  name?: LocalizedName;
};

type TopicSubtopic = {
  id: string;
  name?: LocalizedName;
  questionCount?: number;
};

type Topic = {
  id: string;
  name?: LocalizedName;
  icon?: string;
  questionCount?: number;
  subTopics?: TopicSubtopic[];
};

export default function PracticeScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

  const categories = useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      const res = await categoriesApi.list();
      if (!res.success) throw new Error("Failed to load categories");
      return (res.data || []) as Category[];
    },
    staleTime: 1000 * 60 * 30,
  });

  const topics = useQuery({
    queryKey: queryKeys.topics(selectedCategory),
    queryFn: async () => {
      const res = await topicsApi.list(selectedCategory);
      if (!res.success) throw new Error("Failed to load topics");
      return (res.data || []) as Topic[];
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
        <Text style={styles.subtitle}>Pick a topic or drill one subtopic</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          <Pressable
            style={[styles.chip, !selectedCategory && styles.chipActive]}
            onPress={() => setSelectedCategory(undefined)}
          >
            <Text style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>All</Text>
          </Pressable>
          {(categories.data || []).map((cat) => (
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

        <Pressable
          style={({ pressed }) => [styles.pyqCard, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => router.push("/practice/pyq")}
        >
          <Text style={styles.pyqIcon}>PYQ</Text>
          <View>
            <Text style={styles.pyqTitle}>Previous Year Questions</Text>
            <Text style={styles.pyqSubtitle}>Practice real exam papers</Text>
          </View>
        </Pressable>

        {topics.isLoading ? (
          <Loading message="Loading topics..." />
        ) : (
          <View style={styles.topicList}>
            {(topics.data || []).map((topic) => {
              const isExpanded = expandedTopicId === topic.id;

              return (
              <View key={topic.id} style={styles.topicPanel}>
                <Pressable
                  style={({ pressed }) => [styles.topicHeader, { opacity: pressed ? 0.82 : 1 }]}
                  onPress={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                >
                  <View style={styles.topicTitleRow}>
                    <Text style={styles.topicIcon}>{topic.icon || "📚"}</Text>
                    <View style={styles.topicTitleBlock}>
                      <Text style={styles.topicName} numberOfLines={2}>
                        {topic.name?.en || topic.id}
                      </Text>
                      <Text style={styles.topicCount}>{topic.questionCount || 0} questions</Text>
                    </View>
                  </View>
                  <Text style={styles.chevron}>{isExpanded ? "▲" : "▼"}</Text>
                  <Pressable
                    style={({ pressed }) => [styles.startButton, { opacity: pressed ? 0.8 : 1 }]}
                    onPress={() =>
                      router.push({
                        pathname: "/practice/[topicId]",
                        params: { topicId: topic.id },
                      })
                    }
                  >
                    <Text style={styles.startButtonText}>Start all</Text>
                  </Pressable>
                </Pressable>

                {isExpanded && topic.subTopics?.length ? (
                  <View style={styles.subtopicList}>
                    {topic.subTopics.map((subtopic) => (
                      <Pressable
                        key={subtopic.id}
                        style={({ pressed }) => [
                          styles.subtopicButton,
                          { opacity: pressed ? 0.75 : 1 },
                        ]}
                        onPress={() =>
                          router.push({
                            pathname: "/practice/[topicId]",
                            params: {
                              topicId: topic.id,
                              subtopicId: subtopic.id,
                              subtopicName: subtopic.name?.en || subtopic.id,
                            },
                          })
                        }
                      >
                        <Text style={styles.subtopicName} numberOfLines={2}>
                          {subtopic.name?.en || subtopic.id}
                        </Text>
                        <Text style={styles.subtopicCount}>{subtopic.questionCount || 0} q</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : isExpanded ? (
                  <Text style={styles.noSubtopics}>No subtopics yet</Text>
                ) : (
                  <Text style={styles.dropdownHint}>
                    {topic.subTopics?.length || 0} subtopics
                  </Text>
                )}
              </View>
            );
            })}
          </View>
        )}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 },
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
    marginBottom: 16,
  },
  pyqIcon: {
    minWidth: 40,
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(251,191,36,0.95)",
    textAlign: "center",
  },
  pyqTitle: { fontSize: 15, fontWeight: "700", color: colors.white },
  pyqSubtitle: { fontSize: 12, color: "rgba(226,232,240,0.5)", marginTop: 2 },

  topicList: { gap: 12 },
  topicPanel: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  topicHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  topicTitleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  topicTitleBlock: { flex: 1, gap: 3 },
  topicIcon: { fontSize: 26 },
  topicName: { fontSize: 14, fontWeight: "700", color: colors.white },
  topicCount: { fontSize: 11, color: "rgba(226,232,240,0.44)" },
  chevron: { fontSize: 12, fontWeight: "800", color: "rgba(226,232,240,0.5)" },
  startButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(99,102,241,0.22)",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.35)",
  },
  startButtonText: { fontSize: 12, fontWeight: "700", color: colors.primary[300] },
  subtopicList: { gap: 8 },
  dropdownHint: { fontSize: 12, color: "rgba(226,232,240,0.42)" },
  subtopicButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(15,23,42,0.72)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  subtopicName: { flex: 1, fontSize: 13, fontWeight: "600", color: "rgba(226,232,240,0.86)" },
  subtopicCount: { fontSize: 11, fontWeight: "700", color: colors.primary[300] },
  noSubtopics: { fontSize: 12, color: "rgba(226,232,240,0.4)" },
});
