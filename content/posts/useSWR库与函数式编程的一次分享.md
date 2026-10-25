---
title: useSWR库与函数式编程的一次分享
date: 2023-05-14 16:17:03
tags: [React,SWR,分享]
---

好久没有更新博客，主要是太忙了，更多的是刷面试题，而面试题又是比较通用的知识，不值得单独记录。

最近做了一次技术分享，就用来水一篇吧。

此次分享主要介绍一下swr库与其衍生出来的React函数式编程的一些概念，对我们平时开发良好的React函数式组件有一定的帮助。


[swr](https://swr.vercel.app/zh-CN)是由vercel公司开发，截至截稿GitHub上已经有26.5k的star，其质量与其理念还是很有学习价值的。

在线PPT: [https://jianghong.site/presentation/swr](https://jianghong.site/presentation/swr)

PPT仓库：[https://github.com/HelloWorld20/presentation](https://github.com/HelloWorld20/presentation)

# 正文


首先我们先从一个问题开始：**假如当你遇到封装一个获取 localStorage 的方法的时候，应该怎么写？**

是封装一个工具函数？

```jsx
function App() {
  const { value, setValue } = getLocalStorage("key");
  return <div>{value}</div>;
}
```

还是封装一个自定义 hooks？
```jsx
function App() {
  const { value, setValue } = useLocalStorage("key");
  return <div>{value}</div>;
}
```


它们之间有什么区别？

# 函数式编程的核心思想

我们先从函数式编程的核心思想开始说。

函数式编程最核心的就是如下的公式
```jsx
f(x) = y;
```

确定输入x，就肯定会有确定的输出y，相同的输入x，肯定会得到相同的输出y

这个概念再React的体现是

  
```jsx
f(props) = vdom;

function App(props) {
  return <div>{props.name}</div>;
}
```


相同的props，会得到相同的vdom。

而在hooks出来之后，state也可以作为可靠输入

  
```jsx
f(props + state) = vdom;

function App(props) {
  const [state] = useState();
  return (
    <div>
      {props.name} | {state}
    </div>
  );
}
```
  

在Redux的hooks api出来之后，Redux store也可以作为可靠输入；

  
```jsx
f(props + state + store) = vdom;

function App(props) {
  const store = useSelector();
  const [state] = useState();
  return (
    <div>
      {props.name} | {state} | {store}
    </div>
  );
}
```
  

以上几个关系都是纯函数，没有任何副作用。那如果此时，我们需要获取localStorage的数据，我们应该把localStorage的数据也作为可靠的输入：

  
```jsx
f(props + state + localstorage) = vdom

function App(props) {
  const storage = useLocalStorage();
  const [state] = useState();
  return (
    <div>
      {props.name} | {state} | {storage}
    </div>
  );
}
```
  

而不是用getLocalStorage。getLocalStorage是副作用，而不是可靠的输入，每次组件的渲染，都会读取最新的localStorage，都是不确定的输入。

所以我们需要useLocalStorage，**把localStorage变成一个可靠的输入，而不是副作用**。

  
```jsx
// hooks
export default function useLocalStorage(key: string, initialValue?: string) {
  const defualtValue = window.localStorage.getItem(key);
  const [value, setState] = useState(defualtValue || "");

  useEffect(() => {
    window.addEventListener("storage", storageCb, false);

    return () => {
      window.removeEventListener("storage", storageCb, false);
    };
  }, []);

  const storageCb = function (e: any) {
    setState(e.newValue);
  };

  const setValue = (val: string) => {
    setState(val);
    window.localStorage.setItem(key, val);
  };

  return { value, setValue };
}


// app.js
import useLocalStorage from "./use-localstorage";

export default function StorageDemo() {
  const [_, setState] = useState({});
  // const { value, setValue } = getLocalStorage("name");
  const { value, setValue } = useLocalStorage("name");

  const change = () => {
    setValue(Math.random().toString());
    // window.localStorage.setItem("name", Math.random().toString());
  };

  return (
    <div>
      {/* <div>ahooks getStorageData: {getStorageData}</div> */}
      <div>useStorageData: {value}</div>
      <button onClick={change}>change</button>
      <button onClick={() => setState({})}>force update</button>
    </div>
  );
}
```
  

## useSyncExternalStore

  

以上的思想也不是我空穴来风。React18已经新增了一个专门用于**订阅外部数据源**的内置hooks：[useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)

官网的demo如下，用法见注释

```jsx
import { useSyncExternalStore } from "react";

export default function ChatIndicator() {
  // 订阅网络状态，该hooks接收两个方法，subscribe与getSnapshot，返回网络状态，并且在isOnline变化时，触发React应用更新
  const isOnline = useSyncExternalStore(subscribe, getSnapshot);

  // 业务代码只管拿到isOnline做视图渲染。不需要考虑任何的副作用
  return <h1>{isOnline ? "✅ Online" : "❌ Disconnected"}</h1>;
}
// getSnapshot方法只需要返回当前的状态，此处需要返回当前的网络状态
function getSnapshot() {
  return navigator.onLine;
}
// subscribe方法用于订阅状态变化的时机。当时机变化后调用callback，getSnapshot方法就会执行，返回最新的状态。此处需要订阅网络变化的时机：online、offline
function subscribe(callback) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

  

如果用useSyncExternalStore来改造useLocalStorage：

import { useSyncExternalStore } from "react";

export default function useLocalStorage(key: string) {
  const subscriber = (callback: any) => {
    window.addEventListener("storage", callback);
    return () => {
      window.removeEventListener("storage", callback);
    };
  };

  const getSnapshot = () => window.localStorage.getItem(key);

  const value = useSyncExternalStore(subscriber, getSnapshot);

  const setValue = (value: string) => {
    window.localStorage.setItem(key, value);
  };

  return { value, setValue };
}

``` 

Redux已经利用useSyncExternalStore实现了useSelector。只不过为了兼容非React18的应用，用的是一个shim：use-sync-external-store/shim/with-selector，这个也是React官方实现的：[https://www.npmjs.com/package/use-sync-external-store](https://www.npmjs.com/package/use-sync-external-store)

# useSWR

介绍useSWR之前，我们还是用开始的递推顺序来一步一步解释

在Hooks时代，我们往往用useState来存储状态，然后做state与视图的映射。
```jsx
function App() {
  const [state] = useState();
  return <div>{state}</div>;
}
```
  

那我们假设一下我们有一个远程的数据：那么可能会用一个useRemoteState来抽象一下：

  
```jsx
function App() {
  const [state] = useRemoteState();
  return <div>{state}</div>;
}
```
  

把这个useRemoteState替换成useSWR那么就可以了：

  
```jsx
import useSWR from "swr";

function fetcher(path: string) {
  return fetch(`http://localhost:4000${path}`).then((res) => res.json());
}

function App() {
  const { data, error, isLoading } = useSWR("/url", fetcher);
  return <div>{data}</div>;
}
```
  

useSWR的第一个参数是key，第二个参数就是我们日常封装在api文件夹下的接口请求函数，需要返回Promise，resolve返回接口数据这样的一个函数。

我们只需要考虑如何把useSWR的返回值映射到我们的jsx上即可。

**useSWR库帮我们屏蔽了所有的副作用，把接口数据或者说数据库里的数据变成了可靠的输入。**

## useSWR不仅仅是个接口请求库

封装请求只是其中一个功能，它还能帮我们缓存数据。

在日常开发中，我们的组件往往需要拆分成很多个组件。如果不同组件需要调用同一个接口，传统方式，我们需要在需要调用接口的共同父组件里调用，拿到数据后通过props传递到需要数据的子组件。或者把数据存到redux，通过useSelector读取。

否则有多少个地方调用，就会产生多少次接口调用

![img](http://wiki.tuzhanai.com/download/attachments/432701454/image2023-5-12_17-38-40.png?version=1&modificationDate=1683884320000&api=v2)

而用useSWR则会缓存接口数据，如果多个组件同时调用一个接口（通过key来判断是否是一个请求），那么swr会只请求一个接口，然后拿到数据后分发到调用useSWR的地方。

对于SWR，它会认为一段时间内（大约5秒），数据是新鲜的，如果数据是新鲜的，就会复用缓存数据，如果数据不新鲜，那么就会重新调接口，同步本地与远程数据。

这也是SWR（stale-while-revalidate）的本意。  

“SWR” 这个名字来自于 `stale-while-revalidate`：一种由 [HTTP RFC 5861](https://tools.ietf.org/html/rfc5861) 推广的 HTTP 缓存失效策略。这种策略首先从缓存中返回数据（过期的），同时发送 fetch 请求（重新验证），最后得到最新数据。

  

## useSWR还有很多不可思议的功能

  

- [自动重新请求]([https://swr.bootcss.com/docs/revalidation](https://swr.bootcss.com/docs/revalidation))：自动重新请求，窗口获得焦点、网络重新连接时重新请求，可以使得应用及时获得最新数据。及时更新状态。  
- [自动错误重试]([https://swr.bootcss.com/docs/error-handling#%E9%94%99%E8%AF%AF%E9%87%8D%E8%AF%95](https://swr.bootcss.com/docs/error-handling#%E9%94%99%E8%AF%AF%E9%87%8D%E8%AF%95))：自动错误重试，不用处理错误  
- [乐观更新]([https://swr.bootcss.com/docs/mutation#%E4%B9%90%E8%A7%82%E6%9B%B4%E6%96%B0](https://swr.bootcss.com/docs/mutation#%E4%B9%90%E8%A7%82%E6%9B%B4%E6%96%B0))：可以在发起更新请求时，乐观的直接更新本地数据。减少等待时间。  
- [条件请求]([https://swr.bootcss.com/docs/conditional-fetching](https://swr.bootcss.com/docs/conditional-fetching))：可以很智能的链式依赖的条件请求数据，捕获 promise 错误

  

-   [自动重新请求](https://swr.bootcss.com/docs/revalidation)：自动重新请求，窗口获得焦点、网络重新连接时重新请求，可以使得应用及时获得最新数据。及时更新状态。
-   [自动错误重试](https://swr.bootcss.com/docs/error-handling#%E9%94%99%E8%AF%AF%E9%87%8D%E8%AF%95)：自动错误重试，不用处理错误
-   [乐观更新](https://swr.bootcss.com/docs/mutation#%E4%B9%90%E8%A7%82%E6%9B%B4%E6%96%B0)：可以在发起更新请求时，乐观的直接更新本地数据。减少等待时间。
-   [条件请求](https://swr.bootcss.com/docs/conditional-fetching)：可以很智能的链式依赖的条件请求数据，捕获 promise 错误


都是为了能够把副作用数据变为可靠的输入  

## useSWR虽然好，但也不是万能的


目前在使用过程中，总结出

1.  普通的 post，意义不大
2.  灵活度不高
3.  有一些 bug

  

这时候可以考虑一下国产平替版：ahooks的useRequest。可以理解为半自动的useSWR。

## ahooks的useRequest，一个半自动的useSWR

[https://ahooks.js.org/zh-CN/hooks/use-request/index](https://ahooks.js.org/zh-CN/hooks/use-request/index)

useRequest 是一个强大的异步数据管理的 Hooks，React 项目中的网络请求场景使用 useRequest 就够了。

useRequest 通过插件式组织代码，核心代码极其简单，并且可以很方便的扩展出更高级的功能。目前已有能力包括：

1.  自动请求/手动请求
2.  轮询
3.  防抖
4.  节流
5.  屏幕聚焦重新请求
6.  错误重试
7.  loading delay
8.  SWR(stale-while-revalidate)
9.  缓存

有需要去文档细看，这里不再赘述

  

# 函数式组件开发原则

通过对swr的理解，可以总结出一部分的函数式编程原则

  

## 一、提取副作用

React 中的函数式编程，就是一个提取副作用的过程。尽可能的不要在业务代码中使用 useEffect，减少业务代码里面的副作用，如果有，最好提出去，封装成自定义 hooks，保证业务代码的纯函数特性

类似useSWR提取请求接口这个副作用，其他的数据也应该通过封装自定义hooks的方式把数据变成可靠的输入，如url参数、localstorage等。然后通过在业务组件中热插拔的方式，插入业务组件库中。这样才是函数式编程的理想状态。

所以遇到副作用，尽可能的提取到自定义hooks中，业务代码里尽量不要有useEffect。

  

## 二、用自定义hooks代替props传递数据

尽可能的少用 props 传递数据，而是利用 hooks 热插拔的特性注入数据

hooks出来之后，redux的useSelector全面替代了connect。hooks注入数据的方式更适合函数式编程。过多的props，特别是作为中间组件把props从父组件传递给子孙组件的这种情况，会导致不必要代码增多。props太多也会造成额外的组件更新。

如：开发一个比较庞大的组件，层级比较深，有些props只有层级比较深的组件采用到，那么也必须从顶至下层层传递props。这时候可以利用createContext，给全局组件注入props，然后再使用的地方消费对应的props即可。

  

## 三、单一数据源

尽可能的少定义内部状态，最好是一个状态定义整个组件的表现。多个状态容易出现冲突的问题。

useSWR带来了订阅接口数据或者数据库数据的能力，那么我们就可以直接拿远程的数据来映射到jsx。而不是在本地定义几个state来存储接口数据、状态。

以此类推。我们编写函数式组件的时候，也尽量不要定义太多state（数据源）。最好是单个state来决定组件的输出。减少数据冲突的可能性。