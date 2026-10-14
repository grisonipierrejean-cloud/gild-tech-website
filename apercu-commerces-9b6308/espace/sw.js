/* Service worker de l'espace : rend l'espace installable et garde ses fichiers statiques sous la main.
   Ne met en cache QUE les fichiers statiques de l'espace listés ci-dessous (même origine).
   Jamais : les réponses Supabase ou n8n (autre origine), les pages publiques (avis, valider, désinscription),
   la console, l'état de démonstration (demo/), ni aucune requête autre que GET.
   Jamais non plus (dépôt de vidéos, 14/10/2026) : un ENVOI (POST, PATCH, HEAD de l'envoi résumable TUS, adresse /upload/resumable ou /storage/v1/)
   ni une VIDÉO (requête de plage « Range », destination video ou audio, extension .mp4 .mov .m4v .webm .3gp), même de la même origine.
   Réseau d'abord pour les pages, scripts, styles et données : une mise à jour arrive dès la visite suivante ;
   le cache ne sert que hors connexion. Cache d'abord pour les polices et les icônes, qui ne changent pas. */
const CACHE = "renom-espace-v5";   // v5 (14/10/2026) : dépôt de vidéos (envoi.js, vendor/tus.min.js) ; v4 : kit de marque (marque.js, polices du kit) ; v3 : textes en français et en anglais
const RESEAU_DABORD = ["", "index.html", "app.js", "i18n.js", "donnees.js", "config.js", "style.css", "manifest.webmanifest", "manifest-en.webmanifest",
  "vendor/qrcode.js", "vendor/temps-forts.js", "vendor/temps-forts.json", "marque.js", "fonts/couples.json", "envoi.js", "vendor/tus.min.js"];
const CACHE_DABORD = ["fonts/anton-400.woff2", "fonts/figtree-400.woff2", "fonts/figtree-500.woff2", "fonts/figtree-600.woff2", "fonts/figtree-700.woff2",
  "fonts/bricolage.ttf", "fonts/figtree.ttf", "fonts/playfair.ttf", "fonts/dmsans.ttf", "fonts/fraunces.ttf", "fonts/nunito.ttf", "fonts/oswald.ttf",
  "fonts/karla.ttf", "fonts/dmserif.ttf", "fonts/manrope.ttf", "fonts/fredoka.ttf", "fonts/zillaslab.ttf",
  "icones/icone-192.png", "icones/icone-512.png", "icones/apple-touch-icon.png", "icones/favicon-32.png"];
const PRECHARGE = ["index.html", "app.js", "i18n.js", "marque.js", "donnees.js", "config.js", "style.css", "manifest.webmanifest", "vendor/qrcode.js", "vendor/temps-forts.js",
  "fonts/anton-400.woff2", "fonts/figtree-400.woff2", "fonts/figtree-700.woff2", "icones/icone-192.png", "icones/apple-touch-icon.png"];
const PORTEE = new URL("./", self.location).href;

self.addEventListener("install", ev => {
  ev.waitUntil(caches.open(CACHE).then(c => Promise.all(PRECHARGE.map(f => c.add(new Request(f, { cache: "reload" })).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", ev => {
  ev.waitUntil(caches.keys().then(l => Promise.all(l.filter(k => k.startsWith("renom-espace-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Envois et vidéos : jamais interceptés, jamais gardés.
const VIDEO = /\.(mp4|mov|m4v|webm|3gp)$/i;
const jamais = (req, u) => req.method !== "GET" || req.headers.has("range") || req.destination === "video" || req.destination === "audio"
  || /\/upload\/resumable|\/storage\/v1\//.test(u.pathname) || VIDEO.test(u.pathname);
// Chemin relatif à la portée de l'espace, ou null si la requête ne concerne pas un fichier statique de l'espace.
function relatif(req) {
  if (req.method !== "GET") return null;
  const u = new URL(req.url);
  if (jamais(req, u)) return null;
  if (u.origin !== self.location.origin || !u.href.startsWith(PORTEE)) return null;
  return u.pathname.slice(new URL(PORTEE).pathname.length);
}
const garder = (c, cle, r) => { if (r && r.ok && r.type === "basic") c.put(cle, r.clone()); return r; };

self.addEventListener("fetch", ev => {
  const chemin = relatif(ev.request);
  if (chemin === null) return;
  // La page de l'espace est la même quelle que soit la recherche (?voir, ?reset) : une seule entrée, index.html.
  if (RESEAU_DABORD.includes(chemin)) {
    const cle = chemin === "" || chemin === "index.html" ? "index.html" : chemin;
    // « no-cache » : le navigateur revalide auprès du serveur (304 si rien n'a changé) au lieu de resservir sa propre copie.
    ev.respondWith(caches.open(CACHE).then(c => fetch(new Request(ev.request.url, { cache: "no-cache", credentials: "same-origin" })).then(r => garder(c, cle, r))
      .catch(() => c.match(cle).then(m => m || Response.error()))));
  } else if (CACHE_DABORD.includes(chemin)) {
    ev.respondWith(caches.open(CACHE).then(c => c.match(chemin).then(m => m || fetch(ev.request).then(r => garder(c, chemin, r)))));
  }
  // Tout le reste (pages publiques, console, demo/, autres origines) : le navigateur fait comme sans service worker.
});
