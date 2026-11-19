const reports = require('../../shared/account-reports');
const cache = require('../../shared/report-store');

Page({
  data: { reports: [], loading: true, error: '' },
  async onShow() {
    this.setData({ loading: true, error: '' });
    try {
      this.setData({ reports: await reports.list() });
    } catch (error) {
      this.setData({ reports: cache.reports().filter(row => !row.accountReport), error: error.message });
    } finally {
      this.setData({ loading: false });
    }
  },
  open(event) {
    const id = event.currentTarget.dataset.id;
    const row = this.data.reports.find(item => item.id === id);
    const page = row?.accountReport ? 'report-v2' : 'report';
    wx.navigateTo({ url: '/packages/analysis/pages/' + page + '/index?id=' + encodeURIComponent(id) });
  },
  sample() { wx.navigateTo({ url: '/packages/analysis/pages/report-v2/index?sample=1' }); },
  start() { wx.navigateTo({ url: '/packages/analysis/pages/detect/index' }); },
  remove(event) {
    const row = this.data.reports.find(item => item.id === event.currentTarget.dataset.id);
    if (!row) return;
    wx.showModal({
      title: '删除这份报告？', content: row.accountReport ? '将从账号中删除这份报告，删除后无法恢复。' : '将删除本机保存的这份报告。',
      confirmColor: '#00aeb8',
      success: async result => {
        if (!result.confirm) return;
        try { await reports.remove(row); await this.onShow(); }
        catch (error) { wx.showToast({ title: error.message, icon: 'none' }); }
      }
    });
  }
});
