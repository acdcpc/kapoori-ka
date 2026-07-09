// App.tsx
import 'react-native-get-random-values';
import React, { useState, useEffect, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LanguageContext } from './src/context/LanguageContext';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from './src/screens/HomeScreen';
import AddChildScreen from './src/screens/AddChildScreen';
import ChildDashboard from './src/screens/ChildDashboard';
import GrowthChartScreen from './src/screens/GrowthChartScreen';
import ImmunizationScreen from './src/screens/ImmunizationScreen';
import MilestoneScreen from './src/screens/MilestoneScreen';
import MChatScreen from './src/screens/MChatScreen';
import PDFReportScreen from './src/screens/PDFReportScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import AboutScreen from './src/screens/AboutScreen';
import NutritionScreen from './src/screens/NutritionScreen';
import LoginScreen from './src/screens/LoginScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { registerForPushNotifications } from './src/utils/notifications';
import { RootStackParamList } from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function Navigation() {
  const { user, loading, subscription } = useAuth();
  const { language } = useContext(LanguageContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  const isPremium = subscription?.status === 'active' || subscription?.plan === 'beta_free';

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1a73e8' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'कपूरी क (Kapoori Ka)' }} />
            <Stack.Screen name="AddChild" component={AddChildScreen} options={{ title: 'बच्चा थप्नुहोस् | Add Child' }} />
            <Stack.Screen name="ChildDashboard" component={ChildDashboard} options={({ route }) => ({ title: route.params.child.name })} />
            <Stack.Screen name="GrowthChart" component={GrowthChartScreen} options={{ title: 'वृद्धि चार्ट | Growth Chart' }} />
            <Stack.Screen name="Immunization" component={ImmunizationScreen} options={{ title: 'खोप | Immunization' }} />
            <Stack.Screen name="Milestone" component={MilestoneScreen} options={{ title: 'विकास | Milestones' }} />
            <Stack.Screen name="MChat" component={MChatScreen} options={{ title: 'अटिज्म जाँच | M-CHAT' }} />
            <Stack.Screen name="PDFReport" component={PDFReportScreen} options={{ title: 'PDF रिपोर्ट | Report' }} />
            <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ title: 'सदस्यता | Subscription' }} />
            <Stack.Screen name="About" component={AboutScreen} options={{ title: 'हाम्रो बारेमा | About' }} />
            <Stack.Screen name="Nutrition" component={NutritionScreen} options={{ title: 'पोषण | Nutrition' }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [language, setLanguage] = useState<'en' | 'ne'>('ne');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('user_language');
        if (savedLang === 'en' || savedLang === 'ne') {
          setLanguage(savedLang);
        }
        await registerForPushNotifications().catch(() => {});
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
      }
    };
    prepare();
  }, []);

  const handleSetLanguage = async (lang: 'en' | 'ne') => {
    setLanguage(lang);
    try {
      await AsyncStorage.setItem('user_language', lang);
    } catch (e) {
      console.error('Failed to save language', e);
    }
  };

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage }}>
        <AuthProvider>
          <Navigation />
        </AuthProvider>
      </LanguageContext.Provider>
    </SafeAreaProvider>
  );
}
