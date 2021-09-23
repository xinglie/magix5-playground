/*
    模板指令处理
 */
let chalk = require('chalk');
let configs = require('./util-config');
let htmlminifier = require('html-minifier');
let jsGeneric = require('./js-generic');
let { htmlminifier: cHTMLMinifier,
    tmplStoreIndexKey,
    microTmplCommand } = require('./util-const');
//模板文件，模板引擎命令处理，因为我们用的是字符串模板，常见的模板命令如<%=output%> {{output}}，这种通常会影响我们的分析，我们先把它们做替换处理
let anchor = '\x07';
let tmplCommandAnchorCompressReg = /(\x07\d+\x07)\s+(?=[<>])/g;
let tmplCommandAnchorCompressReg2 = /([<>])\s+(\x07\d+\x07)/g;
let tmplCommandAnchorReg = /\x07\d+\x07/g;
let tmplCommandTestReg = /\x07\d+\x07/;
let emptyCmdReg = /<%\s*%>/g;
let bindReg2 = /(\s*)<%:([\s\S]+?)%>(\s*)/g;

let cmdOutReg = /^<%([#=:!~])?([\s\S]*)%>$/;
let artCtrlsReg = /^(?:<%'\x17?(\d+)\x11([^\x11]+)\x11\x17?'%>)?(<%[\s\S]+?%>)$/;
let artCtrlsReg1 = /<%'\d+\x11([^\x11]+)\x11'%>(<%[\s\S]+?%>)/g;
let isLineArtCtrlsReg = /^<%'(\d+)\x11([^\x11]+)\x11'%>$/;
module.exports = {
    compile(tmpl) {
        //特殊处理绑定事件及参数
        tmpl = tmpl.replace(bindReg2, (m, left, expr, right) => {
            let leftBrace = expr.indexOf('{');
            if (leftBrace > 0) {
                let fns = expr.substring(leftBrace).trim();
                if (fns[fns.length - 1] == ')') {
                    fns = fns.slice(0, -1);
                }
                try {
                    fns = ',' + jsGeneric.parseObject(fns, '\x17', '\x18');
                } catch (ex) {
                    console.log(chalk.red('check:' + fns));
                }
                //console.log(JSON.stringify(fns));
                expr = expr.substring(0, leftBrace).trim();
                if (expr[expr.length - 1] == '(') {
                    expr = expr.slice(0, -1);
                }
                if (expr.endsWith('&')) {
                    expr = expr.slice(0, -1);
                }
                expr += fns;
            } else {
                let temp = expr.split('&');
                if (temp.length > 1) {
                    let bind = temp.shift().trim();
                    let rule = temp.join('&');
                    if (rule.startsWith('(') && rule.endsWith(')')) {
                        rule = rule.slice(1, -1);
                    }
                    expr = `${bind},"\x17\x18",${rule},"\x17"`;
                }
            }
            return (left || '') + '<%:' + expr + '%>' + (right || '');
        });
        tmpl = tmpl.replace(emptyCmdReg, '');
        return tmpl;
    },
    hasCmd(tmpl) {
        return tmplCommandTestReg.test(tmpl);
    },
    isLine(tmpl) {
        return isLineArtCtrlsReg.test(tmpl);
    },
    getLineAndContent(tmpl) {
        let m = tmpl.match(isLineArtCtrlsReg);
        if (m) {
            return {
                line: m[1],
                content: m[2]
            }
        }
        return {
            line: -1,
            content: 'error'
        };
    },
    getCmds(tmpl) {
        let cmds = [];
        tmpl.replace(tmplCommandAnchorReg, _ => cmds.push(_));
        return cmds;
    },
    store(tmpl, dataset, reg) { //保存模板引擎命令
        let idx = dataset[tmplStoreIndexKey] || 0;
        let regs = [reg, configs.tmplCommand, microTmplCommand];
        for (let r of regs) {
            if (r) {
                tmpl = tmpl.replace(r, (match, key) => {
                    idx++;
                    key = anchor + idx + anchor;
                    dataset[match] = key;
                    dataset[key] = match;
                    return key;
                });
            }
        }
        dataset[tmplStoreIndexKey] = idx;
        return tmpl;
    },
    tidy(tmpl) { //简单压缩
        //console.log('before', tmpl);
        tmpl = htmlminifier.minify(tmpl, cHTMLMinifier);
        //console.log('after', tmpl);
        if (cHTMLMinifier.collapseWhitespace) {
            tmpl = tmpl.replace(tmplCommandAnchorCompressReg, '$1');
            tmpl = tmpl.replace(tmplCommandAnchorCompressReg2, '$1$2');
        }
        return tmpl;
    },
    recover(tmpl, refTmplCommands, processor) { //恢复替换的命令
        return tmpl.replace(tmplCommandAnchorReg, match => {
            let value = refTmplCommands[match];
            if (processor) {
                value = processor(value);
            }
            return value;
        });
    },
    queryCmdsOfTmpl(tmpl, refTmplCommands, processor) {
        tmpl.replace(tmplCommandAnchorReg, match => {
            let value = refTmplCommands[match];
            if (processor) {
                value = processor(value);
            }
            refTmplCommands[match] = value;
        });
    },
    buildCmd(line, operate, art, content) {
        return `<%'${line}\x11${art}\x11'%><%${operate}${content}%>`;
    },
    toArtCmd(cmd, refTmplCommands) {
        return this.recover(cmd, refTmplCommands).replace(artCtrlsReg1, '{{$1}}');
    },
    extractCmdContent(cmd, refTmplCommands) {
        let oc = this.recover(cmd, refTmplCommands);
        let am = oc.match(artCtrlsReg);
        let old = '', line = -1, art = '';
        if (am) {
            [, line, art, old] = am;
        }
        let ocm = old.match(cmdOutReg);
        if (ocm) {
            if (ocm[2].indexOf('%>') > -1 || ocm[2].indexOf('<%') > -1) {
                return {
                    isArt: !!art,
                    origin: art || old,
                    succeed: false
                };
            }
            return {
                isArt: !!art,
                line,
                art: art || ocm[2],
                origin: art || old,
                succeed: true,
                operate: ocm[1] || '',
                content: ocm[2]
            };
        }
        return {
            isArt: !!art,
            origin: art || old,
            succeed: false
        };
    },
    extractRefContent(cmd) {
        let idx = cmd.indexOf(`,\x00xl\x00'`);
        if (idx > -1) {
            return {
                succeed: true,
                vars: cmd.substring(0, idx),
                key: cmd.substring(idx + 1)
            };
        } else {
            return {
                succeed: true,
                vars: cmd,
                key: ''
            };
        }
        return {
            succeed: false
        }
    }
};