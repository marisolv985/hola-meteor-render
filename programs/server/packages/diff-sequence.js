Package["core-runtime"].queue("diff-sequence",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var ECMAScript = Package.ecmascript.ECMAScript;
var EJSON = Package.ejson.EJSON;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var DiffSequence;

var require = meteorInstall({"node_modules":{"meteor":{"diff-sequence":{"diff.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                //
// packages/diff-sequence/diff.js                                                                 //
//                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                  //
module.export({DiffSequence:()=>DiffSequence},true);const DiffSequence = {};
const hasOwn = Object.prototype.hasOwnProperty;
function isObjEmpty(obj) {
    for(let key in Object(obj)){
        if (hasOwn.call(obj, key)) {
            return false;
        }
    }
    return true;
}
// ordered: bool.
// old_results and new_results: collections of documents.
//    if ordered, they are arrays.
//    if unordered, they are IdMaps
DiffSequence.diffQueryChanges = function(ordered, oldResults, newResults, observer, options) {
    if (ordered) DiffSequence.diffQueryOrderedChanges(oldResults, newResults, observer, options);
    else DiffSequence.diffQueryUnorderedChanges(oldResults, newResults, observer, options);
};
DiffSequence.diffQueryUnorderedChanges = function(oldResults, newResults, observer, options) {
    options = options || {};
    var projectionFn = options.projectionFn || EJSON.clone;
    if (observer.movedBefore) {
        throw new Error("_diffQueryUnordered called with a movedBefore observer!");
    }
    newResults.forEach(function(newDoc, id) {
        var oldDoc = oldResults.get(id);
        if (oldDoc) {
            if (observer.changed && !EJSON.equals(oldDoc, newDoc)) {
                var projectedNew = projectionFn(newDoc);
                var projectedOld = projectionFn(oldDoc);
                var changedFields = DiffSequence.makeChangedFields(projectedNew, projectedOld);
                if (!isObjEmpty(changedFields)) {
                    observer.changed(id, changedFields);
                }
            }
        } else if (observer.added) {
            var fields = projectionFn(newDoc);
            delete fields._id;
            observer.added(newDoc._id, fields);
        }
    });
    if (observer.removed) {
        oldResults.forEach(function(oldDoc, id) {
            if (!newResults.has(id)) observer.removed(id);
        });
    }
};
DiffSequence.diffQueryOrderedChanges = function(old_results, new_results, observer, options) {
    options = options || {};
    var projectionFn = options.projectionFn || EJSON.clone;
    var new_presence_of_id = {};
    new_results.forEach(function(doc) {
        if (new_presence_of_id[doc._id]) Meteor._debug("Duplicate _id in new_results");
        new_presence_of_id[doc._id] = true;
    });
    var old_index_of_id = {};
    old_results.forEach(function(doc, i) {
        if (doc._id in old_index_of_id) Meteor._debug("Duplicate _id in old_results");
        old_index_of_id[doc._id] = i;
    });
    // ALGORITHM:
    //
    // To determine which docs should be considered "moved" (and which
    // merely change position because of other docs moving) we run
    // a "longest common subsequence" (LCS) algorithm.  The LCS of the
    // old doc IDs and the new doc IDs gives the docs that should NOT be
    // considered moved.
    // To actually call the appropriate callbacks to get from the old state to the
    // new state:
    // First, we call removed() on all the items that only appear in the old
    // state.
    // Then, once we have the items that should not move, we walk through the new
    // results array group-by-group, where a "group" is a set of items that have
    // moved, anchored on the end by an item that should not move.  One by one, we
    // move each of those elements into place "before" the anchoring end-of-group
    // item, and fire changed events on them if necessary.  Then we fire a changed
    // event on the anchor, and move on to the next group.  There is always at
    // least one group; the last group is anchored by a virtual "null" id at the
    // end.
    // Asymptotically: O(N k) where k is number of ops, or potentially
    // O(N log N) if inner loop of LCS were made to be binary search.
    //////// LCS (longest common sequence, with respect to _id)
    // (see Wikipedia article on Longest Increasing Subsequence,
    // where the LIS is taken of the sequence of old indices of the
    // docs in new_results)
    //
    // unmoved: the output of the algorithm; members of the LCS,
    // in the form of indices into new_results
    var unmoved = [];
    // max_seq_len: length of LCS found so far
    var max_seq_len = 0;
    // seq_ends[i]: the index into new_results of the last doc in a
    // common subsequence of length of i+1 <= max_seq_len
    var N = new_results.length;
    var seq_ends = new Array(N);
    // ptrs:  the common subsequence ending with new_results[n] extends
    // a common subsequence ending with new_results[ptr[n]], unless
    // ptr[n] is -1.
    var ptrs = new Array(N);
    // virtual sequence of old indices of new results
    var old_idx_seq = function(i_new) {
        return old_index_of_id[new_results[i_new]._id];
    };
    // for each item in new_results, use it to extend a common subsequence
    // of length j <= max_seq_len
    for(var i = 0; i < N; i++){
        if (old_index_of_id[new_results[i]._id] !== undefined) {
            var j = max_seq_len;
            // this inner loop would traditionally be a binary search,
            // but scanning backwards we will likely find a subseq to extend
            // pretty soon, bounded for example by the total number of ops.
            // If this were to be changed to a binary search, we'd still want
            // to scan backwards a bit as an optimization.
            while(j > 0){
                if (old_idx_seq(seq_ends[j - 1]) < old_idx_seq(i)) break;
                j--;
            }
            ptrs[i] = j === 0 ? -1 : seq_ends[j - 1];
            seq_ends[j] = i;
            if (j + 1 > max_seq_len) max_seq_len = j + 1;
        }
    }
    // pull out the LCS/LIS into unmoved
    var idx = max_seq_len === 0 ? -1 : seq_ends[max_seq_len - 1];
    while(idx >= 0){
        unmoved.push(idx);
        idx = ptrs[idx];
    }
    // the unmoved item list is built backwards, so fix that
    unmoved.reverse();
    // the last group is always anchored by the end of the result list, which is
    // an id of "null"
    unmoved.push(new_results.length);
    old_results.forEach(function(doc) {
        if (!new_presence_of_id[doc._id]) observer.removed && observer.removed(doc._id);
    });
    // for each group of things in the new_results that is anchored by an unmoved
    // element, iterate through the things before it.
    var startOfGroup = 0;
    unmoved.forEach(function(endOfGroup) {
        var groupId = new_results[endOfGroup] ? new_results[endOfGroup]._id : null;
        var oldDoc, newDoc, fields, projectedNew, projectedOld;
        for(var i = startOfGroup; i < endOfGroup; i++){
            newDoc = new_results[i];
            if (!hasOwn.call(old_index_of_id, newDoc._id)) {
                fields = projectionFn(newDoc);
                delete fields._id;
                observer.addedBefore && observer.addedBefore(newDoc._id, fields, groupId);
                observer.added && observer.added(newDoc._id, fields);
            } else {
                // moved
                oldDoc = old_results[old_index_of_id[newDoc._id]];
                projectedNew = projectionFn(newDoc);
                projectedOld = projectionFn(oldDoc);
                fields = DiffSequence.makeChangedFields(projectedNew, projectedOld);
                if (!isObjEmpty(fields)) {
                    observer.changed && observer.changed(newDoc._id, fields);
                }
                observer.movedBefore && observer.movedBefore(newDoc._id, groupId);
            }
        }
        if (groupId) {
            newDoc = new_results[endOfGroup];
            oldDoc = old_results[old_index_of_id[newDoc._id]];
            projectedNew = projectionFn(newDoc);
            projectedOld = projectionFn(oldDoc);
            fields = DiffSequence.makeChangedFields(projectedNew, projectedOld);
            if (!isObjEmpty(fields)) {
                observer.changed && observer.changed(newDoc._id, fields);
            }
        }
        startOfGroup = endOfGroup + 1;
    });
};
// General helper for diff-ing two objects.
// callbacks is an object like so:
// { leftOnly: function (key, leftValue) {...},
//   rightOnly: function (key, rightValue) {...},
//   both: function (key, leftValue, rightValue) {...},
// }
DiffSequence.diffObjects = function(left, right, callbacks) {
    Object.keys(left).forEach((key)=>{
        const leftValue = left[key];
        if (hasOwn.call(right, key)) {
            callbacks.both && callbacks.both(key, leftValue, right[key]);
        } else {
            callbacks.leftOnly && callbacks.leftOnly(key, leftValue);
        }
    });
    if (callbacks.rightOnly) {
        Object.keys(right).forEach((key)=>{
            const rightValue = right[key];
            if (!hasOwn.call(left, key)) {
                callbacks.rightOnly(key, rightValue);
            }
        });
    }
};
DiffSequence.diffMaps = function(left, right, callbacks) {
    left.forEach(function(leftValue, key) {
        if (right.has(key)) {
            callbacks.both && callbacks.both(key, leftValue, right.get(key));
        } else {
            callbacks.leftOnly && callbacks.leftOnly(key, leftValue);
        }
    });
    if (callbacks.rightOnly) {
        right.forEach(function(rightValue, key) {
            if (!left.has(key)) {
                callbacks.rightOnly(key, rightValue);
            }
        });
    }
};
DiffSequence.makeChangedFields = function(newDoc, oldDoc) {
    var fields = {};
    DiffSequence.diffObjects(oldDoc, newDoc, {
        leftOnly: function(key, value) {
            fields[key] = undefined;
        },
        rightOnly: function(key, value) {
            fields[key] = value;
        },
        both: function(key, leftValue, rightValue) {
            if (!EJSON.equals(leftValue, rightValue)) fields[key] = rightValue;
        }
    });
    return fields;
};
DiffSequence.applyChanges = function(doc, changeFields) {
    Object.keys(changeFields).forEach((key)=>{
        const value = changeFields[key];
        if (typeof value === "undefined") {
            delete doc[key];
        } else {
            doc[key] = value;
        }
    });
};

////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});


/* Exports */
return {
  export: function () { return {
      DiffSequence: DiffSequence
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/diff-sequence/diff.js"
  ],
  mainModulePath: "/node_modules/meteor/diff-sequence/diff.js"
}});

//# sourceURL=meteor://💻app/packages/diff-sequence.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZGlmZi1zZXF1ZW5jZS9kaWZmLmpzIl0sIm5hbWVzIjpbIkRpZmZTZXF1ZW5jZSIsImhhc093biIsIk9iamVjdCIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiaXNPYmpFbXB0eSIsIm9iaiIsImtleSIsImNhbGwiLCJkaWZmUXVlcnlDaGFuZ2VzIiwib3JkZXJlZCIsIm9sZFJlc3VsdHMiLCJuZXdSZXN1bHRzIiwib2JzZXJ2ZXIiLCJvcHRpb25zIiwiZGlmZlF1ZXJ5T3JkZXJlZENoYW5nZXMiLCJkaWZmUXVlcnlVbm9yZGVyZWRDaGFuZ2VzIiwicHJvamVjdGlvbkZuIiwiRUpTT04iLCJjbG9uZSIsIm1vdmVkQmVmb3JlIiwiRXJyb3IiLCJmb3JFYWNoIiwibmV3RG9jIiwiaWQiLCJvbGREb2MiLCJnZXQiLCJjaGFuZ2VkIiwiZXF1YWxzIiwicHJvamVjdGVkTmV3IiwicHJvamVjdGVkT2xkIiwiY2hhbmdlZEZpZWxkcyIsIm1ha2VDaGFuZ2VkRmllbGRzIiwiYWRkZWQiLCJmaWVsZHMiLCJfaWQiLCJyZW1vdmVkIiwiaGFzIiwib2xkX3Jlc3VsdHMiLCJuZXdfcmVzdWx0cyIsIm5ld19wcmVzZW5jZV9vZl9pZCIsImRvYyIsIk1ldGVvciIsIl9kZWJ1ZyIsIm9sZF9pbmRleF9vZl9pZCIsImkiLCJ1bm1vdmVkIiwibWF4X3NlcV9sZW4iLCJOIiwibGVuZ3RoIiwic2VxX2VuZHMiLCJBcnJheSIsInB0cnMiLCJvbGRfaWR4X3NlcSIsImlfbmV3IiwidW5kZWZpbmVkIiwiaiIsImlkeCIsInB1c2giLCJyZXZlcnNlIiwic3RhcnRPZkdyb3VwIiwiZW5kT2ZHcm91cCIsImdyb3VwSWQiLCJhZGRlZEJlZm9yZSIsImRpZmZPYmplY3RzIiwibGVmdCIsInJpZ2h0IiwiY2FsbGJhY2tzIiwia2V5cyIsImxlZnRWYWx1ZSIsImJvdGgiLCJsZWZ0T25seSIsInJpZ2h0T25seSIsInJpZ2h0VmFsdWUiLCJk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TUFBTTVDLE9BQU8sQ0FBQyxTQUFVbUQsVUFBVSxFQUFFbEUsR0FBRztZQUNyQyxJQUFJLENBQUMwRCxLQUFLNUIsR0FBRyxDQUFDOUIsTUFBSztnQkFDakI0RCxVQUFVSyxTQUFTLENBQUNqRSxLQUFLa0U7WUFDM0I7UUFDRjtJQUNGO0FBQ0Y7QUFHQXpFLGFBQWFnQyxpQkFBaUIsR0FBRyxTQUFVVCxNQUFNLEVBQUVFLE1BQU07SUFDdkQsSUFBSVMsU0FBUyxDQUFDO0lBQ2RsQyxhQUFhZ0UsV0FBVyxDQUFDdkMsUUFBUUYsUUFBUTtRQUN2Q2dELFVBQVUsU0FBVWhFLEdBQUcsRUFBRW9FLEtBQUs7WUFDNUJ6QyxNQUFNLENBQUMzQixJQUFJLEdBQUdnRDtRQUNoQjtRQUNBaUIsV0FBVyxTQUFVakUsR0FBRyxFQUFFb0UsS0FBSztZQUM3QnpDLE1BQU0sQ0FBQzNCLElBQUksR0FBR29FO1FBQ2hCO1FBQ0FMLE1BQU0sU0FBVS9ELEdBQUcsRUFBRThELFNBQVMsRUFBRUksVUFBVTtZQUN4QyxJQUFJLENBQUN2RCxNQUFNVSxNQUFNLENBQUN5QyxXQUFXSSxhQUMzQnZDLE1BQU0sQ0FBQzNCLElBQUksR0FBR2tFO1FBQ2xCO0lBQ0Y7SUFDQSxPQUFPdkM7QUFDVDtBQUVBbEMsYUFBYTRFLFlBQVksR0FBRyxTQUFVbkMsR0FBRyxFQUFFb0MsWUFBWTtJQUNyRDNFLE9BQU9rRSxJQUFJLENBQUNTLGNBQWN2RCxPQUFPLENBQUNmO1FBQ2hDLE1BQU1vRSxRQUFRRSxZQUFZLENBQUN0RSxJQUFJO1FBQy9CLElBQUksT0FBT29FLFVBQVUsYUFBYTtZQUNoQyxPQUFPbEMsR0FBRyxDQUFDbEMsSUFBSTtRQUNqQixPQUFPO1lBQ0xrQyxHQUFHLENBQUNsQyxJQUFJLEdBQUdvRTtRQUNiO0lBQ0Y7QUFDRiIsImZpbGUiOiIvcGFja2FnZXMvZGlmZi1zZXF1ZW5jZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjb25zdCBEaWZmU2VxdWVuY2UgPSB7fTtcblxuY29uc3QgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuZnVuY3Rpb24gaXNPYmpFbXB0eShvYmopIHtcbiAgZm9yIChsZXQga2V5IGluIE9iamVjdChvYmopKSB7XG4gICAgaWYgKGhhc093bi5jYWxsKG9iaiwga2V5KSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLy8gb3JkZXJlZDogYm9vbC5cbi8vIG9sZF9yZXN1bHRzIGFuZCBuZXdfcmVzdWx0czogY29sbGVjdGlvbnMgb2YgZG9jdW1lbnRzLlxuLy8gICAgaWYgb3JkZXJlZCwgdGhleSBhcmUgYXJyYXlzLlxuLy8gICAgaWYgdW5vcmRlcmVkLCB0aGV5IGFyZSBJZE1hcHNcbkRpZmZTZXF1ZW5jZS5kaWZmUXVlcnlDaGFuZ2VzID0gZnVuY3Rpb24gKG9yZGVyZWQsIG9sZFJlc3VsdHMsIG5ld1Jlc3VsdHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIsIG9wdGlvbnMpIHtcbiAgaWYgKG9yZGVyZWQpXG4gICAgRGlmZlNlcXVlbmNlLmRpZmZRdWVyeU9yZGVyZWRDaGFuZ2VzKFxuICAgICAgb2xkUmVzdWx0cywgbmV3UmVzdWx0cywgb2JzZXJ2ZXIsIG9wdGlvbnMpO1xuICBlbHNlXG4gICAgRGlmZlNlcXVlbmNlLmRpZmZRdWVyeVVub3JkZXJlZENoYW5nZXMoXG4gICAgICBvbGRSZXN1bHRzLCBuZXdSZXN1bHRzLCBvYnNlcnZlciwgb3B0aW9ucyk7XG59O1xuXG5EaWZmU2VxdWVuY2UuZGlmZlF1ZXJ5VW5vcmRlcmVkQ2hhbmdlcyA9IGZ1bmN0aW9uIChvbGRSZXN1bHRzLCBuZXdSZXN1bHRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB2YXIgcHJvamVjdGlvbkZuID0gb3B0aW9ucy5wcm9qZWN0aW9uRm4gfHwgRUpTT04uY2xvbmU7XG5cbiAgaWYgKG9ic2VydmVyLm1vdmVkQmVmb3JlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiX2RpZmZRdWVyeVVub3JkZXJlZCBjYWxsZWQgd2l0aCBhIG1vdmVkQmVmb3JlIG9ic2VydmVyIVwiKTtcbiAgfVxuXG4gIG5ld1Jlc3VsdHMuZm9yRWFjaChmdW5jdGlvbiAobmV3RG9jLCBpZCkge1xuICAgIHZhciBvbGREb2MgPSBvbGRSZXN1bHRzLmdldChpZCk7XG4gICAgaWYgKG9sZERvYykge1xuICAgICAgaWYgKG9ic2VydmVyLmNoYW5nZWQgJiYgIUVKU09OLmVxdWFscyhvbGREb2MsIG5ld0RvYykpIHtcbiAgICAgICAgdmFyIHByb2plY3RlZE5ldyA9IHByb2plY3Rpb25GbihuZXdEb2MpO1xuICAgICAgICB2YXIgcHJvamVjdGVkT2xkID0gcHJvamVjdGlvbkZuKG9sZERvYyk7XG4gICAgICAgIHZhciBjaGFuZ2VkRmllbGRzID1cbiAgICAgICAgICAgICAgRGlmZlNlcXVlbmNlLm1ha2VDaGFuZ2VkRmllbGRzKHByb2plY3RlZE5ldywgcHJvamVjdGVkT2xkKTtcbiAgICAgICAgaWYgKCEgaXNPYmpFbXB0eShjaGFuZ2VkRmllbGRzKSkge1xuICAgICAgICAgIG9ic2VydmVyLmNoYW5nZWQoaWQsIGNoYW5nZWRGaWVsZHMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChvYnNlcnZlci5hZGRlZCkge1xuICAgICAgdmFyIGZpZWxkcyA9IHByb2plY3Rpb25GbihuZXdEb2MpO1xuICAgICAgZGVsZXRlIGZpZWxkcy5faWQ7XG4gICAgICBvYnNlcnZlci5hZGRlZChuZXdEb2MuX2lkLCBmaWVsZHMpO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKG9ic2VydmVyLnJlbW92ZWQpIHtcbiAgICBvbGRSZXN1bHRzLmZvckVhY2goZnVuY3Rpb24gKG9sZERvYywgaWQpIHtcbiAgICAgIGlmICghbmV3UmVzdWx0cy5oYXMoaWQpKVxuICAgICAgICBvYnNlcnZlci5yZW1vdmVkKGlkKTtcbiAgICB9KTtcbiAgfVxufTtcblxuRGlmZlNlcXVlbmNlLmRpZmZRdWVyeU9yZGVyZWRDaGFuZ2VzID0gZnVuY3Rpb24gKG9sZF9yZXN1bHRzLCBuZXdfcmVzdWx0cyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHZhciBwcm9qZWN0aW9uRm4gPSBvcHRpb25zLnByb2plY3Rpb25GbiB8fCBFSlNPTi5jbG9uZTtcblxuICB2YXIgbmV3X3ByZXNlbmNlX29mX2lkID0ge307XG4gIG5ld19yZXN1bHRzLmZvckVhY2goZnVuY3Rpb24gKGRvYykge1xuICAgIGlmIChuZXdfcHJlc2VuY2Vfb2ZfaWRbZG9jLl9pZF0pXG4gICAgICBNZXRlb3IuX2RlYnVnKFwiRHVwbGljYXRlIF9pZCBpbiBuZXdfcmVzdWx0c1wiKTtcbiAgICBuZXdfcHJlc2VuY2Vfb2ZfaWRbZG9jLl9pZF0gPSB0cnVlO1xuICB9KTtcblxuICB2YXIgb2xkX2luZGV4X29mX2lkID0ge307XG4gIG9sZF9yZXN1bHRzLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaSkge1xuICAgIGlmIChkb2MuX2lkIGluIG9sZF9pbmRleF9vZl9pZClcbiAgICAgIE1ldGVvci5fZGVidWcoXCJEdXBsaWNhdGUgX2lkIGluIG9sZF9yZXN1bHRzXCIpO1xuICAgIG9sZF9pbmRleF9vZl9pZFtkb2MuX2lkXSA9IGk7XG4gIH0pO1xuXG4gIC8vIEFMR09SSVRITTpcbiAgLy9cbiAgLy8gVG8gZGV0ZXJtaW5lIHdoaWNoIGRvY3Mgc2hvdWxkIGJlIGNvbnNpZGVyZWQgXCJtb3ZlZFwiIChhbmQgd2hpY2hcbiAgLy8gbWVyZWx5IGNoYW5nZSBwb3NpdGlvbiBiZWNhdXNlIG9mIG90aGVyIGRvY3MgbW92aW5nKSB3ZSBydW5cbiAgLy8gYSBcImxvbmdlc3QgY29tbW9uIHN1YnNlcXVlbmNlXCIgKExDUykgYWxnb3JpdGhtLiAgVGhlIExDUyBvZiB0aGVcbiAgLy8gb2xkIGRvYyBJRHMgYW5kIHRoZSBuZXcgZG9jIElEcyBnaXZlcyB0aGUgZG9jcyB0aGF0IHNob3VsZCBOT1QgYmVcbiAgLy8gY29uc2lkZXJlZCBtb3ZlZC5cblxuICAvLyBUbyBhY3R1YWxseSBjYWxsIHRoZSBhcHByb3ByaWF0ZSBjYWxsYmFja3MgdG8gZ2V0IGZyb20gdGhlIG9sZCBzdGF0ZSB0byB0aGVcbiAgLy8gbmV3IHN0YXRlOlxuXG4gIC8vIEZpcnN0LCB3ZSBjYWxsIHJlbW92ZWQoKSBvbiBhbGwgdGhlIGl0ZW1zIHRoYXQgb25seSBhcHBlYXIgaW4gdGhlIG9sZFxuICAvLyBzdGF0ZS5cblxuICAvLyBUaGVuLCBvbmNlIHdlIGhhdmUgdGhlIGl0ZW1zIHRoYXQgc2hvdWxkIG5vdCBtb3ZlLCB3ZSB3YWxrIHRocm91Z2ggdGhlIG5ld1xuICAvLyByZXN1bHRzIGFycmF5IGdyb3VwLWJ5LWdyb3VwLCB3aGVyZSBhIFwiZ3JvdXBcIiBpcyBhIHNldCBvZiBpdGVtcyB0aGF0IGhhdmVcbiAgLy8gbW92ZWQsIGFuY2hvcmVkIG9uIHRoZSBlbmQgYnkgYW4gaXRlbSB0aGF0IHNob3VsZCBub3QgbW92ZS4gIE9uZSBieSBvbmUsIHdlXG4gIC8vIG1vdmUgZWFjaCBvZiB0aG9zZSBlbGVtZW50cyBpbnRvIHBsYWNlIFwiYmVmb3JlXCIgdGhlIGFuY2hvcmluZyBlbmQtb2YtZ3JvdXBcbiAgLy8gaXRlbSwgYW5kIGZpcmUgY2hhbmdlZCBldmVudHMgb24gdGhlbSBpZiBuZWNlc3NhcnkuICBUaGVuIHdlIGZpcmUgYSBjaGFuZ2VkXG4gIC8vIGV2ZW50IG9uIHRoZSBhbmNob3IsIGFuZCBtb3ZlIG9uIHRvIHRoZSBuZXh0IGdyb3VwLiAgVGhlcmUgaXMgYWx3YXlzIGF0XG4gIC8vIGxlYXN0IG9uZSBncm91cDsgdGhlIGxhc3QgZ3JvdXAgaXMgYW5jaG9yZWQgYnkgYSB2aXJ0dWFsIFwibnVsbFwiIGlkIGF0IHRoZVxuICAvLyBlbmQuXG5cbiAgLy8gQXN5bXB0b3RpY2FsbHk6IE8oTiBrKSB3aGVyZSBrIGlzIG51bWJlciBvZiBvcHMsIG9yIHBvdGVudGlhbGx5XG4gIC8vIE8oTiBsb2cgTikgaWYgaW5uZXIgbG9vcCBvZiBMQ1Mgd2VyZSBtYWRlIHRvIGJlIGJpbmFyeSBzZWFyY2guXG5cblxuICAvLy8vLy8vLyBMQ1MgKGxvbmdlc3QgY29tbW9uIHNlcXVlbmNlLCB3aXRoIHJlc3BlY3QgdG8gX2lkKVxuICAvLyAoc2VlIFdpa2lwZWRpYSBhcnRpY2xlIG9uIExvbmdlc3QgSW5jcmVhc2luZyBTdWJzZXF1ZW5jZSxcbiAgLy8gd2hlcmUgdGhlIExJUyBpcyB0YWtlbiBvZiB0aGUgc2VxdWVuY2Ugb2Ygb2xkIGluZGljZXMgb2YgdGhlXG4gIC8vIGRvY3MgaW4gbmV3X3Jlc3VsdHMpXG4gIC8vXG4gIC8vIHVubW92ZWQ6IHRoZSBvdXRwdXQgb2YgdGhlIGFsZ29yaXRobTsgbWVtYmVycyBvZiB0aGUgTENTLFxuICAvLyBpbiB0aGUgZm9ybSBvZiBpbmRpY2VzIGludG8gbmV3X3Jlc3VsdHNcbiAgdmFyIHVubW92ZWQgPSBbXTtcbiAgLy8gbWF4X3NlcV9sZW46IGxlbmd0aCBvZiBMQ1MgZm91bmQgc28gZmFyXG4gIHZhciBtYXhfc2VxX2xlbiA9IDA7XG4gIC8vIHNlcV9lbmRzW2ldOiB0aGUgaW5kZXggaW50byBuZXdfcmVzdWx0cyBvZiB0aGUgbGFzdCBkb2MgaW4gYVxuICAvLyBjb21tb24gc3Vic2VxdWVuY2Ugb2YgbGVuZ3RoIG9mIGkrMSA8PSBtYXhfc2VxX2xlblxuICB2YXIgTiA9IG5ld19yZXN1bHRzLmxlbmd0aDtcbiAgdmFyIHNlcV9lbmRzID0gbmV3IEFycmF5KE4pO1xuICAvLyBwdHJzOiAgdGhlIGNvbW1vbiBzdWJzZXF1ZW5jZSBlbmRpbmcgd2l0aCBuZXdfcmVzdWx0c1tuXSBleHRlbmRzXG4gIC8vIGEgY29tbW9uIHN1YnNlcXVlbmNlIGVuZGluZyB3aXRoIG5ld19yZXN1bHRzW3B0cltuXV0sIHVubGVzc1xuICAvLyBwdHJbbl0gaXMgLTEuXG4gIHZhciBwdHJzID0gbmV3IEFycmF5KE4pO1xuICAvLyB2aXJ0dWFsIHNlcXVlbmNlIG9mIG9sZCBpbmRpY2VzIG9mIG5ldyByZXN1bHRzXG4gIHZhciBvbGRfaWR4X3NlcSA9IGZ1bmN0aW9uKGlfbmV3KSB7XG4gICAgcmV0dXJuIG9sZF9pbmRleF9vZl9pZFtuZXdfcmVzdWx0c1tpX25ld10uX2lkXTtcbiAgfTtcbiAgLy8gZm9yIGVhY2ggaXRlbSBpbiBuZXdfcmVzdWx0cywgdXNlIGl0IHRvIGV4dGVuZCBhIGNvbW1vbiBzdWJzZXF1ZW5jZVxuICAvLyBvZiBsZW5ndGggaiA8PSBtYXhfc2VxX2xlblxuICBmb3IodmFyIGk9MDsgaTxOOyBpKyspIHtcbiAgICBpZiAob2xkX2luZGV4X29mX2lkW25ld19yZXN1bHRzW2ldLl9pZF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgdmFyIGogPSBtYXhfc2VxX2xlbjtcbiAgICAgIC8vIHRoaXMgaW5uZXIgbG9vcCB3b3VsZCB0cmFkaXRpb25hbGx5IGJlIGEgYmluYXJ5IHNlYXJjaCxcbiAgICAgIC8vIGJ1dCBzY2FubmluZyBiYWNrd2FyZHMgd2Ugd2lsbCBsaWtlbHkgZmluZCBhIHN1YnNlcSB0byBleHRlbmRcbiAgICAgIC8vIHByZXR0eSBzb29uLCBib3VuZGVkIGZvciBleGFtcGxlIGJ5IHRoZSB0b3RhbCBudW1iZXIgb2Ygb3BzLlxuICAgICAgLy8gSWYgdGhpcyB3ZXJlIHRvIGJlIGNoYW5nZWQgdG8gYSBiaW5hcnkgc2VhcmNoLCB3ZSdkIHN0aWxsIHdhbnRcbiAgICAgIC8vIHRvIHNjYW4gYmFja3dhcmRzIGEgYml0IGFzIGFuIG9wdGltaXphdGlvbi5cbiAgICAgIHdoaWxlIChqID4gMCkge1xuICAgICAgICBpZiAob2xkX2lkeF9zZXEoc2VxX2VuZHNbai0xXSkgPCBvbGRfaWR4X3NlcShpKSlcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgai0tO1xuICAgICAgfVxuXG4gICAgICBwdHJzW2ldID0gKGogPT09IDAgPyAtMSA6IHNlcV9lbmRzW2otMV0pO1xuICAgICAgc2VxX2VuZHNbal0gPSBpO1xuICAgICAgaWYgKGorMSA+IG1heF9zZXFfbGVuKVxuICAgICAgICBtYXhfc2VxX2xlbiA9IGorMTtcbiAgICB9XG4gIH1cblxuICAvLyBwdWxsIG91dCB0aGUgTENTL0xJUyBpbnRvIHVubW92ZWRcbiAgdmFyIGlkeCA9IChtYXhfc2VxX2xlbiA9PT0gMCA/IC0xIDogc2VxX2VuZHNbbWF4X3NlcV9sZW4tMV0pO1xuICB3aGlsZSAoaWR4ID49IDApIHtcbiAgICB1bm1vdmVkLnB1c2goaWR4KTtcbiAgICBpZHggPSBwdHJzW2lkeF07XG4gIH1cbiAgLy8gdGhlIHVubW92ZWQgaXRlbSBsaXN0IGlzIGJ1aWx0IGJhY2t3YXJkcywgc28gZml4IHRoYXRcbiAgdW5tb3ZlZC5yZXZlcnNlKCk7XG5cbiAgLy8gdGhlIGxhc3QgZ3JvdXAgaXMgYWx3YXlzIGFuY2hvcmVkIGJ5IHRoZSBlbmQgb2YgdGhlIHJlc3VsdCBsaXN0LCB3aGljaCBpc1xuICAvLyBhbiBpZCBvZiBcIm51bGxcIlxuICB1bm1vdmVkLnB1c2gobmV3X3Jlc3VsdHMubGVuZ3RoKTtcblxuICBvbGRfcmVzdWx0cy5mb3JFYWNoKGZ1bmN0aW9uIChkb2MpIHtcbiAgICBpZiAoIW5ld19wcmVzZW5jZV9vZl9pZFtkb2MuX2lkXSlcbiAgICAgIG9ic2VydmVyLnJlbW92ZWQgJiYgb2JzZXJ2ZXIucmVtb3ZlZChkb2MuX2lkKTtcbiAgfSk7XG5cbiAgLy8gZm9yIGVhY2ggZ3JvdXAgb2YgdGhpbmdzIGluIHRoZSBuZXdfcmVzdWx0cyB0aGF0IGlzIGFuY2hvcmVkIGJ5IGFuIHVubW92ZWRcbiAgLy8gZWxlbWVudCwgaXRlcmF0ZSB0aHJvdWdoIHRoZSB0aGluZ3MgYmVmb3JlIGl0LlxuICB2YXIgc3RhcnRPZkdyb3VwID0gMDtcbiAgdW5tb3ZlZC5mb3JFYWNoKGZ1bmN0aW9uIChlbmRPZkdyb3VwKSB7XG4gICAgdmFyIGdyb3VwSWQgPSBuZXdfcmVzdWx0c1tlbmRPZkdyb3VwXSA/IG5ld19yZXN1bHRzW2VuZE9mR3JvdXBdLl9pZCA6IG51bGw7XG4gICAgdmFyIG9sZERvYywgbmV3RG9jLCBmaWVsZHMsIHByb2plY3RlZE5ldywgcHJvamVjdGVkT2xkO1xuICAgIGZvciAodmFyIGkgPSBzdGFydE9mR3JvdXA7IGkgPCBlbmRPZkdyb3VwOyBpKyspIHtcbiAgICAgIG5ld0RvYyA9IG5ld19yZXN1bHRzW2ldO1xuICAgICAgaWYgKCFoYXNPd24uY2FsbChvbGRfaW5kZXhfb2ZfaWQsIG5ld0RvYy5faWQpKSB7XG4gICAgICAgIGZpZWxkcyA9IHByb2plY3Rpb25GbihuZXdEb2MpO1xuICAgICAgICBkZWxldGUgZmllbGRzLl9pZDtcbiAgICAgICAgb2JzZXJ2ZXIuYWRkZWRCZWZvcmUgJiYgb2JzZXJ2ZXIuYWRkZWRCZWZvcmUobmV3RG9jLl9pZCwgZmllbGRzLCBncm91cElkKTtcbiAgICAgICAgb2JzZXJ2ZXIuYWRkZWQgJiYgb2JzZXJ2ZXIuYWRkZWQobmV3RG9jLl9pZCwgZmllbGRzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIG1vdmVkXG4gICAgICAgIG9sZERvYyA9IG9sZF9yZXN1bHRzW29sZF9pbmRleF9vZl9pZFtuZXdEb2MuX2lkXV07XG4gICAgICAgIHByb2plY3RlZE5ldyA9IHByb2plY3Rpb25GbihuZXdEb2MpO1xuICAgICAgICBwcm9qZWN0ZWRPbGQgPSBwcm9qZWN0aW9uRm4ob2xkRG9jKTtcbiAgICAgICAgZmllbGRzID0gRGlmZlNlcXVlbmNlLm1ha2VDaGFuZ2VkRmllbGRzKHByb2plY3RlZE5ldywgcHJvamVjdGVkT2xkKTtcbiAgICAgICAgaWYgKCFpc09iakVtcHR5KGZpZWxkcykpIHtcbiAgICAgICAgICBvYnNlcnZlci5jaGFuZ2VkICYmIG9ic2VydmVyLmNoYW5nZWQobmV3RG9jLl9pZCwgZmllbGRzKTtcbiAgICAgICAgfVxuICAgICAgICBvYnNlcnZlci5tb3ZlZEJlZm9yZSAmJiBvYnNlcnZlci5tb3ZlZEJlZm9yZShuZXdEb2MuX2lkLCBncm91cElkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGdyb3VwSWQpIHtcbiAgICAgIG5ld0RvYyA9IG5ld19yZXN1bHRzW2VuZE9mR3JvdXBdO1xuICAgICAgb2xkRG9jID0gb2xkX3Jlc3VsdHNbb2xkX2luZGV4X29mX2lkW25ld0RvYy5faWRdXTtcbiAgICAgIHByb2plY3RlZE5ldyA9IHByb2plY3Rpb25GbihuZXdEb2MpO1xuICAgICAgcHJvamVjdGVkT2xkID0gcHJvamVjdGlvbkZuKG9sZERvYyk7XG4gICAgICBmaWVsZHMgPSBEaWZmU2VxdWVuY2UubWFrZUNoYW5nZWRGaWVsZHMocHJvamVjdGVkTmV3LCBwcm9qZWN0ZWRPbGQpO1xuICAgICAgaWYgKCFpc09iakVtcHR5KGZpZWxkcykpIHtcbiAgICAgICAgb2JzZXJ2ZXIuY2hhbmdlZCAmJiBvYnNlcnZlci5jaGFuZ2VkKG5ld0RvYy5faWQsIGZpZWxkcyk7XG4gICAgICB9XG4gICAgfVxuICAgIHN0YXJ0T2ZHcm91cCA9IGVuZE9mR3JvdXArMTtcbiAgfSk7XG5cblxufTtcblxuXG4vLyBHZW5lcmFsIGhlbHBlciBmb3IgZGlmZi1pbmcgdHdvIG9iamVjdHMuXG4vLyBjYWxsYmFja3MgaXMgYW4gb2JqZWN0IGxpa2Ugc286XG4vLyB7IGxlZnRPbmx5OiBmdW5jdGlvbiAoa2V5LCBsZWZ0VmFsdWUpIHsuLi59LFxuLy8gICByaWdodE9ubHk6IGZ1bmN0aW9uIChrZXksIHJpZ2h0VmFsdWUpIHsuLi59LFxuLy8gICBib3RoOiBmdW5jdGlvbiAoa2V5LCBsZWZ0VmFsdWUsIHJpZ2h0VmFsdWUpIHsuLi59LFxuLy8gfVxuRGlmZlNlcXVlbmNlLmRpZmZPYmplY3RzID0gZnVuY3Rpb24gKGxlZnQsIHJpZ2h0LCBjYWxsYmFja3MpIHtcbiAgT2JqZWN0LmtleXMobGVmdCkuZm9yRWFjaChrZXkgPT4ge1xuICAgIGNvbnN0IGxlZnRWYWx1ZSA9IGxlZnRba2V5XTtcbiAgICBpZiAoaGFzT3duLmNhbGwocmlnaHQsIGtleSkpIHtcbiAgICAgIGNhbGxiYWNrcy5ib3RoICYmIGNhbGxiYWNrcy5ib3RoKGtleSwgbGVmdFZhbHVlLCByaWdodFtrZXldKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FsbGJhY2tzLmxlZnRPbmx5ICYmIGNhbGxiYWNrcy5sZWZ0T25seShrZXksIGxlZnRWYWx1ZSk7XG4gICAgfVxuICB9KTtcblxuICBpZiAoY2FsbGJhY2tzLnJpZ2h0T25seSkge1xuICAgIE9iamVjdC5rZXlzKHJpZ2h0KS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICBjb25zdCByaWdodFZhbHVlID0gcmlnaHRba2V5XTtcbiAgICAgIGlmICghIGhhc093bi5jYWxsKGxlZnQsIGtleSkpIHtcbiAgICAgICAgY2FsbGJhY2tzLnJpZ2h0T25seShrZXksIHJpZ2h0VmFsdWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59O1xuXG5EaWZmU2VxdWVuY2UuZGlmZk1hcHMgPSBmdW5jdGlvbiAobGVmdCwgcmlnaHQsIGNhbGxiYWNrcykge1xuICBsZWZ0LmZvckVhY2goZnVuY3Rpb24gKGxlZnRWYWx1ZSwga2V5KSB7XG4gICAgaWYgKHJpZ2h0LmhhcyhrZXkpKXtcbiAgICAgIGNhbGxiYWNrcy5ib3RoICYmIGNhbGxiYWNrcy5ib3RoKGtleSwgbGVmdFZhbHVlLCByaWdodC5nZXQoa2V5KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrcy5sZWZ0T25seSAmJiBjYWxsYmFja3MubGVmdE9ubHkoa2V5LCBsZWZ0VmFsdWUpO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKGNhbGxiYWNrcy5yaWdodE9ubHkpIHtcbiAgICByaWdodC5mb3JFYWNoKGZ1bmN0aW9uIChyaWdodFZhbHVlLCBrZXkpIHtcbiAgICAgIGlmICghbGVmdC5oYXMoa2V5KSl7XG4gICAgICAgIGNhbGxiYWNrcy5yaWdodE9ubHkoa2V5LCByaWdodFZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufTtcblxuXG5EaWZmU2VxdWVuY2UubWFrZUNoYW5nZWRGaWVsZHMgPSBmdW5jdGlvbiAobmV3RG9jLCBvbGREb2MpIHtcbiAgdmFyIGZpZWxkcyA9IHt9O1xuICBEaWZmU2VxdWVuY2UuZGlmZk9iamVjdHMob2xkRG9jLCBuZXdEb2MsIHtcbiAgICBsZWZ0T25seTogZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICAgIGZpZWxkc1trZXldID0gdW5kZWZpbmVkO1xuICAgIH0sXG4gICAgcmlnaHRPbmx5OiBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICAgICAgZmllbGRzW2tleV0gPSB2YWx1ZTtcbiAgICB9LFxuICAgIGJvdGg6IGZ1bmN0aW9uIChrZXksIGxlZnRWYWx1ZSwgcmlnaHRWYWx1ZSkge1xuICAgICAgaWYgKCFFSlNPTi5lcXVhbHMobGVmdFZhbHVlLCByaWdodFZhbHVlKSlcbiAgICAgICAgZmllbGRzW2tleV0gPSByaWdodFZhbHVlO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBmaWVsZHM7XG59O1xuXG5EaWZmU2VxdWVuY2UuYXBwbHlDaGFuZ2VzID0gZnVuY3Rpb24gKGRvYywgY2hhbmdlRmllbGRzKSB7XG4gIE9iamVjdC5rZXlzKGNoYW5nZUZpZWxkcykuZm9yRWFjaChrZXkgPT4ge1xuICAgIGNvbnN0IHZhbHVlID0gY2hhbmdlRmllbGRzW2tleV07XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgZGVsZXRlIGRvY1trZXldO1xuICAgIH0gZWxzZSB7XG4gICAgICBkb2Nba2V5XSA9IHZhbHVlO1xuICAgIH1cbiAgfSk7XG59O1xuXG4iXX0=
