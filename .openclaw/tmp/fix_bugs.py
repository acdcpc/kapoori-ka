import re

# ============================================================
# BUG 3: Vaccine date dependency chain
# ============================================================
# The user wants: when a vaccine date is set, dependent dates recalculate
# 6-week → 10-week (+4 weeks = 28 days) → 14-week (+4 weeks)
# For vaccines, this means: if opv1 date changes, opv2 and opv3 recalculate
# Currently all dates are computed from DOB, not from the previous vaccine's actual date.

with open('src/screens/ImmunizationScreen.tsx') as f:
    im_content = f.read()

# After confirmSetStatus saves a vaccine, we need to recalculate dependent dates.
# The 6-week group (ageInDays=42): penta1, opv1, pcv1, rota1
# The 10-week group (ageInDays=70): penta2, opv2, pcv2, rota2
# The 14-week group (ageInDays=98): penta3, opv3, fipv1

# When a 6-week vaccine date changes:
#   10-week = 6-week date + 28 days
#   14-week = 10-week date + 28 days

# Let me add a recalculateDependentDates function and call it after save

recalc_func = '''
  // Recalculate dependent vaccine dates after a status change.
  // 6-week → 10-week (+28 days) → 14-week (+28 days)
  const recalcDependentDates = async (vaccineId: string, newGivenDate: string) => {
    // Map of vaccine groups by age
    const sixWeekIds = ['penta1', 'opv1', 'pcv1', 'rota1'];
    const tenWeekIds = ['penta2', 'opv2', 'pcv2', 'rota2'];
    const fourteenWeekIds = ['penta3', 'opv3', 'fipv1'];

    const isSixWeek = sixWeekIds.includes(vaccineId);
    const isTenWeek = tenWeekIds.includes(vaccineId);

    if (!isSixWeek && !isTenWeek) return; // No dependents to recalculate

    const baseDate = dayjs(newGivenDate);
    const tenWeekDate = baseDate.add(28, 'day').format('YYYY-MM-DD');
    const fourteenWeekDate = baseDate.add(56, 'day').format('YYYY-MM-DD');

    try {
      // Update 10-week vaccines (derived from 6-week date)
      if (isSixWeek) {
        for (const vid of tenWeekIds) {
          await supabase.from('vaccinations')
            .upsert({
              child_id: child.id,
              user_id: user?.uid || '',
              vaccine_name: vid,
              scheduled_date: tenWeekDate,
            }, { onConflict: 'child_id, vaccine_name' });
        }
        // Also update 14-week (derived from 6-week + 56 days)
        for (const vid of fourteenWeekIds) {
          await supabase.from('vaccinations')
            .upsert({
              child_id: child.id,
              user_id: user?.uid || '',
              vaccine_name: vid,
              scheduled_date: fourteenWeekDate,
            }, { onConflict: 'child_id, vaccine_name' });
        }
      }

      // Update 14-week vaccines (derived from 10-week date)
      if (isTenWeek) {
        const tenWeekBase = dayjs(newGivenDate);
        const fromTenWeek14 = tenWeekBase.add(28, 'day').format('YYYY-MM-DD');
        for (const vid of fourteenWeekIds) {
          await supabase.from('vaccinations')
            .upsert({
              child_id: child.id,
              user_id: user?.uid || '',
              vaccine_name: vid,
              scheduled_date: fromTenWeek14,
            }, { onConflict: 'child_id, vaccine_name' });
        }
      }

      // Reload to reflect new dates
      await loadRecords();
    } catch (e: any) {
      console.error('Recalc dependent dates error:', e?.message || e);
    }
  };
'''

# Insert after the confirmSetStatus function, before the loading check
insert_after = "      Alert.alert('Error', 'Could not save.');\n    }\n  };"
if insert_after in im_content:
    im_content = im_content.replace(insert_after, insert_after + '\n' + recalc_func, 1)
    print("BUG 3: recalcDependentDates inserted")
else:
    print("BUG 3: ERROR - insert point not found")

# Now add the call to recalc after a successful save in confirmSetStatus
# Find: "await loadRecords();" after a status update
# Replace with: "await loadRecords(); await recalcDependentDates(vaccine.id, givenDate);"
old_reload = "      await loadRecords();\n      setShowConfetti(true);"
new_reload = "      await loadRecords();\n      await recalcDependentDates(vaccine.id, givenDate);\n      setShowConfetti(true);"
if old_reload in im_content:
    im_content = im_content.replace(old_reload, new_reload)
    print("BUG 3: recalcDependentDates call added after save")
else:
    print("BUG 3: ERROR - reload point not found")

with open('src/screens/ImmunizationScreen.tsx', 'w') as f:
    f.write(im_content)


# ============================================================
# BUG 4: Profile photo edit from dashboard
# ============================================================
with open('src/screens/ChildDashboard.tsx') as f:
    dash_content = f.read()

# The avatar section needs:
# 1. Wrap in TouchableOpacity
# 2. Add a camera icon overlay
# 3. On press → open ImagePicker (same as AddChildScreen)
# 4. Upload to Supabase Storage
# 5. Update child profile record

