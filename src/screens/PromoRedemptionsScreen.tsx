// src/screens/PromoRedemptionsScreen.tsx — who redeemed a promo code.
//
// "First 100 users" only means something if you can see which 100. Reads the
// admin-only admin_list_promo_redemptions function; the server re-checks admin.
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../context/LanguageContext';
import { ThemeContext } from '../context/ThemeContext';
import { Palette } from '../theme';
import { supabase } from '../lib/supabase';

type Redemption = {
  user_id: string;
  redeemed_at: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  is_anonymous: boolean;
};

export default function PromoRedemptionsScreen({ route }: any) {
  const codeId = String(route?.params?.codeId ?? '');
  const label = String(route?.params?.label ?? '');
  const { language } = useContext(LanguageContext);
  const { palette: t } = useContext(ThemeContext);
  const styles = makeStyles(t);
  const isNe = language === 'ne';
  const tr = (ne: string, en: string) => (isNe ? ne : en);

  const [rows, setRows] = useState<Redemption[]>([]);
  const [summary, setSummary] = useState<{ remaining: number; redemption_count: number; max_redemptions: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!codeId) { setLoading(false); return; }
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_list_promo_redemptions', { p_code_id: codeId });
      if (rpcError) throw new Error(rpcError.message);
      const result = data as any;
      if (result?.error) throw new Error(String(result.error));
      setRows(result?.redemptions ?? []);
      setSummary(result?.code ?? null);
      setError(null);
    } catch (e: any) {
      console.warn('[promo-redemptions] could not load:', e?.message ?? e);
      setError(e?.message ?? tr('लोड गर्न सकिएन', 'Could not load'));
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [codeId, isNe]);

  useEffect(() => { load(); }, [load]);

  const displayName = (r: Redemption) => r.name || r.email || r.user_id.slice(0, 8);
  const initial = (r: Redemption) => (displayName(r).trim()[0] || '?').toUpperCase();

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={t.clay} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={t.clay} />}
    >
      {label ? <Text style={styles.heading}>{label}</Text> : null}
      {summary && (
        <Text style={styles.summary}>
          {tr(
            `${summary.redemption_count} / ${summary.max_redemptions} प्रयोग भयो · ${summary.remaining} बाँकी`,
            `${summary.redemption_count} of ${summary.max_redemptions} redeemed · ${summary.remaining} left`,
          )}
        </Text>
      )}

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>{tr('फेरि प्रयास गर्नुहोस्', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {rows.length === 0 && !error ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={44} color={t.border} />
          <Text style={styles.muted}>{tr('अझै कसैले यो कोड प्रयोग गरेन।', 'Nobody has redeemed this code yet.')}</Text>
        </View>
      ) : (
        rows.map((r) => (
          <View key={`${r.user_id}-${r.redeemed_at}`} style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial(r)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>{displayName(r)}</Text>
                {r.is_anonymous && (
                  <View style={styles.guestChip}><Text style={styles.guestChipText}>{tr('अतिथि', 'guest')}</Text></View>
                )}
              </View>
              {r.name && r.email ? <Text style={styles.email} numberOfLines={1}>{r.email}</Text> : null}
              {r.phone ? <Text style={styles.email} numberOfLines={1}>{r.phone}</Text> : null}
            </View>
            <Text style={styles.when}>{dayjs(r.redeemed_at).format('D MMM\nHH:mm')}</Text>
          </View>
        ))
      )}

      <Text style={styles.footnote}>
        {tr(
          'यो सूची प्रशासकले मात्र देख्छ। इमेल तपाईंले सिधै सम्पर्क गर्न प्रयोग गर्न सक्नुहुन्छ।',
          'This list is visible to administrators only. Use the email to reach the person directly.',
        )}
      </Text>
    </ScrollView>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    center: { alignItems: 'center', justifyContent: 'center' },
    heading: { fontSize: 17, fontWeight: '800', color: t.text },
    summary: { fontSize: 13, color: t.muted, marginTop: 4, marginBottom: 14 },
    muted: { fontSize: 13, color: t.muted, marginTop: 12, textAlign: 'center' },
    empty: { alignItems: 'center', paddingTop: 50 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: t.actionBg, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 15, fontWeight: '800', color: t.clay },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    name: { flexShrink: 1, fontSize: 14, fontWeight: '700', color: t.text },
    guestChip: { backgroundColor: t.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
    guestChipText: { fontSize: 10, fontWeight: '700', color: t.muted },
    email: { fontSize: 12, color: t.muted, marginTop: 2 },
    when: { fontSize: 11, color: t.muted2, textAlign: 'right' },
    footnote: { fontSize: 12, color: t.muted2, marginTop: 16, lineHeight: 18 },
    errorCard: { backgroundColor: t.redLight, borderWidth: 1, borderColor: t.red, borderRadius: 12, padding: 12, marginBottom: 12 },
    errorText: { fontSize: 13, color: t.redDark },
    retryBtn: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: t.red, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
    retryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  });
