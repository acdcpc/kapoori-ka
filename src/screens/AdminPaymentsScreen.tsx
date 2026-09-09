// src/screens/AdminPaymentsScreen.tsx — owner-side review queue (in-app).
// Gated to app admins. Approve issues the activation code via the
// approve-payment Edge Function (payer auto-redeems in-app); reject keeps
// the audited RPC path. The web admin panel remains available on desktop.
import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { Palette } from '../theme';
import { LanguageContext } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';

type PendingPayment = {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  plan: string;
  amount: number | null;
  transaction_id: string;
  remarks: string | null;
  created_at: string;
};

const PLAN_LABEL = (p: string, ne: boolean) =>
  p === 'yearly' ? (ne ? 'वार्षिक NPR 500' : 'Yearly NPR 500') : p === 'monthly' ? (ne ? 'मासिक NPR 100' : 'Monthly NPR 100') : p;

export default function AdminPaymentsScreen() {
  const { palette: t } = useContext(ThemeContext);
  const styles = makeStyles(t);
  const { language } = useContext(LanguageContext);
  const { user } = useAuth();
  const isNe = language === 'ne';

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [items, setItems] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!user?.uid) return;
    try {
      const { data, error } = await supabase.from('payments')
        .select('id, name, email, mobile, plan, amount, transaction_id, remarks, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems((data as PendingPayment[]) || []);
    } catch {
      Alert.alert(isNe ? 'त्रुटि' : 'Error', isNe ? 'सूची ल्याउन सकिएन।' : 'Could not load payments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user?.uid) return;
      try {
        const { data, error } = await supabase.rpc('is_app_admin', { p_actor_id: user.uid });
        if (error) throw error;
        if (alive) setIsAdmin(data === true);
      } catch {
        if (alive) setIsAdmin(false);
      }
    })();
    load();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const callFunction = async (fn: string, payload: object) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Sign in required');
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Request failed');
    return json;
  };

  const approve = async (p: PendingPayment) => {
    Alert.alert(
      isNe ? 'स्वीकृत गर्नुहोस्?' : 'Approve payment?',
      `${p.name} · ${PLAN_LABEL(p.plan, isNe)}\n${isNe ? 'Transaction:' : 'Txn'}: ${p.transaction_id}`,
      [
        { text: isNe ? 'रद्द' : 'Cancel', style: 'cancel' },
        { text: isNe ? 'स्वीकृत गर्नुहोस्' : 'Approve', onPress: async () => { setBusyId(p.id); try { await callFunction('approve-payment', { payment_id: p.id }); Alert.alert('✅', isNe ? 'स्वीकृत भयो — प्रयोगकर्ताको एप आफैँ सक्रिय हुनेछ।' : 'Approved — the user’s app will activate automatically.'); await load(); } catch (e: any) { Alert.alert(isNe ? 'त्रुटि' : 'Error', e?.message); } finally { setBusyId(null); } } },
      ],
    );
  };

  const reject = async (p: PendingPayment) => {
    Alert.alert(
      isNe ? 'अस्वीकृत गर्नुहोस्?' : 'Reject payment?',
      isNe ? 'कारण सहित अस्वीकृत गरिनेछ।' : 'The payment will be rejected with a reason.',
      [
        { text: isNe ? 'रद्द' : 'Cancel', style: 'cancel' },
        { text: isNe ? 'रकम मिलेन' : 'Amount mismatch', onPress: () => doReject(p, 'Amount mismatch') },
        { text: isNe ? 'Transaction भेटिएन' : 'Txn not found', onPress: () => doReject(p, 'Transaction not found') },
        { text: isNe ? 'अस्वीकृत' : 'Reject', style: 'destructive', onPress: () => doReject(p, 'Rejected by owner') },
      ],
    );
  };

  const doReject = async (p: PendingPayment, reason: string) => {
    if (!user?.uid) return;
    setBusyId(p.id);
    try {
      const { error } = await supabase.rpc('admin_reject_payment', { p_payment_id: p.id, p_reason: reason, p_actor_id: user.uid });
      if (error) throw error;
      await load();
    } catch (e: any) {
      Alert.alert(isNe ? 'त्रुटि' : 'Error', e?.message || 'Reject failed');
    } finally { setBusyId(null); }
  };

  if (isAdmin === false) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Ionicons name="lock-closed-outline" size={40} color={t.muted} />
          <Text style={{ color: t.muted2, marginTop: 12, textAlign: 'center' }}>{isNe ? 'यो पृष्ठ केवल प्रशासकका लागि हो।' : 'This screen is for app administrators only.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={t.clay} />}>
        <Text style={styles.title}>{isNe ? 'भुक्तानी समीक्षा' : 'Payment review'}</Text>
        {items.length === 0 && !loading && (
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-done-outline" size={30} color={t.green} />
            <Text style={styles.emptyText}>{isNe ? 'जाँच गर्न बाँकी कुनै भुक्तानी छैन।' : 'No pending payments.'}</Text>
          </View>
        )}
        {items.map((p) => (
          <View key={p.id} style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.cardName}>{p.name}</Text>
              <Text style={styles.cardPlan}>{PLAN_LABEL(p.plan, isNe)}</Text>
            </View>
            <Text style={styles.cardMeta}>{p.email}</Text>
            <Text style={styles.cardMeta}>{isNe ? 'Transaction:' : 'Txn'}: {p.transaction_id}</Text>
            {!!p.mobile && <Text style={styles.cardMeta}>{isNe ? 'मोबाइल:' : 'Mobile:'} {p.mobile}</Text>}
            <Text style={styles.cardDate}>{new Date(p.created_at).toLocaleString()}</Text>
            {!!p.remarks && <Text style={styles.cardRemarks}>“{p.remarks}”</Text>}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity style={[styles.approveBtn, busyId === p.id && { opacity: 0.5 }]} disabled={busyId !== null}
                onPress={() => approve(p)}>
                {busyId === p.id ? <ActivityIndicator color={t.onAccent} size="small" /> : <Ionicons name="checkmark" size={18} color={t.onAccent} />}
                <Text style={styles.approveText}>{isNe ? 'स्वीकृत' : 'Approve'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.rejectBtn, busyId === p.id && { opacity: 0.5 }]} disabled={busyId !== null}
                onPress={() => reject(p)}>
                <Ionicons name="close" size={18} color={t.red} />
                <Text style={{ color: t.red, fontWeight: '800', fontSize: 14 }}>{isNe ? 'अस्वीकृत' : 'Reject'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Palette) => StyleSheet.create({
  page: { flex: 1, backgroundColor: t.bg },
  title: { fontSize: 22, fontWeight: '800', color: t.titleInk, marginBottom: 12 },
  card: { backgroundColor: t.surface, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: t.border },
  cardName: { fontSize: 16, fontWeight: '800', color: t.text, flex: 1 },
  cardPlan: { fontSize: 13, fontWeight: '800', color: t.clay },
  cardMeta: { fontSize: 13, color: t.muted2, marginTop: 3 },
  cardDate: { fontSize: 11, color: t.muted, marginTop: 6 },
  cardRemarks: { fontSize: 12, color: t.labelInk, fontStyle: 'italic', marginTop: 6 },
  approveBtn: { flex: 1, minHeight: 46, borderRadius: 10, backgroundColor: t.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  approveText: { color: t.onAccent, fontWeight: '800', fontSize: 14 },
  rejectBtn: { flex: 1, minHeight: 46, borderRadius: 10, borderWidth: 1.5, borderColor: t.red, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: t.muted2, fontSize: 15 },
});
