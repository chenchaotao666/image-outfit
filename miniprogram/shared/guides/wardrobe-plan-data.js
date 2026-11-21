// Generated from config/llm-prompt/衣橱规划.
module.exports={
  "version": "2.0.0",
  "sourceIds": [
    "usu-principles",
    "usu-elements"
  ],
  "evidence": "文献支持协调、视觉重点、比例以及颜色与款式的区分。下列百分比和件数是项目编辑制定的衣橱起始方案，不是文献给出的最佳比例，也不是面部检测结果。",
  "matching": "根据本报告分析得到的个人风格索引匹配方案；没有分析结果时使用明确标注的一般起始方案。不读取偏好默认值。",
  "colorRules": [
    {
      "id": "color-expressive",
      "when": {
        "styleIndex": 1
      },
      "percent": 55,
      "reason": "根据本次分析推荐的潮流前卫方向，保留更多彩色单品作为搭配重点。"
    },
    {
      "id": "color-work",
      "when": {
        "styleIndex": 0
      },
      "percent": 75,
      "reason": "根据本次分析推荐的稳重绅士方向，基础色更方便组合外套、衬衫与裤装。"
    }
  ],
  "colorDefault": {
    "id": "color-everyday",
    "percent": 65,
    "reason": "通用起始方案：日常搭配以基础色衔接衣橱，再用少量彩色单品增加变化。"
  },
  "colorAdvice": "基础色可以选黑、白、灰、深蓝；时尚色用于一件上装、外套或配饰，让整套服装保留一个色彩重点。",
  "styleRules": [
    {
      "id": "style-expressive",
      "when": {
        "styleIndex": 1
      },
      "percent": 55,
      "reason": "根据本次分析推荐的潮流前卫方向，可以适当增加有图案、纹理或剪裁细节的单品。"
    },
    {
      "id": "style-simple",
      "when": {
        "styleIndex": 5
      },
      "percent": 70,
      "reason": "根据本次分析推荐的随性自然方向，优先准备容易重复搭配的基础款。"
    },
    {
      "id": "style-work",
      "when": {
        "styleIndex": 0
      },
      "percent": 75,
      "reason": "根据本次分析推荐的稳重绅士方向，基础款可以承担更多日常穿着。"
    }
  ],
  "styleDefault": {
    "id": "style-everyday",
    "percent": 65,
    "reason": "通用起始方案：先用基础款建立常用组合，再用设计款增加层次。"
  },
  "styleAdvice": "基础款侧重简洁、合身和好搭；设计款可以选择图案衬衫、纹理外套或有细节的配饰。颜色鲜艳不等于款式复杂，两项可以分开安排。",
  "categories": [
    {
      "name": "外套",
      "color": "#00bdc7",
      "items": "轻结构外套与换季夹克",
      "reason": "用于换季和场合变化，优先选择能搭配多件内搭的款式。"
    },
    {
      "name": "上装",
      "color": "#22cbd3",
      "items": "衬衫、针织与日常上衣",
      "reason": "靠近面部且更常换洗，保留较多颜色与面料组合。"
    },
    {
      "name": "下装",
      "color": "#4ed5dc",
      "items": "直筒长裤与休闲裤",
      "reason": "以常穿版型和基础色衔接多件上装。"
    },
    {
      "name": "鞋履",
      "color": "#78e1e5",
      "items": "日常鞋与场合用鞋",
      "reason": "按常用场合分配，兼顾舒适与轮换。"
    },
    {
      "name": "内搭",
      "color": "#98e8ea",
      "items": "叠穿用纯色打底",
      "reason": "此处指打底层，不重复计入作为独立外穿单品的上装。"
    },
    {
      "name": "包袋",
      "color": "#b4eeee",
      "items": "实用日常包",
      "reason": "先覆盖容量与常用场景，再增加不同款式。"
    },
    {
      "name": "套装",
      "color": "#c9f3f3",
      "items": "可拆分搭配的套装",
      "reason": "一套作为一个规划单位，不重复计算为外套和下装。"
    },
    {
      "name": "配饰",
      "color": "#e1f8f7",
      "items": "腰带、围巾或腕表",
      "reason": "用少量配饰连接配色与细节。"
    }
  ],
  "quantityRules": [
    {
      "id": "quantity-work",
      "when": {
        "styleIndex": 0
      },
      "counts": [
        5,
        6,
        4,
        3,
        2,
        1,
        1,
        2
      ],
      "reason": "根据本次分析推荐的稳重绅士方向，满足工作场合的轮换。"
    },
    {
      "id": "quantity-social",
      "when": {
        "styleIndex": 2
      },
      "counts": [
        3,
        6,
        4,
        3,
        3,
        1,
        2,
        2
      ],
      "reason": "根据本次分析推荐的儒雅精致方向，方便调整正式程度。"
    }
  ],
  "quantityDefault": {
    "id": "quantity-everyday",
    "counts": [
      3,
      7,
      5,
      3,
      2,
      1,
      1,
      2
    ],
    "reason": "通用起始方案：日常休闲以上装、下装和鞋履为主，先建立可以反复组合的衣橱。"
  },
  "combinationAdvice": "上装可以比下装多一些，便于换洗和变化；先补齐纯色基础款，再增加图案和设计细节。一件外套尽量搭配两套内搭，鞋包优先选择能重复使用的颜色。已有够用的单品不必重复购买。",
  "unit": "规划单位：普通服装按件、鞋按双、套装按套。百分比表示计划中的单位占比，不是预算或现有衣橱统计。",
  "itemRules": {
    "title": "衣橱单品规划",
    "english": "My style wardrobe items",
    "intro": "衣服不一定要多，关键是能组合成适合自己的穿搭。先整理已有单品，留下合身、常穿、容易搭配的款式，再按日常场合补齐缺口。",
    "emphasis": "从一件外套、两套内搭开始，配上合适的裤装和鞋履。让新添的每一件衣服，都能与现有衣橱产生新的组合。",
    "heading": "你的衣橱单品搭配示范如下",
    "groups": [
      {
        "id": "coats",
        "title": "外套单品",
        "category": "外套",
        "intro": "优先选择合身的外套。颜色和面料能与常穿内搭组合，再适当增加纹理或设计细节。"
      },
      {
        "id": "tops",
        "title": "内搭单品",
        "category": "上装",
        "intro": "这里的内搭示范包括衬衫、针织与Polo衫，归入衣橱规划中的上装。纯色基础款与图案款交替安排，方便日常组合。"
      },
      {
        "id": "shoes",
        "title": "鞋履单品",
        "category": "鞋履",
        "intro": "先覆盖常用场合，再增加款式。试穿时优先检查合脚、支撑与舒适度。"
      },
      {
        "id": "trousers",
        "title": "裤装单品",
        "category": "下装",
        "intro": "裤装可以比上装少一些，以常穿版型与基础色衔接不同上衣。"
      },
      {
        "id": "accessories",
        "title": "配饰单品",
        "category": "配饰",
        "intro": "配饰用于连接颜色与细节。一次保留一两个重点，日常更容易搭得协调。"
      },
      {
        "id": "bags",
        "title": "包袋单品",
        "category": "包袋",
        "intro": "先按容量、重量和常用场合选包，再让颜色与鞋履或衣物呼应。"
      }
    ]
  },
  "itemLibrary": {
    "cover": {
      "src": "/packages/wardrobe-guide/assets/cover.jpg",
      "source": "小程序参考/推荐/衣橱规划.png",
      "rights": "reference_only"
    },
    "images": [
      {
        "id": "item-1",
        "group": "coats",
        "order": 1,
        "name": "白色双排扣西服",
        "src": "/packages/wardrobe-guide/assets/item-1.jpg",
        "advice": "浅色外套搭配深色裤装，注意肩线与腰身是否合适。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          2340,
          635,
          2870
        ],
        "rights": "reference_only"
      },
      {
        "id": "item-2",
        "group": "coats",
        "order": 2,
        "name": "深色徽章西服",
        "src": "/packages/wardrobe-guide/assets/item-2.jpg",
        "advice": "深色西服容易衔接衬衫和长裤，徽章可按场合增减。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          3100,
          635,
          3650
        ],
        "rights": "reference_only"
      },
      {
        "id": "item-3",
        "group": "coats",
        "order": 3,
        "name": "深绿纹理西服",
        "src": "/packages/wardrobe-guide/assets/item-3.jpg",
        "advice": "纹理面料已经有层次，内搭与裤装尽量保持简洁。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          3880,
          635,
          4440
        ],
        "rights": "reference_only"
      },
      {
        "id": "item-4",
        "group": "coats",
        "order": 4,
        "name": "棕色双排扣西服",
        "src": "/packages/wardrobe-guide/assets/item-4.jpg",
        "advice": "棕色外套可搭配米白或深色内搭，让颜色自然衔接。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          4660,
          635,
          5140
        ],
        "rights": "reference_only"
      },
      {
        "id": "item-5",
        "group": "tops",
        "order": 1,
        "name": "复古印花衬衫",
        "src": "/packages/wardrobe-guide/assets/item-5.jpg",
        "advice": "印花上衣搭纯色裤装，让图案成为重点。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          5780,
          635,
          6250
        ],
        "rights": "reference_only"
      },
      {
        "id": "item-6",
        "group": "tops",
        "order": 2,
        "name": "图案针织衫",
        "src": "/packages/wardrobe-guide/assets/item-6.jpg",
        "advice": "用图案针织增加细节，外套与鞋包选择基础色。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          6490,
          635,
          6970
        ],
        "rights": "reference_only"
      },
      {
        "id": "item-7",
        "group": "tops",
        "order": 3,
        "name": "绿色印花衬衫",
        "src": "/packages/wardrobe-guide/assets/item-7.jpg",
        "advice": "绿色印花可配米白、深蓝裤装，避免同时加入太多图案。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          7210,
          635,
          7710
        ],
        "rights": "reference_only"
      },
      {
        "id": "item-8",
        "group": "tops",
        "order": 4,
        "name": "黑白印花Polo衫",
        "src": "/packages/wardrobe-guide/assets/item-8.jpg",
        "advice": "黑白配色容易组合，搭配纯色下装更清楚。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          7860,
          635,
          8350
        ],
        "rights": "reference_only"
      },
      {
        "id": "item-9",
        "group": "shoes",
        "order": 1,
        "name": "棕色短靴",
        "src": "/packages/wardrobe-guide/assets/item-9.jpg",
        "advice": "短靴适合换季搭配，试穿时检查脚背和鞋口是否舒适。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          8900,
          635,
          9400
        ],
        "rights": "reference_only"
      },
      {
        "id": "item-10",
        "group": "shoes",
        "order": 2,
        "name": "黑色系带皮鞋",
        "src": "/packages/wardrobe-guide/assets/item-10.jpg",
        "advice": "系带皮鞋可以衔接通勤裤装，优先考虑合脚与耐穿。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          9560,
          635,
          10050
        ],
        "rights": "reference_only"
      },
      {
        "id": "item-11",
        "group": "shoes",
        "order": 3,
        "name": "深棕乐福鞋",
        "src": "/packages/wardrobe-guide/assets/item-11.jpg",
        "advice": "乐福鞋适合利落的日常组合，裤脚不宜堆积过多。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          10370,
          635,
          10900
        ],
        "rights": "reference_only"
      },
      {
        "id": "item-12",
        "group": "shoes",
        "order": 4,
        "name": "棕色系带皮鞋",
        "src": "/packages/wardrobe-guide/assets/item-12.jpg",
        "advice": "棕色皮鞋可与腰带或包袋呼应，不必强求完全同色。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          11050,
          635,
          11600
        ],
        "rights": "reference_only"
      },
      {
        "id": "item-13",
        "group": "trousers",
        "order": 1,
        "name": "黑色九分西裤",
        "src": "/packages/wardrobe-guide/assets/item-13.jpg",
        "advice": "深色西裤容易搭配多种上装，裤长以利落舒适为准。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          11960,
          635,
          12550
        ],
        "rights": "reference_only"
      },
      {
        "id": "item-14",
        "group": "trousers",
        "order": 2,
        "name": "浅色休闲长裤",
        "src": "/packages/wardrobe-guide/assets/item-14.jpg",
        "advice": "浅色长裤适合日常变化，搭配深色或彩色上装。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          12700,
          635,
          13300
        ],
        "rights": "reference_only"
      },
      {
        "id": "item-15",
        "group": "trousers",
        "order": 3,
        "name": "深灰商务西裤",
        "src": "/packages/wardrobe-guide/assets/item-15.jpg",
        "advice": "灰色西裤可搭衬衫或针织，兼顾通勤与日常场景。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          13470,
          635,
          14050
        ],
        "rights": "reference_only"
      },
      {
        "id": "item-16",
        "group": "trousers",
        "order": 4,
        "name": "浅色百慕大短裤",
        "src": "/packages/wardrobe-guide/assets/item-16.jpg",
        "advice": "短裤用于合适的休闲场合，按气温与穿着习惯选择。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          14200,
          635,
          14800
        ],
        "rights": "reference_only"
      },
      {
        "id": "item-17",
        "group": "accessories",
        "order": 1,
        "name": "深蓝图案领带",
        "src": "/packages/wardrobe-guide/assets/item-17.jpg",
        "advice": "图案领带搭配纯色衬衫，让领口保持一个重点。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          15250,
          635,
          15830
        ],
        "rights": "reference_only"
      },
      {
        "id": "item-18",
        "group": "accessories",
        "order": 2,
        "name": "佩斯利纹领带",
        "src": "/packages/wardrobe-guide/assets/item-18.jpg",
        "advice": "花纹领带与衬衫避免同样密集的图案，减少杂乱感。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          16040,
          635,
          16560
        ],
        "rights": "reference_only"
      },
      {
        "id": "item-19",
        "group": "accessories",
        "order": 3,
        "name": "银色扣头腰带",
        "src": "/packages/wardrobe-guide/assets/item-19.jpg",
        "advice": "金属扣头可以呼应腕表，选择不过分抢眼的尺寸。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          16790,
          635,
          17400
        ],
        "rights": "reference_only"
      },
      {
        "id": "item-20",
        "group": "accessories",
        "order": 4,
        "name": "装饰扣头腰带",
        "src": "/packages/wardrobe-guide/assets/item-20.jpg",
        "advice": "装饰腰带作为局部重点，其余配饰尽量简洁。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          17560,
          635,
          18100
        ],
        "rights": "reference_only"
      },
      {
        "id": "item-21",
        "group": "bags",
        "order": 1,
        "name": "黑色通勤手提包",
        "src": "/packages/wardrobe-guide/assets/item-21.jpg",
        "advice": "先确认通勤所需容量，黑色包容易衔接深浅衣物。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          18540,
          635,
          19100
        ],
        "rights": "reference_only"
      },
      {
        "id": "item-22",
        "group": "bags",
        "order": 2,
        "name": "棕色大容量托特包",
        "src": "/packages/wardrobe-guide/assets/item-22.jpg",
        "advice": "托特包适合随身物品较多时使用，检查提手与重量。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          19320,
          635,
          19870
        ],
        "rights": "reference_only"
      },
      {
        "id": "item-23",
        "group": "bags",
        "order": 3,
        "name": "深色拼色手提包",
        "src": "/packages/wardrobe-guide/assets/item-23.jpg",
        "advice": "小面积拼色可以呼应上装，其他配件保持简洁。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          20080,
          635,
          20620
        ],
        "rights": "reference_only"
      },
      {
        "id": "item-24",
        "group": "bags",
        "order": 4,
        "name": "棕色商务手提包",
        "src": "/packages/wardrobe-guide/assets/item-24.jpg",
        "advice": "棕色手提包可搭配皮鞋或腰带，照顾容量与实用性。",
        "enabled": true,
        "gender": "男",
        "source": "小程序参考/推荐/衣橱规划.png",
        "crop": [
          55,
          20770,
          635,
          21300
        ],
        "rights": "reference_only"
      }
    ]
  },
  "sources": [
    {
      "id": "usu-principles",
      "title": "Design Principles for Clothing and Textiles",
      "author": "Elizabeth Hale; Joanne Roueche; Lindsey Shirley",
      "organization": "Utah State University Extension",
      "year": 2016,
      "type": "同行评审教学资料，不是分类器验证实验",
      "url": "https://extension.usu.edu/research/principles-of-design",
      "locator": "Proportion/Scale; Emphasis; Rhythm; Harmony",
      "summary": "比例关注局部与整体的大小关系；领口、纽扣、配饰等应结合整体比较。颜色、线条与质感可以建立视觉重点，重复元素可以形成节奏。协调效果也包含观察者的主观判断。",
      "supports": [
        "比较领口、图案、配饰与整体的比例",
        "通过重点与呼应组织搭配"
      ],
      "doesNotSupport": [
        "面部五档量感的阈值",
        "面部档位与服装廓形的一对一映射",
        "客观且通用的造型百分制评分"
      ]
    },
    {
      "id": "usu-elements",
      "title": "Elements of Design for Clothing and Textiles",
      "author": "Joanne Roueche; Lindsey Shirley",
      "organization": "Utah State University Extension",
      "year": 2010,
      "type": "服装设计教学资料",
      "url": "https://extension.usu.edu/research/elements-of-design",
      "locator": "Line; Shape or Form; Texture; Color",
      "summary": "线条能引导视线；服装廓形受到剪裁和结构影响；质感影响视觉体积、外观与舒适度。色相、明度、纯度是不同的色彩属性。",
      "supports": [
        "分别描述服装线条、廓形、质感与颜色",
        "比较不同面料与剪裁形成的视觉效果"
      ],
      "doesNotSupport": [
        "把厚面料、大图案、大尺码视为同一概念",
        "从面部明暗直接确定适合的颜色",
        "条纹显瘦等效果在所有情境下一定成立"
      ]
    }
  ]
};
