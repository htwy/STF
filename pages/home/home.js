//index.js
import asyncWx from "../../utils/asyncWx.js"
Page({
  data: {
    identity: 'ordinary',  //用户身份
    tabs: ['全部', '志愿时长', '德育分', '智育分', '劳育分', '体育分', '美育分'],    //tab标签
    categoryArr: [], //活动分类数组
  },
  onLoad: function () {
    // 首页可转发
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },
  onReady() {
    wx.showLoading({
      title: '加载中...',
    })
    // 小程序对活动表进行监听
    const STF_Activities = wx.cloud.database().collection("STF_Activities");
    STF_Activities.watch({
      onChange: async (snapshot) => {
        console.log("监听活动表", snapshot)
        // 遍历，正在进行的活动(根据AcStartTime>now,AcNum>0)，存入this.data
        // 1. 获取当前网络时间
        let now = await asyncWx.cloudFunction({
          name: "getNetworkTime"
        })
        console.log("当前网络时间", now)
        // 查找所有存活的活动
        let AllList = snapshot.docs.filter((v) =>
          (v.rest == 'infinite' || v.rest > 0) && parseInt(v.activityObj.AcStartTime) > parseInt(now)
        )
        console.log("所有存活的活动", AllList)
        // 分类存活的所有活动
        let categoryArr = [];
        // 第一层为 全部活动
        categoryArr.unshift(AllList.reverse())
        this.data.tabs.forEach((v1, i) => {
          if (i > 0) {
            categoryArr[i] = AllList.filter(v2 => {
              return v2.activityObj.AcScoreType == v1
            }).reverse()
          }
        })
        // 存入缓存
        wx.setStorageSync('liveActivities', AllList)
        // 为页面赋值
        this.setData({ categoryArr })
        wx.hideLoading({
          success: (res) => { },
        })
      },
      onError(err) {
        console.log(err)
        wx.hideLoading({
          success: (res) => { },
        })
      }
    })
  },
  onShow() {
    // 每次显示都从缓存获取用户身份
    let identity = wx.getStorageSync('identity') || "ordinary"
    this.setData({
      identity
    })
  },
  //跳转到活动详情
  async navToDetail(event) {
    // 1. 验证用户是否登录
    let login = wx.getStorageSync('userPublicInfo') || {}
    if (JSON.stringify(login) == "{}") {
      let res = await asyncWx.showModal({ content: "报名活动前，请先登录并完善资料!", showCancel: "yes" })
      if (res) {
        wx.switchTab({
          url: '/pages/user/user',
        })
        return;
      } else {
        asyncWx.showToast({ title: "取消报名！" })
        return;
      }
    }
    // 2. 用户已登录，验证是否填写了信息
    let userBaseInfo = wx.getStorageSync('userBaseInfo') || {}
    if (JSON.stringify(userBaseInfo) == "{}") {
      let res = await asyncWx.showModal({ content: "报名活动前，请先完善个人资料!", showCancel: "yes" })
      if (res) {
        wx.navigateTo({
          url: '/pages/userBaseInfo/userBaseInfo',
        })
        return;
      } else {
        asyncWx.showToast({ title: "取消报名！" })
        return;
      }
    }
    // 3. 通过上面两个便可进入活动
    // console.log(event.currentTarget)
    var id = event.currentTarget.dataset.acid;
    console.log("当前活动id", id)
    wx.navigateTo({
      url: '/pages/detail/detail?from=index&AcId=' + id
    })
  }

})
