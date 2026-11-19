const asset = "/packages/wardrobe/assets/";
const tabs = [
  { id: "home", name: "首页", icon: "home" },
  { id: "closet", name: "衣橱", icon: "closet" },
  { id: "inspiration", name: "灵感", icon: "bulb" },
  { id: "mine", name: "我的", icon: "user" },
];
const seasons = ["四季", "春季", "夏季", "秋季", "冬季"];
const colors = [
  { name: "黑色", value: "#333333" },
  { name: "白色", value: "#ffffff" },
  { name: "灰色", value: "#c7c7c7" },
  { name: "红色", value: "#e84545" },
  { name: "橙色", value: "#f48952" },
  { name: "黄色", value: "#eac555" },
  { name: "绿色", value: "#96b978" },
  { name: "米色", value: "#e4d6b4" },
  { name: "蓝色", value: "#94c4df" },
  { name: "紫色", value: "#b29bc9" },
  { name: "粉色", value: "#e7a2b7" },
];
const skins = [
  { id: "minimal", name: "极简风" },
  { id: "apartment", name: "都会公寓" },
  { id: "ikea", name: "宜家简约风" },
  { id: "nordic", name: "北欧风情" },
  { id: "luxury", name: "都市轻奢" },
  { id: "classic", name: "欧式古典" },
  { id: "european", name: "欧式新贵" },
  { id: "modern", name: "现代风格" },
  { id: "dark", name: "黑色商务" },
  { id: "business", name: "现代商务" },
  { id: "wood", name: "原木雅致" },
  { id: "office", name: "现代商务" },
  { id: "natural", name: "宜家风" },
];
const occasions = ["商务职场", "都市休闲", "旅行度假", "精致社交"];
const help = [
  {
    title: "如何上传服饰？",
    text: "进入首页的服饰上传，选择相册或拍照，可调整图片或自动抠图，填写分类、季节等属性后保存。建议确保整件服饰清晰可见，确认编辑后保存处理结果。",
  },
  {
    title: "如何创建搭配与穿搭日历？",
    text: "在衣橱点击随意搭，选择服饰进入拼图；可以拖动、缩放、调整层次并设置背景。保存后可收藏或加入穿搭日历。",
  },
  {
    title: "照片和记录保存在哪里？",
    text: "衣橱、收藏和日历随账号保存。自行添加的照片文件保存在当前设备，请保留原件。",
  },
  {
    title: "会员、天气与好友协作",
    text: "当前版本尚未接入会员支付、实时天气与好友协作服务。衣橱管理和本地搭配功能可以直接使用。",
  },
];
module.exports = { asset, tabs, seasons, colors, skins, occasions, help };
