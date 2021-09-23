/*
    属性处理总入口
 */
let attrMxEvent = require('./tmpl-attr-mxevent');
let attrMxView = require('./tmpl-attr-mxview');
let attrLink = require('./tmpl-attr-link');
let checkerTmpl = require('./checker-tmpl');
let tmplClass = require('./tmpl-attr-class');
let tmplCmd = require('./tmpl-cmd');
let tagReg = /<([\w\-:]+)(?:"[^"]*"|'[^']*'|[^'">])*>/g;
let removeTempReg = /[\x02\x01\x03\x06\x10]\.?/g;
let artCtrlsReg = /<%'\x17\d+\x11([^\x11]+)\x11\x17'%>(<%[\s\S]+?%>)/g;
module.exports = {
    process(fileContent, e, refTmplCommands, cssNamesMap) {
        let toSrc = expr => {
            expr = tmplCmd.recover(expr, refTmplCommands);
            return expr.replace(removeTempReg, '').replace(artCtrlsReg, '{{$1}}');
        };
        return fileContent.replace(tagReg, (match, tagName) => { //标签进入
            match = attrMxEvent(e, match, refTmplCommands, toSrc);
            match = attrMxView(e, match, refTmplCommands);
            match = attrLink(e, tagName, match, refTmplCommands);
            match = tmplClass(tagName, match, cssNamesMap, refTmplCommands, e, toSrc);
            match = checkerTmpl.checkTag(e, match, toSrc);
            return match;
        });
    }
};