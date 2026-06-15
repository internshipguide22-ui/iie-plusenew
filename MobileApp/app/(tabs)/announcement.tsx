import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "@/services/api";

type AnnouncementItem = {
  id: number;
  title: string;
  message: string;
  announcement_type?: string;
  recipient_type?: string;
  is_published?: boolean;
  created_at?: string;
  created_by_name?: string;
};

export default function Announcement() {
  const navigation = useNavigation();
  const [search, setSearch] = useState("");
  const [studentName, setStudentName] = useState("kaviya");
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadStudentName();
    loadAnnouncements();
  }, []);

  const loadStudentName = async () => {
    const savedName = await AsyncStorage.getItem("student_name");
    if (savedName) {
      setStudentName(savedName);
    }
  };

  const loadAnnouncements = async () => {
    try {
      setErrorMsg("");
      const response = await api.get("/announcements/");
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.results || [];

      setAnnouncements(data);
    } catch (error: any) {
      setErrorMsg(
        error?.response?.data?.error || "Failed to load announcements"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnnouncements();
  };

  const filteredAnnouncements = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return announcements;

    return announcements.filter((item) =>
      `${item.title} ${item.message} ${item.announcement_type} ${item.recipient_type}`
        .toLowerCase()
        .includes(query)
    );
  }, [search, announcements]);

  const stats = useMemo(() => {
    const total = filteredAnnouncements.length;
    const important = filteredAnnouncements.filter(
      (item) => item.announcement_type === "important"
    ).length;
    const holidays = filteredAnnouncements.filter(
      (item) => item.announcement_type === "holiday"
    ).length;
    const updates = filteredAnnouncements.filter(
      (item) =>
        item.announcement_type === "general" ||
        item.announcement_type === "update"
    ).length;

    return [
      { label: "Total", value: total, color: "#3B82F6" },
      { label: "Important", value: important, color: "#EF4444" },
      { label: "Holidays", value: holidays, color: "#F59E0B" },
      { label: "Updates", value: updates, color: "#8B5CF6" },
    ];
  }, [filteredAnnouncements]);

  const latestAnnouncementDate = filteredAnnouncements[0]?.created_at
    ? new Date(filteredAnnouncements[0].created_at).toLocaleString()
    : "No announcements";

  const getTypeMeta = (type?: string) => {
    if (type === "important") {
      return {
        bg: "#E57373",
        icon: "warning" as const,
        label: "Important Notice",
        accent: "#EF4444",
      };
    }

    if (type === "holiday") {
      return {
        bg: "#F59E0B",
        icon: "beach-access" as const,
        label: "Holiday Notice",
        accent: "#F59E0B",
      };
    }

    if (type === "event") {
      return {
        bg: "#4CAF50",
        icon: "event" as const,
        label: "Event Announcement",
        accent: "#22C55E",
      };
    }

    return {
      bg: "#3B82F6",
      icon: "campaign" as const,
      label: "General Update",
      accent: "#3B82F6",
    };
  };

  const formatAudience = (recipientType?: string) => {
    switch (recipientType) {
      case "students":
        return "Students Only";
      case "staff":
        return "Staff Only";
      case "mentors":
        return "Mentors Only";
      case "counselors":
        return "Counselors Only";
      case "all":
        return "All Students & Staff";
      default:
        return "Selected Audience";
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            placeholder="Search ..."
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.profile}>
          <Text style={styles.greeting}>
            Hi, <Text style={styles.username}>{studentName}</Text>
          </Text>
          <Image
            source={{ uri: "https://i.pravatar.cc/40" }}
            style={styles.avatar}
          />
        </View>
      </View>

      <View style={styles.announcementHeader}>
        <View style={styles.announcementTitleRow}>
          <MaterialIcons name="campaign" size={24} color="#fff" />
          <Text style={styles.announcementTitle}>Announcements</Text>
        </View>

        <View style={styles.badges}>
          <Text style={styles.badgeWhite}>{stats[0].value} Announcements</Text>
          <Text style={styles.badgeRed}>{stats[1].value} Important</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <Text style={[styles.statValue, { color: stat.color }]}>
              {stat.value}
            </Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.helperText}>Loading announcements...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : filteredAnnouncements.length === 0 ? (
        <View style={styles.centerBox}>
          <MaterialIcons name="campaign" size={32} color="#9CA3AF" />
          <Text style={styles.helperText}>No announcements found</Text>
        </View>
      ) : (
        filteredAnnouncements.map((item) => {
          const meta = getTypeMeta(item.announcement_type);

          return (
            <View key={item.id} style={styles.card}>
              <View
                style={[styles.cardHeader, { backgroundColor: meta.bg }]}
              >
                <MaterialIcons name={meta.icon} size={20} color="#fff" />
                <Text style={styles.cardHeaderText}>{item.title}</Text>

                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>{meta.label}</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.cardSubtitle}>{item.message}</Text>

                <View style={styles.cardMeta}>
                  <Ionicons name="person" size={14} color="#6B7280" />
                  <Text style={styles.metaText}>
                    Posted by: {item.created_by_name || "Admin"}
                  </Text>

                  <Ionicons
                    name="time"
                    size={14}
                    color="#6B7280"
                    style={{ marginLeft: 12 }}
                  />
                  <Text style={styles.metaText}>
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString()
                      : "Recently posted"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.audienceBadge,
                    { borderLeftColor: meta.accent },
                  ]}
                >
                  <View style={styles.audienceContent}>
                    <MaterialIcons
                      name="people"
                      size={20}
                      color={meta.accent}
                    />
                    <Text
                      style={[
                        styles.audienceText,
                        { color: meta.accent },
                      ]}
                    >
                      {formatAudience(item.recipient_type)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })
      )}

      <View style={styles.statsSection}>
        <View style={styles.statsSectionHeader}>
          <MaterialIcons name="bar-chart" size={20} color="#3B82F6" />
          <Text style={styles.statsSectionTitle}>Announcement Statistics</Text>
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Total Announcements</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{stats[0].value}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Important Notices</Text>
          <View style={[styles.countBadge, { backgroundColor: "#EF4444" }]}>
            <Text style={styles.countText}>{stats[1].value}</Text>
          </View>
        </View>

        <View style={[styles.statsRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.statsLabel}>Latest Announcement</Text>
          <Text style={styles.dateText}>{latestAnnouncementDate}</Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <View style={styles.infoTitleRow}>
          <Ionicons name="information-circle" size={22} color="#3B82F6" />
          <Text style={styles.infoTitle}>Information</Text>
        </View>

        <View style={styles.legendRow}>
          <View style={[styles.legendBox, { backgroundColor: "#EF4444" }]} />
          <Text style={styles.legendText}>Important</Text>
        </View>

        <View style={styles.legendRow}>
          <View style={[styles.legendBox, { backgroundColor: "#F59E0B" }]} />
          <Text style={styles.legendText}>Holiday</Text>
        </View>

        <View style={styles.legendRow}>
          <View style={[styles.legendBox, { backgroundColor: "#22C55E" }]} />
          <Text style={styles.legendText}>Event</Text>
        </View>

        <View style={[styles.legendRow, { marginTop: 10 }]}>
          <Ionicons name="checkmark-circle" size={18} color="#3B82F6" />
          <Text style={[styles.legendText, { marginLeft: 8 }]}>
            Check regularly for updates
          </Text>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
    flex: 1,
    elevation: 2,
  },

  searchInput: {
    marginLeft: 8,
    flex: 1,
  },

  profile: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 14,
  },

  greeting: {
    marginRight: 8,
    fontSize: 13,
    color: "#6B7280",
  },

  username: {
    fontWeight: "700",
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },

  announcementHeader: {
    backgroundColor: "#3B82F6",
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
  },

  announcementTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  announcementTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 10,
  },

  badges: {
    flexDirection: "row",
    marginTop: 10,
  },

  badgeWhite: {
    backgroundColor: "#fff",
    color: "#3B82F6",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 10,
    fontWeight: "600",
    fontSize: 12,
  },

  badgeRed: {
    backgroundColor: "#EF4444",
    color: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    fontWeight: "600",
    fontSize: 12,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  statCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
  },

  statValue: {
    fontSize: 26,
    fontWeight: "800",
  },

  statLabel: {
    marginTop: 6,
    fontSize: 12,
    color: "#6B7280",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 18,
    overflow: "hidden",
    elevation: 3,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  cardHeaderText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    marginLeft: 10,
    flex: 1,
  },

  cardBadge: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },

  cardBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },

  cardBody: {
    padding: 16,
  },

  cardSubtitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },

  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  metaText: {
    marginLeft: 6,
    fontSize: 12,
    color: "#6B7280",
  },

  audienceBadge: {
    backgroundColor: "#F6F3FF",
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
  },

  audienceContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  audienceText: {
    marginLeft: 12,
    fontWeight: "700",
    fontSize: 14,
  },

  statsSection: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    elevation: 2,
    borderRightWidth: 4,
    borderRightColor: "#3B82F6",
  },

  statsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  statsSectionTitle: {
    fontWeight: "700",
    marginLeft: 8,
    fontSize: 16,
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  statsLabel: {
    fontSize: 14,
  },

  countBadge: {
    backgroundColor: "#3B82F6",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },

  countText: {
    color: "#fff",
    fontWeight: "700",
  },

  dateText: {
    color: "#6B7280",
  },

  infoBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
    marginBottom: 20,
    elevation: 2,
  },

  infoTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  infoTitle: {
    fontWeight: "800",
    fontSize: 16,
    marginLeft: 8,
    color: "#111827",
  },

  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: 10,
  },

  legendText: {
    fontSize: 14,
  },

  centerBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    marginBottom: 18,
  },

  helperText: {
    marginTop: 10,
    color: "#6B7280",
  },

  errorText: {
    color: "#DC2626",
    fontWeight: "600",
  },

  backButton: {
    backgroundColor: "#4c15d8ff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 32,
    alignSelf: "center",
  },

  backButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },
});
