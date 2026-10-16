---
title: 《深入浅出Nodejs》读书笔记
date: 2021-07-13 00:06:00
tags: [总结,Nodejs,读后感]
---

为了系统的学习Node，三思之后买了本《深入浅出Nodejs》，由国内Nodejs布道者”朴灵“大神编写。 虽然本书是13年编写，距离现在已经有8年之久，但是阅读下来，发现还是相当有启发（可能之前对Node了解确实太少了）。

看了本书，不仅对Node能有个比较全面、深刻的了解，甚至还补充了前端的一些知识：如V8内存、TCP、UDP协议等。很有收获

# 正文

## 第一章： Nodejs简介

Nodejs由2009年3月诞生于Ryan Dahl之手。起初目的是为了开发一个高性能的web服务器。Ryan Dahl在众多语言中选中JavaScript有其中几点原因：

1. 在浏览器大战中脱颖而出的V8，给JavaScript带来了足够的性能
2. Javascript非常适合Ryan Dahl在寻求的事件驱动、非阻塞I/O
3. JavaScript在服务器环境历史几乎为0，没有历史包袱。

### node的跨平台

起初，Nodejs是只支持\*nux环境，但后来微软看到了Node的潜力，组建了个团队，让Node兼容windows平台。

随着Node的发展。Nodejs底层使用`libuv`来实现跨平台的兼容。所以当面试问道Node事件循环时，离不开`libuv`的原因。

## 第二章：模块机制

看完这一篇，终于彻底的理解了commonJS、AMD、CMD的规范了。

服务端开发，是离不开模块化的。而Javascript则没有模块化的概念。于是社区总结出一套commonJS规范

commonJS概念大概是：

1. 每个js文件都是一个模块
2. 每个模块会有module、export、require对象
3. 每个模块相互独立
4. 加载过后的模块Node会进行缓存。

等等。

### commonJS与AMD、CMD

commonJS是跟随Nodejs，是最早出来的。在CommonJS使得JavaScript在服务器端获得模块化功能后。前端也开始摩拳擦掌的设计前端JavaScript模块化。于是诞生了AMD，CMD。

