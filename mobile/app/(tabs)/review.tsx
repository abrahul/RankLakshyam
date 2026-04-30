import React from "react";
import { ScrollView, Text, View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import SafeScreen from "../../src/components/layout/SafeScreen";
import Card from "../../src/components/ui/Card";
import { colors } from "../../src/constants/colors";

const reviewOptions = [
  { id: "wrong", title: "Wrong Answers", emoji: "❌", subtitle: "Questions you got wrong", route: "/review/wrong" },
  { id: "unattempted", title: "Unattempted", emoji: "⏭️", subtitle: "Skipped questions", route: "/review/unattempted" },
  { id: "weak", title: "Weak Areas", emoji: "🎯", subtitle: "Topics below 60% accuracy", route: "/review/weak-areas" },
];

export default function ReviewScreen() {
  const router = useRouter();

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Review</Text>
        <Text style={styles.subtitle}>Strengthen your weak areas</Text>

        {reviewOptions.map((opt) => (
          <Pressable
            key={opt.id}
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push(opt.route as any)}
          >
            <Card style={styles.card}>
              <Text style={styles.emoji}>{opt.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{opt.title}</Text>
                <Text style={styles.cardSubtitle}>{opt.subtitle}</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  title: { fontSize: 24, fontWeight: "800", color: colors.white, marginBottom: 4 },
  subtitle: { fontSize: 14, color: "rgba(226,232,240,0.5)", marginBottom: 20 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 10, padding: 18 },
  emoji: { fontSize: 28 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.white },
  cardSubtitle: { fontSize: 12, color: "rgba(226,232,240,0.5)", marginTop: 2 },
  arrow: { fontSize: 18, color: "rgba(226,232,240,0.3)" },
});
