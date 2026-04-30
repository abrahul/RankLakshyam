import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../src/auth/auth-provider";
import { useGoogleAuth } from "../src/auth/google-auth";
import SafeScreen from "../src/components/layout/SafeScreen";
import { colors } from "../src/constants/colors";

export default function LoginScreen() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const { request, response, promptAsync, idToken } = useGoogleAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)/home");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (idToken) {
      handleLogin(idToken);
    }
  }, [idToken]);

  const handleLogin = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      await login(token);
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeScreen>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.emoji}>📚</Text>
          <Text style={styles.title}>RankLakshyam</Text>
          <Text style={styles.subtitle}>
            Kerala PSC Exam Preparation
          </Text>
          <Text style={styles.description}>
            Practice 10,000+ questions, daily challenges, PYQ papers & more
          </Text>
        </View>

        <View style={styles.actions}>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.googleButton,
              { opacity: loading || !request ? 0.5 : pressed ? 0.8 : 1 },
            ]}
            onPress={() => promptAsync()}
            disabled={loading || !request}
          >
            {loading ? (
              <ActivityIndicator color={colors.surface[950]} />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.terms}>
            By continuing, you agree to our Terms of Service
          </Text>
        </View>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  hero: {
    alignItems: "center",
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.primary[400],
    fontWeight: "600",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: "rgba(226,232,240,0.6)",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  actions: {
    gap: 16,
  },
  errorBox: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: colors.error[400],
    fontSize: 13,
    textAlign: "center",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 12,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4285F4",
  },
  googleText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.surface[950],
  },
  terms: {
    fontSize: 11,
    color: "rgba(226,232,240,0.4)",
    textAlign: "center",
  },
});
