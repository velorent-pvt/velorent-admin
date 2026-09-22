import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../routes/reports/user-location.tsx', import.meta.url), 'utf8');

function loadRoute({ authenticated = true, bookings = [{ id: 'booking-id', customer_id: 'customer-id', booking_code: '05278873' }], locations = [{ latitude: '23.02', longitude: '72.57', recorded_at: '2026-09-22T10:00:00Z' }] } = {}) {
  const exports = {};
  const client = {
    auth: { getUser: async () => ({ data: { user: authenticated ? { id: 'admin-id' } : null }, error: null }) },
    rpc: async (_name, args) => ({ data: args.p_booking_code === '05278873' ? bookings : [], error: null }),
    from(table) {
      return { select() { return this; }, eq() { return this; },
        order: async () => ({ data: locations, error: null }),
        maybeSingle: async () => ({ data: { full_name: 'Customer' }, error: null }),
      };
    },
  };
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, Headers, URL, console,
    require(name) {
      if (name === '~/lib/supabase.server') return { createClient: async (request, response) => {
        assert.equal(request.headers.get('Cookie'), 'session=admin');
        response.headers.append('Set-Cookie', 'session=refreshed');
        return client;
      } };
      if (name === 'react-router') return require(name);
      if (name.startsWith('~/') || name.endsWith('.css')) return {};
      return require(name);
    },
  });
  return exports;
}

async function search(options) {
  const route = loadRoute(options);
  assert.equal(typeof route.loader, 'function', 'location searches must use the cookie-authenticated server loader');
  return route.loader({ request: new Request('https://admin.example/reports/user-location?bookingCode=%20%2305278873%20', { headers: { Cookie: 'session=admin' } }) });
}

test('cookie-authenticated searches resolve displayed booking codes and return location history', async () => {
  const result = await search();
  assert.equal(result.data.movement.bookingCode, '05278873');
  assert.equal(result.data.movement.locations[0].latitude, 23.02);
  assert.equal(result.init.headers.get('Set-Cookie'), 'session=refreshed');
});

test('expired sessions are not reported as missing bookings', async () => {
  const result = await search({ authenticated: false });
  assert.match(result.data.message, /sign in/i);
  assert.equal(result.data.movement, null);
});

test('missing bookings and bookings without location updates have distinct results', async () => {
  assert.match((await search({ bookings: [] })).data.message, /not found/i);
  assert.match((await search({ locations: [] })).data.message, /no location updates/i);
});
