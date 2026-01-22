Package["core-runtime"].queue("shell-server",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var ECMAScript = Package.ecmascript.ECMAScript;
var Babel = Package['babel-compiler'].Babel;
var BabelCompiler = Package['babel-compiler'].BabelCompiler;
var SwcCompiler = Package['babel-compiler'].SwcCompiler;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"shell-server":{"main.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/shell-server/main.js                                                                                     //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.link("./shell-server.js",{"*":"*"},0);let listen;module.link("./shell-server.js",{listen(v){listen=v}},1);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();

const shellDir = process.env.METEOR_SHELL_DIR;
if (shellDir) {
    listen(shellDir);
}
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"shell-server.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/shell-server/shell-server.js                                                                             //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({listen:()=>listen,disable:()=>disable});let assert;module.link("assert",{default(v){assert=v}},0);let pathJoin;module.link("path",{join(v){pathJoin=v}},1);let PassThrough;module.link("stream",{PassThrough(v){PassThrough=v}},2);let closeSync,openSync,readFileSync,unlink,writeFileSync,writeSync;module.link("fs",{closeSync(v){closeSync=v},openSync(v){openSync=v},readFileSync(v){readFileSync=v},unlink(v){unlink=v},writeFileSync(v){writeFileSync=v},writeSync(v){writeSync=v}},3);let createServer;module.link("net",{createServer(v){createServer=v}},4);let replStart;module.link("repl",{start(v){replStart=v}},5);module.link("meteor/inter-process-messaging");if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();





// Enable process.sendMessage for communication with build process.

const INFO_FILE_MODE = parseInt("600", 8); // Only the owner can read or write.
const EXITING_MESSAGE = "Shell exiting...";
// Invoked by the server process to listen for incoming connections from
// shell clients. Each connection gets its own REPL instance.
function listen(shellDir) {
    function callback() {
        new Server(shellDir).listen();
    }
    // If the server is still in the very early stages of starting up,
    // Meteor.startup may not available yet.
    if (typeof Meteor === "object") {
        Meteor.startup(callback);
    } else if (typeof __meteor_bootstrap__ === "object") {
        const hooks = __meteor_bootstrap__.startupHooks;
        if (hooks) {
            hooks.push(callback);
        } else {
            // As a fallback, just call the callback asynchronously.
            setImmediate(callback);
        }
    }
}
// Disabling the shell causes all attached clients to disconnect and exit.
function disable(shellDir) {
    try {
        // Replace info.json with a file that says the shell server is
        // disabled, so that any connected shell clients will fail to
        // reconnect after the server process closes their sockets.
        writeFileSync(getInfoFile(shellDir), JSON.stringify({
            status: "disabled",
            reason: "Shell server has shut down."
        }) + "\n", {
            mode: INFO_FILE_MODE
        });
    } catch (ignored) {}
}
// Shell commands need to be executed in a Fiber in case they call into
// code that yields. Using a Promise is an even better idea, since it runs
// its callbacks in Fibers drawn from a pool, so the Fibers are recycled.
const evalCommandPromise = Promise.resolve();
class Server {
    listen() {
        const infoFile = getInfoFile(this.shellDir);
        unlink(infoFile, ()=>{
            this.server.listen(0, "127.0.0.1", ()=>{
                writeFileSync(infoFile, JSON.stringify({
                    status: "enabled",
                    port: this.server.address().port,
                    key: this.key
                }) + "\n", {
                    mode: INFO_FILE_MODE
                });
            });
        });
    }
    onConnection(socket) {
        // Make sure this function doesn't try to write anything to the socket
        // after it has been closed.
        socket.on("close", function() {
            socket = null;
        });
        // If communication is not established within 1000ms of the first
        // connection, forcibly close the socket.
        const timeout = setTimeout(function() {
            if (socket) {
                socket.removeAllListeners("data");
                socket.end(EXITING_MESSAGE + "\n");
            }
        }, 1000);
        // Let connecting clients configure certain REPL options by sending a
        // JSON object over the socket. For example, only the client knows
        // whether it's running a TTY or an Emacs subshell or some other kind of
        // terminal, so the client must decide the value of options.terminal.
        readJSONFromStream(socket, (error, options, replInputSocket)=>{
            clearTimeout(timeout);
            if (error) {
                socket = null;
                console.error(error.stack);
                return;
            }
            if (options.key !== this.key) {
                if (socket) {
                    socket.end(EXITING_MESSAGE + "\n");
                }
                return;
            }
            delete options.key;
            // Set the columns to what is being requested by the client.
            if (options.columns && socket) {
                socket.columns = options.columns;
            }
            delete options.columns;
            options = Object.assign(Object.create(null), // Defaults for configurable options.
            {
                prompt: "> ",
                terminal: true,
                useColors: true,
                ignoreUndefined: true
            }, // Configurable options
            options, // Immutable options.
            {
                input: replInputSocket,
                useGlobal: false,
                output: socket
            });
            // The prompt during an evaluateAndExit must be blank to ensure
            // that the prompt doesn't inadvertently get parsed as part of
            // the JSON communication channel.
            if (options.evaluateAndExit) {
                options.prompt = "";
            }
            // Start the REPL.
            this.startREPL(options);
            if (options.evaluateAndExit) {
                this._wrappedDefaultEval.call(Object.create(null), options.evaluateAndExit.command, global, options.evaluateAndExit.filename || "<meteor shell>", function(error, result) {
                    if (socket) {
                        function sendResultToSocket(message) {
                            // Sending back a JSON payload allows the client to
                            // distinguish between errors and successful results.
                            socket.end(JSON.stringify(message) + "\n");
                        }
                        if (error) {
                            sendResultToSocket({
                                error: error.toString(),
                                code: 1
                            });
                        } else {
                            sendResultToSocket({
                                result
                            });
                        }
                    }
                });
                return;
            }
            delete options.evaluateAndExit;
            this.enableInteractiveMode(options);
        });
    }
    startREPL(options) {
        // Make sure this function doesn't try to write anything to the output
        // stream after it has been closed.
        options.output.on("close", function() {
            options.output = null;
        });
        const repl = this.repl = replStart(options);
        const { shellDir } = this;
        // This is technique of setting `repl.context` is similar to how the
        // `useGlobal` option would work during a normal `repl.start()` and
        // allows shell access (and tab completion!) to Meteor globals (i.e.
        // Underscore _, Meteor, etc.). By using this technique, which changes
        // the context after startup, we avoid stomping on the special `_`
        // variable (in `repl` this equals the value of the last command) from
        // being overridden in the client/server socket-handshaking.  Furthermore,
        // by setting `useGlobal` back to true, we allow the default eval function
        // to use the desired `runInThisContext` method (https://git.io/vbvAB).
        repl.context = global;
        repl.useGlobal = true;
        setRequireAndModule(repl.context);
        // In order to avoid duplicating code here, specifically the complexities
        // of catching so-called "Recoverable Errors" (https://git.io/vbvbl),
        // we will wrap the default eval, run it in a Fiber (via a Promise), and
        // give it the opportunity to decide if the user is mid-code-block.
        const defaultEval = repl.eval;
        function wrappedDefaultEval(code, context, file, callback) {
            if (Package['babel-compiler']) {
                try {
                    code = Package['babel-compiler'].Babel.compileForShell(code, {
                        cacheDirectory: getCacheDirectory(shellDir)
                    });
                } catch (err) {
                // Any Babel error here might be just fine since it's
                // possible the code was incomplete (multi-line code on the REPL).
                // The defaultEval below will use its own functionality to determine
                // if this error is "recoverable".
                }
            }
            evalCommandPromise.then(()=>defaultEval(code, context, file, (error, result)=>{
                    if (error) {
                        callback(error);
                    } else {
                        // Check if the result is a Promise
                        if (result && typeof result.then === 'function') {
                            // Handle the Promise resolution and rejection
                            result.then((resolvedResult)=>{
                                callback(null, resolvedResult);
                            }).catch((rejectedError)=>{
                                callback(rejectedError);
                            });
                        } else {
                            callback(null, result);
                        }
                    }
                })).catch(callback);
        }
        // Have the REPL use the newly wrapped function instead and store the
        // _wrappedDefaultEval so that evalulateAndExit calls can use it directly.
        repl.eval = this._wrappedDefaultEval = wrappedDefaultEval;
    }
    enableInteractiveMode(options) {
        // History persists across shell sessions!
        this.initializeHistory();
        const repl = this.repl;
        // Implement an alternate means of fetching the return value,
        // via `__` (double underscore) as originally implemented in:
        // https://github.com/meteor/meteor/commit/2443d832265c7d1c
        Object.defineProperty(repl.context, "__", {
            get: ()=>repl.last,
            set: (val)=>{
                repl.last = val;
            },
            // Allow this property to be (re)defined more than once (e.g. each
            // time the server restarts).
            configurable: true
        });
        // Some improvements to the existing help messages.
        function addHelp(cmd, helpText) {
            const info = repl.commands[cmd] || repl.commands["." + cmd];
            if (info) {
                info.help = helpText;
            }
        }
        addHelp("break", "Terminate current command input and display new prompt");
        addHelp("exit", "Disconnect from server and leave shell");
        addHelp("help", "Show this help information");
        // When the REPL exits, signal the attached client to exit by sending it
        // the special EXITING_MESSAGE.
        repl.on("exit", function() {
            if (options.output) {
                options.output.write(EXITING_MESSAGE + "\n");
                options.output.end();
            }
        });
        // When the server process exits, end the output stream but do not
        // signal the attached client to exit.
        process.on("exit", function() {
            if (options.output) {
                options.output.end();
            }
        });
        // This Meteor-specific shell command rebuilds the application as if a
        // change was made to server code.
        repl.defineCommand("reload", {
            help: "Restart the server and the shell",
            action: function() {
                if (process.sendMessage) {
                    process.sendMessage("shell-server", {
                        command: "reload"
                    });
                } else {
                    process.exit(0);
                }
            }
        });
    }
    // This function allows a persistent history of shell commands to be saved
    // to and loaded from .meteor/local/shell/history.
    initializeHistory() {
        const repl = this.repl;
        const historyFile = getHistoryFile(this.shellDir);
        let historyFd = openSync(historyFile, "a+");
        const historyLines = readFileSync(historyFile, "utf8").split("\n");
        const seenLines = Object.create(null);
        if (!repl.history) {
            repl.history = [];
            repl.historyIndex = -1;
        }
        while(repl.history && historyLines.length > 0){
            const line = historyLines.pop();
            if (line && /\S/.test(line) && !seenLines[line]) {
                repl.history.push(line);
                seenLines[line] = true;
            }
        }
        repl.addListener("line", function(line) {
            if (historyFd >= 0 && /\S/.test(line)) {
                writeSync(historyFd, line + "\n");
            }
        });
        this.repl.on("exit", function() {
            closeSync(historyFd);
            historyFd = -1;
        });
    }
    constructor(shellDir){
        assert.ok(this instanceof Server);
        this.shellDir = shellDir;
        this.key = Math.random().toString(36).slice(2);
        this.server = createServer((socket)=>{
            this.onConnection(socket);
        }).on("error", (err)=>{
            console.error(err.stack);
        });
    }
}
function readJSONFromStream(inputStream, callback) {
    const outputStream = new PassThrough();
    let dataSoFar = "";
    function onData(buffer) {
        const lines = buffer.toString("utf8").split("\n");
        while(lines.length > 0){
            dataSoFar += lines.shift();
            let json;
            try {
                json = JSON.parse(dataSoFar);
            } catch (error) {
                if (error instanceof SyntaxError) {
                    continue;
                }
                return finish(error);
            }
            if (lines.length > 0) {
                outputStream.write(lines.join("\n"));
            }
            inputStream.pipe(outputStream);
            return finish(null, json);
        }
    }
    function onClose() {
        finish(new Error("stream unexpectedly closed"));
    }
    let finished = false;
    function finish(error, json) {
        if (!finished) {
            finished = true;
            inputStream.removeListener("data", onData);
            inputStream.removeListener("error", finish);
            inputStream.removeListener("close", onClose);
            callback(error, json, outputStream);
        }
    }
    inputStream.on("data", onData);
    inputStream.on("error", finish);
    inputStream.on("close", onClose);
}
function getInfoFile(shellDir) {
    return pathJoin(shellDir, "info.json");
}
function getHistoryFile(shellDir) {
    return pathJoin(shellDir, "history");
}
function getCacheDirectory(shellDir) {
    return pathJoin(shellDir, "cache");
}
function setRequireAndModule(context) {
    if (Package.modules) {
        // Use the same `require` function and `module` object visible to the
        // application.
        const toBeInstalled = {};
        const shellModuleName = "meteor-shell-" + Math.random().toString(36).slice(2) + ".js";
        toBeInstalled[shellModuleName] = function(require, exports, module) {
            context.module = module;
            context.require = require;
            // Tab completion sometimes uses require.extensions, but only for
            // the keys.
            require.extensions = {
                ".js": true,
                ".json": true,
                ".node": true
            };
        };
        // This populates repl.context.{module,require} by evaluating the
        // module defined above.
        Package.modules.meteorInstall(toBeInstalled)("./" + shellModuleName);
    }
}
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});


