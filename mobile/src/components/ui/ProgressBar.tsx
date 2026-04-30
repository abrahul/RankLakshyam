import React from "react";
import { View, StyleSheet } from "react-native";
import { colors } from "../../constants/colors";

interface ProgressBarProps {
  progress: number; // 0-100
  color?: string;
  height?: number;
}

export default function ProgressBar({
  progress,
  color = colors.primary[400],
  height = 4,
}: ProgressBarProps) {
  return (
    <View style={[styles.track, { height }]}>
      <View
        style={[styles.fill, { width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: color, height }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 100,
    overflow: "hidden",
  },
  fill: {
    borderRadius: 100,
  },
});
