/**
 * SVG speed gauge: a 270-degree arc showing the current rate in Mb/s.
 *
 * The scale is piecewise-linear between TICKS, each tick getting an equal
 * share of the arc, so common speeds (10-100 Mb/s) use a useful part of the
 * dial while still reaching 1 Gb/s. Faster rates keep the arc full.
 */
const ProgressGauge = {
  TICKS: [0, 10, 50, 100, 250, 500, 1000],
  SIZE: 300,
  RADIUS: 110,
  STROKE: 16,
  START_DEG: 135,
  SWEEP_DEG: 270,

  root: null,
  value: null,

  init() {
    this.root = document.getElementById('gauge');
    this.root.innerHTML = this.render();
    this.value = this.root.querySelector('.gauge-value');
    this.setInactive();
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

  render() {
    const r = this.RADIUS;
    const [x0, y0] = this.point(this.START_DEG, r);
    const [x1, y1] = this.point(this.START_DEG + this.SWEEP_DEG, r);
    const arc = `M ${x0} ${y0} A ${r} ${r} 0 1 1 ${x1} ${y1}`;
    const step = this.SWEEP_DEG / (this.TICKS.length - 1);
    const labels = this.TICKS.map((tick, i) => {
      const [x, y] = this.point(this.START_DEG + i * step, r + 26);
      return `<text x="${x}" y="${y}">${tick}</text>`;
    }).join('');
    return `<svg viewBox="0 0 ${this.SIZE} ${this.SIZE}" aria-hidden="true" focusable="false">
      <path class="gauge-track" d="${arc}" stroke-width="${this.STROKE}" />
      <path class="gauge-value" d="${arc}" stroke-width="${this.STROKE}" pathLength="100" stroke-dasharray="0 100" />
      <g class="gauge-ticks">${labels}</g>
    </svg>`;
  },

  setSpeed(mbps) {
    const f = this.fraction(mbps);
    this.value.setAttribute('stroke-dasharray', `${(f * 100).toFixed(2)} 100`);
    // A zero-length dash with round caps would still draw a dot.
    this.value.style.visibility = f > 0 ? 'visible' : 'hidden';
  },

  /**
   * Colour the arc by test direction: 'download', 'upload' or null.
   */
  setPhase(phase) {
    this.root.classList.toggle('is-download', phase === 'download');
    this.root.classList.toggle('is-upload', phase === 'upload');
  },

  setInactive() {
    this.setSpeed(0);
    this.setPhase(null);
    this.root.classList.remove('is-active');
  },

  reset() {
    this.setSpeed(0);
    this.setPhase(null);
    this.root.classList.add('is-active');
  },
};
