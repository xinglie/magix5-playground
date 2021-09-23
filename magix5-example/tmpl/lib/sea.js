//magix-composer#snippet;
//magix-composer#exclude = define,before
/**
 * Sea.js 2.2.3 | seajs.org/LICENSE.md
 */
/*!Sea.js 2.2.3|https://github.com/seajs/seajs/blob/master/LICENSE.md*/
((global, undefined) => {

  // Avoid conflicting when `sea.js` is loaded multiple times
  if (global.seajs) {
    return
  }

  let seajs = global.seajs = {
    // The current version of Sea.js being used
    //version: "2.2.3"
  }

  let data = seajs.data = {}


  /**
   * util-lang.js - The minimal language enhancement
   */

  let isType = (type) => {
    return (obj) => {
      return {}.toString.call(obj) == `[object ${type}]`
    }
  }

  //let isObject = isType("Object")
  let isString = isType("String")
  let isArray = Array.isArray
  let isFunction = isType("Function")

  let _cid = 0
  let cid = () => {
    return _cid++
  }

  // /**
  //  * util-events.js - The minimal events support
  //  */

  // let events = data.events = {}

  // // Bind event
  // seajs.on = function(name, callback) {
  //   var list = events[name] || (events[name] = [])
  //   list.push(callback)
  //   return seajs
  // }

  // // Remove event. If `callback` is undefined, remove all callbacks for the
  // // event. If `event` and `callback` are both undefined, remove all callbacks
  // // for all events
  // seajs.off = function(name, callback) {
  //   // Remove *all* events
  //   if (!(name || callback)) {
  //     events = data.events = {}
  //     return seajs
  //   }

  //   var list = events[name]
  //   if (list) {
  //     if (callback) {
  //       for (var i = list.length - 1; i >= 0; i--) {
  //         if (list[i] === callback) {
  //           list.splice(i, 1)
  //         }
  //       }
  //     }
  //     else {
  //       delete events[name]
  //     }
  //   }

  //   return seajs
  // }

  // Emit event, firing all bound callbacks. Callbacks receive the same
  // arguments as `emit` does, apart from the event name
  //var emit = seajs.emit = function(name, data) {
  // var list = events[name], fn

  // if (list) {
  //   // Copy callback lists to prevent modification
  //   list = list.slice()

  //   // Execute event callbacks
  //   while ((fn = list.shift())) {
  //     fn(data)
  //   }
  // }

  // return seajs
  //}


  /**
   * util-path.js - The utilities for operating path such as id, uri
   */

  let DIRNAME_RE = /[^?#]*\//

  let DOT_RE = /\/\.\//g
  let DOUBLE_DOT_RE = /\/[^/]+\/\.\.\//
  let DOUBLE_SLASH_RE = /([^:/])\/\//g

  // Extract the directory portion of a path
  // dirname("a/b/c.js?t=123#xx/zz") ==> "a/b/"
  // ref: http://jsperf.com/regex-vs-split/2
  let dirname = (path) => {
    return path.match(DIRNAME_RE)[0]
  }

  // Canonicalize a path
  // realpath("http://test.com/a//./b/../c") ==> "http://test.com/a/c"
  let realpath = (path) => {
    // /a/b/./c/./d ==> /a/b/c/d
    path = path.replace(DOT_RE, "/")

    // a/b/c/../../d  ==>  a/b/../d  ==>  a/d
    while (path.match(DOUBLE_DOT_RE)) {
      path = path.replace(DOUBLE_DOT_RE, "/")
    }

    // a//b/c  ==>  a/b/c
    path = path.replace(DOUBLE_SLASH_RE, "$1/")

    return path
  }

  // Normalize an id
  // normalize("path/to/a") ==> "path/to/a.js"
  // NOTICE: substring is faster than negative slice and RegExp
  let normalize = (path) => {
    let last = path.length - 1
    let lastC = path.charAt(last)

    // If the uri ends with `#`, just return it without '#'
    if (lastC === "#") {
      return path.substring(0, last)
    }

    return (path.substring(last - 2) === ".js" ||
      path.indexOf("?") > 0 ||
      path.substring(last - 3) === ".css" ||
      lastC === "/") ? path : path + ".js"
  }


  let PATHS_RE = /^([^/:]+)(\/.+)$/

  let parseAlias = (id) => {
    let alias = data.alias
    return alias && isString(alias[id]) ? alias[id] : id
  }

  let parsePaths = (id) => {
    let paths = data.paths
    let m

    if (paths && (m = id.match(PATHS_RE)) && isString(paths[m[1]])) {
      id = paths[m[1]] + m[2]
    }

    return id
  }



  let ABSOLUTE_RE = /^\/\/.|:\//
  let ROOT_DIR_RE = /^.*?\/\/.*?\//

  let addBase = (id, refUri) => {
    let ret
    let first = id.charAt(0)

    // Absolute
    if (ABSOLUTE_RE.test(id)) {
      ret = id
    }
    // Relative
    else if (first === ".") {
      ret = realpath((refUri ? dirname(refUri) : data.cwd) + id)
    }
    // Root
    else if (first === "/") {
      let m = data.cwd.match(ROOT_DIR_RE)
      ret = m ? m[0] + id.substring(1) : id
    }
    // Top-level
    else {
      ret = data.base + id
    }

    // Add default protocol when uri begins with "//"
    if (ret.indexOf("//") === 0) {
      ret = location.protocol + ret
    }

    return ret
  }

  let id2Uri = (id, refUri) => {
    if (!id) return ""

    id = parseAlias(id)
    id = parsePaths(id)
    id = normalize(id)

    let uri = addBase(id, refUri)

    return uri
  }


  let doc = document
  let cwd = dirname(doc.URL)
  let scripts = doc.scripts
  let getScriptAbsoluteSrc = (node) => {
    return node.hasAttribute ? // non-IE6/7
      node.src :
      // see http://msdn.microsoft.com/en-us/library/ms536429(VS.85).aspx
      node.getAttribute("src", 4)
  }
  // Recommend to add `seajsnode` id for the `sea.js` script element
  let loaderScript = scripts[scripts.length - 1]

  // When `sea.js` is inline, set loaderDir to current working directory
  let loaderDir = dirname(getScriptAbsoluteSrc(loaderScript) || cwd)




  // For Developers
  //seajs.resolve = id2Uri


  /**
   * util-request.js - The utilities for requesting script and style files
   * ref: tests/research/load-js-css/test.html
   */

  let head = doc.head;
  let baseElement = head.getElementsByTagName("base")[0]

  let IS_CSS_RE = /\.css(?:\?|$)/i
  let currentlyAddingScript
  let interactiveScript

  // `onload` event is not supported in WebKit < 535.23 and Firefox < 9.0
  // ref:
  //  - https://bugs.webkit.org/show_activity.cgi?id=38995
  //  - https://bugzilla.mozilla.org/show_bug.cgi?id=185236
  //  - https://developer.mozilla.org/en/HTML/Element/link#Stylesheet_load_events
  let isOldWebKit = +navigator.userAgent
    .replace(/.*(?:AppleWebKit|AndroidWebKit)\/(\d+).*/, "$1") < 536


  let request = (url, callback, charset, crossorigin) => {
    let isCSS = IS_CSS_RE.test(url)
    let node = doc.createElement(isCSS ? "link" : "script")

    if (charset) {
      node.charset = charset
    }

    // crossorigin default value is `false`.
    if (crossorigin != null) {
      node.setAttribute("crossorigin", crossorigin)
    }


    addOnload(node, callback, isCSS, url)

    if (isCSS) {
      node.rel = "stylesheet"
      node.href = url
    }
    else {
      node.async = true
      node.src = url
    }

    // For some cache cases in IE 6-8, the script executes IMMEDIATELY after
    // the end of the insert execution, so use `currentlyAddingScript` to
    // hold current node, for deriving url in `define` call
    currentlyAddingScript = node

    // ref: #185 & http://dev.jquery.com/ticket/2709
    baseElement ?
      head.insertBefore(node, baseElement) :
      head.appendChild(node)

    currentlyAddingScript = null
  }

  let addOnload = (node, callback, isCSS) => {
    let supportOnload = "onload" in node

    // for Old WebKit and Old Firefox
    if (isCSS && (isOldWebKit || !supportOnload)) {
      setTimeout(() => {
        pollCss(node, callback)
      }, 1) // Begin after node insertion
      return
    }

    let onload = () => {
      // Ensure only run once and handle memory leak in IE
      node.onload = node.onerror = node.onreadystatechange = null

      // Remove the script to reduce memory leak
      if (!isCSS && !data.debug) {
        head.removeChild(node)
      }

      // Dereference the node
      node = null

      callback()
    }

    if (supportOnload) {
      node.onload = onload
      node.onerror = onload
    }
    else {
      node.onreadystatechange = () => {
        if (/loaded|complete/.test(node.readyState)) {
          onload()
        }
      }
    }

  }

  let pollCss = (node, callback) => {
    let sheet = node.sheet
    let isLoaded

    // for WebKit < 536
    if (isOldWebKit) {
      if (sheet) {
        isLoaded = true
      }
    }
    // for Firefox < 9.0
    else if (sheet) {
      try {
        if (sheet.cssRules) {
          isLoaded = true
        }
      } catch (ex) {
        // The value of `ex.name` is changed from "NS_ERROR_DOM_SECURITY_ERR"
        // to "SecurityError" since Firefox 13.0. But Firefox is less than 9.0
        // in here, So it is ok to just rely on "NS_ERROR_DOM_SECURITY_ERR"
        if (ex.name === "NS_ERROR_DOM_SECURITY_ERR") {
          isLoaded = true
        }
      }
    }

    setTimeout(() => {
      if (isLoaded) {
        // Place callback here to give time for style rendering
        callback()
      }
      else {
        pollCss(node, callback)
      }
    }, 20)
  }

  let getCurrentScript = () => {
    if (currentlyAddingScript) {
      return currentlyAddingScript
    }

    // For IE6-9 browsers, the script onload event may not fire right
    // after the script is evaluated. Kris Zyp found that it
    // could query the script nodes and the one that is in "interactive"
    // mode indicates the current script
    // ref: http://goo.gl/JHfFW
    if (interactiveScript && interactiveScript.readyState === "interactive") {
      return interactiveScript
    }

    let scripts = head.getElementsByTagName("script")

    for (let i = scripts.length; i--;) {
      let script = scripts[i]
      if (script.readyState === "interactive") {
        interactiveScript = script
        return interactiveScript
      }
    }
  }


  // For Developers
  //seajs.request = request



  /**
   * module.js - The core of module loader
   */

  let cachedMods = seajs.cache = {}
  let anonymousMeta

  let fetchingList = {}
  let fetchedList = {}
  let callbackList = {}

  let STATUS = {
    // 1 - The `module.uri` is being fetched
    '@:{FETCHING}': 1,
    // 2 - The meta data has been saved to cachedMods
    '@:{SAVED}': 2,
    // 3 - The `module['@:{deps}']` are being loaded
    '@:{LOADING}': 3,
    // 4 - The module are ready to execute
    '@:{LOADED}': 4,
    // 5 - The module is being executed
    '@:{EXECUTING}': 5,
    // 6 - The `module.exports` is available
    '@:{EXECUTED}': 6
  }


  function Module(uri, deps) {
    this.uri = uri
    this['@:{deps}'] = deps || []
    this.exports = null
    this.status = 0

    // Who depends on me
    this['@:{waitings}'] = {}

    // The number of unloaded dependencies
    this['@:{remains}'] = 0
  }

  // Resolve module['@:{deps}']
  Module.prototype.resolve = function () {
    let mod = this
    let ids = mod['@:{deps}']
    let uris = []

    for (let i = 0, len = ids.length; i < len; i++) {
      uris[i] = id2Uri(ids[i], mod.uri)
    }
    return uris
  }

  // Load module['@:{deps}'] and fire onload when all done
  Module.prototype.load = function () {
    let mod = this

    // If the module is being loaded, just wait it onload call
    if (mod.status >= STATUS['@:{LOADING}']) {
      return
    }

    mod.status = STATUS['@:{LOADING}']

    // Emit `load` event for plugins such as combo plugin
    let uris = mod.resolve()
    //emit("load", uris)

    let len = mod['@:{remains}'] = uris.length

    let m;
    // Initialize modules and register waitings
    for (let i = 0; i < len; i++) {
      m = Module.get(uris[i])

      if (m.status < STATUS['@:{LOADED}']) {
        // Maybe duplicate: When module has dupliate dependency, it should be it's count, not 1
        m['@:{waitings}'][mod.uri] = (m['@:{waitings}'][mod.uri] || 0) + 1
      }
      else {
        mod['@:{remains}']--
      }
    }

    if (mod['@:{remains}'] === 0) {
      mod.onload()
      return
    }

    // Begin parallel loading
    let requestCache = {}

    for (let i = 0; i < len; i++) {
      m = cachedMods[uris[i]]

      if (m.status < STATUS['@:{FETCHING}']) {
        m.fetch(requestCache)
      }
      else if (m.status === STATUS['@:{SAVED}']) {
        m.load()
      }
    }

    // Send all requests at last to avoid cache bug in IE6-9. Issues#808
    for (let requestUri in requestCache) {
      if (requestCache.hasOwnProperty(requestUri)) {
        requestCache[requestUri]()
      }
    }
  }

  // Call this method when module is loaded
  Module.prototype.onload = function () {
    let mod = this
    mod.status = STATUS['@:{LOADED}']

    if (mod['@:{callback}']) {
      mod['@:{callback}']()
    }

    // Notify waiting modules to fire onload
    let waitings = mod['@:{waitings}']
    let uri, m

    for (uri in waitings) {
      if (waitings.hasOwnProperty(uri)) {
        m = cachedMods[uri]
        m['@:{remains}'] -= waitings[uri]
        if (m['@:{remains}'] === 0) {
          m.onload()
        }
      }
    }

    // Reduce memory taken
    delete mod['@:{waitings}']
    delete mod['@:{remains}']
  }

  // Fetch a module
  Module.prototype.fetch = function (requestCache) {
    let mod = this
    let requestUri = mod.uri

    mod.status = STATUS['@:{FETCHING}']

    // Emit `fetch` event for plugins such as combo plugin
    //let emitData = { uri: uri }
    //emit("fetch", emitData)
    //let requestUri = emitData.requestUri || uri

    // Empty uri or a non-CMD module
    if (!requestUri || fetchedList[requestUri]) {
      mod.load()
      return
    }

    if (fetchingList[requestUri]) {
      callbackList[requestUri].push(mod)
      return
    }

    fetchingList[requestUri] = true
    callbackList[requestUri] = [mod]

    let onRequest = () => {
      delete fetchingList[requestUri]
      fetchedList[requestUri] = true

      // Save meta data of anonymous module
      if (anonymousMeta) {
        Module.save(requestUri, anonymousMeta)
        anonymousMeta = null
      }

      // Call callbacks
      let m, mods = callbackList[requestUri]
      delete callbackList[requestUri]
      while ((m = mods.shift())) m.load()
    }

    let sendRequest = () => {
      request(requestUri, onRequest, data.charset, data.crossorigin)
    }
    requestCache ?
      requestCache[requestUri] = sendRequest :
      sendRequest()

  }

  // Execute a module
  Module.prototype.exec = function () {
    let mod = this

    // When module is executed, DO NOT execute it again. When module
    // is being executed, just return `module.exports` too, for avoiding
    // circularly calling
    if (mod.status >= STATUS['@:{EXECUTING}']) {
      return mod.exports
    }

    mod.status = STATUS['@:{EXECUTING}']

    // Create require
    let uri = mod.uri

    let require = (id) => {
      return Module.get(require.resolve(id)).exec()
    }

    require.resolve = (id) => {
      return id2Uri(id, uri)
    }

    require.async = (ids, callback) => {
      Module.use(ids, callback, uri + "_@:{async}_" + cid())
      return require
    }

    // Exec factory
    let factory = mod.factory

    let exports = isFunction(factory) ?
      factory(require, mod.exports = {}, mod) :
      factory

    if (exports === undefined) {
      exports = mod.exports
    }

    // Reduce memory leak
    delete mod.factory

    mod.exports = exports
    mod.status = STATUS['@:{EXECUTED}']

    // Emit `exec` event
    //emit("exec", mod)

    return exports
  }

  // Define a module
  Module.define = function (id, deps, factory) {
    let argsLen = arguments.length

    // define(factory)
    if (argsLen === 1) {
      factory = id
      id = undefined
    }
    else if (argsLen === 2) {
      factory = deps

      // define(deps, factory)
      if (isArray(id)) {
        deps = id
        id = undefined
      }
      // define(id, factory)
      else {
        deps = undefined
      }
    }

    // Parse dependencies according to the module factory code
    if (!isArray(deps) && isFunction(factory)) {
      deps = [];
    }

    let meta = {
      id: id,
      uri: id2Uri(id),
      deps: deps,
      factory: factory
    }

    // Try to derive uri in IE6-9 for anonymous modules
    if (!meta.uri && doc.attachEvent) {
      let script = getCurrentScript()

      if (script) {
        meta.uri = script.src
      }

      // NOTE: If the id-deriving methods above is failed, then falls back
      // to use onload event to get the uri
    }

    // Emit `define` event, used in nocache plugin, seajs node version etc
    //emit("define", meta)

    meta.uri ? Module.save(meta.uri, meta) :
      // Save information for "saving" work in the script onload event
      anonymousMeta = meta
  }

  // Save meta data to cachedMods
  Module.save = (uri, meta) => {
    let mod = Module.get(uri)

    // Do NOT override already saved modules
    if (mod.status < STATUS['@:{SAVED}']) {
      mod.id = meta.id || uri
      mod['@:{deps}'] = meta.deps || []
      mod.factory = meta.factory
      mod.status = STATUS['@:{SAVED}']
    }
  }

  // Get an existed module or create a new one
  Module.get = (uri, deps) => {
    return cachedMods[uri] || (cachedMods[uri] = new Module(uri, deps))
  }

  // Use function is equal to load a anonymous module
  Module.use = (ids, callback, uri) => {
    let mod = Module.get(uri, isArray(ids) ? ids : [ids])

    mod['@:{callback}'] = () => {
      let exports = []
      let uris = mod.resolve()

      for (let i = 0, len = uris.length; i < len; i++) {
        exports[i] = cachedMods[uris[i]].exec()
      }

      if (callback) {
        callback.apply(global, exports)
      }

      delete mod['@:{callback}'];
    }

    mod.load()
  }


  // Public API

  seajs.use = (ids, callback) => {
    Module.use(ids, callback, data.cwd + "_@:{use}_" + cid())
  }

  //Module.define.cmd = {}
  global.define = Module.define


  // For Developers

  //seajs.Module = Module
  //data.fetchedList = fetchedList
  //data.cid = cid

  seajs.require = (id) => {
    let mod = Module.get(id2Uri(id))
    if (mod.status < STATUS['@:{EXECUTING}']) {
      mod.onload()
      mod.exec()
    }
    return mod.exports
  }


  /**
   * config.js - The configuration for the loader
   */

  // The root path to use for id2uri parsing
  // If loaderUri is `http://test.com/libs/seajs/[??][seajs/1.2.3/]sea.js`, the
  // baseUri should be `http://test.com/libs/`
  data.base = loaderDir;

  // The loader directory
  //data.dir = loaderDir

  // The current working directory
  data.cwd = cwd

  // The charset for requesting files
  data.charset = "utf-8"

  // The history of every config
  //data.history = {}

  // The CORS options, Do't set CORS on default.
  //data.crossorigin = undefined


  // data.alias - An object containing shorthands of module id
  // data.paths - An object containing path shorthands in module id
  // data.vars - The {xxx} variables in module id
  // data.map - An array containing rules to map module uri
  // data.debug - Debug mode. The default value is false

  seajs.config = (configData) => {

    for (let key in configData) {
      let curr = configData[key]
      // let prev = data[key]


      // // Merge object config such as alias, lets
      // if (prev && isObject(prev)) {
      //   for (let k in curr) {
      //     prev[k] = curr[k]
      //   }
      // }
      // else {
      //   // Concat array config such as map, preload
      //   if (isArray(prev)) {
      //     curr = prev.concat(curr)
      //   }

      // Set config
      data[key] = curr
      //}
    }

    //emit("config", configData)
    return seajs
  }

})(window);