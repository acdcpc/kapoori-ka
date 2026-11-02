// src/screens/AdminRepliesScreen.tsx — admin view of what users replied.
//
// Replies could only be read in the web panel, which is awkward from a phone.
// This screen calls the same admin-messages function: list messages with reply
// counts, open a thread, mark it read.
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

type Thread = {
  id: string;
  title: string;
  allow_replies: boolean;
  created_at: string;
  reply_count: number;
  unread_reply_count: number;
};

type Reply = {
  id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  user?: { email?: string; name?: string } | null;
  user_id: string;
};

export default function AdminRepliesScreen({ navigation }: any) {
  const { user } = useAuth();
  const { language } = useContext(LanguageContext);
  const { palette: t } = useContext(ThemeContext);
  const styles = makeStyles(t);
  const isNe = language === 'ne';
  const tr = (ne: string, en: string) => (isNe ? ne : en);

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('admin-messages', { body: payload });
    if (error) throw new Error(error.message ?? 'Request failed');
    const result = data as any;
    if (result?.error) throw new Error(String(result.error));
    return result;
  }, []);

  const load = useCallback(async () => {
    if (!user?.uid) { setLoading(false); return; }
    try {
      const { data } = await supabase.rpc('is_app_admin', { p_user_id: user.uid });
      const admin = data === true;
      setIsAdmin(admin);
      if (!admin) { setLoading(false); return; }
      const result = await call({ action: 'list' });
      setThreads(result?.broadcasts ?? []);
      setError(null);
    } catch (e: any) {
      // Never fail silently: an empty list and a broken call look identical to
      // the admin otherwise.
      console.warn('[admin-replies] could not load messages:', e?.message ?? e);
      setError(e?.message ?? tr('लोड गर्न सकिएन', 'Could not load messages'));
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, call]);

  useEffect(() => { load(); }, [load]);

  const openThread = async (id: string) => {
    setOpenId(id);
    setBusy(true);
    try {
      const result = await call({ action: 'thread', broadcast_id: id });
      setReplies(result?.replies ?? []);
    } catch (error: any) {
      Alert.alert(tr('लोड गर्न सकिएन', 'Could not load'), error?.message ?? '');
      setReplies([]);
    } finally {
      setBusy(false);
    }
  };

  const markRead = async (id: string) => {
    try {
      await call({ action: 'mark_read', broadcast_id: id });
      setReplies((prev) => prev.map((r) => ({ ...r, read_at: r.read_at ?? new Date().toISOString() })));
      setThreads((prev) => prev.map((th) => (th.id === id ? { ...th, unread_reply_count: 0 } : th)));
    } catch (error: any) {
      Alert.alert(tr('सकिएन', 'Could not update'), error?.message ?? '');
    }
  };

  if (isAdmin === null || loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={t.clay} />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.center, { padding: 24 }]}>
        <Ionicons name="lock-closed-outline" size={40} color={t.border} />
        <Text style={styles.muted}>{tr('यो पृष्ठ प्रशासकका लागि मात्र हो।', 'This screen is for administrators only.')}</Text>
      </View>
    );
  }

  const openThreadData = threads.find((th) => th.id === openId) ?? null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={t.clay} />}
    >
      {openId && openThreadData ? (
        <>
          <TouchableOpacity style={styles.backRow} onPress={() => { setOpenId(null); setReplies([]); }}>
            <Ionicons name="chevron-back" size={18} color={t.clay} />
            <Text style={styles.backText}>{tr('सबै सन्देश', 'All messages')}</Text>
          </TouchableOpacity>

          <Text style={styles.threadTitle}>{openThreadData.title}</Text>
          <Text style={styles.threadMeta}>
            {dayjs(openThreadData.created_at).format('D MMM YYYY, HH:mm')} ·{' '}
            {openThreadData.reply_count} {tr('जवाफ', 'replies')}
          </Text>

          {busy ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={t.clay} />
          ) : replies.length === 0 ? (
            <Text style={styles.muted}>{tr('अझै कुनै जवाफ छैन।', 'No replies to this message yet.')}</Text>
          ) : (
            replies.map((reply) => {
              const who = reply.user?.name || reply.user?.email || `user ${reply.user_id.slice(0, 8)}`;
              return (
                <View key={reply.id} style={[styles.replyCard, !reply.read_at && styles.replyCardUnread]}>
                  <View style={styles.replyHead}>
                    <Text style={styles.replyWho} numberOfLines={1}>{who}</Text>
                    <Text style={styles.replyWhen}>{dayjs(reply.created_at).format('D MMM, HH:mm')}</Text>
                  </View>
                  <Text style={styles.replyBody}>{reply.body}</Text>
                  {!reply.read_at && <Text style={styles.newTag}>{tr('नयाँ', 'new')}</Text>}
                </View>
              );
            })
          )}

          {openThreadData.unread_reply_count > 0 && (
            <TouchableOpacity style={styles.markBtn} onPress={() => markRead(openThreadData.id)}>
              <Ionicons name="checkmark-done" size={16} color={t.onAccent} />
              <Text style={styles.markText}>{tr('पढिएको चिन्ह लगाउनुहोस्', 'Mark as read')}</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <>
          {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>{tr('फेरि प्रयास गर्नुहोस्', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      )}
      {threads.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="chatbubble-ellipses-outline" size={44} color={t.border} />
              <Text style={styles.muted}>
                {tr('अझै कुनै सन्देश पठाइएको छैन।', 'No messages sent yet.')}
              </Text>
            </View>
          ) : (
            threads.map((thread) => (
              <TouchableOpacity
                key={thread.id}
                style={styles.card}
                onPress={() => openThread(thread.id)}
                activeOpacity={0.85}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{thread.title}</Text>
                  <Text style={styles.cardMeta}>
                    {dayjs(thread.created_at).format('D MMM')} · {thread.reply_count}{' '}
                    {tr('जवाफ', 'replies')}
                  </Text>
                </View>
                {thread.unread_reply_count > 0 && (
                  <View style={styles.badge}><Text style={styles.badgeText}>{thread.unread_reply_count}</Text></View>
                )}
                <Ionicons name="chevron-forward" size={16} color={t.shadow} />
              </TouchableOpacity>
            ))
          )}
          <TouchableOpacity style={styles.composeLink} onPress={() => navigation.navigate('ComposeBroadcast')}>
            <Ionicons name="add-circle-outline" size={18} color={t.clay} />
            <Text style={styles.composeLinkText}>{tr('नयाँ सन्देश पठाउनुहोस्', 'Send a new message')}</Text>
          </TouchableOpacity>
        </>
      )}
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: t.text },
    cardMeta: { fontSize: 12, color: t.muted2, marginTop: 3 },
    badge: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: t.clay, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
    badgeText: { color: t.onAccent, fontWeight: '800', fontSize: 12 },
    errorCard: { backgroundColor: t.redLight, borderWidth: 1, borderColor: t.red, borderRadius: 12, padding: 12, marginBottom: 12 },
    errorText: { fontSize: 13, color: t.redDark },
    retryBtn: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: t.red, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
    retryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
    backText: { color: t.clay, fontWeight: '700', fontSize: 13 },
    threadTitle: { fontSize: 18, fontWeight: '800', color: t.text, lineHeight: 25 },
    threadMeta: { fontSize: 12, color: t.muted2, marginTop: 4, marginBottom: 14 },
    replyCard: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderLeftWidth: 4,
      borderLeftColor: t.border,
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
    },
    replyCardUnread: { borderLeftColor: t.clay },
    replyHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    replyWho: { flex: 1, fontSize: 12, fontWeight: '700', color: t.muted },
    replyWhen: { fontSize: 11, color: t.muted2 },
    replyBody: { fontSize: 14, color: t.text, marginTop: 6, lineHeight: 20 },
    newTag: { fontSize: 10, fontWeight: '800', color: t.clay, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
    markBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: t.clay,
      borderRadius: 12,
      paddingVertical: 12,
      marginTop: 8,
    },
    markText: { color: t.onAccent, fontWeight: '800', fontSize: 14 },
    composeLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, marginTop: 6 },
    composeLinkText: { color: t.clay, fontWeight: '700', fontSize: 14 },
  });
