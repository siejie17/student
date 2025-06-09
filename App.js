import { useEffect, useRef, useState } from 'react';
import { StatusBar, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { onAuthStateChanged } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as Device from 'expo-device';

import SignInScreen from './screens/SignInScreen.jsx';
import SignUpScreen from './screens/SignUpScreen.jsx';
import PasswordReset from './screens/PasswordResetScreen.jsx';
import OnboardingScreen from './screens/OnboardingScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import EventListingScreen from './screens/EventListingScreen.jsx';
import AgendaScreen from './screens/AgendaScreen.jsx';
import LeaderboardScreen from './screens/LeaderboardScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';
import MerchandiseListingScreen from './screens/MerchandiseListingScreen.jsx';
import MerchandiseDetailsScreen from './screens/MerchandiseDetailsScreen.jsx';
import EventDetailsScreen from './screens/EventDetailsScreen.jsx';
import RedemptionListingScreen from './screens/RedemptionListingScreen.jsx';
import RegisteredEventScreen from './screens/RegisteredEventScreen.jsx';
import EventQuestsScreen from './screens/EventQuestsScreen.jsx';
import BadgeScreen from './screens/BadgeScreen.jsx';
import NetworkScreen from './screens/NetworkScreen.jsx';
import FeedbackFormScreen from './screens/FeedbackFormScreen.jsx';
import MessagingScreen from './screens/MessagingScreen.jsx';
import NotificationListScreen from './screens/NotificationListScreen.jsx';
import LoadingIndicator from './components/General/LoadingIndicator.jsx';

import { getItem } from './utils/asyncStorage.js';
import { auth, db } from './utils/firebaseConfig';
import { navigationRef, navigate } from './utils/navigationRef';

// Show notifications when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // show banner on screen
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const MainStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();
const EventsStack = createNativeStackNavigator();
const CalendarStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

const Tab = createBottomTabNavigator();

const TopTab = createMaterialTopTabNavigator();

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(null);
  const [studentID, setStudentID] = useState(null);
  const [student, setStudent] = useState({});
  const [loading, setLoading] = useState(true);

  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    const checkIfAlreadyOnboarded = async () => {
      let onboarded = await getItem('onboarded');
      setShowOnboarding(onboarded != 1);
    };

    checkIfAlreadyOnboarded();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      onAuthStateChanged(auth, async (user) => {
        if (user && user.emailVerified) {
          const storedStudentID = await getItem('studentID');

          if (storedStudentID) {
            setStudent(user);
            setStudentID(storedStudentID);

            // Register and store push token
            if (Device.isDevice) {
              const { status: existingStatus } = await Notifications.getPermissionsAsync();
              let finalStatus = existingStatus;

              if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
              }

              if (finalStatus === 'granted') {
                const tokenData = await Notifications.getExpoPushTokenAsync();
                const expoPushToken = tokenData.data;

                const userRef = doc(db, 'user', storedStudentID);
                const userSnap = await getDoc(userRef);

                const currentToken = userSnap.exists() ? userSnap.data().expoPushToken : null;

                if (expoPushToken !== currentToken) {
                  await setDoc(userRef, { expoPushToken }, { merge: true });
                }
              }
            }
          } else {
            setStudent({});
            setStudentID(null);
          }
        } else {
          setStudent({});
          setStudentID(null);
        }

        setLoading(false);
      });
    };

    checkAuth();
  }, []);

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log("📬 Notification received in foreground:", notification);
      // Optional: trigger app-level UI feedback here
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("👆 User tapped the notification:", response);
      // Optional: navigate somewhere based on notification data
      navigationRef.current?.navigate('NotificationList');
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  if (loading) {
    return (
      <LoadingIndicator />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        backgroundColor="white"
        barStyle="dark-content"
        translucent={false}
        hidden={false}
      />
      <NavigationContainer ref={navigationRef}>
        {studentID ? <AppStack /> : <AuthStackScreen showOnboarding={showOnboarding} />}
      </NavigationContainer>
    </SafeAreaView>
  );
}

const AppStack = () => (
  <MainStack.Navigator>
    <MainStack.Screen name="AppTabs" component={AppTabs} options={{ headerShown: false }} />
    <MainStack.Screen name="MerchandiseTopTabs" component={MerchandiseTopTabs} options={{ headerShown: false }} />
    <MainStack.Screen name="EventDetails" component={EventDetailsScreen} options={{ headerShown: false }} />
    <MainStack.Screen name="RegisteredEventsTopTabs" component={RegisteredEventTopTabs} options={{ headerShown: false }} />
    <MainStack.Screen name="FeedbackForm" component={FeedbackFormScreen} options={{ headerShown: false }} />
    <MainStack.Screen name="BadgeDetails" component={BadgeScreen} options={{ headerShown: false }} />
    <MainStack.Screen name="NetworkList" component={NetworkScreen} options={{ headerShown: false }} />
    <MainStack.Screen name="MerchandiseDetails" component={MerchandiseDetailsScreen} options={{ headerShown: false }} />
    <MainStack.Screen name="Messaging" component={MessagingScreen} options={{ headerShown: false }} />
    <MainStack.Screen name="NotificationList" component={NotificationListScreen} options={{ headerShown: false }} />
  </MainStack.Navigator>
)

const AuthStackScreen = ({ showOnboarding }) => (
  <AuthStack.Navigator initialRouteName={showOnboarding ? 'Onboarding' : 'SignIn'}>
    <AuthStack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
    <AuthStack.Screen name="SignIn" component={SignInScreen} options={{ headerShown: false }} />
    <AuthStack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
    <AuthStack.Screen name="PasswordReset" component={PasswordReset} options={{ headerShown: false }} />
  </AuthStack.Navigator>
);

