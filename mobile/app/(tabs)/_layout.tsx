import React from "react";
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "../../src/constants/colors";

const tabIcons: Record<string, { icon: string; activeIcon: string }> = {
  home: { icon: "🏠", activeIcon: "🏠" },
  practice: { icon: "📝", activeIcon: "📝" },
  challenge: { icon: "⚡", activeIcon: "⚡" },
  review: { icon: "📖", activeIcon: "📖" },
  profile: { icon: "👤", activeIcon: "👤" },
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "rgba(15,23,42,0.95)",
          borderTopColor: "rgba(99,102,241,0.15)",
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary[400],
        tabBarInactiveTintColor: "rgba(226,232,240,0.45)",
        tabBarLabelStyle: { fontSize: 10, fontWeight: "500" },
        tabBarIcon: ({ focused }) => {
          const tab = tabIcons[route.name] || tabIcons.home;
          return (
            <Text style={{ fontSize: 22, transform: [{ scale: focused ? 1.1 : 1 }] }}>
              {focused ? tab.activeIcon : tab.icon}
            </Text>
          );
        },
      })}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="practice" options={{ title: "Practice" }} />
      <Tabs.Screen name="challenge" options={{ title: "Challenge" }} />
      <Tabs.Screen name="review" options={{ title: "Review" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
