const photo = require('../../utils/closet-photo');
const shortSeason = {春季:'春',夏季:'夏',秋季:'秋',冬季:'冬',四季:'四季'};
const options = {
  brand:['361°','阿迪达斯(Adidas)','阿玛尼(Armani)','爱马仕(Hermes)','艾高(AIGLE)','安踏(Anta)'],
  fabric:['麻布','蚕丝','纯棉','涤纶','尼龙','长毛绒','牛津布','棉绒','灯芯绒','绒布'],
  size:['XXXS','XXS','XS','S','M','L','XL','XXL','XXXL','35','36','37'],
};
module.exports = {
  toggleFastUpload(){this.setData({fastUpload:!this.data.fastUpload});},
  refreshUpload() {
    const draft = this.data.draft;
    const selected = draft.seasons || (draft.season === '四季' ? ['春季','夏季','秋季','冬季'] : [draft.season || '四季']);
    this.setData({uploadSeasonText:selected.map(s=>shortSeason[s]).join(';'), uploadColorValue:(this.data.colors.find(c=>c.name===draft.color)||{}).value || '#333', ratingHearts:[1,2,3,4,5].map(n=>n<=Number(draft.rating||3))});
  },
  openPhotoEditor() {
    this.setData({imageMenu:false, editorImage:this.data.draft.image, imageScale:1,imageRotation:0,imageFlipX:1,imageFlipY:1,imageX:0,imageY:0});
    this.go('photo-editor','');
  },
  transformPhoto(e) {
    const action=e.currentTarget.dataset.action;
    if(action==='larger')this.setData({imageScale:Math.min(4,this.data.imageScale+.1)});
    if(action==='smaller')this.setData({imageScale:Math.max(.2,this.data.imageScale-.1)});
    if(action==='horizontal')this.setData({imageFlipX:-this.data.imageFlipX});
    if(action==='vertical')this.setData({imageFlipY:-this.data.imageFlipY});
    if(action==='left'||action==='right')this.setData({imageRotation:this.data.imageRotation+(action==='left'?-90:90)});
  },
  imageDragStart(e) {this.imageDrag={x:e.touches[0].clientX,y:e.touches[0].clientY,baseX:this.data.imageX,baseY:this.data.imageY};},
  imageDragMove(e) {
    if(!this.imageDrag)return;
    const width=wx.getWindowInfo().windowWidth*.92;
    this.setData({imageX:this.imageDrag.baseX+(e.touches[0].clientX-this.imageDrag.x)/width*100,imageY:this.imageDrag.baseY+(e.touches[0].clientY-this.imageDrag.y)/width*100});
  },
  imageDragEnd(){this.imageDrag=null;},
  async confirmPhoto() {
    if (this.data.busy) return;
    this.setData({busy:true});
    try {
      const image=await photo.transform(this.data.editorImage,{scale:this.data.imageScale,rotation:this.data.imageRotation,flipX:this.data.imageFlipX,flipY:this.data.imageFlipY,x:this.data.imageX,y:this.data.imageY},this);
      this.setData({'draft.image':image});
      if(this.stack?.[this.stack.length-1]?.screen === 'upload')this.stack.pop();
      this.setData({screen:'upload',title:'服饰上传'});
      this.refreshUpload();
    }catch(error){this.toast('图片处理失败，请重试');}
    finally{this.setData({busy:false});}
  },
  async photoAI(e) {
    if (this.data.busy) return;
    const original = this.data.editorImage;
    this.setData({busy:true, photoProcessing:true});
    try {
      const image = await require('../../utils/closet-cutout').removeBackground(original, e.currentTarget.dataset.kind === 'white');
      if (this.data.screen === 'photo-editor' && this.data.editorImage === original) {
        this.setData({editorImage:image});
        this.toast('图片处理完成');
      }
    } catch (error) { this.toast(error.message || '抠图失败，请重试'); }
    finally { this.setData({busy:false, photoProcessing:false}); }
  },
  toggleImageMenu(){this.setData({imageMenu:!this.data.imageMenu});},
  replaceUploadPhoto(){this.setData({imageMenu:false,uploadType:'replacement'});this.choosePhoto({currentTarget:{dataset:{source:'album'}}});},
  toggleUploadMore(){this.setData({uploadMore:!this.data.uploadMore});},
  editUploadField(e) {
    this.setData({purchaseCalendarOpen:false});
    const field=e.currentTarget.dataset.field;
    const titles={category:'选择分类',color:'选择相近色系',rating:'选择喜好',seasons:'选择季节',price:'价格',purchaseDate:'购入时间',brand:'选择品牌',fabric:'选择面料',size:'选择尺码',tags:'选择标签',location:'选择收纳位置',notes:'备注'};
    const now = new Date();
    const current=this.data.draft[field] || (field === 'purchaseDate' ? `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}` : '');
    const selected=this.data.draft.seasons || (this.data.draft.season==='四季'?['春季','夏季','秋季','冬季']:[this.data.draft.season]);
    this.setData({uploadField:field,uploadSheetTitle:titles[field],uploadValue:current == null ? '' : current,uploadSearch:'',uploadChoices:options[field]||[],uploadRecent:this.data.state.uploadRecent?.[field]||[],uploadExpandedCategory:this.data.draft.category,uploadSeasons:['春季','夏季','秋季','冬季'].map(name=>({name,label:shortSeason[name],selected:selected.includes(name)})),sheet:'upload-field',uploadCategory:this.data.draft.category,uploadSubcategory:this.data.draft.subcategory});
    this.setData({uploadGroups:JSON.parse(JSON.stringify(this.data.state.uploadGroups?.[field] || [{name:field === 'location' ? '收纳位置' : '我建的标签',values:[]}]))});
  },
  chooseUploadOption(e){this.setData({uploadValue:e.currentTarget.dataset.value});},
  searchUploadOptions(e){const value=e.detail.value;this.setData({uploadSearch:value,uploadValue:value,uploadChoices:(options[this.data.uploadField]||[]).filter(v=>v.toLowerCase().includes(value.toLowerCase()))});},
  toggleUploadSeason(e){this.setData({uploadSeasons:this.data.uploadSeasons.map(s=>s.name===e.currentTarget.dataset.value?{...s,selected:!s.selected}:s)});},
  expandUploadCategory(e){this.setData({uploadExpandedCategory:this.data.uploadExpandedCategory===e.currentTarget.dataset.name?'':e.currentTarget.dataset.name});},
  chooseUploadCategory(e){this.setData({uploadCategory:e.currentTarget.dataset.category,uploadSubcategory:e.currentTarget.dataset.value||''});this.confirmUploadField();},
  confirmUploadField() {
    const field=this.data.uploadField,value=String(this.data.uploadValue||'').trim();
    if(field==='price' && value && (!Number.isFinite(Number(value))||Number(value)<0))return this.toast('请输入有效价格');
    if(field==='category')this.setData({'draft.category':this.data.uploadCategory,'draft.subcategory':this.data.uploadSubcategory});
    else if(field==='seasons'){
      const seasons=this.data.uploadSeasons.filter(s=>s.selected).map(s=>s.name);
      if(!seasons.length)return this.toast('请选择至少一个季节');
      this.setData({'draft.seasons':seasons,'draft.season':seasons.length===4?'四季':seasons[0]});
    } else this.setData({['draft.'+field]:field==='rating'?Number(value)||3:value});
    if(['brand','fabric','size','tags','location'].includes(field)&&value)this.persist(state=>{state.uploadRecent=state.uploadRecent||{};state.uploadRecent[field]=[value,...(state.uploadRecent[field]||[]).filter(v=>v!==value)].slice(0,15);});
    if(field==='tags'||field==='location')this.persist(state=>{state.uploadGroups=state.uploadGroups||{};state.uploadGroups[field]=this.data.uploadGroups;});
    this.closeSheet();this.refreshUpload();
  },
  pickPurchaseDate(e){this.setData({uploadValue:e.detail.value});},
  openPurchaseCalendar() {
    const parts = String(this.data.uploadValue).split('-').map(Number);
    const now = new Date();
    this.setData({purchaseCalendarOpen:true, purchaseYear:parts[0] || now.getFullYear(), purchaseMonth:parts[1] || now.getMonth()+1});
    this.renderPurchaseCalendar();
  },
  renderPurchaseCalendar() {
    this.setData({purchaseDays:require('../../utils/closet-store').monthDays(this.data.purchaseYear,this.data.purchaseMonth,[])});
  },
  changePurchaseMonth(e) {
    const date = new Date(this.data.purchaseYear,this.data.purchaseMonth-1+Number(e.currentTarget.dataset.delta),1);
    this.setData({purchaseYear:date.getFullYear(),purchaseMonth:date.getMonth()+1});
    this.renderPurchaseCalendar();
  },
  selectPurchaseDay(e) {
    if (e.currentTarget.dataset.date) this.setData({uploadValue:e.currentTarget.dataset.date,purchaseCalendarOpen:false});
  },
  addUploadOption(){
    const value=this.data.uploadSearch.trim();if(!value)return this.toast('请输入内容');
    if(this.data.uploadField==='tags'||this.data.uploadField==='location'){
      if(this.data.uploadGroups.some(g=>g.name===value))return this.toast('分组已存在');
      this.setData({uploadGroups:[{name:value,values:[]},...this.data.uploadGroups],uploadSearch:''});return;
    }
    this.setData({uploadRecent:[...new Set([value,...this.data.uploadRecent])],uploadValue:value,uploadSearch:''});
  },
  openTagInput(e){this.setData({tagInputOpen:true,tagInput:'',tagGroupIndex:Number(e.currentTarget.dataset.index)||0});},
  closeTagInput(){this.setData({tagInputOpen:false});},
  saveTagInput(){const value=String(this.data.tagInput||'').trim();if(!value)return this.toast('请输入标签内容');const groups=this.data.uploadGroups.map((group,index)=>index===this.data.tagGroupIndex?{...group,values:[...new Set([...group.values,value])]}:group);this.setData({uploadGroups:groups,uploadValue:value,tagInputOpen:false});},
  discardUpload(){wx.showModal({title:'删除这张服饰图片？',content:'尚未保存的修改将被丢弃。',success:r=>{if(r.confirm){this.setData({draft:{},pendingPhotos:[]});this.stack=[];this.setData({screen:'',tab:'closet'});}}});},
};
