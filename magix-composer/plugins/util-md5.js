/*
    md5转换，最初使用的md5，后期修改成sha512，但md5这个名称未换
 */
let configs = require('./util-config');
let vkeys = '_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
let vkeysWidthNumbers = vkeys + '0123456789';
let vkeysWithChars = vkeysWidthNumbers + '#!@$^*{}[]|,.`~/;:-+';
let startWithNumReg = /^\d+/;
let variable = (count, withChars, withNumbers) => { //压缩变量
    let result = '',
        temp,
        keys = withChars ? vkeysWithChars : (withNumbers ? vkeysWidthNumbers : vkeys);
    do {
        temp = count % keys.length;
        result = keys.charAt(temp) + result;
        count = (count - temp) / keys.length;
    }
    while (count);
    return result;
};
let counter = Object.create(null);
let cache = Object.create(null);
let md5 = (text, configKey, prefix = '', withChars = false, reserved, withNumbers = true) => {
    text += '';
    if (configKey == 'revisableString') {
        if (configs.revisableStringMap.hasOwnProperty(text)) {
            return configs.revisableStringMap[text];
        }
        let spliter = '#';
        let temp = text.split(spliter);
        if (temp.length > 1) {
            configKey = temp[0];
            prefix = '';
        } else {
            reserved = configs.revisableStringMapReserved;
        }
    }
    let cacheKey = [configKey, prefix, withChars, withNumbers].join('\x1f');
    if (!counter[cacheKey]) {
        counter[cacheKey] = configs.uniqueStart;
    }
    if (!cache[cacheKey]) {
        cache[cacheKey] = Object.create(null);
    }
    let rstr = cache[cacheKey][text];
    if (rstr) {
        return rstr;
    }
    do {
        let c = counter[cacheKey];
        rstr = variable(c, withChars, withNumbers);
        counter[cacheKey] = ++c;
        if (prefix) {
            rstr = prefix + rstr;
        }
    } while ((reserved && reserved[rstr]) ||
        (!withChars && startWithNumReg.test(rstr)));
    cache[cacheKey][text] = rstr;
    return rstr;
};
md5.byNum = variable;
md5.clear = () => {
    counter = Object.create(null);
    cache = Object.create(null);
};
module.exports = md5;