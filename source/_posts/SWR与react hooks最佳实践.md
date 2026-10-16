---
title: SWR与React Hooks最佳实践
date: 2022-07-26 11:49:00
tags: [总结,React]
---



在最近的一个需求中，第一次使用上[swr](https://swr.bootcss.com/)这个库。效果很棒，解决了不少痛点，并且也对React Hooks的使用有了更深一层的理解。

# 正文


## 概念

“SWR” 这个名字来自于 `stale-while-revalidate`：一种由 [HTTP RFC 5861](https://tools.ietf.org/html/rfc5861) 推广的 HTTP 缓存失效策略。这种策略首先从缓存中返回数据（过期的），同时发送 fetch 请求（重新验证），最后得到最新数据。

简单来说，就是，swr这个库会帮我们缓存get请求。并且封装成自定义hooks。看代码

```jsx
import useSWR from 'swr';

const fetcher = url => fetch(url).then(r => r.json())

function App () {
  const { data, error } = useSWR('/api/data', fetcher)
  // ...
}
```
这样，可以把远程的数据也可以以hooks的形式写在代码里。业务代码中只需关心data或者error更新时，做什么操作。

## 解决了什么问题

业务开发中，我们常常会把代码拆分成很多细小的模块。如，A组件下有两个子组件B、C。
B和C都需要请求一个接口。那么以前的做法是必须要把这个接口提升到B、C共同的父组件A上，在useEffect里发起请求。用useState存储接口数据，然后再用props传递给B、C组件。

如果需要调接口的子组件很多、且层级很深。那么往往需要跨很多层组件调接口、传props，props太多，代码耦合度就高了，也会产生很多无用的代码。代码会越来越难以维护

如果接口放到子组件则会产生额外的请求。

### swr如何解决的

swr可以把接口数据封装成hooks的形式，在需要的地方，插入一行代码即可注入。

还有一点，swr会缓存已经请求过的接口，所以该hooks被调用多少次、分散在多少个地方调用接口，都不会产生额外的请求。

## post更新数据

useSWR只适合get请求。更新数据则应该需要一个编程的方式更新

```jsx
import useSWR, { useSWRConfig } from 'swr';

const { mutate } = useSWRConfig();

mutate(updateFun(updateData));

```

## 更多高级用法

更多牛逼的用法，贴个链接

* [乐观更新](https://swr.bootcss.com/docs/mutation#%E4%B9%90%E8%A7%82%E6%9B%B4%E6%96%B0): 可以在发起更新请求时，乐观的直接更新本地数据。减少等待时间。
* [条件请求](https://swr.bootcss.com/docs/conditional-fetching): 可以很智能的链式依赖的条件请求数据，捕获promise错误
* [自动重新请求](https://swr.bootcss.com/docs/revalidation): 这个有点酷了，自动重新请求，窗口获得焦点、网络重新连接时重新请求，可以使得应用及时获得最新数据。及时更新状态。
* [自动错误重试](https://swr.bootcss.com/docs/error-handling#%E9%94%99%E8%AF%AF%E9%87%8D%E8%AF%95): 自动错误重试，不用处理错误

## 判断loading状态

useSWR不会直接返回loading状态。需要判断三种useSWR的三个返回值的状态来自行判断

三个返回值有这几种`搭配`(注意是搭配，不是有这几种值)

```jsx
function App () {
  const { data, error, isValidating } = useSWR('/api', fetcher)
  console.log(data, error, isValidating)
  return null
}
// console.log(data, error, isValidating)
undefined undefined true  // => 开始 fetching
undefined Error false     // => 结束 fetching，出现错误
undefined Error true      // => 开始重试
Data undefined false      // => 重试结束，得到数据
```

loading状态应该是`data !== undefined && error === undefined`

所以也有一个小小的限制。接口返回值不能是undefined

**10月14日更新**

其实想太多了，isValidating就是loading的意思。因为对于SWR来说，重新请求就是“校验”“对齐”数据。。

## 代数效应

**2022年11月20日更新**

代数效应首次遇见是卡颂的[React技术揭秘](https://react.iamkasong.com/process/fiber-mental.html#%E4%BB%80%E4%B9%88%E6%98%AF%E4%BB%A3%E6%95%B0%E6%95%88%E5%BA%94)里，里面的解释是：`代数效应是函数式编程中的一个概念，用于将`副作用`从`函数`调用中分离。`

如果这么理解的话，SWR就是一个把副作用抽离的一个很经典的方法。

在正常开发函数组件的过程中，遇到最多的副作用非调接口请求异步数据莫属。每次遇到这样的需求，往往如下写法：

```jsx
const [data, setData] = useState();
const [loading, setLoading] = useState();

useEffect(() => {
	setLoading(true);
	fetchData().then(res => {
		setData(res);
	}).finally(() => {
		setLoading(false);
	})
}, [])

if (loading) return <p>loading...</p>

if (data) return <div>{data}</div>

return <p>placeholder</p>
```

我们需要useEffect调用副作用代码，需要至少两个state来存储数据。

如果要去除这一块的副作用。需要抽离加载数据的逻辑为一个自定义hooks

```jsx
const [loading, data, error] = useFetch(fetchData)

if (loading) return <p>loading...</p>

if (data) return <div>{data}</div>

return <p>placeholder</p>
```

在于SWR，useFetch换成useSWR即可。

再后来，网络搜寻一番代数效应的含义。说实话更迷糊了。

网上[几篇文章](https://overreacted.io/zh-hans/algebraic-effects-for-the-rest-of-us/)更多的是：利用一些新的思想，新的语法来解决当前的问题。

按我的理解，拿hooks来举例就是。

在hooks出来之前，函数组件只能是根据props的输入，来确定输出。f(props) = vdom。我们无法用一个合理的方式新增新的输入。一切其他输入都是`副作用`

```jsx
export default App(props) {
	// 除了props，我们没有其他方式非附着用的方式注入函数
	// const age = localStorage.getItem('age') // 副作用
	// const age = window.location.search // 也是副作用
	return <div>{props.name}</div>
}
```

React团队`利用代数效应`，实现了hooks，来达到一种新的无副作用新增输入的方法：f(props + state) = vdom

```jsx
export default App(props) {
	const [age] = useState() // 这个就是无副作用的输入方式
	return <div>{props.name}, {age}</div>
}
```

照这么理解的话，SWR也是一种`代数效应`。有了SWR就能实现f(props + state + remoteData) = vdom

```jsx
export default App(props) {
	// 除了props，我们没有其他方式非附着用的方式注入函数
	// const age = localStorage.getItem('age') // 副作用
	// const age = window.location.search // 也是副作用
	const {data: address} = useSWR(fetcher);
	const [age] = useState() // 这个就是无副作用的输入方式
	return <div>{props.name}, {age}, {address}</div>

}
```



## React Hooks最佳实践

之前面试有被问过一个问题：Hooks与高阶组件有什么区别？我一脸懵逼，高阶组件不是一种组合方式吗、Hooks不是一套新的API，可以让函数组件存储数据吗？他们之间有毛关系？

现在我才彻底理解当时那个问题的含义。

他们本质上确实没有关系，但是两者都共同解决了一个问题。就是数据注入的问题。

关于React数据注入有props、context、高阶组件，现在多了一个Hooks。props与context都是最常规，最直接的数据注入，没啥好说。

### 高阶组件

高阶组件的数据注入最直观的是`react-redux`的connect方法。connect方法把store里的数据直接注入到某一个组件。这种方式的缺点是，我们总需要去考虑数据是来自父组件还是connect注入的。两者冲突了还得特别处理。

还有就是，我们往往需要写不少代码来正确处理数据、ref。

### hooks

hooks本质上也是一套新的数据注入的方式。最直观的也是`react-redux`的`useSelector`方法

我们要做的只是在需要数据的地方，插入一个自定义hooks，这个封装好的hooks会可靠的返回需要的数据，业务组件只需处理数据与视图的映射即可。

hooks的数据注入是`可插拔的热更新试`注入，对代码结构0影响。也无需额外代码。是一种更佳的数据注入方案。

转念一想想，这不就是hooks这个单词的本意？