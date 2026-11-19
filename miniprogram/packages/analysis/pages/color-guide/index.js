const store=require('../../../../shared/report-store');
const reports=require('../../utils/report-v2');
const colors=require('../../utils/color-guide');
Page({
 data:{guide:null,missing:false},
 onLoad(q){const report=q.id?store.get(q.id):reports.sample();if(!report)return this.setData({missing:true});this.setData({guide:colors.view(report)});},
 positions(){},
 colorPhoto(e){const src=e.currentTarget.dataset.src;if(wx.previewImage)wx.previewImage({current:src,urls:this.data.guide.sections.flatMap(s=>s.images.map(x=>x.src))});else this.setData({photo:src});},
 closePhoto(){this.setData({photo:null});}
});
