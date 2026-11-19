const base=require('./bangda-data');
const ASSET=base.ASSET;
const categories=require('./bangda-categories');
const extra=[
 ['黑色垂领长袖修身上衣','inner-0',203,239,'内搭','黑色'],['春季轻通勤简约衬衫','inner-1',99,239,'内搭','白色'],
 ['秋季潮流运动风灰色上衣','inner-2',129,239,'内搭','灰色'],['冬装新款白色温柔短款针织背心','inner-3',159,299,'内搭','白色'],
 ['香奈儿 可可小姐唇膏 #ETIENNE','lip-0',366,400,'彩妆','红色'],['琉璃焕彩唇膏 细白管口红 #03 温柔奶茶色','lip-1',309,520,'彩妆','红色'],
 ['水光滋润显色唇膏','lip-2',219,300,'彩妆','红色'],['经典柔雾口红','lip-3',339,520,'彩妆','红色'],
 ['【复古翻领洗水牛仔上衣】25春秋款时尚外套','library-0',168,239,'上装','蓝色'],['【HOT】UR2025秋季工装大口袋阔腿裤','library-1',339,399,'裤装','黑色'],
 ['UR2025夏季休闲简约百搭撞色短袖T恤','library-inner-0',59,99,'内搭','蓝色'],['UR2025秋季设计感拼接格纹开衫','library-inner-1',313,399,'内搭','蓝色'],
 ['UR2025秋季休闲口袋纽扣开襟衬衫','white-shirt',228,299,'内搭','白色'],['UR秋季简约休闲宽松开襟衬衫UYY240010','shirt-hero',79,199,'内搭','白色'],
 ['高腰不规则两粒扣冰丝阔腿裤','office-piece-0',132.05,229,'裤装','蓝色'],['【2022春装新品】气质简约牛仔蓝西装','office-piece-1',133,469,'上装','蓝色'],['【2022春装新品】女装时尚名媛系带衬衫','office-piece-2',79,199,'内搭','白色'],['卓诗尼包包女包斜挎包女士手提包','office-piece-3',219,299,'包包','粉色']
];
const products=base.products.concat(extra.map((v,i)=>({id:'p'+(i+8),title:v[0],image:ASSET+v[1]+'.jpg',price:v[2],original:v[3],category:v[4],color:v[5],season:'春季',gender:'女',platform:i===17?'京东':'唯品会',brand:i===4?'Chanel':i===5||i===7?'TOM FORD':i===3?'DAZZLE地素':i===8?'白鹿语':'URBAN REVIVO',rebate:(v[2]*(i>=4&&i<8?.027:.063)).toFixed(2),library:i>=8&&i<=12})));
products[0].title='UR2025秋季休闲蝴蝶结修身针织长袖';products[1].title='工字背心女士夏季薄款螺纹拼色无袖';products[1].rebate='1.91';products[4].price=119;products[4].original=339;products[5].price=169;products[5].original=369;
products.push({id:'p26',title:'2025春季温柔撞色学院针织开衫',image:ASSET+'library-3.jpg',price:169,original:299,category:'内搭',color:'粉色',season:'春季',gender:'女',brand:'URBAN REVIVO',platform:'唯品会',rebate:'10.65',library:true});
products.push({id:'p27',title:'休闲系带小白鞋',image:ASSET+'white-shoes.jpg',price:99,original:129,category:'鞋子',color:'白色',season:'春季',gender:'女',brand:'休闲鞋',platform:'唯品会',rebate:'6.24'});
for(const p of products){p.priceText=p.price.toFixed(2);p.originalText=p.original.toFixed(2);p.hero=p.id==='p13'?ASSET+'lip-hero.jpg':p.image;p.editorImage=p.image;p.gallery=p.id==='p21'?[ASSET+'shirt-hero.jpg',ASSET+'shirt-model.jpg']: [p.hero];p.detailStrips=p.id==='p13'?Array.from({length:8},(_,i)=>ASSET+'lip-detail-'+i+'.jpg'):p.id==='p21'?Array.from({length:17},(_,i)=>ASSET+'shirt-detail-'+i+'.jpg'):[];}
products.find(p=>p.id==='p13').posterCutout=ASSET+'lip-poster.png';
products.find(p=>p.id==='p22').gallery.push(ASSET+'office-pants-model.jpg');
products.find(p=>p.id==='p25').gallery.push(ASSET+'office-bag-model.jpg');
const looks=base.looks.map((l,i)=>Object.assign({},l,{authorAvatar:ASSET+(i===3?'avatar-request-0':'avatar-default')+'.jpg',hotRank:i===4?100:i===5?99:20-i,newRank:i===6?100:i===7?99:20-i}));
Object.assign(looks[4],{title:'清爽甜美少女风',author:'时尚搭配师',likes:5});Object.assign(looks[5],{title:'温柔小姐姐的通勤LOOK',author:'时尚搭配师',likes:4});Object.assign(looks[6],{title:'OOTD｜职场女性干练穿搭'});Object.assign(looks[7],{title:'OOTD｜简约慵懒又很上镜穿搭'});
looks.push({id:'l10',displayId:'1466',saves:2,title:'职业工作休闲装',image:ASSET+'office-look.jpg',author:'用户484966',authorAvatar:ASSET+'avatar-default.jpg',likes:0,season:'春季',style:'简约知性',productIds:['p22','p23','p24','p25'],price:592,description:'符合许多岗位搭配，悠闲职业',gender:'女',color:'蓝色'});
looks.push({id:'l11',title:'女生秋日｜复古棕的甜酷时髦穿搭',image:ASSET+'brown-look.jpg',author:'益善',authorAvatar:ASSET+'avatar-default.jpg',likes:1,season:'秋季',style:'简约知性',productIds:['p8','p5'],price:1174.5,description:'复古棕调与利落线条，轻松穿出秋日氛围。',gender:'女',color:'棕色'});
for(const l of looks)l.priceText=l.price.toFixed(2);
const requests=base.requests.map((r,i)=>Object.assign({},r,{avatarImage:ASSET+'avatar-request-'+i+'.jpg',portrait:ASSET+'portrait-'+(i===1?'1':'3')+'.jpg',height:i===1?155:167,weight:i===1?47:52.5,stage:'职场',occupation:i===1?'家庭主妇':'',occasion:'精致社交'}));
requests.push({id:'r6',name:'月亮邮递员',age:21,season:'夏季',budget:'0~1000',style:'简约知性',description:'夏天的长裙膝盖以下的 然后我有小肚子 希望能遮肚子的，不要太过于成熟了',avatarImage:ASSET+'avatar-default.jpg',portrait:ASSET+'portrait-complete.jpg',height:160,weight:55,gender:'女',done:true,mine:false,examples:[{id:'l1',image:ASSET+'completed-look.jpg',title:'温柔夏日',price:806,author:'吐个泡泡',adopted:true}]});
requests.push({id:'r7',name:'辛美',age:29,season:'春季',budget:'1000~2500',style:'简约知性',description:'约会，休闲及时尚感主要是适合自己根据五官穿搭',avatarImage:ASSET+'avatar-request-0.jpg',portrait:ASSET+'portrait-3.jpg',height:165,weight:50,gender:'女',done:true,mine:false,examples:[{id:'l3',image:ASSET+'completed-look-2.jpg',title:'春日温柔',price:699},{id:'l4',image:ASSET+'completed-look-3.jpg',title:'甜美春日',price:257}]});
const colors=[['黑色','#121212'],['白色','#ffffff'],['灰色','#d9d9d9'],['红色','#e00000'],['橙色','#fb5831'],['黄色','#ffb53d'],['绿色','#9ed33b'],['青色','#9bdfcf'],['蓝色','#9fd4e5'],['紫色','#c99dcb'],['粉色','#ed2ba0']].map(([name,hex])=>({name,hex}));
const occasions=['商务职场','都市休闲','旅行度假','精致社交'];
const types=['霸气御姐','浪漫妩媚','简约知性','前卫个性','温柔优雅','甜酷风格','少女风格','自然风格','少年风格'];
const styles=['简约','温柔','性感','小香风','复古','法式','日系','慵懒','韩版','欧美','街头','港风','学院','甜美','干练','率性','霸气','女人味','文艺'];
const styleNames=['简约','复古','法式','日系','慵懒','韩版','欧美','街头','港风','学院','文艺'];
const styleOptions=styleNames.map((name,i)=>({name,image:ASSET+'style-avatar-'+i+'.jpg'}));
const menu=[['搭配认证','certification','shirt'],['形象档案','archive','palette'],['资料修改','profile','edit'],['账号安全','account','shield'],['隐私设置','privacy','lock'],['自购订单','orders','bag'],['我的钱包','wallet','wallet'],['My衣橱','wardrobe','closet'],['联系客服','service','support'],['商务合作','business','help']].map(([title,view,icon])=>({title,view,icon}));
const adviceTitles=['布局紧凑','突出主体','放大饱满','鞋右下包中间','摆放端正'];
const adviceTexts=['整体布局单品都须摆放紧凑一些，不要太过分散影响美观','每套搭配都有突出的主体单品，主体占据的面积较大（如上衣、裤子、裙子等），非主体单品占用面积较小（如鞋、包、配饰等）','搭配尽量将方框占满，单品分清主次情况下尽量放大，但不超出方框范围，不出现边框裁剪单品的情况','鞋子尽量放在右下角，包包等配饰放在中间，这样整体比较美观','单品选择摆放尽量端正，以便后续搭配更美观'];
function filterItems(items,query,f){return base.filterItems(items,query,Object.assign({},f,{price:f.price==='300~399'?'300~399':f.price,style:f.type||(f.style&&types.includes(f.style)?f.style:'')})).filter(p=>(!f.min||p.price>=Number(f.min))&&(!f.max||p.price<=Number(f.max))&&(!f.occasion||f.occasion===p.occasion||(!p.occasion&&f.occasion==='都市休闲'))&&(!f.style||types.includes(f.style)||p.title.includes(f.style)||p.description&&p.description.includes(f.style)));}
module.exports={ASSET,products,looks,requests,colors,categoryGroups:categories,categories:['上装','裤装','内搭','裙装','鞋子','更多'],occasions,types,styles,styleOptions,menu,adviceTitles,adviceTexts,filterItems};
