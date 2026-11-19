const { ApiError } = require('./contract');

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const measurements = new Set(['shoulder', 'arm', 'upperArm', 'forearm', 'torso', 'hand', 'leg', 'calf', 'waist', 'hip']);
const skinValues = new Set(['oily', 'balanced', 'dry', 'unknown']);

function validEdit(field, value) {
  if (!isRecord(value)) return false;
  if (field === 'manualMeasurements') {
    return Object.entries(value).every(([key, cm]) => measurements.has(key) && Number.isFinite(cm) && cm > 0 && cm <= 300);
  }
  return field === 'skinSelfReport' && Object.keys(value).length === 2 && skinValues.has(value.tzone) && skinValues.has(value.cheeks);
}

async function userData({ database, userId, pathname, method, readBody }) {
  const document = pathname.match(/^\/api\/data\/(wardrobe|bangda)$/);
  if (document && method === 'GET') return database.document(userId, document[1]);
  if (document && method === 'PUT') {
    const data = await readBody();
    if (!Number.isSafeInteger(data?.revision) || data.revision < 0 || typeof data.mutation !== 'string' ||
        !/^[-a-zA-Z0-9]{8,100}$/.test(data.mutation) || !isRecord(data.value) ||
        /"data:image\//i.test(JSON.stringify(data.value))) throw new ApiError('INVALID_DATA', '账号记录格式不正确');
    return database.putDocument(userId, document[1], data);
  }
  if (pathname === '/api/reports' && method === 'GET') return database.listReports(userId);
  const report = pathname.match(/^\/api\/reports\/(ai-[-a-f0-9]+)$/);
  if (!report) return;
  if (method === 'GET') return database.report(userId, report[1]);
  if (method === 'DELETE') {
    database.removeReport(userId, report[1]);
    return {};
  }
  if (method === 'PUT') {
    const data = await readBody();
    if (!validEdit(data?.field, data?.value)) throw new ApiError('INVALID_DATA', '补充资料格式不正确');
    database.editReport(userId, report[1], data.field, data.value);
    return {};
  }
}
module.exports = { userData };
