const store=require('../../../../shared/report-store'),reports=require('../../utils/report-v2'),guide=require('../../utils/style-guide');
Page({data:{guide:null,missing:false,copy:guide.copy},onLoad(q){const report=q.id?store.get(q.id):reports.sample();if(!report)return this.setData({missing:true});this.setData({guide:guide.view(report)});}});
