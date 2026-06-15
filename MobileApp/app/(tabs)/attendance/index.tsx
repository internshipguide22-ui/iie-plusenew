import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import api from "../../../services/api";
import CustomBottomNav from "../CustomBottomNav";

type AttendanceRecord = {
  id: number | string;
  date: string;
  batch_number?: string;
  marked_by?: string;
  status: "Present" | "Absent";
  remarks?: string | null;
};

const THEME = {
  bg: "#F6F3FF",
  primary: "#5523D2",
  primaryDark: "#3B168F",
  primarySoft: "#EDE9FE",
  surface: "#FFFFFF",
  surfaceSoft: "#FBF9FF",
  border: "#E9D5FF",
  text: "#111827",
  muted: "#667085",
  success: "#16A34A",
  danger: "#DC2626",
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function Attendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAttendance = async () => {
    try {
      const response = await api.get("attendance/", {
        params: { student: "me" },
      });

      const data = response.data;
      setRecords(Array.isArray(data?.results) ? data.results : []);
    } catch (error: any) {
      console.error(
        "Attendance fetch error:",
        error?.response?.data || error?.message || error
      );
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  const summary = useMemo(() => {
    const present = records.filter((item) => item.status === "Present").length;
    const absent = records.length - present;
    const percent = records.length
      ? Math.round((present / records.length) * 100)
      : 0;

    return {
      present,
      absent,
      total: records.length,
      percent,
    };
  }, [records]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAttendance();
  };

  const latestRecords = records.slice(0, 30);

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.primary}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons name="calendar-number-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.kicker}>Attendance</Text>
              <Text style={styles.title}>Class Progress</Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreValue}>{summary.percent}%</Text>
              <Text style={styles.scoreLabel}>Overall</Text>
            </View>
            <View style={styles.scoreCopy}>
              <Text style={styles.scoreTitle}>
                {summary.percent >= 75 ? "You are on track" : "Needs attention"}
              </Text>
              <Text style={styles.scoreDescription}>
                {summary.present}/{summary.total} classes attended from your
                marked records.
              </Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${summary.percent}%` }]} />
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon="school-outline"
            label="Total Classes"
            value={summary.total}
          />
          <StatCard
            icon="checkmark-circle-outline"
            label="Present"
            value={summary.present}
          />
          <StatCard
            icon="close-circle-outline"
            label="Absent"
            value={summary.absent}
          />
          <StatCard
            icon="bar-chart-outline"
            label="Required"
            value="75%"
          />
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionKicker}>Records</Text>
            <Text style={styles.sectionTitle}>Attendance History</Text>
          </View>
          {loading ? <ActivityIndicator color={THEME.primary} /> : null}
        </View>

        <View style={styles.tableCard}>
          {!loading && latestRecords.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={38} color="#A78BFA" />
              <Text style={styles.emptyTitle}>No attendance records found</Text>
              <Text style={styles.emptyText}>
                Your marked class attendance will appear here.
              </Text>
            </View>
          ) : null}

          {latestRecords.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  <TableHeader icon="calendar-outline" label="Date" width={112} />
                  <TableHeader icon="layers-outline" label="Batch" width={88} />
                  <TableHeader icon="person-outline" label="Faculty" width={120} />
                  <TableHeader
                    icon="checkmark-done-outline"
                    label="Status"
                    width={104}
                  />
                  <TableHeader
                    icon="chatbox-ellipses-outline"
                    label="Remarks"
                    width={150}
                  />
                </View>

                {latestRecords.map((item, index) => {
                  const isPresent = item.status === "Present";
                  return (
                    <View
                      key={String(item.id)}
                      style={[
                        styles.tableRow,
                        index % 2 === 0 && styles.tableRowAlt,
                      ]}
                    >
                      <Text style={[styles.tableCell, styles.dateCell]}>
                        {formatDate(item.date)}
                      </Text>
                      <Text style={[styles.tableCell, styles.batchCell]}>
                        {item.batch_number || "-"}
                      </Text>
                      <Text style={[styles.tableCell, styles.facultyCell]}>
                        {item.marked_by || "-"}
                      </Text>
                      <View style={styles.statusCell}>
                        <View
                          style={[
                            styles.statusBadge,
                            isPresent ? styles.presentBadge : styles.absentBadge,
                          ]}
                        >
                          <Ionicons
                            name={
                              isPresent ? "checkmark-circle" : "close-circle"
                            }
                            size={14}
                            color={isPresent ? THEME.success : THEME.danger}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              {
                                color: isPresent
                                  ? THEME.success
                                  : THEME.danger,
                              },
                            ]}
                          >
                            {item.status}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.tableCell, styles.remarksCell]}>
                        {item.remarks?.trim() || "-"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          ) : null}
        </View>

        <View style={styles.noteCard}>
          <View style={styles.noteIcon}>
            <Ionicons name="information-circle-outline" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.noteTextBlock}>
            <Text style={styles.noteTitle}>Attendance Guide</Text>
            <Text style={styles.noteText}>
              Maintain minimum 75% attendance. Regular classes keep your batch
              progress and logsheet updated.
            </Text>
          </View>
        </View>
      </ScrollView>

      <CustomBottomNav />
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number | string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={20} color={THEME.primary} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TableHeader({
  icon,
  label,
  width,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  width: number;
}) {
  return (
    <View style={[styles.tableHeaderCell, { width }]}>
      <Ionicons name={icon} size={15} color={THEME.primary} />
      <Text style={styles.tableHeaderText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  container: {
    paddingTop: 46,
    paddingHorizontal: 16,
    paddingBottom: 112,
  },
  hero: {
    backgroundColor: THEME.primary,
    borderRadius: 28,
    padding: 18,
    shadowColor: THEME.primary,
    shadowOpacity: 0.26,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 9,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  heroText: {
    flex: 1,
    marginLeft: 12,
  },
  kicker: {
    color: "#DDD6FE",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 25,
    lineHeight: 32,
    fontWeight: "900",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
  },
  scoreCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 8,
    borderColor: "#C4B5FD",
  },
  scoreValue: {
    color: THEME.primaryDark,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "900",
  },
  scoreLabel: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  scoreCopy: {
    flex: 1,
    marginLeft: 14,
  },
  scoreTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
  },
  scoreDescription: {
    color: "#EDE9FE",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    marginTop: 5,
  },
  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
    marginTop: 18,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    width: "48%",
    minHeight: 116,
    backgroundColor: THEME.surface,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: THEME.primary,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: THEME.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    color: THEME.text,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
    marginTop: 10,
  },
  statLabel: {
    color: THEME.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 12,
  },
  sectionKicker: {
    color: THEME.primary,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: THEME.text,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "900",
  },
  tableCard: {
    backgroundColor: THEME.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 10,
    shadowColor: THEME.primary,
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  table: {
    minWidth: 574,
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.primarySoft,
    borderRadius: 15,
    paddingVertical: 9,
    marginBottom: 6,
  },
  tableHeaderCell: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  tableHeaderText: {
    color: THEME.primary,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 50,
    borderRadius: 14,
  },
  tableRowAlt: {
    backgroundColor: THEME.surfaceSoft,
  },
  tableCell: {
    color: "#475467",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  dateCell: { width: 112, color: THEME.text },
  batchCell: { width: 88 },
  facultyCell: { width: 120 },
  statusCell: {
    width: 104,
    alignItems: "center",
  },
  remarksCell: { width: 150 },
  statusBadge: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  presentBadge: { backgroundColor: "#ECFDF3" },
  absentBadge: { backgroundColor: "#FEF2F2" },
  statusText: { fontSize: 11, fontWeight: "900" },
  emptyCard: {
    minHeight: 170,
    borderRadius: 24,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyTitle: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 10,
  },
  emptyText: {
    color: THEME.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 4,
  },
  noteCard: {
    flexDirection: "row",
    backgroundColor: THEME.primaryDark,
    borderRadius: 22,
    padding: 15,
    marginTop: 16,
  },
  noteIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  noteTextBlock: {
    flex: 1,
  },
  noteTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  noteText: {
    color: "#EDE9FE",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    marginTop: 3,
  },
});
