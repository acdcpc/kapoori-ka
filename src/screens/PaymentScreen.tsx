// src/screens/PaymentScreen.tsx
// In-app premium payment — loads the hosted payment page (public/payment.html)
// in a WebView. Hosted on Netlify so the payment flow can be updated without
// shipping a new APK.
import React from 'react';
import { View, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { PAYMENT_WEB_URL } from '../constants';

export default function PaymentScreen() {
  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: PAYMENT_WEB_URL }}
        style={styles.webview}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#E8602C" />
          </View>
        )}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        // Open WhatsApp / tel / mailto links in their native apps instead of
        // navigating the WebView away from the payment page.
        onShouldStartLoadWithRequest={(request) => {
          const url = request.url || '';
          if (
            url.includes('wa.me') ||
            url.startsWith('whatsapp://') ||
            url.startsWith('tel:') ||
            url.startsWith('mailto:')
          ) {
            Linking.openURL(url).catch(() => {});
            return false;
          }
          return true;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF8F2' },
  webview: { flex: 1, backgroundColor: '#FDF8F2' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDF8F2' },
});
