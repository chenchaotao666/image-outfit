// Generated from config/llm-prompt/形象DNA/造型评分/造型评分-评分规则.json. Do not edit.
module.exports={
  "version": "styling-v1",
  "status": "editorial_pending_validation",
  "scope": "评分仅评价照片中实际穿搭，不评价颜值、体重或肤色。",
  "evidence": "这是初版主观规则，尚未经过专家样本校准。权重与档位是项目编辑规则，不是文献验证的标准。",
  "dimensions": [
    {
      "id": "fit",
      "name": "版型与比例",
      "weight": 30,
      "requiresBody": true
    },
    {
      "id": "color",
      "name": "配色协调",
      "weight": 25,
      "requiresBody": true
    },
    {
      "id": "style",
      "name": "风格一致性",
      "weight": 20,
      "requiresBody": true
    },
    {
      "id": "occasion",
      "name": "场合适配",
      "weight": 15,
      "requiresBody": true
    },
    {
      "id": "detail",
      "name": "发型与细节",
      "weight": 10,
      "requiresBody": false
    }
  ],
  "levels": [
    {
      "value": 0,
      "description": "明显存在多处搭配冲突"
    },
    {
      "value": 1,
      "description": "存在主要冲突"
    },
    {
      "value": 2,
      "description": "基本协调仍有具体改进点"
    },
    {
      "value": 3,
      "description": "协调且只有局部改进点"
    },
    {
      "value": 4,
      "description": "该维度十分协调且无明显冲突"
    }
  ],
  "bands": [
    {
      "min": 0,
      "max": 59,
      "label": "优先调整"
    },
    {
      "min": 60,
      "max": 79,
      "label": "逐步完善"
    },
    {
      "min": 80,
      "max": 89,
      "label": "协调有序"
    },
    {
      "min": 90,
      "max": 100,
      "label": "整体协调"
    }
  ],
  "calculation": {
    "method": "round_each_then_sum",
    "requireAll": true,
    "requiresUsableFace": true
  },
  "instructions": "必须以本次照片中实际穿着评价，不评价推荐方案。不可因长相、性别、年龄、体重、肤色或身材扣分。看不到鞋履或服装等关键证据时相关项为 null；每项必须填写具体可见依据或缺失原因，以及一条可执行改善建议。",
  "detailInstruction": "detail 独立评价照片中可见的发型、眉须、领口或配饰整理：有足够局部证据即可评价，不要求全身照，不因微笑本身扣分；若发型被裁切或关键细节确实不可见才给 null 并说明。其他项目缺全身照不能连带把 detail 清空。",
  "copy": {
    "dialogTitle": "当前造型评分 · 依据与建议",
    "caption": "根据本次穿搭与整理情况分析",
    "boundary": "评价本次穿搭与造型；不评价颜值或身体条件",
    "missingLabel": "待补充",
    "missingNote": "证据不足的分项保留待补充，不作为零分。",
    "exampleNote": "当前为演示评分，不对应你的照片。",
    "source": "AI 造型评价",
    "demoSource": "演示评分 · 仅展示效果"
  },
  "explanation": "各项先按 0–4 档观察，再按 30/25/20/15/10 权重换算，单项四舍五入后求和，全部项目齐全才生成总分。",
  "levelExplanation": "0 档：明显存在多处搭配冲突；1 档：存在主要冲突；2 档：基本协调仍有具体改进点；3 档：协调且只有局部改进点；4 档：该维度十分协调且无明显冲突。",
  "prompt": "另在 details 内返回 stylingScore，version 为 styling-v1，items 恰好 5 项，依次为 fit 版型与比例/color 配色协调/style 风格一致性/occasion 场合适配/detail 发型与细节。每项包含 id、level、evidence、advice。level 为 0/1/2/3/4 的整数或 null。0 档：明显存在多处搭配冲突；1 档：存在主要冲突；2 档：基本协调仍有具体改进点；3 档：协调且只有局部改进点；4 档：该维度十分协调且无明显冲突。必须以本次照片中实际穿着评价，不评价推荐方案。不可因长相、性别、年龄、体重、肤色或身材扣分。看不到鞋履或服装等关键证据时相关项为 null；每项必须填写具体可见依据或缺失原因，以及一条可执行改善建议。必须有可用正脸照；fit/color/style/occasion 还必须有可用全身照，证据不足时为 null。不要返回总分。各项先按 0–4 档观察，再按 30/25/20/15/10 权重换算，单项四舍五入后求和，全部项目齐全才生成总分。detail 独立评价照片中可见的发型、眉须、领口或配饰整理：有足够局部证据即可评价，不要求全身照，不因微笑本身扣分；若发型被裁切或关键细节确实不可见才给 null 并说明。其他项目缺全身照不能连带把 detail 清空。"
};
