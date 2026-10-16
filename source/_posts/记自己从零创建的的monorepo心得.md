---
title: 记自己从零创建的的monorepo心得
date: 2021-03-10 14:13:48
tags: [总结,yarn, workspace,monorepo]
---

# 前言

在工作中遇到了用lerna和yarn workspace为基础创建的monorepo项目，而且也有幸研究了一番他们的代码并且在自己的工作项目中改造了一番。虽然最终放弃应用在项目中，但是觉得monorepo可以利用在我个人的项目中。把我个人的前端项目、后端服务、工具函数、工具类项目都整合到一个monorepo中。最大化的复用代码，模块化代码。

# yarn workspace与lerna

我对lerna与yarn workspace的探索路径是这样的。一开始，是从公司的项目和公司大佬的介绍中，了解到monorepo的概念和lerna这个工具。于是乎去Google一番、也了解到monorepo的概念与优缺点。并且在工作的项目中进行了一番改造。

但是在进行过程中，遇到不少问题。比如

* lerna bootstrap（安装、关联依赖）太慢。
* 给某个模块安装依赖、太麻烦。。语法与npm、yarn不一样、还得去搜，还搜不到
* 相关文档还是略少
* 等等

然后过了一段时间、另一位大佬分享了自己的monorepo项目，从lerna换成了yarn workspace，说是不需要上传npm，其实用不到lerna

....

好吧，之前直接就是 lerna 加上默认的npm，没去了解lerna + yarn workspace。

然后现在再返过来去了解一下yarn workspace

发现，其实yarn workspace就满足我的需求（除了上传到npm），而且实现的更好（毕竟之前用过yarn）

所以最后，用的yarn workspace去组织我个人的项目代码。

# 正文

首先考虑下如何组织项目，经过多番考虑与修改，可以把包分类3类

* 前端项目：以template-\*命名，以webpack与webpack-dev-server为中心的React项目
* 服务端项目：以server-\*命名，提供RESTful的node（express.js）服务
* 工具类项目：以tools-\*命名，一些提供cli功能的项目，如webpack打包、静态文件上传cdn等工具
* 还有个utils：存放工具函数



## yarn workspace多包项目结构搭建

1. 项目根目录新建一个文件夹`packages`
2. 在packages下初始化项目

	mkdir tools-build
	
	cd tools-build
	
	npm init -y
	
然后打开packages.json，把name字段修改为项目名称即可。

3. 跟目录package.json声明

```json
	"workspaces": [
		"packages/*"
  	],
```

workspaces 接受blob类型参数，以上表示，packages目录下文件夹都是包。业内常见声明也是如此

4. 互相引入依赖项目

貌似yarn workspace的bug。首次引入本地包，必须手动声明版本号

	yarn workspace [packageA] add [packageB]@1.0.0

如果不声明，则会去网络上找包

## 项目类型介绍

目前遇到4种类型的项目，每种项目都有自己的特色，逐条解释

### 工具类项目

此类项目一般是node或者shell脚本。用于服务其他项目。如基于webpack4的前端静态页面打包工具、cdn上传工具等

一般只需package.json声明入口文件`main: "index.js"`，且配置好常用script即可。

### 公共方法库

此类项目一般类似lodash，提供一系列工具函数。一般由typescript编写。

一般会把源码写在src文件夹下，打包生成的文件在lib下。所以package.json入口应该指向打包后的入口文件

	main: "./lib/index.js"

package.json script字段一般提供dev与build命令，如需编辑、则需运行dev模式，以获得文件监听功能。如不需修改，则运行前置依赖项目时需要先运行build命令。

```json
"scripts": {
    "dev": "tsc -p tsconfig.lib.json -w",
    "build": "rimraf ./lib && tsc -p tsconfig.lib.json"
  },
```

#### typscrpt.config.json

用typescript编写则需引入typescript.config.json文件，一般文章末尾所示

### 前端静态项目

一般是经典的基于webpack4、React、typescript的前端项目。重点是webpack的配置，具体看`tools-build`包好了。

此类项目package.json入口无关紧要。script配置一般分为dev、build和上传cdn

```json
"scripts": {
    "dev": "cross-env NODE_ENV=development  webpack-dev-server --config webpack.config.js",
    "build": "cross-env NODE_ENV=development  webpack --config webpack.config.js",
    "upload": "yarn build && node upload.js"
  },
```

### 后端服务类项目

一般是经典的typescript+express.js项目。package.json入口无关紧要，script一般分为dev与build。

dev模式一般用nodemon实现就好，所以dev命令直接就一个`nodemon`

nodemon配置写在项目根目录`nodemon.json`，具体看文章末尾附录

一般生产模式是用pm2运行，生产上肯定要typescript编译后文件，所以类似公共方法库，要把typescript的express.js源码编译为js在放到服务器上运行。

然后，一般dev也需要tsconfig.json文件，生产也需要，一般两者配置不一样。所以dev需要一个tsconfig.json，生产则需要指定一个tsconfig.lib.json。

tsconfig.lib.json配置如附录

```json
"scripts": {
    "build": "tsc -p tsconfig.lib.json",
    "dev": "nodemon"
  },
```

## 询问试启动项目

项目多了，那么会带来一些问题。

* 命令太多，记不住
* 每次运行的项目可能不一样，可能同时运行多个，需要手动跑命令
* 运行多个项目时，必须开多个终端

所以需要引入`inquirer`、`chalk`、`concurrent`，生成一个询问试启动项目，减少记忆负担。

# 附录

## 公共方法库的一般tsconfig.json

```json
{
  "compilerOptions": {
    "allowSyntheticDefaultImports": true,
    "baseUrl": "./",
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "lib": ["dom", "es2015", "es2016", "es2017", "es2018", "esnext"],
    "module": "commonjs",
    "moduleResolution": "node",
    "newLine": "lf",
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "downlevelIteration": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "pretty": true,
    "resolveJsonModule": true,
    "sourceMap": true,
    "strict": true,
    "target": "es5",
    "types": ["@types/node"]
  },
  "include": ["src", "test", "scripts", "lib.d.ts"]
}

```

## 后端服务类项目生产tsconfig.json配置

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": true,
    "declarationDir": "lib",
    "outDir": "lib",
    "module": "commonjs",
    "target": "es6"
  },
  "include": ["src", "lib.d.ts"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts"]
}

```

## 后端服务类项目nodemon配置文件

```json
{
    "verbose": true,
    "ext": "ts js",
    "legacyWatch": true,
    "watch": ["./src"],
    "ignore": ["node_modules", "dist"],
    "exec": "node -r ts-node/register --inspect=4005 ./src/index.ts",
    "env": {
      "PORT": 12000,
      "NODE_ENV": "development",
      "RUNTIME_ENV": "dev",
      "DEBUG": "express:*,config,framework*,renderer:*",
      "TS_NODE_CACHE": false,
      "TS_NODE_TYPE_CHECK": true,
      "TS_NODE_FILES": true,
      "TS_NODE_PROJECT": "./tsconfig.json"
    }
  }

```



