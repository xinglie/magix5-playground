import Magix from 'magix';
import FormSync from '../../gallery/mx-form/sync';
export default Magix.View.extend({
    tmpl: '@:./form-inner.html',
    init() {
        this.set({
            inputContent1: 'initial content',
            inputContent2: ''
        });
    },
    assign(data) {
        this.set(data);
    },
    render() {
        this.digest();
    },
    '@:{dispatch}<click>'() {
        Magix.dispatch(this.root, 'change', {
            inputContent1: this.get('inputContent1'),
            inputContent2: this.get('inputContent2')
        });
    }
}).merge(FormSync);