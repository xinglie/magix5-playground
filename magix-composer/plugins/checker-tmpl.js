/*
    检测magix项目中，模板书写是否合法及可能产生问题的地方
 */
let chalk = require('chalk');
let htmlParser = require('./html-parser');
let configs = require('./util-config');
let upperCaseReg = /[A-Z]/g;
let tmplCommandAnchorReg = /\x07\d+\x07/;
let { camelize, hyphenate } = require('./util');
let disallowedTags = {
    script: 1,
    style: 1,
    link: 1,
    meta: 1,
    base: 1,
    basefont: 1,
    html: 1,
    body: 1
};
let anchorSafeFalgsReg = /\b(?:opener|noopener|noreferrer)\b/i;
/*
    xss
    十六进制　&#x20;
    十进制  &#20;
    空白符　1-32
 */
module.exports = {
    checkTag(e, match, toSrc) {
        if (!configs.debug) return match;
        let tagInfo = htmlParser.parseStartTag(match);
        let tagName = tagInfo.tagName;
        let attrsMap = tagInfo.attrsMap;
        let tn = tagName.toLowerCase();
        let newMatch = toSrc(match);
        if (e.checker.tmplAttrAnchor &&
            (tn == 'a' || tn == 'area')) {
            if (attrsMap.target == '_self') {
                console.log(chalk.magenta('[MXC Tip(checker-tmpl)]'), chalk.red('remove unnecessary target="_self"'), 'at', chalk.grey(e.shortHTMLFile), 'in', newMatch);
            } else if (attrsMap.target &&
                (!attrsMap.rel || !anchorSafeFalgsReg.test(attrsMap.rel))) {
                console.log(chalk.magenta('[MXC Tip(checker-tmpl)]'), chalk.red('add rel="noopener noreferrer" to ' + newMatch), 'at', chalk.grey(e.shortHTMLFile), 'more info:', chalk.magenta('https://github.com/asciidoctor/asciidoctor/issues/2071'));
            }
        } else if (e.checker.tmplDisallowedTag &&
            disallowedTags.hasOwnProperty(tn)) {
            console.log(chalk.magenta('[MXC Tip(checker-tmpl)]'), chalk.red('remove tag ' + newMatch), 'at', chalk.grey(e.shortHTMLFile), (tn == 'style') ? ('use' + chalk.red(' Magix.applyStyle') + ' instead') : '');
        } else if (e.checker.tmplAttrIframe &&
            tn == 'iframe') {
            if (attrsMap.sandbox == null) {
                console.log(chalk.magenta('[MXC Tip(checker-tmpl)]'), chalk.red('add sandbox to ' + newMatch), 'at', chalk.grey(e.shortHTMLFile), 'more info:', chalk.magenta('http://www.w3school.com.cn/tags/att_iframe_sandbox.asp'));
            }
        }
        if (e.checker.tmplAttrDangerous) {
            for (let a of tagInfo.attrs) {
                if (a[1].startsWith('on')) {
                    console.log(chalk.magenta('[MXC Tip(checker-tmpl)]'), chalk.red('remove dnagerous attr ' + a[1]), 'at', chalk.grey(e.shortHTMLFile), 'near', newMatch);
                }
            }
        }

        return match;
    },
    checkMxEventName(eventName, e) {
        if (!configs.debug) return;
        upperCaseReg.lastIndex = 0;
        if (upperCaseReg.test(eventName)) {
            eventName = 'mx-' + eventName;
            console.log(chalk.magenta('[MXC Tip(checker-tmpl)]'), chalk.red('avoid use ' + eventName), 'at', chalk.grey(e.shortHTMLFile), 'use', chalk.red(eventName.toLowerCase()), 'instead', 'more info:', chalk.magenta('https://github.com/thx/magix/issues/35'));
        }
    },
    checkMxEvengSingQuote(single, match, e) {
        if (!configs.debug) return;
        if (single) {
            console.log(chalk.magenta('[MXC Tip(checker-tmpl)]'), chalk.red('avoid use single quote:' + match), 'at', chalk.grey(e.shortHTMLFile), 'use double quote instead');
        }
    },
    checkMxEventParams(eventName, params, match, e) {
        if (!configs.debug) return;
        if (params.charAt(0) != '{' || params.charAt(params.length - 1) != '}') {
            console.log(chalk.magenta('[MXC Tip(checker-tmpl)]'), chalk.magenta('not recommended event params:' + match), 'at', chalk.grey(e.shortHTMLFile), 'replace it like', chalk.magenta('mx-' + eventName + '="({p1:\'p1\',p2:\'p2\'})"'));
        }
    },
    checkMxViewParams(paramName, e, prefix) {
        let hname = hyphenate(paramName);
        if (configs.debug) {
            upperCaseReg.lastIndex = 0;
            if (upperCaseReg.test(paramName)) {
                console.log(chalk.magenta('[MXC Tip(checker-tmpl)]'), chalk.red('avoid use ' + prefix + paramName), 'at', chalk.grey(e.shortHTMLFile), 'use', chalk.red(prefix + hname), 'instead', 'more info:', chalk.magenta('https://github.com/thx/magix/issues/35'));
            }
        }
        paramName = hname;
        paramName = camelize(paramName);
        return paramName;
    },
    checkStringRevisable(content, match, e) {
        if (!configs.debug) return;
        if (tmplCommandAnchorReg.test(content)) {
            console.log(chalk.magenta('[MXC Tip(checker-tmpl)]'), chalk.red('unsupport ' + match), 'at', chalk.grey(e.shortHTMLFile));
        }
    }
};