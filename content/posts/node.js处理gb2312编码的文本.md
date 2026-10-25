---
title: node.js处理gb2312编码的文本
date: 2016-08-21 09:20:07
tags: [总结]
---

由于node.js的读写文件的方法中编码参数不支持gb2312，所以在处理gb2312或者其他node.js不支持的编码格式时需要进行特殊处理，才能让node.js处理中文时不会出现乱码。

# 关于编码格式

推荐阅读[阮一峰的日志](http://www.ruanyifeng.com/blog/2007/10/ascii_unicode_and_utf-8.html)。简单的来说呢，编码是为了让计算机显示出各种特殊字符，而设计出来的一张表，这张表把特殊字符与二进制一一对应，让计算机要显示特殊字符时把二进制的数据通过表转换成对应的字符，从而显示出来。所以说，一样的文字，用不同的编码存储在硬盘中是不同的二进制数据，一段二进制数据只有用存储时的编码表才能解析出正确的字符串。

# node.js的读写操作。

node.js提供的读写文件方法都会提供字符编码的设置参数（encoding），如果设置了encoding参数，那么node.js读文件的原生方法会把存储在文档中的二进制数据转换之后再提供给你，如果原生方法不支持的编码，那么直接读取二进制数据，然后再用iconv-lite模块转换即可。

    npm install iconv-lite


    var iconv = require('iconv-lite');
    var str = iconv.decode(buf, 'gb2312');
    //
    var newBuf = iconv.encode(str, 'gb2312');

在处理过后，再用iconv-lite模块转成二进制，然后直接写入文档即可。
# 注意
不要相信console.log打印出来的东西，console.log不管打印什么格式的内容都能正确显示中文。