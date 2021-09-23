import Magix from 'magix';

let { View } = Magix;
export default View.extend({
    tmpl: '@:./index.html',
    init() {
        this.set({
            total: 600,
            page: 2
        });
    },
    assign(data) {
        this.set(data);
    },
    async render() {
        this.digest();
    },
    'toPage<change>'(e) {
        this.digest({
            page: e.page
        });
    }
});