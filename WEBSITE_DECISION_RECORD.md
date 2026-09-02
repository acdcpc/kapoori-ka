# Kapoori Ka Website Decision Record

## Goal
Create a browser-first, bilingual public landing experience for Kapoori Ka, the child digital health book already shipped in this repository. The website should introduce the product clearly, guide families toward starting a child profile, and communicate privacy and medical-information boundaries without making clinical promises.

## Audience and core action
The primary audience is Nepali parents and caregivers, including first-time smartphone users. The primary action is to start a child profile / open Kapoori Ka. Secondary actions are exploring features, learning how the app works, switching between नेपाली and English, and contacting support.

## Scope
The first website pass includes a responsive home page with branded navigation, bilingual language switching, hero message, product preview, feature overview, three-step workflow, privacy/trust section, medical disclaimer, support link, and a final CTA. It does not change mobile authentication, database, payment verification, health calculations, or private record flows.

## Route map
| Route / anchor | Purpose |
|---|---|
| `/` | Public landing page rendered on Expo web |
| `#features` | Product feature overview |
| `#how` | Three-step usage explanation |
| `#trust` | Privacy, bilingual, and accessibility commitments |
| `#start` | Final call to action |

## Localization
All public-facing website copy lives in a typed local `copy` map in `src/screens/WebsiteScreen.tsx` with `en` and `ne` variants. Language switching is persistent through the existing `LanguageContext` and AsyncStorage behavior in `App.tsx`. Nepali copy should receive fluent-speaker review before release.

## Data classification and privacy
The website does not collect or transmit child health data. It contains no forms, analytics identifiers, payment details, private storage, or privileged configuration. Existing mobile data controls remain outside the landing-page scope.

## Payment decision
Not applicable to the public landing page. Existing activation-code and payment flows remain unchanged and are not unlocked by this website.

## Analytics
No new analytics events are added in this pass. Any future website analytics must be consent-aware and limited to coarse, non-identifying events.

## Accessibility and responsive behavior
Interactive controls have visible text labels and minimum 44 px effective heights. The page uses semantic section IDs, readable contrast, keyboard-compatible web pressables, responsive stacking below 760 px, and text expansion-safe layouts.

## Implementation boundary
The web experience is rendered only when `Platform.OS === 'web'`; native Android/iOS continue to use the existing authenticated app navigation. No secrets, credentials, database migrations, or private assets are added.
