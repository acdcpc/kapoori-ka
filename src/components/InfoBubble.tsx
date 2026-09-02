// src/components/InfoBubble.tsx
import React, { useContext, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Modal, View, ScrollView } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { Palette } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../context/LanguageContext';

interface InfoBubbleProps {
  titleEn: string;
  titleNe: string;
  bodyEn: string;
  bodyNe: string;
  iconSize?: number;
  iconColor?: string;
}

export default function InfoBubble({ titleEn, titleNe, bodyEn, bodyNe, iconSize = 13, iconColor }: InfoBubbleProps) {
  const { palette: t } = useContext(ThemeContext);
  const styles = makeStyles(t);
  const icon = iconColor ?? t.muted;
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)} style={styles.iconBtn}>
        <Ionicons name="information-circle-outline" size={iconSize} color={icon} />
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.sheetTitle}>{isNe ? titleNe : titleEn}</Text>
            <ScrollView><Text style={styles.sheetBody}>{isNe ? bodyNe : bodyEn}</Text></ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setVisible(false)}>
              <Text style={styles.closeBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const makeStyles = (t: Palette) => StyleSheet.create({
  iconBtn: { padding: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: t.surface, borderRadius: 16, padding: 24, maxHeight: '60%' },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: t.text, marginBottom: 10 },
  sheetBody: { fontSize: 14, color: t.muted, lineHeight: 22 },
  closeBtn: { backgroundColor: t.clay, borderRadius: 28, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  closeBtnText: { color: t.onAccent, fontSize: 16, fontWeight: '700' },
});
