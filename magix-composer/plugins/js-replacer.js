let path = require('path');
let fs = require('fs');
let cssnano = require('cssnano');
let fd = require('./util-fd');
let configs = require('./util-config');
let tmplCmd = require('./tmpl-cmd');
let cssRead = require('./css-read');
let cssTransform = require('./css-transform');
/**
 * let str=`base64@:./path/to/file.ext`
 * 
 */
let actions = {
    str(file) {
        return Promise.resolve(fd.read(file));
    },
    base64(file) {
        let r = Buffer.from(fd.read(file, true));
        return Promise.resolve(r.toString('base64'));
    },
    style(file) {
        let ext = path.extname(file);
        return cssRead(file, {}, '', ext, false).then(r => {
            if (configs.debug) {
                return r.exists ? r.content : 'can not find ' + file;
            }
            return cssnano().process(r.content,
                Object.assign({}, configs.cssnano)
            ).then(r => {
                return r.css;
            });
        }).catch(e => {
            console.log(e);
        });
    },
    html(file) {
        let content = fd.read(file);
        return tmplCmd.tidy(content);
    },
    styleFileId(file) {
        return cssTransform.genCssNamesKey(file);
    }
};
module.exports = e => {
    return new Promise(resolve => {
        let tasks = [],
            tasksCount = 0,
            completed = 0;
        let locker = Object.create(null);
        let folder = path.dirname(e.from);
        let resume = () => {
            e.content = e.content.replace(configs.fileReplacerPrefixesHolderReg, m => {
                m = locker[m];
                return JSON.stringify(m);
            });
            resolve(e);
        };
        let check = () => {
            if (tasksCount == completed) {
                resume();
            }
        };
        let readContent = task => {
            fs.access(task[1], (fs.constants ? fs.constants.R_OK : fs.R_OK), e => {
                if (e) {
                    completed++;
                    locker[task[0]] = `can not find ${task[3]}`;
                    check();
                } else {
                    let fn = actions[task[2]],
                        p;
                    if (fn) {
                        p = fn(task[1]);
                    } else {
                        p = configs.fileReplacerProcessor(task[2], task[1]);
                    }
                    if (!p.then) {
                        p = Promise.resolve(p || '');
                    }
                    p.then(src => {
                        completed++;
                        locker[task[0]] = src;
                        check();
                    }).catch(ex => {
                        completed++;
                        locker[task[0]] = `read ${task[1]} error:${ex.message}`;
                        check();
                    });
                }
            });
        };
        let doTasks = () => {
            if (tasksCount > 0) {
                for (let t of tasks) {
                    readContent(t);
                }
            } else {
                resolve(e);
            }
        };
        e.content.replace(configs.fileReplacerPrefixesHolderReg, (m, q, ctrl, name) => {
            let file = path.resolve(folder + path.sep + name);
            if (!locker[m]) {
                tasksCount++;
                locker[m] = 'waiting file read';
                tasks.push([m, file, ctrl, name]);
            }
        });
        doTasks();
    });
};