import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import api from "@/services/api";

type LeaveHistoryItem = {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  status: "Pending" | "Approved" | "Rejected";
  reason: string;
};

type AttendanceItem = {
  id: string;
  date: string;
  status: string;
  batch: string;
  faculty: string;
  remarks: string;
};

const formatDate = (value: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatStatus = (status?: string): "Pending" | "Approved" | "Rejected" => {
  const value = (status || "").toLowerCase();
  if (value === "approved") return "Approved";
  if (value === "rejected") return "Rejected";
  return "Pending";
};

const formatLeaveType = (type?: string) => {
  if (!type) return "Leave";
  switch (type) {
    case "sick":
      return "Sick Leave";
    case "casual":
      return "Casual Leave";
    case "emergency":
      return "Emergency Leave";
    case "personal":
      return "Personal Leave";
    case "other":
      return "Other";
    default:
      return type;
  }
};

export default function LeaveHistory() {
  const navigation = useNavigation();
  const [history, setHistory] = useState<LeaveHistoryItem[]>([]);
  const [absentDetails, setAbsentDetails] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [leaveResponse, attendanceResponse] = await Promise.all([
          api.get("student-leave/"),
          api.get("attendance/", {
            params: { student: "me" },
          }),
        ]);

        const leaveResults = Array.isArray(leaveResponse.data?.results)
          ? leaveResponse.data.results
          : [];

        const mappedLeaves: LeaveHistoryItem[] = leaveResults.map((item: any) => ({
          id: String(item.id),
          type: formatLeaveType(item.leave_type),
          startDate: formatDate(item.start_date),
          endDate: formatDate(item.end_date),
          status: formatStatus(item.status),
          reason: item.reason || "-",
        }));

        const attendanceResults = Array.isArray(attendanceResponse.data?.results)
          ? attendanceResponse.data.results
          : [];

        const mappedAbsents: AttendanceItem[] = attendanceResults
          .filter((item: any) => item.status?.toLowerCase() === "absent")
          .map((item: any) => ({
            id: String(item.id),
            date: formatDate(item.date),
            status: item.status || "",
            batch: item.batch_number || "-",
            faculty: item.marked_by || "-",
            remarks: item.remarks?.trim() || "-",
          }));

        setHistory(mappedLeaves);
        setAbsentDetails(mappedAbsents);
      } catch (error: any) {
        console.error("Leave/attendance fetch error:", error?.response?.data || error.message);
        setHistory([]);
        setAbsentDetails([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Approved":
        return styles.approved;
      case "Rejected":
        return styles.rejected;
      default:
        return styles.pending;
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Leave History</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {loading ? (
          <Text style={styles.emptyText}>Loading leave history...</Text>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Leave Details</Text>

            {history.length === 0 ? (
              <Text style={styles.emptyText}>No leave history found</Text>
            ) : (
              history.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle}>{item.type}</Text>
                    <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
                      <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                  </View>

                  <Text style={styles.text}>
                    {item.startDate} → {item.endDate}
                  </Text>
                  <Text style={styles.text}>{item.reason}</Text>
                </View>
              ))
            )}

            <Text style={styles.sectionTitle}>Absent Details</Text>

            <View style={styles.card}>
              {absentDetails.length === 0 ? (
                <Text style={styles.text}>No absent records found</Text>
              ) : (
                absentDetails.map((absent) => (
                  <View key={absent.id} style={styles.absentCard}>
                    <Text style={styles.absentDateText}>{absent.date}</Text>
                    <Text style={styles.absentMeta}>Batch: {absent.batch}</Text>
                    <Text style={styles.absentMeta}>Faculty: {absent.faculty}</Text>
                    <Text style={styles.absentMeta}>Remarks: {absent.remarks}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F2F5FF",
  },

  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    elevation: 3,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A1A",
  },

  container: {
    padding: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#5523D2",
    marginBottom: 10,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1A1A1A",
  },

  text: {
    fontSize: 14,
    color: "#555",
    marginTop: 8,
  },

  absentCard: {
    backgroundColor: "#FAFAFA",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#EEE",
  },

  absentDateText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
  },

  absentMeta: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },

  emptyText: {
    textAlign: "center",
    color: "#555",
    fontSize: 14,
    marginTop: 20,
    marginBottom: 20,
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },

  statusText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "bold",
  },

  approved: {
    backgroundColor: "#1A8F0A",
  },

  pending: {
    backgroundColor: "#D48806",
  },

  rejected: {
    backgroundColor: "#C71F1F",
  },

  backBtnBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: "#5523D2",
    alignSelf: "center",
  },

  backText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 5,
  },
});
