import Magix from 'magix';

let { View, applyStyle, Router } = Magix;
applyStyle('@:./index.less');
export default View.extend({
    tmpl: '@:./index.html',
    init() {
        //所有路由均映射到app/index上，这个里面，我们监听路由变化，这里仅监听path变化即可
        this.observeLocation({
            path: true
        });
    },
    async render() {
        //通过路由对象Router拿到其它信息
        let { path } = Router.parse();
        await this.digest({
            currentTime: new Date().toLocaleString(),
            path: path.substring(1)
        });
    }
})