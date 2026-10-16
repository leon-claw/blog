---
title: css超长省略的那些事
date: 2020-04-27 13:52:28
tags: [css, 总结]
---

开发中每次遇到”超长显示省略“的需求时，总得去查一遍，搜到的标准答案：
```css
overflow: hidden, white-space: nowrap; text-overflow:ellipsis;
```
只有overflow是熟悉的。虽然能用，但是做人得有追求啊。得搞懂其中的原因，不然下次还得搜。

文字相关的css属性大概有：`word-break、white-space、word-wrap、overflow-wrap、word-spacing`。长的都贼像。有必要好好屡清楚他们之间的关系和功能了。

# 常见css

##  [word-break](https://developer.mozilla.org/zh-CN/docs/Web/CSS/word-break)

**指定了怎样在单词内断行。**

	
* normal: 使用默认的断行规则
* break-all: 对于non-CJK (CJK 指中文/日文/韩文) 文本，可在任意字符间断行。（都换行）
* keep-all: CJK 文本不断行。 Non-CJK 文本表现同 normal。（都不换行）
* break-word: 要弃用。不推荐
	
白话：
	word-break控制的是：当文字超出容器时，要不要断行。比较细节的是，默认的`word-break:normal`是CJK文本换行、非CJK文本不换行。
默认值本身就很奇怪。所以最好有容器包裹文字时，最好显式声明`break-all`或者`keep-all`；

##  [white-space](https://developer.mozilla.org/zh-CN/docs/Web/CSS/white-space)

**设置如何处理元素中的空白**

属性对应表现如下表

|     |  换行符   |   空格和制表符  |  文字转行（到容器末尾是否换行）   |
| --- | --- | --- | --- |
|  normal   |  合并   |  合并   |  转行   |
|  nowrap   |  合并   |  合并   |  不转行   |
|   pre  |  保留   |   保留  |  不转行   |
|  pre-wrap   |  保留   |  保留   |  转行   |
|  pre-line   |   保留  |   合并  |  转行   |
|   break-spaces  |  保留   |  保留   |  转行   |

白话:

默认情况下，html会把文字间的多个空格和换行都合并为一个空格，且到达容器边缘会换行。而white-space则是控制文字间空白的表现形式的

文字转换是和word-break属性冲突。试了下是**white-space优先级高于word-break**

* break-spaces比较特殊，详情看mdn。
* \<br\>一直都换行

## [overflow-wrap](https://developer.mozilla.org/zh-CN/docs/Web/CSS/word-wrap)

**用来说明当一个不能被分开的字符串太长而不能填充其包裹盒时，为防止其溢出，浏览器是否允许这样的单词中断换行**

与word-break相比，overflow-wrap仅在无法将整个单词放在自己的行而不会溢出的情况下才会产生中断

* normal: 文字超长不强行换行。
* break-word: 文字超长强制换行。
* anywhere: mdn里竟然没有解释。那可以忽略了。

与`word-break: break-all`效果冲突时。我试了下效果是：`word-break与overflow-wrap`，只要有设置换行，则换行。即只要有`word-break:break-all`或者`overflow-wrap:break；`则换行。


## [text-overflow](https://developer.mozilla.org/zh-CN/docs/Web/CSS/text-overflow)

**确定如何向用户发出未显示的溢出内容信号**

就是控制文字超长如何显示的属性。目前只有两个值：`clip` 和 `ellipsis`

clip: 直接裁剪。默认
ellipsis: 显示省略号

还有一些实验性属性可以详细定制省略的显示，可以去mdn看。目前chrome也不支持



## [word-wrap](https://developer.mozilla.org/zh-CN/docs/Web/CSS/word-wrap)

word-wrap 属性原本属于微软的一个私有属性，在 CSS3 现在的文本规范草案中已经被重名为 overflow-wrap 。 word-wrap 现在被当作 overflow-wrap 的 “别名”。 稳定的谷歌 Chrome 和 Opera 浏览器版本支持这种新语法，所以**不要使用word-wrap，改用overflow-wrap**

## word-spacing、letter-spacing

word-spacing是单词与单词之间的间距。letter-spacing是字母与字母之间的间距。中文是用letter-spacing

## [text-wrap](https://www.w3school.com.cn/cssref/pr_text-wrap.asp)

mdn里没有解释。caniuse也搜不出记录。w3school里说：目前主流浏览器都不支持 text-wrap 属性。可以放弃


# one more thing

## [-webkit-line-clamp](https://developer.mozilla.org/zh-CN/docs/Web/CSS/-webkit-line-clamp)

**可以把 块容器 中的内容限制为指定的行数**

可以显示多行后显示省略号的唯一办法

一般写法是

```css
	display: -webkit-box;
	-webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
```

解释又得详细解释 display: -webkit-box; -webkit-line-orient了所以，先抄吧。

# 超长省略

所以超长省略一般思路是。应该让文字”超长"，即文字超出容器不换行，可以white-space: nowrap、white-space: pre和word-break: break-all;

但是white-space: pre会影响其他格式，所以white-space: nowrap和word-break: break-all可以用。当然，还要固定容的宽度。

还有一个容易漏的点：display: block

接下来，肯定要设置overflow: hidden，截断文字。

最后要设置被截断的显示效果，即 text-overflow: ellipsis;就好。

另一思路，用的是`-webkit-line-clamp`。更新、更灵活的方式。
还有个容易忘的参数display: block；

# 总结

最强大最常用的是`white-space`。可以包括`word-break`的效果。还可以保留html里的原格式

`overflow-wrap`和`word-overflow`是一个东西。前者是标准命名。解决的是单个单词不够显示时如何表现。不常用。

text-wrap可以完全忽略

`text-overflow: ellipsis`是显示超长省略的效果关键词

`-webkit-line-clamp`是比较新的，实现“超长省略”更好，更灵活的方法