/**
 * Small throughput graphs for the download and upload result boxes.
 *
 * Each graph plots the rate over each reporting interval (not the running
 * mean shown as the headline number), so dips and ramp-up stay visible. The
 * rates are averaged over a few neighbouring samples and drawn as a curve, so
 * sample-to-sample jitter doesn't read as spikes.
 *
 * The x axis spans the nominal test duration, which makes the growing line
 * double as a progress indicator; the y axis scales to the graph's own peak.
 */
const Sparkline = {
  WIDTH: 200,
  HEIGHT: 40,
  PAD: 2,
  SMOOTH: 2, // Samples averaged on each side of a point

  series: {},

  init() {
    for (const name of ['download', 'upload']) {
      const root = document.getElementById(`${name}Graph`);
      root.innerHTML = `<svg viewBox="0 0 ${this.WIDTH} ${this.HEIGHT}" preserveAspectRatio="none" focusable="false">
        <path class="spark-area" /><path class="spark-line" />
      </svg>`;
      this.series[name] = {
        area: root.querySelector('.spark-area'),
        line: root.querySelector('.spark-line'),
        points: [],
        last: { seconds: 0, bytes: 0 },
      };
    }
  },

  /**
   * Record the cumulative byte count at the given time since the start of
   * the transfer, and plot the rate since the previous sample.
   */
  add(name, seconds, bytes) {
    const s = this.series[name];
    const dt = seconds - s.last.seconds;
    const db = bytes - s.last.bytes;
    if (!(dt > 0) || !(db >= 0)) return;
    s.points.push({ seconds, mbps: db * 8 / 1e6 / dt });
    s.last = { seconds, bytes };
    this.draw(s);
  },

  draw(s) {
    const { WIDTH: w, HEIGHT: h, PAD: pad } = this;
    if (!s.points.length) {
      s.area.setAttribute('d', '');
      s.line.setAttribute('d', '');
      return;
    }
    const span = Math.max(Measurement.TEST_SECONDS, s.points[s.points.length - 1].seconds);
    const rates = this.smooth(s.points.map(p => p.mbps));
    const peak = Math.max(...rates) || 1;
    const xy = [[0, h - pad], ...s.points.map((p, i) =>
      [p.seconds / span * w, h - pad - rates[i] / peak * (h - 2 * pad)])];
    const line = this.curve(xy);
    const lastX = xy[xy.length - 1][0].toFixed(1);
    s.line.setAttribute('d', line);
    s.area.setAttribute('d', `${line} L ${lastX} ${h} L 0 ${h} Z`);
  },

  /**
   * Centred moving average; the window shrinks at both ends.
   */
  smooth(values) {
    return values.map((_, i) => {
      const window = values.slice(Math.max(0, i - this.SMOOTH), i + this.SMOOTH + 1);
      return window.reduce((a, b) => a + b, 0) / window.length;
    });
  },

  /**
   * Path through the midpoints of consecutive points, using the points
   * themselves as control points: rounds every corner without overshooting.
   */
  curve(xy) {
    const f = ([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`;
    let d = `M ${f(xy[0])}`;
    for (let i = 1; i < xy.length - 1; i++) {
      const mid = [(xy[i][0] + xy[i + 1][0]) / 2, (xy[i][1] + xy[i + 1][1]) / 2];
      d += ` Q ${f(xy[i])} ${f(mid)}`;
    }
    return `${d} L ${f(xy[xy.length - 1])}`;
  },

  reset() {
    for (const s of Object.values(this.series)) {
      s.points = [];
      s.last = { seconds: 0, bytes: 0 };
      this.draw(s);
    }
  },
};
