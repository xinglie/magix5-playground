/*
    author:https://github.com/xinglie
*/
import Magix from 'magix';
import Data from './data';
let { View, applyStyle, State } = Magix;
applyStyle('@:./index.less');
export default View.extend({
    tmpl: '@:index.html',
    init() {
        Data.setup(this);
        window.$todo = Data;
    },
    //这里接收外部数据
    assign(data) {
        this.set(data);
    },
    async render() {
        await this.digest();
    },
});