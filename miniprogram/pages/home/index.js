Page({
  data: { top: 48 },
  onLoad() { const info = wx.getWindowInfo(); this.setData({ top: info.statusBarHeight + 12 }); },
  wardrobe() { wx.navigateTo({url:'/packages/wardrobe/pages/manager/index'}); },
  bangda() { wx.navigateTo({url:'/packages/bangda/pages/bangda/index'}); },
  start() { wx.navigateTo({url:'/packages/analysis/pages/detect/index'}); },
  sample() { wx.navigateTo({url:'/packages/analysis/pages/report-v2/index?sample=1'}); }
});
