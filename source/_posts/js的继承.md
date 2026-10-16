---
title: js的继承
date: 2018-08-25 09:20:07
tags: [总结,前端技术]
---

额，js的继承，每次面试都要问，每次都是看了记住一下，过会又忘了，很尴尬。有必要写一下，加强记忆。顺便把ES6 class继承给联系起来。

# 原型链继承

```javascript
function SuperType() {
    this.property = true
}

SuperType.prototype.getSuperValue = function() {
    return this.property
}

function SubType() {
    this.subproperty = false;
}

// 在这里SubType继承了SuperType
SubType.prototype = new SuperType();

SubType.prototype.getSubValue = function(){
    return this.subproperty
}

var instance = new SubType()

console.log(instance)
console.log(instance.getSuperValue())
```

打印出来的`instance`有静态属性`subproperty`，原型链下是`SuperType`，其中包含了`getSubValue`方法和原型链，原型链下是`getSuperValue`。其原型链再往下就是Object对象了。关系如下：

* instance
	* subproperty
	* \_\_prop\_\_
		* getSubValue
		* property
		* \_\_prop\_\_
			* getSuperValue
			* \_\_prop\_\_
				* Object


这样会带来两个问题
1. 如果原型属性如果是引用类型的值时，该值会被所有实例共享
```javascript
function SuperType() {
	// 如果属性值是引用类型
	this.colors = ['red', 'blue', 'green']
}
function SubType() {}

// 继承了SuperType
// 个人理解为：在这时把new SuperType生成的实例对象放在SubType的prototype下
SubType.prototype = new SuperType()

var instance1 = new SubType();
// 在实例1中修改引用值，
// 每次修改只是修改SubType的prototype，这时和SuperType已经无关
instance1.colors.push('black')
console.log(instance1.colors)	// ['red', 'blue', 'green', 'black']

var instance2 = new SubType()
// 则实例2中的该值也会被修改
console.log(instance2.colors)	// ['red', 'blue', 'green', 'black']
```

2. 在创建子类型的实例时，无法在不影响所有对象实例的情况下，给超类型（SuperType）的构造函数传递参数


# 借用构造函数（伪造对象或经典继承）
概念是：**在子类型构造函数的内部调用超类型构造函数**
有个很经典的概念：**函数只不过是在特定环境中执行代码的对象**

```javascript
function SuperType() {
    this.colors = ['red', 'blue', 'green']
}

// 继承了SuperType
function SubType() {
	// 个人理解为，每次在new SubType时，就会执行一遍SuperType的构造函数，从而把SuperType的构造函数里的默认数组复制一份过来
    SuperType.call(this)
}

// 所以每生成一个实例都会SuperType.call一次，是拿的是原SuperType的属性方法
var instance1 = new SubType()
instance1.colors.push('black')
console.log(instance1)
console.log(instance1.colors)   //['red', 'blue', 'green', 'balck']

var instance2 = new SubType()
console.log(instance2)
console.log(instance2.colors)   //['red', 'blue', 'green']
```
这时实例对象的结构是：

* instance
	* colors
	* \_\_prop\_\_
		* constructor: f SubType()
		* \_\_prop\_\_
			* Object



借用构造函数的方式有另一个优点，可以给超类型传递参数了

```javascript
function SupType(){
	SuperType.call(this, 'Nicholas')
}
```
## 借用构造函数的问题

1. 因为在子类型中调用的只是超类型的构造函数，所以不能继承超类型原型链上的内容
2. 因为SubType的实例的原型链上没有SuperType，所以instanceof和isPrototypeOf不能识别

# 组合继承

指的是将原型链继承和借用构造函数继承的技术组合到一起，从而发挥二者之长的一种继承模式

```javascript
function SuperType(name) {
    this.name = name
    this.colors = ['red', 'blue', 'green']
}

SuperType.prototype.sayName = function() {
    console.log(this.name)
}

function SubType(name, age) {
    // 继承属性
	// 这里会把SuperType构造的对象放到SubType实例下
    SuperType.call(this, name)
    this.age = age
}

// 继承方法
// 这里会把SuperType构造的属性放到SubType实例的__proto__链上
// 然后SubType实例下和原型链下都有SuperType构造的属性，但是SubType实例会先访问自己对象下的，所以不会访问到原型链下的方法
SubType.prototype = new SuperType();
SubType.prototype.constructor = SubType;
SubType.prototype.sayAge = function() {
    console.log(this.age)
}

var instance1 = new SubType('Nicholas', 29);
instance1.colors.push('black')
console.log(instance1.colors)   // ['red', 'blue', 'green', 'black']
instance1.sayName()     // Nicholas
instance1.sayAge()      // 29

var instance2 = new SubType('Greg', 27);
console.log(instance2.colors)  // ['red', 'blue', 'green']
instance2.sayName()     // Greg
instance2.sayAge()      // 27
```

instance1实例对象的结构如下

