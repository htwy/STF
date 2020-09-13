import asyncWx from "../../utils/asyncWx.js"
let openid = '';
Page({
  data: {
    uInstitute: '',  //学院
    uClass: '',  //班级
    uName: '',  //姓名
    uNo: ''  //学号
  },

  onLoad: function (options) {
    // console.log("edit页面被加载onload")
    // 全局变量存放 openid
    openid = wx.getStorageSync('openid')
    // 1. 先从缓存中加载个人真实信息
    this.getUserBaseInfo()

  },
  // 获取缓存 userBaseInfo
  getUserBaseInfo() {
    let userBaseInfo = wx.getStorageSync("userBaseInfo") || {};
    this.setData({
      uInstitute: userBaseInfo.uInstitute || '',
      uClass: userBaseInfo.uClass || '',
      uName: userBaseInfo.uName || '',
      uNo: userBaseInfo.uNo || ''
    })
  },

  // 提交个人信息
  // 如果数据库中没有修改数据库，并修改缓存
  async submit() {
    wx.showLoading({
      title: '提交中...',
      mask: true
    })
    // 提交信息前先对表单数据做处理, trim()去除前后空格
    let uInstitute = this.data.uInstitute.trim();
    let uClass = this.data.uClass.trim();
    let uName = this.data.uName.trim();
    let uNo = this.data.uNo.trim();

    if (uName.length == 0) {
      await asyncWx.showToast({ title: "姓名不能为空！" })
      return;
    }
    if (uNo.length == 0) {
      await asyncWx.showToast({ title: "学号不能为空！" })
      return;
    }
    if (uInstitute.length == 0) {
      await asyncWx.showToast({ title: "学院不能为空！" })
      return;
    }
    if (uClass.length == 0) {
      await asyncWx.showToast({ title: "班级不能为空！" })
      return;
    }
    // 组成对象
    let userBaseInfo = {
      uInstitute,
      uClass,
      uName,
      uNo
    }

    // 更新数据中user.userRegistrationInfo
    let res = await asyncWx.updateDatabase({
      collection:"STF_Users",
      myWhere:{
        _openid:openid
      },
      myData:{
        userBaseInfo
      }
    })
    console.log(res)
    // 提示更新成功
    if (res.errMsg == "collection.update:ok") {
      // 重新加载页面数据
      this.setData({
        uInstitute,
        uClass,
        uName,
        uNo
      })
      wx.hideLoading({
        success: (res) => { },
      })
      await asyncWx.showToast({ title: "提交成功", icon: "success" })
    }
  }
})