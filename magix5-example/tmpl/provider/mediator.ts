import Magix from 'magix5';
let { Event, mix } = Magix;

function DataMediator(data) {
    this['@:{data}'] = data;
}

mix(DataMediator.prototype, Event, {
    get(key?: string) {
        let src = this['@:{data}'];
        if (key) {
            src = src[key];
        }
        return src;
    },
    set(key: string, value: any) {
        let oldValue = this['@:{data}'][key];
        this['@:{data}'][key] = value;
        this.fire('update', {
            key,
            oldValue,
            newValue: value
        });
    }
});

let DataMediators = Object.create(null);
export default {
    get(key: string, initialData?: Object) {
        let mediator = DataMediators[key];
        if (!mediator) {
            mediator = new DataMediator(initialData || {});
            DataMediators[key] = mediator;
        }
        return mediator;
    },
    has(key: string) {
        return DataMediators[key];
    },
    remove(key: string) {
        delete DataMediators[key];
    }
}