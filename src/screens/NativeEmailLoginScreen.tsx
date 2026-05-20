import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BG = "#FEFBF8";
const INK = "#332A23";
const MUTED = "#8C7E70";
const CLAY = "#B58A56";
const CLAY_DARK = "#8B663F";
const LINE = "#E4D6C6";
const FIELD = "#FFFFFF";
const ERROR_RED = "#D84D4D";

type NativeEmailLoginScreenProps = {
  onBack: () => void;
  onLoginSuccess: (session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    token_type: string;
    user?: {
      id?: string;
      email?: string | null;
    };
    profile?: {
      nickname?: string | null;
      name?: string | null;
      full_name?: string | null;
      user_type?: string | null;
      phone?: string | null;
      avatar_url?: string | null;
    } | null;
  }) => void;
};

const LOGIN_API_URL = "https://withart.vercel.app/api/mobile-login";

export default function NativeEmailLoginScreen({
  onBack,
  onLoginSuccess,
}: NativeEmailLoginScreenProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height < 760;
  const tall = height >= 860;
  const topPadding = insets.top + (compact ? 30 : tall ? 78 : 62);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (loading) return;
    if (!email.trim() || !password.trim()) {
      setError("이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch(LOGIN_API_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (data && typeof data.message === "string") {
          setError(data.message);
        } else {
          setError("이메일 또는 비밀번호를 확인해주세요.");
        }
        setLoading(false);
        return;
      }

      if (!data || !data.session) {
        setError("로그인 세션 정보를 불러오지 못했습니다.");
        setLoading(false);
        return;
      }

      onLoginSuccess({
        access_token: String(data.session.access_token),
        refresh_token: String(data.session.refresh_token),
        expires_at: Number(data.session.expires_at),
        token_type: String(data.session.token_type),
        user: data.user,
        profile: data.profile,
      });
    } catch (e) {
      console.log("Login error:", e);
      setError("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Pressable
        style={({ pressed }) => [
          styles.backButton,
          { top: insets.top + 12 },
          pressed && styles.pressed,
        ]}
        onPress={onBack}
        hitSlop={10}
        accessibilityLabel="뒤로 가기"
      >
        <NativeIcon name="chevron-back" size={26} color={INK} />
      </Pressable>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          compact && styles.contentCompact,
          {
            paddingTop: topPadding,
            paddingBottom: Math.max(insets.bottom + 26, 36),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Image
            source={require("../../assets/logo3.png")}
            style={[styles.logo, compact && styles.logoCompact]}
            resizeMode="contain"
          />
          <Text style={[styles.title, compact && styles.titleCompact]}>
            이메일 로그인
          </Text>
          <Text style={styles.subtitle}>
            가입한 이메일과 비밀번호를 입력해주세요
          </Text>
        </View>

        <View style={[styles.form, compact && styles.formCompact]}>
          {error ? (
            <View style={styles.errorBanner}>
              <NativeIcon name="alert" size={18} color={ERROR_RED} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>이메일</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <NativeIcon name="mail" size={20} color={MUTED} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="이메일을 입력하세요"
                placeholderTextColor="#B7AB9F"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  passwordRef.current?.focus();
                }}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>비밀번호</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <NativeIcon name="lock" size={20} color={MUTED} />
              </View>
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="비밀번호를 입력하세요"
                placeholderTextColor="#B7AB9F"
                secureTextEntry={!showPassword}
                textContentType="password"
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={handleLogin}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.eyeButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => setShowPassword((value) => !value)}
                hitSlop={8}
              >
                <NativeIcon
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={MUTED}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              pressed && styles.loginButtonPressed,
              loading && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>로그인</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function NativeIcon({
  name,
  size,
  color,
}: {
  name: "chevron-back" | "mail" | "lock" | "eye" | "eye-off" | "alert";
  size: number;
  color: string;
}) {
  const common = {
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };

  if (name === "chevron-back") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M15 18l-6-6 6-6" {...common} />
      </Svg>
    );
  }

  if (name === "mail") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x="3" y="5" width="18" height="14" rx="3" {...common} />
        <Path d="M5 8l7 5 7-5" {...common} />
      </Svg>
    );
  }

  if (name === "lock") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x="5" y="10" width="14" height="10" rx="2" {...common} />
        <Path d="M8 10V7a4 4 0 018 0v3" {...common} />
      </Svg>
    );
  }

  if (name === "eye-off") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M3 3l18 18" {...common} />
        <Path d="M10.6 10.6a2 2 0 002.8 2.8" {...common} />
        <Path d="M7.5 7.8C5.6 8.8 4.1 10.2 3 12c2.1 3.5 5.1 5.3 9 5.3 1.2 0 2.4-.2 3.4-.6" {...common} />
        <Path d="M13.8 6.9c3 .5 5.4 2.2 7.2 5.1-.6 1-1.4 1.9-2.2 2.6" {...common} />
      </Svg>
    );
  }

  if (name === "alert") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="9" {...common} />
        <Path d="M12 7v6" {...common} />
        <Path d="M12 17h.01" {...common} />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" {...common} />
      <Circle cx="12" cy="12" r="3" {...common} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  backButton: {
    position: "absolute",
    left: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  scroll: {
    flex: 1,
  },
  content: {
    minHeight: "100%",
    paddingHorizontal: 32,
  },
  contentCompact: {
    paddingHorizontal: 26,
  },
  header: {
    alignItems: "center",
    gap: 8,
  },
  logo: {
    width: 70,
    height: 70,
  },
  logoCompact: {
    width: 62,
    height: 62,
  },
  title: {
    marginTop: 10,
    color: INK,
    fontSize: 31,
    lineHeight: 38,
    fontWeight: "900",
    letterSpacing: 0,
    textAlign: "center",
  },
  titleCompact: {
    fontSize: 29,
    lineHeight: 35,
  },
  subtitle: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: 0,
    textAlign: "center",
  },
  form: {
    marginTop: 42,
    gap: 16,
  },
  formCompact: {
    marginTop: 30,
    gap: 13,
  },
  errorBanner: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(216, 77, 77, 0.2)",
    backgroundColor: "rgba(216, 77, 77, 0.08)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    color: ERROR_RED,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: 0,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: CLAY_DARK,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0,
  },
  inputWrapper: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: FIELD,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  inputIcon: {
    width: 25,
    marginRight: 10,
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: "100%",
    color: INK,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0,
    padding: 0,
  },
  eyeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -6,
  },
  loginButton: {
    height: 58,
    borderRadius: 16,
    backgroundColor: CLAY,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: CLAY_DARK,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  loginButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  loginButtonDisabled: {
    opacity: 0.72,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
});
