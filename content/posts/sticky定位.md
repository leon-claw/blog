---
title: 关于css的sticky
date: 2020-04-18 13:22:48
tags: [css,总结]
---

工作中要实现一个这样的效果，找来找去，找到了张鑫旭大神实现的sticky title的demo。虽然posotion:sticky并没有办法实现我需要的效果，但是觉得看完sticky的定位效果确实比我之前想象的有意思（至少我没想到position:sticky可以实现多个sticky title，并且后者会把前者网上顶的效果），所以记下，方便以后回顾。

张鑫旭原文：[杀了个回马枪，还是说说position:sticky吧](https://www.zhangxinxu.com/wordpress/2018/12/css-position-sticky/)

![multi sticky title](/images/sticky-layout-s.gif)
# 概念

先简单介绍下概念。position:sticky。顾名思义就是“粘性"定位。在元素在视图窗口内，表现为 position:relative。当元素滚动到视图之外之后，表现为 position: fixed。很方便的实现了粘性定位。没有position:sticky。就只能借助js来实现类似的效果。方便许多。

# 重要点

详细的概念就不在这展开了。概念其实不多，需要的话可以看张鑫旭的文章或者MDN，就总结一下关键点。

1. sticky由两个关键因素影响其定位是fixed还是relative。一个是浏览器视图窗口，另一个是其父元素（sticky元素只能“黏”窗口，活动范围只能在父元素内）。
2. 父元素只有在overflow:visible时，sticky元素才会表现出粘性效果
3. 可以设置top、left、bottom、right来设置偏移量
4. 必须设置偏移量（top\left\bottom\right)否则不会sticky

*更新*：sticky黏住的不是窗口，而是body。用另一种方法即可sticky元素黏在指定的元素上。可以用iframe包裹住sticky，然后sticky会黏在iframe的边界上 。然后控制iframe，使其黏在想要的元素上。

# multi sticky title效果解释

后面的title顶走上面的title，其实不是sticky互相“顶"，而是后者的父元素”顶"走了前者的父元素。而，sticky元素的活动范围只能在父元素内，所以前者的sticky就随着父元素被”顶"走了。

给父元素加上border就一目了然了（红色border的是父元素，sticky的内容活动范围只能在父元素内）。

<iframe height="265" style="width: 100%;" scrolling="no" title="sticky" src="https://codepen.io/helloworld20/embed/mdemomO?height=265&theme-id=dark&default-tab=html,result" frameborder="no" allowtransparency="true" allowfullscreen="true" loading="lazy">
  See the Pen <a href='https://codepen.io/helloworld20/pen/mdemomO'>sticky</a> by wei jianghong
  (<a href='https://codepen.io/helloworld20'>@helloworld20</a>) on <a href='https://codepen.io'>CodePen</a>.
</iframe>


