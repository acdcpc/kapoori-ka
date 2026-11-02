// src/screens/BroadcastDetailScreen.tsx — one broadcast, plus the reply thread
// when the admin team enabled replies for it.
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { ThemeContext } from '../context/ThemeContext';
import { Palette } from '../theme';
import {
  Broadcast,
  BroadcastReply,
  getBroadcast,
  listMyReplies,
  markBroadcastRead,
  sendBroadcastReply,
} from '../data/broadcasts';

const MAX_REPLY = 2000;

export default function BroadcastDetailScreen({ route, navigation }: any) {
  const broadcastId = String(route?.params?.broadcastId ?? '');
  const { user } = useAuth();
  const { language } = useContext(LanguageContext);
  const { palette: t } = useContext(ThemeContext);
  const styles = makeStyles(t);
  const isNe = language === 'ne';
  const tr = (ne: string, en: string) => (isNe ? ne : en);

  const [message, setMessage] = useState<Broadcast | null>(null);
  const [replies, setReplies] = useState<BroadcastReply[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!broadcastId || !user?.uid) {
      setLoading(false);
      return;
    }
    try {
      const [found, mine] = await Promise.all([getBroadcast(broadcastId), listMyReplies(broadcastId, user.uid)]);
      setMessage(found);
      setReplies(mine);
      if (found) {
        navigation.setOptions({ title: isNe && found.title_ne ? found.title_ne : found.title });
        // Reading it is what clears the unread dot in the inbox.
        markBroadcastRead(broadcastId, user.uid).catch(() => undefined);
      }
    } catch {
      setMessage(null);
    } finally {
      setLoading(false);
    }
  }, [broadcastId, user?.uid, isNe, navigation]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!user?.uid || !message || sending) return;
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      const saved = await sendBroadcastReply(message.id, user.uid, body);
      setReplies((prev) => [...prev, saved]);
      setDraft('');
    } catch (error: any) {
      Alert.alert(
        tr('पठाउन सकिएन', 'Could not send'),
        error?.message ?? tr('पछि फेरि प्रयास गर्नुहोस्।', 'Please try again.'),
      );
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={t.clay} />
      </View>
    );
  }

  if (!message) {
    return (
      <View style={[styles.container, styles.center, { padding: 24 }]}>
        <Ionicons name="alert-circle-outline" size={40} color={t.border} />
        <Text style={styles.missing}>{tr('यो सन्देश भेटिएन।', 'This message could not be found.')}</Text>
      </View>
    );
  }

  const title = isNe && message.title_ne ? message.title_ne : message.title;
  const body = isNe && message.body_ne ? message.body_ne : message.body;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
        <Text style={styles.date}>{dayjs(message.created_at).format('D MMMM YYYY, HH:mm')}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>

        {message.allow_replies && (
          <View style={styles.replySection}>
            <Text style={styles.sectionLabel}>{tr('तपाईंको जवाफ', 'Your replies')}</Text>
            {replies.length === 0 ? (
              <Text style={styles.noReplies}>
                {tr('अझै कुनै जवाफ छैन। तल लेख्नुहोस्।', 'No replies yet. Write one below.')}
              </Text>
            ) : (
              replies.map((reply) => (
                <View key={reply.id} style={styles.replyBubble}>
                  <Text style={styles.replyBody}>{reply.body}</Text>
                  <Text style={styles.replyDate}>{dayjs(reply.created_at).format('D MMM, HH:mm')}</Text>
                  {reply.read_at && (
                    <View style={styles.readRow}>
                      <Ionicons name="checkmark-done" size={13} color={t.clay} />
                      <Text style={styles.readText}>{tr('हेरियो', 'Read by the team')}</Text>
                    </View>
                  )}
                </View>
              ))
            )}

            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder={tr('यहाँ लेख्नुहोस्…', 'Write a reply…')}
                placeholderTextColor={t.muted2}
                multiline
                maxLength={MAX_REPLY}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
                onPress={submit}
                disabled={!draft.trim() || sending}
                accessibilityRole="button"
                accessibilityLabel={tr('पठाउनुहोस्', 'Send reply')}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={t.onAccent} />
                ) : (
                  <Ionicons name="send" size={18} color={t.onAccent} />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.counter}>
              {draft.length}/{MAX_REPLY}
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    center: { alignItems: 'center', justifyContent: 'center' },
    missing: { marginTop: 12, fontSize: 14, color: t.muted, textAlign: 'center' },
    date: { fontSize: 12, color: t.muted2, marginBottom: 6 },
    title: { fontSize: 20, fontWeight: '800', color: t.text, lineHeight: 27 },
    body: { fontSize: 15, color: t.text, lineHeight: 23, marginTop: 10 },
    replySection: { marginTop: 26, borderTopWidth: 1, borderTopColor: t.border, paddingTop: 16 },
    sectionLabel: { fontSize: 12, fontWeight: '800', color: t.muted, textTransform: 'uppercase', letterSpacing: 1 },
    noReplies: { fontSize: 13, color: t.muted2, marginTop: 8, marginBottom: 4 },
    replyBubble: {
      backgroundColor: t.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
      padding: 12,
      marginTop: 10,
    },
    replyBody: { fontSize: 14, color: t.text, lineHeight: 20 },
    replyDate: { fontSize: 11, color: t.muted2, marginTop: 6 },
    readRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    readText: { fontSize: 11, color: t.clay, fontWeight: '700' },
    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 14 },
    input: {
      flex: 1,
      minHeight: 46,
      maxHeight: 140,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 12,
      fontSize: 14,
      color: t.text,
      backgroundColor: t.surface,
    },
    sendBtn: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: t.clay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.45 },
    counter: { fontSize: 11, color: t.muted2, textAlign: 'right', marginTop: 6 },
  });
