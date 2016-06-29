angular.module('Measure.GaugeService', [])

.factory('ProgressGauge', function() {
  var aProgress = document.getElementById('activeProgress');
  var barCTX = aProgress.getContext("2d");

  function setInactive() {
    drawProgress(1);
    aProgress.classList.remove('activeGauge')
    aProgress.classList.add('inactiveGauge')
  }
  function resetProgress() {
    drawProgress(0);
    aProgress.classList.remove('inactiveGauge')
    aProgress.classList.add('activeGauge')
  }
  function drawProgress(percentage){
    var quarterTurn = Math.PI / 2;
    var endingAngle = ((2*percentage) * Math.PI) - quarterTurn;
    var startingAngle = 0 - quarterTurn;

    aProgress.width = aProgress.width;
    barCTX.lineCap = 'square';

    barCTX.beginPath();
    barCTX.lineWidth = 20;
    barCTX.strokeStyle = '#FFFFFF';
    barCTX.arc(137.5,137.5,111,startingAngle, endingAngle);
    barCTX.stroke();
  }
  function createProgress(){
    var quarterTurn = Math.PI / 2;
    var endingAngle = (2 * Math.PI) - quarterTurn;
    var startingAngle = 0 - quarterTurn;

    barCTX.beginPath();
    barCTX.lineCap = 'square';
    barCTX.lineWidth = 20;
    barCTX.strokeStyle = '#FFFFFF';
    barCTX.arc(137.5,137.5,111,startingAngle, endingAngle);
    barCTX.stroke();

    setInactive();
  }

  return {
    "element": aProgress,
    'reset': resetProgress,
    'progress': drawProgress,
    'create': createProgress
  };


});
