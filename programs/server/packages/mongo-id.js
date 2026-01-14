Package["core-runtime"].queue("mongo-id",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var EJSON = Package.ejson.EJSON;
var Random = Package.random.Random;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var MongoID;

var require = meteorInstall({"node_modules":{"meteor":{"mongo-id":{"id.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// packages/mongo-id/id.js                                                                       //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
module.export({MongoID:()=>MongoID});let EJSON;module.link('meteor/ejson',{EJSON(v){EJSON=v}},0);let Random;module.link('meteor/random',{Random(v){Random=v}},1);

const MongoID = {};
MongoID._looksLikeObjectID = (str)=>str.length === 24 && /^[0-9a-f]*$/.test(str);
MongoID.ObjectID = class ObjectID {
    equals(other) {
        return other instanceof MongoID.ObjectID && this.valueOf() === other.valueOf();
    }
    toString() {
        return `ObjectID("${this._str}")`;
    }
    clone() {
        return new MongoID.ObjectID(this._str);
    }
    typeName() {
        return 'oid';
    }
    getTimestamp() {
        return Number.parseInt(this._str.substr(0, 8), 16);
    }
    valueOf() {
        return this._str;
    }
    toJSONValue() {
        return this.valueOf();
    }
    toHexString() {
        return this.valueOf();
    }
    constructor(hexString){
        //random-based impl of Mongo ObjectID
        if (hexString) {
            hexString = hexString.toLowerCase();
            if (!MongoID._looksLikeObjectID(hexString)) {
                throw new Error('Invalid hexadecimal string for creating an ObjectID');
            }
            // meant to work with _.isEqual(), which relies on structural equality
            this._str = hexString;
        } else {
            this._str = Random.hexString(24);
        }
    }
};
EJSON.addType('oid', (str)=>new MongoID.ObjectID(str));
MongoID.idStringify = (id)=>{
    if (id instanceof MongoID.ObjectID) {
        return id.valueOf();
    } else if (typeof id === 'string') {
        var firstChar = id.charAt(0);
        if (id === '') {
            return id;
        } else if (firstChar === '-' || // escape previously dashed strings
        firstChar === '~' || // escape escaped numbers, true, false
        MongoID._looksLikeObjectID(id) || // escape object-id-form strings
        firstChar === '{') {
            return `-${id}`;
        } else {
            return id; // other strings go through unchanged.
        }
    } else if (id === undefined) {
        return '-';
    } else if (typeof id === 'object' && id !== null) {
        throw new Error('Meteor does not currently support objects other than ObjectID as ids');
    } else {
        return `~${JSON.stringify(id)}`;
    }
};
MongoID.idParse = (id)=>{
    var firstChar = id.charAt(0);
    if (id === '') {
        return id;
    } else if (id === '-') {
        return undefined;
    } else if (firstChar === '-') {
        return id.substr(1);
    } else if (firstChar === '~') {
        return JSON.parse(id.substr(1));
    } else if (MongoID._looksLikeObjectID(id)) {
        return new MongoID.ObjectID(id);
    } else {
        return id;
    }
};


///////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});


/* Exports */
return {
  export: function () { return {
      MongoID: MongoID
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/mongo-id/id.js"
  ],
  mainModulePath: "/node_modules/meteor/mongo-id/id.js"
}});

//# sourceURL=meteor://💻app/packages/mongo-id.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28taWQvaWQuanMiXSwibmFtZXMiOlsiRUpTT04iLCJNb25nb0lEIiwiX2xvb2tzTGlrZU9iamVjdElEIiwic3RyIiwibGVuZ3RoIiwidGVzdCIsIk9iamVjdElEIiwiZXF1YWxzIiwib3RoZXIiLCJ2YWx1ZU9mIiwidG9TdHJpbmciLCJfc3RyIiwiY2xvbmUiLCJ0eXBlTmFtZSIsImdldFRpbWVzdGFtcCIsIk51bWJlciIsInBhcnNlSW50Iiwic3Vic3RyIiwidG9KU09OVmFsdWUiLCJ0b0hleFN0cmluZyIsImhleFN0cmluZyIsInRvTG93ZXJDYXNlIiwiRXJyb3IiLCJSYW5kb20iLCJhZGRUeXBlIiwiaWRTdHJpbmdpZnkiLCJpZCIsImZpcnN0Q2hhciIsImNoYXJBdCIsInVuZGVmaW5lZCIsIkpTT04iLCJzdHJpbmdpZnkiLCJpZFBhcnNlIiwicGFyc2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxTQUFTQSxLQUFLLFFBQVEsZUFBZTtBQUNFO0FBRXZDLE1BQU1DLFVBQVUsQ0FBQztBQUVqQkEsUUFBUUMsa0JBQWtCLEdBQUdDLE9BQU9BLElBQUlDLE1BQU0sS0FBSyxNQUFNLGNBQWNDLElBQUksQ0FBQ0Y7QUFFNUVGLFFBQVFLLFFBQVEsR0FBRyxNQUFNQTtJQWV2QkMsT0FBT0MsS0FBSyxFQUFFO1FBQ1osT0FBT0EsaUJBQWlCUCxRQUFRSyxRQUFRLElBQ3hDLElBQUksQ0FBQ0csT0FBTyxPQUFPRCxNQUFNQyxPQUFPO0lBQ2xDO0lBRUFDLFdBQVc7UUFDVCxPQUFPLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQ0MsSUFBSSxDQUFDLEVBQUUsQ0FBQztJQUNuQztJQUVBQyxRQUFRO1FBQ04sT0FBTyxJQUFJWCxRQUFRSyxRQUFRLENBQUMsSUFBSSxDQUFDSyxJQUFJO0lBQ3ZDO0lBRUFFLFdBQVc7UUFDVCxPQUFPO0lBQ1Q7SUFFQUMsZUFBZTtRQUNiLE9BQU9DLE9BQU9DLFFBQVEsQ0FBQyxJQUFJLENBQUNMLElBQUksQ0FBQ00sTUFBTSxDQUFDLEdBQUcsSUFBSTtJQUNqRDtJQUVBUixVQUFVO1FBQ1IsT0FBTyxJQUFJLENBQUNFLElBQUk7SUFDbEI7SUFFQU8sY0FBYztRQUNaLE9BQU8sSUFBSSxDQUFDVCxPQUFPO0lBQ3JCO0lBRUFVLGNBQWM7UUFDWixPQUFPLElBQUksQ0FBQ1YsT0FBTztJQUNyQjtJQTdDQSxZQUFhVyxTQUFTLENBQUU7UUFDdEIscUNBQXFDO1FBQ3JDLElBQUlBLFdBQVc7WUFDYkEsWUFBWUEsVUFBVUMsV0FBVztZQUNqQyxJQUFJLENBQUNwQixRQUFRQyxrQkFBa0IsQ0FBQ2tCLFlBQVk7Z0JBQzFDLE1BQU0sSUFBSUUsTUFBTTtZQUNsQjtZQUNBLHNFQUFzRTtZQUN0RSxJQUFJLENBQUNYLElBQUksR0FBR1M7UUFDZCxPQUFPO1lBQ0wsSUFBSSxDQUFDVCxJQUFJLEdBQUdZLE9BQU9ILFNBQVMsQ0FBQztRQUMvQjtJQUNGO0FBbUNGO0FBRUFwQixNQUFNd0IsT0FBTyxDQUFDLE9BQU9yQixPQUFPLElBQUlGLFFBQVFLLFFBQVEsQ0FBQ0g7QUFFakRGLFFBQVF3QixXQUFXLEdBQUcsQ0FBQ0M7SUFDckIsSUFBSUEsY0FBY3pCLFFBQVFLLFFBQVEsRUFBRTtRQUNsQyxPQUFPb0IsR0FBR2pCLE9BQU87SUFDbkIsT0FBTyxJQUFJLE9BQU9pQixPQUFPLFVBQVU7UUFDakMsSUFBSUMsWUFBWUQsR0FBR0UsTUFBTSxDQUFDO1FBQzFCLElBQUlGLE9BQU8sSUFBSTtZQUNiLE9BQU9BO1FBQ1QsT0FBTyxJQUFJQyxjQUFjLE9BQU8sbUNBQW1DO1FBQ3hEQSxjQUFjLE9BQU8sc0NBQXNDO1FBQzNEMUIsUUFBUUMsa0JBQWtCLENBQUN3QixPQUFPLGdDQUFnQztRQUNsRUMsY0FBYyxLQUFLO1lBQzVCLE9BQU8sQ0FBQyxDQUFDLEVBQUVELElBQUk7UUFDakIsT0FBTztZQUNMLE9BQU9BLElBQUksc0NBQXNDO1FBQ25EO0lBQ0YsT0FBTyxJQUFJQSxPQUFPRyxXQUFXO1FBQzNCLE9BQU87SUFDVCxPQUFPLElBQUksT0FBT0gsT0FBTyxZQUFZQSxPQUFPLE1BQU07UUFDaEQsTUFBTSxJQUFJSixNQUFNO0lBQ2xCLE9BQU87UUFDTCxPQUFPLENBQUMsQ0FBQyxFQUFFUSxLQUFLQyxTQUFTLENBQUNMLEtBQUs7SUFDakM7QUFDRjtBQUVBekIsUUFBUStCLE9BQU8sR0FBRyxDQUFDTjtJQUNqQixJQUFJQyxZQUFZRCxHQUFHRSxNQUFNLENBQUM7SUFDMUIsSUFBSUYsT0FBTyxJQUFJO1FBQ2IsT0FBT0E7SUFDVCxPQUFPLElBQUlBLE9BQU8sS0FBSztRQUNyQixPQUFPRztJQUNULE9BQU8sSUFBSUYsY0FBYyxLQUFLO1FBQzVCLE9BQU9ELEdBQUdULE1BQU0sQ0FBQztJQUNuQixPQUFPLElBQUlVLGNBQWMsS0FBSztRQUM1QixPQUFPRyxLQUFLRyxLQUFLLENBQUNQLEdBQUdULE1BQU0sQ0FBQztJQUM5QixPQUFPLElBQUloQixRQUFRQyxrQkFBa0IsQ0FBQ3dCLEtBQUs7UUFDekMsT0FBTyxJQUFJekIsUUFBUUssUUFBUSxDQUFDb0I7SUFDOUIsT0FBTztRQUNMLE9BQU9BO0lBQ1Q7QUFDRjtBQUVtQiIsImZpbGUiOiIvcGFja2FnZXMvbW9uZ28taWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBFSlNPTiB9IGZyb20gJ21ldGVvci9lanNvbic7XG5pbXBvcnQgeyBSYW5kb20gfSBmcm9tICdtZXRlb3IvcmFuZG9tJztcblxuY29uc3QgTW9uZ29JRCA9IHt9O1xuXG5Nb25nb0lELl9sb29rc0xpa2VPYmplY3RJRCA9IHN0ciA9PiBzdHIubGVuZ3RoID09PSAyNCAmJiAvXlswLTlhLWZdKiQvLnRlc3Qoc3RyKTtcblxuTW9uZ29JRC5PYmplY3RJRCA9IGNsYXNzIE9iamVjdElEIHtcbiAgY29uc3RydWN0b3IgKGhleFN0cmluZykge1xuICAgIC8vcmFuZG9tLWJhc2VkIGltcGwgb2YgTW9uZ28gT2JqZWN0SURcbiAgICBpZiAoaGV4U3RyaW5nKSB7XG4gICAgICBoZXhTdHJpbmcgPSBoZXhTdHJpbmcudG9Mb3dlckNhc2UoKTtcbiAgICAgIGlmICghTW9uZ29JRC5fbG9va3NMaWtlT2JqZWN0SUQoaGV4U3RyaW5nKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaGV4YWRlY2ltYWwgc3RyaW5nIGZvciBjcmVhdGluZyBhbiBPYmplY3RJRCcpO1xuICAgICAgfVxuICAgICAgLy8gbWVhbnQgdG8gd29yayB3aXRoIF8uaXNFcXVhbCgpLCB3aGljaCByZWxpZXMgb24gc3RydWN0dXJhbCBlcXVhbGl0eVxuICAgICAgdGhpcy5fc3RyID0gaGV4U3RyaW5nO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9zdHIgPSBSYW5kb20uaGV4U3RyaW5nKDI0KTtcbiAgICB9XG4gIH1cblxuICBlcXVhbHMob3RoZXIpIHtcbiAgICByZXR1cm4gb3RoZXIgaW5zdGFuY2VvZiBNb25nb0lELk9iamVjdElEICYmXG4gICAgdGhpcy52YWx1ZU9mKCkgPT09IG90aGVyLnZhbHVlT2YoKTtcbiAgfVxuXG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiBgT2JqZWN0SUQoXCIke3RoaXMuX3N0cn1cIilgO1xuICB9XG5cbiAgY2xvbmUoKSB7XG4gICAgcmV0dXJuIG5ldyBNb25nb0lELk9iamVjdElEKHRoaXMuX3N0cik7XG4gIH1cblxuICB0eXBlTmFtZSgpIHtcbiAgICByZXR1cm4gJ29pZCc7XG4gIH1cblxuICBnZXRUaW1lc3RhbXAoKSB7XG4gICAgcmV0dXJuIE51bWJlci5wYXJzZUludCh0aGlzLl9zdHIuc3Vic3RyKDAsIDgpLCAxNik7XG4gIH1cblxuICB2YWx1ZU9mKCkge1xuICAgIHJldHVybiB0aGlzLl9zdHI7XG4gIH1cblxuICB0b0pTT05WYWx1ZSgpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZU9mKCk7XG4gIH1cblxuICB0b0hleFN0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZU9mKCk7XG4gIH1cblxufVxuXG5FSlNPTi5hZGRUeXBlKCdvaWQnLCBzdHIgPT4gbmV3IE1vbmdvSUQuT2JqZWN0SUQoc3RyKSk7XG5cbk1vbmdvSUQuaWRTdHJpbmdpZnkgPSAoaWQpID0+IHtcbiAgaWYgKGlkIGluc3RhbmNlb2YgTW9uZ29JRC5PYmplY3RJRCkge1xuICAgIHJldHVybiBpZC52YWx1ZU9mKCk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGlkID09PSAnc3RyaW5nJykge1xuICAgIHZhciBmaXJzdENoYXIgPSBpZC5jaGFyQXQoMCk7XG4gICAgaWYgKGlkID09PSAnJykge1xuICAgICAgcmV0dXJuIGlkO1xuICAgIH0gZWxzZSBpZiAoZmlyc3RDaGFyID09PSAnLScgfHwgLy8gZXNjYXBlIHByZXZpb3VzbHkgZGFzaGVkIHN0cmluZ3NcbiAgICAgICAgICAgICAgIGZpcnN0Q2hhciA9PT0gJ34nIHx8IC8vIGVzY2FwZSBlc2NhcGVkIG51bWJlcnMsIHRydWUsIGZhbHNlXG4gICAgICAgICAgICAgICBNb25nb0lELl9sb29rc0xpa2VPYmplY3RJRChpZCkgfHwgLy8gZXNjYXBlIG9iamVjdC1pZC1mb3JtIHN0cmluZ3NcbiAgICAgICAgICAgICAgIGZpcnN0Q2hhciA9PT0gJ3snKSB7IC8vIGVzY2FwZSBvYmplY3QtZm9ybSBzdHJpbmdzLCBmb3IgbWF5YmUgaW1wbGVtZW50aW5nIGxhdGVyXG4gICAgICByZXR1cm4gYC0ke2lkfWA7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBpZDsgLy8gb3RoZXIgc3RyaW5ncyBnbyB0aHJvdWdoIHVuY2hhbmdlZC5cbiAgICB9XG4gIH0gZWxzZSBpZiAoaWQgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiAnLSc7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGlkID09PSAnb2JqZWN0JyAmJiBpZCAhPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0ZW9yIGRvZXMgbm90IGN1cnJlbnRseSBzdXBwb3J0IG9iamVjdHMgb3RoZXIgdGhhbiBPYmplY3RJRCBhcyBpZHMnKTtcbiAgfSBlbHNlIHsgLy8gTnVtYmVycywgdHJ1ZSwgZmFsc2UsIG51bGxcbiAgICByZXR1cm4gYH4ke0pTT04uc3RyaW5naWZ5KGlkKX1gO1xuICB9XG59O1xuXG5Nb25nb0lELmlkUGFyc2UgPSAoaWQpID0+IHtcbiAgdmFyIGZpcnN0Q2hhciA9IGlkLmNoYXJBdCgwKTtcbiAgaWYgKGlkID09PSAnJykge1xuICAgIHJldHVybiBpZDtcbiAgfSBlbHNlIGlmIChpZCA9PT0gJy0nKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfSBlbHNlIGlmIChmaXJzdENoYXIgPT09ICctJykge1xuICAgIHJldHVybiBpZC5zdWJzdHIoMSk7XG4gIH0gZWxzZSBpZiAoZmlyc3RDaGFyID09PSAnficpIHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShpZC5zdWJzdHIoMSkpO1xuICB9IGVsc2UgaWYgKE1vbmdvSUQuX2xvb2tzTGlrZU9iamVjdElEKGlkKSkge1xuICAgIHJldHVybiBuZXcgTW9uZ29JRC5PYmplY3RJRChpZCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGlkO1xuICB9XG59O1xuXG5leHBvcnQgeyBNb25nb0lEIH07XG4iXX0=
