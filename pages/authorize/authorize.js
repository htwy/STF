import asyncWx from "../../utils/asyncWx.js"
Page({
  data: {
    value: '',
    userObjArr: []  //用户
  },
  onChange(e) {
    this.setData({
      value: e.detail,
    });
  },
  // 回车查询  手机上为搜索
  async onSearch() {
    this.onClick();
  },
  // 点击查询
  async onClick() {
    let key = this.data.value.trim();
    // 根据关键字查询用户 openid
    if (key == "") {
      asyncWx.showToast({ title: "输入不能为空！" })
      return;
    }
    wx.showLoading({
      title: '查询中...',
      mask: true
    })
    let res = await asyncWx.cloudFunction({
      name: "databaseOperate",
      data: {
        type: "get",
        collection: "STF_Users",
        myWhere:{
          userBaseInfo:{
            uNo:key
          }
        }
      }
    })
    console.log("查询到用户", res)
    if (res.data.length > 0) {
      wx.hideLoading({
        success: (res) => { },
      })

      this.setData({
        userObjArr: res.data
      })
      asyncWx.showToast({ title: "查询成功" })
    } else {
      wx.hideLoading({
        success: (res) => { },
      })
      asyncWx.showToast({ title: "未查到该用户！" })
    }
  },
  // 授权管理
  async manageAuthorize(e) {
    console.log(e.currentTarget.dataset)
    var { openid, identity,index } = e.currentTarget.dataset
    if (identity == "ordinary") {
      let res = await this.changeIndentity({openid,identity:"host",content:"是否确认授权？"})
      console.log("授权结果",res)
      if(res !== "no"){
        // 更新页面
        this.setData({
          ['userObjArr['+index+'].identity']:"host"
        })
        asyncWx.showToast({title:"操作成功",icon:"success"})
      }
    } else {  //撤销为普通用户
      let res = await this.changeIndentity({openid,identity:"ordinary",content:"是否确认取消授权？"})
      console.log("授权结果",res)
      if(res !== "no"){
        // 更新页面
        this.setData({
          ['userObjArr['+index+'].identity']:"ordinary"
        })
        asyncWx.showToast({title:"操作成功",icon:"success"})
      }
    }
  },
  // 更改用户身份 
  async changeIndentity({openid,identity,content}){
    console.log("传进来的参数是",openid,identity)
    let res = await asyncWx.showModal({ content, showCancel: "yes" })
    if(res){
      return await asyncWx.cloudFunction({
        name:"databaseOperate",
        data:{
          type:"update",
          collection:"STF_Users",
          myWhere:{
            _openid:openid
          },
          myData:{
            identity
          }
        }
      })
    }else{
      asyncWx.showToast({title:"取消操作"})
      return "no"
    }
  }
});