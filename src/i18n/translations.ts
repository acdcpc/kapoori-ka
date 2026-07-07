// src/i18n/translations.ts

export type Language = 'en' | 'ne';

export const translations = {
  en: {
    // App
    appName: 'कपूरी क (Kapoori Ka)',
    appTagline: "Your Child's Digital Health Book",

    // Home
    myChildren: 'My Children',
    addChild: 'Add Child',
    noChildren: 'No children added yet.\nTap the + button to add your child.',

    // Add Child
    childProfile: 'Child Profile',
    childName: "Child's Name",
    childNameNepali: "Child's Name (Nepali)",
    dateOfBirth: 'Date of Birth',
    sex: 'Sex',
    male: 'Male',
    female: 'Female',
    birthWeight: 'Birth Weight (kg)',
    birthLength: 'Birth Length (cm)',
    parentPhone: "Parent's Phone Number",
    save: 'Save',
    saving: 'Saving...',
    cancel: 'Cancel',

    // Growth Chart
    growthChart: 'Growth Chart',
    addMeasurement: 'Add Measurement',
    weight: 'Weight (kg)',
    height: 'Height (cm)',
    date: 'Date',
    ageMonths: 'Age (months)',
    nutritionalStatus: 'Nutritional Status',
    normal: 'Normal',
    underweight: 'Underweight',
    severelyUnderweight: 'Severely Underweight',
    overweight: 'Overweight',

    // Immunization
    immunization: 'Immunization',
    vaccinesDue: 'Due',
    vaccinesUpcoming: 'Upcoming',
    vaccinesMissed: 'Missed',
    vaccinesGiven: 'Given',
    markAsGiven: 'Mark as Given',
    scheduledFor: 'Scheduled for',
    givenOn: 'Given on',

    // Milestones
    milestones: 'Milestones',
    milestonesSubtitle: 'Developmental Milestones',
    domainMotor: 'Motor',
    domainLanguage: 'Language',
    domainSocial: 'Social',
    domainCognitive: 'Cognitive',
    milestoneAchieved: 'Achieved ✓',
    milestoneNotYet: 'Not Yet',
    milestoneMarkAchieved: 'Mark as Achieved',
    milestoneRedFlag: '⚠️ Please consult your pediatrician about this milestone.',
    milestoneYellowFlag: 'Monitor — discuss at next visit.',
    allMilestonesAchieved: 'All milestones for this age achieved! 🎉',
    noMilestonesForAge: 'No milestone checks needed right now.',
    milestoneFullChart: 'Complete Milestone Chart',
    milestoneAllAges: 'All Age Groups',
    milestoneRedFlagWarning: 'Red Flag — Consult Pediatrician',
    milestoneEducationalDisclaimer: 'These milestones are derived from WHO, CDC, and IAP guidelines and are for educational purposes only. Always consult your pediatrician for personalized assessment and guidance.',
    milestoneNotAchievedWarning: 'If your child has not achieved this milestone, please consult your pediatrician for proper evaluation.',
    milestoneSourceInfo: 'Sources: WHO (2012), CDC Learn the Signs Act Early (2022), IAP Developmental Milestones (2015)',
    growthChartIdealRange: 'Ideal Range',
    growthChartLowestRange: 'Lowest Normal',
    growthChartHighestRange: 'Highest Normal',
    growthChartBMI: 'BMI',
    growthChartEducationalDisclaimer: 'These growth charts are based on WHO standards and are for educational reference only. For accurate assessment and medical advice, always consult your pediatrician.',

    // About / Author
    about: 'About',
    aboutAuthor: 'About the Author',
    authorName: 'Dr. Prakash Thapa',
    authorTitle: 'MBBS and MD - TUTH-IOM,Fellowship in Pediatric Critical Care Medicine (FPCCM)',
    authorSpecialty: 'Pediatric Critical Care specialist',
    authorBio: 'Passionate Pediatric Intensivist dedicated to saving young lives in resource-limited settings. With 5+ years of hands-on experience in NICU/PICU, mastering invasive/non-invasive ventilation, POCUS (lung, cardiac, cranial), central lines, and advanced resuscitation (PALS/NRP). Currently at Patan Academy of Health Sciences (PAHS), leading critical care for neonates/children while mentoring fellows, residents, and nurses.',

    // M-CHAT
    mchat: 'Autism Screening',
    mchatSubtitle: 'M-CHAT-R Screening (18–30 months)',
    mchatIntro: "Please answer these questions about your child's usual behaviour. This screening does not diagnose autism — it identifies children who may benefit from further evaluation.",
    mchatYes: 'Yes',
    mchatNo: 'No',
    mchatSubmit: 'Get Result',
    mchatLowRisk: 'Low Risk',
    mchatMediumRisk: 'Medium Risk',
    mchatHighRisk: 'High Risk',
    mchatLowRiskDesc: 'No further action needed. Repeat screening at 24 months.',
    mchatMediumRiskDesc: 'Follow-up recommended. Please discuss with your pediatrician.',
    mchatHighRiskDesc: 'Immediate referral recommended. Please consult a developmental pediatrician.',
    mchatNotApplicable: 'M-CHAT is for children aged 18–30 months.',
    mchatAgeRequired: 'Child must be between 18 and 30 months old.',

    // PDF Report
    pdfReport: 'Growth Report',
    pdfGenerate: 'Generate PDF Report',
    pdfGenerating: 'Generating PDF...',
    pdfShare: 'Share Report',
    pdfReportTitle: 'Child Growth Report',

    // Subscription
    subscription: 'Subscription',
    betaBadge: '🎉 BETA — Free for 1 Month',
    betaDescription: 'Thank you for being an early user ! All features are free during our beta period.',
    betaEnds: 'Beta period ends',
    planMonthly: 'Monthly Plan',
    planYearly: 'Yearly Plan (Best Value)',
    planMonthlyPrice: 'NPR 100/month',
    planYearlyPrice: 'NPR 750/year',
    planYearlySaving: 'Save NPR 450',
    subscribeEsewa: 'Pay with eSewa',
    subscribeKhalti: 'Pay with Khalti',
    subscriptionActive: 'Subscription Active',
    subscriptionExpires: 'Expires on',
    subscriptionExpired: 'Subscription Expired',
    renewSubscription: 'Renew Subscription',
    freeFeatures: 'Free Features',
    premiumFeatures: 'Premium Features',

    // Common
    loading: 'Loading...',
    error: 'Something went wrong',
    retry: 'Retry',
    months: 'months',
    years: 'years',
    days: 'days',
    kg: 'kg',
    cm: 'cm',
    close: 'Close',
    next: 'Next',
    back: 'Back',
    done: 'Done',
  },

  ne: {
    // App
    appName: 'कपूरी क (Kapoori Ka)',
    appTagline: 'तपाईंको बच्चाको डिजिटल स्वास्थ्य किताब',

    // Home
    myChildren: 'मेरा बच्चाहरू',
    addChild: 'बच्चा थप्नुहोस्',
    noChildren: 'अहिलेसम्म कोही बच्चा थपिएको छैन।\n+ बटन थिचेर बच्चा थप्नुहोस्।',

    // Add Child
    childProfile: 'बच्चाको प्रोफाइल',
    childName: 'बच्चाको नाम',
    childNameNepali: 'बच्चाको नाम (नेपालीमा)',
    dateOfBirth: 'जन्म मिति',
    sex: 'लिंग',
    male: 'छोरा',
    female: 'छोरी',
    birthWeight: 'जन्मको तौल (किग्रा)',
    birthLength: 'जन्मको उचाइ (सेमि)',
    parentPhone: 'अभिभावकको फोन नम्बर',
    save: 'सुरक्षित गर्नुहोस्',
    saving: 'सुरक्षित गर्दै...',
    cancel: 'रद्द गर्नुहोस्',

    // Growth Chart
    growthChart: 'वृद्धि चार्ट',
    addMeasurement: 'नाप थप्नुहोस्',
    weight: 'तौल (किग्रा)',
    height: 'उचाइ (सेमि)',
    date: 'मिति',
    ageMonths: 'उमेर (महिना)',
    nutritionalStatus: 'पोषण स्थिति',
    normal: 'सामान्य',
    underweight: 'कम तौल',
    severelyUnderweight: 'अत्यन्त कम तौल',
    overweight: 'बढी तौल',

    // Immunization
    immunization: 'खोप',
    vaccinesDue: 'बाँकी',
    vaccinesUpcoming: 'आउँदो',
    vaccinesMissed: 'छुटेको',
    vaccinesGiven: 'दिइएको',
    markAsGiven: 'दिइएको चिन्ह लगाउनुहोस्',
    scheduledFor: 'तय मिति',
    givenOn: 'दिइएको मिति',

    // Milestones
    milestones: 'विकास मापदण्ड',
    milestonesSubtitle: 'बच्चाको विकास जाँच',
    domainMotor: 'शारीरिक',
    domainLanguage: 'भाषा',
    domainSocial: 'सामाजिक',
    domainCognitive: 'बौद्धिक',
    milestoneAchieved: 'भयो ✓',
    milestoneNotYet: 'भएको छैन',
    milestoneMarkAchieved: 'भएको चिन्ह लगाउनुहोस्',
    milestoneRedFlag: '⚠️ कृपया यो विषयमा बालरोग विशेषज्ञसँग परामर्श गर्नुहोस्।',
    milestoneYellowFlag: 'निगरानी गर्नुहोस् — अर्को भ्रमणमा छलफल गर्नुहोस्।',
    allMilestonesAchieved: 'यस उमेरका सबै विकास मापदण्ड पूरा भए! 🎉',
    noMilestonesForAge: 'अहिले विकास जाँच आवश्यक छैन।',
    milestoneFullChart: 'पूर्ण विकास चार्ट',
    milestoneAllAges: 'सबै उमेर समूह',
    milestoneRedFlagWarning: 'चेतावनी — बालरोग विशेषज्ञसँग सम्पर्क गर्नुहोस्',
    milestoneEducationalDisclaimer: 'यी विकास मापदण्ड WHO, CDC, र IAP दिशानिर्देशबाट लिइएका छन् र शैक्षिक उद्देश्यका लागि मात्र हुन्। व्यक्तिगत मूल्याङ्कन र मार्गदर्शनको लागि सधैं बालरोग विशेषज्ञसँग परामर्श गर्नुहोस्।',
    milestoneNotAchievedWarning: 'यदि तपाईंको बच्चाले यो विकास मापदण्ड हासिल गरेको छैन भने, कृपया उचित मूल्याङ्कनको लागि बालरोग विशेषज्ञसँग परामर्श गर्नुहोस्।',
    milestoneSourceInfo: 'स्रोतहरू: WHO (२०१२), CDC Learn the Signs Act Early (२०२२), IAP Developmental Milestones (२०१५)',
    growthChartIdealRange: 'आदर्श दायरा',
    growthChartLowestRange: 'सबैभन्दा कम सामान्य',
    growthChartHighestRange: 'सबैभन्दा बढी सामान्य',
    growthChartBMI: 'BMI',
    growthChartEducationalDisclaimer: 'यी वृद्धि चार्टहरू WHO मानकहरूमा आधारित छन् र शैक्षिक सन्दर्भको लागि मात्र हुन्। सटीक मूल्याङ्कन र चिकित्सा सल्लाहको लागि सधैं बालरोग विशेषज्ञसँग परामर्श गर्नुहोस्।',

    // About / Author
    about: 'परिचय',
    aboutAuthor: 'लेखक परिचय',
    authorName: 'डा. प्रकाश थापा',
    authorTitle: 'MBBS and MD - TUTH-IOM,Fellowship in Pediatric Critical Care Medicine (FPCCM)',
    authorSpecialty: 'बाल सघन उपचार विशेषज्ञ',
    authorBio: 'बाल सघन उपचार विशेषज्ञ। NICU/PICU मा ५ वर्षभन्दा बढीको प्रत्यक्ष अनुभवका साथ, हाल पाटन स्वास्थ्य विज्ञान प्रतिष्ठान (PAHS) मा कार्यरत बाल सघन उपचार विशेषज्ञ।',

    // M-CHAT
    mchat: 'अटिज्म जाँच',
    mchatSubtitle: 'M-CHAT-R जाँच (१८–३० महिना)',
    mchatIntro: 'कृपया तपाईंको बच्चाको सामान्य व्यवहारबारे यी प्रश्नहरूको जवाफ दिनुहोस्। यो जाँचले अटिज्म निदान गर्दैन — यसले थप मूल्याङ्कन आवश्यक हुन सक्ने बच्चाहरू पहिचान गर्छ।',
    mchatYes: 'हो',
    mchatNo: 'होइन',
    mchatSubmit: 'नतिजा हेर्नुहोस्',
    mchatLowRisk: 'कम जोखिम',
    mchatMediumRisk: 'मध्यम जोखिम',
    mchatHighRisk: 'उच्च जोखिम',
    mchatLowRiskDesc: 'थप कारबाही आवश्यक छैन। २४ महिनामा फेरि जाँच गर्नुहोस्।',
    mchatMediumRiskDesc: 'फलो-अप सिफारिस गरिन्छ। कृपया बालरोग विशेषज्ञसँग छलफल गर्नुहोस्।',
    mchatHighRiskDesc: 'तुरुन्त रेफरल सिफारिस गरिन्छ। कृपया विकास बालरोग विशेषज्ञसँग परामर्श गर्नुहोस्।',
    mchatNotApplicable: 'M-CHAT १८–३० महिनाका बच्चाहरूका लागि हो।',
    mchatAgeRequired: 'बच्चाको उमेर १८ देखि ३० महिनाबीच हुनुपर्छ।',

    // PDF Report
    pdfReport: 'वृद्धि रिपोर्ट',
    pdfGenerate: 'PDF रिपोर्ट बनाउनुहोस्',
    pdfGenerating: 'PDF बनाउँदैछ...',
    pdfShare: 'रिपोर्ट साझा गर्नुहोस्',
    pdfReportTitle: 'बच्चाको वृद्धि रिपोर्ट',

    // Subscription
    subscription: 'सदस्यता',
    betaBadge: '🎉 बिटा — १ महिना निःशुल्क',
    betaDescription: 'प्रारम्भिक प्रयोगकर्ता हुनुभएकोमा धन्यवाद! बिटा अवधिमा सबै सुविधाहरू निःशुल्क छन्।',
    betaEnds: 'बिटा अवधि समाप्त हुने मिति',
    planMonthly: 'मासिक योजना',
    planYearly: 'वार्षिक योजना (सर्वोत्तम मूल्य)',
    planMonthlyPrice: 'NPR १००/महिना',
    planYearlyPrice: 'NPR ७५०/वर्ष',
    planYearlySaving: 'NPR ४५० बचत',
    subscribeEsewa: 'eSewa बाट भुक्तानी गर्नुहोस्',
    subscribeKhalti: 'Khalti बाट भुक्तानी गर्नुहोस्',
    subscriptionActive: 'सदस्यता सक्रिय',
    subscriptionExpires: 'समाप्त हुने मिति',
    subscriptionExpired: 'सदस्यता समाप्त',
    renewSubscription: 'सदस्यता नवीकरण गर्नुहोस्',
    freeFeatures: 'निःशुल्क सुविधाहरू',
    premiumFeatures: 'प्रिमियम सुविधाहरू',

    // Common
    loading: 'लोड हुँदैछ...',
    error: 'केही गलत भयो',
    retry: 'फेरि प्रयास गर्नुहोस्',
    months: 'महिना',
    years: 'वर्ष',
    days: 'दिन',
    kg: 'किग्रा',
    cm: 'सेमि',
    close: 'बन्द गर्नुहोस्',
    next: 'अर्को',
    back: 'पछाडि',
    done: 'सकियो',
  }
};

export const useTranslation = (language: Language) => translations[language];

// Backward compatibility
export const nepaliTranslations = translations.ne;
export default translations;