import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function TrainerCard() {
  return (
    <View style={styles.container}>
      
      {/* Header */}
      <Text style={styles.header}>Batch Details</Text>

      {/* Centered Card */}
      <View style={styles.card}>
        
        {/* Trainer Name */}
        <View style={styles.row}>
          <Text style={styles.label}>Trainer Name</Text>
          <Text style={styles.value}>Kaviya</Text>
        </View>

        {/* Timing */}
        <View style={styles.row}>
          <Text style={styles.label}>Timing</Text>
          <Text style={styles.value}>10:00 AM - 12:00 PM</Text>
        </View>

        {/* Attendance Row */}
        <View style={styles.row}>
          <Text style={styles.label}>Attendance</Text>

          <TouchableOpacity style={styles.viewBtn}>
            <Text style={styles.btnText}>View</Text>
          </TouchableOpacity>
        </View>

        {/* Log Sheet Row */}
        <View style={styles.row}>
          <Text style={styles.label}>Log Sheet</Text>

          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => router.push("/modal2")}   // ✅ Redirect to modal2
          >
            <Text style={styles.btnText}>View</Text>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
    paddingTop: 40,
  },

  header: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#5523D2",
  },

  card: {
    width: "90%",
    backgroundColor: "black",
    padding: 20,
    borderRadius: 15,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderLeftWidth: 6,
    borderLeftColor: "#5523D2",
    alignItems: "center",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 15,
  },

  label: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },

  value: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },

  viewBtn: {
    backgroundColor: "#5523D2",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
    elevation: 4,
  },

  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  backBtn: {
    marginTop: 20,
    backgroundColor: "#5523D2",
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 10,
    alignItems: "center",
  },

  backBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
