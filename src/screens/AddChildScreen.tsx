// src/screens/AddChildScreen.tsx
import React, { useContext, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, Modal, FlatList, StatusBar
} from 'react-native';
import { collection, addDoc } from 'firebase/firestore';
import dayjs from 'dayjs';
import { db, auth } from '../../firebase';
import { LanguageContext } from '../context/LanguageContext';
import { translations } from '../i18n/translations';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import NepaliDate from 'nepali-date-converter';

type AddChildScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddChild'>;
};

// ─────────────────────────────────────────────────────────────────
// BS ↔ AD conversion
// ─────────────────────────────────────────────────────────────────
const BS_MONTHS_NE = ['बैशाख','जेठ','असार','श्रावण','भाद्र','आश्विन','कार्तिक','मंसिर','पुष','माघ','फाल्गुन','चैत्र'];
const BS_YEAR_DATA: number[][] = [
  [30,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,31,32,32,31,30,30,29,30,29,30,30],[31,32,31,32,31,30,30,30,29,29,30,31],
  [30,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,30,30,29,30,29,30,30],[31,31,32,32,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,31,31,32,31,31,29,30,30,29,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,32,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,30,30,30,29,30,29,31],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,31,32,32,31,30,30,29,30,29,30,30],[31,32,31,32,31,30,30,30,29,29,30,31],
  [30,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,31,32,31,31,30,30,29,30,29,30,30],[31,32,31,32,31,30,30,30,29,29,30,31],
  [30,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,31,32,31,31,30,30,29,30,29,30,30],[31,32,31,32,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,31,32,32,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,31,32,32,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,31,32,32,31,30,30,29,30,29,30,30],
  // 2056 - 2060
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],
  // 2061 - 2070
  [31,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,32,31,32,31,30,30,30,29,29,30,31],
  [31,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,32,31,32,31,30,30,30,29,29,30,31],
  [31,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  // 2071 - 2080
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,32,31,32,31,30,30,30,29,29,30,31],
  [31,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,32,31,32,31,30,30,30,29,29,30,31],
  [31,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,32,31,32,31,30,30,30,29,29,30,31],
  // 2081 - 2091
  [31,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,32,31,32,31,30,30,30,29,29,30,31],
  [31,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,32,31,32,31,30,30,30,29,29,30,31],
  [31,32,31,32,31,30,30,30,29,30,29,31],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,31,32,31,31,31,30,29,30,29,30,30],
];
const BS_START_YEAR = 2000;
const AD_REF = new Date(1943, 3, 13);

function bsToAd(bsYear: number, bsMonth: number, bsDay: number): string | null {
  try {
    const yearIndex = bsYear - BS_START_YEAR;
    if (yearIndex < 0 || yearIndex >= BS_YEAR_DATA.length) return null;
    let totalDays = 0;
    for (let y = 0; y < yearIndex; y++)
      for (let m = 0; m < 12; m++) totalDays += BS_YEAR_DATA[y][m];
    for (let m = 0; m < bsMonth - 1; m++) totalDays += BS_YEAR_DATA[yearIndex][m];
    totalDays += bsDay - 1;
    const adDate = new Date(AD_REF.getTime() + totalDays * 86400000);
    return dayjs(adDate).format('YYYY-MM-DD');
  } catch { return null; }
}

function bsDaysInMonth(bsYear: number, bsMonth: number): number {
  const idx = bsYear - BS_START_YEAR;
  if (idx < 0 || idx >= BS_YEAR_DATA.length) return 30;
  return BS_YEAR_DATA[idx][bsMonth - 1];
}

const BS_YEARS = Array.from({ length: BS_YEAR_DATA.length }, (_, i) => BS_START_YEAR + i);
const BS_MONTHS_LIST = Array.from({ length: 12 }, (_, i) => i + 1);

const toNepaliDigits = (n: number) =>
  n.toString().split('').map(d => '०१२३४५६७८९'[parseInt(d)] ?? d).join('');

