// Statistics are derived from the current closet, never from reference fixtures.
const palette = ["#ee7f65", "#f9ca33", "#2091f3", "#7786a4", "#b6a2cd", "#ddacc2", "#a3b5b2"];
function distribution(items, field) {
  const counts = {};
  items.forEach(item => { const name = item[field] || "未分类"; counts[name] = (counts[name] || 0) + 1; });
  return Object.keys(counts).map(name => ({name, count: counts[name], percent: Math.round(counts[name] / items.length * 10000) / 100}))
    .sort((a,b) => b.count - a.count).map((item,index) => ({...item, color: palette[index % palette.length]}));
}
function gradient(rows) {
  let offset = 0;
  const segments = rows.map(row => { const from = offset; offset += row.percent; const gap = rows.length > 1 ? Math.min(.6, row.percent / 4) : 0; return `${row.color} ${from}% ${offset - gap}%,#fff ${offset - gap}% ${offset}%`; });
  return segments.length ? `conic-gradient(${segments.join(",")})` : "#eceeee";
}
function labels(rows) {
  let offset = 0;
  return rows.map(row => {
    const angle = (offset + row.percent / 2) * Math.PI / 50 - Math.PI / 2;
    offset += row.percent;
    const right = Math.cos(angle) >= 0;
    return { ...row, right, x: 50 + Math.cos(angle) * 27, y: 50 + Math.sin(angle) * 41 };
  });
}
function summarize(state) {
  const categories = distribution(state.items, "category"), occasions = distribution(state.looks, "occasion");
  return {
    itemLegend: categories, occasionLegend: occasions,
    itemLabels: labels(categories), occasionLabels: labels(occasions),
    itemGradient: gradient(categories), occasionGradient: gradient(occasions),
    subcategoryRanking: distribution(state.items, "subcategory").slice(0,10),
    colorRanking: distribution(state.items, "color").slice(0,10),
    seasonRanking: distribution(state.items, "season"),
  };
}
module.exports = { summarize };
