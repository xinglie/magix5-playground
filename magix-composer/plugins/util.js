/*
    抽取模块id,如文件物理路径为'/users/xiglie/afp/tmpl/app/views/default.js'
    则抽取出来的模块id是 app/vies/default
 */

let path = require('path');
let configs = require('./util-config');
let fcache = require('./util-fcache');

let sep = path.sep;
let sepRegTmpl = sep.replace(/\\/g, '\\\\');
let sepReg = new RegExp(sepRegTmpl, 'g');
let startSlashReg = /^\//;
let moduleIdCache = Object.create(null);
let fsIdCache = Object.create(null);

let numberReg1 = /^[+-]?\.\d+(?:E[+-]?\d+)?$/i;
let numberReg2 = /^[+-]?(?:0x|0b|0o)[0-9a-f]+$/i;
let numberReg3 = /^[+-]?\d+\.?\d*(?:E[+-]?\d+)?$/i;
let numberReg4 = /^[+-]?\d+n$/;
let numberReg5 = /^[+-]?BigInt\(\s*(['"`])?\s*(?:0x|0b|0o)?[0-9a-f]+n?\s*\1\s*\)$/i;

let isObject = o => {
    return o !== null && typeof o == 'object';
};
let extractModuleId = (file, ignoreProjectName) => {
    let key = file + '\x00' + ignoreProjectName;
    //console.log(moduleIdCache);
    if (moduleIdCache[key]) {
        return moduleIdCache[key];
    }
    let id = file.replace(configs.commonFolder, '')
        .replace(configs.jsOrCssFileExtNamesReg, '')
        .replace(sepReg, '/')
        .replace(startSlashReg, '');
    //console.log('fi', file, id);
    //console.log(file, ignoreProjectName);
    if (!ignoreProjectName &&
        configs.addProjectNameAsVirtualRoot &&
        !id.startsWith('~')) {
        if (!configs.projectName) {
            throw new Error('[MXC-Error(util.js)] missing projectName!');
        }
        id = `~${configs.projectName}/${id}`;
    }
    id = configs.resolveModuleId(id);
    moduleIdCache[key] = id;
    return id;
};
let fillAndSplitId = id => {
    if (!fsIdCache[id]) {
        if (id.startsWith('~') &&
            configs.addProjectNameAsVirtualRoot) {
            id = id.replace('~' + configs.projectName + '/', '');
        }
        if (!id.startsWith('/')) {
            id = '/' + id;
        }
        fsIdCache[id] = {
            prefix: configs.commonFolder,
            postfix: id
        };
    }
    return fsIdCache[id];
};

let clone = object => {
    if (Array.isArray(object)) {
        let ta = [];
        for (let i = 0; i < object.length; i++) {
            ta[i] = clone(object[i]);
        }
        return ta;
    } else if (isObject(object)) {
        let temp = Object.create(null);
        for (let p in object) {
            temp[p] = clone(object[p]);
        }
        return temp;
    }
    return object;
};
let cloneAssign = (dest, src) => {
    Object.assign(dest, clone(src));
};
let uId = (fix, str, withoutSuffix) => {
    let id;
    do {
        id = Math.random().toString(36).replace(/[\d\.]/g, '');
    } while (~str.indexOf(id));
    return (fix || '') + id + (withoutSuffix ? '' : (fix || ''));
};
/**
 * Camelize a hyphen-delimited string.
 */
let camelizeRE = /-{1,}(\w)/g;
let camelize = fcache(str => {
    return str.replace(camelizeRE, (_, c) => {
        return c ? c.toUpperCase() : '';
    });
});

/**
 * Hyphenate a camelCase string.
 */
let hyphenateRE = /(?=[^-])([A-Z])/g;
let hyphenate = fcache(str => {
    return str
        .replace(hyphenateRE, '-$1')
        .toLowerCase();
});

let hash = str => {
    str = str + '';
    let hash = 5381,
        i = str.length;

    while (i) {
        hash = (hash * 33) ^ str.charCodeAt(--i);
    }
    return hash >>> 0;
};
module.exports = {
    hash,
    clone,
    uId,
    cloneAssign,
    extractModuleId,
    fillAndSplitId,
    hyphenate,
    camelize,
    isObject,

    isString(o) {
        return typeof o == 'string';
    },
    isFunction(o) {
        return typeof o == 'function';
    },
    isNumber(v) {
        return numberReg1.test(v) ||
            numberReg2.test(v) ||
            numberReg3.test(v) ||
            numberReg4.test(v) ||
            numberReg5.test(v);
    },
    isArray: Array.isArray
};