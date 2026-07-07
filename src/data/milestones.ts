// src/data/milestones.ts
// Comprehensive Developmental Milestones — 0 to 60 months
//
// Sources:
//   • WHO Developmental Milestones (2012)
//   • CDC "Learn the Signs. Act Early." (2022 updated schedule)
//   • Indian Academy of Pediatrics (IAP) Developmental Milestones (2015)
//   • Nelson Textbook of Pediatrics (21st ed.)
//
// Age bands: 2, 4, 6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60 months
//
// flagLevel:
//   green  = typical milestone (informational, positive)
//   yellow = watch milestone (monitor, discuss at next visit)
//   red    = red flag (NOT doing this = consult pediatrician promptly)
//
// parentTip = brief practical advice for caregivers (bilingual)

import { Milestone } from '../types';

// ── Extended Milestone type with parent tips ───────────────────
// If your types/index.ts doesn't yet include parentTip / parentTipNepali,
// add these two optional fields to the Milestone interface:
//   parentTip?: string;
//   parentTipNepali?: string;

export const MILESTONES: Milestone[] = [

  // ════════════════════════════════════════════════════════════
  // 2 MONTHS  (window: 0–2)
  // ════════════════════════════════════════════════════════════

  // Motor
  { id: 'm2_mo_1', ageMonthsMin: 0, ageMonthsMax: 2, domain: 'motor', flagLevel: 'yellow',
    description: 'Holds head up briefly when on tummy',
    descriptionNepali: 'पेटमा राख्दा थोरै समय टाउको उठाउँछ' },
  { id: 'm2_mo_2', ageMonthsMin: 0, ageMonthsMax: 2, domain: 'motor', flagLevel: 'green',
    description: 'Moves both arms and legs smoothly',
    descriptionNepali: 'दुवै हात र खुट्टा सहज रूपमा चलाउँछ' },
  { id: 'm2_mo_3', ageMonthsMin: 0, ageMonthsMax: 2, domain: 'motor', flagLevel: 'green',
    description: 'Opens and closes fists',
    descriptionNepali: 'मुठ्ठी खोल्छ र बन्द गर्छ' },

  // Language
  { id: 'm2_la_1', ageMonthsMin: 0, ageMonthsMax: 2, domain: 'language', flagLevel: 'yellow',
    description: 'Makes sounds other than crying (cooing)',
    descriptionNepali: 'रुनु बाहेक अन्य आवाज निकाल्छ (गुनगुन)' },
  { id: 'm2_la_2', ageMonthsMin: 0, ageMonthsMax: 2, domain: 'language', flagLevel: 'green',
    description: 'Calms or smiles when spoken to',
    descriptionNepali: 'कुरा गर्दा शान्त हुन्छ वा मुस्कुराउँछ' },

  // Social
  { id: 'm2_so_1', ageMonthsMin: 0, ageMonthsMax: 2, domain: 'social', flagLevel: 'yellow',
    description: 'Smiles back when you smile (social smile)',
    descriptionNepali: 'हाँस्दा फर्केर मुस्कुराउँछ (सामाजिक मुस्कान)' },
  { id: 'm2_so_2', ageMonthsMin: 0, ageMonthsMax: 2, domain: 'social', flagLevel: 'green',
    description: 'Looks at your face',
    descriptionNepali: 'तपाईंको अनुहारतिर हेर्छ' },

  // Cognitive
  { id: 'm2_co_1', ageMonthsMin: 0, ageMonthsMax: 2, domain: 'cognitive', flagLevel: 'green',
    description: 'Pays attention to faces',
    descriptionNepali: 'अनुहारतिर ध्यान दिन्छ' },
  { id: 'm2_co_2', ageMonthsMin: 0, ageMonthsMax: 2, domain: 'cognitive', flagLevel: 'green',
    description: 'Eyes follow a moving object side to side',
    descriptionNepali: 'आँखाले चल्दो चिज दायाँ-बायाँ पछ्याउँछ' },

  // Red flags — 2 months
  { id: 'm2_re_1', ageMonthsMin: 0, ageMonthsMax: 2, domain: 'social', flagLevel: 'red',
    description: 'Does NOT react to loud sounds',
    descriptionNepali: 'ठूलो आवाजमा प्रतिक्रिया दिँदैन' },
  { id: 'm2_re_2', ageMonthsMin: 0, ageMonthsMax: 2, domain: 'social', flagLevel: 'red',
    description: 'Does NOT smile at people by 2 months',
    descriptionNepali: '२ महिनामा मान्छेलाई देखेर मुस्कुराउँदैन' },
  { id: 'm2_re_3', ageMonthsMin: 0, ageMonthsMax: 2, domain: 'motor', flagLevel: 'red',
    description: 'Does NOT watch things as they move',
    descriptionNepali: 'चल्दो चिजहरू हेर्दैन' },
  { id: 'm2_re_4', ageMonthsMin: 0, ageMonthsMax: 2, domain: 'motor', flagLevel: 'red',
    description: 'Cannot hold head up at all when on tummy',
    descriptionNepali: 'पेटमा राख्दा टाउको बिल्कुल उठाउन सक्दैन' },

  // ════════════════════════════════════════════════════════════
  // 4 MONTHS  (window: 3–4)
  // ════════════════════════════════════════════════════════════

  { id: 'm4_mo_1', ageMonthsMin: 3, ageMonthsMax: 4, domain: 'motor', flagLevel: 'yellow',
    description: 'Holds head steady without support',
    descriptionNepali: 'बिना सहायता टाउको सीधा राख्छ' },
  { id: 'm4_mo_2', ageMonthsMin: 3, ageMonthsMax: 4, domain: 'motor', flagLevel: 'green',
    description: 'Brings hands to mouth',
    descriptionNepali: 'हात मुखमा लग्छ' },
  { id: 'm4_mo_3', ageMonthsMin: 3, ageMonthsMax: 4, domain: 'motor', flagLevel: 'green',
    description: 'Pushes up on elbows/arms when on tummy',
    descriptionNepali: 'पेटमा राख्दा कुहिनोमा टेकेर माथि उठ्छ' },
  { id: 'm4_mo_4', ageMonthsMin: 3, ageMonthsMax: 4, domain: 'motor', flagLevel: 'yellow',
    description: 'Reaches for toys with one hand',
    descriptionNepali: 'एक हातले खेलौना समाउन पुग्छ' },

  { id: 'm4_la_1', ageMonthsMin: 3, ageMonthsMax: 4, domain: 'language', flagLevel: 'yellow',
    description: 'Babbles and makes cooing sounds',
    descriptionNepali: 'गुनगुन र बबल आवाज निकाल्छ' },
  { id: 'm4_la_2', ageMonthsMin: 3, ageMonthsMax: 4, domain: 'language', flagLevel: 'green',
    description: 'Makes sounds when happy or upset',
    descriptionNepali: 'खुसी वा दुखी हुँदा आवाज निकाल्छ' },
  { id: 'm4_la_3', ageMonthsMin: 3, ageMonthsMax: 4, domain: 'language', flagLevel: 'green',
    description: 'Turns head toward sounds',
    descriptionNepali: 'आवाजतिर टाउको फर्काउँछ' },

  { id: 'm4_so_1', ageMonthsMin: 3, ageMonthsMax: 4, domain: 'social', flagLevel: 'yellow',
    description: 'Smiles spontaneously, especially at people',
    descriptionNepali: 'आफैं मुस्कुराउँछ, विशेषगरी मान्छेलाई देखेर' },
  { id: 'm4_so_2', ageMonthsMin: 3, ageMonthsMax: 4, domain: 'social', flagLevel: 'green',
    description: 'Likes to play with people and may cry when playing stops',
    descriptionNepali: 'मान्छेसँग खेल्न मन पराउँछ, खेल रोकिँदा रुन सक्छ' },

  { id: 'm4_co_1', ageMonthsMin: 3, ageMonthsMax: 4, domain: 'cognitive', flagLevel: 'yellow',
    description: 'Recognises familiar faces and people at a distance',
    descriptionNepali: 'टाढाबाट पनि चिनेका मान्छे पहिचान गर्छ' },
  { id: 'm4_co_2', ageMonthsMin: 3, ageMonthsMax: 4, domain: 'cognitive', flagLevel: 'green',
    description: 'Shows boredom (cries, fusses) if activity does not change',
    descriptionNepali: 'एउटै काम भइरह्यो भने बोरियत देखाउँछ' },

  // Red flags — 4 months
  { id: 'm4_re_1', ageMonthsMin: 3, ageMonthsMax: 4, domain: 'motor', flagLevel: 'red',
    description: 'Does NOT hold head steady',
    descriptionNepali: 'टाउको सीधा राख्न सक्दैन' },
  { id: 'm4_re_2', ageMonthsMin: 3, ageMonthsMax: 4, domain: 'social', flagLevel: 'red',
    description: 'Does NOT smile at people',
    descriptionNepali: 'मान्छेलाई देखेर मुस्कुराउँदैन' },
  { id: 'm4_re_3', ageMonthsMin: 3, ageMonthsMax: 4, domain: 'language', flagLevel: 'red',
    description: 'Does NOT make any sounds',
    descriptionNepali: 'कुनै आवाज निकाल्दैन' },
  { id: 'm4_re_4', ageMonthsMin: 3, ageMonthsMax: 4, domain: 'motor', flagLevel: 'red',
    description: 'Does NOT bring hands to mouth',
    descriptionNepali: 'हात मुखमा लाउँदैन' },

  // ════════════════════════════════════════════════════════════
  // 6 MONTHS  (window: 5–6)
  // ════════════════════════════════════════════════════════════

  { id: 'm6_mo_1', ageMonthsMin: 5, ageMonthsMax: 6, domain: 'motor', flagLevel: 'yellow',
    description: 'Rolls over in both directions (front to back, back to front)',
    descriptionNepali: 'दुवै तर्फ पल्टन्छ (अगाडि-पछाडि)' },
  { id: 'm6_mo_2', ageMonthsMin: 5, ageMonthsMax: 6, domain: 'motor', flagLevel: 'yellow',
    description: 'Sits with support',
    descriptionNepali: 'सहायतामा बस्छ' },
  { id: 'm6_mo_3', ageMonthsMin: 5, ageMonthsMax: 6, domain: 'motor', flagLevel: 'green',
    description: 'Bears weight on legs when held standing',
    descriptionNepali: 'उभ्याएर समाउँदा खुट्टामा भार राख्छ' },
  { id: 'm6_mo_4', ageMonthsMin: 5, ageMonthsMax: 6, domain: 'motor', flagLevel: 'green',
    description: 'Reaches for and grasps toys with both hands',
    descriptionNepali: 'दुवै हातले खेलौना समाउँछ' },

  { id: 'm6_la_1', ageMonthsMin: 5, ageMonthsMax: 6, domain: 'language', flagLevel: 'yellow',
    description: 'Responds to own name',
    descriptionNepali: 'आफ्नो नाम सुन्दा प्रतिक्रिया दिन्छ' },
  { id: 'm6_la_2', ageMonthsMin: 5, ageMonthsMax: 6, domain: 'language', flagLevel: 'green',
    description: 'Makes vowel sounds: ah, eh, oh',
    descriptionNepali: 'स्वर आवाजहरू निकाल्छ: आ, ए, ओ' },
  { id: 'm6_la_3', ageMonthsMin: 5, ageMonthsMax: 6, domain: 'language', flagLevel: 'yellow',
    description: 'Strings vowels together (ah-ah, oh-oh)',
    descriptionNepali: 'स्वर आवाजहरू जोडेर बोल्छ' },

  { id: 'm6_so_1', ageMonthsMin: 5, ageMonthsMax: 6, domain: 'social', flagLevel: 'yellow',
    description: 'Knows familiar faces, beginning of stranger anxiety',
    descriptionNepali: 'चिनेका अनुहार पहिचान गर्छ, अपरिचितमा सावधानी देखाउन थाल्छ' },
  { id: 'm6_so_2', ageMonthsMin: 5, ageMonthsMax: 6, domain: 'social', flagLevel: 'green',
    description: 'Likes to play with others, cries when playing stops',
    descriptionNepali: 'अरूसँग खेल्न मन पराउँछ' },

  { id: 'm6_co_1', ageMonthsMin: 5, ageMonthsMax: 6, domain: 'cognitive', flagLevel: 'yellow',
    description: 'Looks around at nearby things with curiosity',
    descriptionNepali: 'वरिपरिका चिजहरू जिज्ञासापूर्वक हेर्छ' },
  { id: 'm6_co_2', ageMonthsMin: 5, ageMonthsMax: 6, domain: 'cognitive', flagLevel: 'green',
    description: 'Passes things from one hand to the other',
    descriptionNepali: 'एक हातबाट अर्को हातमा चिज सार्छ' },

  // Red flags — 6 months
  { id: 'm6_re_1', ageMonthsMin: 5, ageMonthsMax: 6, domain: 'motor', flagLevel: 'red',
    description: 'Does NOT roll over in either direction',
    descriptionNepali: 'कुनै तर्फ पल्टन सक्दैन' },
  { id: 'm6_re_2', ageMonthsMin: 5, ageMonthsMax: 6, domain: 'language', flagLevel: 'red',
    description: 'Does NOT make any vowel sounds',
    descriptionNepali: 'कुनै स्वर आवाज निकाल्दैन' },
  { id: 'm6_re_3', ageMonthsMin: 5, ageMonthsMax: 6, domain: 'social', flagLevel: 'red',
    description: 'Shows no affection for caregivers',
    descriptionNepali: 'हेरचाहकर्ताप्रति कुनै स्नेह देखाउँदैन' },
  { id: 'm6_re_4', ageMonthsMin: 5, ageMonthsMax: 6, domain: 'motor', flagLevel: 'red',
    description: 'Cannot hold head steady when supported',
    descriptionNepali: 'सहायतामा राख्दा पनि टाउको सीधा राख्न सक्दैन' },

  // ════════════════════════════════════════════════════════════
  // 9 MONTHS  (window: 7–9)
  // ════════════════════════════════════════════════════════════

  { id: 'm9_mo_1', ageMonthsMin: 7, ageMonthsMax: 9, domain: 'motor', flagLevel: 'yellow',
    description: 'Sits without support',
    descriptionNepali: 'बिना सहायता बस्छ' },
  { id: 'm9_mo_2', ageMonthsMin: 7, ageMonthsMax: 9, domain: 'motor', flagLevel: 'yellow',
    description: 'Pulls to stand (holding on to furniture)',
    descriptionNepali: 'फर्निचर समाएर उठ्छ' },
  { id: 'm9_mo_3', ageMonthsMin: 7, ageMonthsMax: 9, domain: 'motor', flagLevel: 'green',
    description: 'Crawls (belly crawl or on hands and knees)',
    descriptionNepali: 'घस्र्छ (पेटले वा हात-घुँडाले)' },
  { id: 'm9_mo_4', ageMonthsMin: 7, ageMonthsMax: 9, domain: 'motor', flagLevel: 'green',
    description: 'Uses pincer grasp (picks up small objects with finger and thumb)',
    descriptionNepali: 'औंला र बुढी औंलाले सानो चिज उठाउँछ' },

  { id: 'm9_la_1', ageMonthsMin: 7, ageMonthsMax: 9, domain: 'language', flagLevel: 'yellow',
    description: 'Says mama/dada without meaning',
    descriptionNepali: 'मामा/दादा अर्थ नबुझी भन्छ' },
  { id: 'm9_la_2', ageMonthsMin: 7, ageMonthsMax: 9, domain: 'language', flagLevel: 'yellow',
    description: 'Babbles with consonants: ba, da, ma',
    descriptionNepali: 'व्यञ्जन आवाजसहित बबल गर्छ: बा, दा, मा' },
  { id: 'm9_la_3', ageMonthsMin: 7, ageMonthsMax: 9, domain: 'language', flagLevel: 'green',
    description: 'Understands "no"',
    descriptionNepali: '"नहोस्" बुझ्छ' },

  { id: 'm9_so_1', ageMonthsMin: 7, ageMonthsMax: 9, domain: 'social', flagLevel: 'yellow',
    description: 'Stranger anxiety (may cry with unfamiliar people)',
    descriptionNepali: 'अपरिचित मान्छेसँग रुन वा डराउन सक्छ' },
  { id: 'm9_so_2', ageMonthsMin: 7, ageMonthsMax: 9, domain: 'social', flagLevel: 'green',
    description: 'Has favourite toys',
    descriptionNepali: 'मनपर्ने खेलौना छन्' },

  { id: 'm9_co_1', ageMonthsMin: 7, ageMonthsMax: 9, domain: 'cognitive', flagLevel: 'yellow',
    description: 'Looks for objects when hidden (object permanence)',
    descriptionNepali: 'लुकाइएको चिज खोज्छ (वस्तु स्थायित्व)' },
  { id: 'm9_co_2', ageMonthsMin: 7, ageMonthsMax: 9, domain: 'cognitive', flagLevel: 'green',
    description: 'Bangs two objects together',
    descriptionNepali: 'दुई चिज एकसाथ ठोक्छ' },

  // Red flags — 9 months
  { id: 'm9_re_1', ageMonthsMin: 7, ageMonthsMax: 9, domain: 'motor', flagLevel: 'red',
    description: 'Does NOT bear weight on legs with support',
    descriptionNepali: 'सहायतामा खुट्टामा भार राख्दैन' },
  { id: 'm9_re_2', ageMonthsMin: 7, ageMonthsMax: 9, domain: 'language', flagLevel: 'red',
    description: 'Does NOT babble at all (ba, da, ma)',
    descriptionNepali: 'बिल्कुल बबल गर्दैन' },
  { id: 'm9_re_3', ageMonthsMin: 7, ageMonthsMax: 9, domain: 'social', flagLevel: 'red',
    description: 'Does NOT respond to own name',
    descriptionNepali: 'आफ्नो नाम सुन्दा प्रतिक्रिया दिँदैन' },

  // ════════════════════════════════════════════════════════════
  // 12 MONTHS  (window: 10–12)
  // ════════════════════════════════════════════════════════════

  { id: 'm12_mo_1', ageMonthsMin: 10, ageMonthsMax: 12, domain: 'motor', flagLevel: 'yellow',
    description: 'Stands alone briefly (1–2 seconds)',
    descriptionNepali: 'थोरै समय एक्लै उभिन्छ (१–२ सेकेन्ड)' },
  { id: 'm12_mo_2', ageMonthsMin: 10, ageMonthsMax: 12, domain: 'motor', flagLevel: 'yellow',
    description: 'Walks holding onto furniture (cruising)',
    descriptionNepali: 'फर्निचर समाएर हिँड्छ' },
  { id: 'm12_mo_3', ageMonthsMin: 10, ageMonthsMax: 12, domain: 'motor', flagLevel: 'green',
    description: 'Gets into sitting position without help',
    descriptionNepali: 'बिना सहायता बस्ने स्थितिमा आउँछ' },
  { id: 'm12_mo_4', ageMonthsMin: 10, ageMonthsMax: 12, domain: 'motor', flagLevel: 'green',
    description: 'Puts objects into a container and takes them out',
    descriptionNepali: 'भाँडोमा चिज राख्छ र निकाल्छ' },

  { id: 'm12_la_1', ageMonthsMin: 10, ageMonthsMax: 12, domain: 'language', flagLevel: 'yellow',
    description: 'Says 1–2 words with meaning (mama, dada, no)',
    descriptionNepali: 'अर्थसहित १–२ शब्द भन्छ (मामा, दादा, नहोस्)' },
  { id: 'm12_la_2', ageMonthsMin: 10, ageMonthsMax: 12, domain: 'language', flagLevel: 'yellow',
    description: 'Understands simple instructions ("give me", "come here")',
    descriptionNepali: 'सरल निर्देशन बुझ्छ ("दिनुहोस्", "आउनुहोस्")' },
  { id: 'm12_la_3', ageMonthsMin: 10, ageMonthsMax: 12, domain: 'language', flagLevel: 'green',
    description: 'Tries to imitate words',
    descriptionNepali: 'शब्दहरू नक्कल गर्न कोशिश गर्छ' },

  { id: 'm12_so_1', ageMonthsMin: 10, ageMonthsMax: 12, domain: 'social', flagLevel: 'yellow',
    description: 'Waves bye-bye',
    descriptionNepali: 'बाइ-बाइ गर्छ' },
  { id: 'm12_so_2', ageMonthsMin: 10, ageMonthsMax: 12, domain: 'social', flagLevel: 'yellow',
    description: 'Shows objects to get your attention',
    descriptionNepali: 'ध्यान तान्न चिजहरू देखाउँछ' },
  { id: 'm12_so_3', ageMonthsMin: 10, ageMonthsMax: 12, domain: 'social', flagLevel: 'green',
    description: 'Plays simple games like peek-a-boo',
    descriptionNepali: 'लुका-छेपी जस्ता सरल खेल खेल्छ' },

  { id: 'm12_co_1', ageMonthsMin: 10, ageMonthsMax: 12, domain: 'cognitive', flagLevel: 'yellow',
    description: 'Imitates gestures (clapping, waving)',
    descriptionNepali: 'इशाराहरू नक्कल गर्छ (ताली, बाइ-बाइ)' },
  { id: 'm12_co_2', ageMonthsMin: 10, ageMonthsMax: 12, domain: 'cognitive', flagLevel: 'green',
    description: 'Uses objects correctly (drinks from cup, brushes hair)',
    descriptionNepali: 'चिजहरू सहि तरिकाले प्रयोग गर्छ (कपबाट पिउँछ)' },

  // Red flags — 12 months
  { id: 'm12_re_1', ageMonthsMin: 10, ageMonthsMax: 12, domain: 'motor', flagLevel: 'red',
    description: 'Does NOT crawl',
    descriptionNepali: 'बिल्कुल घस्रँदैन' },
  { id: 'm12_re_2', ageMonthsMin: 10, ageMonthsMax: 12, domain: 'language', flagLevel: 'red',
    description: 'Does NOT say any single words',
    descriptionNepali: 'कुनै एकल शब्द भन्दैन' },
  { id: 'm12_re_3', ageMonthsMin: 10, ageMonthsMax: 12, domain: 'social', flagLevel: 'red',
    description: 'Does NOT point to things',
    descriptionNepali: 'चिजहरू औंल्याउँदैन' },
  { id: 'm12_re_4', ageMonthsMin: 10, ageMonthsMax: 12, domain: 'social', flagLevel: 'red',
    description: 'Does NOT wave bye-bye',
    descriptionNepali: 'बाइ-बाइ गर्दैन' },

  // ════════════════════════════════════════════════════════════
  // 15 MONTHS  (window: 13–15)   ← NEW dedicated band
  // ════════════════════════════════════════════════════════════

  { id: 'm15_mo_1', ageMonthsMin: 13, ageMonthsMax: 15, domain: 'motor', flagLevel: 'yellow',
    description: 'Walks independently (even if unsteady)',
    descriptionNepali: 'एक्लै हिँड्छ (अस्थिर भए पनि)' },
  { id: 'm15_mo_2', ageMonthsMin: 13, ageMonthsMax: 15, domain: 'motor', flagLevel: 'green',
    description: 'Climbs onto low furniture',
    descriptionNepali: 'सानो फर्निचरमा चढ्छ' },
  { id: 'm15_mo_3', ageMonthsMin: 13, ageMonthsMax: 15, domain: 'motor', flagLevel: 'green',
    description: 'Scribbles with crayon',
    descriptionNepali: 'क्रेयोनले थोप्लाथोप्ल गर्छ' },
  { id: 'm15_mo_4', ageMonthsMin: 13, ageMonthsMax: 15, domain: 'motor', flagLevel: 'green',
    description: 'Stacks 2 blocks',
    descriptionNepali: '२ ब्लक थाप्छ' },

  { id: 'm15_la_1', ageMonthsMin: 13, ageMonthsMax: 15, domain: 'language', flagLevel: 'yellow',
    description: 'Uses 3–5 words with meaning',
    descriptionNepali: 'अर्थसहित ३–५ शब्द प्रयोग गर्छ' },
  { id: 'm15_la_2', ageMonthsMin: 13, ageMonthsMax: 15, domain: 'language', flagLevel: 'yellow',
    description: 'Points to ask for something or to get help',
    descriptionNepali: 'केहि माग्न वा मद्दतका लागि औंल्याउँछ' },
  { id: 'm15_la_3', ageMonthsMin: 13, ageMonthsMax: 15, domain: 'language', flagLevel: 'green',
    description: 'Follows 1-step command without gesture ("give me the ball")',
    descriptionNepali: 'इशाराबिना एक-चरण निर्देशन पालना गर्छ' },

  { id: 'm15_so_1', ageMonthsMin: 13, ageMonthsMax: 15, domain: 'social', flagLevel: 'yellow',
    description: 'Copies other children during play',
    descriptionNepali: 'खेल्दा अन्य बच्चाहरूको नक्कल गर्छ' },
  { id: 'm15_so_2', ageMonthsMin: 13, ageMonthsMax: 15, domain: 'social', flagLevel: 'green',
    description: 'Shows affection with hugs or kisses',
    descriptionNepali: 'अँगालो वा माया देखाउँछ' },
  { id: 'm15_so_3', ageMonthsMin: 13, ageMonthsMax: 15, domain: 'social', flagLevel: 'green',
    description: 'Hands book to adult to read',
    descriptionNepali: 'पढ्न भनेर किताब ल्याउँछ' },

  { id: 'm15_co_1', ageMonthsMin: 13, ageMonthsMax: 15, domain: 'cognitive', flagLevel: 'yellow',
    description: 'Points to a picture in a book when named',
    descriptionNepali: 'नाम सुन्दा किताबको तस्वीर औंल्याउँछ' },
  { id: 'm15_co_2', ageMonthsMin: 13, ageMonthsMax: 15, domain: 'cognitive', flagLevel: 'green',
    description: 'Uses spoon or fork (messily)',
    descriptionNepali: 'चम्चा वा काँटा प्रयोग गर्छ (बिगारेर)' },

  // Red flags — 15 months
  { id: 'm15_re_1', ageMonthsMin: 13, ageMonthsMax: 15, domain: 'motor', flagLevel: 'red',
    description: 'Does NOT walk independently by 15 months',
    descriptionNepali: '१५ महिनामा एक्लै हिँड्दैन' },
  { id: 'm15_re_2', ageMonthsMin: 13, ageMonthsMax: 15, domain: 'language', flagLevel: 'red',
    description: 'Does NOT say any words',
    descriptionNepali: 'कुनै शब्द भन्दैन' },
  { id: 'm15_re_3', ageMonthsMin: 13, ageMonthsMax: 15, domain: 'social', flagLevel: 'red',
    description: 'Does NOT point to show things of interest',
    descriptionNepali: 'रोचक चिज देखाउन औंल्याउँदैन' },

  // ════════════════════════════════════════════════════════════
  // 18 MONTHS  (window: 16–18)
  // ════════════════════════════════════════════════════════════

  { id: 'm18_mo_1', ageMonthsMin: 16, ageMonthsMax: 18, domain: 'motor', flagLevel: 'yellow',
    description: 'Walks well without support',
    descriptionNepali: 'बिना सहायता राम्ररी हिँड्छ' },
  { id: 'm18_mo_2', ageMonthsMin: 16, ageMonthsMax: 18, domain: 'motor', flagLevel: 'green',
    description: 'Climbs onto and down from furniture without help',
    descriptionNepali: 'बिना सहायता फर्निचरमा चढ्छ र ओर्लन्छ' },
  { id: 'm18_mo_3', ageMonthsMin: 16, ageMonthsMax: 18, domain: 'motor', flagLevel: 'green',
    description: 'Stacks 3–4 blocks',
    descriptionNepali: '३–४ ब्लक थाप्छ' },
  { id: 'm18_mo_4', ageMonthsMin: 16, ageMonthsMax: 18, domain: 'motor', flagLevel: 'yellow',
    description: 'Walks up stairs with one hand held',
    descriptionNepali: 'एक हात समाएर भर्याङ चढ्छ' },

  { id: 'm18_la_1', ageMonthsMin: 16, ageMonthsMax: 18, domain: 'language', flagLevel: 'yellow',
    description: 'Uses at least 10 words with meaning',
    descriptionNepali: 'अर्थसहित कम्तीमा १० शब्द प्रयोग गर्छ' },
  { id: 'm18_la_2', ageMonthsMin: 16, ageMonthsMax: 18, domain: 'language', flagLevel: 'yellow',
    description: 'Points to 2–3 body parts when asked',
    descriptionNepali: 'सोध्दा २–३ शरीरका अंग देखाउँछ' },
  { id: 'm18_la_3', ageMonthsMin: 16, ageMonthsMax: 18, domain: 'language', flagLevel: 'green',
    description: 'Follows 2-step instructions ("pick up the shoe and give it to me")',
    descriptionNepali: '२-चरण निर्देशन पालना गर्छ' },

  { id: 'm18_so_1', ageMonthsMin: 16, ageMonthsMax: 18, domain: 'social', flagLevel: 'yellow',
    description: 'Shows affection to familiar caregivers',
    descriptionNepali: 'चिनेका हेरचाहकर्तालाई माया देखाउँछ' },
  { id: 'm18_so_2', ageMonthsMin: 16, ageMonthsMax: 18, domain: 'social', flagLevel: 'yellow',
    description: 'Plays simple pretend (feeds doll, talks on toy phone)',
    descriptionNepali: 'सरल नाटकीय खेल खेल्छ (गुडियालाई खुवाउँछ)' },
  { id: 'm18_so_3', ageMonthsMin: 16, ageMonthsMax: 18, domain: 'social', flagLevel: 'green',
    description: 'May have temper tantrums',
    descriptionNepali: 'रिस वा जिद्दी गर्न सक्छ (सामान्य हो)' },

  { id: 'm18_co_1', ageMonthsMin: 16, ageMonthsMax: 18, domain: 'cognitive', flagLevel: 'yellow',
    description: 'Recognises names of familiar people and body parts',
    descriptionNepali: 'चिनेका मान्छे र शरीरका अंगको नाम चिन्छ' },
  { id: 'm18_co_2', ageMonthsMin: 16, ageMonthsMax: 18, domain: 'cognitive', flagLevel: 'green',
    description: 'Scribbles on own (not just imitation)',
    descriptionNepali: 'आफैं थोप्लाथोप्ल गर्छ' },

  // Red flags — 18 months
  { id: 'm18_re_1', ageMonthsMin: 16, ageMonthsMax: 18, domain: 'language', flagLevel: 'red',
    description: 'Does NOT use at least 6 words',
    descriptionNepali: 'कम्तीमा ६ शब्द बोल्दैन' },
  { id: 'm18_re_2', ageMonthsMin: 16, ageMonthsMax: 18, domain: 'motor', flagLevel: 'red',
    description: 'Does NOT walk independently',
    descriptionNepali: 'एक्लै हिँड्दैन' },
  { id: 'm18_re_3', ageMonthsMin: 16, ageMonthsMax: 18, domain: 'social', flagLevel: 'red',
    description: 'Does NOT notice or care when caregiver leaves',
    descriptionNepali: 'हेरचाहकर्ता गएको थाहा पाउँदैन' },
  { id: 'm18_re_4', ageMonthsMin: 16, ageMonthsMax: 18, domain: 'social', flagLevel: 'red',
    description: 'Lost skills previously gained (regression)',
    descriptionNepali: 'पहिले आउने काम बिर्सेको छ (प्रतिगमन)' },

  // ════════════════════════════════════════════════════════════
  // 21 MONTHS  (window: 19–21)   ← NEW dedicated band
  // ════════════════════════════════════════════════════════════

  { id: 'm21_mo_1', ageMonthsMin: 19, ageMonthsMax: 21, domain: 'motor', flagLevel: 'yellow',
    description: 'Runs (but may fall often)',
    descriptionNepali: 'दौड्छ (प्रायः लड्न सक्छ)' },
  { id: 'm21_mo_2', ageMonthsMin: 19, ageMonthsMax: 21, domain: 'motor', flagLevel: 'green',
    description: 'Kicks a ball forward',
    descriptionNepali: 'बल अगाडि हान्छ' },
  { id: 'm21_mo_3', ageMonthsMin: 19, ageMonthsMax: 21, domain: 'motor', flagLevel: 'green',
    description: 'Stacks 5 or more blocks',
    descriptionNepali: '५ वा बढी ब्लक थाप्छ' },

  { id: 'm21_la_1', ageMonthsMin: 19, ageMonthsMax: 21, domain: 'language', flagLevel: 'yellow',
    description: 'Uses 20+ words clearly',
    descriptionNepali: 'स्पष्ट रूपमा २०+ शब्द प्रयोग गर्छ' },
  { id: 'm21_la_2', ageMonthsMin: 19, ageMonthsMax: 21, domain: 'language', flagLevel: 'yellow',
    description: 'Beginning to combine 2 words ("more milk", "daddy go")',
    descriptionNepali: '२ शब्द जोड्न थाल्छ ("अझ दूध", "बाबा जाओ")' },
  { id: 'm21_la_3', ageMonthsMin: 19, ageMonthsMax: 21, domain: 'language', flagLevel: 'green',
    description: 'Names 3–5 body parts',
    descriptionNepali: '३–५ शरीरका अंगको नाम भन्छ' },

  { id: 'm21_so_1', ageMonthsMin: 19, ageMonthsMax: 21, domain: 'social', flagLevel: 'yellow',
    description: 'Interested in other children (watches or follows)',
    descriptionNepali: 'अन्य बच्चाहरूमा रुचि राख्छ' },
  { id: 'm21_so_2', ageMonthsMin: 19, ageMonthsMax: 21, domain: 'social', flagLevel: 'green',
    description: 'Increasingly independent — may say "no" often',
    descriptionNepali: 'बढ्दो स्वतन्त्रता — प्रायः "नहोस्" भन्छ' },

  { id: 'm21_co_1', ageMonthsMin: 19, ageMonthsMax: 21, domain: 'cognitive', flagLevel: 'yellow',
    description: 'Sorts objects by shape or colour (simple)',
    descriptionNepali: 'आकार वा रंगले सरल वर्गीकरण गर्छ' },
  { id: 'm21_co_2', ageMonthsMin: 19, ageMonthsMax: 21, domain: 'cognitive', flagLevel: 'green',
    description: 'Completes sentences in familiar books',
    descriptionNepali: 'चिनेका किताबमा वाक्य पूरा गर्छ' },

  // Red flags — 21 months
  { id: 'm21_re_1', ageMonthsMin: 19, ageMonthsMax: 21, domain: 'language', flagLevel: 'red',
    description: 'Does NOT use at least 10 words',
    descriptionNepali: 'कम्तीमा १० शब्द प्रयोग गर्दैन' },
  { id: 'm21_re_2', ageMonthsMin: 19, ageMonthsMax: 21, domain: 'social', flagLevel: 'red',
    description: 'Does NOT notice or copy others',
    descriptionNepali: 'अरूलाई ध्यान दिँदैन वा नक्कल गर्दैन' },

  // ════════════════════════════════════════════════════════════
  // 24 MONTHS  (window: 22–24)
  // ════════════════════════════════════════════════════════════

  { id: 'm24_mo_1', ageMonthsMin: 22, ageMonthsMax: 24, domain: 'motor', flagLevel: 'yellow',
    description: 'Runs well',
    descriptionNepali: 'राम्ररी दौड्छ' },
  { id: 'm24_mo_2', ageMonthsMin: 22, ageMonthsMax: 24, domain: 'motor', flagLevel: 'yellow',
    description: 'Kicks a ball',
    descriptionNepali: 'बल हान्छ' },
  { id: 'm24_mo_3', ageMonthsMin: 22, ageMonthsMax: 24, domain: 'motor', flagLevel: 'green',
    description: 'Climbs well',
    descriptionNepali: 'राम्ररी चढ्छ' },
  { id: 'm24_mo_4', ageMonthsMin: 22, ageMonthsMax: 24, domain: 'motor', flagLevel: 'green',
    description: 'Turns book pages one at a time',
    descriptionNepali: 'एकएक गरी किताबका पाना पल्टाउँछ' },

  { id: 'm24_la_1', ageMonthsMin: 22, ageMonthsMax: 24, domain: 'language', flagLevel: 'yellow',
    description: 'Uses 50+ words and 2-word phrases',
    descriptionNepali: '५०+ शब्द र २-शब्दका वाक्यांश प्रयोग गर्छ' },
  { id: 'm24_la_2', ageMonthsMin: 22, ageMonthsMax: 24, domain: 'language', flagLevel: 'yellow',
    description: 'Familiar caregiver understands 50% of speech',
    descriptionNepali: 'चिनेका हेरचाहकर्ताले ५०% कुरा बुझ्छन्' },
  { id: 'm24_la_3', ageMonthsMin: 22, ageMonthsMax: 24, domain: 'language', flagLevel: 'green',
    description: 'Asks "what is that?" questions',
    descriptionNepali: '"यो के हो?" भनेर प्रश्न सोध्छ' },

  { id: 'm24_so_1', ageMonthsMin: 22, ageMonthsMax: 24, domain: 'social', flagLevel: 'yellow',
    description: 'Plays alongside other children (parallel play)',
    descriptionNepali: 'अन्य बच्चाहरूको छेउमा खेल्छ (समान्तर खेल)' },
  { id: 'm24_so_2', ageMonthsMin: 22, ageMonthsMax: 24, domain: 'social', flagLevel: 'yellow',
    description: 'Shows defiant behaviour (says no, refuses)',
    descriptionNepali: 'अवज्ञाकारी व्यवहार देखाउँछ (सामान्य हो)' },
  { id: 'm24_so_3', ageMonthsMin: 22, ageMonthsMax: 24, domain: 'social', flagLevel: 'green',
    description: 'Increasingly interested in other children',
    descriptionNepali: 'अन्य बच्चाहरूमा बढ्दो रुचि' },

  { id: 'm24_co_1', ageMonthsMin: 22, ageMonthsMax: 24, domain: 'cognitive', flagLevel: 'yellow',
    description: 'Follows 2-step instructions without gesture',
    descriptionNepali: 'इशाराबिना २-चरण निर्देशन पालना गर्छ' },
  { id: 'm24_co_2', ageMonthsMin: 22, ageMonthsMax: 24, domain: 'cognitive', flagLevel: 'yellow',
    description: 'Names items in picture books (dog, cat, ball)',
    descriptionNepali: 'किताबका तस्वीरमा चिजहरूको नाम भन्छ' },
  { id: 'm24_co_3', ageMonthsMin: 22, ageMonthsMax: 24, domain: 'cognitive', flagLevel: 'green',
    description: 'Sorts shapes and colours',
    descriptionNepali: 'आकार र रंगले छुट्ट्याउँछ' },

  // Red flags — 24 months
  { id: 'm24_re_1', ageMonthsMin: 22, ageMonthsMax: 24, domain: 'language', flagLevel: 'red',
    description: 'Does NOT use 2-word phrases',
    descriptionNepali: '२ शब्दका वाक्यांश प्रयोग गर्दैन' },
  { id: 'm24_re_2', ageMonthsMin: 22, ageMonthsMax: 24, domain: 'social', flagLevel: 'red',
    description: 'Does NOT notice when caregiver leaves or returns',
    descriptionNepali: 'हेरचाहकर्ता गएको वा आएको थाहा पाउँदैन' },
  { id: 'm24_re_3', ageMonthsMin: 22, ageMonthsMax: 24, domain: 'social', flagLevel: 'red',
    description: 'Does NOT engage in any pretend play',
    descriptionNepali: 'कुनै नाटकीय खेल खेल्दैन' },

  // ════════════════════════════════════════════════════════════
  // 30 MONTHS  (window: 25–30)   ← NEW dedicated band
  // ════════════════════════════════════════════════════════════

  { id: 'm30_mo_1', ageMonthsMin: 25, ageMonthsMax: 30, domain: 'motor', flagLevel: 'yellow',
    description: 'Jumps with both feet off the ground',
    descriptionNepali: 'दुवै खुट्टाले जमिनबाट उफ्रन्छ' },
  { id: 'm30_mo_2', ageMonthsMin: 25, ageMonthsMax: 30, domain: 'motor', flagLevel: 'green',
    description: 'Walks up and down stairs alternating feet',
    descriptionNepali: 'पालैपालो खुट्टाले भर्याङ चढ्छ र ओर्लन्छ' },
  { id: 'm30_mo_3', ageMonthsMin: 25, ageMonthsMax: 30, domain: 'motor', flagLevel: 'green',
    description: 'Draws or copies a horizontal or vertical line',
    descriptionNepali: 'तेर्सो वा ठाडो रेखा कोर्छ वा नक्कल गर्छ' },
  { id: 'm30_mo_4', ageMonthsMin: 25, ageMonthsMax: 30, domain: 'motor', flagLevel: 'green',
    description: 'Unscrews lids, turns door handles',
    descriptionNepali: 'बिर्को खोल्छ, ढोकाको हेन्डल घुमाउँछ' },

  { id: 'm30_la_1', ageMonthsMin: 25, ageMonthsMax: 30, domain: 'language', flagLevel: 'yellow',
    description: 'Uses 3-word sentences ("I want ball")',
    descriptionNepali: '३ शब्दका वाक्य प्रयोग गर्छ ("मलाई बल चाहियो")' },
  { id: 'm30_la_2', ageMonthsMin: 25, ageMonthsMax: 30, domain: 'language', flagLevel: 'yellow',
    description: 'Strangers understand about 50% of speech',
    descriptionNepali: 'अपरिचितले ५०% कुरा बुझ्छन्' },
  { id: 'm30_la_3', ageMonthsMin: 25, ageMonthsMax: 30, domain: 'language', flagLevel: 'green',
    description: 'Uses pronouns: I, me, we, you',
    descriptionNepali: 'सर्वनाम प्रयोग गर्छ: म, हामी, तपाईं' },
  { id: 'm30_la_4', ageMonthsMin: 25, ageMonthsMax: 30, domain: 'language', flagLevel: 'green',
    description: 'Asks "why?" questions',
    descriptionNepali: '"किन?" प्रश्न सोध्छ' },

  { id: 'm30_so_1', ageMonthsMin: 25, ageMonthsMax: 30, domain: 'social', flagLevel: 'yellow',
    description: 'Plays make-believe with dolls, animals, people',
    descriptionNepali: 'गुडिया, जनावर, मान्छेसँग कल्पनाको खेल खेल्छ' },
  { id: 'm30_so_2', ageMonthsMin: 25, ageMonthsMax: 30, domain: 'social', flagLevel: 'green',
    description: 'Shows concern when another child is hurt or upset',
    descriptionNepali: 'अर्को बच्चा दुखी हुँदा चिन्ता देखाउँछ' },

  { id: 'm30_co_1', ageMonthsMin: 25, ageMonthsMax: 30, domain: 'cognitive', flagLevel: 'yellow',
    description: 'Works a toy with buttons, levers, moving parts',
    descriptionNepali: 'बटन, लिभर भएको खेलौना चलाउँछ' },
  { id: 'm30_co_2', ageMonthsMin: 25, ageMonthsMax: 30, domain: 'cognitive', flagLevel: 'green',
    description: 'Completes 3–4 piece puzzles',
    descriptionNepali: '३–४ टुक्राको पजल मिलाउँछ' },
  { id: 'm30_co_3', ageMonthsMin: 25, ageMonthsMax: 30, domain: 'cognitive', flagLevel: 'green',
    description: 'Understands concept of "two"',
    descriptionNepali: '"दुई" को अवधारणा बुझ्छ' },

  // Red flags — 30 months
  { id: 'm30_re_1', ageMonthsMin: 25, ageMonthsMax: 30, domain: 'language', flagLevel: 'red',
    description: 'Cannot use 3-word sentences',
    descriptionNepali: '३ शब्दका वाक्य बनाउन सक्दैन' },
  { id: 'm30_re_2', ageMonthsMin: 25, ageMonthsMax: 30, domain: 'social', flagLevel: 'red',
    description: 'Does NOT engage in any pretend play',
    descriptionNepali: 'कुनै नाटकीय खेल खेल्दैन' },

  // ════════════════════════════════════════════════════════════
  // 36 MONTHS  (window: 31–36)
  // ════════════════════════════════════════════════════════════

  { id: 'm36_mo_1', ageMonthsMin: 31, ageMonthsMax: 36, domain: 'motor', flagLevel: 'yellow',
    description: 'Climbs stairs alternating feet',
    descriptionNepali: 'पालैपालो खुट्टाले भर्याङ चढ्छ' },
  { id: 'm36_mo_2', ageMonthsMin: 31, ageMonthsMax: 36, domain: 'motor', flagLevel: 'yellow',
    description: 'Pedals a tricycle',
    descriptionNepali: 'तीन-पाङ्ग्रे साइकल चलाउँछ' },
  { id: 'm36_mo_3', ageMonthsMin: 31, ageMonthsMax: 36, domain: 'motor', flagLevel: 'green',
    description: 'Copies a circle',
    descriptionNepali: 'गोलो आकार नक्कल गर्छ' },
  { id: 'm36_mo_4', ageMonthsMin: 31, ageMonthsMax: 36, domain: 'motor', flagLevel: 'green',
    description: 'Dresses and undresses with some help',
    descriptionNepali: 'थोरै सहायतामा लुगा लगाउँछ र फुकाल्छ' },

  { id: 'm36_la_1', ageMonthsMin: 31, ageMonthsMax: 36, domain: 'language', flagLevel: 'yellow',
    description: 'Uses sentences of 3+ words',
    descriptionNepali: '३+ शब्दका वाक्यमा बोल्छ' },
  { id: 'm36_la_2', ageMonthsMin: 31, ageMonthsMax: 36, domain: 'language', flagLevel: 'yellow',
    description: 'Strangers understand most of what is said',
    descriptionNepali: 'अपरिचितले अधिकांश कुरा बुझ्छन्' },
  { id: 'm36_la_3', ageMonthsMin: 31, ageMonthsMax: 36, domain: 'language', flagLevel: 'green',
    description: 'Tells name, age, and sex when asked',
    descriptionNepali: 'नाम, उमेर र लिंग भन्छ' },
  { id: 'm36_la_4', ageMonthsMin: 31, ageMonthsMax: 36, domain: 'language', flagLevel: 'green',
    description: 'Understands words like "in", "on", "under"',
    descriptionNepali: '"भित्र", "माथि", "मुनि" बुझ्छ' },

  { id: 'm36_so_1', ageMonthsMin: 31, ageMonthsMax: 36, domain: 'social', flagLevel: 'yellow',
    description: 'Shows concern for a crying friend',
    descriptionNepali: 'रोइरहेको साथीको चिन्ता देखाउँछ' },
  { id: 'm36_so_2', ageMonthsMin: 31, ageMonthsMax: 36, domain: 'social', flagLevel: 'yellow',
    description: 'Takes turns in games',
    descriptionNepali: 'खेलमा पालो लिन्छ' },
  { id: 'm36_so_3', ageMonthsMin: 31, ageMonthsMax: 36, domain: 'social', flagLevel: 'green',
    description: 'Separates from parent easily at familiar places',
    descriptionNepali: 'चिनेको ठाउँमा अभिभावकबाट सजिलै अलग हुन्छ' },

  { id: 'm36_co_1', ageMonthsMin: 31, ageMonthsMax: 36, domain: 'cognitive', flagLevel: 'yellow',
    description: 'Counts 3 objects correctly',
    descriptionNepali: '३ वस्तु सहि गन्छ' },
  { id: 'm36_co_2', ageMonthsMin: 31, ageMonthsMax: 36, domain: 'cognitive', flagLevel: 'yellow',
    description: 'Names at least 1 colour',
    descriptionNepali: 'कम्तीमा १ रंगको नाम भन्छ' },
  { id: 'm36_co_3', ageMonthsMin: 31, ageMonthsMax: 36, domain: 'cognitive', flagLevel: 'green',
    description: 'Understands "same" and "different"',
    descriptionNepali: '"उस्तै" र "फरक" बुझ्छ' },

  // Red flags — 36 months
  { id: 'm36_re_1', ageMonthsMin: 31, ageMonthsMax: 36, domain: 'language', flagLevel: 'red',
    description: 'Cannot use 3-word sentences',
    descriptionNepali: '३ शब्दका वाक्य बनाउन सक्दैन' },
  { id: 'm36_re_2', ageMonthsMin: 31, ageMonthsMax: 36, domain: 'social', flagLevel: 'red',
    description: 'Does NOT play pretend or make-believe',
    descriptionNepali: 'नाटकीय खेल खेल्दैन' },
  { id: 'm36_re_3', ageMonthsMin: 31, ageMonthsMax: 36, domain: 'social', flagLevel: 'red',
    description: 'Does NOT want to play with other children',
    descriptionNepali: 'अन्य बच्चाहरूसँग खेल्न चाहँदैन' },

  // ════════════════════════════════════════════════════════════
  // 42 MONTHS  (window: 37–42)   ← NEW dedicated band
  // ════════════════════════════════════════════════════════════

  { id: 'm42_mo_1', ageMonthsMin: 37, ageMonthsMax: 42, domain: 'motor', flagLevel: 'yellow',
    description: 'Hops on one foot (at least 2 hops)',
    descriptionNepali: 'एउटा खुट्टामा उफ्रन्छ (कम्तीमा २ पटक)' },
  { id: 'm42_mo_2', ageMonthsMin: 37, ageMonthsMax: 42, domain: 'motor', flagLevel: 'green',
    description: 'Catches a bounced ball most of the time',
    descriptionNepali: 'प्रायः उफ्रेको बल समाउँछ' },
  { id: 'm42_mo_3', ageMonthsMin: 37, ageMonthsMax: 42, domain: 'motor', flagLevel: 'green',
    description: 'Copies a cross (+)',
    descriptionNepali: 'क्रस (+) आकार नक्कल गर्छ' },
  { id: 'm42_mo_4', ageMonthsMin: 37, ageMonthsMax: 42, domain: 'motor', flagLevel: 'green',
    description: 'Dresses and undresses without help',
    descriptionNepali: 'बिना सहायता लुगा लगाउँछ र फुकाल्छ' },

  { id: 'm42_la_1', ageMonthsMin: 37, ageMonthsMax: 42, domain: 'language', flagLevel: 'yellow',
    description: 'Uses sentences of 4–5 words',
    descriptionNepali: '४–५ शब्दका वाक्य प्रयोग गर्छ' },
  { id: 'm42_la_2', ageMonthsMin: 37, ageMonthsMax: 42, domain: 'language', flagLevel: 'yellow',
    description: 'Tells stories from experience',
    descriptionNepali: 'अनुभवबाट कथाहरू सुनाउँछ' },
  { id: 'm42_la_3', ageMonthsMin: 37, ageMonthsMax: 42, domain: 'language', flagLevel: 'green',
    description: 'Knows and says first and last name',
    descriptionNepali: 'पहिलो र थर नाम जान्छ र भन्छ' },

  { id: 'm42_so_1', ageMonthsMin: 37, ageMonthsMax: 42, domain: 'social', flagLevel: 'yellow',
    description: 'Plays cooperatively with other children',
    descriptionNepali: 'अन्य बच्चाहरूसँग सहकारी रूपमा खेल्छ' },
  { id: 'm42_so_2', ageMonthsMin: 37, ageMonthsMax: 42, domain: 'social', flagLevel: 'green',
    description: 'Negotiates solutions to conflicts',
    descriptionNepali: 'विवाद समाधानका लागि वार्ता गर्छ' },

  { id: 'm42_co_1', ageMonthsMin: 37, ageMonthsMax: 42, domain: 'cognitive', flagLevel: 'yellow',
    description: 'Understands concept of counting and may know some numbers',
    descriptionNepali: 'गन्तीको अवधारणा बुझ्छ र केही अंक जान्छ' },
  { id: 'm42_co_2', ageMonthsMin: 37, ageMonthsMax: 42, domain: 'cognitive', flagLevel: 'yellow',
    description: 'Names 4 colours correctly',
    descriptionNepali: '४ रंगको नाम सही भन्छ' },
  { id: 'm42_co_3', ageMonthsMin: 37, ageMonthsMax: 42, domain: 'cognitive', flagLevel: 'green',
    description: 'Remembers parts of a story',
    descriptionNepali: 'कथाका अंशहरू सम्झन्छ' },

  // Red flags — 42 months
  { id: 'm42_re_1', ageMonthsMin: 37, ageMonthsMax: 42, domain: 'language', flagLevel: 'red',
    description: 'Strangers cannot understand most speech',
    descriptionNepali: 'अपरिचितले अधिकांश कुरा बुझ्न सक्दैनन्' },
  { id: 'm42_re_2', ageMonthsMin: 37, ageMonthsMax: 42, domain: 'social', flagLevel: 'red',
    description: 'Does NOT show interest in other children',
    descriptionNepali: 'अन्य बच्चाहरूमा रुचि देखाउँदैन' },
  { id: 'm42_re_3', ageMonthsMin: 37, ageMonthsMax: 42, domain: 'motor', flagLevel: 'red',
    description: 'Cannot jump in place',
    descriptionNepali: 'एकै ठाउँमा उफ्रन सक्दैन' },

  // ════════════════════════════════════════════════════════════
  // 48 MONTHS  (window: 43–48)
  // ════════════════════════════════════════════════════════════

  { id: 'm48_mo_1', ageMonthsMin: 43, ageMonthsMax: 48, domain: 'motor', flagLevel: 'yellow',
    description: 'Hops on one foot',
    descriptionNepali: 'एउटा खुट्टामा उफ्रन्छ' },
  { id: 'm48_mo_2', ageMonthsMin: 43, ageMonthsMax: 48, domain: 'motor', flagLevel: 'green',
    description: 'Uses scissors to cut straight line',
    descriptionNepali: 'कैंचीले सीधो रेखा काट्छ' },
  { id: 'm48_mo_3', ageMonthsMin: 43, ageMonthsMax: 48, domain: 'motor', flagLevel: 'green',
    description: 'Draws a person with 2–4 body parts',
    descriptionNepali: '२–४ अंगसहित मान्छे बनाउँछ' },

  { id: 'm48_la_1', ageMonthsMin: 43, ageMonthsMax: 48, domain: 'language', flagLevel: 'yellow',
    description: 'Uses sentences of 5+ words',
    descriptionNepali: '५+ शब्दका वाक्य प्रयोग गर्छ' },
  { id: 'm48_la_2', ageMonthsMin: 43, ageMonthsMax: 48, domain: 'language', flagLevel: 'yellow',
    description: 'Tells stories with a beginning, middle, end',
    descriptionNepali: 'शुरु, मध्य, अन्तसहित कथा सुनाउँछ' },
  { id: 'm48_la_3', ageMonthsMin: 43, ageMonthsMax: 48, domain: 'language', flagLevel: 'green',
    description: 'Knows some basic rules of grammar (plurals, past tense)',
    descriptionNepali: 'व्याकरणका सरल नियम जान्छ' },

  { id: 'm48_so_1', ageMonthsMin: 43, ageMonthsMax: 48, domain: 'social', flagLevel: 'yellow',
    description: 'Plays cooperatively with other children',
    descriptionNepali: 'अन्य बच्चाहरूसँग सहकारी खेल खेल्छ' },
  { id: 'm48_so_2', ageMonthsMin: 43, ageMonthsMax: 48, domain: 'social', flagLevel: 'yellow',
    description: 'Prefers playing with other children over alone',
    descriptionNepali: 'एक्लै भन्दा साथीसँग खेल्न रुचाउँछ' },
  { id: 'm48_so_3', ageMonthsMin: 43, ageMonthsMax: 48, domain: 'social', flagLevel: 'green',
    description: 'More creative in make-believe play',
    descriptionNepali: 'नाटकीय खेलमा बढी रचनात्मक' },

  { id: 'm48_co_1', ageMonthsMin: 43, ageMonthsMax: 48, domain: 'cognitive', flagLevel: 'yellow',
    description: 'Understands counting and knows some numbers',
    descriptionNepali: 'गन्ती बुझ्छ र केही अंक जान्छ' },
  { id: 'm48_co_2', ageMonthsMin: 43, ageMonthsMax: 48, domain: 'cognitive', flagLevel: 'yellow',
    description: 'Starts to understand time concepts (morning, night, yesterday)',
    descriptionNepali: 'समयको अवधारणा बुझ्न थाल्छ (बिहान, राति, हिजो)' },
  { id: 'm48_co_3', ageMonthsMin: 43, ageMonthsMax: 48, domain: 'cognitive', flagLevel: 'green',
    description: 'Names most letters and some numbers',
    descriptionNepali: 'धेरैजसो अक्षर र केही अंक भन्छ' },

  // Red flags — 48 months
  { id: 'm48_re_1', ageMonthsMin: 43, ageMonthsMax: 48, domain: 'language', flagLevel: 'red',
    description: 'Strangers cannot understand speech',
    descriptionNepali: 'अपरिचितले बोली बुझ्न सक्दैनन्' },
  { id: 'm48_re_2', ageMonthsMin: 43, ageMonthsMax: 48, domain: 'social', flagLevel: 'red',
    description: 'Does NOT show interest in other children',
    descriptionNepali: 'अन्य बच्चाहरूमा रुचि देखाउँदैन' },
  { id: 'm48_re_3', ageMonthsMin: 43, ageMonthsMax: 48, domain: 'motor', flagLevel: 'red',
    description: 'Cannot draw simple shapes',
    descriptionNepali: 'सरल आकार बनाउन सक्दैन' },

  // ════════════════════════════════════════════════════════════
  // 54 MONTHS  (window: 49–54)   ← NEW dedicated band
  // ════════════════════════════════════════════════════════════

  { id: 'm54_mo_1', ageMonthsMin: 49, ageMonthsMax: 54, domain: 'motor', flagLevel: 'yellow',
    description: 'Stands on one foot for 5+ seconds',
    descriptionNepali: 'एउटा खुट्टामा ५+ सेकेन्ड उभिन्छ' },
  { id: 'm54_mo_2', ageMonthsMin: 49, ageMonthsMax: 54, domain: 'motor', flagLevel: 'green',
    description: 'Skips (alternating feet)',
    descriptionNepali: 'पालैपालो खुट्टाले उफ्रँदै हिँड्छ' },
  { id: 'm54_mo_3', ageMonthsMin: 49, ageMonthsMax: 54, domain: 'motor', flagLevel: 'green',
    description: 'Copies a triangle',
    descriptionNepali: 'त्रिकोण आकार नक्कल गर्छ' },
  { id: 'm54_mo_4', ageMonthsMin: 49, ageMonthsMax: 54, domain: 'motor', flagLevel: 'green',
    description: 'Can use fork and spoon well',
    descriptionNepali: 'काँटा र चम्चा राम्ररी प्रयोग गर्छ' },

  { id: 'm54_la_1', ageMonthsMin: 49, ageMonthsMax: 54, domain: 'language', flagLevel: 'yellow',
    description: 'Uses future tense correctly ("I will go")',
    descriptionNepali: 'भविष्यकाल सहि प्रयोग गर्छ ("म जान्छु")' },
  { id: 'm54_la_2', ageMonthsMin: 49, ageMonthsMax: 54, domain: 'language', flagLevel: 'yellow',
    description: 'Can say full name and address',
    descriptionNepali: 'पूरा नाम र घरको ठेगाना भन्न सक्छ' },
  { id: 'm54_la_3', ageMonthsMin: 49, ageMonthsMax: 54, domain: 'language', flagLevel: 'green',
    description: 'Talks about things that happened during the day',
    descriptionNepali: 'दिनभरि भएका कुराहरू सुनाउँछ' },

  { id: 'm54_so_1', ageMonthsMin: 49, ageMonthsMax: 54, domain: 'social', flagLevel: 'yellow',
    description: 'Knows the difference between real and make-believe',
    descriptionNepali: 'वास्तविक र कल्पना छुट्ट्याउन जान्छ' },
  { id: 'm54_so_2', ageMonthsMin: 49, ageMonthsMax: 54, domain: 'social', flagLevel: 'yellow',
    description: 'Wants to please friends; wants to be like friends',
    descriptionNepali: 'साथीलाई खुसी पार्न चाहन्छ; साथी जस्तो हुन चाहन्छ' },
  { id: 'm54_so_3', ageMonthsMin: 49, ageMonthsMax: 54, domain: 'social', flagLevel: 'green',
    description: 'Can agree on rules for a game',
    descriptionNepali: 'खेलका नियमहरूमा सहमत हुन सक्छ' },

  { id: 'm54_co_1', ageMonthsMin: 49, ageMonthsMax: 54, domain: 'cognitive', flagLevel: 'yellow',
    description: 'Counts 10 or more objects',
    descriptionNepali: '१० वा बढी वस्तु गन्छ' },
  { id: 'm54_co_2', ageMonthsMin: 49, ageMonthsMax: 54, domain: 'cognitive', flagLevel: 'green',
    description: 'Draws a person with at least 6 body parts',
    descriptionNepali: 'कम्तीमा ६ अंगसहित मान्छे बनाउँछ' },
  { id: 'm54_co_3', ageMonthsMin: 49, ageMonthsMax: 54, domain: 'cognitive', flagLevel: 'green',
    description: 'Prints some letters or numbers',
    descriptionNepali: 'केही अक्षर वा अंक लेख्छ' },

  // Red flags — 54 months
  { id: 'm54_re_1', ageMonthsMin: 49, ageMonthsMax: 54, domain: 'language', flagLevel: 'red',
    description: 'Cannot tell a simple story',
    descriptionNepali: 'सरल कथा सुनाउन सक्दैन' },
  { id: 'm54_re_2', ageMonthsMin: 49, ageMonthsMax: 54, domain: 'social', flagLevel: 'red',
    description: 'Does NOT play with other children',
    descriptionNepali: 'अन्य बच्चाहरूसँग खेल्दैन' },

  // ════════════════════════════════════════════════════════════
  // 60 MONTHS  (window: 55–60)
  // ════════════════════════════════════════════════════════════

  { id: 'm60_mo_1', ageMonthsMin: 55, ageMonthsMax: 60, domain: 'motor', flagLevel: 'yellow',
    description: 'Stands on one foot for 10+ seconds',
    descriptionNepali: 'एउटा खुट्टामा १०+ सेकेन्ड उभिन्छ' },
  { id: 'm60_mo_2', ageMonthsMin: 55, ageMonthsMax: 60, domain: 'motor', flagLevel: 'yellow',
    description: 'Hops, may skip',
    descriptionNepali: 'उफ्रन्छ, स्किप गर्न सक्छ' },
  { id: 'm60_mo_3', ageMonthsMin: 55, ageMonthsMax: 60, domain: 'motor', flagLevel: 'green',
    description: 'Uses fork, spoon, and sometimes a knife',
    descriptionNepali: 'काँटा, चम्चा र कहिलेकाहीँ चक्कु प्रयोग गर्छ' },
  { id: 'm60_mo_4', ageMonthsMin: 55, ageMonthsMax: 60, domain: 'motor', flagLevel: 'green',
    description: 'Can swing and climb on playground equipment',
    descriptionNepali: 'खेलमैदानको झुला र चढ्ने संरचनामा खेल्छ' },

  { id: 'm60_la_1', ageMonthsMin: 55, ageMonthsMax: 60, domain: 'language', flagLevel: 'yellow',
    description: 'Tells simple stories with beginning and end',
    descriptionNepali: 'शुरु र अन्त सहित सरल कथा सुनाउँछ' },
  { id: 'm60_la_2', ageMonthsMin: 55, ageMonthsMax: 60, domain: 'language', flagLevel: 'yellow',
    description: 'Uses more than 5 words in a sentence',
    descriptionNepali: '५ भन्दा बढी शब्दका वाक्यमा बोल्छ' },
  { id: 'm60_la_3', ageMonthsMin: 55, ageMonthsMax: 60, domain: 'language', flagLevel: 'green',
    description: 'Knows about everyday things (food, money, appliances)',
    descriptionNepali: 'दैनिक जीवनका चिजहरूबारे जान्छ' },

  { id: 'm60_so_1', ageMonthsMin: 55, ageMonthsMax: 60, domain: 'social', flagLevel: 'yellow',
    description: 'Shows a range of emotions (happy, sad, angry, scared)',
    descriptionNepali: 'विभिन्न भावनाहरू देखाउँछ (खुसी, दुखी, रिस, डर)' },
  { id: 'm60_so_2', ageMonthsMin: 55, ageMonthsMax: 60, domain: 'social', flagLevel: 'yellow',
    description: 'Agrees to rules; understands fairness',
    descriptionNepali: 'नियममा सहमत हुन्छ; न्यायोचितता बुझ्छ' },
  { id: 'm60_so_3', ageMonthsMin: 55, ageMonthsMax: 60, domain: 'social', flagLevel: 'green',
    description: 'Aware of gender identity',
    descriptionNepali: 'लैंगिक पहिचानको बोध हुन्छ' },

  { id: 'm60_co_1', ageMonthsMin: 55, ageMonthsMax: 60, domain: 'cognitive', flagLevel: 'yellow',
    description: 'Counts to 10 and knows numbers 1–5',
    descriptionNepali: '१० सम्म गन्छ र १–५ अंक जान्छ' },
  { id: 'm60_co_2', ageMonthsMin: 55, ageMonthsMax: 60, domain: 'cognitive', flagLevel: 'yellow',
    description: 'Copies a triangle and other geometric shapes',
    descriptionNepali: 'त्रिकोण र अन्य ज्यामितीय आकार नक्कल गर्छ' },
  { id: 'm60_co_3', ageMonthsMin: 55, ageMonthsMax: 60, domain: 'cognitive', flagLevel: 'green',
    description: 'Can distinguish fantasy from reality',
    descriptionNepali: 'कल्पना र वास्तविकता छुट्ट्याउन सक्छ' },
  { id: 'm60_co_4', ageMonthsMin: 55, ageMonthsMax: 60, domain: 'cognitive', flagLevel: 'green',
    description: 'Understands concept of same and different in school-readiness activities',
    descriptionNepali: 'विद्यालय तयारी गतिविधिमा उस्तै र फरक बुझ्छ' },

  // Red flags — 60 months
  { id: 'm60_re_1', ageMonthsMin: 55, ageMonthsMax: 60, domain: 'social', flagLevel: 'red',
    description: 'Does NOT show a range of emotions',
    descriptionNepali: 'विभिन्न भावनाहरू देखाउँदैन' },
  { id: 'm60_re_2', ageMonthsMin: 55, ageMonthsMax: 60, domain: 'motor', flagLevel: 'red',
    description: 'Cannot draw simple shapes or write letters',
    descriptionNepali: 'सरल आकार बनाउन वा अक्षर लेख्न सक्दैन' },
  { id: 'm60_re_3', ageMonthsMin: 55, ageMonthsMax: 60, domain: 'language', flagLevel: 'red',
    description: 'Does NOT use sentences of more than 5 words',
    descriptionNepali: '५ भन्दा बढी शब्दका वाक्य बोल्दैन' },
  { id: 'm60_re_4', ageMonthsMin: 55, ageMonthsMax: 60, domain: 'social', flagLevel: 'red',
    description: 'Cannot tell what is real vs make-believe',
    descriptionNepali: 'वास्तविक र कल्पना छुट्ट्याउन सक्दैन' },
];

