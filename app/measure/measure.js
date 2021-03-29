'use strict';

angular.module('Measure.Measure', ['ngRoute'])

.controller('MeasureCtrl', function($scope, $rootScope, $interval, $timeout,
    gettextCatalog, ndtServer, ProgressGauge, deviceDetector) {

  var ndtSemaphore = false;

  $scope.measurementComplete = false;

  $scope.isSafari = deviceDetector.browser === "safari";
  
  console.log(deviceDetector);

  ProgressGauge.create();
  $scope.currentPhase = '';
  $scope.currentSpeed = '';

  $scope.startTest = function () {
    var gaugeProgress,
        TIME_EXPECTED = 10;

    if ($scope.privacyConsent !== true || $scope.isSafari ) {
      return;
    }

    ProgressGauge.reset();
    $scope.startButtonClass = 'disabled';
    $scope.measurementComplete = false;

    if (ndtSemaphore == true) {
      return;
    }
    ndtSemaphore = true;

    if ($(window).width() < 981) {
      $('html, body').animate({
          scrollTop: $("#measurementSpace").offset().top
      }, 1000);
    }

    $scope.currentSpeed = gettextCatalog.getString('Starting');
    $scope.currentPhase = '';

    $scope.measurementResult = {};

    ndt7.test(
      {
        userAcceptedDataPolicy: true,
        uploadworkerfile: "/libraries/ndt7-upload-worker.min.js",
        downloadworkerfile: "/libraries/ndt7-download-worker.min.js"
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
          $scope.$apply(function() {
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
          $scope.$apply(function() {
            $scope.currentPhase = gettextCatalog.getString('Upload');
            $scope.currentSpeed = gettextCatalog.getString('Initializing');
          })
        },
        uploadMeasurement: function(data) {
          if (data.Source === 'client') {
            $scope.$apply(function () {
              $scope.currentSpeed = data.Data.MeanClientMbps.toFixed(2) + ' Mb/s';
            });
            gaugeProgress = (data.Data.ElapsedTime > TIME_EXPECTED) ? 1.0 :
                data.Data.ElapsedTime / (TIME_EXPECTED * 2) + 0.5;
            ProgressGauge.progress(gaugeProgress, false);
          }
        },
        uploadComplete: function (data) {
          $scope.measurementResult.c2sRate =
            data.LastClientMeasurement.MeanClientMbps.toFixed(2) + ' Mb/s';
          console.log(data);
        },
      },
    ).then(() => {
      $scope.$apply(function() {
        $scope.currentPhase = gettextCatalog.getString('Complete');
        $scope.currentSpeed = '';
        $scope.measurementComplete = true;
        $scope.startButtonClass = '';
      });
      ndtSemaphore = false;
    })
  }
});