更具体的可以看[之前写的文章](https://jianghong.site/2019/04/30/%E5%89%8D%E7%AB%AF%E6%A8%A1%E5%9D%97%E5%8C%96%E5%8A%A0%E8%BD%BD/)，不再赘述

### modules、exports、require从哪来的

modules、exports、require并不是什么的关键词，而是在运行编译模块的过程中，Node对获取的Javascript文件内容进行了如下头尾包装。

```javascript
(function(exports, require, module, __filename, __dirname){
	// code here
});
```

这样对每个模块进行了隔离，并且注入了三个方法以及两个变量。

### 模块加载顺序

对于路径的查找顺序是：

* 核心模块，如http、fs、path等
* . 或 .. 开始的相对路径文件模块
* 以/开始的绝对路径文件模块
* 非路径形式的文件模块，如自定义的express模块

自定义模块则默认从当前node_modules查找，找不到则到上层目录查找，一直查找到跟目录的node_modlues。查找路径可由`console.log(module.paths)`看到

对于文件扩展名顺序是: .js、.json、.node依次补足扩展名尝试加载

如果再找不到，则会在当前目录下以以下顺序再查找：

* 查找package.json里的main属性
* index文件，也是以index.js、index.json、index.node顺序查找

如果自定义模块也找不到，则会报错

node查找模块也会消耗性能。`所以了解加载顺序，尽量减少node查找路径。提升性能。`

## 第三章：异步I/O

Node异步的实现，不是操作系统的异步IO、是利用线程实现的虚假异步IO

此处说得比较底层，总的来说，操作系统层面并没有很好的异步I/O实现，Node实际是用多线程来模拟实现异步I/O。Node提供的libuv作为抽象封装层，使得兼容所有平台

### 非I/O的异步API

除了I/O是异步的以外，Node还有四个异步API：`setTimeout()`、`setInterval()`、`setImmediate()`、`process.nextTick()`

#### 定时器setTimeout与setInterval

两个是一样的，分别是单次和多次运行。调用setTimeout与setInterval创建的定时器会被插入到定时器观察者内部的一个`红黑树`中，每次Tick执行时，会从该红黑树中迭代取出定时器对象，检查是否超过定时时间，如果超过，就形成一个时间，它的回调函数将立即执行。

#### process.nextTick

调用process.nextTick方法，只会将回调函数放入队列中，在下一轮Tick时取出执行。定时器中采用红黑树的操作时间复杂度为O(lg(n))，nextTick的时间复杂度为O(1)。相较之下，process.nextTick()更高效。

如果有遇到下一帧立即执行，应该用process.nextTick()代替setTimeout(() => {}, 0)。

#### setImmediate

setImmediate与process.nextTick表现十分相似。是在Node v0.9.1之后添加的。他们直接的区别在于执行时机上：`process.nextTick会比setImmediate快`。

原因在于时间循环对观察者的检查是有先后顺序的：idle观察者 => I/O观察者 => check观察者

process.nextTick属于idle观察者，setImmediate属于check观察者。

在具体实现上，process.nextTick的回调函数保存在一个数组中，setImmediate的结果保存在链表中。在行为上，process.nextTick在每轮循环中将数组中的回调函数全部执行完，而setImmediate在每轮循环中执行链表中的一个回调函数。

**亲测，node10.24.1运行的结果与书本给的不一致**

[最新的官方事件循环文档](https://nodejs.org/zh-cn/docs/guides/event-loop-timers-and-nexttick/)

甚至有一篇文章直接指出本文是错的：[Node.js 事件循环-比官方更全面](https://learnku.com/articles/38802)

**2023年3月15日更新**

关于`setImmediate`与`process.nextTick`也许想多了，包括网上的文章也想多了。*setImmediate是宏任务、process.nextTick是微任务*。`process.nextTick`就肯定比`setImmediate`快。

*setImmediate可以理解为一个不用设置timer的setTimeout。但是有一个特别的是，setImmediate的执行时机肯定比setTimeout慢，无论是有没有设置timer。*

```javascript

function foo() {
  setImmediate(() => {
    console.log('setImmediate')
  })

  setTimeout(() => {
    console.log('setTimeout1')
  })

  process.nextTick(() => {
    console.log('process.nextTicm')
  })
}

foo();

// λ node playground.js
// process.nextTicm
// setTimeout1
// setImmediate	// setImmediate在setTimeout后面

```

## 第四章：异步编程

### 高阶函数

一直不清楚高阶XX的含义，看到这才了解。

并不是所有语言都可以把函数当作参数传递。所以，`可以把函数作为参数，或是将函数作为返回值的函数，称之为高阶函数`

相似，在React里，把组件作为参数，并且返回一个新的组件的组件称之为高阶组件；

### 常见的Promise/A的含义

网上看到了Promise/A的概念。一般是手写Promise，都会提到实现一个Promise/A或者Promise/A+规范的方法。

看到这，也终于明白。

区别于Promise/A，还有一个规范是Promise/Deffered

#### Promise/Deffered模式

该模式最早出现于Dojo，后来被广泛的运用于jQuery。如：

```javascript
$.get('/api')
	.success(onSuccess1)
	.success(onSuccess2)
	.error(onError)
	.complate(onComplete)
```

是不是很熟悉？这也是Promise规范之一。

Promise/A就不写了。就是最常见的Promise对象。


<!--顺便介绍介绍目前以及沉淀了很久的express与koa2？-->

## 第五章：内存控制

node的内存限制（来自V8的限制）

Node的内存有个很特别的点：JavaScript只能使用部分内存（64位系统约1.4GB，32位系统约位0.7GB）而其他语言从来没有这样的限制。

这个限制来自V8。V8设计之初是为了浏览器设计的，在浏览器上绰绰有余。深层原因是V8的垃圾回收机制。按官方的说法，以1.5GB的垃圾回收堆内存为例，V8做一次小的垃圾回收需要50毫秒以上，做一次非增量式的垃圾回收甚至要1秒以上。

这是垃圾回收中引起Javascript线程展厅执行的时间，在这样的时间花销下，应用的性能直线下降。所以当时限制了堆内存的大小

### V8垃圾回收机制

这里要引入两个概念：`新生代`内存与`老生代`内存。新生代内存存放存活时间较短的对象，老生代存放存活时间较长或者常驻内存的对象

新生代中的对象主要通过`Scavenge(Chenery)算法`进行垃圾回收。该方法大概意思是：

	把内存一分为二，两个空间只有一个处于使用中（From空间），另一个处于闲置状态（To空间）。当进行分配对象时，先是From空间分配。当进行垃圾回收时，会检查From空间的存活对象，然后将存活对象复制到To空间，非存活的对象会被释放。简而言之，垃圾回收过程中就是将存活对象再两个空间之间进行复制

老生代中利用Mark-Sweep和Mark-Compact相结合的方式垃圾回收。大概过程是：

	Mark-Sweep再遍历堆中所有对象时，标记存活的对象，随后清除阶段，清除没有被标记的对象。清除后，会造成不连续的内存空间。Mark-Compact则会在整理的过程中，把活着的内存往一端移动。

Scavenge更适合存活少的对象，Mark-Sweep和Mark-Compact更适合存活多的对象。Node采用两者结合的方式实现垃圾回收。


### 堆外内存

那么要处理大文件怎么办呢。Node提供了Buffer和stream来处理大文件。

Buffer其实是通过C++去直接分配内存空间，然后拿到内存指针赋值给Node对象。所以Buffer不受V8内存限制的影响。

另外一个是Stream模块

stream模块通过流式读写，stream中会准备一段Buffer，读取内容填充在Buffer中。当数据填满，则便触发一次回调。把读取内容赋值给回调参数，以此来进行内容操作，一般运用于大文件读写。

```javascript
var reader = fs.createReadStream('in.txt');
var writer = fs.createWriteScream('out.txt');

reader.on('data', function(chunk) {
	writer.write(chunk);
})
reader.on('end', function() {
	writer.end();
})
```

由于读写模式固定，上述方法有更简洁的方式：

```javascript
var reader = fs.createReadStream('in.txt');
var writer = fs.createWriteScream('out.txt');

reader.pipe(writer);
```

### 总结

在Node中，因为进程常驻，所以内存泄漏影响比前端严重得多。所以要更加谨慎内存泄漏问题。

一般大文件、大数据量，直接忽略对象存储。改用Redis、Buffer等不影响V8的方式。

## 第六章：理解Buffer

Buffer是比较底层的操作，是通过C++直接操作内存。

Buffer类似数组，它的元素为`16进制的两位数`，也就是0~255的数值。如果给元素赋值小于0，就将该值逐次假256，直到得到一个0到255之间的数值。大于255类似。如果是小数，舍弃小数部分。

### Buffer内存分配

Node采用`slab分配机制`。Node会以`8kb`（也就是8192个元素）作为界限来区分是大对象还是小对象。这也是slab分配的单元。

如果多个小对象，多个小对象没有超过`8kb`，则这些对象都会分配在一个slab块中。如果最后一个对象超过slab单元剩余空间。则会新开一个slab块存储新对象。

假如声明了两个buffer：

	new Buffer(1);
	new Buffer(8192);

那么会使用了两个slab单元。会造成一定的内存浪费。

如果直接声明大对象。则是由C++的SlowBuffer来创建，不明其原理。。。。

### Buffer于字符串之间的转换

```javascript
// buffer转字符串通过构造函数实现
new Buffer(str, [encoding]);

// 字符串转Buffer，用toString
buf.toString([encoding], [start], [end]);
```
encoding默认是`utf-8`，仅支持如下encoding：

* ASCII
* UTF-8
* UTF-16LE/UCS-2
* Base64
* Binary
* Hex

如需其他编码格式，则需第三方库：iconv或iconv-lite

### highWaterMark参数

在Node的流操作中，内部准备了一段Buffer，当数据填充满该Buffer后，便会触发一次流的回调函数，把数据填充在回调函数的参数中。`这段Buffer的长度就是highWaterMark参数`。

highWaterMark，设置过大，则可能造成内存浪费。如果太小，则可能造成低通调用次数太多。

结论是，一般大文件，可以设置大一些，大文件，该值越大，速度越快。

（该部分在编写时理解不深，复习时不可全信）


## 第七章：网络编程

在看到这时，才意识到Node是非常底层的，功能其实相当的强大，前端其实也可以非常的深入。本章介绍了Node的TCP、UDP、HTTP、WebSocket服务。之前前端开发时，只有HTTP、顶多也就WebSocket。看到这才第一次近距离接触TCP、UDP这些内容。

<!--什么是套接字？（虽然文中没有解释，但是有空的话可以彻底解决这个问题）-->

### TCP服务

创建TCP服务的是`net模块`

服务端demo
```javascript
var net = require('net');
var server = net.createServer(function(socket){
	socket.on('data', function(data) {
		socket.write('你好');
	});
	
	socket.on('end', function() {
		console.log('连接断开');
	});
	
	socket.write('welcome');
})

server.listen(8124, function() {
	console.log('server bound');
})
```
可以用telnet工具测试：

```bash
telnet 127.0.0.1 8124
```

nc工具测试：
```bash
nc -U /tmp/echo.sock
```

用net模块测试

```javascript
var net = require('net');
var client = net.connect({port: 8124}, function() {
	console.log('client connected');
	client.write('world!\r\n');
})

client.on('data', function(data) {
	console.log(data.toString());
	client.end();
});

client.on('end', function() {
	console.log('client disconnected');
})
```
值得注意的是，TCP针对网络中小数据包有一定的优化策略：`Nagle算法`。该算法要求缓冲区达到一定数量或者一定时间后才会将数据发出。这可能会导致数据延迟发送。Node中默认开启。如需关闭，可以调用

	socket.setNoDelay(true);

### UDP服务

创建UDP的是`dgram模块`

以下是`服务端demo`：
```javascript
var dgram = require('dgram');

var server = dgram.createSocket('udp4');

server.on('message', function(msg, rinfo) {
	console.log('server got:' + msg + ' from ' + rinfo.address + ':' + rinfo.port);
})

server.on('listening', function() {
	var address = server.address();
	console.log('server listening ' + address.address + ':' + address.port);
})

server.bind(41234);
```
`客户端demo`:

```javascript
var dgram = require('dgram');
var message = new Buffer('some message');
var client = dgram.createSocket('udp4');
client.send(message, 0, message.length, 41234, 'localhost', function(err, bytes){
	client.close()
})
```
说实话有点略微深入了。暂时不分析。。

### HTTP服务

创建http服务的是`http模块`

现在都是expressjs、koa2了。暂不写demo，网上一大堆。

值得注意的是，操作http响应头的两个方法，`setHeader``writeHead`，setHeader可以多次调用，设置多个http响应头，writeHead包头才会写入到连接中。这时就不能在setHeader。

同样。调用了res.end或者res.send后，相应就已经发出去了。之后再进行`任何操作`都没用。返过来。每次相应`必须调用res.end或者res.send`。否则响应会一直挂起

### WebSocket服务

原文用到：`完美`这个词来形容WebScoket与Node之间的关系。书中列出两个理由：

* WebSocket客户端基于事件的编程模型与Node中自定义事件相差无几。
* WebSocket实现了客户端与服务器之间的长连接，而Node事件驱动的方式十分擅长于大量的客户端保持高并发连接

By the way. WebSocket并不是基于HTTP的，而是在TCP上定义的独立的协议。让人迷惑的部分在于WebSocket的握手部分是由HTTP完成的，使人觉得它可能是基于HTTP实现的。

由于内容过多，暂不细讲。demo原文也没用。晚点提供

### TSL/SSL、证书与网络安全

SSL是网景公司提出的概念，TSL是IETF（The Internet Engineering Task Force，国际互联网工程任务组）将其标准化的命名。

TSL/SSL是一个公钥/密钥的结构，是一个非对称结构。平时说的，SSL登陆、https加密指的就是这个。暂不细谈。

值得注意的是，之前了解的HTTPS加密过程中的`浏览器会校验服务器的数字证书`部分，并不属于TSL/SSL部分。证书要解决的问题是：`中间人攻击`

公私钥的非对称加密虽好，但是网络中依然可能存在窃听的情况。客户端和服务器端在交换公钥的过程中，中间人对客户端扮演服务器端的角色，对服务器端扮演客户端的角色，因此客户端和服务端几乎感受不到中间人的存在。为了解决这个问题，数据传输过程中还需要得到公钥进行认证，以确认得到的公钥是出自目标服务器。

举个最近的瓜，如果当时吴亦凡和都美竹之间的聊天，如果有微信对互相的身份进行认证，那刘某迢就不会有得逞的机会。

## 第八章：构建web应用

说的是比较常规的web开发。比较常规，量较多，暂不展开讲

<! -- 可以把koa与express的开发结合本文说一下 -->

1. cookie、session
2. 路由解析
3. 缓存
4. 数据上传
5. 中间件
6. 模板引擎

## 第九章：玩转进程

本文主要讲了`child_process`和`cluster`。字面意思就是`子进程`和`集群`。顾名思义，child_process是实现多进程的基本操作，cluster是child_process与net模块的结合，是对子进程更自动化的管理。

暂时不具体展开细讲，太多内容。

在Node v12.0.0正式引入worker_threads，貌似是更佳的多进程管理。具体内容见下文

[理解Node.js中的"多线程"](https://zhuanlan.zhihu.com/p/74879045)


## 第十章： 测试

可以扩展的说以下断言模块、TDD、BDD风格测试，如何调试Nodejs等。内容略多，暂不介绍

## 第十一章：产品化

这个没啥好说了。

