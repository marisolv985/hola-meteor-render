Package["core-runtime"].queue("mongo",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var NpmModuleMongodb = Package['npm-mongo'].NpmModuleMongodb;
var NpmModuleMongodbVersion = Package['npm-mongo'].NpmModuleMongodbVersion;
var AllowDeny = Package['allow-deny'].AllowDeny;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;
var DDP = Package['ddp-client'].DDP;
var DDPServer = Package['ddp-server'].DDPServer;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var DiffSequence = Package['diff-sequence'].DiffSequence;
var MongoID = Package['mongo-id'].MongoID;
var check = Package.check.check;
var Match = Package.check.Match;
var ECMAScript = Package.ecmascript.ECMAScript;
var Log = Package.logging.Log;
var Decimal = Package['mongo-decimal'].Decimal;
var MaxHeap = Package['binary-heap'].MaxHeap;
var MinHeap = Package['binary-heap'].MinHeap;
var MinMaxHeap = Package['binary-heap'].MinMaxHeap;
var Hook = Package['callback-hook'].Hook;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var MongoInternals, callback, Mongo, ObserveMultiplexer;

var require = meteorInstall({"node_modules":{"meteor":{"mongo":{"mongo_driver.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/mongo_driver.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({listenAll:()=>listenAll,forEachTrigger:()=>forEachTrigger},true);let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);let OplogHandle;module.link('./oplog_tailing',{OplogHandle(v){OplogHandle=v}},1);let MongoConnection;module.link('./mongo_connection',{MongoConnection(v){MongoConnection=v}},2);let OplogObserveDriver;module.link('./oplog_observe_driver',{OplogObserveDriver(v){OplogObserveDriver=v}},3);let MongoDB;module.link('./mongo_common',{MongoDB(v){MongoDB=v}},4);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();




MongoInternals = global.MongoInternals = {};
MongoInternals.__packageName = 'mongo';
MongoInternals.NpmModules = {
    mongodb: {
        version: NpmModuleMongodbVersion,
        module: MongoDB
    }
};
// Older version of what is now available via
// MongoInternals.NpmModules.mongodb.module.  It was never documented, but
// people do use it.
// XXX COMPAT WITH 1.0.3.2
MongoInternals.NpmModule = new Proxy(MongoDB, {
    get (target, propertyKey, receiver) {
        if (propertyKey === 'ObjectID') {
            Meteor.deprecate(`Accessing 'MongoInternals.NpmModule.ObjectID' directly is deprecated. ` + `Use 'MongoInternals.NpmModule.ObjectId' instead.`);
        }
        return Reflect.get(target, propertyKey, receiver);
    }
});
MongoInternals.OplogHandle = OplogHandle;
MongoInternals.Connection = MongoConnection;
MongoInternals.OplogObserveDriver = OplogObserveDriver;
// This is used to add or remove EJSON from the beginning of everything nested
// inside an EJSON custom type. It should only be called on pure JSON!
// Ensure that EJSON.clone keeps a Timestamp as a Timestamp (instead of just
// doing a structural clone).
// XXX how ok is this? what if there are multiple copies of MongoDB loaded?
MongoDB.Timestamp.prototype.clone = function() {
    // Timestamps should be immutable.
    return this;
};
// Listen for the invalidation messages that will trigger us to poll the
// database for changes. If this selector specifies specific IDs, specify them
// here, so that updates to different specific IDs don't cause us to poll.
// listenCallback is the same kind of (notification, complete) callback passed
// to InvalidationCrossbar.listen.
const listenAll = function(cursorDescription, listenCallback) {
    return _async_to_generator(function*() {
        const listeners = [];
        yield forEachTrigger(cursorDescription, function(trigger) {
            listeners.push(DDPServer._InvalidationCrossbar.listen(trigger, listenCallback));
        });
        return {
            stop: function() {
                listeners.forEach(function(listener) {
                    listener.stop();
                });
            }
        };
    })();
};
const forEachTrigger = function(cursorDescription, triggerCallback) {
    return _async_to_generator(function*() {
        const key = {
            collection: cursorDescription.collectionName
        };
        const specificIds = LocalCollection._idsMatchedBySelector(cursorDescription.selector);
        if (specificIds) {
            for (const id of specificIds){
                yield triggerCallback(Object.assign({
                    id: id
                }, key));
            }
            yield triggerCallback(Object.assign({
                dropCollection: true,
                id: null
            }, key));
        } else {
            yield triggerCallback(key);
        }
        // Everyone cares about the database being dropped.
        yield triggerCallback({
            dropDatabase: true
        });
    })();
};
// XXX We probably need to find a better way to expose this. Right now
// it's only used by tests, but in fact you need it in normal
// operation to interact with capped collections.
MongoInternals.MongoTimestamp = MongoDB.Timestamp;
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"oplog_tailing.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/oplog_tailing.ts                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({OplogHandle:()=>OplogHandle,idForOp:()=>idForOp});module.export({OPLOG_COLLECTION:()=>OPLOG_COLLECTION},true);let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);let _define_property;module.link("@swc/helpers/_/_define_property",{_(v){_define_property=v}},1);let isEmpty;module.link('lodash.isempty',{default(v){isEmpty=v}},2);let Meteor;module.link('meteor/meteor',{Meteor(v){Meteor=v}},3);let CursorDescription;module.link('./cursor_description',{CursorDescription(v){CursorDescription=v}},4);let MongoConnection;module.link('./mongo_connection',{MongoConnection(v){MongoConnection=v}},5);let NpmModuleMongodb;module.link("meteor/npm-mongo",{NpmModuleMongodb(v){NpmModuleMongodb=v}},6);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();






const { Long } = NpmModuleMongodb;
const OPLOG_COLLECTION = 'oplog.rs';
let TOO_FAR_BEHIND = +(process.env.METEOR_OPLOG_TOO_FAR_BEHIND || 2000);
const TAIL_TIMEOUT = +(process.env.METEOR_OPLOG_TAIL_TIMEOUT || 30000);
class OplogHandle {
    _getOplogSelector(lastProcessedTS) {
        var _this__oplogOptions_excludeCollections, _this__oplogOptions_includeCollections;
        const oplogCriteria = [
            {
                $or: [
                    {
                        op: {
                            $in: [
                                "i",
                                "u",
                                "d"
                            ]
                        }
                    },
                    {
                        op: "c",
                        "o.drop": {
                            $exists: true
                        }
                    },
                    {
                        op: "c",
                        "o.dropDatabase": 1
                    },
                    {
                        op: "c",
                        "o.applyOps": {
                            $exists: true
                        }
                    }
                ]
            }
        ];
        const nsRegex = new RegExp("^(?:" + [
            // @ts-ignore
            Meteor._escapeRegExp(this._dbName + "."),
            // @ts-ignore
            Meteor._escapeRegExp("admin.$cmd")
        ].join("|") + ")");
        if ((_this__oplogOptions_excludeCollections = this._oplogOptions.excludeCollections) === null || _this__oplogOptions_excludeCollections === void 0 ? void 0 : _this__oplogOptions_excludeCollections.length) {
            oplogCriteria.push({
                ns: {
                    $regex: nsRegex,
                    $nin: this._oplogOptions.excludeCollections.map((collName)=>`${this._dbName}.${collName}`)
                }
            });
        } else if ((_this__oplogOptions_includeCollections = this._oplogOptions.includeCollections) === null || _this__oplogOptions_includeCollections === void 0 ? void 0 : _this__oplogOptions_includeCollections.length) {
            oplogCriteria.push({
                $or: [
                    {
                        ns: /^admin\.\$cmd/
                    },
                    {
                        ns: {
                            $in: this._oplogOptions.includeCollections.map((collName)=>`${this._dbName}.${collName}`)
                        }
                    }
                ]
            });
        } else {
            oplogCriteria.push({
                ns: nsRegex
            });
        }
        if (lastProcessedTS) {
            oplogCriteria.push({
                ts: {
                    $gt: lastProcessedTS
                }
            });
        }
        return {
            $and: oplogCriteria
        };
    }
    stop() {
        return _async_to_generator(function*() {
            if (this._stopped) return;
            this._stopped = true;
            if (this._tailHandle) {
                yield this._tailHandle.stop();
            }
        }).call(this);
    }
    _onOplogEntry(trigger, callback) {
        return _async_to_generator(function*() {
            if (this._stopped) {
                throw new Error("Called onOplogEntry on stopped handle!");
            }
            yield this._readyPromise;
            const originalCallback = callback;
            /**
     * This depends on AsynchronousQueue tasks being wrapped in `bindEnvironment` too.
     *
     * @todo Check after we simplify the `bindEnvironment` implementation if we can remove the second wrap.
     */ callback = Meteor.bindEnvironment(function(notification) {
                originalCallback(notification);
            }, // @ts-ignore
            function(err) {
                Meteor._debug("Error in oplog callback", err);
            });
            const listenHandle = this._crossbar.listen(trigger, callback);
            return {
                stop: function() {
                    return _async_to_generator(function*() {
                        yield listenHandle.stop();
                    })();
                }
            };
        }).call(this);
    }
    onOplogEntry(trigger, callback) {
        return this._onOplogEntry(trigger, callback);
    }
    onSkippedEntries(callback) {
        if (this._stopped) {
            throw new Error("Called onSkippedEntries on stopped handle!");
        }
        return this._onSkippedEntriesHook.register(callback);
    }
    _waitUntilCaughtUp() {
        return _async_to_generator(function*() {
            if (this._stopped) {
                throw new Error("Called waitUntilCaughtUp on stopped handle!");
            }
            yield this._readyPromise;
            let lastEntry = null;
            while(!this._stopped){
                const oplogSelector = this._getOplogSelector();
                try {
                    lastEntry = yield this._oplogLastEntryConnection.findOneAsync(OPLOG_COLLECTION, oplogSelector, {
                        projection: {
                            ts: 1
                        },
                        sort: {
                            $natural: -1
                        }
                    });
                    break;
                } catch (e) {
                    Meteor._debug("Got exception while reading last entry", e);
                    // @ts-ignore
                    yield Meteor.sleep(100);
                }
            }
            if (this._stopped) return;
            if (!lastEntry) return;
            const ts = lastEntry.ts;
            if (!ts) {
                throw Error("oplog entry without ts: " + JSON.stringify(lastEntry));
            }
            if (this._lastProcessedTS && ts.lessThanOrEqual(this._lastProcessedTS)) {
                return;
            }
            let insertAfter = this._catchingUpResolvers.length;
            while(insertAfter - 1 > 0 && this._catchingUpResolvers[insertAfter - 1].ts.greaterThan(ts)){
                insertAfter--;
            }
            let promiseResolver = null;
            const promiseToAwait = new Promise((r)=>promiseResolver = r);
            clearTimeout(this._resolveTimeout);
            this._resolveTimeout = setTimeout(()=>{
                console.error("Meteor: oplog catching up took too long", {
                    ts
                });
            }, 10000);
            this._catchingUpResolvers.splice(insertAfter, 0, {
                ts,
                resolver: promiseResolver
            });
            yield promiseToAwait;
            clearTimeout(this._resolveTimeout);
        }).call(this);
    }
    waitUntilCaughtUp() {
        return _async_to_generator(function*() {
            return this._waitUntilCaughtUp();
        }).call(this);
    }
    _startTailing() {
        return _async_to_generator(function*() {
            const mongodbUri = require('mongodb-uri');
            if (mongodbUri.parse(this._oplogUrl).database !== 'local') {
                throw new Error("$MONGO_OPLOG_URL must be set to the 'local' database of a Mongo replica set");
            }
            this._oplogTailConnection = new MongoConnection(this._oplogUrl, {
                maxPoolSize: 1,
                minPoolSize: 1
            });
            this._oplogLastEntryConnection = new MongoConnection(this._oplogUrl, {
                maxPoolSize: 1,
                minPoolSize: 1
            });
            try {
                const isMasterDoc = yield this._oplogLastEntryConnection.db.admin().command({
                    ismaster: 1
                });
                if (!(isMasterDoc && isMasterDoc.setName)) {
                    throw new Error("$MONGO_OPLOG_URL must be set to the 'local' database of a Mongo replica set");
                }
                const lastOplogEntry = yield this._oplogLastEntryConnection.findOneAsync(OPLOG_COLLECTION, {}, {
                    sort: {
                        $natural: -1
                    },
                    projection: {
                        ts: 1
                    }
                });
                const oplogSelector = this._getOplogSelector(lastOplogEntry === null || lastOplogEntry === void 0 ? void 0 : lastOplogEntry.ts);
                if (lastOplogEntry) {
                    this._lastProcessedTS = lastOplogEntry.ts;
                }
                const cursorDescription = new CursorDescription(OPLOG_COLLECTION, oplogSelector, {
                    tailable: true
                });
                this._tailHandle = this._oplogTailConnection.tail(cursorDescription, (doc)=>{
                    this._entryQueue.push(doc);
                    this._maybeStartWorker();
                }, TAIL_TIMEOUT);
                this._readyPromiseResolver();
            } catch (error) {
                console.error('Error in _startTailing:', error);
                throw error;
            }
        }).call(this);
    }
    _maybeStartWorker() {
        if (this._workerPromise) return;
        this._workerActive = true;
        // Convert to a proper promise-based queue processor
        this._workerPromise = (()=>_async_to_generator(function*() {
                try {
                    while(!this._stopped && !this._entryQueue.isEmpty()){
                        // Are we too far behind? Just tell our observers that they need to
                        // repoll, and drop our queue.
                        if (this._entryQueue.length > TOO_FAR_BEHIND) {
                            const lastEntry = this._entryQueue.pop();
                            this._entryQueue.clear();
                            this._onSkippedEntriesHook.each((callback)=>{
                                callback();
                                return true;
                            });
                            // Free any waitUntilCaughtUp() calls that were waiting for us to
                            // pass something that we just skipped.
                            this._setLastProcessedTS(lastEntry.ts);
                            continue;
                        }
                        // Process next batch from the queue
                        const doc = this._entryQueue.shift();
                        try {
                            yield handleDoc(this, doc);
                            // Process any waiting fence callbacks
                            if (doc.ts) {
                                this._setLastProcessedTS(doc.ts);
                            }
                        } catch (e) {
                            // Keep processing queue even if one entry fails
                            console.error('Error processing oplog entry:', e);
                        }
                    }
                } finally{
                    this._workerPromise = null;
                    this._workerActive = false;
                }
            }).call(this))();
    }
    _setLastProcessedTS(ts) {
        this._lastProcessedTS = ts;
        while(!isEmpty(this._catchingUpResolvers) && this._catchingUpResolvers[0].ts.lessThanOrEqual(this._lastProcessedTS)){
            const sequencer = this._catchingUpResolvers.shift();
            sequencer.resolver();
        }
    }
    _defineTooFarBehind(value) {
        TOO_FAR_BEHIND = value;
    }
    _resetTooFarBehind() {
        TOO_FAR_BEHIND = +(process.env.METEOR_OPLOG_TOO_FAR_BEHIND || 2000);
    }
    constructor(oplogUrl, dbName){
        var _Meteor_settings_packages_mongo, _Meteor_settings_packages, _Meteor_settings, _Meteor_settings_packages_mongo1, _Meteor_settings_packages1, _Meteor_settings1;
        _define_property(this, "_oplogUrl", void 0);
        _define_property(this, "_dbName", void 0);
        _define_property(this, "_oplogLastEntryConnection", void 0);
        _define_property(this, "_oplogTailConnection", void 0);
        _define_property(this, "_oplogOptions", void 0);
        _define_property(this, "_stopped", void 0);
        _define_property(this, "_tailHandle", void 0);
        _define_property(this, "_readyPromiseResolver", void 0);
        _define_property(this, "_readyPromise", void 0);
        _define_property(this, "_crossbar", void 0);
        _define_property(this, "_catchingUpResolvers", void 0);
        _define_property(this, "_lastProcessedTS", void 0);
        _define_property(this, "_onSkippedEntriesHook", void 0);
        _define_property(this, "_startTrailingPromise", void 0);
        _define_property(this, "_resolveTimeout", void 0);
        _define_property(this, "_entryQueue", new Meteor._DoubleEndedQueue());
        _define_property(this, "_workerActive", false);
        _define_property(this, "_workerPromise", null);
        this._oplogUrl = oplogUrl;
        this._dbName = dbName;
        this._resolveTimeout = null;
        this._oplogLastEntryConnection = null;
        this._oplogTailConnection = null;
        this._stopped = false;
        this._tailHandle = null;
        this._readyPromiseResolver = null;
        this._readyPromise = new Promise((r)=>this._readyPromiseResolver = r);
        this._crossbar = new DDPServer._Crossbar({
            factPackage: "mongo-livedata",
            factName: "oplog-watchers"
        });
        const includeCollections = (_Meteor_settings = Meteor.settings) === null || _Meteor_settings === void 0 ? void 0 : (_Meteor_settings_packages = _Meteor_settings.packages) === null || _Meteor_settings_packages === void 0 ? void 0 : (_Meteor_settings_packages_mongo = _Meteor_settings_packages.mongo) === null || _Meteor_settings_packages_mongo === void 0 ? void 0 : _Meteor_settings_packages_mongo.oplogIncludeCollections;
        const excludeCollections = (_Meteor_settings1 = Meteor.settings) === null || _Meteor_settings1 === void 0 ? void 0 : (_Meteor_settings_packages1 = _Meteor_settings1.packages) === null || _Meteor_settings_packages1 === void 0 ? void 0 : (_Meteor_settings_packages_mongo1 = _Meteor_settings_packages1.mongo) === null || _Meteor_settings_packages_mongo1 === void 0 ? void 0 : _Meteor_settings_packages_mongo1.oplogExcludeCollections;
        if ((includeCollections === null || includeCollections === void 0 ? void 0 : includeCollections.length) && (excludeCollections === null || excludeCollections === void 0 ? void 0 : excludeCollections.length)) {
            throw new Error("Can't use both mongo oplog settings oplogIncludeCollections and oplogExcludeCollections at the same time.");
        }
        this._oplogOptions = {
            includeCollections,
            excludeCollections
        };
        this._catchingUpResolvers = [];
        this._lastProcessedTS = null;
        this._onSkippedEntriesHook = new Hook({
            debugPrintExceptions: "onSkippedEntries callback"
        });
        this._startTrailingPromise = this._startTailing();
    }
}
function idForOp(op) {
    if (op.op === 'd' || op.op === 'i') {
        return op.o._id;
    } else if (op.op === 'u') {
        return op.o2._id;
    } else if (op.op === 'c') {
        throw Error("Operator 'c' doesn't supply an object with id: " + JSON.stringify(op));
    } else {
        throw Error("Unknown op: " + JSON.stringify(op));
    }
}
function handleDoc(handle, doc) {
    return _async_to_generator(function*() {
        if (doc.ns === "admin.$cmd") {
            if (doc.o.applyOps) {
                // This was a successful transaction, so we need to apply the
                // operations that were involved.
                let nextTimestamp = doc.ts;
                for (const op of doc.o.applyOps){
                    // See https://github.com/meteor/meteor/issues/10420.
                    if (!op.ts) {
                        op.ts = nextTimestamp;
                        nextTimestamp = nextTimestamp.add(Long.ONE);
                    }
                    yield handleDoc(handle, op);
                }
                return;
            }
            throw new Error("Unknown command " + JSON.stringify(doc));
        }
        const trigger = {
            dropCollection: false,
            dropDatabase: false,
            op: doc
        };
        if (typeof doc.ns === "string" && doc.ns.startsWith(handle._dbName + ".")) {
            trigger.collection = doc.ns.slice(handle._dbName.length + 1);
        }
        // Is it a special command and the collection name is hidden
        // somewhere in operator?
        if (trigger.collection === "$cmd") {
            if (doc.o.dropDatabase) {
                delete trigger.collection;
                trigger.dropDatabase = true;
            } else if ("drop" in doc.o) {
                trigger.collection = doc.o.drop;
                trigger.dropCollection = true;
                trigger.id = null;
            } else if ("create" in doc.o && "idIndex" in doc.o) {
            // A collection got implicitly created within a transaction. There's
            // no need to do anything about it.
            } else {
                throw Error("Unknown command " + JSON.stringify(doc));
            }
        } else {
            // All other ops have an id.
            trigger.id = idForOp(doc);
        }
        yield handle._crossbar.fire(trigger);
        yield new Promise((resolve)=>setImmediate(resolve));
    })();
}
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"observe_multiplex.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/observe_multiplex.ts                                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({ObserveMultiplexer:()=>ObserveMultiplexer});let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);let _define_property;module.link("@swc/helpers/_/_define_property",{_(v){_define_property=v}},1);let _object_without_properties;module.link("@swc/helpers/_/_object_without_properties",{_(v){_object_without_properties=v}},2);let isEmpty;module.link("lodash.isempty",{default(v){isEmpty=v}},3);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();



/**
 * Allows multiple identical ObserveHandles to be driven by a single observe driver.
 *
 * This optimization ensures that multiple identical observations
 * don't result in duplicate database queries.
 */ class ObserveMultiplexer {
    addHandleAndSendInitialAdds(handle) {
        return this._addHandleAndSendInitialAdds(handle);
    }
    _addHandleAndSendInitialAdds(handle) {
        return _async_to_generator(function*() {
            ++this._addHandleTasksScheduledButNotPerformed;
            // @ts-ignore
            Package["facts-base"] && Package["facts-base"].Facts.incrementServerFact("mongo-livedata", "observe-handles", 1);
            yield this._queue.runTask(()=>_async_to_generator(function*() {
                    this._handles[handle._id] = handle;
                    yield this._sendAdds(handle);
                    --this._addHandleTasksScheduledButNotPerformed;
                }).call(this));
            yield this._readyPromise;
        }).call(this);
    }
    removeHandle(id) {
        return _async_to_generator(function*() {
            if (!this._ready()) throw new Error("Can't remove handles until the multiplex is ready");
            delete this._handles[id];
            // @ts-ignore
            Package["facts-base"] && Package["facts-base"].Facts.incrementServerFact("mongo-livedata", "observe-handles", -1);
            if (isEmpty(this._handles) && this._addHandleTasksScheduledButNotPerformed === 0) {
                yield this._stop();
            }
        }).call(this);
    }
    _stop() {
        return _async_to_generator(function*(options = {}) {
            if (!this._ready() && !options.fromQueryError) throw Error("surprising _stop: not ready");
            yield this._onStop();
            // @ts-ignore
            Package["facts-base"] && Package["facts-base"].Facts.incrementServerFact("mongo-livedata", "observe-multiplexers", -1);
            this._handles = null;
        }).apply(this, arguments);
    }
    ready() {
        return _async_to_generator(function*() {
            yield this._queue.queueTask(()=>{
                if (this._ready()) throw Error("can't make ObserveMultiplex ready twice!");
                if (!this._resolver) {
                    throw new Error("Missing resolver");
                }
                this._resolver();
                this._isReady = true;
            });
        }).call(this);
    }
    queryError(err) {
        return _async_to_generator(function*() {
            yield this._queue.runTask(()=>{
                if (this._ready()) throw Error("can't claim query has an error after it worked!");
                this._stop({
                    fromQueryError: true
                });
                throw err;
            });
        }).call(this);
    }
    onFlush(cb) {
        return _async_to_generator(function*() {
            yield this._queue.queueTask(()=>_async_to_generator(function*() {
                    if (!this._ready()) throw Error("only call onFlush on a multiplexer that will be ready");
                    yield cb();
                }).call(this));
        }).call(this);
    }
    callbackNames() {
        return this._ordered ? [
            "addedBefore",
            "changed",
            "movedBefore",
            "removed"
        ] : [
            "added",
            "changed",
            "removed"
        ];
    }
    _ready() {
        return !!this._isReady;
    }
    _applyCallback(callbackName, args) {
        this._queue.queueTask(()=>_async_to_generator(function*() {
                if (!this._handles) return;
                yield this._cache.applyChange[callbackName].apply(null, args);
                if (!this._ready() && callbackName !== "added" && callbackName !== "addedBefore") {
                    throw new Error(`Got ${callbackName} during initial adds`);
                }
                for (const handleId of Object.keys(this._handles)){
                    const handle = this._handles && this._handles[handleId];
                    if (!handle) return;
                    const callback = handle[`_${callbackName}`];
                    if (!callback) continue;
                    const result = callback.apply(null, handle.nonMutatingCallbacks ? args : EJSON.clone(args));
                    if (result && Meteor._isPromise(result)) {
                        result.catch((error)=>{
                            console.error(`Error in observeChanges callback ${callbackName}:`, error);
                        });
                    }
                    handle.initialAddsSent.then(result);
                }
            }).call(this));
    }
    _sendAdds(handle) {
        return _async_to_generator(function*() {
            const add = this._ordered ? handle._addedBefore : handle._added;
            if (!add) return;
            const addPromises = [];
            // note: docs may be an _IdMap or an OrderedDict
            this._cache.docs.forEach((doc, id)=>{
                if (!(handle._id in this._handles)) {
                    throw Error("handle got removed before sending initial adds!");
                }
                const _ref = handle.nonMutatingCallbacks ? doc : EJSON.clone(doc), { _id } = _ref, fields = _object_without_properties(_ref, [
                    "_id"
                ]);
                const promise = new Promise((resolve, reject)=>{
                    try {
                        const r = this._ordered ? add(id, fields, null) : add(id, fields);
                        resolve(r);
                    } catch (error) {
                        reject(error);
                    }
                });
                addPromises.push(promise);
            });
            yield Promise.allSettled(addPromises).then((p)=>{
                p.forEach((result)=>{
                    if (result.status === "rejected") {
                        console.error(`Error in adds for handle: ${result.reason}`);
                    }
                });
            });
            handle.initialAddsSentResolver();
        }).call(this);
    }
    constructor({ ordered, onStop = ()=>{} }){
        _define_property(this, "_ordered", void 0);
        _define_property(this, "_onStop", void 0);
        _define_property(this, "_queue", void 0);
        _define_property(this, "_handles", void 0);
        _define_property(this, "_resolver", void 0);
        _define_property(this, "_readyPromise", void 0);
        _define_property(this, "_isReady", void 0);
        _define_property(this, "_cache", void 0);
        _define_property(this, "_addHandleTasksScheduledButNotPerformed", void 0);
        if (ordered === undefined) throw Error("must specify ordered");
        // @ts-ignore
        Package["facts-base"] && Package["facts-base"].Facts.incrementServerFact("mongo-livedata", "observe-multiplexers", 1);
        this._ordered = ordered;
        this._onStop = onStop;
        this._queue = new Meteor._AsynchronousQueue();
        this._handles = {};
        this._resolver = null;
        this._isReady = false;
        this._readyPromise = new Promise((r)=>this._resolver = r).then(()=>this._isReady = true);
        // @ts-ignore
        this._cache = new LocalCollection._CachingChangeObserver({
            ordered
        });
        this._addHandleTasksScheduledButNotPerformed = 0;
        this.callbackNames().forEach((callbackName)=>{
            this[callbackName] = (...args)=>{
                this._applyCallback(callbackName, args);
            };
        });
    }
}
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"doc_fetcher.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/doc_fetcher.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({DocFetcher:()=>DocFetcher});let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
class DocFetcher {
    // Fetches document "id" from collectionName, returning it or null if not
    // found.
    //
    // If you make multiple calls to fetch() with the same op reference,
    // DocFetcher may assume that they all return the same document. (It does
    // not check to see if collectionName/id match.)
    //
    // You may assume that callback is never called synchronously (and in fact
    // OplogObserveDriver does so).
    fetch(collectionName, id, op, callback) {
        return _async_to_generator(function*() {
            const self = this;
            check(collectionName, String);
            check(op, Object);
            // If there's already an in-progress fetch for this cache key, yield until
            // it's done and return whatever it returns.
            if (self._callbacksForOp.has(op)) {
                self._callbacksForOp.get(op).push(callback);
                return;
            }
            const callbacks = [
                callback
            ];
            self._callbacksForOp.set(op, callbacks);
            try {
                var doc = (yield self._mongoConnection.findOneAsync(collectionName, {
                    _id: id
                })) || null;
                // Return doc to all relevant callbacks. Note that this array can
                // continue to grow during callback excecution.
                while(callbacks.length > 0){
                    // Clone the document so that the various calls to fetch don't return
                    // objects that are intertwingled with each other. Clone before
                    // popping the future, so that if clone throws, the error gets passed
                    // to the next callback.
                    callbacks.pop()(null, EJSON.clone(doc));
                }
            } catch (e) {
                while(callbacks.length > 0){
                    callbacks.pop()(e);
                }
            } finally{
                // XXX consider keeping the doc around for a period of time before
                // removing from the cache
                self._callbacksForOp.delete(op);
            }
        }).call(this);
    }
    constructor(mongoConnection){
        this._mongoConnection = mongoConnection;
        // Map from op -> [callback]
        this._callbacksForOp = new Map();
    }
}
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"polling_observe_driver.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/polling_observe_driver.ts                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({PollingObserveDriver:()=>PollingObserveDriver});let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);let _define_property;module.link("@swc/helpers/_/_define_property",{_(v){_define_property=v}},1);let throttle;module.link('lodash.throttle',{default(v){throttle=v}},2);let listenAll;module.link('./mongo_driver',{listenAll(v){listenAll=v}},3);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();



const POLLING_THROTTLE_MS = +(process.env.METEOR_POLLING_THROTTLE_MS || '') || 50;
const POLLING_INTERVAL_MS = +(process.env.METEOR_POLLING_INTERVAL_MS || '') || 10 * 1000;
/**
 * @class PollingObserveDriver
 *
 * One of two observe driver implementations.
 *
 * Characteristics:
 * - Caches the results of a query
 * - Reruns the query when necessary
 * - Suitable for cases where oplog tailing is not available or practical
 */ class PollingObserveDriver {
    _init() {
        return _async_to_generator(function*() {
            var _Package_factsbase;
            const options = this._options;
            const listenersHandle = yield listenAll(this._cursorDescription, (notification)=>{
                const fence = DDPServer._getCurrentFence();
                if (fence) {
                    this._pendingWrites.push(fence.beginWrite());
                }
                if (this._pollsScheduledButNotStarted === 0) {
                    this._ensurePollIsScheduled();
                }
            });
            this._stopCallbacks.push(()=>_async_to_generator(function*() {
                    yield listenersHandle.stop();
                })());
            if (options._testOnlyPollCallback) {
                this._testOnlyPollCallback = options._testOnlyPollCallback;
            } else {
                const pollingInterval = this._cursorDescription.options.pollingIntervalMs || this._cursorDescription.options._pollingInterval || POLLING_INTERVAL_MS;
                const intervalHandle = Meteor.setInterval(this._ensurePollIsScheduled.bind(this), pollingInterval);
                this._stopCallbacks.push(()=>{
                    Meteor.clearInterval(intervalHandle);
                });
            }
            yield this._unthrottledEnsurePollIsScheduled();
            (_Package_factsbase = Package['facts-base']) === null || _Package_factsbase === void 0 ? void 0 : _Package_factsbase.Facts.incrementServerFact("mongo-livedata", "observe-drivers-polling", 1);
        }).call(this);
    }
    _unthrottledEnsurePollIsScheduled() {
        return _async_to_generator(function*() {
            if (this._pollsScheduledButNotStarted > 0) return;
            ++this._pollsScheduledButNotStarted;
            yield this._taskQueue.runTask(()=>_async_to_generator(function*() {
                    yield this._pollMongo();
                }).call(this));
        }).call(this);
    }
    _suspendPolling() {
        ++this._pollsScheduledButNotStarted;
        this._taskQueue.runTask(()=>{});
        if (this._pollsScheduledButNotStarted !== 1) {
            throw new Error(`_pollsScheduledButNotStarted is ${this._pollsScheduledButNotStarted}`);
        }
    }
    _resumePolling() {
        return _async_to_generator(function*() {
            if (this._pollsScheduledButNotStarted !== 1) {
                throw new Error(`_pollsScheduledButNotStarted is ${this._pollsScheduledButNotStarted}`);
            }
            yield this._taskQueue.runTask(()=>_async_to_generator(function*() {
                    yield this._pollMongo();
                }).call(this));
        }).call(this);
    }
    _pollMongo() {
        return _async_to_generator(function*() {
            var _this__testOnlyPollCallback, _this;
            --this._pollsScheduledButNotStarted;
            if (this._stopped) return;
            let first = false;
            let newResults;
            let oldResults = this._results;
            if (!oldResults) {
                first = true;
                oldResults = this._ordered ? [] : new LocalCollection._IdMap;
            }
            (_this__testOnlyPollCallback = (_this = this)._testOnlyPollCallback) === null || _this__testOnlyPollCallback === void 0 ? void 0 : _this__testOnlyPollCallback.call(_this);
            const writesForCycle = this._pendingWrites;
            this._pendingWrites = [];
            try {
                newResults = yield this._cursor.getRawObjects(this._ordered);
            } catch (e) {
                if (first && typeof e.code === 'number') {
                    yield this._multiplexer.queryError(new Error(`Exception while polling query ${JSON.stringify(this._cursorDescription)}: ${e.message}`));
                }
                Array.prototype.push.apply(this._pendingWrites, writesForCycle);
                Meteor._debug(`Exception while polling query ${JSON.stringify(this._cursorDescription)}`, e);
                return;
            }
            if (!this._stopped) {
                LocalCollection._diffQueryChanges(this._ordered, oldResults, newResults, this._multiplexer);
            }
            if (first) this._multiplexer.ready();
            this._results = newResults;
            yield this._multiplexer.onFlush(()=>_async_to_generator(function*() {
                    for (const w of writesForCycle){
                        yield w.committed();
                    }
                })());
        }).call(this);
    }
    stop() {
        return _async_to_generator(function*() {
            var _Package_factsbase;
            this._stopped = true;
            for (const callback of this._stopCallbacks){
                yield callback();
            }
            for (const w of this._pendingWrites){
                yield w.committed();
            }
            (_Package_factsbase = Package['facts-base']) === null || _Package_factsbase === void 0 ? void 0 : _Package_factsbase.Facts.incrementServerFact("mongo-livedata", "observe-drivers-polling", -1);
        }).call(this);
    }
    constructor(options){
        _define_property(this, "_options", void 0);
        _define_property(this, "_cursorDescription", void 0);
        _define_property(this, "_mongoHandle", void 0);
        _define_property(this, "_ordered", void 0);
        _define_property(this, "_multiplexer", void 0);
        _define_property(this, "_stopCallbacks", void 0);
        _define_property(this, "_stopped", void 0);
        _define_property(this, "_cursor", void 0);
        _define_property(this, "_results", void 0);
        _define_property(this, "_pollsScheduledButNotStarted", void 0);
        _define_property(this, "_pendingWrites", void 0);
        _define_property(this, "_ensurePollIsScheduled", void 0);
        _define_property(this, "_taskQueue", void 0);
        _define_property(this, "_testOnlyPollCallback", void 0);
        this._options = options;
        this._cursorDescription = options.cursorDescription;
        this._mongoHandle = options.mongoHandle;
        this._ordered = options.ordered;
        this._multiplexer = options.multiplexer;
        this._stopCallbacks = [];
        this._stopped = false;
        this._cursor = this._mongoHandle._createAsynchronousCursor(this._cursorDescription);
        this._results = null;
        this._pollsScheduledButNotStarted = 0;
        this._pendingWrites = [];
        this._ensurePollIsScheduled = throttle(this._unthrottledEnsurePollIsScheduled.bind(this), this._cursorDescription.options.pollingThrottleMs || POLLING_THROTTLE_MS);
        this._taskQueue = new Meteor._AsynchronousQueue();
    }
}
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"oplog_observe_driver.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/oplog_observe_driver.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({OplogObserveDriver:()=>OplogObserveDriver},true);let _async_iterator;module.link("@swc/helpers/_/_async_iterator",{_(v){_async_iterator=v}},0);let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},1);let has;module.link('lodash.has',{default(v){has=v}},2);let isEmpty;module.link('lodash.isempty',{default(v){isEmpty=v}},3);let oplogV2V1Converter;module.link("./oplog_v2_converter",{oplogV2V1Converter(v){oplogV2V1Converter=v}},4);let check,Match;module.link('meteor/check',{check(v){check=v},Match(v){Match=v}},5);let CursorDescription;module.link('./cursor_description',{CursorDescription(v){CursorDescription=v}},6);let forEachTrigger,listenAll;module.link('./mongo_driver',{forEachTrigger(v){forEachTrigger=v},listenAll(v){listenAll=v}},7);let Cursor;module.link('./cursor',{Cursor(v){Cursor=v}},8);let LocalCollection;module.link('meteor/minimongo/local_collection',{default(v){LocalCollection=v}},9);let idForOp;module.link('./oplog_tailing',{idForOp(v){idForOp=v}},10);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();










var PHASE = {
    QUERYING: "QUERYING",
    FETCHING: "FETCHING",
    STEADY: "STEADY"
};
// Exception thrown by _needToPollQuery which unrolls the stack up to the
// enclosing call to finishIfNeedToPollQuery.
var SwitchedToQuery = function() {};
var finishIfNeedToPollQuery = function(f) {
    return function() {
        try {
            f.apply(this, arguments);
        } catch (e) {
            if (!(e instanceof SwitchedToQuery)) throw e;
        }
    };
};
var currentId = 0;
/**
 * @class OplogObserveDriver
 * An alternative to PollingObserveDriver which follows the MongoDB operation log
 * instead of re-polling the query.
 *
 * Characteristics:
 * - Follows the MongoDB operation log
 * - Directly observes database changes
 * - More efficient than polling for most use cases
 * - Requires access to MongoDB oplog
 *
 * Interface:
 * - Construction initiates observeChanges callbacks and ready() invocation to the ObserveMultiplexer
 * - Observation can be terminated via the stop() method
 */ const OplogObserveDriver = function(options) {
    const self = this;
    self._usesOplog = true; // tests look at this
    self._id = currentId;
    currentId++;
    self._cursorDescription = options.cursorDescription;
    self._mongoHandle = options.mongoHandle;
    self._multiplexer = options.multiplexer;
    if (options.ordered) {
        throw Error("OplogObserveDriver only supports unordered observeChanges");
    }
    const sorter = options.sorter;
    // We don't support $near and other geo-queries so it's OK to initialize the
    // comparator only once in the constructor.
    const comparator = sorter && sorter.getComparator();
    if (options.cursorDescription.options.limit) {
        // There are several properties ordered driver implements:
        // - _limit is a positive number
        // - _comparator is a function-comparator by which the query is ordered
        // - _unpublishedBuffer is non-null Min/Max Heap,
        //                      the empty buffer in STEADY phase implies that the
        //                      everything that matches the queries selector fits
        //                      into published set.
        // - _published - Max Heap (also implements IdMap methods)
        const heapOptions = {
            IdMap: LocalCollection._IdMap
        };
        self._limit = self._cursorDescription.options.limit;
        self._comparator = comparator;
        self._sorter = sorter;
        self._unpublishedBuffer = new MinMaxHeap(comparator, heapOptions);
        // We need something that can find Max value in addition to IdMap interface
        self._published = new MaxHeap(comparator, heapOptions);
    } else {
        self._limit = 0;
        self._comparator = null;
        self._sorter = null;
        self._unpublishedBuffer = null;
        // Memory Growth
        self._published = new LocalCollection._IdMap;
    }
    // Indicates if it is safe to insert a new document at the end of the buffer
    // for this query. i.e. it is known that there are no documents matching the
    // selector those are not in published or buffer.
    self._safeAppendToBuffer = false;
    self._stopped = false;
    self._stopHandles = [];
    self._addStopHandles = function(newStopHandles) {
        const expectedPattern = Match.ObjectIncluding({
            stop: Function
        });
        // Single item or array
        check(newStopHandles, Match.OneOf([
            expectedPattern
        ], expectedPattern));
        self._stopHandles.push(newStopHandles);
    };
    Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-drivers-oplog", 1);
    self._registerPhaseChange(PHASE.QUERYING);
    self._matcher = options.matcher;
    // we are now using projection, not fields in the cursor description even if you pass {fields}
    // in the cursor construction
    const projection = self._cursorDescription.options.fields || self._cursorDescription.options.projection || {};
    self._projectionFn = LocalCollection._compileProjection(projection);
    // Projection function, result of combining important fields for selector and
    // existing fields projection
    self._sharedProjection = self._matcher.combineIntoProjection(projection);
    if (sorter) self._sharedProjection = sorter.combineIntoProjection(self._sharedProjection);
    self._sharedProjectionFn = LocalCollection._compileProjection(self._sharedProjection);
    self._needToFetch = new LocalCollection._IdMap;
    self._currentlyFetching = null;
    self._fetchGeneration = 0;
    self._requeryWhenDoneThisQuery = false;
    self._writesToCommitWhenWeReachSteady = [];
};
Object.assign(OplogObserveDriver.prototype, {
    _init: function() {
        return _async_to_generator(function*() {
            const self = this;
            // If the oplog handle tells us that it skipped some entries (because it got
            // behind, say), re-poll.
            self._addStopHandles(self._mongoHandle._oplogHandle.onSkippedEntries(finishIfNeedToPollQuery(function() {
                return self._needToPollQuery();
            })));
            yield forEachTrigger(self._cursorDescription, function(trigger) {
                return _async_to_generator(function*() {
                    self._addStopHandles((yield self._mongoHandle._oplogHandle.onOplogEntry(trigger, function(notification) {
                        finishIfNeedToPollQuery(function() {
                            const op = notification.op;
                            if (notification.dropCollection || notification.dropDatabase) {
                                // Note: this call is not allowed to block on anything (especially
                                // on waiting for oplog entries to catch up) because that will block
                                // onOplogEntry!
                                return self._needToPollQuery();
                            } else {
                                // All other operators should be handled depending on phase
                                if (self._phase === PHASE.QUERYING) {
                                    return self._handleOplogEntryQuerying(op);
                                } else {
                                    return self._handleOplogEntrySteadyOrFetching(op);
                                }
                            }
                        })();
                    })));
                })();
            });
            // XXX ordering w.r.t. everything else?
            self._addStopHandles((yield listenAll(self._cursorDescription, function() {
                // If we're not in a pre-fire write fence, we don't have to do anything.
                const fence = DDPServer._getCurrentFence();
                if (!fence || fence.fired) return;
                if (fence._oplogObserveDrivers) {
                    fence._oplogObserveDrivers[self._id] = self;
                    return;
                }
                fence._oplogObserveDrivers = {};
                fence._oplogObserveDrivers[self._id] = self;
                fence.onBeforeFire(function() {
                    return _async_to_generator(function*() {
                        const drivers = fence._oplogObserveDrivers;
                        delete fence._oplogObserveDrivers;
                        // This fence cannot fire until we've caught up to "this point" in the
                        // oplog, and all observers made it back to the steady state.
                        yield self._mongoHandle._oplogHandle.waitUntilCaughtUp();
                        for (const driver of Object.values(drivers)){
                            if (driver._stopped) continue;
                            const write = yield fence.beginWrite();
                            if (driver._phase === PHASE.STEADY) {
                                // Make sure that all of the callbacks have made it through the
                                // multiplexer and been delivered to ObserveHandles before committing
                                // writes.
                                yield driver._multiplexer.onFlush(write.committed);
                            } else {
                                driver._writesToCommitWhenWeReachSteady.push(write);
                            }
                        }
                    })();
                });
            })));
            // When Mongo fails over, we need to repoll the query, in case we processed an
            // oplog entry that got rolled back.
            self._addStopHandles(self._mongoHandle._onFailover(finishIfNeedToPollQuery(function() {
                return self._needToPollQuery();
            })));
            // Give _observeChanges a chance to add the new ObserveHandle to our
            // multiplexer, so that the added calls get streamed.
            return self._runInitialQuery();
        }).call(this);
    },
    _addPublished: function(id, doc) {
        var self = this;
        Meteor._noYieldsAllowed(function() {
            var fields = Object.assign({}, doc);
            delete fields._id;
            self._published.set(id, self._sharedProjectionFn(doc));
            self._multiplexer.added(id, self._projectionFn(fields));
            // After adding this document, the published set might be overflowed
            // (exceeding capacity specified by limit). If so, push the maximum
            // element to the buffer, we might want to save it in memory to reduce the
            // amount of Mongo lookups in the future.
            if (self._limit && self._published.size() > self._limit) {
                // XXX in theory the size of published is no more than limit+1
                if (self._published.size() !== self._limit + 1) {
                    throw new Error("After adding to published, " + (self._published.size() - self._limit) + " documents are overflowing the set");
                }
                var overflowingDocId = self._published.maxElementId();
                var overflowingDoc = self._published.get(overflowingDocId);
                if (EJSON.equals(overflowingDocId, id)) {
                    throw new Error("The document just added is overflowing the published set");
                }
                self._published.remove(overflowingDocId);
                self._multiplexer.removed(overflowingDocId);
                self._addBuffered(overflowingDocId, overflowingDoc);
            }
        });
    },
    _removePublished: function(id) {
        var self = this;
        Meteor._noYieldsAllowed(function() {
            self._published.remove(id);
            self._multiplexer.removed(id);
            if (!self._limit || self._published.size() === self._limit) return;
            if (self._published.size() > self._limit) throw Error("self._published got too big");
            // OK, we are publishing less than the limit. Maybe we should look in the
            // buffer to find the next element past what we were publishing before.
            if (!self._unpublishedBuffer.empty()) {
                // There's something in the buffer; move the first thing in it to
                // _published.
                var newDocId = self._unpublishedBuffer.minElementId();
                var newDoc = self._unpublishedBuffer.get(newDocId);
                self._removeBuffered(newDocId);
                self._addPublished(newDocId, newDoc);
                return;
            }
            // There's nothing in the buffer.  This could mean one of a few things.
            // (a) We could be in the middle of re-running the query (specifically, we
            // could be in _publishNewResults). In that case, _unpublishedBuffer is
            // empty because we clear it at the beginning of _publishNewResults. In
            // this case, our caller already knows the entire answer to the query and
            // we don't need to do anything fancy here.  Just return.
            if (self._phase === PHASE.QUERYING) return;
            // (b) We're pretty confident that the union of _published and
            // _unpublishedBuffer contain all documents that match selector. Because
            // _unpublishedBuffer is empty, that means we're confident that _published
            // contains all documents that match selector. So we have nothing to do.
            if (self._safeAppendToBuffer) return;
            // (c) Maybe there are other documents out there that should be in our
            // buffer. But in that case, when we emptied _unpublishedBuffer in
            // _removeBuffered, we should have called _needToPollQuery, which will
            // either put something in _unpublishedBuffer or set _safeAppendToBuffer
            // (or both), and it will put us in QUERYING for that whole time. So in
            // fact, we shouldn't be able to get here.
            throw new Error("Buffer inexplicably empty");
        });
    },
    _changePublished: function(id, oldDoc, newDoc) {
        var self = this;
        Meteor._noYieldsAllowed(function() {
            self._published.set(id, self._sharedProjectionFn(newDoc));
            var projectedNew = self._projectionFn(newDoc);
            var projectedOld = self._projectionFn(oldDoc);
            var changed = DiffSequence.makeChangedFields(projectedNew, projectedOld);
            if (!isEmpty(changed)) self._multiplexer.changed(id, changed);
        });
    },
    _addBuffered: function(id, doc) {
        var self = this;
        Meteor._noYieldsAllowed(function() {
            self._unpublishedBuffer.set(id, self._sharedProjectionFn(doc));
            // If something is overflowing the buffer, we just remove it from cache
            if (self._unpublishedBuffer.size() > self._limit) {
                var maxBufferedId = self._unpublishedBuffer.maxElementId();
                self._unpublishedBuffer.remove(maxBufferedId);
                // Since something matching is removed from cache (both published set and
                // buffer), set flag to false
                self._safeAppendToBuffer = false;
            }
        });
    },
    // Is called either to remove the doc completely from matching set or to move
    // it to the published set later.
    _removeBuffered: function(id) {
        var self = this;
        Meteor._noYieldsAllowed(function() {
            self._unpublishedBuffer.remove(id);
            // To keep the contract "buffer is never empty in STEADY phase unless the
            // everything matching fits into published" true, we poll everything as
            // soon as we see the buffer becoming empty.
            if (!self._unpublishedBuffer.size() && !self._safeAppendToBuffer) self._needToPollQuery();
        });
    },
    // Called when a document has joined the "Matching" results set.
    // Takes responsibility of keeping _unpublishedBuffer in sync with _published
    // and the effect of limit enforced.
    _addMatching: function(doc) {
        var self = this;
        Meteor._noYieldsAllowed(function() {
            var id = doc._id;
            if (self._published.has(id)) throw Error("tried to add something already published " + id);
            if (self._limit && self._unpublishedBuffer.has(id)) throw Error("tried to add something already existed in buffer " + id);
            var limit = self._limit;
            var comparator = self._comparator;
            var maxPublished = limit && self._published.size() > 0 ? self._published.get(self._published.maxElementId()) : null;
            var maxBuffered = limit && self._unpublishedBuffer.size() > 0 ? self._unpublishedBuffer.get(self._unpublishedBuffer.maxElementId()) : null;
            // The query is unlimited or didn't publish enough documents yet or the
            // new document would fit into published set pushing the maximum element
            // out, then we need to publish the doc.
            var toPublish = !limit || self._published.size() < limit || comparator(doc, maxPublished) < 0;
            // Otherwise we might need to buffer it (only in case of limited query).
            // Buffering is allowed if the buffer is not filled up yet and all
            // matching docs are either in the published set or in the buffer.
            var canAppendToBuffer = !toPublish && self._safeAppendToBuffer && self._unpublishedBuffer.size() < limit;
            // Or if it is small enough to be safely inserted to the middle or the
            // beginning of the buffer.
            var canInsertIntoBuffer = !toPublish && maxBuffered && comparator(doc, maxBuffered) <= 0;
            var toBuffer = canAppendToBuffer || canInsertIntoBuffer;
            if (toPublish) {
                self._addPublished(id, doc);
            } else if (toBuffer) {
                self._addBuffered(id, doc);
            } else {
                // dropping it and not saving to the cache
                self._safeAppendToBuffer = false;
            }
        });
    },
    // Called when a document leaves the "Matching" results set.
    // Takes responsibility of keeping _unpublishedBuffer in sync with _published
    // and the effect of limit enforced.
    _removeMatching: function(id) {
        var self = this;
        Meteor._noYieldsAllowed(function() {
            if (!self._published.has(id) && !self._limit) throw Error("tried to remove something matching but not cached " + id);
            if (self._published.has(id)) {
                self._removePublished(id);
            } else if (self._unpublishedBuffer.has(id)) {
                self._removeBuffered(id);
            }
        });
    },
    _handleDoc: function(id, newDoc) {
        var self = this;
        Meteor._noYieldsAllowed(function() {
            var matchesNow = newDoc && self._matcher.documentMatches(newDoc).result;
            var publishedBefore = self._published.has(id);
            var bufferedBefore = self._limit && self._unpublishedBuffer.has(id);
            var cachedBefore = publishedBefore || bufferedBefore;
            if (matchesNow && !cachedBefore) {
                self._addMatching(newDoc);
            } else if (cachedBefore && !matchesNow) {
                self._removeMatching(id);
            } else if (cachedBefore && matchesNow) {
                var oldDoc = self._published.get(id);
                var comparator = self._comparator;
                var minBuffered = self._limit && self._unpublishedBuffer.size() && self._unpublishedBuffer.get(self._unpublishedBuffer.minElementId());
                var maxBuffered;
                if (publishedBefore) {
                    // Unlimited case where the document stays in published once it
                    // matches or the case when we don't have enough matching docs to
                    // publish or the changed but matching doc will stay in published
                    // anyways.
                    //
                    // XXX: We rely on the emptiness of buffer. Be sure to maintain the
                    // fact that buffer can't be empty if there are matching documents not
                    // published. Notably, we don't want to schedule repoll and continue
                    // relying on this property.
                    var staysInPublished = !self._limit || self._unpublishedBuffer.size() === 0 || comparator(newDoc, minBuffered) <= 0;
                    if (staysInPublished) {
                        self._changePublished(id, oldDoc, newDoc);
                    } else {
                        // after the change doc doesn't stay in the published, remove it
                        self._removePublished(id);
                        // but it can move into buffered now, check it
                        maxBuffered = self._unpublishedBuffer.get(self._unpublishedBuffer.maxElementId());
                        var toBuffer = self._safeAppendToBuffer || maxBuffered && comparator(newDoc, maxBuffered) <= 0;
                        if (toBuffer) {
                            self._addBuffered(id, newDoc);
                        } else {
                            // Throw away from both published set and buffer
                            self._safeAppendToBuffer = false;
                        }
                    }
                } else if (bufferedBefore) {
                    oldDoc = self._unpublishedBuffer.get(id);
                    // remove the old version manually instead of using _removeBuffered so
                    // we don't trigger the querying immediately.  if we end this block
                    // with the buffer empty, we will need to trigger the query poll
                    // manually too.
                    self._unpublishedBuffer.remove(id);
                    var maxPublished = self._published.get(self._published.maxElementId());
                    maxBuffered = self._unpublishedBuffer.size() && self._unpublishedBuffer.get(self._unpublishedBuffer.maxElementId());
                    // the buffered doc was updated, it could move to published
                    var toPublish = comparator(newDoc, maxPublished) < 0;
                    // or stays in buffer even after the change
                    var staysInBuffer = !toPublish && self._safeAppendToBuffer || !toPublish && maxBuffered && comparator(newDoc, maxBuffered) <= 0;
                    if (toPublish) {
                        self._addPublished(id, newDoc);
                    } else if (staysInBuffer) {
                        // stays in buffer but changes
                        self._unpublishedBuffer.set(id, newDoc);
                    } else {
                        // Throw away from both published set and buffer
                        self._safeAppendToBuffer = false;
                        // Normally this check would have been done in _removeBuffered but
                        // we didn't use it, so we need to do it ourself now.
                        if (!self._unpublishedBuffer.size()) {
                            self._needToPollQuery();
                        }
                    }
                } else {
                    throw new Error("cachedBefore implies either of publishedBefore or bufferedBefore is true.");
                }
            }
        });
    },
    _fetchModifiedDocuments: function() {
        var self = this;
        self._registerPhaseChange(PHASE.FETCHING);
        // Defer, because nothing called from the oplog entry handler may yield,
        // but fetch() yields.
        Meteor.defer(finishIfNeedToPollQuery(function() {
            return _async_to_generator(function*() {
                while(!self._stopped && !self._needToFetch.empty()){
                    if (self._phase === PHASE.QUERYING) {
                        break;
                    }
                    // Being in steady phase here would be surprising.
                    if (self._phase !== PHASE.FETCHING) throw new Error("phase in fetchModifiedDocuments: " + self._phase);
                    self._currentlyFetching = self._needToFetch;
                    var thisGeneration = ++self._fetchGeneration;
                    self._needToFetch = new LocalCollection._IdMap;
                    // Create an array of promises for all the fetch operations
                    const fetchPromises = [];
                    self._currentlyFetching.forEach(function(op, id) {
                        const fetchPromise = new Promise((resolve, reject)=>{
                            self._mongoHandle._docFetcher.fetch(self._cursorDescription.collectionName, id, op, finishIfNeedToPollQuery(function(err, doc) {
                                if (err) {
                                    Meteor._debug('Got exception while fetching documents', err);
                                    // If we get an error from the fetcher (eg, trouble
                                    // connecting to Mongo), let's just abandon the fetch phase
                                    // altogether and fall back to polling. It's not like we're
                                    // getting live updates anyway.
                                    if (self._phase !== PHASE.QUERYING) {
                                        self._needToPollQuery();
                                    }
                                    resolve();
                                    return;
                                }
                                if (!self._stopped && self._phase === PHASE.FETCHING && self._fetchGeneration === thisGeneration) {
                                    // We re-check the generation in case we've had an explicit
                                    // _pollQuery call (eg, in another fiber) which should
                                    // effectively cancel this round of fetches.  (_pollQuery
                                    // increments the generation.)
                                    try {
                                        self._handleDoc(id, doc);
                                        resolve();
                                    } catch (err) {
                                        reject(err);
                                    }
                                } else {
                                    resolve();
                                }
                            }));
                        });
                        fetchPromises.push(fetchPromise);
                    });
                    // Wait for all fetch operations to complete
                    try {
                        const results = yield Promise.allSettled(fetchPromises);
                        const errors = results.filter((result)=>result.status === 'rejected').map((result)=>result.reason);
                        if (errors.length > 0) {
                            Meteor._debug('Some fetch queries failed:', errors);
                        }
                    } catch (err) {
                        Meteor._debug('Got an exception in a fetch query', err);
                    }
                    // Exit now if we've had a _pollQuery call (here or in another fiber).
                    if (self._phase === PHASE.QUERYING) return;
                    self._currentlyFetching = null;
                }
                // We're done fetching, so we can be steady, unless we've had a
                // _pollQuery call (here or in another fiber).
                if (self._phase !== PHASE.QUERYING) yield self._beSteady();
            })();
        }));
    },
    _beSteady: function() {
        return _async_to_generator(function*() {
            var self = this;
            self._registerPhaseChange(PHASE.STEADY);
            var writes = self._writesToCommitWhenWeReachSteady || [];
            self._writesToCommitWhenWeReachSteady = [];
            yield self._multiplexer.onFlush(function() {
                return _async_to_generator(function*() {
                    try {
                        for (const w of writes){
                            yield w.committed();
                        }
                    } catch (e) {
                        console.error("_beSteady error", {
                            writes
                        }, e);
                    }
                })();
            });
        }).call(this);
    },
    _handleOplogEntryQuerying: function(op) {
        var self = this;
        Meteor._noYieldsAllowed(function() {
            self._needToFetch.set(idForOp(op), op);
        });
    },
    _handleOplogEntrySteadyOrFetching: function(op) {
        var self = this;
        Meteor._noYieldsAllowed(function() {
            var id = idForOp(op);
            // If we're already fetching this one, or about to, we can't optimize;
            // make sure that we fetch it again if necessary.
            if (self._phase === PHASE.FETCHING && (self._currentlyFetching && self._currentlyFetching.has(id) || self._needToFetch.has(id))) {
                self._needToFetch.set(id, op);
                return;
            }
            if (op.op === 'd') {
                if (self._published.has(id) || self._limit && self._unpublishedBuffer.has(id)) self._removeMatching(id);
            } else if (op.op === 'i') {
                if (self._published.has(id)) throw new Error("insert found for already-existing ID in published");
                if (self._unpublishedBuffer && self._unpublishedBuffer.has(id)) throw new Error("insert found for already-existing ID in buffer");
                // XXX what if selector yields?  for now it can't but later it could
                // have $where
                if (self._matcher.documentMatches(op.o).result) self._addMatching(op.o);
            } else if (op.op === 'u') {
                // we are mapping the new oplog format on mongo 5
                // to what we know better, $set
                op.o = oplogV2V1Converter(op.o);
                // Is this a modifier ($set/$unset, which may require us to poll the
                // database to figure out if the whole document matches the selector) or
                // a replacement (in which case we can just directly re-evaluate the
                // selector)?
                // oplog format has changed on mongodb 5, we have to support both now
                // diff is the format in Mongo 5+ (oplog v2)
                var isReplace = !has(op.o, '$set') && !has(op.o, 'diff') && !has(op.o, '$unset');
                // If this modifier modifies something inside an EJSON custom type (ie,
                // anything with EJSON$), then we can't try to use
                // LocalCollection._modify, since that just mutates the EJSON encoding,
                // not the actual object.
                var canDirectlyModifyDoc = !isReplace && modifierCanBeDirectlyApplied(op.o);
                var publishedBefore = self._published.has(id);
                var bufferedBefore = self._limit && self._unpublishedBuffer.has(id);
                if (isReplace) {
                    self._handleDoc(id, Object.assign({
                        _id: id
                    }, op.o));
                } else if ((publishedBefore || bufferedBefore) && canDirectlyModifyDoc) {
                    // Oh great, we actually know what the document is, so we can apply
                    // this directly.
                    var newDoc = self._published.has(id) ? self._published.get(id) : self._unpublishedBuffer.get(id);
                    newDoc = EJSON.clone(newDoc);
                    newDoc._id = id;
                    try {
                        LocalCollection._modify(newDoc, op.o);
                    } catch (e) {
                        if (e.name !== "MinimongoError") throw e;
                        // We didn't understand the modifier.  Re-fetch.
                        self._needToFetch.set(id, op);
                        if (self._phase === PHASE.STEADY) {
                            self._fetchModifiedDocuments();
                        }
                        return;
                    }
                    self._handleDoc(id, self._sharedProjectionFn(newDoc));
                } else if (!canDirectlyModifyDoc || self._matcher.canBecomeTrueByModifier(op.o) || self._sorter && self._sorter.affectedByModifier(op.o)) {
                    self._needToFetch.set(id, op);
                    if (self._phase === PHASE.STEADY) self._fetchModifiedDocuments();
                }
            } else {
                throw Error("XXX SURPRISING OPERATION: " + op);
            }
        });
    },
    _runInitialQueryAsync () {
        return _async_to_generator(function*() {
            var self = this;
            if (self._stopped) throw new Error("oplog stopped surprisingly early");
            yield self._runQuery({
                initial: true
            }); // yields
            if (self._stopped) return; // can happen on queryError
            // Allow observeChanges calls to return. (After this, it's possible for
            // stop() to be called.)
            yield self._multiplexer.ready();
            yield self._doneQuerying(); // yields
        }).call(this);
    },
    // Yields!
    _runInitialQuery: function() {
        return this._runInitialQueryAsync();
    },
    // In various circumstances, we may just want to stop processing the oplog and
    // re-run the initial query, just as if we were a PollingObserveDriver.
    //
    // This function may not block, because it is called from an oplog entry
    // handler.
    //
    // XXX We should call this when we detect that we've been in FETCHING for "too
    // long".
    //
    // XXX We should call this when we detect Mongo failover (since that might
    // mean that some of the oplog entries we have processed have been rolled
    // back). The Node Mongo driver is in the middle of a bunch of huge
    // refactorings, including the way that it notifies you when primary
    // changes. Will put off implementing this until driver 1.4 is out.
    _pollQuery: function() {
        var self = this;
        Meteor._noYieldsAllowed(function() {
            if (self._stopped) return;
            // Yay, we get to forget about all the things we thought we had to fetch.
            self._needToFetch = new LocalCollection._IdMap;
            self._currentlyFetching = null;
            ++self._fetchGeneration; // ignore any in-flight fetches
            self._registerPhaseChange(PHASE.QUERYING);
            // Defer so that we don't yield.  We don't need finishIfNeedToPollQuery
            // here because SwitchedToQuery is not thrown in QUERYING mode.
            Meteor.defer(function() {
                return _async_to_generator(function*() {
                    yield self._runQuery();
                    yield self._doneQuerying();
                })();
            });
        });
    },
    // Yields!
    _runQueryAsync (options) {
        return _async_to_generator(function*() {
            var self = this;
            options = options || {};
            var newResults, newBuffer;
            // This while loop is just to retry failures.
            while(true){
                // If we've been stopped, we don't have to run anything any more.
                if (self._stopped) return;
                newResults = new LocalCollection._IdMap;
                newBuffer = new LocalCollection._IdMap;
                // Query 2x documents as the half excluded from the original query will go
                // into unpublished buffer to reduce additional Mongo lookups in cases
                // when documents are removed from the published set and need a
                // replacement.
                // XXX needs more thought on non-zero skip
                // XXX 2 is a "magic number" meaning there is an extra chunk of docs for
                // buffer if such is needed.
                var cursor = self._cursorForQuery({
                    limit: self._limit * 2
                });
                try {
                    yield cursor.forEach(function(doc, i) {
                        if (!self._limit || i < self._limit) {
                            newResults.set(doc._id, doc);
                        } else {
                            newBuffer.set(doc._id, doc);
                        }
                    });
                    break;
                } catch (e) {
                    if (options.initial && typeof e.code === 'number') {
                        // This is an error document sent to us by mongod, not a connection
                        // error generated by the client. And we've never seen this query work
                        // successfully. Probably it's a bad selector or something, so we
                        // should NOT retry. Instead, we should halt the observe (which ends
                        // up calling `stop` on us).
                        yield self._multiplexer.queryError(e);
                        return;
                    }
                    // During failover (eg) if we get an exception we should log and retry
                    // instead of crashing.
                    Meteor._debug("Got exception while polling query", e);
                    yield Meteor._sleepForMs(100);
                }
            }
            if (self._stopped) return;
            self._publishNewResults(newResults, newBuffer);
        }).call(this);
    },
    // Yields!
    _runQuery: function(options) {
        return this._runQueryAsync(options);
    },
    // Transitions to QUERYING and runs another query, or (if already in QUERYING)
    // ensures that we will query again later.
    //
    // This function may not block, because it is called from an oplog entry
    // handler. However, if we were not already in the QUERYING phase, it throws
    // an exception that is caught by the closest surrounding
    // finishIfNeedToPollQuery call; this ensures that we don't continue running
    // close that was designed for another phase inside PHASE.QUERYING.
    //
    // (It's also necessary whenever logic in this file yields to check that other
    // phases haven't put us into QUERYING mode, though; eg,
    // _fetchModifiedDocuments does this.)
    _needToPollQuery: function() {
        var self = this;
        Meteor._noYieldsAllowed(function() {
            if (self._stopped) return;
            // If we're not already in the middle of a query, we can query now
            // (possibly pausing FETCHING).
            if (self._phase !== PHASE.QUERYING) {
                self._pollQuery();
                throw new SwitchedToQuery;
            }
            // We're currently in QUERYING. Set a flag to ensure that we run another
            // query when we're done.
            self._requeryWhenDoneThisQuery = true;
        });
    },
    // Yields!
    _doneQuerying: function() {
        return _async_to_generator(function*() {
            var self = this;
            if (self._stopped) return;
            yield self._mongoHandle._oplogHandle.waitUntilCaughtUp();
            if (self._stopped) return;
            if (self._phase !== PHASE.QUERYING) throw Error("Phase unexpectedly " + self._phase);
            if (self._requeryWhenDoneThisQuery) {
                self._requeryWhenDoneThisQuery = false;
                self._pollQuery();
            } else if (self._needToFetch.empty()) {
                yield self._beSteady();
            } else {
                self._fetchModifiedDocuments();
            }
        }).call(this);
    },
    _cursorForQuery: function(optionsOverwrite) {
        var self = this;
        return Meteor._noYieldsAllowed(function() {
            // The query we run is almost the same as the cursor we are observing,
            // with a few changes. We need to read all the fields that are relevant to
            // the selector, not just the fields we are going to publish (that's the
            // "shared" projection). And we don't want to apply any transform in the
            // cursor, because observeChanges shouldn't use the transform.
            var options = Object.assign({}, self._cursorDescription.options);
            // Allow the caller to modify the options. Useful to specify different
            // skip and limit values.
            Object.assign(options, optionsOverwrite);
            options.fields = self._sharedProjection;
            delete options.transform;
            // We are NOT deep cloning fields or selector here, which should be OK.
            var description = new CursorDescription(self._cursorDescription.collectionName, self._cursorDescription.selector, options);
            return new Cursor(self._mongoHandle, description);
        });
    },
    // Replace self._published with newResults (both are IdMaps), invoking observe
    // callbacks on the multiplexer.
    // Replace self._unpublishedBuffer with newBuffer.
    //
    // XXX This is very similar to LocalCollection._diffQueryUnorderedChanges. We
    // should really: (a) Unify IdMap and OrderedDict into Unordered/OrderedDict
    // (b) Rewrite diff.js to use these classes instead of arrays and objects.
    _publishNewResults: function(newResults, newBuffer) {
        var self = this;
        Meteor._noYieldsAllowed(function() {
            // If the query is limited and there is a buffer, shut down so it doesn't
            // stay in a way.
            if (self._limit) {
                self._unpublishedBuffer.clear();
            }
            // First remove anything that's gone. Be careful not to modify
            // self._published while iterating over it.
            var idsToRemove = [];
            self._published.forEach(function(doc, id) {
                if (!newResults.has(id)) idsToRemove.push(id);
            });
            idsToRemove.forEach(function(id) {
                self._removePublished(id);
            });
            // Now do adds and changes.
            // If self has a buffer and limit, the new fetched result will be
            // limited correctly as the query has sort specifier.
            newResults.forEach(function(doc, id) {
                self._handleDoc(id, doc);
            });
            // Sanity-check that everything we tried to put into _published ended up
            // there.
            // XXX if this is slow, remove it later
            if (self._published.size() !== newResults.size()) {
                Meteor._debug('The Mongo server and the Meteor query disagree on how ' + 'many documents match your query. Cursor description: ', self._cursorDescription);
            }
            self._published.forEach(function(doc, id) {
                if (!newResults.has(id)) throw Error("_published has a doc that newResults doesn't; " + id);
            });
            // Finally, replace the buffer
            newBuffer.forEach(function(doc, id) {
                self._addBuffered(id, doc);
            });
            self._safeAppendToBuffer = newBuffer.size() < self._limit;
        });
    },
    // This stop function is invoked from the onStop of the ObserveMultiplexer, so
    // it shouldn't actually be possible to call it until the multiplexer is
    // ready.
    //
    // It's important to check self._stopped after every call in this file that
    // can yield!
    _stop: function() {
        return _async_to_generator(function*() {
            var self = this;
            if (self._stopped) return;
            self._stopped = true;
            // Note: we *don't* use multiplexer.onFlush here because this stop
            // callback is actually invoked by the multiplexer itself when it has
            // determined that there are no handles left. So nothing is actually going
            // to get flushed (and it's probably not valid to call methods on the
            // dying multiplexer).
            for (const w of self._writesToCommitWhenWeReachSteady){
                yield w.committed();
            }
            self._writesToCommitWhenWeReachSteady = null;
            // Proactively drop references to potentially big things.
            self._published = null;
            self._unpublishedBuffer = null;
            self._needToFetch = null;
            self._currentlyFetching = null;
            self._oplogEntryHandle = null;
            self._listenersHandle = null;
            Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-drivers-oplog", -1);
            {
                var _iteratorAbruptCompletion = false, _didIteratorError = false, _iteratorError;
                try {
                    for(var _iterator = _async_iterator(self._stopHandles), _step; _iteratorAbruptCompletion = !(_step = yield _iterator.next()).done; _iteratorAbruptCompletion = false){
                        let _value = _step.value;
                        const handle = _value;
                        yield handle.stop();
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally{
                    try {
                        if (_iteratorAbruptCompletion && _iterator.return != null) {
                            yield _iterator.return();
                        }
                    } finally{
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }
            }
        }).call(this);
    },
    stop: function() {
        return _async_to_generator(function*() {
            const self = this;
            return yield self._stop();
        }).call(this);
    },
    _registerPhaseChange: function(phase) {
        var self = this;
        Meteor._noYieldsAllowed(function() {
            var now = new Date;
            if (self._phase) {
                var timeDiff = now - self._phaseStartTime;
                Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "time-spent-in-" + self._phase + "-phase", timeDiff);
            }
            self._phase = phase;
            self._phaseStartTime = now;
        });
    }
});
// Does our oplog tailing code support this cursor? For now, we are being very
// conservative and allowing only simple queries with simple options.
// (This is a "static method".)
OplogObserveDriver.cursorSupported = function(cursorDescription, matcher) {
    // First, check the options.
    var options = cursorDescription.options;
    // Did the user say no explicitly?
    // underscored version of the option is COMPAT with 1.2
    if (options.disableOplog || options._disableOplog) return false;
    // skip is not supported: to support it we would need to keep track of all
    // "skipped" documents or at least their ids.
    // limit w/o a sort specifier is not supported: current implementation needs a
    // deterministic way to order documents.
    if (options.skip || options.limit && !options.sort) return false;
    // If a fields projection option is given check if it is supported by
    // minimongo (some operators are not supported).
    const fields = options.fields || options.projection;
    if (fields) {
        try {
            LocalCollection._checkSupportedProjection(fields);
        } catch (e) {
            if (e.name === "MinimongoError") {
                return false;
            } else {
                throw e;
            }
        }
    }
    // We don't allow the following selectors:
    //   - $where (not confident that we provide the same JS environment
    //             as Mongo, and can yield!)
    //   - $near (has "interesting" properties in MongoDB, like the possibility
    //            of returning an ID multiple times, though even polling maybe
    //            have a bug there)
    //           XXX: once we support it, we would need to think more on how we
    //           initialize the comparators when we create the driver.
    return !matcher.hasWhere() && !matcher.hasGeoQuery();
};
var modifierCanBeDirectlyApplied = function(modifier) {
    return Object.entries(modifier).every(function([operation, fields]) {
        return Object.entries(fields).every(function([field, value]) {
            return !/EJSON\$/.test(field);
        });
    });
};
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"oplog_v2_converter.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/oplog_v2_converter.ts                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({oplogV2V1Converter:()=>oplogV2V1Converter});let EJSON;module.link('meteor/ejson',{EJSON(v){EJSON=v}},0);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();/**
 * Converter module for the new MongoDB Oplog format (>=5.0) to the one that Meteor
 * handles well, i.e., `$set` and `$unset`. The new format is completely new,
 * and looks as follows:
 *
 * ```js
 * { $v: 2, diff: Diff }
 * ```
 *
 * where `Diff` is a recursive structure:
 * ```js
 * {
 *   // Nested updates (sometimes also represented with an s-field).
 *   // Example: `{ $set: { 'foo.bar': 1 } }`.
 *   i: { <key>: <value>, ... },
 *
 *   // Top-level updates.
 *   // Example: `{ $set: { foo: { bar: 1 } } }`.
 *   u: { <key>: <value>, ... },
 *
 *   // Unsets.
 *   // Example: `{ $unset: { foo: '' } }`.
 *   d: { <key>: false, ... },
 *
 *   // Array operations.
 *   // Example: `{ $push: { foo: 'bar' } }`.
 *   s<key>: { a: true, u<index>: <value>, ... },
 *   ...
 *
 *   // Nested operations (sometimes also represented in the `i` field).
 *   // Example: `{ $set: { 'foo.bar': 1 } }`.
 *   s<key>: Diff,
 *   ...
 * }
 * ```
 *
 * (all fields are optional)
 */ 
const arrayOperatorKeyRegex = /^(a|[su]\d+)$/;
/**
 * Checks if a field is an array operator key of form 'a' or 's1' or 'u1' etc
 */ function isArrayOperatorKey(field) {
    return arrayOperatorKeyRegex.test(field);
}
/**
 * Type guard to check if an operator is a valid array operator.
 * Array operators have 'a: true' and keys that match the arrayOperatorKeyRegex
 */ function isArrayOperator(operator) {
    return operator !== null && typeof operator === 'object' && 'a' in operator && operator.a === true && Object.keys(operator).every(isArrayOperatorKey);
}
/**
 * Joins two parts of a field path with a dot.
 * Returns the key itself if prefix is empty.
 */ function join(prefix, key) {
    return prefix ? `${prefix}.${key}` : key;
}
/**
 * Recursively flattens an object into a target object with dot notation paths.
 * Handles special cases:
 * - Arrays are assigned directly
 * - Custom EJSON types are preserved
 * - Mongo.ObjectIDs are preserved
 * - Plain objects are recursively flattened
 * - Empty objects are assigned directly
 */ function flattenObjectInto(target, source, prefix) {
    if (Array.isArray(source) || typeof source !== 'object' || source === null || source instanceof Mongo.ObjectID || EJSON._isCustomType(source)) {
        target[prefix] = source;
        return;
    }
    const entries = Object.entries(source);
    if (entries.length) {
        entries.forEach(([key, value])=>{
            flattenObjectInto(target, value, join(prefix, key));
        });
    } else {
        target[prefix] = source;
    }
}
/**
 * Converts an oplog diff to a series of $set and $unset operations.
 * Handles several types of operations:
 * - Direct unsets via 'd' field
 * - Nested sets via 'i' field
 * - Top-level sets via 'u' field
 * - Array operations and nested objects via 's' prefixed fields
 *
 * Preserves the structure of EJSON custom types and ObjectIDs while
 * flattening paths into dot notation for MongoDB updates.
 */ function convertOplogDiff(oplogEntry, diff, prefix = '') {
    Object.entries(diff).forEach(([diffKey, value])=>{
        if (diffKey === 'd') {
            var // Handle `$unset`s
            _oplogEntry;
            var _$unset;
            (_$unset = (_oplogEntry = oplogEntry).$unset) !== null && _$unset !== void 0 ? _$unset : _oplogEntry.$unset = {};
            Object.keys(value).forEach((key)=>{
                oplogEntry.$unset[join(prefix, key)] = true;
            });
        } else if (diffKey === 'i') {
            var // Handle (potentially) nested `$set`s
            _oplogEntry1;
            var _$set;
            (_$set = (_oplogEntry1 = oplogEntry).$set) !== null && _$set !== void 0 ? _$set : _oplogEntry1.$set = {};
            flattenObjectInto(oplogEntry.$set, value, prefix);
        } else if (diffKey === 'u') {
            var // Handle flat `$set`s
            _oplogEntry2;
            var _$set1;
            (_$set1 = (_oplogEntry2 = oplogEntry).$set) !== null && _$set1 !== void 0 ? _$set1 : _oplogEntry2.$set = {};
            Object.entries(value).forEach(([key, fieldValue])=>{
                oplogEntry.$set[join(prefix, key)] = fieldValue;
            });
        } else if (diffKey.startsWith('s')) {
            // Handle s-fields (array operations and nested objects)
            const key = diffKey.slice(1);
            if (isArrayOperator(value)) {
                // Array operator
                Object.entries(value).forEach(([position, fieldValue])=>{
                    if (position === 'a') return;
                    const positionKey = join(prefix, `${key}.${position.slice(1)}`);
                    if (position[0] === 's') {
                        convertOplogDiff(oplogEntry, fieldValue, positionKey);
                    } else if (fieldValue === null) {
                        var _oplogEntry;
                        var _$unset;
                        (_$unset = (_oplogEntry = oplogEntry).$unset) !== null && _$unset !== void 0 ? _$unset : _oplogEntry.$unset = {};
                        oplogEntry.$unset[positionKey] = true;
                    } else {
                        var _oplogEntry1;
                        var _$set;
                        (_$set = (_oplogEntry1 = oplogEntry).$set) !== null && _$set !== void 0 ? _$set : _oplogEntry1.$set = {};
                        oplogEntry.$set[positionKey] = fieldValue;
                    }
                });
            } else if (key) {
                // Nested object
                convertOplogDiff(oplogEntry, value, join(prefix, key));
            }
        }
    });
}
/**
 * Converts a MongoDB v2 oplog entry to v1 format.
 * Returns the original entry unchanged if it's not a v2 oplog entry
 * or doesn't contain a diff field.
 *
 * The converted entry will contain $set and $unset operations that are
 * equivalent to the v2 diff format, with paths flattened to dot notation
 * and special handling for EJSON custom types and ObjectIDs.
 */ function oplogV2V1Converter(oplogEntry) {
    if (oplogEntry.$v !== 2 || !oplogEntry.diff) {
        return oplogEntry;
    }
    const convertedOplogEntry = {
        $v: 2
    };
    convertOplogDiff(convertedOplogEntry, oplogEntry.diff);
    return convertedOplogEntry;
}
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"cursor_description.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/cursor_description.ts                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({CursorDescription:()=>CursorDescription});let _define_property;module.link("@swc/helpers/_/_define_property",{_(v){_define_property=v}},0);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
/**
 * Represents the arguments used to construct a cursor.
 * Used as a key for cursor de-duplication.
 *
 * All properties must be either:
 * - JSON-stringifiable, or
 * - Not affect observeChanges output (e.g., options.transform functions)
 */ class CursorDescription {
    constructor(collectionName, selector, options){
        _define_property(this, "collectionName", void 0);
        _define_property(this, "selector", void 0);
        _define_property(this, "options", void 0);
        this.collectionName = collectionName;
        // @ts-ignore
        this.selector = Mongo.Collection._rewriteSelector(selector);
        this.options = options || {};
    }
}
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"mongo_connection.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/mongo_connection.js                                                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({MongoConnection:()=>MongoConnection},true);let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);let _object_spread;module.link("@swc/helpers/_/_object_spread",{_(v){_object_spread=v}},1);let Meteor;module.link('meteor/meteor',{Meteor(v){Meteor=v}},2);let CLIENT_ONLY_METHODS,getAsyncMethodName;module.link('meteor/minimongo/constants',{CLIENT_ONLY_METHODS(v){CLIENT_ONLY_METHODS=v},getAsyncMethodName(v){getAsyncMethodName=v}},3);let MiniMongoQueryError;module.link('meteor/minimongo/common',{MiniMongoQueryError(v){MiniMongoQueryError=v}},4);let path;module.link('path',{default(v){path=v}},5);let AsynchronousCursor;module.link('./asynchronous_cursor',{AsynchronousCursor(v){AsynchronousCursor=v}},6);let Cursor;module.link('./cursor',{Cursor(v){Cursor=v}},7);let CursorDescription;module.link('./cursor_description',{CursorDescription(v){CursorDescription=v}},8);let DocFetcher;module.link('./doc_fetcher',{DocFetcher(v){DocFetcher=v}},9);let MongoDB,replaceMeteorAtomWithMongo,replaceTypes,transformResult;module.link('./mongo_common',{MongoDB(v){MongoDB=v},replaceMeteorAtomWithMongo(v){replaceMeteorAtomWithMongo=v},replaceTypes(v){replaceTypes=v},transformResult(v){transformResult=v}},10);let ObserveHandle;module.link('./observe_handle',{ObserveHandle(v){ObserveHandle=v}},11);let ObserveMultiplexer;module.link('./observe_multiplex',{ObserveMultiplexer(v){ObserveMultiplexer=v}},12);let OplogObserveDriver;module.link('./oplog_observe_driver',{OplogObserveDriver(v){OplogObserveDriver=v}},13);let OPLOG_COLLECTION,OplogHandle;module.link('./oplog_tailing',{OPLOG_COLLECTION(v){OPLOG_COLLECTION=v},OplogHandle(v){OplogHandle=v}},14);let PollingObserveDriver;module.link('./polling_observe_driver',{PollingObserveDriver(v){PollingObserveDriver=v}},15);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();















const FILE_ASSET_SUFFIX = 'Asset';
const ASSETS_FOLDER = 'assets';
const APP_FOLDER = 'app';
const oplogCollectionWarnings = [];
const MongoConnection = function(url, options) {
    var _Meteor_settings_packages_mongo, _Meteor_settings_packages, _Meteor_settings;
    var self = this;
    options = options || {};
    self._observeMultiplexers = {};
    self._onFailoverHook = new Hook;
    const userOptions = _object_spread({}, Mongo._connectionOptions || {}, ((_Meteor_settings = Meteor.settings) === null || _Meteor_settings === void 0 ? void 0 : (_Meteor_settings_packages = _Meteor_settings.packages) === null || _Meteor_settings_packages === void 0 ? void 0 : (_Meteor_settings_packages_mongo = _Meteor_settings_packages.mongo) === null || _Meteor_settings_packages_mongo === void 0 ? void 0 : _Meteor_settings_packages_mongo.options) || {});
    var mongoOptions = Object.assign({
        ignoreUndefined: true
    }, userOptions);
    // Internally the oplog connections specify their own maxPoolSize
    // which we don't want to overwrite with any user defined value
    if ('maxPoolSize' in options) {
        // If we just set this for "server", replSet will override it. If we just
        // set it for replSet, it will be ignored if we're not using a replSet.
        mongoOptions.maxPoolSize = options.maxPoolSize;
    }
    if ('minPoolSize' in options) {
        mongoOptions.minPoolSize = options.minPoolSize;
    }
    // Transform options like "tlsCAFileAsset": "filename.pem" into
    // "tlsCAFile": "/<fullpath>/filename.pem"
    Object.entries(mongoOptions || {}).filter(([key])=>key && key.endsWith(FILE_ASSET_SUFFIX)).forEach(([key, value])=>{
        const optionName = key.replace(FILE_ASSET_SUFFIX, '');
        mongoOptions[optionName] = path.join(Assets.getServerDir(), ASSETS_FOLDER, APP_FOLDER, value);
        delete mongoOptions[key];
    });
    self.db = null;
    self._oplogHandle = null;
    self._docFetcher = null;
    mongoOptions.driverInfo = {
        name: 'Meteor',
        version: Meteor.release
    };
    self.client = new MongoDB.MongoClient(url, mongoOptions);
    self.db = self.client.db();
    self.client.on('serverDescriptionChanged', Meteor.bindEnvironment((event)=>{
        // When the connection is no longer against the primary node, execute all
        // failover hooks. This is important for the driver as it has to re-pool the
        // query when it happens.
        if (event.previousDescription.type !== 'RSPrimary' && event.newDescription.type === 'RSPrimary') {
            self._onFailoverHook.each((callback1)=>{
                callback1();
                return true;
            });
        }
    }));
    if (options.oplogUrl && !Package['disable-oplog']) {
        self._oplogHandle = new OplogHandle(options.oplogUrl, self.db.databaseName);
        self._docFetcher = new DocFetcher(self);
    }
};
MongoConnection.prototype._close = function() {
    return _async_to_generator(function*() {
        var self = this;
        if (!self.db) throw Error("close called before Connection created?");
        // XXX probably untested
        var oplogHandle = self._oplogHandle;
        self._oplogHandle = null;
        if (oplogHandle) yield oplogHandle.stop();
        // Use Future.wrap so that errors get thrown. This happens to
        // work even outside a fiber since the 'close' method is not
        // actually asynchronous.
        yield self.client.close();
    }).call(this);
};
MongoConnection.prototype.close = function() {
    return this._close();
};
MongoConnection.prototype._setOplogHandle = function(oplogHandle) {
    this._oplogHandle = oplogHandle;
    return this;
};
// Returns the Mongo Collection object; may yield.
MongoConnection.prototype.rawCollection = function(collectionName) {
    var self = this;
    if (!self.db) throw Error("rawCollection called before Connection created?");
    return self.db.collection(collectionName);
};
MongoConnection.prototype.createCappedCollectionAsync = function(collectionName, byteSize, maxDocuments) {
    return _async_to_generator(function*() {
        var self = this;
        if (!self.db) throw Error("createCappedCollectionAsync called before Connection created?");
        yield self.db.createCollection(collectionName, {
            capped: true,
            size: byteSize,
            max: maxDocuments
        });
    }).call(this);
};
// This should be called synchronously with a write, to create a
// transaction on the current write fence, if any. After we can read
// the write, and after observers have been notified (or at least,
// after the observer notifiers have added themselves to the write
// fence), you should call 'committed()' on the object returned.
MongoConnection.prototype._maybeBeginWrite = function() {
    const fence = DDPServer._getCurrentFence();
    if (fence) {
        return fence.beginWrite();
    } else {
        return {
            committed: function() {}
        };
    }
};
// Internal interface: adds a callback which is called when the Mongo primary
// changes. Returns a stop handle.
MongoConnection.prototype._onFailover = function(callback1) {
    return this._onFailoverHook.register(callback1);
};
MongoConnection.prototype.insertAsync = function(collection_name, document) {
    return _async_to_generator(function*() {
        const self = this;
        if (collection_name === "___meteor_failure_test_collection") {
            const e = new Error("Failure test");
            e._expectedByTest = true;
            throw e;
        }
        if (!(LocalCollection._isPlainObject(document) && !EJSON._isCustomType(document))) {
            throw new Error("Only plain objects may be inserted into MongoDB");
        }
        var write = self._maybeBeginWrite();
        var refresh = function() {
            return _async_to_generator(function*() {
                yield Meteor.refresh({
                    collection: collection_name,
                    id: document._id
                });
            })();
        };
        return self.rawCollection(collection_name).insertOne(replaceTypes(document, replaceMeteorAtomWithMongo), {
            safe: true
        }).then(({ insertedId })=>_async_to_generator(function*() {
                yield refresh();
                yield write.committed();
                return insertedId;
            })()).catch((e)=>_async_to_generator(function*() {
                yield write.committed();
                throw e;
            })());
    }).call(this);
};
// Cause queries that may be affected by the selector to poll in this write
// fence.
MongoConnection.prototype._refresh = function(collectionName, selector) {
    return _async_to_generator(function*() {
        var refreshKey = {
            collection: collectionName
        };
        // If we know which documents we're removing, don't poll queries that are
        // specific to other documents. (Note that multiple notifications here should
        // not cause multiple polls, since all our listener is doing is enqueueing a
        // poll.)
        var specificIds = LocalCollection._idsMatchedBySelector(selector);
        if (specificIds) {
            for (const id of specificIds){
                yield Meteor.refresh(Object.assign({
                    id: id
                }, refreshKey));
            }
            ;
        } else {
            yield Meteor.refresh(refreshKey);
        }
    })();
};
MongoConnection.prototype.removeAsync = function(collection_name, selector) {
    return _async_to_generator(function*() {
        var self = this;
        if (collection_name === "___meteor_failure_test_collection") {
            var e = new Error("Failure test");
            e._expectedByTest = true;
            throw e;
        }
        var write = self._maybeBeginWrite();
        var refresh = function() {
            return _async_to_generator(function*() {
                yield self._refresh(collection_name, selector);
            })();
        };
        return self.rawCollection(collection_name).deleteMany(replaceTypes(selector, replaceMeteorAtomWithMongo), {
            safe: true
        }).then(({ deletedCount })=>_async_to_generator(function*() {
                yield refresh();
                yield write.committed();
                return transformResult({
                    result: {
                        modifiedCount: deletedCount
                    }
                }).numberAffected;
            })()).catch((err)=>_async_to_generator(function*() {
                yield write.committed();
                throw err;
            })());
    }).call(this);
};
MongoConnection.prototype.dropCollectionAsync = function(collectionName) {
    return _async_to_generator(function*() {
        var self = this;
        var write = self._maybeBeginWrite();
        var refresh = function() {
            return Meteor.refresh({
                collection: collectionName,
                id: null,
                dropCollection: true
            });
        };
        return self.rawCollection(collectionName).drop().then((result)=>_async_to_generator(function*() {
                yield refresh();
                yield write.committed();
                return result;
            })()).catch((e)=>_async_to_generator(function*() {
                yield write.committed();
                throw e;
            })());
    }).call(this);
};
// For testing only.  Slightly better than `c.rawDatabase().dropDatabase()`
// because it lets the test's fence wait for it to be complete.
MongoConnection.prototype.dropDatabaseAsync = function() {
    return _async_to_generator(function*() {
        var self = this;
        var write = self._maybeBeginWrite();
        var refresh = function() {
            return _async_to_generator(function*() {
                yield Meteor.refresh({
                    dropDatabase: true
                });
            })();
        };
        try {
            yield self.db._dropDatabase();
            yield refresh();
            yield write.committed();
        } catch (e) {
            yield write.committed();
            throw e;
        }
    }).call(this);
};
MongoConnection.prototype.updateAsync = function(collection_name, selector, mod, options) {
    return _async_to_generator(function*() {
        var self = this;
        if (collection_name === "___meteor_failure_test_collection") {
            var e = new Error("Failure test");
            e._expectedByTest = true;
            throw e;
        }
        // explicit safety check. null and undefined can crash the mongo
        // driver. Although the node driver and minimongo do 'support'
        // non-object modifier in that they don't crash, they are not
        // meaningful operations and do not do anything. Defensively throw an
        // error here.
        if (!mod || typeof mod !== 'object') {
            const error = new Error("Invalid modifier. Modifier must be an object.");
            throw error;
        }
        if (!(LocalCollection._isPlainObject(mod) && !EJSON._isCustomType(mod))) {
            const error = new Error("Only plain objects may be used as replacement" + " documents in MongoDB");
            throw error;
        }
        if (!options) options = {};
        var write = self._maybeBeginWrite();
        var refresh = function() {
            return _async_to_generator(function*() {
                yield self._refresh(collection_name, selector);
            })();
        };
        var collection = self.rawCollection(collection_name);
        var mongoOpts = {
            safe: true
        };
        // Add support for filtered positional operator
        if (options.arrayFilters !== undefined) mongoOpts.arrayFilters = options.arrayFilters;
        // explictly enumerate options that minimongo supports
        if (options.upsert) mongoOpts.upsert = true;
        if (options.multi) mongoOpts.multi = true;
        // Lets you get a more more full result from MongoDB. Use with caution:
        // might not work with C.upsert (as opposed to C.update({upsert:true}) or
        // with simulated upsert.
        if (options.fullResult) mongoOpts.fullResult = true;
        var mongoSelector = replaceTypes(selector, replaceMeteorAtomWithMongo);
        var mongoMod = replaceTypes(mod, replaceMeteorAtomWithMongo);
        var isModify = LocalCollection._isModificationMod(mongoMod);
        if (options._forbidReplace && !isModify) {
            var err = new Error("Invalid modifier. Replacements are forbidden.");
            throw err;
        }
        // We've already run replaceTypes/replaceMeteorAtomWithMongo on
        // selector and mod.  We assume it doesn't matter, as far as
        // the behavior of modifiers is concerned, whether `_modify`
        // is run on EJSON or on mongo-converted EJSON.
        // Run this code up front so that it fails fast if someone uses
        // a Mongo update operator we don't support.
        let knownId;
        if (options.upsert) {
            try {
                let newDoc = LocalCollection._createUpsertDocument(selector, mod);
                knownId = newDoc._id;
            } catch (err) {
                throw err;
            }
        }
        if (options.upsert && !isModify && !knownId && options.insertedId && !(options.insertedId instanceof Mongo.ObjectID && options.generatedId)) {
            // In case of an upsert with a replacement, where there is no _id defined
            // in either the query or the replacement doc, mongo will generate an id itself.
            // Therefore we need this special strategy if we want to control the id ourselves.
            // We don't need to do this when:
            // - This is not a replacement, so we can add an _id to $setOnInsert
            // - The id is defined by query or mod we can just add it to the replacement doc
            // - The user did not specify any id preference and the id is a Mongo ObjectId,
            //     then we can just let Mongo generate the id
            return yield simulateUpsertWithInsertedId(collection, mongoSelector, mongoMod, options).then((result)=>_async_to_generator(function*() {
                    yield refresh();
                    yield write.committed();
                    if (result && !options._returnObject) {
                        return result.numberAffected;
                    } else {
                        return result;
                    }
                })());
        } else {
            if (options.upsert && !knownId && options.insertedId && isModify) {
                if (!mongoMod.hasOwnProperty('$setOnInsert')) {
                    mongoMod.$setOnInsert = {};
                }
                knownId = options.insertedId;
                Object.assign(mongoMod.$setOnInsert, replaceTypes({
                    _id: options.insertedId
                }, replaceMeteorAtomWithMongo));
            }
            const strings = Object.keys(mongoMod).filter((key)=>!key.startsWith("$"));
            let updateMethod = strings.length > 0 ? 'replaceOne' : 'updateMany';
            updateMethod = updateMethod === 'updateMany' && !mongoOpts.multi ? 'updateOne' : updateMethod;
            return collection[updateMethod].bind(collection)(mongoSelector, mongoMod, mongoOpts).then((result)=>_async_to_generator(function*() {
                    var meteorResult = transformResult({
                        result
                    });
                    if (meteorResult && options._returnObject) {
                        // If this was an upsertAsync() call, and we ended up
                        // inserting a new doc and we know its id, then
                        // return that id as well.
                        if (options.upsert && meteorResult.insertedId) {
                            if (knownId) {
                                meteorResult.insertedId = knownId;
                            } else if (meteorResult.insertedId instanceof MongoDB.ObjectId) {
                                meteorResult.insertedId = new Mongo.ObjectID(meteorResult.insertedId.toHexString());
                            }
                        }
                        yield refresh();
                        yield write.committed();
                        return meteorResult;
                    } else {
                        yield refresh();
                        yield write.committed();
                        return meteorResult.numberAffected;
                    }
                })()).catch((err)=>_async_to_generator(function*() {
                    yield write.committed();
                    throw err;
                })());
        }
    }).call(this);
};
// exposed for testing
MongoConnection._isCannotChangeIdError = function(err) {
    // Mongo 3.2.* returns error as next Object:
    // {name: String, code: Number, errmsg: String}
    // Older Mongo returns:
    // {name: String, code: Number, err: String}
    var error = err.errmsg || err.err;
    // We don't use the error code here
    // because the error code we observed it producing (16837) appears to be
    // a far more generic error code based on examining the source.
    if (error.indexOf('The _id field cannot be changed') === 0 || error.indexOf("the (immutable) field '_id' was found to have been altered to _id") !== -1) {
        return true;
    }
    return false;
};
// XXX MongoConnection.upsertAsync() does not return the id of the inserted document
// unless you set it explicitly in the selector or modifier (as a replacement
// doc).
MongoConnection.prototype.upsertAsync = function(collectionName, selector, mod, options) {
    return _async_to_generator(function*() {
        var self = this;
        if (typeof options === "function" && !callback) {
            callback = options;
            options = {};
        }
        return self.updateAsync(collectionName, selector, mod, Object.assign({}, options, {
            upsert: true,
            _returnObject: true
        }));
    }).call(this);
};
MongoConnection.prototype.find = function(collectionName, selector, options) {
    var self = this;
    if (arguments.length === 1) selector = {};
    return new Cursor(self, new CursorDescription(collectionName, selector, options));
};
MongoConnection.prototype.findOneAsync = function(_0, _1, _2) {
    return _async_to_generator(function*(collection_name, selector, options) {
        var self = this;
        if (arguments.length === 1) {
            selector = {};
        }
        options = options || {};
        options.limit = 1;
        const results = yield self.find(collection_name, selector, options).fetch();
        return results[0];
    }).apply(this, arguments);
};
// We'll actually design an index API later. For now, we just pass through to
// Mongo's, but make it synchronous.
MongoConnection.prototype.createIndexAsync = function(collectionName, index, options) {
    return _async_to_generator(function*() {
        var self = this;
        // We expect this function to be called at startup, not from within a method,
        // so we don't interact with the write fence.
        var collection = self.rawCollection(collectionName);
        yield collection.createIndex(index, options);
    }).call(this);
};
// just to be consistent with the other methods
MongoConnection.prototype.createIndex = MongoConnection.prototype.createIndexAsync;
MongoConnection.prototype.countDocuments = function(collectionName, ...args) {
    args = args.map((arg)=>replaceTypes(arg, replaceMeteorAtomWithMongo));
    const collection = this.rawCollection(collectionName);
    return collection.countDocuments(...args);
};
MongoConnection.prototype.estimatedDocumentCount = function(collectionName, ...args) {
    args = args.map((arg)=>replaceTypes(arg, replaceMeteorAtomWithMongo));
    const collection = this.rawCollection(collectionName);
    return collection.estimatedDocumentCount(...args);
};
MongoConnection.prototype.ensureIndexAsync = MongoConnection.prototype.createIndexAsync;
MongoConnection.prototype.dropIndexAsync = function(collectionName, index) {
    return _async_to_generator(function*() {
        var self = this;
        // This function is only used by test code, not within a method, so we don't
        // interact with the write fence.
        var collection = self.rawCollection(collectionName);
        var indexName = yield collection.dropIndex(index);
    }).call(this);
};
CLIENT_ONLY_METHODS.forEach(function(m) {
    MongoConnection.prototype[m] = function() {
        throw new Error(`${m} +  is not available on the server. Please use ${getAsyncMethodName(m)}() instead.`);
    };
});
var NUM_OPTIMISTIC_TRIES = 3;
var simulateUpsertWithInsertedId = function(collection, selector, mod, options) {
    return _async_to_generator(function*() {
        // STRATEGY: First try doing an upsert with a generated ID.
        // If this throws an error about changing the ID on an existing document
        // then without affecting the database, we know we should probably try
        // an update without the generated ID. If it affected 0 documents,
        // then without affecting the database, we the document that first
        // gave the error is probably removed and we need to try an insert again
        // We go back to step one and repeat.
        // Like all "optimistic write" schemes, we rely on the fact that it's
        // unlikely our writes will continue to be interfered with under normal
        // circumstances (though sufficiently heavy contention with writers
        // disagreeing on the existence of an object will cause writes to fail
        // in theory).
        var insertedId = options.insertedId; // must exist
        var mongoOptsForUpdate = {
            safe: true,
            multi: options.multi
        };
        var mongoOptsForInsert = {
            safe: true,
            upsert: true
        };
        var replacementWithId = Object.assign(replaceTypes({
            _id: insertedId
        }, replaceMeteorAtomWithMongo), mod);
        var tries = NUM_OPTIMISTIC_TRIES;
        var doUpdate = function() {
            return _async_to_generator(function*() {
                tries--;
                if (!tries) {
                    throw new Error("Upsert failed after " + NUM_OPTIMISTIC_TRIES + " tries.");
                } else {
                    let method = collection.updateMany;
                    if (!Object.keys(mod).some((key)=>key.startsWith("$"))) {
                        method = collection.replaceOne.bind(collection);
                    }
                    return method(selector, mod, mongoOptsForUpdate).then((result)=>{
                        if (result && (result.modifiedCount || result.upsertedCount)) {
                            return {
                                numberAffected: result.modifiedCount || result.upsertedCount,
                                insertedId: result.upsertedId || undefined
                            };
                        } else {
                            return doConditionalInsert();
                        }
                    });
                }
            })();
        };
        var doConditionalInsert = function() {
            return collection.replaceOne(selector, replacementWithId, mongoOptsForInsert).then((result)=>({
                    numberAffected: result.upsertedCount,
                    insertedId: result.upsertedId
                })).catch((err)=>{
                if (MongoConnection._isCannotChangeIdError(err)) {
                    return doUpdate();
                } else {
                    throw err;
                }
            });
        };
        return doUpdate();
    })();
};
// observeChanges for tailable cursors on capped collections.
//
// Some differences from normal cursors:
//   - Will never produce anything other than 'added' or 'addedBefore'. If you
//     do update a document that has already been produced, this will not notice
//     it.
//   - If you disconnect and reconnect from Mongo, it will essentially restart
//     the query, which will lead to duplicate results. This is pretty bad,
//     but if you include a field called 'ts' which is inserted as
//     new MongoInternals.MongoTimestamp(0, 0) (which is initialized to the
//     current Mongo-style timestamp), we'll be able to find the place to
//     restart properly. (This field is specifically understood by Mongo with an
//     optimization which allows it to find the right place to start without
//     an index on ts. It's how the oplog works.)
//   - No callbacks are triggered synchronously with the call (there's no
//     differentiation between "initial data" and "later changes"; everything
//     that matches the query gets sent asynchronously).
//   - De-duplication is not implemented.
//   - Does not yet interact with the write fence. Probably, this should work by
//     ignoring removes (which don't work on capped collections) and updates
//     (which don't affect tailable cursors), and just keeping track of the ID
//     of the inserted object, and closing the write fence once you get to that
//     ID (or timestamp?).  This doesn't work well if the document doesn't match
//     the query, though.  On the other hand, the write fence can close
//     immediately if it does not match the query. So if we trust minimongo
//     enough to accurately evaluate the query against the write fence, we
//     should be able to do this...  Of course, minimongo doesn't even support
//     Mongo Timestamps yet.
MongoConnection.prototype._observeChangesTailable = function(cursorDescription, ordered, callbacks) {
    var self = this;
    // Tailable cursors only ever call added/addedBefore callbacks, so it's an
    // error if you didn't provide them.
    if (ordered && !callbacks.addedBefore || !ordered && !callbacks.added) {
        throw new Error("Can't observe an " + (ordered ? "ordered" : "unordered") + " tailable cursor without a " + (ordered ? "addedBefore" : "added") + " callback");
    }
    return self.tail(cursorDescription, function(doc) {
        var id = doc._id;
        delete doc._id;
        // The ts is an implementation detail. Hide it.
        delete doc.ts;
        if (ordered) {
            callbacks.addedBefore(id, doc, null);
        } else {
            callbacks.added(id, doc);
        }
    });
};
MongoConnection.prototype._createAsynchronousCursor = function(cursorDescription, options = {}) {
    var self = this;
    const { selfForIteration, useTransform } = options;
    options = {
        selfForIteration,
        useTransform
    };
    var collection = self.rawCollection(cursorDescription.collectionName);
    var cursorOptions = cursorDescription.options;
    var mongoOptions = {
        sort: cursorOptions.sort,
        limit: cursorOptions.limit,
        skip: cursorOptions.skip,
        projection: cursorOptions.fields || cursorOptions.projection,
        readPreference: cursorOptions.readPreference
    };
    // Do we want a tailable cursor (which only works on capped collections)?
    if (cursorOptions.tailable) {
        mongoOptions.numberOfRetries = -1;
    }
    var dbCursor = collection.find(replaceTypes(cursorDescription.selector, replaceMeteorAtomWithMongo), mongoOptions);
    // Do we want a tailable cursor (which only works on capped collections)?
    if (cursorOptions.tailable) {
        // We want a tailable cursor...
        dbCursor.addCursorFlag("tailable", true);
        // ... and for the server to wait a bit if any getMore has no data (rather
        // than making us put the relevant sleeps in the client)...
        dbCursor.addCursorFlag("awaitData", true);
        // And if this is on the oplog collection and the cursor specifies a 'ts',
        // then set the undocumented oplog replay flag, which does a special scan to
        // find the first document (instead of creating an index on ts). This is a
        // very hard-coded Mongo flag which only works on the oplog collection and
        // only works with the ts field.
        if (cursorDescription.collectionName === OPLOG_COLLECTION && cursorDescription.selector.ts) {
            dbCursor.addCursorFlag("oplogReplay", true);
        }
    }
    if (typeof cursorOptions.maxTimeMs !== 'undefined') {
        dbCursor = dbCursor.maxTimeMS(cursorOptions.maxTimeMs);
    }
    if (typeof cursorOptions.hint !== 'undefined') {
        dbCursor = dbCursor.hint(cursorOptions.hint);
    }
    return new AsynchronousCursor(dbCursor, cursorDescription, options, collection);
};
// Tails the cursor described by cursorDescription, most likely on the
// oplog. Calls docCallback with each document found. Ignores errors and just
// restarts the tail on error.
//
// If timeoutMS is set, then if we don't get a new document every timeoutMS,
// kill and restart the cursor. This is primarily a workaround for #8598.
MongoConnection.prototype.tail = function(cursorDescription, docCallback, timeoutMS) {
    var self = this;
    if (!cursorDescription.options.tailable) throw new Error("Can only tail a tailable cursor");
    var cursor = self._createAsynchronousCursor(cursorDescription);
    var stopped = false;
    var lastTS;
    Meteor.defer(function loop() {
        return _async_to_generator(function*() {
            var doc = null;
            while(true){
                if (stopped) return;
                try {
                    doc = yield cursor._nextObjectPromiseWithTimeout(timeoutMS);
                } catch (err) {
                    // We should not ignore errors here unless we want to spend a lot of time debugging
                    console.error(err);
                    // There's no good way to figure out if this was actually an error from
                    // Mongo, or just client-side (including our own timeout error). Ah
                    // well. But either way, we need to retry the cursor (unless the failure
                    // was because the observe got stopped).
                    doc = null;
                }
                // Since we awaited a promise above, we need to check again to see if
                // we've been stopped before calling the callback.
                if (stopped) return;
                if (doc) {
                    // If a tailable cursor contains a "ts" field, use it to recreate the
                    // cursor on error. ("ts" is a standard that Mongo uses internally for
                    // the oplog, and there's a special flag that lets you do binary search
                    // on it instead of needing to use an index.)
                    lastTS = doc.ts;
                    docCallback(doc);
                } else {
                    var newSelector = Object.assign({}, cursorDescription.selector);
                    if (lastTS) {
                        newSelector.ts = {
                            $gt: lastTS
                        };
                    }
                    cursor = self._createAsynchronousCursor(new CursorDescription(cursorDescription.collectionName, newSelector, cursorDescription.options));
                    // Mongo failover takes many seconds.  Retry in a bit.  (Without this
                    // setTimeout, we peg the CPU at 100% and never notice the actual
                    // failover.
                    setTimeout(loop, 100);
                    break;
                }
            }
        })();
    });
    return {
        stop: function() {
            stopped = true;
            cursor.close();
        }
    };
};
Object.assign(MongoConnection.prototype, {
    _observeChanges: function(cursorDescription, ordered, callbacks, nonMutatingCallbacks) {
        return _async_to_generator(function*() {
            var _self__oplogHandle;
            var self = this;
            const collectionName = cursorDescription.collectionName;
            if (cursorDescription.options.tailable) {
                return self._observeChangesTailable(cursorDescription, ordered, callbacks);
            }
            // You may not filter out _id when observing changes, because the id is a core
            // part of the observeChanges API.
            const fieldsOptions = cursorDescription.options.projection || cursorDescription.options.fields;
            if (fieldsOptions && (fieldsOptions._id === 0 || fieldsOptions._id === false)) {
                throw Error("You may not observe a cursor with {fields: {_id: 0}}");
            }
            var observeKey = EJSON.stringify(Object.assign({
                ordered: ordered
            }, cursorDescription));
            var multiplexer, observeDriver;
            var firstHandle = false;
            // Find a matching ObserveMultiplexer, or create a new one. This next block is
            // guaranteed to not yield (and it doesn't call anything that can observe a
            // new query), so no other calls to this function can interleave with it.
            if (observeKey in self._observeMultiplexers) {
                multiplexer = self._observeMultiplexers[observeKey];
            } else {
                firstHandle = true;
                // Create a new ObserveMultiplexer.
                multiplexer = new ObserveMultiplexer({
                    ordered: ordered,
                    onStop: function() {
                        delete self._observeMultiplexers[observeKey];
                        return observeDriver.stop();
                    }
                });
            }
            var observeHandle = new ObserveHandle(multiplexer, callbacks, nonMutatingCallbacks);
            const oplogOptions = (self === null || self === void 0 ? void 0 : (_self__oplogHandle = self._oplogHandle) === null || _self__oplogHandle === void 0 ? void 0 : _self__oplogHandle._oplogOptions) || {};
            const { includeCollections, excludeCollections } = oplogOptions;
            if (firstHandle) {
                var matcher, sorter;
                var canUseOplog = [
                    function() {
                        // At a bare minimum, using the oplog requires us to have an oplog, to
                        // want unordered callbacks, and to not want a callback on the polls
                        // that won't happen.
                        return self._oplogHandle && !ordered && !callbacks._testOnlyPollCallback;
                    },
                    function() {
                        // We also need to check, if the collection of this Cursor is actually being "watched" by the Oplog handle
                        // if not, we have to fallback to long polling
                        if ((excludeCollections === null || excludeCollections === void 0 ? void 0 : excludeCollections.length) && excludeCollections.includes(collectionName)) {
                            if (!oplogCollectionWarnings.includes(collectionName)) {
                                console.warn(`Meteor.settings.packages.mongo.oplogExcludeCollections includes the collection ${collectionName} - your subscriptions will only use long polling!`);
                                oplogCollectionWarnings.push(collectionName); // we only want to show the warnings once per collection!
                            }
                            return false;
                        }
                        if ((includeCollections === null || includeCollections === void 0 ? void 0 : includeCollections.length) && !includeCollections.includes(collectionName)) {
                            if (!oplogCollectionWarnings.includes(collectionName)) {
                                console.warn(`Meteor.settings.packages.mongo.oplogIncludeCollections does not include the collection ${collectionName} - your subscriptions will only use long polling!`);
                                oplogCollectionWarnings.push(collectionName); // we only want to show the warnings once per collection!
                            }
                            return false;
                        }
                        return true;
                    },
                    function() {
                        // We need to be able to compile the selector. Fall back to polling for
                        // some newfangled $selector that minimongo doesn't support yet.
                        try {
                            matcher = new Minimongo.Matcher(cursorDescription.selector);
                            return true;
                        } catch (e) {
                            // XXX make all compilation errors MinimongoError or something
                            //     so that this doesn't ignore unrelated exceptions
                            if (Meteor.isClient && e instanceof MiniMongoQueryError) {
                                throw e;
                            }
                            return false;
                        }
                    },
                    function() {
                        // ... and the selector itself needs to support oplog.
                        return OplogObserveDriver.cursorSupported(cursorDescription, matcher);
                    },
                    function() {
                        // And we need to be able to compile the sort, if any.  eg, can't be
                        // {$natural: 1}.
                        if (!cursorDescription.options.sort) return true;
                        try {
                            sorter = new Minimongo.Sorter(cursorDescription.options.sort);
                            return true;
                        } catch (e) {
                            // XXX make all compilation errors MinimongoError or something
                            //     so that this doesn't ignore unrelated exceptions
                            return false;
                        }
                    }
                ].every((f)=>f()); // invoke each function and check if all return true
                var driverClass = canUseOplog ? OplogObserveDriver : PollingObserveDriver;
                observeDriver = new driverClass({
                    cursorDescription: cursorDescription,
                    mongoHandle: self,
                    multiplexer: multiplexer,
                    ordered: ordered,
                    matcher: matcher,
                    sorter: sorter,
                    _testOnlyPollCallback: callbacks._testOnlyPollCallback
                });
                if (observeDriver._init) {
                    yield observeDriver._init();
                }
                // This field is only set for use in tests.
                multiplexer._observeDriver = observeDriver;
            }
            self._observeMultiplexers[observeKey] = multiplexer;
            // Blocks until the initial adds have been sent.
            yield multiplexer.addHandleAndSendInitialAdds(observeHandle);
            return observeHandle;
        }).call(this);
    }
});
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"mongo_common.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/mongo_common.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({replaceNames:()=>replaceNames});module.export({MongoDB:()=>MongoDB,writeCallback:()=>writeCallback,transformResult:()=>transformResult,replaceMeteorAtomWithMongo:()=>replaceMeteorAtomWithMongo,replaceTypes:()=>replaceTypes,replaceMongoAtomWithMeteor:()=>replaceMongoAtomWithMeteor},true);let clone;module.link('lodash.clone',{default(v){clone=v}},0);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
/** @type {import('mongodb')} */ const MongoDB = Object.assign(NpmModuleMongodb, {
    ObjectID: NpmModuleMongodb.ObjectId
});
// The write methods block until the database has confirmed the write (it may
// not be replicated or stable on disk, but one server has confirmed it) if no
// callback is provided. If a callback is provided, then they call the callback
// when the write is confirmed. They return nothing on success, and raise an
// exception on failure.
//
// After making a write (with insert, update, remove), observers are
// notified asynchronously. If you want to receive a callback once all
// of the observer notifications have landed for your write, do the
// writes inside a write fence (set DDPServer._CurrentWriteFence to a new
// _WriteFence, and then set a callback on the write fence.)
//
// Since our execution environment is single-threaded, this is
// well-defined -- a write "has been made" if it's returned, and an
// observer "has been notified" if its callback has returned.
const writeCallback = function(write, refresh, callback) {
    return function(err, result) {
        if (!err) {
            // XXX We don't have to run this on error, right?
            try {
                refresh();
            } catch (refreshErr) {
                if (callback) {
                    callback(refreshErr);
                    return;
                } else {
                    throw refreshErr;
                }
            }
        }
        write.committed();
        if (callback) {
            callback(err, result);
        } else if (err) {
            throw err;
        }
    };
};
const transformResult = function(driverResult) {
    var meteorResult = {
        numberAffected: 0
    };
    if (driverResult) {
        var mongoResult = driverResult.result;
        // On updates with upsert:true, the inserted values come as a list of
        // upserted values -- even with options.multi, when the upsert does insert,
        // it only inserts one element.
        if (mongoResult.upsertedCount) {
            meteorResult.numberAffected = mongoResult.upsertedCount;
            if (mongoResult.upsertedId) {
                meteorResult.insertedId = mongoResult.upsertedId;
            }
        } else {
            // n was used before Mongo 5.0, in Mongo 5.0 we are not receiving this n
            // field and so we are using modifiedCount instead
            meteorResult.numberAffected = mongoResult.n || mongoResult.matchedCount || mongoResult.modifiedCount;
        }
    }
    return meteorResult;
};
const replaceMeteorAtomWithMongo = function(document) {
    if (EJSON.isBinary(document)) {
        // This does more copies than we'd like, but is necessary because
        // MongoDB.BSON only looks like it takes a Uint8Array (and doesn't actually
        // serialize it correctly).
        return new MongoDB.Binary(Buffer.from(document));
    }
    if (document instanceof MongoDB.Binary) {
        return document;
    }
    if (document instanceof Mongo.ObjectID) {
        return new MongoDB.ObjectId(document.toHexString());
    }
    if (document instanceof MongoDB.ObjectId) {
        return new MongoDB.ObjectId(document.toHexString());
    }
    if (document instanceof MongoDB.Timestamp) {
        // For now, the Meteor representation of a Mongo timestamp type (not a date!
        // this is a weird internal thing used in the oplog!) is the same as the
        // Mongo representation. We need to do this explicitly or else we would do a
        // structural clone and lose the prototype.
        return document;
    }
    if (document instanceof Decimal) {
        return MongoDB.Decimal128.fromString(document.toString());
    }
    if (EJSON._isCustomType(document)) {
        return replaceNames(makeMongoLegal, EJSON.toJSONValue(document));
    }
    // It is not ordinarily possible to stick dollar-sign keys into mongo
    // so we don't bother checking for things that need escaping at this time.
    return undefined;
};
const replaceTypes = function(document, atomTransformer) {
    if (typeof document !== 'object' || document === null) return document;
    var replacedTopLevelAtom = atomTransformer(document);
    if (replacedTopLevelAtom !== undefined) return replacedTopLevelAtom;
    var ret = document;
    Object.entries(document).forEach(function([key, val]) {
        var valReplaced = replaceTypes(val, atomTransformer);
        if (val !== valReplaced) {
            // Lazy clone. Shallow copy.
            if (ret === document) ret = clone(document);
            ret[key] = valReplaced;
        }
    });
    return ret;
};
const replaceMongoAtomWithMeteor = function(document) {
    if (document instanceof MongoDB.Binary) {
        // for backwards compatibility
        if (document.sub_type !== 0) {
            return document;
        }
        var buffer = document.value(true);
        return new Uint8Array(buffer);
    }
    if (document instanceof MongoDB.ObjectId) {
        return new Mongo.ObjectID(document.toHexString());
    }
    if (document instanceof MongoDB.Decimal128) {
        return Decimal(document.toString());
    }
    if (document["EJSON$type"] && document["EJSON$value"] && Object.keys(document).length === 2) {
        return EJSON.fromJSONValue(replaceNames(unmakeMongoLegal, document));
    }
    if (document instanceof MongoDB.Timestamp) {
        // For now, the Meteor representation of a Mongo timestamp type (not a date!
        // this is a weird internal thing used in the oplog!) is the same as the
        // Mongo representation. We need to do this explicitly or else we would do a
        // structural clone and lose the prototype.
        return document;
    }
    return undefined;
};
const makeMongoLegal = (name)=>"EJSON" + name;
const unmakeMongoLegal = (name)=>name.substr(5);
function replaceNames(filter, thing) {
    if (typeof thing === "object" && thing !== null) {
        if (Array.isArray(thing)) {
            return thing.map(replaceNames.bind(null, filter));
        }
        var ret = {};
        Object.entries(thing).forEach(function([key, value]) {
            ret[filter(key)] = replaceNames(filter, value);
        });
        return ret;
    }
    return thing;
}
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"asynchronous_cursor.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/asynchronous_cursor.js                                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({AsynchronousCursor:()=>AsynchronousCursor});let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);let _define_property;module.link("@swc/helpers/_/_define_property",{_(v){_define_property=v}},1);let LocalCollection;module.link('meteor/minimongo/local_collection',{default(v){LocalCollection=v}},2);let replaceMongoAtomWithMeteor,replaceTypes;module.link('./mongo_common',{replaceMongoAtomWithMeteor(v){replaceMongoAtomWithMeteor=v},replaceTypes(v){replaceTypes=v}},3);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();



/**
 * This is just a light wrapper for the cursor. The goal here is to ensure compatibility even if
 * there are breaking changes on the MongoDB driver.
 *
 * This is an internal implementation detail and is created lazily by the main Cursor class.
 */ class AsynchronousCursor {
    [Symbol.asyncIterator]() {
        var cursor = this;
        return {
            next () {
                return _async_to_generator(function*() {
                    const value = yield cursor._nextObjectPromise();
                    return {
                        done: !value,
                        value
                    };
                })();
            }
        };
    }
    // Returns a Promise for the next object from the underlying cursor (before
    // the Mongo->Meteor type replacement).
    _rawNextObjectPromise() {
        return _async_to_generator(function*() {
            if (this._closing) {
                // Prevent next() after close is called
                return null;
            }
            try {
                this._pendingNext = this._dbCursor.next();
                const result = yield this._pendingNext;
                this._pendingNext = null;
                return result;
            } catch (e) {
                console.error(e);
            } finally{
                this._pendingNext = null;
            }
        }).call(this);
    }
    // Returns a Promise for the next object from the cursor, skipping those whose
    // IDs we've already seen and replacing Mongo atoms with Meteor atoms.
    _nextObjectPromise() {
        return _async_to_generator(function*() {
            while(true){
                var doc = yield this._rawNextObjectPromise();
                if (!doc) return null;
                doc = replaceTypes(doc, replaceMongoAtomWithMeteor);
                if (!this._cursorDescription.options.tailable && '_id' in doc) {
                    // Did Mongo give us duplicate documents in the same cursor? If so,
                    // ignore this one. (Do this before the transform, since transform might
                    // return some unrelated value.) We don't do this for tailable cursors,
                    // because we want to maintain O(1) memory usage. And if there isn't _id
                    // for some reason (maybe it's the oplog), then we don't do this either.
                    // (Be careful to do this for falsey but existing _id, though.)
                    if (this._visitedIds.has(doc._id)) continue;
                    this._visitedIds.set(doc._id, true);
                }
                if (this._transform) doc = this._transform(doc);
                return doc;
            }
        }).call(this);
    }
    // Returns a promise which is resolved with the next object (like with
    // _nextObjectPromise) or rejected if the cursor doesn't return within
    // timeoutMS ms.
    _nextObjectPromiseWithTimeout(timeoutMS) {
        const nextObjectPromise = this._nextObjectPromise();
        if (!timeoutMS) {
            return nextObjectPromise;
        }
        const timeoutPromise = new Promise((resolve)=>{
            // On timeout, close the cursor.
            const timeoutId = setTimeout(()=>{
                resolve(this.close());
            }, timeoutMS);
            // If the `_nextObjectPromise` returned first, cancel the timeout.
            nextObjectPromise.finally(()=>{
                clearTimeout(timeoutId);
            });
        });
        return Promise.race([
            nextObjectPromise,
            timeoutPromise
        ]);
    }
    forEach(callback, thisArg) {
        return _async_to_generator(function*() {
            // Get back to the beginning.
            this._rewind();
            let idx = 0;
            while(true){
                const doc = yield this._nextObjectPromise();
                if (!doc) return;
                yield callback.call(thisArg, doc, idx++, this._selfForIteration);
            }
        }).call(this);
    }
    map(callback, thisArg) {
        return _async_to_generator(function*() {
            const results = [];
            yield this.forEach((doc, index)=>_async_to_generator(function*() {
                    results.push((yield callback.call(thisArg, doc, index, this._selfForIteration)));
                }).call(this));
            return results;
        }).call(this);
    }
    _rewind() {
        // known to be synchronous
        this._dbCursor.rewind();
        this._visitedIds = new LocalCollection._IdMap;
    }
    // Mostly usable for tailable cursors.
    close() {
        return _async_to_generator(function*() {
            this._closing = true;
            // If there's a pending next(), wait for it to finish or abort
            if (this._pendingNext) {
                try {
                    yield this._pendingNext;
                } catch (e) {
                // ignore
                }
            }
            this._dbCursor.close();
        }).call(this);
    }
    fetch() {
        return this.map((doc)=>doc);
    }
    /**
   * FIXME: (node:34680) [MONGODB DRIVER] Warning: cursor.count is deprecated and will be
   *  removed in the next major version, please use `collection.estimatedDocumentCount` or
   *  `collection.countDocuments` instead.
   */ count() {
        return this._dbCursor.count();
    }
    // This method is NOT wrapped in Cursor.
    getRawObjects(ordered) {
        return _async_to_generator(function*() {
            var self = this;
            if (ordered) {
                return self.fetch();
            } else {
                var results = new LocalCollection._IdMap;
                yield self.forEach(function(doc) {
                    results.set(doc._id, doc);
                });
                return results;
            }
        }).call(this);
    }
    constructor(dbCursor, cursorDescription, options){
        _define_property(this, "_closing", false);
        _define_property(this, "_pendingNext", null);
        this._dbCursor = dbCursor;
        this._cursorDescription = cursorDescription;
        this._selfForIteration = options.selfForIteration || this;
        if (options.useTransform && cursorDescription.options.transform) {
            this._transform = LocalCollection.wrapTransform(cursorDescription.options.transform);
        } else {
            this._transform = null;
        }
        this._visitedIds = new LocalCollection._IdMap;
    }
}
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"cursor.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/cursor.ts                                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({Cursor:()=>Cursor});let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);let _define_property;module.link("@swc/helpers/_/_define_property",{_(v){_define_property=v}},1);let ASYNC_CURSOR_METHODS,getAsyncMethodName;module.link('meteor/minimongo/constants',{ASYNC_CURSOR_METHODS(v){ASYNC_CURSOR_METHODS=v},getAsyncMethodName(v){getAsyncMethodName=v}},2);let replaceMeteorAtomWithMongo,replaceTypes;module.link('./mongo_common',{replaceMeteorAtomWithMongo(v){replaceMeteorAtomWithMongo=v},replaceTypes(v){replaceTypes=v}},3);let LocalCollection;module.link('meteor/minimongo/local_collection',{default(v){LocalCollection=v}},4);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();




/**
 * @class Cursor
 *
 * The main cursor object returned from find(), implementing the documented
 * Mongo.Collection cursor API.
 *
 * Wraps a CursorDescription and lazily creates an AsynchronousCursor
 * (only contacts MongoDB when methods like fetch or forEach are called).
 */ class Cursor {
    countAsync() {
        return _async_to_generator(function*() {
            const collection = this._mongo.rawCollection(this._cursorDescription.collectionName);
            return yield collection.countDocuments(replaceTypes(this._cursorDescription.selector, replaceMeteorAtomWithMongo), replaceTypes(this._cursorDescription.options, replaceMeteorAtomWithMongo));
        }).call(this);
    }
    count() {
        throw new Error("count() is not available on the server. Please use countAsync() instead.");
    }
    getTransform() {
        return this._cursorDescription.options.transform;
    }
    _publishCursor(sub) {
        const collection = this._cursorDescription.collectionName;
        return Mongo.Collection._publishCursor(this, sub, collection);
    }
    _getCollectionName() {
        return this._cursorDescription.collectionName;
    }
    observe(callbacks) {
        return LocalCollection._observeFromObserveChanges(this, callbacks);
    }
    observeAsync(callbacks) {
        return _async_to_generator(function*() {
            return new Promise((resolve)=>resolve(this.observe(callbacks)));
        }).call(this);
    }
    observeChanges(callbacks, options = {}) {
        const ordered = LocalCollection._observeChangesCallbacksAreOrdered(callbacks);
        return this._mongo._observeChanges(this._cursorDescription, ordered, callbacks, options.nonMutatingCallbacks);
    }
    observeChangesAsync(_0) {
        return _async_to_generator(function*(callbacks, options = {}) {
            return this.observeChanges(callbacks, options);
        }).apply(this, arguments);
    }
    constructor(mongo, cursorDescription){
        _define_property(this, "_mongo", void 0);
        _define_property(this, "_cursorDescription", void 0);
        _define_property(this, "_synchronousCursor", void 0);
        this._mongo = mongo;
        this._cursorDescription = cursorDescription;
        this._synchronousCursor = null;
    }
}
// Add cursor methods dynamically
[
    ...ASYNC_CURSOR_METHODS,
    Symbol.iterator,
    Symbol.asyncIterator
].forEach((methodName)=>{
    if (methodName === 'count') return;
    Cursor.prototype[methodName] = function(...args) {
        const cursor = setupAsynchronousCursor(this, methodName);
        return cursor[methodName](...args);
    };
    if (methodName === Symbol.iterator || methodName === Symbol.asyncIterator) return;
    const methodNameAsync = getAsyncMethodName(methodName);
    Cursor.prototype[methodNameAsync] = function(...args) {
        return this[methodName](...args);
    };
});
function setupAsynchronousCursor(cursor, method) {
    if (cursor._cursorDescription.options.tailable) {
        throw new Error(`Cannot call ${String(method)} on a tailable cursor`);
    }
    if (!cursor._synchronousCursor) {
        cursor._synchronousCursor = cursor._mongo._createAsynchronousCursor(cursor._cursorDescription, {
            selfForIteration: cursor,
            useTransform: true
        });
    }
    return cursor._synchronousCursor;
}
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"local_collection_driver.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/local_collection_driver.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({LocalCollectionDriver:()=>LocalCollectionDriver},true);// singleton
const LocalCollectionDriver = new class LocalCollectionDriver {
    open(name, conn) {
        if (!name) {
            return new LocalCollection;
        }
        if (!conn) {
            return ensureCollection(name, this.noConnCollections);
        }
        if (!conn._mongo_livedata_collections) {
            conn._mongo_livedata_collections = Object.create(null);
        }
        // XXX is there a way to keep track of a connection's collections without
        // dangling it off the connection object?
        return ensureCollection(name, conn._mongo_livedata_collections);
    }
    constructor(){
        this.noConnCollections = Object.create(null);
    }
};
function ensureCollection(name, collections) {
    return name in collections ? collections[name] : collections[name] = new LocalCollection(name);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"remote_collection_driver.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/remote_collection_driver.ts                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({RemoteCollectionDriver:()=>RemoteCollectionDriver});let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);let _define_property;module.link("@swc/helpers/_/_define_property",{_(v){_define_property=v}},1);let once;module.link('lodash.once',{default(v){once=v}},2);let ASYNC_COLLECTION_METHODS,getAsyncMethodName,CLIENT_ONLY_METHODS;module.link("meteor/minimongo/constants",{ASYNC_COLLECTION_METHODS(v){ASYNC_COLLECTION_METHODS=v},getAsyncMethodName(v){getAsyncMethodName=v},CLIENT_ONLY_METHODS(v){CLIENT_ONLY_METHODS=v}},3);let MongoConnection;module.link('./mongo_connection',{MongoConnection(v){MongoConnection=v}},4);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();




class RemoteCollectionDriver {
    open(name) {
        const ret = {};
        // Handle remote collection methods
        RemoteCollectionDriver.REMOTE_COLLECTION_METHODS.forEach((method)=>{
            // Type assertion needed because we know these methods exist on MongoConnection
            const mongoMethod = this.mongo[method];
            ret[method] = mongoMethod.bind(this.mongo, name);
            if (!ASYNC_COLLECTION_METHODS.includes(method)) return;
            const asyncMethodName = getAsyncMethodName(method);
            ret[asyncMethodName] = (...args)=>ret[method](...args);
        });
        // Handle client-only methods
        CLIENT_ONLY_METHODS.forEach((method)=>{
            ret[method] = (...args)=>{
                throw new Error(`${method} is not available on the server. Please use ${getAsyncMethodName(method)}() instead.`);
            };
        });
        return ret;
    }
    constructor(mongoUrl, options){
        _define_property(this, "mongo", void 0);
        this.mongo = new MongoConnection(mongoUrl, options);
    }
}
_define_property(RemoteCollectionDriver, "REMOTE_COLLECTION_METHODS", [
    'createCappedCollectionAsync',
    'dropIndexAsync',
    'ensureIndexAsync',
    'createIndexAsync',
    'countDocuments',
    'dropCollectionAsync',
    'estimatedDocumentCount',
    'find',
    'findOneAsync',
    'insertAsync',
    'rawCollection',
    'removeAsync',
    'updateAsync',
    'upsertAsync'
]);
// Assign the class to MongoInternals
MongoInternals.RemoteCollectionDriver = RemoteCollectionDriver;
// Create the singleton RemoteCollectionDriver only on demand
MongoInternals.defaultRemoteCollectionDriver = once(()=>{
    const connectionOptions = {};
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
        throw new Error("MONGO_URL must be set in environment");
    }
    if (process.env.MONGO_OPLOG_URL) {
        connectionOptions.oplogUrl = process.env.MONGO_OPLOG_URL;
    }
    const driver = new RemoteCollectionDriver(mongoUrl, connectionOptions);
    // Initialize database connection on startup
    Meteor.startup(()=>_async_to_generator(function*() {
            yield driver.mongo.client.connect();
        })());
    return driver;
});

//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"collection":{"collection.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/collection/collection.js                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);let _object_spread;module.link("@swc/helpers/_/_object_spread",{_(v){_object_spread=v}},1);let normalizeProjection;module.link("../mongo_utils",{normalizeProjection(v){normalizeProjection=v}},2);let AsyncMethods;module.link('./methods_async',{AsyncMethods(v){AsyncMethods=v}},3);let SyncMethods;module.link('./methods_sync',{SyncMethods(v){SyncMethods=v}},4);let IndexMethods;module.link('./methods_index',{IndexMethods(v){IndexMethods=v}},5);let ID_GENERATORS,normalizeOptions,setupAutopublish,setupConnection,setupDriver,setupMutationMethods,validateCollectionName;module.link('./collection_utils',{ID_GENERATORS(v){ID_GENERATORS=v},normalizeOptions(v){normalizeOptions=v},setupAutopublish(v){setupAutopublish=v},setupConnection(v){setupConnection=v},setupDriver(v){setupDriver=v},setupMutationMethods(v){setupMutationMethods=v},validateCollectionName(v){validateCollectionName=v}},6);let ReplicationMethods;module.link('./methods_replication',{ReplicationMethods(v){ReplicationMethods=v}},7);







/**
 * @summary Namespace for MongoDB-related items
 * @namespace
 */ Mongo = {};
/**
 * @summary Constructor for a Collection
 * @locus Anywhere
 * @instancename collection
 * @class
 * @param {String} name The name of the collection.  If null, creates an unmanaged (unsynchronized) local collection.
 * @param {Object} [options]
 * @param {Object} options.connection The server connection that will manage this collection. Uses the default connection if not specified.  Pass the return value of calling [`DDP.connect`](#DDP-connect) to specify a different server. Pass `null` to specify no connection. Unmanaged (`name` is null) collections cannot specify a connection.
 * @param {String} options.idGeneration The method of generating the `_id` fields of new documents in this collection.  Possible values:

 - **`'STRING'`**: random strings
 - **`'MONGO'`**:  random [`Mongo.ObjectID`](#mongo_object_id) values

The default id generation technique is `'STRING'`.
 * @param {Function} options.transform An optional transformation function. Documents will be passed through this function before being returned from `fetch` or `findOneAsync`, and before being passed to callbacks of `observe`, `map`, `forEach`, `allow`, and `deny`. Transforms are *not* applied for the callbacks of `observeChanges` or to cursors returned from publish functions.
 * @param {Boolean} options.defineMutationMethods Set to `false` to skip setting up the mutation methods that enable insert/update/remove from client code. Default `true`.
 */ // Main Collection constructor
Mongo.Collection = function Collection(name, options) {
    var _ID_GENERATORS_options_idGeneration;
    name = validateCollectionName(name);
    options = normalizeOptions(options);
    this._makeNewID = (_ID_GENERATORS_options_idGeneration = ID_GENERATORS[options.idGeneration]) === null || _ID_GENERATORS_options_idGeneration === void 0 ? void 0 : _ID_GENERATORS_options_idGeneration.call(ID_GENERATORS, name);
    this._transform = LocalCollection.wrapTransform(options.transform);
    this.resolverType = options.resolverType;
    this._connection = setupConnection(name, options);
    const driver = setupDriver(name, this._connection, options);
    this._driver = driver;
    this._collection = driver.open(name, this._connection);
    this._name = name;
    this._settingUpReplicationPromise = this._maybeSetUpReplication(name, options);
    setupMutationMethods(this, name, options);
    setupAutopublish(this, name, options);
    Mongo._collections.set(name, this);
};
Object.assign(Mongo.Collection.prototype, {
    _getFindSelector (args) {
        if (args.length == 0) return {};
        else return args[0];
    },
    _getFindOptions (args) {
        const [, options] = args || [];
        const newOptions = normalizeProjection(options);
        var self = this;
        if (args.length < 2) {
            return {
                transform: self._transform
            };
        } else {
            check(newOptions, Match.Optional(Match.ObjectIncluding({
                projection: Match.Optional(Match.OneOf(Object, undefined)),
                sort: Match.Optional(Match.OneOf(Object, Array, Function, undefined)),
                limit: Match.Optional(Match.OneOf(Number, undefined)),
                skip: Match.Optional(Match.OneOf(Number, undefined))
            })));
            return _object_spread({
                transform: self._transform
            }, newOptions);
        }
    }
});
Object.assign(Mongo.Collection, {
    _publishCursor (cursor, sub, collection) {
        return _async_to_generator(function*() {
            var observeHandle = yield cursor.observeChanges({
                added: function(id, fields) {
                    sub.added(collection, id, fields);
                },
                changed: function(id, fields) {
                    sub.changed(collection, id, fields);
                },
                removed: function(id) {
                    sub.removed(collection, id);
                }
            }, // Publications don't mutate the documents
            // This is tested by the `livedata - publish callbacks clone` test
            {
                nonMutatingCallbacks: true
            });
            // We don't call sub.ready() here: it gets called in livedata_server, after
            // possibly calling _publishCursor on multiple returned cursors.
            // register stop callback (expects lambda w/ no args).
            sub.onStop(function() {
                return _async_to_generator(function*() {
                    return yield observeHandle.stop();
                })();
            });
            // return the observeHandle in case it needs to be stopped early
            return observeHandle;
        })();
    },
    // protect against dangerous selectors.  falsey and {_id: falsey} are both
    // likely programmer error, and not what you want, particularly for destructive
    // operations. If a falsey _id is sent in, a new string _id will be
    // generated and returned; if a fallbackId is provided, it will be returned
    // instead.
    _rewriteSelector (selector, { fallbackId } = {}) {
        // shorthand -- scalars match _id
        if (LocalCollection._selectorIsId(selector)) selector = {
            _id: selector
        };
        if (Array.isArray(selector)) {
            // This is consistent with the Mongo console itself; if we don't do this
            // check passing an empty array ends up selecting all items
            throw new Error("Mongo selector can't be an array.");
        }
        if (!selector || '_id' in selector && !selector._id) {
            // can't match anything
            return {
                _id: fallbackId || Random.id()
            };
        }
        return selector;
    }
});
Object.assign(Mongo.Collection.prototype, ReplicationMethods, SyncMethods, AsyncMethods, IndexMethods);
Object.assign(Mongo.Collection.prototype, {
    // Determine if this collection is simply a minimongo representation of a real
    // database on another server
    _isRemoteCollection () {
        // XXX see #MeteorServerNull
        return this._connection && this._connection !== Meteor.server;
    },
    dropCollectionAsync () {
        return _async_to_generator(function*() {
            var self = this;
            if (!self._collection.dropCollectionAsync) throw new Error('Can only call dropCollectionAsync on server collections');
            yield self._collection.dropCollectionAsync();
        }).call(this);
    },
    createCappedCollectionAsync (byteSize, maxDocuments) {
        return _async_to_generator(function*() {
            var self = this;
            if (!(yield self._collection.createCappedCollectionAsync)) throw new Error('Can only call createCappedCollectionAsync on server collections');
            yield self._collection.createCappedCollectionAsync(byteSize, maxDocuments);
        }).call(this);
    },
    /**
   * @summary Returns the [`Collection`](http://mongodb.github.io/node-mongodb-native/3.0/api/Collection.html) object corresponding to this collection from the [npm `mongodb` driver module](https://www.npmjs.com/package/mongodb) which is wrapped by `Mongo.Collection`.
   * @locus Server
   * @memberof Mongo.Collection
   * @instance
   */ rawCollection () {
        var self = this;
        if (!self._collection.rawCollection) {
            throw new Error('Can only call rawCollection on server collections');
        }
        return self._collection.rawCollection();
    },
    /**
   * @summary Returns the [`Db`](http://mongodb.github.io/node-mongodb-native/3.0/api/Db.html) object corresponding to this collection's database connection from the [npm `mongodb` driver module](https://www.npmjs.com/package/mongodb) which is wrapped by `Mongo.Collection`.
   * @locus Server
   * @memberof Mongo.Collection
   * @instance
   */ rawDatabase () {
        var self = this;
        if (!(self._driver.mongo && self._driver.mongo.db)) {
            throw new Error('Can only call rawDatabase on server collections');
        }
        return self._driver.mongo.db;
    }
});
Object.assign(Mongo, {
    /**
   * @summary Retrieve a Meteor collection instance by name. Only collections defined with [`new Mongo.Collection(...)`](#collections) are available with this method. For plain MongoDB collections, you'll want to look at [`rawDatabase()`](#Mongo-Collection-rawDatabase).
   * @locus Anywhere
   * @memberof Mongo
   * @static
   * @param {string} name Name of your collection as it was defined with `new Mongo.Collection()`.
   * @returns {Mongo.Collection | undefined}
   */ getCollection (name) {
        return this._collections.get(name);
    },
    /**
   * @summary A record of all defined Mongo.Collection instances, indexed by collection name.
   * @type {Map<string, Mongo.Collection>}
   * @memberof Mongo
   * @protected
   */ _collections: new Map()
});
/**
 * @summary Create a Mongo-style `ObjectID`.  If you don't specify a `hexString`, the `ObjectID` will be generated randomly (not using MongoDB's ID construction rules).
 * @locus Anywhere
 * @class
 * @param {String} [hexString] Optional.  The 24-character hexadecimal contents of the ObjectID to create
 */ Mongo.ObjectID = MongoID.ObjectID;
/**
 * @summary To create a cursor, use find. To access the documents in a cursor, use forEach, map, or fetch.
 * @class
 * @instanceName cursor
 */ Mongo.Cursor = LocalCollection.Cursor;
/**
 * @deprecated in 0.9.1
 */ Mongo.Collection.Cursor = Mongo.Cursor;
/**
 * @deprecated in 0.9.1
 */ Mongo.Collection.ObjectID = Mongo.ObjectID;
/**
 * @deprecated in 0.9.1
 */ Meteor.Collection = Mongo.Collection;
// Allow deny stuff is now in the allow-deny package
Object.assign(Mongo.Collection.prototype, AllowDeny.CollectionPrototype);

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"collection_utils.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/collection/collection_utils.js                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({setupConnection:()=>setupConnection,setupDriver:()=>setupDriver,setupAutopublish:()=>setupAutopublish,setupMutationMethods:()=>setupMutationMethods,validateCollectionName:()=>validateCollectionName,normalizeOptions:()=>normalizeOptions});module.export({ID_GENERATORS:()=>ID_GENERATORS},true);let _object_spread;module.link("@swc/helpers/_/_object_spread",{_(v){_object_spread=v}},0);
const ID_GENERATORS = {
    MONGO (name) {
        return function() {
            const src = name ? DDP.randomStream('/collection/' + name) : Random.insecure;
            return new Mongo.ObjectID(src.hexString(24));
        };
    },
    STRING (name) {
        return function() {
            const src = name ? DDP.randomStream('/collection/' + name) : Random.insecure;
            return src.id();
        };
    }
};
function setupConnection(name, options) {
    if (!name || options.connection === null) return null;
    if (options.connection) return options.connection;
    return Meteor.isClient ? Meteor.connection : Meteor.server;
}
function setupDriver(name, connection, options) {
    if (options._driver) return options._driver;
    if (name && connection === Meteor.server && typeof MongoInternals !== 'undefined' && MongoInternals.defaultRemoteCollectionDriver) {
        return MongoInternals.defaultRemoteCollectionDriver();
    }
    const { LocalCollectionDriver } = require('../local_collection_driver.js');
    return LocalCollectionDriver;
}
function setupAutopublish(collection, name, options) {
    if (Package.autopublish && !options._preventAutopublish && collection._connection && collection._connection.publish) {
        collection._connection.publish(null, ()=>collection.find(), {
            is_auto: true
        });
    }
}
function setupMutationMethods(collection, name, options) {
    if (options.defineMutationMethods === false) return;
    try {
        collection._defineMutationMethods({
            useExisting: options._suppressSameNameError === true
        });
    } catch (error) {
        if (error.message === `A method named '/${name}/insertAsync' is already defined`) {
            throw new Error(`There is already a collection named "${name}"`);
        }
        throw error;
    }
}
function validateCollectionName(name) {
    if (!name && name !== null) {
        Meteor._debug('Warning: creating anonymous collection. It will not be ' + 'saved or synchronized over the network. (Pass null for ' + 'the collection name to turn off this warning.)');
        name = null;
    }
    if (name !== null && typeof name !== 'string') {
        throw new Error('First argument to new Mongo.Collection must be a string or null');
    }
    return name;
}
function normalizeOptions(options) {
    if (options && options.methods) {
        // Backwards compatibility hack with original signature
        options = {
            connection: options
        };
    }
    // Backwards compatibility: "connection" used to be called "manager".
    if (options && options.manager && !options.connection) {
        options.connection = options.manager;
    }
    const cleanedOptions = Object.fromEntries(Object.entries(options || {}).filter(([_, v])=>v !== undefined));
    // 2) Spread defaults first, then only the defined overrides
    return _object_spread({
        connection: undefined,
        idGeneration: 'STRING',
        transform: null,
        _driver: undefined,
        _preventAutopublish: false
    }, cleanedOptions);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"methods_async.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/collection/methods_async.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({AsyncMethods:()=>AsyncMethods},true);let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);let _object_spread;module.link("@swc/helpers/_/_object_spread",{_(v){_object_spread=v}},1);let _object_spread_props;module.link("@swc/helpers/_/_object_spread_props",{_(v){_object_spread_props=v}},2);


const AsyncMethods = {
    /**
   * @summary Finds the first document that matches the selector, as ordered by sort and skip options. Returns `undefined` if no matching document is found.
   * @locus Anywhere
   * @method findOneAsync
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} [selector] A query describing the documents to find
   * @param {Object} [options]
   * @param {MongoSortSpecifier} options.sort Sort order (default: natural order)
   * @param {Number} options.skip Number of results to skip at the beginning
   * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.
   * @param {Boolean} options.reactive (Client only) Default true; pass false to disable reactivity
   * @param {Function} options.transform Overrides `transform` on the [`Collection`](#collections) for this cursor.  Pass `null` to disable transformation.
   * @param {String} options.readPreference (Server only) Specifies a custom MongoDB [`readPreference`](https://docs.mongodb.com/manual/core/read-preference) for fetching the document. Possible values are `primary`, `primaryPreferred`, `secondary`, `secondaryPreferred` and `nearest`.
   * @returns {Object}
   */ findOneAsync (...args) {
        return this._collection.findOneAsync(this._getFindSelector(args), this._getFindOptions(args));
    },
    _insertAsync (doc, options = {}) {
        // Make sure we were passed a document to insert
        if (!doc) {
            throw new Error('insert requires an argument');
        }
        // Make a shallow clone of the document, preserving its prototype.
        doc = Object.create(Object.getPrototypeOf(doc), Object.getOwnPropertyDescriptors(doc));
        if ('_id' in doc) {
            if (!doc._id || !(typeof doc._id === 'string' || doc._id instanceof Mongo.ObjectID)) {
                throw new Error('Meteor requires document _id fields to be non-empty strings or ObjectIDs');
            }
        } else {
            let generateId = true;
            // Don't generate the id if we're the client and the 'outermost' call
            // This optimization saves us passing both the randomSeed and the id
            // Passing both is redundant.
            if (this._isRemoteCollection()) {
                const enclosing = DDP._CurrentMethodInvocation.get();
                if (!enclosing) {
                    generateId = false;
                }
            }
            if (generateId) {
                doc._id = this._makeNewID();
            }
        }
        // On inserts, always return the id that we generated; on all other
        // operations, just return the result from the collection.
        var chooseReturnValueFromCollectionResult = function(result) {
            if (Meteor._isPromise(result)) return result;
            if (doc._id) {
                return doc._id;
            }
            // XXX what is this for??
            // It's some iteraction between the callback to _callMutatorMethod and
            // the return value conversion
            doc._id = result;
            return result;
        };
        if (this._isRemoteCollection()) {
            const promise = this._callMutatorMethodAsync('insertAsync', [
                doc
            ], options);
            promise.then(chooseReturnValueFromCollectionResult);
            promise.stubPromise = promise.stubPromise.then(chooseReturnValueFromCollectionResult);
            promise.serverPromise = promise.serverPromise.then(chooseReturnValueFromCollectionResult);
            return promise;
        }
        // it's my collection.  descend into the collection object
        // and propagate any exception.
        return this._collection.insertAsync(doc).then(chooseReturnValueFromCollectionResult);
    },
    /**
   * @summary Insert a document in the collection.  Returns a promise that will return the document's unique _id when solved.
   * @locus Anywhere
   * @method  insert
   * @memberof Mongo.Collection
   * @instance
   * @param {Object} doc The document to insert. May not yet have an _id attribute, in which case Meteor will generate one for you.
   */ insertAsync (doc, options) {
        return this._insertAsync(doc, options);
    },
    /**
   * @summary Modify one or more documents in the collection. Returns the number of matched documents.
   * @locus Anywhere
   * @method update
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} selector Specifies which documents to modify
   * @param {MongoModifier} modifier Specifies how to modify the documents
   * @param {Object} [options]
   * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
   * @param {Boolean} options.upsert True to insert a document if no matching documents are found.
   * @param {Array} options.arrayFilters Optional. Used in combination with MongoDB [filtered positional operator](https://docs.mongodb.com/manual/reference/operator/update/positional-filtered/) to specify which elements to modify in an array field.
   */ updateAsync (selector, modifier, ...optionsAndCallback) {
        // We've already popped off the callback, so we are left with an array
        // of one or zero items
        const options = _object_spread({}, optionsAndCallback[0] || null);
        let insertedId;
        if (options && options.upsert) {
            // set `insertedId` if absent.  `insertedId` is a Meteor extension.
            if (options.insertedId) {
                if (!(typeof options.insertedId === 'string' || options.insertedId instanceof Mongo.ObjectID)) throw new Error('insertedId must be string or ObjectID');
                insertedId = options.insertedId;
            } else if (!selector || !selector._id) {
                insertedId = this._makeNewID();
                options.generatedId = true;
                options.insertedId = insertedId;
            }
        }
        selector = Mongo.Collection._rewriteSelector(selector, {
            fallbackId: insertedId
        });
        if (this._isRemoteCollection()) {
            const args = [
                selector,
                modifier,
                options
            ];
            return this._callMutatorMethodAsync('updateAsync', args, options);
        }
        // it's my collection.  descend into the collection object
        // and propagate any exception.
        // If the user provided a callback and the collection implements this
        // operation asynchronously, then queryRet will be undefined, and the
        // result will be returned through the callback instead.
        return this._collection.updateAsync(selector, modifier, options);
    },
    /**
   * @summary Asynchronously removes documents from the collection.
   * @locus Anywhere
   * @method remove
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} selector Specifies which documents to remove
   */ removeAsync (selector, options = {}) {
        selector = Mongo.Collection._rewriteSelector(selector);
        if (this._isRemoteCollection()) {
            return this._callMutatorMethodAsync('removeAsync', [
                selector
            ], options);
        }
        // it's my collection.  descend into the collection1 object
        // and propagate any exception.
        return this._collection.removeAsync(selector);
    },
    /**
   * @summary Asynchronously modifies one or more documents in the collection, or insert one if no matching documents were found. Returns an object with keys `numberAffected` (the number of documents modified)  and `insertedId` (the unique _id of the document that was inserted, if any).
   * @locus Anywhere
   * @method upsert
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} selector Specifies which documents to modify
   * @param {MongoModifier} modifier Specifies how to modify the documents
   * @param {Object} [options]
   * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
   */ upsertAsync (selector, modifier, options) {
        return _async_to_generator(function*() {
            return this.updateAsync(selector, modifier, _object_spread_props(_object_spread({}, options), {
                _returnObject: true,
                upsert: true
            }));
        }).call(this);
    },
    /**
   * @summary Gets the number of documents matching the filter. For a fast count of the total documents in a collection see `estimatedDocumentCount`.
   * @locus Anywhere
   * @method countDocuments
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} [selector] A query describing the documents to count
   * @param {Object} [options] All options are listed in [MongoDB documentation](https://mongodb.github.io/node-mongodb-native/4.11/interfaces/CountDocumentsOptions.html). Please note that not all of them are available on the client.
   * @returns {Promise<number>}
   */ countDocuments (...args) {
        return this._collection.countDocuments(...args);
    },
    /**
   * @summary Gets an estimate of the count of documents in a collection using collection metadata. For an exact count of the documents in a collection see `countDocuments`.
   * @locus Anywhere
   * @method estimatedDocumentCount
   * @memberof Mongo.Collection
   * @instance
   * @param {Object} [options] All options are listed in [MongoDB documentation](https://mongodb.github.io/node-mongodb-native/4.11/interfaces/EstimatedDocumentCountOptions.html). Please note that not all of them are available on the client.
   * @returns {Promise<number>}
   */ estimatedDocumentCount (...args) {
        return this._collection.estimatedDocumentCount(...args);
    }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"methods_index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/collection/methods_index.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({IndexMethods:()=>IndexMethods},true);let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);let Log;module.link('meteor/logging',{Log(v){Log=v}},1);

const IndexMethods = {
    // We'll actually design an index API later. For now, we just pass through to
    // Mongo's, but make it synchronous.
    /**
   * @summary Asynchronously creates the specified index on the collection.
   * @locus server
   * @method ensureIndexAsync
   * @deprecated in 3.0
   * @memberof Mongo.Collection
   * @instance
   * @param {Object} index A document that contains the field and value pairs where the field is the index key and the value describes the type of index for that field. For an ascending index on a field, specify a value of `1`; for descending index, specify a value of `-1`. Use `text` for text indexes.
   * @param {Object} [options] All options are listed in [MongoDB documentation](https://docs.mongodb.com/manual/reference/method/db.collection.createIndex/#options)
   * @param {String} options.name Name of the index
   * @param {Boolean} options.unique Define that the index values must be unique, more at [MongoDB documentation](https://docs.mongodb.com/manual/core/index-unique/)
   * @param {Boolean} options.sparse Define that the index is sparse, more at [MongoDB documentation](https://docs.mongodb.com/manual/core/index-sparse/)
   */ ensureIndexAsync (index, options) {
        return _async_to_generator(function*() {
            var self = this;
            if (!self._collection.ensureIndexAsync || !self._collection.createIndexAsync) throw new Error('Can only call createIndexAsync on server collections');
            if (self._collection.createIndexAsync) {
                yield self._collection.createIndexAsync(index, options);
            } else {
                Log.debug(`ensureIndexAsync has been deprecated, please use the new 'createIndexAsync' instead${(options === null || options === void 0 ? void 0 : options.name) ? `, index name: ${options.name}` : `, index: ${JSON.stringify(index)}`}`);
                yield self._collection.ensureIndexAsync(index, options);
            }
        }).call(this);
    },
    /**
   * @summary Asynchronously creates the specified index on the collection.
   * @locus server
   * @method createIndexAsync
   * @memberof Mongo.Collection
   * @instance
   * @param {Object} index A document that contains the field and value pairs where the field is the index key and the value describes the type of index for that field. For an ascending index on a field, specify a value of `1`; for descending index, specify a value of `-1`. Use `text` for text indexes.
   * @param {Object} [options] All options are listed in [MongoDB documentation](https://docs.mongodb.com/manual/reference/method/db.collection.createIndex/#options)
   * @param {String} options.name Name of the index
   * @param {Boolean} options.unique Define that the index values must be unique, more at [MongoDB documentation](https://docs.mongodb.com/manual/core/index-unique/)
   * @param {Boolean} options.sparse Define that the index is sparse, more at [MongoDB documentation](https://docs.mongodb.com/manual/core/index-sparse/)
   */ createIndexAsync (index, options) {
        return _async_to_generator(function*() {
            var self = this;
            if (!self._collection.createIndexAsync) throw new Error('Can only call createIndexAsync on server collections');
            try {
                yield self._collection.createIndexAsync(index, options);
            } catch (e) {
                var _Meteor_settings_packages_mongo, _Meteor_settings_packages, _Meteor_settings;
                if (e.message.includes('An equivalent index already exists with the same name but different options.') && ((_Meteor_settings = Meteor.settings) === null || _Meteor_settings === void 0 ? void 0 : (_Meteor_settings_packages = _Meteor_settings.packages) === null || _Meteor_settings_packages === void 0 ? void 0 : (_Meteor_settings_packages_mongo = _Meteor_settings_packages.mongo) === null || _Meteor_settings_packages_mongo === void 0 ? void 0 : _Meteor_settings_packages_mongo.reCreateIndexOnOptionMismatch)) {
                    Log.info(`Re-creating index ${index} for ${self._name} due to options mismatch.`);
                    yield self._collection.dropIndexAsync(index);
                    yield self._collection.createIndexAsync(index, options);
                } else {
                    console.error(e);
                    throw new Meteor.Error(`An error occurred when creating an index for collection "${self._name}: ${e.message}`);
                }
            }
        }).call(this);
    },
    /**
   * @summary Asynchronously creates the specified index on the collection.
   * @locus server
   * @method createIndex
   * @memberof Mongo.Collection
   * @instance
   * @param {Object} index A document that contains the field and value pairs where the field is the index key and the value describes the type of index for that field. For an ascending index on a field, specify a value of `1`; for descending index, specify a value of `-1`. Use `text` for text indexes.
   * @param {Object} [options] All options are listed in [MongoDB documentation](https://docs.mongodb.com/manual/reference/method/db.collection.createIndex/#options)
   * @param {String} options.name Name of the index
   * @param {Boolean} options.unique Define that the index values must be unique, more at [MongoDB documentation](https://docs.mongodb.com/manual/core/index-unique/)
   * @param {Boolean} options.sparse Define that the index is sparse, more at [MongoDB documentation](https://docs.mongodb.com/manual/core/index-sparse/)
   */ createIndex (index, options) {
        return this.createIndexAsync(index, options);
    },
    dropIndexAsync (index) {
        return _async_to_generator(function*() {
            var self = this;
            if (!self._collection.dropIndexAsync) throw new Error('Can only call dropIndexAsync on server collections');
            yield self._collection.dropIndexAsync(index);
        }).call(this);
    }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"methods_replication.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/collection/methods_replication.js                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({ReplicationMethods:()=>ReplicationMethods},true);let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);let _object_spread;module.link("@swc/helpers/_/_object_spread",{_(v){_object_spread=v}},1);

const ReplicationMethods = {
    _maybeSetUpReplication (name) {
        return _async_to_generator(function*() {
            var _registerStoreResult_then;
            const self = this;
            if (!(self._connection && self._connection.registerStoreClient && self._connection.registerStoreServer)) {
                return;
            }
            const wrappedStoreCommon = {
                // Called around method stub invocations to capture the original versions
                // of modified documents.
                saveOriginals () {
                    self._collection.saveOriginals();
                },
                retrieveOriginals () {
                    return self._collection.retrieveOriginals();
                },
                // To be able to get back to the collection from the store.
                _getCollection () {
                    return self;
                }
            };
            const wrappedStoreClient = _object_spread({
                // Called at the beginning of a batch of updates. batchSize is the number
                // of update calls to expect.
                //
                // XXX This interface is pretty janky. reset probably ought to go back to
                // being its own function, and callers shouldn't have to calculate
                // batchSize. The optimization of not calling pause/remove should be
                // delayed until later: the first call to update() should buffer its
                // message, and then we can either directly apply it at endUpdate time if
                // it was the only update, or do pauseObservers/apply/apply at the next
                // update() if there's another one.
                beginUpdate (batchSize, reset) {
                    return _async_to_generator(function*() {
                        // pause observers so users don't see flicker when updating several
                        // objects at once (including the post-reconnect reset-and-reapply
                        // stage), and so that a re-sorting of a query can take advantage of the
                        // full _diffQuery moved calculation instead of applying change one at a
                        // time.
                        if (batchSize > 1 || reset) self._collection.pauseObservers();
                        if (reset) yield self._collection.remove({});
                    })();
                },
                // Apply an update.
                // XXX better specify this interface (not in terms of a wire message)?
                update (msg) {
                    var mongoId = MongoID.idParse(msg.id);
                    var doc = self._collection._docs.get(mongoId);
                    //When the server's mergebox is disabled for a collection, the client must gracefully handle it when:
                    // *We receive an added message for a document that is already there. Instead, it will be changed
                    // *We reeive a change message for a document that is not there. Instead, it will be added
                    // *We receive a removed messsage for a document that is not there. Instead, noting wil happen.
                    //Code is derived from client-side code originally in peerlibrary:control-mergebox
                    //https://github.com/peerlibrary/meteor-control-mergebox/blob/master/client.coffee
                    //For more information, refer to discussion "Initial support for publication strategies in livedata server":
                    //https://github.com/meteor/meteor/pull/11151
                    if (Meteor.isClient) {
                        if (msg.msg === 'added' && doc) {
                            msg.msg = 'changed';
                        } else if (msg.msg === 'removed' && !doc) {
                            return;
                        } else if (msg.msg === 'changed' && !doc) {
                            msg.msg = 'added';
                            const _ref = msg.fields;
                            for(let field in _ref){
                                const value = _ref[field];
                                if (value === void 0) {
                                    delete msg.fields[field];
                                }
                            }
                        }
                    }
                    // Is this a "replace the whole doc" message coming from the quiescence
                    // of method writes to an object? (Note that 'undefined' is a valid
                    // value meaning "remove it".)
                    if (msg.msg === 'replace') {
                        var replace = msg.replace;
                        if (!replace) {
                            if (doc) self._collection.remove(mongoId);
                        } else if (!doc) {
                            self._collection.insert(replace);
                        } else {
                            // XXX check that replace has no $ ops
                            self._collection.update(mongoId, replace);
                        }
                        return;
                    } else if (msg.msg === 'added') {
                        if (doc) {
                            throw new Error('Expected not to find a document already present for an add');
                        }
                        self._collection.insert(_object_spread({
                            _id: mongoId
                        }, msg.fields));
                    } else if (msg.msg === 'removed') {
                        if (!doc) throw new Error('Expected to find a document already present for removed');
                        self._collection.remove(mongoId);
                    } else if (msg.msg === 'changed') {
                        if (!doc) throw new Error('Expected to find a document to change');
                        const keys = Object.keys(msg.fields);
                        if (keys.length > 0) {
                            var modifier = {};
                            keys.forEach((key)=>{
                                const value = msg.fields[key];
                                if (EJSON.equals(doc[key], value)) {
                                    return;
                                }
                                if (typeof value === 'undefined') {
                                    if (!modifier.$unset) {
                                        modifier.$unset = {};
                                    }
                                    modifier.$unset[key] = 1;
                                } else {
                                    if (!modifier.$set) {
                                        modifier.$set = {};
                                    }
                                    modifier.$set[key] = value;
                                }
                            });
                            if (Object.keys(modifier).length > 0) {
                                self._collection.update(mongoId, modifier);
                            }
                        }
                    } else {
                        throw new Error("I don't know how to deal with this message");
                    }
                },
                // Called at the end of a batch of updates.livedata_connection.js:1287
                endUpdate () {
                    self._collection.resumeObserversClient();
                },
                // Used to preserve current versions of documents across a store reset.
                getDoc (id) {
                    return self.findOne(id);
                }
            }, wrappedStoreCommon);
            const wrappedStoreServer = _object_spread({
                beginUpdate (batchSize, reset) {
                    return _async_to_generator(function*() {
                        if (batchSize > 1 || reset) self._collection.pauseObservers();
                        if (reset) yield self._collection.removeAsync({});
                    })();
                },
                update (msg) {
                    return _async_to_generator(function*() {
                        var mongoId = MongoID.idParse(msg.id);
                        var doc = self._collection._docs.get(mongoId);
                        // Is this a "replace the whole doc" message coming from the quiescence
                        // of method writes to an object? (Note that 'undefined' is a valid
                        // value meaning "remove it".)
                        if (msg.msg === 'replace') {
                            var replace = msg.replace;
                            if (!replace) {
                                if (doc) yield self._collection.removeAsync(mongoId);
                            } else if (!doc) {
                                yield self._collection.insertAsync(replace);
                            } else {
                                // XXX check that replace has no $ ops
                                yield self._collection.updateAsync(mongoId, replace);
                            }
                            return;
                        } else if (msg.msg === 'added') {
                            if (doc) {
                                throw new Error('Expected not to find a document already present for an add');
                            }
                            yield self._collection.insertAsync(_object_spread({
                                _id: mongoId
                            }, msg.fields));
                        } else if (msg.msg === 'removed') {
                            if (!doc) throw new Error('Expected to find a document already present for removed');
                            yield self._collection.removeAsync(mongoId);
                        } else if (msg.msg === 'changed') {
                            if (!doc) throw new Error('Expected to find a document to change');
                            const keys = Object.keys(msg.fields);
                            if (keys.length > 0) {
                                var modifier = {};
                                keys.forEach((key)=>{
                                    const value = msg.fields[key];
                                    if (EJSON.equals(doc[key], value)) {
                                        return;
                                    }
                                    if (typeof value === 'undefined') {
                                        if (!modifier.$unset) {
                                            modifier.$unset = {};
                                        }
                                        modifier.$unset[key] = 1;
                                    } else {
                                        if (!modifier.$set) {
                                            modifier.$set = {};
                                        }
                                        modifier.$set[key] = value;
                                    }
                                });
                                if (Object.keys(modifier).length > 0) {
                                    yield self._collection.updateAsync(mongoId, modifier);
                                }
                            }
                        } else {
                            throw new Error("I don't know how to deal with this message");
                        }
                    })();
                },
                // Called at the end of a batch of updates.
                endUpdate () {
                    return _async_to_generator(function*() {
                        yield self._collection.resumeObserversServer();
                    })();
                },
                // Used to preserve current versions of documents across a store reset.
                getDoc (id) {
                    return _async_to_generator(function*() {
                        return self.findOneAsync(id);
                    })();
                }
            }, wrappedStoreCommon);
            // OK, we're going to be a slave, replicating some remote
            // database, except possibly with some temporary divergence while
            // we have unacknowledged RPC's.
            let registerStoreResult;
            if (Meteor.isClient) {
                registerStoreResult = self._connection.registerStoreClient(name, wrappedStoreClient);
            } else {
                registerStoreResult = self._connection.registerStoreServer(name, wrappedStoreServer);
            }
            const message = `There is already a collection named "${name}"`;
            const logWarn = ()=>{
                console.warn ? console.warn(message) : console.log(message);
            };
            if (!registerStoreResult) {
                return logWarn();
            }
            return registerStoreResult === null || registerStoreResult === void 0 ? void 0 : (_registerStoreResult_then = registerStoreResult.then) === null || _registerStoreResult_then === void 0 ? void 0 : _registerStoreResult_then.call(registerStoreResult, (ok)=>{
                if (!ok) {
                    logWarn();
                }
            });
        }).call(this);
    }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"methods_sync.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/collection/methods_sync.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({SyncMethods:()=>SyncMethods},true);let _object_spread;module.link("@swc/helpers/_/_object_spread",{_(v){_object_spread=v}},0);let _object_spread_props;module.link("@swc/helpers/_/_object_spread_props",{_(v){_object_spread_props=v}},1);

const SyncMethods = {
    /**
   * @summary Find the documents in a collection that match the selector.
   * @locus Anywhere
   * @method find
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} [selector] A query describing the documents to find
   * @param {Object} [options]
   * @param {MongoSortSpecifier} options.sort Sort order (default: natural order)
   * @param {Number} options.skip Number of results to skip at the beginning
   * @param {Number} options.limit Maximum number of results to return
   * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.
   * @param {Boolean} options.reactive (Client only) Default `true`; pass `false` to disable reactivity
   * @param {Function} options.transform Overrides `transform` on the  [`Collection`](#collections) for this cursor.  Pass `null` to disable transformation.
   * @param {Boolean} options.disableOplog (Server only) Pass true to disable oplog-tailing on this query. This affects the way server processes calls to `observe` on this query. Disabling the oplog can be useful when working with data that updates in large batches.
   * @param {Number} options.pollingIntervalMs (Server only) When oplog is disabled (through the use of `disableOplog` or when otherwise not available), the frequency (in milliseconds) of how often to poll this query when observing on the server. Defaults to 10000ms (10 seconds).
   * @param {Number} options.pollingThrottleMs (Server only) When oplog is disabled (through the use of `disableOplog` or when otherwise not available), the minimum time (in milliseconds) to allow between re-polling when observing on the server. Increasing this will save CPU and mongo load at the expense of slower updates to users. Decreasing this is not recommended. Defaults to 50ms.
   * @param {Number} options.maxTimeMs (Server only) If set, instructs MongoDB to set a time limit for this cursor's operations. If the operation reaches the specified time limit (in milliseconds) without the having been completed, an exception will be thrown. Useful to prevent an (accidental or malicious) unoptimized query from causing a full collection scan that would disrupt other database users, at the expense of needing to handle the resulting error.
   * @param {String|Object} options.hint (Server only) Overrides MongoDB's default index selection and query optimization process. Specify an index to force its use, either by its name or index specification. You can also specify `{ $natural : 1 }` to force a forwards collection scan, or `{ $natural : -1 }` for a reverse collection scan. Setting this is only recommended for advanced users.
   * @param {String} options.readPreference (Server only) Specifies a custom MongoDB [`readPreference`](https://docs.mongodb.com/manual/core/read-preference) for this particular cursor. Possible values are `primary`, `primaryPreferred`, `secondary`, `secondaryPreferred` and `nearest`.
   * @returns {Mongo.Cursor}
   */ find (...args) {
        // Collection.find() (return all docs) behaves differently
        // from Collection.find(undefined) (return 0 docs).  so be
        // careful about the length of arguments.
        return this._collection.find(this._getFindSelector(args), this._getFindOptions(args));
    },
    /**
   * @summary Finds the first document that matches the selector, as ordered by sort and skip options. Returns `undefined` if no matching document is found.
   * @locus Anywhere
   * @method findOne
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} [selector] A query describing the documents to find
   * @param {Object} [options]
   * @param {MongoSortSpecifier} options.sort Sort order (default: natural order)
   * @param {Number} options.skip Number of results to skip at the beginning
   * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.
   * @param {Boolean} options.reactive (Client only) Default true; pass false to disable reactivity
   * @param {Function} options.transform Overrides `transform` on the [`Collection`](#collections) for this cursor.  Pass `null` to disable transformation.
   * @param {String} options.readPreference (Server only) Specifies a custom MongoDB [`readPreference`](https://docs.mongodb.com/manual/core/read-preference) for fetching the document. Possible values are `primary`, `primaryPreferred`, `secondary`, `secondaryPreferred` and `nearest`.
   * @returns {Object}
   */ findOne (...args) {
        return this._collection.findOne(this._getFindSelector(args), this._getFindOptions(args));
    },
    // 'insert' immediately returns the inserted document's new _id.
    // The others return values immediately if you are in a stub, an in-memory
    // unmanaged collection, or a mongo-backed collection and you don't pass a
    // callback. 'update' and 'remove' return the number of affected
    // documents. 'upsert' returns an object with keys 'numberAffected' and, if an
    // insert happened, 'insertedId'.
    //
    // Otherwise, the semantics are exactly like other methods: they take
    // a callback as an optional last argument; if no callback is
    // provided, they block until the operation is complete, and throw an
    // exception if it fails; if a callback is provided, then they don't
    // necessarily block, and they call the callback when they finish with error and
    // result arguments.  (The insert method provides the document ID as its result;
    // update and remove provide the number of affected docs as the result; upsert
    // provides an object with numberAffected and maybe insertedId.)
    //
    // On the client, blocking is impossible, so if a callback
    // isn't provided, they just return immediately and any error
    // information is lost.
    //
    // There's one more tweak. On the client, if you don't provide a
    // callback, then if there is an error, a message will be logged with
    // Meteor._debug.
    //
    // The intent (though this is actually determined by the underlying
    // drivers) is that the operations should be done synchronously, not
    // generating their result until the database has acknowledged
    // them. In the future maybe we should provide a flag to turn this
    // off.
    _insert (doc, callback) {
        // Make sure we were passed a document to insert
        if (!doc) {
            throw new Error('insert requires an argument');
        }
        // Make a shallow clone of the document, preserving its prototype.
        doc = Object.create(Object.getPrototypeOf(doc), Object.getOwnPropertyDescriptors(doc));
        if ('_id' in doc) {
            if (!doc._id || !(typeof doc._id === 'string' || doc._id instanceof Mongo.ObjectID)) {
                throw new Error('Meteor requires document _id fields to be non-empty strings or ObjectIDs');
            }
        } else {
            let generateId = true;
            // Don't generate the id if we're the client and the 'outermost' call
            // This optimization saves us passing both the randomSeed and the id
            // Passing both is redundant.
            if (this._isRemoteCollection()) {
                const enclosing = DDP._CurrentMethodInvocation.get();
                if (!enclosing) {
                    generateId = false;
                }
            }
            if (generateId) {
                doc._id = this._makeNewID();
            }
        }
        // On inserts, always return the id that we generated; on all other
        // operations, just return the result from the collection.
        var chooseReturnValueFromCollectionResult = function(result) {
            if (Meteor._isPromise(result)) return result;
            if (doc._id) {
                return doc._id;
            }
            // XXX what is this for??
            // It's some iteraction between the callback to _callMutatorMethod and
            // the return value conversion
            doc._id = result;
            return result;
        };
        const wrappedCallback = wrapCallback(callback, chooseReturnValueFromCollectionResult);
        if (this._isRemoteCollection()) {
            const result = this._callMutatorMethod('insert', [
                doc
            ], wrappedCallback);
            return chooseReturnValueFromCollectionResult(result);
        }
        // it's my collection.  descend into the collection object
        // and propagate any exception.
        try {
            // If the user provided a callback and the collection implements this
            // operation asynchronously, then queryRet will be undefined, and the
            // result will be returned through the callback instead.
            let result;
            if (!!wrappedCallback) {
                this._collection.insert(doc, wrappedCallback);
            } else {
                // If we don't have the callback, we assume the user is using the promise.
                // We can't just pass this._collection.insert to the promisify because it would lose the context.
                result = this._collection.insert(doc);
            }
            return chooseReturnValueFromCollectionResult(result);
        } catch (e) {
            if (callback) {
                callback(e);
                return null;
            }
            throw e;
        }
    },
    /**
   * @summary Insert a document in the collection.  Returns its unique _id.
   * @locus Anywhere
   * @method  insert
   * @memberof Mongo.Collection
   * @instance
   * @param {Object} doc The document to insert. May not yet have an _id attribute, in which case Meteor will generate one for you.
   * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the _id as the second.
   */ insert (doc, callback) {
        return this._insert(doc, callback);
    },
    /**
   * @summary Asynchronously modifies one or more documents in the collection. Returns the number of matched documents.
   * @locus Anywhere
   * @method update
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} selector Specifies which documents to modify
   * @param {MongoModifier} modifier Specifies how to modify the documents
   * @param {Object} [options]
   * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
   * @param {Boolean} options.upsert True to insert a document if no matching documents are found.
   * @param {Array} options.arrayFilters Optional. Used in combination with MongoDB [filtered positional operator](https://docs.mongodb.com/manual/reference/operator/update/positional-filtered/) to specify which elements to modify in an array field.
   * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the number of affected documents as the second.
   */ update (selector, modifier, ...optionsAndCallback) {
        const callback = popCallbackFromArgs(optionsAndCallback);
        // We've already popped off the callback, so we are left with an array
        // of one or zero items
        const options = _object_spread({}, optionsAndCallback[0] || null);
        let insertedId;
        if (options && options.upsert) {
            // set `insertedId` if absent.  `insertedId` is a Meteor extension.
            if (options.insertedId) {
                if (!(typeof options.insertedId === 'string' || options.insertedId instanceof Mongo.ObjectID)) throw new Error('insertedId must be string or ObjectID');
                insertedId = options.insertedId;
            } else if (!selector || !selector._id) {
                insertedId = this._makeNewID();
                options.generatedId = true;
                options.insertedId = insertedId;
            }
        }
        selector = Mongo.Collection._rewriteSelector(selector, {
            fallbackId: insertedId
        });
        const wrappedCallback = wrapCallback(callback);
        if (this._isRemoteCollection()) {
            const args = [
                selector,
                modifier,
                options
            ];
            return this._callMutatorMethod('update', args, callback);
        }
        // it's my collection.  descend into the collection object
        // and propagate any exception.
        // If the user provided a callback and the collection implements this
        // operation asynchronously, then queryRet will be undefined, and the
        // result will be returned through the callback instead.
        //console.log({callback, options, selector, modifier, coll: this._collection});
        try {
            // If the user provided a callback and the collection implements this
            // operation asynchronously, then queryRet will be undefined, and the
            // result will be returned through the callback instead.
            return this._collection.update(selector, modifier, options, wrappedCallback);
        } catch (e) {
            if (callback) {
                callback(e);
                return null;
            }
            throw e;
        }
    },
    /**
   * @summary Remove documents from the collection
   * @locus Anywhere
   * @method remove
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} selector Specifies which documents to remove
   * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the number of affected documents as the second.
   */ remove (selector, callback) {
        selector = Mongo.Collection._rewriteSelector(selector);
        if (this._isRemoteCollection()) {
            return this._callMutatorMethod('remove', [
                selector
            ], callback);
        }
        // it's my collection.  descend into the collection1 object
        // and propagate any exception.
        return this._collection.remove(selector);
    },
    /**
   * @summary Asynchronously modifies one or more documents in the collection, or insert one if no matching documents were found. Returns an object with keys `numberAffected` (the number of documents modified)  and `insertedId` (the unique _id of the document that was inserted, if any).
   * @locus Anywhere
   * @method upsert
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} selector Specifies which documents to modify
   * @param {MongoModifier} modifier Specifies how to modify the documents
   * @param {Object} [options]
   * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
   * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the number of affected documents as the second.
   */ upsert (selector, modifier, options, callback) {
        if (!callback && typeof options === 'function') {
            callback = options;
            options = {};
        }
        return this.update(selector, modifier, _object_spread_props(_object_spread({}, options), {
            _returnObject: true,
            upsert: true
        }));
    }
};
// Convert the callback to not return a result if there is an error
function wrapCallback(callback, convertResult) {
    return callback && function(error, result) {
        if (error) {
            callback(error);
        } else if (typeof convertResult === 'function') {
            callback(error, convertResult(result));
        } else {
            callback(error, result);
        }
    };
}
function popCallbackFromArgs(args) {
    // Pull off any callback (or perhaps a 'callback' variable that was passed
    // in undefined, like how 'upsert' does it).
    if (args.length && (args[args.length - 1] === undefined || args[args.length - 1] instanceof Function)) {
        return args.pop();
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"connection_options.ts":function module(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/connection_options.ts                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**
 * @summary Allows for user specified connection options
 * @example http://mongodb.github.io/node-mongodb-native/3.0/reference/connecting/connection-settings/
 * @locus Server
 * @param {Object} options User specified Mongo connection options
 */ Mongo.setConnectionOptions = function setConnectionOptions(options) {
    check(options, Object);
    Mongo._connectionOptions = options;
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"mongo_utils.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/mongo_utils.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({normalizeProjection:()=>normalizeProjection},true);let _object_spread;module.link("@swc/helpers/_/_object_spread",{_(v){_object_spread=v}},0);let _object_without_properties;module.link("@swc/helpers/_/_object_without_properties",{_(v){_object_without_properties=v}},1);

const normalizeProjection = (options)=>{
    // transform fields key in projection
    const _ref = options || {}, { fields, projection } = _ref, otherOptions = _object_without_properties(_ref, [
        "fields",
        "projection"
    ]);
    // TODO: enable this comment when deprecating the fields option
    // Log.debug(`fields option has been deprecated, please use the new 'projection' instead`)
    return _object_spread({}, otherOptions, projection || fields ? {
        projection: fields || projection
    } : {});
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"observe_handle.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/observe_handle.ts                                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({ObserveHandle:()=>ObserveHandle});let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);let _define_property;module.link("@swc/helpers/_/_define_property",{_(v){_define_property=v}},1);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();

let nextObserveHandleId = 1;
/**
 * The "observe handle" returned from observeChanges.
 * Contains a reference to an ObserveMultiplexer.
 * Used to stop observation and clean up resources.
 */ class ObserveHandle {
    constructor(multiplexer, callbacks, nonMutatingCallbacks){
        _define_property(this, "_id", void 0);
        _define_property(this, "_multiplexer", void 0);
        _define_property(this, "nonMutatingCallbacks", void 0);
        _define_property(this, "_stopped", void 0);
        _define_property(this, "initialAddsSentResolver", ()=>{});
        _define_property(this, "initialAddsSent", void 0);
        _define_property(this, "_added", void 0);
        _define_property(this, "_addedBefore", void 0);
        _define_property(this, "_changed", void 0);
        _define_property(this, "_movedBefore", void 0);
        _define_property(this, "_removed", void 0);
        /**
   * Using property syntax and arrow function syntax to avoid binding the wrong context on callbacks.
   */ _define_property(this, "stop", ()=>_async_to_generator(function*() {
                if (this._stopped) return;
                this._stopped = true;
                yield this._multiplexer.removeHandle(this._id);
            }).call(this));
        this._multiplexer = multiplexer;
        multiplexer.callbackNames().forEach((name)=>{
            if (callbacks[name]) {
                this[`_${name}`] = callbacks[name];
                return;
            }
            if (name === "addedBefore" && callbacks.added) {
                this._addedBefore = function(id, fields, before) {
                    return _async_to_generator(function*() {
                        yield callbacks.added(id, fields);
                    })();
                };
            }
        });
        this._stopped = false;
        this._id = nextObserveHandleId++;
        this.nonMutatingCallbacks = nonMutatingCallbacks;
        this.initialAddsSent = new Promise((resolve)=>{
            const ready = ()=>{
                resolve();
                this.initialAddsSent = Promise.resolve();
            };
            const timeout = setTimeout(ready, 30000);
            this.initialAddsSentResolver = ()=>{
                ready();
                clearTimeout(timeout);
            };
        });
    }
}
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"lodash.isempty":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/mongo/node_modules/lodash.isempty/package.json                                                  //
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
// node_modules/meteor/mongo/node_modules/lodash.isempty/index.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"lodash.clone":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/mongo/node_modules/lodash.clone/package.json                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "lodash.clone",
  "version": "4.5.0"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/mongo/node_modules/lodash.clone/index.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"lodash.has":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/mongo/node_modules/lodash.has/package.json                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "lodash.has",
  "version": "4.5.2"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/mongo/node_modules/lodash.has/index.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"lodash.throttle":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/mongo/node_modules/lodash.throttle/package.json                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "lodash.throttle",
  "version": "4.1.1"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/mongo/node_modules/lodash.throttle/index.js                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"mongodb-uri":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/mongo/node_modules/mongodb-uri/package.json                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "mongodb-uri",
  "version": "0.9.7",
  "main": "mongodb-uri"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"mongodb-uri.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/mongo/node_modules/mongodb-uri/mongodb-uri.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"lodash.once":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/mongo/node_modules/lodash.once/package.json                                                     //
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
// node_modules/meteor/mongo/node_modules/lodash.once/index.js                                                         //
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
      MongoInternals: MongoInternals,
      Mongo: Mongo,
      ObserveMultiplexer: ObserveMultiplexer
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/mongo/mongo_driver.js",
    "/node_modules/meteor/mongo/oplog_tailing.ts",
    "/node_modules/meteor/mongo/observe_multiplex.ts",
    "/node_modules/meteor/mongo/doc_fetcher.js",
    "/node_modules/meteor/mongo/polling_observe_driver.ts",
    "/node_modules/meteor/mongo/oplog_observe_driver.js",
    "/node_modules/meteor/mongo/oplog_v2_converter.ts",
    "/node_modules/meteor/mongo/cursor_description.ts",
    "/node_modules/meteor/mongo/mongo_connection.js",
    "/node_modules/meteor/mongo/mongo_common.js",
    "/node_modules/meteor/mongo/asynchronous_cursor.js",
    "/node_modules/meteor/mongo/cursor.ts",
    "/node_modules/meteor/mongo/local_collection_driver.js",
    "/node_modules/meteor/mongo/remote_collection_driver.ts",
    "/node_modules/meteor/mongo/collection/collection.js",
    "/node_modules/meteor/mongo/connection_options.ts"
  ]
}});

//# sourceURL=meteor://💻app/packages/mongo.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vbW9uZ29fZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9vcGxvZ190YWlsaW5nLnRzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9vYnNlcnZlX211bHRpcGxleC50cyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vZG9jX2ZldGNoZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL3BvbGxpbmdfb2JzZXJ2ZV9kcml2ZXIudHMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL29wbG9nX29ic2VydmVfZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9vcGxvZ192Ml9jb252ZXJ0ZXIudHMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL2N1cnNvcl9kZXNjcmlwdGlvbi50cyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vbW9uZ29fY29ubmVjdGlvbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vbW9uZ29fY29tbW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9hc3luY2hyb25vdXNfY3Vyc29yLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9jdXJzb3IudHMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL2xvY2FsX2NvbGxlY3Rpb25fZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9yZW1vdGVfY29sbGVjdGlvbl9kcml2ZXIudHMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL2NvbGxlY3Rpb24vY29sbGVjdGlvbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vY29sbGVjdGlvbi9jb2xsZWN0aW9uX3V0aWxzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9jb2xsZWN0aW9uL21ldGhvZHNfYXN5bmMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL2NvbGxlY3Rpb24vbWV0aG9kc19pbmRleC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vY29sbGVjdGlvbi9tZXRob2RzX3JlcGxpY2F0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9jb2xsZWN0aW9uL21ldGhvZHNfc3luYy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vY29ubmVjdGlvbl9vcHRpb25zLnRzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9tb25nb191dGlscy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vb2JzZXJ2ZV9oYW5kbGUudHMiXSwibmFtZXMiOlsiTW9uZ29JbnRlcm5hbHMiLCJnbG9iYWwiLCJfX3BhY2thZ2VOYW1lIiwiTnBtTW9kdWxlcyIsIm1vbmdvZGIiLCJ2ZXJzaW9uIiwiTnBtTW9kdWxlTW9uZ29kYlZlcnNpb24iLCJtb2R1bGUiLCJNb25nb0RCIiwiTnBtTW9kdWxlIiwiUHJveHkiLCJnZXQiLCJ0YXJnZXQiLCJwcm9wZXJ0eUtleSIsInJlY2VpdmVyIiwiTWV0ZW9yIiwiZGVwcmVjYXRlIiwiUmVmbGVjdCIsIk9wbG9nSGFuZGxlIiwiQ29ubmVjdGlvbiIsIk1vbmdvQ29ubmVjdGlvbiIsIk9wbG9nT2JzZXJ2ZURyaXZlciIsIlRpbWVzdGFtcCIsInByb3RvdHlwZSIsImNsb25lIiwibGlzdGVuQWxsIiwiY3Vyc29yRGVzY3JpcHRpb24iLCJsaXN0ZW5DYWxsYmFjayIsImxpc3RlbmVycyIsImZvckVhY2hUcmlnZ2VyIiwidHJpZ2dlciIsInB1c2giLCJERFBTZXJ2ZXIiLCJfSW52YWxpZGF0aW9uQ3Jvc3NiYXIiLCJsaXN0ZW4iLCJzdG9wIiwiZm9yRWFjaCIsImxpc3RlbmVyIiwidHJpZ2dlckNhbGxiYWNrIiwia2V5IiwiY29sbGVjdGlvbiIsImNvbGxlY3Rpb25OYW1lIiwic3BlY2lmaWNJZHMiLCJMb2NhbENvbGxlY3Rpb24iLCJfaWRzTWF0Y2hlZEJ5U2VsZWN0b3IiLCJzZWxlY3RvciIsImlkIiwiT2JqZWN0IiwiYXNzaWduIiwiZHJvcENvbGxlY3Rpb24iLCJkcm9wRGF0YWJhc2UiLCJNb25nb1RpbWVzdGFtcCIsIkxvbmciLCJOcG1Nb2R1bGVNb25nb2RiIiwiT1BMT0dfQ09MTEVDVElPTiIsIlRPT19GQVJfQkVISU5EIiwicHJvY2VzcyIsImVudiIsIk1FVEVPUl9PUExPR19UT09fRkFSX0JFSElORCIsIlRBSUxfVElNRU9VVCIsIk1FVEVPUl9PUExPR19UQUlMX1RJTUVPVVQiLCJfZ2V0T3Bsb2dTZWxlY3RvciIsImxhc3RQcm9jZXNzZWRUUyIsIm9wbG9nQ3JpdGVyaWEiLCIkb3IiLCJvcCIsIiRpbiIsIiRleGlzdHMiLCJuc1JlZ2V4IiwiUmVnRXhwIiwiX2VzY2FwZVJlZ0V4cCIsIl9kYk5hbWUiLCJqb2luIiwiX29wbG9nT3B0aW9ucyIsImV4Y2x1ZGVDb2xsZWN0aW9ucyIsImxlbmd0aCIsIm5zIiwiJHJlZ2V4IiwiJG5pbiIsIm1hcCIsImNvbGxOYW1lIiwiaW5jbHVkZUNvbGxlY3Rpb25zIiwidHMiLCIkZ3QiLCIkYW5kIiwiX3N0b3BwZWQiLCJfdGFpbEhhbmRsZSIsIl9vbk9wbG9nRW50cnkiLCJjYWxsYmFjayIsIkVycm9yIiwiX3JlYWR5UHJvbWlzZSIsIm9yaWdpbmFsQ2FsbGJhY2siLCJiaW5kRW52aXJvbm1lbnQiLCJub3RpZmljYXRpb24iLCJlcnIiLCJfZGVidWciLCJsaXN0ZW5IYW5kbGUiLCJfY3Jvc3NiYXIiLCJvbk9wbG9nRW50cnkiLCJvblNraXBwZWRFbnRyaWVzIiwiX29uU2tpcHBlZEVudHJpZXNIb29rIiwicmVnaXN0ZXIiLCJfd2FpdFVudGlsQ2F1Z2h0VXAiLCJsYXN0RW50cnkiLCJvcGxvZ1NlbGVjdG9yIiwiX29wbG9nTGFzdEVudHJ5Q29ubmVjdGlvbiIsImZpbmRPbmVBc3luYyIsInByb2plY3Rpb24iLCJzb3J0IiwiJG5hdHVyYWwiLCJlIiwic2xlZXAiLCJKU09OIiwic3RyaW5naWZ5IiwiX2xhc3RQcm9jZXNzZWRUUyIsImxlc3NUaGFuT3JFcXVhbCIsImluc2VydEFmdGVyIiwiX2NhdGNoaW5nVXBSZXNvbHZlcnMiLCJncmVhdGVyVGhhbiIsInByb21pc2VSZXNvbHZlciIsInByb21pc2VUb0F3YWl0IiwiUHJvbWlzZSIsInIiLCJjbGVhclRpbWVvdXQiLCJfcmVzb2x2ZVRpbWVvdXQiLCJzZXRUaW1lb3V0IiwiY29uc29sZSIsImVycm9yIiwic3BsaWNlIiwicmVzb2x2ZXIiLCJ3YWl0VW50aWxDYXVnaHRVcCIsIl9zdGFydFRhaWxpbmciLCJtb25nb2RiVXJpIiwicmVxdWlyZSIsInBhcnNlIiwiX29wbG9nVXJsIiwiZGF0YWJhc2UiLCJfb3Bsb2dUYWlsQ29ubmVjdGlvbiIsIm1heFBvb2xTaXplIiwibWluUG9vbFNpemUiLCJpc01hc3RlckRvYyIsImRiIiwiYWRtaW4iLCJjb21tYW5kIiwiaXNtYXN0ZXIiLCJzZXROYW1lIiwibGFzdE9wbG9nRW50cnkiLCJDdXJzb3JEZXNjcmlwdGlvbiIsInRhaWxhYmxlIiwidGFpbCIsImRvYyIsIl9lbnRyeVF1ZXVlIiwiX21heWJlU3RhcnRXb3JrZXIiLCJfcmVhZHlQcm9taXNlUmVzb2x2ZXIiLCJfd29ya2VyUHJvbWlzZSIsIl93b3JrZXJBY3RpdmUiLCJpc0VtcHR5IiwicG9wIiwiY2xlYXIiLCJlYWNoIiwiX3NldExhc3RQcm9jZXNzZWRUUyIsInNoaWZ0IiwiaGFuZGxlRG9jIiwic2VxdWVuY2VyIiwiX2RlZmluZVRvb0ZhckJlaGluZCIsInZhbHVlIiwiX3Jlc2V0VG9vRmFyQmVoaW5kIiwib3Bsb2dVcmwiLCJkYk5hbWUiLCJfc3RhcnRUcmFpbGluZ1Byb21pc2UiLCJfRG91YmxlRW5kZWRRdWV1ZSIsIl9Dcm9zc2JhciIsImZhY3RQYWNrYWdlIiwiZmFjdE5hbWUiLCJzZXR0aW5ncyIsInBhY2thZ2VzIiwibW9uZ28iLCJvcGxvZ0luY2x1ZGVDb2xsZWN0aW9ucyIsIm9wbG9nRXhjbHVkZUNvbGxlY3Rpb25zIiwiSG9vayIsImRlYnVnUHJpbnRFeGNlcHRpb25zIiwiaWRGb3JPcCIsIm8iLCJfaWQiLCJvMiIsImhhbmRsZSIsImFwcGx5T3BzIiwibmV4dFRpbWVzdGFtcCIsImFkZCIsIk9ORSIsInN0YXJ0c1dpdGgiLCJzbGljZSIsImRyb3AiLCJmaXJlIiwicmVzb2x2ZSIsInNldEltbWVkaWF0ZSIsIk9ic2VydmVNdWx0aXBsZXhlciIsImFkZEhhbmRsZUFuZFNlbmRJbml0aWFsQWRkcyIsIl9hZGRIYW5kbGVBbmRTZW5kSW5pdGlhbEFkZHMiLCJfYWRkSGFuZGxlVGFza3NTY2hlZHVsZWRCdXROb3RQZXJmb3JtZWQiLCJQYWNrYWdlIiwiRmFjdHMiLCJpbmNyZW1lbnRTZXJ2ZXJGYWN0IiwiX3F1ZXVlIiwicnVuVGFzayIsIl9oYW5kbGVzIiwiX3NlbmRBZGRzIiwicmVtb3ZlSGFuZGxlIiwiX3JlYWR5IiwiX3N0b3AiLCJvcHRpb25zIiwiZnJvbVF1ZXJ5RXJyb3IiLCJfb25TdG9wIiwicmVhZHkiLCJxdWV1ZVRhc2siLCJfcmVzb2x2ZXIiLCJfaXNSZWFkeSIsInF1ZXJ5RXJyb3IiLCJvbkZsdXNoIiwiY2IiLCJjYWxsYmFja05hbWVzIiwiX29yZGVyZWQiLCJfYXBwbHlDYWxsYmFjayIsImNhbGxiYWNrTmFtZSIsImFyZ3MiLCJfY2FjaGUiLCJhcHBseUNoYW5nZSIsImFwcGx5IiwiaGFuZGxlSWQiLCJrZXlzIiwicmVzdWx0Iiwibm9uTXV0YXRpbmdDYWxsYmFja3MiLCJFSlNPTiIsIl9pc1Byb21pc2UiLCJjYXRjaCIsImluaXRpYWxBZGRzU2VudCIsInRoZW4iLCJfYWRkZWRCZWZvcmUiLCJfYWRkZWQiLCJhZGRQcm9taXNlcyIsImRvY3MiLCJmaWVsZHMiLCJwcm9taXNlIiwicmVqZWN0IiwiYWxsU2V0dGxlZCIsInAiLCJzdGF0dXMiLCJyZWFzb24iLCJpbml0aWFsQWRkc1NlbnRSZXNvbHZlciIsIm9yZGVyZWQiLCJvblN0b3AiLCJ1bmRlZmluZWQiLCJfQXN5bmNocm9ub3VzUXVldWUiLCJfQ2FjaGluZ0NoYW5nZU9ic2VydmVyIiwiRG9jRmV0Y2hlciIsImZldGNoIiwic2VsZiIsImNoZWNrIiwiU3RyaW5nIiwiX2NhbGxiYWNrc0Zvck9wIiwiaGFzIiwiY2FsbGJhY2tzIiwic2V0IiwiX21vbmdvQ29ubmVjdGlvbiIsImRlbGV0ZSIsIm1vbmdvQ29ubmVjdGlvbiIsIk1hcCIsIlBPTExJTkdfVEhST1RUTEVfTVMiLCJNRVRFT1JfUE9MTElOR19USFJPVFRMRV9NUyIsIlBPTExJTkdfSU5URVJWQUxfTVMiLCJNRVRFT1JfUE9MTElOR19JTlRFUlZBTF9NUyIsIlBvbGxpbmdPYnNlcnZlRHJpdmVyIiwiX2luaXQiLCJfb3B0aW9ucyIsImxpc3RlbmVyc0hhbmRsZSIsIl9jdXJzb3JEZXNjcmlwdGlvbiIsImZlbmNlIiwiX2dldEN1cnJlbnRGZW5jZSIsIl9wZW5kaW5nV3JpdGVzIiwiYmVnaW5Xcml0ZSIsIl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQiLCJfZW5zdXJlUG9sbElzU2NoZWR1bGVkIiwiX3N0b3BDYWxsYmFja3MiLCJfdGVzdE9ubHlQb2xsQ2FsbGJhY2siLCJwb2xsaW5nSW50ZXJ2YWwiLCJwb2xsaW5nSW50ZXJ2YWxNcyIsIl9wb2xsaW5nSW50ZXJ2YWwiLCJpbnRlcnZhbEhhbmRsZSIsInNldEludGVydmFsIiwiYmluZCIsImNsZWFySW50ZXJ2YWwiLCJfdW50aHJvdHRsZWRFbnN1cmVQb2xsSXNTY2hlZHVsZWQiLCJfdGFza1F1ZXVlIiwiX3BvbGxNb25nbyIsIl9zdXNwZW5kUG9sbGluZyIsIl9yZXN1bWVQb2xsaW5nIiwiZmlyc3QiLCJuZXdSZXN1bHRzIiwib2xkUmVzdWx0cyIsIl9yZXN1bHRzIiwiX0lkTWFwIiwid3JpdGVzRm9yQ3ljbGUiLCJfY3Vyc29yIiwiZ2V0UmF3T2JqZWN0cyIsImNvZGUiLCJfbXVsdGlwbGV4ZXIiLCJtZXNzYWdlIiwiQXJyYXkiLCJfZGlmZlF1ZXJ5Q2hhbmdlcyIsInciLCJjb21taXR0ZWQiLCJfbW9uZ29IYW5kbGUiLCJtb25nb0hhbmRsZSIsIm11bHRpcGxleGVyIiwiX2NyZWF0ZUFzeW5jaHJvbm91c0N1cnNvciIsInRocm90dGxlIiwicG9sbGluZ1Rocm90dGxlTXMiLCJQSEFTRSIsIlFVRVJZSU5HIiwiRkVUQ0hJTkciLCJTVEVBRFkiLCJTd2l0Y2hlZFRvUXVlcnkiLCJmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeSIsImYiLCJhcmd1bWVudHMiLCJjdXJyZW50SWQiLCJfdXNlc09wbG9nIiwic29ydGVyIiwiY29tcGFyYXRvciIsImdldENvbXBhcmF0b3IiLCJsaW1pdCIsImhlYXBPcHRpb25zIiwiSWRNYXAiLCJfbGltaXQiLCJfY29tcGFyYXRvciIsIl9zb3J0ZXIiLCJfdW5wdWJsaXNoZWRCdWZmZXIiLCJNaW5NYXhIZWFwIiwiX3B1Ymxpc2hlZCIsIk1heEhlYXAiLCJfc2FmZUFwcGVuZFRvQnVmZmVyIiwiX3N0b3BIYW5kbGVzIiwiX2FkZFN0b3BIYW5kbGVzIiwibmV3U3RvcEhhbmRsZXMiLCJleHBlY3RlZFBhdHRlcm4iLCJNYXRjaCIsIk9iamVjdEluY2x1ZGluZyIsIkZ1bmN0aW9uIiwiT25lT2YiLCJfcmVnaXN0ZXJQaGFzZUNoYW5nZSIsIl9tYXRjaGVyIiwibWF0Y2hlciIsIl9wcm9qZWN0aW9uRm4iLCJfY29tcGlsZVByb2plY3Rpb24iLCJfc2hhcmVkUHJvamVjdGlvbiIsImNvbWJpbmVJbnRvUHJvamVjdGlvbiIsIl9zaGFyZWRQcm9qZWN0aW9uRm4iLCJfbmVlZFRvRmV0Y2giLCJfY3VycmVudGx5RmV0Y2hpbmciLCJfZmV0Y2hHZW5lcmF0aW9uIiwiX3JlcXVlcnlXaGVuRG9uZVRoaXNRdWVyeSIsIl93cml0ZXNUb0NvbW1pdFdoZW5XZVJlYWNoU3RlYWR5IiwiX29wbG9nSGFuZGxlIiwiX25lZWRUb1BvbGxRdWVyeSIsIl9waGFzZSIsIl9oYW5kbGVPcGxvZ0VudHJ5UXVlcnlpbmciLCJfaGFuZGxlT3Bsb2dFbnRyeVN0ZWFkeU9yRmV0Y2hpbmciLCJmaXJlZCIsIl9vcGxvZ09ic2VydmVEcml2ZXJzIiwib25CZWZvcmVGaXJlIiwiZHJpdmVycyIsImRyaXZlciIsInZhbHVlcyIsIndyaXRlIiwiX29uRmFpbG92ZXIiLCJfcnVuSW5pdGlhbFF1ZXJ5IiwiX2FkZFB1Ymxpc2hlZCIsIl9ub1lpZWxkc0FsbG93ZWQiLCJhZGRlZCIsInNpemUiLCJvdmVyZmxvd2luZ0RvY0lkIiwibWF4RWxlbWVudElkIiwib3ZlcmZsb3dpbmdEb2MiLCJlcXVhbHMiLCJyZW1vdmUiLCJyZW1vdmVkIiwiX2FkZEJ1ZmZlcmVkIiwiX3JlbW92ZVB1Ymxpc2hlZCIsImVtcHR5IiwibmV3RG9jSWQiLCJtaW5FbGVtZW50SWQiLCJuZXdEb2MiLCJfcmVtb3ZlQnVmZmVyZWQiLCJfY2hhbmdlUHVibGlzaGVkIiwib2xkRG9jIiwicHJvamVjdGVkTmV3IiwicHJvamVjdGVkT2xkIiwiY2hhbmdlZCIsIkRpZmZTZXF1ZW5jZSIsIm1ha2VDaGFuZ2VkRmllbGRzIiwibWF4QnVmZmVyZWRJZCIsIl9hZGRNYXRjaGluZyIsIm1heFB1Ymxpc2hlZCIsIm1heEJ1ZmZlcmVkIiwidG9QdWJsaXNoIiwiY2FuQXBwZW5kVG9CdWZmZXIiLCJjYW5JbnNlcnRJbnRvQnVmZmVyIiwidG9CdWZmZXIiLCJfcmVtb3ZlTWF0Y2hpbmciLCJfaGFuZGxlRG9jIiwibWF0Y2hlc05vdyIsImRvY3VtZW50TWF0Y2hlcyIsInB1Ymxpc2hlZEJlZm9yZSIsImJ1ZmZlcmVkQmVmb3JlIiwiY2FjaGVkQmVmb3JlIiwibWluQnVmZmVyZWQiLCJzdGF5c0luUHVibGlzaGVkIiwic3RheXNJbkJ1ZmZlciIsIl9mZXRjaE1vZGlmaWVkRG9jdW1lbnRzIiwiZGVmZXIiLCJ0aGlzR2VuZXJhdGlvbiIsImZldGNoUHJvbWlzZXMiLCJmZXRjaFByb21pc2UiLCJfZG9jRmV0Y2hlciIsInJlc3VsdHMiLCJlcnJvcnMiLCJmaWx0ZXIiLCJfYmVTdGVhZHkiLCJ3cml0ZXMiLCJvcGxvZ1YyVjFDb252ZXJ0ZXIiLCJpc1JlcGxhY2UiLCJjYW5EaXJlY3RseU1vZGlmeURvYyIsIm1vZGlmaWVyQ2FuQmVEaXJlY3RseUFwcGxpZWQiLCJfbW9kaWZ5IiwibmFtZSIsImNhbkJlY29tZVRydWVCeU1vZGlmaWVyIiwiYWZmZWN0ZWRCeU1vZGlmaWVyIiwiX3J1bkluaXRpYWxRdWVyeUFzeW5jIiwiX3J1blF1ZXJ5IiwiaW5pdGlhbCIsIl9kb25lUXVlcnlpbmciLCJfcG9sbFF1ZXJ5IiwiX3J1blF1ZXJ5QXN5bmMiLCJuZXdCdWZmZXIiLCJjdXJzb3IiLCJfY3Vyc29yRm9yUXVlcnkiLCJpIiwiX3NsZWVwRm9yTXMiLCJfcHVibGlzaE5ld1Jlc3VsdHMiLCJvcHRpb25zT3ZlcndyaXRlIiwidHJhbnNmb3JtIiwiZGVzY3JpcHRpb24iLCJDdXJzb3IiLCJpZHNUb1JlbW92ZSIsIl9vcGxvZ0VudHJ5SGFuZGxlIiwiX2xpc3RlbmVyc0hhbmRsZSIsInBoYXNlIiwibm93IiwiRGF0ZSIsInRpbWVEaWZmIiwiX3BoYXNlU3RhcnRUaW1lIiwiY3Vyc29yU3VwcG9ydGVkIiwiZGlzYWJsZU9wbG9nIiwiX2Rpc2FibGVPcGxvZyIsInNraXAiLCJfY2hlY2tTdXBwb3J0ZWRQcm9qZWN0aW9uIiwiaGFzV2hlcmUiLCJoYXNHZW9RdWVyeSIsIm1vZGlmaWVyIiwiZW50cmllcyIsImV2ZXJ5Iiwib3BlcmF0aW9uIiwiZmllbGQiLCJ0ZXN0IiwiYXJyYXlPcGVyYXRvcktleVJlZ2V4IiwiaXNBcnJheU9wZXJhdG9yS2V5IiwiaXNBcnJheU9wZXJhdG9yIiwib3BlcmF0b3IiLCJhIiwicHJlZml4IiwiZmxhdHRlbk9iamVjdEludG8iLCJzb3VyY2UiLCJpc0FycmF5IiwiTW9uZ28iLCJPYmplY3RJRCIsIl9pc0N1c3RvbVR5cGUiLCJjb252ZXJ0T3Bsb2dEaWZmIiwib3Bsb2dFbnRyeSIsImRpZmYiLCJkaWZmS2V5IiwiJHVuc2V0IiwiJHNldCIsImZpZWxkVmFsdWUiLCJwb3NpdGlvbiIsInBvc2l0aW9uS2V5IiwiJHYiLCJjb252ZXJ0ZWRPcGxvZ0VudHJ5IiwiQ29sbGVjdGlvbiIsIl9yZXdyaXRlU2VsZWN0b3IiLCJGSUxFX0FTU0VUX1NVRkZJWCIsIkFTU0VUU19GT0xERVIiLCJBUFBfRk9MREVSIiwib3Bsb2dDb2xsZWN0aW9uV2FybmluZ3MiLCJ1cmwiLCJfb2JzZXJ2ZU11bHRpcGxleGVycyIsIl9vbkZhaWxvdmVySG9vayIsInVzZXJPcHRpb25zIiwiX2Nvbm5lY3Rpb25PcHRpb25zIiwibW9uZ29PcHRpb25zIiwiaWdub3JlVW5kZWZpbmVkIiwiZW5kc1dpdGgiLCJvcHRpb25OYW1lIiwicmVwbGFjZSIsInBhdGgiLCJBc3NldHMiLCJnZXRTZXJ2ZXJEaXIiLCJkcml2ZXJJbmZvIiwicmVsZWFzZSIsImNsaWVudCIsIk1vbmdvQ2xpZW50Iiwib24iLCJldmVudCIsInByZXZpb3VzRGVzY3JpcHRpb24iLCJ0eXBlIiwibmV3RGVzY3JpcHRpb24iLCJkYXRhYmFzZU5hbWUiLCJfY2xvc2UiLCJvcGxvZ0hhbmRsZSIsImNsb3NlIiwiX3NldE9wbG9nSGFuZGxlIiwicmF3Q29sbGVjdGlvbiIsImNyZWF0ZUNhcHBlZENvbGxlY3Rpb25Bc3luYyIsImJ5dGVTaXplIiwibWF4RG9jdW1lbnRzIiwiY3JlYXRlQ29sbGVjdGlvbiIsImNhcHBlZCIsIm1heCIsIl9tYXliZUJlZ2luV3JpdGUiLCJpbnNlcnRBc3luYyIsImNvbGxlY3Rpb25fbmFtZSIsImRvY3VtZW50IiwiX2V4cGVjdGVkQnlUZXN0IiwiX2lzUGxhaW5PYmplY3QiLCJyZWZyZXNoIiwiaW5zZXJ0T25lIiwicmVwbGFjZVR5cGVzIiwicmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28iLCJzYWZlIiwiaW5zZXJ0ZWRJZCIsIl9yZWZyZXNoIiwicmVmcmVzaEtleSIsInJlbW92ZUFzeW5jIiwiZGVsZXRlTWFueSIsImRlbGV0ZWRDb3VudCIsInRyYW5zZm9ybVJlc3VsdCIsIm1vZGlmaWVkQ291bnQiLCJudW1iZXJBZmZlY3RlZCIsImRyb3BDb2xsZWN0aW9uQXN5bmMiLCJkcm9wRGF0YWJhc2VBc3luYyIsIl9kcm9wRGF0YWJhc2UiLCJ1cGRhdGVBc3luYyIsIm1vZCIsIm1vbmdvT3B0cyIsImFycmF5RmlsdGVycyIsInVwc2VydCIsIm11bHRpIiwiZnVsbFJlc3VsdCIsIm1vbmdvU2VsZWN0b3IiLCJtb25nb01vZCIsImlzTW9kaWZ5IiwiX2lzTW9kaWZpY2F0aW9uTW9kIiwiX2ZvcmJpZFJlcGxhY2UiLCJrbm93bklkIiwiX2NyZWF0ZVVwc2VydERvY3VtZW50IiwiZ2VuZXJhdGVkSWQiLCJzaW11bGF0ZVVwc2VydFdpdGhJbnNlcnRlZElkIiwiX3JldHVybk9iamVjdCIsImhhc093blByb3BlcnR5IiwiJHNldE9uSW5zZXJ0Iiwic3RyaW5ncyIsInVwZGF0ZU1ldGhvZCIsIm1ldGVvclJlc3VsdCIsIk9iamVjdElkIiwidG9IZXhTdHJpbmciLCJfaXNDYW5ub3RDaGFuZ2VJZEVycm9yIiwiZXJybXNnIiwiaW5kZXhPZiIsInVwc2VydEFzeW5jIiwiZmluZCIsImNyZWF0ZUluZGV4QXN5bmMiLCJpbmRleCIsImNyZWF0ZUluZGV4IiwiY291bnREb2N1bWVudHMiLCJhcmciLCJlc3RpbWF0ZWREb2N1bWVudENvdW50IiwiZW5zdXJlSW5kZXhBc3luYyIsImRyb3BJbmRleEFzeW5jIiwiaW5kZXhOYW1lIiwiZHJvcEluZGV4IiwiQ0xJRU5UX09OTFlfTUVUSE9EUyIsIm0iLCJnZXRBc3luY01ldGhvZE5hbWUiLCJOVU1fT1BUSU1JU1RJQ19UUklFUyIsIm1vbmdvT3B0c0ZvclVwZGF0ZSIsIm1vbmdvT3B0c0Zvckluc2VydCIsInJlcGxhY2VtZW50V2l0aElkIiwidHJpZXMiLCJkb1VwZGF0ZSIsIm1ldGhvZCIsInVwZGF0ZU1hbnkiLCJzb21lIiwicmVwbGFjZU9uZSIsInVwc2VydGVkQ291bnQiLCJ1cHNlcnRlZElkIiwiZG9Db25kaXRpb25hbEluc2VydCIsIl9vYnNlcnZlQ2hhbmdlc1RhaWxhYmxlIiwiYWRkZWRCZWZvcmUiLCJzZWxmRm9ySXRlcmF0aW9uIiwidXNlVHJhbnNmb3JtIiwiY3Vyc29yT3B0aW9ucyIsInJlYWRQcmVmZXJlbmNlIiwibnVtYmVyT2ZSZXRyaWVzIiwiZGJDdXJzb3IiLCJhZGRDdXJzb3JGbGFnIiwibWF4VGltZU1zIiwibWF4VGltZU1TIiwiaGludCIsIkFzeW5jaHJvbm91c0N1cnNvciIsImRvY0NhbGxiYWNrIiwidGltZW91dE1TIiwic3RvcHBlZCIsImxhc3RUUyIsImxvb3AiLCJfbmV4dE9iamVjdFByb21pc2VXaXRoVGltZW91dCIsIm5ld1NlbGVjdG9yIiwiX29ic2VydmVDaGFuZ2VzIiwiZmllbGRzT3B0aW9ucyIsIm9ic2VydmVLZXkiLCJvYnNlcnZlRHJpdmVyIiwiZmlyc3RIYW5kbGUiLCJvYnNlcnZlSGFuZGxlIiwiT2JzZXJ2ZUhhbmRsZSIsIm9wbG9nT3B0aW9ucyIsImNhblVzZU9wbG9nIiwiaW5jbHVkZXMiLCJ3YXJuIiwiTWluaW1vbmdvIiwiTWF0Y2hlciIsImlzQ2xpZW50IiwiTWluaU1vbmdvUXVlcnlFcnJvciIsIlNvcnRlciIsImRyaXZlckNsYXNzIiwiX29ic2VydmVEcml2ZXIiLCJ3cml0ZUNhbGxiYWNrIiwicmVmcmVzaEVyciIsImRyaXZlclJlc3VsdCIsIm1vbmdvUmVzdWx0IiwibiIsIm1hdGNoZWRDb3VudCIsImlzQmluYXJ5IiwiQmluYXJ5IiwiQnVmZmVyIiwiZnJvbSIsIkRlY2ltYWwiLCJEZWNpbWFsMTI4IiwiZnJvbVN0cmluZyIsInRvU3RyaW5nIiwicmVwbGFjZU5hbWVzIiwibWFrZU1vbmdvTGVnYWwiLCJ0b0pTT05WYWx1ZSIsImF0b21UcmFuc2Zvcm1lciIsInJlcGxhY2VkVG9wTGV2ZWxBdG9tIiwicmV0IiwidmFsIiwidmFsUmVwbGFjZWQiLCJyZXBsYWNlTW9uZ29BdG9tV2l0aE1ldGVvciIsInN1Yl90eXBlIiwiYnVmZmVyIiwiVWludDhBcnJheSIsImZyb21KU09OVmFsdWUiLCJ1bm1ha2VNb25nb0xlZ2FsIiwic3Vic3RyIiwidGhpbmciLCJTeW1ib2wiLCJhc3luY0l0ZXJhdG9yIiwibmV4dCIsIl9uZXh0T2JqZWN0UHJvbWlzZSIsImRvbmUiLCJfcmF3TmV4dE9iamVjdFByb21pc2UiLCJfY2xvc2luZyIsIl9wZW5kaW5nTmV4dCIsIl9kYkN1cnNvciIsIl92aXNpdGVkSWRzIiwiX3RyYW5zZm9ybSIsIm5leHRPYmplY3RQcm9taXNlIiwidGltZW91dFByb21pc2UiLCJ0aW1lb3V0SWQiLCJmaW5hbGx5IiwicmFjZSIsInRoaXNBcmciLCJfcmV3aW5kIiwiaWR4IiwiY2FsbCIsIl9zZWxmRm9ySXRlcmF0aW9uIiwicmV3aW5kIiwiY291bnQiLCJ3cmFwVHJhbnNmb3JtIiwiY291bnRBc3luYyIsIl9tb25nbyIsImdldFRyYW5zZm9ybSIsIl9wdWJsaXNoQ3Vyc29yIiwic3ViIiwiX2dldENvbGxlY3Rpb25OYW1lIiwib2JzZXJ2ZSIsIl9vYnNlcnZlRnJvbU9ic2VydmVDaGFuZ2VzIiwib2JzZXJ2ZUFzeW5jIiwib2JzZXJ2ZUNoYW5nZXMiLCJfb2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3NBcmVPcmRlcmVkIiwib2JzZXJ2ZUNoYW5nZXNBc3luYyIsIl9zeW5jaHJvbm91c0N1cnNvciIsIkFTWU5DX0NVUlNPUl9NRVRIT0RTIiwiaXRlcmF0b3IiLCJtZXRob2ROYW1lIiwic2V0dXBBc3luY2hyb25vdXNDdXJzb3IiLCJtZXRob2ROYW1lQXN5bmMiLCJMb2NhbENvbGxlY3Rpb25Ecml2ZXIiLCJvcGVuIiwiY29ubiIsImVuc3VyZUNvbGxlY3Rpb24iLCJub0Nvbm5Db2xsZWN0aW9ucyIsIl9tb25nb19saXZlZGF0YV9jb2xsZWN0aW9ucyIsImNyZWF0ZSIsImNvbGxlY3Rpb25zIiwiUmVtb3RlQ29sbGVjdGlvbkRyaXZlciIsIlJFTU9URV9DT0xMRUNUSU9OX01FVEhPRFMiLCJtb25nb01ldGhvZCIsIkFTWU5DX0NPTExFQ1RJT05fTUVUSE9EUyIsImFzeW5jTWV0aG9kTmFtZSIsIm1vbmdvVXJsIiwiZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIiLCJvbmNlIiwiY29ubmVjdGlvbk9wdGlvbnMiLCJNT05HT19VUkwiLCJNT05HT19PUExPR19VUkwiLCJzdGFydHVwIiwiY29ubmVjdCIsIklEX0dFTkVSQVRPUlMiLCJ2YWxpZGF0ZUNvbGxlY3Rpb25OYW1lIiwibm9ybWFsaXplT3B0aW9ucyIsIl9tYWtlTmV3SUQiLCJpZEdlbmVyYXRpb24iLCJyZXNvbHZlclR5cGUiLCJfY29ubmVjdGlvbiIsInNldHVwQ29ubmVjdGlvbiIsInNldHVwRHJpdmVyIiwiX2RyaXZlciIsIl9jb2xsZWN0aW9uIiwiX25hbWUiLCJfc2V0dGluZ1VwUmVwbGljYXRpb25Qcm9taXNlIiwiX21heWJlU2V0VXBSZXBsaWNhdGlvbiIsInNldHVwTXV0YXRpb25NZXRob2RzIiwic2V0dXBBdXRvcHVibGlzaCIsIl9jb2xsZWN0aW9ucyIsIl9nZXRGaW5kU2VsZWN0b3IiLCJfZ2V0RmluZE9wdGlvbnMiLCJuZXdPcHRpb25zIiwibm9ybWFsaXplUHJvamVjdGlvbiIsIk9wdGlvbmFsIiwiTnVtYmVyIiwiZmFsbGJhY2tJZCIsIl9zZWxlY3RvcklzSWQiLCJSYW5kb20iLCJSZXBsaWNhdGlvbk1ldGhvZHMiLCJTeW5jTWV0aG9kcyIsIkFzeW5jTWV0aG9kcyIsIkluZGV4TWV0aG9kcyIsIl9pc1JlbW90ZUNvbGxlY3Rpb24iLCJzZXJ2ZXIiLCJyYXdEYXRhYmFzZSIsImdldENvbGxlY3Rpb24iLCJNb25nb0lEIiwiQWxsb3dEZW55IiwiQ29sbGVjdGlvblByb3RvdHlwZSIsIk1PTkdPIiwic3JjIiwiRERQIiwicmFuZG9tU3RyZWFtIiwiaW5zZWN1cmUiLCJoZXhTdHJpbmciLCJTVFJJTkciLCJjb25uZWN0aW9uIiwiYXV0b3B1Ymxpc2giLCJfcHJldmVudEF1dG9wdWJsaXNoIiwicHVibGlzaCIsImlzX2F1dG8iLCJkZWZpbmVNdXRhdGlvbk1ldGhvZHMiLCJfZGVmaW5lTXV0YXRpb25NZXRob2RzIiwidXNlRXhpc3RpbmciLCJfc3VwcHJlc3NTYW1lTmFtZUVycm9yIiwibWV0aG9kcyIsIm1hbmFnZXIiLCJjbGVhbmVkT3B0aW9ucyIsImZyb21FbnRyaWVzIiwiXyIsInYiLCJfaW5zZXJ0QXN5bmMiLCJnZXRQcm90b3R5cGVPZiIsImdldE93blByb3BlcnR5RGVzY3JpcHRvcnMiLCJnZW5lcmF0ZUlkIiwiZW5jbG9zaW5nIiwiX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uIiwiY2hvb3NlUmV0dXJuVmFsdWVGcm9tQ29sbGVjdGlvblJlc3VsdCIsIl9jYWxsTXV0YXRvck1ldGhvZEFzeW5jIiwic3R1YlByb21pc2UiLCJzZXJ2ZXJQcm9taXNlIiwib3B0aW9uc0FuZENhbGxiYWNrIiwiTG9nIiwiZGVidWciLCJyZUNyZWF0ZUluZGV4T25PcHRpb25NaXNtYXRjaCIsImluZm8iLCJyZWdpc3RlclN0b3JlUmVzdWx0IiwicmVnaXN0ZXJTdG9yZUNsaWVudCIsInJlZ2lzdGVyU3RvcmVTZXJ2ZXIiLCJ3cmFwcGVkU3RvcmVDb21tb24iLCJzYXZlT3JpZ2luYWxzIiwicmV0cmlldmVPcmlnaW5hbHMiLCJfZ2V0Q29sbGVjdGlvbiIsIndyYXBwZWRTdG9yZUNsaWVudCIsImJlZ2luVXBkYXRlIiwiYmF0Y2hTaXplIiwicmVzZXQiLCJwYXVzZU9ic2VydmVycyIsInVwZGF0ZSIsIm1zZyIsIm1vbmdvSWQiLCJpZFBhcnNlIiwiX2RvY3MiLCJfcmVmIiwiaW5zZXJ0IiwiZW5kVXBkYXRlIiwicmVzdW1lT2JzZXJ2ZXJzQ2xpZW50IiwiZ2V0RG9jIiwiZmluZE9uZSIsIndyYXBwZWRTdG9yZVNlcnZlciIsInJlc3VtZU9ic2VydmVyc1NlcnZlciIsImxvZ1dhcm4iLCJsb2ciLCJvayIsIl9pbnNlcnQiLCJ3cmFwcGVkQ2FsbGJhY2siLCJ3cmFwQ2FsbGJhY2siLCJfY2FsbE11dGF0b3JNZXRob2QiLCJwb3BDYWxsYmFja0Zyb21BcmdzIiwiY29udmVydFJlc3VsdCIsInNldENvbm5lY3Rpb25PcHRpb25zIiwib3RoZXJPcHRpb25zIiwibmV4dE9ic2VydmVIYW5kbGVJZCIsIl9jaGFuZ2VkIiwiX21vdmVkQmVmb3JlIiwiX3JlbW92ZWQiLCJiZWZvcmUiLCJ0aW1lb3V0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBOEM7QUFDTztBQUNPO0FBQ25CO0FBRXpDQSxpQkFBaUJDLE9BQU9ELGNBQWMsR0FBRyxDQUFDO0FBRTFDQSxlQUFlRSxhQUFhLEdBQUc7QUFFL0JGLGVBQWVHLFVBQVUsR0FBRztJQUMxQkMsU0FBUztRQUNQQyxTQUFTQztRQUNUQyxRQUFRQztJQUNWO0FBQ0Y7QUFFQSw2Q0FBNkM7QUFDN0MsMEVBQTBFO0FBQzFFLG9CQUFvQjtBQUNwQiwwQkFBMEI7QUFDMUJSLGVBQWVTLFNBQVMsR0FBRyxJQUFJQyxNQUFNRixTQUFTO0lBQzVDRyxLQUFJQyxNQUFNLEVBQUVDLFdBQVcsRUFBRUMsUUFBUTtRQUMvQixJQUFJRCxnQkFBZ0IsWUFBWTtZQUM5QkUsT0FBT0MsU0FBUyxDQUNkLENBQUMsc0VBQXNFLENBQUMsR0FDeEUsQ0FBQyxnREFBZ0QsQ0FBQztRQUV0RDtRQUNBLE9BQU9DLFFBQVFOLEdBQUcsQ0FBQ0MsUUFBUUMsYUFBYUM7SUFDMUM7QUFDRjtBQUVBZCxlQUFla0IsV0FBVyxHQUFHQTtBQUU3QmxCLGVBQWVtQixVQUFVLEdBQUdDO0FBRTVCcEIsZUFBZXFCLGtCQUFrQixHQUFHQTtBQUVwQyw4RUFBOEU7QUFDOUUsc0VBQXNFO0FBR3RFLDRFQUE0RTtBQUM1RSw2QkFBNkI7QUFDN0IsMkVBQTJFO0FBQzNFYixRQUFRYyxTQUFTLENBQUNDLFNBQVMsQ0FBQ0MsS0FBSyxHQUFHO0lBQ2xDLGtDQUFrQztJQUNsQyxPQUFPLElBQUk7QUFDYjtBQUVBLHdFQUF3RTtBQUN4RSw4RUFBOEU7QUFDOUUsMEVBQTBFO0FBQzFFLDhFQUE4RTtBQUM5RSxrQ0FBa0M7QUFFbEMsT0FBTyxNQUFNQyxZQUFZLFNBQWdCQyxpQkFBaUIsRUFBRUMsVUFBYzs7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WSxDQUFDbEcsWUFBWSxDQUFDLElBQUksQ0FBQ3hCLEdBQUc7WUFDL0M7UUF6Q0UsSUFBSSxDQUFDMEgsWUFBWSxHQUFHUTtRQUVwQkEsWUFBWTdGLGFBQWEsR0FBR3hMLE9BQU8sQ0FBQyxDQUFDOFk7WUFDbkMsSUFBSTdLLFNBQVMsQ0FBQzZLLEtBQUssRUFBRTtnQkFDbkIsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFQSxNQUFNLENBQWtDLEdBQUc3SyxTQUFTLENBQUM2SyxLQUFLO2dCQUNuRTtZQUNGO1lBRUEsSUFBSUEsU0FBUyxpQkFBaUI3SyxVQUFVcUgsS0FBSyxFQUFFO2dCQUM3QyxJQUFJLENBQUM3SSxZQUFZLEdBQUcsU0FBZ0IvTCxFQUFFLEVBQUVtTSxNQUFNLEVBQUUybUIsTUFBTTs7d0JBQ3BELE1BQU12bEIsVUFBVXFILEtBQUssQ0FBQzVVLElBQUltTTtvQkFDNUI7O1lBQ0Y7UUFDRjtRQUVBLElBQUksQ0FBQzVKLFFBQVEsR0FBRztRQUNoQixJQUFJLENBQUNrRyxHQUFHLEdBQUdpcUI7UUFDWCxJQUFJLENBQUNqbkIsb0JBQW9CLEdBQUdBO1FBRTVCLElBQUksQ0FBQ0ksZUFBZSxHQUFHLElBQUlsSCxRQUFReUU7WUFDakMsTUFBTW1CLFFBQVE7Z0JBQ1puQjtnQkFDQSxJQUFJLENBQUN5QyxlQUFlLEdBQUdsSCxRQUFReUUsT0FBTztZQUN4QztZQUVBLE1BQU0ycEIsVUFBVWh1QixXQUFXd0YsT0FBTztZQUVsQyxJQUFJLENBQUNtQyx1QkFBdUIsR0FBRztnQkFDN0JuQztnQkFDQTFGLGFBQWFrdUI7WUFDZjtRQUNGO0lBQ0Y7QUFVRiIsImZpbGUiOiIvcGFja2FnZXMvbW9uZ28uanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBPcGxvZ0hhbmRsZSB9IGZyb20gJy4vb3Bsb2dfdGFpbGluZyc7XG5pbXBvcnQgeyBNb25nb0Nvbm5lY3Rpb24gfSBmcm9tICcuL21vbmdvX2Nvbm5lY3Rpb24nO1xuaW1wb3J0IHsgT3Bsb2dPYnNlcnZlRHJpdmVyIH0gZnJvbSAnLi9vcGxvZ19vYnNlcnZlX2RyaXZlcic7XG5pbXBvcnQgeyBNb25nb0RCIH0gZnJvbSAnLi9tb25nb19jb21tb24nO1xuXG5Nb25nb0ludGVybmFscyA9IGdsb2JhbC5Nb25nb0ludGVybmFscyA9IHt9O1xuXG5Nb25nb0ludGVybmFscy5fX3BhY2thZ2VOYW1lID0gJ21vbmdvJztcblxuTW9uZ29JbnRlcm5hbHMuTnBtTW9kdWxlcyA9IHtcbiAgbW9uZ29kYjoge1xuICAgIHZlcnNpb246IE5wbU1vZHVsZU1vbmdvZGJWZXJzaW9uLFxuICAgIG1vZHVsZTogTW9uZ29EQlxuICB9XG59O1xuXG4vLyBPbGRlciB2ZXJzaW9uIG9mIHdoYXQgaXMgbm93IGF2YWlsYWJsZSB2aWFcbi8vIE1vbmdvSW50ZXJuYWxzLk5wbU1vZHVsZXMubW9uZ29kYi5tb2R1bGUuICBJdCB3YXMgbmV2ZXIgZG9jdW1lbnRlZCwgYnV0XG4vLyBwZW9wbGUgZG8gdXNlIGl0LlxuLy8gWFhYIENPTVBBVCBXSVRIIDEuMC4zLjJcbk1vbmdvSW50ZXJuYWxzLk5wbU1vZHVsZSA9IG5ldyBQcm94eShNb25nb0RCLCB7XG4gIGdldCh0YXJnZXQsIHByb3BlcnR5S2V5LCByZWNlaXZlcikge1xuICAgIGlmIChwcm9wZXJ0eUtleSA9PT0gJ09iamVjdElEJykge1xuICAgICAgTWV0ZW9yLmRlcHJlY2F0ZShcbiAgICAgICAgYEFjY2Vzc2luZyAnTW9uZ29JbnRlcm5hbHMuTnBtTW9kdWxlLk9iamVjdElEJyBkaXJlY3RseSBpcyBkZXByZWNhdGVkLiBgICtcbiAgICAgICAgYFVzZSAnTW9uZ29JbnRlcm5hbHMuTnBtTW9kdWxlLk9iamVjdElkJyBpbnN0ZWFkLmBcbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiBSZWZsZWN0LmdldCh0YXJnZXQsIHByb3BlcnR5S2V5LCByZWNlaXZlcik7XG4gIH0sXG59KTtcblxuTW9uZ29JbnRlcm5hbHMuT3Bsb2dIYW5kbGUgPSBPcGxvZ0hhbmRsZTtcblxuTW9uZ29JbnRlcm5hbHMuQ29ubmVjdGlvbiA9IE1vbmdvQ29ubmVjdGlvbjtcblxuTW9uZ29JbnRlcm5hbHMuT3Bsb2dPYnNlcnZlRHJpdmVyID0gT3Bsb2dPYnNlcnZlRHJpdmVyO1xuXG4vLyBUaGlzIGlzIHVzZWQgdG8gYWRkIG9yIHJlbW92ZSBFSlNPTiBmcm9tIHRoZSBiZWdpbm5pbmcgb2YgZXZlcnl0aGluZyBuZXN0ZWRcbi8vIGluc2lkZSBhbiBFSlNPTiBjdXN0b20gdHlwZS4gSXQgc2hvdWxkIG9ubHkgYmUgY2FsbGVkIG9uIHB1cmUgSlNPTiFcblxuXG4vLyBFbnN1cmUgdGhhdCBFSlNPTi5jbG9uZSBrZWVwcyBhIFRpbWVzdGFtcCBhcyBhIFRpbWVzdGFtcCAoaW5zdGVhZCBvZiBqdXN0XG4vLyBkb2luZyBhIHN0cnVjdHVyYWwgY2xvbmUpLlxuLy8gWFhYIGhvdyBvayBpcyB0aGlzPyB3aGF0IGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBjb3BpZXMgb2YgTW9uZ29EQiBsb2FkZWQ/XG5Nb25nb0RCLlRpbWVzdGFtcC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIFRpbWVzdGFtcHMgc2hvdWxkIGJlIGltbXV0YWJsZS5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBMaXN0ZW4gZm9yIHRoZSBpbnZhbGlkYXRpb24gbWVzc2FnZXMgdGhhdCB3aWxsIHRyaWdnZXIgdXMgdG8gcG9sbCB0aGVcbi8vIGRhdGFiYXNlIGZvciBjaGFuZ2VzLiBJZiB0aGlzIHNlbGVjdG9yIHNwZWNpZmllcyBzcGVjaWZpYyBJRHMsIHNwZWNpZnkgdGhlbVxuLy8gaGVyZSwgc28gdGhhdCB1cGRhdGVzIHRvIGRpZmZlcmVudCBzcGVjaWZpYyBJRHMgZG9uJ3QgY2F1c2UgdXMgdG8gcG9sbC5cbi8vIGxpc3RlbkNhbGxiYWNrIGlzIHRoZSBzYW1lIGtpbmQgb2YgKG5vdGlmaWNhdGlvbiwgY29tcGxldGUpIGNhbGxiYWNrIHBhc3NlZFxuLy8gdG8gSW52YWxpZGF0aW9uQ3Jvc3NiYXIubGlzdGVuLlxuXG5leHBvcnQgY29uc3QgbGlzdGVuQWxsID0gYXN5bmMgZnVuY3Rpb24gKGN1cnNvckRlc2NyaXB0aW9uLCBsaXN0ZW5DYWxsYmFjaykge1xuICBjb25zdCBsaXN0ZW5lcnMgPSBbXTtcbiAgYXdhaXQgZm9yRWFjaFRyaWdnZXIoY3Vyc29yRGVzY3JpcHRpb24sIGZ1bmN0aW9uICh0cmlnZ2VyKSB7XG4gICAgbGlzdGVuZXJzLnB1c2goRERQU2VydmVyLl9JbnZhbGlkYXRpb25Dcm9zc2Jhci5saXN0ZW4oXG4gICAgICB0cmlnZ2VyLCBsaXN0ZW5DYWxsYmFjaykpO1xuICB9KTtcblxuICByZXR1cm4ge1xuICAgIHN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxpc3RlbmVycy5mb3JFYWNoKGZ1bmN0aW9uIChsaXN0ZW5lcikge1xuICAgICAgICBsaXN0ZW5lci5zdG9wKCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59O1xuXG5leHBvcnQgY29uc3QgZm9yRWFjaFRyaWdnZXIgPSBhc3luYyBmdW5jdGlvbiAoY3Vyc29yRGVzY3JpcHRpb24sIHRyaWdnZXJDYWxsYmFjaykge1xuICBjb25zdCBrZXkgPSB7Y29sbGVjdGlvbjogY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWV9O1xuICBjb25zdCBzcGVjaWZpY0lkcyA9IExvY2FsQ29sbGVjdGlvbi5faWRzTWF0Y2hlZEJ5U2VsZWN0b3IoXG4gICAgY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IpO1xuICBpZiAoc3BlY2lmaWNJZHMpIHtcbiAgICBmb3IgKGNvbnN0IGlkIG9mIHNwZWNpZmljSWRzKSB7XG4gICAgICBhd2FpdCB0cmlnZ2VyQ2FsbGJhY2soT2JqZWN0LmFzc2lnbih7aWQ6IGlkfSwga2V5KSk7XG4gICAgfVxuICAgIGF3YWl0IHRyaWdnZXJDYWxsYmFjayhPYmplY3QuYXNzaWduKHtkcm9wQ29sbGVjdGlvbjogdHJ1ZSwgaWQ6IG51bGx9LCBrZXkpKTtcbiAgfSBlbHNlIHtcbiAgICBhd2FpdCB0cmlnZ2VyQ2FsbGJhY2soa2V5KTtcbiAgfVxuICAvLyBFdmVyeW9uZSBjYXJlcyBhYm91dCB0aGUgZGF0YWJhc2UgYmVpbmcgZHJvcHBlZC5cbiAgYXdhaXQgdHJpZ2dlckNhbGxiYWNrKHsgZHJvcERhdGFiYXNlOiB0cnVlIH0pO1xufTtcblxuXG5cbi8vIFhYWCBXZSBwcm9iYWJseSBuZWVkIHRvIGZpbmQgYSBiZXR0ZXIgd2F5IHRvIGV4cG9zZSB0aGlzLiBSaWdodCBub3dcbi8vIGl0J3Mgb25seSB1c2VkIGJ5IHRlc3RzLCBidXQgaW4gZmFjdCB5b3UgbmVlZCBpdCBpbiBub3JtYWxcbi8vIG9wZXJhdGlvbiB0byBpbnRlcmFjdCB3aXRoIGNhcHBlZCBjb2xsZWN0aW9ucy5cbk1vbmdvSW50ZXJuYWxzLk1vbmdvVGltZXN0YW1wID0gTW9uZ29EQi5UaW1lc3RhbXA7XG4iLCJpbXBvcnQgaXNFbXB0eSBmcm9tICdsb2Rhc2guaXNlbXB0eSc7XG5pbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IEN1cnNvckRlc2NyaXB0aW9uIH0gZnJvbSAnLi9jdXJzb3JfZGVzY3JpcHRpb24nO1xuaW1wb3J0IHsgTW9uZ29Db25uZWN0aW9uIH0gZnJvbSAnLi9tb25nb19jb25uZWN0aW9uJztcblxuaW1wb3J0IHsgTnBtTW9kdWxlTW9uZ29kYiB9IGZyb20gXCJtZXRlb3IvbnBtLW1vbmdvXCI7XG5jb25zdCB7IExvbmcgfSA9IE5wbU1vZHVsZU1vbmdvZGI7XG5cbmV4cG9ydCBjb25zdCBPUExPR19DT0xMRUNUSU9OID0gJ29wbG9nLnJzJztcblxubGV0IFRPT19GQVJfQkVISU5EID0gKyhwcm9jZXNzLmVudi5NRVRFT1JfT1BMT0dfVE9PX0ZBUl9CRUhJTkQgfHwgMjAwMCk7XG5jb25zdCBUQUlMX1RJTUVPVVQgPSArKHByb2Nlc3MuZW52Lk1FVEVPUl9PUExPR19UQUlMX1RJTUVPVVQgfHwgMzAwMDApO1xuXG5leHBvcnQgaW50ZXJmYWNlIE9wbG9nRW50cnkge1xuICBvcDogc3RyaW5nO1xuICBvOiBhbnk7XG4gIG8yPzogYW55O1xuICB0czogYW55O1xuICBuczogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENhdGNoaW5nVXBSZXNvbHZlciB7XG4gIHRzOiBhbnk7XG4gIHJlc29sdmVyOiAoKSA9PiB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE9wbG9nVHJpZ2dlciB7XG4gIGRyb3BDb2xsZWN0aW9uOiBib29sZWFuO1xuICBkcm9wRGF0YWJhc2U6IGJvb2xlYW47XG4gIG9wOiBPcGxvZ0VudHJ5O1xuICBjb2xsZWN0aW9uPzogc3RyaW5nO1xuICBpZD86IHN0cmluZyB8IG51bGw7XG59XG5cbmV4cG9ydCBjbGFzcyBPcGxvZ0hhbmRsZSB7XG4gIHByaXZhdGUgX29wbG9nVXJsOiBzdHJpbmc7XG4gIHB1YmxpYyBfZGJOYW1lOiBzdHJpbmc7XG4gIHByaXZhdGUgX29wbG9nTGFzdEVudHJ5Q29ubmVjdGlvbjogTW9uZ29Db25uZWN0aW9uIHwgbnVsbDtcbiAgcHJpdmF0ZSBfb3Bsb2dUYWlsQ29ubmVjdGlvbjogTW9uZ29Db25uZWN0aW9uIHwgbnVsbDtcbiAgcHJpdmF0ZSBfb3Bsb2dPcHRpb25zOiB7XG4gICAgZXhjbHVkZUNvbGxlY3Rpb25zPzogc3RyaW5nW107XG4gICAgaW5jbHVkZUNvbGxlY3Rpb25zPzogc3RyaW5nW107XG4gIH07XG4gIHByaXZhdGUgX3N0b3BwZWQ6IGJvb2xlYW47XG4gIHByaXZhdGUgX3RhaWxIYW5kbGU6IGFueTtcbiAgcHJpdmF0ZSBfcmVhZHlQcm9taXNlUmVzb2x2ZXI6ICgoKSA9PiB2b2lkKSB8IG51bGw7XG4gIHByaXZhdGUgX3JlYWR5UHJvbWlzZTogUHJvbWlzZTx2b2lkPjtcbiAgcHVibGljIF9jcm9zc2JhcjogYW55O1xuICBwcml2YXRlIF9jYXRjaGluZ1VwUmVzb2x2ZXJzOiBDYXRjaGluZ1VwUmVzb2x2ZXJbXTtcbiAgcHJpdmF0ZSBfbGFzdFByb2Nlc3NlZFRTOiBhbnk7XG4gIHByaXZhdGUgX29uU2tpcHBlZEVudHJpZXNIb29rOiBhbnk7XG4gIHByaXZhdGUgX3N0YXJ0VHJhaWxpbmdQcm9taXNlOiBQcm9taXNlPHZvaWQ+O1xuICBwcml2YXRlIF9yZXNvbHZlVGltZW91dDogYW55O1xuXG4gIHByaXZhdGUgX2VudHJ5UXVldWUgPSBuZXcgTWV0ZW9yLl9Eb3VibGVFbmRlZFF1ZXVlKCk7XG4gIHByaXZhdGUgX3dvcmtlckFjdGl2ZSA9IGZhbHNlO1xuICBwcml2YXRlIF93b3JrZXJQcm9taXNlOiBQcm9taXNlPHZvaWQ+IHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3Iob3Bsb2dVcmw6IHN0cmluZywgZGJOYW1lOiBzdHJpbmcpIHtcbiAgICB0aGlzLl9vcGxvZ1VybCA9IG9wbG9nVXJsO1xuICAgIHRoaXMuX2RiTmFtZSA9IGRiTmFtZTtcblxuICAgIHRoaXMuX3Jlc29sdmVUaW1lb3V0ID0gbnVsbDtcbiAgICB0aGlzLl9vcGxvZ0xhc3RFbnRyeUNvbm5lY3Rpb24gPSBudWxsO1xuICAgIHRoaXMuX29wbG9nVGFpbENvbm5lY3Rpb24gPSBudWxsO1xuICAgIHRoaXMuX3N0b3BwZWQgPSBmYWxzZTtcbiAgICB0aGlzLl90YWlsSGFuZGxlID0gbnVsbDtcbiAgICB0aGlzLl9yZWFkeVByb21pc2VSZXNvbHZlciA9IG51bGw7XG4gICAgdGhpcy5fcmVhZHlQcm9taXNlID0gbmV3IFByb21pc2UociA9PiB0aGlzLl9yZWFkeVByb21pc2VSZXNvbHZlciA9IHIpOyBcbiAgICB0aGlzLl9jcm9zc2JhciA9IG5ldyBERFBTZXJ2ZXIuX0Nyb3NzYmFyKHtcbiAgICAgIGZhY3RQYWNrYWdlOiBcIm1vbmdvLWxpdmVkYXRhXCIsIGZhY3ROYW1lOiBcIm9wbG9nLXdhdGNoZXJzXCJcbiAgICB9KTtcblxuICAgIGNvbnN0IGluY2x1ZGVDb2xsZWN0aW9ucyA9XG4gICAgICBNZXRlb3Iuc2V0dGluZ3M/LnBhY2thZ2VzPy5tb25nbz8ub3Bsb2dJbmNsdWRlQ29sbGVjdGlvbnM7XG4gICAgY29uc3QgZXhjbHVkZUNvbGxlY3Rpb25zID1cbiAgICAgIE1ldGVvci5zZXR0aW5ncz8ucGFja2FnZXM/Lm1vbmdvPy5vcGxvZ0V4Y2x1ZGVDb2xsZWN0aW9ucztcbiAgICBpZiAoaW5jbHVkZUNvbGxlY3Rpb25zPy5sZW5ndGggJiYgZXhjbHVkZUNvbGxlY3Rpb25zPy5sZW5ndGgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgXCJDYW4ndCB1c2UgYm90aCBtb25nbyBvcGxvZyBzZXR0aW5ncyBvcGxvZ0luY2x1ZGVDb2xsZWN0aW9ucyBhbmQgb3Bsb2dFeGNsdWRlQ29sbGVjdGlvbnMgYXQgdGhlIHNhbWUgdGltZS5cIlxuICAgICAgKTtcbiAgICB9XG4gICAgdGhpcy5fb3Bsb2dPcHRpb25zID0geyBpbmNsdWRlQ29sbGVjdGlvbnMsIGV4Y2x1ZGVDb2xsZWN0aW9ucyB9O1xuXG4gICAgdGhpcy5fY2F0Y2hpbmdVcFJlc29sdmVycyA9IFtdO1xuICAgIHRoaXMuX2xhc3RQcm9jZXNzZWRUUyA9IG51bGw7XG5cbiAgICB0aGlzLl9vblNraXBwZWRFbnRyaWVzSG9vayA9IG5ldyBIb29rKHtcbiAgICAgIGRlYnVnUHJpbnRFeGNlcHRpb25zOiBcIm9uU2tpcHBlZEVudHJpZXMgY2FsbGJhY2tcIlxuICAgIH0pO1xuXG4gICAgdGhpcy5fc3RhcnRUcmFpbGluZ1Byb21pc2UgPSB0aGlzLl9zdGFydFRhaWxpbmcoKTtcbiAgfVxuXG4gIHByaXZhdGUgX2dldE9wbG9nU2VsZWN0b3IobGFzdFByb2Nlc3NlZFRTPzogYW55KTogYW55IHtcbiAgICBjb25zdCBvcGxvZ0NyaXRlcmlhOiBhbnkgPSBbXG4gICAgICB7XG4gICAgICAgICRvcjogW1xuICAgICAgICAgIHsgb3A6IHsgJGluOiBbXCJpXCIsIFwidVwiLCBcImRcIl0gfSB9LFxuICAgICAgICAgIHsgb3A6IFwiY1wiLCBcIm8uZHJvcFwiOiB7ICRleGlzdHM6IHRydWUgfSB9LFxuICAgICAgICAgIHsgb3A6IFwiY1wiLCBcIm8uZHJvcERhdGFiYXNlXCI6IDEgfSxcbiAgICAgICAgICB7IG9wOiBcImNcIiwgXCJvLmFwcGx5T3BzXCI6IHsgJGV4aXN0czogdHJ1ZSB9IH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIF07XG5cbiAgICBjb25zdCBuc1JlZ2V4ID0gbmV3IFJlZ0V4cChcbiAgICAgIFwiXig/OlwiICtcbiAgICAgICAgW1xuICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICBNZXRlb3IuX2VzY2FwZVJlZ0V4cCh0aGlzLl9kYk5hbWUgKyBcIi5cIiksXG4gICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgIE1ldGVvci5fZXNjYXBlUmVnRXhwKFwiYWRtaW4uJGNtZFwiKSxcbiAgICAgICAgXS5qb2luKFwifFwiKSArXG4gICAgICAgIFwiKVwiXG4gICAgKTtcblxuICAgIGlmICh0aGlzLl9vcGxvZ09wdGlvbnMuZXhjbHVkZUNvbGxlY3Rpb25zPy5sZW5ndGgpIHtcbiAgICAgIG9wbG9nQ3JpdGVyaWEucHVzaCh7XG4gICAgICAgIG5zOiB7XG4gICAgICAgICAgJHJlZ2V4OiBuc1JlZ2V4LFxuICAgICAgICAgICRuaW46IHRoaXMuX29wbG9nT3B0aW9ucy5leGNsdWRlQ29sbGVjdGlvbnMubWFwKFxuICAgICAgICAgICAgKGNvbGxOYW1lOiBzdHJpbmcpID0+IGAke3RoaXMuX2RiTmFtZX0uJHtjb2xsTmFtZX1gXG4gICAgICAgICAgKSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAodGhpcy5fb3Bsb2dPcHRpb25zLmluY2x1ZGVDb2xsZWN0aW9ucz8ubGVuZ3RoKSB7XG4gICAgICBvcGxvZ0NyaXRlcmlhLnB1c2goe1xuICAgICAgICAkb3I6IFtcbiAgICAgICAgICB7IG5zOiAvXmFkbWluXFwuXFwkY21kLyB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIG5zOiB7XG4gICAgICAgICAgICAgICRpbjogdGhpcy5fb3Bsb2dPcHRpb25zLmluY2x1ZGVDb2xsZWN0aW9ucy5tYXAoXG4gICAgICAgICAgICAgICAgKGNvbGxOYW1lOiBzdHJpbmcpID0+IGAke3RoaXMuX2RiTmFtZX0uJHtjb2xsTmFtZX1gXG4gICAgICAgICAgICAgICksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3Bsb2dDcml0ZXJpYS5wdXNoKHtcbiAgICAgICAgbnM6IG5zUmVnZXgsXG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYobGFzdFByb2Nlc3NlZFRTKSB7XG4gICAgICBvcGxvZ0NyaXRlcmlhLnB1c2goe1xuICAgICAgICB0czogeyAkZ3Q6IGxhc3RQcm9jZXNzZWRUUyB9LFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICRhbmQ6IG9wbG9nQ3JpdGVyaWEsXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHN0b3AoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuX3N0b3BwZWQpIHJldHVybjtcbiAgICB0aGlzLl9zdG9wcGVkID0gdHJ1ZTtcbiAgICBpZiAodGhpcy5fdGFpbEhhbmRsZSkge1xuICAgICAgYXdhaXQgdGhpcy5fdGFpbEhhbmRsZS5zdG9wKCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgX29uT3Bsb2dFbnRyeSh0cmlnZ2VyOiBPcGxvZ1RyaWdnZXIsIGNhbGxiYWNrOiBGdW5jdGlvbik6IFByb21pc2U8eyBzdG9wOiAoKSA9PiBQcm9taXNlPHZvaWQ+IH0+IHtcbiAgICBpZiAodGhpcy5fc3RvcHBlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FsbGVkIG9uT3Bsb2dFbnRyeSBvbiBzdG9wcGVkIGhhbmRsZSFcIik7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5fcmVhZHlQcm9taXNlO1xuXG4gICAgY29uc3Qgb3JpZ2luYWxDYWxsYmFjayA9IGNhbGxiYWNrO1xuXG4gICAgLyoqXG4gICAgICogVGhpcyBkZXBlbmRzIG9uIEFzeW5jaHJvbm91c1F1ZXVlIHRhc2tzIGJlaW5nIHdyYXBwZWQgaW4gYGJpbmRFbnZpcm9ubWVudGAgdG9vLlxuICAgICAqXG4gICAgICogQHRvZG8gQ2hlY2sgYWZ0ZXIgd2Ugc2ltcGxpZnkgdGhlIGBiaW5kRW52aXJvbm1lbnRgIGltcGxlbWVudGF0aW9uIGlmIHdlIGNhbiByZW1vdmUgdGhlIHNlY29uZCB3cmFwLlxuICAgICAqL1xuICAgIGNhbGxiYWNrID0gTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChcbiAgICAgIGZ1bmN0aW9uIChub3RpZmljYXRpb246IGFueSkge1xuICAgICAgICBvcmlnaW5hbENhbGxiYWNrKG5vdGlmaWNhdGlvbik7XG4gICAgICB9LFxuICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICBNZXRlb3IuX2RlYnVnKFwiRXJyb3IgaW4gb3Bsb2cgY2FsbGJhY2tcIiwgZXJyKTtcbiAgICAgIH1cbiAgICApO1xuXG4gICAgY29uc3QgbGlzdGVuSGFuZGxlID0gdGhpcy5fY3Jvc3NiYXIubGlzdGVuKHRyaWdnZXIsIGNhbGxiYWNrKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RvcDogYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgICBhd2FpdCBsaXN0ZW5IYW5kbGUuc3RvcCgpO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBvbk9wbG9nRW50cnkodHJpZ2dlcjogT3Bsb2dUcmlnZ2VyLCBjYWxsYmFjazogRnVuY3Rpb24pOiBQcm9taXNlPHsgc3RvcDogKCkgPT4gUHJvbWlzZTx2b2lkPiB9PiB7XG4gICAgcmV0dXJuIHRoaXMuX29uT3Bsb2dFbnRyeSh0cmlnZ2VyLCBjYWxsYmFjayk7XG4gIH1cblxuICBvblNraXBwZWRFbnRyaWVzKGNhbGxiYWNrOiBGdW5jdGlvbik6IHsgc3RvcDogKCkgPT4gdm9pZCB9IHtcbiAgICBpZiAodGhpcy5fc3RvcHBlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FsbGVkIG9uU2tpcHBlZEVudHJpZXMgb24gc3RvcHBlZCBoYW5kbGUhXCIpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fb25Ta2lwcGVkRW50cmllc0hvb2sucmVnaXN0ZXIoY2FsbGJhY2spO1xuICB9XG5cbiAgYXN5bmMgX3dhaXRVbnRpbENhdWdodFVwKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLl9zdG9wcGVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYWxsZWQgd2FpdFVudGlsQ2F1Z2h0VXAgb24gc3RvcHBlZCBoYW5kbGUhXCIpO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMuX3JlYWR5UHJvbWlzZTtcblxuICAgIGxldCBsYXN0RW50cnk6IE9wbG9nRW50cnkgfCBudWxsID0gbnVsbDtcblxuICAgIHdoaWxlICghdGhpcy5fc3RvcHBlZCkge1xuICAgICAgY29uc3Qgb3Bsb2dTZWxlY3RvciA9IHRoaXMuX2dldE9wbG9nU2VsZWN0b3IoKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGxhc3RFbnRyeSA9IGF3YWl0IHRoaXMuX29wbG9nTGFzdEVudHJ5Q29ubmVjdGlvbi5maW5kT25lQXN5bmMoXG4gICAgICAgICAgT1BMT0dfQ09MTEVDVElPTixcbiAgICAgICAgICBvcGxvZ1NlbGVjdG9yLFxuICAgICAgICAgIHsgcHJvamVjdGlvbjogeyB0czogMSB9LCBzb3J0OiB7ICRuYXR1cmFsOiAtMSB9IH1cbiAgICAgICAgKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIE1ldGVvci5fZGVidWcoXCJHb3QgZXhjZXB0aW9uIHdoaWxlIHJlYWRpbmcgbGFzdCBlbnRyeVwiLCBlKTtcbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICBhd2FpdCBNZXRlb3Iuc2xlZXAoMTAwKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5fc3RvcHBlZCkgcmV0dXJuO1xuXG4gICAgaWYgKCFsYXN0RW50cnkpIHJldHVybjtcblxuICAgIGNvbnN0IHRzID0gbGFzdEVudHJ5LnRzO1xuICAgIGlmICghdHMpIHtcbiAgICAgIHRocm93IEVycm9yKFwib3Bsb2cgZW50cnkgd2l0aG91dCB0czogXCIgKyBKU09OLnN0cmluZ2lmeShsYXN0RW50cnkpKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fbGFzdFByb2Nlc3NlZFRTICYmIHRzLmxlc3NUaGFuT3JFcXVhbCh0aGlzLl9sYXN0UHJvY2Vzc2VkVFMpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IGluc2VydEFmdGVyID0gdGhpcy5fY2F0Y2hpbmdVcFJlc29sdmVycy5sZW5ndGg7XG5cbiAgICB3aGlsZSAoaW5zZXJ0QWZ0ZXIgLSAxID4gMCAmJiB0aGlzLl9jYXRjaGluZ1VwUmVzb2x2ZXJzW2luc2VydEFmdGVyIC0gMV0udHMuZ3JlYXRlclRoYW4odHMpKSB7XG4gICAgICBpbnNlcnRBZnRlci0tO1xuICAgIH1cblxuICAgIGxldCBwcm9taXNlUmVzb2x2ZXIgPSBudWxsO1xuXG4gICAgY29uc3QgcHJvbWlzZVRvQXdhaXQgPSBuZXcgUHJvbWlzZShyID0+IHByb21pc2VSZXNvbHZlciA9IHIpO1xuXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX3Jlc29sdmVUaW1lb3V0KTtcblxuICAgIHRoaXMuX3Jlc29sdmVUaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKFwiTWV0ZW9yOiBvcGxvZyBjYXRjaGluZyB1cCB0b29rIHRvbyBsb25nXCIsIHsgdHMgfSk7XG4gICAgfSwgMTAwMDApO1xuXG4gICAgdGhpcy5fY2F0Y2hpbmdVcFJlc29sdmVycy5zcGxpY2UoaW5zZXJ0QWZ0ZXIsIDAsIHsgdHMsIHJlc29sdmVyOiBwcm9taXNlUmVzb2x2ZXIhIH0pO1xuXG4gICAgYXdhaXQgcHJvbWlzZVRvQXdhaXQ7XG5cbiAgICBjbGVhclRpbWVvdXQodGhpcy5fcmVzb2x2ZVRpbWVvdXQpO1xuICB9XG5cbiAgYXN5bmMgd2FpdFVudGlsQ2F1Z2h0VXAoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIHRoaXMuX3dhaXRVbnRpbENhdWdodFVwKCk7XG4gIH1cblxuICBhc3luYyBfc3RhcnRUYWlsaW5nKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IG1vbmdvZGJVcmkgPSByZXF1aXJlKCdtb25nb2RiLXVyaScpO1xuICAgIGlmIChtb25nb2RiVXJpLnBhcnNlKHRoaXMuX29wbG9nVXJsKS5kYXRhYmFzZSAhPT0gJ2xvY2FsJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiJE1PTkdPX09QTE9HX1VSTCBtdXN0IGJlIHNldCB0byB0aGUgJ2xvY2FsJyBkYXRhYmFzZSBvZiBhIE1vbmdvIHJlcGxpY2Egc2V0XCIpO1xuICAgIH1cblxuICAgIHRoaXMuX29wbG9nVGFpbENvbm5lY3Rpb24gPSBuZXcgTW9uZ29Db25uZWN0aW9uKFxuICAgICAgdGhpcy5fb3Bsb2dVcmwsIHsgbWF4UG9vbFNpemU6IDEsIG1pblBvb2xTaXplOiAxIH1cbiAgICApO1xuICAgIHRoaXMuX29wbG9nTGFzdEVudHJ5Q29ubmVjdGlvbiA9IG5ldyBNb25nb0Nvbm5lY3Rpb24oXG4gICAgICB0aGlzLl9vcGxvZ1VybCwgeyBtYXhQb29sU2l6ZTogMSwgbWluUG9vbFNpemU6IDEgfVxuICAgICk7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgaXNNYXN0ZXJEb2MgPSBhd2FpdCB0aGlzLl9vcGxvZ0xhc3RFbnRyeUNvbm5lY3Rpb24hLmRiXG4gICAgICAgIC5hZG1pbigpXG4gICAgICAgIC5jb21tYW5kKHsgaXNtYXN0ZXI6IDEgfSk7XG5cbiAgICAgIGlmICghKGlzTWFzdGVyRG9jICYmIGlzTWFzdGVyRG9jLnNldE5hbWUpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIiRNT05HT19PUExPR19VUkwgbXVzdCBiZSBzZXQgdG8gdGhlICdsb2NhbCcgZGF0YWJhc2Ugb2YgYSBNb25nbyByZXBsaWNhIHNldFwiKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbGFzdE9wbG9nRW50cnkgPSBhd2FpdCB0aGlzLl9vcGxvZ0xhc3RFbnRyeUNvbm5lY3Rpb24uZmluZE9uZUFzeW5jKFxuICAgICAgICBPUExPR19DT0xMRUNUSU9OLFxuICAgICAgICB7fSxcbiAgICAgICAgeyBzb3J0OiB7ICRuYXR1cmFsOiAtMSB9LCBwcm9qZWN0aW9uOiB7IHRzOiAxIH0gfVxuICAgICAgKTtcblxuICAgICAgY29uc3Qgb3Bsb2dTZWxlY3RvciA9IHRoaXMuX2dldE9wbG9nU2VsZWN0b3IobGFzdE9wbG9nRW50cnk/LnRzKTtcbiAgICAgIGlmIChsYXN0T3Bsb2dFbnRyeSkge1xuICAgICAgICB0aGlzLl9sYXN0UHJvY2Vzc2VkVFMgPSBsYXN0T3Bsb2dFbnRyeS50cztcbiAgICAgIH1cblxuICAgICAgY29uc3QgY3Vyc29yRGVzY3JpcHRpb24gPSBuZXcgQ3Vyc29yRGVzY3JpcHRpb24oXG4gICAgICAgIE9QTE9HX0NPTExFQ1RJT04sXG4gICAgICAgIG9wbG9nU2VsZWN0b3IsXG4gICAgICAgIHsgdGFpbGFibGU6IHRydWUgfVxuICAgICAgKTtcblxuICAgICAgdGhpcy5fdGFpbEhhbmRsZSA9IHRoaXMuX29wbG9nVGFpbENvbm5lY3Rpb24udGFpbChcbiAgICAgICAgY3Vyc29yRGVzY3JpcHRpb24sXG4gICAgICAgIChkb2M6IGFueSkgPT4ge1xuICAgICAgICAgIHRoaXMuX2VudHJ5UXVldWUucHVzaChkb2MpO1xuICAgICAgICAgIHRoaXMuX21heWJlU3RhcnRXb3JrZXIoKTtcbiAgICAgICAgfSxcbiAgICAgICAgVEFJTF9USU1FT1VUXG4gICAgICApO1xuXG4gICAgICB0aGlzLl9yZWFkeVByb21pc2VSZXNvbHZlciEoKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgaW4gX3N0YXJ0VGFpbGluZzonLCBlcnJvcik7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9tYXliZVN0YXJ0V29ya2VyKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLl93b3JrZXJQcm9taXNlKSByZXR1cm47XG4gICAgdGhpcy5fd29ya2VyQWN0aXZlID0gdHJ1ZTtcblxuICAgIC8vIENvbnZlcnQgdG8gYSBwcm9wZXIgcHJvbWlzZS1iYXNlZCBxdWV1ZSBwcm9jZXNzb3JcbiAgICB0aGlzLl93b3JrZXJQcm9taXNlID0gKGFzeW5jICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHdoaWxlICghdGhpcy5fc3RvcHBlZCAmJiAhdGhpcy5fZW50cnlRdWV1ZS5pc0VtcHR5KCkpIHtcbiAgICAgICAgICAvLyBBcmUgd2UgdG9vIGZhciBiZWhpbmQ/IEp1c3QgdGVsbCBvdXIgb2JzZXJ2ZXJzIHRoYXQgdGhleSBuZWVkIHRvXG4gICAgICAgICAgLy8gcmVwb2xsLCBhbmQgZHJvcCBvdXIgcXVldWUuXG4gICAgICAgICAgaWYgKHRoaXMuX2VudHJ5UXVldWUubGVuZ3RoID4gVE9PX0ZBUl9CRUhJTkQpIHtcbiAgICAgICAgICAgIGNvbnN0IGxhc3RFbnRyeSA9IHRoaXMuX2VudHJ5UXVldWUucG9wKCk7XG4gICAgICAgICAgICB0aGlzLl9lbnRyeVF1ZXVlLmNsZWFyKCk7XG5cbiAgICAgICAgICAgIHRoaXMuX29uU2tpcHBlZEVudHJpZXNIb29rLmVhY2goKGNhbGxiYWNrOiBGdW5jdGlvbikgPT4ge1xuICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBGcmVlIGFueSB3YWl0VW50aWxDYXVnaHRVcCgpIGNhbGxzIHRoYXQgd2VyZSB3YWl0aW5nIGZvciB1cyB0b1xuICAgICAgICAgICAgLy8gcGFzcyBzb21ldGhpbmcgdGhhdCB3ZSBqdXN0IHNraXBwZWQuXG4gICAgICAgICAgICB0aGlzLl9zZXRMYXN0UHJvY2Vzc2VkVFMobGFzdEVudHJ5LnRzKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFByb2Nlc3MgbmV4dCBiYXRjaCBmcm9tIHRoZSBxdWV1ZVxuICAgICAgICAgIGNvbnN0IGRvYyA9IHRoaXMuX2VudHJ5UXVldWUuc2hpZnQoKTtcblxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCBoYW5kbGVEb2ModGhpcywgZG9jKTtcbiAgICAgICAgICAgIC8vIFByb2Nlc3MgYW55IHdhaXRpbmcgZmVuY2UgY2FsbGJhY2tzXG4gICAgICAgICAgICBpZiAoZG9jLnRzKSB7XG4gICAgICAgICAgICAgIHRoaXMuX3NldExhc3RQcm9jZXNzZWRUUyhkb2MudHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIEtlZXAgcHJvY2Vzc2luZyBxdWV1ZSBldmVuIGlmIG9uZSBlbnRyeSBmYWlsc1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgcHJvY2Vzc2luZyBvcGxvZyBlbnRyeTonLCBlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIHRoaXMuX3dvcmtlclByb21pc2UgPSBudWxsO1xuICAgICAgICB0aGlzLl93b3JrZXJBY3RpdmUgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9KSgpO1xuICB9XG5cbiAgX3NldExhc3RQcm9jZXNzZWRUUyh0czogYW55KTogdm9pZCB7XG4gICAgdGhpcy5fbGFzdFByb2Nlc3NlZFRTID0gdHM7XG4gICAgd2hpbGUgKCFpc0VtcHR5KHRoaXMuX2NhdGNoaW5nVXBSZXNvbHZlcnMpICYmIHRoaXMuX2NhdGNoaW5nVXBSZXNvbHZlcnNbMF0udHMubGVzc1RoYW5PckVxdWFsKHRoaXMuX2xhc3RQcm9jZXNzZWRUUykpIHtcbiAgICAgIGNvbnN0IHNlcXVlbmNlciA9IHRoaXMuX2NhdGNoaW5nVXBSZXNvbHZlcnMuc2hpZnQoKSE7XG4gICAgICBzZXF1ZW5jZXIucmVzb2x2ZXIoKTtcbiAgICB9XG4gIH1cblxuICBfZGVmaW5lVG9vRmFyQmVoaW5kKHZhbHVlOiBudW1iZXIpOiB2b2lkIHtcbiAgICBUT09fRkFSX0JFSElORCA9IHZhbHVlO1xuICB9XG5cbiAgX3Jlc2V0VG9vRmFyQmVoaW5kKCk6IHZvaWQge1xuICAgIFRPT19GQVJfQkVISU5EID0gKyhwcm9jZXNzLmVudi5NRVRFT1JfT1BMT0dfVE9PX0ZBUl9CRUhJTkQgfHwgMjAwMCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlkRm9yT3Aob3A6IE9wbG9nRW50cnkpOiBzdHJpbmcge1xuICBpZiAob3Aub3AgPT09ICdkJyB8fCBvcC5vcCA9PT0gJ2knKSB7XG4gICAgcmV0dXJuIG9wLm8uX2lkO1xuICB9IGVsc2UgaWYgKG9wLm9wID09PSAndScpIHtcbiAgICByZXR1cm4gb3AubzIuX2lkO1xuICB9IGVsc2UgaWYgKG9wLm9wID09PSAnYycpIHtcbiAgICB0aHJvdyBFcnJvcihcIk9wZXJhdG9yICdjJyBkb2Vzbid0IHN1cHBseSBhbiBvYmplY3Qgd2l0aCBpZDogXCIgKyBKU09OLnN0cmluZ2lmeShvcCkpO1xuICB9IGVsc2Uge1xuICAgIHRocm93IEVycm9yKFwiVW5rbm93biBvcDogXCIgKyBKU09OLnN0cmluZ2lmeShvcCkpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZURvYyhoYW5kbGU6IE9wbG9nSGFuZGxlLCBkb2M6IE9wbG9nRW50cnkpOiBQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKGRvYy5ucyA9PT0gXCJhZG1pbi4kY21kXCIpIHtcbiAgICBpZiAoZG9jLm8uYXBwbHlPcHMpIHtcbiAgICAgIC8vIFRoaXMgd2FzIGEgc3VjY2Vzc2Z1bCB0cmFuc2FjdGlvbiwgc28gd2UgbmVlZCB0byBhcHBseSB0aGVcbiAgICAgIC8vIG9wZXJhdGlvbnMgdGhhdCB3ZXJlIGludm9sdmVkLlxuICAgICAgbGV0IG5leHRUaW1lc3RhbXAgPSBkb2MudHM7XG4gICAgICBmb3IgKGNvbnN0IG9wIG9mIGRvYy5vLmFwcGx5T3BzKSB7XG4gICAgICAgIC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci9pc3N1ZXMvMTA0MjAuXG4gICAgICAgIGlmICghb3AudHMpIHtcbiAgICAgICAgICBvcC50cyA9IG5leHRUaW1lc3RhbXA7XG4gICAgICAgICAgbmV4dFRpbWVzdGFtcCA9IG5leHRUaW1lc3RhbXAuYWRkKExvbmcuT05FKTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCBoYW5kbGVEb2MoaGFuZGxlLCBvcCk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihcIlVua25vd24gY29tbWFuZCBcIiArIEpTT04uc3RyaW5naWZ5KGRvYykpO1xuICB9XG5cbiAgY29uc3QgdHJpZ2dlcjogT3Bsb2dUcmlnZ2VyID0ge1xuICAgIGRyb3BDb2xsZWN0aW9uOiBmYWxzZSxcbiAgICBkcm9wRGF0YWJhc2U6IGZhbHNlLFxuICAgIG9wOiBkb2MsXG4gIH07XG5cbiAgaWYgKHR5cGVvZiBkb2MubnMgPT09IFwic3RyaW5nXCIgJiYgZG9jLm5zLnN0YXJ0c1dpdGgoaGFuZGxlLl9kYk5hbWUgKyBcIi5cIikpIHtcbiAgICB0cmlnZ2VyLmNvbGxlY3Rpb24gPSBkb2MubnMuc2xpY2UoaGFuZGxlLl9kYk5hbWUubGVuZ3RoICsgMSk7XG4gIH1cblxuICAvLyBJcyBpdCBhIHNwZWNpYWwgY29tbWFuZCBhbmQgdGhlIGNvbGxlY3Rpb24gbmFtZSBpcyBoaWRkZW5cbiAgLy8gc29tZXdoZXJlIGluIG9wZXJhdG9yP1xuICBpZiAodHJpZ2dlci5jb2xsZWN0aW9uID09PSBcIiRjbWRcIikge1xuICAgIGlmIChkb2Muby5kcm9wRGF0YWJhc2UpIHtcbiAgICAgIGRlbGV0ZSB0cmlnZ2VyLmNvbGxlY3Rpb247XG4gICAgICB0cmlnZ2VyLmRyb3BEYXRhYmFzZSA9IHRydWU7XG4gICAgfSBlbHNlIGlmIChcImRyb3BcIiBpbiBkb2Mubykge1xuICAgICAgdHJpZ2dlci5jb2xsZWN0aW9uID0gZG9jLm8uZHJvcDtcbiAgICAgIHRyaWdnZXIuZHJvcENvbGxlY3Rpb24gPSB0cnVlO1xuICAgICAgdHJpZ2dlci5pZCA9IG51bGw7XG4gICAgfSBlbHNlIGlmIChcImNyZWF0ZVwiIGluIGRvYy5vICYmIFwiaWRJbmRleFwiIGluIGRvYy5vKSB7XG4gICAgICAvLyBBIGNvbGxlY3Rpb24gZ290IGltcGxpY2l0bHkgY3JlYXRlZCB3aXRoaW4gYSB0cmFuc2FjdGlvbi4gVGhlcmUnc1xuICAgICAgLy8gbm8gbmVlZCB0byBkbyBhbnl0aGluZyBhYm91dCBpdC5cbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgRXJyb3IoXCJVbmtub3duIGNvbW1hbmQgXCIgKyBKU09OLnN0cmluZ2lmeShkb2MpKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gQWxsIG90aGVyIG9wcyBoYXZlIGFuIGlkLlxuICAgIHRyaWdnZXIuaWQgPSBpZEZvck9wKGRvYyk7XG4gIH1cblxuICBhd2FpdCBoYW5kbGUuX2Nyb3NzYmFyLmZpcmUodHJpZ2dlcik7XG5cbiAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRJbW1lZGlhdGUocmVzb2x2ZSkpO1xufSIsImltcG9ydCBpc0VtcHR5IGZyb20gXCJsb2Rhc2guaXNlbXB0eVwiO1xuaW1wb3J0IHsgT2JzZXJ2ZUhhbmRsZSB9IGZyb20gXCIuL29ic2VydmVfaGFuZGxlXCI7XG5cbmludGVyZmFjZSBPYnNlcnZlTXVsdGlwbGV4ZXJPcHRpb25zIHtcbiAgb3JkZXJlZDogYm9vbGVhbjtcbiAgb25TdG9wPzogKCkgPT4gdm9pZDtcbn1cblxuZXhwb3J0IHR5cGUgT2JzZXJ2ZUhhbmRsZUNhbGxiYWNrID1cbiAgfCBcImFkZGVkXCJcbiAgfCBcImFkZGVkQmVmb3JlXCJcbiAgfCBcImNoYW5nZWRcIlxuICB8IFwibW92ZWRCZWZvcmVcIlxuICB8IFwicmVtb3ZlZFwiO1xuXG4vKipcbiAqIEFsbG93cyBtdWx0aXBsZSBpZGVudGljYWwgT2JzZXJ2ZUhhbmRsZXMgdG8gYmUgZHJpdmVuIGJ5IGEgc2luZ2xlIG9ic2VydmUgZHJpdmVyLlxuICpcbiAqIFRoaXMgb3B0aW1pemF0aW9uIGVuc3VyZXMgdGhhdCBtdWx0aXBsZSBpZGVudGljYWwgb2JzZXJ2YXRpb25zXG4gKiBkb24ndCByZXN1bHQgaW4gZHVwbGljYXRlIGRhdGFiYXNlIHF1ZXJpZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBPYnNlcnZlTXVsdGlwbGV4ZXIge1xuICBwcml2YXRlIHJlYWRvbmx5IF9vcmRlcmVkOiBib29sZWFuO1xuICBwcml2YXRlIHJlYWRvbmx5IF9vblN0b3A6ICgpID0+IHZvaWQ7XG4gIHByaXZhdGUgX3F1ZXVlOiBhbnk7XG4gIHByaXZhdGUgX2hhbmRsZXM6IHsgW2tleTogc3RyaW5nXTogT2JzZXJ2ZUhhbmRsZSB9IHwgbnVsbDtcbiAgcHJpdmF0ZSBfcmVzb2x2ZXI6ICgodmFsdWU/OiB1bmtub3duKSA9PiB2b2lkKSB8IG51bGw7XG4gIHByaXZhdGUgcmVhZG9ubHkgX3JlYWR5UHJvbWlzZTogUHJvbWlzZTxib29sZWFuIHwgdm9pZD47XG4gIHByaXZhdGUgX2lzUmVhZHk6IGJvb2xlYW47XG4gIHByaXZhdGUgX2NhY2hlOiBhbnk7XG4gIHByaXZhdGUgX2FkZEhhbmRsZVRhc2tzU2NoZWR1bGVkQnV0Tm90UGVyZm9ybWVkOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoeyBvcmRlcmVkLCBvblN0b3AgPSAoKSA9PiB7fSB9OiBPYnNlcnZlTXVsdGlwbGV4ZXJPcHRpb25zKSB7XG4gICAgaWYgKG9yZGVyZWQgPT09IHVuZGVmaW5lZCkgdGhyb3cgRXJyb3IoXCJtdXN0IHNwZWNpZnkgb3JkZXJlZFwiKTtcblxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBQYWNrYWdlW1wiZmFjdHMtYmFzZVwiXSAmJlxuICAgICAgUGFja2FnZVtcImZhY3RzLWJhc2VcIl0uRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICAgICAgXCJtb25nby1saXZlZGF0YVwiLFxuICAgICAgICBcIm9ic2VydmUtbXVsdGlwbGV4ZXJzXCIsXG4gICAgICAgIDFcbiAgICAgICk7XG5cbiAgICB0aGlzLl9vcmRlcmVkID0gb3JkZXJlZDtcbiAgICB0aGlzLl9vblN0b3AgPSBvblN0b3A7XG4gICAgdGhpcy5fcXVldWUgPSBuZXcgTWV0ZW9yLl9Bc3luY2hyb25vdXNRdWV1ZSgpO1xuICAgIHRoaXMuX2hhbmRsZXMgPSB7fTtcbiAgICB0aGlzLl9yZXNvbHZlciA9IG51bGw7XG4gICAgdGhpcy5faXNSZWFkeSA9IGZhbHNlO1xuICAgIHRoaXMuX3JlYWR5UHJvbWlzZSA9IG5ldyBQcm9taXNlKChyKSA9PiAodGhpcy5fcmVzb2x2ZXIgPSByKSkudGhlbihcbiAgICAgICgpID0+ICh0aGlzLl9pc1JlYWR5ID0gdHJ1ZSlcbiAgICApO1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICB0aGlzLl9jYWNoZSA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0NhY2hpbmdDaGFuZ2VPYnNlcnZlcih7IG9yZGVyZWQgfSk7XG4gICAgdGhpcy5fYWRkSGFuZGxlVGFza3NTY2hlZHVsZWRCdXROb3RQZXJmb3JtZWQgPSAwO1xuXG4gICAgdGhpcy5jYWxsYmFja05hbWVzKCkuZm9yRWFjaCgoY2FsbGJhY2tOYW1lKSA9PiB7XG4gICAgICAodGhpcyBhcyBhbnkpW2NhbGxiYWNrTmFtZV0gPSAoLi4uYXJnczogYW55W10pID0+IHtcbiAgICAgICAgdGhpcy5fYXBwbHlDYWxsYmFjayhjYWxsYmFja05hbWUsIGFyZ3MpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGFkZEhhbmRsZUFuZFNlbmRJbml0aWFsQWRkcyhoYW5kbGU6IE9ic2VydmVIYW5kbGUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gdGhpcy5fYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzKGhhbmRsZSk7XG4gIH1cblxuICBhc3luYyBfYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzKGhhbmRsZTogT2JzZXJ2ZUhhbmRsZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICsrdGhpcy5fYWRkSGFuZGxlVGFza3NTY2hlZHVsZWRCdXROb3RQZXJmb3JtZWQ7XG5cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgUGFja2FnZVtcImZhY3RzLWJhc2VcIl0gJiZcbiAgICAgIFBhY2thZ2VbXCJmYWN0cy1iYXNlXCJdLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICAgIFwibW9uZ28tbGl2ZWRhdGFcIixcbiAgICAgICAgXCJvYnNlcnZlLWhhbmRsZXNcIixcbiAgICAgICAgMVxuICAgICAgKTtcblxuICAgIGF3YWl0IHRoaXMuX3F1ZXVlLnJ1blRhc2soYXN5bmMgKCkgPT4ge1xuICAgICAgdGhpcy5faGFuZGxlcyFbaGFuZGxlLl9pZF0gPSBoYW5kbGU7XG4gICAgICBhd2FpdCB0aGlzLl9zZW5kQWRkcyhoYW5kbGUpO1xuICAgICAgLS10aGlzLl9hZGRIYW5kbGVUYXNrc1NjaGVkdWxlZEJ1dE5vdFBlcmZvcm1lZDtcbiAgICB9KTtcblxuICAgIGF3YWl0IHRoaXMuX3JlYWR5UHJvbWlzZTtcbiAgfVxuXG4gIGFzeW5jIHJlbW92ZUhhbmRsZShpZDogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLl9yZWFkeSgpKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgcmVtb3ZlIGhhbmRsZXMgdW50aWwgdGhlIG11bHRpcGxleCBpcyByZWFkeVwiKTtcblxuICAgIGRlbGV0ZSB0aGlzLl9oYW5kbGVzIVtpZF07XG5cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgUGFja2FnZVtcImZhY3RzLWJhc2VcIl0gJiZcbiAgICAgIFBhY2thZ2VbXCJmYWN0cy1iYXNlXCJdLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICAgIFwibW9uZ28tbGl2ZWRhdGFcIixcbiAgICAgICAgXCJvYnNlcnZlLWhhbmRsZXNcIixcbiAgICAgICAgLTFcbiAgICAgICk7XG5cbiAgICBpZiAoXG4gICAgICBpc0VtcHR5KHRoaXMuX2hhbmRsZXMpICYmXG4gICAgICB0aGlzLl9hZGRIYW5kbGVUYXNrc1NjaGVkdWxlZEJ1dE5vdFBlcmZvcm1lZCA9PT0gMFxuICAgICkge1xuICAgICAgYXdhaXQgdGhpcy5fc3RvcCgpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIF9zdG9wKG9wdGlvbnM6IHsgZnJvbVF1ZXJ5RXJyb3I/OiBib29sZWFuIH0gPSB7fSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5fcmVhZHkoKSAmJiAhb3B0aW9ucy5mcm9tUXVlcnlFcnJvcilcbiAgICAgIHRocm93IEVycm9yKFwic3VycHJpc2luZyBfc3RvcDogbm90IHJlYWR5XCIpO1xuXG4gICAgYXdhaXQgdGhpcy5fb25TdG9wKCk7XG5cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgUGFja2FnZVtcImZhY3RzLWJhc2VcIl0gJiZcbiAgICAgIFBhY2thZ2VbXCJmYWN0cy1iYXNlXCJdLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICAgIFwibW9uZ28tbGl2ZWRhdGFcIixcbiAgICAgICAgXCJvYnNlcnZlLW11bHRpcGxleGVyc1wiLFxuICAgICAgICAtMVxuICAgICAgKTtcblxuICAgIHRoaXMuX2hhbmRsZXMgPSBudWxsO1xuICB9XG5cbiAgYXN5bmMgcmVhZHkoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5fcXVldWUucXVldWVUYXNrKCgpID0+IHtcbiAgICAgIGlmICh0aGlzLl9yZWFkeSgpKVxuICAgICAgICB0aHJvdyBFcnJvcihcImNhbid0IG1ha2UgT2JzZXJ2ZU11bHRpcGxleCByZWFkeSB0d2ljZSFcIik7XG5cbiAgICAgIGlmICghdGhpcy5fcmVzb2x2ZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyByZXNvbHZlclwiKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fcmVzb2x2ZXIoKTtcbiAgICAgIHRoaXMuX2lzUmVhZHkgPSB0cnVlO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgcXVlcnlFcnJvcihlcnI6IEVycm9yKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5fcXVldWUucnVuVGFzaygoKSA9PiB7XG4gICAgICBpZiAodGhpcy5fcmVhZHkoKSlcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJjYW4ndCBjbGFpbSBxdWVyeSBoYXMgYW4gZXJyb3IgYWZ0ZXIgaXQgd29ya2VkIVwiKTtcbiAgICAgIHRoaXMuX3N0b3AoeyBmcm9tUXVlcnlFcnJvcjogdHJ1ZSB9KTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIG9uRmx1c2goY2I6ICgpID0+IHZvaWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLl9xdWV1ZS5xdWV1ZVRhc2soYXN5bmMgKCkgPT4ge1xuICAgICAgaWYgKCF0aGlzLl9yZWFkeSgpKVxuICAgICAgICB0aHJvdyBFcnJvcihcIm9ubHkgY2FsbCBvbkZsdXNoIG9uIGEgbXVsdGlwbGV4ZXIgdGhhdCB3aWxsIGJlIHJlYWR5XCIpO1xuICAgICAgYXdhaXQgY2IoKTtcbiAgICB9KTtcbiAgfVxuXG4gIGNhbGxiYWNrTmFtZXMoKTogT2JzZXJ2ZUhhbmRsZUNhbGxiYWNrW10ge1xuICAgIHJldHVybiB0aGlzLl9vcmRlcmVkXG4gICAgICA/IFtcImFkZGVkQmVmb3JlXCIsIFwiY2hhbmdlZFwiLCBcIm1vdmVkQmVmb3JlXCIsIFwicmVtb3ZlZFwiXVxuICAgICAgOiBbXCJhZGRlZFwiLCBcImNoYW5nZWRcIiwgXCJyZW1vdmVkXCJdO1xuICB9XG5cbiAgX3JlYWR5KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIXRoaXMuX2lzUmVhZHk7XG4gIH1cblxuICBfYXBwbHlDYWxsYmFjayhjYWxsYmFja05hbWU6IHN0cmluZywgYXJnczogYW55W10pIHtcbiAgICB0aGlzLl9xdWV1ZS5xdWV1ZVRhc2soYXN5bmMgKCkgPT4ge1xuICAgICAgaWYgKCF0aGlzLl9oYW5kbGVzKSByZXR1cm47XG5cbiAgICAgIGF3YWl0IHRoaXMuX2NhY2hlLmFwcGx5Q2hhbmdlW2NhbGxiYWNrTmFtZV0uYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICBpZiAoXG4gICAgICAgICF0aGlzLl9yZWFkeSgpICYmXG4gICAgICAgIGNhbGxiYWNrTmFtZSAhPT0gXCJhZGRlZFwiICYmXG4gICAgICAgIGNhbGxiYWNrTmFtZSAhPT0gXCJhZGRlZEJlZm9yZVwiXG4gICAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBHb3QgJHtjYWxsYmFja05hbWV9IGR1cmluZyBpbml0aWFsIGFkZHNgKTtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBoYW5kbGVJZCBvZiBPYmplY3Qua2V5cyh0aGlzLl9oYW5kbGVzKSkge1xuICAgICAgICBjb25zdCBoYW5kbGUgPSB0aGlzLl9oYW5kbGVzICYmIHRoaXMuX2hhbmRsZXNbaGFuZGxlSWRdO1xuXG4gICAgICAgIGlmICghaGFuZGxlKSByZXR1cm47XG5cbiAgICAgICAgY29uc3QgY2FsbGJhY2sgPSAoaGFuZGxlIGFzIGFueSlbYF8ke2NhbGxiYWNrTmFtZX1gXTtcblxuICAgICAgICBpZiAoIWNhbGxiYWNrKSBjb250aW51ZTtcblxuICAgICAgICBjb25zdCByZXN1bHQgPSBjYWxsYmFjay5hcHBseShcbiAgICAgICAgICBudWxsLFxuICAgICAgICAgIGhhbmRsZS5ub25NdXRhdGluZ0NhbGxiYWNrcyA/IGFyZ3MgOiBFSlNPTi5jbG9uZShhcmdzKVxuICAgICAgICApO1xuXG4gICAgICAgIGlmIChyZXN1bHQgJiYgTWV0ZW9yLl9pc1Byb21pc2UocmVzdWx0KSkge1xuICAgICAgICAgIHJlc3VsdC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgICAgIGBFcnJvciBpbiBvYnNlcnZlQ2hhbmdlcyBjYWxsYmFjayAke2NhbGxiYWNrTmFtZX06YCxcbiAgICAgICAgICAgICAgZXJyb3JcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaGFuZGxlLmluaXRpYWxBZGRzU2VudC50aGVuKHJlc3VsdCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBfc2VuZEFkZHMoaGFuZGxlOiBPYnNlcnZlSGFuZGxlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYWRkID0gdGhpcy5fb3JkZXJlZCA/IGhhbmRsZS5fYWRkZWRCZWZvcmUgOiBoYW5kbGUuX2FkZGVkO1xuICAgIGlmICghYWRkKSByZXR1cm47XG5cbiAgICBjb25zdCBhZGRQcm9taXNlczogKFByb21pc2U8dm9pZD4gfCB2b2lkKVtdID0gW107XG5cbiAgICAvLyBub3RlOiBkb2NzIG1heSBiZSBhbiBfSWRNYXAgb3IgYW4gT3JkZXJlZERpY3RcbiAgICB0aGlzLl9jYWNoZS5kb2NzLmZvckVhY2goKGRvYzogYW55LCBpZDogc3RyaW5nKSA9PiB7XG4gICAgICBpZiAoIShoYW5kbGUuX2lkIGluIHRoaXMuX2hhbmRsZXMhKSkge1xuICAgICAgICB0aHJvdyBFcnJvcihcImhhbmRsZSBnb3QgcmVtb3ZlZCBiZWZvcmUgc2VuZGluZyBpbml0aWFsIGFkZHMhXCIpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7IF9pZCwgLi4uZmllbGRzIH0gPSBoYW5kbGUubm9uTXV0YXRpbmdDYWxsYmFja3NcbiAgICAgICAgPyBkb2NcbiAgICAgICAgOiBFSlNPTi5jbG9uZShkb2MpO1xuXG4gICAgICBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHIgPSB0aGlzLl9vcmRlcmVkID8gYWRkKGlkLCBmaWVsZHMsIG51bGwpIDogYWRkKGlkLCBmaWVsZHMpO1xuICAgICAgICAgIHJlc29sdmUocik7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGFkZFByb21pc2VzLnB1c2gocHJvbWlzZSk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBQcm9taXNlLmFsbFNldHRsZWQoYWRkUHJvbWlzZXMpLnRoZW4oKHApID0+IHtcbiAgICAgIHAuZm9yRWFjaCgocmVzdWx0KSA9PiB7XG4gICAgICAgIGlmIChyZXN1bHQuc3RhdHVzID09PSBcInJlamVjdGVkXCIpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBpbiBhZGRzIGZvciBoYW5kbGU6ICR7cmVzdWx0LnJlYXNvbn1gKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBoYW5kbGUuaW5pdGlhbEFkZHNTZW50UmVzb2x2ZXIoKTtcbiAgfVxufVxuIiwiZXhwb3J0IGNsYXNzIERvY0ZldGNoZXIge1xuICBjb25zdHJ1Y3Rvcihtb25nb0Nvbm5lY3Rpb24pIHtcbiAgICB0aGlzLl9tb25nb0Nvbm5lY3Rpb24gPSBtb25nb0Nvbm5lY3Rpb247XG4gICAgLy8gTWFwIGZyb20gb3AgLT4gW2NhbGxiYWNrXVxuICAgIHRoaXMuX2NhbGxiYWNrc0Zvck9wID0gbmV3IE1hcCgpO1xuICB9XG5cbiAgLy8gRmV0Y2hlcyBkb2N1bWVudCBcImlkXCIgZnJvbSBjb2xsZWN0aW9uTmFtZSwgcmV0dXJuaW5nIGl0IG9yIG51bGwgaWYgbm90XG4gIC8vIGZvdW5kLlxuICAvL1xuICAvLyBJZiB5b3UgbWFrZSBtdWx0aXBsZSBjYWxscyB0byBmZXRjaCgpIHdpdGggdGhlIHNhbWUgb3AgcmVmZXJlbmNlLFxuICAvLyBEb2NGZXRjaGVyIG1heSBhc3N1bWUgdGhhdCB0aGV5IGFsbCByZXR1cm4gdGhlIHNhbWUgZG9jdW1lbnQuIChJdCBkb2VzXG4gIC8vIG5vdCBjaGVjayB0byBzZWUgaWYgY29sbGVjdGlvbk5hbWUvaWQgbWF0Y2guKVxuICAvL1xuICAvLyBZb3UgbWF5IGFzc3VtZSB0aGF0IGNhbGxiYWNrIGlzIG5ldmVyIGNhbGxlZCBzeW5jaHJvbm91c2x5IChhbmQgaW4gZmFjdFxuICAvLyBPcGxvZ09ic2VydmVEcml2ZXIgZG9lcyBzbykuXG4gIGFzeW5jIGZldGNoKGNvbGxlY3Rpb25OYW1lLCBpZCwgb3AsIGNhbGxiYWNrKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgICBcbiAgICBjaGVjayhjb2xsZWN0aW9uTmFtZSwgU3RyaW5nKTtcbiAgICBjaGVjayhvcCwgT2JqZWN0KTtcblxuXG4gICAgLy8gSWYgdGhlcmUncyBhbHJlYWR5IGFuIGluLXByb2dyZXNzIGZldGNoIGZvciB0aGlzIGNhY2hlIGtleSwgeWllbGQgdW50aWxcbiAgICAvLyBpdCdzIGRvbmUgYW5kIHJldHVybiB3aGF0ZXZlciBpdCByZXR1cm5zLlxuICAgIGlmIChzZWxmLl9jYWxsYmFja3NGb3JPcC5oYXMob3ApKSB7XG4gICAgICBzZWxmLl9jYWxsYmFja3NGb3JPcC5nZXQob3ApLnB1c2goY2FsbGJhY2spO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGNhbGxiYWNrcyA9IFtjYWxsYmFja107XG4gICAgc2VsZi5fY2FsbGJhY2tzRm9yT3Auc2V0KG9wLCBjYWxsYmFja3MpO1xuXG4gICAgdHJ5IHtcbiAgICAgIHZhciBkb2MgPVxuICAgICAgICAoYXdhaXQgc2VsZi5fbW9uZ29Db25uZWN0aW9uLmZpbmRPbmVBc3luYyhjb2xsZWN0aW9uTmFtZSwge1xuICAgICAgICAgIF9pZDogaWQsXG4gICAgICAgIH0pKSB8fCBudWxsO1xuICAgICAgLy8gUmV0dXJuIGRvYyB0byBhbGwgcmVsZXZhbnQgY2FsbGJhY2tzLiBOb3RlIHRoYXQgdGhpcyBhcnJheSBjYW5cbiAgICAgIC8vIGNvbnRpbnVlIHRvIGdyb3cgZHVyaW5nIGNhbGxiYWNrIGV4Y2VjdXRpb24uXG4gICAgICB3aGlsZSAoY2FsbGJhY2tzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgLy8gQ2xvbmUgdGhlIGRvY3VtZW50IHNvIHRoYXQgdGhlIHZhcmlvdXMgY2FsbHMgdG8gZmV0Y2ggZG9uJ3QgcmV0dXJuXG4gICAgICAgIC8vIG9iamVjdHMgdGhhdCBhcmUgaW50ZXJ0d2luZ2xlZCB3aXRoIGVhY2ggb3RoZXIuIENsb25lIGJlZm9yZVxuICAgICAgICAvLyBwb3BwaW5nIHRoZSBmdXR1cmUsIHNvIHRoYXQgaWYgY2xvbmUgdGhyb3dzLCB0aGUgZXJyb3IgZ2V0cyBwYXNzZWRcbiAgICAgICAgLy8gdG8gdGhlIG5leHQgY2FsbGJhY2suXG4gICAgICAgIGNhbGxiYWNrcy5wb3AoKShudWxsLCBFSlNPTi5jbG9uZShkb2MpKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB3aGlsZSAoY2FsbGJhY2tzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY2FsbGJhY2tzLnBvcCgpKGUpO1xuICAgICAgfVxuICAgIH0gZmluYWxseSB7XG4gICAgICAvLyBYWFggY29uc2lkZXIga2VlcGluZyB0aGUgZG9jIGFyb3VuZCBmb3IgYSBwZXJpb2Qgb2YgdGltZSBiZWZvcmVcbiAgICAgIC8vIHJlbW92aW5nIGZyb20gdGhlIGNhY2hlXG4gICAgICBzZWxmLl9jYWxsYmFja3NGb3JPcC5kZWxldGUob3ApO1xuICAgIH1cbiAgfVxufVxuIiwiaW1wb3J0IHRocm90dGxlIGZyb20gJ2xvZGFzaC50aHJvdHRsZSc7XG5pbXBvcnQgeyBsaXN0ZW5BbGwgfSBmcm9tICcuL21vbmdvX2RyaXZlcic7XG5pbXBvcnQgeyBPYnNlcnZlTXVsdGlwbGV4ZXIgfSBmcm9tICcuL29ic2VydmVfbXVsdGlwbGV4JztcblxuaW50ZXJmYWNlIFBvbGxpbmdPYnNlcnZlRHJpdmVyT3B0aW9ucyB7XG4gIGN1cnNvckRlc2NyaXB0aW9uOiBhbnk7XG4gIG1vbmdvSGFuZGxlOiBhbnk7XG4gIG9yZGVyZWQ6IGJvb2xlYW47XG4gIG11bHRpcGxleGVyOiBPYnNlcnZlTXVsdGlwbGV4ZXI7XG4gIF90ZXN0T25seVBvbGxDYWxsYmFjaz86ICgpID0+IHZvaWQ7XG59XG5cbmNvbnN0IFBPTExJTkdfVEhST1RUTEVfTVMgPSArKHByb2Nlc3MuZW52Lk1FVEVPUl9QT0xMSU5HX1RIUk9UVExFX01TIHx8ICcnKSB8fCA1MDtcbmNvbnN0IFBPTExJTkdfSU5URVJWQUxfTVMgPSArKHByb2Nlc3MuZW52Lk1FVEVPUl9QT0xMSU5HX0lOVEVSVkFMX01TIHx8ICcnKSB8fCAxMCAqIDEwMDA7XG5cbi8qKlxuICogQGNsYXNzIFBvbGxpbmdPYnNlcnZlRHJpdmVyXG4gKlxuICogT25lIG9mIHR3byBvYnNlcnZlIGRyaXZlciBpbXBsZW1lbnRhdGlvbnMuXG4gKlxuICogQ2hhcmFjdGVyaXN0aWNzOlxuICogLSBDYWNoZXMgdGhlIHJlc3VsdHMgb2YgYSBxdWVyeVxuICogLSBSZXJ1bnMgdGhlIHF1ZXJ5IHdoZW4gbmVjZXNzYXJ5XG4gKiAtIFN1aXRhYmxlIGZvciBjYXNlcyB3aGVyZSBvcGxvZyB0YWlsaW5nIGlzIG5vdCBhdmFpbGFibGUgb3IgcHJhY3RpY2FsXG4gKi9cbmV4cG9ydCBjbGFzcyBQb2xsaW5nT2JzZXJ2ZURyaXZlciB7XG4gIHByaXZhdGUgX29wdGlvbnM6IFBvbGxpbmdPYnNlcnZlRHJpdmVyT3B0aW9ucztcbiAgcHJpdmF0ZSBfY3Vyc29yRGVzY3JpcHRpb246IGFueTtcbiAgcHJpdmF0ZSBfbW9uZ29IYW5kbGU6IGFueTtcbiAgcHJpdmF0ZSBfb3JkZXJlZDogYm9vbGVhbjtcbiAgcHJpdmF0ZSBfbXVsdGlwbGV4ZXI6IGFueTtcbiAgcHJpdmF0ZSBfc3RvcENhbGxiYWNrczogQXJyYXk8KCkgPT4gUHJvbWlzZTx2b2lkPj47XG4gIHByaXZhdGUgX3N0b3BwZWQ6IGJvb2xlYW47XG4gIHByaXZhdGUgX2N1cnNvcjogYW55O1xuICBwcml2YXRlIF9yZXN1bHRzOiBhbnk7XG4gIHByaXZhdGUgX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZDogbnVtYmVyO1xuICBwcml2YXRlIF9wZW5kaW5nV3JpdGVzOiBhbnlbXTtcbiAgcHJpdmF0ZSBfZW5zdXJlUG9sbElzU2NoZWR1bGVkOiBGdW5jdGlvbjtcbiAgcHJpdmF0ZSBfdGFza1F1ZXVlOiBhbnk7XG4gIHByaXZhdGUgX3Rlc3RPbmx5UG9sbENhbGxiYWNrPzogKCkgPT4gdm9pZDtcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zOiBQb2xsaW5nT2JzZXJ2ZURyaXZlck9wdGlvbnMpIHtcbiAgICB0aGlzLl9vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLl9jdXJzb3JEZXNjcmlwdGlvbiA9IG9wdGlvbnMuY3Vyc29yRGVzY3JpcHRpb247XG4gICAgdGhpcy5fbW9uZ29IYW5kbGUgPSBvcHRpb25zLm1vbmdvSGFuZGxlO1xuICAgIHRoaXMuX29yZGVyZWQgPSBvcHRpb25zLm9yZGVyZWQ7XG4gICAgdGhpcy5fbXVsdGlwbGV4ZXIgPSBvcHRpb25zLm11bHRpcGxleGVyO1xuICAgIHRoaXMuX3N0b3BDYWxsYmFja3MgPSBbXTtcbiAgICB0aGlzLl9zdG9wcGVkID0gZmFsc2U7XG5cbiAgICB0aGlzLl9jdXJzb3IgPSB0aGlzLl9tb25nb0hhbmRsZS5fY3JlYXRlQXN5bmNocm9ub3VzQ3Vyc29yKFxuICAgICAgdGhpcy5fY3Vyc29yRGVzY3JpcHRpb24pO1xuXG4gICAgdGhpcy5fcmVzdWx0cyA9IG51bGw7XG4gICAgdGhpcy5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkID0gMDtcbiAgICB0aGlzLl9wZW5kaW5nV3JpdGVzID0gW107XG5cbiAgICB0aGlzLl9lbnN1cmVQb2xsSXNTY2hlZHVsZWQgPSB0aHJvdHRsZShcbiAgICAgIHRoaXMuX3VudGhyb3R0bGVkRW5zdXJlUG9sbElzU2NoZWR1bGVkLmJpbmQodGhpcyksXG4gICAgICB0aGlzLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnBvbGxpbmdUaHJvdHRsZU1zIHx8IFBPTExJTkdfVEhST1RUTEVfTVNcbiAgICApO1xuXG4gICAgdGhpcy5fdGFza1F1ZXVlID0gbmV3IChNZXRlb3IgYXMgYW55KS5fQXN5bmNocm9ub3VzUXVldWUoKTtcbiAgfVxuXG4gIGFzeW5jIF9pbml0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IG9wdGlvbnMgPSB0aGlzLl9vcHRpb25zO1xuICAgIGNvbnN0IGxpc3RlbmVyc0hhbmRsZSA9IGF3YWl0IGxpc3RlbkFsbChcbiAgICAgIHRoaXMuX2N1cnNvckRlc2NyaXB0aW9uLFxuICAgICAgKG5vdGlmaWNhdGlvbjogYW55KSA9PiB7XG4gICAgICAgIGNvbnN0IGZlbmNlID0gKEREUFNlcnZlciBhcyBhbnkpLl9nZXRDdXJyZW50RmVuY2UoKTtcbiAgICAgICAgaWYgKGZlbmNlKSB7XG4gICAgICAgICAgdGhpcy5fcGVuZGluZ1dyaXRlcy5wdXNoKGZlbmNlLmJlZ2luV3JpdGUoKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCA9PT0gMCkge1xuICAgICAgICAgIHRoaXMuX2Vuc3VyZVBvbGxJc1NjaGVkdWxlZCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgKTtcblxuICAgIHRoaXMuX3N0b3BDYWxsYmFja3MucHVzaChhc3luYyAoKSA9PiB7IGF3YWl0IGxpc3RlbmVyc0hhbmRsZS5zdG9wKCk7IH0pO1xuXG4gICAgaWYgKG9wdGlvbnMuX3Rlc3RPbmx5UG9sbENhbGxiYWNrKSB7XG4gICAgICB0aGlzLl90ZXN0T25seVBvbGxDYWxsYmFjayA9IG9wdGlvbnMuX3Rlc3RPbmx5UG9sbENhbGxiYWNrO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBwb2xsaW5nSW50ZXJ2YWwgPVxuICAgICAgICB0aGlzLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnBvbGxpbmdJbnRlcnZhbE1zIHx8XG4gICAgICAgIHRoaXMuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMuX3BvbGxpbmdJbnRlcnZhbCB8fFxuICAgICAgICBQT0xMSU5HX0lOVEVSVkFMX01TO1xuXG4gICAgICBjb25zdCBpbnRlcnZhbEhhbmRsZSA9IE1ldGVvci5zZXRJbnRlcnZhbChcbiAgICAgICAgdGhpcy5fZW5zdXJlUG9sbElzU2NoZWR1bGVkLmJpbmQodGhpcyksXG4gICAgICAgIHBvbGxpbmdJbnRlcnZhbFxuICAgICAgKTtcblxuICAgICAgdGhpcy5fc3RvcENhbGxiYWNrcy5wdXNoKCgpID0+IHtcbiAgICAgICAgTWV0ZW9yLmNsZWFySW50ZXJ2YWwoaW50ZXJ2YWxIYW5kbGUpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5fdW50aHJvdHRsZWRFbnN1cmVQb2xsSXNTY2hlZHVsZWQoKTtcblxuICAgIChQYWNrYWdlWydmYWN0cy1iYXNlJ10gYXMgYW55KT8uRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJvYnNlcnZlLWRyaXZlcnMtcG9sbGluZ1wiLCAxKTtcbiAgfVxuXG4gIGFzeW5jIF91bnRocm90dGxlZEVuc3VyZVBvbGxJc1NjaGVkdWxlZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkID4gMCkgcmV0dXJuO1xuICAgICsrdGhpcy5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkO1xuICAgIGF3YWl0IHRoaXMuX3Rhc2tRdWV1ZS5ydW5UYXNrKGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IHRoaXMuX3BvbGxNb25nbygpO1xuICAgIH0pO1xuICB9XG5cbiAgX3N1c3BlbmRQb2xsaW5nKCk6IHZvaWQge1xuICAgICsrdGhpcy5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkO1xuICAgIHRoaXMuX3Rhc2tRdWV1ZS5ydW5UYXNrKCgpID0+IHt9KTtcblxuICAgIGlmICh0aGlzLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQgIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCBpcyAke3RoaXMuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZH1gKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBfcmVzdW1lUG9sbGluZygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYF9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQgaXMgJHt0aGlzLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWR9YCk7XG4gICAgfVxuICAgIGF3YWl0IHRoaXMuX3Rhc2tRdWV1ZS5ydW5UYXNrKGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IHRoaXMuX3BvbGxNb25nbygpO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgX3BvbGxNb25nbygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAtLXRoaXMuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZDtcblxuICAgIGlmICh0aGlzLl9zdG9wcGVkKSByZXR1cm47XG5cbiAgICBsZXQgZmlyc3QgPSBmYWxzZTtcbiAgICBsZXQgbmV3UmVzdWx0cztcbiAgICBsZXQgb2xkUmVzdWx0cyA9IHRoaXMuX3Jlc3VsdHM7XG5cbiAgICBpZiAoIW9sZFJlc3VsdHMpIHtcbiAgICAgIGZpcnN0ID0gdHJ1ZTtcbiAgICAgIG9sZFJlc3VsdHMgPSB0aGlzLl9vcmRlcmVkID8gW10gOiBuZXcgKExvY2FsQ29sbGVjdGlvbiBhcyBhbnkpLl9JZE1hcDtcbiAgICB9XG5cbiAgICB0aGlzLl90ZXN0T25seVBvbGxDYWxsYmFjaz8uKCk7XG5cbiAgICBjb25zdCB3cml0ZXNGb3JDeWNsZSA9IHRoaXMuX3BlbmRpbmdXcml0ZXM7XG4gICAgdGhpcy5fcGVuZGluZ1dyaXRlcyA9IFtdO1xuXG4gICAgdHJ5IHtcbiAgICAgIG5ld1Jlc3VsdHMgPSBhd2FpdCB0aGlzLl9jdXJzb3IuZ2V0UmF3T2JqZWN0cyh0aGlzLl9vcmRlcmVkKTtcbiAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgIGlmIChmaXJzdCAmJiB0eXBlb2YoZS5jb2RlKSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5fbXVsdGlwbGV4ZXIucXVlcnlFcnJvcihcbiAgICAgICAgICBuZXcgRXJyb3IoXG4gICAgICAgICAgICBgRXhjZXB0aW9uIHdoaWxlIHBvbGxpbmcgcXVlcnkgJHtcbiAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkodGhpcy5fY3Vyc29yRGVzY3JpcHRpb24pXG4gICAgICAgICAgICB9OiAke2UubWVzc2FnZX1gXG4gICAgICAgICAgKVxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseSh0aGlzLl9wZW5kaW5nV3JpdGVzLCB3cml0ZXNGb3JDeWNsZSk7XG4gICAgICBNZXRlb3IuX2RlYnVnKGBFeGNlcHRpb24gd2hpbGUgcG9sbGluZyBxdWVyeSAke1xuICAgICAgICBKU09OLnN0cmluZ2lmeSh0aGlzLl9jdXJzb3JEZXNjcmlwdGlvbil9YCwgZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLl9zdG9wcGVkKSB7XG4gICAgICAoTG9jYWxDb2xsZWN0aW9uIGFzIGFueSkuX2RpZmZRdWVyeUNoYW5nZXMoXG4gICAgICAgIHRoaXMuX29yZGVyZWQsIG9sZFJlc3VsdHMsIG5ld1Jlc3VsdHMsIHRoaXMuX211bHRpcGxleGVyKTtcbiAgICB9XG5cbiAgICBpZiAoZmlyc3QpIHRoaXMuX211bHRpcGxleGVyLnJlYWR5KCk7XG5cbiAgICB0aGlzLl9yZXN1bHRzID0gbmV3UmVzdWx0cztcblxuICAgIGF3YWl0IHRoaXMuX211bHRpcGxleGVyLm9uRmx1c2goYXN5bmMgKCkgPT4ge1xuICAgICAgZm9yIChjb25zdCB3IG9mIHdyaXRlc0ZvckN5Y2xlKSB7XG4gICAgICAgIGF3YWl0IHcuY29tbWl0dGVkKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBzdG9wKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuX3N0b3BwZWQgPSB0cnVlO1xuXG4gICAgZm9yIChjb25zdCBjYWxsYmFjayBvZiB0aGlzLl9zdG9wQ2FsbGJhY2tzKSB7XG4gICAgICBhd2FpdCBjYWxsYmFjaygpO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgdyBvZiB0aGlzLl9wZW5kaW5nV3JpdGVzKSB7XG4gICAgICBhd2FpdCB3LmNvbW1pdHRlZCgpO1xuICAgIH1cblxuICAgIChQYWNrYWdlWydmYWN0cy1iYXNlJ10gYXMgYW55KT8uRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJvYnNlcnZlLWRyaXZlcnMtcG9sbGluZ1wiLCAtMSk7XG4gIH1cbn0iLCJpbXBvcnQgaGFzIGZyb20gJ2xvZGFzaC5oYXMnO1xuaW1wb3J0IGlzRW1wdHkgZnJvbSAnbG9kYXNoLmlzZW1wdHknO1xuaW1wb3J0IHsgb3Bsb2dWMlYxQ29udmVydGVyIH0gZnJvbSBcIi4vb3Bsb2dfdjJfY29udmVydGVyXCI7XG5pbXBvcnQgeyBjaGVjaywgTWF0Y2ggfSBmcm9tICdtZXRlb3IvY2hlY2snO1xuaW1wb3J0IHsgQ3Vyc29yRGVzY3JpcHRpb24gfSBmcm9tICcuL2N1cnNvcl9kZXNjcmlwdGlvbic7XG5pbXBvcnQgeyBmb3JFYWNoVHJpZ2dlciwgbGlzdGVuQWxsIH0gZnJvbSAnLi9tb25nb19kcml2ZXInO1xuaW1wb3J0IHsgQ3Vyc29yIH0gZnJvbSAnLi9jdXJzb3InO1xuaW1wb3J0IExvY2FsQ29sbGVjdGlvbiBmcm9tICdtZXRlb3IvbWluaW1vbmdvL2xvY2FsX2NvbGxlY3Rpb24nO1xuaW1wb3J0IHsgaWRGb3JPcCB9IGZyb20gJy4vb3Bsb2dfdGFpbGluZyc7XG5cbnZhciBQSEFTRSA9IHtcbiAgUVVFUllJTkc6IFwiUVVFUllJTkdcIixcbiAgRkVUQ0hJTkc6IFwiRkVUQ0hJTkdcIixcbiAgU1RFQURZOiBcIlNURUFEWVwiXG59O1xuXG4vLyBFeGNlcHRpb24gdGhyb3duIGJ5IF9uZWVkVG9Qb2xsUXVlcnkgd2hpY2ggdW5yb2xscyB0aGUgc3RhY2sgdXAgdG8gdGhlXG4vLyBlbmNsb3NpbmcgY2FsbCB0byBmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeS5cbnZhciBTd2l0Y2hlZFRvUXVlcnkgPSBmdW5jdGlvbiAoKSB7fTtcbnZhciBmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeSA9IGZ1bmN0aW9uIChmKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgIGYuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoIShlIGluc3RhbmNlb2YgU3dpdGNoZWRUb1F1ZXJ5KSlcbiAgICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH07XG59O1xuXG52YXIgY3VycmVudElkID0gMDtcblxuLyoqXG4gKiBAY2xhc3MgT3Bsb2dPYnNlcnZlRHJpdmVyXG4gKiBBbiBhbHRlcm5hdGl2ZSB0byBQb2xsaW5nT2JzZXJ2ZURyaXZlciB3aGljaCBmb2xsb3dzIHRoZSBNb25nb0RCIG9wZXJhdGlvbiBsb2dcbiAqIGluc3RlYWQgb2YgcmUtcG9sbGluZyB0aGUgcXVlcnkuXG4gKlxuICogQ2hhcmFjdGVyaXN0aWNzOlxuICogLSBGb2xsb3dzIHRoZSBNb25nb0RCIG9wZXJhdGlvbiBsb2dcbiAqIC0gRGlyZWN0bHkgb2JzZXJ2ZXMgZGF0YWJhc2UgY2hhbmdlc1xuICogLSBNb3JlIGVmZmljaWVudCB0aGFuIHBvbGxpbmcgZm9yIG1vc3QgdXNlIGNhc2VzXG4gKiAtIFJlcXVpcmVzIGFjY2VzcyB0byBNb25nb0RCIG9wbG9nXG4gKlxuICogSW50ZXJmYWNlOlxuICogLSBDb25zdHJ1Y3Rpb24gaW5pdGlhdGVzIG9ic2VydmVDaGFuZ2VzIGNhbGxiYWNrcyBhbmQgcmVhZHkoKSBpbnZvY2F0aW9uIHRvIHRoZSBPYnNlcnZlTXVsdGlwbGV4ZXJcbiAqIC0gT2JzZXJ2YXRpb24gY2FuIGJlIHRlcm1pbmF0ZWQgdmlhIHRoZSBzdG9wKCkgbWV0aG9kXG4gKi9cbmV4cG9ydCBjb25zdCBPcGxvZ09ic2VydmVEcml2ZXIgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICBjb25zdCBzZWxmID0gdGhpcztcbiAgc2VsZi5fdXNlc09wbG9nID0gdHJ1ZTsgIC8vIHRlc3RzIGxvb2sgYXQgdGhpc1xuXG4gIHNlbGYuX2lkID0gY3VycmVudElkO1xuICBjdXJyZW50SWQrKztcblxuICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbiA9IG9wdGlvbnMuY3Vyc29yRGVzY3JpcHRpb247XG4gIHNlbGYuX21vbmdvSGFuZGxlID0gb3B0aW9ucy5tb25nb0hhbmRsZTtcbiAgc2VsZi5fbXVsdGlwbGV4ZXIgPSBvcHRpb25zLm11bHRpcGxleGVyO1xuXG4gIGlmIChvcHRpb25zLm9yZGVyZWQpIHtcbiAgICB0aHJvdyBFcnJvcihcIk9wbG9nT2JzZXJ2ZURyaXZlciBvbmx5IHN1cHBvcnRzIHVub3JkZXJlZCBvYnNlcnZlQ2hhbmdlc1wiKTtcbiAgfVxuXG4gIGNvbnN0IHNvcnRlciA9IG9wdGlvbnMuc29ydGVyO1xuICAvLyBXZSBkb24ndCBzdXBwb3J0ICRuZWFyIGFuZCBvdGhlciBnZW8tcXVlcmllcyBzbyBpdCdzIE9LIHRvIGluaXRpYWxpemUgdGhlXG4gIC8vIGNvbXBhcmF0b3Igb25seSBvbmNlIGluIHRoZSBjb25zdHJ1Y3Rvci5cbiAgY29uc3QgY29tcGFyYXRvciA9IHNvcnRlciAmJiBzb3J0ZXIuZ2V0Q29tcGFyYXRvcigpO1xuXG4gIGlmIChvcHRpb25zLmN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMubGltaXQpIHtcbiAgICAvLyBUaGVyZSBhcmUgc2V2ZXJhbCBwcm9wZXJ0aWVzIG9yZGVyZWQgZHJpdmVyIGltcGxlbWVudHM6XG4gICAgLy8gLSBfbGltaXQgaXMgYSBwb3NpdGl2ZSBudW1iZXJcbiAgICAvLyAtIF9jb21wYXJhdG9yIGlzIGEgZnVuY3Rpb24tY29tcGFyYXRvciBieSB3aGljaCB0aGUgcXVlcnkgaXMgb3JkZXJlZFxuICAgIC8vIC0gX3VucHVibGlzaGVkQnVmZmVyIGlzIG5vbi1udWxsIE1pbi9NYXggSGVhcCxcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICB0aGUgZW1wdHkgYnVmZmVyIGluIFNURUFEWSBwaGFzZSBpbXBsaWVzIHRoYXQgdGhlXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgZXZlcnl0aGluZyB0aGF0IG1hdGNoZXMgdGhlIHF1ZXJpZXMgc2VsZWN0b3IgZml0c1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgIGludG8gcHVibGlzaGVkIHNldC5cbiAgICAvLyAtIF9wdWJsaXNoZWQgLSBNYXggSGVhcCAoYWxzbyBpbXBsZW1lbnRzIElkTWFwIG1ldGhvZHMpXG5cbiAgICBjb25zdCBoZWFwT3B0aW9ucyA9IHsgSWRNYXA6IExvY2FsQ29sbGVjdGlvbi5fSWRNYXAgfTtcbiAgICBzZWxmLl9saW1pdCA9IHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMubGltaXQ7XG4gICAgc2VsZi5fY29tcGFyYXRvciA9IGNvbXBhcmF0b3I7XG4gICAgc2VsZi5fc29ydGVyID0gc29ydGVyO1xuICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyID0gbmV3IE1pbk1heEhlYXAoY29tcGFyYXRvciwgaGVhcE9wdGlvbnMpO1xuICAgIC8vIFdlIG5lZWQgc29tZXRoaW5nIHRoYXQgY2FuIGZpbmQgTWF4IHZhbHVlIGluIGFkZGl0aW9uIHRvIElkTWFwIGludGVyZmFjZVxuICAgIHNlbGYuX3B1Ymxpc2hlZCA9IG5ldyBNYXhIZWFwKGNvbXBhcmF0b3IsIGhlYXBPcHRpb25zKTtcbiAgfSBlbHNlIHtcbiAgICBzZWxmLl9saW1pdCA9IDA7XG4gICAgc2VsZi5fY29tcGFyYXRvciA9IG51bGw7XG4gICAgc2VsZi5fc29ydGVyID0gbnVsbDtcbiAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlciA9IG51bGw7XG4gICAgLy8gTWVtb3J5IEdyb3d0aFxuICAgIHNlbGYuX3B1Ymxpc2hlZCA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICB9XG5cbiAgLy8gSW5kaWNhdGVzIGlmIGl0IGlzIHNhZmUgdG8gaW5zZXJ0IGEgbmV3IGRvY3VtZW50IGF0IHRoZSBlbmQgb2YgdGhlIGJ1ZmZlclxuICAvLyBmb3IgdGhpcyBxdWVyeS4gaS5lLiBpdCBpcyBrbm93biB0aGF0IHRoZXJlIGFyZSBubyBkb2N1bWVudHMgbWF0Y2hpbmcgdGhlXG4gIC8vIHNlbGVjdG9yIHRob3NlIGFyZSBub3QgaW4gcHVibGlzaGVkIG9yIGJ1ZmZlci5cbiAgc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyID0gZmFsc2U7XG5cbiAgc2VsZi5fc3RvcHBlZCA9IGZhbHNlO1xuICBzZWxmLl9zdG9wSGFuZGxlcyA9IFtdO1xuICBzZWxmLl9hZGRTdG9wSGFuZGxlcyA9IGZ1bmN0aW9uIChuZXdTdG9wSGFuZGxlcykge1xuICAgIGNvbnN0IGV4cGVjdGVkUGF0dGVybiA9IE1hdGNoLk9iamVjdEluY2x1ZGluZyh7IHN0b3A6IEZ1bmN0aW9uIH0pO1xuICAgIC8vIFNpbmdsZSBpdGVtIG9yIGFycmF5XG4gICAgY2hlY2sobmV3U3RvcEhhbmRsZXMsIE1hdGNoLk9uZU9mKFtleHBlY3RlZFBhdHRlcm5dLCBleHBlY3RlZFBhdHRlcm4pKTtcbiAgICBzZWxmLl9zdG9wSGFuZGxlcy5wdXNoKG5ld1N0b3BIYW5kbGVzKTtcbiAgfVxuXG4gIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXSAmJiBQYWNrYWdlWydmYWN0cy1iYXNlJ10uRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICBcIm1vbmdvLWxpdmVkYXRhXCIsIFwib2JzZXJ2ZS1kcml2ZXJzLW9wbG9nXCIsIDEpO1xuXG4gIHNlbGYuX3JlZ2lzdGVyUGhhc2VDaGFuZ2UoUEhBU0UuUVVFUllJTkcpO1xuXG4gIHNlbGYuX21hdGNoZXIgPSBvcHRpb25zLm1hdGNoZXI7XG4gIC8vIHdlIGFyZSBub3cgdXNpbmcgcHJvamVjdGlvbiwgbm90IGZpZWxkcyBpbiB0aGUgY3Vyc29yIGRlc2NyaXB0aW9uIGV2ZW4gaWYgeW91IHBhc3Mge2ZpZWxkc31cbiAgLy8gaW4gdGhlIGN1cnNvciBjb25zdHJ1Y3Rpb25cbiAgY29uc3QgcHJvamVjdGlvbiA9IHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMuZmllbGRzIHx8IHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMucHJvamVjdGlvbiB8fCB7fTtcbiAgc2VsZi5fcHJvamVjdGlvbkZuID0gTG9jYWxDb2xsZWN0aW9uLl9jb21waWxlUHJvamVjdGlvbihwcm9qZWN0aW9uKTtcbiAgLy8gUHJvamVjdGlvbiBmdW5jdGlvbiwgcmVzdWx0IG9mIGNvbWJpbmluZyBpbXBvcnRhbnQgZmllbGRzIGZvciBzZWxlY3RvciBhbmRcbiAgLy8gZXhpc3RpbmcgZmllbGRzIHByb2plY3Rpb25cbiAgc2VsZi5fc2hhcmVkUHJvamVjdGlvbiA9IHNlbGYuX21hdGNoZXIuY29tYmluZUludG9Qcm9qZWN0aW9uKHByb2plY3Rpb24pO1xuICBpZiAoc29ydGVyKVxuICAgIHNlbGYuX3NoYXJlZFByb2plY3Rpb24gPSBzb3J0ZXIuY29tYmluZUludG9Qcm9qZWN0aW9uKHNlbGYuX3NoYXJlZFByb2plY3Rpb24pO1xuICBzZWxmLl9zaGFyZWRQcm9qZWN0aW9uRm4gPSBMb2NhbENvbGxlY3Rpb24uX2NvbXBpbGVQcm9qZWN0aW9uKFxuICAgIHNlbGYuX3NoYXJlZFByb2plY3Rpb24pO1xuXG4gIHNlbGYuX25lZWRUb0ZldGNoID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nID0gbnVsbDtcbiAgc2VsZi5fZmV0Y2hHZW5lcmF0aW9uID0gMDtcblxuICBzZWxmLl9yZXF1ZXJ5V2hlbkRvbmVUaGlzUXVlcnkgPSBmYWxzZTtcbiAgc2VsZi5fd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeSA9IFtdO1xuIH07XG5cbk9iamVjdC5hc3NpZ24oT3Bsb2dPYnNlcnZlRHJpdmVyLnByb3RvdHlwZSwge1xuICBfaW5pdDogYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyBJZiB0aGUgb3Bsb2cgaGFuZGxlIHRlbGxzIHVzIHRoYXQgaXQgc2tpcHBlZCBzb21lIGVudHJpZXMgKGJlY2F1c2UgaXQgZ290XG4gICAgLy8gYmVoaW5kLCBzYXkpLCByZS1wb2xsLlxuICAgIHNlbGYuX2FkZFN0b3BIYW5kbGVzKHNlbGYuX21vbmdvSGFuZGxlLl9vcGxvZ0hhbmRsZS5vblNraXBwZWRFbnRyaWVzKFxuICAgICAgZmluaXNoSWZOZWVkVG9Qb2xsUXVlcnkoZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gc2VsZi5fbmVlZFRvUG9sbFF1ZXJ5KCk7XG4gICAgICB9KVxuICAgICkpO1xuICAgIFxuICAgIGF3YWl0IGZvckVhY2hUcmlnZ2VyKHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLCBhc3luYyBmdW5jdGlvbiAodHJpZ2dlcikge1xuICAgICAgc2VsZi5fYWRkU3RvcEhhbmRsZXMoYXdhaXQgc2VsZi5fbW9uZ29IYW5kbGUuX29wbG9nSGFuZGxlLm9uT3Bsb2dFbnRyeShcbiAgICAgICAgdHJpZ2dlciwgZnVuY3Rpb24gKG5vdGlmaWNhdGlvbikge1xuICAgICAgICAgIGZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnN0IG9wID0gbm90aWZpY2F0aW9uLm9wO1xuICAgICAgICAgICAgaWYgKG5vdGlmaWNhdGlvbi5kcm9wQ29sbGVjdGlvbiB8fCBub3RpZmljYXRpb24uZHJvcERhdGFiYXNlKSB7XG4gICAgICAgICAgICAgIC8vIE5vdGU6IHRoaXMgY2FsbCBpcyBub3QgYWxsb3dlZCB0byBibG9jayBvbiBhbnl0aGluZyAoZXNwZWNpYWxseVxuICAgICAgICAgICAgICAvLyBvbiB3YWl0aW5nIGZvciBvcGxvZyBlbnRyaWVzIHRvIGNhdGNoIHVwKSBiZWNhdXNlIHRoYXQgd2lsbCBibG9ja1xuICAgICAgICAgICAgICAvLyBvbk9wbG9nRW50cnkhXG4gICAgICAgICAgICAgIHJldHVybiBzZWxmLl9uZWVkVG9Qb2xsUXVlcnkoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIEFsbCBvdGhlciBvcGVyYXRvcnMgc2hvdWxkIGJlIGhhbmRsZWQgZGVwZW5kaW5nIG9uIHBoYXNlXG4gICAgICAgICAgICAgIGlmIChzZWxmLl9waGFzZSA9PT0gUEhBU0UuUVVFUllJTkcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZi5faGFuZGxlT3Bsb2dFbnRyeVF1ZXJ5aW5nKG9wKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZi5faGFuZGxlT3Bsb2dFbnRyeVN0ZWFkeU9yRmV0Y2hpbmcob3ApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSkoKTtcbiAgICAgICAgfVxuICAgICAgKSk7XG4gICAgfSk7XG4gIFxuICAgIC8vIFhYWCBvcmRlcmluZyB3LnIudC4gZXZlcnl0aGluZyBlbHNlP1xuICAgIHNlbGYuX2FkZFN0b3BIYW5kbGVzKGF3YWl0IGxpc3RlbkFsbChcbiAgICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIElmIHdlJ3JlIG5vdCBpbiBhIHByZS1maXJlIHdyaXRlIGZlbmNlLCB3ZSBkb24ndCBoYXZlIHRvIGRvIGFueXRoaW5nLlxuICAgICAgICBjb25zdCBmZW5jZSA9IEREUFNlcnZlci5fZ2V0Q3VycmVudEZlbmNlKCk7XG4gICAgICAgIGlmICghZmVuY2UgfHwgZmVuY2UuZmlyZWQpXG4gICAgICAgICAgcmV0dXJuO1xuICBcbiAgICAgICAgaWYgKGZlbmNlLl9vcGxvZ09ic2VydmVEcml2ZXJzKSB7XG4gICAgICAgICAgZmVuY2UuX29wbG9nT2JzZXJ2ZURyaXZlcnNbc2VsZi5faWRdID0gc2VsZjtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgXG4gICAgICAgIGZlbmNlLl9vcGxvZ09ic2VydmVEcml2ZXJzID0ge307XG4gICAgICAgIGZlbmNlLl9vcGxvZ09ic2VydmVEcml2ZXJzW3NlbGYuX2lkXSA9IHNlbGY7XG4gIFxuICAgICAgICBmZW5jZS5vbkJlZm9yZUZpcmUoYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGNvbnN0IGRyaXZlcnMgPSBmZW5jZS5fb3Bsb2dPYnNlcnZlRHJpdmVycztcbiAgICAgICAgICBkZWxldGUgZmVuY2UuX29wbG9nT2JzZXJ2ZURyaXZlcnM7XG4gIFxuICAgICAgICAgIC8vIFRoaXMgZmVuY2UgY2Fubm90IGZpcmUgdW50aWwgd2UndmUgY2F1Z2h0IHVwIHRvIFwidGhpcyBwb2ludFwiIGluIHRoZVxuICAgICAgICAgIC8vIG9wbG9nLCBhbmQgYWxsIG9ic2VydmVycyBtYWRlIGl0IGJhY2sgdG8gdGhlIHN0ZWFkeSBzdGF0ZS5cbiAgICAgICAgICBhd2FpdCBzZWxmLl9tb25nb0hhbmRsZS5fb3Bsb2dIYW5kbGUud2FpdFVudGlsQ2F1Z2h0VXAoKTtcbiAgXG4gICAgICAgICAgZm9yIChjb25zdCBkcml2ZXIgb2YgT2JqZWN0LnZhbHVlcyhkcml2ZXJzKSkge1xuICAgICAgICAgICAgaWYgKGRyaXZlci5fc3RvcHBlZClcbiAgICAgICAgICAgICAgY29udGludWU7XG4gIFxuICAgICAgICAgICAgY29uc3Qgd3JpdGUgPSBhd2FpdCBmZW5jZS5iZWdpbldyaXRlKCk7XG4gICAgICAgICAgICBpZiAoZHJpdmVyLl9waGFzZSA9PT0gUEhBU0UuU1RFQURZKSB7XG4gICAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSB0aGF0IGFsbCBvZiB0aGUgY2FsbGJhY2tzIGhhdmUgbWFkZSBpdCB0aHJvdWdoIHRoZVxuICAgICAgICAgICAgICAvLyBtdWx0aXBsZXhlciBhbmQgYmVlbiBkZWxpdmVyZWQgdG8gT2JzZXJ2ZUhhbmRsZXMgYmVmb3JlIGNvbW1pdHRpbmdcbiAgICAgICAgICAgICAgLy8gd3JpdGVzLlxuICAgICAgICAgICAgICBhd2FpdCBkcml2ZXIuX211bHRpcGxleGVyLm9uRmx1c2god3JpdGUuY29tbWl0dGVkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGRyaXZlci5fd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeS5wdXNoKHdyaXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICkpO1xuICBcbiAgICAvLyBXaGVuIE1vbmdvIGZhaWxzIG92ZXIsIHdlIG5lZWQgdG8gcmVwb2xsIHRoZSBxdWVyeSwgaW4gY2FzZSB3ZSBwcm9jZXNzZWQgYW5cbiAgICAvLyBvcGxvZyBlbnRyeSB0aGF0IGdvdCByb2xsZWQgYmFjay5cbiAgICBzZWxmLl9hZGRTdG9wSGFuZGxlcyhzZWxmLl9tb25nb0hhbmRsZS5fb25GYWlsb3ZlcihmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeShcbiAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYuX25lZWRUb1BvbGxRdWVyeSgpO1xuICAgICAgfSkpKTtcbiAgXG4gICAgLy8gR2l2ZSBfb2JzZXJ2ZUNoYW5nZXMgYSBjaGFuY2UgdG8gYWRkIHRoZSBuZXcgT2JzZXJ2ZUhhbmRsZSB0byBvdXJcbiAgICAvLyBtdWx0aXBsZXhlciwgc28gdGhhdCB0aGUgYWRkZWQgY2FsbHMgZ2V0IHN0cmVhbWVkLlxuICAgIHJldHVybiBzZWxmLl9ydW5Jbml0aWFsUXVlcnkoKTtcbiAgfSxcbiAgX2FkZFB1Ymxpc2hlZDogZnVuY3Rpb24gKGlkLCBkb2MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGZpZWxkcyA9IE9iamVjdC5hc3NpZ24oe30sIGRvYyk7XG4gICAgICBkZWxldGUgZmllbGRzLl9pZDtcbiAgICAgIHNlbGYuX3B1Ymxpc2hlZC5zZXQoaWQsIHNlbGYuX3NoYXJlZFByb2plY3Rpb25Gbihkb2MpKTtcbiAgICAgIHNlbGYuX211bHRpcGxleGVyLmFkZGVkKGlkLCBzZWxmLl9wcm9qZWN0aW9uRm4oZmllbGRzKSk7XG5cbiAgICAgIC8vIEFmdGVyIGFkZGluZyB0aGlzIGRvY3VtZW50LCB0aGUgcHVibGlzaGVkIHNldCBtaWdodCBiZSBvdmVyZmxvd2VkXG4gICAgICAvLyAoZXhjZWVkaW5nIGNhcGFjaXR5IHNwZWNpZmllZCBieSBsaW1pdCkuIElmIHNvLCBwdXNoIHRoZSBtYXhpbXVtXG4gICAgICAvLyBlbGVtZW50IHRvIHRoZSBidWZmZXIsIHdlIG1pZ2h0IHdhbnQgdG8gc2F2ZSBpdCBpbiBtZW1vcnkgdG8gcmVkdWNlIHRoZVxuICAgICAgLy8gYW1vdW50IG9mIE1vbmdvIGxvb2t1cHMgaW4gdGhlIGZ1dHVyZS5cbiAgICAgIGlmIChzZWxmLl9saW1pdCAmJiBzZWxmLl9wdWJsaXNoZWQuc2l6ZSgpID4gc2VsZi5fbGltaXQpIHtcbiAgICAgICAgLy8gWFhYIGluIHRoZW9yeSB0aGUgc2l6ZSBvZiBwdWJsaXNoZWQgaXMgbm8gbW9yZSB0aGFuIGxpbWl0KzFcbiAgICAgICAgaWYgKHNlbGYuX3B1Ymxpc2hlZC5zaXplKCkgIT09IHNlbGYuX2xpbWl0ICsgMSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkFmdGVyIGFkZGluZyB0byBwdWJsaXNoZWQsIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgKHNlbGYuX3B1Ymxpc2hlZC5zaXplKCkgLSBzZWxmLl9saW1pdCkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICBcIiBkb2N1bWVudHMgYXJlIG92ZXJmbG93aW5nIHRoZSBzZXRcIik7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgb3ZlcmZsb3dpbmdEb2NJZCA9IHNlbGYuX3B1Ymxpc2hlZC5tYXhFbGVtZW50SWQoKTtcbiAgICAgICAgdmFyIG92ZXJmbG93aW5nRG9jID0gc2VsZi5fcHVibGlzaGVkLmdldChvdmVyZmxvd2luZ0RvY0lkKTtcblxuICAgICAgICBpZiAoRUpTT04uZXF1YWxzKG92ZXJmbG93aW5nRG9jSWQsIGlkKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSBkb2N1bWVudCBqdXN0IGFkZGVkIGlzIG92ZXJmbG93aW5nIHRoZSBwdWJsaXNoZWQgc2V0XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgc2VsZi5fcHVibGlzaGVkLnJlbW92ZShvdmVyZmxvd2luZ0RvY0lkKTtcbiAgICAgICAgc2VsZi5fbXVsdGlwbGV4ZXIucmVtb3ZlZChvdmVyZmxvd2luZ0RvY0lkKTtcbiAgICAgICAgc2VsZi5fYWRkQnVmZmVyZWQob3ZlcmZsb3dpbmdEb2NJZCwgb3ZlcmZsb3dpbmdEb2MpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICBfcmVtb3ZlUHVibGlzaGVkOiBmdW5jdGlvbiAoaWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fcHVibGlzaGVkLnJlbW92ZShpZCk7XG4gICAgICBzZWxmLl9tdWx0aXBsZXhlci5yZW1vdmVkKGlkKTtcbiAgICAgIGlmICghIHNlbGYuX2xpbWl0IHx8IHNlbGYuX3B1Ymxpc2hlZC5zaXplKCkgPT09IHNlbGYuX2xpbWl0KVxuICAgICAgICByZXR1cm47XG5cbiAgICAgIGlmIChzZWxmLl9wdWJsaXNoZWQuc2l6ZSgpID4gc2VsZi5fbGltaXQpXG4gICAgICAgIHRocm93IEVycm9yKFwic2VsZi5fcHVibGlzaGVkIGdvdCB0b28gYmlnXCIpO1xuXG4gICAgICAvLyBPSywgd2UgYXJlIHB1Ymxpc2hpbmcgbGVzcyB0aGFuIHRoZSBsaW1pdC4gTWF5YmUgd2Ugc2hvdWxkIGxvb2sgaW4gdGhlXG4gICAgICAvLyBidWZmZXIgdG8gZmluZCB0aGUgbmV4dCBlbGVtZW50IHBhc3Qgd2hhdCB3ZSB3ZXJlIHB1Ymxpc2hpbmcgYmVmb3JlLlxuXG4gICAgICBpZiAoIXNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmVtcHR5KCkpIHtcbiAgICAgICAgLy8gVGhlcmUncyBzb21ldGhpbmcgaW4gdGhlIGJ1ZmZlcjsgbW92ZSB0aGUgZmlyc3QgdGhpbmcgaW4gaXQgdG9cbiAgICAgICAgLy8gX3B1Ymxpc2hlZC5cbiAgICAgICAgdmFyIG5ld0RvY0lkID0gc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIubWluRWxlbWVudElkKCk7XG4gICAgICAgIHZhciBuZXdEb2MgPSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQobmV3RG9jSWQpO1xuICAgICAgICBzZWxmLl9yZW1vdmVCdWZmZXJlZChuZXdEb2NJZCk7XG4gICAgICAgIHNlbGYuX2FkZFB1Ymxpc2hlZChuZXdEb2NJZCwgbmV3RG9jKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGVyZSdzIG5vdGhpbmcgaW4gdGhlIGJ1ZmZlci4gIFRoaXMgY291bGQgbWVhbiBvbmUgb2YgYSBmZXcgdGhpbmdzLlxuXG4gICAgICAvLyAoYSkgV2UgY291bGQgYmUgaW4gdGhlIG1pZGRsZSBvZiByZS1ydW5uaW5nIHRoZSBxdWVyeSAoc3BlY2lmaWNhbGx5LCB3ZVxuICAgICAgLy8gY291bGQgYmUgaW4gX3B1Ymxpc2hOZXdSZXN1bHRzKS4gSW4gdGhhdCBjYXNlLCBfdW5wdWJsaXNoZWRCdWZmZXIgaXNcbiAgICAgIC8vIGVtcHR5IGJlY2F1c2Ugd2UgY2xlYXIgaXQgYXQgdGhlIGJlZ2lubmluZyBvZiBfcHVibGlzaE5ld1Jlc3VsdHMuIEluXG4gICAgICAvLyB0aGlzIGNhc2UsIG91ciBjYWxsZXIgYWxyZWFkeSBrbm93cyB0aGUgZW50aXJlIGFuc3dlciB0byB0aGUgcXVlcnkgYW5kXG4gICAgICAvLyB3ZSBkb24ndCBuZWVkIHRvIGRvIGFueXRoaW5nIGZhbmN5IGhlcmUuICBKdXN0IHJldHVybi5cbiAgICAgIGlmIChzZWxmLl9waGFzZSA9PT0gUEhBU0UuUVVFUllJTkcpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgLy8gKGIpIFdlJ3JlIHByZXR0eSBjb25maWRlbnQgdGhhdCB0aGUgdW5pb24gb2YgX3B1Ymxpc2hlZCBhbmRcbiAgICAgIC8vIF91bnB1Ymxpc2hlZEJ1ZmZlciBjb250YWluIGFsbCBkb2N1bWVudHMgdGhhdCBtYXRjaCBzZWxlY3Rvci4gQmVjYXVzZVxuICAgICAgLy8gX3VucHVibGlzaGVkQnVmZmVyIGlzIGVtcHR5LCB0aGF0IG1lYW5zIHdlJ3JlIGNvbmZpZGVudCB0aGF0IF9wdWJsaXNoZWRcbiAgICAgIC8vIGNvbnRhaW5zIGFsbCBkb2N1bWVudHMgdGhhdCBtYXRjaCBzZWxlY3Rvci4gU28gd2UgaGF2ZSBub3RoaW5nIHRvIGRvLlxuICAgICAgaWYgKHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlcilcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICAvLyAoYykgTWF5YmUgdGhlcmUgYXJlIG90aGVyIGRvY3VtZW50cyBvdXQgdGhlcmUgdGhhdCBzaG91bGQgYmUgaW4gb3VyXG4gICAgICAvLyBidWZmZXIuIEJ1dCBpbiB0aGF0IGNhc2UsIHdoZW4gd2UgZW1wdGllZCBfdW5wdWJsaXNoZWRCdWZmZXIgaW5cbiAgICAgIC8vIF9yZW1vdmVCdWZmZXJlZCwgd2Ugc2hvdWxkIGhhdmUgY2FsbGVkIF9uZWVkVG9Qb2xsUXVlcnksIHdoaWNoIHdpbGxcbiAgICAgIC8vIGVpdGhlciBwdXQgc29tZXRoaW5nIGluIF91bnB1Ymxpc2hlZEJ1ZmZlciBvciBzZXQgX3NhZmVBcHBlbmRUb0J1ZmZlclxuICAgICAgLy8gKG9yIGJvdGgpLCBhbmQgaXQgd2lsbCBwdXQgdXMgaW4gUVVFUllJTkcgZm9yIHRoYXQgd2hvbGUgdGltZS4gU28gaW5cbiAgICAgIC8vIGZhY3QsIHdlIHNob3VsZG4ndCBiZSBhYmxlIHRvIGdldCBoZXJlLlxuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJCdWZmZXIgaW5leHBsaWNhYmx5IGVtcHR5XCIpO1xuICAgIH0pO1xuICB9LFxuICBfY2hhbmdlUHVibGlzaGVkOiBmdW5jdGlvbiAoaWQsIG9sZERvYywgbmV3RG9jKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX3B1Ymxpc2hlZC5zZXQoaWQsIHNlbGYuX3NoYXJlZFByb2plY3Rpb25GbihuZXdEb2MpKTtcbiAgICAgIHZhciBwcm9qZWN0ZWROZXcgPSBzZWxmLl9wcm9qZWN0aW9uRm4obmV3RG9jKTtcbiAgICAgIHZhciBwcm9qZWN0ZWRPbGQgPSBzZWxmLl9wcm9qZWN0aW9uRm4ob2xkRG9jKTtcbiAgICAgIHZhciBjaGFuZ2VkID0gRGlmZlNlcXVlbmNlLm1ha2VDaGFuZ2VkRmllbGRzKFxuICAgICAgICBwcm9qZWN0ZWROZXcsIHByb2plY3RlZE9sZCk7XG4gICAgICBpZiAoIWlzRW1wdHkoY2hhbmdlZCkpXG4gICAgICAgIHNlbGYuX211bHRpcGxleGVyLmNoYW5nZWQoaWQsIGNoYW5nZWQpO1xuICAgIH0pO1xuICB9LFxuICBfYWRkQnVmZmVyZWQ6IGZ1bmN0aW9uIChpZCwgZG9jKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnNldChpZCwgc2VsZi5fc2hhcmVkUHJvamVjdGlvbkZuKGRvYykpO1xuXG4gICAgICAvLyBJZiBzb21ldGhpbmcgaXMgb3ZlcmZsb3dpbmcgdGhlIGJ1ZmZlciwgd2UganVzdCByZW1vdmUgaXQgZnJvbSBjYWNoZVxuICAgICAgaWYgKHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnNpemUoKSA+IHNlbGYuX2xpbWl0KSB7XG4gICAgICAgIHZhciBtYXhCdWZmZXJlZElkID0gc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIubWF4RWxlbWVudElkKCk7XG5cbiAgICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIucmVtb3ZlKG1heEJ1ZmZlcmVkSWQpO1xuXG4gICAgICAgIC8vIFNpbmNlIHNvbWV0aGluZyBtYXRjaGluZyBpcyByZW1vdmVkIGZyb20gY2FjaGUgKGJvdGggcHVibGlzaGVkIHNldCBhbmRcbiAgICAgICAgLy8gYnVmZmVyKSwgc2V0IGZsYWcgdG8gZmFsc2VcbiAgICAgICAgc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyID0gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIC8vIElzIGNhbGxlZCBlaXRoZXIgdG8gcmVtb3ZlIHRoZSBkb2MgY29tcGxldGVseSBmcm9tIG1hdGNoaW5nIHNldCBvciB0byBtb3ZlXG4gIC8vIGl0IHRvIHRoZSBwdWJsaXNoZWQgc2V0IGxhdGVyLlxuICBfcmVtb3ZlQnVmZmVyZWQ6IGZ1bmN0aW9uIChpZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5yZW1vdmUoaWQpO1xuICAgICAgLy8gVG8ga2VlcCB0aGUgY29udHJhY3QgXCJidWZmZXIgaXMgbmV2ZXIgZW1wdHkgaW4gU1RFQURZIHBoYXNlIHVubGVzcyB0aGVcbiAgICAgIC8vIGV2ZXJ5dGhpbmcgbWF0Y2hpbmcgZml0cyBpbnRvIHB1Ymxpc2hlZFwiIHRydWUsIHdlIHBvbGwgZXZlcnl0aGluZyBhc1xuICAgICAgLy8gc29vbiBhcyB3ZSBzZWUgdGhlIGJ1ZmZlciBiZWNvbWluZyBlbXB0eS5cbiAgICAgIGlmICghIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnNpemUoKSAmJiAhIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlcilcbiAgICAgICAgc2VsZi5fbmVlZFRvUG9sbFF1ZXJ5KCk7XG4gICAgfSk7XG4gIH0sXG4gIC8vIENhbGxlZCB3aGVuIGEgZG9jdW1lbnQgaGFzIGpvaW5lZCB0aGUgXCJNYXRjaGluZ1wiIHJlc3VsdHMgc2V0LlxuICAvLyBUYWtlcyByZXNwb25zaWJpbGl0eSBvZiBrZWVwaW5nIF91bnB1Ymxpc2hlZEJ1ZmZlciBpbiBzeW5jIHdpdGggX3B1Ymxpc2hlZFxuICAvLyBhbmQgdGhlIGVmZmVjdCBvZiBsaW1pdCBlbmZvcmNlZC5cbiAgX2FkZE1hdGNoaW5nOiBmdW5jdGlvbiAoZG9jKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBpZCA9IGRvYy5faWQ7XG4gICAgICBpZiAoc2VsZi5fcHVibGlzaGVkLmhhcyhpZCkpXG4gICAgICAgIHRocm93IEVycm9yKFwidHJpZWQgdG8gYWRkIHNvbWV0aGluZyBhbHJlYWR5IHB1Ymxpc2hlZCBcIiArIGlkKTtcbiAgICAgIGlmIChzZWxmLl9saW1pdCAmJiBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5oYXMoaWQpKVxuICAgICAgICB0aHJvdyBFcnJvcihcInRyaWVkIHRvIGFkZCBzb21ldGhpbmcgYWxyZWFkeSBleGlzdGVkIGluIGJ1ZmZlciBcIiArIGlkKTtcblxuICAgICAgdmFyIGxpbWl0ID0gc2VsZi5fbGltaXQ7XG4gICAgICB2YXIgY29tcGFyYXRvciA9IHNlbGYuX2NvbXBhcmF0b3I7XG4gICAgICB2YXIgbWF4UHVibGlzaGVkID0gKGxpbWl0ICYmIHNlbGYuX3B1Ymxpc2hlZC5zaXplKCkgPiAwKSA/XG4gICAgICAgIHNlbGYuX3B1Ymxpc2hlZC5nZXQoc2VsZi5fcHVibGlzaGVkLm1heEVsZW1lbnRJZCgpKSA6IG51bGw7XG4gICAgICB2YXIgbWF4QnVmZmVyZWQgPSAobGltaXQgJiYgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuc2l6ZSgpID4gMClcbiAgICAgICAgPyBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQoc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIubWF4RWxlbWVudElkKCkpXG4gICAgICAgIDogbnVsbDtcbiAgICAgIC8vIFRoZSBxdWVyeSBpcyB1bmxpbWl0ZWQgb3IgZGlkbid0IHB1Ymxpc2ggZW5vdWdoIGRvY3VtZW50cyB5ZXQgb3IgdGhlXG4gICAgICAvLyBuZXcgZG9jdW1lbnQgd291bGQgZml0IGludG8gcHVibGlzaGVkIHNldCBwdXNoaW5nIHRoZSBtYXhpbXVtIGVsZW1lbnRcbiAgICAgIC8vIG91dCwgdGhlbiB3ZSBuZWVkIHRvIHB1Ymxpc2ggdGhlIGRvYy5cbiAgICAgIHZhciB0b1B1Ymxpc2ggPSAhIGxpbWl0IHx8IHNlbGYuX3B1Ymxpc2hlZC5zaXplKCkgPCBsaW1pdCB8fFxuICAgICAgICBjb21wYXJhdG9yKGRvYywgbWF4UHVibGlzaGVkKSA8IDA7XG5cbiAgICAgIC8vIE90aGVyd2lzZSB3ZSBtaWdodCBuZWVkIHRvIGJ1ZmZlciBpdCAob25seSBpbiBjYXNlIG9mIGxpbWl0ZWQgcXVlcnkpLlxuICAgICAgLy8gQnVmZmVyaW5nIGlzIGFsbG93ZWQgaWYgdGhlIGJ1ZmZlciBpcyBub3QgZmlsbGVkIHVwIHlldCBhbmQgYWxsXG4gICAgICAvLyBtYXRjaGluZyBkb2NzIGFyZSBlaXRoZXIgaW4gdGhlIHB1Ymxpc2hlZCBzZXQgb3IgaW4gdGhlIGJ1ZmZlci5cbiAgICAgIHZhciBjYW5BcHBlbmRUb0J1ZmZlciA9ICF0b1B1Ymxpc2ggJiYgc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyICYmXG4gICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnNpemUoKSA8IGxpbWl0O1xuXG4gICAgICAvLyBPciBpZiBpdCBpcyBzbWFsbCBlbm91Z2ggdG8gYmUgc2FmZWx5IGluc2VydGVkIHRvIHRoZSBtaWRkbGUgb3IgdGhlXG4gICAgICAvLyBiZWdpbm5pbmcgb2YgdGhlIGJ1ZmZlci5cbiAgICAgIHZhciBjYW5JbnNlcnRJbnRvQnVmZmVyID0gIXRvUHVibGlzaCAmJiBtYXhCdWZmZXJlZCAmJlxuICAgICAgICBjb21wYXJhdG9yKGRvYywgbWF4QnVmZmVyZWQpIDw9IDA7XG5cbiAgICAgIHZhciB0b0J1ZmZlciA9IGNhbkFwcGVuZFRvQnVmZmVyIHx8IGNhbkluc2VydEludG9CdWZmZXI7XG5cbiAgICAgIGlmICh0b1B1Ymxpc2gpIHtcbiAgICAgICAgc2VsZi5fYWRkUHVibGlzaGVkKGlkLCBkb2MpO1xuICAgICAgfSBlbHNlIGlmICh0b0J1ZmZlcikge1xuICAgICAgICBzZWxmLl9hZGRCdWZmZXJlZChpZCwgZG9jKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGRyb3BwaW5nIGl0IGFuZCBub3Qgc2F2aW5nIHRvIHRoZSBjYWNoZVxuICAgICAgICBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgLy8gQ2FsbGVkIHdoZW4gYSBkb2N1bWVudCBsZWF2ZXMgdGhlIFwiTWF0Y2hpbmdcIiByZXN1bHRzIHNldC5cbiAgLy8gVGFrZXMgcmVzcG9uc2liaWxpdHkgb2Yga2VlcGluZyBfdW5wdWJsaXNoZWRCdWZmZXIgaW4gc3luYyB3aXRoIF9wdWJsaXNoZWRcbiAgLy8gYW5kIHRoZSBlZmZlY3Qgb2YgbGltaXQgZW5mb3JjZWQuXG4gIF9yZW1vdmVNYXRjaGluZzogZnVuY3Rpb24gKGlkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICghIHNlbGYuX3B1Ymxpc2hlZC5oYXMoaWQpICYmICEgc2VsZi5fbGltaXQpXG4gICAgICAgIHRocm93IEVycm9yKFwidHJpZWQgdG8gcmVtb3ZlIHNvbWV0aGluZyBtYXRjaGluZyBidXQgbm90IGNhY2hlZCBcIiArIGlkKTtcblxuICAgICAgaWYgKHNlbGYuX3B1Ymxpc2hlZC5oYXMoaWQpKSB7XG4gICAgICAgIHNlbGYuX3JlbW92ZVB1Ymxpc2hlZChpZCk7XG4gICAgICB9IGVsc2UgaWYgKHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmhhcyhpZCkpIHtcbiAgICAgICAgc2VsZi5fcmVtb3ZlQnVmZmVyZWQoaWQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICBfaGFuZGxlRG9jOiBmdW5jdGlvbiAoaWQsIG5ld0RvYykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgbWF0Y2hlc05vdyA9IG5ld0RvYyAmJiBzZWxmLl9tYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhuZXdEb2MpLnJlc3VsdDtcblxuICAgICAgdmFyIHB1Ymxpc2hlZEJlZm9yZSA9IHNlbGYuX3B1Ymxpc2hlZC5oYXMoaWQpO1xuICAgICAgdmFyIGJ1ZmZlcmVkQmVmb3JlID0gc2VsZi5fbGltaXQgJiYgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuaGFzKGlkKTtcbiAgICAgIHZhciBjYWNoZWRCZWZvcmUgPSBwdWJsaXNoZWRCZWZvcmUgfHwgYnVmZmVyZWRCZWZvcmU7XG5cbiAgICAgIGlmIChtYXRjaGVzTm93ICYmICFjYWNoZWRCZWZvcmUpIHtcbiAgICAgICAgc2VsZi5fYWRkTWF0Y2hpbmcobmV3RG9jKTtcbiAgICAgIH0gZWxzZSBpZiAoY2FjaGVkQmVmb3JlICYmICFtYXRjaGVzTm93KSB7XG4gICAgICAgIHNlbGYuX3JlbW92ZU1hdGNoaW5nKGlkKTtcbiAgICAgIH0gZWxzZSBpZiAoY2FjaGVkQmVmb3JlICYmIG1hdGNoZXNOb3cpIHtcbiAgICAgICAgdmFyIG9sZERvYyA9IHNlbGYuX3B1Ymxpc2hlZC5nZXQoaWQpO1xuICAgICAgICB2YXIgY29tcGFyYXRvciA9IHNlbGYuX2NvbXBhcmF0b3I7XG4gICAgICAgIHZhciBtaW5CdWZmZXJlZCA9IHNlbGYuX2xpbWl0ICYmIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnNpemUoKSAmJlxuICAgICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmdldChzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5taW5FbGVtZW50SWQoKSk7XG4gICAgICAgIHZhciBtYXhCdWZmZXJlZDtcblxuICAgICAgICBpZiAocHVibGlzaGVkQmVmb3JlKSB7XG4gICAgICAgICAgLy8gVW5saW1pdGVkIGNhc2Ugd2hlcmUgdGhlIGRvY3VtZW50IHN0YXlzIGluIHB1Ymxpc2hlZCBvbmNlIGl0XG4gICAgICAgICAgLy8gbWF0Y2hlcyBvciB0aGUgY2FzZSB3aGVuIHdlIGRvbid0IGhhdmUgZW5vdWdoIG1hdGNoaW5nIGRvY3MgdG9cbiAgICAgICAgICAvLyBwdWJsaXNoIG9yIHRoZSBjaGFuZ2VkIGJ1dCBtYXRjaGluZyBkb2Mgd2lsbCBzdGF5IGluIHB1Ymxpc2hlZFxuICAgICAgICAgIC8vIGFueXdheXMuXG4gICAgICAgICAgLy9cbiAgICAgICAgICAvLyBYWFg6IFdlIHJlbHkgb24gdGhlIGVtcHRpbmVzcyBvZiBidWZmZXIuIEJlIHN1cmUgdG8gbWFpbnRhaW4gdGhlXG4gICAgICAgICAgLy8gZmFjdCB0aGF0IGJ1ZmZlciBjYW4ndCBiZSBlbXB0eSBpZiB0aGVyZSBhcmUgbWF0Y2hpbmcgZG9jdW1lbnRzIG5vdFxuICAgICAgICAgIC8vIHB1Ymxpc2hlZC4gTm90YWJseSwgd2UgZG9uJ3Qgd2FudCB0byBzY2hlZHVsZSByZXBvbGwgYW5kIGNvbnRpbnVlXG4gICAgICAgICAgLy8gcmVseWluZyBvbiB0aGlzIHByb3BlcnR5LlxuICAgICAgICAgIHZhciBzdGF5c0luUHVibGlzaGVkID0gISBzZWxmLl9saW1pdCB8fFxuICAgICAgICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuc2l6ZSgpID09PSAwIHx8XG4gICAgICAgICAgICBjb21wYXJhdG9yKG5ld0RvYywgbWluQnVmZmVyZWQpIDw9IDA7XG5cbiAgICAgICAgICBpZiAoc3RheXNJblB1Ymxpc2hlZCkge1xuICAgICAgICAgICAgc2VsZi5fY2hhbmdlUHVibGlzaGVkKGlkLCBvbGREb2MsIG5ld0RvYyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGFmdGVyIHRoZSBjaGFuZ2UgZG9jIGRvZXNuJ3Qgc3RheSBpbiB0aGUgcHVibGlzaGVkLCByZW1vdmUgaXRcbiAgICAgICAgICAgIHNlbGYuX3JlbW92ZVB1Ymxpc2hlZChpZCk7XG4gICAgICAgICAgICAvLyBidXQgaXQgY2FuIG1vdmUgaW50byBidWZmZXJlZCBub3csIGNoZWNrIGl0XG4gICAgICAgICAgICBtYXhCdWZmZXJlZCA9IHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmdldChcbiAgICAgICAgICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIubWF4RWxlbWVudElkKCkpO1xuXG4gICAgICAgICAgICB2YXIgdG9CdWZmZXIgPSBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIgfHxcbiAgICAgICAgICAgICAgICAgIChtYXhCdWZmZXJlZCAmJiBjb21wYXJhdG9yKG5ld0RvYywgbWF4QnVmZmVyZWQpIDw9IDApO1xuXG4gICAgICAgICAgICBpZiAodG9CdWZmZXIpIHtcbiAgICAgICAgICAgICAgc2VsZi5fYWRkQnVmZmVyZWQoaWQsIG5ld0RvYyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBUaHJvdyBhd2F5IGZyb20gYm90aCBwdWJsaXNoZWQgc2V0IGFuZCBidWZmZXJcbiAgICAgICAgICAgICAgc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGJ1ZmZlcmVkQmVmb3JlKSB7XG4gICAgICAgICAgb2xkRG9jID0gc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuZ2V0KGlkKTtcbiAgICAgICAgICAvLyByZW1vdmUgdGhlIG9sZCB2ZXJzaW9uIG1hbnVhbGx5IGluc3RlYWQgb2YgdXNpbmcgX3JlbW92ZUJ1ZmZlcmVkIHNvXG4gICAgICAgICAgLy8gd2UgZG9uJ3QgdHJpZ2dlciB0aGUgcXVlcnlpbmcgaW1tZWRpYXRlbHkuICBpZiB3ZSBlbmQgdGhpcyBibG9ja1xuICAgICAgICAgIC8vIHdpdGggdGhlIGJ1ZmZlciBlbXB0eSwgd2Ugd2lsbCBuZWVkIHRvIHRyaWdnZXIgdGhlIHF1ZXJ5IHBvbGxcbiAgICAgICAgICAvLyBtYW51YWxseSB0b28uXG4gICAgICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIucmVtb3ZlKGlkKTtcblxuICAgICAgICAgIHZhciBtYXhQdWJsaXNoZWQgPSBzZWxmLl9wdWJsaXNoZWQuZ2V0KFxuICAgICAgICAgICAgc2VsZi5fcHVibGlzaGVkLm1heEVsZW1lbnRJZCgpKTtcbiAgICAgICAgICBtYXhCdWZmZXJlZCA9IHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnNpemUoKSAmJlxuICAgICAgICAgICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmdldChcbiAgICAgICAgICAgICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLm1heEVsZW1lbnRJZCgpKTtcblxuICAgICAgICAgIC8vIHRoZSBidWZmZXJlZCBkb2Mgd2FzIHVwZGF0ZWQsIGl0IGNvdWxkIG1vdmUgdG8gcHVibGlzaGVkXG4gICAgICAgICAgdmFyIHRvUHVibGlzaCA9IGNvbXBhcmF0b3IobmV3RG9jLCBtYXhQdWJsaXNoZWQpIDwgMDtcblxuICAgICAgICAgIC8vIG9yIHN0YXlzIGluIGJ1ZmZlciBldmVuIGFmdGVyIHRoZSBjaGFuZ2VcbiAgICAgICAgICB2YXIgc3RheXNJbkJ1ZmZlciA9ICghIHRvUHVibGlzaCAmJiBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIpIHx8XG4gICAgICAgICAgICAgICAgKCF0b1B1Ymxpc2ggJiYgbWF4QnVmZmVyZWQgJiZcbiAgICAgICAgICAgICAgICAgY29tcGFyYXRvcihuZXdEb2MsIG1heEJ1ZmZlcmVkKSA8PSAwKTtcblxuICAgICAgICAgIGlmICh0b1B1Ymxpc2gpIHtcbiAgICAgICAgICAgIHNlbGYuX2FkZFB1Ymxpc2hlZChpZCwgbmV3RG9jKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHN0YXlzSW5CdWZmZXIpIHtcbiAgICAgICAgICAgIC8vIHN0YXlzIGluIGJ1ZmZlciBidXQgY2hhbmdlc1xuICAgICAgICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuc2V0KGlkLCBuZXdEb2MpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBUaHJvdyBhd2F5IGZyb20gYm90aCBwdWJsaXNoZWQgc2V0IGFuZCBidWZmZXJcbiAgICAgICAgICAgIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciA9IGZhbHNlO1xuICAgICAgICAgICAgLy8gTm9ybWFsbHkgdGhpcyBjaGVjayB3b3VsZCBoYXZlIGJlZW4gZG9uZSBpbiBfcmVtb3ZlQnVmZmVyZWQgYnV0XG4gICAgICAgICAgICAvLyB3ZSBkaWRuJ3QgdXNlIGl0LCBzbyB3ZSBuZWVkIHRvIGRvIGl0IG91cnNlbGYgbm93LlxuICAgICAgICAgICAgaWYgKCEgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuc2l6ZSgpKSB7XG4gICAgICAgICAgICAgIHNlbGYuX25lZWRUb1BvbGxRdWVyeSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJjYWNoZWRCZWZvcmUgaW1wbGllcyBlaXRoZXIgb2YgcHVibGlzaGVkQmVmb3JlIG9yIGJ1ZmZlcmVkQmVmb3JlIGlzIHRydWUuXCIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIF9mZXRjaE1vZGlmaWVkRG9jdW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYuX3JlZ2lzdGVyUGhhc2VDaGFuZ2UoUEhBU0UuRkVUQ0hJTkcpO1xuICAgIC8vIERlZmVyLCBiZWNhdXNlIG5vdGhpbmcgY2FsbGVkIGZyb20gdGhlIG9wbG9nIGVudHJ5IGhhbmRsZXIgbWF5IHlpZWxkLFxuICAgIC8vIGJ1dCBmZXRjaCgpIHlpZWxkcy5cbiAgICBNZXRlb3IuZGVmZXIoZmluaXNoSWZOZWVkVG9Qb2xsUXVlcnkoYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgd2hpbGUgKCFzZWxmLl9zdG9wcGVkICYmICFzZWxmLl9uZWVkVG9GZXRjaC5lbXB0eSgpKSB7XG4gICAgICAgIGlmIChzZWxmLl9waGFzZSA9PT0gUEhBU0UuUVVFUllJTkcpIHtcbiAgICAgICAgICAvLyBXaGlsZSBmZXRjaGluZywgd2UgZGVjaWRlZCB0byBnbyBpbnRvIFFVRVJZSU5HIG1vZGUsIGFuZCB0aGVuIHdlXG4gICAgICAgICAgLy8gc2F3IGFub3RoZXIgb3Bsb2cgZW50cnksIHNvIF9uZWVkVG9GZXRjaCBpcyBub3QgZW1wdHkuIEJ1dCB3ZVxuICAgICAgICAgIC8vIHNob3VsZG4ndCBmZXRjaCB0aGVzZSBkb2N1bWVudHMgdW50aWwgQUZURVIgdGhlIHF1ZXJ5IGlzIGRvbmUuXG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCZWluZyBpbiBzdGVhZHkgcGhhc2UgaGVyZSB3b3VsZCBiZSBzdXJwcmlzaW5nLlxuICAgICAgICBpZiAoc2VsZi5fcGhhc2UgIT09IFBIQVNFLkZFVENISU5HKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInBoYXNlIGluIGZldGNoTW9kaWZpZWREb2N1bWVudHM6IFwiICsgc2VsZi5fcGhhc2UpO1xuXG4gICAgICAgIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nID0gc2VsZi5fbmVlZFRvRmV0Y2g7XG4gICAgICAgIHZhciB0aGlzR2VuZXJhdGlvbiA9ICsrc2VsZi5fZmV0Y2hHZW5lcmF0aW9uO1xuICAgICAgICBzZWxmLl9uZWVkVG9GZXRjaCA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuXG4gICAgICAgIC8vIENyZWF0ZSBhbiBhcnJheSBvZiBwcm9taXNlcyBmb3IgYWxsIHRoZSBmZXRjaCBvcGVyYXRpb25zXG4gICAgICAgIGNvbnN0IGZldGNoUHJvbWlzZXMgPSBbXTtcblxuICAgICAgICBzZWxmLl9jdXJyZW50bHlGZXRjaGluZy5mb3JFYWNoKGZ1bmN0aW9uIChvcCwgaWQpIHtcbiAgICAgICAgICBjb25zdCBmZXRjaFByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBzZWxmLl9tb25nb0hhbmRsZS5fZG9jRmV0Y2hlci5mZXRjaChcbiAgICAgICAgICAgICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWUsXG4gICAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgICBvcCxcbiAgICAgICAgICAgICAgZmluaXNoSWZOZWVkVG9Qb2xsUXVlcnkoZnVuY3Rpb24oZXJyLCBkb2MpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICBNZXRlb3IuX2RlYnVnKCdHb3QgZXhjZXB0aW9uIHdoaWxlIGZldGNoaW5nIGRvY3VtZW50cycsIGVycik7XG4gICAgICAgICAgICAgICAgICAvLyBJZiB3ZSBnZXQgYW4gZXJyb3IgZnJvbSB0aGUgZmV0Y2hlciAoZWcsIHRyb3VibGVcbiAgICAgICAgICAgICAgICAgIC8vIGNvbm5lY3RpbmcgdG8gTW9uZ28pLCBsZXQncyBqdXN0IGFiYW5kb24gdGhlIGZldGNoIHBoYXNlXG4gICAgICAgICAgICAgICAgICAvLyBhbHRvZ2V0aGVyIGFuZCBmYWxsIGJhY2sgdG8gcG9sbGluZy4gSXQncyBub3QgbGlrZSB3ZSdyZVxuICAgICAgICAgICAgICAgICAgLy8gZ2V0dGluZyBsaXZlIHVwZGF0ZXMgYW55d2F5LlxuICAgICAgICAgICAgICAgICAgaWYgKHNlbGYuX3BoYXNlICE9PSBQSEFTRS5RVUVSWUlORykge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9uZWVkVG9Qb2xsUXVlcnkoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICAhc2VsZi5fc3RvcHBlZCAmJlxuICAgICAgICAgICAgICAgICAgc2VsZi5fcGhhc2UgPT09IFBIQVNFLkZFVENISU5HICYmXG4gICAgICAgICAgICAgICAgICBzZWxmLl9mZXRjaEdlbmVyYXRpb24gPT09IHRoaXNHZW5lcmF0aW9uXG4gICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAvLyBXZSByZS1jaGVjayB0aGUgZ2VuZXJhdGlvbiBpbiBjYXNlIHdlJ3ZlIGhhZCBhbiBleHBsaWNpdFxuICAgICAgICAgICAgICAgICAgLy8gX3BvbGxRdWVyeSBjYWxsIChlZywgaW4gYW5vdGhlciBmaWJlcikgd2hpY2ggc2hvdWxkXG4gICAgICAgICAgICAgICAgICAvLyBlZmZlY3RpdmVseSBjYW5jZWwgdGhpcyByb3VuZCBvZiBmZXRjaGVzLiAgKF9wb2xsUXVlcnlcbiAgICAgICAgICAgICAgICAgIC8vIGluY3JlbWVudHMgdGhlIGdlbmVyYXRpb24uKVxuICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5faGFuZGxlRG9jKGlkLCBkb2MpO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApXG4gICAgICAgICAgfSlcbiAgICAgICAgICBmZXRjaFByb21pc2VzLnB1c2goZmV0Y2hQcm9taXNlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIFdhaXQgZm9yIGFsbCBmZXRjaCBvcGVyYXRpb25zIHRvIGNvbXBsZXRlXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsU2V0dGxlZChmZXRjaFByb21pc2VzKTtcbiAgICAgICAgICBjb25zdCBlcnJvcnMgPSByZXN1bHRzXG4gICAgICAgICAgICAuZmlsdGVyKHJlc3VsdCA9PiByZXN1bHQuc3RhdHVzID09PSAncmVqZWN0ZWQnKVxuICAgICAgICAgICAgLm1hcChyZXN1bHQgPT4gcmVzdWx0LnJlYXNvbik7XG5cbiAgICAgICAgICBpZiAoZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIE1ldGVvci5fZGVidWcoJ1NvbWUgZmV0Y2ggcXVlcmllcyBmYWlsZWQ6JywgZXJyb3JzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIE1ldGVvci5fZGVidWcoJ0dvdCBhbiBleGNlcHRpb24gaW4gYSBmZXRjaCBxdWVyeScsIGVycik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRXhpdCBub3cgaWYgd2UndmUgaGFkIGEgX3BvbGxRdWVyeSBjYWxsIChoZXJlIG9yIGluIGFub3RoZXIgZmliZXIpLlxuICAgICAgICBpZiAoc2VsZi5fcGhhc2UgPT09IFBIQVNFLlFVRVJZSU5HKVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgc2VsZi5fY3VycmVudGx5RmV0Y2hpbmcgPSBudWxsO1xuICAgICAgfVxuICAgICAgLy8gV2UncmUgZG9uZSBmZXRjaGluZywgc28gd2UgY2FuIGJlIHN0ZWFkeSwgdW5sZXNzIHdlJ3ZlIGhhZCBhXG4gICAgICAvLyBfcG9sbFF1ZXJ5IGNhbGwgKGhlcmUgb3IgaW4gYW5vdGhlciBmaWJlcikuXG4gICAgICBpZiAoc2VsZi5fcGhhc2UgIT09IFBIQVNFLlFVRVJZSU5HKVxuICAgICAgICBhd2FpdCBzZWxmLl9iZVN0ZWFkeSgpO1xuICAgIH0pKTtcbiAgfSxcbiAgX2JlU3RlYWR5OiBhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYuX3JlZ2lzdGVyUGhhc2VDaGFuZ2UoUEhBU0UuU1RFQURZKTtcbiAgICB2YXIgd3JpdGVzID0gc2VsZi5fd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeSB8fCBbXTtcbiAgICBzZWxmLl93cml0ZXNUb0NvbW1pdFdoZW5XZVJlYWNoU3RlYWR5ID0gW107XG4gICAgYXdhaXQgc2VsZi5fbXVsdGlwbGV4ZXIub25GbHVzaChhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgICB0cnkge1xuICAgICAgICBmb3IgKGNvbnN0IHcgb2Ygd3JpdGVzKSB7XG4gICAgICAgICAgYXdhaXQgdy5jb21taXR0ZWQoKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiX2JlU3RlYWR5IGVycm9yXCIsIHt3cml0ZXN9LCBlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgX2hhbmRsZU9wbG9nRW50cnlRdWVyeWluZzogZnVuY3Rpb24gKG9wKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX25lZWRUb0ZldGNoLnNldChpZEZvck9wKG9wKSwgb3ApO1xuICAgIH0pO1xuICB9LFxuICBfaGFuZGxlT3Bsb2dFbnRyeVN0ZWFkeU9yRmV0Y2hpbmc6IGZ1bmN0aW9uIChvcCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgaWQgPSBpZEZvck9wKG9wKTtcbiAgICAgIC8vIElmIHdlJ3JlIGFscmVhZHkgZmV0Y2hpbmcgdGhpcyBvbmUsIG9yIGFib3V0IHRvLCB3ZSBjYW4ndCBvcHRpbWl6ZTtcbiAgICAgIC8vIG1ha2Ugc3VyZSB0aGF0IHdlIGZldGNoIGl0IGFnYWluIGlmIG5lY2Vzc2FyeS5cblxuICAgICAgaWYgKHNlbGYuX3BoYXNlID09PSBQSEFTRS5GRVRDSElORyAmJlxuICAgICAgICAgICgoc2VsZi5fY3VycmVudGx5RmV0Y2hpbmcgJiYgc2VsZi5fY3VycmVudGx5RmV0Y2hpbmcuaGFzKGlkKSkgfHxcbiAgICAgICAgICAgc2VsZi5fbmVlZFRvRmV0Y2guaGFzKGlkKSkpIHtcbiAgICAgICAgc2VsZi5fbmVlZFRvRmV0Y2guc2V0KGlkLCBvcCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKG9wLm9wID09PSAnZCcpIHtcbiAgICAgICAgaWYgKHNlbGYuX3B1Ymxpc2hlZC5oYXMoaWQpIHx8XG4gICAgICAgICAgICAoc2VsZi5fbGltaXQgJiYgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuaGFzKGlkKSkpXG4gICAgICAgICAgc2VsZi5fcmVtb3ZlTWF0Y2hpbmcoaWQpO1xuICAgICAgfSBlbHNlIGlmIChvcC5vcCA9PT0gJ2knKSB7XG4gICAgICAgIGlmIChzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKSlcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnNlcnQgZm91bmQgZm9yIGFscmVhZHktZXhpc3RpbmcgSUQgaW4gcHVibGlzaGVkXCIpO1xuICAgICAgICBpZiAoc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIgJiYgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuaGFzKGlkKSlcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnNlcnQgZm91bmQgZm9yIGFscmVhZHktZXhpc3RpbmcgSUQgaW4gYnVmZmVyXCIpO1xuXG4gICAgICAgIC8vIFhYWCB3aGF0IGlmIHNlbGVjdG9yIHlpZWxkcz8gIGZvciBub3cgaXQgY2FuJ3QgYnV0IGxhdGVyIGl0IGNvdWxkXG4gICAgICAgIC8vIGhhdmUgJHdoZXJlXG4gICAgICAgIGlmIChzZWxmLl9tYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhvcC5vKS5yZXN1bHQpXG4gICAgICAgICAgc2VsZi5fYWRkTWF0Y2hpbmcob3Aubyk7XG4gICAgICB9IGVsc2UgaWYgKG9wLm9wID09PSAndScpIHtcbiAgICAgICAgLy8gd2UgYXJlIG1hcHBpbmcgdGhlIG5ldyBvcGxvZyBmb3JtYXQgb24gbW9uZ28gNVxuICAgICAgICAvLyB0byB3aGF0IHdlIGtub3cgYmV0dGVyLCAkc2V0XG4gICAgICAgIG9wLm8gPSBvcGxvZ1YyVjFDb252ZXJ0ZXIob3AubylcbiAgICAgICAgLy8gSXMgdGhpcyBhIG1vZGlmaWVyICgkc2V0LyR1bnNldCwgd2hpY2ggbWF5IHJlcXVpcmUgdXMgdG8gcG9sbCB0aGVcbiAgICAgICAgLy8gZGF0YWJhc2UgdG8gZmlndXJlIG91dCBpZiB0aGUgd2hvbGUgZG9jdW1lbnQgbWF0Y2hlcyB0aGUgc2VsZWN0b3IpIG9yXG4gICAgICAgIC8vIGEgcmVwbGFjZW1lbnQgKGluIHdoaWNoIGNhc2Ugd2UgY2FuIGp1c3QgZGlyZWN0bHkgcmUtZXZhbHVhdGUgdGhlXG4gICAgICAgIC8vIHNlbGVjdG9yKT9cbiAgICAgICAgLy8gb3Bsb2cgZm9ybWF0IGhhcyBjaGFuZ2VkIG9uIG1vbmdvZGIgNSwgd2UgaGF2ZSB0byBzdXBwb3J0IGJvdGggbm93XG4gICAgICAgIC8vIGRpZmYgaXMgdGhlIGZvcm1hdCBpbiBNb25nbyA1KyAob3Bsb2cgdjIpXG4gICAgICAgIHZhciBpc1JlcGxhY2UgPSAhaGFzKG9wLm8sICckc2V0JykgJiYgIWhhcyhvcC5vLCAnZGlmZicpICYmICFoYXMob3AubywgJyR1bnNldCcpO1xuICAgICAgICAvLyBJZiB0aGlzIG1vZGlmaWVyIG1vZGlmaWVzIHNvbWV0aGluZyBpbnNpZGUgYW4gRUpTT04gY3VzdG9tIHR5cGUgKGllLFxuICAgICAgICAvLyBhbnl0aGluZyB3aXRoIEVKU09OJCksIHRoZW4gd2UgY2FuJ3QgdHJ5IHRvIHVzZVxuICAgICAgICAvLyBMb2NhbENvbGxlY3Rpb24uX21vZGlmeSwgc2luY2UgdGhhdCBqdXN0IG11dGF0ZXMgdGhlIEVKU09OIGVuY29kaW5nLFxuICAgICAgICAvLyBub3QgdGhlIGFjdHVhbCBvYmplY3QuXG4gICAgICAgIHZhciBjYW5EaXJlY3RseU1vZGlmeURvYyA9XG4gICAgICAgICAgIWlzUmVwbGFjZSAmJiBtb2RpZmllckNhbkJlRGlyZWN0bHlBcHBsaWVkKG9wLm8pO1xuXG4gICAgICAgIHZhciBwdWJsaXNoZWRCZWZvcmUgPSBzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKTtcbiAgICAgICAgdmFyIGJ1ZmZlcmVkQmVmb3JlID0gc2VsZi5fbGltaXQgJiYgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuaGFzKGlkKTtcblxuICAgICAgICBpZiAoaXNSZXBsYWNlKSB7XG4gICAgICAgICAgc2VsZi5faGFuZGxlRG9jKGlkLCBPYmplY3QuYXNzaWduKHtfaWQ6IGlkfSwgb3AubykpO1xuICAgICAgICB9IGVsc2UgaWYgKChwdWJsaXNoZWRCZWZvcmUgfHwgYnVmZmVyZWRCZWZvcmUpICYmXG4gICAgICAgICAgICAgICAgICAgY2FuRGlyZWN0bHlNb2RpZnlEb2MpIHtcbiAgICAgICAgICAvLyBPaCBncmVhdCwgd2UgYWN0dWFsbHkga25vdyB3aGF0IHRoZSBkb2N1bWVudCBpcywgc28gd2UgY2FuIGFwcGx5XG4gICAgICAgICAgLy8gdGhpcyBkaXJlY3RseS5cbiAgICAgICAgICB2YXIgbmV3RG9jID0gc2VsZi5fcHVibGlzaGVkLmhhcyhpZClcbiAgICAgICAgICAgID8gc2VsZi5fcHVibGlzaGVkLmdldChpZCkgOiBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQoaWQpO1xuICAgICAgICAgIG5ld0RvYyA9IEVKU09OLmNsb25lKG5ld0RvYyk7XG5cbiAgICAgICAgICBuZXdEb2MuX2lkID0gaWQ7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIExvY2FsQ29sbGVjdGlvbi5fbW9kaWZ5KG5ld0RvYywgb3Aubyk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGUubmFtZSAhPT0gXCJNaW5pbW9uZ29FcnJvclwiKVxuICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgLy8gV2UgZGlkbid0IHVuZGVyc3RhbmQgdGhlIG1vZGlmaWVyLiAgUmUtZmV0Y2guXG4gICAgICAgICAgICBzZWxmLl9uZWVkVG9GZXRjaC5zZXQoaWQsIG9wKTtcbiAgICAgICAgICAgIGlmIChzZWxmLl9waGFzZSA9PT0gUEhBU0UuU1RFQURZKSB7XG4gICAgICAgICAgICAgIHNlbGYuX2ZldGNoTW9kaWZpZWREb2N1bWVudHMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgc2VsZi5faGFuZGxlRG9jKGlkLCBzZWxmLl9zaGFyZWRQcm9qZWN0aW9uRm4obmV3RG9jKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoIWNhbkRpcmVjdGx5TW9kaWZ5RG9jIHx8XG4gICAgICAgICAgICAgICAgICAgc2VsZi5fbWF0Y2hlci5jYW5CZWNvbWVUcnVlQnlNb2RpZmllcihvcC5vKSB8fFxuICAgICAgICAgICAgICAgICAgIChzZWxmLl9zb3J0ZXIgJiYgc2VsZi5fc29ydGVyLmFmZmVjdGVkQnlNb2RpZmllcihvcC5vKSkpIHtcbiAgICAgICAgICBzZWxmLl9uZWVkVG9GZXRjaC5zZXQoaWQsIG9wKTtcbiAgICAgICAgICBpZiAoc2VsZi5fcGhhc2UgPT09IFBIQVNFLlNURUFEWSlcbiAgICAgICAgICAgIHNlbGYuX2ZldGNoTW9kaWZpZWREb2N1bWVudHMoKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJYWFggU1VSUFJJU0lORyBPUEVSQVRJT046IFwiICsgb3ApO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIGFzeW5jIF9ydW5Jbml0aWFsUXVlcnlBc3luYygpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJvcGxvZyBzdG9wcGVkIHN1cnByaXNpbmdseSBlYXJseVwiKTtcblxuICAgIGF3YWl0IHNlbGYuX3J1blF1ZXJ5KHtpbml0aWFsOiB0cnVlfSk7ICAvLyB5aWVsZHNcblxuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgcmV0dXJuOyAgLy8gY2FuIGhhcHBlbiBvbiBxdWVyeUVycm9yXG5cbiAgICAvLyBBbGxvdyBvYnNlcnZlQ2hhbmdlcyBjYWxscyB0byByZXR1cm4uIChBZnRlciB0aGlzLCBpdCdzIHBvc3NpYmxlIGZvclxuICAgIC8vIHN0b3AoKSB0byBiZSBjYWxsZWQuKVxuICAgIGF3YWl0IHNlbGYuX211bHRpcGxleGVyLnJlYWR5KCk7XG5cbiAgICBhd2FpdCBzZWxmLl9kb25lUXVlcnlpbmcoKTsgIC8vIHlpZWxkc1xuICB9LFxuXG4gIC8vIFlpZWxkcyFcbiAgX3J1bkluaXRpYWxRdWVyeTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9ydW5Jbml0aWFsUXVlcnlBc3luYygpO1xuICB9LFxuXG4gIC8vIEluIHZhcmlvdXMgY2lyY3Vtc3RhbmNlcywgd2UgbWF5IGp1c3Qgd2FudCB0byBzdG9wIHByb2Nlc3NpbmcgdGhlIG9wbG9nIGFuZFxuICAvLyByZS1ydW4gdGhlIGluaXRpYWwgcXVlcnksIGp1c3QgYXMgaWYgd2Ugd2VyZSBhIFBvbGxpbmdPYnNlcnZlRHJpdmVyLlxuICAvL1xuICAvLyBUaGlzIGZ1bmN0aW9uIG1heSBub3QgYmxvY2ssIGJlY2F1c2UgaXQgaXMgY2FsbGVkIGZyb20gYW4gb3Bsb2cgZW50cnlcbiAgLy8gaGFuZGxlci5cbiAgLy9cbiAgLy8gWFhYIFdlIHNob3VsZCBjYWxsIHRoaXMgd2hlbiB3ZSBkZXRlY3QgdGhhdCB3ZSd2ZSBiZWVuIGluIEZFVENISU5HIGZvciBcInRvb1xuICAvLyBsb25nXCIuXG4gIC8vXG4gIC8vIFhYWCBXZSBzaG91bGQgY2FsbCB0aGlzIHdoZW4gd2UgZGV0ZWN0IE1vbmdvIGZhaWxvdmVyIChzaW5jZSB0aGF0IG1pZ2h0XG4gIC8vIG1lYW4gdGhhdCBzb21lIG9mIHRoZSBvcGxvZyBlbnRyaWVzIHdlIGhhdmUgcHJvY2Vzc2VkIGhhdmUgYmVlbiByb2xsZWRcbiAgLy8gYmFjaykuIFRoZSBOb2RlIE1vbmdvIGRyaXZlciBpcyBpbiB0aGUgbWlkZGxlIG9mIGEgYnVuY2ggb2YgaHVnZVxuICAvLyByZWZhY3RvcmluZ3MsIGluY2x1ZGluZyB0aGUgd2F5IHRoYXQgaXQgbm90aWZpZXMgeW91IHdoZW4gcHJpbWFyeVxuICAvLyBjaGFuZ2VzLiBXaWxsIHB1dCBvZmYgaW1wbGVtZW50aW5nIHRoaXMgdW50aWwgZHJpdmVyIDEuNCBpcyBvdXQuXG4gIF9wb2xsUXVlcnk6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgLy8gWWF5LCB3ZSBnZXQgdG8gZm9yZ2V0IGFib3V0IGFsbCB0aGUgdGhpbmdzIHdlIHRob3VnaHQgd2UgaGFkIHRvIGZldGNoLlxuICAgICAgc2VsZi5fbmVlZFRvRmV0Y2ggPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgICAgIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nID0gbnVsbDtcbiAgICAgICsrc2VsZi5fZmV0Y2hHZW5lcmF0aW9uOyAgLy8gaWdub3JlIGFueSBpbi1mbGlnaHQgZmV0Y2hlc1xuICAgICAgc2VsZi5fcmVnaXN0ZXJQaGFzZUNoYW5nZShQSEFTRS5RVUVSWUlORyk7XG5cbiAgICAgIC8vIERlZmVyIHNvIHRoYXQgd2UgZG9uJ3QgeWllbGQuICBXZSBkb24ndCBuZWVkIGZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5XG4gICAgICAvLyBoZXJlIGJlY2F1c2UgU3dpdGNoZWRUb1F1ZXJ5IGlzIG5vdCB0aHJvd24gaW4gUVVFUllJTkcgbW9kZS5cbiAgICAgIE1ldGVvci5kZWZlcihhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGF3YWl0IHNlbGYuX3J1blF1ZXJ5KCk7XG4gICAgICAgIGF3YWl0IHNlbGYuX2RvbmVRdWVyeWluZygpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gWWllbGRzIVxuICBhc3luYyBfcnVuUXVlcnlBc3luYyhvcHRpb25zKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBuZXdSZXN1bHRzLCBuZXdCdWZmZXI7XG5cbiAgICAvLyBUaGlzIHdoaWxlIGxvb3AgaXMganVzdCB0byByZXRyeSBmYWlsdXJlcy5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgLy8gSWYgd2UndmUgYmVlbiBzdG9wcGVkLCB3ZSBkb24ndCBoYXZlIHRvIHJ1biBhbnl0aGluZyBhbnkgbW9yZS5cbiAgICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgICByZXR1cm47XG5cbiAgICAgIG5ld1Jlc3VsdHMgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgICAgIG5ld0J1ZmZlciA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuXG4gICAgICAvLyBRdWVyeSAyeCBkb2N1bWVudHMgYXMgdGhlIGhhbGYgZXhjbHVkZWQgZnJvbSB0aGUgb3JpZ2luYWwgcXVlcnkgd2lsbCBnb1xuICAgICAgLy8gaW50byB1bnB1Ymxpc2hlZCBidWZmZXIgdG8gcmVkdWNlIGFkZGl0aW9uYWwgTW9uZ28gbG9va3VwcyBpbiBjYXNlc1xuICAgICAgLy8gd2hlbiBkb2N1bWVudHMgYXJlIHJlbW92ZWQgZnJvbSB0aGUgcHVibGlzaGVkIHNldCBhbmQgbmVlZCBhXG4gICAgICAvLyByZXBsYWNlbWVudC5cbiAgICAgIC8vIFhYWCBuZWVkcyBtb3JlIHRob3VnaHQgb24gbm9uLXplcm8gc2tpcFxuICAgICAgLy8gWFhYIDIgaXMgYSBcIm1hZ2ljIG51bWJlclwiIG1lYW5pbmcgdGhlcmUgaXMgYW4gZXh0cmEgY2h1bmsgb2YgZG9jcyBmb3JcbiAgICAgIC8vIGJ1ZmZlciBpZiBzdWNoIGlzIG5lZWRlZC5cbiAgICAgIHZhciBjdXJzb3IgPSBzZWxmLl9jdXJzb3JGb3JRdWVyeSh7IGxpbWl0OiBzZWxmLl9saW1pdCAqIDIgfSk7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBjdXJzb3IuZm9yRWFjaChmdW5jdGlvbiAoZG9jLCBpKSB7ICAvLyB5aWVsZHNcbiAgICAgICAgICBpZiAoIXNlbGYuX2xpbWl0IHx8IGkgPCBzZWxmLl9saW1pdCkge1xuICAgICAgICAgICAgbmV3UmVzdWx0cy5zZXQoZG9jLl9pZCwgZG9jKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV3QnVmZmVyLnNldChkb2MuX2lkLCBkb2MpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBpZiAob3B0aW9ucy5pbml0aWFsICYmIHR5cGVvZihlLmNvZGUpID09PSAnbnVtYmVyJykge1xuICAgICAgICAgIC8vIFRoaXMgaXMgYW4gZXJyb3IgZG9jdW1lbnQgc2VudCB0byB1cyBieSBtb25nb2QsIG5vdCBhIGNvbm5lY3Rpb25cbiAgICAgICAgICAvLyBlcnJvciBnZW5lcmF0ZWQgYnkgdGhlIGNsaWVudC4gQW5kIHdlJ3ZlIG5ldmVyIHNlZW4gdGhpcyBxdWVyeSB3b3JrXG4gICAgICAgICAgLy8gc3VjY2Vzc2Z1bGx5LiBQcm9iYWJseSBpdCdzIGEgYmFkIHNlbGVjdG9yIG9yIHNvbWV0aGluZywgc28gd2VcbiAgICAgICAgICAvLyBzaG91bGQgTk9UIHJldHJ5LiBJbnN0ZWFkLCB3ZSBzaG91bGQgaGFsdCB0aGUgb2JzZXJ2ZSAod2hpY2ggZW5kc1xuICAgICAgICAgIC8vIHVwIGNhbGxpbmcgYHN0b3BgIG9uIHVzKS5cbiAgICAgICAgICBhd2FpdCBzZWxmLl9tdWx0aXBsZXhlci5xdWVyeUVycm9yKGUpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIER1cmluZyBmYWlsb3ZlciAoZWcpIGlmIHdlIGdldCBhbiBleGNlcHRpb24gd2Ugc2hvdWxkIGxvZyBhbmQgcmV0cnlcbiAgICAgICAgLy8gaW5zdGVhZCBvZiBjcmFzaGluZy5cbiAgICAgICAgTWV0ZW9yLl9kZWJ1ZyhcIkdvdCBleGNlcHRpb24gd2hpbGUgcG9sbGluZyBxdWVyeVwiLCBlKTtcbiAgICAgICAgYXdhaXQgTWV0ZW9yLl9zbGVlcEZvck1zKDEwMCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICByZXR1cm47XG5cbiAgICBzZWxmLl9wdWJsaXNoTmV3UmVzdWx0cyhuZXdSZXN1bHRzLCBuZXdCdWZmZXIpO1xuICB9LFxuXG4gIC8vIFlpZWxkcyFcbiAgX3J1blF1ZXJ5OiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHJldHVybiB0aGlzLl9ydW5RdWVyeUFzeW5jKG9wdGlvbnMpO1xuICB9LFxuXG4gIC8vIFRyYW5zaXRpb25zIHRvIFFVRVJZSU5HIGFuZCBydW5zIGFub3RoZXIgcXVlcnksIG9yIChpZiBhbHJlYWR5IGluIFFVRVJZSU5HKVxuICAvLyBlbnN1cmVzIHRoYXQgd2Ugd2lsbCBxdWVyeSBhZ2FpbiBsYXRlci5cbiAgLy9cbiAgLy8gVGhpcyBmdW5jdGlvbiBtYXkgbm90IGJsb2NrLCBiZWNhdXNlIGl0IGlzIGNhbGxlZCBmcm9tIGFuIG9wbG9nIGVudHJ5XG4gIC8vIGhhbmRsZXIuIEhvd2V2ZXIsIGlmIHdlIHdlcmUgbm90IGFscmVhZHkgaW4gdGhlIFFVRVJZSU5HIHBoYXNlLCBpdCB0aHJvd3NcbiAgLy8gYW4gZXhjZXB0aW9uIHRoYXQgaXMgY2F1Z2h0IGJ5IHRoZSBjbG9zZXN0IHN1cnJvdW5kaW5nXG4gIC8vIGZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5IGNhbGw7IHRoaXMgZW5zdXJlcyB0aGF0IHdlIGRvbid0IGNvbnRpbnVlIHJ1bm5pbmdcbiAgLy8gY2xvc2UgdGhhdCB3YXMgZGVzaWduZWQgZm9yIGFub3RoZXIgcGhhc2UgaW5zaWRlIFBIQVNFLlFVRVJZSU5HLlxuICAvL1xuICAvLyAoSXQncyBhbHNvIG5lY2Vzc2FyeSB3aGVuZXZlciBsb2dpYyBpbiB0aGlzIGZpbGUgeWllbGRzIHRvIGNoZWNrIHRoYXQgb3RoZXJcbiAgLy8gcGhhc2VzIGhhdmVuJ3QgcHV0IHVzIGludG8gUVVFUllJTkcgbW9kZSwgdGhvdWdoOyBlZyxcbiAgLy8gX2ZldGNoTW9kaWZpZWREb2N1bWVudHMgZG9lcyB0aGlzLilcbiAgX25lZWRUb1BvbGxRdWVyeTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICAvLyBJZiB3ZSdyZSBub3QgYWxyZWFkeSBpbiB0aGUgbWlkZGxlIG9mIGEgcXVlcnksIHdlIGNhbiBxdWVyeSBub3dcbiAgICAgIC8vIChwb3NzaWJseSBwYXVzaW5nIEZFVENISU5HKS5cbiAgICAgIGlmIChzZWxmLl9waGFzZSAhPT0gUEhBU0UuUVVFUllJTkcpIHtcbiAgICAgICAgc2VsZi5fcG9sbFF1ZXJ5KCk7XG4gICAgICAgIHRocm93IG5ldyBTd2l0Y2hlZFRvUXVlcnk7XG4gICAgICB9XG5cbiAgICAgIC8vIFdlJ3JlIGN1cnJlbnRseSBpbiBRVUVSWUlORy4gU2V0IGEgZmxhZyB0byBlbnN1cmUgdGhhdCB3ZSBydW4gYW5vdGhlclxuICAgICAgLy8gcXVlcnkgd2hlbiB3ZSdyZSBkb25lLlxuICAgICAgc2VsZi5fcmVxdWVyeVdoZW5Eb25lVGhpc1F1ZXJ5ID0gdHJ1ZTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBZaWVsZHMhXG4gIF9kb25lUXVlcnlpbmc6IGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHJldHVybjtcblxuICAgIGF3YWl0IHNlbGYuX21vbmdvSGFuZGxlLl9vcGxvZ0hhbmRsZS53YWl0VW50aWxDYXVnaHRVcCgpO1xuXG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICByZXR1cm47XG5cbiAgICBpZiAoc2VsZi5fcGhhc2UgIT09IFBIQVNFLlFVRVJZSU5HKVxuICAgICAgdGhyb3cgRXJyb3IoXCJQaGFzZSB1bmV4cGVjdGVkbHkgXCIgKyBzZWxmLl9waGFzZSk7XG5cbiAgICBpZiAoc2VsZi5fcmVxdWVyeVdoZW5Eb25lVGhpc1F1ZXJ5KSB7XG4gICAgICBzZWxmLl9yZXF1ZXJ5V2hlbkRvbmVUaGlzUXVlcnkgPSBmYWxzZTtcbiAgICAgIHNlbGYuX3BvbGxRdWVyeSgpO1xuICAgIH0gZWxzZSBpZiAoc2VsZi5fbmVlZFRvRmV0Y2guZW1wdHkoKSkge1xuICAgICAgYXdhaXQgc2VsZi5fYmVTdGVhZHkoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2VsZi5fZmV0Y2hNb2RpZmllZERvY3VtZW50cygpO1xuICAgIH1cbiAgfSxcblxuICBfY3Vyc29yRm9yUXVlcnk6IGZ1bmN0aW9uIChvcHRpb25zT3ZlcndyaXRlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICAvLyBUaGUgcXVlcnkgd2UgcnVuIGlzIGFsbW9zdCB0aGUgc2FtZSBhcyB0aGUgY3Vyc29yIHdlIGFyZSBvYnNlcnZpbmcsXG4gICAgICAvLyB3aXRoIGEgZmV3IGNoYW5nZXMuIFdlIG5lZWQgdG8gcmVhZCBhbGwgdGhlIGZpZWxkcyB0aGF0IGFyZSByZWxldmFudCB0b1xuICAgICAgLy8gdGhlIHNlbGVjdG9yLCBub3QganVzdCB0aGUgZmllbGRzIHdlIGFyZSBnb2luZyB0byBwdWJsaXNoICh0aGF0J3MgdGhlXG4gICAgICAvLyBcInNoYXJlZFwiIHByb2plY3Rpb24pLiBBbmQgd2UgZG9uJ3Qgd2FudCB0byBhcHBseSBhbnkgdHJhbnNmb3JtIGluIHRoZVxuICAgICAgLy8gY3Vyc29yLCBiZWNhdXNlIG9ic2VydmVDaGFuZ2VzIHNob3VsZG4ndCB1c2UgdGhlIHRyYW5zZm9ybS5cbiAgICAgIHZhciBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucyk7XG5cbiAgICAgIC8vIEFsbG93IHRoZSBjYWxsZXIgdG8gbW9kaWZ5IHRoZSBvcHRpb25zLiBVc2VmdWwgdG8gc3BlY2lmeSBkaWZmZXJlbnRcbiAgICAgIC8vIHNraXAgYW5kIGxpbWl0IHZhbHVlcy5cbiAgICAgIE9iamVjdC5hc3NpZ24ob3B0aW9ucywgb3B0aW9uc092ZXJ3cml0ZSk7XG5cbiAgICAgIG9wdGlvbnMuZmllbGRzID0gc2VsZi5fc2hhcmVkUHJvamVjdGlvbjtcbiAgICAgIGRlbGV0ZSBvcHRpb25zLnRyYW5zZm9ybTtcbiAgICAgIC8vIFdlIGFyZSBOT1QgZGVlcCBjbG9uaW5nIGZpZWxkcyBvciBzZWxlY3RvciBoZXJlLCB3aGljaCBzaG91bGQgYmUgT0suXG4gICAgICB2YXIgZGVzY3JpcHRpb24gPSBuZXcgQ3Vyc29yRGVzY3JpcHRpb24oXG4gICAgICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lLFxuICAgICAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5zZWxlY3RvcixcbiAgICAgICAgb3B0aW9ucyk7XG4gICAgICByZXR1cm4gbmV3IEN1cnNvcihzZWxmLl9tb25nb0hhbmRsZSwgZGVzY3JpcHRpb24pO1xuICAgIH0pO1xuICB9LFxuXG5cbiAgLy8gUmVwbGFjZSBzZWxmLl9wdWJsaXNoZWQgd2l0aCBuZXdSZXN1bHRzIChib3RoIGFyZSBJZE1hcHMpLCBpbnZva2luZyBvYnNlcnZlXG4gIC8vIGNhbGxiYWNrcyBvbiB0aGUgbXVsdGlwbGV4ZXIuXG4gIC8vIFJlcGxhY2Ugc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIgd2l0aCBuZXdCdWZmZXIuXG4gIC8vXG4gIC8vIFhYWCBUaGlzIGlzIHZlcnkgc2ltaWxhciB0byBMb2NhbENvbGxlY3Rpb24uX2RpZmZRdWVyeVVub3JkZXJlZENoYW5nZXMuIFdlXG4gIC8vIHNob3VsZCByZWFsbHk6IChhKSBVbmlmeSBJZE1hcCBhbmQgT3JkZXJlZERpY3QgaW50byBVbm9yZGVyZWQvT3JkZXJlZERpY3RcbiAgLy8gKGIpIFJld3JpdGUgZGlmZi5qcyB0byB1c2UgdGhlc2UgY2xhc3NlcyBpbnN0ZWFkIG9mIGFycmF5cyBhbmQgb2JqZWN0cy5cbiAgX3B1Ymxpc2hOZXdSZXN1bHRzOiBmdW5jdGlvbiAobmV3UmVzdWx0cywgbmV3QnVmZmVyKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gSWYgdGhlIHF1ZXJ5IGlzIGxpbWl0ZWQgYW5kIHRoZXJlIGlzIGEgYnVmZmVyLCBzaHV0IGRvd24gc28gaXQgZG9lc24ndFxuICAgICAgLy8gc3RheSBpbiBhIHdheS5cbiAgICAgIGlmIChzZWxmLl9saW1pdCkge1xuICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5jbGVhcigpO1xuICAgICAgfVxuXG4gICAgICAvLyBGaXJzdCByZW1vdmUgYW55dGhpbmcgdGhhdCdzIGdvbmUuIEJlIGNhcmVmdWwgbm90IHRvIG1vZGlmeVxuICAgICAgLy8gc2VsZi5fcHVibGlzaGVkIHdoaWxlIGl0ZXJhdGluZyBvdmVyIGl0LlxuICAgICAgdmFyIGlkc1RvUmVtb3ZlID0gW107XG4gICAgICBzZWxmLl9wdWJsaXNoZWQuZm9yRWFjaChmdW5jdGlvbiAoZG9jLCBpZCkge1xuICAgICAgICBpZiAoIW5ld1Jlc3VsdHMuaGFzKGlkKSlcbiAgICAgICAgICBpZHNUb1JlbW92ZS5wdXNoKGlkKTtcbiAgICAgIH0pO1xuICAgICAgaWRzVG9SZW1vdmUuZm9yRWFjaChmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgc2VsZi5fcmVtb3ZlUHVibGlzaGVkKGlkKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBOb3cgZG8gYWRkcyBhbmQgY2hhbmdlcy5cbiAgICAgIC8vIElmIHNlbGYgaGFzIGEgYnVmZmVyIGFuZCBsaW1pdCwgdGhlIG5ldyBmZXRjaGVkIHJlc3VsdCB3aWxsIGJlXG4gICAgICAvLyBsaW1pdGVkIGNvcnJlY3RseSBhcyB0aGUgcXVlcnkgaGFzIHNvcnQgc3BlY2lmaWVyLlxuICAgICAgbmV3UmVzdWx0cy5mb3JFYWNoKGZ1bmN0aW9uIChkb2MsIGlkKSB7XG4gICAgICAgIHNlbGYuX2hhbmRsZURvYyhpZCwgZG9jKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBTYW5pdHktY2hlY2sgdGhhdCBldmVyeXRoaW5nIHdlIHRyaWVkIHRvIHB1dCBpbnRvIF9wdWJsaXNoZWQgZW5kZWQgdXBcbiAgICAgIC8vIHRoZXJlLlxuICAgICAgLy8gWFhYIGlmIHRoaXMgaXMgc2xvdywgcmVtb3ZlIGl0IGxhdGVyXG4gICAgICBpZiAoc2VsZi5fcHVibGlzaGVkLnNpemUoKSAhPT0gbmV3UmVzdWx0cy5zaXplKCkpIHtcbiAgICAgICAgTWV0ZW9yLl9kZWJ1ZygnVGhlIE1vbmdvIHNlcnZlciBhbmQgdGhlIE1ldGVvciBxdWVyeSBkaXNhZ3JlZSBvbiBob3cgJyArXG4gICAgICAgICAgJ21hbnkgZG9jdW1lbnRzIG1hdGNoIHlvdXIgcXVlcnkuIEN1cnNvciBkZXNjcmlwdGlvbjogJyxcbiAgICAgICAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbik7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHNlbGYuX3B1Ymxpc2hlZC5mb3JFYWNoKGZ1bmN0aW9uIChkb2MsIGlkKSB7XG4gICAgICAgIGlmICghbmV3UmVzdWx0cy5oYXMoaWQpKVxuICAgICAgICAgIHRocm93IEVycm9yKFwiX3B1Ymxpc2hlZCBoYXMgYSBkb2MgdGhhdCBuZXdSZXN1bHRzIGRvZXNuJ3Q7IFwiICsgaWQpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIEZpbmFsbHksIHJlcGxhY2UgdGhlIGJ1ZmZlclxuICAgICAgbmV3QnVmZmVyLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaWQpIHtcbiAgICAgICAgc2VsZi5fYWRkQnVmZmVyZWQoaWQsIGRvYyk7XG4gICAgICB9KTtcblxuICAgICAgc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyID0gbmV3QnVmZmVyLnNpemUoKSA8IHNlbGYuX2xpbWl0O1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFRoaXMgc3RvcCBmdW5jdGlvbiBpcyBpbnZva2VkIGZyb20gdGhlIG9uU3RvcCBvZiB0aGUgT2JzZXJ2ZU11bHRpcGxleGVyLCBzb1xuICAvLyBpdCBzaG91bGRuJ3QgYWN0dWFsbHkgYmUgcG9zc2libGUgdG8gY2FsbCBpdCB1bnRpbCB0aGUgbXVsdGlwbGV4ZXIgaXNcbiAgLy8gcmVhZHkuXG4gIC8vXG4gIC8vIEl0J3MgaW1wb3J0YW50IHRvIGNoZWNrIHNlbGYuX3N0b3BwZWQgYWZ0ZXIgZXZlcnkgY2FsbCBpbiB0aGlzIGZpbGUgdGhhdFxuICAvLyBjYW4geWllbGQhXG4gIF9zdG9wOiBhc3luYyBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICByZXR1cm47XG4gICAgc2VsZi5fc3RvcHBlZCA9IHRydWU7XG5cbiAgICAvLyBOb3RlOiB3ZSAqZG9uJ3QqIHVzZSBtdWx0aXBsZXhlci5vbkZsdXNoIGhlcmUgYmVjYXVzZSB0aGlzIHN0b3BcbiAgICAvLyBjYWxsYmFjayBpcyBhY3R1YWxseSBpbnZva2VkIGJ5IHRoZSBtdWx0aXBsZXhlciBpdHNlbGYgd2hlbiBpdCBoYXNcbiAgICAvLyBkZXRlcm1pbmVkIHRoYXQgdGhlcmUgYXJlIG5vIGhhbmRsZXMgbGVmdC4gU28gbm90aGluZyBpcyBhY3R1YWxseSBnb2luZ1xuICAgIC8vIHRvIGdldCBmbHVzaGVkIChhbmQgaXQncyBwcm9iYWJseSBub3QgdmFsaWQgdG8gY2FsbCBtZXRob2RzIG9uIHRoZVxuICAgIC8vIGR5aW5nIG11bHRpcGxleGVyKS5cbiAgICBmb3IgKGNvbnN0IHcgb2Ygc2VsZi5fd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeSkge1xuICAgICAgYXdhaXQgdy5jb21taXR0ZWQoKTtcbiAgICB9XG4gICAgc2VsZi5fd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeSA9IG51bGw7XG5cbiAgICAvLyBQcm9hY3RpdmVseSBkcm9wIHJlZmVyZW5jZXMgdG8gcG90ZW50aWFsbHkgYmlnIHRoaW5ncy5cbiAgICBzZWxmLl9wdWJsaXNoZWQgPSBudWxsO1xuICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyID0gbnVsbDtcbiAgICBzZWxmLl9uZWVkVG9GZXRjaCA9IG51bGw7XG4gICAgc2VsZi5fY3VycmVudGx5RmV0Y2hpbmcgPSBudWxsO1xuICAgIHNlbGYuX29wbG9nRW50cnlIYW5kbGUgPSBudWxsO1xuICAgIHNlbGYuX2xpc3RlbmVyc0hhbmRsZSA9IG51bGw7XG5cbiAgICBQYWNrYWdlWydmYWN0cy1iYXNlJ10gJiYgUGFja2FnZVsnZmFjdHMtYmFzZSddLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJvYnNlcnZlLWRyaXZlcnMtb3Bsb2dcIiwgLTEpO1xuXG4gICAgZm9yIGF3YWl0IChjb25zdCBoYW5kbGUgb2Ygc2VsZi5fc3RvcEhhbmRsZXMpIHtcbiAgICAgIGF3YWl0IGhhbmRsZS5zdG9wKCk7XG4gICAgfVxuICB9LFxuICBzdG9wOiBhc3luYyBmdW5jdGlvbigpIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gYXdhaXQgc2VsZi5fc3RvcCgpO1xuICB9LFxuXG4gIF9yZWdpc3RlclBoYXNlQ2hhbmdlOiBmdW5jdGlvbiAocGhhc2UpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIG5vdyA9IG5ldyBEYXRlO1xuXG4gICAgICBpZiAoc2VsZi5fcGhhc2UpIHtcbiAgICAgICAgdmFyIHRpbWVEaWZmID0gbm93IC0gc2VsZi5fcGhhc2VTdGFydFRpbWU7XG4gICAgICAgIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXSAmJiBQYWNrYWdlWydmYWN0cy1iYXNlJ10uRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICAgICAgICBcIm1vbmdvLWxpdmVkYXRhXCIsIFwidGltZS1zcGVudC1pbi1cIiArIHNlbGYuX3BoYXNlICsgXCItcGhhc2VcIiwgdGltZURpZmYpO1xuICAgICAgfVxuXG4gICAgICBzZWxmLl9waGFzZSA9IHBoYXNlO1xuICAgICAgc2VsZi5fcGhhc2VTdGFydFRpbWUgPSBub3c7XG4gICAgfSk7XG4gIH1cbn0pO1xuXG4vLyBEb2VzIG91ciBvcGxvZyB0YWlsaW5nIGNvZGUgc3VwcG9ydCB0aGlzIGN1cnNvcj8gRm9yIG5vdywgd2UgYXJlIGJlaW5nIHZlcnlcbi8vIGNvbnNlcnZhdGl2ZSBhbmQgYWxsb3dpbmcgb25seSBzaW1wbGUgcXVlcmllcyB3aXRoIHNpbXBsZSBvcHRpb25zLlxuLy8gKFRoaXMgaXMgYSBcInN0YXRpYyBtZXRob2RcIi4pXG5PcGxvZ09ic2VydmVEcml2ZXIuY3Vyc29yU3VwcG9ydGVkID0gZnVuY3Rpb24gKGN1cnNvckRlc2NyaXB0aW9uLCBtYXRjaGVyKSB7XG4gIC8vIEZpcnN0LCBjaGVjayB0aGUgb3B0aW9ucy5cbiAgdmFyIG9wdGlvbnMgPSBjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zO1xuXG4gIC8vIERpZCB0aGUgdXNlciBzYXkgbm8gZXhwbGljaXRseT9cbiAgLy8gdW5kZXJzY29yZWQgdmVyc2lvbiBvZiB0aGUgb3B0aW9uIGlzIENPTVBBVCB3aXRoIDEuMlxuICBpZiAob3B0aW9ucy5kaXNhYmxlT3Bsb2cgfHwgb3B0aW9ucy5fZGlzYWJsZU9wbG9nKVxuICAgIHJldHVybiBmYWxzZTtcblxuICAvLyBza2lwIGlzIG5vdCBzdXBwb3J0ZWQ6IHRvIHN1cHBvcnQgaXQgd2Ugd291bGQgbmVlZCB0byBrZWVwIHRyYWNrIG9mIGFsbFxuICAvLyBcInNraXBwZWRcIiBkb2N1bWVudHMgb3IgYXQgbGVhc3QgdGhlaXIgaWRzLlxuICAvLyBsaW1pdCB3L28gYSBzb3J0IHNwZWNpZmllciBpcyBub3Qgc3VwcG9ydGVkOiBjdXJyZW50IGltcGxlbWVudGF0aW9uIG5lZWRzIGFcbiAgLy8gZGV0ZXJtaW5pc3RpYyB3YXkgdG8gb3JkZXIgZG9jdW1lbnRzLlxuICBpZiAob3B0aW9ucy5za2lwIHx8IChvcHRpb25zLmxpbWl0ICYmICFvcHRpb25zLnNvcnQpKSByZXR1cm4gZmFsc2U7XG5cbiAgLy8gSWYgYSBmaWVsZHMgcHJvamVjdGlvbiBvcHRpb24gaXMgZ2l2ZW4gY2hlY2sgaWYgaXQgaXMgc3VwcG9ydGVkIGJ5XG4gIC8vIG1pbmltb25nbyAoc29tZSBvcGVyYXRvcnMgYXJlIG5vdCBzdXBwb3J0ZWQpLlxuICBjb25zdCBmaWVsZHMgPSBvcHRpb25zLmZpZWxkcyB8fCBvcHRpb25zLnByb2plY3Rpb247XG4gIGlmIChmaWVsZHMpIHtcbiAgICB0cnkge1xuICAgICAgTG9jYWxDb2xsZWN0aW9uLl9jaGVja1N1cHBvcnRlZFByb2plY3Rpb24oZmllbGRzKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZS5uYW1lID09PSBcIk1pbmltb25nb0Vycm9yXCIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBXZSBkb24ndCBhbGxvdyB0aGUgZm9sbG93aW5nIHNlbGVjdG9yczpcbiAgLy8gICAtICR3aGVyZSAobm90IGNvbmZpZGVudCB0aGF0IHdlIHByb3ZpZGUgdGhlIHNhbWUgSlMgZW52aXJvbm1lbnRcbiAgLy8gICAgICAgICAgICAgYXMgTW9uZ28sIGFuZCBjYW4geWllbGQhKVxuICAvLyAgIC0gJG5lYXIgKGhhcyBcImludGVyZXN0aW5nXCIgcHJvcGVydGllcyBpbiBNb25nb0RCLCBsaWtlIHRoZSBwb3NzaWJpbGl0eVxuICAvLyAgICAgICAgICAgIG9mIHJldHVybmluZyBhbiBJRCBtdWx0aXBsZSB0aW1lcywgdGhvdWdoIGV2ZW4gcG9sbGluZyBtYXliZVxuICAvLyAgICAgICAgICAgIGhhdmUgYSBidWcgdGhlcmUpXG4gIC8vICAgICAgICAgICBYWFg6IG9uY2Ugd2Ugc3VwcG9ydCBpdCwgd2Ugd291bGQgbmVlZCB0byB0aGluayBtb3JlIG9uIGhvdyB3ZVxuICAvLyAgICAgICAgICAgaW5pdGlhbGl6ZSB0aGUgY29tcGFyYXRvcnMgd2hlbiB3ZSBjcmVhdGUgdGhlIGRyaXZlci5cbiAgcmV0dXJuICFtYXRjaGVyLmhhc1doZXJlKCkgJiYgIW1hdGNoZXIuaGFzR2VvUXVlcnkoKTtcbn07XG5cbnZhciBtb2RpZmllckNhbkJlRGlyZWN0bHlBcHBsaWVkID0gZnVuY3Rpb24gKG1vZGlmaWVyKSB7XG4gIHJldHVybiBPYmplY3QuZW50cmllcyhtb2RpZmllcikuZXZlcnkoZnVuY3Rpb24gKFtvcGVyYXRpb24sIGZpZWxkc10pIHtcbiAgICByZXR1cm4gT2JqZWN0LmVudHJpZXMoZmllbGRzKS5ldmVyeShmdW5jdGlvbiAoW2ZpZWxkLCB2YWx1ZV0pIHtcbiAgICAgIHJldHVybiAhL0VKU09OXFwkLy50ZXN0KGZpZWxkKTtcbiAgICB9KTtcbiAgfSk7XG59OyIsIi8qKlxuICogQ29udmVydGVyIG1vZHVsZSBmb3IgdGhlIG5ldyBNb25nb0RCIE9wbG9nIGZvcm1hdCAoPj01LjApIHRvIHRoZSBvbmUgdGhhdCBNZXRlb3JcbiAqIGhhbmRsZXMgd2VsbCwgaS5lLiwgYCRzZXRgIGFuZCBgJHVuc2V0YC4gVGhlIG5ldyBmb3JtYXQgaXMgY29tcGxldGVseSBuZXcsXG4gKiBhbmQgbG9va3MgYXMgZm9sbG93czpcbiAqXG4gKiBgYGBqc1xuICogeyAkdjogMiwgZGlmZjogRGlmZiB9XG4gKiBgYGBcbiAqXG4gKiB3aGVyZSBgRGlmZmAgaXMgYSByZWN1cnNpdmUgc3RydWN0dXJlOlxuICogYGBganNcbiAqIHtcbiAqICAgLy8gTmVzdGVkIHVwZGF0ZXMgKHNvbWV0aW1lcyBhbHNvIHJlcHJlc2VudGVkIHdpdGggYW4gcy1maWVsZCkuXG4gKiAgIC8vIEV4YW1wbGU6IGB7ICRzZXQ6IHsgJ2Zvby5iYXInOiAxIH0gfWAuXG4gKiAgIGk6IHsgPGtleT46IDx2YWx1ZT4sIC4uLiB9LFxuICpcbiAqICAgLy8gVG9wLWxldmVsIHVwZGF0ZXMuXG4gKiAgIC8vIEV4YW1wbGU6IGB7ICRzZXQ6IHsgZm9vOiB7IGJhcjogMSB9IH0gfWAuXG4gKiAgIHU6IHsgPGtleT46IDx2YWx1ZT4sIC4uLiB9LFxuICpcbiAqICAgLy8gVW5zZXRzLlxuICogICAvLyBFeGFtcGxlOiBgeyAkdW5zZXQ6IHsgZm9vOiAnJyB9IH1gLlxuICogICBkOiB7IDxrZXk+OiBmYWxzZSwgLi4uIH0sXG4gKlxuICogICAvLyBBcnJheSBvcGVyYXRpb25zLlxuICogICAvLyBFeGFtcGxlOiBgeyAkcHVzaDogeyBmb286ICdiYXInIH0gfWAuXG4gKiAgIHM8a2V5PjogeyBhOiB0cnVlLCB1PGluZGV4PjogPHZhbHVlPiwgLi4uIH0sXG4gKiAgIC4uLlxuICpcbiAqICAgLy8gTmVzdGVkIG9wZXJhdGlvbnMgKHNvbWV0aW1lcyBhbHNvIHJlcHJlc2VudGVkIGluIHRoZSBgaWAgZmllbGQpLlxuICogICAvLyBFeGFtcGxlOiBgeyAkc2V0OiB7ICdmb28uYmFyJzogMSB9IH1gLlxuICogICBzPGtleT46IERpZmYsXG4gKiAgIC4uLlxuICogfVxuICogYGBgXG4gKlxuICogKGFsbCBmaWVsZHMgYXJlIG9wdGlvbmFsKVxuICovXG5cbmltcG9ydCB7IEVKU09OIH0gZnJvbSAnbWV0ZW9yL2Vqc29uJztcblxuaW50ZXJmYWNlIE9wbG9nRW50cnkge1xuICAkdjogbnVtYmVyO1xuICBkaWZmPzogT3Bsb2dEaWZmO1xuICAkc2V0PzogUmVjb3JkPHN0cmluZywgYW55PjtcbiAgJHVuc2V0PzogUmVjb3JkPHN0cmluZywgdHJ1ZT47XG59XG5cbmludGVyZmFjZSBPcGxvZ0RpZmYge1xuICBpPzogUmVjb3JkPHN0cmluZywgYW55PjtcbiAgdT86IFJlY29yZDxzdHJpbmcsIGFueT47XG4gIGQ/OiBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPjtcbiAgW2tleTogYHMke3N0cmluZ31gXTogQXJyYXlPcGVyYXRvciB8IFJlY29yZDxzdHJpbmcsIGFueT47XG59XG5cbmludGVyZmFjZSBBcnJheU9wZXJhdG9yIHtcbiAgYTogdHJ1ZTtcbiAgW2tleTogYHUke251bWJlcn1gXTogYW55O1xufVxuXG5jb25zdCBhcnJheU9wZXJhdG9yS2V5UmVnZXggPSAvXihhfFtzdV1cXGQrKSQvO1xuXG4vKipcbiAqIENoZWNrcyBpZiBhIGZpZWxkIGlzIGFuIGFycmF5IG9wZXJhdG9yIGtleSBvZiBmb3JtICdhJyBvciAnczEnIG9yICd1MScgZXRjXG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXlPcGVyYXRvcktleShmaWVsZDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBhcnJheU9wZXJhdG9yS2V5UmVnZXgudGVzdChmaWVsZCk7XG59XG5cbi8qKlxuICogVHlwZSBndWFyZCB0byBjaGVjayBpZiBhbiBvcGVyYXRvciBpcyBhIHZhbGlkIGFycmF5IG9wZXJhdG9yLlxuICogQXJyYXkgb3BlcmF0b3JzIGhhdmUgJ2E6IHRydWUnIGFuZCBrZXlzIHRoYXQgbWF0Y2ggdGhlIGFycmF5T3BlcmF0b3JLZXlSZWdleFxuICovXG5mdW5jdGlvbiBpc0FycmF5T3BlcmF0b3Iob3BlcmF0b3I6IHVua25vd24pOiBvcGVyYXRvciBpcyBBcnJheU9wZXJhdG9yIHtcbiAgcmV0dXJuIChcbiAgICBvcGVyYXRvciAhPT0gbnVsbCAmJlxuICAgIHR5cGVvZiBvcGVyYXRvciA9PT0gJ29iamVjdCcgJiZcbiAgICAnYScgaW4gb3BlcmF0b3IgJiZcbiAgICAob3BlcmF0b3IgYXMgQXJyYXlPcGVyYXRvcikuYSA9PT0gdHJ1ZSAmJlxuICAgIE9iamVjdC5rZXlzKG9wZXJhdG9yKS5ldmVyeShpc0FycmF5T3BlcmF0b3JLZXkpXG4gICk7XG59XG5cbi8qKlxuICogSm9pbnMgdHdvIHBhcnRzIG9mIGEgZmllbGQgcGF0aCB3aXRoIGEgZG90LlxuICogUmV0dXJucyB0aGUga2V5IGl0c2VsZiBpZiBwcmVmaXggaXMgZW1wdHkuXG4gKi9cbmZ1bmN0aW9uIGpvaW4ocHJlZml4OiBzdHJpbmcsIGtleTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHByZWZpeCA/IGAke3ByZWZpeH0uJHtrZXl9YCA6IGtleTtcbn1cblxuLyoqXG4gKiBSZWN1cnNpdmVseSBmbGF0dGVucyBhbiBvYmplY3QgaW50byBhIHRhcmdldCBvYmplY3Qgd2l0aCBkb3Qgbm90YXRpb24gcGF0aHMuXG4gKiBIYW5kbGVzIHNwZWNpYWwgY2FzZXM6XG4gKiAtIEFycmF5cyBhcmUgYXNzaWduZWQgZGlyZWN0bHlcbiAqIC0gQ3VzdG9tIEVKU09OIHR5cGVzIGFyZSBwcmVzZXJ2ZWRcbiAqIC0gTW9uZ28uT2JqZWN0SURzIGFyZSBwcmVzZXJ2ZWRcbiAqIC0gUGxhaW4gb2JqZWN0cyBhcmUgcmVjdXJzaXZlbHkgZmxhdHRlbmVkXG4gKiAtIEVtcHR5IG9iamVjdHMgYXJlIGFzc2lnbmVkIGRpcmVjdGx5XG4gKi9cbmZ1bmN0aW9uIGZsYXR0ZW5PYmplY3RJbnRvKFxuICB0YXJnZXQ6IFJlY29yZDxzdHJpbmcsIGFueT4sXG4gIHNvdXJjZTogYW55LFxuICBwcmVmaXg6IHN0cmluZ1xuKTogdm9pZCB7XG4gIGlmIChcbiAgICBBcnJheS5pc0FycmF5KHNvdXJjZSkgfHxcbiAgICB0eXBlb2Ygc291cmNlICE9PSAnb2JqZWN0JyB8fFxuICAgIHNvdXJjZSA9PT0gbnVsbCB8fFxuICAgIHNvdXJjZSBpbnN0YW5jZW9mIE1vbmdvLk9iamVjdElEIHx8XG4gICAgRUpTT04uX2lzQ3VzdG9tVHlwZShzb3VyY2UpXG4gICkge1xuICAgIHRhcmdldFtwcmVmaXhdID0gc291cmNlO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGVudHJpZXMgPSBPYmplY3QuZW50cmllcyhzb3VyY2UpO1xuICBpZiAoZW50cmllcy5sZW5ndGgpIHtcbiAgICBlbnRyaWVzLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgICAgZmxhdHRlbk9iamVjdEludG8odGFyZ2V0LCB2YWx1ZSwgam9pbihwcmVmaXgsIGtleSkpO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHRhcmdldFtwcmVmaXhdID0gc291cmNlO1xuICB9XG59XG5cbi8qKlxuICogQ29udmVydHMgYW4gb3Bsb2cgZGlmZiB0byBhIHNlcmllcyBvZiAkc2V0IGFuZCAkdW5zZXQgb3BlcmF0aW9ucy5cbiAqIEhhbmRsZXMgc2V2ZXJhbCB0eXBlcyBvZiBvcGVyYXRpb25zOlxuICogLSBEaXJlY3QgdW5zZXRzIHZpYSAnZCcgZmllbGRcbiAqIC0gTmVzdGVkIHNldHMgdmlhICdpJyBmaWVsZFxuICogLSBUb3AtbGV2ZWwgc2V0cyB2aWEgJ3UnIGZpZWxkXG4gKiAtIEFycmF5IG9wZXJhdGlvbnMgYW5kIG5lc3RlZCBvYmplY3RzIHZpYSAncycgcHJlZml4ZWQgZmllbGRzXG4gKlxuICogUHJlc2VydmVzIHRoZSBzdHJ1Y3R1cmUgb2YgRUpTT04gY3VzdG9tIHR5cGVzIGFuZCBPYmplY3RJRHMgd2hpbGVcbiAqIGZsYXR0ZW5pbmcgcGF0aHMgaW50byBkb3Qgbm90YXRpb24gZm9yIE1vbmdvREIgdXBkYXRlcy5cbiAqL1xuZnVuY3Rpb24gY29udmVydE9wbG9nRGlmZihcbiAgb3Bsb2dFbnRyeTogT3Bsb2dFbnRyeSxcbiAgZGlmZjogT3Bsb2dEaWZmLFxuICBwcmVmaXggPSAnJ1xuKTogdm9pZCB7XG4gIE9iamVjdC5lbnRyaWVzKGRpZmYpLmZvckVhY2goKFtkaWZmS2V5LCB2YWx1ZV0pID0+IHtcbiAgICBpZiAoZGlmZktleSA9PT0gJ2QnKSB7XG4gICAgICAvLyBIYW5kbGUgYCR1bnNldGBzXG4gICAgICBvcGxvZ0VudHJ5LiR1bnNldCA/Pz0ge307XG4gICAgICBPYmplY3Qua2V5cyh2YWx1ZSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICBvcGxvZ0VudHJ5LiR1bnNldCFbam9pbihwcmVmaXgsIGtleSldID0gdHJ1ZTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoZGlmZktleSA9PT0gJ2knKSB7XG4gICAgICAvLyBIYW5kbGUgKHBvdGVudGlhbGx5KSBuZXN0ZWQgYCRzZXRgc1xuICAgICAgb3Bsb2dFbnRyeS4kc2V0ID8/PSB7fTtcbiAgICAgIGZsYXR0ZW5PYmplY3RJbnRvKG9wbG9nRW50cnkuJHNldCwgdmFsdWUsIHByZWZpeCk7XG4gICAgfSBlbHNlIGlmIChkaWZmS2V5ID09PSAndScpIHtcbiAgICAgIC8vIEhhbmRsZSBmbGF0IGAkc2V0YHNcbiAgICAgIG9wbG9nRW50cnkuJHNldCA/Pz0ge307XG4gICAgICBPYmplY3QuZW50cmllcyh2YWx1ZSkuZm9yRWFjaCgoW2tleSwgZmllbGRWYWx1ZV0pID0+IHtcbiAgICAgICAgb3Bsb2dFbnRyeS4kc2V0IVtqb2luKHByZWZpeCwga2V5KV0gPSBmaWVsZFZhbHVlO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChkaWZmS2V5LnN0YXJ0c1dpdGgoJ3MnKSkge1xuICAgICAgLy8gSGFuZGxlIHMtZmllbGRzIChhcnJheSBvcGVyYXRpb25zIGFuZCBuZXN0ZWQgb2JqZWN0cylcbiAgICAgIGNvbnN0IGtleSA9IGRpZmZLZXkuc2xpY2UoMSk7XG4gICAgICBpZiAoaXNBcnJheU9wZXJhdG9yKHZhbHVlKSkge1xuICAgICAgICAvLyBBcnJheSBvcGVyYXRvclxuICAgICAgICBPYmplY3QuZW50cmllcyh2YWx1ZSkuZm9yRWFjaCgoW3Bvc2l0aW9uLCBmaWVsZFZhbHVlXSkgPT4ge1xuICAgICAgICAgIGlmIChwb3NpdGlvbiA9PT0gJ2EnKSByZXR1cm47XG5cbiAgICAgICAgICBjb25zdCBwb3NpdGlvbktleSA9IGpvaW4ocHJlZml4LCBgJHtrZXl9LiR7cG9zaXRpb24uc2xpY2UoMSl9YCk7XG4gICAgICAgICAgaWYgKHBvc2l0aW9uWzBdID09PSAncycpIHtcbiAgICAgICAgICAgIGNvbnZlcnRPcGxvZ0RpZmYob3Bsb2dFbnRyeSwgZmllbGRWYWx1ZSwgcG9zaXRpb25LZXkpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZmllbGRWYWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgb3Bsb2dFbnRyeS4kdW5zZXQgPz89IHt9O1xuICAgICAgICAgICAgb3Bsb2dFbnRyeS4kdW5zZXRbcG9zaXRpb25LZXldID0gdHJ1ZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3Bsb2dFbnRyeS4kc2V0ID8/PSB7fTtcbiAgICAgICAgICAgIG9wbG9nRW50cnkuJHNldFtwb3NpdGlvbktleV0gPSBmaWVsZFZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKGtleSkge1xuICAgICAgICAvLyBOZXN0ZWQgb2JqZWN0XG4gICAgICAgIGNvbnZlcnRPcGxvZ0RpZmYob3Bsb2dFbnRyeSwgdmFsdWUsIGpvaW4ocHJlZml4LCBrZXkpKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIGEgTW9uZ29EQiB2MiBvcGxvZyBlbnRyeSB0byB2MSBmb3JtYXQuXG4gKiBSZXR1cm5zIHRoZSBvcmlnaW5hbCBlbnRyeSB1bmNoYW5nZWQgaWYgaXQncyBub3QgYSB2MiBvcGxvZyBlbnRyeVxuICogb3IgZG9lc24ndCBjb250YWluIGEgZGlmZiBmaWVsZC5cbiAqXG4gKiBUaGUgY29udmVydGVkIGVudHJ5IHdpbGwgY29udGFpbiAkc2V0IGFuZCAkdW5zZXQgb3BlcmF0aW9ucyB0aGF0IGFyZVxuICogZXF1aXZhbGVudCB0byB0aGUgdjIgZGlmZiBmb3JtYXQsIHdpdGggcGF0aHMgZmxhdHRlbmVkIHRvIGRvdCBub3RhdGlvblxuICogYW5kIHNwZWNpYWwgaGFuZGxpbmcgZm9yIEVKU09OIGN1c3RvbSB0eXBlcyBhbmQgT2JqZWN0SURzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gb3Bsb2dWMlYxQ29udmVydGVyKG9wbG9nRW50cnk6IE9wbG9nRW50cnkpOiBPcGxvZ0VudHJ5IHtcbiAgaWYgKG9wbG9nRW50cnkuJHYgIT09IDIgfHwgIW9wbG9nRW50cnkuZGlmZikge1xuICAgIHJldHVybiBvcGxvZ0VudHJ5O1xuICB9XG5cbiAgY29uc3QgY29udmVydGVkT3Bsb2dFbnRyeTogT3Bsb2dFbnRyeSA9IHsgJHY6IDIgfTtcbiAgY29udmVydE9wbG9nRGlmZihjb252ZXJ0ZWRPcGxvZ0VudHJ5LCBvcGxvZ0VudHJ5LmRpZmYpO1xuICByZXR1cm4gY29udmVydGVkT3Bsb2dFbnRyeTtcbn0iLCJpbnRlcmZhY2UgQ3Vyc29yT3B0aW9ucyB7XG4gIGxpbWl0PzogbnVtYmVyO1xuICBza2lwPzogbnVtYmVyO1xuICBzb3J0PzogUmVjb3JkPHN0cmluZywgMSB8IC0xPjtcbiAgZmllbGRzPzogUmVjb3JkPHN0cmluZywgMSB8IDA+O1xuICBwcm9qZWN0aW9uPzogUmVjb3JkPHN0cmluZywgMSB8IDA+O1xuICBkaXNhYmxlT3Bsb2c/OiBib29sZWFuO1xuICBfZGlzYWJsZU9wbG9nPzogYm9vbGVhbjtcbiAgdGFpbGFibGU/OiBib29sZWFuO1xuICB0cmFuc2Zvcm0/OiAoZG9jOiBhbnkpID0+IGFueTtcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBhcmd1bWVudHMgdXNlZCB0byBjb25zdHJ1Y3QgYSBjdXJzb3IuXG4gKiBVc2VkIGFzIGEga2V5IGZvciBjdXJzb3IgZGUtZHVwbGljYXRpb24uXG4gKlxuICogQWxsIHByb3BlcnRpZXMgbXVzdCBiZSBlaXRoZXI6XG4gKiAtIEpTT04tc3RyaW5naWZpYWJsZSwgb3JcbiAqIC0gTm90IGFmZmVjdCBvYnNlcnZlQ2hhbmdlcyBvdXRwdXQgKGUuZy4sIG9wdGlvbnMudHJhbnNmb3JtIGZ1bmN0aW9ucylcbiAqL1xuZXhwb3J0IGNsYXNzIEN1cnNvckRlc2NyaXB0aW9uIHtcbiAgY29sbGVjdGlvbk5hbWU6IHN0cmluZztcbiAgc2VsZWN0b3I6IFJlY29yZDxzdHJpbmcsIGFueT47XG4gIG9wdGlvbnM6IEN1cnNvck9wdGlvbnM7XG5cbiAgY29uc3RydWN0b3IoY29sbGVjdGlvbk5hbWU6IHN0cmluZywgc2VsZWN0b3I6IGFueSwgb3B0aW9ucz86IEN1cnNvck9wdGlvbnMpIHtcbiAgICB0aGlzLmNvbGxlY3Rpb25OYW1lID0gY29sbGVjdGlvbk5hbWU7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHRoaXMuc2VsZWN0b3IgPSBNb25nby5Db2xsZWN0aW9uLl9yZXdyaXRlU2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIH1cbn0iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IENMSUVOVF9PTkxZX01FVEhPRFMsIGdldEFzeW5jTWV0aG9kTmFtZSB9IGZyb20gJ21ldGVvci9taW5pbW9uZ28vY29uc3RhbnRzJztcbmltcG9ydCB7IE1pbmlNb25nb1F1ZXJ5RXJyb3IgfSBmcm9tICdtZXRlb3IvbWluaW1vbmdvL2NvbW1vbic7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IEFzeW5jaHJvbm91c0N1cnNvciB9IGZyb20gJy4vYXN5bmNocm9ub3VzX2N1cnNvcic7XG5pbXBvcnQgeyBDdXJzb3IgfSBmcm9tICcuL2N1cnNvcic7XG5pbXBvcnQgeyBDdXJzb3JEZXNjcmlwdGlvbiB9IGZyb20gJy4vY3Vyc29yX2Rlc2NyaXB0aW9uJztcbmltcG9ydCB7IERvY0ZldGNoZXIgfSBmcm9tICcuL2RvY19mZXRjaGVyJztcbmltcG9ydCB7IE1vbmdvREIsIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvLCByZXBsYWNlVHlwZXMsIHRyYW5zZm9ybVJlc3VsdCB9IGZyb20gJy4vbW9uZ29fY29tbW9uJztcbmltcG9ydCB7IE9ic2VydmVIYW5kbGUgfSBmcm9tICcuL29ic2VydmVfaGFuZGxlJztcbmltcG9ydCB7IE9ic2VydmVNdWx0aXBsZXhlciB9IGZyb20gJy4vb2JzZXJ2ZV9tdWx0aXBsZXgnO1xuaW1wb3J0IHsgT3Bsb2dPYnNlcnZlRHJpdmVyIH0gZnJvbSAnLi9vcGxvZ19vYnNlcnZlX2RyaXZlcic7XG5pbXBvcnQgeyBPUExPR19DT0xMRUNUSU9OLCBPcGxvZ0hhbmRsZSB9IGZyb20gJy4vb3Bsb2dfdGFpbGluZyc7XG5pbXBvcnQgeyBQb2xsaW5nT2JzZXJ2ZURyaXZlciB9IGZyb20gJy4vcG9sbGluZ19vYnNlcnZlX2RyaXZlcic7XG5cbmNvbnN0IEZJTEVfQVNTRVRfU1VGRklYID0gJ0Fzc2V0JztcbmNvbnN0IEFTU0VUU19GT0xERVIgPSAnYXNzZXRzJztcbmNvbnN0IEFQUF9GT0xERVIgPSAnYXBwJztcblxuY29uc3Qgb3Bsb2dDb2xsZWN0aW9uV2FybmluZ3MgPSBbXTtcblxuZXhwb3J0IGNvbnN0IE1vbmdvQ29ubmVjdGlvbiA9IGZ1bmN0aW9uICh1cmwsIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgc2VsZi5fb2JzZXJ2ZU11bHRpcGxleGVycyA9IHt9O1xuICBzZWxmLl9vbkZhaWxvdmVySG9vayA9IG5ldyBIb29rO1xuXG4gIGNvbnN0IHVzZXJPcHRpb25zID0ge1xuICAgIC4uLihNb25nby5fY29ubmVjdGlvbk9wdGlvbnMgfHwge30pLFxuICAgIC4uLihNZXRlb3Iuc2V0dGluZ3M/LnBhY2thZ2VzPy5tb25nbz8ub3B0aW9ucyB8fCB7fSlcbiAgfTtcblxuICB2YXIgbW9uZ29PcHRpb25zID0gT2JqZWN0LmFzc2lnbih7XG4gICAgaWdub3JlVW5kZWZpbmVkOiB0cnVlLFxuICB9LCB1c2VyT3B0aW9ucyk7XG5cblxuXG4gIC8vIEludGVybmFsbHkgdGhlIG9wbG9nIGNvbm5lY3Rpb25zIHNwZWNpZnkgdGhlaXIgb3duIG1heFBvb2xTaXplXG4gIC8vIHdoaWNoIHdlIGRvbid0IHdhbnQgdG8gb3ZlcndyaXRlIHdpdGggYW55IHVzZXIgZGVmaW5lZCB2YWx1ZVxuICBpZiAoJ21heFBvb2xTaXplJyBpbiBvcHRpb25zKSB7XG4gICAgLy8gSWYgd2UganVzdCBzZXQgdGhpcyBmb3IgXCJzZXJ2ZXJcIiwgcmVwbFNldCB3aWxsIG92ZXJyaWRlIGl0LiBJZiB3ZSBqdXN0XG4gICAgLy8gc2V0IGl0IGZvciByZXBsU2V0LCBpdCB3aWxsIGJlIGlnbm9yZWQgaWYgd2UncmUgbm90IHVzaW5nIGEgcmVwbFNldC5cbiAgICBtb25nb09wdGlvbnMubWF4UG9vbFNpemUgPSBvcHRpb25zLm1heFBvb2xTaXplO1xuICB9XG4gIGlmICgnbWluUG9vbFNpemUnIGluIG9wdGlvbnMpIHtcbiAgICBtb25nb09wdGlvbnMubWluUG9vbFNpemUgPSBvcHRpb25zLm1pblBvb2xTaXplO1xuICB9XG5cbiAgLy8gVHJhbnNmb3JtIG9wdGlvbnMgbGlrZSBcInRsc0NBRmlsZUFzc2V0XCI6IFwiZmlsZW5hbWUucGVtXCIgaW50b1xuICAvLyBcInRsc0NBRmlsZVwiOiBcIi88ZnVsbHBhdGg+L2ZpbGVuYW1lLnBlbVwiXG4gIE9iamVjdC5lbnRyaWVzKG1vbmdvT3B0aW9ucyB8fCB7fSlcbiAgICAuZmlsdGVyKChba2V5XSkgPT4ga2V5ICYmIGtleS5lbmRzV2l0aChGSUxFX0FTU0VUX1NVRkZJWCkpXG4gICAgLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgICAgY29uc3Qgb3B0aW9uTmFtZSA9IGtleS5yZXBsYWNlKEZJTEVfQVNTRVRfU1VGRklYLCAnJyk7XG4gICAgICBtb25nb09wdGlvbnNbb3B0aW9uTmFtZV0gPSBwYXRoLmpvaW4oQXNzZXRzLmdldFNlcnZlckRpcigpLFxuICAgICAgICBBU1NFVFNfRk9MREVSLCBBUFBfRk9MREVSLCB2YWx1ZSk7XG4gICAgICBkZWxldGUgbW9uZ29PcHRpb25zW2tleV07XG4gICAgfSk7XG5cbiAgc2VsZi5kYiA9IG51bGw7XG4gIHNlbGYuX29wbG9nSGFuZGxlID0gbnVsbDtcbiAgc2VsZi5fZG9jRmV0Y2hlciA9IG51bGw7XG5cbiAgbW9uZ29PcHRpb25zLmRyaXZlckluZm8gPSB7XG4gICAgbmFtZTogJ01ldGVvcicsXG4gICAgdmVyc2lvbjogTWV0ZW9yLnJlbGVhc2VcbiAgfVxuXG4gIHNlbGYuY2xpZW50ID0gbmV3IE1vbmdvREIuTW9uZ29DbGllbnQodXJsLCBtb25nb09wdGlvbnMpO1xuICBzZWxmLmRiID0gc2VsZi5jbGllbnQuZGIoKTtcblxuICBzZWxmLmNsaWVudC5vbignc2VydmVyRGVzY3JpcHRpb25DaGFuZ2VkJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChldmVudCA9PiB7XG4gICAgLy8gV2hlbiB0aGUgY29ubmVjdGlvbiBpcyBubyBsb25nZXIgYWdhaW5zdCB0aGUgcHJpbWFyeSBub2RlLCBleGVjdXRlIGFsbFxuICAgIC8vIGZhaWxvdmVyIGhvb2tzLiBUaGlzIGlzIGltcG9ydGFudCBmb3IgdGhlIGRyaXZlciBhcyBpdCBoYXMgdG8gcmUtcG9vbCB0aGVcbiAgICAvLyBxdWVyeSB3aGVuIGl0IGhhcHBlbnMuXG4gICAgaWYgKFxuICAgICAgZXZlbnQucHJldmlvdXNEZXNjcmlwdGlvbi50eXBlICE9PSAnUlNQcmltYXJ5JyAmJlxuICAgICAgZXZlbnQubmV3RGVzY3JpcHRpb24udHlwZSA9PT0gJ1JTUHJpbWFyeSdcbiAgICApIHtcbiAgICAgIHNlbGYuX29uRmFpbG92ZXJIb29rLmVhY2goY2FsbGJhY2sgPT4ge1xuICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSkpO1xuXG4gIGlmIChvcHRpb25zLm9wbG9nVXJsICYmICEgUGFja2FnZVsnZGlzYWJsZS1vcGxvZyddKSB7XG4gICAgc2VsZi5fb3Bsb2dIYW5kbGUgPSBuZXcgT3Bsb2dIYW5kbGUob3B0aW9ucy5vcGxvZ1VybCwgc2VsZi5kYi5kYXRhYmFzZU5hbWUpO1xuICAgIHNlbGYuX2RvY0ZldGNoZXIgPSBuZXcgRG9jRmV0Y2hlcihzZWxmKTtcbiAgfVxuXG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9jbG9zZSA9IGFzeW5jIGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKCEgc2VsZi5kYilcbiAgICB0aHJvdyBFcnJvcihcImNsb3NlIGNhbGxlZCBiZWZvcmUgQ29ubmVjdGlvbiBjcmVhdGVkP1wiKTtcblxuICAvLyBYWFggcHJvYmFibHkgdW50ZXN0ZWRcbiAgdmFyIG9wbG9nSGFuZGxlID0gc2VsZi5fb3Bsb2dIYW5kbGU7XG4gIHNlbGYuX29wbG9nSGFuZGxlID0gbnVsbDtcbiAgaWYgKG9wbG9nSGFuZGxlKVxuICAgIGF3YWl0IG9wbG9nSGFuZGxlLnN0b3AoKTtcblxuICAvLyBVc2UgRnV0dXJlLndyYXAgc28gdGhhdCBlcnJvcnMgZ2V0IHRocm93bi4gVGhpcyBoYXBwZW5zIHRvXG4gIC8vIHdvcmsgZXZlbiBvdXRzaWRlIGEgZmliZXIgc2luY2UgdGhlICdjbG9zZScgbWV0aG9kIGlzIG5vdFxuICAvLyBhY3R1YWxseSBhc3luY2hyb25vdXMuXG4gIGF3YWl0IHNlbGYuY2xpZW50LmNsb3NlKCk7XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5fY2xvc2UoKTtcbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX3NldE9wbG9nSGFuZGxlID0gZnVuY3Rpb24ob3Bsb2dIYW5kbGUpIHtcbiAgdGhpcy5fb3Bsb2dIYW5kbGUgPSBvcGxvZ0hhbmRsZTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBSZXR1cm5zIHRoZSBNb25nbyBDb2xsZWN0aW9uIG9iamVjdDsgbWF5IHlpZWxkLlxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5yYXdDb2xsZWN0aW9uID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAoISBzZWxmLmRiKVxuICAgIHRocm93IEVycm9yKFwicmF3Q29sbGVjdGlvbiBjYWxsZWQgYmVmb3JlIENvbm5lY3Rpb24gY3JlYXRlZD9cIik7XG5cbiAgcmV0dXJuIHNlbGYuZGIuY29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLmNyZWF0ZUNhcHBlZENvbGxlY3Rpb25Bc3luYyA9IGFzeW5jIGZ1bmN0aW9uIChcbiAgY29sbGVjdGlvbk5hbWUsIGJ5dGVTaXplLCBtYXhEb2N1bWVudHMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICghIHNlbGYuZGIpXG4gICAgdGhyb3cgRXJyb3IoXCJjcmVhdGVDYXBwZWRDb2xsZWN0aW9uQXN5bmMgY2FsbGVkIGJlZm9yZSBDb25uZWN0aW9uIGNyZWF0ZWQ/XCIpO1xuXG5cbiAgYXdhaXQgc2VsZi5kYi5jcmVhdGVDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lLFxuICAgIHsgY2FwcGVkOiB0cnVlLCBzaXplOiBieXRlU2l6ZSwgbWF4OiBtYXhEb2N1bWVudHMgfSk7XG59O1xuXG4vLyBUaGlzIHNob3VsZCBiZSBjYWxsZWQgc3luY2hyb25vdXNseSB3aXRoIGEgd3JpdGUsIHRvIGNyZWF0ZSBhXG4vLyB0cmFuc2FjdGlvbiBvbiB0aGUgY3VycmVudCB3cml0ZSBmZW5jZSwgaWYgYW55LiBBZnRlciB3ZSBjYW4gcmVhZFxuLy8gdGhlIHdyaXRlLCBhbmQgYWZ0ZXIgb2JzZXJ2ZXJzIGhhdmUgYmVlbiBub3RpZmllZCAob3IgYXQgbGVhc3QsXG4vLyBhZnRlciB0aGUgb2JzZXJ2ZXIgbm90aWZpZXJzIGhhdmUgYWRkZWQgdGhlbXNlbHZlcyB0byB0aGUgd3JpdGVcbi8vIGZlbmNlKSwgeW91IHNob3VsZCBjYWxsICdjb21taXR0ZWQoKScgb24gdGhlIG9iamVjdCByZXR1cm5lZC5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX21heWJlQmVnaW5Xcml0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgY29uc3QgZmVuY2UgPSBERFBTZXJ2ZXIuX2dldEN1cnJlbnRGZW5jZSgpO1xuICBpZiAoZmVuY2UpIHtcbiAgICByZXR1cm4gZmVuY2UuYmVnaW5Xcml0ZSgpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB7Y29tbWl0dGVkOiBmdW5jdGlvbiAoKSB7fX07XG4gIH1cbn07XG5cbi8vIEludGVybmFsIGludGVyZmFjZTogYWRkcyBhIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB3aGVuIHRoZSBNb25nbyBwcmltYXJ5XG4vLyBjaGFuZ2VzLiBSZXR1cm5zIGEgc3RvcCBoYW5kbGUuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9vbkZhaWxvdmVyID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gIHJldHVybiB0aGlzLl9vbkZhaWxvdmVySG9vay5yZWdpc3RlcihjYWxsYmFjayk7XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLmluc2VydEFzeW5jID0gYXN5bmMgZnVuY3Rpb24gKGNvbGxlY3Rpb25fbmFtZSwgZG9jdW1lbnQpIHtcbiAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKGNvbGxlY3Rpb25fbmFtZSA9PT0gXCJfX19tZXRlb3JfZmFpbHVyZV90ZXN0X2NvbGxlY3Rpb25cIikge1xuICAgIGNvbnN0IGUgPSBuZXcgRXJyb3IoXCJGYWlsdXJlIHRlc3RcIik7XG4gICAgZS5fZXhwZWN0ZWRCeVRlc3QgPSB0cnVlO1xuICAgIHRocm93IGU7XG4gIH1cblxuICBpZiAoIShMb2NhbENvbGxlY3Rpb24uX2lzUGxhaW5PYmplY3QoZG9jdW1lbnQpICYmXG4gICAgIUVKU09OLl9pc0N1c3RvbVR5cGUoZG9jdW1lbnQpKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk9ubHkgcGxhaW4gb2JqZWN0cyBtYXkgYmUgaW5zZXJ0ZWQgaW50byBNb25nb0RCXCIpO1xuICB9XG5cbiAgdmFyIHdyaXRlID0gc2VsZi5fbWF5YmVCZWdpbldyaXRlKCk7XG4gIHZhciByZWZyZXNoID0gYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgIGF3YWl0IE1ldGVvci5yZWZyZXNoKHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9uX25hbWUsIGlkOiBkb2N1bWVudC5faWQgfSk7XG4gIH07XG4gIHJldHVybiBzZWxmLnJhd0NvbGxlY3Rpb24oY29sbGVjdGlvbl9uYW1lKS5pbnNlcnRPbmUoXG4gICAgcmVwbGFjZVR5cGVzKGRvY3VtZW50LCByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyksXG4gICAge1xuICAgICAgc2FmZTogdHJ1ZSxcbiAgICB9XG4gICkudGhlbihhc3luYyAoe2luc2VydGVkSWR9KSA9PiB7XG4gICAgYXdhaXQgcmVmcmVzaCgpO1xuICAgIGF3YWl0IHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgIHJldHVybiBpbnNlcnRlZElkO1xuICB9KS5jYXRjaChhc3luYyBlID0+IHtcbiAgICBhd2FpdCB3cml0ZS5jb21taXR0ZWQoKTtcbiAgICB0aHJvdyBlO1xuICB9KTtcbn07XG5cblxuLy8gQ2F1c2UgcXVlcmllcyB0aGF0IG1heSBiZSBhZmZlY3RlZCBieSB0aGUgc2VsZWN0b3IgdG8gcG9sbCBpbiB0aGlzIHdyaXRlXG4vLyBmZW5jZS5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX3JlZnJlc2ggPSBhc3luYyBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIHNlbGVjdG9yKSB7XG4gIHZhciByZWZyZXNoS2V5ID0ge2NvbGxlY3Rpb246IGNvbGxlY3Rpb25OYW1lfTtcbiAgLy8gSWYgd2Uga25vdyB3aGljaCBkb2N1bWVudHMgd2UncmUgcmVtb3ZpbmcsIGRvbid0IHBvbGwgcXVlcmllcyB0aGF0IGFyZVxuICAvLyBzcGVjaWZpYyB0byBvdGhlciBkb2N1bWVudHMuIChOb3RlIHRoYXQgbXVsdGlwbGUgbm90aWZpY2F0aW9ucyBoZXJlIHNob3VsZFxuICAvLyBub3QgY2F1c2UgbXVsdGlwbGUgcG9sbHMsIHNpbmNlIGFsbCBvdXIgbGlzdGVuZXIgaXMgZG9pbmcgaXMgZW5xdWV1ZWluZyBhXG4gIC8vIHBvbGwuKVxuICB2YXIgc3BlY2lmaWNJZHMgPSBMb2NhbENvbGxlY3Rpb24uX2lkc01hdGNoZWRCeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgaWYgKHNwZWNpZmljSWRzKSB7XG4gICAgZm9yIChjb25zdCBpZCBvZiBzcGVjaWZpY0lkcykge1xuICAgICAgYXdhaXQgTWV0ZW9yLnJlZnJlc2goT2JqZWN0LmFzc2lnbih7aWQ6IGlkfSwgcmVmcmVzaEtleSkpO1xuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgYXdhaXQgTWV0ZW9yLnJlZnJlc2gocmVmcmVzaEtleSk7XG4gIH1cbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUucmVtb3ZlQXN5bmMgPSBhc3luYyBmdW5jdGlvbiAoY29sbGVjdGlvbl9uYW1lLCBzZWxlY3Rvcikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKGNvbGxlY3Rpb25fbmFtZSA9PT0gXCJfX19tZXRlb3JfZmFpbHVyZV90ZXN0X2NvbGxlY3Rpb25cIikge1xuICAgIHZhciBlID0gbmV3IEVycm9yKFwiRmFpbHVyZSB0ZXN0XCIpO1xuICAgIGUuX2V4cGVjdGVkQnlUZXN0ID0gdHJ1ZTtcbiAgICB0aHJvdyBlO1xuICB9XG5cbiAgdmFyIHdyaXRlID0gc2VsZi5fbWF5YmVCZWdpbldyaXRlKCk7XG4gIHZhciByZWZyZXNoID0gYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgIGF3YWl0IHNlbGYuX3JlZnJlc2goY29sbGVjdGlvbl9uYW1lLCBzZWxlY3Rvcik7XG4gIH07XG5cbiAgcmV0dXJuIHNlbGYucmF3Q29sbGVjdGlvbihjb2xsZWN0aW9uX25hbWUpXG4gICAgLmRlbGV0ZU1hbnkocmVwbGFjZVR5cGVzKHNlbGVjdG9yLCByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyksIHtcbiAgICAgIHNhZmU6IHRydWUsXG4gICAgfSlcbiAgICAudGhlbihhc3luYyAoeyBkZWxldGVkQ291bnQgfSkgPT4ge1xuICAgICAgYXdhaXQgcmVmcmVzaCgpO1xuICAgICAgYXdhaXQgd3JpdGUuY29tbWl0dGVkKCk7XG4gICAgICByZXR1cm4gdHJhbnNmb3JtUmVzdWx0KHsgcmVzdWx0IDoge21vZGlmaWVkQ291bnQgOiBkZWxldGVkQ291bnR9IH0pLm51bWJlckFmZmVjdGVkO1xuICAgIH0pLmNhdGNoKGFzeW5jIChlcnIpID0+IHtcbiAgICAgIGF3YWl0IHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH0pO1xufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5kcm9wQ29sbGVjdGlvbkFzeW5jID0gYXN5bmMgZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG5cbiAgdmFyIHdyaXRlID0gc2VsZi5fbWF5YmVCZWdpbldyaXRlKCk7XG4gIHZhciByZWZyZXNoID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIE1ldGVvci5yZWZyZXNoKHtcbiAgICAgIGNvbGxlY3Rpb246IGNvbGxlY3Rpb25OYW1lLFxuICAgICAgaWQ6IG51bGwsXG4gICAgICBkcm9wQ29sbGVjdGlvbjogdHJ1ZSxcbiAgICB9KTtcbiAgfTtcblxuICByZXR1cm4gc2VsZlxuICAgIC5yYXdDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKVxuICAgIC5kcm9wKClcbiAgICAudGhlbihhc3luYyByZXN1bHQgPT4ge1xuICAgICAgYXdhaXQgcmVmcmVzaCgpO1xuICAgICAgYXdhaXQgd3JpdGUuY29tbWl0dGVkKCk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0pXG4gICAgLmNhdGNoKGFzeW5jIGUgPT4ge1xuICAgICAgYXdhaXQgd3JpdGUuY29tbWl0dGVkKCk7XG4gICAgICB0aHJvdyBlO1xuICAgIH0pO1xufTtcblxuLy8gRm9yIHRlc3Rpbmcgb25seS4gIFNsaWdodGx5IGJldHRlciB0aGFuIGBjLnJhd0RhdGFiYXNlKCkuZHJvcERhdGFiYXNlKClgXG4vLyBiZWNhdXNlIGl0IGxldHMgdGhlIHRlc3QncyBmZW5jZSB3YWl0IGZvciBpdCB0byBiZSBjb21wbGV0ZS5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuZHJvcERhdGFiYXNlQXN5bmMgPSBhc3luYyBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICB2YXIgd3JpdGUgPSBzZWxmLl9tYXliZUJlZ2luV3JpdGUoKTtcbiAgdmFyIHJlZnJlc2ggPSBhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgYXdhaXQgTWV0ZW9yLnJlZnJlc2goeyBkcm9wRGF0YWJhc2U6IHRydWUgfSk7XG4gIH07XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBzZWxmLmRiLl9kcm9wRGF0YWJhc2UoKTtcbiAgICBhd2FpdCByZWZyZXNoKCk7XG4gICAgYXdhaXQgd3JpdGUuY29tbWl0dGVkKCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBhd2FpdCB3cml0ZS5jb21taXR0ZWQoKTtcbiAgICB0aHJvdyBlO1xuICB9XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLnVwZGF0ZUFzeW5jID0gYXN5bmMgZnVuY3Rpb24gKGNvbGxlY3Rpb25fbmFtZSwgc2VsZWN0b3IsIG1vZCwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKGNvbGxlY3Rpb25fbmFtZSA9PT0gXCJfX19tZXRlb3JfZmFpbHVyZV90ZXN0X2NvbGxlY3Rpb25cIikge1xuICAgIHZhciBlID0gbmV3IEVycm9yKFwiRmFpbHVyZSB0ZXN0XCIpO1xuICAgIGUuX2V4cGVjdGVkQnlUZXN0ID0gdHJ1ZTtcbiAgICB0aHJvdyBlO1xuICB9XG5cbiAgLy8gZXhwbGljaXQgc2FmZXR5IGNoZWNrLiBudWxsIGFuZCB1bmRlZmluZWQgY2FuIGNyYXNoIHRoZSBtb25nb1xuICAvLyBkcml2ZXIuIEFsdGhvdWdoIHRoZSBub2RlIGRyaXZlciBhbmQgbWluaW1vbmdvIGRvICdzdXBwb3J0J1xuICAvLyBub24tb2JqZWN0IG1vZGlmaWVyIGluIHRoYXQgdGhleSBkb24ndCBjcmFzaCwgdGhleSBhcmUgbm90XG4gIC8vIG1lYW5pbmdmdWwgb3BlcmF0aW9ucyBhbmQgZG8gbm90IGRvIGFueXRoaW5nLiBEZWZlbnNpdmVseSB0aHJvdyBhblxuICAvLyBlcnJvciBoZXJlLlxuICBpZiAoIW1vZCB8fCB0eXBlb2YgbW9kICE9PSAnb2JqZWN0Jykge1xuICAgIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKFwiSW52YWxpZCBtb2RpZmllci4gTW9kaWZpZXIgbXVzdCBiZSBhbiBvYmplY3QuXCIpO1xuXG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cblxuICBpZiAoIShMb2NhbENvbGxlY3Rpb24uX2lzUGxhaW5PYmplY3QobW9kKSAmJiAhRUpTT04uX2lzQ3VzdG9tVHlwZShtb2QpKSkge1xuICAgIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKFxuICAgICAgXCJPbmx5IHBsYWluIG9iamVjdHMgbWF5IGJlIHVzZWQgYXMgcmVwbGFjZW1lbnRcIiArXG4gICAgICBcIiBkb2N1bWVudHMgaW4gTW9uZ29EQlwiKTtcblxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgaWYgKCFvcHRpb25zKSBvcHRpb25zID0ge307XG5cbiAgdmFyIHdyaXRlID0gc2VsZi5fbWF5YmVCZWdpbldyaXRlKCk7XG4gIHZhciByZWZyZXNoID0gYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgIGF3YWl0IHNlbGYuX3JlZnJlc2goY29sbGVjdGlvbl9uYW1lLCBzZWxlY3Rvcik7XG4gIH07XG5cbiAgdmFyIGNvbGxlY3Rpb24gPSBzZWxmLnJhd0NvbGxlY3Rpb24oY29sbGVjdGlvbl9uYW1lKTtcbiAgdmFyIG1vbmdvT3B0cyA9IHtzYWZlOiB0cnVlfTtcbiAgLy8gQWRkIHN1cHBvcnQgZm9yIGZpbHRlcmVkIHBvc2l0aW9uYWwgb3BlcmF0b3JcbiAgaWYgKG9wdGlvbnMuYXJyYXlGaWx0ZXJzICE9PSB1bmRlZmluZWQpIG1vbmdvT3B0cy5hcnJheUZpbHRlcnMgPSBvcHRpb25zLmFycmF5RmlsdGVycztcbiAgLy8gZXhwbGljdGx5IGVudW1lcmF0ZSBvcHRpb25zIHRoYXQgbWluaW1vbmdvIHN1cHBvcnRzXG4gIGlmIChvcHRpb25zLnVwc2VydCkgbW9uZ29PcHRzLnVwc2VydCA9IHRydWU7XG4gIGlmIChvcHRpb25zLm11bHRpKSBtb25nb09wdHMubXVsdGkgPSB0cnVlO1xuICAvLyBMZXRzIHlvdSBnZXQgYSBtb3JlIG1vcmUgZnVsbCByZXN1bHQgZnJvbSBNb25nb0RCLiBVc2Ugd2l0aCBjYXV0aW9uOlxuICAvLyBtaWdodCBub3Qgd29yayB3aXRoIEMudXBzZXJ0IChhcyBvcHBvc2VkIHRvIEMudXBkYXRlKHt1cHNlcnQ6dHJ1ZX0pIG9yXG4gIC8vIHdpdGggc2ltdWxhdGVkIHVwc2VydC5cbiAgaWYgKG9wdGlvbnMuZnVsbFJlc3VsdCkgbW9uZ29PcHRzLmZ1bGxSZXN1bHQgPSB0cnVlO1xuXG4gIHZhciBtb25nb1NlbGVjdG9yID0gcmVwbGFjZVR5cGVzKHNlbGVjdG9yLCByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyk7XG4gIHZhciBtb25nb01vZCA9IHJlcGxhY2VUeXBlcyhtb2QsIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvKTtcblxuICB2YXIgaXNNb2RpZnkgPSBMb2NhbENvbGxlY3Rpb24uX2lzTW9kaWZpY2F0aW9uTW9kKG1vbmdvTW9kKTtcblxuICBpZiAob3B0aW9ucy5fZm9yYmlkUmVwbGFjZSAmJiAhaXNNb2RpZnkpIHtcbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKFwiSW52YWxpZCBtb2RpZmllci4gUmVwbGFjZW1lbnRzIGFyZSBmb3JiaWRkZW4uXCIpO1xuICAgIHRocm93IGVycjtcbiAgfVxuXG4gIC8vIFdlJ3ZlIGFscmVhZHkgcnVuIHJlcGxhY2VUeXBlcy9yZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyBvblxuICAvLyBzZWxlY3RvciBhbmQgbW9kLiAgV2UgYXNzdW1lIGl0IGRvZXNuJ3QgbWF0dGVyLCBhcyBmYXIgYXNcbiAgLy8gdGhlIGJlaGF2aW9yIG9mIG1vZGlmaWVycyBpcyBjb25jZXJuZWQsIHdoZXRoZXIgYF9tb2RpZnlgXG4gIC8vIGlzIHJ1biBvbiBFSlNPTiBvciBvbiBtb25nby1jb252ZXJ0ZWQgRUpTT04uXG5cbiAgLy8gUnVuIHRoaXMgY29kZSB1cCBmcm9udCBzbyB0aGF0IGl0IGZhaWxzIGZhc3QgaWYgc29tZW9uZSB1c2VzXG4gIC8vIGEgTW9uZ28gdXBkYXRlIG9wZXJhdG9yIHdlIGRvbid0IHN1cHBvcnQuXG4gIGxldCBrbm93bklkO1xuICBpZiAob3B0aW9ucy51cHNlcnQpIHtcbiAgICB0cnkge1xuICAgICAgbGV0IG5ld0RvYyA9IExvY2FsQ29sbGVjdGlvbi5fY3JlYXRlVXBzZXJ0RG9jdW1lbnQoc2VsZWN0b3IsIG1vZCk7XG4gICAgICBrbm93bklkID0gbmV3RG9jLl9pZDtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gIH1cbiAgaWYgKG9wdGlvbnMudXBzZXJ0ICYmXG4gICAgISBpc01vZGlmeSAmJlxuICAgICEga25vd25JZCAmJlxuICAgIG9wdGlvbnMuaW5zZXJ0ZWRJZCAmJlxuICAgICEgKG9wdGlvbnMuaW5zZXJ0ZWRJZCBpbnN0YW5jZW9mIE1vbmdvLk9iamVjdElEICYmXG4gICAgICBvcHRpb25zLmdlbmVyYXRlZElkKSkge1xuICAgIC8vIEluIGNhc2Ugb2YgYW4gdXBzZXJ0IHdpdGggYSByZXBsYWNlbWVudCwgd2hlcmUgdGhlcmUgaXMgbm8gX2lkIGRlZmluZWRcbiAgICAvLyBpbiBlaXRoZXIgdGhlIHF1ZXJ5IG9yIHRoZSByZXBsYWNlbWVudCBkb2MsIG1vbmdvIHdpbGwgZ2VuZXJhdGUgYW4gaWQgaXRzZWxmLlxuICAgIC8vIFRoZXJlZm9yZSB3ZSBuZWVkIHRoaXMgc3BlY2lhbCBzdHJhdGVneSBpZiB3ZSB3YW50IHRvIGNvbnRyb2wgdGhlIGlkIG91cnNlbHZlcy5cblxuICAgIC8vIFdlIGRvbid0IG5lZWQgdG8gZG8gdGhpcyB3aGVuOlxuICAgIC8vIC0gVGhpcyBpcyBub3QgYSByZXBsYWNlbWVudCwgc28gd2UgY2FuIGFkZCBhbiBfaWQgdG8gJHNldE9uSW5zZXJ0XG4gICAgLy8gLSBUaGUgaWQgaXMgZGVmaW5lZCBieSBxdWVyeSBvciBtb2Qgd2UgY2FuIGp1c3QgYWRkIGl0IHRvIHRoZSByZXBsYWNlbWVudCBkb2NcbiAgICAvLyAtIFRoZSB1c2VyIGRpZCBub3Qgc3BlY2lmeSBhbnkgaWQgcHJlZmVyZW5jZSBhbmQgdGhlIGlkIGlzIGEgTW9uZ28gT2JqZWN0SWQsXG4gICAgLy8gICAgIHRoZW4gd2UgY2FuIGp1c3QgbGV0IE1vbmdvIGdlbmVyYXRlIHRoZSBpZFxuICAgIHJldHVybiBhd2FpdCBzaW11bGF0ZVVwc2VydFdpdGhJbnNlcnRlZElkKGNvbGxlY3Rpb24sIG1vbmdvU2VsZWN0b3IsIG1vbmdvTW9kLCBvcHRpb25zKVxuICAgICAgLnRoZW4oYXN5bmMgcmVzdWx0ID0+IHtcbiAgICAgICAgYXdhaXQgcmVmcmVzaCgpO1xuICAgICAgICBhd2FpdCB3cml0ZS5jb21taXR0ZWQoKTtcbiAgICAgICAgaWYgKHJlc3VsdCAmJiAhIG9wdGlvbnMuX3JldHVybk9iamVjdCkge1xuICAgICAgICAgIHJldHVybiByZXN1bHQubnVtYmVyQWZmZWN0ZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKG9wdGlvbnMudXBzZXJ0ICYmICFrbm93bklkICYmIG9wdGlvbnMuaW5zZXJ0ZWRJZCAmJiBpc01vZGlmeSkge1xuICAgICAgaWYgKCFtb25nb01vZC5oYXNPd25Qcm9wZXJ0eSgnJHNldE9uSW5zZXJ0JykpIHtcbiAgICAgICAgbW9uZ29Nb2QuJHNldE9uSW5zZXJ0ID0ge307XG4gICAgICB9XG4gICAgICBrbm93bklkID0gb3B0aW9ucy5pbnNlcnRlZElkO1xuICAgICAgT2JqZWN0LmFzc2lnbihtb25nb01vZC4kc2V0T25JbnNlcnQsIHJlcGxhY2VUeXBlcyh7X2lkOiBvcHRpb25zLmluc2VydGVkSWR9LCByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbykpO1xuICAgIH1cblxuICAgIGNvbnN0IHN0cmluZ3MgPSBPYmplY3Qua2V5cyhtb25nb01vZCkuZmlsdGVyKChrZXkpID0+ICFrZXkuc3RhcnRzV2l0aChcIiRcIikpO1xuICAgIGxldCB1cGRhdGVNZXRob2QgPSBzdHJpbmdzLmxlbmd0aCA+IDAgPyAncmVwbGFjZU9uZScgOiAndXBkYXRlTWFueSc7XG4gICAgdXBkYXRlTWV0aG9kID1cbiAgICAgIHVwZGF0ZU1ldGhvZCA9PT0gJ3VwZGF0ZU1hbnknICYmICFtb25nb09wdHMubXVsdGlcbiAgICAgICAgPyAndXBkYXRlT25lJ1xuICAgICAgICA6IHVwZGF0ZU1ldGhvZDtcbiAgICByZXR1cm4gY29sbGVjdGlvblt1cGRhdGVNZXRob2RdXG4gICAgICAuYmluZChjb2xsZWN0aW9uKShtb25nb1NlbGVjdG9yLCBtb25nb01vZCwgbW9uZ29PcHRzKVxuICAgICAgLnRoZW4oYXN5bmMgcmVzdWx0ID0+IHtcbiAgICAgICAgdmFyIG1ldGVvclJlc3VsdCA9IHRyYW5zZm9ybVJlc3VsdCh7cmVzdWx0fSk7XG4gICAgICAgIGlmIChtZXRlb3JSZXN1bHQgJiYgb3B0aW9ucy5fcmV0dXJuT2JqZWN0KSB7XG4gICAgICAgICAgLy8gSWYgdGhpcyB3YXMgYW4gdXBzZXJ0QXN5bmMoKSBjYWxsLCBhbmQgd2UgZW5kZWQgdXBcbiAgICAgICAgICAvLyBpbnNlcnRpbmcgYSBuZXcgZG9jIGFuZCB3ZSBrbm93IGl0cyBpZCwgdGhlblxuICAgICAgICAgIC8vIHJldHVybiB0aGF0IGlkIGFzIHdlbGwuXG4gICAgICAgICAgaWYgKG9wdGlvbnMudXBzZXJ0ICYmIG1ldGVvclJlc3VsdC5pbnNlcnRlZElkKSB7XG4gICAgICAgICAgICBpZiAoa25vd25JZCkge1xuICAgICAgICAgICAgICBtZXRlb3JSZXN1bHQuaW5zZXJ0ZWRJZCA9IGtub3duSWQ7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1ldGVvclJlc3VsdC5pbnNlcnRlZElkIGluc3RhbmNlb2YgTW9uZ29EQi5PYmplY3RJZCkge1xuICAgICAgICAgICAgICBtZXRlb3JSZXN1bHQuaW5zZXJ0ZWRJZCA9IG5ldyBNb25nby5PYmplY3RJRChtZXRlb3JSZXN1bHQuaW5zZXJ0ZWRJZC50b0hleFN0cmluZygpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYXdhaXQgcmVmcmVzaCgpO1xuICAgICAgICAgIGF3YWl0IHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgICAgICAgIHJldHVybiBtZXRlb3JSZXN1bHQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgcmVmcmVzaCgpO1xuICAgICAgICAgIGF3YWl0IHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgICAgICAgIHJldHVybiBtZXRlb3JSZXN1bHQubnVtYmVyQWZmZWN0ZWQ7XG4gICAgICAgIH1cbiAgICAgIH0pLmNhdGNoKGFzeW5jIChlcnIpID0+IHtcbiAgICAgICAgYXdhaXQgd3JpdGUuY29tbWl0dGVkKCk7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH0pO1xuICB9XG59O1xuXG4vLyBleHBvc2VkIGZvciB0ZXN0aW5nXG5Nb25nb0Nvbm5lY3Rpb24uX2lzQ2Fubm90Q2hhbmdlSWRFcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcblxuICAvLyBNb25nbyAzLjIuKiByZXR1cm5zIGVycm9yIGFzIG5leHQgT2JqZWN0OlxuICAvLyB7bmFtZTogU3RyaW5nLCBjb2RlOiBOdW1iZXIsIGVycm1zZzogU3RyaW5nfVxuICAvLyBPbGRlciBNb25nbyByZXR1cm5zOlxuICAvLyB7bmFtZTogU3RyaW5nLCBjb2RlOiBOdW1iZXIsIGVycjogU3RyaW5nfVxuICB2YXIgZXJyb3IgPSBlcnIuZXJybXNnIHx8IGVyci5lcnI7XG5cbiAgLy8gV2UgZG9uJ3QgdXNlIHRoZSBlcnJvciBjb2RlIGhlcmVcbiAgLy8gYmVjYXVzZSB0aGUgZXJyb3IgY29kZSB3ZSBvYnNlcnZlZCBpdCBwcm9kdWNpbmcgKDE2ODM3KSBhcHBlYXJzIHRvIGJlXG4gIC8vIGEgZmFyIG1vcmUgZ2VuZXJpYyBlcnJvciBjb2RlIGJhc2VkIG9uIGV4YW1pbmluZyB0aGUgc291cmNlLlxuICBpZiAoZXJyb3IuaW5kZXhPZignVGhlIF9pZCBmaWVsZCBjYW5ub3QgYmUgY2hhbmdlZCcpID09PSAwXG4gICAgfHwgZXJyb3IuaW5kZXhPZihcInRoZSAoaW1tdXRhYmxlKSBmaWVsZCAnX2lkJyB3YXMgZm91bmQgdG8gaGF2ZSBiZWVuIGFsdGVyZWQgdG8gX2lkXCIpICE9PSAtMSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuLy8gWFhYIE1vbmdvQ29ubmVjdGlvbi51cHNlcnRBc3luYygpIGRvZXMgbm90IHJldHVybiB0aGUgaWQgb2YgdGhlIGluc2VydGVkIGRvY3VtZW50XG4vLyB1bmxlc3MgeW91IHNldCBpdCBleHBsaWNpdGx5IGluIHRoZSBzZWxlY3RvciBvciBtb2RpZmllciAoYXMgYSByZXBsYWNlbWVudFxuLy8gZG9jKS5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUudXBzZXJ0QXN5bmMgPSBhc3luYyBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIHNlbGVjdG9yLCBtb2QsIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG5cblxuICBpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIiAmJiAhIGNhbGxiYWNrKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuXG4gIHJldHVybiBzZWxmLnVwZGF0ZUFzeW5jKGNvbGxlY3Rpb25OYW1lLCBzZWxlY3RvciwgbW9kLFxuICAgIE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHtcbiAgICAgIHVwc2VydDogdHJ1ZSxcbiAgICAgIF9yZXR1cm5PYmplY3Q6IHRydWVcbiAgICB9KSk7XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLmZpbmQgPSBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIHNlbGVjdG9yLCBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSlcbiAgICBzZWxlY3RvciA9IHt9O1xuXG4gIHJldHVybiBuZXcgQ3Vyc29yKFxuICAgIHNlbGYsIG5ldyBDdXJzb3JEZXNjcmlwdGlvbihjb2xsZWN0aW9uTmFtZSwgc2VsZWN0b3IsIG9wdGlvbnMpKTtcbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuZmluZE9uZUFzeW5jID0gYXN5bmMgZnVuY3Rpb24gKGNvbGxlY3Rpb25fbmFtZSwgc2VsZWN0b3IsIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgIHNlbGVjdG9yID0ge307XG4gIH1cblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgb3B0aW9ucy5saW1pdCA9IDE7XG5cbiAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IHNlbGYuZmluZChjb2xsZWN0aW9uX25hbWUsIHNlbGVjdG9yLCBvcHRpb25zKS5mZXRjaCgpO1xuXG4gIHJldHVybiByZXN1bHRzWzBdO1xufTtcblxuLy8gV2UnbGwgYWN0dWFsbHkgZGVzaWduIGFuIGluZGV4IEFQSSBsYXRlci4gRm9yIG5vdywgd2UganVzdCBwYXNzIHRocm91Z2ggdG9cbi8vIE1vbmdvJ3MsIGJ1dCBtYWtlIGl0IHN5bmNocm9ub3VzLlxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5jcmVhdGVJbmRleEFzeW5jID0gYXN5bmMgZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBpbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICAvLyBXZSBleHBlY3QgdGhpcyBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgc3RhcnR1cCwgbm90IGZyb20gd2l0aGluIGEgbWV0aG9kLFxuICAvLyBzbyB3ZSBkb24ndCBpbnRlcmFjdCB3aXRoIHRoZSB3cml0ZSBmZW5jZS5cbiAgdmFyIGNvbGxlY3Rpb24gPSBzZWxmLnJhd0NvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xuICBhd2FpdCBjb2xsZWN0aW9uLmNyZWF0ZUluZGV4KGluZGV4LCBvcHRpb25zKTtcbn07XG5cbi8vIGp1c3QgdG8gYmUgY29uc2lzdGVudCB3aXRoIHRoZSBvdGhlciBtZXRob2RzXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLmNyZWF0ZUluZGV4ID1cbiAgTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5jcmVhdGVJbmRleEFzeW5jO1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLmNvdW50RG9jdW1lbnRzID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCAuLi5hcmdzKSB7XG4gIGFyZ3MgPSBhcmdzLm1hcChhcmcgPT4gcmVwbGFjZVR5cGVzKGFyZywgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28pKTtcbiAgY29uc3QgY29sbGVjdGlvbiA9IHRoaXMucmF3Q29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG4gIHJldHVybiBjb2xsZWN0aW9uLmNvdW50RG9jdW1lbnRzKC4uLmFyZ3MpO1xufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5lc3RpbWF0ZWREb2N1bWVudENvdW50ID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCAuLi5hcmdzKSB7XG4gIGFyZ3MgPSBhcmdzLm1hcChhcmcgPT4gcmVwbGFjZVR5cGVzKGFyZywgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28pKTtcbiAgY29uc3QgY29sbGVjdGlvbiA9IHRoaXMucmF3Q29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG4gIHJldHVybiBjb2xsZWN0aW9uLmVzdGltYXRlZERvY3VtZW50Q291bnQoLi4uYXJncyk7XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLmVuc3VyZUluZGV4QXN5bmMgPSBNb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLmNyZWF0ZUluZGV4QXN5bmM7XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuZHJvcEluZGV4QXN5bmMgPSBhc3luYyBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIGluZGV4KSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuXG4gIC8vIFRoaXMgZnVuY3Rpb24gaXMgb25seSB1c2VkIGJ5IHRlc3QgY29kZSwgbm90IHdpdGhpbiBhIG1ldGhvZCwgc28gd2UgZG9uJ3RcbiAgLy8gaW50ZXJhY3Qgd2l0aCB0aGUgd3JpdGUgZmVuY2UuXG4gIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcbiAgdmFyIGluZGV4TmFtZSA9ICBhd2FpdCBjb2xsZWN0aW9uLmRyb3BJbmRleChpbmRleCk7XG59O1xuXG5cbkNMSUVOVF9PTkxZX01FVEhPRFMuZm9yRWFjaChmdW5jdGlvbiAobSkge1xuICBNb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlW21dID0gZnVuY3Rpb24gKCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGAke219ICsgIGlzIG5vdCBhdmFpbGFibGUgb24gdGhlIHNlcnZlci4gUGxlYXNlIHVzZSAke2dldEFzeW5jTWV0aG9kTmFtZShcbiAgICAgICAgbVxuICAgICAgKX0oKSBpbnN0ZWFkLmBcbiAgICApO1xuICB9O1xufSk7XG5cblxudmFyIE5VTV9PUFRJTUlTVElDX1RSSUVTID0gMztcblxuXG5cbnZhciBzaW11bGF0ZVVwc2VydFdpdGhJbnNlcnRlZElkID0gYXN5bmMgZnVuY3Rpb24gKGNvbGxlY3Rpb24sIHNlbGVjdG9yLCBtb2QsIG9wdGlvbnMpIHtcbiAgLy8gU1RSQVRFR1k6IEZpcnN0IHRyeSBkb2luZyBhbiB1cHNlcnQgd2l0aCBhIGdlbmVyYXRlZCBJRC5cbiAgLy8gSWYgdGhpcyB0aHJvd3MgYW4gZXJyb3IgYWJvdXQgY2hhbmdpbmcgdGhlIElEIG9uIGFuIGV4aXN0aW5nIGRvY3VtZW50XG4gIC8vIHRoZW4gd2l0aG91dCBhZmZlY3RpbmcgdGhlIGRhdGFiYXNlLCB3ZSBrbm93IHdlIHNob3VsZCBwcm9iYWJseSB0cnlcbiAgLy8gYW4gdXBkYXRlIHdpdGhvdXQgdGhlIGdlbmVyYXRlZCBJRC4gSWYgaXQgYWZmZWN0ZWQgMCBkb2N1bWVudHMsXG4gIC8vIHRoZW4gd2l0aG91dCBhZmZlY3RpbmcgdGhlIGRhdGFiYXNlLCB3ZSB0aGUgZG9jdW1lbnQgdGhhdCBmaXJzdFxuICAvLyBnYXZlIHRoZSBlcnJvciBpcyBwcm9iYWJseSByZW1vdmVkIGFuZCB3ZSBuZWVkIHRvIHRyeSBhbiBpbnNlcnQgYWdhaW5cbiAgLy8gV2UgZ28gYmFjayB0byBzdGVwIG9uZSBhbmQgcmVwZWF0LlxuICAvLyBMaWtlIGFsbCBcIm9wdGltaXN0aWMgd3JpdGVcIiBzY2hlbWVzLCB3ZSByZWx5IG9uIHRoZSBmYWN0IHRoYXQgaXQnc1xuICAvLyB1bmxpa2VseSBvdXIgd3JpdGVzIHdpbGwgY29udGludWUgdG8gYmUgaW50ZXJmZXJlZCB3aXRoIHVuZGVyIG5vcm1hbFxuICAvLyBjaXJjdW1zdGFuY2VzICh0aG91Z2ggc3VmZmljaWVudGx5IGhlYXZ5IGNvbnRlbnRpb24gd2l0aCB3cml0ZXJzXG4gIC8vIGRpc2FncmVlaW5nIG9uIHRoZSBleGlzdGVuY2Ugb2YgYW4gb2JqZWN0IHdpbGwgY2F1c2Ugd3JpdGVzIHRvIGZhaWxcbiAgLy8gaW4gdGhlb3J5KS5cblxuICB2YXIgaW5zZXJ0ZWRJZCA9IG9wdGlvbnMuaW5zZXJ0ZWRJZDsgLy8gbXVzdCBleGlzdFxuICB2YXIgbW9uZ29PcHRzRm9yVXBkYXRlID0ge1xuICAgIHNhZmU6IHRydWUsXG4gICAgbXVsdGk6IG9wdGlvbnMubXVsdGlcbiAgfTtcbiAgdmFyIG1vbmdvT3B0c0Zvckluc2VydCA9IHtcbiAgICBzYWZlOiB0cnVlLFxuICAgIHVwc2VydDogdHJ1ZVxuICB9O1xuXG4gIHZhciByZXBsYWNlbWVudFdpdGhJZCA9IE9iamVjdC5hc3NpZ24oXG4gICAgcmVwbGFjZVR5cGVzKHtfaWQ6IGluc2VydGVkSWR9LCByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyksXG4gICAgbW9kKTtcblxuICB2YXIgdHJpZXMgPSBOVU1fT1BUSU1JU1RJQ19UUklFUztcblxuICB2YXIgZG9VcGRhdGUgPSBhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgdHJpZXMtLTtcbiAgICBpZiAoISB0cmllcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVXBzZXJ0IGZhaWxlZCBhZnRlciBcIiArIE5VTV9PUFRJTUlTVElDX1RSSUVTICsgXCIgdHJpZXMuXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgbWV0aG9kID0gY29sbGVjdGlvbi51cGRhdGVNYW55O1xuICAgICAgaWYoIU9iamVjdC5rZXlzKG1vZCkuc29tZShrZXkgPT4ga2V5LnN0YXJ0c1dpdGgoXCIkXCIpKSl7XG4gICAgICAgIG1ldGhvZCA9IGNvbGxlY3Rpb24ucmVwbGFjZU9uZS5iaW5kKGNvbGxlY3Rpb24pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1ldGhvZChcbiAgICAgICAgc2VsZWN0b3IsXG4gICAgICAgIG1vZCxcbiAgICAgICAgbW9uZ29PcHRzRm9yVXBkYXRlKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgIGlmIChyZXN1bHQgJiYgKHJlc3VsdC5tb2RpZmllZENvdW50IHx8IHJlc3VsdC51cHNlcnRlZENvdW50KSkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBudW1iZXJBZmZlY3RlZDogcmVzdWx0Lm1vZGlmaWVkQ291bnQgfHwgcmVzdWx0LnVwc2VydGVkQ291bnQsXG4gICAgICAgICAgICBpbnNlcnRlZElkOiByZXN1bHQudXBzZXJ0ZWRJZCB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZG9Db25kaXRpb25hbEluc2VydCgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIGRvQ29uZGl0aW9uYWxJbnNlcnQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gY29sbGVjdGlvbi5yZXBsYWNlT25lKHNlbGVjdG9yLCByZXBsYWNlbWVudFdpdGhJZCwgbW9uZ29PcHRzRm9ySW5zZXJ0KVxuICAgICAgLnRoZW4ocmVzdWx0ID0+ICh7XG4gICAgICAgIG51bWJlckFmZmVjdGVkOiByZXN1bHQudXBzZXJ0ZWRDb3VudCxcbiAgICAgICAgaW5zZXJ0ZWRJZDogcmVzdWx0LnVwc2VydGVkSWQsXG4gICAgICB9KSkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgaWYgKE1vbmdvQ29ubmVjdGlvbi5faXNDYW5ub3RDaGFuZ2VJZEVycm9yKGVycikpIHtcbiAgICAgICAgICByZXR1cm4gZG9VcGRhdGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gIH07XG4gIHJldHVybiBkb1VwZGF0ZSgpO1xufTtcblxuLy8gb2JzZXJ2ZUNoYW5nZXMgZm9yIHRhaWxhYmxlIGN1cnNvcnMgb24gY2FwcGVkIGNvbGxlY3Rpb25zLlxuLy9cbi8vIFNvbWUgZGlmZmVyZW5jZXMgZnJvbSBub3JtYWwgY3Vyc29yczpcbi8vICAgLSBXaWxsIG5ldmVyIHByb2R1Y2UgYW55dGhpbmcgb3RoZXIgdGhhbiAnYWRkZWQnIG9yICdhZGRlZEJlZm9yZScuIElmIHlvdVxuLy8gICAgIGRvIHVwZGF0ZSBhIGRvY3VtZW50IHRoYXQgaGFzIGFscmVhZHkgYmVlbiBwcm9kdWNlZCwgdGhpcyB3aWxsIG5vdCBub3RpY2Vcbi8vICAgICBpdC5cbi8vICAgLSBJZiB5b3UgZGlzY29ubmVjdCBhbmQgcmVjb25uZWN0IGZyb20gTW9uZ28sIGl0IHdpbGwgZXNzZW50aWFsbHkgcmVzdGFydFxuLy8gICAgIHRoZSBxdWVyeSwgd2hpY2ggd2lsbCBsZWFkIHRvIGR1cGxpY2F0ZSByZXN1bHRzLiBUaGlzIGlzIHByZXR0eSBiYWQsXG4vLyAgICAgYnV0IGlmIHlvdSBpbmNsdWRlIGEgZmllbGQgY2FsbGVkICd0cycgd2hpY2ggaXMgaW5zZXJ0ZWQgYXNcbi8vICAgICBuZXcgTW9uZ29JbnRlcm5hbHMuTW9uZ29UaW1lc3RhbXAoMCwgMCkgKHdoaWNoIGlzIGluaXRpYWxpemVkIHRvIHRoZVxuLy8gICAgIGN1cnJlbnQgTW9uZ28tc3R5bGUgdGltZXN0YW1wKSwgd2UnbGwgYmUgYWJsZSB0byBmaW5kIHRoZSBwbGFjZSB0b1xuLy8gICAgIHJlc3RhcnQgcHJvcGVybHkuIChUaGlzIGZpZWxkIGlzIHNwZWNpZmljYWxseSB1bmRlcnN0b29kIGJ5IE1vbmdvIHdpdGggYW5cbi8vICAgICBvcHRpbWl6YXRpb24gd2hpY2ggYWxsb3dzIGl0IHRvIGZpbmQgdGhlIHJpZ2h0IHBsYWNlIHRvIHN0YXJ0IHdpdGhvdXRcbi8vICAgICBhbiBpbmRleCBvbiB0cy4gSXQncyBob3cgdGhlIG9wbG9nIHdvcmtzLilcbi8vICAgLSBObyBjYWxsYmFja3MgYXJlIHRyaWdnZXJlZCBzeW5jaHJvbm91c2x5IHdpdGggdGhlIGNhbGwgKHRoZXJlJ3Mgbm9cbi8vICAgICBkaWZmZXJlbnRpYXRpb24gYmV0d2VlbiBcImluaXRpYWwgZGF0YVwiIGFuZCBcImxhdGVyIGNoYW5nZXNcIjsgZXZlcnl0aGluZ1xuLy8gICAgIHRoYXQgbWF0Y2hlcyB0aGUgcXVlcnkgZ2V0cyBzZW50IGFzeW5jaHJvbm91c2x5KS5cbi8vICAgLSBEZS1kdXBsaWNhdGlvbiBpcyBub3QgaW1wbGVtZW50ZWQuXG4vLyAgIC0gRG9lcyBub3QgeWV0IGludGVyYWN0IHdpdGggdGhlIHdyaXRlIGZlbmNlLiBQcm9iYWJseSwgdGhpcyBzaG91bGQgd29yayBieVxuLy8gICAgIGlnbm9yaW5nIHJlbW92ZXMgKHdoaWNoIGRvbid0IHdvcmsgb24gY2FwcGVkIGNvbGxlY3Rpb25zKSBhbmQgdXBkYXRlc1xuLy8gICAgICh3aGljaCBkb24ndCBhZmZlY3QgdGFpbGFibGUgY3Vyc29ycyksIGFuZCBqdXN0IGtlZXBpbmcgdHJhY2sgb2YgdGhlIElEXG4vLyAgICAgb2YgdGhlIGluc2VydGVkIG9iamVjdCwgYW5kIGNsb3NpbmcgdGhlIHdyaXRlIGZlbmNlIG9uY2UgeW91IGdldCB0byB0aGF0XG4vLyAgICAgSUQgKG9yIHRpbWVzdGFtcD8pLiAgVGhpcyBkb2Vzbid0IHdvcmsgd2VsbCBpZiB0aGUgZG9jdW1lbnQgZG9lc24ndCBtYXRjaFxuLy8gICAgIHRoZSBxdWVyeSwgdGhvdWdoLiAgT24gdGhlIG90aGVyIGhhbmQsIHRoZSB3cml0ZSBmZW5jZSBjYW4gY2xvc2Vcbi8vICAgICBpbW1lZGlhdGVseSBpZiBpdCBkb2VzIG5vdCBtYXRjaCB0aGUgcXVlcnkuIFNvIGlmIHdlIHRydXN0IG1pbmltb25nb1xuLy8gICAgIGVub3VnaCB0byBhY2N1cmF0ZWx5IGV2YWx1YXRlIHRoZSBxdWVyeSBhZ2FpbnN0IHRoZSB3cml0ZSBmZW5jZSwgd2Vcbi8vICAgICBzaG91bGQgYmUgYWJsZSB0byBkbyB0aGlzLi4uICBPZiBjb3Vyc2UsIG1pbmltb25nbyBkb2Vzbid0IGV2ZW4gc3VwcG9ydFxuLy8gICAgIE1vbmdvIFRpbWVzdGFtcHMgeWV0LlxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fb2JzZXJ2ZUNoYW5nZXNUYWlsYWJsZSA9IGZ1bmN0aW9uIChcbiAgY3Vyc29yRGVzY3JpcHRpb24sIG9yZGVyZWQsIGNhbGxiYWNrcykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgLy8gVGFpbGFibGUgY3Vyc29ycyBvbmx5IGV2ZXIgY2FsbCBhZGRlZC9hZGRlZEJlZm9yZSBjYWxsYmFja3MsIHNvIGl0J3MgYW5cbiAgLy8gZXJyb3IgaWYgeW91IGRpZG4ndCBwcm92aWRlIHRoZW0uXG4gIGlmICgob3JkZXJlZCAmJiAhY2FsbGJhY2tzLmFkZGVkQmVmb3JlKSB8fFxuICAgICghb3JkZXJlZCAmJiAhY2FsbGJhY2tzLmFkZGVkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IG9ic2VydmUgYW4gXCIgKyAob3JkZXJlZCA/IFwib3JkZXJlZFwiIDogXCJ1bm9yZGVyZWRcIilcbiAgICAgICsgXCIgdGFpbGFibGUgY3Vyc29yIHdpdGhvdXQgYSBcIlxuICAgICAgKyAob3JkZXJlZCA/IFwiYWRkZWRCZWZvcmVcIiA6IFwiYWRkZWRcIikgKyBcIiBjYWxsYmFja1wiKTtcbiAgfVxuXG4gIHJldHVybiBzZWxmLnRhaWwoY3Vyc29yRGVzY3JpcHRpb24sIGZ1bmN0aW9uIChkb2MpIHtcbiAgICB2YXIgaWQgPSBkb2MuX2lkO1xuICAgIGRlbGV0ZSBkb2MuX2lkO1xuICAgIC8vIFRoZSB0cyBpcyBhbiBpbXBsZW1lbnRhdGlvbiBkZXRhaWwuIEhpZGUgaXQuXG4gICAgZGVsZXRlIGRvYy50cztcbiAgICBpZiAob3JkZXJlZCkge1xuICAgICAgY2FsbGJhY2tzLmFkZGVkQmVmb3JlKGlkLCBkb2MsIG51bGwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYWxsYmFja3MuYWRkZWQoaWQsIGRvYyk7XG4gICAgfVxuICB9KTtcbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX2NyZWF0ZUFzeW5jaHJvbm91c0N1cnNvciA9IGZ1bmN0aW9uKFxuICBjdXJzb3JEZXNjcmlwdGlvbiwgb3B0aW9ucyA9IHt9KSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgY29uc3QgeyBzZWxmRm9ySXRlcmF0aW9uLCB1c2VUcmFuc2Zvcm0gfSA9IG9wdGlvbnM7XG4gIG9wdGlvbnMgPSB7IHNlbGZGb3JJdGVyYXRpb24sIHVzZVRyYW5zZm9ybSB9O1xuXG4gIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGN1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lKTtcbiAgdmFyIGN1cnNvck9wdGlvbnMgPSBjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zO1xuICB2YXIgbW9uZ29PcHRpb25zID0ge1xuICAgIHNvcnQ6IGN1cnNvck9wdGlvbnMuc29ydCxcbiAgICBsaW1pdDogY3Vyc29yT3B0aW9ucy5saW1pdCxcbiAgICBza2lwOiBjdXJzb3JPcHRpb25zLnNraXAsXG4gICAgcHJvamVjdGlvbjogY3Vyc29yT3B0aW9ucy5maWVsZHMgfHwgY3Vyc29yT3B0aW9ucy5wcm9qZWN0aW9uLFxuICAgIHJlYWRQcmVmZXJlbmNlOiBjdXJzb3JPcHRpb25zLnJlYWRQcmVmZXJlbmNlLFxuICB9O1xuXG4gIC8vIERvIHdlIHdhbnQgYSB0YWlsYWJsZSBjdXJzb3IgKHdoaWNoIG9ubHkgd29ya3Mgb24gY2FwcGVkIGNvbGxlY3Rpb25zKT9cbiAgaWYgKGN1cnNvck9wdGlvbnMudGFpbGFibGUpIHtcbiAgICBtb25nb09wdGlvbnMubnVtYmVyT2ZSZXRyaWVzID0gLTE7XG4gIH1cblxuICB2YXIgZGJDdXJzb3IgPSBjb2xsZWN0aW9uLmZpbmQoXG4gICAgcmVwbGFjZVR5cGVzKGN1cnNvckRlc2NyaXB0aW9uLnNlbGVjdG9yLCByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyksXG4gICAgbW9uZ29PcHRpb25zKTtcblxuICAvLyBEbyB3ZSB3YW50IGEgdGFpbGFibGUgY3Vyc29yICh3aGljaCBvbmx5IHdvcmtzIG9uIGNhcHBlZCBjb2xsZWN0aW9ucyk/XG4gIGlmIChjdXJzb3JPcHRpb25zLnRhaWxhYmxlKSB7XG4gICAgLy8gV2Ugd2FudCBhIHRhaWxhYmxlIGN1cnNvci4uLlxuICAgIGRiQ3Vyc29yLmFkZEN1cnNvckZsYWcoXCJ0YWlsYWJsZVwiLCB0cnVlKVxuICAgIC8vIC4uLiBhbmQgZm9yIHRoZSBzZXJ2ZXIgdG8gd2FpdCBhIGJpdCBpZiBhbnkgZ2V0TW9yZSBoYXMgbm8gZGF0YSAocmF0aGVyXG4gICAgLy8gdGhhbiBtYWtpbmcgdXMgcHV0IHRoZSByZWxldmFudCBzbGVlcHMgaW4gdGhlIGNsaWVudCkuLi5cbiAgICBkYkN1cnNvci5hZGRDdXJzb3JGbGFnKFwiYXdhaXREYXRhXCIsIHRydWUpXG5cbiAgICAvLyBBbmQgaWYgdGhpcyBpcyBvbiB0aGUgb3Bsb2cgY29sbGVjdGlvbiBhbmQgdGhlIGN1cnNvciBzcGVjaWZpZXMgYSAndHMnLFxuICAgIC8vIHRoZW4gc2V0IHRoZSB1bmRvY3VtZW50ZWQgb3Bsb2cgcmVwbGF5IGZsYWcsIHdoaWNoIGRvZXMgYSBzcGVjaWFsIHNjYW4gdG9cbiAgICAvLyBmaW5kIHRoZSBmaXJzdCBkb2N1bWVudCAoaW5zdGVhZCBvZiBjcmVhdGluZyBhbiBpbmRleCBvbiB0cykuIFRoaXMgaXMgYVxuICAgIC8vIHZlcnkgaGFyZC1jb2RlZCBNb25nbyBmbGFnIHdoaWNoIG9ubHkgd29ya3Mgb24gdGhlIG9wbG9nIGNvbGxlY3Rpb24gYW5kXG4gICAgLy8gb25seSB3b3JrcyB3aXRoIHRoZSB0cyBmaWVsZC5cbiAgICBpZiAoY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWUgPT09IE9QTE9HX0NPTExFQ1RJT04gJiZcbiAgICAgIGN1cnNvckRlc2NyaXB0aW9uLnNlbGVjdG9yLnRzKSB7XG4gICAgICBkYkN1cnNvci5hZGRDdXJzb3JGbGFnKFwib3Bsb2dSZXBsYXlcIiwgdHJ1ZSlcbiAgICB9XG4gIH1cblxuICBpZiAodHlwZW9mIGN1cnNvck9wdGlvbnMubWF4VGltZU1zICE9PSAndW5kZWZpbmVkJykge1xuICAgIGRiQ3Vyc29yID0gZGJDdXJzb3IubWF4VGltZU1TKGN1cnNvck9wdGlvbnMubWF4VGltZU1zKTtcbiAgfVxuICBpZiAodHlwZW9mIGN1cnNvck9wdGlvbnMuaGludCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBkYkN1cnNvciA9IGRiQ3Vyc29yLmhpbnQoY3Vyc29yT3B0aW9ucy5oaW50KTtcbiAgfVxuXG4gIHJldHVybiBuZXcgQXN5bmNocm9ub3VzQ3Vyc29yKGRiQ3Vyc29yLCBjdXJzb3JEZXNjcmlwdGlvbiwgb3B0aW9ucywgY29sbGVjdGlvbik7XG59O1xuXG4vLyBUYWlscyB0aGUgY3Vyc29yIGRlc2NyaWJlZCBieSBjdXJzb3JEZXNjcmlwdGlvbiwgbW9zdCBsaWtlbHkgb24gdGhlXG4vLyBvcGxvZy4gQ2FsbHMgZG9jQ2FsbGJhY2sgd2l0aCBlYWNoIGRvY3VtZW50IGZvdW5kLiBJZ25vcmVzIGVycm9ycyBhbmQganVzdFxuLy8gcmVzdGFydHMgdGhlIHRhaWwgb24gZXJyb3IuXG4vL1xuLy8gSWYgdGltZW91dE1TIGlzIHNldCwgdGhlbiBpZiB3ZSBkb24ndCBnZXQgYSBuZXcgZG9jdW1lbnQgZXZlcnkgdGltZW91dE1TLFxuLy8ga2lsbCBhbmQgcmVzdGFydCB0aGUgY3Vyc29yLiBUaGlzIGlzIHByaW1hcmlseSBhIHdvcmthcm91bmQgZm9yICM4NTk4LlxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS50YWlsID0gZnVuY3Rpb24gKGN1cnNvckRlc2NyaXB0aW9uLCBkb2NDYWxsYmFjaywgdGltZW91dE1TKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKCFjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnRhaWxhYmxlKVxuICAgIHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IHRhaWwgYSB0YWlsYWJsZSBjdXJzb3JcIik7XG5cbiAgdmFyIGN1cnNvciA9IHNlbGYuX2NyZWF0ZUFzeW5jaHJvbm91c0N1cnNvcihjdXJzb3JEZXNjcmlwdGlvbik7XG5cbiAgdmFyIHN0b3BwZWQgPSBmYWxzZTtcbiAgdmFyIGxhc3RUUztcblxuICBNZXRlb3IuZGVmZXIoYXN5bmMgZnVuY3Rpb24gbG9vcCgpIHtcbiAgICB2YXIgZG9jID0gbnVsbDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgaWYgKHN0b3BwZWQpXG4gICAgICAgIHJldHVybjtcbiAgICAgIHRyeSB7XG4gICAgICAgIGRvYyA9IGF3YWl0IGN1cnNvci5fbmV4dE9iamVjdFByb21pc2VXaXRoVGltZW91dCh0aW1lb3V0TVMpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIC8vIFdlIHNob3VsZCBub3QgaWdub3JlIGVycm9ycyBoZXJlIHVubGVzcyB3ZSB3YW50IHRvIHNwZW5kIGEgbG90IG9mIHRpbWUgZGVidWdnaW5nXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgLy8gVGhlcmUncyBubyBnb29kIHdheSB0byBmaWd1cmUgb3V0IGlmIHRoaXMgd2FzIGFjdHVhbGx5IGFuIGVycm9yIGZyb21cbiAgICAgICAgLy8gTW9uZ28sIG9yIGp1c3QgY2xpZW50LXNpZGUgKGluY2x1ZGluZyBvdXIgb3duIHRpbWVvdXQgZXJyb3IpLiBBaFxuICAgICAgICAvLyB3ZWxsLiBCdXQgZWl0aGVyIHdheSwgd2UgbmVlZCB0byByZXRyeSB0aGUgY3Vyc29yICh1bmxlc3MgdGhlIGZhaWx1cmVcbiAgICAgICAgLy8gd2FzIGJlY2F1c2UgdGhlIG9ic2VydmUgZ290IHN0b3BwZWQpLlxuICAgICAgICBkb2MgPSBudWxsO1xuICAgICAgfVxuICAgICAgLy8gU2luY2Ugd2UgYXdhaXRlZCBhIHByb21pc2UgYWJvdmUsIHdlIG5lZWQgdG8gY2hlY2sgYWdhaW4gdG8gc2VlIGlmXG4gICAgICAvLyB3ZSd2ZSBiZWVuIHN0b3BwZWQgYmVmb3JlIGNhbGxpbmcgdGhlIGNhbGxiYWNrLlxuICAgICAgaWYgKHN0b3BwZWQpXG4gICAgICAgIHJldHVybjtcbiAgICAgIGlmIChkb2MpIHtcbiAgICAgICAgLy8gSWYgYSB0YWlsYWJsZSBjdXJzb3IgY29udGFpbnMgYSBcInRzXCIgZmllbGQsIHVzZSBpdCB0byByZWNyZWF0ZSB0aGVcbiAgICAgICAgLy8gY3Vyc29yIG9uIGVycm9yLiAoXCJ0c1wiIGlzIGEgc3RhbmRhcmQgdGhhdCBNb25nbyB1c2VzIGludGVybmFsbHkgZm9yXG4gICAgICAgIC8vIHRoZSBvcGxvZywgYW5kIHRoZXJlJ3MgYSBzcGVjaWFsIGZsYWcgdGhhdCBsZXRzIHlvdSBkbyBiaW5hcnkgc2VhcmNoXG4gICAgICAgIC8vIG9uIGl0IGluc3RlYWQgb2YgbmVlZGluZyB0byB1c2UgYW4gaW5kZXguKVxuICAgICAgICBsYXN0VFMgPSBkb2MudHM7XG4gICAgICAgIGRvY0NhbGxiYWNrKGRvYyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgbmV3U2VsZWN0b3IgPSBPYmplY3QuYXNzaWduKHt9LCBjdXJzb3JEZXNjcmlwdGlvbi5zZWxlY3Rvcik7XG4gICAgICAgIGlmIChsYXN0VFMpIHtcbiAgICAgICAgICBuZXdTZWxlY3Rvci50cyA9IHskZ3Q6IGxhc3RUU307XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yID0gc2VsZi5fY3JlYXRlQXN5bmNocm9ub3VzQ3Vyc29yKG5ldyBDdXJzb3JEZXNjcmlwdGlvbihcbiAgICAgICAgICBjdXJzb3JEZXNjcmlwdGlvbi5jb2xsZWN0aW9uTmFtZSxcbiAgICAgICAgICBuZXdTZWxlY3RvcixcbiAgICAgICAgICBjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zKSk7XG4gICAgICAgIC8vIE1vbmdvIGZhaWxvdmVyIHRha2VzIG1hbnkgc2Vjb25kcy4gIFJldHJ5IGluIGEgYml0LiAgKFdpdGhvdXQgdGhpc1xuICAgICAgICAvLyBzZXRUaW1lb3V0LCB3ZSBwZWcgdGhlIENQVSBhdCAxMDAlIGFuZCBuZXZlciBub3RpY2UgdGhlIGFjdHVhbFxuICAgICAgICAvLyBmYWlsb3Zlci5cbiAgICAgICAgc2V0VGltZW91dChsb29wLCAxMDApO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgc3RvcDogZnVuY3Rpb24gKCkge1xuICAgICAgc3RvcHBlZCA9IHRydWU7XG4gICAgICBjdXJzb3IuY2xvc2UoKTtcbiAgICB9XG4gIH07XG59O1xuXG5PYmplY3QuYXNzaWduKE1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUsIHtcbiAgX29ic2VydmVDaGFuZ2VzOiBhc3luYyBmdW5jdGlvbiAoXG4gICAgY3Vyc29yRGVzY3JpcHRpb24sIG9yZGVyZWQsIGNhbGxiYWNrcywgbm9uTXV0YXRpbmdDYWxsYmFja3MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgY29uc3QgY29sbGVjdGlvbk5hbWUgPSBjdXJzb3JEZXNjcmlwdGlvbi5jb2xsZWN0aW9uTmFtZTtcblxuICAgIGlmIChjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnRhaWxhYmxlKSB7XG4gICAgICByZXR1cm4gc2VsZi5fb2JzZXJ2ZUNoYW5nZXNUYWlsYWJsZShjdXJzb3JEZXNjcmlwdGlvbiwgb3JkZXJlZCwgY2FsbGJhY2tzKTtcbiAgICB9XG5cbiAgICAvLyBZb3UgbWF5IG5vdCBmaWx0ZXIgb3V0IF9pZCB3aGVuIG9ic2VydmluZyBjaGFuZ2VzLCBiZWNhdXNlIHRoZSBpZCBpcyBhIGNvcmVcbiAgICAvLyBwYXJ0IG9mIHRoZSBvYnNlcnZlQ2hhbmdlcyBBUEkuXG4gICAgY29uc3QgZmllbGRzT3B0aW9ucyA9IGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMucHJvamVjdGlvbiB8fCBjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLmZpZWxkcztcbiAgICBpZiAoZmllbGRzT3B0aW9ucyAmJlxuICAgICAgKGZpZWxkc09wdGlvbnMuX2lkID09PSAwIHx8XG4gICAgICAgIGZpZWxkc09wdGlvbnMuX2lkID09PSBmYWxzZSkpIHtcbiAgICAgIHRocm93IEVycm9yKFwiWW91IG1heSBub3Qgb2JzZXJ2ZSBhIGN1cnNvciB3aXRoIHtmaWVsZHM6IHtfaWQ6IDB9fVwiKTtcbiAgICB9XG5cbiAgICB2YXIgb2JzZXJ2ZUtleSA9IEVKU09OLnN0cmluZ2lmeShcbiAgICAgIE9iamVjdC5hc3NpZ24oe29yZGVyZWQ6IG9yZGVyZWR9LCBjdXJzb3JEZXNjcmlwdGlvbikpO1xuXG4gICAgdmFyIG11bHRpcGxleGVyLCBvYnNlcnZlRHJpdmVyO1xuICAgIHZhciBmaXJzdEhhbmRsZSA9IGZhbHNlO1xuXG4gICAgLy8gRmluZCBhIG1hdGNoaW5nIE9ic2VydmVNdWx0aXBsZXhlciwgb3IgY3JlYXRlIGEgbmV3IG9uZS4gVGhpcyBuZXh0IGJsb2NrIGlzXG4gICAgLy8gZ3VhcmFudGVlZCB0byBub3QgeWllbGQgKGFuZCBpdCBkb2Vzbid0IGNhbGwgYW55dGhpbmcgdGhhdCBjYW4gb2JzZXJ2ZSBhXG4gICAgLy8gbmV3IHF1ZXJ5KSwgc28gbm8gb3RoZXIgY2FsbHMgdG8gdGhpcyBmdW5jdGlvbiBjYW4gaW50ZXJsZWF2ZSB3aXRoIGl0LlxuICAgIGlmIChvYnNlcnZlS2V5IGluIHNlbGYuX29ic2VydmVNdWx0aXBsZXhlcnMpIHtcbiAgICAgIG11bHRpcGxleGVyID0gc2VsZi5fb2JzZXJ2ZU11bHRpcGxleGVyc1tvYnNlcnZlS2V5XTtcbiAgICB9IGVsc2Uge1xuICAgICAgZmlyc3RIYW5kbGUgPSB0cnVlO1xuICAgICAgLy8gQ3JlYXRlIGEgbmV3IE9ic2VydmVNdWx0aXBsZXhlci5cbiAgICAgIG11bHRpcGxleGVyID0gbmV3IE9ic2VydmVNdWx0aXBsZXhlcih7XG4gICAgICAgIG9yZGVyZWQ6IG9yZGVyZWQsXG4gICAgICAgIG9uU3RvcDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGRlbGV0ZSBzZWxmLl9vYnNlcnZlTXVsdGlwbGV4ZXJzW29ic2VydmVLZXldO1xuICAgICAgICAgIHJldHVybiBvYnNlcnZlRHJpdmVyLnN0b3AoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdmFyIG9ic2VydmVIYW5kbGUgPSBuZXcgT2JzZXJ2ZUhhbmRsZShtdWx0aXBsZXhlcixcbiAgICAgIGNhbGxiYWNrcyxcbiAgICAgIG5vbk11dGF0aW5nQ2FsbGJhY2tzLFxuICAgICk7XG5cbiAgICBjb25zdCBvcGxvZ09wdGlvbnMgPSBzZWxmPy5fb3Bsb2dIYW5kbGU/Ll9vcGxvZ09wdGlvbnMgfHwge307XG4gICAgY29uc3QgeyBpbmNsdWRlQ29sbGVjdGlvbnMsIGV4Y2x1ZGVDb2xsZWN0aW9ucyB9ID0gb3Bsb2dPcHRpb25zO1xuICAgIGlmIChmaXJzdEhhbmRsZSkge1xuXG4gICAgICB2YXIgbWF0Y2hlciwgc29ydGVyO1xuICAgICAgdmFyIGNhblVzZU9wbG9nID0gW1xuICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgLy8gQXQgYSBiYXJlIG1pbmltdW0sIHVzaW5nIHRoZSBvcGxvZyByZXF1aXJlcyB1cyB0byBoYXZlIGFuIG9wbG9nLCB0b1xuICAgICAgICAgIC8vIHdhbnQgdW5vcmRlcmVkIGNhbGxiYWNrcywgYW5kIHRvIG5vdCB3YW50IGEgY2FsbGJhY2sgb24gdGhlIHBvbGxzXG4gICAgICAgICAgLy8gdGhhdCB3b24ndCBoYXBwZW4uXG4gICAgICAgICAgcmV0dXJuIHNlbGYuX29wbG9nSGFuZGxlICYmICFvcmRlcmVkICYmXG4gICAgICAgICAgICAhY2FsbGJhY2tzLl90ZXN0T25seVBvbGxDYWxsYmFjaztcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIC8vIFdlIGFsc28gbmVlZCB0byBjaGVjaywgaWYgdGhlIGNvbGxlY3Rpb24gb2YgdGhpcyBDdXJzb3IgaXMgYWN0dWFsbHkgYmVpbmcgXCJ3YXRjaGVkXCIgYnkgdGhlIE9wbG9nIGhhbmRsZVxuICAgICAgICAgIC8vIGlmIG5vdCwgd2UgaGF2ZSB0byBmYWxsYmFjayB0byBsb25nIHBvbGxpbmdcbiAgICAgICAgICBpZiAoZXhjbHVkZUNvbGxlY3Rpb25zPy5sZW5ndGggJiYgZXhjbHVkZUNvbGxlY3Rpb25zLmluY2x1ZGVzKGNvbGxlY3Rpb25OYW1lKSkge1xuICAgICAgICAgICAgaWYgKCFvcGxvZ0NvbGxlY3Rpb25XYXJuaW5ncy5pbmNsdWRlcyhjb2xsZWN0aW9uTmFtZSkpIHtcbiAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBNZXRlb3Iuc2V0dGluZ3MucGFja2FnZXMubW9uZ28ub3Bsb2dFeGNsdWRlQ29sbGVjdGlvbnMgaW5jbHVkZXMgdGhlIGNvbGxlY3Rpb24gJHtjb2xsZWN0aW9uTmFtZX0gLSB5b3VyIHN1YnNjcmlwdGlvbnMgd2lsbCBvbmx5IHVzZSBsb25nIHBvbGxpbmchYCk7XG4gICAgICAgICAgICAgIG9wbG9nQ29sbGVjdGlvbldhcm5pbmdzLnB1c2goY29sbGVjdGlvbk5hbWUpOyAvLyB3ZSBvbmx5IHdhbnQgdG8gc2hvdyB0aGUgd2FybmluZ3Mgb25jZSBwZXIgY29sbGVjdGlvbiFcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGluY2x1ZGVDb2xsZWN0aW9ucz8ubGVuZ3RoICYmICFpbmNsdWRlQ29sbGVjdGlvbnMuaW5jbHVkZXMoY29sbGVjdGlvbk5hbWUpKSB7XG4gICAgICAgICAgICBpZiAoIW9wbG9nQ29sbGVjdGlvbldhcm5pbmdzLmluY2x1ZGVzKGNvbGxlY3Rpb25OYW1lKSkge1xuICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYE1ldGVvci5zZXR0aW5ncy5wYWNrYWdlcy5tb25nby5vcGxvZ0luY2x1ZGVDb2xsZWN0aW9ucyBkb2VzIG5vdCBpbmNsdWRlIHRoZSBjb2xsZWN0aW9uICR7Y29sbGVjdGlvbk5hbWV9IC0geW91ciBzdWJzY3JpcHRpb25zIHdpbGwgb25seSB1c2UgbG9uZyBwb2xsaW5nIWApO1xuICAgICAgICAgICAgICBvcGxvZ0NvbGxlY3Rpb25XYXJuaW5ncy5wdXNoKGNvbGxlY3Rpb25OYW1lKTsgLy8gd2Ugb25seSB3YW50IHRvIHNob3cgdGhlIHdhcm5pbmdzIG9uY2UgcGVyIGNvbGxlY3Rpb24hXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgLy8gV2UgbmVlZCB0byBiZSBhYmxlIHRvIGNvbXBpbGUgdGhlIHNlbGVjdG9yLiBGYWxsIGJhY2sgdG8gcG9sbGluZyBmb3JcbiAgICAgICAgICAvLyBzb21lIG5ld2ZhbmdsZWQgJHNlbGVjdG9yIHRoYXQgbWluaW1vbmdvIGRvZXNuJ3Qgc3VwcG9ydCB5ZXQuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG1hdGNoZXIgPSBuZXcgTWluaW1vbmdvLk1hdGNoZXIoY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgLy8gWFhYIG1ha2UgYWxsIGNvbXBpbGF0aW9uIGVycm9ycyBNaW5pbW9uZ29FcnJvciBvciBzb21ldGhpbmdcbiAgICAgICAgICAgIC8vICAgICBzbyB0aGF0IHRoaXMgZG9lc24ndCBpZ25vcmUgdW5yZWxhdGVkIGV4Y2VwdGlvbnNcbiAgICAgICAgICAgIGlmIChNZXRlb3IuaXNDbGllbnQgJiYgZSBpbnN0YW5jZW9mIE1pbmlNb25nb1F1ZXJ5RXJyb3IpIHtcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAvLyAuLi4gYW5kIHRoZSBzZWxlY3RvciBpdHNlbGYgbmVlZHMgdG8gc3VwcG9ydCBvcGxvZy5cbiAgICAgICAgICByZXR1cm4gT3Bsb2dPYnNlcnZlRHJpdmVyLmN1cnNvclN1cHBvcnRlZChjdXJzb3JEZXNjcmlwdGlvbiwgbWF0Y2hlcik7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAvLyBBbmQgd2UgbmVlZCB0byBiZSBhYmxlIHRvIGNvbXBpbGUgdGhlIHNvcnQsIGlmIGFueS4gIGVnLCBjYW4ndCBiZVxuICAgICAgICAgIC8vIHskbmF0dXJhbDogMX0uXG4gICAgICAgICAgaWYgKCFjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnNvcnQpXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgc29ydGVyID0gbmV3IE1pbmltb25nby5Tb3J0ZXIoY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5zb3J0KTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIFhYWCBtYWtlIGFsbCBjb21waWxhdGlvbiBlcnJvcnMgTWluaW1vbmdvRXJyb3Igb3Igc29tZXRoaW5nXG4gICAgICAgICAgICAvLyAgICAgc28gdGhhdCB0aGlzIGRvZXNuJ3QgaWdub3JlIHVucmVsYXRlZCBleGNlcHRpb25zXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBdLmV2ZXJ5KGYgPT4gZigpKTsgIC8vIGludm9rZSBlYWNoIGZ1bmN0aW9uIGFuZCBjaGVjayBpZiBhbGwgcmV0dXJuIHRydWVcblxuICAgICAgdmFyIGRyaXZlckNsYXNzID0gY2FuVXNlT3Bsb2cgPyBPcGxvZ09ic2VydmVEcml2ZXIgOiBQb2xsaW5nT2JzZXJ2ZURyaXZlcjtcbiAgICAgIG9ic2VydmVEcml2ZXIgPSBuZXcgZHJpdmVyQ2xhc3Moe1xuICAgICAgICBjdXJzb3JEZXNjcmlwdGlvbjogY3Vyc29yRGVzY3JpcHRpb24sXG4gICAgICAgIG1vbmdvSGFuZGxlOiBzZWxmLFxuICAgICAgICBtdWx0aXBsZXhlcjogbXVsdGlwbGV4ZXIsXG4gICAgICAgIG9yZGVyZWQ6IG9yZGVyZWQsXG4gICAgICAgIG1hdGNoZXI6IG1hdGNoZXIsICAvLyBpZ25vcmVkIGJ5IHBvbGxpbmdcbiAgICAgICAgc29ydGVyOiBzb3J0ZXIsICAvLyBpZ25vcmVkIGJ5IHBvbGxpbmdcbiAgICAgICAgX3Rlc3RPbmx5UG9sbENhbGxiYWNrOiBjYWxsYmFja3MuX3Rlc3RPbmx5UG9sbENhbGxiYWNrXG4gICAgICB9KTtcblxuICAgICAgaWYgKG9ic2VydmVEcml2ZXIuX2luaXQpIHtcbiAgICAgICAgYXdhaXQgb2JzZXJ2ZURyaXZlci5faW5pdCgpO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGlzIGZpZWxkIGlzIG9ubHkgc2V0IGZvciB1c2UgaW4gdGVzdHMuXG4gICAgICBtdWx0aXBsZXhlci5fb2JzZXJ2ZURyaXZlciA9IG9ic2VydmVEcml2ZXI7XG4gICAgfVxuICAgIHNlbGYuX29ic2VydmVNdWx0aXBsZXhlcnNbb2JzZXJ2ZUtleV0gPSBtdWx0aXBsZXhlcjtcbiAgICAvLyBCbG9ja3MgdW50aWwgdGhlIGluaXRpYWwgYWRkcyBoYXZlIGJlZW4gc2VudC5cbiAgICBhd2FpdCBtdWx0aXBsZXhlci5hZGRIYW5kbGVBbmRTZW5kSW5pdGlhbEFkZHMob2JzZXJ2ZUhhbmRsZSk7XG5cbiAgICByZXR1cm4gb2JzZXJ2ZUhhbmRsZTtcbiAgfSxcblxufSk7XG4iLCJpbXBvcnQgY2xvbmUgZnJvbSAnbG9kYXNoLmNsb25lJ1xuXG4vKiogQHR5cGUge2ltcG9ydCgnbW9uZ29kYicpfSAqL1xuZXhwb3J0IGNvbnN0IE1vbmdvREIgPSBPYmplY3QuYXNzaWduKE5wbU1vZHVsZU1vbmdvZGIsIHtcbiAgT2JqZWN0SUQ6IE5wbU1vZHVsZU1vbmdvZGIuT2JqZWN0SWQsXG59KTtcblxuLy8gVGhlIHdyaXRlIG1ldGhvZHMgYmxvY2sgdW50aWwgdGhlIGRhdGFiYXNlIGhhcyBjb25maXJtZWQgdGhlIHdyaXRlIChpdCBtYXlcbi8vIG5vdCBiZSByZXBsaWNhdGVkIG9yIHN0YWJsZSBvbiBkaXNrLCBidXQgb25lIHNlcnZlciBoYXMgY29uZmlybWVkIGl0KSBpZiBub1xuLy8gY2FsbGJhY2sgaXMgcHJvdmlkZWQuIElmIGEgY2FsbGJhY2sgaXMgcHJvdmlkZWQsIHRoZW4gdGhleSBjYWxsIHRoZSBjYWxsYmFja1xuLy8gd2hlbiB0aGUgd3JpdGUgaXMgY29uZmlybWVkLiBUaGV5IHJldHVybiBub3RoaW5nIG9uIHN1Y2Nlc3MsIGFuZCByYWlzZSBhblxuLy8gZXhjZXB0aW9uIG9uIGZhaWx1cmUuXG4vL1xuLy8gQWZ0ZXIgbWFraW5nIGEgd3JpdGUgKHdpdGggaW5zZXJ0LCB1cGRhdGUsIHJlbW92ZSksIG9ic2VydmVycyBhcmVcbi8vIG5vdGlmaWVkIGFzeW5jaHJvbm91c2x5LiBJZiB5b3Ugd2FudCB0byByZWNlaXZlIGEgY2FsbGJhY2sgb25jZSBhbGxcbi8vIG9mIHRoZSBvYnNlcnZlciBub3RpZmljYXRpb25zIGhhdmUgbGFuZGVkIGZvciB5b3VyIHdyaXRlLCBkbyB0aGVcbi8vIHdyaXRlcyBpbnNpZGUgYSB3cml0ZSBmZW5jZSAoc2V0IEREUFNlcnZlci5fQ3VycmVudFdyaXRlRmVuY2UgdG8gYSBuZXdcbi8vIF9Xcml0ZUZlbmNlLCBhbmQgdGhlbiBzZXQgYSBjYWxsYmFjayBvbiB0aGUgd3JpdGUgZmVuY2UuKVxuLy9cbi8vIFNpbmNlIG91ciBleGVjdXRpb24gZW52aXJvbm1lbnQgaXMgc2luZ2xlLXRocmVhZGVkLCB0aGlzIGlzXG4vLyB3ZWxsLWRlZmluZWQgLS0gYSB3cml0ZSBcImhhcyBiZWVuIG1hZGVcIiBpZiBpdCdzIHJldHVybmVkLCBhbmQgYW5cbi8vIG9ic2VydmVyIFwiaGFzIGJlZW4gbm90aWZpZWRcIiBpZiBpdHMgY2FsbGJhY2sgaGFzIHJldHVybmVkLlxuXG5leHBvcnQgY29uc3Qgd3JpdGVDYWxsYmFjayA9IGZ1bmN0aW9uICh3cml0ZSwgcmVmcmVzaCwgY2FsbGJhY2spIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIChlcnIsIHJlc3VsdCkge1xuICAgIGlmICghIGVycikge1xuICAgICAgLy8gWFhYIFdlIGRvbid0IGhhdmUgdG8gcnVuIHRoaXMgb24gZXJyb3IsIHJpZ2h0P1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVmcmVzaCgpO1xuICAgICAgfSBjYXRjaCAocmVmcmVzaEVycikge1xuICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICBjYWxsYmFjayhyZWZyZXNoRXJyKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgcmVmcmVzaEVycjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB3cml0ZS5jb21taXR0ZWQoKTtcbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrKGVyciwgcmVzdWx0KTtcbiAgICB9IGVsc2UgaWYgKGVycikge1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cbiAgfTtcbn07XG5cblxuZXhwb3J0IGNvbnN0IHRyYW5zZm9ybVJlc3VsdCA9IGZ1bmN0aW9uIChkcml2ZXJSZXN1bHQpIHtcbiAgdmFyIG1ldGVvclJlc3VsdCA9IHsgbnVtYmVyQWZmZWN0ZWQ6IDAgfTtcbiAgaWYgKGRyaXZlclJlc3VsdCkge1xuICAgIHZhciBtb25nb1Jlc3VsdCA9IGRyaXZlclJlc3VsdC5yZXN1bHQ7XG4gICAgLy8gT24gdXBkYXRlcyB3aXRoIHVwc2VydDp0cnVlLCB0aGUgaW5zZXJ0ZWQgdmFsdWVzIGNvbWUgYXMgYSBsaXN0IG9mXG4gICAgLy8gdXBzZXJ0ZWQgdmFsdWVzIC0tIGV2ZW4gd2l0aCBvcHRpb25zLm11bHRpLCB3aGVuIHRoZSB1cHNlcnQgZG9lcyBpbnNlcnQsXG4gICAgLy8gaXQgb25seSBpbnNlcnRzIG9uZSBlbGVtZW50LlxuICAgIGlmIChtb25nb1Jlc3VsdC51cHNlcnRlZENvdW50KSB7XG4gICAgICBtZXRlb3JSZXN1bHQubnVtYmVyQWZmZWN0ZWQgPSBtb25nb1Jlc3VsdC51cHNlcnRlZENvdW50O1xuXG4gICAgICBpZiAobW9uZ29SZXN1bHQudXBzZXJ0ZWRJZCkge1xuICAgICAgICBtZXRlb3JSZXN1bHQuaW5zZXJ0ZWRJZCA9IG1vbmdvUmVzdWx0LnVwc2VydGVkSWQ7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIG4gd2FzIHVzZWQgYmVmb3JlIE1vbmdvIDUuMCwgaW4gTW9uZ28gNS4wIHdlIGFyZSBub3QgcmVjZWl2aW5nIHRoaXMgblxuICAgICAgLy8gZmllbGQgYW5kIHNvIHdlIGFyZSB1c2luZyBtb2RpZmllZENvdW50IGluc3RlYWRcbiAgICAgIG1ldGVvclJlc3VsdC5udW1iZXJBZmZlY3RlZCA9IG1vbmdvUmVzdWx0Lm4gfHwgbW9uZ29SZXN1bHQubWF0Y2hlZENvdW50IHx8IG1vbmdvUmVzdWx0Lm1vZGlmaWVkQ291bnQ7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG1ldGVvclJlc3VsdDtcbn07XG5cbmV4cG9ydCBjb25zdCByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyA9IGZ1bmN0aW9uIChkb2N1bWVudCkge1xuICBpZiAoRUpTT04uaXNCaW5hcnkoZG9jdW1lbnQpKSB7XG4gICAgLy8gVGhpcyBkb2VzIG1vcmUgY29waWVzIHRoYW4gd2UnZCBsaWtlLCBidXQgaXMgbmVjZXNzYXJ5IGJlY2F1c2VcbiAgICAvLyBNb25nb0RCLkJTT04gb25seSBsb29rcyBsaWtlIGl0IHRha2VzIGEgVWludDhBcnJheSAoYW5kIGRvZXNuJ3QgYWN0dWFsbHlcbiAgICAvLyBzZXJpYWxpemUgaXQgY29ycmVjdGx5KS5cbiAgICByZXR1cm4gbmV3IE1vbmdvREIuQmluYXJ5KEJ1ZmZlci5mcm9tKGRvY3VtZW50KSk7XG4gIH1cbiAgaWYgKGRvY3VtZW50IGluc3RhbmNlb2YgTW9uZ29EQi5CaW5hcnkpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQ7XG4gIH1cbiAgaWYgKGRvY3VtZW50IGluc3RhbmNlb2YgTW9uZ28uT2JqZWN0SUQpIHtcbiAgICByZXR1cm4gbmV3IE1vbmdvREIuT2JqZWN0SWQoZG9jdW1lbnQudG9IZXhTdHJpbmcoKSk7XG4gIH1cbiAgaWYgKGRvY3VtZW50IGluc3RhbmNlb2YgTW9uZ29EQi5PYmplY3RJZCkge1xuICAgIHJldHVybiBuZXcgTW9uZ29EQi5PYmplY3RJZChkb2N1bWVudC50b0hleFN0cmluZygpKTtcbiAgfVxuICBpZiAoZG9jdW1lbnQgaW5zdGFuY2VvZiBNb25nb0RCLlRpbWVzdGFtcCkge1xuICAgIC8vIEZvciBub3csIHRoZSBNZXRlb3IgcmVwcmVzZW50YXRpb24gb2YgYSBNb25nbyB0aW1lc3RhbXAgdHlwZSAobm90IGEgZGF0ZSFcbiAgICAvLyB0aGlzIGlzIGEgd2VpcmQgaW50ZXJuYWwgdGhpbmcgdXNlZCBpbiB0aGUgb3Bsb2chKSBpcyB0aGUgc2FtZSBhcyB0aGVcbiAgICAvLyBNb25nbyByZXByZXNlbnRhdGlvbi4gV2UgbmVlZCB0byBkbyB0aGlzIGV4cGxpY2l0bHkgb3IgZWxzZSB3ZSB3b3VsZCBkbyBhXG4gICAgLy8gc3RydWN0dXJhbCBjbG9uZSBhbmQgbG9zZSB0aGUgcHJvdG90eXBlLlxuICAgIHJldHVybiBkb2N1bWVudDtcbiAgfVxuICBpZiAoZG9jdW1lbnQgaW5zdGFuY2VvZiBEZWNpbWFsKSB7XG4gICAgcmV0dXJuIE1vbmdvREIuRGVjaW1hbDEyOC5mcm9tU3RyaW5nKGRvY3VtZW50LnRvU3RyaW5nKCkpO1xuICB9XG4gIGlmIChFSlNPTi5faXNDdXN0b21UeXBlKGRvY3VtZW50KSkge1xuICAgIHJldHVybiByZXBsYWNlTmFtZXMobWFrZU1vbmdvTGVnYWwsIEVKU09OLnRvSlNPTlZhbHVlKGRvY3VtZW50KSk7XG4gIH1cbiAgLy8gSXQgaXMgbm90IG9yZGluYXJpbHkgcG9zc2libGUgdG8gc3RpY2sgZG9sbGFyLXNpZ24ga2V5cyBpbnRvIG1vbmdvXG4gIC8vIHNvIHdlIGRvbid0IGJvdGhlciBjaGVja2luZyBmb3IgdGhpbmdzIHRoYXQgbmVlZCBlc2NhcGluZyBhdCB0aGlzIHRpbWUuXG4gIHJldHVybiB1bmRlZmluZWQ7XG59O1xuXG5leHBvcnQgY29uc3QgcmVwbGFjZVR5cGVzID0gZnVuY3Rpb24gKGRvY3VtZW50LCBhdG9tVHJhbnNmb3JtZXIpIHtcbiAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ29iamVjdCcgfHwgZG9jdW1lbnQgPT09IG51bGwpXG4gICAgcmV0dXJuIGRvY3VtZW50O1xuXG4gIHZhciByZXBsYWNlZFRvcExldmVsQXRvbSA9IGF0b21UcmFuc2Zvcm1lcihkb2N1bWVudCk7XG4gIGlmIChyZXBsYWNlZFRvcExldmVsQXRvbSAhPT0gdW5kZWZpbmVkKVxuICAgIHJldHVybiByZXBsYWNlZFRvcExldmVsQXRvbTtcblxuICB2YXIgcmV0ID0gZG9jdW1lbnQ7XG4gIE9iamVjdC5lbnRyaWVzKGRvY3VtZW50KS5mb3JFYWNoKGZ1bmN0aW9uIChba2V5LCB2YWxdKSB7XG4gICAgdmFyIHZhbFJlcGxhY2VkID0gcmVwbGFjZVR5cGVzKHZhbCwgYXRvbVRyYW5zZm9ybWVyKTtcbiAgICBpZiAodmFsICE9PSB2YWxSZXBsYWNlZCkge1xuICAgICAgLy8gTGF6eSBjbG9uZS4gU2hhbGxvdyBjb3B5LlxuICAgICAgaWYgKHJldCA9PT0gZG9jdW1lbnQpXG4gICAgICAgIHJldCA9IGNsb25lKGRvY3VtZW50KTtcbiAgICAgIHJldFtrZXldID0gdmFsUmVwbGFjZWQ7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmV4cG9ydCBjb25zdCByZXBsYWNlTW9uZ29BdG9tV2l0aE1ldGVvciA9IGZ1bmN0aW9uIChkb2N1bWVudCkge1xuICBpZiAoZG9jdW1lbnQgaW5zdGFuY2VvZiBNb25nb0RCLkJpbmFyeSkge1xuICAgIC8vIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eVxuICAgIGlmIChkb2N1bWVudC5zdWJfdHlwZSAhPT0gMCkge1xuICAgICAgcmV0dXJuIGRvY3VtZW50O1xuICAgIH1cbiAgICB2YXIgYnVmZmVyID0gZG9jdW1lbnQudmFsdWUodHJ1ZSk7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG4gIH1cbiAgaWYgKGRvY3VtZW50IGluc3RhbmNlb2YgTW9uZ29EQi5PYmplY3RJZCkge1xuICAgIHJldHVybiBuZXcgTW9uZ28uT2JqZWN0SUQoZG9jdW1lbnQudG9IZXhTdHJpbmcoKSk7XG4gIH1cbiAgaWYgKGRvY3VtZW50IGluc3RhbmNlb2YgTW9uZ29EQi5EZWNpbWFsMTI4KSB7XG4gICAgcmV0dXJuIERlY2ltYWwoZG9jdW1lbnQudG9TdHJpbmcoKSk7XG4gIH1cbiAgaWYgKGRvY3VtZW50W1wiRUpTT04kdHlwZVwiXSAmJiBkb2N1bWVudFtcIkVKU09OJHZhbHVlXCJdICYmIE9iamVjdC5rZXlzKGRvY3VtZW50KS5sZW5ndGggPT09IDIpIHtcbiAgICByZXR1cm4gRUpTT04uZnJvbUpTT05WYWx1ZShyZXBsYWNlTmFtZXModW5tYWtlTW9uZ29MZWdhbCwgZG9jdW1lbnQpKTtcbiAgfVxuICBpZiAoZG9jdW1lbnQgaW5zdGFuY2VvZiBNb25nb0RCLlRpbWVzdGFtcCkge1xuICAgIC8vIEZvciBub3csIHRoZSBNZXRlb3IgcmVwcmVzZW50YXRpb24gb2YgYSBNb25nbyB0aW1lc3RhbXAgdHlwZSAobm90IGEgZGF0ZSFcbiAgICAvLyB0aGlzIGlzIGEgd2VpcmQgaW50ZXJuYWwgdGhpbmcgdXNlZCBpbiB0aGUgb3Bsb2chKSBpcyB0aGUgc2FtZSBhcyB0aGVcbiAgICAvLyBNb25nbyByZXByZXNlbnRhdGlvbi4gV2UgbmVlZCB0byBkbyB0aGlzIGV4cGxpY2l0bHkgb3IgZWxzZSB3ZSB3b3VsZCBkbyBhXG4gICAgLy8gc3RydWN0dXJhbCBjbG9uZSBhbmQgbG9zZSB0aGUgcHJvdG90eXBlLlxuICAgIHJldHVybiBkb2N1bWVudDtcbiAgfVxuICByZXR1cm4gdW5kZWZpbmVkO1xufTtcblxuY29uc3QgbWFrZU1vbmdvTGVnYWwgPSBuYW1lID0+IFwiRUpTT05cIiArIG5hbWU7XG5jb25zdCB1bm1ha2VNb25nb0xlZ2FsID0gbmFtZSA9PiBuYW1lLnN1YnN0cig1KTtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlcGxhY2VOYW1lcyhmaWx0ZXIsIHRoaW5nKSB7XG4gIGlmICh0eXBlb2YgdGhpbmcgPT09IFwib2JqZWN0XCIgJiYgdGhpbmcgIT09IG51bGwpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh0aGluZykpIHtcbiAgICAgIHJldHVybiB0aGluZy5tYXAocmVwbGFjZU5hbWVzLmJpbmQobnVsbCwgZmlsdGVyKSk7XG4gICAgfVxuICAgIHZhciByZXQgPSB7fTtcbiAgICBPYmplY3QuZW50cmllcyh0aGluZykuZm9yRWFjaChmdW5jdGlvbiAoW2tleSwgdmFsdWVdKSB7XG4gICAgICByZXRbZmlsdGVyKGtleSldID0gcmVwbGFjZU5hbWVzKGZpbHRlciwgdmFsdWUpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXQ7XG4gIH1cbiAgcmV0dXJuIHRoaW5nO1xufVxuIiwiaW1wb3J0IExvY2FsQ29sbGVjdGlvbiBmcm9tICdtZXRlb3IvbWluaW1vbmdvL2xvY2FsX2NvbGxlY3Rpb24nO1xuaW1wb3J0IHsgcmVwbGFjZU1vbmdvQXRvbVdpdGhNZXRlb3IsIHJlcGxhY2VUeXBlcyB9IGZyb20gJy4vbW9uZ29fY29tbW9uJztcblxuLyoqXG4gKiBUaGlzIGlzIGp1c3QgYSBsaWdodCB3cmFwcGVyIGZvciB0aGUgY3Vyc29yLiBUaGUgZ29hbCBoZXJlIGlzIHRvIGVuc3VyZSBjb21wYXRpYmlsaXR5IGV2ZW4gaWZcbiAqIHRoZXJlIGFyZSBicmVha2luZyBjaGFuZ2VzIG9uIHRoZSBNb25nb0RCIGRyaXZlci5cbiAqXG4gKiBUaGlzIGlzIGFuIGludGVybmFsIGltcGxlbWVudGF0aW9uIGRldGFpbCBhbmQgaXMgY3JlYXRlZCBsYXppbHkgYnkgdGhlIG1haW4gQ3Vyc29yIGNsYXNzLlxuICovXG5leHBvcnQgY2xhc3MgQXN5bmNocm9ub3VzQ3Vyc29yIHtcbiAgX2Nsb3NpbmcgPSBmYWxzZTtcbiAgX3BlbmRpbmdOZXh0ID0gbnVsbDtcbiAgY29uc3RydWN0b3IoZGJDdXJzb3IsIGN1cnNvckRlc2NyaXB0aW9uLCBvcHRpb25zKSB7XG4gICAgdGhpcy5fZGJDdXJzb3IgPSBkYkN1cnNvcjtcbiAgICB0aGlzLl9jdXJzb3JEZXNjcmlwdGlvbiA9IGN1cnNvckRlc2NyaXB0aW9uO1xuXG4gICAgdGhpcy5fc2VsZkZvckl0ZXJhdGlvbiA9IG9wdGlvbnMuc2VsZkZvckl0ZXJhdGlvbiB8fCB0aGlzO1xuICAgIGlmIChvcHRpb25zLnVzZVRyYW5zZm9ybSAmJiBjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnRyYW5zZm9ybSkge1xuICAgICAgdGhpcy5fdHJhbnNmb3JtID0gTG9jYWxDb2xsZWN0aW9uLndyYXBUcmFuc2Zvcm0oXG4gICAgICAgIGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMudHJhbnNmb3JtKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fdHJhbnNmb3JtID0gbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLl92aXNpdGVkSWRzID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gIH1cblxuICBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCkge1xuICAgIHZhciBjdXJzb3IgPSB0aGlzO1xuICAgIHJldHVybiB7XG4gICAgICBhc3luYyBuZXh0KCkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGF3YWl0IGN1cnNvci5fbmV4dE9iamVjdFByb21pc2UoKTtcbiAgICAgICAgcmV0dXJuIHsgZG9uZTogIXZhbHVlLCB2YWx1ZSB9O1xuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgLy8gUmV0dXJucyBhIFByb21pc2UgZm9yIHRoZSBuZXh0IG9iamVjdCBmcm9tIHRoZSB1bmRlcmx5aW5nIGN1cnNvciAoYmVmb3JlXG4gIC8vIHRoZSBNb25nby0+TWV0ZW9yIHR5cGUgcmVwbGFjZW1lbnQpLlxuICBhc3luYyBfcmF3TmV4dE9iamVjdFByb21pc2UoKSB7XG4gICAgaWYgKHRoaXMuX2Nsb3NpbmcpIHtcbiAgICAgIC8vIFByZXZlbnQgbmV4dCgpIGFmdGVyIGNsb3NlIGlzIGNhbGxlZFxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICB0aGlzLl9wZW5kaW5nTmV4dCA9IHRoaXMuX2RiQ3Vyc29yLm5leHQoKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuX3BlbmRpbmdOZXh0O1xuICAgICAgdGhpcy5fcGVuZGluZ05leHQgPSBudWxsO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLl9wZW5kaW5nTmV4dCA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgLy8gUmV0dXJucyBhIFByb21pc2UgZm9yIHRoZSBuZXh0IG9iamVjdCBmcm9tIHRoZSBjdXJzb3IsIHNraXBwaW5nIHRob3NlIHdob3NlXG4gIC8vIElEcyB3ZSd2ZSBhbHJlYWR5IHNlZW4gYW5kIHJlcGxhY2luZyBNb25nbyBhdG9tcyB3aXRoIE1ldGVvciBhdG9tcy5cbiAgYXN5bmMgX25leHRPYmplY3RQcm9taXNlICgpIHtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgdmFyIGRvYyA9IGF3YWl0IHRoaXMuX3Jhd05leHRPYmplY3RQcm9taXNlKCk7XG5cbiAgICAgIGlmICghZG9jKSByZXR1cm4gbnVsbDtcbiAgICAgIGRvYyA9IHJlcGxhY2VUeXBlcyhkb2MsIHJlcGxhY2VNb25nb0F0b21XaXRoTWV0ZW9yKTtcblxuICAgICAgaWYgKCF0aGlzLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnRhaWxhYmxlICYmICdfaWQnIGluIGRvYykge1xuICAgICAgICAvLyBEaWQgTW9uZ28gZ2l2ZSB1cyBkdXBsaWNhdGUgZG9jdW1lbnRzIGluIHRoZSBzYW1lIGN1cnNvcj8gSWYgc28sXG4gICAgICAgIC8vIGlnbm9yZSB0aGlzIG9uZS4gKERvIHRoaXMgYmVmb3JlIHRoZSB0cmFuc2Zvcm0sIHNpbmNlIHRyYW5zZm9ybSBtaWdodFxuICAgICAgICAvLyByZXR1cm4gc29tZSB1bnJlbGF0ZWQgdmFsdWUuKSBXZSBkb24ndCBkbyB0aGlzIGZvciB0YWlsYWJsZSBjdXJzb3JzLFxuICAgICAgICAvLyBiZWNhdXNlIHdlIHdhbnQgdG8gbWFpbnRhaW4gTygxKSBtZW1vcnkgdXNhZ2UuIEFuZCBpZiB0aGVyZSBpc24ndCBfaWRcbiAgICAgICAgLy8gZm9yIHNvbWUgcmVhc29uIChtYXliZSBpdCdzIHRoZSBvcGxvZyksIHRoZW4gd2UgZG9uJ3QgZG8gdGhpcyBlaXRoZXIuXG4gICAgICAgIC8vIChCZSBjYXJlZnVsIHRvIGRvIHRoaXMgZm9yIGZhbHNleSBidXQgZXhpc3RpbmcgX2lkLCB0aG91Z2guKVxuICAgICAgICBpZiAodGhpcy5fdmlzaXRlZElkcy5oYXMoZG9jLl9pZCkpIGNvbnRpbnVlO1xuICAgICAgICB0aGlzLl92aXNpdGVkSWRzLnNldChkb2MuX2lkLCB0cnVlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX3RyYW5zZm9ybSlcbiAgICAgICAgZG9jID0gdGhpcy5fdHJhbnNmb3JtKGRvYyk7XG5cbiAgICAgIHJldHVybiBkb2M7XG4gICAgfVxuICB9XG5cbiAgLy8gUmV0dXJucyBhIHByb21pc2Ugd2hpY2ggaXMgcmVzb2x2ZWQgd2l0aCB0aGUgbmV4dCBvYmplY3QgKGxpa2Ugd2l0aFxuICAvLyBfbmV4dE9iamVjdFByb21pc2UpIG9yIHJlamVjdGVkIGlmIHRoZSBjdXJzb3IgZG9lc24ndCByZXR1cm4gd2l0aGluXG4gIC8vIHRpbWVvdXRNUyBtcy5cbiAgX25leHRPYmplY3RQcm9taXNlV2l0aFRpbWVvdXQodGltZW91dE1TKSB7XG4gICAgY29uc3QgbmV4dE9iamVjdFByb21pc2UgPSB0aGlzLl9uZXh0T2JqZWN0UHJvbWlzZSgpO1xuICAgIGlmICghdGltZW91dE1TKSB7XG4gICAgICByZXR1cm4gbmV4dE9iamVjdFByb21pc2U7XG4gICAgfVxuXG4gICAgY29uc3QgdGltZW91dFByb21pc2UgPSBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgIC8vIE9uIHRpbWVvdXQsIGNsb3NlIHRoZSBjdXJzb3IuXG4gICAgICBjb25zdCB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgcmVzb2x2ZSh0aGlzLmNsb3NlKCkpO1xuICAgICAgfSwgdGltZW91dE1TKTtcblxuICAgICAgLy8gSWYgdGhlIGBfbmV4dE9iamVjdFByb21pc2VgIHJldHVybmVkIGZpcnN0LCBjYW5jZWwgdGhlIHRpbWVvdXQuXG4gICAgICBuZXh0T2JqZWN0UHJvbWlzZS5maW5hbGx5KCgpID0+IHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBQcm9taXNlLnJhY2UoW25leHRPYmplY3RQcm9taXNlLCB0aW1lb3V0UHJvbWlzZV0pO1xuICB9XG5cbiAgYXN5bmMgZm9yRWFjaChjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIC8vIEdldCBiYWNrIHRvIHRoZSBiZWdpbm5pbmcuXG4gICAgdGhpcy5fcmV3aW5kKCk7XG5cbiAgICBsZXQgaWR4ID0gMDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgY29uc3QgZG9jID0gYXdhaXQgdGhpcy5fbmV4dE9iamVjdFByb21pc2UoKTtcbiAgICAgIGlmICghZG9jKSByZXR1cm47XG4gICAgICBhd2FpdCBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIGRvYywgaWR4KyssIHRoaXMuX3NlbGZGb3JJdGVyYXRpb24pO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIG1hcChjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIGNvbnN0IHJlc3VsdHMgPSBbXTtcbiAgICBhd2FpdCB0aGlzLmZvckVhY2goYXN5bmMgKGRvYywgaW5kZXgpID0+IHtcbiAgICAgIHJlc3VsdHMucHVzaChhd2FpdCBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIGRvYywgaW5kZXgsIHRoaXMuX3NlbGZGb3JJdGVyYXRpb24pKTtcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgX3Jld2luZCgpIHtcbiAgICAvLyBrbm93biB0byBiZSBzeW5jaHJvbm91c1xuICAgIHRoaXMuX2RiQ3Vyc29yLnJld2luZCgpO1xuXG4gICAgdGhpcy5fdmlzaXRlZElkcyA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICB9XG5cbiAgLy8gTW9zdGx5IHVzYWJsZSBmb3IgdGFpbGFibGUgY3Vyc29ycy5cbiAgYXN5bmMgY2xvc2UoKSB7XG4gICAgdGhpcy5fY2xvc2luZyA9IHRydWU7XG4gICAgLy8gSWYgdGhlcmUncyBhIHBlbmRpbmcgbmV4dCgpLCB3YWl0IGZvciBpdCB0byBmaW5pc2ggb3IgYWJvcnRcbiAgICBpZiAodGhpcy5fcGVuZGluZ05leHQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMuX3BlbmRpbmdOZXh0O1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBpZ25vcmVcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fZGJDdXJzb3IuY2xvc2UoKTtcbiAgfVxuXG4gIGZldGNoKCkge1xuICAgIHJldHVybiB0aGlzLm1hcChkb2MgPT4gZG9jKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGSVhNRTogKG5vZGU6MzQ2ODApIFtNT05HT0RCIERSSVZFUl0gV2FybmluZzogY3Vyc29yLmNvdW50IGlzIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmVcbiAgICogIHJlbW92ZWQgaW4gdGhlIG5leHQgbWFqb3IgdmVyc2lvbiwgcGxlYXNlIHVzZSBgY29sbGVjdGlvbi5lc3RpbWF0ZWREb2N1bWVudENvdW50YCBvclxuICAgKiAgYGNvbGxlY3Rpb24uY291bnREb2N1bWVudHNgIGluc3RlYWQuXG4gICAqL1xuICBjb3VudCgpIHtcbiAgICByZXR1cm4gdGhpcy5fZGJDdXJzb3IuY291bnQoKTtcbiAgfVxuXG4gIC8vIFRoaXMgbWV0aG9kIGlzIE5PVCB3cmFwcGVkIGluIEN1cnNvci5cbiAgYXN5bmMgZ2V0UmF3T2JqZWN0cyhvcmRlcmVkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChvcmRlcmVkKSB7XG4gICAgICByZXR1cm4gc2VsZi5mZXRjaCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcmVzdWx0cyA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICAgICAgYXdhaXQgc2VsZi5mb3JFYWNoKGZ1bmN0aW9uIChkb2MpIHtcbiAgICAgICAgcmVzdWx0cy5zZXQoZG9jLl9pZCwgZG9jKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgfVxuICB9XG59IiwiaW1wb3J0IHsgQVNZTkNfQ1VSU09SX01FVEhPRFMsIGdldEFzeW5jTWV0aG9kTmFtZSB9IGZyb20gJ21ldGVvci9taW5pbW9uZ28vY29uc3RhbnRzJztcbmltcG9ydCB7IHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvLCByZXBsYWNlVHlwZXMgfSBmcm9tICcuL21vbmdvX2NvbW1vbic7XG5pbXBvcnQgTG9jYWxDb2xsZWN0aW9uIGZyb20gJ21ldGVvci9taW5pbW9uZ28vbG9jYWxfY29sbGVjdGlvbic7XG5pbXBvcnQgeyBDdXJzb3JEZXNjcmlwdGlvbiB9IGZyb20gJy4vY3Vyc29yX2Rlc2NyaXB0aW9uJztcbmltcG9ydCB7IE9ic2VydmVDYWxsYmFja3MsIE9ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzIH0gZnJvbSAnLi90eXBlcyc7XG5cbmludGVyZmFjZSBNb25nb0ludGVyZmFjZSB7XG4gIHJhd0NvbGxlY3Rpb246IChjb2xsZWN0aW9uTmFtZTogc3RyaW5nKSA9PiBhbnk7XG4gIF9jcmVhdGVBc3luY2hyb25vdXNDdXJzb3I6IChjdXJzb3JEZXNjcmlwdGlvbjogQ3Vyc29yRGVzY3JpcHRpb24sIG9wdGlvbnM6IEN1cnNvck9wdGlvbnMpID0+IGFueTtcbiAgX29ic2VydmVDaGFuZ2VzOiAoY3Vyc29yRGVzY3JpcHRpb246IEN1cnNvckRlc2NyaXB0aW9uLCBvcmRlcmVkOiBib29sZWFuLCBjYWxsYmFja3M6IGFueSwgbm9uTXV0YXRpbmdDYWxsYmFja3M/OiBib29sZWFuKSA9PiBhbnk7XG59XG5cbmludGVyZmFjZSBDdXJzb3JPcHRpb25zIHtcbiAgc2VsZkZvckl0ZXJhdGlvbjogQ3Vyc29yPGFueT47XG4gIHVzZVRyYW5zZm9ybTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBAY2xhc3MgQ3Vyc29yXG4gKlxuICogVGhlIG1haW4gY3Vyc29yIG9iamVjdCByZXR1cm5lZCBmcm9tIGZpbmQoKSwgaW1wbGVtZW50aW5nIHRoZSBkb2N1bWVudGVkXG4gKiBNb25nby5Db2xsZWN0aW9uIGN1cnNvciBBUEkuXG4gKlxuICogV3JhcHMgYSBDdXJzb3JEZXNjcmlwdGlvbiBhbmQgbGF6aWx5IGNyZWF0ZXMgYW4gQXN5bmNocm9ub3VzQ3Vyc29yXG4gKiAob25seSBjb250YWN0cyBNb25nb0RCIHdoZW4gbWV0aG9kcyBsaWtlIGZldGNoIG9yIGZvckVhY2ggYXJlIGNhbGxlZCkuXG4gKi9cbmV4cG9ydCBjbGFzcyBDdXJzb3I8VCwgVSA9IFQ+IHtcbiAgcHVibGljIF9tb25nbzogTW9uZ29JbnRlcmZhY2U7XG4gIHB1YmxpYyBfY3Vyc29yRGVzY3JpcHRpb246IEN1cnNvckRlc2NyaXB0aW9uO1xuICBwdWJsaWMgX3N5bmNocm9ub3VzQ3Vyc29yOiBhbnkgfCBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKG1vbmdvOiBNb25nb0ludGVyZmFjZSwgY3Vyc29yRGVzY3JpcHRpb246IEN1cnNvckRlc2NyaXB0aW9uKSB7XG4gICAgdGhpcy5fbW9uZ28gPSBtb25nbztcbiAgICB0aGlzLl9jdXJzb3JEZXNjcmlwdGlvbiA9IGN1cnNvckRlc2NyaXB0aW9uO1xuICAgIHRoaXMuX3N5bmNocm9ub3VzQ3Vyc29yID0gbnVsbDtcbiAgfVxuXG4gIGFzeW5jIGNvdW50QXN5bmMoKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCBjb2xsZWN0aW9uID0gdGhpcy5fbW9uZ28ucmF3Q29sbGVjdGlvbih0aGlzLl9jdXJzb3JEZXNjcmlwdGlvbi5jb2xsZWN0aW9uTmFtZSk7XG4gICAgcmV0dXJuIGF3YWl0IGNvbGxlY3Rpb24uY291bnREb2N1bWVudHMoXG4gICAgICByZXBsYWNlVHlwZXModGhpcy5fY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IsIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvKSxcbiAgICAgIHJlcGxhY2VUeXBlcyh0aGlzLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLCByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyksXG4gICAgKTtcbiAgfVxuXG4gIGNvdW50KCk6IG5ldmVyIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBcImNvdW50KCkgaXMgbm90IGF2YWlsYWJsZSBvbiB0aGUgc2VydmVyLiBQbGVhc2UgdXNlIGNvdW50QXN5bmMoKSBpbnN0ZWFkLlwiXG4gICAgKTtcbiAgfVxuXG4gIGdldFRyYW5zZm9ybSgpOiAoKGRvYzogYW55KSA9PiBhbnkpIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5fY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy50cmFuc2Zvcm07XG4gIH1cblxuICBfcHVibGlzaEN1cnNvcihzdWI6IGFueSk6IGFueSB7XG4gICAgY29uc3QgY29sbGVjdGlvbiA9IHRoaXMuX2N1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lO1xuICAgIHJldHVybiBNb25nby5Db2xsZWN0aW9uLl9wdWJsaXNoQ3Vyc29yKHRoaXMsIHN1YiwgY29sbGVjdGlvbik7XG4gIH1cblxuICBfZ2V0Q29sbGVjdGlvbk5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWU7XG4gIH1cblxuICBvYnNlcnZlKGNhbGxiYWNrczogT2JzZXJ2ZUNhbGxiYWNrczxVPik6IGFueSB7XG4gICAgcmV0dXJuIExvY2FsQ29sbGVjdGlvbi5fb2JzZXJ2ZUZyb21PYnNlcnZlQ2hhbmdlcyh0aGlzLCBjYWxsYmFja3MpO1xuICB9XG5cbiAgYXN5bmMgb2JzZXJ2ZUFzeW5jKGNhbGxiYWNrczogT2JzZXJ2ZUNhbGxiYWNrczxVPik6IFByb21pc2U8YW55PiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gcmVzb2x2ZSh0aGlzLm9ic2VydmUoY2FsbGJhY2tzKSkpO1xuICB9XG5cbiAgb2JzZXJ2ZUNoYW5nZXMoY2FsbGJhY2tzOiBPYnNlcnZlQ2hhbmdlc0NhbGxiYWNrczxVPiwgb3B0aW9uczogeyBub25NdXRhdGluZ0NhbGxiYWNrcz86IGJvb2xlYW4gfSA9IHt9KTogYW55IHtcbiAgICBjb25zdCBvcmRlcmVkID0gTG9jYWxDb2xsZWN0aW9uLl9vYnNlcnZlQ2hhbmdlc0NhbGxiYWNrc0FyZU9yZGVyZWQoY2FsbGJhY2tzKTtcbiAgICByZXR1cm4gdGhpcy5fbW9uZ28uX29ic2VydmVDaGFuZ2VzKFxuICAgICAgdGhpcy5fY3Vyc29yRGVzY3JpcHRpb24sXG4gICAgICBvcmRlcmVkLFxuICAgICAgY2FsbGJhY2tzLFxuICAgICAgb3B0aW9ucy5ub25NdXRhdGluZ0NhbGxiYWNrc1xuICAgICk7XG4gIH1cblxuICBhc3luYyBvYnNlcnZlQ2hhbmdlc0FzeW5jKGNhbGxiYWNrczogT2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3M8VT4sIG9wdGlvbnM6IHsgbm9uTXV0YXRpbmdDYWxsYmFja3M/OiBib29sZWFuIH0gPSB7fSk6IFByb21pc2U8YW55PiB7XG4gICAgcmV0dXJuIHRoaXMub2JzZXJ2ZUNoYW5nZXMoY2FsbGJhY2tzLCBvcHRpb25zKTtcbiAgfVxufVxuXG4vLyBBZGQgY3Vyc29yIG1ldGhvZHMgZHluYW1pY2FsbHlcblsuLi5BU1lOQ19DVVJTT1JfTUVUSE9EUywgU3ltYm9sLml0ZXJhdG9yLCBTeW1ib2wuYXN5bmNJdGVyYXRvcl0uZm9yRWFjaChtZXRob2ROYW1lID0+IHtcbiAgaWYgKG1ldGhvZE5hbWUgPT09ICdjb3VudCcpIHJldHVybjtcblxuICAoQ3Vyc29yLnByb3RvdHlwZSBhcyBhbnkpW21ldGhvZE5hbWVdID0gZnVuY3Rpb24odGhpczogQ3Vyc29yPGFueT4sIC4uLmFyZ3M6IGFueVtdKTogYW55IHtcbiAgICBjb25zdCBjdXJzb3IgPSBzZXR1cEFzeW5jaHJvbm91c0N1cnNvcih0aGlzLCBtZXRob2ROYW1lKTtcbiAgICByZXR1cm4gY3Vyc29yW21ldGhvZE5hbWVdKC4uLmFyZ3MpO1xuICB9O1xuXG4gIGlmIChtZXRob2ROYW1lID09PSBTeW1ib2wuaXRlcmF0b3IgfHwgbWV0aG9kTmFtZSA9PT0gU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHJldHVybjtcblxuICBjb25zdCBtZXRob2ROYW1lQXN5bmMgPSBnZXRBc3luY01ldGhvZE5hbWUobWV0aG9kTmFtZSk7XG5cbiAgKEN1cnNvci5wcm90b3R5cGUgYXMgYW55KVttZXRob2ROYW1lQXN5bmNdID0gZnVuY3Rpb24odGhpczogQ3Vyc29yPGFueT4sIC4uLmFyZ3M6IGFueVtdKTogUHJvbWlzZTxhbnk+IHtcbiAgICByZXR1cm4gdGhpc1ttZXRob2ROYW1lXSguLi5hcmdzKTtcbiAgfTtcbn0pO1xuXG5mdW5jdGlvbiBzZXR1cEFzeW5jaHJvbm91c0N1cnNvcihjdXJzb3I6IEN1cnNvcjxhbnk+LCBtZXRob2Q6IHN0cmluZyB8IHN5bWJvbCk6IGFueSB7XG4gIGlmIChjdXJzb3IuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMudGFpbGFibGUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBjYWxsICR7U3RyaW5nKG1ldGhvZCl9IG9uIGEgdGFpbGFibGUgY3Vyc29yYCk7XG4gIH1cblxuICBpZiAoIWN1cnNvci5fc3luY2hyb25vdXNDdXJzb3IpIHtcbiAgICBjdXJzb3IuX3N5bmNocm9ub3VzQ3Vyc29yID0gY3Vyc29yLl9tb25nby5fY3JlYXRlQXN5bmNocm9ub3VzQ3Vyc29yKFxuICAgICAgY3Vyc29yLl9jdXJzb3JEZXNjcmlwdGlvbixcbiAgICAgIHtcbiAgICAgICAgc2VsZkZvckl0ZXJhdGlvbjogY3Vyc29yLFxuICAgICAgICB1c2VUcmFuc2Zvcm06IHRydWUsXG4gICAgICB9XG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiBjdXJzb3IuX3N5bmNocm9ub3VzQ3Vyc29yO1xufSIsIi8vIHNpbmdsZXRvblxuZXhwb3J0IGNvbnN0IExvY2FsQ29sbGVjdGlvbkRyaXZlciA9IG5ldyAoY2xhc3MgTG9jYWxDb2xsZWN0aW9uRHJpdmVyIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5ub0Nvbm5Db2xsZWN0aW9ucyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIH1cblxuICBvcGVuKG5hbWUsIGNvbm4pIHtcbiAgICBpZiAoISBuYW1lKSB7XG4gICAgICByZXR1cm4gbmV3IExvY2FsQ29sbGVjdGlvbjtcbiAgICB9XG5cbiAgICBpZiAoISBjb25uKSB7XG4gICAgICByZXR1cm4gZW5zdXJlQ29sbGVjdGlvbihuYW1lLCB0aGlzLm5vQ29ubkNvbGxlY3Rpb25zKTtcbiAgICB9XG5cbiAgICBpZiAoISBjb25uLl9tb25nb19saXZlZGF0YV9jb2xsZWN0aW9ucykge1xuICAgICAgY29ubi5fbW9uZ29fbGl2ZWRhdGFfY29sbGVjdGlvbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIH1cblxuICAgIC8vIFhYWCBpcyB0aGVyZSBhIHdheSB0byBrZWVwIHRyYWNrIG9mIGEgY29ubmVjdGlvbidzIGNvbGxlY3Rpb25zIHdpdGhvdXRcbiAgICAvLyBkYW5nbGluZyBpdCBvZmYgdGhlIGNvbm5lY3Rpb24gb2JqZWN0P1xuICAgIHJldHVybiBlbnN1cmVDb2xsZWN0aW9uKG5hbWUsIGNvbm4uX21vbmdvX2xpdmVkYXRhX2NvbGxlY3Rpb25zKTtcbiAgfVxufSk7XG5cbmZ1bmN0aW9uIGVuc3VyZUNvbGxlY3Rpb24obmFtZSwgY29sbGVjdGlvbnMpIHtcbiAgcmV0dXJuIChuYW1lIGluIGNvbGxlY3Rpb25zKVxuICAgID8gY29sbGVjdGlvbnNbbmFtZV1cbiAgICA6IGNvbGxlY3Rpb25zW25hbWVdID0gbmV3IExvY2FsQ29sbGVjdGlvbihuYW1lKTtcbn1cbiIsImltcG9ydCBvbmNlIGZyb20gJ2xvZGFzaC5vbmNlJztcbmltcG9ydCB7XG4gIEFTWU5DX0NPTExFQ1RJT05fTUVUSE9EUyxcbiAgZ2V0QXN5bmNNZXRob2ROYW1lLFxuICBDTElFTlRfT05MWV9NRVRIT0RTXG59IGZyb20gXCJtZXRlb3IvbWluaW1vbmdvL2NvbnN0YW50c1wiO1xuaW1wb3J0IHsgTW9uZ29Db25uZWN0aW9uIH0gZnJvbSAnLi9tb25nb19jb25uZWN0aW9uJztcblxuLy8gRGVmaW5lIGludGVyZmFjZXMgYW5kIHR5cGVzXG5pbnRlcmZhY2UgSUNvbm5lY3Rpb25PcHRpb25zIHtcbiAgb3Bsb2dVcmw/OiBzdHJpbmc7XG4gIFtrZXk6IHN0cmluZ106IHVua25vd247ICAvLyBDaGFuZ2VkIGZyb20gJ2FueScgdG8gJ3Vua25vd24nIGZvciBiZXR0ZXIgdHlwZSBzYWZldHlcbn1cblxuaW50ZXJmYWNlIElNb25nb0ludGVybmFscyB7XG4gIFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXI6IHR5cGVvZiBSZW1vdGVDb2xsZWN0aW9uRHJpdmVyO1xuICBkZWZhdWx0UmVtb3RlQ29sbGVjdGlvbkRyaXZlcjogKCkgPT4gUmVtb3RlQ29sbGVjdGlvbkRyaXZlcjtcbn1cblxuLy8gTW9yZSBzcGVjaWZpYyB0eXBpbmcgZm9yIGNvbGxlY3Rpb24gbWV0aG9kc1xudHlwZSBNb25nb01ldGhvZEZ1bmN0aW9uID0gKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdW5rbm93bjtcbmludGVyZmFjZSBJQ29sbGVjdGlvbk1ldGhvZHMge1xuICBba2V5OiBzdHJpbmddOiBNb25nb01ldGhvZEZ1bmN0aW9uO1xufVxuXG4vLyBUeXBlIGZvciBNb25nb0Nvbm5lY3Rpb25cbmludGVyZmFjZSBJTW9uZ29DbGllbnQge1xuICBjb25uZWN0OiAoKSA9PiBQcm9taXNlPHZvaWQ+O1xufVxuXG5pbnRlcmZhY2UgSU1vbmdvQ29ubmVjdGlvbiB7XG4gIGNsaWVudDogSU1vbmdvQ2xpZW50O1xuICBba2V5OiBzdHJpbmddOiBNb25nb01ldGhvZEZ1bmN0aW9uIHwgSU1vbmdvQ2xpZW50O1xufVxuXG5kZWNsYXJlIGdsb2JhbCB7XG4gIG5hbWVzcGFjZSBOb2RlSlMge1xuICAgIGludGVyZmFjZSBQcm9jZXNzRW52IHtcbiAgICAgIE1PTkdPX1VSTDogc3RyaW5nO1xuICAgICAgTU9OR09fT1BMT0dfVVJMPzogc3RyaW5nO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IE1vbmdvSW50ZXJuYWxzOiBJTW9uZ29JbnRlcm5hbHM7XG4gIGNvbnN0IE1ldGVvcjoge1xuICAgIHN0YXJ0dXA6IChjYWxsYmFjazogKCkgPT4gUHJvbWlzZTx2b2lkPikgPT4gdm9pZDtcbiAgfTtcbn1cblxuY2xhc3MgUmVtb3RlQ29sbGVjdGlvbkRyaXZlciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgbW9uZ286IE1vbmdvQ29ubmVjdGlvbjtcblxuICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBSRU1PVEVfQ09MTEVDVElPTl9NRVRIT0RTID0gW1xuICAgICdjcmVhdGVDYXBwZWRDb2xsZWN0aW9uQXN5bmMnLFxuICAgICdkcm9wSW5kZXhBc3luYycsXG4gICAgJ2Vuc3VyZUluZGV4QXN5bmMnLFxuICAgICdjcmVhdGVJbmRleEFzeW5jJyxcbiAgICAnY291bnREb2N1bWVudHMnLFxuICAgICdkcm9wQ29sbGVjdGlvbkFzeW5jJyxcbiAgICAnZXN0aW1hdGVkRG9jdW1lbnRDb3VudCcsXG4gICAgJ2ZpbmQnLFxuICAgICdmaW5kT25lQXN5bmMnLFxuICAgICdpbnNlcnRBc3luYycsXG4gICAgJ3Jhd0NvbGxlY3Rpb24nLFxuICAgICdyZW1vdmVBc3luYycsXG4gICAgJ3VwZGF0ZUFzeW5jJyxcbiAgICAndXBzZXJ0QXN5bmMnLFxuICBdIGFzIGNvbnN0O1xuXG4gIGNvbnN0cnVjdG9yKG1vbmdvVXJsOiBzdHJpbmcsIG9wdGlvbnM6IElDb25uZWN0aW9uT3B0aW9ucykge1xuICAgIHRoaXMubW9uZ28gPSBuZXcgTW9uZ29Db25uZWN0aW9uKG1vbmdvVXJsLCBvcHRpb25zKTtcbiAgfVxuXG4gIHB1YmxpYyBvcGVuKG5hbWU6IHN0cmluZyk6IElDb2xsZWN0aW9uTWV0aG9kcyB7XG4gICAgY29uc3QgcmV0OiBJQ29sbGVjdGlvbk1ldGhvZHMgPSB7fTtcblxuICAgIC8vIEhhbmRsZSByZW1vdGUgY29sbGVjdGlvbiBtZXRob2RzXG4gICAgUmVtb3RlQ29sbGVjdGlvbkRyaXZlci5SRU1PVEVfQ09MTEVDVElPTl9NRVRIT0RTLmZvckVhY2goKG1ldGhvZCkgPT4ge1xuICAgICAgLy8gVHlwZSBhc3NlcnRpb24gbmVlZGVkIGJlY2F1c2Ugd2Uga25vdyB0aGVzZSBtZXRob2RzIGV4aXN0IG9uIE1vbmdvQ29ubmVjdGlvblxuICAgICAgY29uc3QgbW9uZ29NZXRob2QgPSB0aGlzLm1vbmdvW21ldGhvZF0gYXMgTW9uZ29NZXRob2RGdW5jdGlvbjtcbiAgICAgIHJldFttZXRob2RdID0gbW9uZ29NZXRob2QuYmluZCh0aGlzLm1vbmdvLCBuYW1lKTtcblxuICAgICAgaWYgKCFBU1lOQ19DT0xMRUNUSU9OX01FVEhPRFMuaW5jbHVkZXMobWV0aG9kKSkgcmV0dXJuO1xuXG4gICAgICBjb25zdCBhc3luY01ldGhvZE5hbWUgPSBnZXRBc3luY01ldGhvZE5hbWUobWV0aG9kKTtcbiAgICAgIHJldFthc3luY01ldGhvZE5hbWVdID0gKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gcmV0W21ldGhvZF0oLi4uYXJncyk7XG4gICAgfSk7XG5cbiAgICAvLyBIYW5kbGUgY2xpZW50LW9ubHkgbWV0aG9kc1xuICAgIENMSUVOVF9PTkxZX01FVEhPRFMuZm9yRWFjaCgobWV0aG9kKSA9PiB7XG4gICAgICByZXRbbWV0aG9kXSA9ICguLi5hcmdzOiB1bmtub3duW10pOiBuZXZlciA9PiB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgJHttZXRob2R9IGlzIG5vdCBhdmFpbGFibGUgb24gdGhlIHNlcnZlci4gUGxlYXNlIHVzZSAke2dldEFzeW5jTWV0aG9kTmFtZShcbiAgICAgICAgICAgIG1ldGhvZFxuICAgICAgICAgICl9KCkgaW5zdGVhZC5gXG4gICAgICAgICk7XG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJldDtcbiAgfVxufVxuXG4vLyBBc3NpZ24gdGhlIGNsYXNzIHRvIE1vbmdvSW50ZXJuYWxzXG5Nb25nb0ludGVybmFscy5SZW1vdGVDb2xsZWN0aW9uRHJpdmVyID0gUmVtb3RlQ29sbGVjdGlvbkRyaXZlcjtcblxuLy8gQ3JlYXRlIHRoZSBzaW5nbGV0b24gUmVtb3RlQ29sbGVjdGlvbkRyaXZlciBvbmx5IG9uIGRlbWFuZFxuTW9uZ29JbnRlcm5hbHMuZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIgPSBvbmNlKCgpOiBSZW1vdGVDb2xsZWN0aW9uRHJpdmVyID0+IHtcbiAgY29uc3QgY29ubmVjdGlvbk9wdGlvbnM6IElDb25uZWN0aW9uT3B0aW9ucyA9IHt9O1xuICBjb25zdCBtb25nb1VybCA9IHByb2Nlc3MuZW52Lk1PTkdPX1VSTDtcblxuICBpZiAoIW1vbmdvVXJsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTU9OR09fVVJMIG11c3QgYmUgc2V0IGluIGVudmlyb25tZW50XCIpO1xuICB9XG5cbiAgaWYgKHByb2Nlc3MuZW52Lk1PTkdPX09QTE9HX1VSTCkge1xuICAgIGNvbm5lY3Rpb25PcHRpb25zLm9wbG9nVXJsID0gcHJvY2Vzcy5lbnYuTU9OR09fT1BMT0dfVVJMO1xuICB9XG5cbiAgY29uc3QgZHJpdmVyID0gbmV3IFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIobW9uZ29VcmwsIGNvbm5lY3Rpb25PcHRpb25zKTtcblxuICAvLyBJbml0aWFsaXplIGRhdGFiYXNlIGNvbm5lY3Rpb24gb24gc3RhcnR1cFxuICBNZXRlb3Iuc3RhcnR1cChhc3luYyAoKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgYXdhaXQgZHJpdmVyLm1vbmdvLmNsaWVudC5jb25uZWN0KCk7XG4gIH0pO1xuXG4gIHJldHVybiBkcml2ZXI7XG59KTtcblxuZXhwb3J0IHsgUmVtb3RlQ29sbGVjdGlvbkRyaXZlciwgSUNvbm5lY3Rpb25PcHRpb25zLCBJQ29sbGVjdGlvbk1ldGhvZHMgfTsiLCJpbXBvcnQgeyBub3JtYWxpemVQcm9qZWN0aW9uIH0gZnJvbSBcIi4uL21vbmdvX3V0aWxzXCI7XG5pbXBvcnQgeyBBc3luY01ldGhvZHMgfSBmcm9tICcuL21ldGhvZHNfYXN5bmMnO1xuaW1wb3J0IHsgU3luY01ldGhvZHMgfSBmcm9tICcuL21ldGhvZHNfc3luYyc7XG5pbXBvcnQgeyBJbmRleE1ldGhvZHMgfSBmcm9tICcuL21ldGhvZHNfaW5kZXgnO1xuaW1wb3J0IHtcbiAgSURfR0VORVJBVE9SUyxcbiAgbm9ybWFsaXplT3B0aW9ucyxcbiAgc2V0dXBBdXRvcHVibGlzaCxcbiAgc2V0dXBDb25uZWN0aW9uLFxuICBzZXR1cERyaXZlcixcbiAgc2V0dXBNdXRhdGlvbk1ldGhvZHMsXG4gIHZhbGlkYXRlQ29sbGVjdGlvbk5hbWVcbn0gZnJvbSAnLi9jb2xsZWN0aW9uX3V0aWxzJztcbmltcG9ydCB7IFJlcGxpY2F0aW9uTWV0aG9kcyB9IGZyb20gJy4vbWV0aG9kc19yZXBsaWNhdGlvbic7XG5cbi8qKlxuICogQHN1bW1hcnkgTmFtZXNwYWNlIGZvciBNb25nb0RCLXJlbGF0ZWQgaXRlbXNcbiAqIEBuYW1lc3BhY2VcbiAqL1xuTW9uZ28gPSB7fTtcblxuLyoqXG4gKiBAc3VtbWFyeSBDb25zdHJ1Y3RvciBmb3IgYSBDb2xsZWN0aW9uXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBpbnN0YW5jZW5hbWUgY29sbGVjdGlvblxuICogQGNsYXNzXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgY29sbGVjdGlvbi4gIElmIG51bGwsIGNyZWF0ZXMgYW4gdW5tYW5hZ2VkICh1bnN5bmNocm9uaXplZCkgbG9jYWwgY29sbGVjdGlvbi5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zLmNvbm5lY3Rpb24gVGhlIHNlcnZlciBjb25uZWN0aW9uIHRoYXQgd2lsbCBtYW5hZ2UgdGhpcyBjb2xsZWN0aW9uLiBVc2VzIHRoZSBkZWZhdWx0IGNvbm5lY3Rpb24gaWYgbm90IHNwZWNpZmllZC4gIFBhc3MgdGhlIHJldHVybiB2YWx1ZSBvZiBjYWxsaW5nIFtgRERQLmNvbm5lY3RgXSgjRERQLWNvbm5lY3QpIHRvIHNwZWNpZnkgYSBkaWZmZXJlbnQgc2VydmVyLiBQYXNzIGBudWxsYCB0byBzcGVjaWZ5IG5vIGNvbm5lY3Rpb24uIFVubWFuYWdlZCAoYG5hbWVgIGlzIG51bGwpIGNvbGxlY3Rpb25zIGNhbm5vdCBzcGVjaWZ5IGEgY29ubmVjdGlvbi5cbiAqIEBwYXJhbSB7U3RyaW5nfSBvcHRpb25zLmlkR2VuZXJhdGlvbiBUaGUgbWV0aG9kIG9mIGdlbmVyYXRpbmcgdGhlIGBfaWRgIGZpZWxkcyBvZiBuZXcgZG9jdW1lbnRzIGluIHRoaXMgY29sbGVjdGlvbi4gIFBvc3NpYmxlIHZhbHVlczpcblxuIC0gKipgJ1NUUklORydgKio6IHJhbmRvbSBzdHJpbmdzXG4gLSAqKmAnTU9OR08nYCoqOiAgcmFuZG9tIFtgTW9uZ28uT2JqZWN0SURgXSgjbW9uZ29fb2JqZWN0X2lkKSB2YWx1ZXNcblxuVGhlIGRlZmF1bHQgaWQgZ2VuZXJhdGlvbiB0ZWNobmlxdWUgaXMgYCdTVFJJTkcnYC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IG9wdGlvbnMudHJhbnNmb3JtIEFuIG9wdGlvbmFsIHRyYW5zZm9ybWF0aW9uIGZ1bmN0aW9uLiBEb2N1bWVudHMgd2lsbCBiZSBwYXNzZWQgdGhyb3VnaCB0aGlzIGZ1bmN0aW9uIGJlZm9yZSBiZWluZyByZXR1cm5lZCBmcm9tIGBmZXRjaGAgb3IgYGZpbmRPbmVBc3luY2AsIGFuZCBiZWZvcmUgYmVpbmcgcGFzc2VkIHRvIGNhbGxiYWNrcyBvZiBgb2JzZXJ2ZWAsIGBtYXBgLCBgZm9yRWFjaGAsIGBhbGxvd2AsIGFuZCBgZGVueWAuIFRyYW5zZm9ybXMgYXJlICpub3QqIGFwcGxpZWQgZm9yIHRoZSBjYWxsYmFja3Mgb2YgYG9ic2VydmVDaGFuZ2VzYCBvciB0byBjdXJzb3JzIHJldHVybmVkIGZyb20gcHVibGlzaCBmdW5jdGlvbnMuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMuZGVmaW5lTXV0YXRpb25NZXRob2RzIFNldCB0byBgZmFsc2VgIHRvIHNraXAgc2V0dGluZyB1cCB0aGUgbXV0YXRpb24gbWV0aG9kcyB0aGF0IGVuYWJsZSBpbnNlcnQvdXBkYXRlL3JlbW92ZSBmcm9tIGNsaWVudCBjb2RlLiBEZWZhdWx0IGB0cnVlYC5cbiAqL1xuLy8gTWFpbiBDb2xsZWN0aW9uIGNvbnN0cnVjdG9yXG5Nb25nby5Db2xsZWN0aW9uID0gZnVuY3Rpb24gQ29sbGVjdGlvbihuYW1lLCBvcHRpb25zKSB7XG4gIG5hbWUgPSB2YWxpZGF0ZUNvbGxlY3Rpb25OYW1lKG5hbWUpO1xuXG4gIG9wdGlvbnMgPSBub3JtYWxpemVPcHRpb25zKG9wdGlvbnMpO1xuXG4gIHRoaXMuX21ha2VOZXdJRCA9IElEX0dFTkVSQVRPUlNbb3B0aW9ucy5pZEdlbmVyYXRpb25dPy4obmFtZSk7XG5cbiAgdGhpcy5fdHJhbnNmb3JtID0gTG9jYWxDb2xsZWN0aW9uLndyYXBUcmFuc2Zvcm0ob3B0aW9ucy50cmFuc2Zvcm0pO1xuICB0aGlzLnJlc29sdmVyVHlwZSA9IG9wdGlvbnMucmVzb2x2ZXJUeXBlO1xuXG4gIHRoaXMuX2Nvbm5lY3Rpb24gPSBzZXR1cENvbm5lY3Rpb24obmFtZSwgb3B0aW9ucyk7XG5cbiAgY29uc3QgZHJpdmVyID0gc2V0dXBEcml2ZXIobmFtZSwgdGhpcy5fY29ubmVjdGlvbiwgb3B0aW9ucyk7XG4gIHRoaXMuX2RyaXZlciA9IGRyaXZlcjtcblxuICB0aGlzLl9jb2xsZWN0aW9uID0gZHJpdmVyLm9wZW4obmFtZSwgdGhpcy5fY29ubmVjdGlvbik7XG4gIHRoaXMuX25hbWUgPSBuYW1lO1xuXG4gIHRoaXMuX3NldHRpbmdVcFJlcGxpY2F0aW9uUHJvbWlzZSA9IHRoaXMuX21heWJlU2V0VXBSZXBsaWNhdGlvbihuYW1lLCBvcHRpb25zKTtcblxuICBzZXR1cE11dGF0aW9uTWV0aG9kcyh0aGlzLCBuYW1lLCBvcHRpb25zKTtcblxuICBzZXR1cEF1dG9wdWJsaXNoKHRoaXMsIG5hbWUsIG9wdGlvbnMpO1xuXG4gIE1vbmdvLl9jb2xsZWN0aW9ucy5zZXQobmFtZSwgdGhpcyk7XG59O1xuXG5PYmplY3QuYXNzaWduKE1vbmdvLkNvbGxlY3Rpb24ucHJvdG90eXBlLCB7XG4gIF9nZXRGaW5kU2VsZWN0b3IoYXJncykge1xuICAgIGlmIChhcmdzLmxlbmd0aCA9PSAwKSByZXR1cm4ge307XG4gICAgZWxzZSByZXR1cm4gYXJnc1swXTtcbiAgfSxcblxuICBfZ2V0RmluZE9wdGlvbnMoYXJncykge1xuICAgIGNvbnN0IFssIG9wdGlvbnNdID0gYXJncyB8fCBbXTtcbiAgICBjb25zdCBuZXdPcHRpb25zID0gbm9ybWFsaXplUHJvamVjdGlvbihvcHRpb25zKTtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoYXJncy5sZW5ndGggPCAyKSB7XG4gICAgICByZXR1cm4geyB0cmFuc2Zvcm06IHNlbGYuX3RyYW5zZm9ybSB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBjaGVjayhcbiAgICAgICAgbmV3T3B0aW9ucyxcbiAgICAgICAgTWF0Y2guT3B0aW9uYWwoXG4gICAgICAgICAgTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHtcbiAgICAgICAgICAgIHByb2plY3Rpb246IE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9uZU9mKE9iamVjdCwgdW5kZWZpbmVkKSksXG4gICAgICAgICAgICBzb3J0OiBNYXRjaC5PcHRpb25hbChcbiAgICAgICAgICAgICAgTWF0Y2guT25lT2YoT2JqZWN0LCBBcnJheSwgRnVuY3Rpb24sIHVuZGVmaW5lZClcbiAgICAgICAgICAgICksXG4gICAgICAgICAgICBsaW1pdDogTWF0Y2guT3B0aW9uYWwoTWF0Y2guT25lT2YoTnVtYmVyLCB1bmRlZmluZWQpKSxcbiAgICAgICAgICAgIHNraXA6IE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9uZU9mKE51bWJlciwgdW5kZWZpbmVkKSksXG4gICAgICAgICAgfSlcbiAgICAgICAgKVxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHJhbnNmb3JtOiBzZWxmLl90cmFuc2Zvcm0sXG4gICAgICAgIC4uLm5ld09wdGlvbnMsXG4gICAgICB9O1xuICAgIH1cbiAgfSxcbn0pO1xuXG5PYmplY3QuYXNzaWduKE1vbmdvLkNvbGxlY3Rpb24sIHtcbiAgYXN5bmMgX3B1Ymxpc2hDdXJzb3IoY3Vyc29yLCBzdWIsIGNvbGxlY3Rpb24pIHtcbiAgICB2YXIgb2JzZXJ2ZUhhbmRsZSA9IGF3YWl0IGN1cnNvci5vYnNlcnZlQ2hhbmdlcyhcbiAgICAgICAge1xuICAgICAgICAgIGFkZGVkOiBmdW5jdGlvbihpZCwgZmllbGRzKSB7XG4gICAgICAgICAgICBzdWIuYWRkZWQoY29sbGVjdGlvbiwgaWQsIGZpZWxkcyk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBjaGFuZ2VkOiBmdW5jdGlvbihpZCwgZmllbGRzKSB7XG4gICAgICAgICAgICBzdWIuY2hhbmdlZChjb2xsZWN0aW9uLCBpZCwgZmllbGRzKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIHJlbW92ZWQ6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgICAgICBzdWIucmVtb3ZlZChjb2xsZWN0aW9uLCBpZCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgLy8gUHVibGljYXRpb25zIGRvbid0IG11dGF0ZSB0aGUgZG9jdW1lbnRzXG4gICAgICAgIC8vIFRoaXMgaXMgdGVzdGVkIGJ5IHRoZSBgbGl2ZWRhdGEgLSBwdWJsaXNoIGNhbGxiYWNrcyBjbG9uZWAgdGVzdFxuICAgICAgICB7IG5vbk11dGF0aW5nQ2FsbGJhY2tzOiB0cnVlIH1cbiAgICApO1xuXG4gICAgLy8gV2UgZG9uJ3QgY2FsbCBzdWIucmVhZHkoKSBoZXJlOiBpdCBnZXRzIGNhbGxlZCBpbiBsaXZlZGF0YV9zZXJ2ZXIsIGFmdGVyXG4gICAgLy8gcG9zc2libHkgY2FsbGluZyBfcHVibGlzaEN1cnNvciBvbiBtdWx0aXBsZSByZXR1cm5lZCBjdXJzb3JzLlxuXG4gICAgLy8gcmVnaXN0ZXIgc3RvcCBjYWxsYmFjayAoZXhwZWN0cyBsYW1iZGEgdy8gbm8gYXJncykuXG4gICAgc3ViLm9uU3RvcChhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBhd2FpdCBvYnNlcnZlSGFuZGxlLnN0b3AoKTtcbiAgICB9KTtcblxuICAgIC8vIHJldHVybiB0aGUgb2JzZXJ2ZUhhbmRsZSBpbiBjYXNlIGl0IG5lZWRzIHRvIGJlIHN0b3BwZWQgZWFybHlcbiAgICByZXR1cm4gb2JzZXJ2ZUhhbmRsZTtcbiAgfSxcblxuICAvLyBwcm90ZWN0IGFnYWluc3QgZGFuZ2Vyb3VzIHNlbGVjdG9ycy4gIGZhbHNleSBhbmQge19pZDogZmFsc2V5fSBhcmUgYm90aFxuICAvLyBsaWtlbHkgcHJvZ3JhbW1lciBlcnJvciwgYW5kIG5vdCB3aGF0IHlvdSB3YW50LCBwYXJ0aWN1bGFybHkgZm9yIGRlc3RydWN0aXZlXG4gIC8vIG9wZXJhdGlvbnMuIElmIGEgZmFsc2V5IF9pZCBpcyBzZW50IGluLCBhIG5ldyBzdHJpbmcgX2lkIHdpbGwgYmVcbiAgLy8gZ2VuZXJhdGVkIGFuZCByZXR1cm5lZDsgaWYgYSBmYWxsYmFja0lkIGlzIHByb3ZpZGVkLCBpdCB3aWxsIGJlIHJldHVybmVkXG4gIC8vIGluc3RlYWQuXG4gIF9yZXdyaXRlU2VsZWN0b3Ioc2VsZWN0b3IsIHsgZmFsbGJhY2tJZCB9ID0ge30pIHtcbiAgICAvLyBzaG9ydGhhbmQgLS0gc2NhbGFycyBtYXRjaCBfaWRcbiAgICBpZiAoTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWQoc2VsZWN0b3IpKSBzZWxlY3RvciA9IHsgX2lkOiBzZWxlY3RvciB9O1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoc2VsZWN0b3IpKSB7XG4gICAgICAvLyBUaGlzIGlzIGNvbnNpc3RlbnQgd2l0aCB0aGUgTW9uZ28gY29uc29sZSBpdHNlbGY7IGlmIHdlIGRvbid0IGRvIHRoaXNcbiAgICAgIC8vIGNoZWNrIHBhc3NpbmcgYW4gZW1wdHkgYXJyYXkgZW5kcyB1cCBzZWxlY3RpbmcgYWxsIGl0ZW1zXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNb25nbyBzZWxlY3RvciBjYW4ndCBiZSBhbiBhcnJheS5cIik7XG4gICAgfVxuXG4gICAgaWYgKCFzZWxlY3RvciB8fCAoJ19pZCcgaW4gc2VsZWN0b3IgJiYgIXNlbGVjdG9yLl9pZCkpIHtcbiAgICAgIC8vIGNhbid0IG1hdGNoIGFueXRoaW5nXG4gICAgICByZXR1cm4geyBfaWQ6IGZhbGxiYWNrSWQgfHwgUmFuZG9tLmlkKCkgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2VsZWN0b3I7XG4gIH0sXG59KTtcblxuT2JqZWN0LmFzc2lnbihNb25nby5Db2xsZWN0aW9uLnByb3RvdHlwZSwgUmVwbGljYXRpb25NZXRob2RzLCBTeW5jTWV0aG9kcywgQXN5bmNNZXRob2RzLCBJbmRleE1ldGhvZHMpO1xuXG5PYmplY3QuYXNzaWduKE1vbmdvLkNvbGxlY3Rpb24ucHJvdG90eXBlLCB7XG4gIC8vIERldGVybWluZSBpZiB0aGlzIGNvbGxlY3Rpb24gaXMgc2ltcGx5IGEgbWluaW1vbmdvIHJlcHJlc2VudGF0aW9uIG9mIGEgcmVhbFxuICAvLyBkYXRhYmFzZSBvbiBhbm90aGVyIHNlcnZlclxuICBfaXNSZW1vdGVDb2xsZWN0aW9uKCkge1xuICAgIC8vIFhYWCBzZWUgI01ldGVvclNlcnZlck51bGxcbiAgICByZXR1cm4gdGhpcy5fY29ubmVjdGlvbiAmJiB0aGlzLl9jb25uZWN0aW9uICE9PSBNZXRlb3Iuc2VydmVyO1xuICB9LFxuXG4gIGFzeW5jIGRyb3BDb2xsZWN0aW9uQXN5bmMoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICghc2VsZi5fY29sbGVjdGlvbi5kcm9wQ29sbGVjdGlvbkFzeW5jKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW4gb25seSBjYWxsIGRyb3BDb2xsZWN0aW9uQXN5bmMgb24gc2VydmVyIGNvbGxlY3Rpb25zJyk7XG4gICBhd2FpdCBzZWxmLl9jb2xsZWN0aW9uLmRyb3BDb2xsZWN0aW9uQXN5bmMoKTtcbiAgfSxcblxuICBhc3luYyBjcmVhdGVDYXBwZWRDb2xsZWN0aW9uQXN5bmMoYnl0ZVNpemUsIG1heERvY3VtZW50cykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoISBhd2FpdCBzZWxmLl9jb2xsZWN0aW9uLmNyZWF0ZUNhcHBlZENvbGxlY3Rpb25Bc3luYylcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ0NhbiBvbmx5IGNhbGwgY3JlYXRlQ2FwcGVkQ29sbGVjdGlvbkFzeW5jIG9uIHNlcnZlciBjb2xsZWN0aW9ucydcbiAgICAgICk7XG4gICAgYXdhaXQgc2VsZi5fY29sbGVjdGlvbi5jcmVhdGVDYXBwZWRDb2xsZWN0aW9uQXN5bmMoYnl0ZVNpemUsIG1heERvY3VtZW50cyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFJldHVybnMgdGhlIFtgQ29sbGVjdGlvbmBdKGh0dHA6Ly9tb25nb2RiLmdpdGh1Yi5pby9ub2RlLW1vbmdvZGItbmF0aXZlLzMuMC9hcGkvQ29sbGVjdGlvbi5odG1sKSBvYmplY3QgY29ycmVzcG9uZGluZyB0byB0aGlzIGNvbGxlY3Rpb24gZnJvbSB0aGUgW25wbSBgbW9uZ29kYmAgZHJpdmVyIG1vZHVsZV0oaHR0cHM6Ly93d3cubnBtanMuY29tL3BhY2thZ2UvbW9uZ29kYikgd2hpY2ggaXMgd3JhcHBlZCBieSBgTW9uZ28uQ29sbGVjdGlvbmAuXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlcm9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqL1xuICByYXdDb2xsZWN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoIXNlbGYuX2NvbGxlY3Rpb24ucmF3Q29sbGVjdGlvbikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW4gb25seSBjYWxsIHJhd0NvbGxlY3Rpb24gb24gc2VydmVyIGNvbGxlY3Rpb25zJyk7XG4gICAgfVxuICAgIHJldHVybiBzZWxmLl9jb2xsZWN0aW9uLnJhd0NvbGxlY3Rpb24oKTtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgUmV0dXJucyB0aGUgW2BEYmBdKGh0dHA6Ly9tb25nb2RiLmdpdGh1Yi5pby9ub2RlLW1vbmdvZGItbmF0aXZlLzMuMC9hcGkvRGIuaHRtbCkgb2JqZWN0IGNvcnJlc3BvbmRpbmcgdG8gdGhpcyBjb2xsZWN0aW9uJ3MgZGF0YWJhc2UgY29ubmVjdGlvbiBmcm9tIHRoZSBbbnBtIGBtb25nb2RiYCBkcml2ZXIgbW9kdWxlXShodHRwczovL3d3dy5ucG1qcy5jb20vcGFja2FnZS9tb25nb2RiKSB3aGljaCBpcyB3cmFwcGVkIGJ5IGBNb25nby5Db2xsZWN0aW9uYC5cbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICovXG4gIHJhd0RhdGFiYXNlKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoIShzZWxmLl9kcml2ZXIubW9uZ28gJiYgc2VsZi5fZHJpdmVyLm1vbmdvLmRiKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW4gb25seSBjYWxsIHJhd0RhdGFiYXNlIG9uIHNlcnZlciBjb2xsZWN0aW9ucycpO1xuICAgIH1cbiAgICByZXR1cm4gc2VsZi5fZHJpdmVyLm1vbmdvLmRiO1xuICB9LFxufSk7XG5cbk9iamVjdC5hc3NpZ24oTW9uZ28sIHtcbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFJldHJpZXZlIGEgTWV0ZW9yIGNvbGxlY3Rpb24gaW5zdGFuY2UgYnkgbmFtZS4gT25seSBjb2xsZWN0aW9ucyBkZWZpbmVkIHdpdGggW2BuZXcgTW9uZ28uQ29sbGVjdGlvbiguLi4pYF0oI2NvbGxlY3Rpb25zKSBhcmUgYXZhaWxhYmxlIHdpdGggdGhpcyBtZXRob2QuIEZvciBwbGFpbiBNb25nb0RCIGNvbGxlY3Rpb25zLCB5b3UnbGwgd2FudCB0byBsb29rIGF0IFtgcmF3RGF0YWJhc2UoKWBdKCNNb25nby1Db2xsZWN0aW9uLXJhd0RhdGFiYXNlKS5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJvZiBNb25nb1xuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE5hbWUgb2YgeW91ciBjb2xsZWN0aW9uIGFzIGl0IHdhcyBkZWZpbmVkIHdpdGggYG5ldyBNb25nby5Db2xsZWN0aW9uKClgLlxuICAgKiBAcmV0dXJucyB7TW9uZ28uQ29sbGVjdGlvbiB8IHVuZGVmaW5lZH1cbiAgICovXG4gIGdldENvbGxlY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLl9jb2xsZWN0aW9ucy5nZXQobmFtZSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEEgcmVjb3JkIG9mIGFsbCBkZWZpbmVkIE1vbmdvLkNvbGxlY3Rpb24gaW5zdGFuY2VzLCBpbmRleGVkIGJ5IGNvbGxlY3Rpb24gbmFtZS5cbiAgICogQHR5cGUge01hcDxzdHJpbmcsIE1vbmdvLkNvbGxlY3Rpb24+fVxuICAgKiBAbWVtYmVyb2YgTW9uZ29cbiAgICogQHByb3RlY3RlZFxuICAgKi9cbiAgX2NvbGxlY3Rpb25zOiBuZXcgTWFwKCksXG59KVxuXG5cblxuLyoqXG4gKiBAc3VtbWFyeSBDcmVhdGUgYSBNb25nby1zdHlsZSBgT2JqZWN0SURgLiAgSWYgeW91IGRvbid0IHNwZWNpZnkgYSBgaGV4U3RyaW5nYCwgdGhlIGBPYmplY3RJRGAgd2lsbCBiZSBnZW5lcmF0ZWQgcmFuZG9tbHkgKG5vdCB1c2luZyBNb25nb0RCJ3MgSUQgY29uc3RydWN0aW9uIHJ1bGVzKS5cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQGNsYXNzXG4gKiBAcGFyYW0ge1N0cmluZ30gW2hleFN0cmluZ10gT3B0aW9uYWwuICBUaGUgMjQtY2hhcmFjdGVyIGhleGFkZWNpbWFsIGNvbnRlbnRzIG9mIHRoZSBPYmplY3RJRCB0byBjcmVhdGVcbiAqL1xuTW9uZ28uT2JqZWN0SUQgPSBNb25nb0lELk9iamVjdElEO1xuXG4vKipcbiAqIEBzdW1tYXJ5IFRvIGNyZWF0ZSBhIGN1cnNvciwgdXNlIGZpbmQuIFRvIGFjY2VzcyB0aGUgZG9jdW1lbnRzIGluIGEgY3Vyc29yLCB1c2UgZm9yRWFjaCwgbWFwLCBvciBmZXRjaC5cbiAqIEBjbGFzc1xuICogQGluc3RhbmNlTmFtZSBjdXJzb3JcbiAqL1xuTW9uZ28uQ3Vyc29yID0gTG9jYWxDb2xsZWN0aW9uLkN1cnNvcjtcblxuLyoqXG4gKiBAZGVwcmVjYXRlZCBpbiAwLjkuMVxuICovXG5Nb25nby5Db2xsZWN0aW9uLkN1cnNvciA9IE1vbmdvLkN1cnNvcjtcblxuLyoqXG4gKiBAZGVwcmVjYXRlZCBpbiAwLjkuMVxuICovXG5Nb25nby5Db2xsZWN0aW9uLk9iamVjdElEID0gTW9uZ28uT2JqZWN0SUQ7XG5cbi8qKlxuICogQGRlcHJlY2F0ZWQgaW4gMC45LjFcbiAqL1xuTWV0ZW9yLkNvbGxlY3Rpb24gPSBNb25nby5Db2xsZWN0aW9uO1xuXG5cbi8vIEFsbG93IGRlbnkgc3R1ZmYgaXMgbm93IGluIHRoZSBhbGxvdy1kZW55IHBhY2thZ2Vcbk9iamVjdC5hc3NpZ24oTW9uZ28uQ29sbGVjdGlvbi5wcm90b3R5cGUsIEFsbG93RGVueS5Db2xsZWN0aW9uUHJvdG90eXBlKTtcbiIsImV4cG9ydCBjb25zdCBJRF9HRU5FUkFUT1JTID0ge1xuICBNT05HTyhuYW1lKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3Qgc3JjID0gbmFtZSA/IEREUC5yYW5kb21TdHJlYW0oJy9jb2xsZWN0aW9uLycgKyBuYW1lKSA6IFJhbmRvbS5pbnNlY3VyZTtcbiAgICAgIHJldHVybiBuZXcgTW9uZ28uT2JqZWN0SUQoc3JjLmhleFN0cmluZygyNCkpO1xuICAgIH1cbiAgfSxcbiAgU1RSSU5HKG5hbWUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCBzcmMgPSBuYW1lID8gRERQLnJhbmRvbVN0cmVhbSgnL2NvbGxlY3Rpb24vJyArIG5hbWUpIDogUmFuZG9tLmluc2VjdXJlO1xuICAgICAgcmV0dXJuIHNyYy5pZCgpO1xuICAgIH1cbiAgfVxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIHNldHVwQ29ubmVjdGlvbihuYW1lLCBvcHRpb25zKSB7XG4gIGlmICghbmFtZSB8fCBvcHRpb25zLmNvbm5lY3Rpb24gPT09IG51bGwpIHJldHVybiBudWxsO1xuICBpZiAob3B0aW9ucy5jb25uZWN0aW9uKSByZXR1cm4gb3B0aW9ucy5jb25uZWN0aW9uO1xuICByZXR1cm4gTWV0ZW9yLmlzQ2xpZW50ID8gTWV0ZW9yLmNvbm5lY3Rpb24gOiBNZXRlb3Iuc2VydmVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBEcml2ZXIobmFtZSwgY29ubmVjdGlvbiwgb3B0aW9ucykge1xuICBpZiAob3B0aW9ucy5fZHJpdmVyKSByZXR1cm4gb3B0aW9ucy5fZHJpdmVyO1xuXG4gIGlmIChuYW1lICYmXG4gICAgY29ubmVjdGlvbiA9PT0gTWV0ZW9yLnNlcnZlciAmJlxuICAgIHR5cGVvZiBNb25nb0ludGVybmFscyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICBNb25nb0ludGVybmFscy5kZWZhdWx0UmVtb3RlQ29sbGVjdGlvbkRyaXZlcikge1xuICAgIHJldHVybiBNb25nb0ludGVybmFscy5kZWZhdWx0UmVtb3RlQ29sbGVjdGlvbkRyaXZlcigpO1xuICB9XG5cbiAgY29uc3QgeyBMb2NhbENvbGxlY3Rpb25Ecml2ZXIgfSA9IHJlcXVpcmUoJy4uL2xvY2FsX2NvbGxlY3Rpb25fZHJpdmVyLmpzJyk7XG4gIHJldHVybiBMb2NhbENvbGxlY3Rpb25Ecml2ZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cEF1dG9wdWJsaXNoKGNvbGxlY3Rpb24sIG5hbWUsIG9wdGlvbnMpIHtcbiAgaWYgKFBhY2thZ2UuYXV0b3B1Ymxpc2ggJiZcbiAgICAhb3B0aW9ucy5fcHJldmVudEF1dG9wdWJsaXNoICYmXG4gICAgY29sbGVjdGlvbi5fY29ubmVjdGlvbiAmJlxuICAgIGNvbGxlY3Rpb24uX2Nvbm5lY3Rpb24ucHVibGlzaCkge1xuICAgIGNvbGxlY3Rpb24uX2Nvbm5lY3Rpb24ucHVibGlzaChudWxsLCAoKSA9PiBjb2xsZWN0aW9uLmZpbmQoKSwge1xuICAgICAgaXNfYXV0bzogdHJ1ZVxuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cE11dGF0aW9uTWV0aG9kcyhjb2xsZWN0aW9uLCBuYW1lLCBvcHRpb25zKSB7XG4gIGlmIChvcHRpb25zLmRlZmluZU11dGF0aW9uTWV0aG9kcyA9PT0gZmFsc2UpIHJldHVybjtcblxuICB0cnkge1xuICAgIGNvbGxlY3Rpb24uX2RlZmluZU11dGF0aW9uTWV0aG9kcyh7XG4gICAgICB1c2VFeGlzdGluZzogb3B0aW9ucy5fc3VwcHJlc3NTYW1lTmFtZUVycm9yID09PSB0cnVlXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKGVycm9yLm1lc3NhZ2UgPT09IGBBIG1ldGhvZCBuYW1lZCAnLyR7bmFtZX0vaW5zZXJ0QXN5bmMnIGlzIGFscmVhZHkgZGVmaW5lZGApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlcmUgaXMgYWxyZWFkeSBhIGNvbGxlY3Rpb24gbmFtZWQgXCIke25hbWV9XCJgKTtcbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlQ29sbGVjdGlvbk5hbWUobmFtZSkge1xuICBpZiAoIW5hbWUgJiYgbmFtZSAhPT0gbnVsbCkge1xuICAgIE1ldGVvci5fZGVidWcoXG4gICAgICAnV2FybmluZzogY3JlYXRpbmcgYW5vbnltb3VzIGNvbGxlY3Rpb24uIEl0IHdpbGwgbm90IGJlICcgK1xuICAgICAgJ3NhdmVkIG9yIHN5bmNocm9uaXplZCBvdmVyIHRoZSBuZXR3b3JrLiAoUGFzcyBudWxsIGZvciAnICtcbiAgICAgICd0aGUgY29sbGVjdGlvbiBuYW1lIHRvIHR1cm4gb2ZmIHRoaXMgd2FybmluZy4pJ1xuICAgICk7XG4gICAgbmFtZSA9IG51bGw7XG4gIH1cblxuICBpZiAobmFtZSAhPT0gbnVsbCAmJiB0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnRmlyc3QgYXJndW1lbnQgdG8gbmV3IE1vbmdvLkNvbGxlY3Rpb24gbXVzdCBiZSBhIHN0cmluZyBvciBudWxsJ1xuICAgICk7XG4gIH1cblxuICByZXR1cm4gbmFtZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZU9wdGlvbnMob3B0aW9ucykge1xuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLm1ldGhvZHMpIHtcbiAgICAvLyBCYWNrd2FyZHMgY29tcGF0aWJpbGl0eSBoYWNrIHdpdGggb3JpZ2luYWwgc2lnbmF0dXJlXG4gICAgb3B0aW9ucyA9IHsgY29ubmVjdGlvbjogb3B0aW9ucyB9O1xuICB9XG4gIC8vIEJhY2t3YXJkcyBjb21wYXRpYmlsaXR5OiBcImNvbm5lY3Rpb25cIiB1c2VkIHRvIGJlIGNhbGxlZCBcIm1hbmFnZXJcIi5cbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5tYW5hZ2VyICYmICFvcHRpb25zLmNvbm5lY3Rpb24pIHtcbiAgICBvcHRpb25zLmNvbm5lY3Rpb24gPSBvcHRpb25zLm1hbmFnZXI7XG4gIH1cblxuICBjb25zdCBjbGVhbmVkT3B0aW9ucyA9IE9iamVjdC5mcm9tRW50cmllcyhcbiAgICBPYmplY3QuZW50cmllcyhvcHRpb25zIHx8IHt9KS5maWx0ZXIoKFtfLCB2XSkgPT4gdiAhPT0gdW5kZWZpbmVkKSxcbiAgKTtcblxuICAvLyAyKSBTcHJlYWQgZGVmYXVsdHMgZmlyc3QsIHRoZW4gb25seSB0aGUgZGVmaW5lZCBvdmVycmlkZXNcbiAgcmV0dXJuIHtcbiAgICBjb25uZWN0aW9uOiB1bmRlZmluZWQsXG4gICAgaWRHZW5lcmF0aW9uOiAnU1RSSU5HJyxcbiAgICB0cmFuc2Zvcm06IG51bGwsXG4gICAgX2RyaXZlcjogdW5kZWZpbmVkLFxuICAgIF9wcmV2ZW50QXV0b3B1Ymxpc2g6IGZhbHNlLFxuICAgIC4uLmNsZWFuZWRPcHRpb25zLFxuICB9O1xufVxuIiwiZXhwb3J0IGNvbnN0IEFzeW5jTWV0aG9kcyA9IHtcbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEZpbmRzIHRoZSBmaXJzdCBkb2N1bWVudCB0aGF0IG1hdGNoZXMgdGhlIHNlbGVjdG9yLCBhcyBvcmRlcmVkIGJ5IHNvcnQgYW5kIHNraXAgb3B0aW9ucy4gUmV0dXJucyBgdW5kZWZpbmVkYCBpZiBubyBtYXRjaGluZyBkb2N1bWVudCBpcyBmb3VuZC5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgZmluZE9uZUFzeW5jXG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IFtzZWxlY3Rvcl0gQSBxdWVyeSBkZXNjcmliaW5nIHRoZSBkb2N1bWVudHMgdG8gZmluZFxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gICAqIEBwYXJhbSB7TW9uZ29Tb3J0U3BlY2lmaWVyfSBvcHRpb25zLnNvcnQgU29ydCBvcmRlciAoZGVmYXVsdDogbmF0dXJhbCBvcmRlcilcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMuc2tpcCBOdW1iZXIgb2YgcmVzdWx0cyB0byBza2lwIGF0IHRoZSBiZWdpbm5pbmdcbiAgICogQHBhcmFtIHtNb25nb0ZpZWxkU3BlY2lmaWVyfSBvcHRpb25zLmZpZWxkcyBEaWN0aW9uYXJ5IG9mIGZpZWxkcyB0byByZXR1cm4gb3IgZXhjbHVkZS5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnJlYWN0aXZlIChDbGllbnQgb25seSkgRGVmYXVsdCB0cnVlOyBwYXNzIGZhbHNlIHRvIGRpc2FibGUgcmVhY3Rpdml0eVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcHRpb25zLnRyYW5zZm9ybSBPdmVycmlkZXMgYHRyYW5zZm9ybWAgb24gdGhlIFtgQ29sbGVjdGlvbmBdKCNjb2xsZWN0aW9ucykgZm9yIHRoaXMgY3Vyc29yLiAgUGFzcyBgbnVsbGAgdG8gZGlzYWJsZSB0cmFuc2Zvcm1hdGlvbi5cbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdGlvbnMucmVhZFByZWZlcmVuY2UgKFNlcnZlciBvbmx5KSBTcGVjaWZpZXMgYSBjdXN0b20gTW9uZ29EQiBbYHJlYWRQcmVmZXJlbmNlYF0oaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9jb3JlL3JlYWQtcHJlZmVyZW5jZSkgZm9yIGZldGNoaW5nIHRoZSBkb2N1bWVudC4gUG9zc2libGUgdmFsdWVzIGFyZSBgcHJpbWFyeWAsIGBwcmltYXJ5UHJlZmVycmVkYCwgYHNlY29uZGFyeWAsIGBzZWNvbmRhcnlQcmVmZXJyZWRgIGFuZCBgbmVhcmVzdGAuXG4gICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAqL1xuICBmaW5kT25lQXN5bmMoLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLl9jb2xsZWN0aW9uLmZpbmRPbmVBc3luYyhcbiAgICAgIHRoaXMuX2dldEZpbmRTZWxlY3RvcihhcmdzKSxcbiAgICAgIHRoaXMuX2dldEZpbmRPcHRpb25zKGFyZ3MpXG4gICAgKTtcbiAgfSxcblxuICBfaW5zZXJ0QXN5bmMoZG9jLCBvcHRpb25zID0ge30pIHtcbiAgICAvLyBNYWtlIHN1cmUgd2Ugd2VyZSBwYXNzZWQgYSBkb2N1bWVudCB0byBpbnNlcnRcbiAgICBpZiAoIWRvYykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbnNlcnQgcmVxdWlyZXMgYW4gYXJndW1lbnQnKTtcbiAgICB9XG5cbiAgICAvLyBNYWtlIGEgc2hhbGxvdyBjbG9uZSBvZiB0aGUgZG9jdW1lbnQsIHByZXNlcnZpbmcgaXRzIHByb3RvdHlwZS5cbiAgICBkb2MgPSBPYmplY3QuY3JlYXRlKFxuICAgICAgT2JqZWN0LmdldFByb3RvdHlwZU9mKGRvYyksXG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhkb2MpXG4gICAgKTtcblxuICAgIGlmICgnX2lkJyBpbiBkb2MpIHtcbiAgICAgIGlmIChcbiAgICAgICAgIWRvYy5faWQgfHxcbiAgICAgICAgISh0eXBlb2YgZG9jLl9pZCA9PT0gJ3N0cmluZycgfHwgZG9jLl9pZCBpbnN0YW5jZW9mIE1vbmdvLk9iamVjdElEKVxuICAgICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnTWV0ZW9yIHJlcXVpcmVzIGRvY3VtZW50IF9pZCBmaWVsZHMgdG8gYmUgbm9uLWVtcHR5IHN0cmluZ3Mgb3IgT2JqZWN0SURzJ1xuICAgICAgICApO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgZ2VuZXJhdGVJZCA9IHRydWU7XG5cbiAgICAgIC8vIERvbid0IGdlbmVyYXRlIHRoZSBpZCBpZiB3ZSdyZSB0aGUgY2xpZW50IGFuZCB0aGUgJ291dGVybW9zdCcgY2FsbFxuICAgICAgLy8gVGhpcyBvcHRpbWl6YXRpb24gc2F2ZXMgdXMgcGFzc2luZyBib3RoIHRoZSByYW5kb21TZWVkIGFuZCB0aGUgaWRcbiAgICAgIC8vIFBhc3NpbmcgYm90aCBpcyByZWR1bmRhbnQuXG4gICAgICBpZiAodGhpcy5faXNSZW1vdGVDb2xsZWN0aW9uKCkpIHtcbiAgICAgICAgY29uc3QgZW5jbG9zaW5nID0gRERQLl9DdXJyZW50TWV0aG9kSW52b2NhdGlvbi5nZXQoKTtcbiAgICAgICAgaWYgKCFlbmNsb3NpbmcpIHtcbiAgICAgICAgICBnZW5lcmF0ZUlkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGdlbmVyYXRlSWQpIHtcbiAgICAgICAgZG9jLl9pZCA9IHRoaXMuX21ha2VOZXdJRCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE9uIGluc2VydHMsIGFsd2F5cyByZXR1cm4gdGhlIGlkIHRoYXQgd2UgZ2VuZXJhdGVkOyBvbiBhbGwgb3RoZXJcbiAgICAvLyBvcGVyYXRpb25zLCBqdXN0IHJldHVybiB0aGUgcmVzdWx0IGZyb20gdGhlIGNvbGxlY3Rpb24uXG4gICAgdmFyIGNob29zZVJldHVyblZhbHVlRnJvbUNvbGxlY3Rpb25SZXN1bHQgPSBmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgIGlmIChNZXRlb3IuX2lzUHJvbWlzZShyZXN1bHQpKSByZXR1cm4gcmVzdWx0O1xuXG4gICAgICBpZiAoZG9jLl9pZCkge1xuICAgICAgICByZXR1cm4gZG9jLl9pZDtcbiAgICAgIH1cblxuICAgICAgLy8gWFhYIHdoYXQgaXMgdGhpcyBmb3I/P1xuICAgICAgLy8gSXQncyBzb21lIGl0ZXJhY3Rpb24gYmV0d2VlbiB0aGUgY2FsbGJhY2sgdG8gX2NhbGxNdXRhdG9yTWV0aG9kIGFuZFxuICAgICAgLy8gdGhlIHJldHVybiB2YWx1ZSBjb252ZXJzaW9uXG4gICAgICBkb2MuX2lkID0gcmVzdWx0O1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICBpZiAodGhpcy5faXNSZW1vdGVDb2xsZWN0aW9uKCkpIHtcbiAgICAgIGNvbnN0IHByb21pc2UgPSB0aGlzLl9jYWxsTXV0YXRvck1ldGhvZEFzeW5jKCdpbnNlcnRBc3luYycsIFtkb2NdLCBvcHRpb25zKTtcbiAgICAgIHByb21pc2UudGhlbihjaG9vc2VSZXR1cm5WYWx1ZUZyb21Db2xsZWN0aW9uUmVzdWx0KTtcbiAgICAgIHByb21pc2Uuc3R1YlByb21pc2UgPSBwcm9taXNlLnN0dWJQcm9taXNlLnRoZW4oY2hvb3NlUmV0dXJuVmFsdWVGcm9tQ29sbGVjdGlvblJlc3VsdCk7XG4gICAgICBwcm9taXNlLnNlcnZlclByb21pc2UgPSBwcm9taXNlLnNlcnZlclByb21pc2UudGhlbihjaG9vc2VSZXR1cm5WYWx1ZUZyb21Db2xsZWN0aW9uUmVzdWx0KTtcbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cblxuICAgIC8vIGl0J3MgbXkgY29sbGVjdGlvbi4gIGRlc2NlbmQgaW50byB0aGUgY29sbGVjdGlvbiBvYmplY3RcbiAgICAvLyBhbmQgcHJvcGFnYXRlIGFueSBleGNlcHRpb24uXG4gICAgcmV0dXJuIHRoaXMuX2NvbGxlY3Rpb24uaW5zZXJ0QXN5bmMoZG9jKVxuICAgICAgLnRoZW4oY2hvb3NlUmV0dXJuVmFsdWVGcm9tQ29sbGVjdGlvblJlc3VsdCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEluc2VydCBhIGRvY3VtZW50IGluIHRoZSBjb2xsZWN0aW9uLiAgUmV0dXJucyBhIHByb21pc2UgdGhhdCB3aWxsIHJldHVybiB0aGUgZG9jdW1lbnQncyB1bmlxdWUgX2lkIHdoZW4gc29sdmVkLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCAgaW5zZXJ0XG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge09iamVjdH0gZG9jIFRoZSBkb2N1bWVudCB0byBpbnNlcnQuIE1heSBub3QgeWV0IGhhdmUgYW4gX2lkIGF0dHJpYnV0ZSwgaW4gd2hpY2ggY2FzZSBNZXRlb3Igd2lsbCBnZW5lcmF0ZSBvbmUgZm9yIHlvdS5cbiAgICovXG4gIGluc2VydEFzeW5jKGRvYywgb3B0aW9ucykge1xuICAgIHJldHVybiB0aGlzLl9pbnNlcnRBc3luYyhkb2MsIG9wdGlvbnMpO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IE1vZGlmeSBvbmUgb3IgbW9yZSBkb2N1bWVudHMgaW4gdGhlIGNvbGxlY3Rpb24uIFJldHVybnMgdGhlIG51bWJlciBvZiBtYXRjaGVkIGRvY3VtZW50cy5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgdXBkYXRlXG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IHNlbGVjdG9yIFNwZWNpZmllcyB3aGljaCBkb2N1bWVudHMgdG8gbW9kaWZ5XG4gICAqIEBwYXJhbSB7TW9uZ29Nb2RpZmllcn0gbW9kaWZpZXIgU3BlY2lmaWVzIGhvdyB0byBtb2RpZnkgdGhlIGRvY3VtZW50c1xuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5tdWx0aSBUcnVlIHRvIG1vZGlmeSBhbGwgbWF0Y2hpbmcgZG9jdW1lbnRzOyBmYWxzZSB0byBvbmx5IG1vZGlmeSBvbmUgb2YgdGhlIG1hdGNoaW5nIGRvY3VtZW50cyAodGhlIGRlZmF1bHQpLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMudXBzZXJ0IFRydWUgdG8gaW5zZXJ0IGEgZG9jdW1lbnQgaWYgbm8gbWF0Y2hpbmcgZG9jdW1lbnRzIGFyZSBmb3VuZC5cbiAgICogQHBhcmFtIHtBcnJheX0gb3B0aW9ucy5hcnJheUZpbHRlcnMgT3B0aW9uYWwuIFVzZWQgaW4gY29tYmluYXRpb24gd2l0aCBNb25nb0RCIFtmaWx0ZXJlZCBwb3NpdGlvbmFsIG9wZXJhdG9yXShodHRwczovL2RvY3MubW9uZ29kYi5jb20vbWFudWFsL3JlZmVyZW5jZS9vcGVyYXRvci91cGRhdGUvcG9zaXRpb25hbC1maWx0ZXJlZC8pIHRvIHNwZWNpZnkgd2hpY2ggZWxlbWVudHMgdG8gbW9kaWZ5IGluIGFuIGFycmF5IGZpZWxkLlxuICAgKi9cbiAgdXBkYXRlQXN5bmMoc2VsZWN0b3IsIG1vZGlmaWVyLCAuLi5vcHRpb25zQW5kQ2FsbGJhY2spIHtcblxuICAgIC8vIFdlJ3ZlIGFscmVhZHkgcG9wcGVkIG9mZiB0aGUgY2FsbGJhY2ssIHNvIHdlIGFyZSBsZWZ0IHdpdGggYW4gYXJyYXlcbiAgICAvLyBvZiBvbmUgb3IgemVybyBpdGVtc1xuICAgIGNvbnN0IG9wdGlvbnMgPSB7IC4uLihvcHRpb25zQW5kQ2FsbGJhY2tbMF0gfHwgbnVsbCkgfTtcbiAgICBsZXQgaW5zZXJ0ZWRJZDtcbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLnVwc2VydCkge1xuICAgICAgLy8gc2V0IGBpbnNlcnRlZElkYCBpZiBhYnNlbnQuICBgaW5zZXJ0ZWRJZGAgaXMgYSBNZXRlb3IgZXh0ZW5zaW9uLlxuICAgICAgaWYgKG9wdGlvbnMuaW5zZXJ0ZWRJZCkge1xuICAgICAgICBpZiAoXG4gICAgICAgICAgIShcbiAgICAgICAgICAgIHR5cGVvZiBvcHRpb25zLmluc2VydGVkSWQgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICAgICBvcHRpb25zLmluc2VydGVkSWQgaW5zdGFuY2VvZiBNb25nby5PYmplY3RJRFxuICAgICAgICAgIClcbiAgICAgICAgKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignaW5zZXJ0ZWRJZCBtdXN0IGJlIHN0cmluZyBvciBPYmplY3RJRCcpO1xuICAgICAgICBpbnNlcnRlZElkID0gb3B0aW9ucy5pbnNlcnRlZElkO1xuICAgICAgfSBlbHNlIGlmICghc2VsZWN0b3IgfHwgIXNlbGVjdG9yLl9pZCkge1xuICAgICAgICBpbnNlcnRlZElkID0gdGhpcy5fbWFrZU5ld0lEKCk7XG4gICAgICAgIG9wdGlvbnMuZ2VuZXJhdGVkSWQgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLmluc2VydGVkSWQgPSBpbnNlcnRlZElkO1xuICAgICAgfVxuICAgIH1cblxuICAgIHNlbGVjdG9yID0gTW9uZ28uQ29sbGVjdGlvbi5fcmV3cml0ZVNlbGVjdG9yKHNlbGVjdG9yLCB7XG4gICAgICBmYWxsYmFja0lkOiBpbnNlcnRlZElkLFxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMuX2lzUmVtb3RlQ29sbGVjdGlvbigpKSB7XG4gICAgICBjb25zdCBhcmdzID0gW3NlbGVjdG9yLCBtb2RpZmllciwgb3B0aW9uc107XG5cbiAgICAgIHJldHVybiB0aGlzLl9jYWxsTXV0YXRvck1ldGhvZEFzeW5jKCd1cGRhdGVBc3luYycsIGFyZ3MsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8vIGl0J3MgbXkgY29sbGVjdGlvbi4gIGRlc2NlbmQgaW50byB0aGUgY29sbGVjdGlvbiBvYmplY3RcbiAgICAvLyBhbmQgcHJvcGFnYXRlIGFueSBleGNlcHRpb24uXG4gICAgLy8gSWYgdGhlIHVzZXIgcHJvdmlkZWQgYSBjYWxsYmFjayBhbmQgdGhlIGNvbGxlY3Rpb24gaW1wbGVtZW50cyB0aGlzXG4gICAgLy8gb3BlcmF0aW9uIGFzeW5jaHJvbm91c2x5LCB0aGVuIHF1ZXJ5UmV0IHdpbGwgYmUgdW5kZWZpbmVkLCBhbmQgdGhlXG4gICAgLy8gcmVzdWx0IHdpbGwgYmUgcmV0dXJuZWQgdGhyb3VnaCB0aGUgY2FsbGJhY2sgaW5zdGVhZC5cblxuICAgIHJldHVybiB0aGlzLl9jb2xsZWN0aW9uLnVwZGF0ZUFzeW5jKFxuICAgICAgc2VsZWN0b3IsXG4gICAgICBtb2RpZmllcixcbiAgICAgIG9wdGlvbnNcbiAgICApO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBBc3luY2hyb25vdXNseSByZW1vdmVzIGRvY3VtZW50cyBmcm9tIHRoZSBjb2xsZWN0aW9uLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCByZW1vdmVcbiAgICogQG1lbWJlcm9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7TW9uZ29TZWxlY3Rvcn0gc2VsZWN0b3IgU3BlY2lmaWVzIHdoaWNoIGRvY3VtZW50cyB0byByZW1vdmVcbiAgICovXG4gIHJlbW92ZUFzeW5jKHNlbGVjdG9yLCBvcHRpb25zID0ge30pIHtcbiAgICBzZWxlY3RvciA9IE1vbmdvLkNvbGxlY3Rpb24uX3Jld3JpdGVTZWxlY3RvcihzZWxlY3Rvcik7XG5cbiAgICBpZiAodGhpcy5faXNSZW1vdGVDb2xsZWN0aW9uKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9jYWxsTXV0YXRvck1ldGhvZEFzeW5jKCdyZW1vdmVBc3luYycsIFtzZWxlY3Rvcl0sIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8vIGl0J3MgbXkgY29sbGVjdGlvbi4gIGRlc2NlbmQgaW50byB0aGUgY29sbGVjdGlvbjEgb2JqZWN0XG4gICAgLy8gYW5kIHByb3BhZ2F0ZSBhbnkgZXhjZXB0aW9uLlxuICAgIHJldHVybiB0aGlzLl9jb2xsZWN0aW9uLnJlbW92ZUFzeW5jKHNlbGVjdG9yKTtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgQXN5bmNocm9ub3VzbHkgbW9kaWZpZXMgb25lIG9yIG1vcmUgZG9jdW1lbnRzIGluIHRoZSBjb2xsZWN0aW9uLCBvciBpbnNlcnQgb25lIGlmIG5vIG1hdGNoaW5nIGRvY3VtZW50cyB3ZXJlIGZvdW5kLiBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIGtleXMgYG51bWJlckFmZmVjdGVkYCAodGhlIG51bWJlciBvZiBkb2N1bWVudHMgbW9kaWZpZWQpICBhbmQgYGluc2VydGVkSWRgICh0aGUgdW5pcXVlIF9pZCBvZiB0aGUgZG9jdW1lbnQgdGhhdCB3YXMgaW5zZXJ0ZWQsIGlmIGFueSkuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWV0aG9kIHVwc2VydFxuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtNb25nb1NlbGVjdG9yfSBzZWxlY3RvciBTcGVjaWZpZXMgd2hpY2ggZG9jdW1lbnRzIHRvIG1vZGlmeVxuICAgKiBAcGFyYW0ge01vbmdvTW9kaWZpZXJ9IG1vZGlmaWVyIFNwZWNpZmllcyBob3cgdG8gbW9kaWZ5IHRoZSBkb2N1bWVudHNcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMubXVsdGkgVHJ1ZSB0byBtb2RpZnkgYWxsIG1hdGNoaW5nIGRvY3VtZW50czsgZmFsc2UgdG8gb25seSBtb2RpZnkgb25lIG9mIHRoZSBtYXRjaGluZyBkb2N1bWVudHMgKHRoZSBkZWZhdWx0KS5cbiAgICovXG4gIGFzeW5jIHVwc2VydEFzeW5jKHNlbGVjdG9yLCBtb2RpZmllciwgb3B0aW9ucykge1xuICAgIHJldHVybiB0aGlzLnVwZGF0ZUFzeW5jKFxuICAgICAgc2VsZWN0b3IsXG4gICAgICBtb2RpZmllcixcbiAgICAgIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgX3JldHVybk9iamVjdDogdHJ1ZSxcbiAgICAgICAgdXBzZXJ0OiB0cnVlLFxuICAgICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEdldHMgdGhlIG51bWJlciBvZiBkb2N1bWVudHMgbWF0Y2hpbmcgdGhlIGZpbHRlci4gRm9yIGEgZmFzdCBjb3VudCBvZiB0aGUgdG90YWwgZG9jdW1lbnRzIGluIGEgY29sbGVjdGlvbiBzZWUgYGVzdGltYXRlZERvY3VtZW50Q291bnRgLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCBjb3VudERvY3VtZW50c1xuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtNb25nb1NlbGVjdG9yfSBbc2VsZWN0b3JdIEEgcXVlcnkgZGVzY3JpYmluZyB0aGUgZG9jdW1lbnRzIHRvIGNvdW50XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gQWxsIG9wdGlvbnMgYXJlIGxpc3RlZCBpbiBbTW9uZ29EQiBkb2N1bWVudGF0aW9uXShodHRwczovL21vbmdvZGIuZ2l0aHViLmlvL25vZGUtbW9uZ29kYi1uYXRpdmUvNC4xMS9pbnRlcmZhY2VzL0NvdW50RG9jdW1lbnRzT3B0aW9ucy5odG1sKS4gUGxlYXNlIG5vdGUgdGhhdCBub3QgYWxsIG9mIHRoZW0gYXJlIGF2YWlsYWJsZSBvbiB0aGUgY2xpZW50LlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZTxudW1iZXI+fVxuICAgKi9cbiAgY291bnREb2N1bWVudHMoLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLl9jb2xsZWN0aW9uLmNvdW50RG9jdW1lbnRzKC4uLmFyZ3MpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBHZXRzIGFuIGVzdGltYXRlIG9mIHRoZSBjb3VudCBvZiBkb2N1bWVudHMgaW4gYSBjb2xsZWN0aW9uIHVzaW5nIGNvbGxlY3Rpb24gbWV0YWRhdGEuIEZvciBhbiBleGFjdCBjb3VudCBvZiB0aGUgZG9jdW1lbnRzIGluIGEgY29sbGVjdGlvbiBzZWUgYGNvdW50RG9jdW1lbnRzYC5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgZXN0aW1hdGVkRG9jdW1lbnRDb3VudFxuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBBbGwgb3B0aW9ucyBhcmUgbGlzdGVkIGluIFtNb25nb0RCIGRvY3VtZW50YXRpb25dKGh0dHBzOi8vbW9uZ29kYi5naXRodWIuaW8vbm9kZS1tb25nb2RiLW5hdGl2ZS80LjExL2ludGVyZmFjZXMvRXN0aW1hdGVkRG9jdW1lbnRDb3VudE9wdGlvbnMuaHRtbCkuIFBsZWFzZSBub3RlIHRoYXQgbm90IGFsbCBvZiB0aGVtIGFyZSBhdmFpbGFibGUgb24gdGhlIGNsaWVudC5cbiAgICogQHJldHVybnMge1Byb21pc2U8bnVtYmVyPn1cbiAgICovXG4gIGVzdGltYXRlZERvY3VtZW50Q291bnQoLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLl9jb2xsZWN0aW9uLmVzdGltYXRlZERvY3VtZW50Q291bnQoLi4uYXJncyk7XG4gIH0sXG59IiwiaW1wb3J0IHsgTG9nIH0gZnJvbSAnbWV0ZW9yL2xvZ2dpbmcnO1xuXG5leHBvcnQgY29uc3QgSW5kZXhNZXRob2RzID0ge1xuICAvLyBXZSdsbCBhY3R1YWxseSBkZXNpZ24gYW4gaW5kZXggQVBJIGxhdGVyLiBGb3Igbm93LCB3ZSBqdXN0IHBhc3MgdGhyb3VnaCB0b1xuICAvLyBNb25nbydzLCBidXQgbWFrZSBpdCBzeW5jaHJvbm91cy5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEFzeW5jaHJvbm91c2x5IGNyZWF0ZXMgdGhlIHNwZWNpZmllZCBpbmRleCBvbiB0aGUgY29sbGVjdGlvbi5cbiAgICogQGxvY3VzIHNlcnZlclxuICAgKiBAbWV0aG9kIGVuc3VyZUluZGV4QXN5bmNcbiAgICogQGRlcHJlY2F0ZWQgaW4gMy4wXG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge09iamVjdH0gaW5kZXggQSBkb2N1bWVudCB0aGF0IGNvbnRhaW5zIHRoZSBmaWVsZCBhbmQgdmFsdWUgcGFpcnMgd2hlcmUgdGhlIGZpZWxkIGlzIHRoZSBpbmRleCBrZXkgYW5kIHRoZSB2YWx1ZSBkZXNjcmliZXMgdGhlIHR5cGUgb2YgaW5kZXggZm9yIHRoYXQgZmllbGQuIEZvciBhbiBhc2NlbmRpbmcgaW5kZXggb24gYSBmaWVsZCwgc3BlY2lmeSBhIHZhbHVlIG9mIGAxYDsgZm9yIGRlc2NlbmRpbmcgaW5kZXgsIHNwZWNpZnkgYSB2YWx1ZSBvZiBgLTFgLiBVc2UgYHRleHRgIGZvciB0ZXh0IGluZGV4ZXMuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gQWxsIG9wdGlvbnMgYXJlIGxpc3RlZCBpbiBbTW9uZ29EQiBkb2N1bWVudGF0aW9uXShodHRwczovL2RvY3MubW9uZ29kYi5jb20vbWFudWFsL3JlZmVyZW5jZS9tZXRob2QvZGIuY29sbGVjdGlvbi5jcmVhdGVJbmRleC8jb3B0aW9ucylcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdGlvbnMubmFtZSBOYW1lIG9mIHRoZSBpbmRleFxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMudW5pcXVlIERlZmluZSB0aGF0IHRoZSBpbmRleCB2YWx1ZXMgbXVzdCBiZSB1bmlxdWUsIG1vcmUgYXQgW01vbmdvREIgZG9jdW1lbnRhdGlvbl0oaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9jb3JlL2luZGV4LXVuaXF1ZS8pXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5zcGFyc2UgRGVmaW5lIHRoYXQgdGhlIGluZGV4IGlzIHNwYXJzZSwgbW9yZSBhdCBbTW9uZ29EQiBkb2N1bWVudGF0aW9uXShodHRwczovL2RvY3MubW9uZ29kYi5jb20vbWFudWFsL2NvcmUvaW5kZXgtc3BhcnNlLylcbiAgICovXG4gIGFzeW5jIGVuc3VyZUluZGV4QXN5bmMoaW5kZXgsIG9wdGlvbnMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCFzZWxmLl9jb2xsZWN0aW9uLmVuc3VyZUluZGV4QXN5bmMgfHwgIXNlbGYuX2NvbGxlY3Rpb24uY3JlYXRlSW5kZXhBc3luYylcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2FuIG9ubHkgY2FsbCBjcmVhdGVJbmRleEFzeW5jIG9uIHNlcnZlciBjb2xsZWN0aW9ucycpO1xuICAgIGlmIChzZWxmLl9jb2xsZWN0aW9uLmNyZWF0ZUluZGV4QXN5bmMpIHtcbiAgICAgIGF3YWl0IHNlbGYuX2NvbGxlY3Rpb24uY3JlYXRlSW5kZXhBc3luYyhpbmRleCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIExvZy5kZWJ1ZyhgZW5zdXJlSW5kZXhBc3luYyBoYXMgYmVlbiBkZXByZWNhdGVkLCBwbGVhc2UgdXNlIHRoZSBuZXcgJ2NyZWF0ZUluZGV4QXN5bmMnIGluc3RlYWQkeyBvcHRpb25zPy5uYW1lID8gYCwgaW5kZXggbmFtZTogJHsgb3B0aW9ucy5uYW1lIH1gIDogYCwgaW5kZXg6ICR7IEpTT04uc3RyaW5naWZ5KGluZGV4KSB9YCB9YClcbiAgICAgIGF3YWl0IHNlbGYuX2NvbGxlY3Rpb24uZW5zdXJlSW5kZXhBc3luYyhpbmRleCwgb3B0aW9ucyk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBBc3luY2hyb25vdXNseSBjcmVhdGVzIHRoZSBzcGVjaWZpZWQgaW5kZXggb24gdGhlIGNvbGxlY3Rpb24uXG4gICAqIEBsb2N1cyBzZXJ2ZXJcbiAgICogQG1ldGhvZCBjcmVhdGVJbmRleEFzeW5jXG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge09iamVjdH0gaW5kZXggQSBkb2N1bWVudCB0aGF0IGNvbnRhaW5zIHRoZSBmaWVsZCBhbmQgdmFsdWUgcGFpcnMgd2hlcmUgdGhlIGZpZWxkIGlzIHRoZSBpbmRleCBrZXkgYW5kIHRoZSB2YWx1ZSBkZXNjcmliZXMgdGhlIHR5cGUgb2YgaW5kZXggZm9yIHRoYXQgZmllbGQuIEZvciBhbiBhc2NlbmRpbmcgaW5kZXggb24gYSBmaWVsZCwgc3BlY2lmeSBhIHZhbHVlIG9mIGAxYDsgZm9yIGRlc2NlbmRpbmcgaW5kZXgsIHNwZWNpZnkgYSB2YWx1ZSBvZiBgLTFgLiBVc2UgYHRleHRgIGZvciB0ZXh0IGluZGV4ZXMuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gQWxsIG9wdGlvbnMgYXJlIGxpc3RlZCBpbiBbTW9uZ29EQiBkb2N1bWVudGF0aW9uXShodHRwczovL2RvY3MubW9uZ29kYi5jb20vbWFudWFsL3JlZmVyZW5jZS9tZXRob2QvZGIuY29sbGVjdGlvbi5jcmVhdGVJbmRleC8jb3B0aW9ucylcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdGlvbnMubmFtZSBOYW1lIG9mIHRoZSBpbmRleFxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMudW5pcXVlIERlZmluZSB0aGF0IHRoZSBpbmRleCB2YWx1ZXMgbXVzdCBiZSB1bmlxdWUsIG1vcmUgYXQgW01vbmdvREIgZG9jdW1lbnRhdGlvbl0oaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9jb3JlL2luZGV4LXVuaXF1ZS8pXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5zcGFyc2UgRGVmaW5lIHRoYXQgdGhlIGluZGV4IGlzIHNwYXJzZSwgbW9yZSBhdCBbTW9uZ29EQiBkb2N1bWVudGF0aW9uXShodHRwczovL2RvY3MubW9uZ29kYi5jb20vbWFudWFsL2NvcmUvaW5kZXgtc3BhcnNlLylcbiAgICovXG4gIGFzeW5jIGNyZWF0ZUluZGV4QXN5bmMoaW5kZXgsIG9wdGlvbnMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCFzZWxmLl9jb2xsZWN0aW9uLmNyZWF0ZUluZGV4QXN5bmMpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbiBvbmx5IGNhbGwgY3JlYXRlSW5kZXhBc3luYyBvbiBzZXJ2ZXIgY29sbGVjdGlvbnMnKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBzZWxmLl9jb2xsZWN0aW9uLmNyZWF0ZUluZGV4QXN5bmMoaW5kZXgsIG9wdGlvbnMpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChcbiAgICAgICAgZS5tZXNzYWdlLmluY2x1ZGVzKFxuICAgICAgICAgICdBbiBlcXVpdmFsZW50IGluZGV4IGFscmVhZHkgZXhpc3RzIHdpdGggdGhlIHNhbWUgbmFtZSBidXQgZGlmZmVyZW50IG9wdGlvbnMuJ1xuICAgICAgICApICYmXG4gICAgICAgIE1ldGVvci5zZXR0aW5ncz8ucGFja2FnZXM/Lm1vbmdvPy5yZUNyZWF0ZUluZGV4T25PcHRpb25NaXNtYXRjaFxuICAgICAgKSB7XG4gICAgICAgIExvZy5pbmZvKGBSZS1jcmVhdGluZyBpbmRleCAkeyBpbmRleCB9IGZvciAkeyBzZWxmLl9uYW1lIH0gZHVlIHRvIG9wdGlvbnMgbWlzbWF0Y2guYCk7XG4gICAgICAgIGF3YWl0IHNlbGYuX2NvbGxlY3Rpb24uZHJvcEluZGV4QXN5bmMoaW5kZXgpO1xuICAgICAgICBhd2FpdCBzZWxmLl9jb2xsZWN0aW9uLmNyZWF0ZUluZGV4QXN5bmMoaW5kZXgsIG9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcihgQW4gZXJyb3Igb2NjdXJyZWQgd2hlbiBjcmVhdGluZyBhbiBpbmRleCBmb3IgY29sbGVjdGlvbiBcIiR7IHNlbGYuX25hbWUgfTogJHsgZS5tZXNzYWdlIH1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEFzeW5jaHJvbm91c2x5IGNyZWF0ZXMgdGhlIHNwZWNpZmllZCBpbmRleCBvbiB0aGUgY29sbGVjdGlvbi5cbiAgICogQGxvY3VzIHNlcnZlclxuICAgKiBAbWV0aG9kIGNyZWF0ZUluZGV4XG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge09iamVjdH0gaW5kZXggQSBkb2N1bWVudCB0aGF0IGNvbnRhaW5zIHRoZSBmaWVsZCBhbmQgdmFsdWUgcGFpcnMgd2hlcmUgdGhlIGZpZWxkIGlzIHRoZSBpbmRleCBrZXkgYW5kIHRoZSB2YWx1ZSBkZXNjcmliZXMgdGhlIHR5cGUgb2YgaW5kZXggZm9yIHRoYXQgZmllbGQuIEZvciBhbiBhc2NlbmRpbmcgaW5kZXggb24gYSBmaWVsZCwgc3BlY2lmeSBhIHZhbHVlIG9mIGAxYDsgZm9yIGRlc2NlbmRpbmcgaW5kZXgsIHNwZWNpZnkgYSB2YWx1ZSBvZiBgLTFgLiBVc2UgYHRleHRgIGZvciB0ZXh0IGluZGV4ZXMuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gQWxsIG9wdGlvbnMgYXJlIGxpc3RlZCBpbiBbTW9uZ29EQiBkb2N1bWVudGF0aW9uXShodHRwczovL2RvY3MubW9uZ29kYi5jb20vbWFudWFsL3JlZmVyZW5jZS9tZXRob2QvZGIuY29sbGVjdGlvbi5jcmVhdGVJbmRleC8jb3B0aW9ucylcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdGlvbnMubmFtZSBOYW1lIG9mIHRoZSBpbmRleFxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMudW5pcXVlIERlZmluZSB0aGF0IHRoZSBpbmRleCB2YWx1ZXMgbXVzdCBiZSB1bmlxdWUsIG1vcmUgYXQgW01vbmdvREIgZG9jdW1lbnRhdGlvbl0oaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9jb3JlL2luZGV4LXVuaXF1ZS8pXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5zcGFyc2UgRGVmaW5lIHRoYXQgdGhlIGluZGV4IGlzIHNwYXJzZSwgbW9yZSBhdCBbTW9uZ29EQiBkb2N1bWVudGF0aW9uXShodHRwczovL2RvY3MubW9uZ29kYi5jb20vbWFudWFsL2NvcmUvaW5kZXgtc3BhcnNlLylcbiAgICovXG4gIGNyZWF0ZUluZGV4KGluZGV4LCBvcHRpb25zKXtcbiAgICByZXR1cm4gdGhpcy5jcmVhdGVJbmRleEFzeW5jKGluZGV4LCBvcHRpb25zKTtcbiAgfSxcblxuICBhc3luYyBkcm9wSW5kZXhBc3luYyhpbmRleCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoIXNlbGYuX2NvbGxlY3Rpb24uZHJvcEluZGV4QXN5bmMpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbiBvbmx5IGNhbGwgZHJvcEluZGV4QXN5bmMgb24gc2VydmVyIGNvbGxlY3Rpb25zJyk7XG4gICAgYXdhaXQgc2VsZi5fY29sbGVjdGlvbi5kcm9wSW5kZXhBc3luYyhpbmRleCk7XG4gIH0sXG59XG4iLCJleHBvcnQgY29uc3QgUmVwbGljYXRpb25NZXRob2RzID0ge1xuICBhc3luYyBfbWF5YmVTZXRVcFJlcGxpY2F0aW9uKG5hbWUpIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICBpZiAoXG4gICAgICAhKFxuICAgICAgICBzZWxmLl9jb25uZWN0aW9uICYmXG4gICAgICAgIHNlbGYuX2Nvbm5lY3Rpb24ucmVnaXN0ZXJTdG9yZUNsaWVudCAmJlxuICAgICAgICBzZWxmLl9jb25uZWN0aW9uLnJlZ2lzdGVyU3RvcmVTZXJ2ZXJcbiAgICAgIClcbiAgICApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cblxuICAgIGNvbnN0IHdyYXBwZWRTdG9yZUNvbW1vbiA9IHtcbiAgICAgIC8vIENhbGxlZCBhcm91bmQgbWV0aG9kIHN0dWIgaW52b2NhdGlvbnMgdG8gY2FwdHVyZSB0aGUgb3JpZ2luYWwgdmVyc2lvbnNcbiAgICAgIC8vIG9mIG1vZGlmaWVkIGRvY3VtZW50cy5cbiAgICAgIHNhdmVPcmlnaW5hbHMoKSB7XG4gICAgICAgIHNlbGYuX2NvbGxlY3Rpb24uc2F2ZU9yaWdpbmFscygpO1xuICAgICAgfSxcbiAgICAgIHJldHJpZXZlT3JpZ2luYWxzKCkge1xuICAgICAgICByZXR1cm4gc2VsZi5fY29sbGVjdGlvbi5yZXRyaWV2ZU9yaWdpbmFscygpO1xuICAgICAgfSxcbiAgICAgIC8vIFRvIGJlIGFibGUgdG8gZ2V0IGJhY2sgdG8gdGhlIGNvbGxlY3Rpb24gZnJvbSB0aGUgc3RvcmUuXG4gICAgICBfZ2V0Q29sbGVjdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICB9LFxuICAgIH07XG4gICAgY29uc3Qgd3JhcHBlZFN0b3JlQ2xpZW50ID0ge1xuICAgICAgLy8gQ2FsbGVkIGF0IHRoZSBiZWdpbm5pbmcgb2YgYSBiYXRjaCBvZiB1cGRhdGVzLiBiYXRjaFNpemUgaXMgdGhlIG51bWJlclxuICAgICAgLy8gb2YgdXBkYXRlIGNhbGxzIHRvIGV4cGVjdC5cbiAgICAgIC8vXG4gICAgICAvLyBYWFggVGhpcyBpbnRlcmZhY2UgaXMgcHJldHR5IGphbmt5LiByZXNldCBwcm9iYWJseSBvdWdodCB0byBnbyBiYWNrIHRvXG4gICAgICAvLyBiZWluZyBpdHMgb3duIGZ1bmN0aW9uLCBhbmQgY2FsbGVycyBzaG91bGRuJ3QgaGF2ZSB0byBjYWxjdWxhdGVcbiAgICAgIC8vIGJhdGNoU2l6ZS4gVGhlIG9wdGltaXphdGlvbiBvZiBub3QgY2FsbGluZyBwYXVzZS9yZW1vdmUgc2hvdWxkIGJlXG4gICAgICAvLyBkZWxheWVkIHVudGlsIGxhdGVyOiB0aGUgZmlyc3QgY2FsbCB0byB1cGRhdGUoKSBzaG91bGQgYnVmZmVyIGl0c1xuICAgICAgLy8gbWVzc2FnZSwgYW5kIHRoZW4gd2UgY2FuIGVpdGhlciBkaXJlY3RseSBhcHBseSBpdCBhdCBlbmRVcGRhdGUgdGltZSBpZlxuICAgICAgLy8gaXQgd2FzIHRoZSBvbmx5IHVwZGF0ZSwgb3IgZG8gcGF1c2VPYnNlcnZlcnMvYXBwbHkvYXBwbHkgYXQgdGhlIG5leHRcbiAgICAgIC8vIHVwZGF0ZSgpIGlmIHRoZXJlJ3MgYW5vdGhlciBvbmUuXG4gICAgICBhc3luYyBiZWdpblVwZGF0ZShiYXRjaFNpemUsIHJlc2V0KSB7XG4gICAgICAgIC8vIHBhdXNlIG9ic2VydmVycyBzbyB1c2VycyBkb24ndCBzZWUgZmxpY2tlciB3aGVuIHVwZGF0aW5nIHNldmVyYWxcbiAgICAgICAgLy8gb2JqZWN0cyBhdCBvbmNlIChpbmNsdWRpbmcgdGhlIHBvc3QtcmVjb25uZWN0IHJlc2V0LWFuZC1yZWFwcGx5XG4gICAgICAgIC8vIHN0YWdlKSwgYW5kIHNvIHRoYXQgYSByZS1zb3J0aW5nIG9mIGEgcXVlcnkgY2FuIHRha2UgYWR2YW50YWdlIG9mIHRoZVxuICAgICAgICAvLyBmdWxsIF9kaWZmUXVlcnkgbW92ZWQgY2FsY3VsYXRpb24gaW5zdGVhZCBvZiBhcHBseWluZyBjaGFuZ2Ugb25lIGF0IGFcbiAgICAgICAgLy8gdGltZS5cbiAgICAgICAgaWYgKGJhdGNoU2l6ZSA+IDEgfHwgcmVzZXQpIHNlbGYuX2NvbGxlY3Rpb24ucGF1c2VPYnNlcnZlcnMoKTtcblxuICAgICAgICBpZiAocmVzZXQpIGF3YWl0IHNlbGYuX2NvbGxlY3Rpb24ucmVtb3ZlKHt9KTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIEFwcGx5IGFuIHVwZGF0ZS5cbiAgICAgIC8vIFhYWCBiZXR0ZXIgc3BlY2lmeSB0aGlzIGludGVyZmFjZSAobm90IGluIHRlcm1zIG9mIGEgd2lyZSBtZXNzYWdlKT9cbiAgICAgIHVwZGF0ZShtc2cpIHtcbiAgICAgICAgdmFyIG1vbmdvSWQgPSBNb25nb0lELmlkUGFyc2UobXNnLmlkKTtcbiAgICAgICAgdmFyIGRvYyA9IHNlbGYuX2NvbGxlY3Rpb24uX2RvY3MuZ2V0KG1vbmdvSWQpO1xuXG4gICAgICAgIC8vV2hlbiB0aGUgc2VydmVyJ3MgbWVyZ2Vib3ggaXMgZGlzYWJsZWQgZm9yIGEgY29sbGVjdGlvbiwgdGhlIGNsaWVudCBtdXN0IGdyYWNlZnVsbHkgaGFuZGxlIGl0IHdoZW46XG4gICAgICAgIC8vICpXZSByZWNlaXZlIGFuIGFkZGVkIG1lc3NhZ2UgZm9yIGEgZG9jdW1lbnQgdGhhdCBpcyBhbHJlYWR5IHRoZXJlLiBJbnN0ZWFkLCBpdCB3aWxsIGJlIGNoYW5nZWRcbiAgICAgICAgLy8gKldlIHJlZWl2ZSBhIGNoYW5nZSBtZXNzYWdlIGZvciBhIGRvY3VtZW50IHRoYXQgaXMgbm90IHRoZXJlLiBJbnN0ZWFkLCBpdCB3aWxsIGJlIGFkZGVkXG4gICAgICAgIC8vICpXZSByZWNlaXZlIGEgcmVtb3ZlZCBtZXNzc2FnZSBmb3IgYSBkb2N1bWVudCB0aGF0IGlzIG5vdCB0aGVyZS4gSW5zdGVhZCwgbm90aW5nIHdpbCBoYXBwZW4uXG5cbiAgICAgICAgLy9Db2RlIGlzIGRlcml2ZWQgZnJvbSBjbGllbnQtc2lkZSBjb2RlIG9yaWdpbmFsbHkgaW4gcGVlcmxpYnJhcnk6Y29udHJvbC1tZXJnZWJveFxuICAgICAgICAvL2h0dHBzOi8vZ2l0aHViLmNvbS9wZWVybGlicmFyeS9tZXRlb3ItY29udHJvbC1tZXJnZWJveC9ibG9iL21hc3Rlci9jbGllbnQuY29mZmVlXG5cbiAgICAgICAgLy9Gb3IgbW9yZSBpbmZvcm1hdGlvbiwgcmVmZXIgdG8gZGlzY3Vzc2lvbiBcIkluaXRpYWwgc3VwcG9ydCBmb3IgcHVibGljYXRpb24gc3RyYXRlZ2llcyBpbiBsaXZlZGF0YSBzZXJ2ZXJcIjpcbiAgICAgICAgLy9odHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci9wdWxsLzExMTUxXG4gICAgICAgIGlmIChNZXRlb3IuaXNDbGllbnQpIHtcbiAgICAgICAgICBpZiAobXNnLm1zZyA9PT0gJ2FkZGVkJyAmJiBkb2MpIHtcbiAgICAgICAgICAgIG1zZy5tc2cgPSAnY2hhbmdlZCc7XG4gICAgICAgICAgfSBlbHNlIGlmIChtc2cubXNnID09PSAncmVtb3ZlZCcgJiYgIWRvYykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH0gZWxzZSBpZiAobXNnLm1zZyA9PT0gJ2NoYW5nZWQnICYmICFkb2MpIHtcbiAgICAgICAgICAgIG1zZy5tc2cgPSAnYWRkZWQnO1xuICAgICAgICAgICAgY29uc3QgX3JlZiA9IG1zZy5maWVsZHM7XG4gICAgICAgICAgICBmb3IgKGxldCBmaWVsZCBpbiBfcmVmKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gX3JlZltmaWVsZF07XG4gICAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gdm9pZCAwKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIG1zZy5maWVsZHNbZmllbGRdO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIElzIHRoaXMgYSBcInJlcGxhY2UgdGhlIHdob2xlIGRvY1wiIG1lc3NhZ2UgY29taW5nIGZyb20gdGhlIHF1aWVzY2VuY2VcbiAgICAgICAgLy8gb2YgbWV0aG9kIHdyaXRlcyB0byBhbiBvYmplY3Q/IChOb3RlIHRoYXQgJ3VuZGVmaW5lZCcgaXMgYSB2YWxpZFxuICAgICAgICAvLyB2YWx1ZSBtZWFuaW5nIFwicmVtb3ZlIGl0XCIuKVxuICAgICAgICBpZiAobXNnLm1zZyA9PT0gJ3JlcGxhY2UnKSB7XG4gICAgICAgICAgdmFyIHJlcGxhY2UgPSBtc2cucmVwbGFjZTtcbiAgICAgICAgICBpZiAoIXJlcGxhY2UpIHtcbiAgICAgICAgICAgIGlmIChkb2MpIHNlbGYuX2NvbGxlY3Rpb24ucmVtb3ZlKG1vbmdvSWQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoIWRvYykge1xuICAgICAgICAgICAgc2VsZi5fY29sbGVjdGlvbi5pbnNlcnQocmVwbGFjZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFhYWCBjaGVjayB0aGF0IHJlcGxhY2UgaGFzIG5vICQgb3BzXG4gICAgICAgICAgICBzZWxmLl9jb2xsZWN0aW9uLnVwZGF0ZShtb25nb0lkLCByZXBsYWNlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2UgaWYgKG1zZy5tc2cgPT09ICdhZGRlZCcpIHtcbiAgICAgICAgICBpZiAoZG9jKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICdFeHBlY3RlZCBub3QgdG8gZmluZCBhIGRvY3VtZW50IGFscmVhZHkgcHJlc2VudCBmb3IgYW4gYWRkJ1xuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc2VsZi5fY29sbGVjdGlvbi5pbnNlcnQoeyBfaWQ6IG1vbmdvSWQsIC4uLm1zZy5maWVsZHMgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAobXNnLm1zZyA9PT0gJ3JlbW92ZWQnKSB7XG4gICAgICAgICAgaWYgKCFkb2MpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICdFeHBlY3RlZCB0byBmaW5kIGEgZG9jdW1lbnQgYWxyZWFkeSBwcmVzZW50IGZvciByZW1vdmVkJ1xuICAgICAgICAgICAgKTtcbiAgICAgICAgICBzZWxmLl9jb2xsZWN0aW9uLnJlbW92ZShtb25nb0lkKTtcbiAgICAgICAgfSBlbHNlIGlmIChtc2cubXNnID09PSAnY2hhbmdlZCcpIHtcbiAgICAgICAgICBpZiAoIWRvYykgdGhyb3cgbmV3IEVycm9yKCdFeHBlY3RlZCB0byBmaW5kIGEgZG9jdW1lbnQgdG8gY2hhbmdlJyk7XG4gICAgICAgICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKG1zZy5maWVsZHMpO1xuICAgICAgICAgIGlmIChrZXlzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhciBtb2RpZmllciA9IHt9O1xuICAgICAgICAgICAga2V5cy5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gbXNnLmZpZWxkc1trZXldO1xuICAgICAgICAgICAgICBpZiAoRUpTT04uZXF1YWxzKGRvY1trZXldLCB2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW1vZGlmaWVyLiR1bnNldCkge1xuICAgICAgICAgICAgICAgICAgbW9kaWZpZXIuJHVuc2V0ID0ge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1vZGlmaWVyLiR1bnNldFtrZXldID0gMTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIW1vZGlmaWVyLiRzZXQpIHtcbiAgICAgICAgICAgICAgICAgIG1vZGlmaWVyLiRzZXQgPSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbW9kaWZpZXIuJHNldFtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKG1vZGlmaWVyKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb24udXBkYXRlKG1vbmdvSWQsIG1vZGlmaWVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSSBkb24ndCBrbm93IGhvdyB0byBkZWFsIHdpdGggdGhpcyBtZXNzYWdlXCIpO1xuICAgICAgICB9XG4gICAgICB9LFxuXG4gICAgICAvLyBDYWxsZWQgYXQgdGhlIGVuZCBvZiBhIGJhdGNoIG9mIHVwZGF0ZXMubGl2ZWRhdGFfY29ubmVjdGlvbi5qczoxMjg3XG4gICAgICBlbmRVcGRhdGUoKSB7XG4gICAgICAgIHNlbGYuX2NvbGxlY3Rpb24ucmVzdW1lT2JzZXJ2ZXJzQ2xpZW50KCk7XG4gICAgICB9LFxuXG4gICAgICAvLyBVc2VkIHRvIHByZXNlcnZlIGN1cnJlbnQgdmVyc2lvbnMgb2YgZG9jdW1lbnRzIGFjcm9zcyBhIHN0b3JlIHJlc2V0LlxuICAgICAgZ2V0RG9jKGlkKSB7XG4gICAgICAgIHJldHVybiBzZWxmLmZpbmRPbmUoaWQpO1xuICAgICAgfSxcblxuICAgICAgLi4ud3JhcHBlZFN0b3JlQ29tbW9uLFxuICAgIH07XG4gICAgY29uc3Qgd3JhcHBlZFN0b3JlU2VydmVyID0ge1xuICAgICAgYXN5bmMgYmVnaW5VcGRhdGUoYmF0Y2hTaXplLCByZXNldCkge1xuICAgICAgICBpZiAoYmF0Y2hTaXplID4gMSB8fCByZXNldCkgc2VsZi5fY29sbGVjdGlvbi5wYXVzZU9ic2VydmVycygpO1xuXG4gICAgICAgIGlmIChyZXNldCkgYXdhaXQgc2VsZi5fY29sbGVjdGlvbi5yZW1vdmVBc3luYyh7fSk7XG4gICAgICB9LFxuXG4gICAgICBhc3luYyB1cGRhdGUobXNnKSB7XG4gICAgICAgIHZhciBtb25nb0lkID0gTW9uZ29JRC5pZFBhcnNlKG1zZy5pZCk7XG4gICAgICAgIHZhciBkb2MgPSBzZWxmLl9jb2xsZWN0aW9uLl9kb2NzLmdldChtb25nb0lkKTtcblxuICAgICAgICAvLyBJcyB0aGlzIGEgXCJyZXBsYWNlIHRoZSB3aG9sZSBkb2NcIiBtZXNzYWdlIGNvbWluZyBmcm9tIHRoZSBxdWllc2NlbmNlXG4gICAgICAgIC8vIG9mIG1ldGhvZCB3cml0ZXMgdG8gYW4gb2JqZWN0PyAoTm90ZSB0aGF0ICd1bmRlZmluZWQnIGlzIGEgdmFsaWRcbiAgICAgICAgLy8gdmFsdWUgbWVhbmluZyBcInJlbW92ZSBpdFwiLilcbiAgICAgICAgaWYgKG1zZy5tc2cgPT09ICdyZXBsYWNlJykge1xuICAgICAgICAgIHZhciByZXBsYWNlID0gbXNnLnJlcGxhY2U7XG4gICAgICAgICAgaWYgKCFyZXBsYWNlKSB7XG4gICAgICAgICAgICBpZiAoZG9jKSBhd2FpdCBzZWxmLl9jb2xsZWN0aW9uLnJlbW92ZUFzeW5jKG1vbmdvSWQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoIWRvYykge1xuICAgICAgICAgICAgYXdhaXQgc2VsZi5fY29sbGVjdGlvbi5pbnNlcnRBc3luYyhyZXBsYWNlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gWFhYIGNoZWNrIHRoYXQgcmVwbGFjZSBoYXMgbm8gJCBvcHNcbiAgICAgICAgICAgIGF3YWl0IHNlbGYuX2NvbGxlY3Rpb24udXBkYXRlQXN5bmMobW9uZ29JZCwgcmVwbGFjZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIGlmIChtc2cubXNnID09PSAnYWRkZWQnKSB7XG4gICAgICAgICAgaWYgKGRvYykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAnRXhwZWN0ZWQgbm90IHRvIGZpbmQgYSBkb2N1bWVudCBhbHJlYWR5IHByZXNlbnQgZm9yIGFuIGFkZCdcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGF3YWl0IHNlbGYuX2NvbGxlY3Rpb24uaW5zZXJ0QXN5bmMoeyBfaWQ6IG1vbmdvSWQsIC4uLm1zZy5maWVsZHMgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAobXNnLm1zZyA9PT0gJ3JlbW92ZWQnKSB7XG4gICAgICAgICAgaWYgKCFkb2MpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICdFeHBlY3RlZCB0byBmaW5kIGEgZG9jdW1lbnQgYWxyZWFkeSBwcmVzZW50IGZvciByZW1vdmVkJ1xuICAgICAgICAgICAgKTtcbiAgICAgICAgICBhd2FpdCBzZWxmLl9jb2xsZWN0aW9uLnJlbW92ZUFzeW5jKG1vbmdvSWQpO1xuICAgICAgICB9IGVsc2UgaWYgKG1zZy5tc2cgPT09ICdjaGFuZ2VkJykge1xuICAgICAgICAgIGlmICghZG9jKSB0aHJvdyBuZXcgRXJyb3IoJ0V4cGVjdGVkIHRvIGZpbmQgYSBkb2N1bWVudCB0byBjaGFuZ2UnKTtcbiAgICAgICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMobXNnLmZpZWxkcyk7XG4gICAgICAgICAgaWYgKGtleXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdmFyIG1vZGlmaWVyID0ge307XG4gICAgICAgICAgICBrZXlzLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBtc2cuZmllbGRzW2tleV07XG4gICAgICAgICAgICAgIGlmIChFSlNPTi5lcXVhbHMoZG9jW2tleV0sIHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGlmICghbW9kaWZpZXIuJHVuc2V0KSB7XG4gICAgICAgICAgICAgICAgICBtb2RpZmllci4kdW5zZXQgPSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbW9kaWZpZXIuJHVuc2V0W2tleV0gPSAxO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghbW9kaWZpZXIuJHNldCkge1xuICAgICAgICAgICAgICAgICAgbW9kaWZpZXIuJHNldCA9IHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtb2RpZmllci4kc2V0W2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoT2JqZWN0LmtleXMobW9kaWZpZXIpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgYXdhaXQgc2VsZi5fY29sbGVjdGlvbi51cGRhdGVBc3luYyhtb25nb0lkLCBtb2RpZmllcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkkgZG9uJ3Qga25vdyBob3cgdG8gZGVhbCB3aXRoIHRoaXMgbWVzc2FnZVwiKTtcbiAgICAgICAgfVxuICAgICAgfSxcblxuICAgICAgLy8gQ2FsbGVkIGF0IHRoZSBlbmQgb2YgYSBiYXRjaCBvZiB1cGRhdGVzLlxuICAgICAgYXN5bmMgZW5kVXBkYXRlKCkge1xuICAgICAgICBhd2FpdCBzZWxmLl9jb2xsZWN0aW9uLnJlc3VtZU9ic2VydmVyc1NlcnZlcigpO1xuICAgICAgfSxcblxuICAgICAgLy8gVXNlZCB0byBwcmVzZXJ2ZSBjdXJyZW50IHZlcnNpb25zIG9mIGRvY3VtZW50cyBhY3Jvc3MgYSBzdG9yZSByZXNldC5cbiAgICAgIGFzeW5jIGdldERvYyhpZCkge1xuICAgICAgICByZXR1cm4gc2VsZi5maW5kT25lQXN5bmMoaWQpO1xuICAgICAgfSxcbiAgICAgIC4uLndyYXBwZWRTdG9yZUNvbW1vbixcbiAgICB9O1xuXG5cbiAgICAvLyBPSywgd2UncmUgZ29pbmcgdG8gYmUgYSBzbGF2ZSwgcmVwbGljYXRpbmcgc29tZSByZW1vdGVcbiAgICAvLyBkYXRhYmFzZSwgZXhjZXB0IHBvc3NpYmx5IHdpdGggc29tZSB0ZW1wb3JhcnkgZGl2ZXJnZW5jZSB3aGlsZVxuICAgIC8vIHdlIGhhdmUgdW5hY2tub3dsZWRnZWQgUlBDJ3MuXG4gICAgbGV0IHJlZ2lzdGVyU3RvcmVSZXN1bHQ7XG4gICAgaWYgKE1ldGVvci5pc0NsaWVudCkge1xuICAgICAgcmVnaXN0ZXJTdG9yZVJlc3VsdCA9IHNlbGYuX2Nvbm5lY3Rpb24ucmVnaXN0ZXJTdG9yZUNsaWVudChcbiAgICAgICAgbmFtZSxcbiAgICAgICAgd3JhcHBlZFN0b3JlQ2xpZW50XG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICByZWdpc3RlclN0b3JlUmVzdWx0ID0gc2VsZi5fY29ubmVjdGlvbi5yZWdpc3RlclN0b3JlU2VydmVyKFxuICAgICAgICBuYW1lLFxuICAgICAgICB3cmFwcGVkU3RvcmVTZXJ2ZXJcbiAgICAgICk7XG4gICAgfVxuXG4gICAgY29uc3QgbWVzc2FnZSA9IGBUaGVyZSBpcyBhbHJlYWR5IGEgY29sbGVjdGlvbiBuYW1lZCBcIiR7bmFtZX1cImA7XG4gICAgY29uc3QgbG9nV2FybiA9ICgpID0+IHtcbiAgICAgIGNvbnNvbGUud2FybiA/IGNvbnNvbGUud2FybihtZXNzYWdlKSA6IGNvbnNvbGUubG9nKG1lc3NhZ2UpO1xuICAgIH07XG5cbiAgICBpZiAoIXJlZ2lzdGVyU3RvcmVSZXN1bHQpIHtcbiAgICAgIHJldHVybiBsb2dXYXJuKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlZ2lzdGVyU3RvcmVSZXN1bHQ/LnRoZW4/LihvayA9PiB7XG4gICAgICBpZiAoIW9rKSB7XG4gICAgICAgIGxvZ1dhcm4oKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbn0iLCJleHBvcnQgY29uc3QgU3luY01ldGhvZHMgPSB7XG4gIC8qKlxuICAgKiBAc3VtbWFyeSBGaW5kIHRoZSBkb2N1bWVudHMgaW4gYSBjb2xsZWN0aW9uIHRoYXQgbWF0Y2ggdGhlIHNlbGVjdG9yLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCBmaW5kXG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IFtzZWxlY3Rvcl0gQSBxdWVyeSBkZXNjcmliaW5nIHRoZSBkb2N1bWVudHMgdG8gZmluZFxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gICAqIEBwYXJhbSB7TW9uZ29Tb3J0U3BlY2lmaWVyfSBvcHRpb25zLnNvcnQgU29ydCBvcmRlciAoZGVmYXVsdDogbmF0dXJhbCBvcmRlcilcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMuc2tpcCBOdW1iZXIgb2YgcmVzdWx0cyB0byBza2lwIGF0IHRoZSBiZWdpbm5pbmdcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMubGltaXQgTWF4aW11bSBudW1iZXIgb2YgcmVzdWx0cyB0byByZXR1cm5cbiAgICogQHBhcmFtIHtNb25nb0ZpZWxkU3BlY2lmaWVyfSBvcHRpb25zLmZpZWxkcyBEaWN0aW9uYXJ5IG9mIGZpZWxkcyB0byByZXR1cm4gb3IgZXhjbHVkZS5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnJlYWN0aXZlIChDbGllbnQgb25seSkgRGVmYXVsdCBgdHJ1ZWA7IHBhc3MgYGZhbHNlYCB0byBkaXNhYmxlIHJlYWN0aXZpdHlcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gb3B0aW9ucy50cmFuc2Zvcm0gT3ZlcnJpZGVzIGB0cmFuc2Zvcm1gIG9uIHRoZSAgW2BDb2xsZWN0aW9uYF0oI2NvbGxlY3Rpb25zKSBmb3IgdGhpcyBjdXJzb3IuICBQYXNzIGBudWxsYCB0byBkaXNhYmxlIHRyYW5zZm9ybWF0aW9uLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMuZGlzYWJsZU9wbG9nIChTZXJ2ZXIgb25seSkgUGFzcyB0cnVlIHRvIGRpc2FibGUgb3Bsb2ctdGFpbGluZyBvbiB0aGlzIHF1ZXJ5LiBUaGlzIGFmZmVjdHMgdGhlIHdheSBzZXJ2ZXIgcHJvY2Vzc2VzIGNhbGxzIHRvIGBvYnNlcnZlYCBvbiB0aGlzIHF1ZXJ5LiBEaXNhYmxpbmcgdGhlIG9wbG9nIGNhbiBiZSB1c2VmdWwgd2hlbiB3b3JraW5nIHdpdGggZGF0YSB0aGF0IHVwZGF0ZXMgaW4gbGFyZ2UgYmF0Y2hlcy5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMucG9sbGluZ0ludGVydmFsTXMgKFNlcnZlciBvbmx5KSBXaGVuIG9wbG9nIGlzIGRpc2FibGVkICh0aHJvdWdoIHRoZSB1c2Ugb2YgYGRpc2FibGVPcGxvZ2Agb3Igd2hlbiBvdGhlcndpc2Ugbm90IGF2YWlsYWJsZSksIHRoZSBmcmVxdWVuY3kgKGluIG1pbGxpc2Vjb25kcykgb2YgaG93IG9mdGVuIHRvIHBvbGwgdGhpcyBxdWVyeSB3aGVuIG9ic2VydmluZyBvbiB0aGUgc2VydmVyLiBEZWZhdWx0cyB0byAxMDAwMG1zICgxMCBzZWNvbmRzKS5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMucG9sbGluZ1Rocm90dGxlTXMgKFNlcnZlciBvbmx5KSBXaGVuIG9wbG9nIGlzIGRpc2FibGVkICh0aHJvdWdoIHRoZSB1c2Ugb2YgYGRpc2FibGVPcGxvZ2Agb3Igd2hlbiBvdGhlcndpc2Ugbm90IGF2YWlsYWJsZSksIHRoZSBtaW5pbXVtIHRpbWUgKGluIG1pbGxpc2Vjb25kcykgdG8gYWxsb3cgYmV0d2VlbiByZS1wb2xsaW5nIHdoZW4gb2JzZXJ2aW5nIG9uIHRoZSBzZXJ2ZXIuIEluY3JlYXNpbmcgdGhpcyB3aWxsIHNhdmUgQ1BVIGFuZCBtb25nbyBsb2FkIGF0IHRoZSBleHBlbnNlIG9mIHNsb3dlciB1cGRhdGVzIHRvIHVzZXJzLiBEZWNyZWFzaW5nIHRoaXMgaXMgbm90IHJlY29tbWVuZGVkLiBEZWZhdWx0cyB0byA1MG1zLlxuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0aW9ucy5tYXhUaW1lTXMgKFNlcnZlciBvbmx5KSBJZiBzZXQsIGluc3RydWN0cyBNb25nb0RCIHRvIHNldCBhIHRpbWUgbGltaXQgZm9yIHRoaXMgY3Vyc29yJ3Mgb3BlcmF0aW9ucy4gSWYgdGhlIG9wZXJhdGlvbiByZWFjaGVzIHRoZSBzcGVjaWZpZWQgdGltZSBsaW1pdCAoaW4gbWlsbGlzZWNvbmRzKSB3aXRob3V0IHRoZSBoYXZpbmcgYmVlbiBjb21wbGV0ZWQsIGFuIGV4Y2VwdGlvbiB3aWxsIGJlIHRocm93bi4gVXNlZnVsIHRvIHByZXZlbnQgYW4gKGFjY2lkZW50YWwgb3IgbWFsaWNpb3VzKSB1bm9wdGltaXplZCBxdWVyeSBmcm9tIGNhdXNpbmcgYSBmdWxsIGNvbGxlY3Rpb24gc2NhbiB0aGF0IHdvdWxkIGRpc3J1cHQgb3RoZXIgZGF0YWJhc2UgdXNlcnMsIGF0IHRoZSBleHBlbnNlIG9mIG5lZWRpbmcgdG8gaGFuZGxlIHRoZSByZXN1bHRpbmcgZXJyb3IuXG4gICAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gb3B0aW9ucy5oaW50IChTZXJ2ZXIgb25seSkgT3ZlcnJpZGVzIE1vbmdvREIncyBkZWZhdWx0IGluZGV4IHNlbGVjdGlvbiBhbmQgcXVlcnkgb3B0aW1pemF0aW9uIHByb2Nlc3MuIFNwZWNpZnkgYW4gaW5kZXggdG8gZm9yY2UgaXRzIHVzZSwgZWl0aGVyIGJ5IGl0cyBuYW1lIG9yIGluZGV4IHNwZWNpZmljYXRpb24uIFlvdSBjYW4gYWxzbyBzcGVjaWZ5IGB7ICRuYXR1cmFsIDogMSB9YCB0byBmb3JjZSBhIGZvcndhcmRzIGNvbGxlY3Rpb24gc2Nhbiwgb3IgYHsgJG5hdHVyYWwgOiAtMSB9YCBmb3IgYSByZXZlcnNlIGNvbGxlY3Rpb24gc2Nhbi4gU2V0dGluZyB0aGlzIGlzIG9ubHkgcmVjb21tZW5kZWQgZm9yIGFkdmFuY2VkIHVzZXJzLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0aW9ucy5yZWFkUHJlZmVyZW5jZSAoU2VydmVyIG9ubHkpIFNwZWNpZmllcyBhIGN1c3RvbSBNb25nb0RCIFtgcmVhZFByZWZlcmVuY2VgXShodHRwczovL2RvY3MubW9uZ29kYi5jb20vbWFudWFsL2NvcmUvcmVhZC1wcmVmZXJlbmNlKSBmb3IgdGhpcyBwYXJ0aWN1bGFyIGN1cnNvci4gUG9zc2libGUgdmFsdWVzIGFyZSBgcHJpbWFyeWAsIGBwcmltYXJ5UHJlZmVycmVkYCwgYHNlY29uZGFyeWAsIGBzZWNvbmRhcnlQcmVmZXJyZWRgIGFuZCBgbmVhcmVzdGAuXG4gICAqIEByZXR1cm5zIHtNb25nby5DdXJzb3J9XG4gICAqL1xuICBmaW5kKC4uLmFyZ3MpIHtcbiAgICAvLyBDb2xsZWN0aW9uLmZpbmQoKSAocmV0dXJuIGFsbCBkb2NzKSBiZWhhdmVzIGRpZmZlcmVudGx5XG4gICAgLy8gZnJvbSBDb2xsZWN0aW9uLmZpbmQodW5kZWZpbmVkKSAocmV0dXJuIDAgZG9jcykuICBzbyBiZVxuICAgIC8vIGNhcmVmdWwgYWJvdXQgdGhlIGxlbmd0aCBvZiBhcmd1bWVudHMuXG4gICAgcmV0dXJuIHRoaXMuX2NvbGxlY3Rpb24uZmluZChcbiAgICAgIHRoaXMuX2dldEZpbmRTZWxlY3RvcihhcmdzKSxcbiAgICAgIHRoaXMuX2dldEZpbmRPcHRpb25zKGFyZ3MpXG4gICAgKTtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgRmluZHMgdGhlIGZpcnN0IGRvY3VtZW50IHRoYXQgbWF0Y2hlcyB0aGUgc2VsZWN0b3IsIGFzIG9yZGVyZWQgYnkgc29ydCBhbmQgc2tpcCBvcHRpb25zLiBSZXR1cm5zIGB1bmRlZmluZWRgIGlmIG5vIG1hdGNoaW5nIGRvY3VtZW50IGlzIGZvdW5kLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCBmaW5kT25lXG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IFtzZWxlY3Rvcl0gQSBxdWVyeSBkZXNjcmliaW5nIHRoZSBkb2N1bWVudHMgdG8gZmluZFxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gICAqIEBwYXJhbSB7TW9uZ29Tb3J0U3BlY2lmaWVyfSBvcHRpb25zLnNvcnQgU29ydCBvcmRlciAoZGVmYXVsdDogbmF0dXJhbCBvcmRlcilcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMuc2tpcCBOdW1iZXIgb2YgcmVzdWx0cyB0byBza2lwIGF0IHRoZSBiZWdpbm5pbmdcbiAgICogQHBhcmFtIHtNb25nb0ZpZWxkU3BlY2lmaWVyfSBvcHRpb25zLmZpZWxkcyBEaWN0aW9uYXJ5IG9mIGZpZWxkcyB0byByZXR1cm4gb3IgZXhjbHVkZS5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnJlYWN0aXZlIChDbGllbnQgb25seSkgRGVmYXVsdCB0cnVlOyBwYXNzIGZhbHNlIHRvIGRpc2FibGUgcmVhY3Rpdml0eVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcHRpb25zLnRyYW5zZm9ybSBPdmVycmlkZXMgYHRyYW5zZm9ybWAgb24gdGhlIFtgQ29sbGVjdGlvbmBdKCNjb2xsZWN0aW9ucykgZm9yIHRoaXMgY3Vyc29yLiAgUGFzcyBgbnVsbGAgdG8gZGlzYWJsZSB0cmFuc2Zvcm1hdGlvbi5cbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdGlvbnMucmVhZFByZWZlcmVuY2UgKFNlcnZlciBvbmx5KSBTcGVjaWZpZXMgYSBjdXN0b20gTW9uZ29EQiBbYHJlYWRQcmVmZXJlbmNlYF0oaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9jb3JlL3JlYWQtcHJlZmVyZW5jZSkgZm9yIGZldGNoaW5nIHRoZSBkb2N1bWVudC4gUG9zc2libGUgdmFsdWVzIGFyZSBgcHJpbWFyeWAsIGBwcmltYXJ5UHJlZmVycmVkYCwgYHNlY29uZGFyeWAsIGBzZWNvbmRhcnlQcmVmZXJyZWRgIGFuZCBgbmVhcmVzdGAuXG4gICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAqL1xuICBmaW5kT25lKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5fY29sbGVjdGlvbi5maW5kT25lKFxuICAgICAgdGhpcy5fZ2V0RmluZFNlbGVjdG9yKGFyZ3MpLFxuICAgICAgdGhpcy5fZ2V0RmluZE9wdGlvbnMoYXJncylcbiAgICApO1xuICB9LFxuXG5cbiAgLy8gJ2luc2VydCcgaW1tZWRpYXRlbHkgcmV0dXJucyB0aGUgaW5zZXJ0ZWQgZG9jdW1lbnQncyBuZXcgX2lkLlxuICAvLyBUaGUgb3RoZXJzIHJldHVybiB2YWx1ZXMgaW1tZWRpYXRlbHkgaWYgeW91IGFyZSBpbiBhIHN0dWIsIGFuIGluLW1lbW9yeVxuICAvLyB1bm1hbmFnZWQgY29sbGVjdGlvbiwgb3IgYSBtb25nby1iYWNrZWQgY29sbGVjdGlvbiBhbmQgeW91IGRvbid0IHBhc3MgYVxuICAvLyBjYWxsYmFjay4gJ3VwZGF0ZScgYW5kICdyZW1vdmUnIHJldHVybiB0aGUgbnVtYmVyIG9mIGFmZmVjdGVkXG4gIC8vIGRvY3VtZW50cy4gJ3Vwc2VydCcgcmV0dXJucyBhbiBvYmplY3Qgd2l0aCBrZXlzICdudW1iZXJBZmZlY3RlZCcgYW5kLCBpZiBhblxuICAvLyBpbnNlcnQgaGFwcGVuZWQsICdpbnNlcnRlZElkJy5cbiAgLy9cbiAgLy8gT3RoZXJ3aXNlLCB0aGUgc2VtYW50aWNzIGFyZSBleGFjdGx5IGxpa2Ugb3RoZXIgbWV0aG9kczogdGhleSB0YWtlXG4gIC8vIGEgY2FsbGJhY2sgYXMgYW4gb3B0aW9uYWwgbGFzdCBhcmd1bWVudDsgaWYgbm8gY2FsbGJhY2sgaXNcbiAgLy8gcHJvdmlkZWQsIHRoZXkgYmxvY2sgdW50aWwgdGhlIG9wZXJhdGlvbiBpcyBjb21wbGV0ZSwgYW5kIHRocm93IGFuXG4gIC8vIGV4Y2VwdGlvbiBpZiBpdCBmYWlsczsgaWYgYSBjYWxsYmFjayBpcyBwcm92aWRlZCwgdGhlbiB0aGV5IGRvbid0XG4gIC8vIG5lY2Vzc2FyaWx5IGJsb2NrLCBhbmQgdGhleSBjYWxsIHRoZSBjYWxsYmFjayB3aGVuIHRoZXkgZmluaXNoIHdpdGggZXJyb3IgYW5kXG4gIC8vIHJlc3VsdCBhcmd1bWVudHMuICAoVGhlIGluc2VydCBtZXRob2QgcHJvdmlkZXMgdGhlIGRvY3VtZW50IElEIGFzIGl0cyByZXN1bHQ7XG4gIC8vIHVwZGF0ZSBhbmQgcmVtb3ZlIHByb3ZpZGUgdGhlIG51bWJlciBvZiBhZmZlY3RlZCBkb2NzIGFzIHRoZSByZXN1bHQ7IHVwc2VydFxuICAvLyBwcm92aWRlcyBhbiBvYmplY3Qgd2l0aCBudW1iZXJBZmZlY3RlZCBhbmQgbWF5YmUgaW5zZXJ0ZWRJZC4pXG4gIC8vXG4gIC8vIE9uIHRoZSBjbGllbnQsIGJsb2NraW5nIGlzIGltcG9zc2libGUsIHNvIGlmIGEgY2FsbGJhY2tcbiAgLy8gaXNuJ3QgcHJvdmlkZWQsIHRoZXkganVzdCByZXR1cm4gaW1tZWRpYXRlbHkgYW5kIGFueSBlcnJvclxuICAvLyBpbmZvcm1hdGlvbiBpcyBsb3N0LlxuICAvL1xuICAvLyBUaGVyZSdzIG9uZSBtb3JlIHR3ZWFrLiBPbiB0aGUgY2xpZW50LCBpZiB5b3UgZG9uJ3QgcHJvdmlkZSBhXG4gIC8vIGNhbGxiYWNrLCB0aGVuIGlmIHRoZXJlIGlzIGFuIGVycm9yLCBhIG1lc3NhZ2Ugd2lsbCBiZSBsb2dnZWQgd2l0aFxuICAvLyBNZXRlb3IuX2RlYnVnLlxuICAvL1xuICAvLyBUaGUgaW50ZW50ICh0aG91Z2ggdGhpcyBpcyBhY3R1YWxseSBkZXRlcm1pbmVkIGJ5IHRoZSB1bmRlcmx5aW5nXG4gIC8vIGRyaXZlcnMpIGlzIHRoYXQgdGhlIG9wZXJhdGlvbnMgc2hvdWxkIGJlIGRvbmUgc3luY2hyb25vdXNseSwgbm90XG4gIC8vIGdlbmVyYXRpbmcgdGhlaXIgcmVzdWx0IHVudGlsIHRoZSBkYXRhYmFzZSBoYXMgYWNrbm93bGVkZ2VkXG4gIC8vIHRoZW0uIEluIHRoZSBmdXR1cmUgbWF5YmUgd2Ugc2hvdWxkIHByb3ZpZGUgYSBmbGFnIHRvIHR1cm4gdGhpc1xuICAvLyBvZmYuXG5cbiAgX2luc2VydChkb2MsIGNhbGxiYWNrKSB7XG4gICAgLy8gTWFrZSBzdXJlIHdlIHdlcmUgcGFzc2VkIGEgZG9jdW1lbnQgdG8gaW5zZXJ0XG4gICAgaWYgKCFkb2MpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignaW5zZXJ0IHJlcXVpcmVzIGFuIGFyZ3VtZW50Jyk7XG4gICAgfVxuXG5cbiAgICAvLyBNYWtlIGEgc2hhbGxvdyBjbG9uZSBvZiB0aGUgZG9jdW1lbnQsIHByZXNlcnZpbmcgaXRzIHByb3RvdHlwZS5cbiAgICBkb2MgPSBPYmplY3QuY3JlYXRlKFxuICAgICAgT2JqZWN0LmdldFByb3RvdHlwZU9mKGRvYyksXG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhkb2MpXG4gICAgKTtcblxuICAgIGlmICgnX2lkJyBpbiBkb2MpIHtcbiAgICAgIGlmIChcbiAgICAgICAgIWRvYy5faWQgfHxcbiAgICAgICAgISh0eXBlb2YgZG9jLl9pZCA9PT0gJ3N0cmluZycgfHwgZG9jLl9pZCBpbnN0YW5jZW9mIE1vbmdvLk9iamVjdElEKVxuICAgICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnTWV0ZW9yIHJlcXVpcmVzIGRvY3VtZW50IF9pZCBmaWVsZHMgdG8gYmUgbm9uLWVtcHR5IHN0cmluZ3Mgb3IgT2JqZWN0SURzJ1xuICAgICAgICApO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgZ2VuZXJhdGVJZCA9IHRydWU7XG5cbiAgICAgIC8vIERvbid0IGdlbmVyYXRlIHRoZSBpZCBpZiB3ZSdyZSB0aGUgY2xpZW50IGFuZCB0aGUgJ291dGVybW9zdCcgY2FsbFxuICAgICAgLy8gVGhpcyBvcHRpbWl6YXRpb24gc2F2ZXMgdXMgcGFzc2luZyBib3RoIHRoZSByYW5kb21TZWVkIGFuZCB0aGUgaWRcbiAgICAgIC8vIFBhc3NpbmcgYm90aCBpcyByZWR1bmRhbnQuXG4gICAgICBpZiAodGhpcy5faXNSZW1vdGVDb2xsZWN0aW9uKCkpIHtcbiAgICAgICAgY29uc3QgZW5jbG9zaW5nID0gRERQLl9DdXJyZW50TWV0aG9kSW52b2NhdGlvbi5nZXQoKTtcbiAgICAgICAgaWYgKCFlbmNsb3NpbmcpIHtcbiAgICAgICAgICBnZW5lcmF0ZUlkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGdlbmVyYXRlSWQpIHtcbiAgICAgICAgZG9jLl9pZCA9IHRoaXMuX21ha2VOZXdJRCgpO1xuICAgICAgfVxuICAgIH1cblxuXG4gICAgLy8gT24gaW5zZXJ0cywgYWx3YXlzIHJldHVybiB0aGUgaWQgdGhhdCB3ZSBnZW5lcmF0ZWQ7IG9uIGFsbCBvdGhlclxuICAgIC8vIG9wZXJhdGlvbnMsIGp1c3QgcmV0dXJuIHRoZSByZXN1bHQgZnJvbSB0aGUgY29sbGVjdGlvbi5cbiAgICB2YXIgY2hvb3NlUmV0dXJuVmFsdWVGcm9tQ29sbGVjdGlvblJlc3VsdCA9IGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgaWYgKE1ldGVvci5faXNQcm9taXNlKHJlc3VsdCkpIHJldHVybiByZXN1bHQ7XG5cbiAgICAgIGlmIChkb2MuX2lkKSB7XG4gICAgICAgIHJldHVybiBkb2MuX2lkO1xuICAgICAgfVxuXG4gICAgICAvLyBYWFggd2hhdCBpcyB0aGlzIGZvcj8/XG4gICAgICAvLyBJdCdzIHNvbWUgaXRlcmFjdGlvbiBiZXR3ZWVuIHRoZSBjYWxsYmFjayB0byBfY2FsbE11dGF0b3JNZXRob2QgYW5kXG4gICAgICAvLyB0aGUgcmV0dXJuIHZhbHVlIGNvbnZlcnNpb25cbiAgICAgIGRvYy5faWQgPSByZXN1bHQ7XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcblxuICAgIGNvbnN0IHdyYXBwZWRDYWxsYmFjayA9IHdyYXBDYWxsYmFjayhcbiAgICAgIGNhbGxiYWNrLFxuICAgICAgY2hvb3NlUmV0dXJuVmFsdWVGcm9tQ29sbGVjdGlvblJlc3VsdFxuICAgICk7XG5cbiAgICBpZiAodGhpcy5faXNSZW1vdGVDb2xsZWN0aW9uKCkpIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuX2NhbGxNdXRhdG9yTWV0aG9kKCdpbnNlcnQnLCBbZG9jXSwgd3JhcHBlZENhbGxiYWNrKTtcbiAgICAgIHJldHVybiBjaG9vc2VSZXR1cm5WYWx1ZUZyb21Db2xsZWN0aW9uUmVzdWx0KHJlc3VsdCk7XG4gICAgfVxuXG4gICAgLy8gaXQncyBteSBjb2xsZWN0aW9uLiAgZGVzY2VuZCBpbnRvIHRoZSBjb2xsZWN0aW9uIG9iamVjdFxuICAgIC8vIGFuZCBwcm9wYWdhdGUgYW55IGV4Y2VwdGlvbi5cbiAgICB0cnkge1xuICAgICAgLy8gSWYgdGhlIHVzZXIgcHJvdmlkZWQgYSBjYWxsYmFjayBhbmQgdGhlIGNvbGxlY3Rpb24gaW1wbGVtZW50cyB0aGlzXG4gICAgICAvLyBvcGVyYXRpb24gYXN5bmNocm9ub3VzbHksIHRoZW4gcXVlcnlSZXQgd2lsbCBiZSB1bmRlZmluZWQsIGFuZCB0aGVcbiAgICAgIC8vIHJlc3VsdCB3aWxsIGJlIHJldHVybmVkIHRocm91Z2ggdGhlIGNhbGxiYWNrIGluc3RlYWQuXG4gICAgICBsZXQgcmVzdWx0O1xuICAgICAgaWYgKCEhd3JhcHBlZENhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuX2NvbGxlY3Rpb24uaW5zZXJ0KGRvYywgd3JhcHBlZENhbGxiYWNrKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIHdlIGRvbid0IGhhdmUgdGhlIGNhbGxiYWNrLCB3ZSBhc3N1bWUgdGhlIHVzZXIgaXMgdXNpbmcgdGhlIHByb21pc2UuXG4gICAgICAgIC8vIFdlIGNhbid0IGp1c3QgcGFzcyB0aGlzLl9jb2xsZWN0aW9uLmluc2VydCB0byB0aGUgcHJvbWlzaWZ5IGJlY2F1c2UgaXQgd291bGQgbG9zZSB0aGUgY29udGV4dC5cbiAgICAgICAgcmVzdWx0ID0gdGhpcy5fY29sbGVjdGlvbi5pbnNlcnQoZG9jKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNob29zZVJldHVyblZhbHVlRnJvbUNvbGxlY3Rpb25SZXN1bHQocmVzdWx0KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2soZSk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEluc2VydCBhIGRvY3VtZW50IGluIHRoZSBjb2xsZWN0aW9uLiAgUmV0dXJucyBpdHMgdW5pcXVlIF9pZC5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgIGluc2VydFxuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtPYmplY3R9IGRvYyBUaGUgZG9jdW1lbnQgdG8gaW5zZXJ0LiBNYXkgbm90IHlldCBoYXZlIGFuIF9pZCBhdHRyaWJ1dGUsIGluIHdoaWNoIGNhc2UgTWV0ZW9yIHdpbGwgZ2VuZXJhdGUgb25lIGZvciB5b3UuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gT3B0aW9uYWwuICBJZiBwcmVzZW50LCBjYWxsZWQgd2l0aCBhbiBlcnJvciBvYmplY3QgYXMgdGhlIGZpcnN0IGFyZ3VtZW50IGFuZCwgaWYgbm8gZXJyb3IsIHRoZSBfaWQgYXMgdGhlIHNlY29uZC5cbiAgICovXG4gIGluc2VydChkb2MsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuX2luc2VydChkb2MsIGNhbGxiYWNrKTtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgQXN5bmNocm9ub3VzbHkgbW9kaWZpZXMgb25lIG9yIG1vcmUgZG9jdW1lbnRzIGluIHRoZSBjb2xsZWN0aW9uLiBSZXR1cm5zIHRoZSBudW1iZXIgb2YgbWF0Y2hlZCBkb2N1bWVudHMuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWV0aG9kIHVwZGF0ZVxuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtNb25nb1NlbGVjdG9yfSBzZWxlY3RvciBTcGVjaWZpZXMgd2hpY2ggZG9jdW1lbnRzIHRvIG1vZGlmeVxuICAgKiBAcGFyYW0ge01vbmdvTW9kaWZpZXJ9IG1vZGlmaWVyIFNwZWNpZmllcyBob3cgdG8gbW9kaWZ5IHRoZSBkb2N1bWVudHNcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMubXVsdGkgVHJ1ZSB0byBtb2RpZnkgYWxsIG1hdGNoaW5nIGRvY3VtZW50czsgZmFsc2UgdG8gb25seSBtb2RpZnkgb25lIG9mIHRoZSBtYXRjaGluZyBkb2N1bWVudHMgKHRoZSBkZWZhdWx0KS5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnVwc2VydCBUcnVlIHRvIGluc2VydCBhIGRvY3VtZW50IGlmIG5vIG1hdGNoaW5nIGRvY3VtZW50cyBhcmUgZm91bmQuXG4gICAqIEBwYXJhbSB7QXJyYXl9IG9wdGlvbnMuYXJyYXlGaWx0ZXJzIE9wdGlvbmFsLiBVc2VkIGluIGNvbWJpbmF0aW9uIHdpdGggTW9uZ29EQiBbZmlsdGVyZWQgcG9zaXRpb25hbCBvcGVyYXRvcl0oaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9yZWZlcmVuY2Uvb3BlcmF0b3IvdXBkYXRlL3Bvc2l0aW9uYWwtZmlsdGVyZWQvKSB0byBzcGVjaWZ5IHdoaWNoIGVsZW1lbnRzIHRvIG1vZGlmeSBpbiBhbiBhcnJheSBmaWVsZC5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSBPcHRpb25hbC4gIElmIHByZXNlbnQsIGNhbGxlZCB3aXRoIGFuIGVycm9yIG9iamVjdCBhcyB0aGUgZmlyc3QgYXJndW1lbnQgYW5kLCBpZiBubyBlcnJvciwgdGhlIG51bWJlciBvZiBhZmZlY3RlZCBkb2N1bWVudHMgYXMgdGhlIHNlY29uZC5cbiAgICovXG4gIHVwZGF0ZShzZWxlY3RvciwgbW9kaWZpZXIsIC4uLm9wdGlvbnNBbmRDYWxsYmFjaykge1xuICAgIGNvbnN0IGNhbGxiYWNrID0gcG9wQ2FsbGJhY2tGcm9tQXJncyhvcHRpb25zQW5kQ2FsbGJhY2spO1xuXG4gICAgLy8gV2UndmUgYWxyZWFkeSBwb3BwZWQgb2ZmIHRoZSBjYWxsYmFjaywgc28gd2UgYXJlIGxlZnQgd2l0aCBhbiBhcnJheVxuICAgIC8vIG9mIG9uZSBvciB6ZXJvIGl0ZW1zXG4gICAgY29uc3Qgb3B0aW9ucyA9IHsgLi4uKG9wdGlvbnNBbmRDYWxsYmFja1swXSB8fCBudWxsKSB9O1xuICAgIGxldCBpbnNlcnRlZElkO1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMudXBzZXJ0KSB7XG4gICAgICAvLyBzZXQgYGluc2VydGVkSWRgIGlmIGFic2VudC4gIGBpbnNlcnRlZElkYCBpcyBhIE1ldGVvciBleHRlbnNpb24uXG4gICAgICBpZiAob3B0aW9ucy5pbnNlcnRlZElkKSB7XG4gICAgICAgIGlmIChcbiAgICAgICAgICAhKFxuICAgICAgICAgICAgdHlwZW9mIG9wdGlvbnMuaW5zZXJ0ZWRJZCA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgICAgIG9wdGlvbnMuaW5zZXJ0ZWRJZCBpbnN0YW5jZW9mIE1vbmdvLk9iamVjdElEXG4gICAgICAgICAgKVxuICAgICAgICApXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbnNlcnRlZElkIG11c3QgYmUgc3RyaW5nIG9yIE9iamVjdElEJyk7XG4gICAgICAgIGluc2VydGVkSWQgPSBvcHRpb25zLmluc2VydGVkSWQ7XG4gICAgICB9IGVsc2UgaWYgKCFzZWxlY3RvciB8fCAhc2VsZWN0b3IuX2lkKSB7XG4gICAgICAgIGluc2VydGVkSWQgPSB0aGlzLl9tYWtlTmV3SUQoKTtcbiAgICAgICAgb3B0aW9ucy5nZW5lcmF0ZWRJZCA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMuaW5zZXJ0ZWRJZCA9IGluc2VydGVkSWQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgc2VsZWN0b3IgPSBNb25nby5Db2xsZWN0aW9uLl9yZXdyaXRlU2VsZWN0b3Ioc2VsZWN0b3IsIHtcbiAgICAgIGZhbGxiYWNrSWQ6IGluc2VydGVkSWQsXG4gICAgfSk7XG5cbiAgICBjb25zdCB3cmFwcGVkQ2FsbGJhY2sgPSB3cmFwQ2FsbGJhY2soY2FsbGJhY2spO1xuXG4gICAgaWYgKHRoaXMuX2lzUmVtb3RlQ29sbGVjdGlvbigpKSB7XG4gICAgICBjb25zdCBhcmdzID0gW3NlbGVjdG9yLCBtb2RpZmllciwgb3B0aW9uc107XG4gICAgICByZXR1cm4gdGhpcy5fY2FsbE11dGF0b3JNZXRob2QoJ3VwZGF0ZScsIGFyZ3MsIGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICAvLyBpdCdzIG15IGNvbGxlY3Rpb24uICBkZXNjZW5kIGludG8gdGhlIGNvbGxlY3Rpb24gb2JqZWN0XG4gICAgLy8gYW5kIHByb3BhZ2F0ZSBhbnkgZXhjZXB0aW9uLlxuICAgIC8vIElmIHRoZSB1c2VyIHByb3ZpZGVkIGEgY2FsbGJhY2sgYW5kIHRoZSBjb2xsZWN0aW9uIGltcGxlbWVudHMgdGhpc1xuICAgIC8vIG9wZXJhdGlvbiBhc3luY2hyb25vdXNseSwgdGhlbiBxdWVyeVJldCB3aWxsIGJlIHVuZGVmaW5lZCwgYW5kIHRoZVxuICAgIC8vIHJlc3VsdCB3aWxsIGJlIHJldHVybmVkIHRocm91Z2ggdGhlIGNhbGxiYWNrIGluc3RlYWQuXG4gICAgLy9jb25zb2xlLmxvZyh7Y2FsbGJhY2ssIG9wdGlvbnMsIHNlbGVjdG9yLCBtb2RpZmllciwgY29sbDogdGhpcy5fY29sbGVjdGlvbn0pO1xuICAgIHRyeSB7XG4gICAgICAvLyBJZiB0aGUgdXNlciBwcm92aWRlZCBhIGNhbGxiYWNrIGFuZCB0aGUgY29sbGVjdGlvbiBpbXBsZW1lbnRzIHRoaXNcbiAgICAgIC8vIG9wZXJhdGlvbiBhc3luY2hyb25vdXNseSwgdGhlbiBxdWVyeVJldCB3aWxsIGJlIHVuZGVmaW5lZCwgYW5kIHRoZVxuICAgICAgLy8gcmVzdWx0IHdpbGwgYmUgcmV0dXJuZWQgdGhyb3VnaCB0aGUgY2FsbGJhY2sgaW5zdGVhZC5cbiAgICAgIHJldHVybiB0aGlzLl9jb2xsZWN0aW9uLnVwZGF0ZShcbiAgICAgICAgc2VsZWN0b3IsXG4gICAgICAgIG1vZGlmaWVyLFxuICAgICAgICBvcHRpb25zLFxuICAgICAgICB3cmFwcGVkQ2FsbGJhY2tcbiAgICAgICk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrKGUpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBSZW1vdmUgZG9jdW1lbnRzIGZyb20gdGhlIGNvbGxlY3Rpb25cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgcmVtb3ZlXG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IHNlbGVjdG9yIFNwZWNpZmllcyB3aGljaCBkb2N1bWVudHMgdG8gcmVtb3ZlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gT3B0aW9uYWwuICBJZiBwcmVzZW50LCBjYWxsZWQgd2l0aCBhbiBlcnJvciBvYmplY3QgYXMgdGhlIGZpcnN0IGFyZ3VtZW50IGFuZCwgaWYgbm8gZXJyb3IsIHRoZSBudW1iZXIgb2YgYWZmZWN0ZWQgZG9jdW1lbnRzIGFzIHRoZSBzZWNvbmQuXG4gICAqL1xuICByZW1vdmUoc2VsZWN0b3IsIGNhbGxiYWNrKSB7XG4gICAgc2VsZWN0b3IgPSBNb25nby5Db2xsZWN0aW9uLl9yZXdyaXRlU2VsZWN0b3Ioc2VsZWN0b3IpO1xuXG4gICAgaWYgKHRoaXMuX2lzUmVtb3RlQ29sbGVjdGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fY2FsbE11dGF0b3JNZXRob2QoJ3JlbW92ZScsIFtzZWxlY3Rvcl0sIGNhbGxiYWNrKTtcbiAgICB9XG5cblxuICAgIC8vIGl0J3MgbXkgY29sbGVjdGlvbi4gIGRlc2NlbmQgaW50byB0aGUgY29sbGVjdGlvbjEgb2JqZWN0XG4gICAgLy8gYW5kIHByb3BhZ2F0ZSBhbnkgZXhjZXB0aW9uLlxuICAgIHJldHVybiB0aGlzLl9jb2xsZWN0aW9uLnJlbW92ZShzZWxlY3Rvcik7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEFzeW5jaHJvbm91c2x5IG1vZGlmaWVzIG9uZSBvciBtb3JlIGRvY3VtZW50cyBpbiB0aGUgY29sbGVjdGlvbiwgb3IgaW5zZXJ0IG9uZSBpZiBubyBtYXRjaGluZyBkb2N1bWVudHMgd2VyZSBmb3VuZC4gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCBrZXlzIGBudW1iZXJBZmZlY3RlZGAgKHRoZSBudW1iZXIgb2YgZG9jdW1lbnRzIG1vZGlmaWVkKSAgYW5kIGBpbnNlcnRlZElkYCAodGhlIHVuaXF1ZSBfaWQgb2YgdGhlIGRvY3VtZW50IHRoYXQgd2FzIGluc2VydGVkLCBpZiBhbnkpLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCB1cHNlcnRcbiAgICogQG1lbWJlcm9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7TW9uZ29TZWxlY3Rvcn0gc2VsZWN0b3IgU3BlY2lmaWVzIHdoaWNoIGRvY3VtZW50cyB0byBtb2RpZnlcbiAgICogQHBhcmFtIHtNb25nb01vZGlmaWVyfSBtb2RpZmllciBTcGVjaWZpZXMgaG93IHRvIG1vZGlmeSB0aGUgZG9jdW1lbnRzXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLm11bHRpIFRydWUgdG8gbW9kaWZ5IGFsbCBtYXRjaGluZyBkb2N1bWVudHM7IGZhbHNlIHRvIG9ubHkgbW9kaWZ5IG9uZSBvZiB0aGUgbWF0Y2hpbmcgZG9jdW1lbnRzICh0aGUgZGVmYXVsdCkuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gT3B0aW9uYWwuICBJZiBwcmVzZW50LCBjYWxsZWQgd2l0aCBhbiBlcnJvciBvYmplY3QgYXMgdGhlIGZpcnN0IGFyZ3VtZW50IGFuZCwgaWYgbm8gZXJyb3IsIHRoZSBudW1iZXIgb2YgYWZmZWN0ZWQgZG9jdW1lbnRzIGFzIHRoZSBzZWNvbmQuXG4gICAqL1xuICB1cHNlcnQoc2VsZWN0b3IsIG1vZGlmaWVyLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmICghY2FsbGJhY2sgJiYgdHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy51cGRhdGUoXG4gICAgICBzZWxlY3RvcixcbiAgICAgIG1vZGlmaWVyLFxuICAgICAge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBfcmV0dXJuT2JqZWN0OiB0cnVlLFxuICAgICAgICB1cHNlcnQ6IHRydWUsXG4gICAgICB9KTtcbiAgfSxcbn1cblxuLy8gQ29udmVydCB0aGUgY2FsbGJhY2sgdG8gbm90IHJldHVybiBhIHJlc3VsdCBpZiB0aGVyZSBpcyBhbiBlcnJvclxuZnVuY3Rpb24gd3JhcENhbGxiYWNrKGNhbGxiYWNrLCBjb252ZXJ0UmVzdWx0KSB7XG4gIHJldHVybiAoXG4gICAgY2FsbGJhY2sgJiZcbiAgICBmdW5jdGlvbihlcnJvciwgcmVzdWx0KSB7XG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgY2FsbGJhY2soZXJyb3IpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgY29udmVydFJlc3VsdCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBjYWxsYmFjayhlcnJvciwgY29udmVydFJlc3VsdChyZXN1bHQpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCByZXN1bHQpO1xuICAgICAgfVxuICAgIH1cbiAgKTtcbn1cblxuZnVuY3Rpb24gcG9wQ2FsbGJhY2tGcm9tQXJncyhhcmdzKSB7XG4gIC8vIFB1bGwgb2ZmIGFueSBjYWxsYmFjayAob3IgcGVyaGFwcyBhICdjYWxsYmFjaycgdmFyaWFibGUgdGhhdCB3YXMgcGFzc2VkXG4gIC8vIGluIHVuZGVmaW5lZCwgbGlrZSBob3cgJ3Vwc2VydCcgZG9lcyBpdCkuXG4gIGlmIChcbiAgICBhcmdzLmxlbmd0aCAmJlxuICAgIChhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gPT09IHVuZGVmaW5lZCB8fFxuICAgICAgYXJnc1thcmdzLmxlbmd0aCAtIDFdIGluc3RhbmNlb2YgRnVuY3Rpb24pXG4gICkge1xuICAgIHJldHVybiBhcmdzLnBvcCgpO1xuICB9XG59XG4iLCIvKipcbiAqIEBzdW1tYXJ5IEFsbG93cyBmb3IgdXNlciBzcGVjaWZpZWQgY29ubmVjdGlvbiBvcHRpb25zXG4gKiBAZXhhbXBsZSBodHRwOi8vbW9uZ29kYi5naXRodWIuaW8vbm9kZS1tb25nb2RiLW5hdGl2ZS8zLjAvcmVmZXJlbmNlL2Nvbm5lY3RpbmcvY29ubmVjdGlvbi1zZXR0aW5ncy9cbiAqIEBsb2N1cyBTZXJ2ZXJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIFVzZXIgc3BlY2lmaWVkIE1vbmdvIGNvbm5lY3Rpb24gb3B0aW9uc1xuICovXG5Nb25nby5zZXRDb25uZWN0aW9uT3B0aW9ucyA9IGZ1bmN0aW9uIHNldENvbm5lY3Rpb25PcHRpb25zIChvcHRpb25zKSB7XG4gIGNoZWNrKG9wdGlvbnMsIE9iamVjdCk7XG4gIE1vbmdvLl9jb25uZWN0aW9uT3B0aW9ucyA9IG9wdGlvbnM7XG59OyIsImV4cG9ydCBjb25zdCBub3JtYWxpemVQcm9qZWN0aW9uID0gb3B0aW9ucyA9PiB7XG4gIC8vIHRyYW5zZm9ybSBmaWVsZHMga2V5IGluIHByb2plY3Rpb25cbiAgY29uc3QgeyBmaWVsZHMsIHByb2plY3Rpb24sIC4uLm90aGVyT3B0aW9ucyB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgLy8gVE9ETzogZW5hYmxlIHRoaXMgY29tbWVudCB3aGVuIGRlcHJlY2F0aW5nIHRoZSBmaWVsZHMgb3B0aW9uXG4gIC8vIExvZy5kZWJ1ZyhgZmllbGRzIG9wdGlvbiBoYXMgYmVlbiBkZXByZWNhdGVkLCBwbGVhc2UgdXNlIHRoZSBuZXcgJ3Byb2plY3Rpb24nIGluc3RlYWRgKVxuXG4gIHJldHVybiB7XG4gICAgLi4ub3RoZXJPcHRpb25zLFxuICAgIC4uLihwcm9qZWN0aW9uIHx8IGZpZWxkcyA/IHsgcHJvamVjdGlvbjogZmllbGRzIHx8IHByb2plY3Rpb24gfSA6IHt9KSxcbiAgfTtcbn07XG4iLCJpbXBvcnQgeyBPYnNlcnZlSGFuZGxlQ2FsbGJhY2ssIE9ic2VydmVNdWx0aXBsZXhlciB9IGZyb20gJy4vb2JzZXJ2ZV9tdWx0aXBsZXgnO1xuXG5sZXQgbmV4dE9ic2VydmVIYW5kbGVJZCA9IDE7XG5cbmV4cG9ydCB0eXBlIE9ic2VydmVIYW5kbGVDYWxsYmFja0ludGVybmFsID0gJ19hZGRlZCcgfCAnX2FkZGVkQmVmb3JlJyB8ICdfY2hhbmdlZCcgfCAnX21vdmVkQmVmb3JlJyB8ICdfcmVtb3ZlZCc7XG5cblxuZXhwb3J0IHR5cGUgQ2FsbGJhY2s8VCA9IGFueT4gPSAoLi4uYXJnczogVFtdKSA9PiBQcm9taXNlPHZvaWQ+IHwgdm9pZDtcblxuLyoqXG4gKiBUaGUgXCJvYnNlcnZlIGhhbmRsZVwiIHJldHVybmVkIGZyb20gb2JzZXJ2ZUNoYW5nZXMuXG4gKiBDb250YWlucyBhIHJlZmVyZW5jZSB0byBhbiBPYnNlcnZlTXVsdGlwbGV4ZXIuXG4gKiBVc2VkIHRvIHN0b3Agb2JzZXJ2YXRpb24gYW5kIGNsZWFuIHVwIHJlc291cmNlcy5cbiAqL1xuZXhwb3J0IGNsYXNzIE9ic2VydmVIYW5kbGU8VCA9IGFueT4ge1xuICBfaWQ6IG51bWJlcjtcbiAgX211bHRpcGxleGVyOiBPYnNlcnZlTXVsdGlwbGV4ZXI7XG4gIG5vbk11dGF0aW5nQ2FsbGJhY2tzOiBib29sZWFuO1xuICBfc3RvcHBlZDogYm9vbGVhbjtcblxuICBwdWJsaWMgaW5pdGlhbEFkZHNTZW50UmVzb2x2ZXI6ICh2YWx1ZTogdm9pZCkgPT4gdm9pZCA9ICgpID0+IHt9O1xuICBwdWJsaWMgaW5pdGlhbEFkZHNTZW50OiBQcm9taXNlPHZvaWQ+XG5cbiAgX2FkZGVkPzogQ2FsbGJhY2s8VD47XG4gIF9hZGRlZEJlZm9yZT86IENhbGxiYWNrPFQ+O1xuICBfY2hhbmdlZD86IENhbGxiYWNrPFQ+O1xuICBfbW92ZWRCZWZvcmU/OiBDYWxsYmFjazxUPjtcbiAgX3JlbW92ZWQ/OiBDYWxsYmFjazxUPjtcblxuICBjb25zdHJ1Y3RvcihtdWx0aXBsZXhlcjogT2JzZXJ2ZU11bHRpcGxleGVyLCBjYWxsYmFja3M6IFJlY29yZDxPYnNlcnZlSGFuZGxlQ2FsbGJhY2ssIENhbGxiYWNrPFQ+Piwgbm9uTXV0YXRpbmdDYWxsYmFja3M6IGJvb2xlYW4pIHtcbiAgICB0aGlzLl9tdWx0aXBsZXhlciA9IG11bHRpcGxleGVyO1xuXG4gICAgbXVsdGlwbGV4ZXIuY2FsbGJhY2tOYW1lcygpLmZvckVhY2goKG5hbWU6IE9ic2VydmVIYW5kbGVDYWxsYmFjaykgPT4ge1xuICAgICAgaWYgKGNhbGxiYWNrc1tuYW1lXSkge1xuICAgICAgICB0aGlzW2BfJHtuYW1lfWAgYXMgT2JzZXJ2ZUhhbmRsZUNhbGxiYWNrSW50ZXJuYWxdID0gY2FsbGJhY2tzW25hbWVdO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChuYW1lID09PSBcImFkZGVkQmVmb3JlXCIgJiYgY2FsbGJhY2tzLmFkZGVkKSB7XG4gICAgICAgIHRoaXMuX2FkZGVkQmVmb3JlID0gYXN5bmMgZnVuY3Rpb24gKGlkLCBmaWVsZHMsIGJlZm9yZSkge1xuICAgICAgICAgIGF3YWl0IGNhbGxiYWNrcy5hZGRlZChpZCwgZmllbGRzKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMuX3N0b3BwZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9pZCA9IG5leHRPYnNlcnZlSGFuZGxlSWQrKztcbiAgICB0aGlzLm5vbk11dGF0aW5nQ2FsbGJhY2tzID0gbm9uTXV0YXRpbmdDYWxsYmFja3M7XG5cbiAgICB0aGlzLmluaXRpYWxBZGRzU2VudCA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgY29uc3QgcmVhZHkgPSAoKSA9PiB7XG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgdGhpcy5pbml0aWFsQWRkc1NlbnQgPSBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdGltZW91dCA9IHNldFRpbWVvdXQocmVhZHksIDMwMDAwKVxuXG4gICAgICB0aGlzLmluaXRpYWxBZGRzU2VudFJlc29sdmVyID0gKCkgPT4ge1xuICAgICAgICByZWFkeSgpO1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFVzaW5nIHByb3BlcnR5IHN5bnRheCBhbmQgYXJyb3cgZnVuY3Rpb24gc3ludGF4IHRvIGF2b2lkIGJpbmRpbmcgdGhlIHdyb25nIGNvbnRleHQgb24gY2FsbGJhY2tzLlxuICAgKi9cbiAgc3RvcCA9IGFzeW5jICgpID0+IHtcbiAgICBpZiAodGhpcy5fc3RvcHBlZCkgcmV0dXJuO1xuICAgIHRoaXMuX3N0b3BwZWQgPSB0cnVlO1xuICAgIGF3YWl0IHRoaXMuX211bHRpcGxleGVyLnJlbW92ZUhhbmRsZSh0aGlzLl9pZCk7XG4gIH1cbn0iXX0=
