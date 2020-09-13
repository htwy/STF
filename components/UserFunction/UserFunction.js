// components/UserFunction/UserFunction.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    identity: {
      type: String,
      value: ''
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    identity:"ordinary"
  },

  /**
   * 组件的方法列表
   */
  methods: {
    
    // 扫码
    scanCode() {
      if(!this.isLogin()){
        return;
      }
      wx.scanCode({
        success(res) {
          wx.navigateTo({
            url: '/' + res.path,
          })
        }
      })
    },
    // 发布
    NavtoPub() {
      wx.navigateTo({
        url: '/pages/publish/publish',
      })
    },
    // 跳转到活动管理也
    navToAdminActivity() {
      wx.navigateTo({
        url: '/pages/adminActivity/adminActivity',
      })
    },
    // 跳转到授权页面
    async navToAuthorize(){
      wx.navigateTo({
        url: '/pages/authorize/authorize'
      })

    },
    // 是否登录
    isLogin() {
      // 判断用户有没有登录
      let openid = wx.getStorageSync('openid') || ""
      if (openid == "") {
        wx.showModal({
          title: '提示',
          content: "您需要先登录！",
          showCancel: true,
          success(res) {
            if (res.confirm) {
              wx.switchTab({
                url: '/pages/user/user',
              })
              
            } else {
              wx.showToast({
                title: '尚未登录',
                icon: "none"
              })
            }
          }
        })
        return 0;
      }else{
        return 1;
      }
    }

    
    
  }
})
