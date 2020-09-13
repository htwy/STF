// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database();
const _ = db.command;
const MAX_LIMIT = 100
// 云函数入口函数
exports.main = async (event, context) => {
  try {
    if (event.type == "update") {  //普通的更新集合
      return await db.collection(event.collection)
      .where({
        ...event.myWhere
      })
      .update({
        data: {
          ...event.myData
        }
      })
    } if (event.type == "updateAttribute1") {  //更新对象的属性
      return await db.collection(event.collection)
        .where({
          ...event.myWhere,
        })
        .update({
          data: {
            [event.field]: {
              [event.attribute]: event.attributeValue
            }
          }
        })
    } else if (event.type == "updateField1Inc1") {  //更新字段，自增或自减
      return await db.collection(event.collection)
        .where({
          ...event.myWhere,
        })
        .update({
          data: {
            [event.field]: _.inc(event.value)
          }
        })
    } else if (event.type == "get") {  //普通获取 100条数据
      return await db.collection(event.collection)
        .where({
          ...event.myWhere
        })
        .get()
    } else if (event.type == "getAll") {  //获取所有数据
      // 先取出集合记录总数
      const countResult = await db.collection(event.collection).count()
      const total = countResult.total
      // 计算需分几次取
      const batchTimes = Math.ceil(total / 100)
      // 承载所有读操作的 promise 的数组
      const tasks = []
      for (let i = 0; i < batchTimes; i++) {
        const promise = db.collection(event.collection).skip(i * MAX_LIMIT).limit(MAX_LIMIT).get()
        tasks.push(promise)
      }
      // 等待所有
      return (await Promise.all(tasks)).reduce((acc, cur) => {
        return {
          data: acc.data.concat(cur.data),
          errMsg: acc.errMsg,
        }
      })
    } else if (event.type == "getField1In1") {  //获取符合数组中的数据 100条数据
      return await db.collection(event.collection)
        .where({
          ...event.myWhere,
          [event.field]: _.in(event.value)
        })
        .get()
    } else if (event.type == "getField1In1All") {  //获取符合数组中的数据 突破数组100条限制
      // 先取出符合数组数据的记录总数
      const countResult = await db.collection(event.collection).where({
        ...event.myWhere,
        [event.field]: _.in(event.value)
      }).count()
      const total = countResult.total
      // 计算需分几次取
      const batchTimes = Math.ceil(total / 100)
      // 承载所有读操作的 promise 的数组
      const tasks = []
      for (let i = 0; i < batchTimes; i++) {
        const promise = db.collection(event.collection).where({
          ...event.myWhere,
          [event.field]: _.in(event.value)
        }).skip(i * MAX_LIMIT).limit(MAX_LIMIT).get()
        tasks.push(promise)
      }
      // 等待所有
      return (await Promise.all(tasks)).reduce((acc, cur) => {
        return {
          data: acc.data.concat(cur.data),
          errMsg: acc.errMsg,
        }
      })
    }
  } catch (e) {
    return e
  }
}