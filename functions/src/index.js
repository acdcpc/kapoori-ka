/**
 * Kapoori Ka — Firebase Cloud Functions
 * Server-side payment verification for eSewa transactions.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

/**
 * verifyPayment — called by client after eSewa payment.
 * Validates transaction, activates subscription, records payment.
 */
exports.verifyPayment = functions.https.onCall(async (data, context) => {
  const { transactionId, plan, amount, productCode } = data;

  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  if (!transactionId || !plan) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing transactionId or plan.');
  }
  if (!['premium', 'yearly'].includes(plan)) {
    throw new functions.https.HttpsError('invalid-argument', `Invalid plan: ${plan}`);
  }

  const uid = context.auth.uid;
  const priceNpr = plan === 'yearly' ? 500 : 100;
  if (amount && amount < priceNpr) {
    throw new functions.https.HttpsError('invalid-argument', `Amount too low for ${plan}.`);
  }

  const verified = await verifyEsewaTransaction(transactionId, amount || priceNpr, productCode);
  if (!verified) {
    throw new functions.https.HttpsError('failed-precondition', 'eSewa verification failed.');
  }

  const now = admin.firestore.Timestamp.now();
  const endMs = Date.now() + (plan === 'yearly' ? 365 : 30) * 86400000;
  const endDate = admin.firestore.Timestamp.fromMillis(endMs);

  await db.collection('subscriptions').doc(uid).set({
    status: 'active', plan, startDate: now, endDate,
    autoRenew: plan === 'yearly', paymentMethod: 'esewa',
    transactionId, price: amount || priceNpr,
    consultationsRemaining: plan === 'yearly' ? 100 : 5,
    upgradedAt: now,
  }, { merge: true });

  await db.collection('payments').doc(`PAY_${Date.now()}_${uid}`).set({
    userId: uid, transactionId, amount: amount || priceNpr,
    method: 'esewa', plan, status: 'verified',
    createdAt: now, verifiedAt: now,
  });

  return { success: true, plan, status: 'active', endDate: endDate.toDate().toISOString() };
});

/**
 * checkSubscription — validate subscription is still active.
 */
exports.checkSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
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
  return { ...sub, endDate: sub.endDate?.toDate?.().toISOString?.() || null };
});

// ── eSewa verification stub ──
async function verifyEsewaTransaction(txId, amount, productCode) {
  functions.logger.warn(`STUB: verify ${txId} NPR ${amount}`);
  // TODO: Replace with real eSewa API call before production
  return true;
}
