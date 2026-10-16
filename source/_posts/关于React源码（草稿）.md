---
title: 关于React源码学习（草稿）
date: 2020-11-21 17:05:24
tags: [总结,React]
---

最近尝试学习React的源码，学习阶段，先建个草稿，记录片段。




# 正文

个人觉得，React很多处代码都是异步执行的，不能像其他仓库一样从入口文件开始调试。学习React源码则得从好几个入口切入。

## 阶段

React更新时会分为两个阶段[render阶段与commit阶段](https://github.com/mbaxszy7/blog/issues/16)

### render阶段

在render阶段，React将更新应用于通过setState或render方法触发的组件，并确定需要在用户屏幕上做哪些更新--哪些节点需要插入，更新或删除，哪些组件需要调用其生命周期方法。最终的这些更新信息被保存在一个叫`effect list`的fiber 节点树上。当然，在首次渲染时，React不需要产生任何更新信息，而是会给每个从render方法返回的element生成一个fiber节点，最终生成一个fiber节点树， 后续的更新也是复用了这棵fiber树。

 render阶段被标记为纯的、没有副作用的，可能会被React暂停、终止或者重新执行。也就是说，React会根据产生的任务的优先级，安排任务的调度（schedule）。利用类似requestIdleCallback的原理在浏览器空闲阶段进行更新计算，而不会阻塞动画，事件等的执行。

 render阶段开始与`beginWork`，终止与`completeWork`

#### 遍历过程

React会从根节点开始往子节点遍历。处理完当前节点后，会以一下顺序往下遍历

1. 是否有子节点，如果有，则下一条子节点
2. 是否有兄弟节点，如果有，则下一条兄弟节点
3. 是否有父节点（return），只有根节点没有父节点。

####  beginWork

[beginWork-kasong](https://kasong.gitee.io/just-react/process/beginWork.html#%E6%96%B9%E6%B3%95%E6%A6%82%E8%A7%88)

beginWork发生于遍历到节点时。beginWork分为两种情况。mount或者是update时（根据current是否等于null）

update: 会根据diff算法。判断current fiber的`子节点`是否能复用。如能，则复用节点，不能则重新创建。
mount：则会根据类型重新创建`子fiber节点`。

### commit阶段

在这个阶段时，React内部会有三个fiber树：

```text
current fiber tree: 在首次渲染时，React不需要产生任何更新信息，而是会给每个从render方法返回的element生成一个fiber节点，最终生成一个fiber节点树， 后续的更新也是复用了这棵fiber树。

workInProgress fiber tree: 
所有的更新计算工作都在workInProgress tree的fiber上执行。当React 遍历current fiber tree时，它为每个current fiber 创建一个替代（alternate）节点，这样的alternate节点构成了workInProgress tree

effect list fiber tree: workInProgress fiber tree 的子树，这个树的作用串联了标记具有更新的节点
```

commit阶段会遍历effect list，把所有更新都commit到DOM树上。具体的，首先会有一个pre-commit阶段，主要是执行getSnapshotBeforeUpdate方法，可以获取当前DOM的快照（snap）。然后给需要卸载的组件执行componentWillUnmount方法。接着会把current fiber tree 替换为workInProgress fiber tree。最后执行DOM的插入、更新和删除，给更新的组件执行componentDidUpdate，给插入的组件执行componentDidMount。

重点要注意的是，这一阶段是同步执行的，不能中止。


`commitRoot`方法是commit阶段工作的起点

#### commit阶段的三个流程

##### before mutation阶段（执行DOM操作前）

调用`getSnapshotBeforeUpdate`。commit是同步的，所以不会存在componentWillXXX可能会调用多次的问题

此处`异步`调用useEffect，（原处变量名为`flushPassiveEffects`）

##### mutation阶段（执行DOM操作）

##### layout阶段（执行DOM操作后）



## React.createElement

## ReactDOM.render

首次调用render，会给传入的container添加一个参数:\_reactRootContainer。然后下面又有个:\_internalRoot，这个对象包含着所谓的`fiberRootNode`，是整个应用的根节点。

fiberRootNode的current参数，存储着这个应用的fiber链表的第一个节点。

此时的fiber节点还是树状结构，也就是传说中的`虚拟dom`



## fiber

## Update

## Hook

### useEffect的触发时机

1. 在`commit阶段中的 before mutation阶段`，在`scheduleCallback`中调度`flushhPassiveEffects`
2. `commit阶段中的layout阶段`之后，将`effectList`赋值给`rootWithPendingPassiveEffects`
3. `scheduleCallback回调`触发`flushPassiveEffects`，`flushPassiveEffects`内部遍历`rootWithPendingPassiveEffects`

# 链接

[React技术揭秘-卡颂](https://react.iamkasong.com/)

