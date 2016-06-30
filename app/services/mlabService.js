angular.module('Measure.MeasurementLab', [])

.factory('MLabService', function($q, $http) {

  var CACHE = {
    'type': undefined,
    'answer': undefined,
    'all': undefined,
  };

  function findServer(metroSelection) {
    var findDeferred = $q.defer();
    var temporaryCache, temporaryResponse;

    if (CACHE.type === metroSelection && CACHE.answer !== undefined) {
      if (CACHE.all !== undefined) {
        temporaryCache = CACHE.all.filter(function(cachedResponse) { return cachedResponse.metro === CACHE.answer.metro; });
        temporaryResponse = temporaryCache[Math.floor(Math.random() * temporaryCache.length)];
      } else if (CACHE.answer !== undefined) {
        temporaryResponse = CACHE.answer;
      }

      console.log('cache hit for ' + metroSelection + ' on ' + CACHE.answer.site + ' sending ' + temporaryResponse.fqdn);

      findDeferred.resolve(temporaryResponse);
    } else {
      console.log('Missed cache for ' + metroSelection );
      var mlabNsUrl = 'https://mlab-ns.appspot.com/ndt_ssl?format=json';
      if (metroSelection && metroSelection !== "automatic") {
        mlabNsUrl = 'https://mlab-ns.appspot.com/ndt_ssl?format=json&policy=metro&metro=' + metroSelection;
      }
      CACHE.type = metroSelection;
      $http.get(mlabNsUrl)
      .success(function(responseObject) {
        console.log('Received M-Lab answer ' + responseObject.fqdn +
                    ' for ' + metroSelection);
        responseObject.label = responseObject.city.replace('_', ' ');
        responseObject.metro = responseObject.site.slice(0, 3);
        CACHE.answer = responseObject;
        findDeferred.resolve(responseObject);
      })
      .error(function(data) {
        findDeferred.reject(data);
      });
    }
    return findDeferred.promise;
  }

  function findAll() {
    var findAllDeferred = $q.defer();
    var mlabNsUrl = 'http://mlab-ns.appspot.com/ndt?format=json&policy=all';

    if (CACHE.all === undefined) {
      $http.get(mlabNsUrl)
      .success(function(data, status, headers, config) {
        CACHE.all = [];
        angular.forEach(data, function (responseObject) {
          responseObject.label = responseObject.city.replace('_', ' ');
          responseObject.metro = responseObject.site.slice(0, 3);
          CACHE.all.push(responseObject);
        });
        findAllDeferred.resolve(data);
      })
      .error(function(data, status, headers, config) {
        findAllDeferred.reject(data);
      });
    } else {
      findAllDeferred.resolve(CACHE.all);
    }
    return findAllDeferred.promise;
  }

  return {
    "cachedResponses": CACHE,
    "findServer": findServer,
    "findAll": findAll
  };
});
