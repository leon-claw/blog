---
title: git的使用总结
date: 2017-11-05 09:20:07
tags: [git]
---

本来之前用的github都是自己一个人用而已，来来去去都是`git pull` `git push`觉得也没什么，但去了新公司之后，代码版本管理是用的git，多人协作一起管理代码点时候，才发现我对git是一无所知。所以趁现在使用git还没有得心应手的时候，写一下平时开发的时候经常需要用到的git命令，对应git命令点使用情形和对应的语法说明。

当然，彻底掌握git才是最彻底的解决办法。[廖雪峰的Git教程](https://www.liaoxuefeng.com/wiki/0013739516305929606dd18361248578c67b8067c8c017b000)是网上能找到最好点git教程了。

## git checkout -- (filename)

```bash
git checkout -- index.hmtl
```

作用是清空某个文件的所有修改，这个命令会在当前分支上最新的提交拿到文件内容并覆盖掉当前文件，不管是删掉还是怎样怎样修改掉，都能“一键还原”。

注意的是，此命令只会清空工作区的修改，暂存区（commit）的内容还在。清空暂存区的话，用“git reset  HEAD file”

## 版本回退

```bash
git reset HEAD~3 --hard
	
git reset --hard 3628164
```


版本回退用的是`git reset`。又两种方式。`回退到前几个记录`和`回退到指定记录`。

回退到前几个记录是在HEAD后面跟数字几，如果回退版本可数版本之前，可以用`^`代替。举个例子

回退到3个版本以前可以用

	git reset HEAD^^^ --hard

或

	git reset HEAD~3 --hard

## [cherry-pick多个](http://www.ruanyifeng.com/blog/2020/04/git-cherry-pick.html)

cherry-pick可以直接把某个commit直接复制到当前分支。非常灵活。

	git cherry-pick \<hash\>

也可以同时cherry-pick多个，语法是：

	cherry-pick \<hash1> \<hash2>

或者范围cherry-pick

	cherry-pick \<hash1>..\<hash2>

意思是，从hash1到hash2的commit都按顺序cherry-pick过来（不包含hash1）。如需包含则

	cherry-pick \<hash1>^..\<hash2>

注意，hash1必须比hash2早。不然会失败。

命令会一个一个pick过来。如遇到冲突，须解决冲突然后再`cherry-pick --continue`继续pick

## gitignore已经关联了的文件

	git rm --cached [filepath]

git rm 命令的功能是删除某个文件且添加到暂存区。之后便也不在关联此文件。换个意思就是，从git中把某个文件删除，并且也移除真实文件。
效果同

```bash
rm [filepath]
	
git add [filepath]
```

加上`--cached`参数，则是，把某个已关联的文件删除，且放到暂存区，但是不影真实文件。那么效果就是，从git中移除某个文件的关联。

## 初始化git仓库并且关联远程

每次都忘记！！！有机会详细解释一下git remote

```shell
git remote add origin git@github.com:[username]/[resposaryName].git
```

## diff不同分支的代码

还是很有用的方法，常见的是diff prod与test，看看是否有代码忘记上线。

```shell
git diff branch1 branch2 [file]
```
第三个参数可以是文件夹，也可以是文件。也可以不填。