/*
    缓存文件内容
 */
let deps = require('./util-deps');
let fileCache = Object.create(null);
let clearDeps = (f, locker) => {
    delete fileCache[f];
    let dep = deps.inDependents(f);
    if (dep && !locker[f]) {
        locker[f] = 1;
        let files = deps.getDependents(f);
        Object.keys(files).forEach(it => {
            clearDeps(it, locker);
        });
    }
};
module.exports = {
    add(file, key, info) {
        let fInfo = fileCache[file];
        if (!fInfo) {
            fInfo = fileCache[file] = Object.create(null);
        }
        fInfo[key] = info;
    },
    get(file, key) {
        let fInfo = fileCache[file];
        if (fInfo) {
            return fInfo[key];
        }
        return null;
    },
    clear(file) {
        //delete fileCache[file];
        clearDeps(file, Object.create(null));
    },
    reset() {
        fileCache = Object.create(null);
    }
};