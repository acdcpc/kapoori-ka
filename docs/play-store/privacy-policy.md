# Privacy Policy — कपूरी क (Kapoori Ka)

**Last updated:** August 6, 2026

## 1. Introduction

कपूरी क ("Kapoori Ka", "we", "our", or "the app") is a child health tracking application built for families in Nepal. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our app.

By using कपूरी क, you agree to the practices described in this policy.

## 2. Information We Collect

### 2.1 Information You Provide

**Account Information:**
- Email address (required for account creation)
- Google account information (if using Google Sign-In)

**Child Health Information:**
- Child's name, date of birth, sex
- Weight and height measurements
- Immunization status and dates
- Developmental milestone tracking
- M-CHAT autism screening responses
- Profile photo (optional)

### 2.2 Information Collected Automatically

- **App Activity:** Screen views, feature usage, and session data (via Firebase Analytics)
- **Crash Reports:** Device information and error logs if the app crashes (via Firebase Crashlytics)
- **Device Information:** Device model, OS version, and installation ID (via Firebase Analytics)
- **Push Notification Token:** Used to send vaccine reminder notifications (via Firebase Cloud Messaging)

## 3. How We Use Your Information

We use your information to:
- Provide child health tracking services (growth charts, immunization schedule, milestones, M-CHAT screening)
- Send vaccine reminder notifications
- Authenticate your account and protect against unauthorized access
- Improve app stability and fix bugs (crash reporting)
- Understand feature usage to improve the app (analytics)

**We do NOT:**
- Sell your personal information
- Use your data for advertising or marketing
- Share your health data with third parties
- Use child data for any purpose beyond providing the app's features

## 4. How We Store and Protect Your Information

**Database:** All user and child data is stored on Supabase, with the following protections:
- Row-Level Security (RLS) enabled on all tables — each user can only access their own data
- Encryption at rest
- All data transmission uses HTTPS/TLS encryption

**Device Storage:**
- Session tokens are stored in encrypted device storage (expo-secure-store / Android Keystore)
- No user data is stored unencrypted on the device

**Authentication:**
- Email confirmation is required to activate accounts
- Google OAuth uses verified redirect URIs
- Anonymous accounts cannot access stored data

## 5. Third-Party Services

We use the following third-party services:

