Package["core-runtime"].queue("routepolicy",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var RoutePolicy;

var require = meteorInstall({"node_modules":{"meteor":{"routepolicy":{"main.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/routepolicy/main.js                                                                                      //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({RoutePolicy:()=>RoutePolicy},true);let RoutePolicyConstructor;module.link('./routepolicy',{default(v){RoutePolicyConstructor=v}},0);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
const RoutePolicy = new RoutePolicyConstructor();
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"routepolicy.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/routepolicy/routepolicy.js                                                                               //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.export({default:()=>RoutePolicy});// In addition to listing specific files to be cached, the browser
// application cache manifest allows URLs to be designated as NETWORK
// (always fetched from the Internet) and FALLBACK (which we use to
// serve app HTML on arbitrary URLs).
//
// The limitation of the manifest file format is that the designations
// are by prefix only: if "/foo" is declared NETWORK then "/foobar"
// will also be treated as a network route.
//
// RoutePolicy is a low-level API for declaring the route type of URL prefixes:
//
// "network": for network routes that should not conflict with static
// resources.  (For example, if "/sockjs/" is a network route, we
// shouldn't have "/sockjs/red-sock.jpg" as a static resource).
//
// "static-online": for static resources which should not be cached in
// the app cache.  This is implemented by also adding them to the
// NETWORK section (as otherwise the browser would receive app HTML
// for them because of the FALLBACK section), but static-online routes
// don't need to be checked for conflict with static resources.
class RoutePolicy {
    urlPrefixMatches(urlPrefix, url) {
        return url.startsWith(urlPrefix);
    }
    checkType(type) {
        if (![
            'network',
            'static-online'
        ].includes(type)) {
            return 'the route type must be "network" or "static-online"';
        }
        return null;
    }
    checkUrlPrefix(urlPrefix, type) {
        if (!urlPrefix.startsWith('/')) {
            return 'a route URL prefix must begin with a slash';
        }
        if (urlPrefix === '/') {
            return 'a route URL prefix cannot be /';
        }
        const existingType = this.urlPrefixTypes[urlPrefix];
        if (existingType && existingType !== type) {
            return `the route URL prefix ${urlPrefix} has already been declared ` + `to be of type ${existingType}`;
        }
        return null;
    }
    checkForConflictWithStatic(urlPrefix, type, _testManifest) {
        if (type === 'static-online') {
            return null;
        }
        const policy = this;
        function check(manifest) {
            const conflict = manifest.find((resource)=>resource.type === 'static' && resource.where === 'client' && policy.urlPrefixMatches(urlPrefix, resource.url));
            if (conflict) {
                return `static resource ${conflict.url} conflicts with ${type} ` + `route ${urlPrefix}`;
            }
            return null;
        }
        ;
        if (_testManifest) {
            return check(_testManifest);
        }
        const { WebApp } = require("meteor/webapp");
        let errorMessage = null;
        Object.keys(WebApp.clientPrograms).some((arch)=>{
            const { manifest } = WebApp.clientPrograms[arch];
            return errorMessage = check(manifest);
        });
        return errorMessage;
    }
    declare(urlPrefix, type) {
        const problem = this.checkType(type) || this.checkUrlPrefix(urlPrefix, type) || this.checkForConflictWithStatic(urlPrefix, type);
        if (problem) {
            throw new Error(problem);
        }
        // TODO overlapping prefixes, e.g. /foo/ and /foo/bar/
        this.urlPrefixTypes[urlPrefix] = type;
    }
    isValidUrl(url) {
        return url.startsWith('/');
    }
    classify(url) {
        if (!this.isValidUrl(url)) {
            throw new Error(`url must be a relative URL: ${url}`);
        }
        const prefix = Object.keys(this.urlPrefixTypes).find((prefix)=>this.urlPrefixMatches(prefix, url));
        return prefix ? this.urlPrefixTypes[prefix] : null;
    }
    urlPrefixesFor(type) {
        return Object.entries(this.urlPrefixTypes).filter(([_prefix, _type])=>_type === type).map(([_prefix])=>_prefix).sort();
    }
    constructor(){
        // maps prefix to a type
        this.urlPrefixTypes = {};
    }
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});


/* Exports */
return {
  export: function () { return {
      RoutePolicy: RoutePolicy
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/routepolicy/main.js"
  ],
  mainModulePath: "/node_modules/meteor/routepolicy/main.js"
}});

//# sourceURL=meteor://💻app/packages/routepolicy.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm91dGVwb2xpY3kvbWFpbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm91dGVwb2xpY3kvcm91dGVwb2xpY3kuanMiXSwibmFtZXMiOlsiZGVmYXVsdCIsIlJvdXRlUG9saWN5Q29uc3RydWN0b3IiLCJSb3V0ZVBvbGljeSIsInVybFByZWZpeE1hdGNoZXMiLCJ1cmxQcmVmaXgiLCJ1cmwiLCJzdGFydHNXaXRoIiwiY2hlY2tUeXBlIiwidHlwZSIsImluY2x1ZGVzIiwiY2hlY2tVcmxQcmVmaXgiLCJleGlzdGluZ1R5cGUiLCJ1cmxQcmVmaXhUeXBlcyIsImNoZWNrRm9yQ29uZmxpY3RXaXRoU3RhdGljIiwiX3Rlc3RNYW5pZmVzdCIsInBvbGljeSIsImNoZWNrIiwibWFuaWZlc3QiLCJjb25mbGljdCIsImZpbmQiLCJyZXNvdXJjZSIsIndoZXJlIiwiV2ViQXBwIiwicmVxdWlyZSIsImVycm9yTWVzc2FnZSIsIk9iamVjdCIsImtleXMiLCJjbGllbnRQcm9ncmFtcyIsInNvbWUiLCJhcmNoIiwiZGVjbGFyZSIsInByb2JsZW0iLCJFcnJvciIsImlzVmFsaWRVcmwiLCJjbGFzc2lmeSIsInByZWZpeCIsInVybFByZWZpeGVzRm9yIiwiZW50cmllcyIsImZpbHRlciIsIl9wcmVmaXgiLCJfdHlwZSIsIm1hcCIsInNvcnQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsU0FBU0EsV0FBV0Msc0JBQXNCLFFBQVEsZ0JBQWdCO0FBQ2xFLE9BQU8sTUFBTUMsY0FBYyxJQUFJRCxrQkFBeUI7Ozs7Ozs7Ozs7Ozs7QUNEeEQsa0VBQWtFO0FBQ2xFLHFFQUFxRTtBQUNyRSxtRUFBbUU7QUFDbkUscUNBQXFDO0FBQ3JDLEVBQUU7QUFDRixzRUFBc0U7QUFDdEUsbUVBQW1FO0FBQ25FLDJDQUEyQztBQUMzQyxFQUFFO0FBQ0YsK0VBQStFO0FBQy9FLEVBQUU7QUFDRixxRUFBcUU7QUFD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LEdBQUc7SUFDaEQ7SUFFQUMsZUFBZTVCLElBQUksRUFBRTtRQUNuQixPQUFPaUIsT0FBT1ksT0FBTyxDQUFDLElBQUksQ0FBQ3pCLGNBQWMsRUFDdEMwQixNQUFNLENBQUMsQ0FBQyxDQUFDQyxTQUFTQyxNQUFNLEdBQUtBLFVBQVVoQyxNQUN2Q2lDLEdBQUcsQ0FBQyxDQUFDLENBQUNGLFFBQVEsR0FBS0EsU0FDbkJHLElBQUk7SUFDVDtJQXhHQSxhQUFjO1FBQ1osd0JBQXdCO1FBQ3hCLElBQUksQ0FBQzlCLGNBQWMsR0FBRyxDQUFDO0lBQ3pCO0FBc0dGO0FBQUMiLCJmaWxlIjoiL3BhY2thZ2VzL3JvdXRlcG9saWN5LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZGVmYXVsdCBhcyBSb3V0ZVBvbGljeUNvbnN0cnVjdG9yIH0gZnJvbSAnLi9yb3V0ZXBvbGljeSc7XG5leHBvcnQgY29uc3QgUm91dGVQb2xpY3kgPSBuZXcgUm91dGVQb2xpY3lDb25zdHJ1Y3RvcigpO1xuIiwiLy8gSW4gYWRkaXRpb24gdG8gbGlzdGluZyBzcGVjaWZpYyBmaWxlcyB0byBiZSBjYWNoZWQsIHRoZSBicm93c2VyXG4vLyBhcHBsaWNhdGlvbiBjYWNoZSBtYW5pZmVzdCBhbGxvd3MgVVJMcyB0byBiZSBkZXNpZ25hdGVkIGFzIE5FVFdPUktcbi8vIChhbHdheXMgZmV0Y2hlZCBmcm9tIHRoZSBJbnRlcm5ldCkgYW5kIEZBTExCQUNLICh3aGljaCB3ZSB1c2UgdG9cbi8vIHNlcnZlIGFwcCBIVE1MIG9uIGFyYml0cmFyeSBVUkxzKS5cbi8vXG4vLyBUaGUgbGltaXRhdGlvbiBvZiB0aGUgbWFuaWZlc3QgZmlsZSBmb3JtYXQgaXMgdGhhdCB0aGUgZGVzaWduYXRpb25zXG4vLyBhcmUgYnkgcHJlZml4IG9ubHk6IGlmIFwiL2Zvb1wiIGlzIGRlY2xhcmVkIE5FVFdPUksgdGhlbiBcIi9mb29iYXJcIlxuLy8gd2lsbCBhbHNvIGJlIHRyZWF0ZWQgYXMgYSBuZXR3b3JrIHJvdXRlLlxuLy9cbi8vIFJvdXRlUG9saWN5IGlzIGEgbG93LWxldmVsIEFQSSBmb3IgZGVjbGFyaW5nIHRoZSByb3V0ZSB0eXBlIG9mIFVSTCBwcmVmaXhlczpcbi8vXG4vLyBcIm5ldHdvcmtcIjogZm9yIG5ldHdvcmsgcm91dGVzIHRoYXQgc2hvdWxkIG5vdCBjb25mbGljdCB3aXRoIHN0YXRpY1xuLy8gcmVzb3VyY2VzLiAgKEZvciBleGFtcGxlLCBpZiBcIi9zb2NranMvXCIgaXMgYSBuZXR3b3JrIHJvdXRlLCB3ZVxuLy8gc2hvdWxkbid0IGhhdmUgXCIvc29ja2pzL3JlZC1zb2NrLmpwZ1wiIGFzIGEgc3RhdGljIHJlc291cmNlKS5cbi8vXG4vLyBcInN0YXRpYy1vbmxpbmVcIjogZm9yIHN0YXRpYyByZXNvdXJjZXMgd2hpY2ggc2hvdWxkIG5vdCBiZSBjYWNoZWQgaW5cbi8vIHRoZSBhcHAgY2FjaGUuICBUaGlzIGlzIGltcGxlbWVudGVkIGJ5IGFsc28gYWRkaW5nIHRoZW0gdG8gdGhlXG4vLyBORVRXT1JLIHNlY3Rpb24gKGFzIG90aGVyd2lzZSB0aGUgYnJvd3NlciB3b3VsZCByZWNlaXZlIGFwcCBIVE1MXG4vLyBmb3IgdGhlbSBiZWNhdXNlIG9mIHRoZSBGQUxMQkFDSyBzZWN0aW9uKSwgYnV0IHN0YXRpYy1vbmxpbmUgcm91dGVzXG4vLyBkb24ndCBuZWVkIHRvIGJlIGNoZWNrZWQgZm9yIGNvbmZsaWN0IHdpdGggc3RhdGljIHJlc291cmNlcy5cblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSb3V0ZVBvbGljeSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIC8vIG1hcHMgcHJlZml4IHRvIGEgdHlwZVxuICAgIHRoaXMudXJsUHJlZml4VHlwZXMgPSB7fTtcbiAgfVxuXG4gIHVybFByZWZpeE1hdGNoZXModXJsUHJlZml4LCB1cmwpIHtcbiAgICByZXR1cm4gdXJsLnN0YXJ0c1dpdGgodXJsUHJlZml4KTtcbiAgfVxuXG4gIGNoZWNrVHlwZSh0eXBlKSB7XG4gICAgaWYgKCFbJ25ldHdvcmsnLCAnc3RhdGljLW9ubGluZSddLmluY2x1ZGVzKHR5cGUpKSB7XG4gICAgICByZXR1cm4gJ3RoZSByb3V0ZSB0eXBlIG11c3QgYmUgXCJuZXR3b3JrXCIgb3IgXCJzdGF0aWMtb25saW5lXCInO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNoZWNrVXJsUHJlZml4KHVybFByZWZpeCwgdHlwZSkge1xuICAgIGlmICghdXJsUHJlZml4LnN0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgcmV0dXJuICdhIHJvdXRlIFVSTCBwcmVmaXggbXVzdCBiZWdpbiB3aXRoIGEgc2xhc2gnO1xuICAgIH1cblxuICAgIGlmICh1cmxQcmVmaXggPT09ICcvJykge1xuICAgICAgcmV0dXJuICdhIHJvdXRlIFVSTCBwcmVmaXggY2Fubm90IGJlIC8nO1xuICAgIH1cblxuICAgIGNvbnN0IGV4aXN0aW5nVHlwZSA9IHRoaXMudXJsUHJlZml4VHlwZXNbdXJsUHJlZml4XTtcbiAgICBpZiAoZXhpc3RpbmdUeXBlICYmIGV4aXN0aW5nVHlwZSAhPT0gdHlwZSkge1xuICAgICAgcmV0dXJuIGB0aGUgcm91dGUgVVJMIHByZWZpeCAke3VybFByZWZpeH0gaGFzIGFscmVhZHkgYmVlbiBkZWNsYXJlZCBgICtcbiAgICAgICAgYHRvIGJlIG9mIHR5cGUgJHtleGlzdGluZ1R5cGV9YDtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNoZWNrRm9yQ29uZmxpY3RXaXRoU3RhdGljKHVybFByZWZpeCwgdHlwZSwgX3Rlc3RNYW5pZmVzdCkge1xuICAgIGlmICh0eXBlID09PSAnc3RhdGljLW9ubGluZScpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHBvbGljeSA9IHRoaXM7XG5cbiAgICBmdW5jdGlvbiBjaGVjayhtYW5pZmVzdCkge1xuICAgICAgY29uc3QgY29uZmxpY3QgPSBtYW5pZmVzdC5maW5kKHJlc291cmNlID0+IChcbiAgICAgICAgcmVzb3VyY2UudHlwZSA9PT0gJ3N0YXRpYycgJiZcbiAgICAgICAgcmVzb3VyY2Uud2hlcmUgPT09ICdjbGllbnQnICYmXG4gICAgICAgIHBvbGljeS51cmxQcmVmaXhNYXRjaGVzKHVybFByZWZpeCwgcmVzb3VyY2UudXJsKVxuICAgICAgKSk7XG5cbiAgICAgIGlmIChjb25mbGljdCkge1xuICAgICAgICByZXR1cm4gYHN0YXRpYyByZXNvdXJjZSAke2NvbmZsaWN0LnVybH0gY29uZmxpY3RzIHdpdGggJHt0eXBlfSBgICtcbiAgICAgICAgICBgcm91dGUgJHt1cmxQcmVmaXh9YDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfTtcblxuICAgIGlmIChfdGVzdE1hbmlmZXN0KSB7XG4gICAgICByZXR1cm4gY2hlY2soX3Rlc3RNYW5pZmVzdCk7XG4gICAgfVxuXG4gICAgY29uc3QgeyBXZWJBcHAgfSA9IHJlcXVpcmUoXCJtZXRlb3Ivd2ViYXBwXCIpO1xuICAgIGxldCBlcnJvck1lc3NhZ2UgPSBudWxsO1xuXG4gICAgT2JqZWN0LmtleXMoV2ViQXBwLmNsaWVudFByb2dyYW1zKS5zb21lKGFyY2ggPT4ge1xuICAgICAgY29uc3QgeyBtYW5pZmVzdCB9ID0gV2ViQXBwLmNsaWVudFByb2dyYW1zW2FyY2hdO1xuICAgICAgcmV0dXJuIGVycm9yTWVzc2FnZSA9IGNoZWNrKG1hbmlmZXN0KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBlcnJvck1lc3NhZ2U7XG4gIH1cblxuICBkZWNsYXJlKHVybFByZWZpeCwgdHlwZSkge1xuICAgIGNvbnN0IHByb2JsZW0gPVxuICAgICAgdGhpcy5jaGVja1R5cGUodHlwZSkgfHxcbiAgICAgIHRoaXMuY2hlY2tVcmxQcmVmaXgodXJsUHJlZml4LCB0eXBlKSB8fFxuICAgICAgdGhpcy5jaGVja0ZvckNvbmZsaWN0V2l0aFN0YXRpYyh1cmxQcmVmaXgsIHR5cGUpO1xuICAgIGlmIChwcm9ibGVtKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IocHJvYmxlbSk7XG4gICAgfVxuICAgIC8vIFRPRE8gb3ZlcmxhcHBpbmcgcHJlZml4ZXMsIGUuZy4gL2Zvby8gYW5kIC9mb28vYmFyL1xuICAgIHRoaXMudXJsUHJlZml4VHlwZXNbdXJsUHJlZml4XSA9IHR5cGU7XG4gIH1cblxuICBpc1ZhbGlkVXJsKHVybCkge1xuICAgIHJldHVybiB1cmwuc3RhcnRzV2l0aCgnLycpO1xuICB9XG5cbiAgY2xhc3NpZnkodXJsKSB7XG4gICAgaWYgKCF0aGlzLmlzVmFsaWRVcmwodXJsKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGB1cmwgbXVzdCBiZSBhIHJlbGF0aXZlIFVSTDogJHt1cmx9YCk7XG4gICAgfVxuXG4gICAgY29uc3QgcHJlZml4ID0gT2JqZWN0LmtleXModGhpcy51cmxQcmVmaXhUeXBlcykuZmluZChwcmVmaXggPT5cbiAgICAgIHRoaXMudXJsUHJlZml4TWF0Y2hlcyhwcmVmaXgsIHVybClcbiAgICApO1xuXG4gICAgcmV0dXJuIHByZWZpeCA/IHRoaXMudXJsUHJlZml4VHlwZXNbcHJlZml4XSA6IG51bGw7XG4gIH1cblxuICB1cmxQcmVmaXhlc0Zvcih0eXBlKSB7XG4gICAgcmV0dXJuIE9iamVjdC5lbnRyaWVzKHRoaXMudXJsUHJlZml4VHlwZXMpXG4gICAgICAuZmlsdGVyKChbX3ByZWZpeCwgX3R5cGVdKSA9PiBfdHlwZSA9PT0gdHlwZSlcbiAgICAgIC5tYXAoKFtfcHJlZml4XSkgPT4gX3ByZWZpeClcbiAgICAgIC5zb3J0KCk7XG4gIH1cbn1cbiJdfQ==
