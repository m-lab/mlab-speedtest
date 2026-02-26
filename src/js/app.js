'use strict';

/**
 * M-Lab Speed Test - Main Application
 */

const SpeedTest = {
  TIME_EXPECTED: 10, // Expected duration of a test in seconds
  testRunning: false,
  privacyConsent: false,
  measurementComplete: false,
  measurementResult: {},
  msakResult: {},

  // DOM elements (cached on init)
  els: {},

  init() {
    // Cache DOM elements
    this.els = {
      startButton: document.getElementById('startButton'),
      privacyCheckbox: document.getElementById('privacyConsent'),
      privacyMessage: document.getElementById('privacyMessage'),
      currentSpeed: document.getElementById('currentSpeed'),
      currentPhase: document.getElementById('currentPhase'),
      measurementSpace: document.getElementById('measurementSpace'),
      progressSection: document.getElementById('progressSection'),
      resultsSection: document.getElementById('resultsSection'),

      // Results
      location: document.getElementById('ndtLocation'),
      msakLocation: document.getElementById('msakLocation'),
      s2cRate: document.getElementById('s2cRate'),
      c2sRate: document.getElementById('c2sRate'),
      latency: document.getElementById('latency'),
      loss: document.getElementById('loss'),
      msakDownload: document.getElementById('msakDownload'),
      msakUpload: document.getElementById('msakUpload'),
      msakLatency: document.getElementById('msakLatency'),
      msakLoss: document.getElementById('msakLoss'),
    };

    // Bind events
    this.els.privacyCheckbox.addEventListener('change', () => this.onPrivacyChange());
    this.els.startButton.addEventListener('click', () => this.startTest());

    // Initialize gauge
    ProgressGauge.init();
  },

  onPrivacyChange() {
    this.privacyConsent = this.els.privacyCheckbox.checked;
    this.updateUI();
  },

  updateUI() {
    // Update button state
    if (!this.privacyConsent || this.testRunning) {
      this.els.startButton.classList.add('disabled');
    } else {
      this.els.startButton.classList.remove('disabled');
    }
    this.els.privacyCheckbox.disabled = this.testRunning;

    // Update button text
    const beginSpan = this.els.startButton.querySelector('.btn-begin');
    const againSpan = this.els.startButton.querySelector('.btn-again');
    const testingSpan = this.els.startButton.querySelector('.btn-testing');

    if (this.testRunning) {
      beginSpan.style.display = 'none';
      againSpan.style.display = 'none';
      testingSpan.style.display = 'inline';
    } else if (this.measurementComplete) {
      beginSpan.style.display = 'none';
      againSpan.style.display = 'inline';
      testingSpan.style.display = 'none';
    } else {
      beginSpan.style.display = 'inline';
      againSpan.style.display = 'none';
      testingSpan.style.display = 'none';
    }

    // Show/hide privacy message
    this.els.privacyMessage.style.display = this.privacyConsent ? 'none' : 'inline';

    // Show/hide progress vs results
    this.els.progressSection.style.display = this.measurementComplete ? 'none' : 'block';
    this.els.resultsSection.style.display = this.measurementComplete ? 'block' : 'none';
  },

  async startTest() {
    if (!this.privacyConsent || this.testRunning) {
      return;
    }

    ProgressGauge.reset();
    this.testRunning = true;
    this.measurementComplete = false;
    this.measurementResult = {};
    this.msakResult = {};
    this.updateUI();

    // Scroll to measurement area on mobile
    if (window.innerWidth < 981) {
      this.els.measurementSpace.scrollIntoView({ behavior: 'smooth' });
    }

    this.els.currentSpeed.textContent = i18n.t('Starting');
    this.els.currentPhase.textContent = '';

    // Generate a random UUID
    const sessionID = crypto.randomUUID();

    // Randomly choose which test to start first
    if (Math.random() < 0.5) {
      await this.runNdt7(sessionID);
      await this.runMSAK(sessionID);
    } else {
      await this.runMSAK(sessionID);
      await this.runNdt7(sessionID);
    }

    this.els.currentPhase.textContent = i18n.t('Complete');
    this.els.currentSpeed.textContent = '';
    this.measurementComplete = true;
    this.testRunning = false;
    this.updateUI();
  },

  /**
   * Determine the M-Lab project based on a placeholder that is substituted
   * during deployment.
   */
  mlabProject() {
    const placeholder = 'MLAB_PROJECT_PLACEHOLDER';
    return placeholder.includes('PLACEHOLDER') ? 'mlab-staging' : placeholder;
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
    const project = this.mlabProject();
    const tokenURL = `https://speed-backend.${project}.measurementlab.net/v0/token`;
    const locatePriorityURL = this.locatePriorityURLForProject(project);

    let token = null;
    try {
      const tokenResp = await fetch(tokenURL);
      const tokenData = await tokenResp.json();
      token = tokenData.token;
    } catch (err) {
      console.warn('Failed to fetch token, running without priority access:', err);
    }

    return ndt7.test(
      {
        clientRegistrationToken: token,
        loadbalancer: token ? locatePriorityURL : null,
        userAcceptedDataPolicy: true,
        uploadworkerfile: '/libraries/ndt7-upload-worker.js',
        downloadworkerfile: '/libraries/ndt7-download-worker.js',
        metadata: {
          client_name: 'speed-measurementlab-net',
          client_session_id: sid,
        }
      },
      {
        serverChosen: (server) => {
          this.els.location.textContent = server.location.city + ', ' + server.location.country;
          console.log('Testing to:', {
            machine: server.machine,
            locations: server.location,
          });
        },
        downloadStart: () => {
          this.els.currentPhase.textContent = i18n.t('Download');
          this.els.currentSpeed.textContent = i18n.t('Initializing');
        },
        downloadMeasurement: (data) => {
          if (data.Source === 'client') {
            this.els.currentSpeed.textContent = data.Data.MeanClientMbps.toFixed(2) + ' Mb/s';
            const progress = (data.Data.ElapsedTime > this.TIME_EXPECTED) ? 0.5 :
              data.Data.ElapsedTime / (this.TIME_EXPECTED * 2);
            ProgressGauge.progress(progress);
          }
        },
        downloadComplete: (data) => {
          this.measurementResult.s2cRate =
            data.LastClientMeasurement.MeanClientMbps.toFixed(2) + ' Mb/s';
          this.measurementResult.latency =
            (data.LastServerMeasurement.TCPInfo.MinRTT / 1000).toFixed(0) + ' ms';
          this.measurementResult.loss =
            (data.LastServerMeasurement.TCPInfo.BytesRetrans /
              data.LastServerMeasurement.TCPInfo.BytesSent * 100).toFixed(2) + '%';
          this.els.s2cRate.textContent = this.measurementResult.s2cRate;
          this.els.latency.textContent = this.measurementResult.latency;
          this.els.loss.textContent = this.measurementResult.loss;
          console.log(data);
        },
        uploadStart: () => {
          this.els.currentPhase.textContent = i18n.t('Upload');
          this.els.currentSpeed.textContent = i18n.t('Initializing');
        },
        uploadMeasurement: (data) => {
          if (data.Source === 'server') {
            this.els.currentSpeed.textContent = (data.Data.TCPInfo.BytesReceived /
              data.Data.TCPInfo.ElapsedTime * 8).toFixed(2) + ' Mb/s';
          }
          if (data.Source === 'client') {
            const progress = (data.Data.ElapsedTime > this.TIME_EXPECTED) ? 1.0 :
              data.Data.ElapsedTime / (this.TIME_EXPECTED * 2) + 0.5;
            ProgressGauge.progress(progress);
          }
        },
        uploadComplete: (data) => {
          this.measurementResult.c2sRate =
            (data.LastServerMeasurement.TCPInfo.BytesReceived /
              data.LastServerMeasurement.TCPInfo.ElapsedTime * 8).toFixed(2) + ' Mb/s';
          this.els.c2sRate.textContent = this.measurementResult.c2sRate;
        },
      },
    );
  },

  async runMSAK(sid) {
    const client = new msak.Client('speed-measurementlab-net', '1.0.0', {
      onDownloadStart: (server) => {
        console.log('Server: ' + server.machine);
        this.els.msakLocation.textContent = server.location.city + ', ' + server.location.country;
      },
      onDownloadResult: (result) => {
        this.msakResult.download = result.goodput.toFixed(2) + ' Mb/s';
        this.msakResult.loss = (result.retransmission * 100).toFixed(2) + '%';
        this.msakResult.latency = (result.minRTT / 1000).toFixed(0) + ' ms';
        this.els.currentPhase.textContent = i18n.t('Download');
        this.els.currentSpeed.textContent = result.goodput.toFixed(2) + ' Mb/s';
        this.els.msakDownload.textContent = this.msakResult.download;
        this.els.msakLatency.textContent = this.msakResult.latency;
        this.els.msakLoss.textContent = this.msakResult.loss;
        const progress = (result.elapsed > this.TIME_EXPECTED) ? 0.5 :
          result.elapsed / (this.TIME_EXPECTED * 2);
        ProgressGauge.progress(progress);
      },
      onUploadResult: (result) => {
        this.msakResult.upload = result.goodput.toFixed(2) + ' Mb/s';
        this.els.currentPhase.textContent = i18n.t('Upload');
        this.els.currentSpeed.textContent = result.goodput.toFixed(2) + ' Mb/s';
        this.els.msakUpload.textContent = this.msakResult.upload;
        const progress = (result.elapsed > this.TIME_EXPECTED) ? 1.0 :
          result.elapsed / (this.TIME_EXPECTED * 2) + 0.5;
        ProgressGauge.progress(progress);
      }
    });

    client.metadata = {
      client_session_id: sid
    };
    client.cc = 'cubic';
    client.duration = 10000; // 10s
    client.streams = 1;
    client.debug = true;

    await client.start();
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  await i18n.init();
  SpeedTest.init();
});
