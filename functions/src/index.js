/**
 * Kapoori Ka — Firebase Cloud Functions
 *
 * Web-based manual payment flow:
 * 1. User pays externally (eSewa/Khalti/Fonepay/Bank)
 * 2. Admin verifies transaction and creates activation code (via dashboard)
 * 3. User enters code in-app → redeemActivationCode activates premium
 *
 * Admin functions: approvePayment, rejectPayment, setAdminClaim
 * User function: redeemActivationCode, checkSubscription
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// ────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────

async function requireAdmin(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  if (!context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
  }
  return context.auth.uid;
}

// ────────────────────────────────────────────────────────────
// USER-FACING: Redeem Activation Code
// ────────────────────────────────────────────────────────────

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
  const plan = codeData.plan || 'yearly';
  const durationDays = plan === 'yearly' ? 365 : 30;

  const now = admin.firestore.Timestamp.now();
  const endDate = admin.firestore.Timestamp.fromMillis(
    Date.now() + durationDays * 24 * 60 * 60 * 1000
  );

  // Activate subscription server-side (bypasses client security rules)
  await db.collection('subscriptions').doc(uid).set({
    status: 'active',
    plan,
    startDate: now,
    endDate,
    autoRenew: false,
    price: codeData.amount || 0,
    paymentMethod: 'web_activation_code',
    transactionId: codeData.originalTransactionId || null,
    consultationsRemaining: plan === 'yearly' ? 100 : 5,
    redeemedCode: code,
    redeemedAt: now,
  }, { merge: true });

  // Also set premium info on user doc
  await db.collection('users').doc(uid).update({
    'premium.active': true,
    'premium.plan': plan,
    'premium.activatedAt': now,
    'premium.expiresAt': endDate,
    updatedAt: now,
  });

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

// ────────────────────────────────────────────────────────────
// USER-FACING: Check Subscription
// ────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────
// ADMIN: Approve Payment
// ────────────────────────────────────────────────────────────

exports.approvePayment = functions.https.onCall(async (data, context) => {
  const adminUid = await requireAdmin(context);

  const paymentId = (data.paymentId || '').toString().trim();
  if (!paymentId) {
    throw new functions.https.HttpsError('invalid-argument', 'paymentId is required.');
  }

  const paymentRef = db.collection('payments').doc(paymentId);
  const paymentSnap = await paymentRef.get();

  if (!paymentSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Payment not found.');
  }

  const payment = paymentSnap.data();

  // Idempotency guard: only approve if pending
  if (payment.status !== 'pending') {
    throw new functions.https.HttpsError('already-claimed', `Payment is already ${payment.status}.`);
  }

  const now = admin.firestore.Timestamp.now();
  const plan = payment.plan || 'yearly';
  const durationDays = plan === 'yearly' ? 365 : 30;
  const endDate = admin.firestore.Timestamp.fromMillis(
    Date.now() + durationDays * 24 * 60 * 60 * 1000
  );

  // Firestore transaction: update payment + subscription atomically
  await db.runTransaction(async (tx) => {
    // Re-read within transaction for consistency
    const freshSnap = await tx.get(paymentRef);
    if (!freshSnap.exists || freshSnap.data().status !== 'pending') {
      throw new Error('Payment status changed during transaction.');
    }

    // Update payment
    tx.update(paymentRef, {
      status: 'approved',
      verifiedAt: now,
      verifiedBy: adminUid,
    });

    // Activate subscription
    const subRef = db.collection('subscriptions').doc(payment.userId);
    tx.set(subRef, {
      status: 'active',
      plan,
      startDate: now,
      endDate,
      autoRenew: false,
      price: payment.amount || 0,
      paymentMethod: payment.paymentMethod || 'manual',
      transactionId: payment.paymentId || null,
      consultationsRemaining: plan === 'yearly' ? 100 : 5,
      activatedByPayment: paymentId,
      activatedAt: now,
    }, { merge: true });

    // Update user premium field
    const userRef = db.collection('users').doc(payment.userId);
    tx.update(userRef, {
      'premium.active': true,
      'premium.plan': plan,
      'premium.activatedAt': now,
      'premium.expiresAt': endDate,
      'premium.verifiedBy': adminUid,
      'premium.paymentId': paymentId,
      updatedAt: now,
    });
  });

  functions.logger.info(`Payment ${paymentId} approved by ${adminUid}, user: ${payment.userId}`);

  return { success: true, status: 'approved', plan, endDate: endDate.toDate().toISOString() };
});

// ────────────────────────────────────────────────────────────
// ADMIN: Reject Payment
// ────────────────────────────────────────────────────────────

exports.rejectPayment = functions.https.onCall(async (data, context) => {
  const adminUid = await requireAdmin(context);

  const paymentId = (data.paymentId || '').toString().trim();
  const reason = (data.reason || '').toString().trim();

  if (!paymentId) {
    throw new functions.https.HttpsError('invalid-argument', 'paymentId is required.');
  }

  const paymentRef = db.collection('payments').doc(paymentId);
  const paymentSnap = await paymentRef.get();

  if (!paymentSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Payment not found.');
  }

  if (paymentSnap.data().status !== 'pending') {
    throw new functions.https.HttpsError('already-claimed', `Payment is already ${paymentSnap.data().status}.`);
  }

  await paymentRef.update({
    status: 'rejected',
    rejectionReason: reason || 'No reason provided.',
    verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    verifiedBy: adminUid,
  });

  // Do NOT touch subscription on rejection

  functions.logger.info(`Payment ${paymentId} rejected by ${adminUid}, reason: ${reason}`);

  return { success: true, status: 'rejected' };
});

// ────────────────────────────────────────────────────────────
// ADMIN: Set Admin Claim (run once per admin user)
// ────────────────────────────────────────────────────────────

exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  await requireAdmin(context);

  const email = (data.email || '').toString().trim().toLowerCase();
  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'email is required.');
  }

  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });

  functions.logger.info(`Admin claim set for ${email} (${user.uid})`);

  return { success: true, uid: user.uid, email };
});
