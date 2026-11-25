/**
 * SVG speed gauge: two concentric 270-degree arcs, the outer one for the
 * download rate and the inner one for the upload rate, in Mb/s.
 *
 * The scale is piecewise-linear between TICKS, each tick getting an equal
 * share of the arc, so common speeds (10-100 Mb/s) use a useful part of the
 * dial while still reaching 1 Gb/s. Faster rates keep the arc full.
 */
const ProgressGauge = {
  TICKS: [0, 10, 50, 100, 250, 500, 1000],
  SIZE: 300,
  RINGS: {
    download: { radius: 110, stroke: 16 },
    upload: { radius: 88, stroke: 10 },
  },
  START_DEG: 135,
  SWEEP_DEG: 270,

  root: null,
  arcs: {},

  init() {
    this.root = document.getElementById('gauge');
    this.root.innerHTML = this.render();
    this.arcs = {
      download: this.root.querySelector('.gauge-download'),
      upload: this.root.querySelector('.gauge-upload'),
    };
    this.reset();
  },

  /**
   * Map a rate in Mb/s to the filled fraction of the arc, in [0, 1].
   */
  fraction(mbps) {
    const t = this.TICKS;
    if (!(mbps > 0)) return 0;
    if (mbps >= t[t.length - 1]) return 1;
    const i = t.findIndex(tick => mbps < tick) - 1;
    const step = 1 / (t.length - 1);
    return (i + (mbps - t[i]) / (t[i + 1] - t[i])) * step;
  },

  point(deg, r) {
    const rad = deg * Math.PI / 180;
    const c = this.SIZE / 2;
    return [(c + r * Math.cos(rad)).toFixed(2), (c + r * Math.sin(rad)).toFixed(2)];
  },

  arcPath(r) {
    const [x0, y0] = this.point(this.START_DEG, r);
    const [x1, y1] = this.point(this.START_DEG + this.SWEEP_DEG, r);
    return `M ${x0} ${y0} A ${r} ${r} 0 1 1 ${x1} ${y1}`;
  },

  render() {
    const rings = Object.entries(this.RINGS).map(([name, { radius, stroke }]) => {
      const d = this.arcPath(radius);
      return `<path class="gauge-track" d="${d}" stroke-width="${stroke}" />
      <path class="gauge-value gauge-${name}" d="${d}" stroke-width="${stroke}" pathLength="100" stroke-dasharray="0 100" />`;
    }).join('');
    const step = this.SWEEP_DEG / (this.TICKS.length - 1);
    const labelRadius = this.RINGS.download.radius + 26;
    const labels = this.TICKS.map((tick, i) => {
      const [x, y] = this.point(this.START_DEG + i * step, labelRadius);
      return `<text x="${x}" y="${y}">${tick}</text>`;
    }).join('');
    return `<svg viewBox="0 0 ${this.SIZE} ${this.SIZE}" aria-hidden="true" focusable="false">
      ${rings}
      <g class="gauge-ticks">${labels}</g>
    </svg>`;
  },

  /**
   * Fill the 'download' or 'upload' arc to the given rate in Mb/s.
   */
  setSpeed(direction, mbps) {
    const arc = this.arcs[direction];
    const f = this.fraction(mbps);
    arc.setAttribute('stroke-dasharray', `${(f * 100).toFixed(2)} 100`);
    // A zero-length dash with round caps would still draw a dot.
    arc.style.visibility = f > 0 ? 'visible' : 'hidden';
  },

  /**
   * Mark the test stage: 'download', 'upload', 'done' or null.
   */
  setPhase(phase) {
    for (const p of ['download', 'upload', 'done']) {
      this.root.classList.toggle(`is-${p}`, phase === p);
    }
  },

  reset() {
    this.setSpeed('download', 0);
    this.setSpeed('upload', 0);
    this.setPhase(null);
  },
};
