import { Ionicons } from "@expo/vector-icons";
import api from "@/services/api";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function ProfileView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    gender: "",
    dob: "",
    email: "",
    mobile: "",
    course: "",
    batch: "",
    qualification: "",
    joining: "",
    ending: "",
  });
  const [image, setImage] = useState("https://i.pravatar.cc/300");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get("students/me/");
      const data = response.data;

      setProfile({
        name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
        gender: data.gender || "",
        dob: data.date_of_birth || "",
        email: data.email || "",
        mobile: data.mobile_no || "",
        course: data.course || "",
        batch: data.assigned_batch_number || "",
        qualification: data.qualification || "",
        joining: data.created_at ? data.created_at.split("T")[0] : "",
        ending: "",
      });

      if (data.photo) {
        setImage(resolveMediaUrl(data.photo));
      }
    } catch (error: any) {
      console.log("Profile fetch error:", error);
      Alert.alert(
        "Error",
        error?.response?.data?.detail ||
          error?.response?.data?.error ||
          error?.message ||
          "Failed to load profile"
      );
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);

      const [first_name, ...rest] = profile.name.trim().split(" ");
      const last_name = rest.join(" ");

      const payload = {
        first_name: first_name || "",
        last_name: last_name || "",
        gender: profile.gender,
        date_of_birth: profile.dob,
        email: profile.email,
        mobile_no: profile.mobile,
      };

      await api.put("students/me/", payload);

      setEditMode(false);
      Alert.alert("Success", "Profile updated successfully");
      await loadProfile();
    } catch (error: any) {
      console.log("Profile update error:", error);
      Alert.alert(
        "Update Failed",
        error?.response?.data?.detail ||
          error?.response?.data?.error ||
          error?.message ||
          "Could not update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  const resolveMediaUrl = (value: string) => {
    if (/^https?:\/\//i.test(value)) return value;

    const apiBase = String(api.defaults.baseURL || "");
    const serverBase = apiBase.replace(/\/api\/?$/, "");
    return `${serverBase}${value.startsWith("/") ? "" : "/"}${value}`;
  };

  const handleEditDone = async () => {
    if (editMode) {
      await saveProfile();
    } else {
      setEditMode(true);
    }
  };

  const renderRow = (
    icon: any,
    label: string,
    key: keyof typeof profile,
    editable: boolean = false
  ) => (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={18} color="#5523D2" />
        <Text style={styles.label}>{label}</Text>
      </View>
      {editMode && editable ? (
        <TextInput
          value={profile[key]}
          onChangeText={(text) => setProfile((prev) => ({ ...prev, [key]: text }))}
          style={styles.input}
        />
      ) : (
        <Text style={styles.value}>{profile[key] || "-"}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#5523D2" />
        <Text style={{ marginTop: 12 }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="person-circle-outline" size={28} color="#5523D2" />
          <Text style={styles.heading}>Student Profile</Text>
          <Ionicons name="school-outline" size={28} color="#5523D2" />
        </View>
      </View>

      <View style={styles.profileCenter}>
        <Image source={{ uri: image }} style={styles.avatar} />

        <Pressable
          style={styles.modeBtn}
          onPress={handleEditDone}
          disabled={saving}
        >
          <Text style={styles.modeText}>
            {saving ? "Saving..." : editMode ? "Done" : "Edit"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-outline" size={20} color="#5523D2" />
          <Text style={styles.cardTitle}>Personal Details</Text>
        </View>
        {renderRow("person-outline", "Name", "name", true)}
        {renderRow("male-female-outline", "Gender", "gender", true)}
        {renderRow("calendar-outline", "Date of Birth", "dob", true)}
        {renderRow("mail-outline", "Email", "email", true)}
        {renderRow("call-outline", "Mobile", "mobile", true)}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="briefcase-outline" size={20} color="#5523D2" />
          <Text style={styles.cardTitle}>Professional Details</Text>
        </View>
        {renderRow("book-outline", "Course", "course")}
        {renderRow("time-outline", "Batch", "batch")}
        {renderRow("school-outline", "Qualification", "qualification")}
        {renderRow("log-in-outline", "Joining Date", "joining")}
        {renderRow("log-out-outline", "Ending Date", "ending")}
      </View>

      {Platform.OS === "android" && <View style={{ height: 30 }} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loaderWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Platform.OS === "ios" ? 40 : 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
  },
  profileCenter: {
    alignItems: "center",
    marginVertical: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  modeBtn: {
    marginTop: 14,
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#5523D2",
  },
  modeText: {
    color: "#fff",
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderRadius: 16,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#5523D2",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  rowLeft: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  label: {
    color: "#555",
    fontWeight: "600",
  },
  value: {
    color: "#000",
    maxWidth: "50%",
    textAlign: "right",
  },
  input: {
    borderBottomWidth: 1,
    minWidth: "50%",
    textAlign: "right",
    color: "#000",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#5523D2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    marginTop: 10,
    alignSelf: "center",
    minWidth: 100,
  },
  backText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
