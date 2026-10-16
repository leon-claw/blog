---
title: 记一个基于Vue-cli3搭建的前端项目
date: 2018-11-14 15:21:24
tags: [总结,前端技术]
---

在工作中有幸参与一个全新前端架构的搭建，这份经验对于我来说弥足珍贵，可能这是我走出初级前端开发工程师的一个很重要的转折点吧。这份经验不仅让我对webpack、项目整体方面有个很深入的了解，也让我对前端各方面的技术原理、基础有了个比较深入的了解。所以有必要记录下这份经验。

注：由于我们公司代码不能外传，所以没有源码、项目目录结构等可以看。也只能介绍部分结构。。。。

# 项目介绍

我们公司的项目还是和传统Vue-cli自动生成的项目有很大区别的。主要的特点：

* 多页面应用
* 本地mock数据
* Store、Api、mock都分有公共和业务两部分，需要合并
* 接口错误处理既需要统一处理也需要单独处理
* 新增debug、debugmock模式
* 打包项目结构有要求

说明：

1. debug模式只是在production模式上多加一个vconsole。为了在测试环境调试用
2. debugmock是debug模式上拦截接口，用mock数据。为了方便调试样式
3. Store指的是Vuex


# 项目初始化

这次目的就是用最新的架构重搭建一个合适的前端项目结构，所以自然的选择了最新的Vue-cli3 + webpack4来搭建。所以先初始化一个Vue-cli3

	vue create vue-tpl
	
选择

* vue-router
* vuex
* mocha单元测试
* less
* eslint

安装完依赖即可

# TODO LIST

新建一个readme，先思考讨论一番，要做的功能点，然后逐一击破。

* 多页面配置 
* eslint配置，整理代码 
* 新增环境判断（development、debug、debugmock、production）
* mock数据 
* http封装（自定义错误、拦截请求。接口防重发）
* 封装基础工具方法（引入lodash）
* 单元测试 
* webpack配置文件夹别名 
* 合并公共和私有（mock , api , store） 
* 子路由demo（如果异步加载组件的话，分离的组件chunk会识别为common chunk。从而于common-vendor.js一起打包到了dist/common文件夹下了。暂时不考虑异步组件） 
* vue.config.js 分环境配置 
* 撸规范、helloworld页面（包括接口调用）
* 初始化脚本

# 开始干活

1、创建配置文件

Vue-cli3 的灵魂是`vue.config.js`。所以在项目根目录新建一个vue.config.js。所有的配置都是通过vue.config.js来控制的。`不应该直接操作webpack的配置`，当然Vue-cli3搭建的项目结构里也没暴露webpack配置。

因为需要不同环境进行不同的打包配置，所以根目录下新建build文件夹，把四个环境的配置文件写在build文件夹里（production、development、debug、debugmock）。然后vue.config.js根据环境获取不同的配置来干活

vue.config.js看起来是这样的

```javascript
// 根据环境变量获取不同的配置文件
const config = require(`./build/config.${process.env.WEBPACK_ENV}`);

let pages = {};

// 根据业务配置生成pages参数
config.businessArray && config.businessArray.forEach(v => {
	pages[v.chunk] = {
		// page 的入口
		entry: `src/business/${v.chunk}/index.js`,
		// 模板来源
		template: 'public/index.html',
		// 打包出口
		filename: `business/${v.chunk}/index.html`,
		// 当使用 title 选项时，
		// template 中的 title 标签需要是 <title><%= htmlWebpackPlugin.options.title %></title>
		title: v.chunkName,
		// 指定HtmlWebpackPlugin要引入哪个js
		chunks: [v.chunk, 'common']
	};
});

// 直接修改webpack配置，不需要return
let configureWebpack = webpackConfig => {
	// 配置别名
	config.alias && Object.keys(config.alias).forEach(v => {
		webpackConfig.resolve.alias[v] = config.alias[v];
	});

	// 合并plugins
	webpackConfig.plugins = webpackConfig.plugins.concat(config.plugins || []);

	// 修改打包的业务js文件，放到入口下
	webpackConfig.output.filename = 'business/[name]/[name].[hash:8].js';
};

module.exports = {
	baseUrl: config.baseUrl,
	pages,
	assetsDir: config.assetsDir || 'common',
	lintOnSave: config.lintOnSave, // 是否需要eslint
	productionSourceMap: config.productionSourceMap, // 是否需要sourcemap
	configureWebpack,
	css: {
		// 作用于ExtractTextWebpackPlugin。修改css输出路径
		extract: config.cssExtra
	}
};

```

然后development环境的配置文件大概长这样

```javascript
const path = require('path');

module.exports = {
	baseUrl: '/',
	businessArray: [
		{ chunk: 'demo', chunkName: '测试业务' }
	],
	plugins: [

	],
	lintOnSave: true,
	productionSourceMap: true,
	cssExtra: false,
	alias: {
		'@common': path.resolve('src/common/modules')
	}
};

```

