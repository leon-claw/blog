---
title: 美宜佳BDuck项目总结
date: 2018-06-23 09:20:07
tags: [总结]
---

# 项目概况
 一个帮美宜佳开发的世界杯、BDuck主题的H5游戏。目的是派发玩游戏派发奖品吸引用户。项目的特点是。
	

 - 大
 - 抽奖逻辑复杂
 - 独立部署、用jwt验证身份
 - 总之一切能想到，能加上的东西都加上了。

# 成就

 1. 首次用jwt进行身份验证，利用axios的拦截器进行安全校验。并且可以利用axios.create()新建一个实例来取消axios拦截器的拦截
 2. 后端设置X-Time来防止用户在开发者里replay XHR
 3. 利用路由来实现，每次刷新从loading页进入。但是容易出现bug。（App.vue里watch $route）
 4. 利用http://map.qq.com/api/js 和微信jssdk来获取定位。
 5. eslint规范代码
 6. import的东西也可以用require().default拿到。并且，import的内容不一定可以用ES6的解构来解析出对象内容
 7. html2canvas来制作海报时，dom内容应该直接用px来布局，不应该用rem、vh、vw。后者可能会导致模糊。猜想是非px压缩时如果时非整数倍的情况下无法完整显示。如2px的内容压缩到1.76px来展示。meta标签的view-port initial-scale等于非整数倍时同理
 8. 利用vue的transition组件和路由拦截来控制路由切换时的动画。要判断进来和退出的路由来控制页面时滑入还是滑出
 9. getBoundingClientRect很厉害、很有用
 10. 同一个页面有多个二维码时，长按识别二维码功能只会识别第一个（微信）
 11. 字体也可以转base64，避免加载慢导致字体突变的状况
 12. position：absolute的内容也可以在position：relative之下，前提是必须显式声明position：relative
 13. font-size应该用rem或者vw。因为浏览器高度会变。
 14. 渐进式jpg无法在安卓上实现

# 遇到的问题
1. 用户在不同路由刷新时，再从loading页进入。然后自动跳转到刷新前点路由。
	* 需要结合路由拦截、localStorage、一个全局变量来实现，判断全局变量是否ready，如果否，则从localStorage来获取上一个路由。而上一个路由需要路由拦截来实现。

2. X-time实现防刷奖
	* X-time是，每次首次加载游戏时需要调用一个初始化接口。获取到服务器时间。然后每次调用接口，都要根据服务器时间来提交当前时间戳，如果时间戳和服务器相差超过某个值，从而拒绝访问，来达到防止用户在控制台replay XHR刷奖的目的。

3. 路由间切换动画的问题
	* 路由间切换动画需要利用路由拦截来获取进入的路由和离开的路由，然后判断两个路由直接的切换是“进入”还是“退出”来执行不同的动画。然后不同的动画，只需要给vue的transition组件传入不同的`enter-active-class`和`leave-acitve-class`即可

4. 获取地理位置
	* 获取地理位置有微信的wx.getLocation和HTML5的Geolocation。但是IOS限制了Geolocation必须在https下才能正确获取，所以只能放弃。
	* wx.getLocation返回的是经纬度，需要结合http://map.qq.com/api/js 来把经纬度转换成城市和省份
	* wx.getLocation只有success回调，所以是没有办法知道用户取消了位置授权

5. 制作新手引导
	* 查看了intro.js的源码。是基于getBoundingClientRect来实现的
	* getBoundingClientRect可以获取一个dom相对与浏览器窗口的位置。可以通过获取相对位置来把对话框来定位到指定位置
	* position:relative也可以浮现在position:absolute之上。前提是要显式生命position:relative，且z-index较大

# 剩余的问题
1. 反复初始化Phaser时，无论什么设备最后都会灰屏。暂时没有找到彻底清理内存的办法
2. axios拦截器没有很好的处理非200错误。理论来说应该在拦截器处理所有错误。
3. Phaser TileMap没有自定义图片顺序
4. 大量使用base64会导致IOS内存过大，而无法加载游戏


# 总结
 1. export时，应该在底部export default一个对象，该对象包括部分默认应该export的内容。定义内容时应该export const name = ''形式，这样import时可以用ES6的对象解构来获取部分内容