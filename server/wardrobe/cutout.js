const { spawn } = require('node:child_process');
const path = require('node:path');
const { ApiError } = require('../contract');
let active = false;
async function cutout(data) {
  if (typeof data.image !== 'string' || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(data.image))
    throw new ApiError('INVALID_IMAGE', '请选择有效的 PNG、JPEG 或 WebP 图片', 400);
  if (data.image.length > 10 * 1024 * 1024) throw new ApiError('TOO_LARGE', '图片过大，请缩小后重试', 413);
  if (active) throw new ApiError('BUSY', '正在处理图片，请稍后再试', 429);
  active = true;
  try {
    return await new Promise((resolve, reject) => {
      const worker = spawn(process.env.CUTOUT_PYTHON || 'python', [path.join(__dirname, '../../models/vision/cutout.py')], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      let result = '', finished = false;
      const finish = (error, value) => {
        if (finished) return;
        finished = true; clearTimeout(timer);
        if (error) reject(error); else resolve(value);
      };
      const fail = () => finish(new ApiError('CUTOUT_FAILED', '抠图失败，请确认图片主体清晰后重试', 503));
      const timer = setTimeout(() => { worker.kill(); fail(); }, 90000);
      worker.on('error', fail);
      worker.stdin.on('error', fail);
      worker.stderr.resume();
      worker.stdout.on('data', chunk => { result += chunk; if (result.length > 20 * 1024 * 1024) { worker.kill(); fail(); } });
      worker.on('close', code => {
        if (code !== 0) return fail();
        try { const value = JSON.parse(result); if (!value.image?.startsWith('data:image/png;base64,')) return fail(); finish(null, value); } catch { fail(); }
      });
      worker.stdin.end(JSON.stringify({ image: data.image, white: data.white === true }));
    });
  } finally { active = false; }
}
module.exports = { cutout };
