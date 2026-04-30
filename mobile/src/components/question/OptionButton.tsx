import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../constants/colors";

interface OptionButtonProps {
  optionKey: string;
  textEn: string;
  textMl?: string;
  isSelected: boolean;
  isCorrect?: boolean;
  isWrong?: boolean;
  showResult: boolean;
  disabled: boolean;
  onPress: () => void;
  lang?: "en" | "ml" | "both";
}

export default function OptionButton({
  optionKey,
  textEn,
  textMl,
  isSelected,
  isCorrect,
  isWrong,
  showResult,
  disabled,
  onPress,
  lang = "both",
}: OptionButtonProps) {
  const getBgColor = () => {
    if (showResult && isCorrect) return "rgba(34,197,94,0.15)";
    if (showResult && isWrong) return "rgba(239,68,68,0.12)";
    if (isSelected && !showResult) return "rgba(99,102,241,0.15)";
    return "rgba(255,255,255,0.04)";
  };

  const getBorderColor = () => {
    if (showResult && isCorrect) return "rgba(34,197,94,0.4)";
    if (showResult && isWrong) return "rgba(239,68,68,0.35)";
    if (isSelected && !showResult) return "rgba(99,102,241,0.35)";
    return "rgba(255,255,255,0.08)";
  };

  const getKeyBg = () => {
    if (showResult && isCorrect) return "rgba(34,197,94,0.25)";
    if (showResult && isWrong) return "rgba(239,68,68,0.25)";
    if (isSelected && !showResult) return "rgba(99,102,241,0.25)";
    return "rgba(255,255,255,0.05)";
  };

  const getKeyColor = () => {
    if (showResult && isCorrect) return colors.success[400];
    if (showResult && isWrong) return colors.error[400];
    if (isSelected && !showResult) return colors.primary[400];
    return "rgba(226,232,240,0.6)";
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.container,
        { backgroundColor: getBgColor(), borderColor: getBorderColor() },
      ]}
    >
      <View style={[styles.keyBadge, { backgroundColor: getKeyBg() }]}>
        <Text style={[styles.keyText, { color: getKeyColor() }]}>
          {showResult && isCorrect ? "✓" : showResult && isWrong ? "✕" : optionKey}
        </Text>
      </View>
      <View style={styles.textContainer}>
        {lang !== "ml" && <Text style={styles.optionText}>{textEn}</Text>}
        {lang !== "en" && textMl ? (
          <Text style={styles.optionTextMl}>{textMl}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  keyBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: {
    fontSize: 13,
    fontWeight: "700",
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  optionText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  optionTextMl: {
    color: "rgba(226,232,240,0.5)",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
});
