/**
 * Arithmetic on ndt7 measurements, shared by every module that shows a
 * figure derived from them, so a rate or a ratio is computed the same way
 * wherever it appears.
 *
 * The functions take a TCPInfo snapshot as sent by the server: times are in
 * microseconds and counters in bytes.
 */
const Measurement = {
  // Nominal length of one ndt7 direction; the time axes span at least this
  TEST_SECONDS: 10,

  seconds(tcpInfo) {
    return tcpInfo.ElapsedTime / 1e6;
  },

  /**
   * Bytes over microseconds, as megabits per second.
   */
  mbps(bytes, microseconds) {
    return bytes * 8 / microseconds;
  },

  /**
   * Download rate as the server saw it: what the client acknowledged.
   * (BytesSent would also count retransmissions.) The headline download
   * figure is the client's own count instead, so the two differ slightly.
   */
  downloadMbps(tcpInfo) {
    return this.mbps(tcpInfo.BytesAcked, tcpInfo.ElapsedTime);
  },

  uploadMbps(tcpInfo) {
    return this.mbps(tcpInfo.BytesReceived, tcpInfo.ElapsedTime);
  },

  /**
   * Share of the bytes the server sent that were retransmissions, in [0, 1].
   * M-Lab uses this as its measure of loss.
   */
  retransmission(tcpInfo) {
    return tcpInfo.BytesSent > 0 ? tcpInfo.BytesRetrans / tcpInfo.BytesSent : 0;
  },
};
