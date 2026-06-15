import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  CalendarEvent,
  GalleryItem,
  NewsItem,
  VlogItem,
  getPublicHomeContent,
  submitReferral,
} from "@/services/api";
import api from "@/services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { Href, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Easing,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  useColorScheme,
  View,
} from "react-native";

type ModuleKey =
  | "home"
  | "gallery"
  | "vlogs"
  | "practice"
  | "calendar"
  | "eventDetail"
  | "announcement"
  | "news"
  | "newsDetail"
  | "referral"
  | "about";

const sideNavItems: Array<{
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  module?: ModuleKey;
  route?: Href;
  privateOnly?: boolean;
}> = [
  { key: "overview", label: "Overview", icon: "grid-outline", route: "/home", privateOnly: true },
  { key: "materials", label: "Materials", icon: "book-outline", route: "/materials", privateOnly: true },
  { key: "leave", label: "Leave", icon: "calendar-outline", route: "/leaveapply", privateOnly: true },
  { key: "support", label: "Support", icon: "help-buoy-outline", route: "/support", privateOnly: true },
  { key: "gallery", label: "Gallery", icon: "image-outline", module: "gallery" },
  { key: "vlogs", label: "Vlogs", icon: "videocam-outline", module: "vlogs" },
  { key: "news", label: "News", icon: "newspaper-outline", module: "news" },
];

const bottomNavItems: Array<{
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  module?: ModuleKey;
  route?: Href;
  privateOnly?: boolean;
}> = [
  { key: "overview", label: "Overview", icon: "grid-outline", route: "/home", privateOnly: true },
  { key: "attendance", label: "Attendance", icon: "time-outline", route: "/attendance", privateOnly: true },
  { key: "home", label: "Home", icon: "home", module: "home" },
  { key: "logsheet", label: "Logsheet", icon: "document-text-outline", route: "/logsheet", privateOnly: true },
  { key: "quizzes", label: "Quizzes", icon: "school-outline", route: "/quizzes", privateOnly: true },
];

const instagramUrl = "https://www.instagram.com/iie_indra_institute?igsh=MXB1OW03N3QyNmV2ag==";
const websiteUrl = "https://indrainstitute.com/";
const facebookUrl = "https://www.facebook.com/share/1B52k1NCH7/";
const googleFormUrl = "https://forms.gle/nKXHiEnnZHZeegig7";
const appLogoLight = require("../../assets/images/logo-light.png");
const appLogoDark = require("../../assets/images/logo-transparent.png");
const heroStudentsImage = require("../../assets/images/hero-students.png");

function openExternalLink(url: string) {
  if (url) {
    Linking.openURL(url);
    return;
  }

  Alert.alert("Link not added", "Please share this link to enable the button.");
}