# Add imports if not already present
if "import * as ImagePicker from 'expo-image-picker'" not in dash_content:
    # Add after the last import
    last_import = dash_content.rindex("import {")
    # Find the end of the import block
    import_end = dash_content.index("export default", last_import)
    # Need to find exact point - let me add after Ionicons import
    io_import = dash_content.find("import { Ionicons } from '@expo/vector-icons'")
    if io_import >= 0:
        io_line_end = dash_content.index('\n', io_import)
        dash_content = dash_content[:io_line_end+1] + "import * as ImagePicker from 'expo-image-picker';\nimport * as ImageManipulator from 'expo-image-manipulator';" + dash_content[io_line_end+1:]
        print("BUG 4: ImagePicker import added")

# Replace the avatar circle with a touchable version
old_avatar = """        {/* Avatar — 64×64 circle with initials */}
        <View style={styles.avatarCircle}>
          {child.photoUri ? (
            <Image source={{ uri: child.photoUri }} style={styles.avatarPhoto} />
          ) : (
            <Text style={styles.avatarInitials}>{initials}</Text>
          )}
        </View>"""

new_avatar = """        {/* Avatar — 64×64 circle, tap to change photo */}
        <TouchableOpacity onPress={handleChangePhoto} style={styles.avatarCircle}>
          {child.photoUri ? (
            <>
              <Image source={{ uri: child.photoUri }} style={styles.avatarPhoto} />
              <View style={styles.avatarEditOverlay}>
                <Ionicons name="camera" size={14} color="#FFF" />
              </View>
            </>
          ) : (
            <View style={styles.avatarPlaceholderWrap}>
              <Text style={styles.avatarInitials}>{initials}</Text>
              <View style={styles.avatarEditOverlay}>
                <Ionicons name="camera-outline" size={16} color="#7A6E65" />
              </View>
            </View>
          )}
        </TouchableOpacity>"""

if old_avatar in dash_content:
    dash_content = dash_content.replace(old_avatar, new_avatar)
    print("BUG 4: Avatar replaced with touchable")
else:
    print("BUG 4: ERROR - avatar not found")

# Add handleChangePhoto function
# Insert before the handleDelete function
old_delete = "  const handleDelete = async () => {"
photo_handler = """  const handleChangePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(isNe ? 'अनुमति अस्वीकृत' : 'Permission denied',
          isNe ? 'फोटो लिन क्यामेराको अनुमति चाहिन्छ।' : 'Camera permission is needed.');
        return;
      }

      Alert.alert(
        isNe ? 'फोटो थप्नुहोस्' : 'Add Photo',
        isNe ? 'क्यामेरा प्रयोग गर्नुहोस् वा ग्यालरीबाट छान्नुहोस्।' : 'Use camera or choose from gallery.',
        [
          {
            text: isNe ? 'क्यामेरा' : 'Camera',
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                quality: 0.7, allowsEditing: true, aspect: [1, 1],
              });
              if (!result.canceled && result.assets?.[0]) {
                await uploadAndSavePhoto(result.assets[0].uri);
              }
            },
          },
          {
            text: isNe ? 'ग्यालरी' : 'Gallery',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.7, allowsEditing: true, aspect: [1, 1],
              });
              if (!result.canceled && result.assets?.[0]) {
                await uploadAndSavePhoto(result.assets[0].uri);
              }
            },
          },
          { text: isNe ? 'रद्द गर्नुहोस्' : 'Cancel', style: 'cancel' },
        ],
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not change photo.');
    }
  };

  const uploadAndSavePhoto = async (uri: string) => {
    try {
      setLoading(true);
      const FileSystem = require('expo-file-system');
      const destDir = FileSystem.documentDirectory + 'child-photos/';
      await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
      const filename = `child-${child.id}-${Date.now()}.jpg`;
      const destPath = destDir + filename;

      // Resize to max 512px
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 512 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      await FileSystem.copyAsync({ from: manipResult.uri, to: destPath });

      // Upload to Supabase Storage
      const base64 = await FileSystem.readAsStringAsync(destPath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const storagePath = `${user?.uid}/${child.id}/photo.jpg`;
      await supabase.storage.from('child-photos').upload(storagePath,
        decode(base64), { upsert: true, contentType: 'image/jpeg' });

      const { data: urlData } = supabase.storage.from('child-photos')
        .getPublicUrl(storagePath);

      await supabase.from('children').update({ photo_uri: urlData.publicUrl })
        .eq('id', child.id);

      // Update local child ref
      child.photoUri = urlData.publicUrl;
      setLoading(false);
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Error', e?.message || 'Could not upload photo.');
    }
  };

  const handleDelete = async () => {"""

if old_delete in dash_content:
    dash_content = dash_content.replace(old_delete, photo_handler + '\n' + old_delete)
    print("BUG 4: handleChangePhoto added")
else:
    print("BUG 4: ERROR - delete handler not found")

# Add styles for the edit overlay
old_styles_end = "const styles = StyleSheet.create({"
# Find the closing of styles
styles_match = list(re.finditer(r'const styles = StyleSheet\.create\(\{', dash_content))
if styles_match:
    # Insert avatarEditOverlay and avatarPlaceholderWrap before the closing of styles
    idx = dash_content.find("});", styles_match[-1].start())
    if idx >= 0:
        new_styles = """  avatarEditOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12,
    width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
  },
  avatarPlaceholderWrap: {
    width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center',
  },
"""
        dash_content = dash_content[:idx] + new_styles + dash_content[idx:]
        print("BUG 4: Styles added")

with open('src/screens/ChildDashboard.tsx', 'w') as f:
    f.write(dash_content)