const HomeStackScreen = () => (
  <HomeStack.Navigator>
    <HomeStack.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
    <HomeStack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: "Leaderboard" }} />
  </HomeStack.Navigator>
);

const CustomHeader = ({ title, onBack }) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
};

const CustomTabBar = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel || options.title || route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={index}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={[
              styles.tabItem,
              isFocused ? styles.tabItemActive : null
            ]}
          >
            <Text style={[
              styles.tabText,
              isFocused ? styles.tabTextActive : null
            ]}>
              {label}
            </Text>
            {isFocused && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Registered Event Manager Top Tabs
const RegisteredEventTopTabs = ({ route, navigation }) => {
  const params = route.params || {};

  return (
    <View style={styles.container}>
      <CustomHeader
        title={params.eventName || 'Event Details'}
        onBack={() => navigation.goBack()}
      />

      <TopTab.Navigator
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{
          tabBarActiveTintColor: '#5B8CDD',
          tabBarInactiveTintColor: '#A0B4D6',
          tabBarStyle: {
            elevation: 0,
            shadowOpacity: 0,
          },
          swipeEnabled: false,
          lazy: true,
          lazyPreloadDistance: 1,
        }}
      >
        <TopTab.Screen
          name="Details"
          component={RegisteredEventScreen}
          initialParams={params}
        />
        <TopTab.Screen
          name="Quest"
          component={EventQuestsScreen}
          initialParams={params}
        />
      </TopTab.Navigator>
    </View>
  )
};

// Merchandise Top Tabs
const MerchandiseTopTabs = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <CustomHeader
        title="Merchandise"
        onBack={() => navigation.goBack()}
      />

      <TopTab.Navigator
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{
          tabBarActiveTintColor: '#fff',
          tabBarInactiveTintColor: 'rgba(0, 0, 0, 0.7)',
          tabBarStyle: {
            elevation: 0,
            shadowOpacity: 0,
          },
          swipeEnabled: false
        }}
      >
        <TopTab.Screen name="Shop" component={MerchandiseListingScreen} />
        <TopTab.Screen name="Redemption" component={RedemptionListingScreen} />
      </TopTab.Navigator>
    </View>
  )
};

const EventsStackScreen = () => (
  <EventsStack.Navigator>
    <EventsStack.Screen name="EventsMain" component={EventListingScreen} options={{ headerShown: false }} />
  </EventsStack.Navigator>
);

// Calendar Stack
const CalendarStackScreen = () => (
  <CalendarStack.Navigator>
    <CalendarStack.Screen name="AgendaMain" component={AgendaScreen} options={{ headerShown: false }} />
    <CalendarStack.Screen name="RegisteredEventManager" component={RegisteredEventTopTabs} options={{ title: "Registered Event Manager" }} />
  </CalendarStack.Navigator>
);

// Profile Stack
const ProfileStackScreen = () => (
  <ProfileStack.Navigator>
    <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} options={{ headerShown: false }} />
    <ProfileStack.Screen name="Badge" component={BadgeScreen} options={{ title: "Badge Details" }} />
  </ProfileStack.Navigator>
);

const AppTabs = () => (
  <View style={styles.bottomBarBackground}>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Events':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'Agenda':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Leaderboard':
              iconName = focused ? 'trophy' : 'trophy-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }

          return (
            <View style={styles.iconContainer}>
              <Ionicons name={iconName} size={size} color={color} />
              {focused && <View style={styles.indicator} />}
            </View>
          );
        },
        tabBarActiveTintColor: '#3f6bc4',
        tabBarInactiveTintColor: '#A9A9A9',
        tabBarShowLabel: true,
        tabBarStyle: styles.bottomBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabBarLabel,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackScreen}
        options={{
          tabBarLabel: 'Home'
        }}
      />
      <Tab.Screen
        name="Events"
        component={EventsStackScreen}
        options={{
          tabBarLabel: 'Events'
        }}
      />
      <Tab.Screen
        name="Agenda"
        component={CalendarStackScreen}
        options={{
          tabBarLabel: 'Agenda'
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          tabBarLabel: 'Leaderboard'
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackScreen}
        options={{
          tabBarLabel: 'Profile'
        }}
      />
    </Tab.Navigator>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  bottomBarBackground: {
    flex: 1,
    backgroundColor: "white"
  },
  bottomBar: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 0.5,                     // Added border width
    borderColor: 'rgba(179, 185, 196, 0.5)',             // Added subtle border color
    elevation: 10,
    height: 70,
    left: 24,
    paddingBottom: 8,
    paddingHorizontal: 8,
    right: 24,
    shadowColor: 'rgba(59, 111, 201, 0.15)',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    borderBottomWidth: 0,
  },
  tabBarItem: {
    height: 52,
    marginHorizontal: 4,
    top: 5,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
    marginBottom: 4,
    marginTop: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    bottom: -15,
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#6284bf',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 35,
    height: 35,
    marginRight: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(165, 165, 165, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  tabBarContainer: {
    overflow: 'hidden',
    borderRadius: 20,
    margin: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabBarBackgroundImage: {
    borderRadius: 20,
    opacity: 0.9,
  },
  tabBar: {
    flexDirection: 'row',
    padding: 6,
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#5B8CDD',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 3,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    position: 'relative',
  },
  tabItemActive: {
    backgroundColor: 'rgba(91, 140, 221, 0.06)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#A0B4D6',
  },
  tabTextActive: {
    color: '#5B8CDD',
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: '30%',
    backgroundColor: '#5B8CDD',
    borderRadius: 3,
  }
});