// ── Age band boundaries (used by getMilestonesForAge) ──────────
// Sorted list of all ageMonthsMax values — used to find which
// band a child's age belongs to, for "Current" labelling.
export const AGE_BANDS = [2, 4, 6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60];

/**
 * Returns the ageMonthsMax of the band that *contains* ageMonths.
 * E.g. 15 months → band max = 15 (window 13–15)
 *      13 months → band max = 15 (window 13–15)
 *      17 months → band max = 18 (window 16–18)
 */
export const getCurrentBandMax = (ageMonths: number): number => {
  for (const band of AGE_BANDS) {
    const m = MILESTONES.find(x => x.ageMonthsMax === band);
    if (!m) continue;
    if (ageMonths >= m.ageMonthsMin && ageMonths <= m.ageMonthsMax) return band;
  }
  // If older than 60 months, return 60
  return 60;
};

/**
 * Get milestones relevant for a child's current age.
 * Shows:
 *   • Milestones for the child's current age band
 *   • The next upcoming band (so parents can see what's coming)
 *
 * This prevents overwhelming parents with all previous milestones.
 */
export const getMilestonesForAge = (ageMonths: number): Milestone[] => {
  const currentBandMax = getCurrentBandMax(ageMonths);
  const currentBandIndex = AGE_BANDS.indexOf(currentBandMax);

  // Show milestones for current band and next band only
  const nextBandMax = currentBandIndex < AGE_BANDS.length - 1 ? AGE_BANDS[currentBandIndex + 1] : 60;
  return MILESTONES.filter(m => m.ageMonthsMax === currentBandMax || m.ageMonthsMax === nextBandMax);
};