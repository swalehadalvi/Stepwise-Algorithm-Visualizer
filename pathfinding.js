/*
 * Pathfinding algorithms written as generators.
 * Grid cells: 0 = open, 1 = wall, 2 = weighted (costs WEIGHT to enter).
 * Every step yields one of:
 *   { type: 'visit', cell: [r, c], added: [[r, c], ...] }  a cell was explored; `added` are newly queued neighbours
 *   { type: 'path', cells: [[r, c], ...] }                  the route from start to end
 *   { type: 'nopath' }                                       the search ran out of cells
 */
(function (root) {
  'use strict';

  const WEIGHT = 5;
  const DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]];

  const cost = (g, r, c) => (g[r][c] === 2 ? WEIGHT : 1);

  function neighbours(g, r, c) {
    const out = [];
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < g.length && nc >= 0 && nc < g[0].length && g[nr][nc] !== 1) {
        out.push([nr, nc]);
      }
    }
    return out;
  }

  function trace(prev, start, end, C) {
    const path = [end];
    let cur = end;
    while (cur[0] !== start[0] || cur[1] !== start[1]) {
      cur = prev.get(cur[0] * C + cur[1]);
      path.push(cur);
    }
    return path.reverse();
  }

  class MinHeap {
    constructor(less) {
      this.items = [];
      this.less = less;
    }
    get size() {
      return this.items.length;
    }
    push(x) {
      const a = this.items;
      a.push(x);
      let i = a.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (!this.less(a[i], a[p])) break;
        [a[i], a[p]] = [a[p], a[i]];
        i = p;
      }
    }
    pop() {
      const a = this.items;
      const top = a[0];
      const last = a.pop();
      if (a.length) {
        a[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1;
          const r = l + 1;
          let m = i;
          if (l < a.length && this.less(a[l], a[m])) m = l;
          if (r < a.length && this.less(a[r], a[m])) m = r;
          if (m === i) break;
          [a[i], a[m]] = [a[m], a[i]];
          i = m;
        }
      }
      return top;
    }
  }

  const isEnd = (cell, end) => cell[0] === end[0] && cell[1] === end[1];

  function* bfs(g, start, end) {
    const C = g[0].length;
    const key = (c) => c[0] * C + c[1];
    const prev = new Map();
    const seen = new Set([key(start)]);
    const queue = [start];
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      if (isEnd(cur, end)) {
        yield { type: 'visit', cell: cur, added: [] };
        yield { type: 'path', cells: trace(prev, start, end, C) };
        return;
      }
      const added = [];
      for (const n of neighbours(g, cur[0], cur[1])) {
        const nk = key(n);
        if (seen.has(nk)) continue;
        seen.add(nk);
        prev.set(nk, cur);
        queue.push(n);
        added.push(n);
      }
      yield { type: 'visit', cell: cur, added };
    }
    yield { type: 'nopath' };
  }

  function* dfs(g, start, end) {
    const C = g[0].length;
    const key = (c) => c[0] * C + c[1];
    const prev = new Map();
    const seen = new Set();
    const stack = [{ cell: start, from: null }];
    while (stack.length) {
      const { cell, from } = stack.pop();
      const ck = key(cell);
      if (seen.has(ck)) continue;
      seen.add(ck);
      if (from) prev.set(ck, from);
      if (isEnd(cell, end)) {
        yield { type: 'visit', cell, added: [] };
        yield { type: 'path', cells: trace(prev, start, end, C) };
        return;
      }
      const added = [];
      const ns = neighbours(g, cell[0], cell[1]);
      for (let i = ns.length - 1; i >= 0; i--) {
        if (!seen.has(key(ns[i]))) {
          stack.push({ cell: ns[i], from: cell });
          added.push(ns[i]);
        }
      }
      yield { type: 'visit', cell, added };
    }
    yield { type: 'nopath' };
  }

  function* dijkstra(g, start, end) {
    const R = g.length;
    const C = g[0].length;
    const key = (c) => c[0] * C + c[1];
    const dist = new Array(R * C).fill(Infinity);
    const prev = new Map();
    const done = new Set();
    const heap = new MinHeap((a, b) => a.d < b.d);
    dist[key(start)] = 0;
    heap.push({ d: 0, cell: start });
    while (heap.size) {
      const { d, cell } = heap.pop();
      const ck = key(cell);
      if (done.has(ck)) continue;
      done.add(ck);
      if (isEnd(cell, end)) {
        yield { type: 'visit', cell, added: [] };
        yield { type: 'path', cells: trace(prev, start, end, C) };
        return;
      }
      const added = [];
      for (const n of neighbours(g, cell[0], cell[1])) {
        const nk = key(n);
        if (done.has(nk)) continue;
        const nd = d + cost(g, n[0], n[1]);
        if (nd < dist[nk]) {
          dist[nk] = nd;
          prev.set(nk, cell);
          heap.push({ d: nd, cell: n });
          added.push(n);
        }
      }
      yield { type: 'visit', cell, added };
    }
    yield { type: 'nopath' };
  }

  function* astar(g, start, end) {
    const R = g.length;
    const C = g[0].length;
    const key = (c) => c[0] * C + c[1];
    const h = (c) => Math.abs(c[0] - end[0]) + Math.abs(c[1] - end[1]);
    const best = new Array(R * C).fill(Infinity);
    const prev = new Map();
    const closed = new Set();
    const heap = new MinHeap((a, b) => (a.f !== b.f ? a.f < b.f : a.h < b.h));
    best[key(start)] = 0;
    heap.push({ f: h(start), h: h(start), g: 0, cell: start });
    while (heap.size) {
      const { g: gScore, cell } = heap.pop();
      const ck = key(cell);
      if (closed.has(ck)) continue;
      closed.add(ck);
      if (isEnd(cell, end)) {
        yield { type: 'visit', cell, added: [] };
        yield { type: 'path', cells: trace(prev, start, end, C) };
        return;
      }
      const added = [];
      for (const n of neighbours(g, cell[0], cell[1])) {
        const nk = key(n);
        if (closed.has(nk)) continue;
        const ng = gScore + cost(g, n[0], n[1]);
        if (ng < best[nk]) {
          best[nk] = ng;
          prev.set(nk, cell);
          heap.push({ f: ng + h(n), h: h(n), g: ng, cell: n });
          added.push(n);
        }
      }
      yield { type: 'visit', cell, added };
    }
    yield { type: 'nopath' };
  }

  const algorithms = {
    astar: {
      name: 'A* search',
      tag: 'Fast + optimal',
      run: astar,
      blurb: 'Dijkstra with a sense of direction. It scores each cell by the cost so far plus a straight-line guess to the goal, so it explores far fewer cells while still finding the cheapest route.',
      facts: [['Cheapest path', 'Yes'], ['Uses weights', 'Yes'], ['Time', 'O(E log V)'], ['Space', 'O(V)']]
    },
    dijkstra: {
      name: "Dijkstra's algorithm",
      tag: 'Optimal',
      run: dijkstra,
      blurb: 'Always expands the cheapest unexplored cell next, spreading out like a ripple. It guarantees the cheapest route and respects weighted cells, but has no idea where the goal is.',
      facts: [['Cheapest path', 'Yes'], ['Uses weights', 'Yes'], ['Time', 'O((V + E) log V)'], ['Space', 'O(V)']]
    },
    bfs: {
      name: 'Breadth-first search',
      tag: 'Fewest steps',
      run: bfs,
      blurb: 'Explores layer by layer: every cell one step away, then two steps, and so on. It finds the route with the fewest steps but ignores weights, so it can walk straight through costly cells.',
      facts: [['Fewest steps', 'Yes'], ['Uses weights', 'No'], ['Time', 'O(V + E)'], ['Space', 'O(V)']]
    },
    dfs: {
      name: 'Depth-first search',
      tag: 'Not optimal',
      run: dfs,
      blurb: 'Follows one branch as far as it can before backing up and trying another. It reaches the goal quickly sometimes, but the route it finds is usually long and winding.',
      facts: [['Shortest path', 'No'], ['Uses weights', 'No'], ['Time', 'O(V + E)'], ['Space', 'O(V)']]
    }
  };

  const api = { algorithms, WEIGHT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Pathfinding = api;
})(typeof window !== 'undefined' ? window : globalThis);
