import asyncWx from "../../utils/asyncWx.js"
let id = '';  //活动id
let openid = '';  //用户id

const db = wx.cloud.database()
const _ = db.command;

Page({
    data: {
        tipContent: "", //提示内容
        activityObj: {},  //活动对象
        isVisibleBtn: true,   //报名按钮是否可见
        participateBtnState: '马上报名',  //报名按钮的状态——按钮上的文字
    },
    onLoad: function (options) {
        let tipContent = '';
        let activityObj = {};
        let isVisibleBtn = true;
        let participateBtnState = "马上报名";

        var from = options.from;
        console.log("from", from)
        if (from == "preview") { //说明是预览活动
            //从缓存activityObjTemp中拿出数据，填充页面
            activityObj = wx.getStorageSync('activityObjTemp')
            isVisibleBtn = false
            console.log("预览进来的，按钮隐藏")
        } else if (from == 'index') { //说明活动从首页进入
            // 获取活动id
            id = options.AcId;
            console.log("活动id", id)
            // 从缓存liveActivities中获取活动信息
            let liveActivities = wx.getStorageSync('liveActivities')
            liveActivities.forEach((v) => {
                if (v._id == id) {
                    activityObj = v.activityObj
                    activityObj.rest = v.rest
                    return;
                }
            })
            console.log("首页进来的，当前活动对象", activityObj)
            // 从首页进来需要判断报名状态
            // 获取缓存userJoinActivities，判断用户是否报名，是否完成，是否失效
            let userJoin = wx.getStorageSync('userJoin') || {}
            let userJoinActivities = userJoin.userJoinActivities || {}
            if (JSON.stringify(userJoinActivities) !== "{}") {
                for (var key in userJoinActivities) {
                    if(key == id){
                        switch (userJoinActivities[key]) {
                            case "doing":
                                participateBtnState = "已报名"
                                break;
                            case "finished":
                                participateBtnState = "已完成"
                                break;
                            default:
                                participateBtnState = "已失效"
                                break;
                        }
                        break;
                    }
                }
            }
            console.log("按钮状态是：", this.data.participateBtnState)

        } else if (from == "check") { //从查看活动 check中进来
            let userJoin = wx.getStorageSync('userJoin') || {}
            let userJoinActivities = userJoin.userJoinActivitiesDetail || {doing:[],finished:[],fail:[]}
            let { type, index } = options
            participateBtnState = type
            if (type == "进行中") {
                type = "doing"
            } else if (type == "已完成") {
                type = "finished"
            } else {
                type = "fail"
            }
            index = userJoinActivities[type].length - 1 - index
            activityObj = userJoinActivities[type][index].activityObj
            activityObj.rest = userJoinActivities[type][index].rest
        }else if(from == "admin"){  //查看活动 从管理页面进来
            let userHost = wx.getStorageSync('userHost') || {}
            let userHostActivities = userHost.userHostActivitiesDetail || {doing:[],finished:[]}
            let { type, index } = options
            participateBtnState = type
            if (type == "进行中") {
                type = "doing"
            } else if (type == "已完成") {
                type = "finished"
            }
            index = userHostActivities[type].length - 1 - index
            activityObj = userHostActivities[type][index].activityObj
            activityObj.rest = userHostActivities[type][index].rest
        }
        // 判断 线上线下 学分有无  设置页面
        if (activityObj.AcAddress == "线上") {
            if (activityObj.AcScoreNum == "") {  //线上 无学分
                tipContent = "此活动为通知，无需报名，谢谢！",
                    isVisibleBtn = false  //还要隐藏报名按钮
            } else {
                tipContent = "该活动仅用于报名，系统将不统计本次活动学分，学分由活动发布方判定，谢谢！"
            }
        } else {
            if (activityObj.AcScoreNum == "") {  //线下 无学分
                tipContent = "该活动未设置学分，仅用于统计报名人员名单，谢谢！"
            } else {
                tipContent = "报名成功后，请在规定时间和地点内扫码签到、签退，否则参与无效，谢谢！"
            }
        }
        // 这里统一设置this.data
        this.setData({
            tipContent,
            activityObj,
            isVisibleBtn,
            participateBtnState,
        })

    },

    // 防抖所用
    canClick: true,
    //报名活动
    async participate() {
        openid = wx.getStorageSync('openid')
        if (this.canClick) {
            this.canClick = false;
            wx.showLoading({
                title: '请求中...',
                mask: true
            })
            // console.log(id)
            // 1. 查询数据库，活动是否过期
            let nowTime = await asyncWx.cloudFunction({
                name: "getNetworkTime"
            })
            console.log("当前时间", nowTime)
            // 剩余人数为infinite或者大于0 并且 活动开始时间大于网络当前时间
            let res = await db.collection("STF_Activities").where({
                _id: id,
                rest: _.eq("infinite").or(_.gt(0)),
                activityObj: {
                    AcStartTime: _.gt(parseInt(nowTime))
                }
            }).get()
            console.log("该活动状态是否还存在", res.data)

            // 进行判断
            if (res.data.length > 0) { //说明查到了，活动能报名
                // 1. 更新活动表
                // 判断人数是不是无限制的
                if (this.data.activityObj.AcNum !== "infinite") {
                    // 不是无限,则 人数减一，否则STF_Activities表啥也不做
                    //  1. 更新数据库STF_Activities.rest剩余人数-1（这里改别人创的数据，用到云函数）
                    let updateRes = await asyncWx.cloudFunction({
                        name: "databaseOperate",
                        data: {
                            type: "updateField1Inc1",
                            collection: "STF_Activities",
                            myWhere: {
                                _id: id
                            },
                            field: "rest",
                            value: -1
                        }
                    })
                    console.log("活动人数减一", updateRes)


                } 
                // 2 更新活动报名表STF_Participate中字段participateUsers.openid
                
                let updateRes2 = await asyncWx.cloudFunction({
                    name: "databaseOperate",
                    data: {
                        type: "updateAttribute1",
                        collection: "STF_Participate",
                        myWhere: {
                            AcId: id,
                        },
                        field:"participateUsers",
                        attribute:openid,
                        attributeValue:"doing"
                    }
                })
                console.log("活动报名表，报名成功", updateRes2)

                // 3.更新用户表，userJoinActivities 字段
                if(this.data.activityObj.AcAddress=="线上"){
                    var state = "finished"
                }else{
                    var state = "doing"
                }
                let updateRes3 = await asyncWx.cloudFunction({
                    name: "databaseOperate",
                    data: {
                        type: "updateAttribute1",
                        collection: "STF_Users",
                        myWhere: {
                            _openid: openid
                        },
                        field:"userJoinActivities",
                        attribute:id,
                        attributeValue:state                      
                    }
                })
                console.log("更新用户表userJoinActivities",updateRes3)

                // 4. 更新页面btn
                this.setData({
                    participateBtnState: "已报名"
                })
                wx.hideLoading({
                    success: (res) => { },
                })
                asyncWx.showToast({ title: "报名成功" })
                this.canClick = true;
            } else {
                wx.hideLoading({
                    success: (res) => { },
                })
                let res = await asyncWx.showModal({ content: "活动活动已开始或报名人数已满！" })
                console.log(res)
                if (res) {
                    // 确定后退出当前页面
                    wx.navigateBack({
                        delta: 0,
                    })
                    return;
                }
            }

        }

    }
})