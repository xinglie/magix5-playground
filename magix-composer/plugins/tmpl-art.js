/*
https://github.com/aui/art-template
https://thx.github.io/crox/
在artTemplate的基础上演化而来
*/

/*
详细文档及讨论地址：https://github.com/thx/magix-combine/issues/27

输出语句
    {{=variable}} //转义输出
    {{!variable}} //直接输出
    {{@variable}} //在渲染组件时传递数据
    {{:variable}} //绑定表达式
判断语句
    //if

    {{if user.age > 20}}
        <span>{{= user.name }}</span>
    {{/if}}

    //if else

    {{if user.age > 20}}
        <span>{{= user.name }}</span>
    {{else if user.age < 10}}
        <strong>{{= user.name }}</strong>
    {{/if}}

循环语句
    //array and key value
    {{each list as value index by desc step 3}}
        {{= index }}:{{= value }}
    {{/each}}

    //object and key value

    {{forin list as value key}}
        {{= key }}:{{= value }}
    {{/forin}}

    //通用for
    {{for(let i=0;i<10;i++)}}
        {{=i}}
    {{/for}}

方法调用

    {{= fn(variable,variable1) }}

变量声明及其它

    {{ let a=user.name,b=30,c={} }}
*/
let utils = require('./util');
let configs = require('./util-config');
let chalk = require('chalk');
let artExpr = require('./tmpl-art-ctrl');
let htmlAttrs = require('./html-attrs');
let ifForReg = /^\s*(if|for)\s*\(/;
let longExpr = /[\.\[\]]/;
let ctrls = {
    'if'(stack, ln) {
        stack.push({
            ctrl: 'if', ln
        });
    },
    'else'(stack) {
        let last = stack[stack.length - 1];
        if (last) {
            if (last.ctrl !== 'if') {
                return last;
            }
        } else {
            return {
                ctrl: ''
            };
        }
    },
    '/if'(stack) {
        let last = stack.pop();
        if (last) {
            if (last.ctrl != 'if') {
                return last;
            }
        } else {
            return {
                ctrl: ''
            };
        }
    },
    'each'(stack, ln) {
        stack.push({ ctrl: 'each', ln });
    },
    '/each'(stack) {
        let last = stack.pop();
        if (last) {
            if (last.ctrl != 'each') {
                return last;
            }
        } else {
            return {
                ctrl: ''
            };
        }
    },
    'forin'(stack, ln) {
        stack.push({ ctrl: 'forin', ln });
    },
    '/forin'(stack) {
        let last = stack.pop();
        if (last) {
            if (last.ctrl != 'forin') {
                return last;
            }
        } else {
            return {
                ctrl: ''
            };
        }
    },
    'for'(stack, ln) {
        stack.push({ ctrl: 'for', ln });
    },
    '/for'(stack) {
        let last = stack.pop();
        if (last) {
            if (last.ctrl != 'for') {
                return last;
            }
        } else {
            return {
                ctrl: ''
            };
        }
    }
};
let checkStack = (stack, key, code, e, lineNo) => {
    let ctrl = ctrls[key];
    if (ctrl) {
        let l = ctrl(stack, lineNo);
        if (l) {
            let args = [chalk.red(`[MXC Error(tmpl-art)] unexpected {{${code}}} at line:${lineNo}`)];
            if (l.ctrl) {
                args.push('unclosed', chalk.magenta(l.ctrl), `at line:${l.ln} , at file`);
            } else {
                args.push('at file');
            }
            args.push(chalk.grey(e.shortHTMLFile));
            console.log(...args);
            throw new Error(`[MXC Error(tmpl-art)] unexpected ${code}`);
        }
    } else if (stack.length) {
        for (let s, i = stack.length; i--;) {
            s = stack[i];
            console.log(chalk.red(`[MXC Error(tmpl-art)] unclosed "${s.ctrl}" at line:${s.ln}`), ', at file', chalk.grey(e.shortHTMLFile));
        }
        throw new Error(`[MXC Error(tmpl-art)] unclosed art ctrls at ${e.shortHTMLFile}`);
    }
};
let syntax = (code, e, lineNo) => {
    code = code.trim();
    let temp = ifForReg.exec(code);
    let key, expr;
    if (temp) {
        expr = '(' + code.substring(temp[0].length).trim();
        key = temp[1];
    } else {
        let space = code.indexOf(' ');
        if (space == -1 &&
            (code.startsWith('/') ||
                code.startsWith('else'))) {
            key = code;
            expr = '';
        } else {
            key = code.substring(0, space);
            expr = code.substring(space + 1).trim();
        }
    }
    //console.log(key, '@@', expr);
    let src = '';
    if (configs.debug) {
        src = `<%'${lineNo}\x11${htmlAttrs.escapeSlashAndBreak(code)}\x11'%>`;
    }
    if (key == 'if') {
        expr = artExpr.extractIfExpr(expr);
        return `${src}<%if(${expr}){%>`;
    } else if (key == 'else') {
        let iv = '';
        if (expr.startsWith('if ')) {
            expr = expr.substring(3);
            expr = artExpr.extractIfExpr(expr);
            iv = ` if(${expr})`;
        }
        return `${src}<%}else${iv}{%>`;
    } else if (key == 'each') {
        let asExpr = artExpr.extractAsExpr(expr),
            object = asExpr.iterator,
            init = false;
        if (asExpr.bad || asExpr.splitter != 'as') {
            console.log(chalk.red(`[MXC Error(tmpl-art)] unsupport or bad each {{${code}}} at line:${lineNo}`), 'file', chalk.grey(e.shortHTMLFile));
            throw new Error('[MXC Error(tmpl-art)] unsupport or bad each {{' + code + '}}');
        }
        if (asExpr.value) {
            init = true;
        }
        let index = asExpr.index || utils.uId('$art_i', code);
        let refObj = longExpr.test(object) ? utils.uId('$art_obj', code) : object;
        let value = init ? `let ${asExpr.value}=${refObj}[${index}]` : '';
        let refExpr = longExpr.test(object) ? `${refObj}=${object},` : '';
        let refObjCount = utils.uId(`$art_c`, code);
        let firstAndLast = '';
        let lastCount = '';
        let lastCountObj = utils.uId(`$art_lc`, code);
        let { asc, first, last } = asExpr;
        if (last || first) {
            if (first) {
                if (asc) {
                    firstAndLast += `let ${first}=${index}===0;`;
                } else {
                    lastCount = `,${lastCountObj}=${refObjCount}`;
                    firstAndLast += `let ${first}=${index}===${lastCountObj};`;
                }
            }
            if (last) {
                if (asc) {
                    lastCount = `,${lastCountObj}=${refObjCount}-1`;
                    firstAndLast += `let ${last}=${index}===${lastCountObj};`;
                } else {
                    firstAndLast += `let ${last}=${index}===0;`;
                }
            }
        }
        if (asc) {
            return `${src}<%for(let ${refExpr}${index}=0,${refObjCount}=${refObj}.length${lastCount};${index}<${refObjCount};${index}+=${asExpr.step}){${firstAndLast}${value}%>`;
        }
        //console.log(asExpr);
        if (asExpr.step == 1 &&
            !asExpr.first &&
            !asExpr.last) {
            return `${src}<%for(let ${refExpr}${index}=${refObj}.length;${index}--;){${value}%>`;
        }
        return `${src}<%for(let ${refExpr}${refObjCount}=${refObj}.length-1,${index}=${refObjCount}${lastCount};${index}>=0;${index}-=${asExpr.step}){${firstAndLast}${value}%>`;
    } else if (key == 'forin') {
        let asExpr = artExpr.extractAsExpr(expr),
            object = asExpr.iterator,
            init = false;
        if (asExpr.value) {
            init = true;
        }
        if (asExpr.bad || asExpr.splitter != 'as') {
            console.log(chalk.red(`[MXC Error(tmpl-art)] unsupport or bad forin {{${code}}} at line:${lineNo}`), 'file', chalk.grey(e.shortHTMLFile));
            throw new Error('[MXC Error(tmpl-art)] unsupport or bad forin {{' + code + '}}');
        }
        let key1 = asExpr.index || utils.uId('$art_k', code);
        let refObj = longExpr.test(object) ? utils.uId('$art_obj', code) : object;
        let value = init ? `let ${asExpr.value}=${refObj}[${key1}]` : '';
        let refExpr = longExpr.test(object) ? `let ${refObj}=${object};` : '';
        return `${src}<%${refExpr}for(let ${key1} in ${refObj}){${value}%>`;
    } else if (key == 'for') {
        let fi = artExpr.extractForExpr(expr);
        return `${src}<%for(${fi.expr}){%>`;
    } else if (key == 'set') {
        return `${src}<%let ${expr};%>`;
    } else if (key == '/if' ||
        key == '/each' ||
        key == '/forin' ||
        key == '/for') {
        return `${src}<%}%>`;
    } else {
        return `${src}<%${code}%>`;
    }
};
let findBestCode = (str, e, line) => {
    let left = '',
        right = '';
    let leftCount = 0,
        rightCount = 0,
        maybeCount = 0,//maybe是兼容以前正则的逻辑 /\}{2}(?!\})/
        maybeAt = -1,
        find = false;
    for (let i = 0; i < str.length; i++) {
        let c = str.charAt(i);
        if (c != '}') {
            if (maybeCount >= 2 && maybeAt == -1) {
                maybeAt = i;
            }
            maybeCount = 0;
            rightCount = 0;
        }
        if (c == '{') {
            leftCount++;
        } else if (c == '}') {
            maybeCount++;
            if (!leftCount) {
                rightCount++;
                if (rightCount == 2) {
                    find = true;
                    left = str.substring(0, i - 1);
                    right = str.substring(i + 1);
                    break;
                }
            } else {
                leftCount--;
            }
        }
    }
    if (!find && maybeCount >= 2 && maybeAt == -1) {
        maybeAt = str.length - 2;
    }
    if (!find) {
        if (maybeAt == -1) {
            console.log(chalk.red('[MXC Error(tmpl-art)] bad partial art: {{' + str.trim() + ' at line:' + line), 'at file', chalk.magenta(e.shortHTMLFile));
            throw new Error('[MXC Error(tmpl-art)] bad partial art: {{' + str.trim() + ' at line:' + line + ' at file:' + e.shortHTMLFile);
        } else {
            left = str.substring(0, maybeAt - 2);
            right = str.substring(maybeAt);
        }
    }
    return [left, right];
};
let check = (tmpl, e) => {
    tmpl = artExpr.addLine(tmpl);
    let parts = tmpl.split(artExpr.openTagReg);
    let stack = [];
    //console.log(parts);
    for (let part of parts) {
        let lni = artExpr.extractArtInfo(part);
        if (lni) {
            let codes = findBestCode(lni.art, e, lni.line);
            let context = codes[0];
            let temp = ifForReg.exec(context);
            let key;
            if (temp) {
                key = temp[1];
            } else {
                key = context.split(/\s+/)[0];
            }
            if (key == 'if' ||
                key == 'else' ||
                key == 'each' ||
                key == 'forin' ||
                key == 'for' ||
                key == '/if' ||
                key == '/each' ||
                key == '/forin' ||
                key == '/for') {
                checkStack(stack, key, context, e, lni.line);
            }
        }
    }
    checkStack(stack, 'unclosed', '', e);
};
let combine = (tmpl, e) => {
    let result = [];
    tmpl = artExpr.addLine(tmpl);
    let parts = tmpl.split(artExpr.openTagReg);
    for (let part of parts) {
        let lni = artExpr.extractArtInfo(part);
        if (lni) {
            let codes = findBestCode(lni.art, e, lni.line);
            result.push(syntax(codes[0], e, lni.line), codes[1]);
        } else {
            result.push(part);
        }
    }
    return artExpr.recoverEvent(result.join(''));
};
combine.check = check;
module.exports = combine;