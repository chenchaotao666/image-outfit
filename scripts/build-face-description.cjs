const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = 'config/llm-prompt/形象DNA/脸型分析/脸型解读-展示规则.json';
const rules = JSON.parse(fs.readFileSync(path.join(root, source), 'utf8'));
const { matchField, descriptions, fallback } = rules;
const nonempty = value => typeof value === 'string' && value.trim().length > 0;

if (!nonempty(matchField) || !descriptions || typeof descriptions !== 'object' ||
    Array.isArray(descriptions) || !Object.keys(descriptions).length ||
    !Object.entries(descriptions).every(([label, text]) => nonempty(label) && nonempty(text))) {
  throw Error('脸型解读需要匹配字段、脸型名称和对应文案');
}
if (!nonempty(fallback?.field) || !Number.isInteger(fallback.index) || fallback.index < 0 ||
    !Number.isInteger(fallback.maxLength) || fallback.maxLength < 1) {
  throw Error('脸型解读的备用观察字段、位置或文本长度无效');
}

const output = '// Generated from ' + source + '\nmodule.exports=' + JSON.stringify(rules, null, 2) + ';\n';
const target = path.join(root, 'miniprogram/packages/analysis/utils/face-description-data.js');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== output) {
    throw Error('请运行 npm run build:styling 同步脸型解读配置');
  }
} else {
  fs.writeFileSync(target, output);
}
