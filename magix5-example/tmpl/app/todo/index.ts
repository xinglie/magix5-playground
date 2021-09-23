/*
    author:https://github.com/xinglie
*/
import Magix from 'magix';
let { View, applyStyle, State } = Magix;
applyStyle('@:./index.less');
export default View.extend({
    tmpl: '@:index.html',
    init() {
        //这里放初始化的数据
        this.set({
            todos: []
        })
    },
    //这里接收外部数据
    assign(data) {
        this.set(data);
    },
    async render() {
        await this.digest();
    },
    async 'watchKeydown<keydown>'(e: Magix5.MagixKeyboardEvent) {
        let { code, eventTarget } = e;
        if (code == 'Enter') {
            let v = (eventTarget as HTMLInputElement).value.trim();
            (eventTarget as HTMLInputElement).value = '';
            let todos = this.get('todos');
            todos.push({
                task: v,
                complete: false
            });
            await this.digest({
                todos
            });
        }
    },
    async 'removeTaskAt<click>'(e: Magix5.MagixMouseEvent) {
        let { index } = e.params;
        let todos = this.get('todos');
        todos.splice(index, 1);
        await this.digest({
            todos
        });
    },
    'changeTaskStatus<change>'(e: Magix5.MagixMouseEvent) {
        let { index } = e.params;
        let todos = this.get('todos');
        let todo = todos[index];
        todo.complete = (e.eventTarget as HTMLInputElement).checked;
        this.digest({
            todos
        });
    }
});