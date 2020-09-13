// 单数变双数
const singleTodouble = (value) => {
  if (value < 10) {
    return '0' + value
  } else {
    return value
  }
}
// 计算两个经纬度位置的距离
const distance = (la1, lo1, la2, lo2) => {
  let La1 = la1 * Math.PI / 180.0;
  let La2 = la2 * Math.PI / 180.0;
  let La3 = La1 - La2;
  let Lb3 = lo1 * Math.PI / 180.0 - lo2 * Math.PI / 180.0;
  let s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(La3 / 2), 2) + Math.cos(La1) * Math.cos(La2) * Math.pow(Math.sin(Lb3 / 2), 2)));
  s = s * 6378.137;//地球半径6378.137km
  s = Math.round(s * 1000);
  // console.log("计算结果", s)
  return s   //返回距离，单位m
}


module.exports = {
  singleTodouble,
  distance
}