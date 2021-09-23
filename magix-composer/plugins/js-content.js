/*
    js内容处理
    mx单文件转换->开始编译钩子(beforeProcessor,es6->es3)->js中的@规则识别及代码检查->处理样式->处理模板->处理js代码片断->编译结束钩子->缓存文件内容
 */
let chalk = require('chalk');
let fd = require('./util-fd');
let jsMx = require('./js-mx');
let jsDeps = require('./js-deps');
let cssChecker = require('./checker-css');
let cssProcessor = require('./css');
let tmplProcessor = require('./tmpl');
let atpath = require('./util-atpath');
let jsWrapper = require('./js-wrapper');
let configs = require('./util-config');
let md5 = require('./util-md5');
let utils = require('./util');

let fileCache = require('./js-fcache');
let jsSnippet = require('./js-snippet');
let jsReplacer = require('./js-replacer');
let jsHeader = require('./js-header');
let acorn = require('./js-acorn');
let { galleryProcessed,
    revisableGReg,
    atViewPrefix,
    revisableTail,
    selfCssRefReg } = require('./util-const');
let deps = require('./util-deps');
//let httpProtocolReg = /^['"`]https?:/i;

let lineBreakReg = /\r\n?|\n|\u2028|\u2029/;
let mxTailReg = /\.m?mx$/;
let stringReg = /^['"]/;
//文件内容处理，主要是把各个处理模块串起来
let moduleIdReg = /@:(?:moduleId|id)/;
let cssFileReg = /@:(?:[\w\.\-\/\\]+?)\.(?:css|less|mx|style)/;
let cssFileGlobalReg = new RegExp(cssFileReg, 'g');
let jsFileReg = /([a-z,&]+)?@:([\w\.\-\/\\]+\.(?:m?[jt]s))/;
//let doubleAtReg = /@@/g;
let isGalleryConfig = file => {
    let cfg = configs.galleriesDynamicRequires[file];
    if (cfg) {
        delete cfg[galleryProcessed];
        let files = deps.getConfigDependents(file);
        for (let p in files) {
            fileCache.clear(p);
        }
        return true;
    }
    return false;
};
let isExcludeFile = file => {
    let ex = false;
    for (let r of configs.excludesReg) {
        if (r.test(file)) {
            ex = true;
            break;
        }
    }
    return ex;
};
/*
    '#snippet';
    '#exclude(define,beforeProcessor,after)';
 */
let processContent = (from, to, content, inwatch) => {
    if (!content) content = fd.read(from);
    let contentInfo;
    if (mxTailReg.test(from)) {
        contentInfo = jsMx.process(content, from);
        content = contentInfo.script;
    }

    let headers = jsHeader(content);
    content = headers.content;

    let key = [inwatch, headers.addWrapper].join('\x00');
    let fInfo = fileCache.get(from, key);
    if (fInfo) {
        return Promise.resolve(fInfo);
    }
    let before = Promise.resolve(content);
    let moduleId = utils.extractModuleId(from);
    let psychic = {
        fileDeps: {},
        uniqueId: utils.uId('\x00', from),
        to,
        from,
        moduleId,
        debug: configs.debug,
        content,
        exclude: isExcludeFile(from),
        pkgName: moduleId.slice(0, moduleId.indexOf('/')),
        moduleFileName: moduleId.substring(moduleId.lastIndexOf('/') + 1),
        shortFrom: from.replace(configs.commonFolder, '').substring(1),
        addWrapper: headers.addWrapper,
        checker: configs.checker,
        loader: headers.loader || configs.loaderType,
        loaderFactory: configs.loaderFactory,
        isSnippet: headers.isSnippet,
        exRequires: headers.exRequires,
        noRequires: headers.noRequires,
        processContent
    };
    if (isGalleryConfig(from)) {
        if (inwatch) {
            console.log('[MXC Tip(js-content)] reload:', chalk.blue(from));
        }
        delete require.cache[from];
        psychic.galleryConfigFile = true;
        psychic.isSnippet = true;
        return Promise.resolve(psychic);
    }
    if (psychic.exclude) {
        headers.ignoreAllProcessor = true;
        psychic.addWrapper = false;
    }
    psychic.exRequires.push(`"${moduleId}"`);
    //let originalContent = content;
    if (headers.execBeforeProcessor) {
        //console.log(content);
        let result = configs.compileJSStart(content, psychic);
        //console.log(result);
        if (utils.isString(result)) {
            before = Promise.resolve(result);
        } else if (result && utils.isFunction(result.then)) {
            before = result;
        }
    }
    if (inwatch) {
        console.log('[MXC Tip(js-content)] compile:', chalk.blue(from));
    }
    return before.then(content => {
        if (utils.isString(content)) {
            psychic.content = content;
        }
        return jsDeps.process(psychic);
    }).then(e => {
        //console.log(e.content);
        let newRequires = [];
        if (!e.noRequires) {
            for (let req of e.requires) {
                req = req.slice(1, -1);
                let idx = req.indexOf('/');
                let mName = idx === -1 ? null : req.substring(0, idx);
                let p, full;
                if (mName === e.pkgName) {
                    p = atpath.resolvePath(`"${atViewPrefix}${req}"`, e.moduleId);
                } else {
                    p = `"${req}"`;
                }
                full = atpath.resolvePath(`"${atViewPrefix}${p.slice(1, -1)}"`, e.moduleId);
                if (e.exRequires.indexOf(p) == -1 &&
                    e.exRequires.indexOf(full) == -1 &&
                    newRequires.indexOf(p) == -1 &&
                    newRequires.indexOf(full) == -1) {
                    newRequires.push(`"${req}"`);
                }
            }
        }
        e.requires.length = 0;
        e.requires.push(...newRequires);
        return Promise.resolve(e);
    }).then(e => {
        if (headers.ignoreAllProcessor) {
            return Promise.resolve(e);
        }
        let tmpl = e.addWrapper ? jsWrapper(e) : e.content;
        let ast;
        try {
            ast = acorn.parse(tmpl, null, e.from);
        } catch (ex) {
            let msg = [chalk.red(`[MXC Error(js-content)]`), 'Parse js ast error:', chalk.red(ex.message)];
            let arr = tmpl.split(lineBreakReg);
            let line = ex.loc.line - 1;
            if (arr[line]) {
                msg.push('near code:', chalk.green(arr[line]));
            }
            msg.push(chalk.red('js file: ' + e.from));
            console.log(...msg);
            return Promise.reject(ex);
        }
        let modifiers = [];
        let toTops = [];
        let toBottoms = [];
        let processString = (node, tl) => { //存储字符串，减少分析干扰
            if (!tl) {
                if (!stringReg.test(node.raw)) return;
            }
            let add = false;
            let raw = node.raw;
            node.raw = raw.replace(revisableGReg, m => {
                add = true;
                if (configs.debug) {
                    return m.slice(0, -1) + revisableTail + '}';
                }
                return md5(m, 'revisableString', configs.revisableStringPrefix);
            });
            raw = node.raw;
            if (moduleIdReg.test(raw)) {
                let m = raw.match(moduleIdReg);
                let c = raw[0] + m[0] + raw[0];
                if (tl || c == raw) {
                    raw = tl ? e.moduleId : raw[0] + e.moduleId + raw[0];
                    node.raw = raw;
                    add = true;
                }
            } else if (configs.fileReplacerPrefixesReg.test(raw)) {
                let m = raw.match(configs.fileReplacerPrefixesReg);
                let c = raw[0] + m[0] + raw[0];
                if (tl || c == raw) {
                    node.raw = raw.replace('@', '\x12@');
                    add = true;
                }
            } else if (cssFileReg.test(raw)) {
                node.raw = raw.replace(cssFileGlobalReg, (m, offset) => {
                    //let c = raw.charAt(offset - 1);
                    //if (c == '@') return m.substring(1);
                    return m.replace('@', '\x12@');
                });//.replace(doubleAtReg, '@');
                add = true;
            } else if (configs.htmlFileReg.test(raw)) {
                let m = raw.match(configs.htmlFileReg);
                let c = raw[0] + m[0] + raw[0];
                if (tl || c == raw) {
                    node.raw = raw.replace(configs.htmlFileGlobalReg, m => {
                        return m.replace('@', `\x12@`);
                    });
                    add = true;
                }
            } else if (jsFileReg.test(raw)) {
                let m = raw.match(jsFileReg);
                let c = raw[0] + m[0] + raw[0];
                if (tl || c == raw) {
                    let replacement = '';
                    raw.replace(jsFileReg, (m, actions, file) => {
                        if (actions) {
                            actions = actions.split(',');
                            let toTop = false, toBottom = false;
                            for (let a of actions) {
                                if (a == 'top') {
                                    if (!toBottom) {
                                        toTop = true;
                                    }
                                } else if (a == 'bottom') {
                                    if (!toTop) {
                                        toBottom = true;
                                    }
                                }
                            }
                            replacement = JSON.stringify('@' + file).replace('@', '\x12@');
                            if (toTop) {
                                toTops.push(replacement);
                                replacement = '';
                                if (tl) {
                                    node.start--;
                                    node.end++;
                                }
                            } else if (toBottom) {
                                toBottoms.push(replacement);
                                replacement = '';
                                if (tl) {
                                    node.start--;
                                    node.end++;
                                }
                            }
                        } else {
                            replacement = raw.replace(/@/g, '\x12@');
                        }
                    });
                    node.raw = replacement;
                    add = true;
                }
            } else {
                // //字符串以@开头，且包含/
                if (!tl) {
                    raw = raw.slice(1, -1);
                }
                let prefix = raw.substring(0, atViewPrefix.length);
                let rest = raw.substring(atViewPrefix.length);
                if (prefix == atViewPrefix) {
                    if (rest.startsWith('./') ||
                        rest.startsWith('../')) {
                        //console.log(rest);
                        raw = atpath.resolvePath(`"${atViewPrefix}${rest}"`, e.moduleId);
                        if (tl) {
                            raw = raw.slice(1, -1);
                        }
                        //console.log(raw);
                        node.raw = raw;
                        add = true;
                    } else if (rest.startsWith('~')) {
                        let newRest = configs.resolveVirtual(rest);
                        if (newRest &&
                            newRest != rest) {
                            let dest = JSON.stringify(newRest);
                            //console.log(dest, tl);
                            if (tl) {
                                dest = dest.slice(1, -1);
                            }
                            node.raw = dest;
                            add = true;
                        }
                    }
                }
            }
            if (add) {
                modifiers.push({
                    start: node.start,
                    end: node.end,
                    content: node.raw
                });
            }
        };
        acorn.walk(ast, {
            Property(node) {
                if (node.key.type == 'Literal') {
                    processString(node.key);
                }
            },
            Literal: processString,
            TemplateLiteral(node) {
                for (let q of node.quasis) {
                    q.raw = q.value.raw;
                    processString(q, true);
                }
            },
            ObjectPattern(node) {
                for (let p of node.properties) {
                    if (p.type == 'Property' &&
                        p.key.type == 'Literal') {
                        processString(p.key);
                    }
                }
            }
        });
        modifiers.sort((a, b) => { //根据start大小排序，这样修改后的fn才是正确的
            return a.start - b.start;
        });
        for (let i = modifiers.length - 1, m; i >= 0; i--) {
            m = modifiers[i];
            tmpl = tmpl.substring(0, m.start) + m.content + tmpl.substring(m.end);
        }
        if (toTops.length) {
            tmpl = toTops.join(';\r\n') + '\r\n' + tmpl;
        }
        if (toBottoms.length) {
            tmpl = tmpl + '\r\n' + toBottoms.join(';\r\n');
        }
        e.content = tmpl;
        //console.log(tmpl);
        return Promise.resolve(e);
    }).then(e => {
        return jsReplacer(e);
    }).then(e => {
        if (headers.ignoreAllProcessor) {
            return Promise.resolve(e);
        }
        return jsSnippet(e);
    }).then(e => {
        if (headers.ignoreAllProcessor) {
            return Promise.resolve(e);
        }
        if (contentInfo) e.contentInfo = contentInfo;
        return cssProcessor(e);
    }).then(e => {
        if (headers.ignoreAllProcessor) {
            return Promise.resolve(e);
        }
        return tmplProcessor(e);
    }).then(e => {
        if (e.addedWrapper) {
            let mxViews = e.tmplMxViewsArray || [];
            let addDeps = configs.tmplAddViewsToDependencies;
            if (e.noRequires || !addDeps) mxViews = [];
            mxViews = mxViews.concat(e.tmplComponents || []);
            //console.log(e.tmplMxViewsArray);
            let reqs = [],
                vars = [];
            for (let v of mxViews) {
                let i = v.indexOf('/');
                let mName = i === -1 ? v : v.substring(0, i);
                let p, full;
                if (mName === e.pkgName) {
                    p = atpath.resolvePath(`"${atViewPrefix}${v}"`, e.moduleId);
                    full = v[0] == '@' ? p : atpath.resolvePath(`"${atViewPrefix}${p.slice(1, -1)}"`, e.moduleId);
                    //console.log(full);
                } else {
                    full = v;
                    p = `"${v}"`;
                }
                if (e.deps.indexOf(p) === -1 &&
                    e.deps.indexOf(full) === -1 &&
                    e.exRequires.indexOf(p) === -1 &&
                    e.exRequires.indexOf(full) == -1) {
                    let prefix = '',
                        type = '';
                    if (e.loader == 'module') {
                        prefix = 'import ';
                        type = 'import';
                    } else {
                        type = 'require';
                    }
                    let reqInfo = {
                        prefix,
                        type,
                        tail: ';',
                        vId: '',
                        mId: p.slice(1, -1),
                        full,
                        from: 'view',
                        raw: 'mx-view="' + v + '"'
                    };
                    let replacement = jsDeps.getReqReplacement(reqInfo, e, true);
                    vars.push(replacement);
                    if (reqInfo.mId) {
                        let dId = JSON.stringify(reqInfo.mId);
                        reqs.push(dId);
                    }
                }
            }
            reqs = reqs.join(',');
            if (e.requires.length && reqs) {
                reqs = ',' + reqs;
            }
            if (e.quickStaticVars) {
                for (let v of e.quickStaticVars) {
                    let c = `let ${v.key}`;
                    if (v.value) {
                        c += `=${v.value}`;
                    }
                    c += ';';
                    vars.push(c);
                }
            }
            e.content = e.content.replace(e.requiresAnchorKey, reqs);
            e.content = e.content.replace(e.varsAnchorKey, vars.join('\r\n'));
        }
        return e;
    }).then(e => {
        e.content = e.content.replace(selfCssRefReg, (_, key) => {
            if (key.startsWith('--')) {
                let replacement = e.cssVarsMap[key];
                let dest = e.declaredFiles.vars[key];
                if (replacement && dest) {
                    cssChecker.storeHostUsed(e.from, dest, {
                        vars: {
                            [key]: 1
                        }
                    });
                    return replacement;
                } else {
                    if (configs.selectorSilentErrorCss) {
                        return key;
                    }
                    return `unfound-var-[${key}]`;
                }
            } else {
                let replacement = e.cssNamesMap[key];
                let dest = e.declaredFiles.selectors[key];
                if (replacement && dest) {
                    cssChecker.storeHostUsed(e.from, dest, {
                        selectors: {
                            [key]: 1
                        }
                    });
                    return replacement;
                } else {
                    if (configs.selectorSilentErrorCss) {
                        return key;
                    }
                    return `unfound-selector-[${key}]`;
                }
            }
        });
        return e;
    }).then(e => {
        let after = Promise.resolve(e);
        if (headers.execAfterProcessor) {
            let processor = configs.compileJSEnd;
            let result = processor(e.content, e);
            if (utils.isString(result)) {
                e.content = result;
            } else if (result && utils.isFunction(result.then)) {
                after = result.then(temp => {
                    if (utils.isString(temp)) {
                        e.content = temp;
                        temp = e;
                    }
                    return Promise.resolve(temp);
                });
            }
        }
        return after;
    }).then(e => {
        fileCache.add(e.from, key, e);
        return e;
    });
};
module.exports = {
    process: processContent
};