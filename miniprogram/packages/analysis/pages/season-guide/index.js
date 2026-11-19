const store=require('../../../../shared/report-store'),reports=require('../../utils/report-v2'),seasons=require('../../utils/season-guide');
Page({
 data:{guide:null,missing:false,photo:null},
 onLoad(q){const report=q.id?store.get(q.id):reports.sample();if(!report)return this.setData({missing:true});this.setData({guide:seasons.view(report)});},
 openPhoto(e){this.setData({photo:e.currentTarget.dataset.src});},
 closePhoto(){this.setData({photo:null});}
});
