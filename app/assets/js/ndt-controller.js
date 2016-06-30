// var allowDebug = true;
// CONSTANTS

// Testing phases

var PHASE_LOADING   = 0;
var PHASE_WELCOME   = 1;
var PHASE_PREPARING = 2;
var PHASE_UPLOAD    = 3;
var PHASE_DOWNLOAD  = 4;
var PHASE_RESULTS   = 5;


// STATUS VARIABLES
var websocket_client = null;
var currentPhase = PHASE_LOADING;
var currentPage = 'welcome';
var transitionSpeed = 400;

// Gauges used for showing download/upload speed
var downloadGauge, uploadGauge;
var gaugeUpdateInterval;
var gaugeMaxValue = 1000;

function startTest(fqdn) {
  // evt.stopPropagation();
  // evt.preventDefault();
  websocket_client = new NDTWrapper(fqdn);

  websocket_client._port = 3010 ;
  websocket_client._protocol = 'wss';

  currentPhase = PHASE_WELCOME;
  testNDT().run_test();
  monitorTest();
}

function monitorTest() {
  var message = testError();
  var currentStatus = testStatus();

  if (message.match(/not run/) && currentPhase != PHASE_LOADING) {
    setPhase(PHASE_WELCOME);
    return false;
  }
  if (message.match(/notStarted/) && currentPhase != PHASE_LOADING) {
    setPhase(PHASE_PREPARING);
    return false;
  }
  if (message.match(/completed/) && currentPhase < PHASE_RESULTS) {
    setPhase(PHASE_RESULTS);
    return true;
  }
  if (message.match(/failed/) && currentPhase < PHASE_RESULTS) {
    setPhase(PHASE_RESULTS);
    return false;
  }
  if (currentStatus.match(/Outbound/) && currentPhase < PHASE_UPLOAD) {
    setPhase(PHASE_UPLOAD);
  }
  if (currentStatus.match(/Inbound/) && currentPhase < PHASE_DOWNLOAD) {
    setPhase(PHASE_DOWNLOAD);
  }

  if (!currentStatus.match(/Middleboxes/) && !currentStatus.match(/notStarted/)
        && !remoteServer().match(/ndt/) && currentPhase == PHASE_PREPARING) {
    debug('Remote server is ' + remoteServer());
    setPhase(PHASE_UPLOAD);
  }

  if (remoteServer() !== 'unknown' && currentPhase < PHASE_PREPARING) {
    setPhase(PHASE_PREPARING);
  }

  setTimeout(monitorTest, 1000);
}



// PHASES

function setPhase(phase) {
  switch (phase) {

    case PHASE_WELCOME:
      debug('WELCOME');
      showPage('welcome');
      break;

    case PHASE_PREPARING:
      // uploadGauge.setValue(0);
      // downloadGauge.setValue(0);
      debug('PREPARING TEST');
      break;

    case PHASE_UPLOAD:
      var pcBuffSpdLimit, rtt, gaugeConfig = [];
      debug('UPLOAD TEST');

      pcBuffSpdLimit = speedLimit();
      rtt = minRoundTrip();

      if (!isNaN(pcBuffSpdLimit)) {
        if (pcBuffSpdLimit > gaugeMaxValue) {
          pcBuffSpdLimit = gaugeMaxValue;
        }
        // gaugeConfig.push({
        //   from: 0,   to: pcBuffSpdLimit, color: 'rgb(0, 255, 0)'
        // });
        //
        // gaugeConfig.push({
        //   from: pcBuffSpdLimit, to: gaugeMaxValue, color: 'rgb(255, 0, 0)'
        // });
        //
        // uploadGauge.updateConfig({
        //   highlights: gaugeConfig
        // });
        //
        // downloadGauge.updateConfig({
        //   highlights: gaugeConfig
        // });
      }

      break;

    case PHASE_DOWNLOAD:
      debug('DOWNLOAD TEST');
      break;

    case PHASE_RESULTS:
      debug('SHOW RESULTS');
      debug('Testing complete');
      break;

    default:
      return false;
  }
  currentPhase = phase;
}

// GAUGE

function initializeGauges() {
  var gaugeValues = [];

  for (var i=0; i<=10; i++) {
    gaugeValues.push(0.1 * gaugeMaxValue * i);
  }
  // uploadGauge = new Gauge({
  //   renderTo    : 'uploadGauge',
  //   width       : 270,
  //   height      : 270,
  //   units       : 'Mb/s',
  //   title       : 'Upload',
  //   minValue    : 0,
  //   maxValue    : gaugeMaxValue,
  //   majorTicks  : gaugeValues,
  //   highlights  : [{ from: 0, to: gaugeMaxValue, color: 'rgb(0, 255, 0)' }]
  // });;

  gaugeValues = [];
  for (var i=0; i<=10; i++) {
    gaugeValues.push(0.1 * gaugeMaxValue * i);
  }
  // downloadGauge = new Gauge({
  //   renderTo    : 'downloadGauge',
  //   width       : 270,
  //   height      : 270,
  //   units       : 'Mb/s',
  //   title       : 'Download',
  //   minValue    : 0,
  //   maxValue    : gaugeMaxValue,
  //   majorTicks  : gaugeValues,
  //   highlights  : [{ from: 0, to: gaugeMaxValue, color: 'rgb(0, 255, 0)' }]
  // });;
}

// TESTING JAVA/WEBSOCKET CLIENT

function testNDT() {
  if (websocket_client) {
    return websocket_client;
  }

  return $('#NDT');
}

function testStatus() {
  return testNDT().get_status();
}

function testError() {
  return testNDT().get_errmsg();
}

function remoteServer() {
  return testNDT().get_host();
}

function uploadSpeed(raw) {
  var speed = testNDT().getNDTvar('ClientToServerSpeed');
  return raw ? speed : parseFloat(speed);
}

function downloadSpeed() {
  return parseFloat(testNDT().getNDTvar('ServerToClientSpeed'));
}

function minRoundTrip() {
  return parseFloat(testNDT().getNDTvar('MinRTT'));
}

function jitter() {
  return parseFloat(testNDT().getNDTvar('Jitter'));
}

function speedLimit() {
  return parseFloat(testNDT().get_PcBuffSpdLimit());
}

function getSpeedUnit(speedInKB) {
  var unit = ['kb/s', 'Mb/s', 'Gb/s', 'Tb/s', 'Pb/s', 'Eb/s'];
  var e = Math.floor(Math.log(speedInKB*1000) / Math.log(1000));
  return unit[e];
}

function getJustfiedSpeed(speedInKB) {
  var e = Math.floor(Math.log(speedInKB) / Math.log(1000));
  return (speedInKB / Math.pow(1000, e)).toFixed(2);
}

function readNDTvar(variable) {
  var ret = testNDT().getNDTvar(variable);
  return !ret ? '-' : ret;
}

// UTILITIES

function debug(message) {
  if (typeof allowDebug !== 'undefined') {
    if (allowDebug && window.console) console.debug(message);
  }
}

function isPluginLoaded() {
  try {
    testStatus();
    return true;
  } catch(e) {
    return false;
  }
}

// Attempts to determine the absolute path of a script, minus the name of the
// script itself.
function getScriptPath() {
  var scripts = document.getElementsByTagName('SCRIPT');
  var fileRegex = new RegExp('\/ndt-wrapper\.js$');
  var path = '';
  if (scripts && scripts.length > 0) {
    for(var i in scripts) {
      if(scripts[i].src && scripts[i].src.match(fileRegex)) {
        path = scripts[i].src.replace(fileRegex, '');
        break;
      }
    }
  }
  return path.substring(location.origin.length);
};
