Package["core-runtime"].queue("check",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var ECMAScript = Package.ecmascript.ECMAScript;
var EJSON = Package.ejson.EJSON;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var check, Match;

var require = meteorInstall({"node_modules":{"meteor":{"check":{"match.js":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/check/match.js                                                                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({check:()=>check});module.export({Match:()=>Match},true);let isPlainObject;module.link('./isPlainObject',{isPlainObject(v){isPlainObject=v}},0);// XXX docs

// Things we explicitly do NOT support:
//    - heterogenous arrays
const currentArgumentChecker = new Meteor.EnvironmentVariable;
const hasOwn = Object.prototype.hasOwnProperty;
const format = (result)=>{
    const err = new Match.Error(result.message);
    if (result.path) {
        err.message += ` in field ${result.path}`;
        err.path = result.path;
    }
    return err;
};
/**
 * @summary Check that a value matches a [pattern](#matchpatterns).
 * If the value does not match the pattern, throw a `Match.Error`.
 * By default, it will throw immediately at the first error encountered. Pass in { throwAllErrors: true } to throw all errors.
 *
 * Particularly useful to assert that arguments to a function have the right
 * types and structure.
 * @locus Anywhere
 * @param {Any} value The value to check
 * @param {MatchPattern} pattern The pattern to match `value` against
 * @param {Object} [options={}] Additional options for check
 * @param {Boolean} [options.throwAllErrors=false] If true, throw all errors
 */ function check(value, pattern, options = {
    throwAllErrors: false
}) {
    // Record that check got called, if somebody cared.
    //
    // We use getOrNullIfOutsideFiber so that it's OK to call check()
    // from non-Fiber server contexts; the downside is that if you forget to
    // bindEnvironment on some random callback in your method/publisher,
    // it might not find the argumentChecker and you'll get an error about
    // not checking an argument that it looks like you're checking (instead
    // of just getting a "Node code must run in a Fiber" error).
    const argChecker = currentArgumentChecker.getOrNullIfOutsideFiber();
    if (argChecker) {
        argChecker.checking(value);
    }
    const result = testSubtree(value, pattern, options.throwAllErrors);
    if (result) {
        if (options.throwAllErrors) {
            throw Array.isArray(result) ? result.map((r)=>format(r)) : [
                format(result)
            ];
        } else {
            throw format(result);
        }
    }
}
;
/**
 * @namespace Match
 * @summary The namespace for all Match types and methods.
 */ const Match = {
    Optional: function(pattern) {
        return new Optional(pattern);
    },
    Maybe: function(pattern) {
        return new Maybe(pattern);
    },
    OneOf: function(...args) {
        return new OneOf(args);
    },
    Any: [
        '__any__'
    ],
    Where: function(condition) {
        return new Where(condition);
    },
    ObjectIncluding: function(pattern) {
        return new ObjectIncluding(pattern);
    },
    ObjectWithValues: function(pattern) {
        return new ObjectWithValues(pattern);
    },
    // Matches only signed 32-bit integers
    Integer: [
        '__integer__'
    ],
    // XXX matchers should know how to describe themselves for errors
    Error: Meteor.makeErrorType('Match.Error', function(msg) {
        this.message = `Match error: ${msg}`;
        // The path of the value that failed to match. Initially empty, this gets
        // populated by catching and rethrowing the exception as it goes back up the
        // stack.
        // E.g.: "vals[3].entity.created"
        this.path = '';
        // If this gets sent over DDP, don't give full internal details but at least
        // provide something better than 500 Internal server error.
        this.sanitizedError = new Meteor.Error(400, 'Match failed');
    }),
    // Tests to see if value matches pattern. Unlike check, it merely returns true
    // or false (unless an error other than Match.Error was thrown). It does not
    // interact with _failIfArgumentsAreNotAllChecked.
    // XXX maybe also implement a Match.match which returns more information about
    //     failures but without using exception handling or doing what check()
    //     does with _failIfArgumentsAreNotAllChecked and Meteor.Error conversion
    /**
   * @summary Returns true if the value matches the pattern.
   * @locus Anywhere
   * @param {Any} value The value to check
   * @param {MatchPattern} pattern The pattern to match `value` against
   */ test (value, pattern) {
        return !testSubtree(value, pattern);
    },
    // Runs `f.apply(context, args)`. If check() is not called on every element of
    // `args` (either directly or in the first level of an array), throws an error
    // (using `description` in the message).
    _failIfArgumentsAreNotAllChecked (f, context, args, description) {
        const argChecker = new ArgumentChecker(args, description);
        const result = currentArgumentChecker.withValue(argChecker, ()=>f.apply(context, args));
        // If f didn't itself throw, make sure it checked all of its arguments.
        argChecker.throwUnlessAllArgumentsHaveBeenChecked();
        return result;
    }
};
class Optional {
    constructor(pattern){
        this.pattern = pattern;
    }
}
class Maybe {
    constructor(pattern){
        this.pattern = pattern;
    }
}
class OneOf {
    constructor(choices){
        if (!choices || choices.length === 0) {
            throw new Error('Must provide at least one choice to Match.OneOf');
        }
        this.choices = choices;
    }
}
class Where {
    constructor(condition){
        this.condition = condition;
    }
}
class ObjectIncluding {
    constructor(pattern){
        this.pattern = pattern;
    }
}
class ObjectWithValues {
    constructor(pattern){
        this.pattern = pattern;
    }
}
const stringForErrorMessage = (value, options = {})=>{
    if (value === null) {
        return 'null';
    }
    if (options.onlyShowType) {
        return typeof value;
    }
    // Your average non-object things.  Saves from doing the try/catch below for.
    if (typeof value !== 'object') {
        return EJSON.stringify(value);
    }
    try {
        // Find objects with circular references since EJSON doesn't support them yet (Issue #4778 + Unaccepted PR)
        // If the native stringify is going to choke, EJSON.stringify is going to choke too.
        JSON.stringify(value);
    } catch (stringifyError) {
        if (stringifyError.name === 'TypeError') {
            return typeof value;
        }
    }
    return EJSON.stringify(value);
};
const typeofChecks = [
    [
        String,
        'string'
    ],
    [
        Number,
        'number'
    ],
    [
        Boolean,
        'boolean'
    ],
    // While we don't allow undefined/function in EJSON, this is good for optional
    // arguments with OneOf.
    [
        Function,
        'function'
    ],
    [
        undefined,
        'undefined'
    ]
];
// Return `false` if it matches. Otherwise, returns an object with a `message` and a `path` field or an array of objects each with a `message` and a `path` field when collecting errors.
const testSubtree = (value, pattern, collectErrors = false, errors = [], path = '')=>{
    // Match anything!
    if (pattern === Match.Any) {
        return false;
    }
    // Basic atomic types.
    // Do not match boxed objects (e.g. String, Boolean)
    for(let i = 0; i < typeofChecks.length; ++i){
        if (pattern === typeofChecks[i][0]) {
            if (typeof value === typeofChecks[i][1]) {
                return false;
            }
            return {
                message: `Expected ${typeofChecks[i][1]}, got ${stringForErrorMessage(value, {
                    onlyShowType: true
                })}`,
                path: ''
            };
        }
    }
    if (pattern === null) {
        if (value === null) {
            return false;
        }
        return {
            message: `Expected null, got ${stringForErrorMessage(value)}`,
            path: ''
        };
    }
    // Strings, numbers, and booleans match literally. Goes well with Match.OneOf.
    if (typeof pattern === 'string' || typeof pattern === 'number' || typeof pattern === 'boolean') {
        if (value === pattern) {
            return false;
        }
        return {
            message: `Expected ${pattern}, got ${stringForErrorMessage(value)}`,
            path: ''
        };
    }
    // Match.Integer is special type encoded with array
    if (pattern === Match.Integer) {
        // There is no consistent and reliable way to check if variable is a 64-bit
        // integer. One of the popular solutions is to get reminder of division by 1
        // but this method fails on really large floats with big precision.
        // E.g.: 1.348192308491824e+23 % 1 === 0 in V8
        // Bitwise operators work consistantly but always cast variable to 32-bit
        // signed integer according to JavaScript specs.
        if (typeof value === 'number' && (value | 0) === value) {
            return false;
        }
        return {
            message: `Expected Integer, got ${stringForErrorMessage(value)}`,
            path: ''
        };
    }
    // 'Object' is shorthand for Match.ObjectIncluding({});
    if (pattern === Object) {
        pattern = Match.ObjectIncluding({});
    }
    // Array (checked AFTER Any, which is implemented as an Array).
    if (pattern instanceof Array) {
        if (pattern.length !== 1) {
            return {
                message: `Bad pattern: arrays must have one type element ${stringForErrorMessage(pattern)}`,
                path: ''
            };
        }
        if (!Array.isArray(value) && !isArguments(value)) {
            return {
                message: `Expected array, got ${stringForErrorMessage(value)}`,
                path: ''
            };
        }
        for(let i = 0, length = value.length; i < length; i++){
            const arrPath = `${path}[${i}]`;
            const result = testSubtree(value[i], pattern[0], collectErrors, errors, arrPath);
            if (result) {
                result.path = _prependPath(collectErrors ? arrPath : i, result.path);
                if (!collectErrors) return result;
                if (typeof value[i] !== 'object' || result.message) errors.push(result);
            }
        }
        if (!collectErrors) return false;
        return errors.length === 0 ? false : errors;
    }
    // Arbitrary validation checks. The condition can return false or throw a
    // Match.Error (ie, it can internally use check()) to fail.
    if (pattern instanceof Where) {
        let result;
        try {
            result = pattern.condition(value);
        } catch (err) {
            if (!(err instanceof Match.Error)) {
                throw err;
            }
            return {
                message: err.message,
                path: err.path
            };
        }
        if (result) {
            return false;
        }
        // XXX this error is terrible
        return {
            message: 'Failed Match.Where validation',
            path: ''
        };
    }
    if (pattern instanceof Maybe) {
        pattern = Match.OneOf(undefined, null, pattern.pattern);
    } else if (pattern instanceof Optional) {
        pattern = Match.OneOf(undefined, pattern.pattern);
    }
    if (pattern instanceof OneOf) {
        for(let i = 0; i < pattern.choices.length; ++i){
            const result = testSubtree(value, pattern.choices[i]);
            if (!result) {
                // No error? Yay, return.
                return false;
            }
        // Match errors just mean try another choice.
        }
        // XXX this error is terrible
        return {
            message: 'Failed Match.OneOf, Match.Maybe or Match.Optional validation',
            path: ''
        };
    }
    // A function that isn't something we special-case is assumed to be a
    // constructor.
    if (pattern instanceof Function) {
        if (value instanceof pattern) {
            return false;
        }
        return {
            message: `Expected ${pattern.name || 'particular constructor'}`,
            path: ''
        };
    }
    let unknownKeysAllowed = false;
    let unknownKeyPattern;
    if (pattern instanceof ObjectIncluding) {
        unknownKeysAllowed = true;
        pattern = pattern.pattern;
    }
    if (pattern instanceof ObjectWithValues) {
        unknownKeysAllowed = true;
        unknownKeyPattern = [
            pattern.pattern
        ];
        pattern = {}; // no required keys
    }
    if (typeof pattern !== 'object') {
        return {
            message: 'Bad pattern: unknown pattern type',
            path: ''
        };
    }
    // An object, with required and optional keys. Note that this does NOT do
    // structural matches against objects of special types that happen to match
    // the pattern: this really needs to be a plain old {Object}!
    if (typeof value !== 'object') {
        return {
            message: `Expected object, got ${typeof value}`,
            path: ''
        };
    }
    if (value === null) {
        return {
            message: `Expected object, got null`,
            path: ''
        };
    }
    if (!isPlainObject(value)) {
        return {
            message: `Expected plain object`,
            path: ''
        };
    }
    const requiredPatterns = Object.create(null);
    const optionalPatterns = Object.create(null);
    Object.keys(pattern).forEach((key)=>{
        const subPattern = pattern[key];
        if (subPattern instanceof Optional || subPattern instanceof Maybe) {
            optionalPatterns[key] = subPattern.pattern;
        } else {
            requiredPatterns[key] = subPattern;
        }
    });
    for(let key in Object(value)){
        const subValue = value[key];
        const objPath = path ? `${path}.${key}` : key;
        if (hasOwn.call(requiredPatterns, key)) {
            const result = testSubtree(subValue, requiredPatterns[key], collectErrors, errors, objPath);
            if (result) {
                result.path = _prependPath(collectErrors ? objPath : key, result.path);
                if (!collectErrors) return result;
                if (typeof subValue !== 'object' || result.message) errors.push(result);
            }
            delete requiredPatterns[key];
        } else if (hasOwn.call(optionalPatterns, key)) {
            const result = testSubtree(subValue, optionalPatterns[key], collectErrors, errors, objPath);
            if (result) {
                result.path = _prependPath(collectErrors ? objPath : key, result.path);
                if (!collectErrors) return result;
                if (typeof subValue !== 'object' || result.message) errors.push(result);
            }
        } else {
            if (!unknownKeysAllowed) {
                const result = {
                    message: 'Unknown key',
                    path: key
                };
                if (!collectErrors) return result;
                errors.push(result);
            }
            if (unknownKeyPattern) {
                const result = testSubtree(subValue, unknownKeyPattern[0], collectErrors, errors, objPath);
                if (result) {
                    result.path = _prependPath(collectErrors ? objPath : key, result.path);
                    if (!collectErrors) return result;
                    if (typeof subValue !== 'object' || result.message) errors.push(result);
                }
            }
        }
    }
    const keys = Object.keys(requiredPatterns);
    if (keys.length) {
        const createMissingError = (key)=>({
                message: `Missing key '${key}'`,
                path: collectErrors ? path : ''
            });
        if (!collectErrors) {
            return createMissingError(keys[0]);
        }
        for (const key of keys){
            errors.push(createMissingError(key));
        }
    }
    if (!collectErrors) return false;
    return errors.length === 0 ? false : errors;
};
class ArgumentChecker {
    checking(value) {
        if (this._checkingOneValue(value)) {
            return;
        }
        // Allow check(arguments, [String]) or check(arguments.slice(1), [String])
        // or check([foo, bar], [String]) to count... but only if value wasn't
        // itself an argument.
        if (Array.isArray(value) || isArguments(value)) {
            Array.prototype.forEach.call(value, this._checkingOneValue.bind(this));
        }
    }
    _checkingOneValue(value) {
        for(let i = 0; i < this.args.length; ++i){
            // Is this value one of the arguments? (This can have a false positive if
            // the argument is an interned primitive, but it's still a good enough
            // check.)
            // (NaN is not === to itself, so we have to check specially.)
            if (value === this.args[i] || Number.isNaN(value) && Number.isNaN(this.args[i])) {
                this.args.splice(i, 1);
                return true;
            }
        }
        return false;
    }
    throwUnlessAllArgumentsHaveBeenChecked() {
        if (this.args.length > 0) throw new Error(`Did not check() all arguments during ${this.description}`);
    }
    constructor(args, description){
        // Make a SHALLOW copy of the arguments. (We'll be doing identity checks
        // against its contents.)
        this.args = [
            ...args
        ];
        // Since the common case will be to check arguments in order, and we splice
        // out arguments when we check them, make it so we splice out from the end
        // rather than the beginning.
        this.args.reverse();
        this.description = description;
    }
}
const _jsKeywords = [
    'do',
    'if',
    'in',
    'for',
    'let',
    'new',
    'try',
    'var',
    'case',
    'else',
    'enum',
    'eval',
    'false',
    'null',
    'this',
    'true',
    'void',
    'with',
    'break',
    'catch',
    'class',
    'const',
    'super',
    'throw',
    'while',
    'yield',
    'delete',
    'export',
    'import',
    'public',
    'return',
    'static',
    'switch',
    'typeof',
    'default',
    'extends',
    'finally',
    'package',
    'private',
    'continue',
    'debugger',
    'function',
    'arguments',
    'interface',
    'protected',
    'implements',
    'instanceof'
];
// Assumes the base of path is already escaped properly
// returns key + base
const _prependPath = (key, base)=>{
    if (typeof key === 'number' || key.match(/^[0-9]+$/)) {
        key = `[${key}]`;
    } else if (!key.match(/^[a-z_$][0-9a-z_$.[\]]*$/i) || _jsKeywords.indexOf(key) >= 0) {
        key = JSON.stringify([
            key
        ]);
    }
    if (base && base[0] !== '[') {
        return `${key}.${base}`;
    }
    return key + base;
};
const isObject = (value)=>typeof value === 'object' && value !== null;
const baseIsArguments = (item)=>isObject(item) && Object.prototype.toString.call(item) === '[object Arguments]';
const isArguments = baseIsArguments(function() {
    return arguments;
}()) ? baseIsArguments : (value)=>isObject(value) && typeof value.callee === 'function';

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"isPlainObject.js":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/check/isPlainObject.js                                                                                  //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({isPlainObject:()=>isPlainObject},true);// Copy of jQuery.isPlainObject for the server side from jQuery v3.1.1.
const class2type = {};
const toString = class2type.toString;
const hasOwn = Object.prototype.hasOwnProperty;
const fnToString = hasOwn.toString;
const ObjectFunctionString = fnToString.call(Object);
const getProto = Object.getPrototypeOf;
const isPlainObject = (obj)=>{
    let proto;
    let Ctor;
    // Detect obvious negatives
    // Use toString instead of jQuery.type to catch host objects
    if (!obj || toString.call(obj) !== '[object Object]') {
        return false;
    }
    proto = getProto(obj);
    // Objects with no prototype (e.g., `Object.create( null )`) are plain
    if (!proto) {
        return true;
    }
    // Objects with prototype are plain iff they were constructed by a global Object function
    Ctor = hasOwn.call(proto, 'constructor') && proto.constructor;
    return typeof Ctor === 'function' && fnToString.call(Ctor) === ObjectFunctionString;
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
      check: check,
      Match: Match
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/check/match.js"
  ],
  mainModulePath: "/node_modules/meteor/check/match.js"
}});

//# sourceURL=meteor://💻app/packages/check.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvY2hlY2svbWF0Y2guanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL2NoZWNrL2lzUGxhaW5PYmplY3QuanMiXSwibmFtZXMiOlsiY3VycmVudEFyZ3VtZW50Q2hlY2tlciIsIk1ldGVvciIsIkVudmlyb25tZW50VmFyaWFibGUiLCJoYXNPd24iLCJPYmplY3QiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsImZvcm1hdCIsInJlc3VsdCIsImVyciIsIk1hdGNoIiwiRXJyb3IiLCJtZXNzYWdlIiwicGF0aCIsImNoZWNrIiwidmFsdWUiLCJwYXR0ZXJuIiwib3B0aW9ucyIsInRocm93QWxsRXJyb3JzIiwiYXJnQ2hlY2tlciIsImdldE9yTnVsbElmT3V0c2lkZUZpYmVyIiwiY2hlY2tpbmciLCJ0ZXN0U3VidHJlZSIsIkFycmF5IiwiaXNBcnJheSIsIm1hcCIsInIiLCJPcHRpb25hbCIsIk1heWJlIiwiT25lT2YiLCJhcmdzIiwiQW55IiwiV2hlcmUiLCJjb25kaXRpb24iLCJPYmplY3RJbmNsdWRpbmciLCJPYmplY3RXaXRoVmFsdWVzIiwiSW50ZWdlciIsIm1ha2VFcnJvclR5cGUiLCJtc2ciLCJzYW5pdGl6ZWRFcnJvciIsInRlc3QiLCJfZmFpbElmQXJndW1lbnRzQXJlTm90QWxsQ2hlY2tlZCIsImYiLCJjb250ZXh0IiwiZGVzY3JpcHRpb24iLCJBcmd1bWVudENoZWNrZXIiLCJ3aXRoVmFsdWUiLCJhcHBseSIsInRocm93VW5sZXNzQWxsQXJndW1lbnRzSGF2ZUJlZW5DaGVja2VkIiwiY2hvaWNlcyIsImxlbmd0aCIsInN0cmluZ0ZvckVycm9yTWVzc2FnZSIsIm9ubHlTaG93VHlwZSIsIkVKU09OIiwic3RyaW5naWZ5IiwiSlNPTiIsInN0cmluZ2lmeUVycm9yIiwibmFtZSIsInR5cGVvZkNoZWNrcyIsIlN0cmluZyIsIk51bWJlciIsIkJvb2xlYW4iLCJGdW5jdGlvbiIsInVuZGVmaW5lZCIsImNvbGxlY3RFcnJvcnMiLCJlcnJvcnMiLCJpIiwiaXNBcmd1bWVudHMiLCJhcnJQYXRoIiwiX3ByZXBlbmRQYXRoIiwicHVzaCIsInVua25vd25LZXlzQWxsb3dlZCIsInVua25vd25LZXlQYXR0ZXJuIiwiaXNQbGFpbk9iamVjdCIsInJlcXVpcmVkUGF0dGVybnMiLCJjcmVhdGUiLCJvcHRpb25hbFBhdHRlcm5zIiwia2V5cyIsImZvckVhY2giLCJrZXkiLCJzdWJQYXR0ZXJuIiwic3ViVmFsdWUiLCJvYmpQYXRoIiwiY2FsbCIsImNyZWF0ZU1pc3NpbmdFcnJvciIsIl9jaGVja2luZ09uZVZhbHVlIiwiYmluZCIsImlzTmFOIiwic3BsaWNlIiwicmV2ZXJzZSIsIl9qc0tleXdvcmRzIiwiYmFzZSIsIm1hdGNoIiwiaW5kZXhPZiIsImlzT2JqZWN0IiwiYmFzZUlzQXJndW1lbnRzIiwiaXRlbSIsInRvU3RyaW5nIiwiYXJndW1lbnRzIiwiY2FsbGVlIiwiY2xhc3MydHlwZSIsImZuVG9TdHJpbmciLCJPYmplY3RGdW5jdGlvblN0cmluZyIsImdldFByb3RvIiwiZ2V0UHJvdG90eXBlT2YiLCJvYmoiLCJwcm90byIsIkN0b3IiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLFdBQVc7QUFDcUM7QUFFaEQsdUNBQXVDO0FBQ3ZDLDJCQUEyQjtBQUUzQixNQUFNQSx5QkFBeUIsSUFBSUMsT0FBT0MsbUJBQW1CO0FBQzdELE1BQU1DLFNBQVNDLE9BQU9DLFNBQVMsQ0FBQ0MsY0FBYztBQUU5QyxNQUFNQyxTQUFTQztJQUNiLE1BQU1DLE1BQU0sSUFBSUMsTUFBTUMsS0FBSyxDQUFDSCxPQUFPSSxPQUFPO0lBQzFDLElBQUlKLE9BQU9LLElBQUksRUFBRTtRQUNmSixJQUFJRyxPQUFPLElBQUksQ0FBQyxVQUFVLEVBQUVKLE9BQU9LLElBQUksRUFBRTtRQUN6Q0osSUFBSUksSUFBSSxHQUFHTCxPQUFPSyxJQUFJO0lBQ3hCO0lBRUEsT0FBT0o7QUFDVDtBQUVBOzs7Ozs7Ozs7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LE9BQU9BLE1BQU1vRixNQUFNLEtBQUs7Ozs7Ozs7Ozs7OztBQ3hrQnRELHVFQUF1RTtBQUV2RSxNQUFNQyxhQUFhLENBQUM7QUFFcEIsTUFBTUgsV0FBV0csV0FBV0gsUUFBUTtBQUVwQyxNQUFNOUYsU0FBU0MsT0FBT0MsU0FBUyxDQUFDQyxjQUFjO0FBRTlDLE1BQU0rRixhQUFhbEcsT0FBTzhGLFFBQVE7QUFFbEMsTUFBTUssdUJBQXVCRCxXQUFXbEIsSUFBSSxDQUFDL0U7QUFFN0MsTUFBTW1HLFdBQVduRyxPQUFPb0csY0FBYztBQUV0QyxPQUFPLE1BQU0vQixnQkFBZ0JnQztJQUMzQixJQUFJQztJQUNKLElBQUlDO0lBRUosMkJBQTJCO0lBQzNCLDREQUE0RDtJQUM1RCxJQUFJLENBQUNGLE9BQU9SLFNBQVNkLElBQUksQ0FBQ3NCLFNBQVMsbUJBQW1CO1FBQ3BELE9BQU87SUFDVDtJQUVBQyxRQUFRSCxTQUFTRTtJQUVqQixzRUFBc0U7SUFDdEUsSUFBSSxDQUFDQyxPQUFPO1FBQ1YsT0FBTztJQUNUO0lBRUEseUZBQXlGO0lBQ3pGQyxPQUFPeEcsT0FBT2dGLElBQUksQ0FBQ3VCLE9BQU8sa0JBQWtCQSxNQUFNLFdBQVc7SUFDN0QsT0FBTyxPQUFPQyxTQUFTLGNBQ3JCTixXQUFXbEIsSUFBSSxDQUFDd0IsVUFBVUw7QUFDOUIsRUFBRSIsImZpbGUiOiIvcGFja2FnZXMvY2hlY2suanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBYWFggZG9jc1xuaW1wb3J0IHsgaXNQbGFpbk9iamVjdCB9IGZyb20gJy4vaXNQbGFpbk9iamVjdCc7XG5cbi8vIFRoaW5ncyB3ZSBleHBsaWNpdGx5IGRvIE5PVCBzdXBwb3J0OlxuLy8gICAgLSBoZXRlcm9nZW5vdXMgYXJyYXlzXG5cbmNvbnN0IGN1cnJlbnRBcmd1bWVudENoZWNrZXIgPSBuZXcgTWV0ZW9yLkVudmlyb25tZW50VmFyaWFibGU7XG5jb25zdCBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG5jb25zdCBmb3JtYXQgPSByZXN1bHQgPT4ge1xuICBjb25zdCBlcnIgPSBuZXcgTWF0Y2guRXJyb3IocmVzdWx0Lm1lc3NhZ2UpO1xuICBpZiAocmVzdWx0LnBhdGgpIHtcbiAgICBlcnIubWVzc2FnZSArPSBgIGluIGZpZWxkICR7cmVzdWx0LnBhdGh9YDtcbiAgICBlcnIucGF0aCA9IHJlc3VsdC5wYXRoO1xuICB9XG5cbiAgcmV0dXJuIGVycjtcbn1cblxuLyoqXG4gKiBAc3VtbWFyeSBDaGVjayB0aGF0IGEgdmFsdWUgbWF0Y2hlcyBhIFtwYXR0ZXJuXSgjbWF0Y2hwYXR0ZXJucykuXG4gKiBJZiB0aGUgdmFsdWUgZG9lcyBub3QgbWF0Y2ggdGhlIHBhdHRlcm4sIHRocm93IGEgYE1hdGNoLkVycm9yYC5cbiAqIEJ5IGRlZmF1bHQsIGl0IHdpbGwgdGhyb3cgaW1tZWRpYXRlbHkgYXQgdGhlIGZpcnN0IGVycm9yIGVuY291bnRlcmVkLiBQYXNzIGluIHsgdGhyb3dBbGxFcnJvcnM6IHRydWUgfSB0byB0aHJvdyBhbGwgZXJyb3JzLlxuICpcbiAqIFBhcnRpY3VsYXJseSB1c2VmdWwgdG8gYXNzZXJ0IHRoYXQgYXJndW1lbnRzIHRvIGEgZnVuY3Rpb24gaGF2ZSB0aGUgcmlnaHRcbiAqIHR5cGVzIGFuZCBzdHJ1Y3R1cmUuXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBwYXJhbSB7QW55fSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2tcbiAqIEBwYXJhbSB7TWF0Y2hQYXR0ZXJufSBwYXR0ZXJuIFRoZSBwYXR0ZXJuIHRvIG1hdGNoIGB2YWx1ZWAgYWdhaW5zdFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zPXt9XSBBZGRpdGlvbmFsIG9wdGlvbnMgZm9yIGNoZWNrXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLnRocm93QWxsRXJyb3JzPWZhbHNlXSBJZiB0cnVlLCB0aHJvdyBhbGwgZXJyb3JzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjaGVjayh2YWx1ZSwgcGF0dGVybiwgb3B0aW9ucyA9IHsgdGhyb3dBbGxFcnJvcnM6IGZhbHNlIH0pIHtcbiAgLy8gUmVjb3JkIHRoYXQgY2hlY2sgZ290IGNhbGxlZCwgaWYgc29tZWJvZHkgY2FyZWQuXG4gIC8vXG4gIC8vIFdlIHVzZSBnZXRPck51bGxJZk91dHNpZGVGaWJlciBzbyB0aGF0IGl0J3MgT0sgdG8gY2FsbCBjaGVjaygpXG4gIC8vIGZyb20gbm9uLUZpYmVyIHNlcnZlciBjb250ZXh0czsgdGhlIGRvd25zaWRlIGlzIHRoYXQgaWYgeW91IGZvcmdldCB0b1xuICAvLyBiaW5kRW52aXJvbm1lbnQgb24gc29tZSByYW5kb20gY2FsbGJhY2sgaW4geW91ciBtZXRob2QvcHVibGlzaGVyLFxuICAvLyBpdCBtaWdodCBub3QgZmluZCB0aGUgYXJndW1lbnRDaGVja2VyIGFuZCB5b3UnbGwgZ2V0IGFuIGVycm9yIGFib3V0XG4gIC8vIG5vdCBjaGVja2luZyBhbiBhcmd1bWVudCB0aGF0IGl0IGxvb2tzIGxpa2UgeW91J3JlIGNoZWNraW5nIChpbnN0ZWFkXG4gIC8vIG9mIGp1c3QgZ2V0dGluZyBhIFwiTm9kZSBjb2RlIG11c3QgcnVuIGluIGEgRmliZXJcIiBlcnJvcikuXG4gIGNvbnN0IGFyZ0NoZWNrZXIgPSBjdXJyZW50QXJndW1lbnRDaGVja2VyLmdldE9yTnVsbElmT3V0c2lkZUZpYmVyKCk7XG4gIGlmIChhcmdDaGVja2VyKSB7XG4gICAgYXJnQ2hlY2tlci5jaGVja2luZyh2YWx1ZSk7XG4gIH1cblxuICBjb25zdCByZXN1bHQgPSB0ZXN0U3VidHJlZSh2YWx1ZSwgcGF0dGVybiwgb3B0aW9ucy50aHJvd0FsbEVycm9ycyk7XG5cbiAgaWYgKHJlc3VsdCkge1xuICAgIGlmIChvcHRpb25zLnRocm93QWxsRXJyb3JzKSB7XG4gICAgICB0aHJvdyBBcnJheS5pc0FycmF5KHJlc3VsdCkgPyByZXN1bHQubWFwKHIgPT4gZm9ybWF0KHIpKSA6IFtmb3JtYXQocmVzdWx0KV1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgZm9ybWF0KHJlc3VsdClcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogQG5hbWVzcGFjZSBNYXRjaFxuICogQHN1bW1hcnkgVGhlIG5hbWVzcGFjZSBmb3IgYWxsIE1hdGNoIHR5cGVzIGFuZCBtZXRob2RzLlxuICovXG5leHBvcnQgY29uc3QgTWF0Y2ggPSB7XG4gIE9wdGlvbmFsOiBmdW5jdGlvbihwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIG5ldyBPcHRpb25hbChwYXR0ZXJuKTtcbiAgfSxcblxuICBNYXliZTogZnVuY3Rpb24ocGF0dGVybikge1xuICAgIHJldHVybiBuZXcgTWF5YmUocGF0dGVybik7XG4gIH0sXG5cbiAgT25lT2Y6IGZ1bmN0aW9uKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gbmV3IE9uZU9mKGFyZ3MpO1xuICB9LFxuXG4gIEFueTogWydfX2FueV9fJ10sXG4gIFdoZXJlOiBmdW5jdGlvbihjb25kaXRpb24pIHtcbiAgICByZXR1cm4gbmV3IFdoZXJlKGNvbmRpdGlvbik7XG4gIH0sXG5cbiAgT2JqZWN0SW5jbHVkaW5nOiBmdW5jdGlvbihwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RJbmNsdWRpbmcocGF0dGVybilcbiAgfSxcblxuICBPYmplY3RXaXRoVmFsdWVzOiBmdW5jdGlvbihwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RXaXRoVmFsdWVzKHBhdHRlcm4pO1xuICB9LFxuXG4gIC8vIE1hdGNoZXMgb25seSBzaWduZWQgMzItYml0IGludGVnZXJzXG4gIEludGVnZXI6IFsnX19pbnRlZ2VyX18nXSxcblxuICAvLyBYWFggbWF0Y2hlcnMgc2hvdWxkIGtub3cgaG93IHRvIGRlc2NyaWJlIHRoZW1zZWx2ZXMgZm9yIGVycm9yc1xuICBFcnJvcjogTWV0ZW9yLm1ha2VFcnJvclR5cGUoJ01hdGNoLkVycm9yJywgZnVuY3Rpb24gKG1zZykge1xuICAgIHRoaXMubWVzc2FnZSA9IGBNYXRjaCBlcnJvcjogJHttc2d9YDtcblxuICAgIC8vIFRoZSBwYXRoIG9mIHRoZSB2YWx1ZSB0aGF0IGZhaWxlZCB0byBtYXRjaC4gSW5pdGlhbGx5IGVtcHR5LCB0aGlzIGdldHNcbiAgICAvLyBwb3B1bGF0ZWQgYnkgY2F0Y2hpbmcgYW5kIHJldGhyb3dpbmcgdGhlIGV4Y2VwdGlvbiBhcyBpdCBnb2VzIGJhY2sgdXAgdGhlXG4gICAgLy8gc3RhY2suXG4gICAgLy8gRS5nLjogXCJ2YWxzWzNdLmVudGl0eS5jcmVhdGVkXCJcbiAgICB0aGlzLnBhdGggPSAnJztcblxuICAgIC8vIElmIHRoaXMgZ2V0cyBzZW50IG92ZXIgRERQLCBkb24ndCBnaXZlIGZ1bGwgaW50ZXJuYWwgZGV0YWlscyBidXQgYXQgbGVhc3RcbiAgICAvLyBwcm92aWRlIHNvbWV0aGluZyBiZXR0ZXIgdGhhbiA1MDAgSW50ZXJuYWwgc2VydmVyIGVycm9yLlxuICAgIHRoaXMuc2FuaXRpemVkRXJyb3IgPSBuZXcgTWV0ZW9yLkVycm9yKDQwMCwgJ01hdGNoIGZhaWxlZCcpO1xuICB9KSxcblxuICAvLyBUZXN0cyB0byBzZWUgaWYgdmFsdWUgbWF0Y2hlcyBwYXR0ZXJuLiBVbmxpa2UgY2hlY2ssIGl0IG1lcmVseSByZXR1cm5zIHRydWVcbiAgLy8gb3IgZmFsc2UgKHVubGVzcyBhbiBlcnJvciBvdGhlciB0aGFuIE1hdGNoLkVycm9yIHdhcyB0aHJvd24pLiBJdCBkb2VzIG5vdFxuICAvLyBpbnRlcmFjdCB3aXRoIF9mYWlsSWZBcmd1bWVudHNBcmVOb3RBbGxDaGVja2VkLlxuICAvLyBYWFggbWF5YmUgYWxzbyBpbXBsZW1lbnQgYSBNYXRjaC5tYXRjaCB3aGljaCByZXR1cm5zIG1vcmUgaW5mb3JtYXRpb24gYWJvdXRcbiAgLy8gICAgIGZhaWx1cmVzIGJ1dCB3aXRob3V0IHVzaW5nIGV4Y2VwdGlvbiBoYW5kbGluZyBvciBkb2luZyB3aGF0IGNoZWNrKClcbiAgLy8gICAgIGRvZXMgd2l0aCBfZmFpbElmQXJndW1lbnRzQXJlTm90QWxsQ2hlY2tlZCBhbmQgTWV0ZW9yLkVycm9yIGNvbnZlcnNpb25cblxuICAvKipcbiAgICogQHN1bW1hcnkgUmV0dXJucyB0cnVlIGlmIHRoZSB2YWx1ZSBtYXRjaGVzIHRoZSBwYXR0ZXJuLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQHBhcmFtIHtBbnl9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVja1xuICAgKiBAcGFyYW0ge01hdGNoUGF0dGVybn0gcGF0dGVybiBUaGUgcGF0dGVybiB0byBtYXRjaCBgdmFsdWVgIGFnYWluc3RcbiAgICovXG4gIHRlc3QodmFsdWUsIHBhdHRlcm4pIHtcbiAgICByZXR1cm4gIXRlc3RTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuKTtcbiAgfSxcblxuICAvLyBSdW5zIGBmLmFwcGx5KGNvbnRleHQsIGFyZ3MpYC4gSWYgY2hlY2soKSBpcyBub3QgY2FsbGVkIG9uIGV2ZXJ5IGVsZW1lbnQgb2ZcbiAgLy8gYGFyZ3NgIChlaXRoZXIgZGlyZWN0bHkgb3IgaW4gdGhlIGZpcnN0IGxldmVsIG9mIGFuIGFycmF5KSwgdGhyb3dzIGFuIGVycm9yXG4gIC8vICh1c2luZyBgZGVzY3JpcHRpb25gIGluIHRoZSBtZXNzYWdlKS5cbiAgX2ZhaWxJZkFyZ3VtZW50c0FyZU5vdEFsbENoZWNrZWQoZiwgY29udGV4dCwgYXJncywgZGVzY3JpcHRpb24pIHtcbiAgICBjb25zdCBhcmdDaGVja2VyID0gbmV3IEFyZ3VtZW50Q2hlY2tlcihhcmdzLCBkZXNjcmlwdGlvbik7XG4gICAgY29uc3QgcmVzdWx0ID0gY3VycmVudEFyZ3VtZW50Q2hlY2tlci53aXRoVmFsdWUoXG4gICAgICBhcmdDaGVja2VyLFxuICAgICAgKCkgPT4gZi5hcHBseShjb250ZXh0LCBhcmdzKVxuICAgICk7XG5cbiAgICAvLyBJZiBmIGRpZG4ndCBpdHNlbGYgdGhyb3csIG1ha2Ugc3VyZSBpdCBjaGVja2VkIGFsbCBvZiBpdHMgYXJndW1lbnRzLlxuICAgIGFyZ0NoZWNrZXIudGhyb3dVbmxlc3NBbGxBcmd1bWVudHNIYXZlQmVlbkNoZWNrZWQoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59O1xuXG5jbGFzcyBPcHRpb25hbCB7XG4gIGNvbnN0cnVjdG9yKHBhdHRlcm4pIHtcbiAgICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xuICB9XG59XG5cbmNsYXNzIE1heWJlIHtcbiAgY29uc3RydWN0b3IocGF0dGVybikge1xuICAgIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG4gIH1cbn1cblxuY2xhc3MgT25lT2Yge1xuICBjb25zdHJ1Y3RvcihjaG9pY2VzKSB7XG4gICAgaWYgKCFjaG9pY2VzIHx8IGNob2ljZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ011c3QgcHJvdmlkZSBhdCBsZWFzdCBvbmUgY2hvaWNlIHRvIE1hdGNoLk9uZU9mJyk7XG4gICAgfVxuXG4gICAgdGhpcy5jaG9pY2VzID0gY2hvaWNlcztcbiAgfVxufVxuXG5jbGFzcyBXaGVyZSB7XG4gIGNvbnN0cnVjdG9yKGNvbmRpdGlvbikge1xuICAgIHRoaXMuY29uZGl0aW9uID0gY29uZGl0aW9uO1xuICB9XG59XG5cbmNsYXNzIE9iamVjdEluY2x1ZGluZyB7XG4gIGNvbnN0cnVjdG9yKHBhdHRlcm4pIHtcbiAgICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xuICB9XG59XG5cbmNsYXNzIE9iamVjdFdpdGhWYWx1ZXMge1xuICBjb25zdHJ1Y3RvcihwYXR0ZXJuKSB7XG4gICAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbiAgfVxufVxuXG5jb25zdCBzdHJpbmdGb3JFcnJvck1lc3NhZ2UgPSAodmFsdWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBpZiAoIHZhbHVlID09PSBudWxsICkge1xuICAgIHJldHVybiAnbnVsbCc7XG4gIH1cblxuICBpZiAoIG9wdGlvbnMub25seVNob3dUeXBlICkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWU7XG4gIH1cblxuICAvLyBZb3VyIGF2ZXJhZ2Ugbm9uLW9iamVjdCB0aGluZ3MuICBTYXZlcyBmcm9tIGRvaW5nIHRoZSB0cnkvY2F0Y2ggYmVsb3cgZm9yLlxuICBpZiAoIHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcgKSB7XG4gICAgcmV0dXJuIEVKU09OLnN0cmluZ2lmeSh2YWx1ZSlcbiAgfVxuXG4gIHRyeSB7XG5cbiAgICAvLyBGaW5kIG9iamVjdHMgd2l0aCBjaXJjdWxhciByZWZlcmVuY2VzIHNpbmNlIEVKU09OIGRvZXNuJ3Qgc3VwcG9ydCB0aGVtIHlldCAoSXNzdWUgIzQ3NzggKyBVbmFjY2VwdGVkIFBSKVxuICAgIC8vIElmIHRoZSBuYXRpdmUgc3RyaW5naWZ5IGlzIGdvaW5nIHRvIGNob2tlLCBFSlNPTi5zdHJpbmdpZnkgaXMgZ29pbmcgdG8gY2hva2UgdG9vLlxuICAgIEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbiAgfSBjYXRjaCAoc3RyaW5naWZ5RXJyb3IpIHtcbiAgICBpZiAoIHN0cmluZ2lmeUVycm9yLm5hbWUgPT09ICdUeXBlRXJyb3InICkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB2YWx1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gRUpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbn07XG5cbmNvbnN0IHR5cGVvZkNoZWNrcyA9IFtcbiAgW1N0cmluZywgJ3N0cmluZyddLFxuICBbTnVtYmVyLCAnbnVtYmVyJ10sXG4gIFtCb29sZWFuLCAnYm9vbGVhbiddLFxuXG4gIC8vIFdoaWxlIHdlIGRvbid0IGFsbG93IHVuZGVmaW5lZC9mdW5jdGlvbiBpbiBFSlNPTiwgdGhpcyBpcyBnb29kIGZvciBvcHRpb25hbFxuICAvLyBhcmd1bWVudHMgd2l0aCBPbmVPZi5cbiAgW0Z1bmN0aW9uLCAnZnVuY3Rpb24nXSxcbiAgW3VuZGVmaW5lZCwgJ3VuZGVmaW5lZCddLFxuXTtcblxuLy8gUmV0dXJuIGBmYWxzZWAgaWYgaXQgbWF0Y2hlcy4gT3RoZXJ3aXNlLCByZXR1cm5zIGFuIG9iamVjdCB3aXRoIGEgYG1lc3NhZ2VgIGFuZCBhIGBwYXRoYCBmaWVsZCBvciBhbiBhcnJheSBvZiBvYmplY3RzIGVhY2ggd2l0aCBhIGBtZXNzYWdlYCBhbmQgYSBgcGF0aGAgZmllbGQgd2hlbiBjb2xsZWN0aW5nIGVycm9ycy5cbmNvbnN0IHRlc3RTdWJ0cmVlID0gKHZhbHVlLCBwYXR0ZXJuLCBjb2xsZWN0RXJyb3JzID0gZmFsc2UsIGVycm9ycyA9IFtdLCBwYXRoID0gJycpID0+IHtcbiAgLy8gTWF0Y2ggYW55dGhpbmchXG4gIGlmIChwYXR0ZXJuID09PSBNYXRjaC5BbnkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBCYXNpYyBhdG9taWMgdHlwZXMuXG4gIC8vIERvIG5vdCBtYXRjaCBib3hlZCBvYmplY3RzIChlLmcuIFN0cmluZywgQm9vbGVhbilcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0eXBlb2ZDaGVja3MubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAocGF0dGVybiA9PT0gdHlwZW9mQ2hlY2tzW2ldWzBdKSB7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09PSB0eXBlb2ZDaGVja3NbaV1bMV0pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBtZXNzYWdlOiBgRXhwZWN0ZWQgJHt0eXBlb2ZDaGVja3NbaV1bMV19LCBnb3QgJHtzdHJpbmdGb3JFcnJvck1lc3NhZ2UodmFsdWUsIHsgb25seVNob3dUeXBlOiB0cnVlIH0pfWAsXG4gICAgICAgIHBhdGg6ICcnLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBpZiAocGF0dGVybiA9PT0gbnVsbCkge1xuICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBtZXNzYWdlOiBgRXhwZWN0ZWQgbnVsbCwgZ290ICR7c3RyaW5nRm9yRXJyb3JNZXNzYWdlKHZhbHVlKX1gLFxuICAgICAgcGF0aDogJycsXG4gICAgfTtcbiAgfVxuXG4gIC8vIFN0cmluZ3MsIG51bWJlcnMsIGFuZCBib29sZWFucyBtYXRjaCBsaXRlcmFsbHkuIEdvZXMgd2VsbCB3aXRoIE1hdGNoLk9uZU9mLlxuICBpZiAodHlwZW9mIHBhdHRlcm4gPT09ICdzdHJpbmcnIHx8IHR5cGVvZiBwYXR0ZXJuID09PSAnbnVtYmVyJyB8fCB0eXBlb2YgcGF0dGVybiA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgaWYgKHZhbHVlID09PSBwYXR0ZXJuKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG1lc3NhZ2U6IGBFeHBlY3RlZCAke3BhdHRlcm59LCBnb3QgJHtzdHJpbmdGb3JFcnJvck1lc3NhZ2UodmFsdWUpfWAsXG4gICAgICBwYXRoOiAnJyxcbiAgICB9O1xuICB9XG5cbiAgLy8gTWF0Y2guSW50ZWdlciBpcyBzcGVjaWFsIHR5cGUgZW5jb2RlZCB3aXRoIGFycmF5XG4gIGlmIChwYXR0ZXJuID09PSBNYXRjaC5JbnRlZ2VyKSB7XG5cbiAgICAvLyBUaGVyZSBpcyBubyBjb25zaXN0ZW50IGFuZCByZWxpYWJsZSB3YXkgdG8gY2hlY2sgaWYgdmFyaWFibGUgaXMgYSA2NC1iaXRcbiAgICAvLyBpbnRlZ2VyLiBPbmUgb2YgdGhlIHBvcHVsYXIgc29sdXRpb25zIGlzIHRvIGdldCByZW1pbmRlciBvZiBkaXZpc2lvbiBieSAxXG4gICAgLy8gYnV0IHRoaXMgbWV0aG9kIGZhaWxzIG9uIHJlYWxseSBsYXJnZSBmbG9hdHMgd2l0aCBiaWcgcHJlY2lzaW9uLlxuICAgIC8vIEUuZy46IDEuMzQ4MTkyMzA4NDkxODI0ZSsyMyAlIDEgPT09IDAgaW4gVjhcbiAgICAvLyBCaXR3aXNlIG9wZXJhdG9ycyB3b3JrIGNvbnNpc3RhbnRseSBidXQgYWx3YXlzIGNhc3QgdmFyaWFibGUgdG8gMzItYml0XG4gICAgLy8gc2lnbmVkIGludGVnZXIgYWNjb3JkaW5nIHRvIEphdmFTY3JpcHQgc3BlY3MuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgJiYgKHZhbHVlIHwgMCkgPT09IHZhbHVlKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG1lc3NhZ2U6IGBFeHBlY3RlZCBJbnRlZ2VyLCBnb3QgJHtzdHJpbmdGb3JFcnJvck1lc3NhZ2UodmFsdWUpfWAsXG4gICAgICBwYXRoOiAnJyxcbiAgICB9O1xuICB9XG5cbiAgLy8gJ09iamVjdCcgaXMgc2hvcnRoYW5kIGZvciBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe30pO1xuICBpZiAocGF0dGVybiA9PT0gT2JqZWN0KSB7XG4gICAgcGF0dGVybiA9IE1hdGNoLk9iamVjdEluY2x1ZGluZyh7fSk7XG4gIH1cblxuICAvLyBBcnJheSAoY2hlY2tlZCBBRlRFUiBBbnksIHdoaWNoIGlzIGltcGxlbWVudGVkIGFzIGFuIEFycmF5KS5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgIGlmIChwYXR0ZXJuLmxlbmd0aCAhPT0gMSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbWVzc2FnZTogYEJhZCBwYXR0ZXJuOiBhcnJheXMgbXVzdCBoYXZlIG9uZSB0eXBlIGVsZW1lbnQgJHtzdHJpbmdGb3JFcnJvck1lc3NhZ2UocGF0dGVybil9YCxcbiAgICAgICAgcGF0aDogJycsXG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgIWlzQXJndW1lbnRzKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbWVzc2FnZTogYEV4cGVjdGVkIGFycmF5LCBnb3QgJHtzdHJpbmdGb3JFcnJvck1lc3NhZ2UodmFsdWUpfWAsXG4gICAgICAgIHBhdGg6ICcnLFxuICAgICAgfTtcbiAgICB9XG5cblxuICAgIGZvciAobGV0IGkgPSAwLCBsZW5ndGggPSB2YWx1ZS5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgYXJyUGF0aCA9IGAke3BhdGh9WyR7aX1dYFxuICAgICAgY29uc3QgcmVzdWx0ID0gdGVzdFN1YnRyZWUodmFsdWVbaV0sIHBhdHRlcm5bMF0sIGNvbGxlY3RFcnJvcnMsIGVycm9ycywgYXJyUGF0aCk7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIHJlc3VsdC5wYXRoID0gX3ByZXBlbmRQYXRoKGNvbGxlY3RFcnJvcnMgPyBhcnJQYXRoIDogaSwgcmVzdWx0LnBhdGgpXG4gICAgICAgIGlmICghY29sbGVjdEVycm9ycykgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZVtpXSAhPT0gJ29iamVjdCcgfHwgcmVzdWx0Lm1lc3NhZ2UpIGVycm9ycy5wdXNoKHJlc3VsdClcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIWNvbGxlY3RFcnJvcnMpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gZXJyb3JzLmxlbmd0aCA9PT0gMCA/IGZhbHNlIDogZXJyb3JzO1xuICB9XG5cbiAgLy8gQXJiaXRyYXJ5IHZhbGlkYXRpb24gY2hlY2tzLiBUaGUgY29uZGl0aW9uIGNhbiByZXR1cm4gZmFsc2Ugb3IgdGhyb3cgYVxuICAvLyBNYXRjaC5FcnJvciAoaWUsIGl0IGNhbiBpbnRlcm5hbGx5IHVzZSBjaGVjaygpKSB0byBmYWlsLlxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIFdoZXJlKSB7XG4gICAgbGV0IHJlc3VsdDtcbiAgICB0cnkge1xuICAgICAgcmVzdWx0ID0gcGF0dGVybi5jb25kaXRpb24odmFsdWUpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgaWYgKCEoZXJyIGluc3RhbmNlb2YgTWF0Y2guRXJyb3IpKSB7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbWVzc2FnZTogZXJyLm1lc3NhZ2UsXG4gICAgICAgIHBhdGg6IGVyci5wYXRoXG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmIChyZXN1bHQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBYWFggdGhpcyBlcnJvciBpcyB0ZXJyaWJsZVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG1lc3NhZ2U6ICdGYWlsZWQgTWF0Y2guV2hlcmUgdmFsaWRhdGlvbicsXG4gICAgICBwYXRoOiAnJyxcbiAgICB9O1xuICB9XG5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBNYXliZSkge1xuICAgIHBhdHRlcm4gPSBNYXRjaC5PbmVPZih1bmRlZmluZWQsIG51bGwsIHBhdHRlcm4ucGF0dGVybik7XG4gIH0gZWxzZSBpZiAocGF0dGVybiBpbnN0YW5jZW9mIE9wdGlvbmFsKSB7XG4gICAgcGF0dGVybiA9IE1hdGNoLk9uZU9mKHVuZGVmaW5lZCwgcGF0dGVybi5wYXR0ZXJuKTtcbiAgfVxuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT25lT2YpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhdHRlcm4uY2hvaWNlcy5sZW5ndGg7ICsraSkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gdGVzdFN1YnRyZWUodmFsdWUsIHBhdHRlcm4uY2hvaWNlc1tpXSk7XG4gICAgICBpZiAoIXJlc3VsdCkge1xuXG4gICAgICAgIC8vIE5vIGVycm9yPyBZYXksIHJldHVybi5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyBNYXRjaCBlcnJvcnMganVzdCBtZWFuIHRyeSBhbm90aGVyIGNob2ljZS5cbiAgICB9XG5cbiAgICAvLyBYWFggdGhpcyBlcnJvciBpcyB0ZXJyaWJsZVxuICAgIHJldHVybiB7XG4gICAgICBtZXNzYWdlOiAnRmFpbGVkIE1hdGNoLk9uZU9mLCBNYXRjaC5NYXliZSBvciBNYXRjaC5PcHRpb25hbCB2YWxpZGF0aW9uJyxcbiAgICAgIHBhdGg6ICcnLFxuICAgIH07XG4gIH1cblxuICAvLyBBIGZ1bmN0aW9uIHRoYXQgaXNuJ3Qgc29tZXRoaW5nIHdlIHNwZWNpYWwtY2FzZSBpcyBhc3N1bWVkIHRvIGJlIGFcbiAgLy8gY29uc3RydWN0b3IuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBwYXR0ZXJuKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG1lc3NhZ2U6IGBFeHBlY3RlZCAke3BhdHRlcm4ubmFtZSB8fCAncGFydGljdWxhciBjb25zdHJ1Y3Rvcid9YCxcbiAgICAgIHBhdGg6ICcnLFxuICAgIH07XG4gIH1cblxuICBsZXQgdW5rbm93bktleXNBbGxvd2VkID0gZmFsc2U7XG4gIGxldCB1bmtub3duS2V5UGF0dGVybjtcbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBPYmplY3RJbmNsdWRpbmcpIHtcbiAgICB1bmtub3duS2V5c0FsbG93ZWQgPSB0cnVlO1xuICAgIHBhdHRlcm4gPSBwYXR0ZXJuLnBhdHRlcm47XG4gIH1cblxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIE9iamVjdFdpdGhWYWx1ZXMpIHtcbiAgICB1bmtub3duS2V5c0FsbG93ZWQgPSB0cnVlO1xuICAgIHVua25vd25LZXlQYXR0ZXJuID0gW3BhdHRlcm4ucGF0dGVybl07XG4gICAgcGF0dGVybiA9IHt9OyAgLy8gbm8gcmVxdWlyZWQga2V5c1xuICB9XG5cbiAgaWYgKHR5cGVvZiBwYXR0ZXJuICE9PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiB7XG4gICAgICBtZXNzYWdlOiAnQmFkIHBhdHRlcm46IHVua25vd24gcGF0dGVybiB0eXBlJyxcbiAgICAgIHBhdGg6ICcnLFxuICAgIH07XG4gIH1cblxuICAvLyBBbiBvYmplY3QsIHdpdGggcmVxdWlyZWQgYW5kIG9wdGlvbmFsIGtleXMuIE5vdGUgdGhhdCB0aGlzIGRvZXMgTk9UIGRvXG4gIC8vIHN0cnVjdHVyYWwgbWF0Y2hlcyBhZ2FpbnN0IG9iamVjdHMgb2Ygc3BlY2lhbCB0eXBlcyB0aGF0IGhhcHBlbiB0byBtYXRjaFxuICAvLyB0aGUgcGF0dGVybjogdGhpcyByZWFsbHkgbmVlZHMgdG8gYmUgYSBwbGFpbiBvbGQge09iamVjdH0hXG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG1lc3NhZ2U6IGBFeHBlY3RlZCBvYmplY3QsIGdvdCAke3R5cGVvZiB2YWx1ZX1gLFxuICAgICAgcGF0aDogJycsXG4gICAgfTtcbiAgfVxuXG4gIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgIHJldHVybiB7XG4gICAgICBtZXNzYWdlOiBgRXhwZWN0ZWQgb2JqZWN0LCBnb3QgbnVsbGAsXG4gICAgICBwYXRoOiAnJyxcbiAgICB9O1xuICB9XG5cbiAgaWYgKCEgaXNQbGFpbk9iamVjdCh2YWx1ZSkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbWVzc2FnZTogYEV4cGVjdGVkIHBsYWluIG9iamVjdGAsXG4gICAgICBwYXRoOiAnJyxcbiAgICB9O1xuICB9XG5cbiAgY29uc3QgcmVxdWlyZWRQYXR0ZXJucyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIGNvbnN0IG9wdGlvbmFsUGF0dGVybnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIE9iamVjdC5rZXlzKHBhdHRlcm4pLmZvckVhY2goa2V5ID0+IHtcbiAgICBjb25zdCBzdWJQYXR0ZXJuID0gcGF0dGVybltrZXldO1xuICAgIGlmIChzdWJQYXR0ZXJuIGluc3RhbmNlb2YgT3B0aW9uYWwgfHxcbiAgICAgICAgc3ViUGF0dGVybiBpbnN0YW5jZW9mIE1heWJlKSB7XG4gICAgICBvcHRpb25hbFBhdHRlcm5zW2tleV0gPSBzdWJQYXR0ZXJuLnBhdHRlcm47XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlcXVpcmVkUGF0dGVybnNba2V5XSA9IHN1YlBhdHRlcm47XG4gICAgfVxuICB9KTtcblxuICBmb3IgKGxldCBrZXkgaW4gT2JqZWN0KHZhbHVlKSkge1xuICAgIGNvbnN0IHN1YlZhbHVlID0gdmFsdWVba2V5XTtcbiAgICBjb25zdCBvYmpQYXRoID0gcGF0aCA/IGAke3BhdGh9LiR7a2V5fWAgOiBrZXk7XG4gICAgaWYgKGhhc093bi5jYWxsKHJlcXVpcmVkUGF0dGVybnMsIGtleSkpIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRlc3RTdWJ0cmVlKHN1YlZhbHVlLCByZXF1aXJlZFBhdHRlcm5zW2tleV0sIGNvbGxlY3RFcnJvcnMsIGVycm9ycywgb2JqUGF0aCk7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIHJlc3VsdC5wYXRoID0gX3ByZXBlbmRQYXRoKGNvbGxlY3RFcnJvcnMgPyBvYmpQYXRoIDoga2V5LCByZXN1bHQucGF0aClcbiAgICAgICAgaWYgKCFjb2xsZWN0RXJyb3JzKSByZXR1cm4gcmVzdWx0O1xuICAgICAgICBpZiAodHlwZW9mIHN1YlZhbHVlICE9PSAnb2JqZWN0JyB8fCByZXN1bHQubWVzc2FnZSkgZXJyb3JzLnB1c2gocmVzdWx0KTtcbiAgICAgIH1cblxuICAgICAgZGVsZXRlIHJlcXVpcmVkUGF0dGVybnNba2V5XTtcbiAgICB9IGVsc2UgaWYgKGhhc093bi5jYWxsKG9wdGlvbmFsUGF0dGVybnMsIGtleSkpIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRlc3RTdWJ0cmVlKHN1YlZhbHVlLCBvcHRpb25hbFBhdHRlcm5zW2tleV0sIGNvbGxlY3RFcnJvcnMsIGVycm9ycywgb2JqUGF0aCk7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIHJlc3VsdC5wYXRoID0gX3ByZXBlbmRQYXRoKGNvbGxlY3RFcnJvcnMgPyBvYmpQYXRoIDoga2V5LCByZXN1bHQucGF0aClcbiAgICAgICAgaWYgKCFjb2xsZWN0RXJyb3JzKSByZXR1cm4gcmVzdWx0O1xuICAgICAgICBpZiAodHlwZW9mIHN1YlZhbHVlICE9PSAnb2JqZWN0JyB8fCByZXN1bHQubWVzc2FnZSkgZXJyb3JzLnB1c2gocmVzdWx0KTtcbiAgICAgIH1cblxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIXVua25vd25LZXlzQWxsb3dlZCkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICAgICAgbWVzc2FnZTogJ1Vua25vd24ga2V5JyxcbiAgICAgICAgICBwYXRoOiBrZXksXG4gICAgICAgIH07XG4gICAgICAgIGlmICghY29sbGVjdEVycm9ycykgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgZXJyb3JzLnB1c2gocmVzdWx0KTtcbiAgICAgIH1cblxuICAgICAgaWYgKHVua25vd25LZXlQYXR0ZXJuKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRlc3RTdWJ0cmVlKHN1YlZhbHVlLCB1bmtub3duS2V5UGF0dGVyblswXSwgY29sbGVjdEVycm9ycywgZXJyb3JzLCBvYmpQYXRoKTtcbiAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgIHJlc3VsdC5wYXRoID0gX3ByZXBlbmRQYXRoKGNvbGxlY3RFcnJvcnMgPyBvYmpQYXRoIDoga2V5LCByZXN1bHQucGF0aClcbiAgICAgICAgICBpZiAoIWNvbGxlY3RFcnJvcnMpIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgaWYgKHR5cGVvZiBzdWJWYWx1ZSAhPT0gJ29iamVjdCcgfHwgcmVzdWx0Lm1lc3NhZ2UpIGVycm9ycy5wdXNoKHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMocmVxdWlyZWRQYXR0ZXJucyk7XG4gIGlmIChrZXlzLmxlbmd0aCkge1xuICAgIGNvbnN0IGNyZWF0ZU1pc3NpbmdFcnJvciA9IGtleSA9PiAoe1xuICAgICAgbWVzc2FnZTogYE1pc3Npbmcga2V5ICcke2tleX0nYCxcbiAgICAgIHBhdGg6IGNvbGxlY3RFcnJvcnMgPyBwYXRoIDogJycsXG4gICAgfSk7XG5cbiAgICBpZiAoIWNvbGxlY3RFcnJvcnMpIHtcbiAgICAgIHJldHVybiBjcmVhdGVNaXNzaW5nRXJyb3Ioa2V5c1swXSk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBrZXkgb2Yga2V5cykge1xuICAgICAgZXJyb3JzLnB1c2goY3JlYXRlTWlzc2luZ0Vycm9yKGtleSkpO1xuICAgIH1cbiAgfVxuXG4gIGlmICghY29sbGVjdEVycm9ycykgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gZXJyb3JzLmxlbmd0aCA9PT0gMCA/IGZhbHNlIDogZXJyb3JzO1xufTtcblxuY2xhc3MgQXJndW1lbnRDaGVja2VyIHtcbiAgY29uc3RydWN0b3IgKGFyZ3MsIGRlc2NyaXB0aW9uKSB7XG5cbiAgICAvLyBNYWtlIGEgU0hBTExPVyBjb3B5IG9mIHRoZSBhcmd1bWVudHMuIChXZSdsbCBiZSBkb2luZyBpZGVudGl0eSBjaGVja3NcbiAgICAvLyBhZ2FpbnN0IGl0cyBjb250ZW50cy4pXG4gICAgdGhpcy5hcmdzID0gWy4uLmFyZ3NdO1xuXG4gICAgLy8gU2luY2UgdGhlIGNvbW1vbiBjYXNlIHdpbGwgYmUgdG8gY2hlY2sgYXJndW1lbnRzIGluIG9yZGVyLCBhbmQgd2Ugc3BsaWNlXG4gICAgLy8gb3V0IGFyZ3VtZW50cyB3aGVuIHdlIGNoZWNrIHRoZW0sIG1ha2UgaXQgc28gd2Ugc3BsaWNlIG91dCBmcm9tIHRoZSBlbmRcbiAgICAvLyByYXRoZXIgdGhhbiB0aGUgYmVnaW5uaW5nLlxuICAgIHRoaXMuYXJncy5yZXZlcnNlKCk7XG4gICAgdGhpcy5kZXNjcmlwdGlvbiA9IGRlc2NyaXB0aW9uO1xuICB9XG5cbiAgY2hlY2tpbmcodmFsdWUpIHtcbiAgICBpZiAodGhpcy5fY2hlY2tpbmdPbmVWYWx1ZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBBbGxvdyBjaGVjayhhcmd1bWVudHMsIFtTdHJpbmddKSBvciBjaGVjayhhcmd1bWVudHMuc2xpY2UoMSksIFtTdHJpbmddKVxuICAgIC8vIG9yIGNoZWNrKFtmb28sIGJhcl0sIFtTdHJpbmddKSB0byBjb3VudC4uLiBidXQgb25seSBpZiB2YWx1ZSB3YXNuJ3RcbiAgICAvLyBpdHNlbGYgYW4gYXJndW1lbnQuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpIHx8IGlzQXJndW1lbnRzKHZhbHVlKSkge1xuICAgICAgQXJyYXkucHJvdG90eXBlLmZvckVhY2guY2FsbCh2YWx1ZSwgdGhpcy5fY2hlY2tpbmdPbmVWYWx1ZS5iaW5kKHRoaXMpKTtcbiAgICB9XG4gIH1cblxuICBfY2hlY2tpbmdPbmVWYWx1ZSh2YWx1ZSkge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5hcmdzLmxlbmd0aDsgKytpKSB7XG5cbiAgICAgIC8vIElzIHRoaXMgdmFsdWUgb25lIG9mIHRoZSBhcmd1bWVudHM/IChUaGlzIGNhbiBoYXZlIGEgZmFsc2UgcG9zaXRpdmUgaWZcbiAgICAgIC8vIHRoZSBhcmd1bWVudCBpcyBhbiBpbnRlcm5lZCBwcmltaXRpdmUsIGJ1dCBpdCdzIHN0aWxsIGEgZ29vZCBlbm91Z2hcbiAgICAgIC8vIGNoZWNrLilcbiAgICAgIC8vIChOYU4gaXMgbm90ID09PSB0byBpdHNlbGYsIHNvIHdlIGhhdmUgdG8gY2hlY2sgc3BlY2lhbGx5LilcbiAgICAgIGlmICh2YWx1ZSA9PT0gdGhpcy5hcmdzW2ldIHx8XG4gICAgICAgICAgKE51bWJlci5pc05hTih2YWx1ZSkgJiYgTnVtYmVyLmlzTmFOKHRoaXMuYXJnc1tpXSkpKSB7XG4gICAgICAgIHRoaXMuYXJncy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICB0aHJvd1VubGVzc0FsbEFyZ3VtZW50c0hhdmVCZWVuQ2hlY2tlZCgpIHtcbiAgICBpZiAodGhpcy5hcmdzLmxlbmd0aCA+IDApXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYERpZCBub3QgY2hlY2soKSBhbGwgYXJndW1lbnRzIGR1cmluZyAke3RoaXMuZGVzY3JpcHRpb259YCk7XG4gIH1cbn1cblxuY29uc3QgX2pzS2V5d29yZHMgPSBbJ2RvJywgJ2lmJywgJ2luJywgJ2ZvcicsICdsZXQnLCAnbmV3JywgJ3RyeScsICd2YXInLCAnY2FzZScsXG4gICdlbHNlJywgJ2VudW0nLCAnZXZhbCcsICdmYWxzZScsICdudWxsJywgJ3RoaXMnLCAndHJ1ZScsICd2b2lkJywgJ3dpdGgnLFxuICAnYnJlYWsnLCAnY2F0Y2gnLCAnY2xhc3MnLCAnY29uc3QnLCAnc3VwZXInLCAndGhyb3cnLCAnd2hpbGUnLCAneWllbGQnLFxuICAnZGVsZXRlJywgJ2V4cG9ydCcsICdpbXBvcnQnLCAncHVibGljJywgJ3JldHVybicsICdzdGF0aWMnLCAnc3dpdGNoJyxcbiAgJ3R5cGVvZicsICdkZWZhdWx0JywgJ2V4dGVuZHMnLCAnZmluYWxseScsICdwYWNrYWdlJywgJ3ByaXZhdGUnLCAnY29udGludWUnLFxuICAnZGVidWdnZXInLCAnZnVuY3Rpb24nLCAnYXJndW1lbnRzJywgJ2ludGVyZmFjZScsICdwcm90ZWN0ZWQnLCAnaW1wbGVtZW50cycsXG4gICdpbnN0YW5jZW9mJ107XG5cbi8vIEFzc3VtZXMgdGhlIGJhc2Ugb2YgcGF0aCBpcyBhbHJlYWR5IGVzY2FwZWQgcHJvcGVybHlcbi8vIHJldHVybnMga2V5ICsgYmFzZVxuY29uc3QgX3ByZXBlbmRQYXRoID0gKGtleSwgYmFzZSkgPT4ge1xuICBpZiAoKHR5cGVvZiBrZXkpID09PSAnbnVtYmVyJyB8fCBrZXkubWF0Y2goL15bMC05XSskLykpIHtcbiAgICBrZXkgPSBgWyR7a2V5fV1gO1xuICB9IGVsc2UgaWYgKCFrZXkubWF0Y2goL15bYS16XyRdWzAtOWEtel8kLltcXF1dKiQvaSkgfHxcbiAgICAgICAgICAgICBfanNLZXl3b3Jkcy5pbmRleE9mKGtleSkgPj0gMCkge1xuICAgIGtleSA9IEpTT04uc3RyaW5naWZ5KFtrZXldKTtcbiAgfVxuXG4gIGlmIChiYXNlICYmIGJhc2VbMF0gIT09ICdbJykge1xuICAgIHJldHVybiBgJHtrZXl9LiR7YmFzZX1gO1xuICB9XG5cbiAgcmV0dXJuIGtleSArIGJhc2U7XG59XG5cbmNvbnN0IGlzT2JqZWN0ID0gdmFsdWUgPT4gdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbDtcblxuY29uc3QgYmFzZUlzQXJndW1lbnRzID0gaXRlbSA9PlxuICBpc09iamVjdChpdGVtKSAmJlxuICBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoaXRlbSkgPT09ICdbb2JqZWN0IEFyZ3VtZW50c10nO1xuXG5jb25zdCBpc0FyZ3VtZW50cyA9IGJhc2VJc0FyZ3VtZW50cyhmdW5jdGlvbigpIHsgcmV0dXJuIGFyZ3VtZW50czsgfSgpKSA/XG4gIGJhc2VJc0FyZ3VtZW50cyA6XG4gIHZhbHVlID0+IGlzT2JqZWN0KHZhbHVlKSAmJiB0eXBlb2YgdmFsdWUuY2FsbGVlID09PSAnZnVuY3Rpb24nO1xuIiwiLy8gQ29weSBvZiBqUXVlcnkuaXNQbGFpbk9iamVjdCBmb3IgdGhlIHNlcnZlciBzaWRlIGZyb20galF1ZXJ5IHYzLjEuMS5cblxuY29uc3QgY2xhc3MydHlwZSA9IHt9O1xuXG5jb25zdCB0b1N0cmluZyA9IGNsYXNzMnR5cGUudG9TdHJpbmc7XG5cbmNvbnN0IGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbmNvbnN0IGZuVG9TdHJpbmcgPSBoYXNPd24udG9TdHJpbmc7XG5cbmNvbnN0IE9iamVjdEZ1bmN0aW9uU3RyaW5nID0gZm5Ub1N0cmluZy5jYWxsKE9iamVjdCk7XG5cbmNvbnN0IGdldFByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mO1xuXG5leHBvcnQgY29uc3QgaXNQbGFpbk9iamVjdCA9IG9iaiA9PiB7XG4gIGxldCBwcm90bztcbiAgbGV0IEN0b3I7XG5cbiAgLy8gRGV0ZWN0IG9idmlvdXMgbmVnYXRpdmVzXG4gIC8vIFVzZSB0b1N0cmluZyBpbnN0ZWFkIG9mIGpRdWVyeS50eXBlIHRvIGNhdGNoIGhvc3Qgb2JqZWN0c1xuICBpZiAoIW9iaiB8fCB0b1N0cmluZy5jYWxsKG9iaikgIT09ICdbb2JqZWN0IE9iamVjdF0nKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcHJvdG8gPSBnZXRQcm90byhvYmopO1xuXG4gIC8vIE9iamVjdHMgd2l0aCBubyBwcm90b3R5cGUgKGUuZy4sIGBPYmplY3QuY3JlYXRlKCBudWxsIClgKSBhcmUgcGxhaW5cbiAgaWYgKCFwcm90bykge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gT2JqZWN0cyB3aXRoIHByb3RvdHlwZSBhcmUgcGxhaW4gaWZmIHRoZXkgd2VyZSBjb25zdHJ1Y3RlZCBieSBhIGdsb2JhbCBPYmplY3QgZnVuY3Rpb25cbiAgQ3RvciA9IGhhc093bi5jYWxsKHByb3RvLCAnY29uc3RydWN0b3InKSAmJiBwcm90by5jb25zdHJ1Y3RvcjtcbiAgcmV0dXJuIHR5cGVvZiBDdG9yID09PSAnZnVuY3Rpb24nICYmIFxuICAgIGZuVG9TdHJpbmcuY2FsbChDdG9yKSA9PT0gT2JqZWN0RnVuY3Rpb25TdHJpbmc7XG59O1xuIl19
