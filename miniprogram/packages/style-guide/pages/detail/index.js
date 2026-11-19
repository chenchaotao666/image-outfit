const store=require('../../../../shared/report-store'),reports=require('../../../../shared/sample-report'),guide=require('../../../../shared/guides/style-guide');
Page({data:{guide:null,missing:false,copy:guide.copy},onLoad(q){const report=q.id?store.get(q.id):reports.sample();if(!report)return this.setData({missing:true});this.setData({guide:guide.view(report)});}});
