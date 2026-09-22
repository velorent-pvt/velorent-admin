import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getFunnelStageMetrics } from './customer-funnel.ts';

const rows = [7, 3, 2, 5, 4, 1, 1, 3, 2, 2].map((current_customers, index) => ({ stage_index: index + 1, current_customers }));

test('direct vehicle views use app opens as the conversion base', () => {
  const result = getFunnelStageMetrics(rows[3], rows);
  assert.equal(result.dropped, 2);
  assert.equal(result.stageConversion, 5 / 7 * 100);
});

test('payment can progress without KYC events', () => {
  const result = getFunnelStageMetrics(rows[7], rows);
  assert.equal(result.dropped, 1);
  assert.equal(result.stageConversion, 75);
});

test('optional actions do not count skipped customers as dropoffs', () => {
  for (const index of [1, 2, 5, 6]) {
    const result = getFunnelStageMetrics(rows[index], rows);
    assert.equal(result.optional, true);
    assert.equal(result.dropped, null);
    assert.equal(result.stageConversion, null);
  }
});

test('an empty stage has zero share', () => {
  assert.equal(getFunnelStageMetrics({ stage_index: 10, current_customers: 0 }, rows).funnelShare, 0);
});
