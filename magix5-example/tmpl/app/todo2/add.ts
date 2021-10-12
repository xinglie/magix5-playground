'ref@:./index.less';

import Magix from 'magix';
import Data from './data';
let { View } = Magix;
export default View.extend({
    tmpl: '@:./add.html',
    init() {
        Data.observeKeys(this, ['todos']);
        this.set({
            task: ''
        });
    },
    render() {
        this.digest();
    },
    'watchInput<input>'(e: InputEvent & Magix5.MagixKeyboardEvent) {
        let { eventTarget } = e;
        let v = (eventTarget as HTMLInputElement).value.trim();
        this.set({
            task: v
        });
    },
    'watchKeydown<keydown>'(e: Magix5.MagixKeyboardEvent) {
        let { code } = e;
        if (code == 'Enter') {
            let v = this.get('task');
            this.digest({
                task: ''
            });
            if (v) {
                Data.addTask(v);
            }
        }
    },
});