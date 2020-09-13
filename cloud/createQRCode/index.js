// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
// 云函数入口函数
//params : event.path  
exports.main = async (event, context) => {
  try {
    const result = await await cloud.openapi.wxacode.get({
      path:event.path,
      width:320
    })
    let qrName = `QR_${new Date().getTime()}.jpg`
    const file = await cloud.uploadFile({
      cloudPath: qrName,
      fileContent: result.buffer,
    })
    return file
  } catch (err) {
    return err
  }
}