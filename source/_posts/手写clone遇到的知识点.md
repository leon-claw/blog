---
title: 关于clone Function遇到的知识点
date: 2022-10-20 15:16:00
tags: [Javascript]
---

偶然在搜索如何实现js的拷贝时，搜到一篇文章：[手写js之浅克隆](https://juejin.cn/post/7077758785116176397)，里面的克隆函数的方法让我耳目一新，其中有一些知识点是可以去稍稍了解一下的。

```js
const reg = /function\((.*)\).*\{([^\}]*)\}/;
const matches = obj.toString().match(reg);
if (matches) { 
	let [, args, functionBody] = matches // 对args处理成数组格式 
	args = args.split(',').map(param => param.trim()); 
	res = new Function(...args, functionBody);
}

```

## Function.prototype.toString

首先是function的toString我是没想过没用过的。这个方法可以输出函数源码的字符串，基本上就是与源码一模一样，

上面的方法是把方法源码通过toString来转成字符串，然后通过正则匹配的方式提取出参数、函数体。然后再用Function构造函数新建一个方法。

但是有一个问题，上面的正则只能匹配匿名普通函数比如：`function(a, b) {return a + b}`，其他函数如箭头函数、具名函数就无法匹配了。各种不同的函数toString的效果可以看[MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/toString#%E7%A4%BA%E4%BE%8B)。要实现完美可能得准备好几份正则去匹配不同类型的函数。

**但是从mdn上看，此方法有兼容性问题，最好不要太依赖此方法**

## String.prototype.match

以前都是用RegExt.prototype.test来匹配，从来没有注意过这个方法。现在看来还是非常有用的。

此方法可以返回所有匹配上的字符串，以数组的形式返回。就如开头的例子

```js
const reg = /function\((.*)\).*\{([^\}]*)\}/;
const add = function(a, b) {return a + b};
const s = add.toString();

s.match(reg); 

// 输出如下
/*
[
  'function(a, b) {return a + b}',
  'a, b',
  'return a + b',
  index: 0,
  input: 'function(a, b) {return a + b}',
  groups: undefined,
  length: 3
]
*/

```

其中index、input、groups、length都是不可枚举的固定的值，可以不用管。

前面三个字符串就是正则匹配到的三种情况。其中第二个`'a, b'`与`'return a + b'`就是函数入参与函数体。

拿到这两个，就可以用Function构造函数去创建新函数了。

### 正则里的()

这里能匹配三个值，都是小括号`()`的功劳。找到一个文档的解释是：`标记一个子表达式的开始和结束位置`，说实话不太理解，没有找到更合适的解释。后面补充。

但从行为上看，小括号包裹的正则，匹配上的内容会添加到match返回值里。

```js
const reg1 = /function\((.*)\).*\{([^\}]*)\}/;
const reg2 = /function\(.*\).*\{([^\}]*)\}/;
const reg3 = /function\(.*\).*\{[^\}]*\}/;

const fn = "function(a, b) {\n  return a + b \n}";
/* 
[
	'function(a, b) {\n  return a + b \n}', 
	'a, b', 
	'\n  return a + b \n'
]
*/
console.log(fn.match(reg1)) 
/* 
[
	'function(a, b) {\n  return a + b \n}', 
	'\n  return a + b \n'
]
*/
console.log(fn.match(reg2))
/* 
[
	'function(a, b) {\n  return a + b \n}', 
]
*/
console.log(fn.match(reg3))

```

上面例子，reg2比reg1少了个小括号，则match的结果少解析出入参。
reg3没有小括号，则只解析出整段文本，函数体也没有解析出来。

## Function

1. Function构造函数返回一个方法，Function构造函数的使用方法可以用new 也可以不用new，完全一样。

2. Function构造函数传的参数以最后一个参数作为函数体，前面其他参数作为函数入参

```js
new Function(functionBody)
new Function(arg0, functionBody)
new Function(arg0, arg1, functionBody)
new Function(arg0, arg1,  … , argN, functionBody)

Function(functionBody)
Function(arg0, functionBody)
Function(arg0, arg1, functionBody)
Function(arg0, arg1, … , argN, functionBody)
```

3. Function构造函数创建的函数不会创建当前环境的闭包，他们总是被创建于全局环境。因此在运行时他们只能访问全局变量和自己的局部变量，不能访问他们被Function构造函数创建时所在的作用域的变量。这样可能会带来问题。所以一般情况下不能这么使用

```js
const x = 1;
function run() {
  const x = 2;
  const add = new Function('a', 'return a + x');
  
  console.log(add(2)) // 3
  // 此时x获取到的x是全局的x = 1。忽略了创建时作用域里的x = 2
}
run();
```
4. 如上例，引用到全局变量的例子，在node环境下运行是无效的。会报错：找不到变量x的ReferenceError。这是因为在Node中顶级作用域不是全局作用域，而x其实是在当前模块的作用域之中。

所以结论是：不要轻易使用Function构造函数。

### for in与hasOwnProperty

有一个小知识点之前是没有注意的。

for in会遍历所有属性，包含原型链上的。再clone方法上，我们肯定不希望把原型链上的东西都clone过来，所以需要用hasOwnProperty来判断是否是对象自己的属性

```js

function cloneObject(obj) {
  let res = Array.isArray(obj) ? [] : {};
  for (let key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      res[key] = obj[key]
    }
  }
  return res;
}
```


## 实际情况下的克隆函数

既然上面的方法实现起来有问题，那实际情况是怎样的。

答案出乎意料实际上是不用处理的。。。[lodash里](https://github.com/lodash/lodash/blob/2da024c3b4f9947a48517639de7560457cd4ec6c/.internal/baseClone.js#L194)遇到函数就直接返回了。[这篇掘金](https://juejin.cn/post/6844903929705136141#heading-12)里提到，克隆函数是没有实际场景的。两个对象使用同一个内存当中的函数是没有任何问题的。

## weakmap解决循环引用

一种小情况，如果要拷贝的对象发生了循环引用，那么clone时就会栈溢出，需要特殊处理。处理方式很简单，用一个map来缓存以及遍历过的对象即可。

```js
var input = {
  o: {
    a: 'a',
    b: 1
  },
  num: 1,
  string: 'string',
  reg: new RegExp(/test/),
  date: new Date(),
}

input.me = input;
```

具体怎么缓存就不写了，可以看看[掘金的文章](https://juejin.cn/post/6844903929705136141#heading-5)。

一个小知识点是，可以用[weakmap](https://es6.ruanyifeng.com/#docs/set-map#WeakMap)来做一个小小的优化。

首先，map数据结构是一个键名必须是对象（未来可能还会加上Symbol）所以可以用map.set(o)来缓存对象。这时会有一个小小的问题。这时这个map会对对象有一个引用关系。这个引用关系如果不取消，是会影响垃圾回收。这时需要手动的删除map中的对象才会释放。

weakmap的签名与map一模一样，只是引用的对象不会产生引用，就不会影响引用对象的垃圾回收，也就减少一步手动删除缓存的操作了。


## constructor

还有一个小小的知识点。再赋值不可遍历的类型的数据时，如：Date、RegExp、可以统一用obj.constructor来找到对应的构造函数。

```js

const reg = new RegExp();
reg.constructor === RegExp // true

const date = new Date();
date.constructor === Date // true

```

那么克隆这些对象直接可以：

```js
const Ctor = obj.constructor;
switch(type) {
	case 'Date':
	case 'RegExt'
		res = new Ctro(obj)
		break;
		
}

```

最后放上最终代码：

```js

function getType(tar) {
  return Object.prototype.toString.call(tar).slice(8, -1);
}

function cloneObject(obj, res) {
  for(let i in obj) {
    res[i] = deepClone(obj[i])
  }
}

function deepClone(obj) {
  const type = getType(obj);
  let res = {};
  switch(type) {
    case 'Date':
      res = new Date(obj);
      break;
    case 'RegExt':
      res = new RegExp(obj);
      break;
    case 'Array':
    case 'Object':
      cloneObject(obj, res);
      break;
    default:
      res = obj;
  }
  return res;
}

var input = {
  o: {
    a: 'a',
    b: 1
  },
  num: 1,
  string: 'string',
  reg: new RegExp(/test/),
  date: new Date(),
}

// input.me = input; // 循环引用

const output = deepClone(input);
  
input.o.b = 2;
input.string = 'new string'

console.log(output, input)
// output.o.b === 1
// output.string = 'string'

```

# 总结 

以上代码肯定是还有很多没有考虑的，包括前面提到的循环引用。如果真的要实现一个完美的clone，是一件非常庞大的工作量。这里就不再展开讲了。