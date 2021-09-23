import Magix from 'magix';

let { View } = Magix;
export default View.extend({
    tmpl: '@:./index.html',
    async render() {
        this.digest();
    }
});