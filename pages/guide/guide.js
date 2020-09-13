// pages/guide/guide.js
Page({

  /**
   * 页面的初始数据
   */
  data: {

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

  },
  getText(){
    wx.setClipboardData({
      data: '我要成为活动发布者',
      success (res) {
        wx.getClipboardData({
          success (res) {
            console.log("复制了文本",res)
          }
        })
      }
    })
  }
 
})