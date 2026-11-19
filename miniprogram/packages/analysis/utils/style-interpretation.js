// Consumer copy. These are explanations and try-on suggestions, not measured thresholds.
// Rationale: config/styling/判断依据-文献与理论.json (proportion, texture, body fit).
const VOLUME_COPY=[
 {meaning:'“大量感”描述的是五官与轮廓在整体中的视觉分量，不是脸的实际大小。',clothes:'可以先试大廓形方向：选择肩线清晰、有结构感的外套，再用一处醒目图案或配饰作重点。松量和衣长按身形调整，不必刻意买大一码。'},
 {meaning:'“中大量感”指视觉分量介于中等与较强之间，不代表每一处五官都大。',clothes:'可以先试中大廓形方向：有一定结构、略有松量的外套，搭配简洁内搭。图案或装饰选一处作重点，肩线和衣长以试穿合适为准。'},
 {meaning:'“中量感”表示整体视觉分量居中，不等于五官没有特点。',clothes:'可以先试中廓形方向：合身而不紧绷的外套，配适度挺括的面料；图案和配饰保持适中。试穿时先看肩线、衣长与活动空间，再调整宽松程度。'},
 {meaning:'“中小量感”指整体视觉分量介于中等与轻盈之间，不代表脸的实际尺寸小。',clothes:'可以先试中小廓形方向：轻结构外套搭配简洁内搭，用细纹或小配饰增加层次。减少不必要的厚重堆叠，同时保留舒适的活动空间。'},
 {meaning:'“小量感”描述的是整体较轻盈的视觉分量，不是对脸部尺寸的测量。',clothes:'可以先试小廓形方向：轮廓简洁、面料轻盈的单品，搭配适度的小细节。小廓形不等于紧身或小尺码，肩线和松量仍需按身体选择。'}
];
function volumeInterpretation(selected,label,evidence,demo=false){
 const copy=Number.isInteger(selected)?VOLUME_COPY[selected]:null;
 if(!copy)return {explanation:'本次还没有足够依据判断面部量感。清晰、无遮挡的正脸照有助于进一步分析。',suggestion:'先从合身剪裁开始，比较不同肩线、衣长与面料，选择活动舒适的一款。'};
 const detail=typeof evidence==='string'?evidence.trim():'';
 return {
  explanation:(demo?'示例中的面部量感为':'本次分析的面部量感偏向')+'「'+label+'」。'+(detail?'判断参考：'+detail:copy.meaning+'这份报告未记录具体判断原因。'),
  suggestion:copy.clothes+'这是试穿参考，还需结合身形、场合和个人喜好。'
 };
}
const CURVE_COPY=[
 {meaning:'“直线感”指轮廓与五官线条的整体观感更偏利落、清晰，不是在判断性格。',clothes:'可以先试清晰的衬衫领、直线门襟和利落剪裁，用条纹或几何细节呼应；搭配柔软内搭，避免整套过于生硬。'},
 {meaning:'“中偏直”表示整体线条偏利落，同时保留柔和的过渡。',clothes:'可以用衬衫领、直线门襟建立轮廓，再搭配柔软面料或圆润配饰。让清晰线条为主，柔和细节作补充。'},
 {meaning:'“直曲居中”表示整体线条处在利落与柔和之间，并不等于每个部位都各占一半。',clothes:'可以尝试清晰领口配柔软面料，或直线外套配圆领内搭。图案可先从简洁细纹开始，在利落与柔和之间找到自己喜欢的平衡。'},
 {meaning:'“中偏曲”表示整体线条更偏柔和，同时保留一些清晰的轮廓。',clothes:'可以先试圆领、柔和翻领和适度垂坠的面料，用简洁门襟或清晰肩线保留结构。图案可以尝试流畅线条，避免细节过多。'},
 {meaning:'“曲线感”描述的是整体较圆润、柔和的线条观感，不代表性格温和或亲和力强。',clothes:'可以先试圆领、弧形细节或柔和垂坠的面料，搭配流畅的纹样。保留合身肩线与简洁轮廓，也可以用少量直线细节增加利落感。'}
];
function curvatureInterpretation(selected,label,evidence,demo=false){
 const copy=Number.isInteger(selected)?CURVE_COPY[selected]:null;
 if(!copy)return {explanation:'本次还没有足够依据判断曲直感。需要结合清晰的面部轮廓与五官线条分析。',suggestion:'可以先比较清晰领口与柔和领口，选择自己喜欢、穿着舒适的一款。'};
 const detail=typeof evidence==='string'?evidence.trim():'';
 return {
  explanation:(demo?'示例中的曲直感为':'本次分析的面部曲直感偏向')+'「'+label+'」。'+(detail?'判断参考：'+detail:copy.meaning+'这份报告未记录具体判断原因。'),
  suggestion:copy.clothes+'这是风格尝试方向，最终结合身形、场合与个人喜好调整。'
 };
}
module.exports={volumeInterpretation,curvatureInterpretation};
