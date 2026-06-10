import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useEconomicsData, type EconomicsRange } from '@/hooks/useEconomicsData';

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
const usdFine = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 5 }).format(n);
const compact = (n: number) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
const num = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n));
const pct = (n: number) => `${n.toFixed(1)}%`;

const Kpi: React.FC<{ label: string; value: string; sub?: string; tone?: 'pos' | 'neg' | 'warn' | 'neutral' }> = ({
  label,
  value,
  sub,
  tone = 'neutral',
}) => {
  const toneClass =
    tone === 'pos'
      ? 'text-emerald-500'
      : tone === 'neg'
      ? 'text-destructive'
      : tone === 'warn'
      ? 'text-amber-500'
      : 'text-foreground';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
};

const MarginPill: React.FC<{ value: number }> = ({ value }) => {
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        positive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
      }`}
    >
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {pct(value)}
    </span>
  );
};

const AdminEconomics: React.FC = () => {
  const [range, setRange] = useState<EconomicsRange>('30d');
  const { kpis, platformAggs, modelAggs, packageAggs, isLoading, error, refetch } = useEconomicsData(range);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Economics</h3>
          <p className="text-sm text-muted-foreground">
            Revenue from token sales vs. the actual USD you pay providers per API call.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(v) => v && setRange(v as EconomicsRange)}
            size="sm"
            variant="outline"
          >
            <ToggleGroupItem value="7d">7d</ToggleGroupItem>
            <ToggleGroupItem value="30d">30d</ToggleGroupItem>
            <ToggleGroupItem value="90d">90d</ToggleGroupItem>
            <ToggleGroupItem value="all">All</ToggleGroupItem>
          </ToggleGroup>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="flex items-center gap-2 p-4 text-destructive">
            <AlertTriangle className="h-4 w-4" /> Failed to load economics data.
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Revenue" value={usd(kpis.revenueUsd)} sub={`${compact(kpis.tokensSold)} tokens sold`} tone="pos" />
        <Kpi
          label="Sell price / token"
          value={usdFine(kpis.sellPricePerToken)}
          sub={kpis.tokensSold === 0 ? 'No purchases yet' : 'Effective, after bonuses'}
        />
        <Kpi
          label="Real API cost (consumed)"
          value={usd(kpis.apiCostUsd)}
          sub={`${compact(kpis.tokensConsumed)} tokens consumed`}
          tone="neg"
        />
        <Kpi
          label="Realized cost / token"
          value={usdFine(kpis.realizedCostPerToken)}
          sub="What 1 app token actually costs you"
        />
        <Kpi
          label="Gross margin (consumed)"
          value={usd(kpis.grossMarginUsd)}
          sub={pct(kpis.grossMarginPct)}
          tone={kpis.grossMarginUsd >= 0 ? 'pos' : 'neg'}
        />
        <Kpi
          label="Free-tier subsidy"
          value={usd(kpis.subsidyTheoreticalUsd)}
          sub={`${compact(kpis.dailyBonusGranted)} tokens given (if all spent)`}
          tone="warn"
        />
        <Kpi
          label="Outstanding liability"
          value={usd(kpis.outstandingLiabilityUsd)}
          sub={`${compact(kpis.outstandingBalance)} tokens in user wallets`}
          tone="warn"
        />
        <Kpi
          label="Other adjustments"
          value={`${kpis.otherAmount >= 0 ? '+' : ''}${num(kpis.otherAmount)} tok`}
          sub="Refunds, admin grants, etc."
        />
      </div>

      {/* Per-platform breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-platform breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {platformAggs.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No consumption in this window.</div>
          ) : (
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Provider tokens</TableHead>
                    <TableHead className="text-right">App tokens</TableHead>
                    <TableHead className="text-right">Real cost</TableHead>
                    <TableHead className="text-right">Implied revenue</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {platformAggs.map((p) => (
                    <TableRow key={p.platform}>
                      <TableCell className="font-medium capitalize">{p.platform}</TableCell>
                      <TableCell className="text-right">{num(p.calls)}</TableCell>
                      <TableCell className="text-right">{compact(p.providerTokens)}</TableCell>
                      <TableCell className="text-right">{compact(p.appTokens)}</TableCell>
                      <TableCell className="text-right">{usd(p.apiCostUsd)}</TableCell>
                      <TableCell className="text-right">{usd(p.impliedRevenueUsd)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span>{usd(p.marginUsd)}</span>
                          <MarginPill value={p.marginPct} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-model breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-model breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {modelAggs.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No consumption in this window.</div>
          ) : (
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Avg provider tok</TableHead>
                    <TableHead className="text-right">Avg app tok</TableHead>
                    <TableHead className="text-right">$ / call</TableHead>
                    <TableHead className="text-right">Configured $/1k</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelAggs.map((m) => (
                    <TableRow key={`${m.platform}-${m.model}`} className={m.hot ? 'bg-destructive/5' : undefined}>
                      <TableCell className="capitalize">{m.platform}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {m.model}
                        {m.hot && (
                          <Badge variant="destructive" className="ml-2">
                            tight margin
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{num(m.calls)}</TableCell>
                      <TableCell className="text-right">{num(m.avgProviderTokens)}</TableCell>
                      <TableCell className="text-right">{m.avgAppTokens.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{usdFine(m.avgCostPerCall)}</TableCell>
                      <TableCell className="text-right">
                        {m.configuredCostPer1k != null ? usdFine(m.configuredCostPer1k) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <MarginPill value={m.marginPct} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-package breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-package revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {packageAggs.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No purchases in this window.</div>
          ) : (
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Package</TableHead>
                    <TableHead className="text-right">Units sold</TableHead>
                    <TableHead className="text-right">Tokens granted</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">$ / token</TableHead>
                    <TableHead className="text-right">Coverage vs cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packageAggs.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right">{num(p.unitsSold)}</TableCell>
                      <TableCell className="text-right">{compact(p.tokensGranted)}</TableCell>
                      <TableCell className="text-right">{usd(p.revenueUsd)}</TableCell>
                      <TableCell className="text-right">{usdFine(p.pricePerTokenUsd)}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            p.coverageRatio >= 2
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : p.coverageRatio >= 1
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-destructive/10 text-destructive'
                          }`}
                        >
                          {p.coverageRatio === 0 ? '—' : `${p.coverageRatio.toFixed(2)}×`}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        "Implied revenue" = app tokens consumed × effective sell price / token. Older consumption rows missing
        <code className="mx-1">api_cost_dollars</code>
        fall back to <code>model_pricing × provider tokens</code>, then to $0.10/token.
      </p>
    </div>
  );
};

export default AdminEconomics;
