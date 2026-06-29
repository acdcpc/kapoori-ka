/**
 * Kapoori-Ka: Child Development Tracker
 *
 * Main App Component
 */

import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageContext } from './src/context/LanguageContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ChildDashboard from './src/screens/ChildDashboard';
import AddChildScreen from './src/screens/AddChildScreen';
import GrowthChartScreen from './src/screens/GrowthChartScreen';
import ImmunizationScreen from './src/screens/ImmunizationScreen';
import MilestoneScreen from './src/screens/MilestoneScreen';
import NutritionScreen from './src/screens/NutritionScreen';
import MChatScreen from './src/screens/MChatScreen';
import PDFReportScreen from './src/screens/PDFReportScreen';
import AboutScreen from './src/screens/AboutScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';

const Stack = createNativeStackNavigator();

/**
 * Navigation Stack for Authenticated Users
 */
function AuthenticatedStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1a73e8' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'कपूरी क | Kapoori-Ka' }}
      />
      <Stack.Screen
        name="ChildDashboard"
        component={ChildDashboard}
        options={{ title: 'Dashboard' }}
      />
      <Stack.Screen
        name="AddChild"
        component={AddChildScreen}
        options={{ title: 'Add Child' }}
      />
      <Stack.Screen
        name="GrowthChart"
        component={GrowthChartScreen}
        options={{ title: 'Growth Chart' }}
      />
      <Stack.Screen
        name="Immunization"
        component={ImmunizationScreen}
        options={{ title: 'Immunization' }}
      />
      <Stack.Screen
        name="Milestones"
        component={MilestoneScreen}
        options={{ title: 'Milestones' }}
      />
      <Stack.Screen
        name="Nutrition"
        component={NutritionScreen}
        options={{ title: 'Nutrition' }}
      />
      <Stack.Screen
        name="MChat"
        component={MChatScreen}
        options={{ title: 'M-CHAT Screening' }}
      />
      <Stack.Screen
        name="PDFReport"
        component={PDFReportScreen}
        options={{ title: 'Health Report' }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{ title: 'About' }}
      />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{ title: 'Premium' }}
      />
    </Stack.Navigator>
  );
}

/**
 * Navigation Stack for Unauthenticated Users
 */
function UnauthenticatedStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

/**
 * Root Navigator Component
 */
function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AuthenticatedStack /> : <UnauthenticatedStack />}
    </NavigationContainer>
  );
}

/**
 * Main App Component
 */
export default function App() {
  const [language, setLanguage] = useState<'ne' | 'en'>('ne');

  return (
    <SafeAreaProvider>
      <LanguageContext.Provider value={{ language, setLanguage }}>
        <AuthProvider>
          <RootNavigator />
          <StatusBar style="auto" />
        </AuthProvider>
      </LanguageContext.Provider>
    </SafeAreaProvider>
  );
}
