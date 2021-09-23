/*
    at规则的路径转换
 */
let path = require('path');
let sep = path.sep;
let sepRegTmpl = sep.replace(/\\/g, '\\\\');
let sepReg = new RegExp(sepRegTmpl, 'g');
let atReg = /@:((?:\.{1,}\/)+)/g;
let {
    atViewPrefix
} = require('./util-const');
//以@开头的路径转换
let relativePathReg = /(['"])?@:([\s\S]+)(?=\1)/g;
let atPathCache = Object.create(null);
let resolveAtPath = (content, from) => {
    let key = content + '\x00' + from;
    if (atPathCache[key]) {
        return atPathCache[key];
    }
    let folder = from.substring(0, from.lastIndexOf('/') + 1);
    let tp;
    //console.log('enter----', content, folder);
    return atPathCache[key] = content.replace(relativePathReg, (m, q, c) => {
        if (c.charAt(0) == '.') { //以.开头我们认为是相对路径，则转完整模块路径
            tp = path.normalize(folder + c);
            //console.log(tp);
            if (tp.startsWith('.' + sep)) {
                tp = tp.substring(2);
            }
            tp = q + tp;
        } else {
            let t = path.relative(folder, c);
            if (t.charAt(0) != '.' && t.charAt(0) != sep) {
                t = './' + t;
            }
            tp = q + t;
        }
        tp = tp.replace(sepReg, '/');
        return tp;
    });
};
module.exports = {
    resolvePath: resolveAtPath,
    resolveContent(tmpl, moduleId) {
        return tmpl.replace(atReg, (match, parts) => {
            parts = resolveAtPath(`"${atViewPrefix}${parts}"`, moduleId).slice(1, -1);
            return parts;
        });
    }
};