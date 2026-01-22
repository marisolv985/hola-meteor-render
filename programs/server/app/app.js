Package["core-runtime"].queue("null",function () {/* Imports for global scope */

MongoInternals = Package.mongo.MongoInternals;
Mongo = Package.mongo.Mongo;
ReactiveVar = Package['reactive-var'].ReactiveVar;
ECMAScript = Package.ecmascript.ECMAScript;
Meteor = Package.meteor.Meteor;
global = Package.meteor.global;
meteorEnv = Package.meteor.meteorEnv;
EmitterPromise = Package.meteor.EmitterPromise;
WebApp = Package.webapp.WebApp;
WebAppInternals = Package.webapp.WebAppInternals;
main = Package.webapp.main;
DDP = Package['ddp-client'].DDP;
DDPServer = Package['ddp-server'].DDPServer;
LaunchScreen = Package['launch-screen'].LaunchScreen;
meteorInstall = Package.modules.meteorInstall;
Promise = Package.promise.Promise;
Autoupdate = Package.autoupdate.Autoupdate;

var require = meteorInstall({"server":{"main.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// server/main.js                                                                                                    //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);let Meteor;module.link('meteor/meteor',{Meteor(v){Meteor=v}},1);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();

const fetch = require('node-fetch');
Meteor.methods({
    verifyRecaptcha (token) {
        return _async_to_generator(function*() {
            const secretKey = "6Lf11kksAAAAAMKGksRji33cP7KXJ-c-FkgsHdXK";
            const response = yield fetch('https://www.google.com/recaptcha/api/siteverify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `secret=${secretKey}&response=${token}`
            });
            return yield response.json();
        })();
    }
});
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json",
    ".mjs",
    ".ts",
    ".jsx"
  ]
});


/* Exports */
return {
  require: require,
  eagerModulePaths: [
    "/server/main.js"
  ]
}});

//# sourceURL=meteor://💻app/app/app.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL21haW4uanMiXSwibmFtZXMiOlsiZmV0Y2giLCJyZXF1aXJlIiwiTWV0ZW9yIiwibWV0aG9kcyIsInZlcmlmeVJlY2FwdGNoYSIsInRva2VuIiwic2VjcmV0S2V5IiwicmVzcG9uc2UiLCJtZXRob2QiLCJoZWFkZXJzIiwiYm9keSIsImpzb24iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQXVDO0FBQ3ZDLE1BQU1BLFFBQVFDLFFBQVE7QUFHdEJDLE9BQU9DLE9BQU8sQ0FBQztJQUNQQyxpQkFBZ0JDLEtBQUs7O1lBQ3pCLE1BQU1DLFlBQVk7WUFFbEIsTUFBTUMsV0FBVyxNQUFNUCxNQUNyQixtREFDQTtnQkFDRVEsUUFBUTtnQkFDUkMsU0FBUztvQkFBRSxnQkFBZ0I7Z0JBQW9DO2dCQUMvREMsTUFBTSxDQUFDLE9BQU8sRUFBRUosVUFBVSxVQUFVLEVBQUVELE9BQU87WUFDL0M7WUFHRixPQUFPLE1BQU1FLFNBQVNJLElBQUk7UUFDNUI7O0FBQ0YiLCJmaWxlIjoiL2FwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xyXG5jb25zdCBmZXRjaCA9IHJlcXVpcmUoJ25vZGUtZmV0Y2gnKTtcclxuXHJcblxyXG5NZXRlb3IubWV0aG9kcyh7XHJcbiAgYXN5bmMgdmVyaWZ5UmVjYXB0Y2hhKHRva2VuKSB7XHJcbiAgICBjb25zdCBzZWNyZXRLZXkgPSBcIjZMZjExa2tzQUFBQUFNS0drc1JqaTMzY1A3S1hKLWMtRmtnc0hkWEtcIjtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKFxyXG4gICAgICAnaHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS9yZWNhcHRjaGEvYXBpL3NpdGV2ZXJpZnknLFxyXG4gICAgICB7XHJcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcgfSxcclxuICAgICAgICBib2R5OiBgc2VjcmV0PSR7c2VjcmV0S2V5fSZyZXNwb25zZT0ke3Rva2VufWBcclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICByZXR1cm4gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xyXG4gIH1cclxufSk7XHJcbiJdfQ==
