import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Platform, TouchableOpacity, View, Text } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './utils/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

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
import EventQuestsScreen from './screens/EventQuestsScreen.jsx';
import BadgeScreen from './screens/BadgeScreen.jsx';

import { getItem, setItem } from './utils/asyncStorage.js';
import { SafeAreaView } from 'react-native-safe-area-context';

const MainStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();
const EventsStack = createNativeStackNavigator();
const CalendarStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const ShopStack = createNativeStackNavigator();

const Tab = createBottomTabNavigator();

const TopTab = createMaterialTopTabNavigator();

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkIfAlreadyOnboarded = async () => {
      let onboarded = await getItem('onboarded');
      setShowOnboarding(onboarded != 1);
    };

    checkIfAlreadyOnboarded();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
    });

    return unsubscribe;
  }, []);

    // Delete after Sign In is completed.
    useEffect(() => {
      setItem('studentID', "BEUJi1zSGwHNbor9vHL9");
      setItem('facultyID', "4");
    }, []);

  if (showOnboarding === null) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        backgroundColor="#f0f0f0" // Background color (Android only)
        barStyle="dark-content" // 'light-content', 'dark-content', or 'default'
        translucent={false} // Whether the app should render below status bar (Android)
        hidden={false} // Hide the status bar
      />
      <NavigationContainer>
        {/* {user ? <AppTabs /> : <AuthStackScreen showOnboarding={showOnboarding} />} */}
        <MainStack.Navigator>
          <MainStack.Screen name="AppTabs" component={AppTabs} options={{ headerShown: false }} />
          <MainStack.Screen name="MerchandiseTopTabs" component={MerchandiseTopTabs} options={{ headerShown: false }} />
          <MainStack.Screen name="EventDetails" component={EventDetailsScreen} options={{ headerShown: false }} />
        </MainStack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}

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
            </TouchableOpacity>
          );
        })}
      </View>
  );
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
          // These styles will be overridden by our custom tab bar
          // but they're needed for the navigator configuration
          tabBarActiveTintColor: '#fff',
          tabBarInactiveTintColor: 'rgba(0, 0, 0, 0.7)',
          tabBarStyle: {
            elevation: 0,
            shadowOpacity: 0,
          },
        }}
      >
        <TopTab.Screen name="Shop" component={ShopStackScreen} />
        <TopTab.Screen name="Redemption" component={RedemptionListingScreen} />
      </TopTab.Navigator>
    </View>
  )
};

const ShopStackScreen = () => (
  <ShopStack.Navigator>
    <ShopStack.Screen name="MerchandiseListing" component={MerchandiseListingScreen} options={{ headerShown: false }} />
    <ShopStack.Screen name="MerchandiseDetails" component={MerchandiseDetailsScreen} options={{ title: "Merchandise Details" }} />
  </ShopStack.Navigator>
);

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

// Registered Event Manager Top Tabs
const RegisteredEventTopTabs = () => (
  <TopTab.Navigator>
    <TopTab.Screen name="Details" component={EventDetailsScreen} />
    <TopTab.Screen name="Quest" component={EventQuestsScreen} />
  </TopTab.Navigator>
);

// Profile Stack
const ProfileStackScreen = () => (
  <ProfileStack.Navigator>
    <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} options={{ headerShown: false }} />
    <ProfileStack.Screen name="Badge" component={BadgeScreen} options={{ title: "Badge Details" }} />
  </ProfileStack.Navigator>
);

const AppTabs = () => (
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
      tabBarActiveTintColor: '#415881',
      tabBarInactiveTintColor: '#94A3B8',
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
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  bottomBar: {
    height: 80,
    backgroundColor: '#FFFFFF',
    left: 20,
    right: 20,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 10,
    paddingBottom: 8,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    borderTopWidth: 0,
  },
  tabBarItem: {
    height: 60,
    marginTop: 8,
    marginHorizontal: 4,
    borderRadius: 16,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
    marginTop: 2,
    marginBottom: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    position: 'absolute',
    bottom: -18,
    width: 4,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#415881',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  // Custom Tab Bar Styles
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
    padding: 4,
    marginHorizontal: 5,
    backgroundColor: 'rgba(65, 88, 129, 0.4)', // Semi-transparent overlay
    borderRadius: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  tabItemActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(67, 67, 67, 0.7)',
  },
  tabTextActive: {
    color: '#000000',
    fontWeight: 'bold',
  },
});