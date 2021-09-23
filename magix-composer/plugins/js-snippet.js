/*
    处理代码片断，如'top@./list.js'，用于手动合并一些代码
 */
let deps = require('./util-deps');
let configs = require('./util-config');
let path = require('path');
let cssChecker = require('./checker-css');
let fs = require('fs');
let sep = path.sep;
let fileReg = /(['"`])\x12@:([^'"`]+\.m?[jt]s)\1;?/g;
module.exports = e => {
    return new Promise((resolve, reject) => {
        let contentCache = Object.create(null),
            count = 0,
            resumed = false;
        let resume = () => {
            if (!resumed) {
                resumed = true;
                e.content = e.content.replace(fileReg, m => contentCache[m]);
                resolve(e);
            }
        };

        let readFile = (key, file, ctrl) => {
            count++;
            let to = path.resolve(configs.compiledFolder + file.replace(configs.commonFolder, ''));
            fs.access(file, (fs.constants ? fs.constants.R_OK : fs.R_OK), err => {
                if (err) {
                    cssChecker.storeUnexist(e.shortFrom, file);
                    contentCache[key] = `(()=>{throw new Error(${JSON.stringify('unfound:' + file)})})()`;
                    count--;
                    if (!count) {
                        resume();
                    }
                } else {
                    e.processContent(file, to).then(info => {
                        contentCache[key] = info.content;
                        count--;
                        if (!count) {
                            resume();
                        }
                    }).catch(reject);
                }
            });
        };
        let tasks = [];
        e.content.replace(fileReg, (m, q, name) => {
            //console.log('-----',JSON.stringify(m));
            let file = path.resolve(path.dirname(e.from) + sep + name);
            if (e.from && e.to) {
                deps.addFileDepend(file, e.from, e.to);
            }
            tasks.push([m, file]);
        });
        if (tasks.length) {
            let i = 0;
            while (i < tasks.length) {
                readFile.apply(null, tasks[i++]);
            }
        } else {
            resume();
        }
    });
};