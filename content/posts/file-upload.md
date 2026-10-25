---
title: 关于web文件上传
date: 2017-04-12 13:26:07
tags: [前端技术]
---

再说说文件上传客户端的问题。阮一峰大神这篇解释挺清楚[文件上传的渐进式增强](http://www.ruanyifeng.com/blog/2012/08/file_upload.html)。所以原理就不再赘述，就在这记录下实现的方法。

## form表单上传

form表单上传是最简单的文件上传,只需要一个form标签，把enctype设为multipart/form-data。action设置为上传路径。缺点是提交后会跳转。基本不会再用。

``` html
<form enctype="multipart/form-data" method="POST">
    <input id="file1" type="file" name="file1">
    ...
</form>
```

## 利用iframe的form表单提交

把form表单的action值指向一个同页面隐藏的iframe。此方法页面不会跳转，也不会阻塞页面（传统form上传是同步上传），甚至可以获取到服务器的返回信息。

## ajax上传

ajax上传是现在的主流方法，但是只能兼容IE10以上的高级浏览器。IE8呵呵

``` javascript
//一份完整的请求示例
var formData = new FormData();

formData.append('name1', $('#upload').files[0])
formData.append('name2', $('#upload').files[1])
formData.append('name3', $("#text").val())

$.ajax({
    url: url,
    method: "POST",
    data: formData,
    processData: false,     //必须是false, 不然会被转换成字符串。
    contentType: false,     //必须是false
    xhr: function(e) {
        var myXhr = $.ajaxSettings.xhr();
        console.log(myXhr)
        if(myXhr.upload) {
            myXhr.upload.onprogress = function(e) {
                if (e.lengthComputable) {
                    //这个是总进度，多个文件的总进度。
                    progress(e.loaded, e.total, myXhr)
                }
            }
        }
        //一定要return xhr对象，否则不会上传
        return myXhr
    },
    success: function(res){
        console.log(res)
    }
});
```

有几点需要注意的。

* 文件上传需要用到FormData对象来包装文件，模拟表单提交

``` javascript
var formData = new FormData();
formData.append('name1', $('#upload').files[0])   
formData.append('name2', $('#upload').files[1])
//单个input多文件
formData.append('name3', $("#text").val())
```

* 用`append`方法给`formData`添加数据。
* `dom.files[index]`方法来获取input标签内的文件数据。
* console.log(dom.files[index])也许打印出来的内容看起来是个普通的对象，好像并没有包含文件内容。但是事实上这样的确可以把文件上传上去。

用jQuery上传。有两个参数是必须的：
 `processData: false`和`contentType: false；` 

* processData设置为false。因为data值是FormData对象，不需要对数据做处理。默认情况下，通过data选项传递进来的数据，如果是一个对象(技术上讲只要不是字符串)，都会处理转化成一个查询字符串，以配合默认内容类型 "application/x-www-form-urlencoded"。如果要发送 DOM 树信息或其它不希望转换的信息，请设置为 false。

* contentType设置为false。因为是由form表单构造的FormData对象，且已经声明了属性enctype="multipart/form-data"，所以这里设置为false。发送信息至服务器时内容编码类型。默认值是"application/x-www-form-urlencoded; charset=UTF-8"，适合大多数情况。

* cache设置为false，上传文件不需要缓存。

## ajax进度条

一切要说的话都在代码里

```js
// jQuery
// 官方解释：
// xhr (默认: 当可用的ActiveXObject（IE）中，否则为XMLHttpRequest)
// 类型: Function()
// 回调创建XMLHttpRequest对象。当可用时默认为ActiveXObject（IE）中，否则为XMLHttpRequest。提供覆盖你自己的执行的XMLHttpRequest或增强工厂。
xhr: function() {
    //获取xhr对象。
    var myXhr = $.ajaxSettings.xhr();

    if(myXhr.upload) {
        //在xhr对象的upload上绑定progress事件。还有一个下载事件对象。
        myXhr.upload.onprogress = function(ev) {
            if (ev.lengthComputable) {
                //这个是总进度，多个文件的总进度。
                progress(ev.loaded, ev.total)
            }
        }
    }
    //一定要return xhr对象，否则不会上传
    return myXhr
},
success: function(res){
    console.log(res)
}
```

原生的方法，需要在new一个xhr对象和open、send之间给xhr.upload绑定progress事件即可。

``` javascript
// 摘抄自网络，未验证
function upload() {
    var xhr = new XMLHttpRequest();  
  
    var fd = new FormData();  

    fd.append("fileName", file);  

    //监听事件  
    xhr.upload.addEventListener("progress", uploadProgress, false);  

    //发送文件和表单自定义参数  
    xhr.open("POST", "../UploadServlet",true);  

    xhr.send(fd);
}

function uploadProgress(evt){  
    if (evt.lengthComputable) {                    
        //这个是总进度，多个文件的总进度。
        progress(ev.loaded, ev.total)              
    }  
}

```

## 拖拽方法封装

拖拽方法相关的事件有 dragenter、dragleave、dragover、drop。一般情况下都要配合起来用才能完成一次完整的退拽操作

需要说明的有几点：

1、 可以读取到文件路径和文件内容的事件对象在drop事件下。
2、 如果在绑定拖拽方法的对象下还有子元素，鼠标进入该子元素范围内也会触发dragleave、dragenter、dragover等事件。所以会导致一些奇怪的事情，比如提前移除高亮样式等。解决办法是添加一个计数器。当dragleave次数等于dragenter次数就可以触发真正的dragleave回调。

``` javascript
//初始化拖拽方法。只是要获取文件路径不需要readFile API
function initDrag( selector, callback ) {
    
    let $elem = $(selector);
    $elem.counter = 0;

    $(selector).on('dragenter', function(e) {
        e.preventDefault();
        e.stopPropagation();

        $elem.counter++;
        $elem.addClass( 'highLight' )
    })

    $(selector).on('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();

        //修正拖拽方法进入子元素时也会出发dragleave事件的方法
        $elem.counter--;
        if($elem.counter === 0) {
            $elem.removeClass( 'highLight' )           
        }
    })

    $(selector).on('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
    })

    $(selector).on('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();

        $elem.counter--;
        if($elem.counter === 0) {
            $elem.removeClass( 'highLight' )
        }
        if($.isFunction(callback)) callback(e);
    })
    
}
```