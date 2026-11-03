/*
 * Plain-English explanations for each step.
 * Both functions return [what, why]: what just happened, and why the algorithm does it.
 */
(function (root) {
  'use strict';

  const pos = (x) => 'position ' + (x + 1);

  function sort(algo, ev, arr) {
    const i = ev.idx[0];
    const j = ev.idx[1];
    const a = arr[i];
    const b = arr[j];
    const cmp = 'Compare ' + pos(i) + ' (' + a + ') with ' + pos(j) + ' (' + b + ').';

    if (ev.type === 'compare') {
      switch (algo) {
        case 'bubble':
          return [cmp, a > b
            ? a + ' is bigger than ' + b + ', so this pair is out of order and will be swapped.'
            : a + ' is not bigger than ' + b + ', so this pair is already in order. Move on to the next pair.'];
        case 'selection':
          return ['Is ' + a + ' (' + pos(i) + ') smaller than the smallest value found so far, ' + b + '?', a < b
            ? 'Yes, so ' + a + ' becomes the new smallest. We must look at every remaining value to be sure of the true smallest.'
            : 'No, so ' + b + ' stays the smallest. Keep scanning the rest of the unsorted part.'];
        case 'insertion':
          return [cmp, a > b
            ? a + ' is bigger than ' + b + ', so ' + b + ' has to slide left past it to reach its place.'
            : b + ' is not smaller than the value on its left, so it has found its place. The part on the left stays sorted.'];
        case 'merge':
          return ['Compare the front values of the two sorted halves being merged.',
            'Both halves are already sorted, so the smaller front value is the next smallest overall. It gets copied forward.'];
        case 'quick':
          return ['Compare ' + a + ' with the pivot (' + b + ').', a < b
            ? 'It is smaller than the pivot, so it belongs in the left group.'
            : 'It is not smaller, so it stays in the right group.'];
        default:
          return [cmp, 'A max-heap needs every parent to be at least as big as its children, so we find the largest of the parent and its children.'];
      }
    }

    if (ev.type === 'swap') {
      const what = 'Swap ' + pos(i) + ' and ' + pos(j) + '.';
      return [what, {
        bubble: 'The bigger value moves one step right, closer to its final spot at the end.',
        selection: 'The smallest value found goes into the first open slot. That slot is now final.',
        insertion: 'Swapping slides the value one slot to the left, towards where it belongs.',
        quick: 'Values smaller than the pivot are gathered on the left. The last swap drops the pivot between the two groups.',
        heap: 'Swapping fixes the heap order, or moves the biggest value to the end where it stays.'
      }[algo]];
    }

    if (ev.type === 'write') {
      return ['Write ' + a + ' into ' + pos(i) + '.',
        'Always copying the smaller front value rebuilds this section of the list in sorted order.'];
    }

    if (ev.type === 'pivot') {
      if (!ev.idx.length) return ['Finished this pass, so the marker is cleared.', 'The next pass starts fresh.'];
      return algo === 'quick'
        ? ['Pick the last value, ' + a + ', as the pivot.', 'Everything else will be compared with it, so we can split the list into smaller and larger groups.']
        : ['Treat ' + pos(i) + ' (' + a + ') as the smallest value so far.', 'We need a starting guess for the minimum. Any smaller value we meet will replace it.'];
    }

    if (ev.idx.length > 1) return ['Every bar is green: the list is sorted.', 'No more comparisons are needed.'];
    return ['Bar at ' + pos(i) + ' is now in its final place.', {
      bubble: 'After a full pass the largest remaining value has bubbled to the end of the unsorted part.',
      selection: 'Everything up to here is the smallest values in order, so this slot will never change again.',
      insertion: 'The sorted part on the left has grown.',
      merge: 'This section is fully merged.',
      quick: 'The pivot has every smaller value on its left and every larger value on its right, so it is exactly where it belongs.',
      heap: 'The biggest value in the heap was moved to the end. It will not move again, and the heap shrinks by one.'
    }[algo]];
  }

  const PICK = {
    bfs: 'BFS always takes the oldest cell in its queue, so it explores in widening rings and reaches every cell in the fewest steps.',
    dfs: 'DFS takes the newest cell it queued, so it keeps diving deeper along one branch and only backs up when it gets stuck.',
    dijkstra: 'Dijkstra picks the queued cell with the lowest total cost from the start. Nothing cheaper can reach it, so its cost is final.',
    astar: 'A* picks the queued cell with the lowest (cost so far + straight-line guess to the goal), so it leans towards the end instead of spreading everywhere.'
  };

  const FOUND = {
    bfs: 'BFS reaches the end through the fewest steps. It ignores weights, so the cost may not be the lowest.',
    dfs: 'DFS stops at the first route it stumbles on, which is usually long and winding.',
    dijkstra: 'Every cell was settled in order of cost, so this route has the lowest possible cost.',
    astar: 'The guess never overestimates, so A* still finds the cheapest route while exploring fewer cells.'
  };

  function path(algo, ev) {
    if (ev.type === 'nopath') {
      return ['The queue is empty and the end was never reached.', 'Walls block every route, so there is nothing left to explore. Try erasing a wall.'];
    }
    if (ev.type === 'path') {
      const steps = ev.cells.length - 1;
      return ['Route found: ' + steps + ' steps. Trace back through where each cell came from.', FOUND[algo]];
    }
    const [r, c] = ev.cell;
    const where = 'row ' + (r + 1) + ', column ' + (c + 1);
    if (!ev.added.length && ev.reachedEnd) return ['Reached the end cell.', PICK[algo]];
    const n = ev.added.length;
    return ['Explore the cell at ' + where + '. ' + (n
      ? n + ' new neighbour' + (n > 1 ? 's' : '') + ' added to the queue (light blue).'
      : 'No new neighbours to add: they are walls, off the grid or already queued.'), PICK[algo]];
  }

  const api = { sort, path };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Explain = api;
})(typeof window !== 'undefined' ? window : globalThis);
