/*
    读取样式文件内容，如果是sass,less等则进行编译后返回
 */
let fs = require('fs');
let path = require('path');

let less = require('less');
let chalk = require('chalk');

let utils = require('./util');
let configs = require('./util-config');
let fd = require('./util-fd');

let jsMx = require('./js-mx');
let sourceMap = require('./css-sourcemap');
let cssAutoprefixer = require('./css-autoprefixer');

let compileContent = (file, content, ext, resolve, reject, shortFile) => {
    let cfg = {
        file,
        ext,
        content,
        shortFile
    };
    let before = configs.compileCSSStart(content, cfg);
    if (utils.isString(before)) {
        cfg.content = before;
        before = Promise.resolve(cfg);
    } else if (!before || !before.then) {
        before = Promise.resolve(cfg);
    }
    before.then(e => {
        /*if (e.ext == '.scss' || e.ext == '.sass') {
            let cssCompileConfigs = {};
            utils.cloneAssign(cssCompileConfigs, configs.sass);
            if (configs.debug) {
                cssCompileConfigs.file = e.file;
                cssCompileConfigs.sourceComments = true;
                cssCompileConfigs.sourceMapContents = true;
            }
            cssCompileConfigs.data = e.content;
            if (e.ext == '.sass') {
                cssCompileConfigs.indentedSyntax = true;
            }
            if (configs.debug && configs.sourceMapCss) {
                cssCompileConfigs.sourceMap = e.file;
            }
            sass.render(cssCompileConfigs, (err, result) => {
                if (err) {
                    console.log(chalk.red('[MXC Error(css-read)]'), 'compile sass error:', chalk.red(err + ''), 'at', chalk.grey(e.shortFile));
                    return reject(err);
                }
                let map = sourceMap(result.map ? result.map.toString() : '', e.file, {
                    rebuildSources: true
                });
                resolve({
                    exists: true,
                    map,
                    file: e.file,
                    content: result.css.toString()
                });
            });
        } else */if (e.ext == '.less') {
            let cssCompileConfigs = {};
            utils.cloneAssign(cssCompileConfigs, configs.less);
            cssCompileConfigs.paths = [path.dirname(e.file)];
            if (configs.debug) {
                cssCompileConfigs.filename = e.file;
                if (configs.sourceMapCss) {
                    cssCompileConfigs.dumpLineNumbers = 'comments';
                    cssCompileConfigs.sourceMap = {
                        outputSourceFiles: true
                    };
                }
            }
            less.render(e.content, cssCompileConfigs, (err, result) => {
                if (err) {
                    console.log(chalk.red('[MXC Error(css-read)]'), 'compile less error:', chalk.red(err + ''), 'at', chalk.grey(e.shortFile));
                    return reject(err);
                }
                let map = sourceMap(configs.debug && configs.sourceMapCss ? result.map : '', e.file);
                resolve({
                    exists: true,
                    file: e.file,
                    map,
                    content: result.css
                });
            });
        } else if (e.ext == '.css') {
            resolve({
                exists: true,
                file: e.file,
                content: e.content
            });
        } else if (e.ext == '.mx' || e.ext == '.mmx') {
            let content = fd.read(e.file);
            let info = jsMx.process(content, e.file);
            compileContent(e.file, info.style, info.styleType, resolve, reject, e.shortFile);
        } else {
            resolve({
                exists: false,
                file: e.file,
                content: e.content
            })
        }
    });
};
//css 文件读取模块，我们支持.css .less .scss文件，所以该模块负责根据文件扩展名编译读取文件内容，供后续的使用
module.exports = (file, e, source, ext, refInnerStyle) => {
    return new Promise((done, reject) => {
        let info = e.contentInfo;
        let shortFile = file.replace(configs.commonFolder, '').substring(1);
        let resolve = info => {
            if (info.exists) {
                let inner = configs.autoprefixer ? cssAutoprefixer(info.content) : Promise.resolve(info.content);
                inner.then(css => {
                    let r = configs.compileCSSEnd(css, info);
                    if (utils.isString(r)) {
                        return Promise.resolve(r);
                    }
                    if (r && r.then) {
                        return r;
                    }
                    return Promise.resolve(css);
                }).then(css => {
                    info.content = css;
                    done(info);
                }).catch((...args) => {
                    let e = args[0];
                    if (e && e.name == 'CssSyntaxError') {
                        console.log(chalk.red('[MXC Error(css-read)]'), 'autoprefixer error:', chalk.red(e.reason), 'at', chalk.grey(shortFile), 'at line', chalk.magenta(e.line));
                    }
                    reject(args);
                });
            } else {
                done(info);
            }
        };
        if (refInnerStyle) {
            let type = info.styleType;
            if (ext != '.mx' && ext != '.mmx') {
                if (type && type != ext) {
                    console.log(chalk.red('[MXC Error(css-read)] conflicting style language'), 'at', chalk.magenta(shortFile), 'near', chalk.magenta(source + ' and ' + info.styleTag));
                }
            }
            compileContent(file, info.style, ext, resolve, reject, shortFile);
        } else {
            fs.access(file, (fs.constants ? fs.constants.R_OK : fs.R_OK), err => {
                if (err) {
                    resolve({
                        exists: false,
                        file: file,
                        content: ''
                    });
                } else {
                    let fileContent = fd.read(file);
                    compileContent(file, fileContent, ext, resolve, reject, shortFile);
                }
            });
        }
    });
};