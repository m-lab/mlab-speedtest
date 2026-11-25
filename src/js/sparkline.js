/**
 * Small throughput graphs for the download and upload result boxes.
 *
 * Each graph plots the rate over each reporting interval (not the running
 * mean shown as the headline number), so dips and ramp-up stay visible. The
 * x axis spans the nominal test duration, which makes the growing line double
 * as a progress indicator; the y axis scales to the graph's own peak.
 */
const Sparkline = {
  DURATION: 10, // Nominal length of one ndt7 direction, in seconds
  WIDTH: 200,
  HEIGHT: 40,
  PAD: 2,

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
    const span = Math.max(this.DURATION, s.points[s.points.length - 1].seconds);
    const peak = Math.max(...s.points.map(p => p.mbps)) || 1;
    const xy = s.points.map(p =>
      `${(p.seconds / span * w).toFixed(1)} ${(h - pad - p.mbps / peak * (h - 2 * pad)).toFixed(1)}`);
    const line = `M 0 ${h - pad} L ${xy.join(' L ')}`;
    const lastX = xy[xy.length - 1].split(' ')[0];
    s.line.setAttribute('d', line);
    s.area.setAttribute('d', `${line} L ${lastX} ${h} L 0 ${h} Z`);
  },

  reset() {
    for (const s of Object.values(this.series)) {
      s.points = [];
      s.last = { seconds: 0, bytes: 0 };
      this.draw(s);
    }
  },
};
