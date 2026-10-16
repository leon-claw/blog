---
title: 关于babel的preset-env
date: 2021-05-19 15:05:51
tags: [babel,总结]
---

事情是这样的。
突然有一天，产品跟我说，我们有客户在PC版企业微信上用我们的小程序，但是打开是白屏的。经过好几天的debug（[debug过程见另一文章][1]），最终确定是因为PC端小程序内核太老，然后后来新引入的公司内部工具库代码不兼容老版本。所以为了解决这个问题，特地去查了一下babel的preset-env。发现有点意思，故记录一下。这里就记录一些重要的，自己的理解。


# 正文

@babel/preset-env是一套智能的babel预设，很多情况下，直接引入@babel/preset-env一个预设就够了。而且最重要的是 ，还可以通过browser-list精细的控制转义的版本

## core-js

先说说core-js。core-js是提供了一堆polyfill的工具函数。babel会利用core-js，根据源码中有没有需要兼容的代码动态引入core-js。

按我个人理解，babel有其中一种模式就是，按需引入core-js的polyfill以达到兼容低版本浏览器的效果。

## 配置项

### targets

配置的就是browser-list，控制preset-env最终翻译的源码版本。

我遇到的问题是，PC版微信内核是chromuim 53。然后，Object.values是chromuim 54之后支持。所以这么配置

```json
{
	useBuiltIns: 'usage',
	corejs: 3,
	targets: {
		chrome: '52',
	},
```

Object.values会被转义掉，能正常访问，包大小为: `2025kb`

如果targets.chrome改为54。则没有转义，不能正常访问，包大小: `2022kb`

结论是，如果兼容越旧，就需要更多的polyfill来兼容，就会使得包更大。

###  loose

貌似没有太大用处。就是要不要输出宽松的代码。如果宽松代码，类似手写的风格，体积会小些。如果是严格代码。代码量会更大，区别测试是`2001kb`与`2007kb`。

一般设为true，因为运行时不太可能会有不好的流程，大多数都会在开发阶段发现并解决掉了。

而且很多插件也用这个参数，这里估计也是直接传参给内部插件。

### include & exclude

没啥特别的，应该是默认不包括node_modules

### useBuildIns

和core-js有关。控制core-js如何引入

* “usage”：在文件中，按需引入。
* ”entry“：在项目入口，按需引入
* false：不引入core-js

亲测，core-js都去除掉，可以从`2022kb`(chrome54版本)降低到`2004kb`

### corejs

参数有2、3，应该指定corejs的版本。作用不大。

如果useBuildIns设置为false，则不会引入core-js，targets的设置也会失效。就不能精细的根据浏览器版本来转义代码。


# 链接

[官方文档](https://babel.docschina.org/docs/en/babel-preset-env/)

[翻译文档](https://juejin.cn/post/6844903937900822536)

  [1]: https://jianghong.site/2021/04/16/%E5%81%9A%E8%BF%87%E6%9C%89%E4%BB%B7%E5%80%BC%E7%9A%84%E5%92%8C%E8%A1%8C%E8%83%BD%E4%BC%98%E5%8C%96/#%E8%A7%A3%E5%86%B3%E5%B0%8F%E7%A8%8B%E5%BA%8FPC%E7%AB%AF%E7%99%BD%E5%B1%8F%E7%9A%84%E9%97%AE%E9%A2%98