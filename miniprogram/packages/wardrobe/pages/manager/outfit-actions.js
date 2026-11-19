const store = require("../../utils/closet-store");
module.exports = {
  startOutfit() {
    this.setData({
      layers: [],
      caption: "",
      background: "#ffffff",
      activeLayer: 0,
      lookName: "",
      occasion: "都市休闲",
    });
    this.go("outfit-select", "随意搭");
    const firstItem = this.data.state.items[0];
    this.setData({ selected: [], selecting: true, category: firstItem ? firstItem.category : "内搭", query: "", season: "四季", color: "", subcategory: "" });
    this.refresh();
  },
  beginSelectedOutfit() {
    if (!this.data.selected.length) return this.toast("请先选择单品");
    this.go("editor", "搭配拼图");
    this.setData({ layers: [], activeLayer: 0 });
    for (const id of this.data.selected) this.addLayer({currentTarget:{dataset:{id}}});
  },
  addLayer(e) {
    const item = this.data.state.items.find(
      (i) => i.id === e.currentTarget.dataset.id,
    );
    const layers = this.data.layers;
    if (!item) return;
    if (layers.length >= 12) return this.toast("每套搭配最多添加 12 件单品");
    const next = {
      id: store.uid(),
      itemId: item.id,
      image: item.image,
      x: 12 + (layers.length % 3) * 23,
      y: 10 + Math.floor(layers.length / 3) * 20,
      width: 36,
    };
    this.setData({ layers: layers.concat(next), activeLayer: layers.length });
  },
  selectLayer(e) {
    this.setData({ activeLayer: Number(e.currentTarget.dataset.index) });
  },
  dragStart(e) {
    this.drag = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      layer: { ...this.data.layers[this.data.activeLayer] },
    };
    const query = wx.createSelectorQuery();
    query
      .selectAll(".look-canvas")
      .boundingClientRect((rects) => {
        this.canvasRect = rects[0];
      })
      .exec();
  },
  dragMove(e) {
    if (!this.drag || !this.canvasRect) return;
    const layers = this.data.layers.map((l) => ({ ...l })),
      l = layers[this.data.activeLayer];
    l.x = Math.max(
      0,
      Math.min(
        100 - l.width,
        this.drag.layer.x +
          ((e.touches[0].clientX - this.drag.x) / this.canvasRect.width) * 100,
      ),
    );
    l.y = Math.max(
      0,
      Math.min(
        70,
        this.drag.layer.y +
          ((e.touches[0].clientY - this.drag.y) / this.canvasRect.height) * 100,
      ),
    );
    this.setData({ layers });
  },
  dragEnd() {
    this.drag = null;
  },
  layerAction(e) {
    const action = e.currentTarget.dataset.action,
      layers = this.data.layers.slice(),
      at = this.data.activeLayer,
      l = layers[at];
    if (!l) return this.toast("请先添加单品");
    let next = at;
    if (action === "delete") {
      layers.splice(at, 1);
      next = Math.max(0, at - 1);
    }
    if (action === "front") {
      layers.splice(at, 1);
      layers.push(l);
      next = layers.length - 1;
    }
    if (action === "back") {
      layers.splice(at, 1);
      layers.unshift(l);
      next = 0;
    }
    if (action === "up" && at < layers.length - 1) {
      layers.splice(at, 1);
      layers.splice(at + 1, 0, l);
      next = at + 1;
    }
    if (action === "down" && at > 0) {
      layers.splice(at, 1);
      layers.splice(at - 1, 0, l);
      next = at - 1;
    }
    if (action === "larger") l.width = Math.min(70, l.width + 5);
    if (action === "smaller") l.width = Math.max(15, l.width - 5);
    this.setData({ layers, activeLayer: next });
  },
  outfitNext() {
    if (!this.data.layers.length) return this.toast("请先选择下方单品开始搭配");
    this.setData({ sheet: "save-look" });
  },
  saveOutfit() {
    try {
      const look = store.saveLook({
        name: this.data.lookName.trim() || "今日搭配",
        layers: this.data.layers,
        background: this.data.background,
        caption: this.data.caption,
        occasion: this.data.occasion,
      });
      this.setData({ look, lookDate: this.formatLookDate(look.createdAt), sheet: "" });
      this.refresh();
      this.go("look", "随意搭");
    } catch (e) {
      this.toast(e.message || "保存失败");
    }
  },
  openLook(e) {
    const look = this.data.state.looks.find(l => l.id === e.currentTarget.dataset.id);
    if (!look) return this.toast('搭配已不存在');
    this.setData({
      look, lookDate: this.formatLookDate(look.createdAt),
    });
    this.go("look", "搭配详情");
  },
  favoriteLook() {
    if (!this.data.look.favorite && this.data.state.favoriteAlbums.length > 1) return this.setData({sheet: 'favorite-album'});
    const id = this.data.look.id;
    if (
      this.persist((s) => {
        const l = s.looks.find((l) => l.id === id);
        l.favorite = !l.favorite;
      })
    ) {
      this.setData({ look: this.data.state.looks.find((l) => l.id === id) });
      this.toast(this.data.look.favorite ? "已收藏搭配" : "已取消收藏");
    }
  },
  saveFavoriteAlbum(e) {
    const id = this.data.look.id, album = e.currentTarget.dataset.name;
    if (this.persist(s => { const look = s.looks.find(l => l.id === id); look.favorite = true; look.album = album; })) {
      this.setData({ look: this.data.state.looks.find(l => l.id === id), sheet: '' });
      this.toast('已保存到收藏');
    }
  },
  formatLookDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },
  deleteLook() {
    wx.showModal({
      title: "删除这套搭配？",
      content: "相关的收藏和日历记录也会删除。",
      success: (r) => {
        if (
          r.confirm &&
          this.persist((s) => {
            s.looks = s.looks.filter((l) => l.id !== this.data.look.id);
            s.calendar = s.calendar.filter(
              (e) => e.lookId !== this.data.look.id,
            );
          })
        ) {
          this.back();
        }
      },
    });
  },
  inspirationTabChange(e) {
    this.setData({ inspirationTab: e.currentTarget.dataset.name });
  },
  toggleGrid() {
    this.setData({ viewGrid: !this.data.viewGrid });
  },
  previewInspiration(e) {
    this.setData({
      photo: this.data.state.inspirations.find(
        (i) => i.id === e.currentTarget.dataset.id,
      ),
    });
    this.go("photo", "灵感详情");
  },
  deleteInspiration() {
    wx.showModal({
      title: "删除这张灵感？",
      content: "删除后无法恢复。",
      success: (r) => {
        if (
          r.confirm &&
          this.persist(
            (s) =>
              (s.inspirations = s.inspirations.filter(
                (i) => i.id !== this.data.photo.id,
              )),
          )
        )
          this.back();
      },
    });
  },
  addAlbum() {
    this.setData({
      sheet: "rename",
      renameKind: this.data.inspirationTab === '收藏' ? 'favorite-album' : 'album',
      renameTitle: this.data.inspirationTab === '收藏' ? '新增收藏分类' : '新增灵感分类',
      renameValue: "",
    });
  },
  manageAlbums() { this.go('albums', this.data.inspirationTab === '收藏' ? '收藏管理' : '灵感管理'); },
  albumMenu(e) { this.setData({ sheet: 'album-menu', menuAlbum: e.currentTarget.dataset.name }); },
  renameAlbum() { this.setData({ sheet: 'rename', renameKind: 'album-edit', renameTitle: '修改分类', renameValue: this.data.menuAlbum }); },
  deleteAlbum() {
    if (this.data.menuAlbum === '默认分类') return this.toast('默认分类不能删除');
    const favorite = this.data.inspirationTab === '收藏', name = this.data.menuAlbum;
    wx.showModal({ title: '删除这个分类？', content: '分类中的内容会移入默认分类。', success: result => {
      if (result.confirm && this.persist(s => {
        const key = favorite ? 'favoriteAlbums' : 'albums';
        s[key] = s[key].filter(album => album !== name);
        (favorite ? s.looks : s.inspirations).forEach(item => { if (item.album === name) item.album = '默认分类'; });
      })) this.closeSheet();
    } });
  },
  remakeLook() {
    const look = this.data.look;
    this.go('editor', '搭配拼图');
    this.setData({ layers: look.layers.map(layer => ({ ...layer })), activeLayer: 0, background: look.background, caption: look.caption || '', occasion: look.occasion, lookName: look.name, selected: look.layers.map(layer => layer.itemId).filter(Boolean) });
    this.refresh();
  },
  initCalendar() {
    const now = new Date();
    this.setData({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      selectedDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    });
    this.renderCalendar();
  },
  renderCalendar() {
    const { year, month, selectedDate, state } = this.data;
    const entries = state.calendar
      .filter((e) => this.data.calendarList || e.date === selectedDate)
      .filter(e => !this.data.calendarList || ((!this.data.calendarFrom || e.date >= this.data.calendarFrom) && (!this.data.calendarTo || e.date <= this.data.calendarTo)))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({ ...e, look: state.looks.find((l) => l.id === e.lookId) }))
      .filter((e) => e.look);
    this.setData({
      days: store.monthDays(year, month, state.calendar).map(day => {
        const entry = state.calendar.find(e => e.date === day.date);
        return { ...day, look: entry && state.looks.find(l => l.id === entry.lookId) };
      }),
      calendarEntries: entries,
    });
  },
  pickMonth(e) {
    const parts = e.detail.value.split("-").map(Number);
    this.setData({year: parts[0], month: parts[1]});
    this.renderCalendar();
  },
  monthChange(e) {
    const d = new Date(
      this.data.year,
      this.data.month - 1 + Number(e.currentTarget.dataset.delta),
      1,
    );
    this.setData({ year: d.getFullYear(), month: d.getMonth() + 1 });
    this.renderCalendar();
  },
  selectDate(e) {
    if (!e.currentTarget.dataset.date) return;
    this.setData({ selectedDate: e.currentTarget.dataset.date });
    this.renderCalendar();
  },
  toggleCalendar() {
    this.setData({ calendarList: !this.data.calendarList, calendarEditing: false });
    this.renderCalendar();
  },
  editCalendar() { this.setData({ calendarEditing: !this.data.calendarEditing, sheet: '' }); },
  pickCalendarRange(e) { this.setData({ [e.currentTarget.dataset.field]: e.detail.value }); },
  filterCalendarRange() {
    if (this.data.calendarFrom && this.data.calendarTo && this.data.calendarFrom > this.data.calendarTo) return this.toast('开始日期不能晚于结束日期');
    this.renderCalendar(); this.closeSheet();
  },
  clearCalendarRange() { this.setData({ calendarFrom: '', calendarTo: '' }); this.renderCalendar(); this.closeSheet(); },
  scheduleLook() {
    const now = new Date();
    this.setData({
      scheduleDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
      sheet: "schedule",
      scheduleYear: now.getFullYear(),
      scheduleMonth: now.getMonth() + 1,
      scheduleDays: store.monthDays(now.getFullYear(), now.getMonth() + 1, []),
    });
  },
  scheduleMonthChange(e) {
    const date = new Date(this.data.scheduleYear, this.data.scheduleMonth - 1 + Number(e.currentTarget.dataset.delta), 1);
    this.setData({ scheduleYear: date.getFullYear(), scheduleMonth: date.getMonth() + 1, scheduleDays: store.monthDays(date.getFullYear(), date.getMonth() + 1, []) });
  },
  pickScheduleDate(e) { if (e.currentTarget.dataset.date) this.setData({ scheduleDate: e.currentTarget.dataset.date }); },
  confirmSchedule() {
    try {
      store.schedule(this.data.scheduleDate, this.data.look.id);
      this.refresh();
      this.closeSheet();
      this.toast("已加入穿搭日历");
    } catch (e) {
      this.toast(e.message);
    }
  },
  calendarAdd() {
    if (!this.data.state.looks.length) return this.startOutfit();
    this.setData({ sheet: "calendar-looks" });
  },
  addCalendarLook(e) {
    try {
      store.schedule(this.data.selectedDate, e.currentTarget.dataset.id);
      this.refresh();
      this.closeSheet();
    } catch (err) {
      this.toast(err.message);
    }
  },
  removeCalendarEntry(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: "移除这条穿搭记录？",
      content: "已保存的搭配仍会保留。",
      success: (r) => {
        if (r.confirm)
          this.persist(
            (s) => (s.calendar = s.calendar.filter((e) => e.id !== id)),
          );
      },
    });
  },
};
