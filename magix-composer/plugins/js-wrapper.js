/*
    增加loader
    https://www.ecma-international.org/ecma-262/#sec-html-like-comments
 */
let regexp = require('./util-rcache');
let utils = require('./util');
let regxer = require('./util-rcache');
let package = require('../package.json');
let anchorKey = utils.uId('\x1e', '');
let header = `/*\r\n    generate by magix-composer@${package.version}\r\n    https://github.com/thx/magix-composer\r\n    author: https://github.com/xinglie\r\n    loader:\${loader}\r\n */\r\n`;
let reqsAnchorKey = `/*${anchorKey}_requires*/`;
let varsAnchorKey = `/*${anchorKey}_vars*/`;
let tmpls = {
    cmd: '${loaderFactory}("${moduleId}",[${requires}' + reqsAnchorKey + '],function(require,exports,module){\r\n' + varsAnchorKey + '\r\n${content}\r\n});',
    cmd_es: '${loaderFactory}("${moduleId}",[${requires}' + reqsAnchorKey + '],(require,exports,module)=>{\r\n' + varsAnchorKey + '\r\n${content}\r\n});',
    amd: '${loaderFactory}("${moduleId}",["require","exports","module",${requires}' + reqsAnchorKey + '],function(require,exports,module){\r\n' + varsAnchorKey + '\r\n${content}\r\n});',
    amd_es: '${loaderFactory}("${moduleId}",["require","exports","module",${requires}' + reqsAnchorKey + '],(require,exports,module)=>{\r\n' + varsAnchorKey + '\r\n${content}\r\n});',
    webpack: varsAnchorKey + '\r\n${content}',
    none: '${content}',
    module: varsAnchorKey + '\r\n${content}',
    view: 'Magix.addView("${moduleId}",(callback)=>{let exports={};\r\n' + varsAnchorKey + '\r\n${content};callback(exports.default);\r\n})',
    iife: '(function(){\r\n${content}\r\n})();',
    iife_es: '(()=>{\r\n${content}\r\n})();',
    umd: '(function(factory){\r\nif(typeof module==="object"&&typeof module.exports==="object"){\r\n    factory(require,exports,module);\r\n}else if(typeof ${loaderFactory}==="function"){\r\n    if(${loaderFactory}.amd){\r\n        ${loaderFactory}("${moduleId}",["require","exports","module",${requires}' + reqsAnchorKey + '],factory);\r\n    }else if(${loaderFactory}.cmd){\r\n        ${loaderFactory}("${moduleId}",[${requires}' + reqsAnchorKey + '],factory);\r\n    }\r\n}\r\n})(function(require,exports,module){\r\n' + varsAnchorKey + '\r\n${content}\r\n});',
    umd_es: '(factory=>{\r\nif(typeof module==="object"&&typeof module.exports==="object"){\r\n    factory(require,exports,module);\r\n}else if(typeof ${loaderFactory}==="function"){\r\n    if(${loaderFactory}.amd){\r\n        ${loaderFactory}("${moduleId}",["require","exports","module",${requires}' + reqsAnchorKey + '],factory);\r\n    }else if(${loaderFactory}.cmd){\r\n        ${loaderFactory}("${moduleId}",[${requires}' + reqsAnchorKey + '],factory);\r\n    }\r\n}\r\n})((require,exports,module)=>{\r\n' + varsAnchorKey + '\r\n${content}\r\n});',
    acmd: '(function(factory){\r\nif(${loaderFactory}.amd){\r\n    ${loaderFactory}("${moduleId}",["require","exports","module",${requires}' + reqsAnchorKey + '],factory);\r\n}else if(${loaderFactory}.cmd){\r\n    ${loaderFactory}("${moduleId}",[${requires}' + reqsAnchorKey + '],factory);\r\n}\r\n})(function(require,exports,module){\r\n' + varsAnchorKey + '\r\n${content}\r\n});',
    acmd_es: '(factory=>{\r\nif(${loaderFactory}.amd){\r\n    ${loaderFactory}("${moduleId}",["require","exports","module",${requires}' + reqsAnchorKey + '],factory);\r\n}else if(${loaderFactory}.cmd){\r\n    ${loaderFactory}("${moduleId}",[${requires}' + reqsAnchorKey + '],factory);\r\n}\r\n})((require,exports,module)=>{\r\n' + varsAnchorKey + '\r\n${content}\r\n});'
};
module.exports = e => {
    e.requiresAnchorKey = new RegExp(regexp.escape(reqsAnchorKey), 'g');
    e.varsAnchorKey = new RegExp(regexp.escape(varsAnchorKey), 'g');
    e.addedWrapper = true;
    let loader = e.loader;
    let tmpl = header + (tmpls[loader] || tmpls.iife);
    for (let p in e) {
        let reg = regexp.get('\\$\\{' + p + '\\}', 'g');
        let v = regxer.encode(e[p] || '');
        tmpl = tmpl.replace(reg, v);
    }
    return tmpl;
};