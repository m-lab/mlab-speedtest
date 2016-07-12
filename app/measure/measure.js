'use strict';

angular.module('Measure.Measure', ['ngRoute'])

.controller('MeasureCtrl', function($scope, $rootScope, $interval, $timeout,
    gettextCatalog, ndtServer, ProgressGauge) {

  var ndtSemaphore = false;

  $scope.measurementComplete = false;

  if (!Modernizr.websockets) {
    $scope.unsupportedSystem = true;
    return;
  }


  $rootScope.$on('updatedServer', function() {
    $scope.location = ndtServer.city + ", " + ndtServer.country;
    $scope.address = ndtServer.fqdn;
  });

  ProgressGauge.create();
  $scope.currentPhase = '';
  $scope.currentSpeed = '';

  $scope.startTest = function () {
    var timeStarted,
        timeRunning,
        timeProgress,
        timeState,
        intervalPromise,
        TIME_EXPECTED = 10 * 1000;

    if ($scope.privacyConsent !== true) {
      return;
    }

    ProgressGauge.reset();
    $scope.startButtonClass = 'disabled';
    $scope.measurementComplete = false;

    if ($scope.address === undefined) {
      console.log('M-Lab server currently not selected, waiting for NS answer.');
      $timeout($scope.startTest, 1000);
      return;
    }

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
    startTest(ndtServer.fqdn);

    intervalPromise = $interval(function() {
      var downloadSpeedVal = downloadSpeed();
      var uploadSpeedVal = uploadSpeed(false);

      if (timeState !== currentPhase && currentPhase != undefined) {
        timeState = currentPhase;
        timeStarted = new Date().getTime();
      }
      if (currentPhase === PHASE_UPLOAD || currentPhase === PHASE_DOWNLOAD) {
        timeRunning = new Date().getTime() - timeStarted;

        if (currentPhase === PHASE_UPLOAD) {
          timeProgress = ( timeRunning > TIME_EXPECTED) ? 0.5 : timeRunning / (TIME_EXPECTED * 2);
        } else {
          timeProgress = ( timeRunning > TIME_EXPECTED) ? 1.0 : (timeRunning / (TIME_EXPECTED * 2) + 0.5);
        }
        ProgressGauge.progress(timeProgress, false);
      }

      if (currentPhase == PHASE_UPLOAD) {
        $scope.currentPhase = gettextCatalog.getString('Upload');
        $scope.currentSpeed = uploadSpeedVal ? getJustfiedSpeed(uploadSpeedVal) + ' ' + getSpeedUnit(uploadSpeedVal) : gettextCatalog.getString('Initializing');
      } else if (currentPhase == PHASE_DOWNLOAD) {
        $scope.currentPhase = gettextCatalog.getString('Download');
        $scope.currentSpeed = downloadSpeedVal ? getJustfiedSpeed(downloadSpeedVal) + ' ' + getSpeedUnit(downloadSpeedVal) : gettextCatalog.getString('Initializing');
      } else if (currentPhase == PHASE_RESULTS) {
        $scope.currentPhase = gettextCatalog.getString('Complete');
        $scope.currentSpeed = '';
        $scope.measurementComplete = true;
        $scope.measurementResult = {
          's2cRate': downloadSpeed().toFixed(2) + ' ' + getSpeedUnit(downloadSpeed()),
          'c2sRate': uploadSpeed().toFixed(2) + ' ' + getSpeedUnit(uploadSpeed()),
          'latency': readNDTvar('MinRTT') + ' ms',
          'loss': String((readNDTvar('loss') * 100).toFixed(2)) + "%"
        };
        ndtSemaphore = false;
        $scope.startButtonClass = '';

        $interval.cancel(intervalPromise);
      }

    }, 100);
  }
});
