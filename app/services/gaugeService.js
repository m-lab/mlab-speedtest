angular.module('Measure.GaugeService', [])

  .factory('ProgressGauge', function () {
    // Lazily initialize the canvas element and its context.
    // The #activeProgress element lives inside Angular's route view, which is
    // rendered after the service is instantiated, so accessing it at factory
    // creation time would return null and crash. We defer lookup to first use.
    var aProgress = null;
    var barCTX = null;

    function getCanvas() {
      if (!aProgress) {
        aProgress = document.getElementById('activeProgress');
        barCTX = aProgress.getContext('2d');
      }
    }

    function setInactive() {
      getCanvas();
      drawProgress(1);
      aProgress.classList.remove('activeGauge')
      aProgress.classList.add('inactiveGauge')
    }
    function resetProgress() {
      getCanvas();
      drawProgress(0);
      aProgress.classList.remove('inactiveGauge')
      aProgress.classList.add('activeGauge')
    }
    function drawProgress(percentage) {
      getCanvas();
      var quarterTurn = Math.PI / 2;
      var endingAngle = ((2 * percentage) * Math.PI) - quarterTurn;
      var startingAngle = 0 - quarterTurn;

      aProgress.width = aProgress.width;
      barCTX.lineCap = 'square';

      barCTX.beginPath();
      barCTX.lineWidth = 20;
      barCTX.strokeStyle = '#FFFFFF';
      barCTX.arc(137.5, 137.5, 111, startingAngle, endingAngle);
      barCTX.stroke();
    }
    function createProgress() {
      getCanvas();
      var quarterTurn = Math.PI / 2;
      var endingAngle = (2 * Math.PI) - quarterTurn;
      var startingAngle = 0 - quarterTurn;

      barCTX.beginPath();
      barCTX.lineCap = 'square';
      barCTX.lineWidth = 20;
      barCTX.strokeStyle = '#FFFFFF';
      barCTX.arc(137.5, 137.5, 111, startingAngle, endingAngle);
      barCTX.stroke();

      setInactive();
    }

    return {
      'element': function () { getCanvas(); return aProgress; },
      'reset': resetProgress,
      'progress': drawProgress,
      'create': createProgress
    };


  });

