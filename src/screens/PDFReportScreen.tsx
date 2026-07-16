// src/screens/PDFReportScreen.tsx
import React, { useState, useContext } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { LanguageContext } from '../context/LanguageContext';
import { translations } from '../i18n/translations';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import dayjs from 'dayjs';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { PremiumGuard } from '../components/PremiumGuard';

// BS ↔ AD conversion for PDF
const BS_MONTHS_NE = [
  'बैशाख','जेठ','असार','श्रावण','भाद्र','आश्विन',
  'कार्तिक','मंसिर','पुष','माघ','फाल्गुन','चैत्र',
];
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
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,31,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,31,32,32,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[30,32,31,32,31,30,30,30,29,30,29,31],
  [31,31,32,31,31,31,30,29,30,29,30,30],[31,31,32,31,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],[31,31,32,32,31,30,30,29,30,29,30,30],
  [31,32,31,32,31,30,30,30,29,29,30,31],
];
const BS_START_YEAR = 2000;
const AD_REF = new Date(1943, 3, 13);

function adToBs(adDateStr: string): string {
  try {
    const adDate = new Date(adDateStr);
    let diff = Math.floor((adDate.getTime() - AD_REF.getTime()) / 86400000);
    if (diff < 0) return adDateStr;
    let year = BS_START_YEAR;
    let month = 1;
    while (true) {
      const yearIdx = year - BS_START_YEAR;
      if (yearIdx >= BS_YEAR_DATA.length) break;
      let yearDays = 0;
      for (let m = 0; m < 12; m++) yearDays += BS_YEAR_DATA[yearIdx][m];
      if (diff < yearDays) break;
      diff -= yearDays;
      year++;
    }
    const yearIdx = year - BS_START_YEAR;
    while (true) {
      const monthDays = BS_YEAR_DATA[yearIdx][month - 1];
      if (diff < monthDays) break;
      diff -= monthDays;
      month++;
    }
    const day = diff + 1;
    const toNe = (n: number) => n.toString().split('').map(d => '०१२३४५६७८९'[parseInt(d)]).join('');
    return `${toNe(year)} ${BS_MONTHS_NE[month - 1]} ${toNe(day)}`;
  } catch { return adDateStr; }
}

type Props = NativeStackScreenProps<RootStackParamList, 'PDFReport'>;

