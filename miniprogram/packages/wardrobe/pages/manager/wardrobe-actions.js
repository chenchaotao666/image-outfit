const store = require("../../utils/closet-store");
const savePhoto = require('../../utils/closet-photo').save;
module.exports = {
  chooseCategory(e) {
    this.setData({ category: e.currentTarget.dataset.name, query: "", subcategoryMenuOpen: false });
    this.refresh();
  },
  search(e) {
    this.setData({ query: e.detail.value });
    this.refresh();
  },
  chooseFilter(e) {
    this.setData({
      [e.currentTarget.dataset.field]: e.currentTarget.dataset.value,
    });
  },
  applyFilter() {
    this.closeSheet();
    this.refresh();
  },
  applyCategoryFilter(e) {
    this.setData({ category: e.currentTarget.dataset.value, query: '' });
    this.applyFilter();
  },
  resetFilter() {
    this.setData({ season: "四季", color: "", sort: "最新上传", query: "" });
    this.refresh();
  },
  showCatalog() {
    this.go("catalog", "全部单品");
    this.setData({ category: "全部" });
    this.refresh();
  },
  toggleSelect() {
    this.setData({ selecting: !this.data.selecting, selected: [] });
    this.refresh();
  },
  selectItem(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data.selecting) {
      const ids = this.data.selected,
        selected = ids.includes(id)
          ? ids.filter((x) => x !== id)
          : ids.concat(id);
      this.setData({
        selected,
        outfitSelection: this.data.state.items.filter((item) => selected.includes(item.id)),
        visibleItems: this.data.visibleItems.map((i) => ({
          ...i,
          selected: selected.includes(i.id),
        })),
      });
    } else {
      this.setData({ detail: this.data.state.items.find((i) => i.id === id) });
      this.go("item", "服饰详情");
    }
  },
  removeSelected() {
    if (!this.data.selected.length) return this.toast("请先选择单品");
    wx.showModal({
      title: "删除所选服饰？",
      content: "删除后无法恢复；已保存搭配中的照片会保留。",
      confirmColor: "#333333",
      success: (r) => {
        if (r.confirm) {
          try {
            store.removeItems(this.data.selected);
            this.setData({ selected: [], selecting: false });
            this.refresh();
          } catch (e) {
            this.toast("删除失败，请重试");
          }
        }
      },
    });
  },
  moveSelected(e) {
    const category = e.currentTarget.dataset.value;
    if (!this.data.selected.length) return this.toast("请先选择单品");
    if (
      this.persist((s) =>
        s.items.forEach((i) => {
          if (this.data.selected.includes(i.id)) {
            i.category = category;
            i.subcategory = "";
          }
        }),
      )
    )
      this.setData({ sheet: "", selected: [], selecting: false });
  },
  tutorialNext() {
    this.setData({ tutorialStep: (this.data.tutorialStep + 1) % 3 });
  },
  upload() {
    this.setData({ uploadType: "item", sheet: "upload" });
  },
  uploadInspiration(e) {
    this.setData({
      uploadType: "inspiration",
      uploadAlbum: e.currentTarget.dataset.album || "默认分类",
      sheet: "upload",
    });
  },
  choosePhoto(e) {
    const source = e.currentTarget.dataset.source || "album";
    this.closeSheet();
    wx.chooseMedia({
      count: source === "album" && this.data.uploadType === "item" ? 9 : 1,
      mediaType: ["image"],
      sourceType: [source],
      success: async (r) => {
        this.setData({ busy: true });
        try {
          const image = await savePhoto(r.tempFiles[0].tempFilePath);
          if (this.data.uploadType === 'replacement') {
            this.setData({'draft.image':image});
            this.openPhotoEditor();
            return;
          }
          const pendingPhotos = this.data.uploadType === "item" ? await Promise.all(r.tempFiles.slice(1).map(file => savePhoto(file.tempFilePath))) : [];
          if (this.data.uploadType === "avatar") {
            this.persist((s) => { s.profile.avatar = image; });
            this.setData({sheet: "profile"});
            return;
          }
          if (this.data.uploadType === "feedback") {
            this.setData({feedbackImages: (this.data.feedbackImages || []).concat(image).slice(0, 4)});
            return;
          }
          if (this.data.uploadType === "inspiration") {
            this.persist((s) =>
              s.inspirations.unshift({
                id: store.uid(),
                image,
                album: this.data.uploadAlbum,
                createdAt: Date.now(),
              }),
            );
            this.toast("灵感已保存");
          } else {
            this.setData({
              draft: {
                image,
                name: "",
                category: this.data.categories[0].name,
                subcategory: "",
                season: "四季",
                color: "黑色",
                brand: "",
                price: "",
                notes: "",
                rating: 3,
                seasons: ['春季','夏季','秋季','冬季'],
              },
              editingId: "",
              pendingPhotos,
            });
            this.setData({uploadMore:false});
            this.refreshUpload();
            if (this.data.fastUpload) this.go('upload','服饰上传');
            else this.openPhotoEditor();
          }
        } catch (err) {
          this.toast("照片保存失败，请重试");
        } finally {
          this.setData({ busy: false });
        }
      },
      fail: (e) => {
        if (!/cancel/.test(e.errMsg || ""))
          this.toast("无法读取照片，请检查相册或相机权限");
      },
    });
  },
  editItem() {
    this.setData({
      draft: { ...this.data.detail },
      editingId: this.data.detail.id,
    });
    this.go("upload", "编辑服饰");
    this.refreshUpload();
  },
  draftChoice(e) {
    this.setData({
      ["draft." + e.currentTarget.dataset.field]: e.currentTarget.dataset.value,
    });
    if (e.currentTarget.dataset.field === "category")
      this.setData({ "draft.subcategory": "" });
  },
  saveItem() {
    try {
      if (!this.data.draft.category) return this.toast('请选择分类');
      if (!this.data.draft.name) this.setData({'draft.name':this.data.draft.subcategory || this.data.draft.category});
      if (
        this.data.draft.price &&
        (!Number.isFinite(Number(this.data.draft.price)) ||
          Number(this.data.draft.price) < 0)
      )
        return this.toast("请填写有效价格");
      if (this.data.editingId) {
        store.update((s) => {
          const at = s.items.findIndex((i) => i.id === this.data.editingId);
          if (at >= 0) s.items[at] = { ...this.data.draft };
        });
        this.setData({ detail: { ...this.data.draft } });
      } else store.addItem(this.data.draft);
      this.refresh();
      this.toast("服饰已保存");
      if (!this.data.editingId && (this.data.pendingPhotos || []).length) {
        const [image, ...pendingPhotos] = this.data.pendingPhotos;
        this.setData({draft: {...this.data.draft, image, name: "", notes: ""}, pendingPhotos});
        this.openPhotoEditor();
        wx.pageScrollTo({scrollTop:0,duration:0});
        return;
      }
      const outfitReturn = (this.stack || []).findIndex((entry) => entry.screen === "outfit-select");
      if (outfitReturn >= 0) {
        const previous = this.stack[outfitReturn];
        this.stack = this.stack.slice(0, outfitReturn);
        this.setData({ ...previous, sheet: "", selecting: true });
        this.refresh();
        wx.pageScrollTo({ scrollTop: 0, duration: 0 });
        return;
      }
      this.stack = [];
      this.setData({ screen: "", tab: "closet", category: "全部" });
      this.refresh();
      wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    } catch (e) {
      this.toast(e.message || "保存失败，请重试");
    }
  },
  deleteItem() {
    wx.showModal({
      title: "删除这件服饰？",
      content: "删除后无法恢复。",
      success: (r) => {
        if (r.confirm) {
          try {
            store.removeItems([this.data.detail.id]);
            this.back();
            this.refresh();
          } catch (e) {
            this.toast("删除失败");
          }
        }
      },
    });
  },
  expandCategory(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      expandedCategory: this.data.expandedCategory === id ? "" : id,
    });
  },
  addCategory() {
    this.setData({
      sheet: "rename",
      renameKind: "category",
      renameValue: "",
      renameTitle: "新增分类",
    });
  },
  categoryMenu(e) {
    this.setData({
      menuCategory: e.currentTarget.dataset.id,
      menuChild: '',
      sheet: "category-menu",
      menuTop: Math.min((e.touches && e.touches[0] ? e.touches[0].clientY : e.originalEvent ? e.originalEvent.clientY : this.data.top + 90), 480),
    });
  },
  renameCategory() {
    const c = this.data.categories.find((c) => c.id === this.data.menuCategory);
    if (/^category-\d+$/.test(c.id) && !this.data.menuChild) return this.toast('系统分类不能修改');
    this.setData({
      sheet: "rename",
      renameKind: this.data.menuChild ? 'subcategory-edit' : 'category-edit',
      renameTitle: this.data.menuChild ? '修改子分类' : '修改分类',
      renameValue: this.data.menuChild || c.name,
    });
  },
  deleteCategory() {
    const c = this.data.categories.find((c) => c.id === this.data.menuCategory);
    if (this.data.menuChild) {
      const child = this.data.menuChild;
      if (this.data.state.items.some(i => i.category === c.name && i.subcategory === child)) return this.toast('请先移出此子分类的服饰');
      if (this.persist(s => { s.categories.find(g => g.id === c.id).children = c.children.filter(name => name !== child); })) this.closeSheet();
      return;
    }
    if (/^category-\d+$/.test(c.id)) return this.toast('系统分类不能删除，可以隐藏');
    if (this.data.state.items.some((i) => i.category === c.name))
      return this.toast("请先将此分类的服饰移至其他分类");
    if (this.data.categories.length === 1)
      return this.toast("至少保留一个分类");
    if (
      this.persist(
        (s) => (s.categories = s.categories.filter((g) => g.id !== c.id)),
      )
    )
      this.closeSheet();
  },
  addSubcategory() {
    this.setData({
      sheet: "rename",
      renameKind: "subcategory",
      renameValue: "",
      renameTitle: "新增子分类",
    });
  },
  moveCategory(e) {
    const delta = Number(e.currentTarget.dataset.delta);
    this.persist((s) => {
      const i = s.categories.findIndex((c) => c.id === this.data.menuCategory),
        j = i + delta;
      if (j >= 0 && j < s.categories.length)
        [s.categories[i], s.categories[j]] = [s.categories[j], s.categories[i]];
    });
  },
  subcategoryFilter(e) {
    this.setData({ query: this.data.query === e.currentTarget.dataset.name ? '' : e.currentTarget.dataset.name, subcategoryMenuOpen: false });
    this.refresh();
  },
  toggleSubcategoryMenu() { this.setData({ subcategoryMenuOpen: !this.data.subcategoryMenuOpen }); },
  childCategoryMenu(e) {
    this.categoryMenu(e);
    this.setData({ menuChild: e.currentTarget.dataset.child });
  },
  sortCategories() { this.go('category-sort', '排序'); },
  reorderCategory(e) {
    const { id, child, delta } = e.currentTarget.dataset;
    this.persist(s => {
      const list = child ? s.categories.find(c => c.id === id).children : s.categories;
      const index = child ? list.indexOf(child) : list.findIndex(c => c.id === id);
      const target = index + Number(delta);
      if (index >= 0 && target >= 0 && target < list.length) [list[index], list[target]] = [list[target], list[index]];
    });
  },
  toggleCategoryVisibility() {
    if (this.persist(s => { const c = s.categories.find(c => c.id === this.data.menuCategory); c.hidden = !c.hidden; })) this.closeSheet();
  },
  categoryHelp() { this.setData({ sheet: 'category-help' }); },
};
