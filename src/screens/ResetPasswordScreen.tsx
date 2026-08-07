import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen({ navigation }: Props) {

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validate = (): string | null => {
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
      return 'Password must contain at least one letter and one number.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(''); setLoading(true);
    try {
      const { error: e } = await supabase.auth.updateUser({ password });
      if (e) throw new Error(e.message);
      setSuccess(true);
      setTimeout(() => navigation.navigate('Home'), 2000);
    } catch (e: any) {
      setError(e?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#E8602C" />
      </TouchableOpacity>

      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>Enter your new password below.</Text>

      {success && (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={20} color="#065F46" />
          <Text style={styles.successText}>Password updated! Redirecting...</Text>
        </View>
      )}

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color="#991B1B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError('')}>
            <Ionicons name="close" size={18} color="#991B1B" />
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={styles.label}>New Password</Text>
      <Text style={styles.hint}>Minimum 8 characters, at least one letter and one number</Text>
      <View style={styles.pwContainer}>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          editable={!loading && !success}
          placeholderTextColor="#C4956A"
        />
        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#7A6E65" />
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Confirm Password</Text>
      <View style={styles.pwContainer}>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          secureTextEntry={!showPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          editable={!loading && !success}
          placeholderTextColor="#C4956A"
        />
      </View>

      <TouchableOpacity
        style={[styles.btn, (loading || success) && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={loading || success}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.btnText}>Update Password</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF8F2', padding: 24, justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 60, left: 16, zIndex: 10, padding: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#E8602C', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#7A6E65', marginBottom: 24, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 4, marginTop: 12 },
  hint: { fontSize: 12, color: '#7A6E65', marginBottom: 8 },
  input: { flex: 1, padding: 14, fontSize: 15, color: '#333' },
  pwContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 2, borderColor: '#EDE0D4',
    borderRadius: 12, overflow: 'hidden',
  },
  eyeBtn: { padding: 12 },
  btn: {
    backgroundColor: '#E8602C', padding: 16, borderRadius: 14,
    alignItems: 'center', marginTop: 24,
  },
  btnDisabled: { backgroundColor: '#EDE0D4' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#D1FAE5', borderRadius: 12, padding: 14, marginBottom: 16,
  },
  successText: { color: '#065F46', fontSize: 14, flex: 1 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14, marginBottom: 16,
  },
  errorText: { color: '#991B1B', fontSize: 14, flex: 1 },
});
