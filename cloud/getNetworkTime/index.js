// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({
  env:cloud.DYNAMIC_CURRENT_ENV
})
const rp = require("request-promise")
// 云函数入口函数
exports.main = async (event, context) => {
    return rp('http://api.m.taobao.com/rest/api3.do?api=mtop.common.getTimestamp').then(res=>{
        return JSON.parse(res).data.t; 
    }).catch(err=>{
        console.log(err);
    })
}