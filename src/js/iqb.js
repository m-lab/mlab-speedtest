/**
 * Internet Quality Barometer (IQB) indicators for a single test.
 *
 * This is the scoring of https://github.com/m-lab/iqb, ported from
 * library/src/iqb/calculator/ at commit 25133ba (Apache-2.0): every use case
 * has four network requirements, each one passes or fails against a
 * threshold, and a use case scores the weighted share of its requirements
 * that pass. (Upstream then averages the use cases into one IQB score; this
 * page shows the use cases only.)
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
    { name: 'Web browsing', icon: 'globe', download: [10, 3], upload: [10, 2], latency: [100, 4], loss: [0.01, 4] },
    { name: 'Video streaming', icon: 'tv', download: [25, 4], upload: [10, 2], latency: [100, 4], loss: [0.01, 4] },
    { name: 'Audio streaming', icon: 'headphones', download: [10, 4], upload: [5, 1], latency: [100, 3], loss: [0.01, 4] },
    { name: 'Video conferencing', icon: 'video', download: [25, 4], upload: [25, 4], latency: [50, 4], loss: [0.005, 4] },
    { name: 'Online backup', icon: 'cloud-upload', download: [10, 4], upload: [25, 4], latency: [100, 2], loss: [0.01, 4] },
    { name: 'Gaming', icon: 'gamepad-2', download: [25, 4], upload: [25, 4], latency: [10, 5], loss: [0.005, 4] },
  ],

  // A use case's score is shown as the first rating whose minimum it reaches.
  // "Very good" means every requirement is met.
  RATINGS: [
    { key: 'very-good', label: 'Very good', min: 1 },
    { key: 'good', label: 'Good', min: 0.75 },
    { key: 'average', label: 'Average', min: 0.5 },
    { key: 'poor', label: 'Poor', min: 0 },
  ],

  els: {},

  rating(score) {
    return this.RATINGS.find(r => score >= r.min);
  },

  init() {
    this.els = {
      badges: document.getElementById('iqbBadges'),
      checks: document.getElementById('iqbChecks'),
    };
    // One ring per use case: an icon inside a circle that fills to the score
    this.els.badges.innerHTML = this.USE_CASES.map(useCase => `<li class="iqb-item">
      <span class="iqb-ring">
        <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
          <circle class="iqb-ring-track" cx="24" cy="24" r="21" />
          <circle class="iqb-ring-value" cx="24" cy="24" r="21" pathLength="100" transform="rotate(-90 24 24)" />
        </svg>
        <span class="iqb-icon icon icon-${useCase.icon}"></span>
      </span>
      <span class="iqb-name"></span>
      <span class="iqb-value" dir="ltr"></span>
    </li>`).join('');
    this.USE_CASES.forEach((useCase, i) => {
      this.els.badges.children[i].querySelector('.iqb-name').textContent = i18n.t(useCase.name);
    });
    this.reset();
  },

  /**
   * Fill a use case's ring to a score in [0, 1] and label it with the
   * matching rating, or empty it with null.
   */
  setRing(item, score) {
    const arc = item.querySelector('.iqb-ring-value');
    const filled = score > 0;
    arc.setAttribute('stroke-dasharray', `${filled ? (score * 100).toFixed(1) : 0} 100`);
    // A zero-length dash with round caps would still draw a dot
    arc.style.visibility = filled ? 'visible' : 'hidden';
    const rating = score === null ? null : this.rating(score);
    for (const r of this.RATINGS) item.classList.toggle(`is-${r.key}`, r === rating);
    item.querySelector('.iqb-value').textContent = rating ? i18n.t(rating.label) : '';
  },

  reset() {
    for (const item of this.els.badges.children) this.setRing(item, null);
    this.els.checks.hidden = true;
  },

  /**
   * The four IQB inputs from the final measurements of a test, taken the
   * way IQB's M-Lab pipeline takes them (all from the server's side), or
   * null if any is missing.
   */
  inputs(download, upload) {
    const d = download && download.LastServerMeasurement && download.LastServerMeasurement.TCPInfo || {};
    const u = upload && upload.LastServerMeasurement && upload.LastServerMeasurement.TCPInfo || {};
    const inputs = {
      download: Measurement.downloadMbps(d),
      upload: Measurement.uploadMbps(u),
      latency: d.MinRTT / 1000,
      loss: Measurement.retransmission(d),
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
   * Score the inputs: for each use case, which requirements pass and the
   * weighted share that do, in [0, 1].
   */
  score(inputs) {
    return this.USE_CASES.map(useCase => {
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
  },

  /**
   * Show the indicators for a finished test, given what ndt7 reported when
   * each direction completed. Returns false, leaving them blank, if the
   * server measurements lack an input.
   */
  update(download, upload) {
    const inputs = this.inputs(download, upload);
    if (!inputs) return false;
    const useCases = this.score(inputs);
    useCases.forEach((useCase, i) => {
      this.setRing(this.els.badges.children[i], useCase.score);
    });
    this.renderChecks(inputs, useCases);
    return true;
  },

  /**
   * The table behind the scores, for the details section: this test's
   * values, then each use case's thresholds with a pass or fail mark.
   */
  renderChecks(inputs, useCases) {
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
      ...useCases.map((useCase, i) => row('td', [
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
