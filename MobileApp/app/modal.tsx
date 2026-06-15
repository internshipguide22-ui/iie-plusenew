import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

export default function LoginScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Login Page
      </ThemedText>

      <Pressable
        style={styles.loginBtn}
        onPress={() => router.push("/loginform")}
      >
        <ThemedText style={styles.loginText}>Login</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white", // ✅ phone default background color
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    color: "black", // ✅ default text color for visibility
    marginBottom: 40,
    fontSize: 24,
    fontWeight: "700",
  },
  loginBtn: {
    width: "100%",
    backgroundColor: "#800080",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  loginText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});
