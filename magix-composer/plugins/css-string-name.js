//thx https://github.com/bramstein/css-font-parser
let safeNameReg = /^[a-zA-Z0-9_\- ]+$/i;
let numberReg = /^[0-9]+$/i;
let slashReg = /\\/g;
let escapeQuoteReg = /"/g;
let VARIATION = 1;
let LINE_HEIGHT = 2;
let FS1_REG = /^((xx|x)-large|(xx|s)-small|small|large|medium)$/;
let FS2_REG = /^(larg|small)er$/;
let FS3_REG = /^(\+|-)?([0-9]*\.)?[0-9]+(em|ex|ch|rem|vh|vw|vmin|vmax|px|mm|cm|in|pt|pc|%)$/;
module.exports = {
    parseFont(str) {
        str = str.trim();
        let names = [];
        let c, i = 0,
            n = '',
            started = 1,
            complexed = 0,
            escaped = 0,
            q = '';
        while (i < str.length) {
            c = str[i];
            if (escaped) {
                n += c;
            }
            if (c == '\'' ||
                c == '"') {
                if (complexed) {
                    if (!escaped) {
                        if (q == c) {
                            complexed = 0;
                        } else {
                            n += c;
                        }
                    }
                } else {
                    if (started) {
                        q = c;
                        complexed = 1;
                    } else if (!escaped) {
                        n += c;
                    }
                }
            } else if (c == '\\') {
                if (escaped) {
                    escaped = 0;
                } else {
                    escaped = 1;
                }
            } else if (c == ',') {
                names.push(n.trim());
                n = '';
                started = 1;
            } else {
                n += c;
            }
            if (c != '\\') {
                escaped = 0;
            }
            if (c != ',') {
                started = 0;
            }
            i++;
        }
        if (n.trim()) {
            names.push(n.trim());
        }
        return names;
    },
    stringifyFont(names) {
        let safeNames = [];
        for (let n of names) {
            if (safeNameReg.test(n)) {
                safeNames.push(n);
            } else {
                n = n.replace(slashReg, '\\\\')
                    .replace(escapeQuoteReg, '\\"');
                safeNames.push(`"${n}"`);
            }
        }
        return safeNames.join(',');
    },
    unpackFont(str) {
        str = str.trim();
        let state = VARIATION;
        let buffer = '';
        let i = 0,
            c;
        while (i < str.length) {
            c = str[i];
            if (state == VARIATION && (c == ' ' || c == '/')) {
                if (FS1_REG.test(buffer) ||
                    FS2_REG.test(buffer) ||
                    FS3_REG.test(buffer)) {
                    let n = c;
                    while (n == ' ') {
                        n = str[i++];
                    }
                    if (n == '/') {
                        state = LINE_HEIGHT;
                    } else {
                        break;
                    }
                }
                buffer = '';
            } else if (buffer.trim() &&
                state == LINE_HEIGHT &&
                c == ' ') {
                i++;
                break;
            } else {
                buffer += c;
            }
            i++;
        }
        if (i > 0 && i < str.length) {
            i--;
            return {
                succ: true,
                left: str.substring(0, i).trim(),
                right: str.substring(i).trim()
            };
        }
        return {
            succ: false
        };
    },
    getGridNames(key, value) {
        let names = [];
        if (key == 'grid-area' ||
            key == 'grid-row' ||
            key == 'grid-row-start' ||
            key == 'grid-row-end' ||
            key == 'grid-column' ||
            key == 'grid-column-end' ||
            key == 'grid-column-start') {
            let i = 0,
                c,
                n = '',
                last = 0;
            while (true) {
                c = value[i];
                let end = i >= value.length;
                if (end ||
                    c == ' ') {
                    if (n) {
                        if (n != 'span' &&
                            n != 'inherit' &&
                            n != 'initial' &&
                            n != 'unset' &&
                            n != 'auto' &&
                            !numberReg.test(n)) {
                            names.push({
                                start: last,
                                end: i,
                                content: n
                            });
                        }
                    }
                    n = '';
                    last = i + 1;
                    if (end) {
                        break;
                    }
                } else if (c == '/') {
                    last = i + 1;
                    n = '';
                } else {
                    n += c;
                }
                i++;
            }
        } else {
            let i = 0,
                stred = 0,
                c,
                n = '',
                last = 0;
            while (i < value.length) {
                c = value[i];
                if (c == '[' ||
                    c == ']' ||
                    c == '"' ||
                    c == '\'') {
                    if (stred) {
                        stred = 0;
                        if (n) {
                            names.push({
                                start: last,
                                end: i,
                                content: n
                            });
                        }
                    } else {
                        last = i + 1;
                        stred = 1;
                        n = '';
                    }
                } else if (c == ' ') {
                    if (stred) {
                        if (n) {
                            names.push({
                                start: last,
                                end: i,
                                content: n
                            });
                        }
                        last = i + 1;
                        n = '';
                    }
                } else if (stred) {
                    n += c;
                }
                i++;
            }
        }
        return names;
    }
}