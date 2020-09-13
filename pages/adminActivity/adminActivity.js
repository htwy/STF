// pages/adminActivity/adminActivity.js
import asyncWx from "../../utils/asyncWx.js"
const db = wx.cloud.database();

Page({

  data: {
    tabs: ['进行中', '已结束'], //标签
    categoryArr: [],  //活动分类分类
  },
  onShow: function () {
    // 分类活动
    this.category()
  },
  // 分类活动，给页面赋值
  category() {
    // 获取用户发布活动的缓存
    let userHost = wx.getStorageSync('userHost') || {}
    let userHostActivities = userHost.userHostActivitiesDetail || {doing:[],finished:[]}
    // 查看进行中的活动是否已完成
    let nowTime = new Date().getTime()
    userHostActivities.doing.forEach((v, i, arr) => {
      if (nowTime > v.activityObj.AcEndTime) {
        userHostActivities.finished.push(...arr.splice(i, 1)) //解构数组
      }
    })
    // 重新放回到缓存
    userHost.userHostActivitiesDetail = userHostActivities
    wx.setStorageSync('userHost', userHost)
    // 设置页面
    // 活动分类 
    let categoryArr = []
    for (var key in userHostActivities) {
      if (key == "doing") {
        categoryArr[0] = userHostActivities[key].reverse()
      } else if (key == "finished") {
        categoryArr[1] = userHostActivities[key].reverse()
      }
    }
    this.setData({
      categoryArr
    })
  },
  // 生成签到码
  async getCode(e) {
    //如果页面可见保存二维码按钮，提示已生成
    console.log(e.currentTarget.dataset)
    var { index, id, type, isgetcode, isneed, acname, starttime, endtime } = e.currentTarget.dataset
    // 1. 是否是在线活动，在线活动无法生成打卡码
    if (isneed == "no") {
      asyncWx.showToast({ title: "线上活动无法生成！" })
      return;
    }
    // 2. 判断是否，已经生成打卡码
    if (isgetcode == "no") {
      asyncWx.showToast({ title: "请勿重复生成打卡码！" })
      return;
    }
    // 3. 生成打卡码
    // 3.1 加载显示
    wx.showLoading({
      title: '生成中...',
      mask: true
    })
    try {
      // 3.2 生成签到码
      let signInQR = await asyncWx.cloudFunction({
        name: "createQRCode",
        data: {
          // path: "pages/verify/verify?type=signIn&AcId=" + id + "&AcName=" + acname + "&StartTime=" + starttime + "&EndTime=" + endtime
          // 太长了，而且中文字符
          path: "pages/verify/verify?type=signIn&AcId=" + id 
        }
      })
      // 3.3 生成签退码
      let signOutQR = await asyncWx.cloudFunction({
        name: "createQRCode",
        data: {
          path: "pages/verify/verify?type=signOut&AcId=" + id
        }
      })
      console.log("签到码", signInQR, "签退码", signOutQR)

      if (type == "进行中") {
        type = "doing"
      } else {
        type = "finished"
      }
      // 3.4 修改缓存数据
      // 3.4.1 取出缓存数据
      let userHost = wx.getStorageSync('userHost')
      let userHostActivities = userHost.userHostActivitiesDetail
      // index转化
      index = userHostActivities[type].length - 1 - index
      // 3.4.2 修改缓存
      userHostActivities[type][index].signInQR = signInQR.fileID
      userHostActivities[type][index].signOutQR = signOutQR.fileID
      // 3.4.3 放回缓存
      userHost.userHostActivitiesDetail = userHostActivities
      wx.setStorageSync('userHost', userHost)

      // 4. 重新加载页面
      this.category()
      // 5. 隐藏显示
      wx.hideLoading({
        success: (res) => { },
      })
      // 6. 提示已生成
      asyncWx.showToast({ title: "已生成" })
    } catch (e) {
      console.log(e)
      // 5. 隐藏显示
      wx.hideLoading({
        success: (res) => { },
      })
      // 6. 提示已生成
      asyncWx.showToast({ title: "生成失败，请重试" })
    }
  },
  // 保存到相册，只生成一次
  async saveQR(e) {
    // 判断用户是否授权
    try {
      let res = await asyncWx.authorize("scope.writePhotosAlbum")
      if (res !== false) { //授权
        wx.showLoading({
          title: '保存中...',
          mask: true
        })
        console.log(e.currentTarget.dataset)
        var { state, index, savetype } = e.currentTarget.dataset
        let userHost = wx.getStorageSync('userHost')
        let userHostActivities = userHost.userHostActivitiesDetail
        if (state == "进行中") {
          state = "doing"
        } else {
          state = "finished"
        }
        index = userHostActivities[state].length - 1 - index
        let fileID;
        if (savetype == "signInQR") {
          fileID = userHostActivities[state][index].signInQR
        } else {
          fileID = userHostActivities[state][index].signOutQR
        }
        console.log(fileID)
        // // 根据fileID 获取临时连接
        // let tempFileURLObj = await utils.getTempFileURL([fileID])
        // let tempFileURL = tempFileURLObj[0].tempFileURL
        // console.log(tempFileURL)
        // 先调用云函数下载，再使用api
        await asyncWx.saveCloudImg(fileID)
      }
    } catch (e) {
      console.log(e)
    }

    wx.hideLoading({
      success: (res) => { },
    })

  },
  //导出名单, 可以重复，
  async getExcel(e) {
    console.log(e.currentTarget.dataset)
    var { index, id, type, isgetexcel, scoretype,scorenum, acname } = e.currentTarget.dataset
    // 1. 判断是否为通知，通知无法生成活动
    if (isgetexcel == "no") {
      asyncWx.showToast({ title: "通知无法导出名单！" })
      return;
    }
    // 2. 提示进行中的活动名单或有遗漏
    if (type == "进行中") {
      let res = await asyncWx.showModal({ content: "活动未结束，名单可能存在遗漏，是否继续？", showCancel: "yes" })
      if (!res) {
        asyncWx.showToast({ title: "取消导出" })
        return;
      }
    }
    // 3. 生成名单
    wx.showLoading({
      title: '导出中...',
      mask: true
    })
    // 提供数据
    let data = [];
    data.push(["学号", "姓名", "班级", "学院", "完成状态"])  //表属性
    // 添加学分属性
    data[0].push(scoretype)
    console.log(data)
    // 请求数据库——活动数据库
    let acRes = await db.collection("STF_Participate").where({
      AcId:id
    }).get()

    let participateUsers = acRes.data[0].participateUsers
    console.log("活动报名人员数据", participateUsers)
    let userArr = []
    for (var key in participateUsers) {
      userArr.push(key)
    }
    console.log("用户id", userArr)
    // 查询用户信息(调用云函数获取用户,这里的数据可能不止100条)

    let users = await asyncWx.cloudFunction({
      name: "databaseOperate",
      data: {
        type: "getField1In1All",
        collection: "STF_Users",
        field: "_openid",
        value: userArr
      }
    })
    console.log("用户数据users", users)
    // 整合到data中
    users.data.forEach((v, i) => {
      let userFinishState = []
      userFinishState.push(v.userBaseInfo.uNo)
      userFinishState.push(v.userBaseInfo.uName)
      userFinishState.push(v.userBaseInfo.uClass)
      userFinishState.push(v.userBaseInfo.uInstitute)
      userFinishState.push(participateUsers[v._openid]=="finished"?'yes':'no')
      userFinishState.push(participateUsers[v._openid]=="finished"?scorenum:'')
      data[i + 1] = userFinishState
    })
    console.log("生成excel的data", data)
    // 调用云函数生成excel
    let excelFileID = await asyncWx.cloudFunction({
      name: "getExcel",
      data: {
        excelName: acname,
        data
      }
    })
    console.log("excel云存储fileID", excelFileID)
    if (type == "进行中") {
      type = "doing"
    } else {
      type = "finished"
    }
    // excelFileID 存入缓存
    let userHost = wx.getStorageSync('userHost')
    let userHostActivities = userHost.userHostActivitiesDetail
    // index转化
    index = userHostActivities[type].length - 1 - index
    // 3.4.2 修改缓存
    userHostActivities[type][index].excelLink = excelFileID.fileID
    // 3.4.3 放回缓存
    wx.setStorageSync('userHost', userHost)
    // 4. 重新加载页面
    this.category()
    // 更新页面
    wx.hideLoading({
      success: (res) => { },
    })
    await asyncWx.showToast({ title: "导出成功!" })
  },
  // 赋值到剪贴板
  async setClipExcelLink(e) {
    wx.showLoading({
      title: '复制中...',
      mask: true
    })
    console.log(e.currentTarget.dataset)
    var { fileid } = e.currentTarget.dataset
    // 换取真实链接
    let excelLink = await asyncWx.getTempFileURL([fileid])
    console.log(excelLink)
    wx.hideLoading({
      success: (res) => { },
    })
    wx.setClipboardData({
      data: excelLink[0].tempFileURL,
    })
  },
  // 跳转活动详情页
  navToDetail(event) {
    // 3. 通过上面两个便可进入活动
    // console.log(event.currentTarget)
    var {type,index} = event.currentTarget.dataset;
    console.log(type,index)

    wx.navigateTo({
      url: '/pages/detail/detail?from=admin&type='+type+'&index='+index
    })
  }

})