import Mediator from '../../provider/mediator';

let todoKey = 'magix5-example-todo';
export default {
    setup(view: Magix5.View, observeKeys?: string[]) {
        let data;
        if (Mediator.has(todoKey)) {
            data = Mediator.get(todoKey);
        } else {
            data = Mediator.get(todoKey, {
                todos: []
            });
            view.on('destroy', () => {
                Mediator.remove(todoKey)
            });
        }
        if (observeKeys) {
            data.on('update', e => {
                if (observeKeys.includes(e.key)) {
                    view.render();
                }
            });
        }
    },
    getData(key?: string) {
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
        todoList.push({
            task
        });
        data.set('todos', todoList);
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