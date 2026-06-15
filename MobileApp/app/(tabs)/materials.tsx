import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import api from "@/services/api";

type MaterialItem = {
  id: number;
  title: string;
  description?: string;
  file?: string;
  uploaded_at?: string;
  uploaded_by_name?: string;
  batch_number?: string;
};

export default function MaterialsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const loadMaterials = async () => {
    try {
      setErrorMsg("");
      const response = await api.get("/materials/");
      setMaterials(response.data?.results || response.data || []);
    } catch (error: any) {
      setErrorMsg(
        error?.response?.data?.error || "Failed to load materials"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMaterials();
  };

  const openFile = async (url?: string) => {
    if (!url) return;
    await Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#5523D2" />
        <Text style={styles.helperText}>Loading materials...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <Ionicons name="library-outline" size={25} color="#FFFFFF" />
        </View>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerKicker}>Learning Resources</Text>
          <Text style={styles.headerTitle}>Study Materials</Text>
        </View>
      </View>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      {materials.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="book-outline" size={42} color="#A78BFA" />
          <Text style={styles.emptyText}>No materials uploaded yet</Text>
        </View>
      ) : (
        materials.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.fileIcon}>
                <Ionicons name="document-text-outline" size={22} color="#5523D2" />
              </View>
              <View style={styles.cardTitleBlock}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.batchPill}>Batch {item.batch_number || "N/A"}</Text>
              </View>
            </View>

            {!!item.description && (
              <Text style={styles.description}>{item.description}</Text>
            )}

            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={15} color="#7C3AED" />
                <Text style={styles.meta}>Trainer: {item.uploaded_by_name || "N/A"}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={15} color="#7C3AED" />
                <Text style={styles.meta}>
                  Uploaded:{" "}
                  {item.uploaded_at
                    ? new Date(item.uploaded_at).toLocaleDateString()
                    : "N/A"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={() => openFile(item.file)}
            >
              <Ionicons name="open-outline" size={17} color="#FFFFFF" />
              <Text style={styles.buttonText}>Open Material</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F3FF",
  },
  contentContainer: {
    padding: 16,
    paddingTop: 46,
    paddingBottom: 40,
  },
  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F3FF",
    padding: 24,
  },
  helperText: {
    marginTop: 12,
    color: "#667085",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#5523D2",
    borderRadius: 28,
    padding: 18,
    marginBottom: 18,
    shadowColor: "#5523D2",
    shadowOpacity: 0.26,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 8,
  },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextBlock: {
    flex: 1,
    marginLeft: 13,
  },
  headerKicker: {
    color: "#DDD6FE",
    fontSize: 11,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 24,
    color: "#FFFFFF",
  },
  errorText: {
    color: "#DC2626",
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    elevation: 2,
  },
  emptyText: {
    marginTop: 12,
    color: "#667085",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    shadowColor: "#5523D2",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  fileIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  cardTitleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    color: "#111827",
    lineHeight: 23,
  },
  batchPill: {
    alignSelf: "flex-start",
    color: "#5523D2",
    backgroundColor: "#F5F3FF",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    fontSize: 11,
    marginTop: 5,
  },
  description: {
    fontSize: 14,
    color: "#475467",
    marginBottom: 10,
  },
  metaGrid: {
    gap: 8,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#FBF9FF",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  meta: {
    flex: 1,
    fontSize: 13,
    color: "#667085",
  },
  button: {
    marginTop: 14,
    backgroundColor: "#5523D2",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    color: "#fff",
  },
});
