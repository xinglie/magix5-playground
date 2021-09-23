let jsAst = require('./js-ast');
let configs = require('./util-config');
let fd = require('./util-fd');
let TSKind = jsAst.SKind;
let processScript = (content, from, short) => {
    return new Promise((resolve, reject) => {
        try {
            let ast = jsAst.parse(content, from);
            jsAst.walk(ast, node => {
                if (node.kind == TSKind.StringLiteral ||
                    node.kind == TSKind.NoSubstitutionTemplateLiteral ||
                    node.kind == TSKind.TemplateHead ||
                    node.kind == TSKind.TemplateMiddle ||
                    node.kind == TSKind.TemplateTail) {
                    let text = node.text;
                    configs.stringProcessor(text, short);
                }
            });
            resolve();
        } catch (ex) {
            reject(ex);
        }
    });
};

module.exports = {
    process(from) {
        return new Promise((resolve, reject) => {
            //console.log(from);
            let shortFrom = from.replace(configs.commonFolder, '').substring(1);
            //console.log(shortFrom);
            //resolve();
            //return;
            //console.log(configs.tmplFileExtNamesReg);
            //if (configs.jsFileExtNamesReg.test(from)) {
            let content = fd.read(from);
            processScript(content, from, shortFrom).then(resolve).catch(reject);
            // } else if (styleDependReg.test(from)) {
            //     processStyle(from, shortFrom).then(resolve).catch(reject);
            // } else if (configs.tmplFileExtNamesReg.test(from)) {
            //     let content = fd.read(from);

            // } else {
            //     resolve();
            // }
        });
    }
};