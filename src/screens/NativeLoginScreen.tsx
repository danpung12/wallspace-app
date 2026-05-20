import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BG = "#FEFBF8";
const INK = "#332A23";
const MUTED = "#8C7E70";
const CLAY = "#B58A56";
const CLAY_DARK = "#8B663F";
const WHITE = "#FFFFFF";

type SocialProvider = "kakao" | "naver" | "google";

type NativeLoginScreenProps = {
  onSocialLogin: (provider: SocialProvider) => void;
  onNormalLogin: () => void;
  onSignUp: () => void;
};

export default function NativeLoginScreen({
  onSocialLogin,
  onNormalLogin,
  onSignUp,
}: NativeLoginScreenProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height < 760;
  const tall = height >= 860;
  const topPadding = insets.top + (compact ? 24 : tall ? 70 : 60);
  const illustrationHeight = compact ? 196 : tall ? 274 : 242;
  const illustrationGapTop = compact ? 16 : tall ? 30 : 26;
  const illustrationGapBottom = compact ? 20 : tall ? 34 : 30;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          compact && styles.contentCompact,
          {
            paddingTop: topPadding,
            paddingBottom: Math.max(insets.bottom + 22, 32),
          },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.brandArea, compact && styles.brandAreaCompact]}>
          <Image
            source={require("../../assets/logo3.png")}
            style={[styles.logo, compact && styles.logoCompact]}
            resizeMode="contain"
          />
          <Text style={[styles.title, compact && styles.titleCompact]}>
            위드아트
          </Text>
          <Text style={styles.subtitle}>
            작품과 공간을 연결하는 전시 예약 플랫폼
          </Text>
        </View>

        <View
          style={[
            styles.illustrationWrap,
            {
              height: illustrationHeight,
              marginTop: illustrationGapTop,
              marginBottom: illustrationGapBottom,
            },
          ]}
        >
          <Image
            source={require("../../assets/login-atelier-illustration.png")}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
            onPress={() => onSocialLogin("google")}
          >
            <View style={styles.googleIconCircle}>
              <GoogleIcon />
            </View>
            <Text style={styles.primaryText}>Google로 계속하기</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
            onPress={onNormalLogin}
          >
            <MailIcon />
            <Text style={styles.secondaryText}>이메일로 로그인</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.signupButton,
              pressed && styles.pressed,
            ]}
            onPress={onSignUp}
          >
            <Text style={styles.signupMuted}>처음이신가요?</Text>
            <Text style={styles.signupText}>회원가입</Text>
          </Pressable>
        </View>

        <Text style={styles.footerText}>누구나 쉽게 여는 나만의 전시회</Text>
      </ScrollView>
    </View>
  );
}

function MailIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3}
        y={5}
        width={18}
        height={14}
        rx={3}
        stroke={CLAY_DARK}
        strokeWidth={2}
      />
      <Path
        d="M5 8l7 5 7-5"
        stroke={CLAY_DARK}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function GoogleIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  content: {
    minHeight: "100%",
    paddingHorizontal: 34,
    alignItems: "center",
  },
  contentCompact: {
    paddingHorizontal: 28,
  },
  brandArea: {
    alignItems: "center",
    gap: 7,
  },
  brandAreaCompact: {
    gap: 5,
  },
  logo: {
    width: 72,
    height: 72,
  },
  logoCompact: {
    width: 62,
    height: 62,
  },
  title: {
    marginTop: 5,
    color: INK,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
    letterSpacing: 0,
  },
  titleCompact: {
    fontSize: 30,
    lineHeight: 35,
  },
  subtitle: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
    letterSpacing: 0,
    textAlign: "center",
  },
  illustrationWrap: {
    width: "122%",
    alignItems: "center",
    justifyContent: "center",
  },
  illustration: {
    width: "100%",
    height: "100%",
  },
  actions: {
    width: "100%",
    gap: 10,
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: CLAY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: CLAY_DARK,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  googleIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0,
  },
  secondaryButton: {
    marginTop: 8,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CLAY,
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    shadowColor: "#725A42",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  secondaryText: {
    color: CLAY_DARK,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0,
  },
  signupButton: {
    height: 44,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  signupMuted: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
  },
  signupText: {
    color: CLAY_DARK,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0,
  },
  footerText: {
    marginTop: "auto",
    paddingTop: 16,
    color: "#AD9170",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
});
