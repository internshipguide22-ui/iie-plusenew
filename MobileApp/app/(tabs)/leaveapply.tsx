import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import DropDownPicker from "react-native-dropdown-picker";
import api from "@/services/api";

type UploadedFile = {
  name: string;
  uri: string;
  mimeType?: string;
};

export default function LeaveApplyScreen() {
  const router = useRouter();

  const [studentName, setStudentName] = useState("");
  const [batch, setBatch] = useState("");
  const [course, setCourse] = useState("");

  const [open, setOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<string | null>(null);
  const [items, setItems] = useState([
    { label: "Sick Leave", value: "sick" },
    { label: "Casual Leave", value: "casual" },
    { label: "Emergency Leave", value: "emergency" },
    { label: "Personal Leave", value: "personal" },
    { label: "Other", value: "other" },
  ]);

  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [dateType, setDateType] = useState<"start" | "end" | "">("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [reason, setReason] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadStudentProfile = async () => {
      try {
        const response = await api.get("students/me/");
        const data = response.data;

        const firstName = data?.first_name || "";
        const lastName = data?.last_name || "";
        setStudentName(`${firstName} ${lastName}`.trim());

        setBatch(
          data?.assigned_batch_number ||
            data?.assigned_batch?.batch_number ||
            data?.batch_number ||
            ""
        );

        setCourse(
          data?.course_name ||
            data?.course?.course_name ||
            data?.course ||
            ""
        );
      } catch (error: any) {
        console.error("Profile fetch error:", error?.response?.data || error.message);
        Alert.alert("Error", "Unable to load student details");
      } finally {
        setLoadingProfile(false);
      }
    };

    loadStudentProfile();
  }, []);

  const showStartPicker = () => {
    setDateType("start");
    setDatePickerVisible(true);
  };

  const showEndPicker = () => {
    setDateType("end");
    setDatePickerVisible(true);
  };

  const handleDate = (date: Date) => {
    if (dateType === "start") {
      setStartDate(date);
    } else {
      setEndDate(date);
    }
    setDatePickerVisible(false);
  };

  const formatDate = (date: Date | null) =>
    date
      ? `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`
      : "dd-mm-yyyy";

  const formatApiDate = (date: Date | null) => {
    if (!date) return "";
    return date.toISOString().split("T")[0];
  };

  const handleFileUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      multiple: true,
    });

    if (!result.canceled && result.assets) {
      const files = result.assets.map((f) => ({
        name: f.name,
        uri: f.uri,
        mimeType: f.mimeType,
      }));
      setUploadedFiles((prev) => [...prev, ...files].slice(0, 5));
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const openFile = (file: UploadedFile) => {
    if (file.mimeType?.startsWith("image")) {
      setPreviewImage(file.uri);
    } else {
      Alert.alert(
        "PDF Selected",
        "PDF preview is not available here. The file is selected successfully."
      );
    }
  };

  const resetForm = () => {
    setLeaveType(null);
    setStartDate(null);
    setEndDate(null);
    setReason("");
    setUploadedFiles([]);
    setPreviewImage(null);
  };

  const handleSubmit = async () => {
    if (!leaveType || !startDate || !endDate || !reason.trim()) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    if (endDate < startDate) {
      Alert.alert("Error", "End date cannot be before start date");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        leave_type: leaveType,
        start_date: formatApiDate(startDate),
        end_date: formatApiDate(endDate),
        reason: reason.trim(),
      };

      await api.post("student-leave/", payload);

      if (uploadedFiles.length > 0) {
        Alert.alert(
          "Success",
          "Leave applied successfully. Selected files are not uploaded yet because backend file upload is not enabled for this API."
        );
      } else {
        Alert.alert("Success", "Leave applied successfully!");
      }

      resetForm();
    } catch (error: any) {
      console.error("Leave apply error:", error?.response?.data || error.message);
      Alert.alert("Error", error?.response?.data?.error || "Failed to apply leave");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="calendar-clear-outline" size={25} color="#FFFFFF" />
          </View>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroKicker}>Student Request</Text>
            <Text style={styles.headerTitle}>Leave Application</Text>
          </View>
        </View>

        <Text style={styles.label}>Student Name</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={20} color="#5523D2" />
          <TextInput
            style={styles.input}
            value={loadingProfile ? "Loading..." : studentName}
            editable={false}
          />
        </View>

        <Text style={styles.label}>Batch</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="people-outline" size={20} color="#5523D2" />
          <TextInput
            style={styles.input}
            value={loadingProfile ? "Loading..." : batch}
            editable={false}
          />
        </View>

        <Text style={styles.label}>Course</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="school-outline" size={20} color="#5523D2" />
          <TextInput
            style={styles.input}
            value={loadingProfile ? "Loading..." : course}
            editable={false}
          />
        </View>

        <Text style={styles.label}>Leave Type</Text>
        <DropDownPicker
          open={open}
          value={leaveType}
          items={items}
          setOpen={setOpen}
          setValue={setLeaveType}
          setItems={setItems}
          listMode="MODAL"
          style={styles.dropdown}
          dropDownContainerStyle={styles.dropdownContainer}
          textStyle={styles.dropdownText}
          placeholderStyle={styles.dropdownPlaceholder}
          placeholder="Select leave type"
        />

        <Text style={styles.label}>Leave Dates</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.dateBox} onPress={showStartPicker}>
            <Ionicons name="calendar-outline" size={20} color="#5523D2" />
            <Text style={styles.dateText}>{formatDate(startDate)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dateBox} onPress={showEndPicker}>
            <Ionicons name="calendar-outline" size={20} color="#5523D2" />
            <Text style={styles.dateText}>{formatDate(endDate)}</Text>
          </TouchableOpacity>
        </View>

        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleDate}
          onCancel={() => setDatePickerVisible(false)}
        />

        <Text style={styles.label}>Reason</Text>
        <TextInput
          style={styles.textArea}
          multiline
          value={reason}
          onChangeText={setReason}
          placeholder="Enter reason for leave"
          placeholderTextColor="#98A2B3"
        />

        <Text style={styles.label}>Upload Proof (Optional)</Text>
        <TouchableOpacity style={styles.uploadBtn} onPress={handleFileUpload}>
          <Ionicons name="cloud-upload-outline" size={22} color="#5523D2" />
          <Text style={styles.uploadText}>Upload Files</Text>
        </TouchableOpacity>

        {uploadedFiles.map((file, index) => (
          <TouchableOpacity
            key={`${file.uri}-${index}`}
            style={styles.fileRow}
            onPress={() => openFile(file)}
          >
            {file.mimeType?.startsWith("image") ? (
              <Image source={{ uri: file.uri }} style={styles.previewImg} />
            ) : (
              <Ionicons name="document-text-outline" size={28} color="#5523D2" />
            )}

            <Text style={styles.fileName} numberOfLines={1}>
              {file.name}
            </Text>

            <TouchableOpacity onPress={() => removeFile(index)}>
              <Ionicons name="close-circle" size={22} color="red" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={handleSubmit}
          style={{ marginTop: 25 }}
          disabled={submitting}
        >
          <LinearGradient
            colors={["#5523D2", "#7C3AED"]}
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          >
            <Text style={styles.submitText}>
              {submitting ? "Submitting..." : "Submit"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {previewImage && (
        <View style={styles.previewOverlay}>
          <TouchableOpacity
            style={styles.closePreview}
            onPress={() => setPreviewImage(null)}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          <Image source={{ uri: previewImage }} style={styles.fullPreview} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F3FF" },

  backBtn: { flexDirection: "row", alignItems: "center" },
  backText: { marginLeft: 6, fontWeight: "600", color: "#5523D2" },
  headerTitle: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  container: { padding: 16, paddingTop: 46, paddingBottom: 36 },
  hero: {
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
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextBlock: { flex: 1, marginLeft: 13 },
  heroKicker: {
    color: "#DDD6FE",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  label: {
    marginTop: 12,
    color: "#2E1065",
    fontSize: 13,
    fontWeight: "800",
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  input: { flex: 1, marginLeft: 10, color: "#111827", fontWeight: "600" },

  dropdown: {
    marginTop: 6,
    borderRadius: 14,
    minHeight: 50,
    borderColor: "#E9D5FF",
    backgroundColor: "#FFFFFF",
  },
  dropdownContainer: {
    borderColor: "#E9D5FF",
    backgroundColor: "#FFFFFF",
  },
  dropdownText: {
    color: "#111827",
    fontWeight: "600",
  },
  dropdownPlaceholder: {
    color: "#98A2B3",
  },

  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  dateBox: {
    width: "48%",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  dateText: { marginLeft: 8, color: "#111827", fontWeight: "600" },

  textArea: {
    backgroundColor: "#fff",
    height: 100,
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    color: "#111827",
    fontWeight: "600",
  },

  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    padding: 13,
  },
  uploadText: { marginLeft: 8, color: "#5523D2", fontWeight: "600" },

  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  previewImg: { width: 40, height: 40, borderRadius: 6, marginRight: 8 },
  fileName: { flex: 1, color: "#5523D2", marginHorizontal: 6 },

  submitBtn: {
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontSize: 18, fontWeight: "bold" },

  previewOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullPreview: { width: "90%", height: "70%", resizeMode: "contain" },
  closePreview: { position: "absolute", top: 40, right: 20 },
});
