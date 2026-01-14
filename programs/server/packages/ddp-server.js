Package["core-runtime"].queue("ddp-server",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var check = Package.check.check;
var Match = Package.check.Match;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var Retry = Package.retry.Retry;
var MongoID = Package['mongo-id'].MongoID;
var DiffSequence = Package['diff-sequence'].DiffSequence;
var ECMAScript = Package.ecmascript.ECMAScript;
var DDPCommon = Package['ddp-common'].DDPCommon;
var DDP = Package['ddp-client'].DDP;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var RoutePolicy = Package.routepolicy.RoutePolicy;
var Hook = Package['callback-hook'].Hook;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var StreamServer, DDPServer, Server;

var require = meteorInstall({"node_modules":{"meteor":{"ddp-server":{"stream_server.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-server/stream_server.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {let _object_spread;module.link("@swc/helpers/_/_object_spread",{_(v){_object_spread=v}},0);let once;module.link('lodash.once',{default(v){once=v}},1);let zlib;module.link('node:zlib',{default(v){zlib=v}},2);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();


// By default, we use the permessage-deflate extension with default
// configuration. If $SERVER_WEBSOCKET_COMPRESSION is set, then it must be valid
// JSON. If it represents a falsey value, then we do not use permessage-deflate
// at all; otherwise, the JSON value is used as an argument to deflate's
// configure method; see
// https://github.com/faye/permessage-deflate-node/blob/master/README.md
//
// (We do this in an _.once instead of at startup, because we don't want to
// crash the tool during isopacket load if your JSON doesn't parse. This is only
// a problem because the tool has to load the DDP server code just in order to
// be a DDP client; see https://github.com/meteor/meteor/issues/3452 .)
var websocketExtensions = once(function() {
    var extensions = [];
    var websocketCompressionConfig = process.env.SERVER_WEBSOCKET_COMPRESSION ? JSON.parse(process.env.SERVER_WEBSOCKET_COMPRESSION) : {};
    if (websocketCompressionConfig) {
        extensions.push(Npm.require('permessage-deflate2').configure(_object_spread({
            threshold: 1024,
            level: zlib.constants.Z_BEST_SPEED,
            memLevel: zlib.constants.Z_MIN_MEMLEVEL,
            noContextTakeover: true,
            maxWindowBits: zlib.constants.Z_MIN_WINDOWBITS
        }, websocketCompressionConfig || {})));
    }
    return extensions;
});
var pathPrefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || "";
StreamServer = function() {
    var self = this;
    self.registration_callbacks = [];
    self.open_sockets = [];
    // Because we are installing directly onto WebApp.httpServer instead of using
    // WebApp.app, we have to process the path prefix ourselves.
    self.prefix = pathPrefix + '/sockjs';
    RoutePolicy.declare(self.prefix + '/', 'network');
    // set up sockjs
    var sockjs = Npm.require('sockjs');
    var serverOptions = {
        prefix: self.prefix,
        log: function() {},
        // this is the default, but we code it explicitly because we depend
        // on it in stream_client:HEARTBEAT_TIMEOUT
        heartbeat_delay: 45000,
        // The default disconnect_delay is 5 seconds, but if the server ends up CPU
        // bound for that much time, SockJS might not notice that the user has
        // reconnected because the timer (of disconnect_delay ms) can fire before
        // SockJS processes the new connection. Eventually we'll fix this by not
        // combining CPU-heavy processing with SockJS termination (eg a proxy which
        // converts to Unix sockets) but for now, raise the delay.
        disconnect_delay: 60 * 1000,
        // Allow disabling of CORS requests to address
        // https://github.com/meteor/meteor/issues/8317.
        disable_cors: !!process.env.DISABLE_SOCKJS_CORS,
        // Set the USE_JSESSIONID environment variable to enable setting the
        // JSESSIONID cookie. This is useful for setting up proxies with
        // session affinity.
        jsessionid: !!process.env.USE_JSESSIONID
    };
    // If you know your server environment (eg, proxies) will prevent websockets
    // from ever working, set $DISABLE_WEBSOCKETS and SockJS clients (ie,
    // browsers) will not waste time attempting to use them.
    // (Your server will still have a /websocket endpoint.)
    if (process.env.DISABLE_WEBSOCKETS) {
        serverOptions.websocket = false;
    } else {
        serverOptions.faye_server_options = {
            extensions: websocketExtensions()
        };
    }
    self.server = sockjs.createServer(serverOptions);
    // Install the sockjs handlers, but we want to keep around our own particular
    // request handler that adjusts idle timeouts while we have an outstanding
    // request.  This compensates for the fact that sockjs removes all listeners
    // for "request" to add its own.
    WebApp.httpServer.removeListener('request', WebApp._timeoutAdjustmentRequestCallback);
    self.server.installHandlers(WebApp.httpServer);
    WebApp.httpServer.addListener('request', WebApp._timeoutAdjustmentRequestCallback);
    // Support the /websocket endpoint
    self._redirectWebsocketEndpoint();
    self.server.on('connection', function(socket) {
        // sockjs sometimes passes us null instead of a socket object
        // so we need to guard against that. see:
        // https://github.com/sockjs/sockjs-node/issues/121
        // https://github.com/meteor/meteor/issues/10468
        if (!socket) return;
        // We want to make sure that if a client connects to us and does the initial
        // Websocket handshake but never gets to the DDP handshake, that we
        // eventually kill the socket.  Once the DDP handshake happens, DDP
        // heartbeating will work. And before the Websocket handshake, the timeouts
        // we set at the server level in webapp_server.js will work. But
        // faye-websocket calls setTimeout(0) on any socket it takes over, so there
        // is an "in between" state where this doesn't happen.  We work around this
        // by explicitly setting the socket timeout to a relatively large time here,
        // and setting it back to zero when we set up the heartbeat in
        // livedata_server.js.
        socket.setWebsocketTimeout = function(timeout) {
            if ((socket.protocol === 'websocket' || socket.protocol === 'websocket-raw') && socket._session.recv) {
                socket._session.recv.connection.setTimeout(timeout);
            }
        };
        socket.setWebsocketTimeout(45 * 1000);
        socket.send = function(data) {
            socket.write(data);
        };
        socket.on('close', function() {
            self.open_sockets = self.open_sockets.filter(function(value) {
                return value !== socket;
            });
        });
        self.open_sockets.push(socket);
        // only to send a message after connection on tests, useful for
        // socket-stream-client/server-tests.js
        if (process.env.TEST_METADATA && process.env.TEST_METADATA !== "{}") {
            socket.send(JSON.stringify({
                testMessageOnConnect: true
            }));
        }
        // call all our callbacks when we get a new socket. they will do the
        // work of setting up handlers and such for specific messages.
        self.registration_callbacks.forEach(function(callback) {
            callback(socket);
        });
    });
};
Object.assign(StreamServer.prototype, {
    // call my callback when a new socket connects.
    // also call it for all current connections.
    register: function(callback) {
        var self = this;
        self.registration_callbacks.push(callback);
        self.all_sockets().forEach(function(socket) {
            callback(socket);
        });
    },
    // get a list of all sockets
    all_sockets: function() {
        var self = this;
        return Object.values(self.open_sockets);
    },
    // Redirect /websocket to /sockjs/websocket in order to not expose
    // sockjs to clients that want to use raw websockets
    _redirectWebsocketEndpoint: function() {
        var self = this;
        // Unfortunately we can't use a connect middleware here since
        // sockjs installs itself prior to all existing listeners
        // (meaning prior to any connect middlewares) so we need to take
        // an approach similar to overshadowListeners in
        // https://github.com/sockjs/sockjs-node/blob/cf820c55af6a9953e16558555a31decea554f70e/src/utils.coffee
        [
            'request',
            'upgrade'
        ].forEach((event)=>{
            var httpServer = WebApp.httpServer;
            var oldHttpServerListeners = httpServer.listeners(event).slice(0);
            httpServer.removeAllListeners(event);
            // request and upgrade have different arguments passed but
            // we only care about the first one which is always request
            var newListener = function(request /*, moreArguments */ ) {
                // Store arguments for use within the closure below
                var args = arguments;
                // TODO replace with url package
                var url = Npm.require('url');
                // Rewrite /websocket and /websocket/ urls to /sockjs/websocket while
                // preserving query string.
                var parsedUrl = url.parse(request.url);
                if (parsedUrl.pathname === pathPrefix + '/websocket' || parsedUrl.pathname === pathPrefix + '/websocket/') {
                    parsedUrl.pathname = self.prefix + '/websocket';
                    request.url = url.format(parsedUrl);
                }
                oldHttpServerListeners.forEach(function(oldListener) {
                    oldListener.apply(httpServer, args);
                });
            };
            httpServer.addListener(event, newListener);
        });
    }
});
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livedata_server.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-server/livedata_server.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);let _object_spread;module.link("@swc/helpers/_/_object_spread",{_(v){_object_spread=v}},1);let isEmpty;module.link('lodash.isempty',{default(v){isEmpty=v}},2);let isObject;module.link('lodash.isobject',{default(v){isObject=v}},3);let isString;module.link('lodash.isstring',{default(v){isString=v}},4);let SessionCollectionView;module.link('./session_collection_view',{SessionCollectionView(v){SessionCollectionView=v}},5);let SessionDocumentView;module.link('./session_document_view',{SessionDocumentView(v){SessionDocumentView=v}},6);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();






DDPServer = {};
// Publication strategies define how we handle data from published cursors at the collection level
// This allows someone to:
// - Choose a trade-off between client-server bandwidth and server memory usage
// - Implement special (non-mongo) collections like volatile message queues
const publicationStrategies = {
    // SERVER_MERGE is the default strategy.
    // When using this strategy, the server maintains a copy of all data a connection is subscribed to.
    // This allows us to only send deltas over multiple publications.
    SERVER_MERGE: {
        useDummyDocumentView: false,
        useCollectionView: true,
        doAccountingForCollection: true
    },
    // The NO_MERGE_NO_HISTORY strategy results in the server sending all publication data
    // directly to the client. It does not remember what it has previously sent
    // to it will not trigger removed messages when a subscription is stopped.
    // This should only be chosen for special use cases like send-and-forget queues.
    NO_MERGE_NO_HISTORY: {
        useDummyDocumentView: false,
        useCollectionView: false,
        doAccountingForCollection: false
    },
    // NO_MERGE is similar to NO_MERGE_NO_HISTORY but the server will remember the IDs it has
    // sent to the client so it can remove them when a subscription is stopped.
    // This strategy can be used when a collection is only used in a single publication.
    NO_MERGE: {
        useDummyDocumentView: false,
        useCollectionView: false,
        doAccountingForCollection: true
    },
    // NO_MERGE_MULTI is similar to `NO_MERGE`, but it does track whether a document is
    // used by multiple publications. This has some memory overhead, but it still does not do
    // diffing so it's faster and slimmer than SERVER_MERGE.
    NO_MERGE_MULTI: {
        useDummyDocumentView: true,
        useCollectionView: true,
        doAccountingForCollection: true
    }
};
DDPServer.publicationStrategies = publicationStrategies;
// This file contains classes:
// * Session - The server's connection to a single DDP client
// * Subscription - A single subscription for a single client
// * Server - An entire server that may talk to > 1 client. A DDP endpoint.
//
// Session and Subscription are file scope. For now, until we freeze
// the interface, Server is package scope (in the future it should be
// exported).
DDPServer._SessionDocumentView = SessionDocumentView;
DDPServer._getCurrentFence = function() {
    let currentInvocation = this._CurrentWriteFence.get();
    if (currentInvocation) {
        return currentInvocation;
    }
    currentInvocation = DDP._CurrentMethodInvocation.get();
    return currentInvocation ? currentInvocation.fence : undefined;
};
DDPServer._SessionCollectionView = SessionCollectionView;
/******************************************************************************/ /* Session                                                                    */ /******************************************************************************/ var Session = function(server, version, socket, options) {
    var self = this;
    self.id = Random.id();
    self.server = server;
    self.version = version;
    self.initialized = false;
    self.socket = socket;
    // Set to null when the session is destroyed. Multiple places below
    // use this to determine if the session is alive or not.
    self.inQueue = new Meteor._DoubleEndedQueue();
    self.blocked = false;
    self.workerRunning = false;
    self.cachedUnblock = null;
    // Sub objects for active subscriptions
    self._namedSubs = new Map();
    self._universalSubs = [];
    self.userId = null;
    self.collectionViews = new Map();
    // Set this to false to not send messages when collectionViews are
    // modified. This is done when rerunning subs in _setUserId and those messages
    // are calculated via a diff instead.
    self._isSending = true;
    // If this is true, don't start a newly-created universal publisher on this
    // session. The session will take care of starting it when appropriate.
    self._dontStartNewUniversalSubs = false;
    // When we are rerunning subscriptions, any ready messages
    // we want to buffer up for when we are done rerunning subscriptions
    self._pendingReady = [];
    // List of callbacks to call when this connection is closed.
    self._closeCallbacks = [];
    // XXX HACK: If a sockjs connection, save off the URL. This is
    // temporary and will go away in the near future.
    self._socketUrl = socket.url;
    // Allow tests to disable responding to pings.
    self._respondToPings = options.respondToPings;
    // This object is the public interface to the session. In the public
    // API, it is called the `connection` object.  Internally we call it
    // a `connectionHandle` to avoid ambiguity.
    self.connectionHandle = {
        id: self.id,
        close: function() {
            self.close();
        },
        onClose: function(fn) {
            var cb = Meteor.bindEnvironment(fn, "connection onClose callback");
            if (self.inQueue) {
                self._closeCallbacks.push(cb);
            } else {
                // if we're already closed, call the callback.
                Meteor.defer(cb);
            }
        },
        clientAddress: self._clientAddress(),
        httpHeaders: self.socket.headers
    };
    self.send({
        msg: 'connected',
        session: self.id
    });
    // On initial connect, spin up all the universal publishers.
    self.startUniversalSubs();
    if (version !== 'pre1' && options.heartbeatInterval !== 0) {
        // We no longer need the low level timeout because we have heartbeats.
        socket.setWebsocketTimeout(0);
        self.heartbeat = new DDPCommon.Heartbeat({
            heartbeatInterval: options.heartbeatInterval,
            heartbeatTimeout: options.heartbeatTimeout,
            onTimeout: function() {
                self.close();
            },
            sendPing: function() {
                self.send({
                    msg: 'ping'
                });
            }
        });
        self.heartbeat.start();
    }
    Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("livedata", "sessions", 1);
};
Object.assign(Session.prototype, {
    sendReady: function(subscriptionIds) {
        var self = this;
        if (self._isSending) {
            self.send({
                msg: "ready",
                subs: subscriptionIds
            });
        } else {
            subscriptionIds.forEach(function(subscriptionId) {
                self._pendingReady.push(subscriptionId);
            });
        }
    },
    _canSend (collectionName) {
        return this._isSending || !this.server.getPublicationStrategy(collectionName).useCollectionView;
    },
    sendAdded (collectionName, id, fields) {
        if (this._canSend(collectionName)) {
            this.send({
                msg: 'added',
                collection: collectionName,
                id,
                fields
            });
        }
    },
    sendChanged (collectionName, id, fields) {
        if (isEmpty(fields)) return;
        if (this._canSend(collectionName)) {
            this.send({
                msg: "changed",
                collection: collectionName,
                id,
                fields
            });
        }
    },
    sendRemoved (collectionName, id) {
        if (this._canSend(collectionName)) {
            this.send({
                msg: "removed",
                collection: collectionName,
                id
            });
        }
    },
    getSendCallbacks: function() {
        var self = this;
        return {
            added: self.sendAdded.bind(self),
            changed: self.sendChanged.bind(self),
            removed: self.sendRemoved.bind(self)
        };
    },
    getCollectionView: function(collectionName) {
        var self = this;
        var ret = self.collectionViews.get(collectionName);
        if (!ret) {
            ret = new SessionCollectionView(collectionName, self.getSendCallbacks());
            self.collectionViews.set(collectionName, ret);
        }
        return ret;
    },
    added (subscriptionHandle, collectionName, id, fields) {
        if (this.server.getPublicationStrategy(collectionName).useCollectionView) {
            const view = this.getCollectionView(collectionName);
            view.added(subscriptionHandle, id, fields);
        } else {
            this.sendAdded(collectionName, id, fields);
        }
    },
    removed (subscriptionHandle, collectionName, id) {
        if (this.server.getPublicationStrategy(collectionName).useCollectionView) {
            const view = this.getCollectionView(collectionName);
            view.removed(subscriptionHandle, id);
            if (view.isEmpty()) {
                this.collectionViews.delete(collectionName);
            }
        } else {
            this.sendRemoved(collectionName, id);
        }
    },
    changed (subscriptionHandle, collectionName, id, fields) {
        if (this.server.getPublicationStrategy(collectionName).useCollectionView) {
            const view = this.getCollectionView(collectionName);
            view.changed(subscriptionHandle, id, fields);
        } else {
            this.sendChanged(collectionName, id, fields);
        }
    },
    startUniversalSubs: function() {
        var self = this;
        // Make a shallow copy of the set of universal handlers and start them. If
        // additional universal publishers start while we're running them (due to
        // yielding), they will run separately as part of Server.publish.
        var handlers = [
            ...self.server.universal_publish_handlers
        ];
        handlers.forEach(function(handler) {
            self._startSubscription(handler);
        });
    },
    // Destroy this session and unregister it at the server.
    close: function() {
        var self = this;
        // Destroy this session, even if it's not registered at the
        // server. Stop all processing and tear everything down. If a socket
        // was attached, close it.
        // Already destroyed.
        if (!self.inQueue) return;
        // Drop the merge box data immediately.
        self.inQueue = null;
        self.collectionViews = new Map();
        if (self.heartbeat) {
            self.heartbeat.stop();
            self.heartbeat = null;
        }
        if (self.socket) {
            self.socket.close();
            self.socket._meteorSession = null;
        }
        Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("livedata", "sessions", -1);
        Meteor.defer(function() {
            // Stop callbacks can yield, so we defer this on close.
            // sub._isDeactivated() detects that we set inQueue to null and
            // treats it as semi-deactivated (it will ignore incoming callbacks, etc).
            self._deactivateAllSubscriptions();
            // Defer calling the close callbacks, so that the caller closing
            // the session isn't waiting for all the callbacks to complete.
            self._closeCallbacks.forEach(function(callback) {
                callback();
            });
        });
        // Unregister the session.
        self.server._removeSession(self);
    },
    // Send a message (doing nothing if no socket is connected right now).
    // It should be a JSON object (it will be stringified).
    send: function(msg) {
        const self = this;
        if (self.socket) {
            if (Meteor._printSentDDP) Meteor._debug("Sent DDP", DDPCommon.stringifyDDP(msg));
            self.socket.send(DDPCommon.stringifyDDP(msg));
        }
    },
    // Send a connection error.
    sendError: function(reason, offendingMessage) {
        var self = this;
        var msg = {
            msg: 'error',
            reason: reason
        };
        if (offendingMessage) msg.offendingMessage = offendingMessage;
        self.send(msg);
    },
    // Process 'msg' as an incoming message. As a guard against
    // race conditions during reconnection, ignore the message if
    // 'socket' is not the currently connected socket.
    //
    // We run the messages from the client one at a time, in the order
    // given by the client. The message handler is passed an idempotent
    // function 'unblock' which it may call to allow other messages to
    // begin running in parallel in another fiber (for example, a method
    // that wants to yield). Otherwise, it is automatically unblocked
    // when it returns.
    //
    // Actually, we don't have to 'totally order' the messages in this
    // way, but it's the easiest thing that's correct. (unsub needs to
    // be ordered against sub, methods need to be ordered against each
    // other).
    processMessage: function(msg_in) {
        var self = this;
        if (!self.inQueue) return;
        // Respond to ping and pong messages immediately without queuing.
        // If the negotiated DDP version is "pre1" which didn't support
        // pings, preserve the "pre1" behavior of responding with a "bad
        // request" for the unknown messages.
        //
        // Fibers are needed because heartbeats use Meteor.setTimeout, which
        // needs a Fiber. We could actually use regular setTimeout and avoid
        // these new fibers, but it is easier to just make everything use
        // Meteor.setTimeout and not think too hard.
        //
        // Any message counts as receiving a pong, as it demonstrates that
        // the client is still alive.
        if (self.heartbeat) {
            self.heartbeat.messageReceived();
        }
        ;
        if (self.version !== 'pre1' && msg_in.msg === 'ping') {
            if (self._respondToPings) self.send({
                msg: "pong",
                id: msg_in.id
            });
            return;
        }
        if (self.version !== 'pre1' && msg_in.msg === 'pong') {
            // Since everything is a pong, there is nothing to do
            return;
        }
        self.inQueue.push(msg_in);
        if (self.workerRunning) return;
        self.workerRunning = true;
        var processNext = function() {
            var msg = self.inQueue && self.inQueue.shift();
            if (!msg) {
                self.workerRunning = false;
                return;
            }
            function runHandlers() {
                var blocked = true;
                var unblock = function() {
                    if (!blocked) return; // idempotent
                    blocked = false;
                    setImmediate(processNext);
                };
                self.server.onMessageHook.each(function(callback) {
                    callback(msg, self);
                    return true;
                });
                if (msg.msg in self.protocol_handlers) {
                    const result = self.protocol_handlers[msg.msg].call(self, msg, unblock);
                    if (Meteor._isPromise(result)) {
                        result.finally(()=>unblock());
                    } else {
                        unblock();
                    }
                } else {
                    self.sendError('Bad request', msg);
                    unblock(); // in case the handler didn't already do it
                }
            }
            runHandlers();
        };
        processNext();
    },
    protocol_handlers: {
        sub: function(msg, unblock) {
            return _async_to_generator(function*() {
                var self = this;
                // cacheUnblock temporarly, so we can capture it later
                // we will use unblock in current eventLoop, so this is safe
                self.cachedUnblock = unblock;
                // reject malformed messages
                if (typeof msg.id !== "string" || typeof msg.name !== "string" || 'params' in msg && !(msg.params instanceof Array)) {
                    self.sendError("Malformed subscription", msg);
                    return;
                }
                if (!self.server.publish_handlers[msg.name]) {
                    self.send({
                        msg: 'nosub',
                        id: msg.id,
                        error: new Meteor.Error(404, `Subscription '${msg.name}' not found`)
                    });
                    return;
                }
                if (self._namedSubs.has(msg.id)) // subs are idempotent, or rather, they are ignored if a sub
                // with that id already exists. this is important during
                // reconnect.
                return;
                // XXX It'd be much better if we had generic hooks where any package can
                // hook into subscription handling, but in the mean while we special case
                // ddp-rate-limiter package. This is also done for weak requirements to
                // add the ddp-rate-limiter package in case we don't have Accounts. A
                // user trying to use the ddp-rate-limiter must explicitly require it.
                if (Package['ddp-rate-limiter']) {
                    var DDPRateLimiter = Package['ddp-rate-limiter'].DDPRateLimiter;
                    var rateLimiterInput = {
                        userId: self.userId,
                        clientAddress: self.connectionHandle.clientAddress,
                        type: "subscription",
                        name: msg.name,
                        connectionId: self.id
                    };
                    DDPRateLimiter._increment(rateLimiterInput);
                    var rateLimitResult = DDPRateLimiter._check(rateLimiterInput);
                    if (!rateLimitResult.allowed) {
                        self.send({
                            msg: 'nosub',
                            id: msg.id,
                            error: new Meteor.Error('too-many-requests', DDPRateLimiter.getErrorMessage(rateLimitResult), {
                                timeToReset: rateLimitResult.timeToReset
                            })
                        });
                        return;
                    }
                }
                var handler = self.server.publish_handlers[msg.name];
                yield self._startSubscription(handler, msg.id, msg.params, msg.name);
                // cleaning cached unblock
                self.cachedUnblock = null;
            }).call(this);
        },
        unsub: function(msg) {
            var self = this;
            self._stopSubscription(msg.id);
        },
        method: function(msg, unblock) {
            return _async_to_generator(function*() {
                var self = this;
                // Reject malformed messages.
                // For now, we silently ignore unknown attributes,
                // for forwards compatibility.
                if (typeof msg.id !== "string" || typeof msg.method !== "string" || 'params' in msg && !(msg.params instanceof Array) || 'randomSeed' in msg && typeof msg.randomSeed !== "string") {
                    self.sendError("Malformed method invocation", msg);
                    return;
                }
                var randomSeed = msg.randomSeed || null;
                // Set up to mark the method as satisfied once all observers
                // (and subscriptions) have reacted to any writes that were
                // done.
                var fence = new DDPServer._WriteFence;
                fence.onAllCommitted(function() {
                    // Retire the fence so that future writes are allowed.
                    // This means that callbacks like timers are free to use
                    // the fence, and if they fire before it's armed (for
                    // example, because the method waits for them) their
                    // writes will be included in the fence.
                    fence.retire();
                    self.send({
                        msg: 'updated',
                        methods: [
                            msg.id
                        ]
                    });
                });
                // Find the handler
                var handler = self.server.method_handlers[msg.method];
                if (!handler) {
                    self.send({
                        msg: 'result',
                        id: msg.id,
                        error: new Meteor.Error(404, `Method '${msg.method}' not found`)
                    });
                    yield fence.arm();
                    return;
                }
                var invocation = new DDPCommon.MethodInvocation({
                    name: msg.method,
                    isSimulation: false,
                    userId: self.userId,
                    setUserId (userId) {
                        return self._setUserId(userId);
                    },
                    unblock: unblock,
                    connection: self.connectionHandle,
                    randomSeed: randomSeed,
                    fence
                });
                const promise = new Promise((resolve, reject)=>{
                    // XXX It'd be better if we could hook into method handlers better but
                    // for now, we need to check if the ddp-rate-limiter exists since we
                    // have a weak requirement for the ddp-rate-limiter package to be added
                    // to our application.
                    if (Package['ddp-rate-limiter']) {
                        var DDPRateLimiter = Package['ddp-rate-limiter'].DDPRateLimiter;
                        var rateLimiterInput = {
                            userId: self.userId,
                            clientAddress: self.connectionHandle.clientAddress,
                            type: "method",
                            name: msg.method,
                            connectionId: self.id
                        };
                        DDPRateLimiter._increment(rateLimiterInput);
                        var rateLimitResult = DDPRateLimiter._check(rateLimiterInput);
                        if (!rateLimitResult.allowed) {
                            reject(new Meteor.Error("too-many-requests", DDPRateLimiter.getErrorMessage(rateLimitResult), {
                                timeToReset: rateLimitResult.timeToReset
                            }));
                            return;
                        }
                    }
                    resolve(DDPServer._CurrentWriteFence.withValue(fence, ()=>DDP._CurrentMethodInvocation.withValue(invocation, ()=>maybeAuditArgumentChecks(handler, invocation, msg.params, "call to '" + msg.method + "'"))));
                });
                function finish() {
                    return _async_to_generator(function*() {
                        yield fence.arm();
                        unblock();
                    })();
                }
                const payload = {
                    msg: "result",
                    id: msg.id
                };
                return promise.then((result)=>_async_to_generator(function*() {
                        yield finish();
                        if (result !== undefined) {
                            payload.result = result;
                        }
                        self.send(payload);
                    })(), (exception)=>_async_to_generator(function*() {
                        yield finish();
                        payload.error = wrapInternalException(exception, `while invoking method '${msg.method}'`);
                        self.send(payload);
                    })());
            }).call(this);
        }
    },
    _eachSub: function(f) {
        var self = this;
        self._namedSubs.forEach(f);
        self._universalSubs.forEach(f);
    },
    _diffCollectionViews: function(beforeCVs) {
        var self = this;
        DiffSequence.diffMaps(beforeCVs, self.collectionViews, {
            both: function(collectionName, leftValue, rightValue) {
                rightValue.diff(leftValue);
            },
            rightOnly: function(collectionName, rightValue) {
                rightValue.documents.forEach(function(docView, id) {
                    self.sendAdded(collectionName, id, docView.getFields());
                });
            },
            leftOnly: function(collectionName, leftValue) {
                leftValue.documents.forEach(function(doc, id) {
                    self.sendRemoved(collectionName, id);
                });
            }
        });
    },
    // Sets the current user id in all appropriate contexts and reruns
    // all subscriptions
    _setUserId (userId) {
        return _async_to_generator(function*() {
            var self = this;
            if (userId !== null && typeof userId !== "string") throw new Error("setUserId must be called on string or null, not " + typeof userId);
            // Prevent newly-created universal subscriptions from being added to our
            // session. They will be found below when we call startUniversalSubs.
            //
            // (We don't have to worry about named subscriptions, because we only add
            // them when we process a 'sub' message. We are currently processing a
            // 'method' message, and the method did not unblock, because it is illegal
            // to call setUserId after unblock. Thus we cannot be concurrently adding a
            // new named subscription).
            self._dontStartNewUniversalSubs = true;
            // Prevent current subs from updating our collectionViews and call their
            // stop callbacks. This may yield.
            self._eachSub(function(sub) {
                sub._deactivate();
            });
            // All subs should now be deactivated. Stop sending messages to the client,
            // save the state of the published collections, reset to an empty view, and
            // update the userId.
            self._isSending = false;
            var beforeCVs = self.collectionViews;
            self.collectionViews = new Map();
            self.userId = userId;
            // _setUserId is normally called from a Meteor method with
            // DDP._CurrentMethodInvocation set. But DDP._CurrentMethodInvocation is not
            // expected to be set inside a publish function, so we temporary unset it.
            // Inside a publish function DDP._CurrentPublicationInvocation is set.
            yield DDP._CurrentMethodInvocation.withValue(undefined, function() {
                return _async_to_generator(function*() {
                    // Save the old named subs, and reset to having no subscriptions.
                    var oldNamedSubs = self._namedSubs;
                    self._namedSubs = new Map();
                    self._universalSubs = [];
                    yield Promise.all([
                        ...oldNamedSubs
                    ].map(([subscriptionId, sub])=>_async_to_generator(function*() {
                            const newSub = sub._recreate();
                            self._namedSubs.set(subscriptionId, newSub);
                            // nb: if the handler throws or calls this.error(), it will in fact
                            // immediately send its 'nosub'. This is OK, though.
                            yield newSub._runHandler();
                        })()));
                    // Allow newly-created universal subs to be started on our connection in
                    // parallel with the ones we're spinning up here, and spin up universal
                    // subs.
                    self._dontStartNewUniversalSubs = false;
                    self.startUniversalSubs();
                })();
            }, {
                name: '_setUserId'
            });
            // Start sending messages again, beginning with the diff from the previous
            // state of the world to the current state. No yields are allowed during
            // this diff, so that other changes cannot interleave.
            Meteor._noYieldsAllowed(function() {
                self._isSending = true;
                self._diffCollectionViews(beforeCVs);
                if (!isEmpty(self._pendingReady)) {
                    self.sendReady(self._pendingReady);
                    self._pendingReady = [];
                }
            });
        }).call(this);
    },
    _startSubscription: function(handler, subId, params, name) {
        var self = this;
        var sub = new Subscription(self, handler, subId, params, name);
        let unblockHander = self.cachedUnblock;
        // _startSubscription may call from a lot places
        // so cachedUnblock might be null in somecases
        // assign the cachedUnblock
        sub.unblock = unblockHander || (()=>{});
        if (subId) self._namedSubs.set(subId, sub);
        else self._universalSubs.push(sub);
        return sub._runHandler();
    },
    // Tear down specified subscription
    _stopSubscription: function(subId, error) {
        var self = this;
        var subName = null;
        if (subId) {
            var maybeSub = self._namedSubs.get(subId);
            if (maybeSub) {
                subName = maybeSub._name;
                maybeSub._removeAllDocuments();
                maybeSub._deactivate();
                self._namedSubs.delete(subId);
            }
        }
        var response = {
            msg: 'nosub',
            id: subId
        };
        if (error) {
            response.error = wrapInternalException(error, subName ? "from sub " + subName + " id " + subId : "from sub id " + subId);
        }
        self.send(response);
    },
    // Tear down all subscriptions. Note that this does NOT send removed or nosub
    // messages, since we assume the client is gone.
    _deactivateAllSubscriptions: function() {
        var self = this;
        self._namedSubs.forEach(function(sub, id) {
            sub._deactivate();
        });
        self._namedSubs = new Map();
        self._universalSubs.forEach(function(sub) {
            sub._deactivate();
        });
        self._universalSubs = [];
    },
    // Determine the remote client's IP address, based on the
    // HTTP_FORWARDED_COUNT environment variable representing how many
    // proxies the server is behind.
    _clientAddress: function() {
        var self = this;
        // For the reported client address for a connection to be correct,
        // the developer must set the HTTP_FORWARDED_COUNT environment
        // variable to an integer representing the number of hops they
        // expect in the `x-forwarded-for` header. E.g., set to "1" if the
        // server is behind one proxy.
        //
        // This could be computed once at startup instead of every time.
        var httpForwardedCount = parseInt(process.env['HTTP_FORWARDED_COUNT']) || 0;
        if (httpForwardedCount === 0) return self.socket.remoteAddress;
        var forwardedFor = self.socket.headers["x-forwarded-for"];
        if (!isString(forwardedFor)) return null;
        forwardedFor = forwardedFor.split(',');
        // Typically the first value in the `x-forwarded-for` header is
        // the original IP address of the client connecting to the first
        // proxy.  However, the end user can easily spoof the header, in
        // which case the first value(s) will be the fake IP address from
        // the user pretending to be a proxy reporting the original IP
        // address value.  By counting HTTP_FORWARDED_COUNT back from the
        // end of the list, we ensure that we get the IP address being
        // reported by *our* first proxy.
        if (httpForwardedCount < 0 || httpForwardedCount !== forwardedFor.length) return null;
        forwardedFor = forwardedFor.map((ip)=>ip.trim());
        return forwardedFor[forwardedFor.length - httpForwardedCount];
    }
});
/******************************************************************************/ /* Subscription                                                               */ /******************************************************************************/ // Ctor for a sub handle: the input to each publish function
// Instance name is this because it's usually referred to as this inside a
// publish
/**
 * @summary The server's side of a subscription
 * @class Subscription
 * @instanceName this
 * @showInstanceName true
 */ var Subscription = function(session, handler, subscriptionId, params, name) {
    var self = this;
    self._session = session; // type is Session
    /**
   * @summary Access inside the publish function. The incoming [connection](#meteor_onconnection) for this subscription.
   * @locus Server
   * @name  connection
   * @memberOf Subscription
   * @instance
   */ self.connection = session.connectionHandle; // public API object
    self._handler = handler;
    // My subscription ID (generated by client, undefined for universal subs).
    self._subscriptionId = subscriptionId;
    // Undefined for universal subs
    self._name = name;
    self._params = params || [];
    // Only named subscriptions have IDs, but we need some sort of string
    // internally to keep track of all subscriptions inside
    // SessionDocumentViews. We use this subscriptionHandle for that.
    if (self._subscriptionId) {
        self._subscriptionHandle = 'N' + self._subscriptionId;
    } else {
        self._subscriptionHandle = 'U' + Random.id();
    }
    // Has _deactivate been called?
    self._deactivated = false;
    // Stop callbacks to g/c this sub.  called w/ zero arguments.
    self._stopCallbacks = [];
    // The set of (collection, documentid) that this subscription has
    // an opinion about.
    self._documents = new Map();
    // Remember if we are ready.
    self._ready = false;
    // Part of the public API: the user of this sub.
    /**
   * @summary Access inside the publish function. The id of the logged-in user, or `null` if no user is logged in.
   * @locus Server
   * @memberOf Subscription
   * @name  userId
   * @instance
   */ self.userId = session.userId;
    // For now, the id filter is going to default to
    // the to/from DDP methods on MongoID, to
    // specifically deal with mongo/minimongo ObjectIds.
    // Later, you will be able to make this be "raw"
    // if you want to publish a collection that you know
    // just has strings for keys and no funny business, to
    // a DDP consumer that isn't minimongo.
    self._idFilter = {
        idStringify: MongoID.idStringify,
        idParse: MongoID.idParse
    };
    Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("livedata", "subscriptions", 1);
};
Object.assign(Subscription.prototype, {
    _runHandler: function() {
        return _async_to_generator(function*() {
            // XXX should we unblock() here? Either before running the publish
            // function, or before running _publishCursor.
            //
            // Right now, each publish function blocks all future publishes and
            // methods waiting on data from Mongo (or whatever else the function
            // blocks on). This probably slows page load in common cases.
            if (!this.unblock) {
                this.unblock = ()=>{};
            }
            const self = this;
            let resultOrThenable = null;
            try {
                resultOrThenable = DDP._CurrentPublicationInvocation.withValue(self, ()=>maybeAuditArgumentChecks(self._handler, self, EJSON.clone(self._params), // It's OK that this would look weird for universal subscriptions,
                    // because they have no arguments so there can never be an
                    // audit-argument-checks failure.
                    "publisher '" + self._name + "'"), {
                    name: self._name
                });
            } catch (e) {
                self.error(e);
                return;
            }
            // Did the handler call this.error or this.stop?
            if (self._isDeactivated()) return;
            // Both conventional and async publish handler functions are supported.
            // If an object is returned with a then() function, it is either a promise
            // or thenable and will be resolved asynchronously.
            const isThenable = resultOrThenable && typeof resultOrThenable.then === 'function';
            if (isThenable) {
                try {
                    yield self._publishHandlerResult((yield resultOrThenable));
                } catch (e) {
                    self.error(e);
                }
            } else {
                yield self._publishHandlerResult(resultOrThenable);
            }
        }).call(this);
    },
    _publishHandlerResult (res) {
        return _async_to_generator(function*() {
            // SPECIAL CASE: Instead of writing their own callbacks that invoke
            // this.added/changed/ready/etc, the user can just return a collection
            // cursor or array of cursors from the publish function; we call their
            // _publishCursor method which starts observing the cursor and publishes the
            // results. Note that _publishCursor does NOT call ready().
            //
            // XXX This uses an undocumented interface which only the Mongo cursor
            // interface publishes. Should we make this interface public and encourage
            // users to implement it themselves? Arguably, it's unnecessary; users can
            // already write their own functions like
            //   var publishMyReactiveThingy = function (name, handler) {
            //     Meteor.publish(name, function () {
            //       var reactiveThingy = handler();
            //       reactiveThingy.publishMe();
            //     });
            //   };
            var self = this;
            var isCursor = function(c) {
                return c && c._publishCursor;
            };
            if (isCursor(res)) {
                try {
                    yield res._publishCursor(self);
                } catch (e) {
                    self.error(e);
                    return;
                }
                // _publishCursor only returns after the initial added callbacks have run.
                // mark subscription as ready.
                self.ready();
            } else if (Array.isArray(res)) {
                // Check all the elements are cursors
                if (!res.every(isCursor)) {
                    self.error(new Error("Publish function returned an array of non-Cursors"));
                    return;
                }
                // Find duplicate collection names
                // XXX we should support overlapping cursors, but that would require the
                // merge box to allow overlap within a subscription
                var collectionNames = {};
                for(var i = 0; i < res.length; ++i){
                    var collectionName = res[i]._getCollectionName();
                    if (collectionNames[collectionName]) {
                        self.error(new Error("Publish function returned multiple cursors for collection " + collectionName));
                        return;
                    }
                    collectionNames[collectionName] = true;
                }
                try {
                    yield Promise.all(res.map((cur)=>cur._publishCursor(self)));
                } catch (e) {
                    self.error(e);
                    return;
                }
                self.ready();
            } else if (res) {
                // Truthy values other than cursors or arrays are probably a
                // user mistake (possible returning a Mongo document via, say,
                // `coll.findOne()`).
                self.error(new Error("Publish function can only return a Cursor or " + "an array of Cursors"));
            }
        }).call(this);
    },
    // This calls all stop callbacks and prevents the handler from updating any
    // SessionCollectionViews further. It's used when the user unsubscribes or
    // disconnects, as well as during setUserId re-runs. It does *NOT* send
    // removed messages for the published objects; if that is necessary, call
    // _removeAllDocuments first.
    _deactivate: function() {
        var self = this;
        if (self._deactivated) return;
        self._deactivated = true;
        self._callStopCallbacks();
        Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("livedata", "subscriptions", -1);
    },
    _callStopCallbacks: function() {
        var self = this;
        // Tell listeners, so they can clean up
        var callbacks = self._stopCallbacks;
        self._stopCallbacks = [];
        callbacks.forEach(function(callback) {
            callback();
        });
    },
    // Send remove messages for every document.
    _removeAllDocuments: function() {
        var self = this;
        Meteor._noYieldsAllowed(function() {
            self._documents.forEach(function(collectionDocs, collectionName) {
                collectionDocs.forEach(function(strId) {
                    self.removed(collectionName, self._idFilter.idParse(strId));
                });
            });
        });
    },
    // Returns a new Subscription for the same session with the same
    // initial creation parameters. This isn't a clone: it doesn't have
    // the same _documents cache, stopped state or callbacks; may have a
    // different _subscriptionHandle, and gets its userId from the
    // session, not from this object.
    _recreate: function() {
        var self = this;
        return new Subscription(self._session, self._handler, self._subscriptionId, self._params, self._name);
    },
    /**
   * @summary Call inside the publish function.  Stops this client's subscription, triggering a call on the client to the `onStop` callback passed to [`Meteor.subscribe`](#meteor_subscribe), if any. If `error` is not a [`Meteor.Error`](#meteor_error), it will be [sanitized](#meteor_error).
   * @locus Server
   * @param {Error} error The error to pass to the client.
   * @instance
   * @memberOf Subscription
   */ error: function(error) {
        var self = this;
        if (self._isDeactivated()) return;
        self._session._stopSubscription(self._subscriptionId, error);
    },
    // Note that while our DDP client will notice that you've called stop() on the
    // server (and clean up its _subscriptions table) we don't actually provide a
    // mechanism for an app to notice this (the subscribe onError callback only
    // triggers if there is an error).
    /**
   * @summary Call inside the publish function.  Stops this client's subscription and invokes the client's `onStop` callback with no error.
   * @locus Server
   * @instance
   * @memberOf Subscription
   */ stop: function() {
        var self = this;
        if (self._isDeactivated()) return;
        self._session._stopSubscription(self._subscriptionId);
    },
    /**
   * @summary Call inside the publish function.  Registers a callback function to run when the subscription is stopped.
   * @locus Server
   * @memberOf Subscription
   * @instance
   * @param {Function} func The callback function
   */ onStop: function(callback) {
        var self = this;
        callback = Meteor.bindEnvironment(callback, 'onStop callback', self);
        if (self._isDeactivated()) callback();
        else self._stopCallbacks.push(callback);
    },
    // This returns true if the sub has been deactivated, *OR* if the session was
    // destroyed but the deferred call to _deactivateAllSubscriptions hasn't
    // happened yet.
    _isDeactivated: function() {
        var self = this;
        return self._deactivated || self._session.inQueue === null;
    },
    /**
   * @summary Call inside the publish function.  Informs the subscriber that a document has been added to the record set.
   * @locus Server
   * @memberOf Subscription
   * @instance
   * @param {String} collection The name of the collection that contains the new document.
   * @param {String} id The new document's ID.
   * @param {Object} fields The fields in the new document.  If `_id` is present it is ignored.
   */ added (collectionName, id, fields) {
        if (this._isDeactivated()) return;
        id = this._idFilter.idStringify(id);
        if (this._session.server.getPublicationStrategy(collectionName).doAccountingForCollection) {
            let ids = this._documents.get(collectionName);
            if (ids == null) {
                ids = new Set();
                this._documents.set(collectionName, ids);
            }
            ids.add(id);
        }
        this._session.added(this._subscriptionHandle, collectionName, id, fields);
    },
    /**
   * @summary Call inside the publish function.  Informs the subscriber that a document in the record set has been modified.
   * @locus Server
   * @memberOf Subscription
   * @instance
   * @param {String} collection The name of the collection that contains the changed document.
   * @param {String} id The changed document's ID.
   * @param {Object} fields The fields in the document that have changed, together with their new values.  If a field is not present in `fields` it was left unchanged; if it is present in `fields` and has a value of `undefined` it was removed from the document.  If `_id` is present it is ignored.
   */ changed (collectionName, id, fields) {
        if (this._isDeactivated()) return;
        id = this._idFilter.idStringify(id);
        this._session.changed(this._subscriptionHandle, collectionName, id, fields);
    },
    /**
   * @summary Call inside the publish function.  Informs the subscriber that a document has been removed from the record set.
   * @locus Server
   * @memberOf Subscription
   * @instance
   * @param {String} collection The name of the collection that the document has been removed from.
   * @param {String} id The ID of the document that has been removed.
   */ removed (collectionName, id) {
        if (this._isDeactivated()) return;
        id = this._idFilter.idStringify(id);
        if (this._session.server.getPublicationStrategy(collectionName).doAccountingForCollection) {
            // We don't bother to delete sets of things in a collection if the
            // collection is empty.  It could break _removeAllDocuments.
            this._documents.get(collectionName).delete(id);
        }
        this._session.removed(this._subscriptionHandle, collectionName, id);
    },
    /**
   * @summary Call inside the publish function.  Informs the subscriber that an initial, complete snapshot of the record set has been sent.  This will trigger a call on the client to the `onReady` callback passed to  [`Meteor.subscribe`](#meteor_subscribe), if any.
   * @locus Server
   * @memberOf Subscription
   * @instance
   */ ready: function() {
        var self = this;
        if (self._isDeactivated()) return;
        if (!self._subscriptionId) return; // Unnecessary but ignored for universal sub
        if (!self._ready) {
            self._session.sendReady([
                self._subscriptionId
            ]);
            self._ready = true;
        }
    }
});
/******************************************************************************/ /* Server                                                                     */ /******************************************************************************/ Server = function(options = {}) {
    var self = this;
    // The default heartbeat interval is 30 seconds on the server and 35
    // seconds on the client.  Since the client doesn't need to send a
    // ping as long as it is receiving pings, this means that pings
    // normally go from the server to the client.
    //
    // Note: Troposphere depends on the ability to mutate
    // Meteor.server.options.heartbeatTimeout! This is a hack, but it's life.
    self.options = _object_spread({
        heartbeatInterval: 15000,
        heartbeatTimeout: 15000,
        // For testing, allow responding to pings to be disabled.
        respondToPings: true,
        defaultPublicationStrategy: publicationStrategies.SERVER_MERGE
    }, options);
    // Map of callbacks to call when a new connection comes in to the
    // server and completes DDP version negotiation. Use an object instead
    // of an array so we can safely remove one from the list while
    // iterating over it.
    self.onConnectionHook = new Hook({
        debugPrintExceptions: "onConnection callback"
    });
    // Map of callbacks to call when a new message comes in.
    self.onMessageHook = new Hook({
        debugPrintExceptions: "onMessage callback"
    });
    self.publish_handlers = {};
    self.universal_publish_handlers = [];
    self.method_handlers = {};
    self._publicationStrategies = {};
    self.sessions = new Map(); // map from id to session
    self.stream_server = new StreamServer();
    self.stream_server.register(function(socket) {
        // socket implements the SockJSConnection interface
        socket._meteorSession = null;
        var sendError = function(reason, offendingMessage) {
            var msg = {
                msg: 'error',
                reason: reason
            };
            if (offendingMessage) msg.offendingMessage = offendingMessage;
            socket.send(DDPCommon.stringifyDDP(msg));
        };
        socket.on('data', function(raw_msg) {
            if (Meteor._printReceivedDDP) {
                Meteor._debug("Received DDP", raw_msg);
            }
            try {
                try {
                    var msg = DDPCommon.parseDDP(raw_msg);
                } catch (err) {
                    sendError('Parse error');
                    return;
                }
                if (msg === null || !msg.msg) {
                    sendError('Bad request', msg);
                    return;
                }
                if (msg.msg === 'connect') {
                    if (socket._meteorSession) {
                        sendError("Already connected", msg);
                        return;
                    }
                    self._handleConnect(socket, msg);
                    return;
                }
                if (!socket._meteorSession) {
                    sendError('Must connect first', msg);
                    return;
                }
                socket._meteorSession.processMessage(msg);
            } catch (e) {
                // XXX print stack nicely
                Meteor._debug("Internal exception while processing message", msg, e);
            }
        });
        socket.on('close', function() {
            if (socket._meteorSession) {
                socket._meteorSession.close();
            }
        });
    });
};
Object.assign(Server.prototype, {
    /**
   * @summary Register a callback to be called when a new DDP connection is made to the server.
   * @locus Server
   * @param {function} callback The function to call when a new DDP connection is established.
   * @memberOf Meteor
   * @importFromPackage meteor
   */ onConnection: function(fn) {
        var self = this;
        return self.onConnectionHook.register(fn);
    },
    /**
   * @summary Set publication strategy for the given collection. Publications strategies are available from `DDPServer.publicationStrategies`. You call this method from `Meteor.server`, like `Meteor.server.setPublicationStrategy()`
   * @locus Server
   * @alias setPublicationStrategy
   * @param collectionName {String}
   * @param strategy {{useCollectionView: boolean, doAccountingForCollection: boolean}}
   * @memberOf Meteor.server
   * @importFromPackage meteor
   */ setPublicationStrategy (collectionName, strategy) {
        if (!Object.values(publicationStrategies).includes(strategy)) {
            throw new Error(`Invalid merge strategy: ${strategy} 
        for collection ${collectionName}`);
        }
        this._publicationStrategies[collectionName] = strategy;
    },
    /**
   * @summary Gets the publication strategy for the requested collection. You call this method from `Meteor.server`, like `Meteor.server.getPublicationStrategy()`
   * @locus Server
   * @alias getPublicationStrategy
   * @param collectionName {String}
   * @memberOf Meteor.server
   * @importFromPackage meteor
   * @return {{useCollectionView: boolean, doAccountingForCollection: boolean}}
   */ getPublicationStrategy (collectionName) {
        return this._publicationStrategies[collectionName] || this.options.defaultPublicationStrategy;
    },
    /**
   * @summary Register a callback to be called when a new DDP message is received.
   * @locus Server
   * @param {function} callback The function to call when a new DDP message is received.
   * @memberOf Meteor
   * @importFromPackage meteor
   */ onMessage: function(fn) {
        var self = this;
        return self.onMessageHook.register(fn);
    },
    _handleConnect: function(socket, msg) {
        var self = this;
        // The connect message must specify a version and an array of supported
        // versions, and it must claim to support what it is proposing.
        if (!(typeof msg.version === 'string' && Array.isArray(msg.support) && msg.support.every(isString) && msg.support.includes(msg.version))) {
            socket.send(DDPCommon.stringifyDDP({
                msg: 'failed',
                version: DDPCommon.SUPPORTED_DDP_VERSIONS[0]
            }));
            socket.close();
            return;
        }
        // In the future, handle session resumption: something like:
        //  socket._meteorSession = self.sessions[msg.session]
        var version = calculateVersion(msg.support, DDPCommon.SUPPORTED_DDP_VERSIONS);
        if (msg.version !== version) {
            // The best version to use (according to the client's stated preferences)
            // is not the one the client is trying to use. Inform them about the best
            // version to use.
            socket.send(DDPCommon.stringifyDDP({
                msg: 'failed',
                version: version
            }));
            socket.close();
            return;
        }
        // Yay, version matches! Create a new session.
        // Note: Troposphere depends on the ability to mutate
        // Meteor.server.options.heartbeatTimeout! This is a hack, but it's life.
        socket._meteorSession = new Session(self, version, socket, self.options);
        self.sessions.set(socket._meteorSession.id, socket._meteorSession);
        self.onConnectionHook.each(function(callback) {
            if (socket._meteorSession) callback(socket._meteorSession.connectionHandle);
            return true;
        });
    },
    /**
   * Register a publish handler function.
   *
   * @param name {String} identifier for query
   * @param handler {Function} publish handler
   * @param options {Object}
   *
   * Server will call handler function on each new subscription,
   * either when receiving DDP sub message for a named subscription, or on
   * DDP connect for a universal subscription.
   *
   * If name is null, this will be a subscription that is
   * automatically established and permanently on for all connected
   * client, instead of a subscription that can be turned on and off
   * with subscribe().
   *
   * options to contain:
   *  - (mostly internal) is_auto: true if generated automatically
   *    from an autopublish hook. this is for cosmetic purposes only
   *    (it lets us determine whether to print a warning suggesting
   *    that you turn off autopublish).
   */ /**
   * @summary Publish a record set.
   * @memberOf Meteor
   * @importFromPackage meteor
   * @locus Server
   * @param {String|Object} name If String, name of the record set.  If Object, publications Dictionary of publish functions by name.  If `null`, the set has no name, and the record set is automatically sent to all connected clients.
   * @param {Function} func Function called on the server each time a client subscribes.  Inside the function, `this` is the publish handler object, described below.  If the client passed arguments to `subscribe`, the function is called with the same arguments.
   */ publish: function(name, handler, options) {
        var self = this;
        if (!isObject(name)) {
            options = options || {};
            if (name && name in self.publish_handlers) {
                Meteor._debug("Ignoring duplicate publish named '" + name + "'");
                return;
            }
            if (Package.autopublish && !options.is_auto) {
                // They have autopublish on, yet they're trying to manually
                // pick stuff to publish. They probably should turn off
                // autopublish. (This check isn't perfect -- if you create a
                // publish before you turn on autopublish, it won't catch
                // it, but this will definitely handle the simple case where
                // you've added the autopublish package to your app, and are
                // calling publish from your app code).
                if (!self.warned_about_autopublish) {
                    self.warned_about_autopublish = true;
                    Meteor._debug("** You've set up some data subscriptions with Meteor.publish(), but\n" + "** you still have autopublish turned on. Because autopublish is still\n" + "** on, your Meteor.publish() calls won't have much effect. All data\n" + "** will still be sent to all clients.\n" + "**\n" + "** Turn off autopublish by removing the autopublish package:\n" + "**\n" + "**   $ meteor remove autopublish\n" + "**\n" + "** .. and make sure you have Meteor.publish() and Meteor.subscribe() calls\n" + "** for each collection that you want clients to see.\n");
                }
            }
            if (name) self.publish_handlers[name] = handler;
            else {
                self.universal_publish_handlers.push(handler);
                // Spin up the new publisher on any existing session too. Run each
                // session's subscription in a new Fiber, so that there's no change for
                // self.sessions to change while we're running this loop.
                self.sessions.forEach(function(session) {
                    if (!session._dontStartNewUniversalSubs) {
                        session._startSubscription(handler);
                    }
                });
            }
        } else {
            Object.entries(name).forEach(function([key, value]) {
                self.publish(key, value, {});
            });
        }
    },
    _removeSession: function(session) {
        var self = this;
        self.sessions.delete(session.id);
    },
    /**
   * @summary Tells if the method call came from a call or a callAsync.
   * @locus Anywhere
   * @memberOf Meteor
   * @importFromPackage meteor
   * @returns boolean
   */ isAsyncCall: function() {
        return DDP._CurrentMethodInvocation._isCallAsyncMethodRunning();
    },
    /**
   * @summary Defines functions that can be invoked over the network by clients.
   * @locus Anywhere
   * @param {Object} methods Dictionary whose keys are method names and values are functions.
   * @memberOf Meteor
   * @importFromPackage meteor
   */ methods: function(methods) {
        var self = this;
        Object.entries(methods).forEach(function([name, func]) {
            if (typeof func !== 'function') throw new Error("Method '" + name + "' must be a function");
            if (self.method_handlers[name]) throw new Error("A method named '" + name + "' is already defined");
            self.method_handlers[name] = func;
        });
    },
    call: function(name, ...args) {
        if (args.length && typeof args[args.length - 1] === "function") {
            // If it's a function, the last argument is the result callback, not
            // a parameter to the remote method.
            var callback = args.pop();
        }
        return this.apply(name, args, callback);
    },
    // A version of the call method that always returns a Promise.
    callAsync: function(name, ...args) {
        var _args_;
        const options = ((_args_ = args[0]) === null || _args_ === void 0 ? void 0 : _args_.hasOwnProperty('returnStubValue')) ? args.shift() : {};
        DDP._CurrentMethodInvocation._setCallAsyncMethodRunning(true);
        const promise = new Promise((resolve, reject)=>{
            DDP._CurrentCallAsyncInvocation._set({
                name,
                hasCallAsyncParent: true
            });
            this.applyAsync(name, args, _object_spread({
                isFromCallAsync: true
            }, options)).then(resolve).catch(reject).finally(()=>{
                DDP._CurrentCallAsyncInvocation._set();
            });
        });
        return promise.finally(()=>DDP._CurrentMethodInvocation._setCallAsyncMethodRunning(false));
    },
    apply: function(name, args, options, callback) {
        // We were passed 3 arguments. They may be either (name, args, options)
        // or (name, args, callback)
        if (!callback && typeof options === 'function') {
            callback = options;
            options = {};
        } else {
            options = options || {};
        }
        const promise = this.applyAsync(name, args, options);
        // Return the result in whichever way the caller asked for it. Note that we
        // do NOT block on the write fence in an analogous way to how the client
        // blocks on the relevant data being visible, so you are NOT guaranteed that
        // cursor observe callbacks have fired when your callback is invoked. (We
        // can change this if there's a real use case).
        if (callback) {
            promise.then((result)=>callback(undefined, result), (exception)=>callback(exception));
        } else {
            return promise;
        }
    },
    // @param options {Optional Object}
    applyAsync: function(name, args, options) {
        // Run the handler
        var handler = this.method_handlers[name];
        if (!handler) {
            return Promise.reject(new Meteor.Error(404, `Method '${name}' not found`));
        }
        // If this is a method call from within another method or publish function,
        // get the user state from the outer method or publish function, otherwise
        // don't allow setUserId to be called
        var userId = null;
        let setUserId = ()=>{
            throw new Error("Can't call setUserId on a server initiated method call");
        };
        var connection = null;
        var currentMethodInvocation = DDP._CurrentMethodInvocation.get();
        var currentPublicationInvocation = DDP._CurrentPublicationInvocation.get();
        var randomSeed = null;
        if (currentMethodInvocation) {
            userId = currentMethodInvocation.userId;
            setUserId = (userId)=>currentMethodInvocation.setUserId(userId);
            connection = currentMethodInvocation.connection;
            randomSeed = DDPCommon.makeRpcSeed(currentMethodInvocation, name);
        } else if (currentPublicationInvocation) {
            userId = currentPublicationInvocation.userId;
            setUserId = (userId)=>currentPublicationInvocation._session._setUserId(userId);
            connection = currentPublicationInvocation.connection;
        }
        var invocation = new DDPCommon.MethodInvocation({
            isSimulation: false,
            userId,
            setUserId,
            connection,
            randomSeed
        });
        return new Promise((resolve, reject)=>{
            let result;
            try {
                result = DDP._CurrentMethodInvocation.withValue(invocation, ()=>maybeAuditArgumentChecks(handler, invocation, EJSON.clone(args), "internal call to '" + name + "'"));
            } catch (e) {
                return reject(e);
            }
            if (!Meteor._isPromise(result)) {
                return resolve(result);
            }
            result.then((r)=>resolve(r)).catch(reject);
        }).then(EJSON.clone);
    },
    _urlForSession: function(sessionId) {
        var self = this;
        var session = self.sessions.get(sessionId);
        if (session) return session._socketUrl;
        else return null;
    }
});
var calculateVersion = function(clientSupportedVersions, serverSupportedVersions) {
    var correctVersion = clientSupportedVersions.find(function(version) {
        return serverSupportedVersions.includes(version);
    });
    if (!correctVersion) {
        correctVersion = serverSupportedVersions[0];
    }
    return correctVersion;
};
DDPServer._calculateVersion = calculateVersion;
// "blind" exceptions other than those that were deliberately thrown to signal
// errors to the client
var wrapInternalException = function(exception, context) {
    if (!exception) return exception;
    // To allow packages to throw errors intended for the client but not have to
    // depend on the Meteor.Error class, `isClientSafe` can be set to true on any
    // error before it is thrown.
    if (exception.isClientSafe) {
        if (!(exception instanceof Meteor.Error)) {
            const originalMessage = exception.message;
            exception = new Meteor.Error(exception.error, exception.reason, exception.details);
            exception.message = originalMessage;
        }
        return exception;
    }
    // Tests can set the '_expectedByTest' flag on an exception so it won't go to
    // the server log.
    if (!exception._expectedByTest) {
        Meteor._debug("Exception " + context, exception.stack);
        if (exception.sanitizedError) {
            Meteor._debug("Sanitized and reported to the client as:", exception.sanitizedError);
            Meteor._debug();
        }
    }
    // Did the error contain more details that could have been useful if caught in
    // server code (or if thrown from non-client-originated code), but also
    // provided a "sanitized" version with more context than 500 Internal server error? Use that.
    if (exception.sanitizedError) {
        if (exception.sanitizedError.isClientSafe) return exception.sanitizedError;
        Meteor._debug("Exception " + context + " provides a sanitizedError that " + "does not have isClientSafe property set; ignoring");
    }
    return new Meteor.Error(500, "Internal server error");
};
// Audit argument checks, if the audit-argument-checks package exists (it is a
// weak dependency of this package).
var maybeAuditArgumentChecks = function(f, context, args, description) {
    args = args || [];
    if (Package['audit-argument-checks']) {
        return Match._failIfArgumentsAreNotAllChecked(f, context, args, description);
    }
    return f.apply(context, args);
};
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"writefence.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-server/writefence.js                                                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
DDPServer._WriteFence = class {
    beginWrite() {
        if (this.retired) {
            return {
                committed: ()=>{}
            };
        }
        if (this.fired) {
            throw new Error("fence has already activated -- too late to add writes");
        }
        this.outstanding_writes++;
        let committed = false;
        return {
            committed: ()=>_async_to_generator(function*() {
                    if (committed) {
                        throw new Error("committed called twice on the same write");
                    }
                    committed = true;
                    this.outstanding_writes--;
                    yield this._maybeFire();
                }).call(this)
        };
    }
    arm() {
        if (this === DDPServer._getCurrentFence()) {
            throw Error("Can't arm the current fence");
        }
        this.armed = true;
        return this._maybeFire();
    }
    onBeforeFire(func) {
        if (this.fired) {
            throw new Error("fence has already activated -- too late to add a callback");
        }
        this.before_fire_callbacks.push(func);
    }
    onAllCommitted(func) {
        if (this.fired) {
            throw new Error("fence has already activated -- too late to add a callback");
        }
        this.completion_callbacks.push(func);
    }
    _armAndWait() {
        return _async_to_generator(function*() {
            let resolver;
            const returnValue = new Promise((r)=>resolver = r);
            this.onAllCommitted(resolver);
            yield this.arm();
            return returnValue;
        }).call(this);
    }
    armAndWait() {
        return this._armAndWait();
    }
    _maybeFire() {
        return _async_to_generator(function*() {
            if (this.fired) {
                throw new Error("write fence already activated?");
            }
            if (!this.armed || this.outstanding_writes > 0) {
                return;
            }
            const invokeCallback = (func)=>_async_to_generator(function*() {
                    try {
                        yield func(this);
                    } catch (err) {
                        Meteor._debug("exception in write fence callback:", err);
                    }
                }).call(this);
            this.outstanding_writes++;
            // Process all before_fire callbacks in parallel
            const beforeCallbacks = [
                ...this.before_fire_callbacks
            ];
            this.before_fire_callbacks = [];
            yield Promise.all(beforeCallbacks.map((cb)=>invokeCallback(cb)));
            this.outstanding_writes--;
            if (this.outstanding_writes === 0) {
                this.fired = true;
                // Process all completion callbacks in parallel
                const callbacks = [
                    ...this.completion_callbacks
                ];
                this.completion_callbacks = [];
                yield Promise.all(callbacks.map((cb)=>invokeCallback(cb)));
            }
        }).call(this);
    }
    retire() {
        if (!this.fired) {
            throw new Error("Can't retire a fence that hasn't fired.");
        }
        this.retired = true;
    }
    constructor(){
        this.armed = false;
        this.fired = false;
        this.retired = false;
        this.outstanding_writes = 0;
        this.before_fire_callbacks = [];
        this.completion_callbacks = [];
    }
};
DDPServer._CurrentWriteFence = new Meteor.EnvironmentVariable;
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"crossbar.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-server/crossbar.js                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();// A "crossbar" is a class that provides structured notification registration.
// See _match for the definition of how a notification matches a trigger.
// All notifications and triggers must have a string key named 'collection'.

DDPServer._Crossbar = function(options) {
    var self = this;
    options = options || {};
    self.nextId = 1;
    // map from collection name (string) -> listener id -> object. each object has
    // keys 'trigger', 'callback'.  As a hack, the empty string means "no
    // collection".
    self.listenersByCollection = {};
    self.listenersByCollectionCount = {};
    self.factPackage = options.factPackage || "livedata";
    self.factName = options.factName || null;
};
Object.assign(DDPServer._Crossbar.prototype, {
    // msg is a trigger or a notification
    _collectionForMessage: function(msg) {
        var self = this;
        if (!('collection' in msg)) {
            return '';
        } else if (typeof msg.collection === 'string') {
            if (msg.collection === '') throw Error("Message has empty collection!");
            return msg.collection;
        } else {
            throw Error("Message has non-string collection!");
        }
    },
    // Listen for notification that match 'trigger'. A notification
    // matches if it has the key-value pairs in trigger as a
    // subset. When a notification matches, call 'callback', passing
    // the actual notification.
    //
    // Returns a listen handle, which is an object with a method
    // stop(). Call stop() to stop listening.
    //
    // XXX It should be legal to call fire() from inside a listen()
    // callback?
    listen: function(trigger, callback) {
        var self = this;
        var id = self.nextId++;
        var collection = self._collectionForMessage(trigger);
        var record = {
            trigger: EJSON.clone(trigger),
            callback: callback
        };
        if (!(collection in self.listenersByCollection)) {
            self.listenersByCollection[collection] = {};
            self.listenersByCollectionCount[collection] = 0;
        }
        self.listenersByCollection[collection][id] = record;
        self.listenersByCollectionCount[collection]++;
        if (self.factName && Package['facts-base']) {
            Package['facts-base'].Facts.incrementServerFact(self.factPackage, self.factName, 1);
        }
        return {
            stop: function() {
                if (self.factName && Package['facts-base']) {
                    Package['facts-base'].Facts.incrementServerFact(self.factPackage, self.factName, -1);
                }
                delete self.listenersByCollection[collection][id];
                self.listenersByCollectionCount[collection]--;
                if (self.listenersByCollectionCount[collection] === 0) {
                    delete self.listenersByCollection[collection];
                    delete self.listenersByCollectionCount[collection];
                }
            }
        };
    },
    // Fire the provided 'notification' (an object whose attribute
    // values are all JSON-compatibile) -- inform all matching listeners
    // (registered with listen()).
    //
    // If fire() is called inside a write fence, then each of the
    // listener callbacks will be called inside the write fence as well.
    //
    // The listeners may be invoked in parallel, rather than serially.
    fire: function(notification) {
        return _async_to_generator(function*() {
            var self = this;
            var collection = self._collectionForMessage(notification);
            if (!(collection in self.listenersByCollection)) {
                return;
            }
            var listenersForCollection = self.listenersByCollection[collection];
            var callbackIds = [];
            Object.entries(listenersForCollection).forEach(function([id, l]) {
                if (self._matches(notification, l.trigger)) {
                    callbackIds.push(id);
                }
            });
            // Listener callbacks can yield, so we need to first find all the ones that
            // match in a single iteration over self.listenersByCollection (which can't
            // be mutated during this iteration), and then invoke the matching
            // callbacks, checking before each call to ensure they haven't stopped.
            // Note that we don't have to check that
            // self.listenersByCollection[collection] still === listenersForCollection,
            // because the only way that stops being true is if listenersForCollection
            // first gets reduced down to the empty object (and then never gets
            // increased again).
            for (const id of callbackIds){
                if (id in listenersForCollection) {
                    yield listenersForCollection[id].callback(notification);
                }
            }
        }).call(this);
    },
    // A notification matches a trigger if all keys that exist in both are equal.
    //
    // Examples:
    //  N:{collection: "C"} matches T:{collection: "C"}
    //    (a non-targeted write to a collection matches a
    //     non-targeted query)
    //  N:{collection: "C", id: "X"} matches T:{collection: "C"}
    //    (a targeted write to a collection matches a non-targeted query)
    //  N:{collection: "C"} matches T:{collection: "C", id: "X"}
    //    (a non-targeted write to a collection matches a
    //     targeted query)
    //  N:{collection: "C", id: "X"} matches T:{collection: "C", id: "X"}
    //    (a targeted write to a collection matches a targeted query targeted
    //     at the same document)
    //  N:{collection: "C", id: "X"} does not match T:{collection: "C", id: "Y"}
    //    (a targeted write to a collection does not match a targeted query
    //     targeted at a different document)
    _matches: function(notification, trigger) {
        // Most notifications that use the crossbar have a string `collection` and
        // maybe an `id` that is a string or ObjectID. We're already dividing up
        // triggers by collection, but let's fast-track "nope, different ID" (and
        // avoid the overly generic EJSON.equals). This makes a noticeable
        // performance difference; see https://github.com/meteor/meteor/pull/3697
        if (typeof notification.id === 'string' && typeof trigger.id === 'string' && notification.id !== trigger.id) {
            return false;
        }
        if (notification.id instanceof MongoID.ObjectID && trigger.id instanceof MongoID.ObjectID && !notification.id.equals(trigger.id)) {
            return false;
        }
        return Object.keys(trigger).every(function(key) {
            return !(key in notification) || EJSON.equals(trigger[key], notification[key]);
        });
    }
});
// The "invalidation crossbar" is a specific instance used by the DDP server to
// implement write fence notifications. Listener callbacks on this crossbar
// should call beginWrite on the current write fence before they return, if they
// want to delay the write fence from firing (ie, the DDP method-data-updated
// message from being sent).
DDPServer._InvalidationCrossbar = new DDPServer._Crossbar({
    factName: "invalidation-crossbar-listeners"
});
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"server_convenience.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-server/server_convenience.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
if (process.env.DDP_DEFAULT_CONNECTION_URL) {
    __meteor_runtime_config__.DDP_DEFAULT_CONNECTION_URL = process.env.DDP_DEFAULT_CONNECTION_URL;
}
Meteor.server = new Server();
Meteor.refresh = function(notification) {
    return _async_to_generator(function*() {
        yield DDPServer._InvalidationCrossbar.fire(notification);
    })();
};
// Proxy the public methods of Meteor.server so they can
// be called directly on Meteor.
[
    'publish',
    'isAsyncCall',
    'methods',
    'call',
    'callAsync',
    'apply',
    'applyAsync',
    'onConnection',
    'onMessage'
].forEach(function(name) {
    Meteor[name] = Meteor.server[name].bind(Meteor.server);
});
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"dummy_document_view.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-server/dummy_document_view.ts                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({DummyDocumentView:()=>DummyDocumentView});let _define_property;module.link("@swc/helpers/_/_define_property",{_(v){_define_property=v}},0);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
class DummyDocumentView {
    getFields() {
        return {};
    }
    clearField(subscriptionHandle, key, changeCollector) {
        changeCollector[key] = undefined;
    }
    changeField(subscriptionHandle, key, value, changeCollector, isAdd) {
        changeCollector[key] = value;
    }
    constructor(){
        _define_property(this, "existsIn", void 0);
        _define_property(this, "dataByKey", void 0);
        this.existsIn = new Set(); // set of subscriptionHandle
        this.dataByKey = new Map(); // key-> [ {subscriptionHandle, value} by precedence]
    }
}
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"session_collection_view.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-server/session_collection_view.ts                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({SessionCollectionView:()=>SessionCollectionView});let _define_property;module.link("@swc/helpers/_/_define_property",{_(v){_define_property=v}},0);let DummyDocumentView;module.link("./dummy_document_view",{DummyDocumentView(v){DummyDocumentView=v}},1);let SessionDocumentView;module.link("./session_document_view",{SessionDocumentView(v){SessionDocumentView=v}},2);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();


class SessionCollectionView {
    isEmpty() {
        return this.documents.size === 0;
    }
    diff(previous) {
        DiffSequence.diffMaps(previous.documents, this.documents, {
            both: this.diffDocument.bind(this),
            rightOnly: (id, nowDV)=>{
                this.callbacks.added(this.collectionName, id, nowDV.getFields());
            },
            leftOnly: (id, prevDV)=>{
                this.callbacks.removed(this.collectionName, id);
            }
        });
    }
    diffDocument(id, prevDV, nowDV) {
        const fields = {};
        DiffSequence.diffObjects(prevDV.getFields(), nowDV.getFields(), {
            both: (key, prev, now)=>{
                if (!EJSON.equals(prev, now)) {
                    fields[key] = now;
                }
            },
            rightOnly: (key, now)=>{
                fields[key] = now;
            },
            leftOnly: (key, prev)=>{
                fields[key] = undefined;
            }
        });
        this.callbacks.changed(this.collectionName, id, fields);
    }
    added(subscriptionHandle, id, fields) {
        let docView = this.documents.get(id);
        let added = false;
        if (!docView) {
            added = true;
            if (Meteor.server.getPublicationStrategy(this.collectionName).useDummyDocumentView) {
                docView = new DummyDocumentView();
            } else {
                docView = new SessionDocumentView();
            }
            this.documents.set(id, docView);
        }
        docView.existsIn.add(subscriptionHandle);
        const changeCollector = {};
        Object.entries(fields).forEach(([key, value])=>{
            docView.changeField(subscriptionHandle, key, value, changeCollector, true);
        });
        if (added) {
            this.callbacks.added(this.collectionName, id, changeCollector);
        } else {
            this.callbacks.changed(this.collectionName, id, changeCollector);
        }
    }
    changed(subscriptionHandle, id, changed) {
        const changedResult = {};
        const docView = this.documents.get(id);
        if (!docView) {
            throw new Error(`Could not find element with id ${id} to change`);
        }
        Object.entries(changed).forEach(([key, value])=>{
            if (value === undefined) {
                docView.clearField(subscriptionHandle, key, changedResult);
            } else {
                docView.changeField(subscriptionHandle, key, value, changedResult);
            }
        });
        this.callbacks.changed(this.collectionName, id, changedResult);
    }
    removed(subscriptionHandle, id) {
        const docView = this.documents.get(id);
        if (!docView) {
            throw new Error(`Removed nonexistent document ${id}`);
        }
        docView.existsIn.delete(subscriptionHandle);
        if (docView.existsIn.size === 0) {
            // it is gone from everyone
            this.callbacks.removed(this.collectionName, id);
            this.documents.delete(id);
        } else {
            const changed = {};
            // remove this subscription from every precedence list
            // and record the changes
            docView.dataByKey.forEach((precedenceList, key)=>{
                docView.clearField(subscriptionHandle, key, changed);
            });
            this.callbacks.changed(this.collectionName, id, changed);
        }
    }
    /**
   * Represents a client's view of a single collection
   * @param collectionName - Name of the collection it represents
   * @param sessionCallbacks - The callbacks for added, changed, removed
   */ constructor(collectionName, sessionCallbacks){
        _define_property(this, "collectionName", void 0);
        _define_property(this, "documents", void 0);
        _define_property(this, "callbacks", void 0);
        this.collectionName = collectionName;
        this.documents = new Map();
        this.callbacks = sessionCallbacks;
    }
}
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"session_document_view.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-server/session_document_view.ts                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({SessionDocumentView:()=>SessionDocumentView});let _define_property;module.link("@swc/helpers/_/_define_property",{_(v){_define_property=v}},0);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
class SessionDocumentView {
    getFields() {
        const ret = {};
        this.dataByKey.forEach((precedenceList, key)=>{
            ret[key] = precedenceList[0].value;
        });
        return ret;
    }
    clearField(subscriptionHandle, key, changeCollector) {
        // Publish API ignores _id if present in fields
        if (key === "_id") return;
        const precedenceList = this.dataByKey.get(key);
        // It's okay to clear fields that didn't exist. No need to throw
        // an error.
        if (!precedenceList) return;
        let removedValue = undefined;
        for(let i = 0; i < precedenceList.length; i++){
            const precedence = precedenceList[i];
            if (precedence.subscriptionHandle === subscriptionHandle) {
                // The view's value can only change if this subscription is the one that
                // used to have precedence.
                if (i === 0) removedValue = precedence.value;
                precedenceList.splice(i, 1);
                break;
            }
        }
        if (precedenceList.length === 0) {
            this.dataByKey.delete(key);
            changeCollector[key] = undefined;
        } else if (removedValue !== undefined && !EJSON.equals(removedValue, precedenceList[0].value)) {
            changeCollector[key] = precedenceList[0].value;
        }
    }
    changeField(subscriptionHandle, key, value, changeCollector, isAdd = false) {
        // Publish API ignores _id if present in fields
        if (key === "_id") return;
        // Don't share state with the data passed in by the user.
        value = EJSON.clone(value);
        if (!this.dataByKey.has(key)) {
            this.dataByKey.set(key, [
                {
                    subscriptionHandle: subscriptionHandle,
                    value: value
                }
            ]);
            changeCollector[key] = value;
            return;
        }
        const precedenceList = this.dataByKey.get(key);
        let elt;
        if (!isAdd) {
            elt = precedenceList.find((precedence)=>precedence.subscriptionHandle === subscriptionHandle);
        }
        if (elt) {
            if (elt === precedenceList[0] && !EJSON.equals(value, elt.value)) {
                // this subscription is changing the value of this field.
                changeCollector[key] = value;
            }
            elt.value = value;
        } else {
            // this subscription is newly caring about this field
            precedenceList.push({
                subscriptionHandle: subscriptionHandle,
                value: value
            });
        }
    }
    constructor(){
        _define_property(this, "existsIn", void 0);
        _define_property(this, "dataByKey", void 0);
        this.existsIn = new Set(); // set of subscriptionHandle
        // Memory Growth
        this.dataByKey = new Map(); // key-> [ {subscriptionHandle, value} by precedence]
    }
}
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"lodash.once":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ddp-server/node_modules/lodash.once/package.json                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "lodash.once",
  "version": "4.1.1"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ddp-server/node_modules/lodash.once/index.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"lodash.isempty":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ddp-server/node_modules/lodash.isempty/package.json                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "lodash.isempty",
  "version": "4.4.0"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ddp-server/node_modules/lodash.isempty/index.js                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"lodash.isobject":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ddp-server/node_modules/lodash.isobject/package.json                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "lodash.isobject",
  "version": "3.0.2"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ddp-server/node_modules/lodash.isobject/index.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"lodash.isstring":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ddp-server/node_modules/lodash.isstring/package.json                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "lodash.isstring",
  "version": "4.0.1"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ddp-server/node_modules/lodash.isstring/index.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json",
    ".ts"
  ]
});


/* Exports */
return {
  export: function () { return {
      DDPServer: DDPServer
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/ddp-server/stream_server.js",
    "/node_modules/meteor/ddp-server/livedata_server.js",
    "/node_modules/meteor/ddp-server/writefence.js",
    "/node_modules/meteor/ddp-server/crossbar.js",
    "/node_modules/meteor/ddp-server/server_convenience.js"
  ]
}});

//# sourceURL=meteor://💻app/packages/ddp-server.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZGRwLXNlcnZlci9zdHJlYW1fc2VydmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9kZHAtc2VydmVyL2xpdmVkYXRhX3NlcnZlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZGRwLXNlcnZlci93cml0ZWZlbmNlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9kZHAtc2VydmVyL2Nyb3NzYmFyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9kZHAtc2VydmVyL3NlcnZlcl9jb252ZW5pZW5jZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZGRwLXNlcnZlci9kdW1teV9kb2N1bWVudF92aWV3LnRzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9kZHAtc2VydmVyL3Nlc3Npb25fY29sbGVjdGlvbl92aWV3LnRzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9kZHAtc2VydmVyL3Nlc3Npb25fZG9jdW1lbnRfdmlldy50cyJdLCJuYW1lcyI6WyJ3ZWJzb2NrZXRFeHRlbnNpb25zIiwib25jZSIsImV4dGVuc2lvbnMiLCJ3ZWJzb2NrZXRDb21wcmVzc2lvbkNvbmZpZyIsInByb2Nlc3MiLCJlbnYiLCJTRVJWRVJfV0VCU09DS0VUX0NPTVBSRVNTSU9OIiwiSlNPTiIsInBhcnNlIiwicHVzaCIsIk5wbSIsInJlcXVpcmUiLCJjb25maWd1cmUiLCJ0aHJlc2hvbGQiLCJsZXZlbCIsInpsaWIiLCJjb25zdGFudHMiLCJaX0JFU1RfU1BFRUQiLCJtZW1MZXZlbCIsIlpfTUlOX01FTUxFVkVMIiwibm9Db250ZXh0VGFrZW92ZXIiLCJtYXhXaW5kb3dCaXRzIiwiWl9NSU5fV0lORE9XQklUUyIsInBhdGhQcmVmaXgiLCJfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fIiwiUk9PVF9VUkxfUEFUSF9QUkVGSVgiLCJTdHJlYW1TZXJ2ZXIiLCJzZWxmIiwicmVnaXN0cmF0aW9uX2NhbGxiYWNrcyIsIm9wZW5fc29ja2V0cyIsInByZWZpeCIsIlJvdXRlUG9saWN5IiwiZGVjbGFyZSIsInNvY2tqcyIsInNlcnZlck9wdGlvbnMiLCJsb2ciLCJoZWFydGJlYXRfZGVsYXkiLCJkaXNjb25uZWN0X2RlbGF5IiwiZGlzYWJsZV9jb3JzIiwiRElTQUJMRV9TT0NLSlNfQ09SUyIsImpzZXNzaW9uaWQiLCJVU0VfSlNFU1NJT05JRCIsIkRJU0FCTEVfV0VCU09DS0VUUyIsIndlYnNvY2tldCIsImZheWVfc2VydmVyX29wdGlvbnMiLCJzZXJ2ZXIiLCJjcmVhdGVTZXJ2ZXIiLCJXZWJBcHAiLCJodHRwU2VydmVyIiwicmVtb3ZlTGlzdGVuZXIiLCJfdGltZW91dEFkanVzdG1lbnRSZXF1ZXN0Q2FsbGJhY2siLCJpbnN0YWxsSGFuZGxlcnMiLCJhZGRMaXN0ZW5lciIsIl9yZWRpcmVjdFdlYnNvY2tldEVuZHBvaW50Iiwib24iLCJzb2NrZXQiLCJzZXRXZWJzb2NrZXRUaW1lb3V0IiwidGltZW91dCIsInByb3RvY29sIiwiX3Nlc3Npb24iLCJyZWN2IiwiY29ubmVjdGlvbiIsInNldFRpbWVvdXQiLCJzZW5kIiwiZGF0YSIsIndyaXRlIiwiZmlsdGVyIiwidmFsdWUiLCJURVNUX01FVEFEQVRBIiwic3RyaW5naWZ5IiwidGVzdE1lc3NhZ2VPbkNvbm5lY3QiLCJmb3JFYWNoIiwiY2FsbGJhY2siLCJPYmplY3QiLCJhc3NpZ24iLCJwcm90b3R5cGUiLCJyZWdpc3RlciIsImFsbF9zb2NrZXRzIiwidmFsdWVzIiwiZXZlbnQiLCJvbGRIdHRwU2VydmVyTGlzdGVuZXJzIiwibGlzdGVuZXJzIiwic2xpY2UiLCJyZW1vdmVBbGxMaXN0ZW5lcnMiLCJuZXdMaXN0ZW5lciIsInJlcXVlc3QiLCJhcmdzIiwiYXJndW1lbnRzIiwidXJsIiwicGFyc2VkVXJsIiwicGF0aG5hbWUiLCJmb3JtYXQiLCJvbGRMaXN0ZW5lciIsImFwcGx5IiwiRERQU2VydmVyIiwicHVibGljYXRpb25TdHJhdGVnaWVzIiwiU0VSVkVSX01FUkdFIiwidXNlRHVtbXlEb2N1bWVudFZpZXciLCJ1c2VDb2xsZWN0aW9uVmlldyIsImRvQWNjb3VudGluZ0ZvckNvbGxlY3Rpb24iLCJOT19NRVJHRV9OT19ISVNUT1JZIiwiTk9fTUVSR0UiLCJOT19NRVJHRV9NVUxUSSIsIl9TZXNzaW9uRG9jdW1lbnRWaWV3IiwiU2Vzc2lvbkRvY3VtZW50VmlldyIsIl9nZXRDdXJyZW50RmVuY2UiLCJjdXJyZW50SW52b2NhdGlvbiIsIl9DdXJyZW50V3JpdGVGZW5jZSIsImdldCIsIkREUCIsIl9DdXJyZW50TWV0aG9kSW52b2NhdGlvbiIsImZlbmNlIiwidW5kZWZpbmVkIiwiX1Nlc3Npb25Db2xsZWN0aW9uVmlldyIsIlNlc3Npb25Db2xsZWN0aW9uVmlldyIsIlNlc3Npb24iLCJ2ZXJzaW9uIiwib3B0aW9ucyIsImlkIiwiUmFuZG9tIiwiaW5pdGlhbGl6ZWQiLCJpblF1ZXVlIiwiTWV0ZW9yIiwiX0RvdWJsZUVuZGVkUXVldWUiLCJibG9ja2VkIiwid29ya2VyUnVubmluZyIsImNhY2hlZFVuYmxvY2siLCJfbmFtZWRTdWJzIiwiTWFwIiwiX3VuaXZlcnNhbFN1YnMiLCJ1c2VySWQiLCJjb2xsZWN0aW9uVmlld3MiLCJfaXNTZW5kaW5nIiwiX2RvbnRTdGFydE5ld1VuaXZlcnNhbFN1YnMiLCJfcGVuZGluZ1JlYWR5IiwiX2Nsb3NlQ2FsbGJhY2tzIiwiX3NvY2tldFVybCIsIl9yZXNwb25kVG9QaW5ncyIsInJlc3BvbmRUb1BpbmdzIiwiY29ubmVjdGlvbkhhbmRsZSIsImNsb3NlIiwib25DbG9zZSIsImZuIiwiY2IiLCJiaW5kRW52aXJvbm1lbnQiLCJkZWZlciIsImNsaWVudEFkZHJlc3MiLCJfY2xpZW50QWRkcmVzcyIsImh0dHBIZWFkZXJzIiwiaGVhZGVycyIsIm1zZyIsInNlc3Npb24iLCJzdGFydFVuaXZlcnNhbFN1YnMiLCJoZWFydGJlYXRJbnRlcnZhbCIsImhlYXJ0YmVhdCIsIkREUENvbW1vbiIsIkhlYXJ0YmVhdCIsImhlYXJ0YmVhdFRpbWVvdXQiLCJvblRpbWVvdXQiLCJzZW5kUGluZyIsInN0YXJ0IiwiUGFja2FnZSIsIkZhY3RzIiwiaW5jcmVtZW50U2VydmVyRmFjdCIsInNlbmRSZWFkeSIsInN1YnNjcmlwdGlvbklkcyIsInN1YnMiLCJzdWJzY3JpcHRpb25JZCIsIl9jYW5TZW5kIiwiY29sbGVjdGlvbk5hbWUiLCJnZXRQdWJsaWNhdGlvblN0cmF0ZWd5Iiwic2VuZEFkZGVkIiwiZmllbGRzIiwiY29sbGVjdGlvbiIsInNlbmRDaGFuZ2VkIiwiaXNFbXB0eSIsInNlbmRSZW1vdmVkIiwiZ2V0U2VuZENhbGxiYWNrcyIsImFkZGVkIiwiYmluZCIsImNoYW5nZWQiLCJyZW1vdmVkIiwiZ2V0Q29sbGVjdGlvblZpZXciLCJyZXQiLCJzZXQiLCJzdWJzY3JpcHRpb25IYW5kbGUiLCJ2aWV3IiwiZGVsZXRlIiwiaGFuZGxlcnMiLCJ1bml2ZXJzYWxfcHVibGlzaF9oYW5kbGVycyIsImhhbmRsZXIiLCJfc3RhcnRTdWJzY3JpcHRpb24iLCJzdG9wIiwiX21ldGVvclNlc3Npb24iLCJfZGVhY3RpdmF0ZUFsbFN1YnNjcmlwdGlvbnMiLCJfcmVtb3ZlU2Vzc2lvbiIsIl9wcmludFNlbnRERFAiLCJfZGVidWciLCJzdHJpbmdpZnlERFAiLCJzZW5kRXJyb3IiLCJyZWFzb24iLCJvZmZlbmRpbmdNZXNzYWdlIiwicHJvY2Vzc01lc3NhZ2UiLCJtc2dfaW4iLCJtZXNzYWdlUmVjZWl2ZWQiLCJwcm9jZXNzTmV4dCIsInNoaWZ0IiwicnVuSGFuZGxlcnMiLCJ1bmJsb2NrIiwic2V0SW1tZWRpYXRlIiwib25NZXNzYWdlSG9vayIsImVhY2giLCJwcm90b2NvbF9oYW5kbGVycyIsInJlc3VsdCIsImNhbGwiLCJfaXNQcm9taXNlIiwiZmluYWxseSIsInN1YiIsIm5hbWUiLCJwYXJhbXMiLCJBcnJheSIsInB1Ymxpc2hfaGFuZGxlcnMiLCJlcnJvciIsIkVycm9yIiwiaGFzIiwiRERQUmF0ZUxpbWl0ZXIiLCJyYXRlTGltaXRlcklucHV0IiwidHlwZSIsImNvbm5lY3Rpb25JZCIsIl9pbmNyZW1lbnQiLCJyYXRlTGltaXRSZXN1bHQiLCJfY2hlY2siLCJhbGxvd2VkIiwiZ2V0RXJyb3JNZXNzYWdlIiwidGltZVRvUmVzZXQiLCJ1bnN1YiIsIl9zdG9wU3Vic2NyaXB0aW9uIiwibWV0aG9kIiwicmFuZG9tU2VlZCIsIl9Xcml0ZUZlbmNlIiwib25BbGxDb21taXR0ZWQiLCJyZXRpcmUiLCJtZXRob2RzIiwibWV0aG9kX2hhbmRsZXJzIiwiYXJtIiwiaW52b2NhdGlvbiIsIk1ldGhvZEludm9jYXRpb24iLCJpc1NpbXVsYXRpb24iLCJzZXRVc2VySWQiLCJfc2V0VXNlcklkIiwicHJvbWlzZSIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0Iiwid2l0aFZhbHVlIiwibWF5YmVBdWRpdEFyZ3VtZW50Q2hlY2tzIiwiZmluaXNoIiwicGF5bG9hZCIsInRoZW4iLCJleGNlcHRpb24iLCJ3cmFwSW50ZXJuYWxFeGNlcHRpb24iLCJfZWFjaFN1YiIsImYiLCJfZGlmZkNvbGxlY3Rpb25WaWV3cyIsImJlZm9yZUNWcyIsIkRpZmZTZXF1ZW5jZSIsImRpZmZNYXBzIiwiYm90aCIsImxlZnRWYWx1ZSIsInJpZ2h0VmFsdWUiLCJkaWZmIiwicmlnaHRPbmx5IiwiZG9jdW1lbnRzIiwiZG9jVmlldyIsImdldEZpZWxkcyIsImxlZnRPbmx5IiwiZG9jIiwiX2RlYWN0aXZhdGUiLCJvbGROYW1lZFN1YnMiLCJhbGwiLCJtYXAiLCJuZXdTdWIiLCJfcmVjcmVhdGUiLCJfcnVuSGFuZGxlciIsIl9ub1lpZWxkc0FsbG93ZWQiLCJzdWJJZCIsIlN1YnNjcmlwdGlvbiIsInVuYmxvY2tIYW5kZXIiLCJzdWJOYW1lIiwibWF5YmVTdWIiLCJfbmFtZSIsIl9yZW1vdmVBbGxEb2N1bWVudHMiLCJyZXNwb25zZSIsImh0dHBGb3J3YXJkZWRDb3VudCIsInBhcnNlSW50IiwicmVtb3RlQWRkcmVzcyIsImZvcndhcmRlZEZvciIsImlzU3RyaW5nIiwic3BsaXQiLCJsZW5ndGgiLCJpcCIsInRyaW0iLCJfaGFuZGxlciIsIl9zdWJzY3JpcHRpb25JZCIsIl9wYXJhbXMiLCJfc3Vic2NyaXB0aW9uSGFuZGxlIiwiX2RlYWN0aXZhdGVkIiwiX3N0b3BDYWxsYmFja3MiLCJfZG9jdW1lbnRzIiwiX3JlYWR5IiwiX2lkRmlsdGVyIiwiaWRTdHJpbmdpZnkiLCJNb25nb0lEIiwiaWRQYXJzZSIsInJlc3VsdE9yVGhlbmFibGUiLCJfQ3VycmVudFB1YmxpY2F0aW9uSW52b2NhdGlvbiIsIkVKU09OIiwiY2xvbmUiLCJlIiwiX2lzRGVhY3RpdmF0ZWQiLCJpc1RoZW5hYmxlIiwiX3B1Ymxpc2hIYW5kbGVyUmVzdWx0IiwicmVzIiwiaXNDdXJzb3IiLCJjIiwiX3B1Ymxpc2hDdXJzb3IiLCJyZWFkeSIsImlzQXJyYXkiLCJldmVyeSIsImNvbGxlY3Rpb25OYW1lcyIsImkiLCJfZ2V0Q29sbGVjdGlvbk5hbWUiLCJjdXIiLCJfY2FsbFN0b3BDYWxsYmFja3MiLCJjYWxsYmFja3MiLCJjb2xsZWN0aW9uRG9jcyIsInN0cklkIiwib25TdG9wIiwiaWRzIiwiU2V0IiwiYWRkIiwiU2VydmVyIiwiZGVmYXVsdFB1YmxpY2F0aW9uU3RyYXRlZ3kiLCJvbkNvbm5lY3Rpb25Ib29rIiwiSG9vayIsImRlYnVnUHJpbnRFeGNlcHRpb25zIiwiX3B1YmxpY2F0aW9uU3RyYXRlZ2llcyIsInNlc3Npb25zIiwic3RyZWFtX3NlcnZlciIsInJhd19tc2ciLCJfcHJpbnRSZWNlaXZlZEREUCIsInBhcnNlRERQIiwiZXJyIiwiX2hhbmRsZUNvbm5lY3QiLCJvbkNvbm5lY3Rpb24iLCJzZXRQdWJsaWNhdGlvblN0cmF0ZWd5Iiwic3RyYXRlZ3kiLCJpbmNsdWRlcyIsIm9uTWVzc2FnZSIsInN1cHBvcnQiLCJTVVBQT1JURURfRERQX1ZFUlNJT05TIiwiY2FsY3VsYXRlVmVyc2lvbiIsInB1Ymxpc2giLCJpc09iamVjdCIsImF1dG9wdWJsaXNoIiwiaXNfYXV0byIsIndhcm5lZF9hYm91dF9hdXRvcHVibGlzaCIsImVudHJpZXMiLCJrZXkiLCJpc0FzeW5jQ2FsbCIsIl9pc0NhbGxBc3luY01ldGhvZFJ1bm5pbmciLCJmdW5jIiwicG9wIiwiY2FsbEFzeW5jIiwiaGFzT3duUHJvcGVydHkiLCJfc2V0Q2FsbEFzeW5jTWV0aG9kUnVubmluZyIsIl9DdXJyZW50Q2FsbEFzeW5jSW52b2NhdGlvbiIsIl9zZXQiLCJoYXNDYWxsQXN5bmNQYXJlbnQiLCJhcHBseUFzeW5jIiwiaXNGcm9tQ2FsbEFzeW5jIiwiY2F0Y2giLCJjdXJyZW50TWV0aG9kSW52b2NhdGlvbiIsImN1cnJlbnRQdWJsaWNhdGlvbkludm9jYXRpb24iLCJtYWtlUnBjU2VlZCIsInIiLCJfdXJsRm9yU2Vzc2lvbiIsInNlc3Npb25JZCIsImNsaWVudFN1cHBvcnRlZFZlcnNpb25zIiwic2VydmVyU3VwcG9ydGVkVmVyc2lvbnMiLCJjb3JyZWN0VmVyc2lvbiIsImZpbmQiLCJfY2FsY3VsYXRlVmVyc2lvbiIsImNvbnRleHQiLCJpc0NsaWVudFNhZmUiLCJvcmlnaW5hbE1lc3NhZ2UiLCJtZXNzYWdlIiwiZGV0YWlscyIsIl9leHBlY3RlZEJ5VGVzdCIsInN0YWNrIiwic2FuaXRpemVkRXJyb3IiLCJkZXNjcmlwdGlvbiIsIk1hdGNoIiwiX2ZhaWxJZkFyZ3VtZW50c0FyZU5vdEFsbENoZWNrZWQiLCJiZWdpbldyaXRlIiwicmV0aXJlZCIsImNvbW1pdHRlZCIsImZpcmVkIiwib3V0c3RhbmRpbmdfd3JpdGVzIiwiX21heWJlRmlyZSIsImFybWVkIiwib25CZWZvcmVGaXJlIiwiYmVmb3JlX2ZpcmVfY2FsbGJhY2tzIiwiY29tcGxldGlvbl9jYWxsYmFja3MiLCJfYXJtQW5kV2FpdCIsInJlc29sdmVyIiwicmV0dXJuVmFsdWUiLCJhcm1BbmRXYWl0IiwiaW52b2tlQ2FsbGJhY2siLCJiZWZvcmVDYWxsYmFja3MiLCJFbnZpcm9ubWVudFZhcmlhYmxlIiwiX0Nyb3NzYmFyIiwibmV4dElkIiwibGlzdGVuZXJzQnlDb2xsZWN0aW9uIiwibGlzdGVuZXJzQnlDb2xsZWN0aW9uQ291bnQiLCJmYWN0UGFja2FnZSIsImZhY3ROYW1lIiwiX2NvbGxlY3Rpb25Gb3JNZXNzYWdlIiwibGlzdGVuIiwidHJpZ2dlciIsInJlY29yZCIsImZpcmUiLCJub3RpZmljYXRpb24iLCJsaXN0ZW5lcnNGb3JDb2xsZWN0aW9uIiwiY2FsbGJhY2tJZHMiLCJsIiwiX21hdGNoZXMiLCJPYmplY3RJRCIsImVxdWFscyIsImtleXMiLCJfSW52YWxpZGF0aW9uQ3Jvc3NiYXIiLCJERFBfREVGQVVMVF9DT05ORUNUSU9OX1VSTCIsInJlZnJlc2giLCJEdW1teURvY3VtZW50VmlldyIsImNsZWFyRmllbGQiLCJjaGFuZ2VDb2xsZWN0b3IiLCJjaGFuZ2VGaWVsZCIsImlzQWRkIiwiZXhpc3RzSW4iLCJkYXRhQnlLZXkiLCJzaXplIiwicHJldmlvdXMiLCJkaWZmRG9jdW1lbnQiLCJub3dEViIsInByZXZEViIsImRpZmZPYmplY3RzIiwicHJldiIsIm5vdyIsImNoYW5nZWRSZXN1bHQiLCJwcmVjZWRlbmNlTGlzdCIsInNlc3Npb25DYWxsYmFja3MiLCJyZW1vdmVkVmFsdWUiLCJwcmVjZWRlbmNlIiwic3BsaWNlIiwiZWx0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUErQjtBQUNGO0FBRTdCLG1FQUFtRTtBQUNuRSxnRkFBZ0Y7QUFDaEYsK0VBQStFO0FBQy9FLHdFQUF3RTtBQUN4RSx3QkFBd0I7QUFDeEIsd0VBQXdFO0FBQ3hFLEVBQUU7QUFDRiwyRUFBMkU7QUFDM0UsZ0ZBQWdGO0FBQ2hGLDhFQUE4RTtBQUM5RSx1RUFBdUU7QUFDdkUsSUFBSUEsc0JBQXNCQyxLQUFLO0lBQzdCLElBQUlDLGFBQWEsRUFBRTtJQUVuQixJQUFJQyw2QkFBNkJDLFFBQVFDLEdBQUcsQ0FBQ0MsNEJBQTRCLEdBQ3ZFQyxLQUFLQyxLQUFLLENBQUNKLFFBQVFDLEdBQUcsQ0FBQ0MsNEJBQTRCLElBQUksQ0FBQztJQUUxRCxJQUFJSCw0QkFBNEI7UUFDOUJELFdBQVdPLElBQUksQ0FBQ0MsSUFBSUMsT0FBTyxDQUFDLHVCQUF1QkMsU0FBUyxDQUFDO1lBQzNEQyxXQUFXO1lBQ1hDLE9BQU9DLEtBQUtDLFNBQVMsQ0FBQ0MsWUFBWTtZQUNsQ0MsVUFBVUgsS0FBS0MsU0FBUyxDQUFDRyxjQUFjO1lBQ3ZDQyxtQkFBbUI7WUFDbkJDLGVBQWVOLEtBQUtDLFNBQVMsQ0FBQ00sZ0JBQWdCO1dBQzFDbkIsOEJBQThCLENBQUM7SUFFdkM7SUFFQSxPQUFPRDtBQUNUO0FBRUEsSUFBSXFCLGFBQWFDLDBCQUEwQkMsb0JBQW9CLElBQUs7QUFFcEVDLGVBQWU7SUFDYixJQUFJQyxPQUFPLElBQUk7SUFDZkEsS0FBS0Msc0JBQXNCLEdBQUcsRUFBRTtJQUNoQ0QsS0FBS0UsWUFBWSxHQUFHLEVBQUU7SUFFdEIsNkVBQTZFO0lBQzdFLDREQUE0RDtJQUM1REYsS0FBS0csTUFBTSxHQUFHUCxhQUFhO0lBQzNCUSxZQUFZQyxPQUFPLENBQUNMLEtBQUtHLE1BQU0sR0FBRyxLQUFLO0lBRXZDLGdCQUFnQjtJQUNoQixJQUFJRyxTQUFTdkIsSUFBSUMsT0FBTyxDQUFDO0lBQ3pCLElBQUl1QixnQkFBZ0I7UUFDbEJKLFFBQVFILEtBQUtHLE1BQU07UUFDbkJLLEtBQUssWUFBWTtRQUNqQixtRUFBbUU7UUFDbkUsMkNBQTJDO1FBQzNDQyxpQkFBaUI7UUFDakIsMkVBQTJFO1FBQzNFLHNFQUFzRTtRQUN0RSx5RUFBeUU7UUFDekUsd0VBQXdFO1FBQ3hFLDJFQUEyRTtRQUMzRSwwREFBMEQ7UUFDMURDLGtCQUFrQixLQUFLO1FBQ3ZCLDhDQUE4QztRQUM5QyxnREFBZ0Q7UUFDaERDLGNBQWMsQ0FBQyxDQUFDbEMsUUFBUUMsR0FBRyxDQUFDa0MsbUJBQW1CO1FBQy9DLG9FQUFvRTtRQUNwRSxnRUFBZ0U7UUFDaEUsb0JBQW9CO1FBQ3BCQyxZQUFZLENBQUMsQ0FBQ3BDLFFBQVFDLEdBQUcsQ0FBQ29DLGNBQWM7SUFDMUM7SUFFQSw0RUFBNEU7SUFDNUUscUVBQXFFO0lBQ3JFLHdEQUF3RDtJQUN4RCx1REFBdUQ7SUFDdkQsSUFBSXJDLFFBQVFDLEdBQUcsQ0FBQ3FDLGtCQUFrQixFQUFFO1FBQ2xDUixjQUFjUyxTQUFTLEdBQUc7SUFDNUIsT0FBTztRQUNMVCxjQUFjVSxtQkFBbUIsR0FBRztZQUNsQzFDLFlBQVlGO1FBQ2Q7SUFDRjtJQUVBMkIsS0FBS2tCLE1BQU0sR0FBR1osT0FBT2EsWUFBWSxDQUFDWjtJQUVsQyw2RUFBNkU7SUFDN0UsMEVBQTBFO0lBQzFFLDRFQUE0RTtJQUM1RSxnQ0FBZ0M7SUFDaENhLE9BQU9DLFVBQVUsQ0FBQ0MsY0FBYyxDQUM5QixXQUFXRixPQUFPRyxpQ0FBaUM7SUFDckR2QixLQUFLa0IsTUFBTSxDQUFDTSxlQUFlLENBQUNKLE9BQU9DLFVBQVU7SUFDN0NELE9BQU9DLFVBQVUsQ0FBQ0ksV0FBVyxDQUMzQixXQUFXTCxPQUFPRyxpQ0FBaUM7SUFFckQsa0NBQWtDO0lBQ2xDdkIsS0FBSzBCLDBCQUEwQjtJQUUvQjFCLEtBQUtrQixNQUFNLENBQUNTLEVBQUUsQ0FBQyxjQUFjLFNBQVVDLE1BQU07UUFDM0MsNkRBQTZEO1FBQzdELHlDQUF5QztRQUN6QyxtREFBbUQ7UUFDbkQsZ0RBQWdEO1FBQ2hELElBQUksQ0FBQ0EsUUFBUTtRQUViLDRFQUE0RTtRQUM1RSxtRUFBbUU7UUFDbkUsbUVBQW1FO1FBQ25FLDJFQUEyRTtRQUMzRSxnRUFBZ0U7UUFDaEUsMkVBQTJFO1FBQzNFLDJFQUEyRTtRQUMzRSw0RUFBNEU7UUFDNUUsOERBQThEO1FBQzlELHNCQUFzQjtRQUN0QkEsT0FBT0MsbUJBQW1CLEdBQUcsU0FBVUMsT0FBTztZQUM1QyxJQUFLRixRQUFPRyxRQUFRLEtBQUssZUFDcEJILE9BQU9HLFFBQVEsS0FBSyxlQUFjLEtBQ2hDSCxPQUFPSSxRQUFRLENBQUNDLElBQUksRUFBRTtnQkFDM0JMLE9BQU9JLFFBQVEsQ0FBQ0MsSUFBSSxDQUFDQyxVQUFVLENBQUNDLFVBQVUsQ0FBQ0w7WUFDN0M7UUFDRjtRQUNBRixPQUFPQyxtQkFBbUIsQ0FBQyxLQUFLO1FBRWhDRCxPQUFPUSxJQUFJLEdBQUcsU0FBVUMsSUFBSTtZQUMxQlQsT0FBT1UsS0FBSyxDQUFDRDtRQUNmO1FBQ0FULE9BQU9ELEVBQUUsQ0FBQyxTQUFTO1lBQ2pCM0IsS0FBS0UsWUFBWSxHQUFHRixLQUFLRSxZQUFZLENBQUNxQyxNQUFNLENBQUMsU0FBU0MsS0FBSztnQkFDekQsT0FBT0EsVUFBVVo7WUFDbkI7UUFDRjtRQUNBNUIsS0FBS0UsWUFBWSxDQUFDcEIsSUFBSSxDQUFDOEM7UUFFdkIsK0RBQStEO1FBQy9ELHVDQUF1QztRQUN2QyxJQUFJbkQsUUFBUUMsR0FBRyxDQUFDK0QsYUFBYSxJQUFJaEUsUUFBUUMsR0FBRyxDQUFDK0QsYUFBYSxLQUFLLE1BQU07WUFDbkViLE9BQU9RLElBQUksQ0FBQ3hELEtBQUs4RCxTQUFTLENBQUM7Z0JBQUVDLHNCQUFzQjtZQUFLO1FBQzFEO1FBRUEsb0VBQW9FO1FBQ3BFLDhEQUE4RDtRQUM5RDNDLEtBQUtDLHNCQUFzQixDQUFDMkMsT0FBTyxDQUFDLFNBQVVDLFFBQVE7WUFDcERBLFNBQVNqQjtRQUNYO0lBQ0Y7QUFFRjtBQUVBa0IsT0FBT0MsTUFBTSxDQUFDaEQsYUFBYWlELFNBQVMsRUFBRTtJQUNwQywrQ0FBK0M7SUFDL0MsNENBQTRDO0lBQzVDQyxVQUFVLFNBQVVKLFFBQVE7UUFDMUIsSUFBSTdDLE9BQU8sSUFBSTtRQUNmQSxLQUFLQyxzQkFBc0IsQ0FBQ25CLElBQUksQ0FBQytEO1FBQ2pDN0MsS0FBS2tELFdBQVcsR0FBR04sT0FBTyxDQUFDLFNBQVVoQixNQUFNO1lBQ3pDaUIsU0FBU2pCO1FBQ1g7SUFDRjtJQUVBLDRCQUE0QjtJQUM1QnNCLGFBQWE7UUFDWCxJQUFJbEQsT0FBTyxJQUFJO1FBQ2YsT0FBTzhDLE9BQU9LLE1BQU0sQ0FBQ25ELEtBQUtFLFlBQVk7SUFDeEM7SUFFQSxrRUFBa0U7SUFDbEUsb0RBQW9EO0lBQ3BEd0IsNEJBQTRCO1FBQzFCLElBQUkxQixPQUFPLElBQUk7UUFDZiw2REFBNkQ7UUFDN0QseURBQXlEO1FBQ3pELGdFQUFnRTtRQUNoRSxnREFBZ0Q7UUFDaEQsdUdBQXVHO1FBQ3ZHO1lBQUM7WUFBVztTQUFVLENBQUM0QyxPQUFPLENBQUMsQ0FBQ1E7WUFDOUIsSUFBSS9CLGFBQWFELE9BQU9DLFVBQVU7WUFDbEMsSUFBSWdDLHlCQUF5QmhDLFdBQVdpQyxTQUFTLENBQUNGLE9BQU9HLEtBQUssQ0FBQztZQUMvRGxDLFdBQVdtQyxrQkFBa0IsQ0FBQ0o7WUFFOUIsMERBQTBEO1lBQzFELDJEQUEyRDtZQUMzRCxJQUFJSyxjQUFjLFNBQVNDLFFBQVEsa0JBQWtCLEdBQW5CO2dCQUNoQyxtREFBbUQ7Z0JBQ25ELElBQUlDLE9BQU9DO2dCQUVYLGdDQUFnQztnQkFDaEMsSUFBSUMsTUFBTTlFLElBQUlDLE9BQU8sQ0FBQztnQkFFdEIscUVBQXFFO2dCQUNyRSwyQkFBMkI7Z0JBQzNCLElBQUk4RSxZQUFZRCxJQUFJaEYsS0FBSyxDQUFDNkUsUUFBUUcsR0FBRztnQkFDckMsSUFBSUMsVUFBVUMsUUFBUSxLQUFLbkUsYUFBYSxnQkFDcENrRSxVQUFVQyxRQUFRLEtBQUtuRSxhQUFhLGVBQWU7b0JBQ3JEa0UsVUFBVUMsUUFBUSxHQUFHL0QsS0FBS0csTUFBTSxHQUFHO29CQUNuQ3VELFFBQVFHLEdBQUcsR0FBR0EsSUFBSUcsTUFBTSxDQUFDRjtnQkFDM0I7Z0JBQ0FULHVCQUF1QlQsT0FBTyxDQUFDLFNBQVNxQixXQUFXO29CQUNqREEsWUFBWUMsS0FBSyxDQUFDN0MsWUFBWXNDO2dCQUNoQztZQUNGO1lBQ0F0QyxXQUFXSSxXQUFXLENBQUMyQixPQUFPSztRQUNoQztJQUNGO0FBQ0Y7Ozs7Ozs7Ozs7Ozs7OztBQzNNcUM7QUFDRTtBQUNBO0FBQzJCO0FBQ0o7QUFFOURVLFlBQVksQ0FBQztBQUdiLGtHQUFrRztBQUNsRywwQkFBMEI7QUFDMUIsK0VBQStFO0FBQy9FLDJFQUEyRTtBQUMzRSxNQUFNQyx3QkFBd0I7SUFDNUIsd0NBQXdDO0lBQ3hDLG1HQUFtRztJQUNuRyxpRUFBaUU7SUFDakVDLGNBQWM7UUFDWkMsc0JBQXNCO1FBQ3RCQyxtQkFBbUI7UUFDbkJDLDJCQUEyQjtJQUM3QjtJQUNBLHNGQUFzRjtJQUN0RiwyRUFBMkU7SUFDM0UsMEVBQTBFO0lBQzFFLGdGQUFnRjtJQUNoRkMscUJBQXFCO1FBQ25CSCxzQkFBc0I7UUFDdEJDLG1CQUFtQjtRQUNuQkMsMkJBQTJCO0lBQzdCO0lBQ0EseUZBQXlGO0lBQ3pGLDJFQUEyRTtJQUMzRSxvRkFBb0Y7SUFDcEZFLFVBQVU7UUFDUkosc0JBQXNCO1FBQ3RCQyxtQkFBbUI7UUFDbkJDLDJCQUEyQjtJQUM3QjtJQUNBLG1GQUFtRjtJQUNuRix5RkFBeUY7SUFDekYsd0RBQXdEO0lBQ3hERyxnQkFBZ0I7UUFDZEwsc0JBQXNCO1FBQ3RCQyxtQkFBbUI7UUFDbkJDLDJCQUEyQjtJQUM3QjtBQUNGO0FBRUFMLFVBQVVDLHFCQUFxQixHQUFHQTtBQUVsQyw4QkFBOEI7QUFDOUIsNkRBQTZEO0FBQzdELDZEQUE2RDtBQUM3RCwyRUFBMkU7QUFDM0UsRUFBRTtBQUNGLG9FQUFvRTtBQUNwRSxxRUFBcUU7QUFDckUsYUFBYTtBQUdiRCxVQUFVUyxvQkFBb0IsR0FBR0M7QUFFakNWLFVBQVVXLGdCQUFnQixHQUFHO0lBQzNCLElBQUlDLG9CQUFvQixJQUFJLENBQUNDLGtCQUFrQixDQUFDQyxHQUFHO0lBQ25ELElBQUlGLG1CQUFtQjtRQUNyQixPQUFPQTtJQUNUO0lBQ0FBLG9CQUFvQkcsSUFBSUMsd0JBQXdCLENBQUNGLEdBQUc7SUFDcEQsT0FBT0Ysb0JBQW9CQSxrQkFBa0JLLEtBQUssR0FBR0M7QUFDdkQ7QUFHQWxCLFVBQVVtQixzQkFBc0IsR0FBR0M7QUFFbkMsOEVBQThFLEdBQzlFLDhFQUE4RSxHQUM5RSw4RUFBOEUsR0FFOUUsSUFBSUMsVUFBVSxTQUFVdEUsTUFBTSxFQUFFdUUsT0FBTyxFQUFFN0QsTUFBTSxFQUFFOEQsT0FBTztJQUN0RCxJQUFJMUYsT0FBTyxJQUFJO0lBQ2ZBLEtBQUsyRixFQUFFLEdBQUdDLE9BQU9ELEVBQUU7SUFFbkIzRixLQUFLa0IsTUFBTSxHQUFHQTtJQUNkbEIsS0FBS3lGLE9BQU8sR0FBR0E7SUFFZnpGLEtBQUs2RixXQUFXLEdBQUc7SUFDbkI3RixLQUFLNEIsTUFBTSxHQUFHQTtJQUVkLG1FQUFtRTtJQUNuRSx3REFBd0Q7SUFDeEQ1QixLQUFLOEYsT0FBTyxHQUFHLElBQUlDLE9BQU9DLGlCQUFpQjtJQUUzQ2hHLEtBQUtpRyxPQUFPLEdBQUc7SUFDZmpHLEtBQUtrRyxhQUFhLEdBQUc7SUFFckJsRyxLQUFLbUcsYUFBYSxHQUFHO0lBRXJCLHVDQUF1QztJQUN2Q25HLEtBQUtvRyxVQUFVLEdBQUcsSUFBSUM7SUFDdEJyRyxLQUFLc0csY0FBYyxHQUFHLEVBQUU7SUFFeEJ0RyxLQUFLdUcsTUFBTSxHQUFHO0lBRWR2RyxLQUFLd0csZUFBZSxHQUFHLElBQUlIO0lBRTNCLGtFQUFrRTtJQUNsRSw4RUFBOEU7SUFDOUUscUNBQXFDO0lBQ3JDckcsS0FBS3lHLFVBQVUsR0FBRztJQUVsQiwyRUFBMkU7SUFDM0UsdUVBQXVFO0lBQ3ZFekcsS0FBSzBHLDBCQUEwQixHQUFHO0lBRWxDLDBEQUEwRDtJQUMxRCxvRUFBb0U7SUFDcEUxRyxLQUFLMkcsYUFBYSxHQUFHLEVBQUU7SUFFdkIsNERBQTREO0lBQzVEM0csS0FBSzRHLGVBQWUsR0FBRyxFQUFFO0lBR3pCLDhEQUE4RDtJQUM5RCxpREFBaUQ7SUFDakQ1RyxLQUFLNkcsVUFBVSxHQUFHakYsT0FBT2lDLEdBQUc7SUFFNUIsOENBQThDO0lBQzlDN0QsS0FBSzhHLGVBQWUsR0FBR3BCLFFBQVFxQixjQUFjO0lBRTdDLG9FQUFvRTtJQUNwRSxvRUFBb0U7SUFDcEUsMkNBQTJDO0lBQzNDL0csS0FBS2dILGdCQUFnQixHQUFHO1FBQ3RCckIsSUFBSTNGLEtBQUsyRixFQUFFO1FBQ1hzQixPQUFPO1lBQ0xqSCxLQUFLaUgsS0FBSztRQUNaO1FBQ0FDLFNBQVMsU0FBVUMsRUFBRTtZQUNuQixJQUFJQyxLQUFLckIsT0FBT3NCLGVBQWUsQ0FBQ0YsSUFBSTtZQUNwQyxJQUFJbkgsS0FBSzhGLE9BQU8sRUFBRTtnQkFDaEI5RixLQUFLNEcsZUFBZSxDQUFDOUgsSUFBSSxDQUFDc0k7WUFDNUIsT0FBTztnQkFDTCw4Q0FBOEM7Z0JBQzlDckIsT0FBT3VCLEtBQUssQ0FBQ0Y7WUFDZjtRQUNGO1FBQ0FHLGVBQWV2SCxLQUFLd0gsY0FBYztRQUNsQ0MsYUFBYXpILEtBQUs0QixNQUFNLENBQUM4RixPQUFPO0lBQ2xDO0lBRUExSCxLQUFLb0MsSUFBSSxDQUFDO1FBQUV1RixLQUFLO1FBQWFDLFNBQVM1SCxLQUFLMkYsRUFBRTtJQUFDO0lBRS9DLDREQUE0RDtJQUM1RDNGLEtBQUs2SCxrQkFBa0I7SUFFdkIsSUFBSXBDLFlBQVksVUFBVUMsUUFBUW9DLGlCQUFpQixLQUFLLEdBQUc7UUFDekQsc0VBQXNFO1FBQ3RFbEcsT0FBT0MsbUJBQW1CLENBQUM7UUFFM0I3QixLQUFLK0gsU0FBUyxHQUFHLElBQUlDLFVBQVVDLFNBQVMsQ0FBQztZQUN2Q0gsbUJBQW1CcEMsUUFBUW9DLGlCQUFpQjtZQUM1Q0ksa0JBQWtCeEMsUUFBUXdDLGdCQUFnQjtZQUMxQ0MsV0FBVztnQkFDVG5JLEtBQUtpSCxLQUFLO1lBQ1o7WUFDQW1CLFVBQVU7Z0JBQ1JwSSxLQUFLb0MsSUFBSSxDQUFDO29CQUFDdUYsS0FBSztnQkFBTTtZQUN4QjtRQUNGO1FBQ0EzSCxLQUFLK0gsU0FBUyxDQUFDTSxLQUFLO0lBQ3RCO0lBRUFDLE9BQU8sQ0FBQyxhQUFhLElBQUlBLE9BQU8sQ0FBQyxhQUFhLENBQUNDLEtBQUssQ0FBQ0MsbUJBQW1CLENBQ3RFLFlBQVksWUFBWTtBQUM1QjtBQUVBMUYsT0FBT0MsTUFBTSxDQUFDeUMsUUFBUXhDLFNBQVMsRUFBRTtJQUMvQnlGLFdBQVcsU0FBVUMsZUFBZTtRQUNsQyxJQUFJMUksT0FBTyxJQUFJO1FBQ2YsSUFBSUEsS0FBS3lHLFVBQVUsRUFBRTtZQUNuQnpHLEtBQUtvQyxJQUFJLENBQUM7Z0JBQUN1RixLQUFLO2dCQUFTZ0IsTUFBTUQ7WUFBZTtRQUNoRCxPQUFPO1lBQ0xBLGdCQUFnQjlGLE9BQU8sQ0FBQyxTQUFVZ0csY0FBYztnQkFDOUM1SSxLQUFLMkcsYUFBYSxDQUFDN0gsSUFBSSxDQUFDOEo7WUFDMUI7UUFDRjtJQUNGO0lBRUFDLFVBQVNDLGNBQWM7UUFDckIsT0FBTyxJQUFJLENBQUNyQyxVQUFVLElBQUksQ0FBQyxJQUFJLENBQUN2RixNQUFNLENBQUM2SCxzQkFBc0IsQ0FBQ0QsZ0JBQWdCdkUsaUJBQWlCO0lBQ2pHO0lBR0F5RSxXQUFVRixjQUFjLEVBQUVuRCxFQUFFLEVBQUVzRCxNQUFNO1FBQ2xDLElBQUksSUFBSSxDQUFDSixRQUFRLENBQUNDLGlCQUFpQjtZQUNqQyxJQUFJLENBQUMxRyxJQUFJLENBQUM7Z0JBQUV1RixLQUFLO2dCQUFTdUIsWUFBWUo7Z0JBQWdCbkQ7Z0JBQUlzRDtZQUFPO1FBQ25FO0lBQ0Y7SUFFQUUsYUFBWUwsY0FBYyxFQUFFbkQsRUFBRSxFQUFFc0QsTUFBTTtRQUNwQyxJQUFJRyxRQUFRSCxTQUNWO1FBRUYsSUFBSSxJQUFJLENBQUNKLFFBQVEsQ0FBQ0MsaUJBQWlCO1lBQ2pDLElBQUksQ0FBQzFHLElBQUksQ0FBQztnQkFDUnVGLEtBQUs7Z0JBQ0x1QixZQUFZSjtnQkFDWm5EO2dCQUNBc0Q7WUFDRjtRQUNGO0lBQ0Y7SUFFQUksYUFBWVAsY0FBYyxFQUFFbkQsRUFBRTtRQUM1QixJQUFJLElBQUksQ0FBQ2tELFFBQVEsQ0FBQ0MsaUJBQWlCO1lBQ2pDLElBQUksQ0FBQzFHLElBQUksQ0FBQztnQkFBQ3VGLEtBQUs7Z0JBQVd1QixZQUFZSjtnQkFBZ0JuRDtZQUFFO1FBQzNEO0lBQ0Y7SUFFQTJELGtCQUFrQjtRQUNoQixJQUFJdEosT0FBTyxJQUFJO1FBQ2YsT0FBTztZQUNMdUosT0FBT3ZKLEtBQUtnSixTQUFTLENBQUNRLElBQUksQ0FBQ3hKO1lBQzNCeUosU0FBU3pKLEtBQUttSixXQUFXLENBQUNLLElBQUksQ0FBQ3hKO1lBQy9CMEosU0FBUzFKLEtBQUtxSixXQUFXLENBQUNHLElBQUksQ0FBQ3hKO1FBQ2pDO0lBQ0Y7SUFFQTJKLG1CQUFtQixTQUFVYixjQUFjO1FBQ3pDLElBQUk5SSxPQUFPLElBQUk7UUFDZixJQUFJNEosTUFBTTVKLEtBQUt3RyxlQUFlLENBQUN2QixHQUFHLENBQUM2RDtRQUNuQyxJQUFJLENBQUNjLEtBQUs7WUFDUkEsTUFBTSxJQUFJckUsc0JBQXNCdUQsZ0JBQ0U5SSxLQUFLc0osZ0JBQWdCO1lBQ3ZEdEosS0FBS3dHLGVBQWUsQ0FBQ3FELEdBQUcsQ0FBQ2YsZ0JBQWdCYztRQUMzQztRQUNBLE9BQU9BO0lBQ1Q7SUFFQUwsT0FBTU8sa0JBQWtCLEVBQUVoQixjQUFjLEVBQUVuRCxFQUFFLEVBQUVzRCxNQUFNO1FBQ2xELElBQUksSUFBSSxDQUFDL0gsTUFBTSxDQUFDNkgsc0JBQXNCLENBQUNELGdCQUFnQnZFLGlCQUFpQixFQUFFO1lBQ3hFLE1BQU13RixPQUFPLElBQUksQ0FBQ0osaUJBQWlCLENBQUNiO1lBQ3BDaUIsS0FBS1IsS0FBSyxDQUFDTyxvQkFBb0JuRSxJQUFJc0Q7UUFDckMsT0FBTztZQUNMLElBQUksQ0FBQ0QsU0FBUyxDQUFDRixnQkFBZ0JuRCxJQUFJc0Q7UUFDckM7SUFDRjtJQUVBUyxTQUFRSSxrQkFBa0IsRUFBRWhCLGNBQWMsRUFBRW5ELEVBQUU7UUFDNUMsSUFBSSxJQUFJLENBQUN6RSxNQUFNLENBQUM2SCxzQkFBc0IsQ0FBQ0QsZ0JBQWdCdkUsaUJBQWlCLEVBQUU7WUFDeEUsTUFBTXdGLE9BQU8sSUFBSSxDQUFDSixpQkFBaUIsQ0FBQ2I7WUFDcENpQixLQUFLTCxPQUFPLENBQUNJLG9CQUFvQm5FO1lBQ2pDLElBQUlvRSxLQUFLWCxPQUFPLElBQUk7Z0JBQ2pCLElBQUksQ0FBQzVDLGVBQWUsQ0FBQ3dELE1BQU0sQ0FBQ2xCO1lBQy9CO1FBQ0YsT0FBTztZQUNMLElBQUksQ0FBQ08sV0FBVyxDQUFDUCxnQkFBZ0JuRDtRQUNuQztJQUNGO0lBRUE4RCxTQUFRSyxrQkFBa0IsRUFBRWhCLGNBQWMsRUFBRW5ELEVBQUUsRUFBRXNELE1BQU07UUFDcEQsSUFBSSxJQUFJLENBQUMvSCxNQUFNLENBQUM2SCxzQkFBc0IsQ0FBQ0QsZ0JBQWdCdkUsaUJBQWlCLEVBQUU7WUFDeEUsTUFBTXdGLE9BQU8sSUFBSSxDQUFDSixpQkFBaUIsQ0FBQ2I7WUFDcENpQixLQUFLTixPQUFPLENBQUNLLG9CQUFvQm5FLElBQUlzRDtRQUN2QyxPQUFPO1lBQ0wsSUFBSSxDQUFDRSxXQUFXLENBQUNMLGdCQUFnQm5ELElBQUlzRDtRQUN2QztJQUNGO0lBRUFwQixvQkFBb0I7UUFDbEIsSUFBSTdILE9BQU8sSUFBSTtRQUNmLDBFQUEwRTtRQUMxRSx5RUFBeUU7UUFDekUsaUVBQWlFO1FBQ2pFLElBQUlpSyxXQUFXO2VBQUlqSyxLQUFLa0IsTUFBTSxDQUFDZ0osMEJBQTBCO1NBQUM7UUFDMURELFNBQVNySCxPQUFPLENBQUMsU0FBVXVILE9BQU87WUFDaENuSyxLQUFLb0ssa0JBQWtCLENBQUNEO1FBQzFCO0lBQ0Y7SUFFQSx3REFBd0Q7SUFDeERsRCxPQUFPO1FBQ0wsSUFBSWpILE9BQU8sSUFBSTtRQUVmLDJEQUEyRDtRQUMzRCxvRUFBb0U7UUFDcEUsMEJBQTBCO1FBRTFCLHFCQUFxQjtRQUNyQixJQUFJLENBQUVBLEtBQUs4RixPQUFPLEVBQ2hCO1FBRUYsdUNBQXVDO1FBQ3ZDOUYsS0FBSzhGLE9BQU8sR0FBRztRQUNmOUYsS0FBS3dHLGVBQWUsR0FBRyxJQUFJSDtRQUUzQixJQUFJckcsS0FBSytILFNBQVMsRUFBRTtZQUNsQi9ILEtBQUsrSCxTQUFTLENBQUNzQyxJQUFJO1lBQ25CckssS0FBSytILFNBQVMsR0FBRztRQUNuQjtRQUVBLElBQUkvSCxLQUFLNEIsTUFBTSxFQUFFO1lBQ2Y1QixLQUFLNEIsTUFBTSxDQUFDcUYsS0FBSztZQUNqQmpILEtBQUs0QixNQUFNLENBQUMwSSxjQUFjLEdBQUc7UUFDL0I7UUFFQWhDLE9BQU8sQ0FBQyxhQUFhLElBQUlBLE9BQU8sQ0FBQyxhQUFhLENBQUNDLEtBQUssQ0FBQ0MsbUJBQW1CLENBQ3RFLFlBQVksWUFBWSxDQUFDO1FBRTNCekMsT0FBT3VCLEtBQUssQ0FBQztZQUNYLHVEQUF1RDtZQUN2RCwrREFBK0Q7WUFDL0QsMEVBQTBFO1lBQzFFdEgsS0FBS3VLLDJCQUEyQjtZQUVoQyxnRUFBZ0U7WUFDaEUsK0RBQStEO1lBQy9EdkssS0FBSzRHLGVBQWUsQ0FBQ2hFLE9BQU8sQ0FBQyxTQUFVQyxRQUFRO2dCQUM3Q0E7WUFDRjtRQUNGO1FBRUEsMEJBQTBCO1FBQzFCN0MsS0FBS2tCLE1BQU0sQ0FBQ3NKLGNBQWMsQ0FBQ3hLO0lBQzdCO0lBRUEsc0VBQXNFO0lBQ3RFLHVEQUF1RDtJQUN2RG9DLE1BQU0sU0FBVXVGLEdBQUc7UUFDakIsTUFBTTNILE9BQU8sSUFBSTtRQUNqQixJQUFJQSxLQUFLNEIsTUFBTSxFQUFFO1lBQ2YsSUFBSW1FLE9BQU8wRSxhQUFhLEVBQ3RCMUUsT0FBTzJFLE1BQU0sQ0FBQyxZQUFZMUMsVUFBVTJDLFlBQVksQ0FBQ2hEO1lBQ25EM0gsS0FBSzRCLE1BQU0sQ0FBQ1EsSUFBSSxDQUFDNEYsVUFBVTJDLFlBQVksQ0FBQ2hEO1FBQzFDO0lBQ0Y7SUFFQSwyQkFBMkI7SUFDM0JpRCxXQUFXLFNBQVVDLE1BQU0sRUFBRUMsZ0JBQWdCO1FBQzNDLElBQUk5SyxPQUFPLElBQUk7UUFDZixJQUFJMkgsTUFBTTtZQUFDQSxLQUFLO1lBQVNrRCxRQUFRQTtRQUFNO1FBQ3ZDLElBQUlDLGtCQUNGbkQsSUFBSW1ELGdCQUFnQixHQUFHQTtRQUN6QjlLLEtBQUtvQyxJQUFJLENBQUN1RjtJQUNaO0lBRUEsMkRBQTJEO0lBQzNELDZEQUE2RDtJQUM3RCxrREFBa0Q7SUFDbEQsRUFBRTtJQUNGLGtFQUFrRTtJQUNsRSxtRUFBbUU7SUFDbkUsa0VBQWtFO0lBQ2xFLG9FQUFvRTtJQUNwRSxpRUFBaUU7SUFDakUsbUJBQW1CO0lBQ25CLEVBQUU7SUFDRixrRUFBa0U7SUFDbEUsa0VBQWtFO0lBQ2xFLGtFQUFrRTtJQUNsRSxVQUFVO0lBQ1ZvRCxnQkFBZ0IsU0FBVUMsTUFBTTtRQUM5QixJQUFJaEwsT0FBTyxJQUFJO1FBQ2YsSUFBSSxDQUFDQSxLQUFLOEYsT0FBTyxFQUNmO1FBRUYsaUVBQWlFO1FBQ2pFLCtEQUErRDtRQUMvRCxnRUFBZ0U7UUFDaEUscUNBQXFDO1FBQ3JDLEVBQUU7UUFDRixvRUFBb0U7UUFDcEUsb0VBQW9FO1FBQ3BFLGlFQUFpRTtRQUNqRSw0Q0FBNEM7UUFDNUMsRUFBRTtRQUNGLGtFQUFrRTtRQUNsRSw2QkFBNkI7UUFDN0IsSUFBSTlGLEtBQUsrSCxTQUFTLEVBQUU7WUFDbEIvSCxLQUFLK0gsU0FBUyxDQUFDa0QsZUFBZTtRQUNoQzs7UUFFQSxJQUFJakwsS0FBS3lGLE9BQU8sS0FBSyxVQUFVdUYsT0FBT3JELEdBQUcsS0FBSyxRQUFRO1lBQ3BELElBQUkzSCxLQUFLOEcsZUFBZSxFQUN0QjlHLEtBQUtvQyxJQUFJLENBQUM7Z0JBQUN1RixLQUFLO2dCQUFRaEMsSUFBSXFGLE9BQU9yRixFQUFFO1lBQUE7WUFDdkM7UUFDRjtRQUNBLElBQUkzRixLQUFLeUYsT0FBTyxLQUFLLFVBQVV1RixPQUFPckQsR0FBRyxLQUFLLFFBQVE7WUFDcEQscURBQXFEO1lBQ3JEO1FBQ0Y7UUFFQTNILEtBQUs4RixPQUFPLENBQUNoSCxJQUFJLENBQUNrTTtRQUNsQixJQUFJaEwsS0FBS2tHLGFBQWEsRUFDcEI7UUFDRmxHLEtBQUtrRyxhQUFhLEdBQUc7UUFFckIsSUFBSWdGLGNBQWM7WUFDaEIsSUFBSXZELE1BQU0zSCxLQUFLOEYsT0FBTyxJQUFJOUYsS0FBSzhGLE9BQU8sQ0FBQ3FGLEtBQUs7WUFFNUMsSUFBSSxDQUFDeEQsS0FBSztnQkFDUjNILEtBQUtrRyxhQUFhLEdBQUc7Z0JBQ3JCO1lBQ0Y7WUFFQSxTQUFTa0Y7Z0JBQ1AsSUFBSW5GLFVBQVU7Z0JBRWQsSUFBSW9GLFVBQVU7b0JBQ1osSUFBSSxDQUFDcEYsU0FDSCxRQUFRLGFBQWE7b0JBQ3ZCQSxVQUFVO29CQUNWcUYsYUFBYUo7Z0JBQ2Y7Z0JBRUFsTCxLQUFLa0IsTUFBTSxDQUFDcUssYUFBYSxDQUFDQyxJQUFJLENBQUMsU0FBVTNJLFFBQVE7b0JBQy9DQSxTQUFTOEUsS0FBSzNIO29CQUNkLE9BQU87Z0JBQ1Q7Z0JBRUEsSUFBSTJILElBQUlBLEdBQUcsSUFBSTNILEtBQUt5TCxpQkFBaUIsRUFBRTtvQkFDckMsTUFBTUMsU0FBUzFMLEtBQUt5TCxpQkFBaUIsQ0FBQzlELElBQUlBLEdBQUcsQ0FBQyxDQUFDZ0UsSUFBSSxDQUNqRDNMLE1BQ0EySCxLQUNBMEQ7b0JBR0YsSUFBSXRGLE9BQU82RixVQUFVLENBQUNGLFNBQVM7d0JBQzdCQSxPQUFPRyxPQUFPLENBQUMsSUFBTVI7b0JBQ3ZCLE9BQU87d0JBQ0xBO29CQUNGO2dCQUNGLE9BQU87b0JBQ0xyTCxLQUFLNEssU0FBUyxDQUFDLGVBQWVqRDtvQkFDOUIwRCxXQUFXLDJDQUEyQztnQkFDeEQ7WUFDRjtZQUVBRDtRQUNGO1FBRUFGO0lBQ0Y7SUFFQU8sbUJBQW1CO1FBQ2pCSyxLQUFLLFNBQWdCbkUsR0FBRyxFQUFFMEQsT0FBTzs7Z0JBQy9CLElBQUlyTCxPQUFPLElBQUk7Z0JBRWYsc0RBQXNEO2dCQUN0RCw0REFBNEQ7Z0JBQzVEQSxLQUFLbUcsYUFBYSxHQUFHa0Y7Z0JBRXJCLDRCQUE0QjtnQkFDNUIsSUFBSSxPQUFRMUQsSUFBSWhDLEVBQUUsS0FBTSxZQUNwQixPQUFRZ0MsSUFBSW9FLElBQUksS0FBTSxZQUNyQixZQUFZcEUsT0FBTyxDQUFFQSxLQUFJcUUsTUFBTSxZQUFZQyxLQUFJLEdBQUs7b0JBQ3ZEak0sS0FBSzRLLFNBQVMsQ0FBQywwQkFBMEJqRDtvQkFDekM7Z0JBQ0Y7Z0JBRUEsSUFBSSxDQUFDM0gsS0FBS2tCLE1BQU0sQ0FBQ2dMLGdCQUFnQixDQUFDdkUsSUFBSW9FLElBQUksQ0FBQyxFQUFFO29CQUMzQy9MLEtBQUtvQyxJQUFJLENBQUM7d0JBQ1J1RixLQUFLO3dCQUFTaEMsSUFBSWdDLElBQUloQyxFQUFFO3dCQUN4QndHLE9BQU8sSUFBSXBHLE9BQU9xRyxLQUFLLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRXpFLElBQUlvRSxJQUFJLENBQUMsV0FBVyxDQUFDO29CQUFDO29CQUN0RTtnQkFDRjtnQkFFQSxJQUFJL0wsS0FBS29HLFVBQVUsQ0FBQ2lHLEdBQUcsQ0FBQzFFLElBQUloQyxFQUFFLEdBQzVCLDREQUE0RDtnQkFDNUQsd0RBQXdEO2dCQUN4RCxhQUFhO2dCQUNiO2dCQUVGLHdFQUF3RTtnQkFDeEUseUVBQXlFO2dCQUN6RSx1RUFBdUU7Z0JBQ3ZFLHFFQUFxRTtnQkFDckUsc0VBQXNFO2dCQUN0RSxJQUFJMkMsT0FBTyxDQUFDLG1CQUFtQixFQUFFO29CQUMvQixJQUFJZ0UsaUJBQWlCaEUsT0FBTyxDQUFDLG1CQUFtQixDQUFDZ0UsY0FBYztvQkFDL0QsSUFBSUMsbUJBQW1CO3dCQUNyQmhHLFFBQVF2RyxLQUFLdUcsTUFBTTt3QkFDbkJnQixlQUFldkgsS0FBS2dILGdCQUFnQixDQUFDTyxhQUFhO3dCQUNsRGlGLE1BQU07d0JBQ05ULE1BQU1wRSxJQUFJb0UsSUFBSTt3QkFDZFUsY0FBY3pNLEtBQUsyRixFQUFFO29CQUN2QjtvQkFFQTJHLGVBQWVJLFVBQVUsQ0FBQ0g7b0JBQzFCLElBQUlJLGtCQUFrQkwsZUFBZU0sTUFBTSxDQUFDTDtvQkFDNUMsSUFBSSxDQUFDSSxnQkFBZ0JFLE9BQU8sRUFBRTt3QkFDNUI3TSxLQUFLb0MsSUFBSSxDQUFDOzRCQUNSdUYsS0FBSzs0QkFBU2hDLElBQUlnQyxJQUFJaEMsRUFBRTs0QkFDeEJ3RyxPQUFPLElBQUlwRyxPQUFPcUcsS0FBSyxDQUNyQixxQkFDQUUsZUFBZVEsZUFBZSxDQUFDSCxrQkFDL0I7Z0NBQUNJLGFBQWFKLGdCQUFnQkksV0FBVzs0QkFBQTt3QkFDN0M7d0JBQ0E7b0JBQ0Y7Z0JBQ0Y7Z0JBRUEsSUFBSTVDLFVBQVVuSyxLQUFLa0IsTUFBTSxDQUFDZ0wsZ0JBQWdCLENBQUN2RSxJQUFJb0UsSUFBSSxDQUFDO2dCQUVwRCxNQUFNL0wsS0FBS29LLGtCQUFrQixDQUFDRCxTQUFTeEMsSUFBSWhDLEVBQUUsRUFBRWdDLElBQUlxRSxNQUFNLEVBQUVyRSxJQUFJb0UsSUFBSTtnQkFFbkUsMEJBQTBCO2dCQUMxQi9MLEtBQUttRyxhQUFhLEdBQUc7WUFDdkI7O1FBRUE2RyxPQUFPLFNBQVVyRixHQUFHO1lBQ2xCLElBQUkzSCxPQUFPLElBQUk7WUFFZkEsS0FBS2lOLGlCQUFpQixDQUFDdEYsSUFBSWhDLEVBQUU7UUFDL0I7UUFFQXVILFFBQVEsU0FBZ0J2RixHQUFHLEVBQUUwRCxPQUFPOztnQkFDbEMsSUFBSXJMLE9BQU8sSUFBSTtnQkFFZiw2QkFBNkI7Z0JBQzdCLGtEQUFrRDtnQkFDbEQsOEJBQThCO2dCQUM5QixJQUFJLE9BQVEySCxJQUFJaEMsRUFBRSxLQUFNLFlBQ3BCLE9BQVFnQyxJQUFJdUYsTUFBTSxLQUFNLFlBQ3ZCLFlBQVl2RixPQUFPLENBQUVBLEtBQUlxRSxNQUFNLFlBQVlDLEtBQUksS0FDOUMsZ0JBQWdCdEUsT0FBUyxPQUFPQSxJQUFJd0YsVUFBVSxLQUFLLFVBQVk7b0JBQ25Fbk4sS0FBSzRLLFNBQVMsQ0FBQywrQkFBK0JqRDtvQkFDOUM7Z0JBQ0Y7Z0JBRUEsSUFBSXdGLGFBQWF4RixJQUFJd0YsVUFBVSxJQUFJO2dCQUVuQyw0REFBNEQ7Z0JBQzVELDJEQUEyRDtnQkFDM0QsUUFBUTtnQkFDUixJQUFJL0gsUUFBUSxJQUFJakIsVUFBVWlKLFdBQVc7Z0JBQ3JDaEksTUFBTWlJLGNBQWMsQ0FBQztvQkFDbkIsc0RBQXNEO29CQUN0RCx3REFBd0Q7b0JBQ3hELHFEQUFxRDtvQkFDckQsb0RBQW9EO29CQUNwRCx3Q0FBd0M7b0JBQ3hDakksTUFBTWtJLE1BQU07b0JBQ1p0TixLQUFLb0MsSUFBSSxDQUFDO3dCQUFDdUYsS0FBSzt3QkFBVzRGLFNBQVM7NEJBQUM1RixJQUFJaEMsRUFBRTt5QkFBQztvQkFBQTtnQkFDOUM7Z0JBRUEsbUJBQW1CO2dCQUNuQixJQUFJd0UsVUFBVW5LLEtBQUtrQixNQUFNLENBQUNzTSxlQUFlLENBQUM3RixJQUFJdUYsTUFBTSxDQUFDO2dCQUNyRCxJQUFJLENBQUMvQyxTQUFTO29CQUNabkssS0FBS29DLElBQUksQ0FBQzt3QkFDUnVGLEtBQUs7d0JBQVVoQyxJQUFJZ0MsSUFBSWhDLEVBQUU7d0JBQ3pCd0csT0FBTyxJQUFJcEcsT0FBT3FHLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFekUsSUFBSXVGLE1BQU0sQ0FBQyxXQUFXLENBQUM7b0JBQUM7b0JBQ2xFLE1BQU05SCxNQUFNcUksR0FBRztvQkFDZjtnQkFDRjtnQkFFQSxJQUFJQyxhQUFhLElBQUkxRixVQUFVMkYsZ0JBQWdCLENBQUM7b0JBQzlDNUIsTUFBTXBFLElBQUl1RixNQUFNO29CQUNoQlUsY0FBYztvQkFDZHJILFFBQVF2RyxLQUFLdUcsTUFBTTtvQkFDbkJzSCxXQUFVdEgsTUFBTTt3QkFDZCxPQUFPdkcsS0FBSzhOLFVBQVUsQ0FBQ3ZIO29CQUN6QjtvQkFDQThFLFNBQVNBO29CQUNUbkosWUFBWWxDLEtBQUtnSCxnQkFBZ0I7b0JBQ2pDbUcsWUFBWUE7b0JBQ1ovSDtnQkFDRjtnQkFFQSxNQUFNMkksVUFBVSxJQUFJQyxRQUFRLENBQUNDLFNBQVNDO29CQUNwQyxzRUFBc0U7b0JBQ3RFLG9FQUFvRTtvQkFDcEUsdUVBQXVFO29CQUN2RSxzQkFBc0I7b0JBQ3RCLElBQUk1RixPQUFPLENBQUMsbUJBQW1CLEVBQUU7d0JBQy9CLElBQUlnRSxpQkFBaUJoRSxPQUFPLENBQUMsbUJBQW1CLENBQUNnRSxjQUFjO3dCQUMvRCxJQUFJQyxtQkFBbUI7NEJBQ3JCaEcsUUFBUXZHLEtBQUt1RyxNQUFNOzRCQUNuQmdCLGVBQWV2SCxLQUFLZ0gsZ0JBQWdCLENBQUNPLGFBQWE7NEJBQ2xEaUYsTUFBTTs0QkFDTlQsTUFBTXBFLElBQUl1RixNQUFNOzRCQUNoQlQsY0FBY3pNLEtBQUsyRixFQUFFO3dCQUN2Qjt3QkFDQTJHLGVBQWVJLFVBQVUsQ0FBQ0g7d0JBQzFCLElBQUlJLGtCQUFrQkwsZUFBZU0sTUFBTSxDQUFDTDt3QkFDNUMsSUFBSSxDQUFDSSxnQkFBZ0JFLE9BQU8sRUFBRTs0QkFDNUJxQixPQUFPLElBQUluSSxPQUFPcUcsS0FBSyxDQUNyQixxQkFDQUUsZUFBZVEsZUFBZSxDQUFDSCxrQkFDL0I7Z0NBQUNJLGFBQWFKLGdCQUFnQkksV0FBVzs0QkFBQTs0QkFFM0M7d0JBQ0Y7b0JBQ0Y7b0JBRUFrQixRQUFROUosVUFBVWEsa0JBQWtCLENBQUNtSixTQUFTLENBQzVDL0ksT0FDQSxJQUFNRixJQUFJQyx3QkFBd0IsQ0FBQ2dKLFNBQVMsQ0FDMUNULFlBQ0EsSUFBTVUseUJBQ0pqRSxTQUFTdUQsWUFBWS9GLElBQUlxRSxNQUFNLEVBQy9CLGNBQWNyRSxJQUFJdUYsTUFBTSxHQUFHO2dCQUluQztnQkFFQSxTQUFlbUI7O3dCQUNiLE1BQU1qSixNQUFNcUksR0FBRzt3QkFDZnBDO29CQUNGOztnQkFFQSxNQUFNaUQsVUFBVTtvQkFDZDNHLEtBQUs7b0JBQ0xoQyxJQUFJZ0MsSUFBSWhDLEVBQUU7Z0JBQ1o7Z0JBQ0EsT0FBT29JLFFBQVFRLElBQUksQ0FBQyxDQUFNN0M7d0JBQ3hCLE1BQU0yQzt3QkFDTixJQUFJM0MsV0FBV3JHLFdBQVc7NEJBQ3hCaUosUUFBUTVDLE1BQU0sR0FBR0E7d0JBQ25CO3dCQUNBMUwsS0FBS29DLElBQUksQ0FBQ2tNO29CQUNaLE1BQUcsQ0FBT0U7d0JBQ1IsTUFBTUg7d0JBQ05DLFFBQVFuQyxLQUFLLEdBQUdzQyxzQkFDZEQsV0FDQSxDQUFDLHVCQUF1QixFQUFFN0csSUFBSXVGLE1BQU0sQ0FBQyxDQUFDLENBQUM7d0JBRXpDbE4sS0FBS29DLElBQUksQ0FBQ2tNO29CQUNaO1lBQ0Y7O0lBQ0Y7SUFFQUksVUFBVSxTQUFVQyxDQUFDO1FBQ25CLElBQUkzTyxPQUFPLElBQUk7UUFDZkEsS0FBS29HLFVBQVUsQ0FBQ3hELE9BQU8sQ0FBQytMO1FBQ3hCM08sS0FBS3NHLGNBQWMsQ0FBQzFELE9BQU8sQ0FBQytMO0lBQzlCO0lBRUFDLHNCQUFzQixTQUFVQyxTQUFTO1FBQ3ZDLElBQUk3TyxPQUFPLElBQUk7UUFDZjhPLGFBQWFDLFFBQVEsQ0FBQ0YsV0FBVzdPLEtBQUt3RyxlQUFlLEVBQUU7WUFDckR3SSxNQUFNLFNBQVVsRyxjQUFjLEVBQUVtRyxTQUFTLEVBQUVDLFVBQVU7Z0JBQ25EQSxXQUFXQyxJQUFJLENBQUNGO1lBQ2xCO1lBQ0FHLFdBQVcsU0FBVXRHLGNBQWMsRUFBRW9HLFVBQVU7Z0JBQzdDQSxXQUFXRyxTQUFTLENBQUN6TSxPQUFPLENBQUMsU0FBVTBNLE9BQU8sRUFBRTNKLEVBQUU7b0JBQ2hEM0YsS0FBS2dKLFNBQVMsQ0FBQ0YsZ0JBQWdCbkQsSUFBSTJKLFFBQVFDLFNBQVM7Z0JBQ3REO1lBQ0Y7WUFDQUMsVUFBVSxTQUFVMUcsY0FBYyxFQUFFbUcsU0FBUztnQkFDM0NBLFVBQVVJLFNBQVMsQ0FBQ3pNLE9BQU8sQ0FBQyxTQUFVNk0sR0FBRyxFQUFFOUosRUFBRTtvQkFDM0MzRixLQUFLcUosV0FBVyxDQUFDUCxnQkFBZ0JuRDtnQkFDbkM7WUFDRjtRQUNGO0lBQ0Y7SUFFQSxrRUFBa0U7SUFDbEUsb0JBQW9CO0lBQ2RtSSxZQUFXdkgsTUFBTTs7WUFDckIsSUFBSXZHLE9BQU8sSUFBSTtZQUVmLElBQUl1RyxXQUFXLFFBQVEsT0FBT0EsV0FBVyxVQUN2QyxNQUFNLElBQUk2RixNQUFNLHFEQUNBLE9BQU83RjtZQUV6Qix3RUFBd0U7WUFDeEUscUVBQXFFO1lBQ3JFLEVBQUU7WUFDRix5RUFBeUU7WUFDekUsc0VBQXNFO1lBQ3RFLDBFQUEwRTtZQUMxRSwyRUFBMkU7WUFDM0UsMkJBQTJCO1lBQzNCdkcsS0FBSzBHLDBCQUEwQixHQUFHO1lBRWxDLHdFQUF3RTtZQUN4RSxrQ0FBa0M7WUFDbEMxRyxLQUFLME8sUUFBUSxDQUFDLFNBQVU1QyxHQUFHO2dCQUN6QkEsSUFBSTRELFdBQVc7WUFDakI7WUFFQSwyRUFBMkU7WUFDM0UsMkVBQTJFO1lBQzNFLHFCQUFxQjtZQUNyQjFQLEtBQUt5RyxVQUFVLEdBQUc7WUFDbEIsSUFBSW9JLFlBQVk3TyxLQUFLd0csZUFBZTtZQUNwQ3hHLEtBQUt3RyxlQUFlLEdBQUcsSUFBSUg7WUFDM0JyRyxLQUFLdUcsTUFBTSxHQUFHQTtZQUVkLDBEQUEwRDtZQUMxRCw0RUFBNEU7WUFDNUUsMEVBQTBFO1lBQzFFLHNFQUFzRTtZQUN0RSxNQUFNckIsSUFBSUMsd0JBQXdCLENBQUNnSixTQUFTLENBQUM5SSxXQUFXOztvQkFDdEQsaUVBQWlFO29CQUNqRSxJQUFJc0ssZUFBZTNQLEtBQUtvRyxVQUFVO29CQUNsQ3BHLEtBQUtvRyxVQUFVLEdBQUcsSUFBSUM7b0JBQ3RCckcsS0FBS3NHLGNBQWMsR0FBRyxFQUFFO29CQUl4QixNQUFNMEgsUUFBUTRCLEdBQUcsQ0FBQzsyQkFBSUQ7cUJBQWEsQ0FBQ0UsR0FBRyxDQUFDLENBQU8sQ0FBQ2pILGdCQUFnQmtELElBQUk7NEJBQ2xFLE1BQU1nRSxTQUFTaEUsSUFBSWlFLFNBQVM7NEJBQzVCL1AsS0FBS29HLFVBQVUsQ0FBQ3lELEdBQUcsQ0FBQ2pCLGdCQUFnQmtIOzRCQUNwQyxtRUFBbUU7NEJBQ25FLG9EQUFvRDs0QkFDcEQsTUFBTUEsT0FBT0UsV0FBVzt3QkFDMUI7b0JBRUEsd0VBQXdFO29CQUN4RSx1RUFBdUU7b0JBQ3ZFLFFBQVE7b0JBQ1JoUSxLQUFLMEcsMEJBQTBCLEdBQUc7b0JBQ2xDMUcsS0FBSzZILGtCQUFrQjtnQkFDekI7ZUFBRztnQkFBRWtFLE1BQU07WUFBYTtZQUV4QiwwRUFBMEU7WUFDMUUsd0VBQXdFO1lBQ3hFLHNEQUFzRDtZQUN0RGhHLE9BQU9rSyxnQkFBZ0IsQ0FBQztnQkFDdEJqUSxLQUFLeUcsVUFBVSxHQUFHO2dCQUNsQnpHLEtBQUs0TyxvQkFBb0IsQ0FBQ0M7Z0JBQzFCLElBQUksQ0FBQ3pGLFFBQVFwSixLQUFLMkcsYUFBYSxHQUFHO29CQUNoQzNHLEtBQUt5SSxTQUFTLENBQUN6SSxLQUFLMkcsYUFBYTtvQkFDakMzRyxLQUFLMkcsYUFBYSxHQUFHLEVBQUU7Z0JBQ3pCO1lBQ0Y7UUFDRjs7SUFFQXlELG9CQUFvQixTQUFVRCxPQUFPLEVBQUUrRixLQUFLLEVBQUVsRSxNQUFNLEVBQUVELElBQUk7UUFDeEQsSUFBSS9MLE9BQU8sSUFBSTtRQUVmLElBQUk4TCxNQUFNLElBQUlxRSxhQUNablEsTUFBTW1LLFNBQVMrRixPQUFPbEUsUUFBUUQ7UUFFaEMsSUFBSXFFLGdCQUFnQnBRLEtBQUttRyxhQUFhO1FBQ3RDLGdEQUFnRDtRQUNoRCw4Q0FBOEM7UUFDOUMsMkJBQTJCO1FBQzNCMkYsSUFBSVQsT0FBTyxHQUFHK0UsaUJBQWtCLE1BQU87UUFFdkMsSUFBSUYsT0FDRmxRLEtBQUtvRyxVQUFVLENBQUN5RCxHQUFHLENBQUNxRyxPQUFPcEU7YUFFM0I5TCxLQUFLc0csY0FBYyxDQUFDeEgsSUFBSSxDQUFDZ047UUFFM0IsT0FBT0EsSUFBSWtFLFdBQVc7SUFDeEI7SUFFQSxtQ0FBbUM7SUFDbkMvQyxtQkFBbUIsU0FBVWlELEtBQUssRUFBRS9ELEtBQUs7UUFDdkMsSUFBSW5NLE9BQU8sSUFBSTtRQUVmLElBQUlxUSxVQUFVO1FBQ2QsSUFBSUgsT0FBTztZQUNULElBQUlJLFdBQVd0USxLQUFLb0csVUFBVSxDQUFDbkIsR0FBRyxDQUFDaUw7WUFDbkMsSUFBSUksVUFBVTtnQkFDWkQsVUFBVUMsU0FBU0MsS0FBSztnQkFDeEJELFNBQVNFLG1CQUFtQjtnQkFDNUJGLFNBQVNaLFdBQVc7Z0JBQ3BCMVAsS0FBS29HLFVBQVUsQ0FBQzRELE1BQU0sQ0FBQ2tHO1lBQ3pCO1FBQ0Y7UUFFQSxJQUFJTyxXQUFXO1lBQUM5SSxLQUFLO1lBQVNoQyxJQUFJdUs7UUFBSztRQUV2QyxJQUFJL0QsT0FBTztZQUNUc0UsU0FBU3RFLEtBQUssR0FBR3NDLHNCQUNmdEMsT0FDQWtFLFVBQVcsY0FBY0EsVUFBVSxTQUFTSCxRQUN2QyxpQkFBaUJBO1FBQzFCO1FBRUFsUSxLQUFLb0MsSUFBSSxDQUFDcU87SUFDWjtJQUVBLDZFQUE2RTtJQUM3RSxnREFBZ0Q7SUFDaERsRyw2QkFBNkI7UUFDM0IsSUFBSXZLLE9BQU8sSUFBSTtRQUVmQSxLQUFLb0csVUFBVSxDQUFDeEQsT0FBTyxDQUFDLFNBQVVrSixHQUFHLEVBQUVuRyxFQUFFO1lBQ3ZDbUcsSUFBSTRELFdBQVc7UUFDakI7UUFDQTFQLEtBQUtvRyxVQUFVLEdBQUcsSUFBSUM7UUFFdEJyRyxLQUFLc0csY0FBYyxDQUFDMUQsT0FBTyxDQUFDLFNBQVVrSixHQUFHO1lBQ3ZDQSxJQUFJNEQsV0FBVztRQUNqQjtRQUNBMVAsS0FBS3NHLGNBQWMsR0FBRyxFQUFFO0lBQzFCO0lBRUEseURBQXlEO0lBQ3pELGtFQUFrRTtJQUNsRSxnQ0FBZ0M7SUFDaENrQixnQkFBZ0I7UUFDZCxJQUFJeEgsT0FBTyxJQUFJO1FBRWYsa0VBQWtFO1FBQ2xFLDhEQUE4RDtRQUM5RCw4REFBOEQ7UUFDOUQsa0VBQWtFO1FBQ2xFLDhCQUE4QjtRQUM5QixFQUFFO1FBQ0YsZ0VBQWdFO1FBQ2hFLElBQUkwUSxxQkFBcUJDLFNBQVNsUyxRQUFRQyxHQUFHLENBQUMsdUJBQXVCLEtBQUs7UUFFMUUsSUFBSWdTLHVCQUF1QixHQUN6QixPQUFPMVEsS0FBSzRCLE1BQU0sQ0FBQ2dQLGFBQWE7UUFFbEMsSUFBSUMsZUFBZTdRLEtBQUs0QixNQUFNLENBQUM4RixPQUFPLENBQUMsa0JBQWtCO1FBQ3pELElBQUksQ0FBQ29KLFNBQVNELGVBQ1osT0FBTztRQUNUQSxlQUFlQSxhQUFhRSxLQUFLLENBQUM7UUFFbEMsK0RBQStEO1FBQy9ELGdFQUFnRTtRQUNoRSxnRUFBZ0U7UUFDaEUsaUVBQWlFO1FBQ2pFLDhEQUE4RDtRQUM5RCxpRUFBaUU7UUFDakUsOERBQThEO1FBQzlELGlDQUFpQztRQUVqQyxJQUFJTCxxQkFBcUIsS0FBS0EsdUJBQXVCRyxhQUFhRyxNQUFNLEVBQ3RFLE9BQU87UUFDVEgsZUFBZUEsYUFBYWhCLEdBQUcsQ0FBQyxDQUFDb0IsS0FBT0EsR0FBR0MsSUFBSTtRQUMvQyxPQUFPTCxZQUFZLENBQUNBLGFBQWFHLE1BQU0sR0FBR04sbUJBQW1CO0lBQy9EO0FBQ0Y7QUFFQSw4RUFBOEUsR0FDOUUsOEVBQThFLEdBQzlFLDhFQUE4RSxHQUU5RSw0REFBNEQ7QUFFNUQsMEVBQTBFO0FBQzFFLFVBQVU7QUFDVjs7Ozs7Q0FLQyxHQUNELElBQUlQLGVBQWUsU0FDZnZJLE9BQU8sRUFBRXVDLE9BQU8sRUFBRXZCLGNBQWMsRUFBRW9ELE1BQU0sRUFBRUQsSUFBSTtJQUNoRCxJQUFJL0wsT0FBTyxJQUFJO0lBQ2ZBLEtBQUtnQyxRQUFRLEdBQUc0RixTQUFTLGtCQUFrQjtJQUUzQzs7Ozs7O0dBTUMsR0FDRDVILEtBQUtrQyxVQUFVLEdBQUcwRixRQUFRWixnQkFBZ0IsRUFBRSxvQkFBb0I7SUFFaEVoSCxLQUFLbVIsUUFBUSxHQUFHaEg7SUFFaEIsMEVBQTBFO0lBQzFFbkssS0FBS29SLGVBQWUsR0FBR3hJO0lBQ3ZCLCtCQUErQjtJQUMvQjVJLEtBQUt1USxLQUFLLEdBQUd4RTtJQUViL0wsS0FBS3FSLE9BQU8sR0FBR3JGLFVBQVUsRUFBRTtJQUUzQixxRUFBcUU7SUFDckUsdURBQXVEO0lBQ3ZELGlFQUFpRTtJQUNqRSxJQUFJaE0sS0FBS29SLGVBQWUsRUFBRTtRQUN4QnBSLEtBQUtzUixtQkFBbUIsR0FBRyxNQUFNdFIsS0FBS29SLGVBQWU7SUFDdkQsT0FBTztRQUNMcFIsS0FBS3NSLG1CQUFtQixHQUFHLE1BQU0xTCxPQUFPRCxFQUFFO0lBQzVDO0lBRUEsK0JBQStCO0lBQy9CM0YsS0FBS3VSLFlBQVksR0FBRztJQUVwQiw2REFBNkQ7SUFDN0R2UixLQUFLd1IsY0FBYyxHQUFHLEVBQUU7SUFFeEIsaUVBQWlFO0lBQ2pFLG9CQUFvQjtJQUNwQnhSLEtBQUt5UixVQUFVLEdBQUcsSUFBSXBMO0lBRXRCLDRCQUE0QjtJQUM1QnJHLEtBQUswUixNQUFNLEdBQUc7SUFFZCxnREFBZ0Q7SUFFaEQ7Ozs7OztHQU1DLEdBQ0QxUixLQUFLdUcsTUFBTSxHQUFHcUIsUUFBUXJCLE1BQU07SUFFNUIsZ0RBQWdEO0lBQ2hELHlDQUF5QztJQUN6QyxvREFBb0Q7SUFFcEQsZ0RBQWdEO0lBQ2hELG9EQUFvRDtJQUNwRCxzREFBc0Q7SUFDdEQsdUNBQXVDO0lBRXZDdkcsS0FBSzJSLFNBQVMsR0FBRztRQUNmQyxhQUFhQyxRQUFRRCxXQUFXO1FBQ2hDRSxTQUFTRCxRQUFRQyxPQUFPO0lBQzFCO0lBRUF4SixPQUFPLENBQUMsYUFBYSxJQUFJQSxPQUFPLENBQUMsYUFBYSxDQUFDQyxLQUFLLENBQUNDLG1CQUFtQixDQUN0RSxZQUFZLGlCQUFpQjtBQUNqQztBQUVBMUYsT0FBT0MsTUFBTSxDQUFDb04sYUFBYW5OLFNBQVMsRUFBRTtJQUNwQ2dOLGFBQWE7O1lBQ1gsa0VBQWtFO1lBQ2xFLDhDQUE4QztZQUM5QyxFQUFFO1lBQ0YsbUVBQW1FO1lBQ25FLG9FQUFvRTtZQUNwRSw2REFBNkQ7WUFFN0QsSUFBSSxDQUFDLElBQUksQ0FBQzNFLE9BQU8sRUFBRTtnQkFDakIsSUFBSSxDQUFDQSxPQUFPLEdBQUcsS0FBTztZQUN4QjtZQUVBLE1BQU1yTCxPQUFPLElBQUk7WUFDakIsSUFBSStSLG1CQUFtQjtZQUN2QixJQUFJO2dCQUNGQSxtQkFBbUI3TSxJQUFJOE0sNkJBQTZCLENBQUM3RCxTQUFTLENBQzVEbk8sTUFDQSxJQUNFb08seUJBQ0VwTyxLQUFLbVIsUUFBUSxFQUNiblIsTUFDQWlTLE1BQU1DLEtBQUssQ0FBQ2xTLEtBQUtxUixPQUFPLEdBQ3hCLGtFQUFrRTtvQkFDbEUsMERBQTBEO29CQUMxRCxpQ0FBaUM7b0JBQ2pDLGdCQUFnQnJSLEtBQUt1USxLQUFLLEdBQUcsTUFFakM7b0JBQUV4RSxNQUFNL0wsS0FBS3VRLEtBQUs7Z0JBQUM7WUFFdkIsRUFBRSxPQUFPNEIsR0FBRztnQkFDVm5TLEtBQUttTSxLQUFLLENBQUNnRztnQkFDWDtZQUNGO1lBRUEsZ0RBQWdEO1lBQ2hELElBQUluUyxLQUFLb1MsY0FBYyxJQUFJO1lBRTNCLHVFQUF1RTtZQUN2RSwwRUFBMEU7WUFDMUUsbURBQW1EO1lBQ25ELE1BQU1DLGFBQ0pOLG9CQUFvQixPQUFPQSxpQkFBaUJ4RCxJQUFJLEtBQUs7WUFDdkQsSUFBSThELFlBQVk7Z0JBQ2QsSUFBSTtvQkFDRixNQUFNclMsS0FBS3NTLHFCQUFxQixDQUFDLE9BQU1QLGdCQUFlO2dCQUN4RCxFQUFFLE9BQU1JLEdBQUc7b0JBQ1RuUyxLQUFLbU0sS0FBSyxDQUFDZ0c7Z0JBQ2I7WUFDRixPQUFPO2dCQUNMLE1BQU1uUyxLQUFLc1MscUJBQXFCLENBQUNQO1lBQ25DO1FBQ0Y7O0lBRU1PLHVCQUF1QkMsR0FBRzs7WUFDOUIsbUVBQW1FO1lBQ25FLHNFQUFzRTtZQUN0RSxzRUFBc0U7WUFDdEUsNEVBQTRFO1lBQzVFLDJEQUEyRDtZQUMzRCxFQUFFO1lBQ0Ysc0VBQXNFO1lBQ3RFLDBFQUEwRTtZQUMxRSwwRUFBMEU7WUFDMUUseUNBQXlDO1lBQ3pDLDZEQUE2RDtZQUM3RCx5Q0FBeUM7WUFDekMsd0NBQXdDO1lBQ3hDLG9DQUFvQztZQUNwQyxVQUFVO1lBQ1YsT0FBTztZQUVQLElBQUl2UyxPQUFPLElBQUk7WUFDZixJQUFJd1MsV0FBVyxTQUFVQyxDQUFDO2dCQUN4QixPQUFPQSxLQUFLQSxFQUFFQyxjQUFjO1lBQzlCO1lBQ0EsSUFBSUYsU0FBU0QsTUFBTTtnQkFDakIsSUFBSTtvQkFDRixNQUFNQSxJQUFJRyxjQUFjLENBQUMxUztnQkFDM0IsRUFBRSxPQUFPbVMsR0FBRztvQkFDVm5TLEtBQUttTSxLQUFLLENBQUNnRztvQkFDWDtnQkFDRjtnQkFDQSwwRUFBMEU7Z0JBQzFFLDhCQUE4QjtnQkFDOUJuUyxLQUFLMlMsS0FBSztZQUNaLE9BQU8sSUFBSTFHLE1BQU0yRyxPQUFPLENBQUNMLE1BQU07Z0JBQzdCLHFDQUFxQztnQkFDckMsSUFBSSxDQUFFQSxJQUFJTSxLQUFLLENBQUNMLFdBQVc7b0JBQ3pCeFMsS0FBS21NLEtBQUssQ0FBQyxJQUFJQyxNQUFNO29CQUNyQjtnQkFDRjtnQkFDQSxrQ0FBa0M7Z0JBQ2xDLHdFQUF3RTtnQkFDeEUsbURBQW1EO2dCQUNuRCxJQUFJMEcsa0JBQWtCLENBQUM7Z0JBRXZCLElBQUssSUFBSUMsSUFBSSxHQUFHQSxJQUFJUixJQUFJdkIsTUFBTSxFQUFFLEVBQUUrQixFQUFHO29CQUNuQyxJQUFJakssaUJBQWlCeUosR0FBRyxDQUFDUSxFQUFFLENBQUNDLGtCQUFrQjtvQkFDOUMsSUFBSUYsZUFBZSxDQUFDaEssZUFBZSxFQUFFO3dCQUNuQzlJLEtBQUttTSxLQUFLLENBQUMsSUFBSUMsTUFDYiwrREFDRXREO3dCQUNKO29CQUNGO29CQUNBZ0ssZUFBZSxDQUFDaEssZUFBZSxHQUFHO2dCQUNwQztnQkFFQSxJQUFJO29CQUNGLE1BQU1rRixRQUFRNEIsR0FBRyxDQUFDMkMsSUFBSTFDLEdBQUcsQ0FBQ29ELE9BQU9BLElBQUlQLGNBQWMsQ0FBQzFTO2dCQUN0RCxFQUFFLE9BQU9tUyxHQUFHO29CQUNWblMsS0FBS21NLEtBQUssQ0FBQ2dHO29CQUNYO2dCQUNGO2dCQUNBblMsS0FBSzJTLEtBQUs7WUFDWixPQUFPLElBQUlKLEtBQUs7Z0JBQ2QsNERBQTREO2dCQUM1RCw4REFBOEQ7Z0JBQzlELHFCQUFxQjtnQkFDckJ2UyxLQUFLbU0sS0FBSyxDQUFDLElBQUlDLE1BQU0sa0RBQ0U7WUFDekI7UUFDRjs7SUFFQSwyRUFBMkU7SUFDM0UsMEVBQTBFO0lBQzFFLHVFQUF1RTtJQUN2RSx5RUFBeUU7SUFDekUsNkJBQTZCO0lBQzdCc0QsYUFBYTtRQUNYLElBQUkxUCxPQUFPLElBQUk7UUFDZixJQUFJQSxLQUFLdVIsWUFBWSxFQUNuQjtRQUNGdlIsS0FBS3VSLFlBQVksR0FBRztRQUNwQnZSLEtBQUtrVCxrQkFBa0I7UUFDdkI1SyxPQUFPLENBQUMsYUFBYSxJQUFJQSxPQUFPLENBQUMsYUFBYSxDQUFDQyxLQUFLLENBQUNDLG1CQUFtQixDQUN0RSxZQUFZLGlCQUFpQixDQUFDO0lBQ2xDO0lBRUEwSyxvQkFBb0I7UUFDbEIsSUFBSWxULE9BQU8sSUFBSTtRQUNmLHVDQUF1QztRQUN2QyxJQUFJbVQsWUFBWW5ULEtBQUt3UixjQUFjO1FBQ25DeFIsS0FBS3dSLGNBQWMsR0FBRyxFQUFFO1FBQ3hCMkIsVUFBVXZRLE9BQU8sQ0FBQyxTQUFVQyxRQUFRO1lBQ2xDQTtRQUNGO0lBQ0Y7SUFFQSwyQ0FBMkM7SUFDM0MyTixxQkFBcUI7UUFDbkIsSUFBSXhRLE9BQU8sSUFBSTtRQUNmK0YsT0FBT2tLLGdCQUFnQixDQUFDO1lBQ3RCalEsS0FBS3lSLFVBQVUsQ0FBQzdPLE9BQU8sQ0FBQyxTQUFVd1EsY0FBYyxFQUFFdEssY0FBYztnQkFDOURzSyxlQUFleFEsT0FBTyxDQUFDLFNBQVV5USxLQUFLO29CQUNwQ3JULEtBQUswSixPQUFPLENBQUNaLGdCQUFnQjlJLEtBQUsyUixTQUFTLENBQUNHLE9BQU8sQ0FBQ3VCO2dCQUN0RDtZQUNGO1FBQ0Y7SUFDRjtJQUVBLGdFQUFnRTtJQUNoRSxtRUFBbUU7SUFDbkUsb0VBQW9FO0lBQ3BFLDhEQUE4RDtJQUM5RCxpQ0FBaUM7SUFDakN0RCxXQUFXO1FBQ1QsSUFBSS9QLE9BQU8sSUFBSTtRQUNmLE9BQU8sSUFBSW1RLGFBQ1RuUSxLQUFLZ0MsUUFBUSxFQUFFaEMsS0FBS21SLFFBQVEsRUFBRW5SLEtBQUtvUixlQUFlLEVBQUVwUixLQUFLcVIsT0FBTyxFQUNoRXJSLEtBQUt1USxLQUFLO0lBQ2Q7SUFFQTs7Ozs7O0dBTUMsR0FDRHBFLE9BQU8sU0FBVUEsS0FBSztRQUNwQixJQUFJbk0sT0FBTyxJQUFJO1FBQ2YsSUFBSUEsS0FBS29TLGNBQWMsSUFDckI7UUFDRnBTLEtBQUtnQyxRQUFRLENBQUNpTCxpQkFBaUIsQ0FBQ2pOLEtBQUtvUixlQUFlLEVBQUVqRjtJQUN4RDtJQUVBLDhFQUE4RTtJQUM5RSw2RUFBNkU7SUFDN0UsMkVBQTJFO0lBQzNFLGtDQUFrQztJQUVsQzs7Ozs7R0FLQyxHQUNEOUIsTUFBTTtRQUNKLElBQUlySyxPQUFPLElBQUk7UUFDZixJQUFJQSxLQUFLb1MsY0FBYyxJQUNyQjtRQUNGcFMsS0FBS2dDLFFBQVEsQ0FBQ2lMLGlCQUFpQixDQUFDak4sS0FBS29SLGVBQWU7SUFDdEQ7SUFFQTs7Ozs7O0dBTUMsR0FDRGtDLFFBQVEsU0FBVXpRLFFBQVE7UUFDeEIsSUFBSTdDLE9BQU8sSUFBSTtRQUNmNkMsV0FBV2tELE9BQU9zQixlQUFlLENBQUN4RSxVQUFVLG1CQUFtQjdDO1FBQy9ELElBQUlBLEtBQUtvUyxjQUFjLElBQ3JCdlA7YUFFQTdDLEtBQUt3UixjQUFjLENBQUMxUyxJQUFJLENBQUMrRDtJQUM3QjtJQUVBLDZFQUE2RTtJQUM3RSx3RUFBd0U7SUFDeEUsZ0JBQWdCO0lBQ2hCdVAsZ0JBQWdCO1FBQ2QsSUFBSXBTLE9BQU8sSUFBSTtRQUNmLE9BQU9BLEtBQUt1UixZQUFZLElBQUl2UixLQUFLZ0MsUUFBUSxDQUFDOEQsT0FBTyxLQUFLO0lBQ3hEO0lBRUE7Ozs7Ozs7O0dBUUMsR0FDRHlELE9BQU9ULGNBQWMsRUFBRW5ELEVBQUUsRUFBRXNELE1BQU07UUFDL0IsSUFBSSxJQUFJLENBQUNtSixjQUFjLElBQ3JCO1FBQ0Z6TSxLQUFLLElBQUksQ0FBQ2dNLFNBQVMsQ0FBQ0MsV0FBVyxDQUFDak07UUFFaEMsSUFBSSxJQUFJLENBQUMzRCxRQUFRLENBQUNkLE1BQU0sQ0FBQzZILHNCQUFzQixDQUFDRCxnQkFBZ0J0RSx5QkFBeUIsRUFBRTtZQUN6RixJQUFJK08sTUFBTSxJQUFJLENBQUM5QixVQUFVLENBQUN4TSxHQUFHLENBQUM2RDtZQUM5QixJQUFJeUssT0FBTyxNQUFNO2dCQUNmQSxNQUFNLElBQUlDO2dCQUNWLElBQUksQ0FBQy9CLFVBQVUsQ0FBQzVILEdBQUcsQ0FBQ2YsZ0JBQWdCeUs7WUFDdEM7WUFDQUEsSUFBSUUsR0FBRyxDQUFDOU47UUFDVjtRQUVBLElBQUksQ0FBQzNELFFBQVEsQ0FBQ3VILEtBQUssQ0FBQyxJQUFJLENBQUMrSCxtQkFBbUIsRUFBRXhJLGdCQUFnQm5ELElBQUlzRDtJQUNwRTtJQUVBOzs7Ozs7OztHQVFDLEdBQ0RRLFNBQVNYLGNBQWMsRUFBRW5ELEVBQUUsRUFBRXNELE1BQU07UUFDakMsSUFBSSxJQUFJLENBQUNtSixjQUFjLElBQ3JCO1FBQ0Z6TSxLQUFLLElBQUksQ0FBQ2dNLFNBQVMsQ0FBQ0MsV0FBVyxDQUFDak07UUFDaEMsSUFBSSxDQUFDM0QsUUFBUSxDQUFDeUgsT0FBTyxDQUFDLElBQUksQ0FBQzZILG1CQUFtQixFQUFFeEksZ0JBQWdCbkQsSUFBSXNEO0lBQ3RFO0lBRUE7Ozs7Ozs7R0FPQyxHQUNEUyxTQUFTWixjQUFjLEVBQUVuRCxFQUFFO1FBQ3pCLElBQUksSUFBSSxDQUFDeU0sY0FBYyxJQUNyQjtRQUNGek0sS0FBSyxJQUFJLENBQUNnTSxTQUFTLENBQUNDLFdBQVcsQ0FBQ2pNO1FBRWhDLElBQUksSUFBSSxDQUFDM0QsUUFBUSxDQUFDZCxNQUFNLENBQUM2SCxzQkFBc0IsQ0FBQ0QsZ0JBQWdCdEUseUJBQXlCLEVBQUU7WUFDekYsa0VBQWtFO1lBQ2xFLDREQUE0RDtZQUM1RCxJQUFJLENBQUNpTixVQUFVLENBQUN4TSxHQUFHLENBQUM2RCxnQkFBZ0JrQixNQUFNLENBQUNyRTtRQUM3QztRQUVBLElBQUksQ0FBQzNELFFBQVEsQ0FBQzBILE9BQU8sQ0FBQyxJQUFJLENBQUM0SCxtQkFBbUIsRUFBRXhJLGdCQUFnQm5EO0lBQ2xFO0lBRUE7Ozs7O0dBS0MsR0FDRGdOLE9BQU87UUFDTCxJQUFJM1MsT0FBTyxJQUFJO1FBQ2YsSUFBSUEsS0FBS29TLGNBQWMsSUFDckI7UUFDRixJQUFJLENBQUNwUyxLQUFLb1IsZUFBZSxFQUN2QixRQUFTLDRDQUE0QztRQUN2RCxJQUFJLENBQUNwUixLQUFLMFIsTUFBTSxFQUFFO1lBQ2hCMVIsS0FBS2dDLFFBQVEsQ0FBQ3lHLFNBQVMsQ0FBQztnQkFBQ3pJLEtBQUtvUixlQUFlO2FBQUM7WUFDOUNwUixLQUFLMFIsTUFBTSxHQUFHO1FBQ2hCO0lBQ0Y7QUFDRjtBQUVBLDhFQUE4RSxHQUM5RSw4RUFBOEUsR0FDOUUsOEVBQThFLEdBRTlFZ0MsU0FBUyxTQUFVaE8sVUFBVSxDQUFDLENBQUM7SUFDN0IsSUFBSTFGLE9BQU8sSUFBSTtJQUVmLG9FQUFvRTtJQUNwRSxrRUFBa0U7SUFDbEUsK0RBQStEO0lBQy9ELDZDQUE2QztJQUM3QyxFQUFFO0lBQ0YscURBQXFEO0lBQ3JELHlFQUF5RTtJQUN6RUEsS0FBSzBGLE9BQU8sR0FBRztRQUNib0MsbUJBQW1CO1FBQ25CSSxrQkFBa0I7UUFDbEIseURBQXlEO1FBQ3pEbkIsZ0JBQWdCO1FBQ2hCNE0sNEJBQTRCdlAsc0JBQXNCQyxZQUFZO09BQzNEcUI7SUFHTCxpRUFBaUU7SUFDakUsc0VBQXNFO0lBQ3RFLDhEQUE4RDtJQUM5RCxxQkFBcUI7SUFDckIxRixLQUFLNFQsZ0JBQWdCLEdBQUcsSUFBSUMsS0FBSztRQUMvQkMsc0JBQXNCO0lBQ3hCO0lBRUEsd0RBQXdEO0lBQ3hEOVQsS0FBS3VMLGFBQWEsR0FBRyxJQUFJc0ksS0FBSztRQUM1QkMsc0JBQXNCO0lBQ3hCO0lBRUE5VCxLQUFLa00sZ0JBQWdCLEdBQUcsQ0FBQztJQUN6QmxNLEtBQUtrSywwQkFBMEIsR0FBRyxFQUFFO0lBRXBDbEssS0FBS3dOLGVBQWUsR0FBRyxDQUFDO0lBRXhCeE4sS0FBSytULHNCQUFzQixHQUFHLENBQUM7SUFFL0IvVCxLQUFLZ1UsUUFBUSxHQUFHLElBQUkzTixPQUFPLHlCQUF5QjtJQUVwRHJHLEtBQUtpVSxhQUFhLEdBQUcsSUFBSWxVO0lBRXpCQyxLQUFLaVUsYUFBYSxDQUFDaFIsUUFBUSxDQUFDLFNBQVVyQixNQUFNO1FBQzFDLG1EQUFtRDtRQUNuREEsT0FBTzBJLGNBQWMsR0FBRztRQUV4QixJQUFJTSxZQUFZLFNBQVVDLE1BQU0sRUFBRUMsZ0JBQWdCO1lBQ2hELElBQUluRCxNQUFNO2dCQUFDQSxLQUFLO2dCQUFTa0QsUUFBUUE7WUFBTTtZQUN2QyxJQUFJQyxrQkFDRm5ELElBQUltRCxnQkFBZ0IsR0FBR0E7WUFDekJsSixPQUFPUSxJQUFJLENBQUM0RixVQUFVMkMsWUFBWSxDQUFDaEQ7UUFDckM7UUFFQS9GLE9BQU9ELEVBQUUsQ0FBQyxRQUFRLFNBQVV1UyxPQUFPO1lBQ2pDLElBQUluTyxPQUFPb08saUJBQWlCLEVBQUU7Z0JBQzVCcE8sT0FBTzJFLE1BQU0sQ0FBQyxnQkFBZ0J3SjtZQUNoQztZQUNBLElBQUk7Z0JBQ0YsSUFBSTtvQkFDRixJQUFJdk0sTUFBTUssVUFBVW9NLFFBQVEsQ0FBQ0Y7Z0JBQy9CLEVBQUUsT0FBT0csS0FBSztvQkFDWnpKLFVBQVU7b0JBQ1Y7Z0JBQ0Y7Z0JBQ0EsSUFBSWpELFFBQVEsUUFBUSxDQUFDQSxJQUFJQSxHQUFHLEVBQUU7b0JBQzVCaUQsVUFBVSxlQUFlakQ7b0JBQ3pCO2dCQUNGO2dCQUVBLElBQUlBLElBQUlBLEdBQUcsS0FBSyxXQUFXO29CQUN6QixJQUFJL0YsT0FBTzBJLGNBQWMsRUFBRTt3QkFDekJNLFVBQVUscUJBQXFCakQ7d0JBQy9CO29CQUNGO29CQUVBM0gsS0FBS3NVLGNBQWMsQ0FBQzFTLFFBQVErRjtvQkFFNUI7Z0JBQ0Y7Z0JBRUEsSUFBSSxDQUFDL0YsT0FBTzBJLGNBQWMsRUFBRTtvQkFDMUJNLFVBQVUsc0JBQXNCakQ7b0JBQ2hDO2dCQUNGO2dCQUNBL0YsT0FBTzBJLGNBQWMsQ0FBQ1MsY0FBYyxDQUFDcEQ7WUFDdkMsRUFBRSxPQUFPd0ssR0FBRztnQkFDVix5QkFBeUI7Z0JBQ3pCcE0sT0FBTzJFLE1BQU0sQ0FBQywrQ0FBK0MvQyxLQUFLd0s7WUFDcEU7UUFDRjtRQUVBdlEsT0FBT0QsRUFBRSxDQUFDLFNBQVM7WUFDakIsSUFBSUMsT0FBTzBJLGNBQWMsRUFBRTtnQkFDekIxSSxPQUFPMEksY0FBYyxDQUFDckQsS0FBSztZQUM3QjtRQUNGO0lBQ0Y7QUFDRjtBQUVBbkUsT0FBT0MsTUFBTSxDQUFDMlEsT0FBTzFRLFNBQVMsRUFBRTtJQUU5Qjs7Ozs7O0dBTUMsR0FDRHVSLGNBQWMsU0FBVXBOLEVBQUU7UUFDeEIsSUFBSW5ILE9BQU8sSUFBSTtRQUNmLE9BQU9BLEtBQUs0VCxnQkFBZ0IsQ0FBQzNRLFFBQVEsQ0FBQ2tFO0lBQ3hDO0lBRUE7Ozs7Ozs7O0dBUUMsR0FDRHFOLHdCQUF1QjFMLGNBQWMsRUFBRTJMLFFBQVE7UUFDN0MsSUFBSSxDQUFDM1IsT0FBT0ssTUFBTSxDQUFDaUIsdUJBQXVCc1EsUUFBUSxDQUFDRCxXQUFXO1lBQzVELE1BQU0sSUFBSXJJLE1BQU0sQ0FBQyx3QkFBd0IsRUFBRXFJLFNBQVM7dUJBQ25DLEVBQUUzTCxnQkFBZ0I7UUFDckM7UUFDQSxJQUFJLENBQUNpTCxzQkFBc0IsQ0FBQ2pMLGVBQWUsR0FBRzJMO0lBQ2hEO0lBRUE7Ozs7Ozs7O0dBUUMsR0FDRDFMLHdCQUF1QkQsY0FBYztRQUNuQyxPQUFPLElBQUksQ0FBQ2lMLHNCQUFzQixDQUFDakwsZUFBZSxJQUM3QyxJQUFJLENBQUNwRCxPQUFPLENBQUNpTywwQkFBMEI7SUFDOUM7SUFFQTs7Ozs7O0dBTUMsR0FDRGdCLFdBQVcsU0FBVXhOLEVBQUU7UUFDckIsSUFBSW5ILE9BQU8sSUFBSTtRQUNmLE9BQU9BLEtBQUt1TCxhQUFhLENBQUN0SSxRQUFRLENBQUNrRTtJQUNyQztJQUVBbU4sZ0JBQWdCLFNBQVUxUyxNQUFNLEVBQUUrRixHQUFHO1FBQ25DLElBQUkzSCxPQUFPLElBQUk7UUFFZix1RUFBdUU7UUFDdkUsK0RBQStEO1FBQy9ELElBQUksQ0FBRSxRQUFRMkgsSUFBSWxDLE9BQU8sS0FBTSxZQUN6QndHLE1BQU0yRyxPQUFPLENBQUNqTCxJQUFJaU4sT0FBTyxLQUN6QmpOLElBQUlpTixPQUFPLENBQUMvQixLQUFLLENBQUMvQixhQUNsQm5KLElBQUlpTixPQUFPLENBQUNGLFFBQVEsQ0FBQy9NLElBQUlsQyxPQUFPLElBQUk7WUFDeEM3RCxPQUFPUSxJQUFJLENBQUM0RixVQUFVMkMsWUFBWSxDQUFDO2dCQUFDaEQsS0FBSztnQkFDZmxDLFNBQVN1QyxVQUFVNk0sc0JBQXNCLENBQUMsRUFBRTtZQUFBO1lBQ3RFalQsT0FBT3FGLEtBQUs7WUFDWjtRQUNGO1FBRUEsNERBQTREO1FBQzVELHNEQUFzRDtRQUN0RCxJQUFJeEIsVUFBVXFQLGlCQUFpQm5OLElBQUlpTixPQUFPLEVBQUU1TSxVQUFVNk0sc0JBQXNCO1FBRTVFLElBQUlsTixJQUFJbEMsT0FBTyxLQUFLQSxTQUFTO1lBQzNCLHlFQUF5RTtZQUN6RSx5RUFBeUU7WUFDekUsa0JBQWtCO1lBQ2xCN0QsT0FBT1EsSUFBSSxDQUFDNEYsVUFBVTJDLFlBQVksQ0FBQztnQkFBQ2hELEtBQUs7Z0JBQVVsQyxTQUFTQTtZQUFPO1lBQ25FN0QsT0FBT3FGLEtBQUs7WUFDWjtRQUNGO1FBRUEsOENBQThDO1FBQzlDLHFEQUFxRDtRQUNyRCx5RUFBeUU7UUFDekVyRixPQUFPMEksY0FBYyxHQUFHLElBQUk5RSxRQUFReEYsTUFBTXlGLFNBQVM3RCxRQUFRNUIsS0FBSzBGLE9BQU87UUFDdkUxRixLQUFLZ1UsUUFBUSxDQUFDbkssR0FBRyxDQUFDakksT0FBTzBJLGNBQWMsQ0FBQzNFLEVBQUUsRUFBRS9ELE9BQU8wSSxjQUFjO1FBQ2pFdEssS0FBSzRULGdCQUFnQixDQUFDcEksSUFBSSxDQUFDLFNBQVUzSSxRQUFRO1lBQzNDLElBQUlqQixPQUFPMEksY0FBYyxFQUN2QnpILFNBQVNqQixPQUFPMEksY0FBYyxDQUFDdEQsZ0JBQWdCO1lBQ2pELE9BQU87UUFDVDtJQUNGO0lBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXFCQyxHQUVEOzs7Ozs7O0dBT0MsR0FDRCtOLFNBQVMsU0FBVWhKLElBQUksRUFBRTVCLE9BQU8sRUFBRXpFLE9BQU87UUFDdkMsSUFBSTFGLE9BQU8sSUFBSTtRQUVmLElBQUksQ0FBQ2dWLFNBQVNqSixPQUFPO1lBQ25CckcsVUFBVUEsV0FBVyxDQUFDO1lBRXRCLElBQUlxRyxRQUFRQSxRQUFRL0wsS0FBS2tNLGdCQUFnQixFQUFFO2dCQUN6Q25HLE9BQU8yRSxNQUFNLENBQUMsdUNBQXVDcUIsT0FBTztnQkFDNUQ7WUFDRjtZQUVBLElBQUl6RCxRQUFRMk0sV0FBVyxJQUFJLENBQUN2UCxRQUFRd1AsT0FBTyxFQUFFO2dCQUMzQywyREFBMkQ7Z0JBQzNELHVEQUF1RDtnQkFDdkQsNERBQTREO2dCQUM1RCx5REFBeUQ7Z0JBQ3pELDREQUE0RDtnQkFDNUQsNERBQTREO2dCQUM1RCx1Q0FBdUM7Z0JBQ3ZDLElBQUksQ0FBQ2xWLEtBQUttVix3QkFBd0IsRUFBRTtvQkFDbENuVixLQUFLbVYsd0JBQXdCLEdBQUc7b0JBQ2hDcFAsT0FBTzJFLE1BQU0sQ0FDbkIsMEVBQ0EsNEVBQ0EsMEVBQ0EsNENBQ0EsU0FDQSxtRUFDQSxTQUNBLHVDQUNBLFNBQ0EsaUZBQ0E7Z0JBQ0k7WUFDRjtZQUVBLElBQUlxQixNQUNGL0wsS0FBS2tNLGdCQUFnQixDQUFDSCxLQUFLLEdBQUc1QjtpQkFDM0I7Z0JBQ0huSyxLQUFLa0ssMEJBQTBCLENBQUNwTCxJQUFJLENBQUNxTDtnQkFDckMsa0VBQWtFO2dCQUNsRSx1RUFBdUU7Z0JBQ3ZFLHlEQUF5RDtnQkFDekRuSyxLQUFLZ1UsUUFBUSxDQUFDcFIsT0FBTyxDQUFDLFNBQVVnRixPQUFPO29CQUNyQyxJQUFJLENBQUNBLFFBQVFsQiwwQkFBMEIsRUFBRTt3QkFDdkNrQixRQUFRd0Msa0JBQWtCLENBQUNEO29CQUM3QjtnQkFDRjtZQUNGO1FBQ0YsT0FDSTtZQUNGckgsT0FBT3NTLE9BQU8sQ0FBQ3JKLE1BQU1uSixPQUFPLENBQUMsU0FBUyxDQUFDeVMsS0FBSzdTLE1BQU07Z0JBQ2hEeEMsS0FBSytVLE9BQU8sQ0FBQ00sS0FBSzdTLE9BQU8sQ0FBQztZQUM1QjtRQUNGO0lBQ0Y7SUFFQWdJLGdCQUFnQixTQUFVNUMsT0FBTztRQUMvQixJQUFJNUgsT0FBTyxJQUFJO1FBQ2ZBLEtBQUtnVSxRQUFRLENBQUNoSyxNQUFNLENBQUNwQyxRQUFRakMsRUFBRTtJQUNqQztJQUVBOzs7Ozs7R0FNQyxHQUNEMlAsYUFBYTtRQUNYLE9BQU9wUSxJQUFJQyx3QkFBd0IsQ0FBQ29RLHlCQUF5QjtJQUMvRDtJQUVBOzs7Ozs7R0FNQyxHQUNEaEksU0FBUyxTQUFVQSxPQUFPO1FBQ3hCLElBQUl2TixPQUFPLElBQUk7UUFDZjhDLE9BQU9zUyxPQUFPLENBQUM3SCxTQUFTM0ssT0FBTyxDQUFDLFNBQVUsQ0FBQ21KLE1BQU15SixLQUFLO1lBQ3BELElBQUksT0FBT0EsU0FBUyxZQUNsQixNQUFNLElBQUlwSixNQUFNLGFBQWFMLE9BQU87WUFDdEMsSUFBSS9MLEtBQUt3TixlQUFlLENBQUN6QixLQUFLLEVBQzVCLE1BQU0sSUFBSUssTUFBTSxxQkFBcUJMLE9BQU87WUFDOUMvTCxLQUFLd04sZUFBZSxDQUFDekIsS0FBSyxHQUFHeUo7UUFDL0I7SUFDRjtJQUVBN0osTUFBTSxTQUFVSSxJQUFJLEVBQUUsR0FBR3BJLElBQUk7UUFDM0IsSUFBSUEsS0FBS3FOLE1BQU0sSUFBSSxPQUFPck4sSUFBSSxDQUFDQSxLQUFLcU4sTUFBTSxHQUFHLEVBQUUsS0FBSyxZQUFZO1lBQzlELG9FQUFvRTtZQUNwRSxvQ0FBb0M7WUFDcEMsSUFBSW5PLFdBQVdjLEtBQUs4UixHQUFHO1FBQ3pCO1FBRUEsT0FBTyxJQUFJLENBQUN2UixLQUFLLENBQUM2SCxNQUFNcEksTUFBTWQ7SUFDaEM7SUFFQSw4REFBOEQ7SUFDOUQ2UyxXQUFXLFNBQVUzSixJQUFJLEVBQUUsR0FBR3BJLElBQUk7WUFDaEJBO1FBQWhCLE1BQU0rQixVQUFVL0IsZUFBSSxDQUFDLEVBQUUsY0FBUEEsb0NBQVNnUyxjQUFjLENBQUMsc0JBQ3BDaFMsS0FBS3dILEtBQUssS0FDVixDQUFDO1FBQ0xqRyxJQUFJQyx3QkFBd0IsQ0FBQ3lRLDBCQUEwQixDQUFDO1FBQ3hELE1BQU03SCxVQUFVLElBQUlDLFFBQVEsQ0FBQ0MsU0FBU0M7WUFDcENoSixJQUFJMlEsMkJBQTJCLENBQUNDLElBQUksQ0FBQztnQkFBRS9KO2dCQUFNZ0ssb0JBQW9CO1lBQUs7WUFDdEUsSUFBSSxDQUFDQyxVQUFVLENBQUNqSyxNQUFNcEksTUFBTTtnQkFBRXNTLGlCQUFpQjtlQUFTdlEsVUFDckQ2SSxJQUFJLENBQUNOLFNBQ0xpSSxLQUFLLENBQUNoSSxRQUNOckMsT0FBTyxDQUFDO2dCQUNQM0csSUFBSTJRLDJCQUEyQixDQUFDQyxJQUFJO1lBQ3RDO1FBQ0o7UUFDQSxPQUFPL0gsUUFBUWxDLE9BQU8sQ0FBQyxJQUNyQjNHLElBQUlDLHdCQUF3QixDQUFDeVEsMEJBQTBCLENBQUM7SUFFNUQ7SUFFQTFSLE9BQU8sU0FBVTZILElBQUksRUFBRXBJLElBQUksRUFBRStCLE9BQU8sRUFBRTdDLFFBQVE7UUFDNUMsdUVBQXVFO1FBQ3ZFLDRCQUE0QjtRQUM1QixJQUFJLENBQUVBLFlBQVksT0FBTzZDLFlBQVksWUFBWTtZQUMvQzdDLFdBQVc2QztZQUNYQSxVQUFVLENBQUM7UUFDYixPQUFPO1lBQ0xBLFVBQVVBLFdBQVcsQ0FBQztRQUN4QjtRQUNBLE1BQU1xSSxVQUFVLElBQUksQ0FBQ2lJLFVBQVUsQ0FBQ2pLLE1BQU1wSSxNQUFNK0I7UUFFNUMsMkVBQTJFO1FBQzNFLHdFQUF3RTtRQUN4RSw0RUFBNEU7UUFDNUUseUVBQXlFO1FBQ3pFLCtDQUErQztRQUMvQyxJQUFJN0MsVUFBVTtZQUNaa0wsUUFBUVEsSUFBSSxDQUNWN0MsVUFBVTdJLFNBQVN3QyxXQUFXcUcsU0FDOUI4QyxhQUFhM0wsU0FBUzJMO1FBRTFCLE9BQU87WUFDTCxPQUFPVDtRQUNUO0lBQ0Y7SUFFQSxtQ0FBbUM7SUFDbkNpSSxZQUFZLFNBQVVqSyxJQUFJLEVBQUVwSSxJQUFJLEVBQUUrQixPQUFPO1FBQ3ZDLGtCQUFrQjtRQUNsQixJQUFJeUUsVUFBVSxJQUFJLENBQUNxRCxlQUFlLENBQUN6QixLQUFLO1FBRXhDLElBQUksQ0FBRTVCLFNBQVM7WUFDYixPQUFPNkQsUUFBUUUsTUFBTSxDQUNuQixJQUFJbkksT0FBT3FHLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFTCxLQUFLLFdBQVcsQ0FBQztRQUV0RDtRQUNBLDJFQUEyRTtRQUMzRSwwRUFBMEU7UUFDMUUscUNBQXFDO1FBQ3JDLElBQUl4RixTQUFTO1FBQ2IsSUFBSXNILFlBQVk7WUFDZCxNQUFNLElBQUl6QixNQUFNO1FBQ2xCO1FBQ0EsSUFBSWxLLGFBQWE7UUFDakIsSUFBSWlVLDBCQUEwQmpSLElBQUlDLHdCQUF3QixDQUFDRixHQUFHO1FBQzlELElBQUltUiwrQkFBK0JsUixJQUFJOE0sNkJBQTZCLENBQUMvTSxHQUFHO1FBQ3hFLElBQUlrSSxhQUFhO1FBRWpCLElBQUlnSix5QkFBeUI7WUFDM0I1UCxTQUFTNFAsd0JBQXdCNVAsTUFBTTtZQUN2Q3NILFlBQVksQ0FBQ3RILFNBQVc0UCx3QkFBd0J0SSxTQUFTLENBQUN0SDtZQUMxRHJFLGFBQWFpVSx3QkFBd0JqVSxVQUFVO1lBQy9DaUwsYUFBYW5GLFVBQVVxTyxXQUFXLENBQUNGLHlCQUF5QnBLO1FBQzlELE9BQU8sSUFBSXFLLDhCQUE4QjtZQUN2QzdQLFNBQVM2UCw2QkFBNkI3UCxNQUFNO1lBQzVDc0gsWUFBWSxDQUFDdEgsU0FBVzZQLDZCQUE2QnBVLFFBQVEsQ0FBQzhMLFVBQVUsQ0FBQ3ZIO1lBQ3pFckUsYUFBYWtVLDZCQUE2QmxVLFVBQVU7UUFDdEQ7UUFFQSxJQUFJd0wsYUFBYSxJQUFJMUYsVUFBVTJGLGdCQUFnQixDQUFDO1lBQzlDQyxjQUFjO1lBQ2RySDtZQUNBc0g7WUFDQTNMO1lBQ0FpTDtRQUNGO1FBRUEsT0FBTyxJQUFJYSxRQUFRLENBQUNDLFNBQVNDO1lBQzNCLElBQUl4QztZQUNKLElBQUk7Z0JBQ0ZBLFNBQVN4RyxJQUFJQyx3QkFBd0IsQ0FBQ2dKLFNBQVMsQ0FBQ1QsWUFBWSxJQUMxRFUseUJBQ0VqRSxTQUNBdUQsWUFDQXVFLE1BQU1DLEtBQUssQ0FBQ3ZPLE9BQ1osdUJBQXVCb0ksT0FBTztZQUdwQyxFQUFFLE9BQU9vRyxHQUFHO2dCQUNWLE9BQU9qRSxPQUFPaUU7WUFDaEI7WUFDQSxJQUFJLENBQUNwTSxPQUFPNkYsVUFBVSxDQUFDRixTQUFTO2dCQUM5QixPQUFPdUMsUUFBUXZDO1lBQ2pCO1lBQ0FBLE9BQU82QyxJQUFJLENBQUMrSCxLQUFLckksUUFBUXFJLElBQUlKLEtBQUssQ0FBQ2hJO1FBQ3JDLEdBQUdLLElBQUksQ0FBQzBELE1BQU1DLEtBQUs7SUFDckI7SUFFQXFFLGdCQUFnQixTQUFVQyxTQUFTO1FBQ2pDLElBQUl4VyxPQUFPLElBQUk7UUFDZixJQUFJNEgsVUFBVTVILEtBQUtnVSxRQUFRLENBQUMvTyxHQUFHLENBQUN1UjtRQUNoQyxJQUFJNU8sU0FDRixPQUFPQSxRQUFRZixVQUFVO2FBRXpCLE9BQU87SUFDWDtBQUNGO0FBRUEsSUFBSWlPLG1CQUFtQixTQUFVMkIsdUJBQXVCLEVBQ3ZCQyx1QkFBdUI7SUFDdEQsSUFBSUMsaUJBQWlCRix3QkFBd0JHLElBQUksQ0FBQyxTQUFVblIsT0FBTztRQUNqRSxPQUFPaVIsd0JBQXdCaEMsUUFBUSxDQUFDalA7SUFDMUM7SUFDQSxJQUFJLENBQUNrUixnQkFBZ0I7UUFDbkJBLGlCQUFpQkQsdUJBQXVCLENBQUMsRUFBRTtJQUM3QztJQUNBLE9BQU9DO0FBQ1Q7QUFFQXhTLFVBQVUwUyxpQkFBaUIsR0FBRy9CO0FBRzlCLDhFQUE4RTtBQUM5RSx1QkFBdUI7QUFDdkIsSUFBSXJHLHdCQUF3QixTQUFVRCxTQUFTLEVBQUVzSSxPQUFPO0lBQ3RELElBQUksQ0FBQ3RJLFdBQVcsT0FBT0E7SUFFdkIsNEVBQTRFO0lBQzVFLDZFQUE2RTtJQUM3RSw2QkFBNkI7SUFDN0IsSUFBSUEsVUFBVXVJLFlBQVksRUFBRTtRQUMxQixJQUFJLENBQUV2SSxzQkFBcUJ6SSxPQUFPcUcsS0FBSyxHQUFHO1lBQ3hDLE1BQU00SyxrQkFBa0J4SSxVQUFVeUksT0FBTztZQUN6Q3pJLFlBQVksSUFBSXpJLE9BQU9xRyxLQUFLLENBQUNvQyxVQUFVckMsS0FBSyxFQUFFcUMsVUFBVTNELE1BQU0sRUFBRTJELFVBQVUwSSxPQUFPO1lBQ2pGMUksVUFBVXlJLE9BQU8sR0FBR0Q7UUFDdEI7UUFDQSxPQUFPeEk7SUFDVDtJQUVBLDZFQUE2RTtJQUM3RSxrQkFBa0I7SUFDbEIsSUFBSSxDQUFDQSxVQUFVMkksZUFBZSxFQUFFO1FBQzlCcFIsT0FBTzJFLE1BQU0sQ0FBQyxlQUFlb00sU0FBU3RJLFVBQVU0SSxLQUFLO1FBQ3JELElBQUk1SSxVQUFVNkksY0FBYyxFQUFFO1lBQzVCdFIsT0FBTzJFLE1BQU0sQ0FBQyw0Q0FBNEM4RCxVQUFVNkksY0FBYztZQUNsRnRSLE9BQU8yRSxNQUFNO1FBQ2Y7SUFDRjtJQUVBLDhFQUE4RTtJQUM5RSx1RUFBdUU7SUFDdkUsNkZBQTZGO0lBQzdGLElBQUk4RCxVQUFVNkksY0FBYyxFQUFFO1FBQzVCLElBQUk3SSxVQUFVNkksY0FBYyxDQUFDTixZQUFZLEVBQ3ZDLE9BQU92SSxVQUFVNkksY0FBYztRQUNqQ3RSLE9BQU8yRSxNQUFNLENBQUMsZUFBZW9NLFVBQVUscUNBQ3pCO0lBQ2hCO0lBRUEsT0FBTyxJQUFJL1EsT0FBT3FHLEtBQUssQ0FBQyxLQUFLO0FBQy9CO0FBR0EsOEVBQThFO0FBQzlFLG9DQUFvQztBQUNwQyxJQUFJZ0MsMkJBQTJCLFNBQVVPLENBQUMsRUFBRW1JLE9BQU8sRUFBRW5ULElBQUksRUFBRTJULFdBQVc7SUFDcEUzVCxPQUFPQSxRQUFRLEVBQUU7SUFDakIsSUFBSTJFLE9BQU8sQ0FBQyx3QkFBd0IsRUFBRTtRQUNwQyxPQUFPaVAsTUFBTUMsZ0NBQWdDLENBQzNDN0ksR0FBR21JLFNBQVNuVCxNQUFNMlQ7SUFDdEI7SUFDQSxPQUFPM0ksRUFBRXpLLEtBQUssQ0FBQzRTLFNBQVNuVDtBQUMxQjs7Ozs7Ozs7Ozs7Ozs7QUNwdERBUSxVQUFVaUosV0FBVyxHQUFHO0lBVXRCcUssYUFBYTtRQUNYLElBQUksSUFBSSxDQUFDQyxPQUFPLEVBQUU7WUFDaEIsT0FBTztnQkFBRUMsV0FBVyxLQUFPO1lBQUU7UUFDL0I7UUFFQSxJQUFJLElBQUksQ0FBQ0MsS0FBSyxFQUFFO1lBQ2QsTUFBTSxJQUFJeEwsTUFBTTtRQUNsQjtRQUVBLElBQUksQ0FBQ3lMLGtCQUFrQjtRQUN2QixJQUFJRixZQUFZO1FBRWhCLE9BQU87WUFDTEEsV0FBVztvQkFDVCxJQUFJQSxXQUFXO3dCQUNiLE1BQU0sSUFBSXZMLE1BQU07b0JBQ2xCO29CQUNBdUwsWUFBWTtvQkFDWixJQUFJLENBQUNFLGtCQUFrQjtvQkFDdkIsTUFBTSxJQUFJLENBQUNDLFVBQVU7Z0JBQ3ZCO1FBQ0Y7SUFDRjtJQUVBckssTUFBTTtRQUNKLElBQUksSUFBSSxLQUFLdEosVUFBVVcsZ0JBQWdCLElBQUk7WUFDekMsTUFBTXNILE1BQU07UUFDZDtRQUNBLElBQUksQ0FBQzJMLEtBQUssR0FBRztRQUNiLE9BQU8sSUFBSSxDQUFDRCxVQUFVO0lBQ3hCO0lBRUFFLGFBQWF4QyxJQUFJLEVBQUU7UUFDakIsSUFBSSxJQUFJLENBQUNvQyxLQUFLLEVBQUU7WUFDZCxNQUFNLElBQUl4TCxNQUFNO1FBQ2xCO1FBQ0EsSUFBSSxDQUFDNkwscUJBQXFCLENBQUNuWixJQUFJLENBQUMwVztJQUNsQztJQUVBbkksZUFBZW1JLElBQUksRUFBRTtRQUNuQixJQUFJLElBQUksQ0FBQ29DLEtBQUssRUFBRTtZQUNkLE1BQU0sSUFBSXhMLE1BQU07UUFDbEI7UUFDQSxJQUFJLENBQUM4TCxvQkFBb0IsQ0FBQ3BaLElBQUksQ0FBQzBXO0lBQ2pDO0lBRU0yQzs7WUFDSixJQUFJQztZQUNKLE1BQU1DLGNBQWMsSUFBSXJLLFFBQVFzSSxLQUFLOEIsV0FBVzlCO1lBQ2hELElBQUksQ0FBQ2pKLGNBQWMsQ0FBQytLO1lBQ3BCLE1BQU0sSUFBSSxDQUFDM0ssR0FBRztZQUNkLE9BQU80SztRQUNUOztJQUVBQyxhQUFhO1FBQ1gsT0FBTyxJQUFJLENBQUNILFdBQVc7SUFDekI7SUFFTUw7O1lBQ0osSUFBSSxJQUFJLENBQUNGLEtBQUssRUFBRTtnQkFDZCxNQUFNLElBQUl4TCxNQUFNO1lBQ2xCO1lBRUEsSUFBSSxDQUFDLElBQUksQ0FBQzJMLEtBQUssSUFBSSxJQUFJLENBQUNGLGtCQUFrQixHQUFHLEdBQUc7Z0JBQzlDO1lBQ0Y7WUFFQSxNQUFNVSxpQkFBaUIsQ0FBTy9DO29CQUM1QixJQUFJO3dCQUNGLE1BQU1BLEtBQUssSUFBSTtvQkFDakIsRUFBRSxPQUFPbkIsS0FBSzt3QkFDWnRPLE9BQU8yRSxNQUFNLENBQUMsc0NBQXNDMko7b0JBQ3REO2dCQUNGO1lBRUEsSUFBSSxDQUFDd0Qsa0JBQWtCO1lBRXZCLGdEQUFnRDtZQUNoRCxNQUFNVyxrQkFBa0I7bUJBQUksSUFBSSxDQUFDUCxxQkFBcUI7YUFBQztZQUN2RCxJQUFJLENBQUNBLHFCQUFxQixHQUFHLEVBQUU7WUFDL0IsTUFBTWpLLFFBQVE0QixHQUFHLENBQUM0SSxnQkFBZ0IzSSxHQUFHLENBQUN6SSxNQUFNbVIsZUFBZW5SO1lBRTNELElBQUksQ0FBQ3lRLGtCQUFrQjtZQUV2QixJQUFJLElBQUksQ0FBQ0Esa0JBQWtCLEtBQUssR0FBRztnQkFDakMsSUFBSSxDQUFDRCxLQUFLLEdBQUc7Z0JBQ2IsK0NBQStDO2dCQUMvQyxNQUFNekUsWUFBWTt1QkFBSSxJQUFJLENBQUMrRSxvQkFBb0I7aUJBQUM7Z0JBQ2hELElBQUksQ0FBQ0Esb0JBQW9CLEdBQUcsRUFBRTtnQkFDOUIsTUFBTWxLLFFBQVE0QixHQUFHLENBQUN1RCxVQUFVdEQsR0FBRyxDQUFDekksTUFBTW1SLGVBQWVuUjtZQUN2RDtRQUNGOztJQUVBa0csU0FBUztRQUNQLElBQUksQ0FBQyxJQUFJLENBQUNzSyxLQUFLLEVBQUU7WUFDZixNQUFNLElBQUl4TCxNQUFNO1FBQ2xCO1FBQ0EsSUFBSSxDQUFDc0wsT0FBTyxHQUFHO0lBQ2pCO0lBM0dBLGFBQWM7UUFDWixJQUFJLENBQUNLLEtBQUssR0FBRztRQUNiLElBQUksQ0FBQ0gsS0FBSyxHQUFHO1FBQ2IsSUFBSSxDQUFDRixPQUFPLEdBQUc7UUFDZixJQUFJLENBQUNHLGtCQUFrQixHQUFHO1FBQzFCLElBQUksQ0FBQ0kscUJBQXFCLEdBQUcsRUFBRTtRQUMvQixJQUFJLENBQUNDLG9CQUFvQixHQUFHLEVBQUU7SUFDaEM7QUFxR0Y7QUFFQS9ULFVBQVVhLGtCQUFrQixHQUFHLElBQUllLE9BQU8wUyxtQkFBbUI7Ozs7Ozs7Ozs7Ozs7QUMvRzdELDhFQUE4RTtBQUM5RSx5RUFBeUU7QUFDekUsNEVBQTRFOztBQUU1RXRVLFVBQVV1VSxTQUFTLEdBQUcsU0FBVWhULE9BQU87SUFDckMsSUFBSTFGLE9BQU8sSUFBSTtJQUNmMEYsVUFBVUEsV0FBVyxDQUFDO0lBRXRCMUYsS0FBSzJZLE1BQU0sR0FBRztJQUNkLDhFQUE4RTtJQUM5RSxxRUFBcUU7SUFDckUsZUFBZTtJQUNmM1ksS0FBSzRZLHFCQUFxQixHQUFHLENBQUM7SUFDOUI1WSxLQUFLNlksMEJBQTBCLEdBQUcsQ0FBQztJQUNuQzdZLEtBQUs4WSxXQUFXLEdBQUdwVCxRQUFRb1QsV0FBVyxJQUFJO0lBQzFDOVksS0FBSytZLFFBQVEsR0FBR3JULFFBQVFxVCxRQUFRLElBQUk7QUFDdEM7QUFFQWpXLE9BQU9DLE1BQU0sQ0FBQ29CLFVBQVV1VSxTQUFTLENBQUMxVixTQUFTLEVBQUU7SUFDM0MscUNBQXFDO0lBQ3JDZ1csdUJBQXVCLFNBQVVyUixHQUFHO1FBQ2xDLElBQUkzSCxPQUFPLElBQUk7UUFDZixJQUFJLENBQUUsaUJBQWdCMkgsR0FBRSxHQUFJO1lBQzFCLE9BQU87UUFDVCxPQUFPLElBQUksT0FBT0EsSUFBSXVCLFVBQVUsS0FBTSxVQUFVO1lBQzlDLElBQUl2QixJQUFJdUIsVUFBVSxLQUFLLElBQ3JCLE1BQU1rRCxNQUFNO1lBQ2QsT0FBT3pFLElBQUl1QixVQUFVO1FBQ3ZCLE9BQU87WUFDTCxNQUFNa0QsTUFBTTtRQUNkO0lBQ0Y7SUFFQSwrREFBK0Q7SUFDL0Qsd0RBQXdEO0lBQ3hELGdFQUFnRTtJQUNoRSwyQkFBMkI7SUFDM0IsRUFBRTtJQUNGLDREQUE0RDtJQUM1RCx5Q0FBeUM7SUFDekMsRUFBRTtJQUNGLCtEQUErRDtJQUMvRCxZQUFZO0lBQ1o2TSxRQUFRLFNBQVVDLE9BQU8sRUFBRXJXLFFBQVE7UUFDakMsSUFBSTdDLE9BQU8sSUFBSTtRQUNmLElBQUkyRixLQUFLM0YsS0FBSzJZLE1BQU07UUFFcEIsSUFBSXpQLGFBQWFsSixLQUFLZ1oscUJBQXFCLENBQUNFO1FBQzVDLElBQUlDLFNBQVM7WUFBQ0QsU0FBU2pILE1BQU1DLEtBQUssQ0FBQ2dIO1lBQVVyVyxVQUFVQTtRQUFRO1FBQy9ELElBQUksQ0FBR3FHLGVBQWNsSixLQUFLNFkscUJBQXFCLEdBQUc7WUFDaEQ1WSxLQUFLNFkscUJBQXFCLENBQUMxUCxXQUFXLEdBQUcsQ0FBQztZQUMxQ2xKLEtBQUs2WSwwQkFBMEIsQ0FBQzNQLFdBQVcsR0FBRztRQUNoRDtRQUNBbEosS0FBSzRZLHFCQUFxQixDQUFDMVAsV0FBVyxDQUFDdkQsR0FBRyxHQUFHd1Q7UUFDN0NuWixLQUFLNlksMEJBQTBCLENBQUMzUCxXQUFXO1FBRTNDLElBQUlsSixLQUFLK1ksUUFBUSxJQUFJelEsT0FBTyxDQUFDLGFBQWEsRUFBRTtZQUMxQ0EsT0FBTyxDQUFDLGFBQWEsQ0FBQ0MsS0FBSyxDQUFDQyxtQkFBbUIsQ0FDN0N4SSxLQUFLOFksV0FBVyxFQUFFOVksS0FBSytZLFFBQVEsRUFBRTtRQUNyQztRQUVBLE9BQU87WUFDTDFPLE1BQU07Z0JBQ0osSUFBSXJLLEtBQUsrWSxRQUFRLElBQUl6USxPQUFPLENBQUMsYUFBYSxFQUFFO29CQUMxQ0EsT0FBTyxDQUFDLGFBQWEsQ0FBQ0MsS0FBSyxDQUFDQyxtQkFBbUIsQ0FDN0N4SSxLQUFLOFksV0FBVyxFQUFFOVksS0FBSytZLFFBQVEsRUFBRSxDQUFDO2dCQUN0QztnQkFDQSxPQUFPL1ksS0FBSzRZLHFCQUFxQixDQUFDMVAsV0FBVyxDQUFDdkQsR0FBRztnQkFDakQzRixLQUFLNlksMEJBQTBCLENBQUMzUCxXQUFXO2dCQUMzQyxJQUFJbEosS0FBSzZZLDBCQUEwQixDQUFDM1AsV0FBVyxLQUFLLEdBQUc7b0JBQ3JELE9BQU9sSixLQUFLNFkscUJBQXFCLENBQUMxUCxXQUFXO29CQUM3QyxPQUFPbEosS0FBSzZZLDBCQUEwQixDQUFDM1AsV0FBVztnQkFDcEQ7WUFDRjtRQUNGO0lBQ0Y7SUFFQSw4REFBOEQ7SUFDOUQsb0VBQW9FO0lBQ3BFLDhCQUE4QjtJQUM5QixFQUFFO0lBQ0YsNkRBQTZEO0lBQzdELG9FQUFvRTtJQUNwRSxFQUFFO0lBQ0Ysa0VBQWtFO0lBQ2xFa1EsTUFBTSxTQUFnQkMsWUFBWTs7WUFDaEMsSUFBSXJaLE9BQU8sSUFBSTtZQUVmLElBQUlrSixhQUFhbEosS0FBS2daLHFCQUFxQixDQUFDSztZQUU1QyxJQUFJLENBQUVuUSxlQUFjbEosS0FBSzRZLHFCQUFxQixHQUFHO2dCQUMvQztZQUNGO1lBRUEsSUFBSVUseUJBQXlCdFosS0FBSzRZLHFCQUFxQixDQUFDMVAsV0FBVztZQUNuRSxJQUFJcVEsY0FBYyxFQUFFO1lBQ3BCelcsT0FBT3NTLE9BQU8sQ0FBQ2tFLHdCQUF3QjFXLE9BQU8sQ0FBQyxTQUFVLENBQUMrQyxJQUFJNlQsRUFBRTtnQkFDOUQsSUFBSXhaLEtBQUt5WixRQUFRLENBQUNKLGNBQWNHLEVBQUVOLE9BQU8sR0FBRztvQkFDMUNLLFlBQVl6YSxJQUFJLENBQUM2RztnQkFDbkI7WUFDRjtZQUVBLDJFQUEyRTtZQUMzRSwyRUFBMkU7WUFDM0Usa0VBQWtFO1lBQ2xFLHVFQUF1RTtZQUN2RSx3Q0FBd0M7WUFDeEMsMkVBQTJFO1lBQzNFLDBFQUEwRTtZQUMxRSxtRUFBbUU7WUFDbkUsb0JBQW9CO1lBQ3BCLEtBQUssTUFBTUEsTUFBTTRULFlBQWE7Z0JBQzVCLElBQUk1VCxNQUFNMlQsd0JBQXdCO29CQUNoQyxNQUFNQSxzQkFBc0IsQ0FBQzNULEdBQUcsQ0FBQzlDLFFBQVEsQ0FBQ3dXO2dCQUM1QztZQUNGO1FBQ0Y7O0lBRUEsNkVBQTZFO0lBQzdFLEVBQUU7SUFDRixZQUFZO0lBQ1osbURBQW1EO0lBQ25ELHFEQUFxRDtJQUNyRCwwQkFBMEI7SUFDMUIsNERBQTREO0lBQzVELHFFQUFxRTtJQUNyRSw0REFBNEQ7SUFDNUQscURBQXFEO0lBQ3JELHNCQUFzQjtJQUN0QixxRUFBcUU7SUFDckUseUVBQXlFO0lBQ3pFLDRCQUE0QjtJQUM1Qiw0RUFBNEU7SUFDNUUsdUVBQXVFO0lBQ3ZFLHdDQUF3QztJQUN4Q0ksVUFBVSxTQUFVSixZQUFZLEVBQUVILE9BQU87UUFDdkMsMEVBQTBFO1FBQzFFLHdFQUF3RTtRQUN4RSx5RUFBeUU7UUFDekUsa0VBQWtFO1FBQ2xFLHlFQUF5RTtRQUN6RSxJQUFJLE9BQU9HLGFBQWExVCxFQUFFLEtBQU0sWUFDNUIsT0FBT3VULFFBQVF2VCxFQUFFLEtBQU0sWUFDdkIwVCxhQUFhMVQsRUFBRSxLQUFLdVQsUUFBUXZULEVBQUUsRUFBRTtZQUNsQyxPQUFPO1FBQ1Q7UUFDQSxJQUFJMFQsYUFBYTFULEVBQUUsWUFBWWtNLFFBQVE2SCxRQUFRLElBQzNDUixRQUFRdlQsRUFBRSxZQUFZa00sUUFBUTZILFFBQVEsSUFDdEMsQ0FBRUwsYUFBYTFULEVBQUUsQ0FBQ2dVLE1BQU0sQ0FBQ1QsUUFBUXZULEVBQUUsR0FBRztZQUN4QyxPQUFPO1FBQ1Q7UUFFQSxPQUFPN0MsT0FBTzhXLElBQUksQ0FBQ1YsU0FBU3JHLEtBQUssQ0FBQyxTQUFVd0MsR0FBRztZQUM3QyxPQUFPLENBQUVBLFFBQU9nRSxZQUFXLEtBQU1wSCxNQUFNMEgsTUFBTSxDQUFDVCxPQUFPLENBQUM3RCxJQUFJLEVBQUVnRSxZQUFZLENBQUNoRSxJQUFJO1FBQzlFO0lBQ0g7QUFDRjtBQUVBLCtFQUErRTtBQUMvRSwyRUFBMkU7QUFDM0UsZ0ZBQWdGO0FBQ2hGLDZFQUE2RTtBQUM3RSw0QkFBNEI7QUFDNUJsUixVQUFVMFYscUJBQXFCLEdBQUcsSUFBSTFWLFVBQVV1VSxTQUFTLENBQUM7SUFDeERLLFVBQVU7QUFDWjs7Ozs7Ozs7Ozs7Ozs7QUNyS0EsSUFBSXRhLFFBQVFDLEdBQUcsQ0FBQ29iLDBCQUEwQixFQUFFO0lBQzFDamEsMEJBQTBCaWEsMEJBQTBCLEdBQ2xEcmIsUUFBUUMsR0FBRyxDQUFDb2IsMEJBQTBCO0FBQzFDO0FBRUEvVCxPQUFPN0UsTUFBTSxHQUFHLElBQUl3UztBQUVwQjNOLE9BQU9nVSxPQUFPLEdBQUcsU0FBZ0JWLFlBQVk7O1FBQzNDLE1BQU1sVixVQUFVMFYscUJBQXFCLENBQUNULElBQUksQ0FBQ0M7SUFDN0M7O0FBRUEsd0RBQXdEO0FBQ3hELGdDQUFnQztBQUU5QjtJQUNFO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtDQUNELENBQUN6VyxPQUFPLENBQ1QsU0FBU21KLElBQUk7SUFDWGhHLE1BQU0sQ0FBQ2dHLEtBQUssR0FBR2hHLE9BQU83RSxNQUFNLENBQUM2SyxLQUFLLENBQUN2QyxJQUFJLENBQUN6RCxPQUFPN0UsTUFBTTtBQUN2RDs7Ozs7Ozs7Ozs7Ozs7QUNsQkYsT0FBTyxNQUFNOFk7SUFTWHpLLFlBQW1DO1FBQ2pDLE9BQU8sQ0FBQztJQUNWO0lBRUEwSyxXQUNFblEsa0JBQTBCLEVBQzFCdUwsR0FBVyxFQUNYNkUsZUFBZ0MsRUFDMUI7UUFDTkEsZUFBZSxDQUFDN0UsSUFBSSxHQUFHaFE7SUFDekI7SUFFQThVLFlBQ0VyUSxrQkFBMEIsRUFDMUJ1TCxHQUFXLEVBQ1g3UyxLQUFVLEVBQ1YwWCxlQUFnQyxFQUNoQ0UsS0FBZSxFQUNUO1FBQ05GLGVBQWUsQ0FBQzdFLElBQUksR0FBRzdTO0lBQ3pCO0lBekJBLGFBQWM7UUFIZCx1QkFBUTZYLFlBQVI7UUFDQSx1QkFBUUMsYUFBUjtRQUdFLElBQUksQ0FBQ0QsUUFBUSxHQUFHLElBQUk3RyxPQUFlLDRCQUE0QjtRQUMvRCxJQUFJLENBQUM4RyxTQUFTLEdBQUcsSUFBSWpVLE9BQTRCLHFEQUFxRDtJQUN4RztBQXVCRjs7Ozs7Ozs7Ozs7Ozs7QUN2QzBEO0FBQ0k7QUFVOUQsT0FBTyxNQUFNZDtJQWdCSjZELFVBQW1CO1FBQ3hCLE9BQU8sSUFBSSxDQUFDaUcsU0FBUyxDQUFDa0wsSUFBSSxLQUFLO0lBQ2pDO0lBRU9wTCxLQUFLcUwsUUFBK0IsRUFBUTtRQUNqRDFMLGFBQWFDLFFBQVEsQ0FBQ3lMLFNBQVNuTCxTQUFTLEVBQUUsSUFBSSxDQUFDQSxTQUFTLEVBQUU7WUFDeERMLE1BQU0sSUFBSSxDQUFDeUwsWUFBWSxDQUFDalIsSUFBSSxDQUFDLElBQUk7WUFDakM0RixXQUFXLENBQUN6SixJQUFZK1U7Z0JBQ3RCLElBQUksQ0FBQ3ZILFNBQVMsQ0FBQzVKLEtBQUssQ0FBQyxJQUFJLENBQUNULGNBQWMsRUFBRW5ELElBQUkrVSxNQUFNbkwsU0FBUztZQUMvRDtZQUNBQyxVQUFVLENBQUM3SixJQUFZZ1Y7Z0JBQ3JCLElBQUksQ0FBQ3hILFNBQVMsQ0FBQ3pKLE9BQU8sQ0FBQyxJQUFJLENBQUNaLGNBQWMsRUFBRW5EO1lBQzlDO1FBQ0Y7SUFDRjtJQUVROFUsYUFBYTlVLEVBQVUsRUFBRWdWLE1BQW9CLEVBQUVELEtBQW1CLEVBQVE7UUFDaEYsTUFBTXpSLFNBQThCLENBQUM7UUFFckM2RixhQUFhOEwsV0FBVyxDQUFDRCxPQUFPcEwsU0FBUyxJQUFJbUwsTUFBTW5MLFNBQVMsSUFBSTtZQUM5RFAsTUFBTSxDQUFDcUcsS0FBYXdGLE1BQVdDO2dCQUM3QixJQUFJLENBQUM3SSxNQUFNMEgsTUFBTSxDQUFDa0IsTUFBTUMsTUFBTTtvQkFDNUI3UixNQUFNLENBQUNvTSxJQUFJLEdBQUd5RjtnQkFDaEI7WUFDRjtZQUNBMUwsV0FBVyxDQUFDaUcsS0FBYXlGO2dCQUN2QjdSLE1BQU0sQ0FBQ29NLElBQUksR0FBR3lGO1lBQ2hCO1lBQ0F0TCxVQUFVLENBQUM2RixLQUFhd0Y7Z0JBQ3RCNVIsTUFBTSxDQUFDb00sSUFBSSxHQUFHaFE7WUFDaEI7UUFDRjtRQUVBLElBQUksQ0FBQzhOLFNBQVMsQ0FBQzFKLE9BQU8sQ0FBQyxJQUFJLENBQUNYLGNBQWMsRUFBRW5ELElBQUlzRDtJQUNsRDtJQUVPTSxNQUFNTyxrQkFBMEIsRUFBRW5FLEVBQVUsRUFBRXNELE1BQTJCLEVBQVE7UUFDdEYsSUFBSXFHLFVBQW9DLElBQUksQ0FBQ0QsU0FBUyxDQUFDcEssR0FBRyxDQUFDVTtRQUMzRCxJQUFJNEQsUUFBUTtRQUVaLElBQUksQ0FBQytGLFNBQVM7WUFDWi9GLFFBQVE7WUFDUixJQUFJeEQsT0FBTzdFLE1BQU0sQ0FBQzZILHNCQUFzQixDQUFDLElBQUksQ0FBQ0QsY0FBYyxFQUFFeEUsb0JBQW9CLEVBQUU7Z0JBQ2xGZ0wsVUFBVSxJQUFJMEs7WUFDaEIsT0FBTztnQkFDTDFLLFVBQVUsSUFBSXpLO1lBQ2hCO1lBQ0EsSUFBSSxDQUFDd0ssU0FBUyxDQUFDeEYsR0FBRyxDQUFDbEUsSUFBSTJKO1FBQ3pCO1FBRUFBLFFBQVErSyxRQUFRLENBQUM1RyxHQUFHLENBQUMzSjtRQUNyQixNQUFNb1Esa0JBQXVDLENBQUM7UUFFOUNwWCxPQUFPc1MsT0FBTyxDQUFDbk0sUUFBUXJHLE9BQU8sQ0FBQyxDQUFDLENBQUN5UyxLQUFLN1MsTUFBTTtZQUMxQzhNLFFBQVM2SyxXQUFXLENBQ2xCclEsb0JBQ0F1TCxLQUNBN1MsT0FDQTBYLGlCQUNBO1FBRUo7UUFFQSxJQUFJM1EsT0FBTztZQUNULElBQUksQ0FBQzRKLFNBQVMsQ0FBQzVKLEtBQUssQ0FBQyxJQUFJLENBQUNULGNBQWMsRUFBRW5ELElBQUl1VTtRQUNoRCxPQUFPO1lBQ0wsSUFBSSxDQUFDL0csU0FBUyxDQUFDMUosT0FBTyxDQUFDLElBQUksQ0FBQ1gsY0FBYyxFQUFFbkQsSUFBSXVVO1FBQ2xEO0lBQ0Y7SUFFT3pRLFFBQVFLLGtCQUEwQixFQUFFbkUsRUFBVSxFQUFFOEQsT0FBNEIsRUFBUTtRQUN6RixNQUFNc1IsZ0JBQXFDLENBQUM7UUFDNUMsTUFBTXpMLFVBQVUsSUFBSSxDQUFDRCxTQUFTLENBQUNwSyxHQUFHLENBQUNVO1FBRW5DLElBQUksQ0FBQzJKLFNBQVM7WUFDWixNQUFNLElBQUlsRCxNQUFNLENBQUMsK0JBQStCLEVBQUV6RyxHQUFHLFVBQVUsQ0FBQztRQUNsRTtRQUVBN0MsT0FBT3NTLE9BQU8sQ0FBQzNMLFNBQVM3RyxPQUFPLENBQUMsQ0FBQyxDQUFDeVMsS0FBSzdTLE1BQU07WUFDM0MsSUFBSUEsVUFBVTZDLFdBQVc7Z0JBQ3ZCaUssUUFBUTJLLFVBQVUsQ0FBQ25RLG9CQUFvQnVMLEtBQUswRjtZQUM5QyxPQUFPO2dCQUNMekwsUUFBUTZLLFdBQVcsQ0FBQ3JRLG9CQUFvQnVMLEtBQUs3UyxPQUFPdVk7WUFDdEQ7UUFDRjtRQUVBLElBQUksQ0FBQzVILFNBQVMsQ0FBQzFKLE9BQU8sQ0FBQyxJQUFJLENBQUNYLGNBQWMsRUFBRW5ELElBQUlvVjtJQUNsRDtJQUVPclIsUUFBUUksa0JBQTBCLEVBQUVuRSxFQUFVLEVBQVE7UUFDM0QsTUFBTTJKLFVBQVUsSUFBSSxDQUFDRCxTQUFTLENBQUNwSyxHQUFHLENBQUNVO1FBRW5DLElBQUksQ0FBQzJKLFNBQVM7WUFDWixNQUFNLElBQUlsRCxNQUFNLENBQUMsNkJBQTZCLEVBQUV6RyxJQUFJO1FBQ3REO1FBRUEySixRQUFRK0ssUUFBUSxDQUFDclEsTUFBTSxDQUFDRjtRQUV4QixJQUFJd0YsUUFBUStLLFFBQVEsQ0FBQ0UsSUFBSSxLQUFLLEdBQUc7WUFDL0IsMkJBQTJCO1lBQzNCLElBQUksQ0FBQ3BILFNBQVMsQ0FBQ3pKLE9BQU8sQ0FBQyxJQUFJLENBQUNaLGNBQWMsRUFBRW5EO1lBQzVDLElBQUksQ0FBQzBKLFNBQVMsQ0FBQ3JGLE1BQU0sQ0FBQ3JFO1FBQ3hCLE9BQU87WUFDTCxNQUFNOEQsVUFBK0IsQ0FBQztZQUN0QyxzREFBc0Q7WUFDdEQseUJBQXlCO1lBQ3pCNkYsUUFBUWdMLFNBQVMsQ0FBQzFYLE9BQU8sQ0FBQyxDQUFDb1ksZ0JBQWdCM0Y7Z0JBQ3pDL0YsUUFBUTJLLFVBQVUsQ0FBQ25RLG9CQUFvQnVMLEtBQUs1TDtZQUM5QztZQUNBLElBQUksQ0FBQzBKLFNBQVMsQ0FBQzFKLE9BQU8sQ0FBQyxJQUFJLENBQUNYLGNBQWMsRUFBRW5ELElBQUk4RDtRQUNsRDtJQUNGO0lBMUhBOzs7O0dBSUMsR0FDRCxZQUFZWCxjQUFzQixFQUFFbVMsZ0JBQWtDLENBQUU7UUFUeEUsdUJBQWlCblMsa0JBQWpCO1FBQ0EsdUJBQWlCdUcsYUFBakI7UUFDQSx1QkFBaUI4RCxhQUFqQjtRQVFFLElBQUksQ0FBQ3JLLGNBQWMsR0FBR0E7UUFDdEIsSUFBSSxDQUFDdUcsU0FBUyxHQUFHLElBQUloSjtRQUNyQixJQUFJLENBQUM4TSxTQUFTLEdBQUc4SDtJQUNuQjtBQWtIRjs7Ozs7Ozs7Ozs7Ozs7QUNsSUEsT0FBTyxNQUFNcFc7SUFVWDBLLFlBQWlDO1FBQy9CLE1BQU0zRixNQUEyQixDQUFDO1FBQ2xDLElBQUksQ0FBQzBRLFNBQVMsQ0FBQzFYLE9BQU8sQ0FBQyxDQUFDb1ksZ0JBQWdCM0Y7WUFDdEN6TCxHQUFHLENBQUN5TCxJQUFJLEdBQUcyRixjQUFjLENBQUMsRUFBRSxDQUFDeFksS0FBSztRQUNwQztRQUNBLE9BQU9vSDtJQUNUO0lBRUFxUSxXQUNFblEsa0JBQTBCLEVBQzFCdUwsR0FBVyxFQUNYNkUsZUFBZ0MsRUFDMUI7UUFDTiwrQ0FBK0M7UUFDL0MsSUFBSTdFLFFBQVEsT0FBTztRQUVuQixNQUFNMkYsaUJBQWlCLElBQUksQ0FBQ1YsU0FBUyxDQUFDclYsR0FBRyxDQUFDb1E7UUFDMUMsZ0VBQWdFO1FBQ2hFLFlBQVk7UUFDWixJQUFJLENBQUMyRixnQkFBZ0I7UUFFckIsSUFBSUUsZUFBb0I3VjtRQUV4QixJQUFLLElBQUkwTixJQUFJLEdBQUdBLElBQUlpSSxlQUFlaEssTUFBTSxFQUFFK0IsSUFBSztZQUM5QyxNQUFNb0ksYUFBYUgsY0FBYyxDQUFDakksRUFBRTtZQUNwQyxJQUFJb0ksV0FBV3JSLGtCQUFrQixLQUFLQSxvQkFBb0I7Z0JBQ3hELHdFQUF3RTtnQkFDeEUsMkJBQTJCO2dCQUMzQixJQUFJaUosTUFBTSxHQUFHbUksZUFBZUMsV0FBVzNZLEtBQUs7Z0JBQzVDd1ksZUFBZUksTUFBTSxDQUFDckksR0FBRztnQkFDekI7WUFDRjtRQUNGO1FBRUEsSUFBSWlJLGVBQWVoSyxNQUFNLEtBQUssR0FBRztZQUMvQixJQUFJLENBQUNzSixTQUFTLENBQUN0USxNQUFNLENBQUNxTDtZQUN0QjZFLGVBQWUsQ0FBQzdFLElBQUksR0FBR2hRO1FBQ3pCLE9BQU8sSUFDTDZWLGlCQUFpQjdWLGFBQ2pCLENBQUM0TSxNQUFNMEgsTUFBTSxDQUFDdUIsY0FBY0YsY0FBYyxDQUFDLEVBQUUsQ0FBQ3hZLEtBQUssR0FDbkQ7WUFDQTBYLGVBQWUsQ0FBQzdFLElBQUksR0FBRzJGLGNBQWMsQ0FBQyxFQUFFLENBQUN4WSxLQUFLO1FBQ2hEO0lBQ0Y7SUFFQTJYLFlBQ0VyUSxrQkFBMEIsRUFDMUJ1TCxHQUFXLEVBQ1g3UyxLQUFVLEVBQ1YwWCxlQUFnQyxFQUNoQ0UsUUFBaUIsS0FBSyxFQUNoQjtRQUNOLCtDQUErQztRQUMvQyxJQUFJL0UsUUFBUSxPQUFPO1FBRW5CLHlEQUF5RDtRQUN6RDdTLFFBQVF5UCxNQUFNQyxLQUFLLENBQUMxUDtRQUVwQixJQUFJLENBQUMsSUFBSSxDQUFDOFgsU0FBUyxDQUFDak8sR0FBRyxDQUFDZ0osTUFBTTtZQUM1QixJQUFJLENBQUNpRixTQUFTLENBQUN6USxHQUFHLENBQUN3TCxLQUFLO2dCQUN0QjtvQkFBRXZMLG9CQUFvQkE7b0JBQW9CdEgsT0FBT0E7Z0JBQU07YUFDeEQ7WUFDRDBYLGVBQWUsQ0FBQzdFLElBQUksR0FBRzdTO1lBQ3ZCO1FBQ0Y7UUFFQSxNQUFNd1ksaUJBQWlCLElBQUksQ0FBQ1YsU0FBUyxDQUFDclYsR0FBRyxDQUFDb1E7UUFDMUMsSUFBSWdHO1FBRUosSUFBSSxDQUFDakIsT0FBTztZQUNWaUIsTUFBTUwsZUFBZXBFLElBQUksQ0FDdkIsQ0FBQ3VFLGFBQWVBLFdBQVdyUixrQkFBa0IsS0FBS0E7UUFFdEQ7UUFFQSxJQUFJdVIsS0FBSztZQUNQLElBQUlBLFFBQVFMLGNBQWMsQ0FBQyxFQUFFLElBQUksQ0FBQy9JLE1BQU0wSCxNQUFNLENBQUNuWCxPQUFPNlksSUFBSTdZLEtBQUssR0FBRztnQkFDaEUseURBQXlEO2dCQUN6RDBYLGVBQWUsQ0FBQzdFLElBQUksR0FBRzdTO1lBQ3pCO1lBQ0E2WSxJQUFJN1ksS0FBSyxHQUFHQTtRQUNkLE9BQU87WUFDTCxxREFBcUQ7WUFDckR3WSxlQUFlbGMsSUFBSSxDQUFDO2dCQUFFZ0wsb0JBQW9CQTtnQkFBb0J0SCxPQUFPQTtZQUFNO1FBQzdFO0lBQ0Y7SUEzRkEsYUFBYztRQUhkLHVCQUFRNlgsWUFBUjtRQUNBLHVCQUFRQyxhQUFSO1FBR0UsSUFBSSxDQUFDRCxRQUFRLEdBQUcsSUFBSTdHLE9BQU8sNEJBQTRCO1FBQ3ZELGdCQUFnQjtRQUNoQixJQUFJLENBQUM4RyxTQUFTLEdBQUcsSUFBSWpVLE9BQU8scURBQXFEO0lBQ25GO0FBd0ZGIiwiZmlsZSI6Ii9wYWNrYWdlcy9kZHAtc2VydmVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IG9uY2UgZnJvbSAnbG9kYXNoLm9uY2UnO1xuaW1wb3J0IHpsaWIgZnJvbSAnbm9kZTp6bGliJztcblxuLy8gQnkgZGVmYXVsdCwgd2UgdXNlIHRoZSBwZXJtZXNzYWdlLWRlZmxhdGUgZXh0ZW5zaW9uIHdpdGggZGVmYXVsdFxuLy8gY29uZmlndXJhdGlvbi4gSWYgJFNFUlZFUl9XRUJTT0NLRVRfQ09NUFJFU1NJT04gaXMgc2V0LCB0aGVuIGl0IG11c3QgYmUgdmFsaWRcbi8vIEpTT04uIElmIGl0IHJlcHJlc2VudHMgYSBmYWxzZXkgdmFsdWUsIHRoZW4gd2UgZG8gbm90IHVzZSBwZXJtZXNzYWdlLWRlZmxhdGVcbi8vIGF0IGFsbDsgb3RoZXJ3aXNlLCB0aGUgSlNPTiB2YWx1ZSBpcyB1c2VkIGFzIGFuIGFyZ3VtZW50IHRvIGRlZmxhdGUnc1xuLy8gY29uZmlndXJlIG1ldGhvZDsgc2VlXG4vLyBodHRwczovL2dpdGh1Yi5jb20vZmF5ZS9wZXJtZXNzYWdlLWRlZmxhdGUtbm9kZS9ibG9iL21hc3Rlci9SRUFETUUubWRcbi8vXG4vLyAoV2UgZG8gdGhpcyBpbiBhbiBfLm9uY2UgaW5zdGVhZCBvZiBhdCBzdGFydHVwLCBiZWNhdXNlIHdlIGRvbid0IHdhbnQgdG9cbi8vIGNyYXNoIHRoZSB0b29sIGR1cmluZyBpc29wYWNrZXQgbG9hZCBpZiB5b3VyIEpTT04gZG9lc24ndCBwYXJzZS4gVGhpcyBpcyBvbmx5XG4vLyBhIHByb2JsZW0gYmVjYXVzZSB0aGUgdG9vbCBoYXMgdG8gbG9hZCB0aGUgRERQIHNlcnZlciBjb2RlIGp1c3QgaW4gb3JkZXIgdG9cbi8vIGJlIGEgRERQIGNsaWVudDsgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9tZXRlb3IvbWV0ZW9yL2lzc3Vlcy8zNDUyIC4pXG52YXIgd2Vic29ja2V0RXh0ZW5zaW9ucyA9IG9uY2UoZnVuY3Rpb24gKCkge1xuICB2YXIgZXh0ZW5zaW9ucyA9IFtdO1xuXG4gIHZhciB3ZWJzb2NrZXRDb21wcmVzc2lvbkNvbmZpZyA9IHByb2Nlc3MuZW52LlNFUlZFUl9XRUJTT0NLRVRfQ09NUFJFU1NJT04gP1xuICAgIEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuU0VSVkVSX1dFQlNPQ0tFVF9DT01QUkVTU0lPTikgOiB7fTtcblxuICBpZiAod2Vic29ja2V0Q29tcHJlc3Npb25Db25maWcpIHtcbiAgICBleHRlbnNpb25zLnB1c2goTnBtLnJlcXVpcmUoJ3Blcm1lc3NhZ2UtZGVmbGF0ZTInKS5jb25maWd1cmUoe1xuICAgICAgdGhyZXNob2xkOiAxMDI0LFxuICAgICAgbGV2ZWw6IHpsaWIuY29uc3RhbnRzLlpfQkVTVF9TUEVFRCxcbiAgICAgIG1lbUxldmVsOiB6bGliLmNvbnN0YW50cy5aX01JTl9NRU1MRVZFTCxcbiAgICAgIG5vQ29udGV4dFRha2VvdmVyOiB0cnVlLFxuICAgICAgbWF4V2luZG93Qml0czogemxpYi5jb25zdGFudHMuWl9NSU5fV0lORE9XQklUUyxcbiAgICAgIC4uLih3ZWJzb2NrZXRDb21wcmVzc2lvbkNvbmZpZyB8fCB7fSlcbiAgICB9KSk7XG4gIH1cblxuICByZXR1cm4gZXh0ZW5zaW9ucztcbn0pO1xuXG52YXIgcGF0aFByZWZpeCA9IF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkxfUEFUSF9QUkVGSVggfHwgIFwiXCI7XG5cblN0cmVhbVNlcnZlciA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLnJlZ2lzdHJhdGlvbl9jYWxsYmFja3MgPSBbXTtcbiAgc2VsZi5vcGVuX3NvY2tldHMgPSBbXTtcblxuICAvLyBCZWNhdXNlIHdlIGFyZSBpbnN0YWxsaW5nIGRpcmVjdGx5IG9udG8gV2ViQXBwLmh0dHBTZXJ2ZXIgaW5zdGVhZCBvZiB1c2luZ1xuICAvLyBXZWJBcHAuYXBwLCB3ZSBoYXZlIHRvIHByb2Nlc3MgdGhlIHBhdGggcHJlZml4IG91cnNlbHZlcy5cbiAgc2VsZi5wcmVmaXggPSBwYXRoUHJlZml4ICsgJy9zb2NranMnO1xuICBSb3V0ZVBvbGljeS5kZWNsYXJlKHNlbGYucHJlZml4ICsgJy8nLCAnbmV0d29yaycpO1xuXG4gIC8vIHNldCB1cCBzb2NranNcbiAgdmFyIHNvY2tqcyA9IE5wbS5yZXF1aXJlKCdzb2NranMnKTtcbiAgdmFyIHNlcnZlck9wdGlvbnMgPSB7XG4gICAgcHJlZml4OiBzZWxmLnByZWZpeCxcbiAgICBsb2c6IGZ1bmN0aW9uKCkge30sXG4gICAgLy8gdGhpcyBpcyB0aGUgZGVmYXVsdCwgYnV0IHdlIGNvZGUgaXQgZXhwbGljaXRseSBiZWNhdXNlIHdlIGRlcGVuZFxuICAgIC8vIG9uIGl0IGluIHN0cmVhbV9jbGllbnQ6SEVBUlRCRUFUX1RJTUVPVVRcbiAgICBoZWFydGJlYXRfZGVsYXk6IDQ1MDAwLFxuICAgIC8vIFRoZSBkZWZhdWx0IGRpc2Nvbm5lY3RfZGVsYXkgaXMgNSBzZWNvbmRzLCBidXQgaWYgdGhlIHNlcnZlciBlbmRzIHVwIENQVVxuICAgIC8vIGJvdW5kIGZvciB0aGF0IG11Y2ggdGltZSwgU29ja0pTIG1pZ2h0IG5vdCBub3RpY2UgdGhhdCB0aGUgdXNlciBoYXNcbiAgICAvLyByZWNvbm5lY3RlZCBiZWNhdXNlIHRoZSB0aW1lciAob2YgZGlzY29ubmVjdF9kZWxheSBtcykgY2FuIGZpcmUgYmVmb3JlXG4gICAgLy8gU29ja0pTIHByb2Nlc3NlcyB0aGUgbmV3IGNvbm5lY3Rpb24uIEV2ZW50dWFsbHkgd2UnbGwgZml4IHRoaXMgYnkgbm90XG4gICAgLy8gY29tYmluaW5nIENQVS1oZWF2eSBwcm9jZXNzaW5nIHdpdGggU29ja0pTIHRlcm1pbmF0aW9uIChlZyBhIHByb3h5IHdoaWNoXG4gICAgLy8gY29udmVydHMgdG8gVW5peCBzb2NrZXRzKSBidXQgZm9yIG5vdywgcmFpc2UgdGhlIGRlbGF5LlxuICAgIGRpc2Nvbm5lY3RfZGVsYXk6IDYwICogMTAwMCxcbiAgICAvLyBBbGxvdyBkaXNhYmxpbmcgb2YgQ09SUyByZXF1ZXN0cyB0byBhZGRyZXNzXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21ldGVvci9tZXRlb3IvaXNzdWVzLzgzMTcuXG4gICAgZGlzYWJsZV9jb3JzOiAhIXByb2Nlc3MuZW52LkRJU0FCTEVfU09DS0pTX0NPUlMsXG4gICAgLy8gU2V0IHRoZSBVU0VfSlNFU1NJT05JRCBlbnZpcm9ubWVudCB2YXJpYWJsZSB0byBlbmFibGUgc2V0dGluZyB0aGVcbiAgICAvLyBKU0VTU0lPTklEIGNvb2tpZS4gVGhpcyBpcyB1c2VmdWwgZm9yIHNldHRpbmcgdXAgcHJveGllcyB3aXRoXG4gICAgLy8gc2Vzc2lvbiBhZmZpbml0eS5cbiAgICBqc2Vzc2lvbmlkOiAhIXByb2Nlc3MuZW52LlVTRV9KU0VTU0lPTklEXG4gIH07XG5cbiAgLy8gSWYgeW91IGtub3cgeW91ciBzZXJ2ZXIgZW52aXJvbm1lbnQgKGVnLCBwcm94aWVzKSB3aWxsIHByZXZlbnQgd2Vic29ja2V0c1xuICAvLyBmcm9tIGV2ZXIgd29ya2luZywgc2V0ICRESVNBQkxFX1dFQlNPQ0tFVFMgYW5kIFNvY2tKUyBjbGllbnRzIChpZSxcbiAgLy8gYnJvd3NlcnMpIHdpbGwgbm90IHdhc3RlIHRpbWUgYXR0ZW1wdGluZyB0byB1c2UgdGhlbS5cbiAgLy8gKFlvdXIgc2VydmVyIHdpbGwgc3RpbGwgaGF2ZSBhIC93ZWJzb2NrZXQgZW5kcG9pbnQuKVxuICBpZiAocHJvY2Vzcy5lbnYuRElTQUJMRV9XRUJTT0NLRVRTKSB7XG4gICAgc2VydmVyT3B0aW9ucy53ZWJzb2NrZXQgPSBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICBzZXJ2ZXJPcHRpb25zLmZheWVfc2VydmVyX29wdGlvbnMgPSB7XG4gICAgICBleHRlbnNpb25zOiB3ZWJzb2NrZXRFeHRlbnNpb25zKClcbiAgICB9O1xuICB9XG5cbiAgc2VsZi5zZXJ2ZXIgPSBzb2NranMuY3JlYXRlU2VydmVyKHNlcnZlck9wdGlvbnMpO1xuXG4gIC8vIEluc3RhbGwgdGhlIHNvY2tqcyBoYW5kbGVycywgYnV0IHdlIHdhbnQgdG8ga2VlcCBhcm91bmQgb3VyIG93biBwYXJ0aWN1bGFyXG4gIC8vIHJlcXVlc3QgaGFuZGxlciB0aGF0IGFkanVzdHMgaWRsZSB0aW1lb3V0cyB3aGlsZSB3ZSBoYXZlIGFuIG91dHN0YW5kaW5nXG4gIC8vIHJlcXVlc3QuICBUaGlzIGNvbXBlbnNhdGVzIGZvciB0aGUgZmFjdCB0aGF0IHNvY2tqcyByZW1vdmVzIGFsbCBsaXN0ZW5lcnNcbiAgLy8gZm9yIFwicmVxdWVzdFwiIHRvIGFkZCBpdHMgb3duLlxuICBXZWJBcHAuaHR0cFNlcnZlci5yZW1vdmVMaXN0ZW5lcihcbiAgICAncmVxdWVzdCcsIFdlYkFwcC5fdGltZW91dEFkanVzdG1lbnRSZXF1ZXN0Q2FsbGJhY2spO1xuICBzZWxmLnNlcnZlci5pbnN0YWxsSGFuZGxlcnMoV2ViQXBwLmh0dHBTZXJ2ZXIpO1xuICBXZWJBcHAuaHR0cFNlcnZlci5hZGRMaXN0ZW5lcihcbiAgICAncmVxdWVzdCcsIFdlYkFwcC5fdGltZW91dEFkanVzdG1lbnRSZXF1ZXN0Q2FsbGJhY2spO1xuXG4gIC8vIFN1cHBvcnQgdGhlIC93ZWJzb2NrZXQgZW5kcG9pbnRcbiAgc2VsZi5fcmVkaXJlY3RXZWJzb2NrZXRFbmRwb2ludCgpO1xuXG4gIHNlbGYuc2VydmVyLm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24gKHNvY2tldCkge1xuICAgIC8vIHNvY2tqcyBzb21ldGltZXMgcGFzc2VzIHVzIG51bGwgaW5zdGVhZCBvZiBhIHNvY2tldCBvYmplY3RcbiAgICAvLyBzbyB3ZSBuZWVkIHRvIGd1YXJkIGFnYWluc3QgdGhhdC4gc2VlOlxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9zb2NranMvc29ja2pzLW5vZGUvaXNzdWVzLzEyMVxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9tZXRlb3IvbWV0ZW9yL2lzc3Vlcy8xMDQ2OFxuICAgIGlmICghc29ja2V0KSByZXR1cm47XG5cbiAgICAvLyBXZSB3YW50IHRvIG1ha2Ugc3VyZSB0aGF0IGlmIGEgY2xpZW50IGNvbm5lY3RzIHRvIHVzIGFuZCBkb2VzIHRoZSBpbml0aWFsXG4gICAgLy8gV2Vic29ja2V0IGhhbmRzaGFrZSBidXQgbmV2ZXIgZ2V0cyB0byB0aGUgRERQIGhhbmRzaGFrZSwgdGhhdCB3ZVxuICAgIC8vIGV2ZW50dWFsbHkga2lsbCB0aGUgc29ja2V0LiAgT25jZSB0aGUgRERQIGhhbmRzaGFrZSBoYXBwZW5zLCBERFBcbiAgICAvLyBoZWFydGJlYXRpbmcgd2lsbCB3b3JrLiBBbmQgYmVmb3JlIHRoZSBXZWJzb2NrZXQgaGFuZHNoYWtlLCB0aGUgdGltZW91dHNcbiAgICAvLyB3ZSBzZXQgYXQgdGhlIHNlcnZlciBsZXZlbCBpbiB3ZWJhcHBfc2VydmVyLmpzIHdpbGwgd29yay4gQnV0XG4gICAgLy8gZmF5ZS13ZWJzb2NrZXQgY2FsbHMgc2V0VGltZW91dCgwKSBvbiBhbnkgc29ja2V0IGl0IHRha2VzIG92ZXIsIHNvIHRoZXJlXG4gICAgLy8gaXMgYW4gXCJpbiBiZXR3ZWVuXCIgc3RhdGUgd2hlcmUgdGhpcyBkb2Vzbid0IGhhcHBlbi4gIFdlIHdvcmsgYXJvdW5kIHRoaXNcbiAgICAvLyBieSBleHBsaWNpdGx5IHNldHRpbmcgdGhlIHNvY2tldCB0aW1lb3V0IHRvIGEgcmVsYXRpdmVseSBsYXJnZSB0aW1lIGhlcmUsXG4gICAgLy8gYW5kIHNldHRpbmcgaXQgYmFjayB0byB6ZXJvIHdoZW4gd2Ugc2V0IHVwIHRoZSBoZWFydGJlYXQgaW5cbiAgICAvLyBsaXZlZGF0YV9zZXJ2ZXIuanMuXG4gICAgc29ja2V0LnNldFdlYnNvY2tldFRpbWVvdXQgPSBmdW5jdGlvbiAodGltZW91dCkge1xuICAgICAgaWYgKChzb2NrZXQucHJvdG9jb2wgPT09ICd3ZWJzb2NrZXQnIHx8XG4gICAgICAgICAgIHNvY2tldC5wcm90b2NvbCA9PT0gJ3dlYnNvY2tldC1yYXcnKVxuICAgICAgICAgICYmIHNvY2tldC5fc2Vzc2lvbi5yZWN2KSB7XG4gICAgICAgIHNvY2tldC5fc2Vzc2lvbi5yZWN2LmNvbm5lY3Rpb24uc2V0VGltZW91dCh0aW1lb3V0KTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHNvY2tldC5zZXRXZWJzb2NrZXRUaW1lb3V0KDQ1ICogMTAwMCk7XG5cbiAgICBzb2NrZXQuc2VuZCA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICBzb2NrZXQud3JpdGUoZGF0YSk7XG4gICAgfTtcbiAgICBzb2NrZXQub24oJ2Nsb3NlJywgZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5vcGVuX3NvY2tldHMgPSBzZWxmLm9wZW5fc29ja2V0cy5maWx0ZXIoZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlICE9PSBzb2NrZXQ7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBzZWxmLm9wZW5fc29ja2V0cy5wdXNoKHNvY2tldCk7XG5cbiAgICAvLyBvbmx5IHRvIHNlbmQgYSBtZXNzYWdlIGFmdGVyIGNvbm5lY3Rpb24gb24gdGVzdHMsIHVzZWZ1bCBmb3JcbiAgICAvLyBzb2NrZXQtc3RyZWFtLWNsaWVudC9zZXJ2ZXItdGVzdHMuanNcbiAgICBpZiAocHJvY2Vzcy5lbnYuVEVTVF9NRVRBREFUQSAmJiBwcm9jZXNzLmVudi5URVNUX01FVEFEQVRBICE9PSBcInt9XCIpIHtcbiAgICAgIHNvY2tldC5zZW5kKEpTT04uc3RyaW5naWZ5KHsgdGVzdE1lc3NhZ2VPbkNvbm5lY3Q6IHRydWUgfSkpO1xuICAgIH1cblxuICAgIC8vIGNhbGwgYWxsIG91ciBjYWxsYmFja3Mgd2hlbiB3ZSBnZXQgYSBuZXcgc29ja2V0LiB0aGV5IHdpbGwgZG8gdGhlXG4gICAgLy8gd29yayBvZiBzZXR0aW5nIHVwIGhhbmRsZXJzIGFuZCBzdWNoIGZvciBzcGVjaWZpYyBtZXNzYWdlcy5cbiAgICBzZWxmLnJlZ2lzdHJhdGlvbl9jYWxsYmFja3MuZm9yRWFjaChmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrKHNvY2tldCk7XG4gICAgfSk7XG4gIH0pO1xuXG59O1xuXG5PYmplY3QuYXNzaWduKFN0cmVhbVNlcnZlci5wcm90b3R5cGUsIHtcbiAgLy8gY2FsbCBteSBjYWxsYmFjayB3aGVuIGEgbmV3IHNvY2tldCBjb25uZWN0cy5cbiAgLy8gYWxzbyBjYWxsIGl0IGZvciBhbGwgY3VycmVudCBjb25uZWN0aW9ucy5cbiAgcmVnaXN0ZXI6IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLnJlZ2lzdHJhdGlvbl9jYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG4gICAgc2VsZi5hbGxfc29ja2V0cygpLmZvckVhY2goZnVuY3Rpb24gKHNvY2tldCkge1xuICAgICAgY2FsbGJhY2soc29ja2V0KTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBnZXQgYSBsaXN0IG9mIGFsbCBzb2NrZXRzXG4gIGFsbF9zb2NrZXRzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBPYmplY3QudmFsdWVzKHNlbGYub3Blbl9zb2NrZXRzKTtcbiAgfSxcblxuICAvLyBSZWRpcmVjdCAvd2Vic29ja2V0IHRvIC9zb2NranMvd2Vic29ja2V0IGluIG9yZGVyIHRvIG5vdCBleHBvc2VcbiAgLy8gc29ja2pzIHRvIGNsaWVudHMgdGhhdCB3YW50IHRvIHVzZSByYXcgd2Vic29ja2V0c1xuICBfcmVkaXJlY3RXZWJzb2NrZXRFbmRwb2ludDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIFVuZm9ydHVuYXRlbHkgd2UgY2FuJ3QgdXNlIGEgY29ubmVjdCBtaWRkbGV3YXJlIGhlcmUgc2luY2VcbiAgICAvLyBzb2NranMgaW5zdGFsbHMgaXRzZWxmIHByaW9yIHRvIGFsbCBleGlzdGluZyBsaXN0ZW5lcnNcbiAgICAvLyAobWVhbmluZyBwcmlvciB0byBhbnkgY29ubmVjdCBtaWRkbGV3YXJlcykgc28gd2UgbmVlZCB0byB0YWtlXG4gICAgLy8gYW4gYXBwcm9hY2ggc2ltaWxhciB0byBvdmVyc2hhZG93TGlzdGVuZXJzIGluXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3NvY2tqcy9zb2NranMtbm9kZS9ibG9iL2NmODIwYzU1YWY2YTk5NTNlMTY1NTg1NTVhMzFkZWNlYTU1NGY3MGUvc3JjL3V0aWxzLmNvZmZlZVxuICAgIFsncmVxdWVzdCcsICd1cGdyYWRlJ10uZm9yRWFjaCgoZXZlbnQpID0+IHtcbiAgICAgIHZhciBodHRwU2VydmVyID0gV2ViQXBwLmh0dHBTZXJ2ZXI7XG4gICAgICB2YXIgb2xkSHR0cFNlcnZlckxpc3RlbmVycyA9IGh0dHBTZXJ2ZXIubGlzdGVuZXJzKGV2ZW50KS5zbGljZSgwKTtcbiAgICAgIGh0dHBTZXJ2ZXIucmVtb3ZlQWxsTGlzdGVuZXJzKGV2ZW50KTtcblxuICAgICAgLy8gcmVxdWVzdCBhbmQgdXBncmFkZSBoYXZlIGRpZmZlcmVudCBhcmd1bWVudHMgcGFzc2VkIGJ1dFxuICAgICAgLy8gd2Ugb25seSBjYXJlIGFib3V0IHRoZSBmaXJzdCBvbmUgd2hpY2ggaXMgYWx3YXlzIHJlcXVlc3RcbiAgICAgIHZhciBuZXdMaXN0ZW5lciA9IGZ1bmN0aW9uKHJlcXVlc3QgLyosIG1vcmVBcmd1bWVudHMgKi8pIHtcbiAgICAgICAgLy8gU3RvcmUgYXJndW1lbnRzIGZvciB1c2Ugd2l0aGluIHRoZSBjbG9zdXJlIGJlbG93XG4gICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuXG4gICAgICAgIC8vIFRPRE8gcmVwbGFjZSB3aXRoIHVybCBwYWNrYWdlXG4gICAgICAgIHZhciB1cmwgPSBOcG0ucmVxdWlyZSgndXJsJyk7XG5cbiAgICAgICAgLy8gUmV3cml0ZSAvd2Vic29ja2V0IGFuZCAvd2Vic29ja2V0LyB1cmxzIHRvIC9zb2NranMvd2Vic29ja2V0IHdoaWxlXG4gICAgICAgIC8vIHByZXNlcnZpbmcgcXVlcnkgc3RyaW5nLlxuICAgICAgICB2YXIgcGFyc2VkVXJsID0gdXJsLnBhcnNlKHJlcXVlc3QudXJsKTtcbiAgICAgICAgaWYgKHBhcnNlZFVybC5wYXRobmFtZSA9PT0gcGF0aFByZWZpeCArICcvd2Vic29ja2V0JyB8fFxuICAgICAgICAgICAgcGFyc2VkVXJsLnBhdGhuYW1lID09PSBwYXRoUHJlZml4ICsgJy93ZWJzb2NrZXQvJykge1xuICAgICAgICAgIHBhcnNlZFVybC5wYXRobmFtZSA9IHNlbGYucHJlZml4ICsgJy93ZWJzb2NrZXQnO1xuICAgICAgICAgIHJlcXVlc3QudXJsID0gdXJsLmZvcm1hdChwYXJzZWRVcmwpO1xuICAgICAgICB9XG4gICAgICAgIG9sZEh0dHBTZXJ2ZXJMaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbihvbGRMaXN0ZW5lcikge1xuICAgICAgICAgIG9sZExpc3RlbmVyLmFwcGx5KGh0dHBTZXJ2ZXIsIGFyZ3MpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgICBodHRwU2VydmVyLmFkZExpc3RlbmVyKGV2ZW50LCBuZXdMaXN0ZW5lcik7XG4gICAgfSk7XG4gIH1cbn0pOyIsImltcG9ydCBpc0VtcHR5IGZyb20gJ2xvZGFzaC5pc2VtcHR5JztcbmltcG9ydCBpc09iamVjdCBmcm9tICdsb2Rhc2guaXNvYmplY3QnO1xuaW1wb3J0IGlzU3RyaW5nIGZyb20gJ2xvZGFzaC5pc3N0cmluZyc7XG5pbXBvcnQgeyBTZXNzaW9uQ29sbGVjdGlvblZpZXcgfSBmcm9tICcuL3Nlc3Npb25fY29sbGVjdGlvbl92aWV3JztcbmltcG9ydCB7IFNlc3Npb25Eb2N1bWVudFZpZXcgfSBmcm9tICcuL3Nlc3Npb25fZG9jdW1lbnRfdmlldyc7XG5cbkREUFNlcnZlciA9IHt9O1xuXG5cbi8vIFB1YmxpY2F0aW9uIHN0cmF0ZWdpZXMgZGVmaW5lIGhvdyB3ZSBoYW5kbGUgZGF0YSBmcm9tIHB1Ymxpc2hlZCBjdXJzb3JzIGF0IHRoZSBjb2xsZWN0aW9uIGxldmVsXG4vLyBUaGlzIGFsbG93cyBzb21lb25lIHRvOlxuLy8gLSBDaG9vc2UgYSB0cmFkZS1vZmYgYmV0d2VlbiBjbGllbnQtc2VydmVyIGJhbmR3aWR0aCBhbmQgc2VydmVyIG1lbW9yeSB1c2FnZVxuLy8gLSBJbXBsZW1lbnQgc3BlY2lhbCAobm9uLW1vbmdvKSBjb2xsZWN0aW9ucyBsaWtlIHZvbGF0aWxlIG1lc3NhZ2UgcXVldWVzXG5jb25zdCBwdWJsaWNhdGlvblN0cmF0ZWdpZXMgPSB7XG4gIC8vIFNFUlZFUl9NRVJHRSBpcyB0aGUgZGVmYXVsdCBzdHJhdGVneS5cbiAgLy8gV2hlbiB1c2luZyB0aGlzIHN0cmF0ZWd5LCB0aGUgc2VydmVyIG1haW50YWlucyBhIGNvcHkgb2YgYWxsIGRhdGEgYSBjb25uZWN0aW9uIGlzIHN1YnNjcmliZWQgdG8uXG4gIC8vIFRoaXMgYWxsb3dzIHVzIHRvIG9ubHkgc2VuZCBkZWx0YXMgb3ZlciBtdWx0aXBsZSBwdWJsaWNhdGlvbnMuXG4gIFNFUlZFUl9NRVJHRToge1xuICAgIHVzZUR1bW15RG9jdW1lbnRWaWV3OiBmYWxzZSxcbiAgICB1c2VDb2xsZWN0aW9uVmlldzogdHJ1ZSxcbiAgICBkb0FjY291bnRpbmdGb3JDb2xsZWN0aW9uOiB0cnVlLFxuICB9LFxuICAvLyBUaGUgTk9fTUVSR0VfTk9fSElTVE9SWSBzdHJhdGVneSByZXN1bHRzIGluIHRoZSBzZXJ2ZXIgc2VuZGluZyBhbGwgcHVibGljYXRpb24gZGF0YVxuICAvLyBkaXJlY3RseSB0byB0aGUgY2xpZW50LiBJdCBkb2VzIG5vdCByZW1lbWJlciB3aGF0IGl0IGhhcyBwcmV2aW91c2x5IHNlbnRcbiAgLy8gdG8gaXQgd2lsbCBub3QgdHJpZ2dlciByZW1vdmVkIG1lc3NhZ2VzIHdoZW4gYSBzdWJzY3JpcHRpb24gaXMgc3RvcHBlZC5cbiAgLy8gVGhpcyBzaG91bGQgb25seSBiZSBjaG9zZW4gZm9yIHNwZWNpYWwgdXNlIGNhc2VzIGxpa2Ugc2VuZC1hbmQtZm9yZ2V0IHF1ZXVlcy5cbiAgTk9fTUVSR0VfTk9fSElTVE9SWToge1xuICAgIHVzZUR1bW15RG9jdW1lbnRWaWV3OiBmYWxzZSxcbiAgICB1c2VDb2xsZWN0aW9uVmlldzogZmFsc2UsXG4gICAgZG9BY2NvdW50aW5nRm9yQ29sbGVjdGlvbjogZmFsc2UsXG4gIH0sXG4gIC8vIE5PX01FUkdFIGlzIHNpbWlsYXIgdG8gTk9fTUVSR0VfTk9fSElTVE9SWSBidXQgdGhlIHNlcnZlciB3aWxsIHJlbWVtYmVyIHRoZSBJRHMgaXQgaGFzXG4gIC8vIHNlbnQgdG8gdGhlIGNsaWVudCBzbyBpdCBjYW4gcmVtb3ZlIHRoZW0gd2hlbiBhIHN1YnNjcmlwdGlvbiBpcyBzdG9wcGVkLlxuICAvLyBUaGlzIHN0cmF0ZWd5IGNhbiBiZSB1c2VkIHdoZW4gYSBjb2xsZWN0aW9uIGlzIG9ubHkgdXNlZCBpbiBhIHNpbmdsZSBwdWJsaWNhdGlvbi5cbiAgTk9fTUVSR0U6IHtcbiAgICB1c2VEdW1teURvY3VtZW50VmlldzogZmFsc2UsXG4gICAgdXNlQ29sbGVjdGlvblZpZXc6IGZhbHNlLFxuICAgIGRvQWNjb3VudGluZ0ZvckNvbGxlY3Rpb246IHRydWUsXG4gIH0sXG4gIC8vIE5PX01FUkdFX01VTFRJIGlzIHNpbWlsYXIgdG8gYE5PX01FUkdFYCwgYnV0IGl0IGRvZXMgdHJhY2sgd2hldGhlciBhIGRvY3VtZW50IGlzXG4gIC8vIHVzZWQgYnkgbXVsdGlwbGUgcHVibGljYXRpb25zLiBUaGlzIGhhcyBzb21lIG1lbW9yeSBvdmVyaGVhZCwgYnV0IGl0IHN0aWxsIGRvZXMgbm90IGRvXG4gIC8vIGRpZmZpbmcgc28gaXQncyBmYXN0ZXIgYW5kIHNsaW1tZXIgdGhhbiBTRVJWRVJfTUVSR0UuXG4gIE5PX01FUkdFX01VTFRJOiB7XG4gICAgdXNlRHVtbXlEb2N1bWVudFZpZXc6IHRydWUsXG4gICAgdXNlQ29sbGVjdGlvblZpZXc6IHRydWUsXG4gICAgZG9BY2NvdW50aW5nRm9yQ29sbGVjdGlvbjogdHJ1ZVxuICB9XG59O1xuXG5ERFBTZXJ2ZXIucHVibGljYXRpb25TdHJhdGVnaWVzID0gcHVibGljYXRpb25TdHJhdGVnaWVzO1xuXG4vLyBUaGlzIGZpbGUgY29udGFpbnMgY2xhc3Nlczpcbi8vICogU2Vzc2lvbiAtIFRoZSBzZXJ2ZXIncyBjb25uZWN0aW9uIHRvIGEgc2luZ2xlIEREUCBjbGllbnRcbi8vICogU3Vic2NyaXB0aW9uIC0gQSBzaW5nbGUgc3Vic2NyaXB0aW9uIGZvciBhIHNpbmdsZSBjbGllbnRcbi8vICogU2VydmVyIC0gQW4gZW50aXJlIHNlcnZlciB0aGF0IG1heSB0YWxrIHRvID4gMSBjbGllbnQuIEEgRERQIGVuZHBvaW50LlxuLy9cbi8vIFNlc3Npb24gYW5kIFN1YnNjcmlwdGlvbiBhcmUgZmlsZSBzY29wZS4gRm9yIG5vdywgdW50aWwgd2UgZnJlZXplXG4vLyB0aGUgaW50ZXJmYWNlLCBTZXJ2ZXIgaXMgcGFja2FnZSBzY29wZSAoaW4gdGhlIGZ1dHVyZSBpdCBzaG91bGQgYmVcbi8vIGV4cG9ydGVkKS5cblxuXG5ERFBTZXJ2ZXIuX1Nlc3Npb25Eb2N1bWVudFZpZXcgPSBTZXNzaW9uRG9jdW1lbnRWaWV3O1xuXG5ERFBTZXJ2ZXIuX2dldEN1cnJlbnRGZW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgbGV0IGN1cnJlbnRJbnZvY2F0aW9uID0gdGhpcy5fQ3VycmVudFdyaXRlRmVuY2UuZ2V0KCk7XG4gIGlmIChjdXJyZW50SW52b2NhdGlvbikge1xuICAgIHJldHVybiBjdXJyZW50SW52b2NhdGlvbjtcbiAgfVxuICBjdXJyZW50SW52b2NhdGlvbiA9IEREUC5fQ3VycmVudE1ldGhvZEludm9jYXRpb24uZ2V0KCk7XG4gIHJldHVybiBjdXJyZW50SW52b2NhdGlvbiA/IGN1cnJlbnRJbnZvY2F0aW9uLmZlbmNlIDogdW5kZWZpbmVkO1xufTtcblxuXG5ERFBTZXJ2ZXIuX1Nlc3Npb25Db2xsZWN0aW9uVmlldyA9IFNlc3Npb25Db2xsZWN0aW9uVmlldztcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qIFNlc3Npb24gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG52YXIgU2Vzc2lvbiA9IGZ1bmN0aW9uIChzZXJ2ZXIsIHZlcnNpb24sIHNvY2tldCwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYuaWQgPSBSYW5kb20uaWQoKTtcblxuICBzZWxmLnNlcnZlciA9IHNlcnZlcjtcbiAgc2VsZi52ZXJzaW9uID0gdmVyc2lvbjtcblxuICBzZWxmLmluaXRpYWxpemVkID0gZmFsc2U7XG4gIHNlbGYuc29ja2V0ID0gc29ja2V0O1xuXG4gIC8vIFNldCB0byBudWxsIHdoZW4gdGhlIHNlc3Npb24gaXMgZGVzdHJveWVkLiBNdWx0aXBsZSBwbGFjZXMgYmVsb3dcbiAgLy8gdXNlIHRoaXMgdG8gZGV0ZXJtaW5lIGlmIHRoZSBzZXNzaW9uIGlzIGFsaXZlIG9yIG5vdC5cbiAgc2VsZi5pblF1ZXVlID0gbmV3IE1ldGVvci5fRG91YmxlRW5kZWRRdWV1ZSgpO1xuXG4gIHNlbGYuYmxvY2tlZCA9IGZhbHNlO1xuICBzZWxmLndvcmtlclJ1bm5pbmcgPSBmYWxzZTtcblxuICBzZWxmLmNhY2hlZFVuYmxvY2sgPSBudWxsO1xuXG4gIC8vIFN1YiBvYmplY3RzIGZvciBhY3RpdmUgc3Vic2NyaXB0aW9uc1xuICBzZWxmLl9uYW1lZFN1YnMgPSBuZXcgTWFwKCk7XG4gIHNlbGYuX3VuaXZlcnNhbFN1YnMgPSBbXTtcblxuICBzZWxmLnVzZXJJZCA9IG51bGw7XG5cbiAgc2VsZi5jb2xsZWN0aW9uVmlld3MgPSBuZXcgTWFwKCk7XG5cbiAgLy8gU2V0IHRoaXMgdG8gZmFsc2UgdG8gbm90IHNlbmQgbWVzc2FnZXMgd2hlbiBjb2xsZWN0aW9uVmlld3MgYXJlXG4gIC8vIG1vZGlmaWVkLiBUaGlzIGlzIGRvbmUgd2hlbiByZXJ1bm5pbmcgc3VicyBpbiBfc2V0VXNlcklkIGFuZCB0aG9zZSBtZXNzYWdlc1xuICAvLyBhcmUgY2FsY3VsYXRlZCB2aWEgYSBkaWZmIGluc3RlYWQuXG4gIHNlbGYuX2lzU2VuZGluZyA9IHRydWU7XG5cbiAgLy8gSWYgdGhpcyBpcyB0cnVlLCBkb24ndCBzdGFydCBhIG5ld2x5LWNyZWF0ZWQgdW5pdmVyc2FsIHB1Ymxpc2hlciBvbiB0aGlzXG4gIC8vIHNlc3Npb24uIFRoZSBzZXNzaW9uIHdpbGwgdGFrZSBjYXJlIG9mIHN0YXJ0aW5nIGl0IHdoZW4gYXBwcm9wcmlhdGUuXG4gIHNlbGYuX2RvbnRTdGFydE5ld1VuaXZlcnNhbFN1YnMgPSBmYWxzZTtcblxuICAvLyBXaGVuIHdlIGFyZSByZXJ1bm5pbmcgc3Vic2NyaXB0aW9ucywgYW55IHJlYWR5IG1lc3NhZ2VzXG4gIC8vIHdlIHdhbnQgdG8gYnVmZmVyIHVwIGZvciB3aGVuIHdlIGFyZSBkb25lIHJlcnVubmluZyBzdWJzY3JpcHRpb25zXG4gIHNlbGYuX3BlbmRpbmdSZWFkeSA9IFtdO1xuXG4gIC8vIExpc3Qgb2YgY2FsbGJhY2tzIHRvIGNhbGwgd2hlbiB0aGlzIGNvbm5lY3Rpb24gaXMgY2xvc2VkLlxuICBzZWxmLl9jbG9zZUNhbGxiYWNrcyA9IFtdO1xuXG5cbiAgLy8gWFhYIEhBQ0s6IElmIGEgc29ja2pzIGNvbm5lY3Rpb24sIHNhdmUgb2ZmIHRoZSBVUkwuIFRoaXMgaXNcbiAgLy8gdGVtcG9yYXJ5IGFuZCB3aWxsIGdvIGF3YXkgaW4gdGhlIG5lYXIgZnV0dXJlLlxuICBzZWxmLl9zb2NrZXRVcmwgPSBzb2NrZXQudXJsO1xuXG4gIC8vIEFsbG93IHRlc3RzIHRvIGRpc2FibGUgcmVzcG9uZGluZyB0byBwaW5ncy5cbiAgc2VsZi5fcmVzcG9uZFRvUGluZ3MgPSBvcHRpb25zLnJlc3BvbmRUb1BpbmdzO1xuXG4gIC8vIFRoaXMgb2JqZWN0IGlzIHRoZSBwdWJsaWMgaW50ZXJmYWNlIHRvIHRoZSBzZXNzaW9uLiBJbiB0aGUgcHVibGljXG4gIC8vIEFQSSwgaXQgaXMgY2FsbGVkIHRoZSBgY29ubmVjdGlvbmAgb2JqZWN0LiAgSW50ZXJuYWxseSB3ZSBjYWxsIGl0XG4gIC8vIGEgYGNvbm5lY3Rpb25IYW5kbGVgIHRvIGF2b2lkIGFtYmlndWl0eS5cbiAgc2VsZi5jb25uZWN0aW9uSGFuZGxlID0ge1xuICAgIGlkOiBzZWxmLmlkLFxuICAgIGNsb3NlOiBmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLmNsb3NlKCk7XG4gICAgfSxcbiAgICBvbkNsb3NlOiBmdW5jdGlvbiAoZm4pIHtcbiAgICAgIHZhciBjYiA9IE1ldGVvci5iaW5kRW52aXJvbm1lbnQoZm4sIFwiY29ubmVjdGlvbiBvbkNsb3NlIGNhbGxiYWNrXCIpO1xuICAgICAgaWYgKHNlbGYuaW5RdWV1ZSkge1xuICAgICAgICBzZWxmLl9jbG9zZUNhbGxiYWNrcy5wdXNoKGNiKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGlmIHdlJ3JlIGFscmVhZHkgY2xvc2VkLCBjYWxsIHRoZSBjYWxsYmFjay5cbiAgICAgICAgTWV0ZW9yLmRlZmVyKGNiKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGNsaWVudEFkZHJlc3M6IHNlbGYuX2NsaWVudEFkZHJlc3MoKSxcbiAgICBodHRwSGVhZGVyczogc2VsZi5zb2NrZXQuaGVhZGVyc1xuICB9O1xuXG4gIHNlbGYuc2VuZCh7IG1zZzogJ2Nvbm5lY3RlZCcsIHNlc3Npb246IHNlbGYuaWQgfSk7XG5cbiAgLy8gT24gaW5pdGlhbCBjb25uZWN0LCBzcGluIHVwIGFsbCB0aGUgdW5pdmVyc2FsIHB1Ymxpc2hlcnMuXG4gIHNlbGYuc3RhcnRVbml2ZXJzYWxTdWJzKCk7XG5cbiAgaWYgKHZlcnNpb24gIT09ICdwcmUxJyAmJiBvcHRpb25zLmhlYXJ0YmVhdEludGVydmFsICE9PSAwKSB7XG4gICAgLy8gV2Ugbm8gbG9uZ2VyIG5lZWQgdGhlIGxvdyBsZXZlbCB0aW1lb3V0IGJlY2F1c2Ugd2UgaGF2ZSBoZWFydGJlYXRzLlxuICAgIHNvY2tldC5zZXRXZWJzb2NrZXRUaW1lb3V0KDApO1xuXG4gICAgc2VsZi5oZWFydGJlYXQgPSBuZXcgRERQQ29tbW9uLkhlYXJ0YmVhdCh7XG4gICAgICBoZWFydGJlYXRJbnRlcnZhbDogb3B0aW9ucy5oZWFydGJlYXRJbnRlcnZhbCxcbiAgICAgIGhlYXJ0YmVhdFRpbWVvdXQ6IG9wdGlvbnMuaGVhcnRiZWF0VGltZW91dCxcbiAgICAgIG9uVGltZW91dDogZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLmNsb3NlKCk7XG4gICAgICB9LFxuICAgICAgc2VuZFBpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5zZW5kKHttc2c6ICdwaW5nJ30pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHNlbGYuaGVhcnRiZWF0LnN0YXJ0KCk7XG4gIH1cblxuICBQYWNrYWdlWydmYWN0cy1iYXNlJ10gJiYgUGFja2FnZVsnZmFjdHMtYmFzZSddLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgXCJsaXZlZGF0YVwiLCBcInNlc3Npb25zXCIsIDEpO1xufTtcblxuT2JqZWN0LmFzc2lnbihTZXNzaW9uLnByb3RvdHlwZSwge1xuICBzZW5kUmVhZHk6IGZ1bmN0aW9uIChzdWJzY3JpcHRpb25JZHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX2lzU2VuZGluZykge1xuICAgICAgc2VsZi5zZW5kKHttc2c6IFwicmVhZHlcIiwgc3Viczogc3Vic2NyaXB0aW9uSWRzfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN1YnNjcmlwdGlvbklkcy5mb3JFYWNoKGZ1bmN0aW9uIChzdWJzY3JpcHRpb25JZCkge1xuICAgICAgICBzZWxmLl9wZW5kaW5nUmVhZHkucHVzaChzdWJzY3JpcHRpb25JZCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgX2NhblNlbmQoY29sbGVjdGlvbk5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5faXNTZW5kaW5nIHx8ICF0aGlzLnNlcnZlci5nZXRQdWJsaWNhdGlvblN0cmF0ZWd5KGNvbGxlY3Rpb25OYW1lKS51c2VDb2xsZWN0aW9uVmlldztcbiAgfSxcblxuXG4gIHNlbmRBZGRlZChjb2xsZWN0aW9uTmFtZSwgaWQsIGZpZWxkcykge1xuICAgIGlmICh0aGlzLl9jYW5TZW5kKGNvbGxlY3Rpb25OYW1lKSkge1xuICAgICAgdGhpcy5zZW5kKHsgbXNnOiAnYWRkZWQnLCBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uTmFtZSwgaWQsIGZpZWxkcyB9KTtcbiAgICB9XG4gIH0sXG5cbiAgc2VuZENoYW5nZWQoY29sbGVjdGlvbk5hbWUsIGlkLCBmaWVsZHMpIHtcbiAgICBpZiAoaXNFbXB0eShmaWVsZHMpKVxuICAgICAgcmV0dXJuO1xuXG4gICAgaWYgKHRoaXMuX2NhblNlbmQoY29sbGVjdGlvbk5hbWUpKSB7XG4gICAgICB0aGlzLnNlbmQoe1xuICAgICAgICBtc2c6IFwiY2hhbmdlZFwiLFxuICAgICAgICBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uTmFtZSxcbiAgICAgICAgaWQsXG4gICAgICAgIGZpZWxkc1xuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG4gIHNlbmRSZW1vdmVkKGNvbGxlY3Rpb25OYW1lLCBpZCkge1xuICAgIGlmICh0aGlzLl9jYW5TZW5kKGNvbGxlY3Rpb25OYW1lKSkge1xuICAgICAgdGhpcy5zZW5kKHttc2c6IFwicmVtb3ZlZFwiLCBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uTmFtZSwgaWR9KTtcbiAgICB9XG4gIH0sXG5cbiAgZ2V0U2VuZENhbGxiYWNrczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4ge1xuICAgICAgYWRkZWQ6IHNlbGYuc2VuZEFkZGVkLmJpbmQoc2VsZiksXG4gICAgICBjaGFuZ2VkOiBzZWxmLnNlbmRDaGFuZ2VkLmJpbmQoc2VsZiksXG4gICAgICByZW1vdmVkOiBzZWxmLnNlbmRSZW1vdmVkLmJpbmQoc2VsZilcbiAgICB9O1xuICB9LFxuXG4gIGdldENvbGxlY3Rpb25WaWV3OiBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJldCA9IHNlbGYuY29sbGVjdGlvblZpZXdzLmdldChjb2xsZWN0aW9uTmFtZSk7XG4gICAgaWYgKCFyZXQpIHtcbiAgICAgIHJldCA9IG5ldyBTZXNzaW9uQ29sbGVjdGlvblZpZXcoY29sbGVjdGlvbk5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5nZXRTZW5kQ2FsbGJhY2tzKCkpO1xuICAgICAgc2VsZi5jb2xsZWN0aW9uVmlld3Muc2V0KGNvbGxlY3Rpb25OYW1lLCByZXQpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9LFxuXG4gIGFkZGVkKHN1YnNjcmlwdGlvbkhhbmRsZSwgY29sbGVjdGlvbk5hbWUsIGlkLCBmaWVsZHMpIHtcbiAgICBpZiAodGhpcy5zZXJ2ZXIuZ2V0UHVibGljYXRpb25TdHJhdGVneShjb2xsZWN0aW9uTmFtZSkudXNlQ29sbGVjdGlvblZpZXcpIHtcbiAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLmdldENvbGxlY3Rpb25WaWV3KGNvbGxlY3Rpb25OYW1lKTtcbiAgICAgIHZpZXcuYWRkZWQoc3Vic2NyaXB0aW9uSGFuZGxlLCBpZCwgZmllbGRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zZW5kQWRkZWQoY29sbGVjdGlvbk5hbWUsIGlkLCBmaWVsZHMpO1xuICAgIH1cbiAgfSxcblxuICByZW1vdmVkKHN1YnNjcmlwdGlvbkhhbmRsZSwgY29sbGVjdGlvbk5hbWUsIGlkKSB7XG4gICAgaWYgKHRoaXMuc2VydmVyLmdldFB1YmxpY2F0aW9uU3RyYXRlZ3koY29sbGVjdGlvbk5hbWUpLnVzZUNvbGxlY3Rpb25WaWV3KSB7XG4gICAgICBjb25zdCB2aWV3ID0gdGhpcy5nZXRDb2xsZWN0aW9uVmlldyhjb2xsZWN0aW9uTmFtZSk7XG4gICAgICB2aWV3LnJlbW92ZWQoc3Vic2NyaXB0aW9uSGFuZGxlLCBpZCk7XG4gICAgICBpZiAodmlldy5pc0VtcHR5KCkpIHtcbiAgICAgICAgIHRoaXMuY29sbGVjdGlvblZpZXdzLmRlbGV0ZShjb2xsZWN0aW9uTmFtZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2VuZFJlbW92ZWQoY29sbGVjdGlvbk5hbWUsIGlkKTtcbiAgICB9XG4gIH0sXG5cbiAgY2hhbmdlZChzdWJzY3JpcHRpb25IYW5kbGUsIGNvbGxlY3Rpb25OYW1lLCBpZCwgZmllbGRzKSB7XG4gICAgaWYgKHRoaXMuc2VydmVyLmdldFB1YmxpY2F0aW9uU3RyYXRlZ3koY29sbGVjdGlvbk5hbWUpLnVzZUNvbGxlY3Rpb25WaWV3KSB7XG4gICAgICBjb25zdCB2aWV3ID0gdGhpcy5nZXRDb2xsZWN0aW9uVmlldyhjb2xsZWN0aW9uTmFtZSk7XG4gICAgICB2aWV3LmNoYW5nZWQoc3Vic2NyaXB0aW9uSGFuZGxlLCBpZCwgZmllbGRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zZW5kQ2hhbmdlZChjb2xsZWN0aW9uTmFtZSwgaWQsIGZpZWxkcyk7XG4gICAgfVxuICB9LFxuXG4gIHN0YXJ0VW5pdmVyc2FsU3ViczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBNYWtlIGEgc2hhbGxvdyBjb3B5IG9mIHRoZSBzZXQgb2YgdW5pdmVyc2FsIGhhbmRsZXJzIGFuZCBzdGFydCB0aGVtLiBJZlxuICAgIC8vIGFkZGl0aW9uYWwgdW5pdmVyc2FsIHB1Ymxpc2hlcnMgc3RhcnQgd2hpbGUgd2UncmUgcnVubmluZyB0aGVtIChkdWUgdG9cbiAgICAvLyB5aWVsZGluZyksIHRoZXkgd2lsbCBydW4gc2VwYXJhdGVseSBhcyBwYXJ0IG9mIFNlcnZlci5wdWJsaXNoLlxuICAgIHZhciBoYW5kbGVycyA9IFsuLi5zZWxmLnNlcnZlci51bml2ZXJzYWxfcHVibGlzaF9oYW5kbGVyc107XG4gICAgaGFuZGxlcnMuZm9yRWFjaChmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgc2VsZi5fc3RhcnRTdWJzY3JpcHRpb24oaGFuZGxlcik7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gRGVzdHJveSB0aGlzIHNlc3Npb24gYW5kIHVucmVnaXN0ZXIgaXQgYXQgdGhlIHNlcnZlci5cbiAgY2xvc2U6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyBEZXN0cm95IHRoaXMgc2Vzc2lvbiwgZXZlbiBpZiBpdCdzIG5vdCByZWdpc3RlcmVkIGF0IHRoZVxuICAgIC8vIHNlcnZlci4gU3RvcCBhbGwgcHJvY2Vzc2luZyBhbmQgdGVhciBldmVyeXRoaW5nIGRvd24uIElmIGEgc29ja2V0XG4gICAgLy8gd2FzIGF0dGFjaGVkLCBjbG9zZSBpdC5cblxuICAgIC8vIEFscmVhZHkgZGVzdHJveWVkLlxuICAgIGlmICghIHNlbGYuaW5RdWV1ZSlcbiAgICAgIHJldHVybjtcblxuICAgIC8vIERyb3AgdGhlIG1lcmdlIGJveCBkYXRhIGltbWVkaWF0ZWx5LlxuICAgIHNlbGYuaW5RdWV1ZSA9IG51bGw7XG4gICAgc2VsZi5jb2xsZWN0aW9uVmlld3MgPSBuZXcgTWFwKCk7XG5cbiAgICBpZiAoc2VsZi5oZWFydGJlYXQpIHtcbiAgICAgIHNlbGYuaGVhcnRiZWF0LnN0b3AoKTtcbiAgICAgIHNlbGYuaGVhcnRiZWF0ID0gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoc2VsZi5zb2NrZXQpIHtcbiAgICAgIHNlbGYuc29ja2V0LmNsb3NlKCk7XG4gICAgICBzZWxmLnNvY2tldC5fbWV0ZW9yU2Vzc2lvbiA9IG51bGw7XG4gICAgfVxuXG4gICAgUGFja2FnZVsnZmFjdHMtYmFzZSddICYmIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgICAgXCJsaXZlZGF0YVwiLCBcInNlc3Npb25zXCIsIC0xKTtcblxuICAgIE1ldGVvci5kZWZlcihmdW5jdGlvbiAoKSB7XG4gICAgICAvLyBTdG9wIGNhbGxiYWNrcyBjYW4geWllbGQsIHNvIHdlIGRlZmVyIHRoaXMgb24gY2xvc2UuXG4gICAgICAvLyBzdWIuX2lzRGVhY3RpdmF0ZWQoKSBkZXRlY3RzIHRoYXQgd2Ugc2V0IGluUXVldWUgdG8gbnVsbCBhbmRcbiAgICAgIC8vIHRyZWF0cyBpdCBhcyBzZW1pLWRlYWN0aXZhdGVkIChpdCB3aWxsIGlnbm9yZSBpbmNvbWluZyBjYWxsYmFja3MsIGV0YykuXG4gICAgICBzZWxmLl9kZWFjdGl2YXRlQWxsU3Vic2NyaXB0aW9ucygpO1xuXG4gICAgICAvLyBEZWZlciBjYWxsaW5nIHRoZSBjbG9zZSBjYWxsYmFja3MsIHNvIHRoYXQgdGhlIGNhbGxlciBjbG9zaW5nXG4gICAgICAvLyB0aGUgc2Vzc2lvbiBpc24ndCB3YWl0aW5nIGZvciBhbGwgdGhlIGNhbGxiYWNrcyB0byBjb21wbGV0ZS5cbiAgICAgIHNlbGYuX2Nsb3NlQ2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIC8vIFVucmVnaXN0ZXIgdGhlIHNlc3Npb24uXG4gICAgc2VsZi5zZXJ2ZXIuX3JlbW92ZVNlc3Npb24oc2VsZik7XG4gIH0sXG5cbiAgLy8gU2VuZCBhIG1lc3NhZ2UgKGRvaW5nIG5vdGhpbmcgaWYgbm8gc29ja2V0IGlzIGNvbm5lY3RlZCByaWdodCBub3cpLlxuICAvLyBJdCBzaG91bGQgYmUgYSBKU09OIG9iamVjdCAoaXQgd2lsbCBiZSBzdHJpbmdpZmllZCkuXG4gIHNlbmQ6IGZ1bmN0aW9uIChtc2cpIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5zb2NrZXQpIHtcbiAgICAgIGlmIChNZXRlb3IuX3ByaW50U2VudEREUClcbiAgICAgICAgTWV0ZW9yLl9kZWJ1ZyhcIlNlbnQgRERQXCIsIEREUENvbW1vbi5zdHJpbmdpZnlERFAobXNnKSk7XG4gICAgICBzZWxmLnNvY2tldC5zZW5kKEREUENvbW1vbi5zdHJpbmdpZnlERFAobXNnKSk7XG4gICAgfVxuICB9LFxuXG4gIC8vIFNlbmQgYSBjb25uZWN0aW9uIGVycm9yLlxuICBzZW5kRXJyb3I6IGZ1bmN0aW9uIChyZWFzb24sIG9mZmVuZGluZ01lc3NhZ2UpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG1zZyA9IHttc2c6ICdlcnJvcicsIHJlYXNvbjogcmVhc29ufTtcbiAgICBpZiAob2ZmZW5kaW5nTWVzc2FnZSlcbiAgICAgIG1zZy5vZmZlbmRpbmdNZXNzYWdlID0gb2ZmZW5kaW5nTWVzc2FnZTtcbiAgICBzZWxmLnNlbmQobXNnKTtcbiAgfSxcblxuICAvLyBQcm9jZXNzICdtc2cnIGFzIGFuIGluY29taW5nIG1lc3NhZ2UuIEFzIGEgZ3VhcmQgYWdhaW5zdFxuICAvLyByYWNlIGNvbmRpdGlvbnMgZHVyaW5nIHJlY29ubmVjdGlvbiwgaWdub3JlIHRoZSBtZXNzYWdlIGlmXG4gIC8vICdzb2NrZXQnIGlzIG5vdCB0aGUgY3VycmVudGx5IGNvbm5lY3RlZCBzb2NrZXQuXG4gIC8vXG4gIC8vIFdlIHJ1biB0aGUgbWVzc2FnZXMgZnJvbSB0aGUgY2xpZW50IG9uZSBhdCBhIHRpbWUsIGluIHRoZSBvcmRlclxuICAvLyBnaXZlbiBieSB0aGUgY2xpZW50LiBUaGUgbWVzc2FnZSBoYW5kbGVyIGlzIHBhc3NlZCBhbiBpZGVtcG90ZW50XG4gIC8vIGZ1bmN0aW9uICd1bmJsb2NrJyB3aGljaCBpdCBtYXkgY2FsbCB0byBhbGxvdyBvdGhlciBtZXNzYWdlcyB0b1xuICAvLyBiZWdpbiBydW5uaW5nIGluIHBhcmFsbGVsIGluIGFub3RoZXIgZmliZXIgKGZvciBleGFtcGxlLCBhIG1ldGhvZFxuICAvLyB0aGF0IHdhbnRzIHRvIHlpZWxkKS4gT3RoZXJ3aXNlLCBpdCBpcyBhdXRvbWF0aWNhbGx5IHVuYmxvY2tlZFxuICAvLyB3aGVuIGl0IHJldHVybnMuXG4gIC8vXG4gIC8vIEFjdHVhbGx5LCB3ZSBkb24ndCBoYXZlIHRvICd0b3RhbGx5IG9yZGVyJyB0aGUgbWVzc2FnZXMgaW4gdGhpc1xuICAvLyB3YXksIGJ1dCBpdCdzIHRoZSBlYXNpZXN0IHRoaW5nIHRoYXQncyBjb3JyZWN0LiAodW5zdWIgbmVlZHMgdG9cbiAgLy8gYmUgb3JkZXJlZCBhZ2FpbnN0IHN1YiwgbWV0aG9kcyBuZWVkIHRvIGJlIG9yZGVyZWQgYWdhaW5zdCBlYWNoXG4gIC8vIG90aGVyKS5cbiAgcHJvY2Vzc01lc3NhZ2U6IGZ1bmN0aW9uIChtc2dfaW4pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCFzZWxmLmluUXVldWUpIC8vIHdlIGhhdmUgYmVlbiBkZXN0cm95ZWQuXG4gICAgICByZXR1cm47XG5cbiAgICAvLyBSZXNwb25kIHRvIHBpbmcgYW5kIHBvbmcgbWVzc2FnZXMgaW1tZWRpYXRlbHkgd2l0aG91dCBxdWV1aW5nLlxuICAgIC8vIElmIHRoZSBuZWdvdGlhdGVkIEREUCB2ZXJzaW9uIGlzIFwicHJlMVwiIHdoaWNoIGRpZG4ndCBzdXBwb3J0XG4gICAgLy8gcGluZ3MsIHByZXNlcnZlIHRoZSBcInByZTFcIiBiZWhhdmlvciBvZiByZXNwb25kaW5nIHdpdGggYSBcImJhZFxuICAgIC8vIHJlcXVlc3RcIiBmb3IgdGhlIHVua25vd24gbWVzc2FnZXMuXG4gICAgLy9cbiAgICAvLyBGaWJlcnMgYXJlIG5lZWRlZCBiZWNhdXNlIGhlYXJ0YmVhdHMgdXNlIE1ldGVvci5zZXRUaW1lb3V0LCB3aGljaFxuICAgIC8vIG5lZWRzIGEgRmliZXIuIFdlIGNvdWxkIGFjdHVhbGx5IHVzZSByZWd1bGFyIHNldFRpbWVvdXQgYW5kIGF2b2lkXG4gICAgLy8gdGhlc2UgbmV3IGZpYmVycywgYnV0IGl0IGlzIGVhc2llciB0byBqdXN0IG1ha2UgZXZlcnl0aGluZyB1c2VcbiAgICAvLyBNZXRlb3Iuc2V0VGltZW91dCBhbmQgbm90IHRoaW5rIHRvbyBoYXJkLlxuICAgIC8vXG4gICAgLy8gQW55IG1lc3NhZ2UgY291bnRzIGFzIHJlY2VpdmluZyBhIHBvbmcsIGFzIGl0IGRlbW9uc3RyYXRlcyB0aGF0XG4gICAgLy8gdGhlIGNsaWVudCBpcyBzdGlsbCBhbGl2ZS5cbiAgICBpZiAoc2VsZi5oZWFydGJlYXQpIHtcbiAgICAgIHNlbGYuaGVhcnRiZWF0Lm1lc3NhZ2VSZWNlaXZlZCgpO1xuICAgIH07XG5cbiAgICBpZiAoc2VsZi52ZXJzaW9uICE9PSAncHJlMScgJiYgbXNnX2luLm1zZyA9PT0gJ3BpbmcnKSB7XG4gICAgICBpZiAoc2VsZi5fcmVzcG9uZFRvUGluZ3MpXG4gICAgICAgIHNlbGYuc2VuZCh7bXNnOiBcInBvbmdcIiwgaWQ6IG1zZ19pbi5pZH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoc2VsZi52ZXJzaW9uICE9PSAncHJlMScgJiYgbXNnX2luLm1zZyA9PT0gJ3BvbmcnKSB7XG4gICAgICAvLyBTaW5jZSBldmVyeXRoaW5nIGlzIGEgcG9uZywgdGhlcmUgaXMgbm90aGluZyB0byBkb1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHNlbGYuaW5RdWV1ZS5wdXNoKG1zZ19pbik7XG4gICAgaWYgKHNlbGYud29ya2VyUnVubmluZylcbiAgICAgIHJldHVybjtcbiAgICBzZWxmLndvcmtlclJ1bm5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIHByb2Nlc3NOZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIG1zZyA9IHNlbGYuaW5RdWV1ZSAmJiBzZWxmLmluUXVldWUuc2hpZnQoKTtcblxuICAgICAgaWYgKCFtc2cpIHtcbiAgICAgICAgc2VsZi53b3JrZXJSdW5uaW5nID0gZmFsc2U7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gcnVuSGFuZGxlcnMoKSB7XG4gICAgICAgIHZhciBibG9ja2VkID0gdHJ1ZTtcblxuICAgICAgICB2YXIgdW5ibG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAoIWJsb2NrZWQpXG4gICAgICAgICAgICByZXR1cm47IC8vIGlkZW1wb3RlbnRcbiAgICAgICAgICBibG9ja2VkID0gZmFsc2U7XG4gICAgICAgICAgc2V0SW1tZWRpYXRlKHByb2Nlc3NOZXh0KTtcbiAgICAgICAgfTtcblxuICAgICAgICBzZWxmLnNlcnZlci5vbk1lc3NhZ2VIb29rLmVhY2goZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgICAgY2FsbGJhY2sobXNnLCBzZWxmKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKG1zZy5tc2cgaW4gc2VsZi5wcm90b2NvbF9oYW5kbGVycykge1xuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHNlbGYucHJvdG9jb2xfaGFuZGxlcnNbbXNnLm1zZ10uY2FsbChcbiAgICAgICAgICAgIHNlbGYsXG4gICAgICAgICAgICBtc2csXG4gICAgICAgICAgICB1bmJsb2NrXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIGlmIChNZXRlb3IuX2lzUHJvbWlzZShyZXN1bHQpKSB7XG4gICAgICAgICAgICByZXN1bHQuZmluYWxseSgoKSA9PiB1bmJsb2NrKCkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB1bmJsb2NrKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNlbGYuc2VuZEVycm9yKCdCYWQgcmVxdWVzdCcsIG1zZyk7XG4gICAgICAgICAgdW5ibG9jaygpOyAvLyBpbiBjYXNlIHRoZSBoYW5kbGVyIGRpZG4ndCBhbHJlYWR5IGRvIGl0XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcnVuSGFuZGxlcnMoKTtcbiAgICB9O1xuXG4gICAgcHJvY2Vzc05leHQoKTtcbiAgfSxcblxuICBwcm90b2NvbF9oYW5kbGVyczoge1xuICAgIHN1YjogYXN5bmMgZnVuY3Rpb24gKG1zZywgdW5ibG9jaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAvLyBjYWNoZVVuYmxvY2sgdGVtcG9yYXJseSwgc28gd2UgY2FuIGNhcHR1cmUgaXQgbGF0ZXJcbiAgICAgIC8vIHdlIHdpbGwgdXNlIHVuYmxvY2sgaW4gY3VycmVudCBldmVudExvb3AsIHNvIHRoaXMgaXMgc2FmZVxuICAgICAgc2VsZi5jYWNoZWRVbmJsb2NrID0gdW5ibG9jaztcblxuICAgICAgLy8gcmVqZWN0IG1hbGZvcm1lZCBtZXNzYWdlc1xuICAgICAgaWYgKHR5cGVvZiAobXNnLmlkKSAhPT0gXCJzdHJpbmdcIiB8fFxuICAgICAgICAgIHR5cGVvZiAobXNnLm5hbWUpICE9PSBcInN0cmluZ1wiIHx8XG4gICAgICAgICAgKCdwYXJhbXMnIGluIG1zZyAmJiAhKG1zZy5wYXJhbXMgaW5zdGFuY2VvZiBBcnJheSkpKSB7XG4gICAgICAgIHNlbGYuc2VuZEVycm9yKFwiTWFsZm9ybWVkIHN1YnNjcmlwdGlvblwiLCBtc2cpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICghc2VsZi5zZXJ2ZXIucHVibGlzaF9oYW5kbGVyc1ttc2cubmFtZV0pIHtcbiAgICAgICAgc2VsZi5zZW5kKHtcbiAgICAgICAgICBtc2c6ICdub3N1YicsIGlkOiBtc2cuaWQsXG4gICAgICAgICAgZXJyb3I6IG5ldyBNZXRlb3IuRXJyb3IoNDA0LCBgU3Vic2NyaXB0aW9uICcke21zZy5uYW1lfScgbm90IGZvdW5kYCl9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2VsZi5fbmFtZWRTdWJzLmhhcyhtc2cuaWQpKVxuICAgICAgICAvLyBzdWJzIGFyZSBpZGVtcG90ZW50LCBvciByYXRoZXIsIHRoZXkgYXJlIGlnbm9yZWQgaWYgYSBzdWJcbiAgICAgICAgLy8gd2l0aCB0aGF0IGlkIGFscmVhZHkgZXhpc3RzLiB0aGlzIGlzIGltcG9ydGFudCBkdXJpbmdcbiAgICAgICAgLy8gcmVjb25uZWN0LlxuICAgICAgICByZXR1cm47XG5cbiAgICAgIC8vIFhYWCBJdCdkIGJlIG11Y2ggYmV0dGVyIGlmIHdlIGhhZCBnZW5lcmljIGhvb2tzIHdoZXJlIGFueSBwYWNrYWdlIGNhblxuICAgICAgLy8gaG9vayBpbnRvIHN1YnNjcmlwdGlvbiBoYW5kbGluZywgYnV0IGluIHRoZSBtZWFuIHdoaWxlIHdlIHNwZWNpYWwgY2FzZVxuICAgICAgLy8gZGRwLXJhdGUtbGltaXRlciBwYWNrYWdlLiBUaGlzIGlzIGFsc28gZG9uZSBmb3Igd2VhayByZXF1aXJlbWVudHMgdG9cbiAgICAgIC8vIGFkZCB0aGUgZGRwLXJhdGUtbGltaXRlciBwYWNrYWdlIGluIGNhc2Ugd2UgZG9uJ3QgaGF2ZSBBY2NvdW50cy4gQVxuICAgICAgLy8gdXNlciB0cnlpbmcgdG8gdXNlIHRoZSBkZHAtcmF0ZS1saW1pdGVyIG11c3QgZXhwbGljaXRseSByZXF1aXJlIGl0LlxuICAgICAgaWYgKFBhY2thZ2VbJ2RkcC1yYXRlLWxpbWl0ZXInXSkge1xuICAgICAgICB2YXIgRERQUmF0ZUxpbWl0ZXIgPSBQYWNrYWdlWydkZHAtcmF0ZS1saW1pdGVyJ10uRERQUmF0ZUxpbWl0ZXI7XG4gICAgICAgIHZhciByYXRlTGltaXRlcklucHV0ID0ge1xuICAgICAgICAgIHVzZXJJZDogc2VsZi51c2VySWQsXG4gICAgICAgICAgY2xpZW50QWRkcmVzczogc2VsZi5jb25uZWN0aW9uSGFuZGxlLmNsaWVudEFkZHJlc3MsXG4gICAgICAgICAgdHlwZTogXCJzdWJzY3JpcHRpb25cIixcbiAgICAgICAgICBuYW1lOiBtc2cubmFtZSxcbiAgICAgICAgICBjb25uZWN0aW9uSWQ6IHNlbGYuaWRcbiAgICAgICAgfTtcblxuICAgICAgICBERFBSYXRlTGltaXRlci5faW5jcmVtZW50KHJhdGVMaW1pdGVySW5wdXQpO1xuICAgICAgICB2YXIgcmF0ZUxpbWl0UmVzdWx0ID0gRERQUmF0ZUxpbWl0ZXIuX2NoZWNrKHJhdGVMaW1pdGVySW5wdXQpO1xuICAgICAgICBpZiAoIXJhdGVMaW1pdFJlc3VsdC5hbGxvd2VkKSB7XG4gICAgICAgICAgc2VsZi5zZW5kKHtcbiAgICAgICAgICAgIG1zZzogJ25vc3ViJywgaWQ6IG1zZy5pZCxcbiAgICAgICAgICAgIGVycm9yOiBuZXcgTWV0ZW9yLkVycm9yKFxuICAgICAgICAgICAgICAndG9vLW1hbnktcmVxdWVzdHMnLFxuICAgICAgICAgICAgICBERFBSYXRlTGltaXRlci5nZXRFcnJvck1lc3NhZ2UocmF0ZUxpbWl0UmVzdWx0KSxcbiAgICAgICAgICAgICAge3RpbWVUb1Jlc2V0OiByYXRlTGltaXRSZXN1bHQudGltZVRvUmVzZXR9KVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgaGFuZGxlciA9IHNlbGYuc2VydmVyLnB1Ymxpc2hfaGFuZGxlcnNbbXNnLm5hbWVdO1xuXG4gICAgICBhd2FpdCBzZWxmLl9zdGFydFN1YnNjcmlwdGlvbihoYW5kbGVyLCBtc2cuaWQsIG1zZy5wYXJhbXMsIG1zZy5uYW1lKTtcblxuICAgICAgLy8gY2xlYW5pbmcgY2FjaGVkIHVuYmxvY2tcbiAgICAgIHNlbGYuY2FjaGVkVW5ibG9jayA9IG51bGw7XG4gICAgfSxcblxuICAgIHVuc3ViOiBmdW5jdGlvbiAobXNnKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHNlbGYuX3N0b3BTdWJzY3JpcHRpb24obXNnLmlkKTtcbiAgICB9LFxuXG4gICAgbWV0aG9kOiBhc3luYyBmdW5jdGlvbiAobXNnLCB1bmJsb2NrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIC8vIFJlamVjdCBtYWxmb3JtZWQgbWVzc2FnZXMuXG4gICAgICAvLyBGb3Igbm93LCB3ZSBzaWxlbnRseSBpZ25vcmUgdW5rbm93biBhdHRyaWJ1dGVzLFxuICAgICAgLy8gZm9yIGZvcndhcmRzIGNvbXBhdGliaWxpdHkuXG4gICAgICBpZiAodHlwZW9mIChtc2cuaWQpICE9PSBcInN0cmluZ1wiIHx8XG4gICAgICAgICAgdHlwZW9mIChtc2cubWV0aG9kKSAhPT0gXCJzdHJpbmdcIiB8fFxuICAgICAgICAgICgncGFyYW1zJyBpbiBtc2cgJiYgIShtc2cucGFyYW1zIGluc3RhbmNlb2YgQXJyYXkpKSB8fFxuICAgICAgICAgICgoJ3JhbmRvbVNlZWQnIGluIG1zZykgJiYgKHR5cGVvZiBtc2cucmFuZG9tU2VlZCAhPT0gXCJzdHJpbmdcIikpKSB7XG4gICAgICAgIHNlbGYuc2VuZEVycm9yKFwiTWFsZm9ybWVkIG1ldGhvZCBpbnZvY2F0aW9uXCIsIG1zZyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHJhbmRvbVNlZWQgPSBtc2cucmFuZG9tU2VlZCB8fCBudWxsO1xuXG4gICAgICAvLyBTZXQgdXAgdG8gbWFyayB0aGUgbWV0aG9kIGFzIHNhdGlzZmllZCBvbmNlIGFsbCBvYnNlcnZlcnNcbiAgICAgIC8vIChhbmQgc3Vic2NyaXB0aW9ucykgaGF2ZSByZWFjdGVkIHRvIGFueSB3cml0ZXMgdGhhdCB3ZXJlXG4gICAgICAvLyBkb25lLlxuICAgICAgdmFyIGZlbmNlID0gbmV3IEREUFNlcnZlci5fV3JpdGVGZW5jZTtcbiAgICAgIGZlbmNlLm9uQWxsQ29tbWl0dGVkKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gUmV0aXJlIHRoZSBmZW5jZSBzbyB0aGF0IGZ1dHVyZSB3cml0ZXMgYXJlIGFsbG93ZWQuXG4gICAgICAgIC8vIFRoaXMgbWVhbnMgdGhhdCBjYWxsYmFja3MgbGlrZSB0aW1lcnMgYXJlIGZyZWUgdG8gdXNlXG4gICAgICAgIC8vIHRoZSBmZW5jZSwgYW5kIGlmIHRoZXkgZmlyZSBiZWZvcmUgaXQncyBhcm1lZCAoZm9yXG4gICAgICAgIC8vIGV4YW1wbGUsIGJlY2F1c2UgdGhlIG1ldGhvZCB3YWl0cyBmb3IgdGhlbSkgdGhlaXJcbiAgICAgICAgLy8gd3JpdGVzIHdpbGwgYmUgaW5jbHVkZWQgaW4gdGhlIGZlbmNlLlxuICAgICAgICBmZW5jZS5yZXRpcmUoKTtcbiAgICAgICAgc2VsZi5zZW5kKHttc2c6ICd1cGRhdGVkJywgbWV0aG9kczogW21zZy5pZF19KTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBGaW5kIHRoZSBoYW5kbGVyXG4gICAgICB2YXIgaGFuZGxlciA9IHNlbGYuc2VydmVyLm1ldGhvZF9oYW5kbGVyc1ttc2cubWV0aG9kXTtcbiAgICAgIGlmICghaGFuZGxlcikge1xuICAgICAgICBzZWxmLnNlbmQoe1xuICAgICAgICAgIG1zZzogJ3Jlc3VsdCcsIGlkOiBtc2cuaWQsXG4gICAgICAgICAgZXJyb3I6IG5ldyBNZXRlb3IuRXJyb3IoNDA0LCBgTWV0aG9kICcke21zZy5tZXRob2R9JyBub3QgZm91bmRgKX0pO1xuICAgICAgICBhd2FpdCBmZW5jZS5hcm0oKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgaW52b2NhdGlvbiA9IG5ldyBERFBDb21tb24uTWV0aG9kSW52b2NhdGlvbih7XG4gICAgICAgIG5hbWU6IG1zZy5tZXRob2QsXG4gICAgICAgIGlzU2ltdWxhdGlvbjogZmFsc2UsXG4gICAgICAgIHVzZXJJZDogc2VsZi51c2VySWQsXG4gICAgICAgIHNldFVzZXJJZCh1c2VySWQpIHtcbiAgICAgICAgICByZXR1cm4gc2VsZi5fc2V0VXNlcklkKHVzZXJJZCk7XG4gICAgICAgIH0sXG4gICAgICAgIHVuYmxvY2s6IHVuYmxvY2ssXG4gICAgICAgIGNvbm5lY3Rpb246IHNlbGYuY29ubmVjdGlvbkhhbmRsZSxcbiAgICAgICAgcmFuZG9tU2VlZDogcmFuZG9tU2VlZCxcbiAgICAgICAgZmVuY2UsXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgLy8gWFhYIEl0J2QgYmUgYmV0dGVyIGlmIHdlIGNvdWxkIGhvb2sgaW50byBtZXRob2QgaGFuZGxlcnMgYmV0dGVyIGJ1dFxuICAgICAgICAvLyBmb3Igbm93LCB3ZSBuZWVkIHRvIGNoZWNrIGlmIHRoZSBkZHAtcmF0ZS1saW1pdGVyIGV4aXN0cyBzaW5jZSB3ZVxuICAgICAgICAvLyBoYXZlIGEgd2VhayByZXF1aXJlbWVudCBmb3IgdGhlIGRkcC1yYXRlLWxpbWl0ZXIgcGFja2FnZSB0byBiZSBhZGRlZFxuICAgICAgICAvLyB0byBvdXIgYXBwbGljYXRpb24uXG4gICAgICAgIGlmIChQYWNrYWdlWydkZHAtcmF0ZS1saW1pdGVyJ10pIHtcbiAgICAgICAgICB2YXIgRERQUmF0ZUxpbWl0ZXIgPSBQYWNrYWdlWydkZHAtcmF0ZS1saW1pdGVyJ10uRERQUmF0ZUxpbWl0ZXI7XG4gICAgICAgICAgdmFyIHJhdGVMaW1pdGVySW5wdXQgPSB7XG4gICAgICAgICAgICB1c2VySWQ6IHNlbGYudXNlcklkLFxuICAgICAgICAgICAgY2xpZW50QWRkcmVzczogc2VsZi5jb25uZWN0aW9uSGFuZGxlLmNsaWVudEFkZHJlc3MsXG4gICAgICAgICAgICB0eXBlOiBcIm1ldGhvZFwiLFxuICAgICAgICAgICAgbmFtZTogbXNnLm1ldGhvZCxcbiAgICAgICAgICAgIGNvbm5lY3Rpb25JZDogc2VsZi5pZFxuICAgICAgICAgIH07XG4gICAgICAgICAgRERQUmF0ZUxpbWl0ZXIuX2luY3JlbWVudChyYXRlTGltaXRlcklucHV0KTtcbiAgICAgICAgICB2YXIgcmF0ZUxpbWl0UmVzdWx0ID0gRERQUmF0ZUxpbWl0ZXIuX2NoZWNrKHJhdGVMaW1pdGVySW5wdXQpXG4gICAgICAgICAgaWYgKCFyYXRlTGltaXRSZXN1bHQuYWxsb3dlZCkge1xuICAgICAgICAgICAgcmVqZWN0KG5ldyBNZXRlb3IuRXJyb3IoXG4gICAgICAgICAgICAgIFwidG9vLW1hbnktcmVxdWVzdHNcIixcbiAgICAgICAgICAgICAgRERQUmF0ZUxpbWl0ZXIuZ2V0RXJyb3JNZXNzYWdlKHJhdGVMaW1pdFJlc3VsdCksXG4gICAgICAgICAgICAgIHt0aW1lVG9SZXNldDogcmF0ZUxpbWl0UmVzdWx0LnRpbWVUb1Jlc2V0fVxuICAgICAgICAgICAgKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmVzb2x2ZShERFBTZXJ2ZXIuX0N1cnJlbnRXcml0ZUZlbmNlLndpdGhWYWx1ZShcbiAgICAgICAgICBmZW5jZSxcbiAgICAgICAgICAoKSA9PiBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uLndpdGhWYWx1ZShcbiAgICAgICAgICAgIGludm9jYXRpb24sXG4gICAgICAgICAgICAoKSA9PiBtYXliZUF1ZGl0QXJndW1lbnRDaGVja3MoXG4gICAgICAgICAgICAgIGhhbmRsZXIsIGludm9jYXRpb24sIG1zZy5wYXJhbXMsXG4gICAgICAgICAgICAgIFwiY2FsbCB0byAnXCIgKyBtc2cubWV0aG9kICsgXCInXCJcbiAgICAgICAgICAgIClcbiAgICAgICAgICApXG4gICAgICAgICkpO1xuICAgICAgfSk7XG5cbiAgICAgIGFzeW5jIGZ1bmN0aW9uIGZpbmlzaCgpIHtcbiAgICAgICAgYXdhaXQgZmVuY2UuYXJtKCk7XG4gICAgICAgIHVuYmxvY2soKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcGF5bG9hZCA9IHtcbiAgICAgICAgbXNnOiBcInJlc3VsdFwiLFxuICAgICAgICBpZDogbXNnLmlkXG4gICAgICB9O1xuICAgICAgcmV0dXJuIHByb21pc2UudGhlbihhc3luYyByZXN1bHQgPT4ge1xuICAgICAgICBhd2FpdCBmaW5pc2goKTtcbiAgICAgICAgaWYgKHJlc3VsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcGF5bG9hZC5yZXN1bHQgPSByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgICAgc2VsZi5zZW5kKHBheWxvYWQpO1xuICAgICAgfSwgYXN5bmMgKGV4Y2VwdGlvbikgPT4ge1xuICAgICAgICBhd2FpdCBmaW5pc2goKTtcbiAgICAgICAgcGF5bG9hZC5lcnJvciA9IHdyYXBJbnRlcm5hbEV4Y2VwdGlvbihcbiAgICAgICAgICBleGNlcHRpb24sXG4gICAgICAgICAgYHdoaWxlIGludm9raW5nIG1ldGhvZCAnJHttc2cubWV0aG9kfSdgXG4gICAgICAgICk7XG4gICAgICAgIHNlbGYuc2VuZChwYXlsb2FkKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICBfZWFjaFN1YjogZnVuY3Rpb24gKGYpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2VsZi5fbmFtZWRTdWJzLmZvckVhY2goZik7XG4gICAgc2VsZi5fdW5pdmVyc2FsU3Vicy5mb3JFYWNoKGYpO1xuICB9LFxuXG4gIF9kaWZmQ29sbGVjdGlvblZpZXdzOiBmdW5jdGlvbiAoYmVmb3JlQ1ZzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIERpZmZTZXF1ZW5jZS5kaWZmTWFwcyhiZWZvcmVDVnMsIHNlbGYuY29sbGVjdGlvblZpZXdzLCB7XG4gICAgICBib3RoOiBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIGxlZnRWYWx1ZSwgcmlnaHRWYWx1ZSkge1xuICAgICAgICByaWdodFZhbHVlLmRpZmYobGVmdFZhbHVlKTtcbiAgICAgIH0sXG4gICAgICByaWdodE9ubHk6IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgcmlnaHRWYWx1ZSkge1xuICAgICAgICByaWdodFZhbHVlLmRvY3VtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChkb2NWaWV3LCBpZCkge1xuICAgICAgICAgIHNlbGYuc2VuZEFkZGVkKGNvbGxlY3Rpb25OYW1lLCBpZCwgZG9jVmlldy5nZXRGaWVsZHMoKSk7XG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICAgIGxlZnRPbmx5OiBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIGxlZnRWYWx1ZSkge1xuICAgICAgICBsZWZ0VmFsdWUuZG9jdW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaWQpIHtcbiAgICAgICAgICBzZWxmLnNlbmRSZW1vdmVkKGNvbGxlY3Rpb25OYW1lLCBpZCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8vIFNldHMgdGhlIGN1cnJlbnQgdXNlciBpZCBpbiBhbGwgYXBwcm9wcmlhdGUgY29udGV4dHMgYW5kIHJlcnVuc1xuICAvLyBhbGwgc3Vic2NyaXB0aW9uc1xuICBhc3luYyBfc2V0VXNlcklkKHVzZXJJZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGlmICh1c2VySWQgIT09IG51bGwgJiYgdHlwZW9mIHVzZXJJZCAhPT0gXCJzdHJpbmdcIilcbiAgICAgIHRocm93IG5ldyBFcnJvcihcInNldFVzZXJJZCBtdXN0IGJlIGNhbGxlZCBvbiBzdHJpbmcgb3IgbnVsbCwgbm90IFwiICtcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlb2YgdXNlcklkKTtcblxuICAgIC8vIFByZXZlbnQgbmV3bHktY3JlYXRlZCB1bml2ZXJzYWwgc3Vic2NyaXB0aW9ucyBmcm9tIGJlaW5nIGFkZGVkIHRvIG91clxuICAgIC8vIHNlc3Npb24uIFRoZXkgd2lsbCBiZSBmb3VuZCBiZWxvdyB3aGVuIHdlIGNhbGwgc3RhcnRVbml2ZXJzYWxTdWJzLlxuICAgIC8vXG4gICAgLy8gKFdlIGRvbid0IGhhdmUgdG8gd29ycnkgYWJvdXQgbmFtZWQgc3Vic2NyaXB0aW9ucywgYmVjYXVzZSB3ZSBvbmx5IGFkZFxuICAgIC8vIHRoZW0gd2hlbiB3ZSBwcm9jZXNzIGEgJ3N1YicgbWVzc2FnZS4gV2UgYXJlIGN1cnJlbnRseSBwcm9jZXNzaW5nIGFcbiAgICAvLyAnbWV0aG9kJyBtZXNzYWdlLCBhbmQgdGhlIG1ldGhvZCBkaWQgbm90IHVuYmxvY2ssIGJlY2F1c2UgaXQgaXMgaWxsZWdhbFxuICAgIC8vIHRvIGNhbGwgc2V0VXNlcklkIGFmdGVyIHVuYmxvY2suIFRodXMgd2UgY2Fubm90IGJlIGNvbmN1cnJlbnRseSBhZGRpbmcgYVxuICAgIC8vIG5ldyBuYW1lZCBzdWJzY3JpcHRpb24pLlxuICAgIHNlbGYuX2RvbnRTdGFydE5ld1VuaXZlcnNhbFN1YnMgPSB0cnVlO1xuXG4gICAgLy8gUHJldmVudCBjdXJyZW50IHN1YnMgZnJvbSB1cGRhdGluZyBvdXIgY29sbGVjdGlvblZpZXdzIGFuZCBjYWxsIHRoZWlyXG4gICAgLy8gc3RvcCBjYWxsYmFja3MuIFRoaXMgbWF5IHlpZWxkLlxuICAgIHNlbGYuX2VhY2hTdWIoZnVuY3Rpb24gKHN1Yikge1xuICAgICAgc3ViLl9kZWFjdGl2YXRlKCk7XG4gICAgfSk7XG5cbiAgICAvLyBBbGwgc3VicyBzaG91bGQgbm93IGJlIGRlYWN0aXZhdGVkLiBTdG9wIHNlbmRpbmcgbWVzc2FnZXMgdG8gdGhlIGNsaWVudCxcbiAgICAvLyBzYXZlIHRoZSBzdGF0ZSBvZiB0aGUgcHVibGlzaGVkIGNvbGxlY3Rpb25zLCByZXNldCB0byBhbiBlbXB0eSB2aWV3LCBhbmRcbiAgICAvLyB1cGRhdGUgdGhlIHVzZXJJZC5cbiAgICBzZWxmLl9pc1NlbmRpbmcgPSBmYWxzZTtcbiAgICB2YXIgYmVmb3JlQ1ZzID0gc2VsZi5jb2xsZWN0aW9uVmlld3M7XG4gICAgc2VsZi5jb2xsZWN0aW9uVmlld3MgPSBuZXcgTWFwKCk7XG4gICAgc2VsZi51c2VySWQgPSB1c2VySWQ7XG5cbiAgICAvLyBfc2V0VXNlcklkIGlzIG5vcm1hbGx5IGNhbGxlZCBmcm9tIGEgTWV0ZW9yIG1ldGhvZCB3aXRoXG4gICAgLy8gRERQLl9DdXJyZW50TWV0aG9kSW52b2NhdGlvbiBzZXQuIEJ1dCBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uIGlzIG5vdFxuICAgIC8vIGV4cGVjdGVkIHRvIGJlIHNldCBpbnNpZGUgYSBwdWJsaXNoIGZ1bmN0aW9uLCBzbyB3ZSB0ZW1wb3JhcnkgdW5zZXQgaXQuXG4gICAgLy8gSW5zaWRlIGEgcHVibGlzaCBmdW5jdGlvbiBERFAuX0N1cnJlbnRQdWJsaWNhdGlvbkludm9jYXRpb24gaXMgc2V0LlxuICAgIGF3YWl0IEREUC5fQ3VycmVudE1ldGhvZEludm9jYXRpb24ud2l0aFZhbHVlKHVuZGVmaW5lZCwgYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgLy8gU2F2ZSB0aGUgb2xkIG5hbWVkIHN1YnMsIGFuZCByZXNldCB0byBoYXZpbmcgbm8gc3Vic2NyaXB0aW9ucy5cbiAgICAgIHZhciBvbGROYW1lZFN1YnMgPSBzZWxmLl9uYW1lZFN1YnM7XG4gICAgICBzZWxmLl9uYW1lZFN1YnMgPSBuZXcgTWFwKCk7XG4gICAgICBzZWxmLl91bml2ZXJzYWxTdWJzID0gW107XG5cblxuXG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChbLi4ub2xkTmFtZWRTdWJzXS5tYXAoYXN5bmMgKFtzdWJzY3JpcHRpb25JZCwgc3ViXSkgPT4ge1xuICAgICAgICBjb25zdCBuZXdTdWIgPSBzdWIuX3JlY3JlYXRlKCk7XG4gICAgICAgIHNlbGYuX25hbWVkU3Vicy5zZXQoc3Vic2NyaXB0aW9uSWQsIG5ld1N1Yik7XG4gICAgICAgIC8vIG5iOiBpZiB0aGUgaGFuZGxlciB0aHJvd3Mgb3IgY2FsbHMgdGhpcy5lcnJvcigpLCBpdCB3aWxsIGluIGZhY3RcbiAgICAgICAgLy8gaW1tZWRpYXRlbHkgc2VuZCBpdHMgJ25vc3ViJy4gVGhpcyBpcyBPSywgdGhvdWdoLlxuICAgICAgICBhd2FpdCBuZXdTdWIuX3J1bkhhbmRsZXIoKTtcbiAgICAgIH0pKTtcblxuICAgICAgLy8gQWxsb3cgbmV3bHktY3JlYXRlZCB1bml2ZXJzYWwgc3VicyB0byBiZSBzdGFydGVkIG9uIG91ciBjb25uZWN0aW9uIGluXG4gICAgICAvLyBwYXJhbGxlbCB3aXRoIHRoZSBvbmVzIHdlJ3JlIHNwaW5uaW5nIHVwIGhlcmUsIGFuZCBzcGluIHVwIHVuaXZlcnNhbFxuICAgICAgLy8gc3Vicy5cbiAgICAgIHNlbGYuX2RvbnRTdGFydE5ld1VuaXZlcnNhbFN1YnMgPSBmYWxzZTtcbiAgICAgIHNlbGYuc3RhcnRVbml2ZXJzYWxTdWJzKCk7XG4gICAgfSwgeyBuYW1lOiAnX3NldFVzZXJJZCcgfSk7XG5cbiAgICAvLyBTdGFydCBzZW5kaW5nIG1lc3NhZ2VzIGFnYWluLCBiZWdpbm5pbmcgd2l0aCB0aGUgZGlmZiBmcm9tIHRoZSBwcmV2aW91c1xuICAgIC8vIHN0YXRlIG9mIHRoZSB3b3JsZCB0byB0aGUgY3VycmVudCBzdGF0ZS4gTm8geWllbGRzIGFyZSBhbGxvd2VkIGR1cmluZ1xuICAgIC8vIHRoaXMgZGlmZiwgc28gdGhhdCBvdGhlciBjaGFuZ2VzIGNhbm5vdCBpbnRlcmxlYXZlLlxuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX2lzU2VuZGluZyA9IHRydWU7XG4gICAgICBzZWxmLl9kaWZmQ29sbGVjdGlvblZpZXdzKGJlZm9yZUNWcyk7XG4gICAgICBpZiAoIWlzRW1wdHkoc2VsZi5fcGVuZGluZ1JlYWR5KSkge1xuICAgICAgICBzZWxmLnNlbmRSZWFkeShzZWxmLl9wZW5kaW5nUmVhZHkpO1xuICAgICAgICBzZWxmLl9wZW5kaW5nUmVhZHkgPSBbXTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICBfc3RhcnRTdWJzY3JpcHRpb246IGZ1bmN0aW9uIChoYW5kbGVyLCBzdWJJZCwgcGFyYW1zLCBuYW1lKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHN1YiA9IG5ldyBTdWJzY3JpcHRpb24oXG4gICAgICBzZWxmLCBoYW5kbGVyLCBzdWJJZCwgcGFyYW1zLCBuYW1lKTtcblxuICAgIGxldCB1bmJsb2NrSGFuZGVyID0gc2VsZi5jYWNoZWRVbmJsb2NrO1xuICAgIC8vIF9zdGFydFN1YnNjcmlwdGlvbiBtYXkgY2FsbCBmcm9tIGEgbG90IHBsYWNlc1xuICAgIC8vIHNvIGNhY2hlZFVuYmxvY2sgbWlnaHQgYmUgbnVsbCBpbiBzb21lY2FzZXNcbiAgICAvLyBhc3NpZ24gdGhlIGNhY2hlZFVuYmxvY2tcbiAgICBzdWIudW5ibG9jayA9IHVuYmxvY2tIYW5kZXIgfHwgKCgpID0+IHt9KTtcblxuICAgIGlmIChzdWJJZClcbiAgICAgIHNlbGYuX25hbWVkU3Vicy5zZXQoc3ViSWQsIHN1Yik7XG4gICAgZWxzZVxuICAgICAgc2VsZi5fdW5pdmVyc2FsU3Vicy5wdXNoKHN1Yik7XG5cbiAgICByZXR1cm4gc3ViLl9ydW5IYW5kbGVyKCk7XG4gIH0sXG5cbiAgLy8gVGVhciBkb3duIHNwZWNpZmllZCBzdWJzY3JpcHRpb25cbiAgX3N0b3BTdWJzY3JpcHRpb246IGZ1bmN0aW9uIChzdWJJZCwgZXJyb3IpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgc3ViTmFtZSA9IG51bGw7XG4gICAgaWYgKHN1YklkKSB7XG4gICAgICB2YXIgbWF5YmVTdWIgPSBzZWxmLl9uYW1lZFN1YnMuZ2V0KHN1YklkKTtcbiAgICAgIGlmIChtYXliZVN1Yikge1xuICAgICAgICBzdWJOYW1lID0gbWF5YmVTdWIuX25hbWU7XG4gICAgICAgIG1heWJlU3ViLl9yZW1vdmVBbGxEb2N1bWVudHMoKTtcbiAgICAgICAgbWF5YmVTdWIuX2RlYWN0aXZhdGUoKTtcbiAgICAgICAgc2VsZi5fbmFtZWRTdWJzLmRlbGV0ZShzdWJJZCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHJlc3BvbnNlID0ge21zZzogJ25vc3ViJywgaWQ6IHN1YklkfTtcblxuICAgIGlmIChlcnJvcikge1xuICAgICAgcmVzcG9uc2UuZXJyb3IgPSB3cmFwSW50ZXJuYWxFeGNlcHRpb24oXG4gICAgICAgIGVycm9yLFxuICAgICAgICBzdWJOYW1lID8gKFwiZnJvbSBzdWIgXCIgKyBzdWJOYW1lICsgXCIgaWQgXCIgKyBzdWJJZClcbiAgICAgICAgICA6IChcImZyb20gc3ViIGlkIFwiICsgc3ViSWQpKTtcbiAgICB9XG5cbiAgICBzZWxmLnNlbmQocmVzcG9uc2UpO1xuICB9LFxuXG4gIC8vIFRlYXIgZG93biBhbGwgc3Vic2NyaXB0aW9ucy4gTm90ZSB0aGF0IHRoaXMgZG9lcyBOT1Qgc2VuZCByZW1vdmVkIG9yIG5vc3ViXG4gIC8vIG1lc3NhZ2VzLCBzaW5jZSB3ZSBhc3N1bWUgdGhlIGNsaWVudCBpcyBnb25lLlxuICBfZGVhY3RpdmF0ZUFsbFN1YnNjcmlwdGlvbnM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBzZWxmLl9uYW1lZFN1YnMuZm9yRWFjaChmdW5jdGlvbiAoc3ViLCBpZCkge1xuICAgICAgc3ViLl9kZWFjdGl2YXRlKCk7XG4gICAgfSk7XG4gICAgc2VsZi5fbmFtZWRTdWJzID0gbmV3IE1hcCgpO1xuXG4gICAgc2VsZi5fdW5pdmVyc2FsU3Vicy5mb3JFYWNoKGZ1bmN0aW9uIChzdWIpIHtcbiAgICAgIHN1Yi5fZGVhY3RpdmF0ZSgpO1xuICAgIH0pO1xuICAgIHNlbGYuX3VuaXZlcnNhbFN1YnMgPSBbXTtcbiAgfSxcblxuICAvLyBEZXRlcm1pbmUgdGhlIHJlbW90ZSBjbGllbnQncyBJUCBhZGRyZXNzLCBiYXNlZCBvbiB0aGVcbiAgLy8gSFRUUF9GT1JXQVJERURfQ09VTlQgZW52aXJvbm1lbnQgdmFyaWFibGUgcmVwcmVzZW50aW5nIGhvdyBtYW55XG4gIC8vIHByb3hpZXMgdGhlIHNlcnZlciBpcyBiZWhpbmQuXG4gIF9jbGllbnRBZGRyZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8gRm9yIHRoZSByZXBvcnRlZCBjbGllbnQgYWRkcmVzcyBmb3IgYSBjb25uZWN0aW9uIHRvIGJlIGNvcnJlY3QsXG4gICAgLy8gdGhlIGRldmVsb3BlciBtdXN0IHNldCB0aGUgSFRUUF9GT1JXQVJERURfQ09VTlQgZW52aXJvbm1lbnRcbiAgICAvLyB2YXJpYWJsZSB0byBhbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIGhvcHMgdGhleVxuICAgIC8vIGV4cGVjdCBpbiB0aGUgYHgtZm9yd2FyZGVkLWZvcmAgaGVhZGVyLiBFLmcuLCBzZXQgdG8gXCIxXCIgaWYgdGhlXG4gICAgLy8gc2VydmVyIGlzIGJlaGluZCBvbmUgcHJveHkuXG4gICAgLy9cbiAgICAvLyBUaGlzIGNvdWxkIGJlIGNvbXB1dGVkIG9uY2UgYXQgc3RhcnR1cCBpbnN0ZWFkIG9mIGV2ZXJ5IHRpbWUuXG4gICAgdmFyIGh0dHBGb3J3YXJkZWRDb3VudCA9IHBhcnNlSW50KHByb2Nlc3MuZW52WydIVFRQX0ZPUldBUkRFRF9DT1VOVCddKSB8fCAwO1xuXG4gICAgaWYgKGh0dHBGb3J3YXJkZWRDb3VudCA9PT0gMClcbiAgICAgIHJldHVybiBzZWxmLnNvY2tldC5yZW1vdGVBZGRyZXNzO1xuXG4gICAgdmFyIGZvcndhcmRlZEZvciA9IHNlbGYuc29ja2V0LmhlYWRlcnNbXCJ4LWZvcndhcmRlZC1mb3JcIl07XG4gICAgaWYgKCFpc1N0cmluZyhmb3J3YXJkZWRGb3IpKVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgZm9yd2FyZGVkRm9yID0gZm9yd2FyZGVkRm9yLnNwbGl0KCcsJylcblxuICAgIC8vIFR5cGljYWxseSB0aGUgZmlyc3QgdmFsdWUgaW4gdGhlIGB4LWZvcndhcmRlZC1mb3JgIGhlYWRlciBpc1xuICAgIC8vIHRoZSBvcmlnaW5hbCBJUCBhZGRyZXNzIG9mIHRoZSBjbGllbnQgY29ubmVjdGluZyB0byB0aGUgZmlyc3RcbiAgICAvLyBwcm94eS4gIEhvd2V2ZXIsIHRoZSBlbmQgdXNlciBjYW4gZWFzaWx5IHNwb29mIHRoZSBoZWFkZXIsIGluXG4gICAgLy8gd2hpY2ggY2FzZSB0aGUgZmlyc3QgdmFsdWUocykgd2lsbCBiZSB0aGUgZmFrZSBJUCBhZGRyZXNzIGZyb21cbiAgICAvLyB0aGUgdXNlciBwcmV0ZW5kaW5nIHRvIGJlIGEgcHJveHkgcmVwb3J0aW5nIHRoZSBvcmlnaW5hbCBJUFxuICAgIC8vIGFkZHJlc3MgdmFsdWUuICBCeSBjb3VudGluZyBIVFRQX0ZPUldBUkRFRF9DT1VOVCBiYWNrIGZyb20gdGhlXG4gICAgLy8gZW5kIG9mIHRoZSBsaXN0LCB3ZSBlbnN1cmUgdGhhdCB3ZSBnZXQgdGhlIElQIGFkZHJlc3MgYmVpbmdcbiAgICAvLyByZXBvcnRlZCBieSAqb3VyKiBmaXJzdCBwcm94eS5cblxuICAgIGlmIChodHRwRm9yd2FyZGVkQ291bnQgPCAwIHx8IGh0dHBGb3J3YXJkZWRDb3VudCAhPT0gZm9yd2FyZGVkRm9yLmxlbmd0aClcbiAgICAgIHJldHVybiBudWxsO1xuICAgIGZvcndhcmRlZEZvciA9IGZvcndhcmRlZEZvci5tYXAoKGlwKSA9PiBpcC50cmltKCkpO1xuICAgIHJldHVybiBmb3J3YXJkZWRGb3JbZm9yd2FyZGVkRm9yLmxlbmd0aCAtIGh0dHBGb3J3YXJkZWRDb3VudF07XG4gIH1cbn0pO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuLyogU3Vic2NyaXB0aW9uICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbi8vIEN0b3IgZm9yIGEgc3ViIGhhbmRsZTogdGhlIGlucHV0IHRvIGVhY2ggcHVibGlzaCBmdW5jdGlvblxuXG4vLyBJbnN0YW5jZSBuYW1lIGlzIHRoaXMgYmVjYXVzZSBpdCdzIHVzdWFsbHkgcmVmZXJyZWQgdG8gYXMgdGhpcyBpbnNpZGUgYVxuLy8gcHVibGlzaFxuLyoqXG4gKiBAc3VtbWFyeSBUaGUgc2VydmVyJ3Mgc2lkZSBvZiBhIHN1YnNjcmlwdGlvblxuICogQGNsYXNzIFN1YnNjcmlwdGlvblxuICogQGluc3RhbmNlTmFtZSB0aGlzXG4gKiBAc2hvd0luc3RhbmNlTmFtZSB0cnVlXG4gKi9cbnZhciBTdWJzY3JpcHRpb24gPSBmdW5jdGlvbiAoXG4gICAgc2Vzc2lvbiwgaGFuZGxlciwgc3Vic2NyaXB0aW9uSWQsIHBhcmFtcywgbmFtZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYuX3Nlc3Npb24gPSBzZXNzaW9uOyAvLyB0eXBlIGlzIFNlc3Npb25cblxuICAvKipcbiAgICogQHN1bW1hcnkgQWNjZXNzIGluc2lkZSB0aGUgcHVibGlzaCBmdW5jdGlvbi4gVGhlIGluY29taW5nIFtjb25uZWN0aW9uXSgjbWV0ZW9yX29uY29ubmVjdGlvbikgZm9yIHRoaXMgc3Vic2NyaXB0aW9uLlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBuYW1lICBjb25uZWN0aW9uXG4gICAqIEBtZW1iZXJPZiBTdWJzY3JpcHRpb25cbiAgICogQGluc3RhbmNlXG4gICAqL1xuICBzZWxmLmNvbm5lY3Rpb24gPSBzZXNzaW9uLmNvbm5lY3Rpb25IYW5kbGU7IC8vIHB1YmxpYyBBUEkgb2JqZWN0XG5cbiAgc2VsZi5faGFuZGxlciA9IGhhbmRsZXI7XG5cbiAgLy8gTXkgc3Vic2NyaXB0aW9uIElEIChnZW5lcmF0ZWQgYnkgY2xpZW50LCB1bmRlZmluZWQgZm9yIHVuaXZlcnNhbCBzdWJzKS5cbiAgc2VsZi5fc3Vic2NyaXB0aW9uSWQgPSBzdWJzY3JpcHRpb25JZDtcbiAgLy8gVW5kZWZpbmVkIGZvciB1bml2ZXJzYWwgc3Vic1xuICBzZWxmLl9uYW1lID0gbmFtZTtcblxuICBzZWxmLl9wYXJhbXMgPSBwYXJhbXMgfHwgW107XG5cbiAgLy8gT25seSBuYW1lZCBzdWJzY3JpcHRpb25zIGhhdmUgSURzLCBidXQgd2UgbmVlZCBzb21lIHNvcnQgb2Ygc3RyaW5nXG4gIC8vIGludGVybmFsbHkgdG8ga2VlcCB0cmFjayBvZiBhbGwgc3Vic2NyaXB0aW9ucyBpbnNpZGVcbiAgLy8gU2Vzc2lvbkRvY3VtZW50Vmlld3MuIFdlIHVzZSB0aGlzIHN1YnNjcmlwdGlvbkhhbmRsZSBmb3IgdGhhdC5cbiAgaWYgKHNlbGYuX3N1YnNjcmlwdGlvbklkKSB7XG4gICAgc2VsZi5fc3Vic2NyaXB0aW9uSGFuZGxlID0gJ04nICsgc2VsZi5fc3Vic2NyaXB0aW9uSWQ7XG4gIH0gZWxzZSB7XG4gICAgc2VsZi5fc3Vic2NyaXB0aW9uSGFuZGxlID0gJ1UnICsgUmFuZG9tLmlkKCk7XG4gIH1cblxuICAvLyBIYXMgX2RlYWN0aXZhdGUgYmVlbiBjYWxsZWQ/XG4gIHNlbGYuX2RlYWN0aXZhdGVkID0gZmFsc2U7XG5cbiAgLy8gU3RvcCBjYWxsYmFja3MgdG8gZy9jIHRoaXMgc3ViLiAgY2FsbGVkIHcvIHplcm8gYXJndW1lbnRzLlxuICBzZWxmLl9zdG9wQ2FsbGJhY2tzID0gW107XG5cbiAgLy8gVGhlIHNldCBvZiAoY29sbGVjdGlvbiwgZG9jdW1lbnRpZCkgdGhhdCB0aGlzIHN1YnNjcmlwdGlvbiBoYXNcbiAgLy8gYW4gb3BpbmlvbiBhYm91dC5cbiAgc2VsZi5fZG9jdW1lbnRzID0gbmV3IE1hcCgpO1xuXG4gIC8vIFJlbWVtYmVyIGlmIHdlIGFyZSByZWFkeS5cbiAgc2VsZi5fcmVhZHkgPSBmYWxzZTtcblxuICAvLyBQYXJ0IG9mIHRoZSBwdWJsaWMgQVBJOiB0aGUgdXNlciBvZiB0aGlzIHN1Yi5cblxuICAvKipcbiAgICogQHN1bW1hcnkgQWNjZXNzIGluc2lkZSB0aGUgcHVibGlzaCBmdW5jdGlvbi4gVGhlIGlkIG9mIHRoZSBsb2dnZWQtaW4gdXNlciwgb3IgYG51bGxgIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBTdWJzY3JpcHRpb25cbiAgICogQG5hbWUgIHVzZXJJZFxuICAgKiBAaW5zdGFuY2VcbiAgICovXG4gIHNlbGYudXNlcklkID0gc2Vzc2lvbi51c2VySWQ7XG5cbiAgLy8gRm9yIG5vdywgdGhlIGlkIGZpbHRlciBpcyBnb2luZyB0byBkZWZhdWx0IHRvXG4gIC8vIHRoZSB0by9mcm9tIEREUCBtZXRob2RzIG9uIE1vbmdvSUQsIHRvXG4gIC8vIHNwZWNpZmljYWxseSBkZWFsIHdpdGggbW9uZ28vbWluaW1vbmdvIE9iamVjdElkcy5cblxuICAvLyBMYXRlciwgeW91IHdpbGwgYmUgYWJsZSB0byBtYWtlIHRoaXMgYmUgXCJyYXdcIlxuICAvLyBpZiB5b3Ugd2FudCB0byBwdWJsaXNoIGEgY29sbGVjdGlvbiB0aGF0IHlvdSBrbm93XG4gIC8vIGp1c3QgaGFzIHN0cmluZ3MgZm9yIGtleXMgYW5kIG5vIGZ1bm55IGJ1c2luZXNzLCB0b1xuICAvLyBhIEREUCBjb25zdW1lciB0aGF0IGlzbid0IG1pbmltb25nby5cblxuICBzZWxmLl9pZEZpbHRlciA9IHtcbiAgICBpZFN0cmluZ2lmeTogTW9uZ29JRC5pZFN0cmluZ2lmeSxcbiAgICBpZFBhcnNlOiBNb25nb0lELmlkUGFyc2VcbiAgfTtcblxuICBQYWNrYWdlWydmYWN0cy1iYXNlJ10gJiYgUGFja2FnZVsnZmFjdHMtYmFzZSddLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgXCJsaXZlZGF0YVwiLCBcInN1YnNjcmlwdGlvbnNcIiwgMSk7XG59O1xuXG5PYmplY3QuYXNzaWduKFN1YnNjcmlwdGlvbi5wcm90b3R5cGUsIHtcbiAgX3J1bkhhbmRsZXI6IGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgIC8vIFhYWCBzaG91bGQgd2UgdW5ibG9jaygpIGhlcmU/IEVpdGhlciBiZWZvcmUgcnVubmluZyB0aGUgcHVibGlzaFxuICAgIC8vIGZ1bmN0aW9uLCBvciBiZWZvcmUgcnVubmluZyBfcHVibGlzaEN1cnNvci5cbiAgICAvL1xuICAgIC8vIFJpZ2h0IG5vdywgZWFjaCBwdWJsaXNoIGZ1bmN0aW9uIGJsb2NrcyBhbGwgZnV0dXJlIHB1Ymxpc2hlcyBhbmRcbiAgICAvLyBtZXRob2RzIHdhaXRpbmcgb24gZGF0YSBmcm9tIE1vbmdvIChvciB3aGF0ZXZlciBlbHNlIHRoZSBmdW5jdGlvblxuICAgIC8vIGJsb2NrcyBvbikuIFRoaXMgcHJvYmFibHkgc2xvd3MgcGFnZSBsb2FkIGluIGNvbW1vbiBjYXNlcy5cblxuICAgIGlmICghdGhpcy51bmJsb2NrKSB7XG4gICAgICB0aGlzLnVuYmxvY2sgPSAoKSA9PiB7fTtcbiAgICB9XG5cbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICBsZXQgcmVzdWx0T3JUaGVuYWJsZSA9IG51bGw7XG4gICAgdHJ5IHtcbiAgICAgIHJlc3VsdE9yVGhlbmFibGUgPSBERFAuX0N1cnJlbnRQdWJsaWNhdGlvbkludm9jYXRpb24ud2l0aFZhbHVlKFxuICAgICAgICBzZWxmLFxuICAgICAgICAoKSA9PlxuICAgICAgICAgIG1heWJlQXVkaXRBcmd1bWVudENoZWNrcyhcbiAgICAgICAgICAgIHNlbGYuX2hhbmRsZXIsXG4gICAgICAgICAgICBzZWxmLFxuICAgICAgICAgICAgRUpTT04uY2xvbmUoc2VsZi5fcGFyYW1zKSxcbiAgICAgICAgICAgIC8vIEl0J3MgT0sgdGhhdCB0aGlzIHdvdWxkIGxvb2sgd2VpcmQgZm9yIHVuaXZlcnNhbCBzdWJzY3JpcHRpb25zLFxuICAgICAgICAgICAgLy8gYmVjYXVzZSB0aGV5IGhhdmUgbm8gYXJndW1lbnRzIHNvIHRoZXJlIGNhbiBuZXZlciBiZSBhblxuICAgICAgICAgICAgLy8gYXVkaXQtYXJndW1lbnQtY2hlY2tzIGZhaWx1cmUuXG4gICAgICAgICAgICBcInB1Ymxpc2hlciAnXCIgKyBzZWxmLl9uYW1lICsgXCInXCJcbiAgICAgICAgICApLFxuICAgICAgICB7IG5hbWU6IHNlbGYuX25hbWUgfVxuICAgICAgKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBzZWxmLmVycm9yKGUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIERpZCB0aGUgaGFuZGxlciBjYWxsIHRoaXMuZXJyb3Igb3IgdGhpcy5zdG9wP1xuICAgIGlmIChzZWxmLl9pc0RlYWN0aXZhdGVkKCkpIHJldHVybjtcblxuICAgIC8vIEJvdGggY29udmVudGlvbmFsIGFuZCBhc3luYyBwdWJsaXNoIGhhbmRsZXIgZnVuY3Rpb25zIGFyZSBzdXBwb3J0ZWQuXG4gICAgLy8gSWYgYW4gb2JqZWN0IGlzIHJldHVybmVkIHdpdGggYSB0aGVuKCkgZnVuY3Rpb24sIGl0IGlzIGVpdGhlciBhIHByb21pc2VcbiAgICAvLyBvciB0aGVuYWJsZSBhbmQgd2lsbCBiZSByZXNvbHZlZCBhc3luY2hyb25vdXNseS5cbiAgICBjb25zdCBpc1RoZW5hYmxlID1cbiAgICAgIHJlc3VsdE9yVGhlbmFibGUgJiYgdHlwZW9mIHJlc3VsdE9yVGhlbmFibGUudGhlbiA9PT0gJ2Z1bmN0aW9uJztcbiAgICBpZiAoaXNUaGVuYWJsZSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgc2VsZi5fcHVibGlzaEhhbmRsZXJSZXN1bHQoYXdhaXQgcmVzdWx0T3JUaGVuYWJsZSk7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgc2VsZi5lcnJvcihlKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBhd2FpdCBzZWxmLl9wdWJsaXNoSGFuZGxlclJlc3VsdChyZXN1bHRPclRoZW5hYmxlKTtcbiAgICB9XG4gIH0sXG5cbiAgYXN5bmMgX3B1Ymxpc2hIYW5kbGVyUmVzdWx0IChyZXMpIHtcbiAgICAvLyBTUEVDSUFMIENBU0U6IEluc3RlYWQgb2Ygd3JpdGluZyB0aGVpciBvd24gY2FsbGJhY2tzIHRoYXQgaW52b2tlXG4gICAgLy8gdGhpcy5hZGRlZC9jaGFuZ2VkL3JlYWR5L2V0YywgdGhlIHVzZXIgY2FuIGp1c3QgcmV0dXJuIGEgY29sbGVjdGlvblxuICAgIC8vIGN1cnNvciBvciBhcnJheSBvZiBjdXJzb3JzIGZyb20gdGhlIHB1Ymxpc2ggZnVuY3Rpb247IHdlIGNhbGwgdGhlaXJcbiAgICAvLyBfcHVibGlzaEN1cnNvciBtZXRob2Qgd2hpY2ggc3RhcnRzIG9ic2VydmluZyB0aGUgY3Vyc29yIGFuZCBwdWJsaXNoZXMgdGhlXG4gICAgLy8gcmVzdWx0cy4gTm90ZSB0aGF0IF9wdWJsaXNoQ3Vyc29yIGRvZXMgTk9UIGNhbGwgcmVhZHkoKS5cbiAgICAvL1xuICAgIC8vIFhYWCBUaGlzIHVzZXMgYW4gdW5kb2N1bWVudGVkIGludGVyZmFjZSB3aGljaCBvbmx5IHRoZSBNb25nbyBjdXJzb3JcbiAgICAvLyBpbnRlcmZhY2UgcHVibGlzaGVzLiBTaG91bGQgd2UgbWFrZSB0aGlzIGludGVyZmFjZSBwdWJsaWMgYW5kIGVuY291cmFnZVxuICAgIC8vIHVzZXJzIHRvIGltcGxlbWVudCBpdCB0aGVtc2VsdmVzPyBBcmd1YWJseSwgaXQncyB1bm5lY2Vzc2FyeTsgdXNlcnMgY2FuXG4gICAgLy8gYWxyZWFkeSB3cml0ZSB0aGVpciBvd24gZnVuY3Rpb25zIGxpa2VcbiAgICAvLyAgIHZhciBwdWJsaXNoTXlSZWFjdGl2ZVRoaW5neSA9IGZ1bmN0aW9uIChuYW1lLCBoYW5kbGVyKSB7XG4gICAgLy8gICAgIE1ldGVvci5wdWJsaXNoKG5hbWUsIGZ1bmN0aW9uICgpIHtcbiAgICAvLyAgICAgICB2YXIgcmVhY3RpdmVUaGluZ3kgPSBoYW5kbGVyKCk7XG4gICAgLy8gICAgICAgcmVhY3RpdmVUaGluZ3kucHVibGlzaE1lKCk7XG4gICAgLy8gICAgIH0pO1xuICAgIC8vICAgfTtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgaXNDdXJzb3IgPSBmdW5jdGlvbiAoYykge1xuICAgICAgcmV0dXJuIGMgJiYgYy5fcHVibGlzaEN1cnNvcjtcbiAgICB9O1xuICAgIGlmIChpc0N1cnNvcihyZXMpKSB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCByZXMuX3B1Ymxpc2hDdXJzb3Ioc2VsZik7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHNlbGYuZXJyb3IoZSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIC8vIF9wdWJsaXNoQ3Vyc29yIG9ubHkgcmV0dXJucyBhZnRlciB0aGUgaW5pdGlhbCBhZGRlZCBjYWxsYmFja3MgaGF2ZSBydW4uXG4gICAgICAvLyBtYXJrIHN1YnNjcmlwdGlvbiBhcyByZWFkeS5cbiAgICAgIHNlbGYucmVhZHkoKTtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocmVzKSkge1xuICAgICAgLy8gQ2hlY2sgYWxsIHRoZSBlbGVtZW50cyBhcmUgY3Vyc29yc1xuICAgICAgaWYgKCEgcmVzLmV2ZXJ5KGlzQ3Vyc29yKSkge1xuICAgICAgICBzZWxmLmVycm9yKG5ldyBFcnJvcihcIlB1Ymxpc2ggZnVuY3Rpb24gcmV0dXJuZWQgYW4gYXJyYXkgb2Ygbm9uLUN1cnNvcnNcIikpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICAvLyBGaW5kIGR1cGxpY2F0ZSBjb2xsZWN0aW9uIG5hbWVzXG4gICAgICAvLyBYWFggd2Ugc2hvdWxkIHN1cHBvcnQgb3ZlcmxhcHBpbmcgY3Vyc29ycywgYnV0IHRoYXQgd291bGQgcmVxdWlyZSB0aGVcbiAgICAgIC8vIG1lcmdlIGJveCB0byBhbGxvdyBvdmVybGFwIHdpdGhpbiBhIHN1YnNjcmlwdGlvblxuICAgICAgdmFyIGNvbGxlY3Rpb25OYW1lcyA9IHt9O1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlcy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgY29sbGVjdGlvbk5hbWUgPSByZXNbaV0uX2dldENvbGxlY3Rpb25OYW1lKCk7XG4gICAgICAgIGlmIChjb2xsZWN0aW9uTmFtZXNbY29sbGVjdGlvbk5hbWVdKSB7XG4gICAgICAgICAgc2VsZi5lcnJvcihuZXcgRXJyb3IoXG4gICAgICAgICAgICBcIlB1Ymxpc2ggZnVuY3Rpb24gcmV0dXJuZWQgbXVsdGlwbGUgY3Vyc29ycyBmb3IgY29sbGVjdGlvbiBcIiArXG4gICAgICAgICAgICAgIGNvbGxlY3Rpb25OYW1lKSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbGxlY3Rpb25OYW1lc1tjb2xsZWN0aW9uTmFtZV0gPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChyZXMubWFwKGN1ciA9PiBjdXIuX3B1Ymxpc2hDdXJzb3Ioc2VsZikpKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgc2VsZi5lcnJvcihlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgc2VsZi5yZWFkeSgpO1xuICAgIH0gZWxzZSBpZiAocmVzKSB7XG4gICAgICAvLyBUcnV0aHkgdmFsdWVzIG90aGVyIHRoYW4gY3Vyc29ycyBvciBhcnJheXMgYXJlIHByb2JhYmx5IGFcbiAgICAgIC8vIHVzZXIgbWlzdGFrZSAocG9zc2libGUgcmV0dXJuaW5nIGEgTW9uZ28gZG9jdW1lbnQgdmlhLCBzYXksXG4gICAgICAvLyBgY29sbC5maW5kT25lKClgKS5cbiAgICAgIHNlbGYuZXJyb3IobmV3IEVycm9yKFwiUHVibGlzaCBmdW5jdGlvbiBjYW4gb25seSByZXR1cm4gYSBDdXJzb3Igb3IgXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICsgXCJhbiBhcnJheSBvZiBDdXJzb3JzXCIpKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gVGhpcyBjYWxscyBhbGwgc3RvcCBjYWxsYmFja3MgYW5kIHByZXZlbnRzIHRoZSBoYW5kbGVyIGZyb20gdXBkYXRpbmcgYW55XG4gIC8vIFNlc3Npb25Db2xsZWN0aW9uVmlld3MgZnVydGhlci4gSXQncyB1c2VkIHdoZW4gdGhlIHVzZXIgdW5zdWJzY3JpYmVzIG9yXG4gIC8vIGRpc2Nvbm5lY3RzLCBhcyB3ZWxsIGFzIGR1cmluZyBzZXRVc2VySWQgcmUtcnVucy4gSXQgZG9lcyAqTk9UKiBzZW5kXG4gIC8vIHJlbW92ZWQgbWVzc2FnZXMgZm9yIHRoZSBwdWJsaXNoZWQgb2JqZWN0czsgaWYgdGhhdCBpcyBuZWNlc3NhcnksIGNhbGxcbiAgLy8gX3JlbW92ZUFsbERvY3VtZW50cyBmaXJzdC5cbiAgX2RlYWN0aXZhdGU6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fZGVhY3RpdmF0ZWQpXG4gICAgICByZXR1cm47XG4gICAgc2VsZi5fZGVhY3RpdmF0ZWQgPSB0cnVlO1xuICAgIHNlbGYuX2NhbGxTdG9wQ2FsbGJhY2tzKCk7XG4gICAgUGFja2FnZVsnZmFjdHMtYmFzZSddICYmIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgICAgXCJsaXZlZGF0YVwiLCBcInN1YnNjcmlwdGlvbnNcIiwgLTEpO1xuICB9LFxuXG4gIF9jYWxsU3RvcENhbGxiYWNrczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBUZWxsIGxpc3RlbmVycywgc28gdGhleSBjYW4gY2xlYW4gdXBcbiAgICB2YXIgY2FsbGJhY2tzID0gc2VsZi5fc3RvcENhbGxiYWNrcztcbiAgICBzZWxmLl9zdG9wQ2FsbGJhY2tzID0gW107XG4gICAgY2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjaygpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFNlbmQgcmVtb3ZlIG1lc3NhZ2VzIGZvciBldmVyeSBkb2N1bWVudC5cbiAgX3JlbW92ZUFsbERvY3VtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9kb2N1bWVudHMuZm9yRWFjaChmdW5jdGlvbiAoY29sbGVjdGlvbkRvY3MsIGNvbGxlY3Rpb25OYW1lKSB7XG4gICAgICAgIGNvbGxlY3Rpb25Eb2NzLmZvckVhY2goZnVuY3Rpb24gKHN0cklkKSB7XG4gICAgICAgICAgc2VsZi5yZW1vdmVkKGNvbGxlY3Rpb25OYW1lLCBzZWxmLl9pZEZpbHRlci5pZFBhcnNlKHN0cklkKSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gUmV0dXJucyBhIG5ldyBTdWJzY3JpcHRpb24gZm9yIHRoZSBzYW1lIHNlc3Npb24gd2l0aCB0aGUgc2FtZVxuICAvLyBpbml0aWFsIGNyZWF0aW9uIHBhcmFtZXRlcnMuIFRoaXMgaXNuJ3QgYSBjbG9uZTogaXQgZG9lc24ndCBoYXZlXG4gIC8vIHRoZSBzYW1lIF9kb2N1bWVudHMgY2FjaGUsIHN0b3BwZWQgc3RhdGUgb3IgY2FsbGJhY2tzOyBtYXkgaGF2ZSBhXG4gIC8vIGRpZmZlcmVudCBfc3Vic2NyaXB0aW9uSGFuZGxlLCBhbmQgZ2V0cyBpdHMgdXNlcklkIGZyb20gdGhlXG4gIC8vIHNlc3Npb24sIG5vdCBmcm9tIHRoaXMgb2JqZWN0LlxuICBfcmVjcmVhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBTdWJzY3JpcHRpb24oXG4gICAgICBzZWxmLl9zZXNzaW9uLCBzZWxmLl9oYW5kbGVyLCBzZWxmLl9zdWJzY3JpcHRpb25JZCwgc2VsZi5fcGFyYW1zLFxuICAgICAgc2VsZi5fbmFtZSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IENhbGwgaW5zaWRlIHRoZSBwdWJsaXNoIGZ1bmN0aW9uLiAgU3RvcHMgdGhpcyBjbGllbnQncyBzdWJzY3JpcHRpb24sIHRyaWdnZXJpbmcgYSBjYWxsIG9uIHRoZSBjbGllbnQgdG8gdGhlIGBvblN0b3BgIGNhbGxiYWNrIHBhc3NlZCB0byBbYE1ldGVvci5zdWJzY3JpYmVgXSgjbWV0ZW9yX3N1YnNjcmliZSksIGlmIGFueS4gSWYgYGVycm9yYCBpcyBub3QgYSBbYE1ldGVvci5FcnJvcmBdKCNtZXRlb3JfZXJyb3IpLCBpdCB3aWxsIGJlIFtzYW5pdGl6ZWRdKCNtZXRlb3JfZXJyb3IpLlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBwYXJhbSB7RXJyb3J9IGVycm9yIFRoZSBlcnJvciB0byBwYXNzIHRvIHRoZSBjbGllbnQuXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAbWVtYmVyT2YgU3Vic2NyaXB0aW9uXG4gICAqL1xuICBlcnJvcjogZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9pc0RlYWN0aXZhdGVkKCkpXG4gICAgICByZXR1cm47XG4gICAgc2VsZi5fc2Vzc2lvbi5fc3RvcFN1YnNjcmlwdGlvbihzZWxmLl9zdWJzY3JpcHRpb25JZCwgZXJyb3IpO1xuICB9LFxuXG4gIC8vIE5vdGUgdGhhdCB3aGlsZSBvdXIgRERQIGNsaWVudCB3aWxsIG5vdGljZSB0aGF0IHlvdSd2ZSBjYWxsZWQgc3RvcCgpIG9uIHRoZVxuICAvLyBzZXJ2ZXIgKGFuZCBjbGVhbiB1cCBpdHMgX3N1YnNjcmlwdGlvbnMgdGFibGUpIHdlIGRvbid0IGFjdHVhbGx5IHByb3ZpZGUgYVxuICAvLyBtZWNoYW5pc20gZm9yIGFuIGFwcCB0byBub3RpY2UgdGhpcyAodGhlIHN1YnNjcmliZSBvbkVycm9yIGNhbGxiYWNrIG9ubHlcbiAgLy8gdHJpZ2dlcnMgaWYgdGhlcmUgaXMgYW4gZXJyb3IpLlxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBDYWxsIGluc2lkZSB0aGUgcHVibGlzaCBmdW5jdGlvbi4gIFN0b3BzIHRoaXMgY2xpZW50J3Mgc3Vic2NyaXB0aW9uIGFuZCBpbnZva2VzIHRoZSBjbGllbnQncyBgb25TdG9wYCBjYWxsYmFjayB3aXRoIG5vIGVycm9yLlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAbWVtYmVyT2YgU3Vic2NyaXB0aW9uXG4gICAqL1xuICBzdG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9pc0RlYWN0aXZhdGVkKCkpXG4gICAgICByZXR1cm47XG4gICAgc2VsZi5fc2Vzc2lvbi5fc3RvcFN1YnNjcmlwdGlvbihzZWxmLl9zdWJzY3JpcHRpb25JZCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IENhbGwgaW5zaWRlIHRoZSBwdWJsaXNoIGZ1bmN0aW9uLiAgUmVnaXN0ZXJzIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gcnVuIHdoZW4gdGhlIHN1YnNjcmlwdGlvbiBpcyBzdG9wcGVkLlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBTdWJzY3JpcHRpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAqL1xuICBvblN0b3A6IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBjYWxsYmFjayA9IE1ldGVvci5iaW5kRW52aXJvbm1lbnQoY2FsbGJhY2ssICdvblN0b3AgY2FsbGJhY2snLCBzZWxmKTtcbiAgICBpZiAoc2VsZi5faXNEZWFjdGl2YXRlZCgpKVxuICAgICAgY2FsbGJhY2soKTtcbiAgICBlbHNlXG4gICAgICBzZWxmLl9zdG9wQ2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuICB9LFxuXG4gIC8vIFRoaXMgcmV0dXJucyB0cnVlIGlmIHRoZSBzdWIgaGFzIGJlZW4gZGVhY3RpdmF0ZWQsICpPUiogaWYgdGhlIHNlc3Npb24gd2FzXG4gIC8vIGRlc3Ryb3llZCBidXQgdGhlIGRlZmVycmVkIGNhbGwgdG8gX2RlYWN0aXZhdGVBbGxTdWJzY3JpcHRpb25zIGhhc24ndFxuICAvLyBoYXBwZW5lZCB5ZXQuXG4gIF9pc0RlYWN0aXZhdGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBzZWxmLl9kZWFjdGl2YXRlZCB8fCBzZWxmLl9zZXNzaW9uLmluUXVldWUgPT09IG51bGw7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IENhbGwgaW5zaWRlIHRoZSBwdWJsaXNoIGZ1bmN0aW9uLiAgSW5mb3JtcyB0aGUgc3Vic2NyaWJlciB0aGF0IGEgZG9jdW1lbnQgaGFzIGJlZW4gYWRkZWQgdG8gdGhlIHJlY29yZCBzZXQuXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIFN1YnNjcmlwdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb24gVGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24gdGhhdCBjb250YWlucyB0aGUgbmV3IGRvY3VtZW50LlxuICAgKiBAcGFyYW0ge1N0cmluZ30gaWQgVGhlIG5ldyBkb2N1bWVudCdzIElELlxuICAgKiBAcGFyYW0ge09iamVjdH0gZmllbGRzIFRoZSBmaWVsZHMgaW4gdGhlIG5ldyBkb2N1bWVudC4gIElmIGBfaWRgIGlzIHByZXNlbnQgaXQgaXMgaWdub3JlZC5cbiAgICovXG4gIGFkZGVkIChjb2xsZWN0aW9uTmFtZSwgaWQsIGZpZWxkcykge1xuICAgIGlmICh0aGlzLl9pc0RlYWN0aXZhdGVkKCkpXG4gICAgICByZXR1cm47XG4gICAgaWQgPSB0aGlzLl9pZEZpbHRlci5pZFN0cmluZ2lmeShpZCk7XG5cbiAgICBpZiAodGhpcy5fc2Vzc2lvbi5zZXJ2ZXIuZ2V0UHVibGljYXRpb25TdHJhdGVneShjb2xsZWN0aW9uTmFtZSkuZG9BY2NvdW50aW5nRm9yQ29sbGVjdGlvbikge1xuICAgICAgbGV0IGlkcyA9IHRoaXMuX2RvY3VtZW50cy5nZXQoY29sbGVjdGlvbk5hbWUpO1xuICAgICAgaWYgKGlkcyA9PSBudWxsKSB7XG4gICAgICAgIGlkcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5fZG9jdW1lbnRzLnNldChjb2xsZWN0aW9uTmFtZSwgaWRzKTtcbiAgICAgIH1cbiAgICAgIGlkcy5hZGQoaWQpO1xuICAgIH1cblxuICAgIHRoaXMuX3Nlc3Npb24uYWRkZWQodGhpcy5fc3Vic2NyaXB0aW9uSGFuZGxlLCBjb2xsZWN0aW9uTmFtZSwgaWQsIGZpZWxkcyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IENhbGwgaW5zaWRlIHRoZSBwdWJsaXNoIGZ1bmN0aW9uLiAgSW5mb3JtcyB0aGUgc3Vic2NyaWJlciB0aGF0IGEgZG9jdW1lbnQgaW4gdGhlIHJlY29yZCBzZXQgaGFzIGJlZW4gbW9kaWZpZWQuXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIFN1YnNjcmlwdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb24gVGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24gdGhhdCBjb250YWlucyB0aGUgY2hhbmdlZCBkb2N1bWVudC5cbiAgICogQHBhcmFtIHtTdHJpbmd9IGlkIFRoZSBjaGFuZ2VkIGRvY3VtZW50J3MgSUQuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBmaWVsZHMgVGhlIGZpZWxkcyBpbiB0aGUgZG9jdW1lbnQgdGhhdCBoYXZlIGNoYW5nZWQsIHRvZ2V0aGVyIHdpdGggdGhlaXIgbmV3IHZhbHVlcy4gIElmIGEgZmllbGQgaXMgbm90IHByZXNlbnQgaW4gYGZpZWxkc2AgaXQgd2FzIGxlZnQgdW5jaGFuZ2VkOyBpZiBpdCBpcyBwcmVzZW50IGluIGBmaWVsZHNgIGFuZCBoYXMgYSB2YWx1ZSBvZiBgdW5kZWZpbmVkYCBpdCB3YXMgcmVtb3ZlZCBmcm9tIHRoZSBkb2N1bWVudC4gIElmIGBfaWRgIGlzIHByZXNlbnQgaXQgaXMgaWdub3JlZC5cbiAgICovXG4gIGNoYW5nZWQgKGNvbGxlY3Rpb25OYW1lLCBpZCwgZmllbGRzKSB7XG4gICAgaWYgKHRoaXMuX2lzRGVhY3RpdmF0ZWQoKSlcbiAgICAgIHJldHVybjtcbiAgICBpZCA9IHRoaXMuX2lkRmlsdGVyLmlkU3RyaW5naWZ5KGlkKTtcbiAgICB0aGlzLl9zZXNzaW9uLmNoYW5nZWQodGhpcy5fc3Vic2NyaXB0aW9uSGFuZGxlLCBjb2xsZWN0aW9uTmFtZSwgaWQsIGZpZWxkcyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IENhbGwgaW5zaWRlIHRoZSBwdWJsaXNoIGZ1bmN0aW9uLiAgSW5mb3JtcyB0aGUgc3Vic2NyaWJlciB0aGF0IGEgZG9jdW1lbnQgaGFzIGJlZW4gcmVtb3ZlZCBmcm9tIHRoZSByZWNvcmQgc2V0LlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBTdWJzY3JpcHRpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBuYW1lIG9mIHRoZSBjb2xsZWN0aW9uIHRoYXQgdGhlIGRvY3VtZW50IGhhcyBiZWVuIHJlbW92ZWQgZnJvbS5cbiAgICogQHBhcmFtIHtTdHJpbmd9IGlkIFRoZSBJRCBvZiB0aGUgZG9jdW1lbnQgdGhhdCBoYXMgYmVlbiByZW1vdmVkLlxuICAgKi9cbiAgcmVtb3ZlZCAoY29sbGVjdGlvbk5hbWUsIGlkKSB7XG4gICAgaWYgKHRoaXMuX2lzRGVhY3RpdmF0ZWQoKSlcbiAgICAgIHJldHVybjtcbiAgICBpZCA9IHRoaXMuX2lkRmlsdGVyLmlkU3RyaW5naWZ5KGlkKTtcblxuICAgIGlmICh0aGlzLl9zZXNzaW9uLnNlcnZlci5nZXRQdWJsaWNhdGlvblN0cmF0ZWd5KGNvbGxlY3Rpb25OYW1lKS5kb0FjY291bnRpbmdGb3JDb2xsZWN0aW9uKSB7XG4gICAgICAvLyBXZSBkb24ndCBib3RoZXIgdG8gZGVsZXRlIHNldHMgb2YgdGhpbmdzIGluIGEgY29sbGVjdGlvbiBpZiB0aGVcbiAgICAgIC8vIGNvbGxlY3Rpb24gaXMgZW1wdHkuICBJdCBjb3VsZCBicmVhayBfcmVtb3ZlQWxsRG9jdW1lbnRzLlxuICAgICAgdGhpcy5fZG9jdW1lbnRzLmdldChjb2xsZWN0aW9uTmFtZSkuZGVsZXRlKGlkKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zZXNzaW9uLnJlbW92ZWQodGhpcy5fc3Vic2NyaXB0aW9uSGFuZGxlLCBjb2xsZWN0aW9uTmFtZSwgaWQpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBDYWxsIGluc2lkZSB0aGUgcHVibGlzaCBmdW5jdGlvbi4gIEluZm9ybXMgdGhlIHN1YnNjcmliZXIgdGhhdCBhbiBpbml0aWFsLCBjb21wbGV0ZSBzbmFwc2hvdCBvZiB0aGUgcmVjb3JkIHNldCBoYXMgYmVlbiBzZW50LiAgVGhpcyB3aWxsIHRyaWdnZXIgYSBjYWxsIG9uIHRoZSBjbGllbnQgdG8gdGhlIGBvblJlYWR5YCBjYWxsYmFjayBwYXNzZWQgdG8gIFtgTWV0ZW9yLnN1YnNjcmliZWBdKCNtZXRlb3Jfc3Vic2NyaWJlKSwgaWYgYW55LlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBTdWJzY3JpcHRpb25cbiAgICogQGluc3RhbmNlXG4gICAqL1xuICByZWFkeTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5faXNEZWFjdGl2YXRlZCgpKVxuICAgICAgcmV0dXJuO1xuICAgIGlmICghc2VsZi5fc3Vic2NyaXB0aW9uSWQpXG4gICAgICByZXR1cm47ICAvLyBVbm5lY2Vzc2FyeSBidXQgaWdub3JlZCBmb3IgdW5pdmVyc2FsIHN1YlxuICAgIGlmICghc2VsZi5fcmVhZHkpIHtcbiAgICAgIHNlbGYuX3Nlc3Npb24uc2VuZFJlYWR5KFtzZWxmLl9zdWJzY3JpcHRpb25JZF0pO1xuICAgICAgc2VsZi5fcmVhZHkgPSB0cnVlO1xuICAgIH1cbiAgfVxufSk7XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4vKiBTZXJ2ZXIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuU2VydmVyID0gZnVuY3Rpb24gKG9wdGlvbnMgPSB7fSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgLy8gVGhlIGRlZmF1bHQgaGVhcnRiZWF0IGludGVydmFsIGlzIDMwIHNlY29uZHMgb24gdGhlIHNlcnZlciBhbmQgMzVcbiAgLy8gc2Vjb25kcyBvbiB0aGUgY2xpZW50LiAgU2luY2UgdGhlIGNsaWVudCBkb2Vzbid0IG5lZWQgdG8gc2VuZCBhXG4gIC8vIHBpbmcgYXMgbG9uZyBhcyBpdCBpcyByZWNlaXZpbmcgcGluZ3MsIHRoaXMgbWVhbnMgdGhhdCBwaW5nc1xuICAvLyBub3JtYWxseSBnbyBmcm9tIHRoZSBzZXJ2ZXIgdG8gdGhlIGNsaWVudC5cbiAgLy9cbiAgLy8gTm90ZTogVHJvcG9zcGhlcmUgZGVwZW5kcyBvbiB0aGUgYWJpbGl0eSB0byBtdXRhdGVcbiAgLy8gTWV0ZW9yLnNlcnZlci5vcHRpb25zLmhlYXJ0YmVhdFRpbWVvdXQhIFRoaXMgaXMgYSBoYWNrLCBidXQgaXQncyBsaWZlLlxuICBzZWxmLm9wdGlvbnMgPSB7XG4gICAgaGVhcnRiZWF0SW50ZXJ2YWw6IDE1MDAwLFxuICAgIGhlYXJ0YmVhdFRpbWVvdXQ6IDE1MDAwLFxuICAgIC8vIEZvciB0ZXN0aW5nLCBhbGxvdyByZXNwb25kaW5nIHRvIHBpbmdzIHRvIGJlIGRpc2FibGVkLlxuICAgIHJlc3BvbmRUb1BpbmdzOiB0cnVlLFxuICAgIGRlZmF1bHRQdWJsaWNhdGlvblN0cmF0ZWd5OiBwdWJsaWNhdGlvblN0cmF0ZWdpZXMuU0VSVkVSX01FUkdFLFxuICAgIC4uLm9wdGlvbnMsXG4gIH07XG5cbiAgLy8gTWFwIG9mIGNhbGxiYWNrcyB0byBjYWxsIHdoZW4gYSBuZXcgY29ubmVjdGlvbiBjb21lcyBpbiB0byB0aGVcbiAgLy8gc2VydmVyIGFuZCBjb21wbGV0ZXMgRERQIHZlcnNpb24gbmVnb3RpYXRpb24uIFVzZSBhbiBvYmplY3QgaW5zdGVhZFxuICAvLyBvZiBhbiBhcnJheSBzbyB3ZSBjYW4gc2FmZWx5IHJlbW92ZSBvbmUgZnJvbSB0aGUgbGlzdCB3aGlsZVxuICAvLyBpdGVyYXRpbmcgb3ZlciBpdC5cbiAgc2VsZi5vbkNvbm5lY3Rpb25Ib29rID0gbmV3IEhvb2soe1xuICAgIGRlYnVnUHJpbnRFeGNlcHRpb25zOiBcIm9uQ29ubmVjdGlvbiBjYWxsYmFja1wiXG4gIH0pO1xuXG4gIC8vIE1hcCBvZiBjYWxsYmFja3MgdG8gY2FsbCB3aGVuIGEgbmV3IG1lc3NhZ2UgY29tZXMgaW4uXG4gIHNlbGYub25NZXNzYWdlSG9vayA9IG5ldyBIb29rKHtcbiAgICBkZWJ1Z1ByaW50RXhjZXB0aW9uczogXCJvbk1lc3NhZ2UgY2FsbGJhY2tcIlxuICB9KTtcblxuICBzZWxmLnB1Ymxpc2hfaGFuZGxlcnMgPSB7fTtcbiAgc2VsZi51bml2ZXJzYWxfcHVibGlzaF9oYW5kbGVycyA9IFtdO1xuXG4gIHNlbGYubWV0aG9kX2hhbmRsZXJzID0ge307XG5cbiAgc2VsZi5fcHVibGljYXRpb25TdHJhdGVnaWVzID0ge307XG5cbiAgc2VsZi5zZXNzaW9ucyA9IG5ldyBNYXAoKTsgLy8gbWFwIGZyb20gaWQgdG8gc2Vzc2lvblxuXG4gIHNlbGYuc3RyZWFtX3NlcnZlciA9IG5ldyBTdHJlYW1TZXJ2ZXIoKTtcblxuICBzZWxmLnN0cmVhbV9zZXJ2ZXIucmVnaXN0ZXIoZnVuY3Rpb24gKHNvY2tldCkge1xuICAgIC8vIHNvY2tldCBpbXBsZW1lbnRzIHRoZSBTb2NrSlNDb25uZWN0aW9uIGludGVyZmFjZVxuICAgIHNvY2tldC5fbWV0ZW9yU2Vzc2lvbiA9IG51bGw7XG5cbiAgICB2YXIgc2VuZEVycm9yID0gZnVuY3Rpb24gKHJlYXNvbiwgb2ZmZW5kaW5nTWVzc2FnZSkge1xuICAgICAgdmFyIG1zZyA9IHttc2c6ICdlcnJvcicsIHJlYXNvbjogcmVhc29ufTtcbiAgICAgIGlmIChvZmZlbmRpbmdNZXNzYWdlKVxuICAgICAgICBtc2cub2ZmZW5kaW5nTWVzc2FnZSA9IG9mZmVuZGluZ01lc3NhZ2U7XG4gICAgICBzb2NrZXQuc2VuZChERFBDb21tb24uc3RyaW5naWZ5RERQKG1zZykpO1xuICAgIH07XG5cbiAgICBzb2NrZXQub24oJ2RhdGEnLCBmdW5jdGlvbiAocmF3X21zZykge1xuICAgICAgaWYgKE1ldGVvci5fcHJpbnRSZWNlaXZlZEREUCkge1xuICAgICAgICBNZXRlb3IuX2RlYnVnKFwiUmVjZWl2ZWQgRERQXCIsIHJhd19tc2cpO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB2YXIgbXNnID0gRERQQ29tbW9uLnBhcnNlRERQKHJhd19tc2cpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBzZW5kRXJyb3IoJ1BhcnNlIGVycm9yJyk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtc2cgPT09IG51bGwgfHwgIW1zZy5tc2cpIHtcbiAgICAgICAgICBzZW5kRXJyb3IoJ0JhZCByZXF1ZXN0JywgbXNnKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobXNnLm1zZyA9PT0gJ2Nvbm5lY3QnKSB7XG4gICAgICAgICAgaWYgKHNvY2tldC5fbWV0ZW9yU2Vzc2lvbikge1xuICAgICAgICAgICAgc2VuZEVycm9yKFwiQWxyZWFkeSBjb25uZWN0ZWRcIiwgbXNnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzZWxmLl9oYW5kbGVDb25uZWN0KHNvY2tldCwgbXNnKTtcblxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghc29ja2V0Ll9tZXRlb3JTZXNzaW9uKSB7XG4gICAgICAgICAgc2VuZEVycm9yKCdNdXN0IGNvbm5lY3QgZmlyc3QnLCBtc2cpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzb2NrZXQuX21ldGVvclNlc3Npb24ucHJvY2Vzc01lc3NhZ2UobXNnKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gWFhYIHByaW50IHN0YWNrIG5pY2VseVxuICAgICAgICBNZXRlb3IuX2RlYnVnKFwiSW50ZXJuYWwgZXhjZXB0aW9uIHdoaWxlIHByb2Nlc3NpbmcgbWVzc2FnZVwiLCBtc2csIGUpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKCdjbG9zZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmIChzb2NrZXQuX21ldGVvclNlc3Npb24pIHtcbiAgICAgICAgc29ja2V0Ll9tZXRlb3JTZXNzaW9uLmNsb3NlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufTtcblxuT2JqZWN0LmFzc2lnbihTZXJ2ZXIucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFJlZ2lzdGVyIGEgY2FsbGJhY2sgdG8gYmUgY2FsbGVkIHdoZW4gYSBuZXcgRERQIGNvbm5lY3Rpb24gaXMgbWFkZSB0byB0aGUgc2VydmVyLlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gYSBuZXcgRERQIGNvbm5lY3Rpb24gaXMgZXN0YWJsaXNoZWQuXG4gICAqIEBtZW1iZXJPZiBNZXRlb3JcbiAgICogQGltcG9ydEZyb21QYWNrYWdlIG1ldGVvclxuICAgKi9cbiAgb25Db25uZWN0aW9uOiBmdW5jdGlvbiAoZm4pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIHNlbGYub25Db25uZWN0aW9uSG9vay5yZWdpc3Rlcihmbik7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFNldCBwdWJsaWNhdGlvbiBzdHJhdGVneSBmb3IgdGhlIGdpdmVuIGNvbGxlY3Rpb24uIFB1YmxpY2F0aW9ucyBzdHJhdGVnaWVzIGFyZSBhdmFpbGFibGUgZnJvbSBgRERQU2VydmVyLnB1YmxpY2F0aW9uU3RyYXRlZ2llc2AuIFlvdSBjYWxsIHRoaXMgbWV0aG9kIGZyb20gYE1ldGVvci5zZXJ2ZXJgLCBsaWtlIGBNZXRlb3Iuc2VydmVyLnNldFB1YmxpY2F0aW9uU3RyYXRlZ3koKWBcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAYWxpYXMgc2V0UHVibGljYXRpb25TdHJhdGVneVxuICAgKiBAcGFyYW0gY29sbGVjdGlvbk5hbWUge1N0cmluZ31cbiAgICogQHBhcmFtIHN0cmF0ZWd5IHt7dXNlQ29sbGVjdGlvblZpZXc6IGJvb2xlYW4sIGRvQWNjb3VudGluZ0ZvckNvbGxlY3Rpb246IGJvb2xlYW59fVxuICAgKiBAbWVtYmVyT2YgTWV0ZW9yLnNlcnZlclxuICAgKiBAaW1wb3J0RnJvbVBhY2thZ2UgbWV0ZW9yXG4gICAqL1xuICBzZXRQdWJsaWNhdGlvblN0cmF0ZWd5KGNvbGxlY3Rpb25OYW1lLCBzdHJhdGVneSkge1xuICAgIGlmICghT2JqZWN0LnZhbHVlcyhwdWJsaWNhdGlvblN0cmF0ZWdpZXMpLmluY2x1ZGVzKHN0cmF0ZWd5KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIG1lcmdlIHN0cmF0ZWd5OiAke3N0cmF0ZWd5fSBcbiAgICAgICAgZm9yIGNvbGxlY3Rpb24gJHtjb2xsZWN0aW9uTmFtZX1gKTtcbiAgICB9XG4gICAgdGhpcy5fcHVibGljYXRpb25TdHJhdGVnaWVzW2NvbGxlY3Rpb25OYW1lXSA9IHN0cmF0ZWd5O1xuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBHZXRzIHRoZSBwdWJsaWNhdGlvbiBzdHJhdGVneSBmb3IgdGhlIHJlcXVlc3RlZCBjb2xsZWN0aW9uLiBZb3UgY2FsbCB0aGlzIG1ldGhvZCBmcm9tIGBNZXRlb3Iuc2VydmVyYCwgbGlrZSBgTWV0ZW9yLnNlcnZlci5nZXRQdWJsaWNhdGlvblN0cmF0ZWd5KClgXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQGFsaWFzIGdldFB1YmxpY2F0aW9uU3RyYXRlZ3lcbiAgICogQHBhcmFtIGNvbGxlY3Rpb25OYW1lIHtTdHJpbmd9XG4gICAqIEBtZW1iZXJPZiBNZXRlb3Iuc2VydmVyXG4gICAqIEBpbXBvcnRGcm9tUGFja2FnZSBtZXRlb3JcbiAgICogQHJldHVybiB7e3VzZUNvbGxlY3Rpb25WaWV3OiBib29sZWFuLCBkb0FjY291bnRpbmdGb3JDb2xsZWN0aW9uOiBib29sZWFufX1cbiAgICovXG4gIGdldFB1YmxpY2F0aW9uU3RyYXRlZ3koY29sbGVjdGlvbk5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5fcHVibGljYXRpb25TdHJhdGVnaWVzW2NvbGxlY3Rpb25OYW1lXVxuICAgICAgfHwgdGhpcy5vcHRpb25zLmRlZmF1bHRQdWJsaWNhdGlvblN0cmF0ZWd5O1xuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBSZWdpc3RlciBhIGNhbGxiYWNrIHRvIGJlIGNhbGxlZCB3aGVuIGEgbmV3IEREUCBtZXNzYWdlIGlzIHJlY2VpdmVkLlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gYSBuZXcgRERQIG1lc3NhZ2UgaXMgcmVjZWl2ZWQuXG4gICAqIEBtZW1iZXJPZiBNZXRlb3JcbiAgICogQGltcG9ydEZyb21QYWNrYWdlIG1ldGVvclxuICAgKi9cbiAgb25NZXNzYWdlOiBmdW5jdGlvbiAoZm4pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIHNlbGYub25NZXNzYWdlSG9vay5yZWdpc3Rlcihmbik7XG4gIH0sXG5cbiAgX2hhbmRsZUNvbm5lY3Q6IGZ1bmN0aW9uIChzb2NrZXQsIG1zZykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vIFRoZSBjb25uZWN0IG1lc3NhZ2UgbXVzdCBzcGVjaWZ5IGEgdmVyc2lvbiBhbmQgYW4gYXJyYXkgb2Ygc3VwcG9ydGVkXG4gICAgLy8gdmVyc2lvbnMsIGFuZCBpdCBtdXN0IGNsYWltIHRvIHN1cHBvcnQgd2hhdCBpdCBpcyBwcm9wb3NpbmcuXG4gICAgaWYgKCEodHlwZW9mIChtc2cudmVyc2lvbikgPT09ICdzdHJpbmcnICYmXG4gICAgICAgICAgQXJyYXkuaXNBcnJheShtc2cuc3VwcG9ydCkgJiZcbiAgICAgICAgICBtc2cuc3VwcG9ydC5ldmVyeShpc1N0cmluZykgJiZcbiAgICAgICAgICBtc2cuc3VwcG9ydC5pbmNsdWRlcyhtc2cudmVyc2lvbikpKSB7XG4gICAgICBzb2NrZXQuc2VuZChERFBDb21tb24uc3RyaW5naWZ5RERQKHttc2c6ICdmYWlsZWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiBERFBDb21tb24uU1VQUE9SVEVEX0REUF9WRVJTSU9OU1swXX0pKTtcbiAgICAgIHNvY2tldC5jbG9zZSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEluIHRoZSBmdXR1cmUsIGhhbmRsZSBzZXNzaW9uIHJlc3VtcHRpb246IHNvbWV0aGluZyBsaWtlOlxuICAgIC8vICBzb2NrZXQuX21ldGVvclNlc3Npb24gPSBzZWxmLnNlc3Npb25zW21zZy5zZXNzaW9uXVxuICAgIHZhciB2ZXJzaW9uID0gY2FsY3VsYXRlVmVyc2lvbihtc2cuc3VwcG9ydCwgRERQQ29tbW9uLlNVUFBPUlRFRF9ERFBfVkVSU0lPTlMpO1xuXG4gICAgaWYgKG1zZy52ZXJzaW9uICE9PSB2ZXJzaW9uKSB7XG4gICAgICAvLyBUaGUgYmVzdCB2ZXJzaW9uIHRvIHVzZSAoYWNjb3JkaW5nIHRvIHRoZSBjbGllbnQncyBzdGF0ZWQgcHJlZmVyZW5jZXMpXG4gICAgICAvLyBpcyBub3QgdGhlIG9uZSB0aGUgY2xpZW50IGlzIHRyeWluZyB0byB1c2UuIEluZm9ybSB0aGVtIGFib3V0IHRoZSBiZXN0XG4gICAgICAvLyB2ZXJzaW9uIHRvIHVzZS5cbiAgICAgIHNvY2tldC5zZW5kKEREUENvbW1vbi5zdHJpbmdpZnlERFAoe21zZzogJ2ZhaWxlZCcsIHZlcnNpb246IHZlcnNpb259KSk7XG4gICAgICBzb2NrZXQuY2xvc2UoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBZYXksIHZlcnNpb24gbWF0Y2hlcyEgQ3JlYXRlIGEgbmV3IHNlc3Npb24uXG4gICAgLy8gTm90ZTogVHJvcG9zcGhlcmUgZGVwZW5kcyBvbiB0aGUgYWJpbGl0eSB0byBtdXRhdGVcbiAgICAvLyBNZXRlb3Iuc2VydmVyLm9wdGlvbnMuaGVhcnRiZWF0VGltZW91dCEgVGhpcyBpcyBhIGhhY2ssIGJ1dCBpdCdzIGxpZmUuXG4gICAgc29ja2V0Ll9tZXRlb3JTZXNzaW9uID0gbmV3IFNlc3Npb24oc2VsZiwgdmVyc2lvbiwgc29ja2V0LCBzZWxmLm9wdGlvbnMpO1xuICAgIHNlbGYuc2Vzc2lvbnMuc2V0KHNvY2tldC5fbWV0ZW9yU2Vzc2lvbi5pZCwgc29ja2V0Ll9tZXRlb3JTZXNzaW9uKTtcbiAgICBzZWxmLm9uQ29ubmVjdGlvbkhvb2suZWFjaChmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgIGlmIChzb2NrZXQuX21ldGVvclNlc3Npb24pXG4gICAgICAgIGNhbGxiYWNrKHNvY2tldC5fbWV0ZW9yU2Vzc2lvbi5jb25uZWN0aW9uSGFuZGxlKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9LFxuICAvKipcbiAgICogUmVnaXN0ZXIgYSBwdWJsaXNoIGhhbmRsZXIgZnVuY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSBuYW1lIHtTdHJpbmd9IGlkZW50aWZpZXIgZm9yIHF1ZXJ5XG4gICAqIEBwYXJhbSBoYW5kbGVyIHtGdW5jdGlvbn0gcHVibGlzaCBoYW5kbGVyXG4gICAqIEBwYXJhbSBvcHRpb25zIHtPYmplY3R9XG4gICAqXG4gICAqIFNlcnZlciB3aWxsIGNhbGwgaGFuZGxlciBmdW5jdGlvbiBvbiBlYWNoIG5ldyBzdWJzY3JpcHRpb24sXG4gICAqIGVpdGhlciB3aGVuIHJlY2VpdmluZyBERFAgc3ViIG1lc3NhZ2UgZm9yIGEgbmFtZWQgc3Vic2NyaXB0aW9uLCBvciBvblxuICAgKiBERFAgY29ubmVjdCBmb3IgYSB1bml2ZXJzYWwgc3Vic2NyaXB0aW9uLlxuICAgKlxuICAgKiBJZiBuYW1lIGlzIG51bGwsIHRoaXMgd2lsbCBiZSBhIHN1YnNjcmlwdGlvbiB0aGF0IGlzXG4gICAqIGF1dG9tYXRpY2FsbHkgZXN0YWJsaXNoZWQgYW5kIHBlcm1hbmVudGx5IG9uIGZvciBhbGwgY29ubmVjdGVkXG4gICAqIGNsaWVudCwgaW5zdGVhZCBvZiBhIHN1YnNjcmlwdGlvbiB0aGF0IGNhbiBiZSB0dXJuZWQgb24gYW5kIG9mZlxuICAgKiB3aXRoIHN1YnNjcmliZSgpLlxuICAgKlxuICAgKiBvcHRpb25zIHRvIGNvbnRhaW46XG4gICAqICAtIChtb3N0bHkgaW50ZXJuYWwpIGlzX2F1dG86IHRydWUgaWYgZ2VuZXJhdGVkIGF1dG9tYXRpY2FsbHlcbiAgICogICAgZnJvbSBhbiBhdXRvcHVibGlzaCBob29rLiB0aGlzIGlzIGZvciBjb3NtZXRpYyBwdXJwb3NlcyBvbmx5XG4gICAqICAgIChpdCBsZXRzIHVzIGRldGVybWluZSB3aGV0aGVyIHRvIHByaW50IGEgd2FybmluZyBzdWdnZXN0aW5nXG4gICAqICAgIHRoYXQgeW91IHR1cm4gb2ZmIGF1dG9wdWJsaXNoKS5cbiAgICovXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFB1Ymxpc2ggYSByZWNvcmQgc2V0LlxuICAgKiBAbWVtYmVyT2YgTWV0ZW9yXG4gICAqIEBpbXBvcnRGcm9tUGFja2FnZSBtZXRlb3JcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IG5hbWUgSWYgU3RyaW5nLCBuYW1lIG9mIHRoZSByZWNvcmQgc2V0LiAgSWYgT2JqZWN0LCBwdWJsaWNhdGlvbnMgRGljdGlvbmFyeSBvZiBwdWJsaXNoIGZ1bmN0aW9ucyBieSBuYW1lLiAgSWYgYG51bGxgLCB0aGUgc2V0IGhhcyBubyBuYW1lLCBhbmQgdGhlIHJlY29yZCBzZXQgaXMgYXV0b21hdGljYWxseSBzZW50IHRvIGFsbCBjb25uZWN0ZWQgY2xpZW50cy5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBGdW5jdGlvbiBjYWxsZWQgb24gdGhlIHNlcnZlciBlYWNoIHRpbWUgYSBjbGllbnQgc3Vic2NyaWJlcy4gIEluc2lkZSB0aGUgZnVuY3Rpb24sIGB0aGlzYCBpcyB0aGUgcHVibGlzaCBoYW5kbGVyIG9iamVjdCwgZGVzY3JpYmVkIGJlbG93LiAgSWYgdGhlIGNsaWVudCBwYXNzZWQgYXJndW1lbnRzIHRvIGBzdWJzY3JpYmVgLCB0aGUgZnVuY3Rpb24gaXMgY2FsbGVkIHdpdGggdGhlIHNhbWUgYXJndW1lbnRzLlxuICAgKi9cbiAgcHVibGlzaDogZnVuY3Rpb24gKG5hbWUsIGhhbmRsZXIsIG9wdGlvbnMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAoIWlzT2JqZWN0KG5hbWUpKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgaWYgKG5hbWUgJiYgbmFtZSBpbiBzZWxmLnB1Ymxpc2hfaGFuZGxlcnMpIHtcbiAgICAgICAgTWV0ZW9yLl9kZWJ1ZyhcIklnbm9yaW5nIGR1cGxpY2F0ZSBwdWJsaXNoIG5hbWVkICdcIiArIG5hbWUgKyBcIidcIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKFBhY2thZ2UuYXV0b3B1Ymxpc2ggJiYgIW9wdGlvbnMuaXNfYXV0bykge1xuICAgICAgICAvLyBUaGV5IGhhdmUgYXV0b3B1Ymxpc2ggb24sIHlldCB0aGV5J3JlIHRyeWluZyB0byBtYW51YWxseVxuICAgICAgICAvLyBwaWNrIHN0dWZmIHRvIHB1Ymxpc2guIFRoZXkgcHJvYmFibHkgc2hvdWxkIHR1cm4gb2ZmXG4gICAgICAgIC8vIGF1dG9wdWJsaXNoLiAoVGhpcyBjaGVjayBpc24ndCBwZXJmZWN0IC0tIGlmIHlvdSBjcmVhdGUgYVxuICAgICAgICAvLyBwdWJsaXNoIGJlZm9yZSB5b3UgdHVybiBvbiBhdXRvcHVibGlzaCwgaXQgd29uJ3QgY2F0Y2hcbiAgICAgICAgLy8gaXQsIGJ1dCB0aGlzIHdpbGwgZGVmaW5pdGVseSBoYW5kbGUgdGhlIHNpbXBsZSBjYXNlIHdoZXJlXG4gICAgICAgIC8vIHlvdSd2ZSBhZGRlZCB0aGUgYXV0b3B1Ymxpc2ggcGFja2FnZSB0byB5b3VyIGFwcCwgYW5kIGFyZVxuICAgICAgICAvLyBjYWxsaW5nIHB1Ymxpc2ggZnJvbSB5b3VyIGFwcCBjb2RlKS5cbiAgICAgICAgaWYgKCFzZWxmLndhcm5lZF9hYm91dF9hdXRvcHVibGlzaCkge1xuICAgICAgICAgIHNlbGYud2FybmVkX2Fib3V0X2F1dG9wdWJsaXNoID0gdHJ1ZTtcbiAgICAgICAgICBNZXRlb3IuX2RlYnVnKFxuICAgIFwiKiogWW91J3ZlIHNldCB1cCBzb21lIGRhdGEgc3Vic2NyaXB0aW9ucyB3aXRoIE1ldGVvci5wdWJsaXNoKCksIGJ1dFxcblwiICtcbiAgICBcIioqIHlvdSBzdGlsbCBoYXZlIGF1dG9wdWJsaXNoIHR1cm5lZCBvbi4gQmVjYXVzZSBhdXRvcHVibGlzaCBpcyBzdGlsbFxcblwiICtcbiAgICBcIioqIG9uLCB5b3VyIE1ldGVvci5wdWJsaXNoKCkgY2FsbHMgd29uJ3QgaGF2ZSBtdWNoIGVmZmVjdC4gQWxsIGRhdGFcXG5cIiArXG4gICAgXCIqKiB3aWxsIHN0aWxsIGJlIHNlbnQgdG8gYWxsIGNsaWVudHMuXFxuXCIgK1xuICAgIFwiKipcXG5cIiArXG4gICAgXCIqKiBUdXJuIG9mZiBhdXRvcHVibGlzaCBieSByZW1vdmluZyB0aGUgYXV0b3B1Ymxpc2ggcGFja2FnZTpcXG5cIiArXG4gICAgXCIqKlxcblwiICtcbiAgICBcIioqICAgJCBtZXRlb3IgcmVtb3ZlIGF1dG9wdWJsaXNoXFxuXCIgK1xuICAgIFwiKipcXG5cIiArXG4gICAgXCIqKiAuLiBhbmQgbWFrZSBzdXJlIHlvdSBoYXZlIE1ldGVvci5wdWJsaXNoKCkgYW5kIE1ldGVvci5zdWJzY3JpYmUoKSBjYWxsc1xcblwiICtcbiAgICBcIioqIGZvciBlYWNoIGNvbGxlY3Rpb24gdGhhdCB5b3Ugd2FudCBjbGllbnRzIHRvIHNlZS5cXG5cIik7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKG5hbWUpXG4gICAgICAgIHNlbGYucHVibGlzaF9oYW5kbGVyc1tuYW1lXSA9IGhhbmRsZXI7XG4gICAgICBlbHNlIHtcbiAgICAgICAgc2VsZi51bml2ZXJzYWxfcHVibGlzaF9oYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgICAgICAvLyBTcGluIHVwIHRoZSBuZXcgcHVibGlzaGVyIG9uIGFueSBleGlzdGluZyBzZXNzaW9uIHRvby4gUnVuIGVhY2hcbiAgICAgICAgLy8gc2Vzc2lvbidzIHN1YnNjcmlwdGlvbiBpbiBhIG5ldyBGaWJlciwgc28gdGhhdCB0aGVyZSdzIG5vIGNoYW5nZSBmb3JcbiAgICAgICAgLy8gc2VsZi5zZXNzaW9ucyB0byBjaGFuZ2Ugd2hpbGUgd2UncmUgcnVubmluZyB0aGlzIGxvb3AuXG4gICAgICAgIHNlbGYuc2Vzc2lvbnMuZm9yRWFjaChmdW5jdGlvbiAoc2Vzc2lvbikge1xuICAgICAgICAgIGlmICghc2Vzc2lvbi5fZG9udFN0YXJ0TmV3VW5pdmVyc2FsU3Vicykge1xuICAgICAgICAgICAgc2Vzc2lvbi5fc3RhcnRTdWJzY3JpcHRpb24oaGFuZGxlcik7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZXtcbiAgICAgIE9iamVjdC5lbnRyaWVzKG5hbWUpLmZvckVhY2goZnVuY3Rpb24oW2tleSwgdmFsdWVdKSB7XG4gICAgICAgIHNlbGYucHVibGlzaChrZXksIHZhbHVlLCB7fSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgX3JlbW92ZVNlc3Npb246IGZ1bmN0aW9uIChzZXNzaW9uKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYuc2Vzc2lvbnMuZGVsZXRlKHNlc3Npb24uaWQpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBUZWxscyBpZiB0aGUgbWV0aG9kIGNhbGwgY2FtZSBmcm9tIGEgY2FsbCBvciBhIGNhbGxBc3luYy5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBNZXRlb3JcbiAgICogQGltcG9ydEZyb21QYWNrYWdlIG1ldGVvclxuICAgKiBAcmV0dXJucyBib29sZWFuXG4gICAqL1xuICBpc0FzeW5jQ2FsbDogZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gRERQLl9DdXJyZW50TWV0aG9kSW52b2NhdGlvbi5faXNDYWxsQXN5bmNNZXRob2RSdW5uaW5nKClcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgRGVmaW5lcyBmdW5jdGlvbnMgdGhhdCBjYW4gYmUgaW52b2tlZCBvdmVyIHRoZSBuZXR3b3JrIGJ5IGNsaWVudHMuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAcGFyYW0ge09iamVjdH0gbWV0aG9kcyBEaWN0aW9uYXJ5IHdob3NlIGtleXMgYXJlIG1ldGhvZCBuYW1lcyBhbmQgdmFsdWVzIGFyZSBmdW5jdGlvbnMuXG4gICAqIEBtZW1iZXJPZiBNZXRlb3JcbiAgICogQGltcG9ydEZyb21QYWNrYWdlIG1ldGVvclxuICAgKi9cbiAgbWV0aG9kczogZnVuY3Rpb24gKG1ldGhvZHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgT2JqZWN0LmVudHJpZXMobWV0aG9kcykuZm9yRWFjaChmdW5jdGlvbiAoW25hbWUsIGZ1bmNdKSB7XG4gICAgICBpZiAodHlwZW9mIGZ1bmMgIT09ICdmdW5jdGlvbicpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1ldGhvZCAnXCIgKyBuYW1lICsgXCInIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICAgIGlmIChzZWxmLm1ldGhvZF9oYW5kbGVyc1tuYW1lXSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQSBtZXRob2QgbmFtZWQgJ1wiICsgbmFtZSArIFwiJyBpcyBhbHJlYWR5IGRlZmluZWRcIik7XG4gICAgICBzZWxmLm1ldGhvZF9oYW5kbGVyc1tuYW1lXSA9IGZ1bmM7XG4gICAgfSk7XG4gIH0sXG5cbiAgY2FsbDogZnVuY3Rpb24gKG5hbWUsIC4uLmFyZ3MpIHtcbiAgICBpZiAoYXJncy5sZW5ndGggJiYgdHlwZW9mIGFyZ3NbYXJncy5sZW5ndGggLSAxXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAvLyBJZiBpdCdzIGEgZnVuY3Rpb24sIHRoZSBsYXN0IGFyZ3VtZW50IGlzIHRoZSByZXN1bHQgY2FsbGJhY2ssIG5vdFxuICAgICAgLy8gYSBwYXJhbWV0ZXIgdG8gdGhlIHJlbW90ZSBtZXRob2QuXG4gICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzLnBvcCgpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmFwcGx5KG5hbWUsIGFyZ3MsIGNhbGxiYWNrKTtcbiAgfSxcblxuICAvLyBBIHZlcnNpb24gb2YgdGhlIGNhbGwgbWV0aG9kIHRoYXQgYWx3YXlzIHJldHVybnMgYSBQcm9taXNlLlxuICBjYWxsQXN5bmM6IGZ1bmN0aW9uIChuYW1lLCAuLi5hcmdzKSB7XG4gICAgY29uc3Qgb3B0aW9ucyA9IGFyZ3NbMF0/Lmhhc093blByb3BlcnR5KCdyZXR1cm5TdHViVmFsdWUnKVxuICAgICAgPyBhcmdzLnNoaWZ0KClcbiAgICAgIDoge307XG4gICAgRERQLl9DdXJyZW50TWV0aG9kSW52b2NhdGlvbi5fc2V0Q2FsbEFzeW5jTWV0aG9kUnVubmluZyh0cnVlKTtcbiAgICBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgRERQLl9DdXJyZW50Q2FsbEFzeW5jSW52b2NhdGlvbi5fc2V0KHsgbmFtZSwgaGFzQ2FsbEFzeW5jUGFyZW50OiB0cnVlIH0pO1xuICAgICAgdGhpcy5hcHBseUFzeW5jKG5hbWUsIGFyZ3MsIHsgaXNGcm9tQ2FsbEFzeW5jOiB0cnVlLCAuLi5vcHRpb25zIH0pXG4gICAgICAgIC50aGVuKHJlc29sdmUpXG4gICAgICAgIC5jYXRjaChyZWplY3QpXG4gICAgICAgIC5maW5hbGx5KCgpID0+IHtcbiAgICAgICAgICBERFAuX0N1cnJlbnRDYWxsQXN5bmNJbnZvY2F0aW9uLl9zZXQoKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHByb21pc2UuZmluYWxseSgoKSA9PlxuICAgICAgRERQLl9DdXJyZW50TWV0aG9kSW52b2NhdGlvbi5fc2V0Q2FsbEFzeW5jTWV0aG9kUnVubmluZyhmYWxzZSlcbiAgICApO1xuICB9LFxuXG4gIGFwcGx5OiBmdW5jdGlvbiAobmFtZSwgYXJncywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAvLyBXZSB3ZXJlIHBhc3NlZCAzIGFyZ3VtZW50cy4gVGhleSBtYXkgYmUgZWl0aGVyIChuYW1lLCBhcmdzLCBvcHRpb25zKVxuICAgIC8vIG9yIChuYW1lLCBhcmdzLCBjYWxsYmFjaylcbiAgICBpZiAoISBjYWxsYmFjayAmJiB0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB9XG4gICAgY29uc3QgcHJvbWlzZSA9IHRoaXMuYXBwbHlBc3luYyhuYW1lLCBhcmdzLCBvcHRpb25zKTtcblxuICAgIC8vIFJldHVybiB0aGUgcmVzdWx0IGluIHdoaWNoZXZlciB3YXkgdGhlIGNhbGxlciBhc2tlZCBmb3IgaXQuIE5vdGUgdGhhdCB3ZVxuICAgIC8vIGRvIE5PVCBibG9jayBvbiB0aGUgd3JpdGUgZmVuY2UgaW4gYW4gYW5hbG9nb3VzIHdheSB0byBob3cgdGhlIGNsaWVudFxuICAgIC8vIGJsb2NrcyBvbiB0aGUgcmVsZXZhbnQgZGF0YSBiZWluZyB2aXNpYmxlLCBzbyB5b3UgYXJlIE5PVCBndWFyYW50ZWVkIHRoYXRcbiAgICAvLyBjdXJzb3Igb2JzZXJ2ZSBjYWxsYmFja3MgaGF2ZSBmaXJlZCB3aGVuIHlvdXIgY2FsbGJhY2sgaXMgaW52b2tlZC4gKFdlXG4gICAgLy8gY2FuIGNoYW5nZSB0aGlzIGlmIHRoZXJlJ3MgYSByZWFsIHVzZSBjYXNlKS5cbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIHByb21pc2UudGhlbihcbiAgICAgICAgcmVzdWx0ID0+IGNhbGxiYWNrKHVuZGVmaW5lZCwgcmVzdWx0KSxcbiAgICAgICAgZXhjZXB0aW9uID0+IGNhbGxiYWNrKGV4Y2VwdGlvbilcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cbiAgfSxcblxuICAvLyBAcGFyYW0gb3B0aW9ucyB7T3B0aW9uYWwgT2JqZWN0fVxuICBhcHBseUFzeW5jOiBmdW5jdGlvbiAobmFtZSwgYXJncywgb3B0aW9ucykge1xuICAgIC8vIFJ1biB0aGUgaGFuZGxlclxuICAgIHZhciBoYW5kbGVyID0gdGhpcy5tZXRob2RfaGFuZGxlcnNbbmFtZV07XG5cbiAgICBpZiAoISBoYW5kbGVyKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoXG4gICAgICAgIG5ldyBNZXRlb3IuRXJyb3IoNDA0LCBgTWV0aG9kICcke25hbWV9JyBub3QgZm91bmRgKVxuICAgICAgKTtcbiAgICB9XG4gICAgLy8gSWYgdGhpcyBpcyBhIG1ldGhvZCBjYWxsIGZyb20gd2l0aGluIGFub3RoZXIgbWV0aG9kIG9yIHB1Ymxpc2ggZnVuY3Rpb24sXG4gICAgLy8gZ2V0IHRoZSB1c2VyIHN0YXRlIGZyb20gdGhlIG91dGVyIG1ldGhvZCBvciBwdWJsaXNoIGZ1bmN0aW9uLCBvdGhlcndpc2VcbiAgICAvLyBkb24ndCBhbGxvdyBzZXRVc2VySWQgdG8gYmUgY2FsbGVkXG4gICAgdmFyIHVzZXJJZCA9IG51bGw7XG4gICAgbGV0IHNldFVzZXJJZCA9ICgpID0+IHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGNhbGwgc2V0VXNlcklkIG9uIGEgc2VydmVyIGluaXRpYXRlZCBtZXRob2QgY2FsbFwiKTtcbiAgICB9O1xuICAgIHZhciBjb25uZWN0aW9uID0gbnVsbDtcbiAgICB2YXIgY3VycmVudE1ldGhvZEludm9jYXRpb24gPSBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uLmdldCgpO1xuICAgIHZhciBjdXJyZW50UHVibGljYXRpb25JbnZvY2F0aW9uID0gRERQLl9DdXJyZW50UHVibGljYXRpb25JbnZvY2F0aW9uLmdldCgpO1xuICAgIHZhciByYW5kb21TZWVkID0gbnVsbDtcblxuICAgIGlmIChjdXJyZW50TWV0aG9kSW52b2NhdGlvbikge1xuICAgICAgdXNlcklkID0gY3VycmVudE1ldGhvZEludm9jYXRpb24udXNlcklkO1xuICAgICAgc2V0VXNlcklkID0gKHVzZXJJZCkgPT4gY3VycmVudE1ldGhvZEludm9jYXRpb24uc2V0VXNlcklkKHVzZXJJZCk7XG4gICAgICBjb25uZWN0aW9uID0gY3VycmVudE1ldGhvZEludm9jYXRpb24uY29ubmVjdGlvbjtcbiAgICAgIHJhbmRvbVNlZWQgPSBERFBDb21tb24ubWFrZVJwY1NlZWQoY3VycmVudE1ldGhvZEludm9jYXRpb24sIG5hbWUpO1xuICAgIH0gZWxzZSBpZiAoY3VycmVudFB1YmxpY2F0aW9uSW52b2NhdGlvbikge1xuICAgICAgdXNlcklkID0gY3VycmVudFB1YmxpY2F0aW9uSW52b2NhdGlvbi51c2VySWQ7XG4gICAgICBzZXRVc2VySWQgPSAodXNlcklkKSA9PiBjdXJyZW50UHVibGljYXRpb25JbnZvY2F0aW9uLl9zZXNzaW9uLl9zZXRVc2VySWQodXNlcklkKTtcbiAgICAgIGNvbm5lY3Rpb24gPSBjdXJyZW50UHVibGljYXRpb25JbnZvY2F0aW9uLmNvbm5lY3Rpb247XG4gICAgfVxuXG4gICAgdmFyIGludm9jYXRpb24gPSBuZXcgRERQQ29tbW9uLk1ldGhvZEludm9jYXRpb24oe1xuICAgICAgaXNTaW11bGF0aW9uOiBmYWxzZSxcbiAgICAgIHVzZXJJZCxcbiAgICAgIHNldFVzZXJJZCxcbiAgICAgIGNvbm5lY3Rpb24sXG4gICAgICByYW5kb21TZWVkXG4gICAgfSk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgbGV0IHJlc3VsdDtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdCA9IEREUC5fQ3VycmVudE1ldGhvZEludm9jYXRpb24ud2l0aFZhbHVlKGludm9jYXRpb24sICgpID0+XG4gICAgICAgICAgbWF5YmVBdWRpdEFyZ3VtZW50Q2hlY2tzKFxuICAgICAgICAgICAgaGFuZGxlcixcbiAgICAgICAgICAgIGludm9jYXRpb24sXG4gICAgICAgICAgICBFSlNPTi5jbG9uZShhcmdzKSxcbiAgICAgICAgICAgIFwiaW50ZXJuYWwgY2FsbCB0byAnXCIgKyBuYW1lICsgXCInXCJcbiAgICAgICAgICApXG4gICAgICAgICk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiByZWplY3QoZSk7XG4gICAgICB9XG4gICAgICBpZiAoIU1ldGVvci5faXNQcm9taXNlKHJlc3VsdCkpIHtcbiAgICAgICAgcmV0dXJuIHJlc29sdmUocmVzdWx0KTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdC50aGVuKHIgPT4gcmVzb2x2ZShyKSkuY2F0Y2gocmVqZWN0KTtcbiAgICB9KS50aGVuKEVKU09OLmNsb25lKTtcbiAgfSxcblxuICBfdXJsRm9yU2Vzc2lvbjogZnVuY3Rpb24gKHNlc3Npb25JZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgc2Vzc2lvbiA9IHNlbGYuc2Vzc2lvbnMuZ2V0KHNlc3Npb25JZCk7XG4gICAgaWYgKHNlc3Npb24pXG4gICAgICByZXR1cm4gc2Vzc2lvbi5fc29ja2V0VXJsO1xuICAgIGVsc2VcbiAgICAgIHJldHVybiBudWxsO1xuICB9XG59KTtcblxudmFyIGNhbGN1bGF0ZVZlcnNpb24gPSBmdW5jdGlvbiAoY2xpZW50U3VwcG9ydGVkVmVyc2lvbnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJTdXBwb3J0ZWRWZXJzaW9ucykge1xuICB2YXIgY29ycmVjdFZlcnNpb24gPSBjbGllbnRTdXBwb3J0ZWRWZXJzaW9ucy5maW5kKGZ1bmN0aW9uICh2ZXJzaW9uKSB7XG4gICAgcmV0dXJuIHNlcnZlclN1cHBvcnRlZFZlcnNpb25zLmluY2x1ZGVzKHZlcnNpb24pO1xuICB9KTtcbiAgaWYgKCFjb3JyZWN0VmVyc2lvbikge1xuICAgIGNvcnJlY3RWZXJzaW9uID0gc2VydmVyU3VwcG9ydGVkVmVyc2lvbnNbMF07XG4gIH1cbiAgcmV0dXJuIGNvcnJlY3RWZXJzaW9uO1xufTtcblxuRERQU2VydmVyLl9jYWxjdWxhdGVWZXJzaW9uID0gY2FsY3VsYXRlVmVyc2lvbjtcblxuXG4vLyBcImJsaW5kXCIgZXhjZXB0aW9ucyBvdGhlciB0aGFuIHRob3NlIHRoYXQgd2VyZSBkZWxpYmVyYXRlbHkgdGhyb3duIHRvIHNpZ25hbFxuLy8gZXJyb3JzIHRvIHRoZSBjbGllbnRcbnZhciB3cmFwSW50ZXJuYWxFeGNlcHRpb24gPSBmdW5jdGlvbiAoZXhjZXB0aW9uLCBjb250ZXh0KSB7XG4gIGlmICghZXhjZXB0aW9uKSByZXR1cm4gZXhjZXB0aW9uO1xuXG4gIC8vIFRvIGFsbG93IHBhY2thZ2VzIHRvIHRocm93IGVycm9ycyBpbnRlbmRlZCBmb3IgdGhlIGNsaWVudCBidXQgbm90IGhhdmUgdG9cbiAgLy8gZGVwZW5kIG9uIHRoZSBNZXRlb3IuRXJyb3IgY2xhc3MsIGBpc0NsaWVudFNhZmVgIGNhbiBiZSBzZXQgdG8gdHJ1ZSBvbiBhbnlcbiAgLy8gZXJyb3IgYmVmb3JlIGl0IGlzIHRocm93bi5cbiAgaWYgKGV4Y2VwdGlvbi5pc0NsaWVudFNhZmUpIHtcbiAgICBpZiAoIShleGNlcHRpb24gaW5zdGFuY2VvZiBNZXRlb3IuRXJyb3IpKSB7XG4gICAgICBjb25zdCBvcmlnaW5hbE1lc3NhZ2UgPSBleGNlcHRpb24ubWVzc2FnZTtcbiAgICAgIGV4Y2VwdGlvbiA9IG5ldyBNZXRlb3IuRXJyb3IoZXhjZXB0aW9uLmVycm9yLCBleGNlcHRpb24ucmVhc29uLCBleGNlcHRpb24uZGV0YWlscyk7XG4gICAgICBleGNlcHRpb24ubWVzc2FnZSA9IG9yaWdpbmFsTWVzc2FnZTtcbiAgICB9XG4gICAgcmV0dXJuIGV4Y2VwdGlvbjtcbiAgfVxuXG4gIC8vIFRlc3RzIGNhbiBzZXQgdGhlICdfZXhwZWN0ZWRCeVRlc3QnIGZsYWcgb24gYW4gZXhjZXB0aW9uIHNvIGl0IHdvbid0IGdvIHRvXG4gIC8vIHRoZSBzZXJ2ZXIgbG9nLlxuICBpZiAoIWV4Y2VwdGlvbi5fZXhwZWN0ZWRCeVRlc3QpIHtcbiAgICBNZXRlb3IuX2RlYnVnKFwiRXhjZXB0aW9uIFwiICsgY29udGV4dCwgZXhjZXB0aW9uLnN0YWNrKTtcbiAgICBpZiAoZXhjZXB0aW9uLnNhbml0aXplZEVycm9yKSB7XG4gICAgICBNZXRlb3IuX2RlYnVnKFwiU2FuaXRpemVkIGFuZCByZXBvcnRlZCB0byB0aGUgY2xpZW50IGFzOlwiLCBleGNlcHRpb24uc2FuaXRpemVkRXJyb3IpO1xuICAgICAgTWV0ZW9yLl9kZWJ1ZygpO1xuICAgIH1cbiAgfVxuXG4gIC8vIERpZCB0aGUgZXJyb3IgY29udGFpbiBtb3JlIGRldGFpbHMgdGhhdCBjb3VsZCBoYXZlIGJlZW4gdXNlZnVsIGlmIGNhdWdodCBpblxuICAvLyBzZXJ2ZXIgY29kZSAob3IgaWYgdGhyb3duIGZyb20gbm9uLWNsaWVudC1vcmlnaW5hdGVkIGNvZGUpLCBidXQgYWxzb1xuICAvLyBwcm92aWRlZCBhIFwic2FuaXRpemVkXCIgdmVyc2lvbiB3aXRoIG1vcmUgY29udGV4dCB0aGFuIDUwMCBJbnRlcm5hbCBzZXJ2ZXIgZXJyb3I/IFVzZSB0aGF0LlxuICBpZiAoZXhjZXB0aW9uLnNhbml0aXplZEVycm9yKSB7XG4gICAgaWYgKGV4Y2VwdGlvbi5zYW5pdGl6ZWRFcnJvci5pc0NsaWVudFNhZmUpXG4gICAgICByZXR1cm4gZXhjZXB0aW9uLnNhbml0aXplZEVycm9yO1xuICAgIE1ldGVvci5fZGVidWcoXCJFeGNlcHRpb24gXCIgKyBjb250ZXh0ICsgXCIgcHJvdmlkZXMgYSBzYW5pdGl6ZWRFcnJvciB0aGF0IFwiICtcbiAgICAgICAgICAgICAgICAgIFwiZG9lcyBub3QgaGF2ZSBpc0NsaWVudFNhZmUgcHJvcGVydHkgc2V0OyBpZ25vcmluZ1wiKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgTWV0ZW9yLkVycm9yKDUwMCwgXCJJbnRlcm5hbCBzZXJ2ZXIgZXJyb3JcIik7XG59O1xuXG5cbi8vIEF1ZGl0IGFyZ3VtZW50IGNoZWNrcywgaWYgdGhlIGF1ZGl0LWFyZ3VtZW50LWNoZWNrcyBwYWNrYWdlIGV4aXN0cyAoaXQgaXMgYVxuLy8gd2VhayBkZXBlbmRlbmN5IG9mIHRoaXMgcGFja2FnZSkuXG52YXIgbWF5YmVBdWRpdEFyZ3VtZW50Q2hlY2tzID0gZnVuY3Rpb24gKGYsIGNvbnRleHQsIGFyZ3MsIGRlc2NyaXB0aW9uKSB7XG4gIGFyZ3MgPSBhcmdzIHx8IFtdO1xuICBpZiAoUGFja2FnZVsnYXVkaXQtYXJndW1lbnQtY2hlY2tzJ10pIHtcbiAgICByZXR1cm4gTWF0Y2guX2ZhaWxJZkFyZ3VtZW50c0FyZU5vdEFsbENoZWNrZWQoXG4gICAgICBmLCBjb250ZXh0LCBhcmdzLCBkZXNjcmlwdGlvbik7XG4gIH1cbiAgcmV0dXJuIGYuYXBwbHkoY29udGV4dCwgYXJncyk7XG59OyIsIkREUFNlcnZlci5fV3JpdGVGZW5jZSA9IGNsYXNzIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5hcm1lZCA9IGZhbHNlO1xuICAgIHRoaXMuZmlyZWQgPSBmYWxzZTtcbiAgICB0aGlzLnJldGlyZWQgPSBmYWxzZTtcbiAgICB0aGlzLm91dHN0YW5kaW5nX3dyaXRlcyA9IDA7XG4gICAgdGhpcy5iZWZvcmVfZmlyZV9jYWxsYmFja3MgPSBbXTtcbiAgICB0aGlzLmNvbXBsZXRpb25fY2FsbGJhY2tzID0gW107XG4gIH1cblxuICBiZWdpbldyaXRlKCkge1xuICAgIGlmICh0aGlzLnJldGlyZWQpIHtcbiAgICAgIHJldHVybiB7IGNvbW1pdHRlZDogKCkgPT4ge30gfTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5maXJlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZmVuY2UgaGFzIGFscmVhZHkgYWN0aXZhdGVkIC0tIHRvbyBsYXRlIHRvIGFkZCB3cml0ZXNcIik7XG4gICAgfVxuXG4gICAgdGhpcy5vdXRzdGFuZGluZ193cml0ZXMrKztcbiAgICBsZXQgY29tbWl0dGVkID0gZmFsc2U7XG5cbiAgICByZXR1cm4ge1xuICAgICAgY29tbWl0dGVkOiBhc3luYyAoKSA9PiB7XG4gICAgICAgIGlmIChjb21taXR0ZWQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJjb21taXR0ZWQgY2FsbGVkIHR3aWNlIG9uIHRoZSBzYW1lIHdyaXRlXCIpO1xuICAgICAgICB9XG4gICAgICAgIGNvbW1pdHRlZCA9IHRydWU7XG4gICAgICAgIHRoaXMub3V0c3RhbmRpbmdfd3JpdGVzLS07XG4gICAgICAgIGF3YWl0IHRoaXMuX21heWJlRmlyZSgpO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBhcm0oKSB7XG4gICAgaWYgKHRoaXMgPT09IEREUFNlcnZlci5fZ2V0Q3VycmVudEZlbmNlKCkpIHtcbiAgICAgIHRocm93IEVycm9yKFwiQ2FuJ3QgYXJtIHRoZSBjdXJyZW50IGZlbmNlXCIpO1xuICAgIH1cbiAgICB0aGlzLmFybWVkID0gdHJ1ZTtcbiAgICByZXR1cm4gdGhpcy5fbWF5YmVGaXJlKCk7XG4gIH1cblxuICBvbkJlZm9yZUZpcmUoZnVuYykge1xuICAgIGlmICh0aGlzLmZpcmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJmZW5jZSBoYXMgYWxyZWFkeSBhY3RpdmF0ZWQgLS0gdG9vIGxhdGUgdG8gYWRkIGEgY2FsbGJhY2tcIik7XG4gICAgfVxuICAgIHRoaXMuYmVmb3JlX2ZpcmVfY2FsbGJhY2tzLnB1c2goZnVuYyk7XG4gIH1cblxuICBvbkFsbENvbW1pdHRlZChmdW5jKSB7XG4gICAgaWYgKHRoaXMuZmlyZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImZlbmNlIGhhcyBhbHJlYWR5IGFjdGl2YXRlZCAtLSB0b28gbGF0ZSB0byBhZGQgYSBjYWxsYmFja1wiKTtcbiAgICB9XG4gICAgdGhpcy5jb21wbGV0aW9uX2NhbGxiYWNrcy5wdXNoKGZ1bmMpO1xuICB9XG5cbiAgYXN5bmMgX2FybUFuZFdhaXQoKSB7XG4gICAgbGV0IHJlc29sdmVyO1xuICAgIGNvbnN0IHJldHVyblZhbHVlID0gbmV3IFByb21pc2UociA9PiByZXNvbHZlciA9IHIpO1xuICAgIHRoaXMub25BbGxDb21taXR0ZWQocmVzb2x2ZXIpO1xuICAgIGF3YWl0IHRoaXMuYXJtKCk7XG4gICAgcmV0dXJuIHJldHVyblZhbHVlO1xuICB9XG5cbiAgYXJtQW5kV2FpdCgpIHtcbiAgICByZXR1cm4gdGhpcy5fYXJtQW5kV2FpdCgpO1xuICB9XG5cbiAgYXN5bmMgX21heWJlRmlyZSgpIHtcbiAgICBpZiAodGhpcy5maXJlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwid3JpdGUgZmVuY2UgYWxyZWFkeSBhY3RpdmF0ZWQ/XCIpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5hcm1lZCB8fCB0aGlzLm91dHN0YW5kaW5nX3dyaXRlcyA+IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBpbnZva2VDYWxsYmFjayA9IGFzeW5jIChmdW5jKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBmdW5jKHRoaXMpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIE1ldGVvci5fZGVidWcoXCJleGNlcHRpb24gaW4gd3JpdGUgZmVuY2UgY2FsbGJhY2s6XCIsIGVycik7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMub3V0c3RhbmRpbmdfd3JpdGVzKys7XG5cbiAgICAvLyBQcm9jZXNzIGFsbCBiZWZvcmVfZmlyZSBjYWxsYmFja3MgaW4gcGFyYWxsZWxcbiAgICBjb25zdCBiZWZvcmVDYWxsYmFja3MgPSBbLi4udGhpcy5iZWZvcmVfZmlyZV9jYWxsYmFja3NdO1xuICAgIHRoaXMuYmVmb3JlX2ZpcmVfY2FsbGJhY2tzID0gW107XG4gICAgYXdhaXQgUHJvbWlzZS5hbGwoYmVmb3JlQ2FsbGJhY2tzLm1hcChjYiA9PiBpbnZva2VDYWxsYmFjayhjYikpKTtcblxuICAgIHRoaXMub3V0c3RhbmRpbmdfd3JpdGVzLS07XG5cbiAgICBpZiAodGhpcy5vdXRzdGFuZGluZ193cml0ZXMgPT09IDApIHtcbiAgICAgIHRoaXMuZmlyZWQgPSB0cnVlO1xuICAgICAgLy8gUHJvY2VzcyBhbGwgY29tcGxldGlvbiBjYWxsYmFja3MgaW4gcGFyYWxsZWxcbiAgICAgIGNvbnN0IGNhbGxiYWNrcyA9IFsuLi50aGlzLmNvbXBsZXRpb25fY2FsbGJhY2tzXTtcbiAgICAgIHRoaXMuY29tcGxldGlvbl9jYWxsYmFja3MgPSBbXTtcbiAgICAgIGF3YWl0IFByb21pc2UuYWxsKGNhbGxiYWNrcy5tYXAoY2IgPT4gaW52b2tlQ2FsbGJhY2soY2IpKSk7XG4gICAgfVxuICB9XG5cbiAgcmV0aXJlKCkge1xuICAgIGlmICghdGhpcy5maXJlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgcmV0aXJlIGEgZmVuY2UgdGhhdCBoYXNuJ3QgZmlyZWQuXCIpO1xuICAgIH1cbiAgICB0aGlzLnJldGlyZWQgPSB0cnVlO1xuICB9XG59O1xuXG5ERFBTZXJ2ZXIuX0N1cnJlbnRXcml0ZUZlbmNlID0gbmV3IE1ldGVvci5FbnZpcm9ubWVudFZhcmlhYmxlOyIsIi8vIEEgXCJjcm9zc2JhclwiIGlzIGEgY2xhc3MgdGhhdCBwcm92aWRlcyBzdHJ1Y3R1cmVkIG5vdGlmaWNhdGlvbiByZWdpc3RyYXRpb24uXG4vLyBTZWUgX21hdGNoIGZvciB0aGUgZGVmaW5pdGlvbiBvZiBob3cgYSBub3RpZmljYXRpb24gbWF0Y2hlcyBhIHRyaWdnZXIuXG4vLyBBbGwgbm90aWZpY2F0aW9ucyBhbmQgdHJpZ2dlcnMgbXVzdCBoYXZlIGEgc3RyaW5nIGtleSBuYW1lZCAnY29sbGVjdGlvbicuXG5cbkREUFNlcnZlci5fQ3Jvc3NiYXIgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIHNlbGYubmV4dElkID0gMTtcbiAgLy8gbWFwIGZyb20gY29sbGVjdGlvbiBuYW1lIChzdHJpbmcpIC0+IGxpc3RlbmVyIGlkIC0+IG9iamVjdC4gZWFjaCBvYmplY3QgaGFzXG4gIC8vIGtleXMgJ3RyaWdnZXInLCAnY2FsbGJhY2snLiAgQXMgYSBoYWNrLCB0aGUgZW1wdHkgc3RyaW5nIG1lYW5zIFwibm9cbiAgLy8gY29sbGVjdGlvblwiLlxuICBzZWxmLmxpc3RlbmVyc0J5Q29sbGVjdGlvbiA9IHt9O1xuICBzZWxmLmxpc3RlbmVyc0J5Q29sbGVjdGlvbkNvdW50ID0ge307XG4gIHNlbGYuZmFjdFBhY2thZ2UgPSBvcHRpb25zLmZhY3RQYWNrYWdlIHx8IFwibGl2ZWRhdGFcIjtcbiAgc2VsZi5mYWN0TmFtZSA9IG9wdGlvbnMuZmFjdE5hbWUgfHwgbnVsbDtcbn07XG5cbk9iamVjdC5hc3NpZ24oRERQU2VydmVyLl9Dcm9zc2Jhci5wcm90b3R5cGUsIHtcbiAgLy8gbXNnIGlzIGEgdHJpZ2dlciBvciBhIG5vdGlmaWNhdGlvblxuICBfY29sbGVjdGlvbkZvck1lc3NhZ2U6IGZ1bmN0aW9uIChtc2cpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCEoJ2NvbGxlY3Rpb24nIGluIG1zZykpIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9IGVsc2UgaWYgKHR5cGVvZihtc2cuY29sbGVjdGlvbikgPT09ICdzdHJpbmcnKSB7XG4gICAgICBpZiAobXNnLmNvbGxlY3Rpb24gPT09ICcnKVxuICAgICAgICB0aHJvdyBFcnJvcihcIk1lc3NhZ2UgaGFzIGVtcHR5IGNvbGxlY3Rpb24hXCIpO1xuICAgICAgcmV0dXJuIG1zZy5jb2xsZWN0aW9uO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBFcnJvcihcIk1lc3NhZ2UgaGFzIG5vbi1zdHJpbmcgY29sbGVjdGlvbiFcIik7XG4gICAgfVxuICB9LFxuXG4gIC8vIExpc3RlbiBmb3Igbm90aWZpY2F0aW9uIHRoYXQgbWF0Y2ggJ3RyaWdnZXInLiBBIG5vdGlmaWNhdGlvblxuICAvLyBtYXRjaGVzIGlmIGl0IGhhcyB0aGUga2V5LXZhbHVlIHBhaXJzIGluIHRyaWdnZXIgYXMgYVxuICAvLyBzdWJzZXQuIFdoZW4gYSBub3RpZmljYXRpb24gbWF0Y2hlcywgY2FsbCAnY2FsbGJhY2snLCBwYXNzaW5nXG4gIC8vIHRoZSBhY3R1YWwgbm90aWZpY2F0aW9uLlxuICAvL1xuICAvLyBSZXR1cm5zIGEgbGlzdGVuIGhhbmRsZSwgd2hpY2ggaXMgYW4gb2JqZWN0IHdpdGggYSBtZXRob2RcbiAgLy8gc3RvcCgpLiBDYWxsIHN0b3AoKSB0byBzdG9wIGxpc3RlbmluZy5cbiAgLy9cbiAgLy8gWFhYIEl0IHNob3VsZCBiZSBsZWdhbCB0byBjYWxsIGZpcmUoKSBmcm9tIGluc2lkZSBhIGxpc3RlbigpXG4gIC8vIGNhbGxiYWNrP1xuICBsaXN0ZW46IGZ1bmN0aW9uICh0cmlnZ2VyLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgaWQgPSBzZWxmLm5leHRJZCsrO1xuXG4gICAgdmFyIGNvbGxlY3Rpb24gPSBzZWxmLl9jb2xsZWN0aW9uRm9yTWVzc2FnZSh0cmlnZ2VyKTtcbiAgICB2YXIgcmVjb3JkID0ge3RyaWdnZXI6IEVKU09OLmNsb25lKHRyaWdnZXIpLCBjYWxsYmFjazogY2FsbGJhY2t9O1xuICAgIGlmICghIChjb2xsZWN0aW9uIGluIHNlbGYubGlzdGVuZXJzQnlDb2xsZWN0aW9uKSkge1xuICAgICAgc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb25bY29sbGVjdGlvbl0gPSB7fTtcbiAgICAgIHNlbGYubGlzdGVuZXJzQnlDb2xsZWN0aW9uQ291bnRbY29sbGVjdGlvbl0gPSAwO1xuICAgIH1cbiAgICBzZWxmLmxpc3RlbmVyc0J5Q29sbGVjdGlvbltjb2xsZWN0aW9uXVtpZF0gPSByZWNvcmQ7XG4gICAgc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb25Db3VudFtjb2xsZWN0aW9uXSsrO1xuXG4gICAgaWYgKHNlbGYuZmFjdE5hbWUgJiYgUGFja2FnZVsnZmFjdHMtYmFzZSddKSB7XG4gICAgICBQYWNrYWdlWydmYWN0cy1iYXNlJ10uRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICAgICAgc2VsZi5mYWN0UGFja2FnZSwgc2VsZi5mYWN0TmFtZSwgMSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHNlbGYuZmFjdE5hbWUgJiYgUGFja2FnZVsnZmFjdHMtYmFzZSddKSB7XG4gICAgICAgICAgUGFja2FnZVsnZmFjdHMtYmFzZSddLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICAgICAgICBzZWxmLmZhY3RQYWNrYWdlLCBzZWxmLmZhY3ROYW1lLCAtMSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIHNlbGYubGlzdGVuZXJzQnlDb2xsZWN0aW9uW2NvbGxlY3Rpb25dW2lkXTtcbiAgICAgICAgc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb25Db3VudFtjb2xsZWN0aW9uXS0tO1xuICAgICAgICBpZiAoc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb25Db3VudFtjb2xsZWN0aW9uXSA9PT0gMCkge1xuICAgICAgICAgIGRlbGV0ZSBzZWxmLmxpc3RlbmVyc0J5Q29sbGVjdGlvbltjb2xsZWN0aW9uXTtcbiAgICAgICAgICBkZWxldGUgc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb25Db3VudFtjb2xsZWN0aW9uXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgLy8gRmlyZSB0aGUgcHJvdmlkZWQgJ25vdGlmaWNhdGlvbicgKGFuIG9iamVjdCB3aG9zZSBhdHRyaWJ1dGVcbiAgLy8gdmFsdWVzIGFyZSBhbGwgSlNPTi1jb21wYXRpYmlsZSkgLS0gaW5mb3JtIGFsbCBtYXRjaGluZyBsaXN0ZW5lcnNcbiAgLy8gKHJlZ2lzdGVyZWQgd2l0aCBsaXN0ZW4oKSkuXG4gIC8vXG4gIC8vIElmIGZpcmUoKSBpcyBjYWxsZWQgaW5zaWRlIGEgd3JpdGUgZmVuY2UsIHRoZW4gZWFjaCBvZiB0aGVcbiAgLy8gbGlzdGVuZXIgY2FsbGJhY2tzIHdpbGwgYmUgY2FsbGVkIGluc2lkZSB0aGUgd3JpdGUgZmVuY2UgYXMgd2VsbC5cbiAgLy9cbiAgLy8gVGhlIGxpc3RlbmVycyBtYXkgYmUgaW52b2tlZCBpbiBwYXJhbGxlbCwgcmF0aGVyIHRoYW4gc2VyaWFsbHkuXG4gIGZpcmU6IGFzeW5jIGZ1bmN0aW9uIChub3RpZmljYXRpb24pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgY29sbGVjdGlvbiA9IHNlbGYuX2NvbGxlY3Rpb25Gb3JNZXNzYWdlKG5vdGlmaWNhdGlvbik7XG5cbiAgICBpZiAoIShjb2xsZWN0aW9uIGluIHNlbGYubGlzdGVuZXJzQnlDb2xsZWN0aW9uKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBsaXN0ZW5lcnNGb3JDb2xsZWN0aW9uID0gc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb25bY29sbGVjdGlvbl07XG4gICAgdmFyIGNhbGxiYWNrSWRzID0gW107XG4gICAgT2JqZWN0LmVudHJpZXMobGlzdGVuZXJzRm9yQ29sbGVjdGlvbikuZm9yRWFjaChmdW5jdGlvbiAoW2lkLCBsXSkge1xuICAgICAgaWYgKHNlbGYuX21hdGNoZXMobm90aWZpY2F0aW9uLCBsLnRyaWdnZXIpKSB7XG4gICAgICAgIGNhbGxiYWNrSWRzLnB1c2goaWQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gTGlzdGVuZXIgY2FsbGJhY2tzIGNhbiB5aWVsZCwgc28gd2UgbmVlZCB0byBmaXJzdCBmaW5kIGFsbCB0aGUgb25lcyB0aGF0XG4gICAgLy8gbWF0Y2ggaW4gYSBzaW5nbGUgaXRlcmF0aW9uIG92ZXIgc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb24gKHdoaWNoIGNhbid0XG4gICAgLy8gYmUgbXV0YXRlZCBkdXJpbmcgdGhpcyBpdGVyYXRpb24pLCBhbmQgdGhlbiBpbnZva2UgdGhlIG1hdGNoaW5nXG4gICAgLy8gY2FsbGJhY2tzLCBjaGVja2luZyBiZWZvcmUgZWFjaCBjYWxsIHRvIGVuc3VyZSB0aGV5IGhhdmVuJ3Qgc3RvcHBlZC5cbiAgICAvLyBOb3RlIHRoYXQgd2UgZG9uJ3QgaGF2ZSB0byBjaGVjayB0aGF0XG4gICAgLy8gc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb25bY29sbGVjdGlvbl0gc3RpbGwgPT09IGxpc3RlbmVyc0ZvckNvbGxlY3Rpb24sXG4gICAgLy8gYmVjYXVzZSB0aGUgb25seSB3YXkgdGhhdCBzdG9wcyBiZWluZyB0cnVlIGlzIGlmIGxpc3RlbmVyc0ZvckNvbGxlY3Rpb25cbiAgICAvLyBmaXJzdCBnZXRzIHJlZHVjZWQgZG93biB0byB0aGUgZW1wdHkgb2JqZWN0IChhbmQgdGhlbiBuZXZlciBnZXRzXG4gICAgLy8gaW5jcmVhc2VkIGFnYWluKS5cbiAgICBmb3IgKGNvbnN0IGlkIG9mIGNhbGxiYWNrSWRzKSB7XG4gICAgICBpZiAoaWQgaW4gbGlzdGVuZXJzRm9yQ29sbGVjdGlvbikge1xuICAgICAgICBhd2FpdCBsaXN0ZW5lcnNGb3JDb2xsZWN0aW9uW2lkXS5jYWxsYmFjayhub3RpZmljYXRpb24pO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvLyBBIG5vdGlmaWNhdGlvbiBtYXRjaGVzIGEgdHJpZ2dlciBpZiBhbGwga2V5cyB0aGF0IGV4aXN0IGluIGJvdGggYXJlIGVxdWFsLlxuICAvL1xuICAvLyBFeGFtcGxlczpcbiAgLy8gIE46e2NvbGxlY3Rpb246IFwiQ1wifSBtYXRjaGVzIFQ6e2NvbGxlY3Rpb246IFwiQ1wifVxuICAvLyAgICAoYSBub24tdGFyZ2V0ZWQgd3JpdGUgdG8gYSBjb2xsZWN0aW9uIG1hdGNoZXMgYVxuICAvLyAgICAgbm9uLXRhcmdldGVkIHF1ZXJ5KVxuICAvLyAgTjp7Y29sbGVjdGlvbjogXCJDXCIsIGlkOiBcIlhcIn0gbWF0Y2hlcyBUOntjb2xsZWN0aW9uOiBcIkNcIn1cbiAgLy8gICAgKGEgdGFyZ2V0ZWQgd3JpdGUgdG8gYSBjb2xsZWN0aW9uIG1hdGNoZXMgYSBub24tdGFyZ2V0ZWQgcXVlcnkpXG4gIC8vICBOOntjb2xsZWN0aW9uOiBcIkNcIn0gbWF0Y2hlcyBUOntjb2xsZWN0aW9uOiBcIkNcIiwgaWQ6IFwiWFwifVxuICAvLyAgICAoYSBub24tdGFyZ2V0ZWQgd3JpdGUgdG8gYSBjb2xsZWN0aW9uIG1hdGNoZXMgYVxuICAvLyAgICAgdGFyZ2V0ZWQgcXVlcnkpXG4gIC8vICBOOntjb2xsZWN0aW9uOiBcIkNcIiwgaWQ6IFwiWFwifSBtYXRjaGVzIFQ6e2NvbGxlY3Rpb246IFwiQ1wiLCBpZDogXCJYXCJ9XG4gIC8vICAgIChhIHRhcmdldGVkIHdyaXRlIHRvIGEgY29sbGVjdGlvbiBtYXRjaGVzIGEgdGFyZ2V0ZWQgcXVlcnkgdGFyZ2V0ZWRcbiAgLy8gICAgIGF0IHRoZSBzYW1lIGRvY3VtZW50KVxuICAvLyAgTjp7Y29sbGVjdGlvbjogXCJDXCIsIGlkOiBcIlhcIn0gZG9lcyBub3QgbWF0Y2ggVDp7Y29sbGVjdGlvbjogXCJDXCIsIGlkOiBcIllcIn1cbiAgLy8gICAgKGEgdGFyZ2V0ZWQgd3JpdGUgdG8gYSBjb2xsZWN0aW9uIGRvZXMgbm90IG1hdGNoIGEgdGFyZ2V0ZWQgcXVlcnlcbiAgLy8gICAgIHRhcmdldGVkIGF0IGEgZGlmZmVyZW50IGRvY3VtZW50KVxuICBfbWF0Y2hlczogZnVuY3Rpb24gKG5vdGlmaWNhdGlvbiwgdHJpZ2dlcikge1xuICAgIC8vIE1vc3Qgbm90aWZpY2F0aW9ucyB0aGF0IHVzZSB0aGUgY3Jvc3NiYXIgaGF2ZSBhIHN0cmluZyBgY29sbGVjdGlvbmAgYW5kXG4gICAgLy8gbWF5YmUgYW4gYGlkYCB0aGF0IGlzIGEgc3RyaW5nIG9yIE9iamVjdElELiBXZSdyZSBhbHJlYWR5IGRpdmlkaW5nIHVwXG4gICAgLy8gdHJpZ2dlcnMgYnkgY29sbGVjdGlvbiwgYnV0IGxldCdzIGZhc3QtdHJhY2sgXCJub3BlLCBkaWZmZXJlbnQgSURcIiAoYW5kXG4gICAgLy8gYXZvaWQgdGhlIG92ZXJseSBnZW5lcmljIEVKU09OLmVxdWFscykuIFRoaXMgbWFrZXMgYSBub3RpY2VhYmxlXG4gICAgLy8gcGVyZm9ybWFuY2UgZGlmZmVyZW5jZTsgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9tZXRlb3IvbWV0ZW9yL3B1bGwvMzY5N1xuICAgIGlmICh0eXBlb2Yobm90aWZpY2F0aW9uLmlkKSA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgdHlwZW9mKHRyaWdnZXIuaWQpID09PSAnc3RyaW5nJyAmJlxuICAgICAgICBub3RpZmljYXRpb24uaWQgIT09IHRyaWdnZXIuaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKG5vdGlmaWNhdGlvbi5pZCBpbnN0YW5jZW9mIE1vbmdvSUQuT2JqZWN0SUQgJiZcbiAgICAgICAgdHJpZ2dlci5pZCBpbnN0YW5jZW9mIE1vbmdvSUQuT2JqZWN0SUQgJiZcbiAgICAgICAgISBub3RpZmljYXRpb24uaWQuZXF1YWxzKHRyaWdnZXIuaWQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHRyaWdnZXIpLmV2ZXJ5KGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgIHJldHVybiAhKGtleSBpbiBub3RpZmljYXRpb24pIHx8IEVKU09OLmVxdWFscyh0cmlnZ2VyW2tleV0sIG5vdGlmaWNhdGlvbltrZXldKTtcbiAgICAgfSk7XG4gIH1cbn0pO1xuXG4vLyBUaGUgXCJpbnZhbGlkYXRpb24gY3Jvc3NiYXJcIiBpcyBhIHNwZWNpZmljIGluc3RhbmNlIHVzZWQgYnkgdGhlIEREUCBzZXJ2ZXIgdG9cbi8vIGltcGxlbWVudCB3cml0ZSBmZW5jZSBub3RpZmljYXRpb25zLiBMaXN0ZW5lciBjYWxsYmFja3Mgb24gdGhpcyBjcm9zc2JhclxuLy8gc2hvdWxkIGNhbGwgYmVnaW5Xcml0ZSBvbiB0aGUgY3VycmVudCB3cml0ZSBmZW5jZSBiZWZvcmUgdGhleSByZXR1cm4sIGlmIHRoZXlcbi8vIHdhbnQgdG8gZGVsYXkgdGhlIHdyaXRlIGZlbmNlIGZyb20gZmlyaW5nIChpZSwgdGhlIEREUCBtZXRob2QtZGF0YS11cGRhdGVkXG4vLyBtZXNzYWdlIGZyb20gYmVpbmcgc2VudCkuXG5ERFBTZXJ2ZXIuX0ludmFsaWRhdGlvbkNyb3NzYmFyID0gbmV3IEREUFNlcnZlci5fQ3Jvc3NiYXIoe1xuICBmYWN0TmFtZTogXCJpbnZhbGlkYXRpb24tY3Jvc3NiYXItbGlzdGVuZXJzXCJcbn0pOyIsImlmIChwcm9jZXNzLmVudi5ERFBfREVGQVVMVF9DT05ORUNUSU9OX1VSTCkge1xuICBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLkREUF9ERUZBVUxUX0NPTk5FQ1RJT05fVVJMID1cbiAgICBwcm9jZXNzLmVudi5ERFBfREVGQVVMVF9DT05ORUNUSU9OX1VSTDtcbn1cblxuTWV0ZW9yLnNlcnZlciA9IG5ldyBTZXJ2ZXIoKTtcblxuTWV0ZW9yLnJlZnJlc2ggPSBhc3luYyBmdW5jdGlvbiAobm90aWZpY2F0aW9uKSB7XG4gIGF3YWl0IEREUFNlcnZlci5fSW52YWxpZGF0aW9uQ3Jvc3NiYXIuZmlyZShub3RpZmljYXRpb24pO1xufTtcblxuLy8gUHJveHkgdGhlIHB1YmxpYyBtZXRob2RzIG9mIE1ldGVvci5zZXJ2ZXIgc28gdGhleSBjYW5cbi8vIGJlIGNhbGxlZCBkaXJlY3RseSBvbiBNZXRlb3IuXG5cbiAgW1xuICAgICdwdWJsaXNoJyxcbiAgICAnaXNBc3luY0NhbGwnLFxuICAgICdtZXRob2RzJyxcbiAgICAnY2FsbCcsXG4gICAgJ2NhbGxBc3luYycsXG4gICAgJ2FwcGx5JyxcbiAgICAnYXBwbHlBc3luYycsXG4gICAgJ29uQ29ubmVjdGlvbicsXG4gICAgJ29uTWVzc2FnZScsXG4gIF0uZm9yRWFjaChcbiAgZnVuY3Rpb24obmFtZSkge1xuICAgIE1ldGVvcltuYW1lXSA9IE1ldGVvci5zZXJ2ZXJbbmFtZV0uYmluZChNZXRlb3Iuc2VydmVyKTtcbiAgfVxuKTtcbiIsImludGVyZmFjZSBDaGFuZ2VDb2xsZWN0b3Ige1xuICBba2V5OiBzdHJpbmddOiBhbnk7XG59XG5cbmludGVyZmFjZSBEYXRhRW50cnkge1xuICBzdWJzY3JpcHRpb25IYW5kbGU6IHN0cmluZztcbiAgdmFsdWU6IGFueTtcbn1cblxuZXhwb3J0IGNsYXNzIER1bW15RG9jdW1lbnRWaWV3IHtcbiAgcHJpdmF0ZSBleGlzdHNJbjogU2V0PHN0cmluZz47XG4gIHByaXZhdGUgZGF0YUJ5S2V5OiBNYXA8c3RyaW5nLCBEYXRhRW50cnlbXT47XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5leGlzdHNJbiA9IG5ldyBTZXQ8c3RyaW5nPigpOyAvLyBzZXQgb2Ygc3Vic2NyaXB0aW9uSGFuZGxlXG4gICAgdGhpcy5kYXRhQnlLZXkgPSBuZXcgTWFwPHN0cmluZywgRGF0YUVudHJ5W10+KCk7IC8vIGtleS0+IFsge3N1YnNjcmlwdGlvbkhhbmRsZSwgdmFsdWV9IGJ5IHByZWNlZGVuY2VdXG4gIH1cblxuICBnZXRGaWVsZHMoKTogUmVjb3JkPHN0cmluZywgbmV2ZXI+IHtcbiAgICByZXR1cm4ge307XG4gIH1cblxuICBjbGVhckZpZWxkKFxuICAgIHN1YnNjcmlwdGlvbkhhbmRsZTogc3RyaW5nLCBcbiAgICBrZXk6IHN0cmluZywgXG4gICAgY2hhbmdlQ29sbGVjdG9yOiBDaGFuZ2VDb2xsZWN0b3JcbiAgKTogdm9pZCB7XG4gICAgY2hhbmdlQ29sbGVjdG9yW2tleV0gPSB1bmRlZmluZWQ7XG4gIH1cblxuICBjaGFuZ2VGaWVsZChcbiAgICBzdWJzY3JpcHRpb25IYW5kbGU6IHN0cmluZyxcbiAgICBrZXk6IHN0cmluZyxcbiAgICB2YWx1ZTogYW55LFxuICAgIGNoYW5nZUNvbGxlY3RvcjogQ2hhbmdlQ29sbGVjdG9yLFxuICAgIGlzQWRkPzogYm9vbGVhblxuICApOiB2b2lkIHtcbiAgICBjaGFuZ2VDb2xsZWN0b3Jba2V5XSA9IHZhbHVlO1xuICB9XG59IiwiaW1wb3J0IHsgRHVtbXlEb2N1bWVudFZpZXcgfSBmcm9tIFwiLi9kdW1teV9kb2N1bWVudF92aWV3XCI7XG5pbXBvcnQgeyBTZXNzaW9uRG9jdW1lbnRWaWV3IH0gZnJvbSBcIi4vc2Vzc2lvbl9kb2N1bWVudF92aWV3XCI7XG5cbmludGVyZmFjZSBTZXNzaW9uQ2FsbGJhY2tzIHtcbiAgYWRkZWQ6IChjb2xsZWN0aW9uTmFtZTogc3RyaW5nLCBpZDogc3RyaW5nLCBmaWVsZHM6IFJlY29yZDxzdHJpbmcsIGFueT4pID0+IHZvaWQ7XG4gIGNoYW5nZWQ6IChjb2xsZWN0aW9uTmFtZTogc3RyaW5nLCBpZDogc3RyaW5nLCBmaWVsZHM6IFJlY29yZDxzdHJpbmcsIGFueT4pID0+IHZvaWQ7XG4gIHJlbW92ZWQ6IChjb2xsZWN0aW9uTmFtZTogc3RyaW5nLCBpZDogc3RyaW5nKSA9PiB2b2lkO1xufVxuXG50eXBlIERvY3VtZW50VmlldyA9IFNlc3Npb25Eb2N1bWVudFZpZXcgfCBEdW1teURvY3VtZW50VmlldztcblxuZXhwb3J0IGNsYXNzIFNlc3Npb25Db2xsZWN0aW9uVmlldyB7XG4gIHByaXZhdGUgcmVhZG9ubHkgY29sbGVjdGlvbk5hbWU6IHN0cmluZztcbiAgcHJpdmF0ZSByZWFkb25seSBkb2N1bWVudHM6IE1hcDxzdHJpbmcsIERvY3VtZW50Vmlldz47XG4gIHByaXZhdGUgcmVhZG9ubHkgY2FsbGJhY2tzOiBTZXNzaW9uQ2FsbGJhY2tzO1xuXG4gIC8qKlxuICAgKiBSZXByZXNlbnRzIGEgY2xpZW50J3MgdmlldyBvZiBhIHNpbmdsZSBjb2xsZWN0aW9uXG4gICAqIEBwYXJhbSBjb2xsZWN0aW9uTmFtZSAtIE5hbWUgb2YgdGhlIGNvbGxlY3Rpb24gaXQgcmVwcmVzZW50c1xuICAgKiBAcGFyYW0gc2Vzc2lvbkNhbGxiYWNrcyAtIFRoZSBjYWxsYmFja3MgZm9yIGFkZGVkLCBjaGFuZ2VkLCByZW1vdmVkXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihjb2xsZWN0aW9uTmFtZTogc3RyaW5nLCBzZXNzaW9uQ2FsbGJhY2tzOiBTZXNzaW9uQ2FsbGJhY2tzKSB7XG4gICAgdGhpcy5jb2xsZWN0aW9uTmFtZSA9IGNvbGxlY3Rpb25OYW1lO1xuICAgIHRoaXMuZG9jdW1lbnRzID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuY2FsbGJhY2tzID0gc2Vzc2lvbkNhbGxiYWNrcztcbiAgfVxuXG4gIHB1YmxpYyBpc0VtcHR5KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmRvY3VtZW50cy5zaXplID09PSAwO1xuICB9XG5cbiAgcHVibGljIGRpZmYocHJldmlvdXM6IFNlc3Npb25Db2xsZWN0aW9uVmlldyk6IHZvaWQge1xuICAgIERpZmZTZXF1ZW5jZS5kaWZmTWFwcyhwcmV2aW91cy5kb2N1bWVudHMsIHRoaXMuZG9jdW1lbnRzLCB7XG4gICAgICBib3RoOiB0aGlzLmRpZmZEb2N1bWVudC5iaW5kKHRoaXMpLFxuICAgICAgcmlnaHRPbmx5OiAoaWQ6IHN0cmluZywgbm93RFY6IERvY3VtZW50VmlldykgPT4ge1xuICAgICAgICB0aGlzLmNhbGxiYWNrcy5hZGRlZCh0aGlzLmNvbGxlY3Rpb25OYW1lLCBpZCwgbm93RFYuZ2V0RmllbGRzKCkpO1xuICAgICAgfSxcbiAgICAgIGxlZnRPbmx5OiAoaWQ6IHN0cmluZywgcHJldkRWOiBEb2N1bWVudFZpZXcpID0+IHtcbiAgICAgICAgdGhpcy5jYWxsYmFja3MucmVtb3ZlZCh0aGlzLmNvbGxlY3Rpb25OYW1lLCBpZCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGRpZmZEb2N1bWVudChpZDogc3RyaW5nLCBwcmV2RFY6IERvY3VtZW50Vmlldywgbm93RFY6IERvY3VtZW50Vmlldyk6IHZvaWQge1xuICAgIGNvbnN0IGZpZWxkczogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xuICAgIFxuICAgIERpZmZTZXF1ZW5jZS5kaWZmT2JqZWN0cyhwcmV2RFYuZ2V0RmllbGRzKCksIG5vd0RWLmdldEZpZWxkcygpLCB7XG4gICAgICBib3RoOiAoa2V5OiBzdHJpbmcsIHByZXY6IGFueSwgbm93OiBhbnkpID0+IHtcbiAgICAgICAgaWYgKCFFSlNPTi5lcXVhbHMocHJldiwgbm93KSkge1xuICAgICAgICAgIGZpZWxkc1trZXldID0gbm93O1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgcmlnaHRPbmx5OiAoa2V5OiBzdHJpbmcsIG5vdzogYW55KSA9PiB7XG4gICAgICAgIGZpZWxkc1trZXldID0gbm93O1xuICAgICAgfSxcbiAgICAgIGxlZnRPbmx5OiAoa2V5OiBzdHJpbmcsIHByZXY6IGFueSkgPT4ge1xuICAgICAgICBmaWVsZHNba2V5XSA9IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBcbiAgICB0aGlzLmNhbGxiYWNrcy5jaGFuZ2VkKHRoaXMuY29sbGVjdGlvbk5hbWUsIGlkLCBmaWVsZHMpO1xuICB9XG5cbiAgcHVibGljIGFkZGVkKHN1YnNjcmlwdGlvbkhhbmRsZTogc3RyaW5nLCBpZDogc3RyaW5nLCBmaWVsZHM6IFJlY29yZDxzdHJpbmcsIGFueT4pOiB2b2lkIHtcbiAgICBsZXQgZG9jVmlldzogRG9jdW1lbnRWaWV3IHwgdW5kZWZpbmVkID0gdGhpcy5kb2N1bWVudHMuZ2V0KGlkKTtcbiAgICBsZXQgYWRkZWQgPSBmYWxzZTtcblxuICAgIGlmICghZG9jVmlldykge1xuICAgICAgYWRkZWQgPSB0cnVlO1xuICAgICAgaWYgKE1ldGVvci5zZXJ2ZXIuZ2V0UHVibGljYXRpb25TdHJhdGVneSh0aGlzLmNvbGxlY3Rpb25OYW1lKS51c2VEdW1teURvY3VtZW50Vmlldykge1xuICAgICAgICBkb2NWaWV3ID0gbmV3IER1bW15RG9jdW1lbnRWaWV3KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkb2NWaWV3ID0gbmV3IFNlc3Npb25Eb2N1bWVudFZpZXcoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZG9jdW1lbnRzLnNldChpZCwgZG9jVmlldyk7XG4gICAgfVxuXG4gICAgZG9jVmlldy5leGlzdHNJbi5hZGQoc3Vic2NyaXB0aW9uSGFuZGxlKTtcbiAgICBjb25zdCBjaGFuZ2VDb2xsZWN0b3I6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcblxuICAgIE9iamVjdC5lbnRyaWVzKGZpZWxkcykuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICBkb2NWaWV3IS5jaGFuZ2VGaWVsZChcbiAgICAgICAgc3Vic2NyaXB0aW9uSGFuZGxlLFxuICAgICAgICBrZXksXG4gICAgICAgIHZhbHVlLFxuICAgICAgICBjaGFuZ2VDb2xsZWN0b3IsXG4gICAgICAgIHRydWVcbiAgICAgICk7XG4gICAgfSk7XG5cbiAgICBpZiAoYWRkZWQpIHtcbiAgICAgIHRoaXMuY2FsbGJhY2tzLmFkZGVkKHRoaXMuY29sbGVjdGlvbk5hbWUsIGlkLCBjaGFuZ2VDb2xsZWN0b3IpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNhbGxiYWNrcy5jaGFuZ2VkKHRoaXMuY29sbGVjdGlvbk5hbWUsIGlkLCBjaGFuZ2VDb2xsZWN0b3IpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBjaGFuZ2VkKHN1YnNjcmlwdGlvbkhhbmRsZTogc3RyaW5nLCBpZDogc3RyaW5nLCBjaGFuZ2VkOiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogdm9pZCB7XG4gICAgY29uc3QgY2hhbmdlZFJlc3VsdDogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xuICAgIGNvbnN0IGRvY1ZpZXcgPSB0aGlzLmRvY3VtZW50cy5nZXQoaWQpO1xuXG4gICAgaWYgKCFkb2NWaWV3KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGVsZW1lbnQgd2l0aCBpZCAke2lkfSB0byBjaGFuZ2VgKTtcbiAgICB9XG5cbiAgICBPYmplY3QuZW50cmllcyhjaGFuZ2VkKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGRvY1ZpZXcuY2xlYXJGaWVsZChzdWJzY3JpcHRpb25IYW5kbGUsIGtleSwgY2hhbmdlZFJlc3VsdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkb2NWaWV3LmNoYW5nZUZpZWxkKHN1YnNjcmlwdGlvbkhhbmRsZSwga2V5LCB2YWx1ZSwgY2hhbmdlZFJlc3VsdCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLmNhbGxiYWNrcy5jaGFuZ2VkKHRoaXMuY29sbGVjdGlvbk5hbWUsIGlkLCBjaGFuZ2VkUmVzdWx0KTtcbiAgfVxuXG4gIHB1YmxpYyByZW1vdmVkKHN1YnNjcmlwdGlvbkhhbmRsZTogc3RyaW5nLCBpZDogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3QgZG9jVmlldyA9IHRoaXMuZG9jdW1lbnRzLmdldChpZCk7XG5cbiAgICBpZiAoIWRvY1ZpZXcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgUmVtb3ZlZCBub25leGlzdGVudCBkb2N1bWVudCAke2lkfWApO1xuICAgIH1cblxuICAgIGRvY1ZpZXcuZXhpc3RzSW4uZGVsZXRlKHN1YnNjcmlwdGlvbkhhbmRsZSk7XG5cbiAgICBpZiAoZG9jVmlldy5leGlzdHNJbi5zaXplID09PSAwKSB7XG4gICAgICAvLyBpdCBpcyBnb25lIGZyb20gZXZlcnlvbmVcbiAgICAgIHRoaXMuY2FsbGJhY2tzLnJlbW92ZWQodGhpcy5jb2xsZWN0aW9uTmFtZSwgaWQpO1xuICAgICAgdGhpcy5kb2N1bWVudHMuZGVsZXRlKGlkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgY2hhbmdlZDogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xuICAgICAgLy8gcmVtb3ZlIHRoaXMgc3Vic2NyaXB0aW9uIGZyb20gZXZlcnkgcHJlY2VkZW5jZSBsaXN0XG4gICAgICAvLyBhbmQgcmVjb3JkIHRoZSBjaGFuZ2VzXG4gICAgICBkb2NWaWV3LmRhdGFCeUtleS5mb3JFYWNoKChwcmVjZWRlbmNlTGlzdCwga2V5KSA9PiB7XG4gICAgICAgIGRvY1ZpZXcuY2xlYXJGaWVsZChzdWJzY3JpcHRpb25IYW5kbGUsIGtleSwgY2hhbmdlZCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMuY2FsbGJhY2tzLmNoYW5nZWQodGhpcy5jb2xsZWN0aW9uTmFtZSwgaWQsIGNoYW5nZWQpO1xuICAgIH1cbiAgfVxufSIsImludGVyZmFjZSBQcmVjZWRlbmNlSXRlbSB7XG4gIHN1YnNjcmlwdGlvbkhhbmRsZTogc3RyaW5nO1xuICB2YWx1ZTogYW55O1xufVxuXG5pbnRlcmZhY2UgQ2hhbmdlQ29sbGVjdG9yIHtcbiAgW2tleTogc3RyaW5nXTogYW55O1xufVxuXG5leHBvcnQgY2xhc3MgU2Vzc2lvbkRvY3VtZW50VmlldyB7XG4gIHByaXZhdGUgZXhpc3RzSW46IFNldDxzdHJpbmc+O1xuICBwcml2YXRlIGRhdGFCeUtleTogTWFwPHN0cmluZywgUHJlY2VkZW5jZUl0ZW1bXT47XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5leGlzdHNJbiA9IG5ldyBTZXQoKTsgLy8gc2V0IG9mIHN1YnNjcmlwdGlvbkhhbmRsZVxuICAgIC8vIE1lbW9yeSBHcm93dGhcbiAgICB0aGlzLmRhdGFCeUtleSA9IG5ldyBNYXAoKTsgLy8ga2V5LT4gWyB7c3Vic2NyaXB0aW9uSGFuZGxlLCB2YWx1ZX0gYnkgcHJlY2VkZW5jZV1cbiAgfVxuXG4gIGdldEZpZWxkcygpOiBSZWNvcmQ8c3RyaW5nLCBhbnk+IHtcbiAgICBjb25zdCByZXQ6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcbiAgICB0aGlzLmRhdGFCeUtleS5mb3JFYWNoKChwcmVjZWRlbmNlTGlzdCwga2V5KSA9PiB7XG4gICAgICByZXRba2V5XSA9IHByZWNlZGVuY2VMaXN0WzBdLnZhbHVlO1xuICAgIH0pO1xuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICBjbGVhckZpZWxkKFxuICAgIHN1YnNjcmlwdGlvbkhhbmRsZTogc3RyaW5nLFxuICAgIGtleTogc3RyaW5nLFxuICAgIGNoYW5nZUNvbGxlY3RvcjogQ2hhbmdlQ29sbGVjdG9yXG4gICk6IHZvaWQge1xuICAgIC8vIFB1Ymxpc2ggQVBJIGlnbm9yZXMgX2lkIGlmIHByZXNlbnQgaW4gZmllbGRzXG4gICAgaWYgKGtleSA9PT0gXCJfaWRcIikgcmV0dXJuO1xuXG4gICAgY29uc3QgcHJlY2VkZW5jZUxpc3QgPSB0aGlzLmRhdGFCeUtleS5nZXQoa2V5KTtcbiAgICAvLyBJdCdzIG9rYXkgdG8gY2xlYXIgZmllbGRzIHRoYXQgZGlkbid0IGV4aXN0LiBObyBuZWVkIHRvIHRocm93XG4gICAgLy8gYW4gZXJyb3IuXG4gICAgaWYgKCFwcmVjZWRlbmNlTGlzdCkgcmV0dXJuO1xuXG4gICAgbGV0IHJlbW92ZWRWYWx1ZTogYW55ID0gdW5kZWZpbmVkO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwcmVjZWRlbmNlTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgcHJlY2VkZW5jZSA9IHByZWNlZGVuY2VMaXN0W2ldO1xuICAgICAgaWYgKHByZWNlZGVuY2Uuc3Vic2NyaXB0aW9uSGFuZGxlID09PSBzdWJzY3JpcHRpb25IYW5kbGUpIHtcbiAgICAgICAgLy8gVGhlIHZpZXcncyB2YWx1ZSBjYW4gb25seSBjaGFuZ2UgaWYgdGhpcyBzdWJzY3JpcHRpb24gaXMgdGhlIG9uZSB0aGF0XG4gICAgICAgIC8vIHVzZWQgdG8gaGF2ZSBwcmVjZWRlbmNlLlxuICAgICAgICBpZiAoaSA9PT0gMCkgcmVtb3ZlZFZhbHVlID0gcHJlY2VkZW5jZS52YWx1ZTtcbiAgICAgICAgcHJlY2VkZW5jZUxpc3Quc3BsaWNlKGksIDEpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocHJlY2VkZW5jZUxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aGlzLmRhdGFCeUtleS5kZWxldGUoa2V5KTtcbiAgICAgIGNoYW5nZUNvbGxlY3RvcltrZXldID0gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICByZW1vdmVkVmFsdWUgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgIUVKU09OLmVxdWFscyhyZW1vdmVkVmFsdWUsIHByZWNlZGVuY2VMaXN0WzBdLnZhbHVlKVxuICAgICkge1xuICAgICAgY2hhbmdlQ29sbGVjdG9yW2tleV0gPSBwcmVjZWRlbmNlTGlzdFswXS52YWx1ZTtcbiAgICB9XG4gIH1cblxuICBjaGFuZ2VGaWVsZChcbiAgICBzdWJzY3JpcHRpb25IYW5kbGU6IHN0cmluZyxcbiAgICBrZXk6IHN0cmluZyxcbiAgICB2YWx1ZTogYW55LFxuICAgIGNoYW5nZUNvbGxlY3RvcjogQ2hhbmdlQ29sbGVjdG9yLFxuICAgIGlzQWRkOiBib29sZWFuID0gZmFsc2VcbiAgKTogdm9pZCB7XG4gICAgLy8gUHVibGlzaCBBUEkgaWdub3JlcyBfaWQgaWYgcHJlc2VudCBpbiBmaWVsZHNcbiAgICBpZiAoa2V5ID09PSBcIl9pZFwiKSByZXR1cm47XG5cbiAgICAvLyBEb24ndCBzaGFyZSBzdGF0ZSB3aXRoIHRoZSBkYXRhIHBhc3NlZCBpbiBieSB0aGUgdXNlci5cbiAgICB2YWx1ZSA9IEVKU09OLmNsb25lKHZhbHVlKTtcblxuICAgIGlmICghdGhpcy5kYXRhQnlLZXkuaGFzKGtleSkpIHtcbiAgICAgIHRoaXMuZGF0YUJ5S2V5LnNldChrZXksIFtcbiAgICAgICAgeyBzdWJzY3JpcHRpb25IYW5kbGU6IHN1YnNjcmlwdGlvbkhhbmRsZSwgdmFsdWU6IHZhbHVlIH0sXG4gICAgICBdKTtcbiAgICAgIGNoYW5nZUNvbGxlY3RvcltrZXldID0gdmFsdWU7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcHJlY2VkZW5jZUxpc3QgPSB0aGlzLmRhdGFCeUtleS5nZXQoa2V5KSE7XG4gICAgbGV0IGVsdDogUHJlY2VkZW5jZUl0ZW0gfCB1bmRlZmluZWQ7XG5cbiAgICBpZiAoIWlzQWRkKSB7XG4gICAgICBlbHQgPSBwcmVjZWRlbmNlTGlzdC5maW5kKFxuICAgICAgICAocHJlY2VkZW5jZSkgPT4gcHJlY2VkZW5jZS5zdWJzY3JpcHRpb25IYW5kbGUgPT09IHN1YnNjcmlwdGlvbkhhbmRsZVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAoZWx0KSB7XG4gICAgICBpZiAoZWx0ID09PSBwcmVjZWRlbmNlTGlzdFswXSAmJiAhRUpTT04uZXF1YWxzKHZhbHVlLCBlbHQudmFsdWUpKSB7XG4gICAgICAgIC8vIHRoaXMgc3Vic2NyaXB0aW9uIGlzIGNoYW5naW5nIHRoZSB2YWx1ZSBvZiB0aGlzIGZpZWxkLlxuICAgICAgICBjaGFuZ2VDb2xsZWN0b3Jba2V5XSA9IHZhbHVlO1xuICAgICAgfVxuICAgICAgZWx0LnZhbHVlID0gdmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHRoaXMgc3Vic2NyaXB0aW9uIGlzIG5ld2x5IGNhcmluZyBhYm91dCB0aGlzIGZpZWxkXG4gICAgICBwcmVjZWRlbmNlTGlzdC5wdXNoKHsgc3Vic2NyaXB0aW9uSGFuZGxlOiBzdWJzY3JpcHRpb25IYW5kbGUsIHZhbHVlOiB2YWx1ZSB9KTtcbiAgICB9XG4gIH1cbn0iXX0=
