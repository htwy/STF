// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env:cloud.DYNAMIC_CURRENT_ENV
})
// 重点：一定要 npm install node-xlsx
//操作excel用的类库
const xlsx = require('node-xlsx');

// 云函数入口函数
/**
 * 
 * @param event.excelName
 * @param event.data  [[attribute1,attribute2],[v1,v2],[v11,v22]]
 */
exports.main = async(event, context) => {  
  try {
    
    //1 处理excel表格名
    let excelName = event.excelName;
    excelName += `_${new Date().getTime()}` 
    excelName += '.xlsx'

   //2 把数据保存到excel里
    var buffer = await xlsx.build([{
      name: event.excelName,
      data: event.data
    }]);
    //4，把excel文件保存到云存储里, 不用success,会直接返回fileID
    return await cloud.uploadFile({
      cloudPath: excelName,
      fileContent: buffer, //excel二进制文件
    })

  } catch (e) {
    console.error(e)
    return e
  }
}