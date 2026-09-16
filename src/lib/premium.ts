/**
 * Single source of truth for "is this account premium right now?".
 * Previously the same boolean was re-implemented in several screens, which is
 * how a paywall and a "Premium" badge can disagree with each other.
 */
export function isPremiumActive(subscription: any): boolean {
  if (!subscription) return false;
  const plan = String(subscription.plan || '').toLowerCase();
  const status = String(subscription.status || '').toLowerCase();
  const hasPlan = status === 'active' || ['premium', 'yearly', 'monthly', '6months'].includes(plan);
  if (!hasPlan) return false;

  const raw = subscription.endDate ?? subscription.end_date;
  if (!raw) return true;
  const ms = raw instanceof Date
    ? raw.getTime()
    : typeof raw?.seconds === 'number'
      ? raw.seconds * 1000
      : typeof raw?.toMillis === 'function'
        ? raw.toMillis()
        : new Date(raw).getTime();
  if (isNaN(ms)) return true;
  return Date.now() <= ms;
}
