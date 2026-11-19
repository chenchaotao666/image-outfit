const test = require("node:test"),
  assert = require("node:assert/strict");
const model = require("../miniprogram/packages/wardrobe/utils/closet-store");
const statistics = require("../miniprogram/packages/wardrobe/utils/closet-statistics");

test("closet statistics distinguish garment distribution from outfit occasions", () => {
  const summary = statistics.summarize({items:[{category:"内搭",color:"白色",season:"夏季"},{category:"内搭",color:"黑色",season:"冬季"}],looks:[{occasion:"都市休闲"},{occasion:"商务职场"}]});
  assert.equal(summary.itemLegend[0].percent, 100);
  assert.equal(summary.occasionLegend.length, 2);
  assert.equal(summary.occasionLegend[0].percent, 50);
  assert.equal(summary.subcategoryRanking[0].name, "未分类");
  assert.deepEqual(statistics.summarize({items:[],looks:[]}).colorRanking, []);
});
test("wardrobe conditional expressions use native WXML binding syntax", () => {
  const fs = require("node:fs"), path = require("node:path");
  const directory = "miniprogram/packages/wardrobe/pages/manager/views";
  for (const file of fs.readdirSync(directory)) {
    const source = fs.readFileSync(path.join(directory, file), "utf8");
    for (const match of source.matchAll(/wx:if="([^"]+)"/g)) assert.ok(match[1].startsWith("{{") && match[1].endsWith("}}"), file);
    for (const match of source.matchAll(/{{([\s\S]*?)}}/g)) assert.ok(!match[1].includes("\n"), "Keep WXML string expressions intact: " + file);
  }
});
function reset() {
  const values = new Map();
  global.wx = {
    getStorageSync: (k) => structuredClone(values.get(k)),
    setStorageSync: (k, v) => values.set(k, structuredClone(v)),
  };
  return values;
}
test("wardrobe persists independently and filters category, season and search together", () => {
  const values = reset();
  values.set("yanchuang.reports.v1", [{ id: "report" }]);
  model.addItem({
    image: "photo.jpg",
    name: "  白衬衫  ",
    category: "内搭",
    season: "四季",
    color: "白色",
    brand: "品牌",
  });
  model.addItem({
    image: "coat.jpg",
    name: "冬季大衣",
    category: "外套",
    season: "冬季",
    color: "黑色",
  });
  const state = model.read();
  assert.equal(state.items.length, 2);
  assert.equal(
    model.filterItems(state.items, {
      category: "内搭",
      season: "夏季",
      query: "品牌",
    })[0].name,
    "白衬衫",
  );
  assert.equal(
    model.filterItems(state.items, { category: "内搭", color: "黑色" }).length,
    0,
  );
  model.removeItems([state.items[0].id]);
  assert.equal(model.read().items.length, 1);
  assert.deepEqual(values.get("yanchuang.reports.v1"), [{ id: "report" }]);
});
test("saved layouts survive source garment removal and calendar scheduling is idempotent", () => {
  reset();
  model.addItem({ image: "photo.jpg", name: "衬衫", category: "内搭" });
  const item = model.read().items[0],
    look = model.saveLook({
      layers: [{ itemId: item.id, image: item.image, x: 10, y: 20, width: 40 }],
      name: "通勤",
    });
  model.removeItems([item.id]);
  model.schedule("2026-11-18", look.id);
  model.schedule("2026-11-18", look.id);
  assert.equal(model.read().looks[0].layers[0].image, "photo.jpg");
  assert.equal(model.read().calendar.length, 1);
  assert.throws(() => model.schedule("2026-11-18", "missing"));
});
test("calendar aligns Sunday-first and handles leap years", () => {
  const days = model.monthDays(2024, 2, []);
  assert.equal(days.filter((d) => d.day).length, 29);
  assert.equal(days[4].day, 1);
  assert.equal(model.monthDays(2026, 11, [])[0].day, 1);
  assert.equal(
    model
      .monthDays(2026, 11, [{ date: "2026-11-18" }])
      .find((d) => d.day === 18).count,
    1,
  );
});
