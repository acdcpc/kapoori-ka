// src/screens/LoginScreen.tsx
import React, { useState, useContext, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { LanguageContext } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuthErrorMessage } from '../utils/authErrors';

export default function LoginScreen() {
  const { language, setLanguage } = useContext(LanguageContext);
  const isNe = language === 'ne';

  const {
    signInWithEmail, signUpWithEmail, signInWithGoogle, signInAsGuest,
    sendPasswordReset, resendVerificationEmail, loading,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const isLoading = loading || localLoading;

  useEffect(() => { setAuthError(null); setVerificationSent(false); }, [isRegistering]);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleEmailAction = async () => {
    setAuthError(null);
    if (!email || !password) { setAuthError(isNe ? 'कृपया इमेल र पासवर्ड दुवै भर्नुहोस्' : 'Please enter both email and password'); return; }
    if (!validateEmail(email)) { setAuthError(isNe ? 'कृपया वैध इमेल ठेगाना प्रविष्ट गर्नुहोस्' : 'Please enter a valid email address'); return; }
    if (password.length < 6) { setAuthError(isNe ? 'पासवर्ड कम्तिमा ६ characters को हुनुपर्छ' : 'Password must be at least 6 characters'); return; }
    setLocalLoading(true);
    try {
      if (isRegistering) {
        if (password !== confirmPassword) { setAuthError(isNe ? 'पासवर्ड मिलेन।' : 'Passwords do not match.'); setLocalLoading(false); return; }
        await signUpWithEmail(email, password);
        setVerificationSent(true);
        setPassword(''); setConfirmPassword('');
      } else { await signInWithEmail(email, password); }
    } catch (error: any) { setAuthError(getAuthErrorMessage(error, language)); }
    finally { setLocalLoading(false); }
  };

  const handleGoogleLogin = async () => { setAuthError(null); try { await signInWithGoogle(); } catch (error: any) { setAuthError(getAuthErrorMessage(error, language)); } };
  const handleForgotPassword = async () => {
    setAuthError(null);
    if (!resetEmail || !validateEmail(resetEmail)) { setAuthError(isNe ? 'कृपया वैध इमेल ठेगाना प्रविष्ट गर्नुहोस्' : 'Please enter a valid email address'); return; }
    setLocalLoading(true);
    try { await sendPasswordReset(resetEmail); setResetSent(true); setTimeout(() => { setShowForgotPassword(false); setResetSent(false); setResetEmail(''); }, 3000); }
    catch (error: any) { setAuthError(getAuthErrorMessage(error, language)); }
    finally { setLocalLoading(false); }
  };

  const handleResendVerification = async () => {
    setLocalLoading(true);
    try { await resendVerificationEmail(); Alert.alert(isNe ? 'सफल' : 'Success', isNe ? 'भेरिफिकेसन इमेल पुन: पठाइयो।' : 'Verification email resent.'); }
    catch (error: any) { setAuthError(getAuthErrorMessage(error, language)); }
    finally { setLocalLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F1EB' }}>
      {/* Language Toggle */}
      <View style={styles.langToggle}>
        <TouchableOpacity style={[styles.langBtn, language === 'ne' && styles.langBtnActive]} onPress={() => setLanguage('ne')} disabled={isLoading}>
          <Text style={[styles.langBtnText, language === 'ne' && styles.langBtnTextActive]}>नेपाली</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.langBtn, language === 'en' && styles.langBtnActive]} onPress={() => setLanguage('en')} disabled={isLoading}>
          <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>English</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.content}>
          {/* Brand Mark */}
          <View style={styles.brandCircle}>
            <Text style={styles.brandText}>क</Text>
          </View>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Text style={styles.title}>कपूरी क</Text>
            <Text style={styles.titleEnglish}>Kapoori Ka</Text>
            <Text style={styles.subtitle}>{isNe ? 'आफ्नो बच्चाको विकास ट्र्याक गर्नुहोस्' : "Track your child's growth"}</Text>
          </View>

          {/* Verification sent banner */}
          {verificationSent && (
            <View style={styles.verifyBanner}>
              <Ionicons name="mail-outline" size={20} color="#065F46" />
              <Text style={styles.verifyBannerText}>{isNe ? 'भेरिफिकेसन इमेल पठाइयो। कृपया आफ्नो इनबक्स जाँच गर्नुहोस्।' : 'Verification email sent! Please check your inbox.'}</Text>
              <TouchableOpacity onPress={handleResendVerification} disabled={isLoading}>
                <Text style={styles.verifyResendText}>{isNe ? 'पुन: पठाउनुहोस्' : 'Resend'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Error banner */}
          {authError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#991B1B" />
              <Text style={styles.errorBannerText}>{authError}</Text>
              <TouchableOpacity onPress={() => setAuthError(null)}>
                <Ionicons name="close" size={18} color="#991B1B" />
              </TouchableOpacity>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>{isNe ? 'इमेल' : 'Email'}</Text>
            <TextInput
              style={[styles.input, emailFocused && styles.inputFocused, authError && styles.inputError]}
              placeholder="email@example.com"
              keyboardType="email-address"
              value={email} onChangeText={setEmail}
              autoCapitalize="none" autoCorrect={false}
              editable={!isLoading}
              onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)}
              placeholderTextColor="#C4956A"
            />

            <Text style={styles.label}>{isNe ? 'पासवर्ड' : 'Password'}</Text>
            <View style={styles.pwContainer}>
              <TextInput
                style={[styles.input, styles.pwInput, passwordFocused && styles.inputFocused, authError && styles.inputError]}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                value={password} onChangeText={setPassword}
                editable={!isLoading}
                onFocus={() => setPasswordFocused(true)} onBlur={() => setPasswordFocused(false)}
                placeholderTextColor="#C4956A"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#7A6E65" />
              </TouchableOpacity>
            </View>

            {!isRegistering && (
              <TouchableOpacity style={styles.forgotBtn} onPress={() => { setAuthError(null); setResetEmail(email); setShowForgotPassword(true); }} disabled={isLoading}>
                <Text style={styles.forgotText}>{isNe ? 'पासवर्ड बिर्सनुभयो?' : 'Forgot Password?'}</Text>
              </TouchableOpacity>
            )}

            {isRegistering && (
              <>
                <Text style={styles.label}>{isNe ? 'पासवर्ड पुष्टि गर्नुहोस्' : 'Confirm Password'}</Text>
                <View style={styles.pwContainer}>
                  <TextInput
                    style={[styles.input, styles.pwInput, confirmFocused && styles.inputFocused, authError && styles.inputError]}
                    placeholder="••••••••"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword} onChangeText={setConfirmPassword}
                    editable={!isLoading}
                    onFocus={() => setConfirmFocused(true)} onBlur={() => setConfirmFocused(false)}
                    placeholderTextColor="#C4956A"
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={22} color="#7A6E65" />
                  </TouchableOpacity>
                </View>
              </>
            )}

            <TouchableOpacity style={[styles.btn, isLoading && styles.btnDisabled]} onPress={handleEmailAction} disabled={isLoading}>
              {isLoading && !showForgotPassword ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnText}>{isRegistering ? (isNe ? 'खाता सिर्जना गर्नुहोस्' : 'Create Account') : (isNe ? 'लगइन' : 'Login')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.toggleBtn} onPress={() => { setIsRegistering(!isRegistering); setConfirmPassword(''); setAuthError(null); }} disabled={isLoading}>
              <Text style={styles.toggleText}>
                {isRegistering ? (isNe ? 'पहिले नै खाता छ? ' : 'Already have an account? ') : (isNe ? 'खाता छैन? ' : "Don't have an account? ")}
                <Text style={styles.toggleLink}>{isRegistering ? (isNe ? 'लगइन गर्नुहोस्' : 'Login') : (isNe ? 'दर्ता गर्नुहोस्' : 'Register')}</Text>
              </Text>
            </TouchableOpacity>

            {/* OR Divider */}
            <View style={styles.orDivider}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>{isNe ? 'वा' : 'OR'}</Text>
              <View style={styles.orLine} />
            </View>

            {/* Google Sign-In */}
            <TouchableOpacity style={[styles.googleBtn, isLoading && styles.btnDisabled]} onPress={handleGoogleLogin} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#E8602C" size="small" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={24} color="#DB4437" style={styles.googleIcon} />
                  <Text style={styles.googleBtnText}>{isNe ? 'गुगलसँग जारी राख्नुहोस्' : 'Continue with Google'}</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Guest */}
            <TouchableOpacity style={[styles.guestBtn, isLoading && styles.btnDisabled]} onPress={() => signInAsGuest()} disabled={isLoading}>
              <Ionicons name="person-outline" size={24} color="#7A6E65" style={styles.googleIcon} />
              <Text style={styles.guestBtnText}>{isNe ? 'अतिथिको रूपमा जारी राख्नुहोस्' : 'Continue as Guest'}</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Ionicons name="shield-checkmark" size={16} color="#7A6E65" />
            <Text style={styles.footerText}>{isNe ? 'तपाईंको डाटा सुरक्षित छ' : 'Your data is secure and private'}</Text>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal visible={showForgotPassword} transparent animationType="fade" onRequestClose={() => { setShowForgotPassword(false); setResetSent(false); setAuthError(null); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {resetSent ? (
              <>
                <Ionicons name="checkmark-circle" size={48} color="#3D8B5E" />
                <Text style={styles.modalTitle}>{isNe ? 'इमेल पठाइयो!' : 'Email Sent!'}</Text>
                <Text style={styles.modalText}>{isNe ? 'पासवर्ड रिसेट लिङ्क तपाईंको इमेलमा पठाइएको छ।' : 'A password reset link has been sent to your email.'}</Text>
                <TouchableOpacity style={styles.modalBtn} onPress={() => { setShowForgotPassword(false); setResetSent(false); setAuthError(null); }}>
                  <Text style={styles.modalBtnText}>OK</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>{isNe ? 'पासवर्ड रिसेट' : 'Reset Password'}</Text>
                <Text style={styles.modalText}>{isNe ? 'आफ्नो इमेल प्रविष्ट गर्नुहोस्। हामी तपाईंलाई पासवर्ड रिसेट लिङ्क पठाउनेछौं।' : 'Enter your email and we will send you a reset link.'}</Text>
                {authError && <View style={styles.modalError}><Text style={styles.modalErrorText}>{authError}</Text></View>}
                <TextInput style={styles.modalInput} placeholder="email@example.com" keyboardType="email-address" value={resetEmail} onChangeText={setResetEmail} autoCapitalize="none" autoFocus placeholderTextColor="#C4956A" />
                <TouchableOpacity style={[styles.modalBtn, isLoading && styles.btnDisabled]} onPress={handleForgotPassword} disabled={isLoading}>
                  {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalBtnText}>{isNe ? 'रिसेट लिङ्क पठाउनुहोस्' : 'Send Reset Link'}</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowForgotPassword(false); setAuthError(null); }} disabled={isLoading}>
                  <Text style={styles.modalCancelText}>{isNe ? 'रद्द गर्नुहोस्' : 'Cancel'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 30, justifyContent: 'center' },

  // Brand
  brandCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E8602C', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  brandText: { color: '#fff', fontWeight: '900', fontSize: 26 },

  // Logo
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '800', color: '#1A1A2E', textAlign: 'center', marginTop: 12, letterSpacing: 1 },
  titleEnglish: { fontSize: 16, color: '#7A6E65', textAlign: 'center', marginTop: 2 },
  subtitle: { fontSize: 14, color: '#7A6E65', fontStyle: 'italic', textAlign: 'center', marginTop: 8 },

  // Verification & Error Banners
  verifyBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D1FAE5', borderRadius: 10, padding: 12, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#3D8B5E' },
  verifyBannerText: { flex: 1, fontSize: 13, color: '#065F46', lineHeight: 18 },
  verifyResendText: { fontSize: 13, fontWeight: '700', color: '#E8602C' },

  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#C0392B' },
  errorBannerText: { flex: 1, fontSize: 13, color: '#991B1B', lineHeight: 18 },

  // Form
  form: { width: '100%' },
  label: { fontSize: 13, fontWeight: '600', color: '#7A6E65', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#EDE0D4', borderRadius: 12, paddingHorizontal: 15, padding: 14, fontSize: 15, color: '#1A1A2E', marginBottom: 10, backgroundColor: '#FDF8F2' },
  inputFocused: { borderColor: '#E8602C' },
  inputError: { borderColor: '#C0392B' },
  pwContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, position: 'relative' },
  pwInput: { flex: 1, marginBottom: 0, paddingRight: 50 },
  eyeBtn: { position: 'absolute', right: 12, top: 16 },

  // Forgot Password
  forgotBtn: { alignSelf: 'flex-end', paddingVertical: 6, marginBottom: 6 },
  forgotText: { color: '#E8602C', fontSize: 13, fontWeight: '500' },

  // Buttons
  btn: { backgroundColor: '#E8602C', height: 55, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 2, marginTop: 6 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // OR divider
  orDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  orLine: { flex: 1, height: 1, backgroundColor: '#EDE0D4' },
  orText: { marginHorizontal: 16, fontSize: 13, color: '#7A6E65', fontWeight: '600' },

  googleBtn: { backgroundColor: '#FDF8F2', height: 55, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1.5, borderColor: '#EDE0D4' },
  googleBtnText: { color: '#1A1A2E', fontSize: 16, fontWeight: '700' },
  guestBtn: { height: 55, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#EDE0D4' },
  guestBtnText: { color: '#7A6E65', fontSize: 16, fontWeight: '700' },
  googleIcon: { marginRight: 10 },
  toggleBtn: { padding: 15, alignItems: 'center' },
  toggleText: { color: '#7A6E65', fontSize: 15 },
  toggleLink: { color: '#E8602C', fontWeight: '700' },

  // Footer
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  footerText: { fontSize: 12, color: '#7A6E65', marginLeft: 6 },

  // Language Toggle
  langToggle: { flexDirection: 'row', alignSelf: 'center', borderRadius: 20, borderWidth: 1, borderColor: '#EDE0D4', padding: 2, marginTop: 8, marginBottom: 8 },
  langBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 18 },
  langBtnActive: { backgroundColor: '#E8602C' },
  langBtnText: { color: '#7A6E65', fontWeight: '600', fontSize: 14 },
  langBtnTextActive: { color: '#fff' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  modalCard: { backgroundColor: '#FDF8F2', borderRadius: 16, padding: 28, width: '100%', alignItems: 'center', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginTop: 12, marginBottom: 8 },
  modalText: { fontSize: 14, color: '#7A6E65', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  modalInput: { width: '100%', borderWidth: 1.5, borderColor: '#EDE0D4', borderRadius: 12, paddingHorizontal: 15, height: 50, fontSize: 16, color: '#1A1A2E', marginBottom: 16, backgroundColor: '#FDF8F2' },
  modalError: { width: '100%', backgroundColor: '#FEE2E2', borderRadius: 8, padding: 10, marginBottom: 12 },
  modalErrorText: { fontSize: 13, color: '#991B1B', textAlign: 'center' },
  modalBtn: { width: '100%', backgroundColor: '#E8602C', height: 50, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalCancel: { marginTop: 16, padding: 8 },
  modalCancelText: { color: '#7A6E65', fontSize: 14, fontWeight: '500' },
});
