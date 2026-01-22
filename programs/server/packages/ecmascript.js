Package["core-runtime"].queue("ecmascript",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var ReactFastRefresh = Package['react-fast-refresh'].ReactFastRefresh;

/* Package-scope variables */
var ECMAScript;

(function(){

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/ecmascript/ecmascript.js                                 //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
ECMAScript = {
    compileForShell () {
        throw new Error('compileForShell was removed in Meteor 3. Use Babel.compileForShell instead from babel-compiler');
    }
};

///////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
return {
  export: function () { return {
      ECMAScript: ECMAScript
    };}
}});

//# sourceURL=meteor://💻app/packages/ecmascript.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZWNtYXNjcmlwdC9lY21hc2NyaXB0LmpzIl0sIm5hbWVzIjpbIkVDTUFTY3JpcHQiLCJjb21waWxlRm9yU2hlbGwiLCJFcnJvciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLGFBQWE7SUFDWEM7UUFDRSxNQUFNLElBQUlDLE1BQU07SUFDbEI7QUFDRiIsImZpbGUiOiIvcGFja2FnZXMvZWNtYXNjcmlwdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIkVDTUFTY3JpcHQgPSB7XG4gIGNvbXBpbGVGb3JTaGVsbCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvbXBpbGVGb3JTaGVsbCB3YXMgcmVtb3ZlZCBpbiBNZXRlb3IgMy4gVXNlIEJhYmVsLmNvbXBpbGVGb3JTaGVsbCBpbnN0ZWFkIGZyb20gYmFiZWwtY29tcGlsZXInKTtcbiAgfVxufTtcbiJdfQ==
