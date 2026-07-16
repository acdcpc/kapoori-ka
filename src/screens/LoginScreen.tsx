import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { LanguageContext } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const { language, setLanguage } = useContext(LanguageContext);
  const isNe = language === 'ne';

  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInAsGuest, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleEmailAction = async () => {
    if (!email || !password) {
      Alert.alert(isNe ? 'त्रुटि' : 'Error', isNe ? 'कृपया इमेल र पासवर्ड दुवै भर्नुहोस्' : 'Please enter both email and password');
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert(isNe ? 'त्रुटि' : 'Error', isNe ? 'कृपया वैध इमेल ठेगाना प्रविष्ट गर्नुहोस्' : 'Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      Alert.alert(isNe ? 'त्रुटि' : 'Error', isNe ? 'पासवर्ड कम्तिमा ६ characters को हुनुपर्छ' : 'Password must be at least 6 characters');
      return;
    }
    if (isRegistering && password !== confirmPassword) {
      Alert.alert(isNe ? 'त्रुटि' : 'Error', isNe ? 'पासवर्ड मिलेन। कृपया पुन: प्रयास गर्नुहोस्' : 'Passwords do not match. Please try again.');
      return;
    }
    try {
      if (isRegistering) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (error: any) {
      Alert.alert(isNe ? 'असफल' : 'Failed', error.message);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
    {/* Language Toggle - outside KeyboardAvoidingView for proper positioning */}
    <View style={styles.langToggle}>
      <TouchableOpacity
        style={[styles.langBtn, language === 'ne' && styles.langBtnActive]}
        onPress={() => setLanguage('ne')}
      >
        <Text style={[styles.langBtnText, language === 'ne' && styles.langBtnTextActive]}>नेपाली</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
        onPress={() => setLanguage('en')}
      >
        <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>English</Text>
      </TouchableOpacity>
    </View>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.titleEmoji}></Text>
            <Text style={styles.title}>कपूरी क</Text>
            <Text style={styles.titleEnglish}>Kapoori Ka</Text>
          </View>
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
          <View style={styles.pwContainer}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="********"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#888" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.btn} onPress={handleEmailAction} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{isRegistering ? (isNe ? 'खाता सिर्जना गर्नुहोस्' : 'Create Account') : (isNe ? 'लगइन' : 'Login')}</Text>}
          </TouchableOpacity>

          {isRegistering && (
            <>
              <Text style={styles.label}>{isNe ? 'पासवर्ड पुष्टि गर्नुहोस्' : 'Confirm Password'}</Text>
              <View style={styles.pwContainer}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="********"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={22} color="#888" />
                </TouchableOpacity>
              </View>
            </>
          )}

          <TouchableOpacity 
            style={styles.toggleBtn} 
            onPress={() => { setIsRegistering(!isRegistering); setConfirmPassword(''); }}
          >
            <Text style={styles.toggleText}>
              {isRegistering 
                ? (isNe ? 'पहिले नै खाता छ? लगइन गर्नुहोस्' : 'Already have an account? Login') 
                : (isNe ? 'खाता छैन? दर्ता गर्नुहोस्' : "Don't have an account? Register")}
            </Text>
          </TouchableOpacity>

          <Text style={styles.orText}>{isNe ? 'वा' : 'OR'}</Text>

          <TouchableOpacity style={[styles.btn, styles.googleBtn]} onPress={handleGoogleLogin} disabled={loading}>
            <Ionicons name="logo-google" size={24} color="#fff" style={styles.googleIcon} />
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{isNe ? 'गुगलसँग जारी राख्नुहोस्' : 'Continue with Google'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.guestBtn]} onPress={() => signInAsGuest()} disabled={loading}>
            <Ionicons name="person-outline" size={24} color="#1a73e8" style={styles.googleIcon} />
            <Text style={[styles.btnText, {color: '#1a73e8'}]}>{isNe ? 'अतिथिको रूपमा जारी राख्नुहोस्' : 'Continue as Guest'}</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 30, justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 50 },
  logoEmoji: { fontSize: 60, marginBottom: 10 },
  titleContainer: { alignItems: 'center', marginBottom: 8 },
  titleEmoji: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 36, fontWeight: '800', color: '#1a73e8', letterSpacing: 1 },
  titleEnglish: { fontSize: 14, color: '#1a73e8', fontWeight: '500', opacity: 0.7, marginTop: 2 },
  subtitle: { fontSize: 16, color: '#666', marginTop: 12 },
  form: { width: '100%' },
  label: { fontSize: 14, color: '#888', marginBottom: 8, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 15, height: 55, fontSize: 18, color: '#333', marginBottom: 10 },
  pwInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 45, height: 55, fontSize: 18, color: '#333', flex: 1 },
  btn: { backgroundColor: '#1a73e8', height: 55, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  orText: { textAlign: 'center', marginVertical: 20, fontSize: 16, color: '#888' },
  googleBtn: { backgroundColor: '#DB4437', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  guestBtn: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1a73e8' },
  googleIcon: { marginRight: 10 },
  toggleBtn: { padding: 15, alignItems: 'center' },
  toggleText: { color: '#1a73e8', fontSize: 16, fontWeight: '500' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  footerText: { fontSize: 12, color: '#888', marginLeft: 6 },
  langToggle: { flexDirection: 'row', alignSelf: 'center', borderRadius: 10, backgroundColor: '#e8f0fe', padding: 3, marginTop: 8, marginBottom: 8 },
  langBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 6 },
  langBtnActive: { backgroundColor: '#1a73e8' },
  langBtnText: { color: '#444', fontWeight: '600', fontSize: 14 },
  langBtnTextActive: { color: '#fff' },
  pwContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, position: 'relative' },
  eyeBtn: { position: 'absolute', right: 10, top: 14 },
  forgotBtn: { alignItems: 'center', padding: 8, marginBottom: 4 },
  forgotText: { color: '#1a73e8', fontSize: 14, fontWeight: '500' },
});
