Package["core-runtime"].queue("base64",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Base64;

var require = meteorInstall({"node_modules":{"meteor":{"base64":{"base64.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                        //
// packages/base64/base64.js                                                              //
//                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////
                                                                                          //
module.export({Base64:()=>Base64},true);// Base 64 encoding
const BASE_64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE_64_VALS = Object.create(null);
const getChar = (val)=>BASE_64_CHARS.charAt(val);
const getVal = (ch)=>ch === '=' ? -1 : BASE_64_VALS[ch];
for(let i = 0; i < BASE_64_CHARS.length; i++){
    BASE_64_VALS[getChar(i)] = i;
}
;
const encode = (array)=>{
    if (typeof array === "string") {
        const str = array;
        array = newBinary(str.length);
        for(let i = 0; i < str.length; i++){
            const ch = str.charCodeAt(i);
            if (ch > 0xFF) {
                throw new Error("Not ascii. Base64.encode can only take ascii strings.");
            }
            array[i] = ch;
        }
    }
    const answer = [];
    let a = null;
    let b = null;
    let c = null;
    let d = null;
    for(let i = 0; i < array.length; i++){
        switch(i % 3){
            case 0:
                a = array[i] >> 2 & 0x3F;
                b = (array[i] & 0x03) << 4;
                break;
            case 1:
                b = b | array[i] >> 4 & 0xF;
                c = (array[i] & 0xF) << 2;
                break;
            case 2:
                c = c | array[i] >> 6 & 0x03;
                d = array[i] & 0x3F;
                answer.push(getChar(a));
                answer.push(getChar(b));
                answer.push(getChar(c));
                answer.push(getChar(d));
                a = null;
                b = null;
                c = null;
                d = null;
                break;
        }
    }
    if (a != null) {
        answer.push(getChar(a));
        answer.push(getChar(b));
        if (c == null) {
            answer.push('=');
        } else {
            answer.push(getChar(c));
        }
        if (d == null) {
            answer.push('=');
        }
    }
    return answer.join("");
};
// XXX This is a weird place for this to live, but it's used both by
// this package and 'ejson', and we can't put it in 'ejson' without
// introducing a circular dependency. It should probably be in its own
// package or as a helper in a package that both 'base64' and 'ejson'
// use.
const newBinary = (len)=>{
    if (typeof Uint8Array === 'undefined' || typeof ArrayBuffer === 'undefined') {
        const ret = [];
        for(let i = 0; i < len; i++){
            ret.push(0);
        }
        ret.$Uint8ArrayPolyfill = true;
        return ret;
    }
    return new Uint8Array(new ArrayBuffer(len));
};
const decode = (str)=>{
    let len = Math.floor(str.length * 3 / 4);
    if (str.charAt(str.length - 1) == '=') {
        len--;
        if (str.charAt(str.length - 2) == '=') {
            len--;
        }
    }
    const arr = newBinary(len);
    let one = null;
    let two = null;
    let three = null;
    let j = 0;
    for(let i = 0; i < str.length; i++){
        const c = str.charAt(i);
        const v = getVal(c);
        switch(i % 4){
            case 0:
                if (v < 0) {
                    throw new Error('invalid base64 string');
                }
                one = v << 2;
                break;
            case 1:
                if (v < 0) {
                    throw new Error('invalid base64 string');
                }
                one = one | v >> 4;
                arr[j++] = one;
                two = (v & 0x0F) << 4;
                break;
            case 2:
                if (v >= 0) {
                    two = two | v >> 2;
                    arr[j++] = two;
                    three = (v & 0x03) << 6;
                }
                break;
            case 3:
                if (v >= 0) {
                    arr[j++] = three | v;
                }
                break;
        }
    }
    return arr;
};
const Base64 = {
    encode,
    decode,
    newBinary
};

////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});


/* Exports */
return {
  export: function () { return {
      Base64: Base64
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/base64/base64.js"
  ],
  mainModulePath: "/node_modules/meteor/base64/base64.js"
}});

//# sourceURL=meteor://💻app/packages/base64.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYmFzZTY0L2Jhc2U2NC5qcyJdLCJuYW1lcyI6WyJCQVNFXzY0X0NIQVJTIiwiQkFTRV82NF9WQUxTIiwiT2JqZWN0IiwiY3JlYXRlIiwiZ2V0Q2hhciIsInZhbCIsImNoYXJBdCIsImdldFZhbCIsImNoIiwiaSIsImxlbmd0aCIsImVuY29kZSIsImFycmF5Iiwic3RyIiwibmV3QmluYXJ5IiwiY2hhckNvZGVBdCIsIkVycm9yIiwiYW5zd2VyIiwiYSIsImIiLCJjIiwiZCIsInB1c2giLCJqb2luIiwibGVuIiwiVWludDhBcnJheSIsIkFycmF5QnVmZmVyIiwicmV0IiwiJFVpbnQ4QXJyYXlQb2x5ZmlsbCIsImRlY29kZSIsIk1hdGgiLCJmbG9vciIsImFyciIsIm9uZSIsInR3byIsInRocmVlIiwiaiIsInYiLCJCYXNlNjQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsbUJBQW1CO0FBRW5CLE1BQU1BLGdCQUFnQjtBQUV0QixNQUFNQyxlQUFlQyxPQUFPQyxNQUFNLENBQUM7QUFFbkMsTUFBTUMsVUFBVUMsT0FBT0wsY0FBY00sTUFBTSxDQUFDRDtBQUM1QyxNQUFNRSxTQUFTQyxNQUFNQSxPQUFPLE1BQU0sQ0FBQyxJQUFJUCxZQUFZLENBQUNPLEdBQUc7QUFFdkQsSUFBSyxJQUFJQyxJQUFJLEdBQUdBLElBQUlULGNBQWNVLE1BQU0sRUFBRUQsSUFBSztJQUM3Q1IsWUFBWSxDQUFDRyxRQUFRSyxHQUFHLEdBQUdBO0FBQzdCOztBQUVBLE1BQU1FLFNBQVNDO0lBQ2IsSUFBSSxPQUFPQSxVQUFVLFVBQVU7UUFDN0IsTUFBTUMsTUFBTUQ7UUFDWkEsUUFBUUUsVUFBVUQsSUFBSUgsTUFBTTtRQUM1QixJQUFLLElBQUlELElBQUksR0FBR0EsSUFBSUksSUFBSUgsTUFBTSxFQUFFRCxJQUFLO1lBQ25DLE1BQU1ELEtBQUtLLElBQUlFLFVBQVUsQ0FBQ047WUFDMUIsSUFBSUQsS0FBSyxN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LEtBQUs7Z0JBQ0gsSUFBSUEsSUFBSSxHQUFHO29CQUNULE1BQU0sSUFBSXJCLE1BQU07Z0JBQ2xCO2dCQUVBaUIsTUFBTUEsTUFBT0ksS0FBSztnQkFDbEJMLEdBQUcsQ0FBQ0ksSUFBSSxHQUFHSDtnQkFDWEMsTUFBT0csS0FBSSxJQUFHLEtBQU07Z0JBQ3BCO1lBQ0YsS0FBSztnQkFDSCxJQUFJQSxLQUFLLEdBQUc7b0JBQ1ZILE1BQU1BLE1BQU9HLEtBQUs7b0JBQ2xCTCxHQUFHLENBQUNJLElBQUksR0FBR0Y7b0JBQ1hDLFFBQVNFLEtBQUksSUFBRyxLQUFNO2dCQUN4QjtnQkFFQTtZQUNGLEtBQUs7Z0JBQ0gsSUFBSUEsS0FBSyxHQUFHO29CQUNWTCxHQUFHLENBQUNJLElBQUksR0FBR0QsUUFBUUU7Z0JBQ3JCO2dCQUVBO1FBQ0o7SUFDRjtJQUVBLE9BQU9MO0FBQ1Q7QUFFQSxPQUFPLE1BQU1NLEdBQVM7SUFBRTNCO0lBQVFrQjtJQUFRZjtBQUFVLEVBQUUiLCJmaWxlIjoiL3BhY2thZ2VzL2Jhc2U2NC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEJhc2UgNjQgZW5jb2RpbmdcblxuY29uc3QgQkFTRV82NF9DSEFSUyA9IFwiQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrL1wiO1xuXG5jb25zdCBCQVNFXzY0X1ZBTFMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG5jb25zdCBnZXRDaGFyID0gdmFsID0+IEJBU0VfNjRfQ0hBUlMuY2hhckF0KHZhbCk7XG5jb25zdCBnZXRWYWwgPSBjaCA9PiBjaCA9PT0gJz0nID8gLTEgOiBCQVNFXzY0X1ZBTFNbY2hdO1xuXG5mb3IgKGxldCBpID0gMDsgaSA8IEJBU0VfNjRfQ0hBUlMubGVuZ3RoOyBpKyspIHtcbiAgQkFTRV82NF9WQUxTW2dldENoYXIoaSldID0gaTtcbn07XG5cbmNvbnN0IGVuY29kZSA9IGFycmF5ID0+IHtcbiAgaWYgKHR5cGVvZiBhcnJheSA9PT0gXCJzdHJpbmdcIikge1xuICAgIGNvbnN0IHN0ciA9IGFycmF5O1xuICAgIGFycmF5ID0gbmV3QmluYXJ5KHN0ci5sZW5ndGgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBjaCA9IHN0ci5jaGFyQ29kZUF0KGkpO1xuICAgICAgaWYgKGNoID4gMHhGRikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgXCJOb3QgYXNjaWkuIEJhc2U2NC5lbmNvZGUgY2FuIG9ubHkgdGFrZSBhc2NpaSBzdHJpbmdzLlwiKTtcbiAgICAgIH1cblxuICAgICAgYXJyYXlbaV0gPSBjaDtcbiAgICB9XG4gIH1cblxuICBjb25zdCBhbnN3ZXIgPSBbXTtcbiAgbGV0IGEgPSBudWxsO1xuICBsZXQgYiA9IG51bGw7XG4gIGxldCBjID0gbnVsbDtcbiAgbGV0IGQgPSBudWxsO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICBzd2l0Y2ggKGkgJSAzKSB7XG4gICAgICBjYXNlIDA6XG4gICAgICAgIGEgPSAoYXJyYXlbaV0gPj4gMikgJiAweDNGO1xuICAgICAgICBiID0gKGFycmF5W2ldICYgMHgwMykgPDwgNDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIGIgPSBiIHwgKGFycmF5W2ldID4+IDQpICYgMHhGO1xuICAgICAgICBjID0gKGFycmF5W2ldICYgMHhGKSA8PCAyO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgYyA9IGMgfCAoYXJyYXlbaV0gPj4gNikgJiAweDAzO1xuICAgICAgICBkID0gYXJyYXlbaV0gJiAweDNGO1xuICAgICAgICBhbnN3ZXIucHVzaChnZXRDaGFyKGEpKTtcbiAgICAgICAgYW5zd2VyLnB1c2goZ2V0Q2hhcihiKSk7XG4gICAgICAgIGFuc3dlci5wdXNoKGdldENoYXIoYykpO1xuICAgICAgICBhbnN3ZXIucHVzaChnZXRDaGFyKGQpKTtcbiAgICAgICAgYSA9IG51bGw7XG4gICAgICAgIGIgPSBudWxsO1xuICAgICAgICBjID0gbnVsbDtcbiAgICAgICAgZCA9IG51bGw7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIGlmIChhICE9IG51bGwpIHtcbiAgICBhbnN3ZXIucHVzaChnZXRDaGFyKGEpKTtcbiAgICBhbnN3ZXIucHVzaChnZXRDaGFyKGIpKTtcbiAgICBpZiAoYyA9PSBudWxsKSB7XG4gICAgICBhbnN3ZXIucHVzaCgnPScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhbnN3ZXIucHVzaChnZXRDaGFyKGMpKTtcbiAgICB9XG5cbiAgICBpZiAoZCA9PSBudWxsKSB7XG4gICAgICBhbnN3ZXIucHVzaCgnPScpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBhbnN3ZXIuam9pbihcIlwiKTtcbn07XG5cblxuXG4vLyBYWFggVGhpcyBpcyBhIHdlaXJkIHBsYWNlIGZvciB0aGlzIHRvIGxpdmUsIGJ1dCBpdCdzIHVzZWQgYm90aCBieVxuLy8gdGhpcyBwYWNrYWdlIGFuZCAnZWpzb24nLCBhbmQgd2UgY2FuJ3QgcHV0IGl0IGluICdlanNvbicgd2l0aG91dFxuLy8gaW50cm9kdWNpbmcgYSBjaXJjdWxhciBkZXBlbmRlbmN5LiBJdCBzaG91bGQgcHJvYmFibHkgYmUgaW4gaXRzIG93blxuLy8gcGFja2FnZSBvciBhcyBhIGhlbHBlciBpbiBhIHBhY2thZ2UgdGhhdCBib3RoICdiYXNlNjQnIGFuZCAnZWpzb24nXG4vLyB1c2UuXG5jb25zdCBuZXdCaW5hcnkgPSBsZW4gPT4ge1xuICBpZiAodHlwZW9mIFVpbnQ4QXJyYXkgPT09ICd1bmRlZmluZWQnIHx8IHR5cGVvZiBBcnJheUJ1ZmZlciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBjb25zdCByZXQgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICByZXQucHVzaCgwKTtcbiAgICB9XG5cbiAgICByZXQuJFVpbnQ4QXJyYXlQb2x5ZmlsbCA9IHRydWU7XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkobmV3IEFycmF5QnVmZmVyKGxlbikpO1xufTtcblxuY29uc3QgZGVjb2RlID0gc3RyID0+IHtcbiAgbGV0IGxlbiA9IE1hdGguZmxvb3IoKHN0ci5sZW5ndGggKiAzKSAvIDQpO1xuICBpZiAoc3RyLmNoYXJBdChzdHIubGVuZ3RoIC0gMSkgPT0gJz0nKSB7XG4gICAgbGVuLS07XG4gICAgaWYgKHN0ci5jaGFyQXQoc3RyLmxlbmd0aCAtIDIpID09ICc9Jykge1xuICAgICAgbGVuLS07XG4gICAgfVxuICB9XG5cbiAgY29uc3QgYXJyID0gbmV3QmluYXJ5KGxlbik7XG5cbiAgbGV0IG9uZSA9IG51bGw7XG4gIGxldCB0d28gPSBudWxsO1xuICBsZXQgdGhyZWUgPSBudWxsO1xuXG4gIGxldCBqID0gMDtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGMgPSBzdHIuY2hhckF0KGkpO1xuICAgIGNvbnN0IHYgPSBnZXRWYWwoYyk7XG4gICAgc3dpdGNoIChpICUgNCkge1xuICAgICAgY2FzZSAwOlxuICAgICAgICBpZiAodiA8IDApIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgYmFzZTY0IHN0cmluZycpO1xuICAgICAgICB9XG5cbiAgICAgICAgb25lID0gdiA8PCAyO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaWYgKHYgPCAwKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhbGlkIGJhc2U2NCBzdHJpbmcnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9uZSA9IG9uZSB8ICh2ID4+IDQpO1xuICAgICAgICBhcnJbaisrXSA9IG9uZTtcbiAgICAgICAgdHdvID0gKHYgJiAweDBGKSA8PCA0O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaWYgKHYgPj0gMCkge1xuICAgICAgICAgIHR3byA9IHR3byB8ICh2ID4+IDIpO1xuICAgICAgICAgIGFycltqKytdID0gdHdvO1xuICAgICAgICAgIHRocmVlID0gKHYgJiAweDAzKSA8PCA2O1xuICAgICAgICB9XG5cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGlmICh2ID49IDApIHtcbiAgICAgICAgICBhcnJbaisrXSA9IHRocmVlIHwgdjtcbiAgICAgICAgfVxuXG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBhcnI7XG59O1xuXG5leHBvcnQgY29uc3QgQmFzZTY0ID0geyBlbmNvZGUsIGRlY29kZSwgbmV3QmluYXJ5IH07XG4iXX0=
