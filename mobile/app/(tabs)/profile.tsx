import React from "react";
import { ScrollView, Text, View, StyleSheet, Pressable, Image, Alert } from "react-native";
import { useQuery } from "@tanstack/react-query";
import SafeScreen from "../../src/components/layout/SafeScreen";
import Card from "../../src/components/ui/Card";
import ProgressBar from "../../src/components/ui/ProgressBar";
import Loading from "../../src/components/ui/Loading";
import Button from "../../src/components/ui/Button";
import { performanceApi, badgesApi, streaksApi } from "../../src/api/services";
import { useAuth } from "../../src/auth/auth-provider";
import { queryKeys } from "../../src/constants/queryKeys";
import { colors } from "../../src/constants/colors";

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const performance = useQuery({
    queryKey: queryKeys.performance,
    queryFn: async () => {
      const res = await performanceApi.get();
      if (!res.success) throw new Error("Failed");
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

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => logout() },
    ]);
  };

  const overall = performance.data?.overall;

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {user?.image ? (
            <Image source={{ uri: user.image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0) || "?"}</Text>
            </View>
          )}
          <Text style={styles.name}>{user?.name || "Student"}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Stats */}
        {overall && (
          <View style={styles.statsRow}>
            <Card style={styles.stat}>
              <Text style={styles.statValue}>{overall.totalXP}</Text>
              <Text style={styles.statLabel}>Total XP</Text>
            </Card>
            <Card style={styles.stat}>
              <Text style={styles.statValue}>{overall.accuracy || 0}%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </Card>
            <Card style={styles.stat}>
              <Text style={styles.statValue}>{streaks.data?.currentStreak || 0}</Text>
              <Text style={styles.statLabel}>Streak 🔥</Text>
            </Card>
          </View>
        )}

        {/* Stats detail */}
        {overall && (
          <Card style={styles.detailCard}>
            <DetailRow label="Total Attempted" value={overall.totalAttempted} />
            <DetailRow label="Total Correct" value={overall.totalCorrect} />
            <DetailRow label="Longest Streak" value={streaks.data?.longestStreak || 0} />
          </Card>
        )}

        {/* Weak Areas */}
        {performance.data?.weakAreas?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Weak Areas</Text>
            {performance.data.weakAreas.slice(0, 5).map((area: any) => (
              <Card key={area.topic} style={styles.weakCard}>
                <View style={styles.weakRow}>
                  <Text style={styles.weakTopic}>{area.topic.replace(/_/g, " ")}</Text>
                  <Text style={[styles.weakAcc, { color: area.accuracy < 40 ? colors.error[400] : colors.warning[400] }]}>
                    {area.accuracy}%
                  </Text>
                </View>
                <ProgressBar progress={area.accuracy} color={area.accuracy < 40 ? colors.error[400] : colors.warning[400]} />
              </Card>
            ))}
          </>
        )}

        {/* Logout */}
        <Button title="Sign Out" variant="danger" onPress={handleLogout} style={{ marginTop: 24 }} />
      </ScrollView>
    </SafeScreen>
  );
}

function DetailRow({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 100 },
  profileHeader: { alignItems: "center", marginBottom: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 12 },
  avatarPlaceholder: { backgroundColor: colors.primary[500], alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 28, fontWeight: "800", color: colors.white },
  name: { fontSize: 20, fontWeight: "800", color: colors.white },
  email: { fontSize: 13, color: "rgba(226,232,240,0.5)", marginTop: 4 },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  stat: { flex: 1, alignItems: "center", paddingVertical: 16 },
  statValue: { fontSize: 20, fontWeight: "700", color: colors.white },
  statLabel: { fontSize: 11, color: "rgba(226,232,240,0.5)", marginTop: 4 },

  detailCard: { marginBottom: 20, gap: 12 },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { fontSize: 13, color: "rgba(226,232,240,0.6)" },
  detailValue: { fontSize: 14, fontWeight: "600", color: colors.white },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.white, marginBottom: 12 },
  weakCard: { marginBottom: 8, gap: 8 },
  weakRow: { flexDirection: "row", justifyContent: "space-between" },
  weakTopic: { fontSize: 13, fontWeight: "600", color: colors.white, textTransform: "capitalize" },
  weakAcc: { fontSize: 14, fontWeight: "700" },
});
