/*
    文件依赖信息对象，如index.js中@了index.css，则index.css被修改时，我们要编译index.js，即被依赖的模块变化要让有依赖的模块编译一次
 */
let cssChecker = require('./checker-css');
let fileDependencies = {};
let configDependencies = {};
let context;
//添加文件依赖关系
let addFileDepend = (file, dependFrom, dependTo) => {
    if (file != dependFrom) {
        let list = fileDependencies[file];
        if (!list) {
            list = fileDependencies[file] = Object.create(null);
        }
        list[dependFrom] = dependTo;
    }
};
let addConfigDepend = (file, dependFrom, dependTo) => {
    if (file != dependFrom) {
        let list = configDependencies[file];
        if (!list) {
            list = configDependencies[file] = Object.create(null);
        }
        list[dependFrom] = dependTo;
    }
};
//运行依赖列表
let runFileDepend = file => {
    let list = fileDependencies[file];
    let promises = [];
    if (list) {
        for (let p in list) {
            cssChecker.resetByHost(p);
            promises.push(context.process(p, list[p], true));
        }
    }
    return Promise.all(promises);
};

let runConfigDepend = file => {
    let list = configDependencies[file];
    let promises = [];
    if (list) {
        for (let p in list) {
            promises.push(context.process(p, list[p], true));
        }
    }
    return Promise.all(promises);
};
//移除文件依赖
let removeFileDepend = file => {
    delete fileDependencies[file];
};

module.exports = {
    setContext(ctx) {
        context = ctx;
        return ctx;
    },
    inDependents(file) {
        return fileDependencies.hasOwnProperty(file);
    },
    inConfigDependents(file) {
        return configDependencies.hasOwnProperty(file);
    },
    getDependents(file) {
        return fileDependencies[file];
    },
    getConfigDependents(file) {
        return configDependencies[file];
    },
    runConfigDepend,
    removeFileDepend,
    runFileDepend,
    addFileDepend,
    addConfigDepend
};