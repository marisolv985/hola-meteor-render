Package["core-runtime"].queue("ddp-common",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var check = Package.check.check;
var Match = Package.check.Match;
var Random = Package.random.Random;
var ECMAScript = Package.ecmascript.ECMAScript;
var EJSON = Package.ejson.EJSON;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var Retry = Package.retry.Retry;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var DDPCommon;

var require = meteorInstall({"node_modules":{"meteor":{"ddp-common":{"namespace.js":function module(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/ddp-common/namespace.js                                                                                 //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
/**
 * @namespace DDPCommon
 * @summary Namespace for DDPCommon-related methods/classes. Shared between 
 * `ddp-client` and `ddp-server`, where the ddp-client is the implementation
 * of a ddp client for both client AND server; and the ddp server is the
 * implementation of the livedata server and stream server. Common 
 * functionality shared between both can be shared under this namespace
 */ DDPCommon = {};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"heartbeat.js":function module(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/ddp-common/heartbeat.js                                                                                 //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
// Heartbeat options:
//   heartbeatInterval: interval to send pings, in milliseconds.
//   heartbeatTimeout: timeout to close the connection if a reply isn't
//     received, in milliseconds.
//   sendPing: function to call to send a ping on the connection.
//   onTimeout: function to call to close the connection.
DDPCommon.Heartbeat = class Heartbeat {
    stop() {
        this._clearHeartbeatIntervalTimer();
        this._clearHeartbeatTimeoutTimer();
    }
    start() {
        this.stop();
        this._startHeartbeatIntervalTimer();
    }
    _startHeartbeatIntervalTimer() {
        this._heartbeatIntervalHandle = Meteor.setInterval(()=>this._heartbeatIntervalFired(), this.heartbeatInterval);
    }
    _startHeartbeatTimeoutTimer() {
        this._heartbeatTimeoutHandle = Meteor.setTimeout(()=>this._heartbeatTimeoutFired(), this.heartbeatTimeout);
    }
    _clearHeartbeatIntervalTimer() {
        if (this._heartbeatIntervalHandle) {
            Meteor.clearInterval(this._heartbeatIntervalHandle);
            this._heartbeatIntervalHandle = null;
        }
    }
    _clearHeartbeatTimeoutTimer() {
        if (this._heartbeatTimeoutHandle) {
            Meteor.clearTimeout(this._heartbeatTimeoutHandle);
            this._heartbeatTimeoutHandle = null;
        }
    }
    // The heartbeat interval timer is fired when we should send a ping.
    _heartbeatIntervalFired() {
        // don't send ping if we've seen a packet since we last checked,
        // *or* if we have already sent a ping and are awaiting a timeout.
        // That shouldn't happen, but it's possible if
        // `this.heartbeatInterval` is smaller than
        // `this.heartbeatTimeout`.
        if (!this._seenPacket && !this._heartbeatTimeoutHandle) {
            this._sendPing();
            // Set up timeout, in case a pong doesn't arrive in time.
            this._startHeartbeatTimeoutTimer();
        }
        this._seenPacket = false;
    }
    // The heartbeat timeout timer is fired when we sent a ping, but we
    // timed out waiting for the pong.
    _heartbeatTimeoutFired() {
        this._heartbeatTimeoutHandle = null;
        this._onTimeout();
    }
    messageReceived() {
        // Tell periodic checkin that we have seen a packet, and thus it
        // does not need to send a ping this cycle.
        this._seenPacket = true;
        // If we were waiting for a pong, we got it.
        if (this._heartbeatTimeoutHandle) {
            this._clearHeartbeatTimeoutTimer();
        }
    }
    constructor(options){
        this.heartbeatInterval = options.heartbeatInterval;
        this.heartbeatTimeout = options.heartbeatTimeout;
        this._sendPing = options.sendPing;
        this._onTimeout = options.onTimeout;
        this._seenPacket = false;
        this._heartbeatIntervalHandle = null;
        this._heartbeatTimeoutHandle = null;
    }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"utils.js":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/ddp-common/utils.js                                                                                     //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
"use strict";module.export({keys:()=>keys,isEmpty:()=>isEmpty,last:()=>last});module.export({hasOwn:()=>hasOwn,slice:()=>slice},true);
const hasOwn = Object.prototype.hasOwnProperty;
const slice = Array.prototype.slice;
function keys(obj) {
    return Object.keys(Object(obj));
}
function isEmpty(obj) {
    if (obj == null) {
        return true;
    }
    if (Array.isArray(obj) || typeof obj === "string") {
        return obj.length === 0;
    }
    for(const key in obj){
        if (hasOwn.call(obj, key)) {
            return false;
        }
    }
    return true;
}
function last(array, n, guard) {
    if (array == null) {
        return;
    }
    if (n == null || guard) {
        return array[array.length - 1];
    }
    return slice.call(array, Math.max(array.length - n, 0));
}
DDPCommon.SUPPORTED_DDP_VERSIONS = [
    '1',
    'pre2',
    'pre1'
];
DDPCommon.parseDDP = function(stringMessage) {
    try {
        var msg = JSON.parse(stringMessage);
    } catch (e) {
        Meteor._debug("Discarding message with invalid JSON", stringMessage);
        return null;
    }
    // DDP messages must be objects.
    if (msg === null || typeof msg !== 'object') {
        Meteor._debug("Discarding non-object DDP message", stringMessage);
        return null;
    }
    // massage msg to get it into "abstract ddp" rather than "wire ddp" format.
    // switch between "cleared" rep of unsetting fields and "undefined"
    // rep of same
    if (hasOwn.call(msg, 'cleared')) {
        if (!hasOwn.call(msg, 'fields')) {
            msg.fields = {};
        }
        msg.cleared.forEach((clearKey)=>{
            msg.fields[clearKey] = undefined;
        });
        delete msg.cleared;
    }
    [
        'fields',
        'params',
        'result'
    ].forEach((field)=>{
        if (hasOwn.call(msg, field)) {
            msg[field] = EJSON._adjustTypesFromJSONValue(msg[field]);
        }
    });
    return msg;
};
DDPCommon.stringifyDDP = function(msg) {
    const copy = EJSON.clone(msg);
    // swizzle 'changed' messages from 'fields undefined' rep to 'fields
    // and cleared' rep
    if (hasOwn.call(msg, 'fields')) {
        const cleared = [];
        Object.keys(msg.fields).forEach((key)=>{
            const value = msg.fields[key];
            if (typeof value === "undefined") {
                cleared.push(key);
                delete copy.fields[key];
            }
        });
        if (!isEmpty(cleared)) {
            copy.cleared = cleared;
        }
        if (isEmpty(copy.fields)) {
            delete copy.fields;
        }
    }
    // adjust types to basic
    [
        'fields',
        'params',
        'result'
    ].forEach((field)=>{
        if (hasOwn.call(copy, field)) {
            copy[field] = EJSON._adjustTypesToJSONValue(copy[field]);
        }
    });
    if (msg.id && typeof msg.id !== 'string') {
        throw new Error("Message id is not a string");
    }
    return JSON.stringify(copy);
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"method_invocation.js":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/ddp-common/method_invocation.js                                                                         //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);// Instance name is this because it is usually referred to as this inside a
// method definition
/**
 * @summary The state for a single invocation of a method, referenced by this
 * inside a method definition.
 * @param {Object} options
 * @instanceName this
 * @showInstanceName true
 */ 
DDPCommon.MethodInvocation = class MethodInvocation {
    /**
   * @summary Call inside a method invocation.  Allow subsequent method from this client to begin running in a new fiber.
   * @locus Server
   * @memberOf DDPCommon.MethodInvocation
   * @instance
   */ unblock() {
        this._calledUnblock = true;
        this._unblock();
    }
    /**
   * @summary Set the logged in user.
   * @locus Server
   * @memberOf DDPCommon.MethodInvocation
   * @instance
   * @param {String | null} userId The value that should be returned by `userId` on this connection.
   */ setUserId(userId) {
        return _async_to_generator(function*() {
            if (this._calledUnblock) {
                throw new Error("Can't call setUserId in a method after calling unblock");
            }
            this.userId = userId;
            yield this._setUserId(userId);
        }).call(this);
    }
    constructor(options){
        // true if we're running not the actual method, but a stub (that is,
        // if we're on a client (which may be a browser, or in the future a
        // server connecting to another server) and presently running a
        // simulation of a server-side method for latency compensation
        // purposes). not currently true except in a client such as a browser,
        // since there's usually no point in running stubs unless you have a
        // zero-latency connection to the user.
        /**
     * @summary The name given to the method.
     * @locus Anywhere
     * @name  name
     * @memberOf DDPCommon.MethodInvocation
     * @instance
     * @type {String}
     */ this.name = options.name;
        /**
     * @summary Access inside a method invocation.  Boolean value, true if this invocation is a stub.
     * @locus Anywhere
     * @name  isSimulation
     * @memberOf DDPCommon.MethodInvocation
     * @instance
     * @type {Boolean}
     */ this.isSimulation = options.isSimulation;
        // call this function to allow other method invocations (from the
        // same client) to continue running without waiting for this one to
        // complete.
        this._unblock = options.unblock || function() {};
        this._calledUnblock = false;
        // used to know when the function apply was called by callAsync
        this._isFromCallAsync = options.isFromCallAsync;
        // current user id
        /**
     * @summary The id of the user that made this method call, or `null` if no user was logged in.
     * @locus Anywhere
     * @name  userId
     * @memberOf DDPCommon.MethodInvocation
     * @instance
     */ this.userId = options.userId;
        // sets current user id in all appropriate server contexts and
        // reruns subscriptions
        this._setUserId = options.setUserId || function() {};
        // On the server, the connection this method call came in on.
        /**
     * @summary Access inside a method invocation. The [connection](#meteor_onconnection) that this method was received on. `null` if the method is not associated with a connection, eg. a server initiated method call. Calls to methods made from a server method which was in turn initiated from the client share the same `connection`.
     * @locus Server
     * @name  connection
     * @memberOf DDPCommon.MethodInvocation
     * @instance
     */ this.connection = options.connection;
        // The seed for randomStream value generation
        this.randomSeed = options.randomSeed;
        // This is set by RandomStream.get; and holds the random stream state
        this.randomStream = null;
        this.fence = options.fence;
    }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"random_stream.js":function module(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/ddp-common/random_stream.js                                                                             //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
// RandomStream allows for generation of pseudo-random values, from a seed.
//
// We use this for consistent 'random' numbers across the client and server.
// We want to generate probably-unique IDs on the client, and we ideally want
// the server to generate the same IDs when it executes the method.
//
// For generated values to be the same, we must seed ourselves the same way,
// and we must keep track of the current state of our pseudo-random generators.
// We call this state the scope. By default, we use the current DDP method
// invocation as our scope.  DDP now allows the client to specify a randomSeed.
// If a randomSeed is provided it will be used to seed our random sequences.
// In this way, client and server method calls will generate the same values.
//
// We expose multiple named streams; each stream is independent
// and is seeded differently (but predictably from the name).
// By using multiple streams, we support reordering of requests,
// as long as they occur on different streams.
//
// @param options {Optional Object}
//   seed: Array or value - Seed value(s) for the generator.
//                          If an array, will be used as-is
//                          If a value, will be converted to a single-value array
//                          If omitted, a random array will be used as the seed.
DDPCommon.RandomStream = class RandomStream {
    // Get a random sequence with the specified name, creating it if does not exist.
    // New sequences are seeded with the seed concatenated with the name.
    // By passing a seed into Random.create, we use the Alea generator.
    _sequence(name) {
        var self = this;
        var sequence = self.sequences[name] || null;
        if (sequence === null) {
            var sequenceSeed = self.seed.concat(name);
            for(var i = 0; i < sequenceSeed.length; i++){
                if (typeof sequenceSeed[i] === "function") {
                    sequenceSeed[i] = sequenceSeed[i]();
                }
            }
            self.sequences[name] = sequence = Random.createWithSeeds.apply(null, sequenceSeed);
        }
        return sequence;
    }
    constructor(options){
        this.seed = [].concat(options.seed || randomToken());
        this.sequences = Object.create(null);
    }
};
// Returns a random string of sufficient length for a random seed.
// This is a placeholder function; a similar function is planned
// for Random itself; when that is added we should remove this function,
// and call Random's randomToken instead.
function randomToken() {
    return Random.hexString(20);
}
;
// Returns the random stream with the specified name, in the specified
// scope. If a scope is passed, then we use that to seed a (not
// cryptographically secure) PRNG using the fast Alea algorithm.  If
// scope is null (or otherwise falsey) then we use a generated seed.
//
// However, scope will normally be the current DDP method invocation,
// so we'll use the stream with the specified name, and we should get
// consistent values on the client and server sides of a method call.
DDPCommon.RandomStream.get = function(scope, name) {
    if (!name) {
        name = "default";
    }
    if (!scope) {
        // There was no scope passed in; the sequence won't actually be
        // reproducible. but make it fast (and not cryptographically
        // secure) anyways, so that the behavior is similar to what you'd
        // get by passing in a scope.
        return Random.insecure;
    }
    var randomStream = scope.randomStream;
    if (!randomStream) {
        scope.randomStream = randomStream = new DDPCommon.RandomStream({
            seed: scope.randomSeed
        });
    }
    return randomStream._sequence(name);
};
// Creates a randomSeed for passing to a method call.
// Note that we take enclosing as an argument,
// though we expect it to be DDP._CurrentMethodInvocation.get()
// However, we often evaluate makeRpcSeed lazily, and thus the relevant
// invocation may not be the one currently in scope.
// If enclosing is null, we'll use Random and values won't be repeatable.
DDPCommon.makeRpcSeed = function(enclosing, methodName) {
    var stream = DDPCommon.RandomStream.get(enclosing, '/rpc/' + methodName);
    return stream.hexString(20);
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});


/* Exports */
return {
  export: function () { return {
      DDPCommon: DDPCommon
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/ddp-common/namespace.js",
    "/node_modules/meteor/ddp-common/heartbeat.js",
    "/node_modules/meteor/ddp-common/utils.js",
    "/node_modules/meteor/ddp-common/method_invocation.js",
    "/node_modules/meteor/ddp-common/random_stream.js"
  ]
}});

//# sourceURL=meteor://💻app/packages/ddp-common.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZGRwLWNvbW1vbi9uYW1lc3BhY2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL2RkcC1jb21tb24vaGVhcnRiZWF0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9kZHAtY29tbW9uL3V0aWxzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9kZHAtY29tbW9uL21ldGhvZF9pbnZvY2F0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9kZHAtY29tbW9uL3JhbmRvbV9zdHJlYW0uanMiXSwibmFtZXMiOlsiRERQQ29tbW9uIiwiSGVhcnRiZWF0Iiwic3RvcCIsIl9jbGVhckhlYXJ0YmVhdEludGVydmFsVGltZXIiLCJfY2xlYXJIZWFydGJlYXRUaW1lb3V0VGltZXIiLCJzdGFydCIsIl9zdGFydEhlYXJ0YmVhdEludGVydmFsVGltZXIiLCJfaGVhcnRiZWF0SW50ZXJ2YWxIYW5kbGUiLCJNZXRlb3IiLCJzZXRJbnRlcnZhbCIsIl9oZWFydGJlYXRJbnRlcnZhbEZpcmVkIiwiaGVhcnRiZWF0SW50ZXJ2YWwiLCJfc3RhcnRIZWFydGJlYXRUaW1lb3V0VGltZXIiLCJfaGVhcnRiZWF0VGltZW91dEhhbmRsZSIsInNldFRpbWVvdXQiLCJfaGVhcnRiZWF0VGltZW91dEZpcmVkIiwiaGVhcnRiZWF0VGltZW91dCIsImNsZWFySW50ZXJ2YWwiLCJjbGVhclRpbWVvdXQiLCJfc2VlblBhY2tldCIsIl9zZW5kUGluZyIsIl9vblRpbWVvdXQiLCJtZXNzYWdlUmVjZWl2ZWQiLCJvcHRpb25zIiwic2VuZFBpbmciLCJvblRpbWVvdXQiLCJoYXNPd24iLCJPYmplY3QiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsInNsaWNlIiwiQXJyYXkiLCJrZXlzIiwib2JqIiwiaXNFbXB0eSIsImlzQXJyYXkiLCJsZW5ndGgiLCJrZXkiLCJjYWxsIiwibGFzdCIsImFycmF5IiwibiIsImd1YXJkIiwiTWF0aCIsIm1heCIsIlNVUFBPUlRFRF9ERFBfVkVSU0lPTlMiLCJwYXJzZUREUCIsInN0cmluZ01lc3NhZ2UiLCJtc2ciLCJKU09OIiwicGFyc2UiLCJlIiwiX2RlYnVnIiwiZmllbGRzIiwiY2xlYXJlZCIsImZvckVhY2giLCJjbGVhcktleSIsInVuZGVmaW5lZCIsImZpZWxkIiwiRUpTT04iLCJfYWRqdXN0VHlwZXNGcm9tSlNPTlZhbHVlIiwic3RyaW5naWZ5RERQIiwiY29weSIsImNsb25lIiwidmFsdWUiLCJwdXNoIiwiX2FkanVzdFR5cGVzVG9KU09OVmFsdWUiLCJpZCIsIkVycm9yIiwic3RyaW5naWZ5IiwiTWV0aG9kSW52b2NhdGlvbiIsInVuYmxvY2siLCJfY2FsbGVkVW5ibG9jayIsIl91bmJsb2NrIiwic2V0VXNlcklkIiwidXNlcklkIiwiX3NldFVzZXJJZCIsIm5hbWUiLCJpc1NpbXVsYXRpb24iLCJfaXNGcm9tQ2FsbEFzeW5jIiwiaXNGcm9tQ2FsbEFzeW5jIiwiY29ubmVjdGlvbiIsInJhbmRvbVNlZWQiLCJyYW5kb21TdHJlYW0iLCJmZW5jZSIsIlJhbmRvbVN0cmVhbSIsIl9zZXF1ZW5jZSIsInNlbGYiLCJzZXF1ZW5jZSIsInNlcXVlbmNlcyIsInNlcXVlbmNlU2VlZCIsInNlZWQiLCJjb25jYXQiLCJpIiwiUmFuZG9tIiwiY3JlYXRlV2l0aFNlZWRzIiwiYXBwbHkiLCJyYW5kb21Ub2tlbiIsImNyZWF0ZSIsImhleFN0cmluZyIsImdldCIsInNjb3BlIiwiaW5zZWN1cmUiLCJtYWtlUnBjU2VlZCIsImVuY2xvc2luZyIsIm1ldGhvZE5hbWUiLCJzdHJlYW0iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBOzs7Ozs7O0NBT0MsR0FDREEsWUFBWSxDQUFDOzs7Ozs7Ozs7Ozs7QUNSYixxQkFBcUI7QUFDckIsZ0VBQWdFO0FBQ2hFLHVFQUF1RTtBQUN2RSxpQ0FBaUM7QUFDakMsaUVBQWlFO0FBQ2pFLHlEQUF5RDtBQUV6REEsVUFBVUMsU0FBUyxHQUFHLE1BQU1BO0lBWTFCQyxPQUFPO1FBQ0wsSUFBSSxDQUFDQyw0QkFBNEI7UUFDakMsSUFBSSxDQUFDQywyQkFBMkI7SUFDbEM7SUFFQUMsUUFBUTtRQUNOLElBQUksQ0FBQ0gsSUFBSTtRQUNULElBQUksQ0FBQ0ksNEJBQTRCO0lBQ25DO0lBRUFBLCtCQUErQjtRQUM3QixJQUFJLENBQUNDLHdCQUF3QixHQUFHQyxPQUFPQyxXQUFXLENBQ2hELElBQU0sSUFBSSxDQUFDQyx1QkFBdUIsSUFDbEMsSUFBSSxDQUFDQyxpQkFBaUI7SUFFMUI7SUFFQUMsOEJBQThCO1FBQzVCLElBQUksQ0FBQ0MsdUJBQXVCLEdBQUdMLE9BQU9NLFVBQVUsQ0FDOUMsSUFBTSxJQUFJLENBQUNDLHNCQUFzQixJQUNqQyxJQUFJLENBQUNDLGdCQUFnQjtJQUV6QjtJQUVBYiwrQkFBK0I7UUFDN0IsSUFBSSxJQUFJLENBQUNJLHdCQUF3QixFQUFFO1lBQ2pDQyxPQUFPUyxhQUFhLENBQUMsSUFBSSxDQUFDVix3QkFBd0I7WUFDbEQsSUFBSSxDQUFDQSx3QkFBd0IsR0FBRztRQUNsQztJQUNGO0lBRUFILDhCQUE4QjtRQUM1QixJQUFJLElBQUksQ0FBQ1MsdUJBQXVCLEVBQUU7WUFDaENMLE9BQU9VLFlBQVksQ0FBQyxJQUFJLENBQUNMLHVCQUF1QjtZQUNoRCxJQUFJLENBQUNBLHVCQUF1QixHQUFHO1FBQ2pDO0lBQ0Y7SUFFQSxvRUFBb0U7SUFDcEVILDBCQUEwQjtRQUN4QixnRUFBZ0U7UUFDaEUsa0VBQWtFO1FBQ2xFLDhDQUE4QztRQUM5QywyQ0FBMkM7UUFDM0MsMkJBQTJCO1FBQzNCLElBQUksQ0FBRSxJQUFJLENBQUNTLFdBQVcsSUFBSSxDQUFFLElBQUksQ0FBQ04sdUJBQXVCLEVBQUU7WUFDeEQsSUFBSSxDQUFDTyxTQUFTO1lBQ2QseURBQXlEO1lBQ3pELElBQUksQ0FBQ1IsMkJBQTJCO1FBQ2xDO1FBQ0EsSUFBSSxDQUFDTyxXQUFXLEdBQUc7SUFDckI7SUFFQSxtRUFBbUU7SUFDbkUsa0NBQWtDO0lBQ2xDSix5QkFBeUI7UUFDdkIsSUFBSSxDQUFDRix1QkFBdUIsR0FBRztRQUMvQixJQUFJLENBQUNRLFVBQVU7SUFDakI7SUFFQUMsa0JBQWtCO1FBQ2hCLGdFQUFnRTtRQUNoRSwyQ0FBMkM7UUFDM0MsSUFBSSxDQUFDSCxXQUFXLEdBQUc7UUFDbkIsNENBQTRDO1FBQzVDLElBQUksSUFBSSxDQUFDTix1QkFBdUIsRUFBRTtZQUNoQyxJQUFJLENBQUNULDJCQUEyQjtRQUNsQztJQUNGO0lBL0VBLFlBQVltQixPQUFPLENBQUU7UUFDbkIsSUFBSSxDQUFDWixpQkFBaUIsR0FBR1ksUUFBUVosaUJBQWlCO1FBQ2xELElBQUksQ0FBQ0ssZ0JBQWdCLEdBQUdPLFFBQVFQLGdCQUFnQjtRQUNoRCxJQUFJLENBQUNJLFNBQVMsR0FBR0csUUFBUUMsUUFBUTtRQUNqQyxJQUFJLENBQUNILFVBQVUsR0FBR0UsUUFBUUUsU0FBUztRQUNuQyxJQUFJLENBQUNOLFdBQVcsR0FBRztRQUVuQixJQUFJLENBQUNaLHdCQUF3QixHQUFHO1FBQ2hDLElBQUksQ0FBQ00sdUJBQXVCLEdBQUc7SUFDakM7QUF1RUY7Ozs7Ozs7Ozs7OztBQ3hGQTtBQUVBLE9BQU8sTUFBTWEsU0FBU0MsT0FBT0MsU0FBUyxDQUFDQyxRQUFlO0FBQ3RELE9BQU8sTUFBTUMsUUFBUUMsTUFBTUgsU0FBZ0I7QUFFM0MsT0FBTyxTQUFTSSxJQUFRO0lBQ3RCLE9BQU9MLE9BQU9LLElBQUksQ0FBQ0wsT0FBT007QUFDNUI7QUFFQSxPQUFPLFNBQVNDLE9BQVc7SUFDekIsSUFBSUQsT0FBTyxNQUFNO1FBQ2YsT0FBTztJQUNUO0lBRUEsSUFBSUYsTUFBTUksT0FBTyxDQUFDRixRQUNkLE9BQU9BLFFBQVEsVUFBVTtRQUMzQixPQUFPQSxJQUFJRyxNQUFNLEtBQUs7SUFDeEI7SUFFQSxJQUFLLE1BQU1DLE9BQU9KLElBQUs7UUFDckIsSUFBSVAsT0FBT1ksSUFBSSxDQUFDTCxLQUFLSSxNQUFNO1lBQ3pCLE9BQU87UUFDVDtJQUNGO0lBRUEsT0FBTztBQUNUO0FBRUEsT0FBTyxTQUFTRSxLQUFLQyxLQUFLLEVBQUVDLENBQUMsRUFBRUMsQ0FBSztJQUNsQyxJQUFJRixTQUFTLE1BQU07UUFDakI7SUFDRjtJQUVBLElBQUtDLEtBQUssUUFBU0MsT0FBTztRQUN4QixPQUFPRixLQUFLLENBQUNBLE1BQU1KLE1BQU0sR0FBRyxFQUFFO0lBQ2hDO0lBRUEsT0FBT04sTUFBTVEsSUFBSSxDQUFDRSxPQUFPRyxLQUFLQyxHQUFHLENBQUNKLE1BQU1KLE1BQU0sR0FBR0ssR0FBRztBQUN0RDtBQUVBekMsVUFBVTZDLHNCQUFzQixHQUFHO0lBQUU7SUFBSztJQUFRO0NBQVE7QUFFMUQ3QyxVQUFVOEMsUUFBUSxHQUFHLFNBQVVDLGFBQWE7SUFDMUMsSUFBSTtRQUNGLElBQUlDLE1BQU1DLEtBQUtDLEtBQUssQ0FBQ0g7SUFDdkIsRUFBRSxPQUFPSSxHQUFHO1FBQ1YzQyxPQUFPNEMsTUFBTSxDQUFDLHdDQUF3Q0w7UUFDdEQsT0FBTztJQUNUO0lBQ0EsZ0NBQWdDO0lBQ2hDLElBQUlDLFFBQVEsUUFBUSxPQUFPQSxRQUFRLFVBQVU7UUFDM0N4QyxPQUFPNEMsTUFBTSxDQUFDLHFDQUFxQ0w7UUFDbkQsT0FBTztJQUNUO0lBRUEsMkVBQTJFO0lBRTNFLG1FQUFtRTtJQUNuRSxjQUFjO0lBQ2QsSUFBSXJCLE9BQU9ZLElBQUksQ0FBQ1UsS0FBSyxZQUFZO1FBQy9CLElBQUksQ0FBRXRCLE9BQU9ZLElBQUksQ0FBQ1UsS0FBSyxXQUFXO1lBQ2hDQSxJQUFJSyxNQUFNLEdBQUcsQ0FBQztRQUNoQjtRQUNBTCxJQUFJTSxPQUFPLENBQUNDLE9BQU8sQ0FBQ0M7WUFDbEJSLElBQUlLLE1BQU0sQ0FBQ0csU0FBUyxHQUFHQztRQUN6QjtRQUNBLE9BQU9ULElBQUlNLE9BQU87SUFDcEI7SUFFQTtRQUFDO1FBQVU7UUFBVTtLQUFTLENBQUNDLE9BQU8sQ0FBQ0c7UUFDckMsSUFBSWhDLE9BQU9ZLElBQUksQ0FBQ1UsS0FBS1UsUUFBUTtZQUMzQlYsR0FBRyxDQUFDVSxNQUFNLEdBQUdDLE1BQU1DLHlCQUF5QixDQUFDWixHQUFHLENBQUNVLE1BQU07UUFDekQ7SUFDRjtJQUVBLE9BQU9WO0FBQ1Q7QUFFQWhELFVBQVU2RCxZQUFZLEdBQUcsU0FBVWIsR0FBRztJQUNwQyxNQUFNYyxPQUFPSCxNQUFNSSxLQUFLLENBQUNmO0lBRXpCLG9FQUFvRTtJQUNwRSxtQkFBbUI7SUFDbkIsSUFBSXRCLE9BQU9ZLElBQUksQ0FBQ1UsS0FBSyxXQUFXO1FBQzlCLE1BQU1NLFVBQVUsRUFBRTtRQUVsQjNCLE9BQU9LLElBQUksQ0FBQ2dCLElBQUlLLE1BQU0sRUFBRUUsT0FBTyxDQUFDbEI7WUFDOUIsTUFBTTJCLFFBQVFoQixJQUFJSyxNQUFNLENBQUNoQixJQUFJO1lBRTdCLElBQUksT0FBTzJCLFVBQVUsYUFBYTtnQkFDaENWLFFBQVFXLElBQUksQ0FBQzVCO2dCQUNiLE9BQU95QixLQUFLVCxNQUFNLENBQUNoQixJQUFJO1lBQ3pCO1FBQ0Y7UUFFQSxJQUFJLENBQUVILFFBQVFvQixVQUFVO1lBQ3RCUSxLQUFLUixPQUFPLEdBQUdBO1FBQ2pCO1FBRUEsSUFBSXBCLFFBQVE0QixLQUFLVCxNQUFNLEdBQUc7WUFDeEIsT0FBT1MsS0FBS1QsTUFBTTtRQUNwQjtJQUNGO0lBRUEsd0JBQXdCO0lBQ3hCO1FBQUM7UUFBVTtRQUFVO0tBQVMsQ0FBQ0UsT0FBTyxDQUFDRztRQUNyQyxJQUFJaEMsT0FBT1ksSUFBSSxDQUFDd0IsTUFBTUosUUFBUTtZQUM1QkksSUFBSSxDQUFDSixNQUFNLEdBQUdDLE1BQU1PLHVCQUF1QixDQUFDSixJQUFJLENBQUNKLE1BQU07UUFDekQ7SUFDRjtJQUVBLElBQUlWLElBQUltQixFQUFFLElBQUksT0FBT25CLElBQUltQixFQUFFLEtBQUssVUFBVTtRQUN4QyxNQUFNLElBQUlDLE1BQU07SUFDbEI7SUFFQSxPQUFPbkIsS0FBS29CLFNBQVMsQ0FBQ1A7QUFDeEI7Ozs7Ozs7Ozs7OztBQ3BIQSwyRUFBMkU7QUFDM0Usb0JBQW9CO0FBQ3BCOzs7Ozs7Q0FNQztBQUNEOUQsVUFBVXNFLGdCQUFnQixHQUFHLE1BQU1BO0lBMEVqQzs7Ozs7R0FLQyxHQUNEQyxVQUFVO1FBQ1IsSUFBSSxDQUFDQyxjQUFjLEdBQUc7UUFDdEIsSUFBSSxDQUFDQyxRQUFRO0lBQ2Y7SUFFQTs7Ozs7O0dBTUMsR0FDS0MsVUFBVUMsTUFBTTs7WUFDcEIsSUFBSSxJQUFJLENBQUNILGNBQWMsRUFBRTtnQkFDdkIsTUFBTSxJQUFJSixNQUFNO1lBQ2xCO1lBQ0EsSUFBSSxDQUFDTyxNQUFNLEdBQUdBO1lBQ2QsTUFBTSxJQUFJLENBQUNDLFVBQVUsQ0FBQ0Q7UUFDeEI7O0lBakdBLFlBQVlwRCxPQUFPLENBQUU7UUFDbkIsb0VBQW9FO1FBQ3BFLG1FQUFtRTtRQUNuRSwrREFBK0Q7UUFDL0QsOERBQThEO1FBQzlELHNFQUFzRTtRQUN0RSxvRUFBb0U7UUFDcEUsdUNBQXVDO1FBRXZDOzs7Ozs7O0tBT0MsR0FDRCxJQUFJLENBQUNzRCxJQUFJLEdBQUd0RCxRQUFRc0QsSUFBSTtRQUV4Qjs7Ozs7OztLQU9DLEdBQ0QsSUFBSSxDQUFDQyxZQUFZLEdBQUd2RCxRQUFRdUQsWUFBWTtRQUV4QyxpRUFBaUU7UUFDakUsbUVBQW1FO1FBQ25FLFlBQVk7UUFDWixJQUFJLENBQUNMLFFBQVEsR0FBR2xELFFBQVFnRCxPQUFPLElBQUksWUFBYTtRQUNoRCxJQUFJLENBQUNDLGNBQWMsR0FBRztRQUV0QiwrREFBK0Q7UUFDL0QsSUFBSSxDQUFDTyxnQkFBZ0IsR0FBR3hELFFBQVF5RCxlQUFlO1FBRS9DLGtCQUFrQjtRQUVsQjs7Ozs7O0tBTUMsR0FDRCxJQUFJLENBQUNMLE1BQU0sR0FBR3BELFFBQVFvRCxNQUFNO1FBRTVCLDhEQUE4RDtRQUM5RCx1QkFBdUI7UUFDdkIsSUFBSSxDQUFDQyxVQUFVLEdBQUdyRCxRQUFRbUQsU0FBUyxJQUFJLFlBQWE7UUFFcEQsNkRBQTZEO1FBRTdEOzs7Ozs7S0FNQyxHQUNELElBQUksQ0FBQ08sVUFBVSxHQUFHMUQsUUFBUTBELFVBQVU7UUFFcEMsNkNBQTZDO1FBQzdDLElBQUksQ0FBQ0MsVUFBVSxHQUFHM0QsUUFBUTJELFVBQVU7UUFFcEMscUVBQXFFO1FBQ3JFLElBQUksQ0FBQ0MsWUFBWSxHQUFHO1FBRXBCLElBQUksQ0FBQ0MsS0FBSyxHQUFHN0QsUUFBUTZELEtBQUs7SUFDNUI7QUEyQkY7Ozs7Ozs7Ozs7OztBQzVHQSwyRUFBMkU7QUFDM0UsRUFBRTtBQUNGLDRFQUE0RTtBQUM1RSw2RUFBNkU7QUFDN0UsbUVBQW1FO0FBQ25FLEVBQUU7QUFDRiw0RUFBNEU7QUFDNUUsK0VBQStFO0FBQy9FLDBFQUEwRTtBQUMxRSwrRUFBK0U7QUFDL0UsNEVBQTRFO0FBQzVFLDZFQUE2RTtBQUM3RSxFQUFFO0FBQ0YsK0RBQStEO0FBQy9ELDZEQUE2RDtBQUM3RCxnRUFBZ0U7QUFDaEUsOENBQThDO0FBQzlDLEVBQUU7QUFDRixtQ0FBbUM7QUFDbkMsNERBQTREO0FBQzVELDJEQUEyRDtBQUMzRCxpRkFBaUY7QUFDakYsZ0ZBQWdGO0FBQ2hGcEYsVUFBVXFGLFlBQVksR0FBRyxNQUFNQTtJQU03QixnRkFBZ0Y7SUFDaEYscUVBQXFFO0lBQ3JFLG1FQUFtRTtJQUNuRUMsVUFBVVQsSUFBSSxFQUFFO1FBQ2QsSUFBSVUsT0FBTyxJQUFJO1FBRWYsSUFBSUMsV0FBV0QsS0FBS0UsU0FBUyxDQUFDWixLQUFLLElBQUk7UUFDdkMsSUFBSVcsYUFBYSxNQUFNO1lBQ3JCLElBQUlFLGVBQWVILEtBQUtJLElBQUksQ0FBQ0MsTUFBTSxDQUFDZjtZQUNwQyxJQUFLLElBQUlnQixJQUFJLEdBQUdBLElBQUlILGFBQWF0RCxNQUFNLEVBQUV5RCxJQUFLO2dCQUM1QyxJQUFJLE9BQU9ILFlBQVksQ0FBQ0csRUFBRSxLQUFLLFlBQVk7b0JBQ3pDSCxZQUFZLENBQUNHLEVBQUUsR0FBR0gsWUFBWSxDQUFDRyxFQUFFO2dCQUNuQztZQUNGO1lBQ0FOLEtBQUtFLFNBQVMsQ0FBQ1osS0FBSyxHQUFHVyxXQUFXTSxPQUFPQyxlQUFlLENBQUNDLEtBQUssQ0FBQyxNQUFNTjtRQUN2RTtRQUNBLE9BQU9GO0lBQ1Q7SUF0QkEsWUFBWWpFLE9BQU8sQ0FBRTtRQUNuQixJQUFJLENBQUNvRSxJQUFJLEdBQUcsRUFBRSxDQUFDQyxNQUFNLENBQUNyRSxRQUFRb0UsSUFBSSxJQUFJTTtRQUN0QyxJQUFJLENBQUNSLFNBQVMsR0FBRzlELE9BQU91RSxNQUFNLENBQUM7SUFDakM7QUFvQkY7QUFFQSxrRUFBa0U7QUFDbEUsZ0VBQWdFO0FBQ2hFLHdFQUF3RTtBQUN4RSx5Q0FBeUM7QUFDekMsU0FBU0Q7SUFDUCxPQUFPSCxPQUFPSyxTQUFTLENBQUM7QUFDMUI7O0FBRUEsc0VBQXNFO0FBQ3RFLCtEQUErRDtBQUMvRCxvRUFBb0U7QUFDcEUsb0VBQW9FO0FBQ3BFLEVBQUU7QUFDRixxRUFBcUU7QUFDckUscUVBQXFFO0FBQ3JFLHFFQUFxRTtBQUNyRW5HLFVBQVVxRixZQUFZLENBQUNlLEdBQUcsR0FBRyxTQUFVQyxLQUFLLEVBQUV4QixJQUFJO0lBQ2hELElBQUksQ0FBQ0EsTUFBTTtRQUNUQSxPQUFPO0lBQ1Q7SUFDQSxJQUFJLENBQUN3QixPQUFPO1FBQ1YsK0RBQStEO1FBQy9ELDREQUE0RDtRQUM1RCxpRUFBaUU7UUFDakUsNkJBQTZCO1FBQzdCLE9BQU9QLE9BQU9RLFFBQVE7SUFDeEI7SUFDQSxJQUFJbkIsZUFBZWtCLE1BQU1sQixZQUFZO0lBQ3JDLElBQUksQ0FBQ0EsY0FBYztRQUNqQmtCLE1BQU1sQixZQUFZLEdBQUdBLGVBQWUsSUFBSW5GLFVBQVVxRixZQUFZLENBQUM7WUFDN0RNLE1BQU1VLE1BQU1uQixVQUFVO1FBQ3hCO0lBQ0Y7SUFDQSxPQUFPQyxhQUFhRyxTQUFTLENBQUNUO0FBQ2hDO0FBRUEscURBQXFEO0FBQ3JELDhDQUE4QztBQUM5QywrREFBK0Q7QUFDL0QsdUVBQXVFO0FBQ3ZFLG9EQUFvRDtBQUNwRCx5RUFBeUU7QUFDekU3RSxVQUFVdUcsV0FBVyxHQUFHLFNBQVVDLFNBQVMsRUFBRUMsVUFBVTtJQUNyRCxJQUFJQyxTQUFTMUcsVUFBVXFGLFlBQVksQ0FBQ2UsR0FBRyxDQUFDSSxXQUFXLFVBQVVDO0lBQzdELE9BQU9DLE9BQU9QLFNBQVMsQ0FBQztBQUMxQiIsImZpbGUiOiIvcGFja2FnZXMvZGRwLWNvbW1vbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQG5hbWVzcGFjZSBERFBDb21tb25cbiAqIEBzdW1tYXJ5IE5hbWVzcGFjZSBmb3IgRERQQ29tbW9uLXJlbGF0ZWQgbWV0aG9kcy9jbGFzc2VzLiBTaGFyZWQgYmV0d2VlbiBcbiAqIGBkZHAtY2xpZW50YCBhbmQgYGRkcC1zZXJ2ZXJgLCB3aGVyZSB0aGUgZGRwLWNsaWVudCBpcyB0aGUgaW1wbGVtZW50YXRpb25cbiAqIG9mIGEgZGRwIGNsaWVudCBmb3IgYm90aCBjbGllbnQgQU5EIHNlcnZlcjsgYW5kIHRoZSBkZHAgc2VydmVyIGlzIHRoZVxuICogaW1wbGVtZW50YXRpb24gb2YgdGhlIGxpdmVkYXRhIHNlcnZlciBhbmQgc3RyZWFtIHNlcnZlci4gQ29tbW9uIFxuICogZnVuY3Rpb25hbGl0eSBzaGFyZWQgYmV0d2VlbiBib3RoIGNhbiBiZSBzaGFyZWQgdW5kZXIgdGhpcyBuYW1lc3BhY2VcbiAqL1xuRERQQ29tbW9uID0ge307XG4iLCIvLyBIZWFydGJlYXQgb3B0aW9uczpcbi8vICAgaGVhcnRiZWF0SW50ZXJ2YWw6IGludGVydmFsIHRvIHNlbmQgcGluZ3MsIGluIG1pbGxpc2Vjb25kcy5cbi8vICAgaGVhcnRiZWF0VGltZW91dDogdGltZW91dCB0byBjbG9zZSB0aGUgY29ubmVjdGlvbiBpZiBhIHJlcGx5IGlzbid0XG4vLyAgICAgcmVjZWl2ZWQsIGluIG1pbGxpc2Vjb25kcy5cbi8vICAgc2VuZFBpbmc6IGZ1bmN0aW9uIHRvIGNhbGwgdG8gc2VuZCBhIHBpbmcgb24gdGhlIGNvbm5lY3Rpb24uXG4vLyAgIG9uVGltZW91dDogZnVuY3Rpb24gdG8gY2FsbCB0byBjbG9zZSB0aGUgY29ubmVjdGlvbi5cblxuRERQQ29tbW9uLkhlYXJ0YmVhdCA9IGNsYXNzIEhlYXJ0YmVhdCB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICB0aGlzLmhlYXJ0YmVhdEludGVydmFsID0gb3B0aW9ucy5oZWFydGJlYXRJbnRlcnZhbDtcbiAgICB0aGlzLmhlYXJ0YmVhdFRpbWVvdXQgPSBvcHRpb25zLmhlYXJ0YmVhdFRpbWVvdXQ7XG4gICAgdGhpcy5fc2VuZFBpbmcgPSBvcHRpb25zLnNlbmRQaW5nO1xuICAgIHRoaXMuX29uVGltZW91dCA9IG9wdGlvbnMub25UaW1lb3V0O1xuICAgIHRoaXMuX3NlZW5QYWNrZXQgPSBmYWxzZTtcblxuICAgIHRoaXMuX2hlYXJ0YmVhdEludGVydmFsSGFuZGxlID0gbnVsbDtcbiAgICB0aGlzLl9oZWFydGJlYXRUaW1lb3V0SGFuZGxlID0gbnVsbDtcbiAgfVxuXG4gIHN0b3AoKSB7XG4gICAgdGhpcy5fY2xlYXJIZWFydGJlYXRJbnRlcnZhbFRpbWVyKCk7XG4gICAgdGhpcy5fY2xlYXJIZWFydGJlYXRUaW1lb3V0VGltZXIoKTtcbiAgfVxuXG4gIHN0YXJ0KCkge1xuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMuX3N0YXJ0SGVhcnRiZWF0SW50ZXJ2YWxUaW1lcigpO1xuICB9XG5cbiAgX3N0YXJ0SGVhcnRiZWF0SW50ZXJ2YWxUaW1lcigpIHtcbiAgICB0aGlzLl9oZWFydGJlYXRJbnRlcnZhbEhhbmRsZSA9IE1ldGVvci5zZXRJbnRlcnZhbChcbiAgICAgICgpID0+IHRoaXMuX2hlYXJ0YmVhdEludGVydmFsRmlyZWQoKSxcbiAgICAgIHRoaXMuaGVhcnRiZWF0SW50ZXJ2YWxcbiAgICApO1xuICB9XG5cbiAgX3N0YXJ0SGVhcnRiZWF0VGltZW91dFRpbWVyKCkge1xuICAgIHRoaXMuX2hlYXJ0YmVhdFRpbWVvdXRIYW5kbGUgPSBNZXRlb3Iuc2V0VGltZW91dChcbiAgICAgICgpID0+IHRoaXMuX2hlYXJ0YmVhdFRpbWVvdXRGaXJlZCgpLFxuICAgICAgdGhpcy5oZWFydGJlYXRUaW1lb3V0XG4gICAgKTtcbiAgfVxuXG4gIF9jbGVhckhlYXJ0YmVhdEludGVydmFsVGltZXIoKSB7XG4gICAgaWYgKHRoaXMuX2hlYXJ0YmVhdEludGVydmFsSGFuZGxlKSB7XG4gICAgICBNZXRlb3IuY2xlYXJJbnRlcnZhbCh0aGlzLl9oZWFydGJlYXRJbnRlcnZhbEhhbmRsZSk7XG4gICAgICB0aGlzLl9oZWFydGJlYXRJbnRlcnZhbEhhbmRsZSA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgX2NsZWFySGVhcnRiZWF0VGltZW91dFRpbWVyKCkge1xuICAgIGlmICh0aGlzLl9oZWFydGJlYXRUaW1lb3V0SGFuZGxlKSB7XG4gICAgICBNZXRlb3IuY2xlYXJUaW1lb3V0KHRoaXMuX2hlYXJ0YmVhdFRpbWVvdXRIYW5kbGUpO1xuICAgICAgdGhpcy5faGVhcnRiZWF0VGltZW91dEhhbmRsZSA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgLy8gVGhlIGhlYXJ0YmVhdCBpbnRlcnZhbCB0aW1lciBpcyBmaXJlZCB3aGVuIHdlIHNob3VsZCBzZW5kIGEgcGluZy5cbiAgX2hlYXJ0YmVhdEludGVydmFsRmlyZWQoKSB7XG4gICAgLy8gZG9uJ3Qgc2VuZCBwaW5nIGlmIHdlJ3ZlIHNlZW4gYSBwYWNrZXQgc2luY2Ugd2UgbGFzdCBjaGVja2VkLFxuICAgIC8vICpvciogaWYgd2UgaGF2ZSBhbHJlYWR5IHNlbnQgYSBwaW5nIGFuZCBhcmUgYXdhaXRpbmcgYSB0aW1lb3V0LlxuICAgIC8vIFRoYXQgc2hvdWxkbid0IGhhcHBlbiwgYnV0IGl0J3MgcG9zc2libGUgaWZcbiAgICAvLyBgdGhpcy5oZWFydGJlYXRJbnRlcnZhbGAgaXMgc21hbGxlciB0aGFuXG4gICAgLy8gYHRoaXMuaGVhcnRiZWF0VGltZW91dGAuXG4gICAgaWYgKCEgdGhpcy5fc2VlblBhY2tldCAmJiAhIHRoaXMuX2hlYXJ0YmVhdFRpbWVvdXRIYW5kbGUpIHtcbiAgICAgIHRoaXMuX3NlbmRQaW5nKCk7XG4gICAgICAvLyBTZXQgdXAgdGltZW91dCwgaW4gY2FzZSBhIHBvbmcgZG9lc24ndCBhcnJpdmUgaW4gdGltZS5cbiAgICAgIHRoaXMuX3N0YXJ0SGVhcnRiZWF0VGltZW91dFRpbWVyKCk7XG4gICAgfVxuICAgIHRoaXMuX3NlZW5QYWNrZXQgPSBmYWxzZTtcbiAgfVxuXG4gIC8vIFRoZSBoZWFydGJlYXQgdGltZW91dCB0aW1lciBpcyBmaXJlZCB3aGVuIHdlIHNlbnQgYSBwaW5nLCBidXQgd2VcbiAgLy8gdGltZWQgb3V0IHdhaXRpbmcgZm9yIHRoZSBwb25nLlxuICBfaGVhcnRiZWF0VGltZW91dEZpcmVkKCkge1xuICAgIHRoaXMuX2hlYXJ0YmVhdFRpbWVvdXRIYW5kbGUgPSBudWxsO1xuICAgIHRoaXMuX29uVGltZW91dCgpO1xuICB9XG5cbiAgbWVzc2FnZVJlY2VpdmVkKCkge1xuICAgIC8vIFRlbGwgcGVyaW9kaWMgY2hlY2tpbiB0aGF0IHdlIGhhdmUgc2VlbiBhIHBhY2tldCwgYW5kIHRodXMgaXRcbiAgICAvLyBkb2VzIG5vdCBuZWVkIHRvIHNlbmQgYSBwaW5nIHRoaXMgY3ljbGUuXG4gICAgdGhpcy5fc2VlblBhY2tldCA9IHRydWU7XG4gICAgLy8gSWYgd2Ugd2VyZSB3YWl0aW5nIGZvciBhIHBvbmcsIHdlIGdvdCBpdC5cbiAgICBpZiAodGhpcy5faGVhcnRiZWF0VGltZW91dEhhbmRsZSkge1xuICAgICAgdGhpcy5fY2xlYXJIZWFydGJlYXRUaW1lb3V0VGltZXIoKTtcbiAgICB9XG4gIH1cbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0IGNvbnN0IGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5leHBvcnQgY29uc3Qgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5cbmV4cG9ydCBmdW5jdGlvbiBrZXlzKG9iaikge1xuICByZXR1cm4gT2JqZWN0LmtleXMoT2JqZWN0KG9iaikpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNFbXB0eShvYmopIHtcbiAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBpZiAoQXJyYXkuaXNBcnJheShvYmopIHx8XG4gICAgICB0eXBlb2Ygb2JqID09PSBcInN0cmluZ1wiKSB7XG4gICAgcmV0dXJuIG9iai5sZW5ndGggPT09IDA7XG4gIH1cblxuICBmb3IgKGNvbnN0IGtleSBpbiBvYmopIHtcbiAgICBpZiAoaGFzT3duLmNhbGwob2JqLCBrZXkpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsYXN0KGFycmF5LCBuLCBndWFyZCkge1xuICBpZiAoYXJyYXkgPT0gbnVsbCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICgobiA9PSBudWxsKSB8fCBndWFyZCkge1xuICAgIHJldHVybiBhcnJheVthcnJheS5sZW5ndGggLSAxXTtcbiAgfVxuXG4gIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCBNYXRoLm1heChhcnJheS5sZW5ndGggLSBuLCAwKSk7XG59XG5cbkREUENvbW1vbi5TVVBQT1JURURfRERQX1ZFUlNJT05TID0gWyAnMScsICdwcmUyJywgJ3ByZTEnIF07XG5cbkREUENvbW1vbi5wYXJzZUREUCA9IGZ1bmN0aW9uIChzdHJpbmdNZXNzYWdlKSB7XG4gIHRyeSB7XG4gICAgdmFyIG1zZyA9IEpTT04ucGFyc2Uoc3RyaW5nTWVzc2FnZSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBNZXRlb3IuX2RlYnVnKFwiRGlzY2FyZGluZyBtZXNzYWdlIHdpdGggaW52YWxpZCBKU09OXCIsIHN0cmluZ01lc3NhZ2UpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIC8vIEREUCBtZXNzYWdlcyBtdXN0IGJlIG9iamVjdHMuXG4gIGlmIChtc2cgPT09IG51bGwgfHwgdHlwZW9mIG1zZyAhPT0gJ29iamVjdCcpIHtcbiAgICBNZXRlb3IuX2RlYnVnKFwiRGlzY2FyZGluZyBub24tb2JqZWN0IEREUCBtZXNzYWdlXCIsIHN0cmluZ01lc3NhZ2UpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gbWFzc2FnZSBtc2cgdG8gZ2V0IGl0IGludG8gXCJhYnN0cmFjdCBkZHBcIiByYXRoZXIgdGhhbiBcIndpcmUgZGRwXCIgZm9ybWF0LlxuXG4gIC8vIHN3aXRjaCBiZXR3ZWVuIFwiY2xlYXJlZFwiIHJlcCBvZiB1bnNldHRpbmcgZmllbGRzIGFuZCBcInVuZGVmaW5lZFwiXG4gIC8vIHJlcCBvZiBzYW1lXG4gIGlmIChoYXNPd24uY2FsbChtc2csICdjbGVhcmVkJykpIHtcbiAgICBpZiAoISBoYXNPd24uY2FsbChtc2csICdmaWVsZHMnKSkge1xuICAgICAgbXNnLmZpZWxkcyA9IHt9O1xuICAgIH1cbiAgICBtc2cuY2xlYXJlZC5mb3JFYWNoKGNsZWFyS2V5ID0+IHtcbiAgICAgIG1zZy5maWVsZHNbY2xlYXJLZXldID0gdW5kZWZpbmVkO1xuICAgIH0pO1xuICAgIGRlbGV0ZSBtc2cuY2xlYXJlZDtcbiAgfVxuXG4gIFsnZmllbGRzJywgJ3BhcmFtcycsICdyZXN1bHQnXS5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICBpZiAoaGFzT3duLmNhbGwobXNnLCBmaWVsZCkpIHtcbiAgICAgIG1zZ1tmaWVsZF0gPSBFSlNPTi5fYWRqdXN0VHlwZXNGcm9tSlNPTlZhbHVlKG1zZ1tmaWVsZF0pO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIG1zZztcbn07XG5cbkREUENvbW1vbi5zdHJpbmdpZnlERFAgPSBmdW5jdGlvbiAobXNnKSB7XG4gIGNvbnN0IGNvcHkgPSBFSlNPTi5jbG9uZShtc2cpO1xuXG4gIC8vIHN3aXp6bGUgJ2NoYW5nZWQnIG1lc3NhZ2VzIGZyb20gJ2ZpZWxkcyB1bmRlZmluZWQnIHJlcCB0byAnZmllbGRzXG4gIC8vIGFuZCBjbGVhcmVkJyByZXBcbiAgaWYgKGhhc093bi5jYWxsKG1zZywgJ2ZpZWxkcycpKSB7XG4gICAgY29uc3QgY2xlYXJlZCA9IFtdO1xuXG4gICAgT2JqZWN0LmtleXMobXNnLmZpZWxkcykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBtc2cuZmllbGRzW2tleV07XG5cbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgY2xlYXJlZC5wdXNoKGtleSk7XG4gICAgICAgIGRlbGV0ZSBjb3B5LmZpZWxkc1trZXldO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKCEgaXNFbXB0eShjbGVhcmVkKSkge1xuICAgICAgY29weS5jbGVhcmVkID0gY2xlYXJlZDtcbiAgICB9XG5cbiAgICBpZiAoaXNFbXB0eShjb3B5LmZpZWxkcykpIHtcbiAgICAgIGRlbGV0ZSBjb3B5LmZpZWxkcztcbiAgICB9XG4gIH1cblxuICAvLyBhZGp1c3QgdHlwZXMgdG8gYmFzaWNcbiAgWydmaWVsZHMnLCAncGFyYW1zJywgJ3Jlc3VsdCddLmZvckVhY2goZmllbGQgPT4ge1xuICAgIGlmIChoYXNPd24uY2FsbChjb3B5LCBmaWVsZCkpIHtcbiAgICAgIGNvcHlbZmllbGRdID0gRUpTT04uX2FkanVzdFR5cGVzVG9KU09OVmFsdWUoY29weVtmaWVsZF0pO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKG1zZy5pZCAmJiB0eXBlb2YgbXNnLmlkICE9PSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk1lc3NhZ2UgaWQgaXMgbm90IGEgc3RyaW5nXCIpO1xuICB9XG5cbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGNvcHkpO1xufTtcbiIsIi8vIEluc3RhbmNlIG5hbWUgaXMgdGhpcyBiZWNhdXNlIGl0IGlzIHVzdWFsbHkgcmVmZXJyZWQgdG8gYXMgdGhpcyBpbnNpZGUgYVxuLy8gbWV0aG9kIGRlZmluaXRpb25cbi8qKlxuICogQHN1bW1hcnkgVGhlIHN0YXRlIGZvciBhIHNpbmdsZSBpbnZvY2F0aW9uIG9mIGEgbWV0aG9kLCByZWZlcmVuY2VkIGJ5IHRoaXNcbiAqIGluc2lkZSBhIG1ldGhvZCBkZWZpbml0aW9uLlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBpbnN0YW5jZU5hbWUgdGhpc1xuICogQHNob3dJbnN0YW5jZU5hbWUgdHJ1ZVxuICovXG5ERFBDb21tb24uTWV0aG9kSW52b2NhdGlvbiA9IGNsYXNzIE1ldGhvZEludm9jYXRpb24ge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgLy8gdHJ1ZSBpZiB3ZSdyZSBydW5uaW5nIG5vdCB0aGUgYWN0dWFsIG1ldGhvZCwgYnV0IGEgc3R1YiAodGhhdCBpcyxcbiAgICAvLyBpZiB3ZSdyZSBvbiBhIGNsaWVudCAod2hpY2ggbWF5IGJlIGEgYnJvd3Nlciwgb3IgaW4gdGhlIGZ1dHVyZSBhXG4gICAgLy8gc2VydmVyIGNvbm5lY3RpbmcgdG8gYW5vdGhlciBzZXJ2ZXIpIGFuZCBwcmVzZW50bHkgcnVubmluZyBhXG4gICAgLy8gc2ltdWxhdGlvbiBvZiBhIHNlcnZlci1zaWRlIG1ldGhvZCBmb3IgbGF0ZW5jeSBjb21wZW5zYXRpb25cbiAgICAvLyBwdXJwb3NlcykuIG5vdCBjdXJyZW50bHkgdHJ1ZSBleGNlcHQgaW4gYSBjbGllbnQgc3VjaCBhcyBhIGJyb3dzZXIsXG4gICAgLy8gc2luY2UgdGhlcmUncyB1c3VhbGx5IG5vIHBvaW50IGluIHJ1bm5pbmcgc3R1YnMgdW5sZXNzIHlvdSBoYXZlIGFcbiAgICAvLyB6ZXJvLWxhdGVuY3kgY29ubmVjdGlvbiB0byB0aGUgdXNlci5cblxuICAgIC8qKlxuICAgICAqIEBzdW1tYXJ5IFRoZSBuYW1lIGdpdmVuIHRvIHRoZSBtZXRob2QuXG4gICAgICogQGxvY3VzIEFueXdoZXJlXG4gICAgICogQG5hbWUgIG5hbWVcbiAgICAgKiBAbWVtYmVyT2YgRERQQ29tbW9uLk1ldGhvZEludm9jYXRpb25cbiAgICAgKiBAaW5zdGFuY2VcbiAgICAgKiBAdHlwZSB7U3RyaW5nfVxuICAgICAqL1xuICAgIHRoaXMubmFtZSA9IG9wdGlvbnMubmFtZTtcblxuICAgIC8qKlxuICAgICAqIEBzdW1tYXJ5IEFjY2VzcyBpbnNpZGUgYSBtZXRob2QgaW52b2NhdGlvbi4gIEJvb2xlYW4gdmFsdWUsIHRydWUgaWYgdGhpcyBpbnZvY2F0aW9uIGlzIGEgc3R1Yi5cbiAgICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICAgKiBAbmFtZSAgaXNTaW11bGF0aW9uXG4gICAgICogQG1lbWJlck9mIEREUENvbW1vbi5NZXRob2RJbnZvY2F0aW9uXG4gICAgICogQGluc3RhbmNlXG4gICAgICogQHR5cGUge0Jvb2xlYW59XG4gICAgICovXG4gICAgdGhpcy5pc1NpbXVsYXRpb24gPSBvcHRpb25zLmlzU2ltdWxhdGlvbjtcblxuICAgIC8vIGNhbGwgdGhpcyBmdW5jdGlvbiB0byBhbGxvdyBvdGhlciBtZXRob2QgaW52b2NhdGlvbnMgKGZyb20gdGhlXG4gICAgLy8gc2FtZSBjbGllbnQpIHRvIGNvbnRpbnVlIHJ1bm5pbmcgd2l0aG91dCB3YWl0aW5nIGZvciB0aGlzIG9uZSB0b1xuICAgIC8vIGNvbXBsZXRlLlxuICAgIHRoaXMuX3VuYmxvY2sgPSBvcHRpb25zLnVuYmxvY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgdGhpcy5fY2FsbGVkVW5ibG9jayA9IGZhbHNlO1xuXG4gICAgLy8gdXNlZCB0byBrbm93IHdoZW4gdGhlIGZ1bmN0aW9uIGFwcGx5IHdhcyBjYWxsZWQgYnkgY2FsbEFzeW5jXG4gICAgdGhpcy5faXNGcm9tQ2FsbEFzeW5jID0gb3B0aW9ucy5pc0Zyb21DYWxsQXN5bmM7XG5cbiAgICAvLyBjdXJyZW50IHVzZXIgaWRcblxuICAgIC8qKlxuICAgICAqIEBzdW1tYXJ5IFRoZSBpZCBvZiB0aGUgdXNlciB0aGF0IG1hZGUgdGhpcyBtZXRob2QgY2FsbCwgb3IgYG51bGxgIGlmIG5vIHVzZXIgd2FzIGxvZ2dlZCBpbi5cbiAgICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICAgKiBAbmFtZSAgdXNlcklkXG4gICAgICogQG1lbWJlck9mIEREUENvbW1vbi5NZXRob2RJbnZvY2F0aW9uXG4gICAgICogQGluc3RhbmNlXG4gICAgICovXG4gICAgdGhpcy51c2VySWQgPSBvcHRpb25zLnVzZXJJZDtcblxuICAgIC8vIHNldHMgY3VycmVudCB1c2VyIGlkIGluIGFsbCBhcHByb3ByaWF0ZSBzZXJ2ZXIgY29udGV4dHMgYW5kXG4gICAgLy8gcmVydW5zIHN1YnNjcmlwdGlvbnNcbiAgICB0aGlzLl9zZXRVc2VySWQgPSBvcHRpb25zLnNldFVzZXJJZCB8fCBmdW5jdGlvbiAoKSB7fTtcblxuICAgIC8vIE9uIHRoZSBzZXJ2ZXIsIHRoZSBjb25uZWN0aW9uIHRoaXMgbWV0aG9kIGNhbGwgY2FtZSBpbiBvbi5cblxuICAgIC8qKlxuICAgICAqIEBzdW1tYXJ5IEFjY2VzcyBpbnNpZGUgYSBtZXRob2QgaW52b2NhdGlvbi4gVGhlIFtjb25uZWN0aW9uXSgjbWV0ZW9yX29uY29ubmVjdGlvbikgdGhhdCB0aGlzIG1ldGhvZCB3YXMgcmVjZWl2ZWQgb24uIGBudWxsYCBpZiB0aGUgbWV0aG9kIGlzIG5vdCBhc3NvY2lhdGVkIHdpdGggYSBjb25uZWN0aW9uLCBlZy4gYSBzZXJ2ZXIgaW5pdGlhdGVkIG1ldGhvZCBjYWxsLiBDYWxscyB0byBtZXRob2RzIG1hZGUgZnJvbSBhIHNlcnZlciBtZXRob2Qgd2hpY2ggd2FzIGluIHR1cm4gaW5pdGlhdGVkIGZyb20gdGhlIGNsaWVudCBzaGFyZSB0aGUgc2FtZSBgY29ubmVjdGlvbmAuXG4gICAgICogQGxvY3VzIFNlcnZlclxuICAgICAqIEBuYW1lICBjb25uZWN0aW9uXG4gICAgICogQG1lbWJlck9mIEREUENvbW1vbi5NZXRob2RJbnZvY2F0aW9uXG4gICAgICogQGluc3RhbmNlXG4gICAgICovXG4gICAgdGhpcy5jb25uZWN0aW9uID0gb3B0aW9ucy5jb25uZWN0aW9uO1xuXG4gICAgLy8gVGhlIHNlZWQgZm9yIHJhbmRvbVN0cmVhbSB2YWx1ZSBnZW5lcmF0aW9uXG4gICAgdGhpcy5yYW5kb21TZWVkID0gb3B0aW9ucy5yYW5kb21TZWVkO1xuXG4gICAgLy8gVGhpcyBpcyBzZXQgYnkgUmFuZG9tU3RyZWFtLmdldDsgYW5kIGhvbGRzIHRoZSByYW5kb20gc3RyZWFtIHN0YXRlXG4gICAgdGhpcy5yYW5kb21TdHJlYW0gPSBudWxsO1xuXG4gICAgdGhpcy5mZW5jZSA9IG9wdGlvbnMuZmVuY2U7XG4gIH1cblxuICAvKipcbiAgICogQHN1bW1hcnkgQ2FsbCBpbnNpZGUgYSBtZXRob2QgaW52b2NhdGlvbi4gIEFsbG93IHN1YnNlcXVlbnQgbWV0aG9kIGZyb20gdGhpcyBjbGllbnQgdG8gYmVnaW4gcnVubmluZyBpbiBhIG5ldyBmaWJlci5cbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRERQQ29tbW9uLk1ldGhvZEludm9jYXRpb25cbiAgICogQGluc3RhbmNlXG4gICAqL1xuICB1bmJsb2NrKCkge1xuICAgIHRoaXMuX2NhbGxlZFVuYmxvY2sgPSB0cnVlO1xuICAgIHRoaXMuX3VuYmxvY2soKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBTZXQgdGhlIGxvZ2dlZCBpbiB1c2VyLlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBERFBDb21tb24uTWV0aG9kSW52b2NhdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtTdHJpbmcgfCBudWxsfSB1c2VySWQgVGhlIHZhbHVlIHRoYXQgc2hvdWxkIGJlIHJldHVybmVkIGJ5IGB1c2VySWRgIG9uIHRoaXMgY29ubmVjdGlvbi5cbiAgICovXG4gIGFzeW5jIHNldFVzZXJJZCh1c2VySWQpIHtcbiAgICBpZiAodGhpcy5fY2FsbGVkVW5ibG9jaykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgY2FsbCBzZXRVc2VySWQgaW4gYSBtZXRob2QgYWZ0ZXIgY2FsbGluZyB1bmJsb2NrXCIpO1xuICAgIH1cbiAgICB0aGlzLnVzZXJJZCA9IHVzZXJJZDtcbiAgICBhd2FpdCB0aGlzLl9zZXRVc2VySWQodXNlcklkKTtcbiAgfVxufTtcbiIsIi8vIFJhbmRvbVN0cmVhbSBhbGxvd3MgZm9yIGdlbmVyYXRpb24gb2YgcHNldWRvLXJhbmRvbSB2YWx1ZXMsIGZyb20gYSBzZWVkLlxuLy9cbi8vIFdlIHVzZSB0aGlzIGZvciBjb25zaXN0ZW50ICdyYW5kb20nIG51bWJlcnMgYWNyb3NzIHRoZSBjbGllbnQgYW5kIHNlcnZlci5cbi8vIFdlIHdhbnQgdG8gZ2VuZXJhdGUgcHJvYmFibHktdW5pcXVlIElEcyBvbiB0aGUgY2xpZW50LCBhbmQgd2UgaWRlYWxseSB3YW50XG4vLyB0aGUgc2VydmVyIHRvIGdlbmVyYXRlIHRoZSBzYW1lIElEcyB3aGVuIGl0IGV4ZWN1dGVzIHRoZSBtZXRob2QuXG4vL1xuLy8gRm9yIGdlbmVyYXRlZCB2YWx1ZXMgdG8gYmUgdGhlIHNhbWUsIHdlIG11c3Qgc2VlZCBvdXJzZWx2ZXMgdGhlIHNhbWUgd2F5LFxuLy8gYW5kIHdlIG11c3Qga2VlcCB0cmFjayBvZiB0aGUgY3VycmVudCBzdGF0ZSBvZiBvdXIgcHNldWRvLXJhbmRvbSBnZW5lcmF0b3JzLlxuLy8gV2UgY2FsbCB0aGlzIHN0YXRlIHRoZSBzY29wZS4gQnkgZGVmYXVsdCwgd2UgdXNlIHRoZSBjdXJyZW50IEREUCBtZXRob2Rcbi8vIGludm9jYXRpb24gYXMgb3VyIHNjb3BlLiAgRERQIG5vdyBhbGxvd3MgdGhlIGNsaWVudCB0byBzcGVjaWZ5IGEgcmFuZG9tU2VlZC5cbi8vIElmIGEgcmFuZG9tU2VlZCBpcyBwcm92aWRlZCBpdCB3aWxsIGJlIHVzZWQgdG8gc2VlZCBvdXIgcmFuZG9tIHNlcXVlbmNlcy5cbi8vIEluIHRoaXMgd2F5LCBjbGllbnQgYW5kIHNlcnZlciBtZXRob2QgY2FsbHMgd2lsbCBnZW5lcmF0ZSB0aGUgc2FtZSB2YWx1ZXMuXG4vL1xuLy8gV2UgZXhwb3NlIG11bHRpcGxlIG5hbWVkIHN0cmVhbXM7IGVhY2ggc3RyZWFtIGlzIGluZGVwZW5kZW50XG4vLyBhbmQgaXMgc2VlZGVkIGRpZmZlcmVudGx5IChidXQgcHJlZGljdGFibHkgZnJvbSB0aGUgbmFtZSkuXG4vLyBCeSB1c2luZyBtdWx0aXBsZSBzdHJlYW1zLCB3ZSBzdXBwb3J0IHJlb3JkZXJpbmcgb2YgcmVxdWVzdHMsXG4vLyBhcyBsb25nIGFzIHRoZXkgb2NjdXIgb24gZGlmZmVyZW50IHN0cmVhbXMuXG4vL1xuLy8gQHBhcmFtIG9wdGlvbnMge09wdGlvbmFsIE9iamVjdH1cbi8vICAgc2VlZDogQXJyYXkgb3IgdmFsdWUgLSBTZWVkIHZhbHVlKHMpIGZvciB0aGUgZ2VuZXJhdG9yLlxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgIElmIGFuIGFycmF5LCB3aWxsIGJlIHVzZWQgYXMtaXNcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICBJZiBhIHZhbHVlLCB3aWxsIGJlIGNvbnZlcnRlZCB0byBhIHNpbmdsZS12YWx1ZSBhcnJheVxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgIElmIG9taXR0ZWQsIGEgcmFuZG9tIGFycmF5IHdpbGwgYmUgdXNlZCBhcyB0aGUgc2VlZC5cbkREUENvbW1vbi5SYW5kb21TdHJlYW0gPSBjbGFzcyBSYW5kb21TdHJlYW0ge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgdGhpcy5zZWVkID0gW10uY29uY2F0KG9wdGlvbnMuc2VlZCB8fCByYW5kb21Ub2tlbigpKTtcbiAgICB0aGlzLnNlcXVlbmNlcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIH1cblxuICAvLyBHZXQgYSByYW5kb20gc2VxdWVuY2Ugd2l0aCB0aGUgc3BlY2lmaWVkIG5hbWUsIGNyZWF0aW5nIGl0IGlmIGRvZXMgbm90IGV4aXN0LlxuICAvLyBOZXcgc2VxdWVuY2VzIGFyZSBzZWVkZWQgd2l0aCB0aGUgc2VlZCBjb25jYXRlbmF0ZWQgd2l0aCB0aGUgbmFtZS5cbiAgLy8gQnkgcGFzc2luZyBhIHNlZWQgaW50byBSYW5kb20uY3JlYXRlLCB3ZSB1c2UgdGhlIEFsZWEgZ2VuZXJhdG9yLlxuICBfc2VxdWVuY2UobmFtZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBzZXF1ZW5jZSA9IHNlbGYuc2VxdWVuY2VzW25hbWVdIHx8IG51bGw7XG4gICAgaWYgKHNlcXVlbmNlID09PSBudWxsKSB7XG4gICAgICB2YXIgc2VxdWVuY2VTZWVkID0gc2VsZi5zZWVkLmNvbmNhdChuYW1lKTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VxdWVuY2VTZWVkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2VxdWVuY2VTZWVkW2ldID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICBzZXF1ZW5jZVNlZWRbaV0gPSBzZXF1ZW5jZVNlZWRbaV0oKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc2VsZi5zZXF1ZW5jZXNbbmFtZV0gPSBzZXF1ZW5jZSA9IFJhbmRvbS5jcmVhdGVXaXRoU2VlZHMuYXBwbHkobnVsbCwgc2VxdWVuY2VTZWVkKTtcbiAgICB9XG4gICAgcmV0dXJuIHNlcXVlbmNlO1xuICB9XG59O1xuXG4vLyBSZXR1cm5zIGEgcmFuZG9tIHN0cmluZyBvZiBzdWZmaWNpZW50IGxlbmd0aCBmb3IgYSByYW5kb20gc2VlZC5cbi8vIFRoaXMgaXMgYSBwbGFjZWhvbGRlciBmdW5jdGlvbjsgYSBzaW1pbGFyIGZ1bmN0aW9uIGlzIHBsYW5uZWRcbi8vIGZvciBSYW5kb20gaXRzZWxmOyB3aGVuIHRoYXQgaXMgYWRkZWQgd2Ugc2hvdWxkIHJlbW92ZSB0aGlzIGZ1bmN0aW9uLFxuLy8gYW5kIGNhbGwgUmFuZG9tJ3MgcmFuZG9tVG9rZW4gaW5zdGVhZC5cbmZ1bmN0aW9uIHJhbmRvbVRva2VuKCkge1xuICByZXR1cm4gUmFuZG9tLmhleFN0cmluZygyMCk7XG59O1xuXG4vLyBSZXR1cm5zIHRoZSByYW5kb20gc3RyZWFtIHdpdGggdGhlIHNwZWNpZmllZCBuYW1lLCBpbiB0aGUgc3BlY2lmaWVkXG4vLyBzY29wZS4gSWYgYSBzY29wZSBpcyBwYXNzZWQsIHRoZW4gd2UgdXNlIHRoYXQgdG8gc2VlZCBhIChub3Rcbi8vIGNyeXB0b2dyYXBoaWNhbGx5IHNlY3VyZSkgUFJORyB1c2luZyB0aGUgZmFzdCBBbGVhIGFsZ29yaXRobS4gIElmXG4vLyBzY29wZSBpcyBudWxsIChvciBvdGhlcndpc2UgZmFsc2V5KSB0aGVuIHdlIHVzZSBhIGdlbmVyYXRlZCBzZWVkLlxuLy9cbi8vIEhvd2V2ZXIsIHNjb3BlIHdpbGwgbm9ybWFsbHkgYmUgdGhlIGN1cnJlbnQgRERQIG1ldGhvZCBpbnZvY2F0aW9uLFxuLy8gc28gd2UnbGwgdXNlIHRoZSBzdHJlYW0gd2l0aCB0aGUgc3BlY2lmaWVkIG5hbWUsIGFuZCB3ZSBzaG91bGQgZ2V0XG4vLyBjb25zaXN0ZW50IHZhbHVlcyBvbiB0aGUgY2xpZW50IGFuZCBzZXJ2ZXIgc2lkZXMgb2YgYSBtZXRob2QgY2FsbC5cbkREUENvbW1vbi5SYW5kb21TdHJlYW0uZ2V0ID0gZnVuY3Rpb24gKHNjb3BlLCBuYW1lKSB7XG4gIGlmICghbmFtZSkge1xuICAgIG5hbWUgPSBcImRlZmF1bHRcIjtcbiAgfVxuICBpZiAoIXNjb3BlKSB7XG4gICAgLy8gVGhlcmUgd2FzIG5vIHNjb3BlIHBhc3NlZCBpbjsgdGhlIHNlcXVlbmNlIHdvbid0IGFjdHVhbGx5IGJlXG4gICAgLy8gcmVwcm9kdWNpYmxlLiBidXQgbWFrZSBpdCBmYXN0IChhbmQgbm90IGNyeXB0b2dyYXBoaWNhbGx5XG4gICAgLy8gc2VjdXJlKSBhbnl3YXlzLCBzbyB0aGF0IHRoZSBiZWhhdmlvciBpcyBzaW1pbGFyIHRvIHdoYXQgeW91J2RcbiAgICAvLyBnZXQgYnkgcGFzc2luZyBpbiBhIHNjb3BlLlxuICAgIHJldHVybiBSYW5kb20uaW5zZWN1cmU7XG4gIH1cbiAgdmFyIHJhbmRvbVN0cmVhbSA9IHNjb3BlLnJhbmRvbVN0cmVhbTtcbiAgaWYgKCFyYW5kb21TdHJlYW0pIHtcbiAgICBzY29wZS5yYW5kb21TdHJlYW0gPSByYW5kb21TdHJlYW0gPSBuZXcgRERQQ29tbW9uLlJhbmRvbVN0cmVhbSh7XG4gICAgICBzZWVkOiBzY29wZS5yYW5kb21TZWVkXG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIHJhbmRvbVN0cmVhbS5fc2VxdWVuY2UobmFtZSk7XG59O1xuXG4vLyBDcmVhdGVzIGEgcmFuZG9tU2VlZCBmb3IgcGFzc2luZyB0byBhIG1ldGhvZCBjYWxsLlxuLy8gTm90ZSB0aGF0IHdlIHRha2UgZW5jbG9zaW5nIGFzIGFuIGFyZ3VtZW50LFxuLy8gdGhvdWdoIHdlIGV4cGVjdCBpdCB0byBiZSBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uLmdldCgpXG4vLyBIb3dldmVyLCB3ZSBvZnRlbiBldmFsdWF0ZSBtYWtlUnBjU2VlZCBsYXppbHksIGFuZCB0aHVzIHRoZSByZWxldmFudFxuLy8gaW52b2NhdGlvbiBtYXkgbm90IGJlIHRoZSBvbmUgY3VycmVudGx5IGluIHNjb3BlLlxuLy8gSWYgZW5jbG9zaW5nIGlzIG51bGwsIHdlJ2xsIHVzZSBSYW5kb20gYW5kIHZhbHVlcyB3b24ndCBiZSByZXBlYXRhYmxlLlxuRERQQ29tbW9uLm1ha2VScGNTZWVkID0gZnVuY3Rpb24gKGVuY2xvc2luZywgbWV0aG9kTmFtZSkge1xuICB2YXIgc3RyZWFtID0gRERQQ29tbW9uLlJhbmRvbVN0cmVhbS5nZXQoZW5jbG9zaW5nLCAnL3JwYy8nICsgbWV0aG9kTmFtZSk7XG4gIHJldHVybiBzdHJlYW0uaGV4U3RyaW5nKDIwKTtcbn07XG4iXX0=
