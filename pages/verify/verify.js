// pages/verify/verify.js
import asyncWx from "../../utils/asyncWx.js"
import { distance } from "../../utils/util.js"
let openid = "";  //用户openid
let type = "";  //打卡类型  签到  签退
let AcId = "";  //活动id
let userBaseInfo = {}; //用户注册信息

let activityObj = {};
let btnValue = "签到";  //按钮文字
let isBtnDisabled = false;  //按钮是否可用

const db = wx.cloud.database()
const _ = db.command;
Page({

  data: {
    AcName: '',
    AcStartTime: '',
    AcEndTime: '',
    clockInLocation: {},
    userBaseInfo: {},  //用户填写的报名信息
    btnValue: "签到",
    isBtnDisabled:false
  },

  onLoad: async function (options) {

    wx.showLoading({
      title: '加载中...',
      mask: true
    })
    // 获取扫码得到的参数
    type = options.type
    AcId = options.AcId
    console.log("二维码参数", type, AcId)

    // 获取用户注册资料
    userBaseInfo = wx.getStorageSync('userBaseInfo') || {}
    // 获取用户id
    openid = wx.getStorageSync('openid') || ""

    // 根据AcId 请求活动数据
    let AcRes = await db.collection("STF_Activities").doc(AcId).get()
    console.log("当前活动数据为", AcRes)
    let { AcName, AcStartTime, AcEndTime, clockInLocation } = AcRes.data.activityObj
    activityObj = AcRes.data.activityObj   //存放活动对象

    // 请求STF_Participate报名表，响应按钮状态
    let partState = await db.collection("STF_Participate").where({
      AcId,
      participateUsers: {
        [openid]: _.eq("signIn").or(_.eq("finished")).or(_.eq("doing")).or(_.eq("fail"))
      }
    }).get()
    console.log("用户报名该活动的状态为", partState)

    if (partState.data[0]) { //如果存在，说明报名了
      if(type == "signIn"){  //如果是签到
        if (partState.data[0].participateUsers[openid]=="signIn"){
          btnValue = "已签到"
          isBtnDisabled = true
        }else if(partState.data[0].participateUsers[openid]=="doing"){
          btnValue = "签到"
          isBtnDisabled = false;
        }else if(partState.data[0].participateUsers[openid]=="fail"){
          btnValue = "已失效"
          isBtnDisabled = true;
        }
      }else{ //签退
        if (partState.data[0].participateUsers[openid]=="signIn"){
          btnValue = "签退"
          isBtnDisabled = false;
        }else if(partState.data[0].participateUsers[openid]=="doing"){
          btnValue = "尚未签到"
          isBtnDisabled = true;
        }else if(partState.data[0].participateUsers[openid]=="fail"){
          btnValue = "已失效"
          isBtnDisabled = true;
        }else if(partState.data[0].participateUsers[openid]=="finished"){
          btnValue = "已完成"
          isBtnDisabled = true
        }
      }
    } else {
      btnValue = "尚未报名"
      isBtnDisabled = true;
    }

    // 将活动信息和个人基本资料展示到页面上
    this.setData({
      userBaseInfo,
      AcName,
      AcStartTime,
      AcEndTime,
      clockInLocation,
      type,
      btnValue,
      isBtnDisabled
    })

  
    wx.hideLoading({
      success: (res) => { },
    })

  },
  // 导航
  navToLocation() {
    let { latitude, longitude } = this.data.clockInLocation
    wx.openLocation({
      latitude,
      longitude,
      scale: 18
    })
  },
  // 打卡 
  async clockIn() {
    wx.showLoading({
      title: '加载中...',
      mask: true
    })

    if (openid == "") {
      wx.hideLoading({
        success: (res) => { },
      })
      asyncWx.showToast({ title: "尚未登录！" })
      return;
    }
    // 验证用户资料是否完善
    if (JSON.stringify(userBaseInfo) == "{}") {
      wx.hideLoading({
        success: (res) => { },
      })
      asyncWx.showToast({ title: "尚未完善资料！" })
      return;
    }
    // 验证用户是否在指定地点
    // 获取自身位置
    // 1. 判断是否授权
    try {
      let res = await asyncWx.authorize("scope.userLocation")
      if (res !== false) {
        let location = await asyncWx.authorizeByType("getLocation")
        console.log("当前位置是：", location)
        let longitudeNow = location.longitude;
        let latitudeNow = location.latitude;
        // 打卡位置
        let { latitude, longitude } = this.data.clockInLocation
        console.log("打卡地点位置为", latitude, longitude)
        // 计算距离
        let dis = distance(latitudeNow, longitudeNow, latitude, longitude)
        console.log(dis)
        if (dis > 200) {  
          wx.hideLoading({
            success: (res) => { },
          })
          await asyncWx.showModal({ content: "超出打卡范围，请导航移至打卡范围200米以内" })
          return;
        }
      } else {
        wx.hideLoading({
          success: (res) => { },
        })
        return;
      }
    } catch (e) {
      wx.hideLoading({
        success: (res) => { },
      })
      console.log(e)
      return;
    }
    //通过了上面开始操作数据库
    // 数据库操作用到的数据
    console.log("AcId", AcId, "openid", openid, "type", type)

    if (type == "signIn") {  //如果是签到
      console.log("签到")
      // 1. 验证有没有报名
      // let isPart = await db.collection("STF_Participate").where({
      //   AcId,
      //   participateUsers: {
      //     [openid]: _.eq("doing").or(_.eq("signIn"))   //注意变量属性要加[]中括号
      //   }
      // }).get()
      // console.log("报名情况", isPart)
      // if (isPart.data.length <= 0) { //没有报名
      //   wx.hideLoading({
      //     success: (res) => { },
      //   })
      //   await asyncWx.showModal({ content: "您未报名，无法签到！" })
      //   return;
      // }
      // 2. 验证是否超出签到时间
      //  获取网路当前时间
      let nowTime = await asyncWx.cloudFunction({
        name: "getNetworkTime"
      })
      console.log("当前网络时间", nowTime)
      if (nowTime > this.data.AcStartTime) {  //如果超时
        // 修改STF_Participate用户状态为fail
        let updateRes1 = await asyncWx.cloudFunction({
          name: "databaseOperate",
          data: {
            type: "updateAttribute1",
            collection: "STF_Participate",
            myWhere: {
              AcId
            },
            field: "participateUsers",
            attribute: openid,
            attributeValue: "fail"
          }
        })
        // 修改STF_Users参加的活动状态为fail
        let updateRes2 = await asyncWx.cloudFunction({
          name: "databaseOperate",
          data: {
            type: "updateAttribute1",
            collection: "STF_Users",
            myWhere: {
              _openid: openid
            },
            field: "userJoinActivities",
            attribute: AcId,
            attributeValue: "fail"
          }
        })
        // 修改按钮状态
        this.setData({
          btnValue:"已失效",
          isBtnDisabled:true
        })
        wx.hideLoading({
          success: (res) => { },
        })
        await asyncWx.showModal({ content: "签到超时，活动实效!" })
        return;
      } else {
        // 修改STF_Participate用户状态为signIn
        let updateRes1 = await asyncWx.cloudFunction({
          name: "databaseOperate",
          data: {
            type: "updateAttribute1",
            collection: "STF_Participate",
            myWhere: {
              AcId
            },
            field: "participateUsers",
            attribute: openid,
            attributeValue: "signIn"
          }
        })
         // 修改按钮状态
         this.setData({
          btnValue:"已签到",
          isBtnDisabled:true
        })
        wx.hideLoading({
          success: (res) => { },
        })
        await asyncWx.showModal({ content: "签到成功!" })
        return;
      }

    }

    if (type == "signOut") {  //如果是签退
      console.log("签退")
      // // 1. 验证有没有签到
      // let isSignIn = await db.collection("STF_Participate").where({
      //   AcId,
      //   participateUsers: {
      //     [openid]: _.eq("signIn").or(_.eq("finished"))
      //   }
      // }).get()
      // if (isSignIn.data.length <= 0) { //说明没有签到
      //   wx.hideLoading({
      //     success: (res) => { },
      //   })
      //   await asyncWx.showModal({ content: "您未签到，无法签退！" })
      //   return;
      // }
      // 2. 验证是否超出签退时间
      //  获取网路当前时间
      let nowTime = await asyncWx.cloudFunction({
        name: "getNetworkTime"
      })
      console.log("当前网络时间", nowTime)
      if (nowTime > this.data.AcEndTime) { //如果超时
        // 修改STF_Participate用户状态为fail
        let updateRes1 = await asyncWx.cloudFunction({
          name: "databaseOperate",
          data: {
            type: "updateAttribute1",
            collection: "STF_Participate",
            myWhere: {
              AcId
            },
            field: "participateUsers",
            attribute: openid,
            attributeValue: "fail"
          }
        })
        // 修改STF_Users参加的活动状态为fail
        let updateRes2 = await asyncWx.cloudFunction({
          name: "databaseOperate",
          data: {
            type: "updateAttribute1",
            collection: "STF_Users",
            myWhere: {
              _openid: openid
            },
            field: "userJoinActivities",
            attribute: AcId,
            attributeValue: "fail"
          }
        })
         // 修改按钮状态
         this.setData({
          btnValue:"已失效",
          isBtnDisabled:true
        })
        wx.hideLoading({
          success: (res) => { },
        })
        await asyncWx.showModal({ content: "签退超时，活动实效!" })
        return;
      } else {
        // 修改STF_Participate用户状态为finished
        let updateRes1 = await asyncWx.cloudFunction({
          name: "databaseOperate",
          data: {
            type: "updateAttribute1",
            collection: "STF_Participate",
            myWhere: {
              AcId
            },
            field: "participateUsers",
            attribute: openid,
            attributeValue: "finished"
          }
        })
        // 修改STF_Users参加的活动状态为finished,同时加上学分
        // 根据学分做出相对的加分
        let scoreType = "";
        switch (activityObj.AcScoreType) {
          case "德育分":
            scoreType = "dScore"
            break;
          case "智育分":
            scoreType = "zScore"
            break;
          case "劳育分":
            scoreType = "lScore"
            break
          case "体育分":
            scoreType = "tScore"
            break
          case "美育分":
            scoreType = "mScore"
            break
          default:
            scoreType = "vScore"
            break
        }

        // let updateRes2 = await db.collection("STF_Users").where({
        //   _openid: openid
        // }).update({
        //   data:{
        //     userJoinActivities: {
        //       [AcId]: "finished",
        //     },
        //     [scoreType]: _.inc(parseFloat(activityObj.AcScoreNum))
        //   }
        // })

        let updateRes2 = await db.collection("STF_Users").where({
          _openid: openid
        }).update({
          data: {
            userJoinActivities: {
              [AcId]: "finished",
            },
            scoreList: {
              [scoreType]: _.inc(parseFloat(activityObj.AcScoreNum))
            }
          }
        })
         // 修改按钮状态
         this.setData({
          btnValue:"已完成",
          isBtnDisabled:true
        })
        wx.hideLoading({
          success: (res) => { },
        })
        await asyncWx.showModal({ content: "签退成功，活动完成!" })
        return;
      }
    }
  }
})