export default function PDFReportScreen({ route }: Props) {
  const { child } = route.params || {};
  const { language } = useContext(LanguageContext);
  const isNe = language === 'ne';

  const [generating, setGenerating] = useState(false);

  const generatePDF = async () => {
    if (!child) {
      return Alert.alert('Error', isNe ? 'बच्चाको डाटा उपलब्ध छैन' : 'No child data available');
    }

    setGenerating(true);

    try {
      const user = auth.currentUser;
      const gQuery = query(
        collection(db, 'growth_records'), 
        where('childId', '==', child.id),
        where('ownerId', '==', user?.uid || 'anonymous')
      );
      const gSnap = await getDocs(gQuery);
      const growthData: any[] = [];
      gSnap.forEach(doc => growthData.push(doc.data()));
      growthData.sort((a, b) => a.date.localeCompare(b.date));

      const vQuery = query(
        collection(db, 'vaccinations'), 
        where('childId', '==', child.id),
        where('ownerId', '==', user?.uid || 'anonymous')
      );
      const vSnap = await getDocs(vQuery);
      const vaccineRecords: any[] = [];
      vSnap.forEach(doc => vaccineRecords.push(doc.data()));
      vaccineRecords.sort((a, b) => (a.givenDate || '').localeCompare(b.givenDate || ''));

      const htmlContent = `
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; color: #333; }
              h1 { text-align: center; color: #1a73e8; }
              h2 { color: #444; margin-top: 30px; }
              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
              th { background-color: #f0f4f8; }
              .center { text-align: center; }
            </style>
          </head>
          <body>
            <h1>${isNe ? 'बाल स्वास्थ्य रिपोर्ट' : 'Child Health Report'}</h1>
            <h2 class="center">${child.name} ${child.nameNepali ? `(${child.nameNepali})` : ''}</h2>
            
            <p><strong>${isNe ? 'जन्म मिति' : 'Date of Birth'}:</strong> ${isNe ? adToBs(child.dateOfBirth) : child.dateOfBirth}</p>
            <p><strong>${isNe ? 'लिंग' : 'Sex'}:</strong> ${child.sex === 'male' ? (isNe ? 'छोरा' : 'Male') : (isNe ? 'छोरी' : 'Female')}</p>

            <h2>${isNe ? 'वृद्धि विवरण' : 'Growth Records'}</h2>
            <table>
              <tr>
                <th>${isNe ? 'मिति' : 'Date'}</th>
                <th>${isNe ? 'तौल (किग्रा)' : 'Weight (kg)'}</th>
                <th>${isNe ? 'उचाइ (से.मि.)' : 'Height (cm)'}</th>
              </tr>
              ${growthData.map((r: any) => `
                <tr>
                  <td>${isNe ? adToBs(r.date) : r.date}</td>
                  <td>${r.weight || '-'}</td>
                  <td>${r.height || '-'}</td>
                </tr>
              `).join('')}
            </table>

            <h2>${isNe ? 'खोप विवरण' : 'Vaccination Records'}</h2>
            <table>
              <tr>
                <th>${isNe ? 'खोप' : 'Vaccine'}</th>
                <th>${isNe ? 'दिइएको मिति' : 'Given Date'}</th>
              </tr>
              ${vaccineRecords.map((v: any) => `
                <tr>
                  <td>${isNe ? (v.vaccineNameNepali || v.vaccineName) : v.vaccineName}</td>
                  <td>${v.givenDate ? (isNe ? adToBs(v.givenDate) : v.givenDate) : '-'}</td>
                </tr>
              `).join('')}
            </table>

            <p class="center" style="margin-top: 50px; color: #777; font-size: 12px;">
              Generated on ${dayjs().format('YYYY-MM-DD HH:mm')}
            </p>
          </body>
        </html>
      `;

      const { uri: tempUri } = await Print.printToFileAsync({ 
        html: htmlContent,
      });

      const fileName = `Growth_Report_${child.name.replace(/\s+/g, '_')}_${dayjs().format('YYYYMMDD')}.pdf`;
      const safeUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.copyAsync({
        from: tempUri,
        to: safeUri
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(safeUri, {
          mimeType: 'application/pdf',
          dialogTitle: isNe ? 'रिपोर्ट शेयर गर्नुहोस्' : 'Share Child Report',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert(isNe ? 'सफल' : 'Success', isNe ? 'PDF तयार भयो!' : 'PDF generated successfully!');
      }
    } catch (error: any) {
      console.error('PDF Error:', error);
      Alert.alert(
        'Error',
        isNe 
          ? 'PDF बनाउन समस्या भयो। कृपया फेरि प्रयास गर्नुहोस्।' 
          : 'Failed to generate PDF. Please try again.'
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <PremiumGuard feature="growth_report" onUpgrade={() => navigation.navigate('Subscription')}>
      <View style={styles.container}>
        <Text style={styles.title}>
          {isNe ? 'PDF स्वास्थ्य रिपोर्ट' : 'Generate PDF Health Report'}
        </Text>
        
        <Text style={styles.childName}>
          {child?.name} {child?.nameNepali ? `(${child.nameNepali})` : ''}
        </Text>

        <TouchableOpacity
          style={[styles.generateButton, generating && styles.buttonDisabled]}
          onPress={generatePDF}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <Text style={styles.buttonText}>
              {isNe ? '📄 PDF रिपोर्ट तयार पार्नुहोस्' : '📄 Generate & Share PDF Report'}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          {isNe 
            ? 'PDF तयार भएपछि शेयर गर्न सकिनेछ।' 
            : 'The PDF will be generated and ready to share.'}
        </Text>
      </View>
    </PremiumGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 12,
    textAlign: 'center',
  },
  childName: {
    fontSize: 18,
    color: '#333',
    marginBottom: 40,
    textAlign: 'center',
    fontWeight: '600',
  },
  generateButton: {
    backgroundColor: '#1a73e8',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  note: {
    marginTop: 30,
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});
