Package["core-runtime"].queue("minimongo",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var DiffSequence = Package['diff-sequence'].DiffSequence;
var ECMAScript = Package.ecmascript.ECMAScript;
var EJSON = Package.ejson.EJSON;
var GeoJSON = Package['geojson-utils'].GeoJSON;
var IdMap = Package['id-map'].IdMap;
var MongoID = Package['mongo-id'].MongoID;
var OrderedDict = Package['ordered-dict'].OrderedDict;
var Random = Package.random.Random;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var Decimal = Package['mongo-decimal'].Decimal;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var MinimongoTest, MinimongoError, LocalCollection, Minimongo;

var require = meteorInstall({"node_modules":{"meteor":{"minimongo":{"minimongo_server.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/minimongo_server.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.link('./minimongo_common.js');let hasOwn,isNumericKey,isOperatorObject,pathsToTree,projectionDetails;module.link('./common.js',{hasOwn(v){hasOwn=v},isNumericKey(v){isNumericKey=v},isOperatorObject(v){isOperatorObject=v},pathsToTree(v){pathsToTree=v},projectionDetails(v){projectionDetails=v}},0);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();

Minimongo._pathsElidingNumericKeys = (paths)=>paths.map((path)=>path.split('.').filter((part)=>!isNumericKey(part)).join('.'));
// Returns true if the modifier applied to some document may change the result
// of matching the document by selector
// The modifier is always in a form of Object:
//  - $set
//    - 'a.b.22.z': value
//    - 'foo.bar': 42
//  - $unset
//    - 'abc.d': 1
Minimongo.Matcher.prototype.affectedByModifier = function(modifier) {
    // safe check for $set/$unset being objects
    modifier = Object.assign({
        $set: {},
        $unset: {}
    }, modifier);
    const meaningfulPaths = this._getPaths();
    const modifiedPaths = [].concat(Object.keys(modifier.$set), Object.keys(modifier.$unset));
    return modifiedPaths.some((path)=>{
        const mod = path.split('.');
        return meaningfulPaths.some((meaningfulPath)=>{
            const sel = meaningfulPath.split('.');
            let i = 0, j = 0;
            while(i < sel.length && j < mod.length){
                if (isNumericKey(sel[i]) && isNumericKey(mod[j])) {
                    // foo.4.bar selector affected by foo.4 modifier
                    // foo.3.bar selector unaffected by foo.4 modifier
                    if (sel[i] === mod[j]) {
                        i++;
                        j++;
                    } else {
                        return false;
                    }
                } else if (isNumericKey(sel[i])) {
                    // foo.4.bar selector unaffected by foo.bar modifier
                    return false;
                } else if (isNumericKey(mod[j])) {
                    j++;
                } else if (sel[i] === mod[j]) {
                    i++;
                    j++;
                } else {
                    return false;
                }
            }
            // One is a prefix of another, taking numeric fields into account
            return true;
        });
    });
};
// @param modifier - Object: MongoDB-styled modifier with `$set`s and `$unsets`
//                           only. (assumed to come from oplog)
// @returns - Boolean: if after applying the modifier, selector can start
//                     accepting the modified value.
// NOTE: assumes that document affected by modifier didn't match this Matcher
// before, so if modifier can't convince selector in a positive change it would
// stay 'false'.
// Currently doesn't support $-operators and numeric indices precisely.
Minimongo.Matcher.prototype.canBecomeTrueByModifier = function(modifier) {
    if (!this.affectedByModifier(modifier)) {
        return false;
    }
    if (!this.isSimple()) {
        return true;
    }
    modifier = Object.assign({
        $set: {},
        $unset: {}
    }, modifier);
    const modifierPaths = [].concat(Object.keys(modifier.$set), Object.keys(modifier.$unset));
    if (this._getPaths().some(pathHasNumericKeys) || modifierPaths.some(pathHasNumericKeys)) {
        return true;
    }
    // check if there is a $set or $unset that indicates something is an
    // object rather than a scalar in the actual object where we saw $-operator
    // NOTE: it is correct since we allow only scalars in $-operators
    // Example: for selector {'a.b': {$gt: 5}} the modifier {'a.b.c':7} would
    // definitely set the result to false as 'a.b' appears to be an object.
    const expectedScalarIsObject = Object.keys(this._selector).some((path)=>{
        if (!isOperatorObject(this._selector[path])) {
            return false;
        }
        return modifierPaths.some((modifierPath)=>modifierPath.startsWith(`${path}.`));
    });
    if (expectedScalarIsObject) {
        return false;
    }
    // See if we can apply the modifier on the ideally matching object. If it
    // still matches the selector, then the modifier could have turned the real
    // object in the database into something matching.
    const matchingDocument = EJSON.clone(this.matchingDocument());
    // The selector is too complex, anything can happen.
    if (matchingDocument === null) {
        return true;
    }
    try {
        LocalCollection._modify(matchingDocument, modifier);
    } catch (error) {
        // Couldn't set a property on a field which is a scalar or null in the
        // selector.
        // Example:
        // real document: { 'a.b': 3 }
        // selector: { 'a': 12 }
        // converted selector (ideal document): { 'a': 12 }
        // modifier: { $set: { 'a.b': 4 } }
        // We don't know what real document was like but from the error raised by
        // $set on a scalar field we can reason that the structure of real document
        // is completely different.
        if (error.name === 'MinimongoError' && error.setPropertyError) {
            return false;
        }
        throw error;
    }
    return this.documentMatches(matchingDocument).result;
};
// Knows how to combine a mongo selector and a fields projection to a new fields
// projection taking into account active fields from the passed selector.
// @returns Object - projection object (same as fields option of mongo cursor)
Minimongo.Matcher.prototype.combineIntoProjection = function(projection) {
    const selectorPaths = Minimongo._pathsElidingNumericKeys(this._getPaths());
    // Special case for $where operator in the selector - projection should depend
    // on all fields of the document. getSelectorPaths returns a list of paths
    // selector depends on. If one of the paths is '' (empty string) representing
    // the root or the whole document, complete projection should be returned.
    if (selectorPaths.includes('')) {
        return {};
    }
    return combineImportantPathsIntoProjection(selectorPaths, projection);
};
// Returns an object that would match the selector if possible or null if the
// selector is too complex for us to analyze
// { 'a.b': { ans: 42 }, 'foo.bar': null, 'foo.baz': "something" }
// => { a: { b: { ans: 42 } }, foo: { bar: null, baz: "something" } }
Minimongo.Matcher.prototype.matchingDocument = function() {
    // check if it was computed before
    if (this._matchingDocument !== undefined) {
        return this._matchingDocument;
    }
    // If the analysis of this selector is too hard for our implementation
    // fallback to "YES"
    let fallback = false;
    this._matchingDocument = pathsToTree(this._getPaths(), (path)=>{
        const valueSelector = this._selector[path];
        if (isOperatorObject(valueSelector)) {
            // if there is a strict equality, there is a good
            // chance we can use one of those as "matching"
            // dummy value
            if (valueSelector.$eq) {
                return valueSelector.$eq;
            }
            if (valueSelector.$in) {
                const matcher = new Minimongo.Matcher({
                    placeholder: valueSelector
                });
                // Return anything from $in that matches the whole selector for this
                // path. If nothing matches, returns `undefined` as nothing can make
                // this selector into `true`.
                return valueSelector.$in.find((placeholder)=>matcher.documentMatches({
                        placeholder
                    }).result);
            }
            if (onlyContainsKeys(valueSelector, [
                '$gt',
                '$gte',
                '$lt',
                '$lte'
            ])) {
                let lowerBound = -Infinity;
                let upperBound = Infinity;
                [
                    '$lte',
                    '$lt'
                ].forEach((op)=>{
                    if (hasOwn.call(valueSelector, op) && valueSelector[op] < upperBound) {
                        upperBound = valueSelector[op];
                    }
                });
                [
                    '$gte',
                    '$gt'
                ].forEach((op)=>{
                    if (hasOwn.call(valueSelector, op) && valueSelector[op] > lowerBound) {
                        lowerBound = valueSelector[op];
                    }
                });
                const middle = (lowerBound + upperBound) / 2;
                const matcher = new Minimongo.Matcher({
                    placeholder: valueSelector
                });
                if (!matcher.documentMatches({
                    placeholder: middle
                }).result && (middle === lowerBound || middle === upperBound)) {
                    fallback = true;
                }
                return middle;
            }
            if (onlyContainsKeys(valueSelector, [
                '$nin',
                '$ne'
            ])) {
                // Since this._isSimple makes sure $nin and $ne are not combined with
                // objects or arrays, we can confidently return an empty object as it
                // never matches any scalar.
                return {};
            }
            fallback = true;
        }
        return this._selector[path];
    }, (x)=>x);
    if (fallback) {
        this._matchingDocument = null;
    }
    return this._matchingDocument;
};
// Minimongo.Sorter gets a similar method, which delegates to a Matcher it made
// for this exact purpose.
Minimongo.Sorter.prototype.affectedByModifier = function(modifier) {
    return this._selectorForAffectedByModifier.affectedByModifier(modifier);
};
Minimongo.Sorter.prototype.combineIntoProjection = function(projection) {
    return combineImportantPathsIntoProjection(Minimongo._pathsElidingNumericKeys(this._getPaths()), projection);
};
function combineImportantPathsIntoProjection(paths, projection) {
    const details = projectionDetails(projection);
    // merge the paths to include
    const tree = pathsToTree(paths, (path)=>true, (node, path, fullPath)=>true, details.tree);
    const mergedProjection = treeToPaths(tree);
    if (details.including) {
        // both selector and projection are pointing on fields to include
        // so we can just return the merged tree
        return mergedProjection;
    }
    // selector is pointing at fields to include
    // projection is pointing at fields to exclude
    // make sure we don't exclude important paths
    const mergedExclProjection = {};
    Object.keys(mergedProjection).forEach((path)=>{
        if (!mergedProjection[path]) {
            mergedExclProjection[path] = false;
        }
    });
    return mergedExclProjection;
}
function getPaths(selector) {
    return Object.keys(new Minimongo.Matcher(selector)._paths);
// XXX remove it?
// return Object.keys(selector).map(k => {
//   // we don't know how to handle $where because it can be anything
//   if (k === '$where') {
//     return ''; // matches everything
//   }
//   // we branch from $or/$and/$nor operator
//   if (['$or', '$and', '$nor'].includes(k)) {
//     return selector[k].map(getPaths);
//   }
//   // the value is a literal or some comparison operator
//   return k;
// })
//   .reduce((a, b) => a.concat(b), [])
//   .filter((a, b, c) => c.indexOf(a) === b);
}
// A helper to ensure object has only certain keys
function onlyContainsKeys(obj, keys) {
    return Object.keys(obj).every((k)=>keys.includes(k));
}
function pathHasNumericKeys(path) {
    return path.split('.').some(isNumericKey);
}
// Returns a set of key paths similar to
// { 'foo.bar': 1, 'a.b.c': 1 }
function treeToPaths(tree, prefix = '') {
    const result = {};
    Object.keys(tree).forEach((key)=>{
        const value = tree[key];
        if (value === Object(value)) {
            Object.assign(result, treeToPaths(value, `${prefix + key}.`));
        } else {
            result[prefix + key] = value;
        }
    });
    return result;
}
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"common.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/common.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({MiniMongoQueryError:()=>MiniMongoQueryError,compileDocumentSelector:()=>compileDocumentSelector,equalityElementMatcher:()=>equalityElementMatcher,expandArraysInBranches:()=>expandArraysInBranches,isIndexable:()=>isIndexable,isNumericKey:()=>isNumericKey,isOperatorObject:()=>isOperatorObject,makeLookupFunction:()=>makeLookupFunction,nothingMatcher:()=>nothingMatcher,pathsToTree:()=>pathsToTree,populateDocumentWithQueryFields:()=>populateDocumentWithQueryFields,projectionDetails:()=>projectionDetails,regexpElementMatcher:()=>regexpElementMatcher});module.export({hasOwn:()=>hasOwn,ELEMENT_OPERATORS:()=>ELEMENT_OPERATORS},true);let LocalCollection;module.link('./local_collection.js',{default(v){LocalCollection=v}},0);
const hasOwn = Object.prototype.hasOwnProperty;
class MiniMongoQueryError extends Error {
}
// Each element selector contains:
//  - compileElementSelector, a function with args:
//    - operand - the "right hand side" of the operator
//    - valueSelector - the "context" for the operator (so that $regex can find
//      $options)
//    - matcher - the Matcher this is going into (so that $elemMatch can compile
//      more things)
//    returning a function mapping a single value to bool.
//  - dontExpandLeafArrays, a bool which prevents expandArraysInBranches from
//    being called
//  - dontIncludeLeafArrays, a bool which causes an argument to be passed to
//    expandArraysInBranches if it is called
const ELEMENT_OPERATORS = {
    $lt: makeInequality((cmpValue)=>cmpValue < 0),
    $gt: makeInequality((cmpValue)=>cmpValue > 0),
    $lte: makeInequality((cmpValue)=>cmpValue <= 0),
    $gte: makeInequality((cmpValue)=>cmpValue >= 0),
    $mod: {
        compileElementSelector (operand) {
            if (!(Array.isArray(operand) && operand.length === 2 && typeof operand[0] === 'number' && typeof operand[1] === 'number')) {
                throw new MiniMongoQueryError('argument to $mod must be an array of two numbers');
            }
            // XXX could require to be ints or round or something
            const divisor = operand[0];
            const remainder = operand[1];
            return (value)=>typeof value === 'number' && value % divisor === remainder;
        }
    },
    $in: {
        compileElementSelector (operand) {
            if (!Array.isArray(operand)) {
                throw new MiniMongoQueryError('$in needs an array');
            }
            const elementMatchers = operand.map((option)=>{
                if (option instanceof RegExp) {
                    return regexpElementMatcher(option);
                }
                if (isOperatorObject(option)) {
                    throw new MiniMongoQueryError('cannot nest $ under $in');
                }
                return equalityElementMatcher(option);
            });
            return (value)=>{
                // Allow {a: {$in: [null]}} to match when 'a' does not exist.
                if (value === undefined) {
                    value = null;
                }
                return elementMatchers.some((matcher)=>matcher(value));
            };
        }
    },
    $size: {
        // {a: [[5, 5]]} must match {a: {$size: 1}} but not {a: {$size: 2}}, so we
        // don't want to consider the element [5,5] in the leaf array [[5,5]] as a
        // possible value.
        dontExpandLeafArrays: true,
        compileElementSelector (operand) {
            if (typeof operand === 'string') {
                // Don't ask me why, but by experimentation, this seems to be what Mongo
                // does.
                operand = 0;
            } else if (typeof operand !== 'number') {
                throw new MiniMongoQueryError('$size needs a number');
            }
            return (value)=>Array.isArray(value) && value.length === operand;
        }
    },
    $type: {
        // {a: [5]} must not match {a: {$type: 4}} (4 means array), but it should
        // match {a: {$type: 1}} (1 means number), and {a: [[5]]} must match {$a:
        // {$type: 4}}. Thus, when we see a leaf array, we *should* expand it but
        // should *not* include it itself.
        dontIncludeLeafArrays: true,
        compileElementSelector (operand) {
            if (typeof operand === 'string') {
                const operandAliasMap = {
                    'double': 1,
                    'string': 2,
                    'object': 3,
                    'array': 4,
                    'binData': 5,
                    'undefined': 6,
                    'objectId': 7,
                    'bool': 8,
                    'date': 9,
                    'null': 10,
                    'regex': 11,
                    'dbPointer': 12,
                    'javascript': 13,
                    'symbol': 14,
                    'javascriptWithScope': 15,
                    'int': 16,
                    'timestamp': 17,
                    'long': 18,
                    'decimal': 19,
                    'minKey': -1,
                    'maxKey': 127
                };
                if (!hasOwn.call(operandAliasMap, operand)) {
                    throw new MiniMongoQueryError(`unknown string alias for $type: ${operand}`);
                }
                operand = operandAliasMap[operand];
            } else if (typeof operand === 'number') {
                if (operand === 0 || operand < -1 || operand > 19 && operand !== 127) {
                    throw new MiniMongoQueryError(`Invalid numerical $type code: ${operand}`);
                }
            } else {
                throw new MiniMongoQueryError('argument to $type is not a number or a string');
            }
            return (value)=>value !== undefined && LocalCollection._f._type(value) === operand;
        }
    },
    $bitsAllSet: {
        compileElementSelector (operand) {
            const mask = getOperandBitmask(operand, '$bitsAllSet');
            return (value)=>{
                const bitmask = getValueBitmask(value, mask.length);
                return bitmask && mask.every((byte, i)=>(bitmask[i] & byte) === byte);
            };
        }
    },
    $bitsAnySet: {
        compileElementSelector (operand) {
            const mask = getOperandBitmask(operand, '$bitsAnySet');
            return (value)=>{
                const bitmask = getValueBitmask(value, mask.length);
                return bitmask && mask.some((byte, i)=>(~bitmask[i] & byte) !== byte);
            };
        }
    },
    $bitsAllClear: {
        compileElementSelector (operand) {
            const mask = getOperandBitmask(operand, '$bitsAllClear');
            return (value)=>{
                const bitmask = getValueBitmask(value, mask.length);
                return bitmask && mask.every((byte, i)=>!(bitmask[i] & byte));
            };
        }
    },
    $bitsAnyClear: {
        compileElementSelector (operand) {
            const mask = getOperandBitmask(operand, '$bitsAnyClear');
            return (value)=>{
                const bitmask = getValueBitmask(value, mask.length);
                return bitmask && mask.some((byte, i)=>(bitmask[i] & byte) !== byte);
            };
        }
    },
    $regex: {
        compileElementSelector (operand, valueSelector) {
            if (!(typeof operand === 'string' || operand instanceof RegExp)) {
                throw new MiniMongoQueryError('$regex has to be a string or RegExp');
            }
            let regexp;
            if (valueSelector.$options !== undefined) {
                // Options passed in $options (even the empty string) always overrides
                // options in the RegExp object itself.
                // Be clear that we only support the JS-supported options, not extended
                // ones (eg, Mongo supports x and s). Ideally we would implement x and s
                // by transforming the regexp, but not today...
                if (/[^gim]/.test(valueSelector.$options)) {
                    throw new MiniMongoQueryError('Only the i, m, and g regexp options are supported');
                }
                const source = operand instanceof RegExp ? operand.source : operand;
                regexp = new RegExp(source, valueSelector.$options);
            } else if (operand instanceof RegExp) {
                regexp = operand;
            } else {
                regexp = new RegExp(operand);
            }
            return regexpElementMatcher(regexp);
        }
    },
    $elemMatch: {
        dontExpandLeafArrays: true,
        compileElementSelector (operand, valueSelector, matcher) {
            if (!LocalCollection._isPlainObject(operand)) {
                throw new MiniMongoQueryError('$elemMatch need an object');
            }
            const isDocMatcher = !isOperatorObject(Object.keys(operand).filter((key)=>!hasOwn.call(LOGICAL_OPERATORS, key)).reduce((a, b)=>Object.assign(a, {
                    [b]: operand[b]
                }), {}), true);
            let subMatcher;
            if (isDocMatcher) {
                // This is NOT the same as compileValueSelector(operand), and not just
                // because of the slightly different calling convention.
                // {$elemMatch: {x: 3}} means "an element has a field x:3", not
                // "consists only of a field x:3". Also, regexps and sub-$ are allowed.
                subMatcher = compileDocumentSelector(operand, matcher, {
                    inElemMatch: true
                });
            } else {
                subMatcher = compileValueSelector(operand, matcher);
            }
            return (value)=>{
                if (!Array.isArray(value)) {
                    return false;
                }
                for(let i = 0; i < value.length; ++i){
                    const arrayElement = value[i];
                    let arg;
                    if (isDocMatcher) {
                        // We can only match {$elemMatch: {b: 3}} against objects.
                        // (We can also match against arrays, if there's numeric indices,
                        // eg {$elemMatch: {'0.b': 3}} or {$elemMatch: {0: 3}}.)
                        if (!isIndexable(arrayElement)) {
                            return false;
                        }
                        arg = arrayElement;
                    } else {
                        // dontIterate ensures that {a: {$elemMatch: {$gt: 5}}} matches
                        // {a: [8]} but not {a: [[8]]}
                        arg = [
                            {
                                value: arrayElement,
                                dontIterate: true
                            }
                        ];
                    }
                    // XXX support $near in $elemMatch by propagating $distance?
                    if (subMatcher(arg).result) {
                        return i; // specially understood to mean "use as arrayIndices"
                    }
                }
                return false;
            };
        }
    }
};
// Operators that appear at the top level of a document selector.
const LOGICAL_OPERATORS = {
    $and (subSelector, matcher, inElemMatch) {
        return andDocumentMatchers(compileArrayOfDocumentSelectors(subSelector, matcher, inElemMatch));
    },
    $or (subSelector, matcher, inElemMatch) {
        const matchers = compileArrayOfDocumentSelectors(subSelector, matcher, inElemMatch);
        // Special case: if there is only one matcher, use it directly, *preserving*
        // any arrayIndices it returns.
        if (matchers.length === 1) {
            return matchers[0];
        }
        return (doc)=>{
            const result = matchers.some((fn)=>fn(doc).result);
            // $or does NOT set arrayIndices when it has multiple
            // sub-expressions. (Tested against MongoDB.)
            return {
                result
            };
        };
    },
    $nor (subSelector, matcher, inElemMatch) {
        const matchers = compileArrayOfDocumentSelectors(subSelector, matcher, inElemMatch);
        return (doc)=>{
            const result = matchers.every((fn)=>!fn(doc).result);
            // Never set arrayIndices, because we only match if nothing in particular
            // 'matched' (and because this is consistent with MongoDB).
            return {
                result
            };
        };
    },
    $where (selectorValue, matcher) {
        // Record that *any* path may be used.
        matcher._recordPathUsed('');
        matcher._hasWhere = true;
        if (!(selectorValue instanceof Function)) {
            // XXX MongoDB seems to have more complex logic to decide where or or not
            // to add 'return'; not sure exactly what it is.
            selectorValue = Function('obj', `return ${selectorValue}`);
        }
        // We make the document available as both `this` and `obj`.
        // // XXX not sure what we should do if this throws
        return (doc)=>({
                result: selectorValue.call(doc, doc)
            });
    },
    // This is just used as a comment in the query (in MongoDB, it also ends up in
    // query logs); it has no effect on the actual selection.
    $comment () {
        return ()=>({
                result: true
            });
    }
};
// Operators that (unlike LOGICAL_OPERATORS) pertain to individual paths in a
// document, but (unlike ELEMENT_OPERATORS) do not have a simple definition as
// "match each branched value independently and combine with
// convertElementMatcherToBranchedMatcher".
const VALUE_OPERATORS = {
    $eq (operand) {
        return convertElementMatcherToBranchedMatcher(equalityElementMatcher(operand));
    },
    $not (operand, valueSelector, matcher) {
        return invertBranchedMatcher(compileValueSelector(operand, matcher));
    },
    $ne (operand) {
        return invertBranchedMatcher(convertElementMatcherToBranchedMatcher(equalityElementMatcher(operand)));
    },
    $nin (operand) {
        return invertBranchedMatcher(convertElementMatcherToBranchedMatcher(ELEMENT_OPERATORS.$in.compileElementSelector(operand)));
    },
    $exists (operand) {
        const exists = convertElementMatcherToBranchedMatcher((value)=>value !== undefined);
        return operand ? exists : invertBranchedMatcher(exists);
    },
    // $options just provides options for $regex; its logic is inside $regex
    $options (operand, valueSelector) {
        if (!hasOwn.call(valueSelector, '$regex')) {
            throw new MiniMongoQueryError('$options needs a $regex');
        }
        return everythingMatcher;
    },
    // $maxDistance is basically an argument to $near
    $maxDistance (operand, valueSelector) {
        if (!valueSelector.$near) {
            throw new MiniMongoQueryError('$maxDistance needs a $near');
        }
        return everythingMatcher;
    },
    $all (operand, valueSelector, matcher) {
        if (!Array.isArray(operand)) {
            throw new MiniMongoQueryError('$all requires array');
        }
        // Not sure why, but this seems to be what MongoDB does.
        if (operand.length === 0) {
            return nothingMatcher;
        }
        const branchedMatchers = operand.map((criterion)=>{
            // XXX handle $all/$elemMatch combination
            if (isOperatorObject(criterion)) {
                throw new MiniMongoQueryError('no $ expressions in $all');
            }
            // This is always a regexp or equality selector.
            return compileValueSelector(criterion, matcher);
        });
        // andBranchedMatchers does NOT require all selectors to return true on the
        // SAME branch.
        return andBranchedMatchers(branchedMatchers);
    },
    $near (operand, valueSelector, matcher, isRoot) {
        if (!isRoot) {
            throw new MiniMongoQueryError('$near can\'t be inside another $ operator');
        }
        matcher._hasGeoQuery = true;
        // There are two kinds of geodata in MongoDB: legacy coordinate pairs and
        // GeoJSON. They use different distance metrics, too. GeoJSON queries are
        // marked with a $geometry property, though legacy coordinates can be
        // matched using $geometry.
        let maxDistance, point, distance;
        if (LocalCollection._isPlainObject(operand) && hasOwn.call(operand, '$geometry')) {
            // GeoJSON "2dsphere" mode.
            maxDistance = operand.$maxDistance;
            point = operand.$geometry;
            distance = (value)=>{
                // XXX: for now, we don't calculate the actual distance between, say,
                // polygon and circle. If people care about this use-case it will get
                // a priority.
                if (!value) {
                    return null;
                }
                if (!value.type) {
                    return GeoJSON.pointDistance(point, {
                        type: 'Point',
                        coordinates: pointToArray(value)
                    });
                }
                if (value.type === 'Point') {
                    return GeoJSON.pointDistance(point, value);
                }
                return GeoJSON.geometryWithinRadius(value, point, maxDistance) ? 0 : maxDistance + 1;
            };
        } else {
            maxDistance = valueSelector.$maxDistance;
            if (!isIndexable(operand)) {
                throw new MiniMongoQueryError('$near argument must be coordinate pair or GeoJSON');
            }
            point = pointToArray(operand);
            distance = (value)=>{
                if (!isIndexable(value)) {
                    return null;
                }
                return distanceCoordinatePairs(point, value);
            };
        }
        return (branchedValues)=>{
            // There might be multiple points in the document that match the given
            // field. Only one of them needs to be within $maxDistance, but we need to
            // evaluate all of them and use the nearest one for the implicit sort
            // specifier. (That's why we can't just use ELEMENT_OPERATORS here.)
            //
            // Note: This differs from MongoDB's implementation, where a document will
            // actually show up *multiple times* in the result set, with one entry for
            // each within-$maxDistance branching point.
            const result = {
                result: false
            };
            expandArraysInBranches(branchedValues).every((branch)=>{
                // if operation is an update, don't skip branches, just return the first
                // one (#3599)
                let curDistance;
                if (!matcher._isUpdate) {
                    if (!(typeof branch.value === 'object')) {
                        return true;
                    }
                    curDistance = distance(branch.value);
                    // Skip branches that aren't real points or are too far away.
                    if (curDistance === null || curDistance > maxDistance) {
                        return true;
                    }
                    // Skip anything that's a tie.
                    if (result.distance !== undefined && result.distance <= curDistance) {
                        return true;
                    }
                }
                result.result = true;
                result.distance = curDistance;
                if (branch.arrayIndices) {
                    result.arrayIndices = branch.arrayIndices;
                } else {
                    delete result.arrayIndices;
                }
                return !matcher._isUpdate;
            });
            return result;
        };
    }
};
// NB: We are cheating and using this function to implement 'AND' for both
// 'document matchers' and 'branched matchers'. They both return result objects
// but the argument is different: for the former it's a whole doc, whereas for
// the latter it's an array of 'branched values'.
function andSomeMatchers(subMatchers) {
    if (subMatchers.length === 0) {
        return everythingMatcher;
    }
    if (subMatchers.length === 1) {
        return subMatchers[0];
    }
    return (docOrBranches)=>{
        const match = {};
        match.result = subMatchers.every((fn)=>{
            const subResult = fn(docOrBranches);
            // Copy a 'distance' number out of the first sub-matcher that has
            // one. Yes, this means that if there are multiple $near fields in a
            // query, something arbitrary happens; this appears to be consistent with
            // Mongo.
            if (subResult.result && subResult.distance !== undefined && match.distance === undefined) {
                match.distance = subResult.distance;
            }
            // Similarly, propagate arrayIndices from sub-matchers... but to match
            // MongoDB behavior, this time the *last* sub-matcher with arrayIndices
            // wins.
            if (subResult.result && subResult.arrayIndices) {
                match.arrayIndices = subResult.arrayIndices;
            }
            return subResult.result;
        });
        // If we didn't actually match, forget any extra metadata we came up with.
        if (!match.result) {
            delete match.distance;
            delete match.arrayIndices;
        }
        return match;
    };
}
const andDocumentMatchers = andSomeMatchers;
const andBranchedMatchers = andSomeMatchers;
function compileArrayOfDocumentSelectors(selectors, matcher, inElemMatch) {
    if (!Array.isArray(selectors) || selectors.length === 0) {
        throw new MiniMongoQueryError('$and/$or/$nor must be nonempty array');
    }
    return selectors.map((subSelector)=>{
        if (!LocalCollection._isPlainObject(subSelector)) {
            throw new MiniMongoQueryError('$or/$and/$nor entries need to be full objects');
        }
        return compileDocumentSelector(subSelector, matcher, {
            inElemMatch
        });
    });
}
// Takes in a selector that could match a full document (eg, the original
// selector). Returns a function mapping document->result object.
//
// matcher is the Matcher object we are compiling.
//
// If this is the root document selector (ie, not wrapped in $and or the like),
// then isRoot is true. (This is used by $near.)
function compileDocumentSelector(docSelector, matcher, options = {}) {
    const docMatchers = Object.keys(docSelector).map((key)=>{
        const subSelector = docSelector[key];
        if (key.substr(0, 1) === '$') {
            // Outer operators are either logical operators (they recurse back into
            // this function), or $where.
            if (!hasOwn.call(LOGICAL_OPERATORS, key)) {
                throw new MiniMongoQueryError(`Unrecognized logical operator: ${key}`);
            }
            matcher._isSimple = false;
            return LOGICAL_OPERATORS[key](subSelector, matcher, options.inElemMatch);
        }
        // Record this path, but only if we aren't in an elemMatcher, since in an
        // elemMatch this is a path inside an object in an array, not in the doc
        // root.
        if (!options.inElemMatch) {
            matcher._recordPathUsed(key);
        }
        // Don't add a matcher if subSelector is a function -- this is to match
        // the behavior of Meteor on the server (inherited from the node mongodb
        // driver), which is to ignore any part of a selector which is a function.
        if (typeof subSelector === 'function') {
            return undefined;
        }
        const lookUpByIndex = makeLookupFunction(key);
        const valueMatcher = compileValueSelector(subSelector, matcher, options.isRoot);
        return (doc)=>valueMatcher(lookUpByIndex(doc));
    }).filter(Boolean);
    return andDocumentMatchers(docMatchers);
}
// Takes in a selector that could match a key-indexed value in a document; eg,
// {$gt: 5, $lt: 9}, or a regular expression, or any non-expression object (to
// indicate equality).  Returns a branched matcher: a function mapping
// [branched value]->result object.
function compileValueSelector(valueSelector, matcher, isRoot) {
    if (valueSelector instanceof RegExp) {
        matcher._isSimple = false;
        return convertElementMatcherToBranchedMatcher(regexpElementMatcher(valueSelector));
    }
    if (isOperatorObject(valueSelector)) {
        return operatorBranchedMatcher(valueSelector, matcher, isRoot);
    }
    return convertElementMatcherToBranchedMatcher(equalityElementMatcher(valueSelector));
}
// Given an element matcher (which evaluates a single value), returns a branched
// value (which evaluates the element matcher on all the branches and returns a
// more structured return value possibly including arrayIndices).
function convertElementMatcherToBranchedMatcher(elementMatcher, options = {}) {
    return (branches)=>{
        const expanded = options.dontExpandLeafArrays ? branches : expandArraysInBranches(branches, options.dontIncludeLeafArrays);
        const match = {};
        match.result = expanded.some((element)=>{
            let matched = elementMatcher(element.value);
            // Special case for $elemMatch: it means "true, and use this as an array
            // index if I didn't already have one".
            if (typeof matched === 'number') {
                // XXX This code dates from when we only stored a single array index
                // (for the outermost array). Should we be also including deeper array
                // indices from the $elemMatch match?
                if (!element.arrayIndices) {
                    element.arrayIndices = [
                        matched
                    ];
                }
                matched = true;
            }
            // If some element matched, and it's tagged with array indices, include
            // those indices in our result object.
            if (matched && element.arrayIndices) {
                match.arrayIndices = element.arrayIndices;
            }
            return matched;
        });
        return match;
    };
}
// Helpers for $near.
function distanceCoordinatePairs(a, b) {
    const pointA = pointToArray(a);
    const pointB = pointToArray(b);
    return Math.hypot(pointA[0] - pointB[0], pointA[1] - pointB[1]);
}
// Takes something that is not an operator object and returns an element matcher
// for equality with that thing.
function equalityElementMatcher(elementSelector) {
    if (isOperatorObject(elementSelector)) {
        throw new MiniMongoQueryError('Can\'t create equalityValueSelector for operator object');
    }
    // Special-case: null and undefined are equal (if you got undefined in there
    // somewhere, or if you got it due to some branch being non-existent in the
    // weird special case), even though they aren't with EJSON.equals.
    // undefined or null
    if (elementSelector == null) {
        return (value)=>value == null;
    }
    return (value)=>LocalCollection._f._equal(elementSelector, value);
}
function everythingMatcher(docOrBranchedValues) {
    return {
        result: true
    };
}
function expandArraysInBranches(branches, skipTheArrays) {
    const branchesOut = [];
    branches.forEach((branch)=>{
        const thisIsArray = Array.isArray(branch.value);
        // We include the branch itself, *UNLESS* we it's an array that we're going
        // to iterate and we're told to skip arrays.  (That's right, we include some
        // arrays even skipTheArrays is true: these are arrays that were found via
        // explicit numerical indices.)
        if (!(skipTheArrays && thisIsArray && !branch.dontIterate)) {
            branchesOut.push({
                arrayIndices: branch.arrayIndices,
                value: branch.value
            });
        }
        if (thisIsArray && !branch.dontIterate) {
            branch.value.forEach((value, i)=>{
                branchesOut.push({
                    arrayIndices: (branch.arrayIndices || []).concat(i),
                    value
                });
            });
        }
    });
    return branchesOut;
}
// Helpers for $bitsAllSet/$bitsAnySet/$bitsAllClear/$bitsAnyClear.
function getOperandBitmask(operand, selector) {
    // numeric bitmask
    // You can provide a numeric bitmask to be matched against the operand field.
    // It must be representable as a non-negative 32-bit signed integer.
    // Otherwise, $bitsAllSet will return an error.
    if (Number.isInteger(operand) && operand >= 0) {
        return new Uint8Array(new Int32Array([
            operand
        ]).buffer);
    }
    // bindata bitmask
    // You can also use an arbitrarily large BinData instance as a bitmask.
    if (EJSON.isBinary(operand)) {
        return new Uint8Array(operand.buffer);
    }
    // position list
    // If querying a list of bit positions, each <position> must be a non-negative
    // integer. Bit positions start at 0 from the least significant bit.
    if (Array.isArray(operand) && operand.every((x)=>Number.isInteger(x) && x >= 0)) {
        const buffer = new ArrayBuffer((Math.max(...operand) >> 3) + 1);
        const view = new Uint8Array(buffer);
        operand.forEach((x)=>{
            view[x >> 3] |= 1 << (x & 0x7);
        });
        return view;
    }
    // bad operand
    throw new MiniMongoQueryError(`operand to ${selector} must be a numeric bitmask (representable as a ` + 'non-negative 32-bit signed integer), a bindata bitmask or an array with ' + 'bit positions (non-negative integers)');
}
function getValueBitmask(value, length) {
    // The field value must be either numerical or a BinData instance. Otherwise,
    // $bits... will not match the current document.
    // numerical
    if (Number.isSafeInteger(value)) {
        // $bits... will not match numerical values that cannot be represented as a
        // signed 64-bit integer. This can be the case if a value is either too
        // large or small to fit in a signed 64-bit integer, or if it has a
        // fractional component.
        const buffer = new ArrayBuffer(Math.max(length, 2 * Uint32Array.BYTES_PER_ELEMENT));
        let view = new Uint32Array(buffer, 0, 2);
        view[0] = value % ((1 << 16) * (1 << 16)) | 0;
        view[1] = value / ((1 << 16) * (1 << 16)) | 0;
        // sign extension
        if (value < 0) {
            view = new Uint8Array(buffer, 2);
            view.forEach((byte, i)=>{
                view[i] = 0xff;
            });
        }
        return new Uint8Array(buffer);
    }
    // bindata
    if (EJSON.isBinary(value)) {
        return new Uint8Array(value.buffer);
    }
    // no match
    return false;
}
// Actually inserts a key value into the selector document
// However, this checks there is no ambiguity in setting
// the value for the given key, throws otherwise
function insertIntoDocument(document, key, value) {
    Object.keys(document).forEach((existingKey)=>{
        if (existingKey.length > key.length && existingKey.indexOf(`${key}.`) === 0 || key.length > existingKey.length && key.indexOf(`${existingKey}.`) === 0) {
            throw new MiniMongoQueryError(`cannot infer query fields to set, both paths '${existingKey}' and '${key}' are matched`);
        } else if (existingKey === key) {
            throw new MiniMongoQueryError(`cannot infer query fields to set, path '${key}' is matched twice`);
        }
    });
    document[key] = value;
}
// Returns a branched matcher that matches iff the given matcher does not.
// Note that this implicitly "deMorganizes" the wrapped function.  ie, it
// means that ALL branch values need to fail to match innerBranchedMatcher.
function invertBranchedMatcher(branchedMatcher) {
    return (branchValues)=>{
        // We explicitly choose to strip arrayIndices here: it doesn't make sense to
        // say "update the array element that does not match something", at least
        // in mongo-land.
        return {
            result: !branchedMatcher(branchValues).result
        };
    };
}
function isIndexable(obj) {
    return Array.isArray(obj) || LocalCollection._isPlainObject(obj);
}
function isNumericKey(s) {
    return /^[0-9]+$/.test(s);
}
// Returns true if this is an object with at least one key and all keys begin
// with $.  Unless inconsistentOK is set, throws if some keys begin with $ and
// others don't.
function isOperatorObject(valueSelector, inconsistentOK) {
    if (!LocalCollection._isPlainObject(valueSelector)) {
        return false;
    }
    let theseAreOperators = undefined;
    Object.keys(valueSelector).forEach((selKey)=>{
        const thisIsOperator = selKey.substr(0, 1) === '$' || selKey === 'diff';
        if (theseAreOperators === undefined) {
            theseAreOperators = thisIsOperator;
        } else if (theseAreOperators !== thisIsOperator) {
            if (!inconsistentOK) {
                throw new MiniMongoQueryError(`Inconsistent operator: ${JSON.stringify(valueSelector)}`);
            }
            theseAreOperators = false;
        }
    });
    return !!theseAreOperators; // {} has no operators
}
// Helper for $lt/$gt/$lte/$gte.
function makeInequality(cmpValueComparator) {
    return {
        compileElementSelector (operand) {
            // Arrays never compare false with non-arrays for any inequality.
            // XXX This was behavior we observed in pre-release MongoDB 2.5, but
            //     it seems to have been reverted.
            //     See https://jira.mongodb.org/browse/SERVER-11444
            if (Array.isArray(operand)) {
                return ()=>false;
            }
            // Special case: consider undefined and null the same (so true with
            // $gte/$lte).
            if (operand === undefined) {
                operand = null;
            }
            const operandType = LocalCollection._f._type(operand);
            return (value)=>{
                if (value === undefined) {
                    value = null;
                }
                // Comparisons are never true among things of different type (except
                // null vs undefined).
                if (LocalCollection._f._type(value) !== operandType) {
                    return false;
                }
                return cmpValueComparator(LocalCollection._f._cmp(value, operand));
            };
        }
    };
}
// makeLookupFunction(key) returns a lookup function.
//
// A lookup function takes in a document and returns an array of matching
// branches.  If no arrays are found while looking up the key, this array will
// have exactly one branches (possibly 'undefined', if some segment of the key
// was not found).
//
// If arrays are found in the middle, this can have more than one element, since
// we 'branch'. When we 'branch', if there are more key segments to look up,
// then we only pursue branches that are plain objects (not arrays or scalars).
// This means we can actually end up with no branches!
//
// We do *NOT* branch on arrays that are found at the end (ie, at the last
// dotted member of the key). We just return that array; if you want to
// effectively 'branch' over the array's values, post-process the lookup
// function with expandArraysInBranches.
//
// Each branch is an object with keys:
//  - value: the value at the branch
//  - dontIterate: an optional bool; if true, it means that 'value' is an array
//    that expandArraysInBranches should NOT expand. This specifically happens
//    when there is a numeric index in the key, and ensures the
//    perhaps-surprising MongoDB behavior where {'a.0': 5} does NOT
//    match {a: [[5]]}.
//  - arrayIndices: if any array indexing was done during lookup (either due to
//    explicit numeric indices or implicit branching), this will be an array of
//    the array indices used, from outermost to innermost; it is falsey or
//    absent if no array index is used. If an explicit numeric index is used,
//    the index will be followed in arrayIndices by the string 'x'.
//
//    Note: arrayIndices is used for two purposes. First, it is used to
//    implement the '$' modifier feature, which only ever looks at its first
//    element.
//
//    Second, it is used for sort key generation, which needs to be able to tell
//    the difference between different paths. Moreover, it needs to
//    differentiate between explicit and implicit branching, which is why
//    there's the somewhat hacky 'x' entry: this means that explicit and
//    implicit array lookups will have different full arrayIndices paths. (That
//    code only requires that different paths have different arrayIndices; it
//    doesn't actually 'parse' arrayIndices. As an alternative, arrayIndices
//    could contain objects with flags like 'implicit', but I think that only
//    makes the code surrounding them more complex.)
//
//    (By the way, this field ends up getting passed around a lot without
//    cloning, so never mutate any arrayIndices field/var in this package!)
//
//
// At the top level, you may only pass in a plain object or array.
//
// See the test 'minimongo - lookup' for some examples of what lookup functions
// return.
function makeLookupFunction(key, options = {}) {
    const parts = key.split('.');
    const firstPart = parts.length ? parts[0] : '';
    const lookupRest = parts.length > 1 && makeLookupFunction(parts.slice(1).join('.'), options);
    function buildResult(arrayIndices, dontIterate, value) {
        return arrayIndices && arrayIndices.length ? dontIterate ? [
            {
                arrayIndices,
                dontIterate,
                value
            }
        ] : [
            {
                arrayIndices,
                value
            }
        ] : dontIterate ? [
            {
                dontIterate,
                value
            }
        ] : [
            {
                value
            }
        ];
    }
    // Doc will always be a plain object or an array.
    // apply an explicit numeric index, an array.
    return (doc, arrayIndices)=>{
        if (Array.isArray(doc)) {
            // If we're being asked to do an invalid lookup into an array (non-integer
            // or out-of-bounds), return no results (which is different from returning
            // a single undefined result, in that `null` equality checks won't match).
            if (!(isNumericKey(firstPart) && firstPart < doc.length)) {
                return [];
            }
            // Remember that we used this array index. Include an 'x' to indicate that
            // the previous index came from being considered as an explicit array
            // index (not branching).
            arrayIndices = arrayIndices ? arrayIndices.concat(+firstPart, 'x') : [
                +firstPart,
                'x'
            ];
        }
        // Do our first lookup.
        const firstLevel = doc[firstPart];
        // If there is no deeper to dig, return what we found.
        //
        // If what we found is an array, most value selectors will choose to treat
        // the elements of the array as matchable values in their own right, but
        // that's done outside of the lookup function. (Exceptions to this are $size
        // and stuff relating to $elemMatch.  eg, {a: {$size: 2}} does not match {a:
        // [[1, 2]]}.)
        //
        // That said, if we just did an *explicit* array lookup (on doc) to find
        // firstLevel, and firstLevel is an array too, we do NOT want value
        // selectors to iterate over it.  eg, {'a.0': 5} does not match {a: [[5]]}.
        // So in that case, we mark the return value as 'don't iterate'.
        if (!lookupRest) {
            return buildResult(arrayIndices, Array.isArray(doc) && Array.isArray(firstLevel), firstLevel);
        }
        // We need to dig deeper.  But if we can't, because what we've found is not
        // an array or plain object, we're done. If we just did a numeric index into
        // an array, we return nothing here (this is a change in Mongo 2.5 from
        // Mongo 2.4, where {'a.0.b': null} stopped matching {a: [5]}). Otherwise,
        // return a single `undefined` (which can, for example, match via equality
        // with `null`).
        if (!isIndexable(firstLevel)) {
            if (Array.isArray(doc)) {
                return [];
            }
            return buildResult(arrayIndices, false, undefined);
        }
        const result = [];
        const appendToResult = (more)=>{
            result.push(...more);
        };
        // Dig deeper: look up the rest of the parts on whatever we've found.
        // (lookupRest is smart enough to not try to do invalid lookups into
        // firstLevel if it's an array.)
        appendToResult(lookupRest(firstLevel, arrayIndices));
        // If we found an array, then in *addition* to potentially treating the next
        // part as a literal integer lookup, we should also 'branch': try to look up
        // the rest of the parts on each array element in parallel.
        //
        // In this case, we *only* dig deeper into array elements that are plain
        // objects. (Recall that we only got this far if we have further to dig.)
        // This makes sense: we certainly don't dig deeper into non-indexable
        // objects. And it would be weird to dig into an array: it's simpler to have
        // a rule that explicit integer indexes only apply to an outer array, not to
        // an array you find after a branching search.
        //
        // In the special case of a numeric part in a *sort selector* (not a query
        // selector), we skip the branching: we ONLY allow the numeric part to mean
        // 'look up this index' in that case, not 'also look up this index in all
        // the elements of the array'.
        if (Array.isArray(firstLevel) && !(isNumericKey(parts[1]) && options.forSort)) {
            firstLevel.forEach((branch, arrayIndex)=>{
                if (LocalCollection._isPlainObject(branch)) {
                    appendToResult(lookupRest(branch, arrayIndices ? arrayIndices.concat(arrayIndex) : [
                        arrayIndex
                    ]));
                }
            });
        }
        return result;
    };
}
// Object exported only for unit testing.
// Use it to export private functions to test in Tinytest.
MinimongoTest = {
    makeLookupFunction
};
MinimongoError = (message, options = {})=>{
    if (typeof message === 'string' && options.field) {
        message += ` for field '${options.field}'`;
    }
    const error = new Error(message);
    error.name = 'MinimongoError';
    return error;
};
function nothingMatcher(docOrBranchedValues) {
    return {
        result: false
    };
}
// Takes an operator object (an object with $ keys) and returns a branched
// matcher for it.
function operatorBranchedMatcher(valueSelector, matcher, isRoot) {
    // Each valueSelector works separately on the various branches.  So one
    // operator can match one branch and another can match another branch.  This
    // is OK.
    const operatorMatchers = Object.keys(valueSelector).map((operator)=>{
        const operand = valueSelector[operator];
        const simpleRange = [
            '$lt',
            '$lte',
            '$gt',
            '$gte'
        ].includes(operator) && typeof operand === 'number';
        const simpleEquality = [
            '$ne',
            '$eq'
        ].includes(operator) && operand !== Object(operand);
        const simpleInclusion = [
            '$in',
            '$nin'
        ].includes(operator) && Array.isArray(operand) && !operand.some((x)=>x === Object(x));
        if (!(simpleRange || simpleInclusion || simpleEquality)) {
            matcher._isSimple = false;
        }
        if (hasOwn.call(VALUE_OPERATORS, operator)) {
            return VALUE_OPERATORS[operator](operand, valueSelector, matcher, isRoot);
        }
        if (hasOwn.call(ELEMENT_OPERATORS, operator)) {
            const options = ELEMENT_OPERATORS[operator];
            return convertElementMatcherToBranchedMatcher(options.compileElementSelector(operand, valueSelector, matcher), options);
        }
        throw new MiniMongoQueryError(`Unrecognized operator: ${operator}`);
    });
    return andBranchedMatchers(operatorMatchers);
}
// paths - Array: list of mongo style paths
// newLeafFn - Function: of form function(path) should return a scalar value to
//                       put into list created for that path
// conflictFn - Function: of form function(node, path, fullPath) is called
//                        when building a tree path for 'fullPath' node on
//                        'path' was already a leaf with a value. Must return a
//                        conflict resolution.
// initial tree - Optional Object: starting tree.
// @returns - Object: tree represented as a set of nested objects
function pathsToTree(paths, newLeafFn, conflictFn, root = {}) {
    paths.forEach((path)=>{
        const pathArray = path.split('.');
        let tree = root;
        // use .every just for iteration with break
        const success = pathArray.slice(0, -1).every((key, i)=>{
            if (!hasOwn.call(tree, key)) {
                tree[key] = {};
            } else if (tree[key] !== Object(tree[key])) {
                tree[key] = conflictFn(tree[key], pathArray.slice(0, i + 1).join('.'), path);
                // break out of loop if we are failing for this path
                if (tree[key] !== Object(tree[key])) {
                    return false;
                }
            }
            tree = tree[key];
            return true;
        });
        if (success) {
            const lastKey = pathArray[pathArray.length - 1];
            if (hasOwn.call(tree, lastKey)) {
                tree[lastKey] = conflictFn(tree[lastKey], path, path);
            } else {
                tree[lastKey] = newLeafFn(path);
            }
        }
    });
    return root;
}
// Makes sure we get 2 elements array and assume the first one to be x and
// the second one to y no matter what user passes.
// In case user passes { lon: x, lat: y } returns [x, y]
function pointToArray(point) {
    return Array.isArray(point) ? point.slice() : [
        point.x,
        point.y
    ];
}
// Creating a document from an upsert is quite tricky.
// E.g. this selector: {"$or": [{"b.foo": {"$all": ["bar"]}}]}, should result
// in: {"b.foo": "bar"}
// But this selector: {"$or": [{"b": {"foo": {"$all": ["bar"]}}}]} should throw
// an error
// Some rules (found mainly with trial & error, so there might be more):
// - handle all childs of $and (or implicit $and)
// - handle $or nodes with exactly 1 child
// - ignore $or nodes with more than 1 child
// - ignore $nor and $not nodes
// - throw when a value can not be set unambiguously
// - every value for $all should be dealt with as separate $eq-s
// - threat all children of $all as $eq setters (=> set if $all.length === 1,
//   otherwise throw error)
// - you can not mix '$'-prefixed keys and non-'$'-prefixed keys
// - you can only have dotted keys on a root-level
// - you can not have '$'-prefixed keys more than one-level deep in an object
// Handles one key/value pair to put in the selector document
function populateDocumentWithKeyValue(document, key, value) {
    if (value && Object.getPrototypeOf(value) === Object.prototype) {
        populateDocumentWithObject(document, key, value);
    } else if (!(value instanceof RegExp)) {
        insertIntoDocument(document, key, value);
    }
}
// Handles a key, value pair to put in the selector document
// if the value is an object
function populateDocumentWithObject(document, key, value) {
    const keys = Object.keys(value);
    const unprefixedKeys = keys.filter((op)=>op[0] !== '$');
    if (unprefixedKeys.length > 0 || !keys.length) {
        // Literal (possibly empty) object ( or empty object )
        // Don't allow mixing '$'-prefixed with non-'$'-prefixed fields
        if (keys.length !== unprefixedKeys.length) {
            throw new MiniMongoQueryError(`unknown operator: ${unprefixedKeys[0]}`);
        }
        validateObject(value, key);
        insertIntoDocument(document, key, value);
    } else {
        Object.keys(value).forEach((op)=>{
            const object = value[op];
            if (op === '$eq') {
                populateDocumentWithKeyValue(document, key, object);
            } else if (op === '$all') {
                // every value for $all should be dealt with as separate $eq-s
                object.forEach((element)=>populateDocumentWithKeyValue(document, key, element));
            }
        });
    }
}
// Fills a document with certain fields from an upsert selector
function populateDocumentWithQueryFields(query, document = {}) {
    if (Object.getPrototypeOf(query) === Object.prototype) {
        // handle implicit $and
        Object.keys(query).forEach((key)=>{
            const value = query[key];
            if (key === '$and') {
                // handle explicit $and
                value.forEach((element)=>populateDocumentWithQueryFields(element, document));
            } else if (key === '$or') {
                // handle $or nodes with exactly 1 child
                if (value.length === 1) {
                    populateDocumentWithQueryFields(value[0], document);
                }
            } else if (key[0] !== '$') {
                // Ignore other '$'-prefixed logical selectors
                populateDocumentWithKeyValue(document, key, value);
            }
        });
    } else {
        // Handle meteor-specific shortcut for selecting _id
        if (LocalCollection._selectorIsId(query)) {
            insertIntoDocument(document, '_id', query);
        }
    }
    return document;
}
// Traverses the keys of passed projection and constructs a tree where all
// leaves are either all True or all False
// @returns Object:
//  - tree - Object - tree representation of keys involved in projection
//  (exception for '_id' as it is a special case handled separately)
//  - including - Boolean - "take only certain fields" type of projection
function projectionDetails(fields) {
    // Find the non-_id keys (_id is handled specially because it is included
    // unless explicitly excluded). Sort the keys, so that our code to detect
    // overlaps like 'foo' and 'foo.bar' can assume that 'foo' comes first.
    let fieldsKeys = Object.keys(fields).sort();
    // If _id is the only field in the projection, do not remove it, since it is
    // required to determine if this is an exclusion or exclusion. Also keep an
    // inclusive _id, since inclusive _id follows the normal rules about mixing
    // inclusive and exclusive fields. If _id is not the only field in the
    // projection and is exclusive, remove it so it can be handled later by a
    // special case, since exclusive _id is always allowed.
    if (!(fieldsKeys.length === 1 && fieldsKeys[0] === '_id') && !(fieldsKeys.includes('_id') && fields._id)) {
        fieldsKeys = fieldsKeys.filter((key)=>key !== '_id');
    }
    let including = null; // Unknown
    fieldsKeys.forEach((keyPath)=>{
        const rule = !!fields[keyPath];
        if (including === null) {
            including = rule;
        }
        // This error message is copied from MongoDB shell
        if (including !== rule) {
            throw MinimongoError('You cannot currently mix including and excluding fields.');
        }
    });
    const projectionRulesTree = pathsToTree(fieldsKeys, (path)=>including, (node, path, fullPath)=>{
        // Check passed projection fields' keys: If you have two rules such as
        // 'foo.bar' and 'foo.bar.baz', then the result becomes ambiguous. If
        // that happens, there is a probability you are doing something wrong,
        // framework should notify you about such mistake earlier on cursor
        // compilation step than later during runtime.  Note, that real mongo
        // doesn't do anything about it and the later rule appears in projection
        // project, more priority it takes.
        //
        // Example, assume following in mongo shell:
        // > db.coll.insert({ a: { b: 23, c: 44 } })
        // > db.coll.find({}, { 'a': 1, 'a.b': 1 })
        // {"_id": ObjectId("520bfe456024608e8ef24af3"), "a": {"b": 23}}
        // > db.coll.find({}, { 'a.b': 1, 'a': 1 })
        // {"_id": ObjectId("520bfe456024608e8ef24af3"), "a": {"b": 23, "c": 44}}
        //
        // Note, how second time the return set of keys is different.
        const currentPath = fullPath;
        const anotherPath = path;
        throw MinimongoError(`both ${currentPath} and ${anotherPath} found in fields option, ` + 'using both of them may trigger unexpected behavior. Did you mean to ' + 'use only one of them?');
    });
    return {
        including,
        tree: projectionRulesTree
    };
}
// Takes a RegExp object and returns an element matcher.
function regexpElementMatcher(regexp) {
    return (value)=>{
        if (value instanceof RegExp) {
            return value.toString() === regexp.toString();
        }
        // Regexps only work against strings.
        if (typeof value !== 'string') {
            return false;
        }
        // Reset regexp's state to avoid inconsistent matching for objects with the
        // same value on consecutive calls of regexp.test. This happens only if the
        // regexp has the 'g' flag. Also note that ES6 introduces a new flag 'y' for
        // which we should *not* change the lastIndex but MongoDB doesn't support
        // either of these flags.
        regexp.lastIndex = 0;
        return regexp.test(value);
    };
}
// Validates the key in a path.
// Objects that are nested more then 1 level cannot have dotted fields
// or fields starting with '$'
function validateKeyInPath(key, path) {
    if (key.includes('.')) {
        throw new Error(`The dotted field '${key}' in '${path}.${key} is not valid for storage.`);
    }
    if (key[0] === '$') {
        throw new Error(`The dollar ($) prefixed field  '${path}.${key} is not valid for storage.`);
    }
}
// Recursively validates an object that is nested more than one level deep
function validateObject(object, path) {
    if (object && Object.getPrototypeOf(object) === Object.prototype) {
        Object.keys(object).forEach((key)=>{
            validateKeyInPath(key, path);
            validateObject(object[key], path + '.' + key);
        });
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"constants.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/constants.js                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({getAsyncMethodName:()=>getAsyncMethodName});module.export({ASYNC_COLLECTION_METHODS:()=>ASYNC_COLLECTION_METHODS,ASYNC_CURSOR_METHODS:()=>ASYNC_CURSOR_METHODS,CLIENT_ONLY_METHODS:()=>CLIENT_ONLY_METHODS},true);/** Exported values are also used in the mongo package. */ /** @param {string} method */ function getAsyncMethodName(method) {
    return `${method.replace('_', '')}Async`;
}
const ASYNC_COLLECTION_METHODS = [
    '_createCappedCollection',
    'dropCollection',
    'dropIndex',
    /**
   * @summary Creates the specified index on the collection.
   * @locus server
   * @method createIndexAsync
   * @memberof Mongo.Collection
   * @instance
   * @param {Object} index A document that contains the field and value pairs where the field is the index key and the value describes the type of index for that field. For an ascending index on a field, specify a value of `1`; for descending index, specify a value of `-1`. Use `text` for text indexes.
   * @param {Object} [options] All options are listed in [MongoDB documentation](https://docs.mongodb.com/manual/reference/method/db.collection.createIndex/#options)
   * @param {String} options.name Name of the index
   * @param {Boolean} options.unique Define that the index values must be unique, more at [MongoDB documentation](https://docs.mongodb.com/manual/core/index-unique/)
   * @param {Boolean} options.sparse Define that the index is sparse, more at [MongoDB documentation](https://docs.mongodb.com/manual/core/index-sparse/)
   * @returns {Promise}
   */ 'createIndex',
    /**
   * @summary Finds the first document that matches the selector, as ordered by sort and skip options. Returns `undefined` if no matching document is found.
   * @locus Anywhere
   * @method findOneAsync
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} [selector] A query describing the documents to find
   * @param {Object} [options]
   * @param {MongoSortSpecifier} options.sort Sort order (default: natural order)
   * @param {Number} options.skip Number of results to skip at the beginning
   * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.
   * @param {Boolean} options.reactive (Client only) Default true; pass false to disable reactivity
   * @param {Function} options.transform Overrides `transform` on the [`Collection`](#collections) for this cursor.  Pass `null` to disable transformation.
   * @param {String} options.readPreference (Server only) Specifies a custom MongoDB [`readPreference`](https://docs.mongodb.com/manual/core/read-preference) for fetching the document. Possible values are `primary`, `primaryPreferred`, `secondary`, `secondaryPreferred` and `nearest`.
   * @returns {Promise}
   */ 'findOne',
    /**
   * @summary Insert a document in the collection.  Returns its unique _id.
   * @locus Anywhere
   * @method  insertAsync
   * @memberof Mongo.Collection
   * @instance
   * @param {Object} doc The document to insert. May not yet have an _id attribute, in which case Meteor will generate one for you.
   * @return {Promise}
   */ 'insert',
    /**
   * @summary Remove documents from the collection
   * @locus Anywhere
   * @method removeAsync
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} selector Specifies which documents to remove
   * @return {Promise}
   */ 'remove',
    /**
   * @summary Modify one or more documents in the collection. Returns the number of matched documents.
   * @locus Anywhere
   * @method updateAsync
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} selector Specifies which documents to modify
   * @param {MongoModifier} modifier Specifies how to modify the documents
   * @param {Object} [options]
   * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
   * @param {Boolean} options.upsert True to insert a document if no matching documents are found.
   * @param {Array} options.arrayFilters Optional. Used in combination with MongoDB [filtered positional operator](https://docs.mongodb.com/manual/reference/operator/update/positional-filtered/) to specify which elements to modify in an array field.
   * @return {Promise}
   */ 'update',
    /**
   * @summary Modify one or more documents in the collection, or insert one if no matching documents were found. Returns an object with keys `numberAffected` (the number of documents modified)  and `insertedId` (the unique _id of the document that was inserted, if any).
   * @locus Anywhere
   * @method upsertAsync
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} selector Specifies which documents to modify
   * @param {MongoModifier} modifier Specifies how to modify the documents
   * @param {Object} [options]
   * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
   * @return {Promise}
   */ 'upsert'
];
const ASYNC_CURSOR_METHODS = [
    /**
   * @deprecated in 2.9
   * @summary Returns the number of documents that match a query. This method is
   *          [deprecated since MongoDB 4.0](https://www.mongodb.com/docs/v4.4/reference/command/count/);
   *          see `Collection.countDocuments` and
   *          `Collection.estimatedDocumentCount` for a replacement.
   * @memberOf Mongo.Cursor
   * @method  countAsync
   * @instance
   * @locus Anywhere
   * @returns {Promise}
   */ 'count',
    /**
   * @summary Return all matching documents as an Array.
   * @memberOf Mongo.Cursor
   * @method  fetchAsync
   * @instance
   * @locus Anywhere
   * @returns {Promise}
   */ 'fetch',
    /**
   * @summary Call `callback` once for each matching document, sequentially and
   *          synchronously.
   * @locus Anywhere
   * @method  forEachAsync
   * @instance
   * @memberOf Mongo.Cursor
   * @param {IterationCallback} callback Function to call. It will be called
   *                                     with three arguments: the document, a
   *                                     0-based index, and <em>cursor</em>
   *                                     itself.
   * @param {Any} [thisArg] An object which will be the value of `this` inside
   *                        `callback`.
   * @returns {Promise}
   */ 'forEach',
    /**
   * @summary Map callback over all matching documents.  Returns an Array.
   * @locus Anywhere
   * @method mapAsync
   * @instance
   * @memberOf Mongo.Cursor
   * @param {IterationCallback} callback Function to call. It will be called
   *                                     with three arguments: the document, a
   *                                     0-based index, and <em>cursor</em>
   *                                     itself.
   * @param {Any} [thisArg] An object which will be the value of `this` inside
   *                        `callback`.
   * @returns {Promise}
   */ 'map'
];
const CLIENT_ONLY_METHODS = [
    "findOne",
    "insert",
    "remove",
    "update",
    "upsert"
];

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"cursor.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/cursor.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({default:()=>Cursor});let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);let LocalCollection;module.link('./local_collection.js',{default(v){LocalCollection=v}},1);let hasOwn;module.link('./common.js',{hasOwn(v){hasOwn=v}},2);let ASYNC_CURSOR_METHODS,getAsyncMethodName;module.link('./constants',{ASYNC_CURSOR_METHODS(v){ASYNC_CURSOR_METHODS=v},getAsyncMethodName(v){getAsyncMethodName=v}},3);



class Cursor {
    /**
   * @deprecated in 2.9
   * @summary Returns the number of documents that match a query. This method is
   *          [deprecated since MongoDB 4.0](https://www.mongodb.com/docs/v4.4/reference/command/count/);
   *          see `Collection.countDocuments` and
   *          `Collection.estimatedDocumentCount` for a replacement.
   * @memberOf Mongo.Cursor
   * @method  count
   * @instance
   * @locus Anywhere
   * @returns {Number}
   */ count() {
        if (this.reactive) {
            // allow the observe to be unordered
            this._depend({
                added: true,
                removed: true
            }, true);
        }
        return this._getRawObjects({
            ordered: true
        }).length;
    }
    /**
   * @summary Return all matching documents as an Array.
   * @memberOf Mongo.Cursor
   * @method  fetch
   * @instance
   * @locus Anywhere
   * @returns {Object[]}
   */ fetch() {
        const result = [];
        this.forEach((doc)=>{
            result.push(doc);
        });
        return result;
    }
    [Symbol.iterator]() {
        if (this.reactive) {
            this._depend({
                addedBefore: true,
                removed: true,
                changed: true,
                movedBefore: true
            });
        }
        let index = 0;
        const objects = this._getRawObjects({
            ordered: true
        });
        return {
            next: ()=>{
                if (index < objects.length) {
                    // This doubles as a clone operation.
                    let element = this._projectionFn(objects[index++]);
                    if (this._transform) element = this._transform(element);
                    return {
                        value: element
                    };
                }
                return {
                    done: true
                };
            }
        };
    }
    [Symbol.asyncIterator]() {
        const syncResult = this[Symbol.iterator]();
        return {
            next () {
                return _async_to_generator(function*() {
                    return Promise.resolve(syncResult.next());
                })();
            }
        };
    }
    /**
   * @callback IterationCallback
   * @param {Object} doc
   * @param {Number} index
   */ /**
   * @summary Call `callback` once for each matching document, sequentially and
   *          synchronously.
   * @locus Anywhere
   * @method  forEach
   * @instance
   * @memberOf Mongo.Cursor
   * @param {IterationCallback} callback Function to call. It will be called
   *                                     with three arguments: the document, a
   *                                     0-based index, and <em>cursor</em>
   *                                     itself.
   * @param {Any} [thisArg] An object which will be the value of `this` inside
   *                        `callback`.
   */ forEach(callback, thisArg) {
        if (this.reactive) {
            this._depend({
                addedBefore: true,
                removed: true,
                changed: true,
                movedBefore: true
            });
        }
        this._getRawObjects({
            ordered: true
        }).forEach((element, i)=>{
            // This doubles as a clone operation.
            element = this._projectionFn(element);
            if (this._transform) {
                element = this._transform(element);
            }
            callback.call(thisArg, element, i, this);
        });
    }
    getTransform() {
        return this._transform;
    }
    /**
   * @summary Map callback over all matching documents.  Returns an Array.
   * @locus Anywhere
   * @method map
   * @instance
   * @memberOf Mongo.Cursor
   * @param {IterationCallback} callback Function to call. It will be called
   *                                     with three arguments: the document, a
   *                                     0-based index, and <em>cursor</em>
   *                                     itself.
   * @param {Any} [thisArg] An object which will be the value of `this` inside
   *                        `callback`.
   */ map(callback, thisArg) {
        const result = [];
        this.forEach((doc, i)=>{
            result.push(callback.call(thisArg, doc, i, this));
        });
        return result;
    }
    // options to contain:
    //  * callbacks for observe():
    //    - addedAt (document, atIndex)
    //    - added (document)
    //    - changedAt (newDocument, oldDocument, atIndex)
    //    - changed (newDocument, oldDocument)
    //    - removedAt (document, atIndex)
    //    - removed (document)
    //    - movedTo (document, oldIndex, newIndex)
    //
    // attributes available on returned query handle:
    //  * stop(): end updates
    //  * collection: the collection this query is querying
    //
    // iff x is a returned query handle, (x instanceof
    // LocalCollection.ObserveHandle) is true
    //
    // initial results delivered through added callback
    // XXX maybe callbacks should take a list of objects, to expose transactions?
    // XXX maybe support field limiting (to limit what you're notified on)
    /**
   * @summary Watch a query.  Receive callbacks as the result set changes.
   * @locus Anywhere
   * @memberOf Mongo.Cursor
   * @instance
   * @param {Object} callbacks Functions to call to deliver the result set as it
   *                           changes
   */ observe(options) {
        return LocalCollection._observeFromObserveChanges(this, options);
    }
    /**
   * @summary Watch a query.  Receive callbacks as the result set changes.
   * @locus Anywhere
   * @memberOf Mongo.Cursor
   * @instance
   */ observeAsync(options) {
        return new Promise((resolve)=>resolve(this.observe(options)));
    }
    /**
   * @summary Watch a query. Receive callbacks as the result set changes. Only
   *          the differences between the old and new documents are passed to
   *          the callbacks.
   * @locus Anywhere
   * @memberOf Mongo.Cursor
   * @instance
   * @param {Object} callbacks Functions to call to deliver the result set as it
   *                           changes
   */ observeChanges(options) {
        const ordered = LocalCollection._observeChangesCallbacksAreOrdered(options);
        // there are several places that assume you aren't combining skip/limit with
        // unordered observe.  eg, update's EJSON.clone, and the "there are several"
        // comment in _modifyAndNotify
        // XXX allow skip/limit with unordered observe
        if (!options._allow_unordered && !ordered && (this.skip || this.limit)) {
            throw new Error("Must use an ordered observe with skip or limit (i.e. 'addedBefore' " + "for observeChanges or 'addedAt' for observe, instead of 'added').");
        }
        if (this.fields && (this.fields._id === 0 || this.fields._id === false)) {
            throw Error("You may not observe a cursor with {fields: {_id: 0}}");
        }
        const distances = this.matcher.hasGeoQuery() && ordered && new LocalCollection._IdMap();
        const query = {
            cursor: this,
            dirty: false,
            distances,
            matcher: this.matcher,
            ordered,
            projectionFn: this._projectionFn,
            resultsSnapshot: null,
            sorter: ordered && this.sorter
        };
        let qid;
        // Non-reactive queries call added[Before] and then never call anything
        // else.
        if (this.reactive) {
            qid = this.collection.next_qid++;
            this.collection.queries[qid] = query;
        }
        query.results = this._getRawObjects({
            ordered,
            distances: query.distances
        });
        if (this.collection.paused) {
            query.resultsSnapshot = ordered ? [] : new LocalCollection._IdMap();
        }
        // wrap callbacks we were passed. callbacks only fire when not paused and
        // are never undefined
        // Filters out blacklisted fields according to cursor's projection.
        // XXX wrong place for this?
        // furthermore, callbacks enqueue until the operation we're working on is
        // done.
        const wrapCallback = (fn)=>{
            if (!fn) {
                return ()=>{};
            }
            const self = this;
            return function() {
                if (self.collection.paused) {
                    return;
                }
                const args = arguments;
                self.collection._observeQueue.queueTask(()=>{
                    fn.apply(this, args);
                });
            };
        };
        query.added = wrapCallback(options.added);
        query.changed = wrapCallback(options.changed);
        query.removed = wrapCallback(options.removed);
        if (ordered) {
            query.addedBefore = wrapCallback(options.addedBefore);
            query.movedBefore = wrapCallback(options.movedBefore);
        }
        if (!options._suppress_initial && !this.collection.paused) {
            var _query_results_size, _query_results;
            const handler = (doc)=>{
                const fields = EJSON.clone(doc);
                delete fields._id;
                if (ordered) {
                    query.addedBefore(doc._id, this._projectionFn(fields), null);
                }
                query.added(doc._id, this._projectionFn(fields));
            };
            // it means it's just an array
            if (query.results.length) {
                for (const doc of query.results){
                    handler(doc);
                }
            }
            // it means it's an id map
            if ((_query_results = query.results) === null || _query_results === void 0 ? void 0 : (_query_results_size = _query_results.size) === null || _query_results_size === void 0 ? void 0 : _query_results_size.call(_query_results)) {
                query.results.forEach(handler);
            }
        }
        const handle = Object.assign(new LocalCollection.ObserveHandle(), {
            collection: this.collection,
            stop: ()=>{
                if (this.reactive) {
                    delete this.collection.queries[qid];
                }
            },
            isReady: false,
            isReadyPromise: null
        });
        if (this.reactive && Tracker.active) {
            // XXX in many cases, the same observe will be recreated when
            // the current autorun is rerun.  we could save work by
            // letting it linger across rerun and potentially get
            // repurposed if the same observe is performed, using logic
            // similar to that of Meteor.subscribe.
            Tracker.onInvalidate(()=>{
                handle.stop();
            });
        }
        // run the observe callbacks resulting from the initial contents
        // before we leave the observe.
        const drainResult = this.collection._observeQueue.drain();
        if (drainResult instanceof Promise) {
            handle.isReadyPromise = drainResult;
            drainResult.then(()=>handle.isReady = true);
        } else {
            handle.isReady = true;
            handle.isReadyPromise = Promise.resolve();
        }
        return handle;
    }
    /**
   * @summary Watch a query. Receive callbacks as the result set changes. Only
   *          the differences between the old and new documents are passed to
   *          the callbacks.
   * @locus Anywhere
   * @memberOf Mongo.Cursor
   * @instance
   * @param {Object} callbacks Functions to call to deliver the result set as it
   *                           changes
   */ observeChangesAsync(options) {
        return new Promise((resolve)=>{
            const handle = this.observeChanges(options);
            handle.isReadyPromise.then(()=>resolve(handle));
        });
    }
    // XXX Maybe we need a version of observe that just calls a callback if
    // anything changed.
    _depend(changers, _allow_unordered) {
        if (Tracker.active) {
            const dependency = new Tracker.Dependency();
            const notify = dependency.changed.bind(dependency);
            dependency.depend();
            const options = {
                _allow_unordered,
                _suppress_initial: true
            };
            [
                'added',
                'addedBefore',
                'changed',
                'movedBefore',
                'removed'
            ].forEach((fn)=>{
                if (changers[fn]) {
                    options[fn] = notify;
                }
            });
            // observeChanges will stop() when this computation is invalidated
            this.observeChanges(options);
        }
    }
    _getCollectionName() {
        return this.collection.name;
    }
    // Returns a collection of matching objects, but doesn't deep copy them.
    //
    // If ordered is set, returns a sorted array, respecting sorter, skip, and
    // limit properties of the query provided that options.applySkipLimit is
    // not set to false (#1201). If sorter is falsey, no sort -- you get the
    // natural order.
    //
    // If ordered is not set, returns an object mapping from ID to doc (sorter,
    // skip and limit should not be set).
    //
    // If ordered is set and this cursor is a $near geoquery, then this function
    // will use an _IdMap to track each distance from the $near argument point in
    // order to use it as a sort key. If an _IdMap is passed in the 'distances'
    // argument, this function will clear it and use it for this purpose
    // (otherwise it will just create its own _IdMap). The observeChanges
    // implementation uses this to remember the distances after this function
    // returns.
    _getRawObjects(options = {}) {
        // By default this method will respect skip and limit because .fetch(),
        // .forEach() etc... expect this behaviour. It can be forced to ignore
        // skip and limit by setting applySkipLimit to false (.count() does this,
        // for example)
        const applySkipLimit = options.applySkipLimit !== false;
        // XXX use OrderedDict instead of array, and make IdMap and OrderedDict
        // compatible
        const results = options.ordered ? [] : new LocalCollection._IdMap();
        // fast path for single ID value
        if (this._selectorId !== undefined) {
            // If you have non-zero skip and ask for a single id, you get nothing.
            // This is so it matches the behavior of the '{_id: foo}' path.
            if (applySkipLimit && this.skip) {
                return results;
            }
            const selectedDoc = this.collection._docs.get(this._selectorId);
            if (selectedDoc) {
                if (options.ordered) {
                    results.push(selectedDoc);
                } else {
                    results.set(this._selectorId, selectedDoc);
                }
            }
            return results;
        }
        // slow path for arbitrary selector, sort, skip, limit
        // in the observeChanges case, distances is actually part of the "query"
        // (ie, live results set) object.  in other cases, distances is only used
        // inside this function.
        let distances;
        if (this.matcher.hasGeoQuery() && options.ordered) {
            if (options.distances) {
                distances = options.distances;
                distances.clear();
            } else {
                distances = new LocalCollection._IdMap();
            }
        }
        Meteor._runFresh(()=>{
            this.collection._docs.forEach((doc, id)=>{
                const matchResult = this.matcher.documentMatches(doc);
                if (matchResult.result) {
                    if (options.ordered) {
                        results.push(doc);
                        if (distances && matchResult.distance !== undefined) {
                            distances.set(id, matchResult.distance);
                        }
                    } else {
                        results.set(id, doc);
                    }
                }
                // Override to ensure all docs are matched if ignoring skip & limit
                if (!applySkipLimit) {
                    return true;
                }
                // Fast path for limited unsorted queries.
                // XXX 'length' check here seems wrong for ordered
                return !this.limit || this.skip || this.sorter || results.length !== this.limit;
            });
        });
        if (!options.ordered) {
            return results;
        }
        if (this.sorter) {
            results.sort(this.sorter.getComparator({
                distances
            }));
        }
        // Return the full set of results if there is no skip or limit or if we're
        // ignoring them
        if (!applySkipLimit || !this.limit && !this.skip) {
            return results;
        }
        return results.slice(this.skip, this.limit ? this.limit + this.skip : results.length);
    }
    _publishCursor(subscription) {
        // XXX minimongo should not depend on mongo-livedata!
        if (!Package.mongo) {
            throw new Error("Can't publish from Minimongo without the `mongo` package.");
        }
        if (!this.collection.name) {
            throw new Error("Can't publish a cursor from a collection without a name.");
        }
        return Package.mongo.Mongo.Collection._publishCursor(this, subscription, this.collection.name);
    }
    // don't call this ctor directly.  use LocalCollection.find().
    constructor(collection, selector, options = {}){
        this.collection = collection;
        this.sorter = null;
        this.matcher = new Minimongo.Matcher(selector);
        if (LocalCollection._selectorIsIdPerhapsAsObject(selector)) {
            // stash for fast _id and { _id }
            this._selectorId = hasOwn.call(selector, '_id') ? selector._id : selector;
        } else {
            this._selectorId = undefined;
            if (this.matcher.hasGeoQuery() || options.sort) {
                this.sorter = new Minimongo.Sorter(options.sort || []);
            }
        }
        this.skip = options.skip || 0;
        this.limit = options.limit;
        this.fields = options.projection || options.fields;
        this._projectionFn = LocalCollection._compileProjection(this.fields || {});
        this._transform = LocalCollection.wrapTransform(options.transform);
        // by default, queries register w/ Tracker when it is available.
        if (typeof Tracker !== 'undefined') {
            this.reactive = options.reactive === undefined ? true : options.reactive;
        }
    }
}
// Cursor: a specification for a particular subset of documents, w/ a defined
// order, limit, and offset.  creating a Cursor with LocalCollection.find(),

// Implements async version of cursor methods to keep collections isomorphic
ASYNC_CURSOR_METHODS.forEach((method)=>{
    const asyncName = getAsyncMethodName(method);
    Cursor.prototype[asyncName] = function(...args) {
        try {
            return Promise.resolve(this[method].apply(this, args));
        } catch (error) {
            return Promise.reject(error);
        }
    };
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"local_collection.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/local_collection.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({default:()=>LocalCollection});let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);let _object_spread;module.link("@swc/helpers/_/_object_spread",{_(v){_object_spread=v}},1);let Cursor;module.link('./cursor.js',{default(v){Cursor=v}},2);let ObserveHandle;module.link('./observe_handle.js',{default(v){ObserveHandle=v}},3);let hasOwn,isIndexable,isNumericKey,isOperatorObject,populateDocumentWithQueryFields,projectionDetails;module.link('./common.js',{hasOwn(v){hasOwn=v},isIndexable(v){isIndexable=v},isNumericKey(v){isNumericKey=v},isOperatorObject(v){isOperatorObject=v},populateDocumentWithQueryFields(v){populateDocumentWithQueryFields=v},projectionDetails(v){projectionDetails=v}},4);let getAsyncMethodName;module.link('./constants',{getAsyncMethodName(v){getAsyncMethodName=v}},5);





class LocalCollection {
    countDocuments(selector, options) {
        return this.find(selector !== null && selector !== void 0 ? selector : {}, options).countAsync();
    }
    estimatedDocumentCount(options) {
        return this.find({}, options).countAsync();
    }
    // options may include sort, skip, limit, reactive
    // sort may be any of these forms:
    //     {a: 1, b: -1}
    //     [["a", "asc"], ["b", "desc"]]
    //     ["a", ["b", "desc"]]
    //   (in the first form you're beholden to key enumeration order in
    //   your javascript VM)
    //
    // reactive: if given, and false, don't register with Tracker (default
    // is true)
    //
    // XXX possibly should support retrieving a subset of fields? and
    // have it be a hint (ignored on the client, when not copying the
    // doc?)
    //
    // XXX sort does not yet support subkeys ('a.b') .. fix that!
    // XXX add one more sort form: "key"
    // XXX tests
    find(selector, options) {
        // default syntax for everything is to omit the selector argument.
        // but if selector is explicitly passed in as false or undefined, we
        // want a selector that matches nothing.
        if (arguments.length === 0) {
            selector = {};
        }
        return new LocalCollection.Cursor(this, selector, options);
    }
    findOne(selector, options = {}) {
        if (arguments.length === 0) {
            selector = {};
        }
        // NOTE: by setting limit 1 here, we end up using very inefficient
        // code that recomputes the whole query on each update. The upside is
        // that when you reactively depend on a findOne you only get
        // invalidated when the found object changes, not any object in the
        // collection. Most findOne will be by id, which has a fast path, so
        // this might not be a big deal. In most cases, invalidation causes
        // the called to re-query anyway, so this should be a net performance
        // improvement.
        options.limit = 1;
        return this.find(selector, options).fetch()[0];
    }
    findOneAsync(_0) {
        return _async_to_generator(function*(selector, options = {}) {
            if (arguments.length === 0) {
                selector = {};
            }
            options.limit = 1;
            return (yield this.find(selector, options).fetchAsync())[0];
        }).apply(this, arguments);
    }
    prepareInsert(doc) {
        assertHasValidFieldNames(doc);
        // if you really want to use ObjectIDs, set this global.
        // Mongo.Collection specifies its own ids and does not use this code.
        if (!hasOwn.call(doc, '_id')) {
            doc._id = LocalCollection._useOID ? new MongoID.ObjectID() : Random.id();
        }
        const id = doc._id;
        if (this._docs.has(id)) {
            throw MinimongoError(`Duplicate _id '${id}'`);
        }
        this._saveOriginal(id, undefined);
        this._docs.set(id, doc);
        return id;
    }
    // XXX possibly enforce that 'undefined' does not appear (we assume
    // this in our handling of null and $exists)
    insert(doc, callback) {
        doc = EJSON.clone(doc);
        const id = this.prepareInsert(doc);
        const queriesToRecompute = [];
        // trigger live queries that match
        for (const qid of Object.keys(this.queries)){
            const query = this.queries[qid];
            if (query.dirty) {
                continue;
            }
            const matchResult = query.matcher.documentMatches(doc);
            if (matchResult.result) {
                if (query.distances && matchResult.distance !== undefined) {
                    query.distances.set(id, matchResult.distance);
                }
                if (query.cursor.skip || query.cursor.limit) {
                    queriesToRecompute.push(qid);
                } else {
                    LocalCollection._insertInResultsSync(query, doc);
                }
            }
        }
        queriesToRecompute.forEach((qid)=>{
            if (this.queries[qid]) {
                this._recomputeResults(this.queries[qid]);
            }
        });
        this._observeQueue.drain();
        if (callback) {
            Meteor.defer(()=>{
                callback(null, id);
            });
        }
        return id;
    }
    insertAsync(doc, callback) {
        return _async_to_generator(function*() {
            doc = EJSON.clone(doc);
            const id = this.prepareInsert(doc);
            const queriesToRecompute = [];
            // trigger live queries that match
            for (const qid of Object.keys(this.queries)){
                const query = this.queries[qid];
                if (query.dirty) {
                    continue;
                }
                const matchResult = query.matcher.documentMatches(doc);
                if (matchResult.result) {
                    if (query.distances && matchResult.distance !== undefined) {
                        query.distances.set(id, matchResult.distance);
                    }
                    if (query.cursor.skip || query.cursor.limit) {
                        queriesToRecompute.push(qid);
                    } else {
                        yield LocalCollection._insertInResultsAsync(query, doc);
                    }
                }
            }
            queriesToRecompute.forEach((qid)=>{
                if (this.queries[qid]) {
                    this._recomputeResults(this.queries[qid]);
                }
            });
            yield this._observeQueue.drain();
            if (callback) {
                Meteor.defer(()=>{
                    callback(null, id);
                });
            }
            return id;
        }).call(this);
    }
    // Pause the observers. No callbacks from observers will fire until
    // 'resumeObservers' is called.
    pauseObservers() {
        // No-op if already paused.
        if (this.paused) {
            return;
        }
        // Set the 'paused' flag such that new observer messages don't fire.
        this.paused = true;
        // Take a snapshot of the query results for each query.
        Object.keys(this.queries).forEach((qid)=>{
            const query = this.queries[qid];
            query.resultsSnapshot = EJSON.clone(query.results);
        });
    }
    clearResultQueries(callback) {
        const result = this._docs.size();
        this._docs.clear();
        Object.keys(this.queries).forEach((qid)=>{
            const query = this.queries[qid];
            if (query.ordered) {
                query.results = [];
            } else {
                query.results.clear();
            }
        });
        if (callback) {
            Meteor.defer(()=>{
                callback(null, result);
            });
        }
        return result;
    }
    prepareRemove(selector) {
        const matcher = new Minimongo.Matcher(selector);
        const remove = [];
        this._eachPossiblyMatchingDocSync(selector, (doc, id)=>{
            if (matcher.documentMatches(doc).result) {
                remove.push(id);
            }
        });
        const queriesToRecompute = [];
        const queryRemove = [];
        for(let i = 0; i < remove.length; i++){
            const removeId = remove[i];
            const removeDoc = this._docs.get(removeId);
            Object.keys(this.queries).forEach((qid)=>{
                const query = this.queries[qid];
                if (query.dirty) {
                    return;
                }
                if (query.matcher.documentMatches(removeDoc).result) {
                    if (query.cursor.skip || query.cursor.limit) {
                        queriesToRecompute.push(qid);
                    } else {
                        queryRemove.push({
                            qid,
                            doc: removeDoc
                        });
                    }
                }
            });
            this._saveOriginal(removeId, removeDoc);
            this._docs.remove(removeId);
        }
        return {
            queriesToRecompute,
            queryRemove,
            remove
        };
    }
    remove(selector, callback) {
        // Easy special case: if we're not calling observeChanges callbacks and
        // we're not saving originals and we got asked to remove everything, then
        // just empty everything directly.
        if (this.paused && !this._savedOriginals && EJSON.equals(selector, {})) {
            return this.clearResultQueries(callback);
        }
        const { queriesToRecompute, queryRemove, remove } = this.prepareRemove(selector);
        // run live query callbacks _after_ we've removed the documents.
        queryRemove.forEach((remove)=>{
            const query = this.queries[remove.qid];
            if (query) {
                query.distances && query.distances.remove(remove.doc._id);
                LocalCollection._removeFromResultsSync(query, remove.doc);
            }
        });
        queriesToRecompute.forEach((qid)=>{
            const query = this.queries[qid];
            if (query) {
                this._recomputeResults(query);
            }
        });
        this._observeQueue.drain();
        const result = remove.length;
        if (callback) {
            Meteor.defer(()=>{
                callback(null, result);
            });
        }
        return result;
    }
    removeAsync(selector, callback) {
        return _async_to_generator(function*() {
            // Easy special case: if we're not calling observeChanges callbacks and
            // we're not saving originals and we got asked to remove everything, then
            // just empty everything directly.
            if (this.paused && !this._savedOriginals && EJSON.equals(selector, {})) {
                return this.clearResultQueries(callback);
            }
            const { queriesToRecompute, queryRemove, remove } = this.prepareRemove(selector);
            // run live query callbacks _after_ we've removed the documents.
            for (const remove of queryRemove){
                const query = this.queries[remove.qid];
                if (query) {
                    query.distances && query.distances.remove(remove.doc._id);
                    yield LocalCollection._removeFromResultsAsync(query, remove.doc);
                }
            }
            queriesToRecompute.forEach((qid)=>{
                const query = this.queries[qid];
                if (query) {
                    this._recomputeResults(query);
                }
            });
            yield this._observeQueue.drain();
            const result = remove.length;
            if (callback) {
                Meteor.defer(()=>{
                    callback(null, result);
                });
            }
            return result;
        }).call(this);
    }
    // Resume the observers. Observers immediately receive change
    // notifications to bring them to the current state of the
    // database. Note that this is not just replaying all the changes that
    // happened during the pause, it is a smarter 'coalesced' diff.
    _resumeObservers() {
        // No-op if not paused.
        if (!this.paused) {
            return;
        }
        // Unset the 'paused' flag. Make sure to do this first, otherwise
        // observer methods won't actually fire when we trigger them.
        this.paused = false;
        Object.keys(this.queries).forEach((qid)=>{
            const query = this.queries[qid];
            if (query.dirty) {
                query.dirty = false;
                // re-compute results will perform `LocalCollection._diffQueryChanges`
                // automatically.
                this._recomputeResults(query, query.resultsSnapshot);
            } else {
                // Diff the current results against the snapshot and send to observers.
                // pass the query object for its observer callbacks.
                LocalCollection._diffQueryChanges(query.ordered, query.resultsSnapshot, query.results, query, {
                    projectionFn: query.projectionFn
                });
            }
            query.resultsSnapshot = null;
        });
    }
    resumeObserversServer() {
        return _async_to_generator(function*() {
            this._resumeObservers();
            yield this._observeQueue.drain();
        }).call(this);
    }
    resumeObserversClient() {
        this._resumeObservers();
        this._observeQueue.drain();
    }
    retrieveOriginals() {
        if (!this._savedOriginals) {
            throw new Error('Called retrieveOriginals without saveOriginals');
        }
        const originals = this._savedOriginals;
        this._savedOriginals = null;
        return originals;
    }
    // To track what documents are affected by a piece of code, call
    // saveOriginals() before it and retrieveOriginals() after it.
    // retrieveOriginals returns an object whose keys are the ids of the documents
    // that were affected since the call to saveOriginals(), and the values are
    // equal to the document's contents at the time of saveOriginals. (In the case
    // of an inserted document, undefined is the value.) You must alternate
    // between calls to saveOriginals() and retrieveOriginals().
    saveOriginals() {
        if (this._savedOriginals) {
            throw new Error('Called saveOriginals twice without retrieveOriginals');
        }
        this._savedOriginals = new LocalCollection._IdMap;
    }
    prepareUpdate(selector) {
        // Save the original results of any query that we might need to
        // _recomputeResults on, because _modifyAndNotify will mutate the objects in
        // it. (We don't need to save the original results of paused queries because
        // they already have a resultsSnapshot and we won't be diffing in
        // _recomputeResults.)
        const qidToOriginalResults = {};
        // We should only clone each document once, even if it appears in multiple
        // queries
        const docMap = new LocalCollection._IdMap;
        const idsMatched = LocalCollection._idsMatchedBySelector(selector);
        Object.keys(this.queries).forEach((qid)=>{
            const query = this.queries[qid];
            if ((query.cursor.skip || query.cursor.limit) && !this.paused) {
                // Catch the case of a reactive `count()` on a cursor with skip
                // or limit, which registers an unordered observe. This is a
                // pretty rare case, so we just clone the entire result set with
                // no optimizations for documents that appear in these result
                // sets and other queries.
                if (query.results instanceof LocalCollection._IdMap) {
                    qidToOriginalResults[qid] = query.results.clone();
                    return;
                }
                if (!(query.results instanceof Array)) {
                    throw new Error('Assertion failed: query.results not an array');
                }
                // Clones a document to be stored in `qidToOriginalResults`
                // because it may be modified before the new and old result sets
                // are diffed. But if we know exactly which document IDs we're
                // going to modify, then we only need to clone those.
                const memoizedCloneIfNeeded = (doc)=>{
                    if (docMap.has(doc._id)) {
                        return docMap.get(doc._id);
                    }
                    const docToMemoize = idsMatched && !idsMatched.some((id)=>EJSON.equals(id, doc._id)) ? doc : EJSON.clone(doc);
                    docMap.set(doc._id, docToMemoize);
                    return docToMemoize;
                };
                qidToOriginalResults[qid] = query.results.map(memoizedCloneIfNeeded);
            }
        });
        return qidToOriginalResults;
    }
    finishUpdate({ options, updateCount, callback, insertedId }) {
        // Return the number of affected documents, or in the upsert case, an object
        // containing the number of affected docs and the id of the doc that was
        // inserted, if any.
        let result;
        if (options._returnObject) {
            result = {
                numberAffected: updateCount
            };
            if (insertedId !== undefined) {
                result.insertedId = insertedId;
            }
        } else {
            result = updateCount;
        }
        if (callback) {
            Meteor.defer(()=>{
                callback(null, result);
            });
        }
        return result;
    }
    // XXX atomicity: if multi is true, and one modification fails, do
    // we rollback the whole operation, or what?
    updateAsync(selector, mod, options, callback) {
        return _async_to_generator(function*() {
            if (!callback && options instanceof Function) {
                callback = options;
                options = null;
            }
            if (!options) {
                options = {};
            }
            const matcher = new Minimongo.Matcher(selector, true);
            const qidToOriginalResults = this.prepareUpdate(selector);
            let recomputeQids = {};
            let updateCount = 0;
            yield this._eachPossiblyMatchingDocAsync(selector, (doc, id)=>_async_to_generator(function*() {
                    const queryResult = matcher.documentMatches(doc);
                    if (queryResult.result) {
                        // XXX Should we save the original even if mod ends up being a no-op?
                        this._saveOriginal(id, doc);
                        recomputeQids = yield this._modifyAndNotifyAsync(doc, mod, queryResult.arrayIndices);
                        ++updateCount;
                        if (!options.multi) {
                            return false; // break
                        }
                    }
                    return true;
                }).call(this));
            Object.keys(recomputeQids).forEach((qid)=>{
                const query = this.queries[qid];
                if (query) {
                    this._recomputeResults(query, qidToOriginalResults[qid]);
                }
            });
            yield this._observeQueue.drain();
            // If we are doing an upsert, and we didn't modify any documents yet, then
            // it's time to do an insert. Figure out what document we are inserting, and
            // generate an id for it.
            let insertedId;
            if (updateCount === 0 && options.upsert) {
                const doc = LocalCollection._createUpsertDocument(selector, mod);
                if (!doc._id && options.insertedId) {
                    doc._id = options.insertedId;
                }
                insertedId = yield this.insertAsync(doc);
                updateCount = 1;
            }
            return this.finishUpdate({
                options,
                insertedId,
                updateCount,
                callback
            });
        }).call(this);
    }
    // XXX atomicity: if multi is true, and one modification fails, do
    // we rollback the whole operation, or what?
    update(selector, mod, options, callback) {
        if (!callback && options instanceof Function) {
            callback = options;
            options = null;
        }
        if (!options) {
            options = {};
        }
        const matcher = new Minimongo.Matcher(selector, true);
        const qidToOriginalResults = this.prepareUpdate(selector);
        let recomputeQids = {};
        let updateCount = 0;
        this._eachPossiblyMatchingDocSync(selector, (doc, id)=>{
            const queryResult = matcher.documentMatches(doc);
            if (queryResult.result) {
                // XXX Should we save the original even if mod ends up being a no-op?
                this._saveOriginal(id, doc);
                recomputeQids = this._modifyAndNotifySync(doc, mod, queryResult.arrayIndices);
                ++updateCount;
                if (!options.multi) {
                    return false; // break
                }
            }
            return true;
        });
        Object.keys(recomputeQids).forEach((qid)=>{
            const query = this.queries[qid];
            if (query) {
                this._recomputeResults(query, qidToOriginalResults[qid]);
            }
        });
        this._observeQueue.drain();
        // If we are doing an upsert, and we didn't modify any documents yet, then
        // it's time to do an insert. Figure out what document we are inserting, and
        // generate an id for it.
        let insertedId;
        if (updateCount === 0 && options.upsert) {
            const doc = LocalCollection._createUpsertDocument(selector, mod);
            if (!doc._id && options.insertedId) {
                doc._id = options.insertedId;
            }
            insertedId = this.insert(doc);
            updateCount = 1;
        }
        return this.finishUpdate({
            options,
            insertedId,
            updateCount,
            callback,
            selector,
            mod
        });
    }
    // A convenience wrapper on update. LocalCollection.upsert(sel, mod) is
    // equivalent to LocalCollection.update(sel, mod, {upsert: true,
    // _returnObject: true}).
    upsert(selector, mod, options, callback) {
        if (!callback && typeof options === 'function') {
            callback = options;
            options = {};
        }
        return this.update(selector, mod, Object.assign({}, options, {
            upsert: true,
            _returnObject: true
        }), callback);
    }
    upsertAsync(selector, mod, options, callback) {
        if (!callback && typeof options === 'function') {
            callback = options;
            options = {};
        }
        return this.updateAsync(selector, mod, Object.assign({}, options, {
            upsert: true,
            _returnObject: true
        }), callback);
    }
    // Iterates over a subset of documents that could match selector; calls
    // fn(doc, id) on each of them.  Specifically, if selector specifies
    // specific _id's, it only looks at those.  doc is *not* cloned: it is the
    // same object that is in _docs.
    _eachPossiblyMatchingDocAsync(selector, fn) {
        return _async_to_generator(function*() {
            const specificIds = LocalCollection._idsMatchedBySelector(selector);
            if (specificIds) {
                for (const id of specificIds){
                    const doc = this._docs.get(id);
                    if (doc && !(yield fn(doc, id))) {
                        break;
                    }
                }
            } else {
                yield this._docs.forEachAsync(fn);
            }
        }).call(this);
    }
    _eachPossiblyMatchingDocSync(selector, fn) {
        const specificIds = LocalCollection._idsMatchedBySelector(selector);
        if (specificIds) {
            for (const id of specificIds){
                const doc = this._docs.get(id);
                if (doc && !fn(doc, id)) {
                    break;
                }
            }
        } else {
            this._docs.forEach(fn);
        }
    }
    _getMatchedDocAndModify(doc, mod, arrayIndices) {
        const matched_before = {};
        Object.keys(this.queries).forEach((qid)=>{
            const query = this.queries[qid];
            if (query.dirty) {
                return;
            }
            if (query.ordered) {
                matched_before[qid] = query.matcher.documentMatches(doc).result;
            } else {
                // Because we don't support skip or limit (yet) in unordered queries, we
                // can just do a direct lookup.
                matched_before[qid] = query.results.has(doc._id);
            }
        });
        return matched_before;
    }
    _modifyAndNotifySync(doc, mod, arrayIndices) {
        const matched_before = this._getMatchedDocAndModify(doc, mod, arrayIndices);
        const old_doc = EJSON.clone(doc);
        LocalCollection._modify(doc, mod, {
            arrayIndices
        });
        const recomputeQids = {};
        for (const qid of Object.keys(this.queries)){
            const query = this.queries[qid];
            if (query.dirty) {
                continue;
            }
            const afterMatch = query.matcher.documentMatches(doc);
            const after = afterMatch.result;
            const before = matched_before[qid];
            if (after && query.distances && afterMatch.distance !== undefined) {
                query.distances.set(doc._id, afterMatch.distance);
            }
            if (query.cursor.skip || query.cursor.limit) {
                // We need to recompute any query where the doc may have been in the
                // cursor's window either before or after the update. (Note that if skip
                // or limit is set, "before" and "after" being true do not necessarily
                // mean that the document is in the cursor's output after skip/limit is
                // applied... but if they are false, then the document definitely is NOT
                // in the output. So it's safe to skip recompute if neither before or
                // after are true.)
                if (before || after) {
                    recomputeQids[qid] = true;
                }
            } else if (before && !after) {
                LocalCollection._removeFromResultsSync(query, doc);
            } else if (!before && after) {
                LocalCollection._insertInResultsSync(query, doc);
            } else if (before && after) {
                LocalCollection._updateInResultsSync(query, doc, old_doc);
            }
        }
        return recomputeQids;
    }
    _modifyAndNotifyAsync(doc, mod, arrayIndices) {
        return _async_to_generator(function*() {
            const matched_before = this._getMatchedDocAndModify(doc, mod, arrayIndices);
            const old_doc = EJSON.clone(doc);
            LocalCollection._modify(doc, mod, {
                arrayIndices
            });
            const recomputeQids = {};
            for (const qid of Object.keys(this.queries)){
                const query = this.queries[qid];
                if (query.dirty) {
                    continue;
                }
                const afterMatch = query.matcher.documentMatches(doc);
                const after = afterMatch.result;
                const before = matched_before[qid];
                if (after && query.distances && afterMatch.distance !== undefined) {
                    query.distances.set(doc._id, afterMatch.distance);
                }
                if (query.cursor.skip || query.cursor.limit) {
                    // We need to recompute any query where the doc may have been in the
                    // cursor's window either before or after the update. (Note that if skip
                    // or limit is set, "before" and "after" being true do not necessarily
                    // mean that the document is in the cursor's output after skip/limit is
                    // applied... but if they are false, then the document definitely is NOT
                    // in the output. So it's safe to skip recompute if neither before or
                    // after are true.)
                    if (before || after) {
                        recomputeQids[qid] = true;
                    }
                } else if (before && !after) {
                    yield LocalCollection._removeFromResultsAsync(query, doc);
                } else if (!before && after) {
                    yield LocalCollection._insertInResultsAsync(query, doc);
                } else if (before && after) {
                    yield LocalCollection._updateInResultsAsync(query, doc, old_doc);
                }
            }
            return recomputeQids;
        }).call(this);
    }
    // Recomputes the results of a query and runs observe callbacks for the
    // difference between the previous results and the current results (unless
    // paused). Used for skip/limit queries.
    //
    // When this is used by insert or remove, it can just use query.results for
    // the old results (and there's no need to pass in oldResults), because these
    // operations don't mutate the documents in the collection. Update needs to
    // pass in an oldResults which was deep-copied before the modifier was
    // applied.
    //
    // oldResults is guaranteed to be ignored if the query is not paused.
    _recomputeResults(query, oldResults) {
        if (this.paused) {
            // There's no reason to recompute the results now as we're still paused.
            // By flagging the query as "dirty", the recompute will be performed
            // when resumeObservers is called.
            query.dirty = true;
            return;
        }
        if (!this.paused && !oldResults) {
            oldResults = query.results;
        }
        if (query.distances) {
            query.distances.clear();
        }
        query.results = query.cursor._getRawObjects({
            distances: query.distances,
            ordered: query.ordered
        });
        if (!this.paused) {
            LocalCollection._diffQueryChanges(query.ordered, oldResults, query.results, query, {
                projectionFn: query.projectionFn
            });
        }
    }
    _saveOriginal(id, doc) {
        // Are we even trying to save originals?
        if (!this._savedOriginals) {
            return;
        }
        // Have we previously mutated the original (and so 'doc' is not actually
        // original)?  (Note the 'has' check rather than truth: we store undefined
        // here for inserted docs!)
        if (this._savedOriginals.has(id)) {
            return;
        }
        this._savedOriginals.set(id, EJSON.clone(doc));
    }
    constructor(name){
        this.name = name;
        // _id -> document (also containing id)
        this._docs = new LocalCollection._IdMap;
        this._observeQueue = Meteor.isClient ? new Meteor._SynchronousQueue() : new Meteor._AsynchronousQueue();
        this.next_qid = 1; // live query id generator
        // qid -> live query object. keys:
        //  ordered: bool. ordered queries have addedBefore/movedBefore callbacks.
        //  results: array (ordered) or object (unordered) of current results
        //    (aliased with this._docs!)
        //  resultsSnapshot: snapshot of results. null if not paused.
        //  cursor: Cursor object for the query.
        //  selector, sorter, (callbacks): functions
        this.queries = Object.create(null);
        // null if not saving originals; an IdMap from id to original document value
        // if saving originals. See comments before saveOriginals().
        this._savedOriginals = null;
        // True when observers are paused and we should not send callbacks.
        this.paused = false;
    }
}
// XXX type checking on selectors (graceful error if malformed)
// LocalCollection: a set of documents that supports queries and modifiers.

LocalCollection.Cursor = Cursor;
LocalCollection.ObserveHandle = ObserveHandle;
// XXX maybe move these into another ObserveHelpers package or something
// _CachingChangeObserver is an object which receives observeChanges callbacks
// and keeps a cache of the current cursor state up to date in this.docs. Users
// of this class should read the docs field but not modify it. You should pass
// the "applyChange" field as the callbacks to the underlying observeChanges
// call. Optionally, you can specify your own observeChanges callbacks which are
// invoked immediately before the docs field is updated; this object is made
// available as `this` to those callbacks.
LocalCollection._CachingChangeObserver = class _CachingChangeObserver {
    constructor(options = {}){
        const orderedFromCallbacks = options.callbacks && LocalCollection._observeChangesCallbacksAreOrdered(options.callbacks);
        if (hasOwn.call(options, 'ordered')) {
            this.ordered = options.ordered;
            if (options.callbacks && options.ordered !== orderedFromCallbacks) {
                throw Error('ordered option doesn\'t match callbacks');
            }
        } else if (options.callbacks) {
            this.ordered = orderedFromCallbacks;
        } else {
            throw Error('must provide ordered or callbacks');
        }
        const callbacks = options.callbacks || {};
        if (this.ordered) {
            this.docs = new OrderedDict(MongoID.idStringify);
            this.applyChange = {
                addedBefore: (id, fields, before)=>{
                    // Take a shallow copy since the top-level properties can be changed
                    const doc = _object_spread({}, fields);
                    doc._id = id;
                    if (callbacks.addedBefore) {
                        callbacks.addedBefore.call(this, id, EJSON.clone(fields), before);
                    }
                    // This line triggers if we provide added with movedBefore.
                    if (callbacks.added) {
                        callbacks.added.call(this, id, EJSON.clone(fields));
                    }
                    // XXX could `before` be a falsy ID?  Technically
                    // idStringify seems to allow for them -- though
                    // OrderedDict won't call stringify on a falsy arg.
                    this.docs.putBefore(id, doc, before || null);
                },
                movedBefore: (id, before)=>{
                    if (callbacks.movedBefore) {
                        callbacks.movedBefore.call(this, id, before);
                    }
                    this.docs.moveBefore(id, before || null);
                }
            };
        } else {
            this.docs = new LocalCollection._IdMap;
            this.applyChange = {
                added: (id, fields)=>{
                    // Take a shallow copy since the top-level properties can be changed
                    const doc = _object_spread({}, fields);
                    if (callbacks.added) {
                        callbacks.added.call(this, id, EJSON.clone(fields));
                    }
                    doc._id = id;
                    this.docs.set(id, doc);
                }
            };
        }
        // The methods in _IdMap and OrderedDict used by these callbacks are
        // identical.
        this.applyChange.changed = (id, fields)=>{
            const doc = this.docs.get(id);
            if (!doc) {
                throw new Error(`Unknown id for changed: ${id}`);
            }
            if (callbacks.changed) {
                callbacks.changed.call(this, id, EJSON.clone(fields));
            }
            DiffSequence.applyChanges(doc, fields);
        };
        this.applyChange.removed = (id)=>{
            if (callbacks.removed) {
                callbacks.removed.call(this, id);
            }
            this.docs.remove(id);
        };
    }
};
LocalCollection._IdMap = class _IdMap extends IdMap {
    constructor(){
        super(MongoID.idStringify, MongoID.idParse);
    }
};
// Wrap a transform function to return objects that have the _id field
// of the untransformed document. This ensures that subsystems such as
// the observe-sequence package that call `observe` can keep track of
// the documents identities.
//
// - Require that it returns objects
// - If the return value has an _id field, verify that it matches the
//   original _id field
// - If the return value doesn't have an _id field, add it back.
LocalCollection.wrapTransform = (transform)=>{
    if (!transform) {
        return null;
    }
    // No need to doubly-wrap transforms.
    if (transform.__wrappedTransform__) {
        return transform;
    }
    const wrapped = (doc)=>{
        if (!hasOwn.call(doc, '_id')) {
            // XXX do we ever have a transform on the oplog's collection? because that
            // collection has no _id.
            throw new Error('can only transform documents with _id');
        }
        const id = doc._id;
        // XXX consider making tracker a weak dependency and checking
        // Package.tracker here
        const transformed = Tracker.nonreactive(()=>transform(doc));
        if (!LocalCollection._isPlainObject(transformed)) {
            throw new Error('transform must return object');
        }
        if (hasOwn.call(transformed, '_id')) {
            if (!EJSON.equals(transformed._id, id)) {
                throw new Error('transformed document can\'t have different _id');
            }
        } else {
            transformed._id = id;
        }
        return transformed;
    };
    wrapped.__wrappedTransform__ = true;
    return wrapped;
};
// XXX the sorted-query logic below is laughably inefficient. we'll
// need to come up with a better datastructure for this.
//
// XXX the logic for observing with a skip or a limit is even more
// laughably inefficient. we recompute the whole results every time!
// This binary search puts a value between any equal values, and the first
// lesser value.
LocalCollection._binarySearch = (cmp, array, value)=>{
    let first = 0;
    let range = array.length;
    while(range > 0){
        const halfRange = Math.floor(range / 2);
        if (cmp(value, array[first + halfRange]) >= 0) {
            first += halfRange + 1;
            range -= halfRange + 1;
        } else {
            range = halfRange;
        }
    }
    return first;
};
LocalCollection._checkSupportedProjection = (fields)=>{
    if (fields !== Object(fields) || Array.isArray(fields)) {
        throw MinimongoError('fields option must be an object');
    }
    Object.keys(fields).forEach((keyPath)=>{
        if (keyPath.split('.').includes('$')) {
            throw MinimongoError('Minimongo doesn\'t support $ operator in projections yet.');
        }
        const value = fields[keyPath];
        if (typeof value === 'object' && [
            '$elemMatch',
            '$meta',
            '$slice'
        ].some((key)=>hasOwn.call(value, key))) {
            throw MinimongoError('Minimongo doesn\'t support operators in projections yet.');
        }
        if (![
            1,
            0,
            true,
            false
        ].includes(value)) {
            throw MinimongoError('Projection values should be one of 1, 0, true, or false');
        }
    });
};
// Knows how to compile a fields projection to a predicate function.
// @returns - Function: a closure that filters out an object according to the
//            fields projection rules:
//            @param obj - Object: MongoDB-styled document
//            @returns - Object: a document with the fields filtered out
//                       according to projection rules. Doesn't retain subfields
//                       of passed argument.
LocalCollection._compileProjection = (fields)=>{
    LocalCollection._checkSupportedProjection(fields);
    const _idProjection = fields._id === undefined ? true : fields._id;
    const details = projectionDetails(fields);
    // returns transformed doc according to ruleTree
    const transform = (doc, ruleTree)=>{
        // Special case for "sets"
        if (Array.isArray(doc)) {
            return doc.map((subdoc)=>transform(subdoc, ruleTree));
        }
        const result = details.including ? {} : EJSON.clone(doc);
        Object.keys(ruleTree).forEach((key)=>{
            if (doc == null || !hasOwn.call(doc, key)) {
                return;
            }
            const rule = ruleTree[key];
            if (rule === Object(rule)) {
                // For sub-objects/subsets we branch
                if (doc[key] === Object(doc[key])) {
                    result[key] = transform(doc[key], rule);
                }
            } else if (details.including) {
                // Otherwise we don't even touch this subfield
                result[key] = EJSON.clone(doc[key]);
            } else {
                delete result[key];
            }
        });
        return doc != null ? result : doc;
    };
    return (doc)=>{
        const result = transform(doc, details.tree);
        if (_idProjection && hasOwn.call(doc, '_id')) {
            result._id = doc._id;
        }
        if (!_idProjection && hasOwn.call(result, '_id')) {
            delete result._id;
        }
        return result;
    };
};
// Calculates the document to insert in case we're doing an upsert and the
// selector does not match any elements
LocalCollection._createUpsertDocument = (selector, modifier)=>{
    const selectorDocument = populateDocumentWithQueryFields(selector);
    const isModify = LocalCollection._isModificationMod(modifier);
    const newDoc = {};
    if (selectorDocument._id) {
        newDoc._id = selectorDocument._id;
        delete selectorDocument._id;
    }
    // This double _modify call is made to help with nested properties (see issue
    // #8631). We do this even if it's a replacement for validation purposes (e.g.
    // ambiguous id's)
    LocalCollection._modify(newDoc, {
        $set: selectorDocument
    });
    LocalCollection._modify(newDoc, modifier, {
        isInsert: true
    });
    if (isModify) {
        return newDoc;
    }
    // Replacement can take _id from query document
    const replacement = Object.assign({}, modifier);
    if (newDoc._id) {
        replacement._id = newDoc._id;
    }
    return replacement;
};
LocalCollection._diffObjects = (left, right, callbacks)=>{
    return DiffSequence.diffObjects(left, right, callbacks);
};
// ordered: bool.
// old_results and new_results: collections of documents.
//    if ordered, they are arrays.
//    if unordered, they are IdMaps
LocalCollection._diffQueryChanges = (ordered, oldResults, newResults, observer, options)=>DiffSequence.diffQueryChanges(ordered, oldResults, newResults, observer, options);
LocalCollection._diffQueryOrderedChanges = (oldResults, newResults, observer, options)=>DiffSequence.diffQueryOrderedChanges(oldResults, newResults, observer, options);
LocalCollection._diffQueryUnorderedChanges = (oldResults, newResults, observer, options)=>DiffSequence.diffQueryUnorderedChanges(oldResults, newResults, observer, options);
LocalCollection._findInOrderedResults = (query, doc)=>{
    if (!query.ordered) {
        throw new Error('Can\'t call _findInOrderedResults on unordered query');
    }
    for(let i = 0; i < query.results.length; i++){
        if (query.results[i] === doc) {
            return i;
        }
    }
    throw Error('object missing from query');
};
// If this is a selector which explicitly constrains the match by ID to a finite
// number of documents, returns a list of their IDs.  Otherwise returns
// null. Note that the selector may have other restrictions so it may not even
// match those document!  We care about $in and $and since those are generated
// access-controlled update and remove.
LocalCollection._idsMatchedBySelector = (selector)=>{
    // Is the selector just an ID?
    if (LocalCollection._selectorIsId(selector)) {
        return [
            selector
        ];
    }
    if (!selector) {
        return null;
    }
    // Do we have an _id clause?
    if (hasOwn.call(selector, '_id')) {
        // Is the _id clause just an ID?
        if (LocalCollection._selectorIsId(selector._id)) {
            return [
                selector._id
            ];
        }
        // Is the _id clause {_id: {$in: ["x", "y", "z"]}}?
        if (selector._id && Array.isArray(selector._id.$in) && selector._id.$in.length && selector._id.$in.every(LocalCollection._selectorIsId)) {
            return selector._id.$in;
        }
        return null;
    }
    // If this is a top-level $and, and any of the clauses constrain their
    // documents, then the whole selector is constrained by any one clause's
    // constraint. (Well, by their intersection, but that seems unlikely.)
    if (Array.isArray(selector.$and)) {
        for(let i = 0; i < selector.$and.length; ++i){
            const subIds = LocalCollection._idsMatchedBySelector(selector.$and[i]);
            if (subIds) {
                return subIds;
            }
        }
    }
    return null;
};
LocalCollection._insertInResultsSync = (query, doc)=>{
    const fields = EJSON.clone(doc);
    delete fields._id;
    if (query.ordered) {
        if (!query.sorter) {
            query.addedBefore(doc._id, query.projectionFn(fields), null);
            query.results.push(doc);
        } else {
            const i = LocalCollection._insertInSortedList(query.sorter.getComparator({
                distances: query.distances
            }), query.results, doc);
            let next = query.results[i + 1];
            if (next) {
                next = next._id;
            } else {
                next = null;
            }
            query.addedBefore(doc._id, query.projectionFn(fields), next);
        }
        query.added(doc._id, query.projectionFn(fields));
    } else {
        query.added(doc._id, query.projectionFn(fields));
        query.results.set(doc._id, doc);
    }
};
LocalCollection._insertInResultsAsync = (query, doc)=>_async_to_generator(function*() {
        const fields = EJSON.clone(doc);
        delete fields._id;
        if (query.ordered) {
            if (!query.sorter) {
                yield query.addedBefore(doc._id, query.projectionFn(fields), null);
                query.results.push(doc);
            } else {
                const i = LocalCollection._insertInSortedList(query.sorter.getComparator({
                    distances: query.distances
                }), query.results, doc);
                let next = query.results[i + 1];
                if (next) {
                    next = next._id;
                } else {
                    next = null;
                }
                yield query.addedBefore(doc._id, query.projectionFn(fields), next);
            }
            yield query.added(doc._id, query.projectionFn(fields));
        } else {
            yield query.added(doc._id, query.projectionFn(fields));
            query.results.set(doc._id, doc);
        }
    })();
LocalCollection._insertInSortedList = (cmp, array, value)=>{
    if (array.length === 0) {
        array.push(value);
        return 0;
    }
    const i = LocalCollection._binarySearch(cmp, array, value);
    array.splice(i, 0, value);
    return i;
};
LocalCollection._isModificationMod = (mod)=>{
    let isModify = false;
    let isReplace = false;
    Object.keys(mod).forEach((key)=>{
        if (key.substr(0, 1) === '$') {
            isModify = true;
        } else {
            isReplace = true;
        }
    });
    if (isModify && isReplace) {
        throw new Error('Update parameter cannot have both modifier and non-modifier fields.');
    }
    return isModify;
};
// XXX maybe this should be EJSON.isObject, though EJSON doesn't know about
// RegExp
// XXX note that _type(undefined) === 3!!!!
LocalCollection._isPlainObject = (x)=>{
    return x && LocalCollection._f._type(x) === 3;
};
// XXX need a strategy for passing the binding of $ into this
// function, from the compiled selector
//
// maybe just {key.up.to.just.before.dollarsign: array_index}
//
// XXX atomicity: if one modification fails, do we roll back the whole
// change?
//
// options:
//   - isInsert is set when _modify is being called to compute the document to
//     insert as part of an upsert operation. We use this primarily to figure
//     out when to set the fields in $setOnInsert, if present.
LocalCollection._modify = (doc, modifier, options = {})=>{
    if (!LocalCollection._isPlainObject(modifier)) {
        throw MinimongoError('Modifier must be an object');
    }
    // Make sure the caller can't mutate our data structures.
    modifier = EJSON.clone(modifier);
    const isModifier = isOperatorObject(modifier);
    const newDoc = isModifier ? EJSON.clone(doc) : modifier;
    if (isModifier) {
        // apply modifiers to the doc.
        Object.keys(modifier).forEach((operator)=>{
            // Treat $setOnInsert as $set if this is an insert.
            const setOnInsert = options.isInsert && operator === '$setOnInsert';
            const modFunc = MODIFIERS[setOnInsert ? '$set' : operator];
            const operand = modifier[operator];
            if (!modFunc) {
                throw MinimongoError(`Invalid modifier specified ${operator}`);
            }
            Object.keys(operand).forEach((keypath)=>{
                const arg = operand[keypath];
                if (keypath === '') {
                    throw MinimongoError('An empty update path is not valid.');
                }
                const keyparts = keypath.split('.');
                if (!keyparts.every(Boolean)) {
                    throw MinimongoError(`The update path '${keypath}' contains an empty field name, ` + 'which is not allowed.');
                }
                const target = findModTarget(newDoc, keyparts, {
                    arrayIndices: options.arrayIndices,
                    forbidArray: operator === '$rename',
                    noCreate: NO_CREATE_MODIFIERS[operator]
                });
                modFunc(target, keyparts.pop(), arg, keypath, newDoc);
            });
        });
        if (doc._id && !EJSON.equals(doc._id, newDoc._id)) {
            throw MinimongoError(`After applying the update to the document {_id: "${doc._id}", ...},` + ' the (immutable) field \'_id\' was found to have been altered to ' + `_id: "${newDoc._id}"`);
        }
    } else {
        if (doc._id && modifier._id && !EJSON.equals(doc._id, modifier._id)) {
            throw MinimongoError(`The _id field cannot be changed from {_id: "${doc._id}"} to ` + `{_id: "${modifier._id}"}`);
        }
        // replace the whole document
        assertHasValidFieldNames(modifier);
    }
    // move new document into place.
    Object.keys(doc).forEach((key)=>{
        // Note: this used to be for (var key in doc) however, this does not
        // work right in Opera. Deleting from a doc while iterating over it
        // would sometimes cause opera to skip some keys.
        if (key !== '_id') {
            delete doc[key];
        }
    });
    Object.keys(newDoc).forEach((key)=>{
        doc[key] = newDoc[key];
    });
};
LocalCollection._observeFromObserveChanges = (cursor, observeCallbacks)=>{
    const transform = cursor.getTransform() || ((doc)=>doc);
    let suppressed = !!observeCallbacks._suppress_initial;
    let observeChangesCallbacks;
    if (LocalCollection._observeCallbacksAreOrdered(observeCallbacks)) {
        // The "_no_indices" option sets all index arguments to -1 and skips the
        // linear scans required to generate them.  This lets observers that don't
        // need absolute indices benefit from the other features of this API --
        // relative order, transforms, and applyChanges -- without the speed hit.
        const indices = !observeCallbacks._no_indices;
        observeChangesCallbacks = {
            addedBefore (id, fields, before) {
                const check = suppressed || !(observeCallbacks.addedAt || observeCallbacks.added);
                if (check) {
                    return;
                }
                const doc = transform(Object.assign(fields, {
                    _id: id
                }));
                if (observeCallbacks.addedAt) {
                    observeCallbacks.addedAt(doc, indices ? before ? this.docs.indexOf(before) : this.docs.size() : -1, before);
                } else {
                    observeCallbacks.added(doc);
                }
            },
            changed (id, fields) {
                if (!(observeCallbacks.changedAt || observeCallbacks.changed)) {
                    return;
                }
                let doc = EJSON.clone(this.docs.get(id));
                if (!doc) {
                    throw new Error(`Unknown id for changed: ${id}`);
                }
                const oldDoc = transform(EJSON.clone(doc));
                DiffSequence.applyChanges(doc, fields);
                if (observeCallbacks.changedAt) {
                    observeCallbacks.changedAt(transform(doc), oldDoc, indices ? this.docs.indexOf(id) : -1);
                } else {
                    observeCallbacks.changed(transform(doc), oldDoc);
                }
            },
            movedBefore (id, before) {
                if (!observeCallbacks.movedTo) {
                    return;
                }
                const from = indices ? this.docs.indexOf(id) : -1;
                let to = indices ? before ? this.docs.indexOf(before) : this.docs.size() : -1;
                // When not moving backwards, adjust for the fact that removing the
                // document slides everything back one slot.
                if (to > from) {
                    --to;
                }
                observeCallbacks.movedTo(transform(EJSON.clone(this.docs.get(id))), from, to, before || null);
            },
            removed (id) {
                if (!(observeCallbacks.removedAt || observeCallbacks.removed)) {
                    return;
                }
                // technically maybe there should be an EJSON.clone here, but it's about
                // to be removed from this.docs!
                const doc = transform(this.docs.get(id));
                if (observeCallbacks.removedAt) {
                    observeCallbacks.removedAt(doc, indices ? this.docs.indexOf(id) : -1);
                } else {
                    observeCallbacks.removed(doc);
                }
            }
        };
    } else {
        observeChangesCallbacks = {
            added (id, fields) {
                if (!suppressed && observeCallbacks.added) {
                    observeCallbacks.added(transform(Object.assign(fields, {
                        _id: id
                    })));
                }
            },
            changed (id, fields) {
                if (observeCallbacks.changed) {
                    const oldDoc = this.docs.get(id);
                    const doc = EJSON.clone(oldDoc);
                    DiffSequence.applyChanges(doc, fields);
                    observeCallbacks.changed(transform(doc), transform(EJSON.clone(oldDoc)));
                }
            },
            removed (id) {
                if (observeCallbacks.removed) {
                    observeCallbacks.removed(transform(this.docs.get(id)));
                }
            }
        };
    }
    const changeObserver = new LocalCollection._CachingChangeObserver({
        callbacks: observeChangesCallbacks
    });
    // CachingChangeObserver clones all received input on its callbacks
    // So we can mark it as safe to reduce the ejson clones.
    // This is tested by the `mongo-livedata - (extended) scribbling` tests
    changeObserver.applyChange._fromObserve = true;
    const handle = cursor.observeChanges(changeObserver.applyChange, {
        nonMutatingCallbacks: true
    });
    // If needed, re-enable callbacks as soon as the initial batch is ready.
    const setSuppressed = (h)=>{
        var _h_isReadyPromise;
        if (h.isReady) suppressed = false;
        else (_h_isReadyPromise = h.isReadyPromise) === null || _h_isReadyPromise === void 0 ? void 0 : _h_isReadyPromise.then(()=>suppressed = false);
    };
    // When we call cursor.observeChanges() it can be the on from
    // the mongo package (instead of the minimongo one) and it doesn't have isReady and isReadyPromise
    if (Meteor._isPromise(handle)) {
        handle.then(setSuppressed);
    } else {
        setSuppressed(handle);
    }
    return handle;
};
LocalCollection._observeCallbacksAreOrdered = (callbacks)=>{
    if (callbacks.added && callbacks.addedAt) {
        throw new Error('Please specify only one of added() and addedAt()');
    }
    if (callbacks.changed && callbacks.changedAt) {
        throw new Error('Please specify only one of changed() and changedAt()');
    }
    if (callbacks.removed && callbacks.removedAt) {
        throw new Error('Please specify only one of removed() and removedAt()');
    }
    return !!(callbacks.addedAt || callbacks.changedAt || callbacks.movedTo || callbacks.removedAt);
};
LocalCollection._observeChangesCallbacksAreOrdered = (callbacks)=>{
    if (callbacks.added && callbacks.addedBefore) {
        throw new Error('Please specify only one of added() and addedBefore()');
    }
    return !!(callbacks.addedBefore || callbacks.movedBefore);
};
LocalCollection._removeFromResultsSync = (query, doc)=>{
    if (query.ordered) {
        const i = LocalCollection._findInOrderedResults(query, doc);
        query.removed(doc._id);
        query.results.splice(i, 1);
    } else {
        const id = doc._id; // in case callback mutates doc
        query.removed(doc._id);
        query.results.remove(id);
    }
};
LocalCollection._removeFromResultsAsync = (query, doc)=>_async_to_generator(function*() {
        if (query.ordered) {
            const i = LocalCollection._findInOrderedResults(query, doc);
            yield query.removed(doc._id);
            query.results.splice(i, 1);
        } else {
            const id = doc._id; // in case callback mutates doc
            yield query.removed(doc._id);
            query.results.remove(id);
        }
    })();
// Is this selector just shorthand for lookup by _id?
LocalCollection._selectorIsId = (selector)=>typeof selector === 'number' || typeof selector === 'string' || selector instanceof MongoID.ObjectID;
// Is the selector just lookup by _id (shorthand or not)?
LocalCollection._selectorIsIdPerhapsAsObject = (selector)=>LocalCollection._selectorIsId(selector) || LocalCollection._selectorIsId(selector && selector._id) && Object.keys(selector).length === 1;
LocalCollection._updateInResultsSync = (query, doc, old_doc)=>{
    if (!EJSON.equals(doc._id, old_doc._id)) {
        throw new Error('Can\'t change a doc\'s _id while updating');
    }
    const projectionFn = query.projectionFn;
    const changedFields = DiffSequence.makeChangedFields(projectionFn(doc), projectionFn(old_doc));
    if (!query.ordered) {
        if (Object.keys(changedFields).length) {
            query.changed(doc._id, changedFields);
            query.results.set(doc._id, doc);
        }
        return;
    }
    const old_idx = LocalCollection._findInOrderedResults(query, doc);
    if (Object.keys(changedFields).length) {
        query.changed(doc._id, changedFields);
    }
    if (!query.sorter) {
        return;
    }
    // just take it out and put it back in again, and see if the index changes
    query.results.splice(old_idx, 1);
    const new_idx = LocalCollection._insertInSortedList(query.sorter.getComparator({
        distances: query.distances
    }), query.results, doc);
    if (old_idx !== new_idx) {
        let next = query.results[new_idx + 1];
        if (next) {
            next = next._id;
        } else {
            next = null;
        }
        query.movedBefore && query.movedBefore(doc._id, next);
    }
};
LocalCollection._updateInResultsAsync = (query, doc, old_doc)=>_async_to_generator(function*() {
        if (!EJSON.equals(doc._id, old_doc._id)) {
            throw new Error('Can\'t change a doc\'s _id while updating');
        }
        const projectionFn = query.projectionFn;
        const changedFields = DiffSequence.makeChangedFields(projectionFn(doc), projectionFn(old_doc));
        if (!query.ordered) {
            if (Object.keys(changedFields).length) {
                yield query.changed(doc._id, changedFields);
                query.results.set(doc._id, doc);
            }
            return;
        }
        const old_idx = LocalCollection._findInOrderedResults(query, doc);
        if (Object.keys(changedFields).length) {
            yield query.changed(doc._id, changedFields);
        }
        if (!query.sorter) {
            return;
        }
        // just take it out and put it back in again, and see if the index changes
        query.results.splice(old_idx, 1);
        const new_idx = LocalCollection._insertInSortedList(query.sorter.getComparator({
            distances: query.distances
        }), query.results, doc);
        if (old_idx !== new_idx) {
            let next = query.results[new_idx + 1];
            if (next) {
                next = next._id;
            } else {
                next = null;
            }
            query.movedBefore && (yield query.movedBefore(doc._id, next));
        }
    })();
const MODIFIERS = {
    $currentDate (target, field, arg) {
        if (typeof arg === 'object' && hasOwn.call(arg, '$type')) {
            if (arg.$type !== 'date') {
                throw MinimongoError('Minimongo does currently only support the date type in ' + '$currentDate modifiers', {
                    field
                });
            }
        } else if (arg !== true) {
            throw MinimongoError('Invalid $currentDate modifier', {
                field
            });
        }
        target[field] = new Date();
    },
    $inc (target, field, arg) {
        if (typeof arg !== 'number') {
            throw MinimongoError('Modifier $inc allowed for numbers only', {
                field
            });
        }
        if (field in target) {
            if (typeof target[field] !== 'number') {
                throw MinimongoError('Cannot apply $inc modifier to non-number', {
                    field
                });
            }
            target[field] += arg;
        } else {
            target[field] = arg;
        }
    },
    $min (target, field, arg) {
        if (typeof arg !== 'number') {
            throw MinimongoError('Modifier $min allowed for numbers only', {
                field
            });
        }
        if (field in target) {
            if (typeof target[field] !== 'number') {
                throw MinimongoError('Cannot apply $min modifier to non-number', {
                    field
                });
            }
            if (target[field] > arg) {
                target[field] = arg;
            }
        } else {
            target[field] = arg;
        }
    },
    $max (target, field, arg) {
        if (typeof arg !== 'number') {
            throw MinimongoError('Modifier $max allowed for numbers only', {
                field
            });
        }
        if (field in target) {
            if (typeof target[field] !== 'number') {
                throw MinimongoError('Cannot apply $max modifier to non-number', {
                    field
                });
            }
            if (target[field] < arg) {
                target[field] = arg;
            }
        } else {
            target[field] = arg;
        }
    },
    $mul (target, field, arg) {
        if (typeof arg !== 'number') {
            throw MinimongoError('Modifier $mul allowed for numbers only', {
                field
            });
        }
        if (field in target) {
            if (typeof target[field] !== 'number') {
                throw MinimongoError('Cannot apply $mul modifier to non-number', {
                    field
                });
            }
            target[field] *= arg;
        } else {
            target[field] = 0;
        }
    },
    $rename (target, field, arg, keypath, doc) {
        // no idea why mongo has this restriction..
        if (keypath === arg) {
            throw MinimongoError('$rename source must differ from target', {
                field
            });
        }
        if (target === null) {
            throw MinimongoError('$rename source field invalid', {
                field
            });
        }
        if (typeof arg !== 'string') {
            throw MinimongoError('$rename target must be a string', {
                field
            });
        }
        if (arg.includes('\0')) {
            // Null bytes are not allowed in Mongo field names
            // https://docs.mongodb.com/manual/reference/limits/#Restrictions-on-Field-Names
            throw MinimongoError('The \'to\' field for $rename cannot contain an embedded null byte', {
                field
            });
        }
        if (target === undefined) {
            return;
        }
        const object = target[field];
        delete target[field];
        const keyparts = arg.split('.');
        const target2 = findModTarget(doc, keyparts, {
            forbidArray: true
        });
        if (target2 === null) {
            throw MinimongoError('$rename target field invalid', {
                field
            });
        }
        target2[keyparts.pop()] = object;
    },
    $set (target, field, arg) {
        if (target !== Object(target)) {
            const error = MinimongoError('Cannot set property on non-object field', {
                field
            });
            error.setPropertyError = true;
            throw error;
        }
        if (target === null) {
            const error = MinimongoError('Cannot set property on null', {
                field
            });
            error.setPropertyError = true;
            throw error;
        }
        assertHasValidFieldNames(arg);
        target[field] = arg;
    },
    $setOnInsert (target, field, arg) {
    // converted to `$set` in `_modify`
    },
    $unset (target, field, arg) {
        if (target !== undefined) {
            if (target instanceof Array) {
                if (field in target) {
                    target[field] = null;
                }
            } else {
                delete target[field];
            }
        }
    },
    $push (target, field, arg) {
        if (target[field] === undefined) {
            target[field] = [];
        }
        if (!(target[field] instanceof Array)) {
            throw MinimongoError('Cannot apply $push modifier to non-array', {
                field
            });
        }
        if (!(arg && arg.$each)) {
            // Simple mode: not $each
            assertHasValidFieldNames(arg);
            target[field].push(arg);
            return;
        }
        // Fancy mode: $each (and maybe $slice and $sort and $position)
        const toPush = arg.$each;
        if (!(toPush instanceof Array)) {
            throw MinimongoError('$each must be an array', {
                field
            });
        }
        assertHasValidFieldNames(toPush);
        // Parse $position
        let position = undefined;
        if ('$position' in arg) {
            if (typeof arg.$position !== 'number') {
                throw MinimongoError('$position must be a numeric value', {
                    field
                });
            }
            // XXX should check to make sure integer
            if (arg.$position < 0) {
                throw MinimongoError('$position in $push must be zero or positive', {
                    field
                });
            }
            position = arg.$position;
        }
        // Parse $slice.
        let slice = undefined;
        if ('$slice' in arg) {
            if (typeof arg.$slice !== 'number') {
                throw MinimongoError('$slice must be a numeric value', {
                    field
                });
            }
            // XXX should check to make sure integer
            slice = arg.$slice;
        }
        // Parse $sort.
        let sortFunction = undefined;
        if (arg.$sort) {
            if (slice === undefined) {
                throw MinimongoError('$sort requires $slice to be present', {
                    field
                });
            }
            // XXX this allows us to use a $sort whose value is an array, but that's
            // actually an extension of the Node driver, so it won't work
            // server-side. Could be confusing!
            // XXX is it correct that we don't do geo-stuff here?
            sortFunction = new Minimongo.Sorter(arg.$sort).getComparator();
            toPush.forEach((element)=>{
                if (LocalCollection._f._type(element) !== 3) {
                    throw MinimongoError('$push like modifiers using $sort require all elements to be ' + 'objects', {
                        field
                    });
                }
            });
        }
        // Actually push.
        if (position === undefined) {
            toPush.forEach((element)=>{
                target[field].push(element);
            });
        } else {
            const spliceArguments = [
                position,
                0
            ];
            toPush.forEach((element)=>{
                spliceArguments.push(element);
            });
            target[field].splice(...spliceArguments);
        }
        // Actually sort.
        if (sortFunction) {
            target[field].sort(sortFunction);
        }
        // Actually slice.
        if (slice !== undefined) {
            if (slice === 0) {
                target[field] = []; // differs from Array.slice!
            } else if (slice < 0) {
                target[field] = target[field].slice(slice);
            } else {
                target[field] = target[field].slice(0, slice);
            }
        }
    },
    $pushAll (target, field, arg) {
        if (!(typeof arg === 'object' && arg instanceof Array)) {
            throw MinimongoError('Modifier $pushAll/pullAll allowed for arrays only');
        }
        assertHasValidFieldNames(arg);
        const toPush = target[field];
        if (toPush === undefined) {
            target[field] = arg;
        } else if (!(toPush instanceof Array)) {
            throw MinimongoError('Cannot apply $pushAll modifier to non-array', {
                field
            });
        } else {
            toPush.push(...arg);
        }
    },
    $addToSet (target, field, arg) {
        let isEach = false;
        if (typeof arg === 'object') {
            // check if first key is '$each'
            const keys = Object.keys(arg);
            if (keys[0] === '$each') {
                isEach = true;
            }
        }
        const values = isEach ? arg.$each : [
            arg
        ];
        assertHasValidFieldNames(values);
        const toAdd = target[field];
        if (toAdd === undefined) {
            target[field] = values;
        } else if (!(toAdd instanceof Array)) {
            throw MinimongoError('Cannot apply $addToSet modifier to non-array', {
                field
            });
        } else {
            values.forEach((value)=>{
                if (toAdd.some((element)=>LocalCollection._f._equal(value, element))) {
                    return;
                }
                toAdd.push(value);
            });
        }
    },
    $pop (target, field, arg) {
        if (target === undefined) {
            return;
        }
        const toPop = target[field];
        if (toPop === undefined) {
            return;
        }
        if (!(toPop instanceof Array)) {
            throw MinimongoError('Cannot apply $pop modifier to non-array', {
                field
            });
        }
        if (typeof arg === 'number' && arg < 0) {
            toPop.splice(0, 1);
        } else {
            toPop.pop();
        }
    },
    $pull (target, field, arg) {
        if (target === undefined) {
            return;
        }
        const toPull = target[field];
        if (toPull === undefined) {
            return;
        }
        if (!(toPull instanceof Array)) {
            throw MinimongoError('Cannot apply $pull/pullAll modifier to non-array', {
                field
            });
        }
        let out;
        if (arg != null && typeof arg === 'object' && !(arg instanceof Array)) {
            // XXX would be much nicer to compile this once, rather than
            // for each document we modify.. but usually we're not
            // modifying that many documents, so we'll let it slide for
            // now
            // XXX Minimongo.Matcher isn't up for the job, because we need
            // to permit stuff like {$pull: {a: {$gt: 4}}}.. something
            // like {$gt: 4} is not normally a complete selector.
            // same issue as $elemMatch possibly?
            const matcher = new Minimongo.Matcher(arg);
            out = toPull.filter((element)=>!matcher.documentMatches(element).result);
        } else {
            out = toPull.filter((element)=>!LocalCollection._f._equal(element, arg));
        }
        target[field] = out;
    },
    $pullAll (target, field, arg) {
        if (!(typeof arg === 'object' && arg instanceof Array)) {
            throw MinimongoError('Modifier $pushAll/pullAll allowed for arrays only', {
                field
            });
        }
        if (target === undefined) {
            return;
        }
        const toPull = target[field];
        if (toPull === undefined) {
            return;
        }
        if (!(toPull instanceof Array)) {
            throw MinimongoError('Cannot apply $pull/pullAll modifier to non-array', {
                field
            });
        }
        target[field] = toPull.filter((object)=>!arg.some((element)=>LocalCollection._f._equal(object, element)));
    },
    $bit (target, field, arg) {
        // XXX mongo only supports $bit on integers, and we only support
        // native javascript numbers (doubles) so far, so we can't support $bit
        throw MinimongoError('$bit is not supported', {
            field
        });
    },
    $v () {
    // As discussed in https://github.com/meteor/meteor/issues/9623,
    // the `$v` operator is not needed by Meteor, but problems can occur if
    // it's not at least callable (as of Mongo >= 3.6). It's defined here as
    // a no-op to work around these problems.
    }
};
const NO_CREATE_MODIFIERS = {
    $pop: true,
    $pull: true,
    $pullAll: true,
    $rename: true,
    $unset: true
};
// Make sure field names do not contain Mongo restricted
// characters ('.', '$', '\0').
// https://docs.mongodb.com/manual/reference/limits/#Restrictions-on-Field-Names
const invalidCharMsg = {
    $: 'start with \'$\'',
    '.': 'contain \'.\'',
    '\0': 'contain null bytes'
};
// checks if all field names in an object are valid
function assertHasValidFieldNames(doc) {
    if (doc && typeof doc === 'object') {
        JSON.stringify(doc, (key, value)=>{
            assertIsValidFieldName(key);
            return value;
        });
    }
}
function assertIsValidFieldName(key) {
    let match;
    if (typeof key === 'string' && (match = key.match(/^\$|\.|\0/))) {
        throw MinimongoError(`Key ${key} must not ${invalidCharMsg[match[0]]}`);
    }
}
// for a.b.c.2.d.e, keyparts should be ['a', 'b', 'c', '2', 'd', 'e'],
// and then you would operate on the 'e' property of the returned
// object.
//
// if options.noCreate is falsey, creates intermediate levels of
// structure as necessary, like mkdir -p (and raises an exception if
// that would mean giving a non-numeric property to an array.) if
// options.noCreate is true, return undefined instead.
//
// may modify the last element of keyparts to signal to the caller that it needs
// to use a different value to index into the returned object (for example,
// ['a', '01'] -> ['a', 1]).
//
// if forbidArray is true, return null if the keypath goes through an array.
//
// if options.arrayIndices is set, use its first element for the (first) '$' in
// the path.
function findModTarget(doc, keyparts, options = {}) {
    let usedArrayIndex = false;
    for(let i = 0; i < keyparts.length; i++){
        const last = i === keyparts.length - 1;
        let keypart = keyparts[i];
        if (!isIndexable(doc)) {
            if (options.noCreate) {
                return undefined;
            }
            const error = MinimongoError(`cannot use the part '${keypart}' to traverse ${doc}`);
            error.setPropertyError = true;
            throw error;
        }
        if (doc instanceof Array) {
            if (options.forbidArray) {
                return null;
            }
            if (keypart === '$') {
                if (usedArrayIndex) {
                    throw MinimongoError('Too many positional (i.e. \'$\') elements');
                }
                if (!options.arrayIndices || !options.arrayIndices.length) {
                    throw MinimongoError('The positional operator did not find the match needed from the ' + 'query');
                }
                keypart = options.arrayIndices[0];
                usedArrayIndex = true;
            } else if (isNumericKey(keypart)) {
                keypart = parseInt(keypart);
            } else {
                if (options.noCreate) {
                    return undefined;
                }
                throw MinimongoError(`can't append to array using string field name [${keypart}]`);
            }
            if (last) {
                keyparts[i] = keypart; // handle 'a.01'
            }
            if (options.noCreate && keypart >= doc.length) {
                return undefined;
            }
            while(doc.length < keypart){
                doc.push(null);
            }
            if (!last) {
                if (doc.length === keypart) {
                    doc.push({});
                } else if (typeof doc[keypart] !== 'object') {
                    throw MinimongoError(`can't modify field '${keyparts[i + 1]}' of list value ` + JSON.stringify(doc[keypart]));
                }
            }
        } else {
            assertIsValidFieldName(keypart);
            if (!(keypart in doc)) {
                if (options.noCreate) {
                    return undefined;
                }
                if (!last) {
                    doc[keypart] = {};
                }
            }
        }
        if (last) {
            return doc;
        }
        doc = doc[keypart];
    }
// notreached
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"matcher.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/matcher.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({default:()=>Matcher});let LocalCollection;module.link('./local_collection.js',{default(v){LocalCollection=v}},0);let compileDocumentSelector,hasOwn,nothingMatcher;module.link('./common.js',{compileDocumentSelector(v){compileDocumentSelector=v},hasOwn(v){hasOwn=v},nothingMatcher(v){nothingMatcher=v}},1);var _Package_mongodecimal;


const Decimal = ((_Package_mongodecimal = Package['mongo-decimal']) === null || _Package_mongodecimal === void 0 ? void 0 : _Package_mongodecimal.Decimal) || class DecimalStub {
};
class Matcher {
    documentMatches(doc) {
        if (doc !== Object(doc)) {
            throw Error('documentMatches needs a document');
        }
        return this._docMatcher(doc);
    }
    hasGeoQuery() {
        return this._hasGeoQuery;
    }
    hasWhere() {
        return this._hasWhere;
    }
    isSimple() {
        return this._isSimple;
    }
    // Given a selector, return a function that takes one argument, a
    // document. It returns a result object.
    _compileSelector(selector) {
        // you can pass a literal function instead of a selector
        if (selector instanceof Function) {
            this._isSimple = false;
            this._selector = selector;
            this._recordPathUsed('');
            return (doc)=>({
                    result: !!selector.call(doc)
                });
        }
        // shorthand -- scalar _id
        if (LocalCollection._selectorIsId(selector)) {
            this._selector = {
                _id: selector
            };
            this._recordPathUsed('_id');
            return (doc)=>({
                    result: EJSON.equals(doc._id, selector)
                });
        }
        // protect against dangerous selectors.  falsey and {_id: falsey} are both
        // likely programmer error, and not what you want, particularly for
        // destructive operations.
        if (!selector || hasOwn.call(selector, '_id') && !selector._id) {
            this._isSimple = false;
            return nothingMatcher;
        }
        // Top level can't be an array or true or binary.
        if (Array.isArray(selector) || EJSON.isBinary(selector) || typeof selector === 'boolean') {
            throw new Error(`Invalid selector: ${selector}`);
        }
        this._selector = EJSON.clone(selector);
        return compileDocumentSelector(selector, this, {
            isRoot: true
        });
    }
    // Returns a list of key paths the given selector is looking for. It includes
    // the empty string if there is a $where.
    _getPaths() {
        return Object.keys(this._paths);
    }
    _recordPathUsed(path) {
        this._paths[path] = true;
    }
    constructor(selector, isUpdate){
        // A set (object mapping string -> *) of all of the document paths looked
        // at by the selector. Also includes the empty string if it may look at any
        // path (eg, $where).
        this._paths = {};
        // Set to true if compilation finds a $near.
        this._hasGeoQuery = false;
        // Set to true if compilation finds a $where.
        this._hasWhere = false;
        // Set to false if compilation finds anything other than a simple equality
        // or one or more of '$gt', '$gte', '$lt', '$lte', '$ne', '$in', '$nin' used
        // with scalars as operands.
        this._isSimple = true;
        // Set to a dummy document which always matches this Matcher. Or set to null
        // if such document is too hard to find.
        this._matchingDocument = undefined;
        // A clone of the original selector. It may just be a function if the user
        // passed in a function; otherwise is definitely an object (eg, IDs are
        // translated into {_id: ID} first. Used by canBecomeTrueByModifier and
        // Sorter._useWithMatcher.
        this._selector = null;
        this._docMatcher = this._compileSelector(selector);
        // Set to true if selection is done for an update operation
        // Default is false
        // Used for $near array update (issue #3599)
        this._isUpdate = isUpdate;
    }
}
// The minimongo selector compiler!
// Terminology:
//  - a 'selector' is the EJSON object representing a selector
//  - a 'matcher' is its compiled form (whether a full Minimongo.Matcher
//    object or one of the component lambdas that matches parts of it)
//  - a 'result object' is an object with a 'result' field and maybe
//    distance and arrayIndices.
//  - a 'branched value' is an object with a 'value' field and maybe
//    'dontIterate' and 'arrayIndices'.
//  - a 'document' is a top-level object that can be stored in a collection.
//  - a 'lookup function' is a function that takes in a document and returns
//    an array of 'branched values'.
//  - a 'branched matcher' maps from an array of branched values to a result
//    object.
//  - an 'element matcher' maps from a single value to a bool.
// Main entry point.
//   var matcher = new Minimongo.Matcher({a: {$gt: 5}});
//   if (matcher.documentMatches({a: 7})) ...

// helpers used by compiled selector code
LocalCollection._f = {
    // XXX for _all and _in, consider building 'inquery' at compile time..
    _type (v) {
        if (typeof v === 'number') {
            return 1;
        }
        if (typeof v === 'string') {
            return 2;
        }
        if (typeof v === 'boolean') {
            return 8;
        }
        if (Array.isArray(v)) {
            return 4;
        }
        if (v === null) {
            return 10;
        }
        // note that typeof(/x/) === "object"
        if (v instanceof RegExp) {
            return 11;
        }
        if (typeof v === 'function') {
            return 13;
        }
        if (v instanceof Date) {
            return 9;
        }
        if (EJSON.isBinary(v)) {
            return 5;
        }
        if (v instanceof MongoID.ObjectID) {
            return 7;
        }
        if (v instanceof Decimal) {
            return 1;
        }
        // object
        return 3;
    // XXX support some/all of these:
    // 14, symbol
    // 15, javascript code with scope
    // 16, 18: 32-bit/64-bit integer
    // 17, timestamp
    // 255, minkey
    // 127, maxkey
    },
    // deep equality test: use for literal document and array matches
    _equal (a, b) {
        return EJSON.equals(a, b, {
            keyOrderSensitive: true
        });
    },
    // maps a type code to a value that can be used to sort values of different
    // types
    _typeorder (t) {
        // http://www.mongodb.org/display/DOCS/What+is+the+Compare+Order+for+BSON+Types
        // XXX what is the correct sort position for Javascript code?
        // ('100' in the matrix below)
        // XXX minkey/maxkey
        return [
            -1,
            1,
            2,
            3,
            4,
            5,
            -1,
            6,
            7,
            8,
            0,
            9,
            -1,
            100,
            2,
            100,
            1,
            8,
            1 // 64-bit int
        ][t];
    },
    // compare two values of unknown type according to BSON ordering
    // semantics. (as an extension, consider 'undefined' to be less than
    // any other value.) return negative if a is less, positive if b is
    // less, or 0 if equal
    _cmp (a, b) {
        if (a === undefined) {
            return b === undefined ? 0 : -1;
        }
        if (b === undefined) {
            return 1;
        }
        let ta = LocalCollection._f._type(a);
        let tb = LocalCollection._f._type(b);
        const oa = LocalCollection._f._typeorder(ta);
        const ob = LocalCollection._f._typeorder(tb);
        if (oa !== ob) {
            return oa < ob ? -1 : 1;
        }
        // XXX need to implement this if we implement Symbol or integers, or
        // Timestamp
        if (ta !== tb) {
            throw Error('Missing type coercion logic in _cmp');
        }
        if (ta === 7) {
            // Convert to string.
            ta = tb = 2;
            a = a.toHexString();
            b = b.toHexString();
        }
        if (ta === 9) {
            // Convert to millis.
            ta = tb = 1;
            a = isNaN(a) ? 0 : a.getTime();
            b = isNaN(b) ? 0 : b.getTime();
        }
        if (ta === 1) {
            if (a instanceof Decimal) {
                return a.minus(b).toNumber();
            } else {
                return a - b;
            }
        }
        if (tb === 2) return a < b ? -1 : a === b ? 0 : 1;
        if (ta === 3) {
            // this could be much more efficient in the expected case ...
            const toArray = (object)=>{
                const result = [];
                Object.keys(object).forEach((key)=>{
                    result.push(key, object[key]);
                });
                return result;
            };
            return LocalCollection._f._cmp(toArray(a), toArray(b));
        }
        if (ta === 4) {
            for(let i = 0;; i++){
                if (i === a.length) {
                    return i === b.length ? 0 : -1;
                }
                if (i === b.length) {
                    return 1;
                }
                const s = LocalCollection._f._cmp(a[i], b[i]);
                if (s !== 0) {
                    return s;
                }
            }
        }
        if (ta === 5) {
            // Surprisingly, a small binary blob is always less than a large one in
            // Mongo.
            if (a.length !== b.length) {
                return a.length - b.length;
            }
            for(let i = 0; i < a.length; i++){
                if (a[i] < b[i]) {
                    return -1;
                }
                if (a[i] > b[i]) {
                    return 1;
                }
            }
            return 0;
        }
        if (ta === 8) {
            if (a) {
                return b ? 0 : 1;
            }
            return b ? -1 : 0;
        }
        if (ta === 10) return 0;
        if (ta === 11) throw Error('Sorting not supported on regular expression'); // XXX
        // 13: javascript code
        // 14: symbol
        // 15: javascript code with scope
        // 16: 32-bit integer
        // 17: timestamp
        // 18: 64-bit integer
        // 255: minkey
        // 127: maxkey
        if (ta === 13) throw Error('Sorting not supported on Javascript code'); // XXX
        throw Error('Unknown type to sort');
    }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"minimongo_common.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/minimongo_common.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LocalCollection_;module.link('./local_collection.js',{default(v){LocalCollection_=v}},0);let Matcher;module.link('./matcher.js',{default(v){Matcher=v}},1);let Sorter;module.link('./sorter.js',{default(v){Sorter=v}},2);


LocalCollection = LocalCollection_;
Minimongo = {
    LocalCollection: LocalCollection_,
    Matcher,
    Sorter
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"observe_handle.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/observe_handle.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({default:()=>ObserveHandle});// ObserveHandle: the return value of a live query.
class ObserveHandle {
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sorter.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/sorter.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({default:()=>Sorter});let ELEMENT_OPERATORS,equalityElementMatcher,expandArraysInBranches,hasOwn,isOperatorObject,makeLookupFunction,regexpElementMatcher;module.link('./common.js',{ELEMENT_OPERATORS(v){ELEMENT_OPERATORS=v},equalityElementMatcher(v){equalityElementMatcher=v},expandArraysInBranches(v){expandArraysInBranches=v},hasOwn(v){hasOwn=v},isOperatorObject(v){isOperatorObject=v},makeLookupFunction(v){makeLookupFunction=v},regexpElementMatcher(v){regexpElementMatcher=v}},0);
class Sorter {
    getComparator(options) {
        // If sort is specified or have no distances, just use the comparator from
        // the source specification (which defaults to "everything is equal".
        // issue #3599
        // https://docs.mongodb.com/manual/reference/operator/query/near/#sort-operation
        // sort effectively overrides $near
        if (this._sortSpecParts.length || !options || !options.distances) {
            return this._getBaseComparator();
        }
        const distances = options.distances;
        // Return a comparator which compares using $near distances.
        return (a, b)=>{
            if (!distances.has(a._id)) {
                throw Error(`Missing distance for ${a._id}`);
            }
            if (!distances.has(b._id)) {
                throw Error(`Missing distance for ${b._id}`);
            }
            return distances.get(a._id) - distances.get(b._id);
        };
    }
    // Takes in two keys: arrays whose lengths match the number of spec
    // parts. Returns negative, 0, or positive based on using the sort spec to
    // compare fields.
    _compareKeys(key1, key2) {
        if (key1.length !== this._sortSpecParts.length || key2.length !== this._sortSpecParts.length) {
            throw Error('Key has wrong length');
        }
        return this._keyComparator(key1, key2);
    }
    // Iterates over each possible "key" from doc (ie, over each branch), calling
    // 'cb' with the key.
    _generateKeysFromDoc(doc, cb) {
        if (this._sortSpecParts.length === 0) {
            throw new Error('can\'t generate keys without a spec');
        }
        const pathFromIndices = (indices)=>`${indices.join(',')},`;
        let knownPaths = null;
        // maps index -> ({'' -> value} or {path -> value})
        const valuesByIndexAndPath = this._sortSpecParts.map((spec)=>{
            // Expand any leaf arrays that we find, and ignore those arrays
            // themselves.  (We never sort based on an array itself.)
            let branches = expandArraysInBranches(spec.lookup(doc), true);
            // If there are no values for a key (eg, key goes to an empty array),
            // pretend we found one undefined value.
            if (!branches.length) {
                branches = [
                    {
                        value: void 0
                    }
                ];
            }
            const element = Object.create(null);
            let usedPaths = false;
            branches.forEach((branch)=>{
                if (!branch.arrayIndices) {
                    // If there are no array indices for a branch, then it must be the
                    // only branch, because the only thing that produces multiple branches
                    // is the use of arrays.
                    if (branches.length > 1) {
                        throw Error('multiple branches but no array used?');
                    }
                    element[''] = branch.value;
                    return;
                }
                usedPaths = true;
                const path = pathFromIndices(branch.arrayIndices);
                if (hasOwn.call(element, path)) {
                    throw Error(`duplicate path: ${path}`);
                }
                element[path] = branch.value;
                // If two sort fields both go into arrays, they have to go into the
                // exact same arrays and we have to find the same paths.  This is
                // roughly the same condition that makes MongoDB throw this strange
                // error message.  eg, the main thing is that if sort spec is {a: 1,
                // b:1} then a and b cannot both be arrays.
                //
                // (In MongoDB it seems to be OK to have {a: 1, 'a.x.y': 1} where 'a'
                // and 'a.x.y' are both arrays, but we don't allow this for now.
                // #NestedArraySort
                // XXX achieve full compatibility here
                if (knownPaths && !hasOwn.call(knownPaths, path)) {
                    throw Error('cannot index parallel arrays');
                }
            });
            if (knownPaths) {
                // Similarly to above, paths must match everywhere, unless this is a
                // non-array field.
                if (!hasOwn.call(element, '') && Object.keys(knownPaths).length !== Object.keys(element).length) {
                    throw Error('cannot index parallel arrays!');
                }
            } else if (usedPaths) {
                knownPaths = {};
                Object.keys(element).forEach((path)=>{
                    knownPaths[path] = true;
                });
            }
            return element;
        });
        if (!knownPaths) {
            // Easy case: no use of arrays.
            const soleKey = valuesByIndexAndPath.map((values)=>{
                if (!hasOwn.call(values, '')) {
                    throw Error('no value in sole key case?');
                }
                return values[''];
            });
            cb(soleKey);
            return;
        }
        Object.keys(knownPaths).forEach((path)=>{
            const key = valuesByIndexAndPath.map((values)=>{
                if (hasOwn.call(values, '')) {
                    return values[''];
                }
                if (!hasOwn.call(values, path)) {
                    throw Error('missing path?');
                }
                return values[path];
            });
            cb(key);
        });
    }
    // Returns a comparator that represents the sort specification (but not
    // including a possible geoquery distance tie-breaker).
    _getBaseComparator() {
        if (this._sortFunction) {
            return this._sortFunction;
        }
        // If we're only sorting on geoquery distance and no specs, just say
        // everything is equal.
        if (!this._sortSpecParts.length) {
            return (doc1, doc2)=>0;
        }
        return (doc1, doc2)=>{
            const key1 = this._getMinKeyFromDoc(doc1);
            const key2 = this._getMinKeyFromDoc(doc2);
            return this._compareKeys(key1, key2);
        };
    }
    // Finds the minimum key from the doc, according to the sort specs.  (We say
    // "minimum" here but this is with respect to the sort spec, so "descending"
    // sort fields mean we're finding the max for that field.)
    //
    // Note that this is NOT "find the minimum value of the first field, the
    // minimum value of the second field, etc"... it's "choose the
    // lexicographically minimum value of the key vector, allowing only keys which
    // you can find along the same paths".  ie, for a doc {a: [{x: 0, y: 5}, {x:
    // 1, y: 3}]} with sort spec {'a.x': 1, 'a.y': 1}, the only keys are [0,5] and
    // [1,3], and the minimum key is [0,5]; notably, [0,3] is NOT a key.
    _getMinKeyFromDoc(doc) {
        let minKey = null;
        this._generateKeysFromDoc(doc, (key)=>{
            if (minKey === null) {
                minKey = key;
                return;
            }
            if (this._compareKeys(key, minKey) < 0) {
                minKey = key;
            }
        });
        return minKey;
    }
    _getPaths() {
        return this._sortSpecParts.map((part)=>part.path);
    }
    // Given an index 'i', returns a comparator that compares two key arrays based
    // on field 'i'.
    _keyFieldComparator(i) {
        const invert = !this._sortSpecParts[i].ascending;
        return (key1, key2)=>{
            const compare = LocalCollection._f._cmp(key1[i], key2[i]);
            return invert ? -compare : compare;
        };
    }
    constructor(spec){
        this._sortSpecParts = [];
        this._sortFunction = null;
        const addSpecPart = (path, ascending)=>{
            if (!path) {
                throw Error('sort keys must be non-empty');
            }
            if (path.charAt(0) === '$') {
                throw Error(`unsupported sort key: ${path}`);
            }
            this._sortSpecParts.push({
                ascending,
                lookup: makeLookupFunction(path, {
                    forSort: true
                }),
                path
            });
        };
        if (spec instanceof Array) {
            spec.forEach((element)=>{
                if (typeof element === 'string') {
                    addSpecPart(element, true);
                } else {
                    addSpecPart(element[0], element[1] !== 'desc');
                }
            });
        } else if (typeof spec === 'object') {
            Object.keys(spec).forEach((key)=>{
                addSpecPart(key, spec[key] >= 0);
            });
        } else if (typeof spec === 'function') {
            this._sortFunction = spec;
        } else {
            throw Error(`Bad sort specification: ${JSON.stringify(spec)}`);
        }
        // If a function is specified for sorting, we skip the rest.
        if (this._sortFunction) {
            return;
        }
        // To implement affectedByModifier, we piggy-back on top of Matcher's
        // affectedByModifier code; we create a selector that is affected by the
        // same modifiers as this sort order. This is only implemented on the
        // server.
        if (this.affectedByModifier) {
            const selector = {};
            this._sortSpecParts.forEach((spec)=>{
                selector[spec.path] = 1;
            });
            this._selectorForAffectedByModifier = new Minimongo.Matcher(selector);
        }
        this._keyComparator = composeComparators(this._sortSpecParts.map((spec, i)=>this._keyFieldComparator(i)));
    }
}
// Give a sort spec, which can be in any of these forms:
//   {"key1": 1, "key2": -1}
//   [["key1", "asc"], ["key2", "desc"]]
//   ["key1", ["key2", "desc"]]
//
// (.. with the first form being dependent on the key enumeration
// behavior of your javascript VM, which usually does what you mean in
// this case if the key names don't look like integers ..)
//
// return a function that takes two objects, and returns -1 if the
// first object comes first in order, 1 if the second object comes
// first, or 0 if neither object comes before the other.

// Given an array of comparators
// (functions (a,b)->(negative or positive or zero)), returns a single
// comparator which uses each comparator in order and returns the first
// non-zero value.
function composeComparators(comparatorArray) {
    return (a, b)=>{
        for(let i = 0; i < comparatorArray.length; ++i){
            const compare = comparatorArray[i](a, b);
            if (compare !== 0) {
                return compare;
            }
        }
        return 0;
    };
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});


/* Exports */
return {
  export: function () { return {
      LocalCollection: LocalCollection,
      Minimongo: Minimongo,
      MinimongoTest: MinimongoTest,
      MinimongoError: MinimongoError
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/minimongo/minimongo_server.js"
  ],
  mainModulePath: "/node_modules/meteor/minimongo/minimongo_server.js"
}});

//# sourceURL=meteor://💻app/packages/minimongo.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWluaW1vbmdvL21pbmltb25nb19zZXJ2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9jb21tb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9jb25zdGFudHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9jdXJzb3IuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9sb2NhbF9jb2xsZWN0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9taW5pbW9uZ28vbWF0Y2hlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWluaW1vbmdvL21pbmltb25nb19jb21tb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9vYnNlcnZlX2hhbmRsZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWluaW1vbmdvL3NvcnRlci5qcyJdLCJuYW1lcyI6WyJNaW5pbW9uZ28iLCJfcGF0aHNFbGlkaW5nTnVtZXJpY0tleXMiLCJwYXRocyIsIm1hcCIsInBhdGgiLCJzcGxpdCIsImZpbHRlciIsInBhcnQiLCJpc051bWVyaWNLZXkiLCJqb2luIiwiTWF0Y2hlciIsInByb3RvdHlwZSIsImFmZmVjdGVkQnlNb2RpZmllciIsIm1vZGlmaWVyIiwiT2JqZWN0IiwiYXNzaWduIiwiJHNldCIsIiR1bnNldCIsIm1lYW5pbmdmdWxQYXRocyIsIl9nZXRQYXRocyIsIm1vZGlmaWVkUGF0aHMiLCJjb25jYXQiLCJrZXlzIiwic29tZSIsIm1vZCIsIm1lYW5pbmdmdWxQYXRoIiwic2VsIiwiaSIsImoiLCJsZW5ndGgiLCJjYW5CZWNvbWVUcnVlQnlNb2RpZmllciIsImlzU2ltcGxlIiwibW9kaWZpZXJQYXRocyIsInBhdGhIYXNOdW1lcmljS2V5cyIsImV4cGVjdGVkU2NhbGFySXNPYmplY3QiLCJfc2VsZWN0b3IiLCJpc09wZXJhdG9yT2JqZWN0IiwibW9kaWZpZXJQYXRoIiwic3RhcnRzV2l0aCIsIm1hdGNoaW5nRG9jdW1lbnQiLCJFSlNPTiIsImNsb25lIiwiTG9jYWxDb2xsZWN0aW9uIiwiX21vZGlmeSIsImVycm9yIiwibmFtZSIsInNldFByb3BlcnR5RXJyb3IiLCJkb2N1bWVudE1hdGNoZXMiLCJyZXN1bHQiLCJjb21iaW5lSW50b1Byb2plY3Rpb24iLCJwcm9qZWN0aW9uIiwic2VsZWN0b3JQYXRocyIsImluY2x1ZGVzIiwiY29tYmluZUltcG9ydGFudFBhdGhzSW50b1Byb2plY3Rpb24iLCJfbWF0Y2hpbmdEb2N1bWVudCIsInVuZGVmaW5lZCIsImZhbGxiYWNrIiwicGF0aHNUb1RyZWUiLCJ2YWx1ZVNlbGVjdG9yIiwiJGVxIiwiJGluIiwibWF0Y2hlciIsInBsYWNlaG9sZGVyIiwiZmluZCIsIm9ubHlDb250YWluc0tleXMiLCJsb3dlckJvdW5kIiwiSW5maW5pdHkiLCJ1cHBlckJvdW5kIiwiZm9yRWFjaCIsIm9wIiwiaGFzT3duIiwiY2FsbCIsIm1pZGRsZSIsIngiLCJTb3J0ZXIiLCJfc2VsZWN0b3JGb3JBZmZlY3RlZEJ5TW9kaWZpZXIiLCJkZXRhaWxzIiwicHJvamVjdGlvbkRldGFpbHMiLCJ0cmVlIiwibm9kZSIsImZ1bGxQYXRoIiwibWVyZ2VkUHJvamVjdGlvbiIsInRyZWVUb1BhdGhzIiwiaW5jbHVkaW5nIiwibWVyZ2VkRXhjbFByb2plY3Rpb24iLCJnZXRQYXRocyIsInNlbGVjdG9yIiwiX3BhdGhzIiwib2JqIiwiZXZlcnkiLCJrIiwicHJlZml4Iiwia2V5IiwidmFsdWUiLCJoYXNPd25Qcm9wZXJ0eSIsIk1pbmlNb25nb1F1ZXJ5RXJyb3IiLCJFcnJvciIsIkVMRU1FTlRfT1BFUkFUT1JTIiwiJGx0IiwibWFrZUluZXF1YWxpdHkiLCJjbXBWYWx1ZSIsIiRndCIsIiRsdGUiLCIkZ3RlIiwiJG1vZCIsImNvbXBpbGVFbGVtZW50U2VsZWN0b3IiLCJvcGVyYW5kIiwiQXJyYXkiLCJpc0FycmF5IiwiZGl2aXNvciIsInJlbWFpbmRlciIsImVsZW1lbnRNYXRjaGVycyIsIm9wdGlvbiIsIlJlZ0V4cCIsInJlZ2V4cEVsZW1lbnRNYXRjaGVyIiwiZXF1YWxpdHlFbGVtZW50TWF0Y2hlciIsIiRzaXplIiwiZG9udEV4cGFuZExlYWZBcnJheXMiLCIkdHlwZSIsImRvbnRJbmNsdWRlTGVhZkFycmF5cyIsIm9wZXJhbmRBbGlhc01hcCIsIl9mIiwiX3R5cGUiLCIkYml0c0FsbFNldCIsIm1hc2siLCJnZXRPcGVyYW5kQml0bWFzayIsImJpdG1hc2siLCJnZXRWYWx1ZUJpdG1hc2siLCJieXRlIiwiJGJpdHNBbnlTZXQiLCIkYml0c0FsbENsZWFyIiwiJGJpdHNBbnlDbGVhciIsIiRyZWdleCIsInJlZ2V4cCIsIiRvcHRpb25zIiwidGVzdCIsInNvdXJjZSIsIiRlbGVtTWF0Y2giLCJfaXNQbGFpbk9iamVjdCIsImlzRG9jTWF0Y2hlciIsIkxPR0lDQUxfT1BFUkFUT1JTIiwicmVkdWNlIiwiYSIsImIiLCJzdWJNYXRjaGVyIiwiY29tcGlsZURvY3VtZW50U2VsZWN0b3IiLCJpbkVsZW1NYXRjaCIsImNvbXBpbGVWYWx1ZVNlbGVjdG9yIiwiYXJyYXlFbGVtZW50IiwiYXJnIiwiaXNJbmRleGFibGUiLCJkb250SXRlcmF0ZSIsIiRhbmQiLCJzdWJTZWxlY3RvciIsImFuZERvY3VtZW50TWF0Y2hlcnMiLCJjb21waWxlQXJyYXlPZkRvY3VtZW50U2VsZWN0b3JzIiwiJG9yIiwibWF0Y2hlcnMiLCJkb2MiLCJmbiIsIiRub3IiLCIkd2hlcmUiLCJzZWxlY3RvclZhbHVlIiwiX3JlY29yZFBhdGhVc2VkIiwiX2hhc1doZXJlIiwiRnVuY3Rpb24iLCIkY29tbWVudCIsIlZBTFVFX09QRVJBVE9SUyIsImNvbnZlcnRFbGVtZW50TWF0Y2hlclRvQnJhbmNoZWRNYXRjaGVyIiwiJG5vdCIsImludmVydEJyYW5jaGVkTWF0Y2hlciIsIiRuZSIsIiRuaW4iLCIkZXhpc3RzIiwiZXhpc3RzIiwiZXZlcnl0aGluZ01hdGNoZXIiLCIkbWF4RGlzdGFuY2UiLCIkbmVhciIsIiRhbGwiLCJub3RoaW5nTWF0Y2hlciIsImJyYW5jaGVkTWF0Y2hlcnMiLCJjcml0ZXJpb24iLCJhbmRCcmFuY2hlZE1hdGNoZXJzIiwiaXNSb290IiwiX2hhc0dlb1F1ZXJ5IiwibWF4RGlzdGFuY2UiLCJwb2ludCIsImRpc3RhbmNlIiwiJGdlb21ldHJ5IiwidHlwZSIsIkdlb0pTT04iLCJwb2ludERpc3RhbmNlIiwiY29vcmRpbmF0ZXMiLCJwb2ludFRvQXJyYXkiLCJnZW9tZXRyeVdpdGhpblJhZGl1cyIsImRpc3RhbmNlQ29vcmRpbmF0ZVBhaXJzIiwiYnJhbmNoZWRWYWx1ZXMiLCJleHBhbmRBcnJheXNJbkJyYW5jaGVzIiwiYnJhbmNoIiwiY3VyRGlzdGFuY2UiLCJfaXNVcGRhdGUiLCJhcnJheUluZGljZXMiLCJhbmRTb21lTWF0Y2hlcnMiLCJzdWJNYXRjaGVycyIsImRvY09yQnJhbmNoZXMiLCJtYXRjaCIsInN1YlJlc3VsdCIsInNlbGVjdG9ycyIsImRvY1NlbGVjdG9yIiwib3B0aW9ucyIsImRvY01hdGNoZXJzIiwic3Vic3RyIiwiX2lzU2ltcGxlIiwibG9va1VwQnlJbmRleCIsIm1ha2VMb29rdXBGdW5jdGlvbiIsInZhbHVlTWF0Y2hlciIsIkJvb2xlYW4iLCJvcGVyYXRvckJyYW5jaGVkTWF0Y2hlciIsImVsZW1lbnRNYXRjaGVyIiwiYnJhbmNoZXMiLCJleHBhbmRlZCIsImVsZW1lbnQiLCJtYXRjaGVkIiwicG9pbnRBIiwicG9pbnRCIiwiTWF0aCIsImh5cG90IiwiZWxlbWVudFNlbGVjdG9yIiwiX2VxdWFsIiwiZG9jT3JCcmFuY2hlZFZhbHVlcyIsInNraXBUaGVBcnJheXMiLCJicmFuY2hlc091dCIsInRoaXNJc0FycmF5IiwicHVzaCIsIk51bWJlciIsImlzSW50ZWdlciIsIlVpbnQ4QXJyYXkiLCJJbnQzMkFycmF5IiwiYnVmZmVyIiwiaXNCaW5hcnkiLCJBcnJheUJ1ZmZlciIsIm1heCIsInZpZXciLCJpc1NhZmVJbnRlZ2VyIiwiVWludDMyQXJyYXkiLCJCWVRFU19QRVJfRUxFTUVOVCIsImluc2VydEludG9Eb2N1bWVudCIsImRvY3VtZW50IiwiZXhpc3RpbmdLZXkiLCJpbmRleE9mIiwiYnJhbmNoZWRNYXRjaGVyIiwiYnJhbmNoVmFsdWVzIiwicyIsImluY29uc2lzdGVudE9LIiwidGhlc2VBcmVPcGVyYXRvcnMiLCJzZWxLZXkiLCJ0aGlzSXNPcGVyYXRvciIsIkpTT04iLCJzdHJpbmdpZnkiLCJjbXBWYWx1ZUNvbXBhcmF0b3IiLCJvcGVyYW5kVHlwZSIsIl9jbXAiLCJwYXJ0cyIsImZpcnN0UGFydCIsImxvb2t1cFJlc3QiLCJzbGljZSIsImJ1aWxkUmVzdWx0IiwiZmlyc3RMZXZlbCIsImFwcGVuZFRvUmVzdWx0IiwibW9yZSIsImZvclNvcnQiLCJhcnJheUluZGV4IiwiTWluaW1vbmdvVGVzdCIsIk1pbmltb25nb0Vycm9yIiwibWVzc2FnZSIsImZpZWxkIiwib3BlcmF0b3JNYXRjaGVycyIsIm9wZXJhdG9yIiwic2ltcGxlUmFuZ2UiLCJzaW1wbGVFcXVhbGl0eSIsInNpbXBsZUluY2x1c2lvbiIsIm5ld0xlYWZGbiIsImNvbmZsaWN0Rm4iLCJyb290IiwicGF0aEFycmF5Iiwic3VjY2VzcyIsImxhc3RLZXkiLCJ5IiwicG9wdWxhdGVEb2N1bWVudFdpdGhLZXlWYWx1ZSIsImdldFByb3RvdHlwZU9mIiwicG9wdWxhdGVEb2N1bWVudFdpdGhPYmplY3QiLCJ1bnByZWZpeGVkS2V5cyIsInZhbGlkYXRlT2JqZWN0Iiwib2JqZWN0IiwicG9wdWxhdGVEb2N1bWVudFdpdGhRdWVyeUZpZWxkcyIsInF1ZXJ5IiwiX3NlbGVjdG9ySXNJZCIsImZpZWxkcyIsImZpZWxkc0tleXMiLCJzb3J0IiwiX2lkIiwia2V5UGF0aCIsInJ1bGUiLCJwcm9qZWN0aW9uUnVsZXNUcmVlIiwiY3VycmVudFBhdGgiLCJhbm90aGVyUGF0aCIsInRvU3RyaW5nIiwibGFzdEluZGV4IiwidmFsaWRhdGVLZXlJblBhdGgiLCJnZXRBc3luY01ldGhvZE5hbWUiLCJtZXRob2QiLCJyZXBsYWNlIiwiQVNZTkNfQ09MTEVDVElPTl9NRVRIT0RTIiwiQVNZTkNfQ1VSU09SX01FVEhPRFMiLCJDTElFTlRfT05MWV9NRVRIT0RTIiwiQ3Vyc29yIiwiY291bnQiLCJyZWFjdGl2ZSIsIl9kZXBlbmQiLCJhZGRlZCIsInJlbW92ZWQiLCJfZ2V0UmF3T2JqZWN0cyIsIm9yZGVyZWQiLCJmZXRjaCIsIlN5bWJvbCIsIml0ZXJhdG9yIiwiYWRkZWRCZWZvcmUiLCJjaGFuZ2VkIiwibW92ZWRCZWZvcmUiLCJpbmRleCIsIm9iamVjdHMiLCJuZXh0IiwiX3Byb2plY3Rpb25GbiIsIl90cmFuc2Zvcm0iLCJkb25lIiwiYXN5bmNJdGVyYXRvciIsInN5bmNSZXN1bHQiLCJQcm9taXNlIiwicmVzb2x2ZSIsImNhbGxiYWNrIiwidGhpc0FyZyIsImdldFRyYW5zZm9ybSIsIm9ic2VydmUiLCJfb2JzZXJ2ZUZyb21PYnNlcnZlQ2hhbmdlcyIsIm9ic2VydmVBc3luYyIsIm9ic2VydmVDaGFuZ2VzIiwiX29ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzQXJlT3JkZXJlZCIsIl9hbGxvd191bm9yZGVyZWQiLCJza2lwIiwibGltaXQiLCJkaXN0YW5jZXMiLCJoYXNHZW9RdWVyeSIsIl9JZE1hcCIsImN1cnNvciIsImRpcnR5IiwicHJvamVjdGlvbkZuIiwicmVzdWx0c1NuYXBzaG90Iiwic29ydGVyIiwicWlkIiwiY29sbGVjdGlvbiIsIm5leHRfcWlkIiwicXVlcmllcyIsInJlc3VsdHMiLCJwYXVzZWQiLCJ3cmFwQ2FsbGJhY2siLCJzZWxmIiwiYXJncyIsImFyZ3VtZW50cyIsIl9vYnNlcnZlUXVldWUiLCJxdWV1ZVRhc2siLCJhcHBseSIsIl9zdXBwcmVzc19pbml0aWFsIiwiaGFuZGxlciIsInNpemUiLCJoYW5kbGUiLCJPYnNlcnZlSGFuZGxlIiwic3RvcCIsImlzUmVhZHkiLCJpc1JlYWR5UHJvbWlzZSIsIlRyYWNrZXIiLCJhY3RpdmUiLCJvbkludmFsaWRhdGUiLCJkcmFpblJlc3VsdCIsImRyYWluIiwidGhlbiIsIm9ic2VydmVDaGFuZ2VzQXN5bmMiLCJjaGFuZ2VycyIsImRlcGVuZGVuY3kiLCJEZXBlbmRlbmN5Iiwibm90aWZ5IiwiYmluZCIsImRlcGVuZCIsIl9nZXRDb2xsZWN0aW9uTmFtZSIsImFwcGx5U2tpcExpbWl0IiwiX3NlbGVjdG9ySWQiLCJzZWxlY3RlZERvYyIsIl9kb2NzIiwiZ2V0Iiwic2V0IiwiY2xlYXIiLCJNZXRlb3IiLCJfcnVuRnJlc2giLCJpZCIsIm1hdGNoUmVzdWx0IiwiZ2V0Q29tcGFyYXRvciIsIl9wdWJsaXNoQ3Vyc29yIiwic3Vic2NyaXB0aW9uIiwiUGFja2FnZSIsIm1vbmdvIiwiTW9uZ28iLCJDb2xsZWN0aW9uIiwiX3NlbGVjdG9ySXNJZFBlcmhhcHNBc09iamVjdCIsIl9jb21waWxlUHJvamVjdGlvbiIsIndyYXBUcmFuc2Zvcm0iLCJ0cmFuc2Zvcm0iLCJhc3luY05hbWUiLCJyZWplY3QiLCJjb3VudERvY3VtZW50cyIsImNvdW50QXN5bmMiLCJlc3RpbWF0ZWREb2N1bWVudENvdW50IiwiZmluZE9uZSIsImZpbmRPbmVBc3luYyIsImZldGNoQXN5bmMiLCJwcmVwYXJlSW5zZXJ0IiwiYXNzZXJ0SGFzVmFsaWRGaWVsZE5hbWVzIiwiX3VzZU9JRCIsIk1vbmdvSUQiLCJPYmplY3RJRCIsIlJhbmRvbSIsImhhcyIsIl9zYXZlT3JpZ2luYWwiLCJpbnNlcnQiLCJxdWVyaWVzVG9SZWNvbXB1dGUiLCJfaW5zZXJ0SW5SZXN1bHRzU3luYyIsIl9yZWNvbXB1dGVSZXN1bHRzIiwiZGVmZXIiLCJpbnNlcnRBc3luYyIsIl9pbnNlcnRJblJlc3VsdHNBc3luYyIsInBhdXNlT2JzZXJ2ZXJzIiwiY2xlYXJSZXN1bHRRdWVyaWVzIiwicHJlcGFyZVJlbW92ZSIsInJlbW92ZSIsIl9lYWNoUG9zc2libHlNYXRjaGluZ0RvY1N5bmMiLCJxdWVyeVJlbW92ZSIsInJlbW92ZUlkIiwicmVtb3ZlRG9jIiwiX3NhdmVkT3JpZ2luYWxzIiwiZXF1YWxzIiwiX3JlbW92ZUZyb21SZXN1bHRzU3luYyIsInJlbW92ZUFzeW5jIiwiX3JlbW92ZUZyb21SZXN1bHRzQXN5bmMiLCJfcmVzdW1lT2JzZXJ2ZXJzIiwiX2RpZmZRdWVyeUNoYW5nZXMiLCJyZXN1bWVPYnNlcnZlcnNTZXJ2ZXIiLCJyZXN1bWVPYnNlcnZlcnNDbGllbnQiLCJyZXRyaWV2ZU9yaWdpbmFscyIsIm9yaWdpbmFscyIsInNhdmVPcmlnaW5hbHMiLCJwcmVwYXJlVXBkYXRlIiwicWlkVG9PcmlnaW5hbFJlc3VsdHMiLCJkb2NNYXAiLCJpZHNNYXRjaGVkIiwiX2lkc01hdGNoZWRCeVNlbGVjdG9yIiwibWVtb2l6ZWRDbG9uZUlmTmVlZGVkIiwiZG9jVG9NZW1vaXplIiwiZmluaXNoVXBkYXRlIiwidXBkYXRlQ291bnQiLCJpbnNlcnRlZElkIiwiX3JldHVybk9iamVjdCIsIm51bWJlckFmZmVjdGVkIiwidXBkYXRlQXN5bmMiLCJyZWNvbXB1dGVRaWRzIiwiX2VhY2hQb3NzaWJseU1hdGNoaW5nRG9jQXN5bmMiLCJxdWVyeVJlc3VsdCIsIl9tb2RpZnlBbmROb3RpZnlBc3luYyIsIm11bHRpIiwidXBzZXJ0IiwiX2NyZWF0ZVVwc2VydERvY3VtZW50IiwidXBkYXRlIiwiX21vZGlmeUFuZE5vdGlmeVN5bmMiLCJ1cHNlcnRBc3luYyIsInNwZWNpZmljSWRzIiwiZm9yRWFjaEFzeW5jIiwiX2dldE1hdGNoZWREb2NBbmRNb2RpZnkiLCJtYXRjaGVkX2JlZm9yZSIsIm9sZF9kb2MiLCJhZnRlck1hdGNoIiwiYWZ0ZXIiLCJiZWZvcmUiLCJfdXBkYXRlSW5SZXN1bHRzU3luYyIsIl91cGRhdGVJblJlc3VsdHNBc3luYyIsIm9sZFJlc3VsdHMiLCJpc0NsaWVudCIsIl9TeW5jaHJvbm91c1F1ZXVlIiwiX0FzeW5jaHJvbm91c1F1ZXVlIiwiY3JlYXRlIiwiX0NhY2hpbmdDaGFuZ2VPYnNlcnZlciIsIm9yZGVyZWRGcm9tQ2FsbGJhY2tzIiwiY2FsbGJhY2tzIiwiZG9jcyIsIk9yZGVyZWREaWN0IiwiaWRTdHJpbmdpZnkiLCJhcHBseUNoYW5nZSIsInB1dEJlZm9yZSIsIm1vdmVCZWZvcmUiLCJEaWZmU2VxdWVuY2UiLCJhcHBseUNoYW5nZXMiLCJJZE1hcCIsImlkUGFyc2UiLCJfX3dyYXBwZWRUcmFuc2Zvcm1fXyIsIndyYXBwZWQiLCJ0cmFuc2Zvcm1lZCIsIm5vbnJlYWN0aXZlIiwiX2JpbmFyeVNlYXJjaCIsImNtcCIsImFycmF5IiwiZmlyc3QiLCJyYW5nZSIsImhhbGZSYW5nZSIsImZsb29yIiwiX2NoZWNrU3VwcG9ydGVkUHJvamVjdGlvbiIsIl9pZFByb2plY3Rpb24iLCJydWxlVHJlZSIsInN1YmRvYyIsInNlbGVjdG9yRG9jdW1lbnQiLCJpc01vZGlmeSIsIl9pc01vZGlmaWNhdGlvbk1vZCIsIm5ld0RvYyIsImlzSW5zZXJ0IiwicmVwbGFjZW1lbnQiLCJfZGlmZk9iamVjdHMiLCJsZWZ0IiwicmlnaHQiLCJkaWZmT2JqZWN0cyIsIm5ld1Jlc3VsdHMiLCJvYnNlcnZlciIsImRpZmZRdWVyeUNoYW5nZXMiLCJfZGlmZlF1ZXJ5T3JkZXJlZENoYW5nZXMiLCJkaWZmUXVlcnlPcmRlcmVkQ2hhbmdlcyIsIl9kaWZmUXVlcnlVbm9yZGVyZWRDaGFuZ2VzIiwiZGlmZlF1ZXJ5VW5vcmRlcmVkQ2hhbmdlcyIsIl9maW5kSW5PcmRlcmVkUmVzdWx0cyIsInN1YklkcyIsIl9pbnNlcnRJblNvcnRlZExpc3QiLCJzcGxpY2UiLCJpc1JlcGxhY2UiLCJpc01vZGlmaWVyIiwic2V0T25JbnNlcnQiLCJtb2RGdW5jIiwiTU9ESUZJRVJTIiwia2V5cGF0aCIsImtleXBhcnRzIiwidGFyZ2V0IiwiZmluZE1vZFRhcmdldCIsImZvcmJpZEFycmF5Iiwibm9DcmVhdGUiLCJOT19DUkVBVEVfTU9ESUZJRVJTIiwicG9wIiwib2JzZXJ2ZUNhbGxiYWNrcyIsInN1cHByZXNzZWQiLCJvYnNlcnZlQ2hhbmdlc0NhbGxiYWNrcyIsIl9vYnNlcnZlQ2FsbGJhY2tzQXJlT3JkZXJlZCIsImluZGljZXMiLCJfbm9faW5kaWNlcyIsImNoZWNrIiwiYWRkZWRBdCIsImNoYW5nZWRBdCIsIm9sZERvYyIsIm1vdmVkVG8iLCJmcm9tIiwidG8iLCJyZW1vdmVkQXQiLCJjaGFuZ2VPYnNlcnZlciIsIl9mcm9tT2JzZXJ2ZSIsIm5vbk11dGF0aW5nQ2FsbGJhY2tzIiwic2V0U3VwcHJlc3NlZCIsImgiLCJfaXNQcm9taXNlIiwiY2hhbmdlZEZpZWxkcyIsIm1ha2VDaGFuZ2VkRmllbGRzIiwib2xkX2lkeCIsIm5ld19pZHgiLCIkY3VycmVudERhdGUiLCJEYXRlIiwiJGluYyIsIiRtaW4iLCIkbWF4IiwiJG11bCIsIiRyZW5hbWUiLCJ0YXJnZXQyIiwiJHNldE9uSW5zZXJ0IiwiJHB1c2giLCIkZWFjaCIsInRvUHVzaCIsInBvc2l0aW9uIiwiJHBvc2l0aW9uIiwiJHNsaWNlIiwic29ydEZ1bmN0aW9uIiwiJHNvcnQiLCJzcGxpY2VBcmd1bWVudHMiLCIkcHVzaEFsbCIsIiRhZGRUb1NldCIsImlzRWFjaCIsInZhbHVlcyIsInRvQWRkIiwiJHBvcCIsInRvUG9wIiwiJHB1bGwiLCJ0b1B1bGwiLCJvdXQiLCIkcHVsbEFsbCIsIiRiaXQiLCIkdiIsImludmFsaWRDaGFyTXNnIiwiJCIsImFzc2VydElzVmFsaWRGaWVsZE5hbWUiLCJ1c2VkQXJyYXlJbmRleCIsImxhc3QiLCJrZXlwYXJ0IiwicGFyc2VJbnQiLCJEZWNpbWFsIiwiRGVjaW1hbFN0dWIiLCJfZG9jTWF0Y2hlciIsImhhc1doZXJlIiwiX2NvbXBpbGVTZWxlY3RvciIsImlzVXBkYXRlIiwidiIsImtleU9yZGVyU2Vuc2l0aXZlIiwiX3R5cGVvcmRlciIsInQiLCJ0YSIsInRiIiwib2EiLCJvYiIsInRvSGV4U3RyaW5nIiwiaXNOYU4iLCJnZXRUaW1lIiwibWludXMiLCJ0b051bWJlciIsInRvQXJyYXkiLCJMb2NhbENvbGxlY3Rpb25fIiwiX3NvcnRTcGVjUGFydHMiLCJfZ2V0QmFzZUNvbXBhcmF0b3IiLCJfY29tcGFyZUtleXMiLCJrZXkxIiwia2V5MiIsIl9rZXlDb21wYXJhdG9yIiwiX2dlbmVyYXRlS2V5c0Zyb21Eb2MiLCJjYiIsInBhdGhGcm9tSW5kaWNlcyIsImtub3duUGF0aHMiLCJ2YWx1ZXNCeUluZGV4QW5kUGF0aCIsInNwZWMiLCJsb29rdXAiLCJ1c2VkUGF0aHMiLCJzb2xlS2V5IiwiX3NvcnRGdW5jdGlvbiIsImRvYzEiLCJkb2MyIiwiX2dldE1pbktleUZyb21Eb2MiLCJtaW5LZXkiLCJfa2V5RmllbGRDb21wYXJhdG9yIiwiaW52ZXJ0IiwiYXNjZW5kaW5nIiwiY29tcGFyZSIsImFkZFNwZWNQYXJ0IiwiY2hhckF0IiwiY29tcG9zZUNvbXBhcmF0b3JzIiwiY29tcGFyYXRvckFycmF5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxPQUFPLHdCQUF3QjtBQU9WO0FBRXJCQSxVQUFVQyx3QkFBd0IsR0FBR0MsU0FBU0EsTUFBTUMsR0FBRyxDQUFDQyxRQUN0REEsS0FBS0MsS0FBSyxDQUFDLEtBQUtDLE1BQU0sQ0FBQ0MsUUFBUSxDQUFDQyxhQUFhRCxPQUFPRSxJQUFJLENBQUM7QUFHM0QsOEVBQThFO0FBQzlFLHVDQUF1QztBQUN2Qyw4Q0FBOEM7QUFDOUMsVUFBVTtBQUNWLHlCQUF5QjtBQUN6QixxQkFBcUI7QUFDckIsWUFBWTtBQUNaLGtCQUFrQjtBQUNsQlQsVUFBVVUsT0FBTyxDQUFDQyxTQUFTLENBQUNDLGtCQUFrQixHQUFHLFNBQVNDLFFBQVE7SUFDaEUsMkNBQTJDO0lBQzNDQSxXQUFXQyxPQUFPQyxNQUFNLENBQUM7UUFBQ0MsTUFBTSxDQUFDO1FBQUdDLFFBQVEsQ0FBQztJQUFDLEdBQUdKO0lBRWpELE1BQU1LLGtCQUFrQixJQUFJLENBQUNDLFNBQVM7SUFDdEMsTUFBTUMsZ0JBQWdCLEVBQUUsQ0FBQ0MsTUFBTSxDQUM3QlAsT0FBT1EsSUFBSSxDQUFDVCxTQUFTRyxJQUFJLEdBQ3pCRixPQUFP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QUksR0FBR0EsSUFBSWlvQixnQkFBZ0IvbkIsTUFBTSxFQUFFLEVBQUVGLEVBQUc7WUFDL0MsTUFBTTZuQixVQUFVSSxlQUFlLENBQUNqb0IsRUFBRSxDQUFDbUgsR0FBR0M7WUFDdEMsSUFBSXlnQixZQUFZLEdBQUc7Z0JBQ2pCLE9BQU9BO1lBQ1Q7UUFDRjtRQUVBLE9BQU87SUFDVDtBQUNGIiwiZmlsZSI6Ii9wYWNrYWdlcy9taW5pbW9uZ28uanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgJy4vbWluaW1vbmdvX2NvbW1vbi5qcyc7XG5pbXBvcnQge1xuICBoYXNPd24sXG4gIGlzTnVtZXJpY0tleSxcbiAgaXNPcGVyYXRvck9iamVjdCxcbiAgcGF0aHNUb1RyZWUsXG4gIHByb2plY3Rpb25EZXRhaWxzLFxufSBmcm9tICcuL2NvbW1vbi5qcyc7XG5cbk1pbmltb25nby5fcGF0aHNFbGlkaW5nTnVtZXJpY0tleXMgPSBwYXRocyA9PiBwYXRocy5tYXAocGF0aCA9PlxuICBwYXRoLnNwbGl0KCcuJykuZmlsdGVyKHBhcnQgPT4gIWlzTnVtZXJpY0tleShwYXJ0KSkuam9pbignLicpXG4pO1xuXG4vLyBSZXR1cm5zIHRydWUgaWYgdGhlIG1vZGlmaWVyIGFwcGxpZWQgdG8gc29tZSBkb2N1bWVudCBtYXkgY2hhbmdlIHRoZSByZXN1bHRcbi8vIG9mIG1hdGNoaW5nIHRoZSBkb2N1bWVudCBieSBzZWxlY3RvclxuLy8gVGhlIG1vZGlmaWVyIGlzIGFsd2F5cyBpbiBhIGZvcm0gb2YgT2JqZWN0OlxuLy8gIC0gJHNldFxuLy8gICAgLSAnYS5iLjIyLnonOiB2YWx1ZVxuLy8gICAgLSAnZm9vLmJhcic6IDQyXG4vLyAgLSAkdW5zZXRcbi8vICAgIC0gJ2FiYy5kJzogMVxuTWluaW1vbmdvLk1hdGNoZXIucHJvdG90eXBlLmFmZmVjdGVkQnlNb2RpZmllciA9IGZ1bmN0aW9uKG1vZGlmaWVyKSB7XG4gIC8vIHNhZmUgY2hlY2sgZm9yICRzZXQvJHVuc2V0IGJlaW5nIG9iamVjdHNcbiAgbW9kaWZpZXIgPSBPYmplY3QuYXNzaWduKHskc2V0OiB7fSwgJHVuc2V0OiB7fX0sIG1vZGlmaWVyKTtcblxuICBjb25zdCBtZWFuaW5nZnVsUGF0aHMgPSB0aGlzLl9nZXRQYXRocygpO1xuICBjb25zdCBtb2RpZmllZFBhdGhzID0gW10uY29uY2F0KFxuICAgIE9iamVjdC5rZXlzKG1vZGlmaWVyLiRzZXQpLFxuICAgIE9iamVjdC5rZXlzKG1vZGlmaWVyLiR1bnNldClcbiAgKTtcblxuICByZXR1cm4gbW9kaWZpZWRQYXRocy5zb21lKHBhdGggPT4ge1xuICAgIGNvbnN0IG1vZCA9IHBhdGguc3BsaXQoJy4nKTtcblxuICAgIHJldHVybiBtZWFuaW5nZnVsUGF0aHMuc29tZShtZWFuaW5nZnVsUGF0aCA9PiB7XG4gICAgICBjb25zdCBzZWwgPSBtZWFuaW5nZnVsUGF0aC5zcGxpdCgnLicpO1xuXG4gICAgICBsZXQgaSA9IDAsIGogPSAwO1xuXG4gICAgICB3aGlsZSAoaSA8IHNlbC5sZW5ndGggJiYgaiA8IG1vZC5sZW5ndGgpIHtcbiAgICAgICAgaWYgKGlzTnVtZXJpY0tleShzZWxbaV0pICYmIGlzTnVtZXJpY0tleShtb2Rbal0pKSB7XG4gICAgICAgICAgLy8gZm9vLjQuYmFyIHNlbGVjdG9yIGFmZmVjdGVkIGJ5IGZvby40IG1vZGlmaWVyXG4gICAgICAgICAgLy8gZm9vLjMuYmFyIHNlbGVjdG9yIHVuYWZmZWN0ZWQgYnkgZm9vLjQgbW9kaWZpZXJcbiAgICAgICAgICBpZiAoc2VsW2ldID09PSBtb2Rbal0pIHtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgIGorKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc051bWVyaWNLZXkoc2VsW2ldKSkge1xuICAgICAgICAgIC8vIGZvby40LmJhciBzZWxlY3RvciB1bmFmZmVjdGVkIGJ5IGZvby5iYXIgbW9kaWZpZXJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNOdW1lcmljS2V5KG1vZFtqXSkpIHtcbiAgICAgICAgICBqKys7XG4gICAgICAgIH0gZWxzZSBpZiAoc2VsW2ldID09PSBtb2Rbal0pIHtcbiAgICAgICAgICBpKys7XG4gICAgICAgICAgaisrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBPbmUgaXMgYSBwcmVmaXggb2YgYW5vdGhlciwgdGFraW5nIG51bWVyaWMgZmllbGRzIGludG8gYWNjb3VudFxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuLy8gQHBhcmFtIG1vZGlmaWVyIC0gT2JqZWN0OiBNb25nb0RCLXN0eWxlZCBtb2RpZmllciB3aXRoIGAkc2V0YHMgYW5kIGAkdW5zZXRzYFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICBvbmx5LiAoYXNzdW1lZCB0byBjb21lIGZyb20gb3Bsb2cpXG4vLyBAcmV0dXJucyAtIEJvb2xlYW46IGlmIGFmdGVyIGFwcGx5aW5nIHRoZSBtb2RpZmllciwgc2VsZWN0b3IgY2FuIHN0YXJ0XG4vLyAgICAgICAgICAgICAgICAgICAgIGFjY2VwdGluZyB0aGUgbW9kaWZpZWQgdmFsdWUuXG4vLyBOT1RFOiBhc3N1bWVzIHRoYXQgZG9jdW1lbnQgYWZmZWN0ZWQgYnkgbW9kaWZpZXIgZGlkbid0IG1hdGNoIHRoaXMgTWF0Y2hlclxuLy8gYmVmb3JlLCBzbyBpZiBtb2RpZmllciBjYW4ndCBjb252aW5jZSBzZWxlY3RvciBpbiBhIHBvc2l0aXZlIGNoYW5nZSBpdCB3b3VsZFxuLy8gc3RheSAnZmFsc2UnLlxuLy8gQ3VycmVudGx5IGRvZXNuJ3Qgc3VwcG9ydCAkLW9wZXJhdG9ycyBhbmQgbnVtZXJpYyBpbmRpY2VzIHByZWNpc2VseS5cbk1pbmltb25nby5NYXRjaGVyLnByb3RvdHlwZS5jYW5CZWNvbWVUcnVlQnlNb2RpZmllciA9IGZ1bmN0aW9uKG1vZGlmaWVyKSB7XG4gIGlmICghdGhpcy5hZmZlY3RlZEJ5TW9kaWZpZXIobW9kaWZpZXIpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKCF0aGlzLmlzU2ltcGxlKCkpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIG1vZGlmaWVyID0gT2JqZWN0LmFzc2lnbih7JHNldDoge30sICR1bnNldDoge319LCBtb2RpZmllcik7XG5cbiAgY29uc3QgbW9kaWZpZXJQYXRocyA9IFtdLmNvbmNhdChcbiAgICBPYmplY3Qua2V5cyhtb2RpZmllci4kc2V0KSxcbiAgICBPYmplY3Qua2V5cyhtb2RpZmllci4kdW5zZXQpXG4gICk7XG5cbiAgaWYgKHRoaXMuX2dldFBhdGhzKCkuc29tZShwYXRoSGFzTnVtZXJpY0tleXMpIHx8XG4gICAgICBtb2RpZmllclBhdGhzLnNvbWUocGF0aEhhc051bWVyaWNLZXlzKSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gY2hlY2sgaWYgdGhlcmUgaXMgYSAkc2V0IG9yICR1bnNldCB0aGF0IGluZGljYXRlcyBzb21ldGhpbmcgaXMgYW5cbiAgLy8gb2JqZWN0IHJhdGhlciB0aGFuIGEgc2NhbGFyIGluIHRoZSBhY3R1YWwgb2JqZWN0IHdoZXJlIHdlIHNhdyAkLW9wZXJhdG9yXG4gIC8vIE5PVEU6IGl0IGlzIGNvcnJlY3Qgc2luY2Ugd2UgYWxsb3cgb25seSBzY2FsYXJzIGluICQtb3BlcmF0b3JzXG4gIC8vIEV4YW1wbGU6IGZvciBzZWxlY3RvciB7J2EuYic6IHskZ3Q6IDV9fSB0aGUgbW9kaWZpZXIgeydhLmIuYyc6N30gd291bGRcbiAgLy8gZGVmaW5pdGVseSBzZXQgdGhlIHJlc3VsdCB0byBmYWxzZSBhcyAnYS5iJyBhcHBlYXJzIHRvIGJlIGFuIG9iamVjdC5cbiAgY29uc3QgZXhwZWN0ZWRTY2FsYXJJc09iamVjdCA9IE9iamVjdC5rZXlzKHRoaXMuX3NlbGVjdG9yKS5zb21lKHBhdGggPT4ge1xuICAgIGlmICghaXNPcGVyYXRvck9iamVjdCh0aGlzLl9zZWxlY3RvcltwYXRoXSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gbW9kaWZpZXJQYXRocy5zb21lKG1vZGlmaWVyUGF0aCA9PlxuICAgICAgbW9kaWZpZXJQYXRoLnN0YXJ0c1dpdGgoYCR7cGF0aH0uYClcbiAgICApO1xuICB9KTtcblxuICBpZiAoZXhwZWN0ZWRTY2FsYXJJc09iamVjdCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIFNlZSBpZiB3ZSBjYW4gYXBwbHkgdGhlIG1vZGlmaWVyIG9uIHRoZSBpZGVhbGx5IG1hdGNoaW5nIG9iamVjdC4gSWYgaXRcbiAgLy8gc3RpbGwgbWF0Y2hlcyB0aGUgc2VsZWN0b3IsIHRoZW4gdGhlIG1vZGlmaWVyIGNvdWxkIGhhdmUgdHVybmVkIHRoZSByZWFsXG4gIC8vIG9iamVjdCBpbiB0aGUgZGF0YWJhc2UgaW50byBzb21ldGhpbmcgbWF0Y2hpbmcuXG4gIGNvbnN0IG1hdGNoaW5nRG9jdW1lbnQgPSBFSlNPTi5jbG9uZSh0aGlzLm1hdGNoaW5nRG9jdW1lbnQoKSk7XG5cbiAgLy8gVGhlIHNlbGVjdG9yIGlzIHRvbyBjb21wbGV4LCBhbnl0aGluZyBjYW4gaGFwcGVuLlxuICBpZiAobWF0Y2hpbmdEb2N1bWVudCA9PT0gbnVsbCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBMb2NhbENvbGxlY3Rpb24uX21vZGlmeShtYXRjaGluZ0RvY3VtZW50LCBtb2RpZmllcik7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgLy8gQ291bGRuJ3Qgc2V0IGEgcHJvcGVydHkgb24gYSBmaWVsZCB3aGljaCBpcyBhIHNjYWxhciBvciBudWxsIGluIHRoZVxuICAgIC8vIHNlbGVjdG9yLlxuICAgIC8vIEV4YW1wbGU6XG4gICAgLy8gcmVhbCBkb2N1bWVudDogeyAnYS5iJzogMyB9XG4gICAgLy8gc2VsZWN0b3I6IHsgJ2EnOiAxMiB9XG4gICAgLy8gY29udmVydGVkIHNlbGVjdG9yIChpZGVhbCBkb2N1bWVudCk6IHsgJ2EnOiAxMiB9XG4gICAgLy8gbW9kaWZpZXI6IHsgJHNldDogeyAnYS5iJzogNCB9IH1cbiAgICAvLyBXZSBkb24ndCBrbm93IHdoYXQgcmVhbCBkb2N1bWVudCB3YXMgbGlrZSBidXQgZnJvbSB0aGUgZXJyb3IgcmFpc2VkIGJ5XG4gICAgLy8gJHNldCBvbiBhIHNjYWxhciBmaWVsZCB3ZSBjYW4gcmVhc29uIHRoYXQgdGhlIHN0cnVjdHVyZSBvZiByZWFsIGRvY3VtZW50XG4gICAgLy8gaXMgY29tcGxldGVseSBkaWZmZXJlbnQuXG4gICAgaWYgKGVycm9yLm5hbWUgPT09ICdNaW5pbW9uZ29FcnJvcicgJiYgZXJyb3Iuc2V0UHJvcGVydHlFcnJvcikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuZG9jdW1lbnRNYXRjaGVzKG1hdGNoaW5nRG9jdW1lbnQpLnJlc3VsdDtcbn07XG5cbi8vIEtub3dzIGhvdyB0byBjb21iaW5lIGEgbW9uZ28gc2VsZWN0b3IgYW5kIGEgZmllbGRzIHByb2plY3Rpb24gdG8gYSBuZXcgZmllbGRzXG4vLyBwcm9qZWN0aW9uIHRha2luZyBpbnRvIGFjY291bnQgYWN0aXZlIGZpZWxkcyBmcm9tIHRoZSBwYXNzZWQgc2VsZWN0b3IuXG4vLyBAcmV0dXJucyBPYmplY3QgLSBwcm9qZWN0aW9uIG9iamVjdCAoc2FtZSBhcyBmaWVsZHMgb3B0aW9uIG9mIG1vbmdvIGN1cnNvcilcbk1pbmltb25nby5NYXRjaGVyLnByb3RvdHlwZS5jb21iaW5lSW50b1Byb2plY3Rpb24gPSBmdW5jdGlvbihwcm9qZWN0aW9uKSB7XG4gIGNvbnN0IHNlbGVjdG9yUGF0aHMgPSBNaW5pbW9uZ28uX3BhdGhzRWxpZGluZ051bWVyaWNLZXlzKHRoaXMuX2dldFBhdGhzKCkpO1xuXG4gIC8vIFNwZWNpYWwgY2FzZSBmb3IgJHdoZXJlIG9wZXJhdG9yIGluIHRoZSBzZWxlY3RvciAtIHByb2plY3Rpb24gc2hvdWxkIGRlcGVuZFxuICAvLyBvbiBhbGwgZmllbGRzIG9mIHRoZSBkb2N1bWVudC4gZ2V0U2VsZWN0b3JQYXRocyByZXR1cm5zIGEgbGlzdCBvZiBwYXRoc1xuICAvLyBzZWxlY3RvciBkZXBlbmRzIG9uLiBJZiBvbmUgb2YgdGhlIHBhdGhzIGlzICcnIChlbXB0eSBzdHJpbmcpIHJlcHJlc2VudGluZ1xuICAvLyB0aGUgcm9vdCBvciB0aGUgd2hvbGUgZG9jdW1lbnQsIGNvbXBsZXRlIHByb2plY3Rpb24gc2hvdWxkIGJlIHJldHVybmVkLlxuICBpZiAoc2VsZWN0b3JQYXRocy5pbmNsdWRlcygnJykpIHtcbiAgICByZXR1cm4ge307XG4gIH1cblxuICByZXR1cm4gY29tYmluZUltcG9ydGFudFBhdGhzSW50b1Byb2plY3Rpb24oc2VsZWN0b3JQYXRocywgcHJvamVjdGlvbik7XG59O1xuXG4vLyBSZXR1cm5zIGFuIG9iamVjdCB0aGF0IHdvdWxkIG1hdGNoIHRoZSBzZWxlY3RvciBpZiBwb3NzaWJsZSBvciBudWxsIGlmIHRoZVxuLy8gc2VsZWN0b3IgaXMgdG9vIGNvbXBsZXggZm9yIHVzIHRvIGFuYWx5emVcbi8vIHsgJ2EuYic6IHsgYW5zOiA0MiB9LCAnZm9vLmJhcic6IG51bGwsICdmb28uYmF6JzogXCJzb21ldGhpbmdcIiB9XG4vLyA9PiB7IGE6IHsgYjogeyBhbnM6IDQyIH0gfSwgZm9vOiB7IGJhcjogbnVsbCwgYmF6OiBcInNvbWV0aGluZ1wiIH0gfVxuTWluaW1vbmdvLk1hdGNoZXIucHJvdG90eXBlLm1hdGNoaW5nRG9jdW1lbnQgPSBmdW5jdGlvbigpIHtcbiAgLy8gY2hlY2sgaWYgaXQgd2FzIGNvbXB1dGVkIGJlZm9yZVxuICBpZiAodGhpcy5fbWF0Y2hpbmdEb2N1bWVudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hdGNoaW5nRG9jdW1lbnQ7XG4gIH1cblxuICAvLyBJZiB0aGUgYW5hbHlzaXMgb2YgdGhpcyBzZWxlY3RvciBpcyB0b28gaGFyZCBmb3Igb3VyIGltcGxlbWVudGF0aW9uXG4gIC8vIGZhbGxiYWNrIHRvIFwiWUVTXCJcbiAgbGV0IGZhbGxiYWNrID0gZmFsc2U7XG5cbiAgdGhpcy5fbWF0Y2hpbmdEb2N1bWVudCA9IHBhdGhzVG9UcmVlKFxuICAgIHRoaXMuX2dldFBhdGhzKCksXG4gICAgcGF0aCA9PiB7XG4gICAgICBjb25zdCB2YWx1ZVNlbGVjdG9yID0gdGhpcy5fc2VsZWN0b3JbcGF0aF07XG5cbiAgICAgIGlmIChpc09wZXJhdG9yT2JqZWN0KHZhbHVlU2VsZWN0b3IpKSB7XG4gICAgICAgIC8vIGlmIHRoZXJlIGlzIGEgc3RyaWN0IGVxdWFsaXR5LCB0aGVyZSBpcyBhIGdvb2RcbiAgICAgICAgLy8gY2hhbmNlIHdlIGNhbiB1c2Ugb25lIG9mIHRob3NlIGFzIFwibWF0Y2hpbmdcIlxuICAgICAgICAvLyBkdW1teSB2YWx1ZVxuICAgICAgICBpZiAodmFsdWVTZWxlY3Rvci4kZXEpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWVTZWxlY3Rvci4kZXE7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodmFsdWVTZWxlY3Rvci4kaW4pIHtcbiAgICAgICAgICBjb25zdCBtYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKHtwbGFjZWhvbGRlcjogdmFsdWVTZWxlY3Rvcn0pO1xuXG4gICAgICAgICAgLy8gUmV0dXJuIGFueXRoaW5nIGZyb20gJGluIHRoYXQgbWF0Y2hlcyB0aGUgd2hvbGUgc2VsZWN0b3IgZm9yIHRoaXNcbiAgICAgICAgICAvLyBwYXRoLiBJZiBub3RoaW5nIG1hdGNoZXMsIHJldHVybnMgYHVuZGVmaW5lZGAgYXMgbm90aGluZyBjYW4gbWFrZVxuICAgICAgICAgIC8vIHRoaXMgc2VsZWN0b3IgaW50byBgdHJ1ZWAuXG4gICAgICAgICAgcmV0dXJuIHZhbHVlU2VsZWN0b3IuJGluLmZpbmQocGxhY2Vob2xkZXIgPT5cbiAgICAgICAgICAgIG1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKHtwbGFjZWhvbGRlcn0pLnJlc3VsdFxuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob25seUNvbnRhaW5zS2V5cyh2YWx1ZVNlbGVjdG9yLCBbJyRndCcsICckZ3RlJywgJyRsdCcsICckbHRlJ10pKSB7XG4gICAgICAgICAgbGV0IGxvd2VyQm91bmQgPSAtSW5maW5pdHk7XG4gICAgICAgICAgbGV0IHVwcGVyQm91bmQgPSBJbmZpbml0eTtcblxuICAgICAgICAgIFsnJGx0ZScsICckbHQnXS5mb3JFYWNoKG9wID0+IHtcbiAgICAgICAgICAgIGlmIChoYXNPd24uY2FsbCh2YWx1ZVNlbGVjdG9yLCBvcCkgJiZcbiAgICAgICAgICAgICAgICB2YWx1ZVNlbGVjdG9yW29wXSA8IHVwcGVyQm91bmQpIHtcbiAgICAgICAgICAgICAgdXBwZXJCb3VuZCA9IHZhbHVlU2VsZWN0b3Jbb3BdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgWyckZ3RlJywgJyRndCddLmZvckVhY2gob3AgPT4ge1xuICAgICAgICAgICAgaWYgKGhhc093bi5jYWxsKHZhbHVlU2VsZWN0b3IsIG9wKSAmJlxuICAgICAgICAgICAgICAgIHZhbHVlU2VsZWN0b3Jbb3BdID4gbG93ZXJCb3VuZCkge1xuICAgICAgICAgICAgICBsb3dlckJvdW5kID0gdmFsdWVTZWxlY3RvcltvcF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBjb25zdCBtaWRkbGUgPSAobG93ZXJCb3VuZCArIHVwcGVyQm91bmQpIC8gMjtcbiAgICAgICAgICBjb25zdCBtYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKHtwbGFjZWhvbGRlcjogdmFsdWVTZWxlY3Rvcn0pO1xuXG4gICAgICAgICAgaWYgKCFtYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyh7cGxhY2Vob2xkZXI6IG1pZGRsZX0pLnJlc3VsdCAmJlxuICAgICAgICAgICAgICAobWlkZGxlID09PSBsb3dlckJvdW5kIHx8IG1pZGRsZSA9PT0gdXBwZXJCb3VuZCkpIHtcbiAgICAgICAgICAgIGZhbGxiYWNrID0gdHJ1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gbWlkZGxlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9ubHlDb250YWluc0tleXModmFsdWVTZWxlY3RvciwgWyckbmluJywgJyRuZSddKSkge1xuICAgICAgICAgIC8vIFNpbmNlIHRoaXMuX2lzU2ltcGxlIG1ha2VzIHN1cmUgJG5pbiBhbmQgJG5lIGFyZSBub3QgY29tYmluZWQgd2l0aFxuICAgICAgICAgIC8vIG9iamVjdHMgb3IgYXJyYXlzLCB3ZSBjYW4gY29uZmlkZW50bHkgcmV0dXJuIGFuIGVtcHR5IG9iamVjdCBhcyBpdFxuICAgICAgICAgIC8vIG5ldmVyIG1hdGNoZXMgYW55IHNjYWxhci5cbiAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgIH1cblxuICAgICAgICBmYWxsYmFjayA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLl9zZWxlY3RvcltwYXRoXTtcbiAgICB9LFxuICAgIHggPT4geCk7XG5cbiAgaWYgKGZhbGxiYWNrKSB7XG4gICAgdGhpcy5fbWF0Y2hpbmdEb2N1bWVudCA9IG51bGw7XG4gIH1cblxuICByZXR1cm4gdGhpcy5fbWF0Y2hpbmdEb2N1bWVudDtcbn07XG5cbi8vIE1pbmltb25nby5Tb3J0ZXIgZ2V0cyBhIHNpbWlsYXIgbWV0aG9kLCB3aGljaCBkZWxlZ2F0ZXMgdG8gYSBNYXRjaGVyIGl0IG1hZGVcbi8vIGZvciB0aGlzIGV4YWN0IHB1cnBvc2UuXG5NaW5pbW9uZ28uU29ydGVyLnByb3RvdHlwZS5hZmZlY3RlZEJ5TW9kaWZpZXIgPSBmdW5jdGlvbihtb2RpZmllcikge1xuICByZXR1cm4gdGhpcy5fc2VsZWN0b3JGb3JBZmZlY3RlZEJ5TW9kaWZpZXIuYWZmZWN0ZWRCeU1vZGlmaWVyKG1vZGlmaWVyKTtcbn07XG5cbk1pbmltb25nby5Tb3J0ZXIucHJvdG90eXBlLmNvbWJpbmVJbnRvUHJvamVjdGlvbiA9IGZ1bmN0aW9uKHByb2plY3Rpb24pIHtcbiAgcmV0dXJuIGNvbWJpbmVJbXBvcnRhbnRQYXRoc0ludG9Qcm9qZWN0aW9uKFxuICAgIE1pbmltb25nby5fcGF0aHNFbGlkaW5nTnVtZXJpY0tleXModGhpcy5fZ2V0UGF0aHMoKSksXG4gICAgcHJvamVjdGlvblxuICApO1xufTtcblxuZnVuY3Rpb24gY29tYmluZUltcG9ydGFudFBhdGhzSW50b1Byb2plY3Rpb24ocGF0aHMsIHByb2plY3Rpb24pIHtcbiAgY29uc3QgZGV0YWlscyA9IHByb2plY3Rpb25EZXRhaWxzKHByb2plY3Rpb24pO1xuXG4gIC8vIG1lcmdlIHRoZSBwYXRocyB0byBpbmNsdWRlXG4gIGNvbnN0IHRyZWUgPSBwYXRoc1RvVHJlZShcbiAgICBwYXRocyxcbiAgICBwYXRoID0+IHRydWUsXG4gICAgKG5vZGUsIHBhdGgsIGZ1bGxQYXRoKSA9PiB0cnVlLFxuICAgIGRldGFpbHMudHJlZVxuICApO1xuICBjb25zdCBtZXJnZWRQcm9qZWN0aW9uID0gdHJlZVRvUGF0aHModHJlZSk7XG5cbiAgaWYgKGRldGFpbHMuaW5jbHVkaW5nKSB7XG4gICAgLy8gYm90aCBzZWxlY3RvciBhbmQgcHJvamVjdGlvbiBhcmUgcG9pbnRpbmcgb24gZmllbGRzIHRvIGluY2x1ZGVcbiAgICAvLyBzbyB3ZSBjYW4ganVzdCByZXR1cm4gdGhlIG1lcmdlZCB0cmVlXG4gICAgcmV0dXJuIG1lcmdlZFByb2plY3Rpb247XG4gIH1cblxuICAvLyBzZWxlY3RvciBpcyBwb2ludGluZyBhdCBmaWVsZHMgdG8gaW5jbHVkZVxuICAvLyBwcm9qZWN0aW9uIGlzIHBvaW50aW5nIGF0IGZpZWxkcyB0byBleGNsdWRlXG4gIC8vIG1ha2Ugc3VyZSB3ZSBkb24ndCBleGNsdWRlIGltcG9ydGFudCBwYXRoc1xuICBjb25zdCBtZXJnZWRFeGNsUHJvamVjdGlvbiA9IHt9O1xuXG4gIE9iamVjdC5rZXlzKG1lcmdlZFByb2plY3Rpb24pLmZvckVhY2gocGF0aCA9PiB7XG4gICAgaWYgKCFtZXJnZWRQcm9qZWN0aW9uW3BhdGhdKSB7XG4gICAgICBtZXJnZWRFeGNsUHJvamVjdGlvbltwYXRoXSA9IGZhbHNlO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIG1lcmdlZEV4Y2xQcm9qZWN0aW9uO1xufVxuXG5mdW5jdGlvbiBnZXRQYXRocyhzZWxlY3Rvcikge1xuICByZXR1cm4gT2JqZWN0LmtleXMobmV3IE1pbmltb25nby5NYXRjaGVyKHNlbGVjdG9yKS5fcGF0aHMpO1xuXG4gIC8vIFhYWCByZW1vdmUgaXQ/XG4gIC8vIHJldHVybiBPYmplY3Qua2V5cyhzZWxlY3RvcikubWFwKGsgPT4ge1xuICAvLyAgIC8vIHdlIGRvbid0IGtub3cgaG93IHRvIGhhbmRsZSAkd2hlcmUgYmVjYXVzZSBpdCBjYW4gYmUgYW55dGhpbmdcbiAgLy8gICBpZiAoayA9PT0gJyR3aGVyZScpIHtcbiAgLy8gICAgIHJldHVybiAnJzsgLy8gbWF0Y2hlcyBldmVyeXRoaW5nXG4gIC8vICAgfVxuXG4gIC8vICAgLy8gd2UgYnJhbmNoIGZyb20gJG9yLyRhbmQvJG5vciBvcGVyYXRvclxuICAvLyAgIGlmIChbJyRvcicsICckYW5kJywgJyRub3InXS5pbmNsdWRlcyhrKSkge1xuICAvLyAgICAgcmV0dXJuIHNlbGVjdG9yW2tdLm1hcChnZXRQYXRocyk7XG4gIC8vICAgfVxuXG4gIC8vICAgLy8gdGhlIHZhbHVlIGlzIGEgbGl0ZXJhbCBvciBzb21lIGNvbXBhcmlzb24gb3BlcmF0b3JcbiAgLy8gICByZXR1cm4gaztcbiAgLy8gfSlcbiAgLy8gICAucmVkdWNlKChhLCBiKSA9PiBhLmNvbmNhdChiKSwgW10pXG4gIC8vICAgLmZpbHRlcigoYSwgYiwgYykgPT4gYy5pbmRleE9mKGEpID09PSBiKTtcbn1cblxuLy8gQSBoZWxwZXIgdG8gZW5zdXJlIG9iamVjdCBoYXMgb25seSBjZXJ0YWluIGtleXNcbmZ1bmN0aW9uIG9ubHlDb250YWluc0tleXMob2JqLCBrZXlzKSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhvYmopLmV2ZXJ5KGsgPT4ga2V5cy5pbmNsdWRlcyhrKSk7XG59XG5cbmZ1bmN0aW9uIHBhdGhIYXNOdW1lcmljS2V5cyhwYXRoKSB7XG4gIHJldHVybiBwYXRoLnNwbGl0KCcuJykuc29tZShpc051bWVyaWNLZXkpO1xufVxuXG4vLyBSZXR1cm5zIGEgc2V0IG9mIGtleSBwYXRocyBzaW1pbGFyIHRvXG4vLyB7ICdmb28uYmFyJzogMSwgJ2EuYi5jJzogMSB9XG5mdW5jdGlvbiB0cmVlVG9QYXRocyh0cmVlLCBwcmVmaXggPSAnJykge1xuICBjb25zdCByZXN1bHQgPSB7fTtcblxuICBPYmplY3Qua2V5cyh0cmVlKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSB0cmVlW2tleV07XG4gICAgaWYgKHZhbHVlID09PSBPYmplY3QodmFsdWUpKSB7XG4gICAgICBPYmplY3QuYXNzaWduKHJlc3VsdCwgdHJlZVRvUGF0aHModmFsdWUsIGAke3ByZWZpeCArIGtleX0uYCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHRbcHJlZml4ICsga2V5XSA9IHZhbHVlO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cbiIsImltcG9ydCBMb2NhbENvbGxlY3Rpb24gZnJvbSAnLi9sb2NhbF9jb2xsZWN0aW9uLmpzJztcblxuZXhwb3J0IGNvbnN0IGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbmV4cG9ydCBjbGFzcyBNaW5pTW9uZ29RdWVyeUVycm9yIGV4dGVuZHMgRXJyb3Ige31cbi8vIEVhY2ggZWxlbWVudCBzZWxlY3RvciBjb250YWluczpcbi8vICAtIGNvbXBpbGVFbGVtZW50U2VsZWN0b3IsIGEgZnVuY3Rpb24gd2l0aCBhcmdzOlxuLy8gICAgLSBvcGVyYW5kIC0gdGhlIFwicmlnaHQgaGFuZCBzaWRlXCIgb2YgdGhlIG9wZXJhdG9yXG4vLyAgICAtIHZhbHVlU2VsZWN0b3IgLSB0aGUgXCJjb250ZXh0XCIgZm9yIHRoZSBvcGVyYXRvciAoc28gdGhhdCAkcmVnZXggY2FuIGZpbmRcbi8vICAgICAgJG9wdGlvbnMpXG4vLyAgICAtIG1hdGNoZXIgLSB0aGUgTWF0Y2hlciB0aGlzIGlzIGdvaW5nIGludG8gKHNvIHRoYXQgJGVsZW1NYXRjaCBjYW4gY29tcGlsZVxuLy8gICAgICBtb3JlIHRoaW5ncylcbi8vICAgIHJldHVybmluZyBhIGZ1bmN0aW9uIG1hcHBpbmcgYSBzaW5nbGUgdmFsdWUgdG8gYm9vbC5cbi8vICAtIGRvbnRFeHBhbmRMZWFmQXJyYXlzLCBhIGJvb2wgd2hpY2ggcHJldmVudHMgZXhwYW5kQXJyYXlzSW5CcmFuY2hlcyBmcm9tXG4vLyAgICBiZWluZyBjYWxsZWRcbi8vICAtIGRvbnRJbmNsdWRlTGVhZkFycmF5cywgYSBib29sIHdoaWNoIGNhdXNlcyBhbiBhcmd1bWVudCB0byBiZSBwYXNzZWQgdG9cbi8vICAgIGV4cGFuZEFycmF5c0luQnJhbmNoZXMgaWYgaXQgaXMgY2FsbGVkXG5leHBvcnQgY29uc3QgRUxFTUVOVF9PUEVSQVRPUlMgPSB7XG4gICRsdDogbWFrZUluZXF1YWxpdHkoY21wVmFsdWUgPT4gY21wVmFsdWUgPCAwKSxcbiAgJGd0OiBtYWtlSW5lcXVhbGl0eShjbXBWYWx1ZSA9PiBjbXBWYWx1ZSA+IDApLFxuICAkbHRlOiBtYWtlSW5lcXVhbGl0eShjbXBWYWx1ZSA9PiBjbXBWYWx1ZSA8PSAwKSxcbiAgJGd0ZTogbWFrZUluZXF1YWxpdHkoY21wVmFsdWUgPT4gY21wVmFsdWUgPj0gMCksXG4gICRtb2Q6IHtcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQpIHtcbiAgICAgIGlmICghKEFycmF5LmlzQXJyYXkob3BlcmFuZCkgJiYgb3BlcmFuZC5sZW5ndGggPT09IDJcbiAgICAgICAgICAgICYmIHR5cGVvZiBvcGVyYW5kWzBdID09PSAnbnVtYmVyJ1xuICAgICAgICAgICAgJiYgdHlwZW9mIG9wZXJhbmRbMV0gPT09ICdudW1iZXInKSkge1xuICAgICAgICB0aHJvdyBuZXcgTWluaU1vbmdvUXVlcnlFcnJvcignYXJndW1lbnQgdG8gJG1vZCBtdXN0IGJlIGFuIGFycmF5IG9mIHR3byBudW1iZXJzJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIFhYWCBjb3VsZCByZXF1aXJlIHRvIGJlIGludHMgb3Igcm91bmQgb3Igc29tZXRoaW5nXG4gICAgICBjb25zdCBkaXZpc29yID0gb3BlcmFuZFswXTtcbiAgICAgIGNvbnN0IHJlbWFpbmRlciA9IG9wZXJhbmRbMV07XG4gICAgICByZXR1cm4gdmFsdWUgPT4gKFxuICAgICAgICB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInICYmIHZhbHVlICUgZGl2aXNvciA9PT0gcmVtYWluZGVyXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG4gICRpbjoge1xuICAgIGNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCkge1xuICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG9wZXJhbmQpKSB7XG4gICAgICAgIHRocm93IG5ldyBNaW5pTW9uZ29RdWVyeUVycm9yKCckaW4gbmVlZHMgYW4gYXJyYXknKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZWxlbWVudE1hdGNoZXJzID0gb3BlcmFuZC5tYXAob3B0aW9uID0+IHtcbiAgICAgICAgaWYgKG9wdGlvbiBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICAgIHJldHVybiByZWdleHBFbGVtZW50TWF0Y2hlcihvcHRpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzT3BlcmF0b3JPYmplY3Qob3B0aW9uKSkge1xuICAgICAgICAgIHRocm93IG5ldyBNaW5pTW9uZ29RdWVyeUVycm9yKCdjYW5ub3QgbmVzdCAkIHVuZGVyICRpbicpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGVxdWFsaXR5RWxlbWVudE1hdGNoZXIob3B0aW9uKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gdmFsdWUgPT4ge1xuICAgICAgICAvLyBBbGxvdyB7YTogeyRpbjogW251bGxdfX0gdG8gbWF0Y2ggd2hlbiAnYScgZG9lcyBub3QgZXhpc3QuXG4gICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdmFsdWUgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGVsZW1lbnRNYXRjaGVycy5zb21lKG1hdGNoZXIgPT4gbWF0Y2hlcih2YWx1ZSkpO1xuICAgICAgfTtcbiAgICB9LFxuICB9LFxuICAkc2l6ZToge1xuICAgIC8vIHthOiBbWzUsIDVdXX0gbXVzdCBtYXRjaCB7YTogeyRzaXplOiAxfX0gYnV0IG5vdCB7YTogeyRzaXplOiAyfX0sIHNvIHdlXG4gICAgLy8gZG9uJ3Qgd2FudCB0byBjb25zaWRlciB0aGUgZWxlbWVudCBbNSw1XSBpbiB0aGUgbGVhZiBhcnJheSBbWzUsNV1dIGFzIGFcbiAgICAvLyBwb3NzaWJsZSB2YWx1ZS5cbiAgICBkb250RXhwYW5kTGVhZkFycmF5czogdHJ1ZSxcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQpIHtcbiAgICAgIGlmICh0eXBlb2Ygb3BlcmFuZCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgLy8gRG9uJ3QgYXNrIG1lIHdoeSwgYnV0IGJ5IGV4cGVyaW1lbnRhdGlvbiwgdGhpcyBzZWVtcyB0byBiZSB3aGF0IE1vbmdvXG4gICAgICAgIC8vIGRvZXMuXG4gICAgICAgIG9wZXJhbmQgPSAwO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygb3BlcmFuZCAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgdGhyb3cgbmV3IE1pbmlNb25nb1F1ZXJ5RXJyb3IoJyRzaXplIG5lZWRzIGEgbnVtYmVyJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB2YWx1ZSA9PiBBcnJheS5pc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IG9wZXJhbmQ7XG4gICAgfSxcbiAgfSxcbiAgJHR5cGU6IHtcbiAgICAvLyB7YTogWzVdfSBtdXN0IG5vdCBtYXRjaCB7YTogeyR0eXBlOiA0fX0gKDQgbWVhbnMgYXJyYXkpLCBidXQgaXQgc2hvdWxkXG4gICAgLy8gbWF0Y2gge2E6IHskdHlwZTogMX19ICgxIG1lYW5zIG51bWJlciksIGFuZCB7YTogW1s1XV19IG11c3QgbWF0Y2ggeyRhOlxuICAgIC8vIHskdHlwZTogNH19LiBUaHVzLCB3aGVuIHdlIHNlZSBhIGxlYWYgYXJyYXksIHdlICpzaG91bGQqIGV4cGFuZCBpdCBidXRcbiAgICAvLyBzaG91bGQgKm5vdCogaW5jbHVkZSBpdCBpdHNlbGYuXG4gICAgZG9udEluY2x1ZGVMZWFmQXJyYXlzOiB0cnVlLFxuICAgIGNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCkge1xuICAgICAgaWYgKHR5cGVvZiBvcGVyYW5kID09PSAnc3RyaW5nJykge1xuICAgICAgICBjb25zdCBvcGVyYW5kQWxpYXNNYXAgPSB7XG4gICAgICAgICAgJ2RvdWJsZSc6IDEsXG4gICAgICAgICAgJ3N0cmluZyc6IDIsXG4gICAgICAgICAgJ29iamVjdCc6IDMsXG4gICAgICAgICAgJ2FycmF5JzogNCxcbiAgICAgICAgICAnYmluRGF0YSc6IDUsXG4gICAgICAgICAgJ3VuZGVmaW5lZCc6IDYsXG4gICAgICAgICAgJ29iamVjdElkJzogNyxcbiAgICAgICAgICAnYm9vbCc6IDgsXG4gICAgICAgICAgJ2RhdGUnOiA5LFxuICAgICAgICAgICdudWxsJzogMTAsXG4gICAgICAgICAgJ3JlZ2V4JzogMTEsXG4gICAgICAgICAgJ2RiUG9pbnRlcic6IDEyLFxuICAgICAgICAgICdqYXZhc2NyaXB0JzogMTMsXG4gICAgICAgICAgJ3N5bWJvbCc6IDE0LFxuICAgICAgICAgICdqYXZhc2NyaXB0V2l0aFNjb3BlJzogMTUsXG4gICAgICAgICAgJ2ludCc6IDE2LFxuICAgICAgICAgICd0aW1lc3RhbXAnOiAxNyxcbiAgICAgICAgICAnbG9uZyc6IDE4LFxuICAgICAgICAgICdkZWNpbWFsJzogMTksXG4gICAgICAgICAgJ21pbktleSc6IC0xLFxuICAgICAgICAgICdtYXhLZXknOiAxMjcsXG4gICAgICAgIH07XG4gICAgICAgIGlmICghaGFzT3duLmNhbGwob3BlcmFuZEFsaWFzTWFwLCBvcGVyYW5kKSkge1xuICAgICAgICAgIHRocm93IG5ldyBNaW5pTW9uZ29RdWVyeUVycm9yKGB1bmtub3duIHN0cmluZyBhbGlhcyBmb3IgJHR5cGU6ICR7b3BlcmFuZH1gKTtcbiAgICAgICAgfVxuICAgICAgICBvcGVyYW5kID0gb3BlcmFuZEFsaWFzTWFwW29wZXJhbmRdO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygb3BlcmFuZCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgaWYgKG9wZXJhbmQgPT09IDAgfHwgb3BlcmFuZCA8IC0xXG4gICAgICAgICAgfHwgKG9wZXJhbmQgPiAxOSAmJiBvcGVyYW5kICE9PSAxMjcpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IE1pbmlNb25nb1F1ZXJ5RXJyb3IoYEludmFsaWQgbnVtZXJpY2FsICR0eXBlIGNvZGU6ICR7b3BlcmFuZH1gKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IE1pbmlNb25nb1F1ZXJ5RXJyb3IoJ2FyZ3VtZW50IHRvICR0eXBlIGlzIG5vdCBhIG51bWJlciBvciBhIHN0cmluZycpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdmFsdWUgPT4gKFxuICAgICAgICB2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIExvY2FsQ29sbGVjdGlvbi5fZi5fdHlwZSh2YWx1ZSkgPT09IG9wZXJhbmRcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcbiAgJGJpdHNBbGxTZXQ6IHtcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQpIHtcbiAgICAgIGNvbnN0IG1hc2sgPSBnZXRPcGVyYW5kQml0bWFzayhvcGVyYW5kLCAnJGJpdHNBbGxTZXQnKTtcbiAgICAgIHJldHVybiB2YWx1ZSA9PiB7XG4gICAgICAgIGNvbnN0IGJpdG1hc2sgPSBnZXRWYWx1ZUJpdG1hc2sodmFsdWUsIG1hc2subGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIGJpdG1hc2sgJiYgbWFzay5ldmVyeSgoYnl0ZSwgaSkgPT4gKGJpdG1hc2tbaV0gJiBieXRlKSA9PT0gYnl0ZSk7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG4gICRiaXRzQW55U2V0OiB7XG4gICAgY29tcGlsZUVsZW1lbnRTZWxlY3RvcihvcGVyYW5kKSB7XG4gICAgICBjb25zdCBtYXNrID0gZ2V0T3BlcmFuZEJpdG1hc2sob3BlcmFuZCwgJyRiaXRzQW55U2V0Jyk7XG4gICAgICByZXR1cm4gdmFsdWUgPT4ge1xuICAgICAgICBjb25zdCBiaXRtYXNrID0gZ2V0VmFsdWVCaXRtYXNrKHZhbHVlLCBtYXNrLmxlbmd0aCk7XG4gICAgICAgIHJldHVybiBiaXRtYXNrICYmIG1hc2suc29tZSgoYnl0ZSwgaSkgPT4gKH5iaXRtYXNrW2ldICYgYnl0ZSkgIT09IGJ5dGUpO1xuICAgICAgfTtcbiAgICB9LFxuICB9LFxuICAkYml0c0FsbENsZWFyOiB7XG4gICAgY29tcGlsZUVsZW1lbnRTZWxlY3RvcihvcGVyYW5kKSB7XG4gICAgICBjb25zdCBtYXNrID0gZ2V0T3BlcmFuZEJpdG1hc2sob3BlcmFuZCwgJyRiaXRzQWxsQ2xlYXInKTtcbiAgICAgIHJldHVybiB2YWx1ZSA9PiB7XG4gICAgICAgIGNvbnN0IGJpdG1hc2sgPSBnZXRWYWx1ZUJpdG1hc2sodmFsdWUsIG1hc2subGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIGJpdG1hc2sgJiYgbWFzay5ldmVyeSgoYnl0ZSwgaSkgPT4gIShiaXRtYXNrW2ldICYgYnl0ZSkpO1xuICAgICAgfTtcbiAgICB9LFxuICB9LFxuICAkYml0c0FueUNsZWFyOiB7XG4gICAgY29tcGlsZUVsZW1lbnRTZWxlY3RvcihvcGVyYW5kKSB7XG4gICAgICBjb25zdCBtYXNrID0gZ2V0T3BlcmFuZEJpdG1hc2sob3BlcmFuZCwgJyRiaXRzQW55Q2xlYXInKTtcbiAgICAgIHJldHVybiB2YWx1ZSA9PiB7XG4gICAgICAgIGNvbnN0IGJpdG1hc2sgPSBnZXRWYWx1ZUJpdG1hc2sodmFsdWUsIG1hc2subGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIGJpdG1hc2sgJiYgbWFzay5zb21lKChieXRlLCBpKSA9PiAoYml0bWFza1tpXSAmIGJ5dGUpICE9PSBieXRlKTtcbiAgICAgIH07XG4gICAgfSxcbiAgfSxcbiAgJHJlZ2V4OiB7XG4gICAgY29tcGlsZUVsZW1lbnRTZWxlY3RvcihvcGVyYW5kLCB2YWx1ZVNlbGVjdG9yKSB7XG4gICAgICBpZiAoISh0eXBlb2Ygb3BlcmFuZCA9PT0gJ3N0cmluZycgfHwgb3BlcmFuZCBpbnN0YW5jZW9mIFJlZ0V4cCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IE1pbmlNb25nb1F1ZXJ5RXJyb3IoJyRyZWdleCBoYXMgdG8gYmUgYSBzdHJpbmcgb3IgUmVnRXhwJyk7XG4gICAgICB9XG5cbiAgICAgIGxldCByZWdleHA7XG4gICAgICBpZiAodmFsdWVTZWxlY3Rvci4kb3B0aW9ucyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIE9wdGlvbnMgcGFzc2VkIGluICRvcHRpb25zIChldmVuIHRoZSBlbXB0eSBzdHJpbmcpIGFsd2F5cyBvdmVycmlkZXNcbiAgICAgICAgLy8gb3B0aW9ucyBpbiB0aGUgUmVnRXhwIG9iamVjdCBpdHNlbGYuXG5cbiAgICAgICAgLy8gQmUgY2xlYXIgdGhhdCB3ZSBvbmx5IHN1cHBvcnQgdGhlIEpTLXN1cHBvcnRlZCBvcHRpb25zLCBub3QgZXh0ZW5kZWRcbiAgICAgICAgLy8gb25lcyAoZWcsIE1vbmdvIHN1cHBvcnRzIHggYW5kIHMpLiBJZGVhbGx5IHdlIHdvdWxkIGltcGxlbWVudCB4IGFuZCBzXG4gICAgICAgIC8vIGJ5IHRyYW5zZm9ybWluZyB0aGUgcmVnZXhwLCBidXQgbm90IHRvZGF5Li4uXG4gICAgICAgIGlmICgvW15naW1dLy50ZXN0KHZhbHVlU2VsZWN0b3IuJG9wdGlvbnMpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IE1pbmlNb25nb1F1ZXJ5RXJyb3IoJ09ubHkgdGhlIGksIG0sIGFuZCBnIHJlZ2V4cCBvcHRpb25zIGFyZSBzdXBwb3J0ZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNvdXJjZSA9IG9wZXJhbmQgaW5zdGFuY2VvZiBSZWdFeHAgPyBvcGVyYW5kLnNvdXJjZSA6IG9wZXJhbmQ7XG4gICAgICAgIHJlZ2V4cCA9IG5ldyBSZWdFeHAoc291cmNlLCB2YWx1ZVNlbGVjdG9yLiRvcHRpb25zKTtcbiAgICAgIH0gZWxzZSBpZiAob3BlcmFuZCBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICByZWdleHAgPSBvcGVyYW5kO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVnZXhwID0gbmV3IFJlZ0V4cChvcGVyYW5kKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlZ2V4cEVsZW1lbnRNYXRjaGVyKHJlZ2V4cCk7XG4gICAgfSxcbiAgfSxcbiAgJGVsZW1NYXRjaDoge1xuICAgIGRvbnRFeHBhbmRMZWFmQXJyYXlzOiB0cnVlLFxuICAgIGNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCwgdmFsdWVTZWxlY3RvciwgbWF0Y2hlcikge1xuICAgICAgaWYgKCFMb2NhbENvbGxlY3Rpb24uX2lzUGxhaW5PYmplY3Qob3BlcmFuZCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IE1pbmlNb25nb1F1ZXJ5RXJyb3IoJyRlbGVtTWF0Y2ggbmVlZCBhbiBvYmplY3QnKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaXNEb2NNYXRjaGVyID0gIWlzT3BlcmF0b3JPYmplY3QoXG4gICAgICAgIE9iamVjdC5rZXlzKG9wZXJhbmQpXG4gICAgICAgICAgLmZpbHRlcihrZXkgPT4gIWhhc093bi5jYWxsKExPR0lDQUxfT1BFUkFUT1JTLCBrZXkpKVxuICAgICAgICAgIC5yZWR1Y2UoKGEsIGIpID0+IE9iamVjdC5hc3NpZ24oYSwge1tiXTogb3BlcmFuZFtiXX0pLCB7fSksXG4gICAgICAgIHRydWUpO1xuXG4gICAgICBsZXQgc3ViTWF0Y2hlcjtcbiAgICAgIGlmIChpc0RvY01hdGNoZXIpIHtcbiAgICAgICAgLy8gVGhpcyBpcyBOT1QgdGhlIHNhbWUgYXMgY29tcGlsZVZhbHVlU2VsZWN0b3Iob3BlcmFuZCksIGFuZCBub3QganVzdFxuICAgICAgICAvLyBiZWNhdXNlIG9mIHRoZSBzbGlnaHRseSBkaWZmZXJlbnQgY2FsbGluZyBjb252ZW50aW9uLlxuICAgICAgICAvLyB7JGVsZW1NYXRjaDoge3g6IDN9fSBtZWFucyBcImFuIGVsZW1lbnQgaGFzIGEgZmllbGQgeDozXCIsIG5vdFxuICAgICAgICAvLyBcImNvbnNpc3RzIG9ubHkgb2YgYSBmaWVsZCB4OjNcIi4gQWxzbywgcmVnZXhwcyBhbmQgc3ViLSQgYXJlIGFsbG93ZWQuXG4gICAgICAgIHN1Yk1hdGNoZXIgPVxuICAgICAgICAgIGNvbXBpbGVEb2N1bWVudFNlbGVjdG9yKG9wZXJhbmQsIG1hdGNoZXIsIHtpbkVsZW1NYXRjaDogdHJ1ZX0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3ViTWF0Y2hlciA9IGNvbXBpbGVWYWx1ZVNlbGVjdG9yKG9wZXJhbmQsIG1hdGNoZXIpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdmFsdWUgPT4ge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7ICsraSkge1xuICAgICAgICAgIGNvbnN0IGFycmF5RWxlbWVudCA9IHZhbHVlW2ldO1xuICAgICAgICAgIGxldCBhcmc7XG4gICAgICAgICAgaWYgKGlzRG9jTWF0Y2hlcikge1xuICAgICAgICAgICAgLy8gV2UgY2FuIG9ubHkgbWF0Y2ggeyRlbGVtTWF0Y2g6IHtiOiAzfX0gYWdhaW5zdCBvYmplY3RzLlxuICAgICAgICAgICAgLy8gKFdlIGNhbiBhbHNvIG1hdGNoIGFnYWluc3QgYXJyYXlzLCBpZiB0aGVyZSdzIG51bWVyaWMgaW5kaWNlcyxcbiAgICAgICAgICAgIC8vIGVnIHskZWxlbU1hdGNoOiB7JzAuYic6IDN9fSBvciB7JGVsZW1NYXRjaDogezA6IDN9fS4pXG4gICAgICAgICAgICBpZiAoIWlzSW5kZXhhYmxlKGFycmF5RWxlbWVudCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhcmcgPSBhcnJheUVsZW1lbnQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGRvbnRJdGVyYXRlIGVuc3VyZXMgdGhhdCB7YTogeyRlbGVtTWF0Y2g6IHskZ3Q6IDV9fX0gbWF0Y2hlc1xuICAgICAgICAgICAgLy8ge2E6IFs4XX0gYnV0IG5vdCB7YTogW1s4XV19XG4gICAgICAgICAgICBhcmcgPSBbe3ZhbHVlOiBhcnJheUVsZW1lbnQsIGRvbnRJdGVyYXRlOiB0cnVlfV07XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFhYWCBzdXBwb3J0ICRuZWFyIGluICRlbGVtTWF0Y2ggYnkgcHJvcGFnYXRpbmcgJGRpc3RhbmNlP1xuICAgICAgICAgIGlmIChzdWJNYXRjaGVyKGFyZykucmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gaTsgLy8gc3BlY2lhbGx5IHVuZGVyc3Rvb2QgdG8gbWVhbiBcInVzZSBhcyBhcnJheUluZGljZXNcIlxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH07XG4gICAgfSxcbiAgfSxcbn07XG5cbi8vIE9wZXJhdG9ycyB0aGF0IGFwcGVhciBhdCB0aGUgdG9wIGxldmVsIG9mIGEgZG9jdW1lbnQgc2VsZWN0b3IuXG5jb25zdCBMT0dJQ0FMX09QRVJBVE9SUyA9IHtcbiAgJGFuZChzdWJTZWxlY3RvciwgbWF0Y2hlciwgaW5FbGVtTWF0Y2gpIHtcbiAgICByZXR1cm4gYW5kRG9jdW1lbnRNYXRjaGVycyhcbiAgICAgIGNvbXBpbGVBcnJheU9mRG9jdW1lbnRTZWxlY3RvcnMoc3ViU2VsZWN0b3IsIG1hdGNoZXIsIGluRWxlbU1hdGNoKVxuICAgICk7XG4gIH0sXG5cbiAgJG9yKHN1YlNlbGVjdG9yLCBtYXRjaGVyLCBpbkVsZW1NYXRjaCkge1xuICAgIGNvbnN0IG1hdGNoZXJzID0gY29tcGlsZUFycmF5T2ZEb2N1bWVudFNlbGVjdG9ycyhcbiAgICAgIHN1YlNlbGVjdG9yLFxuICAgICAgbWF0Y2hlcixcbiAgICAgIGluRWxlbU1hdGNoXG4gICAgKTtcblxuICAgIC8vIFNwZWNpYWwgY2FzZTogaWYgdGhlcmUgaXMgb25seSBvbmUgbWF0Y2hlciwgdXNlIGl0IGRpcmVjdGx5LCAqcHJlc2VydmluZypcbiAgICAvLyBhbnkgYXJyYXlJbmRpY2VzIGl0IHJldHVybnMuXG4gICAgaWYgKG1hdGNoZXJzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgcmV0dXJuIG1hdGNoZXJzWzBdO1xuICAgIH1cblxuICAgIHJldHVybiBkb2MgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gbWF0Y2hlcnMuc29tZShmbiA9PiBmbihkb2MpLnJlc3VsdCk7XG4gICAgICAvLyAkb3IgZG9lcyBOT1Qgc2V0IGFycmF5SW5kaWNlcyB3aGVuIGl0IGhhcyBtdWx0aXBsZVxuICAgICAgLy8gc3ViLWV4cHJlc3Npb25zLiAoVGVzdGVkIGFnYWluc3QgTW9uZ29EQi4pXG4gICAgICByZXR1cm4ge3Jlc3VsdH07XG4gICAgfTtcbiAgfSxcblxuICAkbm9yKHN1YlNlbGVjdG9yLCBtYXRjaGVyLCBpbkVsZW1NYXRjaCkge1xuICAgIGNvbnN0IG1hdGNoZXJzID0gY29tcGlsZUFycmF5T2ZEb2N1bWVudFNlbGVjdG9ycyhcbiAgICAgIHN1YlNlbGVjdG9yLFxuICAgICAgbWF0Y2hlcixcbiAgICAgIGluRWxlbU1hdGNoXG4gICAgKTtcbiAgICByZXR1cm4gZG9jID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IG1hdGNoZXJzLmV2ZXJ5KGZuID0+ICFmbihkb2MpLnJlc3VsdCk7XG4gICAgICAvLyBOZXZlciBzZXQgYXJyYXlJbmRpY2VzLCBiZWNhdXNlIHdlIG9ubHkgbWF0Y2ggaWYgbm90aGluZyBpbiBwYXJ0aWN1bGFyXG4gICAgICAvLyAnbWF0Y2hlZCcgKGFuZCBiZWNhdXNlIHRoaXMgaXMgY29uc2lzdGVudCB3aXRoIE1vbmdvREIpLlxuICAgICAgcmV0dXJuIHtyZXN1bHR9O1xuICAgIH07XG4gIH0sXG5cbiAgJHdoZXJlKHNlbGVjdG9yVmFsdWUsIG1hdGNoZXIpIHtcbiAgICAvLyBSZWNvcmQgdGhhdCAqYW55KiBwYXRoIG1heSBiZSB1c2VkLlxuICAgIG1hdGNoZXIuX3JlY29yZFBhdGhVc2VkKCcnKTtcbiAgICBtYXRjaGVyLl9oYXNXaGVyZSA9IHRydWU7XG5cbiAgICBpZiAoIShzZWxlY3RvclZhbHVlIGluc3RhbmNlb2YgRnVuY3Rpb24pKSB7XG4gICAgICAvLyBYWFggTW9uZ29EQiBzZWVtcyB0byBoYXZlIG1vcmUgY29tcGxleCBsb2dpYyB0byBkZWNpZGUgd2hlcmUgb3Igb3Igbm90XG4gICAgICAvLyB0byBhZGQgJ3JldHVybic7IG5vdCBzdXJlIGV4YWN0bHkgd2hhdCBpdCBpcy5cbiAgICAgIHNlbGVjdG9yVmFsdWUgPSBGdW5jdGlvbignb2JqJywgYHJldHVybiAke3NlbGVjdG9yVmFsdWV9YCk7XG4gICAgfVxuXG4gICAgLy8gV2UgbWFrZSB0aGUgZG9jdW1lbnQgYXZhaWxhYmxlIGFzIGJvdGggYHRoaXNgIGFuZCBgb2JqYC5cbiAgICAvLyAvLyBYWFggbm90IHN1cmUgd2hhdCB3ZSBzaG91bGQgZG8gaWYgdGhpcyB0aHJvd3NcbiAgICByZXR1cm4gZG9jID0+ICh7cmVzdWx0OiBzZWxlY3RvclZhbHVlLmNhbGwoZG9jLCBkb2MpfSk7XG4gIH0sXG5cbiAgLy8gVGhpcyBpcyBqdXN0IHVzZWQgYXMgYSBjb21tZW50IGluIHRoZSBxdWVyeSAoaW4gTW9uZ29EQiwgaXQgYWxzbyBlbmRzIHVwIGluXG4gIC8vIHF1ZXJ5IGxvZ3MpOyBpdCBoYXMgbm8gZWZmZWN0IG9uIHRoZSBhY3R1YWwgc2VsZWN0aW9uLlxuICAkY29tbWVudCgpIHtcbiAgICByZXR1cm4gKCkgPT4gKHtyZXN1bHQ6IHRydWV9KTtcbiAgfSxcbn07XG5cbi8vIE9wZXJhdG9ycyB0aGF0ICh1bmxpa2UgTE9HSUNBTF9PUEVSQVRPUlMpIHBlcnRhaW4gdG8gaW5kaXZpZHVhbCBwYXRocyBpbiBhXG4vLyBkb2N1bWVudCwgYnV0ICh1bmxpa2UgRUxFTUVOVF9PUEVSQVRPUlMpIGRvIG5vdCBoYXZlIGEgc2ltcGxlIGRlZmluaXRpb24gYXNcbi8vIFwibWF0Y2ggZWFjaCBicmFuY2hlZCB2YWx1ZSBpbmRlcGVuZGVudGx5IGFuZCBjb21iaW5lIHdpdGhcbi8vIGNvbnZlcnRFbGVtZW50TWF0Y2hlclRvQnJhbmNoZWRNYXRjaGVyXCIuXG5jb25zdCBWQUxVRV9PUEVSQVRPUlMgPSB7XG4gICRlcShvcGVyYW5kKSB7XG4gICAgcmV0dXJuIGNvbnZlcnRFbGVtZW50TWF0Y2hlclRvQnJhbmNoZWRNYXRjaGVyKFxuICAgICAgZXF1YWxpdHlFbGVtZW50TWF0Y2hlcihvcGVyYW5kKVxuICAgICk7XG4gIH0sXG4gICRub3Qob3BlcmFuZCwgdmFsdWVTZWxlY3RvciwgbWF0Y2hlcikge1xuICAgIHJldHVybiBpbnZlcnRCcmFuY2hlZE1hdGNoZXIoY29tcGlsZVZhbHVlU2VsZWN0b3Iob3BlcmFuZCwgbWF0Y2hlcikpO1xuICB9LFxuICAkbmUob3BlcmFuZCkge1xuICAgIHJldHVybiBpbnZlcnRCcmFuY2hlZE1hdGNoZXIoXG4gICAgICBjb252ZXJ0RWxlbWVudE1hdGNoZXJUb0JyYW5jaGVkTWF0Y2hlcihlcXVhbGl0eUVsZW1lbnRNYXRjaGVyKG9wZXJhbmQpKVxuICAgICk7XG4gIH0sXG4gICRuaW4ob3BlcmFuZCkge1xuICAgIHJldHVybiBpbnZlcnRCcmFuY2hlZE1hdGNoZXIoXG4gICAgICBjb252ZXJ0RWxlbWVudE1hdGNoZXJUb0JyYW5jaGVkTWF0Y2hlcihcbiAgICAgICAgRUxFTUVOVF9PUEVSQVRPUlMuJGluLmNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZClcbiAgICAgIClcbiAgICApO1xuICB9LFxuICAkZXhpc3RzKG9wZXJhbmQpIHtcbiAgICBjb25zdCBleGlzdHMgPSBjb252ZXJ0RWxlbWVudE1hdGNoZXJUb0JyYW5jaGVkTWF0Y2hlcihcbiAgICAgIHZhbHVlID0+IHZhbHVlICE9PSB1bmRlZmluZWRcbiAgICApO1xuICAgIHJldHVybiBvcGVyYW5kID8gZXhpc3RzIDogaW52ZXJ0QnJhbmNoZWRNYXRjaGVyKGV4aXN0cyk7XG4gIH0sXG4gIC8vICRvcHRpb25zIGp1c3QgcHJvdmlkZXMgb3B0aW9ucyBmb3IgJHJlZ2V4OyBpdHMgbG9naWMgaXMgaW5zaWRlICRyZWdleFxuICAkb3B0aW9ucyhvcGVyYW5kLCB2YWx1ZVNlbGVjdG9yKSB7XG4gICAgaWYgKCFoYXNPd24uY2FsbCh2YWx1ZVNlbGVjdG9yLCAnJHJlZ2V4JykpIHtcbiAgICAgIHRocm93IG5ldyBNaW5pTW9uZ29RdWVyeUVycm9yKCckb3B0aW9ucyBuZWVkcyBhICRyZWdleCcpO1xuICAgIH1cblxuICAgIHJldHVybiBldmVyeXRoaW5nTWF0Y2hlcjtcbiAgfSxcbiAgLy8gJG1heERpc3RhbmNlIGlzIGJhc2ljYWxseSBhbiBhcmd1bWVudCB0byAkbmVhclxuICAkbWF4RGlzdGFuY2Uob3BlcmFuZCwgdmFsdWVTZWxlY3Rvcikge1xuICAgIGlmICghdmFsdWVTZWxlY3Rvci4kbmVhcikge1xuICAgICAgdGhyb3cgbmV3IE1pbmlNb25nb1F1ZXJ5RXJyb3IoJyRtYXhEaXN0YW5jZSBuZWVkcyBhICRuZWFyJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGV2ZXJ5dGhpbmdNYXRjaGVyO1xuICB9LFxuICAkYWxsKG9wZXJhbmQsIHZhbHVlU2VsZWN0b3IsIG1hdGNoZXIpIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkob3BlcmFuZCkpIHtcbiAgICAgIHRocm93IG5ldyBNaW5pTW9uZ29RdWVyeUVycm9yKCckYWxsIHJlcXVpcmVzIGFycmF5Jyk7XG4gICAgfVxuXG4gICAgLy8gTm90IHN1cmUgd2h5LCBidXQgdGhpcyBzZWVtcyB0byBiZSB3aGF0IE1vbmdvREIgZG9lcy5cbiAgICBpZiAob3BlcmFuZC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBub3RoaW5nTWF0Y2hlcjtcbiAgICB9XG5cbiAgICBjb25zdCBicmFuY2hlZE1hdGNoZXJzID0gb3BlcmFuZC5tYXAoY3JpdGVyaW9uID0+IHtcbiAgICAgIC8vIFhYWCBoYW5kbGUgJGFsbC8kZWxlbU1hdGNoIGNvbWJpbmF0aW9uXG4gICAgICBpZiAoaXNPcGVyYXRvck9iamVjdChjcml0ZXJpb24pKSB7XG4gICAgICAgIHRocm93IG5ldyBNaW5pTW9uZ29RdWVyeUVycm9yKCdubyAkIGV4cHJlc3Npb25zIGluICRhbGwnKTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhpcyBpcyBhbHdheXMgYSByZWdleHAgb3IgZXF1YWxpdHkgc2VsZWN0b3IuXG4gICAgICByZXR1cm4gY29tcGlsZVZhbHVlU2VsZWN0b3IoY3JpdGVyaW9uLCBtYXRjaGVyKTtcbiAgICB9KTtcblxuICAgIC8vIGFuZEJyYW5jaGVkTWF0Y2hlcnMgZG9lcyBOT1QgcmVxdWlyZSBhbGwgc2VsZWN0b3JzIHRvIHJldHVybiB0cnVlIG9uIHRoZVxuICAgIC8vIFNBTUUgYnJhbmNoLlxuICAgIHJldHVybiBhbmRCcmFuY2hlZE1hdGNoZXJzKGJyYW5jaGVkTWF0Y2hlcnMpO1xuICB9LFxuICAkbmVhcihvcGVyYW5kLCB2YWx1ZVNlbGVjdG9yLCBtYXRjaGVyLCBpc1Jvb3QpIHtcbiAgICBpZiAoIWlzUm9vdCkge1xuICAgICAgdGhyb3cgbmV3IE1pbmlNb25nb1F1ZXJ5RXJyb3IoJyRuZWFyIGNhblxcJ3QgYmUgaW5zaWRlIGFub3RoZXIgJCBvcGVyYXRvcicpO1xuICAgIH1cblxuICAgIG1hdGNoZXIuX2hhc0dlb1F1ZXJ5ID0gdHJ1ZTtcblxuICAgIC8vIFRoZXJlIGFyZSB0d28ga2luZHMgb2YgZ2VvZGF0YSBpbiBNb25nb0RCOiBsZWdhY3kgY29vcmRpbmF0ZSBwYWlycyBhbmRcbiAgICAvLyBHZW9KU09OLiBUaGV5IHVzZSBkaWZmZXJlbnQgZGlzdGFuY2UgbWV0cmljcywgdG9vLiBHZW9KU09OIHF1ZXJpZXMgYXJlXG4gICAgLy8gbWFya2VkIHdpdGggYSAkZ2VvbWV0cnkgcHJvcGVydHksIHRob3VnaCBsZWdhY3kgY29vcmRpbmF0ZXMgY2FuIGJlXG4gICAgLy8gbWF0Y2hlZCB1c2luZyAkZ2VvbWV0cnkuXG4gICAgbGV0IG1heERpc3RhbmNlLCBwb2ludCwgZGlzdGFuY2U7XG4gICAgaWYgKExvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdChvcGVyYW5kKSAmJiBoYXNPd24uY2FsbChvcGVyYW5kLCAnJGdlb21ldHJ5JykpIHtcbiAgICAgIC8vIEdlb0pTT04gXCIyZHNwaGVyZVwiIG1vZGUuXG4gICAgICBtYXhEaXN0YW5jZSA9IG9wZXJhbmQuJG1heERpc3RhbmNlO1xuICAgICAgcG9pbnQgPSBvcGVyYW5kLiRnZW9tZXRyeTtcbiAgICAgIGRpc3RhbmNlID0gdmFsdWUgPT4ge1xuICAgICAgICAvLyBYWFg6IGZvciBub3csIHdlIGRvbid0IGNhbGN1bGF0ZSB0aGUgYWN0dWFsIGRpc3RhbmNlIGJldHdlZW4sIHNheSxcbiAgICAgICAgLy8gcG9seWdvbiBhbmQgY2lyY2xlLiBJZiBwZW9wbGUgY2FyZSBhYm91dCB0aGlzIHVzZS1jYXNlIGl0IHdpbGwgZ2V0XG4gICAgICAgIC8vIGEgcHJpb3JpdHkuXG4gICAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdmFsdWUudHlwZSkge1xuICAgICAgICAgIHJldHVybiBHZW9KU09OLnBvaW50RGlzdGFuY2UoXG4gICAgICAgICAgICBwb2ludCxcbiAgICAgICAgICAgIHt0eXBlOiAnUG9pbnQnLCBjb29yZGluYXRlczogcG9pbnRUb0FycmF5KHZhbHVlKX1cbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHZhbHVlLnR5cGUgPT09ICdQb2ludCcpIHtcbiAgICAgICAgICByZXR1cm4gR2VvSlNPTi5wb2ludERpc3RhbmNlKHBvaW50LCB2YWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gR2VvSlNPTi5nZW9tZXRyeVdpdGhpblJhZGl1cyh2YWx1ZSwgcG9pbnQsIG1heERpc3RhbmNlKVxuICAgICAgICAgID8gMFxuICAgICAgICAgIDogbWF4RGlzdGFuY2UgKyAxO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgbWF4RGlzdGFuY2UgPSB2YWx1ZVNlbGVjdG9yLiRtYXhEaXN0YW5jZTtcblxuICAgICAgaWYgKCFpc0luZGV4YWJsZShvcGVyYW5kKSkge1xuICAgICAgICB0aHJvdyBuZXcgTWluaU1vbmdvUXVlcnlFcnJvcignJG5lYXIgYXJndW1lbnQgbXVzdCBiZSBjb29yZGluYXRlIHBhaXIgb3IgR2VvSlNPTicpO1xuICAgICAgfVxuXG4gICAgICBwb2ludCA9IHBvaW50VG9BcnJheShvcGVyYW5kKTtcblxuICAgICAgZGlzdGFuY2UgPSB2YWx1ZSA9PiB7XG4gICAgICAgIGlmICghaXNJbmRleGFibGUodmFsdWUpKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZGlzdGFuY2VDb29yZGluYXRlUGFpcnMocG9pbnQsIHZhbHVlKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGJyYW5jaGVkVmFsdWVzID0+IHtcbiAgICAgIC8vIFRoZXJlIG1pZ2h0IGJlIG11bHRpcGxlIHBvaW50cyBpbiB0aGUgZG9jdW1lbnQgdGhhdCBtYXRjaCB0aGUgZ2l2ZW5cbiAgICAgIC8vIGZpZWxkLiBPbmx5IG9uZSBvZiB0aGVtIG5lZWRzIHRvIGJlIHdpdGhpbiAkbWF4RGlzdGFuY2UsIGJ1dCB3ZSBuZWVkIHRvXG4gICAgICAvLyBldmFsdWF0ZSBhbGwgb2YgdGhlbSBhbmQgdXNlIHRoZSBuZWFyZXN0IG9uZSBmb3IgdGhlIGltcGxpY2l0IHNvcnRcbiAgICAgIC8vIHNwZWNpZmllci4gKFRoYXQncyB3aHkgd2UgY2FuJ3QganVzdCB1c2UgRUxFTUVOVF9PUEVSQVRPUlMgaGVyZS4pXG4gICAgICAvL1xuICAgICAgLy8gTm90ZTogVGhpcyBkaWZmZXJzIGZyb20gTW9uZ29EQidzIGltcGxlbWVudGF0aW9uLCB3aGVyZSBhIGRvY3VtZW50IHdpbGxcbiAgICAgIC8vIGFjdHVhbGx5IHNob3cgdXAgKm11bHRpcGxlIHRpbWVzKiBpbiB0aGUgcmVzdWx0IHNldCwgd2l0aCBvbmUgZW50cnkgZm9yXG4gICAgICAvLyBlYWNoIHdpdGhpbi0kbWF4RGlzdGFuY2UgYnJhbmNoaW5nIHBvaW50LlxuICAgICAgY29uc3QgcmVzdWx0ID0ge3Jlc3VsdDogZmFsc2V9O1xuICAgICAgZXhwYW5kQXJyYXlzSW5CcmFuY2hlcyhicmFuY2hlZFZhbHVlcykuZXZlcnkoYnJhbmNoID0+IHtcbiAgICAgICAgLy8gaWYgb3BlcmF0aW9uIGlzIGFuIHVwZGF0ZSwgZG9uJ3Qgc2tpcCBicmFuY2hlcywganVzdCByZXR1cm4gdGhlIGZpcnN0XG4gICAgICAgIC8vIG9uZSAoIzM1OTkpXG4gICAgICAgIGxldCBjdXJEaXN0YW5jZTtcbiAgICAgICAgaWYgKCFtYXRjaGVyLl9pc1VwZGF0ZSkge1xuICAgICAgICAgIGlmICghKHR5cGVvZiBicmFuY2gudmFsdWUgPT09ICdvYmplY3QnKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY3VyRGlzdGFuY2UgPSBkaXN0YW5jZShicmFuY2gudmFsdWUpO1xuXG4gICAgICAgICAgLy8gU2tpcCBicmFuY2hlcyB0aGF0IGFyZW4ndCByZWFsIHBvaW50cyBvciBhcmUgdG9vIGZhciBhd2F5LlxuICAgICAgICAgIGlmIChjdXJEaXN0YW5jZSA9PT0gbnVsbCB8fCBjdXJEaXN0YW5jZSA+IG1heERpc3RhbmNlKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBTa2lwIGFueXRoaW5nIHRoYXQncyBhIHRpZS5cbiAgICAgICAgICBpZiAocmVzdWx0LmRpc3RhbmNlICE9PSB1bmRlZmluZWQgJiYgcmVzdWx0LmRpc3RhbmNlIDw9IGN1ckRpc3RhbmNlKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXN1bHQucmVzdWx0ID0gdHJ1ZTtcbiAgICAgICAgcmVzdWx0LmRpc3RhbmNlID0gY3VyRGlzdGFuY2U7XG5cbiAgICAgICAgaWYgKGJyYW5jaC5hcnJheUluZGljZXMpIHtcbiAgICAgICAgICByZXN1bHQuYXJyYXlJbmRpY2VzID0gYnJhbmNoLmFycmF5SW5kaWNlcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgcmVzdWx0LmFycmF5SW5kaWNlcztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAhbWF0Y2hlci5faXNVcGRhdGU7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9LFxufTtcblxuLy8gTkI6IFdlIGFyZSBjaGVhdGluZyBhbmQgdXNpbmcgdGhpcyBmdW5jdGlvbiB0byBpbXBsZW1lbnQgJ0FORCcgZm9yIGJvdGhcbi8vICdkb2N1bWVudCBtYXRjaGVycycgYW5kICdicmFuY2hlZCBtYXRjaGVycycuIFRoZXkgYm90aCByZXR1cm4gcmVzdWx0IG9iamVjdHNcbi8vIGJ1dCB0aGUgYXJndW1lbnQgaXMgZGlmZmVyZW50OiBmb3IgdGhlIGZvcm1lciBpdCdzIGEgd2hvbGUgZG9jLCB3aGVyZWFzIGZvclxuLy8gdGhlIGxhdHRlciBpdCdzIGFuIGFycmF5IG9mICdicmFuY2hlZCB2YWx1ZXMnLlxuZnVuY3Rpb24gYW5kU29tZU1hdGNoZXJzKHN1Yk1hdGNoZXJzKSB7XG4gIGlmIChzdWJNYXRjaGVycy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gZXZlcnl0aGluZ01hdGNoZXI7XG4gIH1cblxuICBpZiAoc3ViTWF0Y2hlcnMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIHN1Yk1hdGNoZXJzWzBdO1xuICB9XG5cbiAgcmV0dXJuIGRvY09yQnJhbmNoZXMgPT4ge1xuICAgIGNvbnN0IG1hdGNoID0ge307XG4gICAgbWF0Y2gucmVzdWx0ID0gc3ViTWF0Y2hlcnMuZXZlcnkoZm4gPT4ge1xuICAgICAgY29uc3Qgc3ViUmVzdWx0ID0gZm4oZG9jT3JCcmFuY2hlcyk7XG5cbiAgICAgIC8vIENvcHkgYSAnZGlzdGFuY2UnIG51bWJlciBvdXQgb2YgdGhlIGZpcnN0IHN1Yi1tYXRjaGVyIHRoYXQgaGFzXG4gICAgICAvLyBvbmUuIFllcywgdGhpcyBtZWFucyB0aGF0IGlmIHRoZXJlIGFyZSBtdWx0aXBsZSAkbmVhciBmaWVsZHMgaW4gYVxuICAgICAgLy8gcXVlcnksIHNvbWV0aGluZyBhcmJpdHJhcnkgaGFwcGVuczsgdGhpcyBhcHBlYXJzIHRvIGJlIGNvbnNpc3RlbnQgd2l0aFxuICAgICAgLy8gTW9uZ28uXG4gICAgICBpZiAoc3ViUmVzdWx0LnJlc3VsdCAmJlxuICAgICAgICAgIHN1YlJlc3VsdC5kaXN0YW5jZSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgbWF0Y2guZGlzdGFuY2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBtYXRjaC5kaXN0YW5jZSA9IHN1YlJlc3VsdC5kaXN0YW5jZTtcbiAgICAgIH1cblxuICAgICAgLy8gU2ltaWxhcmx5LCBwcm9wYWdhdGUgYXJyYXlJbmRpY2VzIGZyb20gc3ViLW1hdGNoZXJzLi4uIGJ1dCB0byBtYXRjaFxuICAgICAgLy8gTW9uZ29EQiBiZWhhdmlvciwgdGhpcyB0aW1lIHRoZSAqbGFzdCogc3ViLW1hdGNoZXIgd2l0aCBhcnJheUluZGljZXNcbiAgICAgIC8vIHdpbnMuXG4gICAgICBpZiAoc3ViUmVzdWx0LnJlc3VsdCAmJiBzdWJSZXN1bHQuYXJyYXlJbmRpY2VzKSB7XG4gICAgICAgIG1hdGNoLmFycmF5SW5kaWNlcyA9IHN1YlJlc3VsdC5hcnJheUluZGljZXM7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzdWJSZXN1bHQucmVzdWx0O1xuICAgIH0pO1xuXG4gICAgLy8gSWYgd2UgZGlkbid0IGFjdHVhbGx5IG1hdGNoLCBmb3JnZXQgYW55IGV4dHJhIG1ldGFkYXRhIHdlIGNhbWUgdXAgd2l0aC5cbiAgICBpZiAoIW1hdGNoLnJlc3VsdCkge1xuICAgICAgZGVsZXRlIG1hdGNoLmRpc3RhbmNlO1xuICAgICAgZGVsZXRlIG1hdGNoLmFycmF5SW5kaWNlcztcbiAgICB9XG5cbiAgICByZXR1cm4gbWF0Y2g7XG4gIH07XG59XG5cbmNvbnN0IGFuZERvY3VtZW50TWF0Y2hlcnMgPSBhbmRTb21lTWF0Y2hlcnM7XG5jb25zdCBhbmRCcmFuY2hlZE1hdGNoZXJzID0gYW5kU29tZU1hdGNoZXJzO1xuXG5mdW5jdGlvbiBjb21waWxlQXJyYXlPZkRvY3VtZW50U2VsZWN0b3JzKHNlbGVjdG9ycywgbWF0Y2hlciwgaW5FbGVtTWF0Y2gpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KHNlbGVjdG9ycykgfHwgc2VsZWN0b3JzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBNaW5pTW9uZ29RdWVyeUVycm9yKCckYW5kLyRvci8kbm9yIG11c3QgYmUgbm9uZW1wdHkgYXJyYXknKTtcbiAgfVxuXG4gIHJldHVybiBzZWxlY3RvcnMubWFwKHN1YlNlbGVjdG9yID0+IHtcbiAgICBpZiAoIUxvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdChzdWJTZWxlY3RvcikpIHtcbiAgICAgIHRocm93IG5ldyBNaW5pTW9uZ29RdWVyeUVycm9yKCckb3IvJGFuZC8kbm9yIGVudHJpZXMgbmVlZCB0byBiZSBmdWxsIG9iamVjdHMnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29tcGlsZURvY3VtZW50U2VsZWN0b3Ioc3ViU2VsZWN0b3IsIG1hdGNoZXIsIHtpbkVsZW1NYXRjaH0pO1xuICB9KTtcbn1cblxuLy8gVGFrZXMgaW4gYSBzZWxlY3RvciB0aGF0IGNvdWxkIG1hdGNoIGEgZnVsbCBkb2N1bWVudCAoZWcsIHRoZSBvcmlnaW5hbFxuLy8gc2VsZWN0b3IpLiBSZXR1cm5zIGEgZnVuY3Rpb24gbWFwcGluZyBkb2N1bWVudC0+cmVzdWx0IG9iamVjdC5cbi8vXG4vLyBtYXRjaGVyIGlzIHRoZSBNYXRjaGVyIG9iamVjdCB3ZSBhcmUgY29tcGlsaW5nLlxuLy9cbi8vIElmIHRoaXMgaXMgdGhlIHJvb3QgZG9jdW1lbnQgc2VsZWN0b3IgKGllLCBub3Qgd3JhcHBlZCBpbiAkYW5kIG9yIHRoZSBsaWtlKSxcbi8vIHRoZW4gaXNSb290IGlzIHRydWUuIChUaGlzIGlzIHVzZWQgYnkgJG5lYXIuKVxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGVEb2N1bWVudFNlbGVjdG9yKGRvY1NlbGVjdG9yLCBtYXRjaGVyLCBvcHRpb25zID0ge30pIHtcbiAgY29uc3QgZG9jTWF0Y2hlcnMgPSBPYmplY3Qua2V5cyhkb2NTZWxlY3RvcikubWFwKGtleSA9PiB7XG4gICAgY29uc3Qgc3ViU2VsZWN0b3IgPSBkb2NTZWxlY3RvcltrZXldO1xuXG4gICAgaWYgKGtleS5zdWJzdHIoMCwgMSkgPT09ICckJykge1xuICAgICAgLy8gT3V0ZXIgb3BlcmF0b3JzIGFyZSBlaXRoZXIgbG9naWNhbCBvcGVyYXRvcnMgKHRoZXkgcmVjdXJzZSBiYWNrIGludG9cbiAgICAgIC8vIHRoaXMgZnVuY3Rpb24pLCBvciAkd2hlcmUuXG4gICAgICBpZiAoIWhhc093bi5jYWxsKExPR0lDQUxfT1BFUkFUT1JTLCBrZXkpKSB7XG4gICAgICAgIHRocm93IG5ldyBNaW5pTW9uZ29RdWVyeUVycm9yKGBVbnJlY29nbml6ZWQgbG9naWNhbCBvcGVyYXRvcjogJHtrZXl9YCk7XG4gICAgICB9XG5cbiAgICAgIG1hdGNoZXIuX2lzU2ltcGxlID0gZmFsc2U7XG4gICAgICByZXR1cm4gTE9HSUNBTF9PUEVSQVRPUlNba2V5XShzdWJTZWxlY3RvciwgbWF0Y2hlciwgb3B0aW9ucy5pbkVsZW1NYXRjaCk7XG4gICAgfVxuXG4gICAgLy8gUmVjb3JkIHRoaXMgcGF0aCwgYnV0IG9ubHkgaWYgd2UgYXJlbid0IGluIGFuIGVsZW1NYXRjaGVyLCBzaW5jZSBpbiBhblxuICAgIC8vIGVsZW1NYXRjaCB0aGlzIGlzIGEgcGF0aCBpbnNpZGUgYW4gb2JqZWN0IGluIGFuIGFycmF5LCBub3QgaW4gdGhlIGRvY1xuICAgIC8vIHJvb3QuXG4gICAgaWYgKCFvcHRpb25zLmluRWxlbU1hdGNoKSB7XG4gICAgICBtYXRjaGVyLl9yZWNvcmRQYXRoVXNlZChrZXkpO1xuICAgIH1cblxuICAgIC8vIERvbid0IGFkZCBhIG1hdGNoZXIgaWYgc3ViU2VsZWN0b3IgaXMgYSBmdW5jdGlvbiAtLSB0aGlzIGlzIHRvIG1hdGNoXG4gICAgLy8gdGhlIGJlaGF2aW9yIG9mIE1ldGVvciBvbiB0aGUgc2VydmVyIChpbmhlcml0ZWQgZnJvbSB0aGUgbm9kZSBtb25nb2RiXG4gICAgLy8gZHJpdmVyKSwgd2hpY2ggaXMgdG8gaWdub3JlIGFueSBwYXJ0IG9mIGEgc2VsZWN0b3Igd2hpY2ggaXMgYSBmdW5jdGlvbi5cbiAgICBpZiAodHlwZW9mIHN1YlNlbGVjdG9yID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IGxvb2tVcEJ5SW5kZXggPSBtYWtlTG9va3VwRnVuY3Rpb24oa2V5KTtcbiAgICBjb25zdCB2YWx1ZU1hdGNoZXIgPSBjb21waWxlVmFsdWVTZWxlY3RvcihcbiAgICAgIHN1YlNlbGVjdG9yLFxuICAgICAgbWF0Y2hlcixcbiAgICAgIG9wdGlvbnMuaXNSb290XG4gICAgKTtcblxuICAgIHJldHVybiBkb2MgPT4gdmFsdWVNYXRjaGVyKGxvb2tVcEJ5SW5kZXgoZG9jKSk7XG4gIH0pLmZpbHRlcihCb29sZWFuKTtcblxuICByZXR1cm4gYW5kRG9jdW1lbnRNYXRjaGVycyhkb2NNYXRjaGVycyk7XG59XG5cbi8vIFRha2VzIGluIGEgc2VsZWN0b3IgdGhhdCBjb3VsZCBtYXRjaCBhIGtleS1pbmRleGVkIHZhbHVlIGluIGEgZG9jdW1lbnQ7IGVnLFxuLy8geyRndDogNSwgJGx0OiA5fSwgb3IgYSByZWd1bGFyIGV4cHJlc3Npb24sIG9yIGFueSBub24tZXhwcmVzc2lvbiBvYmplY3QgKHRvXG4vLyBpbmRpY2F0ZSBlcXVhbGl0eSkuICBSZXR1cm5zIGEgYnJhbmNoZWQgbWF0Y2hlcjogYSBmdW5jdGlvbiBtYXBwaW5nXG4vLyBbYnJhbmNoZWQgdmFsdWVdLT5yZXN1bHQgb2JqZWN0LlxuZnVuY3Rpb24gY29tcGlsZVZhbHVlU2VsZWN0b3IodmFsdWVTZWxlY3RvciwgbWF0Y2hlciwgaXNSb290KSB7XG4gIGlmICh2YWx1ZVNlbGVjdG9yIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgbWF0Y2hlci5faXNTaW1wbGUgPSBmYWxzZTtcbiAgICByZXR1cm4gY29udmVydEVsZW1lbnRNYXRjaGVyVG9CcmFuY2hlZE1hdGNoZXIoXG4gICAgICByZWdleHBFbGVtZW50TWF0Y2hlcih2YWx1ZVNlbGVjdG9yKVxuICAgICk7XG4gIH1cblxuICBpZiAoaXNPcGVyYXRvck9iamVjdCh2YWx1ZVNlbGVjdG9yKSkge1xuICAgIHJldHVybiBvcGVyYXRvckJyYW5jaGVkTWF0Y2hlcih2YWx1ZVNlbGVjdG9yLCBtYXRjaGVyLCBpc1Jvb3QpO1xuICB9XG5cbiAgcmV0dXJuIGNvbnZlcnRFbGVtZW50TWF0Y2hlclRvQnJhbmNoZWRNYXRjaGVyKFxuICAgIGVxdWFsaXR5RWxlbWVudE1hdGNoZXIodmFsdWVTZWxlY3RvcilcbiAgKTtcbn1cblxuLy8gR2l2ZW4gYW4gZWxlbWVudCBtYXRjaGVyICh3aGljaCBldmFsdWF0ZXMgYSBzaW5nbGUgdmFsdWUpLCByZXR1cm5zIGEgYnJhbmNoZWRcbi8vIHZhbHVlICh3aGljaCBldmFsdWF0ZXMgdGhlIGVsZW1lbnQgbWF0Y2hlciBvbiBhbGwgdGhlIGJyYW5jaGVzIGFuZCByZXR1cm5zIGFcbi8vIG1vcmUgc3RydWN0dXJlZCByZXR1cm4gdmFsdWUgcG9zc2libHkgaW5jbHVkaW5nIGFycmF5SW5kaWNlcykuXG5mdW5jdGlvbiBjb252ZXJ0RWxlbWVudE1hdGNoZXJUb0JyYW5jaGVkTWF0Y2hlcihlbGVtZW50TWF0Y2hlciwgb3B0aW9ucyA9IHt9KSB7XG4gIHJldHVybiBicmFuY2hlcyA9PiB7XG4gICAgY29uc3QgZXhwYW5kZWQgPSBvcHRpb25zLmRvbnRFeHBhbmRMZWFmQXJyYXlzXG4gICAgICA/IGJyYW5jaGVzXG4gICAgICA6IGV4cGFuZEFycmF5c0luQnJhbmNoZXMoYnJhbmNoZXMsIG9wdGlvbnMuZG9udEluY2x1ZGVMZWFmQXJyYXlzKTtcblxuICAgIGNvbnN0IG1hdGNoID0ge307XG4gICAgbWF0Y2gucmVzdWx0ID0gZXhwYW5kZWQuc29tZShlbGVtZW50ID0+IHtcbiAgICAgIGxldCBtYXRjaGVkID0gZWxlbWVudE1hdGNoZXIoZWxlbWVudC52YWx1ZSk7XG5cbiAgICAgIC8vIFNwZWNpYWwgY2FzZSBmb3IgJGVsZW1NYXRjaDogaXQgbWVhbnMgXCJ0cnVlLCBhbmQgdXNlIHRoaXMgYXMgYW4gYXJyYXlcbiAgICAgIC8vIGluZGV4IGlmIEkgZGlkbid0IGFscmVhZHkgaGF2ZSBvbmVcIi5cbiAgICAgIGlmICh0eXBlb2YgbWF0Y2hlZCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgLy8gWFhYIFRoaXMgY29kZSBkYXRlcyBmcm9tIHdoZW4gd2Ugb25seSBzdG9yZWQgYSBzaW5nbGUgYXJyYXkgaW5kZXhcbiAgICAgICAgLy8gKGZvciB0aGUgb3V0ZXJtb3N0IGFycmF5KS4gU2hvdWxkIHdlIGJlIGFsc28gaW5jbHVkaW5nIGRlZXBlciBhcnJheVxuICAgICAgICAvLyBpbmRpY2VzIGZyb20gdGhlICRlbGVtTWF0Y2ggbWF0Y2g/XG4gICAgICAgIGlmICghZWxlbWVudC5hcnJheUluZGljZXMpIHtcbiAgICAgICAgICBlbGVtZW50LmFycmF5SW5kaWNlcyA9IFttYXRjaGVkXTtcbiAgICAgICAgfVxuXG4gICAgICAgIG1hdGNoZWQgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiBzb21lIGVsZW1lbnQgbWF0Y2hlZCwgYW5kIGl0J3MgdGFnZ2VkIHdpdGggYXJyYXkgaW5kaWNlcywgaW5jbHVkZVxuICAgICAgLy8gdGhvc2UgaW5kaWNlcyBpbiBvdXIgcmVzdWx0IG9iamVjdC5cbiAgICAgIGlmIChtYXRjaGVkICYmIGVsZW1lbnQuYXJyYXlJbmRpY2VzKSB7XG4gICAgICAgIG1hdGNoLmFycmF5SW5kaWNlcyA9IGVsZW1lbnQuYXJyYXlJbmRpY2VzO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbWF0Y2hlZDtcbiAgICB9KTtcblxuICAgIHJldHVybiBtYXRjaDtcbiAgfTtcbn1cblxuLy8gSGVscGVycyBmb3IgJG5lYXIuXG5mdW5jdGlvbiBkaXN0YW5jZUNvb3JkaW5hdGVQYWlycyhhLCBiKSB7XG4gIGNvbnN0IHBvaW50QSA9IHBvaW50VG9BcnJheShhKTtcbiAgY29uc3QgcG9pbnRCID0gcG9pbnRUb0FycmF5KGIpO1xuXG4gIHJldHVybiBNYXRoLmh5cG90KHBvaW50QVswXSAtIHBvaW50QlswXSwgcG9pbnRBWzFdIC0gcG9pbnRCWzFdKTtcbn1cblxuLy8gVGFrZXMgc29tZXRoaW5nIHRoYXQgaXMgbm90IGFuIG9wZXJhdG9yIG9iamVjdCBhbmQgcmV0dXJucyBhbiBlbGVtZW50IG1hdGNoZXJcbi8vIGZvciBlcXVhbGl0eSB3aXRoIHRoYXQgdGhpbmcuXG5leHBvcnQgZnVuY3Rpb24gZXF1YWxpdHlFbGVtZW50TWF0Y2hlcihlbGVtZW50U2VsZWN0b3IpIHtcbiAgaWYgKGlzT3BlcmF0b3JPYmplY3QoZWxlbWVudFNlbGVjdG9yKSkge1xuICAgIHRocm93IG5ldyBNaW5pTW9uZ29RdWVyeUVycm9yKCdDYW5cXCd0IGNyZWF0ZSBlcXVhbGl0eVZhbHVlU2VsZWN0b3IgZm9yIG9wZXJhdG9yIG9iamVjdCcpO1xuICB9XG5cbiAgLy8gU3BlY2lhbC1jYXNlOiBudWxsIGFuZCB1bmRlZmluZWQgYXJlIGVxdWFsIChpZiB5b3UgZ290IHVuZGVmaW5lZCBpbiB0aGVyZVxuICAvLyBzb21ld2hlcmUsIG9yIGlmIHlvdSBnb3QgaXQgZHVlIHRvIHNvbWUgYnJhbmNoIGJlaW5nIG5vbi1leGlzdGVudCBpbiB0aGVcbiAgLy8gd2VpcmQgc3BlY2lhbCBjYXNlKSwgZXZlbiB0aG91Z2ggdGhleSBhcmVuJ3Qgd2l0aCBFSlNPTi5lcXVhbHMuXG4gIC8vIHVuZGVmaW5lZCBvciBudWxsXG4gIGlmIChlbGVtZW50U2VsZWN0b3IgPT0gbnVsbCkge1xuICAgIHJldHVybiB2YWx1ZSA9PiB2YWx1ZSA9PSBudWxsO1xuICB9XG5cbiAgcmV0dXJuIHZhbHVlID0+IExvY2FsQ29sbGVjdGlvbi5fZi5fZXF1YWwoZWxlbWVudFNlbGVjdG9yLCB2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIGV2ZXJ5dGhpbmdNYXRjaGVyKGRvY09yQnJhbmNoZWRWYWx1ZXMpIHtcbiAgcmV0dXJuIHtyZXN1bHQ6IHRydWV9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXhwYW5kQXJyYXlzSW5CcmFuY2hlcyhicmFuY2hlcywgc2tpcFRoZUFycmF5cykge1xuICBjb25zdCBicmFuY2hlc091dCA9IFtdO1xuXG4gIGJyYW5jaGVzLmZvckVhY2goYnJhbmNoID0+IHtcbiAgICBjb25zdCB0aGlzSXNBcnJheSA9IEFycmF5LmlzQXJyYXkoYnJhbmNoLnZhbHVlKTtcblxuICAgIC8vIFdlIGluY2x1ZGUgdGhlIGJyYW5jaCBpdHNlbGYsICpVTkxFU1MqIHdlIGl0J3MgYW4gYXJyYXkgdGhhdCB3ZSdyZSBnb2luZ1xuICAgIC8vIHRvIGl0ZXJhdGUgYW5kIHdlJ3JlIHRvbGQgdG8gc2tpcCBhcnJheXMuICAoVGhhdCdzIHJpZ2h0LCB3ZSBpbmNsdWRlIHNvbWVcbiAgICAvLyBhcnJheXMgZXZlbiBza2lwVGhlQXJyYXlzIGlzIHRydWU6IHRoZXNlIGFyZSBhcnJheXMgdGhhdCB3ZXJlIGZvdW5kIHZpYVxuICAgIC8vIGV4cGxpY2l0IG51bWVyaWNhbCBpbmRpY2VzLilcbiAgICBpZiAoIShza2lwVGhlQXJyYXlzICYmIHRoaXNJc0FycmF5ICYmICFicmFuY2guZG9udEl0ZXJhdGUpKSB7XG4gICAgICBicmFuY2hlc091dC5wdXNoKHthcnJheUluZGljZXM6IGJyYW5jaC5hcnJheUluZGljZXMsIHZhbHVlOiBicmFuY2gudmFsdWV9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpc0lzQXJyYXkgJiYgIWJyYW5jaC5kb250SXRlcmF0ZSkge1xuICAgICAgYnJhbmNoLnZhbHVlLmZvckVhY2goKHZhbHVlLCBpKSA9PiB7XG4gICAgICAgIGJyYW5jaGVzT3V0LnB1c2goe1xuICAgICAgICAgIGFycmF5SW5kaWNlczogKGJyYW5jaC5hcnJheUluZGljZXMgfHwgW10pLmNvbmNhdChpKSxcbiAgICAgICAgICB2YWx1ZVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGJyYW5jaGVzT3V0O1xufVxuXG4vLyBIZWxwZXJzIGZvciAkYml0c0FsbFNldC8kYml0c0FueVNldC8kYml0c0FsbENsZWFyLyRiaXRzQW55Q2xlYXIuXG5mdW5jdGlvbiBnZXRPcGVyYW5kQml0bWFzayhvcGVyYW5kLCBzZWxlY3Rvcikge1xuICAvLyBudW1lcmljIGJpdG1hc2tcbiAgLy8gWW91IGNhbiBwcm92aWRlIGEgbnVtZXJpYyBiaXRtYXNrIHRvIGJlIG1hdGNoZWQgYWdhaW5zdCB0aGUgb3BlcmFuZCBmaWVsZC5cbiAgLy8gSXQgbXVzdCBiZSByZXByZXNlbnRhYmxlIGFzIGEgbm9uLW5lZ2F0aXZlIDMyLWJpdCBzaWduZWQgaW50ZWdlci5cbiAgLy8gT3RoZXJ3aXNlLCAkYml0c0FsbFNldCB3aWxsIHJldHVybiBhbiBlcnJvci5cbiAgaWYgKE51bWJlci5pc0ludGVnZXIob3BlcmFuZCkgJiYgb3BlcmFuZCA+PSAwKSB7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KG5ldyBJbnQzMkFycmF5KFtvcGVyYW5kXSkuYnVmZmVyKTtcbiAgfVxuXG4gIC8vIGJpbmRhdGEgYml0bWFza1xuICAvLyBZb3UgY2FuIGFsc28gdXNlIGFuIGFyYml0cmFyaWx5IGxhcmdlIEJpbkRhdGEgaW5zdGFuY2UgYXMgYSBiaXRtYXNrLlxuICBpZiAoRUpTT04uaXNCaW5hcnkob3BlcmFuZCkpIHtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkob3BlcmFuZC5idWZmZXIpO1xuICB9XG5cbiAgLy8gcG9zaXRpb24gbGlzdFxuICAvLyBJZiBxdWVyeWluZyBhIGxpc3Qgb2YgYml0IHBvc2l0aW9ucywgZWFjaCA8cG9zaXRpb24+IG11c3QgYmUgYSBub24tbmVnYXRpdmVcbiAgLy8gaW50ZWdlci4gQml0IHBvc2l0aW9ucyBzdGFydCBhdCAwIGZyb20gdGhlIGxlYXN0IHNpZ25pZmljYW50IGJpdC5cbiAgaWYgKEFycmF5LmlzQXJyYXkob3BlcmFuZCkgJiZcbiAgICAgIG9wZXJhbmQuZXZlcnkoeCA9PiBOdW1iZXIuaXNJbnRlZ2VyKHgpICYmIHggPj0gMCkpIHtcbiAgICBjb25zdCBidWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIoKE1hdGgubWF4KC4uLm9wZXJhbmQpID4+IDMpICsgMSk7XG4gICAgY29uc3QgdmlldyA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG5cbiAgICBvcGVyYW5kLmZvckVhY2goeCA9PiB7XG4gICAgICB2aWV3W3ggPj4gM10gfD0gMSA8PCAoeCAmIDB4Nyk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdmlldztcbiAgfVxuXG4gIC8vIGJhZCBvcGVyYW5kXG4gIHRocm93IG5ldyBNaW5pTW9uZ29RdWVyeUVycm9yKFxuICAgIGBvcGVyYW5kIHRvICR7c2VsZWN0b3J9IG11c3QgYmUgYSBudW1lcmljIGJpdG1hc2sgKHJlcHJlc2VudGFibGUgYXMgYSBgICtcbiAgICAnbm9uLW5lZ2F0aXZlIDMyLWJpdCBzaWduZWQgaW50ZWdlciksIGEgYmluZGF0YSBiaXRtYXNrIG9yIGFuIGFycmF5IHdpdGggJyArXG4gICAgJ2JpdCBwb3NpdGlvbnMgKG5vbi1uZWdhdGl2ZSBpbnRlZ2VycyknXG4gICk7XG59XG5cbmZ1bmN0aW9uIGdldFZhbHVlQml0bWFzayh2YWx1ZSwgbGVuZ3RoKSB7XG4gIC8vIFRoZSBmaWVsZCB2YWx1ZSBtdXN0IGJlIGVpdGhlciBudW1lcmljYWwgb3IgYSBCaW5EYXRhIGluc3RhbmNlLiBPdGhlcndpc2UsXG4gIC8vICRiaXRzLi4uIHdpbGwgbm90IG1hdGNoIHRoZSBjdXJyZW50IGRvY3VtZW50LlxuXG4gIC8vIG51bWVyaWNhbFxuICBpZiAoTnVtYmVyLmlzU2FmZUludGVnZXIodmFsdWUpKSB7XG4gICAgLy8gJGJpdHMuLi4gd2lsbCBub3QgbWF0Y2ggbnVtZXJpY2FsIHZhbHVlcyB0aGF0IGNhbm5vdCBiZSByZXByZXNlbnRlZCBhcyBhXG4gICAgLy8gc2lnbmVkIDY0LWJpdCBpbnRlZ2VyLiBUaGlzIGNhbiBiZSB0aGUgY2FzZSBpZiBhIHZhbHVlIGlzIGVpdGhlciB0b29cbiAgICAvLyBsYXJnZSBvciBzbWFsbCB0byBmaXQgaW4gYSBzaWduZWQgNjQtYml0IGludGVnZXIsIG9yIGlmIGl0IGhhcyBhXG4gICAgLy8gZnJhY3Rpb25hbCBjb21wb25lbnQuXG4gICAgY29uc3QgYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKFxuICAgICAgTWF0aC5tYXgobGVuZ3RoLCAyICogVWludDMyQXJyYXkuQllURVNfUEVSX0VMRU1FTlQpXG4gICAgKTtcblxuICAgIGxldCB2aWV3ID0gbmV3IFVpbnQzMkFycmF5KGJ1ZmZlciwgMCwgMik7XG4gICAgdmlld1swXSA9IHZhbHVlICUgKCgxIDw8IDE2KSAqICgxIDw8IDE2KSkgfCAwO1xuICAgIHZpZXdbMV0gPSB2YWx1ZSAvICgoMSA8PCAxNikgKiAoMSA8PCAxNikpIHwgMDtcblxuICAgIC8vIHNpZ24gZXh0ZW5zaW9uXG4gICAgaWYgKHZhbHVlIDwgMCkge1xuICAgICAgdmlldyA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlciwgMik7XG4gICAgICB2aWV3LmZvckVhY2goKGJ5dGUsIGkpID0+IHtcbiAgICAgICAgdmlld1tpXSA9IDB4ZmY7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKTtcbiAgfVxuXG4gIC8vIGJpbmRhdGFcbiAgaWYgKEVKU09OLmlzQmluYXJ5KHZhbHVlKSkge1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheSh2YWx1ZS5idWZmZXIpO1xuICB9XG5cbiAgLy8gbm8gbWF0Y2hcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vLyBBY3R1YWxseSBpbnNlcnRzIGEga2V5IHZhbHVlIGludG8gdGhlIHNlbGVjdG9yIGRvY3VtZW50XG4vLyBIb3dldmVyLCB0aGlzIGNoZWNrcyB0aGVyZSBpcyBubyBhbWJpZ3VpdHkgaW4gc2V0dGluZ1xuLy8gdGhlIHZhbHVlIGZvciB0aGUgZ2l2ZW4ga2V5LCB0aHJvd3Mgb3RoZXJ3aXNlXG5mdW5jdGlvbiBpbnNlcnRJbnRvRG9jdW1lbnQoZG9jdW1lbnQsIGtleSwgdmFsdWUpIHtcbiAgT2JqZWN0LmtleXMoZG9jdW1lbnQpLmZvckVhY2goZXhpc3RpbmdLZXkgPT4ge1xuICAgIGlmIChcbiAgICAgIChleGlzdGluZ0tleS5sZW5ndGggPiBrZXkubGVuZ3RoICYmIGV4aXN0aW5nS2V5LmluZGV4T2YoYCR7a2V5fS5gKSA9PT0gMCkgfHxcbiAgICAgIChrZXkubGVuZ3RoID4gZXhpc3RpbmdLZXkubGVuZ3RoICYmIGtleS5pbmRleE9mKGAke2V4aXN0aW5nS2V5fS5gKSA9PT0gMClcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBNaW5pTW9uZ29RdWVyeUVycm9yKFxuICAgICAgICBgY2Fubm90IGluZmVyIHF1ZXJ5IGZpZWxkcyB0byBzZXQsIGJvdGggcGF0aHMgJyR7ZXhpc3RpbmdLZXl9JyBhbmQgJyR7a2V5fScgYXJlIG1hdGNoZWRgXG4gICAgICApO1xuICAgIH0gZWxzZSBpZiAoZXhpc3RpbmdLZXkgPT09IGtleSkge1xuICAgICAgdGhyb3cgbmV3IE1pbmlNb25nb1F1ZXJ5RXJyb3IoXG4gICAgICAgIGBjYW5ub3QgaW5mZXIgcXVlcnkgZmllbGRzIHRvIHNldCwgcGF0aCAnJHtrZXl9JyBpcyBtYXRjaGVkIHR3aWNlYFxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIGRvY3VtZW50W2tleV0gPSB2YWx1ZTtcbn1cblxuLy8gUmV0dXJucyBhIGJyYW5jaGVkIG1hdGNoZXIgdGhhdCBtYXRjaGVzIGlmZiB0aGUgZ2l2ZW4gbWF0Y2hlciBkb2VzIG5vdC5cbi8vIE5vdGUgdGhhdCB0aGlzIGltcGxpY2l0bHkgXCJkZU1vcmdhbml6ZXNcIiB0aGUgd3JhcHBlZCBmdW5jdGlvbi4gIGllLCBpdFxuLy8gbWVhbnMgdGhhdCBBTEwgYnJhbmNoIHZhbHVlcyBuZWVkIHRvIGZhaWwgdG8gbWF0Y2ggaW5uZXJCcmFuY2hlZE1hdGNoZXIuXG5mdW5jdGlvbiBpbnZlcnRCcmFuY2hlZE1hdGNoZXIoYnJhbmNoZWRNYXRjaGVyKSB7XG4gIHJldHVybiBicmFuY2hWYWx1ZXMgPT4ge1xuICAgIC8vIFdlIGV4cGxpY2l0bHkgY2hvb3NlIHRvIHN0cmlwIGFycmF5SW5kaWNlcyBoZXJlOiBpdCBkb2Vzbid0IG1ha2Ugc2Vuc2UgdG9cbiAgICAvLyBzYXkgXCJ1cGRhdGUgdGhlIGFycmF5IGVsZW1lbnQgdGhhdCBkb2VzIG5vdCBtYXRjaCBzb21ldGhpbmdcIiwgYXQgbGVhc3RcbiAgICAvLyBpbiBtb25nby1sYW5kLlxuICAgIHJldHVybiB7cmVzdWx0OiAhYnJhbmNoZWRNYXRjaGVyKGJyYW5jaFZhbHVlcykucmVzdWx0fTtcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzSW5kZXhhYmxlKG9iaikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShvYmopIHx8IExvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdChvYmopO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNOdW1lcmljS2V5KHMpIHtcbiAgcmV0dXJuIC9eWzAtOV0rJC8udGVzdChzKTtcbn1cblxuLy8gUmV0dXJucyB0cnVlIGlmIHRoaXMgaXMgYW4gb2JqZWN0IHdpdGggYXQgbGVhc3Qgb25lIGtleSBhbmQgYWxsIGtleXMgYmVnaW5cbi8vIHdpdGggJC4gIFVubGVzcyBpbmNvbnNpc3RlbnRPSyBpcyBzZXQsIHRocm93cyBpZiBzb21lIGtleXMgYmVnaW4gd2l0aCAkIGFuZFxuLy8gb3RoZXJzIGRvbid0LlxuZXhwb3J0IGZ1bmN0aW9uIGlzT3BlcmF0b3JPYmplY3QodmFsdWVTZWxlY3RvciwgaW5jb25zaXN0ZW50T0spIHtcbiAgaWYgKCFMb2NhbENvbGxlY3Rpb24uX2lzUGxhaW5PYmplY3QodmFsdWVTZWxlY3RvcikpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBsZXQgdGhlc2VBcmVPcGVyYXRvcnMgPSB1bmRlZmluZWQ7XG4gIE9iamVjdC5rZXlzKHZhbHVlU2VsZWN0b3IpLmZvckVhY2goc2VsS2V5ID0+IHtcbiAgICBjb25zdCB0aGlzSXNPcGVyYXRvciA9IHNlbEtleS5zdWJzdHIoMCwgMSkgPT09ICckJyB8fCBzZWxLZXkgPT09ICdkaWZmJztcblxuICAgIGlmICh0aGVzZUFyZU9wZXJhdG9ycyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGVzZUFyZU9wZXJhdG9ycyA9IHRoaXNJc09wZXJhdG9yO1xuICAgIH0gZWxzZSBpZiAodGhlc2VBcmVPcGVyYXRvcnMgIT09IHRoaXNJc09wZXJhdG9yKSB7XG4gICAgICBpZiAoIWluY29uc2lzdGVudE9LKSB7XG4gICAgICAgIHRocm93IG5ldyBNaW5pTW9uZ29RdWVyeUVycm9yKFxuICAgICAgICAgIGBJbmNvbnNpc3RlbnQgb3BlcmF0b3I6ICR7SlNPTi5zdHJpbmdpZnkodmFsdWVTZWxlY3Rvcil9YFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICB0aGVzZUFyZU9wZXJhdG9ycyA9IGZhbHNlO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuICEhdGhlc2VBcmVPcGVyYXRvcnM7IC8vIHt9IGhhcyBubyBvcGVyYXRvcnNcbn1cblxuLy8gSGVscGVyIGZvciAkbHQvJGd0LyRsdGUvJGd0ZS5cbmZ1bmN0aW9uIG1ha2VJbmVxdWFsaXR5KGNtcFZhbHVlQ29tcGFyYXRvcikge1xuICByZXR1cm4ge1xuICAgIGNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCkge1xuICAgICAgLy8gQXJyYXlzIG5ldmVyIGNvbXBhcmUgZmFsc2Ugd2l0aCBub24tYXJyYXlzIGZvciBhbnkgaW5lcXVhbGl0eS5cbiAgICAgIC8vIFhYWCBUaGlzIHdhcyBiZWhhdmlvciB3ZSBvYnNlcnZlZCBpbiBwcmUtcmVsZWFzZSBNb25nb0RCIDIuNSwgYnV0XG4gICAgICAvLyAgICAgaXQgc2VlbXMgdG8gaGF2ZSBiZWVuIHJldmVydGVkLlxuICAgICAgLy8gICAgIFNlZSBodHRwczovL2ppcmEubW9uZ29kYi5vcmcvYnJvd3NlL1NFUlZFUi0xMTQ0NFxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkob3BlcmFuZCkpIHtcbiAgICAgICAgcmV0dXJuICgpID0+IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyBTcGVjaWFsIGNhc2U6IGNvbnNpZGVyIHVuZGVmaW5lZCBhbmQgbnVsbCB0aGUgc2FtZSAoc28gdHJ1ZSB3aXRoXG4gICAgICAvLyAkZ3RlLyRsdGUpLlxuICAgICAgaWYgKG9wZXJhbmQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBvcGVyYW5kID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgb3BlcmFuZFR5cGUgPSBMb2NhbENvbGxlY3Rpb24uX2YuX3R5cGUob3BlcmFuZCk7XG5cbiAgICAgIHJldHVybiB2YWx1ZSA9PiB7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdmFsdWUgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29tcGFyaXNvbnMgYXJlIG5ldmVyIHRydWUgYW1vbmcgdGhpbmdzIG9mIGRpZmZlcmVudCB0eXBlIChleGNlcHRcbiAgICAgICAgLy8gbnVsbCB2cyB1bmRlZmluZWQpLlxuICAgICAgICBpZiAoTG9jYWxDb2xsZWN0aW9uLl9mLl90eXBlKHZhbHVlKSAhPT0gb3BlcmFuZFR5cGUpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY21wVmFsdWVDb21wYXJhdG9yKExvY2FsQ29sbGVjdGlvbi5fZi5fY21wKHZhbHVlLCBvcGVyYW5kKSk7XG4gICAgICB9O1xuICAgIH0sXG4gIH07XG59XG5cbi8vIG1ha2VMb29rdXBGdW5jdGlvbihrZXkpIHJldHVybnMgYSBsb29rdXAgZnVuY3Rpb24uXG4vL1xuLy8gQSBsb29rdXAgZnVuY3Rpb24gdGFrZXMgaW4gYSBkb2N1bWVudCBhbmQgcmV0dXJucyBhbiBhcnJheSBvZiBtYXRjaGluZ1xuLy8gYnJhbmNoZXMuICBJZiBubyBhcnJheXMgYXJlIGZvdW5kIHdoaWxlIGxvb2tpbmcgdXAgdGhlIGtleSwgdGhpcyBhcnJheSB3aWxsXG4vLyBoYXZlIGV4YWN0bHkgb25lIGJyYW5jaGVzIChwb3NzaWJseSAndW5kZWZpbmVkJywgaWYgc29tZSBzZWdtZW50IG9mIHRoZSBrZXlcbi8vIHdhcyBub3QgZm91bmQpLlxuLy9cbi8vIElmIGFycmF5cyBhcmUgZm91bmQgaW4gdGhlIG1pZGRsZSwgdGhpcyBjYW4gaGF2ZSBtb3JlIHRoYW4gb25lIGVsZW1lbnQsIHNpbmNlXG4vLyB3ZSAnYnJhbmNoJy4gV2hlbiB3ZSAnYnJhbmNoJywgaWYgdGhlcmUgYXJlIG1vcmUga2V5IHNlZ21lbnRzIHRvIGxvb2sgdXAsXG4vLyB0aGVuIHdlIG9ubHkgcHVyc3VlIGJyYW5jaGVzIHRoYXQgYXJlIHBsYWluIG9iamVjdHMgKG5vdCBhcnJheXMgb3Igc2NhbGFycykuXG4vLyBUaGlzIG1lYW5zIHdlIGNhbiBhY3R1YWxseSBlbmQgdXAgd2l0aCBubyBicmFuY2hlcyFcbi8vXG4vLyBXZSBkbyAqTk9UKiBicmFuY2ggb24gYXJyYXlzIHRoYXQgYXJlIGZvdW5kIGF0IHRoZSBlbmQgKGllLCBhdCB0aGUgbGFzdFxuLy8gZG90dGVkIG1lbWJlciBvZiB0aGUga2V5KS4gV2UganVzdCByZXR1cm4gdGhhdCBhcnJheTsgaWYgeW91IHdhbnQgdG9cbi8vIGVmZmVjdGl2ZWx5ICdicmFuY2gnIG92ZXIgdGhlIGFycmF5J3MgdmFsdWVzLCBwb3N0LXByb2Nlc3MgdGhlIGxvb2t1cFxuLy8gZnVuY3Rpb24gd2l0aCBleHBhbmRBcnJheXNJbkJyYW5jaGVzLlxuLy9cbi8vIEVhY2ggYnJhbmNoIGlzIGFuIG9iamVjdCB3aXRoIGtleXM6XG4vLyAgLSB2YWx1ZTogdGhlIHZhbHVlIGF0IHRoZSBicmFuY2hcbi8vICAtIGRvbnRJdGVyYXRlOiBhbiBvcHRpb25hbCBib29sOyBpZiB0cnVlLCBpdCBtZWFucyB0aGF0ICd2YWx1ZScgaXMgYW4gYXJyYXlcbi8vICAgIHRoYXQgZXhwYW5kQXJyYXlzSW5CcmFuY2hlcyBzaG91bGQgTk9UIGV4cGFuZC4gVGhpcyBzcGVjaWZpY2FsbHkgaGFwcGVuc1xuLy8gICAgd2hlbiB0aGVyZSBpcyBhIG51bWVyaWMgaW5kZXggaW4gdGhlIGtleSwgYW5kIGVuc3VyZXMgdGhlXG4vLyAgICBwZXJoYXBzLXN1cnByaXNpbmcgTW9uZ29EQiBiZWhhdmlvciB3aGVyZSB7J2EuMCc6IDV9IGRvZXMgTk9UXG4vLyAgICBtYXRjaCB7YTogW1s1XV19LlxuLy8gIC0gYXJyYXlJbmRpY2VzOiBpZiBhbnkgYXJyYXkgaW5kZXhpbmcgd2FzIGRvbmUgZHVyaW5nIGxvb2t1cCAoZWl0aGVyIGR1ZSB0b1xuLy8gICAgZXhwbGljaXQgbnVtZXJpYyBpbmRpY2VzIG9yIGltcGxpY2l0IGJyYW5jaGluZyksIHRoaXMgd2lsbCBiZSBhbiBhcnJheSBvZlxuLy8gICAgdGhlIGFycmF5IGluZGljZXMgdXNlZCwgZnJvbSBvdXRlcm1vc3QgdG8gaW5uZXJtb3N0OyBpdCBpcyBmYWxzZXkgb3Jcbi8vICAgIGFic2VudCBpZiBubyBhcnJheSBpbmRleCBpcyB1c2VkLiBJZiBhbiBleHBsaWNpdCBudW1lcmljIGluZGV4IGlzIHVzZWQsXG4vLyAgICB0aGUgaW5kZXggd2lsbCBiZSBmb2xsb3dlZCBpbiBhcnJheUluZGljZXMgYnkgdGhlIHN0cmluZyAneCcuXG4vL1xuLy8gICAgTm90ZTogYXJyYXlJbmRpY2VzIGlzIHVzZWQgZm9yIHR3byBwdXJwb3Nlcy4gRmlyc3QsIGl0IGlzIHVzZWQgdG9cbi8vICAgIGltcGxlbWVudCB0aGUgJyQnIG1vZGlmaWVyIGZlYXR1cmUsIHdoaWNoIG9ubHkgZXZlciBsb29rcyBhdCBpdHMgZmlyc3Rcbi8vICAgIGVsZW1lbnQuXG4vL1xuLy8gICAgU2Vjb25kLCBpdCBpcyB1c2VkIGZvciBzb3J0IGtleSBnZW5lcmF0aW9uLCB3aGljaCBuZWVkcyB0byBiZSBhYmxlIHRvIHRlbGxcbi8vICAgIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gZGlmZmVyZW50IHBhdGhzLiBNb3Jlb3ZlciwgaXQgbmVlZHMgdG9cbi8vICAgIGRpZmZlcmVudGlhdGUgYmV0d2VlbiBleHBsaWNpdCBhbmQgaW1wbGljaXQgYnJhbmNoaW5nLCB3aGljaCBpcyB3aHlcbi8vICAgIHRoZXJlJ3MgdGhlIHNvbWV3aGF0IGhhY2t5ICd4JyBlbnRyeTogdGhpcyBtZWFucyB0aGF0IGV4cGxpY2l0IGFuZFxuLy8gICAgaW1wbGljaXQgYXJyYXkgbG9va3VwcyB3aWxsIGhhdmUgZGlmZmVyZW50IGZ1bGwgYXJyYXlJbmRpY2VzIHBhdGhzLiAoVGhhdFxuLy8gICAgY29kZSBvbmx5IHJlcXVpcmVzIHRoYXQgZGlmZmVyZW50IHBhdGhzIGhhdmUgZGlmZmVyZW50IGFycmF5SW5kaWNlczsgaXRcbi8vICAgIGRvZXNuJ3QgYWN0dWFsbHkgJ3BhcnNlJyBhcnJheUluZGljZXMuIEFzIGFuIGFsdGVybmF0aXZlLCBhcnJheUluZGljZXNcbi8vICAgIGNvdWxkIGNvbnRhaW4gb2JqZWN0cyB3aXRoIGZsYWdzIGxpa2UgJ2ltcGxpY2l0JywgYnV0IEkgdGhpbmsgdGhhdCBvbmx5XG4vLyAgICBtYWtlcyB0aGUgY29kZSBzdXJyb3VuZGluZyB0aGVtIG1vcmUgY29tcGxleC4pXG4vL1xuLy8gICAgKEJ5IHRoZSB3YXksIHRoaXMgZmllbGQgZW5kcyB1cCBnZXR0aW5nIHBhc3NlZCBhcm91bmQgYSBsb3Qgd2l0aG91dFxuLy8gICAgY2xvbmluZywgc28gbmV2ZXIgbXV0YXRlIGFueSBhcnJheUluZGljZXMgZmllbGQvdmFyIGluIHRoaXMgcGFja2FnZSEpXG4vL1xuLy9cbi8vIEF0IHRoZSB0b3AgbGV2ZWwsIHlvdSBtYXkgb25seSBwYXNzIGluIGEgcGxhaW4gb2JqZWN0IG9yIGFycmF5LlxuLy9cbi8vIFNlZSB0aGUgdGVzdCAnbWluaW1vbmdvIC0gbG9va3VwJyBmb3Igc29tZSBleGFtcGxlcyBvZiB3aGF0IGxvb2t1cCBmdW5jdGlvbnNcbi8vIHJldHVybi5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlTG9va3VwRnVuY3Rpb24oa2V5LCBvcHRpb25zID0ge30pIHtcbiAgY29uc3QgcGFydHMgPSBrZXkuc3BsaXQoJy4nKTtcbiAgY29uc3QgZmlyc3RQYXJ0ID0gcGFydHMubGVuZ3RoID8gcGFydHNbMF0gOiAnJztcbiAgY29uc3QgbG9va3VwUmVzdCA9IChcbiAgICBwYXJ0cy5sZW5ndGggPiAxICYmXG4gICAgbWFrZUxvb2t1cEZ1bmN0aW9uKHBhcnRzLnNsaWNlKDEpLmpvaW4oJy4nKSwgb3B0aW9ucylcbiAgKTtcblxuICBmdW5jdGlvbiBidWlsZFJlc3VsdChhcnJheUluZGljZXMsIGRvbnRJdGVyYXRlLCB2YWx1ZSkge1xuICAgIHJldHVybiBhcnJheUluZGljZXMgJiYgYXJyYXlJbmRpY2VzLmxlbmd0aFxuICAgICAgPyBkb250SXRlcmF0ZVxuICAgICAgICA/IFt7IGFycmF5SW5kaWNlcywgZG9udEl0ZXJhdGUsIHZhbHVlIH1dXG4gICAgICAgIDogW3sgYXJyYXlJbmRpY2VzLCB2YWx1ZSB9XVxuICAgICAgOiBkb250SXRlcmF0ZVxuICAgICAgICA/IFt7IGRvbnRJdGVyYXRlLCB2YWx1ZSB9XVxuICAgICAgICA6IFt7IHZhbHVlIH1dO1xuICB9XG5cbiAgLy8gRG9jIHdpbGwgYWx3YXlzIGJlIGEgcGxhaW4gb2JqZWN0IG9yIGFuIGFycmF5LlxuICAvLyBhcHBseSBhbiBleHBsaWNpdCBudW1lcmljIGluZGV4LCBhbiBhcnJheS5cbiAgcmV0dXJuIChkb2MsIGFycmF5SW5kaWNlcykgPT4ge1xuICAgIGlmIChBcnJheS5pc0FycmF5KGRvYykpIHtcbiAgICAgIC8vIElmIHdlJ3JlIGJlaW5nIGFza2VkIHRvIGRvIGFuIGludmFsaWQgbG9va3VwIGludG8gYW4gYXJyYXkgKG5vbi1pbnRlZ2VyXG4gICAgICAvLyBvciBvdXQtb2YtYm91bmRzKSwgcmV0dXJuIG5vIHJlc3VsdHMgKHdoaWNoIGlzIGRpZmZlcmVudCBmcm9tIHJldHVybmluZ1xuICAgICAgLy8gYSBzaW5nbGUgdW5kZWZpbmVkIHJlc3VsdCwgaW4gdGhhdCBgbnVsbGAgZXF1YWxpdHkgY2hlY2tzIHdvbid0IG1hdGNoKS5cbiAgICAgIGlmICghKGlzTnVtZXJpY0tleShmaXJzdFBhcnQpICYmIGZpcnN0UGFydCA8IGRvYy5sZW5ndGgpKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICAgIH1cblxuICAgICAgLy8gUmVtZW1iZXIgdGhhdCB3ZSB1c2VkIHRoaXMgYXJyYXkgaW5kZXguIEluY2x1ZGUgYW4gJ3gnIHRvIGluZGljYXRlIHRoYXRcbiAgICAgIC8vIHRoZSBwcmV2aW91cyBpbmRleCBjYW1lIGZyb20gYmVpbmcgY29uc2lkZXJlZCBhcyBhbiBleHBsaWNpdCBhcnJheVxuICAgICAgLy8gaW5kZXggKG5vdCBicmFuY2hpbmcpLlxuICAgICAgYXJyYXlJbmRpY2VzID0gYXJyYXlJbmRpY2VzID8gYXJyYXlJbmRpY2VzLmNvbmNhdCgrZmlyc3RQYXJ0LCAneCcpIDogWytmaXJzdFBhcnQsICd4J107XG4gICAgfVxuXG4gICAgLy8gRG8gb3VyIGZpcnN0IGxvb2t1cC5cbiAgICBjb25zdCBmaXJzdExldmVsID0gZG9jW2ZpcnN0UGFydF07XG5cbiAgICAvLyBJZiB0aGVyZSBpcyBubyBkZWVwZXIgdG8gZGlnLCByZXR1cm4gd2hhdCB3ZSBmb3VuZC5cbiAgICAvL1xuICAgIC8vIElmIHdoYXQgd2UgZm91bmQgaXMgYW4gYXJyYXksIG1vc3QgdmFsdWUgc2VsZWN0b3JzIHdpbGwgY2hvb3NlIHRvIHRyZWF0XG4gICAgLy8gdGhlIGVsZW1lbnRzIG9mIHRoZSBhcnJheSBhcyBtYXRjaGFibGUgdmFsdWVzIGluIHRoZWlyIG93biByaWdodCwgYnV0XG4gICAgLy8gdGhhdCdzIGRvbmUgb3V0c2lkZSBvZiB0aGUgbG9va3VwIGZ1bmN0aW9uLiAoRXhjZXB0aW9ucyB0byB0aGlzIGFyZSAkc2l6ZVxuICAgIC8vIGFuZCBzdHVmZiByZWxhdGluZyB0byAkZWxlbU1hdGNoLiAgZWcsIHthOiB7JHNpemU6IDJ9fSBkb2VzIG5vdCBtYXRjaCB7YTpcbiAgICAvLyBbWzEsIDJdXX0uKVxuICAgIC8vXG4gICAgLy8gVGhhdCBzYWlkLCBpZiB3ZSBqdXN0IGRpZCBhbiAqZXhwbGljaXQqIGFycmF5IGxvb2t1cCAob24gZG9jKSB0byBmaW5kXG4gICAgLy8gZmlyc3RMZXZlbCwgYW5kIGZpcnN0TGV2ZWwgaXMgYW4gYXJyYXkgdG9vLCB3ZSBkbyBOT1Qgd2FudCB2YWx1ZVxuICAgIC8vIHNlbGVjdG9ycyB0byBpdGVyYXRlIG92ZXIgaXQuICBlZywgeydhLjAnOiA1fSBkb2VzIG5vdCBtYXRjaCB7YTogW1s1XV19LlxuICAgIC8vIFNvIGluIHRoYXQgY2FzZSwgd2UgbWFyayB0aGUgcmV0dXJuIHZhbHVlIGFzICdkb24ndCBpdGVyYXRlJy5cbiAgICBpZiAoIWxvb2t1cFJlc3QpIHtcbiAgICAgIHJldHVybiBidWlsZFJlc3VsdChcbiAgICAgICAgYXJyYXlJbmRpY2VzLFxuICAgICAgICBBcnJheS5pc0FycmF5KGRvYykgJiYgQXJyYXkuaXNBcnJheShmaXJzdExldmVsKSxcbiAgICAgICAgZmlyc3RMZXZlbCxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gV2UgbmVlZCB0byBkaWcgZGVlcGVyLiAgQnV0IGlmIHdlIGNhbid0LCBiZWNhdXNlIHdoYXQgd2UndmUgZm91bmQgaXMgbm90XG4gICAgLy8gYW4gYXJyYXkgb3IgcGxhaW4gb2JqZWN0LCB3ZSdyZSBkb25lLiBJZiB3ZSBqdXN0IGRpZCBhIG51bWVyaWMgaW5kZXggaW50b1xuICAgIC8vIGFuIGFycmF5LCB3ZSByZXR1cm4gbm90aGluZyBoZXJlICh0aGlzIGlzIGEgY2hhbmdlIGluIE1vbmdvIDIuNSBmcm9tXG4gICAgLy8gTW9uZ28gMi40LCB3aGVyZSB7J2EuMC5iJzogbnVsbH0gc3RvcHBlZCBtYXRjaGluZyB7YTogWzVdfSkuIE90aGVyd2lzZSxcbiAgICAvLyByZXR1cm4gYSBzaW5nbGUgYHVuZGVmaW5lZGAgKHdoaWNoIGNhbiwgZm9yIGV4YW1wbGUsIG1hdGNoIHZpYSBlcXVhbGl0eVxuICAgIC8vIHdpdGggYG51bGxgKS5cbiAgICBpZiAoIWlzSW5kZXhhYmxlKGZpcnN0TGV2ZWwpKSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShkb2MpKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGJ1aWxkUmVzdWx0KGFycmF5SW5kaWNlcywgZmFsc2UsIHVuZGVmaW5lZCk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdWx0ID0gW107XG4gICAgY29uc3QgYXBwZW5kVG9SZXN1bHQgPSBtb3JlID0+IHtcbiAgICAgIHJlc3VsdC5wdXNoKC4uLm1vcmUpO1xuICAgIH07XG5cbiAgICAvLyBEaWcgZGVlcGVyOiBsb29rIHVwIHRoZSByZXN0IG9mIHRoZSBwYXJ0cyBvbiB3aGF0ZXZlciB3ZSd2ZSBmb3VuZC5cbiAgICAvLyAobG9va3VwUmVzdCBpcyBzbWFydCBlbm91Z2ggdG8gbm90IHRyeSB0byBkbyBpbnZhbGlkIGxvb2t1cHMgaW50b1xuICAgIC8vIGZpcnN0TGV2ZWwgaWYgaXQncyBhbiBhcnJheS4pXG4gICAgYXBwZW5kVG9SZXN1bHQobG9va3VwUmVzdChmaXJzdExldmVsLCBhcnJheUluZGljZXMpKTtcblxuICAgIC8vIElmIHdlIGZvdW5kIGFuIGFycmF5LCB0aGVuIGluICphZGRpdGlvbiogdG8gcG90ZW50aWFsbHkgdHJlYXRpbmcgdGhlIG5leHRcbiAgICAvLyBwYXJ0IGFzIGEgbGl0ZXJhbCBpbnRlZ2VyIGxvb2t1cCwgd2Ugc2hvdWxkIGFsc28gJ2JyYW5jaCc6IHRyeSB0byBsb29rIHVwXG4gICAgLy8gdGhlIHJlc3Qgb2YgdGhlIHBhcnRzIG9uIGVhY2ggYXJyYXkgZWxlbWVudCBpbiBwYXJhbGxlbC5cbiAgICAvL1xuICAgIC8vIEluIHRoaXMgY2FzZSwgd2UgKm9ubHkqIGRpZyBkZWVwZXIgaW50byBhcnJheSBlbGVtZW50cyB0aGF0IGFyZSBwbGFpblxuICAgIC8vIG9iamVjdHMuIChSZWNhbGwgdGhhdCB3ZSBvbmx5IGdvdCB0aGlzIGZhciBpZiB3ZSBoYXZlIGZ1cnRoZXIgdG8gZGlnLilcbiAgICAvLyBUaGlzIG1ha2VzIHNlbnNlOiB3ZSBjZXJ0YWlubHkgZG9uJ3QgZGlnIGRlZXBlciBpbnRvIG5vbi1pbmRleGFibGVcbiAgICAvLyBvYmplY3RzLiBBbmQgaXQgd291bGQgYmUgd2VpcmQgdG8gZGlnIGludG8gYW4gYXJyYXk6IGl0J3Mgc2ltcGxlciB0byBoYXZlXG4gICAgLy8gYSBydWxlIHRoYXQgZXhwbGljaXQgaW50ZWdlciBpbmRleGVzIG9ubHkgYXBwbHkgdG8gYW4gb3V0ZXIgYXJyYXksIG5vdCB0b1xuICAgIC8vIGFuIGFycmF5IHlvdSBmaW5kIGFmdGVyIGEgYnJhbmNoaW5nIHNlYXJjaC5cbiAgICAvL1xuICAgIC8vIEluIHRoZSBzcGVjaWFsIGNhc2Ugb2YgYSBudW1lcmljIHBhcnQgaW4gYSAqc29ydCBzZWxlY3RvciogKG5vdCBhIHF1ZXJ5XG4gICAgLy8gc2VsZWN0b3IpLCB3ZSBza2lwIHRoZSBicmFuY2hpbmc6IHdlIE9OTFkgYWxsb3cgdGhlIG51bWVyaWMgcGFydCB0byBtZWFuXG4gICAgLy8gJ2xvb2sgdXAgdGhpcyBpbmRleCcgaW4gdGhhdCBjYXNlLCBub3QgJ2Fsc28gbG9vayB1cCB0aGlzIGluZGV4IGluIGFsbFxuICAgIC8vIHRoZSBlbGVtZW50cyBvZiB0aGUgYXJyYXknLlxuICAgIGlmIChBcnJheS5pc0FycmF5KGZpcnN0TGV2ZWwpICYmXG4gICAgICAgICEoaXNOdW1lcmljS2V5KHBhcnRzWzFdKSAmJiBvcHRpb25zLmZvclNvcnQpKSB7XG4gICAgICBmaXJzdExldmVsLmZvckVhY2goKGJyYW5jaCwgYXJyYXlJbmRleCkgPT4ge1xuICAgICAgICBpZiAoTG9jYWxDb2xsZWN0aW9uLl9pc1BsYWluT2JqZWN0KGJyYW5jaCkpIHtcbiAgICAgICAgICBhcHBlbmRUb1Jlc3VsdChsb29rdXBSZXN0KGJyYW5jaCwgYXJyYXlJbmRpY2VzID8gYXJyYXlJbmRpY2VzLmNvbmNhdChhcnJheUluZGV4KSA6IFthcnJheUluZGV4XSkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xufVxuXG4vLyBPYmplY3QgZXhwb3J0ZWQgb25seSBmb3IgdW5pdCB0ZXN0aW5nLlxuLy8gVXNlIGl0IHRvIGV4cG9ydCBwcml2YXRlIGZ1bmN0aW9ucyB0byB0ZXN0IGluIFRpbnl0ZXN0LlxuTWluaW1vbmdvVGVzdCA9IHttYWtlTG9va3VwRnVuY3Rpb259O1xuTWluaW1vbmdvRXJyb3IgPSAobWVzc2FnZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGlmICh0eXBlb2YgbWVzc2FnZSA9PT0gJ3N0cmluZycgJiYgb3B0aW9ucy5maWVsZCkge1xuICAgIG1lc3NhZ2UgKz0gYCBmb3IgZmllbGQgJyR7b3B0aW9ucy5maWVsZH0nYDtcbiAgfVxuXG4gIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xuICBlcnJvci5uYW1lID0gJ01pbmltb25nb0Vycm9yJztcbiAgcmV0dXJuIGVycm9yO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIG5vdGhpbmdNYXRjaGVyKGRvY09yQnJhbmNoZWRWYWx1ZXMpIHtcbiAgcmV0dXJuIHtyZXN1bHQ6IGZhbHNlfTtcbn1cblxuLy8gVGFrZXMgYW4gb3BlcmF0b3Igb2JqZWN0IChhbiBvYmplY3Qgd2l0aCAkIGtleXMpIGFuZCByZXR1cm5zIGEgYnJhbmNoZWRcbi8vIG1hdGNoZXIgZm9yIGl0LlxuZnVuY3Rpb24gb3BlcmF0b3JCcmFuY2hlZE1hdGNoZXIodmFsdWVTZWxlY3RvciwgbWF0Y2hlciwgaXNSb290KSB7XG4gIC8vIEVhY2ggdmFsdWVTZWxlY3RvciB3b3JrcyBzZXBhcmF0ZWx5IG9uIHRoZSB2YXJpb3VzIGJyYW5jaGVzLiAgU28gb25lXG4gIC8vIG9wZXJhdG9yIGNhbiBtYXRjaCBvbmUgYnJhbmNoIGFuZCBhbm90aGVyIGNhbiBtYXRjaCBhbm90aGVyIGJyYW5jaC4gIFRoaXNcbiAgLy8gaXMgT0suXG4gIGNvbnN0IG9wZXJhdG9yTWF0Y2hlcnMgPSBPYmplY3Qua2V5cyh2YWx1ZVNlbGVjdG9yKS5tYXAob3BlcmF0b3IgPT4ge1xuICAgIGNvbnN0IG9wZXJhbmQgPSB2YWx1ZVNlbGVjdG9yW29wZXJhdG9yXTtcblxuICAgIGNvbnN0IHNpbXBsZVJhbmdlID0gKFxuICAgICAgWyckbHQnLCAnJGx0ZScsICckZ3QnLCAnJGd0ZSddLmluY2x1ZGVzKG9wZXJhdG9yKSAmJlxuICAgICAgdHlwZW9mIG9wZXJhbmQgPT09ICdudW1iZXInXG4gICAgKTtcblxuICAgIGNvbnN0IHNpbXBsZUVxdWFsaXR5ID0gKFxuICAgICAgWyckbmUnLCAnJGVxJ10uaW5jbHVkZXMob3BlcmF0b3IpICYmXG4gICAgICBvcGVyYW5kICE9PSBPYmplY3Qob3BlcmFuZClcbiAgICApO1xuXG4gICAgY29uc3Qgc2ltcGxlSW5jbHVzaW9uID0gKFxuICAgICAgWyckaW4nLCAnJG5pbiddLmluY2x1ZGVzKG9wZXJhdG9yKVxuICAgICAgJiYgQXJyYXkuaXNBcnJheShvcGVyYW5kKVxuICAgICAgJiYgIW9wZXJhbmQuc29tZSh4ID0+IHggPT09IE9iamVjdCh4KSlcbiAgICApO1xuXG4gICAgaWYgKCEoc2ltcGxlUmFuZ2UgfHwgc2ltcGxlSW5jbHVzaW9uIHx8IHNpbXBsZUVxdWFsaXR5KSkge1xuICAgICAgbWF0Y2hlci5faXNTaW1wbGUgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoaGFzT3duLmNhbGwoVkFMVUVfT1BFUkFUT1JTLCBvcGVyYXRvcikpIHtcbiAgICAgIHJldHVybiBWQUxVRV9PUEVSQVRPUlNbb3BlcmF0b3JdKG9wZXJhbmQsIHZhbHVlU2VsZWN0b3IsIG1hdGNoZXIsIGlzUm9vdCk7XG4gICAgfVxuXG4gICAgaWYgKGhhc093bi5jYWxsKEVMRU1FTlRfT1BFUkFUT1JTLCBvcGVyYXRvcikpIHtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSBFTEVNRU5UX09QRVJBVE9SU1tvcGVyYXRvcl07XG4gICAgICByZXR1cm4gY29udmVydEVsZW1lbnRNYXRjaGVyVG9CcmFuY2hlZE1hdGNoZXIoXG4gICAgICAgIG9wdGlvbnMuY29tcGlsZUVsZW1lbnRTZWxlY3RvcihvcGVyYW5kLCB2YWx1ZVNlbGVjdG9yLCBtYXRjaGVyKSxcbiAgICAgICAgb3B0aW9uc1xuICAgICAgKTtcbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgTWluaU1vbmdvUXVlcnlFcnJvcihgVW5yZWNvZ25pemVkIG9wZXJhdG9yOiAke29wZXJhdG9yfWApO1xuICB9KTtcblxuICByZXR1cm4gYW5kQnJhbmNoZWRNYXRjaGVycyhvcGVyYXRvck1hdGNoZXJzKTtcbn1cblxuLy8gcGF0aHMgLSBBcnJheTogbGlzdCBvZiBtb25nbyBzdHlsZSBwYXRoc1xuLy8gbmV3TGVhZkZuIC0gRnVuY3Rpb246IG9mIGZvcm0gZnVuY3Rpb24ocGF0aCkgc2hvdWxkIHJldHVybiBhIHNjYWxhciB2YWx1ZSB0b1xuLy8gICAgICAgICAgICAgICAgICAgICAgIHB1dCBpbnRvIGxpc3QgY3JlYXRlZCBmb3IgdGhhdCBwYXRoXG4vLyBjb25mbGljdEZuIC0gRnVuY3Rpb246IG9mIGZvcm0gZnVuY3Rpb24obm9kZSwgcGF0aCwgZnVsbFBhdGgpIGlzIGNhbGxlZFxuLy8gICAgICAgICAgICAgICAgICAgICAgICB3aGVuIGJ1aWxkaW5nIGEgdHJlZSBwYXRoIGZvciAnZnVsbFBhdGgnIG5vZGUgb25cbi8vICAgICAgICAgICAgICAgICAgICAgICAgJ3BhdGgnIHdhcyBhbHJlYWR5IGEgbGVhZiB3aXRoIGEgdmFsdWUuIE11c3QgcmV0dXJuIGFcbi8vICAgICAgICAgICAgICAgICAgICAgICAgY29uZmxpY3QgcmVzb2x1dGlvbi5cbi8vIGluaXRpYWwgdHJlZSAtIE9wdGlvbmFsIE9iamVjdDogc3RhcnRpbmcgdHJlZS5cbi8vIEByZXR1cm5zIC0gT2JqZWN0OiB0cmVlIHJlcHJlc2VudGVkIGFzIGEgc2V0IG9mIG5lc3RlZCBvYmplY3RzXG5leHBvcnQgZnVuY3Rpb24gcGF0aHNUb1RyZWUocGF0aHMsIG5ld0xlYWZGbiwgY29uZmxpY3RGbiwgcm9vdCA9IHt9KSB7XG4gIHBhdGhzLmZvckVhY2gocGF0aCA9PiB7XG4gICAgY29uc3QgcGF0aEFycmF5ID0gcGF0aC5zcGxpdCgnLicpO1xuICAgIGxldCB0cmVlID0gcm9vdDtcblxuICAgIC8vIHVzZSAuZXZlcnkganVzdCBmb3IgaXRlcmF0aW9uIHdpdGggYnJlYWtcbiAgICBjb25zdCBzdWNjZXNzID0gcGF0aEFycmF5LnNsaWNlKDAsIC0xKS5ldmVyeSgoa2V5LCBpKSA9PiB7XG4gICAgICBpZiAoIWhhc093bi5jYWxsKHRyZWUsIGtleSkpIHtcbiAgICAgICAgdHJlZVtrZXldID0ge307XG4gICAgICB9IGVsc2UgaWYgKHRyZWVba2V5XSAhPT0gT2JqZWN0KHRyZWVba2V5XSkpIHtcbiAgICAgICAgdHJlZVtrZXldID0gY29uZmxpY3RGbihcbiAgICAgICAgICB0cmVlW2tleV0sXG4gICAgICAgICAgcGF0aEFycmF5LnNsaWNlKDAsIGkgKyAxKS5qb2luKCcuJyksXG4gICAgICAgICAgcGF0aFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIGJyZWFrIG91dCBvZiBsb29wIGlmIHdlIGFyZSBmYWlsaW5nIGZvciB0aGlzIHBhdGhcbiAgICAgICAgaWYgKHRyZWVba2V5XSAhPT0gT2JqZWN0KHRyZWVba2V5XSkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdHJlZSA9IHRyZWVba2V5XTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG5cbiAgICBpZiAoc3VjY2Vzcykge1xuICAgICAgY29uc3QgbGFzdEtleSA9IHBhdGhBcnJheVtwYXRoQXJyYXkubGVuZ3RoIC0gMV07XG4gICAgICBpZiAoaGFzT3duLmNhbGwodHJlZSwgbGFzdEtleSkpIHtcbiAgICAgICAgdHJlZVtsYXN0S2V5XSA9IGNvbmZsaWN0Rm4odHJlZVtsYXN0S2V5XSwgcGF0aCwgcGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0cmVlW2xhc3RLZXldID0gbmV3TGVhZkZuKHBhdGgpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHJvb3Q7XG59XG5cbi8vIE1ha2VzIHN1cmUgd2UgZ2V0IDIgZWxlbWVudHMgYXJyYXkgYW5kIGFzc3VtZSB0aGUgZmlyc3Qgb25lIHRvIGJlIHggYW5kXG4vLyB0aGUgc2Vjb25kIG9uZSB0byB5IG5vIG1hdHRlciB3aGF0IHVzZXIgcGFzc2VzLlxuLy8gSW4gY2FzZSB1c2VyIHBhc3NlcyB7IGxvbjogeCwgbGF0OiB5IH0gcmV0dXJucyBbeCwgeV1cbmZ1bmN0aW9uIHBvaW50VG9BcnJheShwb2ludCkge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShwb2ludCkgPyBwb2ludC5zbGljZSgpIDogW3BvaW50LngsIHBvaW50LnldO1xufVxuXG4vLyBDcmVhdGluZyBhIGRvY3VtZW50IGZyb20gYW4gdXBzZXJ0IGlzIHF1aXRlIHRyaWNreS5cbi8vIEUuZy4gdGhpcyBzZWxlY3Rvcjoge1wiJG9yXCI6IFt7XCJiLmZvb1wiOiB7XCIkYWxsXCI6IFtcImJhclwiXX19XX0sIHNob3VsZCByZXN1bHRcbi8vIGluOiB7XCJiLmZvb1wiOiBcImJhclwifVxuLy8gQnV0IHRoaXMgc2VsZWN0b3I6IHtcIiRvclwiOiBbe1wiYlwiOiB7XCJmb29cIjoge1wiJGFsbFwiOiBbXCJiYXJcIl19fX1dfSBzaG91bGQgdGhyb3dcbi8vIGFuIGVycm9yXG5cbi8vIFNvbWUgcnVsZXMgKGZvdW5kIG1haW5seSB3aXRoIHRyaWFsICYgZXJyb3IsIHNvIHRoZXJlIG1pZ2h0IGJlIG1vcmUpOlxuLy8gLSBoYW5kbGUgYWxsIGNoaWxkcyBvZiAkYW5kIChvciBpbXBsaWNpdCAkYW5kKVxuLy8gLSBoYW5kbGUgJG9yIG5vZGVzIHdpdGggZXhhY3RseSAxIGNoaWxkXG4vLyAtIGlnbm9yZSAkb3Igbm9kZXMgd2l0aCBtb3JlIHRoYW4gMSBjaGlsZFxuLy8gLSBpZ25vcmUgJG5vciBhbmQgJG5vdCBub2Rlc1xuLy8gLSB0aHJvdyB3aGVuIGEgdmFsdWUgY2FuIG5vdCBiZSBzZXQgdW5hbWJpZ3VvdXNseVxuLy8gLSBldmVyeSB2YWx1ZSBmb3IgJGFsbCBzaG91bGQgYmUgZGVhbHQgd2l0aCBhcyBzZXBhcmF0ZSAkZXEtc1xuLy8gLSB0aHJlYXQgYWxsIGNoaWxkcmVuIG9mICRhbGwgYXMgJGVxIHNldHRlcnMgKD0+IHNldCBpZiAkYWxsLmxlbmd0aCA9PT0gMSxcbi8vICAgb3RoZXJ3aXNlIHRocm93IGVycm9yKVxuLy8gLSB5b3UgY2FuIG5vdCBtaXggJyQnLXByZWZpeGVkIGtleXMgYW5kIG5vbi0nJCctcHJlZml4ZWQga2V5c1xuLy8gLSB5b3UgY2FuIG9ubHkgaGF2ZSBkb3R0ZWQga2V5cyBvbiBhIHJvb3QtbGV2ZWxcbi8vIC0geW91IGNhbiBub3QgaGF2ZSAnJCctcHJlZml4ZWQga2V5cyBtb3JlIHRoYW4gb25lLWxldmVsIGRlZXAgaW4gYW4gb2JqZWN0XG5cbi8vIEhhbmRsZXMgb25lIGtleS92YWx1ZSBwYWlyIHRvIHB1dCBpbiB0aGUgc2VsZWN0b3IgZG9jdW1lbnRcbmZ1bmN0aW9uIHBvcHVsYXRlRG9jdW1lbnRXaXRoS2V5VmFsdWUoZG9jdW1lbnQsIGtleSwgdmFsdWUpIHtcbiAgaWYgKHZhbHVlICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZih2YWx1ZSkgPT09IE9iamVjdC5wcm90b3R5cGUpIHtcbiAgICBwb3B1bGF0ZURvY3VtZW50V2l0aE9iamVjdChkb2N1bWVudCwga2V5LCB2YWx1ZSk7XG4gIH0gZWxzZSBpZiAoISh2YWx1ZSBpbnN0YW5jZW9mIFJlZ0V4cCkpIHtcbiAgICBpbnNlcnRJbnRvRG9jdW1lbnQoZG9jdW1lbnQsIGtleSwgdmFsdWUpO1xuICB9XG59XG5cbi8vIEhhbmRsZXMgYSBrZXksIHZhbHVlIHBhaXIgdG8gcHV0IGluIHRoZSBzZWxlY3RvciBkb2N1bWVudFxuLy8gaWYgdGhlIHZhbHVlIGlzIGFuIG9iamVjdFxuZnVuY3Rpb24gcG9wdWxhdGVEb2N1bWVudFdpdGhPYmplY3QoZG9jdW1lbnQsIGtleSwgdmFsdWUpIHtcbiAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgY29uc3QgdW5wcmVmaXhlZEtleXMgPSBrZXlzLmZpbHRlcihvcCA9PiBvcFswXSAhPT0gJyQnKTtcblxuICBpZiAodW5wcmVmaXhlZEtleXMubGVuZ3RoID4gMCB8fCAha2V5cy5sZW5ndGgpIHtcbiAgICAvLyBMaXRlcmFsIChwb3NzaWJseSBlbXB0eSkgb2JqZWN0ICggb3IgZW1wdHkgb2JqZWN0IClcbiAgICAvLyBEb24ndCBhbGxvdyBtaXhpbmcgJyQnLXByZWZpeGVkIHdpdGggbm9uLSckJy1wcmVmaXhlZCBmaWVsZHNcbiAgICBpZiAoa2V5cy5sZW5ndGggIT09IHVucHJlZml4ZWRLZXlzLmxlbmd0aCkge1xuICAgICAgdGhyb3cgbmV3IE1pbmlNb25nb1F1ZXJ5RXJyb3IoYHVua25vd24gb3BlcmF0b3I6ICR7dW5wcmVmaXhlZEtleXNbMF19YCk7XG4gICAgfVxuXG4gICAgdmFsaWRhdGVPYmplY3QodmFsdWUsIGtleSk7XG4gICAgaW5zZXJ0SW50b0RvY3VtZW50KGRvY3VtZW50LCBrZXksIHZhbHVlKTtcbiAgfSBlbHNlIHtcbiAgICBPYmplY3Qua2V5cyh2YWx1ZSkuZm9yRWFjaChvcCA9PiB7XG4gICAgICBjb25zdCBvYmplY3QgPSB2YWx1ZVtvcF07XG5cbiAgICAgIGlmIChvcCA9PT0gJyRlcScpIHtcbiAgICAgICAgcG9wdWxhdGVEb2N1bWVudFdpdGhLZXlWYWx1ZShkb2N1bWVudCwga2V5LCBvYmplY3QpO1xuICAgICAgfSBlbHNlIGlmIChvcCA9PT0gJyRhbGwnKSB7XG4gICAgICAgIC8vIGV2ZXJ5IHZhbHVlIGZvciAkYWxsIHNob3VsZCBiZSBkZWFsdCB3aXRoIGFzIHNlcGFyYXRlICRlcS1zXG4gICAgICAgIG9iamVjdC5mb3JFYWNoKGVsZW1lbnQgPT5cbiAgICAgICAgICBwb3B1bGF0ZURvY3VtZW50V2l0aEtleVZhbHVlKGRvY3VtZW50LCBrZXksIGVsZW1lbnQpXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuLy8gRmlsbHMgYSBkb2N1bWVudCB3aXRoIGNlcnRhaW4gZmllbGRzIGZyb20gYW4gdXBzZXJ0IHNlbGVjdG9yXG5leHBvcnQgZnVuY3Rpb24gcG9wdWxhdGVEb2N1bWVudFdpdGhRdWVyeUZpZWxkcyhxdWVyeSwgZG9jdW1lbnQgPSB7fSkge1xuICBpZiAoT2JqZWN0LmdldFByb3RvdHlwZU9mKHF1ZXJ5KSA9PT0gT2JqZWN0LnByb3RvdHlwZSkge1xuICAgIC8vIGhhbmRsZSBpbXBsaWNpdCAkYW5kXG4gICAgT2JqZWN0LmtleXMocXVlcnkpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gcXVlcnlba2V5XTtcblxuICAgICAgaWYgKGtleSA9PT0gJyRhbmQnKSB7XG4gICAgICAgIC8vIGhhbmRsZSBleHBsaWNpdCAkYW5kXG4gICAgICAgIHZhbHVlLmZvckVhY2goZWxlbWVudCA9PlxuICAgICAgICAgIHBvcHVsYXRlRG9jdW1lbnRXaXRoUXVlcnlGaWVsZHMoZWxlbWVudCwgZG9jdW1lbnQpXG4gICAgICAgICk7XG4gICAgICB9IGVsc2UgaWYgKGtleSA9PT0gJyRvcicpIHtcbiAgICAgICAgLy8gaGFuZGxlICRvciBub2RlcyB3aXRoIGV4YWN0bHkgMSBjaGlsZFxuICAgICAgICBpZiAodmFsdWUubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgcG9wdWxhdGVEb2N1bWVudFdpdGhRdWVyeUZpZWxkcyh2YWx1ZVswXSwgZG9jdW1lbnQpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGtleVswXSAhPT0gJyQnKSB7XG4gICAgICAgIC8vIElnbm9yZSBvdGhlciAnJCctcHJlZml4ZWQgbG9naWNhbCBzZWxlY3RvcnNcbiAgICAgICAgcG9wdWxhdGVEb2N1bWVudFdpdGhLZXlWYWx1ZShkb2N1bWVudCwga2V5LCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gSGFuZGxlIG1ldGVvci1zcGVjaWZpYyBzaG9ydGN1dCBmb3Igc2VsZWN0aW5nIF9pZFxuICAgIGlmIChMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZChxdWVyeSkpIHtcbiAgICAgIGluc2VydEludG9Eb2N1bWVudChkb2N1bWVudCwgJ19pZCcsIHF1ZXJ5KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZG9jdW1lbnQ7XG59XG5cbi8vIFRyYXZlcnNlcyB0aGUga2V5cyBvZiBwYXNzZWQgcHJvamVjdGlvbiBhbmQgY29uc3RydWN0cyBhIHRyZWUgd2hlcmUgYWxsXG4vLyBsZWF2ZXMgYXJlIGVpdGhlciBhbGwgVHJ1ZSBvciBhbGwgRmFsc2Vcbi8vIEByZXR1cm5zIE9iamVjdDpcbi8vICAtIHRyZWUgLSBPYmplY3QgLSB0cmVlIHJlcHJlc2VudGF0aW9uIG9mIGtleXMgaW52b2x2ZWQgaW4gcHJvamVjdGlvblxuLy8gIChleGNlcHRpb24gZm9yICdfaWQnIGFzIGl0IGlzIGEgc3BlY2lhbCBjYXNlIGhhbmRsZWQgc2VwYXJhdGVseSlcbi8vICAtIGluY2x1ZGluZyAtIEJvb2xlYW4gLSBcInRha2Ugb25seSBjZXJ0YWluIGZpZWxkc1wiIHR5cGUgb2YgcHJvamVjdGlvblxuZXhwb3J0IGZ1bmN0aW9uIHByb2plY3Rpb25EZXRhaWxzKGZpZWxkcykge1xuICAvLyBGaW5kIHRoZSBub24tX2lkIGtleXMgKF9pZCBpcyBoYW5kbGVkIHNwZWNpYWxseSBiZWNhdXNlIGl0IGlzIGluY2x1ZGVkXG4gIC8vIHVubGVzcyBleHBsaWNpdGx5IGV4Y2x1ZGVkKS4gU29ydCB0aGUga2V5cywgc28gdGhhdCBvdXIgY29kZSB0byBkZXRlY3RcbiAgLy8gb3ZlcmxhcHMgbGlrZSAnZm9vJyBhbmQgJ2Zvby5iYXInIGNhbiBhc3N1bWUgdGhhdCAnZm9vJyBjb21lcyBmaXJzdC5cbiAgbGV0IGZpZWxkc0tleXMgPSBPYmplY3Qua2V5cyhmaWVsZHMpLnNvcnQoKTtcblxuICAvLyBJZiBfaWQgaXMgdGhlIG9ubHkgZmllbGQgaW4gdGhlIHByb2plY3Rpb24sIGRvIG5vdCByZW1vdmUgaXQsIHNpbmNlIGl0IGlzXG4gIC8vIHJlcXVpcmVkIHRvIGRldGVybWluZSBpZiB0aGlzIGlzIGFuIGV4Y2x1c2lvbiBvciBleGNsdXNpb24uIEFsc28ga2VlcCBhblxuICAvLyBpbmNsdXNpdmUgX2lkLCBzaW5jZSBpbmNsdXNpdmUgX2lkIGZvbGxvd3MgdGhlIG5vcm1hbCBydWxlcyBhYm91dCBtaXhpbmdcbiAgLy8gaW5jbHVzaXZlIGFuZCBleGNsdXNpdmUgZmllbGRzLiBJZiBfaWQgaXMgbm90IHRoZSBvbmx5IGZpZWxkIGluIHRoZVxuICAvLyBwcm9qZWN0aW9uIGFuZCBpcyBleGNsdXNpdmUsIHJlbW92ZSBpdCBzbyBpdCBjYW4gYmUgaGFuZGxlZCBsYXRlciBieSBhXG4gIC8vIHNwZWNpYWwgY2FzZSwgc2luY2UgZXhjbHVzaXZlIF9pZCBpcyBhbHdheXMgYWxsb3dlZC5cbiAgaWYgKCEoZmllbGRzS2V5cy5sZW5ndGggPT09IDEgJiYgZmllbGRzS2V5c1swXSA9PT0gJ19pZCcpICYmXG4gICAgICAhKGZpZWxkc0tleXMuaW5jbHVkZXMoJ19pZCcpICYmIGZpZWxkcy5faWQpKSB7XG4gICAgZmllbGRzS2V5cyA9IGZpZWxkc0tleXMuZmlsdGVyKGtleSA9PiBrZXkgIT09ICdfaWQnKTtcbiAgfVxuXG4gIGxldCBpbmNsdWRpbmcgPSBudWxsOyAvLyBVbmtub3duXG5cbiAgZmllbGRzS2V5cy5mb3JFYWNoKGtleVBhdGggPT4ge1xuICAgIGNvbnN0IHJ1bGUgPSAhIWZpZWxkc1trZXlQYXRoXTtcblxuICAgIGlmIChpbmNsdWRpbmcgPT09IG51bGwpIHtcbiAgICAgIGluY2x1ZGluZyA9IHJ1bGU7XG4gICAgfVxuXG4gICAgLy8gVGhpcyBlcnJvciBtZXNzYWdlIGlzIGNvcGllZCBmcm9tIE1vbmdvREIgc2hlbGxcbiAgICBpZiAoaW5jbHVkaW5nICE9PSBydWxlKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgJ1lvdSBjYW5ub3QgY3VycmVudGx5IG1peCBpbmNsdWRpbmcgYW5kIGV4Y2x1ZGluZyBmaWVsZHMuJ1xuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIGNvbnN0IHByb2plY3Rpb25SdWxlc1RyZWUgPSBwYXRoc1RvVHJlZShcbiAgICBmaWVsZHNLZXlzLFxuICAgIHBhdGggPT4gaW5jbHVkaW5nLFxuICAgIChub2RlLCBwYXRoLCBmdWxsUGF0aCkgPT4ge1xuICAgICAgLy8gQ2hlY2sgcGFzc2VkIHByb2plY3Rpb24gZmllbGRzJyBrZXlzOiBJZiB5b3UgaGF2ZSB0d28gcnVsZXMgc3VjaCBhc1xuICAgICAgLy8gJ2Zvby5iYXInIGFuZCAnZm9vLmJhci5iYXonLCB0aGVuIHRoZSByZXN1bHQgYmVjb21lcyBhbWJpZ3VvdXMuIElmXG4gICAgICAvLyB0aGF0IGhhcHBlbnMsIHRoZXJlIGlzIGEgcHJvYmFiaWxpdHkgeW91IGFyZSBkb2luZyBzb21ldGhpbmcgd3JvbmcsXG4gICAgICAvLyBmcmFtZXdvcmsgc2hvdWxkIG5vdGlmeSB5b3UgYWJvdXQgc3VjaCBtaXN0YWtlIGVhcmxpZXIgb24gY3Vyc29yXG4gICAgICAvLyBjb21waWxhdGlvbiBzdGVwIHRoYW4gbGF0ZXIgZHVyaW5nIHJ1bnRpbWUuICBOb3RlLCB0aGF0IHJlYWwgbW9uZ29cbiAgICAgIC8vIGRvZXNuJ3QgZG8gYW55dGhpbmcgYWJvdXQgaXQgYW5kIHRoZSBsYXRlciBydWxlIGFwcGVhcnMgaW4gcHJvamVjdGlvblxuICAgICAgLy8gcHJvamVjdCwgbW9yZSBwcmlvcml0eSBpdCB0YWtlcy5cbiAgICAgIC8vXG4gICAgICAvLyBFeGFtcGxlLCBhc3N1bWUgZm9sbG93aW5nIGluIG1vbmdvIHNoZWxsOlxuICAgICAgLy8gPiBkYi5jb2xsLmluc2VydCh7IGE6IHsgYjogMjMsIGM6IDQ0IH0gfSlcbiAgICAgIC8vID4gZGIuY29sbC5maW5kKHt9LCB7ICdhJzogMSwgJ2EuYic6IDEgfSlcbiAgICAgIC8vIHtcIl9pZFwiOiBPYmplY3RJZChcIjUyMGJmZTQ1NjAyNDYwOGU4ZWYyNGFmM1wiKSwgXCJhXCI6IHtcImJcIjogMjN9fVxuICAgICAgLy8gPiBkYi5jb2xsLmZpbmQoe30sIHsgJ2EuYic6IDEsICdhJzogMSB9KVxuICAgICAgLy8ge1wiX2lkXCI6IE9iamVjdElkKFwiNTIwYmZlNDU2MDI0NjA4ZThlZjI0YWYzXCIpLCBcImFcIjoge1wiYlwiOiAyMywgXCJjXCI6IDQ0fX1cbiAgICAgIC8vXG4gICAgICAvLyBOb3RlLCBob3cgc2Vjb25kIHRpbWUgdGhlIHJldHVybiBzZXQgb2Yga2V5cyBpcyBkaWZmZXJlbnQuXG4gICAgICBjb25zdCBjdXJyZW50UGF0aCA9IGZ1bGxQYXRoO1xuICAgICAgY29uc3QgYW5vdGhlclBhdGggPSBwYXRoO1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgIGBib3RoICR7Y3VycmVudFBhdGh9IGFuZCAke2Fub3RoZXJQYXRofSBmb3VuZCBpbiBmaWVsZHMgb3B0aW9uLCBgICtcbiAgICAgICAgJ3VzaW5nIGJvdGggb2YgdGhlbSBtYXkgdHJpZ2dlciB1bmV4cGVjdGVkIGJlaGF2aW9yLiBEaWQgeW91IG1lYW4gdG8gJyArXG4gICAgICAgICd1c2Ugb25seSBvbmUgb2YgdGhlbT8nXG4gICAgICApO1xuICAgIH0pO1xuXG4gIHJldHVybiB7aW5jbHVkaW5nLCB0cmVlOiBwcm9qZWN0aW9uUnVsZXNUcmVlfTtcbn1cblxuLy8gVGFrZXMgYSBSZWdFeHAgb2JqZWN0IGFuZCByZXR1cm5zIGFuIGVsZW1lbnQgbWF0Y2hlci5cbmV4cG9ydCBmdW5jdGlvbiByZWdleHBFbGVtZW50TWF0Y2hlcihyZWdleHApIHtcbiAgcmV0dXJuIHZhbHVlID0+IHtcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpID09PSByZWdleHAudG9TdHJpbmcoKTtcbiAgICB9XG5cbiAgICAvLyBSZWdleHBzIG9ubHkgd29yayBhZ2FpbnN0IHN0cmluZ3MuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBSZXNldCByZWdleHAncyBzdGF0ZSB0byBhdm9pZCBpbmNvbnNpc3RlbnQgbWF0Y2hpbmcgZm9yIG9iamVjdHMgd2l0aCB0aGVcbiAgICAvLyBzYW1lIHZhbHVlIG9uIGNvbnNlY3V0aXZlIGNhbGxzIG9mIHJlZ2V4cC50ZXN0LiBUaGlzIGhhcHBlbnMgb25seSBpZiB0aGVcbiAgICAvLyByZWdleHAgaGFzIHRoZSAnZycgZmxhZy4gQWxzbyBub3RlIHRoYXQgRVM2IGludHJvZHVjZXMgYSBuZXcgZmxhZyAneScgZm9yXG4gICAgLy8gd2hpY2ggd2Ugc2hvdWxkICpub3QqIGNoYW5nZSB0aGUgbGFzdEluZGV4IGJ1dCBNb25nb0RCIGRvZXNuJ3Qgc3VwcG9ydFxuICAgIC8vIGVpdGhlciBvZiB0aGVzZSBmbGFncy5cbiAgICByZWdleHAubGFzdEluZGV4ID0gMDtcblxuICAgIHJldHVybiByZWdleHAudGVzdCh2YWx1ZSk7XG4gIH07XG59XG5cbi8vIFZhbGlkYXRlcyB0aGUga2V5IGluIGEgcGF0aC5cbi8vIE9iamVjdHMgdGhhdCBhcmUgbmVzdGVkIG1vcmUgdGhlbiAxIGxldmVsIGNhbm5vdCBoYXZlIGRvdHRlZCBmaWVsZHNcbi8vIG9yIGZpZWxkcyBzdGFydGluZyB3aXRoICckJ1xuZnVuY3Rpb24gdmFsaWRhdGVLZXlJblBhdGgoa2V5LCBwYXRoKSB7XG4gIGlmIChrZXkuaW5jbHVkZXMoJy4nKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBUaGUgZG90dGVkIGZpZWxkICcke2tleX0nIGluICcke3BhdGh9LiR7a2V5fSBpcyBub3QgdmFsaWQgZm9yIHN0b3JhZ2UuYFxuICAgICk7XG4gIH1cblxuICBpZiAoa2V5WzBdID09PSAnJCcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgVGhlIGRvbGxhciAoJCkgcHJlZml4ZWQgZmllbGQgICcke3BhdGh9LiR7a2V5fSBpcyBub3QgdmFsaWQgZm9yIHN0b3JhZ2UuYFxuICAgICk7XG4gIH1cbn1cblxuLy8gUmVjdXJzaXZlbHkgdmFsaWRhdGVzIGFuIG9iamVjdCB0aGF0IGlzIG5lc3RlZCBtb3JlIHRoYW4gb25lIGxldmVsIGRlZXBcbmZ1bmN0aW9uIHZhbGlkYXRlT2JqZWN0KG9iamVjdCwgcGF0aCkge1xuICBpZiAob2JqZWN0ICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZihvYmplY3QpID09PSBPYmplY3QucHJvdG90eXBlKSB7XG4gICAgT2JqZWN0LmtleXMob2JqZWN0KS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICB2YWxpZGF0ZUtleUluUGF0aChrZXksIHBhdGgpO1xuICAgICAgdmFsaWRhdGVPYmplY3Qob2JqZWN0W2tleV0sIHBhdGggKyAnLicgKyBrZXkpO1xuICAgIH0pO1xuICB9XG59XG4iLCIvKiogRXhwb3J0ZWQgdmFsdWVzIGFyZSBhbHNvIHVzZWQgaW4gdGhlIG1vbmdvIHBhY2thZ2UuICovXG5cbi8qKiBAcGFyYW0ge3N0cmluZ30gbWV0aG9kICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXN5bmNNZXRob2ROYW1lKG1ldGhvZCkge1xuICByZXR1cm4gYCR7bWV0aG9kLnJlcGxhY2UoJ18nLCAnJyl9QXN5bmNgO1xufVxuXG5leHBvcnQgY29uc3QgQVNZTkNfQ09MTEVDVElPTl9NRVRIT0RTID0gW1xuICAnX2NyZWF0ZUNhcHBlZENvbGxlY3Rpb24nLFxuICAnZHJvcENvbGxlY3Rpb24nLFxuICAnZHJvcEluZGV4JyxcbiAgLyoqXG4gICAqIEBzdW1tYXJ5IENyZWF0ZXMgdGhlIHNwZWNpZmllZCBpbmRleCBvbiB0aGUgY29sbGVjdGlvbi5cbiAgICogQGxvY3VzIHNlcnZlclxuICAgKiBAbWV0aG9kIGNyZWF0ZUluZGV4QXN5bmNcbiAgICogQG1lbWJlcm9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBpbmRleCBBIGRvY3VtZW50IHRoYXQgY29udGFpbnMgdGhlIGZpZWxkIGFuZCB2YWx1ZSBwYWlycyB3aGVyZSB0aGUgZmllbGQgaXMgdGhlIGluZGV4IGtleSBhbmQgdGhlIHZhbHVlIGRlc2NyaWJlcyB0aGUgdHlwZSBvZiBpbmRleCBmb3IgdGhhdCBmaWVsZC4gRm9yIGFuIGFzY2VuZGluZyBpbmRleCBvbiBhIGZpZWxkLCBzcGVjaWZ5IGEgdmFsdWUgb2YgYDFgOyBmb3IgZGVzY2VuZGluZyBpbmRleCwgc3BlY2lmeSBhIHZhbHVlIG9mIGAtMWAuIFVzZSBgdGV4dGAgZm9yIHRleHQgaW5kZXhlcy5cbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBBbGwgb3B0aW9ucyBhcmUgbGlzdGVkIGluIFtNb25nb0RCIGRvY3VtZW50YXRpb25dKGh0dHBzOi8vZG9jcy5tb25nb2RiLmNvbS9tYW51YWwvcmVmZXJlbmNlL21ldGhvZC9kYi5jb2xsZWN0aW9uLmNyZWF0ZUluZGV4LyNvcHRpb25zKVxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0aW9ucy5uYW1lIE5hbWUgb2YgdGhlIGluZGV4XG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy51bmlxdWUgRGVmaW5lIHRoYXQgdGhlIGluZGV4IHZhbHVlcyBtdXN0IGJlIHVuaXF1ZSwgbW9yZSBhdCBbTW9uZ29EQiBkb2N1bWVudGF0aW9uXShodHRwczovL2RvY3MubW9uZ29kYi5jb20vbWFudWFsL2NvcmUvaW5kZXgtdW5pcXVlLylcbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnNwYXJzZSBEZWZpbmUgdGhhdCB0aGUgaW5kZXggaXMgc3BhcnNlLCBtb3JlIGF0IFtNb25nb0RCIGRvY3VtZW50YXRpb25dKGh0dHBzOi8vZG9jcy5tb25nb2RiLmNvbS9tYW51YWwvY29yZS9pbmRleC1zcGFyc2UvKVxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICovXG4gICdjcmVhdGVJbmRleCcsXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBGaW5kcyB0aGUgZmlyc3QgZG9jdW1lbnQgdGhhdCBtYXRjaGVzIHRoZSBzZWxlY3RvciwgYXMgb3JkZXJlZCBieSBzb3J0IGFuZCBza2lwIG9wdGlvbnMuIFJldHVybnMgYHVuZGVmaW5lZGAgaWYgbm8gbWF0Y2hpbmcgZG9jdW1lbnQgaXMgZm91bmQuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWV0aG9kIGZpbmRPbmVBc3luY1xuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtNb25nb1NlbGVjdG9yfSBbc2VsZWN0b3JdIEEgcXVlcnkgZGVzY3JpYmluZyB0aGUgZG9jdW1lbnRzIHRvIGZpbmRcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICAgKiBAcGFyYW0ge01vbmdvU29ydFNwZWNpZmllcn0gb3B0aW9ucy5zb3J0IFNvcnQgb3JkZXIgKGRlZmF1bHQ6IG5hdHVyYWwgb3JkZXIpXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRpb25zLnNraXAgTnVtYmVyIG9mIHJlc3VsdHMgdG8gc2tpcCBhdCB0aGUgYmVnaW5uaW5nXG4gICAqIEBwYXJhbSB7TW9uZ29GaWVsZFNwZWNpZmllcn0gb3B0aW9ucy5maWVsZHMgRGljdGlvbmFyeSBvZiBmaWVsZHMgdG8gcmV0dXJuIG9yIGV4Y2x1ZGUuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5yZWFjdGl2ZSAoQ2xpZW50IG9ubHkpIERlZmF1bHQgdHJ1ZTsgcGFzcyBmYWxzZSB0byBkaXNhYmxlIHJlYWN0aXZpdHlcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gb3B0aW9ucy50cmFuc2Zvcm0gT3ZlcnJpZGVzIGB0cmFuc2Zvcm1gIG9uIHRoZSBbYENvbGxlY3Rpb25gXSgjY29sbGVjdGlvbnMpIGZvciB0aGlzIGN1cnNvci4gIFBhc3MgYG51bGxgIHRvIGRpc2FibGUgdHJhbnNmb3JtYXRpb24uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRpb25zLnJlYWRQcmVmZXJlbmNlIChTZXJ2ZXIgb25seSkgU3BlY2lmaWVzIGEgY3VzdG9tIE1vbmdvREIgW2ByZWFkUHJlZmVyZW5jZWBdKGh0dHBzOi8vZG9jcy5tb25nb2RiLmNvbS9tYW51YWwvY29yZS9yZWFkLXByZWZlcmVuY2UpIGZvciBmZXRjaGluZyB0aGUgZG9jdW1lbnQuIFBvc3NpYmxlIHZhbHVlcyBhcmUgYHByaW1hcnlgLCBgcHJpbWFyeVByZWZlcnJlZGAsIGBzZWNvbmRhcnlgLCBgc2Vjb25kYXJ5UHJlZmVycmVkYCBhbmQgYG5lYXJlc3RgLlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICovXG4gICdmaW5kT25lJyxcbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEluc2VydCBhIGRvY3VtZW50IGluIHRoZSBjb2xsZWN0aW9uLiAgUmV0dXJucyBpdHMgdW5pcXVlIF9pZC5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgIGluc2VydEFzeW5jXG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge09iamVjdH0gZG9jIFRoZSBkb2N1bWVudCB0byBpbnNlcnQuIE1heSBub3QgeWV0IGhhdmUgYW4gX2lkIGF0dHJpYnV0ZSwgaW4gd2hpY2ggY2FzZSBNZXRlb3Igd2lsbCBnZW5lcmF0ZSBvbmUgZm9yIHlvdS5cbiAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICovXG4gICdpbnNlcnQnLFxuICAvKipcbiAgICogQHN1bW1hcnkgUmVtb3ZlIGRvY3VtZW50cyBmcm9tIHRoZSBjb2xsZWN0aW9uXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWV0aG9kIHJlbW92ZUFzeW5jXG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IHNlbGVjdG9yIFNwZWNpZmllcyB3aGljaCBkb2N1bWVudHMgdG8gcmVtb3ZlXG4gICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAqL1xuICAncmVtb3ZlJyxcbiAgLyoqXG4gICAqIEBzdW1tYXJ5IE1vZGlmeSBvbmUgb3IgbW9yZSBkb2N1bWVudHMgaW4gdGhlIGNvbGxlY3Rpb24uIFJldHVybnMgdGhlIG51bWJlciBvZiBtYXRjaGVkIGRvY3VtZW50cy5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgdXBkYXRlQXN5bmNcbiAgICogQG1lbWJlcm9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7TW9uZ29TZWxlY3Rvcn0gc2VsZWN0b3IgU3BlY2lmaWVzIHdoaWNoIGRvY3VtZW50cyB0byBtb2RpZnlcbiAgICogQHBhcmFtIHtNb25nb01vZGlmaWVyfSBtb2RpZmllciBTcGVjaWZpZXMgaG93IHRvIG1vZGlmeSB0aGUgZG9jdW1lbnRzXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLm11bHRpIFRydWUgdG8gbW9kaWZ5IGFsbCBtYXRjaGluZyBkb2N1bWVudHM7IGZhbHNlIHRvIG9ubHkgbW9kaWZ5IG9uZSBvZiB0aGUgbWF0Y2hpbmcgZG9jdW1lbnRzICh0aGUgZGVmYXVsdCkuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy51cHNlcnQgVHJ1ZSB0byBpbnNlcnQgYSBkb2N1bWVudCBpZiBubyBtYXRjaGluZyBkb2N1bWVudHMgYXJlIGZvdW5kLlxuICAgKiBAcGFyYW0ge0FycmF5fSBvcHRpb25zLmFycmF5RmlsdGVycyBPcHRpb25hbC4gVXNlZCBpbiBjb21iaW5hdGlvbiB3aXRoIE1vbmdvREIgW2ZpbHRlcmVkIHBvc2l0aW9uYWwgb3BlcmF0b3JdKGh0dHBzOi8vZG9jcy5tb25nb2RiLmNvbS9tYW51YWwvcmVmZXJlbmNlL29wZXJhdG9yL3VwZGF0ZS9wb3NpdGlvbmFsLWZpbHRlcmVkLykgdG8gc3BlY2lmeSB3aGljaCBlbGVtZW50cyB0byBtb2RpZnkgaW4gYW4gYXJyYXkgZmllbGQuXG4gICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAqL1xuICAndXBkYXRlJyxcbiAgLyoqXG4gICAqIEBzdW1tYXJ5IE1vZGlmeSBvbmUgb3IgbW9yZSBkb2N1bWVudHMgaW4gdGhlIGNvbGxlY3Rpb24sIG9yIGluc2VydCBvbmUgaWYgbm8gbWF0Y2hpbmcgZG9jdW1lbnRzIHdlcmUgZm91bmQuIFJldHVybnMgYW4gb2JqZWN0IHdpdGgga2V5cyBgbnVtYmVyQWZmZWN0ZWRgICh0aGUgbnVtYmVyIG9mIGRvY3VtZW50cyBtb2RpZmllZCkgIGFuZCBgaW5zZXJ0ZWRJZGAgKHRoZSB1bmlxdWUgX2lkIG9mIHRoZSBkb2N1bWVudCB0aGF0IHdhcyBpbnNlcnRlZCwgaWYgYW55KS5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgdXBzZXJ0QXN5bmNcbiAgICogQG1lbWJlcm9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7TW9uZ29TZWxlY3Rvcn0gc2VsZWN0b3IgU3BlY2lmaWVzIHdoaWNoIGRvY3VtZW50cyB0byBtb2RpZnlcbiAgICogQHBhcmFtIHtNb25nb01vZGlmaWVyfSBtb2RpZmllciBTcGVjaWZpZXMgaG93IHRvIG1vZGlmeSB0aGUgZG9jdW1lbnRzXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLm11bHRpIFRydWUgdG8gbW9kaWZ5IGFsbCBtYXRjaGluZyBkb2N1bWVudHM7IGZhbHNlIHRvIG9ubHkgbW9kaWZ5IG9uZSBvZiB0aGUgbWF0Y2hpbmcgZG9jdW1lbnRzICh0aGUgZGVmYXVsdCkuXG4gICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAqL1xuICAndXBzZXJ0Jyxcbl07XG5cbmV4cG9ydCBjb25zdCBBU1lOQ19DVVJTT1JfTUVUSE9EUyA9IFtcbiAgLyoqXG4gICAqIEBkZXByZWNhdGVkIGluIDIuOVxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIHRoZSBudW1iZXIgb2YgZG9jdW1lbnRzIHRoYXQgbWF0Y2ggYSBxdWVyeS4gVGhpcyBtZXRob2QgaXNcbiAgICogICAgICAgICAgW2RlcHJlY2F0ZWQgc2luY2UgTW9uZ29EQiA0LjBdKGh0dHBzOi8vd3d3Lm1vbmdvZGIuY29tL2RvY3MvdjQuNC9yZWZlcmVuY2UvY29tbWFuZC9jb3VudC8pO1xuICAgKiAgICAgICAgICBzZWUgYENvbGxlY3Rpb24uY291bnREb2N1bWVudHNgIGFuZFxuICAgKiAgICAgICAgICBgQ29sbGVjdGlvbi5lc3RpbWF0ZWREb2N1bWVudENvdW50YCBmb3IgYSByZXBsYWNlbWVudC5cbiAgICogQG1lbWJlck9mIE1vbmdvLkN1cnNvclxuICAgKiBAbWV0aG9kICBjb3VudEFzeW5jXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICAnY291bnQnLFxuICAvKipcbiAgICogQHN1bW1hcnkgUmV0dXJuIGFsbCBtYXRjaGluZyBkb2N1bWVudHMgYXMgYW4gQXJyYXkuXG4gICAqIEBtZW1iZXJPZiBNb25nby5DdXJzb3JcbiAgICogQG1ldGhvZCAgZmV0Y2hBc3luY1xuICAgKiBAaW5zdGFuY2VcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi9cbiAgJ2ZldGNoJyxcbiAgLyoqXG4gICAqIEBzdW1tYXJ5IENhbGwgYGNhbGxiYWNrYCBvbmNlIGZvciBlYWNoIG1hdGNoaW5nIGRvY3VtZW50LCBzZXF1ZW50aWFsbHkgYW5kXG4gICAqICAgICAgICAgIHN5bmNocm9ub3VzbHkuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWV0aG9kICBmb3JFYWNoQXN5bmNcbiAgICogQGluc3RhbmNlXG4gICAqIEBtZW1iZXJPZiBNb25nby5DdXJzb3JcbiAgICogQHBhcmFtIHtJdGVyYXRpb25DYWxsYmFja30gY2FsbGJhY2sgRnVuY3Rpb24gdG8gY2FsbC4gSXQgd2lsbCBiZSBjYWxsZWRcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2l0aCB0aHJlZSBhcmd1bWVudHM6IHRoZSBkb2N1bWVudCwgYVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLWJhc2VkIGluZGV4LCBhbmQgPGVtPmN1cnNvcjwvZW0+XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0c2VsZi5cbiAgICogQHBhcmFtIHtBbnl9IFt0aGlzQXJnXSBBbiBvYmplY3Qgd2hpY2ggd2lsbCBiZSB0aGUgdmFsdWUgb2YgYHRoaXNgIGluc2lkZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgIGBjYWxsYmFja2AuXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi9cbiAgJ2ZvckVhY2gnLFxuICAvKipcbiAgICogQHN1bW1hcnkgTWFwIGNhbGxiYWNrIG92ZXIgYWxsIG1hdGNoaW5nIGRvY3VtZW50cy4gIFJldHVybnMgYW4gQXJyYXkuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWV0aG9kIG1hcEFzeW5jXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAbWVtYmVyT2YgTW9uZ28uQ3Vyc29yXG4gICAqIEBwYXJhbSB7SXRlcmF0aW9uQ2FsbGJhY2t9IGNhbGxiYWNrIEZ1bmN0aW9uIHRvIGNhbGwuIEl0IHdpbGwgYmUgY2FsbGVkXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpdGggdGhyZWUgYXJndW1lbnRzOiB0aGUgZG9jdW1lbnQsIGFcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMC1iYXNlZCBpbmRleCwgYW5kIDxlbT5jdXJzb3I8L2VtPlxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdHNlbGYuXG4gICAqIEBwYXJhbSB7QW55fSBbdGhpc0FyZ10gQW4gb2JqZWN0IHdoaWNoIHdpbGwgYmUgdGhlIHZhbHVlIG9mIGB0aGlzYCBpbnNpZGVcbiAgICogICAgICAgICAgICAgICAgICAgICAgICBgY2FsbGJhY2tgLlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICovXG4gICdtYXAnLFxuXTtcblxuZXhwb3J0IGNvbnN0IENMSUVOVF9PTkxZX01FVEhPRFMgPSBbXCJmaW5kT25lXCIsIFwiaW5zZXJ0XCIsIFwicmVtb3ZlXCIsIFwidXBkYXRlXCIsIFwidXBzZXJ0XCJdO1xuIiwiaW1wb3J0IExvY2FsQ29sbGVjdGlvbiBmcm9tICcuL2xvY2FsX2NvbGxlY3Rpb24uanMnO1xuaW1wb3J0IHsgaGFzT3duIH0gZnJvbSAnLi9jb21tb24uanMnO1xuaW1wb3J0IHsgQVNZTkNfQ1VSU09SX01FVEhPRFMsIGdldEFzeW5jTWV0aG9kTmFtZSB9IGZyb20gJy4vY29uc3RhbnRzJztcblxuLy8gQ3Vyc29yOiBhIHNwZWNpZmljYXRpb24gZm9yIGEgcGFydGljdWxhciBzdWJzZXQgb2YgZG9jdW1lbnRzLCB3LyBhIGRlZmluZWRcbi8vIG9yZGVyLCBsaW1pdCwgYW5kIG9mZnNldC4gIGNyZWF0aW5nIGEgQ3Vyc29yIHdpdGggTG9jYWxDb2xsZWN0aW9uLmZpbmQoKSxcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEN1cnNvciB7XG4gIC8vIGRvbid0IGNhbGwgdGhpcyBjdG9yIGRpcmVjdGx5LiAgdXNlIExvY2FsQ29sbGVjdGlvbi5maW5kKCkuXG4gIGNvbnN0cnVjdG9yKGNvbGxlY3Rpb24sIHNlbGVjdG9yLCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmNvbGxlY3Rpb24gPSBjb2xsZWN0aW9uO1xuICAgIHRoaXMuc29ydGVyID0gbnVsbDtcbiAgICB0aGlzLm1hdGNoZXIgPSBuZXcgTWluaW1vbmdvLk1hdGNoZXIoc2VsZWN0b3IpO1xuXG4gICAgaWYgKExvY2FsQ29sbGVjdGlvbi5fc2VsZWN0b3JJc0lkUGVyaGFwc0FzT2JqZWN0KHNlbGVjdG9yKSkge1xuICAgICAgLy8gc3Rhc2ggZm9yIGZhc3QgX2lkIGFuZCB7IF9pZCB9XG4gICAgICB0aGlzLl9zZWxlY3RvcklkID0gaGFzT3duLmNhbGwoc2VsZWN0b3IsICdfaWQnKSA/IHNlbGVjdG9yLl9pZCA6IHNlbGVjdG9yO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9zZWxlY3RvcklkID0gdW5kZWZpbmVkO1xuXG4gICAgICBpZiAodGhpcy5tYXRjaGVyLmhhc0dlb1F1ZXJ5KCkgfHwgb3B0aW9ucy5zb3J0KSB7XG4gICAgICAgIHRoaXMuc29ydGVyID0gbmV3IE1pbmltb25nby5Tb3J0ZXIob3B0aW9ucy5zb3J0IHx8IFtdKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnNraXAgPSBvcHRpb25zLnNraXAgfHwgMDtcbiAgICB0aGlzLmxpbWl0ID0gb3B0aW9ucy5saW1pdDtcbiAgICB0aGlzLmZpZWxkcyA9IG9wdGlvbnMucHJvamVjdGlvbiB8fCBvcHRpb25zLmZpZWxkcztcblxuICAgIHRoaXMuX3Byb2plY3Rpb25GbiA9IExvY2FsQ29sbGVjdGlvbi5fY29tcGlsZVByb2plY3Rpb24odGhpcy5maWVsZHMgfHwge30pO1xuXG4gICAgdGhpcy5fdHJhbnNmb3JtID0gTG9jYWxDb2xsZWN0aW9uLndyYXBUcmFuc2Zvcm0ob3B0aW9ucy50cmFuc2Zvcm0pO1xuXG4gICAgLy8gYnkgZGVmYXVsdCwgcXVlcmllcyByZWdpc3RlciB3LyBUcmFja2VyIHdoZW4gaXQgaXMgYXZhaWxhYmxlLlxuICAgIGlmICh0eXBlb2YgVHJhY2tlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRoaXMucmVhY3RpdmUgPSBvcHRpb25zLnJlYWN0aXZlID09PSB1bmRlZmluZWQgPyB0cnVlIDogb3B0aW9ucy5yZWFjdGl2ZTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQGRlcHJlY2F0ZWQgaW4gMi45XG4gICAqIEBzdW1tYXJ5IFJldHVybnMgdGhlIG51bWJlciBvZiBkb2N1bWVudHMgdGhhdCBtYXRjaCBhIHF1ZXJ5LiBUaGlzIG1ldGhvZCBpc1xuICAgKiAgICAgICAgICBbZGVwcmVjYXRlZCBzaW5jZSBNb25nb0RCIDQuMF0oaHR0cHM6Ly93d3cubW9uZ29kYi5jb20vZG9jcy92NC40L3JlZmVyZW5jZS9jb21tYW5kL2NvdW50Lyk7XG4gICAqICAgICAgICAgIHNlZSBgQ29sbGVjdGlvbi5jb3VudERvY3VtZW50c2AgYW5kXG4gICAqICAgICAgICAgIGBDb2xsZWN0aW9uLmVzdGltYXRlZERvY3VtZW50Q291bnRgIGZvciBhIHJlcGxhY2VtZW50LlxuICAgKiBAbWVtYmVyT2YgTW9uZ28uQ3Vyc29yXG4gICAqIEBtZXRob2QgIGNvdW50XG4gICAqIEBpbnN0YW5jZVxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQHJldHVybnMge051bWJlcn1cbiAgICovXG4gIGNvdW50KCkge1xuICAgIGlmICh0aGlzLnJlYWN0aXZlKSB7XG4gICAgICAvLyBhbGxvdyB0aGUgb2JzZXJ2ZSB0byBiZSB1bm9yZGVyZWRcbiAgICAgIHRoaXMuX2RlcGVuZCh7IGFkZGVkOiB0cnVlLCByZW1vdmVkOiB0cnVlIH0sIHRydWUpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9nZXRSYXdPYmplY3RzKHtcbiAgICAgIG9yZGVyZWQ6IHRydWUsXG4gICAgfSkubGVuZ3RoO1xuICB9XG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFJldHVybiBhbGwgbWF0Y2hpbmcgZG9jdW1lbnRzIGFzIGFuIEFycmF5LlxuICAgKiBAbWVtYmVyT2YgTW9uZ28uQ3Vyc29yXG4gICAqIEBtZXRob2QgIGZldGNoXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQHJldHVybnMge09iamVjdFtdfVxuICAgKi9cbiAgZmV0Y2goKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gW107XG5cbiAgICB0aGlzLmZvckVhY2goZG9jID0+IHtcbiAgICAgIHJlc3VsdC5wdXNoKGRvYyk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgW1N5bWJvbC5pdGVyYXRvcl0oKSB7XG4gICAgaWYgKHRoaXMucmVhY3RpdmUpIHtcbiAgICAgIHRoaXMuX2RlcGVuZCh7XG4gICAgICAgIGFkZGVkQmVmb3JlOiB0cnVlLFxuICAgICAgICByZW1vdmVkOiB0cnVlLFxuICAgICAgICBjaGFuZ2VkOiB0cnVlLFxuICAgICAgICBtb3ZlZEJlZm9yZTogdHJ1ZSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGxldCBpbmRleCA9IDA7XG4gICAgY29uc3Qgb2JqZWN0cyA9IHRoaXMuX2dldFJhd09iamVjdHMoeyBvcmRlcmVkOiB0cnVlIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5leHQ6ICgpID0+IHtcbiAgICAgICAgaWYgKGluZGV4IDwgb2JqZWN0cy5sZW5ndGgpIHtcbiAgICAgICAgICAvLyBUaGlzIGRvdWJsZXMgYXMgYSBjbG9uZSBvcGVyYXRpb24uXG4gICAgICAgICAgbGV0IGVsZW1lbnQgPSB0aGlzLl9wcm9qZWN0aW9uRm4ob2JqZWN0c1tpbmRleCsrXSk7XG5cbiAgICAgICAgICBpZiAodGhpcy5fdHJhbnNmb3JtKSBlbGVtZW50ID0gdGhpcy5fdHJhbnNmb3JtKGVsZW1lbnQpO1xuXG4gICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IGVsZW1lbnQgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7IGRvbmU6IHRydWUgfTtcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKSB7XG4gICAgY29uc3Qgc3luY1Jlc3VsdCA9IHRoaXNbU3ltYm9sLml0ZXJhdG9yXSgpO1xuICAgIHJldHVybiB7XG4gICAgICBhc3luYyBuZXh0KCkge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHN5bmNSZXN1bHQubmV4dCgpKTtcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAY2FsbGJhY2sgSXRlcmF0aW9uQ2FsbGJhY2tcbiAgICogQHBhcmFtIHtPYmplY3R9IGRvY1xuICAgKiBAcGFyYW0ge051bWJlcn0gaW5kZXhcbiAgICovXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBDYWxsIGBjYWxsYmFja2Agb25jZSBmb3IgZWFjaCBtYXRjaGluZyBkb2N1bWVudCwgc2VxdWVudGlhbGx5IGFuZFxuICAgKiAgICAgICAgICBzeW5jaHJvbm91c2x5LlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCAgZm9yRWFjaFxuICAgKiBAaW5zdGFuY2VcbiAgICogQG1lbWJlck9mIE1vbmdvLkN1cnNvclxuICAgKiBAcGFyYW0ge0l0ZXJhdGlvbkNhbGxiYWNrfSBjYWxsYmFjayBGdW5jdGlvbiB0byBjYWxsLiBJdCB3aWxsIGJlIGNhbGxlZFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aXRoIHRocmVlIGFyZ3VtZW50czogdGhlIGRvY3VtZW50LCBhXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDAtYmFzZWQgaW5kZXgsIGFuZCA8ZW0+Y3Vyc29yPC9lbT5cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRzZWxmLlxuICAgKiBAcGFyYW0ge0FueX0gW3RoaXNBcmddIEFuIG9iamVjdCB3aGljaCB3aWxsIGJlIHRoZSB2YWx1ZSBvZiBgdGhpc2AgaW5zaWRlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgYGNhbGxiYWNrYC5cbiAgICovXG4gIGZvckVhY2goY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICBpZiAodGhpcy5yZWFjdGl2ZSkge1xuICAgICAgdGhpcy5fZGVwZW5kKHtcbiAgICAgICAgYWRkZWRCZWZvcmU6IHRydWUsXG4gICAgICAgIHJlbW92ZWQ6IHRydWUsXG4gICAgICAgIGNoYW5nZWQ6IHRydWUsXG4gICAgICAgIG1vdmVkQmVmb3JlOiB0cnVlLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5fZ2V0UmF3T2JqZWN0cyh7IG9yZGVyZWQ6IHRydWUgfSkuZm9yRWFjaCgoZWxlbWVudCwgaSkgPT4ge1xuICAgICAgLy8gVGhpcyBkb3VibGVzIGFzIGEgY2xvbmUgb3BlcmF0aW9uLlxuICAgICAgZWxlbWVudCA9IHRoaXMuX3Byb2plY3Rpb25GbihlbGVtZW50KTtcblxuICAgICAgaWYgKHRoaXMuX3RyYW5zZm9ybSkge1xuICAgICAgICBlbGVtZW50ID0gdGhpcy5fdHJhbnNmb3JtKGVsZW1lbnQpO1xuICAgICAgfVxuXG4gICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIGVsZW1lbnQsIGksIHRoaXMpO1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0VHJhbnNmb3JtKCkge1xuICAgIHJldHVybiB0aGlzLl90cmFuc2Zvcm07XG4gIH1cblxuICAvKipcbiAgICogQHN1bW1hcnkgTWFwIGNhbGxiYWNrIG92ZXIgYWxsIG1hdGNoaW5nIGRvY3VtZW50cy4gIFJldHVybnMgYW4gQXJyYXkuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWV0aG9kIG1hcFxuICAgKiBAaW5zdGFuY2VcbiAgICogQG1lbWJlck9mIE1vbmdvLkN1cnNvclxuICAgKiBAcGFyYW0ge0l0ZXJhdGlvbkNhbGxiYWNrfSBjYWxsYmFjayBGdW5jdGlvbiB0byBjYWxsLiBJdCB3aWxsIGJlIGNhbGxlZFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aXRoIHRocmVlIGFyZ3VtZW50czogdGhlIGRvY3VtZW50LCBhXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDAtYmFzZWQgaW5kZXgsIGFuZCA8ZW0+Y3Vyc29yPC9lbT5cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRzZWxmLlxuICAgKiBAcGFyYW0ge0FueX0gW3RoaXNBcmddIEFuIG9iamVjdCB3aGljaCB3aWxsIGJlIHRoZSB2YWx1ZSBvZiBgdGhpc2AgaW5zaWRlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgYGNhbGxiYWNrYC5cbiAgICovXG4gIG1hcChjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIGNvbnN0IHJlc3VsdCA9IFtdO1xuXG4gICAgdGhpcy5mb3JFYWNoKChkb2MsIGkpID0+IHtcbiAgICAgIHJlc3VsdC5wdXNoKGNhbGxiYWNrLmNhbGwodGhpc0FyZywgZG9jLCBpLCB0aGlzKSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLy8gb3B0aW9ucyB0byBjb250YWluOlxuICAvLyAgKiBjYWxsYmFja3MgZm9yIG9ic2VydmUoKTpcbiAgLy8gICAgLSBhZGRlZEF0IChkb2N1bWVudCwgYXRJbmRleClcbiAgLy8gICAgLSBhZGRlZCAoZG9jdW1lbnQpXG4gIC8vICAgIC0gY2hhbmdlZEF0IChuZXdEb2N1bWVudCwgb2xkRG9jdW1lbnQsIGF0SW5kZXgpXG4gIC8vICAgIC0gY2hhbmdlZCAobmV3RG9jdW1lbnQsIG9sZERvY3VtZW50KVxuICAvLyAgICAtIHJlbW92ZWRBdCAoZG9jdW1lbnQsIGF0SW5kZXgpXG4gIC8vICAgIC0gcmVtb3ZlZCAoZG9jdW1lbnQpXG4gIC8vICAgIC0gbW92ZWRUbyAoZG9jdW1lbnQsIG9sZEluZGV4LCBuZXdJbmRleClcbiAgLy9cbiAgLy8gYXR0cmlidXRlcyBhdmFpbGFibGUgb24gcmV0dXJuZWQgcXVlcnkgaGFuZGxlOlxuICAvLyAgKiBzdG9wKCk6IGVuZCB1cGRhdGVzXG4gIC8vICAqIGNvbGxlY3Rpb246IHRoZSBjb2xsZWN0aW9uIHRoaXMgcXVlcnkgaXMgcXVlcnlpbmdcbiAgLy9cbiAgLy8gaWZmIHggaXMgYSByZXR1cm5lZCBxdWVyeSBoYW5kbGUsICh4IGluc3RhbmNlb2ZcbiAgLy8gTG9jYWxDb2xsZWN0aW9uLk9ic2VydmVIYW5kbGUpIGlzIHRydWVcbiAgLy9cbiAgLy8gaW5pdGlhbCByZXN1bHRzIGRlbGl2ZXJlZCB0aHJvdWdoIGFkZGVkIGNhbGxiYWNrXG4gIC8vIFhYWCBtYXliZSBjYWxsYmFja3Mgc2hvdWxkIHRha2UgYSBsaXN0IG9mIG9iamVjdHMsIHRvIGV4cG9zZSB0cmFuc2FjdGlvbnM/XG4gIC8vIFhYWCBtYXliZSBzdXBwb3J0IGZpZWxkIGxpbWl0aW5nICh0byBsaW1pdCB3aGF0IHlvdSdyZSBub3RpZmllZCBvbilcblxuICAvKipcbiAgICogQHN1bW1hcnkgV2F0Y2ggYSBxdWVyeS4gIFJlY2VpdmUgY2FsbGJhY2tzIGFzIHRoZSByZXN1bHQgc2V0IGNoYW5nZXMuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgTW9uZ28uQ3Vyc29yXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge09iamVjdH0gY2FsbGJhY2tzIEZ1bmN0aW9ucyB0byBjYWxsIHRvIGRlbGl2ZXIgdGhlIHJlc3VsdCBzZXQgYXMgaXRcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2VzXG4gICAqL1xuICBvYnNlcnZlKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gTG9jYWxDb2xsZWN0aW9uLl9vYnNlcnZlRnJvbU9ic2VydmVDaGFuZ2VzKHRoaXMsIG9wdGlvbnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFdhdGNoIGEgcXVlcnkuICBSZWNlaXZlIGNhbGxiYWNrcyBhcyB0aGUgcmVzdWx0IHNldCBjaGFuZ2VzLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIE1vbmdvLkN1cnNvclxuICAgKiBAaW5zdGFuY2VcbiAgICovXG4gIG9ic2VydmVBc3luYyhvcHRpb25zKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gcmVzb2x2ZSh0aGlzLm9ic2VydmUob3B0aW9ucykpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBXYXRjaCBhIHF1ZXJ5LiBSZWNlaXZlIGNhbGxiYWNrcyBhcyB0aGUgcmVzdWx0IHNldCBjaGFuZ2VzLiBPbmx5XG4gICAqICAgICAgICAgIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIHRoZSBvbGQgYW5kIG5ldyBkb2N1bWVudHMgYXJlIHBhc3NlZCB0b1xuICAgKiAgICAgICAgICB0aGUgY2FsbGJhY2tzLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIE1vbmdvLkN1cnNvclxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtPYmplY3R9IGNhbGxiYWNrcyBGdW5jdGlvbnMgdG8gY2FsbCB0byBkZWxpdmVyIHRoZSByZXN1bHQgc2V0IGFzIGl0XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlc1xuICAgKi9cbiAgb2JzZXJ2ZUNoYW5nZXMob3B0aW9ucykge1xuICAgIGNvbnN0IG9yZGVyZWQgPSBMb2NhbENvbGxlY3Rpb24uX29ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzQXJlT3JkZXJlZChvcHRpb25zKTtcblxuICAgIC8vIHRoZXJlIGFyZSBzZXZlcmFsIHBsYWNlcyB0aGF0IGFzc3VtZSB5b3UgYXJlbid0IGNvbWJpbmluZyBza2lwL2xpbWl0IHdpdGhcbiAgICAvLyB1bm9yZGVyZWQgb2JzZXJ2ZS4gIGVnLCB1cGRhdGUncyBFSlNPTi5jbG9uZSwgYW5kIHRoZSBcInRoZXJlIGFyZSBzZXZlcmFsXCJcbiAgICAvLyBjb21tZW50IGluIF9tb2RpZnlBbmROb3RpZnlcbiAgICAvLyBYWFggYWxsb3cgc2tpcC9saW1pdCB3aXRoIHVub3JkZXJlZCBvYnNlcnZlXG4gICAgaWYgKCFvcHRpb25zLl9hbGxvd191bm9yZGVyZWQgJiYgIW9yZGVyZWQgJiYgKHRoaXMuc2tpcCB8fCB0aGlzLmxpbWl0KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBcIk11c3QgdXNlIGFuIG9yZGVyZWQgb2JzZXJ2ZSB3aXRoIHNraXAgb3IgbGltaXQgKGkuZS4gJ2FkZGVkQmVmb3JlJyBcIiArXG4gICAgICAgICAgXCJmb3Igb2JzZXJ2ZUNoYW5nZXMgb3IgJ2FkZGVkQXQnIGZvciBvYnNlcnZlLCBpbnN0ZWFkIG9mICdhZGRlZCcpLlwiXG4gICAgICApO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmZpZWxkcyAmJiAodGhpcy5maWVsZHMuX2lkID09PSAwIHx8IHRoaXMuZmllbGRzLl9pZCA9PT0gZmFsc2UpKSB7XG4gICAgICB0aHJvdyBFcnJvcihcIllvdSBtYXkgbm90IG9ic2VydmUgYSBjdXJzb3Igd2l0aCB7ZmllbGRzOiB7X2lkOiAwfX1cIik7XG4gICAgfVxuXG4gICAgY29uc3QgZGlzdGFuY2VzID1cbiAgICAgIHRoaXMubWF0Y2hlci5oYXNHZW9RdWVyeSgpICYmIG9yZGVyZWQgJiYgbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXAoKTtcblxuICAgIGNvbnN0IHF1ZXJ5ID0ge1xuICAgICAgY3Vyc29yOiB0aGlzLFxuICAgICAgZGlydHk6IGZhbHNlLFxuICAgICAgZGlzdGFuY2VzLFxuICAgICAgbWF0Y2hlcjogdGhpcy5tYXRjaGVyLCAvLyBub3QgZmFzdCBwYXRoZWRcbiAgICAgIG9yZGVyZWQsXG4gICAgICBwcm9qZWN0aW9uRm46IHRoaXMuX3Byb2plY3Rpb25GbixcbiAgICAgIHJlc3VsdHNTbmFwc2hvdDogbnVsbCxcbiAgICAgIHNvcnRlcjogb3JkZXJlZCAmJiB0aGlzLnNvcnRlcixcbiAgICB9O1xuXG4gICAgbGV0IHFpZDtcblxuICAgIC8vIE5vbi1yZWFjdGl2ZSBxdWVyaWVzIGNhbGwgYWRkZWRbQmVmb3JlXSBhbmQgdGhlbiBuZXZlciBjYWxsIGFueXRoaW5nXG4gICAgLy8gZWxzZS5cbiAgICBpZiAodGhpcy5yZWFjdGl2ZSkge1xuICAgICAgcWlkID0gdGhpcy5jb2xsZWN0aW9uLm5leHRfcWlkKys7XG4gICAgICB0aGlzLmNvbGxlY3Rpb24ucXVlcmllc1txaWRdID0gcXVlcnk7XG4gICAgfVxuXG4gICAgcXVlcnkucmVzdWx0cyA9IHRoaXMuX2dldFJhd09iamVjdHMoe1xuICAgICAgb3JkZXJlZCxcbiAgICAgIGRpc3RhbmNlczogcXVlcnkuZGlzdGFuY2VzLFxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMuY29sbGVjdGlvbi5wYXVzZWQpIHtcbiAgICAgIHF1ZXJ5LnJlc3VsdHNTbmFwc2hvdCA9IG9yZGVyZWQgPyBbXSA6IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwKCk7XG4gICAgfVxuXG4gICAgLy8gd3JhcCBjYWxsYmFja3Mgd2Ugd2VyZSBwYXNzZWQuIGNhbGxiYWNrcyBvbmx5IGZpcmUgd2hlbiBub3QgcGF1c2VkIGFuZFxuICAgIC8vIGFyZSBuZXZlciB1bmRlZmluZWRcbiAgICAvLyBGaWx0ZXJzIG91dCBibGFja2xpc3RlZCBmaWVsZHMgYWNjb3JkaW5nIHRvIGN1cnNvcidzIHByb2plY3Rpb24uXG4gICAgLy8gWFhYIHdyb25nIHBsYWNlIGZvciB0aGlzP1xuXG4gICAgLy8gZnVydGhlcm1vcmUsIGNhbGxiYWNrcyBlbnF1ZXVlIHVudGlsIHRoZSBvcGVyYXRpb24gd2UncmUgd29ya2luZyBvbiBpc1xuICAgIC8vIGRvbmUuXG4gICAgY29uc3Qgd3JhcENhbGxiYWNrID0gKGZuKSA9PiB7XG4gICAgICBpZiAoIWZuKSB7XG4gICAgICAgIHJldHVybiAoKSA9PiB7fTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHJldHVybiBmdW5jdGlvbiAoLyogYXJncyovKSB7XG4gICAgICAgIGlmIChzZWxmLmNvbGxlY3Rpb24ucGF1c2VkKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYXJncyA9IGFyZ3VtZW50cztcblxuICAgICAgICBzZWxmLmNvbGxlY3Rpb24uX29ic2VydmVRdWV1ZS5xdWV1ZVRhc2soKCkgPT4ge1xuICAgICAgICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgfTtcblxuICAgIHF1ZXJ5LmFkZGVkID0gd3JhcENhbGxiYWNrKG9wdGlvbnMuYWRkZWQpO1xuICAgIHF1ZXJ5LmNoYW5nZWQgPSB3cmFwQ2FsbGJhY2sob3B0aW9ucy5jaGFuZ2VkKTtcbiAgICBxdWVyeS5yZW1vdmVkID0gd3JhcENhbGxiYWNrKG9wdGlvbnMucmVtb3ZlZCk7XG5cbiAgICBpZiAob3JkZXJlZCkge1xuICAgICAgcXVlcnkuYWRkZWRCZWZvcmUgPSB3cmFwQ2FsbGJhY2sob3B0aW9ucy5hZGRlZEJlZm9yZSk7XG4gICAgICBxdWVyeS5tb3ZlZEJlZm9yZSA9IHdyYXBDYWxsYmFjayhvcHRpb25zLm1vdmVkQmVmb3JlKTtcbiAgICB9XG5cbiAgICBpZiAoIW9wdGlvbnMuX3N1cHByZXNzX2luaXRpYWwgJiYgIXRoaXMuY29sbGVjdGlvbi5wYXVzZWQpIHtcbiAgICAgIGNvbnN0IGhhbmRsZXIgPSAoZG9jKSA9PiB7XG4gICAgICAgIGNvbnN0IGZpZWxkcyA9IEVKU09OLmNsb25lKGRvYyk7XG5cbiAgICAgICAgZGVsZXRlIGZpZWxkcy5faWQ7XG5cbiAgICAgICAgaWYgKG9yZGVyZWQpIHtcbiAgICAgICAgICBxdWVyeS5hZGRlZEJlZm9yZShkb2MuX2lkLCB0aGlzLl9wcm9qZWN0aW9uRm4oZmllbGRzKSwgbnVsbCk7XG4gICAgICAgIH1cblxuICAgICAgICBxdWVyeS5hZGRlZChkb2MuX2lkLCB0aGlzLl9wcm9qZWN0aW9uRm4oZmllbGRzKSk7XG4gICAgICB9O1xuICAgICAgLy8gaXQgbWVhbnMgaXQncyBqdXN0IGFuIGFycmF5XG4gICAgICBpZiAocXVlcnkucmVzdWx0cy5sZW5ndGgpIHtcbiAgICAgICAgZm9yIChjb25zdCBkb2Mgb2YgcXVlcnkucmVzdWx0cykge1xuICAgICAgICAgIGhhbmRsZXIoZG9jKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gaXQgbWVhbnMgaXQncyBhbiBpZCBtYXBcbiAgICAgIGlmIChxdWVyeS5yZXN1bHRzPy5zaXplPy4oKSkge1xuICAgICAgICBxdWVyeS5yZXN1bHRzLmZvckVhY2goaGFuZGxlcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgaGFuZGxlID0gT2JqZWN0LmFzc2lnbihuZXcgTG9jYWxDb2xsZWN0aW9uLk9ic2VydmVIYW5kbGUoKSwge1xuICAgICAgY29sbGVjdGlvbjogdGhpcy5jb2xsZWN0aW9uLFxuICAgICAgc3RvcDogKCkgPT4ge1xuICAgICAgICBpZiAodGhpcy5yZWFjdGl2ZSkge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLmNvbGxlY3Rpb24ucXVlcmllc1txaWRdO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgaXNSZWFkeTogZmFsc2UsXG4gICAgICBpc1JlYWR5UHJvbWlzZTogbnVsbCxcbiAgICB9KTtcblxuICAgIGlmICh0aGlzLnJlYWN0aXZlICYmIFRyYWNrZXIuYWN0aXZlKSB7XG4gICAgICAvLyBYWFggaW4gbWFueSBjYXNlcywgdGhlIHNhbWUgb2JzZXJ2ZSB3aWxsIGJlIHJlY3JlYXRlZCB3aGVuXG4gICAgICAvLyB0aGUgY3VycmVudCBhdXRvcnVuIGlzIHJlcnVuLiAgd2UgY291bGQgc2F2ZSB3b3JrIGJ5XG4gICAgICAvLyBsZXR0aW5nIGl0IGxpbmdlciBhY3Jvc3MgcmVydW4gYW5kIHBvdGVudGlhbGx5IGdldFxuICAgICAgLy8gcmVwdXJwb3NlZCBpZiB0aGUgc2FtZSBvYnNlcnZlIGlzIHBlcmZvcm1lZCwgdXNpbmcgbG9naWNcbiAgICAgIC8vIHNpbWlsYXIgdG8gdGhhdCBvZiBNZXRlb3Iuc3Vic2NyaWJlLlxuICAgICAgVHJhY2tlci5vbkludmFsaWRhdGUoKCkgPT4ge1xuICAgICAgICBoYW5kbGUuc3RvcCgpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gcnVuIHRoZSBvYnNlcnZlIGNhbGxiYWNrcyByZXN1bHRpbmcgZnJvbSB0aGUgaW5pdGlhbCBjb250ZW50c1xuICAgIC8vIGJlZm9yZSB3ZSBsZWF2ZSB0aGUgb2JzZXJ2ZS5cbiAgICBjb25zdCBkcmFpblJlc3VsdCA9IHRoaXMuY29sbGVjdGlvbi5fb2JzZXJ2ZVF1ZXVlLmRyYWluKCk7XG5cbiAgICBpZiAoZHJhaW5SZXN1bHQgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICBoYW5kbGUuaXNSZWFkeVByb21pc2UgPSBkcmFpblJlc3VsdDtcbiAgICAgIGRyYWluUmVzdWx0LnRoZW4oKCkgPT4gKGhhbmRsZS5pc1JlYWR5ID0gdHJ1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBoYW5kbGUuaXNSZWFkeSA9IHRydWU7XG4gICAgICBoYW5kbGUuaXNSZWFkeVByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaGFuZGxlO1xuICB9XG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFdhdGNoIGEgcXVlcnkuIFJlY2VpdmUgY2FsbGJhY2tzIGFzIHRoZSByZXN1bHQgc2V0IGNoYW5nZXMuIE9ubHlcbiAgICogICAgICAgICAgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gdGhlIG9sZCBhbmQgbmV3IGRvY3VtZW50cyBhcmUgcGFzc2VkIHRvXG4gICAqICAgICAgICAgIHRoZSBjYWxsYmFja3MuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgTW9uZ28uQ3Vyc29yXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge09iamVjdH0gY2FsbGJhY2tzIEZ1bmN0aW9ucyB0byBjYWxsIHRvIGRlbGl2ZXIgdGhlIHJlc3VsdCBzZXQgYXMgaXRcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2VzXG4gICAqL1xuICBvYnNlcnZlQ2hhbmdlc0FzeW5jKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgIGNvbnN0IGhhbmRsZSA9IHRoaXMub2JzZXJ2ZUNoYW5nZXMob3B0aW9ucyk7XG4gICAgICBoYW5kbGUuaXNSZWFkeVByb21pc2UudGhlbigoKSA9PiByZXNvbHZlKGhhbmRsZSkpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gWFhYIE1heWJlIHdlIG5lZWQgYSB2ZXJzaW9uIG9mIG9ic2VydmUgdGhhdCBqdXN0IGNhbGxzIGEgY2FsbGJhY2sgaWZcbiAgLy8gYW55dGhpbmcgY2hhbmdlZC5cbiAgX2RlcGVuZChjaGFuZ2VycywgX2FsbG93X3Vub3JkZXJlZCkge1xuICAgIGlmIChUcmFja2VyLmFjdGl2ZSkge1xuICAgICAgY29uc3QgZGVwZW5kZW5jeSA9IG5ldyBUcmFja2VyLkRlcGVuZGVuY3koKTtcbiAgICAgIGNvbnN0IG5vdGlmeSA9IGRlcGVuZGVuY3kuY2hhbmdlZC5iaW5kKGRlcGVuZGVuY3kpO1xuXG4gICAgICBkZXBlbmRlbmN5LmRlcGVuZCgpO1xuXG4gICAgICBjb25zdCBvcHRpb25zID0geyBfYWxsb3dfdW5vcmRlcmVkLCBfc3VwcHJlc3NfaW5pdGlhbDogdHJ1ZSB9O1xuXG4gICAgICBbJ2FkZGVkJywgJ2FkZGVkQmVmb3JlJywgJ2NoYW5nZWQnLCAnbW92ZWRCZWZvcmUnLCAncmVtb3ZlZCddLmZvckVhY2goXG4gICAgICAgIGZuID0+IHtcbiAgICAgICAgICBpZiAoY2hhbmdlcnNbZm5dKSB7XG4gICAgICAgICAgICBvcHRpb25zW2ZuXSA9IG5vdGlmeTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICk7XG5cbiAgICAgIC8vIG9ic2VydmVDaGFuZ2VzIHdpbGwgc3RvcCgpIHdoZW4gdGhpcyBjb21wdXRhdGlvbiBpcyBpbnZhbGlkYXRlZFxuICAgICAgdGhpcy5vYnNlcnZlQ2hhbmdlcyhvcHRpb25zKTtcbiAgICB9XG4gIH1cblxuICBfZ2V0Q29sbGVjdGlvbk5hbWUoKSB7XG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbi5uYW1lO1xuICB9XG5cbiAgLy8gUmV0dXJucyBhIGNvbGxlY3Rpb24gb2YgbWF0Y2hpbmcgb2JqZWN0cywgYnV0IGRvZXNuJ3QgZGVlcCBjb3B5IHRoZW0uXG4gIC8vXG4gIC8vIElmIG9yZGVyZWQgaXMgc2V0LCByZXR1cm5zIGEgc29ydGVkIGFycmF5LCByZXNwZWN0aW5nIHNvcnRlciwgc2tpcCwgYW5kXG4gIC8vIGxpbWl0IHByb3BlcnRpZXMgb2YgdGhlIHF1ZXJ5IHByb3ZpZGVkIHRoYXQgb3B0aW9ucy5hcHBseVNraXBMaW1pdCBpc1xuICAvLyBub3Qgc2V0IHRvIGZhbHNlICgjMTIwMSkuIElmIHNvcnRlciBpcyBmYWxzZXksIG5vIHNvcnQgLS0geW91IGdldCB0aGVcbiAgLy8gbmF0dXJhbCBvcmRlci5cbiAgLy9cbiAgLy8gSWYgb3JkZXJlZCBpcyBub3Qgc2V0LCByZXR1cm5zIGFuIG9iamVjdCBtYXBwaW5nIGZyb20gSUQgdG8gZG9jIChzb3J0ZXIsXG4gIC8vIHNraXAgYW5kIGxpbWl0IHNob3VsZCBub3QgYmUgc2V0KS5cbiAgLy9cbiAgLy8gSWYgb3JkZXJlZCBpcyBzZXQgYW5kIHRoaXMgY3Vyc29yIGlzIGEgJG5lYXIgZ2VvcXVlcnksIHRoZW4gdGhpcyBmdW5jdGlvblxuICAvLyB3aWxsIHVzZSBhbiBfSWRNYXAgdG8gdHJhY2sgZWFjaCBkaXN0YW5jZSBmcm9tIHRoZSAkbmVhciBhcmd1bWVudCBwb2ludCBpblxuICAvLyBvcmRlciB0byB1c2UgaXQgYXMgYSBzb3J0IGtleS4gSWYgYW4gX0lkTWFwIGlzIHBhc3NlZCBpbiB0aGUgJ2Rpc3RhbmNlcydcbiAgLy8gYXJndW1lbnQsIHRoaXMgZnVuY3Rpb24gd2lsbCBjbGVhciBpdCBhbmQgdXNlIGl0IGZvciB0aGlzIHB1cnBvc2VcbiAgLy8gKG90aGVyd2lzZSBpdCB3aWxsIGp1c3QgY3JlYXRlIGl0cyBvd24gX0lkTWFwKS4gVGhlIG9ic2VydmVDaGFuZ2VzXG4gIC8vIGltcGxlbWVudGF0aW9uIHVzZXMgdGhpcyB0byByZW1lbWJlciB0aGUgZGlzdGFuY2VzIGFmdGVyIHRoaXMgZnVuY3Rpb25cbiAgLy8gcmV0dXJucy5cbiAgX2dldFJhd09iamVjdHMob3B0aW9ucyA9IHt9KSB7XG4gICAgLy8gQnkgZGVmYXVsdCB0aGlzIG1ldGhvZCB3aWxsIHJlc3BlY3Qgc2tpcCBhbmQgbGltaXQgYmVjYXVzZSAuZmV0Y2goKSxcbiAgICAvLyAuZm9yRWFjaCgpIGV0Yy4uLiBleHBlY3QgdGhpcyBiZWhhdmlvdXIuIEl0IGNhbiBiZSBmb3JjZWQgdG8gaWdub3JlXG4gICAgLy8gc2tpcCBhbmQgbGltaXQgYnkgc2V0dGluZyBhcHBseVNraXBMaW1pdCB0byBmYWxzZSAoLmNvdW50KCkgZG9lcyB0aGlzLFxuICAgIC8vIGZvciBleGFtcGxlKVxuICAgIGNvbnN0IGFwcGx5U2tpcExpbWl0ID0gb3B0aW9ucy5hcHBseVNraXBMaW1pdCAhPT0gZmFsc2U7XG5cbiAgICAvLyBYWFggdXNlIE9yZGVyZWREaWN0IGluc3RlYWQgb2YgYXJyYXksIGFuZCBtYWtlIElkTWFwIGFuZCBPcmRlcmVkRGljdFxuICAgIC8vIGNvbXBhdGlibGVcbiAgICBjb25zdCByZXN1bHRzID0gb3B0aW9ucy5vcmRlcmVkID8gW10gOiBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcCgpO1xuXG4gICAgLy8gZmFzdCBwYXRoIGZvciBzaW5nbGUgSUQgdmFsdWVcbiAgICBpZiAodGhpcy5fc2VsZWN0b3JJZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBJZiB5b3UgaGF2ZSBub24temVybyBza2lwIGFuZCBhc2sgZm9yIGEgc2luZ2xlIGlkLCB5b3UgZ2V0IG5vdGhpbmcuXG4gICAgICAvLyBUaGlzIGlzIHNvIGl0IG1hdGNoZXMgdGhlIGJlaGF2aW9yIG9mIHRoZSAne19pZDogZm9vfScgcGF0aC5cbiAgICAgIGlmIChhcHBseVNraXBMaW1pdCAmJiB0aGlzLnNraXApIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHNlbGVjdGVkRG9jID0gdGhpcy5jb2xsZWN0aW9uLl9kb2NzLmdldCh0aGlzLl9zZWxlY3RvcklkKTtcbiAgICAgIGlmIChzZWxlY3RlZERvYykge1xuICAgICAgICBpZiAob3B0aW9ucy5vcmRlcmVkKSB7XG4gICAgICAgICAgcmVzdWx0cy5wdXNoKHNlbGVjdGVkRG9jKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHRzLnNldCh0aGlzLl9zZWxlY3RvcklkLCBzZWxlY3RlZERvYyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHRzO1xuICAgIH1cblxuICAgIC8vIHNsb3cgcGF0aCBmb3IgYXJiaXRyYXJ5IHNlbGVjdG9yLCBzb3J0LCBza2lwLCBsaW1pdFxuXG4gICAgLy8gaW4gdGhlIG9ic2VydmVDaGFuZ2VzIGNhc2UsIGRpc3RhbmNlcyBpcyBhY3R1YWxseSBwYXJ0IG9mIHRoZSBcInF1ZXJ5XCJcbiAgICAvLyAoaWUsIGxpdmUgcmVzdWx0cyBzZXQpIG9iamVjdC4gIGluIG90aGVyIGNhc2VzLCBkaXN0YW5jZXMgaXMgb25seSB1c2VkXG4gICAgLy8gaW5zaWRlIHRoaXMgZnVuY3Rpb24uXG4gICAgbGV0IGRpc3RhbmNlcztcbiAgICBpZiAodGhpcy5tYXRjaGVyLmhhc0dlb1F1ZXJ5KCkgJiYgb3B0aW9ucy5vcmRlcmVkKSB7XG4gICAgICBpZiAob3B0aW9ucy5kaXN0YW5jZXMpIHtcbiAgICAgICAgZGlzdGFuY2VzID0gb3B0aW9ucy5kaXN0YW5jZXM7XG4gICAgICAgIGRpc3RhbmNlcy5jbGVhcigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGlzdGFuY2VzID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXAoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBNZXRlb3IuX3J1bkZyZXNoKCgpID0+IHtcbiAgICAgIHRoaXMuY29sbGVjdGlvbi5fZG9jcy5mb3JFYWNoKChkb2MsIGlkKSA9PiB7XG4gICAgICAgIGNvbnN0IG1hdGNoUmVzdWx0ID0gdGhpcy5tYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhkb2MpO1xuICAgICAgICBpZiAobWF0Y2hSZXN1bHQucmVzdWx0KSB7XG4gICAgICAgICAgaWYgKG9wdGlvbnMub3JkZXJlZCkge1xuICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGRvYyk7XG5cbiAgICAgICAgICAgIGlmIChkaXN0YW5jZXMgJiYgbWF0Y2hSZXN1bHQuZGlzdGFuY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICBkaXN0YW5jZXMuc2V0KGlkLCBtYXRjaFJlc3VsdC5kaXN0YW5jZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdHMuc2V0KGlkLCBkb2MpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE92ZXJyaWRlIHRvIGVuc3VyZSBhbGwgZG9jcyBhcmUgbWF0Y2hlZCBpZiBpZ25vcmluZyBza2lwICYgbGltaXRcbiAgICAgICAgaWYgKCFhcHBseVNraXBMaW1pdCkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmFzdCBwYXRoIGZvciBsaW1pdGVkIHVuc29ydGVkIHF1ZXJpZXMuXG4gICAgICAgIC8vIFhYWCAnbGVuZ3RoJyBjaGVjayBoZXJlIHNlZW1zIHdyb25nIGZvciBvcmRlcmVkXG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgIXRoaXMubGltaXQgfHwgdGhpcy5za2lwIHx8IHRoaXMuc29ydGVyIHx8IHJlc3VsdHMubGVuZ3RoICE9PSB0aGlzLmxpbWl0XG4gICAgICAgICk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGlmICghb3B0aW9ucy5vcmRlcmVkKSB7XG4gICAgICByZXR1cm4gcmVzdWx0cztcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zb3J0ZXIpIHtcbiAgICAgIHJlc3VsdHMuc29ydCh0aGlzLnNvcnRlci5nZXRDb21wYXJhdG9yKHsgZGlzdGFuY2VzIH0pKTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdGhlIGZ1bGwgc2V0IG9mIHJlc3VsdHMgaWYgdGhlcmUgaXMgbm8gc2tpcCBvciBsaW1pdCBvciBpZiB3ZSdyZVxuICAgIC8vIGlnbm9yaW5nIHRoZW1cbiAgICBpZiAoIWFwcGx5U2tpcExpbWl0IHx8ICghdGhpcy5saW1pdCAmJiAhdGhpcy5za2lwKSkge1xuICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdHMuc2xpY2UoXG4gICAgICB0aGlzLnNraXAsXG4gICAgICB0aGlzLmxpbWl0ID8gdGhpcy5saW1pdCArIHRoaXMuc2tpcCA6IHJlc3VsdHMubGVuZ3RoXG4gICAgKTtcbiAgfVxuXG4gIF9wdWJsaXNoQ3Vyc29yKHN1YnNjcmlwdGlvbikge1xuICAgIC8vIFhYWCBtaW5pbW9uZ28gc2hvdWxkIG5vdCBkZXBlbmQgb24gbW9uZ28tbGl2ZWRhdGEhXG4gICAgaWYgKCFQYWNrYWdlLm1vbmdvKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIFwiQ2FuJ3QgcHVibGlzaCBmcm9tIE1pbmltb25nbyB3aXRob3V0IHRoZSBgbW9uZ29gIHBhY2thZ2UuXCJcbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmNvbGxlY3Rpb24ubmFtZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBcIkNhbid0IHB1Ymxpc2ggYSBjdXJzb3IgZnJvbSBhIGNvbGxlY3Rpb24gd2l0aG91dCBhIG5hbWUuXCJcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIFBhY2thZ2UubW9uZ28uTW9uZ28uQ29sbGVjdGlvbi5fcHVibGlzaEN1cnNvcihcbiAgICAgIHRoaXMsXG4gICAgICBzdWJzY3JpcHRpb24sXG4gICAgICB0aGlzLmNvbGxlY3Rpb24ubmFtZVxuICAgICk7XG4gIH1cbn1cblxuLy8gSW1wbGVtZW50cyBhc3luYyB2ZXJzaW9uIG9mIGN1cnNvciBtZXRob2RzIHRvIGtlZXAgY29sbGVjdGlvbnMgaXNvbW9ycGhpY1xuQVNZTkNfQ1VSU09SX01FVEhPRFMuZm9yRWFjaChtZXRob2QgPT4ge1xuICBjb25zdCBhc3luY05hbWUgPSBnZXRBc3luY01ldGhvZE5hbWUobWV0aG9kKTtcbiAgQ3Vyc29yLnByb3RvdHlwZVthc3luY05hbWVdID0gZnVuY3Rpb24oLi4uYXJncykge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXNbbWV0aG9kXS5hcHBseSh0aGlzLCBhcmdzKSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnJvcik7XG4gICAgfVxuICB9O1xufSk7XG4iLCJpbXBvcnQgQ3Vyc29yIGZyb20gJy4vY3Vyc29yLmpzJztcbmltcG9ydCBPYnNlcnZlSGFuZGxlIGZyb20gJy4vb2JzZXJ2ZV9oYW5kbGUuanMnO1xuaW1wb3J0IHtcbiAgaGFzT3duLFxuICBpc0luZGV4YWJsZSxcbiAgaXNOdW1lcmljS2V5LFxuICBpc09wZXJhdG9yT2JqZWN0LFxuICBwb3B1bGF0ZURvY3VtZW50V2l0aFF1ZXJ5RmllbGRzLFxuICBwcm9qZWN0aW9uRGV0YWlscyxcbn0gZnJvbSAnLi9jb21tb24uanMnO1xuXG5pbXBvcnQgeyBnZXRBc3luY01ldGhvZE5hbWUgfSBmcm9tICcuL2NvbnN0YW50cyc7XG5cbi8vIFhYWCB0eXBlIGNoZWNraW5nIG9uIHNlbGVjdG9ycyAoZ3JhY2VmdWwgZXJyb3IgaWYgbWFsZm9ybWVkKVxuXG4vLyBMb2NhbENvbGxlY3Rpb246IGEgc2V0IG9mIGRvY3VtZW50cyB0aGF0IHN1cHBvcnRzIHF1ZXJpZXMgYW5kIG1vZGlmaWVycy5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIExvY2FsQ29sbGVjdGlvbiB7XG4gIGNvbnN0cnVjdG9yKG5hbWUpIHtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIC8vIF9pZCAtPiBkb2N1bWVudCAoYWxzbyBjb250YWluaW5nIGlkKVxuICAgIHRoaXMuX2RvY3MgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcblxuICAgIHRoaXMuX29ic2VydmVRdWV1ZSA9IE1ldGVvci5pc0NsaWVudFxuICAgICAgPyBuZXcgTWV0ZW9yLl9TeW5jaHJvbm91c1F1ZXVlKClcbiAgICAgIDogbmV3IE1ldGVvci5fQXN5bmNocm9ub3VzUXVldWUoKTtcblxuICAgIHRoaXMubmV4dF9xaWQgPSAxOyAvLyBsaXZlIHF1ZXJ5IGlkIGdlbmVyYXRvclxuXG4gICAgLy8gcWlkIC0+IGxpdmUgcXVlcnkgb2JqZWN0LiBrZXlzOlxuICAgIC8vICBvcmRlcmVkOiBib29sLiBvcmRlcmVkIHF1ZXJpZXMgaGF2ZSBhZGRlZEJlZm9yZS9tb3ZlZEJlZm9yZSBjYWxsYmFja3MuXG4gICAgLy8gIHJlc3VsdHM6IGFycmF5IChvcmRlcmVkKSBvciBvYmplY3QgKHVub3JkZXJlZCkgb2YgY3VycmVudCByZXN1bHRzXG4gICAgLy8gICAgKGFsaWFzZWQgd2l0aCB0aGlzLl9kb2NzISlcbiAgICAvLyAgcmVzdWx0c1NuYXBzaG90OiBzbmFwc2hvdCBvZiByZXN1bHRzLiBudWxsIGlmIG5vdCBwYXVzZWQuXG4gICAgLy8gIGN1cnNvcjogQ3Vyc29yIG9iamVjdCBmb3IgdGhlIHF1ZXJ5LlxuICAgIC8vICBzZWxlY3Rvciwgc29ydGVyLCAoY2FsbGJhY2tzKTogZnVuY3Rpb25zXG4gICAgdGhpcy5xdWVyaWVzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgIC8vIG51bGwgaWYgbm90IHNhdmluZyBvcmlnaW5hbHM7IGFuIElkTWFwIGZyb20gaWQgdG8gb3JpZ2luYWwgZG9jdW1lbnQgdmFsdWVcbiAgICAvLyBpZiBzYXZpbmcgb3JpZ2luYWxzLiBTZWUgY29tbWVudHMgYmVmb3JlIHNhdmVPcmlnaW5hbHMoKS5cbiAgICB0aGlzLl9zYXZlZE9yaWdpbmFscyA9IG51bGw7XG5cbiAgICAvLyBUcnVlIHdoZW4gb2JzZXJ2ZXJzIGFyZSBwYXVzZWQgYW5kIHdlIHNob3VsZCBub3Qgc2VuZCBjYWxsYmFja3MuXG4gICAgdGhpcy5wYXVzZWQgPSBmYWxzZTtcbiAgfVxuXG4gIGNvdW50RG9jdW1lbnRzKHNlbGVjdG9yLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIHRoaXMuZmluZChzZWxlY3RvciA/PyB7fSwgb3B0aW9ucykuY291bnRBc3luYygpO1xuICB9XG5cbiAgZXN0aW1hdGVkRG9jdW1lbnRDb3VudChvcHRpb25zKSB7XG4gICAgcmV0dXJuIHRoaXMuZmluZCh7fSwgb3B0aW9ucykuY291bnRBc3luYygpO1xuICB9XG5cbiAgLy8gb3B0aW9ucyBtYXkgaW5jbHVkZSBzb3J0LCBza2lwLCBsaW1pdCwgcmVhY3RpdmVcbiAgLy8gc29ydCBtYXkgYmUgYW55IG9mIHRoZXNlIGZvcm1zOlxuICAvLyAgICAge2E6IDEsIGI6IC0xfVxuICAvLyAgICAgW1tcImFcIiwgXCJhc2NcIl0sIFtcImJcIiwgXCJkZXNjXCJdXVxuICAvLyAgICAgW1wiYVwiLCBbXCJiXCIsIFwiZGVzY1wiXV1cbiAgLy8gICAoaW4gdGhlIGZpcnN0IGZvcm0geW91J3JlIGJlaG9sZGVuIHRvIGtleSBlbnVtZXJhdGlvbiBvcmRlciBpblxuICAvLyAgIHlvdXIgamF2YXNjcmlwdCBWTSlcbiAgLy9cbiAgLy8gcmVhY3RpdmU6IGlmIGdpdmVuLCBhbmQgZmFsc2UsIGRvbid0IHJlZ2lzdGVyIHdpdGggVHJhY2tlciAoZGVmYXVsdFxuICAvLyBpcyB0cnVlKVxuICAvL1xuICAvLyBYWFggcG9zc2libHkgc2hvdWxkIHN1cHBvcnQgcmV0cmlldmluZyBhIHN1YnNldCBvZiBmaWVsZHM/IGFuZFxuICAvLyBoYXZlIGl0IGJlIGEgaGludCAoaWdub3JlZCBvbiB0aGUgY2xpZW50LCB3aGVuIG5vdCBjb3B5aW5nIHRoZVxuICAvLyBkb2M/KVxuICAvL1xuICAvLyBYWFggc29ydCBkb2VzIG5vdCB5ZXQgc3VwcG9ydCBzdWJrZXlzICgnYS5iJykgLi4gZml4IHRoYXQhXG4gIC8vIFhYWCBhZGQgb25lIG1vcmUgc29ydCBmb3JtOiBcImtleVwiXG4gIC8vIFhYWCB0ZXN0c1xuICBmaW5kKHNlbGVjdG9yLCBvcHRpb25zKSB7XG4gICAgLy8gZGVmYXVsdCBzeW50YXggZm9yIGV2ZXJ5dGhpbmcgaXMgdG8gb21pdCB0aGUgc2VsZWN0b3IgYXJndW1lbnQuXG4gICAgLy8gYnV0IGlmIHNlbGVjdG9yIGlzIGV4cGxpY2l0bHkgcGFzc2VkIGluIGFzIGZhbHNlIG9yIHVuZGVmaW5lZCwgd2VcbiAgICAvLyB3YW50IGEgc2VsZWN0b3IgdGhhdCBtYXRjaGVzIG5vdGhpbmcuXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHNlbGVjdG9yID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBMb2NhbENvbGxlY3Rpb24uQ3Vyc29yKHRoaXMsIHNlbGVjdG9yLCBvcHRpb25zKTtcbiAgfVxuXG4gIGZpbmRPbmUoc2VsZWN0b3IsIG9wdGlvbnMgPSB7fSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICBzZWxlY3RvciA9IHt9O1xuICAgIH1cblxuICAgIC8vIE5PVEU6IGJ5IHNldHRpbmcgbGltaXQgMSBoZXJlLCB3ZSBlbmQgdXAgdXNpbmcgdmVyeSBpbmVmZmljaWVudFxuICAgIC8vIGNvZGUgdGhhdCByZWNvbXB1dGVzIHRoZSB3aG9sZSBxdWVyeSBvbiBlYWNoIHVwZGF0ZS4gVGhlIHVwc2lkZSBpc1xuICAgIC8vIHRoYXQgd2hlbiB5b3UgcmVhY3RpdmVseSBkZXBlbmQgb24gYSBmaW5kT25lIHlvdSBvbmx5IGdldFxuICAgIC8vIGludmFsaWRhdGVkIHdoZW4gdGhlIGZvdW5kIG9iamVjdCBjaGFuZ2VzLCBub3QgYW55IG9iamVjdCBpbiB0aGVcbiAgICAvLyBjb2xsZWN0aW9uLiBNb3N0IGZpbmRPbmUgd2lsbCBiZSBieSBpZCwgd2hpY2ggaGFzIGEgZmFzdCBwYXRoLCBzb1xuICAgIC8vIHRoaXMgbWlnaHQgbm90IGJlIGEgYmlnIGRlYWwuIEluIG1vc3QgY2FzZXMsIGludmFsaWRhdGlvbiBjYXVzZXNcbiAgICAvLyB0aGUgY2FsbGVkIHRvIHJlLXF1ZXJ5IGFueXdheSwgc28gdGhpcyBzaG91bGQgYmUgYSBuZXQgcGVyZm9ybWFuY2VcbiAgICAvLyBpbXByb3ZlbWVudC5cbiAgICBvcHRpb25zLmxpbWl0ID0gMTtcblxuICAgIHJldHVybiB0aGlzLmZpbmQoc2VsZWN0b3IsIG9wdGlvbnMpLmZldGNoKClbMF07XG4gIH1cbiAgYXN5bmMgZmluZE9uZUFzeW5jKHNlbGVjdG9yLCBvcHRpb25zID0ge30pIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgc2VsZWN0b3IgPSB7fTtcbiAgICB9XG4gICAgb3B0aW9ucy5saW1pdCA9IDE7XG4gICAgcmV0dXJuIChhd2FpdCB0aGlzLmZpbmQoc2VsZWN0b3IsIG9wdGlvbnMpLmZldGNoQXN5bmMoKSlbMF07XG4gIH1cbiAgcHJlcGFyZUluc2VydChkb2MpIHtcbiAgICBhc3NlcnRIYXNWYWxpZEZpZWxkTmFtZXMoZG9jKTtcblxuICAgIC8vIGlmIHlvdSByZWFsbHkgd2FudCB0byB1c2UgT2JqZWN0SURzLCBzZXQgdGhpcyBnbG9iYWwuXG4gICAgLy8gTW9uZ28uQ29sbGVjdGlvbiBzcGVjaWZpZXMgaXRzIG93biBpZHMgYW5kIGRvZXMgbm90IHVzZSB0aGlzIGNvZGUuXG4gICAgaWYgKCFoYXNPd24uY2FsbChkb2MsICdfaWQnKSkge1xuICAgICAgZG9jLl9pZCA9IExvY2FsQ29sbGVjdGlvbi5fdXNlT0lEID8gbmV3IE1vbmdvSUQuT2JqZWN0SUQoKSA6IFJhbmRvbS5pZCgpO1xuICAgIH1cblxuICAgIGNvbnN0IGlkID0gZG9jLl9pZDtcblxuICAgIGlmICh0aGlzLl9kb2NzLmhhcyhpZCkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKGBEdXBsaWNhdGUgX2lkICcke2lkfSdgKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zYXZlT3JpZ2luYWwoaWQsIHVuZGVmaW5lZCk7XG4gICAgdGhpcy5fZG9jcy5zZXQoaWQsIGRvYyk7XG5cbiAgICByZXR1cm4gaWQ7XG4gIH1cblxuICAvLyBYWFggcG9zc2libHkgZW5mb3JjZSB0aGF0ICd1bmRlZmluZWQnIGRvZXMgbm90IGFwcGVhciAod2UgYXNzdW1lXG4gIC8vIHRoaXMgaW4gb3VyIGhhbmRsaW5nIG9mIG51bGwgYW5kICRleGlzdHMpXG4gIGluc2VydChkb2MsIGNhbGxiYWNrKSB7XG4gICAgZG9jID0gRUpTT04uY2xvbmUoZG9jKTtcbiAgICBjb25zdCBpZCA9IHRoaXMucHJlcGFyZUluc2VydChkb2MpO1xuICAgIGNvbnN0IHF1ZXJpZXNUb1JlY29tcHV0ZSA9IFtdO1xuXG4gICAgLy8gdHJpZ2dlciBsaXZlIHF1ZXJpZXMgdGhhdCBtYXRjaFxuICAgIGZvciAoY29uc3QgcWlkIG9mIE9iamVjdC5rZXlzKHRoaXMucXVlcmllcykpIHtcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW3FpZF07XG5cbiAgICAgIGlmIChxdWVyeS5kaXJ0eSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbWF0Y2hSZXN1bHQgPSBxdWVyeS5tYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhkb2MpO1xuXG4gICAgICBpZiAobWF0Y2hSZXN1bHQucmVzdWx0KSB7XG4gICAgICAgIGlmIChxdWVyeS5kaXN0YW5jZXMgJiYgbWF0Y2hSZXN1bHQuZGlzdGFuY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHF1ZXJ5LmRpc3RhbmNlcy5zZXQoaWQsIG1hdGNoUmVzdWx0LmRpc3RhbmNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChxdWVyeS5jdXJzb3Iuc2tpcCB8fCBxdWVyeS5jdXJzb3IubGltaXQpIHtcbiAgICAgICAgICBxdWVyaWVzVG9SZWNvbXB1dGUucHVzaChxaWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIExvY2FsQ29sbGVjdGlvbi5faW5zZXJ0SW5SZXN1bHRzU3luYyhxdWVyeSwgZG9jKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHF1ZXJpZXNUb1JlY29tcHV0ZS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBpZiAodGhpcy5xdWVyaWVzW3FpZF0pIHtcbiAgICAgICAgdGhpcy5fcmVjb21wdXRlUmVzdWx0cyh0aGlzLnF1ZXJpZXNbcWlkXSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLl9vYnNlcnZlUXVldWUuZHJhaW4oKTtcbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIE1ldGVvci5kZWZlcigoKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIGlkKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBpZDtcbiAgfVxuICBhc3luYyBpbnNlcnRBc3luYyhkb2MsIGNhbGxiYWNrKSB7XG4gICAgZG9jID0gRUpTT04uY2xvbmUoZG9jKTtcbiAgICBjb25zdCBpZCA9IHRoaXMucHJlcGFyZUluc2VydChkb2MpO1xuICAgIGNvbnN0IHF1ZXJpZXNUb1JlY29tcHV0ZSA9IFtdO1xuXG4gICAgLy8gdHJpZ2dlciBsaXZlIHF1ZXJpZXMgdGhhdCBtYXRjaFxuICAgIGZvciAoY29uc3QgcWlkIG9mIE9iamVjdC5rZXlzKHRoaXMucXVlcmllcykpIHtcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW3FpZF07XG5cbiAgICAgIGlmIChxdWVyeS5kaXJ0eSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbWF0Y2hSZXN1bHQgPSBxdWVyeS5tYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhkb2MpO1xuXG4gICAgICBpZiAobWF0Y2hSZXN1bHQucmVzdWx0KSB7XG4gICAgICAgIGlmIChxdWVyeS5kaXN0YW5jZXMgJiYgbWF0Y2hSZXN1bHQuZGlzdGFuY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHF1ZXJ5LmRpc3RhbmNlcy5zZXQoaWQsIG1hdGNoUmVzdWx0LmRpc3RhbmNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChxdWVyeS5jdXJzb3Iuc2tpcCB8fCBxdWVyeS5jdXJzb3IubGltaXQpIHtcbiAgICAgICAgICBxdWVyaWVzVG9SZWNvbXB1dGUucHVzaChxaWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF3YWl0IExvY2FsQ29sbGVjdGlvbi5faW5zZXJ0SW5SZXN1bHRzQXN5bmMocXVlcnksIGRvYyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBxdWVyaWVzVG9SZWNvbXB1dGUuZm9yRWFjaChxaWQgPT4ge1xuICAgICAgaWYgKHRoaXMucXVlcmllc1txaWRdKSB7XG4gICAgICAgIHRoaXMuX3JlY29tcHV0ZVJlc3VsdHModGhpcy5xdWVyaWVzW3FpZF0pO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgYXdhaXQgdGhpcy5fb2JzZXJ2ZVF1ZXVlLmRyYWluKCk7XG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICBNZXRlb3IuZGVmZXIoKCkgPT4ge1xuICAgICAgICBjYWxsYmFjayhudWxsLCBpZCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gaWQ7XG4gIH1cblxuICAvLyBQYXVzZSB0aGUgb2JzZXJ2ZXJzLiBObyBjYWxsYmFja3MgZnJvbSBvYnNlcnZlcnMgd2lsbCBmaXJlIHVudGlsXG4gIC8vICdyZXN1bWVPYnNlcnZlcnMnIGlzIGNhbGxlZC5cbiAgcGF1c2VPYnNlcnZlcnMoKSB7XG4gICAgLy8gTm8tb3AgaWYgYWxyZWFkeSBwYXVzZWQuXG4gICAgaWYgKHRoaXMucGF1c2VkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gU2V0IHRoZSAncGF1c2VkJyBmbGFnIHN1Y2ggdGhhdCBuZXcgb2JzZXJ2ZXIgbWVzc2FnZXMgZG9uJ3QgZmlyZS5cbiAgICB0aGlzLnBhdXNlZCA9IHRydWU7XG5cbiAgICAvLyBUYWtlIGEgc25hcHNob3Qgb2YgdGhlIHF1ZXJ5IHJlc3VsdHMgZm9yIGVhY2ggcXVlcnkuXG4gICAgT2JqZWN0LmtleXModGhpcy5xdWVyaWVzKS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuICAgICAgcXVlcnkucmVzdWx0c1NuYXBzaG90ID0gRUpTT04uY2xvbmUocXVlcnkucmVzdWx0cyk7XG4gICAgfSk7XG4gIH1cblxuICBjbGVhclJlc3VsdFF1ZXJpZXMoY2FsbGJhY2spIHtcbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLl9kb2NzLnNpemUoKTtcblxuICAgIHRoaXMuX2RvY3MuY2xlYXIoKTtcblxuICAgIE9iamVjdC5rZXlzKHRoaXMucXVlcmllcykuZm9yRWFjaChxaWQgPT4ge1xuICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcWlkXTtcblxuICAgICAgaWYgKHF1ZXJ5Lm9yZGVyZWQpIHtcbiAgICAgICAgcXVlcnkucmVzdWx0cyA9IFtdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcXVlcnkucmVzdWx0cy5jbGVhcigpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICBNZXRlb3IuZGVmZXIoKCkgPT4ge1xuICAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG5cbiAgcHJlcGFyZVJlbW92ZShzZWxlY3Rvcikge1xuICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgTWluaW1vbmdvLk1hdGNoZXIoc2VsZWN0b3IpO1xuICAgIGNvbnN0IHJlbW92ZSA9IFtdO1xuXG4gICAgdGhpcy5fZWFjaFBvc3NpYmx5TWF0Y2hpbmdEb2NTeW5jKHNlbGVjdG9yLCAoZG9jLCBpZCkgPT4ge1xuICAgICAgaWYgKG1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKGRvYykucmVzdWx0KSB7XG4gICAgICAgIHJlbW92ZS5wdXNoKGlkKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IHF1ZXJpZXNUb1JlY29tcHV0ZSA9IFtdO1xuICAgIGNvbnN0IHF1ZXJ5UmVtb3ZlID0gW107XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlbW92ZS5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgcmVtb3ZlSWQgPSByZW1vdmVbaV07XG4gICAgICBjb25zdCByZW1vdmVEb2MgPSB0aGlzLl9kb2NzLmdldChyZW1vdmVJZCk7XG5cbiAgICAgIE9iamVjdC5rZXlzKHRoaXMucXVlcmllcykuZm9yRWFjaChxaWQgPT4ge1xuICAgICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICAgIGlmIChxdWVyeS5kaXJ0eSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChxdWVyeS5tYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhyZW1vdmVEb2MpLnJlc3VsdCkge1xuICAgICAgICAgIGlmIChxdWVyeS5jdXJzb3Iuc2tpcCB8fCBxdWVyeS5jdXJzb3IubGltaXQpIHtcbiAgICAgICAgICAgIHF1ZXJpZXNUb1JlY29tcHV0ZS5wdXNoKHFpZCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHF1ZXJ5UmVtb3ZlLnB1c2goe3FpZCwgZG9jOiByZW1vdmVEb2N9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLl9zYXZlT3JpZ2luYWwocmVtb3ZlSWQsIHJlbW92ZURvYyk7XG4gICAgICB0aGlzLl9kb2NzLnJlbW92ZShyZW1vdmVJZCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgcXVlcmllc1RvUmVjb21wdXRlLCBxdWVyeVJlbW92ZSwgcmVtb3ZlIH07XG4gIH1cblxuICByZW1vdmUoc2VsZWN0b3IsIGNhbGxiYWNrKSB7XG4gICAgLy8gRWFzeSBzcGVjaWFsIGNhc2U6IGlmIHdlJ3JlIG5vdCBjYWxsaW5nIG9ic2VydmVDaGFuZ2VzIGNhbGxiYWNrcyBhbmRcbiAgICAvLyB3ZSdyZSBub3Qgc2F2aW5nIG9yaWdpbmFscyBhbmQgd2UgZ290IGFza2VkIHRvIHJlbW92ZSBldmVyeXRoaW5nLCB0aGVuXG4gICAgLy8ganVzdCBlbXB0eSBldmVyeXRoaW5nIGRpcmVjdGx5LlxuICAgIGlmICh0aGlzLnBhdXNlZCAmJiAhdGhpcy5fc2F2ZWRPcmlnaW5hbHMgJiYgRUpTT04uZXF1YWxzKHNlbGVjdG9yLCB7fSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmNsZWFyUmVzdWx0UXVlcmllcyhjYWxsYmFjayk7XG4gICAgfVxuXG4gICAgY29uc3QgeyBxdWVyaWVzVG9SZWNvbXB1dGUsIHF1ZXJ5UmVtb3ZlLCByZW1vdmUgfSA9IHRoaXMucHJlcGFyZVJlbW92ZShzZWxlY3Rvcik7XG5cbiAgICAvLyBydW4gbGl2ZSBxdWVyeSBjYWxsYmFja3MgX2FmdGVyXyB3ZSd2ZSByZW1vdmVkIHRoZSBkb2N1bWVudHMuXG4gICAgcXVlcnlSZW1vdmUuZm9yRWFjaChyZW1vdmUgPT4ge1xuICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcmVtb3ZlLnFpZF07XG5cbiAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICBxdWVyeS5kaXN0YW5jZXMgJiYgcXVlcnkuZGlzdGFuY2VzLnJlbW92ZShyZW1vdmUuZG9jLl9pZCk7XG4gICAgICAgIExvY2FsQ29sbGVjdGlvbi5fcmVtb3ZlRnJvbVJlc3VsdHNTeW5jKHF1ZXJ5LCByZW1vdmUuZG9jKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHF1ZXJpZXNUb1JlY29tcHV0ZS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgdGhpcy5fcmVjb21wdXRlUmVzdWx0cyhxdWVyeSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLl9vYnNlcnZlUXVldWUuZHJhaW4oKTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IHJlbW92ZS5sZW5ndGg7XG5cbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIE1ldGVvci5kZWZlcigoKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgYXN5bmMgcmVtb3ZlQXN5bmMoc2VsZWN0b3IsIGNhbGxiYWNrKSB7XG4gICAgLy8gRWFzeSBzcGVjaWFsIGNhc2U6IGlmIHdlJ3JlIG5vdCBjYWxsaW5nIG9ic2VydmVDaGFuZ2VzIGNhbGxiYWNrcyBhbmRcbiAgICAvLyB3ZSdyZSBub3Qgc2F2aW5nIG9yaWdpbmFscyBhbmQgd2UgZ290IGFza2VkIHRvIHJlbW92ZSBldmVyeXRoaW5nLCB0aGVuXG4gICAgLy8ganVzdCBlbXB0eSBldmVyeXRoaW5nIGRpcmVjdGx5LlxuICAgIGlmICh0aGlzLnBhdXNlZCAmJiAhdGhpcy5fc2F2ZWRPcmlnaW5hbHMgJiYgRUpTT04uZXF1YWxzKHNlbGVjdG9yLCB7fSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmNsZWFyUmVzdWx0UXVlcmllcyhjYWxsYmFjayk7XG4gICAgfVxuXG4gICAgY29uc3QgeyBxdWVyaWVzVG9SZWNvbXB1dGUsIHF1ZXJ5UmVtb3ZlLCByZW1vdmUgfSA9IHRoaXMucHJlcGFyZVJlbW92ZShzZWxlY3Rvcik7XG5cbiAgICAvLyBydW4gbGl2ZSBxdWVyeSBjYWxsYmFja3MgX2FmdGVyXyB3ZSd2ZSByZW1vdmVkIHRoZSBkb2N1bWVudHMuXG4gICAgZm9yIChjb25zdCByZW1vdmUgb2YgcXVlcnlSZW1vdmUpIHtcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW3JlbW92ZS5xaWRdO1xuXG4gICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgcXVlcnkuZGlzdGFuY2VzICYmIHF1ZXJ5LmRpc3RhbmNlcy5yZW1vdmUocmVtb3ZlLmRvYy5faWQpO1xuICAgICAgICBhd2FpdCBMb2NhbENvbGxlY3Rpb24uX3JlbW92ZUZyb21SZXN1bHRzQXN5bmMocXVlcnksIHJlbW92ZS5kb2MpO1xuICAgICAgfVxuICAgIH1cbiAgICBxdWVyaWVzVG9SZWNvbXB1dGUuZm9yRWFjaChxaWQgPT4ge1xuICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcWlkXTtcblxuICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgIHRoaXMuX3JlY29tcHV0ZVJlc3VsdHMocXVlcnkpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgYXdhaXQgdGhpcy5fb2JzZXJ2ZVF1ZXVlLmRyYWluKCk7XG5cbiAgICBjb25zdCByZXN1bHQgPSByZW1vdmUubGVuZ3RoO1xuXG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICBNZXRlb3IuZGVmZXIoKCkgPT4ge1xuICAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIFJlc3VtZSB0aGUgb2JzZXJ2ZXJzLiBPYnNlcnZlcnMgaW1tZWRpYXRlbHkgcmVjZWl2ZSBjaGFuZ2VcbiAgLy8gbm90aWZpY2F0aW9ucyB0byBicmluZyB0aGVtIHRvIHRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZVxuICAvLyBkYXRhYmFzZS4gTm90ZSB0aGF0IHRoaXMgaXMgbm90IGp1c3QgcmVwbGF5aW5nIGFsbCB0aGUgY2hhbmdlcyB0aGF0XG4gIC8vIGhhcHBlbmVkIGR1cmluZyB0aGUgcGF1c2UsIGl0IGlzIGEgc21hcnRlciAnY29hbGVzY2VkJyBkaWZmLlxuICBfcmVzdW1lT2JzZXJ2ZXJzKCkge1xuICAgIC8vIE5vLW9wIGlmIG5vdCBwYXVzZWQuXG4gICAgaWYgKCF0aGlzLnBhdXNlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFVuc2V0IHRoZSAncGF1c2VkJyBmbGFnLiBNYWtlIHN1cmUgdG8gZG8gdGhpcyBmaXJzdCwgb3RoZXJ3aXNlXG4gICAgLy8gb2JzZXJ2ZXIgbWV0aG9kcyB3b24ndCBhY3R1YWxseSBmaXJlIHdoZW4gd2UgdHJpZ2dlciB0aGVtLlxuICAgIHRoaXMucGF1c2VkID0gZmFsc2U7XG5cbiAgICBPYmplY3Qua2V5cyh0aGlzLnF1ZXJpZXMpLmZvckVhY2gocWlkID0+IHtcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW3FpZF07XG5cbiAgICAgIGlmIChxdWVyeS5kaXJ0eSkge1xuICAgICAgICBxdWVyeS5kaXJ0eSA9IGZhbHNlO1xuXG4gICAgICAgIC8vIHJlLWNvbXB1dGUgcmVzdWx0cyB3aWxsIHBlcmZvcm0gYExvY2FsQ29sbGVjdGlvbi5fZGlmZlF1ZXJ5Q2hhbmdlc2BcbiAgICAgICAgLy8gYXV0b21hdGljYWxseS5cbiAgICAgICAgdGhpcy5fcmVjb21wdXRlUmVzdWx0cyhxdWVyeSwgcXVlcnkucmVzdWx0c1NuYXBzaG90KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIERpZmYgdGhlIGN1cnJlbnQgcmVzdWx0cyBhZ2FpbnN0IHRoZSBzbmFwc2hvdCBhbmQgc2VuZCB0byBvYnNlcnZlcnMuXG4gICAgICAgIC8vIHBhc3MgdGhlIHF1ZXJ5IG9iamVjdCBmb3IgaXRzIG9ic2VydmVyIGNhbGxiYWNrcy5cbiAgICAgICAgTG9jYWxDb2xsZWN0aW9uLl9kaWZmUXVlcnlDaGFuZ2VzKFxuICAgICAgICAgIHF1ZXJ5Lm9yZGVyZWQsXG4gICAgICAgICAgcXVlcnkucmVzdWx0c1NuYXBzaG90LFxuICAgICAgICAgIHF1ZXJ5LnJlc3VsdHMsXG4gICAgICAgICAgcXVlcnksXG4gICAgICAgICAge3Byb2plY3Rpb25GbjogcXVlcnkucHJvamVjdGlvbkZufVxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBxdWVyeS5yZXN1bHRzU25hcHNob3QgPSBudWxsO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgcmVzdW1lT2JzZXJ2ZXJzU2VydmVyKCkge1xuICAgIHRoaXMuX3Jlc3VtZU9ic2VydmVycygpO1xuICAgIGF3YWl0IHRoaXMuX29ic2VydmVRdWV1ZS5kcmFpbigpO1xuICB9XG4gIHJlc3VtZU9ic2VydmVyc0NsaWVudCgpIHtcbiAgICB0aGlzLl9yZXN1bWVPYnNlcnZlcnMoKTtcbiAgICB0aGlzLl9vYnNlcnZlUXVldWUuZHJhaW4oKTtcbiAgfVxuXG4gIHJldHJpZXZlT3JpZ2luYWxzKCkge1xuICAgIGlmICghdGhpcy5fc2F2ZWRPcmlnaW5hbHMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2FsbGVkIHJldHJpZXZlT3JpZ2luYWxzIHdpdGhvdXQgc2F2ZU9yaWdpbmFscycpO1xuICAgIH1cblxuICAgIGNvbnN0IG9yaWdpbmFscyA9IHRoaXMuX3NhdmVkT3JpZ2luYWxzO1xuXG4gICAgdGhpcy5fc2F2ZWRPcmlnaW5hbHMgPSBudWxsO1xuXG4gICAgcmV0dXJuIG9yaWdpbmFscztcbiAgfVxuXG4gIC8vIFRvIHRyYWNrIHdoYXQgZG9jdW1lbnRzIGFyZSBhZmZlY3RlZCBieSBhIHBpZWNlIG9mIGNvZGUsIGNhbGxcbiAgLy8gc2F2ZU9yaWdpbmFscygpIGJlZm9yZSBpdCBhbmQgcmV0cmlldmVPcmlnaW5hbHMoKSBhZnRlciBpdC5cbiAgLy8gcmV0cmlldmVPcmlnaW5hbHMgcmV0dXJucyBhbiBvYmplY3Qgd2hvc2Uga2V5cyBhcmUgdGhlIGlkcyBvZiB0aGUgZG9jdW1lbnRzXG4gIC8vIHRoYXQgd2VyZSBhZmZlY3RlZCBzaW5jZSB0aGUgY2FsbCB0byBzYXZlT3JpZ2luYWxzKCksIGFuZCB0aGUgdmFsdWVzIGFyZVxuICAvLyBlcXVhbCB0byB0aGUgZG9jdW1lbnQncyBjb250ZW50cyBhdCB0aGUgdGltZSBvZiBzYXZlT3JpZ2luYWxzLiAoSW4gdGhlIGNhc2VcbiAgLy8gb2YgYW4gaW5zZXJ0ZWQgZG9jdW1lbnQsIHVuZGVmaW5lZCBpcyB0aGUgdmFsdWUuKSBZb3UgbXVzdCBhbHRlcm5hdGVcbiAgLy8gYmV0d2VlbiBjYWxscyB0byBzYXZlT3JpZ2luYWxzKCkgYW5kIHJldHJpZXZlT3JpZ2luYWxzKCkuXG4gIHNhdmVPcmlnaW5hbHMoKSB7XG4gICAgaWYgKHRoaXMuX3NhdmVkT3JpZ2luYWxzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbGxlZCBzYXZlT3JpZ2luYWxzIHR3aWNlIHdpdGhvdXQgcmV0cmlldmVPcmlnaW5hbHMnKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zYXZlZE9yaWdpbmFscyA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICB9XG5cbiAgcHJlcGFyZVVwZGF0ZShzZWxlY3Rvcikge1xuICAgIC8vIFNhdmUgdGhlIG9yaWdpbmFsIHJlc3VsdHMgb2YgYW55IHF1ZXJ5IHRoYXQgd2UgbWlnaHQgbmVlZCB0b1xuICAgIC8vIF9yZWNvbXB1dGVSZXN1bHRzIG9uLCBiZWNhdXNlIF9tb2RpZnlBbmROb3RpZnkgd2lsbCBtdXRhdGUgdGhlIG9iamVjdHMgaW5cbiAgICAvLyBpdC4gKFdlIGRvbid0IG5lZWQgdG8gc2F2ZSB0aGUgb3JpZ2luYWwgcmVzdWx0cyBvZiBwYXVzZWQgcXVlcmllcyBiZWNhdXNlXG4gICAgLy8gdGhleSBhbHJlYWR5IGhhdmUgYSByZXN1bHRzU25hcHNob3QgYW5kIHdlIHdvbid0IGJlIGRpZmZpbmcgaW5cbiAgICAvLyBfcmVjb21wdXRlUmVzdWx0cy4pXG4gICAgY29uc3QgcWlkVG9PcmlnaW5hbFJlc3VsdHMgPSB7fTtcblxuICAgIC8vIFdlIHNob3VsZCBvbmx5IGNsb25lIGVhY2ggZG9jdW1lbnQgb25jZSwgZXZlbiBpZiBpdCBhcHBlYXJzIGluIG11bHRpcGxlXG4gICAgLy8gcXVlcmllc1xuICAgIGNvbnN0IGRvY01hcCA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICAgIGNvbnN0IGlkc01hdGNoZWQgPSBMb2NhbENvbGxlY3Rpb24uX2lkc01hdGNoZWRCeVNlbGVjdG9yKHNlbGVjdG9yKTtcblxuICAgIE9iamVjdC5rZXlzKHRoaXMucXVlcmllcykuZm9yRWFjaChxaWQgPT4ge1xuICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcWlkXTtcblxuICAgICAgaWYgKChxdWVyeS5jdXJzb3Iuc2tpcCB8fCBxdWVyeS5jdXJzb3IubGltaXQpICYmICEgdGhpcy5wYXVzZWQpIHtcbiAgICAgICAgLy8gQ2F0Y2ggdGhlIGNhc2Ugb2YgYSByZWFjdGl2ZSBgY291bnQoKWAgb24gYSBjdXJzb3Igd2l0aCBza2lwXG4gICAgICAgIC8vIG9yIGxpbWl0LCB3aGljaCByZWdpc3RlcnMgYW4gdW5vcmRlcmVkIG9ic2VydmUuIFRoaXMgaXMgYVxuICAgICAgICAvLyBwcmV0dHkgcmFyZSBjYXNlLCBzbyB3ZSBqdXN0IGNsb25lIHRoZSBlbnRpcmUgcmVzdWx0IHNldCB3aXRoXG4gICAgICAgIC8vIG5vIG9wdGltaXphdGlvbnMgZm9yIGRvY3VtZW50cyB0aGF0IGFwcGVhciBpbiB0aGVzZSByZXN1bHRcbiAgICAgICAgLy8gc2V0cyBhbmQgb3RoZXIgcXVlcmllcy5cbiAgICAgICAgaWYgKHF1ZXJ5LnJlc3VsdHMgaW5zdGFuY2VvZiBMb2NhbENvbGxlY3Rpb24uX0lkTWFwKSB7XG4gICAgICAgICAgcWlkVG9PcmlnaW5hbFJlc3VsdHNbcWlkXSA9IHF1ZXJ5LnJlc3VsdHMuY2xvbmUoKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIShxdWVyeS5yZXN1bHRzIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBc3NlcnRpb24gZmFpbGVkOiBxdWVyeS5yZXN1bHRzIG5vdCBhbiBhcnJheScpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xvbmVzIGEgZG9jdW1lbnQgdG8gYmUgc3RvcmVkIGluIGBxaWRUb09yaWdpbmFsUmVzdWx0c2BcbiAgICAgICAgLy8gYmVjYXVzZSBpdCBtYXkgYmUgbW9kaWZpZWQgYmVmb3JlIHRoZSBuZXcgYW5kIG9sZCByZXN1bHQgc2V0c1xuICAgICAgICAvLyBhcmUgZGlmZmVkLiBCdXQgaWYgd2Uga25vdyBleGFjdGx5IHdoaWNoIGRvY3VtZW50IElEcyB3ZSdyZVxuICAgICAgICAvLyBnb2luZyB0byBtb2RpZnksIHRoZW4gd2Ugb25seSBuZWVkIHRvIGNsb25lIHRob3NlLlxuICAgICAgICBjb25zdCBtZW1vaXplZENsb25lSWZOZWVkZWQgPSBkb2MgPT4ge1xuICAgICAgICAgIGlmIChkb2NNYXAuaGFzKGRvYy5faWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gZG9jTWFwLmdldChkb2MuX2lkKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBkb2NUb01lbW9pemUgPSAoXG4gICAgICAgICAgICBpZHNNYXRjaGVkICYmXG4gICAgICAgICAgICAhaWRzTWF0Y2hlZC5zb21lKGlkID0+IEVKU09OLmVxdWFscyhpZCwgZG9jLl9pZCkpXG4gICAgICAgICAgKSA/IGRvYyA6IEVKU09OLmNsb25lKGRvYyk7XG5cbiAgICAgICAgICBkb2NNYXAuc2V0KGRvYy5faWQsIGRvY1RvTWVtb2l6ZSk7XG5cbiAgICAgICAgICByZXR1cm4gZG9jVG9NZW1vaXplO1xuICAgICAgICB9O1xuXG4gICAgICAgIHFpZFRvT3JpZ2luYWxSZXN1bHRzW3FpZF0gPSBxdWVyeS5yZXN1bHRzLm1hcChtZW1vaXplZENsb25lSWZOZWVkZWQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHFpZFRvT3JpZ2luYWxSZXN1bHRzO1xuICB9XG5cbiAgZmluaXNoVXBkYXRlKHsgb3B0aW9ucywgdXBkYXRlQ291bnQsIGNhbGxiYWNrLCBpbnNlcnRlZElkIH0pIHtcblxuXG4gICAgLy8gUmV0dXJuIHRoZSBudW1iZXIgb2YgYWZmZWN0ZWQgZG9jdW1lbnRzLCBvciBpbiB0aGUgdXBzZXJ0IGNhc2UsIGFuIG9iamVjdFxuICAgIC8vIGNvbnRhaW5pbmcgdGhlIG51bWJlciBvZiBhZmZlY3RlZCBkb2NzIGFuZCB0aGUgaWQgb2YgdGhlIGRvYyB0aGF0IHdhc1xuICAgIC8vIGluc2VydGVkLCBpZiBhbnkuXG4gICAgbGV0IHJlc3VsdDtcbiAgICBpZiAob3B0aW9ucy5fcmV0dXJuT2JqZWN0KSB7XG4gICAgICByZXN1bHQgPSB7IG51bWJlckFmZmVjdGVkOiB1cGRhdGVDb3VudCB9O1xuXG4gICAgICBpZiAoaW5zZXJ0ZWRJZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlc3VsdC5pbnNlcnRlZElkID0gaW5zZXJ0ZWRJZDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0ID0gdXBkYXRlQ291bnQ7XG4gICAgfVxuXG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICBNZXRlb3IuZGVmZXIoKCkgPT4ge1xuICAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIFhYWCBhdG9taWNpdHk6IGlmIG11bHRpIGlzIHRydWUsIGFuZCBvbmUgbW9kaWZpY2F0aW9uIGZhaWxzLCBkb1xuICAvLyB3ZSByb2xsYmFjayB0aGUgd2hvbGUgb3BlcmF0aW9uLCBvciB3aGF0P1xuICBhc3luYyB1cGRhdGVBc3luYyhzZWxlY3RvciwgbW9kLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmICghIGNhbGxiYWNrICYmIG9wdGlvbnMgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgb3B0aW9ucyA9IG51bGw7XG4gICAgfVxuXG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuXG4gICAgY29uc3QgbWF0Y2hlciA9IG5ldyBNaW5pbW9uZ28uTWF0Y2hlcihzZWxlY3RvciwgdHJ1ZSk7XG5cbiAgICBjb25zdCBxaWRUb09yaWdpbmFsUmVzdWx0cyA9IHRoaXMucHJlcGFyZVVwZGF0ZShzZWxlY3Rvcik7XG5cbiAgICBsZXQgcmVjb21wdXRlUWlkcyA9IHt9O1xuXG4gICAgbGV0IHVwZGF0ZUNvdW50ID0gMDtcblxuICAgIGF3YWl0IHRoaXMuX2VhY2hQb3NzaWJseU1hdGNoaW5nRG9jQXN5bmMoc2VsZWN0b3IsIGFzeW5jIChkb2MsIGlkKSA9PiB7XG4gICAgICBjb25zdCBxdWVyeVJlc3VsdCA9IG1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKGRvYyk7XG5cbiAgICAgIGlmIChxdWVyeVJlc3VsdC5yZXN1bHQpIHtcbiAgICAgICAgLy8gWFhYIFNob3VsZCB3ZSBzYXZlIHRoZSBvcmlnaW5hbCBldmVuIGlmIG1vZCBlbmRzIHVwIGJlaW5nIGEgbm8tb3A/XG4gICAgICAgIHRoaXMuX3NhdmVPcmlnaW5hbChpZCwgZG9jKTtcbiAgICAgICAgcmVjb21wdXRlUWlkcyA9IGF3YWl0IHRoaXMuX21vZGlmeUFuZE5vdGlmeUFzeW5jKFxuICAgICAgICAgIGRvYyxcbiAgICAgICAgICBtb2QsXG4gICAgICAgICAgcXVlcnlSZXN1bHQuYXJyYXlJbmRpY2VzXG4gICAgICAgICk7XG5cbiAgICAgICAgKyt1cGRhdGVDb3VudDtcblxuICAgICAgICBpZiAoIW9wdGlvbnMubXVsdGkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG5cbiAgICBPYmplY3Qua2V5cyhyZWNvbXB1dGVRaWRzKS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgdGhpcy5fcmVjb21wdXRlUmVzdWx0cyhxdWVyeSwgcWlkVG9PcmlnaW5hbFJlc3VsdHNbcWlkXSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBhd2FpdCB0aGlzLl9vYnNlcnZlUXVldWUuZHJhaW4oKTtcblxuICAgIC8vIElmIHdlIGFyZSBkb2luZyBhbiB1cHNlcnQsIGFuZCB3ZSBkaWRuJ3QgbW9kaWZ5IGFueSBkb2N1bWVudHMgeWV0LCB0aGVuXG4gICAgLy8gaXQncyB0aW1lIHRvIGRvIGFuIGluc2VydC4gRmlndXJlIG91dCB3aGF0IGRvY3VtZW50IHdlIGFyZSBpbnNlcnRpbmcsIGFuZFxuICAgIC8vIGdlbmVyYXRlIGFuIGlkIGZvciBpdC5cbiAgICBsZXQgaW5zZXJ0ZWRJZDtcbiAgICBpZiAodXBkYXRlQ291bnQgPT09IDAgJiYgb3B0aW9ucy51cHNlcnQpIHtcbiAgICAgIGNvbnN0IGRvYyA9IExvY2FsQ29sbGVjdGlvbi5fY3JlYXRlVXBzZXJ0RG9jdW1lbnQoc2VsZWN0b3IsIG1vZCk7XG4gICAgICBpZiAoIWRvYy5faWQgJiYgb3B0aW9ucy5pbnNlcnRlZElkKSB7XG4gICAgICAgIGRvYy5faWQgPSBvcHRpb25zLmluc2VydGVkSWQ7XG4gICAgICB9XG5cbiAgICAgIGluc2VydGVkSWQgPSBhd2FpdCB0aGlzLmluc2VydEFzeW5jKGRvYyk7XG4gICAgICB1cGRhdGVDb3VudCA9IDE7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZmluaXNoVXBkYXRlKHtcbiAgICAgIG9wdGlvbnMsXG4gICAgICBpbnNlcnRlZElkLFxuICAgICAgdXBkYXRlQ291bnQsXG4gICAgICBjYWxsYmFjayxcbiAgICB9KTtcbiAgfVxuICAvLyBYWFggYXRvbWljaXR5OiBpZiBtdWx0aSBpcyB0cnVlLCBhbmQgb25lIG1vZGlmaWNhdGlvbiBmYWlscywgZG9cbiAgLy8gd2Ugcm9sbGJhY2sgdGhlIHdob2xlIG9wZXJhdGlvbiwgb3Igd2hhdD9cbiAgdXBkYXRlKHNlbGVjdG9yLCBtb2QsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCEgY2FsbGJhY2sgJiYgb3B0aW9ucyBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG5cbiAgICBjb25zdCBtYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKHNlbGVjdG9yLCB0cnVlKTtcblxuICAgIGNvbnN0IHFpZFRvT3JpZ2luYWxSZXN1bHRzID0gdGhpcy5wcmVwYXJlVXBkYXRlKHNlbGVjdG9yKTtcblxuICAgIGxldCByZWNvbXB1dGVRaWRzID0ge307XG5cbiAgICBsZXQgdXBkYXRlQ291bnQgPSAwO1xuXG4gICAgdGhpcy5fZWFjaFBvc3NpYmx5TWF0Y2hpbmdEb2NTeW5jKHNlbGVjdG9yLCAoZG9jLCBpZCkgPT4ge1xuICAgICAgY29uc3QgcXVlcnlSZXN1bHQgPSBtYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhkb2MpO1xuXG4gICAgICBpZiAocXVlcnlSZXN1bHQucmVzdWx0KSB7XG4gICAgICAgIC8vIFhYWCBTaG91bGQgd2Ugc2F2ZSB0aGUgb3JpZ2luYWwgZXZlbiBpZiBtb2QgZW5kcyB1cCBiZWluZyBhIG5vLW9wP1xuICAgICAgICB0aGlzLl9zYXZlT3JpZ2luYWwoaWQsIGRvYyk7XG4gICAgICAgIHJlY29tcHV0ZVFpZHMgPSB0aGlzLl9tb2RpZnlBbmROb3RpZnlTeW5jKFxuICAgICAgICAgIGRvYyxcbiAgICAgICAgICBtb2QsXG4gICAgICAgICAgcXVlcnlSZXN1bHQuYXJyYXlJbmRpY2VzXG4gICAgICAgICk7XG5cbiAgICAgICAgKyt1cGRhdGVDb3VudDtcblxuICAgICAgICBpZiAoIW9wdGlvbnMubXVsdGkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG5cbiAgICBPYmplY3Qua2V5cyhyZWNvbXB1dGVRaWRzKS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgIHRoaXMuX3JlY29tcHV0ZVJlc3VsdHMocXVlcnksIHFpZFRvT3JpZ2luYWxSZXN1bHRzW3FpZF0pO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5fb2JzZXJ2ZVF1ZXVlLmRyYWluKCk7XG5cblxuICAgIC8vIElmIHdlIGFyZSBkb2luZyBhbiB1cHNlcnQsIGFuZCB3ZSBkaWRuJ3QgbW9kaWZ5IGFueSBkb2N1bWVudHMgeWV0LCB0aGVuXG4gICAgLy8gaXQncyB0aW1lIHRvIGRvIGFuIGluc2VydC4gRmlndXJlIG91dCB3aGF0IGRvY3VtZW50IHdlIGFyZSBpbnNlcnRpbmcsIGFuZFxuICAgIC8vIGdlbmVyYXRlIGFuIGlkIGZvciBpdC5cbiAgICBsZXQgaW5zZXJ0ZWRJZDtcbiAgICBpZiAodXBkYXRlQ291bnQgPT09IDAgJiYgb3B0aW9ucy51cHNlcnQpIHtcbiAgICAgIGNvbnN0IGRvYyA9IExvY2FsQ29sbGVjdGlvbi5fY3JlYXRlVXBzZXJ0RG9jdW1lbnQoc2VsZWN0b3IsIG1vZCk7XG4gICAgICBpZiAoIWRvYy5faWQgJiYgb3B0aW9ucy5pbnNlcnRlZElkKSB7XG4gICAgICAgIGRvYy5faWQgPSBvcHRpb25zLmluc2VydGVkSWQ7XG4gICAgICB9XG5cbiAgICAgIGluc2VydGVkSWQgPSB0aGlzLmluc2VydChkb2MpO1xuICAgICAgdXBkYXRlQ291bnQgPSAxO1xuICAgIH1cblxuXG4gICAgcmV0dXJuIHRoaXMuZmluaXNoVXBkYXRlKHtcbiAgICAgIG9wdGlvbnMsXG4gICAgICBpbnNlcnRlZElkLFxuICAgICAgdXBkYXRlQ291bnQsXG4gICAgICBjYWxsYmFjayxcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgbW9kLFxuICAgIH0pO1xuICB9XG5cbiAgLy8gQSBjb252ZW5pZW5jZSB3cmFwcGVyIG9uIHVwZGF0ZS4gTG9jYWxDb2xsZWN0aW9uLnVwc2VydChzZWwsIG1vZCkgaXNcbiAgLy8gZXF1aXZhbGVudCB0byBMb2NhbENvbGxlY3Rpb24udXBkYXRlKHNlbCwgbW9kLCB7dXBzZXJ0OiB0cnVlLFxuICAvLyBfcmV0dXJuT2JqZWN0OiB0cnVlfSkuXG4gIHVwc2VydChzZWxlY3RvciwgbW9kLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmICghY2FsbGJhY2sgJiYgdHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy51cGRhdGUoXG4gICAgICBzZWxlY3RvcixcbiAgICAgIG1vZCxcbiAgICAgIE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHt1cHNlcnQ6IHRydWUsIF9yZXR1cm5PYmplY3Q6IHRydWV9KSxcbiAgICAgIGNhbGxiYWNrXG4gICAgKTtcbiAgfVxuXG4gIHVwc2VydEFzeW5jKHNlbGVjdG9yLCBtb2QsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCFjYWxsYmFjayAmJiB0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnVwZGF0ZUFzeW5jKFxuICAgICAgc2VsZWN0b3IsXG4gICAgICBtb2QsXG4gICAgICBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7dXBzZXJ0OiB0cnVlLCBfcmV0dXJuT2JqZWN0OiB0cnVlfSksXG4gICAgICBjYWxsYmFja1xuICAgICk7XG4gIH1cblxuICAvLyBJdGVyYXRlcyBvdmVyIGEgc3Vic2V0IG9mIGRvY3VtZW50cyB0aGF0IGNvdWxkIG1hdGNoIHNlbGVjdG9yOyBjYWxsc1xuICAvLyBmbihkb2MsIGlkKSBvbiBlYWNoIG9mIHRoZW0uICBTcGVjaWZpY2FsbHksIGlmIHNlbGVjdG9yIHNwZWNpZmllc1xuICAvLyBzcGVjaWZpYyBfaWQncywgaXQgb25seSBsb29rcyBhdCB0aG9zZS4gIGRvYyBpcyAqbm90KiBjbG9uZWQ6IGl0IGlzIHRoZVxuICAvLyBzYW1lIG9iamVjdCB0aGF0IGlzIGluIF9kb2NzLlxuICBhc3luYyBfZWFjaFBvc3NpYmx5TWF0Y2hpbmdEb2NBc3luYyhzZWxlY3RvciwgZm4pIHtcbiAgICBjb25zdCBzcGVjaWZpY0lkcyA9IExvY2FsQ29sbGVjdGlvbi5faWRzTWF0Y2hlZEJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuXG4gICAgaWYgKHNwZWNpZmljSWRzKSB7XG4gICAgICBmb3IgKGNvbnN0IGlkIG9mIHNwZWNpZmljSWRzKSB7XG4gICAgICAgIGNvbnN0IGRvYyA9IHRoaXMuX2RvY3MuZ2V0KGlkKTtcblxuICAgICAgICBpZiAoZG9jICYmICEgKGF3YWl0IGZuKGRvYywgaWQpKSkge1xuICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgYXdhaXQgdGhpcy5fZG9jcy5mb3JFYWNoQXN5bmMoZm4pO1xuICAgIH1cbiAgfVxuICBfZWFjaFBvc3NpYmx5TWF0Y2hpbmdEb2NTeW5jKHNlbGVjdG9yLCBmbikge1xuICAgIGNvbnN0IHNwZWNpZmljSWRzID0gTG9jYWxDb2xsZWN0aW9uLl9pZHNNYXRjaGVkQnlTZWxlY3RvcihzZWxlY3Rvcik7XG5cbiAgICBpZiAoc3BlY2lmaWNJZHMpIHtcbiAgICAgIGZvciAoY29uc3QgaWQgb2Ygc3BlY2lmaWNJZHMpIHtcbiAgICAgICAgY29uc3QgZG9jID0gdGhpcy5fZG9jcy5nZXQoaWQpO1xuXG4gICAgICAgIGlmIChkb2MgJiYgIWZuKGRvYywgaWQpKSB7XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9kb2NzLmZvckVhY2goZm4pO1xuICAgIH1cbiAgfVxuXG4gIF9nZXRNYXRjaGVkRG9jQW5kTW9kaWZ5KGRvYywgbW9kLCBhcnJheUluZGljZXMpIHtcbiAgICBjb25zdCBtYXRjaGVkX2JlZm9yZSA9IHt9O1xuXG4gICAgT2JqZWN0LmtleXModGhpcy5xdWVyaWVzKS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICBpZiAocXVlcnkuZGlydHkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAocXVlcnkub3JkZXJlZCkge1xuICAgICAgICBtYXRjaGVkX2JlZm9yZVtxaWRdID0gcXVlcnkubWF0Y2hlci5kb2N1bWVudE1hdGNoZXMoZG9jKS5yZXN1bHQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBCZWNhdXNlIHdlIGRvbid0IHN1cHBvcnQgc2tpcCBvciBsaW1pdCAoeWV0KSBpbiB1bm9yZGVyZWQgcXVlcmllcywgd2VcbiAgICAgICAgLy8gY2FuIGp1c3QgZG8gYSBkaXJlY3QgbG9va3VwLlxuICAgICAgICBtYXRjaGVkX2JlZm9yZVtxaWRdID0gcXVlcnkucmVzdWx0cy5oYXMoZG9jLl9pZCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbWF0Y2hlZF9iZWZvcmU7XG4gIH1cblxuICBfbW9kaWZ5QW5kTm90aWZ5U3luYyhkb2MsIG1vZCwgYXJyYXlJbmRpY2VzKSB7XG5cbiAgICBjb25zdCBtYXRjaGVkX2JlZm9yZSA9IHRoaXMuX2dldE1hdGNoZWREb2NBbmRNb2RpZnkoZG9jLCBtb2QsIGFycmF5SW5kaWNlcyk7XG5cbiAgICBjb25zdCBvbGRfZG9jID0gRUpTT04uY2xvbmUoZG9jKTtcbiAgICBMb2NhbENvbGxlY3Rpb24uX21vZGlmeShkb2MsIG1vZCwge2FycmF5SW5kaWNlc30pO1xuXG4gICAgY29uc3QgcmVjb21wdXRlUWlkcyA9IHt9O1xuXG4gICAgZm9yIChjb25zdCBxaWQgb2YgT2JqZWN0LmtleXModGhpcy5xdWVyaWVzKSkge1xuICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcWlkXTtcblxuICAgICAgaWYgKHF1ZXJ5LmRpcnR5KSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBhZnRlck1hdGNoID0gcXVlcnkubWF0Y2hlci5kb2N1bWVudE1hdGNoZXMoZG9jKTtcbiAgICAgIGNvbnN0IGFmdGVyID0gYWZ0ZXJNYXRjaC5yZXN1bHQ7XG4gICAgICBjb25zdCBiZWZvcmUgPSBtYXRjaGVkX2JlZm9yZVtxaWRdO1xuXG4gICAgICBpZiAoYWZ0ZXIgJiYgcXVlcnkuZGlzdGFuY2VzICYmIGFmdGVyTWF0Y2guZGlzdGFuY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBxdWVyeS5kaXN0YW5jZXMuc2V0KGRvYy5faWQsIGFmdGVyTWF0Y2guZGlzdGFuY2UpO1xuICAgICAgfVxuXG4gICAgICBpZiAocXVlcnkuY3Vyc29yLnNraXAgfHwgcXVlcnkuY3Vyc29yLmxpbWl0KSB7XG4gICAgICAgIC8vIFdlIG5lZWQgdG8gcmVjb21wdXRlIGFueSBxdWVyeSB3aGVyZSB0aGUgZG9jIG1heSBoYXZlIGJlZW4gaW4gdGhlXG4gICAgICAgIC8vIGN1cnNvcidzIHdpbmRvdyBlaXRoZXIgYmVmb3JlIG9yIGFmdGVyIHRoZSB1cGRhdGUuIChOb3RlIHRoYXQgaWYgc2tpcFxuICAgICAgICAvLyBvciBsaW1pdCBpcyBzZXQsIFwiYmVmb3JlXCIgYW5kIFwiYWZ0ZXJcIiBiZWluZyB0cnVlIGRvIG5vdCBuZWNlc3NhcmlseVxuICAgICAgICAvLyBtZWFuIHRoYXQgdGhlIGRvY3VtZW50IGlzIGluIHRoZSBjdXJzb3IncyBvdXRwdXQgYWZ0ZXIgc2tpcC9saW1pdCBpc1xuICAgICAgICAvLyBhcHBsaWVkLi4uIGJ1dCBpZiB0aGV5IGFyZSBmYWxzZSwgdGhlbiB0aGUgZG9jdW1lbnQgZGVmaW5pdGVseSBpcyBOT1RcbiAgICAgICAgLy8gaW4gdGhlIG91dHB1dC4gU28gaXQncyBzYWZlIHRvIHNraXAgcmVjb21wdXRlIGlmIG5laXRoZXIgYmVmb3JlIG9yXG4gICAgICAgIC8vIGFmdGVyIGFyZSB0cnVlLilcbiAgICAgICAgaWYgKGJlZm9yZSB8fCBhZnRlcikge1xuICAgICAgICAgIHJlY29tcHV0ZVFpZHNbcWlkXSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoYmVmb3JlICYmICFhZnRlcikge1xuICAgICAgICBMb2NhbENvbGxlY3Rpb24uX3JlbW92ZUZyb21SZXN1bHRzU3luYyhxdWVyeSwgZG9jKTtcbiAgICAgIH0gZWxzZSBpZiAoIWJlZm9yZSAmJiBhZnRlcikge1xuICAgICAgICBMb2NhbENvbGxlY3Rpb24uX2luc2VydEluUmVzdWx0c1N5bmMocXVlcnksIGRvYyk7XG4gICAgICB9IGVsc2UgaWYgKGJlZm9yZSAmJiBhZnRlcikge1xuICAgICAgICBMb2NhbENvbGxlY3Rpb24uX3VwZGF0ZUluUmVzdWx0c1N5bmMocXVlcnksIGRvYywgb2xkX2RvYyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZWNvbXB1dGVRaWRzO1xuICB9XG5cbiAgYXN5bmMgX21vZGlmeUFuZE5vdGlmeUFzeW5jKGRvYywgbW9kLCBhcnJheUluZGljZXMpIHtcblxuICAgIGNvbnN0IG1hdGNoZWRfYmVmb3JlID0gdGhpcy5fZ2V0TWF0Y2hlZERvY0FuZE1vZGlmeShkb2MsIG1vZCwgYXJyYXlJbmRpY2VzKTtcblxuICAgIGNvbnN0IG9sZF9kb2MgPSBFSlNPTi5jbG9uZShkb2MpO1xuICAgIExvY2FsQ29sbGVjdGlvbi5fbW9kaWZ5KGRvYywgbW9kLCB7YXJyYXlJbmRpY2VzfSk7XG5cbiAgICBjb25zdCByZWNvbXB1dGVRaWRzID0ge307XG4gICAgZm9yIChjb25zdCBxaWQgb2YgT2JqZWN0LmtleXModGhpcy5xdWVyaWVzKSkge1xuICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcWlkXTtcblxuICAgICAgaWYgKHF1ZXJ5LmRpcnR5KSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBhZnRlck1hdGNoID0gcXVlcnkubWF0Y2hlci5kb2N1bWVudE1hdGNoZXMoZG9jKTtcbiAgICAgIGNvbnN0IGFmdGVyID0gYWZ0ZXJNYXRjaC5yZXN1bHQ7XG4gICAgICBjb25zdCBiZWZvcmUgPSBtYXRjaGVkX2JlZm9yZVtxaWRdO1xuXG4gICAgICBpZiAoYWZ0ZXIgJiYgcXVlcnkuZGlzdGFuY2VzICYmIGFmdGVyTWF0Y2guZGlzdGFuY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBxdWVyeS5kaXN0YW5jZXMuc2V0KGRvYy5faWQsIGFmdGVyTWF0Y2guZGlzdGFuY2UpO1xuICAgICAgfVxuXG4gICAgICBpZiAocXVlcnkuY3Vyc29yLnNraXAgfHwgcXVlcnkuY3Vyc29yLmxpbWl0KSB7XG4gICAgICAgIC8vIFdlIG5lZWQgdG8gcmVjb21wdXRlIGFueSBxdWVyeSB3aGVyZSB0aGUgZG9jIG1heSBoYXZlIGJlZW4gaW4gdGhlXG4gICAgICAgIC8vIGN1cnNvcidzIHdpbmRvdyBlaXRoZXIgYmVmb3JlIG9yIGFmdGVyIHRoZSB1cGRhdGUuIChOb3RlIHRoYXQgaWYgc2tpcFxuICAgICAgICAvLyBvciBsaW1pdCBpcyBzZXQsIFwiYmVmb3JlXCIgYW5kIFwiYWZ0ZXJcIiBiZWluZyB0cnVlIGRvIG5vdCBuZWNlc3NhcmlseVxuICAgICAgICAvLyBtZWFuIHRoYXQgdGhlIGRvY3VtZW50IGlzIGluIHRoZSBjdXJzb3IncyBvdXRwdXQgYWZ0ZXIgc2tpcC9saW1pdCBpc1xuICAgICAgICAvLyBhcHBsaWVkLi4uIGJ1dCBpZiB0aGV5IGFyZSBmYWxzZSwgdGhlbiB0aGUgZG9jdW1lbnQgZGVmaW5pdGVseSBpcyBOT1RcbiAgICAgICAgLy8gaW4gdGhlIG91dHB1dC4gU28gaXQncyBzYWZlIHRvIHNraXAgcmVjb21wdXRlIGlmIG5laXRoZXIgYmVmb3JlIG9yXG4gICAgICAgIC8vIGFmdGVyIGFyZSB0cnVlLilcbiAgICAgICAgaWYgKGJlZm9yZSB8fCBhZnRlcikge1xuICAgICAgICAgIHJlY29tcHV0ZVFpZHNbcWlkXSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoYmVmb3JlICYmICFhZnRlcikge1xuICAgICAgICBhd2FpdCBMb2NhbENvbGxlY3Rpb24uX3JlbW92ZUZyb21SZXN1bHRzQXN5bmMocXVlcnksIGRvYyk7XG4gICAgICB9IGVsc2UgaWYgKCFiZWZvcmUgJiYgYWZ0ZXIpIHtcbiAgICAgICAgYXdhaXQgTG9jYWxDb2xsZWN0aW9uLl9pbnNlcnRJblJlc3VsdHNBc3luYyhxdWVyeSwgZG9jKTtcbiAgICAgIH0gZWxzZSBpZiAoYmVmb3JlICYmIGFmdGVyKSB7XG4gICAgICAgIGF3YWl0IExvY2FsQ29sbGVjdGlvbi5fdXBkYXRlSW5SZXN1bHRzQXN5bmMocXVlcnksIGRvYywgb2xkX2RvYyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZWNvbXB1dGVRaWRzO1xuICB9XG5cbiAgLy8gUmVjb21wdXRlcyB0aGUgcmVzdWx0cyBvZiBhIHF1ZXJ5IGFuZCBydW5zIG9ic2VydmUgY2FsbGJhY2tzIGZvciB0aGVcbiAgLy8gZGlmZmVyZW5jZSBiZXR3ZWVuIHRoZSBwcmV2aW91cyByZXN1bHRzIGFuZCB0aGUgY3VycmVudCByZXN1bHRzICh1bmxlc3NcbiAgLy8gcGF1c2VkKS4gVXNlZCBmb3Igc2tpcC9saW1pdCBxdWVyaWVzLlxuICAvL1xuICAvLyBXaGVuIHRoaXMgaXMgdXNlZCBieSBpbnNlcnQgb3IgcmVtb3ZlLCBpdCBjYW4ganVzdCB1c2UgcXVlcnkucmVzdWx0cyBmb3JcbiAgLy8gdGhlIG9sZCByZXN1bHRzIChhbmQgdGhlcmUncyBubyBuZWVkIHRvIHBhc3MgaW4gb2xkUmVzdWx0cyksIGJlY2F1c2UgdGhlc2VcbiAgLy8gb3BlcmF0aW9ucyBkb24ndCBtdXRhdGUgdGhlIGRvY3VtZW50cyBpbiB0aGUgY29sbGVjdGlvbi4gVXBkYXRlIG5lZWRzIHRvXG4gIC8vIHBhc3MgaW4gYW4gb2xkUmVzdWx0cyB3aGljaCB3YXMgZGVlcC1jb3BpZWQgYmVmb3JlIHRoZSBtb2RpZmllciB3YXNcbiAgLy8gYXBwbGllZC5cbiAgLy9cbiAgLy8gb2xkUmVzdWx0cyBpcyBndWFyYW50ZWVkIHRvIGJlIGlnbm9yZWQgaWYgdGhlIHF1ZXJ5IGlzIG5vdCBwYXVzZWQuXG4gIF9yZWNvbXB1dGVSZXN1bHRzKHF1ZXJ5LCBvbGRSZXN1bHRzKSB7XG4gICAgaWYgKHRoaXMucGF1c2VkKSB7XG4gICAgICAvLyBUaGVyZSdzIG5vIHJlYXNvbiB0byByZWNvbXB1dGUgdGhlIHJlc3VsdHMgbm93IGFzIHdlJ3JlIHN0aWxsIHBhdXNlZC5cbiAgICAgIC8vIEJ5IGZsYWdnaW5nIHRoZSBxdWVyeSBhcyBcImRpcnR5XCIsIHRoZSByZWNvbXB1dGUgd2lsbCBiZSBwZXJmb3JtZWRcbiAgICAgIC8vIHdoZW4gcmVzdW1lT2JzZXJ2ZXJzIGlzIGNhbGxlZC5cbiAgICAgIHF1ZXJ5LmRpcnR5ID0gdHJ1ZTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMucGF1c2VkICYmICFvbGRSZXN1bHRzKSB7XG4gICAgICBvbGRSZXN1bHRzID0gcXVlcnkucmVzdWx0cztcbiAgICB9XG5cbiAgICBpZiAocXVlcnkuZGlzdGFuY2VzKSB7XG4gICAgICBxdWVyeS5kaXN0YW5jZXMuY2xlYXIoKTtcbiAgICB9XG5cbiAgICBxdWVyeS5yZXN1bHRzID0gcXVlcnkuY3Vyc29yLl9nZXRSYXdPYmplY3RzKHtcbiAgICAgIGRpc3RhbmNlczogcXVlcnkuZGlzdGFuY2VzLFxuICAgICAgb3JkZXJlZDogcXVlcnkub3JkZXJlZFxuICAgIH0pO1xuXG4gICAgaWYgKCF0aGlzLnBhdXNlZCkge1xuICAgICAgTG9jYWxDb2xsZWN0aW9uLl9kaWZmUXVlcnlDaGFuZ2VzKFxuICAgICAgICBxdWVyeS5vcmRlcmVkLFxuICAgICAgICBvbGRSZXN1bHRzLFxuICAgICAgICBxdWVyeS5yZXN1bHRzLFxuICAgICAgICBxdWVyeSxcbiAgICAgICAge3Byb2plY3Rpb25GbjogcXVlcnkucHJvamVjdGlvbkZufVxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBfc2F2ZU9yaWdpbmFsKGlkLCBkb2MpIHtcbiAgICAvLyBBcmUgd2UgZXZlbiB0cnlpbmcgdG8gc2F2ZSBvcmlnaW5hbHM/XG4gICAgaWYgKCF0aGlzLl9zYXZlZE9yaWdpbmFscykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEhhdmUgd2UgcHJldmlvdXNseSBtdXRhdGVkIHRoZSBvcmlnaW5hbCAoYW5kIHNvICdkb2MnIGlzIG5vdCBhY3R1YWxseVxuICAgIC8vIG9yaWdpbmFsKT8gIChOb3RlIHRoZSAnaGFzJyBjaGVjayByYXRoZXIgdGhhbiB0cnV0aDogd2Ugc3RvcmUgdW5kZWZpbmVkXG4gICAgLy8gaGVyZSBmb3IgaW5zZXJ0ZWQgZG9jcyEpXG4gICAgaWYgKHRoaXMuX3NhdmVkT3JpZ2luYWxzLmhhcyhpZCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLl9zYXZlZE9yaWdpbmFscy5zZXQoaWQsIEVKU09OLmNsb25lKGRvYykpO1xuICB9XG59XG5cbkxvY2FsQ29sbGVjdGlvbi5DdXJzb3IgPSBDdXJzb3I7XG5cbkxvY2FsQ29sbGVjdGlvbi5PYnNlcnZlSGFuZGxlID0gT2JzZXJ2ZUhhbmRsZTtcblxuLy8gWFhYIG1heWJlIG1vdmUgdGhlc2UgaW50byBhbm90aGVyIE9ic2VydmVIZWxwZXJzIHBhY2thZ2Ugb3Igc29tZXRoaW5nXG5cbi8vIF9DYWNoaW5nQ2hhbmdlT2JzZXJ2ZXIgaXMgYW4gb2JqZWN0IHdoaWNoIHJlY2VpdmVzIG9ic2VydmVDaGFuZ2VzIGNhbGxiYWNrc1xuLy8gYW5kIGtlZXBzIGEgY2FjaGUgb2YgdGhlIGN1cnJlbnQgY3Vyc29yIHN0YXRlIHVwIHRvIGRhdGUgaW4gdGhpcy5kb2NzLiBVc2Vyc1xuLy8gb2YgdGhpcyBjbGFzcyBzaG91bGQgcmVhZCB0aGUgZG9jcyBmaWVsZCBidXQgbm90IG1vZGlmeSBpdC4gWW91IHNob3VsZCBwYXNzXG4vLyB0aGUgXCJhcHBseUNoYW5nZVwiIGZpZWxkIGFzIHRoZSBjYWxsYmFja3MgdG8gdGhlIHVuZGVybHlpbmcgb2JzZXJ2ZUNoYW5nZXNcbi8vIGNhbGwuIE9wdGlvbmFsbHksIHlvdSBjYW4gc3BlY2lmeSB5b3VyIG93biBvYnNlcnZlQ2hhbmdlcyBjYWxsYmFja3Mgd2hpY2ggYXJlXG4vLyBpbnZva2VkIGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgZG9jcyBmaWVsZCBpcyB1cGRhdGVkOyB0aGlzIG9iamVjdCBpcyBtYWRlXG4vLyBhdmFpbGFibGUgYXMgYHRoaXNgIHRvIHRob3NlIGNhbGxiYWNrcy5cbkxvY2FsQ29sbGVjdGlvbi5fQ2FjaGluZ0NoYW5nZU9ic2VydmVyID0gY2xhc3MgX0NhY2hpbmdDaGFuZ2VPYnNlcnZlciB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IG9yZGVyZWRGcm9tQ2FsbGJhY2tzID0gKFxuICAgICAgb3B0aW9ucy5jYWxsYmFja3MgJiZcbiAgICAgIExvY2FsQ29sbGVjdGlvbi5fb2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3NBcmVPcmRlcmVkKG9wdGlvbnMuY2FsbGJhY2tzKVxuICAgICk7XG5cbiAgICBpZiAoaGFzT3duLmNhbGwob3B0aW9ucywgJ29yZGVyZWQnKSkge1xuICAgICAgdGhpcy5vcmRlcmVkID0gb3B0aW9ucy5vcmRlcmVkO1xuXG4gICAgICBpZiAob3B0aW9ucy5jYWxsYmFja3MgJiYgb3B0aW9ucy5vcmRlcmVkICE9PSBvcmRlcmVkRnJvbUNhbGxiYWNrcykge1xuICAgICAgICB0aHJvdyBFcnJvcignb3JkZXJlZCBvcHRpb24gZG9lc25cXCd0IG1hdGNoIGNhbGxiYWNrcycpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5jYWxsYmFja3MpIHtcbiAgICAgIHRoaXMub3JkZXJlZCA9IG9yZGVyZWRGcm9tQ2FsbGJhY2tzO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBFcnJvcignbXVzdCBwcm92aWRlIG9yZGVyZWQgb3IgY2FsbGJhY2tzJyk7XG4gICAgfVxuXG4gICAgY29uc3QgY2FsbGJhY2tzID0gb3B0aW9ucy5jYWxsYmFja3MgfHwge307XG5cbiAgICBpZiAodGhpcy5vcmRlcmVkKSB7XG4gICAgICB0aGlzLmRvY3MgPSBuZXcgT3JkZXJlZERpY3QoTW9uZ29JRC5pZFN0cmluZ2lmeSk7XG4gICAgICB0aGlzLmFwcGx5Q2hhbmdlID0ge1xuICAgICAgICBhZGRlZEJlZm9yZTogKGlkLCBmaWVsZHMsIGJlZm9yZSkgPT4ge1xuICAgICAgICAgIC8vIFRha2UgYSBzaGFsbG93IGNvcHkgc2luY2UgdGhlIHRvcC1sZXZlbCBwcm9wZXJ0aWVzIGNhbiBiZSBjaGFuZ2VkXG4gICAgICAgICAgY29uc3QgZG9jID0geyAuLi5maWVsZHMgfTtcblxuICAgICAgICAgIGRvYy5faWQgPSBpZDtcblxuICAgICAgICAgIGlmIChjYWxsYmFja3MuYWRkZWRCZWZvcmUpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrcy5hZGRlZEJlZm9yZS5jYWxsKHRoaXMsIGlkLCBFSlNPTi5jbG9uZShmaWVsZHMpLCBiZWZvcmUpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFRoaXMgbGluZSB0cmlnZ2VycyBpZiB3ZSBwcm92aWRlIGFkZGVkIHdpdGggbW92ZWRCZWZvcmUuXG4gICAgICAgICAgaWYgKGNhbGxiYWNrcy5hZGRlZCkge1xuICAgICAgICAgICAgY2FsbGJhY2tzLmFkZGVkLmNhbGwodGhpcywgaWQsIEVKU09OLmNsb25lKGZpZWxkcykpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFhYWCBjb3VsZCBgYmVmb3JlYCBiZSBhIGZhbHN5IElEPyAgVGVjaG5pY2FsbHlcbiAgICAgICAgICAvLyBpZFN0cmluZ2lmeSBzZWVtcyB0byBhbGxvdyBmb3IgdGhlbSAtLSB0aG91Z2hcbiAgICAgICAgICAvLyBPcmRlcmVkRGljdCB3b24ndCBjYWxsIHN0cmluZ2lmeSBvbiBhIGZhbHN5IGFyZy5cbiAgICAgICAgICB0aGlzLmRvY3MucHV0QmVmb3JlKGlkLCBkb2MsIGJlZm9yZSB8fCBudWxsKTtcbiAgICAgICAgfSxcbiAgICAgICAgbW92ZWRCZWZvcmU6IChpZCwgYmVmb3JlKSA9PiB7XG4gICAgICAgICAgaWYgKGNhbGxiYWNrcy5tb3ZlZEJlZm9yZSkge1xuICAgICAgICAgICAgY2FsbGJhY2tzLm1vdmVkQmVmb3JlLmNhbGwodGhpcywgaWQsIGJlZm9yZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGhpcy5kb2NzLm1vdmVCZWZvcmUoaWQsIGJlZm9yZSB8fCBudWxsKTtcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZG9jcyA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICAgICAgdGhpcy5hcHBseUNoYW5nZSA9IHtcbiAgICAgICAgYWRkZWQ6IChpZCwgZmllbGRzKSA9PiB7XG4gICAgICAgICAgLy8gVGFrZSBhIHNoYWxsb3cgY29weSBzaW5jZSB0aGUgdG9wLWxldmVsIHByb3BlcnRpZXMgY2FuIGJlIGNoYW5nZWRcbiAgICAgICAgICBjb25zdCBkb2MgPSB7IC4uLmZpZWxkcyB9O1xuXG4gICAgICAgICAgaWYgKGNhbGxiYWNrcy5hZGRlZCkge1xuICAgICAgICAgICAgY2FsbGJhY2tzLmFkZGVkLmNhbGwodGhpcywgaWQsIEVKU09OLmNsb25lKGZpZWxkcykpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGRvYy5faWQgPSBpZDtcblxuICAgICAgICAgIHRoaXMuZG9jcy5zZXQoaWQsICBkb2MpO1xuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBUaGUgbWV0aG9kcyBpbiBfSWRNYXAgYW5kIE9yZGVyZWREaWN0IHVzZWQgYnkgdGhlc2UgY2FsbGJhY2tzIGFyZVxuICAgIC8vIGlkZW50aWNhbC5cbiAgICB0aGlzLmFwcGx5Q2hhbmdlLmNoYW5nZWQgPSAoaWQsIGZpZWxkcykgPT4ge1xuICAgICAgY29uc3QgZG9jID0gdGhpcy5kb2NzLmdldChpZCk7XG5cbiAgICAgIGlmICghZG9jKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBpZCBmb3IgY2hhbmdlZDogJHtpZH1gKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNhbGxiYWNrcy5jaGFuZ2VkKSB7XG4gICAgICAgIGNhbGxiYWNrcy5jaGFuZ2VkLmNhbGwodGhpcywgaWQsIEVKU09OLmNsb25lKGZpZWxkcykpO1xuICAgICAgfVxuXG4gICAgICBEaWZmU2VxdWVuY2UuYXBwbHlDaGFuZ2VzKGRvYywgZmllbGRzKTtcbiAgICB9O1xuXG4gICAgdGhpcy5hcHBseUNoYW5nZS5yZW1vdmVkID0gaWQgPT4ge1xuICAgICAgaWYgKGNhbGxiYWNrcy5yZW1vdmVkKSB7XG4gICAgICAgIGNhbGxiYWNrcy5yZW1vdmVkLmNhbGwodGhpcywgaWQpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmRvY3MucmVtb3ZlKGlkKTtcbiAgICB9O1xuICB9XG59O1xuXG5Mb2NhbENvbGxlY3Rpb24uX0lkTWFwID0gY2xhc3MgX0lkTWFwIGV4dGVuZHMgSWRNYXAge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihNb25nb0lELmlkU3RyaW5naWZ5LCBNb25nb0lELmlkUGFyc2UpO1xuICB9XG59O1xuXG4vLyBXcmFwIGEgdHJhbnNmb3JtIGZ1bmN0aW9uIHRvIHJldHVybiBvYmplY3RzIHRoYXQgaGF2ZSB0aGUgX2lkIGZpZWxkXG4vLyBvZiB0aGUgdW50cmFuc2Zvcm1lZCBkb2N1bWVudC4gVGhpcyBlbnN1cmVzIHRoYXQgc3Vic3lzdGVtcyBzdWNoIGFzXG4vLyB0aGUgb2JzZXJ2ZS1zZXF1ZW5jZSBwYWNrYWdlIHRoYXQgY2FsbCBgb2JzZXJ2ZWAgY2FuIGtlZXAgdHJhY2sgb2Zcbi8vIHRoZSBkb2N1bWVudHMgaWRlbnRpdGllcy5cbi8vXG4vLyAtIFJlcXVpcmUgdGhhdCBpdCByZXR1cm5zIG9iamVjdHNcbi8vIC0gSWYgdGhlIHJldHVybiB2YWx1ZSBoYXMgYW4gX2lkIGZpZWxkLCB2ZXJpZnkgdGhhdCBpdCBtYXRjaGVzIHRoZVxuLy8gICBvcmlnaW5hbCBfaWQgZmllbGRcbi8vIC0gSWYgdGhlIHJldHVybiB2YWx1ZSBkb2Vzbid0IGhhdmUgYW4gX2lkIGZpZWxkLCBhZGQgaXQgYmFjay5cbkxvY2FsQ29sbGVjdGlvbi53cmFwVHJhbnNmb3JtID0gdHJhbnNmb3JtID0+IHtcbiAgaWYgKCF0cmFuc2Zvcm0pIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIE5vIG5lZWQgdG8gZG91Ymx5LXdyYXAgdHJhbnNmb3Jtcy5cbiAgaWYgKHRyYW5zZm9ybS5fX3dyYXBwZWRUcmFuc2Zvcm1fXykge1xuICAgIHJldHVybiB0cmFuc2Zvcm07XG4gIH1cblxuICBjb25zdCB3cmFwcGVkID0gZG9jID0+IHtcbiAgICBpZiAoIWhhc093bi5jYWxsKGRvYywgJ19pZCcpKSB7XG4gICAgICAvLyBYWFggZG8gd2UgZXZlciBoYXZlIGEgdHJhbnNmb3JtIG9uIHRoZSBvcGxvZydzIGNvbGxlY3Rpb24/IGJlY2F1c2UgdGhhdFxuICAgICAgLy8gY29sbGVjdGlvbiBoYXMgbm8gX2lkLlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYW4gb25seSB0cmFuc2Zvcm0gZG9jdW1lbnRzIHdpdGggX2lkJyk7XG4gICAgfVxuXG4gICAgY29uc3QgaWQgPSBkb2MuX2lkO1xuXG4gICAgLy8gWFhYIGNvbnNpZGVyIG1ha2luZyB0cmFja2VyIGEgd2VhayBkZXBlbmRlbmN5IGFuZCBjaGVja2luZ1xuICAgIC8vIFBhY2thZ2UudHJhY2tlciBoZXJlXG4gICAgY29uc3QgdHJhbnNmb3JtZWQgPSBUcmFja2VyLm5vbnJlYWN0aXZlKCgpID0+IHRyYW5zZm9ybShkb2MpKTtcblxuICAgIGlmICghTG9jYWxDb2xsZWN0aW9uLl9pc1BsYWluT2JqZWN0KHRyYW5zZm9ybWVkKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCd0cmFuc2Zvcm0gbXVzdCByZXR1cm4gb2JqZWN0Jyk7XG4gICAgfVxuXG4gICAgaWYgKGhhc093bi5jYWxsKHRyYW5zZm9ybWVkLCAnX2lkJykpIHtcbiAgICAgIGlmICghRUpTT04uZXF1YWxzKHRyYW5zZm9ybWVkLl9pZCwgaWQpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigndHJhbnNmb3JtZWQgZG9jdW1lbnQgY2FuXFwndCBoYXZlIGRpZmZlcmVudCBfaWQnKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdHJhbnNmb3JtZWQuX2lkID0gaWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRyYW5zZm9ybWVkO1xuICB9O1xuXG4gIHdyYXBwZWQuX193cmFwcGVkVHJhbnNmb3JtX18gPSB0cnVlO1xuXG4gIHJldHVybiB3cmFwcGVkO1xufTtcblxuLy8gWFhYIHRoZSBzb3J0ZWQtcXVlcnkgbG9naWMgYmVsb3cgaXMgbGF1Z2hhYmx5IGluZWZmaWNpZW50LiB3ZSdsbFxuLy8gbmVlZCB0byBjb21lIHVwIHdpdGggYSBiZXR0ZXIgZGF0YXN0cnVjdHVyZSBmb3IgdGhpcy5cbi8vXG4vLyBYWFggdGhlIGxvZ2ljIGZvciBvYnNlcnZpbmcgd2l0aCBhIHNraXAgb3IgYSBsaW1pdCBpcyBldmVuIG1vcmVcbi8vIGxhdWdoYWJseSBpbmVmZmljaWVudC4gd2UgcmVjb21wdXRlIHRoZSB3aG9sZSByZXN1bHRzIGV2ZXJ5IHRpbWUhXG5cbi8vIFRoaXMgYmluYXJ5IHNlYXJjaCBwdXRzIGEgdmFsdWUgYmV0d2VlbiBhbnkgZXF1YWwgdmFsdWVzLCBhbmQgdGhlIGZpcnN0XG4vLyBsZXNzZXIgdmFsdWUuXG5Mb2NhbENvbGxlY3Rpb24uX2JpbmFyeVNlYXJjaCA9IChjbXAsIGFycmF5LCB2YWx1ZSkgPT4ge1xuICBsZXQgZmlyc3QgPSAwO1xuICBsZXQgcmFuZ2UgPSBhcnJheS5sZW5ndGg7XG5cbiAgd2hpbGUgKHJhbmdlID4gMCkge1xuICAgIGNvbnN0IGhhbGZSYW5nZSA9IE1hdGguZmxvb3IocmFuZ2UgLyAyKTtcblxuICAgIGlmIChjbXAodmFsdWUsIGFycmF5W2ZpcnN0ICsgaGFsZlJhbmdlXSkgPj0gMCkge1xuICAgICAgZmlyc3QgKz0gaGFsZlJhbmdlICsgMTtcbiAgICAgIHJhbmdlIC09IGhhbGZSYW5nZSArIDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJhbmdlID0gaGFsZlJhbmdlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmaXJzdDtcbn07XG5cbkxvY2FsQ29sbGVjdGlvbi5fY2hlY2tTdXBwb3J0ZWRQcm9qZWN0aW9uID0gZmllbGRzID0+IHtcbiAgaWYgKGZpZWxkcyAhPT0gT2JqZWN0KGZpZWxkcykgfHwgQXJyYXkuaXNBcnJheShmaWVsZHMpKSB7XG4gICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJ2ZpZWxkcyBvcHRpb24gbXVzdCBiZSBhbiBvYmplY3QnKTtcbiAgfVxuXG4gIE9iamVjdC5rZXlzKGZpZWxkcykuZm9yRWFjaChrZXlQYXRoID0+IHtcbiAgICBpZiAoa2V5UGF0aC5zcGxpdCgnLicpLmluY2x1ZGVzKCckJykpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAnTWluaW1vbmdvIGRvZXNuXFwndCBzdXBwb3J0ICQgb3BlcmF0b3IgaW4gcHJvamVjdGlvbnMgeWV0LidcbiAgICAgICk7XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPSBmaWVsZHNba2V5UGF0aF07XG5cbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJlxuICAgICAgICBbJyRlbGVtTWF0Y2gnLCAnJG1ldGEnLCAnJHNsaWNlJ10uc29tZShrZXkgPT5cbiAgICAgICAgICBoYXNPd24uY2FsbCh2YWx1ZSwga2V5KVxuICAgICAgICApKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgJ01pbmltb25nbyBkb2VzblxcJ3Qgc3VwcG9ydCBvcGVyYXRvcnMgaW4gcHJvamVjdGlvbnMgeWV0LidcbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKCFbMSwgMCwgdHJ1ZSwgZmFsc2VdLmluY2x1ZGVzKHZhbHVlKSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICdQcm9qZWN0aW9uIHZhbHVlcyBzaG91bGQgYmUgb25lIG9mIDEsIDAsIHRydWUsIG9yIGZhbHNlJ1xuICAgICAgKTtcbiAgICB9XG4gIH0pO1xufTtcblxuLy8gS25vd3MgaG93IHRvIGNvbXBpbGUgYSBmaWVsZHMgcHJvamVjdGlvbiB0byBhIHByZWRpY2F0ZSBmdW5jdGlvbi5cbi8vIEByZXR1cm5zIC0gRnVuY3Rpb246IGEgY2xvc3VyZSB0aGF0IGZpbHRlcnMgb3V0IGFuIG9iamVjdCBhY2NvcmRpbmcgdG8gdGhlXG4vLyAgICAgICAgICAgIGZpZWxkcyBwcm9qZWN0aW9uIHJ1bGVzOlxuLy8gICAgICAgICAgICBAcGFyYW0gb2JqIC0gT2JqZWN0OiBNb25nb0RCLXN0eWxlZCBkb2N1bWVudFxuLy8gICAgICAgICAgICBAcmV0dXJucyAtIE9iamVjdDogYSBkb2N1bWVudCB3aXRoIHRoZSBmaWVsZHMgZmlsdGVyZWQgb3V0XG4vLyAgICAgICAgICAgICAgICAgICAgICAgYWNjb3JkaW5nIHRvIHByb2plY3Rpb24gcnVsZXMuIERvZXNuJ3QgcmV0YWluIHN1YmZpZWxkc1xuLy8gICAgICAgICAgICAgICAgICAgICAgIG9mIHBhc3NlZCBhcmd1bWVudC5cbkxvY2FsQ29sbGVjdGlvbi5fY29tcGlsZVByb2plY3Rpb24gPSBmaWVsZHMgPT4ge1xuICBMb2NhbENvbGxlY3Rpb24uX2NoZWNrU3VwcG9ydGVkUHJvamVjdGlvbihmaWVsZHMpO1xuXG4gIGNvbnN0IF9pZFByb2plY3Rpb24gPSBmaWVsZHMuX2lkID09PSB1bmRlZmluZWQgPyB0cnVlIDogZmllbGRzLl9pZDtcbiAgY29uc3QgZGV0YWlscyA9IHByb2plY3Rpb25EZXRhaWxzKGZpZWxkcyk7XG5cbiAgLy8gcmV0dXJucyB0cmFuc2Zvcm1lZCBkb2MgYWNjb3JkaW5nIHRvIHJ1bGVUcmVlXG4gIGNvbnN0IHRyYW5zZm9ybSA9IChkb2MsIHJ1bGVUcmVlKSA9PiB7XG4gICAgLy8gU3BlY2lhbCBjYXNlIGZvciBcInNldHNcIlxuICAgIGlmIChBcnJheS5pc0FycmF5KGRvYykpIHtcbiAgICAgIHJldHVybiBkb2MubWFwKHN1YmRvYyA9PiB0cmFuc2Zvcm0oc3ViZG9jLCBydWxlVHJlZSkpO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IGRldGFpbHMuaW5jbHVkaW5nID8ge30gOiBFSlNPTi5jbG9uZShkb2MpO1xuXG4gICAgT2JqZWN0LmtleXMocnVsZVRyZWUpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgIGlmIChkb2MgPT0gbnVsbCB8fCAhaGFzT3duLmNhbGwoZG9jLCBrZXkpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcnVsZSA9IHJ1bGVUcmVlW2tleV07XG5cbiAgICAgIGlmIChydWxlID09PSBPYmplY3QocnVsZSkpIHtcbiAgICAgICAgLy8gRm9yIHN1Yi1vYmplY3RzL3N1YnNldHMgd2UgYnJhbmNoXG4gICAgICAgIGlmIChkb2Nba2V5XSA9PT0gT2JqZWN0KGRvY1trZXldKSkge1xuICAgICAgICAgIHJlc3VsdFtrZXldID0gdHJhbnNmb3JtKGRvY1trZXldLCBydWxlKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChkZXRhaWxzLmluY2x1ZGluZykge1xuICAgICAgICAvLyBPdGhlcndpc2Ugd2UgZG9uJ3QgZXZlbiB0b3VjaCB0aGlzIHN1YmZpZWxkXG4gICAgICAgIHJlc3VsdFtrZXldID0gRUpTT04uY2xvbmUoZG9jW2tleV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVsZXRlIHJlc3VsdFtrZXldO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRvYyAhPSBudWxsID8gcmVzdWx0IDogZG9jO1xuICB9O1xuXG4gIHJldHVybiBkb2MgPT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IHRyYW5zZm9ybShkb2MsIGRldGFpbHMudHJlZSk7XG5cbiAgICBpZiAoX2lkUHJvamVjdGlvbiAmJiBoYXNPd24uY2FsbChkb2MsICdfaWQnKSkge1xuICAgICAgcmVzdWx0Ll9pZCA9IGRvYy5faWQ7XG4gICAgfVxuXG4gICAgaWYgKCFfaWRQcm9qZWN0aW9uICYmIGhhc093bi5jYWxsKHJlc3VsdCwgJ19pZCcpKSB7XG4gICAgICBkZWxldGUgcmVzdWx0Ll9pZDtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xufTtcblxuLy8gQ2FsY3VsYXRlcyB0aGUgZG9jdW1lbnQgdG8gaW5zZXJ0IGluIGNhc2Ugd2UncmUgZG9pbmcgYW4gdXBzZXJ0IGFuZCB0aGVcbi8vIHNlbGVjdG9yIGRvZXMgbm90IG1hdGNoIGFueSBlbGVtZW50c1xuTG9jYWxDb2xsZWN0aW9uLl9jcmVhdGVVcHNlcnREb2N1bWVudCA9IChzZWxlY3RvciwgbW9kaWZpZXIpID0+IHtcbiAgY29uc3Qgc2VsZWN0b3JEb2N1bWVudCA9IHBvcHVsYXRlRG9jdW1lbnRXaXRoUXVlcnlGaWVsZHMoc2VsZWN0b3IpO1xuICBjb25zdCBpc01vZGlmeSA9IExvY2FsQ29sbGVjdGlvbi5faXNNb2RpZmljYXRpb25Nb2QobW9kaWZpZXIpO1xuXG4gIGNvbnN0IG5ld0RvYyA9IHt9O1xuXG4gIGlmIChzZWxlY3RvckRvY3VtZW50Ll9pZCkge1xuICAgIG5ld0RvYy5faWQgPSBzZWxlY3RvckRvY3VtZW50Ll9pZDtcbiAgICBkZWxldGUgc2VsZWN0b3JEb2N1bWVudC5faWQ7XG4gIH1cblxuICAvLyBUaGlzIGRvdWJsZSBfbW9kaWZ5IGNhbGwgaXMgbWFkZSB0byBoZWxwIHdpdGggbmVzdGVkIHByb3BlcnRpZXMgKHNlZSBpc3N1ZVxuICAvLyAjODYzMSkuIFdlIGRvIHRoaXMgZXZlbiBpZiBpdCdzIGEgcmVwbGFjZW1lbnQgZm9yIHZhbGlkYXRpb24gcHVycG9zZXMgKGUuZy5cbiAgLy8gYW1iaWd1b3VzIGlkJ3MpXG4gIExvY2FsQ29sbGVjdGlvbi5fbW9kaWZ5KG5ld0RvYywgeyRzZXQ6IHNlbGVjdG9yRG9jdW1lbnR9KTtcbiAgTG9jYWxDb2xsZWN0aW9uLl9tb2RpZnkobmV3RG9jLCBtb2RpZmllciwge2lzSW5zZXJ0OiB0cnVlfSk7XG5cbiAgaWYgKGlzTW9kaWZ5KSB7XG4gICAgcmV0dXJuIG5ld0RvYztcbiAgfVxuXG4gIC8vIFJlcGxhY2VtZW50IGNhbiB0YWtlIF9pZCBmcm9tIHF1ZXJ5IGRvY3VtZW50XG4gIGNvbnN0IHJlcGxhY2VtZW50ID0gT2JqZWN0LmFzc2lnbih7fSwgbW9kaWZpZXIpO1xuICBpZiAobmV3RG9jLl9pZCkge1xuICAgIHJlcGxhY2VtZW50Ll9pZCA9IG5ld0RvYy5faWQ7XG4gIH1cblxuICByZXR1cm4gcmVwbGFjZW1lbnQ7XG59O1xuXG5Mb2NhbENvbGxlY3Rpb24uX2RpZmZPYmplY3RzID0gKGxlZnQsIHJpZ2h0LCBjYWxsYmFja3MpID0+IHtcbiAgcmV0dXJuIERpZmZTZXF1ZW5jZS5kaWZmT2JqZWN0cyhsZWZ0LCByaWdodCwgY2FsbGJhY2tzKTtcbn07XG5cbi8vIG9yZGVyZWQ6IGJvb2wuXG4vLyBvbGRfcmVzdWx0cyBhbmQgbmV3X3Jlc3VsdHM6IGNvbGxlY3Rpb25zIG9mIGRvY3VtZW50cy5cbi8vICAgIGlmIG9yZGVyZWQsIHRoZXkgYXJlIGFycmF5cy5cbi8vICAgIGlmIHVub3JkZXJlZCwgdGhleSBhcmUgSWRNYXBzXG5Mb2NhbENvbGxlY3Rpb24uX2RpZmZRdWVyeUNoYW5nZXMgPSAob3JkZXJlZCwgb2xkUmVzdWx0cywgbmV3UmVzdWx0cywgb2JzZXJ2ZXIsIG9wdGlvbnMpID0+XG4gIERpZmZTZXF1ZW5jZS5kaWZmUXVlcnlDaGFuZ2VzKG9yZGVyZWQsIG9sZFJlc3VsdHMsIG5ld1Jlc3VsdHMsIG9ic2VydmVyLCBvcHRpb25zKVxuO1xuXG5Mb2NhbENvbGxlY3Rpb24uX2RpZmZRdWVyeU9yZGVyZWRDaGFuZ2VzID0gKG9sZFJlc3VsdHMsIG5ld1Jlc3VsdHMsIG9ic2VydmVyLCBvcHRpb25zKSA9PlxuICBEaWZmU2VxdWVuY2UuZGlmZlF1ZXJ5T3JkZXJlZENoYW5nZXMob2xkUmVzdWx0cywgbmV3UmVzdWx0cywgb2JzZXJ2ZXIsIG9wdGlvbnMpXG47XG5cbkxvY2FsQ29sbGVjdGlvbi5fZGlmZlF1ZXJ5VW5vcmRlcmVkQ2hhbmdlcyA9IChvbGRSZXN1bHRzLCBuZXdSZXN1bHRzLCBvYnNlcnZlciwgb3B0aW9ucykgPT5cbiAgRGlmZlNlcXVlbmNlLmRpZmZRdWVyeVVub3JkZXJlZENoYW5nZXMob2xkUmVzdWx0cywgbmV3UmVzdWx0cywgb2JzZXJ2ZXIsIG9wdGlvbnMpXG47XG5cbkxvY2FsQ29sbGVjdGlvbi5fZmluZEluT3JkZXJlZFJlc3VsdHMgPSAocXVlcnksIGRvYykgPT4ge1xuICBpZiAoIXF1ZXJ5Lm9yZGVyZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhblxcJ3QgY2FsbCBfZmluZEluT3JkZXJlZFJlc3VsdHMgb24gdW5vcmRlcmVkIHF1ZXJ5Jyk7XG4gIH1cblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHF1ZXJ5LnJlc3VsdHMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAocXVlcnkucmVzdWx0c1tpXSA9PT0gZG9jKSB7XG4gICAgICByZXR1cm4gaTtcbiAgICB9XG4gIH1cblxuICB0aHJvdyBFcnJvcignb2JqZWN0IG1pc3NpbmcgZnJvbSBxdWVyeScpO1xufTtcblxuLy8gSWYgdGhpcyBpcyBhIHNlbGVjdG9yIHdoaWNoIGV4cGxpY2l0bHkgY29uc3RyYWlucyB0aGUgbWF0Y2ggYnkgSUQgdG8gYSBmaW5pdGVcbi8vIG51bWJlciBvZiBkb2N1bWVudHMsIHJldHVybnMgYSBsaXN0IG9mIHRoZWlyIElEcy4gIE90aGVyd2lzZSByZXR1cm5zXG4vLyBudWxsLiBOb3RlIHRoYXQgdGhlIHNlbGVjdG9yIG1heSBoYXZlIG90aGVyIHJlc3RyaWN0aW9ucyBzbyBpdCBtYXkgbm90IGV2ZW5cbi8vIG1hdGNoIHRob3NlIGRvY3VtZW50ISAgV2UgY2FyZSBhYm91dCAkaW4gYW5kICRhbmQgc2luY2UgdGhvc2UgYXJlIGdlbmVyYXRlZFxuLy8gYWNjZXNzLWNvbnRyb2xsZWQgdXBkYXRlIGFuZCByZW1vdmUuXG5Mb2NhbENvbGxlY3Rpb24uX2lkc01hdGNoZWRCeVNlbGVjdG9yID0gc2VsZWN0b3IgPT4ge1xuICAvLyBJcyB0aGUgc2VsZWN0b3IganVzdCBhbiBJRD9cbiAgaWYgKExvY2FsQ29sbGVjdGlvbi5fc2VsZWN0b3JJc0lkKHNlbGVjdG9yKSkge1xuICAgIHJldHVybiBbc2VsZWN0b3JdO1xuICB9XG5cbiAgaWYgKCFzZWxlY3Rvcikge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gRG8gd2UgaGF2ZSBhbiBfaWQgY2xhdXNlP1xuICBpZiAoaGFzT3duLmNhbGwoc2VsZWN0b3IsICdfaWQnKSkge1xuICAgIC8vIElzIHRoZSBfaWQgY2xhdXNlIGp1c3QgYW4gSUQ/XG4gICAgaWYgKExvY2FsQ29sbGVjdGlvbi5fc2VsZWN0b3JJc0lkKHNlbGVjdG9yLl9pZCkpIHtcbiAgICAgIHJldHVybiBbc2VsZWN0b3IuX2lkXTtcbiAgICB9XG5cbiAgICAvLyBJcyB0aGUgX2lkIGNsYXVzZSB7X2lkOiB7JGluOiBbXCJ4XCIsIFwieVwiLCBcInpcIl19fT9cbiAgICBpZiAoc2VsZWN0b3IuX2lkXG4gICAgICAgICYmIEFycmF5LmlzQXJyYXkoc2VsZWN0b3IuX2lkLiRpbilcbiAgICAgICAgJiYgc2VsZWN0b3IuX2lkLiRpbi5sZW5ndGhcbiAgICAgICAgJiYgc2VsZWN0b3IuX2lkLiRpbi5ldmVyeShMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZCkpIHtcbiAgICAgIHJldHVybiBzZWxlY3Rvci5faWQuJGluO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gSWYgdGhpcyBpcyBhIHRvcC1sZXZlbCAkYW5kLCBhbmQgYW55IG9mIHRoZSBjbGF1c2VzIGNvbnN0cmFpbiB0aGVpclxuICAvLyBkb2N1bWVudHMsIHRoZW4gdGhlIHdob2xlIHNlbGVjdG9yIGlzIGNvbnN0cmFpbmVkIGJ5IGFueSBvbmUgY2xhdXNlJ3NcbiAgLy8gY29uc3RyYWludC4gKFdlbGwsIGJ5IHRoZWlyIGludGVyc2VjdGlvbiwgYnV0IHRoYXQgc2VlbXMgdW5saWtlbHkuKVxuICBpZiAoQXJyYXkuaXNBcnJheShzZWxlY3Rvci4kYW5kKSkge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2VsZWN0b3IuJGFuZC5sZW5ndGg7ICsraSkge1xuICAgICAgY29uc3Qgc3ViSWRzID0gTG9jYWxDb2xsZWN0aW9uLl9pZHNNYXRjaGVkQnlTZWxlY3RvcihzZWxlY3Rvci4kYW5kW2ldKTtcblxuICAgICAgaWYgKHN1Yklkcykge1xuICAgICAgICByZXR1cm4gc3ViSWRzO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9pbnNlcnRJblJlc3VsdHNTeW5jID0gKHF1ZXJ5LCBkb2MpID0+IHtcbiAgY29uc3QgZmllbGRzID0gRUpTT04uY2xvbmUoZG9jKTtcblxuICBkZWxldGUgZmllbGRzLl9pZDtcblxuICBpZiAocXVlcnkub3JkZXJlZCkge1xuICAgIGlmICghcXVlcnkuc29ydGVyKSB7XG4gICAgICBxdWVyeS5hZGRlZEJlZm9yZShkb2MuX2lkLCBxdWVyeS5wcm9qZWN0aW9uRm4oZmllbGRzKSwgbnVsbCk7XG4gICAgICBxdWVyeS5yZXN1bHRzLnB1c2goZG9jKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgaSA9IExvY2FsQ29sbGVjdGlvbi5faW5zZXJ0SW5Tb3J0ZWRMaXN0KFxuICAgICAgICBxdWVyeS5zb3J0ZXIuZ2V0Q29tcGFyYXRvcih7ZGlzdGFuY2VzOiBxdWVyeS5kaXN0YW5jZXN9KSxcbiAgICAgICAgcXVlcnkucmVzdWx0cyxcbiAgICAgICAgZG9jXG4gICAgICApO1xuXG4gICAgICBsZXQgbmV4dCA9IHF1ZXJ5LnJlc3VsdHNbaSArIDFdO1xuICAgICAgaWYgKG5leHQpIHtcbiAgICAgICAgbmV4dCA9IG5leHQuX2lkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV4dCA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHF1ZXJ5LmFkZGVkQmVmb3JlKGRvYy5faWQsIHF1ZXJ5LnByb2plY3Rpb25GbihmaWVsZHMpLCBuZXh0KTtcbiAgICB9XG5cbiAgICBxdWVyeS5hZGRlZChkb2MuX2lkLCBxdWVyeS5wcm9qZWN0aW9uRm4oZmllbGRzKSk7XG4gIH0gZWxzZSB7XG4gICAgcXVlcnkuYWRkZWQoZG9jLl9pZCwgcXVlcnkucHJvamVjdGlvbkZuKGZpZWxkcykpO1xuICAgIHF1ZXJ5LnJlc3VsdHMuc2V0KGRvYy5faWQsIGRvYyk7XG4gIH1cbn07XG5cbkxvY2FsQ29sbGVjdGlvbi5faW5zZXJ0SW5SZXN1bHRzQXN5bmMgPSBhc3luYyAocXVlcnksIGRvYykgPT4ge1xuICBjb25zdCBmaWVsZHMgPSBFSlNPTi5jbG9uZShkb2MpO1xuXG4gIGRlbGV0ZSBmaWVsZHMuX2lkO1xuXG4gIGlmIChxdWVyeS5vcmRlcmVkKSB7XG4gICAgaWYgKCFxdWVyeS5zb3J0ZXIpIHtcbiAgICAgIGF3YWl0IHF1ZXJ5LmFkZGVkQmVmb3JlKGRvYy5faWQsIHF1ZXJ5LnByb2plY3Rpb25GbihmaWVsZHMpLCBudWxsKTtcbiAgICAgIHF1ZXJ5LnJlc3VsdHMucHVzaChkb2MpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBpID0gTG9jYWxDb2xsZWN0aW9uLl9pbnNlcnRJblNvcnRlZExpc3QoXG4gICAgICAgIHF1ZXJ5LnNvcnRlci5nZXRDb21wYXJhdG9yKHtkaXN0YW5jZXM6IHF1ZXJ5LmRpc3RhbmNlc30pLFxuICAgICAgICBxdWVyeS5yZXN1bHRzLFxuICAgICAgICBkb2NcbiAgICAgICk7XG5cbiAgICAgIGxldCBuZXh0ID0gcXVlcnkucmVzdWx0c1tpICsgMV07XG4gICAgICBpZiAobmV4dCkge1xuICAgICAgICBuZXh0ID0gbmV4dC5faWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXh0ID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgcXVlcnkuYWRkZWRCZWZvcmUoZG9jLl9pZCwgcXVlcnkucHJvamVjdGlvbkZuKGZpZWxkcyksIG5leHQpO1xuICAgIH1cblxuICAgIGF3YWl0IHF1ZXJ5LmFkZGVkKGRvYy5faWQsIHF1ZXJ5LnByb2plY3Rpb25GbihmaWVsZHMpKTtcbiAgfSBlbHNlIHtcbiAgICBhd2FpdCBxdWVyeS5hZGRlZChkb2MuX2lkLCBxdWVyeS5wcm9qZWN0aW9uRm4oZmllbGRzKSk7XG4gICAgcXVlcnkucmVzdWx0cy5zZXQoZG9jLl9pZCwgZG9jKTtcbiAgfVxufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9pbnNlcnRJblNvcnRlZExpc3QgPSAoY21wLCBhcnJheSwgdmFsdWUpID0+IHtcbiAgaWYgKGFycmF5Lmxlbmd0aCA9PT0gMCkge1xuICAgIGFycmF5LnB1c2godmFsdWUpO1xuICAgIHJldHVybiAwO1xuICB9XG5cbiAgY29uc3QgaSA9IExvY2FsQ29sbGVjdGlvbi5fYmluYXJ5U2VhcmNoKGNtcCwgYXJyYXksIHZhbHVlKTtcblxuICBhcnJheS5zcGxpY2UoaSwgMCwgdmFsdWUpO1xuXG4gIHJldHVybiBpO1xufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9pc01vZGlmaWNhdGlvbk1vZCA9IG1vZCA9PiB7XG4gIGxldCBpc01vZGlmeSA9IGZhbHNlO1xuICBsZXQgaXNSZXBsYWNlID0gZmFsc2U7XG5cbiAgT2JqZWN0LmtleXMobW9kKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgaWYgKGtleS5zdWJzdHIoMCwgMSkgPT09ICckJykge1xuICAgICAgaXNNb2RpZnkgPSB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICBpc1JlcGxhY2UgPSB0cnVlO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKGlzTW9kaWZ5ICYmIGlzUmVwbGFjZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdVcGRhdGUgcGFyYW1ldGVyIGNhbm5vdCBoYXZlIGJvdGggbW9kaWZpZXIgYW5kIG5vbi1tb2RpZmllciBmaWVsZHMuJ1xuICAgICk7XG4gIH1cblxuICByZXR1cm4gaXNNb2RpZnk7XG59O1xuXG4vLyBYWFggbWF5YmUgdGhpcyBzaG91bGQgYmUgRUpTT04uaXNPYmplY3QsIHRob3VnaCBFSlNPTiBkb2Vzbid0IGtub3cgYWJvdXRcbi8vIFJlZ0V4cFxuLy8gWFhYIG5vdGUgdGhhdCBfdHlwZSh1bmRlZmluZWQpID09PSAzISEhIVxuTG9jYWxDb2xsZWN0aW9uLl9pc1BsYWluT2JqZWN0ID0geCA9PiB7XG4gIHJldHVybiB4ICYmIExvY2FsQ29sbGVjdGlvbi5fZi5fdHlwZSh4KSA9PT0gMztcbn07XG5cbi8vIFhYWCBuZWVkIGEgc3RyYXRlZ3kgZm9yIHBhc3NpbmcgdGhlIGJpbmRpbmcgb2YgJCBpbnRvIHRoaXNcbi8vIGZ1bmN0aW9uLCBmcm9tIHRoZSBjb21waWxlZCBzZWxlY3RvclxuLy9cbi8vIG1heWJlIGp1c3Qge2tleS51cC50by5qdXN0LmJlZm9yZS5kb2xsYXJzaWduOiBhcnJheV9pbmRleH1cbi8vXG4vLyBYWFggYXRvbWljaXR5OiBpZiBvbmUgbW9kaWZpY2F0aW9uIGZhaWxzLCBkbyB3ZSByb2xsIGJhY2sgdGhlIHdob2xlXG4vLyBjaGFuZ2U/XG4vL1xuLy8gb3B0aW9uczpcbi8vICAgLSBpc0luc2VydCBpcyBzZXQgd2hlbiBfbW9kaWZ5IGlzIGJlaW5nIGNhbGxlZCB0byBjb21wdXRlIHRoZSBkb2N1bWVudCB0b1xuLy8gICAgIGluc2VydCBhcyBwYXJ0IG9mIGFuIHVwc2VydCBvcGVyYXRpb24uIFdlIHVzZSB0aGlzIHByaW1hcmlseSB0byBmaWd1cmVcbi8vICAgICBvdXQgd2hlbiB0byBzZXQgdGhlIGZpZWxkcyBpbiAkc2V0T25JbnNlcnQsIGlmIHByZXNlbnQuXG5Mb2NhbENvbGxlY3Rpb24uX21vZGlmeSA9IChkb2MsIG1vZGlmaWVyLCBvcHRpb25zID0ge30pID0+IHtcbiAgaWYgKCFMb2NhbENvbGxlY3Rpb24uX2lzUGxhaW5PYmplY3QobW9kaWZpZXIpKSB7XG4gICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJ01vZGlmaWVyIG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gIH1cblxuICAvLyBNYWtlIHN1cmUgdGhlIGNhbGxlciBjYW4ndCBtdXRhdGUgb3VyIGRhdGEgc3RydWN0dXJlcy5cbiAgbW9kaWZpZXIgPSBFSlNPTi5jbG9uZShtb2RpZmllcik7XG5cbiAgY29uc3QgaXNNb2RpZmllciA9IGlzT3BlcmF0b3JPYmplY3QobW9kaWZpZXIpO1xuICBjb25zdCBuZXdEb2MgPSBpc01vZGlmaWVyID8gRUpTT04uY2xvbmUoZG9jKSA6IG1vZGlmaWVyO1xuXG4gIGlmIChpc01vZGlmaWVyKSB7XG4gICAgLy8gYXBwbHkgbW9kaWZpZXJzIHRvIHRoZSBkb2MuXG4gICAgT2JqZWN0LmtleXMobW9kaWZpZXIpLmZvckVhY2gob3BlcmF0b3IgPT4ge1xuICAgICAgLy8gVHJlYXQgJHNldE9uSW5zZXJ0IGFzICRzZXQgaWYgdGhpcyBpcyBhbiBpbnNlcnQuXG4gICAgICBjb25zdCBzZXRPbkluc2VydCA9IG9wdGlvbnMuaXNJbnNlcnQgJiYgb3BlcmF0b3IgPT09ICckc2V0T25JbnNlcnQnO1xuICAgICAgY29uc3QgbW9kRnVuYyA9IE1PRElGSUVSU1tzZXRPbkluc2VydCA/ICckc2V0JyA6IG9wZXJhdG9yXTtcbiAgICAgIGNvbnN0IG9wZXJhbmQgPSBtb2RpZmllcltvcGVyYXRvcl07XG5cbiAgICAgIGlmICghbW9kRnVuYykge1xuICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihgSW52YWxpZCBtb2RpZmllciBzcGVjaWZpZWQgJHtvcGVyYXRvcn1gKTtcbiAgICAgIH1cblxuICAgICAgT2JqZWN0LmtleXMob3BlcmFuZCkuZm9yRWFjaChrZXlwYXRoID0+IHtcbiAgICAgICAgY29uc3QgYXJnID0gb3BlcmFuZFtrZXlwYXRoXTtcblxuICAgICAgICBpZiAoa2V5cGF0aCA9PT0gJycpIHtcbiAgICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignQW4gZW1wdHkgdXBkYXRlIHBhdGggaXMgbm90IHZhbGlkLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qga2V5cGFydHMgPSBrZXlwYXRoLnNwbGl0KCcuJyk7XG5cbiAgICAgICAgaWYgKCFrZXlwYXJ0cy5ldmVyeShCb29sZWFuKSkge1xuICAgICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAgICAgYFRoZSB1cGRhdGUgcGF0aCAnJHtrZXlwYXRofScgY29udGFpbnMgYW4gZW1wdHkgZmllbGQgbmFtZSwgYCArXG4gICAgICAgICAgICAnd2hpY2ggaXMgbm90IGFsbG93ZWQuJ1xuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB0YXJnZXQgPSBmaW5kTW9kVGFyZ2V0KG5ld0RvYywga2V5cGFydHMsIHtcbiAgICAgICAgICBhcnJheUluZGljZXM6IG9wdGlvbnMuYXJyYXlJbmRpY2VzLFxuICAgICAgICAgIGZvcmJpZEFycmF5OiBvcGVyYXRvciA9PT0gJyRyZW5hbWUnLFxuICAgICAgICAgIG5vQ3JlYXRlOiBOT19DUkVBVEVfTU9ESUZJRVJTW29wZXJhdG9yXVxuICAgICAgICB9KTtcblxuICAgICAgICBtb2RGdW5jKHRhcmdldCwga2V5cGFydHMucG9wKCksIGFyZywga2V5cGF0aCwgbmV3RG9jKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgaWYgKGRvYy5faWQgJiYgIUVKU09OLmVxdWFscyhkb2MuX2lkLCBuZXdEb2MuX2lkKSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgIGBBZnRlciBhcHBseWluZyB0aGUgdXBkYXRlIHRvIHRoZSBkb2N1bWVudCB7X2lkOiBcIiR7ZG9jLl9pZH1cIiwgLi4ufSxgICtcbiAgICAgICAgJyB0aGUgKGltbXV0YWJsZSkgZmllbGQgXFwnX2lkXFwnIHdhcyBmb3VuZCB0byBoYXZlIGJlZW4gYWx0ZXJlZCB0byAnICtcbiAgICAgICAgYF9pZDogXCIke25ld0RvYy5faWR9XCJgXG4gICAgICApO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoZG9jLl9pZCAmJiBtb2RpZmllci5faWQgJiYgIUVKU09OLmVxdWFscyhkb2MuX2lkLCBtb2RpZmllci5faWQpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgYFRoZSBfaWQgZmllbGQgY2Fubm90IGJlIGNoYW5nZWQgZnJvbSB7X2lkOiBcIiR7ZG9jLl9pZH1cIn0gdG8gYCArXG4gICAgICAgIGB7X2lkOiBcIiR7bW9kaWZpZXIuX2lkfVwifWBcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gcmVwbGFjZSB0aGUgd2hvbGUgZG9jdW1lbnRcbiAgICBhc3NlcnRIYXNWYWxpZEZpZWxkTmFtZXMobW9kaWZpZXIpO1xuICB9XG5cbiAgLy8gbW92ZSBuZXcgZG9jdW1lbnQgaW50byBwbGFjZS5cbiAgT2JqZWN0LmtleXMoZG9jKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgLy8gTm90ZTogdGhpcyB1c2VkIHRvIGJlIGZvciAodmFyIGtleSBpbiBkb2MpIGhvd2V2ZXIsIHRoaXMgZG9lcyBub3RcbiAgICAvLyB3b3JrIHJpZ2h0IGluIE9wZXJhLiBEZWxldGluZyBmcm9tIGEgZG9jIHdoaWxlIGl0ZXJhdGluZyBvdmVyIGl0XG4gICAgLy8gd291bGQgc29tZXRpbWVzIGNhdXNlIG9wZXJhIHRvIHNraXAgc29tZSBrZXlzLlxuICAgIGlmIChrZXkgIT09ICdfaWQnKSB7XG4gICAgICBkZWxldGUgZG9jW2tleV07XG4gICAgfVxuICB9KTtcblxuICBPYmplY3Qua2V5cyhuZXdEb2MpLmZvckVhY2goa2V5ID0+IHtcbiAgICBkb2Nba2V5XSA9IG5ld0RvY1trZXldO1xuICB9KTtcbn07XG5cbkxvY2FsQ29sbGVjdGlvbi5fb2JzZXJ2ZUZyb21PYnNlcnZlQ2hhbmdlcyA9IChjdXJzb3IsIG9ic2VydmVDYWxsYmFja3MpID0+IHtcbiAgY29uc3QgdHJhbnNmb3JtID0gY3Vyc29yLmdldFRyYW5zZm9ybSgpIHx8IChkb2MgPT4gZG9jKTtcbiAgbGV0IHN1cHByZXNzZWQgPSAhIW9ic2VydmVDYWxsYmFja3MuX3N1cHByZXNzX2luaXRpYWw7XG5cbiAgbGV0IG9ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzO1xuICBpZiAoTG9jYWxDb2xsZWN0aW9uLl9vYnNlcnZlQ2FsbGJhY2tzQXJlT3JkZXJlZChvYnNlcnZlQ2FsbGJhY2tzKSkge1xuICAgIC8vIFRoZSBcIl9ub19pbmRpY2VzXCIgb3B0aW9uIHNldHMgYWxsIGluZGV4IGFyZ3VtZW50cyB0byAtMSBhbmQgc2tpcHMgdGhlXG4gICAgLy8gbGluZWFyIHNjYW5zIHJlcXVpcmVkIHRvIGdlbmVyYXRlIHRoZW0uICBUaGlzIGxldHMgb2JzZXJ2ZXJzIHRoYXQgZG9uJ3RcbiAgICAvLyBuZWVkIGFic29sdXRlIGluZGljZXMgYmVuZWZpdCBmcm9tIHRoZSBvdGhlciBmZWF0dXJlcyBvZiB0aGlzIEFQSSAtLVxuICAgIC8vIHJlbGF0aXZlIG9yZGVyLCB0cmFuc2Zvcm1zLCBhbmQgYXBwbHlDaGFuZ2VzIC0tIHdpdGhvdXQgdGhlIHNwZWVkIGhpdC5cbiAgICBjb25zdCBpbmRpY2VzID0gIW9ic2VydmVDYWxsYmFja3MuX25vX2luZGljZXM7XG5cbiAgICBvYnNlcnZlQ2hhbmdlc0NhbGxiYWNrcyA9IHtcbiAgICAgIGFkZGVkQmVmb3JlKGlkLCBmaWVsZHMsIGJlZm9yZSkge1xuICAgICAgICBjb25zdCBjaGVjayA9IHN1cHByZXNzZWQgfHwgIShvYnNlcnZlQ2FsbGJhY2tzLmFkZGVkQXQgfHwgb2JzZXJ2ZUNhbGxiYWNrcy5hZGRlZClcbiAgICAgICAgaWYgKGNoZWNrKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZG9jID0gdHJhbnNmb3JtKE9iamVjdC5hc3NpZ24oZmllbGRzLCB7X2lkOiBpZH0pKTtcblxuICAgICAgICBpZiAob2JzZXJ2ZUNhbGxiYWNrcy5hZGRlZEF0KSB7XG4gICAgICAgICAgb2JzZXJ2ZUNhbGxiYWNrcy5hZGRlZEF0KFxuICAgICAgICAgICAgICBkb2MsXG4gICAgICAgICAgICAgIGluZGljZXNcbiAgICAgICAgICAgICAgICAgID8gYmVmb3JlXG4gICAgICAgICAgICAgICAgICAgICAgPyB0aGlzLmRvY3MuaW5kZXhPZihiZWZvcmUpXG4gICAgICAgICAgICAgICAgICAgICAgOiB0aGlzLmRvY3Muc2l6ZSgpXG4gICAgICAgICAgICAgICAgICA6IC0xLFxuICAgICAgICAgICAgICBiZWZvcmVcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG9ic2VydmVDYWxsYmFja3MuYWRkZWQoZG9jKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGNoYW5nZWQoaWQsIGZpZWxkcykge1xuXG4gICAgICAgIGlmICghKG9ic2VydmVDYWxsYmFja3MuY2hhbmdlZEF0IHx8IG9ic2VydmVDYWxsYmFja3MuY2hhbmdlZCkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgZG9jID0gRUpTT04uY2xvbmUodGhpcy5kb2NzLmdldChpZCkpO1xuICAgICAgICBpZiAoIWRvYykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBpZCBmb3IgY2hhbmdlZDogJHtpZH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9sZERvYyA9IHRyYW5zZm9ybShFSlNPTi5jbG9uZShkb2MpKTtcblxuICAgICAgICBEaWZmU2VxdWVuY2UuYXBwbHlDaGFuZ2VzKGRvYywgZmllbGRzKTtcblxuICAgICAgICBpZiAob2JzZXJ2ZUNhbGxiYWNrcy5jaGFuZ2VkQXQpIHtcbiAgICAgICAgICBvYnNlcnZlQ2FsbGJhY2tzLmNoYW5nZWRBdChcbiAgICAgICAgICAgICAgdHJhbnNmb3JtKGRvYyksXG4gICAgICAgICAgICAgIG9sZERvYyxcbiAgICAgICAgICAgICAgaW5kaWNlcyA/IHRoaXMuZG9jcy5pbmRleE9mKGlkKSA6IC0xXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvYnNlcnZlQ2FsbGJhY2tzLmNoYW5nZWQodHJhbnNmb3JtKGRvYyksIG9sZERvYyk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBtb3ZlZEJlZm9yZShpZCwgYmVmb3JlKSB7XG4gICAgICAgIGlmICghb2JzZXJ2ZUNhbGxiYWNrcy5tb3ZlZFRvKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZnJvbSA9IGluZGljZXMgPyB0aGlzLmRvY3MuaW5kZXhPZihpZCkgOiAtMTtcbiAgICAgICAgbGV0IHRvID0gaW5kaWNlc1xuICAgICAgICAgICAgPyBiZWZvcmVcbiAgICAgICAgICAgICAgICA/IHRoaXMuZG9jcy5pbmRleE9mKGJlZm9yZSlcbiAgICAgICAgICAgICAgICA6IHRoaXMuZG9jcy5zaXplKClcbiAgICAgICAgICAgIDogLTE7XG5cbiAgICAgICAgLy8gV2hlbiBub3QgbW92aW5nIGJhY2t3YXJkcywgYWRqdXN0IGZvciB0aGUgZmFjdCB0aGF0IHJlbW92aW5nIHRoZVxuICAgICAgICAvLyBkb2N1bWVudCBzbGlkZXMgZXZlcnl0aGluZyBiYWNrIG9uZSBzbG90LlxuICAgICAgICBpZiAodG8gPiBmcm9tKSB7XG4gICAgICAgICAgLS10bztcbiAgICAgICAgfVxuXG4gICAgICAgIG9ic2VydmVDYWxsYmFja3MubW92ZWRUbyhcbiAgICAgICAgICAgIHRyYW5zZm9ybShFSlNPTi5jbG9uZSh0aGlzLmRvY3MuZ2V0KGlkKSkpLFxuICAgICAgICAgICAgZnJvbSxcbiAgICAgICAgICAgIHRvLFxuICAgICAgICAgICAgYmVmb3JlIHx8IG51bGxcbiAgICAgICAgKTtcbiAgICAgIH0sXG4gICAgICByZW1vdmVkKGlkKSB7XG4gICAgICAgIGlmICghKG9ic2VydmVDYWxsYmFja3MucmVtb3ZlZEF0IHx8IG9ic2VydmVDYWxsYmFja3MucmVtb3ZlZCkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyB0ZWNobmljYWxseSBtYXliZSB0aGVyZSBzaG91bGQgYmUgYW4gRUpTT04uY2xvbmUgaGVyZSwgYnV0IGl0J3MgYWJvdXRcbiAgICAgICAgLy8gdG8gYmUgcmVtb3ZlZCBmcm9tIHRoaXMuZG9jcyFcbiAgICAgICAgY29uc3QgZG9jID0gdHJhbnNmb3JtKHRoaXMuZG9jcy5nZXQoaWQpKTtcblxuICAgICAgICBpZiAob2JzZXJ2ZUNhbGxiYWNrcy5yZW1vdmVkQXQpIHtcbiAgICAgICAgICBvYnNlcnZlQ2FsbGJhY2tzLnJlbW92ZWRBdChkb2MsIGluZGljZXMgPyB0aGlzLmRvY3MuaW5kZXhPZihpZCkgOiAtMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb2JzZXJ2ZUNhbGxiYWNrcy5yZW1vdmVkKGRvYyk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICBvYnNlcnZlQ2hhbmdlc0NhbGxiYWNrcyA9IHtcbiAgICAgIGFkZGVkKGlkLCBmaWVsZHMpIHtcbiAgICAgICAgaWYgKCFzdXBwcmVzc2VkICYmIG9ic2VydmVDYWxsYmFja3MuYWRkZWQpIHtcbiAgICAgICAgICBvYnNlcnZlQ2FsbGJhY2tzLmFkZGVkKHRyYW5zZm9ybShPYmplY3QuYXNzaWduKGZpZWxkcywge19pZDogaWR9KSkpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgY2hhbmdlZChpZCwgZmllbGRzKSB7XG4gICAgICAgIGlmIChvYnNlcnZlQ2FsbGJhY2tzLmNoYW5nZWQpIHtcbiAgICAgICAgICBjb25zdCBvbGREb2MgPSB0aGlzLmRvY3MuZ2V0KGlkKTtcbiAgICAgICAgICBjb25zdCBkb2MgPSBFSlNPTi5jbG9uZShvbGREb2MpO1xuXG4gICAgICAgICAgRGlmZlNlcXVlbmNlLmFwcGx5Q2hhbmdlcyhkb2MsIGZpZWxkcyk7XG5cbiAgICAgICAgICBvYnNlcnZlQ2FsbGJhY2tzLmNoYW5nZWQoXG4gICAgICAgICAgICAgIHRyYW5zZm9ybShkb2MpLFxuICAgICAgICAgICAgICB0cmFuc2Zvcm0oRUpTT04uY2xvbmUob2xkRG9jKSlcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgcmVtb3ZlZChpZCkge1xuICAgICAgICBpZiAob2JzZXJ2ZUNhbGxiYWNrcy5yZW1vdmVkKSB7XG4gICAgICAgICAgb2JzZXJ2ZUNhbGxiYWNrcy5yZW1vdmVkKHRyYW5zZm9ybSh0aGlzLmRvY3MuZ2V0KGlkKSkpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICBjb25zdCBjaGFuZ2VPYnNlcnZlciA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0NhY2hpbmdDaGFuZ2VPYnNlcnZlcih7XG4gICAgY2FsbGJhY2tzOiBvYnNlcnZlQ2hhbmdlc0NhbGxiYWNrc1xuICB9KTtcblxuICAvLyBDYWNoaW5nQ2hhbmdlT2JzZXJ2ZXIgY2xvbmVzIGFsbCByZWNlaXZlZCBpbnB1dCBvbiBpdHMgY2FsbGJhY2tzXG4gIC8vIFNvIHdlIGNhbiBtYXJrIGl0IGFzIHNhZmUgdG8gcmVkdWNlIHRoZSBlanNvbiBjbG9uZXMuXG4gIC8vIFRoaXMgaXMgdGVzdGVkIGJ5IHRoZSBgbW9uZ28tbGl2ZWRhdGEgLSAoZXh0ZW5kZWQpIHNjcmliYmxpbmdgIHRlc3RzXG4gIGNoYW5nZU9ic2VydmVyLmFwcGx5Q2hhbmdlLl9mcm9tT2JzZXJ2ZSA9IHRydWU7XG4gIGNvbnN0IGhhbmRsZSA9IGN1cnNvci5vYnNlcnZlQ2hhbmdlcyhjaGFuZ2VPYnNlcnZlci5hcHBseUNoYW5nZSxcbiAgICAgIHsgbm9uTXV0YXRpbmdDYWxsYmFja3M6IHRydWUgfSk7XG5cbiAgLy8gSWYgbmVlZGVkLCByZS1lbmFibGUgY2FsbGJhY2tzIGFzIHNvb24gYXMgdGhlIGluaXRpYWwgYmF0Y2ggaXMgcmVhZHkuXG4gIGNvbnN0IHNldFN1cHByZXNzZWQgPSAoaCkgPT4ge1xuICAgIGlmIChoLmlzUmVhZHkpIHN1cHByZXNzZWQgPSBmYWxzZTtcbiAgICBlbHNlIGguaXNSZWFkeVByb21pc2U/LnRoZW4oKCkgPT4gKHN1cHByZXNzZWQgPSBmYWxzZSkpO1xuICB9O1xuICAvLyBXaGVuIHdlIGNhbGwgY3Vyc29yLm9ic2VydmVDaGFuZ2VzKCkgaXQgY2FuIGJlIHRoZSBvbiBmcm9tXG4gIC8vIHRoZSBtb25nbyBwYWNrYWdlIChpbnN0ZWFkIG9mIHRoZSBtaW5pbW9uZ28gb25lKSBhbmQgaXQgZG9lc24ndCBoYXZlIGlzUmVhZHkgYW5kIGlzUmVhZHlQcm9taXNlXG4gIGlmIChNZXRlb3IuX2lzUHJvbWlzZShoYW5kbGUpKSB7XG4gICAgaGFuZGxlLnRoZW4oc2V0U3VwcHJlc3NlZCk7XG4gIH0gZWxzZSB7XG4gICAgc2V0U3VwcHJlc3NlZChoYW5kbGUpO1xuICB9XG4gIHJldHVybiBoYW5kbGU7XG59O1xuXG5Mb2NhbENvbGxlY3Rpb24uX29ic2VydmVDYWxsYmFja3NBcmVPcmRlcmVkID0gY2FsbGJhY2tzID0+IHtcbiAgaWYgKGNhbGxiYWNrcy5hZGRlZCAmJiBjYWxsYmFja3MuYWRkZWRBdCkge1xuICAgIHRocm93IG5ldyBFcnJvcignUGxlYXNlIHNwZWNpZnkgb25seSBvbmUgb2YgYWRkZWQoKSBhbmQgYWRkZWRBdCgpJyk7XG4gIH1cblxuICBpZiAoY2FsbGJhY2tzLmNoYW5nZWQgJiYgY2FsbGJhY2tzLmNoYW5nZWRBdCkge1xuICAgIHRocm93IG5ldyBFcnJvcignUGxlYXNlIHNwZWNpZnkgb25seSBvbmUgb2YgY2hhbmdlZCgpIGFuZCBjaGFuZ2VkQXQoKScpO1xuICB9XG5cbiAgaWYgKGNhbGxiYWNrcy5yZW1vdmVkICYmIGNhbGxiYWNrcy5yZW1vdmVkQXQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1BsZWFzZSBzcGVjaWZ5IG9ubHkgb25lIG9mIHJlbW92ZWQoKSBhbmQgcmVtb3ZlZEF0KCknKTtcbiAgfVxuXG4gIHJldHVybiAhIShcbiAgICBjYWxsYmFja3MuYWRkZWRBdCB8fFxuICAgIGNhbGxiYWNrcy5jaGFuZ2VkQXQgfHxcbiAgICBjYWxsYmFja3MubW92ZWRUbyB8fFxuICAgIGNhbGxiYWNrcy5yZW1vdmVkQXRcbiAgKTtcbn07XG5cbkxvY2FsQ29sbGVjdGlvbi5fb2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3NBcmVPcmRlcmVkID0gY2FsbGJhY2tzID0+IHtcbiAgaWYgKGNhbGxiYWNrcy5hZGRlZCAmJiBjYWxsYmFja3MuYWRkZWRCZWZvcmUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1BsZWFzZSBzcGVjaWZ5IG9ubHkgb25lIG9mIGFkZGVkKCkgYW5kIGFkZGVkQmVmb3JlKCknKTtcbiAgfVxuXG4gIHJldHVybiAhIShjYWxsYmFja3MuYWRkZWRCZWZvcmUgfHwgY2FsbGJhY2tzLm1vdmVkQmVmb3JlKTtcbn07XG5cbkxvY2FsQ29sbGVjdGlvbi5fcmVtb3ZlRnJvbVJlc3VsdHNTeW5jID0gKHF1ZXJ5LCBkb2MpID0+IHtcbiAgaWYgKHF1ZXJ5Lm9yZGVyZWQpIHtcbiAgICBjb25zdCBpID0gTG9jYWxDb2xsZWN0aW9uLl9maW5kSW5PcmRlcmVkUmVzdWx0cyhxdWVyeSwgZG9jKTtcblxuICAgIHF1ZXJ5LnJlbW92ZWQoZG9jLl9pZCk7XG4gICAgcXVlcnkucmVzdWx0cy5zcGxpY2UoaSwgMSk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgaWQgPSBkb2MuX2lkOyAgLy8gaW4gY2FzZSBjYWxsYmFjayBtdXRhdGVzIGRvY1xuXG4gICAgcXVlcnkucmVtb3ZlZChkb2MuX2lkKTtcbiAgICBxdWVyeS5yZXN1bHRzLnJlbW92ZShpZCk7XG4gIH1cbn07XG5cbkxvY2FsQ29sbGVjdGlvbi5fcmVtb3ZlRnJvbVJlc3VsdHNBc3luYyA9IGFzeW5jIChxdWVyeSwgZG9jKSA9PiB7XG4gIGlmIChxdWVyeS5vcmRlcmVkKSB7XG4gICAgY29uc3QgaSA9IExvY2FsQ29sbGVjdGlvbi5fZmluZEluT3JkZXJlZFJlc3VsdHMocXVlcnksIGRvYyk7XG5cbiAgICBhd2FpdCBxdWVyeS5yZW1vdmVkKGRvYy5faWQpO1xuICAgIHF1ZXJ5LnJlc3VsdHMuc3BsaWNlKGksIDEpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGlkID0gZG9jLl9pZDsgIC8vIGluIGNhc2UgY2FsbGJhY2sgbXV0YXRlcyBkb2NcblxuICAgIGF3YWl0IHF1ZXJ5LnJlbW92ZWQoZG9jLl9pZCk7XG4gICAgcXVlcnkucmVzdWx0cy5yZW1vdmUoaWQpO1xuICB9XG59O1xuXG4vLyBJcyB0aGlzIHNlbGVjdG9yIGp1c3Qgc2hvcnRoYW5kIGZvciBsb29rdXAgYnkgX2lkP1xuTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWQgPSBzZWxlY3RvciA9PlxuICB0eXBlb2Ygc2VsZWN0b3IgPT09ICdudW1iZXInIHx8XG4gIHR5cGVvZiBzZWxlY3RvciA9PT0gJ3N0cmluZycgfHxcbiAgc2VsZWN0b3IgaW5zdGFuY2VvZiBNb25nb0lELk9iamVjdElEXG47XG5cbi8vIElzIHRoZSBzZWxlY3RvciBqdXN0IGxvb2t1cCBieSBfaWQgKHNob3J0aGFuZCBvciBub3QpP1xuTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWRQZXJoYXBzQXNPYmplY3QgPSBzZWxlY3RvciA9PlxuICBMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZChzZWxlY3RvcikgfHxcbiAgTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWQoc2VsZWN0b3IgJiYgc2VsZWN0b3IuX2lkKSAmJlxuICBPYmplY3Qua2V5cyhzZWxlY3RvcikubGVuZ3RoID09PSAxXG47XG5cbkxvY2FsQ29sbGVjdGlvbi5fdXBkYXRlSW5SZXN1bHRzU3luYyA9IChxdWVyeSwgZG9jLCBvbGRfZG9jKSA9PiB7XG4gIGlmICghRUpTT04uZXF1YWxzKGRvYy5faWQsIG9sZF9kb2MuX2lkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignQ2FuXFwndCBjaGFuZ2UgYSBkb2NcXCdzIF9pZCB3aGlsZSB1cGRhdGluZycpO1xuICB9XG5cbiAgY29uc3QgcHJvamVjdGlvbkZuID0gcXVlcnkucHJvamVjdGlvbkZuO1xuICBjb25zdCBjaGFuZ2VkRmllbGRzID0gRGlmZlNlcXVlbmNlLm1ha2VDaGFuZ2VkRmllbGRzKFxuICAgIHByb2plY3Rpb25Gbihkb2MpLFxuICAgIHByb2plY3Rpb25GbihvbGRfZG9jKVxuICApO1xuXG4gIGlmICghcXVlcnkub3JkZXJlZCkge1xuICAgIGlmIChPYmplY3Qua2V5cyhjaGFuZ2VkRmllbGRzKS5sZW5ndGgpIHtcbiAgICAgIHF1ZXJ5LmNoYW5nZWQoZG9jLl9pZCwgY2hhbmdlZEZpZWxkcyk7XG4gICAgICBxdWVyeS5yZXN1bHRzLnNldChkb2MuX2lkLCBkb2MpO1xuICAgIH1cblxuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IG9sZF9pZHggPSBMb2NhbENvbGxlY3Rpb24uX2ZpbmRJbk9yZGVyZWRSZXN1bHRzKHF1ZXJ5LCBkb2MpO1xuXG4gIGlmIChPYmplY3Qua2V5cyhjaGFuZ2VkRmllbGRzKS5sZW5ndGgpIHtcbiAgICBxdWVyeS5jaGFuZ2VkKGRvYy5faWQsIGNoYW5nZWRGaWVsZHMpO1xuICB9XG5cbiAgaWYgKCFxdWVyeS5zb3J0ZXIpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBqdXN0IHRha2UgaXQgb3V0IGFuZCBwdXQgaXQgYmFjayBpbiBhZ2FpbiwgYW5kIHNlZSBpZiB0aGUgaW5kZXggY2hhbmdlc1xuICBxdWVyeS5yZXN1bHRzLnNwbGljZShvbGRfaWR4LCAxKTtcblxuICBjb25zdCBuZXdfaWR4ID0gTG9jYWxDb2xsZWN0aW9uLl9pbnNlcnRJblNvcnRlZExpc3QoXG4gICAgcXVlcnkuc29ydGVyLmdldENvbXBhcmF0b3Ioe2Rpc3RhbmNlczogcXVlcnkuZGlzdGFuY2VzfSksXG4gICAgcXVlcnkucmVzdWx0cyxcbiAgICBkb2NcbiAgKTtcblxuICBpZiAob2xkX2lkeCAhPT0gbmV3X2lkeCkge1xuICAgIGxldCBuZXh0ID0gcXVlcnkucmVzdWx0c1tuZXdfaWR4ICsgMV07XG4gICAgaWYgKG5leHQpIHtcbiAgICAgIG5leHQgPSBuZXh0Ll9pZDtcbiAgICB9IGVsc2Uge1xuICAgICAgbmV4dCA9IG51bGw7XG4gICAgfVxuXG4gICAgcXVlcnkubW92ZWRCZWZvcmUgJiYgcXVlcnkubW92ZWRCZWZvcmUoZG9jLl9pZCwgbmV4dCk7XG4gIH1cbn07XG5cbkxvY2FsQ29sbGVjdGlvbi5fdXBkYXRlSW5SZXN1bHRzQXN5bmMgPSBhc3luYyAocXVlcnksIGRvYywgb2xkX2RvYykgPT4ge1xuICBpZiAoIUVKU09OLmVxdWFscyhkb2MuX2lkLCBvbGRfZG9jLl9pZCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhblxcJ3QgY2hhbmdlIGEgZG9jXFwncyBfaWQgd2hpbGUgdXBkYXRpbmcnKTtcbiAgfVxuXG4gIGNvbnN0IHByb2plY3Rpb25GbiA9IHF1ZXJ5LnByb2plY3Rpb25GbjtcbiAgY29uc3QgY2hhbmdlZEZpZWxkcyA9IERpZmZTZXF1ZW5jZS5tYWtlQ2hhbmdlZEZpZWxkcyhcbiAgICBwcm9qZWN0aW9uRm4oZG9jKSxcbiAgICBwcm9qZWN0aW9uRm4ob2xkX2RvYylcbiAgKTtcblxuICBpZiAoIXF1ZXJ5Lm9yZGVyZWQpIHtcbiAgICBpZiAoT2JqZWN0LmtleXMoY2hhbmdlZEZpZWxkcykubGVuZ3RoKSB7XG4gICAgICBhd2FpdCBxdWVyeS5jaGFuZ2VkKGRvYy5faWQsIGNoYW5nZWRGaWVsZHMpO1xuICAgICAgcXVlcnkucmVzdWx0cy5zZXQoZG9jLl9pZCwgZG9jKTtcbiAgICB9XG5cbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBvbGRfaWR4ID0gTG9jYWxDb2xsZWN0aW9uLl9maW5kSW5PcmRlcmVkUmVzdWx0cyhxdWVyeSwgZG9jKTtcblxuICBpZiAoT2JqZWN0LmtleXMoY2hhbmdlZEZpZWxkcykubGVuZ3RoKSB7XG4gICAgYXdhaXQgcXVlcnkuY2hhbmdlZChkb2MuX2lkLCBjaGFuZ2VkRmllbGRzKTtcbiAgfVxuXG4gIGlmICghcXVlcnkuc29ydGVyKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8ganVzdCB0YWtlIGl0IG91dCBhbmQgcHV0IGl0IGJhY2sgaW4gYWdhaW4sIGFuZCBzZWUgaWYgdGhlIGluZGV4IGNoYW5nZXNcbiAgcXVlcnkucmVzdWx0cy5zcGxpY2Uob2xkX2lkeCwgMSk7XG5cbiAgY29uc3QgbmV3X2lkeCA9IExvY2FsQ29sbGVjdGlvbi5faW5zZXJ0SW5Tb3J0ZWRMaXN0KFxuICAgIHF1ZXJ5LnNvcnRlci5nZXRDb21wYXJhdG9yKHtkaXN0YW5jZXM6IHF1ZXJ5LmRpc3RhbmNlc30pLFxuICAgIHF1ZXJ5LnJlc3VsdHMsXG4gICAgZG9jXG4gICk7XG5cbiAgaWYgKG9sZF9pZHggIT09IG5ld19pZHgpIHtcbiAgICBsZXQgbmV4dCA9IHF1ZXJ5LnJlc3VsdHNbbmV3X2lkeCArIDFdO1xuICAgIGlmIChuZXh0KSB7XG4gICAgICBuZXh0ID0gbmV4dC5faWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5leHQgPSBudWxsO1xuICAgIH1cblxuICAgIHF1ZXJ5Lm1vdmVkQmVmb3JlICYmIGF3YWl0IHF1ZXJ5Lm1vdmVkQmVmb3JlKGRvYy5faWQsIG5leHQpO1xuICB9XG59O1xuXG5jb25zdCBNT0RJRklFUlMgPSB7XG4gICRjdXJyZW50RGF0ZSh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBpZiAodHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgaGFzT3duLmNhbGwoYXJnLCAnJHR5cGUnKSkge1xuICAgICAgaWYgKGFyZy4kdHlwZSAhPT0gJ2RhdGUnKSB7XG4gICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAgICdNaW5pbW9uZ28gZG9lcyBjdXJyZW50bHkgb25seSBzdXBwb3J0IHRoZSBkYXRlIHR5cGUgaW4gJyArXG4gICAgICAgICAgJyRjdXJyZW50RGF0ZSBtb2RpZmllcnMnLFxuICAgICAgICAgIHtmaWVsZH1cbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGFyZyAhPT0gdHJ1ZSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJ0ludmFsaWQgJGN1cnJlbnREYXRlIG1vZGlmaWVyJywge2ZpZWxkfSk7XG4gICAgfVxuXG4gICAgdGFyZ2V0W2ZpZWxkXSA9IG5ldyBEYXRlKCk7XG4gIH0sXG4gICRpbmModGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgaWYgKHR5cGVvZiBhcmcgIT09ICdudW1iZXInKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignTW9kaWZpZXIgJGluYyBhbGxvd2VkIGZvciBudW1iZXJzIG9ubHknLCB7ZmllbGR9KTtcbiAgICB9XG5cbiAgICBpZiAoZmllbGQgaW4gdGFyZ2V0KSB7XG4gICAgICBpZiAodHlwZW9mIHRhcmdldFtmaWVsZF0gIT09ICdudW1iZXInKSB7XG4gICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAgICdDYW5ub3QgYXBwbHkgJGluYyBtb2RpZmllciB0byBub24tbnVtYmVyJyxcbiAgICAgICAgICB7ZmllbGR9XG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHRhcmdldFtmaWVsZF0gKz0gYXJnO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgIH1cbiAgfSxcbiAgJG1pbih0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBpZiAodHlwZW9mIGFyZyAhPT0gJ251bWJlcicpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdNb2RpZmllciAkbWluIGFsbG93ZWQgZm9yIG51bWJlcnMgb25seScsIHtmaWVsZH0pO1xuICAgIH1cblxuICAgIGlmIChmaWVsZCBpbiB0YXJnZXQpIHtcbiAgICAgIGlmICh0eXBlb2YgdGFyZ2V0W2ZpZWxkXSAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICAgJ0Nhbm5vdCBhcHBseSAkbWluIG1vZGlmaWVyIHRvIG5vbi1udW1iZXInLFxuICAgICAgICAgIHtmaWVsZH1cbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRhcmdldFtmaWVsZF0gPiBhcmcpIHtcbiAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IGFyZztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGFyZ2V0W2ZpZWxkXSA9IGFyZztcbiAgICB9XG4gIH0sXG4gICRtYXgodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgaWYgKHR5cGVvZiBhcmcgIT09ICdudW1iZXInKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignTW9kaWZpZXIgJG1heCBhbGxvd2VkIGZvciBudW1iZXJzIG9ubHknLCB7ZmllbGR9KTtcbiAgICB9XG5cbiAgICBpZiAoZmllbGQgaW4gdGFyZ2V0KSB7XG4gICAgICBpZiAodHlwZW9mIHRhcmdldFtmaWVsZF0gIT09ICdudW1iZXInKSB7XG4gICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAgICdDYW5ub3QgYXBwbHkgJG1heCBtb2RpZmllciB0byBub24tbnVtYmVyJyxcbiAgICAgICAgICB7ZmllbGR9XG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0YXJnZXRbZmllbGRdIDwgYXJnKSB7XG4gICAgICAgIHRhcmdldFtmaWVsZF0gPSBhcmc7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhcmdldFtmaWVsZF0gPSBhcmc7XG4gICAgfVxuICB9LFxuICAkbXVsKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGlmICh0eXBlb2YgYXJnICE9PSAnbnVtYmVyJykge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJ01vZGlmaWVyICRtdWwgYWxsb3dlZCBmb3IgbnVtYmVycyBvbmx5Jywge2ZpZWxkfSk7XG4gICAgfVxuXG4gICAgaWYgKGZpZWxkIGluIHRhcmdldCkge1xuICAgICAgaWYgKHR5cGVvZiB0YXJnZXRbZmllbGRdICE9PSAnbnVtYmVyJykge1xuICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgICAnQ2Fubm90IGFwcGx5ICRtdWwgbW9kaWZpZXIgdG8gbm9uLW51bWJlcicsXG4gICAgICAgICAge2ZpZWxkfVxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICB0YXJnZXRbZmllbGRdICo9IGFyZztcbiAgICB9IGVsc2Uge1xuICAgICAgdGFyZ2V0W2ZpZWxkXSA9IDA7XG4gICAgfVxuICB9LFxuICAkcmVuYW1lKHRhcmdldCwgZmllbGQsIGFyZywga2V5cGF0aCwgZG9jKSB7XG4gICAgLy8gbm8gaWRlYSB3aHkgbW9uZ28gaGFzIHRoaXMgcmVzdHJpY3Rpb24uLlxuICAgIGlmIChrZXlwYXRoID09PSBhcmcpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCckcmVuYW1lIHNvdXJjZSBtdXN0IGRpZmZlciBmcm9tIHRhcmdldCcsIHtmaWVsZH0pO1xuICAgIH1cblxuICAgIGlmICh0YXJnZXQgPT09IG51bGwpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCckcmVuYW1lIHNvdXJjZSBmaWVsZCBpbnZhbGlkJywge2ZpZWxkfSk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBhcmcgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignJHJlbmFtZSB0YXJnZXQgbXVzdCBiZSBhIHN0cmluZycsIHtmaWVsZH0pO1xuICAgIH1cblxuICAgIGlmIChhcmcuaW5jbHVkZXMoJ1xcMCcpKSB7XG4gICAgICAvLyBOdWxsIGJ5dGVzIGFyZSBub3QgYWxsb3dlZCBpbiBNb25nbyBmaWVsZCBuYW1lc1xuICAgICAgLy8gaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9yZWZlcmVuY2UvbGltaXRzLyNSZXN0cmljdGlvbnMtb24tRmllbGQtTmFtZXNcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAnVGhlIFxcJ3RvXFwnIGZpZWxkIGZvciAkcmVuYW1lIGNhbm5vdCBjb250YWluIGFuIGVtYmVkZGVkIG51bGwgYnl0ZScsXG4gICAgICAgIHtmaWVsZH1cbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgb2JqZWN0ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgIGRlbGV0ZSB0YXJnZXRbZmllbGRdO1xuXG4gICAgY29uc3Qga2V5cGFydHMgPSBhcmcuc3BsaXQoJy4nKTtcbiAgICBjb25zdCB0YXJnZXQyID0gZmluZE1vZFRhcmdldChkb2MsIGtleXBhcnRzLCB7Zm9yYmlkQXJyYXk6IHRydWV9KTtcblxuICAgIGlmICh0YXJnZXQyID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignJHJlbmFtZSB0YXJnZXQgZmllbGQgaW52YWxpZCcsIHtmaWVsZH0pO1xuICAgIH1cblxuICAgIHRhcmdldDJba2V5cGFydHMucG9wKCldID0gb2JqZWN0O1xuICB9LFxuICAkc2V0KHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGlmICh0YXJnZXQgIT09IE9iamVjdCh0YXJnZXQpKSB7IC8vIG5vdCBhbiBhcnJheSBvciBhbiBvYmplY3RcbiAgICAgIGNvbnN0IGVycm9yID0gTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICdDYW5ub3Qgc2V0IHByb3BlcnR5IG9uIG5vbi1vYmplY3QgZmllbGQnLFxuICAgICAgICB7ZmllbGR9XG4gICAgICApO1xuICAgICAgZXJyb3Iuc2V0UHJvcGVydHlFcnJvciA9IHRydWU7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG5cbiAgICBpZiAodGFyZ2V0ID09PSBudWxsKSB7XG4gICAgICBjb25zdCBlcnJvciA9IE1pbmltb25nb0Vycm9yKCdDYW5ub3Qgc2V0IHByb3BlcnR5IG9uIG51bGwnLCB7ZmllbGR9KTtcbiAgICAgIGVycm9yLnNldFByb3BlcnR5RXJyb3IgPSB0cnVlO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuXG4gICAgYXNzZXJ0SGFzVmFsaWRGaWVsZE5hbWVzKGFyZyk7XG5cbiAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICB9LFxuICAkc2V0T25JbnNlcnQodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgLy8gY29udmVydGVkIHRvIGAkc2V0YCBpbiBgX21vZGlmeWBcbiAgfSxcbiAgJHVuc2V0KHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGlmICh0YXJnZXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKHRhcmdldCBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGlmIChmaWVsZCBpbiB0YXJnZXQpIHtcbiAgICAgICAgICB0YXJnZXRbZmllbGRdID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVsZXRlIHRhcmdldFtmaWVsZF07XG4gICAgICB9XG4gICAgfVxuICB9LFxuICAkcHVzaCh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBpZiAodGFyZ2V0W2ZpZWxkXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0YXJnZXRbZmllbGRdID0gW107XG4gICAgfVxuXG4gICAgaWYgKCEodGFyZ2V0W2ZpZWxkXSBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJ0Nhbm5vdCBhcHBseSAkcHVzaCBtb2RpZmllciB0byBub24tYXJyYXknLCB7ZmllbGR9KTtcbiAgICB9XG5cbiAgICBpZiAoIShhcmcgJiYgYXJnLiRlYWNoKSkge1xuICAgICAgLy8gU2ltcGxlIG1vZGU6IG5vdCAkZWFjaFxuICAgICAgYXNzZXJ0SGFzVmFsaWRGaWVsZE5hbWVzKGFyZyk7XG5cbiAgICAgIHRhcmdldFtmaWVsZF0ucHVzaChhcmcpO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gRmFuY3kgbW9kZTogJGVhY2ggKGFuZCBtYXliZSAkc2xpY2UgYW5kICRzb3J0IGFuZCAkcG9zaXRpb24pXG4gICAgY29uc3QgdG9QdXNoID0gYXJnLiRlYWNoO1xuICAgIGlmICghKHRvUHVzaCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJyRlYWNoIG11c3QgYmUgYW4gYXJyYXknLCB7ZmllbGR9KTtcbiAgICB9XG5cbiAgICBhc3NlcnRIYXNWYWxpZEZpZWxkTmFtZXModG9QdXNoKTtcblxuICAgIC8vIFBhcnNlICRwb3NpdGlvblxuICAgIGxldCBwb3NpdGlvbiA9IHVuZGVmaW5lZDtcbiAgICBpZiAoJyRwb3NpdGlvbicgaW4gYXJnKSB7XG4gICAgICBpZiAodHlwZW9mIGFyZy4kcG9zaXRpb24gIT09ICdudW1iZXInKSB7XG4gICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCckcG9zaXRpb24gbXVzdCBiZSBhIG51bWVyaWMgdmFsdWUnLCB7ZmllbGR9KTtcbiAgICAgIH1cblxuICAgICAgLy8gWFhYIHNob3VsZCBjaGVjayB0byBtYWtlIHN1cmUgaW50ZWdlclxuICAgICAgaWYgKGFyZy4kcG9zaXRpb24gPCAwKSB7XG4gICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAgICckcG9zaXRpb24gaW4gJHB1c2ggbXVzdCBiZSB6ZXJvIG9yIHBvc2l0aXZlJyxcbiAgICAgICAgICB7ZmllbGR9XG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHBvc2l0aW9uID0gYXJnLiRwb3NpdGlvbjtcbiAgICB9XG5cbiAgICAvLyBQYXJzZSAkc2xpY2UuXG4gICAgbGV0IHNsaWNlID0gdW5kZWZpbmVkO1xuICAgIGlmICgnJHNsaWNlJyBpbiBhcmcpIHtcbiAgICAgIGlmICh0eXBlb2YgYXJnLiRzbGljZSAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJyRzbGljZSBtdXN0IGJlIGEgbnVtZXJpYyB2YWx1ZScsIHtmaWVsZH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBYWFggc2hvdWxkIGNoZWNrIHRvIG1ha2Ugc3VyZSBpbnRlZ2VyXG4gICAgICBzbGljZSA9IGFyZy4kc2xpY2U7XG4gICAgfVxuXG4gICAgLy8gUGFyc2UgJHNvcnQuXG4gICAgbGV0IHNvcnRGdW5jdGlvbiA9IHVuZGVmaW5lZDtcbiAgICBpZiAoYXJnLiRzb3J0KSB7XG4gICAgICBpZiAoc2xpY2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignJHNvcnQgcmVxdWlyZXMgJHNsaWNlIHRvIGJlIHByZXNlbnQnLCB7ZmllbGR9KTtcbiAgICAgIH1cblxuICAgICAgLy8gWFhYIHRoaXMgYWxsb3dzIHVzIHRvIHVzZSBhICRzb3J0IHdob3NlIHZhbHVlIGlzIGFuIGFycmF5LCBidXQgdGhhdCdzXG4gICAgICAvLyBhY3R1YWxseSBhbiBleHRlbnNpb24gb2YgdGhlIE5vZGUgZHJpdmVyLCBzbyBpdCB3b24ndCB3b3JrXG4gICAgICAvLyBzZXJ2ZXItc2lkZS4gQ291bGQgYmUgY29uZnVzaW5nIVxuICAgICAgLy8gWFhYIGlzIGl0IGNvcnJlY3QgdGhhdCB3ZSBkb24ndCBkbyBnZW8tc3R1ZmYgaGVyZT9cbiAgICAgIHNvcnRGdW5jdGlvbiA9IG5ldyBNaW5pbW9uZ28uU29ydGVyKGFyZy4kc29ydCkuZ2V0Q29tcGFyYXRvcigpO1xuXG4gICAgICB0b1B1c2guZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgaWYgKExvY2FsQ29sbGVjdGlvbi5fZi5fdHlwZShlbGVtZW50KSAhPT0gMykge1xuICAgICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAgICAgJyRwdXNoIGxpa2UgbW9kaWZpZXJzIHVzaW5nICRzb3J0IHJlcXVpcmUgYWxsIGVsZW1lbnRzIHRvIGJlICcgK1xuICAgICAgICAgICAgJ29iamVjdHMnLFxuICAgICAgICAgICAge2ZpZWxkfVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEFjdHVhbGx5IHB1c2guXG4gICAgaWYgKHBvc2l0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRvUHVzaC5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICB0YXJnZXRbZmllbGRdLnB1c2goZWxlbWVudCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc3BsaWNlQXJndW1lbnRzID0gW3Bvc2l0aW9uLCAwXTtcblxuICAgICAgdG9QdXNoLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgIHNwbGljZUFyZ3VtZW50cy5wdXNoKGVsZW1lbnQpO1xuICAgICAgfSk7XG5cbiAgICAgIHRhcmdldFtmaWVsZF0uc3BsaWNlKC4uLnNwbGljZUFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgLy8gQWN0dWFsbHkgc29ydC5cbiAgICBpZiAoc29ydEZ1bmN0aW9uKSB7XG4gICAgICB0YXJnZXRbZmllbGRdLnNvcnQoc29ydEZ1bmN0aW9uKTtcbiAgICB9XG5cbiAgICAvLyBBY3R1YWxseSBzbGljZS5cbiAgICBpZiAoc2xpY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKHNsaWNlID09PSAwKSB7XG4gICAgICAgIHRhcmdldFtmaWVsZF0gPSBbXTsgLy8gZGlmZmVycyBmcm9tIEFycmF5LnNsaWNlIVxuICAgICAgfSBlbHNlIGlmIChzbGljZSA8IDApIHtcbiAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IHRhcmdldFtmaWVsZF0uc2xpY2Uoc2xpY2UpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IHRhcmdldFtmaWVsZF0uc2xpY2UoMCwgc2xpY2UpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgJHB1c2hBbGwodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgaWYgKCEodHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignTW9kaWZpZXIgJHB1c2hBbGwvcHVsbEFsbCBhbGxvd2VkIGZvciBhcnJheXMgb25seScpO1xuICAgIH1cblxuICAgIGFzc2VydEhhc1ZhbGlkRmllbGROYW1lcyhhcmcpO1xuXG4gICAgY29uc3QgdG9QdXNoID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgIGlmICh0b1B1c2ggPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGFyZ2V0W2ZpZWxkXSA9IGFyZztcbiAgICB9IGVsc2UgaWYgKCEodG9QdXNoIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgJ0Nhbm5vdCBhcHBseSAkcHVzaEFsbCBtb2RpZmllciB0byBub24tYXJyYXknLFxuICAgICAgICB7ZmllbGR9XG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0b1B1c2gucHVzaCguLi5hcmcpO1xuICAgIH1cbiAgfSxcbiAgJGFkZFRvU2V0KHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGxldCBpc0VhY2ggPSBmYWxzZTtcblxuICAgIGlmICh0eXBlb2YgYXJnID09PSAnb2JqZWN0Jykge1xuICAgICAgLy8gY2hlY2sgaWYgZmlyc3Qga2V5IGlzICckZWFjaCdcbiAgICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhhcmcpO1xuICAgICAgaWYgKGtleXNbMF0gPT09ICckZWFjaCcpIHtcbiAgICAgICAgaXNFYWNoID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB2YWx1ZXMgPSBpc0VhY2ggPyBhcmcuJGVhY2ggOiBbYXJnXTtcblxuICAgIGFzc2VydEhhc1ZhbGlkRmllbGROYW1lcyh2YWx1ZXMpO1xuXG4gICAgY29uc3QgdG9BZGQgPSB0YXJnZXRbZmllbGRdO1xuICAgIGlmICh0b0FkZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0YXJnZXRbZmllbGRdID0gdmFsdWVzO1xuICAgIH0gZWxzZSBpZiAoISh0b0FkZCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICdDYW5ub3QgYXBwbHkgJGFkZFRvU2V0IG1vZGlmaWVyIHRvIG5vbi1hcnJheScsXG4gICAgICAgIHtmaWVsZH1cbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlcy5mb3JFYWNoKHZhbHVlID0+IHtcbiAgICAgICAgaWYgKHRvQWRkLnNvbWUoZWxlbWVudCA9PiBMb2NhbENvbGxlY3Rpb24uX2YuX2VxdWFsKHZhbHVlLCBlbGVtZW50KSkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0b0FkZC5wdXNoKHZhbHVlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcbiAgJHBvcCh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBpZiAodGFyZ2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB0b1BvcCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICBpZiAodG9Qb3AgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghKHRvUG9wIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignQ2Fubm90IGFwcGx5ICRwb3AgbW9kaWZpZXIgdG8gbm9uLWFycmF5Jywge2ZpZWxkfSk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBhcmcgPT09ICdudW1iZXInICYmIGFyZyA8IDApIHtcbiAgICAgIHRvUG9wLnNwbGljZSgwLCAxKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdG9Qb3AucG9wKCk7XG4gICAgfVxuICB9LFxuICAkcHVsbCh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBpZiAodGFyZ2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB0b1B1bGwgPSB0YXJnZXRbZmllbGRdO1xuICAgIGlmICh0b1B1bGwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghKHRvUHVsbCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICdDYW5ub3QgYXBwbHkgJHB1bGwvcHVsbEFsbCBtb2RpZmllciB0byBub24tYXJyYXknLFxuICAgICAgICB7ZmllbGR9XG4gICAgICApO1xuICAgIH1cblxuICAgIGxldCBvdXQ7XG4gICAgaWYgKGFyZyAhPSBudWxsICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmICEoYXJnIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAvLyBYWFggd291bGQgYmUgbXVjaCBuaWNlciB0byBjb21waWxlIHRoaXMgb25jZSwgcmF0aGVyIHRoYW5cbiAgICAgIC8vIGZvciBlYWNoIGRvY3VtZW50IHdlIG1vZGlmeS4uIGJ1dCB1c3VhbGx5IHdlJ3JlIG5vdFxuICAgICAgLy8gbW9kaWZ5aW5nIHRoYXQgbWFueSBkb2N1bWVudHMsIHNvIHdlJ2xsIGxldCBpdCBzbGlkZSBmb3JcbiAgICAgIC8vIG5vd1xuXG4gICAgICAvLyBYWFggTWluaW1vbmdvLk1hdGNoZXIgaXNuJ3QgdXAgZm9yIHRoZSBqb2IsIGJlY2F1c2Ugd2UgbmVlZFxuICAgICAgLy8gdG8gcGVybWl0IHN0dWZmIGxpa2UgeyRwdWxsOiB7YTogeyRndDogNH19fS4uIHNvbWV0aGluZ1xuICAgICAgLy8gbGlrZSB7JGd0OiA0fSBpcyBub3Qgbm9ybWFsbHkgYSBjb21wbGV0ZSBzZWxlY3Rvci5cbiAgICAgIC8vIHNhbWUgaXNzdWUgYXMgJGVsZW1NYXRjaCBwb3NzaWJseT9cbiAgICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgTWluaW1vbmdvLk1hdGNoZXIoYXJnKTtcblxuICAgICAgb3V0ID0gdG9QdWxsLmZpbHRlcihlbGVtZW50ID0+ICFtYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhlbGVtZW50KS5yZXN1bHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgPSB0b1B1bGwuZmlsdGVyKGVsZW1lbnQgPT4gIUxvY2FsQ29sbGVjdGlvbi5fZi5fZXF1YWwoZWxlbWVudCwgYXJnKSk7XG4gICAgfVxuXG4gICAgdGFyZ2V0W2ZpZWxkXSA9IG91dDtcbiAgfSxcbiAgJHB1bGxBbGwodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgaWYgKCEodHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgJ01vZGlmaWVyICRwdXNoQWxsL3B1bGxBbGwgYWxsb3dlZCBmb3IgYXJyYXlzIG9ubHknLFxuICAgICAgICB7ZmllbGR9XG4gICAgICApO1xuICAgIH1cblxuICAgIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHRvUHVsbCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICBpZiAodG9QdWxsID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoISh0b1B1bGwgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAnQ2Fubm90IGFwcGx5ICRwdWxsL3B1bGxBbGwgbW9kaWZpZXIgdG8gbm9uLWFycmF5JyxcbiAgICAgICAge2ZpZWxkfVxuICAgICAgKTtcbiAgICB9XG5cbiAgICB0YXJnZXRbZmllbGRdID0gdG9QdWxsLmZpbHRlcihvYmplY3QgPT5cbiAgICAgICFhcmcuc29tZShlbGVtZW50ID0+IExvY2FsQ29sbGVjdGlvbi5fZi5fZXF1YWwob2JqZWN0LCBlbGVtZW50KSlcbiAgICApO1xuICB9LFxuICAkYml0KHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIC8vIFhYWCBtb25nbyBvbmx5IHN1cHBvcnRzICRiaXQgb24gaW50ZWdlcnMsIGFuZCB3ZSBvbmx5IHN1cHBvcnRcbiAgICAvLyBuYXRpdmUgamF2YXNjcmlwdCBudW1iZXJzIChkb3VibGVzKSBzbyBmYXIsIHNvIHdlIGNhbid0IHN1cHBvcnQgJGJpdFxuICAgIHRocm93IE1pbmltb25nb0Vycm9yKCckYml0IGlzIG5vdCBzdXBwb3J0ZWQnLCB7ZmllbGR9KTtcbiAgfSxcbiAgJHYoKSB7XG4gICAgLy8gQXMgZGlzY3Vzc2VkIGluIGh0dHBzOi8vZ2l0aHViLmNvbS9tZXRlb3IvbWV0ZW9yL2lzc3Vlcy85NjIzLFxuICAgIC8vIHRoZSBgJHZgIG9wZXJhdG9yIGlzIG5vdCBuZWVkZWQgYnkgTWV0ZW9yLCBidXQgcHJvYmxlbXMgY2FuIG9jY3VyIGlmXG4gICAgLy8gaXQncyBub3QgYXQgbGVhc3QgY2FsbGFibGUgKGFzIG9mIE1vbmdvID49IDMuNikuIEl0J3MgZGVmaW5lZCBoZXJlIGFzXG4gICAgLy8gYSBuby1vcCB0byB3b3JrIGFyb3VuZCB0aGVzZSBwcm9ibGVtcy5cbiAgfVxufTtcblxuY29uc3QgTk9fQ1JFQVRFX01PRElGSUVSUyA9IHtcbiAgJHBvcDogdHJ1ZSxcbiAgJHB1bGw6IHRydWUsXG4gICRwdWxsQWxsOiB0cnVlLFxuICAkcmVuYW1lOiB0cnVlLFxuICAkdW5zZXQ6IHRydWVcbn07XG5cbi8vIE1ha2Ugc3VyZSBmaWVsZCBuYW1lcyBkbyBub3QgY29udGFpbiBNb25nbyByZXN0cmljdGVkXG4vLyBjaGFyYWN0ZXJzICgnLicsICckJywgJ1xcMCcpLlxuLy8gaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9yZWZlcmVuY2UvbGltaXRzLyNSZXN0cmljdGlvbnMtb24tRmllbGQtTmFtZXNcbmNvbnN0IGludmFsaWRDaGFyTXNnID0ge1xuICAkOiAnc3RhcnQgd2l0aCBcXCckXFwnJyxcbiAgJy4nOiAnY29udGFpbiBcXCcuXFwnJyxcbiAgJ1xcMCc6ICdjb250YWluIG51bGwgYnl0ZXMnXG59O1xuXG4vLyBjaGVja3MgaWYgYWxsIGZpZWxkIG5hbWVzIGluIGFuIG9iamVjdCBhcmUgdmFsaWRcbmZ1bmN0aW9uIGFzc2VydEhhc1ZhbGlkRmllbGROYW1lcyhkb2MpIHtcbiAgaWYgKGRvYyAmJiB0eXBlb2YgZG9jID09PSAnb2JqZWN0Jykge1xuICAgIEpTT04uc3RyaW5naWZ5KGRvYywgKGtleSwgdmFsdWUpID0+IHtcbiAgICAgIGFzc2VydElzVmFsaWRGaWVsZE5hbWUoa2V5KTtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhc3NlcnRJc1ZhbGlkRmllbGROYW1lKGtleSkge1xuICBsZXQgbWF0Y2g7XG4gIGlmICh0eXBlb2Yga2V5ID09PSAnc3RyaW5nJyAmJiAobWF0Y2ggPSBrZXkubWF0Y2goL15cXCR8XFwufFxcMC8pKSkge1xuICAgIHRocm93IE1pbmltb25nb0Vycm9yKGBLZXkgJHtrZXl9IG11c3Qgbm90ICR7aW52YWxpZENoYXJNc2dbbWF0Y2hbMF1dfWApO1xuICB9XG59XG5cbi8vIGZvciBhLmIuYy4yLmQuZSwga2V5cGFydHMgc2hvdWxkIGJlIFsnYScsICdiJywgJ2MnLCAnMicsICdkJywgJ2UnXSxcbi8vIGFuZCB0aGVuIHlvdSB3b3VsZCBvcGVyYXRlIG9uIHRoZSAnZScgcHJvcGVydHkgb2YgdGhlIHJldHVybmVkXG4vLyBvYmplY3QuXG4vL1xuLy8gaWYgb3B0aW9ucy5ub0NyZWF0ZSBpcyBmYWxzZXksIGNyZWF0ZXMgaW50ZXJtZWRpYXRlIGxldmVscyBvZlxuLy8gc3RydWN0dXJlIGFzIG5lY2Vzc2FyeSwgbGlrZSBta2RpciAtcCAoYW5kIHJhaXNlcyBhbiBleGNlcHRpb24gaWZcbi8vIHRoYXQgd291bGQgbWVhbiBnaXZpbmcgYSBub24tbnVtZXJpYyBwcm9wZXJ0eSB0byBhbiBhcnJheS4pIGlmXG4vLyBvcHRpb25zLm5vQ3JlYXRlIGlzIHRydWUsIHJldHVybiB1bmRlZmluZWQgaW5zdGVhZC5cbi8vXG4vLyBtYXkgbW9kaWZ5IHRoZSBsYXN0IGVsZW1lbnQgb2Yga2V5cGFydHMgdG8gc2lnbmFsIHRvIHRoZSBjYWxsZXIgdGhhdCBpdCBuZWVkc1xuLy8gdG8gdXNlIGEgZGlmZmVyZW50IHZhbHVlIHRvIGluZGV4IGludG8gdGhlIHJldHVybmVkIG9iamVjdCAoZm9yIGV4YW1wbGUsXG4vLyBbJ2EnLCAnMDEnXSAtPiBbJ2EnLCAxXSkuXG4vL1xuLy8gaWYgZm9yYmlkQXJyYXkgaXMgdHJ1ZSwgcmV0dXJuIG51bGwgaWYgdGhlIGtleXBhdGggZ29lcyB0aHJvdWdoIGFuIGFycmF5LlxuLy9cbi8vIGlmIG9wdGlvbnMuYXJyYXlJbmRpY2VzIGlzIHNldCwgdXNlIGl0cyBmaXJzdCBlbGVtZW50IGZvciB0aGUgKGZpcnN0KSAnJCcgaW5cbi8vIHRoZSBwYXRoLlxuZnVuY3Rpb24gZmluZE1vZFRhcmdldChkb2MsIGtleXBhcnRzLCBvcHRpb25zID0ge30pIHtcbiAgbGV0IHVzZWRBcnJheUluZGV4ID0gZmFsc2U7XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBrZXlwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGxhc3QgPSBpID09PSBrZXlwYXJ0cy5sZW5ndGggLSAxO1xuICAgIGxldCBrZXlwYXJ0ID0ga2V5cGFydHNbaV07XG5cbiAgICBpZiAoIWlzSW5kZXhhYmxlKGRvYykpIHtcbiAgICAgIGlmIChvcHRpb25zLm5vQ3JlYXRlKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGVycm9yID0gTWluaW1vbmdvRXJyb3IoXG4gICAgICAgIGBjYW5ub3QgdXNlIHRoZSBwYXJ0ICcke2tleXBhcnR9JyB0byB0cmF2ZXJzZSAke2RvY31gXG4gICAgICApO1xuICAgICAgZXJyb3Iuc2V0UHJvcGVydHlFcnJvciA9IHRydWU7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG5cbiAgICBpZiAoZG9jIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgIGlmIChvcHRpb25zLmZvcmJpZEFycmF5KSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBpZiAoa2V5cGFydCA9PT0gJyQnKSB7XG4gICAgICAgIGlmICh1c2VkQXJyYXlJbmRleCkge1xuICAgICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdUb28gbWFueSBwb3NpdGlvbmFsIChpLmUuIFxcJyRcXCcpIGVsZW1lbnRzJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW9wdGlvbnMuYXJyYXlJbmRpY2VzIHx8ICFvcHRpb25zLmFycmF5SW5kaWNlcy5sZW5ndGgpIHtcbiAgICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgICAgICdUaGUgcG9zaXRpb25hbCBvcGVyYXRvciBkaWQgbm90IGZpbmQgdGhlIG1hdGNoIG5lZWRlZCBmcm9tIHRoZSAnICtcbiAgICAgICAgICAgICdxdWVyeSdcbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAga2V5cGFydCA9IG9wdGlvbnMuYXJyYXlJbmRpY2VzWzBdO1xuICAgICAgICB1c2VkQXJyYXlJbmRleCA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGlzTnVtZXJpY0tleShrZXlwYXJ0KSkge1xuICAgICAgICBrZXlwYXJ0ID0gcGFyc2VJbnQoa2V5cGFydCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAob3B0aW9ucy5ub0NyZWF0ZSkge1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgICBgY2FuJ3QgYXBwZW5kIHRvIGFycmF5IHVzaW5nIHN0cmluZyBmaWVsZCBuYW1lIFske2tleXBhcnR9XWBcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGxhc3QpIHtcbiAgICAgICAga2V5cGFydHNbaV0gPSBrZXlwYXJ0OyAvLyBoYW5kbGUgJ2EuMDEnXG4gICAgICB9XG5cbiAgICAgIGlmIChvcHRpb25zLm5vQ3JlYXRlICYmIGtleXBhcnQgPj0gZG9jLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICB3aGlsZSAoZG9jLmxlbmd0aCA8IGtleXBhcnQpIHtcbiAgICAgICAgZG9jLnB1c2gobnVsbCk7XG4gICAgICB9XG5cbiAgICAgIGlmICghbGFzdCkge1xuICAgICAgICBpZiAoZG9jLmxlbmd0aCA9PT0ga2V5cGFydCkge1xuICAgICAgICAgIGRvYy5wdXNoKHt9KTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZG9jW2tleXBhcnRdICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAgICAgYGNhbid0IG1vZGlmeSBmaWVsZCAnJHtrZXlwYXJ0c1tpICsgMV19JyBvZiBsaXN0IHZhbHVlIGAgK1xuICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoZG9jW2tleXBhcnRdKVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgYXNzZXJ0SXNWYWxpZEZpZWxkTmFtZShrZXlwYXJ0KTtcblxuICAgICAgaWYgKCEoa2V5cGFydCBpbiBkb2MpKSB7XG4gICAgICAgIGlmIChvcHRpb25zLm5vQ3JlYXRlKSB7XG4gICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghbGFzdCkge1xuICAgICAgICAgIGRvY1trZXlwYXJ0XSA9IHt9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGxhc3QpIHtcbiAgICAgIHJldHVybiBkb2M7XG4gICAgfVxuXG4gICAgZG9jID0gZG9jW2tleXBhcnRdO1xuICB9XG5cbiAgLy8gbm90cmVhY2hlZFxufVxuIiwiaW1wb3J0IExvY2FsQ29sbGVjdGlvbiBmcm9tICcuL2xvY2FsX2NvbGxlY3Rpb24uanMnO1xuaW1wb3J0IHtcbiAgY29tcGlsZURvY3VtZW50U2VsZWN0b3IsXG4gIGhhc093bixcbiAgbm90aGluZ01hdGNoZXIsXG59IGZyb20gJy4vY29tbW9uLmpzJztcblxuY29uc3QgRGVjaW1hbCA9IFBhY2thZ2VbJ21vbmdvLWRlY2ltYWwnXT8uRGVjaW1hbCB8fCBjbGFzcyBEZWNpbWFsU3R1YiB7fVxuXG4vLyBUaGUgbWluaW1vbmdvIHNlbGVjdG9yIGNvbXBpbGVyIVxuXG4vLyBUZXJtaW5vbG9neTpcbi8vICAtIGEgJ3NlbGVjdG9yJyBpcyB0aGUgRUpTT04gb2JqZWN0IHJlcHJlc2VudGluZyBhIHNlbGVjdG9yXG4vLyAgLSBhICdtYXRjaGVyJyBpcyBpdHMgY29tcGlsZWQgZm9ybSAod2hldGhlciBhIGZ1bGwgTWluaW1vbmdvLk1hdGNoZXJcbi8vICAgIG9iamVjdCBvciBvbmUgb2YgdGhlIGNvbXBvbmVudCBsYW1iZGFzIHRoYXQgbWF0Y2hlcyBwYXJ0cyBvZiBpdClcbi8vICAtIGEgJ3Jlc3VsdCBvYmplY3QnIGlzIGFuIG9iamVjdCB3aXRoIGEgJ3Jlc3VsdCcgZmllbGQgYW5kIG1heWJlXG4vLyAgICBkaXN0YW5jZSBhbmQgYXJyYXlJbmRpY2VzLlxuLy8gIC0gYSAnYnJhbmNoZWQgdmFsdWUnIGlzIGFuIG9iamVjdCB3aXRoIGEgJ3ZhbHVlJyBmaWVsZCBhbmQgbWF5YmVcbi8vICAgICdkb250SXRlcmF0ZScgYW5kICdhcnJheUluZGljZXMnLlxuLy8gIC0gYSAnZG9jdW1lbnQnIGlzIGEgdG9wLWxldmVsIG9iamVjdCB0aGF0IGNhbiBiZSBzdG9yZWQgaW4gYSBjb2xsZWN0aW9uLlxuLy8gIC0gYSAnbG9va3VwIGZ1bmN0aW9uJyBpcyBhIGZ1bmN0aW9uIHRoYXQgdGFrZXMgaW4gYSBkb2N1bWVudCBhbmQgcmV0dXJuc1xuLy8gICAgYW4gYXJyYXkgb2YgJ2JyYW5jaGVkIHZhbHVlcycuXG4vLyAgLSBhICdicmFuY2hlZCBtYXRjaGVyJyBtYXBzIGZyb20gYW4gYXJyYXkgb2YgYnJhbmNoZWQgdmFsdWVzIHRvIGEgcmVzdWx0XG4vLyAgICBvYmplY3QuXG4vLyAgLSBhbiAnZWxlbWVudCBtYXRjaGVyJyBtYXBzIGZyb20gYSBzaW5nbGUgdmFsdWUgdG8gYSBib29sLlxuXG4vLyBNYWluIGVudHJ5IHBvaW50LlxuLy8gICB2YXIgbWF0Y2hlciA9IG5ldyBNaW5pbW9uZ28uTWF0Y2hlcih7YTogeyRndDogNX19KTtcbi8vICAgaWYgKG1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKHthOiA3fSkpIC4uLlxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWF0Y2hlciB7XG4gIGNvbnN0cnVjdG9yKHNlbGVjdG9yLCBpc1VwZGF0ZSkge1xuICAgIC8vIEEgc2V0IChvYmplY3QgbWFwcGluZyBzdHJpbmcgLT4gKikgb2YgYWxsIG9mIHRoZSBkb2N1bWVudCBwYXRocyBsb29rZWRcbiAgICAvLyBhdCBieSB0aGUgc2VsZWN0b3IuIEFsc28gaW5jbHVkZXMgdGhlIGVtcHR5IHN0cmluZyBpZiBpdCBtYXkgbG9vayBhdCBhbnlcbiAgICAvLyBwYXRoIChlZywgJHdoZXJlKS5cbiAgICB0aGlzLl9wYXRocyA9IHt9O1xuICAgIC8vIFNldCB0byB0cnVlIGlmIGNvbXBpbGF0aW9uIGZpbmRzIGEgJG5lYXIuXG4gICAgdGhpcy5faGFzR2VvUXVlcnkgPSBmYWxzZTtcbiAgICAvLyBTZXQgdG8gdHJ1ZSBpZiBjb21waWxhdGlvbiBmaW5kcyBhICR3aGVyZS5cbiAgICB0aGlzLl9oYXNXaGVyZSA9IGZhbHNlO1xuICAgIC8vIFNldCB0byBmYWxzZSBpZiBjb21waWxhdGlvbiBmaW5kcyBhbnl0aGluZyBvdGhlciB0aGFuIGEgc2ltcGxlIGVxdWFsaXR5XG4gICAgLy8gb3Igb25lIG9yIG1vcmUgb2YgJyRndCcsICckZ3RlJywgJyRsdCcsICckbHRlJywgJyRuZScsICckaW4nLCAnJG5pbicgdXNlZFxuICAgIC8vIHdpdGggc2NhbGFycyBhcyBvcGVyYW5kcy5cbiAgICB0aGlzLl9pc1NpbXBsZSA9IHRydWU7XG4gICAgLy8gU2V0IHRvIGEgZHVtbXkgZG9jdW1lbnQgd2hpY2ggYWx3YXlzIG1hdGNoZXMgdGhpcyBNYXRjaGVyLiBPciBzZXQgdG8gbnVsbFxuICAgIC8vIGlmIHN1Y2ggZG9jdW1lbnQgaXMgdG9vIGhhcmQgdG8gZmluZC5cbiAgICB0aGlzLl9tYXRjaGluZ0RvY3VtZW50ID0gdW5kZWZpbmVkO1xuICAgIC8vIEEgY2xvbmUgb2YgdGhlIG9yaWdpbmFsIHNlbGVjdG9yLiBJdCBtYXkganVzdCBiZSBhIGZ1bmN0aW9uIGlmIHRoZSB1c2VyXG4gICAgLy8gcGFzc2VkIGluIGEgZnVuY3Rpb247IG90aGVyd2lzZSBpcyBkZWZpbml0ZWx5IGFuIG9iamVjdCAoZWcsIElEcyBhcmVcbiAgICAvLyB0cmFuc2xhdGVkIGludG8ge19pZDogSUR9IGZpcnN0LiBVc2VkIGJ5IGNhbkJlY29tZVRydWVCeU1vZGlmaWVyIGFuZFxuICAgIC8vIFNvcnRlci5fdXNlV2l0aE1hdGNoZXIuXG4gICAgdGhpcy5fc2VsZWN0b3IgPSBudWxsO1xuICAgIHRoaXMuX2RvY01hdGNoZXIgPSB0aGlzLl9jb21waWxlU2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgIC8vIFNldCB0byB0cnVlIGlmIHNlbGVjdGlvbiBpcyBkb25lIGZvciBhbiB1cGRhdGUgb3BlcmF0aW9uXG4gICAgLy8gRGVmYXVsdCBpcyBmYWxzZVxuICAgIC8vIFVzZWQgZm9yICRuZWFyIGFycmF5IHVwZGF0ZSAoaXNzdWUgIzM1OTkpXG4gICAgdGhpcy5faXNVcGRhdGUgPSBpc1VwZGF0ZTtcbiAgfVxuXG4gIGRvY3VtZW50TWF0Y2hlcyhkb2MpIHtcbiAgICBpZiAoZG9jICE9PSBPYmplY3QoZG9jKSkge1xuICAgICAgdGhyb3cgRXJyb3IoJ2RvY3VtZW50TWF0Y2hlcyBuZWVkcyBhIGRvY3VtZW50Jyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX2RvY01hdGNoZXIoZG9jKTtcbiAgfVxuXG4gIGhhc0dlb1F1ZXJ5KCkge1xuICAgIHJldHVybiB0aGlzLl9oYXNHZW9RdWVyeTtcbiAgfVxuXG4gIGhhc1doZXJlKCkge1xuICAgIHJldHVybiB0aGlzLl9oYXNXaGVyZTtcbiAgfVxuXG4gIGlzU2ltcGxlKCkge1xuICAgIHJldHVybiB0aGlzLl9pc1NpbXBsZTtcbiAgfVxuXG4gIC8vIEdpdmVuIGEgc2VsZWN0b3IsIHJldHVybiBhIGZ1bmN0aW9uIHRoYXQgdGFrZXMgb25lIGFyZ3VtZW50LCBhXG4gIC8vIGRvY3VtZW50LiBJdCByZXR1cm5zIGEgcmVzdWx0IG9iamVjdC5cbiAgX2NvbXBpbGVTZWxlY3RvcihzZWxlY3Rvcikge1xuICAgIC8vIHlvdSBjYW4gcGFzcyBhIGxpdGVyYWwgZnVuY3Rpb24gaW5zdGVhZCBvZiBhIHNlbGVjdG9yXG4gICAgaWYgKHNlbGVjdG9yIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgIHRoaXMuX2lzU2ltcGxlID0gZmFsc2U7XG4gICAgICB0aGlzLl9zZWxlY3RvciA9IHNlbGVjdG9yO1xuICAgICAgdGhpcy5fcmVjb3JkUGF0aFVzZWQoJycpO1xuXG4gICAgICByZXR1cm4gZG9jID0+ICh7cmVzdWx0OiAhIXNlbGVjdG9yLmNhbGwoZG9jKX0pO1xuICAgIH1cblxuICAgIC8vIHNob3J0aGFuZCAtLSBzY2FsYXIgX2lkXG4gICAgaWYgKExvY2FsQ29sbGVjdGlvbi5fc2VsZWN0b3JJc0lkKHNlbGVjdG9yKSkge1xuICAgICAgdGhpcy5fc2VsZWN0b3IgPSB7X2lkOiBzZWxlY3Rvcn07XG4gICAgICB0aGlzLl9yZWNvcmRQYXRoVXNlZCgnX2lkJyk7XG5cbiAgICAgIHJldHVybiBkb2MgPT4gKHtyZXN1bHQ6IEVKU09OLmVxdWFscyhkb2MuX2lkLCBzZWxlY3Rvcil9KTtcbiAgICB9XG5cbiAgICAvLyBwcm90ZWN0IGFnYWluc3QgZGFuZ2Vyb3VzIHNlbGVjdG9ycy4gIGZhbHNleSBhbmQge19pZDogZmFsc2V5fSBhcmUgYm90aFxuICAgIC8vIGxpa2VseSBwcm9ncmFtbWVyIGVycm9yLCBhbmQgbm90IHdoYXQgeW91IHdhbnQsIHBhcnRpY3VsYXJseSBmb3JcbiAgICAvLyBkZXN0cnVjdGl2ZSBvcGVyYXRpb25zLlxuICAgIGlmICghc2VsZWN0b3IgfHwgaGFzT3duLmNhbGwoc2VsZWN0b3IsICdfaWQnKSAmJiAhc2VsZWN0b3IuX2lkKSB7XG4gICAgICB0aGlzLl9pc1NpbXBsZSA9IGZhbHNlO1xuICAgICAgcmV0dXJuIG5vdGhpbmdNYXRjaGVyO1xuICAgIH1cblxuICAgIC8vIFRvcCBsZXZlbCBjYW4ndCBiZSBhbiBhcnJheSBvciB0cnVlIG9yIGJpbmFyeS5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShzZWxlY3RvcikgfHxcbiAgICAgICAgRUpTT04uaXNCaW5hcnkoc2VsZWN0b3IpIHx8XG4gICAgICAgIHR5cGVvZiBzZWxlY3RvciA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgc2VsZWN0b3I6ICR7c2VsZWN0b3J9YCk7XG4gICAgfVxuXG4gICAgdGhpcy5fc2VsZWN0b3IgPSBFSlNPTi5jbG9uZShzZWxlY3Rvcik7XG5cbiAgICByZXR1cm4gY29tcGlsZURvY3VtZW50U2VsZWN0b3Ioc2VsZWN0b3IsIHRoaXMsIHtpc1Jvb3Q6IHRydWV9KTtcbiAgfVxuXG4gIC8vIFJldHVybnMgYSBsaXN0IG9mIGtleSBwYXRocyB0aGUgZ2l2ZW4gc2VsZWN0b3IgaXMgbG9va2luZyBmb3IuIEl0IGluY2x1ZGVzXG4gIC8vIHRoZSBlbXB0eSBzdHJpbmcgaWYgdGhlcmUgaXMgYSAkd2hlcmUuXG4gIF9nZXRQYXRocygpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fcGF0aHMpO1xuICB9XG5cbiAgX3JlY29yZFBhdGhVc2VkKHBhdGgpIHtcbiAgICB0aGlzLl9wYXRoc1twYXRoXSA9IHRydWU7XG4gIH1cbn1cblxuLy8gaGVscGVycyB1c2VkIGJ5IGNvbXBpbGVkIHNlbGVjdG9yIGNvZGVcbkxvY2FsQ29sbGVjdGlvbi5fZiA9IHtcbiAgLy8gWFhYIGZvciBfYWxsIGFuZCBfaW4sIGNvbnNpZGVyIGJ1aWxkaW5nICdpbnF1ZXJ5JyBhdCBjb21waWxlIHRpbWUuLlxuICBfdHlwZSh2KSB7XG4gICAgaWYgKHR5cGVvZiB2ID09PSAnbnVtYmVyJykge1xuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB2ID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIDI7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB2ID09PSAnYm9vbGVhbicpIHtcbiAgICAgIHJldHVybiA4O1xuICAgIH1cblxuICAgIGlmIChBcnJheS5pc0FycmF5KHYpKSB7XG4gICAgICByZXR1cm4gNDtcbiAgICB9XG5cbiAgICBpZiAodiA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIDEwO1xuICAgIH1cblxuICAgIC8vIG5vdGUgdGhhdCB0eXBlb2YoL3gvKSA9PT0gXCJvYmplY3RcIlxuICAgIGlmICh2IGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICByZXR1cm4gMTE7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB2ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gMTM7XG4gICAgfVxuXG4gICAgaWYgKHYgaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgICByZXR1cm4gOTtcbiAgICB9XG5cbiAgICBpZiAoRUpTT04uaXNCaW5hcnkodikpIHtcbiAgICAgIHJldHVybiA1O1xuICAgIH1cblxuICAgIGlmICh2IGluc3RhbmNlb2YgTW9uZ29JRC5PYmplY3RJRCkge1xuICAgICAgcmV0dXJuIDc7XG4gICAgfVxuXG4gICAgaWYgKHYgaW5zdGFuY2VvZiBEZWNpbWFsKSB7XG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICAvLyBvYmplY3RcbiAgICByZXR1cm4gMztcblxuICAgIC8vIFhYWCBzdXBwb3J0IHNvbWUvYWxsIG9mIHRoZXNlOlxuICAgIC8vIDE0LCBzeW1ib2xcbiAgICAvLyAxNSwgamF2YXNjcmlwdCBjb2RlIHdpdGggc2NvcGVcbiAgICAvLyAxNiwgMTg6IDMyLWJpdC82NC1iaXQgaW50ZWdlclxuICAgIC8vIDE3LCB0aW1lc3RhbXBcbiAgICAvLyAyNTUsIG1pbmtleVxuICAgIC8vIDEyNywgbWF4a2V5XG4gIH0sXG5cbiAgLy8gZGVlcCBlcXVhbGl0eSB0ZXN0OiB1c2UgZm9yIGxpdGVyYWwgZG9jdW1lbnQgYW5kIGFycmF5IG1hdGNoZXNcbiAgX2VxdWFsKGEsIGIpIHtcbiAgICByZXR1cm4gRUpTT04uZXF1YWxzKGEsIGIsIHtrZXlPcmRlclNlbnNpdGl2ZTogdHJ1ZX0pO1xuICB9LFxuXG4gIC8vIG1hcHMgYSB0eXBlIGNvZGUgdG8gYSB2YWx1ZSB0aGF0IGNhbiBiZSB1c2VkIHRvIHNvcnQgdmFsdWVzIG9mIGRpZmZlcmVudFxuICAvLyB0eXBlc1xuICBfdHlwZW9yZGVyKHQpIHtcbiAgICAvLyBodHRwOi8vd3d3Lm1vbmdvZGIub3JnL2Rpc3BsYXkvRE9DUy9XaGF0K2lzK3RoZStDb21wYXJlK09yZGVyK2ZvcitCU09OK1R5cGVzXG4gICAgLy8gWFhYIHdoYXQgaXMgdGhlIGNvcnJlY3Qgc29ydCBwb3NpdGlvbiBmb3IgSmF2YXNjcmlwdCBjb2RlP1xuICAgIC8vICgnMTAwJyBpbiB0aGUgbWF0cml4IGJlbG93KVxuICAgIC8vIFhYWCBtaW5rZXkvbWF4a2V5XG4gICAgcmV0dXJuIFtcbiAgICAgIC0xLCAgLy8gKG5vdCBhIHR5cGUpXG4gICAgICAxLCAgIC8vIG51bWJlclxuICAgICAgMiwgICAvLyBzdHJpbmdcbiAgICAgIDMsICAgLy8gb2JqZWN0XG4gICAgICA0LCAgIC8vIGFycmF5XG4gICAgICA1LCAgIC8vIGJpbmFyeVxuICAgICAgLTEsICAvLyBkZXByZWNhdGVkXG4gICAgICA2LCAgIC8vIE9iamVjdElEXG4gICAgICA3LCAgIC8vIGJvb2xcbiAgICAgIDgsICAgLy8gRGF0ZVxuICAgICAgMCwgICAvLyBudWxsXG4gICAgICA5LCAgIC8vIFJlZ0V4cFxuICAgICAgLTEsICAvLyBkZXByZWNhdGVkXG4gICAgICAxMDAsIC8vIEpTIGNvZGVcbiAgICAgIDIsICAgLy8gZGVwcmVjYXRlZCAoc3ltYm9sKVxuICAgICAgMTAwLCAvLyBKUyBjb2RlXG4gICAgICAxLCAgIC8vIDMyLWJpdCBpbnRcbiAgICAgIDgsICAgLy8gTW9uZ28gdGltZXN0YW1wXG4gICAgICAxICAgIC8vIDY0LWJpdCBpbnRcbiAgICBdW3RdO1xuICB9LFxuXG4gIC8vIGNvbXBhcmUgdHdvIHZhbHVlcyBvZiB1bmtub3duIHR5cGUgYWNjb3JkaW5nIHRvIEJTT04gb3JkZXJpbmdcbiAgLy8gc2VtYW50aWNzLiAoYXMgYW4gZXh0ZW5zaW9uLCBjb25zaWRlciAndW5kZWZpbmVkJyB0byBiZSBsZXNzIHRoYW5cbiAgLy8gYW55IG90aGVyIHZhbHVlLikgcmV0dXJuIG5lZ2F0aXZlIGlmIGEgaXMgbGVzcywgcG9zaXRpdmUgaWYgYiBpc1xuICAvLyBsZXNzLCBvciAwIGlmIGVxdWFsXG4gIF9jbXAoYSwgYikge1xuICAgIGlmIChhID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBiID09PSB1bmRlZmluZWQgPyAwIDogLTE7XG4gICAgfVxuXG4gICAgaWYgKGIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgbGV0IHRhID0gTG9jYWxDb2xsZWN0aW9uLl9mLl90eXBlKGEpO1xuICAgIGxldCB0YiA9IExvY2FsQ29sbGVjdGlvbi5fZi5fdHlwZShiKTtcblxuICAgIGNvbnN0IG9hID0gTG9jYWxDb2xsZWN0aW9uLl9mLl90eXBlb3JkZXIodGEpO1xuICAgIGNvbnN0IG9iID0gTG9jYWxDb2xsZWN0aW9uLl9mLl90eXBlb3JkZXIodGIpO1xuXG4gICAgaWYgKG9hICE9PSBvYikge1xuICAgICAgcmV0dXJuIG9hIDwgb2IgPyAtMSA6IDE7XG4gICAgfVxuXG4gICAgLy8gWFhYIG5lZWQgdG8gaW1wbGVtZW50IHRoaXMgaWYgd2UgaW1wbGVtZW50IFN5bWJvbCBvciBpbnRlZ2Vycywgb3JcbiAgICAvLyBUaW1lc3RhbXBcbiAgICBpZiAodGEgIT09IHRiKSB7XG4gICAgICB0aHJvdyBFcnJvcignTWlzc2luZyB0eXBlIGNvZXJjaW9uIGxvZ2ljIGluIF9jbXAnKTtcbiAgICB9XG5cbiAgICBpZiAodGEgPT09IDcpIHsgLy8gT2JqZWN0SURcbiAgICAgIC8vIENvbnZlcnQgdG8gc3RyaW5nLlxuICAgICAgdGEgPSB0YiA9IDI7XG4gICAgICBhID0gYS50b0hleFN0cmluZygpO1xuICAgICAgYiA9IGIudG9IZXhTdHJpbmcoKTtcbiAgICB9XG5cbiAgICBpZiAodGEgPT09IDkpIHsgLy8gRGF0ZVxuICAgICAgLy8gQ29udmVydCB0byBtaWxsaXMuXG4gICAgICB0YSA9IHRiID0gMTtcbiAgICAgIGEgPSBpc05hTihhKSA/IDAgOiBhLmdldFRpbWUoKTtcbiAgICAgIGIgPSBpc05hTihiKSA/IDAgOiBiLmdldFRpbWUoKTtcbiAgICB9XG5cbiAgICBpZiAodGEgPT09IDEpIHsgLy8gZG91YmxlXG4gICAgICBpZiAoYSBpbnN0YW5jZW9mIERlY2ltYWwpIHtcbiAgICAgICAgcmV0dXJuIGEubWludXMoYikudG9OdW1iZXIoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBhIC0gYjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGIgPT09IDIpIC8vIHN0cmluZ1xuICAgICAgcmV0dXJuIGEgPCBiID8gLTEgOiBhID09PSBiID8gMCA6IDE7XG5cbiAgICBpZiAodGEgPT09IDMpIHsgLy8gT2JqZWN0XG4gICAgICAvLyB0aGlzIGNvdWxkIGJlIG11Y2ggbW9yZSBlZmZpY2llbnQgaW4gdGhlIGV4cGVjdGVkIGNhc2UgLi4uXG4gICAgICBjb25zdCB0b0FycmF5ID0gb2JqZWN0ID0+IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gW107XG5cbiAgICAgICAgT2JqZWN0LmtleXMob2JqZWN0KS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgcmVzdWx0LnB1c2goa2V5LCBvYmplY3Rba2V5XSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gTG9jYWxDb2xsZWN0aW9uLl9mLl9jbXAodG9BcnJheShhKSwgdG9BcnJheShiKSk7XG4gICAgfVxuXG4gICAgaWYgKHRhID09PSA0KSB7IC8vIEFycmF5XG4gICAgICBmb3IgKGxldCBpID0gMDsgOyBpKyspIHtcbiAgICAgICAgaWYgKGkgPT09IGEubGVuZ3RoKSB7XG4gICAgICAgICAgcmV0dXJuIGkgPT09IGIubGVuZ3RoID8gMCA6IC0xO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGkgPT09IGIubGVuZ3RoKSB7XG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzID0gTG9jYWxDb2xsZWN0aW9uLl9mLl9jbXAoYVtpXSwgYltpXSk7XG4gICAgICAgIGlmIChzICE9PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIHM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGEgPT09IDUpIHsgLy8gYmluYXJ5XG4gICAgICAvLyBTdXJwcmlzaW5nbHksIGEgc21hbGwgYmluYXJ5IGJsb2IgaXMgYWx3YXlzIGxlc3MgdGhhbiBhIGxhcmdlIG9uZSBpblxuICAgICAgLy8gTW9uZ28uXG4gICAgICBpZiAoYS5sZW5ndGggIT09IGIubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBhLmxlbmd0aCAtIGIubGVuZ3RoO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGFbaV0gPCBiW2ldKSB7XG4gICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGFbaV0gPiBiW2ldKSB7XG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgaWYgKHRhID09PSA4KSB7IC8vIGJvb2xlYW5cbiAgICAgIGlmIChhKSB7XG4gICAgICAgIHJldHVybiBiID8gMCA6IDE7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBiID8gLTEgOiAwO1xuICAgIH1cblxuICAgIGlmICh0YSA9PT0gMTApIC8vIG51bGxcbiAgICAgIHJldHVybiAwO1xuXG4gICAgaWYgKHRhID09PSAxMSkgLy8gcmVnZXhwXG4gICAgICB0aHJvdyBFcnJvcignU29ydGluZyBub3Qgc3VwcG9ydGVkIG9uIHJlZ3VsYXIgZXhwcmVzc2lvbicpOyAvLyBYWFhcblxuICAgIC8vIDEzOiBqYXZhc2NyaXB0IGNvZGVcbiAgICAvLyAxNDogc3ltYm9sXG4gICAgLy8gMTU6IGphdmFzY3JpcHQgY29kZSB3aXRoIHNjb3BlXG4gICAgLy8gMTY6IDMyLWJpdCBpbnRlZ2VyXG4gICAgLy8gMTc6IHRpbWVzdGFtcFxuICAgIC8vIDE4OiA2NC1iaXQgaW50ZWdlclxuICAgIC8vIDI1NTogbWlua2V5XG4gICAgLy8gMTI3OiBtYXhrZXlcbiAgICBpZiAodGEgPT09IDEzKSAvLyBqYXZhc2NyaXB0IGNvZGVcbiAgICAgIHRocm93IEVycm9yKCdTb3J0aW5nIG5vdCBzdXBwb3J0ZWQgb24gSmF2YXNjcmlwdCBjb2RlJyk7IC8vIFhYWFxuXG4gICAgdGhyb3cgRXJyb3IoJ1Vua25vd24gdHlwZSB0byBzb3J0Jyk7XG4gIH0sXG59O1xuIiwiaW1wb3J0IExvY2FsQ29sbGVjdGlvbl8gZnJvbSAnLi9sb2NhbF9jb2xsZWN0aW9uLmpzJztcbmltcG9ydCBNYXRjaGVyIGZyb20gJy4vbWF0Y2hlci5qcyc7XG5pbXBvcnQgU29ydGVyIGZyb20gJy4vc29ydGVyLmpzJztcblxuTG9jYWxDb2xsZWN0aW9uID0gTG9jYWxDb2xsZWN0aW9uXztcbk1pbmltb25nbyA9IHtcbiAgICBMb2NhbENvbGxlY3Rpb246IExvY2FsQ29sbGVjdGlvbl8sXG4gICAgTWF0Y2hlcixcbiAgICBTb3J0ZXJcbn07XG4iLCIvLyBPYnNlcnZlSGFuZGxlOiB0aGUgcmV0dXJuIHZhbHVlIG9mIGEgbGl2ZSBxdWVyeS5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE9ic2VydmVIYW5kbGUge31cbiIsImltcG9ydCB7XG4gIEVMRU1FTlRfT1BFUkFUT1JTLFxuICBlcXVhbGl0eUVsZW1lbnRNYXRjaGVyLFxuICBleHBhbmRBcnJheXNJbkJyYW5jaGVzLFxuICBoYXNPd24sXG4gIGlzT3BlcmF0b3JPYmplY3QsXG4gIG1ha2VMb29rdXBGdW5jdGlvbixcbiAgcmVnZXhwRWxlbWVudE1hdGNoZXIsXG59IGZyb20gJy4vY29tbW9uLmpzJztcblxuLy8gR2l2ZSBhIHNvcnQgc3BlYywgd2hpY2ggY2FuIGJlIGluIGFueSBvZiB0aGVzZSBmb3Jtczpcbi8vICAge1wia2V5MVwiOiAxLCBcImtleTJcIjogLTF9XG4vLyAgIFtbXCJrZXkxXCIsIFwiYXNjXCJdLCBbXCJrZXkyXCIsIFwiZGVzY1wiXV1cbi8vICAgW1wia2V5MVwiLCBbXCJrZXkyXCIsIFwiZGVzY1wiXV1cbi8vXG4vLyAoLi4gd2l0aCB0aGUgZmlyc3QgZm9ybSBiZWluZyBkZXBlbmRlbnQgb24gdGhlIGtleSBlbnVtZXJhdGlvblxuLy8gYmVoYXZpb3Igb2YgeW91ciBqYXZhc2NyaXB0IFZNLCB3aGljaCB1c3VhbGx5IGRvZXMgd2hhdCB5b3UgbWVhbiBpblxuLy8gdGhpcyBjYXNlIGlmIHRoZSBrZXkgbmFtZXMgZG9uJ3QgbG9vayBsaWtlIGludGVnZXJzIC4uKVxuLy9cbi8vIHJldHVybiBhIGZ1bmN0aW9uIHRoYXQgdGFrZXMgdHdvIG9iamVjdHMsIGFuZCByZXR1cm5zIC0xIGlmIHRoZVxuLy8gZmlyc3Qgb2JqZWN0IGNvbWVzIGZpcnN0IGluIG9yZGVyLCAxIGlmIHRoZSBzZWNvbmQgb2JqZWN0IGNvbWVzXG4vLyBmaXJzdCwgb3IgMCBpZiBuZWl0aGVyIG9iamVjdCBjb21lcyBiZWZvcmUgdGhlIG90aGVyLlxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTb3J0ZXIge1xuICBjb25zdHJ1Y3RvcihzcGVjKSB7XG4gICAgdGhpcy5fc29ydFNwZWNQYXJ0cyA9IFtdO1xuICAgIHRoaXMuX3NvcnRGdW5jdGlvbiA9IG51bGw7XG5cbiAgICBjb25zdCBhZGRTcGVjUGFydCA9IChwYXRoLCBhc2NlbmRpbmcpID0+IHtcbiAgICAgIGlmICghcGF0aCkge1xuICAgICAgICB0aHJvdyBFcnJvcignc29ydCBrZXlzIG11c3QgYmUgbm9uLWVtcHR5Jyk7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXRoLmNoYXJBdCgwKSA9PT0gJyQnKSB7XG4gICAgICAgIHRocm93IEVycm9yKGB1bnN1cHBvcnRlZCBzb3J0IGtleTogJHtwYXRofWApO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9zb3J0U3BlY1BhcnRzLnB1c2goe1xuICAgICAgICBhc2NlbmRpbmcsXG4gICAgICAgIGxvb2t1cDogbWFrZUxvb2t1cEZ1bmN0aW9uKHBhdGgsIHtmb3JTb3J0OiB0cnVlfSksXG4gICAgICAgIHBhdGhcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBpZiAoc3BlYyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICBzcGVjLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgZWxlbWVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBhZGRTcGVjUGFydChlbGVtZW50LCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhZGRTcGVjUGFydChlbGVtZW50WzBdLCBlbGVtZW50WzFdICE9PSAnZGVzYycpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBzcGVjID09PSAnb2JqZWN0Jykge1xuICAgICAgT2JqZWN0LmtleXMoc3BlYykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICBhZGRTcGVjUGFydChrZXksIHNwZWNba2V5XSA+PSAwKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHNwZWMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuX3NvcnRGdW5jdGlvbiA9IHNwZWM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IEVycm9yKGBCYWQgc29ydCBzcGVjaWZpY2F0aW9uOiAke0pTT04uc3RyaW5naWZ5KHNwZWMpfWApO1xuICAgIH1cblxuICAgIC8vIElmIGEgZnVuY3Rpb24gaXMgc3BlY2lmaWVkIGZvciBzb3J0aW5nLCB3ZSBza2lwIHRoZSByZXN0LlxuICAgIGlmICh0aGlzLl9zb3J0RnVuY3Rpb24pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBUbyBpbXBsZW1lbnQgYWZmZWN0ZWRCeU1vZGlmaWVyLCB3ZSBwaWdneS1iYWNrIG9uIHRvcCBvZiBNYXRjaGVyJ3NcbiAgICAvLyBhZmZlY3RlZEJ5TW9kaWZpZXIgY29kZTsgd2UgY3JlYXRlIGEgc2VsZWN0b3IgdGhhdCBpcyBhZmZlY3RlZCBieSB0aGVcbiAgICAvLyBzYW1lIG1vZGlmaWVycyBhcyB0aGlzIHNvcnQgb3JkZXIuIFRoaXMgaXMgb25seSBpbXBsZW1lbnRlZCBvbiB0aGVcbiAgICAvLyBzZXJ2ZXIuXG4gICAgaWYgKHRoaXMuYWZmZWN0ZWRCeU1vZGlmaWVyKSB7XG4gICAgICBjb25zdCBzZWxlY3RvciA9IHt9O1xuXG4gICAgICB0aGlzLl9zb3J0U3BlY1BhcnRzLmZvckVhY2goc3BlYyA9PiB7XG4gICAgICAgIHNlbGVjdG9yW3NwZWMucGF0aF0gPSAxO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuX3NlbGVjdG9yRm9yQWZmZWN0ZWRCeU1vZGlmaWVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKHNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICB0aGlzLl9rZXlDb21wYXJhdG9yID0gY29tcG9zZUNvbXBhcmF0b3JzKFxuICAgICAgdGhpcy5fc29ydFNwZWNQYXJ0cy5tYXAoKHNwZWMsIGkpID0+IHRoaXMuX2tleUZpZWxkQ29tcGFyYXRvcihpKSlcbiAgICApO1xuICB9XG5cbiAgZ2V0Q29tcGFyYXRvcihvcHRpb25zKSB7XG4gICAgLy8gSWYgc29ydCBpcyBzcGVjaWZpZWQgb3IgaGF2ZSBubyBkaXN0YW5jZXMsIGp1c3QgdXNlIHRoZSBjb21wYXJhdG9yIGZyb21cbiAgICAvLyB0aGUgc291cmNlIHNwZWNpZmljYXRpb24gKHdoaWNoIGRlZmF1bHRzIHRvIFwiZXZlcnl0aGluZyBpcyBlcXVhbFwiLlxuICAgIC8vIGlzc3VlICMzNTk5XG4gICAgLy8gaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9yZWZlcmVuY2Uvb3BlcmF0b3IvcXVlcnkvbmVhci8jc29ydC1vcGVyYXRpb25cbiAgICAvLyBzb3J0IGVmZmVjdGl2ZWx5IG92ZXJyaWRlcyAkbmVhclxuICAgIGlmICh0aGlzLl9zb3J0U3BlY1BhcnRzLmxlbmd0aCB8fCAhb3B0aW9ucyB8fCAhb3B0aW9ucy5kaXN0YW5jZXMpIHtcbiAgICAgIHJldHVybiB0aGlzLl9nZXRCYXNlQ29tcGFyYXRvcigpO1xuICAgIH1cblxuICAgIGNvbnN0IGRpc3RhbmNlcyA9IG9wdGlvbnMuZGlzdGFuY2VzO1xuXG4gICAgLy8gUmV0dXJuIGEgY29tcGFyYXRvciB3aGljaCBjb21wYXJlcyB1c2luZyAkbmVhciBkaXN0YW5jZXMuXG4gICAgcmV0dXJuIChhLCBiKSA9PiB7XG4gICAgICBpZiAoIWRpc3RhbmNlcy5oYXMoYS5faWQpKSB7XG4gICAgICAgIHRocm93IEVycm9yKGBNaXNzaW5nIGRpc3RhbmNlIGZvciAke2EuX2lkfWApO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWRpc3RhbmNlcy5oYXMoYi5faWQpKSB7XG4gICAgICAgIHRocm93IEVycm9yKGBNaXNzaW5nIGRpc3RhbmNlIGZvciAke2IuX2lkfWApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGlzdGFuY2VzLmdldChhLl9pZCkgLSBkaXN0YW5jZXMuZ2V0KGIuX2lkKTtcbiAgICB9O1xuICB9XG5cbiAgLy8gVGFrZXMgaW4gdHdvIGtleXM6IGFycmF5cyB3aG9zZSBsZW5ndGhzIG1hdGNoIHRoZSBudW1iZXIgb2Ygc3BlY1xuICAvLyBwYXJ0cy4gUmV0dXJucyBuZWdhdGl2ZSwgMCwgb3IgcG9zaXRpdmUgYmFzZWQgb24gdXNpbmcgdGhlIHNvcnQgc3BlYyB0b1xuICAvLyBjb21wYXJlIGZpZWxkcy5cbiAgX2NvbXBhcmVLZXlzKGtleTEsIGtleTIpIHtcbiAgICBpZiAoa2V5MS5sZW5ndGggIT09IHRoaXMuX3NvcnRTcGVjUGFydHMubGVuZ3RoIHx8XG4gICAgICAgIGtleTIubGVuZ3RoICE9PSB0aGlzLl9zb3J0U3BlY1BhcnRzLmxlbmd0aCkge1xuICAgICAgdGhyb3cgRXJyb3IoJ0tleSBoYXMgd3JvbmcgbGVuZ3RoJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX2tleUNvbXBhcmF0b3Ioa2V5MSwga2V5Mik7XG4gIH1cblxuICAvLyBJdGVyYXRlcyBvdmVyIGVhY2ggcG9zc2libGUgXCJrZXlcIiBmcm9tIGRvYyAoaWUsIG92ZXIgZWFjaCBicmFuY2gpLCBjYWxsaW5nXG4gIC8vICdjYicgd2l0aCB0aGUga2V5LlxuICBfZ2VuZXJhdGVLZXlzRnJvbURvYyhkb2MsIGNiKSB7XG4gICAgaWYgKHRoaXMuX3NvcnRTcGVjUGFydHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NhblxcJ3QgZ2VuZXJhdGUga2V5cyB3aXRob3V0IGEgc3BlYycpO1xuICAgIH1cblxuICAgIGNvbnN0IHBhdGhGcm9tSW5kaWNlcyA9IGluZGljZXMgPT4gYCR7aW5kaWNlcy5qb2luKCcsJyl9LGA7XG5cbiAgICBsZXQga25vd25QYXRocyA9IG51bGw7XG5cbiAgICAvLyBtYXBzIGluZGV4IC0+ICh7JycgLT4gdmFsdWV9IG9yIHtwYXRoIC0+IHZhbHVlfSlcbiAgICBjb25zdCB2YWx1ZXNCeUluZGV4QW5kUGF0aCA9IHRoaXMuX3NvcnRTcGVjUGFydHMubWFwKHNwZWMgPT4ge1xuICAgICAgLy8gRXhwYW5kIGFueSBsZWFmIGFycmF5cyB0aGF0IHdlIGZpbmQsIGFuZCBpZ25vcmUgdGhvc2UgYXJyYXlzXG4gICAgICAvLyB0aGVtc2VsdmVzLiAgKFdlIG5ldmVyIHNvcnQgYmFzZWQgb24gYW4gYXJyYXkgaXRzZWxmLilcbiAgICAgIGxldCBicmFuY2hlcyA9IGV4cGFuZEFycmF5c0luQnJhbmNoZXMoc3BlYy5sb29rdXAoZG9jKSwgdHJ1ZSk7XG5cbiAgICAgIC8vIElmIHRoZXJlIGFyZSBubyB2YWx1ZXMgZm9yIGEga2V5IChlZywga2V5IGdvZXMgdG8gYW4gZW1wdHkgYXJyYXkpLFxuICAgICAgLy8gcHJldGVuZCB3ZSBmb3VuZCBvbmUgdW5kZWZpbmVkIHZhbHVlLlxuICAgICAgaWYgKCFicmFuY2hlcy5sZW5ndGgpIHtcbiAgICAgICAgYnJhbmNoZXMgPSBbeyB2YWx1ZTogdm9pZCAwIH1dO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBlbGVtZW50ID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgIGxldCB1c2VkUGF0aHMgPSBmYWxzZTtcblxuICAgICAgYnJhbmNoZXMuZm9yRWFjaChicmFuY2ggPT4ge1xuICAgICAgICBpZiAoIWJyYW5jaC5hcnJheUluZGljZXMpIHtcbiAgICAgICAgICAvLyBJZiB0aGVyZSBhcmUgbm8gYXJyYXkgaW5kaWNlcyBmb3IgYSBicmFuY2gsIHRoZW4gaXQgbXVzdCBiZSB0aGVcbiAgICAgICAgICAvLyBvbmx5IGJyYW5jaCwgYmVjYXVzZSB0aGUgb25seSB0aGluZyB0aGF0IHByb2R1Y2VzIG11bHRpcGxlIGJyYW5jaGVzXG4gICAgICAgICAgLy8gaXMgdGhlIHVzZSBvZiBhcnJheXMuXG4gICAgICAgICAgaWYgKGJyYW5jaGVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKCdtdWx0aXBsZSBicmFuY2hlcyBidXQgbm8gYXJyYXkgdXNlZD8nKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBlbGVtZW50WycnXSA9IGJyYW5jaC52YWx1ZTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB1c2VkUGF0aHMgPSB0cnVlO1xuXG4gICAgICAgIGNvbnN0IHBhdGggPSBwYXRoRnJvbUluZGljZXMoYnJhbmNoLmFycmF5SW5kaWNlcyk7XG5cbiAgICAgICAgaWYgKGhhc093bi5jYWxsKGVsZW1lbnQsIHBhdGgpKSB7XG4gICAgICAgICAgdGhyb3cgRXJyb3IoYGR1cGxpY2F0ZSBwYXRoOiAke3BhdGh9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBlbGVtZW50W3BhdGhdID0gYnJhbmNoLnZhbHVlO1xuXG4gICAgICAgIC8vIElmIHR3byBzb3J0IGZpZWxkcyBib3RoIGdvIGludG8gYXJyYXlzLCB0aGV5IGhhdmUgdG8gZ28gaW50byB0aGVcbiAgICAgICAgLy8gZXhhY3Qgc2FtZSBhcnJheXMgYW5kIHdlIGhhdmUgdG8gZmluZCB0aGUgc2FtZSBwYXRocy4gIFRoaXMgaXNcbiAgICAgICAgLy8gcm91Z2hseSB0aGUgc2FtZSBjb25kaXRpb24gdGhhdCBtYWtlcyBNb25nb0RCIHRocm93IHRoaXMgc3RyYW5nZVxuICAgICAgICAvLyBlcnJvciBtZXNzYWdlLiAgZWcsIHRoZSBtYWluIHRoaW5nIGlzIHRoYXQgaWYgc29ydCBzcGVjIGlzIHthOiAxLFxuICAgICAgICAvLyBiOjF9IHRoZW4gYSBhbmQgYiBjYW5ub3QgYm90aCBiZSBhcnJheXMuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIChJbiBNb25nb0RCIGl0IHNlZW1zIHRvIGJlIE9LIHRvIGhhdmUge2E6IDEsICdhLngueSc6IDF9IHdoZXJlICdhJ1xuICAgICAgICAvLyBhbmQgJ2EueC55JyBhcmUgYm90aCBhcnJheXMsIGJ1dCB3ZSBkb24ndCBhbGxvdyB0aGlzIGZvciBub3cuXG4gICAgICAgIC8vICNOZXN0ZWRBcnJheVNvcnRcbiAgICAgICAgLy8gWFhYIGFjaGlldmUgZnVsbCBjb21wYXRpYmlsaXR5IGhlcmVcbiAgICAgICAgaWYgKGtub3duUGF0aHMgJiYgIWhhc093bi5jYWxsKGtub3duUGF0aHMsIHBhdGgpKSB7XG4gICAgICAgICAgdGhyb3cgRXJyb3IoJ2Nhbm5vdCBpbmRleCBwYXJhbGxlbCBhcnJheXMnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGlmIChrbm93blBhdGhzKSB7XG4gICAgICAgIC8vIFNpbWlsYXJseSB0byBhYm92ZSwgcGF0aHMgbXVzdCBtYXRjaCBldmVyeXdoZXJlLCB1bmxlc3MgdGhpcyBpcyBhXG4gICAgICAgIC8vIG5vbi1hcnJheSBmaWVsZC5cbiAgICAgICAgaWYgKCFoYXNPd24uY2FsbChlbGVtZW50LCAnJykgJiZcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGtub3duUGF0aHMpLmxlbmd0aCAhPT0gT2JqZWN0LmtleXMoZWxlbWVudCkubGVuZ3RoKSB7XG4gICAgICAgICAgdGhyb3cgRXJyb3IoJ2Nhbm5vdCBpbmRleCBwYXJhbGxlbCBhcnJheXMhJyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodXNlZFBhdGhzKSB7XG4gICAgICAgIGtub3duUGF0aHMgPSB7fTtcblxuICAgICAgICBPYmplY3Qua2V5cyhlbGVtZW50KS5mb3JFYWNoKHBhdGggPT4ge1xuICAgICAgICAgIGtub3duUGF0aHNbcGF0aF0gPSB0cnVlO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgfSk7XG5cbiAgICBpZiAoIWtub3duUGF0aHMpIHtcbiAgICAgIC8vIEVhc3kgY2FzZTogbm8gdXNlIG9mIGFycmF5cy5cbiAgICAgIGNvbnN0IHNvbGVLZXkgPSB2YWx1ZXNCeUluZGV4QW5kUGF0aC5tYXAodmFsdWVzID0+IHtcbiAgICAgICAgaWYgKCFoYXNPd24uY2FsbCh2YWx1ZXMsICcnKSkge1xuICAgICAgICAgIHRocm93IEVycm9yKCdubyB2YWx1ZSBpbiBzb2xlIGtleSBjYXNlPycpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHZhbHVlc1snJ107XG4gICAgICB9KTtcblxuICAgICAgY2Ioc29sZUtleSk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBPYmplY3Qua2V5cyhrbm93blBhdGhzKS5mb3JFYWNoKHBhdGggPT4ge1xuICAgICAgY29uc3Qga2V5ID0gdmFsdWVzQnlJbmRleEFuZFBhdGgubWFwKHZhbHVlcyA9PiB7XG4gICAgICAgIGlmIChoYXNPd24uY2FsbCh2YWx1ZXMsICcnKSkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZXNbJyddO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFoYXNPd24uY2FsbCh2YWx1ZXMsIHBhdGgpKSB7XG4gICAgICAgICAgdGhyb3cgRXJyb3IoJ21pc3NpbmcgcGF0aD8nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB2YWx1ZXNbcGF0aF07XG4gICAgICB9KTtcblxuICAgICAgY2Ioa2V5KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFJldHVybnMgYSBjb21wYXJhdG9yIHRoYXQgcmVwcmVzZW50cyB0aGUgc29ydCBzcGVjaWZpY2F0aW9uIChidXQgbm90XG4gIC8vIGluY2x1ZGluZyBhIHBvc3NpYmxlIGdlb3F1ZXJ5IGRpc3RhbmNlIHRpZS1icmVha2VyKS5cbiAgX2dldEJhc2VDb21wYXJhdG9yKCkge1xuICAgIGlmICh0aGlzLl9zb3J0RnVuY3Rpb24pIHtcbiAgICAgIHJldHVybiB0aGlzLl9zb3J0RnVuY3Rpb247XG4gICAgfVxuXG4gICAgLy8gSWYgd2UncmUgb25seSBzb3J0aW5nIG9uIGdlb3F1ZXJ5IGRpc3RhbmNlIGFuZCBubyBzcGVjcywganVzdCBzYXlcbiAgICAvLyBldmVyeXRoaW5nIGlzIGVxdWFsLlxuICAgIGlmICghdGhpcy5fc29ydFNwZWNQYXJ0cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiAoZG9jMSwgZG9jMikgPT4gMDtcbiAgICB9XG5cbiAgICByZXR1cm4gKGRvYzEsIGRvYzIpID0+IHtcbiAgICAgIGNvbnN0IGtleTEgPSB0aGlzLl9nZXRNaW5LZXlGcm9tRG9jKGRvYzEpO1xuICAgICAgY29uc3Qga2V5MiA9IHRoaXMuX2dldE1pbktleUZyb21Eb2MoZG9jMik7XG4gICAgICByZXR1cm4gdGhpcy5fY29tcGFyZUtleXMoa2V5MSwga2V5Mik7XG4gICAgfTtcbiAgfVxuXG4gIC8vIEZpbmRzIHRoZSBtaW5pbXVtIGtleSBmcm9tIHRoZSBkb2MsIGFjY29yZGluZyB0byB0aGUgc29ydCBzcGVjcy4gIChXZSBzYXlcbiAgLy8gXCJtaW5pbXVtXCIgaGVyZSBidXQgdGhpcyBpcyB3aXRoIHJlc3BlY3QgdG8gdGhlIHNvcnQgc3BlYywgc28gXCJkZXNjZW5kaW5nXCJcbiAgLy8gc29ydCBmaWVsZHMgbWVhbiB3ZSdyZSBmaW5kaW5nIHRoZSBtYXggZm9yIHRoYXQgZmllbGQuKVxuICAvL1xuICAvLyBOb3RlIHRoYXQgdGhpcyBpcyBOT1QgXCJmaW5kIHRoZSBtaW5pbXVtIHZhbHVlIG9mIHRoZSBmaXJzdCBmaWVsZCwgdGhlXG4gIC8vIG1pbmltdW0gdmFsdWUgb2YgdGhlIHNlY29uZCBmaWVsZCwgZXRjXCIuLi4gaXQncyBcImNob29zZSB0aGVcbiAgLy8gbGV4aWNvZ3JhcGhpY2FsbHkgbWluaW11bSB2YWx1ZSBvZiB0aGUga2V5IHZlY3RvciwgYWxsb3dpbmcgb25seSBrZXlzIHdoaWNoXG4gIC8vIHlvdSBjYW4gZmluZCBhbG9uZyB0aGUgc2FtZSBwYXRoc1wiLiAgaWUsIGZvciBhIGRvYyB7YTogW3t4OiAwLCB5OiA1fSwge3g6XG4gIC8vIDEsIHk6IDN9XX0gd2l0aCBzb3J0IHNwZWMgeydhLngnOiAxLCAnYS55JzogMX0sIHRoZSBvbmx5IGtleXMgYXJlIFswLDVdIGFuZFxuICAvLyBbMSwzXSwgYW5kIHRoZSBtaW5pbXVtIGtleSBpcyBbMCw1XTsgbm90YWJseSwgWzAsM10gaXMgTk9UIGEga2V5LlxuICBfZ2V0TWluS2V5RnJvbURvYyhkb2MpIHtcbiAgICBsZXQgbWluS2V5ID0gbnVsbDtcblxuICAgIHRoaXMuX2dlbmVyYXRlS2V5c0Zyb21Eb2MoZG9jLCBrZXkgPT4ge1xuICAgICAgaWYgKG1pbktleSA9PT0gbnVsbCkge1xuICAgICAgICBtaW5LZXkgPSBrZXk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2NvbXBhcmVLZXlzKGtleSwgbWluS2V5KSA8IDApIHtcbiAgICAgICAgbWluS2V5ID0ga2V5O1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG1pbktleTtcbiAgfVxuXG4gIF9nZXRQYXRocygpIHtcbiAgICByZXR1cm4gdGhpcy5fc29ydFNwZWNQYXJ0cy5tYXAocGFydCA9PiBwYXJ0LnBhdGgpO1xuICB9XG5cbiAgLy8gR2l2ZW4gYW4gaW5kZXggJ2knLCByZXR1cm5zIGEgY29tcGFyYXRvciB0aGF0IGNvbXBhcmVzIHR3byBrZXkgYXJyYXlzIGJhc2VkXG4gIC8vIG9uIGZpZWxkICdpJy5cbiAgX2tleUZpZWxkQ29tcGFyYXRvcihpKSB7XG4gICAgY29uc3QgaW52ZXJ0ID0gIXRoaXMuX3NvcnRTcGVjUGFydHNbaV0uYXNjZW5kaW5nO1xuXG4gICAgcmV0dXJuIChrZXkxLCBrZXkyKSA9PiB7XG4gICAgICBjb25zdCBjb21wYXJlID0gTG9jYWxDb2xsZWN0aW9uLl9mLl9jbXAoa2V5MVtpXSwga2V5MltpXSk7XG4gICAgICByZXR1cm4gaW52ZXJ0ID8gLWNvbXBhcmUgOiBjb21wYXJlO1xuICAgIH07XG4gIH1cbn1cblxuLy8gR2l2ZW4gYW4gYXJyYXkgb2YgY29tcGFyYXRvcnNcbi8vIChmdW5jdGlvbnMgKGEsYiktPihuZWdhdGl2ZSBvciBwb3NpdGl2ZSBvciB6ZXJvKSksIHJldHVybnMgYSBzaW5nbGVcbi8vIGNvbXBhcmF0b3Igd2hpY2ggdXNlcyBlYWNoIGNvbXBhcmF0b3IgaW4gb3JkZXIgYW5kIHJldHVybnMgdGhlIGZpcnN0XG4vLyBub24temVybyB2YWx1ZS5cbmZ1bmN0aW9uIGNvbXBvc2VDb21wYXJhdG9ycyhjb21wYXJhdG9yQXJyYXkpIHtcbiAgcmV0dXJuIChhLCBiKSA9PiB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb21wYXJhdG9yQXJyYXkubGVuZ3RoOyArK2kpIHtcbiAgICAgIGNvbnN0IGNvbXBhcmUgPSBjb21wYXJhdG9yQXJyYXlbaV0oYSwgYik7XG4gICAgICBpZiAoY29tcGFyZSAhPT0gMCkge1xuICAgICAgICByZXR1cm4gY29tcGFyZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfTtcbn1cbiJdfQ==
