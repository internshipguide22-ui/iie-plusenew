import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import api from "@/services/api";
import CustomBottomNav from "./CustomBottomNav";

const { width } = Dimensions.get("window");

type QuizItem = {
  id: number;
  title: string;
  description?: string;
  total_questions: number;
  total_marks: number;
  duration_minutes: number;
  passing_marks: number;
  max_attempts: number;
  user_attempts: number;
  best_score?: number | null;
  status?: "available" | "upcoming" | "expired" | "completed";
  category?: string;
};

type AssignedTestItem = {
  id: number;
  test_id: number;
  test_title: string;
  test_description?: string;
  total_questions: number;
  assigned_date?: string;
};

type TestResultItem = {
  test_id: number;
  percentage: number;
};

type Section = "upcoming" | "excel";

export default function QuizHome() {
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>("upcoming");
  const [excelQuizzes, setExcelQuizzes] = useState<QuizItem[]>([]);
  const [assignedTests, setAssignedTests] = useState<AssignedTestItem[]>([]);
  const [testResults, setTestResults] = useState<TestResultItem[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [quizResponse, testResponse, resultResponse] = await Promise.all([
        api.get("/quiz/student/"),
        api.get("/student-tests/"),
        api.get("/test-results/"),
      ]);

      setExcelQuizzes(quizResponse.data?.results || []);
      setAssignedTests(Array.isArray(testResponse.data) ? testResponse.data : []);
      setTestResults(resultResponse.data?.results || []);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.error || "Failed to load quizzes and tests."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const completedTestIds = useMemo(() => {
    return new Set(testResults.map((result) => result.test_id));
  }, [testResults]);

  const availableExcelQuizzes = useMemo(() => {
    return excelQuizzes.filter(
      (quiz) => (quiz.status || "available") === "available"
    );
  }, [excelQuizzes]);

  const completedExcelQuizzes = useMemo(() => {
    return excelQuizzes.filter(
      (quiz) => (quiz.status || "available") !== "available"
    );
  }, [excelQuizzes]);

  const startExcelQuiz = (quiz: QuizItem) => {
    if ((quiz.status || "available") !== "available") {
      Alert.alert("Quiz unavailable", `This quiz is ${quiz.status || "not available"}.`);
      return;
    }

    router.push({
      pathname: "/(tabs)/app",
      params: { quizId: String(quiz.id), mode: "excel" },
    });
  };

  const startAssignedTest = (test: AssignedTestItem) => {
    if (completedTestIds.has(test.test_id)) {
      Alert.alert("Already completed", "You have already attended this test.");
      return;
    }

    router.push({
      pathname: "/(tabs)/app",
      params: { quizId: String(test.test_id), mode: "assigned-test" },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#F6F3FF" barStyle="dark-content" />
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#5523D2" />
          <Text style={styles.loaderText}>Loading quiz modules...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#F6F3FF" barStyle="dark-content" />

      <ScrollView contentContainerStyle={styles.mainContainer}>
        <View style={styles.heroHeader}>
          <View style={styles.heroHeaderTop}>
            <View style={styles.headingIcon}>
              <Ionicons name="school-outline" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.kicker}>Student Quizzes</Text>
              <Text style={styles.heading}>Quizzes</Text>
            </View>
            <Pressable style={styles.refreshBtn} onPress={loadData}>
              <Ionicons name="refresh" size={20} color="#5523D2" />
            </Pressable>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{assignedTests.length}</Text>
              <Text style={styles.statLabel}>Test</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{availableExcelQuizzes.length}</Text>
              <Text style={styles.statLabel}>Quiz</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{testResults.length + completedExcelQuizzes.length}</Text>
              <Text style={styles.statLabel}>Done</Text>
            </View>
          </View>
        </View>

        <View style={styles.segmented}>
          <Pressable
            style={[styles.segment, section === "upcoming" && styles.segmentActive]}
            onPress={() => setSection("upcoming")}
          >
            <Ionicons
              name="calendar-outline"
              size={17}
              color={section === "upcoming" ? "#FFFFFF" : "#5523D2"}
            />
            <Text style={[styles.segmentText, section === "upcoming" && styles.segmentTextActive]}>
              Upcoming Test
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segment, section === "excel" && styles.segmentActive]}
            onPress={() => setSection("excel")}
          >
            <Ionicons
              name="document-text-outline"
              size={17}
              color={section === "excel" ? "#FFFFFF" : "#5523D2"}
            />
            <Text style={[styles.segmentText, section === "excel" && styles.segmentTextActive]}>
              Quiz
            </Text>
          </Pressable>
        </View>

        {section === "upcoming" ? (
          <View style={styles.sectionWrap}>
            <SectionHeader
              title="Upcoming Test"
              subtitle="Tests created and assigned by your mentor"
            />
            {assignedTests.length ? (
              assignedTests.map((test) => {
                const completed = completedTestIds.has(test.test_id);
                const result = testResults.find((item) => item.test_id === test.test_id);
                return (
                  <View key={test.id} style={styles.card}>
                    <View style={styles.cardTitleRow}>
                      <View style={styles.cardIcon}>
                        <Ionicons name="clipboard-outline" size={23} color="#5523D2" />
                      </View>
                      <View style={styles.cardTitleCopy}>
                        <Text style={styles.cardTitle}>{test.test_title}</Text>
                        <Text style={[styles.statusPill, completed ? styles.statusDone : styles.statusReady]}>
                          {completed ? "Completed" : "Ready to attend"}
                        </Text>
                      </View>
                    </View>
                    {!!test.test_description && (
                      <Text style={styles.description}>{test.test_description}</Text>
                    )}
                    <View style={styles.metaWrap}>
                      <View style={styles.metaChip}>
                        <Ionicons name="help-circle-outline" size={15} color="#5523D2" />
                        <Text style={styles.metaText}>{test.total_questions} Questions</Text>
                      </View>
                      <View style={styles.metaChip}>
                        <Ionicons name="calendar-outline" size={15} color="#5523D2" />
                        <Text style={styles.metaText}>{test.assigned_date || "Assigned Test"}</Text>
                      </View>
                      {result ? (
                        <View style={styles.metaChip}>
                          <Ionicons name="trophy-outline" size={15} color="#15803D" />
                          <Text style={[styles.metaText, styles.scoreMeta]}>Score {result.percentage}%</Text>
                        </View>
                      ) : null}
                    </View>
                    <Pressable
                      style={[styles.startBtn, completed && styles.disabledBtn]}
                      onPress={() => startAssignedTest(test)}
                    >
                      <MaterialIcons name={completed ? "check" : "play-arrow"} size={22} color="#fff" />
                      <Text style={styles.startBtnText}>
                        {completed ? "Completed" : "Start Test"}
                      </Text>
                    </Pressable>
                  </View>
                );
              })
            ) : (
              <EmptyCard text="No upcoming tests assigned yet." />
            )}
          </View>
        ) : (
          <View style={styles.sectionWrap}>
            <SectionHeader
              title="Quiz"
              subtitle="Published quizzes uploaded by your mentor"
            />
            {availableExcelQuizzes.length || completedExcelQuizzes.length ? (
              <>
                {availableExcelQuizzes.map((quiz) => (
                  <ExcelQuizCard key={quiz.id} quiz={quiz} onStart={() => startExcelQuiz(quiz)} />
                ))}
                {completedExcelQuizzes.length ? (
                  <View style={styles.historyCard}>
                    <Text style={styles.historyTitle}>Completed / Closed Quiz</Text>
                    {completedExcelQuizzes.map((quiz) => (
                      <View key={quiz.id} style={styles.historyItem}>
                        <Text style={styles.historyQuizTitle}>{quiz.title}</Text>
                        <Text style={styles.historyText}>
                          Status: {(quiz.status || "completed").toUpperCase()}
                        </Text>
                        <Text style={styles.historyText}>
                          Best Score: {quiz.best_score ?? 0}%
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            ) : (
              <EmptyCard text="No quizzes published yet." />
            )}
          </View>
        )}
      </ScrollView>
      <CustomBottomNav />
    </SafeAreaView>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionBackIcon}>
        <Ionicons name="layers-outline" size={18} color="#5523D2" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function ExcelQuizCard({ quiz, onStart }: { quiz: QuizItem; onStart: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <View style={styles.cardIcon}>
          <Ionicons name="document-text-outline" size={23} color="#5523D2" />
        </View>
        <View style={styles.cardTitleCopy}>
          <Text style={styles.cardTitle}>{quiz.title}</Text>
          <Text style={[styles.statusPill, styles.statusReady]}>
            {(quiz.status || "available") === "available" ? "Available" : (quiz.status || "closed")}
          </Text>
        </View>
      </View>
      {!!quiz.description && <Text style={styles.description}>{quiz.description}</Text>}
      <View style={styles.metaWrap}>
        <View style={styles.metaChip}>
          <Ionicons name="help-circle-outline" size={15} color="#5523D2" />
          <Text style={styles.metaText}>{quiz.total_questions} Questions</Text>
        </View>
        <View style={styles.metaChip}>
          <Ionicons name="time-outline" size={15} color="#5523D2" />
          <Text style={styles.metaText}>{quiz.duration_minutes || 0} min</Text>
        </View>
        {!!quiz.category && (
          <View style={styles.metaChip}>
            <Ionicons name="bookmark-outline" size={15} color="#5523D2" />
            <Text style={styles.metaText}>{quiz.category}</Text>
          </View>
        )}
        <View style={styles.metaChip}>
          <Ionicons name="ribbon-outline" size={15} color="#15803D" />
          <Text style={[styles.metaText, styles.scoreMeta]}>Pass {quiz.passing_marks}%</Text>
        </View>
      </View>
      <Pressable style={styles.startBtn} onPress={onStart}>
        <MaterialIcons name="play-arrow" size={22} color="#fff" />
        <Text style={styles.startBtnText}>
          {quiz.user_attempts > 0 ? "Retake Quiz" : "Start Quiz"}
        </Text>
      </Pressable>
    </View>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <View style={styles.emptyCard}>
      <Ionicons name="document-text-outline" size={42} color="#98A2B3" />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F3FF",
  },
  mainContainer: {
    flexGrow: 1,
    paddingTop: 18,
    paddingBottom: 116,
    paddingHorizontal: 16,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F6F3FF",
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: "#475467",
    fontWeight: "700",
  },
  heroHeader: {
    backgroundColor: "#5523D2",
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#5523D2",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  heroHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headingIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  heroCopy: {
    flex: 1,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: {
    color: "#E9D5FF",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  heading: {
    fontSize: 31,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0,
  },
  statRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 18,
  },
  statPill: {
    flex: 1,
    minHeight: 64,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
  },
  statLabel: {
    color: "#EDE9FE",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 2,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 5,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    shadowColor: "#5523D2",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  segment: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  segmentActive: {
    backgroundColor: "#5523D2",
  },
  segmentText: {
    color: "#5523D2",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },
  moduleGrid: {
    gap: 16,
  },
  moduleCard: {
    minHeight: 184,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    shadowColor: "#5523D2",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  moduleIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  moduleTitle: {
    color: "#111827",
    fontSize: 21,
    fontWeight: "900",
  },
  moduleSubtitle: {
    color: "#667085",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
    marginTop: 5,
  },
  moduleFooter: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  moduleCount: {
    color: "#5523D2",
    fontSize: 13,
    fontWeight: "900",
  },
  sectionWrap: {
    gap: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  sectionBackIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 19,
    fontWeight: "900",
  },
  sectionSubtitle: {
    color: "#667085",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  card: {
    width: width - 32,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    shadowColor: "#5523D2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 5,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 13,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleCopy: {
    flex: 1,
    gap: 7,
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    color: "#111827",
  },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: 14,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  statusReady: {
    color: "#5523D2",
    backgroundColor: "#F5F3FF",
  },
  statusDone: {
    color: "#15803D",
    backgroundColor: "#ECFDF3",
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    color: "#667085",
    fontWeight: "700",
    marginBottom: 12,
  },
  metaWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    gap: 8,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 13,
    backgroundColor: "#F8F5FF",
    borderWidth: 1,
    borderColor: "#EDE9FE",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metaText: {
    fontSize: 12,
    color: "#4C1D95",
    fontWeight: "900",
  },
  scoreMeta: {
    color: "#15803D",
  },
  startBtn: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5523D2",
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 16,
    gap: 6,
  },
  disabledBtn: {
    backgroundColor: "#98A2B3",
  },
  startBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  historyTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  historyItem: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7",
  },
  historyQuizTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 4,
  },
  historyText: {
    fontSize: 13,
    color: "#667085",
    fontWeight: "700",
  },
  emptyCard: {
    minHeight: 150,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: "#667085",
    fontWeight: "800",
    textAlign: "center",
  },
});
