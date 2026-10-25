---
title: vue-cli中开发调用跨域接口的问题
date: 2017-04-25 13:25:07
tags: [vue, 前端技术]
---

# 说明


用vue-cli开发vue-cli会自己启动一个服务器，后台java也要启动一个tomcat服务器来提供接口，这样问题就来了。在vue-cli服务器下请求tomcat时肯定会出现恼人的跨域问题。经过一番Google之后才知道人家vue开发人员早就想到了这问题。只需要修改一下配置文件就OK

这个问题网上已经有很多博客说明了解决办法，就不再赘述。这次只是做下此次开发的配置。

这篇[简书](http://www.jianshu.com/p/95b2caf7e0da)说得比较好

# 解决办法

修改`/config/index.js`配置文件，给proxyTable参数添加以下东西即可

```javascript
    proxyTable: {
        '/api': {
            target: 'http://hall.mail.10086ts.cn:8081',
            changeOrigin: true,
            pathRewrite: {
                '^/api': '',
            }
        }
    },

    //以上写法，/api/yunMail/main/index 会匹配到 http://hall.mail.10086ts.cn:8081/yunMail/main/index
    // /api/yunMail/main/expired 会匹配到 http://hall.mail.10086ts.cn:8081/yunMail/main/expired
```

配置之后，可以像直接请求一样向代理服务器发送请求。包括cookie。无需做多余的配置。