import { StyleSheet, Text, View } from "react-native";

export default function Modal2() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Your Logsheet is here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  text: {
    fontSize: 26,
    fontWeight: "bold",
  },
});