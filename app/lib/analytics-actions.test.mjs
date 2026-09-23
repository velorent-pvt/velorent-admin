import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as actions from './analytics-actions.ts';

test('missing dates default both ends to today, while explicit ranges survive', () => {
  const today = new Date(2026, 8, 23, 12);
  assert.deepEqual(actions.getActionDateRange(new URLSearchParams(), today), {
    start: '2026-09-23', end: '2026-09-23',
  });
  assert.deepEqual(actions.getActionDateRange(new URLSearchParams('start=2026-08-25&end=2026-09-23'), today), {
    start: '2026-08-25', end: '2026-09-23',
  });
});

test('changing action dates preserves the stage and resets pagination', () => {
  assert.equal(actions.updateActionDateRange(
    new URLSearchParams('stage=4&start=2026-09-01&end=2026-09-20&table.Customers.page=5'),
    'start', new Date(2026, 8, 23).toISOString(),
  )?.toString(), 'stage=4&start=2026-09-23&end=2026-09-23');
});

test('action queries include occurrences beyond the database row limit', async () => {
  const records = Array.from({ length: 1001 }, (_, action_id) => ({ action_id, id: 'same-customer' }));
  const result = await actions.loadAllAnalyticsActions((from, to) =>
    Promise.resolve({ data: records.slice(from, to + 1), error: null }),
  );
  assert.equal(result?.data?.length, 1001);
  assert.equal(result?.data?.[1000].action_id, 1000);
});

test('a later page failure does not return an incomplete action list as success', async () => {
  const result = await actions.loadAllAnalyticsActions((from) => Promise.resolve(
    from === 0 ? { data: Array(1000).fill({ id: 'same-customer' }), error: null }
      : { data: null, error: { message: 'Read failed', code: '500' } },
  ));
  assert.equal(result?.error?.message, 'Read failed');
  assert.equal(result?.data, null);
});
