import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { loginGuest, loginUser } from "@/services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const appLogo = require("../../assets/images/logo-transparent.png");

export default function LoginForm() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [fadeAnim]);

  if (showSplash) {
    return (
      <View style={styles.splashScreen}>
        <Image source={appLogo} style={styles.splashLogo} resizeMode="contain" />
      </View>
    );
  }

  const handleLogin = async () => {
    setErrorMsg("");

    const username = loginId.trim();
    const cleanPassword = password.trim();

    if (!username || !cleanPassword) {
      setErrorMsg("Please enter Username / Email and Password.");
      return;
    }

    setLoading(true);

    try {
      const publicResult = await loginGuest(username, cleanPassword);

      if (publicResult.success) {
        router.replace("/welcome" as any);
        return;
      }

      const result = await loginUser({
        username: username.toLowerCase(),
        password: cleanPassword,
        user_type: "student",
      });

      if (!result.success) {
        setErrorMsg(result.error || "Invalid username/email or password.");
        return;
      }

      const user = result.data;

      await AsyncStorage.setItem("student_id", user.student_id || "");
      await AsyncStorage.setItem("student_pk", String(user.student_pk || ""));
      await AsyncStorage.setItem("student_name", user.name || "");

      router.replace("/welcome" as any);
    } catch (error: any) {
      setErrorMsg(
        error?.response?.data?.error ||
          error?.response?.data?.detail ||
          "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboard}
      >
        <Animated.View style={[styles.formCard, { opacity: fadeAnim }]}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed-outline" size={38} color="#5523D2" />
          </View>

          <ThemedText style={styles.titleText}>
            {loading ? "Signing in..." : "Login"}
          </ThemedText>

          <ThemedText style={styles.subTitle}>
            Access your account securely
          </ThemedText>

          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={18} color="#5523D2" />
            <TextInput
              style={styles.input}
              placeholder="Username / Email"
              placeholderTextColor="#9CA3AF"
              value={loginId}
              onChangeText={setLoginId}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color="#5523D2" />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#5523D2"
              />
            </Pressable>
          </View>

          {errorMsg ? (
            <ThemedText style={styles.errorText}>{errorMsg}</ThemedText>
          ) : null}

          <Pressable
            onPress={handleLogin}
            style={styles.pressableBtn}
            disabled={loading}
          >
            <View style={[styles.loginBtn, loading && styles.loginBtnDisabled]}>
              <Ionicons name="log-in-outline" size={18} color="#fff" />
              <ThemedText style={styles.buttonText}>
                {loading ? "Signing in..." : "Login"}
              </ThemedText>
            </View>
          </Pressable>

          <TouchableOpacity
            onPress={() => router.push("/register" as any)}
            disabled={loading}
            style={styles.registerLink}
          >
            <ThemedText style={styles.registerText}>
              New user? Register here
            </ThemedText>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  splashScreen: {
    flex: 1,
    backgroundColor: "#5523D2",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  splashLogo: {
    width: "92%",
    maxWidth: 360,
    height: 230,
  },
  container: {
    flex: 1,
    backgroundColor: "#F5F3FF",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  keyboard: {
    width: "100%",
    justifyContent: "center",
  },
  formCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    shadowColor: "#5523D2",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 6,
    alignItems: "center",
  },
  iconCircle: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  titleText: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 16,
    marginBottom: 6,
    textAlign: "center",
  },
  subTitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 24,
    textAlign: "center",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    width: "100%",
    backgroundColor: "#F6F3FF",
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    marginLeft: 8,
    marginRight: 6,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  pressableBtn: {
    width: "100%",
    marginTop: 10,
  },
  loginBtn: {
    backgroundColor: "#5523D2",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#5523D2",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  registerLink: {
    marginTop: 18,
  },
  registerText: {
    color: "#5523D2",
    fontSize: 14,
    fontWeight: "700",
  },
});
