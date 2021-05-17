'use strict';

// Declare app level module which depends on views, and components
angular.module('Measure', [
  'ngRoute',
  'gettext',
  'Measure.Measure',
  'Measure.GaugeService',
])

.value('ndtServer', {})

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/', {
    templateUrl: '/measure/measure.html',
    controller: 'MeasureCtrl'
  });
}])

.run(function (gettextCatalog) {
  var availableLanguages = ['en'];

  if (typeof INTERFACE_LANGUAGE !== 'undefined') {
    availableLanguages = availableLanguages.concat(Object.keys(gettextCatalog.strings));

    if (availableLanguages.indexOf(INTERFACE_LANGUAGE) != -1) {
      gettextCatalog.setCurrentLanguage(INTERFACE_LANGUAGE);
    }
    // gettextCatalog.debug = true;
  }
})
