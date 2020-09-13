import asyncWx from "../../utils/asyncWx.js"


Page({
  data: {
    userPublicInfo: {},  //用户头像昵称
    scoreList: {}  //用户学分
  },
  onLoad() {
    // 个人中心可转发
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });

    // 用缓存中取出
    let userPublicInfo = wx.getStorageSync('userPublicInfo') || {}
    let scoreList = wx.getStorageSync('scoreList') || {}
    this.setData({
      userPublicInfo,
      scoreList
    })
  },
  onReady() {
    // 监听用户表
    this.usersWatch()
  },
  // 监听用户表STF_Users
  usersWatch() {
    wx.showLoading({
      title: '加载中...',
      mask: true
    })
    const STF_Users = wx.cloud.database().collection("STF_Users");
    STF_Users.watch({
      onChange: async (snapshot) => {
        console.log("用户表集合变化", snapshot)
        if (!snapshot.docs[0]) { //如果集合啥也没有
          return;
        }
        //如果存在用户身份，将用户身份存入缓存
        let identity = snapshot.docs[0].identity
        if (identity) {
          wx.setStorageSync('identity', identity)
        }
        // 如果存在用户id，则存入缓存
        let openid = snapshot.docs[0]._openid
        if (openid) {
          wx.setStorageSync('openid', openid)
        }
        // 如果用户公开信息存在，则存入缓存
        let userPublicInfo = snapshot.docs[0].userPublicInfo || {}
        if (JSON.stringify(userPublicInfo) !== "{}") {
          wx.setStorageSync('userPublicInfo', userPublicInfo)
        }
        // 如果用户学分列表存在，则存入缓存
        // let scoreList = {}
        // scoreList.dScore = snapshot.docs[0].dScore || 0
        // scoreList.zScore = snapshot.docs[0].zScore || 0
        // scoreList.lScore = snapshot.docs[0].lScore || 0
        // scoreList.tScore = snapshot.docs[0].tScore || 0
        // scoreList.mScore = snapshot.docs[0].mScore || 0
        // scoreList.vScore = snapshot.docs[0].vScore || 0

        let scoreList = snapshot.docs[0].scoreList
        // 存入缓存
        wx.setStorageSync('scoreList', scoreList)
        // 将用户公开信息和用户学分列表展示到页面上(即使为空对象也展示)
        this.setData({
          userPublicInfo,
          scoreList
        })

        // 如果用户基础信息存在，则存入缓存
        let userBaseInfo = snapshot.docs[0].userBaseInfo || {}
        if (JSON.stringify(userBaseInfo) !== "{}") {
          wx.setStorageSync('userBaseInfo', userBaseInfo)
        }

        // 如果用户参加的活动存在，则
        let userJoinActivities = snapshot.docs[0].userJoinActivities || {}
        let userJoin = wx.getStorageSync('userJoin') || { userJoinActivities: {}, userJoinActivitiesDetail: { doing: [], finished: [], fail: [] } }
        console.log("缓存userJoin开始", userJoin)
        if (JSON.stringify(userJoinActivities) !== "{}" && JSON.stringify(userJoinActivities) !== JSON.stringify(userJoin.userJoinActivities)) {
          console.log("请求STF_Activities,整合参加的活动到缓存userJoin.userJoinActivitiesDeail")
          let AcIdArr = []
          for (var key in userJoinActivities) {
            // 用户报名的所有活动Id
            AcIdArr.push(key)
          }
          // 请求数据库(用云函数，突破20条)
          let res = await asyncWx.cloudFunction({
            name: "databaseOperate",
            data: {
              type: "getField1In1",
              collection: "STF_Activities",
              field: "_id",
              value: AcIdArr
            }
          })
          console.log("参加活动的详细内容为", res.data)
          // 活动分类存入缓存
          // 先清空分类缓存
          userJoin.userJoinActivitiesDetail = { doing: [], finished: [], fail: [] }
          for (var key in userJoinActivities) {
            console.log("活动的状态为", key)
            // 遍历res.data
            res.data.forEach(v => {
              if (v._id == key) {
                userJoin.userJoinActivitiesDetail[userJoinActivities[key]].push({ AcId: v._id, activityObj: v.activityObj, rest: v.rest })
                return;
              }
            })
          }
          userJoin.userJoinActivities = userJoinActivities
          wx.setStorageSync('userJoin', userJoin)
        } else {
          console.log("参加的活动状态未更新")
        }

        // 如果用户举办的活动与缓存中的不一致，则请求活动表，进行整合
        let userHostActivities = snapshot.docs[0].userHostActivities || []
        let userHost = wx.getStorageSync('userHost') || {}
        let userHostActivitiesStorage = userHost.userHostActivities || []
        // 举办活动数据不为空，且与缓存中举办活动数组不一致
        if (userHostActivities.length > 0 && userHostActivities.sort().toString() !== userHostActivitiesStorage.sort().toString()) {
          console.log("请求STF_Activities,保存举办的活动的详情到缓存userHost.userHostActivitiesDetail")
          // 请求数据库(用云函数，突破20条)
          let res = await asyncWx.cloudFunction({
            name: "databaseOperate",
            data: {
              type: "getField1In1",
              collection: "STF_Activities",
              field: "_id",
              value: userHostActivities
            }
          })
          console.log("举办活动的详细内容为", res.data)
          // 存入用户举办活动缓存 userHost
          userHost.userHostActivities = userHostActivities
          userHost.userHostActivitiesDetail = { doing: [], finished: [] }
          userHost.userHostActivitiesDetail.doing = res.data
          wx.setStorageSync('userHost', userHost)
        } else {
          console.log("举办的活动未更新")
        }
      },
      onError(err) {
        console.log(err)
        wx.hideLoading({
          success: (res) => { },
        })
      }
    })
    wx.hideLoading({
      success: (res) => { },
    })
  },
  // 授权登录：说明用户第一次登录
  async handleGetUserInfo(e) {

    // 1. 获取用户公开信息
    const { userInfo } = e.detail;
    //console.log(userInfo)
    //将获得的用户公开信息存入缓存
    let userPublicInfo = {
      nickName: userInfo.nickName,
      avatarUrl: userInfo.avatarUrl
    }

    // 2. 将用户存入用户表
    let res = await asyncWx.addDatabase({
      collection: "STF_Users",
      data: {
        identity: "ordinary",
        registerTime: new Date().getTime(),
        userPublicInfo,
        scoreList: {
          dScore: 0,
          zScore: 0,
          lScore: 0,
          tScore: 0,
          mScore: 0,
          vScore: 0
        }

      }
    })
    console.log("用户登录", res)
  },
  // 跳转编辑用户基本信息
  navToUserBaseInfo() {
    wx.navigateTo({
      url: '/pages/userBaseInfo/userBaseInfo',
    })
  },
  navToAbout(){
    wx.navigateTo({
      url: '/pages/about/about',
    })
  },
  // 跳转到guide页面
  navToGuide(){
    wx.navigateTo({
      url: '/pages/guide/guide',
    })
  },
  // 跳转到学分汇总页面
  navToAcFinished(e){
    const {type,score} = e.currentTarget.dataset
    wx.navigateTo({
      url: '/pages/acFinished/acFinished?type='+type+'&score='+score,
    })
  }

})