Page({
  data: { top: 48, introOpen: false },
  onLoad() { const info = wx.getWindowInfo(); this.setData({ top: info.statusBarHeight + 12 }); },
  wardrobe() { wx.navigateTo({url:'/packages/wardrobe/pages/manager/index'}); },
  bangda() { wx.navigateTo({url:'/packages/bangda/pages/bangda/index'}); },
  start() { this.setData({introOpen:true}); },
  closeIntro() { this.setData({introOpen:false}); },
  enterDetection() { this.closeIntro(); wx.navigateTo({url:'/packages/analysis/pages/detect/index'}); },
});
