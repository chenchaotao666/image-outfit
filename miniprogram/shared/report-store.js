const KEY = 'yanchuang.reports.v1';
function reports() { const value = wx.getStorageSync(KEY); return Array.isArray(value) ? value : []; }
const evidenceKey=id=>KEY+'.evidence.'+id;
const detailKey=id=>KEY+'.detail.'+id;
function clearFiles(id){for(const key of [evidenceKey(id),detailKey(id)]){if(wx.removeStorageSync)wx.removeStorageSync(key);else wx.setStorageSync(key,null);}}
function save(report) {
 const previous=reports(),items=previous.filter(item=>item.id!==report.id),{photoEvidence,...summary}=report;
 if(photoEvidence)wx.setStorageSync(evidenceKey(report.id),photoEvidence);
 if(report.accountReport){
  wx.setStorageSync(detailKey(report.id),summary);
  const {id,createdAt,date,mode,profile,accountReport}=summary;
  items.unshift({id,createdAt,date,mode,profile,accountReport});
 }else items.unshift(summary);
 wx.setStorageSync(KEY,items.slice(0,30));
 items.slice(30).forEach(item=>clearFiles(item.id));return report;
}
function get(id) {const item=reports().find(row=>row.id===id);if(!item)return;const report=item.accountReport?wx.getStorageSync(detailKey(id))||item:item;const photoEvidence=wx.getStorageSync(evidenceKey(id));return photoEvidence?{...report,photoEvidence}:report;}
function remove(id) { wx.setStorageSync(KEY, reports().filter(item => item.id !== id));clearFiles(id); }
module.exports = { reports, save, get, remove };
