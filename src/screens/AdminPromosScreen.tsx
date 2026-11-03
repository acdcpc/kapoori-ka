// src/screens/AdminPromosScreen.tsx — how the launch promo is performing.
//
// The web panel shows this, but the admin often works from a phone. Reads the
// same admin_list_promo_codes function the panel calls: per-code slots used,
// slots left, plan and status. Hashes are never returned by that function.
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { ThemeContext } from '../context/ThemeContext';
import { Palette } from '../theme';
import { supabase } from '../lib/supabase';

type PromoCode = {
  id: string;
  label: string | null;
  plan: string;
  status: string;
  max_redemptions: number;
  redemption_count: number;
  remaining: number;
  last_redeemed_at: string | null;
  voided_at: string | null;
};

export default function AdminPromosScreen({ navigation }: any) {
  const { user } = useAuth();
  const { language } = useContext(LanguageContext);
  const { palette: t } = useContext(ThemeContext);
  const styles = makeStyles(t);
  const isNe = language === 'ne';
  const tr = (ne: string, en: string) => (isNe ? ne : en);

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.uid) { setLoading(false); return; }
    try {
      const { data: adminFlag } = await supabase.rpc('is_app_admin', { p_user_id: user.uid });
      const admin = adminFlag === true;
      setIsAdmin(admin);
      if (!admin) { setLoading(false); return; }

      const { data, error: rpcError } = await supabase.rpc('admin_list_promo_codes');
      if (rpcError) throw new Error(rpcError.message);
      const result = data as any;
      if (result?.error) throw new Error(String(result.error));
      setCodes(result?.codes ?? []);
      setError(null);
    } catch (e: any) {
      console.warn('[admin-promos] could not load:', e?.message ?? e);
      setError(e?.message ?? tr('लोड गर्न सकिएन', 'Could not load'));
      setCodes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid, isNe]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={t.clay} />
      </View>
    );
  }

  if (isAdmin === false) {
    return (
      <View style={[styles.container, styles.center, { padding: 24 }]}>
        <Ionicons name="lock-closed-outline" size={40} color={t.border} />
        <Text style={styles.muted}>{tr('यो पृष्ठ प्रशासकका लागि मात्र हो।', 'This screen is for administrators only.')}</Text>
      </View>
    );
  }

  const planLabel = (plan: string) =>
    plan === 'yearly' ? tr('१ वर्ष', '1 year') : plan === '6months' ? tr('६ महिना', '6 months') : tr('१ महिना', '1 month');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={t.clay}
        />
      }
    >
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>{tr('फेरि प्रयास गर्नुहोस्', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {codes.length === 0 && !error ? (
        <View style={styles.empty}>
          <Ionicons name="pricetags-outline" size={44} color={t.border} />
          <Text style={styles.muted}>{tr('अहिलेसम्म कुनै प्रोमो कोड छैन।', 'No promo codes yet.')}</Text>
        </View>
      ) : (
        codes.map((code, index) => {
          const used = code.redemption_count;
          const total = code.max_redemptions;
          const pct = total > 0 ? Math.min(used / total, 1) : 0;
          return (
            <TouchableOpacity
              key={`${code.label ?? 'code'}-${index}`}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('PromoRedemptions', { codeId: code.id, label: code.label ?? '' })}
              accessibilityRole="button"
              accessibilityLabel={tr('कसले प्रयोग गर्यो हेर्नुहोस्', 'See who redeemed')}
            >
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {code.label || tr('प्रोमो कोड', 'Promo code')}
                </Text>
                <View style={[styles.chip, code.voided_at ? styles.chipVoid : null]}>
                  <Text style={styles.chipText}>
                    {code.voided_at ? tr('रद्द', 'voided') : planLabel(code.plan)}
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{used}</Text>
                  <Text style={styles.statLabel}>{tr('प्रयोग भयो', 'redeemed')}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: t.clay }]}>{code.remaining}</Text>
                  <Text style={styles.statLabel}>{tr('बाँकी', 'left')}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{total}</Text>
                  <Text style={styles.statLabel}>{tr('कुल', 'total')}</Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%` }]} />
              </View>

              <View style={styles.cardFoot}>
              <Text style={styles.cardMeta}>
                {code.last_redeemed_at
                  ? tr(
                      `अन्तिम पटक ${dayjs(code.last_redeemed_at).format('D MMM, HH:mm')} मा`,
                      `last redeemed ${dayjs(code.last_redeemed_at).format('D MMM, HH:mm')}`,
                    )
                  : tr('अझै कसैले प्रयोग गरेन', 'no redemptions yet')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={t.shadow} />
              </View>
            </TouchableOpacity>
          );
        })
      )}

      <Text style={styles.footnote}>
        {tr(
          'कोड बनाउने र कति जनाले प्रयोग गरे भन्ने वेब प्यानलको Promo codes बाट पनि देखिन्छ।',
          'Codes are created in the web admin panel under Promo codes; this screen shows how many slots are used.',
        )}
      </Text>
    </ScrollView>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    center: { alignItems: 'center', justifyContent: 'center' },
    muted: { fontSize: 13, color: t.muted, marginTop: 12, textAlign: 'center' },
    empty: { alignItems: 'center', paddingTop: 50 },
    card: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
    },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: t.text },
    chip: { backgroundColor: t.actionBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    chipVoid: { backgroundColor: t.redLight },
    chipText: { fontSize: 11, fontWeight: '800', color: t.clay },
    statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
    statBox: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, height: 28, backgroundColor: t.border },
    statValue: { fontSize: 22, fontWeight: '800', color: t.text },
    statLabel: { fontSize: 11, color: t.muted2, marginTop: 2 },
    progressTrack: { height: 6, borderRadius: 3, backgroundColor: t.border, marginTop: 14, overflow: 'hidden' },
    progressFill: { height: 6, borderRadius: 3, backgroundColor: t.clay },
    cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    cardMeta: { fontSize: 12, color: t.muted },
    footnote: { fontSize: 12, color: t.muted2, marginTop: 14, lineHeight: 18 },
    errorCard: { backgroundColor: t.redLight, borderWidth: 1, borderColor: t.red, borderRadius: 12, padding: 12, marginBottom: 12 },
    errorText: { fontSize: 13, color: t.redDark },
    retryBtn: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: t.red, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
    retryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  });
