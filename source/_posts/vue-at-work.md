---
title: 在实际项目中使用vue开发遇到的问题
date: 2017-04-25 09:20:07
tags: [vue, 前端技术]
---

# 前言

终于在实际项目中用到vue了，而且是前端部分从项目结构搭建到项目上线都是自己琢磨出来的。虽然项目不大，但是开发过程中遇到问题、解决问题的过程能让我了解很多东西。加之后台人员只顾自己爽，不管我前端的情况，让我在实际操作中不得不再对项目进行改造，才能让vue-cli搭建的项目用到实际项目中。还好问题最终都能顺利解决，前期搭建项目的耽搁的时间也在后期丝滑般的页面开发过程中追赶回来。所以，开发结束后，赶紧把遇到的问题写下来，把坑填上。

# 遇到的问题

1. vue-cli构建的项目多入口改造
2. 项目服务器和webpack-dev-server服务器接口调用的跨域问题
<!-- 3. 奇葩的登录鉴权 -->
3. 部署脚本编写
4. 项目中图片不能直接在组件中写

# 项目介绍

## 原型介绍

![项目根目录](http://ooxy8egxa.bkt.clouddn.com/image/myHexo/yunMain-index.png)

首页只是个功能入口，每个入口对应不同的模块，模块除了header之外可能完全不一样。不同模块的后台也是由不同的人员开发的，且这项目后期可能会无限制增加模块。所以，还要用vue实现单页面应用的话会使得项目很臃肿，首次loading时间太长。必须对vue-cli构建的项目进行改造。

## 后台结构介绍


```bash
    └─WebContent
        ├─css       
        │  ├─common                             //设计给的公共样式
        │  └─module                             //vue打包的css
        ├─images                            //
        ├─js
        │  ├─lib                                //依赖第三方js
        │  └─module                             //vue打包js
        └─page                              //包含首页index.jsp、错误页面
           ├─billinfo                           //每个模块
           └─message

```

后台有限制了静态文件的访问路径（css、images、js），所以在vue-cli里开发 **必须保证vue项目打包文件夹dist的内部结构和后台java项目静态文件夹结构保持一致**，这样部署时只需要复制粘贴就可以，不然会带来额外的操作。

## 前端项目结构

vue-cli多页面项目改造参考[yaoyao1987/vue-cli-multipage](https://github.com/yaoyao1987/vue-cli-multipage)。可以直接在项目上进行开发。

另外，也把我项目中的结构贴出来备份一下

```bash
    └─yunMail_dev
        ├─build
        ├─config
        ├─node_modules
        ├─dist          
        │  ├─module
        │  └─static                         //与“/static”结构一致
        │      ├─css
        │      │  ├─common                      //公共css   
        │      │  └─module                      //vue css
        │      ├─images
        │      └─js
        │          ├─lib                        //第三方依赖
        │          └─module                     //vue css
        ├─src
        │  ├─assets      //公共文件、核心函数、事件总线、全局对象、全局依赖等
        │  ├─components                 //公共组件：404、登录
        │  │  └─childComponents             //header、弹窗组件
        │  ├─config                 //api等配置文件、应分开发版和正式线版
        │  └─module
        │      ├─billinfo           //模块、每个模块一个入口。包含私有组件
        │      └─message            //应包含message.js、message.html和App.vue
        └─static                    //静态文件，和dist一致，也和java项目一致。
           ├─css
           │  └─common
           ├─images
           └─js
               ├─jquery
               └─lib

```

### 详细说明


### 运行

老套路

    cnpm install 

    npm run dev

    npm run build

    npm run build --report

`publish.js`是自己写的一个脚本。
每次修改之后，vue打包的文件文件名hash值会变。

执行一次publish，会从vue项目dist文件夹里的.html文件里扣取对应引用文件的hash值，并写到java项目指定.jsp文件里（打包文件还是手动复制粘贴一下就好）

    npm run publish

然后访问

[http://localhost:8080/module/billinfo.html#/](http://localhost:8080/module/billinfo.html#/)

即可访问billinfo入口的跟目录。

# 其他

## vue-resource设置header，post xml写法

```js
    this.$http.post( logApi ,(xml string),{
            headers: {'Content-type': 'application/xml;charset=UTF-8'}
        }).then(function(res) {
   
        }, function(err) {

        })
```