---
title: 基于pnpm的monorepo的开发笔记
date: 2022-08-25 10:04:03
tags: [笔记,总结]
---

最近再看到卡颂大佬的一篇文章[「非广告」从外包到字节，大佬的成长秘密](https://mp.weixin.qq.com/s/u5Q6R38OaanlsKvfp6gQjg)，里面分享的一个学习方法是：写`开发纪要`，觉得指得学习。原文里的所谓开发纪要简单说就是`开发日报`，记录日常开发的过程与吐槽。我没必要那么细，但是可以写一些开发的笔记。这一类文章不需要太完整的逻辑、总结，就是记录一下过程。刚好最近在用pnpm重构我的大而全的monorepo个人项目。可以记录一下。

***笔记类型的文章，只记录关键的，不保证流畅的阅读体验***

# 目标

这个monorepo是旧的基于yarn workspace的monorepo的pnpm版本。目的就是为了学习学习pnpm，顺便写出一套基础设施。以后有需要的需求可以快速实现。比如，最近想实现一个爬虫，监控医院周末的预约号。也想实现一个一直想做的可以插入notion的地图小组件等等。

[项目地址](https://github.com/HelloWorld20/superapp)

[旧版基于yarn workspace的monorepo](https://github.com/HelloWorld20/superapp-yarn)

# 过程

## 新建

创建项目啥的就不必说了，一个与yarn workspace不同的是，pnpm组织monorepo的方法是`pnpm-workspace.yaml`文件

只需添加

```yaml
packages:
  - 'packages/**'
```

即可声明packages下的文件夹作为子项目入口。

## 设计

### 目录结构

然后需要设计个何理的项目分类，深思熟虑，我最后总结下来是：

* static-xx：是纯前端项目
* server-xx：是node.js后端服务，目前是基于koa2，实现接口，可连接mongodb、redis等。未来可以支持SSR
* utils-xx：各种公共方法放在这，包括工具函数、外观模式抽象后的方法与类。这个得分清楚前端后端，所以分了两个utils-web/utils-server
* tools-xx：工具类的代码。如webpack打包工具、cdn上传工具、配置中心等。

未来可以新增`component-xx`这种组件库类型的，现在暂时没有。

### 项目命名

为了区分npm上的包与本地包，每个package名称都是`@ww/`前缀，亲测`@ww-
不行，pnpm无法识别这样的格式。

## 项目启动工具

因为项目众多，所以需要一个询问式的项目启动，效果是

```shell
λ pnpm start

> superapp@1.0.0 start D:\mine\superapp
> node scripts/start.js

? 您要运行哪个项目 (Use arrow keys)
> static-apart-radar: 看房对比dashboard
  static-widget-notion: notion插件
  server: 统一server端
```

代码在跟目录的`scripts`文件夹里和所有支持询问式启动的package下的`scripts`文件

使用方法在[readme](https://github.com/HelloWorld20/superapp/blob/master/scripts/readme.md)不再赘述。

## 实现代码

业务代码基本上可以从旧版的monorepo抄过来。

tips: 中间慢慢加

## 实现widget-notion

接口定义也没啥好说了，值得说的是用mongoose连接mongodb

### mongoose

mongoose有几个概念需要总结一下

1. schema（模式）

一切始于schema，schema类似与表头，定义一个collection的结构。也有点类似于Typescript的interface，定义对象的结构一样。

```javascript
  var mongoose = require('mongoose');
  var Schema = mongoose.Schema;

  var blogSchema = new Schema({
    title:  String,
    author: String,
    body:   String,
    comments: [{ body: String, date: Date }],
    date: { type: Date, default: Date.now },
    hidden: Boolean,
    meta: {
      votes: Number,
      favs:  Number
    }
  });
```

允许使用的 SchemaTypes 有:

String/Number/ Date/Buffer/ Boolean/ Mixed/ ObjectId/ Array /Decimal128

注意不要和Typescript的interface搞混

2. models（模型）

[Models](http://mongoosejs.net/docs/api.html#model-js) 是从 `Schema` 编译来的构造函数。 它们的实例就代表着可以从数据库保存和读取的 [documents](http://mongoosejs.net/docs/documents.html)。 从数据库创建和读取 document 的所有操作都是通过 model 进行的。

models类比于collection

```javascript
var schema = new mongoose.Schema({ name: 'string', size: 'string' });
var Tank = mongoose.model('Tank', schema);
```

模型就可以操作数据库了

```javascript
Tank.find({ size: 'small'}).where('createdDate').gt(oneYearAgo).exec(callback);

Tank.remove({ size: 'large' }, function (err) {
  if (err) return handleError(err);
  // removed!
});

```

3. document（文档）

document就是mongodb里的document，也就是collection里的一条记录。

## 新增trigger-condition-task模型的调度器

设想是应该封装成一个类，不区分前后端的一个通用的调度模型。所以新增一个通用的utils-common package。

大概设想签名是：

```javascript

import { TCTScheduler } from 'scheduler'

const scheduler1 = new TCTScheduler();

function trigger(t) {
	setTimeout(() => {
		t(args);  // 两秒后触发
	}, 2000)
}

function condition(input) {
	return input > 0.5;
}

function task() {
	// do something
}

scheduler1.addTrigger(trigger);
scheduler1.addCondition(condition);
scheduler1.addTask(task);

```

