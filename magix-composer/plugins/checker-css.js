let configs = require('./util-config');
let consts = require('./util-const');
let chalk = require('chalk');

let ItemUsed = 1;
let ItemDeclared = 2;
let ItemSecondhand = 4;
//文件之间关系，主要通过js关联的html和css
let FileRelationships = Object.create(null);
//记录js文件中，如@scoped.style:--css-var使用的选择器，变量等
let FileHostUsed = Object.create(null);
//记录样式文件声明了哪些选择器，变量及@规则
let FileStylesDeclared = Object.create(null);
//记录模板文件中使用了哪些选择器，css变量
let FileTemplatesUsed = Object.create(null);
//追踪不存在的文件
let FileUnexists = Object.create(null);
//记录样式文件中["ref@:path.css:selector"]使用的选择器或变量
let FileStylesUsed = Object.create(null);
//记录复杂的样式
let FileStylesComplex = Object.create(null);
//记录使用过的全局变量
let FileStylesGlobalVarUsed = Object.create(null);

module.exports = {
    reset() {
        //文件之间关系，主要通过js关联的html和css
        FileRelationships = Object.create(null);
        //记录js文件中，如@scoped.style:--css-var使用的选择器，变量等
        FileHostUsed = Object.create(null);
        //记录样式文件声明了哪些选择器，变量及@规则
        FileStylesDeclared = Object.create(null);
        //记录模板文件中使用了哪些选择器，css变量
        FileTemplatesUsed = Object.create(null);
        //追踪不存在的文件
        FileUnexists = Object.create(null);
        //记录样式文件中["ref@:path.css:selector"]使用的选择器或变量
        FileStylesUsed = Object.create(null);
        //记录复杂的样式
        FileStylesComplex = Object.create(null);
        //记录使用过的全局变量
        FileStylesGlobalVarUsed = Object.create(null);
    },
    resetByHost(from) {
        // let ship = FileRelationships[from];
        // if (ship &&
        //     ship.templates) {
        //     for (let p in ship.templates) {
        //         delete FileTemplatesUsed[p];
        //     }
        // }
        delete FileRelationships[from];
        delete FileHostUsed[from];
        delete FileUnexists[from];
    },
    resetByTemplate(from) {
        delete FileTemplatesUsed[from];
    },
    resetByStyle(from) {
        delete FileStylesDeclared[from];
        delete FileStylesUsed[from];
        delete FileStylesComplex[from];
        delete FileStylesGlobalVarUsed[from];
    },
    resetUnexist(host) {
        delete FileUnexists[host];
    },
    storeStyleGlobalVars(host, vars) {
        let info = FileStylesGlobalVarUsed[host];
        if (!info) {
            info = FileStylesGlobalVarUsed[host] = Object.create(null);
        }
        info[vars] = ItemUsed;
    },
    storeUnexist(host, name) {
        FileUnexists[host] = name;
    },
    storeStyleDeclared(file, declares) {
        /*
            declares:{
                vars:{},
                selectors:{},
                tagsOrAttrs:{}
            }
        */
        let info = FileStylesDeclared[file];
        if (!info) {
            info = FileStylesDeclared[file] = {
                vars: Object.create(null),
                selectors: Object.create(null),
                tagsOrAttrs: Object.create(null),
                atRules: Object.create(null)
            };
        }
        if (declares.selectors) {
            Object.assign(info.selectors, declares.selectors);
        }
        if (declares.vars) {
            Object.assign(info.vars, declares.vars);
        }
        if (declares.tagsOrAttrs) {
            Object.assign(info.tagsOrAttrs, declares.tagsOrAttrs);
        }
        if (declares.atRules) {
            Object.assign(info.atRules, declares.atRules);
        }
    },
    storeTemplateUsed(file, used) {
        /*
            used:{
                vars:{},
                selectors:{}
            }
        */
        let info = FileTemplatesUsed[file];
        if (!info) {
            info = FileTemplatesUsed[file] = {
                vars: Object.create(null),
                selectors: Object.create(null),
                tagsOrAttrs: Object.create(null),
                atRules: Object.create(null)
            };
        }
        if (used.selectors) {
            Object.assign(info.selectors, used.selectors);
        }
        if (used.vars) {
            Object.assign(info.vars, used.vars);
        }
        if (used.tagsOrAttrs) {
            Object.assign(info.tagsOrAttrs, used.tagsOrAttrs);
        }
        if (used.atRules) {
            Object.assign(info.atRules, used.atRules);
        }
    },
    storeStyleUsed(host, file, used) {
        let info = FileStylesUsed[host];
        if (!info) {
            info = FileStylesUsed[host] = Object.create(null);
        }
        info = info[file];
        if (!info) {
            info = FileStylesUsed[host][file] = {
                selectors: Object.create(null),
                vars: Object.create(null),
                atRules: Object.create(null)
            };
        }
        if (used.selectors) {
            Object.assign(info.selectors, used.selectors);
        }
        if (used.vars) {
            Object.assign(info.vars, used.vars);
        }
        if (used.atRules) {
            Object.assign(info.atRules, used.atRules);
        }
    },
    storeStyleComplex(file, rules) {
        FileStylesComplex[file] = rules;
    },
    storeHostUsed(host, file, used) {
        /*
            used:{
                vars:{},
                selectors:{}
            }
        */
        let info = FileHostUsed[host];
        if (!info) {
            info = FileHostUsed[host] = Object.create(null);
        }
        info = info[file];
        if (!info) {
            info = FileHostUsed[host][file] = {
                vars: Object.create(null),
                selectors: Object.create(null),
                atRules: Object.create(null)
            };
        }
        if (used.selectors) {
            Object.assign(info.selectors, used.selectors);
        }
        if (used.vars) {
            Object.assign(info.vars, used.vars);
        }
        if (used.atRules) {
            Object.assign(info.atRules, used.atRules);
        }
    },
    hostAddTemplate(host, template) {
        if (!FileRelationships[host]) {
            FileRelationships[host] = {
                templates: Object.create(null),
                styles: Object.create(null)
            };
        }
        FileRelationships[host].templates[template] = 1;
    },
    hostAddStyle(host, style) {
        if (!FileRelationships[host]) {
            FileRelationships[host] = {
                templates: Object.create(null),
                styles: Object.create(null)
            };
        }
        let dest = FileRelationships[host].styles;
        if (dest[style] == null) {
            let keys = Object.keys(dest);
            dest[style] = keys.length;
        }
    },
    output() {
        //debugger;
        if (!configs.checker.css || !configs.debug) return;
        let declared = Object.create(null);
        for (let p in FileStylesDeclared) {
            let init = {};
            let t = FileStylesDeclared[p];
            for (let i in t) {
                init[i] = Object.create(null);
                for (let z in t[i]) {
                    init[i][z] = ItemDeclared;
                }
            }
            declared[p] = init;
        }
        let updateStyleUsed = (style, used, un, locker) => {
            let dest = declared[style];
            for (let p in used) {
                if (locker && !locker[p]) locker[p] = Object.create(null);
                for (let z in used[p]) {
                    if (dest &&
                        dest[p][z]) {
                        if (!locker || locker[p][z] != ItemSecondhand) {
                            if (configs.selectorDSEndReg.test(z)) {
                                for (let f in dest[p]) {
                                    if (f.startsWith(z)) {
                                        dest[p][f] |= ItemUsed;
                                    }
                                }
                            } else {
                                dest[p][z] |= ItemUsed;
                            }
                            if (locker) {
                                locker[p][z] = ItemSecondhand;
                            }
                        }
                    } else if (un) {
                        if (!un[p]) {
                            un[p] = Object.create(null);
                        }
                        un[p][z] = ItemUsed;
                    }
                }
            }
        };
        let sortStyles = styles => {
            let result = [];
            for (let p in styles) {
                result.push({
                    num: styles[p],
                    file: p
                });
            }
            result = result.sort((a, b) => b.num - a.num);
            return result;
        };
        let usedGlobalVars = Object.create(null);
        let updateGlobalVars = vars => {
            let result = false;
            let prefixes = [...configs.cssGlobalVarPrefixes, consts.cssScopedVarPrefix];
            for (let prefix of prefixes) {
                if (vars.startsWith(prefix)) {
                    for (let host in FileStylesGlobalVarUsed) {
                        let dest = FileStylesGlobalVarUsed[host];
                        if (!usedGlobalVars[host]) {
                            usedGlobalVars[host] = Object.create(null);
                        }
                        if (dest[vars]) {
                            usedGlobalVars[host][vars] = ItemDeclared;
                            result = true;
                        }
                    }
                    break;
                }
            }
            return result;
        };
        let templateUsed = Object.create(null);
        for (let fr in FileRelationships) {
            let { styles, templates } = FileRelationships[fr];
            styles = sortStyles(styles);
            for (let template in templates) {
                let used = FileTemplatesUsed[template];
                templateUsed[template] = Object.create(null);
                if (used) {
                    for (let style of styles) {
                        updateStyleUsed(style.file, used, null, templateUsed[template]);
                    }
                }
            }
        }
        let unexist = Object.create(null);
        for (let fhu in FileHostUsed) {
            unexist[fhu] = Object.create(null);
            let s = FileHostUsed[fhu];
            for (let style in s) {
                unexist[fhu][style] = Object.create(null);
                updateStyleUsed(style, s[style], unexist[fhu][style]);
            }
        }
        for (let fsu in FileStylesUsed) {
            unexist[fsu] = Object.create(null);
            let fileWrap = FileStylesUsed[fsu];
            for (let style in fileWrap) {
                let styleWrap = fileWrap[style];
                unexist[fsu][style] = Object.create(null);
                updateStyleUsed(style, styleWrap, unexist[fsu][style]);
            }
        }

        for (let host in unexist) {
            let dest = unexist[host];
            let hostShort = host.replace(configs.commonFolder, '').substring(1);
            for (let aim in dest) {
                let selectors = dest[aim];
                let aimShort = aim.replace(configs.commonFolder, '').substring(1);
                for (let selector in selectors) {
                    for (let key in selectors[selector]) {
                        console.log('[MXC(checker)]', chalk.grey(hostShort), 'use unexist or unapplied', chalk.red(key), 'from', chalk.grey(aimShort));
                    }
                }
            }
        }
        for (let p in FileStylesComplex) {
            let short = p.replace(configs.commonFolder, '').substring(1);
            let rules = FileStylesComplex[p];
            console.log('[MXC(checker)]', chalk.grey(short) + ' avoid use ' + chalk.red(`"${rules.join('","')}"`));
        }

        for (let fn in declared) {
            let selectors = declared[fn];
            let short = fn.replace(configs.commonFolder, '').substring(1);
            let neverUsedSelectors = [],
                neverUsedTagsOrAttrs = [],
                neverUsedVars = [],
                neverUsedAtRules = [];
            for (let selector in selectors) {
                let dest = selectors[selector];
                for (let key in dest) {
                    if ((dest[key] & ItemUsed) != ItemUsed &&
                        !configs.selectorDSEndReg.test(key)) {
                        if (selector == 'selectors') {
                            neverUsedSelectors.push('.' + key);
                        } else if (selector == 'vars') {
                            if (!updateGlobalVars(key)) {
                                neverUsedVars.push(key);
                            }
                        } else if (selector == 'tagsOrAttrs') {
                            neverUsedTagsOrAttrs.push(key);
                        } else if (selector == 'atRules') {
                            neverUsedAtRules.push(key);
                        }
                    }
                }
            }
            if (neverUsedSelectors.length) {
                console.log('[MXC(checker)]', chalk.grey(short) + ' never used selectors ' + chalk.red(`"${neverUsedSelectors.join('","')}"`));
            }
            if (neverUsedTagsOrAttrs.length) {
                console.log('[MXC(checker)]', chalk.grey(short) + ' never used tags or attrs ' + chalk.red(`"${neverUsedTagsOrAttrs.join('","')}"`));
            }
            if (neverUsedVars.length) {
                console.log('[MXC(checker)]', chalk.grey(short) + ' never used vars(properties) ' + chalk.red(`"${neverUsedVars.join('","')}"`));
            }
            if (neverUsedAtRules.length) {
                console.log('[MXC(checker)]', chalk.grey(short) + ' never used at rules ' + chalk.red(`"${neverUsedAtRules.join('","')}"`));
            }
        }

        for (let host in FileTemplatesUsed) {
            let short = host.replace(configs.commonFolder, '').substring(1);
            let dest = FileTemplatesUsed[host];
            let undeclared = [];
            let tUsed = templateUsed[host];
            if (dest.selectors) {
                for (let p in dest.selectors) {
                    if (!tUsed ||
                        !tUsed.selectors ||
                        tUsed.selectors[p] !== ItemSecondhand) {
                        undeclared.push('.' + p);
                    }
                }
            }
            if (dest.vars) {
                for (let p in dest.vars) {
                    if (!tUsed ||
                        !tUsed.vars ||
                        tUsed.vars[p] !== ItemSecondhand) {
                        undeclared.push('var(' + p + ')');
                    }
                }
            }
            if (undeclared.length) {
                debugger;
                console.log('[MXC(checker)]', chalk.grey(short), 'used undeclared', chalk.red(`"${undeclared.join('","')}"`));
            }
        }
        for (let fu in FileUnexists) {
            let short = fu.replace(configs.commonFolder, '').substring(1);
            console.log('[MXC(checker)]', chalk.grey(short), 'can not find', chalk.red(FileUnexists[fu]));
        }
        for (let host in FileStylesGlobalVarUsed) {
            let short = host.replace(configs.commonFolder, '').substring(1);
            let dest = FileStylesGlobalVarUsed[host];
            let used = usedGlobalVars[host];
            for (let key in dest) {
                if (!used ||
                    used[key] != ItemDeclared) {
                    console.log('[MXC(checker)]', chalk.grey(short), 'used undeclared', chalk.red(key));
                }
            }
        }
    }
}