---
title: 重温js 高设总结的经验
date: 2018-08-21 09:20:07
tags: [总结]
---

未完成，也不更新了。半成品。仅作为笔（cao）记（gao）

# Global对象下有用的方法、参数

## 原生已经实现了Base64的转换
	// base64 =》文本
	window.atob()
	// 文本 =》base64
	window.btoa()
	
*中文转base64会报错，可以先encodeURIComponent中文，再去btoa*

## Math

Math自带了max和min。就不需要所谓的求最大值、最小值

	Math.max(3, 45, 32, 16)
	
	// ES6中快速求数组中最大值的方法
	Math.max(...[3, 45, 32, 16])

## Date

Date的格式化基于`Date.parse`和`Date.UTC`

`Date.parse`传入的参数是常见的`YYYY/MM/DD hh:mm:ss`格式，而`Date.UTC`是分别传入年、月、日、时、分、秒

	new Date('YYYY/MM/DD hh:mm:ss')	//不用Date.parse是这种写法自动调用Date.parse
	
	new Date(Date.UTC(2018, 0, 1, 12, 12, 21))

第二种写法应该很有用

# 关于对象

# 关于数组

## 数组的sort方法不能直接干sort

正确的排序方法是

	var a = [1, 5, 20, 15, 500]
	// 从小到大
	a.sort(function(after, pre){
		// 要注意的是，return的值需要的是数字：正、副、或者0。而不是true、false
		return after - pre
	})
	
* sort会改变原数组
	
如果不加回调函数，排序是按字符串去排序的，即使数组中每一项都是Number类型

# 关于Ajax

# 关于字符串

## trim方法原生已经实现

	var s = ' fs '
	
	s.trim()  // 'fs’
	
还有trimStart、trimEnd、trimLeft、trimRight

## 字符串常用方法

* concat：一般用`+`来连接字符串
* subStr：切割字符串 subStr(start, stop)
* subString：切割字符串 subString(start, end) ，**end>start可以智能调换**
* slice：切割字符串 slice(start, end)，**end为负数，则从后面计算**
* search：类似indexOf，但是查询条件可以是正则，所以性能比indexOf差

# 关于 DOM

## createElement、createDocumentFrame



## 其他可能有用的api

* cloneNode
	如果直接getElementBy\*\*\*，然后在插入某个地方，原来的地方会被移除。因为html标签的插入式引用的方式。要复制的话，要用cloneNode。

* replaceChild：替换
* insertBefore: 插入不再仅限于jq的after、before、append、prepend

# 理解Document和Element

Document是整个HTML文档，或者整个XML，对应的是window.document；nodeType为9

ELement是包括\<html\>标签以内的所有标签；nodeType为1


# callee caller

callee指向当前执行的函数
caller指向当前函数执行的函数环境

他们的共同点除了名字像，就是他们都是`指向函数`。没其他了

emmmm

## callee

callee常用于递归，是arguments对象默认存在的方法
```javascript
function factorial(x) {
	return x<=1 ? 1 : x * arguments.callee(x-1);
}
```

## caller

caller是指向当前函数执行的环境的函数

```javascript
function b() {
	console.log(b.caller)		// 指向的是函数a
}
function a() {
	b()
}
```
倒是和this很像。

this指向执行环境的对象，caller指向的是执行环境的函数

如果执行环境不是函数。caller为null

## callee和caller的很不同

callee在arguments对象下，caller在argument.callee下。。。。

arguments.callee是自己。自己.caller是爸爸