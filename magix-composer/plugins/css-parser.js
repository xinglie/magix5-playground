/*
    http://www.w3school.com.cn/cssref/css_selectors.asp
    简易parser，只处理类与标签，其中
    processRules 参考了这个：https://github.com/fb55/css-what/
    思路：跳过不必要处理的css，在处理规则时，跳过{ }
 */
//let configs = require('./util-config');
let cache = Object.create(null);
let nameReg = /^(?:\\.|[\w\-\u00c0-\uFFFF])+/;
//let atNameReg = /\.@([\w\-\u00c0-\uFFFF]+)/g;
//modified version of https://github.com/jquery/sizzle/blob/master/src/sizzle.js#L87
let attrReg = /^\s*((?:\\.|[\w\u00c0-\uFFFF\-])+)\s*(?:(\S?)=\s*(?:(['"])(.*?)\3|(#?(?:\\.|[\w\u00c0-\uFFFF\-])*)|)|)\s*(i)?\]/;
let isWhitespace = c => {
    return c === ' ' || c === '\n' || c === '\t' || c === '\f' || c === '\r';
};
//let nonEmptyReg = /^\S+$/;
let atRuleSearchContent = {
    document: 1,
    supports: 1,
    media: 1,
    container: 1
};
let atRuleIgnoreContent = {
    page: 1,
    global: 1,
    '-webkit-keyframes': 1,
    '-moz-keyframes': 1,
    '-ms-keyframes': 1,
    '-o-keyframes': 1,
    keyframes: 1,
    'font-face': 1,
    viewport: 1,
    'counter-style': 1,
    'font-feature-values': 1
};
let unpackPseudos = {
    has: 1,
    not: 1,
    matches: 1,
    where: 1//
};
let quotes = {
    '"': 1,
    '\'': 1
};
// let ignoreTags = {
//     html: 1,
//     body: 1,
//     tbody: 1,
//     thead: 1,
//     tfoot: 1,
//     tr: 1,
//     th: 1,
//     td: 1,
//     col: 1,
//     caption: 1,
//     colgroup: 1
// };
// let selectorPower = {
//     TAG: 1,
//     ATTR: 100,
//     CLASS: 10000,
//     ID: 1000000
// };
let parse = (css, file, refAtRules) => {
    let tokens = [];
    let vars = [];
    let nests = [];
    //let nestsLocker = Object.create(null);
    //let selectors = [];
    //let selectorTokensIndex = 0;
    let current = 0;
    let max = css.length;
    let c;
    let stripWhitespaceAndGo = offset => {
        while (isWhitespace(css.charAt(current))) current++;
        current += offset;
    };
    let getArround = () => {
        //let start = Math.max(0, current - 10);
        let end = Math.min(css.length, current + 40);
        return css.substring(current - 1, end);
    };
    let getNameAndGo = () => {
        let sub = css.substr(current);
        //console.log(sub,current);
        let id;
        let matches = sub.match(nameReg);
        if (matches) {
            id = matches[0];
            current += id.length;
        } else {
            throw {
                message: '[MXC Error(css-parser)] get name error',
                file: file,
                extract: getArround()
            };
        }
        return id;
    };
    let skipAtRule = () => {
        //let sc = current;
        do {
            let tc = css.charAt(current);
            if (tc == ';' || tc == '\r' || tc == '\n' || tc == '{') {
                current++;
                break;
            }
            current++;
        } while (current < max);
        //let ec = current;
        //console.log('ignore at rule', css.substring(sc, ec));
    };
    let skipAtRuleUntilLeftBrace = () => {
        //let sc = current;
        do {
            let tc = css.charAt(current);
            if (tc == '{') {
                current++;
                break;
            }
            current++;
        } while (current < max);
        //let ec = current;
        //console.log('ignore at rule expr', css.substring(sc, ec));
    };
    let skipAtRuleContent = () => {
        let count = 0;
        //let sc = current;
        current = css.indexOf('{', current);
        while (current >= 0 && current < max) {
            let tc = css.charAt(current);
            if (tc == '{') {
                count++;
            } else if (tc == '}') {
                count--;
                if (!count) {
                    current++;
                    break;
                }
            }
            current++;
        }
        //let ec = current;
        //console.log('ignore content', css.substring(sc, ec));
    };
    // let overSelectors = 0,
    //     selectorStart = 0;
    // let takeSelector = offset => {
    //     //if (!configs.checker.css || !configs.debug) return;
    //     if (overSelectors > 0) { //1 标签　　100属性　10000类　1000000　id
    //         if (!offset) offset = 0;
    //         let s = css.substring(selectorStart, current + offset).trim();
    //         s = s.replace(atNameReg, (match, selector) => {
    //             if (refAtRules[match]) {
    //                 return refAtRules[match];
    //             }
    //             return `.${selector}`;
    //         });
    //         if (nonEmptyReg.test(s)) { //无空格写法　如a.b.c  a[text][href] a.span.red
    //             if (overSelectors < 300) { //3*ATTR;
    //                 return;
    //             } else if (overSelectors > selectorPower.CLASS && overSelectors < 3 * selectorPower.CLASS) {
    //                 return;
    //             }
    //         }
    //         if (overSelectors <= 303) { //3*selectorPower.ATTR + 3*selectorPower.TAG
    //             overSelectors %= selectorPower.ATTR;
    //         } else if (overSelectors >= selectorPower.CLASS && overSelectors <= 20200) {
    //             //2*selectorPower.CLASS+2*selectorPower.ATTR
    //             overSelectors %= selectorPower.CLASS;
    //             overSelectors %= selectorPower.ATTR;
    //             if (overSelectors && overSelectors <= 3) { //类与标签混用
    //                 overSelectors = 4; //不建议混用
    //             }
    //         }
    //         console.log(s, overSelectors);
    //         if (overSelectors && overSelectors > 3 * selectorPower.TAG) {
    //             if (!nestsLocker[s]) {
    //                 nestsLocker[s] = 1;
    //                 nests.push(s);
    //             }
    //         }
    //     }
    // };
    let processSelectorRules = (start, end) => {
        let rules = css.substring(start, end).trim();
        //console.log(rules);
        let inName = true;
        let idx = 0, last = 0;
        while (idx < rules.length) {
            let c = rules[idx];
            if (c == ';' ||
                c == '\r' ||
                c == '\n') {
                inName = true;
                last = idx + 1;
            } else if (c == ':') {
                inName = false;
                last = idx + 1;
            } else {
                if (inName &&
                    c == '-' &&
                    rules[idx + 1] == '-') {
                    let sub = rules.substr(idx);
                    let matches = sub.match(nameReg);
                    let name;
                    if (matches) {
                        name = matches[0];
                        vars.push({
                            name,
                            start: current + idx,
                            end: current + idx + name.length
                        });
                        idx += name.length - 1;
                    } else {
                        throw {
                            message: '[MXC Error(css-parser)] get name error',
                            file: file,
                            extract: getArround()
                        };
                    }
                }
            }
            idx++;
        }
    };
    let processRules = () => {
        let pseudos = [];
        //let nativeNest = [];
        // overSelectors = 0;
        //selectorStart = current;
        while (current < max) {
            stripWhitespaceAndGo(0);
            let tc = css.charAt(current);
            if (tc == '/') {
                current = css.indexOf('*/', current) + 2;
                break;
            } else if (tc == '@') {
                break;
            } else if (tc == ',') {//.title,.name {} #app{}
                prev = '';
                //takeSelector();
                //overSelectors = 0;
                current++;
                //selectorStart = current;
            } else if (tc == '{') {
                //takeSelector();
                current++;
                let nestIndex = css.indexOf('@nest', current);
                let andIndex = css.indexOf('&', current);
                let closeIndex = css.indexOf('}', current);
                let ti;
                if (nestIndex != -1 &&
                    nestIndex < closeIndex) {
                    ti = nestIndex + 5;
                } else if (andIndex != -1 &&
                    andIndex < closeIndex) {
                    ti = andIndex + 1;
                } else if (closeIndex != -1) {
                    ti = closeIndex;
                    processSelectorRules(current, ti);
                }
                if (ti != -1) {
                    current = ti;
                } else {
                    throw {
                        message: '[MXC Error(css-parser)] missing right brace',
                        file: file,
                        extract: getArround()
                    };
                }
            } else if (tc == '}') {
                current++;
                break;
            } else if (tc === '.' || tc === '#') {
                current++;
                let sc = current;
                let id = getNameAndGo();
                //overSelectors += tc === '.' ? selectorPower.CLASS : selectorPower.ID;
                if (tc == '.') {
                    tokens.push({
                        type: prev = 'class',
                        name: id,
                        start: sc,
                        end: current
                    });
                } else if (tc == '#') {
                    tokens.push({
                        type: prev = 'id',
                        name: id,
                        start: sc,
                        end: current
                    });
                }
            } else if (tc === '[') {
                current++;
                let temp = css.substr(current);
                let matches = temp.match(attrReg);
                if (!matches) {
                    throw {
                        message: '[MXC Error(css-parser)] bad attribute',
                        file: file,
                        extract: getArround()
                    };
                }
                tokens.push({
                    type: 'attr',
                    name: matches[1],
                    start: current - 1,
                    //first: !prev,
                    ctrl: matches[2],
                    quote: matches[3] || '',
                    end: current + matches[0].length,
                    value: matches[4] || matches[5],
                    ignoreCase: !!matches[6]
                });
                //overSelectors += selectorPower.ATTR;
                prev = 'attr';
                current += matches[0].length;
            } else if (tc === ':') {
                if (css.charAt(current + 1) === ':') {
                    current += 2;
                    getNameAndGo();
                    continue;
                }
                current++;
                let begin = current;
                let id = getNameAndGo();
                if (css.charAt(current) === '(') {
                    if (unpackPseudos.hasOwnProperty(id)) {
                        let quot = css.charAt(current + 1);
                        let quoted = quot in quotes;
                        current += quoted + 1;
                        pseudos.push({
                            quoted,
                            //selectorStart,
                            //overSelectors
                        });
                        prev = '';
                        //selectorStart = current;
                    } else {
                        let ti = css.indexOf(')', current);
                        if (ti > -1) {
                            current = ti + 1;
                            if (id == 'global') {
                                let range = css.substring(begin - 1, current);
                                tokens.push({
                                    type: 'global',
                                    start: begin - 1,
                                    content: range.slice(8, -1),
                                    end: current
                                });
                            }
                        }
                    }
                }
            } else if (tc == ')') {
                current++;
                if (pseudos.length) {
                    //let last = pseudos.pop();
                    //takeSelector(last.quoted ? -2 : -1);
                    // overSelectors = last.overSelectors;
                    //selectorStart = last.selectorStart;
                    //takeSelector();
                } else {
                    prev = '';
                    //selectorStart = current;
                    // overSelectors = 0;
                }
            } else if (nameReg.test(css.substr(current))) {
                let sc = current;
                let id = getNameAndGo();
                tokens.push({
                    type: prev = 'tag',
                    name: id,
                    start: sc,
                    end: current
                });
                // if (!ignoreTags[id]) {
                //     overSelectors += selectorPower.TAG;
                // }
            } else {
                current++;
            }
        }
    };
    while (current < max) {
        stripWhitespaceAndGo(0);
        c = css.charAt(current);
        if (c === '@') {
            let start = current;
            current++;
            let name = getNameAndGo();
            if (name == 'property') {
                stripWhitespaceAndGo(0);
                let start = current;
                let next = getNameAndGo();
                vars.push({
                    name: next,
                    start,
                    end: current
                });
                skipAtRuleContent();
            } else if (atRuleSearchContent.hasOwnProperty(name)) {
                skipAtRuleUntilLeftBrace();
                processRules();
            } else if (atRuleIgnoreContent.hasOwnProperty(name)) {
                //let start = current;
                if (name == 'keyframes' ||
                    name == '-webkit-keyframes' ||
                    name == '-moz-keyframes' ||
                    name == '-ms-keyframes' ||
                    name == '-o-keyframes') {
                    stripWhitespaceAndGo(0);
                    let start = current;
                    let key = getNameAndGo();
                    tokens.push({
                        type: 'at-rule',
                        key: 'keyframes',
                        name: key,
                        start,
                        end: current
                    });
                }
                let cStart = current;
                skipAtRuleContent();
                if (name == 'global') {
                    let left = css.indexOf('{', cStart);
                    tokens.push({
                        type: 'global',
                        start: start,
                        end: current,
                        content: css.slice(left + 1, current - 1)
                    });
                }
            } else {
                skipAtRule();
                if (name == 'import') {
                    nests.push(css.substring(start, current - 1));
                }
            }
        } else {
            processRules();
        }
    }
    //console.log(JSON.stringify(selectors));
    return {
        vars,
        tokens,
        nests,
        //selectors
    };
};
module.exports = (css, file, refAtRules) => {
    let key = file + '@' + css;
    if (cache[key]) {
        return cache[key];
    }
    return (cache[key] = parse(css, file, refAtRules));
};