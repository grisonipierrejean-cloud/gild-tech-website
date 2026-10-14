// Envoi des vidéos filmées par le commerçant (dépôt de vidéos) : contrôles avant envoi et envoi fiable sur téléphone.
// Règles partagées avec la base (fonction finaliser_depot_video de espace/supabase/schema.sql) : mêmes valeurs, égalité testée par
// moteur/tests/test_depot_video.py. Aucune compression dans le navigateur : le fichier part tel qu'il a été filmé (une recompression fiable
// n'existe pas dans tous les navigateurs de téléphone ; la limite de taille et le conseil « filmez en 1080p » en tiennent lieu).
//
// Envoi : protocole résumable TUS, celui que Supabase recommande au-delà de 6 Mo, par la bibliothèque tus-js-client (vendor/tus.min.js), en
// morceaux de 6 Mo exactement (« it must be set to 6MB (for now) do not change it »), adresse d'envoi valable 24 h ; page officielle
// https://supabase.com/docs/guides/storage/uploads/resumable-uploads, lue le 14/10/2026. supabase-js (storage-js) n'a pas d'envoi résumable :
// sa méthode upload envoie le fichier d'un bloc, sans progression. Une coupure reprend au dernier morceau reçu, y compris après rechargement de
// la page si le même fichier est choisi à nouveau (empreinte gardée dans le navigateur). Sans TUS (navigateur trop ancien) : envoi d'un bloc
// avec progression (XMLHttpRequest) et nouvel essai complet après une coupure, 4 essais au plus.
(function () {
  const cfg = window.RENOM_CONFIG || {};
  const MO = 1024 * 1024;
  // Valeurs RENOM : 1 à 10 vidéos et 10 photos au plus par dépôt, 60 s au plus par vidéo (le guide conseille 5 à 20 s par plan), 50 Mo par photo.
  // videoMaxMo : taille maximale d'une vidéo, ÉGALE à la limite du seau « photos » (file_size_limit, storage.sql) : 50 Mo sur le forfait gratuit
  // de Supabase (maximum de ce forfait), à monter dans config.js en même temps que le seau sur le forfait Pro (ordres/BRANCHEMENT.md, étape 41).
  const REGLES = { VIDEOS_MIN: 1, VIDEOS_MAX: 10, PHOTOS_MAX: 10, DUREE_MAX_S: 60, DUREE_MIN_S: 1, NOTE_MAX: 500, PHOTO_MAX_MO: 50,
    VIDEO_MAX_MO: Math.max(1, +cfg.videoMaxMo || 50), MORCEAU: 6 * MO,
    EXT_VIDEO: ["mp4", "mov", "m4v", "webm", "3gp"], EXT_PHOTO: ["jpg", "jpeg", "png", "webp", "heic"],
    TYPES_VIDEO: ["video/mp4", "video/quicktime", "video/webm", "video/3gpp", "video/x-m4v"], TYPES_PHOTO: ["image/jpeg", "image/png", "image/webp", "image/heic"] };
  const MIME_EXT = { mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm", "3gp": "video/3gpp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic" };
  const extension = f => { const m = String(f.name || "").toLowerCase().match(/\.([a-z0-9]{2,5})$/); return m ? m[1] : ""; };
  // Type d'un fichier : par le type annoncé par le navigateur, sinon par l'extension (Android annonce parfois un type vide pour un .mov).
  function genre(f) {
    const t = String(f.type || "").toLowerCase(), x = extension(f);
    if (REGLES.TYPES_VIDEO.includes(t) || (!t && REGLES.EXT_VIDEO.includes(x)) || (t.startsWith("video/") && REGLES.EXT_VIDEO.includes(x))) return "video";
    if (REGLES.TYPES_PHOTO.includes(t) || (!t && REGLES.EXT_PHOTO.includes(x))) return "photo";
    return null;
  }
  const typeMime = f => { const t = String(f.type || "").toLowerCase(); return t === "video/x-m4v" ? "video/mp4" : t || MIME_EXT[extension(f)] || "application/octet-stream"; };

  // Durée lue par un élément vidéo (métadonnées seulement, rien n'est lu en entier). null si le navigateur ne sait pas la lire
  // (exemple : un .mov HEVC dans un navigateur sans HEVC) : la vidéo est alors acceptée, sa durée sera contrôlée au montage.
  function lireDuree(f, delai) {
    return new Promise(res => {
      let fini = false, url = null; const v = document.createElement("video");
      const fin = d => { if (fini) return; fini = true; try { v.removeAttribute("src"); v.load(); } catch (e) {} if (url) URL.revokeObjectURL(url); res(d); };
      v.preload = "metadata"; v.muted = true; v.playsInline = true;
      v.onloadedmetadata = () => fin(isFinite(v.duration) && v.duration > 0 ? Math.round(v.duration * 10) / 10 : null);
      v.onerror = () => fin(null);
      setTimeout(() => fin(null), delai || 8000);
      try { url = URL.createObjectURL(f); v.src = url; } catch (e) { fin(null); }
    });
  }

  // Contrôle d'un fichier avant envoi. Rend { genre, duree, taille, raison } ; raison = null si le fichier peut partir, sinon un code :
  // format (ni vidéo ni photo acceptée), lourde (vidéo au-delà de videoMaxMo), photo_lourde, longue (plus de 60 s), courte (moins de 1 s).
  async function controler(f) {
    const g = genre(f), taille = +f.size || 0;
    if (!g) return { genre: null, duree: null, taille, raison: "format" };
    if (g === "photo") return { genre: g, duree: null, taille, raison: taille > REGLES.PHOTO_MAX_MO * MO ? "photo_lourde" : null };
    if (taille > REGLES.VIDEO_MAX_MO * MO) return { genre: g, duree: null, taille, raison: "lourde" };
    const duree = await lireDuree(f);
    return { genre: g, duree, taille, raison: duree == null ? null : Math.round(duree) > REGLES.DUREE_MAX_S ? "longue" : duree < REGLES.DUREE_MIN_S ? "courte" : null };
  }
  // Contrôle d'un ensemble : nombre de vidéos et de photos. Rend null ou { code, n }.
  function controlerEnsemble(nbVideos, nbPhotos) {
    if (nbVideos < REGLES.VIDEOS_MIN) return { code: "aucune_video", n: nbVideos };
    if (nbVideos > REGLES.VIDEOS_MAX) return { code: "trop_videos", n: nbVideos };
    if (nbPhotos > REGLES.PHOTOS_MAX) return { code: "trop_photos", n: nbPhotos };
    return null;
  }
  // Nom du fichier dans le dossier du dépôt : rang, nom lisible, extension. Le même fichier donne toujours le même nom (reprise après rechargement).
  function nomDansDepot(rang, f) {
    const x = extension(f) || (genre(f) === "video" ? "mp4" : "jpg");
    const base = String(f.name || "fichier").replace(/\.[^.]*$/, "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "fichier";
    return String(rang + 1).padStart(2, "0") + "-" + base + "." + x;
  }

  // Adresse TUS : hôte de stockage direct conseillé par Supabase pour les gros fichiers (https://<projet>.storage.supabase.co), sinon l'adresse
  // du projet ; cfg.tusUrl la remplace (domaine personnalisé).
  function adresseTus(url) {
    if (cfg.tusUrl) return cfg.tusUrl;
    const m = String(url || "").match(/^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/);
    return m ? `https://${m[1]}.storage.supabase.co/storage/v1/upload/resumable` : String(url || "").replace(/\/$/, "") + "/storage/v1/upload/resumable";
  }
  const attendre = ms => new Promise(r => setTimeout(r, ms));
  const enLigne = () => new Promise(r => { if (navigator.onLine !== false) return r(); const f = () => { window.removeEventListener("online", f); r(); }; window.addEventListener("online", f); });
  const erreurAnnulee = () => Object.assign(new Error("Envoi annulé."), { annule: true });

  // Envoi d'un fichier. o : { fichier, seau, objet (chemin dans le seau), url (projet Supabase), cle (clé publiable), jeton (fonction async : jeton
  // de session à jour, relu à chaque requête car un envoi long peut dépasser la durée d'un jeton), onProgress(envoyes, total), onEtat(etat), signal,
  // tus (bibliothèque, par défaut window.tus), adresse (point d'accès TUS, pour les tests) }. etat : envoi | hors_ligne | nouvel_essai.
  // Rend { mode: "tus" | "simple", deja: vrai si le fichier était déjà complet dans le seau }.
  function envoyer(o) {
    const T = o.tus === undefined ? window.tus : o.tus, etat = o.onEtat || (() => {}), prog = o.onProgress || (() => {});
    if (T && T.isSupported) return envoyerTus(o, T, etat, prog);
    return envoyerSimple(o, etat, prog);
  }
  function envoyerTus(o, T, etat, prog) {
    return new Promise((resoudre, rejeter) => {
      const f = o.fichier; let fini = false, u = null, reprises = 0;
      const finir = (err, r) => { if (fini) return; fini = true; window.removeEventListener("online", relancer); if (o.signal) o.signal.removeEventListener("abort", stop); err ? rejeter(err) : resoudre(r); };
      const stop = () => { if (u) u.abort(false); finir(erreurAnnulee()); };
      // Reprise au retour du réseau, au morceau où l'envoi s'était arrêté (l'adresse d'envoi est gardée par la bibliothèque).
      // Pendant les nouveaux essais de la bibliothèque (jusqu'à 20 s d'attente), le retour du réseau relance tout de suite, sans attendre le délai.
      let enAttente = false, essaiHorsLigne = false;
      const relancer = () => {
        if (fini) return;
        if (enAttente) { enAttente = false; etat("envoi"); u.start(); }
        else if (essaiHorsLigne) { essaiHorsLigne = false; etat("envoi"); Promise.resolve(u.abort(false)).then(() => { if (!fini) u.start(); }); }
      };
      u = new T.Upload(f, {
        endpoint: o.adresse || adresseTus(o.url),
        chunkSize: REGLES.MORCEAU,
        retryDelays: [0, 1000, 3000, 5000, 10000, 20000],
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        storeFingerprintForResuming: true,
        metadata: { bucketName: o.seau, objectName: o.objet, contentType: typeMime(f), cacheControl: "3600" },
        // Empreinte : le chemin du fichier dans le dépôt, sa taille et sa date. Le même fichier choisi après un rechargement reprend où il en était.
        fingerprint: () => Promise.resolve(["renom", o.objet, f.size, f.lastModified || 0].join(":")),
        onBeforeRequest: async req => { const j = o.jeton ? await o.jeton() : null; if (j) req.setHeader("authorization", "Bearer " + j); if (o.cle) req.setHeader("apikey", o.cle); },
        onProgress: (a, b) => prog(a, b),
        onShouldRetry: (err, essai, opts) => { const s = err && err.originalResponse ? err.originalResponse.getStatus() : 0; if (s && s !== 409 && s !== 423 && s >= 400 && s < 500) return false;
          if (navigator.onLine === false) { essaiHorsLigne = true; etat("hors_ligne"); } else etat("nouvel_essai"); return true; },
        onSuccess: () => { prog(f.size, f.size); finir(null, { mode: "tus", deja: false }); },
        onError: err => {
          const s = err && err.originalResponse ? err.originalResponse.getStatus() : 0, corps = err && err.originalResponse ? String(err.originalResponse.getBody() || "") : "";
          // Fichier déjà complet dans le seau (envoyé avant une coupure de la page) : rien à renvoyer.
          if (s === 409 || /already exists/i.test(corps)) { prog(f.size, f.size); return finir(null, { mode: "tus", deja: true }); }
          // Réseau coupé : on attend son retour, sans limite. Serveur injoignable avec le réseau présent : 5 reprises automatiques espacées, puis
          // l'erreur remonte (l'écran propose « Reprendre l'envoi », qui repart du dernier morceau reçu).
          if (navigator.onLine === false) { enAttente = true; etat("hors_ligne"); return; }
          if (!s && reprises++ < 5) { enAttente = true; etat("nouvel_essai"); setTimeout(relancer, 5000); return; }
          finir(Object.assign(new Error(corps || (err && err.message) || "Envoi refusé."), { statut: s, interrompu: !s }));
        },
      });
      window.addEventListener("online", relancer);
      if (o.signal) { if (o.signal.aborted) return stop(); o.signal.addEventListener("abort", stop); }
      etat("envoi");
      u.findPreviousUploads().then(l => { if (l && l.length) u.resumeFromPreviousUpload(l[0]); u.start(); }).catch(() => u.start());
    });
  }
  // Envoi d'un bloc (navigateur sans TUS) : POST /storage/v1/object/<seau>/<chemin> (forme de storage-js 2.7.1, méthode upload), avec progression.
  async function envoyerSimple(o, etat, prog) {
    const f = o.fichier, url = String(o.url || "").replace(/\/$/, "") + "/storage/v1/object/" + o.seau + "/" + o.objet.split("/").map(encodeURIComponent).join("/");
    const ATTENTES = [0, 3000, 10000, 30000];
    for (let i = 0; i < ATTENTES.length; i++) {
      if (o.signal && o.signal.aborted) throw erreurAnnulee();
      if (i) { etat("nouvel_essai"); await attendre(ATTENTES[i]); }
      await enLigne(); etat("envoi");
      const j = o.jeton ? await o.jeton() : null;
      const r = await new Promise(res => {
        const x = new XMLHttpRequest(); x.open("POST", url);
        if (j) x.setRequestHeader("authorization", "Bearer " + j); if (o.cle) x.setRequestHeader("apikey", o.cle);
        x.setRequestHeader("x-upsert", "false"); x.setRequestHeader("cache-control", "max-age=3600"); x.setRequestHeader("content-type", typeMime(f));
        x.upload.onprogress = ev => { if (ev.lengthComputable) prog(ev.loaded, ev.total); };
        x.onload = () => res({ s: x.status, corps: x.responseText }); x.onerror = x.ontimeout = () => res({ s: 0, corps: "" });
        if (o.signal) o.signal.addEventListener("abort", () => x.abort(), { once: true });
        x.send(f);
      });
      if (r.s >= 200 && r.s < 300) { prog(f.size, f.size); return { mode: "simple", deja: false }; }
      if (r.s === 409 || /already exists/i.test(r.corps)) { prog(f.size, f.size); return { mode: "simple", deja: true }; }
      if (r.s >= 400 && r.s < 500 && r.s !== 408 && r.s !== 429) throw Object.assign(new Error(r.corps || "Envoi refusé."), { statut: r.s });
    }
    throw Object.assign(new Error("Envoi interrompu."), { interrompu: true });
  }

  // Démonstration : envoi SIMULÉ (rien ne quitte le navigateur). Même déroulé à l'écran : progression par morceaux de 6 Mo, pause quand le
  // téléphone perd le réseau (événement offline), reprise au même endroit au retour du réseau. debit : octets par seconde simulés.
  async function simuler(o) {
    const f = o.fichier, total = Math.max(1, +f.size || 1), etat = o.onEtat || (() => {}), prog = o.onProgress || (() => {});
    const pas = Math.max(1, Math.min(REGLES.MORCEAU, Math.ceil(total / 12))), tick = Math.max(60, Math.round(pas / (o.debit || 4 * MO) * 1000));
    let envoyes = 0; etat("envoi"); prog(0, total);
    while (envoyes < total) {
      if (o.signal && o.signal.aborted) throw erreurAnnulee();
      if (navigator.onLine === false) { etat("hors_ligne"); await enLigne(); etat("envoi"); }
      await attendre(o.pause ? o.pause(envoyes) : tick);
      if (navigator.onLine === false) continue;          // coupure pendant le morceau : il est renvoyé, rien n'est compté
      envoyes = Math.min(total, envoyes + pas); prog(envoyes, total);
    }
    return { mode: "demo", deja: false };
  }

  window.RENOM_ENVOI = { REGLES, MO, genre, typeMime, extension, lireDuree, controler, controlerEnsemble, nomDansDepot, adresseTus, envoyer, simuler };
})();
