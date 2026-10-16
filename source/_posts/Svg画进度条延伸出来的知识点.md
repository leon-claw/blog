---
title: svg画进度条需求复盘
date: 2022-03-22 23:12:48
tags: [svg,总结]
---

最近的一个需求是自定义加载页，我负责的是C端的进度条的实现。经过讨论，进度条应该用SVG实现，有直线、圆环两种。还有两个组件要实现进度跟随。也就是两个组件要跟着进度移动。最终实现起来，还是有不少知识点可以记一下的。一是SVG是个盲点，二是这个需求破天荒的用了不少数学。。。


# 正文

# 关于svg

## svg

\<svg />标签是svg的跟标签，必须要有。没有则不会渲染。其中有一个特有的属性：`viewBox`，用于定义视图范围。也就相当于定义一个`二维坐标系`，svg上的内容都是根据坐标点来画的，超过这个坐标系的内容不可见。

一般还要设置svg标签的width、height属性。这个则是svg占用的范围。以像素为单位。

```html
<svg width="800" hight="800" class="svg" viewBox="0 0 400 400" fill="none">
	 <path
		class="dashed path1"
		d="M360,200A160,160,0,1,1,200,40,160,160,0,0,1,360,200Z"
		style="stroke-linecap: round"
		stroke="green"
		stroke-width="12"
	 />
	 <path
		class="dashed path2"
		d="M 4 15 H 98"
		stroke="red"
		stroke-width="12"
	 />
 </svg>

```

所以一般svg的数据上的位置参数不一定与真实像素一致。只有viewBox与width、height一样宽高时，位置参数才与真实像素一致。

后面也会说到，实际开发中，想要精确的控制尺寸。需要进行转换。

关于其他属性，如style、stroke、stroke-width等。则是可以让其子元素生效。如果多个子元素有相同的属性，可以给\<svg/>标签设置，而不是每个标签都设置。

## path

真正描述内容的是svg标签的子元素。有非常多类型。而目前用到的，也是功能最强的是就是\<path/>标签。\<path/>应该是可以描述任意形状的内容。

