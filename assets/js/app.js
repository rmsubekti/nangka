---
---
//Register service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('{{ "/sw.js" | relative_url }}')
        .then(function(reg) {
            // Registration was successful
            //console.log(reg.scope);

            // updatefound is fired if service-worker.js changes.
            reg.onupdatefound = function() {
                var installingWorker = reg.installing;
                {%- if site.google_analytics -%}
                installingWorker.onstatechange = function() {
                    ga('send', 'event','Progressive Web App', 'Service Worker State', installingWorker.state);
                };
                {%- endif -%}
            };
        })
        .catch(err => console.error('%c 😨\n', 'font-size:60px; color:red', err));

    //Check to see whether the service worker is controlling the page.
    if (navigator.serviceWorker.controller) {
        // If .controller is set, then this page is being actively controlled by the service worker.
        console.info('%c 🤘', 'font-size:70px; color: #bada55' /*,reg*/ );
        
    } else {
        // If .controller isn't set, then prompt the user to reload the page so that the service worker can take
        // control. Until that happens, the service worker's fetch handler won't be used.
        console.info('%c  ⚓\n%cPlease reload this page to allow the service worker to handle network operations.', 'font-size:60px; color:green', 'background-color:#333;color:#fff;');
    }
} else {
    // The current browser doesn't support service workers.
    console.log('%c   🗿\n%cService workers are not supported.', 'font-size:50px;color:#bcbcbc;', 'background-color:#333;color:#fff;');
}