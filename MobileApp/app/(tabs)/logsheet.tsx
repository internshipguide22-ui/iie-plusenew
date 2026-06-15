import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import api from "@/services/api";
import CustomBottomNav from "./CustomBottomNav";

type SessionItem = {
  id: number;
  session_number: number;
  title: string;
  topics?: string | null;
  staff_completed: boolean;
  student_status: "not_started" | "pending" | "completed" | "doubt";
  has_response: boolean;
  doubt_response?: string | null;
  response_date?: string | null;
  student_confirmed_at?: string | null;
  completed_date?: string | null;
};

export default function LogsheetScreen() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const [doubtModalVisible, setDoubtModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);
  const [doubtText, setDoubtText] = useState("");

  const loadSessions = async () => {
    try {
      console.log("LOGSHEET URL:", `${api.defaults.baseURL}sessions/student/`);

      const response = await api.get("sessions/student/");
      console.log("LOGSHEET STATUS:", response.status);
      console.log("LOGSHEET DATA:", response.data);

      const data = response.data;
      const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

      setSessions(list);
    } catch (error: any) {
      console.log("LOGSHEET ERROR STATUS:", error?.response?.status);
      console.log("LOGSHEET ERROR DATA:", error?.response?.data);
      console.log("LOGSHEET ERROR MESSAGE:", error?.message);

      Alert.alert(
        "Error",
        error?.response?.data?.error ||
          error?.response?.data?.detail ||
          "Failed to load sessions."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSessions();
  };

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sessions;

    return sessions.filter((session) => {
      const title = session.title?.toLowerCase() || "";
      const topics = session.topics?.toLowerCase() || "";
      return title.includes(query) || topics.includes(query);
    });
  }, [search, sessions]);

  const handleComplete = async (id: number) => {
    const session = sessions.find((item) => item.id === id);
    if (!session) return;

    if (!session.staff_completed && session.student_status === "not_started") {
      Alert.alert(
        "Not Available Yet",
        "Trainer has not completed this session yet."
      );
      return;
    }

    try {
      setSubmittingId(id);
      await api.post("sessions/student-complete/", { session_id: id });
      await loadSessions();
      Alert.alert("Success", "Session marked as completed.");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.error ||
          error?.response?.data?.detail ||
          "Could not mark session completed."
      );
    } finally {
      setSubmittingId(null);
    }
  };

  const openDoubtModal = (session: SessionItem) => {
    setSelectedSession(session);
    setDoubtText("");
    setDoubtModalVisible(true);
  };

  const submitDoubt = async () => {
    if (!selectedSession) return;

    const trimmed = doubtText.trim();
    if (!trimmed) {
      Alert.alert("Required", "Please enter your doubt before sending.");
      return;
    }

    try {
      setSubmittingId(selectedSession.id);
      await api.post("sessions/raise-doubt/", {
        session_id: selectedSession.id,
        doubt_text: trimmed,
      });
      setDoubtModalVisible(false);
      setSelectedSession(null);
      setDoubtText("");
      await loadSessions();
      Alert.alert(
        "Doubt Submitted",
        "Your doubt has been sent to the faculty."
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.error ||
          error?.response?.data?.detail ||
          "Could not send doubt."
      );
    } finally {
      setSubmittingId(null);
    }
  };

  const getStatusMeta = (session: SessionItem) => {
    if (session.student_status === "completed") {
      return {
        show: true,
        text: "Completed",
        icon: "checkmark-circle" as const,
        style: styles.badgeCompleted,
        iconColor: "#166534",
      };
    }

    if (session.student_status === "doubt") {
      return {
        show: true,
        text: "Doubt Sent",
        icon: "help-circle" as const,
        style: styles.badgeDoubt,
        iconColor: "#92400e",
      };
    }

    if (session.staff_completed && session.student_status === "pending") {
      return {
        show: true,
        text: "Pending Confirmation",
        icon: "time" as const,
        style: styles.badgePending,
        iconColor: "#1d4ed8",
      };
    }

    return {
      show: false,
      text: "",
      icon: "ellipse" as const,
      style: styles.badgeCompleted,
      iconColor: "#000",
    };
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#5523D2" />
        <Text style={styles.loaderText}>Loading sessions...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#777" />
            <TextInput
              placeholder="Search sessions..."
              placeholderTextColor="#777"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <View style={styles.profile}>
            <View style={styles.profilePic} />
            <Text style={styles.profileText}>My Sessions</Text>
          </View>
        </View>

        <Text style={styles.mainHeading}>My Course Sessions</Text>

        {filteredSessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No sessions found.</Text>
          </View>
        ) : (
          filteredSessions.map((session) => {
            const statusMeta = getStatusMeta(session);
            const isCompleted = session.student_status === "completed";
            const isBusy = submittingId === session.id;

            return (
              <View key={session.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="book" size={22} color="#5523D2" />
                  <Text style={styles.sessionTitle}>
                    Session {session.session_number}: {session.title}
                  </Text>
                </View>

                {statusMeta.show && (
                  <View style={[styles.badge, statusMeta.style]}>
                    <Ionicons
                      name={statusMeta.icon}
                      size={14}
                      color={statusMeta.iconColor}
                    />
                    <Text style={styles.badgeText}>{statusMeta.text}</Text>
                  </View>
                )}

                <Text style={styles.topicTitle}>Topics Covered:</Text>

                <View style={styles.tag}>
                  <Ionicons name="layers-outline" size={16} color="#444" />
                  <Text style={styles.tagText}>
                    {session.topics?.trim() || "Course content will be covered"}
                  </Text>
                </View>

                {session.has_response && !!session.doubt_response && (
                  <View style={styles.responseBox}>
                    <Text style={styles.responseTitle}>Faculty Response</Text>
                    <Text style={[styles.responseText, { color: "#065f46" }]}>
                      {session.doubt_response}
                    </Text>
                  </View>
                )}

                {session.student_status === "doubt" && !session.has_response && (
                  <View style={styles.pendingResponseBox}>
                    <Text style={styles.pendingResponseTitle}>
                      Faculty Response
                    </Text>
                    <Text style={styles.pendingResponseText}>
                      Pending faculty response...
                    </Text>
                  </View>
                )}

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[
                      styles.completeBtn,
                      (!session.staff_completed || isCompleted || isBusy) && {
                        opacity: 0.7,
                      },
                    ]}
                    onPress={() => handleComplete(session.id)}
                    disabled={!session.staff_completed || isCompleted || isBusy}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.btnText}>
                      {isBusy ? "Please wait..." : "Mark Completed"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.doubtBtn, isBusy && { opacity: 0.7 }]}
                    onPress={() => openDoubtModal(session)}
                    disabled={isBusy}
                  >
                    <Ionicons
                      name="help-circle-outline"
                      size={18}
                      color="#000"
                    />
                    <Text style={styles.btnTextBlack}>
                      {session.student_status === "doubt"
                        ? "Still Doubt"
                        : "I Have Doubt"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 106 }} />
      </ScrollView>

      <CustomBottomNav />

      <Modal
        visible={doubtModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDoubtModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Send Your Doubt</Text>
            <Text style={styles.modalSubtitle}>
              {selectedSession
                ? `Session ${selectedSession.session_number}: ${selectedSession.title}`
                : ""}
            </Text>

            <TextInput
              style={styles.doubtInput}
              placeholder="Type your doubt here..."
              placeholderTextColor="#888"
              multiline
              value={doubtText}
              onChangeText={setDoubtText}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setDoubtModalVisible(false);
                  setSelectedSession(null);
                  setDoubtText("");
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sendBtn} onPress={submitDoubt}>
                <Text style={styles.sendBtnText}>Send Doubt</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#F6F3FF", padding: 15 },

  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F6F3FF",
  },
  loaderText: {
    marginTop: 12,
    color: "#4b5563",
    fontSize: 14,
  },

  backBtnBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#5523D2",
    paddingVertical: 12,
    borderRadius: 25,
    width: "60%",
    alignSelf: "center",
    marginTop: 10,
  },
  backText: { color: "#fff", fontWeight: "700" },

  searchRow: { flexDirection: "row", alignItems: "center" },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 45,
  },
  searchInput: { marginLeft: 10, width: "80%", fontSize: 15 },

  profile: { flexDirection: "row", alignItems: "center", marginLeft: 10 },
  profilePic: {
    width: 45,
    height: 45,
    backgroundColor: "#EDE9FE",
    borderRadius: 30,
    marginRight: 6,
  },
  profileText: { fontSize: 15, fontWeight: "700" },

  mainHeading: {
    fontSize: 25,
    fontWeight: "800",
    marginTop: 20,
    marginBottom: 15,
    color: "#2E1065",
  },

  emptyCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 14,
    textAlign: "center",
  },

  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  sessionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 10,
    flex: 1,
    flexWrap: "wrap",
    color: "#111827",
  },

  badge: {
    flexDirection: "row",
    gap: 4,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginBottom: 10,
  },
  badgeCompleted: { backgroundColor: "#d1fae5" },
  badgeDoubt: { backgroundColor: "#fef3c7" },
  badgePending: { backgroundColor: "#dbeafe" },
  badgeText: { fontSize: 12, fontWeight: "700" },

  topicTitle: { fontWeight: "600", marginBottom: 5, color: "#374151" },

  tag: {
    backgroundColor: "#f3f4f6",
    padding: 8,
    borderRadius: 10,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    marginBottom: 15,
  },
  tagText: { fontSize: 13, color: "#444", flex: 1 },

  responseBox: {
    backgroundColor: "#f0fdf4",
    borderLeftWidth: 4,
    borderLeftColor: "#16a34a",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  responseTitle: { fontWeight: "700", marginBottom: 5, color: "#065f46" },
  responseText: { fontSize: 14 },

  pendingResponseBox: {
    backgroundColor: "#fff7ed",
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  pendingResponseTitle: {
    fontWeight: "700",
    marginBottom: 5,
    color: "#b45309",
  },
  pendingResponseText: {
    fontSize: 14,
    color: "#b45309",
  },

  buttonRow: { flexDirection: "row", gap: 10 },

  completeBtn: {
    flex: 1,
    backgroundColor: "#5523D2",
    padding: 12,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },

  doubtBtn: {
    flex: 1,
    backgroundColor: "#facc15",
    padding: 12,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },

  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnTextBlack: { color: "#111", fontWeight: "700", fontSize: 14 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2E1065",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 14,
  },
  doubtInput: {
    minHeight: 120,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#111827",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
  },
  cancelBtnText: {
    color: "#111827",
    fontWeight: "700",
  },
  sendBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#5523D2",
  },
  sendBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
});
