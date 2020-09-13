
Page({
  data: {
    tabs:["进行中","已完成","已失效"],//tabs标签
    categoryArr: [], //活动分类数组
  },
  onLoad: function (options) {
    // this.getActivity();
  },
  onShow(){
    // 1. 判断用户身份
    let identity = wx.getStorageSync('identity') || "ordinary"

    // 2. 获取缓存userJoinActivities,整合响应到页面
    let userJoin = wx.getStorageSync('userJoin')||{userJoinActivitiesDetail:{doing:[],finished:[],fail:[]}}
    let categoryArr = []
    for(var key in userJoin.userJoinActivitiesDetail){

      if(key=="doing"){
        categoryArr[0]=userJoin.userJoinActivitiesDetail[key].reverse()
      }else if(key == "finished"){
        categoryArr[1]=userJoin.userJoinActivitiesDetail[key].reverse()
      }else{
        categoryArr[2]=userJoin.userJoinActivitiesDetail[key].reverse()
      }
    }
    this.setData({
      identity,
      categoryArr
    })
  },
  // 跳转活动详情页
  navToDetail(event) {
    // 3. 通过上面两个便可进入活动
    // console.log(event.currentTarget)
    var {type,index} = event.currentTarget.dataset;
    console.log(type,index)
    // if(type == "进行中"){
    //   type = "doing"
    // }else if(type == "已完成"){
    //   type = "finished"
    // }else{
    //   type = "fail"
    // }
    wx.navigateTo({
      url: '/pages/detail/detail?from=check&type='+type+'&index='+index
    })
  }

})