import Magix from 'magix';
import Data from './data';
'ref@:./index.less';
let { View } = Magix;
export default View.extend({
    tmpl: '@:./add.html',
    init() {
        Data.setup(this, ['todos']);
    },
    async render() {
        this.digest();
    },
    async 'watchKeydown<keydown>'(e: Magix5.MagixKeyboardEvent) {
        let { code, eventTarget } = e;
        if (code == 'Enter') {
            let v = (eventTarget as HTMLInputElement).value.trim();
            (eventTarget as HTMLInputElement).value = '';
            if (v) {
                Data.addTask(v);
            }
        }
    },
});