// Improved ScrollPicker
function ScrollPicker({ items, selectedValue, onSelect }: {
  items: { label: string; value: number | string }[];
  selectedValue: number | string;
  onSelect: (v: any) => void;
}) {
  const initIdx = Math.max(0, items.findIndex(i => i.value === selectedValue));
  return (
    <FlatList
      data={items}
      keyExtractor={i => String(i.value)}
      style={{ maxHeight: 200 }}
      showsVerticalScrollIndicator={true}
      initialScrollIndex={initIdx > 0 ? initIdx : undefined}
      getItemLayout={(_, index) => ({ length: 44, offset: 44 * index, index })}
      nestedScrollEnabled={true}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[pickerSt.item, item.value === selectedValue && pickerSt.itemSel]}
          onPress={() => onSelect(item.value)}
        >
          <Text style={[pickerSt.itemTxt, item.value === selectedValue && pickerSt.itemTxtSel]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}
const pickerSt = StyleSheet.create({
  item: { height: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 8 },
  itemSel: { backgroundColor: '#e8f0fe' },
  itemTxt: { fontSize: 15, color: '#444' },
  itemTxtSel: { color: '#1a73e8', fontWeight: '700' },
});

export default function AddChildScreen({ navigation }: AddChildScreenProps) {
  const { language } = useContext(LanguageContext);
  const t = translations[language];
  const isNe = language === 'ne';

  const [name, setName] = useState('');
  const [nameNepali, setNameNepali] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [parentPhone, setParentPhone] = useState('');

  // English Date Data
  const today = dayjs();
  const [dateAD, setDateAD] = useState(today.format('YYYY-MM-DD'));
  const AD_YEARS = Array.from({ length: 41 }, (_, i) => 2010 + i); // 2010 to 2050
  const AD_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // Nepali Date Data
  const [bsYear, setBsYear] = useState(2081);
  const [bsMonth, setBsMonth] = useState(3);
  const [bsDay, setBsDay] = useState(5);
  
  const [showPicker, setShowPicker] = useState(false);

  const [birthWeight, setBirthWeight] = useState('');
  const [birthLength, setBirthLength] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [currentHeight, setCurrentHeight] = useState('');
  const [saving, setSaving] = useState(false);

  const derivedDobAD = isNe 
    ? (bsToAd(bsYear, bsMonth, bsDay) ?? '') 
    : dateAD;

  const validateAndSave = async () => {
    const storedName = name.trim() || nameNepali.trim();
    if (!storedName)
      return Alert.alert('Error', isNe ? 'बच्चाको नाम हाल्नुहोस्' : "Please enter child's name");

    if (!derivedDobAD || !/^\d{4}-\d{2}-\d{2}$/.test(derivedDobAD))
      return Alert.alert('Error', isNe ? 'कृपया सही जन्म मिति छान्नुहोस्' : 'Please enter a valid date of birth (YYYY-MM-DD)');

    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) return Alert.alert('Error', isNe ? 'कृपया पहिले लगइन गर्नुहोस्' : 'Please login first');

      const childRef = await addDoc(collection(db, 'children'), {
        ownerId: user.uid,
        name: storedName,
        nameNepali: nameNepali.trim(),
        dateOfBirth: derivedDobAD,
        sex,
        birthWeight: birthWeight ? parseFloat(birthWeight) : null,
        birthLength: birthLength ? parseFloat(birthLength) : null,
        parentPhone: parentPhone.trim(),
        createdAt: dayjs().toISOString(),
      });

      // Save birth record if weight/length provided
      if (birthWeight || birthLength) {
        let bsDateStr = '';
        try {
          const bs = new NepaliDate(new Date(derivedDobAD));
          bsDateStr = bs.format('YYYY-MM-DD');
        } catch(e) {}
        await addDoc(collection(db, 'growth_records'), {
          childId: childRef.id,
          ownerId: user.uid,
          date: derivedDobAD,
          bsDate: bsDateStr,
          weight: birthWeight ? parseFloat(birthWeight) : null,
          height: birthLength ? parseFloat(birthLength) : null,
          notes: isNe ? 'जन्मको नाप' : 'Birth measurement',
          createdAt: dayjs().toISOString(),
        });
      }

      // Save current record if weight/height provided and different from birth date
      if ((currentWeight || currentHeight) && dayjs().format('YYYY-MM-DD') !== derivedDobAD) {
        await addDoc(collection(db, 'growth_records'), {
          childId: childRef.id,
          ownerId: user.uid,
          date: dayjs().format('YYYY-MM-DD'),
          weight: currentWeight ? parseFloat(currentWeight) : null,
          height: currentHeight ? parseFloat(currentHeight) : null,
          notes: isNe ? 'सुरुको हालको नाप' : 'Initial current measurement',
          createdAt: dayjs().toISOString(),
        });
      }

      Alert.alert('Success', `${storedName} added!`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch {
      Alert.alert('Error', 'Could not save.');
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.form}>
          <Text style={styles.label}>{isNe ? 'बच्चाको नाम (देवनागरीमा) *' : "Child's Name *"}</Text>
          {isNe ? (
            <>
              <TextInput 
                style={[styles.input, { fontSize: 18 }]} 
                value={nameNepali} 
                onChangeText={setNameNepali} 
                placeholder={'जस्तै:एलिशा कार्की'} 
              />
              <Text style={styles.hintText}>{isNe ? 'माथि देवनागरीमा बच्चाको नाम लेख्नुहोस्' : ''}</Text>
            </>
          ) : (
            <TextInput 
              style={styles.input} 
              value={name} 
              onChangeText={setName} 
              placeholder={'e.g.,Alisha Karki'} 
            />
          )}
          {isNe && nameNepali.trim() && (
            <Text style={styles.hintText}>{isNe ? 'रोमनमा पनि नाम (वैकल्पिक):' : 'Name in Roman (optional):'}</Text>
          )}
          {isNe && <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={'e.g., Alisha Karki'} />}
          
          <Text style={styles.label}>{t.sex}</Text>
          <View style={styles.sexContainer}>
            <TouchableOpacity style={[styles.sexBtn, sex === 'male' && styles.sexBtnActive]} onPress={() => setSex('male')}>
              <Text style={[styles.sexBtnText, sex === 'male' && styles.sexBtnTextActive]}>{t.male}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sexBtn, sex === 'female' && styles.sexBtnActive]} onPress={() => setSex('female')}>
              <Text style={[styles.sexBtnText, sex === 'female' && styles.sexBtnTextActive]}>{t.female}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>{t.dateOfBirth}</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker(true)}>
            <Text style={styles.dateBtnText}>
              {isNe 
                ? `${toNepaliDigits(bsYear)} ${BS_MONTHS_NE[bsMonth - 1]} ${toNepaliDigits(bsDay)}`
                : dayjs(dateAD).format('DD MMM YYYY')}
            </Text>
          </TouchableOpacity>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>{isNe ? 'जन्मको तौल (किग्रा)' : 'Birth Weight (kg)'}</Text>
              <TextInput style={styles.input} keyboardType="decimal-pad" value={birthWeight} onChangeText={setBirthWeight} placeholder="e.g., 3.2" />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>{isNe ? 'जन्मको लम्बाइ (सेमी)' : 'Birth Length (cm)'}</Text>
              <TextInput style={styles.input} keyboardType="decimal-pad" value={birthLength} onChangeText={setBirthLength} placeholder="e.g., 50" />
            </View>
          </View>

          <Text style={styles.sectionLabel}>{isNe ? '— हालको नाप (यदि लागू भएमा) —' : '— Current Measurements (if applicable) —'}</Text>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>{isNe ? 'हालको तौल (किग्रा)' : 'Current Weight (kg)'}</Text>
              <TextInput style={styles.input} keyboardType="decimal-pad" value={currentWeight} onChangeText={setCurrentWeight} placeholder="e.g., 5.5" />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>{isNe ? 'हालको उचाइ (सेमी)' : 'Current Height (cm)'}</Text>
              <TextInput style={styles.input} keyboardType="decimal-pad" value={currentHeight} onChangeText={setCurrentHeight} placeholder="e.g., 65" />
            </View>
          </View>

          <Text style={styles.label}>{isNe ? 'अभिभावकको फोन' : "Parent's Phone"}</Text>
          <TextInput style={styles.input} keyboardType="phone-pad" value={parentPhone} onChangeText={setParentPhone} placeholder="e.g., 98XXXXXXXX" />

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={validateAndSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? t.saving : t.save}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showPicker} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isNe ? 'मिति चयन गर्नुहोस्' : 'Select Date'}</Text>
            <View style={styles.pickerRow}>
              {isNe ? (
                <>
                  <View style={styles.pickerCol}><ScrollPicker items={BS_YEARS.map(y => ({ label: toNepaliDigits(y), value: y }))} selectedValue={bsYear} onSelect={setBsYear} /></View>
                  <View style={styles.pickerCol}><ScrollPicker items={BS_MONTHS_LIST.map(m => ({ label: BS_MONTHS_NE[m-1], value: m }))} selectedValue={bsMonth} onSelect={setBsMonth} /></View>
                  <View style={styles.pickerCol}><ScrollPicker items={Array.from({ length: bsDaysInMonth(bsYear, bsMonth) }, (_, i) => ({ label: toNepaliDigits(i + 1), value: i + 1 }))} selectedValue={bsDay} onSelect={setBsDay} /></View>
                </>
              ) : (
                <>
                  <View style={styles.pickerCol}><ScrollPicker items={AD_YEARS.map(y => ({ label: y.toString(), value: y }))} selectedValue={dayjs(dateAD).year()} onSelect={(y) => setDateAD(dayjs(dateAD).year(y).format('YYYY-MM-DD'))} /></View>
                  <View style={styles.pickerCol}><ScrollPicker items={AD_MONTHS.map(m => ({ label: dayjs().month(m-1).format('MMM'), value: m }))} selectedValue={dayjs(dateAD).month() + 1} onSelect={(m) => setDateAD(dayjs(dateAD).month(m-1).format('YYYY-MM-DD'))} /></View>
                  <View style={styles.pickerCol}><ScrollPicker items={Array.from({ length: dayjs(dateAD).daysInMonth() }, (_, i) => ({ label: (i+1).toString(), value: i+1 }))} selectedValue={dayjs(dateAD).date()} onSelect={(d) => setDateAD(dayjs(dateAD).date(d).format('YYYY-MM-DD'))} /></View>
                </>
              )}
            </View>
            <TouchableOpacity style={styles.doneBtn} onPress={() => setShowPicker(false)}>
              <Text style={styles.doneBtnText}>{isNe ? 'ठिक छ' : 'Done'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  formHeader: { backgroundColor: '#1a73e8', paddingVertical: 24, paddingHorizontal: 20, alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 8 },
  formHeaderIcon: { fontSize: 40, marginBottom: 8 },
  formHeaderTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  formHeaderSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4, textAlign: 'center' },
  form: { padding: 20, paddingBottom: 120 },
  label: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 16, color: '#222' },
  row: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  sexContainer: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  sexBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#eee', alignItems: 'center' },
  sexBtnActive: { backgroundColor: '#1a73e8' },
  sexBtnText: { fontWeight: '600', color: '#666' },
  sexBtnTextActive: { color: '#fff' },
  dateBtn: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#1a73e8', borderRadius: 10, padding: 14, alignItems: 'center' },
  dateBtnText: { fontSize: 16, color: '#1a73e8', fontWeight: '700' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#1a73e8', textAlign: 'center', marginTop: 24, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  saveBtn: { backgroundColor: '#1a73e8', borderRadius: 14, padding: 18, marginTop: 36, alignItems: 'center', elevation: 4, shadowColor: '#1a73e8', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '90%', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  pickerRow: { flexDirection: 'row', height: 200 },
  pickerCol: { flex: 1 },
  doneBtn: { backgroundColor: '#1a73e8', borderRadius: 8, padding: 14, marginTop: 20, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hintText: { fontSize: 11, color: '#888', marginTop: 4, marginBottom: 4 },
});
