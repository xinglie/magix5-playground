# magix5-playground
magix5 playground

## 开发
`clone`该仓库后，分别进入`magix-composer`及`magix5-example`通过`npm install`安装依赖

安装完依赖后，在`magix5-example`目录下，运行`gulp watch`进入开发模式，实时监控任务会把`magix5-example/tmpl`目录下的文件编译到`magix5-example/src`目录下，以供浏览器能加载使用。

通过`magix5-example/index-debug.html`查看开发模式下的页面效果。

即：您需要自行安装一个`web server`，能通过http的形式访问到`magix5-playground`目录，该项目不带`web server`，这个需要自行安装哦。

最终通过类似`http://localhost/magix5-playground/magix5-example/index-debug.html`的形式访问开发页面

## 发布
在`magix5-example`目录下，运行`gulp dist`进入发布模式，任务会把`magix5-example/tmpl`目录下的文件编译到`magix5-example/src`目录下，然后再把`magix5-example/src`目录下的文件合并压缩打包到`magix5-example/dist`目录下

最后发布`magix5-example/index.html`及`magix5-example/dist`目录下的文件即可。
