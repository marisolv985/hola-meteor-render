Package["core-runtime"].queue("mongo-decimal",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var ECMAScript = Package.ecmascript.ECMAScript;
var EJSON = Package.ejson.EJSON;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Decimal;

var require = meteorInstall({"node_modules":{"meteor":{"mongo-decimal":{"decimal.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/mongo-decimal/decimal.js                                                                                 //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({Decimal:()=>Decimal});let EJSON;module.link('meteor/ejson',{EJSON(v){EJSON=v}},0);let Decimal;module.link('decimal.js',{Decimal(v){Decimal=v}},1);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();

Decimal.prototype.typeName = function() {
    return 'Decimal';
};
Decimal.prototype.toJSONValue = function() {
    return this.toJSON();
};
Decimal.prototype.clone = function() {
    return Decimal(this.toString());
};
EJSON.addType('Decimal', function(str) {
    return Decimal(str);
});

//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"decimal.js":{"package.json":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// node_modules/meteor/mongo-decimal/node_modules/decimal.js/package.json                                            //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.exports = {
  "name": "decimal.js",
  "version": "10.3.1",
  "main": "decimal"
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"decimal.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// node_modules/meteor/mongo-decimal/node_modules/decimal.js/decimal.js                                              //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.useNode();
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});


/* Exports */
return {
  export: function () { return {
      Decimal: Decimal
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/mongo-decimal/decimal.js"
  ],
  mainModulePath: "/node_modules/meteor/mongo-decimal/decimal.js"
}});

//# sourceURL=meteor://💻app/packages/mongo-decimal.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28tZGVjaW1hbC9kZWNpbWFsLmpzIl0sIm5hbWVzIjpbIkVKU09OIiwiRGVjaW1hbCIsInByb3RvdHlwZSIsInR5cGVOYW1lIiwidG9KU09OVmFsdWUiLCJ0b0pTT04iLCJjbG9uZSIsInRvU3RyaW5nIiwiYWRkVHlwZSIsInN0ciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsU0FBU0EsS0FBSyxRQUFRLGVBQWU7QUFDQTtBQUVyQ0MsUUFBUUMsU0FBUyxDQUFDQyxRQUFRLEdBQUc7SUFDM0IsT0FBTztBQUNUO0FBRUFGLFFBQVFDLFNBQVMsQ0FBQ0UsV0FBVyxHQUFHO0lBQzlCLE9BQU8sSUFBSSxDQUFDQyxNQUFNO0FBQ3BCO0FBRUFKLFFBQVFDLFNBQVMsQ0FBQ0ksS0FBSyxHQUFHO0lBQ3hCLE9BQU9MLFFBQVEsSUFBSSxDQUFDTSxRQUFRO0FBQzlCO0FBRUFQLE1BQU1RLE9BQU8sQ0FBQyxXQUFXLFNBQVVDLEdBQUc7SUFDcEMsT0FBT1IsUUFBUVE7QUFDakI7QUFFbUIiLCJmaWxlIjoiL3BhY2thZ2VzL21vbmdvLWRlY2ltYWwuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBFSlNPTiB9IGZyb20gJ21ldGVvci9lanNvbic7XG5pbXBvcnQgeyBEZWNpbWFsIH0gZnJvbSAnZGVjaW1hbC5qcyc7XG5cbkRlY2ltYWwucHJvdG90eXBlLnR5cGVOYW1lID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAnRGVjaW1hbCc7XG59O1xuXG5EZWNpbWFsLnByb3RvdHlwZS50b0pTT05WYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMudG9KU09OKCk7XG59O1xuXG5EZWNpbWFsLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIERlY2ltYWwodGhpcy50b1N0cmluZygpKTtcbn07XG5cbkVKU09OLmFkZFR5cGUoJ0RlY2ltYWwnLCBmdW5jdGlvbiAoc3RyKSB7XG4gIHJldHVybiBEZWNpbWFsKHN0cik7XG59KTtcblxuZXhwb3J0IHsgRGVjaW1hbCB9O1xuIl19
