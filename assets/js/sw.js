---
layout: null
permalink: /sw.js
---
"use strict";
var CACHE_NAME = '{{ site.github.build_revision }}{{ site.time | date: '%Y%m%d%H%M%S' }}';
var urlsToCache = [
  '{{ "/manifest.json" | relative_url  }}',{% for post in site.posts limit:10 %}{% unless post.redirect_to %}'{{ post.url | relative_url }}',
  {% endunless %}{% endfor %}{% for page in site.pages %}{% if page.layout %}'{{ page.url | relative_url  }}',
  {% endif %}{% endfor %}'{{ "/assets/css/main.css" | relative_url  }}'
];
var idbDatabase;
var IDB_VERSION = {{ site.time | date: '%Y%m%d' }};
var STOP_RETRYING_AFTER = 86400000; // One day, in milliseconds.
var STORE_NAME = 'urls';

// This is basic boilerplate for interacting with IndexedDB. Adapted from
// https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
function openDatabaseAndReplayRequests() {
  var indexedDBOpenRequest = indexedDB.open('offline-analytics', IDB_VERSION);

  // This top-level error handler will be invoked any time there's an IndexedDB-related error.
  indexedDBOpenRequest.onerror = function(error) {
    console.error('IndexedDB error:', error);
  };

  // This should only execute if there's a need to create a new database for the given IDB_VERSION.
  indexedDBOpenRequest.onupgradeneeded = function() {
    this.result.createObjectStore(STORE_NAME, {keyPath: 'url'});
  };

  // This will execute each time the database is opened.
  indexedDBOpenRequest.onsuccess = function() {
    idbDatabase = this.result;
    replayAnalyticsRequests();
  };
}

// Helper method to get the object store that we care about.
function getObjectStore(storeName, mode) {
  return idbDatabase.transaction(storeName, mode).objectStore(storeName);
}

function replayAnalyticsRequests() {
  var savedRequests = [];

  getObjectStore(STORE_NAME).openCursor().onsuccess = function(event) {
    // See https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB#Using_a_cursor
    var cursor = event.target.result;

    if (cursor) {
      // Keep moving the cursor forward and collecting saved requests.
      savedRequests.push(cursor.value);
      cursor.continue();
    } else {
      // At this point, we have all the saved requests.
      //console.log('About to replay %d saved Google Analytics requests...',
      //  savedRequests.length);

      savedRequests.forEach(function(savedRequest) {
        var queueTime = Date.now() - savedRequest.timestamp;
        if (queueTime > STOP_RETRYING_AFTER) {
          getObjectStore(STORE_NAME, 'readwrite').delete(savedRequest.url);
          //console.log(' Request has been queued for %d milliseconds. ' +
            //'No longer attempting to replay.', queueTime);
        } else {
          // The qt= URL parameter specifies the time delta in between right now, and when the
          // /collect request was initially intended to be sent. See
          // https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#qt
          var requestUrl = savedRequest.url + '&qt=' + queueTime;

          //console.log(' Replaying', requestUrl);

          fetch(requestUrl).then(function(response) {
            if (response.status < 400) {
              // If sending the /collect request was successful, then remove it from the IndexedDB.
              getObjectStore(STORE_NAME, 'readwrite').delete(savedRequest.url);
              //console.log(' Replaying succeeded.');
            } else {
              // This will be triggered if, e.g., Google Analytics returns a HTTP 50x response.
              // The request will be replayed the next time the service worker starts up.
              //console.error(' Replaying failed:', response);
            }
          }).catch(function(error) {
            // This will be triggered if the network is still down. The request will be replayed again
            // the next time the service worker starts up.
            //console.error(' Replaying failed:', error);
          });
        }
      });
    }
  };
}

// Open the IndexedDB and check for requests to replay each time the service worker starts up.
// Since the service worker is terminated fairly frequently, it should start up again for most
// page navigations. It also might start up if it's used in a background sync or a push
// notification context.
openDatabaseAndReplayRequests();

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME)
  .then(cache => cache.addAll(urlsToCache)).then(() => {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('fetch',event => {
  event.respondWith(
    caches.match(event.request)
    .then(response => {
      if (response) return response;

      var fetchRequest = event.request.clone();
      return fetch(fetchRequest).then(response => {
          if (!response || response.status != 200 || response.type !== 'basic'){
            if (response.status >= 500) {
              // If this is a Google Analytics ping then we want to retry it if a HTTP 5xx response
              // was returned, just like we'd retry it if the network was down.
              checkForAnalyticsRequest(event.request.url);
            }
            return response;
          }

            var responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
            return response;
        }).catch(() => {
          // The catch() will be triggered for network failures. Let's see if it was a request for
          // a Google Analytics ping, and save it to be retried if it was.
          checkForAnalyticsRequest(event.request.url);
          return caches.match('/offline.html');
        })
      }));
    });

self.addEventListener('activate',event => {
  var chacheWhiteList=[CACHE_NAME];
  event.waitUntil(
    caches.keys().then(keyList => {
        return Promise.all(keyList.map(key => {
          if (chacheWhiteList.indexOf(key) === -1)
            return caches.delete(key);
        }));
      }).then(() => {
        return self.clients.claim();
      })
    );
  });

  function checkForAnalyticsRequest(requestUrl) {
    // Construct a URL object (https://developer.mozilla.org/en-US/docs/Web/API/URL.URL)
    // to make it easier to check the various components without dealing with string parsing.
    var url = new URL(requestUrl);

    if ((url.hostname === 'www.google-analytics.com' ||
         url.hostname === 'ssl.google-analytics.com') &&
         url.pathname === '/collect') {
      //console.log('  Storing Google Analytics request in IndexedDB to be replayed later.');
      saveAnalyticsRequest(requestUrl);
    }
  }

  function saveAnalyticsRequest(requestUrl) {
    getObjectStore(STORE_NAME, 'readwrite').add({
      url: requestUrl,
      timestamp: Date.now()
    });
  }
