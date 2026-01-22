Package["core-runtime"].queue("socket-stream-client",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var ECMAScript = Package.ecmascript.ECMAScript;
var Retry = Package.retry.Retry;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"socket-stream-client":{"server.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/socket-stream-client/server.js                                                                           //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {let setMinimumBrowserVersions;module.link("meteor/modern-browsers",{setMinimumBrowserVersions(v){setMinimumBrowserVersions=v}},0);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
setMinimumBrowserVersions({
    chrome: 16,
    edge: 12,
    firefox: 11,
    ie: 10,
    mobileSafari: [
        6,
        1
    ],
    phantomjs: 2,
    safari: 7,
    electron: [
        0,
        20
    ]
}, module.id);
if (process.env.DISABLE_SOCKJS) {
    __meteor_runtime_config__.DISABLE_SOCKJS = process.env.DISABLE_SOCKJS;
}
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/socket-stream-client/node.js                                                                             //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({ClientStream:()=>ClientStream});let Meteor;module.link("meteor/meteor",{Meteor(v){Meteor=v}},0);let StreamClientCommon;module.link("./common.js",{StreamClientCommon(v){StreamClientCommon=v}},1);let toWebsocketUrl;module.link("./urls.js",{toWebsocketUrl(v){toWebsocketUrl=v}},2);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();


// @param endpoint {String} URL to Meteor app
//   "http://subdomain.meteor.com/" or "/" or
//   "ddp+sockjs://foo-**.meteor.com/sockjs"
//
// We do some rewriting of the URL to eventually make it "ws://" or "wss://",
// whatever was passed in.  At the very least, what Meteor.absoluteUrl() returns
// us should work.
//
// We don't do any heartbeating. (The logic that did this in sockjs was removed,
// because it used a built-in sockjs mechanism. We could do it with WebSocket
// ping frames or with DDP-level messages.)
class ClientStream extends StreamClientCommon {
    // data is a utf8 string. Data sent while not connected is dropped on
    // the floor, and it is up the user of this API to retransmit lost
    // messages on 'reset'
    send(data) {
        if (this.currentStatus.connected) {
            this.client.send(data);
        }
    }
    // Changes where this connection points
    _changeUrl(url) {
        this.endpoint = url;
    }
    _onConnect(client) {
        if (client !== this.client) {
            // This connection is not from the last call to _launchConnection.
            // But _launchConnection calls _cleanup which closes previous connections.
            // It's our belief that this stifles future 'open' events, but maybe
            // we are wrong?
            throw new Error('Got open from inactive client ' + !!this.client);
        }
        if (this._forcedToDisconnect) {
            // We were asked to disconnect between trying to open the connection and
            // actually opening it. Let's just pretend this never happened.
            this.client.close();
            this.client = null;
            return;
        }
        if (this.currentStatus.connected) {
            // We already have a connection. It must have been the case that we
            // started two parallel connection attempts (because we wanted to
            // 'reconnect now' on a hanging connection and we had no way to cancel the
            // connection attempt.) But this shouldn't happen (similarly to the client
            // !== this.client check above).
            throw new Error('Two parallel connections?');
        }
        this._clearConnectionTimer();
        // update status
        this.currentStatus.status = 'connected';
        this.currentStatus.connected = true;
        this.currentStatus.retryCount = 0;
        this.statusChanged();
        // fire resets. This must come after status change so that clients
        // can call send from within a reset callback.
        this.forEachCallback('reset', (callback)=>{
            callback();
        });
    }
    _cleanup(maybeError) {
        this._clearConnectionTimer();
        if (this.client) {
            var client = this.client;
            this.client = null;
            client.close();
            this.forEachCallback('disconnect', (callback)=>{
                callback(maybeError);
            });
        }
    }
    _clearConnectionTimer() {
        if (this.connectionTimer) {
            clearTimeout(this.connectionTimer);
            this.connectionTimer = null;
        }
    }
    _getProxyUrl(targetUrl) {
        // Similar to code in tools/http-helpers.js.
        var proxy = process.env.HTTP_PROXY || process.env.http_proxy || null;
        var noproxy = process.env.NO_PROXY || process.env.no_proxy || null;
        // if we're going to a secure url, try the https_proxy env variable first.
        if (targetUrl.match(/^wss:/) || targetUrl.match(/^https:/)) {
            proxy = process.env.HTTPS_PROXY || process.env.https_proxy || proxy;
        }
        if (targetUrl.indexOf('localhost') != -1 || targetUrl.indexOf('127.0.0.1') != -1) {
            return null;
        }
        if (noproxy) {
            for (let item of noproxy.split(',')){
                if (targetUrl.indexOf(item.trim().replace(/\*/, '')) !== -1) {
                    proxy = null;
                }
            }
        }
        return proxy;
    }
    _launchConnection() {
        this._cleanup(); // cleanup the old socket, if there was one.
        // Since server-to-server DDP is still an experimental feature, we only
        // require the module if we actually create a server-to-server
        // connection.
        var FayeWebSocket = Npm.require('faye-websocket');
        var deflate = Npm.require('permessage-deflate2');
        var targetUrl = toWebsocketUrl(this.endpoint);
        var fayeOptions = {
            headers: this.headers,
            extensions: [
                deflate
            ]
        };
        fayeOptions = Object.assign(fayeOptions, this.npmFayeOptions);
        var proxyUrl = this._getProxyUrl(targetUrl);
        if (proxyUrl) {
            fayeOptions.proxy = {
                origin: proxyUrl
            };
        }
        // We would like to specify 'ddp' as the subprotocol here. The npm module we
        // used to use as a client would fail the handshake if we ask for a
        // subprotocol and the server doesn't send one back (and sockjs doesn't).
        // Faye doesn't have that behavior; it's unclear from reading RFC 6455 if
        // Faye is erroneous or not.  So for now, we don't specify protocols.
        var subprotocols = [];
        var client = this.client = new FayeWebSocket.Client(targetUrl, subprotocols, fayeOptions);
        this._clearConnectionTimer();
        this.connectionTimer = Meteor.setTimeout(()=>{
            this._lostConnection(new this.ConnectionError('DDP connection timed out'));
        }, this.CONNECT_TIMEOUT);
        this.client.on('open', Meteor.bindEnvironment(()=>{
            return this._onConnect(client);
        }, 'stream connect callback'));
        var clientOnIfCurrent = (event, description, callback)=>{
            this.client.on(event, Meteor.bindEnvironment((...args)=>{
                // Ignore events from any connection we've already cleaned up.
                if (client !== this.client) return;
                callback(...args);
            }, description));
        };
        clientOnIfCurrent('error', 'stream error callback', (error)=>{
            if (!this.options._dontPrintErrors) Meteor._debug('stream error', error.message);
            // Faye's 'error' object is not a JS error (and among other things,
            // doesn't stringify well). Convert it to one.
            this._lostConnection(new this.ConnectionError(error.message));
        });
        clientOnIfCurrent('close', 'stream close callback', ()=>{
            this._lostConnection();
        });
        clientOnIfCurrent('message', 'stream message callback', (message)=>{
            // Ignore binary frames, where message.data is a Buffer
            if (typeof message.data !== 'string') return;
            this.forEachCallback('message', (callback)=>{
                callback(message.data);
            });
        });
    }
    constructor(endpoint, options){
        super(options);
        this.client = null; // created in _launchConnection
        this.endpoint = endpoint;
        this.headers = this.options.headers || {};
        this.npmFayeOptions = this.options.npmFayeOptions || {};
        this._initCommon(this.options);
        //// Kickoff!
        this._launchConnection();
    }
}
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"common.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/socket-stream-client/common.js                                                                           //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.export({StreamClientCommon:()=>StreamClientCommon});let _object_spread;module.link("@swc/helpers/_/_object_spread",{_(v){_object_spread=v}},0);let Retry;module.link('meteor/retry',{Retry(v){Retry=v}},1);

const forcedReconnectError = new Error("forced reconnect");
class StreamClientCommon {
    // Register for callbacks.
    on(name, callback) {
        if (name !== 'message' && name !== 'reset' && name !== 'disconnect') throw new Error('unknown event type: ' + name);
        if (!this.eventCallbacks[name]) this.eventCallbacks[name] = [];
        this.eventCallbacks[name].push(callback);
    }
    forEachCallback(name, cb) {
        if (!this.eventCallbacks[name] || !this.eventCallbacks[name].length) {
            return;
        }
        this.eventCallbacks[name].forEach(cb);
    }
    _initCommon(options) {
        options = options || Object.create(null);
        //// Constants
        // how long to wait until we declare the connection attempt
        // failed.
        this.CONNECT_TIMEOUT = options.connectTimeoutMs || 10000;
        this.eventCallbacks = Object.create(null); // name -> [callback]
        this._forcedToDisconnect = false;
        //// Reactive status
        this.currentStatus = {
            status: 'connecting',
            connected: false,
            retryCount: 0
        };
        if (Package.tracker) {
            this.statusListeners = new Package.tracker.Tracker.Dependency();
        }
        this.statusChanged = ()=>{
            if (this.statusListeners) {
                this.statusListeners.changed();
            }
        };
        //// Retry logic
        this._retry = new Retry();
        this.connectionTimer = null;
    }
    // Trigger a reconnect.
    reconnect(options) {
        options = options || Object.create(null);
        if (options.url) {
            this._changeUrl(options.url);
        }
        if (options._sockjsOptions) {
            this.options._sockjsOptions = options._sockjsOptions;
        }
        if (this.currentStatus.connected) {
            if (options._force || options.url) {
                this._lostConnection(forcedReconnectError);
            }
            return;
        }
        // if we're mid-connection, stop it.
        if (this.currentStatus.status === 'connecting') {
            // Pretend it's a clean close.
            this._lostConnection();
        }
        this._retry.clear();
        this.currentStatus.retryCount -= 1; // don't count manual retries
        this._retryNow();
    }
    disconnect(options) {
        options = options || Object.create(null);
        // Failed is permanent. If we're failed, don't let people go back
        // online by calling 'disconnect' then 'reconnect'.
        if (this._forcedToDisconnect) return;
        // If _permanent is set, permanently disconnect a stream. Once a stream
        // is forced to disconnect, it can never reconnect. This is for
        // error cases such as ddp version mismatch, where trying again
        // won't fix the problem.
        if (options._permanent) {
            this._forcedToDisconnect = true;
        }
        this._cleanup();
        this._retry.clear();
        this.currentStatus = {
            status: options._permanent ? 'failed' : 'offline',
            connected: false,
            retryCount: 0
        };
        if (options._permanent && options._error) this.currentStatus.reason = options._error;
        this.statusChanged();
    }
    // maybeError is set unless it's a clean protocol-level close.
    _lostConnection(maybeError) {
        this._cleanup(maybeError);
        this._retryLater(maybeError); // sets status. no need to do it here.
    }
    // fired when we detect that we've gone online. try to reconnect
    // immediately.
    _online() {
        // if we've requested to be offline by disconnecting, don't reconnect.
        if (this.currentStatus.status != 'offline') this.reconnect();
    }
    _retryLater(maybeError) {
        var timeout = 0;
        if (this.options.retry || maybeError === forcedReconnectError) {
            timeout = this._retry.retryLater(this.currentStatus.retryCount, this._retryNow.bind(this));
            this.currentStatus.status = 'waiting';
            this.currentStatus.retryTime = new Date().getTime() + timeout;
        } else {
            this.currentStatus.status = 'failed';
            delete this.currentStatus.retryTime;
        }
        this.currentStatus.connected = false;
        this.statusChanged();
    }
    _retryNow() {
        if (this._forcedToDisconnect) return;
        this.currentStatus.retryCount += 1;
        this.currentStatus.status = 'connecting';
        this.currentStatus.connected = false;
        delete this.currentStatus.retryTime;
        this.statusChanged();
        this._launchConnection();
    }
    // Get current status. Reactive.
    status() {
        if (this.statusListeners) {
            this.statusListeners.depend();
        }
        return this.currentStatus;
    }
    constructor(options){
        this.options = _object_spread({
            retry: true
        }, options || null);
        this.ConnectionError = options && options.ConnectionError || Error;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"urls.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/socket-stream-client/urls.js                                                                             //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.export({toSockjsUrl:()=>toSockjsUrl,toWebsocketUrl:()=>toWebsocketUrl});let Meteor;module.link("meteor/meteor",{Meteor(v){Meteor=v}},0);
// @param url {String} URL to Meteor app, eg:
//   "/" or "madewith.meteor.com" or "https://foo.meteor.com"
//   or "ddp+sockjs://ddp--****-foo.meteor.com/sockjs"
// @returns {String} URL to the endpoint with the specific scheme and subPath, e.g.
// for scheme "http" and subPath "sockjs"
//   "http://subdomain.meteor.com/sockjs" or "/sockjs"
//   or "https://ddp--1234-foo.meteor.com/sockjs"
function translateUrl(url, newSchemeBase, subPath) {
    if (!newSchemeBase) {
        newSchemeBase = 'http';
    }
    if (subPath !== "sockjs" && url.startsWith("/")) {
        url = Meteor.absoluteUrl(url.substr(1));
    }
    var ddpUrlMatch = url.match(/^ddp(i?)\+sockjs:\/\//);
    var httpUrlMatch = url.match(/^http(s?):\/\//);
    var newScheme;
    if (ddpUrlMatch) {
        // Remove scheme and split off the host.
        var urlAfterDDP = url.substr(ddpUrlMatch[0].length);
        newScheme = ddpUrlMatch[1] === 'i' ? newSchemeBase : newSchemeBase + 's';
        var slashPos = urlAfterDDP.indexOf('/');
        var host = slashPos === -1 ? urlAfterDDP : urlAfterDDP.substr(0, slashPos);
        var rest = slashPos === -1 ? '' : urlAfterDDP.substr(slashPos);
        // In the host (ONLY!), change '*' characters into random digits. This
        // allows different stream connections to connect to different hostnames
        // and avoid browser per-hostname connection limits.
        host = host.replace(/\*/g, ()=>Math.floor(Math.random() * 10));
        return newScheme + '://' + host + rest;
    } else if (httpUrlMatch) {
        newScheme = !httpUrlMatch[1] ? newSchemeBase : newSchemeBase + 's';
        var urlAfterHttp = url.substr(httpUrlMatch[0].length);
        url = newScheme + '://' + urlAfterHttp;
    }
    // Prefix FQDNs but not relative URLs
    if (url.indexOf('://') === -1 && !url.startsWith('/')) {
        url = newSchemeBase + '://' + url;
    }
    // XXX This is not what we should be doing: if I have a site
    // deployed at "/foo", then DDP.connect("/") should actually connect
    // to "/", not to "/foo". "/" is an absolute path. (Contrast: if
    // deployed at "/foo", it would be reasonable for DDP.connect("bar")
    // to connect to "/foo/bar").
    //
    // We should make this properly honor absolute paths rather than
    // forcing the path to be relative to the site root. Simultaneously,
    // we should set DDP_DEFAULT_CONNECTION_URL to include the site
    // root. See also client_convenience.js #RationalizingRelativeDDPURLs
    url = Meteor._relativeToSiteRootUrl(url);
    if (url.endsWith('/')) return url + subPath;
    else return url + '/' + subPath;
}
function toSockjsUrl(url) {
    return translateUrl(url, 'http', 'sockjs');
}
function toWebsocketUrl(url) {
    return translateUrl(url, 'ws', 'websocket');
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
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/socket-stream-client/server.js"
  ]
}});

//# sourceURL=meteor://💻app/packages/socket-stream-client.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc29ja2V0LXN0cmVhbS1jbGllbnQvc2VydmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9zb2NrZXQtc3RyZWFtLWNsaWVudC9ub2RlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9zb2NrZXQtc3RyZWFtLWNsaWVudC9jb21tb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3NvY2tldC1zdHJlYW0tY2xpZW50L3VybHMuanMiXSwibmFtZXMiOlsic2V0TWluaW11bUJyb3dzZXJWZXJzaW9ucyIsImNocm9tZSIsImVkZ2UiLCJmaXJlZm94IiwiaWUiLCJtb2JpbGVTYWZhcmkiLCJwaGFudG9tanMiLCJzYWZhcmkiLCJlbGVjdHJvbiIsIm1vZHVsZSIsImlkIiwicHJvY2VzcyIsImVudiIsIkRJU0FCTEVfU09DS0pTIiwiX19tZXRlb3JfcnVudGltZV9jb25maWdfXyIsIk1ldGVvciIsIkNsaWVudFN0cmVhbSIsIlN0cmVhbUNsaWVudENvbW1vbiIsInNlbmQiLCJkYXRhIiwiY3VycmVudFN0YXR1cyIsImNvbm5lY3RlZCIsImNsaWVudCIsIl9jaGFuZ2VVcmwiLCJ1cmwiLCJlbmRwb2ludCIsIl9vbkNvbm5lY3QiLCJFcnJvciIsIl9mb3JjZWRUb0Rpc2Nvbm5lY3QiLCJjbG9zZSIsIl9jbGVhckNvbm5lY3Rpb25UaW1lciIsInN0YXR1cyIsInJldHJ5Q291bnQiLCJzdGF0dXNDaGFuZ2VkIiwiZm9yRWFjaENhbGxiYWNrIiwiY2FsbGJhY2siLCJfY2xlYW51cCIsIm1heWJlRXJyb3IiLCJjb25uZWN0aW9uVGltZXIiLCJjbGVhclRpbWVvdXQiLCJfZ2V0UHJveHlVcmwiLCJ0YXJnZXRVcmwiLCJwcm94eSIsIkhUVFBfUFJPWFkiLCJodHRwX3Byb3h5Iiwibm9wcm94eSIsIk5PX1BST1hZIiwibm9fcHJveHkiLCJtYXRjaCIsIkhUVFBTX1BST1hZIiwiaHR0cHNfcHJveHkiLCJpbmRleE9mIiwiaXRlbSIsInNwbGl0IiwidHJpbSIsInJlcGxhY2UiLCJfbGF1bmNoQ29ubmVjdGlvbiIsIkZheWVXZWJTb2NrZXQiLCJOcG0iLCJyZXF1aXJlIiwiZGVmbGF0ZSIsInRvV2Vic29ja2V0VXJsIiwiZmF5ZU9wdGlvbnMiLCJoZWFkZXJzIiwiZXh0ZW5zaW9ucyIsIk9iamVjdCIsImFzc2lnbiIsIm5wbUZheWVPcHRpb25zIiwicHJveHlVcmwiLCJvcmlnaW4iLCJzdWJwcm90b2NvbHMiLCJDbGllbnQiLCJzZXRUaW1lb3V0IiwiX2xvc3RDb25uZWN0aW9uIiwiQ29ubmVjdGlvbkVycm9yIiwiQ09OTkVDVF9USU1FT1VUIiwib24iLCJiaW5kRW52aXJvbm1lbnQiLCJjbGllbnRPbklmQ3VycmVudCIsImV2ZW50IiwiZGVzY3JpcHRpb24iLCJhcmdzIiwiZXJyb3IiLCJvcHRpb25zIiwiX2RvbnRQcmludEVycm9ycyIsIl9kZWJ1ZyIsIm1lc3NhZ2UiLCJfaW5pdENvbW1vbiIsImZvcmNlZFJlY29ubmVjdEVycm9yIiwibmFtZSIsImV2ZW50Q2FsbGJhY2tzIiwicHVzaCIsImNiIiwibGVuZ3RoIiwiZm9yRWFjaCIsImNyZWF0ZSIsImNvbm5lY3RUaW1lb3V0TXMiLCJQYWNrYWdlIiwidHJhY2tlciIsInN0YXR1c0xpc3RlbmVycyIsIlRyYWNrZXIiLCJEZXBlbmRlbmN5IiwiY2hhbmdlZCIsIl9yZXRyeSIsIlJldHJ5IiwicmVjb25uZWN0IiwiX3NvY2tqc09wdGlvbnMiLCJfZm9yY2UiLCJjbGVhciIsIl9yZXRyeU5vdyIsImRpc2Nvbm5lY3QiLCJfcGVybWFuZW50IiwiX2Vycm9yIiwicmVhc29uIiwiX3JldHJ5TGF0ZXIiLCJfb25saW5lIiwidGltZW91dCIsInJldHJ5IiwicmV0cnlMYXRlciIsImJpbmQiLCJyZXRyeVRpbWUiLCJEYXRlIiwiZ2V0VGltZSIsImRlcGVuZCIsInRyYW5zbGF0ZVVybCIsIm5ld1NjaGVtZUJhc2UiLCJzdWJQYXRoIiwic3RhcnRzV2l0aCIsImFic29sdXRlVXJsIiwic3Vic3RyIiwiZGRwVXJsTWF0Y2giLCJodHRwVXJsTWF0Y2giLCJuZXdTY2hlbWUiLCJ1cmxBZnRlckREUCIsInNsYXNoUG9zIiwiaG9zdCIsInJlc3QiLCJNYXRoIiwiZmxvb3IiLCJyYW5kb20iLCJ1cmxBZnRlckh0dHAiLCJfcmVsYXRpdmVUb1NpdGVSb290VXJsIiwiZW5kc1dpdGgiLCJ0b1NvY2tqc1VybCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsU0FDRUEseUJBQXlCLFFBQ3BCLHlCQUF5QjtBQUVoQ0EsMEJBQTBCO0lBQ3hCQyxRQUFRO0lBQ1JDLE1BQU07SUFDTkMsU0FBUztJQUNUQyxJQUFJO0lBQ0pDLGNBQWM7UUFBQztRQUFHO0tBQUU7SUFDcEJDLFdBQVc7SUFDWEMsUUFBUTtJQUNSQyxVQUFVO1FBQUM7UUFBRztLQUFHO0FBQ25CLEdBQUdDLE9BQU9DLEVBQUU7QUFFWixJQUFJQyxRQUFRQyxHQUFHLENBQUNDLGNBQWMsRUFBRTtJQUM5QkMsMEJBQTBCRCxjQUFjLEdBQUdGLFFBQVFDLEdBQUcsQ0FBQ0MsY0FBYztBQUN2RTs7Ozs7Ozs7Ozs7OztBQ2pCQSxTQUFTRSxNQUFNLFFBQVEsZ0JBQWdCO0FBQ1U7QUFDTjtBQUUzQyw2Q0FBNkM7QUFDN0MsNkNBQTZDO0FBQzdDLDRDQUE0QztBQUM1QyxFQUFFO0FBQ0YsNkVBQTZFO0FBQzdFLGdGQUFnRjtBQUNoRixrQkFBa0I7QUFDbEIsRUFBRTtBQUNGLGdGQUFnRjtBQUNoRiw2RUFBNkU7QUFDN0UsMkNBQTJDO0FBQzNDLE9BQU8sTUFBTUMscUJBQXFCQztJQWdCaEMscUVBQXFFO0lBQ3JFLGtFQUFrRTtJQUNsRSxzQkFBc0I7SUFDdEJDLEtBQUtDLElBQUksRUFBRTtRQUNULElBQUksSUFBSSxDQUFDQyxhQUFhLENBQUNDLFNBQVMsRUFBRTtZQUNoQyxJQUFJLENBQUNDLE1BQU0sQ0FBQ0osSUFBSSxDQUFDQztRQUNuQjtJQUNGO0lBRUEsdUNBQXVDO0lBQ3ZDSSxXQUFXQyxHQUFHLEVB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cEUsZ0VBQWdFO0lBQ2hFLG9FQUFvRTtJQUNwRSw2QkFBNkI7SUFDN0IsRUFBRTtJQUNGLGdFQUFnRTtJQUNoRSxvRUFBb0U7SUFDcEUsK0RBQStEO0lBQy9ELHFFQUFxRTtJQUNyRUEsTUFBTVQsT0FBTzhILHNCQUFzQixDQUFDckg7SUFFcEMsSUFBSUEsSUFBSXNILFFBQVEsQ0FBQyxNQUFNLE9BQU90SCxNQUFNc0c7U0FDL0IsT0FBT3RHLE1BQU0sTUFBTXNHO0FBQzFCO0FBRUEsT0FBTyxTQUFTaUIsV0FBZTtJQUM3QixPQUFPbkIsYUFBYXBHLEtBQUssUUFBUTtBQUNuQztBQUVBLE9BQU8sU0FBU3FDLGNBQWtCO0lBQ2hDLE9BQU8rRCxhQUFhcEcsS0FBSyxNQUFNO0FBQ2pDIiwiZmlsZSI6Ii9wYWNrYWdlcy9zb2NrZXQtc3RyZWFtLWNsaWVudC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIHNldE1pbmltdW1Ccm93c2VyVmVyc2lvbnMsXG59IGZyb20gXCJtZXRlb3IvbW9kZXJuLWJyb3dzZXJzXCI7XG5cbnNldE1pbmltdW1Ccm93c2VyVmVyc2lvbnMoe1xuICBjaHJvbWU6IDE2LFxuICBlZGdlOiAxMixcbiAgZmlyZWZveDogMTEsXG4gIGllOiAxMCxcbiAgbW9iaWxlU2FmYXJpOiBbNiwgMV0sXG4gIHBoYW50b21qczogMixcbiAgc2FmYXJpOiA3LFxuICBlbGVjdHJvbjogWzAsIDIwXSxcbn0sIG1vZHVsZS5pZCk7XG5cbmlmIChwcm9jZXNzLmVudi5ESVNBQkxFX1NPQ0tKUykge1xuICBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLkRJU0FCTEVfU09DS0pTID0gcHJvY2Vzcy5lbnYuRElTQUJMRV9TT0NLSlM7XG59IiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSBcIm1ldGVvci9tZXRlb3JcIjtcbmltcG9ydCB7IFN0cmVhbUNsaWVudENvbW1vbiB9IGZyb20gXCIuL2NvbW1vbi5qc1wiO1xuaW1wb3J0IHsgdG9XZWJzb2NrZXRVcmwgfSBmcm9tIFwiLi91cmxzLmpzXCI7XG5cbi8vIEBwYXJhbSBlbmRwb2ludCB7U3RyaW5nfSBVUkwgdG8gTWV0ZW9yIGFwcFxuLy8gICBcImh0dHA6Ly9zdWJkb21haW4ubWV0ZW9yLmNvbS9cIiBvciBcIi9cIiBvclxuLy8gICBcImRkcCtzb2NranM6Ly9mb28tKioubWV0ZW9yLmNvbS9zb2NranNcIlxuLy9cbi8vIFdlIGRvIHNvbWUgcmV3cml0aW5nIG9mIHRoZSBVUkwgdG8gZXZlbnR1YWxseSBtYWtlIGl0IFwid3M6Ly9cIiBvciBcIndzczovL1wiLFxuLy8gd2hhdGV2ZXIgd2FzIHBhc3NlZCBpbi4gIEF0IHRoZSB2ZXJ5IGxlYXN0LCB3aGF0IE1ldGVvci5hYnNvbHV0ZVVybCgpIHJldHVybnNcbi8vIHVzIHNob3VsZCB3b3JrLlxuLy9cbi8vIFdlIGRvbid0IGRvIGFueSBoZWFydGJlYXRpbmcuIChUaGUgbG9naWMgdGhhdCBkaWQgdGhpcyBpbiBzb2NranMgd2FzIHJlbW92ZWQsXG4vLyBiZWNhdXNlIGl0IHVzZWQgYSBidWlsdC1pbiBzb2NranMgbWVjaGFuaXNtLiBXZSBjb3VsZCBkbyBpdCB3aXRoIFdlYlNvY2tldFxuLy8gcGluZyBmcmFtZXMgb3Igd2l0aCBERFAtbGV2ZWwgbWVzc2FnZXMuKVxuZXhwb3J0IGNsYXNzIENsaWVudFN0cmVhbSBleHRlbmRzIFN0cmVhbUNsaWVudENvbW1vbiB7XG4gIGNvbnN0cnVjdG9yKGVuZHBvaW50LCBvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucyk7XG5cbiAgICB0aGlzLmNsaWVudCA9IG51bGw7IC8vIGNyZWF0ZWQgaW4gX2xhdW5jaENvbm5lY3Rpb25cbiAgICB0aGlzLmVuZHBvaW50ID0gZW5kcG9pbnQ7XG5cbiAgICB0aGlzLmhlYWRlcnMgPSB0aGlzLm9wdGlvbnMuaGVhZGVycyB8fCB7fTtcbiAgICB0aGlzLm5wbUZheWVPcHRpb25zID0gdGhpcy5vcHRpb25zLm5wbUZheWVPcHRpb25zIHx8IHt9O1xuXG4gICAgdGhpcy5faW5pdENvbW1vbih0aGlzLm9wdGlvbnMpO1xuXG4gICAgLy8vLyBLaWNrb2ZmIVxuICAgIHRoaXMuX2xhdW5jaENvbm5lY3Rpb24oKTtcbiAgfVxuXG4gIC8vIGRhdGEgaXMgYSB1dGY4IHN0cmluZy4gRGF0YSBzZW50IHdoaWxlIG5vdCBjb25uZWN0ZWQgaXMgZHJvcHBlZCBvblxuICAvLyB0aGUgZmxvb3IsIGFuZCBpdCBpcyB1cCB0aGUgdXNlciBvZiB0aGlzIEFQSSB0byByZXRyYW5zbWl0IGxvc3RcbiAgLy8gbWVzc2FnZXMgb24gJ3Jlc2V0J1xuICBzZW5kKGRhdGEpIHtcbiAgICBpZiAodGhpcy5jdXJyZW50U3RhdHVzLmNvbm5lY3RlZCkge1xuICAgICAgdGhpcy5jbGllbnQuc2VuZChkYXRhKTtcbiAgICB9XG4gIH1cblxuICAvLyBDaGFuZ2VzIHdoZXJlIHRoaXMgY29ubmVjdGlvbiBwb2ludHNcbiAgX2NoYW5nZVVybCh1cmwpIHtcbiAgICB0aGlzLmVuZHBvaW50ID0gdXJsO1xuICB9XG5cbiAgX29uQ29ubmVjdChjbGllbnQpIHtcbiAgICBpZiAoY2xpZW50ICE9PSB0aGlzLmNsaWVudCkge1xuICAgICAgLy8gVGhpcyBjb25uZWN0aW9uIGlzIG5vdCBmcm9tIHRoZSBsYXN0IGNhbGwgdG8gX2xhdW5jaENvbm5lY3Rpb24uXG4gICAgICAvLyBCdXQgX2xhdW5jaENvbm5lY3Rpb24gY2FsbHMgX2NsZWFudXAgd2hpY2ggY2xvc2VzIHByZXZpb3VzIGNvbm5lY3Rpb25zLlxuICAgICAgLy8gSXQncyBvdXIgYmVsaWVmIHRoYXQgdGhpcyBzdGlmbGVzIGZ1dHVyZSAnb3BlbicgZXZlbnRzLCBidXQgbWF5YmVcbiAgICAgIC8vIHdlIGFyZSB3cm9uZz9cbiAgICAgIHRocm93IG5ldyBFcnJvcignR290IG9wZW4gZnJvbSBpbmFjdGl2ZSBjbGllbnQgJyArICEhdGhpcy5jbGllbnQpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9mb3JjZWRUb0Rpc2Nvbm5lY3QpIHtcbiAgICAgIC8vIFdlIHdlcmUgYXNrZWQgdG8gZGlzY29ubmVjdCBiZXR3ZWVuIHRyeWluZyB0byBvcGVuIHRoZSBjb25uZWN0aW9uIGFuZFxuICAgICAgLy8gYWN0dWFsbHkgb3BlbmluZyBpdC4gTGV0J3MganVzdCBwcmV0ZW5kIHRoaXMgbmV2ZXIgaGFwcGVuZWQuXG4gICAgICB0aGlzLmNsaWVudC5jbG9zZSgpO1xuICAgICAgdGhpcy5jbGllbnQgPSBudWxsO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmN1cnJlbnRTdGF0dXMuY29ubmVjdGVkKSB7XG4gICAgICAvLyBXZSBhbHJlYWR5IGhhdmUgYSBjb25uZWN0aW9uLiBJdCBtdXN0IGhhdmUgYmVlbiB0aGUgY2FzZSB0aGF0IHdlXG4gICAgICAvLyBzdGFydGVkIHR3byBwYXJhbGxlbCBjb25uZWN0aW9uIGF0dGVtcHRzIChiZWNhdXNlIHdlIHdhbnRlZCB0b1xuICAgICAgLy8gJ3JlY29ubmVjdCBub3cnIG9uIGEgaGFuZ2luZyBjb25uZWN0aW9uIGFuZCB3ZSBoYWQgbm8gd2F5IHRvIGNhbmNlbCB0aGVcbiAgICAgIC8vIGNvbm5lY3Rpb24gYXR0ZW1wdC4pIEJ1dCB0aGlzIHNob3VsZG4ndCBoYXBwZW4gKHNpbWlsYXJseSB0byB0aGUgY2xpZW50XG4gICAgICAvLyAhPT0gdGhpcy5jbGllbnQgY2hlY2sgYWJvdmUpLlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUd28gcGFyYWxsZWwgY29ubmVjdGlvbnM/Jyk7XG4gICAgfVxuXG4gICAgdGhpcy5fY2xlYXJDb25uZWN0aW9uVGltZXIoKTtcblxuICAgIC8vIHVwZGF0ZSBzdGF0dXNcbiAgICB0aGlzLmN1cnJlbnRTdGF0dXMuc3RhdHVzID0gJ2Nvbm5lY3RlZCc7XG4gICAgdGhpcy5jdXJyZW50U3RhdHVzLmNvbm5lY3RlZCA9IHRydWU7XG4gICAgdGhpcy5jdXJyZW50U3RhdHVzLnJldHJ5Q291bnQgPSAwO1xuICAgIHRoaXMuc3RhdHVzQ2hhbmdlZCgpO1xuXG4gICAgLy8gZmlyZSByZXNldHMuIFRoaXMgbXVzdCBjb21lIGFmdGVyIHN0YXR1cyBjaGFuZ2Ugc28gdGhhdCBjbGllbnRzXG4gICAgLy8gY2FuIGNhbGwgc2VuZCBmcm9tIHdpdGhpbiBhIHJlc2V0IGNhbGxiYWNrLlxuICAgIHRoaXMuZm9yRWFjaENhbGxiYWNrKCdyZXNldCcsIGNhbGxiYWNrID0+IHtcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgfSk7XG4gIH1cblxuICBfY2xlYW51cChtYXliZUVycm9yKSB7XG4gICAgdGhpcy5fY2xlYXJDb25uZWN0aW9uVGltZXIoKTtcbiAgICBpZiAodGhpcy5jbGllbnQpIHtcbiAgICAgIHZhciBjbGllbnQgPSB0aGlzLmNsaWVudDtcbiAgICAgIHRoaXMuY2xpZW50ID0gbnVsbDtcbiAgICAgIGNsaWVudC5jbG9zZSgpO1xuXG4gICAgICB0aGlzLmZvckVhY2hDYWxsYmFjaygnZGlzY29ubmVjdCcsIGNhbGxiYWNrID0+IHtcbiAgICAgICAgY2FsbGJhY2sobWF5YmVFcnJvcik7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBfY2xlYXJDb25uZWN0aW9uVGltZXIoKSB7XG4gICAgaWYgKHRoaXMuY29ubmVjdGlvblRpbWVyKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5jb25uZWN0aW9uVGltZXIpO1xuICAgICAgdGhpcy5jb25uZWN0aW9uVGltZXIgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIF9nZXRQcm94eVVybCh0YXJnZXRVcmwpIHtcbiAgICAvLyBTaW1pbGFyIHRvIGNvZGUgaW4gdG9vbHMvaHR0cC1oZWxwZXJzLmpzLlxuICAgIHZhciBwcm94eSA9IHByb2Nlc3MuZW52LkhUVFBfUFJPWFkgfHwgcHJvY2Vzcy5lbnYuaHR0cF9wcm94eSB8fCBudWxsO1xuICAgIHZhciBub3Byb3h5ID0gcHJvY2Vzcy5lbnYuTk9fUFJPWFkgfHwgcHJvY2Vzcy5lbnYubm9fcHJveHkgfHwgbnVsbDtcbiAgICAvLyBpZiB3ZSdyZSBnb2luZyB0byBhIHNlY3VyZSB1cmwsIHRyeSB0aGUgaHR0cHNfcHJveHkgZW52IHZhcmlhYmxlIGZpcnN0LlxuICAgIGlmICh0YXJnZXRVcmwubWF0Y2goL153c3M6LynCoHx8IHRhcmdldFVybC5tYXRjaCgvXmh0dHBzOi8pKSB7XG4gICAgICBwcm94eSA9IHByb2Nlc3MuZW52LkhUVFBTX1BST1hZIHx8IHByb2Nlc3MuZW52Lmh0dHBzX3Byb3h5IHx8IHByb3h5O1xuICAgIH1cbiAgICBpZiAodGFyZ2V0VXJsLmluZGV4T2YoJ2xvY2FsaG9zdCcpICE9IC0xIHx8wqB0YXJnZXRVcmwuaW5kZXhPZignMTI3LjAuMC4xJykgIT0gLTEpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBpZiAobm9wcm94eSkge1xuICAgICAgZm9yIChsZXQgaXRlbSBvZiBub3Byb3h5LnNwbGl0KCcsJykpIHtcbiAgICAgICAgaWYgKHRhcmdldFVybC5pbmRleE9mKGl0ZW0udHJpbSgpLnJlcGxhY2UoL1xcKi8sICcnKSkgIT09IC0xKSB7XG4gICAgICAgICAgcHJveHkgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwcm94eTtcbiAgfVxuXG4gIF9sYXVuY2hDb25uZWN0aW9uKCkge1xuICAgIHRoaXMuX2NsZWFudXAoKTsgLy8gY2xlYW51cCB0aGUgb2xkIHNvY2tldCwgaWYgdGhlcmUgd2FzIG9uZS5cblxuICAgIC8vIFNpbmNlIHNlcnZlci10by1zZXJ2ZXIgRERQIGlzIHN0aWxsIGFuIGV4cGVyaW1lbnRhbCBmZWF0dXJlLCB3ZSBvbmx5XG4gICAgLy8gcmVxdWlyZSB0aGUgbW9kdWxlIGlmIHdlIGFjdHVhbGx5IGNyZWF0ZSBhIHNlcnZlci10by1zZXJ2ZXJcbiAgICAvLyBjb25uZWN0aW9uLlxuICAgIHZhciBGYXllV2ViU29ja2V0ID0gTnBtLnJlcXVpcmUoJ2ZheWUtd2Vic29ja2V0Jyk7XG4gICAgdmFyIGRlZmxhdGUgPSBOcG0ucmVxdWlyZSgncGVybWVzc2FnZS1kZWZsYXRlMicpO1xuXG4gICAgdmFyIHRhcmdldFVybCA9IHRvV2Vic29ja2V0VXJsKHRoaXMuZW5kcG9pbnQpO1xuICAgIHZhciBmYXllT3B0aW9ucyA9IHtcbiAgICAgIGhlYWRlcnM6IHRoaXMuaGVhZGVycyxcbiAgICAgIGV4dGVuc2lvbnM6IFtkZWZsYXRlXVxuICAgIH07XG4gICAgZmF5ZU9wdGlvbnMgPSBPYmplY3QuYXNzaWduKGZheWVPcHRpb25zLCB0aGlzLm5wbUZheWVPcHRpb25zKTtcbiAgICB2YXIgcHJveHlVcmwgPSB0aGlzLl9nZXRQcm94eVVybCh0YXJnZXRVcmwpO1xuICAgIGlmIChwcm94eVVybCkge1xuICAgICAgZmF5ZU9wdGlvbnMucHJveHkgPSB7IG9yaWdpbjogcHJveHlVcmwgfTtcbiAgICB9XG5cbiAgICAvLyBXZSB3b3VsZCBsaWtlIHRvIHNwZWNpZnkgJ2RkcCcgYXMgdGhlIHN1YnByb3RvY29sIGhlcmUuIFRoZSBucG0gbW9kdWxlIHdlXG4gICAgLy8gdXNlZCB0byB1c2UgYXMgYSBjbGllbnQgd291bGQgZmFpbCB0aGUgaGFuZHNoYWtlIGlmIHdlIGFzayBmb3IgYVxuICAgIC8vIHN1YnByb3RvY29sIGFuZCB0aGUgc2VydmVyIGRvZXNuJ3Qgc2VuZCBvbmUgYmFjayAoYW5kIHNvY2tqcyBkb2Vzbid0KS5cbiAgICAvLyBGYXllIGRvZXNuJ3QgaGF2ZSB0aGF0IGJlaGF2aW9yOyBpdCdzIHVuY2xlYXIgZnJvbSByZWFkaW5nIFJGQyA2NDU1IGlmXG4gICAgLy8gRmF5ZSBpcyBlcnJvbmVvdXMgb3Igbm90LiAgU28gZm9yIG5vdywgd2UgZG9uJ3Qgc3BlY2lmeSBwcm90b2NvbHMuXG4gICAgdmFyIHN1YnByb3RvY29scyA9IFtdO1xuXG4gICAgdmFyIGNsaWVudCA9ICh0aGlzLmNsaWVudCA9IG5ldyBGYXllV2ViU29ja2V0LkNsaWVudChcbiAgICAgIHRhcmdldFVybCxcbiAgICAgIHN1YnByb3RvY29scyxcbiAgICAgIGZheWVPcHRpb25zXG4gICAgKSk7XG5cbiAgICB0aGlzLl9jbGVhckNvbm5lY3Rpb25UaW1lcigpO1xuICAgIHRoaXMuY29ubmVjdGlvblRpbWVyID0gTWV0ZW9yLnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5fbG9zdENvbm5lY3Rpb24obmV3IHRoaXMuQ29ubmVjdGlvbkVycm9yKCdERFAgY29ubmVjdGlvbiB0aW1lZCBvdXQnKSk7XG4gICAgfSwgdGhpcy5DT05ORUNUX1RJTUVPVVQpO1xuXG4gICAgdGhpcy5jbGllbnQub24oXG4gICAgICAnb3BlbicsXG4gICAgICBNZXRlb3IuYmluZEVudmlyb25tZW50KCgpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29uQ29ubmVjdChjbGllbnQpO1xuICAgICAgfSwgJ3N0cmVhbSBjb25uZWN0IGNhbGxiYWNrJylcbiAgICApO1xuXG4gICAgdmFyIGNsaWVudE9uSWZDdXJyZW50ID0gKGV2ZW50LCBkZXNjcmlwdGlvbiwgY2FsbGJhY2spID0+IHtcbiAgICAgIHRoaXMuY2xpZW50Lm9uKFxuICAgICAgICBldmVudCxcbiAgICAgICAgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoLi4uYXJncykgPT4ge1xuICAgICAgICAgIC8vIElnbm9yZSBldmVudHMgZnJvbSBhbnkgY29ubmVjdGlvbiB3ZSd2ZSBhbHJlYWR5IGNsZWFuZWQgdXAuXG4gICAgICAgICAgaWYgKGNsaWVudCAhPT0gdGhpcy5jbGllbnQpIHJldHVybjtcbiAgICAgICAgICBjYWxsYmFjayguLi5hcmdzKTtcbiAgICAgICAgfSwgZGVzY3JpcHRpb24pXG4gICAgICApO1xuICAgIH07XG5cbiAgICBjbGllbnRPbklmQ3VycmVudCgnZXJyb3InLCAnc3RyZWFtIGVycm9yIGNhbGxiYWNrJywgZXJyb3IgPT4ge1xuICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuX2RvbnRQcmludEVycm9ycylcbiAgICAgICAgTWV0ZW9yLl9kZWJ1Zygnc3RyZWFtIGVycm9yJywgZXJyb3IubWVzc2FnZSk7XG5cbiAgICAgIC8vIEZheWUncyAnZXJyb3InIG9iamVjdCBpcyBub3QgYSBKUyBlcnJvciAoYW5kIGFtb25nIG90aGVyIHRoaW5ncyxcbiAgICAgIC8vIGRvZXNuJ3Qgc3RyaW5naWZ5IHdlbGwpLiBDb252ZXJ0IGl0IHRvIG9uZS5cbiAgICAgIHRoaXMuX2xvc3RDb25uZWN0aW9uKG5ldyB0aGlzLkNvbm5lY3Rpb25FcnJvcihlcnJvci5tZXNzYWdlKSk7XG4gICAgfSk7XG5cbiAgICBjbGllbnRPbklmQ3VycmVudCgnY2xvc2UnLCAnc3RyZWFtIGNsb3NlIGNhbGxiYWNrJywgKCkgPT4ge1xuICAgICAgdGhpcy5fbG9zdENvbm5lY3Rpb24oKTtcbiAgICB9KTtcblxuICAgIGNsaWVudE9uSWZDdXJyZW50KCdtZXNzYWdlJywgJ3N0cmVhbSBtZXNzYWdlIGNhbGxiYWNrJywgbWVzc2FnZSA9PiB7XG4gICAgICAvLyBJZ25vcmUgYmluYXJ5IGZyYW1lcywgd2hlcmUgbWVzc2FnZS5kYXRhIGlzIGEgQnVmZmVyXG4gICAgICBpZiAodHlwZW9mIG1lc3NhZ2UuZGF0YSAhPT0gJ3N0cmluZycpIHJldHVybjtcblxuICAgICAgdGhpcy5mb3JFYWNoQ2FsbGJhY2soJ21lc3NhZ2UnLCBjYWxsYmFjayA9PiB7XG4gICAgICAgIGNhbGxiYWNrKG1lc3NhZ2UuZGF0YSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuIiwiaW1wb3J0IHsgUmV0cnkgfSBmcm9tICdtZXRlb3IvcmV0cnknO1xuXG5jb25zdCBmb3JjZWRSZWNvbm5lY3RFcnJvciA9IG5ldyBFcnJvcihcImZvcmNlZCByZWNvbm5lY3RcIik7XG5cbmV4cG9ydCBjbGFzcyBTdHJlYW1DbGllbnRDb21tb24ge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0ge1xuICAgICAgcmV0cnk6IHRydWUsXG4gICAgICAuLi4ob3B0aW9ucyB8fCBudWxsKSxcbiAgICB9O1xuXG4gICAgdGhpcy5Db25uZWN0aW9uRXJyb3IgPVxuICAgICAgb3B0aW9ucyAmJiBvcHRpb25zLkNvbm5lY3Rpb25FcnJvciB8fCBFcnJvcjtcbiAgfVxuXG4gIC8vIFJlZ2lzdGVyIGZvciBjYWxsYmFja3MuXG4gIG9uKG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgaWYgKG5hbWUgIT09ICdtZXNzYWdlJyAmJiBuYW1lICE9PSAncmVzZXQnICYmIG5hbWUgIT09ICdkaXNjb25uZWN0JylcbiAgICAgIHRocm93IG5ldyBFcnJvcigndW5rbm93biBldmVudCB0eXBlOiAnICsgbmFtZSk7XG5cbiAgICBpZiAoIXRoaXMuZXZlbnRDYWxsYmFja3NbbmFtZV0pIHRoaXMuZXZlbnRDYWxsYmFja3NbbmFtZV0gPSBbXTtcbiAgICB0aGlzLmV2ZW50Q2FsbGJhY2tzW25hbWVdLnB1c2goY2FsbGJhY2spO1xuICB9XG5cbiAgZm9yRWFjaENhbGxiYWNrKG5hbWUsIGNiKSB7XG4gICAgaWYgKCF0aGlzLmV2ZW50Q2FsbGJhY2tzW25hbWVdIHx8ICF0aGlzLmV2ZW50Q2FsbGJhY2tzW25hbWVdLmxlbmd0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuZXZlbnRDYWxsYmFja3NbbmFtZV0uZm9yRWFjaChjYik7XG4gIH1cblxuICBfaW5pdENvbW1vbihvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwgT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgIC8vLy8gQ29uc3RhbnRzXG5cbiAgICAvLyBob3cgbG9uZyB0byB3YWl0IHVudGlsIHdlIGRlY2xhcmUgdGhlIGNvbm5lY3Rpb24gYXR0ZW1wdFxuICAgIC8vIGZhaWxlZC5cbiAgICB0aGlzLkNPTk5FQ1RfVElNRU9VVCA9IG9wdGlvbnMuY29ubmVjdFRpbWVvdXRNcyB8fCAxMDAwMDtcblxuICAgIHRoaXMuZXZlbnRDYWxsYmFja3MgPSBPYmplY3QuY3JlYXRlKG51bGwpOyAvLyBuYW1lIC0+IFtjYWxsYmFja11cblxuICAgIHRoaXMuX2ZvcmNlZFRvRGlzY29ubmVjdCA9IGZhbHNlO1xuXG4gICAgLy8vLyBSZWFjdGl2ZSBzdGF0dXNcbiAgICB0aGlzLmN1cnJlbnRTdGF0dXMgPSB7XG4gICAgICBzdGF0dXM6ICdjb25uZWN0aW5nJyxcbiAgICAgIGNvbm5lY3RlZDogZmFsc2UsXG4gICAgICByZXRyeUNvdW50OiAwXG4gICAgfTtcblxuICAgIGlmIChQYWNrYWdlLnRyYWNrZXIpIHtcbiAgICAgIHRoaXMuc3RhdHVzTGlzdGVuZXJzID0gbmV3IFBhY2thZ2UudHJhY2tlci5UcmFja2VyLkRlcGVuZGVuY3koKTtcbiAgICB9XG5cbiAgICB0aGlzLnN0YXR1c0NoYW5nZWQgPSAoKSA9PiB7XG4gICAgICBpZiAodGhpcy5zdGF0dXNMaXN0ZW5lcnMpIHtcbiAgICAgICAgdGhpcy5zdGF0dXNMaXN0ZW5lcnMuY2hhbmdlZCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvLy8vIFJldHJ5IGxvZ2ljXG4gICAgdGhpcy5fcmV0cnkgPSBuZXcgUmV0cnkoKTtcbiAgICB0aGlzLmNvbm5lY3Rpb25UaW1lciA9IG51bGw7XG4gIH1cblxuICAvLyBUcmlnZ2VyIGEgcmVjb25uZWN0LlxuICByZWNvbm5lY3Qob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICBpZiAob3B0aW9ucy51cmwpIHtcbiAgICAgIHRoaXMuX2NoYW5nZVVybChvcHRpb25zLnVybCk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuX3NvY2tqc09wdGlvbnMpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5fc29ja2pzT3B0aW9ucyA9IG9wdGlvbnMuX3NvY2tqc09wdGlvbnM7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY3VycmVudFN0YXR1cy5jb25uZWN0ZWQpIHtcbiAgICAgIGlmIChvcHRpb25zLl9mb3JjZSB8fCBvcHRpb25zLnVybCkge1xuICAgICAgICB0aGlzLl9sb3N0Q29ubmVjdGlvbihmb3JjZWRSZWNvbm5lY3RFcnJvcik7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gaWYgd2UncmUgbWlkLWNvbm5lY3Rpb24sIHN0b3AgaXQuXG4gICAgaWYgKHRoaXMuY3VycmVudFN0YXR1cy5zdGF0dXMgPT09ICdjb25uZWN0aW5nJykge1xuICAgICAgLy8gUHJldGVuZCBpdCdzIGEgY2xlYW4gY2xvc2UuXG4gICAgICB0aGlzLl9sb3N0Q29ubmVjdGlvbigpO1xuICAgIH1cblxuICAgIHRoaXMuX3JldHJ5LmNsZWFyKCk7XG4gICAgdGhpcy5jdXJyZW50U3RhdHVzLnJldHJ5Q291bnQgLT0gMTsgLy8gZG9uJ3QgY291bnQgbWFudWFsIHJldHJpZXNcbiAgICB0aGlzLl9yZXRyeU5vdygpO1xuICB9XG5cbiAgZGlzY29ubmVjdChvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwgT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgIC8vIEZhaWxlZCBpcyBwZXJtYW5lbnQuIElmIHdlJ3JlIGZhaWxlZCwgZG9uJ3QgbGV0IHBlb3BsZSBnbyBiYWNrXG4gICAgLy8gb25saW5lIGJ5IGNhbGxpbmcgJ2Rpc2Nvbm5lY3QnIHRoZW4gJ3JlY29ubmVjdCcuXG4gICAgaWYgKHRoaXMuX2ZvcmNlZFRvRGlzY29ubmVjdCkgcmV0dXJuO1xuXG4gICAgLy8gSWYgX3Blcm1hbmVudCBpcyBzZXQsIHBlcm1hbmVudGx5IGRpc2Nvbm5lY3QgYSBzdHJlYW0uIE9uY2UgYSBzdHJlYW1cbiAgICAvLyBpcyBmb3JjZWQgdG8gZGlzY29ubmVjdCwgaXQgY2FuIG5ldmVyIHJlY29ubmVjdC4gVGhpcyBpcyBmb3JcbiAgICAvLyBlcnJvciBjYXNlcyBzdWNoIGFzIGRkcCB2ZXJzaW9uIG1pc21hdGNoLCB3aGVyZSB0cnlpbmcgYWdhaW5cbiAgICAvLyB3b24ndCBmaXggdGhlIHByb2JsZW0uXG4gICAgaWYgKG9wdGlvbnMuX3Blcm1hbmVudCkge1xuICAgICAgdGhpcy5fZm9yY2VkVG9EaXNjb25uZWN0ID0gdHJ1ZTtcbiAgICB9XG5cbiAgICB0aGlzLl9jbGVhbnVwKCk7XG4gICAgdGhpcy5fcmV0cnkuY2xlYXIoKTtcblxuICAgIHRoaXMuY3VycmVudFN0YXR1cyA9IHtcbiAgICAgIHN0YXR1czogb3B0aW9ucy5fcGVybWFuZW50ID8gJ2ZhaWxlZCcgOiAnb2ZmbGluZScsXG4gICAgICBjb25uZWN0ZWQ6IGZhbHNlLFxuICAgICAgcmV0cnlDb3VudDogMFxuICAgIH07XG5cbiAgICBpZiAob3B0aW9ucy5fcGVybWFuZW50ICYmIG9wdGlvbnMuX2Vycm9yKVxuICAgICAgdGhpcy5jdXJyZW50U3RhdHVzLnJlYXNvbiA9IG9wdGlvbnMuX2Vycm9yO1xuXG4gICAgdGhpcy5zdGF0dXNDaGFuZ2VkKCk7XG4gIH1cblxuICAvLyBtYXliZUVycm9yIGlzIHNldCB1bmxlc3MgaXQncyBhIGNsZWFuIHByb3RvY29sLWxldmVsIGNsb3NlLlxuICBfbG9zdENvbm5lY3Rpb24obWF5YmVFcnJvcikge1xuICAgIHRoaXMuX2NsZWFudXAobWF5YmVFcnJvcik7XG4gICAgdGhpcy5fcmV0cnlMYXRlcihtYXliZUVycm9yKTsgLy8gc2V0cyBzdGF0dXMuIG5vIG5lZWQgdG8gZG8gaXQgaGVyZS5cbiAgfVxuXG4gIC8vIGZpcmVkIHdoZW4gd2UgZGV0ZWN0IHRoYXQgd2UndmUgZ29uZSBvbmxpbmUuIHRyeSB0byByZWNvbm5lY3RcbiAgLy8gaW1tZWRpYXRlbHkuXG4gIF9vbmxpbmUoKSB7XG4gICAgLy8gaWYgd2UndmUgcmVxdWVzdGVkIHRvIGJlIG9mZmxpbmUgYnkgZGlzY29ubmVjdGluZywgZG9uJ3QgcmVjb25uZWN0LlxuICAgIGlmICh0aGlzLmN1cnJlbnRTdGF0dXMuc3RhdHVzICE9ICdvZmZsaW5lJykgdGhpcy5yZWNvbm5lY3QoKTtcbiAgfVxuXG4gIF9yZXRyeUxhdGVyKG1heWJlRXJyb3IpIHtcbiAgICB2YXIgdGltZW91dCA9IDA7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5yZXRyeSB8fFxuICAgICAgICBtYXliZUVycm9yID09PSBmb3JjZWRSZWNvbm5lY3RFcnJvcikge1xuICAgICAgdGltZW91dCA9IHRoaXMuX3JldHJ5LnJldHJ5TGF0ZXIoXG4gICAgICAgIHRoaXMuY3VycmVudFN0YXR1cy5yZXRyeUNvdW50LFxuICAgICAgICB0aGlzLl9yZXRyeU5vdy5iaW5kKHRoaXMpXG4gICAgICApO1xuICAgICAgdGhpcy5jdXJyZW50U3RhdHVzLnN0YXR1cyA9ICd3YWl0aW5nJztcbiAgICAgIHRoaXMuY3VycmVudFN0YXR1cy5yZXRyeVRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKSArIHRpbWVvdXQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY3VycmVudFN0YXR1cy5zdGF0dXMgPSAnZmFpbGVkJztcbiAgICAgIGRlbGV0ZSB0aGlzLmN1cnJlbnRTdGF0dXMucmV0cnlUaW1lO1xuICAgIH1cblxuICAgIHRoaXMuY3VycmVudFN0YXR1cy5jb25uZWN0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLnN0YXR1c0NoYW5nZWQoKTtcbiAgfVxuXG4gIF9yZXRyeU5vdygpIHtcbiAgICBpZiAodGhpcy5fZm9yY2VkVG9EaXNjb25uZWN0KSByZXR1cm47XG5cbiAgICB0aGlzLmN1cnJlbnRTdGF0dXMucmV0cnlDb3VudCArPSAxO1xuICAgIHRoaXMuY3VycmVudFN0YXR1cy5zdGF0dXMgPSAnY29ubmVjdGluZyc7XG4gICAgdGhpcy5jdXJyZW50U3RhdHVzLmNvbm5lY3RlZCA9IGZhbHNlO1xuICAgIGRlbGV0ZSB0aGlzLmN1cnJlbnRTdGF0dXMucmV0cnlUaW1lO1xuICAgIHRoaXMuc3RhdHVzQ2hhbmdlZCgpO1xuXG4gICAgdGhpcy5fbGF1bmNoQ29ubmVjdGlvbigpO1xuICB9XG5cbiAgLy8gR2V0IGN1cnJlbnQgc3RhdHVzLiBSZWFjdGl2ZS5cbiAgc3RhdHVzKCkge1xuICAgIGlmICh0aGlzLnN0YXR1c0xpc3RlbmVycykge1xuICAgICAgdGhpcy5zdGF0dXNMaXN0ZW5lcnMuZGVwZW5kKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmN1cnJlbnRTdGF0dXM7XG4gIH1cbn1cbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gXCJtZXRlb3IvbWV0ZW9yXCI7XG5cbi8vIEBwYXJhbSB1cmwge1N0cmluZ30gVVJMIHRvIE1ldGVvciBhcHAsIGVnOlxuLy8gICBcIi9cIiBvciBcIm1hZGV3aXRoLm1ldGVvci5jb21cIiBvciBcImh0dHBzOi8vZm9vLm1ldGVvci5jb21cIlxuLy8gICBvciBcImRkcCtzb2NranM6Ly9kZHAtLSoqKiotZm9vLm1ldGVvci5jb20vc29ja2pzXCJcbi8vIEByZXR1cm5zIHtTdHJpbmd9IFVSTCB0byB0aGUgZW5kcG9pbnQgd2l0aCB0aGUgc3BlY2lmaWMgc2NoZW1lIGFuZCBzdWJQYXRoLCBlLmcuXG4vLyBmb3Igc2NoZW1lIFwiaHR0cFwiIGFuZCBzdWJQYXRoIFwic29ja2pzXCJcbi8vICAgXCJodHRwOi8vc3ViZG9tYWluLm1ldGVvci5jb20vc29ja2pzXCIgb3IgXCIvc29ja2pzXCJcbi8vICAgb3IgXCJodHRwczovL2RkcC0tMTIzNC1mb28ubWV0ZW9yLmNvbS9zb2NranNcIlxuZnVuY3Rpb24gdHJhbnNsYXRlVXJsKHVybCwgbmV3U2NoZW1lQmFzZSwgc3ViUGF0aCkge1xuICBpZiAoIW5ld1NjaGVtZUJhc2UpIHtcbiAgICBuZXdTY2hlbWVCYXNlID0gJ2h0dHAnO1xuICB9XG5cbiAgaWYgKHN1YlBhdGggIT09IFwic29ja2pzXCIgJiYgdXJsLnN0YXJ0c1dpdGgoXCIvXCIpKSB7XG4gICAgdXJsID0gTWV0ZW9yLmFic29sdXRlVXJsKHVybC5zdWJzdHIoMSkpO1xuICB9XG5cbiAgdmFyIGRkcFVybE1hdGNoID0gdXJsLm1hdGNoKC9eZGRwKGk/KVxcK3NvY2tqczpcXC9cXC8vKTtcbiAgdmFyIGh0dHBVcmxNYXRjaCA9IHVybC5tYXRjaCgvXmh0dHAocz8pOlxcL1xcLy8pO1xuICB2YXIgbmV3U2NoZW1lO1xuICBpZiAoZGRwVXJsTWF0Y2gpIHtcbiAgICAvLyBSZW1vdmUgc2NoZW1lIGFuZCBzcGxpdCBvZmYgdGhlIGhvc3QuXG4gICAgdmFyIHVybEFmdGVyRERQID0gdXJsLnN1YnN0cihkZHBVcmxNYXRjaFswXS5sZW5ndGgpO1xuICAgIG5ld1NjaGVtZSA9IGRkcFVybE1hdGNoWzFdID09PSAnaScgPyBuZXdTY2hlbWVCYXNlIDogbmV3U2NoZW1lQmFzZSArICdzJztcbiAgICB2YXIgc2xhc2hQb3MgPSB1cmxBZnRlckREUC5pbmRleE9mKCcvJyk7XG4gICAgdmFyIGhvc3QgPSBzbGFzaFBvcyA9PT0gLTEgPyB1cmxBZnRlckREUCA6IHVybEFmdGVyRERQLnN1YnN0cigwLCBzbGFzaFBvcyk7XG4gICAgdmFyIHJlc3QgPSBzbGFzaFBvcyA9PT0gLTEgPyAnJyA6IHVybEFmdGVyRERQLnN1YnN0cihzbGFzaFBvcyk7XG5cbiAgICAvLyBJbiB0aGUgaG9zdCAoT05MWSEpLCBjaGFuZ2UgJyonIGNoYXJhY3RlcnMgaW50byByYW5kb20gZGlnaXRzLiBUaGlzXG4gICAgLy8gYWxsb3dzIGRpZmZlcmVudCBzdHJlYW0gY29ubmVjdGlvbnMgdG8gY29ubmVjdCB0byBkaWZmZXJlbnQgaG9zdG5hbWVzXG4gICAgLy8gYW5kIGF2b2lkIGJyb3dzZXIgcGVyLWhvc3RuYW1lIGNvbm5lY3Rpb24gbGltaXRzLlxuICAgIGhvc3QgPSBob3N0LnJlcGxhY2UoL1xcKi9nLCAoKSA9PiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMCkpO1xuXG4gICAgcmV0dXJuIG5ld1NjaGVtZSArICc6Ly8nICsgaG9zdCArIHJlc3Q7XG4gIH0gZWxzZSBpZiAoaHR0cFVybE1hdGNoKSB7XG4gICAgbmV3U2NoZW1lID0gIWh0dHBVcmxNYXRjaFsxXSA/IG5ld1NjaGVtZUJhc2UgOiBuZXdTY2hlbWVCYXNlICsgJ3MnO1xuICAgIHZhciB1cmxBZnRlckh0dHAgPSB1cmwuc3Vic3RyKGh0dHBVcmxNYXRjaFswXS5sZW5ndGgpO1xuICAgIHVybCA9IG5ld1NjaGVtZSArICc6Ly8nICsgdXJsQWZ0ZXJIdHRwO1xuICB9XG5cbiAgLy8gUHJlZml4IEZRRE5zIGJ1dCBub3QgcmVsYXRpdmUgVVJMc1xuICBpZiAodXJsLmluZGV4T2YoJzovLycpID09PSAtMSAmJiAhdXJsLnN0YXJ0c1dpdGgoJy8nKSkge1xuICAgIHVybCA9IG5ld1NjaGVtZUJhc2UgKyAnOi8vJyArIHVybDtcbiAgfVxuXG4gIC8vIFhYWCBUaGlzIGlzIG5vdCB3aGF0IHdlIHNob3VsZCBiZSBkb2luZzogaWYgSSBoYXZlIGEgc2l0ZVxuICAvLyBkZXBsb3llZCBhdCBcIi9mb29cIiwgdGhlbiBERFAuY29ubmVjdChcIi9cIikgc2hvdWxkIGFjdHVhbGx5IGNvbm5lY3RcbiAgLy8gdG8gXCIvXCIsIG5vdCB0byBcIi9mb29cIi4gXCIvXCIgaXMgYW4gYWJzb2x1dGUgcGF0aC4gKENvbnRyYXN0OiBpZlxuICAvLyBkZXBsb3llZCBhdCBcIi9mb29cIiwgaXQgd291bGQgYmUgcmVhc29uYWJsZSBmb3IgRERQLmNvbm5lY3QoXCJiYXJcIilcbiAgLy8gdG8gY29ubmVjdCB0byBcIi9mb28vYmFyXCIpLlxuICAvL1xuICAvLyBXZSBzaG91bGQgbWFrZSB0aGlzIHByb3Blcmx5IGhvbm9yIGFic29sdXRlIHBhdGhzIHJhdGhlciB0aGFuXG4gIC8vIGZvcmNpbmcgdGhlIHBhdGggdG8gYmUgcmVsYXRpdmUgdG8gdGhlIHNpdGUgcm9vdC4gU2ltdWx0YW5lb3VzbHksXG4gIC8vIHdlIHNob3VsZCBzZXQgRERQX0RFRkFVTFRfQ09OTkVDVElPTl9VUkwgdG8gaW5jbHVkZSB0aGUgc2l0ZVxuICAvLyByb290LiBTZWUgYWxzbyBjbGllbnRfY29udmVuaWVuY2UuanMgI1JhdGlvbmFsaXppbmdSZWxhdGl2ZUREUFVSTHNcbiAgdXJsID0gTWV0ZW9yLl9yZWxhdGl2ZVRvU2l0ZVJvb3RVcmwodXJsKTtcblxuICBpZiAodXJsLmVuZHNXaXRoKCcvJykpIHJldHVybiB1cmwgKyBzdWJQYXRoO1xuICBlbHNlIHJldHVybiB1cmwgKyAnLycgKyBzdWJQYXRoO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9Tb2NranNVcmwodXJsKSB7XG4gIHJldHVybiB0cmFuc2xhdGVVcmwodXJsLCAnaHR0cCcsICdzb2NranMnKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvV2Vic29ja2V0VXJsKHVybCkge1xuICByZXR1cm4gdHJhbnNsYXRlVXJsKHVybCwgJ3dzJywgJ3dlYnNvY2tldCcpO1xufVxuIl19