### 属性d
\<path/>强大的原因就是d参数。内容太多，则不展开讲。可以参考：[svg之path详解](https://www.jianshu.com/p/c819ae16d29b)

d属性的格式是以`一个字母加上一连串数字组成一个命令`。字母代表动作，数字代表该动作的参数。字母分大小写。大写表示绝对定位，小写表示相对定位。

以`M 4 15 H 98`为例，`M`代表`移动到`，`M 4 15`意思是移动到(4,15)这个坐标点。`H`代表`横向画线`，`H 98`意思是横向画一条到98的线。

所有动作摘抄如下。篇幅有限，暂只记录那么多。

M = moveto  
L = lineto  
H = horizontal lineto  
V = vertical lineto  
C = curveto  
S = smooth curveto  
Q = quadratic Bézier curve  
T = smooth quadratic Bézier curveto  
A = elliptical Arc  
Z = closepath

## 一些常见的属性于方法

### getTotalLength
	SVGGeometryElement.getTotalLength(): number

仅对path元素有效，可以返回path的总长度。也是线段的长度。

对于例子的`.path2`，值为94，因为线段是从4到98

### getPointAtLength

	SVGGeometryElement.getPointAtLength(distance: number): DOMPoint
	
如其名，通过Length获取点（坐标）。其值只能是该svg范围内。如果超出，返回的是最大点或最小点

*注意此坐标是svg viewBox标记的二维坐标系，不是真实的屏幕坐标*

### stroke-width

线段宽度，单位是坐标系单位

### fill

参数是颜色值，可以填写颜色字符串和hex RGB，填写颜色值则填充封闭区域。如果设置为none，则不填充。表现是只显示描边

透明度用另一个参数： fill-opacity

### stroke

stroke是描边颜色，参数同fill，透明度用另一个参数：stroke-opacity

### stroke-dasharray

如其名，参数是一个“数组”，当然是一个字符串化的数组。描述如何绘制线段。

参数是以逗号分隔的数字形式如：`10,5`

第一个值是第一段线段的值，第二个值是第一段与第二段的间隔的值，以此类推。如果超过数组长度，则取第一个值，如此反复。

可以用个迭代器来表述：

```javascript

function dashArray(array) {
	var isLine = false;
	var nextIndex = 0;
	return {
		next: () => {
			var idx = array.length % nextIndex;
			isLine = !isLine;
			return {
				value: {
					length: array[idx],
					style: isLine ? 'line' : 'gap'
				},
				done: false
			}		
		}
	}
}

```

简单举几个例子

参数`6`：则所有线段是`6`，间隔也是`6`
参数`10, 5`：则第一线段是`10`，第一间隔是`5`，以此类推
参数`15, 10, 5`：则第一段线段是`15`，第一个间隔是`10`，第二个线段是`5`，第二个间隔是`15`，第三个线段是`10`，第三个间隔是`5`。以此类推

### stroke-dashoffset

svg线段的偏移量。参数是数字，虽然简单，但是这个是实现进度条的必要参数。一般可以动态的设置偏移量来表示进度

### getBBox

返回一个`SVGRect`对象，描述一个图像具体像素位置。

svg与path都有此方法。svg上的方法返回的是其所有子元素占用空间的最小集合。

此方法不受坐标系限制。图像超出坐标系也会计算进去。

### vector-effect="non-scaling-stroke"

官方说法是：该值的最终视觉效果是笔触宽度不依赖于元素的变换（包括非均匀缩放和剪切变换）和缩放级别

白话意思就是，缩放后，描边宽度与原来一致。并不会随着，缩放放大缩小

 [stackoverflow-path.getTotalLength() returning wrong values](https://stackoverflow.com/questions/40297356/path-gettotallength-returning-wrong-values)


## 几种实现进度的方法

因为需求要求进度的样式不仅仅是线形的，还可以是点状的。所以以下demo都实现了点状的样式。

### 动态计算stroke-dasharray

stroke-dasharray不仅可以画固定长度与间隔的“段”，当然也可以不定间隔的“段”。

假设要实现的svg总长度为1000，每一段长度为5，间隔也为5。那么一个“段”加间隔就是1%的进度。那么要表示10%，应该是10个重复的”段“。后面的90%，则设置为一个长间隔就好。

stroke-dasharray应该是：5,5,5,5,5,5,……连续20个5,。后面的`长间隔`

<iframe height="300" style="width: 100%;" scrolling="no" title="svg进度条" src="https://codepen.io/helloworld20/embed/ZEvePdZ?default-tab=html%2Cresult" frameborder="no" loading="lazy" allowtransparency="true" allowfullscreen="true">
  See the Pen <a href="https://codepen.io/helloworld20/pen/ZEvePdZ">
  svg进度条</a> by wei jianghong (<a href="https://codepen.io/helloworld20">@helloworld20</a>)
  on <a href="https://codepen.io">CodePen</a>.
</iframe>

### 动态计算stroke-dashoffset

<iframe height="300" style="width: 100%;" scrolling="no" title="svg进度条，动态计算stroke-dashOffset" src="https://codepen.io/helloworld20/embed/LYeWvZR?default-tab=html%2Cresult" frameborder="no" loading="lazy" allowtransparency="true" allowfullscreen="true">
  See the Pen <a href="https://codepen.io/helloworld20/pen/LYeWvZR">
  svg进度条，动态计算stroke-dashOffset</a> by wei jianghong (<a href="https://codepen.io/helloworld20">@helloworld20</a>)
  on <a href="https://codepen.io">CodePen</a>.
</iframe>


### 动态计算d参数

(待补充)

## 路径跟随

需求中还有个需求是，其他元素也能跟着svg的进度走。不仅仅是svg能动就行。根据调研，了解到`getPointAtLength`以及`getTotalLength`两个方法，可以根据“进度”动态的获取到svg进度的位置。

难度不大，要注意svg坐标与屏幕坐标转换就行。

难点在于，路径跟随的元素需要偏移与旋转。直线进度条与环形进度条偏移后的路径还不一样。

### 路径跟随+偏移

需求中有两种偏移，直线进度条的是基于指标偏移，环形进度条是基于圆心偏移。直线进度条好说，直接加上x、y偏移量就好。

环形进度条经过思考，加上x、y之后，需要做一个旋转
(后面用些图来解释)

百度后得到[二维旋转公式](https://blog.csdn.net/u013468614/article/details/83022177)，然后做如下转换即可

```javascript
const x = offset.x * Math.cos(angle) + offset.y * Math.sin(angle);

const y = offset.y * Math.cos(angle) - offset.x * Math.sin(angle);
```


### 路径跟随+旋转

原来的组件，可以旋转组件。而旋转组件是整体用的transform:rotate整体旋转。所以，getPointAtLenth方法计算出来的值与是否旋转没有关系。计算出来的x、y也就是没有旋转的位置。如果需要旋转，则需要一些三角函数的知识。。
(后面用些图来解释)
```javascript
if (quadrantFirst || quadrantFourth) {
 	x += L * (1 - Math.cos(rotate));
} else {
	x += L * (1 + Math.abs(Math.cos(rotate)));
}
 
y -= L * Math.sin(rotate);
```

## 缓动函数

这次有个需求：`应该是1%-78%-88%-99这%样的节奏分布在整个时间段内。如设置3s最短时间。前1s进度1%-78%。第2s78-88%。最后1秒。88%-99%。`


本质上就是要自己实现一个缓动函数。

缓动函数大家常见的就是linear、ease、ease-in-out之类的，

当需要自己实现一个缓动函数，其实也很简单。

缓动函数图像其实就是一个横坐标为1（时间）、纵坐标也是1（偏移量）的函数图像，缓动函数内部需要做的就是实现这个函数图像对应的函数。

举例子，linear在函数图像上就是范围是0~1的一个一个斜率为1的一元一次方程

	f(x) = x; // x <= 1 && x >= 0;
	
所以方法也很简单

```javascript
function Linear(amount) {
	return amount;
}
```

所以需求的缓动函数应该是

```javascript
function MockLoadingEasing(amount: number): number {
 const k1 = 2.34;
 const k2 = 0.3;
 const k3 = 0.36;
 if (amount <= 0.33) {
 	return amount * k1;
 }
 const phase1 = 0.33 * k1;
 if (amount > 0.33 && amount < 0.67) {
 	const phase2 = (amount - 0.33) * k2;
 	return phase1 + phase2;
 }

 const phase2 = 0.33 * k2;
 const phase3 = (amount - 0.67) * k3;
 return phase1 + phase2 + phase3;
}
```

他的需求是三段一元一次方程，只要三个函数的斜率就行。

### tweenjs

进度条的进度肯定是一段一段的，如果加载进度飞快，那完全有可能就直接从0跳到100，一瞬间就闪到100%，也许用户都不认为这是个进度条，体验不好。svg可以用transition实现动画，两个路径跟随的元素就没办法了。

这是想到一个之前用过的缓动动画库`tweenjs`。

```javascript
window.TWEEN.Tween(this.curProgress)
 .to({ val: progress }, 500)
 .easing(window.TWEEN.Easing.Quadratic.Out)
 .onUpdate(() => {
 	fn(this.curProgress.val);
 })
 .start();
```

这个方法会把this.curProgress这个对象的val参数作为起始值，progress作为结束值，在500毫秒时间段内应该存在的值。

这个库其实也很好实现，后面可以补充。

