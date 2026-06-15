import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import api from "@/services/api";

type QuizQuestion = {
  id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c?: string;
  option_d?: string;
  marks?: number;
};

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
  questions: QuizQuestion[];
};

type QuizResult = {
  attempt_id: number;
  score: number;
  total_marks: number;
  percentage: number;
  is_passed: boolean;
  correct_count: number;
  total_questions: number;
};

export default function App() {
  const { quizId } = useLocalSearchParams<{ quizId?: string }>();

  const [quiz, setQuiz] = useState<QuizItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);

  const questions = quiz?.questions || [];

  const loadQuiz = async () => {
    if (!quizId) {
      Alert.alert("Error", "Quiz id not found.");
      router.back();
      return;
    }

    try {
      setLoading(true);
      const response = await api.get("/quiz/student/");
      const allQuizzes: QuizItem[] = response.data?.results || [];
      const selectedQuiz = allQuizzes.find((q) => String(q.id) === String(quizId));

      if (!selectedQuiz) {
        Alert.alert("Not Found", "This quiz is not available for you.");
        router.back();
        return;
      }

      setQuiz(selectedQuiz);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.error || "Failed to load quiz."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  const heading = useMemo(() => {
    return quiz?.title || "Technical Test";
  }, [quiz]);

  const selectAnswer = (questionId: number, option: string) => {
    if (result) return;
    setAnswers((prev) => {
      if (prev[questionId]) return prev;
      return { ...prev, [questionId]: option };
    });
  };

  const handleSubmit = async () => {
    if (!quiz) return;

    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      Alert.alert(
        "Submit Quiz",
        `You answered ${answeredCount}/${questions.length} questions. Submit anyway?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Submit", onPress: submitQuiz },
        ]
      );
      return;
    }

    submitQuiz();
  };

  const submitQuiz = async () => {
    if (!quiz) return;

    try {
      setSubmitting(true);
      const payloadAnswers: Record<string, string> = {};
      Object.entries(answers).forEach(([questionId, option]) => {
        payloadAnswers[String(questionId)] = option;
      });

      const response = await api.post(`/quiz/${quiz.id}/take/`, {
        answers: payloadAnswers,
      });

      setResult(response.data);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.error || "Failed to submit quiz."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setResult(null);
    loadQuiz();
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#5523D2" />
        <Text style={styles.loaderText}>Loading quiz...</Text>
      </View>
    );
  }

  if (!quiz) {
    return (
      <View style={styles.loaderWrap}>
        <Text style={styles.loaderText}>Quiz not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>{heading}</Text>

      {quiz.description ? (
        <Text style={styles.description}>{quiz.description}</Text>
      ) : null}

      {questions.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.question}>No questions available for this quiz.</Text>
        </View>
      ) : (
        questions.map((q, idx) => {
          const userAnswer = answers[q.id];
          const isAnswered = !!userAnswer;

          const options = [
            { key: "A", text: q.option_a },
            { key: "B", text: q.option_b },
            { key: "C", text: q.option_c || "" },
            { key: "D", text: q.option_d || "" },
          ].filter((item) => item.text);

          return (
            <View key={q.id} style={styles.card}>
              <Text style={styles.question}>
                {idx + 1}. {q.question_text}
              </Text>

              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.optionBtn,
                    userAnswer === opt.key && styles.selectedOptionBtn,
                  ]}
                  onPress={() => selectAnswer(q.id, opt.key)}
                  disabled={isAnswered || !!result}
                >
                  <Text
                    style={[
                      styles.optionText,
                      userAnswer === opt.key && styles.selectedOptionText,
                    ]}
                  >
                    {opt.key}. {opt.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          );
        })
      )}

      {!result ? (
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting || questions.length === 0}
        >
          <Text style={styles.submitText}>
            {submitting ? "Submitting..." : "Submit Quiz"}
          </Text>
        </TouchableOpacity>
      ) : (
        <>
          <Text style={styles.scoreText}>
            Your Score: {result.score} / {result.total_marks}
          </Text>
          <Text style={styles.resultText}>
            Percentage: {result.percentage}% | {result.is_passed ? "Passed" : "Failed"}
          </Text>

          {quiz.max_attempts === 0 || quiz.user_attempts + 1 < quiz.max_attempts ? (
            <TouchableOpacity style={styles.restartBtn} onPress={handleRestart}>
              <Text style={styles.restartText}>Retry Quiz</Text>
            </TouchableOpacity>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "white", flexGrow: 1 },
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    padding: 20,
  },
  loaderText: { marginTop: 12, fontSize: 14, color: "#444" },
  heading: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  question: { fontSize: 16, fontWeight: "bold", marginBottom: 10 },
  optionBtn: {
    padding: 12,
    backgroundColor: "#e0e0e0",
    borderRadius: 10,
    marginBottom: 10,
  },
  selectedOptionBtn: {
    backgroundColor: "#5523D2",
  },
  optionText: { fontSize: 15, fontWeight: "600" },
  selectedOptionText: { color: "white" },
  submitBtn: {
    backgroundColor: "#5523D2",
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 20,
  },
  submitText: { color: "white", fontSize: 18, fontWeight: "bold" },
  scoreText: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    textAlign: "center",
  },
  resultText: {
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
    color: "#333",
  },
  restartBtn: {
    marginTop: 15,
    backgroundColor: "#5523D2",
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: "center",
    width: "60%",
    alignSelf: "center",
  },
  restartText: { color: "white", fontSize: 16, fontWeight: "bold" },
  backBtn: {
    marginTop: 15,
    backgroundColor: "#5523D2",
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: "center",
    width: "60%",
    alignSelf: "center",
  },
  backText: { color: "white", fontSize: 16, fontWeight: "bold" },
});
