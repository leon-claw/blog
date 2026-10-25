---
title: Vue的插件与extend方法
date: 2018-09-09 09:20:07
tags: [总结,前端技术]
---

工作中要开发一个弹窗组件，然后项目经理希望不仅保留传统的组件形式，也希望通过一个方法直接弹出弹窗，就像Element UI的`this.$message()`方法一样，需要的时候，直接调用这个方法，直接完成了dom插入、弹出、隐藏的过程。不需要在任何地方import、components、插入template等等操作。

![微观小屋](http://ooxy8egxa.bkt.clouddn.com/小书匠/1536486856450.jpg)


# 注入Vue原型

如果想要实现`this.$message()`这样的调用方法，只是需要在`Vue.prototype` 上定义一个方法就好。问题是在什么地方合理地注入。Vue官方给的方案是[Vue.use](https://cn.vuejs.org/v2/guide/plugins.html)

# Vue.use()和install方法

平时使用的时候应该有发现，Vue引入第三方插件都有Vue.use(Plugins)这个操作，然后就可以在各种地方使用第三方插件了。why？

其实很简单。开发第三方插件时，插件应该是一个对象或者方法。如果引入的插件是对象，应该提供一个install方法，然后Vue.use()或调用插件对象的install方法，如果引入的插件是一个方法，则Vue.use()直接调用该方法。然后我们的定义的插件，应该定义一个install方法，让Vue来调用。而我们所有的“注册”之类的操作都应该在这个install方法下定义。

之所以不直接把定义流程直接写在代码逻辑里，一是因为Vue.use()代码逻辑更清晰、二是Vue.use()会防止重复注册插件，从而防止一些可能会出现重复注册带来的bug。

# Vue.extend

Vue.extend方法接受一个对象，该对象和平时我们给组件或者new Vue()时传的对象结构是一模一样的（至少目前我没发现有什么不同），那extend和component、new Vue()有什么不同呢。

```html
// template
<div>
	<input type="radio" value="a" v-model="model">
	<input type="radio" value="b" v-model="model">
</div>
```

```javascript
// js
let config = {
    el: '#event',
    data() {
        return {
            model: 'b',
        }
    }
}

let vm = new Vue(config)

let con = Vue.extend(config)
new con()

```

两个方法都能渲染模板。效果上是一模一样的。

***不一样的是他们的返回值***

new Vue()返回的是vue实例，作用是什么我们都已经很熟悉了。

而Vue.extend()方法返回的是一个构造函数。（虽然new这个构造函数的结构和new Vue()结构一样）

一开始以为返回一个构造函数有点多此一举。后来看了[这篇文章](https://segmentfault.com/a/1190000010095089)知道，extend返回构造函数的目的是为了**复用**。

所以按照原理，我们不应该在传给extend传入el，让其直接挂在到某个元素上。应该利用实例的$mount()方法挂载到指定元素上。

```javascript
let con = Vue.extend(config)

let instance = new con()

instance.$mount('#ele')

// 复用
let instance2 = new con()

instance2.$mount("#ele2")
```

虽然new Vue()的实例也有$mount方法，但是没有办法绑定第二个，也无法重复绑定。

所以我们可以利用extend来生成一个组件，拿到其渲染后的dom，然后手动插入到document.body里，来达到不用手动把组件插入template的效果。

```javascript
let con = Vue.extend(config)

let instance = new con()

let tpl = instance.$mount('#ele').$el

document.body.appendChild(tpl)
```

然后要做的弹窗就出现在页面里了。

# 插件式和组件式的结合

项目需求是组件式和插件式的两种都要有。开始觉得有点脱裤子放屁，其实发现写下来两者也没有很多冲突。

组件式还是照常开发，然后插件式的可以利用已经写好的组件。

```javascript
import pupUps from 'componets/popUps'

let con = Vue.extend(pupUps);

let instance = new con()

// 修改参数
instance.show = true
instance.title = '弹窗标题'

let tpl = instance.$mount('#ele').$el

document.body.appendChild(tpl)

```

参数应该在实例(instance)上修改好，然后tpl是修改参数后渲染的dom。

## 两种方式不和谐的地方

插件式引入组件，并没有用到prop。在实例上修改的参数就等于组件里定义的data，有没有prop都没关系，所以对于插件来说，组件里定义的prop是多余的。

传入slot很麻烦。在插件式里，slot是在实例对象的$slots对象里。
每一个slot是一个vNode实例，好像Vue没有暴露出直接通过template生成vNode的方法，所以没有很好的办法以slot的方式给组件传值。

至于event、v-model。因为使用方式不一样。所以插件式也不存在父组件接受event、定义v-model这类说法，所以对于插件式、组件里抛出的event、v-model这类东西都没意义。

# 插件式的不同


插件式有个思路上的不同。因为插件每次都是`document.body.appendChild(tpl)`直接插入到dom里，所以清除掉dom也得手动去做了。

常用的做法是，维护一个对象保留dom实例。

```html
domCache[tpl.id] = tpl			// 这个id可以换成weakmap？
// 插入前用以对象缓存
document.body.appendChild(tpl)

// 移除dom
delete domCache[tpl.id]

tpl.remove()

```


# 插件式总结

综合来说插件式的用法不适合太复杂的组件。