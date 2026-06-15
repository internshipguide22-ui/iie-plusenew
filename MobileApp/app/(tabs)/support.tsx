import { MaterialIcons } from "@expo/vector-icons";
import api from "@/services/api";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type SupportItem = {
  id: number;
  message: string;
  status: string;
  created_at: string;
  student_name?: string;
};

export default function Support() {
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [supportHistory, setSupportHistory] = useState<SupportItem[]>([]);

  useEffect(() => {
    loadSupportHistory();
  }, []);

  const loadSupportHistory = async () => {
    try {
      const response = await api.get("student-support/");
      const data = response.data;
      console.log("support history response:", data);

      if (Array.isArray(data)) {
        setSupportHistory(data);
      } else if (Array.isArray(data.results)) {
        setSupportHistory(data.results);
      } else if (Array.isArray(data.requests)) {
        setSupportHistory(data.requests);
      } else {
        setSupportHistory([]);
      }
    } catch (err) {
      console.log("Support history error:", err);
      setSupportHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError("Please type your message");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const response = await api.post("student-support/", {
        message: message.trim(),
      });
      console.log("support submit response:", response.data);

      setSubmitted(true);
      setMessage("");
      await loadSupportHistory();
    } catch (err: any) {
      console.log("Support submit error:", err);
      setError(err?.message || "Could not send message");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return dateString.split("T")[0];
  };

  const getStatusColor = (status: string) => {
    if (status === "resolved") return "#16A34A";
    if (status === "in_progress") return "#F97316";
    return "#5523D2";
  };

  if (submitted) {
    return (
      <View style={styles.screen}>
        <View style={styles.successCard}>
          <MaterialIcons name="check-circle" size={90} color="#5523D2" />

          <Text style={styles.successTitle}>Message Sent!</Text>

          <Text style={styles.successText}>
            Your message has been successfully sent.
            {"\n"}Our support team will contact you soon.
          </Text>

          <TouchableOpacity
            style={styles.successPrimaryBtn}
            onPress={() => setSubmitted(false)}
          >
            <MaterialIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.successPrimaryText}>Send Another Message</Text>
          </TouchableOpacity>

        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <View style={styles.titleIcon}>
              <MaterialIcons name="support-agent" size={27} color="#FFFFFF" />
            </View>
            <View style={styles.titleTextBlock}>
              <Text style={styles.kicker}>Help Desk</Text>
              <Text style={styles.heading}>Support</Text>
            </View>
          </View>

          <Text style={styles.subText}>
            Tell us your issue or feedback. Our team will get back to you.
          </Text>

          <View
            style={[
              styles.inputWrapper,
              error ? { borderColor: "#E53935" } : null,
            ]}
          >
            <MaterialIcons
              name="message"
              size={22}
              color={error ? "#DC2626" : "#5523D2"}
            />
            <TextInput
              style={styles.textBox}
              placeholder="Type your message..."
              placeholderTextColor="#777"
              multiline
              value={message}
              onChangeText={(text) => {
                setMessage(text);
                if (error) setError("");
              }}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryBtn, submitting && styles.disabledBtn]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <MaterialIcons
              name={submitting ? "hourglass-top" : "send"}
              size={20}
              color="#5523D2"
            />
            <Text style={styles.primaryText}>
              {submitting ? "Submitting..." : "Submit"}
            </Text>
          </TouchableOpacity>

        </View>

        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>Previous Requests</Text>

          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="small" color="#5523D2" />
              <Text style={styles.loaderText}>Loading support history...</Text>
            </View>
          ) : supportHistory.length === 0 ? (
            <Text style={styles.emptyText}>No support requests found.</Text>
          ) : (
            supportHistory.map((item) => (
              <View key={item.id} style={styles.historyItem}>
                <View style={styles.historyTopRow}>
                  <Text style={styles.historyDate}>{formatDate(item.created_at)}</Text>
                  <Text
                    style={[
                      styles.statusBadge,
                      { color: getStatusColor(item.status) },
                    ]}
                  >
                    {item.status.replace("_", " ")}
                  </Text>
                </View>
                <Text style={styles.historyMessage}>{item.message}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F3FF",
  },
  scrollContent: {
    padding: 16,
    paddingTop: 46,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: "#5523D2",
    borderRadius: 28,
    padding: 18,
    shadowColor: "#5523D2",
    shadowOpacity: 0.26,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 8,
    marginBottom: 18,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  titleIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleTextBlock: {
    flex: 1,
    marginLeft: 13,
  },
  kicker: {
    color: "#DDD6FE",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  heading: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  subText: {
    fontSize: 14,
    color: "#EDE9FE",
    marginBottom: 18,
    lineHeight: 20,
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#FFFFFF",
  },
  textBox: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#111827",
    minHeight: 140,
    textAlignVertical: "top",
    fontWeight: "600",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    marginTop: 6,
    marginLeft: 6,
  },
  primaryBtn: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  primaryText: {
    color: "#5523D2",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    flexDirection: "row",
    gap: 6,
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#5523D2",
    backgroundColor: "#FFFFFF",
  },
  secondaryText: {
    color: "#5523D2",
    fontSize: 15,
    fontWeight: "600",
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    shadowColor: "#5523D2",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 14,
  },
  loaderWrap: {
    alignItems: "center",
    paddingVertical: 20,
  },
  loaderText: {
    marginTop: 10,
    color: "#667085",
  },
  emptyText: {
    textAlign: "center",
    color: "#667085",
    paddingVertical: 16,
  },
  historyItem: {
    borderWidth: 1,
    borderColor: "#E9D5FF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#FBF9FF",
  },
  historyTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  historyDate: {
    color: "#667085",
    fontSize: 13,
    fontWeight: "600",
  },
  statusBadge: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  historyMessage: {
    color: "#111827",
    fontSize: 15,
    lineHeight: 22,
  },
  successCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    shadowColor: "#5523D2",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
    margin: 20,
    marginTop: "35%",
  },
  successTitle: {
    fontSize: 26,
    fontWeight: "bold",
    marginTop: 20,
    color: "#111827",
  },
  successText: {
    fontSize: 15,
    color: "#667085",
    textAlign: "center",
    marginVertical: 16,
    lineHeight: 22,
  },
  successPrimaryBtn: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#5523D2",
    paddingVertical: 16,
    paddingHorizontal: 34,
    borderRadius: 18,
    marginTop: 12,
    elevation: 5,
    alignItems: "center",
  },
  successPrimaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  successBackText: {
    marginTop: 18,
    fontSize: 15,
    fontWeight: "600",
    color: "#5523D2",
  },
});
