---
title: 性能优化之Performance工具
date: 2021-06-03 10:21:00
tags: [优化,前端]
---

关于性能优化分析最大一块，chrome devtools的performance工具，提供了最大量、最细致的性能数据，且很友好的可视化展示了出来。最近花了不少时间去查阅资料，到底该怎么看这个工具....

*本文用的是chrome 91.0.4472.77版本，如有不一样，可能是工具更新了*

# 正文

performance工具分为这么几个大块

* 设置
* 摘要
* 性能面板
* 性能摘要

整体如下图

![整体概览](https://my-bucket-hexo-1258538316.cos.ap-guangzhou.myqcloud.com/typora/202106/06/184533-491597.png)

# 设置面板

设置面板可以说的有几个：

* 最左侧的小圆点：从当前开始录制性能，手动点击结束截至
* 刷新按钮：点击后，该工具会等待用户刷新页面。然后从前一次刷新到此次刷新页面触发onLoad之后的一段时间
* Memory：显示捕获的内存信息
* Web Vitals：显示页面几个关键点的健康与否
* 垃圾桶按钮：手动触发垃圾回收（GC）
* Network与CPU，手动控制网络与CPU的节流
* Disabled Javascript samples: JS火焰图里隐藏s调用栈

# 摘要

这个不是很重要，是看个大概，有三个信息：

* FPS：帧率，如果低了，页面卡顿，就说明有性能问题
* CPU：CPU大概执行的内容
* NET：哪一段时间执行了网路请求（暂时没看懂，作用也不大）

其中CPU分为5个颜色块：

* <span style="color: rgb(144, 183, 233)">蓝色</span>为HTML
* <span style="color: rgb(243, 209, 124)">黄色</span>为脚本
* <span style="color: rgb(175, 153, 235)">紫色</span>为样式
* <span style="color: rgb(144, 193, 133)">绿色</span>为媒体文件
* <span style="color: rgb(222, 222, 222)">灰色</span>为其他资源

这四个颜色在`性能面板`、`性能摘要`中也有体现。

# 性能面板
非常多内容的一项，下面根据重要性讲解一部分

## Main

CPU的火焰图，横轴是时间，纵轴是函数调用栈。越长说明函数调用时间越长，就越需要关注

### 颜色含义

火焰图也是和摘要一样的，根据颜色分类，但是不一样的是，除了以上5种颜色以外，还多了很多马卡龙色，那些只是普通函数调用栈里随机分配的而已，不要想太多。

### 栈底部的`Task`

可以看到栈底永远都是灰色的`Task`，这是js的宏任务。说明，浏览器所有的执行内容都是在一个一个的宏任务里。

![CPU火焰图](https://my-bucket-hexo-1258538316.cos.ap-guangzhou.myqcloud.com/typora/202106/06/205748-571775.png)

有些Task块右上角会有个鲜红色的小三角，意思是，该宏任务执行时间过长，后半部分红色的斜线覆盖的区域，则是超时的部分。Chrome把执行超过50ms的Task都标记为超时的任务。如果是在`FCP`和`TTI`之间的超时Task时间的总和，是LightHouse体检项目的一个重要的指标：`Total Blocking Time（TBT）`

所以，如果要性能优化，需要关注以下这些超时的Task。

比如，有个页面需要加载很重的地图SDK和echartsSDK，那么初始化放在一个Task内，几乎肯定会超时。要优化，可以用setTimeout等方法，把初始化SDK方法放到另外一个宏任务里。

### 渲染流程

这里要扯以下渲染流程。浏览器每次渲染都是以下的流程：`JavaScript、样式计算、布局、绘制、合成`。这些步骤可能会全部都执行，也可能会掠过某些步骤。假如，一次操作只改变了某个元素的背景颜色，则会跳过`布局`过程，直接进行绘制。（这也就是回流重绘的知识点）

![渲染流程](https://developers.google.com/web/fundamentals/performance/rendering/images/intro/frame-full.jpg)

1. Javascript：JavaScript的一些操作，可能是纯js运算，或者对DOM造成影响的一些操作
2. 样式计算：此过程是根据匹配选择器，计算出哪些元素应用哪些 CSS 规则的过程。从中知道规则之后，将应用规则并计算每个元素的最终样式。
3. 布局：浏览器即可开始计算它要占据的空间大小及其在屏幕的位置。
4. 绘制：绘制是填充像素的过程。它涉及绘出文本、颜色、图像、边框和阴影，基本上包括元素的每个可视部分。绘制一般是在多个表面（通常称为层）上完成的。
5. 合成：由于页面的各部分可能被绘制到多层，由此它们需要按正确顺序绘制到屏幕上，以便正确渲染页面。对于与另一元素重叠的元素来说，这点特别重要，因为一个错误可能使一个元素错误地出现在另一个元素的上层。

所以，每个宏任务，也基本都是由上面所说的”流程“构成的（大多数是不影响dom的js调用。如果js造成dom更新，那就很明显）

![一个造成页面布局的帧](https://my-bucket-hexo-1258538316.cos.ap-guangzhou.myqcloud.com/typora/202106/06/222022-642231.png)

### 一些常见的”色块“

大多数色块，上面标记的名字大概率都能知道是干什么的，但是有些比较特殊或者是还是不理解。记下来，有机会了解以下

* Hit test
* Evaluate Script
* Compile Script




## Timing

包含几个关键的时间点：

* First Paint：触发节点不详
* First Content Paint：触发节点不详
* Largest Content Paint：无法定位，根据实际情况，可能位置不一样
* DomContentLoaded Event：好像此点紧挨在在一长块`Parse HTML`之后
* Onload Event：触发在众多图片资源中加载时间最长一个的后面不远处

*亲测，DOMContentLoaded会等待css加载完毕才会触发。应该是Chrome为了优化，防止页面出现未经css渲染的样式。*

## Network

更详细的网络资源瀑布图。



（貌似自己刷新没用，资源会走缓存。得从LightHouse入口进入才行）

## Frames

貌似和js执行没关系？

## Raster

Raster意思是栅格，rasterize paint，则是栅格化渲染。顾名思义，就是把内容填充像素的过程。

目前看到有两种`块`：Image Decode和Rasterize Paint

点击Image Decode可以看到正在decode的是哪个图片，只会decode页面中看见的图片。所以可以通过这个来 debug，哪些图片消耗渲染资源。

Image Decode只会处理出现在视图中的图片。

## Interactions

## GPU

## Compositor

## 其他

都不知道干啥的，以后知道了再更新吧

* Chrome_ChildOThread
* ThreadPoolForegroundWorker
* ThreadPoolSerivceThread




# 链接

[Chrome Performance 页面性能分析指南-知乎](https://zhuanlan.zhihu.com/p/163474573)

[官方-渲染流程](https://developers.google.com/web/fundamentals/performance/rendering)

https://www.cnblogs.com/xiaohuochai/p/9182710.html



[阮一峰-如何读懂火焰图](http://ruanyifeng.com/blog/2017/09/flame-graph.html)



[Google官方Chrome DevTools文档](https://developer.chrome.com/docs/devtools/evaluate-performance/reference/)
