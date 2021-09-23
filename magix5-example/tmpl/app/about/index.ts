import Magix from 'magix';

let { View } = Magix;
export default View.extend({
    tmpl: '@:./index.html',
    assign(data) {
        this.set(data);
    },
    async render() {
        this.digest();
    }
});