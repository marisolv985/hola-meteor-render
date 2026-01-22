Package["core-runtime"].queue("random",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Random;

var require = meteorInstall({"node_modules":{"meteor":{"random":{"main_server.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/random/main_server.js                                                                                    //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({Random:()=>Random},true);let NodeRandomGenerator;module.link('./NodeRandomGenerator',{default(v){NodeRandomGenerator=v}},0);let createRandom;module.link('./createRandom',{default(v){createRandom=v}},1);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();// We use cryptographically strong PRNGs (crypto.getRandomBytes())
// When using crypto.getRandomValues(), our primitive is hexString(),
// from which we construct fraction().


const Random = createRandom(new NodeRandomGenerator());
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"AbstractRandomGenerator.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/random/AbstractRandomGenerator.js                                                                        //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.export({default:()=>RandomGenerator});let Meteor;module.link('meteor/meteor',{Meteor(v){Meteor=v}},0);// We use cryptographically strong PRNGs (crypto.getRandomBytes() on the server,
// window.crypto.getRandomValues() in the browser) when available. If these
// PRNGs fail, we fall back to the Alea PRNG, which is not cryptographically
// strong, and we seed it with various sources such as the date, Math.random,
// and window size on the client.  When using crypto.getRandomValues(), our
// primitive is hexString(), from which we construct fraction(). When using
// window.crypto.getRandomValues() or alea, the primitive is fraction and we use
// that to construct hex string.

const UNMISTAKABLE_CHARS = '23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz';
const BASE64_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ' + '0123456789-_';
class RandomGenerator {
    /**
   * @name Random.fraction
   * @summary Return a number between 0 and 1, like `Math.random`.
   * @locus Anywhere
   */ fraction() {
        throw new Error(`Unknown random generator type`);
    }
    /**
   * @name Random.hexString
   * @summary Return a random string of `n` hexadecimal digits.
   * @locus Anywhere
   * @param {Number} n Length of the string
   */ hexString(digits) {
        return this._randomString(digits, '0123456789abcdef');
    }
    _randomString(charsCount, alphabet) {
        let result = '';
        for(let i = 0; i < charsCount; i++){
            result += this.choice(alphabet);
        }
        return result;
    }
    /**
   * @name Random.id
   * @summary Return a unique identifier, such as `"Jjwjg6gouWLXhMGKW"`, that is
   * likely to be unique in the whole world.
   * @locus Anywhere
   * @param {Number} [n] Optional length of the identifier in characters
   *   (defaults to 17)
   */ id(charsCount) {
        // 17 characters is around 96 bits of entropy, which is the amount of
        // state in the Alea PRNG.
        if (charsCount === undefined) {
            charsCount = 17;
        }
        return this._randomString(charsCount, UNMISTAKABLE_CHARS);
    }
    /**
   * @name Random.secret
   * @summary Return a random string of printable characters with 6 bits of
   * entropy per character. Use `Random.secret` for security-critical secrets
   * that are intended for machine, rather than human, consumption.
   * @locus Anywhere
   * @param {Number} [n] Optional length of the secret string (defaults to 43
   *   characters, or 256 bits of entropy)
   */ secret(charsCount) {
        // Default to 256 bits of entropy, or 43 characters at 6 bits per
        // character.
        if (charsCount === undefined) {
            charsCount = 43;
        }
        return this._randomString(charsCount, BASE64_CHARS);
    }
    /**
   * @name Random.choice
   * @summary Return a random element of the given array or string.
   * @locus Anywhere
   * @param {Array|String} arrayOrString Array or string to choose from
   */ choice(arrayOrString) {
        const index = Math.floor(this.fraction() * arrayOrString.length);
        if (typeof arrayOrString === 'string') {
            return arrayOrString.substr(index, 1);
        }
        return arrayOrString[index];
    }
}
// `type` is one of `RandomGenerator.Type` as defined below.
//
// options:
// - seeds: (required, only for RandomGenerator.Type.ALEA) an array
//   whose items will be `toString`ed and used as the seed to the Alea
//   algorithm


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"AleaRandomGenerator.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/random/AleaRandomGenerator.js                                                                            //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.export({default:()=>AleaRandomGenerator});let RandomGenerator;module.link('./AbstractRandomGenerator',{default(v){RandomGenerator=v}},0);
// Alea PRNG, which is not cryptographically strong
// see http://baagoe.org/en/wiki/Better_random_numbers_for_javascript
// for a full discussion and Alea implementation.
function Alea(seeds) {
    function Mash() {
        let n = 0xefc8249d;
        const mash = (data)=>{
            data = data.toString();
            for(let i = 0; i < data.length; i++){
                n += data.charCodeAt(i);
                let h = 0.02519603282416938 * n;
                n = h >>> 0;
                h -= n;
                h *= n;
                n = h >>> 0;
                h -= n;
                n += h * 0x100000000; // 2^32
            }
            return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
        };
        mash.version = 'Mash 0.9';
        return mash;
    }
    let s0 = 0;
    let s1 = 0;
    let s2 = 0;
    let c = 1;
    if (seeds.length === 0) {
        seeds = [
            +new Date
        ];
    }
    let mash = Mash();
    s0 = mash(' ');
    s1 = mash(' ');
    s2 = mash(' ');
    for(let i = 0; i < seeds.length; i++){
        s0 -= mash(seeds[i]);
        if (s0 < 0) {
            s0 += 1;
        }
        s1 -= mash(seeds[i]);
        if (s1 < 0) {
            s1 += 1;
        }
        s2 -= mash(seeds[i]);
        if (s2 < 0) {
            s2 += 1;
        }
    }
    mash = null;
    const random = ()=>{
        const t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32
        s0 = s1;
        s1 = s2;
        return s2 = t - (c = t | 0);
    };
    random.uint32 = ()=>random() * 0x100000000; // 2^32
    random.fract53 = ()=>random() + (random() * 0x200000 | 0) * 1.1102230246251565e-16; // 2^-53
    random.version = 'Alea 0.9';
    random.args = seeds;
    return random;
}
class AleaRandomGenerator extends RandomGenerator {
    /**
   * @name Random.fraction
   * @summary Return a number between 0 and 1, like `Math.random`.
   * @locus Anywhere
   */ fraction() {
        return this.alea();
    }
    constructor({ seeds = [] } = {}){
        super();
        if (!seeds) {
            throw new Error('No seeds were provided for Alea PRNG');
        }
        this.alea = Alea(seeds);
    }
}
// options:
// - seeds: an array
//   whose items will be `toString`ed and used as the seed to the Alea
//   algorithm


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"NodeRandomGenerator.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/random/NodeRandomGenerator.js                                                                            //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({default:()=>NodeRandomGenerator});let crypto;module.link('crypto',{default(v){crypto=v}},0);let RandomGenerator;module.link('./AbstractRandomGenerator',{default(v){RandomGenerator=v}},1);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();

class NodeRandomGenerator extends RandomGenerator {
    /**
   * @name Random.fraction
   * @summary Return a number between 0 and 1, like `Math.random`.
   * @locus Anywhere
   */ fraction() {
        const numerator = Number.parseInt(this.hexString(8), 16);
        return numerator * 2.3283064365386963e-10; // 2^-3;
    }
    /**
   * @name Random.hexString
   * @summary Return a random string of `n` hexadecimal digits.
   * @locus Anywhere
   * @param {Number} n Length of the string
   */ hexString(digits) {
        const numBytes = Math.ceil(digits / 2);
        let bytes;
        // Try to get cryptographically strong randomness. Fall back to
        // non-cryptographically strong if not available.
        try {
            bytes = crypto.randomBytes(numBytes);
        } catch (e) {
            // XXX should re-throw any error except insufficient entropy
            bytes = crypto.pseudoRandomBytes(numBytes);
        }
        const result = bytes.toString('hex');
        // If the number of digits is odd, we'll have generated an extra 4 bits
        // of randomness, so we need to trim the last digit.
        return result.substring(0, digits);
    }
}

//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"createAleaGenerator.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/random/createAleaGenerator.js                                                                            //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.export({default:()=>createAleaGenerator});let AleaRandomGenerator;module.link('./AleaRandomGenerator',{default(v){AleaRandomGenerator=v}},0);
// instantiate RNG.  Heuristically collect entropy from various sources when a
// cryptographic PRNG isn't available.
// client sources
const height = typeof window !== 'undefined' && window.innerHeight || typeof document !== 'undefined' && document.documentElement && document.documentElement.clientHeight || typeof document !== 'undefined' && document.body && document.body.clientHeight || 1;
const width = typeof window !== 'undefined' && window.innerWidth || typeof document !== 'undefined' && document.documentElement && document.documentElement.clientWidth || typeof document !== 'undefined' && document.body && document.body.clientWidth || 1;
const agent = typeof navigator !== 'undefined' && navigator.userAgent || '';
function createAleaGenerator() {
    return new AleaRandomGenerator({
        seeds: [
            new Date,
            height,
            width,
            agent,
            Math.random()
        ]
    });
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"createRandom.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/random/createRandom.js                                                                                   //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.export({default:()=>createRandom});let AleaRandomGenerator;module.link('./AleaRandomGenerator',{default(v){AleaRandomGenerator=v}},0);let createAleaGeneratorWithGeneratedSeed;module.link('./createAleaGenerator',{default(v){createAleaGeneratorWithGeneratedSeed=v}},1);

function createRandom(generator) {
    // Create a non-cryptographically secure PRNG with a given seed (using
    // the Alea algorithm)
    generator.createWithSeeds = (...seeds)=>{
        if (seeds.length === 0) {
            throw new Error('No seeds were provided');
        }
        return new AleaRandomGenerator({
            seeds
        });
    };
    // Used like `Random`, but much faster and not cryptographically
    // secure
    generator.insecure = createAleaGeneratorWithGeneratedSeed();
    return generator;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});


/* Exports */
return {
  export: function () { return {
      Random: Random
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/random/main_server.js"
  ],
  mainModulePath: "/node_modules/meteor/random/main_server.js"
}});

//# sourceURL=meteor://💻app/packages/random.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcmFuZG9tL21haW5fc2VydmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yYW5kb20vQWJzdHJhY3RSYW5kb21HZW5lcmF0b3IuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JhbmRvbS9BbGVhUmFuZG9tR2VuZXJhdG9yLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yYW5kb20vTm9kZVJhbmRvbUdlbmVyYXRvci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcmFuZG9tL2NyZWF0ZUFsZWFHZW5lcmF0b3IuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JhbmRvbS9jcmVhdGVSYW5kb20uanMiXSwibmFtZXMiOlsiUmFuZG9tIiwiY3JlYXRlUmFuZG9tIiwiTm9kZVJhbmRvbUdlbmVyYXRvciIsIlVOTUlTVEFLQUJMRV9DSEFSUyIsIkJBU0U2NF9DSEFSUyIsIlJhbmRvbUdlbmVyYXRvciIsImZyYWN0aW9uIiwiRXJyb3IiLCJoZXhTdHJpbmciLCJkaWdpdHMiLCJfcmFuZG9tU3RyaW5nIiwiY2hhcnNDb3VudCIsImFscGhhYmV0IiwicmVzdWx0IiwiaSIsImNob2ljZSIsImlkIiwidW5kZWZpbmVkIiwic2VjcmV0IiwiYXJyYXlPclN0cmluZyIsImluZGV4IiwiTWF0aCIsImZsb29yIiwibGVuZ3RoIiwic3Vic3RyIiwiQWxlYSIsInNlZWRzIiwiTWFzaCIsIm4iLCJtYXNoIiwiZGF0YSIsInRvU3RyaW5nIiwiY2hhckNvZGVBdCIsImgiLCJ2ZXJzaW9uIiwiczAiLCJzMSIsInMyIiwiYyIsIkRhdGUiLCJyYW5kb20iLCJ0IiwidWludDMyIiwiZnJhY3Q1MyIsImFyZ3MiLCJBbGVhUmFuZG9tR2VuZXJhdG9yIiwiYWxlYSIsImNyeXB0byIsIm51bWVyYXRvciIsIk51bWJlciIsInBhcnNlSW50IiwibnVtQnl0ZXMiLCJjZWlsIiwiYnl0ZXMiLCJyYW5kb21CeXRlcyIsImUiLCJwc2V1ZG9SYW5kb21CeXRlcyIsInN1YnN0cmluZyIsImhlaWdodCIsIndpbmRvdyIsImlubmVySGVpZ2h0IiwiZG9jdW1lbnQiLCJkb2N1bWVudEVsZW1lbnQiLCJjbGllbnRIZWlnaHQiLCJib2R5Iiwid2lkdGgiLCJpbm5lcldpZHRoIiwiY2xpZW50V2lkdGgiLCJhZ2VudCIsIm5hdmlnYXRvciIsInVzZXJBZ2VudCIsImNyZWF0ZUFsZWFHZW5lcmF0b3IiLCJnZW5lcmF0b3IiLCJjcmVhdGVXaXRoU2VlZHMiLCJpbnNlY3VyZSIsImNyZWF0ZUFsZWFHZW5lcmF0b3JXaXRoR2VuZXJhdGVkU2VlZCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrRUFBa0U7QUFDbEUscUVBQXFFO0FBQ3JFLHNDQUFzQztBQUVrQjtBQUNkO0FBRTFDLE9BQU8sTUFBTUEsU0FBU0MsYUFBYSxJQUFJQyxnQkFBdUI7Ozs7Ozs7Ozs7Ozs7QUNQOUQsZ0ZBQWdGO0FBQ2hGLDJFQUEyRTtBQUMzRSw0RUFBNEU7QUFDNUUsNkVBQTZFO0FBQzdFLDJFQUEyRTtBQUMzRSwyRUFBMkU7QUFDM0UsZ0ZBQWdGO0FBQ2hGLGdDQUFnQztBQUVPO0FBRXZDLE1BQU1DLHFCQUFxQjtBQUMzQixNQUFNQyxlQUFlLHlEQUNuQjtBQVFhLE1BQU1DO0lBRW5COzs7O0dBSUMsR0FDREMsV0FBWTtRQUNWLE1BQU0sSUFBSUMsTUFBTSxDQUFDLDZCQUE2QixDQUFDO0lBQ2pEO0lBRUE7Ozs7O0dBS0MsR0FDREMsVUFBV0MsTUFBTSxFQUFFO1FBQ2pCLE9BQU8sSUFBSSxDQUFDQyxhQUFhLENBQUNELFFBQVE7SUFDcEM7SUFFQUMsY0FBZUMsVUFBVSxFQUFFQyxRQUFRLEVBQUU7UUFDbkMsSUFBSUMsU0FBUztRQUNiLElBQUssSUFBSUMsSUFBSSxHQUFHQSxJQUFJSCxZQUFZRyxJQUFLO1lBQ25DRCxVQUFVLElBQUksQ0FBQ0UsTUFBTSxDQUFDSDtRQUN4QjtRQUNBLE9BQU9DO0lBQ1Q7SUFFQTs7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ZW50IjpbIi8vIFdlIHVzZSBjcnlwdG9ncmFwaGljYWxseSBzdHJvbmcgUFJOR3MgKGNyeXB0by5nZXRSYW5kb21CeXRlcygpKVxuLy8gV2hlbiB1c2luZyBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKCksIG91ciBwcmltaXRpdmUgaXMgaGV4U3RyaW5nKCksXG4vLyBmcm9tIHdoaWNoIHdlIGNvbnN0cnVjdCBmcmFjdGlvbigpLlxuXG5pbXBvcnQgTm9kZVJhbmRvbUdlbmVyYXRvciBmcm9tICcuL05vZGVSYW5kb21HZW5lcmF0b3InO1xuaW1wb3J0IGNyZWF0ZVJhbmRvbSBmcm9tICcuL2NyZWF0ZVJhbmRvbSc7XG5cbmV4cG9ydCBjb25zdCBSYW5kb20gPSBjcmVhdGVSYW5kb20obmV3IE5vZGVSYW5kb21HZW5lcmF0b3IoKSk7XG4iLCIvLyBXZSB1c2UgY3J5cHRvZ3JhcGhpY2FsbHkgc3Ryb25nIFBSTkdzIChjcnlwdG8uZ2V0UmFuZG9tQnl0ZXMoKSBvbiB0aGUgc2VydmVyLFxuLy8gd2luZG93LmNyeXB0by5nZXRSYW5kb21WYWx1ZXMoKSBpbiB0aGUgYnJvd3Nlcikgd2hlbiBhdmFpbGFibGUuIElmIHRoZXNlXG4vLyBQUk5HcyBmYWlsLCB3ZSBmYWxsIGJhY2sgdG8gdGhlIEFsZWEgUFJORywgd2hpY2ggaXMgbm90IGNyeXB0b2dyYXBoaWNhbGx5XG4vLyBzdHJvbmcsIGFuZCB3ZSBzZWVkIGl0IHdpdGggdmFyaW91cyBzb3VyY2VzIHN1Y2ggYXMgdGhlIGRhdGUsIE1hdGgucmFuZG9tLFxuLy8gYW5kIHdpbmRvdyBzaXplIG9uIHRoZSBjbGllbnQuICBXaGVuIHVzaW5nIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMoKSwgb3VyXG4vLyBwcmltaXRpdmUgaXMgaGV4U3RyaW5nKCksIGZyb20gd2hpY2ggd2UgY29uc3RydWN0IGZyYWN0aW9uKCkuIFdoZW4gdXNpbmdcbi8vIHdpbmRvdy5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKCkgb3IgYWxlYSwgdGhlIHByaW1pdGl2ZSBpcyBmcmFjdGlvbiBhbmQgd2UgdXNlXG4vLyB0aGF0IHRvIGNvbnN0cnVjdCBoZXggc3RyaW5nLlxuXG5pbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcblxuY29uc3QgVU5NSVNUQUtBQkxFX0NIQVJTID0gJzIzNDU2Nzg5QUJDREVGR0hKS0xNTlBRUlNUV1hZWmFiY2RlZmdoaWprbW5vcHFyc3R1dnd4eXonO1xuY29uc3QgQkFTRTY0X0NIQVJTID0gJ2FiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVonICtcbiAgJzAxMjM0NTY3ODktXyc7XG5cbi8vIGB0eXBlYCBpcyBvbmUgb2YgYFJhbmRvbUdlbmVyYXRvci5UeXBlYCBhcyBkZWZpbmVkIGJlbG93LlxuLy9cbi8vIG9wdGlvbnM6XG4vLyAtIHNlZWRzOiAocmVxdWlyZWQsIG9ubHkgZm9yIFJhbmRvbUdlbmVyYXRvci5UeXBlLkFMRUEpIGFuIGFycmF5XG4vLyAgIHdob3NlIGl0ZW1zIHdpbGwgYmUgYHRvU3RyaW5nYGVkIGFuZCB1c2VkIGFzIHRoZSBzZWVkIHRvIHRoZSBBbGVhXG4vLyAgIGFsZ29yaXRobVxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmFuZG9tR2VuZXJhdG9yIHtcblxuICAvKipcbiAgICogQG5hbWUgUmFuZG9tLmZyYWN0aW9uXG4gICAqIEBzdW1tYXJ5IFJldHVybiBhIG51bWJlciBiZXR3ZWVuIDAgYW5kIDEsIGxpa2UgYE1hdGgucmFuZG9tYC5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqL1xuICBmcmFjdGlvbiAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHJhbmRvbSBnZW5lcmF0b3IgdHlwZWApO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFJhbmRvbS5oZXhTdHJpbmdcbiAgICogQHN1bW1hcnkgUmV0dXJuIGEgcmFuZG9tIHN0cmluZyBvZiBgbmAgaGV4YWRlY2ltYWwgZGlnaXRzLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG4gTGVuZ3RoIG9mIHRoZSBzdHJpbmdcbiAgICovXG4gIGhleFN0cmluZyAoZGlnaXRzKSB7XG4gICAgcmV0dXJuIHRoaXMuX3JhbmRvbVN0cmluZyhkaWdpdHMsICcwMTIzNDU2Nzg5YWJjZGVmJyk7XG4gIH1cblxuICBfcmFuZG9tU3RyaW5nIChjaGFyc0NvdW50LCBhbHBoYWJldCkge1xuICAgIGxldCByZXN1bHQgPSAnJztcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNoYXJzQ291bnQ7IGkrKykge1x0XG4gICAgICByZXN1bHQgKz0gdGhpcy5jaG9pY2UoYWxwaGFiZXQpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFJhbmRvbS5pZFxuICAgKiBAc3VtbWFyeSBSZXR1cm4gYSB1bmlxdWUgaWRlbnRpZmllciwgc3VjaCBhcyBgXCJKandqZzZnb3VXTFhoTUdLV1wiYCwgdGhhdCBpc1xuICAgKiBsaWtlbHkgdG8gYmUgdW5pcXVlIGluIHRoZSB3aG9sZSB3b3JsZC5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbbl0gT3B0aW9uYWwgbGVuZ3RoIG9mIHRoZSBpZGVudGlmaWVyIGluIGNoYXJhY3RlcnNcbiAgICogICAoZGVmYXVsdHMgdG8gMTcpXG4gICAqL1xuICBpZCAoY2hhcnNDb3VudCkge1xuICAgIC8vIDE3IGNoYXJhY3RlcnMgaXMgYXJvdW5kIDk2IGJpdHMgb2YgZW50cm9weSwgd2hpY2ggaXMgdGhlIGFtb3VudCBvZlxuICAgIC8vIHN0YXRlIGluIHRoZSBBbGVhIFBSTkcuXG4gICAgaWYgKGNoYXJzQ291bnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY2hhcnNDb3VudCA9IDE3O1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9yYW5kb21TdHJpbmcoY2hhcnNDb3VudCwgVU5NSVNUQUtBQkxFX0NIQVJTKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbmFtZSBSYW5kb20uc2VjcmV0XG4gICAqIEBzdW1tYXJ5IFJldHVybiBhIHJhbmRvbSBzdHJpbmcgb2YgcHJpbnRhYmxlIGNoYXJhY3RlcnMgd2l0aCA2IGJpdHMgb2ZcbiAgICogZW50cm9weSBwZXIgY2hhcmFjdGVyLiBVc2UgYFJhbmRvbS5zZWNyZXRgIGZvciBzZWN1cml0eS1jcml0aWNhbCBzZWNyZXRzXG4gICAqIHRoYXQgYXJlIGludGVuZGVkIGZvciBtYWNoaW5lLCByYXRoZXIgdGhhbiBodW1hbiwgY29uc3VtcHRpb24uXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAcGFyYW0ge051bWJlcn0gW25dIE9wdGlvbmFsIGxlbmd0aCBvZiB0aGUgc2VjcmV0IHN0cmluZyAoZGVmYXVsdHMgdG8gNDNcbiAgICogICBjaGFyYWN0ZXJzLCBvciAyNTYgYml0cyBvZiBlbnRyb3B5KVxuICAgKi9cbiAgc2VjcmV0IChjaGFyc0NvdW50KSB7XG4gICAgLy8gRGVmYXVsdCB0byAyNTYgYml0cyBvZiBlbnRyb3B5LCBvciA0MyBjaGFyYWN0ZXJzIGF0IDYgYml0cyBwZXJcbiAgICAvLyBjaGFyYWN0ZXIuXG4gICAgaWYgKGNoYXJzQ291bnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY2hhcnNDb3VudCA9IDQzO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9yYW5kb21TdHJpbmcoY2hhcnNDb3VudCwgQkFTRTY0X0NIQVJTKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbmFtZSBSYW5kb20uY2hvaWNlXG4gICAqIEBzdW1tYXJ5IFJldHVybiBhIHJhbmRvbSBlbGVtZW50IG9mIHRoZSBnaXZlbiBhcnJheSBvciBzdHJpbmcuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAcGFyYW0ge0FycmF5fFN0cmluZ30gYXJyYXlPclN0cmluZyBBcnJheSBvciBzdHJpbmcgdG8gY2hvb3NlIGZyb21cbiAgICovXG4gIGNob2ljZSAoYXJyYXlPclN0cmluZykge1xuICAgIGNvbnN0IGluZGV4ID0gTWF0aC5mbG9vcih0aGlzLmZyYWN0aW9uKCkgKiBhcnJheU9yU3RyaW5nLmxlbmd0aCk7XG4gICAgaWYgKHR5cGVvZiBhcnJheU9yU3RyaW5nID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIGFycmF5T3JTdHJpbmcuc3Vic3RyKGluZGV4LCAxKTtcbiAgICB9XG4gICAgcmV0dXJuIGFycmF5T3JTdHJpbmdbaW5kZXhdO1xuICB9XG59XG4iLCJpbXBvcnQgUmFuZG9tR2VuZXJhdG9yIGZyb20gJy4vQWJzdHJhY3RSYW5kb21HZW5lcmF0b3InO1xuXG4vLyBBbGVhIFBSTkcsIHdoaWNoIGlzIG5vdCBjcnlwdG9ncmFwaGljYWxseSBzdHJvbmdcbi8vIHNlZSBodHRwOi8vYmFhZ29lLm9yZy9lbi93aWtpL0JldHRlcl9yYW5kb21fbnVtYmVyc19mb3JfamF2YXNjcmlwdFxuLy8gZm9yIGEgZnVsbCBkaXNjdXNzaW9uIGFuZCBBbGVhIGltcGxlbWVudGF0aW9uLlxuZnVuY3Rpb24gQWxlYShzZWVkcykge1xuICBmdW5jdGlvbiBNYXNoKCkge1xuICAgIGxldCBuID0gMHhlZmM4MjQ5ZDtcblxuICAgIGNvbnN0IG1hc2ggPSAoZGF0YSkgPT4ge1xuICAgICAgZGF0YSA9IGRhdGEudG9TdHJpbmcoKTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICBuICs9IGRhdGEuY2hhckNvZGVBdChpKTtcbiAgICAgICAgbGV0IGggPSAwLjAyNTE5NjAzMjgyNDE2OTM4ICogbjtcbiAgICAgICAgbiA9IGggPj4+IDA7XG4gICAgICAgIGggLT0gbjtcbiAgICAgICAgaCAqPSBuO1xuICAgICAgICBuID0gaCA+Pj4gMDtcbiAgICAgICAgaCAtPSBuO1xuICAgICAgICBuICs9IGggKiAweDEwMDAwMDAwMDsgLy8gMl4zMlxuICAgICAgfVxuICAgICAgcmV0dXJuIChuID4+PiAwKSAqIDIuMzI4MzA2NDM2NTM4Njk2M2UtMTA7IC8vIDJeLTMyXG4gICAgfTtcblxuICAgIG1hc2gudmVyc2lvbiA9ICdNYXNoIDAuOSc7XG4gICAgcmV0dXJuIG1hc2g7XG4gIH1cblxuICBsZXQgczAgPSAwO1xuICBsZXQgczEgPSAwO1xuICBsZXQgczIgPSAwO1xuICBsZXQgYyA9IDE7XG4gIGlmIChzZWVkcy5sZW5ndGggPT09IDApIHtcbiAgICBzZWVkcyA9IFsrbmV3IERhdGVdO1xuICB9XG4gIGxldCBtYXNoID0gTWFzaCgpO1xuICBzMCA9IG1hc2goJyAnKTtcbiAgczEgPSBtYXNoKCcgJyk7XG4gIHMyID0gbWFzaCgnICcpO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc2VlZHMubGVuZ3RoOyBpKyspIHtcbiAgICBzMCAtPSBtYXNoKHNlZWRzW2ldKTtcbiAgICBpZiAoczAgPCAwKSB7XG4gICAgICBzMCArPSAxO1xuICAgIH1cbiAgICBzMSAtPSBtYXNoKHNlZWRzW2ldKTtcbiAgICBpZiAoczEgPCAwKSB7XG4gICAgICBzMSArPSAxO1xuICAgIH1cbiAgICBzMiAtPSBtYXNoKHNlZWRzW2ldKTtcbiAgICBpZiAoczIgPCAwKSB7XG4gICAgICBzMiArPSAxO1xuICAgIH1cbiAgfVxuICBtYXNoID0gbnVsbDtcblxuICBjb25zdCByYW5kb20gPSAoKSA9PiB7XG4gICAgY29uc3QgdCA9ICgyMDkxNjM5ICogczApICsgKGMgKiAyLjMyODMwNjQzNjUzODY5NjNlLTEwKTsgLy8gMl4tMzJcbiAgICBzMCA9IHMxO1xuICAgIHMxID0gczI7XG4gICAgcmV0dXJuIHMyID0gdCAtIChjID0gdCB8IDApO1xuICB9O1xuXG4gIHJhbmRvbS51aW50MzIgPSAoKSA9PiByYW5kb20oKSAqIDB4MTAwMDAwMDAwOyAvLyAyXjMyXG4gIHJhbmRvbS5mcmFjdDUzID0gKCkgPT4gcmFuZG9tKCkgK1xuICAgICAgICAoKHJhbmRvbSgpICogMHgyMDAwMDAgfCAwKSAqIDEuMTEwMjIzMDI0NjI1MTU2NWUtMTYpOyAvLyAyXi01M1xuXG4gIHJhbmRvbS52ZXJzaW9uID0gJ0FsZWEgMC45JztcbiAgcmFuZG9tLmFyZ3MgPSBzZWVkcztcbiAgcmV0dXJuIHJhbmRvbTtcbn1cblxuLy8gb3B0aW9uczpcbi8vIC0gc2VlZHM6IGFuIGFycmF5XG4vLyAgIHdob3NlIGl0ZW1zIHdpbGwgYmUgYHRvU3RyaW5nYGVkIGFuZCB1c2VkIGFzIHRoZSBzZWVkIHRvIHRoZSBBbGVhXG4vLyAgIGFsZ29yaXRobVxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQWxlYVJhbmRvbUdlbmVyYXRvciBleHRlbmRzIFJhbmRvbUdlbmVyYXRvciB7XG4gIGNvbnN0cnVjdG9yICh7IHNlZWRzID0gW10gfSA9IHt9KSB7XG4gICAgc3VwZXIoKTtcbiAgICBpZiAoIXNlZWRzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIHNlZWRzIHdlcmUgcHJvdmlkZWQgZm9yIEFsZWEgUFJORycpO1xuICAgIH1cbiAgICB0aGlzLmFsZWEgPSBBbGVhKHNlZWRzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbmFtZSBSYW5kb20uZnJhY3Rpb25cbiAgICogQHN1bW1hcnkgUmV0dXJuIGEgbnVtYmVyIGJldHdlZW4gMCBhbmQgMSwgbGlrZSBgTWF0aC5yYW5kb21gLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICovXG4gIGZyYWN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5hbGVhKCk7XG4gIH1cbn1cbiIsImltcG9ydCBjcnlwdG8gZnJvbSAnY3J5cHRvJztcbmltcG9ydCBSYW5kb21HZW5lcmF0b3IgZnJvbSAnLi9BYnN0cmFjdFJhbmRvbUdlbmVyYXRvcic7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE5vZGVSYW5kb21HZW5lcmF0b3IgZXh0ZW5kcyBSYW5kb21HZW5lcmF0b3Ige1xuICAvKipcbiAgICogQG5hbWUgUmFuZG9tLmZyYWN0aW9uXG4gICAqIEBzdW1tYXJ5IFJldHVybiBhIG51bWJlciBiZXR3ZWVuIDAgYW5kIDEsIGxpa2UgYE1hdGgucmFuZG9tYC5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqL1xuICBmcmFjdGlvbiAoKSB7XG4gICAgY29uc3QgbnVtZXJhdG9yID0gTnVtYmVyLnBhcnNlSW50KHRoaXMuaGV4U3RyaW5nKDgpLCAxNik7XG4gICAgcmV0dXJuIG51bWVyYXRvciAqIDIuMzI4MzA2NDM2NTM4Njk2M2UtMTA7IC8vIDJeLTM7XG4gIH1cblxuICAvKipcbiAgICogQG5hbWUgUmFuZG9tLmhleFN0cmluZ1xuICAgKiBAc3VtbWFyeSBSZXR1cm4gYSByYW5kb20gc3RyaW5nIG9mIGBuYCBoZXhhZGVjaW1hbCBkaWdpdHMuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAcGFyYW0ge051bWJlcn0gbiBMZW5ndGggb2YgdGhlIHN0cmluZ1xuICAgKi9cbiAgaGV4U3RyaW5nIChkaWdpdHMpIHtcbiAgICBjb25zdCBudW1CeXRlcyA9IE1hdGguY2VpbChkaWdpdHMgLyAyKTtcbiAgICBsZXQgYnl0ZXM7XG4gICAgLy8gVHJ5IHRvIGdldCBjcnlwdG9ncmFwaGljYWxseSBzdHJvbmcgcmFuZG9tbmVzcy4gRmFsbCBiYWNrIHRvXG4gICAgLy8gbm9uLWNyeXB0b2dyYXBoaWNhbGx5IHN0cm9uZyBpZiBub3QgYXZhaWxhYmxlLlxuICAgIHRyeSB7XG4gICAgICBieXRlcyA9IGNyeXB0by5yYW5kb21CeXRlcyhudW1CeXRlcyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gWFhYIHNob3VsZCByZS10aHJvdyBhbnkgZXJyb3IgZXhjZXB0IGluc3VmZmljaWVudCBlbnRyb3B5XG4gICAgICBieXRlcyA9IGNyeXB0by5wc2V1ZG9SYW5kb21CeXRlcyhudW1CeXRlcyk7XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IGJ5dGVzLnRvU3RyaW5nKCdoZXgnKTtcbiAgICAvLyBJZiB0aGUgbnVtYmVyIG9mIGRpZ2l0cyBpcyBvZGQsIHdlJ2xsIGhhdmUgZ2VuZXJhdGVkIGFuIGV4dHJhIDQgYml0c1xuICAgIC8vIG9mIHJhbmRvbW5lc3MsIHNvIHdlIG5lZWQgdG8gdHJpbSB0aGUgbGFzdCBkaWdpdC5cbiAgICByZXR1cm4gcmVzdWx0LnN1YnN0cmluZygwLCBkaWdpdHMpO1xuICB9XG59XG4iLCJpbXBvcnQgQWxlYVJhbmRvbUdlbmVyYXRvciBmcm9tICcuL0FsZWFSYW5kb21HZW5lcmF0b3InO1xuXG4vLyBpbnN0YW50aWF0ZSBSTkcuICBIZXVyaXN0aWNhbGx5IGNvbGxlY3QgZW50cm9weSBmcm9tIHZhcmlvdXMgc291cmNlcyB3aGVuIGFcbi8vIGNyeXB0b2dyYXBoaWMgUFJORyBpc24ndCBhdmFpbGFibGUuXG5cbi8vIGNsaWVudCBzb3VyY2VzXG5jb25zdCBoZWlnaHQgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmlubmVySGVpZ2h0KSB8fFxuICAgICAgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCdcbiAgICAgICAmJiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnRcbiAgICAgICAmJiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0KSB8fFxuICAgICAgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCdcbiAgICAgICAmJiBkb2N1bWVudC5ib2R5XG4gICAgICAgJiYgZG9jdW1lbnQuYm9keS5jbGllbnRIZWlnaHQpIHx8XG4gICAgICAxO1xuXG5jb25zdCB3aWR0aCA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuaW5uZXJXaWR0aCkgfHxcbiAgICAgICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnXG4gICAgICAgJiYgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50XG4gICAgICAgJiYgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoKSB8fFxuICAgICAgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCdcbiAgICAgICAmJiBkb2N1bWVudC5ib2R5XG4gICAgICAgJiYgZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCkgfHxcbiAgICAgIDE7XG5cbmNvbnN0IGFnZW50ID0gKHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnICYmIG5hdmlnYXRvci51c2VyQWdlbnQpIHx8ICcnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjcmVhdGVBbGVhR2VuZXJhdG9yKCkge1xuICByZXR1cm4gbmV3IEFsZWFSYW5kb21HZW5lcmF0b3Ioe1xuICAgIHNlZWRzOiBbbmV3IERhdGUsIGhlaWdodCwgd2lkdGgsIGFnZW50LCBNYXRoLnJhbmRvbSgpXSxcbiAgfSk7XG59XG4iLCJpbXBvcnQgQWxlYVJhbmRvbUdlbmVyYXRvciBmcm9tICcuL0FsZWFSYW5kb21HZW5lcmF0b3InXG5pbXBvcnQgY3JlYXRlQWxlYUdlbmVyYXRvcldpdGhHZW5lcmF0ZWRTZWVkIGZyb20gJy4vY3JlYXRlQWxlYUdlbmVyYXRvcic7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNyZWF0ZVJhbmRvbShnZW5lcmF0b3IpIHtcbiAgLy8gQ3JlYXRlIGEgbm9uLWNyeXB0b2dyYXBoaWNhbGx5IHNlY3VyZSBQUk5HIHdpdGggYSBnaXZlbiBzZWVkICh1c2luZ1xuICAvLyB0aGUgQWxlYSBhbGdvcml0aG0pXG4gIGdlbmVyYXRvci5jcmVhdGVXaXRoU2VlZHMgPSAoLi4uc2VlZHMpID0+IHtcbiAgICBpZiAoc2VlZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIHNlZWRzIHdlcmUgcHJvdmlkZWQnKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBBbGVhUmFuZG9tR2VuZXJhdG9yKHsgc2VlZHMgfSk7XG4gIH07XG5cbiAgLy8gVXNlZCBsaWtlIGBSYW5kb21gLCBidXQgbXVjaCBmYXN0ZXIgYW5kIG5vdCBjcnlwdG9ncmFwaGljYWxseVxuICAvLyBzZWN1cmVcbiAgZ2VuZXJhdG9yLmluc2VjdXJlID0gY3JlYXRlQWxlYUdlbmVyYXRvcldpdGhHZW5lcmF0ZWRTZWVkKCk7XG5cbiAgcmV0dXJuIGdlbmVyYXRvcjtcbn1cbiJdfQ==
