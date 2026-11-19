const account = require('../../../shared/account-api');
async function removeBackground(path, white) {
  const image = path.startsWith('data:image/') ? path : await new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({filePath: path, encoding: 'base64', success: file => resolve('data:image/' + (file.data.startsWith('iVBOR') ? 'png' : file.data.startsWith('UklGR') ? 'webp' : 'jpeg') + ';base64,' + file.data), fail: () => reject(Error('图片读取失败，请重新选择'))});
  });
  const result = await account.call('/wardrobe/cutout', 'POST', {image, white});
  if (!wx.env?.USER_DATA_PATH) return result.image;
  const destination = wx.env.USER_DATA_PATH + '/cutout-' + Date.now() + '.png';
  await new Promise((resolve, reject) => wx.getFileSystemManager().writeFile({filePath: destination, data: result.image.split(',')[1], encoding: 'base64', success: resolve, fail: reject}));
  return destination;
}
module.exports = {removeBackground};
