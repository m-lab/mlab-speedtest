'use strict';

/**
 * M-Lab Speed Test - Main Application
 */

const SpeedTest = {
  testRunning: false,
  privacyConsent: false,
  measurementComplete: false,
  resultsVisible: false,
  locateFailed: false,
  sessionID: null,
  hasToken: false,
  failures: [],
  measurementResult: {},

  // DOM elements (cached on init)
  els: {},

  init() {
    if (window.Sentry && mlabSentryDsn) {
      Sentry.init({
        dsn: mlabSentryDsn,
        environment: mlabEnvName,
        integrations: [Sentry.browserTracingIntegration()],
        tracesSampleRate: 1.0,
      });
    }

    // Cache DOM elements
    this.els = {
      startButton: document.getElementById('startButton'),
      privacyCheckbox: document.getElementById('dataPolicyAgreement'),
      privacyMessage: document.getElementById('privacyMessage'),
      currentSpeed: document.getElementById('currentSpeed'),
      currentUnit: document.getElementById('currentUnit'),
      currentPhase: document.getElementById('currentPhase'),
      hero: document.getElementById('intro'),
      measurementSpace: document.getElementById('measurementSpace'),
      resultsSection: document.getElementById('resultsSection'),
      resultsStatus: document.getElementById('resultsStatus'),
      resultsError: document.getElementById('resultsError'),
      resultsMain: document.querySelector('.results-main'),
      iqb: document.querySelector('.iqb'),

      // Results
      location: document.getElementById('ndtLocation'),
      s2cRate: document.getElementById('s2cRate'),
      c2sRate: document.getElementById('c2sRate'),
      latency: document.getElementById('latency'),
      latencyUpload: document.getElementById('latencyUpload'),
      loss: document.getElementById('loss'),
    };

    // Bind events
    this.els.privacyCheckbox.addEventListener('change', () => this.onPrivacyChange());
    this.els.startButton.addEventListener('click', () => this.startTest());

    // Initialize gauge
    ProgressGauge.init();
    Sparkline.init();
    Advanced.init();
    Iqb.init();

    // Scrollspy: update active nav link based on which section is in view
    const sections = document.querySelectorAll('main > section[id]');
    const navLinks = document.querySelectorAll('.site-nav a');

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
          });
        }
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

    sections.forEach(section => observer.observe(section));

    // Force a known-good UI state on init: browsers may restore form
    // values or cached display styles without firing change events.
    this.els.privacyCheckbox.checked = false;
    this.updateUI();
  },

  onPrivacyChange() {
    this.privacyConsent = this.els.privacyCheckbox.checked;
    this.updateUI();
  },

  updateUI() {
    // Update button state
    this.els.startButton.disabled = !this.privacyConsent || this.testRunning;
    this.els.privacyCheckbox.disabled = this.testRunning;

    // Update button text
    const beginSpan = this.els.startButton.querySelector('.btn-begin');
    const againSpan = this.els.startButton.querySelector('.btn-again');
    const testingSpan = this.els.startButton.querySelector('.btn-testing');

    testingSpan.hidden = !this.testRunning;
    againSpan.hidden = this.testRunning || !this.measurementComplete;
    beginSpan.hidden = this.testRunning || this.measurementComplete;

    // Hide the privacy message once agreed, keeping its space so nothing below moves
    this.els.privacyMessage.classList.toggle('is-met', this.privacyConsent);

    this.els.resultsSection.hidden = !this.resultsVisible;
    // From the first run on, the results panel takes the place of the intro copy
    if (this.resultsVisible) this.els.hero.classList.add('has-results');
  },

  /**
   * Clear the displayed result fields so a re-run can't show stale
   * values from a previous test if the current one fails partway.
   */
  clearResults() {
    this.els.location.textContent = '';
    this.els.s2cRate.textContent = '';
    this.els.c2sRate.textContent = '';
    this.els.latency.textContent = '';
    this.els.latencyUpload.textContent = '';
    this.els.loss.textContent = '';
  },

  /**
   * Show a status word, or a live rate in Mb/s, in the middle of the gauge.
   */
  setReadout(text, mbps) {
    const isRate = typeof mbps === 'number';
    this.els.currentSpeed.textContent = isRate ? mbps.toFixed(2) : text;
    this.els.currentUnit.hidden = !isRate;
    this.els.currentSpeed.parentElement.classList.toggle('is-rate', isRate);
    // Lets CSS shrink multi-gigabit rates so they stay inside the rings
    this.els.currentSpeed.parentElement.style.setProperty('--chars', this.els.currentSpeed.textContent.length);
  },

  /**
   * Show the latency of one direction: the minimum round-trip time the
   * server has seen so far, from any of its measurements, final or not.
   */
  setLatency(el, measurement) {
    const minRTT = measurement && measurement.TCPInfo && measurement.TCPInfo.MinRTT;
    if (minRTT > 0) el.textContent = (minRTT / 1000).toFixed(0);
  },

  /**
   * Announce the final rates once to assistive tech.
   */
  announceResults() {
    const r = this.measurementResult;
    const parts = [];
    if (r.s2cRate) parts.push(`${i18n.t('Download')} ${r.s2cRate} Mb/s`);
    if (r.c2sRate) parts.push(`${i18n.t('Upload')} ${r.c2sRate} Mb/s`);
    this.els.resultsStatus.textContent = parts.join(', ');
  },

  async startTest() {
    if (!this.privacyConsent || this.testRunning) {
      return;
    }

    ProgressGauge.reset();
    Sparkline.reset();
    Advanced.reset();
    Iqb.reset();
    this.testRunning = true;
    this.measurementComplete = false;
    this.measurementResult = {};
    this.clearResults();
    this.clearFailure();
    // The results panel is on screen for the whole run and fills in as it goes
    this.resultsVisible = true;
    this.updateUI();

    // Scroll to measurement area on mobile
    if (window.matchMedia('(max-width: 899px)').matches) {
      this.els.measurementSpace.scrollIntoView({ behavior: 'smooth' });
    }

    this.els.resultsStatus.textContent = '';
    this.setReadout(i18n.t('Starting'));
    this.els.currentPhase.textContent = '';

    // Execute ndt7
    try {
      this.sessionID = this.generateSessionID();
      await this.runNdt7(this.sessionID);
    } catch (err) {
      console.error('Test failed:', err);
      const eventId = window.Sentry ? Sentry.captureException(err) : undefined;
      this.recordFailure(err, eventId);
    }

    // ndt7 reports most failures through its error callback and then returns
    // normally, so success is judged by what the test produced: a rate for
    // each direction.
    const hasDownload = Boolean(this.measurementResult.s2cRate);
    const hasUpload = Boolean(this.measurementResult.c2sRate);
    ProgressGauge.reset();
    this.setReadout('');
    if (hasDownload && hasUpload) {
      // The gauge is a live instrument: once the rates are in the results
      // panel it empties and only marks the test as complete
      ProgressGauge.setPhase('done');
      this.els.currentPhase.textContent = i18n.t('Complete');
      this.announceResults();
      Iqb.update(Advanced.result.Download, Advanced.result.Upload);
    } else {
      this.els.currentPhase.textContent = i18n.t('Error');
      this.showFailure(hasDownload, hasUpload);
    }
    this.measurementComplete = true;
    this.testRunning = false;
    this.updateUI();
  },

  /**
   * Explain a failed test in the results panel. With nothing measured the
   * message replaces the figures; with one direction measured it stands in
   * for the IQB ratings, which need both, and the figures stay.
   */
  showFailure(hasDownload, hasUpload) {
    let message;
    if (hasDownload) {
      message = 'The upload test could not be completed. Please try again.';
    } else if (hasUpload) {
      message = 'The download test could not be completed. Please try again.';
    } else if (this.locateFailed) {
      message = 'Could not find a test server. Please try again in a few minutes.';
    } else {
      message = 'The test could not be completed. Please try again.';
    }
    const partial = hasDownload || hasUpload;
    (partial ? this.els.iqb : this.els.resultsMain).append(this.els.resultsError);
    this.els.resultsMain.classList.toggle('is-failed', !partial);
    this.els.iqb.classList.toggle('is-unavailable', partial);
    this.els.resultsError.textContent = i18n.t(message);
    this.els.resultsError.hidden = false;

    Advanced.showDiagnostics({
      SessionID: this.sessionID,
      Time: new Date().toISOString(),
      Environment: typeof mlabEnvName === 'undefined' ? undefined : mlabEnvName,
      PriorityToken: this.hasToken,
      Library: typeof mlabNdt7Version === 'undefined' ? undefined : `ndt7-js ${mlabNdt7Version}`,
      Server: this.ndt7Machine,
      Errors: this.failures,
    });
  },

  /**
   * Remember an error and the phase it happened in, for the diagnostics.
   */
  recordFailure(err, sentryEventId) {
    this.failures.push({
      Phase: this.ndt7Phase || 'start',
      Message: String(err && err.message || err),
      // Without a DSN the SDK still hands out ids, for events it never sends
      ...(sentryEventId && mlabSentryDsn && { SentryEventID: sentryEventId }),
    });
  },

  clearFailure() {
    this.failures = [];
    this.sessionID = null;
    this.ndt7Phase = null;
    this.locateFailed = false;
    this.els.resultsMain.classList.remove('is-failed');
    this.els.iqb.classList.remove('is-unavailable');
    this.els.resultsError.hidden = true;
    this.els.resultsError.textContent = '';
  },

  /**
   * Generate a random UUID, falling back to crypto.getRandomValues on
   * browsers without crypto.randomUUID (e.g. Chrome < 92, iOS Safari < 15.4).
   */
  generateSessionID() {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    const b = crypto.getRandomValues(new Uint8Array(16));
    // Set version 4 and the RFC 4122 variant bits
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    let hex = '';
    for (let i = 0; i < 16; i++) {
      hex += (b[i] + 0x100).toString(16).slice(1);
    }
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) +
      '-' + hex.slice(16, 20) + '-' + hex.slice(20);
  },

  /**
   * Determine the M-Lab project based on js/env.js, which we
   * generate using `./scripts/build.js`.
   */
  mlabProject() {
    if (mlabEnvName !== 'prod' && mlabEnvName !== 'staging') {
      throw Error('The mlabEnvName variable has not been configured!');
    }
    return mlabEnvName === 'prod' ? 'mlab-oti' : 'mlab-staging';
  },

  /**
   * Build the locate service priority URL for the given project.
   */
  locatePriorityURLForProject(project) {
    const host = project === 'mlab-oti'
      ? 'locate.measurementlab.net'
      : `locate.${project}.measurementlab.net`;
    return `https://${host}/v2/priority/nearest/ndt/ndt7`;
  },

  async runNdt7(sid) {
    // Current phase and server, used to tag ndt7 errors in Sentry. The phase
    // moves through discovery, download-connect, download, upload-connect and
    // upload, so connection failures can be told apart from mid-test drops.
    this.ndt7Phase = 'discovery';
    this.ndt7Machine = null;
    this.ndt7Site = null;

    const project = this.mlabProject();
    console.log(`[ndt7] mlabProject: ${project}`);

    const tokenURL = `https://speed-backend.${project}.measurementlab.net/v0/token`;
    console.log(`[ndt7] tokenURL: ${tokenURL}`);

    const locatePriorityURL = this.locatePriorityURLForProject(project);
    console.log(`[ndt7] locatePriorityURL: ${locatePriorityURL}`);

    let token = null;
    try {
      const tokenResp = await fetch(tokenURL);
      if (!tokenResp.ok) {
        const httpErr = new Error(`Token fetch failed: HTTP ${tokenResp.status}`);
        httpErr.status = tokenResp.status;
        throw httpErr;
      }
      let tokenData;
      try {
        tokenData = await tokenResp.json();
      } catch (parseErr) {
        const bodyErr = new Error(`Token fetch returned an invalid body: ${parseErr.message}`);
        bodyErr.invalidBody = true;
        throw bodyErr;
      }
      token = tokenData.token;
    } catch (err) {
      console.warn('[ndt7] Failed to fetch token, running without priority access:', err);
      // Aborts happen when the browser cancels the fetch on navigation; not worth reporting.
      if (window.Sentry && err.name !== 'AbortError') {
        // Group HTTP and bad-body failures by cause; network errors keep default grouping.
        const fingerprint = err.status ? ['token-fetch', String(err.status)]
          : err.invalidBody ? ['token-fetch', 'invalid-json'] : undefined;
        Sentry.captureException(err, {
          level: 'warning',
          tags: { test: 'ndt7', phase: 'token-fetch', status: err.status || 'none' },
          ...(fingerprint && { fingerprint }),
        });
      }
    }

    this.hasToken = Boolean(token);
    const loadbalancer = token ? locatePriorityURL : null;
    console.log(`[ndt7] loadbalancer: ${loadbalancer}`);

    return ndt7.test(
      {
        clientRegistrationToken: token,
        loadbalancer: loadbalancer,
        userAcceptedDataPolicy: true,
        uploadworkerfile: '/libraries/ndt7-upload-worker.js',
        downloadworkerfile: '/libraries/ndt7-download-worker.js',
        metadata: {
          client_name: 'speed-measurementlab-net',
          client_session_id: sid,
        }
      },
      {
        error: (err) => {
          console.error('[ndt7] error:', err);
          const tags = { test: 'ndt7', phase: this.ndt7Phase };
          if (this.ndt7Machine) tags.machine = this.ndt7Machine;
          if (this.ndt7Site) tags.site = this.ndt7Site;
          // The ndt7 workers report WebSocket failures as the bare string
          // 'error', so group those by phase. Locate failures embed the
          // per-session URL in the message, so group them under one issue.
          let fingerprint;
          if (err === 'error') {
            fingerprint = ['ndt7-websocket-error', this.ndt7Phase];
          } else if (typeof err === 'string' &&
              err.startsWith('Could not understand response from')) {
            this.locateFailed = true;
            fingerprint = ['ndt7-locate-error'];
          }
          const eventId = window.Sentry ? Sentry.captureException(
            err instanceof Error ? err : new Error(String(err)),
            fingerprint ? { tags, fingerprint } : { tags },
          ) : undefined;
          this.recordFailure(err, eventId);
          // ndt7 still runs the upload after a failed download.
          if (this.ndt7Phase === 'download-connect' || this.ndt7Phase === 'download') {
            this.ndt7Phase = 'upload-connect';
          }
        },
        serverChosen: (server) => {
          this.ndt7Phase = 'download-connect';
          this.ndt7Machine = server.machine;
          Advanced.setServer(server.machine);
          // Site is the second dash-separated part of the hostname, for both
          // mlab3-bog02.mlab-oti... and ndt-sin15830-931cb329.equinix.autojoin...
          this.ndt7Site = (server.machine || '').split('.')[0].split('-')[1] || null;
          this.els.location.textContent = server.location.city + ', ' + server.location.country;
          console.log('[ndt7] Testing to:', {
            machine: server.machine,
            locations: server.location,
          });
        },
        // ndt7 calls downloadStart and uploadStart when the WebSocket opens.
        downloadStart: () => {
          this.ndt7Phase = 'download';
          this.els.currentPhase.textContent = i18n.t('Download');
          ProgressGauge.setPhase('download');
          this.setReadout(i18n.t('Initializing'));
        },
        downloadMeasurement: (data) => {
          if (data.Source === 'client') {
            this.setReadout(null, data.Data.MeanClientMbps);
            ProgressGauge.setSpeed('download', data.Data.MeanClientMbps);
            Sparkline.add('download', data.Data.ElapsedTime, data.Data.NumBytes);
          } else if (data.Source === 'server') {
            Advanced.addDownloadSample(data.Data);
            this.setLatency(this.els.latency, data.Data);
          }
        },
        downloadComplete: (data) => {
          this.ndt7Phase = 'upload-connect';
          Advanced.setFinal('Download', data);
          if (data.LastClientMeasurement) {
            this.measurementResult.s2cRate =
              data.LastClientMeasurement.MeanClientMbps.toFixed(2);
            this.els.s2cRate.textContent = this.measurementResult.s2cRate;
            ProgressGauge.setSpeed('download', data.LastClientMeasurement.MeanClientMbps);
          }
          if (data.LastServerMeasurement?.TCPInfo) {
            this.measurementResult.loss =
              (data.LastServerMeasurement.TCPInfo.BytesRetrans /
                data.LastServerMeasurement.TCPInfo.BytesSent * 100).toFixed(2);
            this.setLatency(this.els.latency, data.LastServerMeasurement);
            this.els.loss.textContent = this.measurementResult.loss;
          }
          console.log(data);
        },
        uploadStart: () => {
          this.ndt7Phase = 'upload';
          this.els.currentPhase.textContent = i18n.t('Upload');
          ProgressGauge.setPhase('upload');
          this.setReadout(i18n.t('Initializing'));
        },
        uploadMeasurement: (data) => {
          if (data.Source === 'server') {
            this.setLatency(this.els.latencyUpload, data.Data);
            const mbps = data.Data.TCPInfo.BytesReceived / data.Data.TCPInfo.ElapsedTime * 8;
            this.setReadout(null, mbps);
            ProgressGauge.setSpeed('upload', mbps);
            // TCPInfo.ElapsedTime is in microseconds
            Sparkline.add('upload', data.Data.TCPInfo.ElapsedTime / 1e6, data.Data.TCPInfo.BytesReceived);
          }
        },
        uploadComplete: (data) => {
          Advanced.setFinal('Upload', data);
          this.setLatency(this.els.latencyUpload, data.LastServerMeasurement);
          if (data.LastServerMeasurement?.TCPInfo) {
            this.measurementResult.c2sRate =
              (data.LastServerMeasurement.TCPInfo.BytesReceived /
                data.LastServerMeasurement.TCPInfo.ElapsedTime * 8).toFixed(2);
            this.els.c2sRate.textContent = this.measurementResult.c2sRate;
            ProgressGauge.setSpeed('upload', parseFloat(this.measurementResult.c2sRate));
          }
        },
      },
    );
  },
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  await i18n.init();
  SpeedTest.init();
});
