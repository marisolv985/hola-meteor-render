Package["core-runtime"].queue("retry",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var ECMAScript = Package.ecmascript.ECMAScript;
var Random = Package.random.Random;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Retry;

var require = meteorInstall({"node_modules":{"meteor":{"retry":{"retry.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/retry/retry.js                                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({Retry:()=>Retry});// Retry logic with an exponential backoff.
//
// options:
//  baseTimeout: time for initial reconnect attempt (ms).
//  exponent: exponential factor to increase timeout each attempt.
//  maxTimeout: maximum time between retries (ms).
//  minCount: how many times to reconnect "instantly".
//  minTimeout: time to wait for the first `minCount` retries (ms).
//  fuzz: factor to randomize retry times by (to avoid retry storms).
class Retry {
    // Reset a pending retry, if any.
    clear() {
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
        }
        this.retryTimer = null;
    }
    // Calculate how long to wait in milliseconds to retry, based on the
    // `count` of which retry this is.
    _timeout(count) {
        if (count < this.minCount) {
            return this.minTimeout;
        }
        // fuzz the timeout randomly, to avoid reconnect storms when a
        // server goes down.
        var timeout = Math.min(this.maxTimeout, this.baseTimeout * Math.pow(this.exponent, count)) * (Random.fraction() * this.fuzz + (1 - this.fuzz / 2));
        return timeout;
    }
    // Call `fn` after a delay, based on the `count` of which retry this is.
    retryLater(count, fn) {
        var timeout = this._timeout(count);
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.retryTimer = Meteor.setTimeout(fn, timeout);
        return timeout;
    }
    constructor({ baseTimeout = 1000, exponent = 2.2, // The default is high-ish to ensure a server can recover from a
    // failure caused by load.
    maxTimeout = 5 * 60 * 1000, minTimeout = 10, minCount = 2, fuzz = 0.5 } = {}){
        this.baseTimeout = baseTimeout;
        this.exponent = exponent;
        this.maxTimeout = maxTimeout;
        this.minTimeout = minTimeout;
        this.minCount = minCount;
        this.fuzz = fuzz;
        this.retryTimer = null;
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});


/* Exports */
return {
  export: function () { return {
      Retry: Retry
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/retry/retry.js"
  ],
  mainModulePath: "/node_modules/meteor/retry/retry.js"
}});

//# sourceURL=meteor://💻app/packages/retry.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcmV0cnkvcmV0cnkuanMiXSwibmFtZXMiOlsiUmV0cnkiLCJjbGVhciIsInJldHJ5VGltZXIiLCJjbGVhclRpbWVvdXQiLCJfdGltZW91dCIsImNvdW50IiwibWluQ291bnQiLCJtaW5UaW1lb3V0IiwidGltZW91dCIsIk1hdGgiLCJtaW4iLCJtYXhUaW1lb3V0IiwiYmFzZVRpbWVvdXQiLCJwb3ciLCJleHBvbmVudCIsIlJhbmRvbSIsImZyYWN0aW9uIiwiZnV6eiIsInJldHJ5TGF0ZXIiLCJmbiIsIk1ldGVvciIsInNldFRpbWVvdXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUEyQztBQUMzQyxFQUFFO0FBQ0YsV0FBVztBQUNYLHlEQUF5RDtBQUN6RCxrRUFBa0U7QUFDbEUsa0RBQWtEO0FBQ2xELHNEQUFzRDtBQUN0RCxtRUFBbUU7QUFDbkUscUVBQXFFO0FBRXJFLE9BQU8sTUFBTUE7SUFvQlgsaUNBQWlDO0lBQ2pDQyxRQUFRO1FBQ04sSUFBSSxJQUFJLENBQUNDLFVBQVUsRUFBRTtZQUNuQkMsYUFBYSxJQUFJLENBQUNELFVBQVU7UUFDOUI7UUFDQSxJQUFJLENBQUNBLFVBQVUsR0FBRztJQUNwQjtJQUVBLG9FQUFvRTtJQUNwRSxrQ0FBa0M7SUFDbENFLFNBQVNDLEtBQUssRUFBRTtRQUNkLElBQUlBLFFBQVEsSUFBSSxDQUFDQyxRQUFRLEVBQUU7WUFDekIsT0FBTyxJQUFJLENBQUNDLFVBQVU7UUFDeEI7UUFFQSw4REFBOEQ7UUFDOUQsb0JBQW9CO1FBQ3BCLElBQUlDLFVBQVVDLEtBQUtDLEdBQUcsQ0FDcEIsSUFBSSxDQUFDQyxVQUFVLEVBQ2YsSUFBSSxDQUFDQyxXQUFXLEdBQUdILEtBQUtJLEdBQUcsQ0FBQyxJQUFJLENBQUNDLFFBQVEsRUFBRVQsVUFFM0NVLFFBQU9DLFFBQVEsS0FBSyxJQUFJLENBQUNDLElBQUksR0FBSSxLQUFJLElBQUksQ0FBQ0EsSUFBSSxHQUFHLEVBQUM7UUFHcEQsT0FBT1Q7SUFDVDtJQUVBLHdFQUF3RTtJQUN4RVUsV0FBV2IsS0FBSyxFQUFFYyxFQUFFLEVBQUU7UUFDcEIsSUFBSVgsVUFBVSxJQUFJLENBQUNKLFFBQVEsQ0FBQ0M7UUFDNUIsSUFBSSxJQUFJLENBQUNILFVBQVUsRUFDakJDLGFBQWEsSUFBSSxDQUFDRCxVQUFVO1FBQzlCLElBQUksQ0FBQ0EsVUFBVSxHQUFHa0IsT0FBT0MsVUFBVSxDQUFDRixJQUFJWDtRQUN4QyxPQUFPQTtJQUNUO0lBckRBLFlBQVksRUFDVkksY0FBYyxJQUFJLEVBQ2xCRSxXQUFXLEdBQUcsRUFDZCxnRUFBZ0U7SUFDaEUsMEJBQTBCO0lBQzFCSCxhQUFhLElBQUksS0FBSyxJQUFJLEVBQzFCSixhQUFhLEVBQUUsRUFDZkQsV0FBVyxDQUFDLEVBQ1pXLE9BQU8sR0FBRyxFQUNYLEdBQUcsQ0FBQyxDQUFDLENBQUU7UUFDTixJQUFJLENBQUNMLFdBQVcsR0FBR0E7UUFDbkIsSUFBSSxDQUFDRSxRQUFRLEdBQUdBO1FBQ2hCLElBQUksQ0FBQ0gsVUFBVSxHQUFHQTtRQUNsQixJQUFJLENBQUNKLFVBQVUsR0FBR0E7UUFDbEIsSUFBSSxDQUFDRCxRQUFRLEdBQUdBO1FBQ2hCLElBQUksQ0FBQ1csSUFBSSxHQUFHQTtRQUNaLElBQUksQ0FBQ2YsVUFBVSxHQUFHO0lBQ3BCO0FBcUNGIiwiZmlsZSI6Ii9wYWNrYWdlcy9yZXRyeS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFJldHJ5IGxvZ2ljIHdpdGggYW4gZXhwb25lbnRpYWwgYmFja29mZi5cbi8vXG4vLyBvcHRpb25zOlxuLy8gIGJhc2VUaW1lb3V0OiB0aW1lIGZvciBpbml0aWFsIHJlY29ubmVjdCBhdHRlbXB0IChtcykuXG4vLyAgZXhwb25lbnQ6IGV4cG9uZW50aWFsIGZhY3RvciB0byBpbmNyZWFzZSB0aW1lb3V0IGVhY2ggYXR0ZW1wdC5cbi8vICBtYXhUaW1lb3V0OiBtYXhpbXVtIHRpbWUgYmV0d2VlbiByZXRyaWVzIChtcykuXG4vLyAgbWluQ291bnQ6IGhvdyBtYW55IHRpbWVzIHRvIHJlY29ubmVjdCBcImluc3RhbnRseVwiLlxuLy8gIG1pblRpbWVvdXQ6IHRpbWUgdG8gd2FpdCBmb3IgdGhlIGZpcnN0IGBtaW5Db3VudGAgcmV0cmllcyAobXMpLlxuLy8gIGZ1eno6IGZhY3RvciB0byByYW5kb21pemUgcmV0cnkgdGltZXMgYnkgKHRvIGF2b2lkIHJldHJ5IHN0b3JtcykuXG5cbmV4cG9ydCBjbGFzcyBSZXRyeSB7XG4gIGNvbnN0cnVjdG9yKHtcbiAgICBiYXNlVGltZW91dCA9IDEwMDAsXG4gICAgZXhwb25lbnQgPSAyLjIsXG4gICAgLy8gVGhlIGRlZmF1bHQgaXMgaGlnaC1pc2ggdG8gZW5zdXJlIGEgc2VydmVyIGNhbiByZWNvdmVyIGZyb20gYVxuICAgIC8vIGZhaWx1cmUgY2F1c2VkIGJ5IGxvYWQuXG4gICAgbWF4VGltZW91dCA9IDUgKiA2MCAqIDEwMDAsXG4gICAgbWluVGltZW91dCA9IDEwLFxuICAgIG1pbkNvdW50ID0gMixcbiAgICBmdXp6ID0gMC41LFxuICB9ID0ge30pIHtcbiAgICB0aGlzLmJhc2VUaW1lb3V0ID0gYmFzZVRpbWVvdXQ7XG4gICAgdGhpcy5leHBvbmVudCA9IGV4cG9uZW50O1xuICAgIHRoaXMubWF4VGltZW91dCA9IG1heFRpbWVvdXQ7XG4gICAgdGhpcy5taW5UaW1lb3V0ID0gbWluVGltZW91dDtcbiAgICB0aGlzLm1pbkNvdW50ID0gbWluQ291bnQ7XG4gICAgdGhpcy5mdXp6ID0gZnV6ejtcbiAgICB0aGlzLnJldHJ5VGltZXIgPSBudWxsO1xuICB9XG5cbiAgLy8gUmVzZXQgYSBwZW5kaW5nIHJldHJ5LCBpZiBhbnkuXG4gIGNsZWFyKCkge1xuICAgIGlmICh0aGlzLnJldHJ5VGltZXIpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLnJldHJ5VGltZXIpO1xuICAgIH1cbiAgICB0aGlzLnJldHJ5VGltZXIgPSBudWxsO1xuICB9XG5cbiAgLy8gQ2FsY3VsYXRlIGhvdyBsb25nIHRvIHdhaXQgaW4gbWlsbGlzZWNvbmRzIHRvIHJldHJ5LCBiYXNlZCBvbiB0aGVcbiAgLy8gYGNvdW50YCBvZiB3aGljaCByZXRyeSB0aGlzIGlzLlxuICBfdGltZW91dChjb3VudCkge1xuICAgIGlmIChjb3VudCA8IHRoaXMubWluQ291bnQpIHtcbiAgICAgIHJldHVybiB0aGlzLm1pblRpbWVvdXQ7XG4gICAgfVxuXG4gICAgLy8gZnV6eiB0aGUgdGltZW91dCByYW5kb21seSwgdG8gYXZvaWQgcmVjb25uZWN0IHN0b3JtcyB3aGVuIGFcbiAgICAvLyBzZXJ2ZXIgZ29lcyBkb3duLlxuICAgIHZhciB0aW1lb3V0ID0gTWF0aC5taW4oXG4gICAgICB0aGlzLm1heFRpbWVvdXQsXG4gICAgICB0aGlzLmJhc2VUaW1lb3V0ICogTWF0aC5wb3codGhpcy5leHBvbmVudCwgY291bnQpXG4gICAgKSAqIChcbiAgICAgIFJhbmRvbS5mcmFjdGlvbigpICogdGhpcy5mdXp6ICsgKDEgLSB0aGlzLmZ1enogLyAyKVxuICAgICk7XG5cbiAgICByZXR1cm4gdGltZW91dDtcbiAgfVxuXG4gIC8vIENhbGwgYGZuYCBhZnRlciBhIGRlbGF5LCBiYXNlZCBvbiB0aGUgYGNvdW50YCBvZiB3aGljaCByZXRyeSB0aGlzIGlzLlxuICByZXRyeUxhdGVyKGNvdW50LCBmbikge1xuICAgIHZhciB0aW1lb3V0ID0gdGhpcy5fdGltZW91dChjb3VudCk7XG4gICAgaWYgKHRoaXMucmV0cnlUaW1lcilcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLnJldHJ5VGltZXIpO1xuICAgIHRoaXMucmV0cnlUaW1lciA9IE1ldGVvci5zZXRUaW1lb3V0KGZuLCB0aW1lb3V0KTtcbiAgICByZXR1cm4gdGltZW91dDtcbiAgfVxufVxuIl19
