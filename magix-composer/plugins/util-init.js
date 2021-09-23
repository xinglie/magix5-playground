/*
    初始化各种文件夹的配置项，相对转成完整的物理路径，方便后续的使用处理
 */
let path = require('path');
let configs = require('./util-config');
let globReg = require('./util-globreg');
let utils = require('./util');
let md5 = require('./util-md5');
//let crypto = require('crypto');
let reservedReplacer = {
    top: 1,
    bottom: 1,
    src: 1,
    global: 1,
    ref: 1,
    names: 1,
    str: 1,
    base64: 1,
    html: 1,
    style: 1
};
module.exports = () => {
    if (!configs.$inited) {
        configs.$inited = 1;
        //console.log(configs.commonFolder,configs.compiledFolder,path.resolve(configs.compiledFolder));
        configs.commonFolder = path.resolve(configs.commonFolder);
        configs.compiledFolder = path.resolve(configs.compiledFolder);
        configs.rootFolder = configs.rootFolder ? path.resolve(configs.rootFolder) : configs.commonFolder;
        configs.jsFileExtNamesReg = new RegExp('\\.(?:' + configs.jsFileExtNames.join('|') + ')$');
        configs.jsOrCssFileExtNamesReg = new RegExp('\\.(?:' + configs.jsFileExtNames.join('|') + '|css|less)$');
        let srcName = configs.projectName;
        if (srcName) {
            let hashName = md5.byNum(utils.hash(srcName));
            if (hashName.length <= srcName.length) {
                srcName = hashName;
            }
            configs.hashedProjectName = srcName;
        }
        // if (configs.projectName === null) {
        //     let str = crypto.createHash('sha512')
        //         .update(configs.commonFolder, 'ascii')
        //         .digest('hex');
        //     configs.projectName = 'x' + str.substring(0, 4);
        // }

        let tmplExtNames = configs.tmplFileExtNames;

        // let names = tmplExtNames.slice();
        // if (names.indexOf('mx') == -1) {
        //     names.push('mx');
        // }
        configs.tmplFileExtNamesReg = new RegExp('\\.(?:' + tmplExtNames.join('|') + ')$');

        configs.htmlFileReg = new RegExp('(?:compiled)?@:[^\'"\\s@]+\\.(?:' + tmplExtNames.join('|') + ')');
        configs.htmlFileGlobalReg = new RegExp(configs.htmlFileReg, 'g');

        //模板处理，即处理view.html文件
        configs.fileTmplReg = new RegExp('([\'"`])(compiled)?\\x12@:([^\'"\\s@]+)\\.(' + tmplExtNames.join('|') + ')\\1', 'g');

        let rsPrefix = configs.revisableStringPrefix;
        if (!rsPrefix) {
            rsPrefix = '_';
        } else if (rsPrefix.startsWith('$')) {
            rsPrefix += '_';
        }
        configs.revisableStringPrefix = rsPrefix;

        let revisableStringMapReserved = {},
            revisableStringMap = configs.revisableStringMap;
        for (let p in revisableStringMap) {
            revisableStringMapReserved[revisableStringMap[p]] = 1;
        }
        configs.revisableStringMapReserved = revisableStringMapReserved;

        let galleryPrefixes = Object.create(null);
        for (let p in configs.galleries) {
            if (p.endsWith('Root')) {
                galleryPrefixes[p.slice(0, -4)] = 1;
            } else if (p.endsWith('Map')) {
                galleryPrefixes[p.slice(0, -3)] = 1;
            }
        }
        configs.galleryPrefixes = galleryPrefixes;

        // let componentPrefixes = Object.create(null);
        // for (let p in configs.components) {
        //     if (p.endsWith('Root')) {
        //         componentPrefixes[p.slice(0, -4)] = 1;
        //     }
        // }

        // configs.componentPrefixes = componentPrefixes;

        configs.selectorKeepNameReg = /(--)[\w-]+$/;
        configs.selectorDSEndReg = /--$/;

        configs.galleriesDynamicRequires = Object.create(null);
        configs.excludesReg = [];
        for (let ex of configs.excludes) {
            configs.excludesReg.push(globReg(ex));
        }
        let replacer = configs.fileReplacerPrefixes;
        for (let r of replacer) {
            if (reservedReplacer[r] === 1) {
                throw new Error('MXC-Error(util-init) reserved:' + r);
            }
        }
        replacer.push('str', 'base64', 'style', 'html','styleFileId');
        configs.fileReplacerPrefixesReg = new RegExp(`(?:${replacer.join('|')})@:[\\w\\.\\-\\/\\\\]+`);
        configs.fileReplacerPrefixesHolderReg = new RegExp(`([\`"'])(${replacer.join('|')})\\x12@:([\\w\\.\\-\\/\\\\]+)\\1`, 'g');
    }
};