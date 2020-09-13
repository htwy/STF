import { singleTodouble } from "../../utils/util.js"
import asyncWx,{ authorize, authorizeByType, showToast, addDatabase } from "../../utils/asyncWx.js"

const db = wx.cloud.database()
const _ = db.command;

let openid = "";
let id = "";  //添加活动后，获得的id
Page({
  data: {
    AcName: '',  //活动名称
    AcHost: '', //活动主办方
    AcViceHost: '', //承办单位

    AcObj: '',  //活动对象
    AcNum: '',  //活动人数

    startDate: "",       //开始日期 年月日
    startTime: "00:00",  //开始时间 时-分
    endDate: "",       //结束日期  年月日
    endTime: "23:59",   //结束时间 时-分 

    AcAddress: '',  //活动详细地址
    clockInLocation: {},  //打卡地点

    scoreIndex: -1, //学分种类索引
    scoreTypeArray: ['志愿时长', '德育分', '智育分', '劳育分', '体育分', '美育分'],  //学分选择数组
    score: '',
    detail: '',  //活动详情
    isScoreVisible: true,   //学分选择是否可见
    activityTypeSwitchChecked: true  //true 线下活动
  },
  onLoad: function (options) {
    // 1. 加载编辑缓存
    let activityEditTemp = wx.getStorageSync('activityEditTemp') || {}
    // 1.1 获取当前时间
    let time = new Date()
    let year = time.getFullYear()
    let month = time.getMonth() + 1
    let date = time.getDate()
    let h = time.getHours() < 10 ? '0' + time.getHours() : time.getHours()
    time = `${singleTodouble(year)}-${singleTodouble(month)}-${singleTodouble(date)}`

    console.log("开始的data", this.data)

    // 1.2  从缓存中拿出上次填写活动的数据,设置页面
    this.setData({
      AcName: activityEditTemp.AcName || '',
      AcHost: activityEditTemp.AcHost || '',
      AcViceHost: activityEditTemp.AcViceHost || '',
      AcObj: activityEditTemp.AcObj || '',
      AcNum: activityEditTemp.AcNum || '',
      startDate: activityEditTemp.startDate || time,
      startTime: activityEditTemp.startTime || h + ':00',
      endDate: activityEditTemp.endDate || time,
      endTime: activityEditTemp.endTime || '23:59',

      AcAddress: activityEditTemp.AcAddress || '',
      clockInLocation: activityEditTemp.clockInLocation || {},
      scoreIndex: activityEditTemp.scoreIndex || -1,
      score: activityEditTemp.score || '',
      detail: activityEditTemp.detail || ''
    })
    // 如果缓存activityEditTemp不为{}{
    if (JSON.stringify(activityEditTemp) !== "{}") {
      if (activityEditTemp.isScoreVisible) {
        this.setData({
          isScoreVisible: true
        })
      } else {
        this.setData({
          isScoreVisible: false
        })
      }
      if (activityEditTemp.activityTypeSwitchChecked) {
        this.setData({
          activityTypeSwitchChecked: true
        })
      } else {
        this.setData({
          activityTypeSwitchChecked: false
        })
      }
    }

    console.log("活动编辑缓存赋值更新了data", this.data)

  },
  // 确认发布
  async Publish() {
    // 验证表单
    let activityObj = this.vertifyForm()
    console.log(activityObj)
    if (activityObj !== "no") {
      wx.showLoading({
        title: '发布中...',
        mask: true
      })

      // 1. 活动表添加活动
      let res = await addDatabase({
        collection: "STF_Activities",
        data: {
          activityObj,
          rest:activityObj.AcNum=="infinite"?"infinite":parseInt(activityObj.AcNum),
          publishTime:new Date().getTime()
        }
      })
      console.log(res)
      if (res.errMsg == "collection.add:ok") {

        // 2.1 更新用户表中userHostActivities添加举办的活动
        // let AcId = res._id
        id = res._id
        console.log("活动id", id)
        // 获取用户id
        openid = wx.getStorageSync('openid')

        let updateRes = await db.collection("STF_Users").where({
          _openid:openid
        }).update({
          data:{
            userHostActivities:_.push(id)
          }
        })
        console.log("同时更新了用户userHostActivities", updateRes)

        // 2.2 添加活动报名表 STF_Participate
        let addRes = await asyncWx.addDatabase({
          collection:"STF_Participate",
          data:{
            AcId:id,
            participateUsers:{}
          }
        })
        console.log("同时STF_Participate表添加了活动记录",addRes)

        // 3. 表单重置
        this.refreshThisData()
        // 4. 清空活动预览缓存
        wx.removeStorageSync('activityObjTemp')
        wx.hideLoading({
          success: (res) => {
            showToast({ title: "发布成功!", icon: "success" })
          },
        })

      } else {
        wx.hideLoading({
          success: (res) => {
            showToast({ title: "发布失败！" })
          },
        })
      }
    } else {
      console.log("无法发布")
    }
  },
  // 预览活动发布效果
  preview() {
    // 验证表单是否填完整
    let activityObj = this.vertifyForm()
    console.log(activityObj)
    if (activityObj !== "no") {
      // 存入预览缓存
      wx.setStorageSync('activityObjTemp', activityObj)
      // 跳转到预览页面
      wx.navigateTo({
        url: '/pages/detail/detail?from=preview',
      })
    } else {
      console.log("无法预览")
    }
  },
  // 活动类型切换
  activityTypeChange(e) {
    let switchValue = e.detail.value
    this.setData({
      activityTypeSwitchChecked: switchValue,
      AcAddress: switchValue ? '' : '线上',
      clockInLocation: {}
    })
  },
  // 学分switch 切换
  ScoreSwitchChange(e) {
    let switchValue = e.detail.value
    this.setData({
      isScoreVisible: switchValue,
      scoreIndex: switchValue ? this.data.scoreIndex : -1,
      score: switchValue ? this.data.score : ''
    })
  },
  // 重置this.data
  refreshThisData() {
    // 如果发布的是线上活动
    // 活动地点 重置为  "线上" ;否则线下就置空
    let AcAddress = ""
    if(!this.data.activityTypeSwitchChecked){
      AcAddress = "线上"
    }
    // 时间需要重置
    let time = new Date()
    let year = time.getFullYear()
    let month = time.getMonth() + 1
    let date = time.getDate()
    let h = time.getHours() < 10 ? '0' + time.getHours() : time.getHours()
    time = `${singleTodouble(year)}-${singleTodouble(month)}-${singleTodouble(date)}`

    this.setData({
      AcName: '',  //活动名称
      AcHost: '', //活动主办方
      AcViceHost: '', //承办单位
      AcObj: '',  //活动对象
      AcNum: '',  //活动人数
      AcAddress,  //活动详细地址
      clockInLocation: {},  //打卡地点
      scoreIndex: -1, //学分种类索引
      score: '',
      detail: '',  //活动详情，被正则化了
      textareaValue: '',   //文本框的值
      startDate:time,  //开始时间 年月日
      startTime:h+":00",
      endDate:time,
      endTime:"23:59"
    })
  },
  // 表单验证
  vertifyForm() {
    try {
      let AcName = this.data.AcName.trim()   //活动名称  必填
      let AcHost = this.data.AcHost.trim()   //主办方  必填
      let AcObj = this.data.AcObj.trim()     //活动对象  必填
      let AcAddress = this.data.AcAddress.trim()  //活动地址  必填
      let AcDetail = this.data.detail.trim();   //活动详情  必填

      let AcViceHost = this.data.AcViceHost.trim()  //承办方
      let AcNum = this.data.AcNum || "infinite";  //人数
      let clockInLocation = this.data.clockInLocation;  //打卡地点
      let AcScoreType = '';   //活动类型   
      let AcScoreNum = this.data.score;  //学分分值

      if (AcName == '') {
        showToast({ title: '活动名称不能为空！' })
        return 'no';
      }
      if (AcHost == '') {
        showToast({ title: '主办单位不能为空！' })
        return 'no';
      }
      if (AcObj == "") {
        showToast({ title: "活动对象不能为空！" })
        return 'no';
      }

      // showToast({title:AcNum})

      // 1. 验证时间设置
      let strtime1 = this.data.startDate + ' ' + this.data.startTime
      let strtime2 = this.data.endDate + ' ' + this.data.endTime
      let AcStartTime = new Date(strtime1).getTime()
      let AcEndTime = new Date(strtime2).getTime()

      let nowTime = new Date().getTime()
      if (AcStartTime - nowTime < 120000) {
        showToast({ title: "离活动开始时间不足2分钟！" })
        return 'no';
      }
      // 1.2 验证活动间隔是否大于2分钟
      if (AcEndTime - AcStartTime < 120000) {
        showToast({ title: "活动时间间隔不足2分钟！" })
        return 'no';
      }

      // 如果是线下活动，打卡地点不能为空
      if (this.data.activityTypeSwitchChecked) {
        if (JSON.stringify(clockInLocation) == '{}') {
          showToast({ title: "打卡地点不能为空！" })
          return 'no';
        }
      }

      if (AcAddress == '') {
        showToast({ title: "活动地点不能为空！" })
        return 'no';
      }

      // 学分种类
      let index = this.data.scoreIndex
      if (index !== -1) {
        AcScoreType = this.data.scoreTypeArray[index]
      }
      // 如果选择了学分种类，那么学分分值就不能为空
      if (AcScoreType !== '') {
        if (AcScoreNum == '') {
          showToast({ title: "学分分值不能为空！" })
          return 'no';
        }
      }

      if (AcDetail == "") {
        showToast({ title: "活动详情不能为空！" })
        return 'no';
      }

      let activityObj = {
        AcName,
        AcHost,
        AcViceHost,
        AcObj,
        AcNum,
        AcStartTime,
        AcEndTime,
        AcAddress,
        clockInLocation,
        AcScoreType,
        AcScoreNum,
        AcDetail,
      }
      return activityObj;
    } catch (e) {
      console.log(e)
    }
  },

  // 文本输入框的值
  timer: -1,
  getTextAreaValue(e) {
    //采用防抖处理
    clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      console.log("文本框", e.detail)
      let detail = e.detail.value;
      // let textareaValue = e.detail.value;
      // // 回车会被\s匹配的，先将字符串中的回车换成<br>
      // detail = detail.replace(/\n/g, '<br>')
      // // 再将字符串所有空格转为&nbsp;
      // detail = detail.replace(/\s/g, '&nbsp;')
      // // // 渲染页面是将<br>换成\n
      // detail = detail.replace(/<br>/g,'\n')
      // console.log("处理后的值", detail)
      this.setData({
        detail
      })
    }, 600)

  },
  // 选择学分种类
  chooseScoreType(e) {
    console.log("学分种类", e.detail.value)
    let scoreIndex = e.detail.value;
    this.setData({
      scoreIndex
    })
  },
  // 选择打卡位置
  async chooseLocation() {
    try {
      // 1. 判断是否授权
      let res = await authorize("scope.userLocation")
      // 2. 如果授权不是false则拉起请求
      if (res !== false) {
        let location = await authorizeByType("chooseLocation")
        console.log("选择的位置是：", location)
        let clockInLocation = {
          location: location.name || location.address,
          latitude: location.latitude,
          longitude: location.longitude
        }
        this.setData({
          clockInLocation
        })
      }

    } catch (err) {
      console.log(err)
    }
  },
  // 选择开始时间  年月日
  chooseStartDate(e) {
    console.log('开始时间 年月日', e.detail.value)
    this.setData({
      startDate: e.detail.value,
      endDateStart: e.detail.value
    })
  },
  // 选择开始时间  时-分
  chooseStartTime(e) {
    console.log('开始时间 时-分', e.detail.value)
    this.setData({
      startTime: e.detail.value,
      endTimeStart: e.detail.value
    })
  },
  // 结束时间  年月日
  chooseEndDate(e) {
    console.log('结束时间 年月日', e.detail.value)
    this.setData({
      endDate: e.detail.value
    })
  },
  // 选择结束时间  时-分
  chooseEndTime(e) {
    console.log('结束时间 时-分', e.detail.value)
    this.setData({
      endTime: e.detail.value
    })
  },
  // 页面隐藏时保存编辑中的表单
  onUnload() {
    // 将页面填写的信息保存到缓存中
    let activityEditTemp = this.data;
    wx.setStorage({
      data: activityEditTemp,
      key: 'activityEditTemp',
    })
  }
})