/* Exports */
return {
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/shell-server/main.js"
  ],
  mainModulePath: "/node_modules/meteor/shell-server/main.js"
}});

//# sourceURL=meteor://💻app/packages/shell-server.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc2hlbGwtc2VydmVyL21haW4uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3NoZWxsLXNlcnZlci9zaGVsbC1zZXJ2ZXIuanMiXSwibmFtZXMiOlsic2hlbGxEaXIiLCJwcm9jZXNzIiwiZW52IiwiTUVURU9SX1NIRUxMX0RJUiIsImxpc3RlbiIsImFzc2VydCIsIklORk9fRklMRV9NT0RFIiwicGFyc2VJbnQiLCJFWElUSU5HX01FU1NBR0UiLCJjYWxsYmFjayIsIlNlcnZlciIsIk1ldGVvciIsInN0YXJ0dXAiLCJfX21ldGVvcl9ib290c3RyYXBfXyIsImhvb2tzIiwic3RhcnR1cEhvb2tzIiwicHVzaCIsInNldEltbWVkaWF0ZSIsImRpc2FibGUiLCJ3cml0ZUZpbGVTeW5jIiwiZ2V0SW5mb0ZpbGUiLCJKU09OIiwic3RyaW5naWZ5Iiwic3RhdHVzIiwicmVhc29uIiwibW9kZSIsImlnbm9yZWQiLCJldmFsQ29tbWFuZFByb21pc2UiLCJQcm9taXNlIiwicmVzb2x2ZSIsImluZm9GaWxlIiwidW5saW5rIiwic2VydmVyIiwicG9ydCIsImFkZHJlc3MiLCJrZXkiLCJvbkNvbm5lY3Rpb24iLCJzb2NrZXQiLCJvbiIsInRpbWVvdXQiLCJzZXRUaW1lb3V0IiwicmVtb3ZlQWxsTGlzdGVuZXJzIiwiZW5kIiwicmVhZEpTT05Gcm9tU3RyZWFtIiwiZXJyb3IiLCJvcHRpb25zIiwicmVwbElucHV0U29ja2V0IiwiY2xlYXJUaW1lb3V0IiwiY29uc29sZSIsInN0YWNrIiwiY29sdW1ucyIsIk9iamVjdCIsImFzc2lnbiIsImNyZWF0ZSIsInByb21wdCIsInRlcm1pbmFsIiwidXNlQ29sb3JzIiwiaWdub3JlVW5kZWZpbmVkIiwiaW5wdXQiLCJ1c2VHbG9iYWwiLCJvdXRwdXQiLCJldmFsdWF0ZUFuZEV4aXQiLCJzdGFydFJFUEwiLCJfd3JhcHBlZERlZmF1bHRFdmFsIiwiY2FsbCIsImNvbW1hbmQiLCJnbG9iYWwiLCJmaWxlbmFtZSIsInJlc3VsdCIsInNlbmRSZXN1bHRUb1NvY2tldCIsIm1lc3NhZ2UiLCJ0b1N0cmluZyIsImNvZGUiLCJlbmFibGVJbnRlcmFjdGl2ZU1vZGUiLCJyZXBsIiwicmVwbFN0YXJ0IiwiY29udGV4dCIsInNldFJlcXVpcmVBbmRNb2R1bGUiLCJkZWZhdWx0RXZhbCIsImV2YWwiLCJ3cmFwcGVkRGVmYXVsdEV2YWwiLCJmaWxlIiwiUGFja2FnZSIsIkJhYmVsIiwiY29tcGlsZUZvclNoZWxsIiwiY2FjaGVEaXJlY3RvcnkiLCJnZXRDYWNoZURpcmVjdG9yeSIsImVyciIsInRoZW4iLCJyZXNvbHZlZFJlc3VsdCIsImNhdGNoIiwicmVqZWN0ZWRFcnJvciIsImluaXRpYWxpemVIaXN0b3J5IiwiZGVmaW5lUHJvcGVydHkiLCJnZXQiLCJsYXN0Iiwic2V0IiwidmFsIiwiY29uZmlndXJhYmxlIiwiYWRkSGVscCIsImNtZCIsImhlbHBUZXh0IiwiaW5mbyIsImNvbW1hbmRzIiwiaGVscCIsIndyaXRlIiwiZGVmaW5lQ29tbWFuZCIsImFjdGlvbiIsInNlbmRNZXNzYWdlIiwiZXhpdCIsImhpc3RvcnlGaWxlIiwiZ2V0SGlzdG9yeUZpbGUiLCJoaXN0b3J5RmQiLCJvcGVuU3luYyIsImhpc3RvcnlMaW5lcyIsInJlYWRGaWxlU3luYyIsInNwbGl0Iiwic2VlbkxpbmVzIiwiaGlzdG9yeSIsImhpc3RvcnlJbmRleCIsImxlbmd0aCIsImxpbmUiLCJwb3AiLCJ0ZXN0IiwiYWRkTGlzdGVuZXIiLCJ3cml0ZVN5bmMiLCJjbG9zZVN5bmMiLCJvayIsIk1hdGgiLCJyYW5kb20iLCJzbGljZSIsImNyZWF0ZVNlcnZlciIsImlucHV0U3RyZWFtIiwib3V0cHV0U3RyZWFtIiwiUGFzc1Rocm91Z2giLCJkYXRhU29GYXIiLCJvbkRhdGEiLCJidWZmZXIiLCJsaW5lcyIsInNoaWZ0IiwianNvbiIsInBhcnNlIiwiU3ludGF4RXJyb3IiLCJmaW5pc2giLCJqb2luIiwicGlwZSIsIm9uQ2xvc2UiLCJFcnJvciIsImZpbmlzaGVkIiwicmVtb3ZlTGlzdGVuZXIiLCJwYXRoSm9pbiIsIm1vZHVsZXMiLCJ0b0JlSW5zdGFsbGVkIiwic2hlbGxNb2R1bGVOYW1lIiwicmVxdWlyZSIsImV4cG9ydHMiLCJtb2R1bGUiLCJleHRlbnNpb25zIiwibWV0ZW9ySW5zdGFsbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxjQUFjLG9CQUFvQjtBQUNTO0FBRTNDLE1BQU1BLFdBQVdDLFFBQVFDLEdBQUcsQ0FBQ0MsZ0JBQWdCO0FBQzdDLElBQUlILFVBQVU7SUFDWkksT0FBT0o7QUFDVDs7Ozs7Ozs7Ozs7OztBQ05BLE9BQU9LLFlBQVksU0FBUztBQUNZO0FBQ0g7QUFRekI7QUFDdUI7QUFDTztBQUUxQyxtRUFBbUU7QUFDM0I7QUFFeEMsTUFBTUMsaUJBQWlCQyxTQUFTLE9BQU8sSUFBSSxvQ0FBb0M7QUFDL0UsTUFBTUMsa0JBQWtCO0FBRXhCLHdFQUF3RTtBQUN4RSw2REFBNkQ7QUFDN0QsT0FBTyxTQUFTSixPQUFPSixJQUFRO0lBQzdCLFNBQVNTO1FBQ1AsSUFBSUMsT0FBT1YsVUFBVUksTUFBTTtJQUM3QjtJQUVBLGtFQUFrRTtJQUNsRSx3Q0FBd0M7SUFDeEMsSUFBSSxPQUFPTyxXQUFXLFVBQVU7UUFDOUJBLE9BQU9DLE9BQU8sQ0FBQ0g7SUFDakIsT0FBTyxJQUFJLE9BQU9JLHlCQUF5QixVQUFVO1FBQ25ELE1BQU1DLFFBQVFELHFCQUFxQkUsWUFBWTtRQUMvQyxJQUFJRCxPQUFPO1lBQ1RBLE1BQU1FLElBQUksQ0FBQ1A7UUFDYixPQUFPO1lBQ0wsd0RBQXdEO1lBQ3hEUSxhQUFhUjtRQUNmO0lBQ0Y7QUFDRjtBQUVBLDBFQUEwRTtBQUMxRSxPQUFPLFNBQVNTLFFBQVFsQixJQUFRO0lBQzlCLElBQUk7UUFDRiw4REFBOEQ7UUFDOUQsNkRBQTZEO1FBQzdELDJEQUEyRDtRQUMzRG1CLGNBQ0VDLFlBQVlwQixXQUNacUIsS0FBS0MsU0FBUyxDQUFDO1lBQ2JDLFFBQVE7WUFD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LFNBQVN0SixVQUFVO0FBQzVCO0FBRUEsU0FBUzZFLG9CQUFvQkQsT0FBTztJQUNsQyxJQUFJTSxRQUFRcUUsT0FBTyxFQUFFO1FBQ25CLHFFQUFxRTtRQUNyRSxlQUFlO1FBQ2YsTUFBTUMsZ0JBQWdCLENBQUM7UUFDdkIsTUFBTUMsa0JBQWtCLGtCQUN0QnpCLEtBQUtDLE1BQU0sR0FBRzFELFFBQVEsQ0FBQyxJQUFJMkQsS0FBSyxDQUFDLEtBQUs7UUFFeENzQixhQUFhLENBQUNDLGdCQUFnQixHQUFHLFNBQVVDLE9BQU8sRUFBRUMsT0FBTyxFQUFFQyxNQUFNO1lBQ2pFaEYsUUFBUWdGLE1BQU0sR0FBR0E7WUFDakJoRixRQUFROEUsT0FBTyxHQUFHQTtZQUVsQixpRUFBaUU7WUFDakUsWUFBWTtZQUNaQSxRQUFRRyxVQUFVLEdBQUc7Z0JBQ25CLE9BQU87Z0JBQ1AsU0FBUztnQkFDVCxTQUFTO1lBQ1g7UUFDRjtRQUVBLGlFQUFpRTtRQUNqRSx3QkFBd0I7UUFDeEIzRSxRQUFRcUUsT0FBTyxDQUFDTyxhQUFhLENBQUNOLGVBQWUsT0FBT0M7SUFDdEQ7QUFDRiIsImZpbGUiOiIvcGFja2FnZXMvc2hlbGwtc2VydmVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0ICogZnJvbSBcIi4vc2hlbGwtc2VydmVyLmpzXCI7XG5pbXBvcnQgeyBsaXN0ZW4gfSBmcm9tIFwiLi9zaGVsbC1zZXJ2ZXIuanNcIjtcblxuY29uc3Qgc2hlbGxEaXIgPSBwcm9jZXNzLmVudi5NRVRFT1JfU0hFTExfRElSO1xuaWYgKHNoZWxsRGlyKSB7XG4gIGxpc3RlbihzaGVsbERpcik7XG59XG4iLCJpbXBvcnQgYXNzZXJ0IGZyb20gXCJhc3NlcnRcIjtcbmltcG9ydCB7IGpvaW4gYXMgcGF0aEpvaW4gfSBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgUGFzc1Rocm91Z2ggfSBmcm9tIFwic3RyZWFtXCI7XG5pbXBvcnQge1xuICBjbG9zZVN5bmMsXG4gIG9wZW5TeW5jLFxuICByZWFkRmlsZVN5bmMsXG4gIHVubGluayxcbiAgd3JpdGVGaWxlU3luYyxcbiAgd3JpdGVTeW5jLFxufSBmcm9tIFwiZnNcIjtcbmltcG9ydCB7IGNyZWF0ZVNlcnZlciB9IGZyb20gXCJuZXRcIjtcbmltcG9ydCB7IHN0YXJ0IGFzIHJlcGxTdGFydCB9IGZyb20gXCJyZXBsXCI7XG5cbi8vIEVuYWJsZSBwcm9jZXNzLnNlbmRNZXNzYWdlIGZvciBjb21tdW5pY2F0aW9uIHdpdGggYnVpbGQgcHJvY2Vzcy5cbmltcG9ydCBcIm1ldGVvci9pbnRlci1wcm9jZXNzLW1lc3NhZ2luZ1wiO1xuXG5jb25zdCBJTkZPX0ZJTEVfTU9ERSA9IHBhcnNlSW50KFwiNjAwXCIsIDgpOyAvLyBPbmx5IHRoZSBvd25lciBjYW4gcmVhZCBvciB3cml0ZS5cbmNvbnN0IEVYSVRJTkdfTUVTU0FHRSA9IFwiU2hlbGwgZXhpdGluZy4uLlwiO1xuXG4vLyBJbnZva2VkIGJ5IHRoZSBzZXJ2ZXIgcHJvY2VzcyB0byBsaXN0ZW4gZm9yIGluY29taW5nIGNvbm5lY3Rpb25zIGZyb21cbi8vIHNoZWxsIGNsaWVudHMuIEVhY2ggY29ubmVjdGlvbiBnZXRzIGl0cyBvd24gUkVQTCBpbnN0YW5jZS5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0ZW4oc2hlbGxEaXIpIHtcbiAgZnVuY3Rpb24gY2FsbGJhY2soKSB7XG4gICAgbmV3IFNlcnZlcihzaGVsbERpcikubGlzdGVuKCk7XG4gIH1cblxuICAvLyBJZiB0aGUgc2VydmVyIGlzIHN0aWxsIGluIHRoZSB2ZXJ5IGVhcmx5IHN0YWdlcyBvZiBzdGFydGluZyB1cCxcbiAgLy8gTWV0ZW9yLnN0YXJ0dXAgbWF5IG5vdCBhdmFpbGFibGUgeWV0LlxuICBpZiAodHlwZW9mIE1ldGVvciA9PT0gXCJvYmplY3RcIikge1xuICAgIE1ldGVvci5zdGFydHVwKGNhbGxiYWNrKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgX19tZXRlb3JfYm9vdHN0cmFwX18gPT09IFwib2JqZWN0XCIpIHtcbiAgICBjb25zdCBob29rcyA9IF9fbWV0ZW9yX2Jvb3RzdHJhcF9fLnN0YXJ0dXBIb29rcztcbiAgICBpZiAoaG9va3MpIHtcbiAgICAgIGhvb2tzLnB1c2goY2FsbGJhY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBBcyBhIGZhbGxiYWNrLCBqdXN0IGNhbGwgdGhlIGNhbGxiYWNrIGFzeW5jaHJvbm91c2x5LlxuICAgICAgc2V0SW1tZWRpYXRlKGNhbGxiYWNrKTtcbiAgICB9XG4gIH1cbn1cblxuLy8gRGlzYWJsaW5nIHRoZSBzaGVsbCBjYXVzZXMgYWxsIGF0dGFjaGVkIGNsaWVudHMgdG8gZGlzY29ubmVjdCBhbmQgZXhpdC5cbmV4cG9ydCBmdW5jdGlvbiBkaXNhYmxlKHNoZWxsRGlyKSB7XG4gIHRyeSB7XG4gICAgLy8gUmVwbGFjZSBpbmZvLmpzb24gd2l0aCBhIGZpbGUgdGhhdCBzYXlzIHRoZSBzaGVsbCBzZXJ2ZXIgaXNcbiAgICAvLyBkaXNhYmxlZCwgc28gdGhhdCBhbnkgY29ubmVjdGVkIHNoZWxsIGNsaWVudHMgd2lsbCBmYWlsIHRvXG4gICAgLy8gcmVjb25uZWN0IGFmdGVyIHRoZSBzZXJ2ZXIgcHJvY2VzcyBjbG9zZXMgdGhlaXIgc29ja2V0cy5cbiAgICB3cml0ZUZpbGVTeW5jKFxuICAgICAgZ2V0SW5mb0ZpbGUoc2hlbGxEaXIpLFxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBzdGF0dXM6IFwiZGlzYWJsZWRcIixcbiAgICAgICAgcmVhc29uOiBcIlNoZWxsIHNlcnZlciBoYXMgc2h1dCBkb3duLlwiXG4gICAgICB9KSArIFwiXFxuXCIsXG4gICAgICB7IG1vZGU6IElORk9fRklMRV9NT0RFIH1cbiAgICApO1xuICB9IGNhdGNoIChpZ25vcmVkKSB7fVxufVxuXG4vLyBTaGVsbCBjb21tYW5kcyBuZWVkIHRvIGJlIGV4ZWN1dGVkIGluIGEgRmliZXIgaW4gY2FzZSB0aGV5IGNhbGwgaW50b1xuLy8gY29kZSB0aGF0IHlpZWxkcy4gVXNpbmcgYSBQcm9taXNlIGlzIGFuIGV2ZW4gYmV0dGVyIGlkZWEsIHNpbmNlIGl0IHJ1bnNcbi8vIGl0cyBjYWxsYmFja3MgaW4gRmliZXJzIGRyYXduIGZyb20gYSBwb29sLCBzbyB0aGUgRmliZXJzIGFyZSByZWN5Y2xlZC5cbmNvbnN0IGV2YWxDb21tYW5kUHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xuXG5jbGFzcyBTZXJ2ZXIge1xuICBjb25zdHJ1Y3RvcihzaGVsbERpcikge1xuICAgIGFzc2VydC5vayh0aGlzIGluc3RhbmNlb2YgU2VydmVyKTtcblxuICAgIHRoaXMuc2hlbGxEaXIgPSBzaGVsbERpcjtcbiAgICB0aGlzLmtleSA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIpO1xuXG4gICAgdGhpcy5zZXJ2ZXIgPVxuICAgICAgY3JlYXRlU2VydmVyKChzb2NrZXQpID0+IHtcbiAgICAgICAgdGhpcy5vbkNvbm5lY3Rpb24oc29ja2V0KTtcbiAgICAgIH0pXG4gICAgICAub24oXCJlcnJvclwiLCAoZXJyKSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyLnN0YWNrKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgbGlzdGVuKCkge1xuICAgIGNvbnN0IGluZm9GaWxlID0gZ2V0SW5mb0ZpbGUodGhpcy5zaGVsbERpcik7XG5cbiAgICB1bmxpbmsoaW5mb0ZpbGUsICgpID0+IHtcbiAgICAgIHRoaXMuc2VydmVyLmxpc3RlbigwLCBcIjEyNy4wLjAuMVwiLCAoKSA9PiB7XG4gICAgICAgIHdyaXRlRmlsZVN5bmMoaW5mb0ZpbGUsIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBzdGF0dXM6IFwiZW5hYmxlZFwiLFxuICAgICAgICAgIHBvcnQ6IHRoaXMuc2VydmVyLmFkZHJlc3MoKS5wb3J0LFxuICAgICAgICAgIGtleTogdGhpcy5rZXlcbiAgICAgICAgfSkgKyBcIlxcblwiLCB7XG4gICAgICAgICAgbW9kZTogSU5GT19GSUxFX01PREVcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIG9uQ29ubmVjdGlvbihzb2NrZXQpIHtcbiAgICAvLyBNYWtlIHN1cmUgdGhpcyBmdW5jdGlvbiBkb2Vzbid0IHRyeSB0byB3cml0ZSBhbnl0aGluZyB0byB0aGUgc29ja2V0XG4gICAgLy8gYWZ0ZXIgaXQgaGFzIGJlZW4gY2xvc2VkLlxuICAgIHNvY2tldC5vbihcImNsb3NlXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgc29ja2V0ID0gbnVsbDtcbiAgICB9KTtcblxuICAgIC8vIElmIGNvbW11bmljYXRpb24gaXMgbm90IGVzdGFibGlzaGVkIHdpdGhpbiAxMDAwbXMgb2YgdGhlIGZpcnN0XG4gICAgLy8gY29ubmVjdGlvbiwgZm9yY2libHkgY2xvc2UgdGhlIHNvY2tldC5cbiAgICBjb25zdCB0aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIGlmIChzb2NrZXQpIHtcbiAgICAgICAgc29ja2V0LnJlbW92ZUFsbExpc3RlbmVycyhcImRhdGFcIik7XG4gICAgICAgIHNvY2tldC5lbmQoRVhJVElOR19NRVNTQUdFICsgXCJcXG5cIik7XG4gICAgICB9XG4gICAgfSwgMTAwMCk7XG5cbiAgICAvLyBMZXQgY29ubmVjdGluZyBjbGllbnRzIGNvbmZpZ3VyZSBjZXJ0YWluIFJFUEwgb3B0aW9ucyBieSBzZW5kaW5nIGFcbiAgICAvLyBKU09OIG9iamVjdCBvdmVyIHRoZSBzb2NrZXQuIEZvciBleGFtcGxlLCBvbmx5IHRoZSBjbGllbnQga25vd3NcbiAgICAvLyB3aGV0aGVyIGl0J3MgcnVubmluZyBhIFRUWSBvciBhbiBFbWFjcyBzdWJzaGVsbCBvciBzb21lIG90aGVyIGtpbmQgb2ZcbiAgICAvLyB0ZXJtaW5hbCwgc28gdGhlIGNsaWVudCBtdXN0IGRlY2lkZSB0aGUgdmFsdWUgb2Ygb3B0aW9ucy50ZXJtaW5hbC5cbiAgICByZWFkSlNPTkZyb21TdHJlYW0oc29ja2V0LCAoZXJyb3IsIG9wdGlvbnMsIHJlcGxJbnB1dFNvY2tldCkgPT4ge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuXG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgc29ja2V0ID0gbnVsbDtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnJvci5zdGFjayk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKG9wdGlvbnMua2V5ICE9PSB0aGlzLmtleSkge1xuICAgICAgICBpZiAoc29ja2V0KSB7XG4gICAgICAgICAgc29ja2V0LmVuZChFWElUSU5HX01FU1NBR0UgKyBcIlxcblwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBkZWxldGUgb3B0aW9ucy5rZXk7XG5cbiAgICAgIC8vIFNldCB0aGUgY29sdW1ucyB0byB3aGF0IGlzIGJlaW5nIHJlcXVlc3RlZCBieSB0aGUgY2xpZW50LlxuICAgICAgaWYgKG9wdGlvbnMuY29sdW1ucyAmJiBzb2NrZXQpIHtcbiAgICAgICAgc29ja2V0LmNvbHVtbnMgPSBvcHRpb25zLmNvbHVtbnM7XG4gICAgICB9XG4gICAgICBkZWxldGUgb3B0aW9ucy5jb2x1bW5zO1xuXG4gICAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbihcbiAgICAgICAgT2JqZWN0LmNyZWF0ZShudWxsKSxcblxuICAgICAgICAvLyBEZWZhdWx0cyBmb3IgY29uZmlndXJhYmxlIG9wdGlvbnMuXG4gICAgICAgIHtcbiAgICAgICAgICBwcm9tcHQ6IFwiPiBcIixcbiAgICAgICAgICB0ZXJtaW5hbDogdHJ1ZSxcbiAgICAgICAgICB1c2VDb2xvcnM6IHRydWUsXG4gICAgICAgICAgaWdub3JlVW5kZWZpbmVkOiB0cnVlLFxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIENvbmZpZ3VyYWJsZSBvcHRpb25zXG4gICAgICAgIG9wdGlvbnMsXG5cbiAgICAgICAgLy8gSW1tdXRhYmxlIG9wdGlvbnMuXG4gICAgICAgIHtcbiAgICAgICAgICBpbnB1dDogcmVwbElucHV0U29ja2V0LFxuICAgICAgICAgIHVzZUdsb2JhbDogZmFsc2UsXG4gICAgICAgICAgb3V0cHV0OiBzb2NrZXRcbiAgICAgICAgfVxuICAgICAgKTtcblxuICAgICAgLy8gVGhlIHByb21wdCBkdXJpbmcgYW4gZXZhbHVhdGVBbmRFeGl0IG11c3QgYmUgYmxhbmsgdG8gZW5zdXJlXG4gICAgICAvLyB0aGF0IHRoZSBwcm9tcHQgZG9lc24ndCBpbmFkdmVydGVudGx5IGdldCBwYXJzZWQgYXMgcGFydCBvZlxuICAgICAgLy8gdGhlIEpTT04gY29tbXVuaWNhdGlvbiBjaGFubmVsLlxuICAgICAgaWYgKG9wdGlvbnMuZXZhbHVhdGVBbmRFeGl0KSB7XG4gICAgICAgIG9wdGlvbnMucHJvbXB0ID0gXCJcIjtcbiAgICAgIH1cblxuICAgICAgLy8gU3RhcnQgdGhlIFJFUEwuXG4gICAgICB0aGlzLnN0YXJ0UkVQTChvcHRpb25zKTtcblxuICAgICAgaWYgKG9wdGlvbnMuZXZhbHVhdGVBbmRFeGl0KSB7XG4gICAgICAgIHRoaXMuX3dyYXBwZWREZWZhdWx0RXZhbC5jYWxsKFxuICAgICAgICAgIE9iamVjdC5jcmVhdGUobnVsbCksXG4gICAgICAgICAgb3B0aW9ucy5ldmFsdWF0ZUFuZEV4aXQuY29tbWFuZCxcbiAgICAgICAgICBnbG9iYWwsXG4gICAgICAgICAgb3B0aW9ucy5ldmFsdWF0ZUFuZEV4aXQuZmlsZW5hbWUgfHwgXCI8bWV0ZW9yIHNoZWxsPlwiLFxuICAgICAgICAgIGZ1bmN0aW9uIChlcnJvciwgcmVzdWx0KSB7XG4gICAgICAgICAgICBpZiAoc29ja2V0KSB7XG4gICAgICAgICAgICAgIGZ1bmN0aW9uIHNlbmRSZXN1bHRUb1NvY2tldChtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgLy8gU2VuZGluZyBiYWNrIGEgSlNPTiBwYXlsb2FkIGFsbG93cyB0aGUgY2xpZW50IHRvXG4gICAgICAgICAgICAgICAgLy8gZGlzdGluZ3Vpc2ggYmV0d2VlbiBlcnJvcnMgYW5kIHN1Y2Nlc3NmdWwgcmVzdWx0cy5cbiAgICAgICAgICAgICAgICBzb2NrZXQuZW5kKEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UpICsgXCJcXG5cIik7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBzZW5kUmVzdWx0VG9Tb2NrZXQoe1xuICAgICAgICAgICAgICAgICAgZXJyb3I6IGVycm9yLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICBjb2RlOiAxXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2VuZFJlc3VsdFRvU29ja2V0KHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZGVsZXRlIG9wdGlvbnMuZXZhbHVhdGVBbmRFeGl0O1xuXG4gICAgICB0aGlzLmVuYWJsZUludGVyYWN0aXZlTW9kZShvcHRpb25zKTtcbiAgICB9KTtcbiAgfVxuXG4gIHN0YXJ0UkVQTChvcHRpb25zKSB7XG4gICAgLy8gTWFrZSBzdXJlIHRoaXMgZnVuY3Rpb24gZG9lc24ndCB0cnkgdG8gd3JpdGUgYW55dGhpbmcgdG8gdGhlIG91dHB1dFxuICAgIC8vIHN0cmVhbSBhZnRlciBpdCBoYXMgYmVlbiBjbG9zZWQuXG4gICAgb3B0aW9ucy5vdXRwdXQub24oXCJjbG9zZVwiLCBmdW5jdGlvbigpIHtcbiAgICAgIG9wdGlvbnMub3V0cHV0ID0gbnVsbDtcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlcGwgPSB0aGlzLnJlcGwgPSByZXBsU3RhcnQob3B0aW9ucyk7XG4gICAgY29uc3QgeyBzaGVsbERpciB9ID0gdGhpcztcblxuICAgIC8vIFRoaXMgaXMgdGVjaG5pcXVlIG9mIHNldHRpbmcgYHJlcGwuY29udGV4dGAgaXMgc2ltaWxhciB0byBob3cgdGhlXG4gICAgLy8gYHVzZUdsb2JhbGAgb3B0aW9uIHdvdWxkIHdvcmsgZHVyaW5nIGEgbm9ybWFsIGByZXBsLnN0YXJ0KClgIGFuZFxuICAgIC8vIGFsbG93cyBzaGVsbCBhY2Nlc3MgKGFuZCB0YWIgY29tcGxldGlvbiEpIHRvIE1ldGVvciBnbG9iYWxzIChpLmUuXG4gICAgLy8gVW5kZXJzY29yZSBfLCBNZXRlb3IsIGV0Yy4pLiBCeSB1c2luZyB0aGlzIHRlY2huaXF1ZSwgd2hpY2ggY2hhbmdlc1xuICAgIC8vIHRoZSBjb250ZXh0IGFmdGVyIHN0YXJ0dXAsIHdlIGF2b2lkIHN0b21waW5nIG9uIHRoZSBzcGVjaWFsIGBfYFxuICAgIC8vIHZhcmlhYmxlIChpbiBgcmVwbGAgdGhpcyBlcXVhbHMgdGhlIHZhbHVlIG9mIHRoZSBsYXN0IGNvbW1hbmQpIGZyb21cbiAgICAvLyBiZWluZyBvdmVycmlkZGVuIGluIHRoZSBjbGllbnQvc2VydmVyIHNvY2tldC1oYW5kc2hha2luZy4gIEZ1cnRoZXJtb3JlLFxuICAgIC8vIGJ5IHNldHRpbmcgYHVzZUdsb2JhbGAgYmFjayB0byB0cnVlLCB3ZSBhbGxvdyB0aGUgZGVmYXVsdCBldmFsIGZ1bmN0aW9uXG4gICAgLy8gdG8gdXNlIHRoZSBkZXNpcmVkIGBydW5JblRoaXNDb250ZXh0YCBtZXRob2QgKGh0dHBzOi8vZ2l0LmlvL3ZidkFCKS5cbiAgICByZXBsLmNvbnRleHQgPSBnbG9iYWw7XG4gICAgcmVwbC51c2VHbG9iYWwgPSB0cnVlO1xuXG4gICAgc2V0UmVxdWlyZUFuZE1vZHVsZShyZXBsLmNvbnRleHQpO1xuXG4gICAgLy8gSW4gb3JkZXIgdG8gYXZvaWQgZHVwbGljYXRpbmcgY29kZSBoZXJlLCBzcGVjaWZpY2FsbHkgdGhlIGNvbXBsZXhpdGllc1xuICAgIC8vIG9mIGNhdGNoaW5nIHNvLWNhbGxlZCBcIlJlY292ZXJhYmxlIEVycm9yc1wiIChodHRwczovL2dpdC5pby92YnZibCksXG4gICAgLy8gd2Ugd2lsbCB3cmFwIHRoZSBkZWZhdWx0IGV2YWwsIHJ1biBpdCBpbiBhIEZpYmVyICh2aWEgYSBQcm9taXNlKSwgYW5kXG4gICAgLy8gZ2l2ZSBpdCB0aGUgb3Bwb3J0dW5pdHkgdG8gZGVjaWRlIGlmIHRoZSB1c2VyIGlzIG1pZC1jb2RlLWJsb2NrLlxuICAgIGNvbnN0IGRlZmF1bHRFdmFsID0gcmVwbC5ldmFsO1xuXG4gICAgZnVuY3Rpb24gd3JhcHBlZERlZmF1bHRFdmFsKGNvZGUsIGNvbnRleHQsIGZpbGUsIGNhbGxiYWNrKSB7XG4gICAgICBpZiAoUGFja2FnZVsnYmFiZWwtY29tcGlsZXInXSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvZGUgPSBQYWNrYWdlWydiYWJlbC1jb21waWxlciddLkJhYmVsLmNvbXBpbGVGb3JTaGVsbChjb2RlLCB7XG4gICAgICAgICAgICBjYWNoZURpcmVjdG9yeTogZ2V0Q2FjaGVEaXJlY3Rvcnkoc2hlbGxEaXIpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIC8vIEFueSBCYWJlbCBlcnJvciBoZXJlIG1pZ2h0IGJlIGp1c3QgZmluZSBzaW5jZSBpdCdzXG4gICAgICAgICAgLy8gcG9zc2libGUgdGhlIGNvZGUgd2FzIGluY29tcGxldGUgKG11bHRpLWxpbmUgY29kZSBvbiB0aGUgUkVQTCkuXG4gICAgICAgICAgLy8gVGhlIGRlZmF1bHRFdmFsIGJlbG93IHdpbGwgdXNlIGl0cyBvd24gZnVuY3Rpb25hbGl0eSB0byBkZXRlcm1pbmVcbiAgICAgICAgICAvLyBpZiB0aGlzIGVycm9yIGlzIFwicmVjb3ZlcmFibGVcIi5cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBldmFsQ29tbWFuZFByb21pc2VcbiAgICAgICAgLnRoZW4oKCkgPT4gZGVmYXVsdEV2YWwoY29kZSwgY29udGV4dCwgZmlsZSwgKGVycm9yLCByZXN1bHQpID0+IHtcbiAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHJlc3VsdCBpcyBhIFByb21pc2VcbiAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgdHlwZW9mIHJlc3VsdC50aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgIC8vIEhhbmRsZSB0aGUgUHJvbWlzZSByZXNvbHV0aW9uIGFuZCByZWplY3Rpb25cbiAgICAgICAgICAgICAgcmVzdWx0XG4gICAgICAgICAgICAgICAgLnRoZW4ocmVzb2x2ZWRSZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzb2x2ZWRSZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmNhdGNoKHJlamVjdGVkRXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgY2FsbGJhY2socmVqZWN0ZWRFcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSkpXG4gICAgICAgIC5jYXRjaChjYWxsYmFjayk7XG4gICAgfVxuXG4gICAgLy8gSGF2ZSB0aGUgUkVQTCB1c2UgdGhlIG5ld2x5IHdyYXBwZWQgZnVuY3Rpb24gaW5zdGVhZCBhbmQgc3RvcmUgdGhlXG4gICAgLy8gX3dyYXBwZWREZWZhdWx0RXZhbCBzbyB0aGF0IGV2YWx1bGF0ZUFuZEV4aXQgY2FsbHMgY2FuIHVzZSBpdCBkaXJlY3RseS5cbiAgICByZXBsLmV2YWwgPSB0aGlzLl93cmFwcGVkRGVmYXVsdEV2YWwgPSB3cmFwcGVkRGVmYXVsdEV2YWw7XG4gIH1cblxuICBlbmFibGVJbnRlcmFjdGl2ZU1vZGUob3B0aW9ucykge1xuICAgIC8vIEhpc3RvcnkgcGVyc2lzdHMgYWNyb3NzIHNoZWxsIHNlc3Npb25zIVxuICAgIHRoaXMuaW5pdGlhbGl6ZUhpc3RvcnkoKTtcblxuICAgIGNvbnN0IHJlcGwgPSB0aGlzLnJlcGw7XG5cbiAgICAvLyBJbXBsZW1lbnQgYW4gYWx0ZXJuYXRlIG1lYW5zIG9mIGZldGNoaW5nIHRoZSByZXR1cm4gdmFsdWUsXG4gICAgLy8gdmlhIGBfX2AgKGRvdWJsZSB1bmRlcnNjb3JlKSBhcyBvcmlnaW5hbGx5IGltcGxlbWVudGVkIGluOlxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9tZXRlb3IvbWV0ZW9yL2NvbW1pdC8yNDQzZDgzMjI2NWM3ZDFjXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHJlcGwuY29udGV4dCwgXCJfX1wiLCB7XG4gICAgICBnZXQ6ICgpID0+IHJlcGwubGFzdCxcbiAgICAgIHNldDogKHZhbCkgPT4ge1xuICAgICAgICByZXBsLmxhc3QgPSB2YWw7XG4gICAgICB9LFxuXG4gICAgICAvLyBBbGxvdyB0aGlzIHByb3BlcnR5IHRvIGJlIChyZSlkZWZpbmVkIG1vcmUgdGhhbiBvbmNlIChlLmcuIGVhY2hcbiAgICAgIC8vIHRpbWUgdGhlIHNlcnZlciByZXN0YXJ0cykuXG4gICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KTtcblxuICAgIC8vIFNvbWUgaW1wcm92ZW1lbnRzIHRvIHRoZSBleGlzdGluZyBoZWxwIG1lc3NhZ2VzLlxuICAgIGZ1bmN0aW9uIGFkZEhlbHAoY21kLCBoZWxwVGV4dCkge1xuICAgICAgY29uc3QgaW5mbyA9IHJlcGwuY29tbWFuZHNbY21kXSB8fCByZXBsLmNvbW1hbmRzW1wiLlwiICsgY21kXTtcbiAgICAgIGlmIChpbmZvKSB7XG4gICAgICAgIGluZm8uaGVscCA9IGhlbHBUZXh0O1xuICAgICAgfVxuICAgIH1cbiAgICBhZGRIZWxwKFwiYnJlYWtcIiwgXCJUZXJtaW5hdGUgY3VycmVudCBjb21tYW5kIGlucHV0IGFuZCBkaXNwbGF5IG5ldyBwcm9tcHRcIik7XG4gICAgYWRkSGVscChcImV4aXRcIiwgXCJEaXNjb25uZWN0IGZyb20gc2VydmVyIGFuZCBsZWF2ZSBzaGVsbFwiKTtcbiAgICBhZGRIZWxwKFwiaGVscFwiLCBcIlNob3cgdGhpcyBoZWxwIGluZm9ybWF0aW9uXCIpO1xuXG4gICAgLy8gV2hlbiB0aGUgUkVQTCBleGl0cywgc2lnbmFsIHRoZSBhdHRhY2hlZCBjbGllbnQgdG8gZXhpdCBieSBzZW5kaW5nIGl0XG4gICAgLy8gdGhlIHNwZWNpYWwgRVhJVElOR19NRVNTQUdFLlxuICAgIHJlcGwub24oXCJleGl0XCIsIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKG9wdGlvbnMub3V0cHV0KSB7XG4gICAgICAgIG9wdGlvbnMub3V0cHV0LndyaXRlKEVYSVRJTkdfTUVTU0FHRSArIFwiXFxuXCIpO1xuICAgICAgICBvcHRpb25zLm91dHB1dC5lbmQoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFdoZW4gdGhlIHNlcnZlciBwcm9jZXNzIGV4aXRzLCBlbmQgdGhlIG91dHB1dCBzdHJlYW0gYnV0IGRvIG5vdFxuICAgIC8vIHNpZ25hbCB0aGUgYXR0YWNoZWQgY2xpZW50IHRvIGV4aXQuXG4gICAgcHJvY2Vzcy5vbihcImV4aXRcIiwgZnVuY3Rpb24oKSB7XG4gICAgICBpZiAob3B0aW9ucy5vdXRwdXQpIHtcbiAgICAgICAgb3B0aW9ucy5vdXRwdXQuZW5kKCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBUaGlzIE1ldGVvci1zcGVjaWZpYyBzaGVsbCBjb21tYW5kIHJlYnVpbGRzIHRoZSBhcHBsaWNhdGlvbiBhcyBpZiBhXG4gICAgLy8gY2hhbmdlIHdhcyBtYWRlIHRvIHNlcnZlciBjb2RlLlxuICAgIHJlcGwuZGVmaW5lQ29tbWFuZChcInJlbG9hZFwiLCB7XG4gICAgICBoZWxwOiBcIlJlc3RhcnQgdGhlIHNlcnZlciBhbmQgdGhlIHNoZWxsXCIsXG4gICAgICBhY3Rpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAocHJvY2Vzcy5zZW5kTWVzc2FnZSkge1xuICAgICAgICAgIHByb2Nlc3Muc2VuZE1lc3NhZ2UoXCJzaGVsbC1zZXJ2ZXJcIiwgeyBjb21tYW5kOiBcInJlbG9hZFwiIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHByb2Nlc3MuZXhpdCgwKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLy8gVGhpcyBmdW5jdGlvbiBhbGxvd3MgYSBwZXJzaXN0ZW50IGhpc3Rvcnkgb2Ygc2hlbGwgY29tbWFuZHMgdG8gYmUgc2F2ZWRcbiAgLy8gdG8gYW5kIGxvYWRlZCBmcm9tIC5tZXRlb3IvbG9jYWwvc2hlbGwvaGlzdG9yeS5cbiAgaW5pdGlhbGl6ZUhpc3RvcnkoKSB7XG4gICAgY29uc3QgcmVwbCA9IHRoaXMucmVwbDtcbiAgICBjb25zdCBoaXN0b3J5RmlsZSA9IGdldEhpc3RvcnlGaWxlKHRoaXMuc2hlbGxEaXIpO1xuICAgIGxldCBoaXN0b3J5RmQgPSBvcGVuU3luYyhoaXN0b3J5RmlsZSwgXCJhK1wiKTtcbiAgICBjb25zdCBoaXN0b3J5TGluZXMgPSByZWFkRmlsZVN5bmMoaGlzdG9yeUZpbGUsIFwidXRmOFwiKS5zcGxpdChcIlxcblwiKTtcbiAgICBjb25zdCBzZWVuTGluZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgaWYgKCEgcmVwbC5oaXN0b3J5KSB7XG4gICAgICByZXBsLmhpc3RvcnkgPSBbXTtcbiAgICAgIHJlcGwuaGlzdG9yeUluZGV4ID0gLTE7XG4gICAgfVxuXG4gICAgd2hpbGUgKHJlcGwuaGlzdG9yeSAmJiBoaXN0b3J5TGluZXMubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgbGluZSA9IGhpc3RvcnlMaW5lcy5wb3AoKTtcbiAgICAgIGlmIChsaW5lICYmIC9cXFMvLnRlc3QobGluZSkgJiYgISBzZWVuTGluZXNbbGluZV0pIHtcbiAgICAgICAgcmVwbC5oaXN0b3J5LnB1c2gobGluZSk7XG4gICAgICAgIHNlZW5MaW5lc1tsaW5lXSA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmVwbC5hZGRMaXN0ZW5lcihcImxpbmVcIiwgZnVuY3Rpb24obGluZSkge1xuICAgICAgaWYgKGhpc3RvcnlGZCA+PSAwICYmIC9cXFMvLnRlc3QobGluZSkpIHtcbiAgICAgICAgd3JpdGVTeW5jKGhpc3RvcnlGZCwgbGluZSArIFwiXFxuXCIpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5yZXBsLm9uKFwiZXhpdFwiLCBmdW5jdGlvbigpIHtcbiAgICAgIGNsb3NlU3luYyhoaXN0b3J5RmQpO1xuICAgICAgaGlzdG9yeUZkID0gLTE7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVhZEpTT05Gcm9tU3RyZWFtKGlucHV0U3RyZWFtLCBjYWxsYmFjaykge1xuICBjb25zdCBvdXRwdXRTdHJlYW0gPSBuZXcgUGFzc1Rocm91Z2goKTtcbiAgbGV0IGRhdGFTb0ZhciA9IFwiXCI7XG5cbiAgZnVuY3Rpb24gb25EYXRhKGJ1ZmZlcikge1xuICAgIGNvbnN0IGxpbmVzID0gYnVmZmVyLnRvU3RyaW5nKFwidXRmOFwiKS5zcGxpdChcIlxcblwiKTtcblxuICAgIHdoaWxlIChsaW5lcy5sZW5ndGggPiAwKSB7XG4gICAgICBkYXRhU29GYXIgKz0gbGluZXMuc2hpZnQoKTtcblxuICAgICAgbGV0IGpzb247XG4gICAgICB0cnkge1xuICAgICAgICBqc29uID0gSlNPTi5wYXJzZShkYXRhU29GYXIpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgU3ludGF4RXJyb3IpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmaW5pc2goZXJyb3IpO1xuICAgICAgfVxuXG4gICAgICBpZiAobGluZXMubGVuZ3RoID4gMCkge1xuICAgICAgICBvdXRwdXRTdHJlYW0ud3JpdGUobGluZXMuam9pbihcIlxcblwiKSk7XG4gICAgICB9XG5cbiAgICAgIGlucHV0U3RyZWFtLnBpcGUob3V0cHV0U3RyZWFtKTtcblxuICAgICAgcmV0dXJuIGZpbmlzaChudWxsLCBqc29uKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBvbkNsb3NlKCkge1xuICAgIGZpbmlzaChuZXcgRXJyb3IoXCJzdHJlYW0gdW5leHBlY3RlZGx5IGNsb3NlZFwiKSk7XG4gIH1cblxuICBsZXQgZmluaXNoZWQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gZmluaXNoKGVycm9yLCBqc29uKSB7XG4gICAgaWYgKCEgZmluaXNoZWQpIHtcbiAgICAgIGZpbmlzaGVkID0gdHJ1ZTtcbiAgICAgIGlucHV0U3RyZWFtLnJlbW92ZUxpc3RlbmVyKFwiZGF0YVwiLCBvbkRhdGEpO1xuICAgICAgaW5wdXRTdHJlYW0ucmVtb3ZlTGlzdGVuZXIoXCJlcnJvclwiLCBmaW5pc2gpO1xuICAgICAgaW5wdXRTdHJlYW0ucmVtb3ZlTGlzdGVuZXIoXCJjbG9zZVwiLCBvbkNsb3NlKTtcbiAgICAgIGNhbGxiYWNrKGVycm9yLCBqc29uLCBvdXRwdXRTdHJlYW0pO1xuICAgIH1cbiAgfVxuXG4gIGlucHV0U3RyZWFtLm9uKFwiZGF0YVwiLCBvbkRhdGEpO1xuICBpbnB1dFN0cmVhbS5vbihcImVycm9yXCIsIGZpbmlzaCk7XG4gIGlucHV0U3RyZWFtLm9uKFwiY2xvc2VcIiwgb25DbG9zZSk7XG59XG5cbmZ1bmN0aW9uIGdldEluZm9GaWxlKHNoZWxsRGlyKSB7XG4gIHJldHVybiBwYXRoSm9pbihzaGVsbERpciwgXCJpbmZvLmpzb25cIik7XG59XG5cbmZ1bmN0aW9uIGdldEhpc3RvcnlGaWxlKHNoZWxsRGlyKSB7XG4gIHJldHVybiBwYXRoSm9pbihzaGVsbERpciwgXCJoaXN0b3J5XCIpO1xufVxuXG5mdW5jdGlvbiBnZXRDYWNoZURpcmVjdG9yeShzaGVsbERpcikge1xuICByZXR1cm4gcGF0aEpvaW4oc2hlbGxEaXIsIFwiY2FjaGVcIik7XG59XG5cbmZ1bmN0aW9uIHNldFJlcXVpcmVBbmRNb2R1bGUoY29udGV4dCkge1xuICBpZiAoUGFja2FnZS5tb2R1bGVzKSB7XG4gICAgLy8gVXNlIHRoZSBzYW1lIGByZXF1aXJlYCBmdW5jdGlvbiBhbmQgYG1vZHVsZWAgb2JqZWN0IHZpc2libGUgdG8gdGhlXG4gICAgLy8gYXBwbGljYXRpb24uXG4gICAgY29uc3QgdG9CZUluc3RhbGxlZCA9IHt9O1xuICAgIGNvbnN0IHNoZWxsTW9kdWxlTmFtZSA9IFwibWV0ZW9yLXNoZWxsLVwiICtcbiAgICAgIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIpICsgXCIuanNcIjtcblxuICAgIHRvQmVJbnN0YWxsZWRbc2hlbGxNb2R1bGVOYW1lXSA9IGZ1bmN0aW9uIChyZXF1aXJlLCBleHBvcnRzLCBtb2R1bGUpIHtcbiAgICAgIGNvbnRleHQubW9kdWxlID0gbW9kdWxlO1xuICAgICAgY29udGV4dC5yZXF1aXJlID0gcmVxdWlyZTtcblxuICAgICAgLy8gVGFiIGNvbXBsZXRpb24gc29tZXRpbWVzIHVzZXMgcmVxdWlyZS5leHRlbnNpb25zLCBidXQgb25seSBmb3JcbiAgICAgIC8vIHRoZSBrZXlzLlxuICAgICAgcmVxdWlyZS5leHRlbnNpb25zID0ge1xuICAgICAgICBcIi5qc1wiOiB0cnVlLFxuICAgICAgICBcIi5qc29uXCI6IHRydWUsXG4gICAgICAgIFwiLm5vZGVcIjogdHJ1ZSxcbiAgICAgIH07XG4gICAgfTtcblxuICAgIC8vIFRoaXMgcG9wdWxhdGVzIHJlcGwuY29udGV4dC57bW9kdWxlLHJlcXVpcmV9IGJ5IGV2YWx1YXRpbmcgdGhlXG4gICAgLy8gbW9kdWxlIGRlZmluZWQgYWJvdmUuXG4gICAgUGFja2FnZS5tb2R1bGVzLm1ldGVvckluc3RhbGwodG9CZUluc3RhbGxlZCkoXCIuL1wiICsgc2hlbGxNb2R1bGVOYW1lKTtcbiAgfVxufVxuIl19
