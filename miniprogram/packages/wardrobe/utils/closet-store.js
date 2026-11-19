const documents = require('../../../shared/account-document');
const KEY = "yanchuang.wardrobe.v1";
const groups = [
  ["外套", "大衣", "风衣", "西装", "羽绒服", "开衫", "夹克"],
  ["内搭", "T恤", "衬衫", "卫衣", "毛衣", "内衣", "吊带", "袜子", "连衣裙", "其它"],
  ["下装", "短裤", "西装裤", "牛仔裤", "休闲裤", "运动裤", "长裤", "半裙", "背带裤"],
  ["鞋子", "休闲鞋", "运动鞋", "凉/拖鞋", "皮鞋", "高跟鞋", "靴子", "其它"],
  ["包包", "钱包", "单肩包", "手拎包", "背包", "其它包"],
  ["配饰", "帽子", "头饰", "胸针", "耳饰", "戒指", "项链", "墨镜", "围/丝巾/领带", "腰带", "手链", "手表", "手套"],
  ["彩妆", "底妆", "眉笔", "眼影", "腮红", "口红/唇膏", "睫毛膏", "化妆工具"],
];
const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
function empty() {
  return {
    version: 1,
    profile: { name: "温凉", avatar: "" },
    settings: {
      name: "我的衣橱",
      skin: "minimal",
      city: "东莞",
      season: "四季",
    },
    categories: groups.map((g, i) => ({
      id: "category-" + i,
      name: g[0],
      children: g.slice(1),
    })),
    items: [],
    looks: [],
    inspirations: [],
    albums: ["默认分类"],
    favoriteAlbums: ["默认分类"],
    calendar: [],
    feedback: [],
  };
}
function read() {
  const raw = documents.read('wardrobe');
  return raw && raw.version === 1 ? Object.assign(empty(), raw) : empty();
}
function write(state) {
  try {
    documents.write('wardrobe', state);
  } catch (error) {
    if (error.name === 'QuotaExceededError' || /quota|exceed|storage.*limit/i.test(error.message || error.errMsg || '')) {
      throw Error('衣橱保存失败：可用存储空间不足，当前编辑内容仍保留，请释放设备空间后重试');
    }
    throw error;
  }
  return state;
}
function update(fn) {
  const state = read();
  fn(state);
  return write(state);
}
function addItem(draft) {
  if (!draft.image) throw Error("请先选择服饰照片");
  if (!String(draft.name || "").trim()) throw Error("请填写服饰名称");
  return update((s) =>
    s.items.unshift({
      ...draft,
      name: draft.name.trim(),
      id: uid(),
      createdAt: Date.now(),
    }),
  );
}
function removeItems(ids) {
  return update((s) => {
    s.items = s.items.filter((i) => !ids.includes(i.id));
  });
}
function filterItems(
  items,
  {
    category = "全部",
    season = "四季",
    color = "",
    query = "",
    sort = "最新上传",
  } = {},
) {
  const filtered = items.filter(
    (i) =>
      (category === "全部" || i.category === category) &&
      (season === "四季" || i.season === "四季" || i.season === season || (i.seasons || []).includes(season)) &&
      (!color || i.color === color) &&
      (!query ||
        [i.name, i.category, i.subcategory, i.brand, i.notes, i.tags, i.location]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  return filtered
    .slice()
    .sort((a, b) =>
      sort === "最早上传"
        ? a.createdAt - b.createdAt
        : sort === "名称排序"
          ? a.name.localeCompare(b.name, "zh")
          : b.createdAt - a.createdAt,
    );
}
function saveLook(draft) {
  if (!draft.layers.length) throw Error("请先添加搭配单品");
  const look = {
    ...draft,
    id: uid(),
    createdAt: Date.now(),
    album: "默认分类",
    favorite: false,
  };
  update((s) => s.looks.unshift(look));
  return look;
}
function schedule(date, lookId) {
  const parsed = new Date(date + "T12:00:00Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  )
    throw Error("请选择有效日期");
  return update((s) => {
    if (!s.looks.some((l) => l.id === lookId)) throw Error("搭配不存在");
    s.calendar = s.calendar.filter(
      (e) => !(e.date === date && e.lookId === lookId),
    );
    s.calendar.push({ date, lookId, id: uid() });
  });
}
function monthDays(year, month, calendar) {
  const first = new Date(year, month - 1, 1).getDay(),
    count = new Date(year, month, 0).getDate(),
    days = Array.from({ length: first }, (_, i) => ({
      key: "blank-" + i,
      day: "",
      date: "",
    }));
  for (let d = 1; d <= count; d++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({
      key: date,
      date,
      day: d,
      count: calendar.filter((e) => e.date === date).length,
    });
  }
  return days;
}
function stats(state) {
  const total = state.items.length;
  return state.categories
    .map((c) => ({
      name: c.name,
      count: state.items.filter((i) => i.category === c.name).length,
    }))
    .map((c) => ({
      ...c,
      percent: total ? Math.round((c.count / total) * 100) : 0,
    }));
}
module.exports = {
  KEY,
  uid,
  empty,
  read,
  write,
  update,
  addItem,
  removeItems,
  filterItems,
  saveLook,
  schedule,
  monthDays,
  stats,
};
