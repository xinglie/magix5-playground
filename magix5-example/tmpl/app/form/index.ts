import Magix from 'magix';
import FormSycn from '../../gallery/mx-form/sync';
let { View, applyStyle } = Magix;
applyStyle('@:./index.less');

export default View.extend({
    tmpl: '@:./index.html',
    render() {
        this.digest({
            inputExample: '单选输入框示例',
            list: [{
                id: 1,
                row: 1,
                name: 'row-1'
            }, {
                id: 2,
                row: 2,
                name: 'row-2'
            }],
            checkboxList: ['c1', 'c3'],//数组中有哪些值，界面上具有相同value的checkbox则处于选中状态
            checkboxObject: {//对象形式控制checkbox
                c2: true,
                c3: true
            },
            radioChecked: 'c1',
            singleDropdown: 'o3',
            multiDropdownList: ['o2', 'o4'],
            multiDropdownObject: {
                o3: true
            },
            mxDropdownList: [{
                key: 'a',
                text: '123'
            }, {
                key: 'b',
                text: '456'
            }],
            mxDropdownSelected: 'b',
            viewContent1: 'view content',
            viewContent2: '第二个',
            eventTest: '',
            checkboxIndeterminate: true
        });
    },
    'delRow<click>'(e) {
        let { at } = e.params;
        let list = this.get('list');
        list.splice(at, 1);
        this.digest({
            list
        });
    },
    'addRow<click>'() {
        let list = this.get('list');
        list.push({
            id: Math.random(),
            row: Math.random(),
            name: 'row'
        });
        this.digest({
            list
        });
    },
    'logValue<input>'() {
        console.log(this.get('eventTest'));
    },
    'toggleIndeterminate<click>'() {
        let indet = this.get('checkboxIndeterminate');
        this.digest({
            checkboxIndeterminate: !indet
        })
    },
    'log<click>'() {
        console.log(this.get());
    },
    'logPaste<paste>'(e: ClipboardEvent) {
        //在这里获取剪切板内容或粘贴的文件对象
        console.log(e.clipboardData.getData('text/plain'));
    }
}).merge(FormSycn);