* instance1
	* age: 29
	* colors:  ['red', 'blue', 'green', 'black']
	* name: "Nicholas"
	* \_\_prop\_\_
		* colors:  ['red', 'blue', 'green']
		* constructor: f SubType
		* name: undefined
		* sayAge
		* \_\_prop\_\_
			* sayName
			* constructor: f SuperType
			* \_\_prop\_\_
				* Object


# 原型式继承

其实就是用Object.create()方法实现的继承


```javascript
var person = {
    name: 'Nicholas',
    friend: ['She', 'court', 'Van']
}

var anotherPerson = Object.create(person)
console.log(anotherPerson)
anotherPerson.friend.push('sfs')
console.log(person)
```

最终的效果是，anotherPerson是个空对象，其原型链上是person，这样继承的是一个对象，又不是一个构造函数

* anotherPerson
	* \_\_prop\_\_
		* name: 'Nicholas',
		* friend: ['She', 'court', 'Van']
		* \_\_prop\_\_
			* Object

# 寄生式继承

寄生式继承的思路与寄生构造函数和工厂模式类似，即创建一个仅用于封装继承过程的函数，该函数在内部以某种方式来增强对象，最后再像是真的是它做了所有工作一样返回对象。

```javascript
function createAnother(original){
	var clone = Object.create(original);
	clone.sayHi = function(){}
	return clone
}
```

我倒是觉得没什么用。用处是给后面的终极解决方案提供思路

# 寄生组合式继承

***寄生组合式继承是最常用的ES5继承方法***

所谓寄生组合式继承，即通过借用构造函数来继承属性，通过原型链的混成形式来继承方法。其背后的基本思路是：不必为了指定子类型的原型而调用超类型的构造函数，我们所需要的无非就是超类型原型的一个副本而已。本质上，就是使用寄生式继承来继承超类型的原型，然后再将结果指定给子类型的原型。寄生组合式继承的基本模式如下

```javascript
function inheritPrototype(subType, superType) {
	// 创建超类型原型的一个副本
	// 把超类型的prototype赋值给子类型。
	// 其实和再new一次SuperType目的相同。只是new 一次SuperType会重复调用SuperType，且实例上会有重复的属性。
	var prototype = Object.create(superType.prototype)		// 创建对象
	// 为创建的副本添加constructor属性，从而弥补因重写原型而失去默认的constructor属性
	prototype.constructor = subType;		// 增强对象
	// 将创建的对象（副本）赋值给子类型的原型。
	subType.prototype = prototype;		// 指定对象
}
```

这样就可以用inheritPrototype来继承了

```javascript
function SuperType(name) {
    this.name = name
    this.colors = ['red', 'blue', 'green']
}

SuperType.prototype.sayName = function(){
    console.log(this.name)
}

function SubType(name, age) {
	// 借用构造函数的方式继承超类型的属性和方法，防止实例之间共享引用类型属性
    SuperType.call(this, name)
    this.age = age
}

inheritPrototype(SubType, SuperType)

SubType.prototype.sayAge = function(){
    console.log(this.age)
}

var instance = new SubType('Nicholas', 29)
console.log(instance)
```

instance实例对象结构为：

* instance
	* age
	* colors
	* name
	* \_\_prop\_\_
		* constructor: f SubType
		* sayAge
		* \_\_prop\_\_
			* sayName
			* constructor: f SuperType
			* \_\_prop\_\_
				* Object

# 关于prototype、\_\_proto\_\_、constructor

* prototype、\_\_proto\_\_是对象，constructor是一指针，指向构造函数
* 构造函数的原型链叫prototype
* 实例对象的原型链叫\_\_proto\_\_
* 构造函数的原型链new出来的实例会是实例的原型链
* 实例对象有个constructor指向其构造函数，一般是实例对象原型链上的一个属性（\_\_proto\_\_）
* \_\_proto\_\_不是规范，但是已经被普遍实现。按规范的话，`Object.getprototypeof`方法更适合

构造函数内的属性和方法，new出来之后是实例对象的属性和方法。
构造函数prototype下的属性和方法，new出来之后是实例对象的\_\_proto\_\_下的属性和方法

# 关于ES6的继承

呃，，，有点复杂，我感觉怎么写都不如直接看[阮一峰的ES6](http://es6.ruanyifeng.com/#docs/class)更容易清楚。总之ES6的class不仅是ES5构造函数的语法糖，也有做了一些功能上的扩充。

# 总结

ES5的继承无非是对构造函数、prototype、\_\_proto\_\_、constructor的熟练操作。

就是想让实例的结构像下面的样子

* instance
	* （子类型的实例属性）
	* （父类型的实例属性）
	* \_\_prop\_\_
		* （子类型的原型方法）
		* \_\_prop\_\_
			* （父类型的原型方法）
			* \_\_prop\_\_
				* Object

**至于为什么没写实例方法和原型属性，其实也可以这么做，但是一般情况下，属性放在实例上，方法放在原型上**

**实例之间是不共享实例属性，而会共享原型链**

这样写应该比较清楚了吧
