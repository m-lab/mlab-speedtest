'use strict';

// Declare app level module which depends on views, and components
angular.module('Measure', [
  'ngRoute',
  'gettext',
  'Measure.Measure',
  'Measure.MeasurementLab',
  'Measure.GaugeService'
])

.value('ndtServer', {})

.config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {
  $locationProvider.hashPrefix('!');
  $routeProvider.otherwise({redirectTo: '/measure'});
}])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/measure', {
    templateUrl: 'measure/measure.html',
    controller: 'MeasureCtrl'
  });
}])

.run(function (gettextCatalog) {
  var availableLanguages = ['en'];

  availableLanguages = availableLanguages.concat(Object.keys(gettextCatalog.strings));
  // gettextCatalog.setCurrentLanguage('nl');
  // gettextCatalog.debug = true;
})

.run(function (MLabService, ndtServer, $rootScope) {

  MLabService.findServer().then(
    function(foundServer) {
      ndtServer.fqdn = foundServer.fqdn;
      ndtServer.city = foundServer.city;
      ndtServer.country = foundServer.country;
      $rootScope.$emit('updatedServer');
    },
    function(failureNotification) {console.log(failureNotification)}
  );


});
