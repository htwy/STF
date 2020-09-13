const db = wx.cloud.database();
/**
 * 用户授权
 * parmas  权限种类
 */
const authorize = (type) => {
  return new Promise((resolve, reject) => {
    // 1. 获取 权限状态
    wx.getSetting().then(res => {
      // 2. 判断 权限状态
      // console.log(res.authSetting)
      if (res.authSetting[type] === false) {
        wx.showModal({
          title: '提示',
          content: '小程序需要获取您的权限！',
          showCancel: true,
          success(res) {
            if (res.confirm) {
              // 3. 打开用户设置
              wx.openSetting({
                success: (result) => {
                  resolve(result.authSetting[type]);
                },
                fail: (err) => {
                  reject(err);
                }
              });
            }
          }
        })
      } else {
        resolve(res.authSetting[type]);
      }
    }).catch(err => {
      reject(err)
    })
  })
}
/**
 * 根据类型做不同功能请求
 * params  type
 */
const authorizeByType = (type) => {
  return new Promise((resolve, reject) => {
    if (type == "scope.address") {
      wx.chooseAddress({
        success: (result) => {
          resolve(result);
        },
        fail: (err) => {
          reject(err);
        }
      });
    } else if (type == "chooseLocation") {
      wx.chooseLocation({
        success(res) {
          resolve(res)
        },
        fail(err) {
          reject(err)
        }
      })
    } else if (type == "getLocation") {
      wx.getLocation({
        isHighAccuracy: true,
        success(res) {
          resolve(res)
        },
        fail(err) {
          reject(err)
        }
      })
    }
  })
}
/**
 * showToast 封装 promise
 */
const showToast = ({ title, icon }) => {
  let iconImage = icon || 'none'
  return new Promise((resolve, reject) => {
    wx.showToast({
      title: title,
      icon: iconImage,
      success: (res) => {
        resolve(res);
      },
      fail: (err) => {
        reject(err);
      }
    })
  })
}
const showModal = ({title,content,showCancel}) => {
  let titleValue = title || '提示'
  let cancel = false;
  if(showCancel == 'yes'){
    cancel = true
  }
  return new Promise((resolve, reject) => {
    wx.showModal({
      title:titleValue,
      content,
      showCancel:cancel,
      success (res) {
        if (res.confirm) {
          resolve(1)
        } else if (res.cancel) {
          resolve(0)
        }
      },
      fail(err){
        reject(err)
      }
    })
  })
}

/**
 * 调用云函数
 */
const cloudFunction = ({ name, data }) => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success(res) {
        if (res.result.openId) {
          // 这个用于返回openid
          resolve(res.result.openId)
        } else {
          // 其他的用于返回结果
          resolve(res.result)
        }

      },
      fail(err) {
        reject(err)
      }
    })
  })
}
/**
 * 数据库操作——添加（添加操作无需使用云函数）
 */
const addDatabase = ({ collection, data }) => {
  return new Promise((resolve, reject) => {
    db.collection(collection).add({
      data
    }).then(res => {
      resolve(res)
    }).catch(err => {
      reject(err)
    })
  })
}

/**
 * 
 * 普通更新数据库
 */

const updateDatabase = ({ collection, myWhere,myData }) => {
  return new Promise((resolve, reject) => {
    db.collection(collection)
    .where({
      ...myWhere
    })
    .update({
      data:{
        ...myData
      }
    }).then(res => {
      resolve(res)
    }).catch(err => {
      reject(err)
    })
  })
}
/**
 * 用云文件 ID 换取真实链接
 * @param {*} fileList   需要传一个数组
 */
const getTempFileURL = (fileList)=>{
  return new Promise((resolve, reject) => {
    wx.cloud.getTempFileURL({
      fileList,
      success: res => {
        // get temp file URL
        resolve(res.fileList)
      },
      fail: err => {
        reject(err)
      }
    })
  })
  
}
/**
 * 下载云存储图片，保存到手机相册
 *
 */
const saveCloudImg = (fileID)=>{
  return new Promise((resolve,reject)=>{
    wx.cloud.downloadFile({
      fileID,
    }).then(res => {
      wx.saveImageToPhotosAlbum({
        filePath:res.tempFilePath,
        success(res){
          resolve(res)
        },
        fail(err){
          reject(err)
        }
      })
    }).catch(err=> {
      reject(err)
    })
  })
}

module.exports = {
  showToast,
  authorize,
  authorizeByType,
  cloudFunction,
  addDatabase,
  updateDatabase,
  showModal,
  getTempFileURL,
  saveCloudImg
}