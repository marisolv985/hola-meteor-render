Package["core-runtime"].queue("boilerplate-generator",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Boilerplate;

var require = meteorInstall({"node_modules":{"meteor":{"boilerplate-generator":{"generator.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/boilerplate-generator/generator.js                                                                        //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({Boilerplate:()=>Boilerplate});let _object_spread;module.link("@swc/helpers/_/_object_spread",{_(v){_object_spread=v}},0);let readFileSync;module.link('fs',{readFileSync(v){readFileSync=v}},1);let createStream;module.link("combined-stream2",{create(v){createStream=v}},2);let modernHeadTemplate,modernCloseTemplate;module.link('./template-web.browser',{headTemplate(v){modernHeadTemplate=v},closeTemplate(v){modernCloseTemplate=v}},3);let cordovaHeadTemplate,cordovaCloseTemplate;module.link('./template-web.cordova',{headTemplate(v){cordovaHeadTemplate=v},closeTemplate(v){cordovaCloseTemplate=v}},4);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();




// Copied from webapp_server
const readUtf8FileSync = (filename)=>readFileSync(filename, 'utf8');
const identity = (value)=>value;
function appendToStream(chunk, stream) {
    if (typeof chunk === "string") {
        stream.append(Buffer.from(chunk, "utf8"));
    } else if (Buffer.isBuffer(chunk) || typeof chunk.read === "function") {
        stream.append(chunk);
    }
}
class Boilerplate {
    toHTML(extraData) {
        throw new Error("The Boilerplate#toHTML method has been removed. " + "Please use Boilerplate#toHTMLStream instead.");
    }
    // Returns a Promise that resolves to a string of HTML.
    toHTMLAsync(extraData) {
        return new Promise((resolve, reject)=>{
            const stream = this.toHTMLStream(extraData);
            const chunks = [];
            stream.on("data", (chunk)=>chunks.push(chunk));
            stream.on("end", ()=>{
                resolve(Buffer.concat(chunks).toString("utf8"));
            });
            stream.on("error", reject);
        });
    }
    // The 'extraData' argument can be used to extend 'self.baseData'. Its
    // purpose is to allow you to specify data that you might not know at
    // the time that you construct the Boilerplate object. (e.g. it is used
    // by 'webapp' to specify data that is only known at request-time).
    // this returns a stream
    toHTMLStream(extraData) {
        if (!this.baseData || !this.headTemplate || !this.closeTemplate) {
            throw new Error('Boilerplate did not instantiate correctly.');
        }
        const data = _object_spread({}, this.baseData, extraData);
        const start = "<!DOCTYPE html>\n" + this.headTemplate(data);
        const { body, dynamicBody } = data;
        const end = this.closeTemplate(data);
        const response = createStream();
        appendToStream(start, response);
        if (body) {
            appendToStream(body, response);
        }
        if (dynamicBody) {
            appendToStream(dynamicBody, response);
        }
        appendToStream(end, response);
        return response;
    }
    // XXX Exported to allow client-side only changes to rebuild the boilerplate
    // without requiring a full server restart.
    // Produces an HTML string with given manifest and boilerplateSource.
    // Optionally takes urlMapper in case urls from manifest need to be prefixed
    // or rewritten.
    // Optionally takes pathMapper for resolving relative file system paths.
    // Optionally allows to override fields of the data context.
    _generateBoilerplateFromManifest(manifest, { urlMapper = identity, pathMapper = identity, baseDataExtension, inline } = {}) {
        const boilerplateBaseData = _object_spread({
            css: [],
            js: [],
            head: '',
            body: '',
            meteorManifest: JSON.stringify(manifest)
        }, baseDataExtension);
        manifest.forEach((item)=>{
            const urlPath = urlMapper(item.url);
            const itemObj = {
                url: urlPath
            };
            if (inline) {
                itemObj.scriptContent = readUtf8FileSync(pathMapper(item.path));
                itemObj.inline = true;
            } else if (item.sri) {
                itemObj.sri = item.sri;
            }
            if (item.type === 'css' && item.where === 'client') {
                boilerplateBaseData.css.push(itemObj);
            }
            if (item.type === 'js' && item.where === 'client' && // Dynamic JS modules should not be loaded eagerly in the
            // initial HTML of the app.
            !item.path.startsWith('dynamic/')) {
                boilerplateBaseData.js.push(itemObj);
            }
            if (item.type === 'head') {
                boilerplateBaseData.head = readUtf8FileSync(pathMapper(item.path));
            }
            if (item.type === 'body') {
                boilerplateBaseData.body = readUtf8FileSync(pathMapper(item.path));
            }
        });
        this.baseData = boilerplateBaseData;
    }
    constructor(arch, manifest, options = {}){
        const { headTemplate, closeTemplate } = getTemplate(arch);
        this.headTemplate = headTemplate;
        this.closeTemplate = closeTemplate;
        this.baseData = null;
        this._generateBoilerplateFromManifest(manifest, options);
    }
}
;
// Returns a template function that, when called, produces the boilerplate
// html as a string.
function getTemplate(arch) {
    const prefix = arch.split(".", 2).join(".");
    if (prefix === "web.browser") {
        return {
            headTemplate: modernHeadTemplate,
            closeTemplate: modernCloseTemplate
        };
    }
    if (prefix === "web.cordova") {
        return {
            headTemplate: cordovaHeadTemplate,
            closeTemplate: cordovaCloseTemplate
        };
    }
    throw new Error("Unsupported arch: " + arch);
}
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template-web.browser.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/boilerplate-generator/template-web.browser.js                                                             //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({headTemplate:()=>headTemplate,closeTemplate:()=>closeTemplate},true);let template;module.link('./template',{default(v){template=v}},0);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
const sri = (sri, mode)=>sri && mode ? ` integrity="sha512-${sri}" crossorigin="${mode}"` : '';
const headTemplate = ({ css, htmlAttributes, bundledJsCssUrlRewriteHook, sriMode, head, dynamicHead })=>{
    var headSections = head.split(/<meteor-bundled-css[^<>]*>/, 2);
    var cssBundle = [
        ...(css || []).map((file)=>template('  <link rel="stylesheet" type="text/css" class="__meteor-css__" href="<%- href %>"<%= sri %>>')({
                href: bundledJsCssUrlRewriteHook(file.url),
                sri: sri(file.sri, sriMode)
            }))
    ].join('\n');
    return [
        '<html' + Object.keys(htmlAttributes || {}).map((key)=>template(' <%= attrName %>="<%- attrValue %>"')({
                attrName: key,
                attrValue: htmlAttributes[key]
            })).join('') + '>',
        '<head>',
        headSections.length === 1 ? [
            cssBundle,
            headSections[0]
        ].join('\n') : [
            headSections[0],
            cssBundle,
            headSections[1]
        ].join('\n'),
        dynamicHead,
        '</head>',
        '<body>'
    ].join('\n');
};
// Template function for rendering the boilerplate html for browsers
const closeTemplate = ({ meteorRuntimeConfig, meteorRuntimeHash, rootUrlPathPrefix, inlineScriptsAllowed, js, additionalStaticJs, bundledJsCssUrlRewriteHook, sriMode })=>[
        '',
        inlineScriptsAllowed ? template('  <script type="text/javascript">__meteor_runtime_config__ = JSON.parse(decodeURIComponent(<%= conf %>))</script>')({
            conf: meteorRuntimeConfig
        }) : template('  <script type="text/javascript" src="<%- src %>/meteor_runtime_config.js?hash=<%- hash %>"></script>')({
            src: rootUrlPathPrefix,
            hash: meteorRuntimeHash
        }),
        '',
        ...(js || []).map((file)=>template('  <script type="text/javascript" src="<%- src %>"<%= sri %>></script>')({
                src: bundledJsCssUrlRewriteHook(file.url),
                sri: sri(file.sri, sriMode)
            })),
        ...(additionalStaticJs || []).map(({ contents, pathname })=>inlineScriptsAllowed ? template('  <script><%= contents %></script>')({
                contents
            }) : template('  <script type="text/javascript" src="<%- src %>"></script>')({
                src: rootUrlPathPrefix + pathname
            })),
        '',
        '',
        '</body>',
        '</html>'
    ].join('\n');
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template-web.cordova.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/boilerplate-generator/template-web.cordova.js                                                             //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({closeTemplate:()=>closeTemplate});module.export({headTemplate:()=>headTemplate},true);let template;module.link('./template',{default(v){template=v}},0);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
// Template function for rendering the boilerplate html for cordova
const headTemplate = ({ meteorRuntimeConfig, rootUrlPathPrefix, inlineScriptsAllowed, css, js, additionalStaticJs, htmlAttributes, bundledJsCssUrlRewriteHook, head, dynamicHead })=>{
    var headSections = head.split(/<meteor-bundled-css[^<>]*>/, 2);
    var cssBundle = [
        // We are explicitly not using bundledJsCssUrlRewriteHook: in cordova we serve assets up directly from disk, so rewriting the URL does not make sense
        ...(css || []).map((file)=>template('  <link rel="stylesheet" type="text/css" class="__meteor-css__" href="<%- href %>">')({
                href: file.url
            }))
    ].join('\n');
    return [
        '<html>',
        '<head>',
        '  <meta charset="utf-8">',
        '  <meta name="format-detection" content="telephone=no">',
        '  <meta name="viewport" content="user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1, width=device-width, height=device-height, viewport-fit=cover">',
        '  <meta name="msapplication-tap-highlight" content="no">',
        '  <meta http-equiv="Content-Security-Policy" content="default-src * android-webview-video-poster: gap: data: blob: \'unsafe-inline\' \'unsafe-eval\' ws: wss:;">',
        headSections.length === 1 ? [
            cssBundle,
            headSections[0]
        ].join('\n') : [
            headSections[0],
            cssBundle,
            headSections[1]
        ].join('\n'),
        '  <script type="text/javascript">',
        template('    __meteor_runtime_config__ = JSON.parse(decodeURIComponent(<%= conf %>));')({
            conf: meteorRuntimeConfig
        }),
        '    if (/Android/i.test(navigator.userAgent)) {',
        // When Android app is emulated, it cannot connect to localhost,
        // instead it should connect to 10.0.2.2
        // (unless we\'re using an http proxy; then it works!)
        '      if (!__meteor_runtime_config__.httpProxyPort) {',
        '        __meteor_runtime_config__.ROOT_URL = (__meteor_runtime_config__.ROOT_URL || \'\').replace(/localhost/i, \'10.0.2.2\');',
        '        __meteor_runtime_config__.DDP_DEFAULT_CONNECTION_URL = (__meteor_runtime_config__.DDP_DEFAULT_CONNECTION_URL || \'\').replace(/localhost/i, \'10.0.2.2\');',
        '      }',
        '    }',
        '  </script>',
        '',
        '  <script type="text/javascript" src="/cordova.js"></script>',
        ...(js || []).map((file)=>template('  <script type="text/javascript" src="<%- src %>"></script>')({
                src: file.url
            })),
        ...(additionalStaticJs || []).map(({ contents, pathname })=>inlineScriptsAllowed ? template('  <script><%= contents %></script>')({
                contents
            }) : template('  <script type="text/javascript" src="<%- src %>"></script>')({
                src: rootUrlPathPrefix + pathname
            })),
        '',
        '</head>',
        '',
        '<body>'
    ].join('\n');
};
function closeTemplate() {
    return "</body>\n</html>";
}
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/boilerplate-generator/template.js                                                                         //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({default:()=>template});/**
 * Internal full-featured implementation of lodash.template (inspired by v4.5.0)
 * embedded to eliminate the external dependency while preserving functionality.
 *
 * MIT License (c) JS Foundation and other contributors <https://js.foundation/>
 * Adapted for Meteor boilerplate-generator (only the pieces required by template were extracted).
 */ // ---------------------------------------------------------------------------
// Utility & regex definitions (mirroring lodash pieces used by template)
// ---------------------------------------------------------------------------
const reEmptyStringLeading = /\b__p \+= '';/g;
const reEmptyStringMiddle = /\b(__p \+=) '' \+/g;
const reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;
const reEscape = /<%-([\s\S]+?)%>/g; // escape delimiter
const reEvaluate = /<%([\s\S]+?)%>/g; // evaluate delimiter
const reInterpolate = /<%=([\s\S]+?)%>/g; // interpolate delimiter
const reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g; // ES6 template literal capture
const reUnescapedString = /['\\\n\r\u2028\u2029]/g; // string literal escapes
// HTML escape
const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};
const reHasUnescapedHtml = /[&<>"']/;
function escapeHtml(string) {
    return string && reHasUnescapedHtml.test(string) ? string.replace(/[&<>"']/g, (chr)=>htmlEscapes[chr]) : string || '';
}
// Escape characters for inclusion into a string literal
const escapes = {
    "'": "'",
    '\\': '\\',
    '\n': 'n',
    '\r': 'r',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
};
function escapeStringChar(match) {
    return '\\' + escapes[match];
}
// Basic Object helpers ------------------------------------------------------
function isObject(value) {
    return value != null && typeof value === 'object';
}
function toStringSafe(value) {
    return value == null ? '' : value + '';
}
function baseValues(object, props) {
    return props.map((k)=>object[k]);
}
function attempt(fn) {
    try {
        return fn();
    } catch (e) {
        return e;
    }
}
function isError(value) {
    return value instanceof Error || isObject(value) && value.name === 'Error';
}
// ---------------------------------------------------------------------------
// Main template implementation
// ---------------------------------------------------------------------------
let templateCounter = -1; // used for sourceURL generation
function _template(string) {
    string = toStringSafe(string);
    const imports = {
        '_': {
            escape: escapeHtml
        }
    };
    const importKeys = Object.keys(imports);
    const importValues = baseValues(imports, importKeys);
    let index = 0;
    let isEscaping;
    let isEvaluating;
    let source = "__p += '";
    // Build combined regex of delimiters
    const reDelimiters = RegExp(reEscape.source + '|' + reInterpolate.source + '|' + reEsTemplate.source + '|' + reEvaluate.source + '|$', 'g');
    const sourceURL = `//# sourceURL=lodash.templateSources[${++templateCounter}]\n`;
    // Tokenize
    string.replace(reDelimiters, function(match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
        interpolateValue || (interpolateValue = esTemplateValue);
        // Append preceding string portion with escaped literal chars
        source += string.slice(index, offset).replace(reUnescapedString, escapeStringChar);
        if (escapeValue) {
            isEscaping = true;
            source += "' +\n__e(" + escapeValue + ") +\n'";
        }
        if (evaluateValue) {
            isEvaluating = true;
            source += "';\n" + evaluateValue + ";\n__p += '";
        }
        if (interpolateValue) {
            source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
        }
        index = offset + match.length;
        return match;
    });
    source += "';\n";
    source = 'with (obj) {\n' + source + '\n}\n';
    // Remove unnecessary concatenations
    source = (isEvaluating ? source.replace(reEmptyStringLeading, '') : source).replace(reEmptyStringMiddle, '$1').replace(reEmptyStringTrailing, '$1;');
    // Frame as function body
    source = 'function(obj) {\n' + 'obj || (obj = {});\n' + "var __t, __p = ''" + (isEscaping ? ', __e = _.escape' : '') + (isEvaluating ? ', __j = Array.prototype.join;\nfunction print() { __p += __j.call(arguments, \'\') }\n' : ';\n') + source + 'return __p\n}';
    // Actual compile step
    const result = attempt(function() {
        return Function(importKeys, sourceURL + 'return ' + source).apply(undefined, importValues); // eslint-disable-line no-new-func
    });
    if (isError(result)) {
        result.source = source; // expose for debugging if error
        throw result;
    }
    // Expose compiled source
    result.source = source;
    return result;
}
function template(text) {
    return _template(text);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"combined-stream2":{"package.json":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/boilerplate-generator/node_modules/combined-stream2/package.json                               //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "combined-stream2",
  "version": "1.1.2",
  "main": "index.js"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/boilerplate-generator/node_modules/combined-stream2/index.js                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});


/* Exports */
return {
  export: function () { return {
      Boilerplate: Boilerplate
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/boilerplate-generator/generator.js"
  ],
  mainModulePath: "/node_modules/meteor/boilerplate-generator/generator.js"
}});

//# sourceURL=meteor://💻app/packages/boilerplate-generator.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYm9pbGVycGxhdGUtZ2VuZXJhdG9yL2dlbmVyYXRvci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYm9pbGVycGxhdGUtZ2VuZXJhdG9yL3RlbXBsYXRlLXdlYi5icm93c2VyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9ib2lsZXJwbGF0ZS1nZW5lcmF0b3IvdGVtcGxhdGUtd2ViLmNvcmRvdmEuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL2JvaWxlcnBsYXRlLWdlbmVyYXRvci90ZW1wbGF0ZS5qcyJdLCJuYW1lcyI6WyJyZWFkVXRmOEZpbGVTeW5jIiwiZmlsZW5hbWUiLCJyZWFkRmlsZVN5bmMiLCJpZGVudGl0eSIsInZhbHVlIiwiYXBwZW5kVG9TdHJlYW0iLCJjaHVuayIsInN0cmVhbSIsImFwcGVuZCIsIkJ1ZmZlciIsImZyb20iLCJpc0J1ZmZlciIsInJlYWQiLCJCb2lsZXJwbGF0ZSIsInRvSFRNTCIsImV4dHJhRGF0YSIsIkVycm9yIiwidG9IVE1MQXN5bmMiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInRvSFRNTFN0cmVhbSIsImNodW5rcyIsIm9uIiwicHVzaCIsImNvbmNhdCIsInRvU3RyaW5nIiwiYmFzZURhdGEiLCJoZWFkVGVtcGxhdGUiLCJjbG9zZVRlbXBsYXRlIiwiZGF0YSIsInN0YXJ0IiwiYm9keSIsImR5bmFtaWNCb2R5IiwiZW5kIiwicmVzcG9uc2UiLCJjcmVhdGVTdHJlYW0iLCJfZ2VuZXJhdGVCb2lsZXJwbGF0ZUZyb21NYW5pZmVzdCIsIm1hbmlmZXN0IiwidXJsTWFwcGVyIiwicGF0aE1hcHBlciIsImJhc2VEYXRhRXh0ZW5zaW9uIiwiaW5saW5lIiwiYm9pbGVycGxhdGVCYXNlRGF0YSIsImNzcyIsImpzIiwiaGVhZCIsIm1ldGVvck1hbmlmZXN0IiwiSlNPTiIsInN0cmluZ2lmeSIsImZvckVhY2giLCJpdGVtIiwidXJsUGF0aCIsInVybCIsIml0ZW1PYmoiLCJzY3JpcHRDb250ZW50IiwicGF0aCIsInNyaSIsInR5cGUiLCJ3aGVyZSIsInN0YXJ0c1dpdGgiLCJhcmNoIiwib3B0aW9ucyIsImdldFRlbXBsYXRlIiwicHJlZml4Iiwic3BsaXQiLCJqb2luIiwibW9kZXJuSGVhZFRlbXBsYXRlIiwibW9kZXJuQ2xvc2VUZW1wbGF0ZSIsImNvcmRvdmFIZWFkVGVtcGxhdGUiLCJjb3Jkb3ZhQ2xvc2VUZW1wbGF0ZSIsInRlbXBsYXRlIiwibW9kZSIsImh0bWxBdHRyaWJ1dGVzIiwiYnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2siLCJzcmlNb2RlIiwiZHluYW1pY0hlYWQiLCJoZWFkU2VjdGlvbnMiLCJjc3NCdW5kbGUiLCJtYXAiLCJmaWxlIiwiaHJlZiIsIk9iamVjdCIsImtleXMiLCJrZXkiLCJhdHRyTmFtZSIsImF0dHJWYWx1ZSIsImxlbmd0aCIsIm1ldGVvclJ1bnRpbWVDb25maWciLCJtZXRlb3JSdW50aW1lSGFzaCIsInJvb3RVcmxQYXRoUHJlZml4IiwiaW5saW5lU2NyaXB0c0FsbG93ZWQiLCJhZGRpdGlvbmFsU3RhdGljSnMiLCJjb25mIiwic3JjIiwiaGFzaCIsImNvbnRlbnRzIiwicGF0aG5hbWUiLCJyZUVtcHR5U3RyaW5nTGVhZGluZyIsInJlRW1wdHlTdHJpbmdNaWRkbGUiLCJyZUVtcHR5U3RyaW5nVHJhaWxpbmciLCJyZUVzY2FwZSIsInJlRXZhbHVhdGUiLCJyZUludGVycG9sYXRlIiwicmVFc1RlbXBsYXRlIiwicmVVbmVzY2FwZWRTdHJpbmciLCJodG1sRXNjYXBlcyIsInJlSGFzVW5lc2NhcGVkSHRtbCIsImVzY2FwZUh0bWwiLCJzdHJpbmciLCJ0ZXN0IiwicmVwbGFjZSIsImNociIsImVzY2FwZXMiLCJlc2NhcGVTdHJpbmdDaGFyIiwibWF0Y2giLCJpc09iamVjdCIsInRvU3RyaW5nU2FmZSIsImJhc2VWYWx1ZXMiLCJvYmplY3QiLCJwcm9wcyIsImsiLCJhdHRlbXB0IiwiZm4iLCJlIiwiaXNFcnJvciIsIm5hbWUiLCJ0ZW1wbGF0ZUNvdW50ZXIiLCJfdGVtcGxhdGUiLCJpbXBvcnRzIiwiZXNjYXBlIiwiaW1wb3J0S2V5cyIsImltcG9ydFZhbHVlcyIsImluZGV4IiwiaXNFc2NhcGluZyIsImlzRXZhbHVhdGluZyIsInNvdXJjZSIsInJlRGVsaW1pdGVycyIsIlJlZ0V4cCIsInNvdXJjZVVSTCIsImVzY2FwZVZhbHVlIiwiaW50ZXJwb2xhdGVWYWx1ZSIsImVzVGVtcGxhdGVWYWx1ZSIsImV2YWx1YXRlVmFsdWUiLCJvZmZzZXQiLCJzbGljZSIsInJlc3VsdCIsIkZ1bmN0aW9uIiwiYXBwbHkiLCJ1bmRlZmluZWQiLCJ0ZXh0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBZ0M7QUFDMEI7QUFFd0Q7QUFDRTtBQUVwSCw0QkFBNEI7QUFDNUIsTUFBTUEsbUJBQW1CQyxZQUFZQyxhQUFhRCxVQUFVO0FBRTVELE1BQU1FLFdBQVdDLFNBQVNBO0FBRTFCLFNBQVNDLGVBQWVDLEtBQUssRUFBRUMsTUFBTTtJQUNuQyxJQUFJLE9BQU9ELFVBQVUsVUFBVTtRQUM3QkMsT0FBT0MsTUFBTSxDQUFDQyxPQUFPQyxJQUFJLENBQUNKLE9BQU87SUFDbkMsT0FBTyxJQUFJRyxPQUFPRSxRQUFRLENBQUNMLFVBQ2hCLE9BQU9BLE1BQU1NLElBQUksS0FBSyxZQUFZO1FBQzNDTCxPQUFPQyxNQUFNLENBQUNGO0lBQ2hCO0FBQ0Y7QUFFQSxPQUFPLE1BQU1PO0lBYVhDLE9BQU9DLFNBQVMsRUFBRTtRQUNoQixNQUFNLElBQUlDLE1BQ1IscURBQ0U7SUFFTjtJQUVBLHVEQUF1RDtJQUN2REMsWUFBWUYsU0FBUyxFQUFFO1FBQ3JCLE9BQU8sSUFBSUcsUUFBUSxDQUFDQyxTQUFTQztZQUMzQixNQUFNYixTQUFTLElBQUksQ0FBQ2MsWUFBWSxDQUFDTjtZQUNqQyxNQUFNTyxTQUFTLEVBQUU7WUFDakJmLE9BQU9nQixFQUFFLENBQUMsUUFBUWpCLFNBQVNnQixPQUFPRSxJQUFJLENBQUNsQjtZ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QUFTM0UsQ0FBYTtJQUNuQyxPQUFPeUQsVUFBVXNCO0FBQ25CIiwiZmlsZSI6Ii9wYWNrYWdlcy9ib2lsZXJwbGF0ZS1nZW5lcmF0b3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3JlYWRGaWxlU3luY30gZnJvbSAnZnMnO1xuaW1wb3J0IHsgY3JlYXRlIGFzIGNyZWF0ZVN0cmVhbSB9IGZyb20gXCJjb21iaW5lZC1zdHJlYW0yXCI7XG5cbmltcG9ydCB7IGhlYWRUZW1wbGF0ZSBhcyBtb2Rlcm5IZWFkVGVtcGxhdGUsIGNsb3NlVGVtcGxhdGUgYXMgbW9kZXJuQ2xvc2VUZW1wbGF0ZSB9IGZyb20gJy4vdGVtcGxhdGUtd2ViLmJyb3dzZXInO1xuaW1wb3J0IHsgaGVhZFRlbXBsYXRlIGFzIGNvcmRvdmFIZWFkVGVtcGxhdGUsIGNsb3NlVGVtcGxhdGUgYXMgY29yZG92YUNsb3NlVGVtcGxhdGUgfSBmcm9tICcuL3RlbXBsYXRlLXdlYi5jb3Jkb3ZhJztcblxuLy8gQ29waWVkIGZyb20gd2ViYXBwX3NlcnZlclxuY29uc3QgcmVhZFV0ZjhGaWxlU3luYyA9IGZpbGVuYW1lID0+IHJlYWRGaWxlU3luYyhmaWxlbmFtZSwgJ3V0ZjgnKTtcblxuY29uc3QgaWRlbnRpdHkgPSB2YWx1ZSA9PiB2YWx1ZTtcblxuZnVuY3Rpb24gYXBwZW5kVG9TdHJlYW0oY2h1bmssIHN0cmVhbSkge1xuICBpZiAodHlwZW9mIGNodW5rID09PSBcInN0cmluZ1wiKSB7XG4gICAgc3RyZWFtLmFwcGVuZChCdWZmZXIuZnJvbShjaHVuaywgXCJ1dGY4XCIpKTtcbiAgfSBlbHNlIGlmIChCdWZmZXIuaXNCdWZmZXIoY2h1bmspIHx8XG4gICAgICAgICAgICAgdHlwZW9mIGNodW5rLnJlYWQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHN0cmVhbS5hcHBlbmQoY2h1bmspO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBCb2lsZXJwbGF0ZSB7XG4gIGNvbnN0cnVjdG9yKGFyY2gsIG1hbmlmZXN0LCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCB7IGhlYWRUZW1wbGF0ZSwgY2xvc2VUZW1wbGF0ZSB9ID0gZ2V0VGVtcGxhdGUoYXJjaCk7XG4gICAgdGhpcy5oZWFkVGVtcGxhdGUgPSBoZWFkVGVtcGxhdGU7XG4gICAgdGhpcy5jbG9zZVRlbXBsYXRlID0gY2xvc2VUZW1wbGF0ZTtcbiAgICB0aGlzLmJhc2VEYXRhID0gbnVsbDtcblxuICAgIHRoaXMuX2dlbmVyYXRlQm9pbGVycGxhdGVGcm9tTWFuaWZlc3QoXG4gICAgICBtYW5pZmVzdCxcbiAgICAgIG9wdGlvbnNcbiAgICApO1xuICB9XG5cbiAgdG9IVE1MKGV4dHJhRGF0YSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIFwiVGhlIEJvaWxlcnBsYXRlI3RvSFRNTCBtZXRob2QgaGFzIGJlZW4gcmVtb3ZlZC4gXCIgK1xuICAgICAgICBcIlBsZWFzZSB1c2UgQm9pbGVycGxhdGUjdG9IVE1MU3RyZWFtIGluc3RlYWQuXCJcbiAgICApO1xuICB9XG5cbiAgLy8gUmV0dXJucyBhIFByb21pc2UgdGhhdCByZXNvbHZlcyB0byBhIHN0cmluZyBvZiBIVE1MLlxuICB0b0hUTUxBc3luYyhleHRyYURhdGEpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3Qgc3RyZWFtID0gdGhpcy50b0hUTUxTdHJlYW0oZXh0cmFEYXRhKTtcbiAgICAgIGNvbnN0IGNodW5rcyA9IFtdO1xuICAgICAgc3RyZWFtLm9uKFwiZGF0YVwiLCBjaHVuayA9PiBjaHVua3MucHVzaChjaHVuaykpO1xuICAgICAgc3RyZWFtLm9uKFwiZW5kXCIsICgpID0+IHtcbiAgICAgICAgcmVzb2x2ZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoXCJ1dGY4XCIpKTtcbiAgICAgIH0pO1xuICAgICAgc3RyZWFtLm9uKFwiZXJyb3JcIiwgcmVqZWN0KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFRoZSAnZXh0cmFEYXRhJyBhcmd1bWVudCBjYW4gYmUgdXNlZCB0byBleHRlbmQgJ3NlbGYuYmFzZURhdGEnLiBJdHNcbiAgLy8gcHVycG9zZSBpcyB0byBhbGxvdyB5b3UgdG8gc3BlY2lmeSBkYXRhIHRoYXQgeW91IG1pZ2h0IG5vdCBrbm93IGF0XG4gIC8vIHRoZSB0aW1lIHRoYXQgeW91IGNvbnN0cnVjdCB0aGUgQm9pbGVycGxhdGUgb2JqZWN0LiAoZS5nLiBpdCBpcyB1c2VkXG4gIC8vIGJ5ICd3ZWJhcHAnIHRvIHNwZWNpZnkgZGF0YSB0aGF0IGlzIG9ubHkga25vd24gYXQgcmVxdWVzdC10aW1lKS5cbiAgLy8gdGhpcyByZXR1cm5zIGEgc3RyZWFtXG4gIHRvSFRNTFN0cmVhbShleHRyYURhdGEpIHtcbiAgICBpZiAoIXRoaXMuYmFzZURhdGEgfHwgIXRoaXMuaGVhZFRlbXBsYXRlIHx8ICF0aGlzLmNsb3NlVGVtcGxhdGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQm9pbGVycGxhdGUgZGlkIG5vdCBpbnN0YW50aWF0ZSBjb3JyZWN0bHkuJyk7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IHsuLi50aGlzLmJhc2VEYXRhLCAuLi5leHRyYURhdGF9O1xuICAgIGNvbnN0IHN0YXJ0ID0gXCI8IURPQ1RZUEUgaHRtbD5cXG5cIiArIHRoaXMuaGVhZFRlbXBsYXRlKGRhdGEpO1xuXG4gICAgY29uc3QgeyBib2R5LCBkeW5hbWljQm9keSB9ID0gZGF0YTtcblxuICAgIGNvbnN0IGVuZCA9IHRoaXMuY2xvc2VUZW1wbGF0ZShkYXRhKTtcbiAgICBjb25zdCByZXNwb25zZSA9IGNyZWF0ZVN0cmVhbSgpO1xuXG4gICAgYXBwZW5kVG9TdHJlYW0oc3RhcnQsIHJlc3BvbnNlKTtcblxuICAgIGlmIChib2R5KSB7XG4gICAgICBhcHBlbmRUb1N0cmVhbShib2R5LCByZXNwb25zZSk7XG4gICAgfVxuXG4gICAgaWYgKGR5bmFtaWNCb2R5KSB7XG4gICAgICBhcHBlbmRUb1N0cmVhbShkeW5hbWljQm9keSwgcmVzcG9uc2UpO1xuICAgIH1cblxuICAgIGFwcGVuZFRvU3RyZWFtKGVuZCwgcmVzcG9uc2UpO1xuXG4gICAgcmV0dXJuIHJlc3BvbnNlO1xuICB9XG5cbiAgLy8gWFhYIEV4cG9ydGVkIHRvIGFsbG93IGNsaWVudC1zaWRlIG9ubHkgY2hhbmdlcyB0byByZWJ1aWxkIHRoZSBib2lsZXJwbGF0ZVxuICAvLyB3aXRob3V0IHJlcXVpcmluZyBhIGZ1bGwgc2VydmVyIHJlc3RhcnQuXG4gIC8vIFByb2R1Y2VzIGFuIEhUTUwgc3RyaW5nIHdpdGggZ2l2ZW4gbWFuaWZlc3QgYW5kIGJvaWxlcnBsYXRlU291cmNlLlxuICAvLyBPcHRpb25hbGx5IHRha2VzIHVybE1hcHBlciBpbiBjYXNlIHVybHMgZnJvbSBtYW5pZmVzdCBuZWVkIHRvIGJlIHByZWZpeGVkXG4gIC8vIG9yIHJld3JpdHRlbi5cbiAgLy8gT3B0aW9uYWxseSB0YWtlcyBwYXRoTWFwcGVyIGZvciByZXNvbHZpbmcgcmVsYXRpdmUgZmlsZSBzeXN0ZW0gcGF0aHMuXG4gIC8vIE9wdGlvbmFsbHkgYWxsb3dzIHRvIG92ZXJyaWRlIGZpZWxkcyBvZiB0aGUgZGF0YSBjb250ZXh0LlxuICBfZ2VuZXJhdGVCb2lsZXJwbGF0ZUZyb21NYW5pZmVzdChtYW5pZmVzdCwge1xuICAgIHVybE1hcHBlciA9IGlkZW50aXR5LFxuICAgIHBhdGhNYXBwZXIgPSBpZGVudGl0eSxcbiAgICBiYXNlRGF0YUV4dGVuc2lvbixcbiAgICBpbmxpbmUsXG4gIH0gPSB7fSkge1xuXG4gICAgY29uc3QgYm9pbGVycGxhdGVCYXNlRGF0YSA9IHtcbiAgICAgIGNzczogW10sXG4gICAgICBqczogW10sXG4gICAgICBoZWFkOiAnJyxcbiAgICAgIGJvZHk6ICcnLFxuICAgICAgbWV0ZW9yTWFuaWZlc3Q6IEpTT04uc3RyaW5naWZ5KG1hbmlmZXN0KSxcbiAgICAgIC4uLmJhc2VEYXRhRXh0ZW5zaW9uLFxuICAgIH07XG5cbiAgICBtYW5pZmVzdC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgY29uc3QgdXJsUGF0aCA9IHVybE1hcHBlcihpdGVtLnVybCk7XG4gICAgICBjb25zdCBpdGVtT2JqID0geyB1cmw6IHVybFBhdGggfTtcblxuICAgICAgaWYgKGlubGluZSkge1xuICAgICAgICBpdGVtT2JqLnNjcmlwdENvbnRlbnQgPSByZWFkVXRmOEZpbGVTeW5jKFxuICAgICAgICAgIHBhdGhNYXBwZXIoaXRlbS5wYXRoKSk7XG4gICAgICAgIGl0ZW1PYmouaW5saW5lID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoaXRlbS5zcmkpIHtcbiAgICAgICAgaXRlbU9iai5zcmkgPSBpdGVtLnNyaTtcbiAgICAgIH1cblxuICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2NzcycgJiYgaXRlbS53aGVyZSA9PT0gJ2NsaWVudCcpIHtcbiAgICAgICAgYm9pbGVycGxhdGVCYXNlRGF0YS5jc3MucHVzaChpdGVtT2JqKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2pzJyAmJiBpdGVtLndoZXJlID09PSAnY2xpZW50JyAmJlxuICAgICAgICAvLyBEeW5hbWljIEpTIG1vZHVsZXMgc2hvdWxkIG5vdCBiZSBsb2FkZWQgZWFnZXJseSBpbiB0aGVcbiAgICAgICAgLy8gaW5pdGlhbCBIVE1MIG9mIHRoZSBhcHAuXG4gICAgICAgICFpdGVtLnBhdGguc3RhcnRzV2l0aCgnZHluYW1pYy8nKSkge1xuICAgICAgICBib2lsZXJwbGF0ZUJhc2VEYXRhLmpzLnB1c2goaXRlbU9iaik7XG4gICAgICB9XG5cbiAgICAgIGlmIChpdGVtLnR5cGUgPT09ICdoZWFkJykge1xuICAgICAgICBib2lsZXJwbGF0ZUJhc2VEYXRhLmhlYWQgPVxuICAgICAgICAgIHJlYWRVdGY4RmlsZVN5bmMocGF0aE1hcHBlcihpdGVtLnBhdGgpKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2JvZHknKSB7XG4gICAgICAgIGJvaWxlcnBsYXRlQmFzZURhdGEuYm9keSA9XG4gICAgICAgICAgcmVhZFV0ZjhGaWxlU3luYyhwYXRoTWFwcGVyKGl0ZW0ucGF0aCkpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5iYXNlRGF0YSA9IGJvaWxlcnBsYXRlQmFzZURhdGE7XG4gIH1cbn07XG5cbi8vIFJldHVybnMgYSB0ZW1wbGF0ZSBmdW5jdGlvbiB0aGF0LCB3aGVuIGNhbGxlZCwgcHJvZHVjZXMgdGhlIGJvaWxlcnBsYXRlXG4vLyBodG1sIGFzIGEgc3RyaW5nLlxuZnVuY3Rpb24gZ2V0VGVtcGxhdGUoYXJjaCkge1xuICBjb25zdCBwcmVmaXggPSBhcmNoLnNwbGl0KFwiLlwiLCAyKS5qb2luKFwiLlwiKTtcblxuICBpZiAocHJlZml4ID09PSBcIndlYi5icm93c2VyXCIpIHtcbiAgICByZXR1cm4geyBoZWFkVGVtcGxhdGU6IG1vZGVybkhlYWRUZW1wbGF0ZSwgY2xvc2VUZW1wbGF0ZTogbW9kZXJuQ2xvc2VUZW1wbGF0ZSB9O1xuICB9XG5cbiAgaWYgKHByZWZpeCA9PT0gXCJ3ZWIuY29yZG92YVwiKSB7XG4gICAgcmV0dXJuIHsgaGVhZFRlbXBsYXRlOiBjb3Jkb3ZhSGVhZFRlbXBsYXRlLCBjbG9zZVRlbXBsYXRlOiBjb3Jkb3ZhQ2xvc2VUZW1wbGF0ZSB9O1xuICB9XG5cbiAgdGhyb3cgbmV3IEVycm9yKFwiVW5zdXBwb3J0ZWQgYXJjaDogXCIgKyBhcmNoKTtcbn1cbiIsImltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL3RlbXBsYXRlJztcblxuY29uc3Qgc3JpID0gKHNyaSwgbW9kZSkgPT5cbiAgKHNyaSAmJiBtb2RlKSA/IGAgaW50ZWdyaXR5PVwic2hhNTEyLSR7c3JpfVwiIGNyb3Nzb3JpZ2luPVwiJHttb2RlfVwiYCA6ICcnO1xuXG5leHBvcnQgY29uc3QgaGVhZFRlbXBsYXRlID0gKHtcbiAgY3NzLFxuICBodG1sQXR0cmlidXRlcyxcbiAgYnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2ssXG4gIHNyaU1vZGUsXG4gIGhlYWQsXG4gIGR5bmFtaWNIZWFkLFxufSkgPT4ge1xuICB2YXIgaGVhZFNlY3Rpb25zID0gaGVhZC5zcGxpdCgvPG1ldGVvci1idW5kbGVkLWNzc1tePD5dKj4vLCAyKTtcbiAgdmFyIGNzc0J1bmRsZSA9IFsuLi4oY3NzIHx8IFtdKS5tYXAoZmlsZSA9PlxuICAgIHRlbXBsYXRlKCcgIDxsaW5rIHJlbD1cInN0eWxlc2hlZXRcIiB0eXBlPVwidGV4dC9jc3NcIiBjbGFzcz1cIl9fbWV0ZW9yLWNzc19fXCIgaHJlZj1cIjwlLSBocmVmICU+XCI8JT0gc3JpICU+PicpKHtcbiAgICAgIGhyZWY6IGJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rKGZpbGUudXJsKSxcbiAgICAgIHNyaTogc3JpKGZpbGUuc3JpLCBzcmlNb2RlKSxcbiAgICB9KVxuICApXS5qb2luKCdcXG4nKTtcblxuICByZXR1cm4gW1xuICAgICc8aHRtbCcgKyBPYmplY3Qua2V5cyhodG1sQXR0cmlidXRlcyB8fCB7fSkubWFwKFxuICAgICAga2V5ID0+IHRlbXBsYXRlKCcgPCU9IGF0dHJOYW1lICU+PVwiPCUtIGF0dHJWYWx1ZSAlPlwiJykoe1xuICAgICAgICBhdHRyTmFtZToga2V5LFxuICAgICAgICBhdHRyVmFsdWU6IGh0bWxBdHRyaWJ1dGVzW2tleV0sXG4gICAgICB9KVxuICAgICkuam9pbignJykgKyAnPicsXG5cbiAgICAnPGhlYWQ+JyxcblxuICAgIChoZWFkU2VjdGlvbnMubGVuZ3RoID09PSAxKVxuICAgICAgPyBbY3NzQnVuZGxlLCBoZWFkU2VjdGlvbnNbMF1dLmpvaW4oJ1xcbicpXG4gICAgICA6IFtoZWFkU2VjdGlvbnNbMF0sIGNzc0J1bmRsZSwgaGVhZFNlY3Rpb25zWzFdXS5qb2luKCdcXG4nKSxcblxuICAgIGR5bmFtaWNIZWFkLFxuICAgICc8L2hlYWQ+JyxcbiAgICAnPGJvZHk+JyxcbiAgXS5qb2luKCdcXG4nKTtcbn07XG5cbi8vIFRlbXBsYXRlIGZ1bmN0aW9uIGZvciByZW5kZXJpbmcgdGhlIGJvaWxlcnBsYXRlIGh0bWwgZm9yIGJyb3dzZXJzXG5leHBvcnQgY29uc3QgY2xvc2VUZW1wbGF0ZSA9ICh7XG4gIG1ldGVvclJ1bnRpbWVDb25maWcsXG4gIG1ldGVvclJ1bnRpbWVIYXNoLFxuICByb290VXJsUGF0aFByZWZpeCxcbiAgaW5saW5lU2NyaXB0c0FsbG93ZWQsXG4gIGpzLFxuICBhZGRpdGlvbmFsU3RhdGljSnMsXG4gIGJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rLFxuICBzcmlNb2RlLFxufSkgPT4gW1xuICAnJyxcbiAgaW5saW5lU2NyaXB0c0FsbG93ZWRcbiAgICA/IHRlbXBsYXRlKCcgIDxzY3JpcHQgdHlwZT1cInRleHQvamF2YXNjcmlwdFwiPl9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18gPSBKU09OLnBhcnNlKGRlY29kZVVSSUNvbXBvbmVudCg8JT0gY29uZiAlPikpPC9zY3JpcHQ+Jykoe1xuICAgICAgY29uZjogbWV0ZW9yUnVudGltZUNvbmZpZyxcbiAgICB9KVxuICAgIDogdGVtcGxhdGUoJyAgPHNjcmlwdCB0eXBlPVwidGV4dC9qYXZhc2NyaXB0XCIgc3JjPVwiPCUtIHNyYyAlPi9tZXRlb3JfcnVudGltZV9jb25maWcuanM/aGFzaD08JS0gaGFzaCAlPlwiPjwvc2NyaXB0PicpKHtcbiAgICAgIHNyYzogcm9vdFVybFBhdGhQcmVmaXgsXG4gICAgICBoYXNoOiBtZXRlb3JSdW50aW1lSGFzaCxcbiAgICB9KSxcbiAgJycsXG5cbiAgLi4uKGpzIHx8IFtdKS5tYXAoZmlsZSA9PlxuICAgIHRlbXBsYXRlKCcgIDxzY3JpcHQgdHlwZT1cInRleHQvamF2YXNjcmlwdFwiIHNyYz1cIjwlLSBzcmMgJT5cIjwlPSBzcmkgJT4+PC9zY3JpcHQ+Jykoe1xuICAgICAgc3JjOiBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayhmaWxlLnVybCksXG4gICAgICBzcmk6IHNyaShmaWxlLnNyaSwgc3JpTW9kZSksXG4gICAgfSlcbiAgKSxcblxuICAuLi4oYWRkaXRpb25hbFN0YXRpY0pzIHx8IFtdKS5tYXAoKHsgY29udGVudHMsIHBhdGhuYW1lIH0pID0+IChcbiAgICBpbmxpbmVTY3JpcHRzQWxsb3dlZFxuICAgICAgPyB0ZW1wbGF0ZSgnICA8c2NyaXB0PjwlPSBjb250ZW50cyAlPjwvc2NyaXB0PicpKHtcbiAgICAgICAgY29udGVudHMsXG4gICAgICB9KVxuICAgICAgOiB0ZW1wbGF0ZSgnICA8c2NyaXB0IHR5cGU9XCJ0ZXh0L2phdmFzY3JpcHRcIiBzcmM9XCI8JS0gc3JjICU+XCI+PC9zY3JpcHQ+Jykoe1xuICAgICAgICBzcmM6IHJvb3RVcmxQYXRoUHJlZml4ICsgcGF0aG5hbWUsXG4gICAgICB9KVxuICApKSxcblxuICAnJyxcbiAgJycsXG4gICc8L2JvZHk+JyxcbiAgJzwvaHRtbD4nXG5dLmpvaW4oJ1xcbicpO1xuIiwiaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vdGVtcGxhdGUnO1xuXG4vLyBUZW1wbGF0ZSBmdW5jdGlvbiBmb3IgcmVuZGVyaW5nIHRoZSBib2lsZXJwbGF0ZSBodG1sIGZvciBjb3Jkb3ZhXG5leHBvcnQgY29uc3QgaGVhZFRlbXBsYXRlID0gKHtcbiAgbWV0ZW9yUnVudGltZUNvbmZpZyxcbiAgcm9vdFVybFBhdGhQcmVmaXgsXG4gIGlubGluZVNjcmlwdHNBbGxvd2VkLFxuICBjc3MsXG4gIGpzLFxuICBhZGRpdGlvbmFsU3RhdGljSnMsXG4gIGh0bWxBdHRyaWJ1dGVzLFxuICBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayxcbiAgaGVhZCxcbiAgZHluYW1pY0hlYWQsXG59KSA9PiB7XG4gIHZhciBoZWFkU2VjdGlvbnMgPSBoZWFkLnNwbGl0KC88bWV0ZW9yLWJ1bmRsZWQtY3NzW148Pl0qPi8sIDIpO1xuICB2YXIgY3NzQnVuZGxlID0gW1xuICAgIC8vIFdlIGFyZSBleHBsaWNpdGx5IG5vdCB1c2luZyBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vazogaW4gY29yZG92YSB3ZSBzZXJ2ZSBhc3NldHMgdXAgZGlyZWN0bHkgZnJvbSBkaXNrLCBzbyByZXdyaXRpbmcgdGhlIFVSTCBkb2VzIG5vdCBtYWtlIHNlbnNlXG4gICAgLi4uKGNzcyB8fCBbXSkubWFwKGZpbGUgPT5cbiAgICAgIHRlbXBsYXRlKCcgIDxsaW5rIHJlbD1cInN0eWxlc2hlZXRcIiB0eXBlPVwidGV4dC9jc3NcIiBjbGFzcz1cIl9fbWV0ZW9yLWNzc19fXCIgaHJlZj1cIjwlLSBocmVmICU+XCI+Jykoe1xuICAgICAgICBocmVmOiBmaWxlLnVybCxcbiAgICAgIH0pXG4gICldLmpvaW4oJ1xcbicpO1xuXG4gIHJldHVybiBbXG4gICAgJzxodG1sPicsXG4gICAgJzxoZWFkPicsXG4gICAgJyAgPG1ldGEgY2hhcnNldD1cInV0Zi04XCI+JyxcbiAgICAnICA8bWV0YSBuYW1lPVwiZm9ybWF0LWRldGVjdGlvblwiIGNvbnRlbnQ9XCJ0ZWxlcGhvbmU9bm9cIj4nLFxuICAgICcgIDxtZXRhIG5hbWU9XCJ2aWV3cG9ydFwiIGNvbnRlbnQ9XCJ1c2VyLXNjYWxhYmxlPW5vLCBpbml0aWFsLXNjYWxlPTEsIG1heGltdW0tc2NhbGU9MSwgbWluaW11bS1zY2FsZT0xLCB3aWR0aD1kZXZpY2Utd2lkdGgsIGhlaWdodD1kZXZpY2UtaGVpZ2h0LCB2aWV3cG9ydC1maXQ9Y292ZXJcIj4nLFxuICAgICcgIDxtZXRhIG5hbWU9XCJtc2FwcGxpY2F0aW9uLXRhcC1oaWdobGlnaHRcIiBjb250ZW50PVwibm9cIj4nLFxuICAgICcgIDxtZXRhIGh0dHAtZXF1aXY9XCJDb250ZW50LVNlY3VyaXR5LVBvbGljeVwiIGNvbnRlbnQ9XCJkZWZhdWx0LXNyYyAqIGFuZHJvaWQtd2Vidmlldy12aWRlby1wb3N0ZXI6IGdhcDogZGF0YTogYmxvYjogXFwndW5zYWZlLWlubGluZVxcJyBcXCd1bnNhZmUtZXZhbFxcJyB3czogd3NzOjtcIj4nLFxuXG4gIChoZWFkU2VjdGlvbnMubGVuZ3RoID09PSAxKVxuICAgID8gW2Nzc0J1bmRsZSwgaGVhZFNlY3Rpb25zWzBdXS5qb2luKCdcXG4nKVxuICAgIDogW2hlYWRTZWN0aW9uc1swXSwgY3NzQnVuZGxlLCBoZWFkU2VjdGlvbnNbMV1dLmpvaW4oJ1xcbicpLFxuXG4gICAgJyAgPHNjcmlwdCB0eXBlPVwidGV4dC9qYXZhc2NyaXB0XCI+JyxcbiAgICB0ZW1wbGF0ZSgnICAgIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18gPSBKU09OLnBhcnNlKGRlY29kZVVSSUNvbXBvbmVudCg8JT0gY29uZiAlPikpOycpKHtcbiAgICAgIGNvbmY6IG1ldGVvclJ1bnRpbWVDb25maWcsXG4gICAgfSksXG4gICAgJyAgICBpZiAoL0FuZHJvaWQvaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpKSB7JyxcbiAgICAvLyBXaGVuIEFuZHJvaWQgYXBwIGlzIGVtdWxhdGVkLCBpdCBjYW5ub3QgY29ubmVjdCB0byBsb2NhbGhvc3QsXG4gICAgLy8gaW5zdGVhZCBpdCBzaG91bGQgY29ubmVjdCB0byAxMC4wLjIuMlxuICAgIC8vICh1bmxlc3Mgd2VcXCdyZSB1c2luZyBhbiBodHRwIHByb3h5OyB0aGVuIGl0IHdvcmtzISlcbiAgICAnICAgICAgaWYgKCFfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLmh0dHBQcm94eVBvcnQpIHsnLFxuICAgICcgICAgICAgIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkwgPSAoX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTCB8fCBcXCdcXCcpLnJlcGxhY2UoL2xvY2FsaG9zdC9pLCBcXCcxMC4wLjIuMlxcJyk7JyxcbiAgICAnICAgICAgICBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLkREUF9ERUZBVUxUX0NPTk5FQ1RJT05fVVJMID0gKF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uRERQX0RFRkFVTFRfQ09OTkVDVElPTl9VUkwgfHwgXFwnXFwnKS5yZXBsYWNlKC9sb2NhbGhvc3QvaSwgXFwnMTAuMC4yLjJcXCcpOycsXG4gICAgJyAgICAgIH0nLFxuICAgICcgICAgfScsXG4gICAgJyAgPC9zY3JpcHQ+JyxcbiAgICAnJyxcbiAgICAnICA8c2NyaXB0IHR5cGU9XCJ0ZXh0L2phdmFzY3JpcHRcIiBzcmM9XCIvY29yZG92YS5qc1wiPjwvc2NyaXB0PicsXG5cbiAgICAuLi4oanMgfHwgW10pLm1hcChmaWxlID0+XG4gICAgICB0ZW1wbGF0ZSgnICA8c2NyaXB0IHR5cGU9XCJ0ZXh0L2phdmFzY3JpcHRcIiBzcmM9XCI8JS0gc3JjICU+XCI+PC9zY3JpcHQ+Jykoe1xuICAgICAgICBzcmM6IGZpbGUudXJsLFxuICAgICAgfSlcbiAgICApLFxuXG4gICAgLi4uKGFkZGl0aW9uYWxTdGF0aWNKcyB8fCBbXSkubWFwKCh7IGNvbnRlbnRzLCBwYXRobmFtZSB9KSA9PiAoXG4gICAgICBpbmxpbmVTY3JpcHRzQWxsb3dlZFxuICAgICAgICA/IHRlbXBsYXRlKCcgIDxzY3JpcHQ+PCU9IGNvbnRlbnRzICU+PC9zY3JpcHQ+Jykoe1xuICAgICAgICAgIGNvbnRlbnRzLFxuICAgICAgICB9KVxuICAgICAgICA6IHRlbXBsYXRlKCcgIDxzY3JpcHQgdHlwZT1cInRleHQvamF2YXNjcmlwdFwiIHNyYz1cIjwlLSBzcmMgJT5cIj48L3NjcmlwdD4nKSh7XG4gICAgICAgICAgc3JjOiByb290VXJsUGF0aFByZWZpeCArIHBhdGhuYW1lXG4gICAgICAgIH0pXG4gICAgKSksXG4gICAgJycsXG4gICAgJzwvaGVhZD4nLFxuICAgICcnLFxuICAgICc8Ym9keT4nLFxuICBdLmpvaW4oJ1xcbicpO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNsb3NlVGVtcGxhdGUoKSB7XG4gIHJldHVybiBcIjwvYm9keT5cXG48L2h0bWw+XCI7XG59XG4iLCIvKipcbiAqIEludGVybmFsIGZ1bGwtZmVhdHVyZWQgaW1wbGVtZW50YXRpb24gb2YgbG9kYXNoLnRlbXBsYXRlIChpbnNwaXJlZCBieSB2NC41LjApXG4gKiBlbWJlZGRlZCB0byBlbGltaW5hdGUgdGhlIGV4dGVybmFsIGRlcGVuZGVuY3kgd2hpbGUgcHJlc2VydmluZyBmdW5jdGlvbmFsaXR5LlxuICpcbiAqIE1JVCBMaWNlbnNlIChjKSBKUyBGb3VuZGF0aW9uIGFuZCBvdGhlciBjb250cmlidXRvcnMgPGh0dHBzOi8vanMuZm91bmRhdGlvbi8+XG4gKiBBZGFwdGVkIGZvciBNZXRlb3IgYm9pbGVycGxhdGUtZ2VuZXJhdG9yIChvbmx5IHRoZSBwaWVjZXMgcmVxdWlyZWQgYnkgdGVtcGxhdGUgd2VyZSBleHRyYWN0ZWQpLlxuICovXG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gVXRpbGl0eSAmIHJlZ2V4IGRlZmluaXRpb25zIChtaXJyb3JpbmcgbG9kYXNoIHBpZWNlcyB1c2VkIGJ5IHRlbXBsYXRlKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmNvbnN0IHJlRW1wdHlTdHJpbmdMZWFkaW5nID0gL1xcYl9fcCBcXCs9ICcnOy9nO1xuY29uc3QgcmVFbXB0eVN0cmluZ01pZGRsZSA9IC9cXGIoX19wIFxcKz0pICcnIFxcKy9nO1xuY29uc3QgcmVFbXB0eVN0cmluZ1RyYWlsaW5nID0gLyhfX2VcXCguKj9cXCl8XFxiX190XFwpKSBcXCtcXG4nJzsvZztcblxuY29uc3QgcmVFc2NhcGUgPSAvPCUtKFtcXHNcXFNdKz8pJT4vZzsgICAgICAgICAgICAgIC8vIGVzY2FwZSBkZWxpbWl0ZXJcbmNvbnN0IHJlRXZhbHVhdGUgPSAvPCUoW1xcc1xcU10rPyklPi9nOyAgICAgICAgICAgICAgLy8gZXZhbHVhdGUgZGVsaW1pdGVyXG5jb25zdCByZUludGVycG9sYXRlID0gLzwlPShbXFxzXFxTXSs/KSU+L2c7ICAgICAgICAgIC8vIGludGVycG9sYXRlIGRlbGltaXRlclxuY29uc3QgcmVFc1RlbXBsYXRlID0gL1xcJFxceyhbXlxcXFx9XSooPzpcXFxcLlteXFxcXH1dKikqKVxcfS9nOyAvLyBFUzYgdGVtcGxhdGUgbGl0ZXJhbCBjYXB0dXJlXG5jb25zdCByZVVuZXNjYXBlZFN0cmluZyA9IC9bJ1xcXFxcXG5cXHJcXHUyMDI4XFx1MjAyOV0vZzsgLy8gc3RyaW5nIGxpdGVyYWwgZXNjYXBlc1xuXG4vLyBIVE1MIGVzY2FwZVxuY29uc3QgaHRtbEVzY2FwZXMgPSB7ICcmJzogJyZhbXA7JywgJzwnOiAnJmx0OycsICc+JzogJyZndDsnLCAnXCInOiAnJnF1b3Q7JywgXCInXCI6ICcmIzM5OycgfTtcbmNvbnN0IHJlSGFzVW5lc2NhcGVkSHRtbCA9IC9bJjw+XCInXS87XG5cbmZ1bmN0aW9uIGVzY2FwZUh0bWwoc3RyaW5nKSB7XG4gIHJldHVybiBzdHJpbmcgJiYgcmVIYXNVbmVzY2FwZWRIdG1sLnRlc3Qoc3RyaW5nKVxuICAgID8gc3RyaW5nLnJlcGxhY2UoL1smPD5cIiddL2csIGNociA9PiBodG1sRXNjYXBlc1tjaHJdKVxuICAgIDogKHN0cmluZyB8fCAnJyk7XG59XG5cbi8vIEVzY2FwZSBjaGFyYWN0ZXJzIGZvciBpbmNsdXNpb24gaW50byBhIHN0cmluZyBsaXRlcmFsXG5jb25zdCBlc2NhcGVzID0geyBcIidcIjogXCInXCIsICdcXFxcJzogJ1xcXFwnLCAnXFxuJzogJ24nLCAnXFxyJzogJ3InLCAnXFx1MjAyOCc6ICd1MjAyOCcsICdcXHUyMDI5JzogJ3UyMDI5JyB9O1xuZnVuY3Rpb24gZXNjYXBlU3RyaW5nQ2hhcihtYXRjaCkgeyByZXR1cm4gJ1xcXFwnICsgZXNjYXBlc1ttYXRjaF07IH1cblxuLy8gQmFzaWMgT2JqZWN0IGhlbHBlcnMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5mdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgIT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnOyB9XG5mdW5jdGlvbiB0b1N0cmluZ1NhZmUodmFsdWUpIHsgcmV0dXJuIHZhbHVlID09IG51bGwgPyAnJyA6ICh2YWx1ZSArICcnKTsgfVxuZnVuY3Rpb24gYmFzZVZhbHVlcyhvYmplY3QsIHByb3BzKSB7IHJldHVybiBwcm9wcy5tYXAoayA9PiBvYmplY3Rba10pOyB9XG5cblxuZnVuY3Rpb24gYXR0ZW1wdChmbikge1xuICB0cnkgeyByZXR1cm4gZm4oKTsgfSBjYXRjaCAoZSkgeyByZXR1cm4gZTsgfVxufVxuZnVuY3Rpb24gaXNFcnJvcih2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBFcnJvciB8fCAoaXNPYmplY3QodmFsdWUpICYmIHZhbHVlLm5hbWUgPT09ICdFcnJvcicpOyB9XG5cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBNYWluIHRlbXBsYXRlIGltcGxlbWVudGF0aW9uXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmxldCB0ZW1wbGF0ZUNvdW50ZXIgPSAtMTsgLy8gdXNlZCBmb3Igc291cmNlVVJMIGdlbmVyYXRpb25cblxuZnVuY3Rpb24gX3RlbXBsYXRlKHN0cmluZykge1xuICBzdHJpbmcgPSB0b1N0cmluZ1NhZmUoc3RyaW5nKTtcblxuICBjb25zdCBpbXBvcnRzID0geyAnXyc6IHsgZXNjYXBlOiBlc2NhcGVIdG1sIH0gfTtcbiAgY29uc3QgaW1wb3J0S2V5cyA9IE9iamVjdC5rZXlzKGltcG9ydHMpO1xuICBjb25zdCBpbXBvcnRWYWx1ZXMgPSBiYXNlVmFsdWVzKGltcG9ydHMsIGltcG9ydEtleXMpO1xuXG4gIGxldCBpbmRleCA9IDA7XG4gIGxldCBpc0VzY2FwaW5nO1xuICBsZXQgaXNFdmFsdWF0aW5nO1xuICBsZXQgc291cmNlID0gXCJfX3AgKz0gJ1wiO1xuXG5cbiAgLy8gQnVpbGQgY29tYmluZWQgcmVnZXggb2YgZGVsaW1pdGVyc1xuICBjb25zdCByZURlbGltaXRlcnMgPSBSZWdFeHAoXG4gICAgcmVFc2NhcGUuc291cmNlICsgJ3wnICtcbiAgICByZUludGVycG9sYXRlLnNvdXJjZSArICd8JyArXG4gICAgcmVFc1RlbXBsYXRlLnNvdXJjZSArICd8JyArXG4gICAgcmVFdmFsdWF0ZS5zb3VyY2UgKyAnfCQnXG4gICwgJ2cnKTtcblxuICBjb25zdCBzb3VyY2VVUkwgPSBgLy8jIHNvdXJjZVVSTD1sb2Rhc2gudGVtcGxhdGVTb3VyY2VzWyR7Kyt0ZW1wbGF0ZUNvdW50ZXJ9XVxcbmA7XG5cbiAgLy8gVG9rZW5pemVcbiAgc3RyaW5nLnJlcGxhY2UocmVEZWxpbWl0ZXJzLCBmdW5jdGlvbihtYXRjaCwgZXNjYXBlVmFsdWUsIGludGVycG9sYXRlVmFsdWUsIGVzVGVtcGxhdGVWYWx1ZSwgZXZhbHVhdGVWYWx1ZSwgb2Zmc2V0KSB7XG4gICAgaW50ZXJwb2xhdGVWYWx1ZSB8fCAoaW50ZXJwb2xhdGVWYWx1ZSA9IGVzVGVtcGxhdGVWYWx1ZSk7XG4gICAgLy8gQXBwZW5kIHByZWNlZGluZyBzdHJpbmcgcG9ydGlvbiB3aXRoIGVzY2FwZWQgbGl0ZXJhbCBjaGFyc1xuICAgIHNvdXJjZSArPSBzdHJpbmcuc2xpY2UoaW5kZXgsIG9mZnNldCkucmVwbGFjZShyZVVuZXNjYXBlZFN0cmluZywgZXNjYXBlU3RyaW5nQ2hhcik7XG4gICAgaWYgKGVzY2FwZVZhbHVlKSB7XG4gICAgICBpc0VzY2FwaW5nID0gdHJ1ZTtcbiAgICAgIHNvdXJjZSArPSBcIicgK1xcbl9fZShcIiArIGVzY2FwZVZhbHVlICsgXCIpICtcXG4nXCI7XG4gICAgfVxuICAgIGlmIChldmFsdWF0ZVZhbHVlKSB7XG4gICAgICBpc0V2YWx1YXRpbmcgPSB0cnVlO1xuICAgICAgc291cmNlICs9IFwiJztcXG5cIiArIGV2YWx1YXRlVmFsdWUgKyBcIjtcXG5fX3AgKz0gJ1wiO1xuICAgIH1cbiAgICBpZiAoaW50ZXJwb2xhdGVWYWx1ZSkge1xuICAgICAgc291cmNlICs9IFwiJyArXFxuKChfX3QgPSAoXCIgKyBpbnRlcnBvbGF0ZVZhbHVlICsgXCIpKSA9PSBudWxsID8gJycgOiBfX3QpICtcXG4nXCI7XG4gICAgfVxuICAgIGluZGV4ID0gb2Zmc2V0ICsgbWF0Y2gubGVuZ3RoO1xuICAgIHJldHVybiBtYXRjaDtcbiAgfSk7XG5cbiAgc291cmNlICs9IFwiJztcXG5cIjtcblxuICBzb3VyY2UgPSAnd2l0aCAob2JqKSB7XFxuJyArIHNvdXJjZSArICdcXG59XFxuJztcblxuICAvLyBSZW1vdmUgdW5uZWNlc3NhcnkgY29uY2F0ZW5hdGlvbnNcbiAgc291cmNlID0gKGlzRXZhbHVhdGluZyA/IHNvdXJjZS5yZXBsYWNlKHJlRW1wdHlTdHJpbmdMZWFkaW5nLCAnJykgOiBzb3VyY2UpXG4gICAgLnJlcGxhY2UocmVFbXB0eVN0cmluZ01pZGRsZSwgJyQxJylcbiAgICAucmVwbGFjZShyZUVtcHR5U3RyaW5nVHJhaWxpbmcsICckMTsnKTtcblxuICAvLyBGcmFtZSBhcyBmdW5jdGlvbiBib2R5XG4gIHNvdXJjZSA9ICdmdW5jdGlvbihvYmopIHtcXG4nICtcbiAgICAnb2JqIHx8IChvYmogPSB7fSk7XFxuJyArXG4gICAgXCJ2YXIgX190LCBfX3AgPSAnJ1wiICtcbiAgICAoaXNFc2NhcGluZyA/ICcsIF9fZSA9IF8uZXNjYXBlJyA6ICcnKSArXG4gICAgKGlzRXZhbHVhdGluZ1xuICAgICAgPyAnLCBfX2ogPSBBcnJheS5wcm90b3R5cGUuam9pbjtcXG5mdW5jdGlvbiBwcmludCgpIHsgX19wICs9IF9fai5jYWxsKGFyZ3VtZW50cywgXFwnXFwnKSB9XFxuJ1xuICAgICAgOiAnO1xcbidcbiAgICApICtcbiAgICBzb3VyY2UgK1xuICAgICdyZXR1cm4gX19wXFxufSc7XG5cbiAgLy8gQWN0dWFsIGNvbXBpbGUgc3RlcFxuICBjb25zdCByZXN1bHQgPSBhdHRlbXB0KGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBGdW5jdGlvbihpbXBvcnRLZXlzLCBzb3VyY2VVUkwgKyAncmV0dXJuICcgKyBzb3VyY2UpLmFwcGx5KHVuZGVmaW5lZCwgaW1wb3J0VmFsdWVzKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1uZXctZnVuY1xuICB9KTtcblxuICBpZiAoaXNFcnJvcihyZXN1bHQpKSB7XG4gICAgcmVzdWx0LnNvdXJjZSA9IHNvdXJjZTsgLy8gZXhwb3NlIGZvciBkZWJ1Z2dpbmcgaWYgZXJyb3JcbiAgICB0aHJvdyByZXN1bHQ7XG4gIH1cbiAgLy8gRXhwb3NlIGNvbXBpbGVkIHNvdXJjZVxuICByZXN1bHQuc291cmNlID0gc291cmNlO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB0ZW1wbGF0ZSh0ZXh0KSB7XG4gIHJldHVybiBfdGVtcGxhdGUodGV4dCk7XG59XG4iXX0=
