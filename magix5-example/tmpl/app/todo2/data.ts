import Mediator from '../../provider/mediator';

let todoKey = 'magix5-example-todo';
export default {
    setup(view: Magix5.View) {
        if (!Mediator.has(todoKey)) {
            Mediator.get(todoKey, {
                todos: []
            });
            view.on('destroy', () => {
                Mediator.remove(todoKey)
            });
        }
    },
    observeKeys(view: Magix5.View, keys: string[]) {
        let data = Mediator.get(todoKey);
        let update = e => {
            let find;
            for (let k of keys) {
                if (e.changed[k]) {
                    find = 1;
                    break;
                }
            }
            if (find) {
                view.render();
            }
        };
        data.on('update', update);
        view.on('destroy', () => {
            data.off('update', update);
        });
    },
    observeState(view: Magix5.View) {
        let mediator = Mediator.get(todoKey);
        let update = view.render.bind(view);
        mediator.on('state', update);
        view.on('destroy', () => {
            mediator.off('state', update);
        });
    },
    queryChanged() {
        let mediator = Mediator.get(todoKey);
        return mediator.queryChanged();
    },
    queryState() {
        let mediator = Mediator.get(todoKey);
        return mediator.queryAsyncState();
    },
    queryData(key?: string) {
        return Mediator.get(todoKey).get(key);
    },
    removeAt(at) {
        let data = Mediator.get(todoKey);
        let todoList = data.get('todos');
        todoList.splice(at, 1);
        data.set('todos', todoList);
    },
    setComplete(at, complete) {
        let data = Mediator.get(todoKey);
        let todoList = data.get('todos');
        let todo = todoList[at];
        todo.complete = complete;
        data.set('todos', todoList);
    },
    addTask(task) {
        let data = Mediator.get(todoKey);
        let todoList = data.get('todos');
        data.asyncIncrease();
        //data.suspend();
        setTimeout(() => {
            todoList.unshift({
                task
            });
            data.set('todos', todoList);
            data.asyncDecrease();
            //data.resume();
        }, 3000);
    },
    queryCompletedList() {
        let data = Mediator.get(todoKey);
        let todoList = data.get('todos');
        let newList = [];
        for (let todo of todoList) {
            if (todo.complete) {
                newList.push(todo);
            }
        }
        return newList;
    }
};