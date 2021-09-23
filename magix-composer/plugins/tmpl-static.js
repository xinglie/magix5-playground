/*
    分析模板中不变的html片断，加速虚拟dom的diff
    程序可自动识别哪些节点不会变化

    mxs的使用场景：整个节点(包括属性)及子节点内不包含任何变量
    mxv的使用场景：

    <div>
        <div mx-view="path/to/view?a={{@a}}"></div>
    </div>

    对于这段代码，因为a是使用`@a`的引用方式，即使a发生了改变，这段代码有可能不会变化
    需要对包含这样的view的节点添加mxv属性来深入比较

*/
let md5 = require('./util-md5');
let tmplParser = require('./tmpl-parser');
let regexp = require('./util-rcache');
//let htmlAttrs = require('./html-attrs');
//let configs = require('./util-config');
let {
    //quickCommandTagName,
    //quickDirectTagName,
    tmplTempRealStaticKey,
    //tmplTempInlineStaticKey,
    //tmplTempStaticKey,
    //tmplStaticKey
    tmplGroupTag
} = require('./util-const');
let tagReg = /<([^>\s\/]+)([^>]*?)(\/)?>/g;
//let staticKeyReg = regexp.get(`\\s*${regexp.escape(tmplTempStaticKey)}="[^"]+"`, 'g');
let staticRealKeyReg = regexp.get(`\\s*${regexp.escape(tmplTempRealStaticKey)}="[^"]+"`, 'g');
//let inlineStaticRealKeyReg = regexp.get(`\\s*${regexp.escape(tmplTempInlineStaticKey)}="[^"]+"`, 'g');
let tmplCommandAnchorRegTest = /\x07\d+\x07/;
let magixSpliter = '\x1f';
//let tagsAcceptUsersInput = htmlAttrs.getInputTags();

module.exports = (tmpl, file, htmlUId) => {
    //console.log(tmpl);
    let g = 0;
    let prefix = '';
    let hasCrossFileTemplate = false;
    tmpl = tmpl.replace(tagReg, (match, tag, attrs, close, tKey) => {
        tKey = ` ${tmplTempRealStaticKey}="${g++}"`;
        return '<' + tag + tKey + attrs + (close || '') + '>';
    });
    //console.log(JSON.stringify(tmpl));
    let tokens = tmplParser(tmpl, file);
    //debugger;
    let keysMap = Object.create(null),
        groupStaticNodes = Object.create(null);
    let getRemovedStaticKeys = () => {
        let keys = [];
        let walk = nodes => {
            for (let n of nodes) {
                if (n.groupContextNode) {
                    hasCrossFileTemplate = true;
                }
                if (!n.isText) {
                    if (n.hasContent) {
                        if (n.children) {
                            walk(n.children);
                        }
                    }
                    //group不能嵌套在其它元素里，必须顶层
                    //自身不能嵌套
                    if (n.groupKeyNode &&
                        n.pId) {
                        throw new Error(`[MXC(tmpl-static)] mx-slot key="${n.groupKey}" can not nested in other elements at file:` + file);
                    }
                    let attr = tmpl.substring(n.attrsStart, n.attrsEnd);
                    let html = tmpl.substring(n.start, n.end)
                        .replace(staticRealKeyReg, '');
                    //.replace(inlineStaticRealKeyReg, '');
                    //每个节点的静态key不同，内容可能相同。相同内容最终要生成相同的静态key
                    keysMap[` ${tmplTempRealStaticKey}="${n.mxsRealKey}"`] = html;
                    // valuesMap[` ${tmplTempInlineStaticKey}="${n.mxsInlineKey}"`] = html;
                    // if (!keysValueCount[html]) {
                    //     keysValueCount[html] = 0;
                    // }
                    // keysValueCount[html]++;
                    if (n.children &&
                        !html.includes(magixSpliter) &&
                        !tmplCommandAnchorRegTest.test(html)) {
                        for (let c of n.children) {
                            //如果子节点有事件，则向上传递，最后判断n是否有事件决定是否静态化
                            if (c.hasMxEvent ||//事件
                                c.hasMxView ||//view
                                c.hasMxRef ||
                                c.groupUseNonStatic) {//非静态的group use引用
                                n.hasMxEvent = true;
                                break;
                            }
                            //直接输出，group节点或接入用户输入均无法静态化
                            //group使用节点，使用一个无法静态化的group内容，该节点也无法静态化
                        }
                    }
                    //有事件，引用非静态化的group节点，有变量，均移除
                    let groupDeclareNode = n.groupKeyNode;
                    let groupUseNonStatic = n.groupUseNode &&
                        !groupStaticNodes[n.groupUse];
                    n.groupUseNonStatic = groupUseNonStatic;
                    if (n.hasMxEvent ||
                        n.hasMxRef ||
                        groupUseNonStatic ||
                        html.includes(magixSpliter) ||
                        attr.includes(' mx-view=') ||
                        attr.includes(' mx5-view=') ||
                        tmplCommandAnchorRegTest.test(html)) {
                        keys.push(` ${tmplTempRealStaticKey}="${n.mxsRealKey}"`);
                    } else {
                        if (!groupDeclareNode &&
                            n.children) {
                            for (let c of n.children) {
                                if (!c.isText) {
                                    keys.push(` ${tmplTempRealStaticKey}="${c.mxsRealKey}"`);
                                }
                            }
                        }
                        if (groupDeclareNode) {
                            groupStaticNodes[n.groupKey] = 1;
                        }
                    }
                }
            }
        };
        walk(tokens);
        return keys;
    };
    let keys = getRemovedStaticKeys();
    for (let key of keys) {
        //let v = keysMap[key];
        // let c = keysValueCount[v];
        //console.log(c,v);
        //if (c <= 1) {
        tmpl = tmpl.replace(key, '');
        // } else {
        //     let k = ` ${tmplTempInlineStaticKey}="${g++}"`;
        //     //[k] = v;
        //     tmpl = tmpl.replace(key, k);
        // }
    }
    //console.log(tmpl);
    if (hasCrossFileTemplate) {
        prefix = htmlUId + ' ';
    }
    tmpl = tmpl.replace(tagReg, tagM => {
        return tagM.replace(staticRealKeyReg, m => {
            //console.log(tagM);
            if (tagM.startsWith('<' + tmplGroupTag)) {
                return ` ${tmplTempRealStaticKey}="@xl@"`;
            }
            let r = keysMap[m];
            return ` ${tmplTempRealStaticKey}="${md5(r, file + ':static_key', prefix, true)}"`;
        })/*.replace(inlineStaticRealKeyReg, m => {
            let html = valuesMap[m];
            console.log(html,keysValueCount[html]);
            if (html &&
                keysValueCount[html] > 1) {
                return ` ${tmplTempInlineStaticKey}="${md5(html, file + ':inline_static_key', prefix, true)}"`
            }
            return '';
        })*/;
    });
    //console.log('static out:', tmpl);
    return tmpl;
};