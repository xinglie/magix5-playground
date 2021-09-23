//https://github.com/fitzgen/glob-to-regexp
module.exports = glob => {
    let reStr = '';
    let extended = true;
    let globstar = false;
    let inGroup = false;
    let c;
    for (let i = 0, len = glob.length; i < len; i++) {
        c = glob[i];

        switch (c) {
            case '/':
            case '$':
            case '^':
            case '+':
            case '.':
            case '(':
            case ')':
            case '=':
            case '!':
            case '|':
                reStr += '\\' + c;
                break;
            case '?':
                if (extended) {
                    reStr += '.';
                    break;
                }
            case '[':
            case ']':
                if (extended) {
                    reStr += c;
                    break;
                }
            case '{':
                if (extended) {
                    inGroup = true;
                    reStr += '(';
                    break;
                }
            case '}':
                if (extended) {
                    inGroup = false;
                    reStr += ')';
                    break;
                }
            case ',':
                if (inGroup) {
                    reStr += '|';
                    break;
                }
                reStr += '\\' + c;
                break;

            case '*':
                let prevChar = glob[i - 1];
                let starCount = 1;
                while (glob[i + 1] === '*') {
                    starCount++;
                    i++;
                }
                let nextChar = glob[i + 1];

                if (!globstar) {
                    reStr += '.*';
                } else {
                    let isGlobstar = starCount > 1 &&
                        (prevChar === '/' || prevChar === undefined) &&
                        (nextChar === '/' || nextChar === undefined);

                    if (isGlobstar) {
                        reStr += '((?:[^/]*(?:\/|$))*)';
                        i++;
                    } else {
                        reStr += '([^/]*)';
                    }
                }
                break;

            default:
                reStr += c;
        }
    }
    reStr = reStr + '$';

    return new RegExp(reStr);
};