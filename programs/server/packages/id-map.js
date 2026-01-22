Package["core-runtime"].queue("id-map",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var ECMAScript = Package.ecmascript.ECMAScript;
var EJSON = Package.ejson.EJSON;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var IdMap;

var require = meteorInstall({"node_modules":{"meteor":{"id-map":{"id-map.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                         //
// packages/id-map/id-map.js                                                               //
//                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////
                                                                                           //
module.export({IdMap:()=>IdMap});let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);
class IdMap {
    // Some of these methods are designed to match methods on OrderedDict, since
    // (eg) ObserveMultiplex and _CachingChangeObserver use them interchangeably.
    // (Conceivably, this should be replaced with "UnorderedDict" with a specific
    // set of methods that overlap between the two.)
    get(id) {
        const key = this._idStringify(id);
        return this._map.get(key);
    }
    set(id, value) {
        const key = this._idStringify(id);
        this._map.set(key, value);
    }
    remove(id) {
        const key = this._idStringify(id);
        this._map.delete(key);
    }
    has(id) {
        const key = this._idStringify(id);
        return this._map.has(key);
    }
    empty() {
        return this._map.size === 0;
    }
    clear() {
        this._map.clear();
    }
    // Iterates over the items in the map. Return `false` to break the loop.
    forEach(iterator) {
        // don't use _.each, because we can't break out of it.
        for (let [key, value] of this._map){
            const breakIfFalse = iterator.call(null, value, this._idParse(key));
            if (breakIfFalse === false) {
                return;
            }
        }
    }
    forEachAsync(iterator) {
        return _async_to_generator(function*() {
            for (let [key, value] of this._map){
                const breakIfFalse = yield iterator.call(null, value, this._idParse(key));
                if (breakIfFalse === false) {
                    return;
                }
            }
        }).call(this);
    }
    size() {
        return this._map.size;
    }
    setDefault(id, def) {
        const key = this._idStringify(id);
        if (this._map.has(key)) {
            return this._map.get(key);
        }
        this._map.set(key, def);
        return def;
    }
    // Assumes that values are EJSON-cloneable, and that we don't need to clone
    // IDs (ie, that nobody is going to mutate an ObjectId).
    clone() {
        const clone = new IdMap(this._idStringify, this._idParse);
        // copy directly to avoid stringify/parse overhead
        this._map.forEach(function(value, key) {
            clone._map.set(key, EJSON.clone(value));
        });
        return clone;
    }
    constructor(idStringify, idParse){
        this._map = new Map();
        this._idStringify = idStringify || JSON.stringify;
        this._idParse = idParse || JSON.parse;
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});


/* Exports */
return {
  export: function () { return {
      IdMap: IdMap
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/id-map/id-map.js"
  ],
  mainModulePath: "/node_modules/meteor/id-map/id-map.js"
}});

//# sourceURL=meteor://💻app/packages/id-map.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvaWQtbWFwL2lkLW1hcC5qcyJdLCJuYW1lcyI6WyJJZE1hcCIsImdldCIsImlkIiwia2V5IiwiX2lkU3RyaW5naWZ5IiwiX21hcCIsInNldCIsInZhbHVlIiwicmVtb3ZlIiwiZGVsZXRlIiwiaGFzIiwiZW1wdHkiLCJzaXplIiwiY2xlYXIiLCJmb3JFYWNoIiwiaXRlcmF0b3IiLCJicmVha0lmRmFsc2UiLCJjYWxsIiwiX2lkUGFyc2UiLCJmb3JFYWNoQXN5bmMiLCJzZXREZWZhdWx0IiwiZGVmIiwiY2xvbmUiLCJFSlNPTiIsImlkU3RyaW5naWZ5IiwiaWRQYXJzZSIsIk1hcCIsIkpTT04iLCJzdHJpbmdpZnkiLCJwYXJzZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLE9BQU8sTUFBTUE7SUFPYiw0RUFBNEU7SUFDNUUsNkVBQTZFO0lBQzdFLDZFQUE2RTtJQUM3RSxnREFBZ0Q7SUFFOUNDLElBQUlDLEVBQUUsRUFBRTtRQUNOLE1BQU1DLE1BQU0sSUFBSSxDQUFDQyxZQUFZLENBQUNGO1FBQzlCLE9BQU8sSUFBSSxDQUFDRyxJQUFJLENBQUNKLEdBQUcsQ0FBQ0U7SUFDdkI7SUFFQUcsSUFBSUosRUFBRSxFQUFFSyxLQUFLLEVBQUU7UUFDYixNQUFNSixNQUFNLElBQUksQ0FBQ0MsWUFBWSxDQUFDRjtRQUM5QixJQUFJLENBQUNHLElBQUksQ0FBQ0MsR0FBRyxDQUFDSCxLQUFLSTtJQUNyQjtJQUVBQyxPQUFPTixFQUFFLEVBQUU7UUFDVCxNQUFNQyxNQUFNLElBQUksQ0FBQ0MsWUFBWSxDQUFDRjtRQUM5QixJQUFJLENBQUNHLElBQUksQ0FBQ0ksTUFBTSxDQUFDTjtJQUNuQjtJQUVBTyxJQUFJUixFQUFFLEVBQUU7UUFDTixNQUFNQyxNQUFNLElBQUksQ0FBQ0MsWUFBWSxDQUFDRjtRQUM5QixPQUFPLElBQUksQ0FBQ0csSUFBSSxDQUFDSyxHQUFHLENBQUNQO0lBQ3ZCO0lBRUFRLFFBQVE7UUFDTixPQUFPLElBQUksQ0FBQ04sSUFBSSxDQUFDTyxJQUFJLEtBQUs7SUFDNUI7SUFFQUMsUUFBUTtRQUNOLElBQUksQ0FBQ1IsSUFBSSxDQUFDUSxLQUFLO0lBQ2pCO0lBRUEsd0VBQXdFO0lBQ3hFQyxRQUFRQyxRQUFRLEVBQUU7UUFDaEIsc0RBQXNEO1FBQ3RELEtBQUssSUFBSSxDQUFDWixLQUFLSSxNQUFNLElBQUksSUFBSSxDQUFDRixJQUFJLENBQUM7WUFDakMsTUFBTVcsZUFBZUQsU0FBU0UsSUFBSSxDQUNoQyxNQUNBVixPQUNBLElBQUksQ0FBQ1csUUFBUSxDQUFDZjtZQUVoQixJQUFJYSxpQkFBaUIsT0FBTztnQkFDMUI7WUFDRjtRQUNGO0lBQ0Y7SUFFTUcsYUFBYUosUUFBUTs7WUFDekIsS0FBSyxJQUFJLENBQUNaLEtBQUtJLE1BQU0sSUFBSSxJQUFJLENBQUNGLElBQUksQ0FBQztnQkFDakMsTUFBTVcsZUFBZSxNQUFNRCxTQUFTRSxJQUFJLENBQ3BDLE1BQ0FWLE9BQ0EsSUFBSSxDQUFDVyxRQUFRLENBQUNmO2dCQUVsQixJQUFJYSxpQkFBaUIsT0FBTztvQkFDMUI7Z0JBQ0Y7WUFDRjtRQUNGOztJQUVBSixPQUFPO1FBQ0wsT0FBTyxJQUFJLENBQUNQLElBQUksQ0FBQ08sSUFBSTtJQUN2QjtJQUVBUSxXQUFXbEIsRUFBRSxFQUFFbUIsR0FBRyxFQUFFO1FBQ2xCLE1BQU1sQixNQUFNLElBQUksQ0FBQ0MsWUFBWSxDQUFDRjtRQUM5QixJQUFJLElBQUksQ0FBQ0csSUFBSSxDQUFDSyxHQUFHLENBQUNQLE1BQU07WUFDdEIsT0FBTyxJQUFJLENBQUNFLElBQUksQ0FBQ0osR0FBRyxDQUFDRTtRQUN2QjtRQUNBLElBQUksQ0FBQ0UsSUFBSSxDQUFDQyxHQUFHLENBQUNILEtBQUtrQjtRQUNuQixPQUFPQTtJQUNUO0lBRUEsMkVBQTJFO0lBQzNFLHdEQUF3RDtJQUN4REMsUUFBUTtRQUNOLE1BQU1BLFFBQVEsSUFBSXRCLE1BQU0sSUFBSSxDQUFDSSxZQUFZLEVBQUUsSUFBSSxDQUFDYyxRQUFRO1FBQ3hELGtEQUFrRDtRQUNsRCxJQUFJLENBQUNiLElBQUksQ0FBQ1MsT0FBTyxDQUFDLFNBQVNQLEtBQUssRUFBRUosR0FBRztZQUNuQ21CLE1BQU1qQixJQUFJLENBQUNDLEdBQUcsQ0FBQ0gsS0FBS29CLE1BQU1ELEtBQUssQ0FBQ2Y7UUFDbEM7UUFDQSxPQUFPZTtJQUNUO0lBekZBLFlBQVlFLFdBQVcsRUFBRUMsT0FBTyxDQUFFO1FBQ2hDLElBQUksQ0FBQ3BCLElBQUksR0FBRyxJQUFJcUI7UUFDaEIsSUFBSSxDQUFDdEIsWUFBWSxHQUFHb0IsZUFBZUcsS0FBS0MsU0FBUztRQUNqRCxJQUFJLENBQUNWLFFBQVEsR0FBR08sV0FBV0UsS0FBS0UsS0FBSztJQUN2QztBQXNGRiIsImZpbGUiOiIvcGFja2FnZXMvaWQtbWFwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5leHBvcnQgY2xhc3MgSWRNYXAge1xuICBjb25zdHJ1Y3RvcihpZFN0cmluZ2lmeSwgaWRQYXJzZSkge1xuICAgIHRoaXMuX21hcCA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9pZFN0cmluZ2lmeSA9IGlkU3RyaW5naWZ5IHx8IEpTT04uc3RyaW5naWZ5O1xuICAgIHRoaXMuX2lkUGFyc2UgPSBpZFBhcnNlIHx8IEpTT04ucGFyc2U7XG4gIH1cblxuLy8gU29tZSBvZiB0aGVzZSBtZXRob2RzIGFyZSBkZXNpZ25lZCB0byBtYXRjaCBtZXRob2RzIG9uIE9yZGVyZWREaWN0LCBzaW5jZVxuLy8gKGVnKSBPYnNlcnZlTXVsdGlwbGV4IGFuZCBfQ2FjaGluZ0NoYW5nZU9ic2VydmVyIHVzZSB0aGVtIGludGVyY2hhbmdlYWJseS5cbi8vIChDb25jZWl2YWJseSwgdGhpcyBzaG91bGQgYmUgcmVwbGFjZWQgd2l0aCBcIlVub3JkZXJlZERpY3RcIiB3aXRoIGEgc3BlY2lmaWNcbi8vIHNldCBvZiBtZXRob2RzIHRoYXQgb3ZlcmxhcCBiZXR3ZWVuIHRoZSB0d28uKVxuXG4gIGdldChpZCkge1xuICAgIGNvbnN0IGtleSA9IHRoaXMuX2lkU3RyaW5naWZ5KGlkKTtcbiAgICByZXR1cm4gdGhpcy5fbWFwLmdldChrZXkpO1xuICB9XG5cbiAgc2V0KGlkLCB2YWx1ZSkge1xuICAgIGNvbnN0IGtleSA9IHRoaXMuX2lkU3RyaW5naWZ5KGlkKTtcbiAgICB0aGlzLl9tYXAuc2V0KGtleSwgdmFsdWUpO1xuICB9XG5cbiAgcmVtb3ZlKGlkKSB7XG4gICAgY29uc3Qga2V5ID0gdGhpcy5faWRTdHJpbmdpZnkoaWQpO1xuICAgIHRoaXMuX21hcC5kZWxldGUoa2V5KTtcbiAgfVxuXG4gIGhhcyhpZCkge1xuICAgIGNvbnN0IGtleSA9IHRoaXMuX2lkU3RyaW5naWZ5KGlkKTtcbiAgICByZXR1cm4gdGhpcy5fbWFwLmhhcyhrZXkpO1xuICB9XG5cbiAgZW1wdHkoKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hcC5zaXplID09PSAwO1xuICB9XG5cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy5fbWFwLmNsZWFyKCk7XG4gIH1cblxuICAvLyBJdGVyYXRlcyBvdmVyIHRoZSBpdGVtcyBpbiB0aGUgbWFwLiBSZXR1cm4gYGZhbHNlYCB0byBicmVhayB0aGUgbG9vcC5cbiAgZm9yRWFjaChpdGVyYXRvcikge1xuICAgIC8vIGRvbid0IHVzZSBfLmVhY2gsIGJlY2F1c2Ugd2UgY2FuJ3QgYnJlYWsgb3V0IG9mIGl0LlxuICAgIGZvciAobGV0IFtrZXksIHZhbHVlXSBvZiB0aGlzLl9tYXApe1xuICAgICAgY29uc3QgYnJlYWtJZkZhbHNlID0gaXRlcmF0b3IuY2FsbChcbiAgICAgICAgbnVsbCxcbiAgICAgICAgdmFsdWUsXG4gICAgICAgIHRoaXMuX2lkUGFyc2Uoa2V5KVxuICAgICAgKTtcbiAgICAgIGlmIChicmVha0lmRmFsc2UgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhc3luYyBmb3JFYWNoQXN5bmMoaXRlcmF0b3IpIHtcbiAgICBmb3IgKGxldCBba2V5LCB2YWx1ZV0gb2YgdGhpcy5fbWFwKXtcbiAgICAgIGNvbnN0IGJyZWFrSWZGYWxzZSA9IGF3YWl0IGl0ZXJhdG9yLmNhbGwoXG4gICAgICAgICAgbnVsbCxcbiAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICB0aGlzLl9pZFBhcnNlKGtleSlcbiAgICAgICk7XG4gICAgICBpZiAoYnJlYWtJZkZhbHNlID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFwLnNpemU7XG4gIH1cblxuICBzZXREZWZhdWx0KGlkLCBkZWYpIHtcbiAgICBjb25zdCBrZXkgPSB0aGlzLl9pZFN0cmluZ2lmeShpZCk7XG4gICAgaWYgKHRoaXMuX21hcC5oYXMoa2V5KSkge1xuICAgICAgcmV0dXJuIHRoaXMuX21hcC5nZXQoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5fbWFwLnNldChrZXksIGRlZik7XG4gICAgcmV0dXJuIGRlZjtcbiAgfVxuXG4gIC8vIEFzc3VtZXMgdGhhdCB2YWx1ZXMgYXJlIEVKU09OLWNsb25lYWJsZSwgYW5kIHRoYXQgd2UgZG9uJ3QgbmVlZCB0byBjbG9uZVxuICAvLyBJRHMgKGllLCB0aGF0IG5vYm9keSBpcyBnb2luZyB0byBtdXRhdGUgYW4gT2JqZWN0SWQpLlxuICBjbG9uZSgpIHtcbiAgICBjb25zdCBjbG9uZSA9IG5ldyBJZE1hcCh0aGlzLl9pZFN0cmluZ2lmeSwgdGhpcy5faWRQYXJzZSk7XG4gICAgLy8gY29weSBkaXJlY3RseSB0byBhdm9pZCBzdHJpbmdpZnkvcGFyc2Ugb3ZlcmhlYWRcbiAgICB0aGlzLl9tYXAuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwga2V5KXtcbiAgICAgIGNsb25lLl9tYXAuc2V0KGtleSwgRUpTT04uY2xvbmUodmFsdWUpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gY2xvbmU7XG4gIH1cbn1cbiJdfQ==
