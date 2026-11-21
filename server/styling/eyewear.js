const {frames} = require('../../config/llm-prompt/形象DNA/眼镜推荐/眼镜推荐-镜框图库.json');
const matches = require('../../config/llm-prompt/形象DNA/眼镜推荐/眼镜推荐-推荐规则.json');
const {tiers, matchFrames} = require('../../miniprogram/packages/analysis/utils/eyewear-match');

function validRecommendations(items) {
  return Array.isArray(items) && items.length === tiers.length &&
    items.every((item, i) => item && typeof item.name === 'string' && Object.hasOwn(frames, item.name) &&
      item.tier === tiers[i] && typeof item.reason === 'string' &&
      item.reason.trim().length > 0 && item.reason.length <= 500) &&
    new Set(items.map(item => item.name)).size === tiers.length;
}

function apply(analysis, geometry) {
  const face = geometry.provider === 'Face++' ? geometry.classifications?.face : undefined;
  const matched = matchFrames(face, matches, analysis.details.glasses);
  if (matched) analysis.details.glasses = matched;
}

module.exports = {validRecommendations, apply};
