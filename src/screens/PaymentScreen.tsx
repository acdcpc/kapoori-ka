import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';

const PREMIUM_PRICE = 850;

export default function PaymentScreen() {
  const { language } = useContext(LanguageContext);
  const { upgradeToPremium } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<'esewa' | 'khalti' | null>(null);
  const [loading, setLoading] = useState(false);

  const isNe = language === 'ne';

  const handlePayment = async () => {
    if (!selectedMethod) {
      Alert.alert(
        isNe ? 'त्रुटि' : 'Error',
        isNe ? 'भुक्तानी विधि चुनें' : 'Select payment method'
      );
      return;
    }

    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await upgradeToPremium({ method: selectedMethod });
      Alert.alert(
        isNe ? 'सफल' : 'Success',
        isNe ? 'प्रीमियम सक्रिय!' : 'Premium activated!'
      );
      setSelectedMethod(null);
    } catch (error) {
      Alert.alert(isNe ? 'त्रुटि' : 'Error', isNe ? 'विफल' : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="star" size={40} color="#ffc107" />
          <Text style={styles.title}>{isNe ? 'प्रीमियम' : 'Premium'}</Text>
          <Text style={styles.price}>Rs {PREMIUM_PRICE}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{isNe ? 'विशेषताएं' : 'Features'}</Text>
          {[
            isNe ? 'उन्नत चार्ट' : 'Advanced Charts',
            isNe ? 'पोषण ट्रैकिंग' : 'Nutrition',
            isNe ? 'M-CHAT स्क्रीनिंग' : 'M-CHAT',
            isNe ? 'PDF रिपोर्ट' : 'PDF Reports',
            isNe ? '5 परामर्श' : '5 Consultations',
          ].map((feature, i) => (
            <View key={i} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={18} color="#4caf50" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{isNe ? 'भुक्तानी' : 'Payment'}</Text>
          {['esewa', 'khalti'].map((method) => (
            <TouchableOpacity
              key={method}
              style={[
                styles.method,
                selectedMethod === method && styles.methodActive,
              ]}
              onPress={() => setSelectedMethod(method as any)}
            >
              <View style={styles.methodLogo}>
                <Text style={styles.logoText}>{method}</Text>
              </View>
              <Text style={styles.methodName}>{method.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isNe ? 'भुगतान करें' : 'Pay'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 10 },
  price: { fontSize: 32, fontWeight: 'bold', color: '#1a73e8', marginTop: 5 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  featureText: { marginLeft: 10, fontSize: 14, color: '#666' },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  methodActive: { borderColor: '#1a73e8', backgroundColor: '#e3f2fd' },
  methodLogo: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#1a73e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontWeight: 'bold', fontSize: 10 },
  methodName: { marginLeft: 12, fontSize: 14, fontWeight: '600', color: '#333' },
  button: {
    backgroundColor: '#1a73e8',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
