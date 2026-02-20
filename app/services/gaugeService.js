angular.module('Measure.GaugeService', [])

.factory('ProgressGauge', function() {
  var aProgress = document.getElementById('activeProgress');
  var barCTX = aProgress.getContext("2d");
  var targetProgress = 0, displayProgress = 0, animationId = null;

  function tick() {
    displayProgress += (targetProgress - displayProgress) * 0.14;
    if (Math.abs(displayProgress - targetProgress) < 0.003) { displayProgress = targetProgress; animationId = null; }
    drawProgress(displayProgress);
    if (animationId !== null) animationId = requestAnimationFrame(tick);
  }

  function setInactive() {
    if (animationId !== null) cancelAnimationFrame(animationId);
    animationId = null;
    targetProgress = 1; displayProgress = 1;
    drawProgress(1);
    aProgress.classList.remove('activeGauge')
    aProgress.classList.add('inactiveGauge')
  }
  function resetProgress() {
    if (animationId !== null) cancelAnimationFrame(animationId);
    animationId = null;
    targetProgress = 0; displayProgress = 0;
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

  function progress(target) {
    targetProgress = Math.max(0, Math.min(1, target));
    if (targetProgress < displayProgress) {
      if (animationId !== null) cancelAnimationFrame(animationId);
      animationId = null;
      displayProgress = targetProgress;
      drawProgress(displayProgress);
    } else if (animationId === null) {
      animationId = requestAnimationFrame(tick);
    }
  }

  return {
    "element": aProgress,
    'reset': resetProgress,
    'progress': progress,
    'create': createProgress
  };


});
