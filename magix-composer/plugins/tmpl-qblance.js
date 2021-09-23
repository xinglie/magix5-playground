let {
    tmplGroupTag,
    tmplGroupId,
    tmplGroupParentId,
} = require('./util-const');
let pureGroupReg = new RegExp(`<(\\/)?${tmplGroupTag}`, 'g');
let pureNumberGroupReg = new RegExp(`<(\\/)?${tmplGroupTag}\\d+`, 'g');
let hasGroupIdReg = new RegExp(`\\s${tmplGroupId}="\\d+_\\d+"`);
let removeBalanceInfo = tmpl => {
    return tmpl.replace(pureNumberGroupReg, (_, close) => {
        return `<${close || ''}${tmplGroupTag}`;
    });
};
let getRegexpByIndex = index => {
    return new RegExp(`<${tmplGroupTag}${index}([^>]*)>([\\s\\S]*?)<\\/${tmplGroupTag}${index}>`, 'g');
};
module.exports = {
    getRegexpByIndex,
    removeBalanceInfo,
    setNestLinkId(tmpl) {
        let pureGroupIndex = 0;
        let nextPlace = 0;
        return tmpl.replace(pureGroupReg, (_, close) => {
            if (close) {
                --pureGroupIndex;
                return _;
            }
            if (pureGroupIndex == 0) {
                nextPlace++;
            }
            if (hasGroupIdReg.test(_)) {
                pureGroupIndex++;
                return _;
            }
            return `${_} ${tmplGroupParentId}="${nextPlace}_${pureGroupIndex - 1}" ${tmplGroupId}="${nextPlace}_${pureGroupIndex++}"`;
        });
    },
    setBalaceInfo(tmpl) {
        let pureGroupIndex = 0;
        tmpl = tmpl.replace(pureGroupReg, (_, close) => {
            return _ + (close ? --pureGroupIndex : pureGroupIndex++);
        });
        return {
            tmpl,
            index: pureGroupIndex
        };
    },
    processContent(tmpl, index, desc, callback) {
        let to = desc ? 0 : index,
            from = desc ? index : 0;
        while (true) {
            let reg = getRegexpByIndex(from);
            tmpl = tmpl.replace(reg, callback);
            if (desc) {
                from--;
                if (from < to) {
                    break;
                }
            } else {
                from++;
                if (from > to) {
                    break;
                }
            }
        }
        return tmpl;
    }
};