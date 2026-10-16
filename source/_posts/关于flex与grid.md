---
title: 关于flex与grid的理解
date: 2019-04-21 18:03:03
tags: [css,总结]
---
# flex

整体知识来源于[阮一峰的博客](http://www.ruanyifeng.com/blog/2015/07/flex-grammar.html)

## 容器上的属性

* display: flex/inline-flex;
* flex-direction：不解释
* flex-wrap：不解释
* flex-flow：是flex-direction和flex-wrap的简写
* justify-content：flex-start | flex-end | center | space-between | space-around
* align-item：flex-start | flex-end | center | `baseline` | `strench`
* align-content：flex-start | flex-end | center | `strench` | space-between | space-around

# display: flex与inline-flex

容器可以定义flex与inline-flex。flex则容器还是display: block的效果，与其他`display: block`的元素`各占一行`。inline-flex则与多个`inline`的元素`共占一行`

# align-content

多跟轴线的对其方式，即flex-wrap设置为wrap，且项目换行之后。否则无效

## 项目上的属性

### order

定义项目的排列顺序。数值越小，排列越靠前，默认为0。`但是项目中一般不用，因为用html的顺序更直观一些。`

![](http://www.ruanyifeng.com/blogimg/asset/2015/bg2015071013.png)

### flex-grow（存在剩余空间）

定义项目的放大比例，默认为0，即如果存在**剩余空间**，也不放大

默认为0，不放大。正整数的话代表方法，并且根据参数大小来均分剩余空间

![](http://www.ruanyifeng.com/blogimg/asset/2015/bg2015071014.png)

### flex-shrink（剩余空间不足）

定义了项目的缩小比例，默认为1，即如果**空间不足**，该项目将缩小。

有两个值，0代表不启用，1代表启用；默认启用；即默认自动缩小；

换句话说，如果该值为0，则项目在交叉轴占用的空间就为项目的宽或高；设置为1时，`才会利用flex去重新计算宽或高`。

![](http://www.ruanyifeng.com/blogimg/asset/2015/bg2015071015.jpg)

### flex-basis

定义了在分配多余空间之前，项目占据的主轴空间（main size）。浏览器根据这个属性，计算主轴是否有多余空间。它的默认值为auto，即项目的本来大小。


它的表现与width在flex中的表现是一样的。但是它又与“width”的概念不一样。所以在flex中应该使用`flex-basis`而不是width或height；

其具体表现见文章：[\[翻译\]Flex Basis与Width的区别](https://www.jianshu.com/p/17b1b445ecd4)

### flex

flex-grow; flex-shrink; flex-basis的简写；

### align-self

单独设置对齐方式

## 著名的`flex: 1`

在多个项目中，给某个项目设置`flex: 1`，就会得到神奇的`自适应剩余空间`的功能。往往也就记得这么设置就行了。这次得深究一下。

`flex: 1`在chrome中被解析为`flex: 1 1 0%`，即`flex-grow: 1; flex-shrink: 1; flex-basis: 0%`

而其中起作用的只是`flex-grow`而已。给要自适应的项目设置`flex-grow: 1`也能达到相同的效果

因为flex-grow代表着”如果存在剩余空间，是否放大“；即，如果存在剩余空间，则放大自己，占满剩余空间。而项目的默认值为`flex-grow: 0`；意思为不占用空间，如果给某个设置了`flex-grow: 1`则，设置了`flex-grow: 1`的项目则会沾满空间，达到自适应剩余空间的效果

# grid

主要来源还是[阮一峰的博客](http://www.ruanyifeng.com/blog/2019/03/grid-layout-tutorial.html)

## 概念

## 容器属性

* grid-template-columns：分行
* grid-template-rows：分列
* grid-row-gap（row-gap)：列间距
* grid-column-gap（column-gap）：行间距
* grid-gap（gap）：间距简写 \<row column>
* grid-template-areas：定义区域
* grid-auto-flow：填充方法，行填充还是列填充等
* justify-items：项目的水平对齐方式，start | end | center | stretch;
* align-items：项目的垂直对齐方式，start | end | center | stretch;
* place-items：上俩属性的简写 \<align-item  justify-items>
* justify-content：每个网格的水平对齐方式
* align-content：每个网格的垂直对齐方式
* place-content：简写（align-content justify-content）
* grid-auto-columns：网格外部的布局，参数与grid-template-columns一致
* grid-auto-rows：网格外部的布局，参数与grid-template-rows一致
* grid-template：简写 \<grid-template-rows grid-template-columns grid-template-areas grid-auto-rows>
* grid：简写 \<grid-template-rows grid-template-columns grid-template-areas grid-auto-rows grid-auto-columns grid-auto-flow>

### display: grid 与 inline-grid

同flex与inline-flex。

## 项目属性

* grid-column-start：根据网格线定位位置
* grid-column-end：根据网格线定位位置
* grid-row-start：根据网格线定位位置
* grid-row-end：根据网格线定位位置
* grid-column：简写 \<grid-column-start / grid-column-end>
* grid-row：简写 \<grid-row-start / grid-row-end>
* grid-area：位置，应该时grid-template-area定义的位置，也可以是网格线
* justify-self：单个项目的水平位置，参数同justify-content
* align-self：单个项目的垂直位置，参数同align-content
* place-self：简写\<align-self justify-self>


