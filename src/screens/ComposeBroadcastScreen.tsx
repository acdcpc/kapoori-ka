// src/screens/ComposeBroadcastScreen.tsx — send an announcement from the app.
//
// The web admin panel could already do this, but the owner works from a phone,
// so composing belongs in the app too. Same server function either way:
// admin-broadcast authorises the caller, persists the message, then pushes.
import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { ThemeContext } from '../context/ThemeContext';
import { Palette } from '../theme';
import { supabase } from '../lib/supabase';
import { listBroadcasts } from '../data/broadcasts';

type Audience = 'all' | 'premium' | 'free';

export default function ComposeBroadcastScreen({ navigation }: any) {
  const { user } = useAuth();
  const { language } = useContext(LanguageContext);
  const { palette: t } = useContext(ThemeContext);
  const styles = makeStyles(t);
  const isNe = language === 'ne';
  const tr = (ne: string, en: string) => (isNe ? ne : en);

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [title, setTitle] = useState('');
  const [titleNe, setTitleNe] = useState('');
  const [body, setBody] = useState('');
  const [bodyNe, setBodyNe] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [allowReplies, setAllowReplies] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [audienceSize, setAudienceSize] = useState<number | null>(null);

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

  const call = async (dryRun: boolean) => {
    const payload = {
      title: title.trim(),
      body: body.trim(),
      title_ne: titleNe.trim(),
      body_ne: bodyNe.trim(),
      audience,
      allow_replies: allowReplies,
      dry_run: dryRun,
    };
    const { data, error } = await supabase.functions.invoke('admin-broadcast', { body: payload });
    if (error) throw new Error(error.message ?? 'The server rejected the request.');
    const result = data as any;
    if (result?.error) throw new Error(String(result.error));
    return result;
  };

  const checkAudience = async () => {
    setChecking(true);
    try {
      const result = await call(true);
      setAudienceSize(Number(result?.targeted ?? 0));
    } catch (error: any) {
      Alert.alert(tr('जाँच गर्न सकिएन', 'Could not check'), error?.message ?? '');
    } finally {
      setChecking(false);
    }
  };

  const send = async () => {
    if (title.trim().length < 3 || body.trim().length < 3) {
      Alert.alert(
        tr('जानकारी अपुरो', 'Incomplete'),
        tr('शीर्षक र सन्देश दुवै कम्तीमा ३ अक्षर हुनुपर्छ।', 'Title and message must each be at least 3 characters.'),
      );
      return;
    }
    setBusy(true);
    try {
      const result = await call(false);
      const sent = Number(result?.sent ?? 0);
      const failed = Number(result?.failed ?? 0);
      Alert.alert(
        tr('पठाइयो', 'Sent'),
        tr(
          `सन्देश सुरक्षित भयो र ${sent} उपकरणमा पठाइयो।`,
          `Message saved and pushed to ${sent} device${sent === 1 ? '' : 's'}${failed ? `, ${failed} failed` : ''}.`,
        ),
        [{ text: tr('ठीक छ', 'OK'), onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      Alert.alert(tr('पठाउन सकिएन', 'Could not send'), error?.message ?? '');
    } finally {
      setBusy(false);
    }
  };

  if (isAdmin === null) {
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
        <Text style={styles.denied}>{tr('यो पृष्ठ प्रशासकका लागि मात्र हो।', 'This screen is for administrators only.')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>{tr('शीर्षक (अंग्रेजी)', 'Title (English)')}</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Clinic hours this week"
          placeholderTextColor={t.muted2}
          maxLength={100}
        />

        <Text style={styles.label}>{tr('नेपाली शीर्षक (वैकल्पिक)', 'Nepali title (optional)')}</Text>
        <TextInput
          style={styles.input}
          value={titleNe}
          onChangeText={setTitleNe}
          placeholder="यो हप्ताको क्लिनिक समय"
          placeholderTextColor={t.muted2}
          maxLength={120}
        />

        <Text style={styles.label}>{tr('सन्देश (अंग्रेजी)', 'Message (English)')}</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={body}
          onChangeText={setBody}
          placeholder="Up to 400 characters in the notification"
          placeholderTextColor={t.muted2}
          multiline
          maxLength={400}
        />
        <Text style={styles.counter}>{body.length}/400</Text>

        <Text style={styles.label}>{tr('नेपाली सन्देश (वैकल्पिक)', 'Nepali message (optional)')}</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={bodyNe}
          onChangeText={setBodyNe}
          placeholder="नेपालीमा लेख्नुहोस्"
          placeholderTextColor={t.muted2}
          multiline
          maxLength={2000}
        />

        <Text style={styles.label}>{tr('कसलाई पठाउने', 'Send to')}</Text>
        <View style={styles.chipRow}>
          {([['all', 'सबै', 'Everyone'], ['premium', 'प्रिमियम', 'Premium'], ['free', 'निःशुल्क', 'Free']] as const).map(
            ([value, ne, en]) => (
              <TouchableOpacity
                key={value}
                onPress={() => setAudience(value as Audience)}
                style={[styles.chip, audience === value && styles.chipActive]}
              >
                <Text style={[styles.chipText, audience === value && styles.chipTextActive]}>{tr(ne, en)}</Text>
              </TouchableOpacity>
            ),
          )}
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>{tr('जवाफ दिन अनुमति दिनुहोस्', 'Allow replies')}</Text>
            <Text style={styles.switchHint}>
              {tr('प्रयोगकर्ताले एपबाटै जवाफ पठाउन सक्नेछन्।', 'Users can answer from the app; you read them in the admin panel.')}
            </Text>
          </View>
          <Switch value={allowReplies} onValueChange={setAllowReplies} trackColor={{ true: t.clay, false: t.border }} />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={checkAudience} disabled={checking || busy}>
            {checking ? <ActivityIndicator size="small" color={t.clay} /> : (
              <Text style={styles.secondaryBtnText}>
                {audienceSize === null
                  ? tr('कति उपकरणमा जान्छ?', 'Check audience')
                  : tr(`${audienceSize} उपकरण`, `${audienceSize} device(s)`)}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.sendBtn, busy && { opacity: 0.6 }]} onPress={send} disabled={busy}>
            {busy ? <ActivityIndicator size="small" color={t.onAccent} /> : (
              <>
                <Ionicons name="send" size={16} color={t.onAccent} />
                <Text style={styles.sendBtnText}>{tr('पठाउनुहोस्', 'Send now')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footnote}>
          {tr(
            'सन्देश पठाएपछि प्रयोगकर्ताको “सन्देशहरू” सूचीमा रहन्छ।',
            'The message stays in every user’s Messages list after it is sent.',
          )}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    center: { alignItems: 'center', justifyContent: 'center' },
    denied: { marginTop: 12, fontSize: 14, color: t.muted, textAlign: 'center' },
    label: { fontSize: 12, fontWeight: '800', color: t.muted, marginTop: 14, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
    input: {
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 14,
      color: t.text,
      backgroundColor: t.surface,
    },
    multiline: { minHeight: 78, textAlignVertical: 'top' },
    counter: { fontSize: 11, color: t.muted2, textAlign: 'right', marginTop: 4 },
    chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
    chipActive: { backgroundColor: t.clay, borderColor: t.clay },
    chipText: { fontSize: 14, fontWeight: '700', color: t.muted },
    chipTextActive: { color: t.onAccent },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12 },
    switchLabel: { fontSize: 14, fontWeight: '700', color: t.text },
    switchHint: { fontSize: 12, color: t.muted, marginTop: 3, lineHeight: 17 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 22, alignItems: 'center' },
    secondaryBtn: { flex: 1, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
    secondaryBtnText: { fontSize: 13, fontWeight: '700', color: t.clay },
    sendBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.clay, borderRadius: 12, paddingHorizontal: 20, minHeight: 46, justifyContent: 'center' },
    sendBtnText: { color: t.onAccent, fontWeight: '800', fontSize: 14 },
    footnote: { fontSize: 12, color: t.muted2, marginTop: 18, lineHeight: 18 },
  });
