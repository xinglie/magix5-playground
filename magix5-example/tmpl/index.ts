//magix-composer#loader=none;
if (typeof DEBUG == 'undefined') DEBUG = true;
'@:./lib/sea.js';
'@:./lib/magix.ts';
setTimeout(() => {
    let node = document.getElementById('boot') as HTMLScriptElement;
    let src = node.src.replace(/\/[^\/]+$/, '/');
    seajs.config({
        paths: {
            app: src + 'app',
            gallery: src + 'gallery',
            i18n: src + 'i18n',
        },
        alias: {
            magix: 'magix5'
        }
    });
    seajs.use([
        'magix',
        'i18n/index'
    ], async ({
        applyStyle,
        config,
        View,
        parseUrl,
        boot
    }, I18n) => {
        applyStyle('@:scoped.style');
        let i18n;
        if (I18n.__esModule) {
            i18n = I18n.default;
        } else {
            i18n = I18n;
        }
        let lang = navigator.language.toLowerCase();
        try {
            let store = localStorage;
            if (store) {
                lang = store.getItem('rd.lang') || lang;
            }
        } catch {

        }
        let { params } = parseUrl(location.href);
        if (params.lang) {
            lang = params.lang;
        }
        config({
            lang
        });
        View.merge({
            ctor() {
                this.set({
                    i18n,
                });
            }
        });
        document.title = i18n('@:{lang#site.name}');
        boot({
            defaultPath: '/home',
            defaultView: 'app/index',
            unmatchView: 'app/404',//路由不匹配时
            rootId: 'app',
            /**
             * 这里配置路由，采用白名单的形式，我们把所有的路由都映射到app/index这个view上，再由app/index根据具体的path渲染相应的子view
             */
            routes: {
                '/home': 'app/index',
                '/todo': 'app/index',
                '/about': 'app/index',
                '/component': 'app/index'
            },
            error(e: Error) {
                setTimeout(() => {
                    throw e;
                }, 0);
            }
        });
    });
}, 20);