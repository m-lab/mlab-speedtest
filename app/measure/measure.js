'use strict';

angular.module('Measure.Measure', ['ngRoute'])
  .controller('MeasureCtrl', function ($scope, $rootScope, $interval, $timeout,
    gettextCatalog, ndtServer, ProgressGauge, MLAB_COUNTRIES) {
    const TIME_EXPECTED = 10 // Expected duration of a test in seconds.
    var testRunning = false;

    $scope.measurementComplete = false;

    ProgressGauge.create();

    $scope.currentPhase = '';
    $scope.currentSpeed = '';

    // Country selector for Locate API.
    $scope.countries = MLAB_COUNTRIES;
    $scope.selectedCountry = '';


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

      $scope.$apply(function () {
        $scope.currentPhase = gettextCatalog.getString('Complete');
        $scope.currentSpeed = '';
        $scope.measurementComplete = true;
        $scope.startButtonClass = '';
      });
      testRunning = false;
    }

    // Determine the M-Lab project based on a placeholder that is substituted
    // during deployment. If the placeholder is not substituted (e.g., local
    // development), default to `staging` for safe testing.
    //
    // The reason for using `staging` as opposed to `sandbox` by default is that
    // using `staging` allows us to know which commit of `m-lab/speed-proxy` we
    // are testing against (i.e., the latest commit of the `main` branch) as opposed
    // to being unsure (which commit of a possibly now deleted `sandbox-*` branch
    // are we actually testing against?).
    //
    // TODO(bassosimone): when we modernize the website build system, we should
    // replace this placeholder-and-sed approach with proper build-time environment
    // variable injection. The current approach is acceptable for a single config
    // value, but if we find ourselves adding two or three more substitutions, we
    // should refactor to use a proper configuration mechanism instead.
    function mlabProject() {
      const placeholder = 'MLAB_PROJECT_PLACEHOLDER';
      return placeholder === 'MLAB_PROJECT_PLACEHOLDER' ? 'mlab-staging' : placeholder;
    }

    // Build the locate service priority URL for the given project. Production uses
    // locate.measurementlab.net while `staging` uses locate.mlab-`staging`.measurementlab.net.
    function locatePriorityURLForProject(project) {
      const host = project === 'mlab-oti'
        ? 'locate.measurementlab.net'
        : `locate.${project}.measurementlab.net`;
      return `https://${host}/v2/priority/nearest/ndt/ndt7`;
    }

    async function runNdt7(sid) {
      // Fetch a short-lived token from the speed-backend service to enable
      // priority access to the Locate API for registered integrations.
      // If token fetch fails, gracefully degrade to running without a token.
      const project = mlabProject();
      const tokenURL = `https://speed-backend.${project}.measurementlab.net/v0/token`;
      const locatePriorityURL = locatePriorityURLForProject(project);

      let token = null;
      try {
        const tokenResp = await fetch(tokenURL);
        const tokenData = await tokenResp.json();
        token = tokenData.token;
      } catch (err) {
        console.warn('Failed to fetch token, running without priority access:', err);
      }

      // Build metadata. If a country is selected, include it so the Locate API
      // returns the nearest server within that country.
      var metadata = {
        client_name: "speed-measurementlab-net",
        client_session_id: sid,
      };
      var country = $scope.selectedCountry;
      if (country) {
        metadata.country = country;
      }

      return ndt7.test(
        {
          clientRegistrationToken: token,
          loadbalancer: (token || country) ? locatePriorityURL : null,
          userAcceptedDataPolicy: true,
          uploadworkerfile: "/libraries/ndt7-upload-worker.js",
          downloadworkerfile: "/libraries/ndt7-download-worker.js",
          metadata: metadata
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
          // When we pass a hostname directly to client.start(), the server
          // object won't have location/machine info, so guard against that.
          if (server && server.machine) {
            $scope.msakLocation = server.location.city + ", " + server.location.country;
          }
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
      client.cc = "cubic";
      client.duration = 10000; // 10s
      client.streams = 1;
      client.debug = true;

      var country = $scope.selectedCountry;
      if (country) {
        // The MSAK library doesn't pass metadata to the Locate API, only to
        // the test server. So we do our own locate call with the country param
        // and call client.download()/upload() directly with the full URLs.
        try {
          const locateURL = 'https://locate.measurementlab.net/v2/nearest/msak/throughput1?country=' + country;
          const resp = await fetch(locateURL);
          const data = await resp.json();
          if (data.results && data.results.length > 0) {
            const server = data.results[0];

            // Build download/upload URLs from the Locate API response and add
            // the metadata params that the MSAK library would normally add.
            var downloadURL = new URL(server.urls['wss:///throughput/v1/download']);
            var uploadURL = new URL(server.urls['wss:///throughput/v1/upload']);
            var metaParams = {
              client_name: 'speed-measurementlab-net',
              client_version: '0.0.1',
              client_library_name: 'msak-js',
              client_library_version: '0.3.1',
              streams: '1',
              cc: 'cubic',
              duration: '10000',
              bytes: '0',
              client_session_id: sid
            };
            for (var key in metaParams) {
              downloadURL.searchParams.set(key, metaParams[key]);
              uploadURL.searchParams.set(key, metaParams[key]);
            }

            var serverInfo = {
              location: server.location,
              machine: server.machine,
              download: downloadURL,
              upload: uploadURL
            };

            await client.download(serverInfo);
            await client.upload(serverInfo);
          } else {
            console.warn('No MSAK servers found for country:', country);
            await client.start();
          }
        } catch (err) {
          console.warn('Failed to locate MSAK server for country, using default:', err);
          await client.start();
        }
      } else {
        await client.start();
      }
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
