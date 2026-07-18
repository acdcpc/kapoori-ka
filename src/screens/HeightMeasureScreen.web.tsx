// HeightMeasureScreen.web.tsx – Web stub (VisionCamera not available)
import React, { useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../context/LanguageContext';

export default function HeightMeasureScreen() {
  const { language } = useContext(LanguageContext);
  const n = language === 'ne';
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.gate}>
        <Ionicons name="phone-portrait-outline" size={64} color="#4CAF50" />
        <Text style={styles.title}>{n ? 'मोबाइलमा मात्र' : 'Mobile Only'}</Text>
        <Text style={styles.desc}>
          {n
            ? 'उचाइ नाप्ने सुविधा Android र iOS मा मात्र उपलब्ध छ। कृपया आफ्नो मोबाइलमा एप खोल्नुहोस्।'
            : 'Height measurement is only available on Android & iOS. Please open the app on your mobile device.'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A', justifyContent: 'center', alignItems: 'center' },
  gate: { alignItems: 'center', padding: 32 },
  title: { color: '#4CAF50', fontSize: 20, fontWeight: '700', marginTop: 16 },
  desc: { color: '#8899AA', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20, maxWidth: 280 },
});
