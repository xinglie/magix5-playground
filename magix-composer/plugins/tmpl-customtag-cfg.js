let fs = require('fs');
let path = require('path');
let { galleryFileNames,
    galleryFileSuffixes } = require('./util-const');
module.exports = (root, prefix) => {
    let cfg = {},
        configFile = '';
    for (let fn of galleryFileNames) {
        for (let s of galleryFileSuffixes) {
            configFile = path.join(root, fn + '.' + s);
            if (fs.existsSync(configFile)) {
                cfg = require(configFile);
                break;
            }
        }
    }
    for (let p in cfg) {
        if (!p.startsWith(prefix)) {
            throw new Error('[MXC Error(tmpl-customtag-cfg)] bad config at ' + configFile + '. Only property key starts with ' + prefix + ' support');
        }
    }
    return {
        cfg,
        file: configFile
    };
};