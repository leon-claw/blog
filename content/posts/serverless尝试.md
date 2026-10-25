---
title: serverless尝试
date: 2019-12-09 09:56:16
tags: [前端技术]
---

某天早班的地铁上刷到了一篇关于serverless的介绍，觉得挺有意思。而且腾讯云的scf免费额度非常多，所以就想试试。正好最近要给gf爬过年回家的机票价格，所以正好动手实现一番。我只是记录一下过程中遇到的问题。关于serverless已经能Google一大堆文章了。就不再啰嗦

github：https://github.com/HelloWorld20/scf_ticket_crawler

# 啥是serverless

serverless类似微信小程序的云函数。serverless没有服务器的概念，只是一个函数，运行在服务器上的一段代码，开发者不用考虑项目搭建、服务器配置、环境配置这些"额外"的事。开发者只需要关注代码逻辑，其他都通过配置的方式配置即可。

所以serverless很适合开发“工具类“服务，比如cos文件上传、发短信或者爬虫这类独立、轻量的服务。

腾讯scf触发方式可以选、cos上传下载、API调用、定时触发、Ckafka队列。而我要尝试的爬虫最适合定时触发

# 本地开发调试

我用的是vscode 插件的开发方式。

在vscode中搜索 `Tencent Serverless Toolkit for VS Code`，并下载。
然后vscode左侧会出现腾讯云的logo，所有管理操作都在那操作。
切换到腾讯云tab、点击创建、分别输入AppId、SecretKey、SecretId，这些在腾讯云控制台的：用户 =》访问管理 =》访问密钥 =》API密钥管理处设置

填写完毕后，就可以在vscode 腾讯云tab的”云端函数“处看到自己的云端function了。点击下载就能开发了。

可以在 本地调试成功后，在上传到腾讯云正式跑（但本地调试bug不断）

# 安装依赖

其实想多了。只需要在目录下npm init 出一个package.json。按需安装第三方依赖，然后上传时连同node_modules一起上传即可。

# 代码开发

女票从深圳出发、要飞沈阳。过年期间机票最低价格都2000+。所以这次目的是爬取所有起点附近的机场、到所有终点附近的机场航线最低票价，然后用个折线图把这些数据都展示出来，挑选合适的航线。

所有机场列表来自携程的接口 :https://flights.ctrip.com/itinerary/api/poi/get?type=international

然后挑出起点机场和终点机场。（自动筛选机场暂时太麻烦）
起点：广州/深圳/珠海/中国澳门/中国香港/汕头/厦门/桂林/南宁
终点：大连/沈阳/锦州/鞍山/朝阳/营口/秦皇岛/天津

最低票价的接口数据来自：https://flights.ctrip.com/itinerary/api/12808/lowestPrice
参数为:{"flightWay":"Oneway","dcity":"SZX","acity":"SHE","army":false}

所以修改dcity和acity的机场编号就能爬到数据了。

```javascript
'use strict';
const axios = require('axios');
const airport = require('./data/selected-airport');
const mongo = require('./lib/mongodb');
const mongoose = require('mongoose');

const model = { time: String, name: String, data: [] };
const schema = new mongoose.Schema(model);
const COLLECTION = "crawler";

mongo.connect();

exports.main_handler = async (event, context, callback) => {
    const from = airport.from;
    const to = airport.to;
    
    let searchList = from.map(fromItem => {
        return to.map(toItem => {
            return {
                from: fromItem,
                to: toItem
            }
        })
    }).reduce((pre, cur) => {
        return pre.concat(cur);
    }, []);

    let result = [];
    for (let i = 0; i < searchList.length; i++) {
        const line = searchList[i];
        const fromData = line.from.data.split('|');
        const fromId = fromData[fromData.length - 1];
        const toData = line.to.data.split('|');
        const toId = toData[toData.length - 1];
        const lowestPrice = await axios({
            method: 'post',
            url: 'https://flights.ctrip.com/itinerary/api/12808/lowestPrice',
            data: { "flightWay": "Oneway", "dcity": fromId, "acity": toId, "army": false }
        }).then(res => res.data.data.oneWayPrice)
        result.push({
            from: line.from.display,
            to: line.to.display,
            lowestPrice: lowestPrice
        })
    }

    console.log(result);

    mongo.insert(COLLECTION, schema, {
        time: new Date(),
        data: result,
        name: 'lowestPrice'
    });

    return result
};
```

先把数据存到数据库待用。
展示部分后来用echarts画出来，发现过年回家高峰期，桂林 飞 天津的机票最低价格竟然稳定在`430块`？而且时间还挺合适？除夕日才299块！！！

# 设置触发方式

方法写好了，需要设置合适的触发方式。

进入管理后台 =》云函数 =》函数服务 =》触发方式Tab =》添加触发方式
简单设置好触发时间，代码就能运行啦

记录下几个坑。

* 选择`COS触发`时，事件类型选全部就好（全部上传或全部下载），不知道对应的COS上传应该用哪个具体的上传模式
* 运行日志会有一两分钟延迟，，，测试的时候没看到有记录，不要怀疑，也许不是自己的问题
* 在线编辑时，`ctrl+f`不够，需要点击保存按钮，才能点击测试按钮。。。不然不生效
* 因为写的是爬虫。所以需要再函数配置里修改超时时间，默认3秒远远不够
* 函数配置里所属网络需要选`无`，否则爬虫不能请求外网，官网提供了方法（[vpc访问外网稳定](https://cloud.tencent.com/document/product/552)）
* 函数配置里的参数对应着项目代码里的 template.yaml。记得改代码里的配置，不然每次上传代码后会覆盖线上的配置

# 关于API触发方式

由于腾讯云产品改版，API触发方式迁移到`API网关`操作，需要在`云函数`新建好函数，然后再新建api网关时选择对应的云函数。操作基本都在[文档里](https://cloud.tencent.com/document/product/583/13197)，不再赘述

# 其他

这次只是让代码跑了起来，还有很多内容需要去深入。这次就当作一个敲门砖好了。以后有类似的需求可以多个门路。
