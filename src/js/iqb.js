/**
 * Internet Quality Barometer (IQB) indicators for a single test.
 *
 * This is the scoring of https://github.com/m-lab/iqb, ported from
 * library/src/iqb/calculator/ at commit 25133ba (Apache-2.0): every use case
 * has four network requirements, each one passes or fails against a
 * threshold, a use case scores the weighted share of its requirements that
 * pass, and the IQB score is the mean of the use case scores.
 *
 * IQB publishes scores computed on a percentile of many tests for a region
 * or network. Here the same arithmetic runs on one test, so the result
 * describes this test only. Re-sync the table below if upstream changes it.
 */
const Iqb = {
  REQUIREMENTS: [
    { key: 'download', label: '↓ Mb/s', higherIsBetter: true, show: v => v.toFixed(2) },
    { key: 'upload', label: '↑ Mb/s', higherIsBetter: true, show: v => v.toFixed(2) },
    { key: 'latency', label: 'MinRTT ms', higherIsBetter: false, show: v => v.toFixed(1) },
    // A fraction, as upstream; shown as a percentage
    { key: 'loss', label: 'Retrans %', higherIsBetter: false, show: v => (v * 100).toFixed(2), scale: 100 },
  ],

  // [threshold, weight] per requirement. Every use case has weight 1.
  USE_CASES: [
    { name: 'Web browsing', download: [10, 3], upload: [10, 2], latency: [100, 4], loss: [0.01, 4] },
    { name: 'Video streaming', download: [25, 4], upload: [10, 2], latency: [100, 4], loss: [0.01, 4] },
    { name: 'Audio streaming', download: [10, 4], upload: [5, 1], latency: [100, 3], loss: [0.01, 4] },
    { name: 'Video conferencing', download: [25, 4], upload: [25, 4], latency: [50, 4], loss: [0.005, 4] },
    { name: 'Online backup', download: [10, 4], upload: [25, 4], latency: [100, 2], loss: [0.01, 4] },
    { name: 'Gaming', download: [25, 4], upload: [25, 4], latency: [10, 5], loss: [0.005, 4] },
  ],

  els: {},

  init() {
    this.els = {
      score: document.getElementById('iqbScore'),
      badges: document.getElementById('iqbBadges'),
      checks: document.getElementById('iqbChecks'),
    };
    this.els.badges.replaceChildren(...this.USE_CASES.map(useCase => {
      const item = document.createElement('li');
      const name = document.createElement('span');
      const value = document.createElement('span');
      item.className = 'iqb-badge';
      name.textContent = i18n.t(useCase.name);
      value.className = 'iqb-value';
      item.append(name, value);
      return item;
    }));
    this.reset();
  },

  reset() {
    this.els.score.textContent = '';
    for (const badge of this.els.badges.children) {
      badge.classList.remove('is-full', 'is-partial');
      badge.querySelector('.iqb-value').textContent = '';
    }
    this.els.checks.hidden = true;
  },

  /**
   * The four IQB inputs from the final measurements of a test, taken the
   * way IQB's M-Lab pipeline takes them, or null if any is missing.
   * TCPInfo times are in microseconds, so bytes * 8 / time is in Mb/s.
   */
  inputs(download, upload) {
    const d = download && download.LastServerMeasurement && download.LastServerMeasurement.TCPInfo || {};
    const u = upload && upload.LastServerMeasurement && upload.LastServerMeasurement.TCPInfo || {};
    const inputs = {
      download: d.BytesAcked * 8 / d.ElapsedTime,
      upload: u.BytesReceived * 8 / u.ElapsedTime,
      latency: d.MinRTT / 1000,
      loss: d.BytesRetrans / d.BytesSent,
    };
    return Object.values(inputs).every(v => isFinite(v) && v >= 0) ? inputs : null;
  },

  /**
   * Binary requirement score: throughput must be above its threshold,
   * latency and loss below theirs.
   */
  passes(requirement, value, threshold) {
    return requirement.higherIsBetter ? value > threshold : value < threshold;
  },

  /**
   * Score the inputs: per use case, which requirements pass and the weighted
   * share that do; overall, the mean of the use case scores. All in [0, 1].
   */
  score(inputs) {
    const useCases = this.USE_CASES.map(useCase => {
      let passed = 0;
      let total = 0;
      const checks = {};
      for (const requirement of this.REQUIREMENTS) {
        const [threshold, weight] = useCase[requirement.key];
        checks[requirement.key] = this.passes(requirement, inputs[requirement.key], threshold);
        if (checks[requirement.key]) passed += weight;
        total += weight;
      }
      return { name: useCase.name, score: passed / total, checks };
    });
    return {
      score: useCases.reduce((sum, u) => sum + u.score, 0) / useCases.length,
      useCases,
    };
  },

  /**
   * Show the indicators for a finished test, given what downloadComplete
   * and uploadComplete received. Leaves them blank if an input is missing.
   */
  update(download, upload) {
    const inputs = this.inputs(download, upload);
    if (!inputs) return;
    const result = this.score(inputs);
    this.els.score.textContent = result.score.toFixed(2);
    result.useCases.forEach((useCase, i) => {
      const badge = this.els.badges.children[i];
      badge.classList.add(useCase.score === 1 ? 'is-full' : 'is-partial');
      badge.querySelector('.iqb-value').textContent = useCase.score.toFixed(2);
    });
    this.renderChecks(inputs, result);
  },

  /**
   * The table behind the scores, for the details section: this test's
   * values, then each use case's thresholds with a pass or fail mark.
   */
  renderChecks(inputs, result) {
    const row = (tag, cells) => {
      const tr = document.createElement('tr');
      cells.forEach(([text, className], i) => {
        const cell = document.createElement(i === 0 ? 'th' : tag);
        cell.textContent = text;
        if (className) cell.className = className;
        tr.append(cell);
      });
      return tr;
    };
    const table = document.createElement('table');
    table.append(
      row('th', [['IQB'], ...this.REQUIREMENTS.map(r => [r.label])]),
      row('td', [['This test'], ...this.REQUIREMENTS.map(r => [r.show(inputs[r.key])])]),
      ...result.useCases.map((useCase, i) => row('td', [
        [useCase.name],
        ...this.REQUIREMENTS.map(r => {
          const pass = useCase.checks[r.key];
          const threshold = this.USE_CASES[i][r.key][0] * (r.scale || 1);
          return [`${pass ? '✓' : '✗'} ${r.higherIsBetter ? '>' : '<'}${threshold}`,
            pass ? 'is-pass' : 'is-fail'];
        }),
      ])));
    this.els.checks.replaceChildren(table);
    this.els.checks.hidden = false;
  },
};
