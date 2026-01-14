Package["core-runtime"].queue("binary-heap",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var IdMap = Package['id-map'].IdMap;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var MaxHeap, MinHeap, MinMaxHeap;

var require = meteorInstall({"node_modules":{"meteor":{"binary-heap":{"binary-heap.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/binary-heap/binary-heap.js                                                                               //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.link('./max-heap.js',{MaxHeap:"MaxHeap"},0);module.link('./min-heap.js',{MinHeap:"MinHeap"},1);module.link('./min-max-heap.js',{MinMaxHeap:"MinMaxHeap"},2);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();


//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"max-heap.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/binary-heap/max-heap.js                                                                                  //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.export({MaxHeap:()=>MaxHeap});// Constructor of Heap
// - comparator - Function - given two items returns a number
// - options:
//   - initData - Array - Optional - the initial data in a format:
//        Object:
//          - id - String - unique id of the item
//          - value - Any - the data value
//      each value is retained
//   - IdMap - Constructor - Optional - custom IdMap class to store id->index
//       mappings internally. Standard IdMap is used by default.
class MaxHeap {
    // Builds a new heap in-place in linear time based on passed data
    _initFromData(data) {
        this._heap = data.map(({ id, value })=>({
                id,
                value
            }));
        data.forEach(({ id }, i)=>this._heapIdx.set(id, i));
        if (!data.length) {
            return;
        }
        // start from the first non-leaf - the parent of the last leaf
        for(let i = parentIdx(data.length - 1); i >= 0; i--){
            this._downHeap(i);
        }
    }
    _downHeap(idx) {
        while(leftChildIdx(idx) < this.size()){
            const left = leftChildIdx(idx);
            const right = rightChildIdx(idx);
            let largest = idx;
            if (left < this.size()) {
                largest = this._maxIndex(largest, left);
            }
            if (right < this.size()) {
                largest = this._maxIndex(largest, right);
            }
            if (largest === idx) {
                break;
            }
            this._swap(largest, idx);
            idx = largest;
        }
    }
    _upHeap(idx) {
        while(idx > 0){
            const parent = parentIdx(idx);
            if (this._maxIndex(parent, idx) === idx) {
                this._swap(parent, idx);
                idx = parent;
            } else {
                break;
            }
        }
    }
    _maxIndex(idxA, idxB) {
        const valueA = this._get(idxA);
        const valueB = this._get(idxB);
        return this._comparator(valueA, valueB) >= 0 ? idxA : idxB;
    }
    // Internal: gets raw data object placed on idxth place in heap
    _get(idx) {
        return this._heap[idx].value;
    }
    _swap(idxA, idxB) {
        const recA = this._heap[idxA];
        const recB = this._heap[idxB];
        this._heapIdx.set(recA.id, idxB);
        this._heapIdx.set(recB.id, idxA);
        this._heap[idxA] = recB;
        this._heap[idxB] = recA;
    }
    get(id) {
        return this.has(id) ? this._get(this._heapIdx.get(id)) : null;
    }
    set(id, value) {
        if (this.has(id)) {
            if (this.get(id) === value) {
                return;
            }
            const idx = this._heapIdx.get(id);
            this._heap[idx].value = value;
            // Fix the new value's position
            // Either bubble new value up if it is greater than its parent
            this._upHeap(idx);
            // or bubble it down if it is smaller than one of its children
            this._downHeap(idx);
        } else {
            this._heapIdx.set(id, this._heap.length);
            this._heap.push({
                id,
                value
            });
            this._upHeap(this._heap.length - 1);
        }
    }
    remove(id) {
        if (this.has(id)) {
            const last = this._heap.length - 1;
            const idx = this._heapIdx.get(id);
            if (idx !== last) {
                this._swap(idx, last);
                this._heap.pop();
                this._heapIdx.remove(id);
                // Fix the swapped value's position
                this._upHeap(idx);
                this._downHeap(idx);
            } else {
                this._heap.pop();
                this._heapIdx.remove(id);
            }
        }
    }
    has(id) {
        return this._heapIdx.has(id);
    }
    empty() {
        return !this.size();
    }
    clear() {
        this._heap = [];
        this._heapIdx.clear();
    }
    // iterate over values in no particular order
    forEach(iterator) {
        this._heap.forEach((obj)=>iterator(obj.value, obj.id));
    }
    size() {
        return this._heap.length;
    }
    setDefault(id, def) {
        if (this.has(id)) {
            return this.get(id);
        }
        this.set(id, def);
        return def;
    }
    clone() {
        const clone = new MaxHeap(this._comparator, this._heap);
        return clone;
    }
    maxElementId() {
        return this.size() ? this._heap[0].id : null;
    }
    _selfCheck() {
        for(let i = 1; i < this._heap.length; i++){
            if (this._maxIndex(parentIdx(i), i) !== parentIdx(i)) {
                throw new Error(`An item with id ${this._heap[i].id}` + " has a parent younger than it: " + this._heap[parentIdx(i)].id);
            }
        }
    }
    constructor(comparator, options = {}){
        if (typeof comparator !== 'function') {
            throw new Error('Passed comparator is invalid, should be a comparison function');
        }
        // a C-style comparator that is given two values and returns a number,
        // negative if the first value is less than the second, positive if the second
        // value is greater than the first and zero if they are equal.
        this._comparator = comparator;
        if (!options.IdMap) {
            options.IdMap = IdMap;
        }
        // _heapIdx maps an id to an index in the Heap array the corresponding value
        // is located on.
        this._heapIdx = new options.IdMap;
        // The Heap data-structure implemented as a 0-based contiguous array where
        // every item on index idx is a node in a complete binary tree. Every node can
        // have children on indexes idx*2+1 and idx*2+2, except for the leaves. Every
        // node has a parent on index (idx-1)/2;
        this._heap = [];
        // If the initial array is passed, we can build the heap in linear time
        // complexity (O(N)) compared to linearithmic time complexity (O(nlogn)) if
        // we push elements one by one.
        if (Array.isArray(options.initData)) {
            this._initFromData(options.initData);
        }
    }
}
const leftChildIdx = (i)=>i * 2 + 1;
const rightChildIdx = (i)=>i * 2 + 2;
const parentIdx = (i)=>i - 1 >> 1;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"min-heap.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/binary-heap/min-heap.js                                                                                  //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({MinHeap:()=>MinHeap});let MaxHeap;module.link('./max-heap.js',{MaxHeap(v){MaxHeap=v}},0);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
class MinHeap extends MaxHeap {
    maxElementId() {
        throw new Error("Cannot call maxElementId on MinHeap");
    }
    minElementId() {
        return super.maxElementId();
    }
    constructor(comparator, options){
        super((a, b)=>-comparator(a, b), options);
    }
}
;
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"min-max-heap.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/binary-heap/min-max-heap.js                                                                              //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({MinMaxHeap:()=>MinMaxHeap});let MaxHeap;module.link('./max-heap.js',{MaxHeap(v){MaxHeap=v}},0);let MinHeap;module.link('./min-heap.js',{MinHeap(v){MinHeap=v}},1);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();

// This implementation of Min/Max-Heap is just a subclass of Max-Heap
// with a Min-Heap as an encapsulated property.
//
// Most of the operations are just proxy methods to call the same method on both
// heaps.
//
// This implementation takes 2*N memory but is fairly simple to write and
// understand. And the constant factor of a simple Heap is usually smaller
// compared to other two-way priority queues like Min/Max Heaps
// (http://www.cs.otago.ac.nz/staffpriv/mike/Papers/MinMaxHeaps/MinMaxHeaps.pdf)
// and Interval Heaps
// (http://www.cise.ufl.edu/~sahni/dsaac/enrich/c13/double.htm)
class MinMaxHeap extends MaxHeap {
    set(...args) {
        super.set(...args);
        this._minHeap.set(...args);
    }
    remove(...args) {
        super.remove(...args);
        this._minHeap.remove(...args);
    }
    clear(...args) {
        super.clear(...args);
        this._minHeap.clear(...args);
    }
    setDefault(...args) {
        super.setDefault(...args);
        return this._minHeap.setDefault(...args);
    }
    clone() {
        const clone = new MinMaxHeap(this._comparator, this._heap);
        return clone;
    }
    minElementId() {
        return this._minHeap.minElementId();
    }
    constructor(comparator, options){
        super(comparator, options);
        this._minHeap = new MinHeap(comparator, options);
    }
}
;
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
  export: function () { return {
      MaxHeap: MaxHeap,
      MinHeap: MinHeap,
      MinMaxHeap: MinMaxHeap
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/binary-heap/binary-heap.js"
  ],
  mainModulePath: "/node_modules/meteor/binary-heap/binary-heap.js"
}});

//# sourceURL=meteor://💻app/packages/binary-heap.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYmluYXJ5LWhlYXAvYmluYXJ5LWhlYXAuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL2JpbmFyeS1oZWFwL21heC1oZWFwLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9iaW5hcnktaGVhcC9taW4taGVhcC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYmluYXJ5LWhlYXAvbWluLW1heC1oZWFwLmpzIl0sIm5hbWVzIjpbIk1heEhlYXAiLCJfaW5pdEZyb21EYXRhIiwiZGF0YSIsIl9oZWFwIiwibWFwIiwiaWQiLCJ2YWx1ZSIsImZvckVhY2giLCJpIiwiX2hlYXBJZHgiLCJzZXQiLCJsZW5ndGgiLCJwYXJlbnRJZHgiLCJfZG93bkhlYXAiLCJpZHgiLCJsZWZ0Q2hpbGRJZHgiLCJzaXplIiwibGVmdCIsInJpZ2h0IiwicmlnaHRDaGlsZElkeCIsImxhcmdlc3QiLCJfbWF4SW5kZXgiLCJfc3dhcCIsIl91cEhlYXAiLCJwYXJlbnQiLCJpZHhBIiwiaWR4QiIsInZhbHVlQSIsIl9nZXQiLCJ2YWx1ZUIiLCJfY29tcGFyYXRvciIsInJlY0EiLCJyZWNCIiwiZ2V0IiwiaGFzIiwicHVzaCIsInJlbW92ZSIsImxhc3QiLCJwb3AiLCJlbXB0eSIsImNsZWFyIiwiaXRlcmF0b3IiLCJvYmoiLCJzZXREZWZhdWx0IiwiZGVmIiwiY2xvbmUiLCJtYXhFbGVtZW50SWQiLCJfc2VsZkNoZWNrIiwiRXJyb3IiLCJjb21wYXJhdG9yIiwib3B0aW9ucyIsIklkTWFwIiwiQXJyYXkiLCJpc0FycmF5IiwiaW5pdERhdGEiLCJNaW5IZWFwIiwibWluRWxlbWVudElkIiwiYSIsImIiLCJNaW5NYXhIZWFwIiwiYXJncyIsIl9taW5IZWFwIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxTQUFTQSxPQUFPLFFBQVEsZ0JBQWdCO0FBQ0E7QUFDTzs7Ozs7Ozs7Ozs7OztBQ0YvQyxz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Q3JDO0lBRUFmLFFBQVE7UUFDTixNQUFNQSxRQUFRLElBQUljLFdBQVcsSUFBSSxDQUFDN0IsV0FBVyxFQUFFLElBQUksQ0FBQzNCLEtBQUs7UUFDekQsT0FBTzBDO0lBQ1Q7SUFFQVcsZUFBZTtRQUNiLE9BQU8sSUFBSSxDQUFDSyxRQUFRLENBQUNMLFlBQVk7SUFDbkM7SUFoQ0EsWUFBWVAsVUFBVSxFQUFFQyxPQUFPLENBQUU7UUFDL0IsS0FBSyxDQUFDRCxZQUFZQztRQUNsQixJQUFJLENBQUNXLFFBQVEsR0FBRyxJQUFJTixRQUFRTixZQUFZQztJQUMxQztBQStCRiIsImZpbGUiOiIvcGFja2FnZXMvYmluYXJ5LWhlYXAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgeyBNYXhIZWFwIH0gZnJvbSAnLi9tYXgtaGVhcC5qcyc7XG5leHBvcnQgeyBNaW5IZWFwIH0gZnJvbSAnLi9taW4taGVhcC5qcyc7XG5leHBvcnQgeyBNaW5NYXhIZWFwIH0gZnJvbSAnLi9taW4tbWF4LWhlYXAuanMnO1xuIiwiLy8gQ29uc3RydWN0b3Igb2YgSGVhcFxuLy8gLSBjb21wYXJhdG9yIC0gRnVuY3Rpb24gLSBnaXZlbiB0d28gaXRlbXMgcmV0dXJucyBhIG51bWJlclxuLy8gLSBvcHRpb25zOlxuLy8gICAtIGluaXREYXRhIC0gQXJyYXkgLSBPcHRpb25hbCAtIHRoZSBpbml0aWFsIGRhdGEgaW4gYSBmb3JtYXQ6XG4vLyAgICAgICAgT2JqZWN0OlxuLy8gICAgICAgICAgLSBpZCAtIFN0cmluZyAtIHVuaXF1ZSBpZCBvZiB0aGUgaXRlbVxuLy8gICAgICAgICAgLSB2YWx1ZSAtIEFueSAtIHRoZSBkYXRhIHZhbHVlXG4vLyAgICAgIGVhY2ggdmFsdWUgaXMgcmV0YWluZWRcbi8vICAgLSBJZE1hcCAtIENvbnN0cnVjdG9yIC0gT3B0aW9uYWwgLSBjdXN0b20gSWRNYXAgY2xhc3MgdG8gc3RvcmUgaWQtPmluZGV4XG4vLyAgICAgICBtYXBwaW5ncyBpbnRlcm5hbGx5LiBTdGFuZGFyZCBJZE1hcCBpcyB1c2VkIGJ5IGRlZmF1bHQuXG5leHBvcnQgY2xhc3MgTWF4SGVhcCB7IFxuICBjb25zdHJ1Y3Rvcihjb21wYXJhdG9yLCBvcHRpb25zID0ge30pIHtcbiAgICBpZiAodHlwZW9mIGNvbXBhcmF0b3IgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignUGFzc2VkIGNvbXBhcmF0b3IgaXMgaW52YWxpZCwgc2hvdWxkIGJlIGEgY29tcGFyaXNvbiBmdW5jdGlvbicpO1xuICAgIH1cblxuICAgIC8vIGEgQy1zdHlsZSBjb21wYXJhdG9yIHRoYXQgaXMgZ2l2ZW4gdHdvIHZhbHVlcyBhbmQgcmV0dXJucyBhIG51bWJlcixcbiAgICAvLyBuZWdhdGl2ZSBpZiB0aGUgZmlyc3QgdmFsdWUgaXMgbGVzcyB0aGFuIHRoZSBzZWNvbmQsIHBvc2l0aXZlIGlmIHRoZSBzZWNvbmRcbiAgICAvLyB2YWx1ZSBpcyBncmVhdGVyIHRoYW4gdGhlIGZpcnN0IGFuZCB6ZXJvIGlmIHRoZXkgYXJlIGVxdWFsLlxuICAgIHRoaXMuX2NvbXBhcmF0b3IgPSBjb21wYXJhdG9yO1xuXG4gICAgaWYgKCEgb3B0aW9ucy5JZE1hcCkge1xuICAgICAgb3B0aW9ucy5JZE1hcCA9IElkTWFwO1xuICAgIH1cblxuICAgIC8vIF9oZWFwSWR4IG1hcHMgYW4gaWQgdG8gYW4gaW5kZXggaW4gdGhlIEhlYXAgYXJyYXkgdGhlIGNvcnJlc3BvbmRpbmcgdmFsdWVcbiAgICAvLyBpcyBsb2NhdGVkIG9uLlxuICAgIHRoaXMuX2hlYXBJZHggPSBuZXcgb3B0aW9ucy5JZE1hcDtcblxuICAgIC8vIFRoZSBIZWFwIGRhdGEtc3RydWN0dXJlIGltcGxlbWVudGVkIGFzIGEgMC1iYXNlZCBjb250aWd1b3VzIGFycmF5IHdoZXJlXG4gICAgLy8gZXZlcnkgaXRlbSBvbiBpbmRleCBpZHggaXMgYSBub2RlIGluIGEgY29tcGxldGUgYmluYXJ5IHRyZWUuIEV2ZXJ5IG5vZGUgY2FuXG4gICAgLy8gaGF2ZSBjaGlsZHJlbiBvbiBpbmRleGVzIGlkeCoyKzEgYW5kIGlkeCoyKzIsIGV4Y2VwdCBmb3IgdGhlIGxlYXZlcy4gRXZlcnlcbiAgICAvLyBub2RlIGhhcyBhIHBhcmVudCBvbiBpbmRleCAoaWR4LTEpLzI7XG4gICAgdGhpcy5faGVhcCA9IFtdO1xuXG4gICAgLy8gSWYgdGhlIGluaXRpYWwgYXJyYXkgaXMgcGFzc2VkLCB3ZSBjYW4gYnVpbGQgdGhlIGhlYXAgaW4gbGluZWFyIHRpbWVcbiAgICAvLyBjb21wbGV4aXR5IChPKE4pKSBjb21wYXJlZCB0byBsaW5lYXJpdGhtaWMgdGltZSBjb21wbGV4aXR5IChPKG5sb2duKSkgaWZcbiAgICAvLyB3ZSBwdXNoIGVsZW1lbnRzIG9uZSBieSBvbmUuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob3B0aW9ucy5pbml0RGF0YSkpIHtcbiAgICAgIHRoaXMuX2luaXRGcm9tRGF0YShvcHRpb25zLmluaXREYXRhKTtcbiAgICB9XG4gIH1cblxuICAvLyBCdWlsZHMgYSBuZXcgaGVhcCBpbi1wbGFjZSBpbiBsaW5lYXIgdGltZSBiYXNlZCBvbiBwYXNzZWQgZGF0YVxuICBfaW5pdEZyb21EYXRhKGRhdGEpIHtcbiAgICB0aGlzLl9oZWFwID0gZGF0YS5tYXAoKHsgaWQsIHZhbHVlIH0pID0+ICh7IGlkLCB2YWx1ZSB9KSk7XG5cbiAgICBkYXRhLmZvckVhY2goKHsgaWQgfSwgaSkgPT4gdGhpcy5faGVhcElkeC5zZXQoaWQsIGkpKTtcblxuICAgIGlmICghIGRhdGEubGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gc3RhcnQgZnJvbSB0aGUgZmlyc3Qgbm9uLWxlYWYgLSB0aGUgcGFyZW50IG9mIHRoZSBsYXN0IGxlYWZcbiAgICBmb3IgKGxldCBpID0gcGFyZW50SWR4KGRhdGEubGVuZ3RoIC0gMSk7IGkgPj0gMDsgaS0tKSB7XG4gICAgICB0aGlzLl9kb3duSGVhcChpKTtcbiAgICB9XG4gIH1cblxuICBfZG93bkhlYXAoaWR4KSB7XG4gICAgd2hpbGUgKGxlZnRDaGlsZElkeChpZHgpIDwgdGhpcy5zaXplKCkpIHtcbiAgICAgIGNvbnN0IGxlZnQgPSBsZWZ0Q2hpbGRJZHgoaWR4KTtcbiAgICAgIGNvbnN0IHJpZ2h0ID0gcmlnaHRDaGlsZElkeChpZHgpO1xuICAgICAgbGV0IGxhcmdlc3QgPSBpZHg7XG5cbiAgICAgIGlmIChsZWZ0IDwgdGhpcy5zaXplKCkpIHtcbiAgICAgICAgbGFyZ2VzdCA9IHRoaXMuX21heEluZGV4KGxhcmdlc3QsIGxlZnQpO1xuICAgICAgfVxuXG4gICAgICBpZiAocmlnaHQgPCB0aGlzLnNpemUoKSkge1xuICAgICAgICBsYXJnZXN0ID0gdGhpcy5fbWF4SW5kZXgobGFyZ2VzdCwgcmlnaHQpO1xuICAgICAgfVxuXG4gICAgICBpZiAobGFyZ2VzdCA9PT0gaWR4KSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9zd2FwKGxhcmdlc3QsIGlkeCk7XG4gICAgICBpZHggPSBsYXJnZXN0O1xuICAgIH1cbiAgfVxuXG4gIF91cEhlYXAoaWR4KSB7XG4gICAgd2hpbGUgKGlkeCA+IDApIHtcbiAgICAgIGNvbnN0IHBhcmVudCA9IHBhcmVudElkeChpZHgpO1xuICAgICAgaWYgKHRoaXMuX21heEluZGV4KHBhcmVudCwgaWR4KSA9PT0gaWR4KSB7XG4gICAgICAgIHRoaXMuX3N3YXAocGFyZW50LCBpZHgpXG4gICAgICAgIGlkeCA9IHBhcmVudDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIF9tYXhJbmRleChpZHhBLCBpZHhCKSB7XG4gICAgY29uc3QgdmFsdWVBID0gdGhpcy5fZ2V0KGlkeEEpO1xuICAgIGNvbnN0IHZhbHVlQiA9IHRoaXMuX2dldChpZHhCKTtcbiAgICByZXR1cm4gdGhpcy5fY29tcGFyYXRvcih2YWx1ZUEsIHZhbHVlQikgPj0gMCA/IGlkeEEgOiBpZHhCO1xuICB9XG5cbiAgLy8gSW50ZXJuYWw6IGdldHMgcmF3IGRhdGEgb2JqZWN0IHBsYWNlZCBvbiBpZHh0aCBwbGFjZSBpbiBoZWFwXG4gIF9nZXQoaWR4KSB7XG4gICAgcmV0dXJuIHRoaXMuX2hlYXBbaWR4XS52YWx1ZTtcbiAgfVxuXG4gIF9zd2FwKGlkeEEsIGlkeEIpIHtcbiAgICBjb25zdCByZWNBID0gdGhpcy5faGVhcFtpZHhBXTtcbiAgICBjb25zdCByZWNCID0gdGhpcy5faGVhcFtpZHhCXTtcblxuICAgIHRoaXMuX2hlYXBJZHguc2V0KHJlY0EuaWQsIGlkeEIpO1xuICAgIHRoaXMuX2hlYXBJZHguc2V0KHJlY0IuaWQsIGlkeEEpO1xuXG4gICAgdGhpcy5faGVhcFtpZHhBXSA9IHJlY0I7XG4gICAgdGhpcy5faGVhcFtpZHhCXSA9IHJlY0E7XG4gIH1cblxuICBnZXQoaWQpIHtcbiAgICByZXR1cm4gdGhpcy5oYXMoaWQpID9cbiAgICAgIHRoaXMuX2dldCh0aGlzLl9oZWFwSWR4LmdldChpZCkpIDpcbiAgICAgIG51bGw7XG4gIH1cblxuICBzZXQoaWQsIHZhbHVlKSB7XG4gICAgaWYgKHRoaXMuaGFzKGlkKSkge1xuICAgICAgaWYgKHRoaXMuZ2V0KGlkKSA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpZHggPSB0aGlzLl9oZWFwSWR4LmdldChpZCk7XG4gICAgICB0aGlzLl9oZWFwW2lkeF0udmFsdWUgPSB2YWx1ZTtcblxuICAgICAgLy8gRml4IHRoZSBuZXcgdmFsdWUncyBwb3NpdGlvblxuICAgICAgLy8gRWl0aGVyIGJ1YmJsZSBuZXcgdmFsdWUgdXAgaWYgaXQgaXMgZ3JlYXRlciB0aGFuIGl0cyBwYXJlbnRcbiAgICAgIHRoaXMuX3VwSGVhcChpZHgpO1xuICAgICAgLy8gb3IgYnViYmxlIGl0IGRvd24gaWYgaXQgaXMgc21hbGxlciB0aGFuIG9uZSBvZiBpdHMgY2hpbGRyZW5cbiAgICAgIHRoaXMuX2Rvd25IZWFwKGlkeCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2hlYXBJZHguc2V0KGlkLCB0aGlzLl9oZWFwLmxlbmd0aCk7XG4gICAgICB0aGlzLl9oZWFwLnB1c2goeyBpZCwgdmFsdWUgfSk7XG4gICAgICB0aGlzLl91cEhlYXAodGhpcy5faGVhcC5sZW5ndGggLSAxKTtcbiAgICB9XG4gIH1cblxuICByZW1vdmUoaWQpIHtcbiAgICBpZiAodGhpcy5oYXMoaWQpKSB7XG4gICAgICBjb25zdCBsYXN0ID0gdGhpcy5faGVhcC5sZW5ndGggLSAxO1xuICAgICAgY29uc3QgaWR4ID0gdGhpcy5faGVhcElkeC5nZXQoaWQpO1xuXG4gICAgICBpZiAoaWR4ICE9PSBsYXN0KSB7XG4gICAgICAgIHRoaXMuX3N3YXAoaWR4LCBsYXN0KTtcbiAgICAgICAgdGhpcy5faGVhcC5wb3AoKTtcbiAgICAgICAgdGhpcy5faGVhcElkeC5yZW1vdmUoaWQpO1xuXG4gICAgICAgIC8vIEZpeCB0aGUgc3dhcHBlZCB2YWx1ZSdzIHBvc2l0aW9uXG4gICAgICAgIHRoaXMuX3VwSGVhcChpZHgpO1xuICAgICAgICB0aGlzLl9kb3duSGVhcChpZHgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5faGVhcC5wb3AoKTtcbiAgICAgICAgdGhpcy5faGVhcElkeC5yZW1vdmUoaWQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGhhcyhpZCkge1xuICAgIHJldHVybiB0aGlzLl9oZWFwSWR4LmhhcyhpZCk7XG4gIH1cblxuICBlbXB0eSgpIHtcbiAgICByZXR1cm4gIXRoaXMuc2l6ZSgpO1xuICB9XG5cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy5faGVhcCA9IFtdO1xuICAgIHRoaXMuX2hlYXBJZHguY2xlYXIoKTtcbiAgfVxuXG4gIC8vIGl0ZXJhdGUgb3ZlciB2YWx1ZXMgaW4gbm8gcGFydGljdWxhciBvcmRlclxuICBmb3JFYWNoKGl0ZXJhdG9yKSB7XG4gICAgdGhpcy5faGVhcC5mb3JFYWNoKG9iaiA9PiBpdGVyYXRvcihvYmoudmFsdWUsIG9iai5pZCkpO1xuICB9XG5cbiAgc2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5faGVhcC5sZW5ndGg7XG4gIH1cblxuICBzZXREZWZhdWx0KGlkLCBkZWYpIHtcbiAgICBpZiAodGhpcy5oYXMoaWQpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXQoaWQpO1xuICAgIH1cblxuICAgIHRoaXMuc2V0KGlkLCBkZWYpO1xuICAgIHJldHVybiBkZWY7XG4gIH1cblxuICBjbG9uZSgpIHtcbiAgICBjb25zdCBjbG9uZSA9IG5ldyBNYXhIZWFwKHRoaXMuX2NvbXBhcmF0b3IsIHRoaXMuX2hlYXApO1xuICAgIHJldHVybiBjbG9uZTtcbiAgfVxuXG4gIG1heEVsZW1lbnRJZCgpIHtcbiAgICByZXR1cm4gdGhpcy5zaXplKCkgPyB0aGlzLl9oZWFwWzBdLmlkIDogbnVsbDtcbiAgfVxuXG4gIF9zZWxmQ2hlY2soKSB7XG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCB0aGlzLl9oZWFwLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAodGhpcy5fbWF4SW5kZXgocGFyZW50SWR4KGkpLCBpKSAhPT0gcGFyZW50SWR4KGkpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBBbiBpdGVtIHdpdGggaWQgJHt0aGlzLl9oZWFwW2ldLmlkfWAgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICBcIiBoYXMgYSBwYXJlbnQgeW91bmdlciB0aGFuIGl0OiBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2hlYXBbcGFyZW50SWR4KGkpXS5pZCk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmNvbnN0IGxlZnRDaGlsZElkeCA9IGkgPT4gaSAqIDIgKyAxO1xuY29uc3QgcmlnaHRDaGlsZElkeCA9IGkgPT4gaSAqIDIgKyAyO1xuY29uc3QgcGFyZW50SWR4ID0gaSA9PiAoaSAtIDEpID4+IDE7XG4iLCJpbXBvcnQgeyBNYXhIZWFwIH0gZnJvbSAnLi9tYXgtaGVhcC5qcyc7XG5cbmV4cG9ydCBjbGFzcyBNaW5IZWFwIGV4dGVuZHMgTWF4SGVhcCB7XG4gIGNvbnN0cnVjdG9yKGNvbXBhcmF0b3IsIG9wdGlvbnMpIHtcbiAgICBzdXBlcigoYSwgYikgPT4gLWNvbXBhcmF0b3IoYSwgYiksIG9wdGlvbnMpO1xuICB9XG5cbiAgbWF4RWxlbWVudElkKCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBjYWxsIG1heEVsZW1lbnRJZCBvbiBNaW5IZWFwXCIpO1xuICB9XG5cbiAgbWluRWxlbWVudElkKCkge1xuICAgIHJldHVybiBzdXBlci5tYXhFbGVtZW50SWQoKTtcbiAgfVxufTtcbiIsImltcG9ydCB7IE1heEhlYXAgfSBmcm9tICcuL21heC1oZWFwLmpzJztcbmltcG9ydCB7IE1pbkhlYXAgfSBmcm9tICcuL21pbi1oZWFwLmpzJztcblxuLy8gVGhpcyBpbXBsZW1lbnRhdGlvbiBvZiBNaW4vTWF4LUhlYXAgaXMganVzdCBhIHN1YmNsYXNzIG9mIE1heC1IZWFwXG4vLyB3aXRoIGEgTWluLUhlYXAgYXMgYW4gZW5jYXBzdWxhdGVkIHByb3BlcnR5LlxuLy9cbi8vIE1vc3Qgb2YgdGhlIG9wZXJhdGlvbnMgYXJlIGp1c3QgcHJveHkgbWV0aG9kcyB0byBjYWxsIHRoZSBzYW1lIG1ldGhvZCBvbiBib3RoXG4vLyBoZWFwcy5cbi8vXG4vLyBUaGlzIGltcGxlbWVudGF0aW9uIHRha2VzIDIqTiBtZW1vcnkgYnV0IGlzIGZhaXJseSBzaW1wbGUgdG8gd3JpdGUgYW5kXG4vLyB1bmRlcnN0YW5kLiBBbmQgdGhlIGNvbnN0YW50IGZhY3RvciBvZiBhIHNpbXBsZSBIZWFwIGlzIHVzdWFsbHkgc21hbGxlclxuLy8gY29tcGFyZWQgdG8gb3RoZXIgdHdvLXdheSBwcmlvcml0eSBxdWV1ZXMgbGlrZSBNaW4vTWF4IEhlYXBzXG4vLyAoaHR0cDovL3d3dy5jcy5vdGFnby5hYy5uei9zdGFmZnByaXYvbWlrZS9QYXBlcnMvTWluTWF4SGVhcHMvTWluTWF4SGVhcHMucGRmKVxuLy8gYW5kIEludGVydmFsIEhlYXBzXG4vLyAoaHR0cDovL3d3dy5jaXNlLnVmbC5lZHUvfnNhaG5pL2RzYWFjL2VucmljaC9jMTMvZG91YmxlLmh0bSlcbmV4cG9ydCBjbGFzcyBNaW5NYXhIZWFwIGV4dGVuZHMgTWF4SGVhcCB7XG4gIGNvbnN0cnVjdG9yKGNvbXBhcmF0b3IsIG9wdGlvbnMpIHtcbiAgICBzdXBlcihjb21wYXJhdG9yLCBvcHRpb25zKTtcbiAgICB0aGlzLl9taW5IZWFwID0gbmV3IE1pbkhlYXAoY29tcGFyYXRvciwgb3B0aW9ucyk7XG4gIH1cblxuICBzZXQoLi4uYXJncykge1xuICAgIHN1cGVyLnNldCguLi5hcmdzKTtcbiAgICB0aGlzLl9taW5IZWFwLnNldCguLi5hcmdzKTtcbiAgfVxuXG4gIHJlbW92ZSguLi5hcmdzKSB7XG4gICAgc3VwZXIucmVtb3ZlKC4uLmFyZ3MpO1xuICAgIHRoaXMuX21pbkhlYXAucmVtb3ZlKC4uLmFyZ3MpO1xuICB9XG5cbiAgY2xlYXIoLi4uYXJncykge1xuICAgIHN1cGVyLmNsZWFyKC4uLmFyZ3MpO1xuICAgIHRoaXMuX21pbkhlYXAuY2xlYXIoLi4uYXJncyk7XG4gIH1cblxuICBzZXREZWZhdWx0KC4uLmFyZ3MpIHtcbiAgICBzdXBlci5zZXREZWZhdWx0KC4uLmFyZ3MpO1xuICAgIHJldHVybiB0aGlzLl9taW5IZWFwLnNldERlZmF1bHQoLi4uYXJncyk7XG4gIH1cblxuICBjbG9uZSgpIHtcbiAgICBjb25zdCBjbG9uZSA9IG5ldyBNaW5NYXhIZWFwKHRoaXMuX2NvbXBhcmF0b3IsIHRoaXMuX2hlYXApO1xuICAgIHJldHVybiBjbG9uZTtcbiAgfVxuXG4gIG1pbkVsZW1lbnRJZCgpIHtcbiAgICByZXR1cm4gdGhpcy5fbWluSGVhcC5taW5FbGVtZW50SWQoKTtcbiAgfVxuXG59O1xuIl19
