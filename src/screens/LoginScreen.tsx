import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { LanguageContext } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';

  const { signInWithEmail, signInWithGoogle, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert(isNe ? 'त्रुटि' : 'Error', isNe ? 'कृपया इमेल र पासवर्ड दुवै भर्नुहोस्' : 'Please enter both email and password');
      return;
    }
    try {
      await signInWithEmail(email, password);
    } catch (error: any) {
      Alert.alert(isNe ? 'लगइन असफल' : 'Login Failed', error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert(isNe ? 'लगइन असफल' : 'Login Failed', error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>👶</Text>
          <Text style={styles.title}>कपूरी क</Text>
          <Text style={styles.subtitle}>{isNe ? 'आफ्नो बच्चाको विकास ट्र्याक गर्नुहोस्' : 'Track your child\'s growth'}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{isNe ? 'इमेल' : 'Email'}</Text>
          <TextInput
            style={styles.input}
            placeholder="email@example.com"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />

          <Text style={styles.label}>{isNe ? 'पासवर्ड' : 'Password'}</Text>
          <TextInput
            style={styles.input}
            placeholder="********"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.btn} onPress={handleEmailLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{isNe ? 'लगइन' : 'Login'}</Text>}
          </TouchableOpacity>

          <Text style={styles.orText}>{isNe ? 'वा' : 'OR'}</Text>

          <TouchableOpacity style={[styles.btn, styles.googleBtn]} onPress={handleGoogleLogin} disabled={loading}>
            <Ionicons name="logo-google" size={24} color="#fff" style={styles.googleIcon} />
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{isNe ? 'गुगलसँग लगइन गर्नुहोस्' : 'Login with Google'}</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={16} color="#888" />
          <Text style={styles.footerText}>
            {isNe ? 'तपाईंको डाटा सुरक्षित छ' : 'Your data is secure and private'}
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 30, justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 50 },
  logoEmoji: { fontSize: 60, marginBottom: 10 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1a73e8' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 5 },
  form: { width: '100%' },
  label: { fontSize: 14, color: '#888', marginBottom: 8, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 15, height: 55, fontSize: 18, color: '#333', marginBottom: 20 },
  btn: { backgroundColor: '#1a73e8', height: 55, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  orText: { textAlign: 'center', marginVertical: 20, fontSize: 16, color: '#888' },
  googleBtn: { backgroundColor: '#DB4437', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  googleIcon: { marginRight: 10 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  footerText: { fontSize: 12, color: '#888', marginLeft: 6 }
});
