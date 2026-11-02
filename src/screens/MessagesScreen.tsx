// src/screens/MessagesScreen.tsx — the inbox for admin broadcasts.
// Read-only here; opening a message moves to BroadcastDetail for the full text
// and, when the message allows it, the reply box.
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { ThemeContext } from '../context/ThemeContext';
import { Palette } from '../theme';
import { Broadcast, listBroadcasts, listReadBroadcastIds } from '../data/broadcasts';
import { supabase } from '../lib/supabase';

export default function MessagesScreen({ navigation }: any) {
  const { user } = useAuth();
  const { language } = useContext(LanguageContext);
  const { palette: t } = useContext(ThemeContext);
  const styles = makeStyles(t);
  const isNe = language === 'ne';
  const tr = (ne: string, en: string) => (isNe ? ne : en);

  const [items, setItems] = useState<Broadcast[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Composing is admin-only; the server enforces it too, this just hides the button.
  const [isAdmin, setIsAdmin] = useState(false);

  const load = useCallback(async () => {
    if (!user?.uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      const [broadcasts, reads] = await Promise.all([listBroadcasts(), listReadBroadcastIds(user.uid)]);
      setItems(broadcasts);
      setReadIds(new Set(reads));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const { data } = await supabase.rpc('is_app_admin', { p_user_id: user.uid });
        setIsAdmin(data === true);
      } catch {
        setIsAdmin(false);
      }
    })();
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const title = (b: Broadcast) => (isNe && b.title_ne ? b.title_ne : b.title);
  const body = (b: Broadcast) => (isNe && b.body_ne ? b.body_ne : b.body);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={t.clay} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={t.clay}
        />
      }
    >
      {isAdmin && (
        <TouchableOpacity style={styles.adminCard} onPress={() => navigation.navigate('AdminReplies')} activeOpacity={0.85}>
          <Ionicons name="shield-checkmark-outline" size={18} color={t.clay} />
          <View style={{ flex: 1 }}>
            <Text style={styles.adminCardTitle}>{tr('प्रशासक: जवाफहरू', 'Admin: replies')}</Text>
            <Text style={styles.adminCardHint}>
              {tr('प्रयोगकर्ताले पठाएका जवाफ हेर्नुहोस्', 'Read what users replied to your messages')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={t.shadow} />
        </TouchableOpacity>
      )}

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={44} color={t.border} />
          <Text style={styles.emptyTitle}>{tr('अहिलेसम्म कुनै सन्देश छैन', 'No messages yet')}</Text>
          <Text style={styles.emptyBody}>
            {tr(
              'हामीले पठाएका सूचना र सन्देशहरू यहाँ देखिनेछन्।',
              'Announcements and messages from the Kapoori Ka team will appear here.',
            )}
          </Text>
        </View>
      ) : (
        items.map((item) => {
          const unread = !readIds.has(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, unread && styles.cardUnread]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('BroadcastDetail', { broadcastId: item.id })}
            >
              <View style={styles.cardHead}>
                {unread && <View style={styles.dot} />}
                <Text style={[styles.cardTitle, unread && styles.cardTitleUnread]} numberOfLines={2}>
                  {title(item)}
                </Text>
                <Text style={styles.cardDate}>{dayjs(item.created_at).format('D MMM')}</Text>
              </View>
              <Text style={styles.cardBody} numberOfLines={3}>
                {body(item)}
              </Text>
              <View style={styles.cardFoot}>
                {item.allow_replies && (
                  <View style={styles.replyChip}>
                    <Ionicons name="return-down-back" size={12} color={t.clay} />
                    <Text style={styles.replyChipText}>{tr('जवाफ दिन सकिन्छ', 'Reply allowed')}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color={t.shadow} style={{ marginLeft: 'auto' }} />
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
    {isAdmin && (
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ComposeBroadcast')}
        accessibilityRole="button"
        accessibilityLabel={tr('नयाँ सन्देश पठाउनुहोस्', 'Send a new message')}
      >
        <Ionicons name="add" size={28} color={t.onAccent} />
      </TouchableOpacity>
    )}
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    center: { alignItems: 'center', justifyContent: 'center' },
    empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: t.text, marginTop: 14 },
    emptyBody: { fontSize: 13, color: t.muted, textAlign: 'center', marginTop: 6, lineHeight: 19 },
    card: {
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.border,
      padding: 14,
      marginBottom: 10,
    },
    cardUnread: { borderColor: t.clay },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.clay },
    cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: t.text },
    cardTitleUnread: { fontWeight: '800' },
    cardDate: { fontSize: 11, color: t.muted2 },
    cardBody: { fontSize: 13, color: t.muted, marginTop: 6, lineHeight: 19 },
    cardFoot: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    replyChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: t.actionBg,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    replyChipText: { fontSize: 11, color: t.clay, fontWeight: '700' },
    adminCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.clay,
      borderRadius: 14,
      padding: 13,
      marginBottom: 12,
    },
    adminCardTitle: { fontSize: 14, fontWeight: '800', color: t.text },
    adminCardHint: { fontSize: 12, color: t.muted, marginTop: 2 },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: t.clay,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
  });
