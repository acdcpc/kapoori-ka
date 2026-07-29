// src/components/InfoBubble.tsx
import React, { useContext, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Modal, View, ScrollView } from 'react-native';
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

export default function InfoBubble({ titleEn, titleNe, bodyEn, bodyNe, iconSize = 13, iconColor = '#7A6E65' }: InfoBubbleProps) {
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)} style={styles.iconBtn}>
        <Ionicons name="information-circle-outline" size={iconSize} color={iconColor} />
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

const styles = StyleSheet.create({
  iconBtn: { padding: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: '#FDF8F2', borderRadius: 16, padding: 24, maxHeight: '60%' },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
  sheetBody: { fontSize: 14, color: '#7A6E65', lineHeight: 22 },
  closeBtn: { backgroundColor: '#E8602C', borderRadius: 28, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  closeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
