import { Tabs, useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { BackHandler, PanResponder, StyleSheet, View } from "react-native";

const HOME_PATH = "/welcome";
const NO_SWIPE_PATHS = new Set(["/", HOME_PATH, "/loginform", "/register", "/public-overview"]);

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { mode } = useGlobalSearchParams<{ mode?: string }>();
  const routeMode = Array.isArray(mode) ? mode[0] : mode;
  const canGoHome = !NO_SWIPE_PATHS.has(pathname);

  const goBackTarget = () => {
    if (pathname === "/app") {
      if (routeMode === "practice") {
        router.replace({ pathname: "/welcome", params: { module: "practice" } } as any);
        return;
      }
      router.replace("/quizzes" as any);
      return;
    }

    router.replace(HOME_PATH as any);
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!canGoHome) return false;
      goBackTarget();
      return true;
    });

    return () => subscription.remove();
  }, [canGoHome, pathname, routeMode]);

  const edgeSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (!canGoHome) return false;
          const horizontalMove = Math.abs(gestureState.dx);
          const verticalMove = Math.abs(gestureState.dy);
          return gestureState.dx > 10 && horizontalMove > verticalMove * 1.15;
        },
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          if (!canGoHome) return false;
          const horizontalMove = Math.abs(gestureState.dx);
          const verticalMove = Math.abs(gestureState.dy);
          return gestureState.dx > 10 && horizontalMove > verticalMove * 1.15;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > 46 || gestureState.vx > 0.35) {
            goBackTarget();
          }
        },
      }),
    [canGoHome, pathname, routeMode]
  );

  return (
    <View style={styles.shell}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="loginform" />
        <Tabs.Screen name="register" />
        <Tabs.Screen name="welcome" />
        <Tabs.Screen name="public-overview" />
        <Tabs.Screen name="home" />
        <Tabs.Screen name="attendance/index" />
        <Tabs.Screen name="announcement" />
        <Tabs.Screen name="leaveapply" />
        <Tabs.Screen name="leavehistory" />
        <Tabs.Screen name="logsheet" />
        <Tabs.Screen name="materials" />
        <Tabs.Screen name="profile" />
        <Tabs.Screen name="quizzes" />
        <Tabs.Screen name="app" />
        <Tabs.Screen name="support" />
      </Tabs>

      {canGoHome ? (
        <View
          {...edgeSwipeResponder.panHandlers}
          pointerEvents="box-only"
          style={styles.edgeSwipeZone}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  edgeSwipeZone: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 56,
    zIndex: 999,
    elevation: 999,
  },
});
