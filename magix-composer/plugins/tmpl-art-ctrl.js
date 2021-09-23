let jsGeneric = require('./js-generic');
let consts = require('./util-const');
let eventLeftReg = /\(\s*\{/g;
let eventRightReg = /\}\s*\)/g;
let brReg = /(?:\r\n|\r|\n)/;
let openTag = '{{';
let openTagReg = /\{\{(?!\{)/;
let mxEventHolderReg = /\x12([^\x12]*?)\x12/g;
let lineNoReg = /^\x1e(\d+)([\s\S]+)/;
let removeLineNoReg = /^\{\{\x1e\d+([\s\S]+)\}\}$/;
let sortReg = /\s+by\s+([a-zA-Z0-9]+)/i;
let stepReg = /\s+step\s+([0-9\.]+)/i;
let cmdWithLineReg = /<%'(\d+)[\s\S]+?'%>(?:<%([=#])?([\s\S]+?)%>|(\x1f))/g;
let state = {
    VARIABLE: 1,
    STRING: 2,
    TEMPLATE: 4
};
let findEntiretyUntilSpace = expr => {
    let entire = '',
        escaped = 0,
        stack = [],
        bad = false,
        index = expr.length,
        escapedAt = -1,
        s = state.VARIABLE;
    for (let i = 0; i < expr.length; i++) {
        let c = expr[i];
        let prev = (i - 1 == escapedAt) ? '' : expr[i - 1];
        entire += c;
        if (escaped &&
            (s == state.STRING ||
                s == state.TEMPLATE)) {
            escaped = 0;
            escapedAt = i;
            continue;
        }
        if (c == '\\') {
            if (s == state.STRING ||
                s == state.TEMPLATE) {
                escaped = !escaped;
            }
        } else if (c == '\'' ||
            c == '"') {
            let last = stack[stack.length - 1];
            if (last.char == c) {
                last = stack.pop();
                s = last.state;
            } else if (s != state.STRING ||
                (s & state.VARIABLE) == state.VARIABLE) {
                stack.push({
                    char: c,
                    state: s
                });
                s = state.STRING;
            }
        } else if (c == '`') {
            let last = stack[stack.length - 1];
            if (last.char == c) {
                last = stack.pop();
                s = last.state;
            } else {
                stack.push({
                    char: c,
                    state: s
                });
                s = state.TEMPLATE;
            }
        } else if (c == '{' ||
            c == '[') {
            if (c == '{' &&
                prev == '$' &&
                (s & state.TEMPLATE) == state.TEMPLATE) {
                s = state.TEMPLATE | state.VARIABLE;
                stack.push({
                    char: c,
                    state: s
                });
            } else if ((s & state.VARIABLE) == state.VARIABLE) {
                stack.push({
                    char: c,
                    state: s
                });
            }
        } else if (c == '}' ||
            c == ']') {
            if ((s & state.VARIABLE) == state.VARIABLE) {
                let compare = c == '}' ? '{' : '[';
                let last = stack[stack.length - 1];
                if (last.char == compare) {
                    stack.pop();
                    if ((s & state.TEMPLATE) == state.TEMPLATE) {
                        //s = last.state;
                        if (c == '}') {
                            s = s ^ state.VARIABLE;
                        } else {
                            s = last.state;
                        }
                    }
                } else {
                    bad = true;
                    break;
                }
            }
        } else if (c == ' ' &&
            !stack.length) {
            if (s == state.VARIABLE) {
                index = i;
                break;
            }
        }
    }
    if (stack.length) {
        bad = true;
    }
    return {
        index,
        entire,
        bad
    };
};
let extractAsExpr = expr => {
    let iterator = '',
        splitter = '',
        asc = true,
        step = 1;
    expr = expr.trim();
    expr = expr.replace(sortReg, (m, sort) => {
        if (sort.toLowerCase() == 'desc') {
            asc = false;
        }
        return '';
    }).replace(stepReg, (m, s) => {
        step = Number(s);
        return '';
    });
    let prefixes = findEntiretyUntilSpace(expr);
    if (prefixes.bad) {
        return {
            bad: true
        };
    }
    iterator = prefixes.entire.trim();
    expr = expr.substring(prefixes.index).trim();
    let space = expr.indexOf(' ');
    if (space == -1) {
        splitter = 'as';
    } else {
        splitter = expr.substring(0, space);
    }
    expr = expr.substring(space + 1).trim();

    //解构
    if (expr.startsWith('{') || expr.startsWith('[')) {
        let vars = '',
            key = '',
            last = '',
            first = '';

        prefixes = findEntiretyUntilSpace(expr);
        if (prefixes.bad) {
            return {
                bad: true
            };
        }
        expr = expr.substring(prefixes.index).trim();
        vars = prefixes.entire.trim();
        let exprs = expr.split(/\s+/);
        key = exprs[0] || '';
        last = exprs[1] || '';
        first = exprs[2] || '';
        return {
            asc,
            iterator,
            splitter,
            step,
            value: vars.trim(),
            index: key.trim(),
            last: last.trim(),
            first: first.trim()
        };
    }
    expr = expr.split(/\s+/);
    return {
        iterator,
        asc,
        splitter,
        step,
        value: expr[0],
        index: expr[1],
        last: expr[2],
        first: expr[3]
    };
};

let extractForExpr = expr => {
    expr = jsGeneric.trimParentheses(expr);
    let [init, test, update] = expr.split(';');
    return {
        init,
        test,
        update,
        expr
    };
};
module.exports = {
    openTag,
    openTagReg,
    extractAsExpr,
    extractForExpr,
    extractIfExpr: jsGeneric.trimParentheses,
    addLine(tmpl) {
        tmpl = tmpl.replace(consts.tmplMxEventReg, m => {
            let hasLeft = eventLeftReg.test(m);
            let hasRight = eventRightReg.test(m);
            //console.log(hasLeft, hasRight, m);
            return m.replace(eventLeftReg, hasRight ? '\x12' : '$&')
                .replace(eventRightReg, hasLeft ? '\x12' : '$&');
        });
        let lines = tmpl.split(brReg);
        let ls = [], lc = 0;
        for (let line of lines) {
            ls.push(line.split(openTagReg).join(openTag + '\x1e' + (++lc)));
        }
        tmpl = ls.join('\n');
        return tmpl;
    },
    extractArtInfo(art) {
        if (art.startsWith(openTag)) {
            art = art.substring(2, art.length - 2);
        }
        let m = art.match(lineNoReg);
        if (m) {
            art = m[2].trimLeft();
            if (art.startsWith('if(')) {
                art = art.substring(0, 2) + ' ' + art.substring(2);
            } else if (art.startsWith('for(')) {
                art = art.substring(0, 3) + ' ' + art.substring(3);
            }
            let ctrls = art.split(/\s+/).slice(0, 2);
            return {
                line: m[1],
                art,
                ctrls
            };
        }
        return null;
    },
    removeLine(ctrl) {
        return ctrl.replace(removeLineNoReg, '{{$1}}');
    },
    recoverEvent(tmpl) {
        return tmpl.replace(mxEventHolderReg, '({$1})');
    },
    extractCmdToArt(tmpl) {
        let ln = -1;
        let art = tmpl.replace(cmdWithLineReg, (m, line, o, c, d) => {
            ln = line;
            if (d == '\x1f') {
                return '{{=$viewId}}';
            }
            return `{{${o || ''}${c}}}`;
        });
        return {
            line: ln,
            art
        };
    }
};