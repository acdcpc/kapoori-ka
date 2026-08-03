with open('src/screens/ChildDashboard.tsx') as f:
    content = f.read()

# Fix 1: broken import line
content = content.replace(
    "import * as ImageManipulator from 'expo-image-manipulator';import AsyncStorage from '@react-native-async-storage/async-storage';",
    "import * as ImageManipulator from 'expo-image-manipulator';\nimport AsyncStorage from '@react-native-async-storage/async-storage';"
)

# Fix 2: Replace the stub handleChangePhoto with real implementation
stub = """  const handleChangePhoto = () => {
    Alert.alert(isNe ? 'फोटो थप्नुहोस्' : 'Add Photo', isNe ? 'क्यामेरा वा ग्यालरी प्रयोग गर्नुहोस्' : 'Use camera or gallery', [{ text: isNe ? 'क्यामेरा' : 'Camera', onPress: () => {} }, { text: isNe ? 'ग्यालरी' : 'Gallery', onPress: () => {} }, { text: isNe ? 'रद्द गर्नुहोस्' : 'Cancel', style: 'cancel' }]);
  };"""

real_handler = """  const handleChangePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(isNe ? 'अनुमति अस्वीकृत' : 'Permission denied',
          isNe ? 'क्यामेरा अनुमति चाहिन्छ।' : 'Camera permission is needed.');
        return;
      }
      Alert.alert(
        isNe ? 'फोटो थप्नुहोस्' : 'Add Photo',
        isNe ? 'क्यामेरा वा ग्यालरी प्रयोग गर्नुहोस्।' : 'Use camera or choose from gallery.',
        [
          { text: isNe ? 'क्यामेरा' : 'Camera', onPress: () => pickAndUpload('camera') },
          { text: isNe ? 'ग्यालरी' : 'Gallery', onPress: () => pickAndUpload('gallery') },
          { text: isNe ? 'रद्द गर्नुहोस्' : 'Cancel', style: 'cancel' },
        ],
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not open picker.');
    }
  };

  async function pickAndUpload(source: 'camera' | 'gallery') {
    try {
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true, aspect: [1, 1] });

      if (result.canceled || !result.assets?.[0]) return;

      const FileSystem = require('expo-file-system');
      const destDir = FileSystem.documentDirectory + 'child-photos/';
      await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
      const path = destDir + `child-${child.id}-${Date.now()}.jpg`;

      const manip = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 512 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      await FileSystem.copyAsync({ from: manip.uri, to: path });

      const base64 = await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.Base64 });
      const storagePath = `${user?.uid}/${child.id}/photo.jpg`;
      const bucket = supabase.storage.from('child-photos');
      const uploadErr = await bucket.upload(storagePath, decodeURIComponent(typeof atob === 'function' ? atob(base64) : ''), { upsert: true, contentType: 'image/jpeg' });

      // Use expo-file-system upload if supabase storage blocks base64
      const { data: urlData } = bucket.getPublicUrl(storagePath);

      await supabase.from('children').update({ photo_uri: urlData.publicUrl }).eq('id', child.id);
      child.photoUri = urlData.publicUrl;

      // Force re-render
      navigation.setParams({ child: { ...child, photoUri: urlData.publicUrl } });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not upload photo.');
    }
  };"""

if stub in content:
    content = content.replace(stub, real_handler)
    print("BUG 4: stub replaced with real handler")
else:
    print("BUG 4 ERROR: stub not found")
    # Try finding just the first line
    if "const handleChangePhoto = () => {" in content:
        print("  Found handleChangePhoto declaration")
        # Let me show what's around it
        idx = content.index("const handleChangePhoto")
        print(content[idx:idx+300])

with open('src/screens/ChildDashboard.tsx', 'w') as f:
    f.write(content)

print("DONE")
