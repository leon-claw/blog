---
title: 性能优化之Lighthouse
date: 2021-05-21 18:04:21
tags: [优化,前端]
---

最近我的业务一大方向是优化，加之性优化可能是前端进阶一个重要过程。所以最近看了看性能优化相关的东西。第一个先说说Chrome devtools的Lighthouse

# 正文

## 如何使用

Lighthouse是Google开源的一个前端项目“体检”工具。一共有四种运行方法，此处只说最简单的在浏览器的devtools里运行。

1. 用`无痕浏览器`打开要体检的项目的具体页面
2. F12，切换到LightHouse选项卡（需要Chrome 52以上版本才有）
3. 根据情况，勾选右侧选项（去掉PWA)
4. 点击“Genarate report"等待结果即可

“体检报告”分为（性能）Performance、（可访问）Accessibility、（最佳实践）Best Practices、SEO、Progressive Web App五个维度打分，因为我测试的页面没有启用PWA，所以关注前四项即可。

![几个维度总分](https://my-bucket-hexo-1258538316.cos.ap-guangzhou.myqcloud.com/typora/202105/30/163142-938623.png)

## Performance的六个指标

![image-20210530163213127](https://my-bucket-hexo-1258538316.cos.ap-guangzhou.myqcloud.com/typora/202105/30/163213-901084.png)

Google 通过相当深入的研究，总结出以下六项指标，能够比较好的反应出网站的性能好坏。这个维度一般测量的是网页从按下回车到完整渲染出来的时间的评分，会受到很多因素影响，比如机器性能、网络速度，服务器距离、网页内容等等，所以一般很难拿到满分

### FCP(Fisrt Contentful Paint)

这个指标用于记录页面首次绘制文本、图片、非空白 Canvas 或 SVG 的时间。

个人理解此时间包含DNS查询、建立HTTP连接、并且返回html、解析script标签，请求完成所有js文件，触发了DOMContentLoaded事件后。开始渲染页面时，且绘制了第一个可视内容时的时间点。

所以主要优化点是，网络的请求速度、服务器响应速度、资源（js、css）等。


![image-20210530163229479](https://my-bucket-hexo-1258538316.cos.ap-guangzhou.myqcloud.com/typora/202105/30/163231-210366.png)


### Speed Index

官网说，会通过间断截图，视图上判断，页面展示需要的时间。说实话不太理解

### LCP(Largest Contentful Paint)

最大内容绘制。这个“最大内容”可能会根据页面的渲染而不断的改变，用于测试页面主要内容渲染需要花费的时间。这个最大内容应该会根据渲染完成后，最大内容渲染出来的时间。该时间应该也是从发起请求开始。

### TTI(Time to Interactive)

可交互时间。是从发起请求开始，到页面可以提供用户交互的时间。这个时间有几个特点：位于FCP之后、大部分可见内容的事件回调已经绑定并且5秒内无长任务(大于50ms)的执行。

其实这个指标和FCP一样都很重要，FCP可能意味着我们的页面开始渲染，即使渲染出页面不代表可以交互了，很多的时候我们的页面渲染出来了，但是会比较的卡顿。

这个优化点，除了FCP以外，对js初始化不能拖延太久。

### TBT(Total Blocking Time)

总共阻塞时间。指的是FCP到TTI之间，总共被阻塞的时间。js是单线程执行，所有任务都是在宏任务中执行。如果代码执行太久，就会造成页面卡顿。这里Google把单次task执行超过50ms就算是“超时”，就会造成“阻塞”，TBT指标指的就是FCP到TTI之间，所有task执行时间超出50ms的时间的总和。

对于优化这个点，感觉略微无能为力。能做的一般是初始化时不要做太大量的操作。如一个页面即用到echarts、又用到地图控件，可以先同步初始化地图，另起一宏任务异步初始化echarts。因为一般地图初始化比较费时，需要先操作。echarts运算量大，且有动画过度。可以放到另外一宏任务执行。中间给浏览器喘息的机会。

### CLS (Cumulative Layout Shift)

表示页面累计偏移，指的是，页面加载过程中，不断的有内容渲染到页面，比较靠后的元素会被后渲染的靠前的元素顶下去，可能会造成用户点击偏移的问题。

CLS会在performance工具栏的Frame类用红色的色块标记。

这个更多是交互上的优化。

要解决这个问题，最好的办法是，弄个骨架屏。


### 更详细的数据

点击View Original Trace按钮，可以跳到Performance工具上。可以从`发送第一个请求`开始，到Lighthouse采集完毕的详细的数据。具体到另一篇写





## Accessibility

与访问优化相关。主要是代码规范问题，比如说，图片没有加alt、title属性、iframe没有加title属性等。主要是考虑特殊人群特殊访问遇到的问题。

无聊测了一圈国内外大厂的首页访问度评分。一般国外网站做得比国内的要好。但是很以外的是，竟然是腾讯网首页拿下了最高分96分！！！！！京东、淘宝页面比较复杂。可以理解。百度首页就。。。

|  厂   |  评分   |
| --- | --- |
|Google | 89 |
|youtube | 93 |
|Github | 93 |
|twitter | 73 |
|facebook | 86 |
|Apple | 89 |
|baidu | 46 |
|qq.com | **96** |
|taobao.com | 68 |
|jd.com | 66 |
|toutiao.com | 78 |
|bj.meituan.com | 43 |
|weixin.qq.com | 66 |


## Best Practies & SEO

前端最应该注意的点。Lighthouse划分了非常多的点让前端可以一个一个的去优化。这种情况下，应该尽量满分通过才对。

具体没什么好说。学好英文一个一个解决就好了。

# 链接

[掘金-H5页面性能分析神器——lighthouse](https://juejin.cn/post/6964280062264279070)

