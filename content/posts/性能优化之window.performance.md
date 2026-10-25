---
title: 性能优化之window.performance
date: 2021-5-30 17:11:00
tags: [总结,前端技术,性能优化]
---





# 正文

性能优化的第二个重要的点是window.performance对象。performance对象下包含非常详细的属性和方法，可以利用其分析出很多性能上的问题。下面列举些重要的属性和方法，并且介绍其使用场景。


## performance.memory

MDN标记为已废弃。

之包含三个属性：

* jsHeapSizeLimit：总共堆内存大小
* totalJSHeapSize：总共占用多少堆内存
* usedJSHeapSize：当前占用多少堆内存

一个很重要的使用场景是，用totalHeadSize - usedJSHeapSize的值来查看内存泄漏的大小。

一般情况这个差值不可能为0，所以可以通过console.log加上一阶段的操作，查看差值大小来判断某段操作是否发生了泄漏，从而进行优化。

虽然MDN标记为废弃接口。但是一般用chrome去debug还是可以的

## performance.timing

参数最多的属性。记录了非常多的时间点，可以分析出很多问题。总结如下图：

![preview](https://pic1.zhimg.com/v2-a9f7be2c5aaa973e405bd0b8da7e6890_r.jpg)

再抄一份详情介绍

| 属性 | 含义 |
|-|-|
| navigationStart | 在用一个浏览器上下文中，前一个网页(与当前页面不一定同域)unload的时间戳，如果无前一个网页unload，则与fetchStart值相等 |
| unloadEventStart | 前一个网页（与当前域名同域名）unload的时间戳，如果前一个网页unload或者前一个网页与前一个网页当前页面不同域，则值为0 |
| unloadEventEnd | 与unloadEventStart相对应，返回前一个网页unload事件绑定的回调函数执行完毕时间戳 |
| redirectStart | 第一个HTTP重定向发生的时间。有跳转且是同域名内的重定向才算，否则值为0 |
| redirectEnd | 最后一个HTTP重定向发生的时间。有跳转且是同域名内的重定向才算，否则值为0 |
| fetchStart | 浏览器准备好使用HTTP请求抓取文档的时间，这发生在检查本地缓存之前 |
| domainLookupStart | DNS域名查询开始的时间，如果使用了本地缓存（即无DNS查询）或持久连接，则与fetchStart值相等 |
| domainLookupEnd | DNS域名查询完成的时间，如果使用了本地缓存（即无DNS查询）或持久连接，则与fetchStart值相等 |
| connectStart | HTTP（TCP）开始建立连接时间，如果是持久连接，则与fetchStart值相等，注意如果在传输层发生了错误且重新建立连接，则这里显示的是最新建立的连接开始时间 |
| connectEnd | HTTP（TCP）完成建立连接的时间（完成握手），如果是持久连接，则与fetchStart值相等，注意如果在传输层发生了错误且重新建立连接，则这里显示的是建立的连接完成的时间，注意这里握手结束，包括安全连接建立完成，SOCKES授权通过 |
| secureConnectionStart | HTTPS连接开始的时间，如果不是安全连接，则值为0 |
| requestStart | HTTP请求读取真实文档开始时间（完成建立连接），包括从本地读取缓存，连接错误重连时，这里显示的也是新建立连接的时间 |
| responseStart | HTTP开始接受相应的时间（获取到第一个字节），包括从本地读取缓存 |
| responseEnd | HTTP相应全部接受完成的时间（获取到最后一个字节），包括从本地读取缓存 |
| domLoading | 开始解析渲染DOM树时间，此时Document.readyState变成Loading，并将抛出readyStateChange相关事件 |
| domInteractive | 完成解析DOM树的事件，Domcument.radyState变为interactive，并将抛出readystatechange相关事件。注意只是DOM树解析完成，这时候并没有开始加载网页内的资源 |
| domContentLoadedEventStart | DOM解析完成后，网页内资源加载开始的时间，在DOMContentLoaded事件抛出前发生 |
| domContentLoadedEventEnd | DOM解析完成后，网页内资源加载完成的事件（如JS脚本加载执行完毕） |
| domComplate | DOM树解析完成，且资源也准备就绪的时间，Document.readyState变为complete，并将抛出readystatechange相关事件 |
| loadEventStart | load事件发送给文档，也即load回调函数开始执行的事件 |


## performance.navigation

仅两个属性，很简单，用处少，可能只适用于统计

redirectCount：无符号短整型，表示在到达这个页面之前重定向了多少次

type: 
* 0：直接访问，包括点击链接、书签、表单提交、url直接输入地址
* 1：点击刷新或者Location.reload
* 2：通过历史记录和前进后退访问
* 255：其他值

## performance.eventCounts

目前MDN还把此属性标记为实验室属性。暂不介绍

## performance.timeOrigin

表示开始统计时的高精度事件

## performance.getEntry()

返回一个数组，包含所有页面存储的一些特定的记录：PerformanceMark、PerformanceMesure、PerformanceFrameTiming、PerformanceNavigationTiming、PerformanceResourceTiming

### PerformanceResourceTiming

最有用的类型。包含所有此页面发起的请求。包括xhr、script标签、img标签等

包含一以下重要的属性

| 名            | 说明                                                         |
| ------------- | ------------------------------------------------------------ |
| startTime     | 获取资源开始时间                                             |
| duration      | responseEnd和startTime的差异，是资源请求时长                 |
| transferSize  | 表示获取资源的大小，包括响应头字段和响应payload body的大小   |
| initiatorType | 请求资源的类型，如：script、link、img、xmlhttprequest、fetch等 |
| name          | 请求资源名                                                   |



###  PerformanceMark

标记值，由调用performance.mark()创建

### PerformanceMesure

标记值，由调用performance.mesure()创建

### PerformanceFrameTiming

未知

### PerformanceNavigationTiming

未知

## Performance.now()

表示从测量开始时经过的毫秒数，相对于console.time和console.timeEnd。这个还可以编程

## 其他

其他看文档吧：[MDN-Performance](https://developer.mozilla.org/zh-CN/docs/Web/API/Performance)

