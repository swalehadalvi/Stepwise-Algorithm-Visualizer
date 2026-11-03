/*
 * Sorting algorithms written as generators.
 * Each one sorts the array in place and yields small events the UI can draw:
 *   { type: 'compare', idx: [i, j] }  two positions were compared
 *   { type: 'swap',    idx: [i, j] }  two positions were swapped
 *   { type: 'write',   idx: [k] }     one position was overwritten (merge sort)
 *   { type: 'pivot',   idx: [p] }     highlight a pivot or current minimum ([] clears it)
 *   { type: 'sorted',  idx: [...] }   these positions are in their final place
 */
(function (root) {
  'use strict';

  const compare = (i, j) => ({ type: 'compare', idx: [i, j] });
  const swapped = (i, j) => ({ type: 'swap', idx: [i, j] });
  const wrote = (k) => ({ type: 'write', idx: [k] });
  const pivot = (p) => ({ type: 'pivot', idx: p === null ? [] : [p] });
  const range = (from, to) => {
    const out = [];
    for (let i = from; i < to; i++) out.push(i);
    return out;
  };
  const sortedAll = (a) => ({ type: 'sorted', idx: range(0, a.length) });

  function swap(a, i, j) {
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }

  function* bubble(a) {
    const n = a.length;
    for (let i = 0; i < n - 1; i++) {
      let swappedAny = false;
      for (let j = 0; j < n - i - 1; j++) {
        yield compare(j, j + 1);
        if (a[j] > a[j + 1]) {
          swap(a, j, j + 1);
          swappedAny = true;
          yield swapped(j, j + 1);
        }
      }
      yield { type: 'sorted', idx: [n - i - 1] };
      if (!swappedAny) break;
    }
    yield sortedAll(a);
  }

  function* selection(a) {
    const n = a.length;
    for (let i = 0; i < n - 1; i++) {
      let min = i;
      yield pivot(min);
      for (let j = i + 1; j < n; j++) {
        yield compare(j, min);
        if (a[j] < a[min]) {
          min = j;
          yield pivot(min);
        }
      }
      yield pivot(null);
      if (min !== i) {
        swap(a, i, min);
        yield swapped(i, min);
      }
      yield { type: 'sorted', idx: [i] };
    }
    yield sortedAll(a);
  }

  function* insertion(a) {
    const n = a.length;
    for (let i = 1; i < n; i++) {
      let j = i;
      while (j > 0) {
        yield compare(j - 1, j);
        if (a[j - 1] > a[j]) {
          swap(a, j - 1, j);
          yield swapped(j - 1, j);
          j--;
        } else {
          break;
        }
      }
    }
    yield sortedAll(a);
  }

  function* merge(a, l, m, r) {
    const left = a.slice(l, m + 1);
    const right = a.slice(m + 1, r + 1);
    let i = 0;
    let j = 0;
    let k = l;
    while (i < left.length && j < right.length) {
      yield compare(l + i, m + 1 + j);
      a[k] = left[i] <= right[j] ? left[i++] : right[j++];
      yield wrote(k);
      k++;
    }
    while (i < left.length) {
      a[k] = left[i++];
      yield wrote(k);
      k++;
    }
    while (j < right.length) {
      a[k] = right[j++];
      yield wrote(k);
      k++;
    }
  }

  function* mergeStep(a, l, r) {
    if (l >= r) return;
    const m = (l + r) >> 1;
    yield* mergeStep(a, l, m);
    yield* mergeStep(a, m + 1, r);
    yield* merge(a, l, m, r);
  }

  function* mergeSort(a) {
    yield* mergeStep(a, 0, a.length - 1);
    yield sortedAll(a);
  }

  function* quickStep(a, lo, hi) {
    if (lo > hi) return;
    if (lo === hi) {
      yield { type: 'sorted', idx: [lo] };
      return;
    }
    yield pivot(hi);
    const p = a[hi];
    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      yield compare(j, hi);
      if (a[j] < p) {
        i++;
        if (i !== j) {
          swap(a, i, j);
          yield swapped(i, j);
        }
      }
    }
    if (i + 1 !== hi) {
      swap(a, i + 1, hi);
      yield swapped(i + 1, hi);
    }
    yield pivot(null);
    yield { type: 'sorted', idx: [i + 1] };
    yield* quickStep(a, lo, i);
    yield* quickStep(a, i + 2, hi);
  }

  function* quick(a) {
    yield* quickStep(a, 0, a.length - 1);
    yield sortedAll(a);
  }

  function* siftDown(a, n, i) {
    for (;;) {
      let largest = i;
      const l = 2 * i + 1;
      const r = l + 1;
      if (l < n) {
        yield compare(l, largest);
        if (a[l] > a[largest]) largest = l;
      }
      if (r < n) {
        yield compare(r, largest);
        if (a[r] > a[largest]) largest = r;
      }
      if (largest === i) return;
      swap(a, i, largest);
      yield swapped(i, largest);
      i = largest;
    }
  }

  function* heap(a) {
    const n = a.length;
    for (let i = (n >> 1) - 1; i >= 0; i--) yield* siftDown(a, n, i);
    for (let end = n - 1; end > 0; end--) {
      swap(a, 0, end);
      yield swapped(0, end);
      yield { type: 'sorted', idx: [end] };
      yield* siftDown(a, end, 0);
    }
    yield sortedAll(a);
  }

  const algorithms = {
    bubble: {
      name: 'Bubble sort',
      tag: 'O(n²)',
      run: bubble,
      blurb: 'Walks along the list comparing neighbours and swapping any pair that is out of order. After each pass the largest remaining value has bubbled to the end.',
      facts: [['Best case', 'O(n)'], ['Average', 'O(n²)'], ['Worst case', 'O(n²)'], ['Extra space', 'O(1)'], ['Stable', 'Yes']]
    },
    selection: {
      name: 'Selection sort',
      tag: 'O(n²)',
      run: selection,
      blurb: 'Scans the unsorted part to find the smallest value, then swaps it into the next open slot. It makes very few swaps, but always does the same number of comparisons.',
      facts: [['Best case', 'O(n²)'], ['Average', 'O(n²)'], ['Worst case', 'O(n²)'], ['Extra space', 'O(1)'], ['Stable', 'No']]
    },
    insertion: {
      name: 'Insertion sort',
      tag: 'O(n²)',
      run: insertion,
      blurb: 'Takes each value in turn and slides it left until it sits in the right place among the values before it. Fast on lists that are already nearly sorted.',
      facts: [['Best case', 'O(n)'], ['Average', 'O(n²)'], ['Worst case', 'O(n²)'], ['Extra space', 'O(1)'], ['Stable', 'Yes']]
    },
    merge: {
      name: 'Merge sort',
      tag: 'O(n log n)',
      run: mergeSort,
      blurb: 'Splits the list in half again and again, then merges the sorted halves back together. Each bar you see change is a value being written back into the array.',
      facts: [['Best case', 'O(n log n)'], ['Average', 'O(n log n)'], ['Worst case', 'O(n log n)'], ['Extra space', 'O(n)'], ['Stable', 'Yes']]
    },
    quick: {
      name: 'Quick sort',
      tag: 'O(n log n)',
      run: quick,
      blurb: 'Picks a pivot (purple), moves smaller values to its left and larger ones to its right, then repeats on each side. Very fast in practice, slow if pivots are unlucky.',
      facts: [['Best case', 'O(n log n)'], ['Average', 'O(n log n)'], ['Worst case', 'O(n²)'], ['Extra space', 'O(log n)'], ['Stable', 'No']]
    },
    heap: {
      name: 'Heap sort',
      tag: 'O(n log n)',
      run: heap,
      blurb: 'Arranges the list into a max-heap so the largest value is always first, then repeatedly swaps it to the end and repairs the heap.',
      facts: [['Best case', 'O(n log n)'], ['Average', 'O(n log n)'], ['Worst case', 'O(n log n)'], ['Extra space', 'O(1)'], ['Stable', 'No']]
    }
  };

  const api = { algorithms };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Sorting = api;
})(typeof window !== 'undefined' ? window : globalThis);
