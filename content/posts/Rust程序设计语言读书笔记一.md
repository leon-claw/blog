---
title: Rust程序设计语言读书笔记一
date: 2022-11-01 22:23:03
tags: [读书笔记,Rust]
---

[[Rust程序设计语言读书笔记二]]
[[Rust程序设计语言读书笔记三]]

大约半年前，看了基于本书内容的一套视频教程。觉得很不错。然后当时没有记笔记，这半年一直也没有机会找个Rust项目来撸，几乎把语法忘干净。所以现在决定找到原著，从头看一遍，这次一定要记一记。

本书是[在线](https://kaisery.github.io/trpl-zh-cn/title-page.html)的，Rust官网点名推荐的，还是很不错的入门教程。

因为本人是前端开发，然后在学校期间也系统的学习过一些C++，所以基本上是基于前端的角度记录的笔记。不一定全面，尽量记下自己的理解。

# 一：入门指南

第一章简单讲了Rust相关工具。

## rustup

rustup是一个管理Rust版本和相关工具的命令行工具。emmm可以理解为官方的mvn、n。但是更强。

* rustup update更新至最近rust版本
* rustup doc可以在本地浏览器中下载当前版本文档

## rustc

rustc是Rust的编译器，可以类比为node、java的JRE？

* rustc —version，即可打印当前rust版本

## Cargo

Cargo是Rust的构建系统和包管理器。可以类比Node的npm，Python的pip。但是要强大的多。绝大多情况下，编译Rust都是跟Cargo打交道。
*  cargo new [projectname]是生成一个rust项目，类比与npm init
*  项目文件夹里有个Cargo.toml文件，类比与package.json
*  TOML(_Tom's Obvious, Minimal Language_)
*  在Rust中，代码包被称之为crates（板条箱）
*  cargo build：生成可执行文件
*  cargo check：检查代码是否可编译
*  cargo run：生成可执行文件并运行
* cargo build —release：去除开发信息的可执行文件

## [切换源](https://zhuanlan.zhihu.com/p/74875840)

需要在`~/.cargo`下新建config文件，填入：

```bash
[source.crates-io]
registry = "https://github.com/rust-lang/crates.io-index"
replace-with = 'ustc'
[source.ustc]
registry = "git://mirrors.ustc.edu.cn/crates.io-index"
# 如果所处的环境中不允许使用 git 协议，可以把上面的地址改为
# registry = "https://mirrors.ustc.edu.cn/crates.io-index"
```

再删掉`~/.cargo/.package-cache`，重新cargo build即可。

## cargo.lock

简单来说，cargo.lock会在第一次构建时创建。这时cargo会根据依赖版本号计算出最终要安装的版本。如^0.8.1。第一次安装时，会发现有^0.8.3，则cargo会实际安装^0.8.3，并且写入cargo.lock。之后再安装，即使有再新的版本，也会根据cargo.lock安装^0.8.3

## 其他

* 与c++、java一样，main函数是个特殊的函数，在可执行的Rust程序中，它总是最先运行的代码。
* 打包了一个hello world，是一个4M的exe文件。还记得6年前用electon打包了个helloworld，63M好像。。 

# 二：常见的编程概念



如果需要的类型不在预导入内容中，就必须使用use语句显式的引入作用域。

## 变量与可变性

Rust 用`let`关键字声明变量，但是默认是不可变的，声明可变变量则是`let mut`

唯一可以修改的时机是，声明时未赋值，然后第一次赋值。

```rust
let x;
x = 6; // 这是不可变变量唯一可以赋值的时机
x = 7; // 报错
```
如果是可变变量，则加一个mut关键字
```rust
let mut x;
x = 6;
x = 7; // ok
```

Rust虽然已经有了不可变的变量，但还有一个常量，用`const`关键字声明。与不可变变量的区别有几点：

1. 常量必须立即赋值，任何时候都不能修改。
2. 常量必须手动指定类型，不能推断类型
3. 常量不能用println!宏来打印输出

## 隐藏

本质上就是Rust允许声明名称重复的变量，之后声明的会覆盖前面的变量。一个小特性。但是有一个要小小注意的是，需要加上let才称之为隐藏，否则操作原先的变量就叫隐藏

```rust
fn main() {
    let x = 5;
    let y = 5
    {
        let x = x * 2; // 产生了隐藏
        y = y * 2; // 只是重新赋值
        println!("hello world {x}, {y}"); // 10,10
    }
    println!("hello world {x}, {y}"); // 5,10

}
```

花括号内的x是隐藏变量，y则是在花括号作用域内修改了外面的x变量而已。

## 复合类型 - 元组

复合类型可以将多个值组合成一个类型。Rust有两种原生的复合类型：元组(tuple)和数组(array)

Rust是静态类型语言，这也就使得一个变量只能存储一种类型的数据。包括数组，一个数组只能存储一个类型的元素。

Rust的元组可以存储不同类型的复合类型类型。

```rust
let tup:(i32, f64, u8) = (500, 6.4, 1);
```

有两中方式可以获取元组中的数据，结构与.操作符

```rust
let tup:(i32, f64, u8) = (500, 6.4, 1);
let a = tup.0;
let (x, y, z) = tup;

let b = tup[2]; // 不能这样的
```

不能用下标获取。

## 复合类型 - 数组

Rust的数组与C++的一样，需要固定类型，指定数组长度。

```rust
let a: [i32; 5] = [1, 2, 3, 4, 5];

let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]; // 自动推断

let a = [3;5]; // 创建长度为5，内容全为3的数组。
```

因为Rust相同类型的数据占用内存的空间是一样的。所以必须指定长度与类型，这样才能在栈中分配空间。效率很高。

数组的访问方式则是下标访问，这点与元组区分开来。

**与Javascript的数组类似的是Vector数据结构，Vector才是变长的**

# 函数

1. 与C++、Java类似，Rust需要一个入口函数：main
2. 用fn加上函数名来声明函数。就不像JS那样有好几种函数声明方式。
3. 函数推荐使用snake case风格，如果不是，则会warning。但实际上还是可以跑起来的。
4. 函数声明没有先后顺序的要求，会自动提升，这点倒是与Javascript相同

## 形参与实参

形参指的是函数声明时的变量。是签名的一部分，英文名对应（parameters）
实参指的是函数运行时具体的参数。所以是“实”的，英文名对应（argument）

终于有一个合理的解释，来区分形参实参了。在Rust中，倾向于不区分形参实参。

## [语句于表达式](https://kaisery.github.io/trpl-zh-cn/ch03-03-how-functions-work.html#%E8%AF%AD%E5%8F%A5%E5%92%8C%E8%A1%A8%E8%BE%BE%E5%BC%8F)

语句（Statements）是执行一些操作但不返回值的指令。
表达式（Expressions）计算并产生一个值。

那么是不是可以理解为可以产生值的就是表达式？

举几个书上的例子。

`let y = 6`是一个语句，所以在Rust中`let x = (let y = 6)`是会报错的

大部分Rust代码是由表达式组成的。一个数学运算`5+6`，一个数字`6`也是表达式，它返回`6`。函数调用是表达式，宏调用是表达式，大括号创建的新的块作用域也是。比较有意思的是，下方的块作用域表达式中的`x+1`没有分号。如果加上了分号，就不是表达式了。

```rust
{
	let x = 3;
	x + 1
}
```

# 控制流

Rust相比于JS、多了一个loop控制流。可以理解为while(true)无限循环，只能通过break语句中断循环。

有两个不一样的是，loop可以返回值(或者说loop本身也是一个表达式？)，多个loop可以通过循环标签跳出指定loop；

```rust
fn main() {
	let mut counter = 0;
	let result = loop {
		counter += 1;
		if counter == 10 {
			break counter * 2;
		}
	};

	println!("reuslt: {result}"); // 20;
}
```

while与for循环几乎一样，不展开说。

还有一个不一样的是，因为是静态类型的语言，条件判断处只能用boolean值，不能用其他值。因为在Rust中不存在类型自动转换。JS之所以能在条件判断中填写任意值，是因为不同值之间可以发生隐式转换成boolean。

## 其他

* 默认，Rust设定了若干个会自动导入到每个程序作用域中的标准库内容，这组内容被称为`预导入（preclude）`内容。

## 总结

1. 变量虽不可变，但不是常量
2. 表达式在Rust中无处不在，应该时刻注意，才能很好理解。
3. 元组能通过.来访问元素，数组只能通过\[\]方括号来访问元素，不能互换


# 三: 所有权

所有权是Rust最为特别的特性，就凭这个特性，Rust就是一个非常值得学习的语言。

说道所有权，得先介绍一下目前其他语言的内存管理方式。目前主流有两种，一种是C#、Java、Javascript的自动垃圾回收，这种方式的缺点是，垃圾回收会阻塞进程，会消耗额外的性能。

Nodejs就因为采用单线程自动垃圾回收方式，导致默认内存必须限制在1.4GB以内，如果太大，垃圾回收会导致明显的卡顿。

另一种是一C、C++为代表的手动内存管理。这种问题就更大了，如果忘记回收，则会导致内存泄漏。如果提前回收，变量就会非法。如果多次回收，那就有可能删除掉意想不到的内容，影响更严重。

而Rust走的是另一种方式，这就是Rust的所有权机制。

## 所有权规则

1. Rust中每一个值都有一个所有者
2. 值在任意时刻有且只有一个所有者
3. 当所有者（变量）离开作用域，这个值将被丢弃

## 字符串与字符串字面值

字符串字面值是`被硬编码进程序里的`字符串值。字符串字面值是固定长度的，不能被修改的。如果需要可变字符串，则需要另一种类型：`String`，声明String类型的方法是：

```rust
let mut s = String::from("hello");

s.push_str(", world!"); // push_str()在字符串后追加字面值

println!("{}", s);
```

字符串字面值是在编译时就知道其内容，所以文本被直接硬编码进最终的可执行温建宗。这使得字符串字面值快速且高效。这个高效得益于字符串字面值的`不可变性`

String类型为了支持可变，可增长的文本片段，需要在堆上分配一块在编译时未知大小的内存来存放内容。这意味着：

* 必须在运行时向内存分配器（memory allocator)请求内存。
* 需要一个当我们处理完String时将内存返回给分配器的方法。

第一部分由String::from来实现的，在编程语言是非常通用的。

然而，第二部分实现起来就各有区别了。在有 **垃圾回收**（_garbage collector_，_GC_）的语言中， GC 记录并清除不再使用的内存，而我们并不需要关心它。在大部分没有 GC 的语言中，识别出不再使用的内存并调用代码显式释放就是我们的责任了，跟请求内存的时候一样。从历史的角度上说正确处理内存回收曾经是一个困难的编程问题。如果忘记回收了会浪费内存。如果过早回收了，将会出现无效变量。如果重复回收，这也是个 bug。我们需要精确的为一个 `allocate` 配对一个 `free`。

Rust 采取了一个不同的策略：内存在拥有它的变量离开作用域后就被自动释放。下面是示例 4-1 中作用域例子的一个使用 `String` 而不是字符串字面值的版本：

```rust
{
	let s = String::from("hello"); // 从此处起，s是有效的
	// 使用s
} // 此时作用域已结束
  // s不再有效
```

这是一个将String需要的内存返回给分配器的很自然的位置：当`s`离开作用域的时候。当变量离开作用域，Rust为我们调用一个特殊的函数。这个函数叫做`drop`，在这里String的作者可以放置内存的代码。**Rust在结尾的`}`处自动调用`drop`**

总之Rust走了一个全新的内存回收方式，这种方式对Rust有着深远的影响。

举个例子：

```rust
let a = 5;
let b = a;
println!("a, b is {a}, {b}");

let s1 = String::from("hello");
let s2 = s1;
println!("s1, s2 is {s1}, {s2}");
```

这里a和b可以正常打印。但是s1不能打印，报错`borrow of moved value: \`s1\``

在js里，字符串赋值给a，则会在堆内存分配内存给字符串，然后变量a会有一个指针指向字符串内存。

a再赋值给b，则b也会有一个指针指向字符串内存。这时字符串内存有了两个指针指向它。

在Rust里的情况是：`String::from`申请了一块内存，并且声明了一个变量a，a的指针指向字符串内存。这里和js是一样的。

a再赋值给b，则指向字符串内存的指针则`移动`到变量b上。a不再拥有指向字符串内存的指针。所以s1无法打印输出。

**Rust中从头到尾，所有堆内存都至多只有一个指针，当其指针对应的变量离开作用域，那么对应的堆内存也会被清除**

栈内存里不会有这个限制。上面的例子，a和b都能打印，b是a的一份复制。因为栈内存上的占用空间是固定的，所以复制是很快的。

## 所有权与函数

函数传参也会发生所有权移动

```rust
fn main() {
    let s = String::from("hello");
    takes_ownership(s); 
    println!("{}", s); // s已经被移动走了，这里不再能使用,会报错

    let n = 5;
    makes_copy(n);
    println!("{}", n);
}

fn takes_ownership(s: String) {
    println!("{}", s); // s被移动到函数内部，能够正常打印。
} // 借用的s指向的字符串内存在此被释放

fn makes_copy(int: i32) {
    println!("{}", int);
}
```

## 引用与借用

上面那样移来移去的确实太麻烦了。Rust也有另外的方式更方便一些

```rust
fn main() {
    let s = String::from("hello");
    let len = caculate_length(&s);

    println!(" s: {s}, len: {len}")
}

fn caculate_length(s: &String) -> usize {
    s.len(); // 此时拿到的是引用
} // 结束时并不会释放字符串内存
```

Rust使用`&`来表明参数s的类型是一个引用。我们需要传参时，对实参添加`&`符号，也需要在形参的声明中声明是一个引用`&String`

Rust将创建一个引用的行为称为`借用（borrowing）`，就如现实生活中，如果一个人拥有某样东西，你可以从他那里借来。当你使用完毕，必须还回去。我们并不拥有它。

如果我们尝试修改借用的变量？答案是：无法修改。


## 可变引用

Rust也提供了另外一种方式可以对引用修改，语法是，形参于实参的`&`改为`&mut`。当然变量本身也需要是可变的

```rust
fn main() {
    let mut s = String::from("hello");
    change(&mut s);
}

fn change(some_string: &mut String) {
    some_string.push_str(", world");
}
```

可变引用有一个很大的限制：如果你有一个对该变量的可变引用，你就不能再创建对该变量的引用。

```rust
let mut s = String::from("hello");
let r1 = &mut s;
let r2 = &mut s;
println!("{r1}, {r2}")
```

Rust这么设计的好处是可以再编译时就避免数据竞争(data race)，数据竞争有三个行为造成：

* 两个或更多指针同时访问同一数据
* 至少有一个指针被用来写入数据
* 没有同步数据访问的机制

数据竞争会导致未定义的行为，难以在运行时追踪，并且难以诊断和修复；Rust避免了这种情况的发生，因为它甚至不会编译存在数据竞争的代码！

不可变引用的用户可不希望在他们的眼皮底下值就被意外的改变了！然而，多个不可变的引用是可以的。因为不可变引用没有能力影响别人读取到的数据。

一个要注意的是，引用的作用域从`声明的地方开始一直持续到最后一次使用为止`

```rust
    let mut s = String::from("hello");
    let r1 = &s;
    let r2 = &s;
    let r3 = &mut s; // 这么写是会报错的，可变引用不能重复声明
    println!("{r1}, {r2}, {r3}")
```

但是下面是可以的

```rust
    let mut s = String::from("hello");
    let r1 = &s;
    let r2 = &s;
    println!("{r1}, {r2}"); // r1,r2最后一次使用在这，所以r1、r2会被清除
    let r3 = &mut s; // 因为r1、r2被清除，所以r3是唯一的可变引用，合法

    println!("{r3}");
```


# Slice类型

Slice是一个引用，引用字符串、数组中的一部分。

看看文章给的例子:
```rust
fn first_word(s: &String) -> &str {
    let bytes = s.as_bytes();
    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' {
            return &s[0..i];
        }
    }
    &s[..]
}
```
留意到形参接受的类型是&String，返回值是&str。书中没解释。

网上搜寻得知：

str是切片类型，String是字符串类型，但是往往说String类型。

因为切片是引用，所以一般都是搭配`&`使用，所以一般见到的都是`&str`。

```rust
let s: String = String::from("hello world");
let s2: &str = "HELLO WORLD";
let s3: &String = &s;

let s4: &str = &s[..];
let s5: &str = &s2[..];
```

由插件自动提示类型如上，可知，s4、s5都是切片后的，就是切片类型。
而字符串字面量也是一个切片类型，默认是个不可变引用。所以s2是永远不能修改的。

至于啥是切片类型？由`[starting_index..ending_index]`这样的表达式返回的值就是切片类型。

语法很直观，可以去看原文。

## 总结

* Rust是从语法上就避免了数据竞争问题，所以在编译阶段就能彻底避免数据竞争问题。
* 引用是在`最后一次使用`之后被销毁的，与所有权的在作用域结束时释放节点不一样。
* 不可变引用可以重复声明，可变引用只能声明一次。为了避免数据被意外篡改。

# 五、结构体

结构体的概念与JavaScript的对象类似。是一个可以键值对存储数据的一个容器。

```rust
// 声明
struct User {
	active: bool,
	username: String,
	email: String,
}

// 创建实例
let user1 = User {
	email: String::from("abc"),
	username: String::from("abcd"),
	active: true,
};

let user2 = User {
	email: String::from("def"),
	username: String::from("defa"),
	..user1 // 结构体更新语法，把其他实例的字段copy或者移动到新实例
	// 此处移动的是active，是bool类型。实现了copy trait，是直接复制。user1还能正常使用
};

let user3 = User {
	active: false,
	..user1 // 此处因为移动的是字段类型为复杂类型（原文是没有实现copy trait）,所以会发生移动。会导致user1不可用
};

let email = user2.email;
let username = user3.username;
let active = user1.active; // 此处如果是user1.email或者user1.username是不行的，因为已经移动到user3里

println!("{email}, {username}, {active}")

```

基本内容上面例子注释能解释清楚。但有几点要注意
1. 结构体实例的从另外实例更新也会发生移动。官方口吻是，没有实现copy trait的数据会发生移动，移动过后原来的实例将无法访问。
2. 创建实例时在每个花括号后面必须加分号
3. 创建实例时每个字段后面都要加逗号，如果是从其他实例更新，则不需要加逗号
4. 结构体声明，字符串类型是String，大写开头。布尔是bool，小写，整形是u32，小写。容易混淆

## 元祖结构体

还有两种特殊的结构体：

```rust
struct Color(i32, i32, i32); // 元祖结构体
struct Point(i32, i32, i32);  // 类单元结构体
struct AlwaysEqual;
fn main() { 
	let black = Color(0, 0, 0); 
	let origin = Point(0, 0, 0);
	let subject = AlwaysEqual;
}
```

## 方法

先看文中给的一个计算面积的函数

```rust
struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };
  
    println!(
        "The area of the rectangle is {} square pixels.",
        area(&rect1)
    );
}

fn area(rectangle: &Rectangle) -> u32 {
    rectangle.width * rectangle.height
}
```

area`函数`接受Rectangle的引用，输出宽高。再看看什么是`方法`

```rust
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle { // 方法
    fn area(&self) -> u32 {
        self.width * self.height
    }
}

fn main() {
    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };

    println!(
        "The area of the rectangle is {} square pixels.",
        rect1.area()
    );
}
```

抛开debug使用的`#derive[Debug]`，area的声明被移动到了impl块中。那么这个area`函数`就是`方法`。类比与JavaScript是类中的实例方法。

`impl块中的所有内容都将于Rectangle类型相关联`。area被关联到Rectangle类型上。area方法的第一个参数变成了`&self`，&self是self: &Self的缩写，在impl块中，Self类型是impl块的类型的别名。此处用&表示借用了Self实例，此处只想读取数据，而不是写入。如果需要写入，第一个参数修改为`&mut self`。

### 关联函数

所有在impl块中定义的函数被称为关联函数（associated functions），因为它们与impl后面命名的类型相关。Rust也可以定义不以self为第一参数的关联函数（不是方法）

```rust
impl Rectangle {
    fn square(size: u32) -> Self {
        Self {
            width: size,
            height: size,
        }
    }
}

rect1::square() // 调用关联函数
```

区别应该就是形参的第一个参数不命名为self: &Self或&self。这样的方法调用方式是两个冒号`::`
这个就类比与JavaScript的类的静态方法。


还一些要注意的是：
* 构造体的字段可以与方法同名，调用时加上括号就是调用方法，没括号就是读取字段
* 可以拥有多个impl块。他们会类似Typescript的interface合并。

# 枚举

Rust的枚举区别相当大，功能相当强大。

声明与使用：
```rust
enum IpAddrKind {
    V4(u8,u8,u8,u8),
    V6(String)
}

let four = IpAddrKind::V4(127,0,0,1);
let six = IpAddrKind::V6(String::from("::1"));

```

一个更复杂的声明

```rust
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
    ChangeColor(i32, i32, i32),
}

fn main() {
    let a = Message::Quit;
    let b = Message::Move { x: 3, y: 4 };
    let c = Message::Write(String::from("hello"));
    let d = Message::ChangeColor(11, 22, 33);
}
```

可以`枚举`很多类型。

枚举有一个和Typescript不一样的是，Rust枚举也可以用impl块来为枚举定义方法。

所以这里得重新整理一下语言。Rust里的描述是：`用impl块来为xxx定义方法`。而在JavaScript里应该是：`给类加上静态方法等`。

这么想就不奇怪了。impl块可以给结构体、枚举定义方法。这么理解的话，枚举可以给枚举定义方法就不奇怪了。搞不好impl块也能给String、i32等定义方法也是可以理解的。（猜想而已）

```rust
impl Message {
    fn call(&self) {
        // do something
    }
}

a.call();
b.call();
c.call();
d.call();
```

## Option枚举

空值（Null）在开发过程中非常常见，也是最容易出问题的地方。原文来引用了null的发明者Tony Hoare的演讲，提到的 “Null References: The Billion Dollar Mistake”，来强调Null容易带来错误。

原文用到`Rust并没有很多其他语言中有的空值功能`，靠的就是这个Option枚举。Option枚举使用在可能会有空值的地方，并且强制用户去处理空值的情况，以达到在开发过程就彻底消灭空值

Option枚举是标准库定义的一个枚举，使用场景非常的广泛。

Option枚举定义如下：
```rust
enum Option<T> {
	None,
	Some(T),
}
```

如何理解Some(T)？有点难以理解。首先，Some(T)是枚举Option中的一个值，除了None表示空值，那么Some(T)就表示的是`有值`，但又因为是Option枚举的值，它代表的不是`肯定有值`，而是一种`可能有值`。

在vscode Rust插件的自动提示中。`Some(5)会自动推断为Option(i32)、Some('e')推断为Option(char)`

所以不能Some(5)当做5。只能当做是`Option(T)`的一个模式、一个值。

反过来说，`不要错以为Some(T)是函数、方法，Some(T)是Option::Some(T)的简写`。

另外一点，Option\<T\>和Some(T)永远记得要带上泛型T，暂不知道为啥

## match控制流


match是一个强大的控制流`运算符`，它允许我们将一个值与一系列的模式相比较，并根据相匹配的模式执行响应代码。模式可由字面值、变量、通配符和许多其他内容构成；

看看代码：

```rust
enum Coin {
    Penny,
    Nickel ,
    Dime,
    Quarter,
}

fn main() {
    let coin = Coin::Dime;
    let result = value_in_cents(coin);
    println!("{result}")
}

fn value_in_cents(coin: Coin) -> u8 {
    match coin {
        Coin::Penny => 1,
        Coin::Nickel => 5,
        Coin::Dime => 10,
        Coin::Quarter => 25,
    }
}
```

match将结果值按顺序与每一个分支的模式相比较。如果匹配了这个值，这个模式相关的代码将被执行。如果模式不匹配，将继续执行下一个分支。

看着其实非常像JavaScript的switch。但是Rust的match语法上更简洁，强调一个`模式匹配`。并且match与枚举关联性非常好。JavaScript则没有约束。

## match与Option\<T\>

Option是枚举、match是匹配模式（匹配枚举），所以他们两是最搭配的一对。


```rust
let vec: Vec<i32> = vec![1,2,3,4];
let third: Option<&i32> = vec.get(3);
match third {
	Some(num) => println!("third is {}", num),
	None => println!("not match any")
}
```

如上，vec的get方法返回的是Option\<T\>类型，代表着`不一定`读取到数据。所以我们需要用match表达式去处理所有的情况。

Rust为了严谨，安全，默认是需要写出所有匹配模式的。有时候不需要匹配所有值，Rust提供通配符和_占位符。

```rust
let dice_roll = 9;
match dice_roll {
	3 => add_fancy_hat(),
	7 => remove_fancy_hat(),
	other => move_player(other), // other可以是任意`变量`，其作用是传递匹配的值
}
```
或者是占位符
```rust
let dice_roll = 9;
match dice_roll {
	3 => add_fancy_hat(),
	7 => remove_fancy_hat(),
	_ => move_player(), // _表示匹配剩下所有
}
```

**如果不需要通配，不能用下划线来当做通配符，是保留值，会报错**

## if let 简洁控制流

有时候会有这样的写法：

```rust
let config_max = Some('s');
match config_max {
	Some(max) => println!("The maximum is configured to be {}", max),
	_ => (),
}
```

有时候变量(config_max)是一个Option的值，如果config_max最终不是None，则会走Some(max)这个匹配，并且把值赋给max，打印出来。如果变量是None则不做任何处理。这种情况应该是非常多的，而且`_ => ()`是什么必要的。所以Rust提供一个语法糖

```rust
let config_max = Some('x');
if let Some(max) = config_max {
	println!("The maximum is configured to be {}", max)
}
```

当config_max是Some(T)时，就会走花括号内的逻辑。

if let还支持else

```rust
enum Zone {
    Futian,
    Nanshan,
    Luohu
}

fn main() {
    let zone = Zone::Luohu;
    if let Zone::Futian = zone {
        println!("Your Location is Futian")
    } else {
        println!("Not in the Futian")
    }
}
```

**match语法是不是专门匹配枚举类型的？即使不是，那也是与枚举天生一对**

## 总结

* Rust的枚举相当强大，其值可以是很多类型，可以用impl块为其添加方法
* Option(T)是最常见的枚举类型，Some(T)、None是Option::Some(T)、Option::None的简写。不是方法、也不是函数。Option\<T\>专门用来表达“可能没有值”的状态，很奇妙的枚举，与其他语言完全不同的概念。可以消灭（取代）null的一个新概念
* match方法专门用来匹配枚举（待确认）,if let是match的语法糖，也是专门匹配枚举。
