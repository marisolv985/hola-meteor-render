Package["core-runtime"].queue("callback-hook",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Hook;

var require = meteorInstall({"node_modules":{"meteor":{"callback-hook":{"hook.js":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////
//                                                                                      //
// packages/callback-hook/hook.js                                                       //
//                                                                                      //
//////////////////////////////////////////////////////////////////////////////////////////
                                                                                        //
module.export({Hook:()=>Hook});let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);// XXX This pattern is under development. Do not add more callsites
// using this package for now. See:
// https://meteor.hackpad.com/Design-proposal-Hooks-YxvgEW06q6f
//
// Encapsulates the pattern of registering callbacks on a hook.
//
// The `each` method of the hook calls its iterator function argument
// with each registered callback.  This allows the hook to
// conditionally decide not to call the callback (if, for example, the
// observed object has been closed or terminated).
//
// By default, callbacks are bound with `Meteor.bindEnvironment`, so they will be
// called with the Meteor environment of the calling code that
// registered the callback. Override by passing { bindEnvironment: false }
// to the constructor.
//
// Registering a callback returns an object with a single `stop`
// method which unregisters the callback.
//
// The code is careful to allow a callback to be safely unregistered
// while the callbacks are being iterated over.
//
// If the hook is configured with the `exceptionHandler` option, the
// handler will be called if a called callback throws an exception.
// By default (if the exception handler doesn't itself throw an
// exception, or if the iterator function doesn't return a falsy value
// to terminate the calling of callbacks), the remaining callbacks
// will still be called.
//
// Alternatively, the `debugPrintExceptions` option can be specified
// as string describing the callback.  On an exception the string and
// the exception will be printed to the console log with
// `Meteor._debug`, and the exception otherwise ignored.
//
// If an exception handler isn't specified, exceptions thrown in the
// callback will propagate up to the iterator function, and will
// terminate calling the remaining callbacks if not caught.

const hasOwn = Object.prototype.hasOwnProperty;
class Hook {
    register(callback) {
        const exceptionHandler = this.exceptionHandler || function(exception) {
            // Note: this relies on the undocumented fact that if bindEnvironment's
            // onException throws, and you are invoking the callback either in the
            // browser or from within a Fiber in Node, the exception is propagated.
            throw exception;
        };
        if (this.bindEnvironment) {
            callback = Meteor.bindEnvironment(callback, exceptionHandler);
        } else {
            callback = dontBindEnvironment(callback, exceptionHandler);
        }
        if (this.wrapAsync) {
            callback = Meteor.wrapFn(callback);
        }
        const id = this.nextCallbackId++;
        this.callbacks[id] = callback;
        return {
            callback,
            stop: ()=>{
                delete this.callbacks[id];
            }
        };
    }
    clear() {
        this.nextCallbackId = 0;
        this.callbacks = [];
    }
    /**
   * For each registered callback, call the passed iterator function with the callback.
   *
   * The iterator function can choose whether or not to call the
   * callback.  (For example, it might not call the callback if the
   * observed object has been closed or terminated).
   * The iteration is stopped if the iterator function returns a falsy
   * value or throws an exception.
   *
   * @param iterator
   */ forEach(iterator) {
        const ids = Object.keys(this.callbacks);
        for(let i = 0; i < ids.length; ++i){
            const id = ids[i];
            // check to see if the callback was removed during iteration
            if (hasOwn.call(this.callbacks, id)) {
                const callback = this.callbacks[id];
                if (!iterator(callback)) {
                    break;
                }
            }
        }
    }
    /**
   * For each registered callback, call the passed iterator function with the callback.
   *
   * it is a counterpart of forEach, but it is async and returns a promise
   * @param iterator
   * @return {Promise<void>}
   * @see forEach
   */ forEachAsync(iterator) {
        return _async_to_generator(function*() {
            const ids = Object.keys(this.callbacks);
            for(let i = 0; i < ids.length; ++i){
                const id = ids[i];
                // check to see if the callback was removed during iteration
                if (hasOwn.call(this.callbacks, id)) {
                    const callback = this.callbacks[id];
                    if (!(yield iterator(callback))) {
                        break;
                    }
                }
            }
        }).call(this);
    }
    /**
   * @deprecated use forEach
   * @param iterator
   */ each(iterator) {
        return this.forEach(iterator);
    }
    constructor(options){
        options = options || {};
        this.nextCallbackId = 0;
        this.callbacks = Object.create(null);
        // Whether to wrap callbacks with Meteor.bindEnvironment
        this.bindEnvironment = true;
        if (options.bindEnvironment === false) {
            this.bindEnvironment = false;
        }
        this.wrapAsync = true;
        if (options.wrapAsync === false) {
            this.wrapAsync = false;
        }
        if (options.exceptionHandler) {
            this.exceptionHandler = options.exceptionHandler;
        } else if (options.debugPrintExceptions) {
            if (typeof options.debugPrintExceptions !== "string") {
                throw new Error("Hook option debugPrintExceptions should be a string");
            }
            this.exceptionHandler = options.debugPrintExceptions;
        }
    }
}
// Copied from Meteor.bindEnvironment and removed all the env stuff.
function dontBindEnvironment(func, onException, _this) {
    if (!onException || typeof onException === 'string') {
        const description = onException || "callback of async function";
        onException = function(error) {
            Meteor._debug("Exception in " + description, error);
        };
    }
    return function(...args) {
        let ret;
        try {
            ret = func.apply(_this, args);
        } catch (e) {
            onException(e);
        }
        return ret;
    };
}

//////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});


/* Exports */
return {
  export: function () { return {
      Hook: Hook
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/callback-hook/hook.js"
  ],
  mainModulePath: "/node_modules/meteor/callback-hook/hook.js"
}});

//# sourceURL=meteor://💻app/packages/callback-hook.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvY2FsbGJhY2staG9vay9ob29rLmpzIl0sIm5hbWVzIjpbImhhc093biIsIk9iamVjdCIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiSG9vayIsInJlZ2lzdGVyIiwiY2FsbGJhY2siLCJleGNlcHRpb25IYW5kbGVyIiwiZXhjZXB0aW9uIiwiYmluZEVudmlyb25tZW50IiwiTWV0ZW9yIiwiZG9udEJpbmRFbnZpcm9ubWVudCIsIndyYXBBc3luYyIsIndyYXBGbiIsImlkIiwibmV4dENhbGxiYWNrSWQiLCJjYWxsYmFja3MiLCJzdG9wIiwiY2xlYXIiLCJmb3JFYWNoIiwiaXRlcmF0b3IiLCJpZHMiLCJrZXlzIiwiaSIsImxlbmd0aCIsImNhbGwiLCJmb3JFYWNoQXN5bmMiLCJlYWNoIiwib3B0aW9ucyIsImNyZWF0ZSIsImRlYnVnUHJpbnRFeGNlcHRpb25zIiwiRXJyb3IiLCJmdW5jIiwib25FeGNlcHRpb24iLCJfdGhpcyIsImRlc2NyaXB0aW9uIiwiZXJyb3IiLCJfZGVidWciLCJhcmdzIiwicmV0IiwiYXBwbHkiLCJlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG1FQUFtRTtBQUNuRSxtQ0FBbUM7QUFDbkMsK0RBQStEO0FBQy9ELEVBQUU7QUFDRiwrREFBK0Q7QUFDL0QsRUFBRTtBQUNGLHFFQUFxRTtBQUNyRSwwREFBMEQ7QUFDMUQsc0VBQXNFO0FBQ3RFLGtEQUFrRDtBQUNsRCxFQUFFO0FBQ0YsaUZBQWlGO0FBQ2pGLDhEQUE4RDtBQUM5RCwwRUFBMEU7QUFDMUUsc0JBQXNCO0FBQ3RCLEVBQUU7QUFDRixnRUFBZ0U7QUFDaEUseUNBQXlDO0FBQ3pDLEVBQUU7QUFDRixvRUFBb0U7QUFDcEUsK0NBQStDO0FBQy9DLEVBQUU7QUFDRixvRUFBb0U7QUFDcEUsbUVBQW1FO0FBQ25FLCtEQUErRDtBQUMvRCxzRUFBc0U7QUFDdEUsa0VBQWtFO0FBQ2xFLHdCQUF3QjtB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SUFBSSxDQUFDQSxTQUFTLEdBQUc7UUFDbkI7UUFFQSxJQUFJZ0IsUUFBUXJCLGdCQUFnQixFQUFFO1lBQzVCLElBQUksQ0FBQ0EsZ0JBQWdCLEdBQUdxQixRQUFRckIsZ0JBQWdCO1FBQ2xELE9BQU8sSUFBSXFCLFFBQVFFLG9CQUFvQixFQUFFO1lBQ3ZDLElBQUksT0FBT0YsUUFBUUUsb0JBQW9CLEtBQUssVUFBVTtnQkFDcEQsTUFBTSxJQUFJQyxNQUFNO1lBQ2xCO1lBQ0EsSUFBSSxDQUFDeEIsZ0JBQWdCLEdBQUdxQixRQUFRRSxvQkFBb0I7UUFDdEQ7SUFDRjtBQTJGRjtBQUVBLG9FQUFvRTtBQUNwRSxTQUFTbkIsb0JBQW9CcUIsSUFBSSxFQUFFQyxXQUFXLEVBQUVDLEtBQUs7SUFDbkQsSUFBSSxDQUFDRCxlQUFlLE9BQU9BLGdCQUFpQixVQUFVO1FBQ3BELE1BQU1FLGNBQWNGLGVBQWU7UUFDbkNBLGNBQWMsU0FBVUcsS0FBSztZQUMzQjFCLE9BQU8yQixNQUFNLENBQ1gsa0JBQWtCRixhQUNsQkM7UUFFSjtJQUNGO0lBRUEsT0FBTyxTQUFVLEdBQUdFLElBQUk7UUFDdEIsSUFBSUM7UUFDSixJQUFJO1lBQ0ZBLE1BQU1QLEtBQUtRLEtBQUssQ0FBQ04sT0FBT0k7UUFDMUIsRUFBRSxPQUFPRyxHQUFHO1lBQ1ZSLFlBQVlRO1FBQ2Q7UUFDQSxPQUFPRjtJQUNUO0FBQ0YiLCJmaWxlIjoiL3BhY2thZ2VzL2NhbGxiYWNrLWhvb2suanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBYWFggVGhpcyBwYXR0ZXJuIGlzIHVuZGVyIGRldmVsb3BtZW50LiBEbyBub3QgYWRkIG1vcmUgY2FsbHNpdGVzXG4vLyB1c2luZyB0aGlzIHBhY2thZ2UgZm9yIG5vdy4gU2VlOlxuLy8gaHR0cHM6Ly9tZXRlb3IuaGFja3BhZC5jb20vRGVzaWduLXByb3Bvc2FsLUhvb2tzLVl4dmdFVzA2cTZmXG4vL1xuLy8gRW5jYXBzdWxhdGVzIHRoZSBwYXR0ZXJuIG9mIHJlZ2lzdGVyaW5nIGNhbGxiYWNrcyBvbiBhIGhvb2suXG4vL1xuLy8gVGhlIGBlYWNoYCBtZXRob2Qgb2YgdGhlIGhvb2sgY2FsbHMgaXRzIGl0ZXJhdG9yIGZ1bmN0aW9uIGFyZ3VtZW50XG4vLyB3aXRoIGVhY2ggcmVnaXN0ZXJlZCBjYWxsYmFjay4gIFRoaXMgYWxsb3dzIHRoZSBob29rIHRvXG4vLyBjb25kaXRpb25hbGx5IGRlY2lkZSBub3QgdG8gY2FsbCB0aGUgY2FsbGJhY2sgKGlmLCBmb3IgZXhhbXBsZSwgdGhlXG4vLyBvYnNlcnZlZCBvYmplY3QgaGFzIGJlZW4gY2xvc2VkIG9yIHRlcm1pbmF0ZWQpLlxuLy9cbi8vIEJ5IGRlZmF1bHQsIGNhbGxiYWNrcyBhcmUgYm91bmQgd2l0aCBgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudGAsIHNvIHRoZXkgd2lsbCBiZVxuLy8gY2FsbGVkIHdpdGggdGhlIE1ldGVvciBlbnZpcm9ubWVudCBvZiB0aGUgY2FsbGluZyBjb2RlIHRoYXRcbi8vIHJlZ2lzdGVyZWQgdGhlIGNhbGxiYWNrLiBPdmVycmlkZSBieSBwYXNzaW5nIHsgYmluZEVudmlyb25tZW50OiBmYWxzZSB9XG4vLyB0byB0aGUgY29uc3RydWN0b3IuXG4vL1xuLy8gUmVnaXN0ZXJpbmcgYSBjYWxsYmFjayByZXR1cm5zIGFuIG9iamVjdCB3aXRoIGEgc2luZ2xlIGBzdG9wYFxuLy8gbWV0aG9kIHdoaWNoIHVucmVnaXN0ZXJzIHRoZSBjYWxsYmFjay5cbi8vXG4vLyBUaGUgY29kZSBpcyBjYXJlZnVsIHRvIGFsbG93IGEgY2FsbGJhY2sgdG8gYmUgc2FmZWx5IHVucmVnaXN0ZXJlZFxuLy8gd2hpbGUgdGhlIGNhbGxiYWNrcyBhcmUgYmVpbmcgaXRlcmF0ZWQgb3Zlci5cbi8vXG4vLyBJZiB0aGUgaG9vayBpcyBjb25maWd1cmVkIHdpdGggdGhlIGBleGNlcHRpb25IYW5kbGVyYCBvcHRpb24sIHRoZVxuLy8gaGFuZGxlciB3aWxsIGJlIGNhbGxlZCBpZiBhIGNhbGxlZCBjYWxsYmFjayB0aHJvd3MgYW4gZXhjZXB0aW9uLlxuLy8gQnkgZGVmYXVsdCAoaWYgdGhlIGV4Y2VwdGlvbiBoYW5kbGVyIGRvZXNuJ3QgaXRzZWxmIHRocm93IGFuXG4vLyBleGNlcHRpb24sIG9yIGlmIHRoZSBpdGVyYXRvciBmdW5jdGlvbiBkb2Vzbid0IHJldHVybiBhIGZhbHN5IHZhbHVlXG4vLyB0byB0ZXJtaW5hdGUgdGhlIGNhbGxpbmcgb2YgY2FsbGJhY2tzKSwgdGhlIHJlbWFpbmluZyBjYWxsYmFja3Ncbi8vIHdpbGwgc3RpbGwgYmUgY2FsbGVkLlxuLy9cbi8vIEFsdGVybmF0aXZlbHksIHRoZSBgZGVidWdQcmludEV4Y2VwdGlvbnNgIG9wdGlvbiBjYW4gYmUgc3BlY2lmaWVkXG4vLyBhcyBzdHJpbmcgZGVzY3JpYmluZyB0aGUgY2FsbGJhY2suICBPbiBhbiBleGNlcHRpb24gdGhlIHN0cmluZyBhbmRcbi8vIHRoZSBleGNlcHRpb24gd2lsbCBiZSBwcmludGVkIHRvIHRoZSBjb25zb2xlIGxvZyB3aXRoXG4vLyBgTWV0ZW9yLl9kZWJ1Z2AsIGFuZCB0aGUgZXhjZXB0aW9uIG90aGVyd2lzZSBpZ25vcmVkLlxuLy9cbi8vIElmIGFuIGV4Y2VwdGlvbiBoYW5kbGVyIGlzbid0IHNwZWNpZmllZCwgZXhjZXB0aW9ucyB0aHJvd24gaW4gdGhlXG4vLyBjYWxsYmFjayB3aWxsIHByb3BhZ2F0ZSB1cCB0byB0aGUgaXRlcmF0b3IgZnVuY3Rpb24sIGFuZCB3aWxsXG4vLyB0ZXJtaW5hdGUgY2FsbGluZyB0aGUgcmVtYWluaW5nIGNhbGxiYWNrcyBpZiBub3QgY2F1Z2h0LlxuXG5jb25zdCBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG5leHBvcnQgY2xhc3MgSG9vayB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB0aGlzLm5leHRDYWxsYmFja0lkID0gMDtcbiAgICB0aGlzLmNhbGxiYWNrcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgLy8gV2hldGhlciB0byB3cmFwIGNhbGxiYWNrcyB3aXRoIE1ldGVvci5iaW5kRW52aXJvbm1lbnRcbiAgICB0aGlzLmJpbmRFbnZpcm9ubWVudCA9IHRydWU7XG4gICAgaWYgKG9wdGlvbnMuYmluZEVudmlyb25tZW50ID09PSBmYWxzZSkge1xuICAgICAgdGhpcy5iaW5kRW52aXJvbm1lbnQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICB0aGlzLndyYXBBc3luYyA9IHRydWU7XG4gICAgaWYgKG9wdGlvbnMud3JhcEFzeW5jID09PSBmYWxzZSkge1xuICAgICAgdGhpcy53cmFwQXN5bmMgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5leGNlcHRpb25IYW5kbGVyKSB7XG4gICAgICB0aGlzLmV4Y2VwdGlvbkhhbmRsZXIgPSBvcHRpb25zLmV4Y2VwdGlvbkhhbmRsZXI7XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLmRlYnVnUHJpbnRFeGNlcHRpb25zKSB7XG4gICAgICBpZiAodHlwZW9mIG9wdGlvbnMuZGVidWdQcmludEV4Y2VwdGlvbnMgIT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSG9vayBvcHRpb24gZGVidWdQcmludEV4Y2VwdGlvbnMgc2hvdWxkIGJlIGEgc3RyaW5nXCIpO1xuICAgICAgfVxuICAgICAgdGhpcy5leGNlcHRpb25IYW5kbGVyID0gb3B0aW9ucy5kZWJ1Z1ByaW50RXhjZXB0aW9ucztcbiAgICB9XG4gIH1cblxuICByZWdpc3RlcihjYWxsYmFjaykge1xuICAgIGNvbnN0IGV4Y2VwdGlvbkhhbmRsZXIgPSB0aGlzLmV4Y2VwdGlvbkhhbmRsZXIgfHwgZnVuY3Rpb24gKGV4Y2VwdGlvbikge1xuICAgICAgLy8gTm90ZTogdGhpcyByZWxpZXMgb24gdGhlIHVuZG9jdW1lbnRlZCBmYWN0IHRoYXQgaWYgYmluZEVudmlyb25tZW50J3NcbiAgICAgIC8vIG9uRXhjZXB0aW9uIHRocm93cywgYW5kIHlvdSBhcmUgaW52b2tpbmcgdGhlIGNhbGxiYWNrIGVpdGhlciBpbiB0aGVcbiAgICAgIC8vIGJyb3dzZXIgb3IgZnJvbSB3aXRoaW4gYSBGaWJlciBpbiBOb2RlLCB0aGUgZXhjZXB0aW9uIGlzIHByb3BhZ2F0ZWQuXG4gICAgICB0aHJvdyBleGNlcHRpb247XG4gICAgfTtcblxuICAgIGlmICh0aGlzLmJpbmRFbnZpcm9ubWVudCkge1xuICAgICAgY2FsbGJhY2sgPSBNZXRlb3IuYmluZEVudmlyb25tZW50KGNhbGxiYWNrLCBleGNlcHRpb25IYW5kbGVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FsbGJhY2sgPSBkb250QmluZEVudmlyb25tZW50KGNhbGxiYWNrLCBleGNlcHRpb25IYW5kbGVyKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy53cmFwQXN5bmMpIHtcbiAgICAgIGNhbGxiYWNrID0gTWV0ZW9yLndyYXBGbihjYWxsYmFjayk7XG4gICAgfVxuXG4gICAgY29uc3QgaWQgPSB0aGlzLm5leHRDYWxsYmFja0lkKys7XG4gICAgdGhpcy5jYWxsYmFja3NbaWRdID0gY2FsbGJhY2s7XG5cbiAgICByZXR1cm4ge1xuICAgICAgY2FsbGJhY2ssXG4gICAgICBzdG9wOiAoKSA9PiB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmNhbGxiYWNrc1tpZF07XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIGNsZWFyKCkge1xuICAgIHRoaXMubmV4dENhbGxiYWNrSWQgPSAwO1xuICAgIHRoaXMuY2FsbGJhY2tzID0gW107XG4gIH1cblxuICAvKipcbiAgICogRm9yIGVhY2ggcmVnaXN0ZXJlZCBjYWxsYmFjaywgY2FsbCB0aGUgcGFzc2VkIGl0ZXJhdG9yIGZ1bmN0aW9uIHdpdGggdGhlIGNhbGxiYWNrLlxuICAgKlxuICAgKiBUaGUgaXRlcmF0b3IgZnVuY3Rpb24gY2FuIGNob29zZSB3aGV0aGVyIG9yIG5vdCB0byBjYWxsIHRoZVxuICAgKiBjYWxsYmFjay4gIChGb3IgZXhhbXBsZSwgaXQgbWlnaHQgbm90IGNhbGwgdGhlIGNhbGxiYWNrIGlmIHRoZVxuICAgKiBvYnNlcnZlZCBvYmplY3QgaGFzIGJlZW4gY2xvc2VkIG9yIHRlcm1pbmF0ZWQpLlxuICAgKiBUaGUgaXRlcmF0aW9uIGlzIHN0b3BwZWQgaWYgdGhlIGl0ZXJhdG9yIGZ1bmN0aW9uIHJldHVybnMgYSBmYWxzeVxuICAgKiB2YWx1ZSBvciB0aHJvd3MgYW4gZXhjZXB0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gaXRlcmF0b3JcbiAgICovXG4gIGZvckVhY2goaXRlcmF0b3IpIHtcblxuICAgIGNvbnN0IGlkcyA9IE9iamVjdC5rZXlzKHRoaXMuY2FsbGJhY2tzKTtcbiAgICBmb3IgKGxldCBpID0gMDsgIGkgPCBpZHMubGVuZ3RoOyAgKytpKSB7XG4gICAgICBjb25zdCBpZCA9IGlkc1tpXTtcbiAgICAgIC8vIGNoZWNrIHRvIHNlZSBpZiB0aGUgY2FsbGJhY2sgd2FzIHJlbW92ZWQgZHVyaW5nIGl0ZXJhdGlvblxuICAgICAgaWYgKGhhc093bi5jYWxsKHRoaXMuY2FsbGJhY2tzLCBpZCkpIHtcbiAgICAgICAgY29uc3QgY2FsbGJhY2sgPSB0aGlzLmNhbGxiYWNrc1tpZF07XG4gICAgICAgIGlmICghIGl0ZXJhdG9yKGNhbGxiYWNrKSkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEZvciBlYWNoIHJlZ2lzdGVyZWQgY2FsbGJhY2ssIGNhbGwgdGhlIHBhc3NlZCBpdGVyYXRvciBmdW5jdGlvbiB3aXRoIHRoZSBjYWxsYmFjay5cbiAgICpcbiAgICogaXQgaXMgYSBjb3VudGVycGFydCBvZiBmb3JFYWNoLCBidXQgaXQgaXMgYXN5bmMgYW5kIHJldHVybnMgYSBwcm9taXNlXG4gICAqIEBwYXJhbSBpdGVyYXRvclxuICAgKiBAcmV0dXJuIHtQcm9taXNlPHZvaWQ+fVxuICAgKiBAc2VlIGZvckVhY2hcbiAgICovXG4gIGFzeW5jIGZvckVhY2hBc3luYyhpdGVyYXRvcikge1xuICAgIGNvbnN0IGlkcyA9IE9iamVjdC5rZXlzKHRoaXMuY2FsbGJhY2tzKTtcbiAgICBmb3IgKGxldCBpID0gMDsgIGkgPCBpZHMubGVuZ3RoOyAgKytpKSB7XG4gICAgICBjb25zdCBpZCA9IGlkc1tpXTtcbiAgICAgIC8vIGNoZWNrIHRvIHNlZSBpZiB0aGUgY2FsbGJhY2sgd2FzIHJlbW92ZWQgZHVyaW5nIGl0ZXJhdGlvblxuICAgICAgaWYgKGhhc093bi5jYWxsKHRoaXMuY2FsbGJhY2tzLCBpZCkpIHtcbiAgICAgICAgY29uc3QgY2FsbGJhY2sgPSB0aGlzLmNhbGxiYWNrc1tpZF07XG4gICAgICAgIGlmICghYXdhaXQgaXRlcmF0b3IoY2FsbGJhY2spKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQGRlcHJlY2F0ZWQgdXNlIGZvckVhY2hcbiAgICogQHBhcmFtIGl0ZXJhdG9yXG4gICAqL1xuICBlYWNoKGl0ZXJhdG9yKSB7XG4gICAgcmV0dXJuIHRoaXMuZm9yRWFjaChpdGVyYXRvcik7XG4gIH1cbn1cblxuLy8gQ29waWVkIGZyb20gTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCBhbmQgcmVtb3ZlZCBhbGwgdGhlIGVudiBzdHVmZi5cbmZ1bmN0aW9uIGRvbnRCaW5kRW52aXJvbm1lbnQoZnVuYywgb25FeGNlcHRpb24sIF90aGlzKSB7XG4gIGlmICghb25FeGNlcHRpb24gfHwgdHlwZW9mKG9uRXhjZXB0aW9uKSA9PT0gJ3N0cmluZycpIHtcbiAgICBjb25zdCBkZXNjcmlwdGlvbiA9IG9uRXhjZXB0aW9uIHx8IFwiY2FsbGJhY2sgb2YgYXN5bmMgZnVuY3Rpb25cIjtcbiAgICBvbkV4Y2VwdGlvbiA9IGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgTWV0ZW9yLl9kZWJ1ZyhcbiAgICAgICAgXCJFeGNlcHRpb24gaW4gXCIgKyBkZXNjcmlwdGlvbixcbiAgICAgICAgZXJyb3JcbiAgICAgICk7XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgIGxldCByZXQ7XG4gICAgdHJ5IHtcbiAgICAgIHJldCA9IGZ1bmMuYXBwbHkoX3RoaXMsIGFyZ3MpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIG9uRXhjZXB0aW9uKGUpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9O1xufVxuIl19
