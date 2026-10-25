---
title: Next.js可行性调研
date: 2022-09-09 16:30:24
tags: [总结,Next.js]
---

最近我司要对渲染引擎做重构，需要做同构。再React生态中，要做同构肯定绕不开Next.js。所以花了点时间对Next.js做了个可行性调研。调研完总结一下。

渲染引擎是一个专门渲染低代码平台（编辑器）创建的作品的一个H5应用。

demo见[github](https://github.com/HelloWorld20/nextjs-demo)

# 需求

开会讨论后总结了下与Next.js相关的几个需求

1. 可以输出纯静态文件，方便私有化
2. 生产环境取消服务端渲染，改为所有静态资源走CDN，以达到最大并发量。
3. 未发布的作品可以走服务端渲染

# 概念与实践

Next.js有几大概念：**SSG、SSR、ISR、CSR**

-   **SSG**
**static site generation**，也称之为static generation。其作用是可以在构建过程中生成静态资源文件

-   **SSR**
**server-side rendering**。传统意义上的服务端渲染。next.js在接收到请求时，组合数据与React组件，生成html、传递给前端。

-   **ISR**
**Incremental Static Regeneration**。增量静态渲染。next.js在构建的时候生成html等静态文件（缓存）。在请求的时候，对已经过期页面重新构建，并且覆盖旧缓存。未过期的页面直接返回缓存。

-   **CSR**
**Client-side Rendering**。客户端渲染。Next.js中指的是客户端注水过程。

### 关于api

**getServerSideProps**

在页面路由文件中导出此方法时，这个页面就是个SSR页面，每次请求时，会调用getServerSideProps方法获取props，并且把props与jsx结合生成html，返回给前端

**getStaticProps**

在页面路由文件中导出此方法时，这个页面就是个SSG页面。此方法会在构建过程中被调用，返回props以及其他参数，并且把props与jsx结合生成html文件，存储在跟目录**.next文件夹**里。

另外，此方法可以返回一个revalidate参数，那么此页面就是ISR。这时会以revalidate参数作为过期时间，对过期的html页面进行更新。

**getStaticPaths**

此方法也是在构建过程中调用，作用是决定哪些页面需要被创建生成html文件

```shell
λ  (Server)  server-side renders at runtime (uses getInitialProps or getServerSideProps)
○  (Static)  automatically rendered as static HTML (uses no initial props)
●  (SSG)     automatically generated as static HTML + JSON (uses getStaticProps)
   (ISR)     incremental static regeneration (uses revalidate in getStaticProps)
```


### 关于next cli

**next dev**

开发环境，会启动开发服务器。比较特别的是，getStaticProps、getStaticPaths也会在请求的时候调用，方便开发过程中测试所有情况。

**next build**

构建过程，会在此过程调用getStaticProps、getStaticPaths。根据这两个方法的存在与否与返回值，来决定是否要生成静态资源文件（缓存）

**next start**

生产环境，生产中使用的环境。如果开启了SSG、则必须要先运行next build。并且会根据revalidate参数来增强式构建单个页面文件（缓存）

**next export**

前面提到的SSG生成的静态资源文件都属于缓存，存在于**.next文件夹**中。如需要将静态文件上传到对象存储，则需要运行next export。运行后会在**out文件夹**生成完整的可运行的静态资源文件。

# Next.js在项目上的使用

*我司渲染引擎的地址是https://host/m2/xxx。其中xxx是作品id。通过id去后台查询作品数据并渲染。*

所以也需要实现一样的接口。

1. 初始化项目（略）
2. 新建m2/xxx页面路由
新建一个动态路由文件`/pages/m2/[id].tsx`，并且写入最简单的组件渲染逻辑

```jsx
import Cmp from '../../components/cmp/cmp';

export default function App() {
	const page = props.data.pages[0];
	const cmps = page.cmps;

	return <div>
		<section>
	      {
	        cmps.map(cmp => <Cmp key={cmp.id} data={cmp} />)
	      }
	    </section>
	</div>
}

```

3. 新增**getServerSideProps**方法并导出

```jsx
export function async getServerSideProps({req, res}) {
    const res = await fetch('http://host/app'+id);
    return {
        props: res
    }
}
```

此时访问http://localhost:3000/m2/xxx即可预览作品。

简单的基于SSR的渲染引擎就好了

### SSG：

既然用了Next.js那肯定得用上SSG才能发挥其作用。在文件中**删除getServerSideProps**，**新增getStaticProps**


```jsx

export async function getStaticProps(context) {
 
  const key = context.params.id;
 
  if (!key) return { props: { data: null } }
 
  let appData = {}
 
  try {
    // 可改成api获取或者数据库获取
    appData = require(`../../datas/${key}`);
  } catch (error) {
    appData = { data: null }
  }
 
  return {
    props: {
      data: appData,
    }
  }
}

```

然后运行next build，即可在**.next文件夹**内生成静态文件（缓存）

再运行next export，即可在**out文件夹**内生成可部署的静态文件。

但是此时并没有生成对应作品的静态资源 ，只生成404、about等文件。这时需要新增getStaticPaths来指定要生成什么文件。

```jsx
export async function getStaticPaths() {
 
  const paths = ['/m2/FyscxU88Muv', '/m2/FyscyO15roC']
  return {
    // 决定哪些页面需要被pre-render
    paths,
    fallback: 'blocking',
  }
}
```

这样就能生成指定作品的可发布的静态数据文件了

out/m2会看到两个文件:FyscxU88Muv.html与FyscyO15roC.html

### 构建可发布静态文件的一种改造
因为getStaticPaths是业务代码的一部分，会受到版本控制，不方便构建时修改。所以可以把paths参数改造为配置的形式


```jsx
export async function getStaticPaths() {    
 
  const res = fs.readFileSync('./pages/m2/build', { encoding: 'utf-8' })
  const ids = res.split('\n');
  const paths = ids.map(id => `/m2/${id}`)
 
  return {
    // 决定哪些页面需要被pre-render
    paths,
    fallback: 'blocking',
  }
}

```

```txt
FyscxU88Muv
FyscyO15roC
```

固定的paths改为读取配置文件。

构建时，先读取构建参数，再把参数写入build文件，然后getStatcPaths解析build文件，来达到动态构建的目的。

### ISR:

ISR是SSG的基础上加上按需自动构建的功能。要开启只需再getStaticProps的返回值上加上revalidate，参数是数字，代表n秒后过期。

首次构建后会生成静态文件（缓存），在过期时间内，会直接复用缓存。

过期后请求，则**next生产服务器**会在后台自动重新构建发起请求的页面。

  

![A diagram of the request flow for Incremental Static Regeneration](https://res.cloudinary.com/indysigner/image/fetch/f_auto,q_80/w_400/https://cloud.netlifyusercontent.com/assets/344dbf88-fdf9-42bb-adb4-46f01eedd629/a9d6ec1f-b714-4102-b845-0986bfc65417/regeneration-regeneration-nextjs.png)

  

### On-Demand Revalidation（按需重验证/构建）:

由过期时间控制缓存不太符合业务场景，Next.js提供了手动刷新缓存的功能。

需要定义一个api路由：

```javascript
// pages/api/revalidate.js
/**
 * On-Demond ISR 案例
 * 需要在api路由，调用res.revalidate方法即可，需要传入需要revalidate的路由
 */
export default async function handler(req, res) {
  console.log('[Next.js] Revalidating...');
  let revalidated = false;
  try {
    await res.revalidate('/m2/12');
    revalidated = true;
  } catch (err) {
    console.error(err);
  }
 
  res.json({ revalidated })
}
```

在回调函数中调用res.revalidate()方法即可指定清除某个页面的缓存。

```jsx
import Cmp from '../../components/cmp/cmp'
 
export default function App(props) {
  const page = props.data.pages[0];
  const cmps = page.cmps;
 
  function revalidate() {
    fetch('/api/revalidate');
  }
 
  return <div>
    <button onClick={() => revalidate()}>Revalidate</button>
    <section>
      {
        cmps.map(cmp => <Cmp key={cmp.id} data={cmp} />)
      }
    </section>
  </div>
}
```

# 四. 优缺点

优点：

1.  官方框架、生态成熟，不太会担心有坑
2.  直出html，无空白页面，交互体验良好。自带SSG，可把静态文件部署到CDN，最大化并发量与访问速度
3.  内置图片优化、字体优化以及其他内置优化，使得交互体验会非常良好。对SEO、Core Web Vitals都有优化

缺点：

1.  仅支持React技术栈
2.  对服务器的计算压力于存储压力会增加不少
3.  业务上不是特别的契合新渲染引擎。Next.js完美契合的业务是博客、wiki、电商商品详情那种类型。新渲染引擎在按需打包静态文件、ISR的缓存文件只能在本地，不能用CDN等一些情况不适合。
4.  选择不同的渲染方式采用在业务代码中导出不同的方法以及方法的返回值**运行时控制**，而不是命令式或者和配置文件的方式，很不方便扩展，不方便工程化。

无法满足的业务场景：

1.  ISR用到的缓存是存在服务器内，无法利用CDN作为缓存。长期来说缓存会非常大，占用大量空间。解决办法可以写脚本定期清理。仅在非发布的情况下使用ISR
2.  构建生产可发布的静态文件数据（next export）需要占用本地空间。并发量大后可能会非常消耗性能。且不同进程会冲突。

# 五. 总结

Next.js在React同构直出上是个非常优秀的框架，在开发体验、性能、社区活跃度上都是非常优秀的。但是对于新渲染引擎来说在业务契合度上不是很高。需要对Next.js进行一定的改造才能满足新渲染引擎的需求。