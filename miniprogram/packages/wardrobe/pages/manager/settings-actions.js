const store = require("../../utils/closet-store");
module.exports = {
  renameWardrobe() {
    this.setData({
      sheet: "rename",
      renameKind: "wardrobe",
      renameTitle: "衣橱名称",
      renameValue: this.data.state.settings.name,
    });
  },
  saveRename() {
    const value = String(this.data.renameValue || "").trim();
    if (!value) return this.toast("请输入名称");
    if (value.length > 20) return this.toast("名称最多 20 个字");
    const kind = this.data.renameKind;
    const category = this.data.categories.find(
      (c) => c.id === this.data.menuCategory,
    );
    if (
      (kind === "category" || kind === "category-edit") &&
      this.data.categories.some(
        (c) =>
          c.name === value &&
          c.id !== (kind === "category-edit" ? this.data.menuCategory : ""),
      )
    )
      return this.toast("分类名称已存在");
    if (kind === "album" && this.data.state.albums.includes(value))
      return this.toast("分类名称已存在");
    if (kind === "subcategory" && category.children.includes(value))
      return this.toast("子分类已存在");
    if (kind === 'subcategory-edit' && value !== this.data.menuChild && category.children.includes(value)) return this.toast('子分类已存在');
    if (kind === 'tag-group' && this.data.tagGroups.some(g => g.name === value)) return this.toast('分类名称已存在');
    const albumKey = this.data.inspirationTab === '收藏' ? 'favoriteAlbums' : 'albums';
    if (kind === 'favorite-album' && this.data.state.favoriteAlbums.includes(value)) return this.toast('分类名称已存在');
    if (kind === 'album-edit' && value !== this.data.menuAlbum && this.data.state[albumKey].includes(value)) return this.toast('分类名称已存在');
    if (kind === 'album-edit' && this.data.menuAlbum === '默认分类') return this.toast('默认分类不能修改');
    if (
      this.persist((s) => {
        if (kind === "wardrobe") s.settings.name = value;
        if (kind === "profile") s.profile.name = value;
        if (kind === "category")
          s.categories.push({ id: store.uid(), name: value, children: [] });
        if (kind === "category-edit") {
          const c = s.categories.find((c) => c.id === this.data.menuCategory),
            old = c.name;
          c.name = value;
          s.items.forEach((i) => {
            if (i.category === old) i.category = value;
          });
        }
        if (kind === "subcategory")
          s.categories
            .find((c) => c.id === this.data.menuCategory)
            .children.push(value);
        if (kind === "album") s.albums.push(value);
        if (kind === 'favorite-album') s.favoriteAlbums.push(value);
        if (kind === 'album-edit') {
          s[albumKey] = s[albumKey].map(name => name === this.data.menuAlbum ? value : name);
          (albumKey === 'favoriteAlbums' ? s.looks : s.inspirations).forEach(item => { if (item.album === this.data.menuAlbum) item.album = value; });
        }
        if (kind === 'subcategory-edit') {
          const old = this.data.menuChild;
          const c = s.categories.find(c => c.id === this.data.menuCategory);
          c.children = c.children.map(name => name === old ? value : name);
          s.items.forEach(i => { if (i.category === c.name && i.subcategory === old) i.subcategory = value; });
        }
        if (kind === 'tag-group') {
          s.uploadGroups = s.uploadGroups || {};
          s.uploadGroups.tags = this.data.tagGroups.concat({ name: value, values: [] });
        }
      })
    ) {
      this.closeSheet();
      this.setData({ category: "全部" });
      this.refresh();
    }
  },
  editProfile() {
    this.setData({
      sheet: "profile",
      renameKind: "profile",
      renameTitle: "修改昵称",
      renameValue: this.data.state.profile.name,
    });
  },
  addTagGroup() { this.setData({ sheet: 'rename', renameKind: 'tag-group', renameTitle: '新增标签分类', renameValue: '' }); },
  deleteTagGroup(e) {
    const name = e.currentTarget.dataset.name;
    wx.showModal({ title: '删除标签分类？', content: '已保存服饰中的标签会保留。', success: r => {
      if (r.confirm) this.persist(s => { s.uploadGroups = s.uploadGroups || {}; s.uploadGroups.tags = this.data.tagGroups.filter(g => g.name !== name); });
    } });
  },
  skinChange(e) {
    const index = Number(e.detail.current);
    if (Number.isInteger(index) && this.data.skins[index]) this.setData({ skinIndex: index });
  },
  pickSkin(e) {
    this.skinChange({ detail: { current: e.currentTarget.dataset.index } });
  },
  chooseAvatar() {
    this.setData({ uploadType: "avatar" });
    this.choosePhoto({currentTarget:{dataset:{source:"album"}}});
  },
  chooseFeedbackPhoto() {
    this.setData({ uploadType: "feedback" });
    this.choosePhoto({currentTarget:{dataset:{source:"album"}}});
  },
  selectSkin(e) {
    if (!this.data.skins.some((skin) => skin.id === e.currentTarget.dataset.id)) return;
    if (this.persist((s) => (s.settings.skin = e.currentTarget.dataset.id)))
      this.toast("衣橱皮肤已更新");
  },
  saveCity() {
    const city = String(this.data.cityDraft || "").trim();
    if (!city) return this.toast("请填写城市名称");
    if (this.persist((s) => (s.settings.city = city))) this.closeSheet();
  },
  openCity() {
    this.setData({ cityDraft: this.data.state.settings.city, sheet: "city" });
  },
  setSeason(e) {
    const season = e.currentTarget.dataset.value;
    if (this.persist((s) => (s.settings.season = season))) {
      this.setData({ season });
      this.refresh();
    }
  },
  unavailable(e) {
    const feature = e.currentTarget.dataset.feature;
    wx.showModal({
      title: feature,
      content:
        {
          邀友帮搭:
            "好友协作需要账号和云端衣橱服务，目前尚未接入。你可以先在衣橱里创建、收藏自己的搭配。",
          会员服务:
            "会员和支付服务尚未接入，当前本地衣橱功能可直接使用，不会产生扣款。",
          账号安全:
            "服饰和搭配随账号保存。自行添加的照片文件保存在当前设备。",
          联系客服: "当前尚未配置在线客服，你可以在用户反馈中保存反馈记录。",
        }[feature] || "此功能需要云端服务，目前尚未接入。",
      showCancel: false,
    });
  },
  sendFeedback() {
    const text = String(this.data.feedbackText || "").trim();
    if (text.length < 5) return this.toast("请至少填写 5 个字");
    if (
      this.persist((s) =>
        s.feedback.push({ id: store.uid(), text, images: this.data.feedbackImages || [], contact: this.data.feedbackContact || "", createdAt: Date.now() }),
      )
    ) {
      this.setData({ feedbackText: "", feedbackImages: [], feedbackContact: "" });
      this.toast("反馈记录已保存");
    }
  },
  clearWardrobe() {
    wx.showModal({
      title: "清空当前衣橱？",
      content: "将删除当前账号衣橱中的服饰、搭配、灵感和日历记录，无法恢复。",
      confirmText: "确认清空",
      confirmColor: "#d55e55",
      success: (r) => {
        if (
          r.confirm &&
          this.persist((s) => {
            s.items = [];
            s.looks = [];
            s.inspirations = [];
            s.calendar = [];
          })
        ) {
          this.toast("衣橱已清空");
        }
      },
    });
  },
};
