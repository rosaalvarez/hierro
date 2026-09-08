/* Hierro — funcionamiento sin conexión.

   La página siempre se pide primero a la red: así, cuando subo una versión
   nueva, la ves. Si no hay internet, tira de la copia guardada.
   El resto de archivos van al revés: primero la copia, que es instantánea. */

var CACHE = 'hierro-v8';
var ASSETS = ['./', './index.html', './manifest.webmanifest',
              './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).catch(function(){})
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(ks){
      return Promise.all(ks.map(function(k){ return k === CACHE ? null : caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

function esLaPagina(req){
  return req.mode === 'navigate' ||
         (req.destination === 'document') ||
         /\/(index\.html)?$/.test(new URL(req.url).pathname);
}

self.addEventListener('fetch', function(e){
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return;

  if (esLaPagina(e.request)) {
    e.respondWith(
      fetch(e.request).then(function(res){
        var copia = res.clone();
        caches.open(CACHE).then(function(c){ c.put('./index.html', copia); }).catch(function(){});
        return res;
      }).catch(function(){
        return caches.match('./index.html').then(function(hit){
          return hit || new Response('Sin conexión y sin copia guardada.', {
            status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(hit){
      if (hit) return hit;
      return fetch(e.request).then(function(res){
        var copia = res.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, copia); }).catch(function(){});
        return res;
      });
    })
  );
});
