Package["core-runtime"].queue("logging",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var EJSON = Package.ejson.EJSON;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Formatter, Log;

var require = meteorInstall({"node_modules":{"meteor":{"logging":{"logging.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/logging/logging.js                                                                                       //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.export({Log:()=>Log});let _object_spread;module.link("@swc/helpers/_/_object_spread",{_(v){_object_spread=v}},0);let Meteor;module.link('meteor/meteor',{Meteor(v){Meteor=v}},1);

const hasOwn = Object.prototype.hasOwnProperty;
function Log(...args) {
    Log.info(...args);
}
/// FOR TESTING
let intercept = 0;
let interceptedLines = [];
let suppress = 0;
// Intercept the next 'count' calls to a Log function. The actual
// lines printed to the console can be cleared and read by calling
// Log._intercepted().
Log._intercept = (count)=>{
    intercept += count;
};
// Suppress the next 'count' calls to a Log function. Use this to stop
// tests from spamming the console, especially with red errors that
// might look like a failing test.
Log._suppress = (count)=>{
    suppress += count;
};
// Returns intercepted lines and resets the intercept counter.
Log._intercepted = ()=>{
    const lines = interceptedLines;
    interceptedLines = [];
    intercept = 0;
    return lines;
};
// Either 'json' or 'colored-text'.
//
// When this is set to 'json', print JSON documents that are parsed by another
// process ('satellite' or 'meteor run'). This other process should call
// 'Log.format' for nice output.
//
// When this is set to 'colored-text', call 'Log.format' before printing.
// This should be used for logging from within satellite, since there is no
// other process that will be reading its standard output.
Log.outputFormat = 'json';
// Defaults to true for local development and for backwards compatibility.
// for cloud environments is interesting to leave it false as most of them have the timestamp in the console.
// Only works in server with colored-text
Log.showTime = true;
const LEVEL_COLORS = {
    debug: 'green',
    // leave info as the default color
    warn: 'magenta',
    error: 'red'
};
const META_COLOR = 'blue';
// Default colors cause readability problems on Windows Powershell,
// switch to bright variants. While still capable of millions of
// operations per second, the benchmark showed a 25%+ increase in
// ops per second (on Node 8) by caching "process.platform".
const isWin32 = typeof process === 'object' && process.platform === 'win32';
const platformColor = (color)=>{
    if (isWin32 && typeof color === 'string' && !color.endsWith('Bright')) {
        return `${color}Bright`;
    }
    return color;
};
// XXX package
const RESTRICTED_KEYS = [
    'time',
    'timeInexact',
    'level',
    'file',
    'line',
    'program',
    'originApp',
    'satellite',
    'stderr'
];
const FORMATTED_KEYS = [
    ...RESTRICTED_KEYS,
    'app',
    'message'
];
const logInBrowser = (obj)=>{
    const str = Log.format(obj);
    // XXX Some levels should be probably be sent to the server
    const level = obj.level;
    if (typeof console !== 'undefined' && console[level]) {
        console[level](str);
    } else {
        // IE doesn't have console.log.apply, it's not a real Object.
        // http://stackoverflow.com/questions/5538972/console-log-apply-not-working-in-ie9
        // http://patik.com/blog/complete-cross-browser-console-log/
        if (typeof console.log.apply === "function") {
            // Most browsers
            console.log.apply(console, [
                str
            ]);
        } else if (typeof Function.prototype.bind === "function") {
            // IE9
            const log = Function.prototype.bind.call(console.log, console);
            log.apply(console, [
                str
            ]);
        }
    }
};
// @returns {Object: { line: Number, file: String }}
Log._getCallerDetails = ()=>{
    const getStack = ()=>{
        // We do NOT use Error.prepareStackTrace here (a V8 extension that gets us a
        // pre-parsed stack) since it's impossible to compose it with the use of
        // Error.prepareStackTrace used on the server for source maps.
        const err = new Error;
        const stack = err.stack;
        return stack;
    };
    const stack = getStack();
    if (!stack) return {};
    // looking for the first line outside the logging package (or an
    // eval if we find that first)
    let line;
    const lines = stack.split('\n').slice(1);
    for (line of lines){
        if (line.match(/^\s*(at eval \(eval)|(eval:)/)) {
            return {
                file: "eval"
            };
        }
        if (!line.match(/packages\/(?:local-test[:_])?logging(?:\/|\.js)/)) {
            break;
        }
    }
    const details = {};
    // The format for FF is 'functionName@filePath:lineNumber'
    // The format for V8 is 'functionName (packages/logging/logging.js:81)' or
    //                      'packages/logging/logging.js:81'
    const match = /(?:[@(]| at )([^(]+?):([0-9:]+)(?:\)|$)/.exec(line);
    if (!match) {
        return details;
    }
    // in case the matched block here is line:column
    details.line = match[2].split(':')[0];
    // Possible format: https://foo.bar.com/scripts/file.js?random=foobar
    // XXX: if you can write the following in better way, please do it
    // XXX: what about evals?
    details.file = match[1].split('/').slice(-1)[0].split('?')[0];
    return details;
};
[
    'debug',
    'info',
    'warn',
    'error'
].forEach((level)=>{
    // @param arg {String|Object}
    Log[level] = (arg)=>{
        if (suppress) {
            suppress--;
            return;
        }
        let intercepted = false;
        if (intercept) {
            intercept--;
            intercepted = true;
        }
        let obj = arg === Object(arg) && !(arg instanceof RegExp) && !(arg instanceof Date) ? arg : {
            message: new String(arg).toString()
        };
        RESTRICTED_KEYS.forEach((key)=>{
            if (obj[key]) {
                throw new Error(`Can't set '${key}' in log message`);
            }
        });
        if (hasOwn.call(obj, 'message') && typeof obj.message !== 'string') {
            throw new Error("The 'message' field in log objects must be a string");
        }
        if (!obj.omitCallerDetails) {
            obj = _object_spread({}, Log._getCallerDetails(), obj);
        }
        obj.time = new Date();
        obj.level = level;
        // If we are in production don't write out debug logs.
        if (level === 'debug' && Meteor.isProduction) {
            return;
        }
        if (intercepted) {
            interceptedLines.push(EJSON.stringify(obj));
        } else if (Meteor.isServer) {
            if (Log.outputFormat === 'colored-text') {
                console.log(Log.format(obj, {
                    color: true
                }));
            } else if (Log.outputFormat === 'json') {
                console.log(EJSON.stringify(obj));
            } else {
                throw new Error(`Unknown logging output format: ${Log.outputFormat}`);
            }
        } else {
            logInBrowser(obj);
        }
    };
});
// tries to parse line as EJSON. returns object if parse is successful, or null if not
Log.parse = (line)=>{
    let obj = null;
    if (line && line.startsWith('{')) {
        try {
            obj = EJSON.parse(line);
        } catch (e) {}
    }
    // XXX should probably check fields other than 'time'
    if (obj && obj.time && obj.time instanceof Date) {
        return obj;
    } else {
        return null;
    }
};
// formats a log object into colored human and machine-readable text
Log.format = (obj, options = {})=>{
    obj = _object_spread({}, obj); // don't mutate the argument
    let { time, timeInexact, level = 'info', file, line: lineNumber, app: appName = '', originApp, message = '', program = '', satellite = '', stderr = '' } = obj;
    if (!(time instanceof Date)) {
        throw new Error("'time' must be a Date object");
    }
    FORMATTED_KEYS.forEach((key)=>{
        delete obj[key];
    });
    if (Object.keys(obj).length > 0) {
        if (message) {
            message += ' ';
        }
        message += EJSON.stringify(obj);
    }
    const pad2 = (n)=>n.toString().padStart(2, '0');
    const pad3 = (n)=>n.toString().padStart(3, '0');
    const dateStamp = time.getFullYear().toString() + pad2(time.getMonth() + 1 /*0-based*/ ) + pad2(time.getDate());
    const timeStamp = pad2(time.getHours()) + ':' + pad2(time.getMinutes()) + ':' + pad2(time.getSeconds()) + '.' + pad3(time.getMilliseconds());
    // eg in San Francisco in June this will be '(-7)'
    const utcOffsetStr = `(${-(new Date().getTimezoneOffset() / 60)})`;
    let appInfo = '';
    if (appName) {
        appInfo += appName;
    }
    if (originApp && originApp !== appName) {
        appInfo += ` via ${originApp}`;
    }
    if (appInfo) {
        appInfo = `[${appInfo}] `;
    }
    const sourceInfoParts = [];
    if (program) {
        sourceInfoParts.push(program);
    }
    if (file) {
        sourceInfoParts.push(file);
    }
    if (lineNumber) {
        sourceInfoParts.push(lineNumber);
    }
    let sourceInfo = !sourceInfoParts.length ? '' : `(${sourceInfoParts.join(':')}) `;
    if (satellite) sourceInfo += `[${satellite}]`;
    const stderrIndicator = stderr ? '(STDERR) ' : '';
    const timeString = Log.showTime ? `${dateStamp}-${timeStamp}${utcOffsetStr}${timeInexact ? '? ' : ' '}` : ' ';
    const metaPrefix = [
        level.charAt(0).toUpperCase(),
        timeString,
        appInfo,
        sourceInfo,
        stderrIndicator
    ].join('');
    return Formatter.prettify(metaPrefix, options.color && platformColor(options.metaColor || META_COLOR)) + Formatter.prettify(message, options.color && platformColor(LEVEL_COLORS[level]));
};
// Turn a line of text into a loggable object.
// @param line {String}
// @param override {Object}
Log.objFromText = (line, override)=>{
    return _object_spread({
        message: line,
        level: 'info',
        time: new Date(),
        timeInexact: true
    }, override);
};


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"logging_server.js":function module(require){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/logging/logging_server.js                                                                                //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
Formatter = {};
Formatter.prettify = function(line, color) {
    if (!color) return line;
    return require("chalk")[color](line);
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"chalk":{"package.json":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// node_modules/meteor/logging/node_modules/chalk/package.json                                                       //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.exports = {
  "name": "chalk",
  "version": "4.1.2",
  "main": "source"
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"source":{"index.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// node_modules/meteor/logging/node_modules/chalk/source/index.js                                                    //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.useNode();
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}}},{
  "extensions": [
    ".js",
    ".json",
    ".ts"
  ]
});


/* Exports */
return {
  export: function () { return {
      Log: Log
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/logging/logging.js",
    "/node_modules/meteor/logging/logging_server.js"
  ],
  mainModulePath: "/node_modules/meteor/logging/logging.js"
}});

//# sourceURL=meteor://💻app/packages/logging.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbG9nZ2luZy9sb2dnaW5nLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9sb2dnaW5nL2xvZ2dpbmdfc2VydmVyLmpzIl0sIm5hbWVzIjpbImhhc093biIsIk9iamVjdCIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiTG9nIiwiYXJncyIsImluZm8iLCJpbnRlcmNlcHQiLCJpbnRlcmNlcHRlZExpbmVzIiwic3VwcHJlc3MiLCJfaW50ZXJjZXB0IiwiY291bnQiLCJfc3VwcHJlc3MiLCJfaW50ZXJjZXB0ZWQiLCJsaW5lcyIsIm91dHB1dEZvcm1hdCIsInNob3dUaW1lIiwiTEVWRUxfQ09MT1JTIiwiZGVidWciLCJ3YXJuIiwiZXJyb3IiLCJNRVRBX0NPTE9SIiwiaXNXaW4zMiIsInByb2Nlc3MiLCJwbGF0Zm9ybSIsInBsYXRmb3JtQ29sb3IiLCJjb2xvciIsImVuZHNXaXRoIiwiUkVTVFJJQ1RFRF9LRVlTIiwiRk9STUFUVEVEX0tFWVMiLCJsb2dJbkJyb3dzZXIiLCJvYmoiLCJzdHIiLCJmb3JtYXQiLCJsZXZlbCIsImNvbnNvbGUiLCJsb2ciLCJhcHBseSIsIkZ1bmN0aW9uIiwiYmluZCIsImNhbGwiLCJfZ2V0Q2FsbGVyRGV0YWlscyIsImdldFN0YWNrIiwiZXJyIiwiRXJyb3IiLCJzdGFjayIsImxpbmUiLCJzcGxpdCIsInNsaWNlIiwibWF0Y2giLCJmaWxlIiwiZGV0YWlscyIsImV4ZWMiLCJmb3JFYWNoIiwiYXJnIiwiaW50ZXJjZXB0ZWQiLCJSZWdFeHAiLCJEYXRlIiwibWVzc2FnZSIsIlN0cmluZyIsInRvU3RyaW5nIiwia2V5Iiwib21pdENhbGxlckRldGFpbHMiLCJ0aW1lIiwiTWV0ZW9yIiwiaXNQcm9kdWN0aW9uIiwicHVzaCIsIkVKU09OIiwic3RyaW5naWZ5IiwiaXNTZXJ2ZXIiLCJwYXJzZSIsInN0YXJ0c1dpdGgiLCJlIiwib3B0aW9ucyIsInRpbWVJbmV4YWN0IiwibGluZU51bWJlciIsImFwcCIsImFwcE5hbWUiLCJvcmlnaW5BcHAiLCJwcm9ncmFtIiwic2F0ZWxsaXRlIiwic3RkZXJyIiwia2V5cyIsImxlbmd0aCIsInBhZDIiLCJuIiwicGFkU3RhcnQiLCJwYWQzIiwiZGF0ZVN0YW1wIiwiZ2V0RnVsbFllYXIiLCJnZXRNb250aCIsImdldERhdGUiLCJ0aW1lU3RhbXAiLCJnZXRIb3VycyIsImdldE1pbnV0ZXMiLCJnZXRTZWNvbmRzIiwiZ2V0TWlsbGlzZWNvbmRzIiwidXRjT2Zmc2V0U3RyIiwiZ2V0VGltZXpvbmVPZmZzZXQiLCJhcHBJbmZvIiwic291cmNlSW5mb1BhcnRzIiwic291cmNlSW5mbyIsImpvaW4iLCJzdGRlcnJJbmRpY2F0b3IiLCJ0aW1lU3RyaW5nIiwibWV0YVByZWZpeCIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwiRm9ybWF0dGVyIiwicHJldHRpZnkiLCJtZXRhQ29sb3IiLCJvYmpGcm9tVGV4dCIsIm92ZXJyaWRlIiwicmVxdWlyZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUF1QztBQUV2QyxNQUFNQSxTQUFTQyxPQUFPQyxTQUFTLENBQUNDLGNBQWM7QUFFOUMsU0FBU0MsSUFBSSxHQUFHQyxJQUFJO0lBQ2xCRCxJQUFJRSxJQUFJLElBQUlEO0FBQ2Q7QUFFQSxlQUFlO0FBQ2YsSUFBSUUsWUFBWTtBQUNoQixJQUFJQyxtQkFBbUIsRUFBRTtBQUN6QixJQUFJQyxXQUFXO0FBRWYsaUVBQWlFO0FBQ2pFLGtFQUFrRTtBQUNsRSxzQkFBc0I7QUFDdEJMLElBQUlNLFVBQVUsR0FBRyxDQUFDQztJQUNoQkosYUFBYUk7QUFDZjtBQUVBLHNFQUFzRTtBQUN0RSxtRUFBbUU7QUFDbkUsa0NBQWtDO0FBQ2xDUCxJQUFJUSxTQUFTLEdBQUcsQ0FBQ0Q7SUFDZkYsWUFBWUU7QUFDZDtBQUVBLDhEQUE4RDtBQUM5RFAsSUFBSVMsWUFBWSxHQUFHO0lBQ2pCLE1BQU1DLFFBQVFOO0lBQ2RBLG1CQUFtQixFQUFFO0lBQ3JC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QjtBQUN2QiwyQkFBMkI7QUFDM0I5QixJQUFJMkcsV0FBVyxHQUFHLENBQUNqRSxNQUFNa0U7SUFDdkIsT0FBTztRQUNMdEQsU0FBU1o7UUFDVFosT0FBTztRQUNQNkIsTUFBTSxJQUFJTjtRQUNWaUIsYUFBYTtPQUNWc0M7QUFFUDtBQUVlOzs7Ozs7Ozs7Ozs7QUM5VWZKLFlBQVksQ0FBQztBQUNiQSxVQUFVQyxRQUFRLEdBQUcsU0FBUy9ELElBQUksRUFBRXBCLEtBQUs7SUFDckMsSUFBRyxDQUFDQSxPQUFPLE9BQU9vQjtJQUNsQixPQUFPbUUsUUFBUSxRQUFRLENBQUN2RixNQUFNLENBQUNvQjtBQUNuQyIsImZpbGUiOiIvcGFja2FnZXMvbG9nZ2luZy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuXG5jb25zdCBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG5mdW5jdGlvbiBMb2coLi4uYXJncykge1xuICBMb2cuaW5mbyguLi5hcmdzKTtcbn1cblxuLy8vIEZPUiBURVNUSU5HXG5sZXQgaW50ZXJjZXB0ID0gMDtcbmxldCBpbnRlcmNlcHRlZExpbmVzID0gW107XG5sZXQgc3VwcHJlc3MgPSAwO1xuXG4vLyBJbnRlcmNlcHQgdGhlIG5leHQgJ2NvdW50JyBjYWxscyB0byBhIExvZyBmdW5jdGlvbi4gVGhlIGFjdHVhbFxuLy8gbGluZXMgcHJpbnRlZCB0byB0aGUgY29uc29sZSBjYW4gYmUgY2xlYXJlZCBhbmQgcmVhZCBieSBjYWxsaW5nXG4vLyBMb2cuX2ludGVyY2VwdGVkKCkuXG5Mb2cuX2ludGVyY2VwdCA9IChjb3VudCkgPT4ge1xuICBpbnRlcmNlcHQgKz0gY291bnQ7XG59O1xuXG4vLyBTdXBwcmVzcyB0aGUgbmV4dCAnY291bnQnIGNhbGxzIHRvIGEgTG9nIGZ1bmN0aW9uLiBVc2UgdGhpcyB0byBzdG9wXG4vLyB0ZXN0cyBmcm9tIHNwYW1taW5nIHRoZSBjb25zb2xlLCBlc3BlY2lhbGx5IHdpdGggcmVkIGVycm9ycyB0aGF0XG4vLyBtaWdodCBsb29rIGxpa2UgYSBmYWlsaW5nIHRlc3QuXG5Mb2cuX3N1cHByZXNzID0gKGNvdW50KSA9PiB7XG4gIHN1cHByZXNzICs9IGNvdW50O1xufTtcblxuLy8gUmV0dXJucyBpbnRlcmNlcHRlZCBsaW5lcyBhbmQgcmVzZXRzIHRoZSBpbnRlcmNlcHQgY291bnRlci5cbkxvZy5faW50ZXJjZXB0ZWQgPSAoKSA9PiB7XG4gIGNvbnN0IGxpbmVzID0gaW50ZXJjZXB0ZWRMaW5lcztcbiAgaW50ZXJjZXB0ZWRMaW5lcyA9IFtdO1xuICBpbnRlcmNlcHQgPSAwO1xuICByZXR1cm4gbGluZXM7XG59O1xuXG4vLyBFaXRoZXIgJ2pzb24nIG9yICdjb2xvcmVkLXRleHQnLlxuLy9cbi8vIFdoZW4gdGhpcyBpcyBzZXQgdG8gJ2pzb24nLCBwcmludCBKU09OIGRvY3VtZW50cyB0aGF0IGFyZSBwYXJzZWQgYnkgYW5vdGhlclxuLy8gcHJvY2VzcyAoJ3NhdGVsbGl0ZScgb3IgJ21ldGVvciBydW4nKS4gVGhpcyBvdGhlciBwcm9jZXNzIHNob3VsZCBjYWxsXG4vLyAnTG9nLmZvcm1hdCcgZm9yIG5pY2Ugb3V0cHV0LlxuLy9cbi8vIFdoZW4gdGhpcyBpcyBzZXQgdG8gJ2NvbG9yZWQtdGV4dCcsIGNhbGwgJ0xvZy5mb3JtYXQnIGJlZm9yZSBwcmludGluZy5cbi8vIFRoaXMgc2hvdWxkIGJlIHVzZWQgZm9yIGxvZ2dpbmcgZnJvbSB3aXRoaW4gc2F0ZWxsaXRlLCBzaW5jZSB0aGVyZSBpcyBub1xuLy8gb3RoZXIgcHJvY2VzcyB0aGF0IHdpbGwgYmUgcmVhZGluZyBpdHMgc3RhbmRhcmQgb3V0cHV0LlxuTG9nLm91dHB1dEZvcm1hdCA9ICdqc29uJztcblxuLy8gRGVmYXVsdHMgdG8gdHJ1ZSBmb3IgbG9jYWwgZGV2ZWxvcG1lbnQgYW5kIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5cbi8vIGZvciBjbG91ZCBlbnZpcm9ubWVudHMgaXMgaW50ZXJlc3RpbmcgdG8gbGVhdmUgaXQgZmFsc2UgYXMgbW9zdCBvZiB0aGVtIGhhdmUgdGhlIHRpbWVzdGFtcCBpbiB0aGUgY29uc29sZS5cbi8vIE9ubHkgd29ya3MgaW4gc2VydmVyIHdpdGggY29sb3JlZC10ZXh0XG5Mb2cuc2hvd1RpbWUgPSB0cnVlO1xuXG5jb25zdCBMRVZFTF9DT0xPUlMgPSB7XG4gIGRlYnVnOiAnZ3JlZW4nLFxuICAvLyBsZWF2ZSBpbmZvIGFzIHRoZSBkZWZhdWx0IGNvbG9yXG4gIHdhcm46ICdtYWdlbnRhJyxcbiAgZXJyb3I6ICdyZWQnXG59O1xuXG5jb25zdCBNRVRBX0NPTE9SID0gJ2JsdWUnO1xuXG4vLyBEZWZhdWx0IGNvbG9ycyBjYXVzZSByZWFkYWJpbGl0eSBwcm9ibGVtcyBvbiBXaW5kb3dzIFBvd2Vyc2hlbGwsXG4vLyBzd2l0Y2ggdG8gYnJpZ2h0IHZhcmlhbnRzLiBXaGlsZSBzdGlsbCBjYXBhYmxlIG9mIG1pbGxpb25zIG9mXG4vLyBvcGVyYXRpb25zIHBlciBzZWNvbmQsIHRoZSBiZW5jaG1hcmsgc2hvd2VkIGEgMjUlKyBpbmNyZWFzZSBpblxuLy8gb3BzIHBlciBzZWNvbmQgKG9uIE5vZGUgOCkgYnkgY2FjaGluZyBcInByb2Nlc3MucGxhdGZvcm1cIi5cbmNvbnN0IGlzV2luMzIgPSB0eXBlb2YgcHJvY2VzcyA9PT0gJ29iamVjdCcgJiYgcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJztcbmNvbnN0IHBsYXRmb3JtQ29sb3IgPSAoY29sb3IpID0+IHtcbiAgaWYgKGlzV2luMzIgJiYgdHlwZW9mIGNvbG9yID09PSAnc3RyaW5nJyAmJiAhY29sb3IuZW5kc1dpdGgoJ0JyaWdodCcpKSB7XG4gICAgcmV0dXJuIGAke2NvbG9yfUJyaWdodGA7XG4gIH1cbiAgcmV0dXJuIGNvbG9yO1xufTtcblxuLy8gWFhYIHBhY2thZ2VcbmNvbnN0IFJFU1RSSUNURURfS0VZUyA9IFsndGltZScsICd0aW1lSW5leGFjdCcsICdsZXZlbCcsICdmaWxlJywgJ2xpbmUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ3Byb2dyYW0nLCAnb3JpZ2luQXBwJywgJ3NhdGVsbGl0ZScsICdzdGRlcnInXTtcblxuY29uc3QgRk9STUFUVEVEX0tFWVMgPSBbLi4uUkVTVFJJQ1RFRF9LRVlTLCAnYXBwJywgJ21lc3NhZ2UnXTtcblxuY29uc3QgbG9nSW5Ccm93c2VyID0gb2JqID0+IHtcbiAgY29uc3Qgc3RyID0gTG9nLmZvcm1hdChvYmopO1xuXG4gIC8vIFhYWCBTb21lIGxldmVscyBzaG91bGQgYmUgcHJvYmFibHkgYmUgc2VudCB0byB0aGUgc2VydmVyXG4gIGNvbnN0IGxldmVsID0gb2JqLmxldmVsO1xuXG4gIGlmICgodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnKSAmJiBjb25zb2xlW2xldmVsXSkge1xuICAgIGNvbnNvbGVbbGV2ZWxdKHN0cik7XG4gIH0gZWxzZSB7XG4gICAgLy8gSUUgZG9lc24ndCBoYXZlIGNvbnNvbGUubG9nLmFwcGx5LCBpdCdzIG5vdCBhIHJlYWwgT2JqZWN0LlxuICAgIC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTUzODk3Mi9jb25zb2xlLWxvZy1hcHBseS1ub3Qtd29ya2luZy1pbi1pZTlcbiAgICAvLyBodHRwOi8vcGF0aWsuY29tL2Jsb2cvY29tcGxldGUtY3Jvc3MtYnJvd3Nlci1jb25zb2xlLWxvZy9cbiAgICBpZiAodHlwZW9mIGNvbnNvbGUubG9nLmFwcGx5ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIC8vIE1vc3QgYnJvd3NlcnNcbiAgICAgIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIFtzdHJdKTtcblxuICAgIH0gZWxzZSBpZiAodHlwZW9mIEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIC8vIElFOVxuICAgICAgY29uc3QgbG9nID0gRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQuY2FsbChjb25zb2xlLmxvZywgY29uc29sZSk7XG4gICAgICBsb2cuYXBwbHkoY29uc29sZSwgW3N0cl0pO1xuICAgIH1cbiAgfVxufTtcblxuLy8gQHJldHVybnMge09iamVjdDogeyBsaW5lOiBOdW1iZXIsIGZpbGU6IFN0cmluZyB9fVxuTG9nLl9nZXRDYWxsZXJEZXRhaWxzID0gKCkgPT4ge1xuICBjb25zdCBnZXRTdGFjayA9ICgpID0+IHtcbiAgICAvLyBXZSBkbyBOT1QgdXNlIEVycm9yLnByZXBhcmVTdGFja1RyYWNlIGhlcmUgKGEgVjggZXh0ZW5zaW9uIHRoYXQgZ2V0cyB1cyBhXG4gICAgLy8gcHJlLXBhcnNlZCBzdGFjaykgc2luY2UgaXQncyBpbXBvc3NpYmxlIHRvIGNvbXBvc2UgaXQgd2l0aCB0aGUgdXNlIG9mXG4gICAgLy8gRXJyb3IucHJlcGFyZVN0YWNrVHJhY2UgdXNlZCBvbiB0aGUgc2VydmVyIGZvciBzb3VyY2UgbWFwcy5cbiAgICBjb25zdCBlcnIgPSBuZXcgRXJyb3I7XG4gICAgY29uc3Qgc3RhY2sgPSBlcnIuc3RhY2s7XG4gICAgcmV0dXJuIHN0YWNrO1xuICB9O1xuXG4gIGNvbnN0IHN0YWNrID0gZ2V0U3RhY2soKTtcblxuICBpZiAoIXN0YWNrKSByZXR1cm4ge307XG5cbiAgLy8gbG9va2luZyBmb3IgdGhlIGZpcnN0IGxpbmUgb3V0c2lkZSB0aGUgbG9nZ2luZyBwYWNrYWdlIChvciBhblxuICAvLyBldmFsIGlmIHdlIGZpbmQgdGhhdCBmaXJzdClcbiAgbGV0IGxpbmU7XG4gIGNvbnN0IGxpbmVzID0gc3RhY2suc3BsaXQoJ1xcbicpLnNsaWNlKDEpO1xuICBmb3IgKGxpbmUgb2YgbGluZXMpIHtcbiAgICBpZiAobGluZS5tYXRjaCgvXlxccyooYXQgZXZhbCBcXChldmFsKXwoZXZhbDopLykpIHtcbiAgICAgIHJldHVybiB7ZmlsZTogXCJldmFsXCJ9O1xuICAgIH1cblxuICAgIGlmICghbGluZS5tYXRjaCgvcGFja2FnZXNcXC8oPzpsb2NhbC10ZXN0WzpfXSk/bG9nZ2luZyg/OlxcL3xcXC5qcykvKSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgZGV0YWlscyA9IHt9O1xuXG4gIC8vIFRoZSBmb3JtYXQgZm9yIEZGIGlzICdmdW5jdGlvbk5hbWVAZmlsZVBhdGg6bGluZU51bWJlcidcbiAgLy8gVGhlIGZvcm1hdCBmb3IgVjggaXMgJ2Z1bmN0aW9uTmFtZSAocGFja2FnZXMvbG9nZ2luZy9sb2dnaW5nLmpzOjgxKScgb3JcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgJ3BhY2thZ2VzL2xvZ2dpbmcvbG9nZ2luZy5qczo4MSdcbiAgY29uc3QgbWF0Y2ggPSAvKD86W0AoXXwgYXQgKShbXihdKz8pOihbMC05Ol0rKSg/OlxcKXwkKS8uZXhlYyhsaW5lKTtcbiAgaWYgKCFtYXRjaCkge1xuICAgIHJldHVybiBkZXRhaWxzO1xuICB9XG5cbiAgLy8gaW4gY2FzZSB0aGUgbWF0Y2hlZCBibG9jayBoZXJlIGlzIGxpbmU6Y29sdW1uXG4gIGRldGFpbHMubGluZSA9IG1hdGNoWzJdLnNwbGl0KCc6JylbMF07XG5cbiAgLy8gUG9zc2libGUgZm9ybWF0OiBodHRwczovL2Zvby5iYXIuY29tL3NjcmlwdHMvZmlsZS5qcz9yYW5kb209Zm9vYmFyXG4gIC8vIFhYWDogaWYgeW91IGNhbiB3cml0ZSB0aGUgZm9sbG93aW5nIGluIGJldHRlciB3YXksIHBsZWFzZSBkbyBpdFxuICAvLyBYWFg6IHdoYXQgYWJvdXQgZXZhbHM/XG4gIGRldGFpbHMuZmlsZSA9IG1hdGNoWzFdLnNwbGl0KCcvJykuc2xpY2UoLTEpWzBdLnNwbGl0KCc/JylbMF07XG5cbiAgcmV0dXJuIGRldGFpbHM7XG59O1xuXG5bJ2RlYnVnJywgJ2luZm8nLCAnd2FybicsICdlcnJvciddLmZvckVhY2goKGxldmVsKSA9PiB7XG4gLy8gQHBhcmFtIGFyZyB7U3RyaW5nfE9iamVjdH1cbiBMb2dbbGV2ZWxdID0gKGFyZykgPT4ge1xuICBpZiAoc3VwcHJlc3MpIHtcbiAgICBzdXBwcmVzcy0tO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGxldCBpbnRlcmNlcHRlZCA9IGZhbHNlO1xuICBpZiAoaW50ZXJjZXB0KSB7XG4gICAgaW50ZXJjZXB0LS07XG4gICAgaW50ZXJjZXB0ZWQgPSB0cnVlO1xuICB9XG5cbiAgbGV0IG9iaiA9IChhcmcgPT09IE9iamVjdChhcmcpXG4gICAgJiYgIShhcmcgaW5zdGFuY2VvZiBSZWdFeHApXG4gICAgJiYgIShhcmcgaW5zdGFuY2VvZiBEYXRlKSlcbiAgICA/IGFyZ1xuICAgIDogeyBtZXNzYWdlOiBuZXcgU3RyaW5nKGFyZykudG9TdHJpbmcoKSB9O1xuXG4gIFJFU1RSSUNURURfS0VZUy5mb3JFYWNoKGtleSA9PiB7XG4gICAgaWYgKG9ialtrZXldKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbid0IHNldCAnJHtrZXl9JyBpbiBsb2cgbWVzc2FnZWApO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKGhhc093bi5jYWxsKG9iaiwgJ21lc3NhZ2UnKSAmJiB0eXBlb2Ygb2JqLm1lc3NhZ2UgIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlICdtZXNzYWdlJyBmaWVsZCBpbiBsb2cgb2JqZWN0cyBtdXN0IGJlIGEgc3RyaW5nXCIpO1xuICB9XG5cbiAgaWYgKCFvYmoub21pdENhbGxlckRldGFpbHMpIHtcbiAgICBvYmogPSB7IC4uLkxvZy5fZ2V0Q2FsbGVyRGV0YWlscygpLCAuLi5vYmogfTtcbiAgfVxuXG4gIG9iai50aW1lID0gbmV3IERhdGUoKTtcbiAgb2JqLmxldmVsID0gbGV2ZWw7XG5cbiAgLy8gSWYgd2UgYXJlIGluIHByb2R1Y3Rpb24gZG9uJ3Qgd3JpdGUgb3V0IGRlYnVnIGxvZ3MuXG4gIGlmIChsZXZlbCA9PT0gJ2RlYnVnJyAmJiBNZXRlb3IuaXNQcm9kdWN0aW9uKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKGludGVyY2VwdGVkKSB7XG4gICAgaW50ZXJjZXB0ZWRMaW5lcy5wdXNoKEVKU09OLnN0cmluZ2lmeShvYmopKTtcbiAgfSBlbHNlIGlmIChNZXRlb3IuaXNTZXJ2ZXIpIHtcbiAgICBpZiAoTG9nLm91dHB1dEZvcm1hdCA9PT0gJ2NvbG9yZWQtdGV4dCcpIHtcbiAgICAgIGNvbnNvbGUubG9nKExvZy5mb3JtYXQob2JqLCB7Y29sb3I6IHRydWV9KSk7XG4gICAgfSBlbHNlIGlmIChMb2cub3V0cHV0Rm9ybWF0ID09PSAnanNvbicpIHtcbiAgICAgIGNvbnNvbGUubG9nKEVKU09OLnN0cmluZ2lmeShvYmopKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGxvZ2dpbmcgb3V0cHV0IGZvcm1hdDogJHtMb2cub3V0cHV0Rm9ybWF0fWApO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBsb2dJbkJyb3dzZXIob2JqKTtcbiAgfVxufTtcbn0pO1xuXG5cbi8vIHRyaWVzIHRvIHBhcnNlIGxpbmUgYXMgRUpTT04uIHJldHVybnMgb2JqZWN0IGlmIHBhcnNlIGlzIHN1Y2Nlc3NmdWwsIG9yIG51bGwgaWYgbm90XG5Mb2cucGFyc2UgPSAobGluZSkgPT4ge1xuICBsZXQgb2JqID0gbnVsbDtcbiAgaWYgKGxpbmUgJiYgbGluZS5zdGFydHNXaXRoKCd7JykpIHsgLy8gbWlnaHQgYmUganNvbiBnZW5lcmF0ZWQgZnJvbSBjYWxsaW5nICdMb2cnXG4gICAgdHJ5IHsgb2JqID0gRUpTT04ucGFyc2UobGluZSk7IH0gY2F0Y2ggKGUpIHt9XG4gIH1cblxuICAvLyBYWFggc2hvdWxkIHByb2JhYmx5IGNoZWNrIGZpZWxkcyBvdGhlciB0aGFuICd0aW1lJ1xuICBpZiAob2JqICYmIG9iai50aW1lICYmIChvYmoudGltZSBpbnN0YW5jZW9mIERhdGUpKSB7XG4gICAgcmV0dXJuIG9iajtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufTtcblxuLy8gZm9ybWF0cyBhIGxvZyBvYmplY3QgaW50byBjb2xvcmVkIGh1bWFuIGFuZCBtYWNoaW5lLXJlYWRhYmxlIHRleHRcbkxvZy5mb3JtYXQgPSAob2JqLCBvcHRpb25zID0ge30pID0+IHtcbiAgb2JqID0geyAuLi5vYmogfTsgLy8gZG9uJ3QgbXV0YXRlIHRoZSBhcmd1bWVudFxuICBsZXQge1xuICAgIHRpbWUsXG4gICAgdGltZUluZXhhY3QsXG4gICAgbGV2ZWwgPSAnaW5mbycsXG4gICAgZmlsZSxcbiAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgIGFwcDogYXBwTmFtZSA9ICcnLFxuICAgIG9yaWdpbkFwcCxcbiAgICBtZXNzYWdlID0gJycsXG4gICAgcHJvZ3JhbSA9ICcnLFxuICAgIHNhdGVsbGl0ZSA9ICcnLFxuICAgIHN0ZGVyciA9ICcnLFxuICB9ID0gb2JqO1xuXG4gIGlmICghKHRpbWUgaW5zdGFuY2VvZiBEYXRlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIid0aW1lJyBtdXN0IGJlIGEgRGF0ZSBvYmplY3RcIik7XG4gIH1cblxuICBGT1JNQVRURURfS0VZUy5mb3JFYWNoKChrZXkpID0+IHsgZGVsZXRlIG9ialtrZXldOyB9KTtcblxuICBpZiAoT2JqZWN0LmtleXMob2JqKS5sZW5ndGggPiAwKSB7XG4gICAgaWYgKG1lc3NhZ2UpIHtcbiAgICAgIG1lc3NhZ2UgKz0gJyAnO1xuICAgIH1cbiAgICBtZXNzYWdlICs9IEVKU09OLnN0cmluZ2lmeShvYmopO1xuICB9XG5cbiAgY29uc3QgcGFkMiA9IG4gPT4gbi50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJyk7XG4gIGNvbnN0IHBhZDMgPSBuID0+IG4udG9TdHJpbmcoKS5wYWRTdGFydCgzLCAnMCcpO1xuXG4gIGNvbnN0IGRhdGVTdGFtcCA9IHRpbWUuZ2V0RnVsbFllYXIoKS50b1N0cmluZygpICtcbiAgICBwYWQyKHRpbWUuZ2V0TW9udGgoKSArIDEgLyowLWJhc2VkKi8pICtcbiAgICBwYWQyKHRpbWUuZ2V0RGF0ZSgpKTtcbiAgY29uc3QgdGltZVN0YW1wID0gcGFkMih0aW1lLmdldEhvdXJzKCkpICtcbiAgICAgICAgJzonICtcbiAgICAgICAgcGFkMih0aW1lLmdldE1pbnV0ZXMoKSkgK1xuICAgICAgICAnOicgK1xuICAgICAgICBwYWQyKHRpbWUuZ2V0U2Vjb25kcygpKSArXG4gICAgICAgICcuJyArXG4gICAgICAgIHBhZDModGltZS5nZXRNaWxsaXNlY29uZHMoKSk7XG5cbiAgLy8gZWcgaW4gU2FuIEZyYW5jaXNjbyBpbiBKdW5lIHRoaXMgd2lsbCBiZSAnKC03KSdcbiAgY29uc3QgdXRjT2Zmc2V0U3RyID0gYCgkeygtKG5ldyBEYXRlKCkuZ2V0VGltZXpvbmVPZmZzZXQoKSAvIDYwKSl9KWA7XG5cbiAgbGV0IGFwcEluZm8gPSAnJztcbiAgaWYgKGFwcE5hbWUpIHtcbiAgICBhcHBJbmZvICs9IGFwcE5hbWU7XG4gIH1cbiAgaWYgKG9yaWdpbkFwcCAmJiBvcmlnaW5BcHAgIT09IGFwcE5hbWUpIHtcbiAgICBhcHBJbmZvICs9IGAgdmlhICR7b3JpZ2luQXBwfWA7XG4gIH1cbiAgaWYgKGFwcEluZm8pIHtcbiAgICBhcHBJbmZvID0gYFske2FwcEluZm99XSBgO1xuICB9XG5cbiAgY29uc3Qgc291cmNlSW5mb1BhcnRzID0gW107XG4gIGlmIChwcm9ncmFtKSB7XG4gICAgc291cmNlSW5mb1BhcnRzLnB1c2gocHJvZ3JhbSk7XG4gIH1cbiAgaWYgKGZpbGUpIHtcbiAgICBzb3VyY2VJbmZvUGFydHMucHVzaChmaWxlKTtcbiAgfVxuICBpZiAobGluZU51bWJlcikge1xuICAgIHNvdXJjZUluZm9QYXJ0cy5wdXNoKGxpbmVOdW1iZXIpO1xuICB9XG5cbiAgbGV0IHNvdXJjZUluZm8gPSAhc291cmNlSW5mb1BhcnRzLmxlbmd0aCA/XG4gICAgJycgOiBgKCR7c291cmNlSW5mb1BhcnRzLmpvaW4oJzonKX0pIGA7XG5cbiAgaWYgKHNhdGVsbGl0ZSlcbiAgICBzb3VyY2VJbmZvICs9IGBbJHtzYXRlbGxpdGV9XWA7XG5cbiAgY29uc3Qgc3RkZXJySW5kaWNhdG9yID0gc3RkZXJyID8gJyhTVERFUlIpICcgOiAnJztcblxuICBjb25zdCB0aW1lU3RyaW5nID0gTG9nLnNob3dUaW1lXG4gICAgPyBgJHtkYXRlU3RhbXB9LSR7dGltZVN0YW1wfSR7dXRjT2Zmc2V0U3RyfSR7dGltZUluZXhhY3QgPyAnPyAnIDogJyAnfWBcbiAgICA6ICcgJztcblxuXG5cbiAgY29uc3QgbWV0YVByZWZpeCA9IFtcbiAgICBsZXZlbC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSxcbiAgICB0aW1lU3RyaW5nLFxuICAgIGFwcEluZm8sXG4gICAgc291cmNlSW5mbyxcbiAgICBzdGRlcnJJbmRpY2F0b3JdLmpvaW4oJycpO1xuXG5cbiAgcmV0dXJuIEZvcm1hdHRlci5wcmV0dGlmeShtZXRhUHJlZml4LCBvcHRpb25zLmNvbG9yICYmIHBsYXRmb3JtQ29sb3Iob3B0aW9ucy5tZXRhQ29sb3IgfHwgTUVUQV9DT0xPUikpICtcbiAgICAgIEZvcm1hdHRlci5wcmV0dGlmeShtZXNzYWdlLCBvcHRpb25zLmNvbG9yICYmIHBsYXRmb3JtQ29sb3IoTEVWRUxfQ09MT1JTW2xldmVsXSkpO1xufTtcblxuLy8gVHVybiBhIGxpbmUgb2YgdGV4dCBpbnRvIGEgbG9nZ2FibGUgb2JqZWN0LlxuLy8gQHBhcmFtIGxpbmUge1N0cmluZ31cbi8vIEBwYXJhbSBvdmVycmlkZSB7T2JqZWN0fVxuTG9nLm9iakZyb21UZXh0ID0gKGxpbmUsIG92ZXJyaWRlKSA9PiB7XG4gIHJldHVybiB7XG4gICAgbWVzc2FnZTogbGluZSxcbiAgICBsZXZlbDogJ2luZm8nLFxuICAgIHRpbWU6IG5ldyBEYXRlKCksXG4gICAgdGltZUluZXhhY3Q6IHRydWUsXG4gICAgLi4ub3ZlcnJpZGVcbiAgfTtcbn07XG5cbmV4cG9ydCB7IExvZyB9O1xuIiwiRm9ybWF0dGVyID0ge307XG5Gb3JtYXR0ZXIucHJldHRpZnkgPSBmdW5jdGlvbihsaW5lLCBjb2xvcil7XG4gICAgaWYoIWNvbG9yKSByZXR1cm4gbGluZTtcbiAgICByZXR1cm4gcmVxdWlyZShcImNoYWxrXCIpW2NvbG9yXShsaW5lKTtcbn07XG4iXX0=
