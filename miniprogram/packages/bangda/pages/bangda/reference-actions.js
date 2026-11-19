const documents=require('../../../../shared/account-document');
const catalog=require('../../utils/bangda-reference-data');
const A=catalog.ASSET;
module.exports={
 imageProfile(){const romantic=this.data.request&&this.data.request.style==='浪漫妩媚';this.setData({sheet:'imageProfile',profileTraits:romantic?['中性肤色','中高明度','中高纯度','中大量感','曲线感','静态']:['冷肤色','中明度','中纯度','中量感','中偏直','中偏动'],profileStyles:romantic?['率性','温柔','简约','韩版'].map((name,i)=>({name,image:A+'request-style-'+i+'.jpg'})):catalog.styleOptions.slice(0,5)});},
 dismissRequestReward(){this.setData({requestRewardDismissed:true});},
 dismissReward(){this.setData({rewardDismissed:true});},
 support(){this.setData({sheet:'service',serviceTitle:'联系客服'});},
 categorySearch(e){const query=e.detail.value.trim();const group=catalog.categoryGroups.find(g=>g.name===this.data.categoryGroup);this.setData({categoryQuery:query,categorySections:group.sections.map(s=>({...s,items:s.items.filter(i=>!query||i.name.includes(query))})).filter(s=>s.items.length)});},
 chooseProfileImage(e){const key=e.currentTarget.dataset.key;wx.chooseMedia({count:1,mediaType:['image'],sourceType:['album','camera'],success:async result=>{try{const path=result.tempFiles[0].tempFilePath;let saved;if(wx.saveWardrobePhoto)saved=await wx.saveWardrobePhoto(path);else saved=await new Promise((resolve,reject)=>wx.getFileSystemManager().saveFile({tempFilePath:path,success:r=>resolve(r.savedFilePath),fail:reject}));this.db.profile[key]=saved;if(this.persist())this.refresh();}catch(error){wx.showToast({title:'图片保存失败，请重试',icon:'none'});}}});},
 async savePlain(){this.setData({plainExport:true,sheet:''});await new Promise(resolve=>this.setData({},resolve));await this.exportImage(true);this.setData({plainExport:false});},
 async savePoster(){await this.exportImage(false);},
 async exportImage(plain){
  if(this.exporting)return;this.exporting=true;if(!plain)this.setData({posterGenerating:true});
  try{const d=this.data,detail=d.detail,custom=d.view==='customPoster',height=plain?600:custom?800:850;const pieces=detail.image?[{image:detail.image,x:0,y:0,size:100,z:0}]:(detail.items||[]).slice().sort((a,b)=>a.z-b.z);const load=src=>new Promise((resolve,reject)=>wx.getImageInfo({src,success:resolve,fail:reject}));const images=await Promise.all(pieces.map(async piece=>({piece,info:await load(piece.editorImage||piece.image)})));const avatar=plain||custom?null:await load(this.db.profile.avatar);const ctx=wx.createCanvasContext('bangda-poster',this),size=plain?600:520,offset=plain?0:40,top=plain?0:115;
   const colors=['#ffffff','#ffffff','#f6f4e8','#ffffff','#fcf1e4','#ffffff','#f2f4f5'];ctx.setFillStyle(plain?'#ffffff':colors[d.posterStyle]||'#ffffff');ctx.fillRect(0,0,600,850);
   if(!plain&&([3,5].includes(d.posterStyle)||custom&&d.posterStyle===1)){ctx.setStrokeStyle(d.posterStyle===3?'#ded8d1':'#171717');ctx.setLineWidth(12);ctx.strokeRect(6,6,588,height-12);if(custom&&d.posterStyle===1){ctx.setLineWidth(2);ctx.strokeRect(18,18,564,height-36);}}
   if(!plain&&d.posterTitleEnabled){ctx.setFillStyle('#171717');ctx.setFontSize(48);ctx.fillText('TOTAL LOOK',40,74);}
   images.forEach(({piece:p,info})=>{const extent=p.size*size/100,ratio=Math.min(extent/info.width,extent/info.height),w=info.width*ratio,h=info.height*ratio;ctx.drawImage(info.path,offset+p.x*size/100+(extent-w)/2,top+p.y*size/100+(extent-h)/2,w,h);});
   if(!plain){ctx.setFillStyle('#e7986b');ctx.setFontSize(22);if(d.posterPrice)ctx.fillText('¥'+(detail.priceText||detail.price),40,665);ctx.setFillStyle('#888888');ctx.setFontSize(18);if(d.posterAttributes)ctx.fillText((detail.style||detail.category||'')+' · '+(detail.season||''),40,695);if(d.posterExtra)ctx.fillText(d.posterExtra.slice(0,28),40,730);if(!custom){ctx.save();ctx.beginPath();ctx.arc(65,786,25,0,Math.PI*2);ctx.clip();ctx.drawImage(avatar.path,40,761,50,50);ctx.restore();ctx.setFillStyle('#333333');ctx.setFontSize(21);ctx.fillText(this.db.profile.name,110,781);ctx.setFillStyle('#aaaaaa');ctx.setFontSize(16);ctx.fillText((d.posterText||detail.title).slice(0,25),110,808);ctx.fillText('帮搭',520,788);}}
   await new Promise(resolve=>ctx.draw(false,resolve));const file=await new Promise((resolve,reject)=>wx.canvasToTempFilePath({canvasId:'bangda-poster',width:600,height,destWidth:1200,destHeight:height*2,success:r=>resolve(r.tempFilePath),fail:reject},this));await new Promise((resolve,reject)=>wx.saveImageToPhotosAlbum({filePath:file,success:resolve,fail:reject}));wx.showToast({title:plain?'图片已保存':'海报已保存'});
  }catch(error){wx.showToast({title:'保存失败，请检查相册权限后重试',icon:'none'});}finally{this.exporting=false;if(!plain)this.setData({posterGenerating:false});}
 },
 onLoad(){this.loadAccount();},
 async loadAccount(){
  if(this.loadingAccount)return;
  this.loadingAccount=true;this.setData({accountError:''});
  try{
   await documents.open('bangda');
   this.showBangda();this.setData({accountReady:true});
  }catch(error){this.setData({accountError:error.message||'读取帮搭数据失败'});}
  finally{this.loadingAccount=false;}
 },
 showBangda(){
  this.history=[];const defaults={favorites:[],likes:[],outfits:[],requests:[],topics:[],comments:{l10:[{id:'office-comment',author:'温凉',text:'好~',date:'11-18 20:30 广东'}]},profile:{name:'温凉',handle:'HN774857',bio:'',gender:'男',age:'26',height:'165',weight:'50',style:'简约率性',city:'',avatar:A+'avatar-self.jpg',background:A+'profile-photo.jpg'},privacy:{outfits:true,favorites:true,followers:true,following:true,products:true}};
  const saved=documents.read('bangda')||{};this.db=Object.assign(defaults,saved);this.db.profile=Object.assign({handle:'HN774857',avatar:A+'avatar-self.jpg',background:A+'profile-photo.jpg',city:''},defaults.profile,saved.profile||{});this.db.privacy=Object.assign({outfits:true,favorites:true,followers:true,following:true,products:true},saved.privacy||{});
  this.setData({top:wx.getWindowInfo().statusBarHeight,profile:this.db.profile,categoryGroups:catalog.categoryGroups,categoryGroup:'热门搜索',categorySections:catalog.categoryGroups[0].sections,colors:catalog.colors,occasions:catalog.occasions,styleTypes:catalog.types,filterStyles:catalog.styles,styleOptions:catalog.styleOptions,menuItems:catalog.menu,adviceTitles:catalog.adviceTitles,adviceTexts:catalog.adviceTexts,templates:Array.from({length:14},(_,i)=>i),mineType:'搭配',mineTypes:['搭配','专题','分类','单品'],trayCollapsed:false,role:0,plainExport:false,categoryQuery:'',archiveStyles:[],shapeOptions:['H型','A型','梯型','O型','倒三角型'],stageOptions:['职场','学生党','孕期'],form:{},sheet:'',rewardDismissed:false,requestRewardDismissed:false,myStatus:'发布',libraryFavorites:false});this.refresh();
 },
 refresh(){
  const d=this.data;const productMode=d.tab==='products'||d.selectMode;let source=productMode?catalog.products:catalog.looks;
  if(productMode&&!d.query&&!d.category&&!Object.values(d.filters).some(Boolean))source=d.selectMode?['p16','p17','p9','p26','p20'].map(id=>catalog.products.find(p=>p.id===id)).filter(Boolean):catalog.products.filter(p=>['p0','p1','p2','p3','p21','p20','p12','p13'].includes(p.id));
  if(d.selectMode && d.category==='内搭')source=['p18','p19','p8','p9'].map(id=>catalog.products.find(p=>p.id===id)).concat(catalog.products.filter(p=>!['p18','p19','p8','p9'].includes(p.id)));
  if(d.selectMode&&d.libraryFavorites)source=catalog.products.filter(p=>this.db.favorites.includes(p.id));
  if(productMode && !d.selectMode && d.category==='内搭'){
   const featured=['p8','p9','p10','p11'];
   source=featured.map(id=>catalog.products.find(p=>p.id===id)).concat(source.filter(p=>!featured.includes(p.id)));
  }
  const filters=Object.assign({},d.filters);if(productMode&&d.category)filters.category=d.category;
  let visible=catalog.filterItems(source,d.query,filters).map(p=>({...p,favorite:this.db.favorites.includes(p.id),liked:this.db.likes.includes(p.id),selected:d.selected.some(s=>s.id===p.id)}));
  if(!productMode){if(d.sort==='热度')visible.sort((a,b)=>(b.hotRank||0)-(a.hotRank||0));if(d.sort==='新品')visible.sort((a,b)=>(b.newRank||0)-(a.newRank||0));if(d.sort==='价格')visible.sort((a,b)=>d.priceDescending?b.price-a.price:a.price-b.price);}
  let requests=catalog.requests.concat(this.db.requests).map(r=>({...r,done:r.done||this.db.outfits.some(o=>o.requestId===r.id),examples:(r.examples||[]).concat(this.db.outfits.filter(o=>o.requestId===r.id))}));
  requests=requests.filter(r=>d.squareTab==='广场'?(d.squareStatus==='完成'?r.done:!r.done):d.myStatus==='参与'?this.db.outfits.some(o=>o.requestId===r.id):r.mine);
  const all=catalog.products.concat(catalog.looks,this.db.outfits);const collection=all.filter(p=>(d.mineTab==='收藏'?this.db.favorites:this.db.likes).includes(p.id));
  const counts={搭配:collection.filter(p=>p.id[0]!=='p').length,单品:collection.filter(p=>p.id[0]==='p').length,专题:this.db.topics.filter(t=>!t.kind||t.kind==='专题').length,分类:this.db.topics.filter(t=>t.kind==='分类').length};
  let localItems=d.mineTab==='搭配'?this.db.outfits:collection.filter(p=>d.mineType==='单品'?p.id[0]==='p':d.mineType==='搭配'?p.id[0]!=='p':false);
  this.setData({followingCount:(this.db.followedAuthors||[]).length,visible,requests,localItems:localItems.map(p=>({...p,liked:this.db.likes.includes(p.id)})),topics:this.db.topics.filter(t=>d.mineTab==='搭配'?(!t.kind||t.kind==='专题'):t.kind===d.mineType),mineChips:(d.mineTab==='赞过'?['搭配','单品']:['搭配','专题','分类','单品']).map(name=>({name,count:counts[name]})),profile:this.db.profile,savedCount:this.db.outfits.length,favoriteCount:this.db.favorites.length,likeCount:this.db.likes.length,detailSelected:d.selected.some(p=>d.detail&&p.id===d.detail.id),filterCount:Object.values(d.filters).filter(Boolean).length,privacyRows:[['outfits','我的搭配'],['favorites','收藏搭配'],['followers','粉丝列表'],['following','关注列表'],['products','单品收藏']].map(([key,title])=>({key,title,enabled:this.db.privacy[key]}))});
 },
 setTab(e){const tab=e.currentTarget.dataset.tab;this.history=[];this.setData({tab,view:'main',title:{shop:'搭购',products:'单品',square:'帮搭',mine:'我的'}[tab],sheet:'',query:'',filters:{},category:'',selectMode:false,libraryFavorites:false,requestId:'',mineType:'搭配'});this.refresh();wx.pageScrollTo({scrollTop:0,duration:0});},
 chooseCategory(e){const category=e.currentTarget.dataset.value;if(category==='更多'){this.go('categories','所有分类');return;}this.setData({category:this.data.category===category?'':category,query:''});this.refresh();},
 categoryGroup(e){const value=e.currentTarget.dataset.value;this.setData({categoryGroup:value,categoryQuery:'',categorySections:catalog.categoryGroups.find(g=>g.name===value).sections});},
 categoryOption(e){const value=e.currentTarget.dataset.value;let category=this.data.categoryGroup;if(category==='热门搜索')category=['上装','裤装','内搭','裙装','鞋子','包包','配饰'].includes(value)?value:'配饰';this.back();this.setData({category,query:value===category?'':value});if(value==='口红')this.setData({category:'彩妆'});this.refresh();},
 openFilter(){this.setData({sheet:'filter',draftFilters:{gender:'女',...this.data.filters}});},
 filterInput(e){this.setData({draftFilters:{...this.data.draftFilters,[e.currentTarget.dataset.key]:e.detail.value}});},
 applyFilter(){const f=this.data.draftFilters;if(f.min&&f.max&&Number(f.min)>Number(f.max)){wx.showToast({title:'最低价不能高于最高价',icon:'none'});return;}this.setData({filters:{...f},sheet:''});this.refresh();},
 toggleTray(){this.setData({trayCollapsed:!this.data.trayCollapsed});},
 requestDetail(e){const r=catalog.requests.concat(this.db.requests).find(r=>r.id===e.currentTarget.dataset.id);this.setData({request:r,requestRewardDismissed:false,requestOutfits:(r.examples||[]).concat(this.db.outfits.filter(o=>o.requestId===r.id)),requestChoices:false});this.go('request','帮搭需求');},
 requestChoice(){this.setData({requestChoices:!this.data.requestChoices});},
 historyOutfits(){this.setData({sheet:'history',historyChoices:this.db.outfits.map(o=>({...o,checked:false})),historySelected:''});},
 historySelect(e){const id=e.currentTarget.dataset.id;this.setData({historySelected:id,historyChoices:this.data.historyChoices.map(o=>({...o,checked:o.id===id}))});},
 historyConfirm(){const id=this.data.historySelected;if(id){const original=this.db.outfits.find(o=>o.id===id);this.db.outfits.unshift({...original,id:'o'+Date.now(),requestId:this.data.request.id});if(!this.persist())return;this.setData({requestOutfits:this.db.outfits.filter(o=>o.requestId===this.data.request.id)});}this.closeSheet();},
 startEditor(){
  const requestId=this.data.view==='request'?this.data.request.id:'';
  this.setData({requestId,selectMode:false,requestChoices:false,canvasItems:[],activeItem:'',showTemplate:false});
  this.go('editor','搭配');
 },
 selectCanvas(e){
  const id=e.currentTarget.dataset.id,items=this.data.canvasItems;
  if(items.some(item=>item.id===id)){this.setData({activeItem:id});return;}
  const product=this.data.selected.find(item=>item.id===id);
  if(!product)return;
  const offset=items.length%3;
  this.setData({activeItem:id,canvasItems:items.concat({...product,x:14+offset*25,y:12+offset*20,size:product.category==='鞋子'?22:34,z:items.length+1})});
 },
 openItem(e){const id=e.currentTarget.dataset.id;const p=catalog.products.concat(catalog.looks,this.db.outfits).find(p=>p.id===id);if(!p)return;this.go(id[0]==='p'?'product':'look','');this.setData({detail:p,selectMode:false,pieceSlides:{},galleryIndex:0,detailSelected:this.data.selected.some(s=>s.id===id),favorite:this.db.favorites.includes(id),liked:this.db.likes.includes(id),comments:this.db.comments[id]||[]});this.setData({detailProducts:catalog.products.filter(x=>(p.productIds||[]).includes(x.id))});},
 pieceGalleryChange(e){this.setData({pieceSlides:{...this.data.pieceSlides,[e.currentTarget.dataset.id]:e.detail.current}});},
 galleryChange(e){this.setData({galleryIndex:Number(e.detail.current||0)});},
 galleryTab(e){this.setData({galleryIndex:Number(e.currentTarget.dataset.index)});},
 selectProducts(e){this.setData({selectMode:true,libraryFavorites:!!e.currentTarget.dataset.favorite,query:'',category:'',filters:{},sheet:''});this.refresh();},
 confirmProducts(){this.setData({selectMode:false,view:'editor',title:'搭配',sheet:''});const previous=this.data.canvasItems;const items=this.data.selected.map((p,i)=>previous.find(o=>o.id===p.id)||{...p,x:i%3*30+3,y:Math.floor(i/3)*30+4,size:31,z:i+1});this.setData({canvasItems:items,activeItem:items.length?items[items.length-1].id:''});},
 addProduct(e){const id=e.currentTarget.dataset.id;const product=catalog.products.find(p=>p.id===id);if(!product)return;if(this.data.selected.some(p=>p.id===id))this.setData({selected:this.data.selected.filter(p=>p.id!==id),canvasItems:this.data.canvasItems.filter(p=>p.id!==id)});else{if(this.data.selected.length>=8){wx.showToast({title:'最多选择 8 件单品',icon:'none'});return;}this.setData({selected:this.data.selected.concat(product),trayCollapsed:false});}this.refresh();},
 useTemplate(e){const layout=Number(e.currentTarget.dataset.value);const arrangements=[[[4,5,42],[4,54,42],[51,5,20],[76,5,20],[51,30,20],[76,30,20],[51,55,20],[76,55,20]],[[4,5,61],[70,5,25],[70,37,25],[4,70,28],[37,70,28],[70,70,25]],[[7,7,65],[55,45,35],[7,74,24]],[[4,4,48],[52,4,44],[4,54,26],[33,54,24],[62,50,34]]];const slots=arrangements[layout%4];this.setData({layout,showTemplate:true,templateSlots:slots.map(([x,y,size])=>({x,y,size})),canvasItems:this.data.canvasItems.map((p,i)=>{const s=slots[i%slots.length];return {...p,x:s[0],y:s[1],size:s[2],z:i+1};}),sheet:''});},
 toggleTemplate(){this.setData({showTemplate:!this.data.showTemplate});},
 advicePage(e){this.setData({adviceIndex:Number(e.detail.current||e.currentTarget.dataset.index||0)});},
 resizeStart(e){const p=this.data.canvasItems.find(p=>p.id===e.currentTarget.dataset.id);this.resize={id:p.id,start:e.touches[0].clientX,size:p.size};},
 resizeMove(e){if(!this.resize)return;const size=Math.max(15,Math.min(70,this.resize.size+(e.touches[0].clientX-this.resize.start)/wx.getWindowInfo().windowWidth*100));this.setData({canvasItems:this.data.canvasItems.map(p=>p.id===this.resize.id?{...p,size,x:Math.min(p.x,100-size),y:Math.min(p.y,100-size)}:p)});},
 resizeEnd(){this.resize=null;},
 mineSwitch(e){const key=e.currentTarget.dataset.key;this.setData({[key]:e.currentTarget.dataset.value,...(key==='mineTab'?{mineType:'搭配'}:{})});this.refresh();},
 tapProfileHeader(){if(this.data.view==='main')this.editProfile();},
 editProfile(){this.go('profile','修改资料');},
 profileField(e){const key=e.currentTarget.dataset.key;this.setData({editKey:key,editValue:this.db.profile[key]||'',editOriginal:this.db.profile[key]||''});this.go('profileField',{name:'编辑昵称',handle:'编辑帮搭号',bio:'编辑简介',gender:'选择性别',background:'选择背景图'}[key]||'编辑资料');},
 profileInput(e){this.setData({editValue:e.detail.value});},
 profileChoice(e){this.setData({editValue:e.currentTarget.dataset.value});},
 saveProfileField(){const key=this.data.editKey,value=this.data.editValue.trim();if(key==='name'&&!value){wx.showToast({title:'请输入昵称',icon:'none'});return;}if(key==='handle'&&!/^(?=.*[A-Za-z])[A-Za-z0-9_]{6,15}$/.test(value)){wx.showToast({title:'帮搭号需为6–15位字母、数字或下划线',icon:'none'});return;}this.db.profile[key]=value;if(!this.persist())return;this.back();this.refresh();},
 profileCity(){this.setData({sheet:'city',cityDraft:this.db.profile.city||'天津 河东',cityProvinces:['北京','上海','天津','重庆','黑龙江','广东','浙江','江苏','四川','福建'],cityIndexes:[2,1,0],cityAreas:['和平','河东','河西','南开'],cityDistrict:'河东'});},
 cityPickerChange(e){const previous=this.data.cityIndexes,[province,area]=e.detail.value;const name=this.data.cityProvinces[province],map={'北京':['东城','西城','朝阳','海淀'],'上海':['黄浦','徐汇','长宁','静安'],'天津':['和平','河东','河西','南开'],'重庆':['渝中','江北','南岸'],'黑龙江':['哈尔滨','齐齐哈尔','牡丹江'],'广东':['广州','深圳','珠海'],'浙江':['杭州','宁波','温州'],'江苏':['南京','苏州','无锡'],'四川':['成都','绵阳','德阳'],'福建':['福州','厦门','泉州']};const areas=map[name],index=previous[0]===province?Math.min(area,areas.length-1):0;this.setData({cityIndexes:[province,index,0],cityAreas:areas,cityDistrict:areas[index],cityDraft:name+' '+areas[index]});},
 cityChange(e){const value=e.detail.value;this.setData({cityDraft:Array.isArray(value)?value.join(' '):value});},
 saveCity(){this.db.profile.city=this.data.cityDraft;this.persist();this.refresh();this.closeSheet();},
 settings(e){const view=e.currentTarget.dataset.view;if(view==='profile'){this.editProfile();return;}if(view==='wardrobe'){wx.navigateTo({url:'/packages/wardrobe/pages/manager/index'});return;}if(['service','business','wallet'].includes(view)){this.setData({sheet:'service',serviceTitle:{service:'联系客服',business:'商务合作',wallet:'我的钱包'}[view]});return;}if(view==='archive')this.setData({form:{...this.db.profile},archiveStyles:this.db.profile.archiveStyles||[],styleOptions:catalog.styleOptions.map(s=>({...s,checked:(this.db.profile.archiveStyles||[]).includes(s.name)}))});this.go(view,{privacy:'隐私设置',orders:'自购订单',account:'',certification:'搭配认证',archive:'形象资料'}[view]);},
 archiveRange(e){const key=e.currentTarget.dataset.key,value=e.detail.value,form={...this.data.form,[key]:value};if(key==='birthday'){const date=new Date(value),now=new Date();form.age=String(now.getFullYear()-date.getFullYear()-(now.getMonth()<date.getMonth()||now.getMonth()===date.getMonth()&&now.getDate()<date.getDate()?1:0));}this.setData({form});},
 archiveStyle(e){const name=e.currentTarget.dataset.value;let styles=this.data.archiveStyles;if(styles.includes(name))styles=styles.filter(s=>s!==name);else if(styles.length<5)styles=styles.concat(name);else{wx.showToast({title:'最多选择5项风格',icon:'none'});return;}this.setData({archiveStyles:styles,styleOptions:catalog.styleOptions.map(s=>({...s,checked:styles.includes(s.name)}))});},
 saveArchive(){this.db.profile={...this.db.profile,...this.data.form,archiveStyles:this.data.archiveStyles};if(!this.persist())return;this.back();this.refresh();},
 detectStyle(){wx.navigateTo({url:'/packages/analysis/pages/detect/index'});},
 chooseRole(e){this.setData({role:Number(e.currentTarget.dataset.index)});},
 roleNext(){this.setData({sheet:'service',serviceTitle:'搭配认证'});},
 accountAction(e){const action=e.currentTarget.dataset.action;if(action==='phone'){this.setData({sheet:'phoneConfirm'});return;}if(action==='verify'){this.go('certification','搭配认证');return;}if(action==='delete'){this.setData({deletePhrase:''});this.go('deleteAccount','注销确认');return;}this.setData({sheet:'service',serviceTitle:'账号绑定'});},
 phonePage(){this.go('phone','');this.setData({phoneNumber:'',phoneCode:''});},
 sendCode(){wx.showToast({title:'短信服务尚未接入，未发送验证码',icon:'none'});},
 deleteAccount(){if(this.data.deletePhrase!=='我要注销'){wx.showToast({title:'请输入我要注销',icon:'none'});return;}wx.showToast({title:'账号注销功能尚未开放',icon:'none'});},
 newTopic(e){const kind=e&&e.currentTarget.dataset.kind||'专题';this.setData({topicKind:kind,topicName:kind==='专题'?'我的专题':'',topicDescription:'',selectedTopicItems:[],editingTopic:'',manageTab:'简介'});this.go('topicEdit','创建'+kind);},
 editTopic(){const t=this.data.topic;this.setData({topicKind:t.kind||'专题',topicName:t.title,topicDescription:t.description,selectedTopicItems:t.items.slice(),editingTopic:t.id,manageTab:'简介',manageSelected:[]});this.go('topicEdit',(t.kind||'专题')+'管理');this.updateManageItems();},
 saveTopic(){if(!this.data.topicName.trim()){wx.showToast({title:'请输入名称',icon:'none'});return;}const topic={id:this.data.editingTopic||'t'+Date.now(),kind:this.data.topicKind||'专题',title:this.data.topicName.trim(),description:this.data.topicDescription,items:this.data.selectedTopicItems};const idx=this.db.topics.findIndex(t=>t.id===topic.id);if(idx<0)this.db.topics.unshift(topic);else this.db.topics[idx]=topic;if(!this.persist())return;this.back();if(this.data.view==='topic')this.setData({topic,topicItems:this.allTopicItems(topic)});this.refresh();},
 openTopic(e){const t=this.db.topics.find(t=>t.id===e.currentTarget.dataset.id);this.setData({topic:t,topicKind:t.kind||'专题',topicItems:this.allTopicItems(t)});this.go('topic','');},
 manageTab(e){this.setData({manageTab:e.currentTarget.dataset.value,manageSelected:[]});this.updateManageItems();},
 updateManageItems(){const inside=this.data.selectedTopicItems;const all=this.db.outfits.concat(catalog.looks.filter(p=>this.db.favorites.includes(p.id)));this.setData({manageItems:all.filter(p=>this.data.manageTab==='可加入搭配'?!inside.includes(p.id):inside.includes(p.id)).map(p=>({...p,checked:(this.data.manageSelected||[]).includes(p.id)}))});},
 manageSelect(e){const id=e.currentTarget.dataset.id,ids=this.data.manageSelected||[];this.setData({manageSelected:ids.includes(id)?ids.filter(x=>x!==id):ids.concat(id)});this.updateManageItems();},
 manageSave(){const selected=this.data.manageSelected||[];const items=this.data.manageTab==='可加入搭配'?[...new Set(this.data.selectedTopicItems.concat(selected))]:this.data.selectedTopicItems.filter(x=>!selected.includes(x));this.setData({selectedTopicItems:items,manageSelected:[]});const topic=this.db.topics.find(t=>t.id===this.data.editingTopic);topic.items=items;this.persist();this.updateManageItems();this.setData({topic:{...topic},topicItems:this.allTopicItems(topic)});},
 showAuthor(){this.setData({authorFollowed:(this.db.followedAuthors||[]).includes(this.data.detail.author),author:this.data.detail.author,authorImage:this.data.detail.authorAvatar||A+'avatar-default.jpg',authorLooks:catalog.looks.slice(0,4)});this.go('author','');},
 toggleAuthorFollow(){
  const author=this.data.author,followed=this.db.followedAuthors||[];
  this.db.followedAuthors=followed.includes(author)?followed.filter(name=>name!==author):followed.concat(author);
  if(this.persist())this.setData({authorFollowed:this.db.followedAuthors.includes(author)});
 },
 showPoster(e){const custom=e&&e.currentTarget.dataset.custom;this.setData({posterStyle:custom?1:0,posterText:'帮搭上这套穿搭非常棒，分享给你～',posterScale:1,posterTool:'',posterExtra:'',posterInput:'',posterTitleEnabled:true,posterPrice:false,posterAttributes:false});this.go(custom?'customPoster':'poster',custom?'定制海报':'');},
 posterTool(e){const tool=e.currentTarget.dataset.value;if(tool==='模板'){this.setData({sheet:'posterTemplates'});return;}if(tool==='标题'){this.setData({posterTitleEnabled:!this.data.posterTitleEnabled});return;}if(tool==='价格'){this.setData({posterPrice:!this.data.posterPrice});return;}if(tool==='属性'){this.setData({posterAttributes:!this.data.posterAttributes});return;}this.setData({posterTool:tool});},
 posterTemplate(e){this.setData({posterStyle:Number(e.currentTarget.dataset.index),sheet:''});},
 posterZoom(e){this.setData({posterScale:Math.max(.5,Math.min(1.4,this.data.posterScale+Number(e.currentTarget.dataset.step)))});},
 posterAddText(){this.setData({posterExtra:this.data.posterInput||'',posterInput:''});},
 buy(){wx.showModal({title:'参考商品',content:'此页面为参考商品展示，尚未接入真实购买，不会产生订单或扣款。',showCancel:false});},
 closeSheet(){this.setData({sheet:''});},
 back(){if(this.data.sheet){this.closeSheet();return;}if(this.data.selectMode){this.confirmProducts();return;}const prev=this.history.pop();if(prev)this.setData({...prev,sheet:''});else wx.navigateBack();if(this.data.view==='request')this.setData({requestOutfits:(this.data.request.examples||[]).concat(this.db.outfits.filter(o=>o.requestId===this.data.request.id))});this.refresh();}
};
