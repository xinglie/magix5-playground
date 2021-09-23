let htmlParser = require('./html-parser');
let { nativeTags, svgTags, mathTags, svgUpperTags } = require('./html-tags');
let chalk = require('chalk');
let util = require('util');
let utils = require('./util');
let configs = require('./util-config');
let { htmlAttrParamFlag,
    //tmplTempStaticKey,
    tmplTempRealStaticKey,
    tmplGroupTag,
    tmplGroupUseAttr,
    tmplGroupKeyAttr,
    tmplMxViewParamKey,
    quickCommandTagName,
    tmplGroupId,
    tmplGroupParentId,
    //tmplTempInlineStaticKey,
    quickSourceArt } = require('./util-const');
let tmplCommandAnchorReg = /\x07\d+\x07/;
let safeVarReg = /[^a-zA-Z0-9_$]/;
let upperCaseReg = /[A-Z]/;
let valuableReg = /^\s*(?:\x07\d+\x07)+\s*\?\?\s*/;
let booleanReg = /^\s*(?:\x07\d+\x07)+\s*\?\s*/;
let isMxViewAttrReg = /^(?:\x1c\d+\x1c)?mx-view$/;
// let updateLinkage = (token, children, pos) => {
//     token.first = false;
//     token.firstElement = false;
//     let prev = children[pos - 1];
//     if (prev) {
//         prev.last = false;
//         if (prev.isText) {
//             prev = children[pos - 2];
//         }
//     }
//     if (prev) {
//         if (!token.isText) {
//             prev.lastElement = false;
//         }
//     } else {
//         if (!token.isText) {
//             token.firstElement = true;
//         }
//     }
// };
let addChildren = (token, parent) => {
    if (parent) {
        let c = parent.children;
        if (!c) {
            parent.children = c = [];
        }
        // if (c.length === 0) {
        //     token.first = true;
        //     token.firstElement = !token.isText;
        // } else {
        //     updateLinkage(token, c, c.length);
        // }
        // token.last = true;
        // if (!token.isText) {
        //     token.lastElement = true;
        // }
        c.push(token);
        token.isChild = true;
        token.pId = parent.id;
    }
};
module.exports = (input, htmlFile, walk) => {
    let ctrls = [];
    let tokens = [];
    let id = 0;
    let tokensMap = Object.create(null);
    let svgStack = [];
    let inSVG = false;
    let tmplCustomAttrs = configs.tmplCustomAttrs;
    tokens.__map = tokensMap;
    //console.log('---', htmlFile);
    //console.log(input);
    htmlParser(input, {
        start(tag, {
            attrs,
            unary,
            start,
            end,
            attrsStart,
            attrsEnd
        }) {
            //console.log(tag);
            let lowerTag = tag.toLowerCase();
            if (htmlFile &&
                upperCaseReg.test(tag) &&
                !(inSVG && svgUpperTags[tag])) {
                console.log(chalk.red('[MXC Tip(tmpl-parser)] avoid use ' + tag), 'at', chalk.magenta(htmlFile), 'use', chalk.red(lowerTag), 'instead');
            }
            if (lowerTag == 'svg') {
                inSVG = true;
                svgStack.push(lowerTag);
            } else if (lowerTag == 'foreignobject') {
                //前置有svg标签
                if (svgStack.length) {
                    inSVG = false;
                    svgStack.push(lowerTag);
                }
            }
            let ic = tag.indexOf('-');
            let ip = tag.indexOf('.');
            let i = -1;
            let pfx = '';
            if (ic != -1 || ip != -1) {
                if (ic != -1 && ip != -1) {
                    i = Math.min(ic, ip);
                } else if (ic != -1) {
                    i = ic;
                } else {
                    i = ip;
                }
            }
            if (i != -1) {
                pfx = tag.slice(0, i);
            }
            let parent = ctrls[ctrls.length - 1];
            let attrsKV = Object.create(null);
            let token = {
                id: 't' + id++,
                pId: parent && parent.id,
                tag,
                pfx,
                unary,
                group: i != -1 && i == ip,
                attrsKV,
                customTag: !nativeTags[lowerTag] && !svgTags[lowerTag] && !mathTags[lowerTag],
                hasContent: true,
                start,
                end,
                attrsStart,
                attrsEnd
            };
            tokensMap[token.id] = token;
            addChildren(token, parent);
            ctrls.push(token);
            tokens.push(token);
            let temp;
            for (let i = 0, len = attrs.length, a; i < len; i++) {
                a = attrs[i];
                temp = a.name;
                if (tmplCustomAttrs.length) {
                    for (let custom of tmplCustomAttrs) {
                        if (utils.isString(custom)) {
                            if (custom == temp) {
                                token.hasCustAttr = true;
                            }
                        } else if (util.types.isRegExp(custom)) {
                            if (custom.test(temp)) {
                                token.hasCustAttr = true;
                            }
                        } else if (utils.isFunction(custom)) {
                            if (custom(temp, token)) {
                                token.hasCustAttr = true;
                            }
                        }
                    }
                }
                if (isMxViewAttrReg.test(temp)) {
                    token.hasMxView = true;
                    token.mxView = a.value;
                } else if (temp == 'mx-ref' ||
                    temp == 'mx5-ref') {
                    token.hasMxRef = true;
                } else if (temp == tmplTempRealStaticKey) {
                    token.mxsRealKey = a.value;
                } else if (temp == tmplMxViewParamKey) {
                    token.mxvKey = a.value;
                } else if (temp.startsWith(htmlAttrParamFlag)) {
                    token.hasParamsAttr = true;
                } else if (temp == tmplGroupUseAttr) {
                    token.groupUseNode = tag == tmplGroupTag;
                    token.groupUse = a.value;
                    if (safeVarReg.test(token.groupUse)) {
                        throw new Error(`[MXC-Error(tmpl-parser)] unsupport mx-slot name "${token.groupUse}" at ${htmlFile}`);
                    }
                } else if (temp == tmplGroupKeyAttr) {
                    token.groupKeyNode = tag == tmplGroupTag;
                    token.groupKey = a.value;
                    if (safeVarReg.test(token.groupKey)) {
                        throw new Error(`[MXC-Error(tmpl-parser)] unsupport mx-slot name "${token.groupKey}" at ${htmlFile}`);
                    }
                } else if (temp == tmplGroupId) {
                    token.groupId = a.value
                } else if (temp == tmplGroupParentId) {
                    token.groupParentId = a.value
                } else if (temp == 'fn') {
                    token.groupContextNode = tag == tmplGroupTag;
                }
                if (!a.unary) {
                    if (a.value.indexOf('@:') > -1) {
                        token.atAttrContent = true;
                    }
                    if (a.value.startsWith('\x1f')) {
                        token.hasMxEvent = true;
                    }
                    if (valuableReg.test(a.value) ||
                        booleanReg.test(a.value)) {
                        token.condAttr = true;
                    }
                    temp += '="' + a.value + '"';
                    if (!tmplCommandAnchorReg.test(a.name)) {
                        attrsKV[a.name] = a.value;
                    }
                    if (a.value.indexOf('>') > -1 ||
                        a.value.indexOf('<') > -1) {
                        token.needEncode = true;
                    }
                } else if (!tmplCommandAnchorReg.test(a.name)) {
                    attrsKV[a.name] = true;
                }
            }
            if (token.hasOwnProperty('attrsStart')) {
                token.hasAttrs = true;
            }
            token.contentStart = end;
            if (unary) {
                ctrls.pop();
                delete token.contentStart;
                delete token.hasContent;
            }
        },
        end(tag, { start, end, attrs }) {
            //console.log('end', tag);
            let token = ctrls.pop();
            if (token.tag == tmplGroupTag &&
                !token.groupKeyNode &&
                !token.groupUseNode) {
                throw new Error('[MXC-Error(tmpl-parser)] mx-slot missing name attribute at ' + htmlFile);
            }
            if (!token || token.tag !== tag) {
                let msg = '[MXC-Error(tmpl-parser)] ';
                if (!token) {
                    msg += `can not process unopened tag "</${tag}>"`;
                } else {
                    let tip = 'open tag "' + token.tag + '"';
                    if (token.tag == quickCommandTagName) {
                        tip = `art ctrl "{{` + token.attrsKV[quickSourceArt] + '}}"';
                    }
                    msg += `"</${tag}>" unmatched ${tip}`;
                }
                throw new Error(msg + ' at ' + htmlFile);
            }
            let lower = tag.toLowerCase();
            if (lower == 'foreignobject') {
                if (svgStack.length) {
                    svgStack.pop();
                }
                if (svgStack.length) {
                    inSVG = svgStack[svgStack.length - 1] == 'svg';
                } else {
                    inSVG = false;
                }
            } else if (lower == 'svg') {
                inSVG = false;
                svgStack.pop();
            }
            token.endAttrs = attrs;
            token.contentEnd = start;
            token.end = end;
        },
        comment(cmd, start, end) {
            let token = {
                id: 't' + id++,
                isComment: true,
                content: cmd,
                start,
                end
            };
            let parent = ctrls[ctrls.length - 1];
            addChildren(token, parent);
            tokens.push(token);
            tokensMap[token.id] = token;
        },
        chars(text, { start, end }) {
            let token = {
                id: 't' + id++,
                isText: true,
                content: text,
                start,
                end
            };
            let parent = ctrls[ctrls.length - 1];
            addChildren(token, parent);
            tokens.push(token);
            tokensMap[token.id] = token;
        }
    });
    for (let i = tokens.length, token; i--;) {
        token = tokens[i];
        if (walk) {
            walk(token, tokensMap);
        }
        if (token.isChild) {
            tokens.splice(i, 1);
        }
        if (token.hasMxView) {
            let pId = token.pId;
            while (pId) {
                let pToken = tokensMap[pId];
                if (pToken) {
                    pToken.hasSubView = true;
                    pId = pToken.pId;
                } else {
                    break;
                }
            }
        }
    }

    // for (let i = 0; i < tokens.length; i++) {
    //     let token = tokens[i];
    //     if (!i) {
    //         token.first = true;
    //     }
    //     if (!token.isText) {
    //         token.firstElement = true;
    //         break;
    //     }
    // }
    // for (let i = tokens.length; i--;) {
    //     let token = tokens[i];
    //     if (i == tokens.length - 1) {
    //         token.last = true;
    //     }
    //     if (!token.isText) {
    //         token.lastElement = true;
    //         break;
    //     }
    // }
    return tokens;
};