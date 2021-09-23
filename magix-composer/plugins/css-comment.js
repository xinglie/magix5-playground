let utils = require('./util');
let regexp = require('./util-rcache');
let { cssRegexpKey } = require('./util-const');
let cssCommentReg = /\/\*[\s\S]+?\*\//g;
module.exports = {
    store(css, refStore) {
        let key = utils.uId('\x00', css);
        let count = 0;
        css = css.replace(cssCommentReg, m => {
            let k = '/*' + key + '$' + (count++) + '*/';
            refStore[k] = m;
            return k;
        });
        refStore[cssRegexpKey] = regexp.get(regexp.escape('/*' + key) + '\\$\\d+\\*\\/', 'g');
        return css;
    },
    recover(css, refStore) {
        css = css.replace(refStore[cssRegexpKey], m => {
            return refStore[m] || '';
        });
        return css;
    },
    clean(css) {
        return css.replace(cssCommentReg, '');
    }
};