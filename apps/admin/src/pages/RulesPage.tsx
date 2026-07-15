import { FormEvent, useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  toast,
} from '@cardwise/ui';

import { listRewardRules, previewRewardRule, type RewardPreviewResult } from '../lib/api';

type RuleView = {
  rule: { id: string; ruleKey: string; name: string };
  activeVersion: {
    id: string;
    versionNumber: number;
    status: string;
    payload?: Record<string, unknown>;
  };
};

const DEFAULT_PREVIEW_PAYLOAD = {
  cashbackPercent: 5,
  capPeriod: 'quarterly',
  periodCapInr: 1500,
  exclusions: ['fuel', 'rent'],
};

export function RulesPage() {
  const [rows, setRows] = useState<RuleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewAmount, setPreviewAmount] = useState('10000');
  const [periodSpend, setPeriodSpend] = useState('0');
  const [periodRewards, setPeriodRewards] = useState('0');
  const [payloadJson, setPayloadJson] = useState(JSON.stringify(DEFAULT_PREVIEW_PAYLOAD, null, 2));
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<RewardPreviewResult | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await listRewardRules();
        setRows(data as RuleView[]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load rules');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function loadRuleIntoPreview(row: RuleView) {
    if (row.activeVersion.payload) {
      setPayloadJson(JSON.stringify(row.activeVersion.payload, null, 2));
      setPreviewResult(null);
    }
  }

  async function handlePreview(event: FormEvent) {
    event.preventDefault();
    setPreviewLoading(true);
    setPreviewResult(null);
    try {
      const payload = JSON.parse(payloadJson) as Record<string, unknown>;
      const amount = Number(previewAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Amount must be a positive number');
      }
      const result = await previewRewardRule({
        amount,
        payload,
        pointValueInr: 0.25,
        periodSpendInr: Number(periodSpend) || 0,
        periodRewardsEarnedInr: Number(periodRewards) || 0,
      });
      setPreviewResult(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reward rules</h1>
        <p className="text-sm text-muted-foreground">
          Active rule versions with V2 preview — rolling caps, quarterly campaigns, cumulative
          milestones.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Active rules</CardTitle>
            <CardDescription>
              Click a rule to load its payload into the preview panel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
            {!loading && rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active reward rules.</p>
            ) : null}
            {rows.map((row) => (
              <button
                key={row.rule.id}
                type="button"
                onClick={() => loadRuleIntoPreview(row)}
                className="w-full border-b border-border py-3 text-left last:border-0 hover:bg-muted/40"
              >
                <p className="font-medium">{row.rule.name}</p>
                <p className="text-xs text-muted-foreground">
                  {row.rule.ruleKey} · v{row.activeVersion.versionNumber} ·{' '}
                  {row.activeVersion.status}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rule preview (V2)</CardTitle>
            <CardDescription>
              POST /admin/reward-rules/preview — test caps, campaigns, and milestones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePreview} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="preview-amount">Amount (₹)</Label>
                  <Input
                    id="preview-amount"
                    type="number"
                    min={1}
                    value={previewAmount}
                    onChange={(e) => setPreviewAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period-spend">Period spend (₹)</Label>
                  <Input
                    id="period-spend"
                    type="number"
                    min={0}
                    value={periodSpend}
                    onChange={(e) => setPeriodSpend(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period-rewards">Period rewards (₹)</Label>
                  <Input
                    id="period-rewards"
                    type="number"
                    min={0}
                    value={periodRewards}
                    onChange={(e) => setPeriodRewards(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payload-json">Rule payload (JSON)</Label>
                <textarea
                  id="payload-json"
                  className="min-h-[180px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
                  value={payloadJson}
                  onChange={(e) => setPayloadJson(e.target.value)}
                  spellCheck={false}
                />
              </div>
              <Button type="submit" disabled={previewLoading}>
                {previewLoading ? 'Calculating…' : 'Preview reward'}
              </Button>
            </form>

            {previewResult ? (
              <div className="mt-6 space-y-2 rounded-md border border-border bg-muted/30 p-4 text-sm">
                <p className="font-medium">
                  ₹{previewResult.estimatedValueInr.toFixed(2)} estimated (
                  {previewResult.effectiveRatePercent}% effective)
                </p>
                <p className="text-muted-foreground">{previewResult.explanation}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {previewResult.campaignApplied ? (
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs">Campaign</span>
                  ) : null}
                  {previewResult.milestoneCrossed ? (
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs">Milestone</span>
                  ) : null}
                  {previewResult.capped ? (
                    <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs">Capped</span>
                  ) : null}
                  {previewResult.excluded ? (
                    <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs">Excluded</span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Confidence {Math.round(previewResult.confidenceScore * 100)}%
                  {previewResult.periodCapRemainingInr !== undefined
                    ? ` · ₹${previewResult.periodCapRemainingInr} cap remaining`
                    : ''}
                </p>
                {previewResult.benefitsApplied.length > 0 ? (
                  <ul className="list-inside list-disc text-xs text-muted-foreground">
                    {previewResult.benefitsApplied.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
