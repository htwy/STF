//app.js

App({
  onLaunch:function(){ 
		wx.cloud.init({  //配置云开发环境
			env: "htwy02-xuz5q",    
			traceUser:true   //会将用户访问记录到用户管理中，在云开发控制台的运营分析—用户访问里可以看到访问记录。
    })
    
  },
  onShow(){
    // 为每个页面添加转发功能
    // wx.onAppRoute(res=>{
    //   let pages = getCurrentPages();
    //   let view = pages[pages.length-1];
    //   //console.log(pages,view)
    //   wx.showShareMenu({
    //     withShareTicket: true,
    //     menus: ['shareAppMessage', 'shareTimeline']
    //   });
    //   view.onShareAppMessage = function(){
    //     return {
    //       title:'素拓百分百·小程序',
    //       path:view.route
    //     }
    //   }
    // })
  },
  
})
