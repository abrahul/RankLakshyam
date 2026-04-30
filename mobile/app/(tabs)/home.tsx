import React from "react";
import { ScrollView, Text, View, StyleSheet, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import SafeScreen from "../../src/components/layout/SafeScreen";
import Card from "../../src/components/ui/Card";
import ProgressBar from "../../src/components/ui/ProgressBar";
import Loading from "../../src/components/ui/Loading";
import { dashboardApi, streaksApi, weakAreasApi } from "../../src/api/services";
import { useAuth } from "../../src/auth/auth-provider";
import { queryKeys } from "../../src/constants/queryKeys";
import { colors } from "../../src/constants/colors";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const dashboard = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const res = await dashboardApi.get();
      if (!res.success) throw new Error("Failed to load dashboard");
      return res.data;
    },
  });

  const streaks = useQuery({
    queryKey: queryKeys.streaks,
    queryFn: async () => {
      const res = await streaksApi.get();
      if (!res.success) throw new Error("Failed");
      return res.data;
    },
  });

  const weakAreas = useQuery({
    queryKey: queryKeys.weakAreas,
    queryFn: async () => {
      const res = await weakAreasApi.get();
      if (!res.success) throw new Error("Failed");
      return res.data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const isLoading = dashboard.isLoading;
  const data = dashboard.data;

  if (isLoading) return <Loading />;

  return (
    <SafeScreen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={dashboard.isRefetching}
            onRefresh={() => {
              dashboard.refetch();
              streaks.refetch();
            }}
            tintColor={colors.primary[400]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{user?.name || "Student"} 👋</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakCount}>{streaks.data?.currentStreak || 0}</Text>
          </View>
        </View>

        {/* Stats Row */}
        {data && (
          <View style={styles.statsRow}>
            <StatTile label="XP" value={data.overall?.totalXP || 0} icon="⚡" />
            <StatTile label="Accuracy" value={`${data.overall?.accuracy || 0}%`} icon="🎯" />
            <StatTile label="Attempted" value={data.overall?.totalAttempted || 0} icon="📝" />
          </View>
        )}

        {/* Rank Progress */}
        {data?.rank && (
          <Card style={styles.rankCard}>
            <View style={styles.rankHeader}>
              <Text style={styles.rankIcon}>{data.rank.current?.icon || "🌟"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rankTitle}>{data.rank.current?.title?.en || "Beginner"}</Text>
                {data.rank.next && (
                  <Text style={styles.rankNext}>
                    {data.rank.xpToNext} XP to {data.rank.next.title?.en}
                  </Text>
                )}
              </View>
            </View>
            <ProgressBar progress={data.rank.progress || 0} color={colors.accent[400]} />
          </Card>
        )}

        {/* Daily Challenge CTA */}
        <Pressable
          style={({ pressed }) => [styles.challengeCard, { opacity: pressed ? 0.9 : 1 }]}
          onPress={() => router.push("/(tabs)/challenge")}
        >
          <View>
            <Text style={styles.challengeTitle}>
              {data?.hasCompletedToday ? "✅ Challenge Complete!" : "⚡ Daily Challenge"}
            </Text>
            <Text style={styles.challengeSubtitle}>
              {data?.hasCompletedToday
                ? "Great job! Come back tomorrow."
                : "20 questions • Mixed topics • Earn XP"}
            </Text>
          </View>
          <Text style={styles.challengeArrow}>→</Text>
        </Pressable>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Start</Text>
        <View style={styles.quickActions}>
          <QuickAction title="Practice" emoji="📝" onPress={() => router.push("/(tabs)/practice")} />
          <QuickAction title="PYQ" emoji="📋" onPress={() => router.push("/practice/pyq")} />
          <QuickAction title="Review" emoji="📖" onPress={() => router.push("/(tabs)/review")} />
          <QuickAction title="Leaderboard" emoji="🏆" onPress={() => {}} />
        </View>

        {/* Weak Areas */}
        {weakAreas.data?.weakTopics?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Weak Areas</Text>
            {weakAreas.data.weakTopics.slice(0, 3).map((area: any) => (
              <Card key={area.topicId} style={styles.weakCard}>
                <View style={styles.weakRow}>
                  <Text style={styles.weakTopic}>
                    {area.topicId.replace(/_/g, " ").toUpperCase()}
                  </Text>
                  <Text style={[styles.weakAccuracy, { color: area.accuracy < 40 ? colors.error[400] : colors.warning[400] }]}>
                    {area.accuracy}%
                  </Text>
                </View>
                <ProgressBar progress={area.accuracy} color={area.accuracy < 40 ? colors.error[400] : colors.warning[400]} />
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </SafeScreen>
  );
}

function StatTile({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <Card style={styles.statTile}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function QuickAction({ title, emoji, onPress }: { title: string; emoji: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.quickAction, { opacity: pressed ? 0.7 : 1 }]}
      onPress={onPress}
    >
      <Text style={styles.quickEmoji}>{emoji}</Text>
      <Text style={styles.quickTitle}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  greeting: { fontSize: 14, color: "rgba(226,232,240,0.5)" },
  name: { fontSize: 22, fontWeight: "800", color: colors.white, marginTop: 2 },
  streakBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(245,158,11,0.12)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
  streakEmoji: { fontSize: 18 },
  streakCount: { fontSize: 16, fontWeight: "700", color: colors.warning[400] },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  statTile: { flex: 1, alignItems: "center", paddingVertical: 14 },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: "700", color: colors.white },
  statLabel: { fontSize: 11, color: "rgba(226,232,240,0.5)", marginTop: 2 },

  rankCard: { marginBottom: 16, gap: 10 },
  rankHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  rankIcon: { fontSize: 28 },
  rankTitle: { fontSize: 16, fontWeight: "700", color: colors.white },
  rankNext: { fontSize: 12, color: "rgba(226,232,240,0.5)", marginTop: 2 },

  challengeCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(99,102,241,0.12)",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.25)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  challengeTitle: { fontSize: 16, fontWeight: "700", color: colors.white },
  challengeSubtitle: { fontSize: 12, color: "rgba(226,232,240,0.55)", marginTop: 4 },
  challengeArrow: { fontSize: 20, color: colors.primary[400] },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.white, marginBottom: 12 },

  quickActions: { flexDirection: "row", gap: 10, marginBottom: 24 },
  quickAction: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingVertical: 16,
    gap: 6,
  },
  quickEmoji: { fontSize: 24 },
  quickTitle: { fontSize: 12, fontWeight: "600", color: "rgba(226,232,240,0.7)" },

  weakCard: { marginBottom: 8, gap: 8 },
  weakRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  weakTopic: { fontSize: 13, fontWeight: "600", color: colors.white },
  weakAccuracy: { fontSize: 14, fontWeight: "700" },
});
