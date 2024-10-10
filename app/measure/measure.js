'use strict';

angular.module('Measure.Measure', ['ngRoute'])
  .controller('MeasureCtrl', function ($scope, $rootScope, $interval, $timeout,
    gettextCatalog, ndtServer, ProgressGauge) {
    const TIME_EXPECTED = 10 // Expected duration of a test in seconds.
    var testRunning = false;

    $scope.measurementComplete = false;

    ProgressGauge.create();

    $scope.currentPhase = '';
    $scope.currentSpeed = '';

    var gaugeProgress;

    $scope.startTest = async function () {


      if ($scope.privacyConsent !== true) {
        return;
      }

      ProgressGauge.reset();
      $scope.startButtonClass = 'disabled';
      $scope.measurementComplete = false;

      // Prevent running this function multiple times concurrently.
      if (testRunning == true) {
        return;
      }
      testRunning = true;

      if ($(window).width() < 981) {
        $('html, body').animate({
          scrollTop: $("#measurementSpace").offset().top
        }, 1000);
      }

      $scope.currentSpeed = gettextCatalog.getString('Starting');
      $scope.currentPhase = '';

      $scope.measurementResult = {};
      $scope.msakResult = {};

      // Generate a random UUID
      const sessionID = uuidv4();

      // Randomly choose which test to start first.
      if (Math.random() < 0.5) {
        await runNdt7(sessionID)
        await runMSAK(sessionID);
      } else {
        await runMSAK(sessionID);
        await runNdt7(sessionID);
      }

      runPT(sessionID)

      $scope.$apply(function () {
        $scope.currentPhase = gettextCatalog.getString('Complete');
        $scope.currentSpeed = '';
        $scope.measurementComplete = true;
        $scope.startButtonClass = '';
      });
      testRunning = false;
    }

    async function runNdt7(sid) {
      return ndt7.test(
        {
          userAcceptedDataPolicy: true,
          uploadworkerfile: "/libraries/ndt7-upload-worker.min.js",
          downloadworkerfile: "/libraries/ndt7-download-worker.min.js",
          metadata: {
            client_name: "speed-measurementlab-net",
            client_session_id: sid,
          }
        },
        {
          serverChosen: function (server) {
            $scope.location = server.location.city + ", " +
              server.location.country;
            $scope.address = server.machine;
            console.log('Testing to:', {
              machine: server.machine,
              locations: server.location,
            });
          },
          downloadStart: (data) => {
            $scope.$apply(function () {
              $scope.currentPhase = gettextCatalog.getString('Download');
              $scope.currentSpeed = gettextCatalog.getString('Initializing');
            });
          },
          downloadMeasurement: (data) => {
            if (data.Source === 'client') {
              $scope.$apply(function () {
                $scope.currentSpeed = data.Data.MeanClientMbps.toFixed(2) + ' Mb/s';
              });
              gaugeProgress = (data.Data.ElapsedTime > TIME_EXPECTED) ? 0.5 :
                data.Data.ElapsedTime / (TIME_EXPECTED * 2);
              ProgressGauge.progress(gaugeProgress, false);
            }
          },
          downloadComplete: (data) => {
            $scope.measurementResult.s2cRate =
              data.LastClientMeasurement.MeanClientMbps.toFixed(2) + ' Mb/s';
            $scope.measurementResult.latency =
              (data.LastServerMeasurement.TCPInfo.MinRTT / 1000).toFixed(0) + ' ms';
            $scope.measurementResult.loss =
              (data.LastServerMeasurement.TCPInfo.BytesRetrans /
                data.LastServerMeasurement.TCPInfo.BytesSent * 100).toFixed(2) + '%';
            console.log(data);
          },
          uploadStart: (data) => {
            $scope.$apply(function () {
              $scope.currentPhase = gettextCatalog.getString('Upload');
              $scope.currentSpeed = gettextCatalog.getString('Initializing');
            })
          },
          uploadMeasurement: function (data) {
            if (data.Source === 'server') {
              $scope.$apply(function () {
                // bytes * 1/microseconds * bits/byte
                $scope.currentSpeed = (data.Data.TCPInfo.BytesReceived /
                  data.Data.TCPInfo.ElapsedTime * 8).toFixed(2) + ' Mb/s';
              });
            }
            if (data.Source === 'client') {
              gaugeProgress = (data.Data.ElapsedTime > TIME_EXPECTED) ? 1.0 :
                data.Data.ElapsedTime / (TIME_EXPECTED * 2) + 0.5;
              ProgressGauge.progress(gaugeProgress, false);
            }
          },
          uploadComplete: function (data) {
            $scope.measurementResult.c2sRate =
              (data.LastServerMeasurement.TCPInfo.BytesReceived /
                data.LastServerMeasurement.TCPInfo.ElapsedTime * 8).toFixed(2) + ' Mb/s';
          },
        },
      )
    }

    async function runMSAK(sid) {
      const client = new msak.Client("speed-measurementlab-net", "0.0.1", {
        onDownloadStart: (server) => {
          console.log("Server: " + server.machine);
          $scope.msakLocation = server.location.city + ", " + server.location.country;
        },
        onDownloadResult: (result) => {
          $scope.msakResult.download = result.goodput.toFixed(2) + ' Mb/s';
          $scope.msakResult.loss = (result.retransmission * 100).toFixed(2) + '%';
          $scope.msakResult.latency = (result.minRTT / 1000).toFixed(0) + ' ms';
          $scope.$apply(function () {
            $scope.currentPhase = gettextCatalog.getString('Download');
            $scope.currentSpeed = result.goodput.toFixed(2) + ' Mb/s';
          });
          gaugeProgress = (result.elapsed > TIME_EXPECTED) ? 0.5 :
            result.elapsed / (TIME_EXPECTED * 2);
          ProgressGauge.progress(gaugeProgress, false);
        },

        onUploadResult: (result) => {
          $scope.msakResult.upload = result.goodput.toFixed(2) + ' Mb/s';
          $scope.$apply(function () {
            $scope.currentPhase = gettextCatalog.getString('Upload');
            $scope.currentSpeed = result.goodput.toFixed(2) + ' Mb/s';
          });
          gaugeProgress = (result.elapsed > TIME_EXPECTED) ? 1.0 :
            result.elapsed / (TIME_EXPECTED * 2) + 0.5;
          ProgressGauge.progress(gaugeProgress, false);
        }
      });

      client.metadata = {
        client_session_id: sid
      }
      client.cc = "bbr";
      client.duration = 10000; // 10s
      client.streams = 3;
      client.debug = true;

      await client.start();
    }

    async function runPT(sid) {
      const md = [
          {
            client_name: "speed-measurementlab-net",
            client_session_id: sid,
            max_cwnd_gain: "512",
          },
          {
            client_name: "speed-measurementlab-net",
            client_session_id: sid,
            max_elapsed_time: "5",
          },
          {
            client_name: "speed-measurementlab-net",
            client_session_id: sid,
            max_cwnd_gain: "512",
            max_elapsed_time: "5",
          },
          {
            client_name: "speed-measurementlab-net",
            client_session_id: sid,
            early_exit: "50",
          },
          {
            client_name: "speed-measurementlab-net",
            client_session_id: sid,
            max_cwnd_gain: "512",
            early_exit: "50",
          },
      ]

      return pt.test(
        {
          userAcceptedDataPolicy: true,
          downloadworkerfile: "/libraries/pt-download-worker.min.js",
          // Randomly choose to run one of the configurations above.
          metadata: md[Math.floor(Math.random()*md.length)]
        },
        {
          serverChosen: function (server) {
            $scope.location = server.location.city + ", " +
              server.location.country;
            $scope.address = server.machine;
            console.log('Testing PT to:', {
              machine: server.machine,
              locations: server.location,
            });
          },
          downloadComplete: (data) => {
            console.log("PT result:", data);
          },
        },
      )
    }

  });

/**
 * Generates a UUIDv4.
 *
 * See: https://en.wikipedia.org/wiki/Universally_unique_identifier#Version_4_(random)
 *
 * @returns
 */
function uuidv4() {
  // From https://stackoverflow.com/questions/105034/how-do-i-create-a-guid-uuid
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}
