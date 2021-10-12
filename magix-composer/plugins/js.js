/*
    总入口，因为模板、样式最终都依附在js文件中
 */
let path = require('path');
let fs = require('fs');
let chalk = require('chalk');
let fd = require('./util-fd');
let jsContent = require('./js-content');
let deps = require('./util-deps');
let configs = require('./util-config');
//let cssChecker = require('./checker-css');
//let { styleDependReg } = require('./util-const');
//文件处理
let processFile = (from, to, inwatch) => { // d:\a\b.js  d:\c\d.js
    return new Promise((resolve, reject) => {
        from = path.resolve(from);
        to = path.resolve(to);
        let promise = Promise.resolve();
        // if (inwatch) {
        //     if (styleDependReg.test(from)) {
        //         cssChecker.resetByStyle(from);
        //     } else if (configs.jsFileExtNamesReg.test(from)) {
        //         cssChecker.resetByHost(from);
        //     } else if (configs.tmplFileExtNamesReg.test(from)) {
        //         cssChecker.resetByTemplate(from);
        //     }
        // }
        if (inwatch && deps.inDependents(from)) {
            promise = deps.runFileDepend(from);
        }
        if (fs.existsSync(from) &&
            configs.jsFileExtNamesReg.test(from)
        ) {
            promise.then(() => {
                return jsContent.process(from, to, 0, inwatch);
            }).then(e => {
                if (inwatch) {
                    console.log('[MXC Tip(js)] finish:', chalk.green(from));
                }
                if (!e.isSnippet) {
                    to = to.replace(configs.jsFileExtNamesReg, m => {
                        // if (m.length > 3 && m[1] === 'm') {
                        //     return '.mjs';
                        // }
                        return '.js';
                    });
                    configs.writeFileStart(e);
                    fd.write(to, e.content);
                } else if (e.galleryConfigFile) {
                    if (inwatch &&
                        deps.inConfigDependents(from)) {
                        return deps.runConfigDepend(from);
                    }
                }
                return Promise.resolve();
            }).then(resolve).catch(reject);
        } else {
            promise.then(resolve, reject);
        }
    });
};
module.exports = deps.setContext({
    process: processFile
});