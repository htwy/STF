// pages/acFinished/acFinished.js
Page({

  data: {

  },


  onLoad: function (options) {
    const {type,score} = options
    console.log(type,score)
    // 根据type，从缓存userJoin遍历
    let userJoin = wx.getStorageSync('userJoin')
    let userFinishedActivities = userJoin.userJoinActivitiesDetail.finished || []
    let activityArr = []
    userFinishedActivities.forEach(v=>{
      if(v.activityObj.AcScoreType == type && v.activityObj.AcScoreType!=="线上"){
        activityArr.push(v)
      }
    })
    this.setData({
      activityArr:activityArr.reverse(),
      type,
      score
    })
  },

 
})