| Service | Purpose | Data Shared | Privacy Policy |
|---------|---------|-------------|----------------|
| Supabase | Backend database, authentication, storage | All user-entered data, auth tokens | [supabase.com/privacy](https://supabase.com/privacy) |
| Firebase Analytics (Google) | App usage analytics | App activity, device info, installation ID | [policies.google.com/privacy](https://policies.google.com/privacy) |
| Firebase Crashlytics (Google) | Crash reporting | Crash logs, device info | [policies.google.com/privacy](https://policies.google.com/privacy) |
| Firebase Cloud Messaging (Google) | Push notifications | FCM token | [policies.google.com/privacy](https://policies.google.com/privacy) |

## 6. Children's Data

कपूरी क stores health information ABOUT children, but the information is entered BY the child's parent or guardian. The app is designed for adult users and is **not directed at children under 13 years of age.**

Children's health data is:
- Entered exclusively by the parent/guardian account holder
- Protected by RLS (accessible only to the parent account)
- Never shared with third parties
- Never used for advertising
- Deletable by the parent at any time through the app

If you believe that a child under 13 has created an account and entered their own data without parental consent, please contact us immediately so we can take appropriate action.

## 7. Data Retention and Deletion

**Your data is retained as long as your account is active.** You can delete your data at any time:

- **Delete individual child records:** Through the child dashboard (Profile → Delete)
- **Delete your entire account:** Through account settings

When you delete data, it is permanently removed from Supabase servers. Firebase Analytics data follows Google's standard data retention policies.

**If an account is inactive for 24 months**, we may contact you and/or delete the account and associated data after providing reasonable notice.

## 8. Your Rights

You have the right to:
- Access all data we hold about you and your children
- Correct inaccurate data (edit child profiles, measurements, immunization records)
- Delete your data entirely
- Export your data (contact us for a data export)
- Withdraw consent for analytics data collection (disable in app settings where available)

To exercise any of these rights, use the in-app features or contact us at the email below.

## 9. Data Security

We implement industry-standard security measures:
- HTTPS/TLS for all data transmission
- Encryption at rest on all servers
- Row-Level Security on all database tables
- Email confirmation for account verification
- Encrypted local storage for session tokens

**Limitation:** No method of electronic storage or transmission is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.

## 10. Changes to This Policy

We may update this Privacy Policy from time to time. When we do, we will notify you through the app and update the "Last updated" date. Continued use of the app after changes constitutes acceptance of the updated policy.

## 11. Contact Us

If you have questions about this Privacy Policy or wish to exercise your data rights, contact us at:

**Email:** kapoori.ka@gmail.com
**Developer:** Prakash Thapa
**Location:** Kathmandu, Nepal

---

# गोपनीयता नीति — कपूरी क (Kapoori Ka)

**अन्तिम अद्यावधिक:** ६ अगस्ट २०२६

## १. परिचय

कपूरी क ("हामी", "हाम्रो", वा "एप") नेपालका परिवारहरूको लागि निर्मित बाल स्वास्थ्य ट्रयाकिङ एप हो। यो गोपनीयता नीतिले तपाईंले हाम्रो एप प्रयोग गर्दा हामीले तपाईंको व्यक्तिगत जानकारी कसरी संकलन, प्रयोग, भण्डारण र संरक्षण गर्छौं भन्ने व्याख्या गर्छ।

कपूरी क प्रयोग गरेर, तपाईं यस नीतिमा वर्णित अभ्यासहरूमा सहमत हुनुहुन्छ।

## २. हामीले संकलन गर्ने जानकारी

### २.१ तपाईंले प्रदान गर्नुभएको जानकारी

**खाता जानकारी:**
- इमेल ठेगाना (खाता सिर्जनाको लागि आवश्यक)
- गुगल खाता जानकारी (यदि गुगल साइन-इन प्रयोग गर्नुहुन्छ भने)

**बाल स्वास्थ्य जानकारी:**
- बच्चाको नाम, जन्म मिति, लिंग
- तौल र उचाइ मापनहरू
- खोप स्थिति र मितिहरू
- विकासात्मक माइलस्टोन ट्रयाकिङ
- M-CHAT अटिजम स्क्रिनिङ प्रतिक्रियाहरू
- प्रोफाइल फोटो (वैकल्पिक)

### २.२ स्वचालित रूपमा संकलित जानकारी

- **एप गतिविधि:** स्क्रिन भ्यू, सुविधा प्रयोग, र सत्र डेटा (Firebase Analytics मार्फत)
- **क्र्यास रिपोर्टहरू:** एप क्र्यास भएमा उपकरण जानकारी र त्रुटि लगहरू (Firebase Crashlytics मार्फत)
- **उपकरण जानकारी:** उपकरण मोडेल, OS संस्करण, र स्थापना ID (Firebase Analytics मार्फत)
- **पुश सूचना टोकन:** खोप रिमाइन्डर सूचनाहरू पठाउन प्रयोग (Firebase Cloud Messaging मार्फत)

## ३. हामी तपाईंको जानकारी कसरी प्रयोग गर्छौं

हामी तपाईंको जानकारी निम्नको लागि प्रयोग गर्छौं:
- बाल स्वास्थ्य ट्रयाकिङ सेवाहरू प्रदान गर्न (वृद्धि चार्ट, खोप तालिका, माइलस्टोन, M-CHAT स्क्रिनिङ)
- खोप रिमाइन्डर सूचनाहरू पठाउन
- तपाईंको खाता प्रमाणीकरण र अनाधिकृत पहुँचबाट सुरक्षा गर्न
- एप स्थिरता सुधार र बगहरू समाधान गर्न (क्र्यास रिपोर्टिङ)
- एप सुधार गर्न सुविधा प्रयोग बुझ्न (एनालिटिक्स)

**हामी गर्दैनौं:**
- तपाईंको व्यक्तिगत जानकारी बेच्दैनौं
- विज्ञापन वा मार्केटिङको लागि तपाईंको डेटा प्रयोग गर्दैनौं
- तेस्रो पक्षहरूसँग तपाईंको स्वास्थ्य डेटा साझा गर्दैनौं
- एपको सुविधाहरू प्रदान गर्नुभन्दा बाहिर बाल डेटा प्रयोग गर्दैनौं

## ४. हामी तपाईंको जानकारी कसरी भण्डारण र संरक्षण गर्छौं

**डेटाबेस:** सबै प्रयोगकर्ता र बाल डेटा Supabase मा भण्डारण गरिन्छ, निम्न सुरक्षाहरू सहित:
- सबै तालिकाहरूमा Row-Level Security (RLS) सक्षम — प्रत्येक प्रयोगकर्ताले आफ्नो डेटा मात्र पहुँच गर्न सक्छ
- आराममा इन्क्रिप्सन
- सबै डेटा प्रसारण HTTPS/TLS इन्क्रिप्सन प्रयोग गर्छ

**उपकरण भण्डारण:**
- सत्र टोकनहरू इन्क्रिप्टेड उपकरण भण्डारणमा राखिन्छ (expo-secure-store / Android Keystore)
- कुनै पनि प्रयोगकर्ता डेटा उपकरणमा अनइन्क्रिप्टेड भण्डारण गरिएको छैन

**प्रमाणीकरण:**
- खाता सक्रिय गर्न इमेल पुष्टिकरण आवश्यक
- गुगल OAuth प्रमाणित रिडाइरेक्ट URI हरू प्रयोग गर्छ
- बेनामी खाताहरूले डेटा पहुँच गर्न सक्दैनन्

## ५. तेस्रो-पक्ष सेवाहरू

हामी निम्न तेस्रो-पक्ष सेवाहरू प्रयोग गर्छौं:

| सेवा | उद्देश्य | साझा गरिएको डेटा | गोपनीयता नीति |
|------|---------|-----------------|--------------|
| Supabase | ब्याकेन्ड डेटाबेस, प्रमाणीकरण, भण्डारण | सबै प्रयोगकर्ता-प्रविष्ट डेटा, प्रमाण टोकनहरू | [supabase.com/privacy](https://supabase.com/privacy) |
| Firebase Analytics (Google) | एप प्रयोग एनालिटिक्स | एप गतिविधि, उपकरण जानकारी, स्थापना ID | [policies.google.com/privacy](https://policies.google.com/privacy) |
| Firebase Crashlytics (Google) | क्र्यास रिपोर्टिङ | क्र्यास लग, उपकरण जानकारी | [policies.google.com/privacy](https://policies.google.com/privacy) |
| Firebase Cloud Messaging (Google) | पुश सूचनाहरू | FCM टोकन | [policies.google.com/privacy](https://policies.google.com/privacy) |

## ६. बच्चाहरूको डेटा

कपूरी क ले बच्चाहरूको बारेमा स्वास्थ्य जानकारी भण्डारण गर्छ, तर जानकारी बच्चाको आमाबाबु वा संरक्षकद्वारा प्रविष्ट गरिन्छ। एप वयस्क प्रयोगकर्ताहरूको लागि डिजाइन गरिएको हो र **१३ वर्ष मुनिका बच्चाहरूलाई लक्षित गरिएको होइन।**

बच्चाहरूको स्वास्थ्य डेटा:
- आमाबाबु/संरक्षक खाताधारकद्वारा मात्र प्रविष्ट गरिन्छ
- RLS द्वारा संरक्षित (आमाबाबुको खाताले मात्र पहुँच गर्न सक्छ)
- तेस्रो पक्षहरूसँग कहिल्यै साझा गरिएको छैन
- विज्ञापनको लागि कहिल्यै प्रयोग गरिएको छैन
- आमाबाबुद्वारा कुनै पनि समयमा मेटाउन सकिन्छ

## ११. हामीलाई सम्पर्क गर्नुहोस्

**इमेल:** kapoori.ka@gmail.com
**विकासकर्ता:** प्रकाश थापा
**स्थान:** काठमाडौं, नेपाल
