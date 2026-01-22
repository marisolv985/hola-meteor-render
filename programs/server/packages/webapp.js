Package["core-runtime"].queue("webapp",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var ECMAScript = Package.ecmascript.ECMAScript;
var Log = Package.logging.Log;
var RoutePolicy = Package.routepolicy.RoutePolicy;
var Boilerplate = Package['boilerplate-generator'].Boilerplate;
var WebAppHashing = Package['webapp-hashing'].WebAppHashing;
var Hook = Package['callback-hook'].Hook;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var WebApp, WebAppInternals, main;

var require = meteorInstall({"node_modules":{"meteor":{"webapp":{"webapp_server.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/webapp/webapp_server.js                                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({WebApp:()=>WebApp,WebAppInternals:()=>WebAppInternals,getGroupInfo:()=>getGroupInfo},true);let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);let _object_spread;module.link("@swc/helpers/_/_object_spread",{_(v){_object_spread=v}},1);let assert;module.link('assert',{default(v){assert=v}},2);let readFileSync,chmodSync,chownSync;module.link('fs',{readFileSync(v){readFileSync=v},chmodSync(v){chmodSync=v},chownSync(v){chownSync=v}},3);let createServer;module.link('http',{createServer(v){createServer=v}},4);let userInfo;module.link('os',{userInfo(v){userInfo=v}},5);let pathJoin,pathDirname;module.link('path',{join(v){pathJoin=v},dirname(v){pathDirname=v}},6);let parseUrl;module.link('url',{parse(v){parseUrl=v}},7);let createHash;module.link('crypto',{createHash(v){createHash=v}},8);let express;module.link('express',{default(v){express=v}},9);let compress;module.link('compression',{default(v){compress=v}},10);let cookieParser;module.link('cookie-parser',{default(v){cookieParser=v}},11);let qs;module.link('qs',{default(v){qs=v}},12);let parseRequest;module.link('parseurl',{default(v){parseRequest=v}},13);let lookupUserAgent;module.link('useragent-ng',{lookup(v){lookupUserAgent=v}},14);let isModern;module.link('meteor/modern-browsers',{isModern(v){isModern=v}},15);let send;module.link('send',{default(v){send=v}},16);let removeExistingSocketFile,registerSocketFileCleanup;module.link('./socket_file.js',{removeExistingSocketFile(v){removeExistingSocketFile=v},registerSocketFileCleanup(v){registerSocketFileCleanup=v}},17);let cluster;module.link('cluster',{default(v){cluster=v}},18);let execSync;module.link('child_process',{execSync(v){execSync=v}},19);let onMessage;module.link('meteor/inter-process-messaging',{onMessage(v){onMessage=v}},20);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();



















var SHORT_SOCKET_TIMEOUT = 5 * 1000;
var LONG_SOCKET_TIMEOUT = 120 * 1000;
const createExpressApp = ()=>{
    const app = express();
    // Security and performace headers
    // these headers come from these docs: https://expressjs.com/en/api.html#app.settings.table
    app.set('x-powered-by', false);
    app.set('etag', false);
    app.set('query parser', qs.parse);
    return app;
};
const WebApp = {};
const WebAppInternals = {};
const hasOwn = Object.prototype.hasOwnProperty;
WebAppInternals.NpmModules = {
    express: {
        version: Npm.require('express/package.json').version,
        module: express
    }
};
// More of a convenience for the end user
WebApp.express = express;
// Though we might prefer to use web.browser (modern) as the default
// architecture, safety requires a more compatible defaultArch.
WebApp.defaultArch = 'web.browser.legacy';
// XXX maps archs to manifests
WebApp.clientPrograms = {};
// XXX maps archs to program path on filesystem
var archPath = {};
var bundledJsCssUrlRewriteHook = function(url) {
    var bundledPrefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '';
    return bundledPrefix + url;
};
var sha1 = function(contents) {
    var hash = createHash('sha1');
    hash.update(contents);
    return hash.digest('hex');
};
function shouldCompress(req, res) {
    if (req.headers['x-no-compression']) {
        // don't compress responses with this request header
        return false;
    }
    // fallback to standard filter function
    return compress.filter(req, res);
}
// #BrowserIdentification
//
// We have multiple places that want to identify the browser: the
// unsupported browser page, the appcache package, and, eventually
// delivering browser polyfills only as needed.
//
// To avoid detecting the browser in multiple places ad-hoc, we create a
// Meteor "browser" object. It uses but does not expose the npm
// useragent module (we could choose a different mechanism to identify
// the browser in the future if we wanted to).  The browser object
// contains
//
// * `name`: the name of the browser in camel case
// * `major`, `minor`, `patch`: integers describing the browser version
//
// Also here is an early version of a Meteor `request` object, intended
// to be a high-level description of the request without exposing
// details of Express's low-level `req`.  Currently it contains:
//
// * `browser`: browser identification object described above
// * `url`: parsed url, including parsed query params
//
// As a temporary hack there is a `categorizeRequest` function on WebApp which
// converts a Express `req` to a Meteor `request`. This can go away once smart
// packages such as appcache are being passed a `request` object directly when
// they serve content.
//
// This allows `request` to be used uniformly: it is passed to the html
// attributes hook, and the appcache package can use it when deciding
// whether to generate a 404 for the manifest.
//
// Real routing / server side rendering will probably refactor this
// heavily.
// e.g. "Mobile Safari" => "mobileSafari"
var camelCase = function(name) {
    var parts = name.split(' ');
    parts[0] = parts[0].toLowerCase();
    for(var i = 1; i < parts.length; ++i){
        parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].substring(1);
    }
    return parts.join('');
};
var identifyBrowser = function(userAgentString) {
    if (!userAgentString) {
        return {
            name: 'unknown',
            major: 0,
            minor: 0,
            patch: 0
        };
    }
    var userAgent = lookupUserAgent(userAgentString);
    return {
        name: camelCase(userAgent.family),
        major: +userAgent.major,
        minor: +userAgent.minor,
        patch: +userAgent.patch
    };
};
// XXX Refactor as part of implementing real routing.
WebAppInternals.identifyBrowser = identifyBrowser;
WebApp.categorizeRequest = function(req) {
    if (req.browser && req.arch && typeof req.modern === 'boolean') {
        // Already categorized.
        return req;
    }
    const browser = identifyBrowser(req.headers['user-agent']);
    const modern = isModern(browser);
    const path = typeof req.pathname === 'string' ? req.pathname : parseRequest(req).pathname;
    const categorized = {
        browser,
        modern,
        path,
        arch: WebApp.defaultArch,
        url: parseUrl(req.url, true),
        dynamicHead: req.dynamicHead,
        dynamicBody: req.dynamicBody,
        headers: req.headers,
        cookies: req.cookies
    };
    const pathParts = path.split('/');
    const archKey = pathParts[1];
    if (archKey.startsWith('__')) {
        const archCleaned = 'web.' + archKey.slice(2);
        if (hasOwn.call(WebApp.clientPrograms, archCleaned)) {
            pathParts.splice(1, 1); // Remove the archKey part.
            return Object.assign(categorized, {
                arch: archCleaned,
                path: pathParts.join('/')
            });
        }
    }
    // TODO Perhaps one day we could infer Cordova clients here, so that we
    // wouldn't have to use prefixed "/__cordova/..." URLs.
    const preferredArchOrder = isModern(browser) ? [
        'web.browser',
        'web.browser.legacy'
    ] : [
        'web.browser.legacy',
        'web.browser'
    ];
    for (const arch of preferredArchOrder){
        // If our preferred arch is not available, it's better to use another
        // client arch that is available than to guarantee the site won't work
        // by returning an unknown arch. For example, if web.browser.legacy is
        // excluded using the --exclude-archs command-line option, legacy
        // clients are better off receiving web.browser (which might actually
        // work) than receiving an HTTP 404 response. If none of the archs in
        // preferredArchOrder are defined, only then should we send a 404.
        if (hasOwn.call(WebApp.clientPrograms, arch)) {
            return Object.assign(categorized, {
                arch
            });
        }
    }
    return categorized;
};
// HTML attribute hooks: functions to be called to determine any attributes to
// be added to the '<html>' tag. Each function is passed a 'request' object (see
// #BrowserIdentification) and should return null or object.
var htmlAttributeHooks = [];
var getHtmlAttributes = function(request) {
    var combinedAttributes = {};
    (htmlAttributeHooks || []).forEach(function(hook) {
        var attributes = hook(request);
        if (attributes === null) return;
        if (typeof attributes !== 'object') throw Error('HTML attribute hook must return null or object');
        Object.assign(combinedAttributes, attributes);
    });
    return combinedAttributes;
};
WebApp.addHtmlAttributeHook = function(hook) {
    htmlAttributeHooks.push(hook);
};
// Serve app HTML for this URL?
var appUrl = function(url) {
    if (url === '/favicon.ico' || url === '/robots.txt') return false;
    // NOTE: app.manifest is not a web standard like favicon.ico and
    // robots.txt. It is a file name we have chosen to use for HTML5
    // appcache URLs. It is included here to prevent using an appcache
    // then removing it from poisoning an app permanently. Eventually,
    // once we have server side routing, this won't be needed as
    // unknown URLs with return a 404 automatically.
    if (url === '/app.manifest') return false;
    // Avoid serving app HTML for declared routes such as /sockjs/.
    if (RoutePolicy.classify(url)) return false;
    // we currently return app HTML on all URLs by default
    return true;
};
// We need to calculate the client hash after all packages have loaded
// to give them a chance to populate __meteor_runtime_config__.
//
// Calculating the hash during startup means that packages can only
// populate __meteor_runtime_config__ during load, not during startup.
//
// Calculating instead it at the beginning of main after all startup
// hooks had run would allow packages to also populate
// __meteor_runtime_config__ during startup, but that's too late for
// autoupdate because it needs to have the client hash at startup to
// insert the auto update version itself into
// __meteor_runtime_config__ to get it to the client.
//
// An alternative would be to give autoupdate a "post-start,
// pre-listen" hook to allow it to insert the auto update version at
// the right moment.
Meteor.startup(function() {
    function getter(key) {
        return function(arch) {
            arch = arch || WebApp.defaultArch;
            const program = WebApp.clientPrograms[arch];
            const value = program && program[key];
            // If this is the first time we have calculated this hash,
            // program[key] will be a thunk (lazy function with no parameters)
            // that we should call to do the actual computation.
            return typeof value === 'function' ? program[key] = value() : value;
        };
    }
    WebApp.calculateClientHash = WebApp.clientHash = getter('version');
    WebApp.calculateClientHashRefreshable = getter('versionRefreshable');
    WebApp.calculateClientHashNonRefreshable = getter('versionNonRefreshable');
    WebApp.calculateClientHashReplaceable = getter('versionReplaceable');
    WebApp.getRefreshableAssets = getter('refreshableAssets');
});
// When we have a request pending, we want the socket timeout to be long, to
// give ourselves a while to serve it, and to allow sockjs long polls to
// complete.  On the other hand, we want to close idle sockets relatively
// quickly, so that we can shut down relatively promptly but cleanly, without
// cutting off anyone's response.
WebApp._timeoutAdjustmentRequestCallback = function(req, res) {
    // this is really just req.socket.setTimeout(LONG_SOCKET_TIMEOUT);
    req.setTimeout(LONG_SOCKET_TIMEOUT);
    // Insert our new finish listener to run BEFORE the existing one which removes
    // the response from the socket.
    var finishListeners = res.listeners('finish');
    // XXX Apparently in Node 0.12 this event was called 'prefinish'.
    // https://github.com/joyent/node/commit/7c9b6070
    // But it has switched back to 'finish' in Node v4:
    // https://github.com/nodejs/node/pull/1411
    res.removeAllListeners('finish');
    res.on('finish', function() {
        res.setTimeout(SHORT_SOCKET_TIMEOUT);
    });
    Object.values(finishListeners).forEach(function(l) {
        res.on('finish', l);
    });
};
// Will be updated by main before we listen.
// Map from client arch to boilerplate object.
// Boilerplate object has:
//   - func: XXX
//   - baseData: XXX
var boilerplateByArch = {};
// Register a callback function that can selectively modify boilerplate
// data given arguments (request, data, arch). The key should be a unique
// identifier, to prevent accumulating duplicate callbacks from the same
// call site over time. Callbacks will be called in the order they were
// registered. A callback should return false if it did not make any
// changes affecting the boilerplate. Passing null deletes the callback.
// Any previous callback registered for this key will be returned.
const boilerplateDataCallbacks = Object.create(null);
WebAppInternals.registerBoilerplateDataCallback = function(key, callback) {
    const previousCallback = boilerplateDataCallbacks[key];
    if (typeof callback === 'function') {
        boilerplateDataCallbacks[key] = callback;
    } else {
        assert.strictEqual(callback, null);
        delete boilerplateDataCallbacks[key];
    }
    // Return the previous callback in case the new callback needs to call
    // it; for example, when the new callback is a wrapper for the old.
    return previousCallback || null;
};
// Given a request (as returned from `categorizeRequest`), return the
// boilerplate HTML to serve for that request.
//
// If a previous Express middleware has rendered content for the head or body,
// returns the boilerplate with that content patched in otherwise
// memoizes on HTML attributes (used by, eg, appcache) and whether inline
// scripts are currently allowed.
// XXX so far this function is always called with arch === 'web.browser'
function getBoilerplate(request, arch) {
    return getBoilerplateAsync(request, arch);
}
/**
 * @summary Takes a runtime configuration object and
 * returns an encoded runtime string.
 * @locus Server
 * @param {Object} rtimeConfig
 * @returns {String}
 */ WebApp.encodeRuntimeConfig = function(rtimeConfig) {
    return JSON.stringify(encodeURIComponent(JSON.stringify(rtimeConfig)));
};
/**
 * @summary Takes an encoded runtime string and returns
 * a runtime configuration object.
 * @locus Server
 * @param {String} rtimeConfigString
 * @returns {Object}
 */ WebApp.decodeRuntimeConfig = function(rtimeConfigStr) {
    return JSON.parse(decodeURIComponent(JSON.parse(rtimeConfigStr)));
};
const runtimeConfig = {
    // hooks will contain the callback functions
    // set by the caller to addRuntimeConfigHook
    hooks: new Hook(),
    // updateHooks will contain the callback functions
    // set by the caller to addUpdatedNotifyHook
    updateHooks: new Hook(),
    // isUpdatedByArch is an object containing fields for each arch
    // that this server supports.
    // - Each field will be true when the server updates the runtimeConfig for that arch.
    // - When the hook callback is called the update field in the callback object will be
    // set to isUpdatedByArch[arch].
    // = isUpdatedyByArch[arch] is reset to false after the callback.
    // This enables the caller to cache data efficiently so they do not need to
    // decode & update data on every callback when the runtimeConfig is not changing.
    isUpdatedByArch: {}
};
/**
 * @name addRuntimeConfigHookCallback(options)
 * @locus Server
 * @isprototype true
 * @summary Callback for `addRuntimeConfigHook`.
 *
 * If the handler returns a _falsy_ value the hook will not
 * modify the runtime configuration.
 *
 * If the handler returns a _String_ the hook will substitute
 * the string for the encoded configuration string.
 *
 * **Warning:** the hook does not check the return value at all it is
 * the responsibility of the caller to get the formatting correct using
 * the helper functions.
 *
 * `addRuntimeConfigHookCallback` takes only one `Object` argument
 * with the following fields:
 * @param {Object} options
 * @param {String} options.arch The architecture of the client
 * requesting a new runtime configuration. This can be one of
 * `web.browser`, `web.browser.legacy` or `web.cordova`.
 * @param {Object} options.request
 * A NodeJs [IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage)
 * https://nodejs.org/api/http.html#http_class_http_incomingmessage
 * `Object` that can be used to get information about the incoming request.
 * @param {String} options.encodedCurrentConfig The current configuration object
 * encoded as a string for inclusion in the root html.
 * @param {Boolean} options.updated `true` if the config for this architecture
 * has been updated since last called, otherwise `false`. This flag can be used
 * to cache the decoding/encoding for each architecture.
 */ /**
 * @summary Hook that calls back when the meteor runtime configuration,
 * `__meteor_runtime_config__` is being sent to any client.
 *
 * **returns**: <small>_Object_</small> `{ stop: function, callback: function }`
 * - `stop` <small>_Function_</small> Call `stop()` to stop getting callbacks.
 * - `callback` <small>_Function_</small> The passed in `callback`.
 * @locus Server
 * @param {addRuntimeConfigHookCallback} callback
 * See `addRuntimeConfigHookCallback` description.
 * @returns {Object} {{ stop: function, callback: function }}
 * Call the returned `stop()` to stop getting callbacks.
 * The passed in `callback` is returned also.
 */ WebApp.addRuntimeConfigHook = function(callback) {
    return runtimeConfig.hooks.register(callback);
};
function getBoilerplateAsync(request, arch) {
    return _async_to_generator(function*() {
        let boilerplate = boilerplateByArch[arch];
        yield runtimeConfig.hooks.forEachAsync((hook)=>_async_to_generator(function*() {
                const meteorRuntimeConfig = yield hook({
                    arch,
                    request,
                    encodedCurrentConfig: boilerplate.baseData.meteorRuntimeConfig,
                    updated: runtimeConfig.isUpdatedByArch[arch]
                });
                if (!meteorRuntimeConfig) return true;
                boilerplate.baseData = Object.assign({}, boilerplate.baseData, {
                    meteorRuntimeConfig
                });
                return true;
            })());
        runtimeConfig.isUpdatedByArch[arch] = false;
        const { dynamicHead, dynamicBody } = request;
        const data = Object.assign({}, boilerplate.baseData, {
            htmlAttributes: getHtmlAttributes(request)
        }, {
            dynamicHead,
            dynamicBody
        });
        let madeChanges = false;
        let promise = Promise.resolve();
        Object.keys(boilerplateDataCallbacks).forEach((key)=>{
            promise = promise.then(()=>{
                const callback = boilerplateDataCallbacks[key];
                return callback(request, data, arch);
            }).then((result)=>{
                // Callbacks should return false if they did not make any changes.
                if (result !== false) {
                    madeChanges = true;
                }
            });
        });
        return promise.then(()=>({
                stream: boilerplate.toHTMLStream(data),
                statusCode: data.statusCode,
                headers: data.headers
            }));
    })();
}
/**
 * @name addUpdatedNotifyHookCallback(options)
 * @summary callback handler for `addupdatedNotifyHook`
 * @isprototype true
 * @locus Server
 * @param {Object} options
 * @param {String} options.arch The architecture that is being updated.
 * This can be one of `web.browser`, `web.browser.legacy` or `web.cordova`.
 * @param {Object} options.manifest The new updated manifest object for
 * this `arch`.
 * @param {Object} options.runtimeConfig The new updated configuration
 * object for this `arch`.
 */ /**
 * @summary Hook that runs when the meteor runtime configuration
 * is updated.  Typically the configuration only changes during development mode.
 * @locus Server
 * @param {addUpdatedNotifyHookCallback} handler
 * The `handler` is called on every change to an `arch` runtime configuration.
 * See `addUpdatedNotifyHookCallback`.
 * @returns {Object} {{ stop: function, callback: function }}
 */ WebApp.addUpdatedNotifyHook = function(handler) {
    return runtimeConfig.updateHooks.register(handler);
};
WebAppInternals.generateBoilerplateInstance = function(arch, manifest, additionalOptions) {
    additionalOptions = additionalOptions || {};
    runtimeConfig.isUpdatedByArch[arch] = true;
    const rtimeConfig = _object_spread({}, __meteor_runtime_config__, additionalOptions.runtimeConfigOverrides || {});
    runtimeConfig.updateHooks.forEach((cb)=>{
        cb({
            arch,
            manifest,
            runtimeConfig: rtimeConfig
        });
        return true;
    });
    const meteorRuntimeConfig = JSON.stringify(encodeURIComponent(JSON.stringify(rtimeConfig)));
    return new Boilerplate(arch, manifest, Object.assign({
        pathMapper (itemPath) {
            return pathJoin(archPath[arch], itemPath);
        },
        baseDataExtension: {
            additionalStaticJs: (Object.entries(additionalStaticJs) || []).map(function([pathname, contents]) {
                return {
                    pathname: pathname,
                    contents: contents
                };
            }),
            // Convert to a JSON string, then get rid of most weird characters, then
            // wrap in double quotes. (The outermost JSON.stringify really ought to
            // just be "wrap in double quotes" but we use it to be safe.) This might
            // end up inside a <script> tag so we need to be careful to not include
            // "</script>", but normal {{spacebars}} escaping escapes too much! See
            // https://github.com/meteor/meteor/issues/3730
            meteorRuntimeConfig,
            meteorRuntimeHash: sha1(meteorRuntimeConfig),
            rootUrlPathPrefix: __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '',
            bundledJsCssUrlRewriteHook: bundledJsCssUrlRewriteHook,
            sriMode: sriMode,
            inlineScriptsAllowed: WebAppInternals.inlineScriptsAllowed(),
            inline: additionalOptions.inline
        }
    }, additionalOptions));
};
// A mapping from url path to architecture (e.g. "web.browser") to static
// file information with the following fields:
// - type: the type of file to be served
// - cacheable: optionally, whether the file should be cached or not
// - sourceMapUrl: optionally, the url of the source map
//
// Info also contains one of the following:
// - content: the stringified content that should be served at this path
// - absolutePath: the absolute path on disk to the file
// Serve static files from the manifest or added with
// `addStaticJs`. Exported for tests.
WebAppInternals.staticFilesMiddleware = function(staticFilesByArch, req, res, next) {
    return _async_to_generator(function*() {
        var _Meteor_settings_packages_webapp, _Meteor_settings_packages;
        var pathname = parseRequest(req).pathname;
        try {
            pathname = decodeURIComponent(pathname);
        } catch (e) {
            next();
            return;
        }
        var serveStaticJs = function(s) {
            var _Meteor_settings_packages_webapp, _Meteor_settings_packages;
            if (req.method === 'GET' || req.method === 'HEAD' || ((_Meteor_settings_packages = Meteor.settings.packages) === null || _Meteor_settings_packages === void 0 ? void 0 : (_Meteor_settings_packages_webapp = _Meteor_settings_packages.webapp) === null || _Meteor_settings_packages_webapp === void 0 ? void 0 : _Meteor_settings_packages_webapp.alwaysReturnContent)) {
                res.writeHead(200, {
                    'Content-type': 'application/javascript; charset=UTF-8',
                    'Content-Length': Buffer.byteLength(s)
                });
                res.write(s);
                res.end();
            } else {
                const status = req.method === 'OPTIONS' ? 200 : 405;
                res.writeHead(status, {
                    Allow: 'OPTIONS, GET, HEAD',
                    'Content-Length': '0'
                });
                res.end();
            }
        };
        if (pathname in additionalStaticJs && !WebAppInternals.inlineScriptsAllowed()) {
            serveStaticJs(additionalStaticJs[pathname]);
            return;
        }
        const { arch, path } = WebApp.categorizeRequest(req);
        if (!hasOwn.call(WebApp.clientPrograms, arch)) {
            // We could come here in case we run with some architectures excluded
            next();
            return;
        }
        // If pauseClient(arch) has been called, program.paused will be a
        // Promise that will be resolved when the program is unpaused.
        const program = WebApp.clientPrograms[arch];
        yield program.paused;
        if (path === '/meteor_runtime_config.js' && !WebAppInternals.inlineScriptsAllowed()) {
            serveStaticJs(`__meteor_runtime_config__ = ${program.meteorRuntimeConfig};`);
            return;
        }
        const info = getStaticFileInfo(staticFilesByArch, pathname, path, arch);
        if (!info) {
            next();
            return;
        }
        // "send" will handle HEAD & GET requests
        if (req.method !== 'HEAD' && req.method !== 'GET' && !((_Meteor_settings_packages = Meteor.settings.packages) === null || _Meteor_settings_packages === void 0 ? void 0 : (_Meteor_settings_packages_webapp = _Meteor_settings_packages.webapp) === null || _Meteor_settings_packages_webapp === void 0 ? void 0 : _Meteor_settings_packages_webapp.alwaysReturnContent)) {
            const status = req.method === 'OPTIONS' ? 200 : 405;
            res.writeHead(status, {
                Allow: 'OPTIONS, GET, HEAD',
                'Content-Length': '0'
            });
            res.end();
            return;
        }
        // We don't need to call pause because, unlike 'static', once we call into
        // 'send' and yield to the event loop, we never call another handler with
        // 'next'.
        // Cacheable files are files that should never change. Typically
        // named by their hash (eg meteor bundled js and css files).
        // We cache them ~forever (1yr).
        const maxAge = info.cacheable ? 1000 * 60 * 60 * 24 * 365 : 0;
        if (info.cacheable) {
            // Since we use req.headers["user-agent"] to determine whether the
            // client should receive modern or legacy resources, tell the client
            // to invalidate cached resources when/if its user agent string
            // changes in the future.
            res.setHeader('Vary', 'User-Agent');
        }
        // Set the X-SourceMap header, which current Chrome, FireFox, and Safari
        // understand.  (The SourceMap header is slightly more spec-correct but FF
        // doesn't understand it.)
        //
        // You may also need to enable source maps in Chrome: open dev tools, click
        // the gear in the bottom right corner, and select "enable source maps".
        if (info.sourceMapUrl) {
            res.setHeader('X-SourceMap', __meteor_runtime_config__.ROOT_URL_PATH_PREFIX + info.sourceMapUrl);
        }
        if (info.type === 'js' || info.type === 'dynamic js') {
            res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
        } else if (info.type === 'css') {
            res.setHeader('Content-Type', 'text/css; charset=UTF-8');
        } else if (info.type === 'json') {
            res.setHeader('Content-Type', 'application/json; charset=UTF-8');
        }
        if (info.hash) {
            res.setHeader('ETag', '"' + info.hash + '"');
        }
        if (info.content) {
            res.setHeader('Content-Length', Buffer.byteLength(info.content));
            res.write(info.content);
            res.end();
        } else {
            send(req, info.absolutePath, {
                maxage: maxAge,
                dotfiles: 'allow',
                lastModified: false
            }).on('error', function(err) {
                Log.error('Error serving static file ' + err);
                res.writeHead(500);
                res.end();
            }).on('directory', function() {
                Log.error('Unexpected directory ' + info.absolutePath);
                res.writeHead(500);
                res.end();
            }).pipe(res);
        }
    })();
};
function getStaticFileInfo(staticFilesByArch, originalPath, path, arch) {
    if (!hasOwn.call(WebApp.clientPrograms, arch)) {
        return null;
    }
    // Get a list of all available static file architectures, with arch
    // first in the list if it exists.
    const staticArchList = Object.keys(staticFilesByArch);
    const archIndex = staticArchList.indexOf(arch);
    if (archIndex > 0) {
        staticArchList.unshift(staticArchList.splice(archIndex, 1)[0]);
    }
    let info = null;
    staticArchList.some((arch)=>{
        const staticFiles = staticFilesByArch[arch];
        function finalize(path) {
            info = staticFiles[path];
            // Sometimes we register a lazy function instead of actual data in
            // the staticFiles manifest.
            if (typeof info === 'function') {
                info = staticFiles[path] = info();
            }
            return info;
        }
        // If staticFiles contains originalPath with the arch inferred above,
        // use that information.
        if (hasOwn.call(staticFiles, originalPath)) {
            return finalize(originalPath);
        }
        // If categorizeRequest returned an alternate path, try that instead.
        if (path !== originalPath && hasOwn.call(staticFiles, path)) {
            return finalize(path);
        }
    });
    return info;
}
// Parse the passed in port value. Return the port as-is if it's a String
// (e.g. a Windows Server style named pipe), otherwise return the port as an
// integer.
//
// DEPRECATED: Direct use of this function is not recommended; it is no
// longer used internally, and will be removed in a future release.
WebAppInternals.parsePort = (port)=>{
    let parsedPort = parseInt(port);
    if (Number.isNaN(parsedPort)) {
        parsedPort = port;
    }
    return parsedPort;
};

onMessage('webapp-pause-client', ({ arch })=>_async_to_generator(function*() {
        yield WebAppInternals.pauseClient(arch);
    })());
onMessage('webapp-reload-client', ({ arch })=>_async_to_generator(function*() {
        yield WebAppInternals.generateClientProgram(arch);
    })());
function runWebAppServer() {
    return _async_to_generator(function*() {
        var shuttingDown = false;
        var syncQueue = new Meteor._AsynchronousQueue();
        var getItemPathname = function(itemUrl) {
            return decodeURIComponent(parseUrl(itemUrl).pathname);
        };
        WebAppInternals.reloadClientPrograms = function() {
            return _async_to_generator(function*() {
                yield syncQueue.runTask(function() {
                    const staticFilesByArch = Object.create(null);
                    const { configJson } = __meteor_bootstrap__;
                    const clientArchs = configJson.clientArchs || Object.keys(configJson.clientPaths);
                    try {
                        clientArchs.forEach((arch)=>{
                            generateClientProgram(arch, staticFilesByArch);
                        });
                        WebAppInternals.staticFilesByArch = staticFilesByArch;
                    } catch (e) {
                        Log.error('Error reloading the client program: ' + e.stack);
                        process.exit(1);
                    }
                });
            })();
        };
        // Pause any incoming requests and make them wait for the program to be
        // unpaused the next time generateClientProgram(arch) is called.
        WebAppInternals.pauseClient = function(arch) {
            return _async_to_generator(function*() {
                yield syncQueue.runTask(()=>{
                    const program = WebApp.clientPrograms[arch];
                    const { unpause } = program;
                    program.paused = new Promise((resolve)=>{
                        if (typeof unpause === 'function') {
                            // If there happens to be an existing program.unpause function,
                            // compose it with the resolve function.
                            program.unpause = function() {
                                unpause();
                                resolve();
                            };
                        } else {
                            program.unpause = resolve;
                        }
                    });
                });
            })();
        };
        WebAppInternals.generateClientProgram = function(arch) {
            return _async_to_generator(function*() {
                yield syncQueue.runTask(()=>generateClientProgram(arch));
            })();
        };
        function generateClientProgram(arch, staticFilesByArch = WebAppInternals.staticFilesByArch) {
            const clientDir = pathJoin(pathDirname(__meteor_bootstrap__.serverDir), arch);
            // read the control for the client we'll be serving up
            const programJsonPath = pathJoin(clientDir, 'program.json');
            let programJson;
            try {
                programJson = JSON.parse(readFileSync(programJsonPath));
            } catch (e) {
                if (e.code === 'ENOENT') return;
                throw e;
            }
            if (programJson.format !== 'web-program-pre1') {
                throw new Error('Unsupported format for client assets: ' + JSON.stringify(programJson.format));
            }
            if (!programJsonPath || !clientDir || !programJson) {
                throw new Error('Client config file not parsed.');
            }
            archPath[arch] = clientDir;
            const staticFiles = staticFilesByArch[arch] = Object.create(null);
            const { manifest } = programJson;
            manifest.forEach((item)=>{
                if (item.url && item.where === 'client') {
                    staticFiles[getItemPathname(item.url)] = {
                        absolutePath: pathJoin(clientDir, item.path),
                        cacheable: item.cacheable,
                        hash: item.hash,
                        // Link from source to its map
                        sourceMapUrl: item.sourceMapUrl,
                        type: item.type
                    };
                    if (item.sourceMap) {
                        // Serve the source map too, under the specified URL. We assume
                        // all source maps are cacheable.
                        staticFiles[getItemPathname(item.sourceMapUrl)] = {
                            absolutePath: pathJoin(clientDir, item.sourceMap),
                            cacheable: true
                        };
                    }
                }
            });
            const { PUBLIC_SETTINGS } = __meteor_runtime_config__;
            const configOverrides = {
                PUBLIC_SETTINGS
            };
            const oldProgram = WebApp.clientPrograms[arch];
            const newProgram = WebApp.clientPrograms[arch] = {
                format: 'web-program-pre1',
                manifest: manifest,
                // Use arrow functions so that these versions can be lazily
                // calculated later, and so that they will not be included in the
                // staticFiles[manifestUrl].content string below.
                //
                // Note: these version calculations must be kept in agreement with
                // CordovaBuilder#appendVersion in tools/cordova/builder.js, or hot
                // code push will reload Cordova apps unnecessarily.
                version: ()=>WebAppHashing.calculateClientHash(manifest, null, configOverrides),
                versionRefreshable: ()=>WebAppHashing.calculateClientHash(manifest, (type)=>type === 'css', configOverrides),
                versionNonRefreshable: ()=>WebAppHashing.calculateClientHash(manifest, (type, replaceable)=>type !== 'css' && !replaceable, configOverrides),
                versionReplaceable: ()=>WebAppHashing.calculateClientHash(manifest, (_type, replaceable)=>replaceable, configOverrides),
                cordovaCompatibilityVersions: programJson.cordovaCompatibilityVersions,
                PUBLIC_SETTINGS,
                hmrVersion: programJson.hmrVersion
            };
            // Expose program details as a string reachable via the following URL.
            const manifestUrlPrefix = '/__' + arch.replace(/^web\./, '');
            const manifestUrl = manifestUrlPrefix + getItemPathname('/manifest.json');
            staticFiles[manifestUrl] = ()=>{
                if (Package.autoupdate) {
                    const { AUTOUPDATE_VERSION = Package.autoupdate.Autoupdate.autoupdateVersion } = process.env;
                    if (AUTOUPDATE_VERSION) {
                        newProgram.version = AUTOUPDATE_VERSION;
                    }
                }
                if (typeof newProgram.version === 'function') {
                    newProgram.version = newProgram.version();
                }
                return {
                    content: JSON.stringify(newProgram),
                    cacheable: false,
                    hash: newProgram.version,
                    type: 'json'
                };
            };
            generateBoilerplateForArch(arch);
            // If there are any requests waiting on oldProgram.paused, let them
            // continue now (using the new program).
            if (oldProgram && oldProgram.paused) {
                oldProgram.unpause();
            }
        }
        const defaultOptionsForArch = {
            'web.cordova': {
                runtimeConfigOverrides: {
                    // XXX We use absoluteUrl() here so that we serve https://
                    // URLs to cordova clients if force-ssl is in use. If we were
                    // to use __meteor_runtime_config__.ROOT_URL instead of
                    // absoluteUrl(), then Cordova clients would immediately get a
                    // HCP setting their DDP_DEFAULT_CONNECTION_URL to
                    // http://example.meteor.com. This breaks the app, because
                    // force-ssl doesn't serve CORS headers on 302
                    // redirects. (Plus it's undesirable to have clients
                    // connecting to http://example.meteor.com when force-ssl is
                    // in use.)
                    DDP_DEFAULT_CONNECTION_URL: process.env.MOBILE_DDP_URL || Meteor.absoluteUrl(),
                    ROOT_URL: process.env.MOBILE_ROOT_URL || Meteor.absoluteUrl()
                }
            },
            'web.browser': {
                runtimeConfigOverrides: {
                    isModern: true
                }
            },
            'web.browser.legacy': {
                runtimeConfigOverrides: {
                    isModern: false
                }
            }
        };
        WebAppInternals.generateBoilerplate = function() {
            return _async_to_generator(function*() {
                // This boilerplate will be served to the mobile devices when used with
                // Meteor/Cordova for the Hot-Code Push and since the file will be served by
                // the device's server, it is important to set the DDP url to the actual
                // Meteor server accepting DDP connections and not the device's file server.
                yield syncQueue.runTask(function() {
                    Object.keys(WebApp.clientPrograms).forEach(generateBoilerplateForArch);
                });
            })();
        };
        function generateBoilerplateForArch(arch) {
            const program = WebApp.clientPrograms[arch];
            const additionalOptions = defaultOptionsForArch[arch] || {};
            const { baseData } = boilerplateByArch[arch] = WebAppInternals.generateBoilerplateInstance(arch, program.manifest, additionalOptions);
            // We need the runtime config with overrides for meteor_runtime_config.js:
            program.meteorRuntimeConfig = JSON.stringify(_object_spread({}, __meteor_runtime_config__, additionalOptions.runtimeConfigOverrides || null));
            program.refreshableAssets = baseData.css.map((file)=>({
                    url: bundledJsCssUrlRewriteHook(file.url)
                }));
        }
        yield WebAppInternals.reloadClientPrograms();
        // webserver
        var app = createExpressApp();
        // Packages and apps can add handlers that run before any other Meteor
        // handlers via WebApp.rawExpressHandlers.
        var rawExpressHandlers = createExpressApp();
        app.use(rawExpressHandlers);
        // Auto-compress any json, javascript, or text.
        app.use(compress({
            filter: shouldCompress
        }));
        // parse cookies into an object
        app.use(cookieParser());
        // We're not a proxy; reject (without crashing) attempts to treat us like
        // one. (See #1212.)
        app.use(function(req, res, next) {
            if (RoutePolicy.isValidUrl(req.url)) {
                next();
                return;
            }
            res.writeHead(400);
            res.write('Not a proxy');
            res.end();
        });
        function getPathParts(path) {
            const parts = path.split('/');
            while(parts[0] === '')parts.shift();
            return parts;
        }
        function isPrefixOf(prefix, array) {
            return prefix.length <= array.length && prefix.every((part, i)=>part === array[i]);
        }
        // Strip off the path prefix, if it exists.
        app.use(function(request, response, next) {
            const pathPrefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX;
            const { pathname, search } = parseUrl(request.url);
            // check if the path in the url starts with the path prefix
            if (pathPrefix) {
                const prefixParts = getPathParts(pathPrefix);
                const pathParts = getPathParts(pathname);
                if (isPrefixOf(prefixParts, pathParts)) {
                    request.url = '/' + pathParts.slice(prefixParts.length).join('/');
                    if (search) {
                        request.url += search;
                    }
                    return next();
                }
            }
            if (pathname === '/favicon.ico' || pathname === '/robots.txt') {
                return next();
            }
            if (pathPrefix) {
                response.writeHead(404);
                response.write('Unknown path');
                response.end();
                return;
            }
            next();
        });
        // Serve static files from the manifest.
        // This is inspired by the 'static' middleware.
        app.use(function(req, res, next) {
            // console.log(String(arguments.callee));
            WebAppInternals.staticFilesMiddleware(WebAppInternals.staticFilesByArch, req, res, next);
        });
        // Core Meteor packages like dynamic-import can add handlers before
        // other handlers added by package and application code.
        app.use(WebAppInternals.meteorInternalHandlers = createExpressApp());
        /**
   * @name expressHandlersCallback(req, res, next)
   * @locus Server
   * @isprototype true
   * @summary callback handler for `WebApp.expressHandlers`
   * @param {Object} req
   * a Node.js
   * [IncomingMessage](https://nodejs.org/api/http.html#class-httpincomingmessage)
   * object with some extra properties. This argument can be used
   *  to get information about the incoming request.
   * @param {Object} res
   * a Node.js
   * [ServerResponse](https://nodejs.org/api/http.html#class-httpserverresponse)
   * object. Use this to write data that should be sent in response to the
   * request, and call `res.end()` when you are done.
   * @param {Function} next
   * Calling this function will pass on the handling of
   * this request to the next relevant handler.
   *
   */ /**
   * @method handlers
   * @memberof WebApp
   * @locus Server
   * @summary Register a handler for all HTTP requests.
   * @param {String} [path]
   * This handler will only be called on paths that match
   * this string. The match has to border on a `/` or a `.`.
   *
   * For example, `/hello` will match `/hello/world` and
   * `/hello.world`, but not `/hello_world`.
   * @param {expressHandlersCallback} handler
   * A handler function that will be called on HTTP requests.
   * See `expressHandlersCallback`
   *
   */ // Packages and apps can add handlers to this via WebApp.expressHandlers.
        // They are inserted before our default handler.
        var packageAndAppHandlers = createExpressApp();
        app.use(packageAndAppHandlers);
        let suppressExpressErrors = false;
        // Express knows it is an error handler because it has 4 arguments instead of
        // 3. go figure.  (It is not smart enough to find such a thing if it's hidden
        // inside packageAndAppHandlers.)
        app.use(function(err, req, res, next) {
            if (!err || !suppressExpressErrors || !req.headers['x-suppress-error']) {
                next(err);
                return;
            }
            res.writeHead(err.status, {
                'Content-Type': 'text/plain'
            });
            res.end('An error message');
        });
        app.use(function(req, res, next) {
            return _async_to_generator(function*() {
                var _Meteor_settings_packages_webapp, _Meteor_settings_packages;
                if (!appUrl(req.url)) {
                    return next();
                } else if (req.method !== 'HEAD' && req.method !== 'GET' && !((_Meteor_settings_packages = Meteor.settings.packages) === null || _Meteor_settings_packages === void 0 ? void 0 : (_Meteor_settings_packages_webapp = _Meteor_settings_packages.webapp) === null || _Meteor_settings_packages_webapp === void 0 ? void 0 : _Meteor_settings_packages_webapp.alwaysReturnContent)) {
                    const status = req.method === 'OPTIONS' ? 200 : 405;
                    res.writeHead(status, {
                        Allow: 'OPTIONS, GET, HEAD',
                        'Content-Length': '0'
                    });
                    res.end();
                } else {
                    var headers = {
                        'Content-Type': 'text/html; charset=utf-8'
                    };
                    if (shuttingDown) {
                        headers['Connection'] = 'Close';
                    }
                    var request = WebApp.categorizeRequest(req);
                    if (request.url.query && request.url.query['meteor_css_resource']) {
                        // In this case, we're requesting a CSS resource in the meteor-specific
                        // way, but we don't have it.  Serve a static css file that indicates that
                        // we didn't have it, so we can detect that and refresh.  Make sure
                        // that any proxies or CDNs don't cache this error!  (Normally proxies
                        // or CDNs are smart enough not to cache error pages, but in order to
                        // make this hack work, we need to return the CSS file as a 200, which
                        // would otherwise be cached.)
                        headers['Content-Type'] = 'text/css; charset=utf-8';
                        headers['Cache-Control'] = 'no-cache';
                        res.writeHead(200, headers);
                        res.write('.meteor-css-not-found-error { width: 0px;}');
                        res.end();
                        return;
                    }
                    if (request.url.query && request.url.query['meteor_js_resource']) {
                        // Similarly, we're requesting a JS resource that we don't have.
                        // Serve an uncached 404. (We can't use the same hack we use for CSS,
                        // because actually acting on that hack requires us to have the JS
                        // already!)
                        headers['Cache-Control'] = 'no-cache';
                        res.writeHead(404, headers);
                        res.end('404 Not Found');
                        return;
                    }
                    if (request.url.query && request.url.query['meteor_dont_serve_index']) {
                        // When downloading files during a Cordova hot code push, we need
                        // to detect if a file is not available instead of inadvertently
                        // downloading the default index page.
                        // So similar to the situation above, we serve an uncached 404.
                        headers['Cache-Control'] = 'no-cache';
                        res.writeHead(404, headers);
                        res.end('404 Not Found');
                        return;
                    }
                    const { arch } = request;
                    assert.strictEqual(typeof arch, 'string', {
                        arch
                    });
                    if (!hasOwn.call(WebApp.clientPrograms, arch)) {
                        // We could come here in case we run with some architectures excluded
                        headers['Cache-Control'] = 'no-cache';
                        res.writeHead(404, headers);
                        if (Meteor.isDevelopment) {
                            res.end(`No client program found for the ${arch} architecture.`);
                        } else {
                            // Safety net, but this branch should not be possible.
                            res.end('404 Not Found');
                        }
                        return;
                    }
                    // If pauseClient(arch) has been called, program.paused will be a
                    // Promise that will be resolved when the program is unpaused.
                    yield WebApp.clientPrograms[arch].paused;
                    return getBoilerplateAsync(request, arch).then(({ stream, statusCode, headers: newHeaders })=>{
                        if (!statusCode) {
                            statusCode = res.statusCode ? res.statusCode : 200;
                        }
                        if (newHeaders) {
                            Object.assign(headers, newHeaders);
                        }
                        res.writeHead(statusCode, headers);
                        stream.pipe(res, {
                            // End the response when the stream ends.
                            end: true
                        });
                    }).catch((error)=>{
                        Log.error('Error running template: ' + error.stack);
                        res.writeHead(500, headers);
                        res.end();
                    });
                }
            })();
        });
        // Return 404 by default, if no other handlers serve this URL.
        app.use(function(req, res) {
            res.writeHead(404);
            res.end();
        });
        var httpServer = createServer(app);
        var onListeningCallbacks = [];
        // After 5 seconds w/o data on a socket, kill it.  On the other hand, if
        // there's an outstanding request, give it a higher timeout instead (to avoid
        // killing long-polling requests)
        httpServer.setTimeout(SHORT_SOCKET_TIMEOUT);
        // Do this here, and then also in livedata/stream_server.js, because
        // stream_server.js kills all the current request handlers when installing its
        // own.
        httpServer.on('request', WebApp._timeoutAdjustmentRequestCallback);
        // If the client gave us a bad request, tell it instead of just closing the
        // socket. This lets load balancers in front of us differentiate between "a
        // server is randomly closing sockets for no reason" and "client sent a bad
        // request".
        //
        // This will only work on Node 6; Node 4 destroys the socket before calling
        // this event. See https://github.com/nodejs/node/pull/4557/ for details.
        httpServer.on('clientError', (err, socket)=>{
            // Pre-Node-6, do nothing.
            if (socket.destroyed) {
                return;
            }
            if (err.message === 'Parse Error') {
                socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
            } else {
                // For other errors, use the default behavior as if we had no clientError
                // handler.
                socket.destroy(err);
            }
        });
        const suppressErrors = function() {
            suppressExpressErrors = true;
        };
        let warnedAboutConnectUsage = false;
        // start up app
        Object.assign(WebApp, {
            connectHandlers: packageAndAppHandlers,
            handlers: packageAndAppHandlers,
            rawConnectHandlers: rawExpressHandlers,
            rawHandlers: rawExpressHandlers,
            httpServer: httpServer,
            expressApp: app,
            // For testing.
            suppressConnectErrors: ()=>{
                if (!warnedAboutConnectUsage) {
                    Meteor._debug("WebApp.suppressConnectErrors has been renamed to Meteor._suppressExpressErrors and it should be used only in tests.");
                    warnedAboutConnectUsage = true;
                }
                suppressErrors();
            },
            _suppressExpressErrors: suppressErrors,
            onListening: function(f) {
                if (onListeningCallbacks) onListeningCallbacks.push(f);
                else f();
            },
            // This can be overridden by users who want to modify how listening works
            // (eg, to run a proxy like Apollo Engine Proxy in front of the server).
            startListening: function(httpServer, listenOptions, cb) {
                httpServer.listen(listenOptions, cb);
            }
        });
        /**
   * @name main
   * @locus Server
   * @summary Starts the HTTP server.
   *  If `UNIX_SOCKET_PATH` is present Meteor's HTTP server will use that socket file for inter-process communication, instead of TCP.
   * If you choose to not include webapp package in your application this method still must be defined for your Meteor application to work.
   */ // Let the rest of the packages (and Meteor.startup hooks) insert Express
        // middlewares and update __meteor_runtime_config__, then keep going to set up
        // actually serving HTML.
        exports.main = (argv)=>_async_to_generator(function*() {
                yield WebAppInternals.generateBoilerplate();
                const startHttpServer = (listenOptions)=>{
                    WebApp.startListening((argv === null || argv === void 0 ? void 0 : argv.httpServer) || httpServer, listenOptions, Meteor.bindEnvironment(()=>{
                        if (process.env.METEOR_PRINT_ON_LISTEN) {
                            console.log('LISTENING');
                        }
                        const callbacks = onListeningCallbacks;
                        onListeningCallbacks = null;
                        callbacks === null || callbacks === void 0 ? void 0 : callbacks.forEach((callback)=>{
                            callback();
                        });
                    }, (e)=>{
                        console.error('Error listening:', e);
                        console.error(e && e.stack);
                    }));
                };
                let localPort = process.env.PORT || 0;
                let unixSocketPath = process.env.UNIX_SOCKET_PATH;
                if (unixSocketPath) {
                    if (cluster.isWorker) {
                        const workerName = cluster.worker.process.env.name || cluster.worker.id;
                        unixSocketPath += '.' + workerName + '.sock';
                    }
                    // Start the HTTP server using a socket file.
                    removeExistingSocketFile(unixSocketPath);
                    startHttpServer({
                        path: unixSocketPath
                    });
                    const unixSocketPermissions = (process.env.UNIX_SOCKET_PERMISSIONS || '').trim();
                    if (unixSocketPermissions) {
                        if (/^[0-7]{3}$/.test(unixSocketPermissions)) {
                            chmodSync(unixSocketPath, parseInt(unixSocketPermissions, 8));
                        } else {
                            throw new Error('Invalid UNIX_SOCKET_PERMISSIONS specified');
                        }
                    }
                    const unixSocketGroup = (process.env.UNIX_SOCKET_GROUP || '').trim();
                    if (unixSocketGroup) {
                        const unixSocketGroupInfo = getGroupInfo(unixSocketGroup);
                        if (unixSocketGroupInfo === null) {
                            throw new Error('Invalid UNIX_SOCKET_GROUP name specified');
                        }
                        chownSync(unixSocketPath, userInfo().uid, unixSocketGroupInfo.gid);
                    }
                    registerSocketFileCleanup(unixSocketPath);
                } else {
                    localPort = isNaN(Number(localPort)) ? localPort : Number(localPort);
                    if (/\\\\?.+\\pipe\\?.+/.test(localPort)) {
                        // Start the HTTP server using Windows Server style named pipe.
                        startHttpServer({
                            path: localPort
                        });
                    } else if (typeof localPort === 'number') {
                        // Start the HTTP server using TCP.
                        startHttpServer({
                            port: localPort,
                            host: process.env.BIND_IP || '0.0.0.0'
                        });
                    } else {
                        throw new Error('Invalid PORT specified');
                    }
                }
                return 'DAEMON';
            })();
    })();
}
const isGetentAvailable = ()=>{
    try {
        execSync('which getent');
        return true;
    } catch (e) {
        return false;
    }
};
const getGroupInfoUsingGetent = (groupName)=>{
    try {
        const stdout = execSync(`getent group ${groupName}`, {
            encoding: 'utf8'
        });
        if (!stdout) return null;
        const [name, , gid] = stdout.trim().split(':');
        if (name == null || gid == null) return null;
        return {
            name,
            gid: Number(gid)
        };
    } catch (error) {
        return null;
    }
};
const getGroupInfoFromFile = (groupName)=>{
    try {
        const data = readFileSync('/etc/group', 'utf8');
        const groupLine = data.trim().split('\n').find((line)=>line.startsWith(`${groupName}:`));
        if (!groupLine) return null;
        const [name, , gid] = groupLine.trim().split(':');
        if (name == null || gid == null) return null;
        return {
            name,
            gid: Number(gid)
        };
    } catch (error) {
        return null;
    }
};
const getGroupInfo = (groupName)=>{
    let groupInfo = getGroupInfoFromFile(groupName);
    if (!groupInfo && isGetentAvailable()) {
        groupInfo = getGroupInfoUsingGetent(groupName);
    }
    return groupInfo;
};
var inlineScriptsAllowed = true;
WebAppInternals.inlineScriptsAllowed = function() {
    return inlineScriptsAllowed;
};
WebAppInternals.setInlineScriptsAllowed = function(value) {
    return _async_to_generator(function*() {
        inlineScriptsAllowed = value;
        yield WebAppInternals.generateBoilerplate();
    })();
};
var sriMode;
WebAppInternals.enableSubresourceIntegrity = function(use_credentials = false) {
    return _async_to_generator(function*() {
        sriMode = use_credentials ? 'use-credentials' : 'anonymous';
        yield WebAppInternals.generateBoilerplate();
    })();
};
WebAppInternals.setBundledJsCssUrlRewriteHook = function(hookFn) {
    return _async_to_generator(function*() {
        bundledJsCssUrlRewriteHook = hookFn;
        yield WebAppInternals.generateBoilerplate();
    })();
};
WebAppInternals.setBundledJsCssPrefix = function(prefix) {
    return _async_to_generator(function*() {
        var self = this;
        yield self.setBundledJsCssUrlRewriteHook(function(url) {
            return prefix + url;
        });
    }).call(this);
};
// Packages can call `WebAppInternals.addStaticJs` to specify static
// JavaScript to be included in the app. This static JS will be inlined,
// unless inline scripts have been disabled, in which case it will be
// served under `/<sha1 of contents>`.
var additionalStaticJs = {};
WebAppInternals.addStaticJs = function(contents) {
    additionalStaticJs['/' + sha1(contents) + '.js'] = contents;
};
// Exported for tests
WebAppInternals.getBoilerplate = getBoilerplate;
WebAppInternals.additionalStaticJs = additionalStaticJs;
await runWebAppServer();
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: true });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"socket_file.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/webapp/socket_file.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({removeExistingSocketFile:()=>removeExistingSocketFile,registerSocketFileCleanup:()=>registerSocketFileCleanup},true);let statSync,unlinkSync,existsSync;module.link('fs',{statSync(v){statSync=v},unlinkSync(v){unlinkSync=v},existsSync(v){existsSync=v}},0);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
// Since a new socket file will be created when the HTTP server
// starts up, if found remove the existing file.
//
// WARNING:
// This will remove the configured socket file without warning. If
// the configured socket file is already in use by another application,
// it will still be removed. Node does not provide a reliable way to
// differentiate between a socket file that is already in use by
// another application or a stale socket file that has been
// left over after a SIGKILL. Since we have no reliable way to
// differentiate between these two scenarios, the best course of
// action during startup is to remove any existing socket file. This
// is not the safest course of action as removing the existing socket
// file could impact an application using it, but this approach helps
// ensure the HTTP server can startup without manual
// intervention (e.g. asking for the verification and cleanup of socket
// files before allowing the HTTP server to be started).
//
// The above being said, as long as the socket file path is
// configured carefully when the application is deployed (and extra
// care is taken to make sure the configured path is unique and doesn't
// conflict with another socket file path), then there should not be
// any issues with this approach.
const removeExistingSocketFile = (socketPath)=>{
    try {
        if (statSync(socketPath).isSocket()) {
            // Since a new socket file will be created, remove the existing
            // file.
            unlinkSync(socketPath);
        } else {
            throw new Error(`An existing file was found at "${socketPath}" and it is not ` + 'a socket file. Please confirm PORT is pointing to valid and ' + 'un-used socket file path.');
        }
    } catch (error) {
        // If there is no existing socket file to cleanup, great, we'll
        // continue normally. If the caught exception represents any other
        // issue, re-throw.
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
};
// Remove the socket file when done to avoid leaving behind a stale one.
// Note - a stale socket file is still left behind if the running node
// process is killed via signal 9 - SIGKILL.
const registerSocketFileCleanup = (socketPath, eventEmitter = process)=>{
    [
        'exit',
        'SIGINT',
        'SIGHUP',
        'SIGTERM'
    ].forEach((signal)=>{
        eventEmitter.on(signal, Meteor.bindEnvironment(()=>{
            if (existsSync(socketPath)) {
                unlinkSync(socketPath);
            }
        }));
    });
};
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"express":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/express/package.json                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "express",
  "version": "5.1.0"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/express/index.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"compression":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/compression/package.json                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "compression",
  "version": "1.7.4"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/compression/index.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"cookie-parser":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/cookie-parser/package.json                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "cookie-parser",
  "version": "1.4.6"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/cookie-parser/index.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"qs":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/qs/package.json                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "qs",
  "version": "6.13.0",
  "main": "lib/index.js"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/qs/lib/index.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"parseurl":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/parseurl/package.json                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "parseurl",
  "version": "1.3.3"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/parseurl/index.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"useragent-ng":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/useragent-ng/package.json                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "useragent-ng",
  "version": "2.4.4",
  "main": "./index.js"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/useragent-ng/index.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"send":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/send/package.json                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "send",
  "version": "1.1.0"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/send/index.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});


/* Exports */
return {
  export: function () { return {
      WebApp: WebApp,
      WebAppInternals: WebAppInternals,
      main: main
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/webapp/webapp_server.js"
  ],
  mainModulePath: "/node_modules/meteor/webapp/webapp_server.js"
}});

//# sourceURL=meteor://💻app/packages/webapp.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvd2ViYXBwL3dlYmFwcF9zZXJ2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3dlYmFwcC9zb2NrZXRfZmlsZS5qcyJdLCJuYW1lcyI6WyJTSE9SVF9TT0NLRVRfVElNRU9VVCIsIkxPTkdfU09DS0VUX1RJTUVPVVQiLCJjcmVhdGVFeHByZXNzQXBwIiwiYXBwIiwiZXhwcmVzcyIsInNldCIsInFzIiwicGFyc2UiLCJXZWJBcHAiLCJXZWJBcHBJbnRlcm5hbHMiLCJoYXNPd24iLCJPYmplY3QiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsIk5wbU1vZHVsZXMiLCJ2ZXJzaW9uIiwiTnBtIiwicmVxdWlyZSIsIm1vZHVsZSIsImRlZmF1bHRBcmNoIiwiY2xpZW50UHJvZ3JhbXMiLCJhcmNoUGF0aCIsImJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rIiwidXJsIiwiYnVuZGxlZFByZWZpeCIsIl9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18iLCJST09UX1VSTF9QQVRIX1BSRUZJWCIsInNoYTEiLCJjb250ZW50cyIsImhhc2giLCJjcmVhdGVIYXNoIiwidXBkYXRlIiwiZGlnZXN0Iiwic2hvdWxkQ29tcHJlc3MiLCJyZXEiLCJyZXMiLCJoZWFkZXJzIiwiY29tcHJlc3MiLCJmaWx0ZXIiLCJjYW1lbENhc2UiLCJuYW1lIiwicGFydHMiLCJzcGxpdCIsInRvTG93ZXJDYXNlIiwiaSIsImxlbmd0aCIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwic3Vic3RyaW5nIiwiam9pbiIsImlkZW50aWZ5QnJvd3NlciIsInVzZXJBZ2VudFN0cmluZyIsIm1ham9yIiwibWlub3IiLCJwYXRjaCIsInVzZXJBZ2VudCIsImxvb2t1cFVzZXJBZ2VudCIsImZhbWlseSIsImNhdGVnb3JpemVSZXF1ZXN0IiwiYnJvd3NlciIsImFyY2giLCJtb2Rlcm4iLCJpc01vZGVybiIsInBhdGgiLCJwYXRobmFtZSIsInBhcnNlUmVxdWVzdCIsImNhdGVnb3JpemVkIiwicGFyc2VVcmwiLCJkeW5hbWljSGVhZCIsImR5bmFtaWNCb2R5IiwiY29va2llcyIsInBhdGhQYXJ0cyIsImFyY2hLZXkiLCJzdGFydHNXaXRoIiwiYXJjaENsZWFuZWQiLCJzbGljZSIsImNhbGwiLCJzcGxpY2UiLCJhc3NpZ24iLCJwcmVmZXJyZWRBcmNoT3JkZXIiLCJodG1sQXR0cmlidXRlSG9va3MiLCJnZXRIdG1sQXR0cmlidXRlcyIsInJlcXVlc3QiLCJjb21iaW5lZEF0dHJpYnV0ZXMiLCJmb3JFYWNoIiwiaG9vayIsImF0dHJpYnV0ZXMiLCJFcnJvciIsImFkZEh0bWxBdHRyaWJ1dGVIb29rIiwicHVzaCIsImFwcFVybCIsIlJvdXRlUG9saWN5IiwiY2xhc3NpZnkiLCJNZXRlb3IiLCJzdGFydHVwIiwiZ2V0dGVyIiwia2V5IiwicHJvZ3JhbSIsInZhbHVlIiwiY2FsY3VsYXRlQ2xpZW50SGFzaCIsImNsaWVudEhhc2giLCJjYWxjdWxhdGVDbGllbnRIYXNoUmVmcmVzaGFibGUiLCJjYWxjdWxhdGVDbGllbnRIYXNoTm9uUmVmcmVzaGFibGUiLCJjYWxjdWxhdGVDbGllbnRIYXNoUmVwbGFjZWFibGUiLCJnZXRSZWZyZXNoYWJsZUFzc2V0cyIsIl90aW1lb3V0QWRqdXN0bWVudFJlcXVlc3RDYWxsYmFjayIsInNldFRpbWVvdXQiLCJmaW5pc2hMaXN0ZW5lcnMiLCJsaXN0ZW5lcnMiLCJyZW1vdmVBbGxMaXN0ZW5lcnMiLCJvbiIsInZhbHVlcyIsImwiLCJib2lsZXJwbGF0ZUJ5QXJjaCIsImJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrcyIsImNyZWF0ZSIsInJlZ2lzdGVyQm9pbGVycGxhdGVEYXRhQ2FsbGJhY2siLCJjYWxsYmFjayIsInByZXZpb3VzQ2FsbGJhY2siLCJhc3NlcnQiLCJzdHJpY3RFcXVhbCIsImdldEJvaWxlcnBsYXRlIiwiZ2V0Qm9pbGVycGxhdGVBc3luYyIsImVuY29kZVJ1bnRpbWVDb25maWciLCJydGltZUNvbmZpZyIsIkpTT04iLCJzdHJpbmdpZnkiLCJlbmNvZGVVUklDb21wb25lbnQiLCJkZWNvZGVSdW50aW1lQ29uZmlnIiwicnRpbWVDb25maWdTdHIiLCJkZWNvZGVVUklDb21wb25lbnQiLCJydW50aW1lQ29uZmlnIiwiaG9va3MiLCJIb29rIiwidXBkYXRlSG9va3MiLCJpc1VwZGF0ZWRCeUFyY2giLCJhZGRSdW50aW1lQ29uZmlnSG9vayIsInJlZ2lzdGVyIiwiYm9pbGVycGxhdGUiLCJmb3JFYWNoQXN5bmMiLCJtZXRlb3JSdW50aW1lQ29uZmlnIiwiZW5jb2RlZEN1cnJlbnRDb25maWciLCJiYXNlRGF0YSIsInVwZGF0ZWQiLCJkYXRhIiwiaHRtbEF0dHJpYnV0ZXMiLCJtYWRlQ2hhbmdlcyIsInByb21pc2UiLCJQcm9taXNlIiwicmVzb2x2ZSIsImtleXMiLCJ0aGVuIiwicmVzdWx0Iiwic3RyZWFtIiwidG9IVE1MU3RyZWFtIiwic3RhdHVzQ29kZSIsImFkZFVwZGF0ZWROb3RpZnlIb29rIiwiaGFuZGxlciIsImdlbmVyYXRlQm9pbGVycGxhdGVJbnN0YW5jZSIsIm1hbmlmZXN0IiwiYWRkaXRpb25hbE9wdGlvbnMiLCJydW50aW1lQ29uZmlnT3ZlcnJpZGVzIiwiY2IiLCJCb2lsZXJwbGF0ZSIsInBhdGhNYXBwZXIiLCJpdGVtUGF0aCIsInBhdGhKb2luIiwiYmFzZURhdGFFeHRlbnNpb24iLCJhZGRpdGlvbmFsU3RhdGljSnMiLCJlbnRyaWVzIiwibWFwIiwibWV0ZW9yUnVudGltZUhhc2giLCJyb290VXJsUGF0aFByZWZpeCIsInNyaU1vZGUiLCJpbmxpbmVTY3JpcHRzQWxsb3dlZCIsImlubGluZSIsInN0YXRpY0ZpbGVzTWlkZGxld2FyZSIsInN0YXRpY0ZpbGVzQnlBcmNoIiwibmV4dCIsImUiLCJzZXJ2ZVN0YXRpY0pzIiwicyIsIm1ldGhvZCIsInNldHRpbmdzIiwicGFja2FnZXMiLCJ3ZWJhcHAiLCJhbHdheXNSZXR1cm5Db250ZW50Iiwid3JpdGVIZWFkIiwiQnVmZmVyIiwiYnl0ZUxlbmd0aCIsIndyaXRlIiwiZW5kIiwic3RhdHVzIiwiQWxsb3ciLCJwYXVzZWQiLCJpbmZvIiwiZ2V0U3RhdGljRmlsZUluZm8iLCJtYXhBZ2UiLCJjYWNoZWFibGUiLCJzZXRIZWFkZXIiLCJzb3VyY2VNYXBVcmwiLCJ0eXBlIiwiY29udGVudCIsInNlbmQiLCJhYnNvbHV0ZVBhdGgiLCJtYXhhZ2UiLCJkb3RmaWxlcyIsImxhc3RNb2RpZmllZCIsImVyciIsIkxvZyIsImVycm9yIiwicGlwZSIsIm9yaWdpbmFsUGF0aCIsInN0YXRpY0FyY2hMaXN0IiwiYXJjaEluZGV4IiwiaW5kZXhPZiIsInVuc2hpZnQiLCJzb21lIiwic3RhdGljRmlsZXMiLCJmaW5hbGl6ZSIsInBhcnNlUG9ydCIsInBvcnQiLCJwYXJzZWRQb3J0IiwicGFyc2VJbnQiLCJOdW1iZXIiLCJpc05hTiIsIm9uTWVzc2FnZSIsInBhdXNlQ2xpZW50IiwiZ2VuZXJhdGVDbGllbnRQcm9ncmFtIiwicnVuV2ViQXBwU2VydmVyIiwic2h1dHRpbmdEb3duIiwic3luY1F1ZXVlIiwiX0FzeW5jaHJvbm91c1F1ZXVlIiwiZ2V0SXRlbVBhdGhuYW1lIiwiaXRlbVVybCIsInJlbG9hZENsaWVudFByb2dyYW1zIiwicnVuVGFzayIsImNvbmZpZ0pzb24iLCJfX21ldGVvcl9ib290c3RyYXBfXyIsImNsaWVudEFyY2hzIiwiY2xpZW50UGF0aHMiLCJzdGFjayIsInByb2Nlc3MiLCJleGl0IiwidW5wYXVzZSIsImNsaWVudERpciIsInBhdGhEaXJuYW1lIiwic2VydmVyRGlyIiwicHJvZ3JhbUpzb25QYXRoIiwicHJvZ3JhbUpzb24iLCJyZWFkRmlsZVN5bmMiLCJjb2RlIiwiZm9ybWF0IiwiaXRlbSIsIndoZXJlIiwic291cmNlTWFwIiwiUFVCTElDX1NFVFRJTkdTIiwiY29uZmlnT3ZlcnJpZGVzIiwib2xkUHJvZ3JhbSIsIm5ld1Byb2dyYW0iLCJXZWJBcHBIYXNoaW5nIiwidmVyc2lvblJlZnJlc2hhYmxlIiwidmVyc2lvbk5vblJlZnJlc2hhYmxlIiwicmVwbGFjZWFibGUiLCJ2ZXJzaW9uUmVwbGFjZWFibGUiLCJfdHlwZSIsImNvcmRvdmFDb21wYXRpYmlsaXR5VmVyc2lvbnMiLCJobXJWZXJzaW9uIiwibWFuaWZlc3RVcmxQcmVmaXgiLCJyZXBsYWNlIiwibWFuaWZlc3RVcmwiLCJQYWNrYWdlIiwiYXV0b3VwZGF0ZSIsIkFVVE9VUERBVEVfVkVSU0lPTiIsIkF1dG91cGRhdGUiLCJhdXRvdXBkYXRlVmVyc2lvbiIsImVudiIsImdlbmVyYXRlQm9pbGVycGxhdGVGb3JBcmNoIiwiZGVmYXVsdE9wdGlvbnNGb3JBcmNoIiwiRERQX0RFRkFVTFRfQ09OTkVDVElPTl9VUkwiLCJNT0JJTEVfRERQX1VSTCIsImFic29sdXRlVXJsIiwiUk9PVF9VUkwiLCJNT0JJTEVfUk9PVF9VUkwiLCJnZW5lcmF0ZUJvaWxlcnBsYXRlIiwicmVmcmVzaGFibGVBc3NldHMiLCJjc3MiLCJmaWxlIiwicmF3RXhwcmVzc0hhbmRsZXJzIiwidXNlIiwiY29va2llUGFyc2VyIiwiaXNWYWxpZFVybCIsImdldFBhdGhQYXJ0cyIsInNoaWZ0IiwiaXNQcmVmaXhPZiIsInByZWZpeCIsImFycmF5IiwiZXZlcnkiLCJwYXJ0IiwicmVzcG9uc2UiLCJwYXRoUHJlZml4Iiwic2VhcmNoIiwicHJlZml4UGFydHMiLCJtZXRlb3JJbnRlcm5hbEhhbmRsZXJzIiwicGFja2FnZUFuZEFwcEhhbmRsZXJzIiwic3VwcHJlc3NFeHByZXNzRXJyb3JzIiwicXVlcnkiLCJpc0RldmVsb3BtZW50IiwibmV3SGVhZGVycyIsImNhdGNoIiwiaHR0cFNlcnZlciIsImNyZWF0ZVNlcnZlciIsIm9uTGlzdGVuaW5nQ2FsbGJhY2tzIiwic29ja2V0IiwiZGVzdHJveWVkIiwibWVzc2FnZSIsImRlc3Ryb3kiLCJzdXBwcmVzc0Vycm9ycyIsIndhcm5lZEFib3V0Q29ubmVjdFVzYWdlIiwiY29ubmVjdEhhbmRsZXJzIiwiaGFuZGxlcnMiLCJyYXdDb25uZWN0SGFuZGxlcnMiLCJyYXdIYW5kbGVycyIsImV4cHJlc3NBcHAiLCJzdXBwcmVzc0Nvbm5lY3RFcnJvcnMiLCJfZGVidWciLCJfc3VwcHJlc3NFeHByZXNzRXJyb3JzIiwib25MaXN0ZW5pbmciLCJmIiwic3RhcnRMaXN0ZW5pbmciLCJsaXN0ZW5PcHRpb25zIiwibGlzdGVuIiwiZXhwb3J0cyIsIm1haW4iLCJhcmd2Iiwic3RhcnRIdHRwU2VydmVyIiwiYmluZEVudmlyb25tZW50IiwiTUVURU9SX1BSSU5UX09OX0xJU1RFTiIsImNvbnNvbGUiLCJsb2ciLCJjYWxsYmFja3MiLCJsb2NhbFBvcnQiLCJQT1JUIiwidW5peFNvY2tldFBhdGgiLCJVTklYX1NPQ0tFVF9QQVRIIiwiY2x1c3RlciIsImlzV29ya2VyIiwid29ya2VyTmFtZSIsIndvcmtlciIsImlkIiwicmVtb3ZlRXhpc3RpbmdTb2NrZXRGaWxlIiwidW5peFNvY2tldFBlcm1pc3Npb25zIiwiVU5JWF9TT0NLRVRfUEVSTUlTU0lPTlMiLCJ0cmltIiwidGVzdCIsImNobW9kU3luYyIsInVuaXhTb2NrZXRHcm91cCIsIlVOSVhfU09DS0VUX0dST1VQIiwidW5peFNvY2tldEdyb3VwSW5mbyIsImdldEdyb3VwSW5mbyIsImNob3duU3luYyIsInVzZXJJbmZvIiwidWlkIiwiZ2lkIiwicmVnaXN0ZXJTb2NrZXRGaWxlQ2xlYW51cCIsImhvc3QiLCJCSU5EX0lQIiwiaXNHZXRlbnRBdmFpbGFibGUiLCJleGVjU3luYyIsImdldEdyb3VwSW5mb1VzaW5nR2V0ZW50IiwiZ3JvdXBOYW1lIiwic3Rkb3V0IiwiZW5jb2RpbmciLCJnZXRHcm91cEluZm9Gcm9tRmlsZSIsImdyb3VwTGluZSIsImZpbmQiLCJsaW5lIiwiZ3JvdXBJbmZvIiwic2V0SW5saW5lU2NyaXB0c0FsbG93ZWQiLCJlbmFibGVTdWJyZXNvdXJjZUludGVncml0eSIsInVzZV9jcmVkZW50aWFscyIsInNldEJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rIiwiaG9va0ZuIiwic2V0QnVuZGxlZEpzQ3NzUHJlZml4Iiwic2VsZiIsImFkZFN0YXRpY0pzIiwic3RhdFN5bmMiLCJ1bmxpbmtTeW5jIiwiZXhpc3RzU3luYyIsInNvY2tldFBhdGgiLCJpc1NvY2tldCIsImV2ZW50RW1pdHRlciIsInNpZ25hbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQTRCO0FBQzRCO0FBQ3BCO0FBQ047QUFDa0M7QUFDeEI7QUFDSjtBQUNOO0FBQ0s7QUFDTTtBQUNyQjtBQUNnQjtBQUNxQjtBQUNQO0FBQzFCO0FBSUU7QUFDSTtBQUNXO0FBRXpDLElBQUlBLHVCQUF1QixJQUFJO0FBQy9CLElBQUlDLHNCQUFzQixNQUFNO0FBRWhDLE1BQU1DLG1CQUFtQjtJQUN2QixNQUFNQyxNQUFNQztJQUNaLGtDQUFrQztJQUNsQywyRkFBMkY7SUFDM0ZELElBQUlFLEdBQUcsQ0FBQyxnQkFBZ0I7SUFDeEJGLElBQUlFLEdBQUcsQ0FBQyxRQUFRO0lBQ2hCRixJQUFJRSxHQUFHLENBQUMsZ0JBQWdCQyxHQUFHQyxLQUFLO0lBQ2hDLE9BQU9KO0FBQ1Q7QUFDQSxPQUFPLE1BQU1LLEtBQVk7QUFDekIsT0FBTyxNQUFNQyxjQUFxQjtBQUVsQyxNQUFNQyxTQUFTQyxPQUFPQyxTQUFTLENBQUNDLGNBQWM7QUFHOUNKLGdCQUFnQkssVUFBVSxHQUFHO0lBQzNCVixTQUFVO1FBQ1JXLFNBQVNDLElBQUlDLE9BQU8sQ0FBQyx3QkFBd0JGLE9BQU87UUFDcERHLFFBQVFkO0lBQ1Y7QUFDRjtBQUVBLHlDQUF5QztBQUN6Q0ksT0FBT0osT0FBTyxHQUFHQTtBQUVqQixvRUFBb0U7QUFDcEUsK0RBQStEO0FBQy9ESSxPQUFPVyxXQUFXLEdBQUc7QUFFckIsOEJBQThCO0FBQzlCWCxPQUFPWSxjQUFjLEdBQUcsQ0FBQztBQUV6QiwrQ0FBK0M7QUFDL0MsSUFBSUMsV0FBVyxDQUFDO0FBRWhCLElBQUlDLDZCQUE2QixTQUFTQyxHQUFHO0lBQzNDLElBQUlDLGdCQUFnQkMsMEJBQTBCQyxvQkFBb0IsSUFBSTtJQUN0RSxPQUFPRixnQkFBZ0JEO0FB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LCtEQUErRDtZQUMvRCxRQUFRO1lBQ1JILFdBQVdFO1FBQ2IsT0FBTztZQUNMLE1BQU0sSUFBSTlTLE1BQ1IsQ0FBQywrQkFBK0IsRUFBRThTLFdBQVcsZ0JBQWdCLENBQUMsR0FDOUQsaUVBQ0E7UUFFSjtJQUNGLEVBQUUsT0FBT25MLE9BQU87UUFDZCwrREFBK0Q7UUFDL0Qsa0VBQWtFO1FBQ2xFLG1CQUFtQjtRQUNuQixJQUFJQSxNQUFNeUMsSUFBSSxLQUFLLFVBQVU7WUFDM0IsTUFBTXpDO1FBQ1I7SUFDRjtBQUNGLEVBQUU7QUFFRix3RUFBd0U7QUFDeEUsc0VBQXNFO0FBQ3RFLDRDQUE0QztBQUM1QyxPQUFPLE1BQU0wSiw0QkFDWCxDQUFDeUIsWUFBWUUsZUFBZXJKLElBQU87SUFDakM7UUFBQztRQUFRO1FBQVU7UUFBVTtLQUFVLENBQUM5SixPQUFPLENBQUNvVDtRQUM5Q0QsYUFBYXpSLEVBQUUsQ0FBQzBSLFFBQVEzUyxPQUFPbVAsZUFBZSxDQUFDO1lBQzdDLElBQUlvRCxXQUFXQyxhQUFhO2dCQUMxQkYsV0FBV0U7WUFDYjtRQUNGO0lBQ0Y7QUFDRixFQUFFIiwiZmlsZSI6Ii9wYWNrYWdlcy93ZWJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXNzZXJ0IGZyb20gJ2Fzc2VydCc7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMsIGNobW9kU3luYywgY2hvd25TeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgY3JlYXRlU2VydmVyIH0gZnJvbSAnaHR0cCc7XG5pbXBvcnQgeyB1c2VySW5mbyB9IGZyb20gJ29zJztcbmltcG9ydCB7IGpvaW4gYXMgcGF0aEpvaW4sIGRpcm5hbWUgYXMgcGF0aERpcm5hbWUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IHBhcnNlIGFzIHBhcnNlVXJsIH0gZnJvbSAndXJsJztcbmltcG9ydCB7IGNyZWF0ZUhhc2ggfSBmcm9tICdjcnlwdG8nO1xuaW1wb3J0IGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgY29tcHJlc3MgZnJvbSAnY29tcHJlc3Npb24nO1xuaW1wb3J0IGNvb2tpZVBhcnNlciBmcm9tICdjb29raWUtcGFyc2VyJztcbmltcG9ydCBxcyBmcm9tICdxcyc7XG5pbXBvcnQgcGFyc2VSZXF1ZXN0IGZyb20gJ3BhcnNldXJsJztcbmltcG9ydCB7IGxvb2t1cCBhcyBsb29rdXBVc2VyQWdlbnQgfSBmcm9tICd1c2VyYWdlbnQtbmcnO1xuaW1wb3J0IHsgaXNNb2Rlcm4gfSBmcm9tICdtZXRlb3IvbW9kZXJuLWJyb3dzZXJzJztcbmltcG9ydCBzZW5kIGZyb20gJ3NlbmQnO1xuaW1wb3J0IHtcbiAgcmVtb3ZlRXhpc3RpbmdTb2NrZXRGaWxlLFxuICByZWdpc3RlclNvY2tldEZpbGVDbGVhbnVwLFxufSBmcm9tICcuL3NvY2tldF9maWxlLmpzJztcbmltcG9ydCBjbHVzdGVyIGZyb20gJ2NsdXN0ZXInO1xuaW1wb3J0IHsgZXhlY1N5bmMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcblxudmFyIFNIT1JUX1NPQ0tFVF9USU1FT1VUID0gNSAqIDEwMDA7XG52YXIgTE9OR19TT0NLRVRfVElNRU9VVCA9IDEyMCAqIDEwMDA7XG5cbmNvbnN0IGNyZWF0ZUV4cHJlc3NBcHAgPSAoKSA9PiB7XG4gIGNvbnN0IGFwcCA9IGV4cHJlc3MoKTtcbiAgLy8gU2VjdXJpdHkgYW5kIHBlcmZvcm1hY2UgaGVhZGVyc1xuICAvLyB0aGVzZSBoZWFkZXJzIGNvbWUgZnJvbSB0aGVzZSBkb2NzOiBodHRwczovL2V4cHJlc3Nqcy5jb20vZW4vYXBpLmh0bWwjYXBwLnNldHRpbmdzLnRhYmxlXG4gIGFwcC5zZXQoJ3gtcG93ZXJlZC1ieScsIGZhbHNlKTtcbiAgYXBwLnNldCgnZXRhZycsIGZhbHNlKTtcbiAgYXBwLnNldCgncXVlcnkgcGFyc2VyJywgcXMucGFyc2UpO1xuICByZXR1cm4gYXBwO1xufVxuZXhwb3J0IGNvbnN0IFdlYkFwcCA9IHt9O1xuZXhwb3J0IGNvbnN0IFdlYkFwcEludGVybmFscyA9IHt9O1xuXG5jb25zdCBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG5cbldlYkFwcEludGVybmFscy5OcG1Nb2R1bGVzID0ge1xuICBleHByZXNzIDoge1xuICAgIHZlcnNpb246IE5wbS5yZXF1aXJlKCdleHByZXNzL3BhY2thZ2UuanNvbicpLnZlcnNpb24sXG4gICAgbW9kdWxlOiBleHByZXNzLFxuICB9XG59O1xuXG4vLyBNb3JlIG9mIGEgY29udmVuaWVuY2UgZm9yIHRoZSBlbmQgdXNlclxuV2ViQXBwLmV4cHJlc3MgPSBleHByZXNzO1xuXG4vLyBUaG91Z2ggd2UgbWlnaHQgcHJlZmVyIHRvIHVzZSB3ZWIuYnJvd3NlciAobW9kZXJuKSBhcyB0aGUgZGVmYXVsdFxuLy8gYXJjaGl0ZWN0dXJlLCBzYWZldHkgcmVxdWlyZXMgYSBtb3JlIGNvbXBhdGlibGUgZGVmYXVsdEFyY2guXG5XZWJBcHAuZGVmYXVsdEFyY2ggPSAnd2ViLmJyb3dzZXIubGVnYWN5JztcblxuLy8gWFhYIG1hcHMgYXJjaHMgdG8gbWFuaWZlc3RzXG5XZWJBcHAuY2xpZW50UHJvZ3JhbXMgPSB7fTtcblxuLy8gWFhYIG1hcHMgYXJjaHMgdG8gcHJvZ3JhbSBwYXRoIG9uIGZpbGVzeXN0ZW1cbnZhciBhcmNoUGF0aCA9IHt9O1xuXG52YXIgYnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2sgPSBmdW5jdGlvbih1cmwpIHtcbiAgdmFyIGJ1bmRsZWRQcmVmaXggPSBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYIHx8ICcnO1xuICByZXR1cm4gYnVuZGxlZFByZWZpeCArIHVybDtcbn07XG5cbnZhciBzaGExID0gZnVuY3Rpb24oY29udGVudHMpIHtcbiAgdmFyIGhhc2ggPSBjcmVhdGVIYXNoKCdzaGExJyk7XG4gIGhhc2gudXBkYXRlKGNvbnRlbnRzKTtcbiAgcmV0dXJuIGhhc2guZGlnZXN0KCdoZXgnKTtcbn07XG5cbmZ1bmN0aW9uIHNob3VsZENvbXByZXNzKHJlcSwgcmVzKSB7XG4gIGlmIChyZXEuaGVhZGVyc1sneC1uby1jb21wcmVzc2lvbiddKSB7XG4gICAgLy8gZG9uJ3QgY29tcHJlc3MgcmVzcG9uc2VzIHdpdGggdGhpcyByZXF1ZXN0IGhlYWRlclxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIGZhbGxiYWNrIHRvIHN0YW5kYXJkIGZpbHRlciBmdW5jdGlvblxuICByZXR1cm4gY29tcHJlc3MuZmlsdGVyKHJlcSwgcmVzKTtcbn1cblxuLy8gI0Jyb3dzZXJJZGVudGlmaWNhdGlvblxuLy9cbi8vIFdlIGhhdmUgbXVsdGlwbGUgcGxhY2VzIHRoYXQgd2FudCB0byBpZGVudGlmeSB0aGUgYnJvd3NlcjogdGhlXG4vLyB1bnN1cHBvcnRlZCBicm93c2VyIHBhZ2UsIHRoZSBhcHBjYWNoZSBwYWNrYWdlLCBhbmQsIGV2ZW50dWFsbHlcbi8vIGRlbGl2ZXJpbmcgYnJvd3NlciBwb2x5ZmlsbHMgb25seSBhcyBuZWVkZWQuXG4vL1xuLy8gVG8gYXZvaWQgZGV0ZWN0aW5nIHRoZSBicm93c2VyIGluIG11bHRpcGxlIHBsYWNlcyBhZC1ob2MsIHdlIGNyZWF0ZSBhXG4vLyBNZXRlb3IgXCJicm93c2VyXCIgb2JqZWN0LiBJdCB1c2VzIGJ1dCBkb2VzIG5vdCBleHBvc2UgdGhlIG5wbVxuLy8gdXNlcmFnZW50IG1vZHVsZSAod2UgY291bGQgY2hvb3NlIGEgZGlmZmVyZW50IG1lY2hhbmlzbSB0byBpZGVudGlmeVxuLy8gdGhlIGJyb3dzZXIgaW4gdGhlIGZ1dHVyZSBpZiB3ZSB3YW50ZWQgdG8pLiAgVGhlIGJyb3dzZXIgb2JqZWN0XG4vLyBjb250YWluc1xuLy9cbi8vICogYG5hbWVgOiB0aGUgbmFtZSBvZiB0aGUgYnJvd3NlciBpbiBjYW1lbCBjYXNlXG4vLyAqIGBtYWpvcmAsIGBtaW5vcmAsIGBwYXRjaGA6IGludGVnZXJzIGRlc2NyaWJpbmcgdGhlIGJyb3dzZXIgdmVyc2lvblxuLy9cbi8vIEFsc28gaGVyZSBpcyBhbiBlYXJseSB2ZXJzaW9uIG9mIGEgTWV0ZW9yIGByZXF1ZXN0YCBvYmplY3QsIGludGVuZGVkXG4vLyB0byBiZSBhIGhpZ2gtbGV2ZWwgZGVzY3JpcHRpb24gb2YgdGhlIHJlcXVlc3Qgd2l0aG91dCBleHBvc2luZ1xuLy8gZGV0YWlscyBvZiBFeHByZXNzJ3MgbG93LWxldmVsIGByZXFgLiAgQ3VycmVudGx5IGl0IGNvbnRhaW5zOlxuLy9cbi8vICogYGJyb3dzZXJgOiBicm93c2VyIGlkZW50aWZpY2F0aW9uIG9iamVjdCBkZXNjcmliZWQgYWJvdmVcbi8vICogYHVybGA6IHBhcnNlZCB1cmwsIGluY2x1ZGluZyBwYXJzZWQgcXVlcnkgcGFyYW1zXG4vL1xuLy8gQXMgYSB0ZW1wb3JhcnkgaGFjayB0aGVyZSBpcyBhIGBjYXRlZ29yaXplUmVxdWVzdGAgZnVuY3Rpb24gb24gV2ViQXBwIHdoaWNoXG4vLyBjb252ZXJ0cyBhIEV4cHJlc3MgYHJlcWAgdG8gYSBNZXRlb3IgYHJlcXVlc3RgLiBUaGlzIGNhbiBnbyBhd2F5IG9uY2Ugc21hcnRcbi8vIHBhY2thZ2VzIHN1Y2ggYXMgYXBwY2FjaGUgYXJlIGJlaW5nIHBhc3NlZCBhIGByZXF1ZXN0YCBvYmplY3QgZGlyZWN0bHkgd2hlblxuLy8gdGhleSBzZXJ2ZSBjb250ZW50LlxuLy9cbi8vIFRoaXMgYWxsb3dzIGByZXF1ZXN0YCB0byBiZSB1c2VkIHVuaWZvcm1seTogaXQgaXMgcGFzc2VkIHRvIHRoZSBodG1sXG4vLyBhdHRyaWJ1dGVzIGhvb2ssIGFuZCB0aGUgYXBwY2FjaGUgcGFja2FnZSBjYW4gdXNlIGl0IHdoZW4gZGVjaWRpbmdcbi8vIHdoZXRoZXIgdG8gZ2VuZXJhdGUgYSA0MDQgZm9yIHRoZSBtYW5pZmVzdC5cbi8vXG4vLyBSZWFsIHJvdXRpbmcgLyBzZXJ2ZXIgc2lkZSByZW5kZXJpbmcgd2lsbCBwcm9iYWJseSByZWZhY3RvciB0aGlzXG4vLyBoZWF2aWx5LlxuXG4vLyBlLmcuIFwiTW9iaWxlIFNhZmFyaVwiID0+IFwibW9iaWxlU2FmYXJpXCJcbnZhciBjYW1lbENhc2UgPSBmdW5jdGlvbihuYW1lKSB7XG4gIHZhciBwYXJ0cyA9IG5hbWUuc3BsaXQoJyAnKTtcbiAgcGFydHNbMF0gPSBwYXJ0c1swXS50b0xvd2VyQ2FzZSgpO1xuICBmb3IgKHZhciBpID0gMTsgaSA8IHBhcnRzLmxlbmd0aDsgKytpKSB7XG4gICAgcGFydHNbaV0gPSBwYXJ0c1tpXS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHBhcnRzW2ldLnN1YnN0cmluZygxKTtcbiAgfVxuICByZXR1cm4gcGFydHMuam9pbignJyk7XG59O1xuXG52YXIgaWRlbnRpZnlCcm93c2VyID0gZnVuY3Rpb24odXNlckFnZW50U3RyaW5nKSB7XG4gIGlmICghdXNlckFnZW50U3RyaW5nKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6ICd1bmtub3duJyxcbiAgICAgIG1ham9yOiAwLFxuICAgICAgbWlub3I6IDAsXG4gICAgICBwYXRjaDogMFxuICAgIH07XG4gIH1cbiAgdmFyIHVzZXJBZ2VudCA9IGxvb2t1cFVzZXJBZ2VudCh1c2VyQWdlbnRTdHJpbmcpO1xuICByZXR1cm4ge1xuICAgIG5hbWU6IGNhbWVsQ2FzZSh1c2VyQWdlbnQuZmFtaWx5KSxcbiAgICBtYWpvcjogK3VzZXJBZ2VudC5tYWpvcixcbiAgICBtaW5vcjogK3VzZXJBZ2VudC5taW5vcixcbiAgICBwYXRjaDogK3VzZXJBZ2VudC5wYXRjaCxcbiAgfTtcbn07XG5cbi8vIFhYWCBSZWZhY3RvciBhcyBwYXJ0IG9mIGltcGxlbWVudGluZyByZWFsIHJvdXRpbmcuXG5XZWJBcHBJbnRlcm5hbHMuaWRlbnRpZnlCcm93c2VyID0gaWRlbnRpZnlCcm93c2VyO1xuXG5XZWJBcHAuY2F0ZWdvcml6ZVJlcXVlc3QgPSBmdW5jdGlvbihyZXEpIHtcbiAgaWYgKHJlcS5icm93c2VyICYmIHJlcS5hcmNoICYmIHR5cGVvZiByZXEubW9kZXJuID09PSAnYm9vbGVhbicpIHtcbiAgICAvLyBBbHJlYWR5IGNhdGVnb3JpemVkLlxuICAgIHJldHVybiByZXE7XG4gIH1cblxuICBjb25zdCBicm93c2VyID0gaWRlbnRpZnlCcm93c2VyKHJlcS5oZWFkZXJzWyd1c2VyLWFnZW50J10pO1xuICBjb25zdCBtb2Rlcm4gPSBpc01vZGVybihicm93c2VyKTtcbiAgY29uc3QgcGF0aCA9XG4gICAgdHlwZW9mIHJlcS5wYXRobmFtZSA9PT0gJ3N0cmluZydcbiAgICAgID8gcmVxLnBhdGhuYW1lXG4gICAgICA6IHBhcnNlUmVxdWVzdChyZXEpLnBhdGhuYW1lO1xuXG4gIGNvbnN0IGNhdGVnb3JpemVkID0ge1xuICAgIGJyb3dzZXIsXG4gICAgbW9kZXJuLFxuICAgIHBhdGgsXG4gICAgYXJjaDogV2ViQXBwLmRlZmF1bHRBcmNoLFxuICAgIHVybDogcGFyc2VVcmwocmVxLnVybCwgdHJ1ZSksXG4gICAgZHluYW1pY0hlYWQ6IHJlcS5keW5hbWljSGVhZCxcbiAgICBkeW5hbWljQm9keTogcmVxLmR5bmFtaWNCb2R5LFxuICAgIGhlYWRlcnM6IHJlcS5oZWFkZXJzLFxuICAgIGNvb2tpZXM6IHJlcS5jb29raWVzLFxuICB9O1xuXG4gIGNvbnN0IHBhdGhQYXJ0cyA9IHBhdGguc3BsaXQoJy8nKTtcbiAgY29uc3QgYXJjaEtleSA9IHBhdGhQYXJ0c1sxXTtcblxuICBpZiAoYXJjaEtleS5zdGFydHNXaXRoKCdfXycpKSB7XG4gICAgY29uc3QgYXJjaENsZWFuZWQgPSAnd2ViLicgKyBhcmNoS2V5LnNsaWNlKDIpO1xuICAgIGlmIChoYXNPd24uY2FsbChXZWJBcHAuY2xpZW50UHJvZ3JhbXMsIGFyY2hDbGVhbmVkKSkge1xuICAgICAgcGF0aFBhcnRzLnNwbGljZSgxLCAxKTsgLy8gUmVtb3ZlIHRoZSBhcmNoS2V5IHBhcnQuXG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihjYXRlZ29yaXplZCwge1xuICAgICAgICBhcmNoOiBhcmNoQ2xlYW5lZCxcbiAgICAgICAgcGF0aDogcGF0aFBhcnRzLmpvaW4oJy8nKSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIFRPRE8gUGVyaGFwcyBvbmUgZGF5IHdlIGNvdWxkIGluZmVyIENvcmRvdmEgY2xpZW50cyBoZXJlLCBzbyB0aGF0IHdlXG4gIC8vIHdvdWxkbid0IGhhdmUgdG8gdXNlIHByZWZpeGVkIFwiL19fY29yZG92YS8uLi5cIiBVUkxzLlxuICBjb25zdCBwcmVmZXJyZWRBcmNoT3JkZXIgPSBpc01vZGVybihicm93c2VyKVxuICAgID8gWyd3ZWIuYnJvd3NlcicsICd3ZWIuYnJvd3Nlci5sZWdhY3knXVxuICAgIDogWyd3ZWIuYnJvd3Nlci5sZWdhY3knLCAnd2ViLmJyb3dzZXInXTtcblxuICBmb3IgKGNvbnN0IGFyY2ggb2YgcHJlZmVycmVkQXJjaE9yZGVyKSB7XG4gICAgLy8gSWYgb3VyIHByZWZlcnJlZCBhcmNoIGlzIG5vdCBhdmFpbGFibGUsIGl0J3MgYmV0dGVyIHRvIHVzZSBhbm90aGVyXG4gICAgLy8gY2xpZW50IGFyY2ggdGhhdCBpcyBhdmFpbGFibGUgdGhhbiB0byBndWFyYW50ZWUgdGhlIHNpdGUgd29uJ3Qgd29ya1xuICAgIC8vIGJ5IHJldHVybmluZyBhbiB1bmtub3duIGFyY2guIEZvciBleGFtcGxlLCBpZiB3ZWIuYnJvd3Nlci5sZWdhY3kgaXNcbiAgICAvLyBleGNsdWRlZCB1c2luZyB0aGUgLS1leGNsdWRlLWFyY2hzIGNvbW1hbmQtbGluZSBvcHRpb24sIGxlZ2FjeVxuICAgIC8vIGNsaWVudHMgYXJlIGJldHRlciBvZmYgcmVjZWl2aW5nIHdlYi5icm93c2VyICh3aGljaCBtaWdodCBhY3R1YWxseVxuICAgIC8vIHdvcmspIHRoYW4gcmVjZWl2aW5nIGFuIEhUVFAgNDA0IHJlc3BvbnNlLiBJZiBub25lIG9mIHRoZSBhcmNocyBpblxuICAgIC8vIHByZWZlcnJlZEFyY2hPcmRlciBhcmUgZGVmaW5lZCwgb25seSB0aGVuIHNob3VsZCB3ZSBzZW5kIGEgNDA0LlxuICAgIGlmIChoYXNPd24uY2FsbChXZWJBcHAuY2xpZW50UHJvZ3JhbXMsIGFyY2gpKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihjYXRlZ29yaXplZCwgeyBhcmNoIH0pO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjYXRlZ29yaXplZDtcbn07XG5cbi8vIEhUTUwgYXR0cmlidXRlIGhvb2tzOiBmdW5jdGlvbnMgdG8gYmUgY2FsbGVkIHRvIGRldGVybWluZSBhbnkgYXR0cmlidXRlcyB0b1xuLy8gYmUgYWRkZWQgdG8gdGhlICc8aHRtbD4nIHRhZy4gRWFjaCBmdW5jdGlvbiBpcyBwYXNzZWQgYSAncmVxdWVzdCcgb2JqZWN0IChzZWVcbi8vICNCcm93c2VySWRlbnRpZmljYXRpb24pIGFuZCBzaG91bGQgcmV0dXJuIG51bGwgb3Igb2JqZWN0LlxudmFyIGh0bWxBdHRyaWJ1dGVIb29rcyA9IFtdO1xudmFyIGdldEh0bWxBdHRyaWJ1dGVzID0gZnVuY3Rpb24ocmVxdWVzdCkge1xuICB2YXIgY29tYmluZWRBdHRyaWJ1dGVzID0ge307XG4gIChodG1sQXR0cmlidXRlSG9va3MgfHwgW10pLmZvckVhY2goZnVuY3Rpb24oaG9vaykge1xuICAgIHZhciBhdHRyaWJ1dGVzID0gaG9vayhyZXF1ZXN0KTtcbiAgICBpZiAoYXR0cmlidXRlcyA9PT0gbnVsbCkgcmV0dXJuO1xuICAgIGlmICh0eXBlb2YgYXR0cmlidXRlcyAhPT0gJ29iamVjdCcpXG4gICAgICB0aHJvdyBFcnJvcignSFRNTCBhdHRyaWJ1dGUgaG9vayBtdXN0IHJldHVybiBudWxsIG9yIG9iamVjdCcpO1xuICAgIE9iamVjdC5hc3NpZ24oY29tYmluZWRBdHRyaWJ1dGVzLCBhdHRyaWJ1dGVzKTtcbiAgfSk7XG4gIHJldHVybiBjb21iaW5lZEF0dHJpYnV0ZXM7XG59O1xuV2ViQXBwLmFkZEh0bWxBdHRyaWJ1dGVIb29rID0gZnVuY3Rpb24oaG9vaykge1xuICBodG1sQXR0cmlidXRlSG9va3MucHVzaChob29rKTtcbn07XG5cbi8vIFNlcnZlIGFwcCBIVE1MIGZvciB0aGlzIFVSTD9cbnZhciBhcHBVcmwgPSBmdW5jdGlvbih1cmwpIHtcbiAgaWYgKHVybCA9PT0gJy9mYXZpY29uLmljbycgfHwgdXJsID09PSAnL3JvYm90cy50eHQnKSByZXR1cm4gZmFsc2U7XG5cbiAgLy8gTk9URTogYXBwLm1hbmlmZXN0IGlzIG5vdCBhIHdlYiBzdGFuZGFyZCBsaWtlIGZhdmljb24uaWNvIGFuZFxuICAvLyByb2JvdHMudHh0LiBJdCBpcyBhIGZpbGUgbmFtZSB3ZSBoYXZlIGNob3NlbiB0byB1c2UgZm9yIEhUTUw1XG4gIC8vIGFwcGNhY2hlIFVSTHMuIEl0IGlzIGluY2x1ZGVkIGhlcmUgdG8gcHJldmVudCB1c2luZyBhbiBhcHBjYWNoZVxuICAvLyB0aGVuIHJlbW92aW5nIGl0IGZyb20gcG9pc29uaW5nIGFuIGFwcCBwZXJtYW5lbnRseS4gRXZlbnR1YWxseSxcbiAgLy8gb25jZSB3ZSBoYXZlIHNlcnZlciBzaWRlIHJvdXRpbmcsIHRoaXMgd29uJ3QgYmUgbmVlZGVkIGFzXG4gIC8vIHVua25vd24gVVJMcyB3aXRoIHJldHVybiBhIDQwNCBhdXRvbWF0aWNhbGx5LlxuICBpZiAodXJsID09PSAnL2FwcC5tYW5pZmVzdCcpIHJldHVybiBmYWxzZTtcblxuICAvLyBBdm9pZCBzZXJ2aW5nIGFwcCBIVE1MIGZvciBkZWNsYXJlZCByb3V0ZXMgc3VjaCBhcyAvc29ja2pzLy5cbiAgaWYgKFJvdXRlUG9saWN5LmNsYXNzaWZ5KHVybCkpIHJldHVybiBmYWxzZTtcblxuICAvLyB3ZSBjdXJyZW50bHkgcmV0dXJuIGFwcCBIVE1MIG9uIGFsbCBVUkxzIGJ5IGRlZmF1bHRcbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vLyBXZSBuZWVkIHRvIGNhbGN1bGF0ZSB0aGUgY2xpZW50IGhhc2ggYWZ0ZXIgYWxsIHBhY2thZ2VzIGhhdmUgbG9hZGVkXG4vLyB0byBnaXZlIHRoZW0gYSBjaGFuY2UgdG8gcG9wdWxhdGUgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5cbi8vXG4vLyBDYWxjdWxhdGluZyB0aGUgaGFzaCBkdXJpbmcgc3RhcnR1cCBtZWFucyB0aGF0IHBhY2thZ2VzIGNhbiBvbmx5XG4vLyBwb3B1bGF0ZSBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fIGR1cmluZyBsb2FkLCBub3QgZHVyaW5nIHN0YXJ0dXAuXG4vL1xuLy8gQ2FsY3VsYXRpbmcgaW5zdGVhZCBpdCBhdCB0aGUgYmVnaW5uaW5nIG9mIG1haW4gYWZ0ZXIgYWxsIHN0YXJ0dXBcbi8vIGhvb2tzIGhhZCBydW4gd291bGQgYWxsb3cgcGFja2FnZXMgdG8gYWxzbyBwb3B1bGF0ZVxuLy8gX19tZXRlb3JfcnVudGltZV9jb25maWdfXyBkdXJpbmcgc3RhcnR1cCwgYnV0IHRoYXQncyB0b28gbGF0ZSBmb3Jcbi8vIGF1dG91cGRhdGUgYmVjYXVzZSBpdCBuZWVkcyB0byBoYXZlIHRoZSBjbGllbnQgaGFzaCBhdCBzdGFydHVwIHRvXG4vLyBpbnNlcnQgdGhlIGF1dG8gdXBkYXRlIHZlcnNpb24gaXRzZWxmIGludG9cbi8vIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18gdG8gZ2V0IGl0IHRvIHRoZSBjbGllbnQuXG4vL1xuLy8gQW4gYWx0ZXJuYXRpdmUgd291bGQgYmUgdG8gZ2l2ZSBhdXRvdXBkYXRlIGEgXCJwb3N0LXN0YXJ0LFxuLy8gcHJlLWxpc3RlblwiIGhvb2sgdG8gYWxsb3cgaXQgdG8gaW5zZXJ0IHRoZSBhdXRvIHVwZGF0ZSB2ZXJzaW9uIGF0XG4vLyB0aGUgcmlnaHQgbW9tZW50LlxuXG5NZXRlb3Iuc3RhcnR1cChmdW5jdGlvbigpIHtcbiAgZnVuY3Rpb24gZ2V0dGVyKGtleSkge1xuICAgIHJldHVybiBmdW5jdGlvbihhcmNoKSB7XG4gICAgICBhcmNoID0gYXJjaCB8fCBXZWJBcHAuZGVmYXVsdEFyY2g7XG4gICAgICBjb25zdCBwcm9ncmFtID0gV2ViQXBwLmNsaWVudFByb2dyYW1zW2FyY2hdO1xuICAgICAgY29uc3QgdmFsdWUgPSBwcm9ncmFtICYmIHByb2dyYW1ba2V5XTtcbiAgICAgIC8vIElmIHRoaXMgaXMgdGhlIGZpcnN0IHRpbWUgd2UgaGF2ZSBjYWxjdWxhdGVkIHRoaXMgaGFzaCxcbiAgICAgIC8vIHByb2dyYW1ba2V5XSB3aWxsIGJlIGEgdGh1bmsgKGxhenkgZnVuY3Rpb24gd2l0aCBubyBwYXJhbWV0ZXJzKVxuICAgICAgLy8gdGhhdCB3ZSBzaG91bGQgY2FsbCB0byBkbyB0aGUgYWN0dWFsIGNvbXB1dGF0aW9uLlxuICAgICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJyA/IChwcm9ncmFtW2tleV0gPSB2YWx1ZSgpKSA6IHZhbHVlO1xuICAgIH07XG4gIH1cblxuICBXZWJBcHAuY2FsY3VsYXRlQ2xpZW50SGFzaCA9IFdlYkFwcC5jbGllbnRIYXNoID0gZ2V0dGVyKCd2ZXJzaW9uJyk7XG4gIFdlYkFwcC5jYWxjdWxhdGVDbGllbnRIYXNoUmVmcmVzaGFibGUgPSBnZXR0ZXIoJ3ZlcnNpb25SZWZyZXNoYWJsZScpO1xuICBXZWJBcHAuY2FsY3VsYXRlQ2xpZW50SGFzaE5vblJlZnJlc2hhYmxlID0gZ2V0dGVyKCd2ZXJzaW9uTm9uUmVmcmVzaGFibGUnKTtcbiAgV2ViQXBwLmNhbGN1bGF0ZUNsaWVudEhhc2hSZXBsYWNlYWJsZSA9IGdldHRlcigndmVyc2lvblJlcGxhY2VhYmxlJyk7XG4gIFdlYkFwcC5nZXRSZWZyZXNoYWJsZUFzc2V0cyA9IGdldHRlcigncmVmcmVzaGFibGVBc3NldHMnKTtcbn0pO1xuXG4vLyBXaGVuIHdlIGhhdmUgYSByZXF1ZXN0IHBlbmRpbmcsIHdlIHdhbnQgdGhlIHNvY2tldCB0aW1lb3V0IHRvIGJlIGxvbmcsIHRvXG4vLyBnaXZlIG91cnNlbHZlcyBhIHdoaWxlIHRvIHNlcnZlIGl0LCBhbmQgdG8gYWxsb3cgc29ja2pzIGxvbmcgcG9sbHMgdG9cbi8vIGNvbXBsZXRlLiAgT24gdGhlIG90aGVyIGhhbmQsIHdlIHdhbnQgdG8gY2xvc2UgaWRsZSBzb2NrZXRzIHJlbGF0aXZlbHlcbi8vIHF1aWNrbHksIHNvIHRoYXQgd2UgY2FuIHNodXQgZG93biByZWxhdGl2ZWx5IHByb21wdGx5IGJ1dCBjbGVhbmx5LCB3aXRob3V0XG4vLyBjdXR0aW5nIG9mZiBhbnlvbmUncyByZXNwb25zZS5cbldlYkFwcC5fdGltZW91dEFkanVzdG1lbnRSZXF1ZXN0Q2FsbGJhY2sgPSBmdW5jdGlvbihyZXEsIHJlcykge1xuICAvLyB0aGlzIGlzIHJlYWxseSBqdXN0IHJlcS5zb2NrZXQuc2V0VGltZW91dChMT05HX1NPQ0tFVF9USU1FT1VUKTtcbiAgcmVxLnNldFRpbWVvdXQoTE9OR19TT0NLRVRfVElNRU9VVCk7XG4gIC8vIEluc2VydCBvdXIgbmV3IGZpbmlzaCBsaXN0ZW5lciB0byBydW4gQkVGT1JFIHRoZSBleGlzdGluZyBvbmUgd2hpY2ggcmVtb3Zlc1xuICAvLyB0aGUgcmVzcG9uc2UgZnJvbSB0aGUgc29ja2V0LlxuICB2YXIgZmluaXNoTGlzdGVuZXJzID0gcmVzLmxpc3RlbmVycygnZmluaXNoJyk7XG4gIC8vIFhYWCBBcHBhcmVudGx5IGluIE5vZGUgMC4xMiB0aGlzIGV2ZW50IHdhcyBjYWxsZWQgJ3ByZWZpbmlzaCcuXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9qb3llbnQvbm9kZS9jb21taXQvN2M5YjYwNzBcbiAgLy8gQnV0IGl0IGhhcyBzd2l0Y2hlZCBiYWNrIHRvICdmaW5pc2gnIGluIE5vZGUgdjQ6XG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9wdWxsLzE0MTFcbiAgcmVzLnJlbW92ZUFsbExpc3RlbmVycygnZmluaXNoJyk7XG4gIHJlcy5vbignZmluaXNoJywgZnVuY3Rpb24oKSB7XG4gICAgcmVzLnNldFRpbWVvdXQoU0hPUlRfU09DS0VUX1RJTUVPVVQpO1xuICB9KTtcbiAgT2JqZWN0LnZhbHVlcyhmaW5pc2hMaXN0ZW5lcnMpLmZvckVhY2goZnVuY3Rpb24obCkge1xuICAgIHJlcy5vbignZmluaXNoJywgbCk7XG4gIH0pO1xufTtcblxuLy8gV2lsbCBiZSB1cGRhdGVkIGJ5IG1haW4gYmVmb3JlIHdlIGxpc3Rlbi5cbi8vIE1hcCBmcm9tIGNsaWVudCBhcmNoIHRvIGJvaWxlcnBsYXRlIG9iamVjdC5cbi8vIEJvaWxlcnBsYXRlIG9iamVjdCBoYXM6XG4vLyAgIC0gZnVuYzogWFhYXG4vLyAgIC0gYmFzZURhdGE6IFhYWFxudmFyIGJvaWxlcnBsYXRlQnlBcmNoID0ge307XG5cbi8vIFJlZ2lzdGVyIGEgY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBjYW4gc2VsZWN0aXZlbHkgbW9kaWZ5IGJvaWxlcnBsYXRlXG4vLyBkYXRhIGdpdmVuIGFyZ3VtZW50cyAocmVxdWVzdCwgZGF0YSwgYXJjaCkuIFRoZSBrZXkgc2hvdWxkIGJlIGEgdW5pcXVlXG4vLyBpZGVudGlmaWVyLCB0byBwcmV2ZW50IGFjY3VtdWxhdGluZyBkdXBsaWNhdGUgY2FsbGJhY2tzIGZyb20gdGhlIHNhbWVcbi8vIGNhbGwgc2l0ZSBvdmVyIHRpbWUuIENhbGxiYWNrcyB3aWxsIGJlIGNhbGxlZCBpbiB0aGUgb3JkZXIgdGhleSB3ZXJlXG4vLyByZWdpc3RlcmVkLiBBIGNhbGxiYWNrIHNob3VsZCByZXR1cm4gZmFsc2UgaWYgaXQgZGlkIG5vdCBtYWtlIGFueVxuLy8gY2hhbmdlcyBhZmZlY3RpbmcgdGhlIGJvaWxlcnBsYXRlLiBQYXNzaW5nIG51bGwgZGVsZXRlcyB0aGUgY2FsbGJhY2suXG4vLyBBbnkgcHJldmlvdXMgY2FsbGJhY2sgcmVnaXN0ZXJlZCBmb3IgdGhpcyBrZXkgd2lsbCBiZSByZXR1cm5lZC5cbmNvbnN0IGJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5XZWJBcHBJbnRlcm5hbHMucmVnaXN0ZXJCb2lsZXJwbGF0ZURhdGFDYWxsYmFjayA9IGZ1bmN0aW9uKGtleSwgY2FsbGJhY2spIHtcbiAgY29uc3QgcHJldmlvdXNDYWxsYmFjayA9IGJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrc1trZXldO1xuXG4gIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICBib2lsZXJwbGF0ZURhdGFDYWxsYmFja3Nba2V5XSA9IGNhbGxiYWNrO1xuICB9IGVsc2Uge1xuICAgIGFzc2VydC5zdHJpY3RFcXVhbChjYWxsYmFjaywgbnVsbCk7XG4gICAgZGVsZXRlIGJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrc1trZXldO1xuICB9XG5cbiAgLy8gUmV0dXJuIHRoZSBwcmV2aW91cyBjYWxsYmFjayBpbiBjYXNlIHRoZSBuZXcgY2FsbGJhY2sgbmVlZHMgdG8gY2FsbFxuICAvLyBpdDsgZm9yIGV4YW1wbGUsIHdoZW4gdGhlIG5ldyBjYWxsYmFjayBpcyBhIHdyYXBwZXIgZm9yIHRoZSBvbGQuXG4gIHJldHVybiBwcmV2aW91c0NhbGxiYWNrIHx8IG51bGw7XG59O1xuXG4vLyBHaXZlbiBhIHJlcXVlc3QgKGFzIHJldHVybmVkIGZyb20gYGNhdGVnb3JpemVSZXF1ZXN0YCksIHJldHVybiB0aGVcbi8vIGJvaWxlcnBsYXRlIEhUTUwgdG8gc2VydmUgZm9yIHRoYXQgcmVxdWVzdC5cbi8vXG4vLyBJZiBhIHByZXZpb3VzIEV4cHJlc3MgbWlkZGxld2FyZSBoYXMgcmVuZGVyZWQgY29udGVudCBmb3IgdGhlIGhlYWQgb3IgYm9keSxcbi8vIHJldHVybnMgdGhlIGJvaWxlcnBsYXRlIHdpdGggdGhhdCBjb250ZW50IHBhdGNoZWQgaW4gb3RoZXJ3aXNlXG4vLyBtZW1vaXplcyBvbiBIVE1MIGF0dHJpYnV0ZXMgKHVzZWQgYnksIGVnLCBhcHBjYWNoZSkgYW5kIHdoZXRoZXIgaW5saW5lXG4vLyBzY3JpcHRzIGFyZSBjdXJyZW50bHkgYWxsb3dlZC5cbi8vIFhYWCBzbyBmYXIgdGhpcyBmdW5jdGlvbiBpcyBhbHdheXMgY2FsbGVkIHdpdGggYXJjaCA9PT0gJ3dlYi5icm93c2VyJ1xuZnVuY3Rpb24gZ2V0Qm9pbGVycGxhdGUocmVxdWVzdCwgYXJjaCkge1xuICByZXR1cm4gZ2V0Qm9pbGVycGxhdGVBc3luYyhyZXF1ZXN0LCBhcmNoKTtcbn1cblxuLyoqXG4gKiBAc3VtbWFyeSBUYWtlcyBhIHJ1bnRpbWUgY29uZmlndXJhdGlvbiBvYmplY3QgYW5kXG4gKiByZXR1cm5zIGFuIGVuY29kZWQgcnVudGltZSBzdHJpbmcuXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge09iamVjdH0gcnRpbWVDb25maWdcbiAqIEByZXR1cm5zIHtTdHJpbmd9XG4gKi9cbldlYkFwcC5lbmNvZGVSdW50aW1lQ29uZmlnID0gZnVuY3Rpb24ocnRpbWVDb25maWcpIHtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGVuY29kZVVSSUNvbXBvbmVudChKU09OLnN0cmluZ2lmeShydGltZUNvbmZpZykpKTtcbn07XG5cbi8qKlxuICogQHN1bW1hcnkgVGFrZXMgYW4gZW5jb2RlZCBydW50aW1lIHN0cmluZyBhbmQgcmV0dXJuc1xuICogYSBydW50aW1lIGNvbmZpZ3VyYXRpb24gb2JqZWN0LlxuICogQGxvY3VzIFNlcnZlclxuICogQHBhcmFtIHtTdHJpbmd9IHJ0aW1lQ29uZmlnU3RyaW5nXG4gKiBAcmV0dXJucyB7T2JqZWN0fVxuICovXG5XZWJBcHAuZGVjb2RlUnVudGltZUNvbmZpZyA9IGZ1bmN0aW9uKHJ0aW1lQ29uZmlnU3RyKSB7XG4gIHJldHVybiBKU09OLnBhcnNlKGRlY29kZVVSSUNvbXBvbmVudChKU09OLnBhcnNlKHJ0aW1lQ29uZmlnU3RyKSkpO1xufTtcblxuY29uc3QgcnVudGltZUNvbmZpZyA9IHtcbiAgLy8gaG9va3Mgd2lsbCBjb250YWluIHRoZSBjYWxsYmFjayBmdW5jdGlvbnNcbiAgLy8gc2V0IGJ5IHRoZSBjYWxsZXIgdG8gYWRkUnVudGltZUNvbmZpZ0hvb2tcbiAgaG9va3M6IG5ldyBIb29rKCksXG4gIC8vIHVwZGF0ZUhvb2tzIHdpbGwgY29udGFpbiB0aGUgY2FsbGJhY2sgZnVuY3Rpb25zXG4gIC8vIHNldCBieSB0aGUgY2FsbGVyIHRvIGFkZFVwZGF0ZWROb3RpZnlIb29rXG4gIHVwZGF0ZUhvb2tzOiBuZXcgSG9vaygpLFxuICAvLyBpc1VwZGF0ZWRCeUFyY2ggaXMgYW4gb2JqZWN0IGNvbnRhaW5pbmcgZmllbGRzIGZvciBlYWNoIGFyY2hcbiAgLy8gdGhhdCB0aGlzIHNlcnZlciBzdXBwb3J0cy5cbiAgLy8gLSBFYWNoIGZpZWxkIHdpbGwgYmUgdHJ1ZSB3aGVuIHRoZSBzZXJ2ZXIgdXBkYXRlcyB0aGUgcnVudGltZUNvbmZpZyBmb3IgdGhhdCBhcmNoLlxuICAvLyAtIFdoZW4gdGhlIGhvb2sgY2FsbGJhY2sgaXMgY2FsbGVkIHRoZSB1cGRhdGUgZmllbGQgaW4gdGhlIGNhbGxiYWNrIG9iamVjdCB3aWxsIGJlXG4gIC8vIHNldCB0byBpc1VwZGF0ZWRCeUFyY2hbYXJjaF0uXG4gIC8vID0gaXNVcGRhdGVkeUJ5QXJjaFthcmNoXSBpcyByZXNldCB0byBmYWxzZSBhZnRlciB0aGUgY2FsbGJhY2suXG4gIC8vIFRoaXMgZW5hYmxlcyB0aGUgY2FsbGVyIHRvIGNhY2hlIGRhdGEgZWZmaWNpZW50bHkgc28gdGhleSBkbyBub3QgbmVlZCB0b1xuICAvLyBkZWNvZGUgJiB1cGRhdGUgZGF0YSBvbiBldmVyeSBjYWxsYmFjayB3aGVuIHRoZSBydW50aW1lQ29uZmlnIGlzIG5vdCBjaGFuZ2luZy5cbiAgaXNVcGRhdGVkQnlBcmNoOiB7fSxcbn07XG5cbi8qKlxuICogQG5hbWUgYWRkUnVudGltZUNvbmZpZ0hvb2tDYWxsYmFjayhvcHRpb25zKVxuICogQGxvY3VzIFNlcnZlclxuICogQGlzcHJvdG90eXBlIHRydWVcbiAqIEBzdW1tYXJ5IENhbGxiYWNrIGZvciBgYWRkUnVudGltZUNvbmZpZ0hvb2tgLlxuICpcbiAqIElmIHRoZSBoYW5kbGVyIHJldHVybnMgYSBfZmFsc3lfIHZhbHVlIHRoZSBob29rIHdpbGwgbm90XG4gKiBtb2RpZnkgdGhlIHJ1bnRpbWUgY29uZmlndXJhdGlvbi5cbiAqXG4gKiBJZiB0aGUgaGFuZGxlciByZXR1cm5zIGEgX1N0cmluZ18gdGhlIGhvb2sgd2lsbCBzdWJzdGl0dXRlXG4gKiB0aGUgc3RyaW5nIGZvciB0aGUgZW5jb2RlZCBjb25maWd1cmF0aW9uIHN0cmluZy5cbiAqXG4gKiAqKldhcm5pbmc6KiogdGhlIGhvb2sgZG9lcyBub3QgY2hlY2sgdGhlIHJldHVybiB2YWx1ZSBhdCBhbGwgaXQgaXNcbiAqIHRoZSByZXNwb25zaWJpbGl0eSBvZiB0aGUgY2FsbGVyIHRvIGdldCB0aGUgZm9ybWF0dGluZyBjb3JyZWN0IHVzaW5nXG4gKiB0aGUgaGVscGVyIGZ1bmN0aW9ucy5cbiAqXG4gKiBgYWRkUnVudGltZUNvbmZpZ0hvb2tDYWxsYmFja2AgdGFrZXMgb25seSBvbmUgYE9iamVjdGAgYXJndW1lbnRcbiAqIHdpdGggdGhlIGZvbGxvd2luZyBmaWVsZHM6XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IG9wdGlvbnMuYXJjaCBUaGUgYXJjaGl0ZWN0dXJlIG9mIHRoZSBjbGllbnRcbiAqIHJlcXVlc3RpbmcgYSBuZXcgcnVudGltZSBjb25maWd1cmF0aW9uLiBUaGlzIGNhbiBiZSBvbmUgb2ZcbiAqIGB3ZWIuYnJvd3NlcmAsIGB3ZWIuYnJvd3Nlci5sZWdhY3lgIG9yIGB3ZWIuY29yZG92YWAuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucy5yZXF1ZXN0XG4gKiBBIE5vZGVKcyBbSW5jb21pbmdNZXNzYWdlXShodHRwczovL25vZGVqcy5vcmcvYXBpL2h0dHAuaHRtbCNodHRwX2NsYXNzX2h0dHBfaW5jb21pbmdtZXNzYWdlKVxuICogaHR0cHM6Ly9ub2RlanMub3JnL2FwaS9odHRwLmh0bWwjaHR0cF9jbGFzc19odHRwX2luY29taW5nbWVzc2FnZVxuICogYE9iamVjdGAgdGhhdCBjYW4gYmUgdXNlZCB0byBnZXQgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGluY29taW5nIHJlcXVlc3QuXG4gKiBAcGFyYW0ge1N0cmluZ30gb3B0aW9ucy5lbmNvZGVkQ3VycmVudENvbmZpZyBUaGUgY3VycmVudCBjb25maWd1cmF0aW9uIG9iamVjdFxuICogZW5jb2RlZCBhcyBhIHN0cmluZyBmb3IgaW5jbHVzaW9uIGluIHRoZSByb290IGh0bWwuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMudXBkYXRlZCBgdHJ1ZWAgaWYgdGhlIGNvbmZpZyBmb3IgdGhpcyBhcmNoaXRlY3R1cmVcbiAqIGhhcyBiZWVuIHVwZGF0ZWQgc2luY2UgbGFzdCBjYWxsZWQsIG90aGVyd2lzZSBgZmFsc2VgLiBUaGlzIGZsYWcgY2FuIGJlIHVzZWRcbiAqIHRvIGNhY2hlIHRoZSBkZWNvZGluZy9lbmNvZGluZyBmb3IgZWFjaCBhcmNoaXRlY3R1cmUuXG4gKi9cblxuLyoqXG4gKiBAc3VtbWFyeSBIb29rIHRoYXQgY2FsbHMgYmFjayB3aGVuIHRoZSBtZXRlb3IgcnVudGltZSBjb25maWd1cmF0aW9uLFxuICogYF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX19gIGlzIGJlaW5nIHNlbnQgdG8gYW55IGNsaWVudC5cbiAqXG4gKiAqKnJldHVybnMqKjogPHNtYWxsPl9PYmplY3RfPC9zbWFsbD4gYHsgc3RvcDogZnVuY3Rpb24sIGNhbGxiYWNrOiBmdW5jdGlvbiB9YFxuICogLSBgc3RvcGAgPHNtYWxsPl9GdW5jdGlvbl88L3NtYWxsPiBDYWxsIGBzdG9wKClgIHRvIHN0b3AgZ2V0dGluZyBjYWxsYmFja3MuXG4gKiAtIGBjYWxsYmFja2AgPHNtYWxsPl9GdW5jdGlvbl88L3NtYWxsPiBUaGUgcGFzc2VkIGluIGBjYWxsYmFja2AuXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge2FkZFJ1bnRpbWVDb25maWdIb29rQ2FsbGJhY2t9IGNhbGxiYWNrXG4gKiBTZWUgYGFkZFJ1bnRpbWVDb25maWdIb29rQ2FsbGJhY2tgIGRlc2NyaXB0aW9uLlxuICogQHJldHVybnMge09iamVjdH0ge3sgc3RvcDogZnVuY3Rpb24sIGNhbGxiYWNrOiBmdW5jdGlvbiB9fVxuICogQ2FsbCB0aGUgcmV0dXJuZWQgYHN0b3AoKWAgdG8gc3RvcCBnZXR0aW5nIGNhbGxiYWNrcy5cbiAqIFRoZSBwYXNzZWQgaW4gYGNhbGxiYWNrYCBpcyByZXR1cm5lZCBhbHNvLlxuICovXG5XZWJBcHAuYWRkUnVudGltZUNvbmZpZ0hvb2sgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICByZXR1cm4gcnVudGltZUNvbmZpZy5ob29rcy5yZWdpc3RlcihjYWxsYmFjayk7XG59O1xuXG5hc3luYyBmdW5jdGlvbiBnZXRCb2lsZXJwbGF0ZUFzeW5jKHJlcXVlc3QsIGFyY2gpIHtcbiAgbGV0IGJvaWxlcnBsYXRlID0gYm9pbGVycGxhdGVCeUFyY2hbYXJjaF07XG4gIGF3YWl0IHJ1bnRpbWVDb25maWcuaG9va3MuZm9yRWFjaEFzeW5jKGFzeW5jIGhvb2sgPT4ge1xuICAgIGNvbnN0IG1ldGVvclJ1bnRpbWVDb25maWcgPSBhd2FpdCBob29rKHtcbiAgICAgIGFyY2gsXG4gICAgICByZXF1ZXN0LFxuICAgICAgZW5jb2RlZEN1cnJlbnRDb25maWc6IGJvaWxlcnBsYXRlLmJhc2VEYXRhLm1ldGVvclJ1bnRpbWVDb25maWcsXG4gICAgICB1cGRhdGVkOiBydW50aW1lQ29uZmlnLmlzVXBkYXRlZEJ5QXJjaFthcmNoXSxcbiAgICB9KTtcbiAgICBpZiAoIW1ldGVvclJ1bnRpbWVDb25maWcpIHJldHVybiB0cnVlO1xuICAgIGJvaWxlcnBsYXRlLmJhc2VEYXRhID0gT2JqZWN0LmFzc2lnbih7fSwgYm9pbGVycGxhdGUuYmFzZURhdGEsIHtcbiAgICAgIG1ldGVvclJ1bnRpbWVDb25maWcsXG4gICAgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0pO1xuICBydW50aW1lQ29uZmlnLmlzVXBkYXRlZEJ5QXJjaFthcmNoXSA9IGZhbHNlO1xuICBjb25zdCB7IGR5bmFtaWNIZWFkLCBkeW5hbWljQm9keSB9ID0gcmVxdWVzdDtcbiAgY29uc3QgZGF0YSA9IE9iamVjdC5hc3NpZ24oXG4gICAge30sXG4gICAgYm9pbGVycGxhdGUuYmFzZURhdGEsXG4gICAge1xuICAgICAgaHRtbEF0dHJpYnV0ZXM6IGdldEh0bWxBdHRyaWJ1dGVzKHJlcXVlc3QpLFxuICAgIH0sXG4gICAgeyBkeW5hbWljSGVhZCwgZHluYW1pY0JvZHkgfVxuICApO1xuXG4gIGxldCBtYWRlQ2hhbmdlcyA9IGZhbHNlO1xuICBsZXQgcHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xuXG4gIE9iamVjdC5rZXlzKGJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrcykuZm9yRWFjaChrZXkgPT4ge1xuICAgIHByb21pc2UgPSBwcm9taXNlXG4gICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgIGNvbnN0IGNhbGxiYWNrID0gYm9pbGVycGxhdGVEYXRhQ2FsbGJhY2tzW2tleV07XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhyZXF1ZXN0LCBkYXRhLCBhcmNoKTtcbiAgICAgIH0pXG4gICAgICAudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAvLyBDYWxsYmFja3Mgc2hvdWxkIHJldHVybiBmYWxzZSBpZiB0aGV5IGRpZCBub3QgbWFrZSBhbnkgY2hhbmdlcy5cbiAgICAgICAgaWYgKHJlc3VsdCAhPT0gZmFsc2UpIHtcbiAgICAgICAgICBtYWRlQ2hhbmdlcyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICB9KTtcblxuICByZXR1cm4gcHJvbWlzZS50aGVuKCgpID0+ICh7XG4gICAgc3RyZWFtOiBib2lsZXJwbGF0ZS50b0hUTUxTdHJlYW0oZGF0YSksXG4gICAgc3RhdHVzQ29kZTogZGF0YS5zdGF0dXNDb2RlLFxuICAgIGhlYWRlcnM6IGRhdGEuaGVhZGVycyxcbiAgfSkpO1xufVxuXG4vKipcbiAqIEBuYW1lIGFkZFVwZGF0ZWROb3RpZnlIb29rQ2FsbGJhY2sob3B0aW9ucylcbiAqIEBzdW1tYXJ5IGNhbGxiYWNrIGhhbmRsZXIgZm9yIGBhZGR1cGRhdGVkTm90aWZ5SG9va2BcbiAqIEBpc3Byb3RvdHlwZSB0cnVlXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IG9wdGlvbnMuYXJjaCBUaGUgYXJjaGl0ZWN0dXJlIHRoYXQgaXMgYmVpbmcgdXBkYXRlZC5cbiAqIFRoaXMgY2FuIGJlIG9uZSBvZiBgd2ViLmJyb3dzZXJgLCBgd2ViLmJyb3dzZXIubGVnYWN5YCBvciBgd2ViLmNvcmRvdmFgLlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMubWFuaWZlc3QgVGhlIG5ldyB1cGRhdGVkIG1hbmlmZXN0IG9iamVjdCBmb3JcbiAqIHRoaXMgYGFyY2hgLlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMucnVudGltZUNvbmZpZyBUaGUgbmV3IHVwZGF0ZWQgY29uZmlndXJhdGlvblxuICogb2JqZWN0IGZvciB0aGlzIGBhcmNoYC5cbiAqL1xuXG4vKipcbiAqIEBzdW1tYXJ5IEhvb2sgdGhhdCBydW5zIHdoZW4gdGhlIG1ldGVvciBydW50aW1lIGNvbmZpZ3VyYXRpb25cbiAqIGlzIHVwZGF0ZWQuICBUeXBpY2FsbHkgdGhlIGNvbmZpZ3VyYXRpb24gb25seSBjaGFuZ2VzIGR1cmluZyBkZXZlbG9wbWVudCBtb2RlLlxuICogQGxvY3VzIFNlcnZlclxuICogQHBhcmFtIHthZGRVcGRhdGVkTm90aWZ5SG9va0NhbGxiYWNrfSBoYW5kbGVyXG4gKiBUaGUgYGhhbmRsZXJgIGlzIGNhbGxlZCBvbiBldmVyeSBjaGFuZ2UgdG8gYW4gYGFyY2hgIHJ1bnRpbWUgY29uZmlndXJhdGlvbi5cbiAqIFNlZSBgYWRkVXBkYXRlZE5vdGlmeUhvb2tDYWxsYmFja2AuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSB7eyBzdG9wOiBmdW5jdGlvbiwgY2FsbGJhY2s6IGZ1bmN0aW9uIH19XG4gKi9cbldlYkFwcC5hZGRVcGRhdGVkTm90aWZ5SG9vayA9IGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgcmV0dXJuIHJ1bnRpbWVDb25maWcudXBkYXRlSG9va3MucmVnaXN0ZXIoaGFuZGxlcik7XG59O1xuXG5XZWJBcHBJbnRlcm5hbHMuZ2VuZXJhdGVCb2lsZXJwbGF0ZUluc3RhbmNlID0gZnVuY3Rpb24oXG4gIGFyY2gsXG4gIG1hbmlmZXN0LFxuICBhZGRpdGlvbmFsT3B0aW9uc1xuKSB7XG4gIGFkZGl0aW9uYWxPcHRpb25zID0gYWRkaXRpb25hbE9wdGlvbnMgfHwge307XG5cbiAgcnVudGltZUNvbmZpZy5pc1VwZGF0ZWRCeUFyY2hbYXJjaF0gPSB0cnVlO1xuICBjb25zdCBydGltZUNvbmZpZyA9IHtcbiAgICAuLi5fX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLFxuICAgIC4uLihhZGRpdGlvbmFsT3B0aW9ucy5ydW50aW1lQ29uZmlnT3ZlcnJpZGVzIHx8IHt9KSxcbiAgfTtcbiAgcnVudGltZUNvbmZpZy51cGRhdGVIb29rcy5mb3JFYWNoKGNiID0+IHtcbiAgICBjYih7IGFyY2gsIG1hbmlmZXN0LCBydW50aW1lQ29uZmlnOiBydGltZUNvbmZpZyB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG5cbiAgY29uc3QgbWV0ZW9yUnVudGltZUNvbmZpZyA9IEpTT04uc3RyaW5naWZ5KFxuICAgIGVuY29kZVVSSUNvbXBvbmVudChKU09OLnN0cmluZ2lmeShydGltZUNvbmZpZykpXG4gICk7XG5cbiAgcmV0dXJuIG5ldyBCb2lsZXJwbGF0ZShcbiAgICBhcmNoLFxuICAgIG1hbmlmZXN0LFxuICAgIE9iamVjdC5hc3NpZ24oXG4gICAgICB7XG4gICAgICAgIHBhdGhNYXBwZXIoaXRlbVBhdGgpIHtcbiAgICAgICAgICByZXR1cm4gcGF0aEpvaW4oYXJjaFBhdGhbYXJjaF0sIGl0ZW1QYXRoKTtcbiAgICAgICAgfSxcbiAgICAgICAgYmFzZURhdGFFeHRlbnNpb246IHtcbiAgICAgICAgICBhZGRpdGlvbmFsU3RhdGljSnM6IChPYmplY3QuZW50cmllcyhhZGRpdGlvbmFsU3RhdGljSnMpIHx8IFtdKS5tYXAoZnVuY3Rpb24oXG4gICAgICAgICAgICBbcGF0aG5hbWUsIGNvbnRlbnRzXVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgcGF0aG5hbWU6IHBhdGhuYW1lLFxuICAgICAgICAgICAgICBjb250ZW50czogY29udGVudHMsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0pLFxuICAgICAgICAgIC8vIENvbnZlcnQgdG8gYSBKU09OIHN0cmluZywgdGhlbiBnZXQgcmlkIG9mIG1vc3Qgd2VpcmQgY2hhcmFjdGVycywgdGhlblxuICAgICAgICAgIC8vIHdyYXAgaW4gZG91YmxlIHF1b3Rlcy4gKFRoZSBvdXRlcm1vc3QgSlNPTi5zdHJpbmdpZnkgcmVhbGx5IG91Z2h0IHRvXG4gICAgICAgICAgLy8ganVzdCBiZSBcIndyYXAgaW4gZG91YmxlIHF1b3Rlc1wiIGJ1dCB3ZSB1c2UgaXQgdG8gYmUgc2FmZS4pIFRoaXMgbWlnaHRcbiAgICAgICAgICAvLyBlbmQgdXAgaW5zaWRlIGEgPHNjcmlwdD4gdGFnIHNvIHdlIG5lZWQgdG8gYmUgY2FyZWZ1bCB0byBub3QgaW5jbHVkZVxuICAgICAgICAgIC8vIFwiPC9zY3JpcHQ+XCIsIGJ1dCBub3JtYWwge3tzcGFjZWJhcnN9fSBlc2NhcGluZyBlc2NhcGVzIHRvbyBtdWNoISBTZWVcbiAgICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci9pc3N1ZXMvMzczMFxuICAgICAgICAgIG1ldGVvclJ1bnRpbWVDb25maWcsXG4gICAgICAgICAgbWV0ZW9yUnVudGltZUhhc2g6IHNoYTEobWV0ZW9yUnVudGltZUNvbmZpZyksXG4gICAgICAgICAgcm9vdFVybFBhdGhQcmVmaXg6XG4gICAgICAgICAgICBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYIHx8ICcnLFxuICAgICAgICAgIGJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rOiBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayxcbiAgICAgICAgICBzcmlNb2RlOiBzcmlNb2RlLFxuICAgICAgICAgIGlubGluZVNjcmlwdHNBbGxvd2VkOiBXZWJBcHBJbnRlcm5hbHMuaW5saW5lU2NyaXB0c0FsbG93ZWQoKSxcbiAgICAgICAgICBpbmxpbmU6IGFkZGl0aW9uYWxPcHRpb25zLmlubGluZSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBhZGRpdGlvbmFsT3B0aW9uc1xuICAgIClcbiAgKTtcbn07XG5cbi8vIEEgbWFwcGluZyBmcm9tIHVybCBwYXRoIHRvIGFyY2hpdGVjdHVyZSAoZS5nLiBcIndlYi5icm93c2VyXCIpIHRvIHN0YXRpY1xuLy8gZmlsZSBpbmZvcm1hdGlvbiB3aXRoIHRoZSBmb2xsb3dpbmcgZmllbGRzOlxuLy8gLSB0eXBlOiB0aGUgdHlwZSBvZiBmaWxlIHRvIGJlIHNlcnZlZFxuLy8gLSBjYWNoZWFibGU6IG9wdGlvbmFsbHksIHdoZXRoZXIgdGhlIGZpbGUgc2hvdWxkIGJlIGNhY2hlZCBvciBub3Rcbi8vIC0gc291cmNlTWFwVXJsOiBvcHRpb25hbGx5LCB0aGUgdXJsIG9mIHRoZSBzb3VyY2UgbWFwXG4vL1xuLy8gSW5mbyBhbHNvIGNvbnRhaW5zIG9uZSBvZiB0aGUgZm9sbG93aW5nOlxuLy8gLSBjb250ZW50OiB0aGUgc3RyaW5naWZpZWQgY29udGVudCB0aGF0IHNob3VsZCBiZSBzZXJ2ZWQgYXQgdGhpcyBwYXRoXG4vLyAtIGFic29sdXRlUGF0aDogdGhlIGFic29sdXRlIHBhdGggb24gZGlzayB0byB0aGUgZmlsZVxuXG4vLyBTZXJ2ZSBzdGF0aWMgZmlsZXMgZnJvbSB0aGUgbWFuaWZlc3Qgb3IgYWRkZWQgd2l0aFxuLy8gYGFkZFN0YXRpY0pzYC4gRXhwb3J0ZWQgZm9yIHRlc3RzLlxuV2ViQXBwSW50ZXJuYWxzLnN0YXRpY0ZpbGVzTWlkZGxld2FyZSA9IGFzeW5jIGZ1bmN0aW9uKFxuICBzdGF0aWNGaWxlc0J5QXJjaCxcbiAgcmVxLFxuICByZXMsXG4gIG5leHRcbikge1xuICB2YXIgcGF0aG5hbWUgPSBwYXJzZVJlcXVlc3QocmVxKS5wYXRobmFtZTtcbiAgdHJ5IHtcbiAgICBwYXRobmFtZSA9IGRlY29kZVVSSUNvbXBvbmVudChwYXRobmFtZSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBuZXh0KCk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIHNlcnZlU3RhdGljSnMgPSBmdW5jdGlvbihzKSB7XG4gICAgaWYgKFxuICAgICAgcmVxLm1ldGhvZCA9PT0gJ0dFVCcgfHxcbiAgICAgIHJlcS5tZXRob2QgPT09ICdIRUFEJyB8fFxuICAgICAgTWV0ZW9yLnNldHRpbmdzLnBhY2thZ2VzPy53ZWJhcHA/LmFsd2F5c1JldHVybkNvbnRlbnRcbiAgICApIHtcbiAgICAgIHJlcy53cml0ZUhlYWQoMjAwLCB7XG4gICAgICAgICdDb250ZW50LXR5cGUnOiAnYXBwbGljYXRpb24vamF2YXNjcmlwdDsgY2hhcnNldD1VVEYtOCcsXG4gICAgICAgICdDb250ZW50LUxlbmd0aCc6IEJ1ZmZlci5ieXRlTGVuZ3RoKHMpLFxuICAgICAgfSk7XG4gICAgICByZXMud3JpdGUocyk7XG4gICAgICByZXMuZW5kKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHN0YXR1cyA9IHJlcS5tZXRob2QgPT09ICdPUFRJT05TJyA/IDIwMCA6IDQwNTtcbiAgICAgIHJlcy53cml0ZUhlYWQoc3RhdHVzLCB7XG4gICAgICAgIEFsbG93OiAnT1BUSU9OUywgR0VULCBIRUFEJyxcbiAgICAgICAgJ0NvbnRlbnQtTGVuZ3RoJzogJzAnLFxuICAgICAgfSk7XG4gICAgICByZXMuZW5kKCk7XG4gICAgfVxuICB9O1xuXG4gIGlmIChcbiAgICBwYXRobmFtZSBpbiBhZGRpdGlvbmFsU3RhdGljSnMgJiZcbiAgICAhV2ViQXBwSW50ZXJuYWxzLmlubGluZVNjcmlwdHNBbGxvd2VkKClcbiAgKSB7XG4gICAgc2VydmVTdGF0aWNKcyhhZGRpdGlvbmFsU3RhdGljSnNbcGF0aG5hbWVdKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCB7IGFyY2gsIHBhdGggfSA9IFdlYkFwcC5jYXRlZ29yaXplUmVxdWVzdChyZXEpO1xuXG4gIGlmICghaGFzT3duLmNhbGwoV2ViQXBwLmNsaWVudFByb2dyYW1zLCBhcmNoKSkge1xuICAgIC8vIFdlIGNvdWxkIGNvbWUgaGVyZSBpbiBjYXNlIHdlIHJ1biB3aXRoIHNvbWUgYXJjaGl0ZWN0dXJlcyBleGNsdWRlZFxuICAgIG5leHQoKTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBJZiBwYXVzZUNsaWVudChhcmNoKSBoYXMgYmVlbiBjYWxsZWQsIHByb2dyYW0ucGF1c2VkIHdpbGwgYmUgYVxuICAvLyBQcm9taXNlIHRoYXQgd2lsbCBiZSByZXNvbHZlZCB3aGVuIHRoZSBwcm9ncmFtIGlzIHVucGF1c2VkLlxuICBjb25zdCBwcm9ncmFtID0gV2ViQXBwLmNsaWVudFByb2dyYW1zW2FyY2hdO1xuICBhd2FpdCBwcm9ncmFtLnBhdXNlZDtcblxuICBpZiAoXG4gICAgcGF0aCA9PT0gJy9tZXRlb3JfcnVudGltZV9jb25maWcuanMnICYmXG4gICAgIVdlYkFwcEludGVybmFscy5pbmxpbmVTY3JpcHRzQWxsb3dlZCgpXG4gICkge1xuICAgIHNlcnZlU3RhdGljSnMoXG4gICAgICBgX19tZXRlb3JfcnVudGltZV9jb25maWdfXyA9ICR7cHJvZ3JhbS5tZXRlb3JSdW50aW1lQ29uZmlnfTtgXG4gICAgKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBpbmZvID0gZ2V0U3RhdGljRmlsZUluZm8oc3RhdGljRmlsZXNCeUFyY2gsIHBhdGhuYW1lLCBwYXRoLCBhcmNoKTtcbiAgaWYgKCFpbmZvKSB7XG4gICAgbmV4dCgpO1xuICAgIHJldHVybjtcbiAgfVxuICAvLyBcInNlbmRcIiB3aWxsIGhhbmRsZSBIRUFEICYgR0VUIHJlcXVlc3RzXG4gIGlmIChcbiAgICByZXEubWV0aG9kICE9PSAnSEVBRCcgJiZcbiAgICByZXEubWV0aG9kICE9PSAnR0VUJyAmJlxuICAgICFNZXRlb3Iuc2V0dGluZ3MucGFja2FnZXM/LndlYmFwcD8uYWx3YXlzUmV0dXJuQ29udGVudFxuICApIHtcbiAgICBjb25zdCBzdGF0dXMgPSByZXEubWV0aG9kID09PSAnT1BUSU9OUycgPyAyMDAgOiA0MDU7XG4gICAgcmVzLndyaXRlSGVhZChzdGF0dXMsIHtcbiAgICAgIEFsbG93OiAnT1BUSU9OUywgR0VULCBIRUFEJyxcbiAgICAgICdDb250ZW50LUxlbmd0aCc6ICcwJyxcbiAgICB9KTtcbiAgICByZXMuZW5kKCk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gV2UgZG9uJ3QgbmVlZCB0byBjYWxsIHBhdXNlIGJlY2F1c2UsIHVubGlrZSAnc3RhdGljJywgb25jZSB3ZSBjYWxsIGludG9cbiAgLy8gJ3NlbmQnIGFuZCB5aWVsZCB0byB0aGUgZXZlbnQgbG9vcCwgd2UgbmV2ZXIgY2FsbCBhbm90aGVyIGhhbmRsZXIgd2l0aFxuICAvLyAnbmV4dCcuXG5cbiAgLy8gQ2FjaGVhYmxlIGZpbGVzIGFyZSBmaWxlcyB0aGF0IHNob3VsZCBuZXZlciBjaGFuZ2UuIFR5cGljYWxseVxuICAvLyBuYW1lZCBieSB0aGVpciBoYXNoIChlZyBtZXRlb3IgYnVuZGxlZCBqcyBhbmQgY3NzIGZpbGVzKS5cbiAgLy8gV2UgY2FjaGUgdGhlbSB+Zm9yZXZlciAoMXlyKS5cbiAgY29uc3QgbWF4QWdlID0gaW5mby5jYWNoZWFibGUgPyAxMDAwICogNjAgKiA2MCAqIDI0ICogMzY1IDogMDtcblxuICBpZiAoaW5mby5jYWNoZWFibGUpIHtcbiAgICAvLyBTaW5jZSB3ZSB1c2UgcmVxLmhlYWRlcnNbXCJ1c2VyLWFnZW50XCJdIHRvIGRldGVybWluZSB3aGV0aGVyIHRoZVxuICAgIC8vIGNsaWVudCBzaG91bGQgcmVjZWl2ZSBtb2Rlcm4gb3IgbGVnYWN5IHJlc291cmNlcywgdGVsbCB0aGUgY2xpZW50XG4gICAgLy8gdG8gaW52YWxpZGF0ZSBjYWNoZWQgcmVzb3VyY2VzIHdoZW4vaWYgaXRzIHVzZXIgYWdlbnQgc3RyaW5nXG4gICAgLy8gY2hhbmdlcyBpbiB0aGUgZnV0dXJlLlxuICAgIHJlcy5zZXRIZWFkZXIoJ1ZhcnknLCAnVXNlci1BZ2VudCcpO1xuICB9XG5cbiAgLy8gU2V0IHRoZSBYLVNvdXJjZU1hcCBoZWFkZXIsIHdoaWNoIGN1cnJlbnQgQ2hyb21lLCBGaXJlRm94LCBhbmQgU2FmYXJpXG4gIC8vIHVuZGVyc3RhbmQuICAoVGhlIFNvdXJjZU1hcCBoZWFkZXIgaXMgc2xpZ2h0bHkgbW9yZSBzcGVjLWNvcnJlY3QgYnV0IEZGXG4gIC8vIGRvZXNuJ3QgdW5kZXJzdGFuZCBpdC4pXG4gIC8vXG4gIC8vIFlvdSBtYXkgYWxzbyBuZWVkIHRvIGVuYWJsZSBzb3VyY2UgbWFwcyBpbiBDaHJvbWU6IG9wZW4gZGV2IHRvb2xzLCBjbGlja1xuICAvLyB0aGUgZ2VhciBpbiB0aGUgYm90dG9tIHJpZ2h0IGNvcm5lciwgYW5kIHNlbGVjdCBcImVuYWJsZSBzb3VyY2UgbWFwc1wiLlxuICBpZiAoaW5mby5zb3VyY2VNYXBVcmwpIHtcbiAgICByZXMuc2V0SGVhZGVyKFxuICAgICAgJ1gtU291cmNlTWFwJyxcbiAgICAgIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkxfUEFUSF9QUkVGSVggKyBpbmZvLnNvdXJjZU1hcFVybFxuICAgICk7XG4gIH1cblxuICBpZiAoaW5mby50eXBlID09PSAnanMnIHx8IGluZm8udHlwZSA9PT0gJ2R5bmFtaWMganMnKSB7XG4gICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2phdmFzY3JpcHQ7IGNoYXJzZXQ9VVRGLTgnKTtcbiAgfSBlbHNlIGlmIChpbmZvLnR5cGUgPT09ICdjc3MnKSB7XG4gICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ3RleHQvY3NzOyBjaGFyc2V0PVVURi04Jyk7XG4gIH0gZWxzZSBpZiAoaW5mby50eXBlID09PSAnanNvbicpIHtcbiAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD1VVEYtOCcpO1xuICB9XG5cbiAgaWYgKGluZm8uaGFzaCkge1xuICAgIHJlcy5zZXRIZWFkZXIoJ0VUYWcnLCAnXCInICsgaW5mby5oYXNoICsgJ1wiJyk7XG4gIH1cblxuICBpZiAoaW5mby5jb250ZW50KSB7XG4gICAgcmVzLnNldEhlYWRlcignQ29udGVudC1MZW5ndGgnLCBCdWZmZXIuYnl0ZUxlbmd0aChpbmZvLmNvbnRlbnQpKTtcbiAgICByZXMud3JpdGUoaW5mby5jb250ZW50KTtcbiAgICByZXMuZW5kKCk7XG4gIH0gZWxzZSB7XG4gICAgc2VuZChyZXEsIGluZm8uYWJzb2x1dGVQYXRoLCB7XG4gICAgICBtYXhhZ2U6IG1heEFnZSxcbiAgICAgIGRvdGZpbGVzOiAnYWxsb3cnLCAvLyBpZiB3ZSBzcGVjaWZpZWQgYSBkb3RmaWxlIGluIHRoZSBtYW5pZmVzdCwgc2VydmUgaXRcbiAgICAgIGxhc3RNb2RpZmllZDogZmFsc2UsIC8vIGRvbid0IHNldCBsYXN0LW1vZGlmaWVkIGJhc2VkIG9uIHRoZSBmaWxlIGRhdGVcbiAgICB9KVxuICAgICAgLm9uKCdlcnJvcicsIGZ1bmN0aW9uKGVycikge1xuICAgICAgICBMb2cuZXJyb3IoJ0Vycm9yIHNlcnZpbmcgc3RhdGljIGZpbGUgJyArIGVycik7XG4gICAgICAgIHJlcy53cml0ZUhlYWQoNTAwKTtcbiAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgfSlcbiAgICAgIC5vbignZGlyZWN0b3J5JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIExvZy5lcnJvcignVW5leHBlY3RlZCBkaXJlY3RvcnkgJyArIGluZm8uYWJzb2x1dGVQYXRoKTtcbiAgICAgICAgcmVzLndyaXRlSGVhZCg1MDApO1xuICAgICAgICByZXMuZW5kKCk7XG4gICAgICB9KVxuICAgICAgLnBpcGUocmVzKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gZ2V0U3RhdGljRmlsZUluZm8oc3RhdGljRmlsZXNCeUFyY2gsIG9yaWdpbmFsUGF0aCwgcGF0aCwgYXJjaCkge1xuICBpZiAoIWhhc093bi5jYWxsKFdlYkFwcC5jbGllbnRQcm9ncmFtcywgYXJjaCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIEdldCBhIGxpc3Qgb2YgYWxsIGF2YWlsYWJsZSBzdGF0aWMgZmlsZSBhcmNoaXRlY3R1cmVzLCB3aXRoIGFyY2hcbiAgLy8gZmlyc3QgaW4gdGhlIGxpc3QgaWYgaXQgZXhpc3RzLlxuICBjb25zdCBzdGF0aWNBcmNoTGlzdCA9IE9iamVjdC5rZXlzKHN0YXRpY0ZpbGVzQnlBcmNoKTtcbiAgY29uc3QgYXJjaEluZGV4ID0gc3RhdGljQXJjaExpc3QuaW5kZXhPZihhcmNoKTtcbiAgaWYgKGFyY2hJbmRleCA+IDApIHtcbiAgICBzdGF0aWNBcmNoTGlzdC51bnNoaWZ0KHN0YXRpY0FyY2hMaXN0LnNwbGljZShhcmNoSW5kZXgsIDEpWzBdKTtcbiAgfVxuXG4gIGxldCBpbmZvID0gbnVsbDtcblxuICBzdGF0aWNBcmNoTGlzdC5zb21lKGFyY2ggPT4ge1xuICAgIGNvbnN0IHN0YXRpY0ZpbGVzID0gc3RhdGljRmlsZXNCeUFyY2hbYXJjaF07XG5cbiAgICBmdW5jdGlvbiBmaW5hbGl6ZShwYXRoKSB7XG4gICAgICBpbmZvID0gc3RhdGljRmlsZXNbcGF0aF07XG4gICAgICAvLyBTb21ldGltZXMgd2UgcmVnaXN0ZXIgYSBsYXp5IGZ1bmN0aW9uIGluc3RlYWQgb2YgYWN0dWFsIGRhdGEgaW5cbiAgICAgIC8vIHRoZSBzdGF0aWNGaWxlcyBtYW5pZmVzdC5cbiAgICAgIGlmICh0eXBlb2YgaW5mbyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBpbmZvID0gc3RhdGljRmlsZXNbcGF0aF0gPSBpbmZvKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gaW5mbztcbiAgICB9XG5cbiAgICAvLyBJZiBzdGF0aWNGaWxlcyBjb250YWlucyBvcmlnaW5hbFBhdGggd2l0aCB0aGUgYXJjaCBpbmZlcnJlZCBhYm92ZSxcbiAgICAvLyB1c2UgdGhhdCBpbmZvcm1hdGlvbi5cbiAgICBpZiAoaGFzT3duLmNhbGwoc3RhdGljRmlsZXMsIG9yaWdpbmFsUGF0aCkpIHtcbiAgICAgIHJldHVybiBmaW5hbGl6ZShvcmlnaW5hbFBhdGgpO1xuICAgIH1cblxuICAgIC8vIElmIGNhdGVnb3JpemVSZXF1ZXN0IHJldHVybmVkIGFuIGFsdGVybmF0ZSBwYXRoLCB0cnkgdGhhdCBpbnN0ZWFkLlxuICAgIGlmIChwYXRoICE9PSBvcmlnaW5hbFBhdGggJiYgaGFzT3duLmNhbGwoc3RhdGljRmlsZXMsIHBhdGgpKSB7XG4gICAgICByZXR1cm4gZmluYWxpemUocGF0aCk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gaW5mbztcbn1cblxuLy8gUGFyc2UgdGhlIHBhc3NlZCBpbiBwb3J0IHZhbHVlLiBSZXR1cm4gdGhlIHBvcnQgYXMtaXMgaWYgaXQncyBhIFN0cmluZ1xuLy8gKGUuZy4gYSBXaW5kb3dzIFNlcnZlciBzdHlsZSBuYW1lZCBwaXBlKSwgb3RoZXJ3aXNlIHJldHVybiB0aGUgcG9ydCBhcyBhblxuLy8gaW50ZWdlci5cbi8vXG4vLyBERVBSRUNBVEVEOiBEaXJlY3QgdXNlIG9mIHRoaXMgZnVuY3Rpb24gaXMgbm90IHJlY29tbWVuZGVkOyBpdCBpcyBub1xuLy8gbG9uZ2VyIHVzZWQgaW50ZXJuYWxseSwgYW5kIHdpbGwgYmUgcmVtb3ZlZCBpbiBhIGZ1dHVyZSByZWxlYXNlLlxuV2ViQXBwSW50ZXJuYWxzLnBhcnNlUG9ydCA9IHBvcnQgPT4ge1xuICBsZXQgcGFyc2VkUG9ydCA9IHBhcnNlSW50KHBvcnQpO1xuICBpZiAoTnVtYmVyLmlzTmFOKHBhcnNlZFBvcnQpKSB7XG4gICAgcGFyc2VkUG9ydCA9IHBvcnQ7XG4gIH1cbiAgcmV0dXJuIHBhcnNlZFBvcnQ7XG59O1xuXG5pbXBvcnQgeyBvbk1lc3NhZ2UgfSBmcm9tICdtZXRlb3IvaW50ZXItcHJvY2Vzcy1tZXNzYWdpbmcnO1xuXG5vbk1lc3NhZ2UoJ3dlYmFwcC1wYXVzZS1jbGllbnQnLCBhc3luYyAoeyBhcmNoIH0pID0+IHtcbiAgYXdhaXQgV2ViQXBwSW50ZXJuYWxzLnBhdXNlQ2xpZW50KGFyY2gpO1xufSk7XG5cbm9uTWVzc2FnZSgnd2ViYXBwLXJlbG9hZC1jbGllbnQnLCBhc3luYyAoeyBhcmNoIH0pID0+IHtcbiAgYXdhaXQgV2ViQXBwSW50ZXJuYWxzLmdlbmVyYXRlQ2xpZW50UHJvZ3JhbShhcmNoKTtcbn0pO1xuXG5hc3luYyBmdW5jdGlvbiBydW5XZWJBcHBTZXJ2ZXIoKSB7XG4gIHZhciBzaHV0dGluZ0Rvd24gPSBmYWxzZTtcbiAgdmFyIHN5bmNRdWV1ZSA9IG5ldyBNZXRlb3IuX0FzeW5jaHJvbm91c1F1ZXVlKCk7XG5cbiAgdmFyIGdldEl0ZW1QYXRobmFtZSA9IGZ1bmN0aW9uKGl0ZW1VcmwpIHtcbiAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHBhcnNlVXJsKGl0ZW1VcmwpLnBhdGhuYW1lKTtcbiAgfTtcblxuICBXZWJBcHBJbnRlcm5hbHMucmVsb2FkQ2xpZW50UHJvZ3JhbXMgPSBhc3luYyBmdW5jdGlvbigpIHtcbiAgICBhd2FpdCBzeW5jUXVldWUucnVuVGFzayhmdW5jdGlvbigpIHtcbiAgICAgIGNvbnN0IHN0YXRpY0ZpbGVzQnlBcmNoID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgICAgY29uc3QgeyBjb25maWdKc29uIH0gPSBfX21ldGVvcl9ib290c3RyYXBfXztcbiAgICAgIGNvbnN0IGNsaWVudEFyY2hzID1cbiAgICAgICAgY29uZmlnSnNvbi5jbGllbnRBcmNocyB8fCBPYmplY3Qua2V5cyhjb25maWdKc29uLmNsaWVudFBhdGhzKTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgY2xpZW50QXJjaHMuZm9yRWFjaChhcmNoID0+IHtcbiAgICAgICAgICBnZW5lcmF0ZUNsaWVudFByb2dyYW0oYXJjaCwgc3RhdGljRmlsZXNCeUFyY2gpO1xuICAgICAgICB9KTtcbiAgICAgICAgV2ViQXBwSW50ZXJuYWxzLnN0YXRpY0ZpbGVzQnlBcmNoID0gc3RhdGljRmlsZXNCeUFyY2g7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIExvZy5lcnJvcignRXJyb3IgcmVsb2FkaW5nIHRoZSBjbGllbnQgcHJvZ3JhbTogJyArIGUuc3RhY2spO1xuICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gUGF1c2UgYW55IGluY29taW5nIHJlcXVlc3RzIGFuZCBtYWtlIHRoZW0gd2FpdCBmb3IgdGhlIHByb2dyYW0gdG8gYmVcbiAgLy8gdW5wYXVzZWQgdGhlIG5leHQgdGltZSBnZW5lcmF0ZUNsaWVudFByb2dyYW0oYXJjaCkgaXMgY2FsbGVkLlxuICBXZWJBcHBJbnRlcm5hbHMucGF1c2VDbGllbnQgPSBhc3luYyBmdW5jdGlvbihhcmNoKSB7XG4gICAgYXdhaXQgc3luY1F1ZXVlLnJ1blRhc2soKCkgPT4ge1xuICAgICAgY29uc3QgcHJvZ3JhbSA9IFdlYkFwcC5jbGllbnRQcm9ncmFtc1thcmNoXTtcbiAgICAgIGNvbnN0IHsgdW5wYXVzZSB9ID0gcHJvZ3JhbTtcbiAgICAgIHByb2dyYW0ucGF1c2VkID0gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgdW5wYXVzZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIC8vIElmIHRoZXJlIGhhcHBlbnMgdG8gYmUgYW4gZXhpc3RpbmcgcHJvZ3JhbS51bnBhdXNlIGZ1bmN0aW9uLFxuICAgICAgICAgIC8vIGNvbXBvc2UgaXQgd2l0aCB0aGUgcmVzb2x2ZSBmdW5jdGlvbi5cbiAgICAgICAgICBwcm9ncmFtLnVucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHVucGF1c2UoKTtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHByb2dyYW0udW5wYXVzZSA9IHJlc29sdmU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xuXG4gIFdlYkFwcEludGVybmFscy5nZW5lcmF0ZUNsaWVudFByb2dyYW0gPSBhc3luYyBmdW5jdGlvbihhcmNoKSB7XG4gICAgYXdhaXQgc3luY1F1ZXVlLnJ1blRhc2soKCkgPT4gZ2VuZXJhdGVDbGllbnRQcm9ncmFtKGFyY2gpKTtcbiAgfTtcblxuICBmdW5jdGlvbiBnZW5lcmF0ZUNsaWVudFByb2dyYW0oXG4gICAgYXJjaCxcbiAgICBzdGF0aWNGaWxlc0J5QXJjaCA9IFdlYkFwcEludGVybmFscy5zdGF0aWNGaWxlc0J5QXJjaFxuICApIHtcbiAgICBjb25zdCBjbGllbnREaXIgPSBwYXRoSm9pbihcbiAgICAgIHBhdGhEaXJuYW1lKF9fbWV0ZW9yX2Jvb3RzdHJhcF9fLnNlcnZlckRpciksXG4gICAgICBhcmNoXG4gICAgKTtcblxuICAgIC8vIHJlYWQgdGhlIGNvbnRyb2wgZm9yIHRoZSBjbGllbnQgd2UnbGwgYmUgc2VydmluZyB1cFxuICAgIGNvbnN0IHByb2dyYW1Kc29uUGF0aCA9IHBhdGhKb2luKGNsaWVudERpciwgJ3Byb2dyYW0uanNvbicpO1xuXG4gICAgbGV0IHByb2dyYW1Kc29uO1xuICAgIHRyeSB7XG4gICAgICBwcm9ncmFtSnNvbiA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKHByb2dyYW1Kc29uUGF0aCkpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlLmNvZGUgPT09ICdFTk9FTlQnKSByZXR1cm47XG4gICAgICB0aHJvdyBlO1xuICAgIH1cblxuICAgIGlmIChwcm9ncmFtSnNvbi5mb3JtYXQgIT09ICd3ZWItcHJvZ3JhbS1wcmUxJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnVW5zdXBwb3J0ZWQgZm9ybWF0IGZvciBjbGllbnQgYXNzZXRzOiAnICtcbiAgICAgICAgICBKU09OLnN0cmluZ2lmeShwcm9ncmFtSnNvbi5mb3JtYXQpXG4gICAgICApO1xuICAgIH1cblxuICAgIGlmICghcHJvZ3JhbUpzb25QYXRoIHx8ICFjbGllbnREaXIgfHwgIXByb2dyYW1Kc29uKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NsaWVudCBjb25maWcgZmlsZSBub3QgcGFyc2VkLicpO1xuICAgIH1cblxuICAgIGFyY2hQYXRoW2FyY2hdID0gY2xpZW50RGlyO1xuICAgIGNvbnN0IHN0YXRpY0ZpbGVzID0gKHN0YXRpY0ZpbGVzQnlBcmNoW2FyY2hdID0gT2JqZWN0LmNyZWF0ZShudWxsKSk7XG5cbiAgICBjb25zdCB7IG1hbmlmZXN0IH0gPSBwcm9ncmFtSnNvbjtcbiAgICBtYW5pZmVzdC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgaWYgKGl0ZW0udXJsICYmIGl0ZW0ud2hlcmUgPT09ICdjbGllbnQnKSB7XG4gICAgICAgIHN0YXRpY0ZpbGVzW2dldEl0ZW1QYXRobmFtZShpdGVtLnVybCldID0ge1xuICAgICAgICAgIGFic29sdXRlUGF0aDogcGF0aEpvaW4oY2xpZW50RGlyLCBpdGVtLnBhdGgpLFxuICAgICAgICAgIGNhY2hlYWJsZTogaXRlbS5jYWNoZWFibGUsXG4gICAgICAgICAgaGFzaDogaXRlbS5oYXNoLFxuICAgICAgICAgIC8vIExpbmsgZnJvbSBzb3VyY2UgdG8gaXRzIG1hcFxuICAgICAgICAgIHNvdXJjZU1hcFVybDogaXRlbS5zb3VyY2VNYXBVcmwsXG4gICAgICAgICAgdHlwZTogaXRlbS50eXBlLFxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChpdGVtLnNvdXJjZU1hcCkge1xuICAgICAgICAgIC8vIFNlcnZlIHRoZSBzb3VyY2UgbWFwIHRvbywgdW5kZXIgdGhlIHNwZWNpZmllZCBVUkwuIFdlIGFzc3VtZVxuICAgICAgICAgIC8vIGFsbCBzb3VyY2UgbWFwcyBhcmUgY2FjaGVhYmxlLlxuICAgICAgICAgIHN0YXRpY0ZpbGVzW2dldEl0ZW1QYXRobmFtZShpdGVtLnNvdXJjZU1hcFVybCldID0ge1xuICAgICAgICAgICAgYWJzb2x1dGVQYXRoOiBwYXRoSm9pbihjbGllbnREaXIsIGl0ZW0uc291cmNlTWFwKSxcbiAgICAgICAgICAgIGNhY2hlYWJsZTogdHJ1ZSxcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCB7IFBVQkxJQ19TRVRUSU5HUyB9ID0gX19tZXRlb3JfcnVudGltZV9jb25maWdfXztcbiAgICBjb25zdCBjb25maWdPdmVycmlkZXMgPSB7XG4gICAgICBQVUJMSUNfU0VUVElOR1MsXG4gICAgfTtcblxuICAgIGNvbnN0IG9sZFByb2dyYW0gPSBXZWJBcHAuY2xpZW50UHJvZ3JhbXNbYXJjaF07XG4gICAgY29uc3QgbmV3UHJvZ3JhbSA9IChXZWJBcHAuY2xpZW50UHJvZ3JhbXNbYXJjaF0gPSB7XG4gICAgICBmb3JtYXQ6ICd3ZWItcHJvZ3JhbS1wcmUxJyxcbiAgICAgIG1hbmlmZXN0OiBtYW5pZmVzdCxcbiAgICAgIC8vIFVzZSBhcnJvdyBmdW5jdGlvbnMgc28gdGhhdCB0aGVzZSB2ZXJzaW9ucyBjYW4gYmUgbGF6aWx5XG4gICAgICAvLyBjYWxjdWxhdGVkIGxhdGVyLCBhbmQgc28gdGhhdCB0aGV5IHdpbGwgbm90IGJlIGluY2x1ZGVkIGluIHRoZVxuICAgICAgLy8gc3RhdGljRmlsZXNbbWFuaWZlc3RVcmxdLmNvbnRlbnQgc3RyaW5nIGJlbG93LlxuICAgICAgLy9cbiAgICAgIC8vIE5vdGU6IHRoZXNlIHZlcnNpb24gY2FsY3VsYXRpb25zIG11c3QgYmUga2VwdCBpbiBhZ3JlZW1lbnQgd2l0aFxuICAgICAgLy8gQ29yZG92YUJ1aWxkZXIjYXBwZW5kVmVyc2lvbiBpbiB0b29scy9jb3Jkb3ZhL2J1aWxkZXIuanMsIG9yIGhvdFxuICAgICAgLy8gY29kZSBwdXNoIHdpbGwgcmVsb2FkIENvcmRvdmEgYXBwcyB1bm5lY2Vzc2FyaWx5LlxuICAgICAgdmVyc2lvbjogKCkgPT5cbiAgICAgICAgV2ViQXBwSGFzaGluZy5jYWxjdWxhdGVDbGllbnRIYXNoKG1hbmlmZXN0LCBudWxsLCBjb25maWdPdmVycmlkZXMpLFxuICAgICAgdmVyc2lvblJlZnJlc2hhYmxlOiAoKSA9PlxuICAgICAgICBXZWJBcHBIYXNoaW5nLmNhbGN1bGF0ZUNsaWVudEhhc2goXG4gICAgICAgICAgbWFuaWZlc3QsXG4gICAgICAgICAgdHlwZSA9PiB0eXBlID09PSAnY3NzJyxcbiAgICAgICAgICBjb25maWdPdmVycmlkZXNcbiAgICAgICAgKSxcbiAgICAgIHZlcnNpb25Ob25SZWZyZXNoYWJsZTogKCkgPT5cbiAgICAgICAgV2ViQXBwSGFzaGluZy5jYWxjdWxhdGVDbGllbnRIYXNoKFxuICAgICAgICAgIG1hbmlmZXN0LFxuICAgICAgICAgICh0eXBlLCByZXBsYWNlYWJsZSkgPT4gdHlwZSAhPT0gJ2NzcycgJiYgIXJlcGxhY2VhYmxlLFxuICAgICAgICAgIGNvbmZpZ092ZXJyaWRlc1xuICAgICAgICApLFxuICAgICAgdmVyc2lvblJlcGxhY2VhYmxlOiAoKSA9PlxuICAgICAgICBXZWJBcHBIYXNoaW5nLmNhbGN1bGF0ZUNsaWVudEhhc2goXG4gICAgICAgICAgbWFuaWZlc3QsXG4gICAgICAgICAgKF90eXBlLCByZXBsYWNlYWJsZSkgPT4gcmVwbGFjZWFibGUsXG4gICAgICAgICAgY29uZmlnT3ZlcnJpZGVzXG4gICAgICAgICksXG4gICAgICBjb3Jkb3ZhQ29tcGF0aWJpbGl0eVZlcnNpb25zOiBwcm9ncmFtSnNvbi5jb3Jkb3ZhQ29tcGF0aWJpbGl0eVZlcnNpb25zLFxuICAgICAgUFVCTElDX1NFVFRJTkdTLFxuICAgICAgaG1yVmVyc2lvbjogcHJvZ3JhbUpzb24uaG1yVmVyc2lvbixcbiAgICB9KTtcblxuICAgIC8vIEV4cG9zZSBwcm9ncmFtIGRldGFpbHMgYXMgYSBzdHJpbmcgcmVhY2hhYmxlIHZpYSB0aGUgZm9sbG93aW5nIFVSTC5cbiAgICBjb25zdCBtYW5pZmVzdFVybFByZWZpeCA9ICcvX18nICsgYXJjaC5yZXBsYWNlKC9ed2ViXFwuLywgJycpO1xuICAgIGNvbnN0IG1hbmlmZXN0VXJsID0gbWFuaWZlc3RVcmxQcmVmaXggKyBnZXRJdGVtUGF0aG5hbWUoJy9tYW5pZmVzdC5qc29uJyk7XG5cbiAgICBzdGF0aWNGaWxlc1ttYW5pZmVzdFVybF0gPSAoKSA9PiB7XG4gICAgICBpZiAoUGFja2FnZS5hdXRvdXBkYXRlKSB7XG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICBBVVRPVVBEQVRFX1ZFUlNJT04gPSBQYWNrYWdlLmF1dG91cGRhdGUuQXV0b3VwZGF0ZS5hdXRvdXBkYXRlVmVyc2lvbixcbiAgICAgICAgfSA9IHByb2Nlc3MuZW52O1xuXG4gICAgICAgIGlmIChBVVRPVVBEQVRFX1ZFUlNJT04pIHtcbiAgICAgICAgICBuZXdQcm9ncmFtLnZlcnNpb24gPSBBVVRPVVBEQVRFX1ZFUlNJT047XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBuZXdQcm9ncmFtLnZlcnNpb24gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgbmV3UHJvZ3JhbS52ZXJzaW9uID0gbmV3UHJvZ3JhbS52ZXJzaW9uKCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvbnRlbnQ6IEpTT04uc3RyaW5naWZ5KG5ld1Byb2dyYW0pLFxuICAgICAgICBjYWNoZWFibGU6IGZhbHNlLFxuICAgICAgICBoYXNoOiBuZXdQcm9ncmFtLnZlcnNpb24sXG4gICAgICAgIHR5cGU6ICdqc29uJyxcbiAgICAgIH07XG4gICAgfTtcblxuICAgIGdlbmVyYXRlQm9pbGVycGxhdGVGb3JBcmNoKGFyY2gpO1xuXG4gICAgLy8gSWYgdGhlcmUgYXJlIGFueSByZXF1ZXN0cyB3YWl0aW5nIG9uIG9sZFByb2dyYW0ucGF1c2VkLCBsZXQgdGhlbVxuICAgIC8vIGNvbnRpbnVlIG5vdyAodXNpbmcgdGhlIG5ldyBwcm9ncmFtKS5cbiAgICBpZiAob2xkUHJvZ3JhbSAmJiBvbGRQcm9ncmFtLnBhdXNlZCkge1xuICAgICAgb2xkUHJvZ3JhbS51bnBhdXNlKCk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgZGVmYXVsdE9wdGlvbnNGb3JBcmNoID0ge1xuICAgICd3ZWIuY29yZG92YSc6IHtcbiAgICAgIHJ1bnRpbWVDb25maWdPdmVycmlkZXM6IHtcbiAgICAgICAgLy8gWFhYIFdlIHVzZSBhYnNvbHV0ZVVybCgpIGhlcmUgc28gdGhhdCB3ZSBzZXJ2ZSBodHRwczovL1xuICAgICAgICAvLyBVUkxzIHRvIGNvcmRvdmEgY2xpZW50cyBpZiBmb3JjZS1zc2wgaXMgaW4gdXNlLiBJZiB3ZSB3ZXJlXG4gICAgICAgIC8vIHRvIHVzZSBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMIGluc3RlYWQgb2ZcbiAgICAgICAgLy8gYWJzb2x1dGVVcmwoKSwgdGhlbiBDb3Jkb3ZhIGNsaWVudHMgd291bGQgaW1tZWRpYXRlbHkgZ2V0IGFcbiAgICAgICAgLy8gSENQIHNldHRpbmcgdGhlaXIgRERQX0RFRkFVTFRfQ09OTkVDVElPTl9VUkwgdG9cbiAgICAgICAgLy8gaHR0cDovL2V4YW1wbGUubWV0ZW9yLmNvbS4gVGhpcyBicmVha3MgdGhlIGFwcCwgYmVjYXVzZVxuICAgICAgICAvLyBmb3JjZS1zc2wgZG9lc24ndCBzZXJ2ZSBDT1JTIGhlYWRlcnMgb24gMzAyXG4gICAgICAgIC8vIHJlZGlyZWN0cy4gKFBsdXMgaXQncyB1bmRlc2lyYWJsZSB0byBoYXZlIGNsaWVudHNcbiAgICAgICAgLy8gY29ubmVjdGluZyB0byBodHRwOi8vZXhhbXBsZS5tZXRlb3IuY29tIHdoZW4gZm9yY2Utc3NsIGlzXG4gICAgICAgIC8vIGluIHVzZS4pXG4gICAgICAgIEREUF9ERUZBVUxUX0NPTk5FQ1RJT05fVVJMOlxuICAgICAgICAgIHByb2Nlc3MuZW52Lk1PQklMRV9ERFBfVVJMIHx8IE1ldGVvci5hYnNvbHV0ZVVybCgpLFxuICAgICAgICBST09UX1VSTDogcHJvY2Vzcy5lbnYuTU9CSUxFX1JPT1RfVVJMIHx8IE1ldGVvci5hYnNvbHV0ZVVybCgpLFxuICAgICAgfSxcbiAgICB9LFxuXG4gICAgJ3dlYi5icm93c2VyJzoge1xuICAgICAgcnVudGltZUNvbmZpZ092ZXJyaWRlczoge1xuICAgICAgICBpc01vZGVybjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSxcblxuICAgICd3ZWIuYnJvd3Nlci5sZWdhY3knOiB7XG4gICAgICBydW50aW1lQ29uZmlnT3ZlcnJpZGVzOiB7XG4gICAgICAgIGlzTW9kZXJuOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcblxuICBXZWJBcHBJbnRlcm5hbHMuZ2VuZXJhdGVCb2lsZXJwbGF0ZSA9IGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgIC8vIFRoaXMgYm9pbGVycGxhdGUgd2lsbCBiZSBzZXJ2ZWQgdG8gdGhlIG1vYmlsZSBkZXZpY2VzIHdoZW4gdXNlZCB3aXRoXG4gICAgLy8gTWV0ZW9yL0NvcmRvdmEgZm9yIHRoZSBIb3QtQ29kZSBQdXNoIGFuZCBzaW5jZSB0aGUgZmlsZSB3aWxsIGJlIHNlcnZlZCBieVxuICAgIC8vIHRoZSBkZXZpY2UncyBzZXJ2ZXIsIGl0IGlzIGltcG9ydGFudCB0byBzZXQgdGhlIEREUCB1cmwgdG8gdGhlIGFjdHVhbFxuICAgIC8vIE1ldGVvciBzZXJ2ZXIgYWNjZXB0aW5nIEREUCBjb25uZWN0aW9ucyBhbmQgbm90IHRoZSBkZXZpY2UncyBmaWxlIHNlcnZlci5cbiAgICBhd2FpdCBzeW5jUXVldWUucnVuVGFzayhmdW5jdGlvbigpIHtcbiAgICAgIE9iamVjdC5rZXlzKFdlYkFwcC5jbGllbnRQcm9ncmFtcykuZm9yRWFjaChnZW5lcmF0ZUJvaWxlcnBsYXRlRm9yQXJjaCk7XG4gICAgfSk7XG4gIH07XG5cbiAgZnVuY3Rpb24gZ2VuZXJhdGVCb2lsZXJwbGF0ZUZvckFyY2goYXJjaCkge1xuICAgIGNvbnN0IHByb2dyYW0gPSBXZWJBcHAuY2xpZW50UHJvZ3JhbXNbYXJjaF07XG4gICAgY29uc3QgYWRkaXRpb25hbE9wdGlvbnMgPSBkZWZhdWx0T3B0aW9uc0ZvckFyY2hbYXJjaF0gfHwge307XG4gICAgY29uc3QgeyBiYXNlRGF0YSB9ID0gKGJvaWxlcnBsYXRlQnlBcmNoW1xuICAgICAgYXJjaFxuICAgIF0gPSBXZWJBcHBJbnRlcm5hbHMuZ2VuZXJhdGVCb2lsZXJwbGF0ZUluc3RhbmNlKFxuICAgICAgYXJjaCxcbiAgICAgIHByb2dyYW0ubWFuaWZlc3QsXG4gICAgICBhZGRpdGlvbmFsT3B0aW9uc1xuICAgICkpO1xuICAgIC8vIFdlIG5lZWQgdGhlIHJ1bnRpbWUgY29uZmlnIHdpdGggb3ZlcnJpZGVzIGZvciBtZXRlb3JfcnVudGltZV9jb25maWcuanM6XG4gICAgcHJvZ3JhbS5tZXRlb3JSdW50aW1lQ29uZmlnID0gSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgLi4uX19tZXRlb3JfcnVudGltZV9jb25maWdfXyxcbiAgICAgIC4uLihhZGRpdGlvbmFsT3B0aW9ucy5ydW50aW1lQ29uZmlnT3ZlcnJpZGVzIHx8IG51bGwpLFxuICAgIH0pO1xuICAgIHByb2dyYW0ucmVmcmVzaGFibGVBc3NldHMgPSBiYXNlRGF0YS5jc3MubWFwKGZpbGUgPT4gKHtcbiAgICAgIHVybDogYnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2soZmlsZS51cmwpLFxuICAgIH0pKTtcbiAgfVxuXG4gIGF3YWl0IFdlYkFwcEludGVybmFscy5yZWxvYWRDbGllbnRQcm9ncmFtcygpO1xuXG4gIC8vIHdlYnNlcnZlclxuICB2YXIgYXBwID0gY3JlYXRlRXhwcmVzc0FwcCgpXG5cbiAgLy8gUGFja2FnZXMgYW5kIGFwcHMgY2FuIGFkZCBoYW5kbGVycyB0aGF0IHJ1biBiZWZvcmUgYW55IG90aGVyIE1ldGVvclxuICAvLyBoYW5kbGVycyB2aWEgV2ViQXBwLnJhd0V4cHJlc3NIYW5kbGVycy5cbiAgdmFyIHJhd0V4cHJlc3NIYW5kbGVycyA9IGNyZWF0ZUV4cHJlc3NBcHAoKVxuICBhcHAudXNlKHJhd0V4cHJlc3NIYW5kbGVycyk7XG5cbiAgLy8gQXV0by1jb21wcmVzcyBhbnkganNvbiwgamF2YXNjcmlwdCwgb3IgdGV4dC5cbiAgYXBwLnVzZShjb21wcmVzcyh7IGZpbHRlcjogc2hvdWxkQ29tcHJlc3MgfSkpO1xuXG4gIC8vIHBhcnNlIGNvb2tpZXMgaW50byBhbiBvYmplY3RcbiAgYXBwLnVzZShjb29raWVQYXJzZXIoKSk7XG5cbiAgLy8gV2UncmUgbm90IGEgcHJveHk7IHJlamVjdCAod2l0aG91dCBjcmFzaGluZykgYXR0ZW1wdHMgdG8gdHJlYXQgdXMgbGlrZVxuICAvLyBvbmUuIChTZWUgIzEyMTIuKVxuICBhcHAudXNlKGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgaWYgKFJvdXRlUG9saWN5LmlzVmFsaWRVcmwocmVxLnVybCkpIHtcbiAgICAgIG5leHQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgIHJlcy53cml0ZSgnTm90IGEgcHJveHknKTtcbiAgICByZXMuZW5kKCk7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGdldFBhdGhQYXJ0cyhwYXRoKSB7XG4gICAgY29uc3QgcGFydHMgPSBwYXRoLnNwbGl0KCcvJyk7XG4gICAgd2hpbGUgKHBhcnRzWzBdID09PSAnJykgcGFydHMuc2hpZnQoKTtcbiAgICByZXR1cm4gcGFydHM7XG4gIH1cblxuICBmdW5jdGlvbiBpc1ByZWZpeE9mKHByZWZpeCwgYXJyYXkpIHtcbiAgICByZXR1cm4gKFxuICAgICAgcHJlZml4Lmxlbmd0aCA8PSBhcnJheS5sZW5ndGggJiZcbiAgICAgIHByZWZpeC5ldmVyeSgocGFydCwgaSkgPT4gcGFydCA9PT0gYXJyYXlbaV0pXG4gICAgKTtcbiAgfVxuXG4gIC8vIFN0cmlwIG9mZiB0aGUgcGF0aCBwcmVmaXgsIGlmIGl0IGV4aXN0cy5cbiAgYXBwLnVzZShmdW5jdGlvbihyZXF1ZXN0LCByZXNwb25zZSwgbmV4dCkge1xuICAgIGNvbnN0IHBhdGhQcmVmaXggPSBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYO1xuICAgIGNvbnN0IHsgcGF0aG5hbWUsIHNlYXJjaCB9ID0gcGFyc2VVcmwocmVxdWVzdC51cmwpO1xuXG4gICAgLy8gY2hlY2sgaWYgdGhlIHBhdGggaW4gdGhlIHVybCBzdGFydHMgd2l0aCB0aGUgcGF0aCBwcmVmaXhcbiAgICBpZiAocGF0aFByZWZpeCkge1xuICAgICAgY29uc3QgcHJlZml4UGFydHMgPSBnZXRQYXRoUGFydHMocGF0aFByZWZpeCk7XG4gICAgICBjb25zdCBwYXRoUGFydHMgPSBnZXRQYXRoUGFydHMocGF0aG5hbWUpO1xuICAgICAgaWYgKGlzUHJlZml4T2YocHJlZml4UGFydHMsIHBhdGhQYXJ0cykpIHtcbiAgICAgICAgcmVxdWVzdC51cmwgPSAnLycgKyBwYXRoUGFydHMuc2xpY2UocHJlZml4UGFydHMubGVuZ3RoKS5qb2luKCcvJyk7XG4gICAgICAgIGlmIChzZWFyY2gpIHtcbiAgICAgICAgICByZXF1ZXN0LnVybCArPSBzZWFyY2g7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocGF0aG5hbWUgPT09ICcvZmF2aWNvbi5pY28nIHx8IHBhdGhuYW1lID09PSAnL3JvYm90cy50eHQnKSB7XG4gICAgICByZXR1cm4gbmV4dCgpO1xuICAgIH1cblxuICAgIGlmIChwYXRoUHJlZml4KSB7XG4gICAgICByZXNwb25zZS53cml0ZUhlYWQoNDA0KTtcbiAgICAgIHJlc3BvbnNlLndyaXRlKCdVbmtub3duIHBhdGgnKTtcbiAgICAgIHJlc3BvbnNlLmVuZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIG5leHQoKTtcbiAgfSk7XG5cbiAgLy8gU2VydmUgc3RhdGljIGZpbGVzIGZyb20gdGhlIG1hbmlmZXN0LlxuICAvLyBUaGlzIGlzIGluc3BpcmVkIGJ5IHRoZSAnc3RhdGljJyBtaWRkbGV3YXJlLlxuICBhcHAudXNlKGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgLy8gY29uc29sZS5sb2coU3RyaW5nKGFyZ3VtZW50cy5jYWxsZWUpKTtcbiAgICBXZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXNNaWRkbGV3YXJlKFxuICAgICAgV2ViQXBwSW50ZXJuYWxzLnN0YXRpY0ZpbGVzQnlBcmNoLFxuICAgICAgcmVxLFxuICAgICAgcmVzLFxuICAgICAgbmV4dFxuICAgICk7XG4gIH0pO1xuXG4gIC8vIENvcmUgTWV0ZW9yIHBhY2thZ2VzIGxpa2UgZHluYW1pYy1pbXBvcnQgY2FuIGFkZCBoYW5kbGVycyBiZWZvcmVcbiAgLy8gb3RoZXIgaGFuZGxlcnMgYWRkZWQgYnkgcGFja2FnZSBhbmQgYXBwbGljYXRpb24gY29kZS5cbiAgYXBwLnVzZSgoV2ViQXBwSW50ZXJuYWxzLm1ldGVvckludGVybmFsSGFuZGxlcnMgPSBjcmVhdGVFeHByZXNzQXBwKCkpKTtcblxuICAvKipcbiAgICogQG5hbWUgZXhwcmVzc0hhbmRsZXJzQ2FsbGJhY2socmVxLCByZXMsIG5leHQpXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQGlzcHJvdG90eXBlIHRydWVcbiAgICogQHN1bW1hcnkgY2FsbGJhY2sgaGFuZGxlciBmb3IgYFdlYkFwcC5leHByZXNzSGFuZGxlcnNgXG4gICAqIEBwYXJhbSB7T2JqZWN0fSByZXFcbiAgICogYSBOb2RlLmpzXG4gICAqIFtJbmNvbWluZ01lc3NhZ2VdKGh0dHBzOi8vbm9kZWpzLm9yZy9hcGkvaHR0cC5odG1sI2NsYXNzLWh0dHBpbmNvbWluZ21lc3NhZ2UpXG4gICAqIG9iamVjdCB3aXRoIHNvbWUgZXh0cmEgcHJvcGVydGllcy4gVGhpcyBhcmd1bWVudCBjYW4gYmUgdXNlZFxuICAgKiAgdG8gZ2V0IGluZm9ybWF0aW9uIGFib3V0IHRoZSBpbmNvbWluZyByZXF1ZXN0LlxuICAgKiBAcGFyYW0ge09iamVjdH0gcmVzXG4gICAqIGEgTm9kZS5qc1xuICAgKiBbU2VydmVyUmVzcG9uc2VdKGh0dHBzOi8vbm9kZWpzLm9yZy9hcGkvaHR0cC5odG1sI2NsYXNzLWh0dHBzZXJ2ZXJyZXNwb25zZSlcbiAgICogb2JqZWN0LiBVc2UgdGhpcyB0byB3cml0ZSBkYXRhIHRoYXQgc2hvdWxkIGJlIHNlbnQgaW4gcmVzcG9uc2UgdG8gdGhlXG4gICAqIHJlcXVlc3QsIGFuZCBjYWxsIGByZXMuZW5kKClgIHdoZW4geW91IGFyZSBkb25lLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBuZXh0XG4gICAqIENhbGxpbmcgdGhpcyBmdW5jdGlvbiB3aWxsIHBhc3Mgb24gdGhlIGhhbmRsaW5nIG9mXG4gICAqIHRoaXMgcmVxdWVzdCB0byB0aGUgbmV4dCByZWxldmFudCBoYW5kbGVyLlxuICAgKlxuICAgKi9cblxuICAvKipcbiAgICogQG1ldGhvZCBoYW5kbGVyc1xuICAgKiBAbWVtYmVyb2YgV2ViQXBwXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQHN1bW1hcnkgUmVnaXN0ZXIgYSBoYW5kbGVyIGZvciBhbGwgSFRUUCByZXF1ZXN0cy5cbiAgICogQHBhcmFtIHtTdHJpbmd9IFtwYXRoXVxuICAgKiBUaGlzIGhhbmRsZXIgd2lsbCBvbmx5IGJlIGNhbGxlZCBvbiBwYXRocyB0aGF0IG1hdGNoXG4gICAqIHRoaXMgc3RyaW5nLiBUaGUgbWF0Y2ggaGFzIHRvIGJvcmRlciBvbiBhIGAvYCBvciBhIGAuYC5cbiAgICpcbiAgICogRm9yIGV4YW1wbGUsIGAvaGVsbG9gIHdpbGwgbWF0Y2ggYC9oZWxsby93b3JsZGAgYW5kXG4gICAqIGAvaGVsbG8ud29ybGRgLCBidXQgbm90IGAvaGVsbG9fd29ybGRgLlxuICAgKiBAcGFyYW0ge2V4cHJlc3NIYW5kbGVyc0NhbGxiYWNrfSBoYW5kbGVyXG4gICAqIEEgaGFuZGxlciBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgY2FsbGVkIG9uIEhUVFAgcmVxdWVzdHMuXG4gICAqIFNlZSBgZXhwcmVzc0hhbmRsZXJzQ2FsbGJhY2tgXG4gICAqXG4gICAqL1xuICAvLyBQYWNrYWdlcyBhbmQgYXBwcyBjYW4gYWRkIGhhbmRsZXJzIHRvIHRoaXMgdmlhIFdlYkFwcC5leHByZXNzSGFuZGxlcnMuXG4gIC8vIFRoZXkgYXJlIGluc2VydGVkIGJlZm9yZSBvdXIgZGVmYXVsdCBoYW5kbGVyLlxuICB2YXIgcGFja2FnZUFuZEFwcEhhbmRsZXJzID0gY3JlYXRlRXhwcmVzc0FwcCgpXG4gIGFwcC51c2UocGFja2FnZUFuZEFwcEhhbmRsZXJzKTtcblxuICBsZXQgc3VwcHJlc3NFeHByZXNzRXJyb3JzID0gZmFsc2U7XG4gIC8vIEV4cHJlc3Mga25vd3MgaXQgaXMgYW4gZXJyb3IgaGFuZGxlciBiZWNhdXNlIGl0IGhhcyA0IGFyZ3VtZW50cyBpbnN0ZWFkIG9mXG4gIC8vIDMuIGdvIGZpZ3VyZS4gIChJdCBpcyBub3Qgc21hcnQgZW5vdWdoIHRvIGZpbmQgc3VjaCBhIHRoaW5nIGlmIGl0J3MgaGlkZGVuXG4gIC8vIGluc2lkZSBwYWNrYWdlQW5kQXBwSGFuZGxlcnMuKVxuICBhcHAudXNlKGZ1bmN0aW9uKGVyciwgcmVxLCByZXMsIG5leHQpIHtcbiAgICBpZiAoIWVyciB8fCAhc3VwcHJlc3NFeHByZXNzRXJyb3JzIHx8ICFyZXEuaGVhZGVyc1sneC1zdXBwcmVzcy1lcnJvciddKSB7XG4gICAgICBuZXh0KGVycik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJlcy53cml0ZUhlYWQoZXJyLnN0YXR1cywgeyAnQ29udGVudC1UeXBlJzogJ3RleHQvcGxhaW4nIH0pO1xuICAgIHJlcy5lbmQoJ0FuIGVycm9yIG1lc3NhZ2UnKTtcbiAgfSk7XG5cbiAgYXBwLnVzZShhc3luYyBmdW5jdGlvbihyZXEsIHJlcywgbmV4dCkge1xuICAgIGlmICghYXBwVXJsKHJlcS51cmwpKSB7XG4gICAgICByZXR1cm4gbmV4dCgpO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICByZXEubWV0aG9kICE9PSAnSEVBRCcgJiZcbiAgICAgIHJlcS5tZXRob2QgIT09ICdHRVQnICYmXG4gICAgICAhTWV0ZW9yLnNldHRpbmdzLnBhY2thZ2VzPy53ZWJhcHA/LmFsd2F5c1JldHVybkNvbnRlbnRcbiAgICApIHtcbiAgICAgIGNvbnN0IHN0YXR1cyA9IHJlcS5tZXRob2QgPT09ICdPUFRJT05TJyA/IDIwMCA6IDQwNTtcbiAgICAgIHJlcy53cml0ZUhlYWQoc3RhdHVzLCB7XG4gICAgICAgIEFsbG93OiAnT1BUSU9OUywgR0VULCBIRUFEJyxcbiAgICAgICAgJ0NvbnRlbnQtTGVuZ3RoJzogJzAnLFxuICAgICAgfSk7XG4gICAgICByZXMuZW5kKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBoZWFkZXJzID0ge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ3RleHQvaHRtbDsgY2hhcnNldD11dGYtOCcsXG4gICAgICB9O1xuXG4gICAgICBpZiAoc2h1dHRpbmdEb3duKSB7XG4gICAgICAgIGhlYWRlcnNbJ0Nvbm5lY3Rpb24nXSA9ICdDbG9zZSc7XG4gICAgICB9XG5cbiAgICAgIHZhciByZXF1ZXN0ID0gV2ViQXBwLmNhdGVnb3JpemVSZXF1ZXN0KHJlcSk7XG5cbiAgICAgIGlmIChyZXF1ZXN0LnVybC5xdWVyeSAmJiByZXF1ZXN0LnVybC5xdWVyeVsnbWV0ZW9yX2Nzc19yZXNvdXJjZSddKSB7XG4gICAgICAgIC8vIEluIHRoaXMgY2FzZSwgd2UncmUgcmVxdWVzdGluZyBhIENTUyByZXNvdXJjZSBpbiB0aGUgbWV0ZW9yLXNwZWNpZmljXG4gICAgICAgIC8vIHdheSwgYnV0IHdlIGRvbid0IGhhdmUgaXQuICBTZXJ2ZSBhIHN0YXRpYyBjc3MgZmlsZSB0aGF0IGluZGljYXRlcyB0aGF0XG4gICAgICAgIC8vIHdlIGRpZG4ndCBoYXZlIGl0LCBzbyB3ZSBjYW4gZGV0ZWN0IHRoYXQgYW5kIHJlZnJlc2guICBNYWtlIHN1cmVcbiAgICAgICAgLy8gdGhhdCBhbnkgcHJveGllcyBvciBDRE5zIGRvbid0IGNhY2hlIHRoaXMgZXJyb3IhICAoTm9ybWFsbHkgcHJveGllc1xuICAgICAgICAvLyBvciBDRE5zIGFyZSBzbWFydCBlbm91Z2ggbm90IHRvIGNhY2hlIGVycm9yIHBhZ2VzLCBidXQgaW4gb3JkZXIgdG9cbiAgICAgICAgLy8gbWFrZSB0aGlzIGhhY2sgd29yaywgd2UgbmVlZCB0byByZXR1cm4gdGhlIENTUyBmaWxlIGFzIGEgMjAwLCB3aGljaFxuICAgICAgICAvLyB3b3VsZCBvdGhlcndpc2UgYmUgY2FjaGVkLilcbiAgICAgICAgaGVhZGVyc1snQ29udGVudC1UeXBlJ10gPSAndGV4dC9jc3M7IGNoYXJzZXQ9dXRmLTgnO1xuICAgICAgICBoZWFkZXJzWydDYWNoZS1Db250cm9sJ10gPSAnbm8tY2FjaGUnO1xuICAgICAgICByZXMud3JpdGVIZWFkKDIwMCwgaGVhZGVycyk7XG4gICAgICAgIHJlcy53cml0ZSgnLm1ldGVvci1jc3Mtbm90LWZvdW5kLWVycm9yIHsgd2lkdGg6IDBweDt9Jyk7XG4gICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVxdWVzdC51cmwucXVlcnkgJiYgcmVxdWVzdC51cmwucXVlcnlbJ21ldGVvcl9qc19yZXNvdXJjZSddKSB7XG4gICAgICAgIC8vIFNpbWlsYXJseSwgd2UncmUgcmVxdWVzdGluZyBhIEpTIHJlc291cmNlIHRoYXQgd2UgZG9uJ3QgaGF2ZS5cbiAgICAgICAgLy8gU2VydmUgYW4gdW5jYWNoZWQgNDA0LiAoV2UgY2FuJ3QgdXNlIHRoZSBzYW1lIGhhY2sgd2UgdXNlIGZvciBDU1MsXG4gICAgICAgIC8vIGJlY2F1c2UgYWN0dWFsbHkgYWN0aW5nIG9uIHRoYXQgaGFjayByZXF1aXJlcyB1cyB0byBoYXZlIHRoZSBKU1xuICAgICAgICAvLyBhbHJlYWR5ISlcbiAgICAgICAgaGVhZGVyc1snQ2FjaGUtQ29udHJvbCddID0gJ25vLWNhY2hlJztcbiAgICAgICAgcmVzLndyaXRlSGVhZCg0MDQsIGhlYWRlcnMpO1xuICAgICAgICByZXMuZW5kKCc0MDQgTm90IEZvdW5kJyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlcXVlc3QudXJsLnF1ZXJ5ICYmIHJlcXVlc3QudXJsLnF1ZXJ5WydtZXRlb3JfZG9udF9zZXJ2ZV9pbmRleCddKSB7XG4gICAgICAgIC8vIFdoZW4gZG93bmxvYWRpbmcgZmlsZXMgZHVyaW5nIGEgQ29yZG92YSBob3QgY29kZSBwdXNoLCB3ZSBuZWVkXG4gICAgICAgIC8vIHRvIGRldGVjdCBpZiBhIGZpbGUgaXMgbm90IGF2YWlsYWJsZSBpbnN0ZWFkIG9mIGluYWR2ZXJ0ZW50bHlcbiAgICAgICAgLy8gZG93bmxvYWRpbmcgdGhlIGRlZmF1bHQgaW5kZXggcGFnZS5cbiAgICAgICAgLy8gU28gc2ltaWxhciB0byB0aGUgc2l0dWF0aW9uIGFib3ZlLCB3ZSBzZXJ2ZSBhbiB1bmNhY2hlZCA0MDQuXG4gICAgICAgIGhlYWRlcnNbJ0NhY2hlLUNvbnRyb2wnXSA9ICduby1jYWNoZSc7XG4gICAgICAgIHJlcy53cml0ZUhlYWQoNDA0LCBoZWFkZXJzKTtcbiAgICAgICAgcmVzLmVuZCgnNDA0IE5vdCBGb3VuZCcpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHsgYXJjaCB9ID0gcmVxdWVzdDtcbiAgICAgIGFzc2VydC5zdHJpY3RFcXVhbCh0eXBlb2YgYXJjaCwgJ3N0cmluZycsIHsgYXJjaCB9KTtcblxuICAgICAgaWYgKCFoYXNPd24uY2FsbChXZWJBcHAuY2xpZW50UHJvZ3JhbXMsIGFyY2gpKSB7XG4gICAgICAgIC8vIFdlIGNvdWxkIGNvbWUgaGVyZSBpbiBjYXNlIHdlIHJ1biB3aXRoIHNvbWUgYXJjaGl0ZWN0dXJlcyBleGNsdWRlZFxuICAgICAgICBoZWFkZXJzWydDYWNoZS1Db250cm9sJ10gPSAnbm8tY2FjaGUnO1xuICAgICAgICByZXMud3JpdGVIZWFkKDQwNCwgaGVhZGVycyk7XG4gICAgICAgIGlmIChNZXRlb3IuaXNEZXZlbG9wbWVudCkge1xuICAgICAgICAgIHJlcy5lbmQoYE5vIGNsaWVudCBwcm9ncmFtIGZvdW5kIGZvciB0aGUgJHthcmNofSBhcmNoaXRlY3R1cmUuYCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gU2FmZXR5IG5ldCwgYnV0IHRoaXMgYnJhbmNoIHNob3VsZCBub3QgYmUgcG9zc2libGUuXG4gICAgICAgICAgcmVzLmVuZCgnNDA0IE5vdCBGb3VuZCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgcGF1c2VDbGllbnQoYXJjaCkgaGFzIGJlZW4gY2FsbGVkLCBwcm9ncmFtLnBhdXNlZCB3aWxsIGJlIGFcbiAgICAgIC8vIFByb21pc2UgdGhhdCB3aWxsIGJlIHJlc29sdmVkIHdoZW4gdGhlIHByb2dyYW0gaXMgdW5wYXVzZWQuXG4gICAgICBhd2FpdCBXZWJBcHAuY2xpZW50UHJvZ3JhbXNbYXJjaF0ucGF1c2VkO1xuXG4gICAgICByZXR1cm4gZ2V0Qm9pbGVycGxhdGVBc3luYyhyZXF1ZXN0LCBhcmNoKVxuICAgICAgICAudGhlbigoeyBzdHJlYW0sIHN0YXR1c0NvZGUsIGhlYWRlcnM6IG5ld0hlYWRlcnMgfSkgPT4ge1xuICAgICAgICAgIGlmICghc3RhdHVzQ29kZSkge1xuICAgICAgICAgICAgc3RhdHVzQ29kZSA9IHJlcy5zdGF0dXNDb2RlID8gcmVzLnN0YXR1c0NvZGUgOiAyMDA7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG5ld0hlYWRlcnMpIHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oaGVhZGVycywgbmV3SGVhZGVycyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmVzLndyaXRlSGVhZChzdGF0dXNDb2RlLCBoZWFkZXJzKTtcblxuICAgICAgICAgIHN0cmVhbS5waXBlKHJlcywge1xuICAgICAgICAgICAgLy8gRW5kIHRoZSByZXNwb25zZSB3aGVuIHRoZSBzdHJlYW0gZW5kcy5cbiAgICAgICAgICAgIGVuZDogdHJ1ZSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICBMb2cuZXJyb3IoJ0Vycm9yIHJ1bm5pbmcgdGVtcGxhdGU6ICcgKyBlcnJvci5zdGFjayk7XG4gICAgICAgICAgcmVzLndyaXRlSGVhZCg1MDAsIGhlYWRlcnMpO1xuICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBSZXR1cm4gNDA0IGJ5IGRlZmF1bHQsIGlmIG5vIG90aGVyIGhhbmRsZXJzIHNlcnZlIHRoaXMgVVJMLlxuICBhcHAudXNlKGZ1bmN0aW9uKHJlcSwgcmVzKSB7XG4gICAgcmVzLndyaXRlSGVhZCg0MDQpO1xuICAgIHJlcy5lbmQoKTtcbiAgfSk7XG5cbiAgdmFyIGh0dHBTZXJ2ZXIgPSBjcmVhdGVTZXJ2ZXIoYXBwKTtcbiAgdmFyIG9uTGlzdGVuaW5nQ2FsbGJhY2tzID0gW107XG5cbiAgLy8gQWZ0ZXIgNSBzZWNvbmRzIHcvbyBkYXRhIG9uIGEgc29ja2V0LCBraWxsIGl0LiAgT24gdGhlIG90aGVyIGhhbmQsIGlmXG4gIC8vIHRoZXJlJ3MgYW4gb3V0c3RhbmRpbmcgcmVxdWVzdCwgZ2l2ZSBpdCBhIGhpZ2hlciB0aW1lb3V0IGluc3RlYWQgKHRvIGF2b2lkXG4gIC8vIGtpbGxpbmcgbG9uZy1wb2xsaW5nIHJlcXVlc3RzKVxuICBodHRwU2VydmVyLnNldFRpbWVvdXQoU0hPUlRfU09DS0VUX1RJTUVPVVQpO1xuXG4gIC8vIERvIHRoaXMgaGVyZSwgYW5kIHRoZW4gYWxzbyBpbiBsaXZlZGF0YS9zdHJlYW1fc2VydmVyLmpzLCBiZWNhdXNlXG4gIC8vIHN0cmVhbV9zZXJ2ZXIuanMga2lsbHMgYWxsIHRoZSBjdXJyZW50IHJlcXVlc3QgaGFuZGxlcnMgd2hlbiBpbnN0YWxsaW5nIGl0c1xuICAvLyBvd24uXG4gIGh0dHBTZXJ2ZXIub24oJ3JlcXVlc3QnLCBXZWJBcHAuX3RpbWVvdXRBZGp1c3RtZW50UmVxdWVzdENhbGxiYWNrKTtcblxuICAvLyBJZiB0aGUgY2xpZW50IGdhdmUgdXMgYSBiYWQgcmVxdWVzdCwgdGVsbCBpdCBpbnN0ZWFkIG9mIGp1c3QgY2xvc2luZyB0aGVcbiAgLy8gc29ja2V0LiBUaGlzIGxldHMgbG9hZCBiYWxhbmNlcnMgaW4gZnJvbnQgb2YgdXMgZGlmZmVyZW50aWF0ZSBiZXR3ZWVuIFwiYVxuICAvLyBzZXJ2ZXIgaXMgcmFuZG9tbHkgY2xvc2luZyBzb2NrZXRzIGZvciBubyByZWFzb25cIiBhbmQgXCJjbGllbnQgc2VudCBhIGJhZFxuICAvLyByZXF1ZXN0XCIuXG4gIC8vXG4gIC8vIFRoaXMgd2lsbCBvbmx5IHdvcmsgb24gTm9kZSA2OyBOb2RlIDQgZGVzdHJveXMgdGhlIHNvY2tldCBiZWZvcmUgY2FsbGluZ1xuICAvLyB0aGlzIGV2ZW50LiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL3B1bGwvNDU1Ny8gZm9yIGRldGFpbHMuXG4gIGh0dHBTZXJ2ZXIub24oJ2NsaWVudEVycm9yJywgKGVyciwgc29ja2V0KSA9PiB7XG4gICAgLy8gUHJlLU5vZGUtNiwgZG8gbm90aGluZy5cbiAgICBpZiAoc29ja2V0LmRlc3Ryb3llZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChlcnIubWVzc2FnZSA9PT0gJ1BhcnNlIEVycm9yJykge1xuICAgICAgc29ja2V0LmVuZCgnSFRUUC8xLjEgNDAwIEJhZCBSZXF1ZXN0XFxyXFxuXFxyXFxuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEZvciBvdGhlciBlcnJvcnMsIHVzZSB0aGUgZGVmYXVsdCBiZWhhdmlvciBhcyBpZiB3ZSBoYWQgbm8gY2xpZW50RXJyb3JcbiAgICAgIC8vIGhhbmRsZXIuXG4gICAgICBzb2NrZXQuZGVzdHJveShlcnIpO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uc3Qgc3VwcHJlc3NFcnJvcnMgPSBmdW5jdGlvbigpIHtcbiAgICBzdXBwcmVzc0V4cHJlc3NFcnJvcnMgPSB0cnVlO1xuICB9O1xuXG4gIGxldCB3YXJuZWRBYm91dENvbm5lY3RVc2FnZSA9IGZhbHNlO1xuXG4gIC8vIHN0YXJ0IHVwIGFwcFxuICBPYmplY3QuYXNzaWduKFdlYkFwcCwge1xuICAgIGNvbm5lY3RIYW5kbGVyczogcGFja2FnZUFuZEFwcEhhbmRsZXJzLFxuICAgIGhhbmRsZXJzOiBwYWNrYWdlQW5kQXBwSGFuZGxlcnMsXG4gICAgcmF3Q29ubmVjdEhhbmRsZXJzOiByYXdFeHByZXNzSGFuZGxlcnMsXG4gICAgcmF3SGFuZGxlcnM6IHJhd0V4cHJlc3NIYW5kbGVycyxcbiAgICBodHRwU2VydmVyOiBodHRwU2VydmVyLFxuICAgIGV4cHJlc3NBcHA6IGFwcCxcbiAgICAvLyBGb3IgdGVzdGluZy5cbiAgICBzdXBwcmVzc0Nvbm5lY3RFcnJvcnM6ICgpID0+IHtcbiAgICAgIGlmICghIHdhcm5lZEFib3V0Q29ubmVjdFVzYWdlKSB7XG4gICAgICAgIE1ldGVvci5fZGVidWcoXCJXZWJBcHAuc3VwcHJlc3NDb25uZWN0RXJyb3JzIGhhcyBiZWVuIHJlbmFtZWQgdG8gTWV0ZW9yLl9zdXBwcmVzc0V4cHJlc3NFcnJvcnMgYW5kIGl0IHNob3VsZCBiZSB1c2VkIG9ubHkgaW4gdGVzdHMuXCIpO1xuICAgICAgICB3YXJuZWRBYm91dENvbm5lY3RVc2FnZSA9IHRydWU7XG4gICAgICB9XG4gICAgICBzdXBwcmVzc0Vycm9ycygpO1xuICAgIH0sXG4gICAgX3N1cHByZXNzRXhwcmVzc0Vycm9yczogc3VwcHJlc3NFcnJvcnMsXG4gICAgb25MaXN0ZW5pbmc6IGZ1bmN0aW9uKGYpIHtcbiAgICAgIGlmIChvbkxpc3RlbmluZ0NhbGxiYWNrcykgb25MaXN0ZW5pbmdDYWxsYmFja3MucHVzaChmKTtcbiAgICAgIGVsc2UgZigpO1xuICAgIH0sXG4gICAgLy8gVGhpcyBjYW4gYmUgb3ZlcnJpZGRlbiBieSB1c2VycyB3aG8gd2FudCB0byBtb2RpZnkgaG93IGxpc3RlbmluZyB3b3Jrc1xuICAgIC8vIChlZywgdG8gcnVuIGEgcHJveHkgbGlrZSBBcG9sbG8gRW5naW5lIFByb3h5IGluIGZyb250IG9mIHRoZSBzZXJ2ZXIpLlxuICAgIHN0YXJ0TGlzdGVuaW5nOiBmdW5jdGlvbihodHRwU2VydmVyLCBsaXN0ZW5PcHRpb25zLCBjYikge1xuICAgICAgaHR0cFNlcnZlci5saXN0ZW4obGlzdGVuT3B0aW9ucywgY2IpO1xuICAgIH0sXG4gIH0pO1xuXG4gICAgLyoqXG4gICAqIEBuYW1lIG1haW5cbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAc3VtbWFyeSBTdGFydHMgdGhlIEhUVFAgc2VydmVyLlxuICAgKiAgSWYgYFVOSVhfU09DS0VUX1BBVEhgIGlzIHByZXNlbnQgTWV0ZW9yJ3MgSFRUUCBzZXJ2ZXIgd2lsbCB1c2UgdGhhdCBzb2NrZXQgZmlsZSBmb3IgaW50ZXItcHJvY2VzcyBjb21tdW5pY2F0aW9uLCBpbnN0ZWFkIG9mIFRDUC5cbiAgICogSWYgeW91IGNob29zZSB0byBub3QgaW5jbHVkZSB3ZWJhcHAgcGFja2FnZSBpbiB5b3VyIGFwcGxpY2F0aW9uIHRoaXMgbWV0aG9kIHN0aWxsIG11c3QgYmUgZGVmaW5lZCBmb3IgeW91ciBNZXRlb3IgYXBwbGljYXRpb24gdG8gd29yay5cbiAgICovXG4gIC8vIExldCB0aGUgcmVzdCBvZiB0aGUgcGFja2FnZXMgKGFuZCBNZXRlb3Iuc3RhcnR1cCBob29rcykgaW5zZXJ0IEV4cHJlc3NcbiAgLy8gbWlkZGxld2FyZXMgYW5kIHVwZGF0ZSBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLCB0aGVuIGtlZXAgZ29pbmcgdG8gc2V0IHVwXG4gIC8vIGFjdHVhbGx5IHNlcnZpbmcgSFRNTC5cbiAgZXhwb3J0cy5tYWluID0gYXN5bmMgYXJndiA9PiB7XG4gICAgYXdhaXQgV2ViQXBwSW50ZXJuYWxzLmdlbmVyYXRlQm9pbGVycGxhdGUoKTtcblxuICAgIGNvbnN0IHN0YXJ0SHR0cFNlcnZlciA9IGxpc3Rlbk9wdGlvbnMgPT4ge1xuICAgICAgV2ViQXBwLnN0YXJ0TGlzdGVuaW5nKFxuICAgICAgICBhcmd2Py5odHRwU2VydmVyIHx8IGh0dHBTZXJ2ZXIsXG4gICAgICAgIGxpc3Rlbk9wdGlvbnMsXG4gICAgICAgIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoXG4gICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHByb2Nlc3MuZW52Lk1FVEVPUl9QUklOVF9PTl9MSVNURU4pIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0xJU1RFTklORycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgY2FsbGJhY2tzID0gb25MaXN0ZW5pbmdDYWxsYmFja3M7XG4gICAgICAgICAgICBvbkxpc3RlbmluZ0NhbGxiYWNrcyA9IG51bGw7XG4gICAgICAgICAgICBjYWxsYmFja3M/LmZvckVhY2goY2FsbGJhY2sgPT4ge1xuICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBlID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGxpc3RlbmluZzonLCBlKTtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSAmJiBlLnN0YWNrKTtcbiAgICAgICAgICB9XG4gICAgICAgIClcbiAgICAgICk7XG4gICAgfTtcblxuICAgIGxldCBsb2NhbFBvcnQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IDA7XG4gICAgbGV0IHVuaXhTb2NrZXRQYXRoID0gcHJvY2Vzcy5lbnYuVU5JWF9TT0NLRVRfUEFUSDtcblxuICAgIGlmICh1bml4U29ja2V0UGF0aCkge1xuICAgICAgaWYgKGNsdXN0ZXIuaXNXb3JrZXIpIHtcbiAgICAgICAgY29uc3Qgd29ya2VyTmFtZSA9IGNsdXN0ZXIud29ya2VyLnByb2Nlc3MuZW52Lm5hbWUgfHwgY2x1c3Rlci53b3JrZXIuaWQ7XG4gICAgICAgIHVuaXhTb2NrZXRQYXRoICs9ICcuJyArIHdvcmtlck5hbWUgKyAnLnNvY2snO1xuICAgICAgfVxuICAgICAgLy8gU3RhcnQgdGhlIEhUVFAgc2VydmVyIHVzaW5nIGEgc29ja2V0IGZpbGUuXG4gICAgICByZW1vdmVFeGlzdGluZ1NvY2tldEZpbGUodW5peFNvY2tldFBhdGgpO1xuICAgICAgc3RhcnRIdHRwU2VydmVyKHsgcGF0aDogdW5peFNvY2tldFBhdGggfSk7XG5cbiAgICAgIGNvbnN0IHVuaXhTb2NrZXRQZXJtaXNzaW9ucyA9IChcbiAgICAgICAgcHJvY2Vzcy5lbnYuVU5JWF9TT0NLRVRfUEVSTUlTU0lPTlMgfHwgJydcbiAgICAgICkudHJpbSgpO1xuICAgICAgaWYgKHVuaXhTb2NrZXRQZXJtaXNzaW9ucykge1xuICAgICAgICBpZiAoL15bMC03XXszfSQvLnRlc3QodW5peFNvY2tldFBlcm1pc3Npb25zKSkge1xuICAgICAgICAgIGNobW9kU3luYyh1bml4U29ja2V0UGF0aCwgcGFyc2VJbnQodW5peFNvY2tldFBlcm1pc3Npb25zLCA4KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFVOSVhfU09DS0VUX1BFUk1JU1NJT05TIHNwZWNpZmllZCcpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHVuaXhTb2NrZXRHcm91cCA9IChwcm9jZXNzLmVudi5VTklYX1NPQ0tFVF9HUk9VUCB8fCAnJykudHJpbSgpO1xuICAgICAgaWYgKHVuaXhTb2NrZXRHcm91cCkge1xuICAgICAgICBjb25zdCB1bml4U29ja2V0R3JvdXBJbmZvID0gZ2V0R3JvdXBJbmZvKHVuaXhTb2NrZXRHcm91cCk7XG4gICAgICAgIGlmICh1bml4U29ja2V0R3JvdXBJbmZvID09PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFVOSVhfU09DS0VUX0dST1VQIG5hbWUgc3BlY2lmaWVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY2hvd25TeW5jKHVuaXhTb2NrZXRQYXRoLCB1c2VySW5mbygpLnVpZCwgdW5peFNvY2tldEdyb3VwSW5mby5naWQpO1xuICAgICAgfVxuXG4gICAgICByZWdpc3RlclNvY2tldEZpbGVDbGVhbnVwKHVuaXhTb2NrZXRQYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9jYWxQb3J0ID0gaXNOYU4oTnVtYmVyKGxvY2FsUG9ydCkpID8gbG9jYWxQb3J0IDogTnVtYmVyKGxvY2FsUG9ydCk7XG4gICAgICBpZiAoL1xcXFxcXFxcPy4rXFxcXHBpcGVcXFxcPy4rLy50ZXN0KGxvY2FsUG9ydCkpIHtcbiAgICAgICAgLy8gU3RhcnQgdGhlIEhUVFAgc2VydmVyIHVzaW5nIFdpbmRvd3MgU2VydmVyIHN0eWxlIG5hbWVkIHBpcGUuXG4gICAgICAgIHN0YXJ0SHR0cFNlcnZlcih7IHBhdGg6IGxvY2FsUG9ydCB9KTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGxvY2FsUG9ydCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgLy8gU3RhcnQgdGhlIEhUVFAgc2VydmVyIHVzaW5nIFRDUC5cbiAgICAgICAgc3RhcnRIdHRwU2VydmVyKHtcbiAgICAgICAgICBwb3J0OiBsb2NhbFBvcnQsXG4gICAgICAgICAgaG9zdDogcHJvY2Vzcy5lbnYuQklORF9JUCB8fCAnMC4wLjAuMCcsXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFBPUlQgc3BlY2lmaWVkJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuICdEQUVNT04nO1xuICB9O1xufVxuXG5jb25zdCBpc0dldGVudEF2YWlsYWJsZSA9ICgpID0+IHtcbiAgdHJ5IHtcbiAgICBleGVjU3luYygnd2hpY2ggZ2V0ZW50Jyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxuY29uc3QgZ2V0R3JvdXBJbmZvVXNpbmdHZXRlbnQgPSAoZ3JvdXBOYW1lKSA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3Rkb3V0ID0gZXhlY1N5bmMoYGdldGVudCBncm91cCAke2dyb3VwTmFtZX1gLCB7IGVuY29kaW5nOiAndXRmOCcgfSk7XG4gICAgaWYgKCFzdGRvdXQpIHJldHVybiBudWxsO1xuICAgIGNvbnN0IFtuYW1lLCAsIGdpZF0gPSBzdGRvdXQudHJpbSgpLnNwbGl0KCc6Jyk7XG4gICAgaWYgKG5hbWUgPT0gbnVsbCB8fCBnaWQgPT0gbnVsbCkgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHsgbmFtZSwgZ2lkOiBOdW1iZXIoZ2lkKSB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59O1xuXG5jb25zdCBnZXRHcm91cEluZm9Gcm9tRmlsZSA9IChncm91cE5hbWUpID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBkYXRhID0gcmVhZEZpbGVTeW5jKCcvZXRjL2dyb3VwJywgJ3V0ZjgnKTtcbiAgICBjb25zdCBncm91cExpbmUgPSBkYXRhLnRyaW0oKS5zcGxpdCgnXFxuJykuZmluZChsaW5lID0+IGxpbmUuc3RhcnRzV2l0aChgJHtncm91cE5hbWV9OmApKTtcbiAgICBpZiAoIWdyb3VwTGluZSkgcmV0dXJuIG51bGw7XG4gICAgY29uc3QgW25hbWUsICwgZ2lkXSA9IGdyb3VwTGluZS50cmltKCkuc3BsaXQoJzonKTtcbiAgICBpZiAobmFtZSA9PSBudWxsIHx8IGdpZCA9PSBudWxsKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4geyBuYW1lLCBnaWQ6IE51bWJlcihnaWQpIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn07XG5cbmV4cG9ydCBjb25zdCBnZXRHcm91cEluZm8gPSAoZ3JvdXBOYW1lKSA9PiB7XG4gIGxldCBncm91cEluZm8gPSBnZXRHcm91cEluZm9Gcm9tRmlsZShncm91cE5hbWUpO1xuICBpZiAoIWdyb3VwSW5mbyAmJiBpc0dldGVudEF2YWlsYWJsZSgpKSB7XG4gICAgZ3JvdXBJbmZvID0gZ2V0R3JvdXBJbmZvVXNpbmdHZXRlbnQoZ3JvdXBOYW1lKTtcbiAgfVxuICByZXR1cm4gZ3JvdXBJbmZvO1xufTtcblxudmFyIGlubGluZVNjcmlwdHNBbGxvd2VkID0gdHJ1ZTtcblxuV2ViQXBwSW50ZXJuYWxzLmlubGluZVNjcmlwdHNBbGxvd2VkID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBpbmxpbmVTY3JpcHRzQWxsb3dlZDtcbn07XG5cbldlYkFwcEludGVybmFscy5zZXRJbmxpbmVTY3JpcHRzQWxsb3dlZCA9IGFzeW5jIGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlubGluZVNjcmlwdHNBbGxvd2VkID0gdmFsdWU7XG4gIGF3YWl0IFdlYkFwcEludGVybmFscy5nZW5lcmF0ZUJvaWxlcnBsYXRlKCk7XG59O1xuXG52YXIgc3JpTW9kZTtcblxuV2ViQXBwSW50ZXJuYWxzLmVuYWJsZVN1YnJlc291cmNlSW50ZWdyaXR5ID0gYXN5bmMgZnVuY3Rpb24odXNlX2NyZWRlbnRpYWxzID0gZmFsc2UpIHtcbiAgc3JpTW9kZSA9IHVzZV9jcmVkZW50aWFscyA/ICd1c2UtY3JlZGVudGlhbHMnIDogJ2Fub255bW91cyc7XG4gIGF3YWl0IFdlYkFwcEludGVybmFscy5nZW5lcmF0ZUJvaWxlcnBsYXRlKCk7XG59O1xuXG5XZWJBcHBJbnRlcm5hbHMuc2V0QnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2sgPSBhc3luYyBmdW5jdGlvbihob29rRm4pIHtcbiAgYnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2sgPSBob29rRm47XG4gIGF3YWl0IFdlYkFwcEludGVybmFscy5nZW5lcmF0ZUJvaWxlcnBsYXRlKCk7XG59O1xuXG5XZWJBcHBJbnRlcm5hbHMuc2V0QnVuZGxlZEpzQ3NzUHJlZml4ID0gYXN5bmMgZnVuY3Rpb24ocHJlZml4KSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgYXdhaXQgc2VsZi5zZXRCdW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayhmdW5jdGlvbih1cmwpIHtcbiAgICByZXR1cm4gcHJlZml4ICsgdXJsO1xuICB9KTtcbn07XG5cbi8vIFBhY2thZ2VzIGNhbiBjYWxsIGBXZWJBcHBJbnRlcm5hbHMuYWRkU3RhdGljSnNgIHRvIHNwZWNpZnkgc3RhdGljXG4vLyBKYXZhU2NyaXB0IHRvIGJlIGluY2x1ZGVkIGluIHRoZSBhcHAuIFRoaXMgc3RhdGljIEpTIHdpbGwgYmUgaW5saW5lZCxcbi8vIHVubGVzcyBpbmxpbmUgc2NyaXB0cyBoYXZlIGJlZW4gZGlzYWJsZWQsIGluIHdoaWNoIGNhc2UgaXQgd2lsbCBiZVxuLy8gc2VydmVkIHVuZGVyIGAvPHNoYTEgb2YgY29udGVudHM+YC5cbnZhciBhZGRpdGlvbmFsU3RhdGljSnMgPSB7fTtcbldlYkFwcEludGVybmFscy5hZGRTdGF0aWNKcyA9IGZ1bmN0aW9uKGNvbnRlbnRzKSB7XG4gIGFkZGl0aW9uYWxTdGF0aWNKc1snLycgKyBzaGExKGNvbnRlbnRzKSArICcuanMnXSA9IGNvbnRlbnRzO1xufTtcblxuLy8gRXhwb3J0ZWQgZm9yIHRlc3RzXG5XZWJBcHBJbnRlcm5hbHMuZ2V0Qm9pbGVycGxhdGUgPSBnZXRCb2lsZXJwbGF0ZTtcbldlYkFwcEludGVybmFscy5hZGRpdGlvbmFsU3RhdGljSnMgPSBhZGRpdGlvbmFsU3RhdGljSnM7XG5cbmF3YWl0IHJ1bldlYkFwcFNlcnZlcigpO1xuIiwiaW1wb3J0IHsgc3RhdFN5bmMsIHVubGlua1N5bmMsIGV4aXN0c1N5bmMgfSBmcm9tICdmcyc7XG5cbi8vIFNpbmNlIGEgbmV3IHNvY2tldCBmaWxlIHdpbGwgYmUgY3JlYXRlZCB3aGVuIHRoZSBIVFRQIHNlcnZlclxuLy8gc3RhcnRzIHVwLCBpZiBmb3VuZCByZW1vdmUgdGhlIGV4aXN0aW5nIGZpbGUuXG4vL1xuLy8gV0FSTklORzpcbi8vIFRoaXMgd2lsbCByZW1vdmUgdGhlIGNvbmZpZ3VyZWQgc29ja2V0IGZpbGUgd2l0aG91dCB3YXJuaW5nLiBJZlxuLy8gdGhlIGNvbmZpZ3VyZWQgc29ja2V0IGZpbGUgaXMgYWxyZWFkeSBpbiB1c2UgYnkgYW5vdGhlciBhcHBsaWNhdGlvbixcbi8vIGl0IHdpbGwgc3RpbGwgYmUgcmVtb3ZlZC4gTm9kZSBkb2VzIG5vdCBwcm92aWRlIGEgcmVsaWFibGUgd2F5IHRvXG4vLyBkaWZmZXJlbnRpYXRlIGJldHdlZW4gYSBzb2NrZXQgZmlsZSB0aGF0IGlzIGFscmVhZHkgaW4gdXNlIGJ5XG4vLyBhbm90aGVyIGFwcGxpY2F0aW9uIG9yIGEgc3RhbGUgc29ja2V0IGZpbGUgdGhhdCBoYXMgYmVlblxuLy8gbGVmdCBvdmVyIGFmdGVyIGEgU0lHS0lMTC4gU2luY2Ugd2UgaGF2ZSBubyByZWxpYWJsZSB3YXkgdG9cbi8vIGRpZmZlcmVudGlhdGUgYmV0d2VlbiB0aGVzZSB0d28gc2NlbmFyaW9zLCB0aGUgYmVzdCBjb3Vyc2Ugb2Zcbi8vIGFjdGlvbiBkdXJpbmcgc3RhcnR1cCBpcyB0byByZW1vdmUgYW55IGV4aXN0aW5nIHNvY2tldCBmaWxlLiBUaGlzXG4vLyBpcyBub3QgdGhlIHNhZmVzdCBjb3Vyc2Ugb2YgYWN0aW9uIGFzIHJlbW92aW5nIHRoZSBleGlzdGluZyBzb2NrZXRcbi8vIGZpbGUgY291bGQgaW1wYWN0IGFuIGFwcGxpY2F0aW9uIHVzaW5nIGl0LCBidXQgdGhpcyBhcHByb2FjaCBoZWxwc1xuLy8gZW5zdXJlIHRoZSBIVFRQIHNlcnZlciBjYW4gc3RhcnR1cCB3aXRob3V0IG1hbnVhbFxuLy8gaW50ZXJ2ZW50aW9uIChlLmcuIGFza2luZyBmb3IgdGhlIHZlcmlmaWNhdGlvbiBhbmQgY2xlYW51cCBvZiBzb2NrZXRcbi8vIGZpbGVzIGJlZm9yZSBhbGxvd2luZyB0aGUgSFRUUCBzZXJ2ZXIgdG8gYmUgc3RhcnRlZCkuXG4vL1xuLy8gVGhlIGFib3ZlIGJlaW5nIHNhaWQsIGFzIGxvbmcgYXMgdGhlIHNvY2tldCBmaWxlIHBhdGggaXNcbi8vIGNvbmZpZ3VyZWQgY2FyZWZ1bGx5IHdoZW4gdGhlIGFwcGxpY2F0aW9uIGlzIGRlcGxveWVkIChhbmQgZXh0cmFcbi8vIGNhcmUgaXMgdGFrZW4gdG8gbWFrZSBzdXJlIHRoZSBjb25maWd1cmVkIHBhdGggaXMgdW5pcXVlIGFuZCBkb2Vzbid0XG4vLyBjb25mbGljdCB3aXRoIGFub3RoZXIgc29ja2V0IGZpbGUgcGF0aCksIHRoZW4gdGhlcmUgc2hvdWxkIG5vdCBiZVxuLy8gYW55IGlzc3VlcyB3aXRoIHRoaXMgYXBwcm9hY2guXG5leHBvcnQgY29uc3QgcmVtb3ZlRXhpc3RpbmdTb2NrZXRGaWxlID0gKHNvY2tldFBhdGgpID0+IHtcbiAgdHJ5IHtcbiAgICBpZiAoc3RhdFN5bmMoc29ja2V0UGF0aCkuaXNTb2NrZXQoKSkge1xuICAgICAgLy8gU2luY2UgYSBuZXcgc29ja2V0IGZpbGUgd2lsbCBiZSBjcmVhdGVkLCByZW1vdmUgdGhlIGV4aXN0aW5nXG4gICAgICAvLyBmaWxlLlxuICAgICAgdW5saW5rU3luYyhzb2NrZXRQYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgQW4gZXhpc3RpbmcgZmlsZSB3YXMgZm91bmQgYXQgXCIke3NvY2tldFBhdGh9XCIgYW5kIGl0IGlzIG5vdCBgICtcbiAgICAgICAgJ2Egc29ja2V0IGZpbGUuIFBsZWFzZSBjb25maXJtIFBPUlQgaXMgcG9pbnRpbmcgdG8gdmFsaWQgYW5kICcgK1xuICAgICAgICAndW4tdXNlZCBzb2NrZXQgZmlsZSBwYXRoLidcbiAgICAgICk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIC8vIElmIHRoZXJlIGlzIG5vIGV4aXN0aW5nIHNvY2tldCBmaWxlIHRvIGNsZWFudXAsIGdyZWF0LCB3ZSdsbFxuICAgIC8vIGNvbnRpbnVlIG5vcm1hbGx5LiBJZiB0aGUgY2F1Z2h0IGV4Y2VwdGlvbiByZXByZXNlbnRzIGFueSBvdGhlclxuICAgIC8vIGlzc3VlLCByZS10aHJvdy5cbiAgICBpZiAoZXJyb3IuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxufTtcblxuLy8gUmVtb3ZlIHRoZSBzb2NrZXQgZmlsZSB3aGVuIGRvbmUgdG8gYXZvaWQgbGVhdmluZyBiZWhpbmQgYSBzdGFsZSBvbmUuXG4vLyBOb3RlIC0gYSBzdGFsZSBzb2NrZXQgZmlsZSBpcyBzdGlsbCBsZWZ0IGJlaGluZCBpZiB0aGUgcnVubmluZyBub2RlXG4vLyBwcm9jZXNzIGlzIGtpbGxlZCB2aWEgc2lnbmFsIDkgLSBTSUdLSUxMLlxuZXhwb3J0IGNvbnN0IHJlZ2lzdGVyU29ja2V0RmlsZUNsZWFudXAgPVxuICAoc29ja2V0UGF0aCwgZXZlbnRFbWl0dGVyID0gcHJvY2VzcykgPT4ge1xuICAgIFsnZXhpdCcsICdTSUdJTlQnLCAnU0lHSFVQJywgJ1NJR1RFUk0nXS5mb3JFYWNoKHNpZ25hbCA9PiB7XG4gICAgICBldmVudEVtaXR0ZXIub24oc2lnbmFsLCBNZXRlb3IuYmluZEVudmlyb25tZW50KCgpID0+IHtcbiAgICAgICAgaWYgKGV4aXN0c1N5bmMoc29ja2V0UGF0aCkpIHtcbiAgICAgICAgICB1bmxpbmtTeW5jKHNvY2tldFBhdGgpO1xuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgfSk7XG4gIH07XG4iXX0=
