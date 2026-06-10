import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type EconomicsRange = '7d' | '30d' | '90d' | 'all';

interface TxRow {
  transaction_type: string;
  amount: number;
  metadata: any;
  created_at: string;
  user_id: string | null;
  description: string | null;
}


interface PackageRow {
  id: string;
  name: string;
  tokens: number;
  price_cents: number;
  bonus_percentage: number | null;
  is_active: boolean;
}

interface PricingRow {
  platform: string;
  model_id: string;
  api_cost_per_1k_tokens: number | null;
  tokens_per_message: number;
}

const PAGE = 1000;

function sinceISO(range: EconomicsRange): string | null {
  if (range === 'all') return null;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return new Date(Date.now() - days * 86400_000).toISOString();
}

async function fetchAllTransactions(since: string | null): Promise<TxRow[]> {
  const out: TxRow[] = [];
  let from = 0;
  // hard safety stop at 50k rows
  while (from < 50_000) {
    let q = supabase
      .from('token_transactions')
      .select('transaction_type, amount, metadata, created_at, user_id, description')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (since) q = q.gte('created_at', since);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...(data as TxRow[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

export interface PlatformAgg {
  platform: string;
  calls: number;
  providerTokens: number;
  appTokens: number;
  apiCostUsd: number;
  impliedRevenueUsd: number;
  marginUsd: number;
  marginPct: number;
}

export interface ModelAgg extends PlatformAgg {
  model: string;
  avgProviderTokens: number;
  avgAppTokens: number;
  avgCostPerCall: number;
  configuredCostPer1k: number | null;
  hot: boolean; // realized cost > 80% of implied revenue
}

export interface PackageAgg {
  id: string;
  name: string;
  unitsSold: number;
  tokensGranted: number;
  revenueUsd: number;
  pricePerTokenUsd: number;
  coverageRatio: number; // sell price / realized api cost per token
}

// Single source of truth: 1 app token = $0.001 of provider cost (after 20% markup).
// Old rows without api_cost_dollars (pre-2026-06-10) fall back to this rate.
export const APP_TOKEN_USD = 0.001;
const FALLBACK_COST_PER_TOKEN = APP_TOKEN_USD;

export function useEconomicsData(range: EconomicsRange = '30d') {
  const since = sinceISO(range);

  const txQ = useQuery({
    queryKey: ['economics-transactions', range],
    queryFn: () => fetchAllTransactions(since),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const pkgQ = useQuery<PackageRow[]>({
    queryKey: ['economics-packages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('token_packages').select('*');
      if (error) throw error;
      return (data || []) as PackageRow[];
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const pricingQ = useQuery<PricingRow[]>({
    queryKey: ['economics-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('model_pricing')
        .select('platform, model_id, api_cost_per_1k_tokens, tokens_per_message');
      if (error) throw error;
      return (data || []) as PricingRow[];
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const balanceQ = useQuery({
    queryKey: ['economics-outstanding-balance'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_tokens').select('balance');
      if (error) throw error;
      return (data || []).reduce((s: number, r: any) => s + (r.balance || 0), 0);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const derived = useMemo(() => {
    const txs = txQ.data || [];
    const pkgs = pkgQ.data || [];
    const pricing = pricingQ.data || [];
    const outstandingBalance = balanceQ.data || 0;

    const pricingMap = new Map<string, PricingRow>();
    pricing.forEach((p) => pricingMap.set(`${p.platform}::${p.model_id}`, p));

    // ---------- top KPIs ----------
    let revenueCents = 0;
    let tokensSold = 0;
    let tokensConsumed = 0;
    let apiCostUsd = 0;
    let dailyBonusGranted = 0;
    let otherAmount = 0;

    type ModelBucket = {
      platform: string;
      model: string;
      calls: number;
      providerTokens: number;
      appTokens: number;
      apiCostUsd: number;
    };
    const modelBuckets = new Map<string, ModelBucket>();
    const platformBuckets = new Map<string, Omit<ModelBucket, 'model'>>();
    type PkgBucket = { id: string | null; price_cents: number; tokens: number; units: number };
    const purchaseBuckets = new Map<string, PkgBucket>();

    const purchaseRows: Array<{
      created_at: string;
      user_id: string | null;
      packageName: string;
      tokens: number;
      revenueUsd: number;
      paymentMethod: string;
      orderRef: string | null;
    }> = [];

    for (const t of txs) {
      const meta = (t.metadata || {}) as any;
      if (t.transaction_type === 'purchase') {
        let cents = Number(meta.price_cents) || 0;
        if (!cents && typeof meta.amount_paid === 'string') {
          const m = meta.amount_paid.match(/[\d.]+/);
          if (m) cents = Math.round(parseFloat(m[0]) * 100);
        }
        if (!cents && meta.package_id) {
          const pkg = (pkgQ.data || []).find((p) => p.id === meta.package_id);
          if (pkg) cents = pkg.price_cents;
        }
        revenueCents += cents;
        tokensSold += t.amount;
        const pkgId = meta.package_id || null;
        const key = pkgId
          ? `id:${pkgId}`
          : `match:${cents}:${t.amount}`;
        const existing = purchaseBuckets.get(key) || { id: pkgId, price_cents: cents, tokens: t.amount, units: 0 };
        existing.units += 1;
        purchaseBuckets.set(key, existing);

        const pkg = pkgId ? (pkgQ.data || []).find((p) => p.id === pkgId) : null;
        purchaseRows.push({
          created_at: t.created_at,
          user_id: t.user_id,
          packageName: pkg?.name ?? (t.description || `${t.amount} tokens`),
          tokens: t.amount,
          revenueUsd: cents / 100,
          paymentMethod: String(meta.payment_method || (meta.ls_order_id ? 'lemonsqueezy' : meta.stripe_session_id ? 'stripe' : 'unknown')),
          orderRef: meta.ls_order_id ? `LS#${meta.ls_order_id}` : meta.stripe_session_id ? `Stripe ${String(meta.stripe_session_id).slice(0, 10)}…` : null,
        });


      } else if (t.transaction_type === 'consumption') {
        const app = Math.abs(t.amount);
        tokensConsumed += app;

        const platform = String(meta.platform || 'unknown');
        const model = String(meta.model || 'unknown');
        const providerTokens = Number(meta.total_tokens) || 0;

        let cost = Number(meta.api_cost_dollars);
        if (!Number.isFinite(cost) || cost <= 0) {
          const p = pricingMap.get(`${platform}::${model}`);
          if (p?.api_cost_per_1k_tokens && providerTokens > 0) {
            cost = (providerTokens / 1000) * p.api_cost_per_1k_tokens;
          } else {
            cost = app * FALLBACK_COST_PER_TOKEN;
          }
        }


        apiCostUsd += cost;

        const mkey = `${platform}::${model}`;
        const mb = modelBuckets.get(mkey) || { platform, model, calls: 0, providerTokens: 0, appTokens: 0, apiCostUsd: 0 };
        mb.calls += 1;
        mb.providerTokens += providerTokens;
        mb.appTokens += app;
        mb.apiCostUsd += cost;
        modelBuckets.set(mkey, mb);

        const pb = platformBuckets.get(platform) || { platform, calls: 0, providerTokens: 0, appTokens: 0, apiCostUsd: 0 };
        pb.calls += 1;
        pb.providerTokens += providerTokens;
        pb.appTokens += app;
        pb.apiCostUsd += cost;
        platformBuckets.set(platform, pb);
      } else if (t.transaction_type === 'daily_bonus') {
        dailyBonusGranted += t.amount;
      } else {
        otherAmount += t.amount;
      }
    }

    const revenueUsd = revenueCents / 100;
    const sellPricePerToken = tokensSold > 0 ? revenueUsd / tokensSold : 0;
    const realizedCostPerToken = tokensConsumed > 0 ? apiCostUsd / tokensConsumed : 0;
    const impliedRevenueOnConsumed = tokensConsumed * sellPricePerToken;
    const grossMarginUsd = impliedRevenueOnConsumed - apiCostUsd;
    const grossMarginPct = impliedRevenueOnConsumed > 0 ? (grossMarginUsd / impliedRevenueOnConsumed) * 100 : 0;

    const subsidyTheoreticalUsd = dailyBonusGranted * (realizedCostPerToken || FALLBACK_COST_PER_TOKEN);
    const outstandingLiabilityUsd = outstandingBalance * (realizedCostPerToken || FALLBACK_COST_PER_TOKEN);

    const platformAggs: PlatformAgg[] = Array.from(platformBuckets.values())
      .map((b) => {
        const impliedRevenue = b.appTokens * sellPricePerToken;
        const margin = impliedRevenue - b.apiCostUsd;
        return {
          platform: b.platform,
          calls: b.calls,
          providerTokens: b.providerTokens,
          appTokens: b.appTokens,
          apiCostUsd: b.apiCostUsd,
          impliedRevenueUsd: impliedRevenue,
          marginUsd: margin,
          marginPct: impliedRevenue > 0 ? (margin / impliedRevenue) * 100 : 0,
        };
      })
      .sort((a, b) => b.apiCostUsd - a.apiCostUsd);

    const modelAggs: ModelAgg[] = Array.from(modelBuckets.values())
      .map((b) => {
        const impliedRevenue = b.appTokens * sellPricePerToken;
        const margin = impliedRevenue - b.apiCostUsd;
        const cfg = pricingMap.get(`${b.platform}::${b.model}`);
        return {
          platform: b.platform,
          model: b.model,
          calls: b.calls,
          providerTokens: b.providerTokens,
          appTokens: b.appTokens,
          apiCostUsd: b.apiCostUsd,
          impliedRevenueUsd: impliedRevenue,
          marginUsd: margin,
          marginPct: impliedRevenue > 0 ? (margin / impliedRevenue) * 100 : 0,
          avgProviderTokens: b.calls > 0 ? b.providerTokens / b.calls : 0,
          avgAppTokens: b.calls > 0 ? b.appTokens / b.calls : 0,
          avgCostPerCall: b.calls > 0 ? b.apiCostUsd / b.calls : 0,
          configuredCostPer1k: cfg?.api_cost_per_1k_tokens ?? null,
          hot: impliedRevenue > 0 && b.apiCostUsd / impliedRevenue > 0.8,
        };
      })
      .sort((a, b) => b.apiCostUsd - a.apiCostUsd);

    // ---------- packages ----------
    const pkgById = new Map<string, PackageRow>();
    pkgs.forEach((p) => pkgById.set(p.id, p));

    const packageAggs: PackageAgg[] = [];
    const aggregatedByPkg = new Map<string, { name: string; units: number; tokens: number; revenueUsd: number }>();

    for (const b of purchaseBuckets.values()) {
      const pkg = b.id ? pkgById.get(b.id) : null;
      const name = pkg?.name
        ?? (b.id ? `Unknown package (${b.id.slice(0, 6)}…)` : `Ad-hoc $${(b.price_cents / 100).toFixed(2)} / ${b.tokens} tokens`);
      const key = pkg?.id ?? `adhoc:${b.price_cents}:${b.tokens}`;
      const existing = aggregatedByPkg.get(key) || { name, units: 0, tokens: 0, revenueUsd: 0 };
      existing.units += b.units;
      existing.tokens += b.tokens * b.units;
      existing.revenueUsd += (b.price_cents * b.units) / 100;
      aggregatedByPkg.set(key, existing);
    }

    const costRef = realizedCostPerToken || FALLBACK_COST_PER_TOKEN;
    for (const [key, v] of aggregatedByPkg.entries()) {
      const pricePerToken = v.tokens > 0 ? v.revenueUsd / v.tokens : 0;
      packageAggs.push({
        id: key,
        name: v.name,
        unitsSold: v.units,
        tokensGranted: v.tokens,
        revenueUsd: v.revenueUsd,
        pricePerTokenUsd: pricePerToken,
        coverageRatio: costRef > 0 ? pricePerToken / costRef : 0,
      });
    }
    packageAggs.sort((a, b) => b.revenueUsd - a.revenueUsd);

    return {
      kpis: {
        revenueUsd,
        tokensSold,
        sellPricePerToken,
        tokensConsumed,
        apiCostUsd,
        realizedCostPerToken,
        grossMarginUsd,
        grossMarginPct,
        dailyBonusGranted,
        subsidyTheoreticalUsd,
        outstandingBalance,
        outstandingLiabilityUsd,
        otherAmount,
      },
      platformAggs,
      modelAggs,
      packageAggs,
    };
  }, [txQ.data, pkgQ.data, pricingQ.data, balanceQ.data]);

  return {
    ...derived,
    isLoading: txQ.isLoading || pkgQ.isLoading || pricingQ.isLoading || balanceQ.isLoading,
    error: txQ.error || pkgQ.error || pricingQ.error || balanceQ.error,
    refetch: () => {
      txQ.refetch();
      pkgQ.refetch();
      pricingQ.refetch();
      balanceQ.refetch();
    },
  };
}
