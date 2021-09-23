/*
    全局样式的处理
    1.　不推荐的global样式
    2.　全局scoped样式
    https://github.com/thx/magix-combine/issues/24
 */
let path = require('path');
let configs = require('./util-config');
let cssChecker = require('./checker-css');
let cssRead = require('./css-read');
let cssComment = require('./css-comment');
let {
    cssRefReg
} = require('./util-const');
let cssTransform = require('./css-transform');
let {
    cloneAssign
} = require('./util');
let globalPromise;

let processScope = ctx => {
    let scopedStyle = '';
    let scopedStyles = [];
    let scopedCssNamesMap = Object.create(null);
    let scopedCssVarsMap = Object.create(null);
    let scopedAtRules = Object.create(null);
    let scopedDeclaredInFiles = {
        vars: Object.create(null),
        selectors: Object.create(null),
        atRules: Object.create(null)
    };

    return new Promise((resolve, reject) => { //处理scoped样式
        let list = configs.scopedCss;
        if (!list || !list.length) {
            resolve({
                scopedStyle,
                scopedStyles,
                scopedCssNamesMap,
                scopedCssVarsMap,
                scopedDeclaredInFiles,
                scopedAtRules
            });
        } else {
            //debugger;
            let add = i => {
                let currentFile = i.file;
                let cssNamesKey = cssTransform.genCssNamesKey(configs.debug ? currentFile : 'scoped.style');

                let shortFile = currentFile.replace(configs.commonFolder, '').substring(1);

                if (i.exists && i.content) {
                    let c = cssComment.clean(i.content);
                    c = c.replace(cssRefReg, (m, q, file, ext, selector) => {
                        let s = cssTransform.refProcessor(i.file, file, ext, selector, {
                            globalCssNamesMap: scopedCssNamesMap,
                            globalCssDeclaredFiles: scopedDeclaredInFiles
                        });
                        return s;
                    });
                    try {
                        c = cssTransform.cssContentProcessor(c, {
                            shortFile,
                            file: currentFile,
                            namesKey: cssNamesKey,
                            namesMap: scopedCssNamesMap,
                            varsMap: scopedCssVarsMap
                        });
                        //console.log(c);
                        cloneAssign(scopedAtRules, c.atRules);
                    } catch (e) {
                        reject(e);
                    }
                    cssChecker.storeStyleDeclared(i.file, {
                        vars: c.vars,
                        selectors: c.selectors,
                        tagsOrAttrs: c.tagsOrAttrs,
                        atRules: c.atRules
                    });
                    for (let v in c.vars) {
                        scopedDeclaredInFiles.vars[v] = i.file;
                    }
                    for (let s in c.selectors) {
                        scopedDeclaredInFiles.selectors[s] = i.file;
                    }
                    for (let a in c.atRules) {
                        scopedDeclaredInFiles.atRules[a] = i.file;
                    }
                    scopedStyles.push({
                        css: c.content,
                        map: i.map,
                        short: shortFile,
                        file: currentFile,
                        key: cssNamesKey
                    });
                } else if (!i.exists) { //未找到
                    cssChecker.storeUnexist('/scoped.style', currentFile);
                    scopedStyles.push({
                        css: `.unfound[file="${currentFile}"]{}`,
                        map: i.map,
                        file: currentFile,
                        short: shortFile,
                        key: cssNamesKey
                    });
                }
            };
            let ps = [];
            for (let i = 0, ext; i < list.length; i++) {
                ext = path.extname(list[i]);
                ps.push(cssRead(list[i], ctx.context, '', ext));
            }
            Promise.all(ps).then(rs => {
                for (let i = 0; i < rs.length; i++) {
                    add(rs[i]);
                }
                for (let s of scopedStyles) {
                    scopedStyle += s.css;
                }
                resolve({
                    scopedStyle,
                    scopedStyles,
                    scopedCssNamesMap,
                    scopedCssVarsMap,
                    scopedAtRules,
                    scopedDeclaredInFiles
                });
            }).catch(reject);
        }
    });
};
module.exports = {
    process(info) {
        if (!globalPromise) {
            globalPromise = Promise.resolve(info)
                .then(processScope)
                .then(ctx => {
                    return {
                        style: ctx.scopedStyle,
                        styles: ctx.scopedStyles,
                        namesMap: ctx.scopedCssNamesMap,
                        varsMap: ctx.scopedCssVarsMap,
                        atRules: ctx.scopedAtRules,
                        declaredFiles: ctx.scopedDeclaredInFiles
                    };
                });
        }
        return globalPromise;
    },
    reset(file) {
        let { scopedCssMap } = configs;
        if (file && scopedCssMap && scopedCssMap[file]) {
            globalPromise = null;
            cssChecker.resetUnexist('/scoped.style');
        }
    },
    clear() {
        globalPromise = null;
    }
};