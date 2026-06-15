import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

interface NotificationItem {
  id: string;
  date: string;
  content: string;
}

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [content, setContent] = useState("");

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const saved = await AsyncStorage.getItem("notifications");
      if (saved) {
        setNotifications(JSON.parse(saved));
      }
    } catch (error) {
      console.log("Load error:", error);
    }
  };

  const addNotification = async () => {
    if (!content.trim()) return;

    const newNotification: NotificationItem = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      content: content,
    };

    const updatedList = [newNotification];
    setNotifications(updatedList);
    await AsyncStorage.setItem("notifications", JSON.stringify(updatedList));

    setContent("");
  };

  return (
    <View style={styles.container}>
      <View style={styles.topSpacing} />

      <Text style={styles.heading}>Notifications</Text>

      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="Enter new notification..."
        placeholderTextColor="#cccccc"
        style={styles.input}
      />

      <Pressable style={styles.button} onPress={addNotification}>
        <Text style={styles.buttonText}>Add Notification</Text>
      </Pressable>

      <View style={styles.divider} />

      <View style={styles.tableHeader}>
        <Text style={[styles.cell, { flex: 0.5 }]}>S.No</Text>
        <Text style={[styles.cell, { flex: 1.5 }]}>Date</Text>
        <Text style={[styles.cell, { flex: 3 }]}>Content</Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.tableRow}>
            <Text style={[styles.cell, { flex: 0.5 }]}>{index + 1}</Text>
            <Text style={[styles.cell, { flex: 1.5 }]}>{item.date}</Text>
            <Text style={[styles.cell, { flex: 3 }]}>{item.content}</Text>
          </View>
        )}
      />

      {/* Small Back Button */}
      <Pressable style={styles.backButton} onPress={() => router.push("/loginform")}>
        <Text style={styles.backButtonText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "black",
  },

  topSpacing: {
    height: 30,
  },

  heading: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    color: "white",
  },

  input: {
    borderWidth: 1,
    borderColor: "white",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    color: "white",
    fontSize: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    shadowColor: "#fff",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  button: {
    backgroundColor: "#5523D2",
    padding: 14,
    borderRadius: 60,
    marginBottom: 18,
    alignItems: "center",
    shadowColor: "#5523D2",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  buttonText: {
    color: "white",
    fontSize: 17,
    fontWeight: "bold",
  },

  divider: {
    height: 1,
    backgroundColor: "#5523D2",
    marginBottom: 10,
    opacity: 0.4,
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#5523D2",
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 5,
  },

  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#5523D2",
  },

  cell: {
    fontSize: 15,
    paddingHorizontal: 6,
    color: "white",
  },

  backButton: {
    backgroundColor: "#5523D2",
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: "center",
    marginTop: 15,
    marginBottom: 15,
  },

  backButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
});
