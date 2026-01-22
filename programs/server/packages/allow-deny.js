Package["core-runtime"].queue("allow-deny",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var ECMAScript = Package.ecmascript.ECMAScript;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;
var check = Package.check.check;
var Match = Package.check.Match;
var EJSON = Package.ejson.EJSON;
var DDP = Package['ddp-client'].DDP;
var DDPServer = Package['ddp-server'].DDPServer;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var AllowDeny;

var require = meteorInstall({"node_modules":{"meteor":{"allow-deny":{"allow-deny.js":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/allow-deny/allow-deny.js                                                                                //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);let _object_spread;module.link("@swc/helpers/_/_object_spread",{_(v){_object_spread=v}},1);///
/// Remote methods and access control.
///


const hasOwn = Object.prototype.hasOwnProperty;
// Restrict default mutators on collection. allow() and deny() take the
// same options:
//
// options.insertAsync {Function(userId, doc)}
//   return true to allow/deny adding this document
//
// options.updateAsync {Function(userId, docs, fields, modifier)}
//   return true to allow/deny updating these documents.
//   `fields` is passed as an array of fields that are to be modified
//
// options.removeAsync {Function(userId, docs)}
//   return true to allow/deny removing these documents
//
// options.fetch {Array}
//   Fields to fetch for these validators. If any call to allow or deny
//   does not have this option then all fields are loaded.
//
// allow and deny can be called multiple times. The validators are
// evaluated as follows:
// - If neither deny() nor allow() has been called on the collection,
//   then the request is allowed if and only if the "insecure" smart
//   package is in use.
// - Otherwise, if any deny() function returns true, the request is denied.
// - Otherwise, if any allow() function returns true, the request is allowed.
// - Otherwise, the request is denied.
//
// Meteor may call your deny() and allow() functions in any order, and may not
// call all of them if it is able to make a decision without calling them all
// (so don't include side effects).
AllowDeny = {
    CollectionPrototype: {}
};
// In the `mongo` package, we will extend Mongo.Collection.prototype with these
// methods
const CollectionPrototype = AllowDeny.CollectionPrototype;
/**
 * @summary Allow users to write directly to this collection from client code, subject to limitations you define.
 * @locus Server
 * @method allow
 * @memberOf Mongo.Collection
 * @instance
 * @param {Object} options
 * @param {Function} options.insert,update,remove Functions that look at a proposed modification to the database and return true if it should be allowed.
 * @param {String[]} options.fetch Optional performance enhancement. Limits the fields that will be fetched from the database for inspection by your `update` and `remove` functions.
 * @param {Function} options.transform Overrides `transform` on the  [`Collection`](#collections).  Pass `null` to disable transformation.
 */ CollectionPrototype.allow = function(options) {
    addValidator(this, 'allow', options);
};
/**
 * @summary Override `allow` rules.
 * @locus Server
 * @method deny
 * @memberOf Mongo.Collection
 * @instance
 * @param {Object} options
 * @param {Function} options.insert,update,remove Functions that look at a proposed modification to the database and return true if it should be denied, even if an [allow](#allow) rule says otherwise.
 * @param {String[]} options.fetch Optional performance enhancement. Limits the fields that will be fetched from the database for inspection by your `update` and `remove` functions.
 * @param {Function} options.transform Overrides `transform` on the  [`Collection`](#collections).  Pass `null` to disable transformation.
 */ CollectionPrototype.deny = function(options) {
    addValidator(this, 'deny', options);
};
CollectionPrototype._defineMutationMethods = function(options) {
    const self = this;
    options = options || {};
    // set to true once we call any allow or deny methods. If true, use
    // allow/deny semantics. If false, use insecure mode semantics.
    self._restricted = false;
    // Insecure mode (default to allowing writes). Defaults to 'undefined' which
    // means insecure iff the insecure package is loaded. This property can be
    // overriden by tests or packages wishing to change insecure mode behavior of
    // their collections.
    self._insecure = undefined;
    self._validators = {
        insert: {
            allow: [],
            deny: []
        },
        update: {
            allow: [],
            deny: []
        },
        remove: {
            allow: [],
            deny: []
        },
        insertAsync: {
            allow: [],
            deny: []
        },
        updateAsync: {
            allow: [],
            deny: []
        },
        removeAsync: {
            allow: [],
            deny: []
        },
        upsertAsync: {
            allow: [],
            deny: []
        },
        fetch: [],
        fetchAllFields: false
    };
    if (!self._name) return; // anonymous collection
    // XXX Think about method namespacing. Maybe methods should be
    // "Meteor:Mongo:insertAsync/NAME"?
    self._prefix = '/' + self._name + '/';
    // Mutation Methods
    // Minimongo on the server gets no stubs; instead, by default
    // it wait()s until its result is ready, yielding.
    // This matches the behavior of macromongo on the server better.
    // XXX see #MeteorServerNull
    if (self._connection && (self._connection === Meteor.server || Meteor.isClient)) {
        const m = {};
        [
            'insertAsync',
            'updateAsync',
            'removeAsync',
            'insert',
            'update',
            'remove'
        ].forEach((method)=>{
            const methodName = self._prefix + method;
            if (options.useExisting) {
                const handlerPropName = Meteor.isClient ? '_methodHandlers' : 'method_handlers';
                // Do not try to create additional methods if this has already been called.
                // (Otherwise the .methods() call below will throw an error.)
                if (self._connection[handlerPropName] && typeof self._connection[handlerPropName][methodName] === 'function') return;
            }
            const isInsert = (name)=>name.includes('insert');
            m[methodName] = function() {
                // All the methods do their own validation, instead of using check().
                check(arguments, [
                    Match.Any
                ]);
                const args = Array.from(arguments);
                try {
                    // For an insert/insertAsync, if the client didn't specify an _id, generate one
                    // now; because this uses DDP.randomStream, it will be consistent with
                    // what the client generated. We generate it now rather than later so
                    // that if (eg) an allow/deny rule does an insert/insertAsync to the same
                    // collection (not that it really should), the generated _id will
                    // still be the first use of the stream and will be consistent.
                    //
                    // However, we don't actually stick the _id onto the document yet,
                    // because we want allow/deny rules to be able to differentiate
                    // between arbitrary client-specified _id fields and merely
                    // client-controlled-via-randomSeed fields.
                    let generatedId = null;
                    if (isInsert(method) && !hasOwn.call(args[0], '_id')) {
                        generatedId = self._makeNewID();
                    }
                    if (this.isSimulation) {
                        // In a client simulation, you can do any mutation (even with a
                        // complex selector).
                        if (generatedId !== null) {
                            args[0]._id = generatedId;
                        }
                        return self._collection[method].apply(self._collection, args);
                    }
                    // This is the server receiving a method call from the client.
                    // We don't allow arbitrary selectors in mutations from the client: only
                    // single-ID selectors.
                    if (!isInsert(method)) throwIfSelectorIsNotId(args[0], method);
                    const syncMethodName = method.replace('Async', '');
                    const syncValidatedMethodName = '_validated' + method.charAt(0).toUpperCase() + syncMethodName.slice(1);
                    // it forces to use async validated behavior
                    const validatedMethodName = syncValidatedMethodName + 'Async';
                    if (self._restricted) {
                        // short circuit if there is no way it will pass.
                        if (self._validators[syncMethodName].allow.length === 0) {
                            throw new Meteor.Error(403, 'Access denied. No allow validators set on restricted ' + "collection for method '" + method + "'.");
                        }
                        args.unshift(this.userId);
                        isInsert(method) && args.push(generatedId);
                        return self[validatedMethodName].apply(self, args);
                    } else if (self._isInsecure()) {
                        if (generatedId !== null) args[0]._id = generatedId;
                        // In insecure mode we use the server _collection methods, and these sync methods
                        // do not exist in the server anymore, so we have this mapper to call the async methods
                        // instead.
                        const syncMethodsMapper = {
                            insert: "insertAsync",
                            update: "updateAsync",
                            remove: "removeAsync"
                        };
                        // In insecure mode, allow any mutation (with a simple selector).
                        // XXX This is kind of bogus.  Instead of blindly passing whatever
                        //     we get from the network to this function, we should actually
                        //     know the correct arguments for the function and pass just
                        //     them.  For example, if you have an extraneous extra null
                        //     argument and this is Mongo on the server, the .wrapAsync'd
                        //     functions like update will get confused and pass the
                        //     "fut.resolver()" in the wrong slot, where _update will never
                        //     invoke it. Bam, broken DDP connection.  Probably should just
                        //     take this whole method and write it three times, invoking
                        //     helpers for the common code.
                        return self._collection[syncMethodsMapper[method] || method].apply(self._collection, args);
                    } else {
                        // In secure mode, if we haven't called allow or deny, then nothing
                        // is permitted.
                        throw new Meteor.Error(403, 'Access denied');
                    }
                } catch (e) {
                    if (e.name === 'MongoError' || // for old versions of MongoDB (probably not necessary but it's here just in case)
                    e.name === 'BulkWriteError' || // for newer versions of MongoDB (https://docs.mongodb.com/drivers/node/current/whats-new/#bulkwriteerror---mongobulkwriteerror)
                    e.name === 'MongoBulkWriteError' || e.name === 'MinimongoError') {
                        throw new Meteor.Error(409, e.toString());
                    } else {
                        throw e;
                    }
                }
            };
        });
        self._connection.methods(m);
    }
};
CollectionPrototype._updateFetch = function(fields) {
    const self = this;
    if (!self._validators.fetchAllFields) {
        if (fields) {
            const union = Object.create(null);
            const add = (names)=>names && names.forEach((name)=>union[name] = 1);
            add(self._validators.fetch);
            add(fields);
            self._validators.fetch = Object.keys(union);
        } else {
            self._validators.fetchAllFields = true;
            // clear fetch just to make sure we don't accidentally read it
            self._validators.fetch = null;
        }
    }
};
CollectionPrototype._isInsecure = function() {
    const self = this;
    if (self._insecure === undefined) return !!Package.insecure;
    return self._insecure;
};
function asyncSome(array, predicate) {
    return _async_to_generator(function*() {
        for (let item of array){
            if (yield predicate(item)) {
                return true;
            }
        }
        return false;
    })();
}
function asyncEvery(array, predicate) {
    return _async_to_generator(function*() {
        for (let item of array){
            if (!(yield predicate(item))) {
                return false;
            }
        }
        return true;
    })();
}
CollectionPrototype._validatedInsertAsync = function(userId, doc, generatedId) {
    return _async_to_generator(function*() {
        const self = this;
        // call user validators.
        // Any deny returns true means denied.
        if (yield asyncSome(self._validators.insert.deny, (validator)=>_async_to_generator(function*() {
                const result = validator(userId, docToValidate(validator, doc, generatedId));
                return Meteor._isPromise(result) ? yield result : result;
            })())) {
            throw new Meteor.Error(403, "Access denied");
        }
        // Any allow returns true means proceed. Throw error if they all fail.
        if (yield asyncEvery(self._validators.insert.allow, (validator)=>_async_to_generator(function*() {
                const result = validator(userId, docToValidate(validator, doc, generatedId));
                return !(Meteor._isPromise(result) ? yield result : result);
            })())) {
            throw new Meteor.Error(403, "Access denied");
        }
        // If we generated an ID above, insertAsync it now: after the validation, but
        // before actually inserting.
        if (generatedId !== null) doc._id = generatedId;
        return self._collection.insertAsync.call(self._collection, doc);
    }).call(this);
};
// Simulate a mongo `update` operation while validating that the access
// control rules set by calls to `allow/deny` are satisfied. If all
// pass, rewrite the mongo operation to use $in to set the list of
// document ids to change ##ValidatedChange
CollectionPrototype._validatedUpdateAsync = function(userId, selector, mutator, options) {
    return _async_to_generator(function*() {
        const self = this;
        check(mutator, Object);
        options = Object.assign(Object.create(null), options);
        if (!LocalCollection._selectorIsIdPerhapsAsObject(selector)) throw new Error("validated update should be of a single ID");
        // We don't support upserts because they don't fit nicely into allow/deny
        // rules.
        if (options.upsert) throw new Meteor.Error(403, "Access denied. Upserts not " + "allowed in a restricted collection.");
        const noReplaceError = "Access denied. In a restricted collection you can only" + " update documents, not replace them. Use a Mongo update operator, such " + "as '$set'.";
        const mutatorKeys = Object.keys(mutator);
        // compute modified fields
        const modifiedFields = {};
        if (mutatorKeys.length === 0) {
            throw new Meteor.Error(403, noReplaceError);
        }
        mutatorKeys.forEach((op)=>{
            const params = mutator[op];
            if (op.charAt(0) !== '$') {
                throw new Meteor.Error(403, noReplaceError);
            } else if (!hasOwn.call(ALLOWED_UPDATE_OPERATIONS, op)) {
                throw new Meteor.Error(403, "Access denied. Operator " + op + " not allowed in a restricted collection.");
            } else {
                Object.keys(params).forEach((field)=>{
                    // treat dotted fields as if they are replacing their
                    // top-level part
                    if (field.indexOf('.') !== -1) field = field.substring(0, field.indexOf('.'));
                    // record the field we are trying to change
                    modifiedFields[field] = true;
                });
            }
        });
        const fields = Object.keys(modifiedFields);
        const findOptions = {
            transform: null
        };
        if (!self._validators.fetchAllFields) {
            findOptions.fields = {};
            self._validators.fetch.forEach((fieldName)=>{
                findOptions.fields[fieldName] = 1;
            });
        }
        const doc = yield self._collection.findOneAsync(selector, findOptions);
        if (!doc) return 0;
        // call user validators.
        // Any deny returns true means denied.
        if (yield asyncSome(self._validators.update.deny, (validator)=>_async_to_generator(function*() {
                const factoriedDoc = transformDoc(validator, doc);
                const result = validator(userId, factoriedDoc, fields, mutator);
                return Meteor._isPromise(result) ? yield result : result;
            })())) {
            throw new Meteor.Error(403, "Access denied");
        }
        // Any allow returns true means proceed. Throw error if they all fail.
        if (yield asyncEvery(self._validators.update.allow, (validator)=>_async_to_generator(function*() {
                const factoriedDoc = transformDoc(validator, doc);
                const result = validator(userId, factoriedDoc, fields, mutator);
                return !(Meteor._isPromise(result) ? yield result : result);
            })())) {
            throw new Meteor.Error(403, "Access denied");
        }
        options._forbidReplace = true;
        // Back when we supported arbitrary client-provided selectors, we actually
        // rewrote the selector to include an _id clause before passing to Mongo to
        // avoid races, but since selector is guaranteed to already just be an ID, we
        // don't have to any more.
        return self._collection.updateAsync.call(self._collection, selector, mutator, options);
    }).call(this);
};
// Only allow these operations in validated updates. Specifically
// whitelist operations, rather than blacklist, so new complex
// operations that are added aren't automatically allowed. A complex
// operation is one that does more than just modify its target
// field. For now this contains all update operations except '$rename'.
// http://docs.mongodb.org/manual/reference/operators/#update
const ALLOWED_UPDATE_OPERATIONS = {
    $inc: 1,
    $set: 1,
    $unset: 1,
    $addToSet: 1,
    $pop: 1,
    $pullAll: 1,
    $pull: 1,
    $pushAll: 1,
    $push: 1,
    $bit: 1
};
// Simulate a mongo `remove` operation while validating access control
// rules. See #ValidatedChange
CollectionPrototype._validatedRemoveAsync = function(userId, selector) {
    return _async_to_generator(function*() {
        const self = this;
        const findOptions = {
            transform: null
        };
        if (!self._validators.fetchAllFields) {
            findOptions.fields = {};
            self._validators.fetch.forEach((fieldName)=>{
                findOptions.fields[fieldName] = 1;
            });
        }
        const doc = yield self._collection.findOneAsync(selector, findOptions);
        if (!doc) return 0;
        // call user validators.
        // Any deny returns true means denied.
        if (yield asyncSome(self._validators.remove.deny, (validator)=>_async_to_generator(function*() {
                const result = validator(userId, transformDoc(validator, doc));
                return Meteor._isPromise(result) ? yield result : result;
            })())) {
            throw new Meteor.Error(403, "Access denied");
        }
        // Any allow returns true means proceed. Throw error if they all fail.
        if (yield asyncEvery(self._validators.remove.allow, (validator)=>_async_to_generator(function*() {
                const result = validator(userId, transformDoc(validator, doc));
                return !(Meteor._isPromise(result) ? yield result : result);
            })())) {
            throw new Meteor.Error(403, "Access denied");
        }
        // Back when we supported arbitrary client-provided selectors, we actually
        // rewrote the selector to {_id: {$in: [ids that we found]}} before passing to
        // Mongo to avoid races, but since selector is guaranteed to already just be
        // an ID, we don't have to any more.
        return self._collection.removeAsync.call(self._collection, selector);
    }).call(this);
};
CollectionPrototype._callMutatorMethodAsync = function _callMutatorMethodAsync(name, args, options = {}) {
    // For two out of three mutator methods, the first argument is a selector
    const firstArgIsSelector = name === "updateAsync" || name === "removeAsync";
    if (firstArgIsSelector && !alreadyInSimulation()) {
        // If we're about to actually send an RPC, we should throw an error if
        // this is a non-ID selector, because the mutation methods only allow
        // single-ID selectors. (If we don't throw here, we'll see flicker.)
        throwIfSelectorIsNotId(args[0], name);
    }
    const mutatorMethodName = this._prefix + name;
    return this._connection.applyAsync(mutatorMethodName, args, _object_spread({
        returnStubValue: this.resolverType === 'stub' || this.resolverType == null,
        // StubStream is only used for testing where you don't care about the server
        returnServerResultPromise: !this._connection._stream._isStub && this.resolverType !== 'stub'
    }, options));
};
CollectionPrototype._callMutatorMethod = function _callMutatorMethod(name, args, callback) {
    if (Meteor.isClient && !callback && !alreadyInSimulation()) {
        // Client can't block, so it can't report errors by exception,
        // only by callback. If they forget the callback, give them a
        // default one that logs the error, so they aren't totally
        // baffled if their writes don't work because their database is
        // down.
        // Don't give a default callback in simulation, because inside stubs we
        // want to return the results from the local collection immediately and
        // not force a callback.
        callback = function(err) {
            if (err) Meteor._debug(name + " failed", err);
        };
    }
    // For two out of three mutator methods, the first argument is a selector
    const firstArgIsSelector = name === "update" || name === "remove";
    if (firstArgIsSelector && !alreadyInSimulation()) {
        // If we're about to actually send an RPC, we should throw an error if
        // this is a non-ID selector, because the mutation methods only allow
        // single-ID selectors. (If we don't throw here, we'll see flicker.)
        throwIfSelectorIsNotId(args[0], name);
    }
    const mutatorMethodName = this._prefix + name;
    return this._connection.apply(mutatorMethodName, args, {
        returnStubValue: true
    }, callback);
};
function transformDoc(validator, doc) {
    if (validator.transform) return validator.transform(doc);
    return doc;
}
function docToValidate(validator, doc, generatedId) {
    let ret = doc;
    if (validator.transform) {
        ret = EJSON.clone(doc);
        // If you set a server-side transform on your collection, then you don't get
        // to tell the difference between "client specified the ID" and "server
        // generated the ID", because transforms expect to get _id.  If you want to
        // do that check, you can do it with a specific
        // `C.allow({insertAsync: f, transform: null})` validator.
        if (generatedId !== null) {
            ret._id = generatedId;
        }
        ret = validator.transform(ret);
    }
    return ret;
}
function addValidator(collection, allowOrDeny, options) {
    // validate keys
    const validKeysRegEx = /^(?:insertAsync|updateAsync|removeAsync|insert|update|remove|fetch|transform)$/;
    Object.keys(options).forEach((key)=>{
        if (!validKeysRegEx.test(key)) throw new Error(allowOrDeny + ": Invalid key: " + key);
        // TODO deprecated async config on future versions
        const isAsyncKey = key.includes('Async');
        if (isAsyncKey) {
            const syncKey = key.replace('Async', '');
            Meteor.deprecate(allowOrDeny + `: The "${key}" key is deprecated. Use "${syncKey}" instead.`);
        }
    });
    collection._restricted = true;
    [
        'insertAsync',
        'updateAsync',
        'removeAsync',
        'insert',
        'update',
        'remove'
    ].forEach((name)=>{
        if (hasOwn.call(options, name)) {
            if (!(options[name] instanceof Function)) {
                throw new Error(allowOrDeny + ': Value for `' + name + '` must be a function');
            }
            // If the transform is specified at all (including as 'null') in this
            // call, then take that; otherwise, take the transform from the
            // collection.
            if (options.transform === undefined) {
                options[name].transform = collection._transform; // already wrapped
            } else {
                options[name].transform = LocalCollection.wrapTransform(options.transform);
            }
            const isAsyncName = name.includes('Async');
            const validatorSyncName = isAsyncName ? name.replace('Async', '') : name;
            collection._validators[validatorSyncName][allowOrDeny].push(options[name]);
        }
    });
    // Only updateAsync the fetch fields if we're passed things that affect
    // fetching. This way allow({}) and allow({insertAsync: f}) don't result in
    // setting fetchAllFields
    if (options.updateAsync || options.removeAsync || options.fetch) {
        if (options.fetch && !(options.fetch instanceof Array)) {
            throw new Error(allowOrDeny + ": Value for `fetch` must be an array");
        }
        collection._updateFetch(options.fetch);
    }
}
function throwIfSelectorIsNotId(selector, methodName) {
    if (!LocalCollection._selectorIsIdPerhapsAsObject(selector)) {
        throw new Meteor.Error(403, "Not permitted. Untrusted code may only " + methodName + " documents by ID.");
    }
}
;
// Determine if we are in a DDP method simulation
function alreadyInSimulation() {
    var CurrentInvocation = DDP._CurrentMethodInvocation || // For backwards compatibility, as explained in this issue:
    // https://github.com/meteor/meteor/issues/8947
    DDP._CurrentInvocation;
    const enclosing = CurrentInvocation.get();
    return enclosing && enclosing.isSimulation;
}

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
      AllowDeny: AllowDeny
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/allow-deny/allow-deny.js"
  ]
}});

//# sourceURL=meteor://💻app/packages/allow-deny.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYWxsb3ctZGVueS9hbGxvdy1kZW55LmpzIl0sIm5hbWVzIjpbImhhc093biIsIk9iamVjdCIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiQWxsb3dEZW55IiwiQ29sbGVjdGlvblByb3RvdHlwZSIsImFsbG93Iiwib3B0aW9ucyIsImFkZFZhbGlkYXRvciIsImRlbnkiLCJfZGVmaW5lTXV0YXRpb25NZXRob2RzIiwic2VsZiIsIl9yZXN0cmljdGVkIiwiX2luc2VjdXJlIiwidW5kZWZpbmVkIiwiX3ZhbGlkYXRvcnMiLCJpbnNlcnQiLCJ1cGRhdGUiLCJyZW1vdmUiLCJpbnNlcnRBc3luYyIsInVwZGF0ZUFzeW5jIiwicmVtb3ZlQXN5bmMiLCJ1cHNlcnRBc3luYyIsImZldGNoIiwiZmV0Y2hBbGxGaWVsZHMiLCJfbmFtZSIsIl9wcmVmaXgiLCJfY29ubmVjdGlvbiIsIk1ldGVvciIsInNlcnZlciIsImlzQ2xpZW50IiwibSIsImZvckVhY2giLCJtZXRob2QiLCJtZXRob2ROYW1lIiwidXNlRXhpc3RpbmciLCJoYW5kbGVyUHJvcE5hbWUiLCJpc0luc2VydCIsIm5hbWUiLCJpbmNsdWRlcyIsImNoZWNrIiwiYXJndW1lbnRzIiwiTWF0Y2giLCJBbnkiLCJhcmdzIiwiQXJyYXkiLCJmcm9tIiwiZ2VuZXJhdGVkSWQiLCJjYWxsIiwiX21ha2VOZXdJRCIsImlzU2ltdWxhdGlvbiIsIl9pZCIsIl9jb2xsZWN0aW9uIiwiYXBwbHkiLCJ0aHJvd0lmU2VsZWN0b3JJc05vdElkIiwic3luY01ldGhvZE5hbWUiLCJyZXBsYWNlIiwic3luY1ZhbGlkYXRlZE1ldGhvZE5hbWUiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsInNsaWNlIiwidmFsaWRhdGVkTWV0aG9kTmFtZSIsImxlbmd0aCIsIkVycm9yIiwidW5zaGlmdCIsInVzZXJJZCIsInB1c2giLCJfaXNJbnNlY3VyZSIsInN5bmNNZXRob2RzTWFwcGVyIiwiZSIsInRvU3RyaW5nIiwibWV0aG9kcyIsIl91cGRhdGVGZXRjaCIsImZpZWxkcyIsInVuaW9uIiwiY3JlYXRlIiwiYWRkIiwibmFtZXMiLCJrZXlzIiwiUGFja2FnZSIsImluc2VjdXJlIiwiYXN5bmNTb21lIiwiYXJyYXkiLCJwcmVkaWNhdGUiLCJpdGVtIiwiYXN5bmNFdmVyeSIsIl92YWxpZGF0ZWRJbnNlcnRBc3luYyIsImRvYyIsInZhbGlkYXRvciIsInJlc3VsdCIsImRvY1RvVmFsaWRhdGUiLCJfaXNQcm9taXNlIiwiX3ZhbGlkYXRlZFVwZGF0ZUFzeW5jIiwic2VsZWN0b3IiLCJtdXRhdG9yIiwiYXNzaWduIiwiTG9jYWxDb2xsZWN0aW9uIiwiX3NlbGVjdG9ySXNJZFBlcmhhcHNBc09iamVjdCIsInVwc2VydCIsIm5vUmVwbGFjZUVycm9yIiwibXV0YXRvcktleXMiLCJtb2RpZmllZEZpZWxkcyIsIm9wIiwicGFyYW1zIiwiQUxMT1dFRF9VUERBVEVfT1BFUkFUSU9OUyIsImZpZWxkIiwiaW5kZXhPZiIsInN1YnN0cmluZyIsImZpbmRPcHRpb25zIiwidHJhbnNmb3JtIiwiZmllbGROYW1lIiwiZmluZE9uZUFzeW5jIiwiZmFjdG9yaWVkRG9jIiwidHJhbnNmb3JtRG9jIiwiX2ZvcmJpZFJlcGxhY2UiLCIkaW5jIiwiJHNldCIsIiR1bnNldCIsIiRhZGRUb1NldCIsIiRwb3AiLCIkcHVsbEFsbCIsIiRwdWxsIiwiJHB1c2hBbGwiLCIkcHVzaCIsIiRiaXQiLCJfdmFsaWRhdGVkUmVtb3ZlQXN5bmMiLCJfY2FsbE11dGF0b3JNZXRob2RBc3luYyIsImZpcnN0QXJnSXNTZWxlY3RvciIsImFscmVhZHlJblNpbXVsYXRpb24iLCJtdXRhdG9yTWV0aG9kTmFtZSIsImFwcGx5QXN5bmMiLCJyZXR1cm5TdHViVmFsdWUiLCJyZXNvbHZlclR5cGUiLCJyZXR1cm5TZXJ2ZXJSZXN1bHRQcm9taXNlIiwiX3N0cmVhbSIsIl9pc1N0dWIiLCJfY2FsbE11dGF0b3JNZXRob2QiLCJjYWxsYmFjayIsImVyciIsIl9kZWJ1ZyIsInJldCIsIkVKU09OIiwiY2xvbmUiLCJjb2xsZWN0aW9uIiwiYWxsb3dPckRlbnkiLCJ2YWxpZEtleXNSZWdFeCIsImtleSIsInRlc3QiLCJpc0FzeW5jS2V5Iiwic3luY0tleSIsImRlcHJlY2F0ZSIsIkZ1bmN0aW9uIiwiX3RyYW5zZm9ybSIsIndyYXBUcmFuc2Zvcm0iLCJpc0FzeW5jTmFtZSIsInZhbGlkYXRvclN5bmNOYW1lIiwiQ3VycmVudEludm9jYXRpb24iLCJERFAiLCJfQ3VycmVudE1ldGhvZEludm9jYXRpb24iLCJfQ3VycmVudEludm9jYXRpb24iLCJlbmNsb3NpbmciLCJnZXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLEdBQUc7QUFDSCxzQ0FBc0M7QUFDdEMsR0FBRzs7O0FBRUgsTUFBTUEsU0FBU0MsT0FBT0MsU0FBUyxDQUFDQyxjQUFjO0FBRTlDLHVFQUF1RTtBQUN2RSxnQkFBZ0I7QUFDaEIsRUFBRTtBQUNGLDhDQUE4QztBQUM5QyxtREFBbUQ7QUFDbkQsRUFBRTtBQUNGLGlFQUFpRTtBQUNqRSx3REFBd0Q7QUFDeEQscUVBQXFFO0FBQ3JFLEVBQUU7QUFDRiwrQ0FBK0M7QUFDL0MsdURBQXVEO0FBQ3ZELEVBQUU7QUFDRix3QkFBd0I7QUFDeEIsdUVBQXVFO0FBQ3ZFLDBEQUEwRDtBQUMxRCxFQUFFO0FBQ0Ysa0VBQWtFO0FBQ2xFLHdCQUF3QjtBQUN4QixxRUFBcUU7QUFDckUsb0VBQW9FO0FBQ3BFLHVCQUF1QjtBQUN2QiwyRUFBMkU7QUFDM0UsNkVBQTZFO0FBQzdFLHNDQUFzQztBQUN0QyxFQUFFO0FBQ0YsOEVBQThFO0FBQzlFLDZFQUE2RTtBQUM3RSxtQ0FBbUM7QUFFbkNDLFlBQVk7SUFDVkMscUJBQXFCLENBQUM7QUFDeEI7QUFFQSwrRUFBK0U7QUFDL0UsVUFBVTtBQUNWLE1BQU1BLHNCQUFzQkQsVUFBVUMsbUJBQW1CO0FBRXpEOzs7Ozs7Ozs7O0NBVUMsR0FDREEsb0JBQW9CQyxLQUFLLEdBQUcs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QUFLQyxRQUFRLENBQUM7WUFDbEMsTUFBTW9ILG9CQUFvQkQsY0FBY3BILEtBQUtrQixPQUFPLENBQUMsU0FBUyxNQUFNbEI7WUFDcEV5RyxXQUFXaEksV0FBVyxDQUFDNEksa0JBQWtCLENBQUNYLFlBQVksQ0FBQzlFLElBQUksQ0FBQzNELE9BQU8sQ0FBQytCLEtBQUs7UUFDM0U7SUFDRjtJQUVBLHVFQUF1RTtJQUN2RSwyRUFBMkU7SUFDM0UseUJBQXlCO0lBQ3pCLElBQUkvQixRQUFRYSxXQUFXLElBQUliLFFBQVFjLFdBQVcsSUFBSWQsUUFBUWdCLEtBQUssRUFBRTtRQUMvRCxJQUFJaEIsUUFBUWdCLEtBQUssSUFBSSxDQUFFaEIsU0FBUWdCLEtBQUssWUFBWXNCLEtBQUksR0FBSTtZQUN0RCxNQUFNLElBQUlrQixNQUFNaUYsY0FBYztRQUNoQztRQUNBRCxXQUFXdkUsWUFBWSxDQUFDakUsUUFBUWdCLEtBQUs7SUFDdkM7QUFDRjtBQUVBLFNBQVMrQix1QkFBdUJ1QyxRQUFRLEVBQUUzRCxVQUFVO0lBQ2xELElBQUksQ0FBQzhELGdCQUFnQkMsNEJBQTRCLENBQUNKLFdBQVc7UUFDM0QsTUFBTSxJQUFJakUsT0FBT21DLEtBQUssQ0FDcEIsS0FBSyw0Q0FBNEM3QixhQUMvQztJQUNOO0FBQ0Y7O0FBRUEsaURBQWlEO0FBQ2pELFNBQVM4RjtJQUNQLElBQUk0QixvQkFDRkMsSUFBSUMsd0JBQXdCLElBQzVCLDJEQUEyRDtJQUMzRCwrQ0FBK0M7SUFDL0NELElBQUlFLGtCQUFrQjtJQUV4QixNQUFNQyxZQUFZSixrQkFBa0JLLEdBQUc7SUFDdkMsT0FBT0QsYUFBYUEsVUFBVTlHLFlBQVk7QUFDNUMiLCJmaWxlIjoiL3BhY2thZ2VzL2FsbG93LWRlbnkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy9cbi8vLyBSZW1vdGUgbWV0aG9kcyBhbmQgYWNjZXNzIGNvbnRyb2wuXG4vLy9cblxuY29uc3QgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuLy8gUmVzdHJpY3QgZGVmYXVsdCBtdXRhdG9ycyBvbiBjb2xsZWN0aW9uLiBhbGxvdygpIGFuZCBkZW55KCkgdGFrZSB0aGVcbi8vIHNhbWUgb3B0aW9uczpcbi8vXG4vLyBvcHRpb25zLmluc2VydEFzeW5jIHtGdW5jdGlvbih1c2VySWQsIGRvYyl9XG4vLyAgIHJldHVybiB0cnVlIHRvIGFsbG93L2RlbnkgYWRkaW5nIHRoaXMgZG9jdW1lbnRcbi8vXG4vLyBvcHRpb25zLnVwZGF0ZUFzeW5jIHtGdW5jdGlvbih1c2VySWQsIGRvY3MsIGZpZWxkcywgbW9kaWZpZXIpfVxuLy8gICByZXR1cm4gdHJ1ZSB0byBhbGxvdy9kZW55IHVwZGF0aW5nIHRoZXNlIGRvY3VtZW50cy5cbi8vICAgYGZpZWxkc2AgaXMgcGFzc2VkIGFzIGFuIGFycmF5IG9mIGZpZWxkcyB0aGF0IGFyZSB0byBiZSBtb2RpZmllZFxuLy9cbi8vIG9wdGlvbnMucmVtb3ZlQXN5bmMge0Z1bmN0aW9uKHVzZXJJZCwgZG9jcyl9XG4vLyAgIHJldHVybiB0cnVlIHRvIGFsbG93L2RlbnkgcmVtb3ZpbmcgdGhlc2UgZG9jdW1lbnRzXG4vL1xuLy8gb3B0aW9ucy5mZXRjaCB7QXJyYXl9XG4vLyAgIEZpZWxkcyB0byBmZXRjaCBmb3IgdGhlc2UgdmFsaWRhdG9ycy4gSWYgYW55IGNhbGwgdG8gYWxsb3cgb3IgZGVueVxuLy8gICBkb2VzIG5vdCBoYXZlIHRoaXMgb3B0aW9uIHRoZW4gYWxsIGZpZWxkcyBhcmUgbG9hZGVkLlxuLy9cbi8vIGFsbG93IGFuZCBkZW55IGNhbiBiZSBjYWxsZWQgbXVsdGlwbGUgdGltZXMuIFRoZSB2YWxpZGF0b3JzIGFyZVxuLy8gZXZhbHVhdGVkIGFzIGZvbGxvd3M6XG4vLyAtIElmIG5laXRoZXIgZGVueSgpIG5vciBhbGxvdygpIGhhcyBiZWVuIGNhbGxlZCBvbiB0aGUgY29sbGVjdGlvbixcbi8vICAgdGhlbiB0aGUgcmVxdWVzdCBpcyBhbGxvd2VkIGlmIGFuZCBvbmx5IGlmIHRoZSBcImluc2VjdXJlXCIgc21hcnRcbi8vICAgcGFja2FnZSBpcyBpbiB1c2UuXG4vLyAtIE90aGVyd2lzZSwgaWYgYW55IGRlbnkoKSBmdW5jdGlvbiByZXR1cm5zIHRydWUsIHRoZSByZXF1ZXN0IGlzIGRlbmllZC5cbi8vIC0gT3RoZXJ3aXNlLCBpZiBhbnkgYWxsb3coKSBmdW5jdGlvbiByZXR1cm5zIHRydWUsIHRoZSByZXF1ZXN0IGlzIGFsbG93ZWQuXG4vLyAtIE90aGVyd2lzZSwgdGhlIHJlcXVlc3QgaXMgZGVuaWVkLlxuLy9cbi8vIE1ldGVvciBtYXkgY2FsbCB5b3VyIGRlbnkoKSBhbmQgYWxsb3coKSBmdW5jdGlvbnMgaW4gYW55IG9yZGVyLCBhbmQgbWF5IG5vdFxuLy8gY2FsbCBhbGwgb2YgdGhlbSBpZiBpdCBpcyBhYmxlIHRvIG1ha2UgYSBkZWNpc2lvbiB3aXRob3V0IGNhbGxpbmcgdGhlbSBhbGxcbi8vIChzbyBkb24ndCBpbmNsdWRlIHNpZGUgZWZmZWN0cykuXG5cbkFsbG93RGVueSA9IHtcbiAgQ29sbGVjdGlvblByb3RvdHlwZToge31cbn07XG5cbi8vIEluIHRoZSBgbW9uZ29gIHBhY2thZ2UsIHdlIHdpbGwgZXh0ZW5kIE1vbmdvLkNvbGxlY3Rpb24ucHJvdG90eXBlIHdpdGggdGhlc2Vcbi8vIG1ldGhvZHNcbmNvbnN0IENvbGxlY3Rpb25Qcm90b3R5cGUgPSBBbGxvd0RlbnkuQ29sbGVjdGlvblByb3RvdHlwZTtcblxuLyoqXG4gKiBAc3VtbWFyeSBBbGxvdyB1c2VycyB0byB3cml0ZSBkaXJlY3RseSB0byB0aGlzIGNvbGxlY3Rpb24gZnJvbSBjbGllbnQgY29kZSwgc3ViamVjdCB0byBsaW1pdGF0aW9ucyB5b3UgZGVmaW5lLlxuICogQGxvY3VzIFNlcnZlclxuICogQG1ldGhvZCBhbGxvd1xuICogQG1lbWJlck9mIE1vbmdvLkNvbGxlY3Rpb25cbiAqIEBpbnN0YW5jZVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG9wdGlvbnMuaW5zZXJ0LHVwZGF0ZSxyZW1vdmUgRnVuY3Rpb25zIHRoYXQgbG9vayBhdCBhIHByb3Bvc2VkIG1vZGlmaWNhdGlvbiB0byB0aGUgZGF0YWJhc2UgYW5kIHJldHVybiB0cnVlIGlmIGl0IHNob3VsZCBiZSBhbGxvd2VkLlxuICogQHBhcmFtIHtTdHJpbmdbXX0gb3B0aW9ucy5mZXRjaCBPcHRpb25hbCBwZXJmb3JtYW5jZSBlbmhhbmNlbWVudC4gTGltaXRzIHRoZSBmaWVsZHMgdGhhdCB3aWxsIGJlIGZldGNoZWQgZnJvbSB0aGUgZGF0YWJhc2UgZm9yIGluc3BlY3Rpb24gYnkgeW91ciBgdXBkYXRlYCBhbmQgYHJlbW92ZWAgZnVuY3Rpb25zLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gb3B0aW9ucy50cmFuc2Zvcm0gT3ZlcnJpZGVzIGB0cmFuc2Zvcm1gIG9uIHRoZSAgW2BDb2xsZWN0aW9uYF0oI2NvbGxlY3Rpb25zKS4gIFBhc3MgYG51bGxgIHRvIGRpc2FibGUgdHJhbnNmb3JtYXRpb24uXG4gKi9cbkNvbGxlY3Rpb25Qcm90b3R5cGUuYWxsb3cgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIGFkZFZhbGlkYXRvcih0aGlzLCAnYWxsb3cnLCBvcHRpb25zKTtcbn07XG5cbi8qKlxuICogQHN1bW1hcnkgT3ZlcnJpZGUgYGFsbG93YCBydWxlcy5cbiAqIEBsb2N1cyBTZXJ2ZXJcbiAqIEBtZXRob2QgZGVueVxuICogQG1lbWJlck9mIE1vbmdvLkNvbGxlY3Rpb25cbiAqIEBpbnN0YW5jZVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG9wdGlvbnMuaW5zZXJ0LHVwZGF0ZSxyZW1vdmUgRnVuY3Rpb25zIHRoYXQgbG9vayBhdCBhIHByb3Bvc2VkIG1vZGlmaWNhdGlvbiB0byB0aGUgZGF0YWJhc2UgYW5kIHJldHVybiB0cnVlIGlmIGl0IHNob3VsZCBiZSBkZW5pZWQsIGV2ZW4gaWYgYW4gW2FsbG93XSgjYWxsb3cpIHJ1bGUgc2F5cyBvdGhlcndpc2UuXG4gKiBAcGFyYW0ge1N0cmluZ1tdfSBvcHRpb25zLmZldGNoIE9wdGlvbmFsIHBlcmZvcm1hbmNlIGVuaGFuY2VtZW50LiBMaW1pdHMgdGhlIGZpZWxkcyB0aGF0IHdpbGwgYmUgZmV0Y2hlZCBmcm9tIHRoZSBkYXRhYmFzZSBmb3IgaW5zcGVjdGlvbiBieSB5b3VyIGB1cGRhdGVgIGFuZCBgcmVtb3ZlYCBmdW5jdGlvbnMuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcHRpb25zLnRyYW5zZm9ybSBPdmVycmlkZXMgYHRyYW5zZm9ybWAgb24gdGhlICBbYENvbGxlY3Rpb25gXSgjY29sbGVjdGlvbnMpLiAgUGFzcyBgbnVsbGAgdG8gZGlzYWJsZSB0cmFuc2Zvcm1hdGlvbi5cbiAqL1xuQ29sbGVjdGlvblByb3RvdHlwZS5kZW55ID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICBhZGRWYWxpZGF0b3IodGhpcywgJ2RlbnknLCBvcHRpb25zKTtcbn07XG5cbkNvbGxlY3Rpb25Qcm90b3R5cGUuX2RlZmluZU11dGF0aW9uTWV0aG9kcyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIC8vIHNldCB0byB0cnVlIG9uY2Ugd2UgY2FsbCBhbnkgYWxsb3cgb3IgZGVueSBtZXRob2RzLiBJZiB0cnVlLCB1c2VcbiAgLy8gYWxsb3cvZGVueSBzZW1hbnRpY3MuIElmIGZhbHNlLCB1c2UgaW5zZWN1cmUgbW9kZSBzZW1hbnRpY3MuXG4gIHNlbGYuX3Jlc3RyaWN0ZWQgPSBmYWxzZTtcblxuICAvLyBJbnNlY3VyZSBtb2RlIChkZWZhdWx0IHRvIGFsbG93aW5nIHdyaXRlcykuIERlZmF1bHRzIHRvICd1bmRlZmluZWQnIHdoaWNoXG4gIC8vIG1lYW5zIGluc2VjdXJlIGlmZiB0aGUgaW5zZWN1cmUgcGFja2FnZSBpcyBsb2FkZWQuIFRoaXMgcHJvcGVydHkgY2FuIGJlXG4gIC8vIG92ZXJyaWRlbiBieSB0ZXN0cyBvciBwYWNrYWdlcyB3aXNoaW5nIHRvIGNoYW5nZSBpbnNlY3VyZSBtb2RlIGJlaGF2aW9yIG9mXG4gIC8vIHRoZWlyIGNvbGxlY3Rpb25zLlxuICBzZWxmLl9pbnNlY3VyZSA9IHVuZGVmaW5lZDtcblxuICBzZWxmLl92YWxpZGF0b3JzID0ge1xuICAgIGluc2VydDoge2FsbG93OiBbXSwgZGVueTogW119LFxuICAgIHVwZGF0ZToge2FsbG93OiBbXSwgZGVueTogW119LFxuICAgIHJlbW92ZToge2FsbG93OiBbXSwgZGVueTogW119LFxuICAgIGluc2VydEFzeW5jOiB7YWxsb3c6IFtdLCBkZW55OiBbXX0sXG4gICAgdXBkYXRlQXN5bmM6IHthbGxvdzogW10sIGRlbnk6IFtdfSxcbiAgICByZW1vdmVBc3luYzoge2FsbG93OiBbXSwgZGVueTogW119LFxuICAgIHVwc2VydEFzeW5jOiB7YWxsb3c6IFtdLCBkZW55OiBbXX0sIC8vIGR1bW15IGFycmF5czsgY2FuJ3Qgc2V0IHRoZXNlIVxuICAgIGZldGNoOiBbXSxcbiAgICBmZXRjaEFsbEZpZWxkczogZmFsc2VcbiAgfTtcblxuICBpZiAoIXNlbGYuX25hbWUpXG4gICAgcmV0dXJuOyAvLyBhbm9ueW1vdXMgY29sbGVjdGlvblxuXG4gIC8vIFhYWCBUaGluayBhYm91dCBtZXRob2QgbmFtZXNwYWNpbmcuIE1heWJlIG1ldGhvZHMgc2hvdWxkIGJlXG4gIC8vIFwiTWV0ZW9yOk1vbmdvOmluc2VydEFzeW5jL05BTUVcIj9cbiAgc2VsZi5fcHJlZml4ID0gJy8nICsgc2VsZi5fbmFtZSArICcvJztcblxuICAvLyBNdXRhdGlvbiBNZXRob2RzXG4gIC8vIE1pbmltb25nbyBvbiB0aGUgc2VydmVyIGdldHMgbm8gc3R1YnM7IGluc3RlYWQsIGJ5IGRlZmF1bHRcbiAgLy8gaXQgd2FpdCgpcyB1bnRpbCBpdHMgcmVzdWx0IGlzIHJlYWR5LCB5aWVsZGluZy5cbiAgLy8gVGhpcyBtYXRjaGVzIHRoZSBiZWhhdmlvciBvZiBtYWNyb21vbmdvIG9uIHRoZSBzZXJ2ZXIgYmV0dGVyLlxuICAvLyBYWFggc2VlICNNZXRlb3JTZXJ2ZXJOdWxsXG4gIGlmIChzZWxmLl9jb25uZWN0aW9uICYmIChzZWxmLl9jb25uZWN0aW9uID09PSBNZXRlb3Iuc2VydmVyIHx8IE1ldGVvci5pc0NsaWVudCkpIHtcbiAgICBjb25zdCBtID0ge307XG5cbiAgICBbXG4gICAgICAnaW5zZXJ0QXN5bmMnLFxuICAgICAgJ3VwZGF0ZUFzeW5jJyxcbiAgICAgICdyZW1vdmVBc3luYycsXG4gICAgICAnaW5zZXJ0JyxcbiAgICAgICd1cGRhdGUnLFxuICAgICAgJ3JlbW92ZScsXG4gICAgXS5mb3JFYWNoKG1ldGhvZCA9PiB7XG4gICAgICBjb25zdCBtZXRob2ROYW1lID0gc2VsZi5fcHJlZml4ICsgbWV0aG9kO1xuXG4gICAgICBpZiAob3B0aW9ucy51c2VFeGlzdGluZykge1xuICAgICAgICBjb25zdCBoYW5kbGVyUHJvcE5hbWUgPSBNZXRlb3IuaXNDbGllbnRcbiAgICAgICAgICA/ICdfbWV0aG9kSGFuZGxlcnMnXG4gICAgICAgICAgOiAnbWV0aG9kX2hhbmRsZXJzJztcbiAgICAgICAgLy8gRG8gbm90IHRyeSB0byBjcmVhdGUgYWRkaXRpb25hbCBtZXRob2RzIGlmIHRoaXMgaGFzIGFscmVhZHkgYmVlbiBjYWxsZWQuXG4gICAgICAgIC8vIChPdGhlcndpc2UgdGhlIC5tZXRob2RzKCkgY2FsbCBiZWxvdyB3aWxsIHRocm93IGFuIGVycm9yLilcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHNlbGYuX2Nvbm5lY3Rpb25baGFuZGxlclByb3BOYW1lXSAmJlxuICAgICAgICAgIHR5cGVvZiBzZWxmLl9jb25uZWN0aW9uW2hhbmRsZXJQcm9wTmFtZV1bbWV0aG9kTmFtZV0gPT09ICdmdW5jdGlvbidcbiAgICAgICAgKVxuICAgICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaXNJbnNlcnQgPSBuYW1lID0+IG5hbWUuaW5jbHVkZXMoJ2luc2VydCcpO1xuXG4gICAgICBtW21ldGhvZE5hbWVdID0gZnVuY3Rpb24gKC8qIC4uLiAqLykge1xuICAgICAgICAvLyBBbGwgdGhlIG1ldGhvZHMgZG8gdGhlaXIgb3duIHZhbGlkYXRpb24sIGluc3RlYWQgb2YgdXNpbmcgY2hlY2soKS5cbiAgICAgICAgY2hlY2soYXJndW1lbnRzLCBbTWF0Y2guQW55XSk7XG4gICAgICAgIGNvbnN0IGFyZ3MgPSBBcnJheS5mcm9tKGFyZ3VtZW50cyk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gRm9yIGFuIGluc2VydC9pbnNlcnRBc3luYywgaWYgdGhlIGNsaWVudCBkaWRuJ3Qgc3BlY2lmeSBhbiBfaWQsIGdlbmVyYXRlIG9uZVxuICAgICAgICAgIC8vIG5vdzsgYmVjYXVzZSB0aGlzIHVzZXMgRERQLnJhbmRvbVN0cmVhbSwgaXQgd2lsbCBiZSBjb25zaXN0ZW50IHdpdGhcbiAgICAgICAgICAvLyB3aGF0IHRoZSBjbGllbnQgZ2VuZXJhdGVkLiBXZSBnZW5lcmF0ZSBpdCBub3cgcmF0aGVyIHRoYW4gbGF0ZXIgc29cbiAgICAgICAgICAvLyB0aGF0IGlmIChlZykgYW4gYWxsb3cvZGVueSBydWxlIGRvZXMgYW4gaW5zZXJ0L2luc2VydEFzeW5jIHRvIHRoZSBzYW1lXG4gICAgICAgICAgLy8gY29sbGVjdGlvbiAobm90IHRoYXQgaXQgcmVhbGx5IHNob3VsZCksIHRoZSBnZW5lcmF0ZWQgX2lkIHdpbGxcbiAgICAgICAgICAvLyBzdGlsbCBiZSB0aGUgZmlyc3QgdXNlIG9mIHRoZSBzdHJlYW0gYW5kIHdpbGwgYmUgY29uc2lzdGVudC5cbiAgICAgICAgICAvL1xuICAgICAgICAgIC8vIEhvd2V2ZXIsIHdlIGRvbid0IGFjdHVhbGx5IHN0aWNrIHRoZSBfaWQgb250byB0aGUgZG9jdW1lbnQgeWV0LFxuICAgICAgICAgIC8vIGJlY2F1c2Ugd2Ugd2FudCBhbGxvdy9kZW55IHJ1bGVzIHRvIGJlIGFibGUgdG8gZGlmZmVyZW50aWF0ZVxuICAgICAgICAgIC8vIGJldHdlZW4gYXJiaXRyYXJ5IGNsaWVudC1zcGVjaWZpZWQgX2lkIGZpZWxkcyBhbmQgbWVyZWx5XG4gICAgICAgICAgLy8gY2xpZW50LWNvbnRyb2xsZWQtdmlhLXJhbmRvbVNlZWQgZmllbGRzLlxuICAgICAgICAgIGxldCBnZW5lcmF0ZWRJZCA9IG51bGw7XG4gICAgICAgICAgaWYgKGlzSW5zZXJ0KG1ldGhvZCkgJiYgIWhhc093bi5jYWxsKGFyZ3NbMF0sICdfaWQnKSkge1xuICAgICAgICAgICAgZ2VuZXJhdGVkSWQgPSBzZWxmLl9tYWtlTmV3SUQoKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAodGhpcy5pc1NpbXVsYXRpb24pIHtcbiAgICAgICAgICAgIC8vIEluIGEgY2xpZW50IHNpbXVsYXRpb24sIHlvdSBjYW4gZG8gYW55IG11dGF0aW9uIChldmVuIHdpdGggYVxuICAgICAgICAgICAgLy8gY29tcGxleCBzZWxlY3RvcikuXG4gICAgICAgICAgICBpZiAoZ2VuZXJhdGVkSWQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgYXJnc1swXS5faWQgPSBnZW5lcmF0ZWRJZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzZWxmLl9jb2xsZWN0aW9uW21ldGhvZF0uYXBwbHkoc2VsZi5fY29sbGVjdGlvbiwgYXJncyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gVGhpcyBpcyB0aGUgc2VydmVyIHJlY2VpdmluZyBhIG1ldGhvZCBjYWxsIGZyb20gdGhlIGNsaWVudC5cblxuICAgICAgICAgIC8vIFdlIGRvbid0IGFsbG93IGFyYml0cmFyeSBzZWxlY3RvcnMgaW4gbXV0YXRpb25zIGZyb20gdGhlIGNsaWVudDogb25seVxuICAgICAgICAgIC8vIHNpbmdsZS1JRCBzZWxlY3RvcnMuXG4gICAgICAgICAgaWYgKCFpc0luc2VydChtZXRob2QpKSB0aHJvd0lmU2VsZWN0b3JJc05vdElkKGFyZ3NbMF0sIG1ldGhvZCk7XG5cbiAgICAgICAgICBjb25zdCBzeW5jTWV0aG9kTmFtZSA9IG1ldGhvZC5yZXBsYWNlKCdBc3luYycsICcnKTtcbiAgICAgICAgICBjb25zdCBzeW5jVmFsaWRhdGVkTWV0aG9kTmFtZSA9ICdfdmFsaWRhdGVkJyArIG1ldGhvZC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHN5bmNNZXRob2ROYW1lLnNsaWNlKDEpO1xuICAgICAgICAgIC8vIGl0IGZvcmNlcyB0byB1c2UgYXN5bmMgdmFsaWRhdGVkIGJlaGF2aW9yXG4gICAgICAgICAgY29uc3QgdmFsaWRhdGVkTWV0aG9kTmFtZSA9IHN5bmNWYWxpZGF0ZWRNZXRob2ROYW1lICsgJ0FzeW5jJztcblxuICAgICAgICAgIGlmIChzZWxmLl9yZXN0cmljdGVkKSB7XG4gICAgICAgICAgICAvLyBzaG9ydCBjaXJjdWl0IGlmIHRoZXJlIGlzIG5vIHdheSBpdCB3aWxsIHBhc3MuXG4gICAgICAgICAgICBpZiAoc2VsZi5fdmFsaWRhdG9yc1tzeW5jTWV0aG9kTmFtZV0uYWxsb3cubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoXG4gICAgICAgICAgICAgICAgNDAzLFxuICAgICAgICAgICAgICAgICdBY2Nlc3MgZGVuaWVkLiBObyBhbGxvdyB2YWxpZGF0b3JzIHNldCBvbiByZXN0cmljdGVkICcgK1xuICAgICAgICAgICAgICAgICAgXCJjb2xsZWN0aW9uIGZvciBtZXRob2QgJ1wiICtcbiAgICAgICAgICAgICAgICAgIG1ldGhvZCArXG4gICAgICAgICAgICAgICAgICBcIicuXCJcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYXJncy51bnNoaWZ0KHRoaXMudXNlcklkKTtcbiAgICAgICAgICAgIGlzSW5zZXJ0KG1ldGhvZCkgJiYgYXJncy5wdXNoKGdlbmVyYXRlZElkKTtcbiAgICAgICAgICAgIHJldHVybiBzZWxmW3ZhbGlkYXRlZE1ldGhvZE5hbWVdLmFwcGx5KHNlbGYsIGFyZ3MpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoc2VsZi5faXNJbnNlY3VyZSgpKSB7XG4gICAgICAgICAgICBpZiAoZ2VuZXJhdGVkSWQgIT09IG51bGwpIGFyZ3NbMF0uX2lkID0gZ2VuZXJhdGVkSWQ7XG4gICAgICAgICAgICAvLyBJbiBpbnNlY3VyZSBtb2RlIHdlIHVzZSB0aGUgc2VydmVyIF9jb2xsZWN0aW9uIG1ldGhvZHMsIGFuZCB0aGVzZSBzeW5jIG1ldGhvZHNcbiAgICAgICAgICAgIC8vIGRvIG5vdCBleGlzdCBpbiB0aGUgc2VydmVyIGFueW1vcmUsIHNvIHdlIGhhdmUgdGhpcyBtYXBwZXIgdG8gY2FsbCB0aGUgYXN5bmMgbWV0aG9kc1xuICAgICAgICAgICAgLy8gaW5zdGVhZC5cbiAgICAgICAgICAgIGNvbnN0IHN5bmNNZXRob2RzTWFwcGVyID0ge1xuICAgICAgICAgICAgICBpbnNlcnQ6IFwiaW5zZXJ0QXN5bmNcIixcbiAgICAgICAgICAgICAgdXBkYXRlOiBcInVwZGF0ZUFzeW5jXCIsXG4gICAgICAgICAgICAgIHJlbW92ZTogXCJyZW1vdmVBc3luY1wiLFxuICAgICAgICAgICAgfTtcblxuXG4gICAgICAgICAgICAvLyBJbiBpbnNlY3VyZSBtb2RlLCBhbGxvdyBhbnkgbXV0YXRpb24gKHdpdGggYSBzaW1wbGUgc2VsZWN0b3IpLlxuICAgICAgICAgICAgLy8gWFhYIFRoaXMgaXMga2luZCBvZiBib2d1cy4gIEluc3RlYWQgb2YgYmxpbmRseSBwYXNzaW5nIHdoYXRldmVyXG4gICAgICAgICAgICAvLyAgICAgd2UgZ2V0IGZyb20gdGhlIG5ldHdvcmsgdG8gdGhpcyBmdW5jdGlvbiwgd2Ugc2hvdWxkIGFjdHVhbGx5XG4gICAgICAgICAgICAvLyAgICAga25vdyB0aGUgY29ycmVjdCBhcmd1bWVudHMgZm9yIHRoZSBmdW5jdGlvbiBhbmQgcGFzcyBqdXN0XG4gICAgICAgICAgICAvLyAgICAgdGhlbS4gIEZvciBleGFtcGxlLCBpZiB5b3UgaGF2ZSBhbiBleHRyYW5lb3VzIGV4dHJhIG51bGxcbiAgICAgICAgICAgIC8vICAgICBhcmd1bWVudCBhbmQgdGhpcyBpcyBNb25nbyBvbiB0aGUgc2VydmVyLCB0aGUgLndyYXBBc3luYydkXG4gICAgICAgICAgICAvLyAgICAgZnVuY3Rpb25zIGxpa2UgdXBkYXRlIHdpbGwgZ2V0IGNvbmZ1c2VkIGFuZCBwYXNzIHRoZVxuICAgICAgICAgICAgLy8gICAgIFwiZnV0LnJlc29sdmVyKClcIiBpbiB0aGUgd3Jvbmcgc2xvdCwgd2hlcmUgX3VwZGF0ZSB3aWxsIG5ldmVyXG4gICAgICAgICAgICAvLyAgICAgaW52b2tlIGl0LiBCYW0sIGJyb2tlbiBERFAgY29ubmVjdGlvbi4gIFByb2JhYmx5IHNob3VsZCBqdXN0XG4gICAgICAgICAgICAvLyAgICAgdGFrZSB0aGlzIHdob2xlIG1ldGhvZCBhbmQgd3JpdGUgaXQgdGhyZWUgdGltZXMsIGludm9raW5nXG4gICAgICAgICAgICAvLyAgICAgaGVscGVycyBmb3IgdGhlIGNvbW1vbiBjb2RlLlxuICAgICAgICAgICAgcmV0dXJuIHNlbGYuX2NvbGxlY3Rpb25bc3luY01ldGhvZHNNYXBwZXJbbWV0aG9kXSB8fCBtZXRob2RdLmFwcGx5KHNlbGYuX2NvbGxlY3Rpb24sIGFyZ3MpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBJbiBzZWN1cmUgbW9kZSwgaWYgd2UgaGF2ZW4ndCBjYWxsZWQgYWxsb3cgb3IgZGVueSwgdGhlbiBub3RoaW5nXG4gICAgICAgICAgICAvLyBpcyBwZXJtaXR0ZWQuXG4gICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgJ0FjY2VzcyBkZW5pZWQnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBlLm5hbWUgPT09ICdNb25nb0Vycm9yJyB8fFxuICAgICAgICAgICAgLy8gZm9yIG9sZCB2ZXJzaW9ucyBvZiBNb25nb0RCIChwcm9iYWJseSBub3QgbmVjZXNzYXJ5IGJ1dCBpdCdzIGhlcmUganVzdCBpbiBjYXNlKVxuICAgICAgICAgICAgZS5uYW1lID09PSAnQnVsa1dyaXRlRXJyb3InIHx8XG4gICAgICAgICAgICAvLyBmb3IgbmV3ZXIgdmVyc2lvbnMgb2YgTW9uZ29EQiAoaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL2RyaXZlcnMvbm9kZS9jdXJyZW50L3doYXRzLW5ldy8jYnVsa3dyaXRlZXJyb3ItLS1tb25nb2J1bGt3cml0ZWVycm9yKVxuICAgICAgICAgICAgZS5uYW1lID09PSAnTW9uZ29CdWxrV3JpdGVFcnJvcicgfHxcbiAgICAgICAgICAgIGUubmFtZSA9PT0gJ01pbmltb25nb0Vycm9yJ1xuICAgICAgICAgICkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDksIGUudG9TdHJpbmcoKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgc2VsZi5fY29ubmVjdGlvbi5tZXRob2RzKG0pO1xuICB9XG59O1xuXG5Db2xsZWN0aW9uUHJvdG90eXBlLl91cGRhdGVGZXRjaCA9IGZ1bmN0aW9uIChmaWVsZHMpIHtcbiAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKCFzZWxmLl92YWxpZGF0b3JzLmZldGNoQWxsRmllbGRzKSB7XG4gICAgaWYgKGZpZWxkcykge1xuICAgICAgY29uc3QgdW5pb24gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgY29uc3QgYWRkID0gbmFtZXMgPT4gbmFtZXMgJiYgbmFtZXMuZm9yRWFjaChuYW1lID0+IHVuaW9uW25hbWVdID0gMSk7XG4gICAgICBhZGQoc2VsZi5fdmFsaWRhdG9ycy5mZXRjaCk7XG4gICAgICBhZGQoZmllbGRzKTtcbiAgICAgIHNlbGYuX3ZhbGlkYXRvcnMuZmV0Y2ggPSBPYmplY3Qua2V5cyh1bmlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNlbGYuX3ZhbGlkYXRvcnMuZmV0Y2hBbGxGaWVsZHMgPSB0cnVlO1xuICAgICAgLy8gY2xlYXIgZmV0Y2gganVzdCB0byBtYWtlIHN1cmUgd2UgZG9uJ3QgYWNjaWRlbnRhbGx5IHJlYWQgaXRcbiAgICAgIHNlbGYuX3ZhbGlkYXRvcnMuZmV0Y2ggPSBudWxsO1xuICAgIH1cbiAgfVxufTtcblxuQ29sbGVjdGlvblByb3RvdHlwZS5faXNJbnNlY3VyZSA9IGZ1bmN0aW9uICgpIHtcbiAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gIGlmIChzZWxmLl9pbnNlY3VyZSA9PT0gdW5kZWZpbmVkKVxuICAgIHJldHVybiAhIVBhY2thZ2UuaW5zZWN1cmU7XG4gIHJldHVybiBzZWxmLl9pbnNlY3VyZTtcbn07XG5cbmFzeW5jIGZ1bmN0aW9uIGFzeW5jU29tZShhcnJheSwgcHJlZGljYXRlKSB7XG4gIGZvciAobGV0IGl0ZW0gb2YgYXJyYXkpIHtcbiAgICBpZiAoYXdhaXQgcHJlZGljYXRlKGl0ZW0pKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5hc3luYyBmdW5jdGlvbiBhc3luY0V2ZXJ5KGFycmF5LCBwcmVkaWNhdGUpIHtcbiAgZm9yIChsZXQgaXRlbSBvZiBhcnJheSkge1xuICAgIGlmICghYXdhaXQgcHJlZGljYXRlKGl0ZW0pKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5Db2xsZWN0aW9uUHJvdG90eXBlLl92YWxpZGF0ZWRJbnNlcnRBc3luYyA9IGFzeW5jIGZ1bmN0aW9uKHVzZXJJZCwgZG9jLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZW5lcmF0ZWRJZCkge1xuICBjb25zdCBzZWxmID0gdGhpcztcbiAgLy8gY2FsbCB1c2VyIHZhbGlkYXRvcnMuXG4gIC8vIEFueSBkZW55IHJldHVybnMgdHJ1ZSBtZWFucyBkZW5pZWQuXG4gIGlmIChhd2FpdCBhc3luY1NvbWUoc2VsZi5fdmFsaWRhdG9ycy5pbnNlcnQuZGVueSwgYXN5bmMgKHZhbGlkYXRvcikgPT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IHZhbGlkYXRvcih1c2VySWQsIGRvY1RvVmFsaWRhdGUodmFsaWRhdG9yLCBkb2MsIGdlbmVyYXRlZElkKSk7XG4gICAgcmV0dXJuIE1ldGVvci5faXNQcm9taXNlKHJlc3VsdCkgPyBhd2FpdCByZXN1bHQgOiByZXN1bHQ7XG4gIH0pKSB7XG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiQWNjZXNzIGRlbmllZFwiKTtcbiAgfVxuICAvLyBBbnkgYWxsb3cgcmV0dXJucyB0cnVlIG1lYW5zIHByb2NlZWQuIFRocm93IGVycm9yIGlmIHRoZXkgYWxsIGZhaWwuXG5cbiAgaWYgKGF3YWl0IGFzeW5jRXZlcnkoc2VsZi5fdmFsaWRhdG9ycy5pbnNlcnQuYWxsb3csIGFzeW5jICh2YWxpZGF0b3IpID0+IHtcbiAgICBjb25zdCByZXN1bHQgPSB2YWxpZGF0b3IodXNlcklkLCBkb2NUb1ZhbGlkYXRlKHZhbGlkYXRvciwgZG9jLCBnZW5lcmF0ZWRJZCkpO1xuICAgIHJldHVybiAhKE1ldGVvci5faXNQcm9taXNlKHJlc3VsdCkgPyBhd2FpdCByZXN1bHQgOiByZXN1bHQpO1xuICB9KSkge1xuICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBcIkFjY2VzcyBkZW5pZWRcIik7XG4gIH1cblxuICAvLyBJZiB3ZSBnZW5lcmF0ZWQgYW4gSUQgYWJvdmUsIGluc2VydEFzeW5jIGl0IG5vdzogYWZ0ZXIgdGhlIHZhbGlkYXRpb24sIGJ1dFxuICAvLyBiZWZvcmUgYWN0dWFsbHkgaW5zZXJ0aW5nLlxuICBpZiAoZ2VuZXJhdGVkSWQgIT09IG51bGwpXG4gICAgZG9jLl9pZCA9IGdlbmVyYXRlZElkO1xuXG4gIHJldHVybiBzZWxmLl9jb2xsZWN0aW9uLmluc2VydEFzeW5jLmNhbGwoc2VsZi5fY29sbGVjdGlvbiwgZG9jKTtcbn07XG5cbi8vIFNpbXVsYXRlIGEgbW9uZ28gYHVwZGF0ZWAgb3BlcmF0aW9uIHdoaWxlIHZhbGlkYXRpbmcgdGhhdCB0aGUgYWNjZXNzXG4vLyBjb250cm9sIHJ1bGVzIHNldCBieSBjYWxscyB0byBgYWxsb3cvZGVueWAgYXJlIHNhdGlzZmllZC4gSWYgYWxsXG4vLyBwYXNzLCByZXdyaXRlIHRoZSBtb25nbyBvcGVyYXRpb24gdG8gdXNlICRpbiB0byBzZXQgdGhlIGxpc3Qgb2Zcbi8vIGRvY3VtZW50IGlkcyB0byBjaGFuZ2UgIyNWYWxpZGF0ZWRDaGFuZ2VcbkNvbGxlY3Rpb25Qcm90b3R5cGUuX3ZhbGlkYXRlZFVwZGF0ZUFzeW5jID0gYXN5bmMgZnVuY3Rpb24oXG4gICAgdXNlcklkLCBzZWxlY3RvciwgbXV0YXRvciwgb3B0aW9ucykge1xuICBjb25zdCBzZWxmID0gdGhpcztcblxuICBjaGVjayhtdXRhdG9yLCBPYmplY3QpO1xuXG4gIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKE9iamVjdC5jcmVhdGUobnVsbCksIG9wdGlvbnMpO1xuXG4gIGlmICghTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWRQZXJoYXBzQXNPYmplY3Qoc2VsZWN0b3IpKVxuICAgIHRocm93IG5ldyBFcnJvcihcInZhbGlkYXRlZCB1cGRhdGUgc2hvdWxkIGJlIG9mIGEgc2luZ2xlIElEXCIpO1xuXG4gIC8vIFdlIGRvbid0IHN1cHBvcnQgdXBzZXJ0cyBiZWNhdXNlIHRoZXkgZG9uJ3QgZml0IG5pY2VseSBpbnRvIGFsbG93L2RlbnlcbiAgLy8gcnVsZXMuXG4gIGlmIChvcHRpb25zLnVwc2VydClcbiAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgXCJBY2Nlc3MgZGVuaWVkLiBVcHNlcnRzIG5vdCBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcImFsbG93ZWQgaW4gYSByZXN0cmljdGVkIGNvbGxlY3Rpb24uXCIpO1xuXG4gIGNvbnN0IG5vUmVwbGFjZUVycm9yID0gXCJBY2Nlc3MgZGVuaWVkLiBJbiBhIHJlc3RyaWN0ZWQgY29sbGVjdGlvbiB5b3UgY2FuIG9ubHlcIiArXG4gICAgICAgIFwiIHVwZGF0ZSBkb2N1bWVudHMsIG5vdCByZXBsYWNlIHRoZW0uIFVzZSBhIE1vbmdvIHVwZGF0ZSBvcGVyYXRvciwgc3VjaCBcIiArXG4gICAgICAgIFwiYXMgJyRzZXQnLlwiO1xuXG4gIGNvbnN0IG11dGF0b3JLZXlzID0gT2JqZWN0LmtleXMobXV0YXRvcik7XG5cbiAgLy8gY29tcHV0ZSBtb2RpZmllZCBmaWVsZHNcbiAgY29uc3QgbW9kaWZpZWRGaWVsZHMgPSB7fTtcblxuICBpZiAobXV0YXRvcktleXMubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIG5vUmVwbGFjZUVycm9yKTtcbiAgfVxuICBtdXRhdG9yS2V5cy5mb3JFYWNoKChvcCkgPT4ge1xuICAgIGNvbnN0IHBhcmFtcyA9IG11dGF0b3Jbb3BdO1xuICAgIGlmIChvcC5jaGFyQXQoMCkgIT09ICckJykge1xuICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIG5vUmVwbGFjZUVycm9yKTtcbiAgICB9IGVsc2UgaWYgKCFoYXNPd24uY2FsbChBTExPV0VEX1VQREFURV9PUEVSQVRJT05TLCBvcCkpIHtcbiAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoXG4gICAgICAgIDQwMywgXCJBY2Nlc3MgZGVuaWVkLiBPcGVyYXRvciBcIiArIG9wICsgXCIgbm90IGFsbG93ZWQgaW4gYSByZXN0cmljdGVkIGNvbGxlY3Rpb24uXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBPYmplY3Qua2V5cyhwYXJhbXMpLmZvckVhY2goKGZpZWxkKSA9PiB7XG4gICAgICAgIC8vIHRyZWF0IGRvdHRlZCBmaWVsZHMgYXMgaWYgdGhleSBhcmUgcmVwbGFjaW5nIHRoZWlyXG4gICAgICAgIC8vIHRvcC1sZXZlbCBwYXJ0XG4gICAgICAgIGlmIChmaWVsZC5pbmRleE9mKCcuJykgIT09IC0xKVxuICAgICAgICAgIGZpZWxkID0gZmllbGQuc3Vic3RyaW5nKDAsIGZpZWxkLmluZGV4T2YoJy4nKSk7XG5cbiAgICAgICAgLy8gcmVjb3JkIHRoZSBmaWVsZCB3ZSBhcmUgdHJ5aW5nIHRvIGNoYW5nZVxuICAgICAgICBtb2RpZmllZEZpZWxkc1tmaWVsZF0gPSB0cnVlO1xuICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICBjb25zdCBmaWVsZHMgPSBPYmplY3Qua2V5cyhtb2RpZmllZEZpZWxkcyk7XG5cbiAgY29uc3QgZmluZE9wdGlvbnMgPSB7dHJhbnNmb3JtOiBudWxsfTtcbiAgaWYgKCFzZWxmLl92YWxpZGF0b3JzLmZldGNoQWxsRmllbGRzKSB7XG4gICAgZmluZE9wdGlvbnMuZmllbGRzID0ge307XG4gICAgc2VsZi5fdmFsaWRhdG9ycy5mZXRjaC5mb3JFYWNoKChmaWVsZE5hbWUpID0+IHtcbiAgICAgIGZpbmRPcHRpb25zLmZpZWxkc1tmaWVsZE5hbWVdID0gMTtcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IGRvYyA9IGF3YWl0IHNlbGYuX2NvbGxlY3Rpb24uZmluZE9uZUFzeW5jKHNlbGVjdG9yLCBmaW5kT3B0aW9ucyk7XG4gIGlmICghZG9jKSAgLy8gbm9uZSBzYXRpc2ZpZWQhXG4gICAgcmV0dXJuIDA7XG5cbiAgLy8gY2FsbCB1c2VyIHZhbGlkYXRvcnMuXG4gIC8vIEFueSBkZW55IHJldHVybnMgdHJ1ZSBtZWFucyBkZW5pZWQuXG4gIGlmIChhd2FpdCBhc3luY1NvbWUoc2VsZi5fdmFsaWRhdG9ycy51cGRhdGUuZGVueSwgYXN5bmMgKHZhbGlkYXRvcikgPT4ge1xuICAgIGNvbnN0IGZhY3RvcmllZERvYyA9IHRyYW5zZm9ybURvYyh2YWxpZGF0b3IsIGRvYyk7XG4gICAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdG9yKHVzZXJJZCxcbiAgICAgIGZhY3RvcmllZERvYyxcbiAgICAgIGZpZWxkcyxcbiAgICAgIG11dGF0b3IpO1xuICAgIHJldHVybiBNZXRlb3IuX2lzUHJvbWlzZShyZXN1bHQpID8gYXdhaXQgcmVzdWx0IDogcmVzdWx0O1xuICB9KSkge1xuICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBcIkFjY2VzcyBkZW5pZWRcIik7XG4gIH1cblxuICAvLyBBbnkgYWxsb3cgcmV0dXJucyB0cnVlIG1lYW5zIHByb2NlZWQuIFRocm93IGVycm9yIGlmIHRoZXkgYWxsIGZhaWwuXG4gIGlmIChhd2FpdCBhc3luY0V2ZXJ5KHNlbGYuX3ZhbGlkYXRvcnMudXBkYXRlLmFsbG93LCBhc3luYyAodmFsaWRhdG9yKSA9PiB7XG4gICAgY29uc3QgZmFjdG9yaWVkRG9jID0gdHJhbnNmb3JtRG9jKHZhbGlkYXRvciwgZG9jKTtcbiAgICBjb25zdCByZXN1bHQgPSB2YWxpZGF0b3IodXNlcklkLFxuICAgICAgZmFjdG9yaWVkRG9jLFxuICAgICAgZmllbGRzLFxuICAgICAgbXV0YXRvcik7XG4gICAgcmV0dXJuICEoTWV0ZW9yLl9pc1Byb21pc2UocmVzdWx0KSA/IGF3YWl0IHJlc3VsdCA6IHJlc3VsdCk7XG4gIH0pKSB7XG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiQWNjZXNzIGRlbmllZFwiKTtcbiAgfVxuXG4gIG9wdGlvbnMuX2ZvcmJpZFJlcGxhY2UgPSB0cnVlO1xuXG4gIC8vIEJhY2sgd2hlbiB3ZSBzdXBwb3J0ZWQgYXJiaXRyYXJ5IGNsaWVudC1wcm92aWRlZCBzZWxlY3RvcnMsIHdlIGFjdHVhbGx5XG4gIC8vIHJld3JvdGUgdGhlIHNlbGVjdG9yIHRvIGluY2x1ZGUgYW4gX2lkIGNsYXVzZSBiZWZvcmUgcGFzc2luZyB0byBNb25nbyB0b1xuICAvLyBhdm9pZCByYWNlcywgYnV0IHNpbmNlIHNlbGVjdG9yIGlzIGd1YXJhbnRlZWQgdG8gYWxyZWFkeSBqdXN0IGJlIGFuIElELCB3ZVxuICAvLyBkb24ndCBoYXZlIHRvIGFueSBtb3JlLlxuXG4gIHJldHVybiBzZWxmLl9jb2xsZWN0aW9uLnVwZGF0ZUFzeW5jLmNhbGwoXG4gICAgc2VsZi5fY29sbGVjdGlvbiwgc2VsZWN0b3IsIG11dGF0b3IsIG9wdGlvbnMpO1xufTtcblxuLy8gT25seSBhbGxvdyB0aGVzZSBvcGVyYXRpb25zIGluIHZhbGlkYXRlZCB1cGRhdGVzLiBTcGVjaWZpY2FsbHlcbi8vIHdoaXRlbGlzdCBvcGVyYXRpb25zLCByYXRoZXIgdGhhbiBibGFja2xpc3QsIHNvIG5ldyBjb21wbGV4XG4vLyBvcGVyYXRpb25zIHRoYXQgYXJlIGFkZGVkIGFyZW4ndCBhdXRvbWF0aWNhbGx5IGFsbG93ZWQuIEEgY29tcGxleFxuLy8gb3BlcmF0aW9uIGlzIG9uZSB0aGF0IGRvZXMgbW9yZSB0aGFuIGp1c3QgbW9kaWZ5IGl0cyB0YXJnZXRcbi8vIGZpZWxkLiBGb3Igbm93IHRoaXMgY29udGFpbnMgYWxsIHVwZGF0ZSBvcGVyYXRpb25zIGV4Y2VwdCAnJHJlbmFtZScuXG4vLyBodHRwOi8vZG9jcy5tb25nb2RiLm9yZy9tYW51YWwvcmVmZXJlbmNlL29wZXJhdG9ycy8jdXBkYXRlXG5jb25zdCBBTExPV0VEX1VQREFURV9PUEVSQVRJT05TID0ge1xuICAkaW5jOjEsICRzZXQ6MSwgJHVuc2V0OjEsICRhZGRUb1NldDoxLCAkcG9wOjEsICRwdWxsQWxsOjEsICRwdWxsOjEsXG4gICRwdXNoQWxsOjEsICRwdXNoOjEsICRiaXQ6MVxufTtcblxuLy8gU2ltdWxhdGUgYSBtb25nbyBgcmVtb3ZlYCBvcGVyYXRpb24gd2hpbGUgdmFsaWRhdGluZyBhY2Nlc3MgY29udHJvbFxuLy8gcnVsZXMuIFNlZSAjVmFsaWRhdGVkQ2hhbmdlXG5Db2xsZWN0aW9uUHJvdG90eXBlLl92YWxpZGF0ZWRSZW1vdmVBc3luYyA9IGFzeW5jIGZ1bmN0aW9uKHVzZXJJZCwgc2VsZWN0b3IpIHtcbiAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgY29uc3QgZmluZE9wdGlvbnMgPSB7dHJhbnNmb3JtOiBudWxsfTtcbiAgaWYgKCFzZWxmLl92YWxpZGF0b3JzLmZldGNoQWxsRmllbGRzKSB7XG4gICAgZmluZE9wdGlvbnMuZmllbGRzID0ge307XG4gICAgc2VsZi5fdmFsaWRhdG9ycy5mZXRjaC5mb3JFYWNoKChmaWVsZE5hbWUpID0+IHtcbiAgICAgIGZpbmRPcHRpb25zLmZpZWxkc1tmaWVsZE5hbWVdID0gMTtcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IGRvYyA9IGF3YWl0IHNlbGYuX2NvbGxlY3Rpb24uZmluZE9uZUFzeW5jKHNlbGVjdG9yLCBmaW5kT3B0aW9ucyk7XG4gIGlmICghZG9jKVxuICAgIHJldHVybiAwO1xuXG4gIC8vIGNhbGwgdXNlciB2YWxpZGF0b3JzLlxuICAvLyBBbnkgZGVueSByZXR1cm5zIHRydWUgbWVhbnMgZGVuaWVkLlxuICBpZiAoYXdhaXQgYXN5bmNTb21lKHNlbGYuX3ZhbGlkYXRvcnMucmVtb3ZlLmRlbnksIGFzeW5jICh2YWxpZGF0b3IpID0+IHtcbiAgICBjb25zdCByZXN1bHQgPSB2YWxpZGF0b3IodXNlcklkLCB0cmFuc2Zvcm1Eb2ModmFsaWRhdG9yLCBkb2MpKTtcbiAgICByZXR1cm4gTWV0ZW9yLl9pc1Byb21pc2UocmVzdWx0KSA/IGF3YWl0IHJlc3VsdCA6IHJlc3VsdDtcbiAgfSkpIHtcbiAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgXCJBY2Nlc3MgZGVuaWVkXCIpO1xuICB9XG4gIC8vIEFueSBhbGxvdyByZXR1cm5zIHRydWUgbWVhbnMgcHJvY2VlZC4gVGhyb3cgZXJyb3IgaWYgdGhleSBhbGwgZmFpbC5cbiAgaWYgKGF3YWl0IGFzeW5jRXZlcnkoc2VsZi5fdmFsaWRhdG9ycy5yZW1vdmUuYWxsb3csIGFzeW5jICh2YWxpZGF0b3IpID0+IHtcbiAgICBjb25zdCByZXN1bHQgPSB2YWxpZGF0b3IodXNlcklkLCB0cmFuc2Zvcm1Eb2ModmFsaWRhdG9yLCBkb2MpKTtcbiAgICByZXR1cm4gIShNZXRlb3IuX2lzUHJvbWlzZShyZXN1bHQpID8gYXdhaXQgcmVzdWx0IDogcmVzdWx0KTtcbiAgfSkpIHtcbiAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgXCJBY2Nlc3MgZGVuaWVkXCIpO1xuICB9XG5cbiAgLy8gQmFjayB3aGVuIHdlIHN1cHBvcnRlZCBhcmJpdHJhcnkgY2xpZW50LXByb3ZpZGVkIHNlbGVjdG9ycywgd2UgYWN0dWFsbHlcbiAgLy8gcmV3cm90ZSB0aGUgc2VsZWN0b3IgdG8ge19pZDogeyRpbjogW2lkcyB0aGF0IHdlIGZvdW5kXX19IGJlZm9yZSBwYXNzaW5nIHRvXG4gIC8vIE1vbmdvIHRvIGF2b2lkIHJhY2VzLCBidXQgc2luY2Ugc2VsZWN0b3IgaXMgZ3VhcmFudGVlZCB0byBhbHJlYWR5IGp1c3QgYmVcbiAgLy8gYW4gSUQsIHdlIGRvbid0IGhhdmUgdG8gYW55IG1vcmUuXG5cbiAgcmV0dXJuIHNlbGYuX2NvbGxlY3Rpb24ucmVtb3ZlQXN5bmMuY2FsbChzZWxmLl9jb2xsZWN0aW9uLCBzZWxlY3Rvcik7XG59O1xuXG5Db2xsZWN0aW9uUHJvdG90eXBlLl9jYWxsTXV0YXRvck1ldGhvZEFzeW5jID0gZnVuY3Rpb24gX2NhbGxNdXRhdG9yTWV0aG9kQXN5bmMobmFtZSwgYXJncywgb3B0aW9ucyA9IHt9KSB7XG5cbiAgLy8gRm9yIHR3byBvdXQgb2YgdGhyZWUgbXV0YXRvciBtZXRob2RzLCB0aGUgZmlyc3QgYXJndW1lbnQgaXMgYSBzZWxlY3RvclxuICBjb25zdCBmaXJzdEFyZ0lzU2VsZWN0b3IgPSBuYW1lID09PSBcInVwZGF0ZUFzeW5jXCIgfHwgbmFtZSA9PT0gXCJyZW1vdmVBc3luY1wiO1xuICBpZiAoZmlyc3RBcmdJc1NlbGVjdG9yICYmICFhbHJlYWR5SW5TaW11bGF0aW9uKCkpIHtcbiAgICAvLyBJZiB3ZSdyZSBhYm91dCB0byBhY3R1YWxseSBzZW5kIGFuIFJQQywgd2Ugc2hvdWxkIHRocm93IGFuIGVycm9yIGlmXG4gICAgLy8gdGhpcyBpcyBhIG5vbi1JRCBzZWxlY3RvciwgYmVjYXVzZSB0aGUgbXV0YXRpb24gbWV0aG9kcyBvbmx5IGFsbG93XG4gICAgLy8gc2luZ2xlLUlEIHNlbGVjdG9ycy4gKElmIHdlIGRvbid0IHRocm93IGhlcmUsIHdlJ2xsIHNlZSBmbGlja2VyLilcbiAgICB0aHJvd0lmU2VsZWN0b3JJc05vdElkKGFyZ3NbMF0sIG5hbWUpO1xuICB9XG5cbiAgY29uc3QgbXV0YXRvck1ldGhvZE5hbWUgPSB0aGlzLl9wcmVmaXggKyBuYW1lO1xuICByZXR1cm4gdGhpcy5fY29ubmVjdGlvbi5hcHBseUFzeW5jKG11dGF0b3JNZXRob2ROYW1lLCBhcmdzLCB7XG4gICAgcmV0dXJuU3R1YlZhbHVlOiB0aGlzLnJlc29sdmVyVHlwZSA9PT0gJ3N0dWInIHx8IHRoaXMucmVzb2x2ZXJUeXBlID09IG51bGwsXG4gICAgLy8gU3R1YlN0cmVhbSBpcyBvbmx5IHVzZWQgZm9yIHRlc3Rpbmcgd2hlcmUgeW91IGRvbid0IGNhcmUgYWJvdXQgdGhlIHNlcnZlclxuICAgIHJldHVyblNlcnZlclJlc3VsdFByb21pc2U6ICF0aGlzLl9jb25uZWN0aW9uLl9zdHJlYW0uX2lzU3R1YiAmJiB0aGlzLnJlc29sdmVyVHlwZSAhPT0gJ3N0dWInLFxuICAgIC4uLm9wdGlvbnMsXG4gIH0pO1xufVxuXG5Db2xsZWN0aW9uUHJvdG90eXBlLl9jYWxsTXV0YXRvck1ldGhvZCA9IGZ1bmN0aW9uIF9jYWxsTXV0YXRvck1ldGhvZChuYW1lLCBhcmdzLCBjYWxsYmFjaykge1xuICBpZiAoTWV0ZW9yLmlzQ2xpZW50ICYmICFjYWxsYmFjayAmJiAhYWxyZWFkeUluU2ltdWxhdGlvbigpKSB7XG4gICAgLy8gQ2xpZW50IGNhbid0IGJsb2NrLCBzbyBpdCBjYW4ndCByZXBvcnQgZXJyb3JzIGJ5IGV4Y2VwdGlvbixcbiAgICAvLyBvbmx5IGJ5IGNhbGxiYWNrLiBJZiB0aGV5IGZvcmdldCB0aGUgY2FsbGJhY2ssIGdpdmUgdGhlbSBhXG4gICAgLy8gZGVmYXVsdCBvbmUgdGhhdCBsb2dzIHRoZSBlcnJvciwgc28gdGhleSBhcmVuJ3QgdG90YWxseVxuICAgIC8vIGJhZmZsZWQgaWYgdGhlaXIgd3JpdGVzIGRvbid0IHdvcmsgYmVjYXVzZSB0aGVpciBkYXRhYmFzZSBpc1xuICAgIC8vIGRvd24uXG4gICAgLy8gRG9uJ3QgZ2l2ZSBhIGRlZmF1bHQgY2FsbGJhY2sgaW4gc2ltdWxhdGlvbiwgYmVjYXVzZSBpbnNpZGUgc3R1YnMgd2VcbiAgICAvLyB3YW50IHRvIHJldHVybiB0aGUgcmVzdWx0cyBmcm9tIHRoZSBsb2NhbCBjb2xsZWN0aW9uIGltbWVkaWF0ZWx5IGFuZFxuICAgIC8vIG5vdCBmb3JjZSBhIGNhbGxiYWNrLlxuICAgIGNhbGxiYWNrID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgaWYgKGVycilcbiAgICAgICAgTWV0ZW9yLl9kZWJ1ZyhuYW1lICsgXCIgZmFpbGVkXCIsIGVycik7XG4gICAgfTtcbiAgfVxuXG4gIC8vIEZvciB0d28gb3V0IG9mIHRocmVlIG11dGF0b3IgbWV0aG9kcywgdGhlIGZpcnN0IGFyZ3VtZW50IGlzIGEgc2VsZWN0b3JcbiAgY29uc3QgZmlyc3RBcmdJc1NlbGVjdG9yID0gbmFtZSA9PT0gXCJ1cGRhdGVcIiB8fCBuYW1lID09PSBcInJlbW92ZVwiO1xuICBpZiAoZmlyc3RBcmdJc1NlbGVjdG9yICYmICFhbHJlYWR5SW5TaW11bGF0aW9uKCkpIHtcbiAgICAvLyBJZiB3ZSdyZSBhYm91dCB0byBhY3R1YWxseSBzZW5kIGFuIFJQQywgd2Ugc2hvdWxkIHRocm93IGFuIGVycm9yIGlmXG4gICAgLy8gdGhpcyBpcyBhIG5vbi1JRCBzZWxlY3RvciwgYmVjYXVzZSB0aGUgbXV0YXRpb24gbWV0aG9kcyBvbmx5IGFsbG93XG4gICAgLy8gc2luZ2xlLUlEIHNlbGVjdG9ycy4gKElmIHdlIGRvbid0IHRocm93IGhlcmUsIHdlJ2xsIHNlZSBmbGlja2VyLilcbiAgICB0aHJvd0lmU2VsZWN0b3JJc05vdElkKGFyZ3NbMF0sIG5hbWUpO1xuICB9XG5cbiAgY29uc3QgbXV0YXRvck1ldGhvZE5hbWUgPSB0aGlzLl9wcmVmaXggKyBuYW1lO1xuICByZXR1cm4gdGhpcy5fY29ubmVjdGlvbi5hcHBseShcbiAgICBtdXRhdG9yTWV0aG9kTmFtZSwgYXJncywgeyByZXR1cm5TdHViVmFsdWU6IHRydWUgfSwgY2FsbGJhY2spO1xufVxuXG5mdW5jdGlvbiB0cmFuc2Zvcm1Eb2ModmFsaWRhdG9yLCBkb2MpIHtcbiAgaWYgKHZhbGlkYXRvci50cmFuc2Zvcm0pXG4gICAgcmV0dXJuIHZhbGlkYXRvci50cmFuc2Zvcm0oZG9jKTtcbiAgcmV0dXJuIGRvYztcbn1cblxuZnVuY3Rpb24gZG9jVG9WYWxpZGF0ZSh2YWxpZGF0b3IsIGRvYywgZ2VuZXJhdGVkSWQpIHtcbiAgbGV0IHJldCA9IGRvYztcbiAgaWYgKHZhbGlkYXRvci50cmFuc2Zvcm0pIHtcbiAgICByZXQgPSBFSlNPTi5jbG9uZShkb2MpO1xuICAgIC8vIElmIHlvdSBzZXQgYSBzZXJ2ZXItc2lkZSB0cmFuc2Zvcm0gb24geW91ciBjb2xsZWN0aW9uLCB0aGVuIHlvdSBkb24ndCBnZXRcbiAgICAvLyB0byB0ZWxsIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gXCJjbGllbnQgc3BlY2lmaWVkIHRoZSBJRFwiIGFuZCBcInNlcnZlclxuICAgIC8vIGdlbmVyYXRlZCB0aGUgSURcIiwgYmVjYXVzZSB0cmFuc2Zvcm1zIGV4cGVjdCB0byBnZXQgX2lkLiAgSWYgeW91IHdhbnQgdG9cbiAgICAvLyBkbyB0aGF0IGNoZWNrLCB5b3UgY2FuIGRvIGl0IHdpdGggYSBzcGVjaWZpY1xuICAgIC8vIGBDLmFsbG93KHtpbnNlcnRBc3luYzogZiwgdHJhbnNmb3JtOiBudWxsfSlgIHZhbGlkYXRvci5cbiAgICBpZiAoZ2VuZXJhdGVkSWQgIT09IG51bGwpIHtcbiAgICAgIHJldC5faWQgPSBnZW5lcmF0ZWRJZDtcbiAgICB9XG4gICAgcmV0ID0gdmFsaWRhdG9yLnRyYW5zZm9ybShyZXQpO1xuICB9XG4gIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIGFkZFZhbGlkYXRvcihjb2xsZWN0aW9uLCBhbGxvd09yRGVueSwgb3B0aW9ucykge1xuICAvLyB2YWxpZGF0ZSBrZXlzXG4gIGNvbnN0IHZhbGlkS2V5c1JlZ0V4ID0gL14oPzppbnNlcnRBc3luY3x1cGRhdGVBc3luY3xyZW1vdmVBc3luY3xpbnNlcnR8dXBkYXRlfHJlbW92ZXxmZXRjaHx0cmFuc2Zvcm0pJC87XG4gIE9iamVjdC5rZXlzKG9wdGlvbnMpLmZvckVhY2goKGtleSkgPT4ge1xuICAgIGlmICghdmFsaWRLZXlzUmVnRXgudGVzdChrZXkpKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKGFsbG93T3JEZW55ICsgXCI6IEludmFsaWQga2V5OiBcIiArIGtleSk7XG5cbiAgICAvLyBUT0RPIGRlcHJlY2F0ZWQgYXN5bmMgY29uZmlnIG9uIGZ1dHVyZSB2ZXJzaW9uc1xuICAgIGNvbnN0IGlzQXN5bmNLZXkgPSBrZXkuaW5jbHVkZXMoJ0FzeW5jJyk7XG4gICAgaWYgKGlzQXN5bmNLZXkpIHtcbiAgICAgIGNvbnN0IHN5bmNLZXkgPSBrZXkucmVwbGFjZSgnQXN5bmMnLCAnJyk7XG4gICAgICBNZXRlb3IuZGVwcmVjYXRlKGFsbG93T3JEZW55ICsgYDogVGhlIFwiJHtrZXl9XCIga2V5IGlzIGRlcHJlY2F0ZWQuIFVzZSBcIiR7c3luY0tleX1cIiBpbnN0ZWFkLmApO1xuICAgIH1cbiAgfSk7XG5cbiAgY29sbGVjdGlvbi5fcmVzdHJpY3RlZCA9IHRydWU7XG5cbiAgW1xuICAgICdpbnNlcnRBc3luYycsXG4gICAgJ3VwZGF0ZUFzeW5jJyxcbiAgICAncmVtb3ZlQXN5bmMnLFxuICAgICdpbnNlcnQnLFxuICAgICd1cGRhdGUnLFxuICAgICdyZW1vdmUnLFxuICBdLmZvckVhY2gobmFtZSA9PiB7XG4gICAgaWYgKGhhc093bi5jYWxsKG9wdGlvbnMsIG5hbWUpKSB7XG4gICAgICBpZiAoIShvcHRpb25zW25hbWVdIGluc3RhbmNlb2YgRnVuY3Rpb24pKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBhbGxvd09yRGVueSArICc6IFZhbHVlIGZvciBgJyArIG5hbWUgKyAnYCBtdXN0IGJlIGEgZnVuY3Rpb24nXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoZSB0cmFuc2Zvcm0gaXMgc3BlY2lmaWVkIGF0IGFsbCAoaW5jbHVkaW5nIGFzICdudWxsJykgaW4gdGhpc1xuICAgICAgLy8gY2FsbCwgdGhlbiB0YWtlIHRoYXQ7IG90aGVyd2lzZSwgdGFrZSB0aGUgdHJhbnNmb3JtIGZyb20gdGhlXG4gICAgICAvLyBjb2xsZWN0aW9uLlxuICAgICAgaWYgKG9wdGlvbnMudHJhbnNmb3JtID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgb3B0aW9uc1tuYW1lXS50cmFuc2Zvcm0gPSBjb2xsZWN0aW9uLl90cmFuc2Zvcm07IC8vIGFscmVhZHkgd3JhcHBlZFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3B0aW9uc1tuYW1lXS50cmFuc2Zvcm0gPSBMb2NhbENvbGxlY3Rpb24ud3JhcFRyYW5zZm9ybShcbiAgICAgICAgICBvcHRpb25zLnRyYW5zZm9ybVxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgY29uc3QgaXNBc3luY05hbWUgPSBuYW1lLmluY2x1ZGVzKCdBc3luYycpO1xuICAgICAgY29uc3QgdmFsaWRhdG9yU3luY05hbWUgPSBpc0FzeW5jTmFtZSA/IG5hbWUucmVwbGFjZSgnQXN5bmMnLCAnJykgOiBuYW1lO1xuICAgICAgY29sbGVjdGlvbi5fdmFsaWRhdG9yc1t2YWxpZGF0b3JTeW5jTmFtZV1bYWxsb3dPckRlbnldLnB1c2gob3B0aW9uc1tuYW1lXSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBPbmx5IHVwZGF0ZUFzeW5jIHRoZSBmZXRjaCBmaWVsZHMgaWYgd2UncmUgcGFzc2VkIHRoaW5ncyB0aGF0IGFmZmVjdFxuICAvLyBmZXRjaGluZy4gVGhpcyB3YXkgYWxsb3coe30pIGFuZCBhbGxvdyh7aW5zZXJ0QXN5bmM6IGZ9KSBkb24ndCByZXN1bHQgaW5cbiAgLy8gc2V0dGluZyBmZXRjaEFsbEZpZWxkc1xuICBpZiAob3B0aW9ucy51cGRhdGVBc3luYyB8fCBvcHRpb25zLnJlbW92ZUFzeW5jIHx8IG9wdGlvbnMuZmV0Y2gpIHtcbiAgICBpZiAob3B0aW9ucy5mZXRjaCAmJiAhKG9wdGlvbnMuZmV0Y2ggaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihhbGxvd09yRGVueSArIFwiOiBWYWx1ZSBmb3IgYGZldGNoYCBtdXN0IGJlIGFuIGFycmF5XCIpO1xuICAgIH1cbiAgICBjb2xsZWN0aW9uLl91cGRhdGVGZXRjaChvcHRpb25zLmZldGNoKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB0aHJvd0lmU2VsZWN0b3JJc05vdElkKHNlbGVjdG9yLCBtZXRob2ROYW1lKSB7XG4gIGlmICghTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWRQZXJoYXBzQXNPYmplY3Qoc2VsZWN0b3IpKSB7XG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcihcbiAgICAgIDQwMywgXCJOb3QgcGVybWl0dGVkLiBVbnRydXN0ZWQgY29kZSBtYXkgb25seSBcIiArIG1ldGhvZE5hbWUgK1xuICAgICAgICBcIiBkb2N1bWVudHMgYnkgSUQuXCIpO1xuICB9XG59O1xuXG4vLyBEZXRlcm1pbmUgaWYgd2UgYXJlIGluIGEgRERQIG1ldGhvZCBzaW11bGF0aW9uXG5mdW5jdGlvbiBhbHJlYWR5SW5TaW11bGF0aW9uKCkge1xuICB2YXIgQ3VycmVudEludm9jYXRpb24gPVxuICAgIEREUC5fQ3VycmVudE1ldGhvZEludm9jYXRpb24gfHxcbiAgICAvLyBGb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHksIGFzIGV4cGxhaW5lZCBpbiB0aGlzIGlzc3VlOlxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9tZXRlb3IvbWV0ZW9yL2lzc3Vlcy84OTQ3XG4gICAgRERQLl9DdXJyZW50SW52b2NhdGlvbjtcblxuICBjb25zdCBlbmNsb3NpbmcgPSBDdXJyZW50SW52b2NhdGlvbi5nZXQoKTtcbiAgcmV0dXJuIGVuY2xvc2luZyAmJiBlbmNsb3NpbmcuaXNTaW11bGF0aW9uO1xufVxuIl19
