import Magix from 'magix';
import Data from './data';
'ref@:./index.less';
let { View } = Magix;
export default View.extend({
    tmpl: '@:./list.html',
    init() {
        Data.setup(this, ['todos']);
    },
    async render() {
        let data = Data.getData();
        this.digest(data);
    },
    async 'removeTaskAt<click>'(e: Magix5.MagixMouseEvent) {
        let { index } = e.params;
        Data.removeAt(index);
    },
    'changeTaskStatus<change>'(e: Magix5.MagixMouseEvent) {
        let { index } = e.params;
        Data.setComplete(index, (e.eventTarget as HTMLInputElement).checked);
    }
});