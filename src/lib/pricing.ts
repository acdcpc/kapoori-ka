// Single source of truth for plan pricing (NPR) and plan labels.
//
// Keep in sync with supabase/functions/submit-payment/index.ts, which cannot
// import from src/ (Deno edge runtime) — the push-notification text there uses
// the same 650 / 850 values.
export const PLAN_PRICES: Record<string, number> = { '6months': 650, yearly: 850 };

export function planPrice(plan: string): number | null {
  return PLAN_PRICES[plan] ?? null;
}

/**
 * Human label for a plan, showing the amount actually recorded on the payment
 * when there is one, and falling back to the plan's current price otherwise.
 * Never hardcode an amount at the call site: a stale literal in the admin
 * review queue is how a paid 850 appeared as "NPR 500".
 */
export function planLabel(plan: string, isNe: boolean, amount?: number | null): string {
  const name =
    plan === '6months' ? (isNe ? '६ महिना' : '6 Months')
    : plan === 'yearly' ? (isNe ? 'वार्षिक' : 'Yearly')
    : plan;
  const value = typeof amount === 'number' && amount > 0 ? amount : planPrice(plan);
  return value ? `${name} NPR ${value}` : name;
}
