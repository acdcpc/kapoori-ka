import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { usePremiumGuard, PREMIUM_FEATURES } from '../hooks/usePremiumGuard';

export default function ConsultationScreen({ navigation }: any) {
  const { language } = useContext(LanguageContext);
  const { subscription } = useAuth();
  const { guardFeature, getRemainingConsultations, isPremium } = usePremiumGuard();
  const [loading, setLoading] = useState(false);

  const isNe = language === 'ne';
  const remaining = getRemainingConsultations();

  const handleBookConsultation = async () => {
    if (!guardFeature(PREMIUM_FEATURES.ONLINE_CONSULTATION)) {
      return;
    }

    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      Alert.alert(
        isNe ? 'सफल' : 'Success',
        isNe ? 'परामर्श सफलतापूर्वक बुक भयो' : 'Consultation booked'
      );
    } catch (error) {
      Alert.alert(isNe ? 'त्रुटि' : 'Error', isNe ? 'विफल' : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isPremium()) {
    return (
      <View style={styles.container}>
        <View style={styles.lockedContent}>
          <Ionicons name="lock-closed" size={48} color="#ffc107" />
          <Text style={styles.lockedTitle}>{isNe ? 'प्रीमियम' : 'Premium'}</Text>
          <Text style={styles.lockedText}>
            {isNe ? 'केवल प्रीमियम प्रयोगकर्ताहरूका लागि' : 'Premium only'}
          </Text>
          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.upgradeBtnText}>{isNe ? 'अपग्रेड' : 'Upgrade'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{isNe ? 'परामर्श' : 'Consultations'}</Text>
          <View style={styles.badge}>
            <Ionicons name="checkmark-circle" size={16} color="#4caf50" />
            <Text style={styles.badgeText}>{remaining} {isNe ? 'बचे' : 'left'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{isNe ? 'डॉक्टर' : 'Doctors'}</Text>
          {['Dr. Prakash'].map((doctor, i) => (
            <View key={i} style={styles.doctor}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{doctor.charAt(4)}</Text>
              </View>
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{doctor}</Text>
                <Text style={styles.specialty}>{isNe ? 'विशेषज्ञ' : 'Specialist'}</Text>
              </View>
              <Ionicons name="star" size={16} color="#ffc107" />
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.bookBtn}
          onPress={handleBookConsultation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.bookBtnText}>{isNe ? 'बुक गर्नुहोस्' : 'Book'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, paddingBottom: 40 },
  lockedContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  lockedTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 15 },
  lockedText: { fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center' },
  upgradeBtn: { backgroundColor: '#ffc107', padding: 12, borderRadius: 8, marginTop: 20 },
  upgradeBtnText: { color: '#333', fontWeight: '600' },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f5e9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
  badgeText: { marginLeft: 6, color: '#2e7d32', fontWeight: '500' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 20, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  doctor: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a73e8', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold' },
  doctorInfo: { flex: 1, marginLeft: 12 },
  doctorName: { fontSize: 14, fontWeight: '600', color: '#333' },
  specialty: { fontSize: 12, color: '#999', marginTop: 2 },
  bookBtn: { backgroundColor: '#1a73e8', borderRadius: 8, padding: 14, alignItems: 'center' },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
