/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test harness. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Load the real TypeScript modules with isolated browser storage and mocked I/O.
function fixture(overrides = {}) {
  const values = new Map();
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const context = vm.createContext({
    console, localStorage, URLSearchParams, process: { env: {} },
    window: { location: { search: '' }, addEventListener() {}, removeEventListener() {} },
    document: { addEventListener() {}, removeEventListener() {} },
    setTimeout() {},
    ...overrides.globals,
  });
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loadedModule = { exports: {} };
    cache.set(filename, loadedModule);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const localRequire = (name) => {
      if (name in (overrides.modules || {})) return overrides.modules[name];
      if (name.startsWith('@/components/')) return new Proxy({}, { get: (_, key) => key });
      if (name.startsWith('@/')) return load(path.resolve('src', name.slice(2)) + '.ts');
      if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name) + '.ts');
      return require(name);
    };
    vm.runInContext(`(function(require, module, exports) { ${code}\n})`, context)(localRequire, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  return { load, localStorage };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

test('paid status and archived expenses survive reload, with fresh status for the next period', () => {
  const { load } = fixture();
  const storage = load('src/lib/storage.ts');
  const { calculateDebtsByMode } = load('src/lib/settlement-algorithm.ts');
  const state = structuredClone(storage.INITIAL_STATE);
  state.expenses = [{ id: 'expense', title: 'Dinner', amount: 400, payerId: state.members[0].id,
    beneficiaryIds: state.members.map((m) => m.id), category: 'FOOD', date: '2026-09-27' }];
  const debt = calculateDebtsByMode(state.members, state.expenses, 'PAIRWISE')[0];
  state.paidDebts = { [debt.id]: { amount: debt.amount, paidAt: '2026-09-27T00:00:00Z' } };
  storage.saveState(state);
  assert.equal(storage.getInitialState().paidDebts[debt.id].amount, debt.amount);
  storage.archiveCurrentPeriod(storage.getInitialState(), 'September');
  const reloaded = storage.getInitialState();
  assert.equal(reloaded.expenses.length, 0);
  assert.equal(reloaded.history[0].expenses.length, 1);
  assert.equal(reloaded.history[0].debts.find((d) => d.id === debt.id).isPaid, true);
  assert.equal(Object.keys(reloaded.paidDebts).length, 0);
  state.paidDebts[debt.id].amount += 1;
  assert.equal(storage.archiveCurrentPeriod(state, 'Changed amount').history[0].debts[0].isPaid, false);
});

test('cloud writes are ordered and a successful API write does not write through the SDK again', async () => {
  const writes = [];
  let finishFirst;
  let sdkCalls = 0;
  const { load, localStorage } = fixture({ modules: {
    '@supabase/supabase-js': { createClient: () => { sdkCalls++; throw new Error('Unexpected SDK fallback'); } },
  }, globals: { fetch: async (_, request) => {
    writes.push(JSON.parse(request.body).state);
    if (writes.length === 1) await new Promise((resolve) => { finishFirst = resolve; });
    return { ok: true, json: async () => ({ success: true }) };
  } } });
  localStorage.setItem('EQUIPAY_SUPABASE_CONFIG_V1', JSON.stringify({ url: 'https://example.test', anonKey: 'test' }));
  const { pushCloudState } = load('src/lib/supabase.ts');
  const first = pushCloudState({ version: 1 });
  const second = pushCloudState({ version: 2 });
  await flush();
  assert.equal(writes.length, 1);
  finishFirst();
  assert.equal((await first).source, 'server_api');
  assert.equal((await second).success, true);
  assert.deepEqual(writes.map((s) => s.version), [1, 2]);
  assert.equal(sdkCalls, 0);
});

test('SDK database errors are reported instead of false success', async () => {
  const { load, localStorage } = fixture({
    globals: { fetch: async () => ({ ok: false, status: 500 }) },
    modules: { '@supabase/supabase-js': { createClient: () => ({
      from: () => ({ upsert: async () => ({ error: { message: 'Write denied' } }) }),
    }) } },
  });
  localStorage.setItem('EQUIPAY_SUPABASE_CONFIG_V1', JSON.stringify({ url: 'https://example.test', anonKey: 'test' }));
  const result = await load('src/lib/supabase.ts').pushCloudState({});
  assert.equal(result.success, false);
  assert.equal(result.error, 'Write denied');
});

test('page persists paid toggles and archive through the common sync path; pending changes survive remount', async () => {
  let hooks = [], index = 0, effects = [], mounted = false;
  const react = {
    useCallback(callback) { return callback; },
    useState(initial) {
      const slot = index++;
      if (!(slot in hooks)) hooks[slot] = initial;
      return [hooks[slot], (value) => { hooks[slot] = typeof value === 'function' ? value(hooks[slot]) : value; }];
    },
    useRef(initial) {
      const slot = index++;
      if (!(slot in hooks)) hooks[slot] = { current: initial };
      return hooks[slot];
    },
    useEffect(effect) { if (!mounted) effects.push(effect); },
  };
  const writes = [];
  let fetchCount = 0;
  let online = false;
  const { load } = fixture({ modules: {
    react,
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    '@/lib/auth-crypto': { isPasswordHashed: () => true },
    '@/lib/supabase': {
      fetchCloudState: async () => { fetchCount++; return { state: null, error: 'offline' }; },
      pushCloudState: async (state) => { writes.push(state); return { success: online, error: online ? undefined : 'offline' }; },
      subscribeToCloudChanges: () => null,
    },
  } });
  const storage = load('src/lib/storage.ts');
  const initial = structuredClone(storage.INITIAL_STATE);
  initial.expenses = [{ id: 'expense', title: 'Dinner', amount: 400, payerId: initial.members[0].id,
    beneficiaryIds: initial.members.map((m) => m.id), category: 'FOOD', date: '2026-09-27' }];
  storage.saveState(initial);
  storage.setCurrentUser(initial.users[0]);
  const Home = load('src/app/page.tsx').default;
  const render = () => { index = 0; const tree = Home(); mounted = true; return tree; };
  const find = (tree, name) => {
    if (!tree || typeof tree !== 'object') return;
    if (tree.type === name) return tree.props;
    for (const child of [tree.props?.children].flat()) {
      const found = find(child, name);
      if (found) return found;
    }
  };
  render(); effects.forEach((effect) => effect()); await flush();
  find(render(), 'TabNavigation').onTabChange('PAYMENT');
  const debt = load('src/lib/settlement-algorithm.ts').calculateDebtsByMode(initial.members, initial.expenses, 'PAIRWISE')[0];
  find(render(), 'PaymentTab').onTogglePaid(debt); await flush();
  assert.equal(storage.getInitialState().paidDebts[debt.id].amount, debt.amount);
  assert.equal(writes.at(-1).paidDebts[debt.id].amount, debt.amount);
  assert.equal(storage.hasPendingSync(), true);
  // Simulate reload with the same localStorage and a fresh component instance.
  hooks = []; effects = []; mounted = false;
  render(); effects.forEach((effect) => effect()); await flush();
  assert.equal(fetchCount, 1, 'pending local state is retried before fetching stale cloud state');
  find(render(), 'TabNavigation').onTabChange('PAYMENT');
  assert.equal(find(render(), 'PaymentTab').state.paidDebts[debt.id].amount, debt.amount);
  find(render(), 'PaymentTab').onTogglePaid(debt); await flush();
  assert.equal(storage.getInitialState().paidDebts[debt.id], undefined);
  find(render(), 'PaymentTab').onTogglePaid(debt); await flush();
  find(render(), 'PaymentTab').onArchivePeriod('September'); await flush();
  assert.equal(writes.at(-1).expenses.length, 0);
  assert.equal(writes.at(-1).history.length, 1);
  assert.equal(storage.getInitialState().history[0].title, 'September');
  online = true;
  hooks = []; effects = []; mounted = false;
  render(); effects.forEach((effect) => effect()); await flush();
  assert.equal(writes.at(-1).expenses.length, 0);
  assert.equal(storage.hasPendingSync(), false, 'successful retry clears pending changes');
  assert.equal(fetchCount, 1);
});
