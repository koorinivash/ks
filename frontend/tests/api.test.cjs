const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const axios = require('axios');

function load(relative, imports) {
  const exports = {};
  const filename = path.join(__dirname, '..', relative);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS},
  }).outputText;
  vm.runInNewContext(code, {exports, require: (name) => imports[name]}, {filename});
  return exports;
}

test('shares in-flight reads, never caches completed responses, invalidates on writes', async () => {
  const service = load('src/services/api.ts', {axios, '../constants/config': {API_BASE_URL: 'http://test'}});
  const pending = [];
  service.api.defaults.adapter = config => new Promise(resolve => pending.push(() => resolve({
    config, status: 200, statusText: 'OK', headers: {}, data: {total_people: pending.length},
  })));
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const first = service.fetchDashboard(9, 2026);
  const second = service.fetchDashboard(9, 2026);
  await flush();
  assert.equal(pending.length, 1);
  pending[0]();
  assert.deepEqual(await first, await second);
  const third = service.fetchDashboard(9, 2026);
  await flush();
  assert.equal(pending.length, 2);
  const mutation = service.createPerson({name: 'Test'});
  await flush();
  pending[2]();
  await mutation;
  const fresh = service.fetchDashboard(9, 2026);
  await flush();
  assert.equal(pending.length, 4);
  pending[1]();
  await third;
  const sharedFresh = service.fetchDashboard(9, 2026);
  await flush();
  assert.equal(pending.length, 4, 'older completion must not evict newer pending request');
  pending[3]();
  assert.deepEqual(await fresh, await sharedFresh);
});

test('failed reads can be retried without retaining the rejected promise', async () => {
  const service = load('src/services/api.ts', {axios, '../constants/config': {API_BASE_URL: 'http://test'}});
  let calls = 0;
  service.api.defaults.adapter = async config => {
    if (++calls === 1) throw new Error('offline');
    return {config, status: 200, statusText: 'OK', headers: {}, data: []};
  };
  await assert.rejects(service.fetchPeople());
  assert.deepEqual(await service.fetchPeople(), []);
  assert.equal(calls, 2);
});

test('date format is stable across time zones and rejects invalid calendar days', () => {
  const constants = load('src/constants/index.ts', {});
  const format = load('src/utils/format.ts', {'../constants': constants});
  const previous = process.env.TZ;
  try {
    for (const zone of ['Asia/Kolkata', 'America/Los_Angeles', 'Pacific/Kiritimati', 'Etc/GMT+12']) {
      process.env.TZ = zone;
      assert.equal(format.formatDate('2026-09-13T12:00:00Z'), '13 Sep 2026');
      assert.equal(format.formatDate('2024-02-29'), '29 Feb 2024');
      assert.equal(format.formatDate('2026-02-30'), '\u2014');
      assert.equal(format.formatDate(null), '\u2014');
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
