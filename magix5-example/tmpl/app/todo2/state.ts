import Magix from 'magix';
import Data from './data';

'ref@:./index.less';
let { View } = Magix;
export default View.extend({
    tmpl: '@:./state.html',
    init() {
        Data.observeKeys(this, ['todos']);
        Data.observeState(this);
    },
    async render() {
        let data = Data.queryData();
        this.digest({
            all: data.todos.length,
            completed: Data.queryCompletedList().length,
            state: Data.queryState()
        });
    }
});