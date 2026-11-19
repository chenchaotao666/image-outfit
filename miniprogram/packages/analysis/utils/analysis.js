// Demo data is intentionally independent of facial appearance. Do not label it as AI inference.
function validate(profile) {
  const checks = [['age', 16, 100, '年龄须在16～100岁之间'], ['height', 120, 230, '身高须在120～230厘米之间'], ['weight', 60, 400, '体重须在60～400斤之间']];
  for (const [key,min,max,message] of checks) { const value = Number(profile[key]); if (!Number.isFinite(value) || value < min || value > max) return message; }
  if (!['男','女'].includes(profile.gender)) return '请选择性别';
  return '';
}
function demoReport(profile) {
  const error = validate(profile); if (error) throw new Error(error);
  return { id: `demo-${Date.now()}`, mode: 'demo', createdAt: new Date().toISOString(), date: new Date().toLocaleDateString('zh-CN'), profile: { gender: profile.gender, age: Number(profile.age), height: Number(profile.height), weight: Number(profile.weight) / 2 }, face: '瓜子脸', style: '自然 · 都市休闲', season: '柔和秋', body: '标准型', summary: '以简洁线条和柔和配色为主，尝试有质感的基础款，让整体穿搭自然、协调。' };
}
module.exports = { validate, demoReport };
