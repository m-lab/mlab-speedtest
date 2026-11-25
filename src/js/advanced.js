/**
 * The collapsed "Details" section of the results: charts of the server's
 * TCPInfo over the download, the final figures of both directions, and a
 * copy of the raw result.
 *
 * The charts cover the download only. Retransmissions, busy time and window
 * limits describe the sending side, and the server only sends during download.
 * Labels here are protocol field names and are deliberately not translated.
 */
const Advanced = {
  DURATION: 10, // Nominal length of one ndt7 direction, in seconds

  // value() maps a TCPInfo snapshot to the plotted number; times are in microseconds
  CHARTS: [
    { key: 'rtt', title: 'Round-trip time', field: 'RTT', unit: 'ms', digits: 1,
      value: t => t.RTT / 1000 },
    { key: 'retrans', title: 'Retransmission rate', field: 'BytesRetrans / BytesSent', unit: '%', digits: 2,
      value: t => Advanced.percent(t.BytesRetrans, t.BytesSent) },
    { key: 'busy', title: 'Sender busy', field: 'BusyTime / ElapsedTime', unit: '%', digits: 1, max: 100,
      value: t => Advanced.percent(t.BusyTime, t.ElapsedTime) },
    { key: 'rwnd', title: 'Receive-window limited', field: 'RWndLimited / ElapsedTime', unit: '%', digits: 1,
      value: t => Advanced.percent(t.RWndLimited, t.ElapsedTime) },
  ],

  charts: {},
  samples: [],
  result: {},
  els: {},

  init() {
    this.els = {
      charts: document.getElementById('advancedCharts'),
      stats: document.getElementById('advancedStats'),
      copy: document.getElementById('copyResult'),
    };
    this.els.charts.innerHTML = this.CHARTS.map(c => `<figure class="chart">
      <figcaption>
        <span class="chart-title">${c.title}</span>
        <span class="chart-now"><b data-now></b> ${c.unit}</span>
        <code class="chart-field">${c.field}</code>
        <span class="chart-range" data-range></span>
      </figcaption>
      <div class="chart-plot">
        <div class="chart-y" aria-hidden="true"><span data-y="1"></span><span data-y="0.5"></span><span data-y="0">0</span></div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="${c.title} over time, in ${c.unit}">
          <path class="chart-grid" d="M 0 0 H 100 M 0 50 H 100" />
          <path class="chart-area" /><path class="chart-line" />
          <path class="chart-axis" d="M 0 0 V 100 H 100" />
        </svg>
        <div class="chart-x" aria-hidden="true"></div>
      </div>
    </figure>`).join('');
    this.CHARTS.forEach((c, i) => {
      const root = this.els.charts.children[i];
      this.charts[c.key] = {
        now: root.querySelector('[data-now]'),
        range: root.querySelector('[data-range]'),
        yMax: root.querySelector('[data-y="1"]'),
        yMid: root.querySelector('[data-y="0.5"]'),
        x: root.querySelector('.chart-x'),
        area: root.querySelector('.chart-area'),
        line: root.querySelector('.chart-line'),
      };
    });
    this.els.copy.addEventListener('click', () => this.copy());
    this.reset();
  },

  percent(part, whole) {
    return whole > 0 ? part / whole * 100 : 0;
  },

  /**
   * Round a maximum up to 1, 2 or 5 times a power of ten, so the axis
   * labels are round numbers.
   */
  niceMax(value) {
    if (!(value > 0)) return 1;
    const exp = Math.pow(10, Math.floor(Math.log10(value)));
    const f = value / exp;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
  },

  label(value) {
    return String(Number(value.toPrecision(3)));
  },

  reset() {
    this.samples = [];
    this.result = {};
    this.draw();
    this.renderStats();
    this.els.copy.disabled = true;
  },

  setServer(machine) {
    this.result.Server = machine;
  },

  /**
   * Record one server measurement received during the download.
   */
  addDownloadSample(measurement) {
    const t = measurement && measurement.TCPInfo;
    if (!t || !(t.ElapsedTime > 0)) return;
    this.samples.push({ seconds: t.ElapsedTime / 1e6, tcp: t });
    this.draw();
  },

  /**
   * Keep the final measurements of 'Download' or 'Upload'.
   */
  setFinal(direction, data) {
    this.result[direction] = data;
    this.renderStats();
    this.els.copy.disabled = false;
  },

  draw() {
    const last = this.samples[this.samples.length - 1];
    const span = Math.max(this.DURATION, last ? last.seconds : 0);
    const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => this.label(span * f));
    ticks[ticks.length - 1] += ' s';

    for (const c of this.CHARTS) {
      const chart = this.charts[c.key];
      const values = this.samples.map(s => c.value(s.tcp));
      // A little headroom keeps a line at its peak off the top edge
      const max = c.max || this.niceMax(Math.max(0, ...values) * 1.1);
      chart.yMax.textContent = this.label(max);
      chart.yMid.textContent = this.label(max / 2);
      chart.x.innerHTML = ticks.map(t => `<span>${t}</span>`).join('');
      if (!values.length) {
        chart.now.textContent = '–';
        chart.range.textContent = '';
        chart.line.setAttribute('d', '');
        chart.area.setAttribute('d', '');
        continue;
      }
      chart.now.textContent = values[values.length - 1].toFixed(c.digits);
      chart.range.textContent =
        `min ${Math.min(...values).toFixed(c.digits)} · max ${Math.max(...values).toFixed(c.digits)}`;
      const xy = this.samples.map((s, i) =>
        `${(s.seconds / span * 100).toFixed(2)} ${(100 - Math.min(values[i] / max, 1) * 100).toFixed(2)}`);
      const line = `M ${xy.join(' L ')}`;
      chart.line.setAttribute('d', line);
      chart.area.setAttribute('d',
        `${line} L ${xy[xy.length - 1].split(' ')[0]} 100 L ${xy[0].split(' ')[0]} 100 Z`);
    }
  },

  /**
   * The final figures that the charts don't already show, as [label, value]
   * pairs: short ones for the grid of cells, long ones for full-width rows.
   * Entries whose source field is missing are left out. The arrows mark the
   * direction: down for the download, up for the upload.
   */
  stats() {
    const r = this.result;
    const dl = r.Download && r.Download.LastServerMeasurement || {};
    const ul = r.Upload && r.Upload.LastServerMeasurement || {};
    const t = dl.TCPInfo || {};
    const u = ul.TCPInfo || {};
    const has = v => typeof v === 'number' && isFinite(v);
    const ms = v => (v / 1000).toFixed(1);
    const mb = v => has(v) && `${(v / 1e6).toFixed(2)} MB`;
    const secs = v => has(v) && `${(v / 1e6).toFixed(2)} s`;
    const present = pairs => pairs.filter(([, value]) => value);
    return {
      cells: present([
        ['\u2193 MinRTT', has(t.MinRTT) && `${ms(t.MinRTT)} ms`],
        ['\u2193 RTT \u00b1 RTTVar', has(t.RTT) && has(t.RTTVar) && `${ms(t.RTT)} \u00b1 ${ms(t.RTTVar)} ms`],
        ['\u2193 BytesSent', mb(t.BytesSent)],
        ['\u2193 BytesRetrans', mb(t.BytesRetrans)],
        ['\u2193 SndBufLimited', has(t.SndBufLimited) && t.ElapsedTime > 0 &&
          `${this.percent(t.SndBufLimited, t.ElapsedTime).toFixed(2)} %`],
        ['\u2193 BBRInfo.BW', dl.BBRInfo && has(dl.BBRInfo.BW) && `${(dl.BBRInfo.BW / 1e6).toFixed(2)} Mb/s`],
        ['\u2193 ElapsedTime', secs(t.ElapsedTime)],
        ['\u2191 BytesReceived', mb(u.BytesReceived)],
        ['\u2191 ElapsedTime', secs(u.ElapsedTime)],
      ]),
      rows: present([
        ['Server', r.Server],
        ['\u2193 UUID', dl.ConnectionInfo && dl.ConnectionInfo.UUID],
        ['\u2191 UUID', ul.ConnectionInfo && ul.ConnectionInfo.UUID],
      ]),
    };
  },

  renderStats() {
    // Values come from the server, so they are set as text, never as HTML
    const list = (className, pairs) => {
      const dl = document.createElement('dl');
      dl.className = className;
      for (const [label, value] of pairs) {
        const item = document.createElement('div');
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = label;
        dd.textContent = value;
        item.append(dt, dd);
        dl.append(item);
      }
      return dl;
    };
    const { cells, rows } = this.stats();
    this.els.stats.replaceChildren(
      ...(cells.length ? [list('stat-cells', cells)] : []),
      ...(rows.length ? [list('stat-rows', rows)] : []));
  },

  async copy() {
    const label = this.els.copy.querySelector('span');
    const original = label.textContent;
    try {
      await navigator.clipboard.writeText(JSON.stringify(this.result, null, 2));
      label.textContent = 'Copied';
    } catch (err) {
      label.textContent = 'Copy failed';
    }
    setTimeout(() => { label.textContent = original; }, 1500);
  },
};
