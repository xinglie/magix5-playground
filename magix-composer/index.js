let fs = require('fs');
let path = require('path');
let configs = require('./plugins/util-config');
let fd = require('./plugins/util-fd');
let initEnv = require('./plugins/util-init');
let js = require('./plugins/js');
let jsContent = require('./plugins/js-content');
let deps = require('./plugins/util-deps');
let cssChecker = require('./plugins/checker-css');
let cssGlobal = require('./plugins/css-global');
let jsFileCache = require('./plugins/js-fcache');
let tmplNaked = require('./plugins/tmpl-naked');
let md5 = require('./plugins/util-md5');
let jsString = require('./plugins/js-string');
let jsHeader = require('./plugins/js-header');
let utils = require('./plugins/util');
let cssTransform = require('./plugins/css-transform');
let processFileCount = 0;
let combineCount = 0;
let concurrentTask = 1;
// let loading='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';
// let genMsg = (completed, total) => {
//     let len = 40;
//     if (completed > total) completed = total;
//     let percent = completed / total;
//     let cell = Math.round(percent * len);
//     let barLeft = '';
//     for (let i = 0; i < cell; i++) {
//         barLeft += '━';
//     }
//     let barRight = '';
//     for (let i = cell; i < len; i++) {
//         barRight += '━';
//     }
//     let sc = completed + '';
//     let st = total + '';
//     let diff = st.length - sc.length;
//     while (diff) {
//         sc = ' ' + sc;
//         diff--;
//     }
//     return sc + '/' + st + ' ' + chalk.blue(barLeft) + chalk.grey(barRight) + ' ' + (percent * 100).toFixed(2) + '%';
// };
module.exports = {
    walk: fd.walk,
    readFile: fd.read,
    copyFile: fd.copy,
    writeFile: fd.write,
    removeFile(from) {
        initEnv();
        from = path.resolve(from);
        deps.removeFileDepend(from);
        let to = path.resolve(configs.compiledFolder + from.replace(configs.commonFolder, ''));
        if (fs.existsSync(to)) {
            fs.unlinkSync(to);
        }
        this.removeCache(from);
    },
    removeCache(from) {
        from = path.resolve(from);
        jsFileCache.clear(from);
        cssGlobal.reset(from);
        cssChecker.resetByHost(from);
        cssChecker.resetByTemplate(from);
        cssChecker.resetByStyle(from);
    },
    config(cfg) {
        if (cfg) {
            for (let p in cfg) {
                if (p !== 'checker' &&
                    p != 'galleries' &&
                    p != 'components' &&
                    p != 'revisableStringMap') {
                    configs[p] = cfg[p];
                }
            }
            let scopedCssMap = Object.create(null);
            configs.scopedCss = configs.scopedCss.map(p => {
                p = path.resolve(p);
                scopedCssMap[p] = 1;
                return p;
            });
            configs.scopedCssMap = scopedCssMap;
            let specials = [{
                src: 'galleries'
            }, {
                src: 'revisableStringMap'
            }, {
                src: 'components'
            }, {
                src: 'checker'
            }];
            let merge = (aim, src) => {
                if (utils.isObject(src)) {
                    if (!aim) aim = {};
                    for (let p in src) {
                        aim[p] = merge(aim[p], src[p]);
                    }
                    return aim;
                } else {
                    return src;
                }
            };
            if (cfg) {
                for (let s of specials) {
                    if (cfg[s.src] !== undefined) {
                        if (Array.isArray(cfg[s.src])) {
                            for (let v of cfg[s.src]) {
                                configs[s.to || s.src][v] = 1;
                            }
                        } else {
                            configs[s.to || s.src] = merge(configs[s.to || s.src], cfg[s.src]);
                        }
                    }
                }
            }
            if (!configs.checker) {
                configs.checker = {};
            }
        }
        return configs;
    },
    fileList() {
        initEnv();
        if (!this.$processedFileListPromise) {
            this.$processedFileListPromise = new Promise(resolve => {
                if (configs.fileList) {
                    let files = [];
                    fd.walk(configs.commonFolder, filepath => {
                        if (configs.jsFileExtNamesReg.test(filepath)) {
                            let from = path.resolve(filepath);
                            let to = path.resolve(configs.compiledFolder + from.replace(configs.commonFolder, ''));
                            files.push({
                                from,
                                to
                            });
                        }
                    });
                    let list = [];
                    for (let f of files) {
                        let content = fd.read(f.from);
                        let info = jsHeader(content);
                        if (!info.isSnippet) {
                            list.push(utils.extractModuleId(f.from));
                        }
                    }
                    let toFile = path.resolve(configs.commonFolder + path.sep + configs.fileList);
                    fd.write(toFile, `export default ${JSON.stringify(list, null, 4)}`);
                    resolve();
                } else {
                    resolve();
                }
            });
        }
        return this.$processedFileListPromise;
    },
    combine() {
        initEnv();
        return this.fileList().then(() => {
            ++combineCount;
            let tasks = [];
            let total = 0;
            fd.walk(configs.commonFolder, filepath => {
                if (configs.jsFileExtNamesReg.test(filepath)) {
                    let from = path.resolve(filepath);
                    let to = path.resolve(configs.compiledFolder + from.replace(configs.commonFolder, ''));
                    total++;
                    tasks.push({
                        from,
                        to
                    });
                }
            });
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    let ps = [];
                    let completed = 0;
                    let errorOccured = false;
                    let current = 0;
                    let run = () => {
                        errorOccured = false;
                        let tks = tasks.slice(current, current += concurrentTask);
                        if (tks.length) {
                            ps = [];
                            tks.forEach(it => {
                                ps.push(js.process(it.from, it.to).then(() => {
                                    if (!errorOccured) {
                                        configs.progress({
                                            completed: ++completed,
                                            total,
                                            file: it.from
                                        });
                                    }
                                }));
                            });
                            Promise.all(ps).then(run).catch(ex => {
                                errorOccured = true;
                                reject(ex);
                            });
                        } else {
                            setTimeout(() => {
                                --combineCount;
                                if (combineCount == 0) {
                                    cssChecker.output();
                                }
                                resolve();
                            }, 100);
                        }
                    };
                    run();
                }, 0);
            });
        });
    },
    processFile(from) {
        //有可能一次进入多个文件处理，而处理过程是异步的
        //为了保证检查结果的正确性，只能在最后完成时输出
        return this.fileList().then(() => {
            ++processFileCount;
            initEnv();
            from = path.resolve(from);
            this.removeCache(from);
            let to = path.resolve(configs.compiledFolder + from.replace(configs.commonFolder, ''));
            return js.process(from, to, true).then(() => {
                --processFileCount;
                if (processFileCount == 0) {
                    cssChecker.output();
                }
                return Promise.resolve();
            }).catch(() => {
                --processFileCount;
            });
        });
    },
    processContent(from, to, content) {
        initEnv();
        from = path.resolve(from);
        this.removeCache(from);
        return jsContent.process(from, to, content, false, false);
    },
    processTmpl() {
        initEnv();
        return new Promise((resolve, reject) => {
            let ps = [];
            let total = 0;
            let completed = 0;
            let tasks = [];
            fd.walk(configs.commonFolder, filepath => {
                let from = path.resolve(filepath);
                total++;
                tasks.push(from);
            });
            let errorOccured = false;
            let current = 0;
            let run = () => {
                errorOccured = false;
                let tks = tasks.slice(current, current += concurrentTask);
                if (tks.length) {
                    ps = [];
                    tks.forEach(from => {
                        ps.push(tmplNaked.process(from).then(() => {
                            if (!errorOccured) {
                                configs.progress({
                                    completed: ++completed,
                                    total,
                                    file: from
                                });
                            }
                        }));
                    });
                    Promise.all(ps).then(run).catch(ex => {
                        errorOccured = true;
                        reject(ex);
                    });
                } else {
                    setTimeout(() => {
                        resolve();
                    }, 100);
                }
            };
            run();
        });
    },
    processString() {
        initEnv();
        //console.log(configs.compiledFolder);
        return new Promise((resolve, reject) => {
            let ps = [];
            let total = 0;
            let completed = 0;
            let tasks = [];
            fd.walk(configs.commonFolder, filepath => {
                //console.log('xxx',filepath);
                let from = path.resolve(filepath);
                total++;
                tasks.push(from);
            });
            let errorOccured = false;
            let current = 0;
            let run = () => {
                errorOccured = false;
                let tks = tasks.slice(current, current += concurrentTask);
                if (tks.length) {
                    ps = [];
                    tks.forEach(from => {
                        ps.push(jsString.process(from).then(() => {
                            if (!errorOccured) {
                                configs.progress({
                                    completed: ++completed,
                                    total,
                                    file: from
                                });
                            }
                        }));
                    });
                    Promise.all(ps).then(run).catch(ex => {
                        errorOccured = true;
                        reject(ex);
                    });
                } else {
                    setTimeout(() => {
                        resolve();
                    }, 100);
                }
            };
            run();
        });
    },
    getFileDependents(file) {
        return deps.getDependents(file);
    },
    getStyleFileUniqueKey(file, ignoreProjectName) {
        return cssTransform.genCssNamesKey(file, ignoreProjectName);
    },
    clearConfig() {
        delete configs.$inited;
        md5.clear();
        cssGlobal.clear();
        cssChecker.reset();
    }
};