那么运行起来之后就可以访问[http://localhost:8080/business/demo/index.html](http://localhost:8080/business/demo/index.html)来看效果了。

## eslint

eslint没啥好讲的，用默认的就行。简单的可以看我的另一篇文章：《从0配置一个前端项目》

## 新增环境变量

默认Vue-cli3搭建的项目默认有`development`和`production`两个环境，要新增的话需要在项目根目录创建`.env`文件（[文档说明](https://cli.vuejs.org/zh/guide/mode-and-env.html#%E6%A8%A1%E5%BC%8F)）。项目中要加debug和debugmock。则需要加上`.env.debug`和`.env.debugmock`文件

然后在.env.debug文件中加上：`NODE_ENV=debug`

再然后，在package.json里的scripts加上：`"debug": "vue-cli-service build --mode debug"`,

则可以在开发中用`process.env.NODE_ENV === ’debug'`来判断是否是debug环境了。

----------------------------分割线---------------------------

后来因为某些问题放弃了通过配置文件的方法配置环境。问题是：

1. vue-cli3是通过判断`NODE_ENV`是否为`production`来打生产包的，所以要是想要自定义多种模式的生产包其实就要做很多操作。
2. 根目录下多了很多环境配置文件其实挺乱的。
3. 无法更灵活的配置更多种模式（比如项目需要分两种webpack（webpack_modeX表示）、前端（front_modeX表示）两种环境。比如要打front_modeA、front_modeB两种包的wepback环境一模一样，就也不得不起webpack_modeA、webpack_modeB来打包）

所以最终还是通过传统的[cross-env](https://www.npmjs.com/package/cross-env)写入环境变量，然后在package.json里的scripts启动命令里注入环境变量

```bash

"scripts": {
	"front_modeA": "cross-env WEBPACK_ENV=modeA FRONT_ENV=modeA vue-cli-service build"
	"front_modeB": "cross-env WEBPACK_ENV=modeA FRONT_ENV=modeB vue-cli-service build"
}

```

默认情况下，vue-cli-service serve是本地包 vue-cli-service build是生产包。或者用 --mode production来指定打生产包。

如果用vue-cli3的配置方法的话，自定义的模式是不可以打生产包的（比如自定义debug模式，就得用--mode debug来指定debug模式）

所以这点传统模式还是方便，指定模式的时候不需要占用 --mode 字段。就可以用 --mode字段来指定打生产包还是开发包了

```bash
"scripts": {
	"front_modeA": "cross-env WEBPACK_ENV=modeA FRONT_ENV=modeA vue-cli-service build --mode development"
	"front_modeB": "cross-env WEBPACK_ENV=modeA FRONT_ENV=modeB vue-cli-service build --mode production"
}
```

## mock数据

mock数据是基于[mock.js](http://mockjs.com/)来实现的。不过现在都流行easymock这种在线mock数据，所以mock.js很久都没有维护了。但是我们项目是不能访问外网的，不得不用这种本地mock数据的办法。

最后封装的效果大概是这样的

```javascript
// 业务mock.js
// 引入公共mock
import commonMock from '@/common/modules/mock.js';
import Apis from './apis';

// 在这定义业务mock接口
// 每个接口为一个数组,
// 数组里的
// 第一个参数为接口url,
// 第二个可选,请求类型,默认为get,
// 第三个为返回值
const mock = [
	[
		Apis.init,
		{
			data: `来自业务接口:${Apis.init}的get数据`
		}
	],
	[
		Apis.comfirm,
		'post',
		{
			data: `来自业务接口:${Apis.comfirm}的post数据`
		}
	]
];

// 把定义好的数据扔给公共mock即可
commonMock(mock);

```

```javascript
// 公共mock数据大概长这样
import Mock from 'mockjs';
import { Apis } from './apis';

Mock.setup({
	timeout: '800 - 1000'
});

// 在这定义mock接口
// 每个接口为一个数组,
// 数组里的
// 第一个参数为接口url,
// 第二个可选,请求类型,默认为get,
// 第三个为返回值
const mockData = [
	[
		Apis.fire,	// 接口
		// 返回值
		{
			data: `来自公共接口:${Apis.fire}的get数据`
		}
	],
	[
		Apis.test,
		'post',		// 第二个参数可以是请求类型，默认为get
		{
			data: `来自公共接口:${Apis.test}的post数据`
		}
	]
];

export default function(businessMock) {
	// 在这统一执行Mock.js
	mockData.concat(businessMock).forEach(v => {
		Mock.mock(...v);
	});
}

```

## 单元测试

用Vue-cli3默认的就好。如果要测试部分单元测试。修改package.json

	vue-cli-service test:unit tests/**/*.spec.js

后面的`tests/**/*.spec.js`是匹配`tests文件夹下的所有文件夹里的所有.spec.js结尾`的文件。用来匹配要测试的单元测试

## 合并公共和私有

因为业务的需要，项目里的Vuex、Api、mock要分为公共和业务私有。运行某个业务的时候，业务应该合并公共和当前业务的这些东西。

然后再本着：`尽量让业务少写代码的原则`。合并代码的步骤不应该写在业务代码里，应该扔到公共部分。然后研究了很久，这样的写法应该是最简单的了。代码太多，不贴这了，看源码吧

## 初始化脚本

虽然我已经尽力去解耦业务代码了，但是多多少少还有些不得不统一的写法。再说，为了统一项目代码结构，还是有必要写一个脚本来初始化项目。

在build文件夹下新建一个文件：copyscript.js

copyscript.js就是个纯`Node.js脚本`，copy文件夹的Node代码（至于为什么不用copy-webpack-plugin，遇到的问题是，不够灵活，而且必须指定entry和output，这个不知道要填啥，我的理解是：`webpack只是个“打包”工具，而初始化代码不是打包过程，不应该用webpack，顶多用gulp`，但是没空研究gulp了）

在根目录新建一个script文件夹，把最干净的初始化代码放到里面，然后copyscript.js要干的活就是



1. 提示用户输入新建业务英文名
2. 判断是否已经存在业务
3. 在业务文件夹下新建一个业务文件夹
4. 把整个script文件夹下的文件递归复制到对应业务文件夹下
5. 在递归复制的时候可以做一些占位符来替换必要的数据，比如说开发人员、创建时间等等

具体看代码，量有点多。

最后再package.json的scripts里多加一条

	"copy": "node ./build/copyscript.js"

# 细致的分配打包资源

打包后的资源分为私有资源和公共资源（chunk-vendors.js）。业务中需要把业务私有的js、css放到对应业务入口index.html同个文件夹下。然后公共js、css则单独放到一个公共文件夹里。

修改业务css的路径，可以通过css.extract修改业务css的输出路径（css.extract直接作用于webpack的[ExtractTextWebpackPlugin](https://webpack.docschina.org/plugins/extract-text-webpack-plugin/)）

要改js的输出路径要改webpack的`output`属性，但是Vue-cli3没有暴露出这个方法，但是暴露出了`configureWebpack`，它可以`直接修改webpack`的配置。

ok没问题。

	webpackConfig.output.filename = 'business/[name]/[name].[hash:8].js';
	
但是在测试的时候遇到了一个很坑爹的问题。

当配置路由需要用到动态路由来模块化路由组件的话，`模块化的js则被识别为公共资源`，然后和`chunk-vendors.js一起放到公共资源文件夹`下。但是从业务上理解，路由组件应该是业务代码才对。然后研究了一下，路由组件模块和公共代码模块都是由webpack的`output.chunkFilename`来控制的，暂时不知道怎么分开。

----------------------------分割线---------------------------

之后再研究中发现，可以更细致的控制方法：`splitChunks`

非常强大的是：splitChunk插件的`cacheGroups.test`参数可以接受一个方法，没引入一个chunk则会调用一次该回调函数，然后可以在函数内部返回true/false来细致的指定要哪些chunk，非常灵活。

然后上面说的，不能控制动态路由的包会放到公共下的问题也就不存在了。

# 其他非代码部分

## 关于BEM命名规范

了解过后才发现之前的理解是错误的。正确的理解应该是：

BEM有3种连接线

```
-   中划线 ：仅作为连字符使用，表示某个块或者某个子元素的多单词之间的连接记号。
__  双下划线：双下划线用来连接块和块的子元素
_   单下划线：单下划线用来描述一个块或者块的子元素的一种状态

type-block__element_modifier
```

而每个组件中，应该只有几个`块`。

所以可以简单约定：组件中除了`根标签以外最外层`的标签才能作为块。而这个块应该被控制在两三个以内


## css路径变量

比如配置了@为src目录，则公共less的引入大概是这样的

	// 引入公共样式，别名
	@import '~@/assets/css/common.less';
	
多加一个`~`即可

----------------------------分割线---------------------------

后来发现了个更好的办法：style-resources-loader

可以通过[style-resources-loader](https://www.npmjs.com/package/style-resources-loader)全局注入less、sass文件。这样就可以做到组件内style不用引入任何less即可使用全局定义的变量、方法等。篇幅问题不再展开说明。看代码


# 总结

一顿操作下来，感觉Vue-cli3的配置精简了很多，添加了很多开箱即用的功能，在webpack配置五花八门的情况下确实省心不少。但问题是灵活性却不够高，比如我想把文件hash长度从8位改为5位，就没有统一的配置去改，而且修改webpack的话，也要改很多地方。

其实还没有很认真的去了解webpack4，webpack最大的问题是loader、plugins太多，太杂，文档不够详细，配置错误也没有很好的提示。如果webpack4能真的像官网那样描述的，增加了很多开箱即用的功能，那webpack4应该用起来没那么繁琐了。那Vue-cli3可能会有点多此一举。


