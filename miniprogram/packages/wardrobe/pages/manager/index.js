const documents = require('../../../../shared/account-document');
const store = require("../../utils/closet-store");
const content = require("../../utils/closet-data");
const statisticsModel = require("../../utils/closet-statistics");
const uploadActions = require('./upload-actions');
const wardrobe = require("./wardrobe-actions");
const outfits = require("./outfit-actions");
const settings = require("./settings-actions");
Page({
  data: {
    ...content,
    tab: "home",
    screen: "",
    title: "",
    top: 44,
    sheet: "",
    category: "全部",
    season: "四季",
    color: "",
    query: "",
    sort: "最新上传",
    selected: [],
    selecting: false,
    inspirationTab: "收藏",
    album: "默认分类",
    viewGrid: true,
    activeLayer: 0,
    layers: [],
    background: "#ffffff",
    caption: "",
    expandedCategory: "",
    selectedDate: "",
    calendarList: false,
    calendarEditing: false,
    calendarFrom: '',
    calendarTo: '',
    statsTab: "单品",
    tutorialStep: 0,
    busy: false,
    photoProcessing: false,
    skinIndex: 0,
    feedbackImages: [],
    subcategoryMenuOpen: false,
  },
  onLoad(options) {
    this.options = options;
    this.loadAccount();
  },
  async loadAccount() {
    if (this.loadingAccount) return;
    this.loadingAccount = true;
    this.setData({ accountError: '' });
    try {
      await documents.open('wardrobe');
      this.showWardrobe(this.options);
      this.setData({ accountReady: true });
    } catch (error) {
      this.setData({ accountError: error.message || '读取衣橱失败' });
    } finally {
      this.loadingAccount = false;
    }
  },
  showWardrobe(options) {
    const info = wx.getWindowInfo();
    this.setData({
      top: info.statusBarHeight + 8,
      season: store.read().settings.season,
    });
    this.refresh();
    if (options.tab) this.setData({ tab: options.tab });
  },
  onShow() {
    if (this.data.accountReady) this.refresh();
  },
  refresh() {
    const state = store.read();
    const statistics = store.stats(state);
    const palette = [
      "#ed8d7c",
      "#f7cf63",
      "#8cd3c4",
      "#8bbde0",
      "#b6a2cd",
      "#ddacc2",
      "#a3b5b2",
    ];
    let offset = 0;
    const segments = statistics
      .filter((item) => item.count)
      .map((item, index) => {
        const from = offset;
        offset += (item.count / state.items.length) * 100;
        return `${palette[index % palette.length]} ${from}% ${offset}%`;
      });
    this.setData({
      state,
      ...statisticsModel.summarize(state),
      categories: state.categories,
      visibleCategories: state.categories.filter((category) => !category.hidden),
      tagGroups: (state.uploadGroups || {}).tags || [{ name: '我建的标签', values: [] }],
      categoryNames: state.categories.map((c) => c.name),
      categoryChildren:
        (state.categories.find((c) => c.name === this.data.category) || {})
          .children || [],
      visibleItems: store
        .filterItems(state.items, this.data)
        .map((i) => ({ ...i, selected: this.data.selected.includes(i.id) })),
      statistics,
      statsBackground: segments.length
        ? `conic-gradient(${segments.join(",")})`
        : "#e5e9e7",
      savedLooks: state.looks.filter((l) => l.favorite),
      otherLooks: state.looks.filter((l) => !l.favorite),
      inspirationItems: state.inspirations,
      categoryCover: content.asset + "category-" + ({"内搭":"inside","下装":"bottoms","鞋子":"shoes","包包":"bags","配饰":"accessories","彩妆":"makeup"}[this.data.category] || "all") + ".jpg",
      avatarImage: state.profile.avatar || content.asset + "avatar-cat.jpg",
      outfitSelection: state.items.filter((item) => this.data.selected.includes(item.id)),
      skinImage: content.asset + "skin-" + state.settings.skin + ".jpg",
    });
    if (this.data.screen === "calendar") this.renderCalendar();
  },
  persist(fn) {
    try {
      store.update(fn);
      this.refresh();
      return true;
    } catch (error) {
      wx.showToast({ title: "保存失败，请检查本机存储空间", icon: "none" });
      return false;
    }
  },
  toast(title) {
    wx.showToast({ title, icon: "none" });
  },
  switchTab(e) {
    this.setData({
      tab: e.currentTarget.dataset.tab,
      screen: "",
      sheet: "",
      selecting: false,
      selected: [],
      query: "",
    });
    this.refresh();
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },
  open(e) {
    this.go(e.currentTarget.dataset.screen, e.currentTarget.dataset.title);
  },
  go(screen, title) {
    this.stack = this.stack || [];
    const { screen: previousScreen, title: previousTitle, selecting, category, season, color, query } = this.data;
    this.stack.push({ screen: previousScreen, title: previousTitle, selecting, category, season, color, query });
    this.setData({ screen, title: title || "", sheet: "", selecting: false });
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    if (screen === "calendar") this.initCalendar();
    if (screen === "skins") this.setData({ skinIndex: Math.max(0, content.skins.findIndex((skin) => skin.id === this.data.state.settings.skin)) });
  },
  back() {
    if (this.data.sheet) {
      this.closeSheet();
      return;
    }
    const previous = (this.stack || []).pop();
    if (previous) {
      this.setData({ ...previous, sheet: "" });
      this.refresh();
    }
    else if (this.data.screen) this.setData({ screen: "", sheet: "" });
    else wx.navigateBack();
  },
  openSheet(e) {
    this.setData({ sheet: e.currentTarget.dataset.sheet });
  },
  closeSheet() {
    this.setData({ sheet: "" });
  },
  noop() {},
  input(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },
  ...wardrobe,
  ...uploadActions,
  ...outfits,
  ...settings,
});
