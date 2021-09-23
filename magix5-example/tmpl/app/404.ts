import Magix from 'magix';

let { View } = Magix;
export default View.extend({
    tmpl: '@:./404.html',
    async render() {
        this.digest();
    }
});