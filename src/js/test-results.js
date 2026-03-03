'use strict';

/**
 * TestResults - Unified data structure for NDT7 and MSAK measurement results
 * 
 * This class provides a consistent interface for storing, accessing, and
 * exporting speed test results from both measurement protocols.
 */
class TestResults {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.timestamp = new Date().toISOString();
    this.clientInfo = this._getClientInfo();
    
    // NDT7 protocol results
    this.ndt7 = {
      server: {
        city: null,
        country: null,
        machine: null
      },
      download: {
        speed: null,
        unit: 'Mb/s',
        formatted: null
      },
      upload: {
        speed: null,
        unit: 'Mb/s',
        formatted: null
      },
      latency: {
        value: null,
        unit: 'ms',
        formatted: null
      },
      retransmission: {
        value: null,
        unit: '%',
        formatted: null
      }
    };
    
    // MSAK protocol results
    this.msak = {
      server: {
        city: null,
        country: null,
        machine: null
      },
      download: {
        speed: null,
        unit: 'Mb/s',
        formatted: null
      },
      upload: {
        speed: null,
        unit: 'Mb/s',
        formatted: null
      },
      latency: {
        value: null,
        unit: 'ms',
        formatted: null
      },
      retransmission: {
        value: null,
        unit: '%',
        formatted: null
      }
    };
  }

  /**
   * Collect basic client information
   * @private
   */
  _getClientInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`
    };
  }

  // NDT7 Setters
  
  setNdt7Server(server) {
    if (server && server.location) {
      this.ndt7.server.city = server.location.city;
      this.ndt7.server.country = server.location.country;
      this.ndt7.server.machine = server.machine;
    }
  }

  setNdt7Download(speedMbps) {
    this.ndt7.download.speed = speedMbps;
    this.ndt7.download.formatted = speedMbps.toFixed(2) + ' Mb/s';
  }

  setNdt7Upload(speedMbps) {
    this.ndt7.upload.speed = speedMbps;
    this.ndt7.upload.formatted = speedMbps.toFixed(2) + ' Mb/s';
  }

  setNdt7Latency(latencyMs) {
    this.ndt7.latency.value = latencyMs;
    this.ndt7.latency.formatted = latencyMs.toFixed(0) + ' ms';
  }

  setNdt7Retransmission(retransPercent) {
    this.ndt7.retransmission.value = retransPercent;
    this.ndt7.retransmission.formatted = retransPercent.toFixed(2) + '%';
  }

  // MSAK Setters

  setMsakServer(server) {
    if (server && server.location) {
      this.msak.server.city = server.location.city;
      this.msak.server.country = server.location.country;
      this.msak.server.machine = server.machine;
    }
  }

  setMsakDownload(speedMbps) {
    this.msak.download.speed = speedMbps;
    this.msak.download.formatted = speedMbps.toFixed(2) + ' Mb/s';
  }

  setMsakUpload(speedMbps) {
    this.msak.upload.speed = speedMbps;
    this.msak.upload.formatted = speedMbps.toFixed(2) + ' Mb/s';
  }

  setMsakLatency(latencyMs) {
    this.msak.latency.value = latencyMs;
    this.msak.latency.formatted = latencyMs.toFixed(0) + ' ms';
  }

  setMsakRetransmission(retransPercent) {
    this.msak.retransmission.value = retransPercent;
    this.msak.retransmission.formatted = retransPercent.toFixed(2) + '%';
  }

  // Getters for formatted values (backward compatibility)

  getNdt7Location() {
    if (this.ndt7.server.city && this.ndt7.server.country) {
      return `${this.ndt7.server.city}, ${this.ndt7.server.country}`;
    }
    return null;
  }

  getMsakLocation() {
    if (this.msak.server.city && this.msak.server.country) {
      return `${this.msak.server.city}, ${this.msak.server.country}`;
    }
    return null;
  }

  // Utility methods

  /**
   * Calculate average download speed across both protocols
   * @returns {number|null} Average speed in Mb/s or null if no data
   */
  getAverageDownload() {
    const speeds = [this.ndt7.download.speed, this.msak.download.speed].filter(s => s !== null);
    if (speeds.length === 0) return null;
    return speeds.reduce((a, b) => a + b, 0) / speeds.length;
  }

  /**
   * Calculate average upload speed across both protocols
   * @returns {number|null} Average speed in Mb/s or null if no data
   */
  getAverageUpload() {
    const speeds = [this.ndt7.upload.speed, this.msak.upload.speed].filter(s => s !== null);
    if (speeds.length === 0) return null;
    return speeds.reduce((a, b) => a + b, 0) / speeds.length;
  }

  /**
   * Check if test results are complete
   * @returns {boolean} True if both protocols have results
   */
  isComplete() {
    return this.ndt7.download.speed !== null && 
           this.msak.download.speed !== null;
  }

  /**
   * Export results as JSON
   * @returns {string} JSON string of all results
   */
  toJSON() {
    return JSON.stringify({
      sessionId: this.sessionId,
      timestamp: this.timestamp,
      clientInfo: this.clientInfo,
      ndt7: this.ndt7,
      msak: this.msak
    }, null, 2);
  }

  /**
   * Export results as plain object
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      sessionId: this.sessionId,
      timestamp: this.timestamp,
      clientInfo: this.clientInfo,
      ndt7: this.ndt7,
      msak: this.msak
    };
  }
}

// Make available globally (for now, until we have a proper module system)
if (typeof window !== 'undefined') {
  window.TestResults = TestResults;
}