export default function WelcomeScreen() {
  const router = useRouter();
  const { module } = useLocalSearchParams<{ module?: string }>();
  const colorScheme = useColorScheme();
  const appLogo = colorScheme === "dark" ? appLogoDark : appLogoLight;
  const slideAnim = useRef(new Animated.Value(1)).current;
  const [activeModule, setActiveModule] = useState<ModuleKey>("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [vlogs, setVlogs] = useState<VlogItem[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeNewsIndex, setActiveNewsIndex] = useState(0);
  const [isPrivateUser, setIsPrivateUser] = useState(false);

  useEffect(() => {
    loadSession();
    loadContent();
  }, []);

  useEffect(() => {
    const requestedModule = Array.isArray(module) ? module[0] : module;
    const allowedModules: ModuleKey[] = ["home", "gallery", "vlogs", "practice", "calendar", "announcement", "news", "referral", "about"];
    if (requestedModule && allowedModules.includes(requestedModule as ModuleKey)) {
      setActiveModule(requestedModule as ModuleKey);
    }
  }, [module]);

  useFocusEffect(
    useCallback(() => {
      loadSession();
    }, [])
  );

  useEffect(() => {
    if (!news.length) {
      setActiveNewsIndex(0);
      return;
    }

    setActiveNewsIndex((index) => (index >= news.length ? 0 : index));

    if (news.length === 1) {
      return;
    }

    const timer = setInterval(() => {
      setActiveNewsIndex((index) => (index + 1) % news.length);
    }, 3200);

    return () => clearInterval(timer);
  }, [news.length]);

  useEffect(() => {
    slideAnim.setValue(0);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeNewsIndex, slideAnim]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (drawerOpen) {
        setDrawerOpen(false);
        return true;
      }

      if (activeModule === "newsDetail") {
        setActiveModule("news");
        return true;
      }

      if (activeModule === "eventDetail") {
        setActiveModule("calendar");
        return true;
      }

      if (activeModule !== "home") {
        setActiveModule("home");
        return true;
      }

      return true;
    });

    return () => subscription.remove();
  }, [activeModule, drawerOpen]);

  const slideStyle = useMemo(
    () => ({
      opacity: slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.35, 1],
      }),
      transform: [
        {
          translateX: slideAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [90, 0],
          }),
        },
      ],
    }),
    [slideAnim]
  );

  const moveNews = (direction: "next" | "prev") => {
    if (!news.length) return;
    setActiveNewsIndex((index) => {
      if (direction === "next") return (index + 1) % news.length;
      return (index - 1 + news.length) % news.length;
    });
  };

  const loadContent = async () => {
    setErrorMsg("");
    const result = await getPublicHomeContent();

    if (result.success) {
      setGallery(result.data.gallery);
      setVlogs(result.data.vlogs);
      setNews(result.data.news);
      setCalendarEvents(result.data.calendarEvents || []);
      setErrorMsg(result.error || "");
    } else {
      setErrorMsg(result.error || "Could not load updates.");
    }

    setLoading(false);
    setRefreshing(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSession();
    await loadContent();
  };

  const loadSession = async () => {
    const token = await AsyncStorage.getItem("access_token");
    setIsPrivateUser(!!token);
  };

  const showRegisterPrompt = () => {
    setDrawerOpen(false);
    Alert.alert(
      "Access restricted",
      "kindly register here to access this page",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Register", onPress: () => openExternalLink(googleFormUrl) },
      ]
    );
  };

  const openModule = (module: ModuleKey) => {
    setActiveModule(module);
    setDrawerOpen(false);
  };

  const openNavItem = (item: (typeof sideNavItems)[number] | (typeof bottomNavItems)[number]) => {
    if (item.privateOnly && !isPrivateUser) {
      showRegisterPrompt();
      return;
    }

    if (item.route) {
      setDrawerOpen(false);
      router.push(item.route as any);
      return;
    }

    if (item.module) {
      openModule(item.module);
    }
  };

  const openEventDetail = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setActiveModule("eventDetail");
    setDrawerOpen(false);
  };

  const openNewsDetail = (item: NewsItem) => {
    setSelectedNews(item);
    setActiveModule("newsDetail");
    setDrawerOpen(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove([
      "guest_session",
      "access_token",
      "refresh_token",
      "student_id",
      "student_pk",
      "student_name",
    ]);
    setIsPrivateUser(false);
    setActiveModule("home");
    router.replace("/loginform" as any);
  };

  return (
    <ThemedView style={styles.container}>
      {drawerOpen ? (
        <>
          <Pressable style={styles.drawerOverlay} onPress={() => setDrawerOpen(false)} />
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <View style={styles.logoMarkSmall}>
                <Image source={appLogo} style={styles.logoImageSmall} resizeMode="contain" />
              </View>
              <View>
                <ThemedText style={styles.drawerTitle}>IIE Pulse</ThemedText>
                <ThemedText style={styles.drawerSubtitle}>
                  {isPrivateUser ? "Student access" : "Public access"}
                </ThemedText>
              </View>
            </View>

            <ScrollView
              style={styles.drawerScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.drawerList}
            >
              {sideNavItems.map((item) => (
                (() => {
                  const active = item.module === activeModule;
                  return (
                    <Pressable
                      key={item.key}
                      style={[
                        styles.drawerItem,
                        active && styles.drawerItemActive,
                      ]}
                      onPress={() => openNavItem(item)}
                    >
                      <Ionicons
                        name={item.icon}
                        size={21}
                        color={active ? "#5523D2" : "#EDE9FE"}
                      />
                      <ThemedText
                        style={[
                          styles.drawerItemText,
                          active && styles.drawerItemTextActive,
                        ]}
                      >
                        {item.label}
                      </ThemedText>
                    </Pressable>
                  );
                })()
              ))}
            </ScrollView>

            <Pressable style={styles.logoutItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={21} color="#FEE2E2" />
              <ThemedText style={styles.logoutText}>Logout</ThemedText>
            </Pressable>
          </View>
        </>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <Pressable style={styles.menuButton} onPress={() => setDrawerOpen(true)}>
            <Ionicons name="menu-outline" size={28} color="#5523D2" />
          </Pressable>

          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <Image source={appLogo} style={styles.logoImage} resizeMode="contain" />
            </View>
          </View>

          <Pressable
            style={styles.notificationButton}
            onPress={() => {
              if (isPrivateUser) {
                openModule("announcement");
              } else {
                showRegisterPrompt();
              }
            }}
          >
            <View style={styles.notificationDot} />
            <Ionicons name="notifications-outline" size={24} color="#5523D2" />
          </Pressable>
        </View>

        {errorMsg ? <ThemedText style={styles.errorText}>{errorMsg}</ThemedText> : null}

        {activeModule === "home" ? (
          <HomeContent
            news={news}
            newsError={errorMsg}
            activeNewsIndex={activeNewsIndex}
            slideStyle={slideStyle}
            moveNews={moveNews}
            selectNews={setActiveNewsIndex}
            openModule={openModule}
            openEventDetail={openEventDetail}
            calendarEvents={calendarEvents}
          />
        ) : activeModule === "gallery" ? (
          <GalleryModule loading={loading} gallery={gallery} />
        ) : activeModule === "vlogs" ? (
          <VlogsModule loading={loading} vlogs={vlogs} />
        ) : activeModule === "news" ? (
          <NewsModule loading={loading} news={news} openNewsDetail={openNewsDetail} />
        ) : activeModule === "newsDetail" && selectedNews ? (
          <NewsDetailModule item={selectedNews} />
        ) : activeModule === "practice" ? (
          <PracticeModule />
        ) : activeModule === "calendar" ? (
          <CalendarModule loading={loading} events={calendarEvents} openEventDetail={openEventDetail} />
        ) : activeModule === "eventDetail" && selectedEvent ? (
          <EventDetailModule event={selectedEvent} onBack={() => setActiveModule("home")} />
        ) : activeModule === "referral" ? (
          <ReferralModule />
        ) : (
          <PlaceholderModule module={activeModule} />
        )}
      </ScrollView>

      <View style={styles.commonBottomNav}>
        {bottomNavItems.map((item) => {
          const active =
            (item.module && activeModule === item.module) ||
            (item.key === "overview" && false);
          return (
            <Pressable
              key={item.key}
              style={[styles.bottomNavItem, active && styles.bottomNavItemActive]}
              onPress={() => openNavItem(item)}
            >
              <Ionicons
                name={item.icon}
                size={21}
                color={active ? "#FFFFFF" : "#E9D5FF"}
              />
              <ThemedText style={[styles.bottomNavText, active && styles.bottomNavTextActive]}>
                {item.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </ThemedView>
  );
}

function HomeContent({
  news,
  newsError,
  activeNewsIndex,
  slideStyle,
  moveNews,
  selectNews,
  openModule,
  openEventDetail,
  calendarEvents,
}: {
  news: NewsItem[];
  newsError: string;
  activeNewsIndex: number;
  slideStyle: object;
  moveNews: (direction: "next" | "prev") => void;
  selectNews: (index: number) => void;
  openModule: (module: ModuleKey) => void;
  openEventDetail: (event: CalendarEvent) => void;
  calendarEvents: CalendarEvent[];
}) {
  const colorScheme = useColorScheme();
  const isDarkTheme = colorScheme === "dark";
  const headline = news[activeNewsIndex] || news[0];
  const indicatorCount = Math.max(news.length, 1);
  const upcomingEvents = calendarEvents
    .filter((event) => event.event_date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => `${a.event_date}T${a.event_time}`.localeCompare(`${b.event_date}T${b.event_time}`))
    .slice(0, 4);
  const eventScrollRef = useRef<ScrollView>(null);
  const [eventIndex, setEventIndex] = useState(0);

  useEffect(() => {
    if (upcomingEvents.length <= 1) return;
    const timer = setInterval(() => {
      setEventIndex((current) => {
        const next = (current + 1) % upcomingEvents.length;
        eventScrollRef.current?.scrollTo({ x: next * 264, animated: true });
        return next;
      });
    }, 3600);
    return () => clearInterval(timer);
  }, [upcomingEvents.length]);

  return (
    <>
      <View style={[styles.hero, isDarkTheme && styles.heroDark]}>
        <View style={styles.heroCopy}>
          <ThemedText style={[styles.heroTitle, isDarkTheme && styles.heroTitleDark]}>
            Welcome to <ThemedText style={[styles.heroHighlight, isDarkTheme && styles.heroHighlightDark]}>IIE</ThemedText>
          </ThemedText>
          <ThemedText style={[styles.heroSubtitle, isDarkTheme && styles.heroSubtitleDark]}>
            Your journey to success starts here.
          </ThemedText>
          <View style={styles.heroLines}>
            <View style={styles.heroLineLong} />
            <View style={styles.heroLineShort} />
          </View>
          <Pressable style={styles.joinButton} onPress={() => openExternalLink(googleFormUrl)}>
            <ThemedText style={styles.joinText}>Join with us</ThemedText>
            <View style={styles.joinArrow}>
              <Ionicons name="arrow-forward" size={22} color="#5523D2" />
            </View>
          </Pressable>
        </View>

        <View style={styles.heroArt}>
          <Image
            source={heroStudentsImage}
            style={styles.heroStudentsImage}
            resizeMode="contain"
          />
        </View>
      </View>

      <View style={styles.flashNews}>
          <View style={styles.flashTopRow}>
            <View style={styles.flashBadge}>
              <Ionicons name="flash" size={16} color="#fff" />
              <ThemedText style={styles.flashBadgeText}>LATEST NEWS</ThemedText>
            </View>
            <ThemedText style={styles.carouselCount}>
              {news.length ? `${activeNewsIndex + 1} / ${news.length}` : "0 / 0"}
            </ThemedText>
          </View>

          <View style={styles.carouselBody}>
            <Pressable
              style={styles.carouselControl}
              onPress={() => moveNews("prev")}
              disabled={news.length <= 1}
            >
              <Ionicons name="chevron-back" size={21} color="#5523D2" />
            </Pressable>

            <Pressable style={styles.carouselSlide} onPress={() => openModule("news")}>
            <Animated.View style={[styles.flashCopy, slideStyle]}>
              <ThemedText style={styles.flashTitle} numberOfLines={1}>
                {headline?.title || (newsError ? "News not loaded" : "No news posted yet")}
              </ThemedText>
              <ThemedText style={styles.flashText} numberOfLines={2}>
                {headline?.message ||
                  newsError ||
                  "Admin posted news will appear here."}
              </ThemedText>
            </Animated.View>
            </Pressable>

            <Pressable
              style={styles.carouselControl}
              onPress={() => moveNews("next")}
              disabled={news.length <= 1}
            >
              <Ionicons name="chevron-forward" size={21} color="#5523D2" />
            </Pressable>
          </View>

          <View style={styles.carouselIndicators}>
            {Array.from({ length: indicatorCount }).map((_, index) => (
              <Pressable
                key={index}
                style={[
                  styles.carouselDot,
                  activeNewsIndex === index && styles.carouselDotActive,
                ]}
                onPress={() => news.length && selectNews(index)}
              />
            ))}
          </View>
        </View>

      <View style={styles.cardGrid}>
        <FeatureCard
          title="News"
          description="Read fresh updates and important highlights."
          icon="newspaper"
          color="#5A25D8"
          softColor="#F4EEFF"
          onPress={() => openModule("news")}
        />
        <FeatureCard
          title="Gallery"
          description="Explore memorable moments and events."
          icon="image"
          color="#1674E8"
          softColor="#EEF6FF"
          onPress={() => openModule("gallery")}
        />
        <FeatureCard
          title="Practice Tests"
          description="Sharpen your skills with our practice tests."
          icon="clipboard"
          color="#55B313"
          softColor="#F3FAEC"
          onPress={() => openModule("practice")}
        />
        <FeatureCard
          title="Calendar"
          description="View important dates and stay updated."
          icon="calendar"
          color="#F47C0B"
          softColor="#FFF3E8"
          onPress={() => openModule("calendar")}
        />
      </View>

      <View style={styles.homeCalendarCard}>
        <View style={styles.homeCalendarHeader}>
          <View>
            <ThemedText style={styles.homeCalendarKicker}>Highlights</ThemedText>
            <ThemedText style={styles.homeCalendarTitle}>Upcoming Events</ThemedText>
          </View>
          <Pressable style={styles.homeCalendarButton} onPress={() => openModule("calendar")}>
            <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
        <ScrollView
          ref={eventScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.eventCarousel}
          snapToInterval={264}
          decelerationRate="fast"
        >
          {upcomingEvents.length ? upcomingEvents.map((event, index) => {
            const active = index === eventIndex;
            return (
            <Pressable key={event.id} style={[styles.eventSlide, active && styles.eventSlideActive]} onPress={() => openEventDetail(event)}>
              <View style={[styles.eventDatePill, active && styles.eventDatePillActive]}>
                <ThemedText style={styles.eventDateDay}>{formatDay(event.event_date)}</ThemedText>
                <ThemedText style={styles.eventDateMonth}>{formatMonth(event.event_date)}</ThemedText>
              </View>
              <View style={styles.eventSlideCopy}>
                <ThemedText style={styles.eventSlideTitle} numberOfLines={1}>{event.event_name}</ThemedText>
                <ThemedText style={styles.eventSlideTime}>{formatEventTime(event.event_time)}</ThemedText>
                <ThemedText style={styles.eventSlideMessage} numberOfLines={2}>{event.message}</ThemedText>
              </View>
            </Pressable>
            );
          }) : (
            <View style={styles.eventSlideEmpty}>
              <ThemedText style={styles.eventSlideTitle}>No events posted yet</ThemedText>
              <ThemedText style={styles.eventSlideMessage}>Admin calendar events will appear here.</ThemedText>
            </View>
          )}
        </ScrollView>
      </View>

      <View style={styles.connectedBanner}>
        <View style={styles.bannerIcon}>
          <Ionicons name="notifications" size={28} color="#5523D2" />
        </View>
        <View style={styles.bannerCopy}>
          <ThemedText style={styles.bannerTitle}>Stay Connected</ThemedText>
          <ThemedText style={styles.bannerText}>
            Follow IIE updates and visit our official website.
          </ThemedText>
          <View style={styles.socialLinks}>
            <Pressable
              style={styles.socialButton}
              onPress={() => openExternalLink(instagramUrl)}
            >
              <Ionicons name="logo-instagram" size={18} color="#5523D2" />
            </Pressable>
            <Pressable
              style={styles.socialButton}
              onPress={() => openExternalLink(websiteUrl)}
            >
              <Ionicons name="globe-outline" size={18} color="#5523D2" />
            </Pressable>
            <Pressable
              style={styles.socialButton}
              onPress={() => openExternalLink(facebookUrl)}
            >
              <Ionicons name="logo-facebook" size={18} color="#5523D2" />
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}

function GalleryModule({
  loading,
  gallery,
}: {
  loading: boolean;
  gallery: GalleryItem[];
}) {
  if (loading) return <LoadingRow />;

  return (
    <ModulePanel title="Gallery" icon="image-outline">
      {gallery.length ? (
        <View style={styles.galleryGrid}>
          {gallery.map((item) => (
            <Pressable
              key={item.id}
              style={styles.galleryTile}
              onPress={() => openMedia(item.image)}
            >
              <Image source={{ uri: item.image }} style={styles.galleryImage} />
              <ThemedText style={styles.tileTitle} numberOfLines={1}>
                {item.title}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyRow text="No gallery photos posted yet." />
      )}
    </ModulePanel>
  );
}

function VlogsModule({ loading, vlogs }: { loading: boolean; vlogs: VlogItem[] }) {
  if (loading) return <LoadingRow />;

  return (
    <ModulePanel title="Vlogs" icon="videocam-outline">
      {vlogs.length ? (
        <View style={styles.vlogList}>
          {vlogs.map((item) => (
            <View key={item.id} style={styles.vlogCard}>
              <View style={styles.vlogVideoWrap}>
                <Video
                  source={{ uri: item.video }}
                  style={styles.vlogVideo}
                  useNativeControls
                  resizeMode={ResizeMode.COVER}
                />
              </View>
              <View style={styles.vlogInfoRow}>
                <View style={styles.vlogPlayBadge}>
                  <Ionicons name="play" size={14} color="#FFFFFF" />
                </View>
                <View style={styles.vlogInfoCopy}>
                  <ThemedText style={styles.vlogTitle} numberOfLines={2}>
                    {item.title}
                  </ThemedText>
                  <ThemedText style={styles.vlogSubtitle}>Tap video to play</ThemedText>
                </View>
                <Pressable style={styles.vlogOpenButton} onPress={() => openMedia(item.video)}>
                  <Ionicons name="open-outline" size={17} color="#5523D2" />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <EmptyRow text="No vlogs posted yet." />
      )}
    </ModulePanel>
  );
}

function NewsModule({
  loading,
  news,
  openNewsDetail,
}: {
  loading: boolean;
  news: NewsItem[];
  openNewsDetail: (item: NewsItem) => void;
}) {
  if (loading) return <LoadingRow />;

  const sortedNews = [...news].sort((a, b) =>
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );

  return (
    <ModulePanel title="News" icon="newspaper-outline">
      {sortedNews.length ? (
        <View style={styles.newsList}>
          <View style={styles.newsSummaryCard}>
            <View style={styles.newsSummaryIcon}>
              <Ionicons name="newspaper" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.newsSummaryCopy}>
              <ThemedText style={styles.newsSummaryTitle}>Latest Updates</ThemedText>
              <ThemedText style={styles.newsSummaryText}>
                {sortedNews.length} announcement{sortedNews.length === 1 ? "" : "s"} from IIE
              </ThemedText>
            </View>
          </View>

          {sortedNews.map((item) => (
            <Pressable
              key={item.id}
              style={styles.newsCard}
              onPress={() => openNewsDetail(item)}
            >
              <View style={styles.newsCardTop}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.newsImage} />
                ) : (
                  <View style={styles.newsImageFallback}>
                    <Ionicons name="megaphone-outline" size={24} color="#5523D2" />
                  </View>
                )}
                <View style={styles.newsTitleWrap}>
                  <ThemedText style={styles.newsDate}>{formatNewsDate(item.created_at)}</ThemedText>
                  <ThemedText style={styles.newsTitle} numberOfLines={2}>{item.title}</ThemedText>
                </View>
              </View>
              <ThemedText style={styles.newsMessage} numberOfLines={4}>{item.message}</ThemedText>
              <View style={styles.newsActionRow}>
                <ThemedText style={styles.newsActionText}>Read full details</ThemedText>
                <Ionicons name="arrow-forward" size={15} color="#5523D2" />
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyRow text="No news posted yet." />
      )}
    </ModulePanel>
  );
}

function NewsDetailModule({ item }: { item: NewsItem }) {
  return (
    <ModulePanel title="News Details" icon="newspaper-outline">
      <View style={styles.newsDetailCard}>
        {item.image ? (
          <Pressable onPress={() => openMedia(item.image)}>
            <Image source={{ uri: item.image }} style={styles.newsDetailImage} />
          </Pressable>
        ) : null}

        <View style={styles.newsDetailDatePill}>
          <Ionicons name="time-outline" size={14} color="#5523D2" />
          <ThemedText style={styles.newsDetailDate}>{formatNewsDate(item.created_at)}</ThemedText>
        </View>

        <ThemedText style={styles.newsDetailTitle}>{item.title}</ThemedText>

        <View style={styles.newsDetailMessageBox}>
          {renderLinkedMessage(item.message, styles.newsDetailMessage, styles.messageLink)}
        </View>

        {item.image ? (
          <Pressable style={styles.newsDetailAttachment} onPress={() => openMedia(item.image)}>
            <Ionicons name="image-outline" size={18} color="#FFFFFF" />
            <ThemedText style={styles.newsDetailAttachmentText}>Open attachment</ThemedText>
          </Pressable>
        ) : null}
      </View>
    </ModulePanel>
  );
}

function CalendarModule({
  loading,
  events,
  openEventDetail,
}: {
  loading: boolean;
  events: CalendarEvent[];
  openEventDetail: (event: CalendarEvent) => void;
}) {
  const today = new Date();
  const firstEventDate = useMemo(() => {
    const todayKey = toDateKey(today);
    const sorted = [...events].sort((a, b) =>
      `${a.event_date}T${a.event_time}`.localeCompare(`${b.event_date}T${b.event_time}`)
    );
    return (sorted.find((event) => event.event_date >= todayKey) || sorted[0])?.event_date || todayKey;
  }, [events]);
  const [mode, setMode] = useState<"month" | "day">("day");
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(firstEventDate);

  useEffect(() => {
    if (!events.length) return;
    setSelectedDate((current) => {
      const currentHasEvents = events.some((event) => event.event_date === current);
      return currentHasEvents ? current : firstEventDate;
    });
    setViewDate(new Date(`${firstEventDate}T00:00:00`));
  }, [events.length, firstEventDate]);

  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const lastDay = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  const days: Array<Date | null> = [];
  for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
  }
  while (days.length % 7 !== 0) days.push(null);
  const dailyDates = Array.from({ length: lastDay.getDate() }, (_, index) =>
    new Date(viewDate.getFullYear(), viewDate.getMonth(), index + 1)
  );

  const eventsByDate = events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    acc[event.event_date] = acc[event.event_date] || [];
    acc[event.event_date].push(event);
    return acc;
  }, {});
  const selectedEvents = [...(eventsByDate[selectedDate] || [])].sort((a, b) =>
    a.event_time.localeCompare(b.event_time)
  );
  const eventDateCount = Object.keys(eventsByDate).length;

  if (loading) return <LoadingRow />;

  const moveMonth = (delta: number) => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const selectDate = (date: Date) => {
    const key = toDateKey(date);
    setSelectedDate(key);
    setMode("day");
  };

  return (
    <ModulePanel title="Calendar" icon="calendar-outline">
      <View style={styles.calendarShell}>
        <View style={styles.calendarTopbar}>
          <View>
            <ThemedText style={styles.calendarMonth}>
              {viewDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </ThemedText>
            <ThemedText style={styles.calendarSub}>
              {events.length} event{events.length === 1 ? "" : "s"} on {eventDateCount} date{eventDateCount === 1 ? "" : "s"}
            </ThemedText>
          </View>
          <View style={styles.calendarActions}>
            <Pressable style={styles.calendarIconButton} onPress={() => moveMonth(-1)}>
              <Ionicons name="chevron-back" size={20} color="#5523D2" />
            </Pressable>
            <Pressable style={styles.calendarIconButton} onPress={() => moveMonth(1)}>
              <Ionicons name="chevron-forward" size={20} color="#5523D2" />
            </Pressable>
          </View>
        </View>

        <View style={styles.segmented}>
          <Pressable
            style={[styles.segment, mode === "month" && styles.segmentActive]}
            onPress={() => setMode("month")}
          >
            <ThemedText style={[styles.segmentText, mode === "month" && styles.segmentTextActive]}>Monthly</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.segment, mode === "day" && styles.segmentActive]}
            onPress={() => setMode("day")}
          >
            <ThemedText style={[styles.segmentText, mode === "day" && styles.segmentTextActive]}>Daily</ThemedText>
          </Pressable>
        </View>

        {mode === "month" ? (
          <>
            <View style={styles.weekRow}>
              {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                <ThemedText key={`${day}-${index}`} style={styles.weekDay}>{day}</ThemedText>
              ))}
            </View>
            <View style={styles.monthGrid}>
              {days.map((date, index) => {
                const key = date ? toDateKey(date) : `blank-${index}`;
                const dayEvents = date ? eventsByDate[key] || [] : [];
                const hasEvents = dayEvents.length > 0;
                const active = key === selectedDate;
                const isToday = key === toDateKey(today);
                return (
                  <Pressable
                    key={key}
                    style={[
                      styles.monthCell,
                      hasEvents && styles.monthCellHasEvent,
                      active && hasEvents && styles.monthCellActive,
                    ]}
                    disabled={!date || !hasEvents}
                    onPress={() => date && hasEvents && selectDate(date)}
                  >
                    {date ? (
                      <>
                        <ThemedText style={[
                          styles.monthCellText,
                          hasEvents && styles.monthCellEventText,
                          isToday && styles.todayCellText,
                          active && hasEvents && styles.monthCellTextActive,
                        ]}>
                          {date.getDate()}
                        </ThemedText>
                        {hasEvents ? (
                          <View style={[styles.monthEventCount, active && styles.monthEventCountActive]}>
                            <ThemedText style={[styles.monthEventCountText, active && styles.monthEventCountTextActive]}>
                              {dayEvents.length}
                            </ThemedText>
                          </View>
                        ) : null}
                      </>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <View style={styles.dayPanel}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayDateRail}>
              {dailyDates.map((date) => {
                const key = toDateKey(date);
                const dayEvents = eventsByDate[key] || [];
                const active = key === selectedDate;
                return (
                  <Pressable
                    key={key}
                    style={[styles.dayDateChip, dayEvents.length > 0 && styles.dayDateChipHasEvent, active && styles.dayDateChipActive]}
                    onPress={() => setSelectedDate(key)}
                  >
                    <ThemedText style={[styles.dayDateWeek, active && styles.dayDateTextActive]}>
                      {date.toLocaleDateString("en-IN", { weekday: "short" })}
                    </ThemedText>
                    <ThemedText style={[
                      styles.dayDateNumber,
                      dayEvents.length > 0 && styles.dayDateNumberHasEvent,
                      active && styles.dayDateTextActive,
                    ]}>{date.getDate()}</ThemedText>
                    {dayEvents[0] ? (
                      <ThemedText style={[styles.dayDateEventName, active && styles.dayDateTextActive]} numberOfLines={1}>
                        {dayEvents[0].event_name}
                      </ThemedText>
                    ) : (
                      <ThemedText style={styles.dayDateEmptyName}>No event</ThemedText>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
            <ThemedText style={styles.dayPanelTitle}>{formatFullDate(selectedDate)}</ThemedText>
            {selectedEvents.length ? selectedEvents.map((event) => (
              <Pressable key={event.id} style={styles.dayEventCard} onPress={() => openEventDetail(event)}>
                <View style={styles.dayEventTime}>
                  <ThemedText style={styles.dayEventTimeText}>{formatEventTime(event.event_time)}</ThemedText>
                </View>
                <View style={styles.dayEventCopy}>
                  <ThemedText style={styles.dayEventTitle} numberOfLines={1}>{event.event_name}</ThemedText>
                  <ThemedText style={styles.dayEventMessage} numberOfLines={2}>{event.message}</ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
              </Pressable>
            )) : (
              <EmptyRow text="No events for this day." />
            )}
          </View>
        )}
      </View>
    </ModulePanel>
  );
}

function EventDetailModule({ event }: { event: CalendarEvent; onBack: () => void }) {
  return (
    <ModulePanel title="Event Details" icon="calendar-clear-outline">
      <View style={styles.eventPageCard}>
        <View style={styles.eventPageDateBox}>
          <ThemedText style={styles.eventPageDay}>{formatDay(event.event_date)}</ThemedText>
          <ThemedText style={styles.eventPageMonth}>{formatMonth(event.event_date)}</ThemedText>
        </View>

        <ThemedText style={styles.eventPageTitle}>{event.event_name}</ThemedText>

        <View style={styles.eventInfoGrid}>
          <View style={styles.eventInfoItem}>
            <Ionicons name="calendar-outline" size={18} color="#1674E8" />
            <View style={styles.eventInfoCopy}>
              <ThemedText style={styles.eventInfoLabel}>Date</ThemedText>
              <ThemedText style={styles.eventInfoValue}>{formatFullDate(event.event_date)}</ThemedText>
            </View>
          </View>
          <View style={styles.eventInfoItem}>
            <Ionicons name="time-outline" size={18} color="#1674E8" />
            <View style={styles.eventInfoCopy}>
              <ThemedText style={styles.eventInfoLabel}>Time</ThemedText>
              <ThemedText style={styles.eventInfoValue}>{formatEventTime(event.event_time)}</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.eventMessageBox}>
          <ThemedText style={styles.eventInfoLabel}>Message</ThemedText>
          {renderLinkedMessage(event.message, styles.eventPageMessage, styles.messageLink)}
        </View>
      </View>
    </ModulePanel>
  );
}

function ReferralModule() {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const submit = async () => {
    const trimmedName = name.trim();
    const digits = mobile.replace(/\D/g, "");

    setMessage("");

    if (trimmedName.length < 2) {
      setMessageType("error");
      setMessage("Please enter a valid name.");
      return;
    }

    if (digits.length < 10 || digits.length > 15) {
      setMessageType("error");
      setMessage("Please enter a valid mobile number.");
      return;
    }

    setSaving(true);
    const result = await submitReferral({ name: trimmedName, mobile: digits });
    setSaving(false);

    if (result.success) {
      setName("");
      setMobile("");
      setMessageType("success");
      setMessage("Referral submitted successfully.");
    } else {
      setMessageType("error");
      setMessage(result.error || "Could not submit referral.");
    }
  };

  return (
    <ModulePanel title="Referral" icon="person-add-outline">
      <View style={styles.referralForm}>
        <View style={styles.inputWrap}>
          <ThemedText style={styles.inputLabel}>Name</ThemedText>
          <TextInput
            style={styles.referralInput}
            value={name}
            onChangeText={setName}
            placeholder="Enter name"
            placeholderTextColor="#98A2B3"
          />
        </View>

        <View style={styles.inputWrap}>
          <ThemedText style={styles.inputLabel}>Mobile Number</ThemedText>
          <TextInput
            style={styles.referralInput}
            value={mobile}
            onChangeText={setMobile}
            placeholder="Enter mobile number"
            placeholderTextColor="#98A2B3"
            keyboardType="phone-pad"
            maxLength={15}
          />
        </View>

        {message ? (
          <ThemedText
            style={[
              styles.formMessage,
              messageType === "error" ? styles.formMessageError : styles.formMessageSuccess,
            ]}
          >
            {message}
          </ThemedText>
        ) : null}

        <Pressable
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={submit}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : null}
          <ThemedText style={styles.submitButtonText}>
            {saving ? "Submitting..." : "Submit"}
          </ThemedText>
        </Pressable>
      </View>
    </ModulePanel>
  );
}

type PracticeQuizItem = {
  id: number;
  title: string;
  description?: string;
  total_questions: number;
  duration_minutes: number;
  passing_marks: number;
  status?: string;
  category?: string;
  questions?: Array<{
    id: number;
    question_text: string;
    options: Array<{ key: string; text: string }>;
  }>;
};

function PracticeModule() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<PracticeQuizItem[]>([]);
  const [error, setError] = useState("");

  const loadPracticeQuizzes = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/quiz/practice/");
      setQuizzes(response.data?.results || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Practice quizzes not loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPracticeQuizzes();
  }, []);

  return (
    <ModulePanel title="Practice Tests" icon="clipboard-outline">
      {loading ? (
        <ActivityIndicator size="large" color="#5523D2" />
      ) : error ? (
        <EmptyRow text={error} />
      ) : quizzes.length === 0 ? (
        <EmptyRow text="No practice quizzes published yet." />
      ) : (
        <View style={styles.practiceList}>
          <View style={styles.practiceHero}>
            <View style={styles.practiceHeroIcon}>
              <Ionicons name="sparkles-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.practiceHeroCopy}>
              <ThemedText style={styles.practiceHeroTitle}>Practice Test Hub</ThemedText>
              <ThemedText style={styles.practiceHeroText}>
                Choose a test and get instant answer feedback after each option.
              </ThemedText>
            </View>
            <View style={styles.practiceHeroCount}>
              <ThemedText style={styles.practiceHeroCountValue}>{quizzes.length}</ThemedText>
              <ThemedText style={styles.practiceHeroCountLabel}>Tests</ThemedText>
            </View>
          </View>

          {quizzes.map((quiz) => {
            const available = (quiz.status || "available") === "available";
            return (
              <View key={quiz.id} style={styles.practiceCard}>
                <View style={styles.practiceHeader}>
                  <View style={styles.practiceIcon}>
                    <Ionicons name="clipboard-outline" size={23} color="#5523D2" />
                  </View>
                  <View style={styles.practiceTitleWrap}>
                    <ThemedText style={styles.practiceTitle}>{quiz.title}</ThemedText>
                    <View style={styles.practiceSubRow}>
                      {!!quiz.category && (
                        <ThemedText style={styles.practiceCategory}>{quiz.category}</ThemedText>
                      )}
                      <ThemedText style={[styles.practiceStatus, available ? styles.practiceStatusReady : styles.practiceStatusLocked]}>
                        {available ? "Ready" : (quiz.status || "closed")}
                      </ThemedText>
                    </View>
                  </View>
                </View>
                {!!quiz.description && (
                  <ThemedText style={styles.practiceDescription}>{quiz.description}</ThemedText>
                )}
                <View style={styles.practiceMetaGrid}>
                  <View style={styles.practiceMeta}>
                    <Ionicons name="help-circle-outline" size={15} color="#5523D2" />
                    <ThemedText style={styles.practiceMetaText}>{quiz.total_questions} Questions</ThemedText>
                  </View>
                  <View style={styles.practiceMeta}>
                    <Ionicons name="time-outline" size={15} color="#5523D2" />
                    <ThemedText style={styles.practiceMetaText}>{quiz.duration_minutes || 0} min</ThemedText>
                  </View>
                  <View style={styles.practiceMeta}>
                    <Ionicons name="ribbon-outline" size={15} color="#15803D" />
                    <ThemedText style={[styles.practiceMetaText, styles.practicePassText]}>Pass {quiz.passing_marks}%</ThemedText>
                  </View>
                </View>
                <Pressable
                  style={[
                    styles.practiceStartButton,
                    !available && styles.practiceStartButtonDisabled,
                  ]}
                  disabled={!available}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/app",
                      params: { quizId: String(quiz.id), mode: "practice" },
                    })
                  }
                >
                  <ThemedText style={styles.practiceStartText}>
                    {available ? "Start Practice Test" : "Not Available"}
                  </ThemedText>
                  <View style={styles.practiceStartIcon}>
                    <Ionicons name={available ? "arrow-forward" : "lock-closed-outline"} size={18} color="#5523D2" />
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </ModulePanel>
  );
}

function PlaceholderModule({ module }: { module: ModuleKey }) {
  const titles: Record<ModuleKey, string> = {
    home: "Home",
    gallery: "Gallery",
    vlogs: "Vlogs",
    practice: "Practice Test",
    calendar: "Calendar",
    eventDetail: "Event Details",
    announcement: "Announcement",
    news: "News",
    referral: "Referral",
    about: "About IIE",
    newsDetail: "News Details",
  };

  return (
    <ModulePanel title={titles[module]} icon="sparkles-outline">
      <View style={styles.placeholderBox}>
        <ThemedText style={styles.placeholderText}>
          {titles[module]} updates will appear here.
        </ThemedText>
      </View>
    </ModulePanel>
  );
}

function FeatureCard({
  title,
  description,
  icon,
  color,
  softColor,
  onPress,
}: {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  softColor: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={[styles.featureCard, { backgroundColor: softColor }]} onPress={onPress}>
      <View style={[styles.featureIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={28} color="#fff" />
      </View>
      <ThemedText style={[styles.featureTitle, { color }]}>{title}</ThemedText>
      <View style={[styles.featureLine, { backgroundColor: color }]} />
      <ThemedText style={styles.featureDescription}>{description}</ThemedText>
      <View style={[styles.featureArrow, { backgroundColor: color }]}>
        <Ionicons name="arrow-forward" size={19} color="#fff" />
      </View>
    </Pressable>
  );
}

function ModulePanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.modulePanel}>
      <View style={styles.moduleHeader}>
        <View style={styles.moduleIcon}>
          <Ionicons name={icon} size={24} color="#5523D2" />
        </View>
        <ThemedText style={styles.moduleTitle}>{title}</ThemedText>
      </View>
      {children}
    </View>
  );
}

function LoadingRow() {
  return (
    <View style={styles.statusRow}>
      <ActivityIndicator color="#5523D2" />
      <ThemedText style={styles.statusText}>Loading updates...</ThemedText>
    </View>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <View style={styles.statusRow}>
      <ThemedText style={styles.statusText}>{text}</ThemedText>
    </View>
  );
}

function openMedia(url?: string | null) {
  if (url) Linking.openURL(url);
}

function toDateKey(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatDay(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit" });
}

function formatMonth(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { month: "short" });
}

function formatFullDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatEventTime(time: string) {
  if (!time) return "";
  return new Date(`2026-01-01T${time}`).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNewsDate(date?: string) {
  if (!date) return "IIE Update";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "IIE Update";
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function renderLinkedMessage(message: string, textStyle: any, linkStyle: any) {
  const urlPattern = /((?:https?:\/\/|www\.)[^\s]+)/g;
  const parts = message.split(urlPattern);

  return (
    <ThemedText style={textStyle}>
      {parts.map((part, index) => {
        if (!part.startsWith("http://") && !part.startsWith("https://") && !part.startsWith("www.")) {
          return part;
        }

        const tail = part.match(/[.,)\]]+$/)?.[0] || "";
        const cleanUrl = tail ? part.slice(0, -tail.length) : part;
        const openUrl = cleanUrl.startsWith("www.") ? `https://${cleanUrl}` : cleanUrl;
        return (
          <ThemedText
            key={`${cleanUrl}-${index}`}
            style={linkStyle}
            onPress={() => openExternalLink(openUrl)}
          >
            {cleanUrl}
            {tail}
          </ThemedText>
        );
      })}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 112,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 18,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  brandRow: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  logoMark: {
    width: "100%",
    maxWidth: 190,
    height: 54,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    overflow: "hidden",
    paddingHorizontal: 8,
  },
  logoImage: {
    width: "100%",
    height: 50,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#5523D2",
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  notificationDot: {
    position: "absolute",
    right: 10,
    top: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#F43F6C",
  },
  drawerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.36)",
    zIndex: 8,
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 286,
    backgroundColor: "#5523D2",
    paddingTop: 48,
    paddingHorizontal: 18,
    paddingBottom: 18,
    zIndex: 9,
    elevation: 12,
    shadowColor: "#5523D2",
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 6, height: 0 },
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  logoMarkSmall: {
    width: 74,
    height: 46,
    borderRadius: 8,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  logoImageSmall: {
    width: 68,
    height: 38,
  },
  drawerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  drawerSubtitle: {
    color: "#EDE9FE",
    fontSize: 12,
    fontWeight: "700",
  },
  drawerList: {
    paddingBottom: 12,
  },
  drawerScroll: {
    flex: 1,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  drawerItemActive: {
    backgroundColor: "#FFFFFF",
  },
  drawerItemText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    flex: 1,
  },
  drawerItemTextActive: {
    color: "#5523D2",
  },
  logoutItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.22)",
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 8,
  },
  logoutText: {
    color: "#FEE2E2",
    fontSize: 15,
    fontWeight: "800",
  },
  commonBottomNav: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 12,
    minHeight: 68,
    borderRadius: 20,
    backgroundColor: "#5523D2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: "#5523D2",
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  bottomNavItem: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  bottomNavItemActive: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  bottomNavText: {
    color: "#E9D5FF",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
  },
  bottomNavTextActive: {
    color: "#FFFFFF",
  },
  hero: {
    minHeight: 258,
    position: "relative",
    marginBottom: 16,
    backgroundColor: "#FBF9FF",
    borderRadius: 16,
    padding: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EFE7FF",
  },
  heroDark: {
    backgroundColor: "#1F1335",
    borderColor: "#3B2461",
  },
  heroCopy: {
    width: "62%",
    zIndex: 2,
  },
  heroTitle: {
    color: "#071846",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
  },
  heroTitleDark: {
    color: "#FFFFFF",
  },
  heroHighlight: {
    color: "#5523D2",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
  },
  heroHighlightDark: {
    color: "#C4B5FD",
  },
  heroSubtitle: {
    color: "#667085",
    fontSize: 16,
    lineHeight: 25,
    fontWeight: "700",
    marginTop: 14,
  },
  heroSubtitleDark: {
    color: "#DDD6FE",
  },
  heroLines: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 16,
  },
  heroLineLong: {
    width: 52,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#5523D2",
  },
  heroLineShort: {
    width: 24,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#5523D2",
  },
  joinButton: {
    width: 166,
    backgroundColor: "#5523D2",
    borderRadius: 14,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  joinText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  joinArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  heroArt: {
    position: "absolute",
    right: 0,
    bottom: 48,
    width: 148,
    height: 104,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  heroStudentsImage: {
    width: "100%",
    height: "100%",
  },
  aiGlow: {
    position: "absolute",
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: "#EEE7FF",
    borderWidth: 1,
    borderColor: "#D9CCFF",
  },
  aiAntenna: {
    position: "absolute",
    top: 14,
    width: 6,
    height: 18,
    borderRadius: 4,
    backgroundColor: "#7C3AED",
  },
  aiHead: {
    position: "absolute",
    top: 28,
    width: 88,
    height: 68,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#C8B9FF",
    shadowColor: "#5523D2",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
  },
  aiFace: {
    width: 58,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1F1335",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  aiEye: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#A78BFA",
  },
  aiSmile: {
    width: 24,
    height: 5,
    borderRadius: 5,
    backgroundColor: "#D9CCFF",
    marginTop: 8,
  },
  aiBody: {
    position: "absolute",
    top: 92,
    width: 72,
    height: 58,
    borderRadius: 22,
    backgroundColor: "#5523D2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  aiChestLine: {
    width: 30,
    height: 6,
    borderRadius: 6,
    backgroundColor: "#C4B5FD",
    marginBottom: 8,
  },
  aiChestDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
  },
  aiArmLeft: {
    position: "absolute",
    left: 20,
    top: 104,
    width: 22,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#7C3AED",
    transform: [{ rotate: "12deg" }],
  },
  aiArmRight: {
    position: "absolute",
    right: 20,
    top: 104,
    width: 22,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#7C3AED",
    transform: [{ rotate: "-12deg" }],
  },
  aiBase: {
    position: "absolute",
    bottom: 10,
    width: 76,
    height: 14,
    borderRadius: 14,
    backgroundColor: "#111827",
  },
  aiSparkOne: {
    position: "absolute",
    top: 30,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 3,
    borderColor: "#FBF9FF",
  },
  aiSparkTwo: {
    position: "absolute",
    top: 62,
    left: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F97316",
    borderWidth: 2,
    borderColor: "#FBF9FF",
  },
  flashNews: {
    backgroundColor: "#5523D2",
    borderRadius: 8,
    padding: 13,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#7652F0",
  },
  flashTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  flashBadge: {
    backgroundColor: "#F97316",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
  },
  flashBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  carouselCount: {
    color: "#FDE68A",
    fontSize: 12,
    fontWeight: "900",
  },
  carouselBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  carouselControl: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  carouselSlide: {
    flex: 1,
    minHeight: 56,
    justifyContent: "center",
  },
  flashCopy: {
    flex: 1,
  },
  flashTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  flashText: {
    color: "#EEE7FF",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 3,
  },
  carouselIndicators: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 12,
  },
  carouselDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.42)",
  },
  carouselDotActive: {
    width: 22,
    backgroundColor: "#FFFFFF",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  homeCalendarCard: {
    backgroundColor: "#071846",
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  homeCalendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  homeCalendarKicker: {
    color: "#9CC9FF",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  homeCalendarTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  homeCalendarButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#1674E8",
    alignItems: "center",
    justifyContent: "center",
  },
  eventCarousel: {
    gap: 10,
    paddingRight: 4,
  },
  eventSlide: {
    width: 254,
    minHeight: 112,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    padding: 12,
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    transform: [{ scale: 0.97 }],
  },
  eventSlideActive: {
    borderColor: "#22C55E",
    shadowColor: "#16A34A",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    transform: [{ scale: 1 }],
  },
  eventSlideEmpty: {
    width: 254,
    minHeight: 112,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    padding: 14,
    justifyContent: "center",
  },
  eventDatePill: {
    width: 58,
    borderRadius: 8,
    backgroundColor: "#EAF3FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#C7DBFF",
  },
  eventDatePillActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#22C55E",
  },
  eventDateDay: {
    color: "#1674E8",
    fontSize: 23,
    fontWeight: "900",
  },
  eventDateMonth: {
    color: "#071846",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  eventSlideCopy: {
    flex: 1,
  },
  eventSlideTitle: {
    color: "#071846",
    fontSize: 15,
    fontWeight: "900",
  },
  eventSlideTime: {
    color: "#16A34A",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 3,
  },
  eventSlideMessage: {
    color: "#475467",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 5,
  },
  eventDetailCard: {
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    padding: 13,
  },
  eventDetailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  eventDetailIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#EAF3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  eventDetailTitleWrap: {
    flex: 1,
  },
  eventDetailTitle: {
    color: "#071846",
    fontSize: 16,
    fontWeight: "900",
  },
  eventDetailMeta: {
    color: "#1674E8",
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "900",
    marginTop: 3,
  },
  eventDetailClose: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#F2F4F7",
    alignItems: "center",
    justifyContent: "center",
  },
  eventDetailMessage: {
    color: "#475467",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
    marginTop: 10,
  },
  featureCard: {
    width: "48%",
    minHeight: 176,
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
    elevation: 4,
    shadowColor: "#98A2B3",
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  featureLine: {
    width: 38,
    height: 4,
    borderRadius: 2,
    marginTop: 9,
    marginBottom: 13,
  },
  featureDescription: {
    color: "#111827",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    paddingRight: 8,
  },
  featureArrow: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  connectedBanner: {
    backgroundColor: "#5523D2",
    borderRadius: 8,
    minHeight: 132,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bannerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerCopy: {
    flex: 1,
  },
  bannerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  bannerText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
  },
  socialLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  socialButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  socialButtonText: {
    color: "#5523D2",
    fontSize: 12,
    fontWeight: "900",
  },
  modulePanel: {
    backgroundColor: "#FFFFFF",
  },
  moduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  moduleIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  moduleTitle: {
    color: "#071846",
    fontSize: 26,
    fontWeight: "900",
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  galleryTile: {
    width: "48%",
    borderRadius: 8,
    backgroundColor: "#EEF6FF",
    overflow: "hidden",
    marginBottom: 14,
  },
  galleryImage: {
    width: "100%",
    height: 126,
    backgroundColor: "#DCEBFF",
  },
  tileTitle: {
    color: "#071846",
    fontSize: 13,
    fontWeight: "800",
    padding: 10,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F4EEFF",
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  listIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#5523D2",
    alignItems: "center",
    justifyContent: "center",
  },
  listTextWrap: {
    flex: 1,
  },
  listTitle: {
    color: "#071846",
    fontSize: 15,
    fontWeight: "900",
  },
  listSubtitle: {
    color: "#667085",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  vlogList: {
    gap: 14,
  },
  vlogCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    shadowColor: "#5523D2",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  vlogVideoWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#111827",
  },
  vlogVideo: {
    width: "100%",
    height: "100%",
  },
  vlogInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 13,
    backgroundColor: "#FBF9FF",
  },
  vlogPlayBadge: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "#5523D2",
    alignItems: "center",
    justifyContent: "center",
  },
  vlogInfoCopy: {
    flex: 1,
    minWidth: 0,
  },
  vlogTitle: {
    color: "#111827",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
  },
  vlogSubtitle: {
    color: "#7C3AED",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  vlogOpenButton: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  newsList: {
    gap: 12,
  },
  newsSummaryCard: {
    minHeight: 82,
    borderRadius: 16,
    backgroundColor: "#5523D2",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#5523D2",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  newsSummaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  newsSummaryCopy: {
    flex: 1,
  },
  newsSummaryTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  newsSummaryText: {
    color: "#EDE9FE",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  newsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    shadowColor: "#5523D2",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  newsCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  newsImage: {
    width: 70,
    height: 70,
    borderRadius: 14,
    backgroundColor: "#EDE9FE",
  },
  newsImageFallback: {
    width: 70,
    height: 70,
    borderRadius: 14,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  newsTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  newsDate: {
    color: "#7C3AED",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  newsTitle: {
    color: "#111827",
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
    marginTop: 3,
  },
  newsMessage: {
    color: "#475467",
    fontSize: 13,
    lineHeight: 21,
    fontWeight: "700",
    marginTop: 10,
  },
  newsActionRow: {
    alignSelf: "flex-start",
    minHeight: 30,
    borderRadius: 15,
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 12,
  },
  newsActionText: {
    color: "#5523D2",
    fontSize: 11,
    fontWeight: "900",
  },
  newsDetailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    shadowColor: "#5523D2",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  newsDetailImage: {
    width: "100%",
    height: 190,
    borderRadius: 16,
    backgroundColor: "#EDE9FE",
    marginBottom: 14,
  },
  newsDetailDatePill: {
    alignSelf: "flex-start",
    minHeight: 32,
    borderRadius: 16,
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  newsDetailDate: {
    color: "#5523D2",
    fontSize: 12,
    fontWeight: "900",
  },
  newsDetailTitle: {
    color: "#111827",
    fontSize: 23,
    lineHeight: 30,
    fontWeight: "900",
  },
  newsDetailMessageBox: {
    borderRadius: 16,
    backgroundColor: "#FBF9FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    padding: 14,
    marginTop: 14,
  },
  newsDetailMessage: {
    color: "#374151",
    fontSize: 14,
    lineHeight: 23,
    fontWeight: "700",
  },
  messageLink: {
    color: "#5523D2",
    fontSize: 14,
    lineHeight: 23,
    fontWeight: "900",
    textDecorationLine: "underline",
  },
  newsDetailAttachment: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#5523D2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },
  newsDetailAttachmentText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  calendarShell: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    shadowColor: "#5523D2",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  calendarTopbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  calendarMonth: {
    color: "#111827",
    fontSize: 21,
    fontWeight: "900",
  },
  calendarSub: {
    color: "#7C3AED",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  calendarActions: {
    flexDirection: "row",
    gap: 8,
  },
  calendarIconButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: "#F5F3FF",
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: {
    backgroundColor: "#5523D2",
  },
  segmentText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "900",
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  weekDay: {
    width: `${100 / 7}%`,
    textAlign: "center",
    color: "#7C3AED",
    fontSize: 12,
    fontWeight: "900",
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  monthCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  monthCellHasEvent: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#22C55E",
  },
  monthCellActive: {
    backgroundColor: "#16A34A",
  },
  monthCellText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },
  monthCellEventText: {
    color: "#15803D",
  },
  monthCellTextActive: {
    color: "#FFFFFF",
  },
  monthEventCount: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3,
    paddingHorizontal: 4,
  },
  monthEventCountActive: {
    backgroundColor: "#FFFFFF",
  },
  monthEventCountText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 12,
  },
  monthEventCountTextActive: {
    color: "#15803D",
  },
  todayCellText: {
    color: "#DC2626",
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#16A34A",
    marginTop: 4,
  },
  dayPanel: {
    gap: 13,
  },
  dayDateRail: {
    gap: 9,
    paddingRight: 4,
    paddingBottom: 2,
  },
  dayDateChip: {
    width: 82,
    minHeight: 88,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    padding: 10,
    justifyContent: "center",
  },
  dayDateChipHasEvent: {
    borderColor: "#22C55E",
    backgroundColor: "#DCFCE7",
  },
  dayDateChipActive: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  dayDateWeek: {
    color: "#667085",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  dayDateNumber: {
    color: "#071846",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 2,
  },
  dayDateNumberHasEvent: {
    color: "#15803D",
  },
  dayDateEventName: {
    color: "#15803D",
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "900",
    marginTop: 4,
  },
  dayDateEmptyName: {
    color: "#98A2B3",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  dayDateTextActive: {
    color: "#FFFFFF",
  },
  dayPanelTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 2,
  },
  dayEventCard: {
    backgroundColor: "#FBF9FF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dayEventTime: {
    width: 72,
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  dayEventTimeText: {
    color: "#5523D2",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  dayEventCopy: {
    flex: 1,
  },
  dayEventTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
  },
  dayEventMessage: {
    color: "#475467",
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 4,
  },
  eventPageCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  eventPageBack: {
    alignSelf: "flex-start",
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 16,
  },
  eventPageBackText: {
    color: "#5523D2",
    fontSize: 12,
    fontWeight: "900",
  },
  eventPageDateBox: {
    width: 82,
    height: 82,
    borderRadius: 8,
    backgroundColor: "#EAF3FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  eventPageDay: {
    color: "#1674E8",
    fontSize: 32,
    fontWeight: "900",
  },
  eventPageMonth: {
    color: "#071846",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  eventPageTitle: {
    color: "#071846",
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
    marginBottom: 14,
  },
  eventInfoGrid: {
    gap: 10,
    marginBottom: 14,
  },
  eventInfoItem: {
    minHeight: 58,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  eventInfoCopy: {
    flex: 1,
  },
  eventInfoLabel: {
    color: "#667085",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  eventInfoValue: {
    color: "#071846",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 3,
  },
  eventMessageBox: {
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
  },
  eventPageMessage: {
    color: "#475467",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700",
    marginTop: 6,
  },
  referralForm: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    gap: 14,
  },
  inputWrap: {
    gap: 7,
  },
  inputLabel: {
    color: "#071846",
    fontSize: 13,
    fontWeight: "900",
  },
  referralInput: {
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    color: "#101828",
    fontSize: 15,
    fontWeight: "700",
  },
  formMessage: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
  },
  formMessageSuccess: {
    color: "#15803D",
  },
  formMessageError: {
    color: "#DC2626",
  },
  submitButton: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: "#5523D2",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  submitButtonDisabled: {
    opacity: 0.72,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  practiceList: {
    gap: 14,
  },
  practiceHero: {
    minHeight: 104,
    borderRadius: 18,
    backgroundColor: "#5523D2",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#5523D2",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  practiceHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  practiceHeroCopy: {
    flex: 1,
  },
  practiceHeroTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  practiceHeroText: {
    color: "#EDE9FE",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 4,
  },
  practiceHeroCount: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  practiceHeroCountValue: {
    color: "#5523D2",
    fontSize: 21,
    fontWeight: "900",
  },
  practiceHeroCountLabel: {
    color: "#667085",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 1,
  },
  practiceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    padding: 16,
    gap: 12,
    shadowColor: "#5523D2",
    shadowOpacity: 0.09,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  practiceHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  practiceIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  practiceTitleWrap: {
    flex: 1,
  },
  practiceTitle: {
    color: "#071846",
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900",
  },
  practiceSubRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
    marginTop: 7,
  },
  practiceCategory: {
    color: "#5523D2",
    backgroundColor: "#F5F3FF",
    borderRadius: 12,
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "900",
  },
  practiceStatus: {
    borderRadius: 12,
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  practiceStatusReady: {
    color: "#15803D",
    backgroundColor: "#ECFDF3",
  },
  practiceStatusLocked: {
    color: "#667085",
    backgroundColor: "#F2F4F7",
  },
  practiceDescription: {
    color: "#475467",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  practiceMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  practiceMeta: {
    backgroundColor: "#FBF9FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  practiceMetaText: {
    color: "#4C1D95",
    fontSize: 12,
    fontWeight: "900",
  },
  practicePassText: {
    color: "#15803D",
  },
  practiceScore: {
    color: "#5523D2",
    fontSize: 12,
    fontWeight: "900",
  },
  practiceQuestionList: {
    gap: 10,
    marginTop: 4,
  },
  practiceQuestionCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    gap: 9,
  },
  practiceQuestionText: {
    color: "#071846",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "900",
  },
  practiceOptionList: {
    gap: 7,
  },
  practiceOptionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 9,
  },
  practiceOptionKey: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#DCFCE7",
    color: "#15803D",
    fontSize: 11,
    lineHeight: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  practiceOptionText: {
    flex: 1,
    color: "#344054",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  practiceStartButton: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: "#5523D2",
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 9,
  },
  practiceStartButtonDisabled: {
    backgroundColor: "#98A2B3",
  },
  practiceStartText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  practiceStartIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderBox: {
    minHeight: 160,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  placeholderText: {
    color: "#667085",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  statusRow: {
    minHeight: 90,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  statusText: {
    color: "#667085",
    fontSize: 14,
    fontWeight: "700",
  },
});
