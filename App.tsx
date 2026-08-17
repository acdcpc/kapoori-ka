// App.tsx
import 'react-native-get-random-values';
import React, { useState, useEffect, useContext, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LanguageContext } from './src/context/LanguageContext';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, Platform } from 'react-native';
import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
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
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { registerForPushNotifications } from './src/utils/notifications';
import { RootStackParamList } from './src/navigation/types';
import { getWebAppUrl } from './src/lib/webConfig';

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = { current: null as any };

function Navigation() {
  const { user, loading, subscription } = useAuth();
  const { language } = useContext(LanguageContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#E8602C" />
      </View>
    );
  }

  const isPremium = subscription?.status === 'active' || subscription?.plan === 'premium' || subscription?.plan === 'yearly' || subscription?.plan === 'monthly';

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="auto" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#FDF8F2' },
          headerTintColor: '#1A1A2E',
          headerTitleStyle: { fontWeight: '700', fontSize: 17, color: '#1A1A2E' },
          headerShadowVisible: false,
          headerBackTitleVisible: false,
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

// Handle auth session completion for OAuth redirects
WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const [language, setLanguage] = useState<'en' | 'ne'>('ne');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      try {
        getWebAppUrl(); // validate EXPO_PUBLIC_WEB_APP_URL on web (dev warning if missing/malformed)
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

  // ── Web OAuth callback error handling ──
  // Google/Supabase redirect back to /auth/callback with an error fragment
  // (user cancelled or auth failed). supabase-js leaves the error hash in the
  // URL on failure (it only clears it on success), so we detect it here and
  // present a localized, recoverable message.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const hash = window.location.hash || '';
    if (!hash.includes('error=')) return;
    try {
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const raw = params.get('error_description') || params.get('error') || 'unknown_error';
      const title = language === 'ne' ? 'साइन-इन असफल' : 'Sign-in failed';
      const msg = language === 'ne' ? `साइन-इन असफल भयो: ${raw}` : `Sign-in failed: ${raw}`;
      // Clear the fragment so a refresh does not re-trigger the error.
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      window.alert(`${title}\n\n${msg}`);
    } catch (e) {
      console.warn('[App] OAuth callback error parse failed:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep link handler for password reset
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      console.log('[APP] Deep link received:', event.url);
      if (event.url?.includes('reset-password')) {
        navigationRef.current?.navigate('ResetPassword');
      }
    };

    const sub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then(url => {
      console.log('[APP] Initial URL:', url);
      if (url?.includes('reset-password')) {
        setTimeout(() => navigationRef.current?.navigate('ResetPassword'), 500);
      }
    });
    return () => sub.remove();
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
        <ActivityIndicator size="large" color="#E8602C" />
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
