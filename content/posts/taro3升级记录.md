---
title: taro3升级记录
date: 2020-11-19 22:07:05
tags: [总结,Taro3,微信小程序]
---

目前主要的工作内容是围绕一个基于Taro1开发的微信小程序，过程中遇到了很多的坑。最重要的是，Taro1主要通过对类 React 代码进行语法编译转换地方式，所以，实际上，本质上不是React，很多细节上是与React有区别的。

为了让以后的开发与主流开发不会有太大的割裂，决定用空余时间，给现在的项目，升级到Taro3.

升级Taro3主要能带来几点好处：

1. 重写的架构能让Taro真正的利用React来开发小程序，享受完整的React功能。甚至还能用Vue2、Vue3来开发。
2. 采用Webpack4打包构建，速度更快，更主流，更多定制。抽离公共代码，打包压缩代码更小。


# 升级流程

官方是提供了教程升级的，但是实际操作起来，几乎没有办法进行下去，也许是因为项目以及非常庞大，卡顿，才失败，但是确实没法升级。

[Taro版本升级权威指南](https://aotu.io/notes/2020/08/31/taro-versions/index.html)

[官方文档指南](http://taro-docs.jd.com/taro/docs/migration)

后来换了个思路，把原来的项目static/src代码都删除，然后用官方的脚手架(@tarojs/cli)新建一个项目，然后再把业务代码一点一点的搬进去，后来证明这样实现起来更简单。

## 1. 全局安装Taro3

	npm install @tarojs/cli@3.0.16 -g
	
## 2. 初始化项目

删除原有代码（当然要有备份）

	rimraf static

初始化

	taro init

按需选择与之前框架一样的选项(React\mobx\less)

## 迁移代码

把原有代码迁移到新建的项目里，当然是跑不起来，然后一个一个错误去解决。

### 配置文件修改

原来的项目配置基本上可以照搬过来。需要改的是

* 添加字段`framework: 'react',`
* 原来的weapp作为小程序配置，改为mini
* webpackChain字段可以用webpackChain修改webpack配置

```javascript
	// moment包过大，不打包除了中文语言包以外的语言包
	chain
        .plugin('contentReplacement')
        .use(webpack.ContextReplacementPlugin, [/moment[/\\]locale$/, /zh-cn/]);
		
	// 按需引用分析plugin
	 chain
         .plugin('analyzer')
         .use(require('webpack-bundle-analyzer').BundleAnalyzerPlugin, []);
```

配置postcss autoprefixer

	autoprefixer: {
        enable: true,
        config: {
          overrideBrowserslist: [
            'last 3 versions',
            'Android >= 4.1',
            'ios >= 8',
          ],
        },
      },

### 页面配置文件

页面配置不再是在组件的config静态属性上。而是单独的一个同名的.config.ts文件。配置项基本一致。照搬就行。

删除组件静态.option属性

### mobx的store注入方式不一样。

假设store对象如下

	const store = {
		aStore: aStore,
		bStore: bStore
	}

原来的写法是
	
	<Provider store={store}><App /></Provider>
	
现在的写法是

	<Provider aStore={aStore} bStore={bStore><App /></Provider>
	
一个简写方式

	<Provider {...store}><App /></Provider>
	
这样才能在.jsx文件里@inject('aStore')。

### 切换到React

Taro3所有React相关的都得从 react 包导出，@tarojs/taro 不再提供

只要是React提供的方法，则都从react包导入，其他还在@tarojs/taro里

```javascript
import Taro, {useDIdShow, useDidHide} from '@tarojs/taro';
import {View, Text} from '@tarojs/components';
import React, {useEffect, useState} from 'react';
```

### 获取router，组件实例修改

路由信息不再在this里，也没有this.$scope。路由信息得在Taro.getCurrentInstance().router里。

类组件可以用this指代当前组件实例，但是函数组件无法获取当前组件实例。（react的要求)

### 趁机切换eslint

跟目录安装eslint

	npm install eslint
	
eslint初始化

	./node_modules/.bin/eslint --init

初始化根据情况选择配置，初始化后，会生成一个eslint.config文件。按需配置eslint

***配置贴在文末***
	

然后package.json里配置script，即可

"eslint": "eslint --ext .js,.jsx,.ts,.tsx ./ --cache"
"fix:eslint": "eslint --ext .js,.jsx,.ts,.tsx ./ --cache --fix"


### css都变成了全局

Taro3没有 组件的外部样式和全局样式 的概念，所有css都变成了全局css，业务中需要挨个调整。

好处是，全局样式终于可以统一引入了。不需要每个文件都要单独引用

## 不再有Taro.getApp();

没有了Taro.getApp()。所以，变量直接就存储在Taro对象下！！！

## 没有了$preload

没有替代方案，只能重写逻辑！！！

## 路由传参自动encode

Taro3的路由参数，自动进行了一次encodeUriComponent，所以取参时，最好都进行一遍decodeUriComponent。不然url、中文不能正常使用

# 其他细节

## key值的不一样

Taro1在JSX中的key应该是字符串，与小程序语法一致。Taro3因为是React，所以都应该改为变量

## 没有了组件名选择器

Taro1编译成小程序wxml还有组件概念，以组件名字作为选择器可以选择到。Taro3编译成wxml没有了组件隔开，合成整体的一份wxml所以组件名选择器无效，需修改

## 组件props可以传递JSX

Taro1不能，Taro3可以！！！

## 变量 && JSX会打印变量的问题


## 三目运算符渲染JSX的问题

本地原生React测试，没有问题！

# 其他的坑

## 引入公共css的问题

webpack会把引用了两次以上的css文件合并打包到common.wxss里，并放到跟目录，并且在app.less统一引入。如果源码中没有创建app.less文件，则Taro3也不会创建新的，统一引用common.wxss，所以会导致全局样式没有引用的问题。


## 引入原生小程序代码

不再能用ref获取原生小程序代码写的组件

需改用[selectComponent](http://taro-docs.jd.com/taro/docs/mini-third-party#selectcomponent)获取小程序组件实例。且有个bug，再componentDidMount生命周期中获取会失败。一般循环延迟获取。

	import { getCurrentInstance } from '@tarojs/taro'

	
	const timer = setInterval(() => {
		const { page } = getCurrentInstance()
		const el = page.selectComponent('#mychart-dom-area')
		if (el) {
			clearInterval(timer);
			this.el = el;
		}
	})

且，每个用到原生组件的组件与页面都需要`usingComponents`

如page1 => component1 => raw-component1

则page1和component1的配置文件都需要配置usingComponents

# 一些额外的成果

* 利用analysis-bundle-plugin分析包体积，利用dayjs替换momentjs。使得包体积从2086kb减少到2023kb。减少63kb代码。babel-preset-env去除codejs，代码包减少十几kb
* 通过修改url-loader，把所有图片弄到远程。代码从2002kb减少到1898kb。并且后面添加的图片即可以版本管理，又可以剥离源代码。

# 遗留问题

1. eslint与prettier冲突

# eslint配置

```json

module.exports = {
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  extends: [
    'eslint-config-airbnb',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'prettier/@typescript-eslint',
  ],
  globals: {
    __STATIC_CONFIG__: 'readonly',
    __DEV__: 'readonly',
    wx: 'readonly',
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2018,
    sourceType: 'module',
    useJSXTextNode: true,
  },
  plugins: ['react', '@typescript-eslint', 'prettier', 'react-hooks'],
  rules: {
    'react/prop-types': 'off',
    'prettier/prettier': 'error',
    'global-require': 'off',
    semi: ['error', 'always'],
    quotes: ['error', 'single'],
    'guard-for-in': 'off',
    'no-unused-expressions': [
      'error',
      {
        allowTernary: true,
        allowShortCircuit: true,
        allowTaggedTemplates: true,
      },
    ],
    'spaced-comment': ['error', 'always', { markers: ['/'] }],
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    'import/no-dynamic-require': 'off',
    'import/prefer-default-export': 'off',
    'import/no-extraneous-dependencies': 'off',
    'no-shadow': 'off',
    'no-console': 'off', // 后期禁止error
    'no-nested-ternary': 'off',
    'no-underscore-dangle': 'off',
    'no-restricted-syntax': 'off',
    'no-param-reassign': 'off',
    'no-continue': 'off',
    'no-restricted-globals': 'off',
    'dot-notation': 'off',
    'linebreak-style': ['error', 'unix'],
    'jsx-a11y/click-events-have-key-events': 'off',
    'jsx-a11y/no-static-element-interactions': 'off',
    'react-hooks/rules-of-hooks': 1,
    'react-hooks/exhaustive-deps': 1,
    'react/jsx-wrap-multilines': 'off',
    'react/jsx-filename-extension': 'off',
    'react/jsx-props-no-spreading': 'off',
    'react/destructuring-assignment': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/no-deprecated': 'off',
    'react/static-property-placement': 'off',
    'react/jsx-one-expression-per-line': 'off',
    'react/state-in-constructor': 'off',
    'react/sort-comp': 'off',
    'react/require-default-props': 'off', // 后期去掉，太多了
    'consistent-return': 'off',
    'no-void': 'off', // TODO: 看看之后有没有办法修改掉
    'no-plusplus': 'off',
    'class-methods-use-this': 'off', // TODO: 有没有必要限制？
    'react/jsx-closing-bracket-location': 'off', // prettier冲突
    'react/jsx-boolean-value': 'off', // prettier冲突
    'react/jsx-curly-newline': 'off', // prettier冲突
    '@typescript-eslint/no-empty-function': [
      'error',
      {
        allow: ['arrowFunctions'],
      },
    ],
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/ban-ts-ignore': 'off',
    '@typescript-eslint/no-triple-slash-reference': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-member-accessibility': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-use-before-define': [
      'error',
      {
        variables: false,
        functions: false,
      },
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        vars: 'all',
        args: 'after-used',
        ignoreRestSiblings: true,
        varsIgnorePattern: '^Taro',
        argsIgnorePattern: '^_',
      },
    ],
  },
};


```

