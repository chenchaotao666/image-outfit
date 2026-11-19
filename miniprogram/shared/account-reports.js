const api = require('./account-api');
const cache = require('./report-store');

async function list() {
  const previous = cache.reports();
  const remote = await api.call('/reports');
  const ids = new Set(remote.map(row => row.id));
  for (const row of previous) if (row.accountReport && !ids.has(row.id)) cache.remove(row.id);
  const local = cache.reports().filter(row => !row.accountReport && !ids.has(row.id));
  return remote.concat(local).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

async function load(id) {
  const local = cache.get(id);
  if (local && !local.accountReport) return local;
  const report = await api.call('/reports/' + encodeURIComponent(id));
  cache.save(report);
  return cache.get(id);
}

async function update(report, field) {
  if (report.accountReport) {
    await api.call('/reports/' + encodeURIComponent(report.id), 'PUT', { field, value: report[field] });
  }
  cache.save(report);
}

async function remove(row) {
  if (row.accountReport) await api.call('/reports/' + encodeURIComponent(row.id), 'DELETE');
  cache.remove(row.id);
}
module.exports = { list, load, update, remove };
