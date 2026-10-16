---
title: 使用express搭建文件上传服务器遇到的坑
date: 2017-04-11 13:26:07
tags: [Nodejs]
---

# 说明

最近需要做一个文件上传的功能，但后台还没给API，所以想先用express.js先搭建一个本地文件上传服务器先把功能实现了。实际操作中，发现node.js实现文件上传服务器还有不少坑。所以写篇文章想记下遇到的问题和自己的理解，以备后患。

我用到的工具是`formidable@1.1.1`，网上可能更多的推荐是`multer`，但是按教程操作`res.file`或`res.files`始终是undefined，索性改用`formidable`。

还有一种说法express 4.X也已经直接支持文件上传[文章见Cnode](https://cnodejs.org/topic/4f40a4dc0feaaa4424081758)，但是我未能实现，暂时用`formidable`实现，以后有新发现再回头修改。

## formidable github首页

[github/node-formidable](https://github.com/felixge/node-formidable)

## 详细说明

安装`formidable`

 ```bash
    npm install formidable --save
 ```

引入`formidable`

 ``` javascript
    const formidable = require('formidable')
 ```

初始化`formidable`

 ``` javascript
    let form = new formidable.IncomingForm();
 ```

然后用`formidable`实例对象form去解析express的`req`对象

 ``` javascript
    app.all('/upload', (req, res) => {
        form.parse(req, (err, fields, files) => {
            //fields包含上传的文本信息对象
            //files包含上传的文件对象
        });
    }
 ```

需要注意的是，上传的文件会默认保存在系统临时目录里（可以用`os.tmpdir()`获取），完整文件路径保存在files对象对应文件对象的path参数中。

然后再重命名一下临时文件和删除掉临时文件即可。

 ``` javascript
    Object.keys(files).forEach((v, i) => {
        try{
            fs.writeFileSync('./upload/' + files[v].name, fs.readFileSync(files[v].path))
            fs.unlinkSync(files[v].path)
        }catch(e) {
            console.warn(e)
        }
    })
 ```

关于客户端上传，见下一篇文章

