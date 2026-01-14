Package["core-runtime"].queue("ordered-dict",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var OrderedDict;

var require = meteorInstall({"node_modules":{"meteor":{"ordered-dict":{"ordered_dict.js":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/ordered-dict/ordered_dict.js                                                                    //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
module.export({OrderedDict:()=>OrderedDict});let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);// This file defines an ordered dictionary abstraction that is useful for
// maintaining a dataset backed by observeChanges.  It supports ordering items
// by specifying the item they now come before.
// The implementation is a dictionary that contains nodes of a doubly-linked
// list as its values.
// constructs a new element struct
// next and prev are whole elements, not keys.

function element(key, value, next, prev) {
    return {
        key: key,
        value: value,
        next: next,
        prev: prev
    };
}
class OrderedDict {
    // the "prefix keys with a space" thing comes from here
    // https://github.com/documentcloud/underscore/issues/376#issuecomment-2815649
    _k(key) {
        return " " + this._stringify(key);
    }
    empty() {
        return !this._first;
    }
    size() {
        return this._size;
    }
    _linkEltIn(elt) {
        if (!elt.next) {
            elt.prev = this._last;
            if (this._last) this._last.next = elt;
            this._last = elt;
        } else {
            elt.prev = elt.next.prev;
            elt.next.prev = elt;
            if (elt.prev) elt.prev.next = elt;
        }
        if (this._first === null || this._first === elt.next) this._first = elt;
    }
    _linkEltOut(elt) {
        if (elt.next) elt.next.prev = elt.prev;
        if (elt.prev) elt.prev.next = elt.next;
        if (elt === this._last) this._last = elt.prev;
        if (elt === this._first) this._first = elt.next;
    }
    putBefore(key, item, before) {
        if (this._dict[this._k(key)]) throw new Error("Item " + key + " already present in OrderedDict");
        var elt = before ? element(key, item, this._dict[this._k(before)]) : element(key, item, null);
        if (typeof elt.next === "undefined") throw new Error("could not find item to put this one before");
        this._linkEltIn(elt);
        this._dict[this._k(key)] = elt;
        this._size++;
    }
    append(key, item) {
        this.putBefore(key, item, null);
    }
    remove(key) {
        var elt = this._dict[this._k(key)];
        if (typeof elt === "undefined") throw new Error("Item " + key + " not present in OrderedDict");
        this._linkEltOut(elt);
        this._size--;
        delete this._dict[this._k(key)];
        return elt.value;
    }
    get(key) {
        if (this.has(key)) {
            return this._dict[this._k(key)].value;
        }
    }
    has(key) {
        return Object.prototype.hasOwnProperty.call(this._dict, this._k(key));
    }
    // Iterate through the items in this dictionary in order, calling
    // iter(value, key, index) on each one.
    // Stops whenever iter returns OrderedDict.BREAK, or after the last element.
    forEach(iter, context = null) {
        var i = 0;
        var elt = this._first;
        while(elt !== null){
            var b = iter.call(context, elt.value, elt.key, i);
            if (b === OrderedDict.BREAK) return;
            elt = elt.next;
            i++;
        }
    }
    forEachAsync(asyncIter, context = null) {
        return _async_to_generator(function*() {
            let i = 0;
            let elt = this._first;
            while(elt !== null){
                const b = yield asyncIter.call(context, elt.value, elt.key, i);
                if (b === OrderedDict.BREAK) return;
                elt = elt.next;
                i++;
            }
        }).call(this);
    }
    first() {
        if (this.empty()) {
            return;
        }
        return this._first.key;
    }
    firstValue() {
        if (this.empty()) {
            return;
        }
        return this._first.value;
    }
    last() {
        if (this.empty()) {
            return;
        }
        return this._last.key;
    }
    lastValue() {
        if (this.empty()) {
            return;
        }
        return this._last.value;
    }
    prev(key) {
        if (this.has(key)) {
            var elt = this._dict[this._k(key)];
            if (elt.prev) return elt.prev.key;
        }
        return null;
    }
    next(key) {
        if (this.has(key)) {
            var elt = this._dict[this._k(key)];
            if (elt.next) return elt.next.key;
        }
        return null;
    }
    moveBefore(key, before) {
        var elt = this._dict[this._k(key)];
        var eltBefore = before ? this._dict[this._k(before)] : null;
        if (typeof elt === "undefined") {
            throw new Error("Item to move is not present");
        }
        if (typeof eltBefore === "undefined") {
            throw new Error("Could not find element to move this one before");
        }
        if (eltBefore === elt.next) return;
        // remove from its old place
        this._linkEltOut(elt);
        // patch into its new place
        elt.next = eltBefore;
        this._linkEltIn(elt);
    }
    // Linear, sadly.
    indexOf(key) {
        var ret = null;
        this.forEach((v, k, i)=>{
            if (this._k(k) === this._k(key)) {
                ret = i;
                return OrderedDict.BREAK;
            }
            return;
        });
        return ret;
    }
    _checkRep() {
        Object.keys(this._dict).forEach((k)=>{
            const v = this._dict[k];
            if (v.next === v) {
                throw new Error("Next is a loop");
            }
            if (v.prev === v) {
                throw new Error("Prev is a loop");
            }
        });
    }
    constructor(...args){
        this._dict = Object.create(null);
        this._first = null;
        this._last = null;
        this._size = 0;
        if (typeof args[0] === 'function') {
            this._stringify = args.shift();
        } else {
            this._stringify = function(x) {
                return x;
            };
        }
        args.forEach((kv)=>this.putBefore(kv[0], kv[1], null));
    }
}
OrderedDict.BREAK = {
    "break": true
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});


/* Exports */
return {
  export: function () { return {
      OrderedDict: OrderedDict
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/ordered-dict/ordered_dict.js"
  ],
  mainModulePath: "/node_modules/meteor/ordered-dict/ordered_dict.js"
}});

//# sourceURL=meteor://💻app/packages/ordered-dict.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3JkZXJlZC1kaWN0L29yZGVyZWRfZGljdC5qcyJdLCJuYW1lcyI6WyJlbGVtZW50Iiwia2V5IiwidmFsdWUiLCJuZXh0IiwicHJldiIsIk9yZGVyZWREaWN0IiwiX2siLCJfc3RyaW5naWZ5IiwiZW1wdHkiLCJfZmlyc3QiLCJzaXplIiwiX3NpemUiLCJfbGlua0VsdEluIiwiZWx0IiwiX2xhc3QiLCJfbGlua0VsdE91dCIsInB1dEJlZm9yZSIsIml0ZW0iLCJiZWZvcmUiLCJfZGljdCIsIkVycm9yIiwiYXBwZW5kIiwicmVtb3ZlIiwiZ2V0IiwiaGFzIiwiT2JqZWN0IiwicHJvdG90eXBlIiwiaGFzT3duUHJvcGVydHkiLCJjYWxsIiwiZm9yRWFjaCIsIml0ZXIiLCJjb250ZXh0IiwiaSIsImIiLCJCUkVBSyIsImZvckVhY2hBc3luYyIsImFzeW5jSXRlciIsImZpcnN0IiwiZmlyc3RWYWx1ZSIsImxhc3QiLCJsYXN0VmFsdWUiLCJtb3ZlQmVmb3JlIiwiZWx0QmVmb3JlIiwiaW5kZXhPZiIsInJldCIsInYiLCJrIiwiX2NoZWNrUmVwIiwia2V5cyIsImFyZ3MiLCJjcmVhdGUiLCJzaGlmdCIsIngiLCJrdiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx5RUFBeUU7QUFDekUsOEVBQThFO0FBQzlFLCtDQUErQztBQUUvQyw0RUFBNEU7QUFDNUUsc0JBQXNCO0FBRXRCLGtDQUFrQztBQUNsQyw4Q0FBOEM7O0FBQzlDLFNBQVNBLFFBQVFDLEdBQUcsRUFBRUMsS0FBSyxFQUFFQyxJQUFJLEVBQUVDLElBQUk7SUFDckMsT0FBTztRQUNMSCxLQUFLQTtRQUNMQyxPQUFPQTtRQUNQQyxNQUFNQTtRQUNOQyxNQUFNQTtJQUNSO0FBQ0Y7QUFFQSxPQUFPLE1BQU1DO0lBZ0JYLHVEQUF1RDtJQUN2RCw4RUFBOEU7SUFDOUVDLEdBQUdMLEdBQUcsRUFBRTtRQUNOLE9BQU8sTUFBTSxJQUFJLENB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LFNBQVU2QyxDQUFDO2dCQUFJLE9BQU9BO1lBQUc7UUFDN0M7UUFFQUgsS0FBS3BCLE9BQU8sQ0FBQ3dCLE1BQU0sSUFBSSxDQUFDckMsU0FBUyxDQUFDcUMsRUFBRSxDQUFDLEVBQUUsRUFBRUEsRUFBRSxDQUFDLEVBQUUsRUFBRTtJQUNsRDtBQXFNRjtBQUVBaEQsWUFBWTZCLEtBQUssR0FBRztJQUFDLFNBQVM7QUFBSSIsImZpbGUiOiIvcGFja2FnZXMvb3JkZXJlZC1kaWN0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gVGhpcyBmaWxlIGRlZmluZXMgYW4gb3JkZXJlZCBkaWN0aW9uYXJ5IGFic3RyYWN0aW9uIHRoYXQgaXMgdXNlZnVsIGZvclxuLy8gbWFpbnRhaW5pbmcgYSBkYXRhc2V0IGJhY2tlZCBieSBvYnNlcnZlQ2hhbmdlcy4gIEl0IHN1cHBvcnRzIG9yZGVyaW5nIGl0ZW1zXG4vLyBieSBzcGVjaWZ5aW5nIHRoZSBpdGVtIHRoZXkgbm93IGNvbWUgYmVmb3JlLlxuXG4vLyBUaGUgaW1wbGVtZW50YXRpb24gaXMgYSBkaWN0aW9uYXJ5IHRoYXQgY29udGFpbnMgbm9kZXMgb2YgYSBkb3VibHktbGlua2VkXG4vLyBsaXN0IGFzIGl0cyB2YWx1ZXMuXG5cbi8vIGNvbnN0cnVjdHMgYSBuZXcgZWxlbWVudCBzdHJ1Y3Rcbi8vIG5leHQgYW5kIHByZXYgYXJlIHdob2xlIGVsZW1lbnRzLCBub3Qga2V5cy5cbmZ1bmN0aW9uIGVsZW1lbnQoa2V5LCB2YWx1ZSwgbmV4dCwgcHJldikge1xuICByZXR1cm4ge1xuICAgIGtleToga2V5LFxuICAgIHZhbHVlOiB2YWx1ZSxcbiAgICBuZXh0OiBuZXh0LFxuICAgIHByZXY6IHByZXZcbiAgfTtcbn1cblxuZXhwb3J0IGNsYXNzIE9yZGVyZWREaWN0IHtcbiAgY29uc3RydWN0b3IoLi4uYXJncykge1xuICAgIHRoaXMuX2RpY3QgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIHRoaXMuX2ZpcnN0ID0gbnVsbDtcbiAgICB0aGlzLl9sYXN0ID0gbnVsbDtcbiAgICB0aGlzLl9zaXplID0gMDtcblxuICAgIGlmICh0eXBlb2YgYXJnc1swXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5fc3RyaW5naWZ5ID0gYXJncy5zaGlmdCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9zdHJpbmdpZnkgPSBmdW5jdGlvbiAoeCkgeyByZXR1cm4geDsgfTtcbiAgICB9XG5cbiAgICBhcmdzLmZvckVhY2goa3YgPT4gdGhpcy5wdXRCZWZvcmUoa3ZbMF0sIGt2WzFdLCBudWxsKSk7XG4gIH1cblxuICAvLyB0aGUgXCJwcmVmaXgga2V5cyB3aXRoIGEgc3BhY2VcIiB0aGluZyBjb21lcyBmcm9tIGhlcmVcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2RvY3VtZW50Y2xvdWQvdW5kZXJzY29yZS9pc3N1ZXMvMzc2I2lzc3VlY29tbWVudC0yODE1NjQ5XG4gIF9rKGtleSkge1xuICAgIHJldHVybiBcIiBcIiArIHRoaXMuX3N0cmluZ2lmeShrZXkpO1xuICB9XG5cbiAgZW1wdHkoKSB7XG4gICAgcmV0dXJuICF0aGlzLl9maXJzdDtcbiAgfVxuXG4gIHNpemUoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NpemU7XG4gIH1cblxuICBfbGlua0VsdEluKGVsdCkge1xuICAgIGlmICghZWx0Lm5leHQpIHtcbiAgICAgIGVsdC5wcmV2ID0gdGhpcy5fbGFzdDtcbiAgICAgIGlmICh0aGlzLl9sYXN0KVxuICAgICAgICB0aGlzLl9sYXN0Lm5leHQgPSBlbHQ7XG4gICAgICB0aGlzLl9sYXN0ID0gZWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICBlbHQucHJldiA9IGVsdC5uZXh0LnByZXY7XG4gICAgICBlbHQubmV4dC5wcmV2ID0gZWx0O1xuICAgICAgaWYgKGVsdC5wcmV2KVxuICAgICAgICBlbHQucHJldi5uZXh0ID0gZWx0O1xuICAgIH1cbiAgICBpZiAodGhpcy5fZmlyc3QgPT09IG51bGwgfHwgdGhpcy5fZmlyc3QgPT09IGVsdC5uZXh0KVxuICAgICAgdGhpcy5fZmlyc3QgPSBlbHQ7XG4gIH1cblxuICBfbGlua0VsdE91dChlbHQpIHtcbiAgICBpZiAoZWx0Lm5leHQpXG4gICAgICBlbHQubmV4dC5wcmV2ID0gZWx0LnByZXY7XG4gICAgaWYgKGVsdC5wcmV2KVxuICAgICAgZWx0LnByZXYubmV4dCA9IGVsdC5uZXh0O1xuICAgIGlmIChlbHQgPT09IHRoaXMuX2xhc3QpXG4gICAgICB0aGlzLl9sYXN0ID0gZWx0LnByZXY7XG4gICAgaWYgKGVsdCA9PT0gdGhpcy5fZmlyc3QpXG4gICAgICB0aGlzLl9maXJzdCA9IGVsdC5uZXh0O1xuICB9XG5cbiAgcHV0QmVmb3JlKGtleSwgaXRlbSwgYmVmb3JlKSB7XG4gICAgaWYgKHRoaXMuX2RpY3RbdGhpcy5fayhrZXkpXSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkl0ZW0gXCIgKyBrZXkgKyBcIiBhbHJlYWR5IHByZXNlbnQgaW4gT3JkZXJlZERpY3RcIik7XG4gICAgdmFyIGVsdCA9IGJlZm9yZSA/XG4gICAgICBlbGVtZW50KGtleSwgaXRlbSwgdGhpcy5fZGljdFt0aGlzLl9rKGJlZm9yZSldKSA6XG4gICAgICBlbGVtZW50KGtleSwgaXRlbSwgbnVsbCk7XG4gICAgaWYgKHR5cGVvZiBlbHQubmV4dCA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImNvdWxkIG5vdCBmaW5kIGl0ZW0gdG8gcHV0IHRoaXMgb25lIGJlZm9yZVwiKTtcbiAgICB0aGlzLl9saW5rRWx0SW4oZWx0KTtcbiAgICB0aGlzLl9kaWN0W3RoaXMuX2soa2V5KV0gPSBlbHQ7XG4gICAgdGhpcy5fc2l6ZSsrO1xuICB9XG5cbiAgYXBwZW5kKGtleSwgaXRlbSkge1xuICAgIHRoaXMucHV0QmVmb3JlKGtleSwgaXRlbSwgbnVsbCk7XG4gIH1cblxuICByZW1vdmUoa2V5KSB7XG4gICAgdmFyIGVsdCA9IHRoaXMuX2RpY3RbdGhpcy5fayhrZXkpXTtcbiAgICBpZiAodHlwZW9mIGVsdCA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkl0ZW0gXCIgKyBrZXkgKyBcIiBub3QgcHJlc2VudCBpbiBPcmRlcmVkRGljdFwiKTtcbiAgICB0aGlzLl9saW5rRWx0T3V0KGVsdCk7XG4gICAgdGhpcy5fc2l6ZS0tO1xuICAgIGRlbGV0ZSB0aGlzLl9kaWN0W3RoaXMuX2soa2V5KV07XG4gICAgcmV0dXJuIGVsdC52YWx1ZTtcbiAgfVxuXG4gIGdldChrZXkpIHtcbiAgICBpZiAodGhpcy5oYXMoa2V5KSkge1xuICAgICAgcmV0dXJuIHRoaXMuX2RpY3RbdGhpcy5fayhrZXkpXS52YWx1ZTtcbiAgICB9XG4gIH1cblxuICBoYXMoa2V5KSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChcbiAgICAgIHRoaXMuX2RpY3QsXG4gICAgICB0aGlzLl9rKGtleSlcbiAgICApO1xuICB9XG5cbiAgLy8gSXRlcmF0ZSB0aHJvdWdoIHRoZSBpdGVtcyBpbiB0aGlzIGRpY3Rpb25hcnkgaW4gb3JkZXIsIGNhbGxpbmdcbiAgLy8gaXRlcih2YWx1ZSwga2V5LCBpbmRleCkgb24gZWFjaCBvbmUuXG5cbiAgLy8gU3RvcHMgd2hlbmV2ZXIgaXRlciByZXR1cm5zIE9yZGVyZWREaWN0LkJSRUFLLCBvciBhZnRlciB0aGUgbGFzdCBlbGVtZW50LlxuICBmb3JFYWNoKGl0ZXIsIGNvbnRleHQgPSBudWxsKSB7XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciBlbHQgPSB0aGlzLl9maXJzdDtcbiAgICB3aGlsZSAoZWx0ICE9PSBudWxsKSB7XG4gICAgICB2YXIgYiA9IGl0ZXIuY2FsbChjb250ZXh0LCBlbHQudmFsdWUsIGVsdC5rZXksIGkpO1xuICAgICAgaWYgKGIgPT09IE9yZGVyZWREaWN0LkJSRUFLKSByZXR1cm47XG4gICAgICBlbHQgPSBlbHQubmV4dDtcbiAgICAgIGkrKztcbiAgICB9XG4gIH1cblxuICBhc3luYyBmb3JFYWNoQXN5bmMoYXN5bmNJdGVyLCBjb250ZXh0ID0gbnVsbCkge1xuICAgIGxldCBpID0gMDtcbiAgICBsZXQgZWx0ID0gdGhpcy5fZmlyc3Q7XG4gICAgd2hpbGUgKGVsdCAhPT0gbnVsbCkge1xuICAgICAgY29uc3QgYiA9IGF3YWl0IGFzeW5jSXRlci5jYWxsKGNvbnRleHQsIGVsdC52YWx1ZSwgZWx0LmtleSwgaSk7XG4gICAgICBpZiAoYiA9PT0gT3JkZXJlZERpY3QuQlJFQUspIHJldHVybjtcbiAgICAgIGVsdCA9IGVsdC5uZXh0O1xuICAgICAgaSsrO1xuICAgIH1cbiAgfVxuXG4gIGZpcnN0KCkge1xuICAgIGlmICh0aGlzLmVtcHR5KCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2ZpcnN0LmtleTtcbiAgfVxuXG4gIGZpcnN0VmFsdWUoKSB7XG4gICAgaWYgKHRoaXMuZW1wdHkoKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZmlyc3QudmFsdWU7XG4gIH1cblxuICBsYXN0KCkge1xuICAgIGlmICh0aGlzLmVtcHR5KCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2xhc3Qua2V5O1xuICB9XG5cbiAgbGFzdFZhbHVlKCkge1xuICAgIGlmICh0aGlzLmVtcHR5KCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2xhc3QudmFsdWU7XG4gIH1cblxuICBwcmV2KGtleSkge1xuICAgIGlmICh0aGlzLmhhcyhrZXkpKSB7XG4gICAgICB2YXIgZWx0ID0gdGhpcy5fZGljdFt0aGlzLl9rKGtleSldO1xuICAgICAgaWYgKGVsdC5wcmV2KVxuICAgICAgICByZXR1cm4gZWx0LnByZXYua2V5O1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIG5leHQoa2V5KSB7XG4gICAgaWYgKHRoaXMuaGFzKGtleSkpIHtcbiAgICAgIHZhciBlbHQgPSB0aGlzLl9kaWN0W3RoaXMuX2soa2V5KV07XG4gICAgICBpZiAoZWx0Lm5leHQpXG4gICAgICAgIHJldHVybiBlbHQubmV4dC5rZXk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgbW92ZUJlZm9yZShrZXksIGJlZm9yZSkge1xuICAgIHZhciBlbHQgPSB0aGlzLl9kaWN0W3RoaXMuX2soa2V5KV07XG4gICAgdmFyIGVsdEJlZm9yZSA9IGJlZm9yZSA/IHRoaXMuX2RpY3RbdGhpcy5fayhiZWZvcmUpXSA6IG51bGw7XG4gICAgaWYgKHR5cGVvZiBlbHQgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkl0ZW0gdG8gbW92ZSBpcyBub3QgcHJlc2VudFwiKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBlbHRCZWZvcmUgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBmaW5kIGVsZW1lbnQgdG8gbW92ZSB0aGlzIG9uZSBiZWZvcmVcIik7XG4gICAgfVxuICAgIGlmIChlbHRCZWZvcmUgPT09IGVsdC5uZXh0KSAvLyBubyBtb3ZpbmcgbmVjZXNzYXJ5XG4gICAgICByZXR1cm47XG4gICAgLy8gcmVtb3ZlIGZyb20gaXRzIG9sZCBwbGFjZVxuICAgIHRoaXMuX2xpbmtFbHRPdXQoZWx0KTtcbiAgICAvLyBwYXRjaCBpbnRvIGl0cyBuZXcgcGxhY2VcbiAgICBlbHQubmV4dCA9IGVsdEJlZm9yZTtcbiAgICB0aGlzLl9saW5rRWx0SW4oZWx0KTtcbiAgfVxuXG4gIC8vIExpbmVhciwgc2FkbHkuXG4gIGluZGV4T2Yoa2V5KSB7XG4gICAgdmFyIHJldCA9IG51bGw7XG4gICAgdGhpcy5mb3JFYWNoKCh2LCBrLCBpKSA9PiB7XG4gICAgICBpZiAodGhpcy5fayhrKSA9PT0gdGhpcy5fayhrZXkpKSB7XG4gICAgICAgIHJldCA9IGk7XG4gICAgICAgIHJldHVybiBPcmRlcmVkRGljdC5CUkVBSztcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9KTtcbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgX2NoZWNrUmVwKCkge1xuICAgIE9iamVjdC5rZXlzKHRoaXMuX2RpY3QpLmZvckVhY2goayA9PiB7XG4gICAgICBjb25zdCB2ID0gdGhpcy5fZGljdFtrXTtcbiAgICAgIGlmICh2Lm5leHQgPT09IHYpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTmV4dCBpcyBhIGxvb3BcIik7XG4gICAgICB9XG4gICAgICBpZiAodi5wcmV2ID09PSB2KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlByZXYgaXMgYSBsb29wXCIpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbk9yZGVyZWREaWN0LkJSRUFLID0ge1wiYnJlYWtcIjogdHJ1ZX07XG4iXX0=
