let typescript = require('typescript');
module.exports = {
    parse(content, sourceFile) {
        return typescript.createSourceFile(sourceFile, content);
    },
    walk(ast, cb) {
        let visit = node => {
            typescript.forEachChild(node, visit);
            cb(node);
        };
        visit(ast);
    },
    SKind: typescript.SyntaxKind
}