
let attrUri = require('./tmpl-attr-uri');
let hrefAttrReg = /\bhref\s*=\s*(['"])([^'"]*?)\1/;

module.exports = (e, tagName, match, refTmplCommands) => {
    if (tagName == 'a' || tagName == 'area') {
        if (hrefAttrReg.test(match)) {
            return attrUri(match, e, refTmplCommands, hrefAttrReg, 'href');
        }
    }
    return match;
};