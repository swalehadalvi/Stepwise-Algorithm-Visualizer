(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const el = {
    viz: $('#viz'),
    play: $('#playBtn'),
    reset: $('#resetBtn'),
    maze: $('#mazeBtn'),
    clear: $('#clearBtn'),
    tools: $('#tools'),
    speed: $('#speed'),
    size: $('#size'),
    sizeOut: $('#sizeOut'),
    algoList: $('#algoList'),
    about: $('#about'),
    legend: $('#legend'),
    stats: $('#stats'),
    heading: $('#heading'),
    sub: $('#sub'),
    tabs: Array.from(document.querySelectorAll('.tab')),
    toolBtns: Array.from(document.querySelectorAll('[data-tool]')),
    home: $('#home'),
    visualizer: $('#visualizer'),
    custom: $('#customForm'),
    customInput: $('#customInput'),
    customMsg: $('#customMsg'),
    hint: $('#pathHint'),
    back: $('#backBtn'),
    next: $('#nextBtn'),
    stepNo: $('#stepNo'),
    stepWhat: $('#stepWhat'),
    stepWhy: $('#stepWhy')
  };

  const COPY = {
    sorting: [
      'Sorting, one comparison at a time.',
      'Pick an algorithm, press play, and watch every comparison and swap. Every algorithm starts from the same shuffled bars, so you can compare them fairly.'
    ],
    pathfinding: [
      'Finding the way, one cell at a time.',
      'Draw walls and weighted cells, drag the start and end points, then watch how each search explores the grid.'
    ]
  };

  const cfg = {
    sorting: { algo: 'bubble', size: 40, min: 10, max: 100, step: 1 },
    pathfinding: { algo: 'astar', size: 30, min: 12, max: 48, step: 2 }
  };

  let tab = 'sorting';
  let status = 'idle'; // idle | running | paused | done
  let gen = null;
  let raf = 0;
  let last = 0;
  let acc = 0;
  let tool = 'wall';
  let steps = null; // { evs, pos } while stepping manually
  let stepNo = 0;
  let lastEv = null;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ------------------------------------------------------------------ */
  /* Sorting mode                                                        */
  /* ------------------------------------------------------------------ */
  const sortMode = {
    arr: [],
    orig: [],
    bars: [],
    comps: 0,
    moves: 0,
    sorted: new Set(),
    active: new Map(),
    pivot: -1,
    legend: [['', 'Unsorted'], ['compare', 'Comparing'], ['swap', 'Swapped or written'], ['pivot', 'Pivot or minimum'], ['sorted', 'In place']],
    algos: () => Sorting.algorithms,

    setup() {
      const n = cfg.sorting.size;
      this.orig = shuffle(Array.from({ length: n }, (_, i) => i + 1));
      this.build();
      this.restore();
    },

    build() {
      const n = this.orig.length;
      this.max = Math.max.apply(null, this.orig);
      el.viz.className = 'viz bars';
      el.viz.style.gridTemplateColumns = '';
      el.viz.style.setProperty('--gap', n > 60 ? '1px' : '3px');
      const frag = document.createDocumentFragment();
      this.bars = [];
      for (let i = 0; i < n; i++) {
        const b = document.createElement('div');
        b.className = 'bar';
        this.bars.push(b);
        frag.appendChild(b);
      }
      el.viz.replaceChildren(frag);
    },

    restore() {
      this.arr = this.orig.slice();
      this.comps = 0;
      this.moves = 0;
      this.sorted = new Set();
      this.active = new Map();
      this.pivot = -1;
      this.render();
    },

    makeGen() {
      return Sorting.algorithms[cfg.sorting.algo].run(this.arr);
    },

    apply(ev) {
      this.active = new Map();
      if (ev.type === 'compare') {
        this.comps++;
        ev.idx.forEach((i) => this.active.set(i, 'compare'));
      } else if (ev.type === 'swap') {
        this.moves++;
        ev.idx.forEach((i) => this.active.set(i, 'swap'));
      } else if (ev.type === 'write') {
        this.moves++;
        ev.idx.forEach((i) => this.active.set(i, 'swap'));
      } else if (ev.type === 'pivot') {
        this.pivot = ev.idx.length ? ev.idx[0] : -1;
      } else if (ev.type === 'sorted') {
        ev.idx.forEach((i) => this.sorted.add(i));
      }
    },

    drain() {
      return false;
    },

    finish() {
      this.active = new Map();
      this.pivot = -1;
      for (let i = 0; i < this.arr.length; i++) this.sorted.add(i);
    },

    render() {
      const n = this.arr.length;
      for (let i = 0; i < n; i++) {
        const bar = this.bars[i];
        bar.style.height = Math.max(3, (this.arr[i] / this.max) * 100) + '%';
        bar.textContent = n <= 24 ? this.arr[i] : '';
        let cls = 'bar';
        if (this.sorted.has(i)) cls += ' is-sorted';
        if (i === this.pivot) cls += ' is-pivot';
        const a = this.active.get(i);
        if (a) cls += ' is-' + a;
        bar.className = cls;
      }
    },

    stats() {
      return [['Comparisons', this.comps], ['Moves', this.moves]];
    },

    doneLabel: () => 'Sorted',
    sizeLabel() {
      return this.orig.length + ' bars';
    },

    useCustom(nums) {
      this.orig = nums.slice();
      this.build();
      this.restore();
    },

    // Runs the whole algorithm on a copy and records the array after every event.
    collect() {
      const copy = this.orig.slice();
      const out = [];
      for (const ev of Sorting.algorithms[cfg.sorting.algo].run(copy)) out.push({ ev, snap: copy.slice() });
      return out;
    },

    showAt(evs, k) {
      this.restore();
      for (let i = 0; i < k; i++) this.apply(evs[i].ev);
      if (k > 0) this.arr = evs[k - 1].snap.slice();
      if (k === evs.length) this.finish();
      this.render();
    },

    editable: () => false
  };

  /* ------------------------------------------------------------------ */
  /* Pathfinding mode                                                    */
  /* ------------------------------------------------------------------ */
  const pathMode = {
    R: 0,
    C: 0,
    grid: [],
    cells: [],
    vis: null,
    onPath: null,
    start: [0, 0],
    end: [0, 0],
    visited: 0,
    pathLen: null,
    pathCost: null,
    found: false,
    pendingPath: [],
    legend: [['start', 'Start'], ['end', 'End'], ['wall', 'Wall'], ['weight', 'Weight (cost 5)'], ['frontier', 'Queued'], ['visited', 'Explored'], ['path', 'Route']],
    algos: () => Pathfinding.algorithms,

    setup() {
      const cols = cfg.pathfinding.size;
      const narrow = window.innerWidth < 640;
      const rows = Math.max(8, Math.round(cols * (narrow ? 0.9 : 0.5)));
      this.R = rows;
      this.C = cols;
      this.grid = Array.from({ length: rows }, () => new Array(cols).fill(0));
      this.start = [Math.floor(rows / 2), Math.floor(cols * 0.2)];
      this.end = [Math.floor(rows / 2), Math.floor(cols * 0.8)];
      this.vis = new Uint8Array(rows * cols);
      this.onPath = new Uint8Array(rows * cols);
      this.resetCounters();
      this.build();
    },

    build() {
      el.viz.className = 'viz grid';
      el.viz.style.removeProperty('--gap');
      el.viz.style.gridTemplateColumns = 'repeat(' + this.C + ', 1fr)';
      const frag = document.createDocumentFragment();
      this.cells = [];
      for (let r = 0; r < this.R; r++) {
        const row = [];
        for (let c = 0; c < this.C; c++) {
          const d = document.createElement('div');
          d.dataset.r = r;
          d.dataset.c = c;
          d.className = 'cell';
          row.push(d);
          frag.appendChild(d);
        }
        this.cells.push(row);
      }
      el.viz.replaceChildren(frag);
      this.paintAll();
    },

    resetCounters() {
      this.visited = 0;
      this.pathLen = null;
      this.pathCost = null;
      this.found = false;
      this.pendingPath = [];
    },

    isStart: (self, p) => p[0] === self.start[0] && p[1] === self.start[1],
    isEnd: (self, p) => p[0] === self.end[0] && p[1] === self.end[1],

    paintCell(r, c) {
      const k = r * this.C + c;
      const g = this.grid[r][c];
      let cls = 'cell';
      if (r === this.start[0] && c === this.start[1]) cls += ' start';
      else if (r === this.end[0] && c === this.end[1]) cls += ' end';
      else {
        if (g === 1) cls += ' wall';
        if (g === 2) cls += ' weight';
        if (this.vis[k] === 1) cls += ' frontier';
        if (this.vis[k] === 2) cls += ' visited';
        if (this.onPath[k]) cls += ' path';
      }
      this.cells[r][c].className = cls;
    },

    paintAll() {
      for (let r = 0; r < this.R; r++) for (let c = 0; c < this.C; c++) this.paintCell(r, c);
    },

    // Clears the search but keeps walls and weights.
    restore() {
      this.vis.fill(0);
      this.onPath.fill(0);
      this.resetCounters();
      this.paintAll();
    },

    clearBoard() {
      this.grid.forEach((row) => row.fill(0));
      this.restore();
    },

    randomWalls() {
      this.restore();
      for (let r = 0; r < this.R; r++) {
        for (let c = 0; c < this.C; c++) {
          const roll = Math.random();
          this.grid[r][c] = roll < 0.24 ? 1 : roll < 0.3 ? 2 : 0;
        }
      }
      this.grid[this.start[0]][this.start[1]] = 0;
      this.grid[this.end[0]][this.end[1]] = 0;
      this.paintAll();
    },

    setCell(p, value) {
      const [r, c] = p;
      if (this.isStart(this, p) || this.isEnd(this, p)) return;
      if (this.grid[r][c] === value) return;
      this.grid[r][c] = value;
      this.paintCell(r, c);
    },

    moveEndpoint(which, p) {
      const other = which === 'start' ? this.end : this.start;
      const old = this[which];
      if ((p[0] === other[0] && p[1] === other[1]) || (p[0] === old[0] && p[1] === old[1])) return;
      this.grid[p[0]][p[1]] = 0;
      this[which] = p;
      this.paintCell(old[0], old[1]);
      this.paintCell(p[0], p[1]);
    },

    makeGen() {
      return Pathfinding.algorithms[cfg.pathfinding.algo].run(this.grid, this.start, this.end);
    },

    apply(ev) {
      if (ev.type === 'visit') {
        ev.added.forEach(([r, c]) => {
          const k = r * this.C + c;
          if (this.vis[k] === 0) {
            this.vis[k] = 1;
            this.paintCell(r, c);
          }
        });
        const [r, c] = ev.cell;
        this.vis[r * this.C + c] = 2;
        this.visited++;
        this.paintCell(r, c);
      } else if (ev.type === 'path') {
        this.found = true;
        this.pendingPath = ev.cells.slice();
        this.pathLen = ev.cells.length - 1;
        let total = 0;
        for (let i = 1; i < ev.cells.length; i++) {
          const [r, c] = ev.cells[i];
          total += this.grid[r][c] === 2 ? Pathfinding.WEIGHT : 1;
        }
        this.pathCost = total;
      }
    },

    // Draws the final route one cell per step after the search ends.
    drain() {
      if (!this.pendingPath.length) return false;
      const [r, c] = this.pendingPath.shift();
      this.onPath[r * this.C + c] = 1;
      this.paintCell(r, c);
      return true;
    },

    collect() {
      const out = [];
      for (const ev of Pathfinding.algorithms[cfg.pathfinding.algo].run(this.grid, this.start, this.end)) out.push({ ev });
      return out;
    },

    showAt(evs, k) {
      this.restore();
      for (let i = 0; i < k; i++) this.apply(evs[i].ev);
      this.pendingPath.forEach(([r, c]) => {
        this.onPath[r * this.C + c] = 1;
        this.paintCell(r, c);
      });
      this.pendingPath = [];
    },

    finish() {},
    render() {},

    stats() {
      return [
        ['Explored', this.visited],
        ['Route length', this.pathLen === null ? '–' : this.pathLen],
        ['Route cost', this.pathCost === null ? '–' : this.pathCost]
      ];
    },

    doneLabel() {
      return this.found ? 'Route found' : 'No route';
    },
    sizeLabel() {
      return this.C + '×' + this.R;
    },
    editable: () => status === 'idle' || status === 'done' || status === 'step'
  };

  const modes = { sorting: sortMode, pathfinding: pathMode };
  const mode = () => modes[tab];

  /* ------------------------------------------------------------------ */
  /* Run loop                                                            */
  /* ------------------------------------------------------------------ */
  function stepsPerSecond() {
    return 2 * Math.pow(1000, el.speed.value / 100);
  }

  function advance() {
    const m = mode();
    if (m.drain()) return true;
    const r = gen.next();
    if (r.done) return false;
    m.apply(r.value);
    lastEv = r.value;
    stepNo++;
    return true;
  }

  function tick(t) {
    if (status !== 'running') return;
    const dt = Math.min(t - last, 100);
    last = t;
    acc += (dt / 1000) * stepsPerSecond();
    let n = Math.floor(acc);
    acc -= n;
    while (n-- > 0) {
      if (!advance()) {
        finish();
        return;
      }
    }
    mode().render();
    updateStats();
    raf = requestAnimationFrame(tick);
  }

  function setStatus(s) {
    status = s;
    el.play.textContent = { idle: 'Play', step: 'Play', running: 'Pause', paused: 'Resume', done: 'Replay' }[s];
    el.viz.dataset.status = s;
    updateStats();
  }

  function play() {
    if (status === 'running') {
      cancelAnimationFrame(raf);
      setStatus('paused');
      return;
    }
    if (status === 'done' || status === 'step') mode().restore();
    if (status === 'idle' || status === 'done' || status === 'step') {
      gen = mode().makeGen();
      steps = null;
      stepNo = 0;
      lastEv = null;
    }
    last = performance.now();
    acc = 0;
    setStatus('running');
    raf = requestAnimationFrame(tick);
  }

  function finish() {
    cancelAnimationFrame(raf);
    mode().finish();
    mode().render();
    setStatus('done');
  }

  function halt() {
    cancelAnimationFrame(raf);
    gen = null;
    steps = null;
    stepNo = 0;
    lastEv = null;
    setStatus('idle');
  }

  function updateStats() {
    const m = mode();
    const label = { idle: 'Ready', step: 'Stepping', running: 'Running', paused: 'Paused', done: m.doneLabel() }[status];
    const rows = m.stats().map(([k, v]) => '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>');
    rows.push('<div><dt>Status</dt><dd class="text">' + label + '</dd></div>');
    el.stats.innerHTML = rows.join('');
    renderExplain();
  }

  function renderExplain() {
    const a = mode().algos()[cfg[tab].algo];
    let what;
    let why;
    if (!lastEv) {
      what = 'Press "Next step" to walk through ' + a.name + ' one move at a time, or press Play to watch it run.';
      why = a.blurb;
    } else if (tab === 'sorting') {
      [what, why] = Explain.sort(cfg.sorting.algo, lastEv, sortMode.arr);
    } else {
      const ev = Object.assign({}, lastEv);
      if (ev.type === 'visit') ev.reachedEnd = pathMode.isEnd(pathMode, ev.cell);
      [what, why] = Explain.path(cfg.pathfinding.algo, ev);
    }
    el.stepWhat.textContent = what;
    el.stepWhy.textContent = why;
    el.stepNo.textContent = steps ? 'Step ' + stepNo + ' of ' + steps.evs.length : 'Step ' + stepNo;
  }

  // Manual stepping: replays the recorded events up to the chosen step.
  function stepBy(d) {
    cancelAnimationFrame(raf);
    if (!steps) {
      const evs = mode().collect();
      let pos = 0;
      if (status === 'done') pos = evs.length;
      else if (status === 'paused' || status === 'running') pos = Math.min(stepNo, evs.length);
      steps = { evs, pos };
    }
    steps.pos = Math.max(0, Math.min(steps.evs.length, steps.pos + d));
    mode().showAt(steps.evs, steps.pos);
    stepNo = steps.pos;
    lastEv = steps.pos ? steps.evs[steps.pos - 1].ev : null;
    gen = null;
    setStatus(steps.pos === steps.evs.length ? 'done' : 'step');
  }

  /* ------------------------------------------------------------------ */
  /* UI rendering                                                        */
  /* ------------------------------------------------------------------ */
  function renderAlgoList() {
    const algos = mode().algos();
    el.algoList.innerHTML = Object.entries(algos)
      .map(
        ([key, a]) =>
          '<button class="algo" type="button" data-algo="' + key + '" aria-pressed="' + (key === cfg[tab].algo) + '">' +
          '<span>' + a.name + '</span><span class="tag">' + a.tag + '</span></button>'
      )
      .join('');
  }

  function renderAbout() {
    const a = mode().algos()[cfg[tab].algo];
    el.about.innerHTML =
      '<h3>' + a.name + '</h3><p>' + a.blurb + '</p><dl class="facts">' +
      a.facts.map(([k, v]) => '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>').join('') +
      '</dl>';
  }

  function renderLegend() {
    el.legend.innerHTML = mode()
      .legend.map(([cls, text]) => '<span><i class="sw' + (cls ? ' sw-' + cls : '') + '"></i>' + text + '</span>')
      .join('');
  }

  function syncControls() {
    const c = cfg[tab];
    const isPath = tab === 'pathfinding';
    el.size.min = c.min;
    el.size.max = c.max;
    el.size.step = c.step;
    el.size.value = c.size;
    el.sizeOut.textContent = mode().sizeLabel();
    el.reset.textContent = isPath ? 'Clear route' : 'Shuffle';
    el.maze.hidden = !isPath;
    el.clear.hidden = !isPath;
    el.tools.hidden = !isPath;
    el.heading.textContent = COPY[tab][0];
    el.sub.textContent = COPY[tab][1];
    el.custom.hidden = isPath;
    el.hint.hidden = !isPath;
    el.viz.setAttribute(
      'aria-label',
      isPath ? 'Grid showing a pathfinding search' : 'Bars showing a sorting algorithm'
    );
  }

  function refreshPanels() {
    renderAlgoList();
    renderAbout();
    renderLegend();
    el.sizeOut.textContent = mode().sizeLabel();
  }

  function go(v) {
    const isTab = v === 'sorting' || v === 'pathfinding';
    el.home.hidden = isTab;
    el.visualizer.hidden = !isTab;
    if (isTab && v !== tab) {
      halt();
      tab = v;
      syncControls();
      mode().setup();
      refreshPanels();
      updateStats();
    } else if (!isTab) {
      cancelAnimationFrame(raf);
      if (status === 'running') setStatus('paused');
    }
    el.tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.go === v)));
    if (v === 'about') document.getElementById('aboutUs').scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo(0, 0);
    try {
      history.replaceState(null, '', '#' + v);
    } catch (e) {
      /* file:// pages may block this; ignore */
    }
  }

  function selectAlgo(key) {
    halt();
    cfg[tab].algo = key;
    mode().restore();
    renderAlgoList();
    renderAbout();
    updateStats();
  }

  function firstSentence(t) {
    const m = t.match(/^.*?[.!?](\s|$)/);
    return m ? m[0].trim() : t;
  }

  function renderHome() {
    [['sorting', '#homeSorting', Sorting.algorithms], ['pathfinding', '#homePath', Pathfinding.algorithms]].forEach(
      ([t, sel, algos]) => {
        $(sel).innerHTML = Object.entries(algos)
          .map(
            ([key, a]) =>
              '<button class="card" type="button" data-open="' + t + ':' + key + '">' +
              '<span class="card-tag">' + a.tag + '</span><strong>' + a.name + '</strong>' +
              '<span class="card-text">' + firstSentence(a.blurb) + '</span>' +
              '<span class="card-go">Visualize →</span></button>'
          )
          .join('');
      }
    );
  }

  /* ------------------------------------------------------------------ */
  /* Events                                                              */
  /* ------------------------------------------------------------------ */
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g) {
      e.preventDefault();
      go(g.dataset.go);
      return;
    }
    const o = e.target.closest('[data-open]');
    if (o) {
      const [t, a] = o.dataset.open.split(':');
      go(t);
      selectAlgo(a);
    }
  });

  el.back.addEventListener('click', () => stepBy(-1));
  el.next.addEventListener('click', () => stepBy(1));

  window.addEventListener('keydown', (e) => {
    if (el.visualizer.hidden || /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') stepBy(1);
    else if (e.key === 'ArrowLeft') stepBy(-1);
  });

  el.custom.addEventListener('submit', (e) => {
    e.preventDefault();
    const nums = el.customInput.value.split(/[\s,;]+/).filter(Boolean).map(Number);
    let err = '';
    if (nums.length < 2 || nums.length > 40) err = 'Please enter between 2 and 40 numbers.';
    else if (nums.some((n) => !isFinite(n) || n <= 0)) err = 'Use positive numbers only, for example 8, 3, 15, 1.';
    el.customMsg.classList.toggle('error', Boolean(err));
    if (err) {
      el.customMsg.textContent = err;
      return;
    }
    halt();
    sortMode.useCustom(nums);
    el.sizeOut.textContent = sortMode.sizeLabel();
    el.customMsg.textContent = 'Using your ' + nums.length + ' numbers. Press Play or Next step.';
    updateStats();
  });

  el.play.addEventListener('click', play);

  el.reset.addEventListener('click', () => {
    halt();
    if (tab === 'sorting') sortMode.setup();
    else pathMode.restore();
    updateStats();
  });

  el.maze.addEventListener('click', () => {
    halt();
    pathMode.randomWalls();
    updateStats();
  });

  el.clear.addEventListener('click', () => {
    halt();
    pathMode.clearBoard();
    updateStats();
  });

  el.size.addEventListener('input', () => {
    halt();
    cfg[tab].size = Number(el.size.value);
    mode().setup();
    el.sizeOut.textContent = mode().sizeLabel();
    updateStats();
  });

  el.algoList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-algo]');
    if (!btn) return;
    selectAlgo(btn.dataset.algo);
  });

  el.toolBtns.forEach((b) =>
    b.addEventListener('click', () => {
      tool = b.dataset.tool;
      el.toolBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    })
  );

  // Drawing on the grid: paint walls or weights, or drag the start and end markers.
  let drag = null;

  function cellAt(e) {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || !target.classList.contains('cell') || !el.viz.contains(target)) return null;
    return [Number(target.dataset.r), Number(target.dataset.c)];
  }

  el.viz.addEventListener('pointerdown', (e) => {
    if (tab !== 'pathfinding' || !pathMode.editable()) return;
    const p = cellAt(e);
    if (!p) return;
    e.preventDefault();
    if (status === 'done' || status === 'step') {
      pathMode.restore();
      halt();
    }
    if (pathMode.isStart(pathMode, p)) drag = { kind: 'start' };
    else if (pathMode.isEnd(pathMode, p)) drag = { kind: 'end' };
    else {
      const want = tool === 'wall' ? 1 : tool === 'weight' ? 2 : 0;
      drag = { kind: 'paint', value: pathMode.grid[p[0]][p[1]] === want ? 0 : want };
      pathMode.setCell(p, drag.value);
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = cellAt(e);
    if (!p) return;
    if (drag.kind === 'paint') pathMode.setCell(p, drag.value);
    else pathMode.moveEndpoint(drag.kind, p);
  });

  const endDrag = () => {
    drag = null;
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  /* ------------------------------------------------------------------ */
  /* Start                                                               */
  /* ------------------------------------------------------------------ */
  if (location.hash === '#pathfinding') tab = 'pathfinding';
  syncControls();
  mode().setup();
  refreshPanels();
  setStatus('idle');
  renderHome();
  const h = location.hash.slice(1);
  go(['sorting', 'pathfinding', 'about'].indexOf(h) >= 0 ? h : 'home');
})();
