const documents=require('../../../../shared/account-document');
const catalog=require('../../utils/bangda-reference-data');
const referenceActions=require('./reference-actions');
Page({
 data:{asset:catalog.ASSET,top:30,view:'main',tab:'square',title:'帮搭',sheet:'',query:'',category:'',sort:'综合',sorts:['综合','热度','新品','价格'],categories:catalog.categories,categoryGroups:catalog.categoryGroups,categoryGroup:'热门推荐',categoryOptions:catalog.categoryGroups[0].items,colors:catalog.colors,seasons:['春季','夏季','秋季','冬季'],styles:['简约知性','浪漫妩媚','清新自然','阳光少年'],filters:{},draftFilters:{},filterCount:0,visible:[],requests:[],squareTab:'广场',squareStatus:'进行',mineTab:'搭配',mineType:'全部',mineTypes:['全部','搭配','单品','分类'],selected:[],canvasItems:[],activeItem:'',layout:0,templates:[0,1,2,3,4,5],adviceIndex:0,adviceTitles:['突出重点','放大亮点','巧用上下呼应','配饰不抢戏','留出呼吸感'],adviceTexts:['让一件单品成为主角，其他部分保持简洁。','选择一处喜欢的色彩或轮廓，让目光自然停留。','用上下呼应的色彩，增加整体搭配的一致性。','用少量配饰补充细节，避免元素过多。','在颜色和廓形之间保留空间，舒适也是风格。'],form:{},note:'',outfitTitle:'',comment:'',topicName:'',topicDescription:'',selectedTopicItems:[],privacyRows:[],profile:{},savedCount:0,favoriteCount:0,likeCount:0,localItems:[],favorite:false,liked:false,selectMode:false,editorReturn:false},
 persist(){try{documents.write('bangda',this.db);return true;}catch(e){wx.showToast({title:'保存失败，设备存储空间不足',icon:'none'});return false;}},
 refresh(){const d=this.data;let items=d.tab==='products'||d.selectMode?catalog.products:catalog.looks;if(d.selectMode&&d.libraryFavorites)items=items.filter(p=>this.db.favorites.includes(p.id));const filters=Object.assign({},d.filters);if((d.tab==='products'||d.selectMode)&&d.category)filters.category=d.category;let visible=catalog.filterItems(items,d.query,filters).map(p=>Object.assign({},p,{favorite:this.db.favorites.includes(p.id),liked:this.db.likes.includes(p.id),selected:d.selected.some(s=>s.id===p.id)}));if(d.sort==='热度')visible.sort((a,b)=>(b.likes||0)-(a.likes||0));if(d.sort==='新品')visible.reverse();if(d.sort==='价格')visible.sort((a,b)=>d.priceDescending?b.price-a.price:a.price-b.price);const requests=catalog.requests.concat(this.db.requests).map(r=>Object.assign({},r,{done:r.done||this.db.outfits.some(o=>o.requestId===r.id)})).filter(r=>(d.squareTab==='广场'||r.mine)&&(d.squareStatus==='完成'?r.done:!r.done));let localItems=d.mineTab==='搭配'?this.db.outfits:catalog.products.concat(catalog.looks,this.db.outfits).filter(p=>(d.mineTab==='收藏'?this.db.favorites:this.db.likes).includes(p.id));if(d.mineType==='单品')localItems=localItems.filter(p=>p.id[0]==='p');if(d.mineType==='搭配')localItems=localItems.filter(p=>p.id[0]!=='p');this.setData({detailSelected:d.selected.some(p=>d.detail&&p.id===d.detail.id),visible,requests,localItems,topics:this.db.topics,profile:this.db.profile,savedCount:this.db.outfits.length,favoriteCount:this.db.favorites.length,likeCount:this.db.likes.length,filterCount:Object.values(d.filters).filter(Boolean).length,privacyRows:Object.keys(this.db.privacy).map((key,i)=>({key,title:['公开形象资料','公开收藏','公开赞过'][i],enabled:this.db.privacy[key]}))});},
 setTab(e){const tab=e.currentTarget.dataset.tab;this.history=[];this.setData({tab,view:'main',title:{shop:'搭购',products:'单品',square:'帮搭',mine:'我的'}[tab],sheet:'',query:'',filters:{},category:'',selectMode:false});this.refresh();wx.pageScrollTo({scrollTop:0,duration:0});},
 go(view,title){const snapshot={};for(const key of ['view','title','detail','detailProducts','pieceSlides','comments','favorite','liked','selectMode'])snapshot[key]=this.data[key];this.history.push(snapshot);this.setData({view,title,sheet:''});wx.pageScrollTo({scrollTop:0,duration:0});},
 back(){if(this.data.sheet){this.closeSheet();return;}if(this.data.view==='library'){this.confirmProducts();return;}const prev=this.history.pop();if(prev)this.setData(Object.assign(prev,{sheet:''}));else wx.navigateBack();if(this.data.view==='request')this.setData({requestOutfits:(this.data.request.examples||[]).concat(this.db.outfits.filter(o=>o.requestId===this.data.request.id))});this.refresh();},
 closeSheet(){this.setData({sheet:''});},noop(){},
 search(e){this.setData({query:e.detail.value});this.refresh();},
 chooseCategory(e){const category=e.currentTarget.dataset.value;if(category==='更多'){this.go('categories','所有分类');return;}this.setData({category:this.data.category===category?'':category});this.refresh();},
 categoryGroup(e){const value=e.currentTarget.dataset.value;this.setData({categoryGroup:value,categoryOptions:catalog.categoryGroups.find(g=>g.name===value).items});},
 categoryOption(e){const value=e.currentTarget.dataset.value;const group=this.data.categoryGroup;const category=group==='热门推荐'?value:group;const query=value.startsWith('全部')||value===category?'':value;this.back();this.setData({category,query});this.refresh();},
 sort(e){const sort=e.currentTarget.dataset.value;this.setData({sort,priceDescending:sort==='价格'&&!this.data.priceDescending});this.refresh();},
 openFilter(){this.setData({sheet:'filter',draftFilters:Object.assign({},this.data.filters)});},
 filter(e){const {key,value}=e.currentTarget.dataset;const filters=Object.assign({},this.data.draftFilters);filters[key]=filters[key]===value?'':value;this.setData({draftFilters:filters});},
 resetFilter(){this.setData({draftFilters:{}});},
 applyFilter(){this.setData({filters:this.data.draftFilters,sheet:''});this.refresh();},
 clearSearch(){this.setData({query:'',category:'',filters:{}});this.refresh();},
 squareSwitch(e){this.setData({[e.currentTarget.dataset.key]:e.currentTarget.dataset.value});this.refresh();},
 requestDetail(e){const request=catalog.requests.concat(this.db.requests).find(r=>r.id===e.currentTarget.dataset.id);this.setData({request,requestOutfits:this.db.outfits.filter(o=>o.requestId===request.id)});this.go('request','帮搭需求');},
 imageProfile(){this.setData({sheet:'imageProfile'});},
 newRequest(){this.setData({form:{description:'',budget:'0~1000',season:'春季',style:this.db.profile.style}});this.go('requestForm','发布帮搭需求');},
 field(e){const key=e.currentTarget.dataset.key;this.setData({form:Object.assign({},this.data.form,{[key]:e.detail.value})});},
 formChoice(e){this.setData({form:Object.assign({},this.data.form,{[e.currentTarget.dataset.key]:e.currentTarget.dataset.value})});},
 submitRequest(){const form=this.data.form;if(!form.description.trim()){wx.showToast({title:'请描述你的穿搭需求',icon:'none'});return;}const p=this.db.profile;const request=Object.assign({},form,{description:form.description.trim(),id:'r'+Date.now(),name:p.name,age:p.age,height:p.height,weight:p.weight,gender:p.gender,avatar:p.name.slice(0,1),avatarImage:p.avatar,portrait:p.avatar,avatarColor:'#f5d8c5',mine:true,done:false});this.db.requests.unshift(request);if(!this.persist())return;this.back();this.setData({tab:'square',title:'帮搭',squareTab:'我的帮搭',squareStatus:'进行'});this.refresh();wx.showToast({title:'需求已保存',icon:'none'});},
 openItem(e){const id=e.currentTarget.dataset.id;const item=catalog.products.concat(catalog.looks,this.db.outfits).find(p=>p.id===id);if(!item)return;this.go(id[0]==='p'?'product':'look',id[0]==='p'?'单品详情':'搭配详情');this.setData({detail:item,favorite:this.db.favorites.includes(id),liked:this.db.likes.includes(id),detailProducts:catalog.products.filter(p=>(item.productIds||[]).includes(p.id)),comments:this.db.comments[id]||[]});},
 toggleFavorite(e){this.toggleMark('favorites',e.currentTarget.dataset.id||this.data.detail.id);},
 toggleLike(e){this.toggleMark('likes',e.currentTarget.dataset.id||this.data.detail.id);},
 toggleMark(key,id){const before=this.db[key].slice();this.db[key]=before.includes(id)?before.filter(x=>x!==id):before.concat(id);if(!this.persist()){this.db[key]=before;return;}this.setData({favorite:this.db.favorites.includes(this.data.detail&&this.data.detail.id),liked:this.db.likes.includes(this.data.detail&&this.data.detail.id)});this.refresh();},
 addProduct(e){const id=e.currentTarget.dataset.id;const product=catalog.products.find(p=>p.id===id);if(this.data.selected.some(p=>p.id===id)){this.setData({selected:this.data.selected.filter(p=>p.id!==id),canvasItems:this.data.canvasItems.filter(p=>p.id!==id)});}else{if(this.data.selected.length>=8){wx.showToast({title:'最多选择 8 件单品',icon:'none'});return;}this.setData({selected:this.data.selected.concat(product)});}this.refresh();},
 productAction(){if(this.data.selected.some(p=>p.id===this.data.detail.id)){this.startEditor();return;}this.addProduct({currentTarget:{dataset:{id:this.data.detail.id}}});wx.showToast({title:'已加入搭配',icon:'success'});},
 startEditor(){this.setData({requestId:this.data.view==='request'?this.data.request.id:'',selectMode:false});this.go('editor','搭配');this.arrange();},
 arrange(){const items=this.data.selected.map((p,i)=>Object.assign({},p,{x:i%3*30+3,y:Math.floor(i/3)*30+4,size:31,z:i+1}));this.setData({canvasItems:items,activeItem:items.length?items[items.length-1].id:''});},
 selectProducts(e){this.setData({selectMode:true,view:'library',title:e.currentTarget.dataset.favorite?'收藏夹':'单品库',query:'',category:'',filters:{},libraryFavorites:!!e.currentTarget.dataset.favorite});this.refresh();if(this.data.libraryFavorites)this.setData({visible:this.data.visible.filter(p=>p.favorite)});},
 confirmProducts(){this.setData({selectMode:false,view:'editor',title:'搭配'});const old=this.data.canvasItems;const items=this.data.selected.map((p,i)=>old.find(o=>o.id===p.id)||Object.assign({},p,{x:i%3*30+3,y:Math.floor(i/3)*30+4,size:31,z:i+1}));this.setData({canvasItems:items,activeItem:items.length?items[items.length-1].id:''});},
 selectCanvas(e){this.setData({activeItem:e.currentTarget.dataset.id});},
 dragStart(e){const id=e.currentTarget.dataset.id;const p=this.data.canvasItems.find(p=>p.id===id);const t=e.touches[0];this.drag={id,x:t.clientX,y:t.clientY,px:p.x,py:p.y};this.setData({activeItem:id});},
 dragMove(e){if(!this.drag)return;const t=e.touches[0],width=wx.getWindowInfo().windowWidth*.89;const items=this.data.canvasItems.map(p=>p.id===this.drag.id?Object.assign({},p,{x:Math.max(0,Math.min(100-p.size,this.drag.px+(t.clientX-this.drag.x)/width*100)),y:Math.max(0,Math.min(100-p.size,this.drag.py+(t.clientY-this.drag.y)/width*100))}):p);this.setData({canvasItems:items});},
 dragEnd(){this.drag=null;},
 transform(e){const action=e.currentTarget.dataset.action;if(!this.data.activeItem){wx.showToast({title:'请先选择画布上的单品',icon:'none'});return;}let items=this.data.canvasItems.map(p=>{if(p.id!==this.data.activeItem)return Object.assign({},p);const next=Object.assign({},p);if(action==='up')next.z=Math.max(...this.data.canvasItems.map(i=>i.z))+1;if(action==='down')next.z=Math.min(...this.data.canvasItems.map(i=>i.z))-1;if(action==='zoom')next.size=Math.min(70,p.size+5);if(action==='minus')next.size=Math.max(15,p.size-5);next.x=Math.min(next.x,100-next.size);next.y=Math.min(next.y,100-next.size);return next;});items.sort((a,b)=>a.z-b.z).forEach((p,i)=>{p.z=i+1;});this.setData({canvasItems:items});},
 removeCanvas(e){const id=e.currentTarget.dataset.id;this.setData({canvasItems:this.data.canvasItems.filter(p=>p.id!==id),selected:this.data.selected.filter(p=>p.id!==id),activeItem:''});},
 showTemplates(){this.setData({sheet:'templates'});},
 useTemplate(e){const layout=Number(e.currentTarget.dataset.value);const items=this.data.canvasItems.map((p,i)=>Object.assign({},p,{x:layout%2?8+i%2*45:3+i%3*32,y:layout%2?4+Math.floor(i/2)*30:8+Math.floor(i/3)*35,size:layout%2?36:30}));this.setData({layout,canvasItems:items,sheet:''});},
 showAdvice(){this.setData({sheet:'advice',adviceIndex:0});},
 adviceNext(){this.setData({adviceIndex:(this.data.adviceIndex+1)%5});},
 editorRequest(){this.setData({sheet:'editorRequest'});},
 nextOutfit(){if(!this.data.canvasItems.length){wx.showToast({title:'请先添加至少一件单品',icon:'none'});return;}this.setData({outfitTitle:'',note:'',total:this.data.canvasItems.reduce((s,p)=>s+p.price,0).toFixed(2)});this.go('publish','搭配预览');},
 textInput(e){this.setData({[e.currentTarget.dataset.key]:e.detail.value});},
 publish(){if(!this.data.outfitTitle.trim()){wx.showToast({title:'给这套搭配起个名字吧',icon:'none'});return;}const outfit={id:'o'+Date.now(),title:this.data.outfitTitle.trim(),description:this.data.note.trim(),items:this.data.canvasItems,productIds:this.data.canvasItems.map(p=>p.id),price:Number(this.data.total),requestId:this.data.requestId,author:this.db.profile.name,likes:0};this.db.outfits.unshift(outfit);if(!this.persist())return;this.history=[];this.setData({view:'main',tab:'mine',title:'我的',mineTab:'搭配',mineType:'全部',selected:[],canvasItems:[],requestId:''});this.refresh();wx.showToast({title:'搭配已保存',icon:'success'});},
 mineSwitch(e){this.setData({[e.currentTarget.dataset.key]:e.currentTarget.dataset.value});this.refresh();},
 showMore(){this.setData({sheet:'more'});},
 editProfile(){this.setData({form:Object.assign({},this.db.profile)});this.go('profile','资料修改');},
 saveProfile(){const f=this.data.form;if(!f.name.trim()||Number(f.height)<80||Number(f.height)>230||Number(f.weight)<20||Number(f.weight)>250||Number(f.age)<1||Number(f.age)>120){wx.showToast({title:'请填写昵称和有效的年龄、身高、体重',icon:'none'});return;}this.db.profile=Object.assign({},f,{name:f.name.trim()});if(!this.persist())return;this.back();this.refresh();wx.showToast({title:'资料已保存'});},
 settings(e){const view=e.currentTarget.dataset.view;this.go(view,{privacy:'隐私设置',orders:'自购订单',account:'账号与数据',certification:'搭配身份',archive:'我的形象档案'}[view]);},
 togglePrivacy(e){const key=e.currentTarget.dataset.key;this.db.privacy[key]=!this.db.privacy[key];this.persist();this.refresh();},
 newTopic(){this.setData({topicName:'',topicDescription:'',selectedTopicItems:[],editingTopic:''});this.go('topicEdit','新建专题');},
 editTopic(){const t=this.data.topic;this.setData({topicName:t.title,topicDescription:t.description,selectedTopicItems:t.items.slice(),editingTopic:t.id});this.go('topicEdit','编辑专题');},
 topicSelect(e){const id=e.currentTarget.dataset.id;const ids=this.data.selectedTopicItems;this.setData({selectedTopicItems:ids.includes(id)?ids.filter(x=>x!==id):ids.concat(id)});this.updateTopicCandidates();},
 updateTopicCandidates(){this.setData({topicCandidates:this.db.outfits.concat(catalog.looks.filter(p=>this.db.favorites.includes(p.id))).map(p=>Object.assign({},p,{checked:this.data.selectedTopicItems.includes(p.id)}))});},
 topicPick(){this.updateTopicCandidates();this.setData({sheet:'topicPick'});},
 saveTopic(){if(!this.data.topicName.trim()){wx.showToast({title:'请输入专题名称',icon:'none'});return;}const topic={id:this.data.editingTopic||'t'+Date.now(),title:this.data.topicName.trim(),description:this.data.topicDescription,items:this.data.selectedTopicItems};const index=this.db.topics.findIndex(t=>t.id===topic.id);if(index>=0)this.db.topics[index]=topic;else this.db.topics.unshift(topic);if(!this.persist())return;this.back();if(this.data.view==='topic')this.setData({topic,topicItems:this.allTopicItems(topic)});this.refresh();},
 allTopicItems(topic){return this.db.outfits.concat(catalog.looks).filter(p=>topic.items.includes(p.id));},
 openTopic(e){const topic=this.db.topics.find(t=>t.id===e.currentTarget.dataset.id);this.setData({topic,topicItems:this.allTopicItems(topic)});this.go('topic','我的专题');},
 deleteTopic(){
  const topic=this.data.topic,kind=topic.kind||'专题';
  wx.showModal({title:'删除'+kind,content:'删除后，已保存的搭配仍会保留。',success:result=>{
   if(!result.confirm)return;
   this.db.topics=this.db.topics.filter(item=>item.id!==topic.id);
   if(!this.persist())return;
   if(this.data.view==='topicEdit')this.back();
   this.back();
  }});
 },
 showComments(){this.setData({sheet:'comments',comment:''});},
 addComment(){const content=this.data.comment.trim();if(!content){wx.showToast({title:'先写下你的搭配想法吧',icon:'none'});return;}const id=this.data.detail.id;const comments=(this.db.comments[id]||[]).concat({id:Date.now(),author:this.db.profile.name,text:content});this.db.comments[id]=comments;if(!this.persist())return;this.setData({comments,comment:''});},
 share(){this.setData({sheet:'share'});},
 showPoster(){this.setData({posterStyle:0,posterText:this.data.detail.title});this.go('poster','OOTD 海报');},
 posterStyle(){this.setData({posterStyle:(this.data.posterStyle+1)%3});},
 shareApp(){this.closeSheet();},
 async savePoster(){
  if(this.exporting)return;this.exporting=true;
  try{const detail=this.data.detail;const pieces=detail.image?[{image:detail.image,x:0,y:0,size:100,z:0}]:(detail.items||[]).slice().sort((a,b)=>a.z-b.z);
   const images=await Promise.all(pieces.map(p=>new Promise((resolve,reject)=>wx.getImageInfo({src:p.image,success:r=>resolve({piece:p,info:r}),fail:reject}))));
   const ctx=wx.createCanvasContext('bangda-poster',this);ctx.setFillStyle(this.data.posterStyle===2?'#f6f4e8':'#ffffff');ctx.fillRect(0,0,600,850);if(this.data.posterStyle===1){ctx.setStrokeStyle('#171717');ctx.setLineWidth(12);ctx.strokeRect(6,6,588,838);}ctx.setFillStyle('#171717');ctx.setFontSize(46);ctx.fillText('TOTAL LOOK',40,76);ctx.setFontSize(15);ctx.setFillStyle('#999999');ctx.fillText('今日穿搭 / STYLE DIARY',42,106);
   images.forEach(({piece:p,info})=>{const size=p.size*5.2,ratio=Math.min(size/info.width,size/info.height),w=info.width*ratio,h=info.height*ratio;ctx.drawImage(info.path,40+p.x*5.2+(size-w)/2,150+p.y*5.2+(size-h)/2,w,h);});ctx.setFillStyle('#222222');ctx.setFontSize(25);const title=this.data.posterText||detail.title;ctx.fillText(title.slice(0,19),40,735);if(title.length>19)ctx.fillText(title.slice(19,38),40,770);ctx.setFillStyle('#999999');ctx.setFontSize(17);ctx.fillText(this.db.profile.name+' · 我的穿搭灵感',40,813);
   await new Promise(resolve=>ctx.draw(false,resolve));const file=await new Promise((resolve,reject)=>wx.canvasToTempFilePath({canvasId:'bangda-poster',width:600,height:850,destWidth:1200,destHeight:1700,success:r=>resolve(r.tempFilePath),fail:reject},this));
   await new Promise((resolve,reject)=>wx.saveImageToPhotosAlbum({filePath:file,success:resolve,fail:reject}));wx.showToast({title:'海报已保存'});
  }catch(error){wx.showToast({title:'保存失败，请检查相册权限后重试',icon:'none'});}finally{this.exporting=false;}
 },
 deleteOutfit(){const id=this.data.detail.id;wx.showModal({title:'删除这套搭配？',content:'删除后无法恢复。',success:r=>{if(!r.confirm)return;this.db.outfits=this.db.outfits.filter(o=>o.id!==id);this.db.topics=this.db.topics.map(t=>Object.assign({},t,{items:t.items.filter(x=>x!==id)}));this.db.favorites=this.db.favorites.filter(x=>x!==id);this.db.likes=this.db.likes.filter(x=>x!==id);this.persist();this.back();this.refresh();}});},
 localNotice(){wx.showModal({title:'帮搭说明',content:'当前商品、广场用户与价格是参考示例。搭配、收藏、需求和资料保存在当前账号中。商品购买、社交发布和认证尚未开放。',showCancel:false});},
 onShareAppMessage(){return {title:'帮搭 · 发现适合你的穿搭',path:'/packages/bangda/pages/bangda/index'};},
 ...referenceActions
});
