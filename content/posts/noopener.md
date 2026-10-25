---
title: 关于opener的问题
date: 2017-9-25 09:20:07
tags: [前端技术]
---

在某次翻阅技术博客的时候，偶然发现有opener这个东西。了解了一下，opener这个东西会带来一个很严重的问题。但是平时好像很少会谈及opener。所以觉得有必要记下来。

事情是这样的。

当在一个页面里新页面打开另一个页面时

```html
// a.html
<a href="b.html" target="_blank">baidu</a>
```

在新页面`b.html`中可以通过修改`window.opener.location = newUrl`来改变`a.html`的访问路径。

```html
// b.html
<script>
window.opener.location = 'http://baidu.com'
</script>
```

a.html的页面会被修改为百度首页。这很神奇。

[这里有个demo](http://keenwon.com/demo/201603/noopener.html)

打开一个新页面后再回头来看原来的页面，已经找不到了？是不是很懵逼，但是事实上确实可以做到。

如果新页面是一个恶意页面，打开后回头修改原页面到一个仿照的钓鱼页面，普通用户是很难察觉到的。

所以要防止这种恶意跳转很重要。

解决办法是在`所有新页面跳转的地方清除掉opener`

```html
<a href="http://baidu.com" ref="noopener">
```

或者

``` javascript
var otherWindow = window.open('http://baidu.com');
    otherWindow.opener = null;
```

用JavaScript来控制跳转的话就能做很多东西。

* `window.open`方法打开一个新页面，并返回新页面的`window对象`（部分属性），可以对新页面进行操作。
* 两个页面会共享进程，在其中一个页面alert，另一个页面也会阻塞。

总结来说，父页面可以通过`window.open`方法返回的对象来控制子页面，子页面可以通过`window.opener`来控制父页面。

反正为了安全，新开的页面`清除掉opener`就对了。至于两个页面会共享进程，阻塞彼此，暂时没好办法。

另外，在老的浏览器中，可以使用 `rel=noreferrer` 禁用HTTP头部的Referer属性（未验证）


以下更新于2018年11月21日 23:03:42
# opener的好处

opener也不是一无是处，最近的工作中突然发现了opener才能实现的需求。

首先需求是：
1. 在当前的业务打开第三方页面，然后与第三方页面进行一些数据交互
2. 要求当前页面不会被销毁
2. 然后又不想用iframe。

就可以用window.open新开一个第三方页面，再利用postMessage来在两个页面之间进行数据交互就ok了。

```javascript
// index.html
var btn = document.getElementById('button');
var a;
// 弹出新弹窗需要用户手动触发
btn.addEventListener('click', function() {
    a = window.open('http://127.0.0.1:3000/local/frame.html')
    setInterval(() => {
		// 每两秒给子页面抛出一个信息
        a.postMessage('message from index.html', '*');
    }, 2000)
})

// 监听来自子页面的信息
window.addEventListener('message', function(e) {
    console.log('message')
}, false);
```

然后子页面这样写

```javascript
// 接收父页面的信息
window.addEventListener('message', function(e) {
	console.log('message from index', e)
})

// 向父页面抛出信息
setInterval(() => {
	window.opener.postMessage('message from iframe', '*')
}, 2000)
```

但是要注意的是。监听数据只有监听`message`一个事件，所以如果有多个opener，则可能需要手动来区分到底是哪个子页面传来的信息。

