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
    console, localStorage, crypto: require("node:crypto").webcrypto, URLSearchParams, process: { env: {} },
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
      compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
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
  const archivedName = reloaded.history[0].members[0].name;
  reloaded.members[0].name = 'Renamed member';
  assert.equal(reloaded.history[0].members[0].name, archivedName);
  assert.equal(reloaded.expenses.length, 0);
  assert.equal(reloaded.history[0].expenses.length, 1);
  assert.equal(reloaded.history[0].debts.find((d) => d.fromMemberId === debt.fromMemberId && d.isPaid).isPaid, true);
  assert.equal(Object.keys(reloaded.paidDebts).length, 0);
  state.paidDebts[debt.id].amount += 1;
  assert.ok(storage.archiveCurrentPeriod(state, 'Changed amount').history[0].debts.some((d) => !d.isPaid));
});

test('history renders months newest first, archived member names, old periods and month filtering', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const members = [{ id: 'a', name: 'Current name' }, { id: 'b', name: 'Receiver' }];
  const period = {
    id: 'september', title: 'September archive', startDate: '2026-09-01', endDate: '2026-09-30',
    settledAt: '2026-09-30T10:00:00Z', totalAmount: 100, status: 'COMPLETED',
    members: [{ id: 'a', name: 'Archived name' }, members[1]],
    expenses: [{ id: 'e', title: 'Dinner', amount: 100, payerId: 'a', beneficiaryIds: ['a', 'b'], date: '2026-09-01' }],
    debts: [{ id: 'd', fromMemberId: 'a', toMemberId: 'b', amount: 50, isPaid: true }],
  };
  const oldPeriod = { ...period, id: 'august', title: 'August archive', members: undefined,
    settledAt: undefined, endDate: '2026-08-31', debts: [] };
  const { load } = fixture();
  const History = load('src/components/SettlementHistory.tsx').SettlementHistory;
  const html = renderToStaticMarkup(React.createElement(History, { history: [oldPeriod, period], members }));
  assert.ok(html.indexOf('September archive') < html.indexOf('August archive'));
  assert.ok(html.includes('Archived name'));
  assert.ok(html.includes('Current name'));
  assert.ok(html.includes('Đã trả'));
  assert.ok(html.includes('href="/"'));
  const filtered = fixture({ modules: { react: { ...React, useState: () => ['09/2026', () => {}] } } });
  const FilteredHistory = filtered.load('src/components/SettlementHistory.tsx').SettlementHistory;
  const filteredHtml = renderToStaticMarkup(React.createElement(FilteredHistory, { history: [oldPeriod, period], members }));
  assert.ok(filteredHtml.includes('September archive'));
  assert.ok(!filteredHtml.includes('August archive'));
  const emptyHtml = renderToStaticMarkup(React.createElement(History, { history: [], members }));
  assert.ok(emptyHtml.includes('Chưa có kỳ chốt sổ nào'));
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

test('individual payments reset only the paid debt and new spending starts from the remaining balance', () => {
  const { load } = fixture();
  const storage = load('src/lib/storage.ts');
  const { calculateDebtsByMode, calculateBalances, recordDebtPayment, getRecordedPayments } = load('src/lib/settlement-algorithm.ts');
  const state = structuredClone(storage.INITIAL_STATE);
  const [a, b, c, d] = state.members;
  state.expenses = [{ id: 'meal', title: 'Meal', amount: 400, payerId: a.id,
    beneficiaryIds: [a.id, b.id, c.id, d.id], category: 'FOOD', date: '2026-10-14' }];
  const debtsOf = (s) => calculateDebtsByMode(s.members, s.expenses, s.settlementMode, getRecordedPayments(s));
  const bDebt = debtsOf(state).find((debt) => debt.fromMemberId === b.id);
  const paid = recordDebtPayment(state, bDebt);
  assert.equal(debtsOf(paid).length, 2);
  assert.ok(!debtsOf(paid).some((debt) => debt.fromMemberId === b.id));
  assert.equal(debtsOf(paid).find((debt) => debt.fromMemberId === c.id).amount, 100);
  assert.equal(recordDebtPayment(paid, bDebt), paid, 'double clicks do not record another transfer');
  storage.saveState(paid);
  assert.equal(debtsOf(storage.getInitialState()).length, 2);
  const next = { ...paid, expenses: [...paid.expenses, { ...state.expenses[0], id: 'new-meal', amount: 80 }] };
  assert.equal(debtsOf(next).find((debt) => debt.fromMemberId === b.id).amount, 20);
  assert.equal(debtsOf(next).find((debt) => debt.fromMemberId === c.id).amount, 120);
  assert.equal(calculateBalances(next.members, next.expenses, next.payments)[b.id].netBalance, -20);
  assert.equal(next.expenses.reduce((sum, expense) => sum + expense.amount, 0), 480);
  const second = recordDebtPayment(next, debtsOf(next).find((debt) => debt.fromMemberId === b.id));
  assert.equal(second.payments.length, 2);
  assert.ok(!debtsOf(second).some((debt) => debt.fromMemberId === b.id));
  const optimal = { ...state, settlementMode: 'OPTIMAL' };
  assert.equal(debtsOf(recordDebtPayment(optimal, debtsOf(optimal)[0])).length, 2);
  const multiple = { ...state, expenses: [...state.expenses, {
    ...state.expenses[0], id: 'other-creditor', payerId: c.id, beneficiaryIds: [b.id], amount: 60,
  }] };
  const onePaid = recordDebtPayment(multiple, debtsOf(multiple).find((debt) => debt.fromMemberId === b.id && debt.toMemberId === a.id));
  assert.equal(debtsOf(onePaid).find((debt) => debt.fromMemberId === b.id).amount, 60);
  const fractional = { ...state, expenses: [{ ...state.expenses[0], amount: 101, beneficiaryIds: [a.id, b.id] }] };
  assert.equal(debtsOf(recordDebtPayment(fractional, debtsOf(fractional)[0])).length, 0);
  const reversed = { ...paid, expenses: [...paid.expenses, {
    ...state.expenses[0], id: 'reverse', payerId: b.id, beneficiaryIds: [a.id], amount: 30,
  }] };
  assert.equal(debtsOf(reversed).find((debt) => debt.fromMemberId === a.id && debt.toMemberId === b.id).amount, 30);
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
  const Home = load('src/components/EquiPayApp.tsx').default;
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
  assert.equal(storage.getInitialState().payments[0].amount, debt.amount);
  assert.equal(writes.at(-1).payments[0].amount, debt.amount);
  assert.equal(storage.hasPendingSync(), true);
  // Simulate reload with the same localStorage and a fresh component instance.
  hooks = []; effects = []; mounted = false;
  render(); effects.forEach((effect) => effect()); await flush();
  assert.equal(fetchCount, 1, 'pending local state is retried before fetching stale cloud state');
  find(render(), 'TabNavigation').onTabChange('PAYMENT');
  assert.equal(find(render(), 'PaymentTab').state.payments[0].amount, debt.amount);
  find(render(), 'PaymentTab').onTogglePaid(debt); await flush();
  assert.equal(storage.getInitialState().payments.length, 1);
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
