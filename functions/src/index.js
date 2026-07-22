/**
 * Kapoori Ka — Firebase Cloud Functions
 *
 * Web-based payment flow (no eSewa API needed):
 * 1. Admin creates activation codes in Firestore (manually, via console)
 * 2. User enters code in the app
 * 3. This function validates & activates the subscription
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

/**
 * redeemActivationCode — called by the app when a user enters their
 * activation code received from the admin via WhatsApp.
 *
 * Input: { code: string }
 *
 * Flow:
 * 1. Look up code in activation_codes/{code}
 * 2. Validate it exists and is unused
 * 3. Activate the user's subscription with the plan/amount from the code
 * 4. Mark code as used
 */
exports.redeemActivationCode = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in to redeem a code.');
  }

  const code = (data.code || '').toString().trim().toUpperCase();
  if (!code) {
    throw new functions.https.HttpsError('invalid-argument', 'Please provide an activation code.');
  }

  const codeRef = db.collection('activation_codes').doc(code);
  const codeSnap = await codeRef.get();

  if (!codeSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Invalid activation code.');
  }

  const codeData = codeSnap.data();
  if (codeData.status !== 'valid') {
    throw new functions.https.HttpsError('already-claimed', 'This code has already been used.');
  }

  const uid = context.auth.uid;
  const plan = codeData.plan || 'premium';
  const durationDays = plan === 'yearly' ? 365 : 30;

  const now = admin.firestore.Timestamp.now();
  const endDate = admin.firestore.Timestamp.fromMillis(
    Date.now() + durationDays * 24 * 60 * 60 * 1000
  );

  // Activate subscription
  await db.collection('subscriptions').doc(uid).set({
    status: 'active',
    plan,
    startDate: now,
    endDate,
    autoRenew: false, // manual renewal via new codes
    price: codeData.amount || 0,
    paymentMethod: 'web_activation_code',
    transactionId: codeData.originalTransactionId || null,
    consultationsRemaining: plan === 'yearly' ? 100 : 5,
    redeemedCode: code,
    redeemedAt: now,
  }, { merge: true });

  // Mark code as used
  await codeRef.update({
    status: 'used',
    usedBy: uid,
    usedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  functions.logger.info(`Code ${code} redeemed by ${uid}, plan: ${plan}`);

  return {
    success: true,
    plan,
    status: 'active',
    endDate: endDate.toDate().toISOString(),
  };
});

/**
 * checkSubscription — validate subscription status for a user.
 */
exports.checkSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }

  const uid = data.userId || context.auth.uid;
  if (uid !== context.auth.uid) {
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!userDoc.exists || !userDoc.data().isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Cannot check others subscription.');
    }
  }

  const snap = await db.collection('subscriptions').doc(uid).get();
  if (!snap.exists) return { status: 'none' };

  const sub = snap.data();
  if (sub.endDate && sub.endDate.toDate() < new Date()) {
    return { ...sub, status: 'expired' };
  }

  return {
    ...sub,
    endDate: sub.endDate?.toDate?.().toISOString?.() || null,
    startDate: sub.startDate?.toDate?.().toISOString?.() || null,
  };
});
