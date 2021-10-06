import Magix from 'magix';
import Data from './data';

'ref@:./index.less';
let { View } = Magix;
export default View.extend({
    tmpl: '@:./state.html',
    init() {
        Data.setup(this, ['todos']);
    },
    async render() {
        let data = Data.getData();
        this.digest({
            all: data.todos.length,
            completed: Data.queryCompletedList().length
        });
    }
});