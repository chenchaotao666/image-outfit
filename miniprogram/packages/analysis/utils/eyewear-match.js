const tiers = ['最合适', '一般', '一般', '不推荐', '不推荐'];
const tryOn = {
  '椭圆框':'试戴时看镜片两侧的弧线能否自然衔接脸颊。',
  '方框':'试戴时比较方角的宽度，以及上框线与眉线的位置。',
  '圆框':'试戴时看看圆弧在颧骨附近的位置，微笑时下缘应留有空间。',
  '半框':'试戴时留意较突出的上框线，看视觉重心是否符合预期。',
  '倒梯形框':'试戴时留意上宽下窄的轮廓，比较上框外角和颧部的宽度。'
};

function frameOrder(rule) {
  return [rule['最合适'], ...rule['一般'], ...rule['不推荐']];
}

function matchFrames(face, matches, suggestions) {
  if (!Object.prototype.hasOwnProperty.call(matches, face)) return null;
  return frameOrder(matches[face]).map((name, index) => {
    const tier = tiers[index];
    const original = suggestions.find(item => item.name === name && item.tier === tier);
    return {name, tier, reason:original?.reason || tryOn[name]};
  });
}

module.exports = {tiers, frameOrder, matchFrames};
