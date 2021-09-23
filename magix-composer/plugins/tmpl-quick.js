/*
<--循环支持isLast isFirst-->
{{each list as value index isLast isFirst}}

{{/each}}

<--节点属性可以使用对象展开，展开操作可以使用*或...操作符-->
<div {{*attrs}} {{...attrs}}></div>

<--可以直接引用生成的虚拟节点-->
{{&virtualNodes}}

<--循环写法-->

{{each list as value}}
    <div>{{=value}}</div>
{{/each}}

or 

<div qk:each="{{list as value}}">{{=value}}</div>


{{forin list as value}}
    <div>{{=value}}</div>
{{/forin}}

or 

<div qk:forin="{{list as value}}">{{=value}}</div>


{{for(let i=0;i<10;i++)}}
    <div>{{=i}}</div>
{{/for}}

or 

<div qk:for="{{let i=;i<10;i++}}">{{=i}}</div>





*/
let htmlParser = require('./html-parser');
let tmplCmd = require('./tmpl-cmd');
let configs = require('./util-config');
let artExpr = require('./tmpl-art-ctrl');
let {
    quickDirectTagName,
    quickCommandTagName,
    quickDirectCodeAttr,
    quickSpreadAttr,
    quickAutoAttr,
    quickOpenAttr,
    quickCloseAttr,
    quickEachAttr,
    quickElseIfAttr,
    quickForAttr,
    quickIfAttr,
    quickForInAttr,
    quickDeclareAttr,
    quickConditionReg,
    quickLoopReg,
    quickElseAttr,
    quickGroupFnPrefix,
    tmplStoreIndexKey,
    tmplTempRealStaticKey,
    artCommandReg,
    tmplGroupTag,
    tmplGroupId,
    tmplGroupParentId,
    tmplCondPrefix,
    tmplGroupKeyAttr,
    tmplGroupUseAttr,
    tmplVarTempKey,
    quickSourceArt,
    tmplMxViewParamKey,
    tmplGroupRootAttr,
    tmplStaticKey,
    tmplTempInlineStaticKey,
    tmplGlobalDataRoot
} = require('./util-const');
let utils = require('./util');
let regexp = require('./util-rcache');
let attrMap = require('./html-attrs');
let tmplUnescape = require('html-entities-decoder');
let md5 = require('./util-md5');
//let isMethodReg = /^\s*[a-zA-Z0-9$_]+\([\s\S]+?\)\s*$/;
let numString = /^'(-?[0-9_](?:[0-9_]*|\.[0-9_]+))'$/;
let chalk = require('chalk');
let viewIdReg = /\x1f/g;
let artCtrlReg = /(?:<%'(\d+)\x11([^\x11]+)\x11'%>)?<%([#=:&])?([\s\S]+?)%>/g;
let inReg = /\(([\s\S]+?)\s*,\s*([^),]+),\s*([^),]+),\s*([^),]+),\s*(1|-1),\s*([0-9\.]+)\)\s*in\s+([\S\s]+)/;
let mathcer = /<%([#=*]|\.{3})?([\s\S]*?)%>|$/g;
let escapeSlashRegExp = /\\|'/g;
let unescapeBreakReg = /\\n/g;
let suffixReg = /\+'';\s*/g;
let endReg = /;\s*$/;
let condPlus = /\+''\+/g;
let tagHReg = /\x03\d+\x03/g;
let tmplCommandAnchorReg = /\x07\d+\x07/g;
let ifExtractReg = /^\s*(?:for|if)\s*\(([\s\S]+?)\)\s*;?\s*$/;
let commaExprReg = /(?:,''\)|(%>'));/g;
let directReg = /\{\{&[\s\S]+?\}\}/g;
let spreadAttrsReg = /\{\{(?:\*|\.{3})[\s\S]+?\}\}/g;
let condPrefix = /^\x1c\d+\x1c/;
let tagReg = /<(\/?)([^>\s]+)[^>]*>/g;
let matchedTagReg = /(<([^>\s\/]+)[^>]*>)([^<>]*?)(<\/\2>)/g;
let lastCloseReg = />([^>]*)$/;
let condEscapeReg = /^((?:\x07\d+\x07)+\s*\\*?)\\\?/;
let inlineStaticHTMLReg = /\/\/#inline_static_html_node_ph_(\d+);\r\n/g;
let tmplFnParams = ['$encodeUrl', '$refData', '$keyOf', '$encodeQuote', '$isArray'];
let tmplRadioOrCheckboxKey = 'tmpl_radio_or_checkbox_names';
let longExpr = /[\.\[\]]/;
let spanceAndSemicolonReg = /\s*;*\s*$/;
let trimExtraElseReg = /else\s*\{\s*\}/g;
let safeVarReg = /[^a-zA-Z0-9_$]/g;
let safeVar = s => s.replace(safeVarReg, '$_');
let slotReg = /\$slots\.([a-zA-Z0-9$_]+)/g;
let quoteMap = {
    '\t': '\\t',
    '&#13;': '\\r',
    '&#10;': '\\n',
    '&#9;': '\\t',
    '&#xd;': '\\r',
    '&#xa;': '\\n',
    '&#x9;': '\\t',
    '&#34;': '\\"',
    '&quot;': '\\"',
    '&#x22;': '\\"',
    '&#39;': '\\\'',
    '&#x27;': '\\\'',
    '&apos;': '\\\'',
    '&#92;': '\\\\',
    '&#x5c;': '\\\\'
};
let quoteReg = new RegExp('(?:' + Object.keys(quoteMap).join('|') + ')', 'g');
//console.log(quoteReg);
let quoteReplacer = m => quoteMap[m];
let encodeSlashRegExp = s => s.replace(escapeSlashRegExp, '\\$&');
let storeInnerMatchedTags = (tmpl, store) => {
    let idx = store[tmplStoreIndexKey] || 0;
    return tmpl.replace(matchedTagReg, (m, prefix, tag, content, suffix) => {
        let groups = [prefix, content, suffix];
        let returned = '';
        for (let g of groups) {
            let key = '\x03' + idx++ + '\x03';
            store[key] = {
                tag: g == prefix,
                src: g
            };
            returned += key;
        }
        store[tmplStoreIndexKey] = idx;
        return returned;
    });
};
let storeHTML = (tmpl, store) => {
    let idx = store[tmplStoreIndexKey] || 0;
    return tmpl.replace(tagReg, (m, closed, tag) => {
        let key = '\x03' + idx++ + '\x03';
        store[key] = {
            tag: closed ? false : true,
            special: tag == quickDirectTagName || tag == quickCommandTagName,
            src: m
        };
        store[tmplStoreIndexKey] = idx;
        return key;
    });
};
let canGenerateHTML = node => {
    if (node.tag == tmplGroupTag) {
        return false;
    }
    let hasTmplGroupTag = node.innerHasGroupTag;
    if (hasTmplGroupTag) {
        return false;
    }
    if (node.children.length > 1) {
        return true;
    }
    for (let e of node.children) {
        if (e.type == 1) {
            return true;
        }
    }
    return false;
};

let isChildOf = (sub, parent) => {
    if (sub.level > parent.level) {
        let pIndex = sub.path[parent.level];
        return pIndex == parent.index;
    }
    return false;
};
let isInGroupNode = (start, groups, loose) => {
    for (let g of groups) {
        if (isChildOf(start, g)) {
            if (loose) {
                return true;
            }
            if (!g.staticValue) {
                return true;
            }
        }
    }
    return false;
};
let findInnerUsedGroups = (start, groupsOfUsed, groupsOfDeclaredMap) => {
    let groups = [];
    for (let g of groupsOfUsed) {
        if (isChildOf(g, start)) {
            let dest = groupsOfDeclaredMap[g.groupUse];
            if (dest) {
                groups.push(dest);
            }
        }
    }
    return groups;
};

let toNumberString = s => {
    if (numString.test(s)) {
        let r = s.replace(numString, '$1');
        let fi = r.indexOf('.'),
            li = r.lastIndexOf('.'),
            fs = r.indexOf('-'),
            ls = r.lastIndexOf('-');
        if (fi == li &&
            r.length < 17 &&
            fs == ls &&
            (r.length == 1 ||
                !r.startsWith('0'))) {
            let n, max,
                rest;
            if (fi > -1) {
                n = r.substring(0, fi);
                max = Number.MAX_SAFE_INTEGER - 1;
                rest = r.substring(fi);
            } else {
                n = r;
                max = Number.MAX_SAFE_INTEGER;
                rest = '';
            }
            if (Number(n) <= max) {
                return n + rest;
            }
        }
    }
    return s;
};
let findAllInnerGroups = (start,
    groupsOfUsed,
    groupsOfDeclared,
    groupsOfDeclaredMap,
    groupsOfIds,
    refGroups) => {
    if (refGroups.indexOf(start) == -1) {
        refGroups.push(start);
        let used = findInnerUsedGroups(start, groupsOfUsed, groupsOfDeclaredMap);
        for (let p of groupsOfDeclared) {
            if (p.groupParentId == start.groupId) {
                used.push(p);
            }
        }
        for (let n of used) {
            findAllInnerGroups(n, groupsOfUsed, groupsOfDeclared, groupsOfDeclaredMap, groupsOfIds, refGroups);
        }
    }
};

let findParentHasMagixEvent = (current, key, map) => {
    let has = false, offset = 0;
    do {
        let p = map[current.pId];
        if (p) {
            if (p.hasMagixEvent &&
                p.magixEvents[key] === 1) {
                has = true;
                break;
            }
            current = p;
            if (p.tag != quickCommandTagName) {
                offset++;
            }
        } else {
            break;
        }
    } while (1);
    return { has, offset };
};
let extractArtAndCtrlFrom = tmpl => {
    let result = [];
    tmpl.replace(artCtrlReg, (match, line, art, operate, ctrl) => {
        art = art || '';
        art = art.replace(unescapeBreakReg, '\n');
        result.push({
            origin: match,
            line,
            operate,
            art,
            ctrl
        });
    });
    return result;
};

let toFn = (key, tmpl, fromAttr, e, inGroup) => {
    //tmpl = tmpl.replace(/%>\s+<%/g, '%><%');
    //console.log(tmpl);
    let index = 0,
        hasCtrl = false,
        hasOut = false,
        hasCmdOut = false,
        source = `${key}='`,
        snippet,
        preArt = -1,
        ctrlCount = 0,
        hasSnippet = false,
        hasCharSnippet = false,
        setStart = false,
        hasVarOut = false,
        reg = regexp.get(`${regexp.escape(key)}\\+='';+`, 'g');
    tmpl.replace(mathcer, (match, operate, content, offset) => {
        snippet = attrMap.escapeSlashAndBreak(tmpl.substring(index, offset));
        if (snippet) {
            hasSnippet = hasSnippet || !content || !setStart;
            hasCharSnippet = hasCharSnippet || !!snippet.trim();
            hasOut = true;
            if (preArt == index) {
                source += `'')+'`;
            }
        }
        setStart = true;
        //if (decode) {
        //console.log(snippet, JSON.stringify(snippet));
        snippet = tmplUnescape(snippet.replace(quoteReg, quoteReplacer));
        //console.log(snippet);
        //}
        source += snippet;
        index = offset + match.length;
        let ctrl = tmpl.substring(index - match.length + 2 + (operate ? operate.length : 0), index - 2);
        let artReg = /^'(\d+)\x11([^\x11]+)\x11'$/;
        let artMatch = ctrl.match(artReg);
        let art = '', line = -1;
        ctrl = attrMap.escapeSlashAndBreak(ctrl);
        if (artMatch) {
            ctrl = '';
            art = artMatch[2];
            line = artMatch[1];
        }
        if (operate == '@' ||
            operate == '#') {
            hasOut = true;
            hasCmdOut = true;
            hasVarOut = true;
            let idx = content.indexOf(',\x00xl\x00');
            if (idx > -1) {
                let key = content.substring(idx + 5);
                content = content.substring(0, idx);
                if (!inGroup) {
                    content += ',' + key;
                    //console.log(content);
                }
            }
            idx = ctrl.indexOf(',\x00xl\x00');
            if (idx > -1) {
                let key = ctrl.substring(idx + 5)
                ctrl = ctrl.substring(0, idx);
                if (!inGroup) {
                    ctrl += ',' + key;
                }
            }
            //console.log(JSON.stringify([ctrl, content]));
            //console.log(JSON.stringify(content));
            //let a = tmplCmd.extractRefContent(content);
            //console.log(a);
            //let out = `($refData[${a.key}]=${a.vars},${a.key})`;
            let out = `$keyOf($refData,${content})`;
            if (configs.debug) {
                if (preArt == offset) {
                    source += `$__ctrl='<%${operate}${ctrl}%>',${out})+'`;
                } else {
                    source += `'+($__ctrl='<%${operate}${ctrl}%>',${out})+'`;
                }
            } else {
                source += `'+${out}+'`;
            }
        } else if (operate == '=') {
            hasOut = true;
            hasCmdOut = true;
            hasVarOut = true;
            let safe = ``;
            // if ((!content.startsWith('$encodeQuote(') &&
            //     !content.startsWith('$keyOf(') &&
            //     !content.startsWith('$encodeUrl(') &&
            //     !content.startsWith('$nullCheck(')) &&
            //     content != '$viewId' &&
            //     !isMethodReg.test(content)) {
            //     safe = '$nullCheck';
            // }
            if (content.startsWith(e.uniqueId)) {
                content = content.replace(e.uniqueId, '');
                safe = '';
            }
            if (ctrl.startsWith(e.uniqueId)) {
                ctrl = ctrl.replace(e.uniqueId, '');
            }

            let out = `${safe}(${content})`;
            if (configs.debug) {
                if (preArt == offset) {
                    source += `$__ctrl='<%=${ctrl}%>',${out})+'`;
                } else {
                    source += `'+($__ctrl='<%=${ctrl}%>',${out})+'`;
                }
            } else {
                source += `'+${out}+'`;
            }
        } else if (operate == '*' ||
            operate == '...') {
            hasOut = true;
            hasCmdOut = true;
            hasVarOut = true;
            if (configs.debug) {
                if (preArt == offset) {
                    source += `$__ctrl='<%${operate}${ctrl}%>',${content})+'`;
                } else {
                    source += `'+($__ctrl='<%${operate}${ctrl}%>',${content})+'`;
                }
            } else {
                source += `'+${content}+'`;
            }
        } else if (content) {
            if (line > -1) {
                preArt = index;
                //console.log(art);
                source += `'+($__line=${line},$__art='{{${art}}}',`;
                hasVarOut = true;
            } else {
                ctrlCount++;
                if (preArt == offset) {
                    source += `'')+'`;
                }
                hasCtrl = true;
                source += `';`;
                if (configs.debug) {
                    source += `$__ctrl='<%${ctrl}%>';`;
                }
                source += `${content};${key}+='`;
            }
        }
        return match;
    });
    source += `';`;
    //console.log(JSON.stringify(source));
    source = source
        .replace(viewIdReg, `'+$viewId+'`)
        .replace(reg, '');
    reg = regexp.get(`^${regexp.escape(key)}=''\\+`);
    source = source
        .replace(reg, regexp.encode(key + '='))
        .replace(suffixReg, ';')
        .replace(condPlus, '+')
        .replace(endReg, '');
    if (configs.debug && fromAttr && !hasOut && ctrlCount == 1) {
        source = source.replace(commaExprReg, '$1,') + ')';
    }
    if (ctrlCount > 1 && !hasOut) {//如果超出1条控制语句，即使没有输出，也要认为有输出
        hasOut = true;
    }
    let trimmedPrefix = false;
    if (!hasOut || !hasCtrl) {
        reg = regexp.get(`^${regexp.escape(key)}=(?:'';+)?`);
        source = source.replace(reg, '');
        trimmedPrefix = true;
    }
    //console.log(source,key,tmpl);
    return {
        source,
        hasOut,
        trimmedPrefix,
        hasSnippet,
        hasCharSnippet,
        hasVarOut,
        hasCmdOut,
        hasCtrl
    };
};
let serAttrs = (key, value, fromAttr, e, inGroup) => {
    if (value === true ||
        value === false) {
        return {
            hasOut: true,
            direct: true,
            returned: value
        };
    }
    let { source,
        hasCtrl,
        hasOut,
        hasSnippet,
        hasCharSnippet,
        hasCmdOut,
        hasVarOut,
        trimmedPrefix } = toFn(key, value, fromAttr, e, inGroup);
    if (hasCtrl && hasOut) {
        return {
            trimmedPrefix,
            direct: false,
            hasCmdOut,
            hasCharSnippet,
            returned: source,
            hasSnippet,
            hasVarOut
        };
    } else {
        return {
            trimmedPrefix,
            direct: true,
            hasCtrl,
            hasCmdOut,
            hasCharSnippet,
            returned: source,
            hasVarOut
        };
    }
};
let getForContent = (cnt, e) => {
    let fi = extractArtAndCtrlFrom(cnt);
    if (fi.length > 1 || fi.length < 1) {
        throw new Error('[MXC-Error(tmpl-quick)] bad loop ' + cnt + ' at ' + e.shortHTMLFile);
    }
    fi = fi[0];
    let m = fi.ctrl.match(inReg);
    if (m) {
        return {
            art: fi.art,
            line: fi.line,
            first: m[3],
            last: m[4],
            value: m[1],
            list: m[7],
            key: m[2],
            asc: m[5] == 1,
            step: Number(m[6])
        };
    }
    throw new Error('[MXC-Error(tmpl-quick)] bad loop ' + cnt + ' at ' + e.shortHTMLFile);
};
let getIfContent = (cnt, e) => {
    let fi = extractArtAndCtrlFrom(cnt);
    //console.log(fi);
    if (fi.length > 1 || fi.length < 1) {
        throw new Error('[MXC-Error(tmpl-quick)] bad if ' + cnt + ' at ' + e.shortHTMLFile);
    }
    fi = fi[0];
    let m = fi.ctrl.match(ifExtractReg);
    if (m) {
        return {
            art: fi.art,
            line: fi.line,
            value: m[1]
        };
    }
    //console.log(m,fi);
    throw new Error('[MXC-Error(tmpl-quick)] bad if ' + cnt + ' at ' + e.shortHTMLFile);
};
let parser = (tmpl, e) => {
    //console.log('parser', tmpl);
    let cmds = Object.create(null);
    let map = Object.create(null);
    let idCounter = 0;
    let groupDeclared = [];
    let groupUsed = [];

    tmpl = tmplCmd.store(tmpl, cmds);
    //console.log(tmpl);
    let current = {
        id: 'qk' + idCounter++,
        level: 0,
        index: 0,
        path: [0],
        children: []
    };
    let stack = [current],
        textareaCount = 0;
    htmlParser(tmpl, {
        start(tag, {
            attrs,
            unary,
            start,
            end,
            attrsMap
        }) {
            let token = {
                id: 'qk' + idCounter++,
                pId: current.id,
                level: current.level + 1,
                tag,
                type: 1,
                ctrls: [],
                children: [],
                magixEvents: {},
                contentStart: end
            };
            if (tag == tmplGroupTag) {
                let pNode = map[token.pId];
                while (pNode) {
                    pNode.innerHasGroupTag = true;
                    pNode = map[pNode.pId];
                }
            }
            map[token.id] = token;
            if (textareaCount) {
                token.start = start;
            }
            if (tag == 'textarea') {
                textareaCount++;
            }
            let aList = [],
                auto = false;
            for (let a of attrs) {
                if (a.name == quickDirectCodeAttr) {
                    let t = tmplCmd.recover(a.value, cmds);
                    let fi = extractArtAndCtrlFrom(t);
                    if (fi.length > 1 || fi.length < 1) {
                        throw new Error('[MXC-Error(tmpl-quick)] bad direct tag ' + t + ' at ' + e.shortHTMLFile);
                    }
                    fi = fi[0];
                    token.directArt = fi.art;
                    token.directLine = fi.line;
                    token.directCtrl = fi.ctrl;
                } else if (a.name == quickAutoAttr) {
                    auto = true;
                } else if (a.name == quickEachAttr ||
                    a.name == quickForInAttr) {
                    let t = tmplCmd.recover(a.value, cmds);
                    let fi = getForContent(t, e);
                    token.ctrls.push({
                        type: a.name == quickEachAttr ? 'each' : 'forin',
                        line: fi.line,
                        art: fi.art,
                        first: fi.first,
                        last: fi.last,
                        key: fi.key,
                        value: fi.value,
                        list: fi.list,
                        asc: fi.asc,
                        step: fi.step
                    });
                    token.hasCtrls = true;
                } else if (a.name == quickIfAttr ||
                    a.name == quickElseIfAttr) {
                    let t = tmplCmd.recover(a.value, cmds);
                    let fi = getIfContent(t, e);
                    token.ctrls.push({
                        type: a.name == quickIfAttr ? 'if' : 'elif',
                        line: fi.line,
                        art: fi.art,
                        cond: fi.value
                    });
                    token.hasCtrls = true;
                } else if (a.name == quickElseAttr) {
                    token.ctrls.push({
                        type: 'else'
                    });
                    token.hasCtrls = true;
                } else if (a.name == quickForAttr) {
                    let t = tmplCmd.recover(a.value, cmds);
                    let fi = extractArtAndCtrlFrom(t);
                    if (fi.length > 1 || fi.length < 1) {
                        throw new Error('[MXC-Error(tmpl-quick)] bad for ' + t + ' at ' + e.shortHTMLFile);
                    }
                    fi = fi[0];
                    token.ctrls.push({
                        type: 'for',
                        line: fi.line,
                        art: fi.art,
                        cond: fi.ctrl.replace(ifExtractReg, '$1')
                    });
                    token.hasCtrls = true;
                } else if (a.name == tmplTempRealStaticKey) {
                    let p = stack[stack.length - 1];
                    //console.log(p);
                    if (!p ||
                        !p.groupKeyNode ||
                        !p.staticValue) {
                        token.canHoisting = true;
                        token.staticValue = a.value;
                    }
                    aList.push({
                        name: tmplStaticKey,
                        value: a.value,
                        unary: false
                    });
                } else if (a.name == tmplTempInlineStaticKey) {
                    token.inlineStaticValue = a.value;
                } else if (a.name == 'x-html' ||
                    a.name == 'inner-html') {
                    token.xHTML = a.value;
                    token.hasXHTML = true;
                } else if (a.name == tmplGroupKeyAttr) {
                    token.groupKey = a.value;
                    token.groupKeyNode = tag == tmplGroupTag;
                } else if (a.name == tmplGroupUseAttr) {
                    token.groupUse = a.value;
                    token.groupUseNode = tag == tmplGroupTag;
                } else if (a.name == tmplGroupId) {
                    token.groupId = a.value;
                } else if (a.name == tmplGroupParentId) {
                    token.groupParentId = a.value;
                } else if (a.name == 'fn' ||
                    a.name == 'params') {
                    token.groupContextNode = tag == tmplGroupTag;
                    token.groupContext = a.value || '';
                }/* else if (a.name == 'unique') {
                    token.groupUniqueContent = a.value;
                }*/ else if (a.name == tmplGroupRootAttr) {
                    token.groupRootRefs = a.value;
                } else if (a.name != quickDeclareAttr &&
                    a.name != quickOpenAttr &&
                    !a.name.startsWith(tmplCondPrefix)) {
                    //console.log(a.name);
                    let ignoreAttr = false;
                    if (a.name == 'type' &&
                        !a.unary &&
                        tag == 'input') {
                        token.inputType = a.value;
                    } else if (condPrefix.test(a.name)) {
                        let cond = '';
                        a.name = a.name.replace(condPrefix, m => {
                            cond = m;
                            return '';
                        });
                        if (a.name == 'mx-updateby') {
                            token.updateByKeys = a.value;
                            ignoreAttr = true;
                        } else if (a.name == 'mx-bindexpr') {
                            token.customBindExpr = true;
                        } else if (a.name == 'mx-bindto') {
                            token.customBindTo = true;
                        } if (a.name == 'mx-syncexpr') {
                            token.customBindExpr = true;
                        } else if (a.name == 'mx-syncto') {
                            token.customBindTo = true;
                        } else if (a.name == 'mx-owner') {
                            token.hasMxOwner = true;
                        } else if (a.name == 'mx-host') {
                            token.bindHost = true;
                        } else if (a.name == 'mx-view') {
                            token.isMxView = true;
                        } else if ((a.name.startsWith('mx-') ||
                            a.name.startsWith(configs.mxPrefix)) &&
                            a.value.startsWith('\x1f')) {
                            let i = a.name.indexOf('-');
                            let e = a.name.substring(i + 1);
                            token.hasMagixEvent = true;
                            token.magixEvents[e] = 1;
                        }
                        let oCond = attrsMap[`${tmplCondPrefix}${cond}`];
                        let extract = tmplCmd.extractCmdContent(oCond, cmds);
                        let isRef = extract.operate == '#';
                        let refVar;
                        if (isRef) {
                            let ref = tmplCmd.extractRefContent(extract.content);
                            refVar = ref.vars;
                        }
                        let refCond = e.tmplConditionAttrs[cond];
                        let composer = {
                            hasExt: refCond.hasExt,
                            condContent: extract.content,
                            isRef,
                            refVar,
                            boolean: refCond.boolean,
                            valuable: refCond.valuable,
                            art: extract.art,
                            line: extract.line,
                            origin: extract.origin
                        };
                        //console.log(a.name);
                        a.cond = composer;
                        if (a.name == 'x-html' ||
                            a.name == 'inner-html') {
                            token.hasXHTML = true;
                            token.cond = composer;
                            ignoreAttr = true;
                        }
                        //console.log(a.name, a.value, refCond, cmds);
                    } else if (!a.unary) {
                        tmplCommandAnchorReg.lastIndex = 0;
                        if (tmplCommandAnchorReg.test(a.name)) {
                            let src = tmplCmd.recover(a.name, cmds);
                            let { line, art } = artExpr.extractCmdToArt(src);
                            console.log(chalk.red(`[MXC-Error(tmpl-quick)] unsupport attr: ${art} at line ${line} at file: ${e.shortHTMLFile}`));
                            continue;
                        }
                        tmplCommandAnchorReg.lastIndex = 0;
                        if (a.name == 'mx-updateby') {
                            token.updateByKeys = a.value;
                            ignoreAttr = true;
                        } else if (a.value.startsWith('\x07')) {
                            a.value = a.value.replace(condEscapeReg, '$1?');
                        } else if (a.value.includes('\x1f')) {
                            token.attrHasDynamicViewId = true;
                            token.canHoisting = false;
                        }
                        if (a.name == 'mx-owner') {
                            token.hasMxOwner = true;
                        } else if (a.name == 'mx-bindexpr') {
                            token.customBindExpr = true;
                        } else if (a.name == 'mx-bindto') {
                            token.customBindTo = true;
                        } else if (a.name == 'mx-syncexpr') {
                            token.customBindExpr = true;
                        } else if (a.name == 'mx-syncto') {
                            token.customBindTo = true;
                        } else if (a.name == 'mx-host') {
                            token.bindHost = true;
                        } else if (a.name == 'mx-view') {
                            token.isMxView = true;
                        } else if ((a.name.startsWith('mx-') ||
                            a.name.startsWith(configs.mxPrefix)) &&
                            a.value.startsWith('\x1f')) {
                            let i = a.name.indexOf('-');
                            let e = a.name.substring(i + 1);
                            token.hasMagixEvent = true;
                            token.magixEvents[e] = 1;
                        } else if (a.name == 'mx-ref' ||
                            a.name == configs.mxPrefix + '-ref') {
                            token.isRef = true;
                        }
                    }
                    if (!ignoreAttr) {
                        aList.push(a);
                    }
                }
            }
            let index = current.children.length;
            token.path = [...current.path, index];
            token.index = index;
            if (token.isMxView) {
                let inLooseGroup = isInGroupNode(token, groupDeclared.concat(groupUsed), true);
                if (token.isMxView &&
                    configs.tmplSupportSlot) {
                    if (inLooseGroup) {
                        aList.unshift({
                            name: 'mx-to',
                            value: '\x05',
                            unary: false
                        });
                    } else {
                        aList.unshift({
                            name: 'mx-from',
                            value: '\x1f',
                            unary: false
                        });
                    }
                }
                if ((token.isMxView ||
                    !inLooseGroup) &&
                    !token.hasMxOwner) {
                    token.hasMxOwner = true;
                    aList.unshift({
                        name: 'mx-owner',
                        value: '\x1f',
                        unary: false
                    });
                }
            }
            if ((token.customBindExpr &&
                !token.customBindTo &&
                !token.bindHost) ||
                token.isRef) {
                token.attrHasDynamicViewId = true;
                aList.unshift({
                    name: 'mx-host',
                    value: '\x1f',
                    unary: false
                });
            }
            //console.log(token, aList);
            token.attrs = aList;
            token.unary = unary;
            token.auto = auto;
            //let prev = current.children[current.children.length - 1];
            // we can exchange tag here
            // if (token.tag == 'input' && prev && prev.tag == 'span') {
            //     current.children.pop();
            //     current.children.push(token, prev);
            // } else {
            current.children.push(token);
            //}
            if (!unary) {
                stack.push(token);
                current = token;
            }
            if (token.groupKeyNode) {
                groupDeclared.push(token);
            } else if (token.groupUseNode) {
                groupUsed.push(token);
            }
        },
        end(tag, { start, end }) {
            let e = stack.pop();
            if (tag == 'textarea') {
                textareaCount--;
                let { children } = e;
                e.children = [];
                //e.unary = true;
                let value = '';
                for (let c of children) {
                    value += c.content;
                }
                value = value.trim();
                e.attrs.push({
                    name: 'value',
                    value,
                    assign: '=',
                    quote: '"'
                });
            }

            if (textareaCount) {
                e.content = tmpl.slice(e.start, end);
            }
            if (e.contentStart >= 0) {
                e.innerHTML = tmpl.slice(e.contentStart, start);
                delete e.contentStart;
            }
            if (e.hasXHTML) {
                let oldChildren = e.children;
                if (e.cond) {
                    //console.log(e.cond);
                    let { condContent,
                        hasExt, valuable,
                        art, line, isRef, refVar } = e.cond;
                    let xHTML = valuable ? hasExt || `<%${art}%>` : hasExt;
                    if (isRef) {
                        condContent = refVar;
                    }
                    e.children = [{
                        attrs: [],
                        id: 'qk' + idCounter++,
                        pId: current.id,
                        hasCtrls: true,
                        ctrls: [{
                            art: art,
                            cond: valuable ? `(${condContent})!=null` : condContent,
                            line: line,
                            type: "if",
                        }],
                        tag: quickCommandTagName,
                        auto: true,
                        children: [{
                            type: 3,
                            isXHTML: true,
                            content: xHTML
                        }]
                    }];
                    if (oldChildren.length) {
                        e.children.push({
                            attrs: [],
                            id: 'qk' + idCounter++,
                            pId: current.id,
                            hasCtrls: true,
                            ctrls: [{
                                type: "else",
                            }],
                            tag: quickCommandTagName,
                            auto: true,
                            children: oldChildren
                        });
                    }
                } else {
                    e.children = [{
                        type: 3,
                        isXHTML: true,
                        content: e.xHTML
                    }];
                }

            }
            current = stack[stack.length - 1];
        },
        chars(text) {
            if (text.trim()) {
                let token = {
                    type: 3,
                    content: text
                };
                let index = current.children.length;
                token.path = [...current.path, index];
                token.index = index;
                current.children.push(token);
            }
        }
    });
    return {
        tokens: current.children,
        groupDeclared,
        groupUsed,
        cmds,
        tmpl,
        map
    };
};
let Directives = {
    'if'(ctrl, start, end, auto) {
        if (configs.debug) {
            let open = auto ? '{{if ' : quickIfAttr + '="{{';
            let art = `${open}${ctrl.art}}}${auto ? '' : '"'}`;
            start.push(`$__line=${ctrl.line};$__art=${JSON.stringify(art)};`);
            start.push(`$__ctrl=${JSON.stringify('if(' + ctrl.cond + '){')};`);
        }
        start.push(`\r\nif(${ctrl.cond}){\r\n`);
        end.push('\r\n}');
    },
    'elif'(ctrl, start, end, auto) {
        start.push(`else if(`);
        if (configs.debug) {
            let open = auto ? '{{else if ' : quickElseIfAttr + '="{{';
            let art = `${open}${ctrl.art}}}${auto ? '' : '"'}`;
            start.push(`($__line=${ctrl.line},$__art=${JSON.stringify(art)},`);
            start.push(`$__ctrl=${JSON.stringify('else if(' + ctrl.cond + '){')}),`);
        }
        start.push(ctrl.cond, '){\r\n');
        end.push('\r\n}');
    },
    'else'(ctrl, start, end) {
        start.push(`else{\r\n`);
        end.push('\r\n}');
    },
    'each'(ctrl, start, end, auto) {
        let shortList = utils.uId('$q_a_', '', 1);
        let listCount = utils.uId('$q_c_', '', 1);
        //console.log(ctrl);
        let decs = `let ${shortList}=${ctrl.list},`;
        if (!longExpr.test(ctrl.list)) {
            decs = 'let ';
            shortList = ctrl.list;
        }
        let initial = ctrl.value.startsWith('$q_v_') ? '' : `let ${ctrl.value}=${shortList}[${ctrl.key}];`;
        if (ctrl.asc) {
            decs += `${listCount}=${shortList}.length`;
            if (ctrl.first != -1) {
                initial += `let ${ctrl.first}=${ctrl.key}===0;`;
            }
            if (ctrl.last != -1) {
                let last = utils.uId('$q_lc_', '', 1);
                decs += `,${last}=${listCount}-1`;
                initial += `let ${ctrl.last}=${ctrl.key}===${last};`;
            }
            decs += `,${ctrl.key}=0`;
        } else {
            decs += `${ctrl.key}=${shortList}.length`;
            if (ctrl.first != -1 ||
                ctrl.last != -1 ||
                ctrl.step != 1) {
                decs += '-1';
            }
            if (ctrl.first != -1) {
                let last = utils.uId('$q_lc_', '', 1);
                decs += `,${last}=${ctrl.key}`;
                initial += `let ${ctrl.first}=${ctrl.key}===${last};`;
            }
            if (ctrl.last != -1) {
                initial += `let ${ctrl.last}=${ctrl.key}===0;`;
            }
        }
        if (configs.debug) {
            let open = auto ? '{{each ' : quickEachAttr + '="{{';
            let art = `${open}${ctrl.art}}}${auto ? '' : '"'}`;
            start.push(`$__line=${ctrl.line};$__art=${JSON.stringify(art)};`);
            if (ctrl.asc) {
                start.push(`$__ctrl=${JSON.stringify(`for(${decs};${ctrl.key}<${listCount};${ctrl.key}++){${initial}`)};`);
            } else {
                start.push(`$__ctrl=${JSON.stringify(`for(${decs};${ctrl.key}--;){${initial}`)};`);
            }
        }
        //console.log(decs);
        if (ctrl.asc) {
            start.push(`\r\nfor(${decs};${ctrl.key}<${listCount};${ctrl.key}+=${ctrl.step}){\r\n${initial}\r\n`);
        } else {
            if (ctrl.step == 1 &&
                ctrl.first == -1 &&
                ctrl.last == -1) {
                start.push(`\r\nfor(${decs};${ctrl.key}--;){\r\n${initial}\r\n`);
            } else {
                start.push(`\r\nfor(${decs};${ctrl.key}>=0;${ctrl.key}-=${ctrl.step}){\r\n${initial}\r\n`);
            }
        }
        end.push('\r\n}');
    },
    'forin'(ctrl, start, end, auto) {
        let initial = ctrl.value.startsWith('$q_v_') ? '' : `let ${ctrl.value}=${ctrl.list}[${ctrl.key}];`;
        if (configs.debug) {
            let open = auto ? '{{forin ' : quickForInAttr + '="{{'
            let art = `${open}${ctrl.art}}}${auto ? '' : '"'}`;
            start.push(`$__line=${ctrl.line};$__art=${JSON.stringify(art)};`);
            start.push(`$__ctrl=${JSON.stringify(`for(let ${ctrl.key} in ${ctrl.list}){${initial}`)};`);
        }
        start.push(`\r\nfor(let ${ctrl.key} in ${ctrl.list}){\r\n${initial}\r\n`);
        end.push('\r\n}');
    },
    'for'(ctrl, start, end, auto) {
        if (configs.debug) {
            let open = auto ? '{{for ' : quickForAttr + '="{{'
            let art = `${open}${ctrl.art}}}${auto ? '' : '"'}`;
            start.push(`$__line=${ctrl.line};$__art=${JSON.stringify(art)};`);
            start.push(`$__ctrl=${JSON.stringify(`for(${ctrl.cond}){`)};`);
        }
        start.push(`\r\nfor(${ctrl.cond}){\r\n`);
        end.push('\r\n}');
    }
};
let preProcess = (src, e) => {
    //console.log('enter',JSON.stringify(src));
    let cmds = Object.create(null),
        tags = Object.create(null);
    src = src.replace(directReg, m => {
        return `<${quickDirectTagName} ${quickDirectCodeAttr}="${m}"/>`;
    }).replace(spreadAttrsReg, m => {
        return `${quickSpreadAttr}="${m}"`;
    });
    //console.log(src);
    src = artExpr.addLine(src);
    src = tmplCmd.store(src, cmds);
    src = tmplCmd.store(src, cmds, artCommandReg);
    let count = 0;
    //以上处理模板命令，然后是合法的html标签
    /*
        我们要区别对待
        1.
         <div>
            a
                {{if cond}}
                    b
                {{/if}}
            c
         </div>
        2.
         <div>
            {{if cond}}
                <div>cond</div>
            {{/if}}
         </div>
        
        在文本中的命令语句与在标签中的命令语句处理不同，所以要先把最内部的处理下
    */
    src = storeInnerMatchedTags(src, tags);
    src = storeHTML(src, tags);
    src = src.replace(tmplCommandAnchorReg, m => {
        let ref = cmds[m];
        if (ref) {
            let i = artExpr.extractArtInfo(ref);
            //console.log(ref,i)
            if (i) {
                let { art, ctrls, line } = i;
                let sourceArt = ` ${quickSourceArt}="${attrMap.escapeAttr(art)}"`;
                if (ctrls[0] == 'each') {
                    return `<${quickCommandTagName}${sourceArt} ${quickAutoAttr} ${quickOpenAttr}="<%{%>" ${quickEachAttr}="{{\x1e${line}${art.substring(5)}}}">`;
                } else if (ctrls[0] == 'forin') {
                    return `<${quickCommandTagName}${sourceArt} ${quickAutoAttr} ${quickOpenAttr}="<%{%>" ${quickForInAttr}="{{\x1e${line}${art.substring(6)}}}">`;
                } else if (ctrls[0] == 'for') {
                    return `<${quickCommandTagName}${sourceArt} ${quickAutoAttr} ${quickOpenAttr}="<%{%>" ${quickForAttr}="{{\x1e${line}${art.substring(4)}}}">`;
                } else if (ctrls[0] == 'if') {
                    return `<${quickCommandTagName}${sourceArt} ${quickAutoAttr} ${quickOpenAttr}="<%{%>" ${quickIfAttr}="{{\x1e${line}${art.substring(3)}}}">`;
                } else if (ctrls[0] == 'else') {
                    if (ctrls[1] == 'if') {
                        return `</${quickCommandTagName} ${quickCloseAttr}="<%}%>"><${quickCommandTagName}${sourceArt} ${quickAutoAttr} ${quickOpenAttr}="<%{%>" ${quickElseIfAttr}="{{\x1e${line}${art.substring(7)}}}">`;
                    }
                    return `</${quickCommandTagName} ${quickCloseAttr}="<%}%>"><${quickCommandTagName}${sourceArt} ${quickAutoAttr} ${quickOpenAttr}="<%{%>" ${quickElseAttr}>`;
                } else if (art.startsWith('/each') ||
                    art.startsWith('/forin') ||
                    art.startsWith('/for') ||
                    art.startsWith('/if')) {
                    return `</${quickCommandTagName} ${quickCloseAttr}="<%}%>">`;
                }
            } else {
                return m;
            }
        }
        return m;
    });
    //console.log(src);

    src = tmplCmd.store(src, cmds, artCommandReg);
    //console.log(src);
    src = storeHTML(src, tags);
    //console.log(src);
    while (tagHReg.test(src)) {
        tagHReg.lastIndex = 0;
        src = src.replace(tagHReg, m => {
            m = tags[m];
            let src = m.src;
            //console.log('src',src,m.tag);
            if (m.tag) {
                src = src.replace(quickLoopReg, (_, k, $, c) => {
                    c = tmplCmd.recover(c, cmds);
                    let li = artExpr.extractArtInfo(c);
                    if (li) {
                        let expr = artExpr.extractAsExpr(li.art);
                        //console.log(expr,li.art);
                        if (!expr.value) {
                            expr.value = utils.uId('$q_v_', '', 1);
                        }
                        if (expr.bad || expr.splitter != 'as') {
                            console.log(chalk.red(`[MXC-Error(tmpl-quick)] unsupport or bad ${k} {{${li.art}}} at line:${li.line}`), 'file', chalk.grey(e.shortHTMLFile));
                            throw new Error(`[MXC-Error(tmpl-quick)] unsupport or bad ${k} {{${li.art}}} at ${e.shortHTMLFile}`);
                        }
                        if (!expr.index) {
                            expr.index = utils.uId('$q_key_', '', 1);
                        }
                        let firstAndLastVars = '';
                        let flv = '';
                        if (expr.first) {
                            firstAndLastVars += ',' + expr.first;
                            flv += ',' + expr.first;
                        } else {
                            firstAndLastVars += ',-1';
                        }
                        if (expr.last) {
                            firstAndLastVars += ',' + expr.last;
                            flv += ',' + expr.last;
                        } else {
                            firstAndLastVars += ',-1';
                        }
                        let prefix = '';
                        if (!m.special) {
                            count++;
                            prefix = quickOpenAttr + '="<%{%>" ';
                        }
                        //console.log(expr.value);
                        return `${prefix}${quickDeclareAttr}="<%let ${expr.index},${expr.value}=${expr.iterator}[${expr.index}]${flv}%>" ${k}="<%'${li.line}\x11${attrMap.escapeSlashAndBreak(li.art)}\x11'%><%(${expr.value},${expr.index}${firstAndLastVars},${expr.asc ? 1 : -1},${expr.step}) in ${expr.iterator}%>"`;
                    }
                    return _;
                }).replace(quickConditionReg, (_, k, $, c) => {
                    c = tmplCmd.recover(c, cmds);
                    //console.log('qod',c);
                    let li = artExpr.extractArtInfo(c);
                    if (li) {
                        let expr = artExpr.extractIfExpr(li.art);
                        let key = k == quickForAttr ? 'for' : 'if';
                        return `${k}="<%'${li.line}\x11${attrMap.escapeSlashAndBreak(li.art)}\x11'%><%${key}(${expr});%>"`;
                    }
                    return _;
                });
            }
            return src;
        });
    }
    if (count) {
        src = src.replace(lastCloseReg, (m, more) => {
            return ` ${quickCloseAttr}="<%${new Array(count + 1).join('}')}%>">${more}`;
        });
    }
    for (let c in cmds) {
        let v = cmds[c];
        if (typeof v == 'string') {
            v = artExpr.removeLine(v);
            cmds[c] = v;
        }
    }
    src = tmplCmd.recover(src, cmds);
    //console.log('here',JSON.stringify(src));
    src = artExpr.recoverEvent(src);
    return src;
};
let combineSamePush = (src, pushed) => {
    let start = -1,
        prev = '',
        ranges = [],
        lastChar = '';
    for (let p of pushed) {
        let i = src.indexOf(p.src, start);
        if (i >= 0) {
            if (i == start && prev == p.key) {
                if (!lastChar) {
                    lastChar = src.charAt(i - 2);
                }
                let len = p.src.indexOf(p.key);
                let rest = p.src.substring(len + prev.length);
                let trimmed = rest.startsWith('.push') ? 6 : rest.indexOf('[') + 1;
                ranges.push({
                    char: ',',
                    start: i - 2,//$vnode_.push($_create());  trim );
                    srcEnd: i + p.src.length,
                    end: i + p.key.length + len + trimmed //$vnode_.push($_create()); trim $vnode_.push(
                });
            } else {
                if (lastChar) {
                    let last = ranges[ranges.length - 1];
                    ranges.push({
                        char: lastChar,
                        start: last.srcEnd - 2,
                        end: last.srcEnd - 1
                    });
                    lastChar = '';
                }
            }
            start = i + p.src.length;
            prev = p.key;
        }
    }
    if (lastChar) {
        let last = ranges[ranges.length - 1];
        ranges.push({
            char: lastChar,
            start: last.srcEnd - 2,
            end: last.srcEnd - 1
        });
    }
    for (let i = ranges.length; i--;) {
        let r = ranges[i];
        src = src.substring(0, r.start) + r.char + src.substring(r.end);
    }
    return src;
};
let process = (src, e) => {
    //console.log(src);
    let { cmds, tokens, map, groupUsed, groupDeclared } = parser(`${src}`, e);
    let snippets = [],
        groupDeclaredMap = Object.create(null),
        groupIdsMap = Object.create(null);
    let allGroups = groupDeclared.concat(groupUsed);
    for (let gd of groupDeclared) {
        if (groupDeclaredMap[gd.groupKey]) {
            throw new Error(`[MXC Tip(tmpl-quick)] duplicate mx-slot name="${gd.groupKey}" at file:` + e.shortHTMLFile);
        }
        groupDeclaredMap[gd.groupKey] = gd;
        if (gd.groupId) {
            groupIdsMap[gd.groupId] = gd;
        }
    }
    let vnodeDeclares = Object.create(null),
        vnodeInited = Object.create(null),
        combinePushed = [],
        staticVars = [],
        specialStaticVars = {},
        specialFlags = {},
        specialFlagIndex = 0,
        staticNodes = Object.create(null),
        staticObjects = Object.create(null),
        staticCounter = 0,
        inlineStaticHTML = Object.create(null),
        staticUniqueKey = e.shortHTMLUId,
        mxKeyCounter = 0,
        declaredRemoved = [],
        rebuildDeclared = [],
        rootCanHoisting = true;
    let genElement = (node, level, inStaticNode, usedParentVars = {}, levelPrefix) => {
        if (!levelPrefix) {
            levelPrefix = `$vnode_${level}`;
        }
        if (node.type == 3) {
            let content = node.content;
            let cnt = tmplCmd.recover(content, cmds);
            let text = serAttrs('$text', cnt, false, e);
            //console.log(node, text);
            if (node.isXHTML ||
                text.hasCmdOut ||
                text.hasCharSnippet) {
                let outText = '',
                    safeguard = false;
                if (text.direct) {
                    outText = text.returned;
                } else {
                    snippets.push(text.returned + ';');
                    vnodeDeclares.$text = 1;
                    outText = '$text';
                    safeguard = !text.hasSnippet;
                }
                //console.log(node);
                //let xHTML = node.isXHTML ? '1' : '0';
                outText += node.isXHTML ? ',1' : '';
                let staticPrefix = '';
                let staticPostfix = '';
                if (!inStaticNode &&
                    !text.hasCmdOut &&
                    !text.hasVarOut &&
                    text.direct &&
                    !text.hasCtrl) {
                    let key = `$quick_${md5(node.content, 'tmpl_static_texts')}_static_text`;
                    if (!staticNodes[key]) {
                        staticNodes[key] = key;
                        staticVars.push({
                            key
                        });
                    }
                    //console.log(key);
                    staticPrefix = `${key}||(${key}=`;
                    staticPostfix = ')';
                }
                if (vnodeInited[level]) {
                    if (!usedParentVars[`d${level}`]) {
                        usedParentVars[`n${level}`] = 1;
                    }
                    if (!safeguard) {
                        combinePushed.push({
                            key: levelPrefix,
                            src: `${levelPrefix}.push(${staticPrefix}$createVNode(0,${outText})${staticPostfix});`
                        });
                    }
                    snippets.push(`${levelPrefix}.push(${staticPrefix}$createVNode(0,${outText})${staticPostfix});`);
                } else {
                    usedParentVars[`d${level}`] = 1;
                    vnodeInited[level] = 1;
                    if (!safeguard) {
                        combinePushed.push({
                            key: levelPrefix,
                            src: `${levelPrefix}=[${staticPrefix}$createVNode(0,${outText})${staticPostfix}];`
                        });
                    }
                    snippets.push(`${levelPrefix}=[${staticPrefix}$createVNode(0,${outText})${staticPostfix}];`);
                    //console.log(snippets);
                }
                //console.log(snippets);
            } else {
                if (!text.trimmedPrefix) {
                    vnodeDeclares.$text = 1;
                }
                snippets.push(text.returned + ';');
            }
        } else {
            let attrs = {},
                attrsStr = '',
                ctrlAttrs = [],
                hasInlineCtrl = false,
                hasAttrs = false,
                hasCmdOut = node.attrHasDynamicViewId,
                dynamicAttrs = '',
                hasCtrl,
                hasRestElement = false,
                attrKeys = Object.create(null),
                specialKey = '',
                inGroup = false;
            if (configs.tmplSupportSlotFn) {
                inGroup = isInGroupNode(node, allGroups, false);
            }
            //console.log(node.tag, node.attrs);
            if (node.tag != tmplGroupTag &&
                node.attrs.length) {
                for (let a of node.attrs) {
                    if (a.name == 'mx-ctrl' &&
                        node.customBindExpr) {
                        continue;
                    }
                    if (a.name == 'mx-ref' &&
                        inGroup) {
                        continue;
                    }
                    if (a.name == 'mx-host' &&
                        node.customBindTo) {
                        continue;
                    }
                    hasAttrs = true;
                    if (a.name == 'mx-bindexpr' ||
                        a.name == 'mx-syncexpr') {
                        a.name = 'mx-ctrl';
                    }
                    if (a.name == 'mx-bindto' ||
                        a.name == 'mx-syncto') {
                        a.name = 'mx-host';
                    }
                    //console.log(groupKeyAsParams);
                    if (node.isMxView &&
                        a.name == tmplMxViewParamKey) {
                        let updateByKeys = node.updateByKeys;
                        let newKeys = [];
                        if (updateByKeys) {
                            let keys = updateByKeys.split(',');
                            for (let k of keys) {
                                k = k.trim();
                                if (k == 'this') {
                                    newKeys.push('#');
                                    newKeys.length = 0;
                                    break;
                                } else {
                                    newKeys.push(k);
                                }
                            }
                        } else {
                            let itKeys = a.value.split(',');
                            let slot = '$slots';
                            let findAllDataChanged = inGroup || itKeys.indexOf(slot) != -1;
                            if (findAllDataChanged) {
                                newKeys.push('#');
                            } else {
                                let recastKeys = [];
                                for (let k of itKeys) {
                                    if (k !== '$viewId') {
                                        if (k.startsWith(`${slot}.`)) {
                                            let cut = k.substring(slot.length + 1);
                                            let dest = groupDeclaredMap[cut];
                                            if (dest) {
                                                let ref = [];
                                                findAllInnerGroups(dest, groupUsed, groupDeclared, groupDeclaredMap, groupIdsMap, ref);
                                                for (let i of ref) {
                                                    if (i.groupRootRefs) {
                                                        recastKeys.push(...i.groupRootRefs.split(','));
                                                    }
                                                }
                                            }
                                        } else {
                                            recastKeys.push(k);
                                        }
                                    }
                                }

                                for (let k of recastKeys) {
                                    if (!newKeys.includes(k)) {
                                        newKeys.push(k);
                                    }
                                }
                            }
                        }
                        if (newKeys.length) {
                            a.value = newKeys.join(',');
                        } else {
                            continue;
                        }
                    }
                    if (a.name.startsWith('mx') &&
                        !a.name.startsWith(configs.mxPrefix)) {
                        a.name = configs.mxPrefix + a.name.substring(2);
                    }
                    if (a.name.startsWith(configs.mxPrefix) &&
                        a.value.startsWith('\x1f\x1e')) {
                        a.value = a.value.replace(spanceAndSemicolonReg, '');
                        //debugger;
                        if (inGroup) {
                            a.value = '\x1f\x1e\x1e' + a.value.substring(2);
                        } else {
                            let { has, offset } = findParentHasMagixEvent(node, a.name.substring(configs.mxPrefix.length + 1), map);
                            if (has) {
                                a.value = `\x1f\x1e${offset || ''}\x1e` + a.value.substring(2);
                            }
                        }
                    }
                    if (configs.tmplRadioOrCheckboxRename &&
                        a.name == 'name' &&
                        a.value &&
                        (node.inputType == 'radio' ||
                            node.inputType == 'checkbox')) {
                        let newValue = newValue = (configs.hashedProjectName ? configs.hashedProjectName + '_' : '') + md5(e.from + ':' + a.value, tmplRadioOrCheckboxKey);
                        tmplCommandAnchorReg.lastIndex = 0;
                        if (tmplCommandAnchorReg.test(a.value)) {
                            tmplCommandAnchorReg.lastIndex = 0;
                            newValue += '_' + a.value;
                        }
                        a.value = newValue;
                    }
                    if (a.unary) {
                        a.value = true;
                    } else {
                        a.value = tmplCmd.recover(a.value, cmds);
                    }
                    if (attrKeys[a.name] === 1 &&
                        e.checker.tmplDuplicateAttr) {
                        let v = a.unary ? '' : `="${a.value}"`;
                        console.log(chalk.red('[MXC Tip(tmpl-quick)] duplicate attr:' + a.name), 'near:', chalk.magenta(node.tag + ':' + a.name + v), 'at file:', chalk.grey(e.shortHTMLFile));
                        continue;
                    }
                    if (a.name == 'mx5-key') {
                        a.name = '#';
                        a.value = `${staticUniqueKey} ${md5(mxKeyCounter++, 'mxKeys', '', true)} ${a.value}`;
                    }
                    attrKeys[a.name] = 1;
                    let bProps = attrMap.getBooleanProps(node.tag, node.inputType);
                    let bAttr = bProps[a.name];
                    if (bAttr) {
                        if (a.name == a.value ||
                            a.value == 'true') {
                            a.value = true;
                        } else if (a.value == 'false') {
                            a.value = false;
                        }
                    }

                    let oKey = encodeSlashRegExp(a.name);
                    let key = `$$_${safeVar(a.name)}`;
                    let attr = serAttrs(key, a.value, !bAttr, e, inGroup);
                    attr.returned = toNumberString(attr.returned);
                    hasCtrl = attr.hasCtrl;
                    if (attr.hasCmdOut || attr.hasVarOut || a.cond) {
                        hasCmdOut = true;
                    }
                    if (a.name == quickSpreadAttr) {
                        attr.direct = false;
                    }
                    let cond = '';
                    let outputBoolean = false;
                    if (a.cond) {
                        let { line,
                            art,
                            hasExt,
                            condContent,
                            origin,
                            valuable,
                            isRef,
                            refVar } = a.cond;
                        outputBoolean = !valuable && !hasExt;
                        //<input disabled="{{=user.checked}}?"/>
                        if (a.value === true || outputBoolean) {
                            attr.returned = '';
                            cond += '(';
                        } else if (attr.direct) {
                            //<input value="{{=user}}?{{=user.value}}"/>
                            //<input value="{{=user.age}}?"/>
                            let v = hasExt ? '' : tmplVarTempKey + '=';
                            cond += `(${v}(`;
                            attr.returned = `(${attr.returned})`;
                        } else {
                            //console.log('xxxx');
                            cond += `((`;
                        }
                        //console.log(attr, cond, a);
                        if (configs.debug) {
                            cond += `$__line=${line},$__art='{{${art}}}',$__ctrl='<%${origin}%>',`;
                        }
                        cond += isRef ? refVar : condContent;
                        if (a.value === true || outputBoolean) {
                            cond += ')';
                        } else {
                            if (valuable) {
                                cond += '))!=null&&';
                            } else {
                                cond += '))&&';
                            }
                            if (!hasExt) {
                                attr.returned = tmplVarTempKey;
                            }
                        }
                    }
                    if (configs.debug &&
                        attr.direct) {
                        if ((bAttr ||
                            (a.cond &&
                                !a.cond.hasExt &&
                                !a.cond.valuable)) &&
                            (a.value !== true ||
                                outputBoolean ||
                                a.cond)) {
                            if (a.value === true || outputBoolean) {
                                cond = `(${tmplVarTempKey}=${cond},${tmplVarTempKey}!=null&&${tmplVarTempKey}!==false&&${tmplVarTempKey}!==true&&${tmplVarTempKey}!==null&&console.error('make sure attr:"${a.name}" returned only true , false or null value\\r\\nat line:'+$__line+'\\r\\nat file:${e.shortHTMLFile}\\r\\ncurrent returned value is:',JSON.stringify(${tmplVarTempKey})),${tmplVarTempKey})`;
                            } else if (attr.direct) {
                                let assign = attr.returned == tmplVarTempKey ? '' : `${tmplVarTempKey}=${attr.returned},`;
                                attr.returned = `(${assign}${tmplVarTempKey}!=null&&${tmplVarTempKey}!==false&&${tmplVarTempKey}!==null&&console.error('make sure attr:"${a.name}" returned only null or false falsy value\\r\\nat line:'+$__line+'\\r\\nat file:${e.shortHTMLFile}\\r\\ncurrent returned value is:',JSON.stringify(${tmplVarTempKey})),${tmplVarTempKey})`;
                            }
                        } else if (a.name.startsWith(configs.mxPrefix) &&
                            a.cond &&
                            a.cond.hasExt &&
                            !a.cond.valuable &&
                            cond.endsWith(')&&')) {
                            cond = cond.slice(1, -3);
                            cond = `((${tmplVarTempKey}=${cond},(${tmplVarTempKey}||${tmplVarTempKey}!=null&&${tmplVarTempKey}!==false&&${tmplVarTempKey}!==true&&console.error('make sure attr:"${a.name}" returned only null or false falsy value\\r\\nat line:'+$__line+'\\r\\nat file:${e.shortHTMLFile}\\r\\ncurrent returned value is:',JSON.stringify(${tmplVarTempKey})),${tmplVarTempKey})))&&`;
                        }
                    }
                    if (attr.direct) {
                        if (hasRestElement) {
                            ctrlAttrs.push({
                                ctrl: cond + attr.returned,
                                type: 'direct',
                                oKey
                            });
                        } else {
                            attrs[oKey] = cond + attr.returned;
                        }
                    } else {
                        hasInlineCtrl = true;
                        if (a.name == quickSpreadAttr) {
                            hasRestElement = true;
                            ctrlAttrs.push({
                                type: 'mixed',
                                ctrl: attr.returned
                            });
                        } else {
                            vnodeDeclares[key] = 1;
                            ctrlAttrs.push({
                                ctrl: attr.returned,
                                oKey,
                                key: cond + key
                            });
                        }
                    }
                    //console.log(ctrlAttrs);
                    if (configs.debug && bAttr && !attr.direct) {
                        ctrlAttrs.push({
                            ctrl: `(${key}!=null&&${key}!==false&&${key}!==true&&console.error('make sure attr:"${a.name}" returned only true , false or null value\\r\\nat line: '+$__line+'\\r\\nat file:${e.shortHTMLFile}\\r\\ncurrent returned value is:',JSON.stringify(${key})));`
                        });
                    }
                }
                let allProps = attrMap.getProps(node.tag, node.inputType);
                let mustUseProps = [];
                if (hasInlineCtrl) {
                    if (hasRestElement) {
                        //console.log(ctrlAttrs);
                        for (let c of ctrlAttrs) {
                            if (c.type != 'mixed' && c.type != 'direct') {
                                dynamicAttrs += c.ctrl + ';';
                            }
                        }
                        attrsStr = '{';
                        for (let p in attrs) {
                            attrsStr += `'${p}': ${attrs[p]},`;
                            if (allProps[p]) {
                                mustUseProps.push(`'${p}':'${allProps[p]}'`);
                            }
                        }
                        for (let c of ctrlAttrs) {
                            if (c.type == 'direct') {
                                attrsStr += `'${c.oKey}': ${c.ctrl},`;
                                if (allProps[c.oKey]) {
                                    mustUseProps.push(`'${c.oKey}':'${allProps[c.oKey]}'`);
                                }
                            } else if (c.type == 'mixed') {
                                attrsStr += `...${c.ctrl}, `;
                            } else if (c.oKey) {
                                attrsStr += `'${c.oKey}': ${c.key},`;
                                if (allProps[c.oKey]) {
                                    mustUseProps.push(`'${c.oKey}':'${allProps[c.oKey]}'`);
                                }
                            }
                        }
                        attrsStr += '}';
                    } else {
                        dynamicAttrs += ';';
                        for (let c of ctrlAttrs) {
                            dynamicAttrs += c.ctrl + ';';
                        }
                        attrsStr = '{';
                        for (let p in attrs) {
                            attrsStr += `'${p}': ${attrs[p]},`;
                            if (allProps[p]) {
                                mustUseProps.push(`'${p}':'${allProps[p]}'`);
                            }
                        }
                        for (let c of ctrlAttrs) {
                            if (c.oKey) {
                                attrsStr += `'${c.oKey}': ${c.key},`;
                                if (allProps[c.oKey]) {
                                    mustUseProps.push(`'${c.oKey}':'${allProps[c.oKey]}'`);
                                }
                            }
                        }
                        attrsStr += '}';
                    }
                } else {
                    attrsStr = '{';
                    for (let p in attrs) {
                        attrsStr += `'${p}': ${attrs[p]},`;
                        if (allProps[p]) {
                            mustUseProps.push(`'${p}':'${allProps[p]}'`);
                        }
                    }
                    attrsStr += '}';

                    //console.log(node);
                    if (!hasCmdOut &&
                        !hasCtrl &&
                        !node.canHoisting &&
                        node.tag != quickCommandTagName &&
                        node.tag != quickDirectTagName &&
                        !node.groupKeyNode &&
                        !node.groupUseNode &&
                        !node.hasMxOwner) {
                        //console.log(node);
                        let i = staticObjects[attrsStr];
                        if (i) {
                            attrsStr = i.key;
                            i.used++;
                            if (!inStaticNode) {
                                i.inStatic = false;
                            }
                        } else {
                            let key = `$quick_${staticUniqueKey}_${staticCounter++}_static_attr`;
                            staticObjects[attrsStr] = {
                                key,
                                used: 1,
                                inStatic: inStaticNode
                            };
                            attrsStr = key;
                        }
                    }
                }
                if (mustUseProps.length) {
                    let specials = '{',
                        flag = 0;
                    for (let p of mustUseProps) {
                        specials += `${p},`;
                        if (!specialFlags[p]) {
                            specialFlags[p] = 2 << specialFlagIndex;
                            specialFlagIndex++;
                        }
                        flag |= specialFlags[p];
                    }
                    specials += '}';
                    specialKey = `$special_${flag}`;
                    if (!specialStaticVars[specialKey]) {
                        specialStaticVars[specialKey] = specials;
                    }
                }
            }
            let ctrls = node.ctrls;
            let start = [], end = [];

            if (ctrls.length) {
                for (let ctrl of ctrls) {
                    let fn = Directives[ctrl.type];
                    if (fn) {
                        fn(ctrl, start, end, node.auto);
                    }
                }
            }
            snippets.push(`${start.join('')}`);
            if (node.groupKeyNode) {
                specialStaticVars['$slots'] = '{}';

                if (node.groupContextNode) {
                    if (!configs.tmplSupportSlotFn) {
                        console.log(chalk.red('[MXC Tip(tmpl-quick)] tmplSupportSlotFn is false,can not use mx-slot fn attribute'), 'at file:', chalk.grey(e.shortHTMLFile));
                        throw new Error('[MXC Tip(tmpl-quick)] tmplSupportSlotFn is false,can not use mx-slot fn attribute at file:' + e.shortHTMLFile);
                    }
                    let newKey = quickGroupFnPrefix + node.groupKey;// //`${quickGroupFnPrefix}${staticUniqueKey}_${safeVar(node.groupKey)}`;
                    snippets.push(`\nif(!${newKey}){`);

                    let params = '';// = `$id = $viewId`;
                    if (node.groupContext) {
                        // params += ',' + node.groupContext;
                        params = node.groupContext;
                    }
                    snippets.push(`${newKey}=(${params})=>{\n`);
                    if (configs.debug &&
                        node.children.length) {
                        snippets.push(`\ntry{\r\n`);
                    }
                }
            }
            let key = '';
            if (node.canHoisting &&
                !node.groupUseNode) {
                //console.log(node);
                if (node.groupKeyNode) {
                    if (node.groupContextNode) {
                        key = `$quick_slot_${staticUniqueKey}_${safeVar(node.groupKey)}_static_node`;
                        if (!staticNodes[key] &&
                            node.children.length) {
                            staticNodes[key] = key;
                            staticVars.push({
                                key
                            });
                        }
                    } else {
                        key = quickGroupFnPrefix + safeVar(node.groupKey);
                    }
                    if (node.children.length) {
                        snippets.push(`\r\nif(!${key}){\r\n`);
                    }
                } else {
                    key = staticNodes[node.staticValue];
                    if (!key) {
                        key = `$quick_${staticUniqueKey}_${staticCounter++}_static_node`;
                        staticNodes[node.staticValue] = key;
                        staticVars.push({
                            key
                        });
                    }
                    snippets.push(`\r\nif(${key}){\r\n`);
                    if (vnodeInited[level]) {
                        if (!usedParentVars[`d${level}`]) {
                            usedParentVars[`n${level}`] = 1;
                        }
                        snippets.push(`${levelPrefix}.push(${key});`);
                    } else {
                        usedParentVars[`d${level}`] = 1;
                        snippets.push(`${levelPrefix}=[${key}];`);
                    }
                    snippets.push(`\r\n}else{\r\n`);
                }
            } else if (node.groupUseNode) {
                if (groupDeclaredMap[node.groupUse]) {
                    key = quickGroupFnPrefix;
                } else if (e.globalVars.indexOf(node.groupUse) == -1) {
                    e.globalVars.push(node.groupUse);
                }
                key += node.groupUse;//`$quick_slot_${staticUniqueKey}_${safeVar(node.groupUse)}_static_node`;
                let refVar = key;
                if (node.canHoisting) {
                    let skey = `$quick_slot_${staticUniqueKey}_${safeVar(node.groupUse)}_static_node`;
                    if (!staticNodes[skey]) {
                        staticNodes[skey] = skey;
                        staticVars.push({
                            key: skey
                        });
                    }
                    snippets.push(`if(${skey}){\n${levelPrefix}.push(...${skey});\n}else{\n`);
                }
                if (node.groupContextNode) {
                    //key += '($id';
                    key += '(';
                    // if (node.groupUniqueContent) {
                    //     let splitContents = jsGeneric.splitParams(node.groupUniqueContent);
                    //     let extendKeys = [];
                    //     for (let cmd of splitContents) {
                    //         let i = tmplCmd.extractCmdContent(cmd, cmds);
                    //         if (i.succeed) {
                    //             if (configs.debug) {
                    //                 snippets.push(`$__line=${i.line};$__art='${encodeSlashRegExp(i.art.substring(1))}';$__ctrl='${encodeSlashRegExp(i.content)}';`);
                    //             }
                    //             extendKeys.push(i.content);
                    //         }
                    //     }
                    //     if (extendKeys.length) {
                    //         key += `+'.'+${extendKeys.join(`+'.'+`)}`;
                    //     }
                    // }
                    if (node.groupContext) {
                        //key += ',' + node.groupContext;
                        key += node.groupContext;
                    }
                    key += ')'
                    if (node.canHoisting) {
                        refVar = `$quick_slot_${staticUniqueKey}_${safeVar(node.groupUse)}_static_node`;
                    } else {
                        refVar = `$ref_${staticCounter++}_node`;
                    }
                    snippets.push(`\nlet ${refVar}=${key};\n`);
                }
                snippets.push(`if(${refVar}){\n${levelPrefix}.push(...${refVar});\n`);
                if (node.children.length) {
                    snippets.push(`}else{\n`);
                }
            } else if (node.inlineStaticValue) {
                key = `$inline$${staticUniqueKey}_${node.inlineStaticValue}`;
                if (!vnodeDeclares[key]) {
                    vnodeDeclares[key] = 1;
                }
                snippets.push(`\r\nif(${key}){\r\n`);
                if (vnodeInited[level]) {
                    if (!usedParentVars[`d${level}`]) {
                        usedParentVars[`n${level}`] = 1;
                    }
                    snippets.push(`${levelPrefix}.push(${key});`);
                } else {
                    usedParentVars[`d${level}`] = 1;
                    snippets.push(`${levelPrefix}=[${key}];`);
                }
                snippets.push(`\r\n}else{\r\n`);
            }
            if (node.children.length) {
                if (node.staticValue &&
                    canGenerateHTML(node)) {
                    vnodeInited[level + 1] = 1;
                    //console.log(node, level + 1);
                    vnodeDeclares[`$vnode_${level + 1}`] = 1;
                    //snippets.push(`$vnode_${level + 1}=[$createVNode(0,'${node.innerHTML.replace(escapeSlashRegExp, '\\$&')}',1)];`);
                    let exist = inlineStaticHTML[node.innerHTML];
                    if (!exist) {
                        exist = {
                            count: 0,
                            level: [],
                            html: encodeSlashRegExp(node.innerHTML),
                            key: staticCounter++
                        };
                        inlineStaticHTML[node.innerHTML] = exist;
                        inlineStaticHTML['\x00' + exist.key] = exist;
                    }
                    exist.count++;
                    exist.level.push(level + 1);
                    snippets.push(`//#inline_static_html_node_ph_${exist.key};\r\n`);

                } else {
                    delete vnodeInited[level + 1];
                    let declared = `$vnode_${level + 1}=[${utils.uId('\x00', src)}];`;
                    for (let e of node.children) {
                        if (e.hasCtrls ||
                            e.tag == tmplGroupTag) {
                            snippets.push(declared);
                            vnodeInited[level + 1] = 1;
                            break;
                        }
                    }
                    let isGroupTag = node.tag == quickCommandTagName;
                    let nextLevel = isGroupTag ? level : level + 1;
                    let usedParent = {};
                    for (let e of node.children) {
                        genElement(e, nextLevel, inStaticNode || node.canHoisting, usedParent);
                    }

                    if (usedParent[`n${level + 1}`] ||
                        usedParent[`d${level + 1}`]) {
                        vnodeDeclares['$vnode_' + (level + 1)] = 1;
                    }
                    if (usedParent[`n${level + 1}`]) {
                        rebuildDeclared.push(declared);
                        delete usedParent[`n${level + 1}`];
                    } else {
                        declaredRemoved.push(declared);
                    }
                    Object.assign(usedParentVars, usedParent);
                }
            }
            if (node.tag == quickCommandTagName) {
                // if (node.children.length) {
                //     if (vnodeInited[level]) {
                //         combinePushed.push({
                //             key: `$vnode_${level}`,
                //             src: `$vnode_${level}.push(...$vnode_${level + 1});`
                //         });
                //         if (vnodeInited[level + 1]) {
                //             let v = vnodeInited[level + 1];
                //             v = v === 1 ? `$vnode_${level + 1}` : v;
                //             snippets.push(`$vnode_${level}.push(...${v});`);
                //         }
                //     } else if (vnodeInited[level + 1]) {
                //         vnodeInited[level] = 1;
                //         snippets.push(`$vnode_${level}=$vnode_${level + 1};`);
                //     }
                // }
            } else if (node.tag == quickDirectTagName) {
                if (configs.debug) {
                    snippets.push(`$__line=${node.directLine};$__art='{{${node.directArt}}}';$__ctrl='${encodeSlashRegExp(node.directCtrl)}';`);
                }
                let refVar = `$ref_${staticCounter++}_node`;
                snippets.push(`\nlet ${refVar}=${node.directCtrl};\n`);
                if (vnodeInited[level]) {
                    if (!usedParentVars[`d${level}`]) {
                        usedParentVars[`n${level}`] = 1;
                    }
                    snippets.push(`\r\nif(${refVar}){\r\n$isArray(${refVar})?${levelPrefix}.push(...${refVar}):${levelPrefix}.push(${refVar});}`);
                } else {
                    usedParentVars[`d${level}`] = 1;
                    vnodeInited[level] = 1;
                    snippets.push(`${levelPrefix}=${refVar} && $isArray(${refVar})?${refVar}:[${refVar}];`);
                }
            } else {
                let specialProps = specialKey;
                let children = '';
                if (node.children.length &&
                    vnodeInited[level + 1]) {
                    let t = vnodeInited[level + 1];
                    children = t === 1 ? `$vnode_${level + 1}` : t;
                } else {
                    if (specialProps) {
                        if (node.unary) {
                            children = '1';
                        } else {
                            children = '0';
                        }
                    } else {
                        if (node.unary) {
                            children = '1';
                        } else {
                            children = '';
                        }
                    }
                }
                let props = hasAttrs ? attrsStr : children ? '0' : '';
                if (dynamicAttrs && !dynamicAttrs.endsWith(';')) {
                    dynamicAttrs += ';';
                }
                snippets.push(dynamicAttrs);
                let content = '';
                if (specialProps) {
                    content += `,${props},${children},${specialProps}`;
                } else if (children) {
                    content += `,${props},${children}`;
                } else if (props) {
                    content += `,${props}`;
                }
                if (node.groupKeyNode) {
                    // if (!node.children || !node.children.length) {
                    //     throw new Error(`[MXC-Error(tmpl-quick)] mx-slot name="${node.groupKey}" must have children elements at ${e.shortHTMLFile}`);
                    // }
                    if (node.groupContextNode) {
                        //console.log(node);
                        let exTmpl = `}catch(ex){let msg = 'render view error:' + (ex.message || ex); msg += '\\r\\n\\tsrc art: ' + $__art + '\\r\\n\\tat line: ' + $__line; msg += '\\r\\n\\ttranslate to: ' + $__ctrl + '\\r\\n\\tat file:${e.shortHTMLFile}'; throw msg;} `;
                        if (node.canHoisting) {
                            //let src = `\r\n${prefix}=$vnode_${level + 1};`;
                            //snippets.push(src);
                            if (node.children.length) {
                                snippets.push(`$quick_slot_${staticUniqueKey}_${safeVar(node.groupKey)}_static_node = $vnode_${level + 1};\n`);
                                snippets.push(`\n}\nreturn $quick_slot_${staticUniqueKey}_${safeVar(node.groupKey)}_static_node;\n`);
                                if (configs.debug) {
                                    snippets.push(exTmpl);
                                }
                            }
                        } else {
                            snippets.push(`\nreturn $vnode_${level + 1};`);
                            if (configs.debug) {
                                snippets.push(exTmpl);
                            }
                        }
                        snippets.push(`};\n}\n`);
                    } else if (node.canHoisting) {
                        if (node.children.length) {
                            snippets.push(`$slots.${node.groupKey}=$vnode_${level + 1};\n`);
                            snippets.push('}\n');
                        }
                    } else {
                        snippets.push(`$slots.${node.groupKey}=$vnode_${level + 1};\n`);
                    }
                } else {
                    let prefix = (node.canHoisting || node.inlineStaticValue) ? `${key}=` : '', src = '';
                    if (node.groupUseNode) {
                        if (vnodeInited[level + 1] &&
                            node.children.length) {
                            let prefix = '';
                            if (node.canHoisting) {
                                prefix = `$quick_slot_${staticUniqueKey}_${safeVar(node.groupUse)}_static_node=`;
                            }
                            src = `${levelPrefix}.push(...${prefix}$vnode_${level + 1});\n`;
                            snippets.push(src);
                        }
                        snippets.push(`}\n`);
                        if (node.canHoisting) {
                            snippets.push('}\n');
                        }
                        if (vnodeInited[level]) {
                            if (!usedParentVars[`d${level}`]) {
                                usedParentVars[`n${level}`] = 1;
                            }
                        } else {
                            usedParentVars[`d${level}`] = 1;
                        }
                    } else if (vnodeInited[level]) {
                        if (!usedParentVars[`d${level}`]) {
                            usedParentVars[`n${level}`] = 1;
                        }
                        src = `${levelPrefix}.push(${prefix}$createVNode('${node.tag}'${content}));`;
                        combinePushed.push({
                            key: levelPrefix,
                            src
                        });
                        snippets.push(src);
                    } else {
                        src = `${levelPrefix}=[${prefix}$createVNode('${node.tag}'${content})];`;
                        usedParentVars[`d${level}`] = 1;
                        vnodeInited[level] = 1;
                        combinePushed.push({
                            key: levelPrefix,
                            src
                        });
                        snippets.push(src);
                    }
                }
                if ((node.canHoisting && !node.groupUseNode && !node.groupKeyNode) ||
                    node.inlineStaticValue) {
                    snippets.push('\r\n}\n');
                }
            }
            snippets.push(end.join(''));
        }
    };
    //vnodeInited[0] = 1;
    for (let t of tokens) {
        if (!t.canHoisting) {
            rootCanHoisting = false;
        }
    }
    if (rootCanHoisting) {
        for (let t of tokens) {
            delete t.canHoisting;
            for (let i = t.attrs.length; i--;) {
                let v = t.attrs[i];
                if (v.name == tmplStaticKey) {
                    t.attrs.splice(i, 1);
                    break;
                }
            }
        }
    }
    let zeroIsEmptyArray = false;
    for (let e of tokens) {
        if (e.hasCtrls ||
            e.tag == tmplGroupTag) {
            zeroIsEmptyArray = true;
            vnodeInited[0] = 1;
            break;
        }
    }
    for (let t of tokens) {
        genElement(t, 0, rootCanHoisting);
    }
    let source = `let ${tmplVarTempKey},$vnode_0${zeroIsEmptyArray ? '=[]' : ''}`;
    // if (configs.tmplSupportSlotFn) {
    //     source += ',$id=$viewId';
    // }
    let innerCode = snippets.join('');
    innerCode = combineSamePush(innerCode, combinePushed);
    //console.log(innerCode);
    innerCode = innerCode.replace(inlineStaticHTMLReg, (_, c) => {
        let exist = inlineStaticHTML['\x00' + c];
        if (exist) {
            let l = exist.level.shift();
            if (!vnodeDeclares[`$vnode_${l}`]) {
                vnodeDeclares[`$vnode_${l}`] = 1;
            }
            if (exist.count == 1) {
                return `$vnode_${l}=[$createVNode(0,'${exist.html}',1)];`;
            } else {
                let key = `$inline$${staticUniqueKey}_${c}`;
                if (!vnodeDeclares[key]) {
                    vnodeDeclares[key] = 1;
                }
                return `if(${key}){\r\n$vnode_${l}=[${key}]\r\n}else{\r\n$vnode_${l}=[${key}=$createVNode(0,'${exist.html}',1)]\r\n}\r\n`;
            }
        }
        return _;
    }).replace(trimExtraElseReg, '');
    for (let dr of declaredRemoved) {
        innerCode = innerCode.replace(dr, '');
    }
    for (let rd of rebuildDeclared) {
        let ei = rd.indexOf('=');
        let prefix = rd.substring(0, ei);
        innerCode = innerCode.replace(rd, prefix + '=[];');
    }
    //console.log(innerCode);
    //let hasGroupFunction = e.globalGroupKeys.length > 0;
    //let hasGroupFunction = passedGroupRootRefs.length > 0;
    if (e.globalVars.length) {
        let vars = ',\r\n{';
        for (let key of e.globalVars) {
            if (key != '$viewId' &&
                key != '$slots') {
                vars += `\r\n\t${key},`;
            }
        }
        source += vars + '}=' + tmplGlobalDataRoot;
    }
    //console.log(vnodeDeclares);
    for (let vd in vnodeDeclares) {
        source += ',\r\n' + vd;
        let v = vnodeDeclares[vd];
        if (v !== 1) {
            source += `=${v}`;
        }
    }
    source += ';';
    let key = `$quick_root_${staticUniqueKey}_${staticCounter++}_static_node`;
    if (rootCanHoisting) {
        staticVars.push({
            key
        });
        source = `if(!${key}){\r\n${source}`;
    }
    let rootNode = `${rootCanHoisting ? `${key}=` : ''}$createVNode($viewId,0,$vnode_0);`;

    source += `\r\n${innerCode} \r\n`;
    if (rootCanHoisting) {
        source += rootNode + '\r\n}';
    }
    source += `\r\nreturn ${rootCanHoisting ? key : rootNode}`;
    if (configs.debug) {
        source = `let $__art, $__line, $__ctrl; try { ${source} \r\n} catch (ex) { let msg = 'render view error:' + (ex.message || ex); msg += '\\r\\n\\tsrc art: ' + $__art + '\\r\\n\\tat line: ' + $__line; msg += '\\r\\n\\ttranslate to: ' + $__ctrl + '\\r\\n\\tat file:${e.shortHTMLFile}'; throw msg; } `;
    }
    let params = '', idx = tmplFnParams.length - 1;
    for (idx; idx >= 0; idx--) {
        let test = '(';
        if (tmplFnParams[idx] == '$refData') {
            test = ',';
        }
        if (source.indexOf(tmplFnParams[idx] + test) > -1) {
            break;
        }
    }
    for (let i = 0; i <= idx; i++) {
        params += ',' + tmplFnParams[i];
    }
    source = `(${tmplGlobalDataRoot}, $createVNode,$viewId${params})=> { \r\n${source} } `;
    for (let i in staticObjects) {
        let v = staticObjects[i];
        if (!v.inStatic || v.used > 1) {
            staticVars.push({
                key: v.key,
                value: i
            });
        } else {
            source = source.replace(v.key, regexp.encode(i));
        }
    }
    for (let s in specialStaticVars) {
        staticVars.push({
            key: s,
            value: specialStaticVars[s]
        });
    }
    // for (let slot in groupDeclaredMap) {
    //     let slotReg = regexp.get(regexp.escape(`$slots.${slot}`), 'g');
    //     console.log(slotReg);
    //     source = source.replace(slotReg, _ => `$slots.${md5(_, e.shortHTMLFile + '@slots', '', false)}`);
    //     console.log(source);
    // }
    if (!configs.debug &&
        configs.tmplSupportSlot) {
        source = source.replace(slotReg, (_, v) => {
            return `$slots.${md5(v, e.shortHTMLFile + '@slots', '', false)}`;
        });
    }
    // if (hasGroupFunction) {
    //     staticVars.push({
    //         key: `${staticUniqueKey}_groups`,
    //         value: `{}`
    //     });
    // }
    return {
        source,
        statics: staticVars
    };
};
module.exports = {
    preProcess,
    process
};