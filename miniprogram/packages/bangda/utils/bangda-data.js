const ASSET='/packages/bangda/assets/';
const products=[
 ['灰色蝴蝶结修身针织上衣','item-0',118,139,'上装','灰色','秋季'],
 ['撞色细肩带针织背心','item-1',30.4,76,'内搭','白色','夏季'],
 ['黑色交叉肩带吊带背心','item-2',69,129,'内搭','黑色','夏季'],
 ['黑色挂脖收腰上衣','item-3',89,169,'上装','黑色','夏季'],
 ['简约直筒休闲长裤','pants-0',129,239,'裤装','绿色','秋季'],
 ['垂感宽松西装长裤','pants-1',159,299,'裤装','棕色','秋季'],
 ['米白色高腰直筒裤','pants-2',119,199,'裤装','白色','春季'],
 ['复古水洗阔腿牛仔裤','pants-3',139,259,'裤装','蓝色','春季']
].map((v,i)=>({id:'p'+i,title:v[0],image:ASSET+v[1]+'.jpg',price:v[2],original:v[3],category:v[4],color:v[5],season:v[6],brand:i===1?'思篇':'URBAN REVIVO',platform:'唯品会',gender:'女',rebate:(v[2]*.063).toFixed(2)}));
const looks=[
 ['秋季舒适套装','look-0','微信用户',1,'秋季','简约知性',[0,5]],
 ['黑森系','look-1','羊村高级饲养员',3,'夏季','浪漫妩媚',[2,3]],
 ['温柔韩版修身风','look-2','小依贴贴',2,'春季','简约知性',[1,7]],
 ['温柔知性风','look-3','泡泡透云端',6,'夏季','浪漫妩媚',[1,6]],
 ['春日清新出游','fresh-0','薄荷日记',12,'春季','清新自然',[0,7]],
 ['紫色心情 · 通勤LOOK','fresh-1','一颗桃子',8,'春季','简约知性',[1,6]],
 ['OOTD｜黑白日常气场','new-0','简衣',4,'秋季','简约知性',[3,5]],
 ['OOTD｜温柔奶油色','new-1','温凉',9,'秋季','清新自然',[0,6]],
 ['卡其风衣的秋日序曲','classic-1','衣间故事',15,'秋季','简约知性',[0,5]],
 ['轻盈的日常','classic-2','漫漫',7,'夏季','清新自然',[1,6]]
].map((v,i)=>({id:'l'+i,title:v[0],image:ASSET+v[1]+'.jpg',author:v[2],likes:v[3],season:v[4],style:v[5],productIds:v[6].map(n=>'p'+n),price:v[6].reduce((s,n)=>s+products[n].price,0),description:'用简洁的廓形和柔和的配色，记录日常穿搭。适合通勤、散步和周末见面。',color:i%2?'白色':'黑色',gender:'女'}));
const requests=[
 ['小满足',33,'冬季','1000~2500','浪漫妩媚','平时修闲和参加社交场合穿，需要简约大气。','海','#cedeea'],
 ['爱尔岛',26,'春季','0~1000','简约知性','就是两个娃的妈妈，想漂亮点、温柔大方','岛','#e5d0e9'],
 ['一个宅神',31,'冬季','0~1000','清新自然','想要一个干练、前卫的穿搭','宅','#d3efc4'],
 ['撞进云野',26,'秋季','0~1000','浪漫妩媚','日常些，方便的，找找舒服的','云','#ffe5a6'],
 ['浅夏初晴',40,'秋季','0~1000','阳光少年','不知道穿什么样的款式适合自己','夏','#f9dfad'],
 ['凌晨与深夜',26,'秋季','0~1000','阳光少年','希望找到适合周末和日常出行的搭配','夜','#d4e1ed']
].map((v,i)=>({id:'r'+i,name:v[0],age:v[1],season:v[2],budget:v[3],style:v[4],description:v[5],avatar:v[6],avatarColor:v[7],height:155+i*3,weight:47+i*2,gender:i>3?'男':'女',done:false,mine:false}));
const categories=['上装','裤装','内搭','裙装','鞋子','更多'];
const categoryGroups=[{name:'热门推荐',items:['上装','裤装','内搭','裙装','鞋子','包包']},{name:'上装',items:['全部上装','针织衫','衬衫','T恤','外套','卫衣','西装','风衣']},{name:'裤装',items:['全部裤装','休闲裤','西装裤','牛仔裤','短裤','阔腿裤']},{name:'内搭',items:['全部内搭','背心','吊带','打底衫']},{name:'裙装',items:['连衣裙','半身裙','短裙','长裙']},{name:'鞋子',items:['运动鞋','高跟鞋','平底鞋','靴子']},{name:'包包',items:['手提包','单肩包','双肩包']},{name:'配饰',items:['项链','耳环','帽子','围巾']},{name:'美妆',items:['口红','粉底','眼影','香水']}];
const colors=[{name:'黑色',hex:'#171717'},{name:'白色',hex:'#f4f2ee'},{name:'灰色',hex:'#aeb2b5'},{name:'红色',hex:'#ed5369'},{name:'棕色',hex:'#986345'},{name:'橙色',hex:'#ff9a55'},{name:'黄色',hex:'#f3ce50'},{name:'绿色',hex:'#a8ce64'},{name:'蓝色',hex:'#9bcbe8'},{name:'紫色',hex:'#c3a4e2'}];
function filterItems(items,query,filters){return items.filter(p=>(!query||[p.title,p.brand,p.category,p.style].join(' ').toLowerCase().includes(query.toLowerCase()))&&(!filters.category||p.category===filters.category)&&(!filters.color||p.color===filters.color)&&(!filters.season||p.season===filters.season)&&(!filters.style||p.style===filters.style)&&(!filters.gender||p.gender===filters.gender)&&(!filters.platform||p.platform===filters.platform)&&(!filters.price||(filters.price==='300以上'?p.price>=300: p.price>=Number(filters.price.split('~')[0])&&p.price<=Number(filters.price.split('~')[1]))));}
module.exports={ASSET,products,looks,requests,categories,categoryGroups,colors,filterItems};
