// Couche de données de l'espace : UNE interface, DEUX adaptateurs.
//   - démonstration (navigateur seulement, faux services) : config.js vide ;
//   - Supabase : config.js renseigné (supabaseUrl, publishableKey).
// Les écrans n'appellent que RENOM_DATA : passer de l'un à l'autre ne change aucun écran.
(function () {
  const cfg = window.RENOM_CONFIG || {};
  // commentaires : réponses aux commentaires Instagram et Facebook comprises (page de vente : Croissance et Signature ; même valeur que offres.commentaires
  // dans schema.sql et moteur/offres.json, égalité testée). Aucun plafond : la page de vente n'en chiffre aucun.
  const OFFRES = { essentiel: { nom: "Essentiel", publications: 8, videos: 0, commentaires: false, prix_ht: 190, prix_lancement_ht: 95 }, croissance: { nom: "Croissance", publications: 16, videos: 4, commentaires: true, prix_ht: 390, prix_lancement_ht: 195 }, signature: { nom: "Signature", publications: 24, videos: 8, commentaires: true, prix_ht: 690, prix_lancement_ht: 345 } };
  // Offre de lancement (moteur/offres.json, CGV article 4) : 3 premiers mois à moitié prix, abonnement souscrit au plus tard le 31/12/2026. Prix égaux à offres.json (test_commentaires.js).
  const LANCEMENT = { remise_pct: 50, duree_mois: 3, date_limite: "2026-12-31" };
  const FICHE = ["nom", "metier", "ville", "ton", "specialites", "horaires", "mots_cles", "mentions_autorisees", "contact", "email_validation", "couleurs", "reglage_avis", "lien_avis", "notifications", "commentaires_compliments_auto"];
  const RESEAUX = ["facebook", "instagram", "google", "tiktok"];
  const TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"], MAX = 50 * 1024 * 1024;
  const verifierFichier = f => !TYPES.includes(f.type) ? "Format non accepté (JPEG, PNG, WebP ou HEIC)." : f.size > MAX ? "Fichier trop lourd (50 Mo au plus)." : null;
  const mois0 = () => new Date().toISOString().slice(0, 7) + "-01";
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
  const REGLES = { programme: "Seul un contenu approuvé se programme.", futur: "La date doit être dans le futur." };

  // ---- Collecte : règles communes aux deux adaptateurs (les mêmes que dans schema.sql)
  const RETOUR = { message: 1000, prenom: 60, parHeure: 20, parJour: 100 };
  // Lien d'avis réellement proposé au public : celui de la fiche s'il est en https, sinon celui construit sur l'identifiant de lieu.
  const lienAvisPublic = c => {
    const l = String((c && c.lien_avis) || "").trim(); if (/^https:\/\/[^\s"<>]+$/i.test(l)) return l;
    return c && /^[A-Za-z0-9_-]+$/.test(c.google_place_id || "") ? "https://search.google.com/local/writereview?placeid=" + c.google_place_id : null;
  };
  const nettoyerRetour = r => {
    const note = Number(r && r.note), message = String((r && r.message) || "").trim(), prenom = String((r && r.prenom) || "").trim();
    if (!Number.isInteger(note) || note < 1 || note > 5) throw new Error("Choisissez une note de 1 à 5.");
    if (message.length > RETOUR.message) throw new Error("Votre message est trop long (1 000 caractères au plus).");
    if (prenom.length > RETOUR.prenom) throw new Error("Votre prénom est trop long (60 caractères au plus).");
    return { note, message: message || null, prenom: prenom || null };
  };
  // Page publique avis.html branchée sur Supabase : deux appels de fonctions SQL, sans session et sans la bibliothèque Supabase.
  const rpcPublic = async (nom, args) => {
    const r = await fetch(String(cfg.supabaseUrl).replace(/\/+$/, "") + "/rest/v1/rpc/" + nom, { method: "POST", headers: { apikey: cfg.publishableKey, "Content-Type": "application/json" }, body: JSON.stringify(args) });
    const d = await r.json().catch(() => null);
    if (!r.ok) throw new Error((d && d.message) || "Le service ne répond pas. Réessayez dans un instant.");
    return d;
  };
  const premierDe = l => (Array.isArray(l) ? l[0] : l) || null;
  const publicSupabase = {
    mode: "supabase",
    async avisPublic(jeton) { return premierDe(await rpcPublic("avis_public", { p_jeton: String(jeton || "") })); },
    async deposerRetour(jeton, r) { const v = nettoyerRetour(r); await rpcPublic("deposer_retour_prive", { p_jeton: String(jeton || ""), p_note: v.note, p_message: v.message, p_prenom: v.prenom }); },
    // ---- Mise à jour de l'espace membre : mesure de la collecte et validation par lien (fonctions publiques, rôle anon)
    async compterCollecte(jeton, type, canal) {
      if (!TYPES_COLLECTE.includes(type)) return;
      // Automatisations de service : page ouverte depuis l'email de demande d'avis (avis.html?source=email&envoi=<jeton>), comptée avec sa source.
      if (canal && canal.source === "email" && /^[0-9a-f]{32}$/.test(canal.envoi || "")) return void await rpcPublic("compter_collecte_email", { p_jeton: String(jeton || ""), p_type: type, p_envoi: canal.envoi });
      await rpcPublic("compter_collecte", { p_jeton: String(jeton || ""), p_type: type });
    },
    // ---- Automatisations de service : page de désinscription (desinscription.html#<jeton>), sans connexion
    async desinscriptionInfo(jeton) { return premierDe(await rpcPublic("desinscription_info", { p_jeton: String(jeton || "") })); },
    async seDesinscrire(jeton) { return premierDe(await rpcPublic("se_desinscrire", { p_jeton: String(jeton || "") })); },
    // La base renvoie l'objet imbriqué ({contenu:{…}} ou {avis:{…}}) ; la page attend une forme à plat, comme en démonstration.
    async objetParJeton(jeton) {
      const r = premierDe(await rpcPublic("objet_par_jeton", { p_jeton: String(jeton || "") })); if (!r) return null;
      const base = { etat: "a_valider", objet: r.objet, commerce: r.commerce, expire_le: r.expire_le, langue: r.langue || null };
      if (r.contenu) { const c = r.contenu; return { ...base, type: c.type, format: c.format, legende: c.legende || "", legendes: c.legendes || null, visuel_url: c.apercu_url || null, video_url: null }; }
      if (r.avis) { const a = r.avis; return { ...base, note: a.note, texte: a.texte || "", auteur: a.auteur || "", reponse_proposee: a.reponse_proposee || "" }; }
      if (r.commentaire) { const m = r.commentaire; return { ...base, reseau: m.reseau, categorie: m.categorie, texte: m.texte || "", auteur: m.auteur || "", reponse_proposee: m.reponse_proposee || "", recu_le: m.recu_le }; }
      return r;
    },
    async validerParJeton(jeton, decision, texte) { await rpcPublic("valider_par_jeton", { p_jeton: String(jeton || ""), p_decision: decision, p_texte: texte == null ? null : String(texte) }); },
  };
  // ---- Collecte : fin des règles communes

  // ---- Mise à jour de l'espace membre : règles communes aux deux adaptateurs (contrat : ordres/CONTRAT-MAJ-MEMBRE.md)
  const TYPES_COLLECTE = ["passage", "clic_google"];
  // Créneaux de départ par métier, heure de Paris. Ce sont des réglages de départ, pas une étude : ils seront remplacés par les
  // meilleurs horaires réels quand les statistiques des réseaux seront branchées.
  const CRENEAUX = { restaurant: ["11:30", "18:30"], beaute: ["10:00", "19:00"], sport: ["07:00", "18:00"], autre: ["12:00", "18:00"] };
  const DELAI_MIN_CRENEAU = 2 * 3600000;
  // Limite de l'API Google Business Profile pour le texte (summary) d'une publication sur la fiche : 1 500 caractères.
  const LIMITE_GOOGLE = 1500;
  const formatDe = c => (c && c.format) || (c && c.type === "video" ? "video" : "publication");
  // Une vidéo ou une story ne se publie pas sur la fiche Google.
  const reseauxPour = c => formatDe(c) === "publication" ? RESEAUX.slice() : RESEAUX.filter(r => r !== "google");
  // Légende propre au réseau, avec repli sur la légende unique (contenus créés avant la mise à jour).
  const legendeDe = (c, r) => { const l = c && c.legendes && c.legendes[r]; return typeof l === "string" && l.trim() ? l : (c && c.legende) || ""; };
  const longueur = t => Array.from(String(t || "")).length;
  const controlerLegende = (r, t) => {
    if (!RESEAUX.includes(r)) throw new Error("Réseau inconnu.");
    t = String(t || "").trim(); if (!t) throw new Error("La légende ne peut pas être vide.");
    if (r === "google" && longueur(t) > LIMITE_GOOGLE) throw new Error(`Sur la fiche Google, le texte est limité à 1 500 caractères. Celui-ci en compte ${longueur(t)}.`);
    return t;
  };
  // Heure de Paris : décalage réel du fuseau à cet instant (heure d'été comprise), sans bibliothèque.
  const FMT_PARIS = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const partiesParis = t => { const p = {}; FMT_PARIS.formatToParts(new Date(t)).forEach(x => { p[x.type] = +x.value; }); return { a: p.year, m: p.month - 1, j: p.day, h: p.hour, mi: p.minute, s: p.second }; };
  const decalageParis = t => { const p = partiesParis(t); return Date.UTC(p.a, p.m, p.j, p.h, p.mi, p.s) - Math.floor(t / 1000) * 1000; };
  const instantParis = (a, m, j, h, mi) => { const g = Date.UTC(a, m, j, h, mi); let t = g - decalageParis(g); t = g - decalageParis(t); return t; };
  // Prochain créneau libre du métier, à au moins 2 h d'ici. pris : instants (ms) déjà occupés par une publication du commerce.
  function prochainCreneau(metier, pris, maintenant) {
    const now = maintenant || Date.now(), occupe = new Set(pris || []), p = partiesParis(now), heures = CRENEAUX[metier] || CRENEAUX.autre;
    for (let k = 0; k < 60; k++) {
      const d = new Date(Date.UTC(p.a, p.m, p.j + k));
      for (const hm of heures) {
        const [h, mi] = hm.split(":").map(Number), t = instantParis(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, mi);
        if (t >= now + DELAI_MIN_CRENEAU && !occupe.has(t)) return t;
      }
    }
    throw new Error("Aucun créneau libre dans les 60 prochains jours.");
  }
  // Actions propres à la fiche Google : contrôles de forme, les mêmes avant l'appel à la base.
  const TYPES_ACTION = ["photos", "offre", "evenement", "horaires"];
  const aujourdhui = () => { const p = partiesParis(Date.now()); return `${p.a}-${String(p.m + 1).padStart(2, "0")}-${String(p.j).padStart(2, "0")}`; };
  const JOUR = /^\d{4}-\d{2}-\d{2}$/, HEURE = /^\d{2}:\d{2}$/;
  function controlerAction(type, d) {
    if (!TYPES_ACTION.includes(type)) throw new Error("Action inconnue.");
    d = d || {}; const t = String(d.titre || "").trim(), auj = aujourdhui();
    if (type === "photos") { if (!Array.isArray(d.photos) || !d.photos.length) throw new Error("Choisissez au moins une photo."); return { photos: d.photos.map(String) }; }
    if (type === "offre" || type === "evenement") {
      if (!t) throw new Error("Écrivez un titre."); if (longueur(t) > 120) throw new Error("Titre trop long (120 caractères au plus).");
      if (!JOUR.test(d.debut || "") || !JOUR.test(d.fin || "")) throw new Error("Indiquez la date de début et la date de fin.");
      if (d.fin < d.debut) throw new Error("La date de fin doit suivre la date de début."); if (d.fin < auj) throw new Error("La date de fin est déjà passée.");
      const r = { titre: t, debut: d.debut, fin: d.fin };
      if (type === "offre") { const cond = String(d.conditions || "").trim(); if (longueur(cond) > LIMITE_GOOGLE) throw new Error("Conditions trop longues (1 500 caractères au plus)."); r.conditions = cond; }
      return r;
    }
    if (!JOUR.test(d.date || "")) throw new Error("Indiquez la date."); if (d.date < auj) throw new Error("Cette date est déjà passée.");
    if (d.ferme) return { date: d.date, ferme: true };
    if (!HEURE.test(d.ouverture || "") || !HEURE.test(d.fermeture || "")) throw new Error("Indiquez l'heure d'ouverture et l'heure de fermeture, ou cochez « Fermé ».");
    if (d.fermeture <= d.ouverture) throw new Error("L'heure de fermeture doit suivre l'heure d'ouverture.");
    return { date: d.date, ferme: false, ouverture: d.ouverture, fermeture: d.fermeture };
  }
  // Réponses aux 5 questions de démarrage : chaque réponse est facultative (on peut passer une question).
  const TONS = ["chaleureux", "sobre", "enjoue"], ACTIONS = ["reserver", "appeler", "venir", "acheter"];
  function controlerDemarrage(r) {
    r = r || {}; const txt = (k, n) => { const v = String(r[k] || "").trim(); if (longueur(v) > n) throw new Error("Réponse trop longue (" + n + " caractères au plus)."); return v; };
    const ton = TONS.includes(r.ton) ? r.ton : "", action = ACTIONS.includes(r.action) ? r.action : "";
    return { phrase: txt("phrase", 300), distinctions: txt("distinctions", 600), ton, interdits: txt("interdits", 600), action, action_detail: action ? txt("action_detail", 200) : "" };
  }
  // ---- fin des règles communes de la mise à jour

  // ---- Vidéo d'avis : règles communes aux deux adaptateurs. Mêmes valeurs et mêmes phrases que moteur/video_avis.py et que le
  // déclencheur SQL verifier_demande_video_avis (égalité vérifiée par moteur/tests/test_video_avis.py et espace/test_ecrans.py).
  const VIDEO_AVIS = { MIN: 2, MAX: 4, NOTE_MIN: 4, LIMITE: 240,
    // Durée de conservation des avis (règle « Content storage » de l'API Business Profile : « no more than 30 calendar days »)
    AGE_MAX_JOURS: 30, MOTIF_ANCIEN: "Avis reçu il y a plus de 30 jours : Google ne permet pas de conserver un avis plus longtemps, il n'est donc plus proposé.",
    PLAGES: "0020-007E 00A0-00A3 00A5-00AC 00AE-0107 010A-0113 0116-011B 011E-0123 0126-0127 012A-012B 012E-0133 0136-0137 0139-013E 0141-0148 014A-014D 0150-015B 015E-0161 0164-0165 016A-017E 2013-2014 2018-201A 201C-201E 2022 2026 2039-203A 20AC 2122 2212",
    // Cinq styles, bâtis sur les DEUX familles libres du moteur (Bricolage Grotesque et Figtree) : graisses et largeurs différentes.
    STYLES: [
      { id: "franc", nom: "Franc", titre: ["Bricolage Grotesque", "'opsz' 48, 'wght' 800, 'wdth' 100"], texte: ["Figtree", "'wght' 500"], auteur: ["Figtree", "'wght' 700"] },
      { id: "pose", nom: "Posé", titre: ["Figtree", "'wght' 700"], texte: ["Figtree", "'wght' 400"], auteur: ["Figtree", "'wght' 600"] },
      { id: "etroit", nom: "Étroit", titre: ["Bricolage Grotesque", "'opsz' 48, 'wght' 700, 'wdth' 75"], texte: ["Bricolage Grotesque", "'opsz' 24, 'wght' 500, 'wdth' 75"], auteur: ["Bricolage Grotesque", "'opsz' 24, 'wght' 700, 'wdth' 75"] },
      { id: "fin", nom: "Fin", titre: ["Bricolage Grotesque", "'opsz' 96, 'wght' 300, 'wdth' 100"], texte: ["Bricolage Grotesque", "'opsz' 36, 'wght' 300, 'wdth' 100"], auteur: ["Bricolage Grotesque", "'opsz' 24, 'wght' 500, 'wdth' 100"] },
      { id: "fort", nom: "Fort", titre: ["Bricolage Grotesque", "'opsz' 96, 'wght' 800, 'wdth' 100"], texte: ["Bricolage Grotesque", "'opsz' 36, 'wght' 700, 'wdth' 100"], auteur: ["Figtree", "'wght' 600"] },
    ],
    FONDS: [
      { id: "photos", nom: "Vos photos", note: "Vos photos déposées, assombries pour que le texte reste lisible, avec un mouvement lent." },
      { id: "uni", nom: "Fond uni, votre couleur de fond", note: "La couleur de fond de votre fiche." },
      { id: "accent", nom: "Fond uni, votre couleur d'accent", note: "La couleur d'accent de votre fiche." },
    ],
  };
  const VA_BLANCS = " \t\r\n\f\v\u00a0\u202f", VA_OK = new Set();
  VIDEO_AVIS.PLAGES.split(" ").forEach(p => { const [a, b] = p.split("-").map(x => parseInt(x, 16)); for (let i = a; i <= (b || a); i++) VA_OK.add(i); });
  VIDEO_AVIS.longueur = t => Array.from(t || "").length;
  // Raison pour laquelle un avis ne peut pas entrer dans une vidéo ; null s'il est proposable.
  // Avis effacé, ou reçu (entrée dans RENOM) il y a plus de 30 jours. Sans date connue : non.
  VIDEO_AVIS.tropAncien = (a, maintenant) => !!a.efface_le || (!!a.cree_le && (maintenant || Date.now()) - Date.parse(a.cree_le) > VIDEO_AVIS.AGE_MAX_JOURS * 86400000);
  VIDEO_AVIS.motif = (a, maintenant) => {
    const t = a.texte || "", n = VIDEO_AVIS.longueur(t);
    if (a.sensible) return "Avis marqué sensible : il n'est jamais proposé.";
    if (VIDEO_AVIS.tropAncien(a, maintenant)) return VIDEO_AVIS.MOTIF_ANCIEN;
    if ((a.note || 0) < VIDEO_AVIS.NOTE_MIN) return `Note de ${a.note || 0} sur 5 : seuls les avis de ${VIDEO_AVIS.NOTE_MIN} et 5 étoiles sont proposés.`;
    if (!t.trim()) return "Avis sans texte : il n'y a rien à citer.";
    if (!(a.auteur || "").trim()) return "Auteur inconnu : un avis n'est cité qu'avec le prénom de son auteur.";
    if (n > VIDEO_AVIS.LIMITE) return `Avis de ${n} caractères : la limite est de ${VIDEO_AVIS.LIMITE} pour qu'il tienne à l'écran sans être coupé.`;
    const refuses = [...new Set(Array.from(t).filter(ch => !VA_BLANCS.includes(ch) && !VA_OK.has(ch.codePointAt(0))))].sort();
    if (refuses.length) return `Cet avis contient un caractère que la vidéo ne sait pas afficher (${refuses.slice(0, 5).join(" ")}). Un avis n'est jamais modifié : il n'est donc pas proposé.`;
    return null;
  };
  const vaControle = (avis_ids, fond, style) => {
    if (avis_ids.length < VIDEO_AVIS.MIN || avis_ids.length > VIDEO_AVIS.MAX) throw new Error(`Choisissez de ${VIDEO_AVIS.MIN} à ${VIDEO_AVIS.MAX} avis (vous en avez choisi ${avis_ids.length}).`);
    if (new Set(avis_ids).size !== avis_ids.length) throw new Error("Un même avis ne peut pas être choisi deux fois.");
    if (!VIDEO_AVIS.FONDS.some(f => f.id === fond)) throw new Error("Choisissez un fond.");
    if (!VIDEO_AVIS.STYLES.some(s => s.id === style)) throw new Error("Choisissez un style de typographie.");
  };

  // ---- Son de plateforme d'une vidéo à poser À LA MAIN dans Metricool (aucun champ de l'API Metricool documenté : moteur/metricool_api.py,
  // son_plateforme ; même calcul dans n8n/renom-publication.json, « Préparer les posts »). La démonstration imite le workflow à la programmation.
  const SON_METRICOOL = ["instagram", "tiktok"];
  const sonPlateforme = (ct, reseaux) => {
    const m = ct && ct.type === "video" ? (ct.musique || { mode: "plateforme", ambiance: null, volume_video: null, volume_musique: null }) : null;
    const avec = m && m.mode === "plateforme" ? reseaux.filter(r => SON_METRICOOL.includes(r)) : [];
    return avec.length ? { code: "MUSIQUE_PLATEFORME_NON_POSEE", reseaux: avec, ambiance: m.ambiance ?? null, volume_video: m.volume_video ?? null,
      volume_musique: m.volume_musique ?? null, sans_bibliotheque: reseaux.filter(r => !SON_METRICOOL.includes(r)) } : null; };

  // ---- Dépôt de vidéos : règles communes aux deux adaptateurs (valeurs dans espace/web/envoi.js, RENOM_ENVOI.REGLES ; mêmes valeurs et
  // mêmes refus que le bloc « Dépôt de vidéos » de schema.sql, égalité testée par moteur/tests/test_depot_video.py et rls.test.mjs).
  const DEPOT_VIDEO = {
    STATUTS: ["en_envoi", "envoye", "en_montage", "a_valider", "valide", "refuse", "annule", "abandonne"],
    ATTENTE: ["en_envoi", "envoye", "en_montage"],
    OUVERT_MS: 24 * 3600000,
    PHRASES: { sans_video: "Votre offre ne comprend pas de vidéo.", plafond: "Le plafond de vidéos de votre offre est atteint ce mois-ci.",
      ouvert: "Un envoi de vidéos est déjà en cours : terminez-le ou annulez-le.", ferme: "Ce dépôt n'est plus en cours d'envoi.", introuvable: "Dépôt introuvable.",
      nb_videos: "Un dépôt contient de 1 à 10 vidéos.", nb_photos: "Un dépôt contient 10 photos au plus.", longue: "Une vidéo dépasse 60 secondes.",
      refus_commercant: "Vous avez refusé ce montage.", abandon: "Envoi non terminé en 24 h.", efface: "Vidéos d'origine déjà effacées : montage impossible.",
      relance: "Seul un dépôt envoyé, en montage ou refusé se relance.", note: "Votre note est trop longue (500 caractères au plus)." },
  };
  // Refus de la base (Supabase) ramenés aux mêmes phrases que la démonstration ; une phrase inconnue reste telle quelle.
  const phraseDepot = m => { const P = DEPOT_VIDEO.PHRASES, x = String(m || "");
    return /ne comprend pas de vidéo/.test(x) ? P.sans_video : /plafond de l'offre atteint/.test(x) ? P.plafond : /déjà en cours/.test(x) ? P.ouvert
      : /plus en cours d'envoi/.test(x) ? P.ferme : /dépôt introuvable/.test(x) ? P.introuvable : /de 1 à 10 vidéos/.test(x) ? P.nb_videos : /10 photos au plus/.test(x) ? P.nb_photos
      : /60 secondes/.test(x) ? P.longue : /déjà effacées/.test(x) ? P.efface : /seul un dépôt/.test(x) ? P.relance : /commerce en pause/.test(x) ? "Votre commerce est en pause : contactez RENOM."
      : /fichier non reçu : (.*)$/.test(x) ? "Fichier non reçu : " + x.match(/fichier non reçu : (.*)$/)[1] + "." : /réservé à l'administrateur/.test(x) ? "Réservé à l'administrateur." : x; };
  // ---- fin des règles communes du dépôt de vidéos

  // ---- Réponses aux commentaires : règles communes aux deux adaptateurs (mêmes valeurs que le bloc « Réponses aux commentaires » de schema.sql)
  const COMMENTAIRES = {
    LIMITE: 1000, CONSERVATION_JOURS: 30,
    CATEGORIES: { question: "Question", compliment: "Compliment", reclamation: "Réclamation", spam: "Spam", sensible: "Sensible" },
    ETATS: { a_valider: "À valider", valide: "Validée, publication en cours", a_publier_main: "Validée, publiée par notre équipe sous peu", publie: "Réponse publiée", humain: "À traiter par vous", ignore: "Sans réponse", clos: "Traité par vous" },
    RESEAUX: { instagram: "Instagram", facebook: "Facebook" },
  };
  function controlerDecisionCommentaire(x, decision, texte) {
    if (!x) throw new Error("Commentaire introuvable.");
    if (x.statut === "humain") { if (decision !== "clos") throw new Error("Un commentaire sensible ne reçoit pas de réponse de RENOM : répondez-y vous-même sur le réseau, puis marquez-le comme traité."); return { statut: "clos" }; }
    if (x.statut !== "a_valider") throw new Error("Ce commentaire a déjà été traité.");
    if (decision === "ignore") return { statut: "ignore" };
    if (decision !== "valide") throw new Error("Décision inconnue : valider la réponse ou ne pas répondre.");
    const t = String(texte ?? x.reponse_proposee ?? "").trim();
    if (!t) throw new Error("Écrivez une réponse, ou choisissez de ne pas répondre.");
    if (longueur(t) > COMMENTAIRES.LIMITE) throw new Error("La réponse est trop longue (1 000 caractères au plus).");
    return { statut: "valide", reponse_proposee: t };
  }
  // ---- fin des règles communes des commentaires

  // ---- Automatisations de service : règles communes aux deux adaptateurs (mêmes valeurs et mêmes phrases que le bloc
  // « Automatisations de service » de espace/supabase/schema.sql ; textes de la mise en route repris de moteur/courriels/service.js).
  const AUTO = {
    MAX_CLIENTS: 500, PASSAGE_MAX_JOURS: 14, ECART_JOURS: 90,
    POINTS: [
      { point: "compte", titre: "Activer votre compte", aide: "C'est fait dès votre première visite dans l'espace." },
      { point: "google", titre: "Donner à RENOM l'accès gestionnaire de votre fiche Google", aide: "Sur business.google.com : Paramètres du profil, Personnes et accès, Ajouter, l'adresse que RENOM vous indique, rôle Gestionnaire. Vous restez propriétaire.", declarable: true },
      { point: "metricool", titre: "Connecter vos réseaux à notre outil de programmation", aide: "Ouvrez le lien de connexion de notre outil de programmation que RENOM vous envoie, puis connectez Facebook et Instagram. RENOM publie ensuite pour vous, seulement ce que vous avez approuvé.", declarable: true },
      { point: "demarrage", titre: "Répondre aux 5 questions de démarrage", aide: "Cinq questions courtes pour que RENOM écrive comme vous. Chacune peut être passée." },
    ],
    ETATS: { a_faire: "À faire", declare: "Fait selon vous, RENOM vérifie", fait: "Fait" },
  };
  const emailValide = e => /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]{2,}$/.test(e || "") && String(e).length <= 254;
  const dateValide = d => /^\d{4}-\d{2}-\d{2}$/.test(d || "") && !isNaN(Date.parse(d + "T00:00:00Z")) && new Date(d + "T00:00:00Z").toISOString().slice(0, 10) === d;
  // Fichier CSV de clients : une ligne d'en-tête (prénom, email, date de passage, dans n'importe quel ordre), séparateur « ; », « , » ou tabulation,
  // dates AAAA-MM-JJ ou JJ/MM/AAAA. Les erreurs de forme du fichier sont refusées ici ; les règles ligne par ligne sont celles de la base.
  const COLONNES = { prenom: ["prenom", "prenom du client", "first name", "firstname"], email: ["email", "e mail", "mail", "courriel", "adresse email", "adresse e mail", "adresse mail"],
    date: ["date", "date de passage", "date passage", "passage", "date de visite", "date visite", "visite"] };
  function lireCsvClients(texte) {
    const l = String(texte || "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n").filter(x => x.trim());
    if (!l.length) throw new Error("Le fichier est vide.");
    const sep = [";", ",", "\t"].map(s => [s, l[0].split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
    const cellules = ligne => { const r = []; let c = "", q = false;
      for (let i = 0; i < ligne.length; i++) { const ch = ligne[i];
        if (q) { if (ch === '"' && ligne[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; }
        else if (ch === '"') q = true; else if (ch === sep) { r.push(c); c = ""; } else c += ch; }
      r.push(c); return r.map(x => x.trim()); };
    const norme = s => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const tete = cellules(l[0]).map(norme), col = k => tete.findIndex(h => COLONNES[k].includes(h)), ip = col("prenom"), ie = col("email"), id = col("date");
    if (ip < 0 || ie < 0 || id < 0) throw new Error("La première ligne doit nommer les colonnes : prénom, email, date de passage.");
    if (l.length < 2) throw new Error("Le fichier ne contient aucun client.");
    if (l.length - 1 > AUTO.MAX_CLIENTS) throw new Error("Le fichier doit contenir de 1 à " + AUTO.MAX_CLIENTS + " clients.");
    const date = s => { const m = String(s || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : String(s || ""); };
    return l.slice(1).map(x => { const c = cellules(x); return { prenom: c[ip] || "", email: String(c[ie] || "").toLowerCase(), date_passage: date(c[id]) }; });
  }
  const TYPES_ALERTE = { ERREUR_WORKFLOW: "Erreur de workflow", PHOTOS_EMAIL_REFUSEES: "Photos par email refusées", MISE_EN_ROUTE_BLOQUEE: "Mise en route bloquée", ECHEC_RELANCE_PROSPECT: "Relance de prospect en échec",
    AVIS_SENSIBLE_A_EFFACER: "Avis sensible bientôt effacé (30 jours)", COMMENTAIRE_SENSIBLE_A_EFFACER: "Commentaire sensible bientôt effacé (30 jours)",
    // Paiement Stripe (fonction appliquer_evenement_stripe de schema.sql)
    PAIEMENT_REFUSE: "Paiement refusé", ABONNEMENT_SANS_COMMERCE: "Paiement sans commerce rattaché", REMISE_LANCEMENT_DEJA_UTILISEE: "Remise de lancement utilisée deux fois",
    ABONNEMENT_RESILIE: "Abonnement résilié" };
  const texteAlerte = a => { const d = a.detail || {};
    if (a.type === "ERREUR_WORKFLOW") return `${d.workflow || "Workflow inconnu"}, nœud ${d.noeud || "inconnu"} : ${d.message || ""}`;
    if (a.type === "PHOTOS_EMAIL_REFUSEES") return `${d.pieces || 0} pièce(s) jointe(s) refusée(s) : ${d.raison || d.statut || ""}. Rien n'a été déposé.`;
    if (a.type === "MISE_EN_ROUTE_BLOQUEE") return `${d.jours} jours après la création, il reste : ${(d.restants || []).map(r => r.point).join(", ")}.`;
    if (a.type === "PAIEMENT_REFUSE") return `Abonnement ${d.abonnement || ""} : appeler le commerçant sous 24 h.${d.test ? " (mode test)" : ""}`;
    if (a.type === "ABONNEMENT_SANS_COMMERCE") return `Abonnement ${d.abonnement || ""} payé sans commerce rattaché : le rattacher dans l'éditeur SQL.${d.test ? " (mode test)" : ""}`;
    if (a.type === "REMISE_LANCEMENT_DEJA_UTILISEE") return `Abonnement ${d.abonnement || ""} : retirer la remise dans Stripe (une fois par commerce).${d.test ? " (mode test)" : ""}`;
    if (a.type === "ABONNEMENT_RESILIE") return `Abonnement ${d.abonnement || ""} : arrêter les publications en fin de période, retirer les accès sous 7 jours ouvrés.${d.test ? " (mode test)" : ""}`;
    if (/_A_EFFACER$/.test(a.type)) return `Toujours en attente d'une personne. Texte effacé le ${String(d.efface_le || "").slice(0, 10)} (règle des 30 jours) : à traiter avant.`;
    return JSON.stringify(d); };
  // ---- Paiement Stripe : lien du bouton « Payer / gérer mon abonnement » (adresses publiques de config.js, stripe : {liens, portail, codeLancement,
  // finLancement}, écrites par outils/stripe_catalogue.py). Abonnement en cours : portail client ; aucun abonnement ou abonnement résilié : lien de paiement
  // de l'offre, avec l'identifiant du commerce (client_reference_id, relu par le webhook) et le code de lancement prérempli jusqu'à la date limite.
  // Rien de configuré : pas de bouton (null). Source : https://docs.stripe.com/payment-links/url-parameters et /payment-links/customize, lues le 14/10/2026.
  const STATUTS_ABONNEMENT = ["en_attente", "actif", "impaye", "resilie"];
  function lienAbonnement(ab, c, offre, maintenant) {
    const s = cfg.stripe || {}, https = u => typeof u === "string" && /^https:\/\/[^\s"<>]+$/.test(u) ? u : null;
    // Abonnement en cours (même impayé) : jamais le lien de paiement, qui créerait un second abonnement ; seulement le portail.
    if (ab && ab.statut !== "resilie") return https(s.portail);
    const base = https((s.liens || {})[offre]); if (!base || !c || !/^[A-Za-z0-9_-]{1,200}$/.test(String(c.id || ""))) return null;
    const q = ["client_reference_id=" + encodeURIComponent(c.id), "locale=fr"], fin = s.finLancement || LANCEMENT.date_limite;
    if (s.codeLancement && /^[A-Za-z0-9]+$/.test(s.codeLancement) && (maintenant || new Date().toISOString().slice(0, 10)) <= fin) q.push("prefilled_promo_code=" + s.codeLancement);
    return base + (base.includes("?") ? "&" : "?") + q.join("&");
  }
  const MODELE_CSV = "prenom;email;date_passage\nCamille;camille@exemple.fr;" + new Date().toISOString().slice(0, 10) + "\n";
  // ---- fin des règles communes des automatisations

  // =============================================================== DÉMONSTRATION
  function demo() {
    // Deux graines : celle du parcours (demo/etat.json, générée par demo/parcours.py) et la graine PUBLIQUE, entièrement fictive
    // (demo/etat-public.json), choisie par window.RENOM_GRAINE = "public" dans config.js. Chacune a son propre stockage.
    const PUBLIQUE = window.RENOM_GRAINE === "public";
    const K = "renom-demo-v13" + (PUBLIQUE ? "-public" : "");
    let E = null, session = null, pret = null, TF = null;
    // Calendrier des temps forts (copie exacte de moteur/temps_forts/, vérifiée par moteur/tests/test_service.js) : l'idée de la semaine de la démonstration
    // est calculée par le même code que le workflow n8n du lundi. Absent (page sans vendor/temps-forts.js) : pas d'idée de la semaine, rien d'inventé.
    const chargerTempsForts = async () => { try { if (typeof ideeDeLaSemaine !== "function") return null; const r = await fetch("vendor/temps-forts.json", { cache: "no-store" }); return r.ok ? await r.json() : null; } catch (e) { return null; } };
    const sauver = () => { try { localStorage.setItem(K, JSON.stringify(E)); } catch (e) {} };
    // Deux onglets ouverts (l'espace et la page de validation par lien) : chacun reprend l'état écrit par l'autre.
    try { window.addEventListener("storage", ev => { if (ev.key === K && ev.newValue && E) { try { E = JSON.parse(ev.newValue); } catch (x) {} } }); } catch (e) {}
    const graine = async () => {
      try { const r = await fetch(PUBLIQUE ? "demo/etat-public.json" : "demo/etat.json", { cache: "no-store" }); if (r.ok) return await r.json(); } catch (e) {}
      if (PUBLIQUE) throw new Error("La démonstration n'a pas pu se charger. Rechargez la page.");   // jamais de repli sur les données du parcours
      return { users: { "commerce@demo": { role: "commerçant", commerce: "c-demo" }, "autre@demo": { role: "commerçant", commerce: "c-autre" }, "pj@demo": { role: "administrateur" } },
        commerces: { "c-demo": { id: "c-demo", nom: "Commerce de démonstration", metier: "autre", ville: "", offre_id: "essentiel", en_pause: false, mots_cles: [], mentions_autorisees: [], couleurs: { fond: "#FFFFFF", texte: "#000000", accent: "#2438FF" }, reglage_avis: "auto_des_4_etoiles" },
          "c-autre": { id: "c-autre", nom: "Salle de démonstration", metier: "sport", ville: "Orléans", offre_id: "croissance", en_pause: false, mots_cles: [], mentions_autorisees: [], couleurs: { fond: "#FFFFFF", texte: "#000000", accent: "#2438FF" }, reglage_avis: "tout_automatique" } },
        photos: [], contenus: [], publications: [], idees_demandes: [], idees: [], avis: [], journal: [], invitations: [],
        comptes: { "c-demo": { google: { etat: "non_connecte" }, facebook: { etat: "non_connecte" }, instagram: { etat: "non_connecte" }, tiktok: { etat: "non_connecte" } }, "c-autre": { google: { etat: "non_connecte" }, facebook: { etat: "non_connecte" }, instagram: { etat: "non_connecte" }, tiktok: { etat: "non_connecte" } } } };
    };
    const init = () => pret || (pret = (async () => {
      const reset = /[?&]reset\b/.test(location.search + location.hash);
      try { if (!reset) E = JSON.parse(localStorage.getItem(K)); } catch (e) { E = null; }
      if (!E) {
        E = completerGraine(await graine());
        // Retours privés fournis par la graine : rangés dans leur propre stockage, comme ceux déposés depuis la page d'avis
        if (Array.isArray(E.retours_prives)) { ecrireRetours([...E.retours_prives.map(x => ({ id: uid(), lu: false, ...x })), ...lireRetours()]); delete E.retours_prives; }
        sauver();
      }
      conserver();   // règle des 30 jours, appliquée à chaque ouverture comme le passage quotidien du serveur
      TF = TF || await chargerTempsForts(); assurerIdeeSemaine();
      // Session durable : elle reste d'une visite à l'autre dans ce navigateur (localStorage), jusqu'à « Quitter ».
      try { if (reset) localStorage.removeItem(K + ":session"); const s = localStorage.getItem(K + ":session"); if (s && E.users[s]) session = s; } catch (e) {}
    })());
    const listeComptes = () => { const l = Object.keys(E.users); return l.length > 1 ? l.slice(0, -1).join(", ") + " ou " + l[l.length - 1] : l.join(""); };
    const cur = () => { const u = E.users[session]; return u && u.commerce ? E.commerces[u.commerce] : null; };
    const mine = t => E[t].filter(x => x.commerce_id === cur().id);
    const jour = (cid, type, detail) => { E.journal.unshift({ id: uid(), commerce_id: cid, type, detail: detail || {}, cree_le: new Date().toISOString() }); };
    const usage = c => E.contenus.filter(x => x.commerce_id === c.id && x.type === "publication" && x.mois === mois0() && x.statut !== "refuse").length + E.idees_demandes.filter(x => x.commerce_id === c.id && x.mois === mois0() && x.statut !== "refusee").length;
    const usageVideos = c => E.contenus.filter(x => x.commerce_id === c.id && x.type === "video" && x.mois === mois0() && x.statut !== "refuse").length;
    // Dépôts de vidéos en attente de montage (sans contenu encore) : ils réservent leur place, comme la fonction SQL videos_reservees.
    const depotsAttente = (c, sauf) => liste("depots_video").filter(d => d.commerce_id === c.id && d.mois === mois0() && !d.contenu_id && d.id !== sauf
      && (["envoye", "en_montage"].includes(d.statut) || (d.statut === "en_envoi" && Date.now() - Date.parse(d.cree_le) < DEPOT_VIDEO.OUVERT_MS))).length;
    const reserveesVideos = c => usageVideos(c) + (E.videos_avis_demandes || []).filter(x => x.commerce_id === c.id && x.mois === mois0() && ["a_traiter", "en_cours"].includes(x.statut)).length + depotsAttente(c);
    const pasEnPause = c => { if (c.en_pause) throw new Error("Votre commerce est en pause : contactez RENOM."); };
    const repondusCommentaires = c => liste("commentaires").filter(x => x.commerce_id === c.id && ["valide", "a_publier_main", "publie"].includes(x.statut) && x.decide_le && x.decide_le.slice(0, 7) === mois0().slice(0, 7)).length;
    const vc = c => { const o = OFFRES[c.offre_id]; return { commerce_id: c.id, mois: mois0(), offre: c.offre_id, offre_nom: o.nom, en_pause: !!c.en_pause, publications_plafond: o.publications, videos_plafond: o.videos, publications_utilisees: usage(c), videos_utilisees: usageVideos(c), idees_demandees: E.idees_demandes.filter(x => x.commerce_id === c.id && x.mois === mois0() && x.statut !== "refusee").length,
      commentaires_inclus: !!o.commentaires, commentaires_repondus: repondusCommentaires(c) }; };
    const admin = () => { const u = E.users[session]; if (!u || u.role !== "administrateur") throw new Error("Réservé à l'administrateur."); };

    // ---- Collecte (démonstration) : jeton public et retours privés
    // Le jeton de démonstration se calcule à partir de l'identifiant : il est donc le même dans tous les navigateurs, et devinable.
    // En production, le jeton vient de la base (colonne jeton_avis, tirée au hasard).
    const jetonDemo = id => { let h = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b]; for (const ch of "renom-demo:" + id) h = h.map((x, i) => Math.imul(x ^ (ch.charCodeAt(0) + 31 * i), 16777619) >>> 0); return h.map(x => x.toString(16).padStart(8, "0")).join(""); };
    const jetonDe = c => c.jeton_avis || (c.jeton_avis = jetonDemo(c.id));
    const parJeton = j => Object.values(E.commerces).find(c => jetonDe(c) === j) || null;
    // Les retours ont leur propre clé de stockage : la page publique et l'espace, ouverts dans deux onglets, ne s'écrasent pas.
    const KR = K + ":retours"; let retoursMem = [];
    try { if (/[?&]reset\b/.test(location.search + location.hash)) localStorage.removeItem(KR); } catch (e) {}
    const lireRetours = () => { try { const l = JSON.parse(localStorage.getItem(KR)); retoursMem = Array.isArray(l) ? l : []; } catch (e) {} return retoursMem; };
    const ecrireRetours = l => { retoursMem = l; try { localStorage.setItem(KR, JSON.stringify(l)); } catch (e) {} };
    const collecteDemo = {
      async jetonAvis() { await init(); return jetonDe(cur()); },
      async avisPublic(jeton) { await init(); const c = parJeton(String(jeton || "")); return c ? { nom: c.nom, couleurs: c.couleurs || {}, lien_avis: lienAvisPublic(c), langue: c.langue || "fr" } : null; },
      async deposerRetour(jeton, r) {
        await init(); const c = parJeton(String(jeton || "")); if (!c) throw new Error("Ce lien n'est pas reconnu.");
        if (!lienAvisPublic(c)) throw new Error("Cette page n'est pas encore active.");
        const v = nettoyerRetour(r), l = lireRetours(), depuis = ms => l.filter(x => x.commerce_id === c.id && Date.now() - new Date(x.cree_le).getTime() < ms).length;
        if (depuis(3600000) >= RETOUR.parHeure || depuis(86400000) >= RETOUR.parJour) throw new Error("Trop de messages ont été envoyés à ce commerce. Réessayez plus tard.");
        l.push({ id: uid(), commerce_id: c.id, note: v.note, message: v.message, prenom: v.prenom, lu: false, cree_le: new Date().toISOString() }); ecrireRetours(l);
      },
      async retoursPrives() { await init(); const c = cur(); return lireRetours().filter(x => x.commerce_id === c.id).sort((a, b) => b.cree_le.localeCompare(a.cree_le)); },
      async marquerRetour(id, lu) { await init(); const c = cur(), l = lireRetours(), r = l.find(x => x.id === id && x.commerce_id === c.id); if (!r) throw new Error("Retour introuvable."); r.lu = !!lu; ecrireRetours(l); },
    };
    // ---- Collecte (démonstration) : fin

    // Kit de marque proposé à la première photo (rôle du moteur, rendu_cloud.proposer_kit) : même calcul, dans le navigateur.
    async function proposerKitDemo(c, url) {
      const MQ = window.RENOM_MARQUE; if (!MQ) return; const cat = await MQ.charger(), img = await MQ.chargerImage(url);
      if (c.marque) return;
      const k = MQ.garderCouleurs(MQ.proposer({ photos: [MQ.pixels(img)], metier: c.metier, ton: c.ton || "", cat }), c.couleurs);
      c.marque = { ...k, version: 1, maj: new Date().toISOString() }; c.couleurs = MQ.couleursCommerce(c.marque);
      jour(c.id, "MARQUE_PROPOSEE", { source: "photos", version: 1, simule: true }); sauver();
    }
    // Kit de marque d'un commerce : écran « Votre style » (le commerçant) et panneau « Style du commerce » de la console (RENOM, par = "renom").
    // Mêmes règles que la base : fautes refusées, version posée ici, auteur (valide_par) posé ici et jamais repris du navigateur, journal du commerce.
    async function marqueDemo(c) {
      const MQ = window.RENOM_MARQUE, cat = await MQ.charger();
      const src = ((c.marque && c.marque.source && c.marque.source.photos) || []).filter(u => /^demo\//.test(u)).map(u => ({ url: u, nom: u.split("/").pop() }));
      const photos = [...E.photos.filter(p => p.commerce_id === c.id && /^data:image\//.test(p.url || "")).map(p => ({ url: p.url, nom: p.nom_fichier })), ...src].slice(0, 6);
      return { kit: c.marque ? MQ.normaliser(c.marque, c.couleurs, c.metier, c.ton || "", cat) : null, brut: c.marque || null, photos,
        logo: c.marque && c.marque.logo ? ((E.logos || {})[c.marque.logo] || null) : null, demandes: demandesStyleDemo(c) };
    }
    const demandesStyleDemo = c => liste("demandes_style").filter(x => x.commerce_id === c.id).sort((a, b) => b.cree_le.localeCompare(a.cree_le)).slice(0, 20);
    async function logoDemo(c, f) {
      const MQ = window.RENOM_MARQUE, e = MQ.controlerLogo(f); if (e) throw Object.assign(new Error("logo " + e), { code: "sty.logo." + e });
      // Démonstration : le logo est gardé dans ce navigateur, réduit à 512 px (en production : fichier d'origine dans le seau « photos », SVG converti en PNG).
      const blob = await MQ.enPng(f, 512), url = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
      const chemin = c.id + "/marque/logo-" + uid().replace(/[^a-z0-9]/gi, "").slice(0, 12) + ".png";
      E.logos = E.logos || {}; E.logos[chemin] = url; sauver(); return { chemin, url };
    }
    // verrouille : état voulu ; explicite : validation demandée par un bouton (« Ça me plaît », « Enregistrer et valider pour le client »).
    async function enregistrerMarqueDemo(c, kit, verrouille, par, explicite) {
      const MQ = window.RENOM_MARQUE, cat = await MQ.charger();
      const m = { ...MQ.sansBase({ ...kit, verrouille: !!verrouille, auto: false }) }; delete m.valide_par;
      const ancien = c.marque || null, maintenant = new Date().toISOString(), avant = !!(ancien && ancien.verrouille), parAvant = (ancien && ancien.valide_par) || "commercant";
      // Auteur et date de validation : mêmes règles que le déclencheur regler_marque
      let vl = m.verrouille ? maintenant : null; m.valide_par = par;
      if (m.verrouille && avant && !explicite) { m.valide_par = parAvant; vl = ancien.verrouille_le; }
      else if (m.verrouille && avant && par === parAvant) vl = ancien.verrouille_le;
      const f = MQ.fautes(m, c.id, cat);
      if (f.length) throw Object.assign(new Error("Kit de marque refusé : " + f.join(", ")), { codes: f });
      if (!ancien || MQ.canon(MQ.sansBase(ancien)) !== MQ.canon(m)) {
        m.version = (+(ancien && ancien.version) || 0) + 1; m.maj = maintenant; m.verrouille_le = vl;
        const deja = avant && parAvant === "commercant";   // même règle que journaliser_marque
        jour(c.id, par === "renom" ? (m.verrouille ? "MARQUE_VALIDEE_RENOM" : "MARQUE_REGLEE_RENOM") : m.verrouille && (explicite || !avant) && !deja ? "MARQUE_VALIDEE" : "MARQUE_ENREGISTREE", { version: m.version, par });
        c.marque = m; c.couleurs = MQ.couleursCommerce(m); sauver();
      }
      return c.marque;
    }
    // Ce que le commerçant règle lui-même (fonction SQL regler_ma_marque) : logo, expressions, validation. Le reste est réglé par RENOM.
    const CLES_COMMERCANT = ["logo", "logo_fond", "mots_signature", "a_eviter"];
    async function reglerMaMarqueDemo(c, p, valider) {
      const MQ = window.RENOM_MARQUE, cat = await MQ.charger(); p = p || {};
      if (Object.keys(p).some(k => !CLES_COMMERCANT.includes(k)) || valider === false) throw new Error("Votre style est réglé par RENOM : demandez-lui un changement.");
      const base = c.marque ? { ...c.marque } : MQ.normaliser(null, c.couleurs, c.metier, c.ton || "", cat);
      return enregistrerMarqueDemo(c, { ...base, ...p }, valider ? true : !!base.verrouille, "commercant", valider === true);
    }
    function demanderChangementStyleDemo(c, texte) {
      const x = String(texte || "").trim(); if (!x || x.length > 1000) throw new Error("Écrivez votre demande (1 000 caractères au plus).");
      if (liste("demandes_style").filter(d => d.commerce_id === c.id && Date.now() - Date.parse(d.cree_le) < 86400000).length >= 10) throw new Error("Trop de demandes aujourd'hui. Réessayez demain.");
      const d = { id: uid(), commerce_id: c.id, texte: x, cree_le: new Date().toISOString(), traitee_le: null }; E.demandes_style.unshift(d);
      jour(c.id, "STYLE_CHANGEMENT_DEMANDE", { demande: d.id }); sauver(); return d.id;
    }
    // Faux services (jouent le rôle de n8n, GitHub Actions, Claude, Metricool, Google : rien de réel)
    const faux = {
      creation(photo) {
        const c = E.commerces[photo.commerce_id];
        if (usage(c) >= OFFRES[c.offre_id].publications) { photo.statut = "refusee"; jour(c.id, "REFUS", { photo: photo.id, raison: "plafond de publications atteint" }); return; }
        const legende = "Légende de démonstration : en service, notre IA l'écrit à partir de votre photo et de votre fiche.", id = uid();
        E.contenus.unshift({ id, commerce_id: c.id, photo_id: photo.id, type: "publication", format: "publication", legende, legendes: legendesDemo(c, legende), visuel_url: photo.url || null, note_modification: null, statut: "a_valider", mois: mois0(), cree_le: new Date().toISOString(), demo: true,
          marque_version: (c.marque && c.marque.version) || null });
        photo.statut = "traitee"; jour(c.id, "PRODUIT", { photo: photo.id, simule: true }); emettreJeton(c.id, "contenu", id);
      },
      // ---- Vidéo d'avis : FAUX rendu. Aucune vidéo n'est fabriquée dans le navigateur. Si la démonstration a été préparée
      // (python3 demo/video_avis_demo.py), le contenu montre une vidéo d'EXEMPLE rendue par le vrai moteur avec les avis fictifs.
      videoAvis(d) {
        if (d.statut !== "a_traiter") return; const c = E.commerces[d.commerce_id], o = OFFRES[c.offre_id];
        const refuser = motif => { d.statut = "refusee"; d.motif = motif; jour(c.id, "VIDEO_AVIS_REFUSEE", { demande: d.id, raison: motif, simule: true }); };
        if (!o.videos) return refuser("Votre offre ne comprend pas de vidéo.");
        if (usageVideos(c) + depotsAttente(c) >= o.videos) return refuser("Le plafond de vidéos de votre offre est atteint ce mois-ci.");
        const ex = E.video_avis_exemple || {}, id = uid();
        E.contenus.unshift({ id, commerce_id: c.id, photo_id: null, type: "video", format: "video", legende: "Vidéo d'avis de démonstration : rendu simulé par un faux service." + (ex.video_url ? " La vidéo montrée est un exemple produit par le vrai moteur avec des avis fictifs, pas avec votre sélection." : ""),
          visuel_url: ex.visuel_url || null, video_url: ex.video_url || null, note_modification: null, statut: "a_valider", mois: mois0(), cree_le: new Date().toISOString(), demo: true });
        d.statut = "traitee"; d.contenu_id = id; jour(c.id, "VIDEO_AVIS", { demande: d.id, contenu: id, simule: true });
        emettreJeton(c.id, "contenu", id);
      },
    };
    // ---- Dépôt de vidéos : FAUX montage. Aucune vidéo n'est montée dans le navigateur : le contenu montre une vidéo d'EXEMPLE de la graine
    // (montage_exemple), jamais les fichiers déposés, et sa légende le dit.
    faux.montage = d => {
      if (!["envoye", "en_montage"].includes(d.statut)) return; const c = E.commerces[d.commerce_id], ex = E.montage_exemple || E.video_avis_exemple || {}, id = uid();
      E.contenus.unshift({ id, commerce_id: c.id, photo_id: null, depot_video_id: d.id, type: "video", format: "video",
        legende: "Montage de démonstration : rendu simulé par un faux service." + (ex.video_url ? " La vidéo montrée est un exemple, pas un montage de vos fichiers." : ""),
        visuel_url: ex.visuel_url || null, video_url: ex.video_url || null, note_modification: null, statut: "a_valider", mois: d.mois, cree_le: new Date().toISOString(), demo: true });
      Object.assign(d, { statut: "a_valider", contenu_id: id, motif: null, maj_le: new Date().toISOString() }); jour(c.id, "MONTAGE", { depot: d.id, contenu: id, simule: true });
      emettreJeton(c.id, "contenu", id);
    };
    // Décision sur le contenu d'un montage : le dépôt suit (même règle que le déclencheur SQL suivre_contenu_depot).
    const suivreDepot = ct => { const d = ct.depot_video_id && liste("depots_video").find(x => x.id === ct.depot_video_id && x.contenu_id === ct.id); if (!d) return;
      d.statut = ["approuve", "programme", "publie"].includes(ct.statut) ? "valide" : ct.statut === "refuse" ? "refuse" : ct.statut === "modification" ? "en_montage" : "a_valider";
      d.motif = ct.statut === "refuse" ? DEPOT_VIDEO.PHRASES.refus_commercant : null; if (d.statut === "valide") d.valide_le = d.valide_le || new Date().toISOString(); d.maj_le = new Date().toISOString(); };
    const vaDemandes = () => (E.videos_avis_demandes = E.videos_avis_demandes || []);
    // Décision sur un commentaire (espace ou lien) puis, si elle est validée, le faux workflow de publication : accès de Meta non accordé, donc file manuelle.
    function appliquerDecisionCommentaire(x, decision, texte) {
      const d = controlerDecisionCommentaire(x, decision, texte), maintenant = iso(Date.now());
      Object.assign(x, d, { decide_le: maintenant }); if (d.statut === "ignore") x.decision = "ignore";
      if (d.statut === "valide") Object.assign(x, { statut: "a_publier_main", erreur: "Accès de Meta pas encore accordé : publication par l'équipe RENOM." });
    }

    // =========================================================== Mise à jour de l'espace membre (démonstration)
    const MS_H = 3600000, iso = t => new Date(t).toISOString();
    const debutMois = m => Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1, 1);
    const finMois = m => Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 1);
    const moisDecale = n => { const m = mois0(); return new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1)).toISOString().slice(0, 10); };
    const dans = (t, m) => { t = new Date(t).getTime(); return t >= debutMois(m) && t < finMois(m); };
    const liste = k => (E[k] = E[k] || []);
    // Légende propre à chaque réseau, construite à partir de la légende unique et des mots-clés de la fiche (démonstration).
    const legendesDemo = (c, l) => {
      const tags = (c.mots_cles || []).map(m => "#" + m.replace(/[^\p{L}\p{N}]+/gu, "")).filter(t => t.length > 1).join(" ");
      const court = (l.match(/^[^.!?]+[.!?]/) || [l])[0];
      return { instagram: tags ? l + "\n\n" + tags : l, facebook: l, google: l, tiktok: tags ? court + " " + tags : court };
    };
    // ---- Validation par lien : un jeton par objet « à valider », usage unique, 7 jours. Jamais pour un avis sensible.
    const nouveauJeton = () => { const a = new Uint8Array(16); crypto.getRandomValues(a); return Array.from(a, x => x.toString(16).padStart(2, "0")).join(""); };
    function emettreJeton(cid, objet, id) {
      const c = E.commerces[cid]; if (!c || (c.notifications && c.notifications.email === false)) return;
      if (objet === "avis") { const a = E.avis.find(x => x.id === id); if (!a || a.sensible) return; }
      if (objet === "commentaire") { const m = liste("commentaires").find(x => x.id === id); if (!m || m.categorie === "sensible") return; }
      const l = liste("jetons_validation"), maintenant = Date.now();
      if (l.some(j => j.objet_id === id && !j.utilise_le && new Date(j.expire_le).getTime() > maintenant)) return;
      l.push({ jeton: nouveauJeton(), commerce_id: cid, objet, objet_id: id, expire_le: iso(maintenant + 7 * 24 * MS_H), utilise_le: null, cree_le: iso(maintenant) });
      jour(cid, "EMAIL_VALIDATION", { objet, simule: true });
    }
    const objetDuJeton = j => j.objet === "contenu" ? E.contenus.find(x => x.id === j.objet_id) : j.objet === "commentaire" ? liste("commentaires").find(x => x.id === j.objet_id) : E.avis.find(x => x.id === j.objet_id);
    function lireJeton(jeton) {
      const j = liste("jetons_validation").find(x => x.jeton === String(jeton || "")); if (!j) return { etat: "inconnu" };
      const o = objetDuJeton(j), c = E.commerces[j.commerce_id];
      if (!o || !c || (j.objet === "avis" && o.sensible) || (j.objet === "commentaire" && o.categorie === "sensible")) return { etat: "inconnu" };
      if (j.utilise_le) return { etat: "utilise", j };
      if (new Date(j.expire_le).getTime() <= Date.now()) return { etat: "expire", j };
      if (o.statut !== "a_valider") return { etat: "traite", j };
      return { etat: "a_valider", j, o, c };
    }
    // ---- Génération des données de démonstration de la mise à jour (6 mois). Rien de réel : tout est marqué « démonstration ».
    // Dates relatives de la graine publique (il_y_a_h, dans_h, prevu_il_y_a_h, repondu_apres_h, mois « courant » ou « precedent »),
    // converties au chargement : la démonstration reste à jour quel que soit le jour où on l'ouvre.
    function datesRelatives(G, maintenant) {
      const H = 3600000;
      ["photos", "contenus", "publications", "idees_demandes", "idees", "avis", "journal", "videos_avis_demandes", "retours_prives", "commentaires", "depots_video"].forEach(k => (G[k] || []).forEach(x => {
        if (x.il_y_a_h != null) { x.cree_le = iso(maintenant - x.il_y_a_h * H); delete x.il_y_a_h; }
        if (x.dans_h != null) { x.prevu_le = iso(maintenant + x.dans_h * H); delete x.dans_h; }
        if (x.prevu_il_y_a_h != null) { x.prevu_le = iso(maintenant - x.prevu_il_y_a_h * H); delete x.prevu_il_y_a_h; }
        if (x.repondu_apres_h != null) { x.repondu_le = iso(new Date(x.cree_le).getTime() + x.repondu_apres_h * H); delete x.repondu_apres_h; }
        if (x.decide_apres_h != null) { x.decide_le = iso(new Date(x.cree_le).getTime() + x.decide_apres_h * H); delete x.decide_apres_h; }
        if (x.mois === "courant") x.mois = mois0(); else if (x.mois === "precedent") x.mois = moisDecale(-1);
      }));
      // Abonnement fictif de la graine publique : fin de la remise de lancement dans n jours (date du jour décalée), jamais une vraie date de Stripe.
      (G.abonnements || []).forEach(x => { if (x.remise_fin_dans_j != null) { x.remise_lancement_fin = iso(maintenant + x.remise_fin_dans_j * 24 * H).slice(0, 10); delete x.remise_fin_dans_j; }
        if (x.maj_il_y_a_h != null) { x.maj_le = iso(maintenant - x.maj_il_y_a_h * H); delete x.maj_il_y_a_h; } });
    }
    function completerGraine(G) {
      if (G.maj_membre) return G; G.maj_membre = 1; E = G;
      ["avis_historique", "google_demo", "concurrents", "audits_mensuels", "collecte_evenements", "actions_fiche", "jetons_validation"].forEach(liste);
      G.bases = G.bases || {};
      Object.values(G.commerces).forEach(c => { if (c.demarrage_fini == null) c.demarrage_fini = c.id !== "c-autre"; if (!("demarrage" in c)) c.demarrage = null; c.notifications = c.notifications || { email: true, whatsapp: false }; });
      const maintenant = Date.now(); datesRelatives(G, maintenant);
      G.contenus.forEach(x => { x.format = x.format || (x.type === "video" ? "video" : "publication"); });
      // Commerce principal de la démonstration : celui que désigne la graine (demo_maj), sinon celui du premier compte commerçant.
      // Les textes propres au commerce du parcours viennent de sa propre fiche : aucun nom de commerce n'est écrit ici.
      const prof = G.demo_maj || null, premier = Object.values(G.users).find(u => u.commerce), er = G.commerces[prof ? prof.principal : premier && premier.commerce];
      if (er) {
        // Réponses au démarrage, tirées des faits publics de la fiche
        const phrase1 = t => ((String(t || "").match(/^[^.!?]+[.!?]/) || [String(t || "")])[0]).trim();
        if (!prof) er.demarrage = er.demarrage || { phrase: phrase1(er.specialites), distinctions: "", ton: /enthousias|enjou/i.test(er.ton || "") ? "enjoue" : /chaleur/i.test(er.ton || "") ? "chaleureux" : "sobre",
          interdits: "", action: /réserv/i.test(er.horaires || "") ? "reserver" : "venir", action_detail: er.contact || "" };
        // Légendes par réseau : deux contenus en ont, les autres gardent la légende unique (repli, comme les anciens contenus)
        if (!prof) G.contenus.filter(x => x.commerce_id === er.id && ((x.photo_id === "p-velo-pins" && x.type === "publication") || (x.photo_id === "p-fat-bike-foret" && x.type === "video")) && !x.legendes)
          .forEach(x => { x.legendes = legendesDemo(er, x.legende || ""); if (x.type === "video") delete x.legendes.google; });
        // Une story à valider (format 9:16), produite à la fin du mois dernier
        const pins = G.contenus.find(x => x.photo_id === "p-velo-pins" && x.type === "publication");
        if (!prof && !G.contenus.some(x => x.format === "story")) {
          const l = er.horaires || "Horaires de démonstration.";
          G.contenus.push({ id: "story-demo", commerce_id: er.id, photo_id: pins ? pins.photo_id : null, type: "publication", format: "story", legende: l, legendes: { instagram: l, facebook: l, tiktok: l },
            visuel_url: pins ? pins.visuel_url : null, note_modification: null, statut: "a_valider", mois: moisDecale(-1), cree_le: iso(debutMois(mois0()) - 6 * MS_H), demo: true });
        }
        // Date de réponse des avis déjà répondus (pour le délai de réponse)
        G.avis.filter(a => a.commerce_id === er.id && ["publie", "valide"].includes(a.statut) && !a.repondu_le)
          .forEach((a, i) => { a.repondu_le = iso(new Date(a.cree_le).getTime() + (a.decision === "publication_automatique" ? 2 + (i % 4) : 19) * MS_H); });
        // Avis des 5 mois précédents (historique, seulement pour les résultats) : la note et le nombre d'avis en découlent
        const RECUS = [3, 4, 5, 6, 8], REPONDUS = [1, 2, 5, 6, 8], DELAIS = [70, 52, 20, 9, 5], NOTES = [5, 4, 5, 5, 3, 5, 4, 5, 5, 4, 5, 5, 4, 5, 5, 3, 5, 5, 4, 5, 5, 4, 5, 5, 4, 5];
        let k = 0;
        RECUS.forEach((n, i) => { const d0 = debutMois(moisDecale(i - 5));
          for (let j = 0; j < n; j++, k++) { const cree = d0 + Math.round((1 + j * 26 / n) * 24 + 9) * MS_H, rep = j < REPONDUS[i] ? cree + Math.round(DELAIS[i] * (0.7 + 0.15 * ((j * 3) % 5))) * MS_H : null;
            G.avis_historique.push({ id: "h-" + k, commerce_id: er.id, note: NOTES[k % NOTES.length], cree_le: iso(cree), repondu_le: rep ? iso(rep) : null, demo: true }); } });
        G.bases[er.id] = (prof && prof.base) || { nb: 31, somme: 133 };   // avis plus anciens que la période : 31 avis, moyenne 4,29
        // Trois concurrents fictifs. La base ne garde que leur identifiant de lieu et un libellé ; « google_demo » joue le rôle de Google
        // (ce que la lecture à la demande renverrait aujourd'hui : nom, note, nombre d'avis), comme n8n/renom-resultats-google.json en service.
        [["Concurrent A", 131, 4.6], ["Concurrent B", 58, 4.1], ["Concurrent C", 29, 4.5]]
          .forEach(([nom, nb, note], o) => { const pid = "demo-concurrent-" + "abc"[o];
            G.concurrents.push({ id: "conc-" + o, commerce_id: er.id, place_id: pid, nom, ordre: o + 1 });
            G.google_demo.push({ type: "concurrent", commerce_id: er.id, place_id: pid, nom, note, nb_avis: nb }); });
        // Score actuel de la fiche (5 piliers notés sur 20), tel que la lecture à la demande le calculerait : jamais gardé mois après mois
        const P = { profil: 17, categories: 15, photos: 16, avis: 15, engagement: 14 };
        const NOMS = { profil: "Complétude du profil", categories: "Catégories et attributs", photos: "Photos", avis: "Avis", engagement: "Signaux d'engagement" };
        G.google_demo.push({ type: "fiche", commerce_id: er.id, piliers: Object.keys(P).map(cle => ({ cle, nom: NOMS[cle], note: P[cle], sur: 20 })) });
        // Thèmes des avis : plus rien de rangé (règle de Google, aucune agrégation conservée) ; calculés à l'ouverture de Résultats (themesDemo).
        // Passages sur la page d'avis et clics vers Google depuis le début du mois
        const d0 = debutMois(mois0()), duree = Math.max(MS_H, maintenant - d0 - MS_H);
        for (let i = 0; i < 46; i++) G.collecte_evenements.push({ commerce_id: er.id, type: "passage", cree_le: iso(d0 + Math.floor(duree * (i + 0.5) / 46)), demo: true });
        for (let i = 0; i < 17; i++) G.collecte_evenements.push({ commerce_id: er.id, type: "clic_google", cree_le: iso(d0 + Math.floor(duree * (i + 0.7) / 17)), demo: true });
        // Actions de fiche Google : une publiée le mois dernier, une à valider (exemples de démonstration)
        const dans12 = new Date(maintenant + 12 * 24 * MS_H).toISOString().slice(0, 10);
        G.actions_fiche.push({ id: "af-demo-1", commerce_id: er.id, type: "photos", donnees: { photos: (prof && prof.photos_fiche) || ["p-velo-pins", "p-fat-bike-foret"] }, statut: "publie", cree_le: iso(debutMois(moisDecale(-1)) + 19 * 24 * MS_H), publie_le: iso(debutMois(moisDecale(-1)) + 20 * 24 * MS_H), demo: true },
          { id: "af-demo-2", commerce_id: er.id, type: "horaires", donnees: { date: dans12, ferme: true }, statut: "a_valider", cree_le: iso(maintenant - 2 * MS_H), publie_le: null, demo: true });
      }
      G.contenus.filter(x => x.statut === "a_valider").forEach(x => emettreJeton(x.commerce_id, "contenu", x.id));
      G.avis.filter(x => x.statut === "a_valider" && !x.sensible).forEach(x => emettreJeton(x.commerce_id, "avis", x.id));
      liste("commentaires").filter(x => x.statut === "a_valider" && x.categorie !== "sensible").forEach(x => emettreJeton(x.commerce_id, "commentaire", x.id));
      completerAutomatisations(G, maintenant, er || null);
      return G;
    }
    // ---- Mesures (démonstration) : calculées à partir des avis, des relevés et des événements, jamais tirées au hasard
    const KC = K + ":collecte"; let collecteMem = [];
    try { if (/[?&]reset\b/.test(location.search + location.hash)) localStorage.removeItem(KC); } catch (e) {}
    const lireCollecte = () => { try { const l = JSON.parse(localStorage.getItem(KC)); collecteMem = Array.isArray(l) ? l : []; } catch (e) {} return collecteMem; };
    // Ce que la lecture de Google à la demande renverrait : l'historique fictif, plus les avis de la table (ceux effacés par RENOM à 30 jours restent
    // chez Google : leur copie « google » est rangée dans l'historique fictif au moment de l'effacement, voir conserver()).
    const avisTous = c => [...liste("avis_historique").filter(x => x.commerce_id === c.id), ...E.avis.filter(x => x.commerce_id === c.id && !x.efface_le)];
    function etatAvis(c, t) {
      const b = (E.bases || {})[c.id], l = avisTous(c).filter(a => a.note && new Date(a.cree_le).getTime() < t);
      if (!b && !l.length) return { note: null, nb_avis: null };
      const nb = (b ? b.nb : 0) + l.length, s = (b ? b.somme : 0) + l.reduce((x, a) => x + a.note, 0);
      return { note: Math.round(s / nb * 10) / 10, nb_avis: nb };
    }
    const moyenneH = l => l.length ? Math.round(l.reduce((s, a) => s + (new Date(a.repondu_le) - new Date(a.cree_le)) / MS_H, 0) / l.length * 10) / 10 : null;
    const publiees = (c, m) => E.publications.filter(p => p.commerce_id === c.id && p.statut === "publie" && dans(p.prevu_le, m)).length;
    function mesureCollecte(c) {
      const m = mois0(), ev = [...liste("collecte_evenements"), ...lireCollecte()].filter(x => x.commerce_id === c.id && dans(x.cree_le, m));
      const avant = etatAvis(c, debutMois(m)).nb_avis, apres = etatAvis(c, Date.now() + 1).nb_avis;
      return { passages: ev.filter(x => x.type === "passage").length, clics_google: ev.filter(x => x.type === "clic_google").length,
        retours_prives: lireRetours().filter(x => x.commerce_id === c.id && dans(x.cree_le, m)).length, nouveaux_avis: apres == null ? 0 : apres - (avant || 0) };
    }
    // ---- Conservation (démonstration) : même règle que la base (effacer_contenus_expires) : au-delà de 30 jours, texte, note et auteur d'un avis,
    // texte et auteur d'un commentaire sont effacés ; l'identifiant, notre réponse et nos dates restent. La copie « Google » d'un avis effacé rejoint
    // l'historique fictif (en service, Google garde l'avis : seul RENOM l'oublie).
    function conserver() {
      if (!E) return; const limite = Date.now() - VIDEO_AVIS.AGE_MAX_JOURS * 86400000, maintenant = iso(Date.now()); let n = 0;
      (E.avis || []).forEach(a => { if (a.efface_le || Date.parse(a.cree_le) >= limite) return;
        if (a.note) liste("avis_historique").push({ id: "g-" + a.id, commerce_id: a.commerce_id, note: a.note, cree_le: a.cree_le, repondu_le: a.repondu_le || null, demo: true });
        a.texte = null; a.note = null; a.auteur = null; a.efface_le = maintenant; n++; jour(a.commerce_id, "AVIS_EFFACES_30_JOURS", { nombre: 1 }); });
      liste("commentaires").forEach(x => { if (x.efface_le || Date.parse(x.cree_le) >= limite) return; x.texte = null; x.auteur = null; x.efface_le = maintenant; n++; });
      if (n) sauver();
    }
    // ---- Thèmes des avis (démonstration) : calculés à l'ouverture de Résultats sur les avis présents (30 jours au plus, non sensibles), jamais rangés.
    // FAUX service : un repérage par mots, pas Claude. En service, n8n/renom-resultats-google.json envoie ces avis à Claude (moteur/resultats/themes.js),
    // avec la même règle : un thème doit revenir dans au moins deux avis.
    const FAMILLES = [["L'accueil et le service", /accueil|explication|souri|sympa|gentil|serveu|equipe|service/], ["Le matériel", /velo|materiel|batterie|en bon etat|recent|regle/],
      ["Le parcours et les paysages", /balade|parcours|foret|paysage|\bmer\b|sortie|vue/], ["L'attente", /attente|attendu|retard/], ["Les plats", /plat|pates|cuisine|dessert|entree|assiette|saveur|mijot/],
      ["L'ambiance", /ambiance|cadre|decor|terrasse|calme|bruit/], ["Les prix", /prix|cher|tarif|addition/]];
    function themesDemo(c) {
      const plat = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const avis = E.avis.filter(a => a.commerce_id === c.id && !a.efface_le && !a.sensible && (a.texte || "").trim() && Date.now() - Date.parse(a.cree_le) <= VIDEO_AVIS.AGE_MAX_JOURS * 86400000);
      if (avis.length < 2) return { themes: [], statut: "insuffisants", analyses: avis.length };
      const themes = FAMILLES.map(([theme, re]) => { const l = avis.filter(a => re.test(plat(a.texte))); return { theme, positif: l.filter(a => a.note >= 4).length, negatif: l.filter(a => a.note < 4).length }; })
        .filter(t => t.positif + t.negatif >= 2).sort((a, b) => (b.positif + b.negatif) - (a.positif + a.negatif)).slice(0, 5);
      return { themes, statut: "calcules", analyses: avis.length };
    }
    const majDemo = {
      async resultats(n) {
        await init(); const c = cur(); n = Math.max(1, Math.min(12, +n || 6));
        const L = Array.from({ length: n }, (_, i) => moisDecale(i - n + 1)), tous = avisTous(c), maintenant = Date.now();
        const mois = L.map(m => { const st = etatAvis(c, Math.min(finMois(m), maintenant + 1)), recus = tous.filter(a => dans(a.cree_le, m));
          return { mois: m, note: st.note, nb_avis: st.nb_avis, avis_recus: recus.length, reponses: tous.filter(a => a.repondu_le && dans(a.repondu_le, m)).length,
            delai_moyen_h: moyenneH(recus.filter(a => a.repondu_le)), publications: publiees(c, m) }; });
        const periode = tous.filter(a => new Date(a.cree_le).getTime() >= debutMois(L[0])), repondus = periode.filter(a => a.repondu_le);
        // Comme en service : l'historique de la fiche est recalculé depuis les avis présents, les concurrents et le score n'ont que l'état du jour.
        const gd = liste("google_demo").filter(x => x.commerce_id === c.id), fiche = gd.find(x => x.type === "fiche"), m1 = mois0();
        const conc = liste("concurrents").filter(x => x.commerce_id === c.id).sort((a, b) => a.ordre - b.ordre).map(x => { const g = gd.find(y => y.type === "concurrent" && y.place_id === x.place_id);
          return { nom: (g && g.nom) || x.nom, mois: [{ mois: m1, note: g ? g.note : null, nb_avis: g ? g.nb_avis : null }] }; });
        const th = themesDemo(c);
        const lue = mois.some(m => m.note != null);
        return { mois, reponses: { taux: periode.length ? Math.round(repondus.length / periode.length * 100) : null, delai_moyen_h: moyenneH(repondus) },
          audit: fiche ? [{ mois: m1, score: fiche.piliers.reduce((s, x) => s + x.note, 0), piliers: fiche.piliers }] : [], concurrents: conc, themes: th.themes,
          collecte: mesureCollecte(c), portee: null,
          lecture_google: { le: iso(maintenant), statut: "ok", fiche: lue ? "lue" : "non_reliee", concurrents: conc.length ? "lus" : "aucun", score: fiche ? "calcule" : "non_reliee", historique_reconstitue: lue && n > 1,
            themes: th.statut, themes_avis: th.analyses, demo: true } };
      },
      async bilanMois() {
        await init(); const c = cur(), m = mois0(), debut = etatAvis(c, debutMois(m)), fin = etatAvis(c, Date.now() + 1);
        return { mois: m, reponses_publiees: avisTous(c).filter(a => a.repondu_le && dans(a.repondu_le, m)).length, publications: publiees(c, m), note_debut: debut.note, note_fin: fin.note,
          avis_obtenus: avisTous(c).filter(a => dans(a.cree_le, m)).length, a_valider: mine("contenus").filter(x => x.statut === "a_valider").length + mine("avis").filter(x => x.statut === "a_valider" && !x.sensible).length
          + liste("commentaires").filter(x => x.commerce_id === c.id && x.statut === "a_valider").length };
      },
      async modifierLegende(id, reseau, texte) {
        await init(); const ct = mine("contenus").find(x => x.id === id); if (!ct) throw new Error("Contenu introuvable.");
        if (!["a_valider", "approuve"].includes(ct.statut)) throw new Error("Seul un contenu à valider ou approuvé se modifie.");
        if (!reseauxPour(ct).includes(reseau)) throw new Error("Ce format ne se publie pas sur la fiche Google.");
        const t = controlerLegende(reseau, texte); ct.legendes = Object.assign({}, ct.legendes || {}, { [reseau]: t });
        jour(cur().id, "LEGENDE_MODIFIEE", { contenu: id, reseau }); sauver();
      },
      async programmerAuto(id, reseaux) {
        await init(); const c = cur(); pasEnPause(c); const ct = mine("contenus").find(x => x.id === id);
        if (!ct || ct.statut !== "approuve") throw new Error(REGLES.programme);
        reseaux = (reseaux || []).filter(r => RESEAUX.includes(r)); if (!reseaux.length) throw new Error("Choisissez au moins un réseau.");
        for (const r of reseaux) { if ((E.comptes[c.id][r] || {}).etat !== "connecte") throw new Error("Réseau non connecté : " + r + "."); if (!reseauxPour(ct).includes(r)) throw new Error("Une vidéo ou une story ne se programme pas sur la fiche Google."); }
        const pris = mine("publications").filter(p => ["programme", "envoye", "publie"].includes(p.statut)).map(p => new Date(p.prevu_le).getTime());
        const t = iso(prochainCreneau(c.metier, pris));
        E.publications.push({ id: uid(), commerce_id: c.id, contenu_id: id, reseaux, prevu_le: t, statut: "programme", auto: true, cree_le: iso(Date.now()) });
        ct.statut = "programme"; jour(c.id, "PROGRAMME", { contenu: id, reseaux, auto: true }); sauver(); return t;
      },
      async actionsFiche() { await init(); return mine("actions_fiche").sort((a, b) => b.cree_le.localeCompare(a.cree_le)); },
      async creerActionFiche(type, donnees) {
        await init(); const c = cur(); pasEnPause(c); const d = controlerAction(type, donnees);
        if (type === "photos" && d.photos.some(id => !mine("photos").some(p => p.id === id))) throw new Error("Photo introuvable.");
        const a = { id: uid(), commerce_id: c.id, type, donnees: d, statut: "a_valider", cree_le: iso(Date.now()), publie_le: null }; liste("actions_fiche").unshift(a);
        jour(c.id, "ACTION_FICHE", { type }); sauver(); return a.id;
      },
      async validerActionFiche(id, decision) {
        await init(); const a = mine("actions_fiche").find(x => x.id === id); if (!a) throw new Error("Action introuvable.");
        if (a.statut !== "a_valider") throw new Error("Cette action est déjà traitée."); if (!["approuve", "refuse"].includes(decision)) throw new Error("Décision refusée.");
        a.statut = decision === "approuve" ? "a_publier" : "refuse"; jour(cur().id, decision === "approuve" ? "ACTION_FICHE_VALIDEE" : "ACTION_FICHE_REFUSEE", { type: a.type }); sauver();
      },
      async enregistrerDemarrage(rep) { await init(); const c = cur(); c.demarrage = controlerDemarrage(rep); c.demarrage_fini = true; jour(c.id, "DEMARRAGE", {}); sauver(); },
      // ---- publiques (pages avis.html et valider.html)
      async compterCollecte(jeton, type, canal) {
        await init(); const c = parJeton(String(jeton || "")); if (!c || !TYPES_COLLECTE.includes(type)) return;
        if (canal && canal.source === "email") return compterEmailDemo(c, type, canal.envoi);
        const l = lireCollecte(); if (l.filter(x => x.commerce_id === c.id && Date.now() - new Date(x.cree_le).getTime() < MS_H).length >= 300) return;   // limite de fréquence
        l.push({ commerce_id: c.id, type, cree_le: iso(Date.now()) }); collecteMem = l; try { localStorage.setItem(KC, JSON.stringify(l)); } catch (e) {}
      },
      async objetParJeton(jeton) {
        await init(); const r = lireJeton(jeton); if (r.etat === "inconnu") return null;
        if (r.etat !== "a_valider") return { etat: r.etat, objet: r.j.objet, langue: (E.commerces[r.j.commerce_id] || {}).langue || "fr" };
        const { o, c, j } = r, base = { etat: "a_valider", objet: j.objet, commerce: c.nom, expire_le: j.expire_le, langue: c.langue || "fr" };
        if (j.objet === "commentaire") return { ...base, reseau: o.reseau, categorie: o.categorie, texte: o.texte || "", auteur: o.auteur || "", reponse_proposee: o.reponse_proposee || "", recu_le: o.cree_le };
        return j.objet === "contenu" ? { ...base, type: o.type, format: formatDe(o), legende: o.legende || "", legendes: o.legendes || null, visuel_url: o.visuel_url || null, video_url: o.video_url || null }
          : { ...base, note: o.note, texte: o.texte || "", auteur: o.auteur || "", reponse_proposee: o.reponse_proposee || "" };
      },
      async validerParJeton(jeton, decision, texte) {
        await init(); const r = lireJeton(jeton);
        if (r.etat === "inconnu") throw new Error("Ce lien n'est pas reconnu."); if (r.etat === "utilise") throw new Error("Ce lien a déjà servi.");
        if (r.etat === "expire") throw new Error("Ce lien a expiré."); if (r.etat === "traite") throw new Error("Cet élément a déjà été traité dans votre espace.");
        const { o, j } = r;
        if (j.objet === "contenu") {
          if (!["approuve", "modification", "refuse"].includes(decision)) throw new Error("Décision refusée.");
          if (decision === "modification" && !String(texte || "").trim()) throw new Error("Écrivez un mot pour dire ce qu'il faut modifier.");
          o.statut = decision; o.note_modification = decision === "modification" ? String(texte).trim() : null; o.decide_le = iso(Date.now());
        } else if (j.objet === "commentaire") {
          appliquerDecisionCommentaire(o, decision, texte);
        } else {
          if (!["valide", "refuse"].includes(decision)) throw new Error("Décision refusée.");
          if (decision === "valide") { const t = String(texte ?? o.reponse_proposee ?? "").trim(); if (!t) throw new Error("Réponse vide."); o.reponse_proposee = t; }
          o.statut = decision;
        }
        j.utilise_le = iso(Date.now()); jour(j.commerce_id, ({ contenu: "CONTENU_", commentaire: "COMMENTAIRE_" }[j.objet] || "AVIS_") + decision.toUpperCase(), { par_lien: true }); sauver();
      },
    };

    // =========================================================== Automatisations de service (démonstration)
    const HEURE = 3600000, JOUR_MS = 86400000;
    const jourIso = t => { const p = partiesParis(t); return `${p.a}-${String(p.m + 1).padStart(2, "0")}-${String(p.j).padStart(2, "0")}`; };
    const ecartJours = (a, b) => Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / JOUR_MS);
    const plusJours = (d, n) => new Date(Date.parse(d + "T00:00:00Z") + n * JOUR_MS).toISOString().slice(0, 10);
    const a9h = d => { const [a, m, j] = d.split("-").map(Number); return instantParis(a, m - 1, j, 9, 0); };
    const nouvelleDemande = (cid, cl, etape, t) => ({ id: uid(), commerce_id: cid, client_id: cl.id, email: cl.email, prenom: cl.prenom, etape, prevu_le: iso(t), statut: "a_envoyer", motif: null,
      jeton: nouveauJeton(), envoye_le: null, ouvert_le: null, clic_le: null, cree_le: iso(Date.now()) });
    const ORDRE_POINTS = AUTO.POINTS.map(x => x.point);
    const tableMR = () => (E.mise_en_route = E.mise_en_route && !Array.isArray(E.mise_en_route) ? E.mise_en_route : {});   // {commerce: {point: état}}
    // Même logique que les déclencheurs SQL : Google connecté, Facebook ou Instagram connecté (Metricool), démarrage fini.
    function etatMiseEnRoute(cid) {
      const m = tableMR(), k = E.comptes[cid] || {}, c = E.commerces[cid] || {}, co = r => (k[r] || {}).etat === "connecte";
      const e = (m[cid] = m[cid] || { compte: "a_faire", google: "a_faire", metricool: "a_faire", demarrage: "a_faire" });
      if (co("google")) e.google = "fait"; if (co("facebook") || co("instagram")) e.metricool = "fait"; if (c.demarrage_fini) e.demarrage = "fait";
      const points = ORDRE_POINTS.map(point => ({ point, etat: e[point] }));
      return { faits: points.filter(x => x.etat === "fait").length, total: 4, points };
    }
    function santeDemo(c) {
      const now = Date.now(), age = ecartJours(aujourdhui(), jourIso(Date.parse(c.cree_le || iso(now)))), rouge = [], orange = [];
      const ph = E.photos.filter(x => x.commerce_id === c.id).map(x => Date.parse(x.cree_le)), derniere = ph.length ? Math.max(...ph) : -Infinity;
      const dc = E.contenus.filter(x => x.commerce_id === c.id && x.decide_le).map(x => Date.parse(x.decide_le)), decision = dc.length ? Math.max(...dc) : -Infinity;
      let n = E.avis.filter(a => a.commerce_id === c.id && a.sensible && a.statut === "humain" && now - Date.parse(a.cree_le) > 48 * HEURE).length;
      if (n) rouge.push(`${n} ${n > 1 ? "avis graves attendent" : "avis grave attend"} une réponse humaine depuis plus de 48 h`);
      const inactif = age > 14 && derniere < now - 14 * JOUR_MS && decision < now - 14 * JOUR_MS; if (inactif) rouge.push("rien déposé ni validé depuis 14 jours");
      n = E.publications.filter(p => p.commerce_id === c.id && p.statut === "echec" && Date.parse(p.prevu_le) > now - 14 * JOUR_MS).length;
      if (n) rouge.push(`${n} ${n > 1 ? "publications en échec" : "publication en échec"}`);
      const mr = etatMiseEnRoute(c.id), reste = mr.total - mr.faits;
      if (reste && age >= 5) rouge.push(`mise en route pas finie après ${age} jours (${mr.faits} sur 4)`); else if (reste) orange.push(`mise en route en cours (${mr.faits} sur 4)`);
      if (c.en_pause) orange.push("en pause");
      if (age > 10 && !inactif && derniere < now - 10 * JOUR_MS) orange.push("aucune photo depuis 10 jours");
      n = E.contenus.filter(x => x.commerce_id === c.id && x.statut === "a_valider" && now - Date.parse(x.cree_le) > 48 * HEURE).length
        + E.avis.filter(a => a.commerce_id === c.id && a.statut === "a_valider" && !a.sensible && now - Date.parse(a.cree_le) > 48 * HEURE).length
        + liste("commentaires").filter(x => x.commerce_id === c.id && x.statut === "a_valider" && now - Date.parse(x.cree_le) > 48 * HEURE).length;
      if (n) orange.push(`${n} ${n > 1 ? "éléments attendent" : "élément attend"} une validation depuis plus de 48 h`);
      if (usage(c) >= OFFRES[c.offre_id].publications) orange.push("plafond de publications atteint ce mois-ci");
      n = RESEAUX.filter(r => ((E.comptes[c.id] || {})[r] || {}).etat === "erreur").length; if (n) orange.push(`${n} ${n > 1 ? "réseaux en erreur" : "réseau en erreur"}`);
      const cm = liste("commentaires").filter(x => x.commerce_id === c.id);
      n = cm.filter(x => x.categorie === "sensible" && x.statut === "humain" && now - Date.parse(x.cree_le) > 48 * HEURE).length; if (n) orange.push(`${n} ${n > 1 ? "commentaires sensibles attendent" : "commentaire sensible attend"} le commerçant depuis plus de 48 h`);

      return { commerce_id: c.id, nom: c.nom, niveau: rouge.length ? "rouge" : orange.length ? "orange" : "vert", raisons: [...rouge, ...orange], mise_en_route: mr };
    }
    function compterEmailDemo(c, type, envoi) {
      const d = liste("demandes_avis").find(x => x.jeton === envoi && x.commerce_id === c.id && x.statut === "envoye"); if (!d) return;
      const l = lireCollecte(); if (l.filter(x => x.commerce_id === c.id && Date.now() - new Date(x.cree_le).getTime() < HEURE).length >= 300) return;
      l.push({ commerce_id: c.id, type, source: "email", cree_le: iso(Date.now()) }); collecteMem = l; try { localStorage.setItem(KC, JSON.stringify(l)); } catch (e) {}
      d.ouvert_le = d.ouvert_le || iso(Date.now()); if (type === "clic_google") d.clic_le = d.clic_le || iso(Date.now()); sauver();
    }
    // Graine : clients, demandes, mise en route, idée de la semaine, prospects, alertes. Tout est fictif et marqué « demo ».
    function completerAutomatisations(G, maintenant, principal) {
      if (G.automatisations_v) return; G.automatisations_v = 1; E = G;
      ["clients_commerce", "demandes_avis", "oppositions", "prospects", "alertes_exploitant"].forEach(liste);
      Object.values(G.commerces).forEach(c => {
        if (c.cree_il_y_a_h != null) { c.cree_le = iso(maintenant - c.cree_il_y_a_h * HEURE); delete c.cree_il_y_a_h; }
        if (!c.cree_le) c.cree_le = iso(maintenant - (principal && c.id === principal.id ? 120 : 30) * 24 * HEURE);
        etatMiseEnRoute(c.id); if (principal && c.id === principal.id) tableMR()[c.id].compte = "fait";
      });
      G.contenus.forEach(x => { if (x.statut !== "a_valider" && !x.decide_le) x.decide_le = iso(new Date(x.cree_le).getTime() + 3 * HEURE); });
      if (!principal) return;
      // Clients importés il y a 1 à 16 jours, avec leurs demandes, comme si le service du jour était passé chaque matin.
      if (!G.clients_commerce.some(x => x.commerce_id === principal.id)) {
        const P = ["Camille", "Hugo", "Inès", "Léo", "Manon", "Nathan", "Chloé", "Louis", "Emma", "Jules", "Sarah", "Tom", "Lina", "Adam"], auj = jourIso(maintenant), ev = liste("collecte_evenements");
        P.forEach((prenom, i) => {
          const passage = plusJours(auj, -(1 + i)), cl = { id: "cl-" + i, commerce_id: principal.id, prenom, email: prenom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() + "." + (i + 1) + "@client-exemple.invalid",
            date_passage: passage, consentement: true, importe_le: iso(a9h(passage) - 2 * HEURE), demo: true };
          G.clients_commerce.push(cl);
          const d = Object.assign(nouvelleDemande(principal.id, cl, "demande", a9h(plusJours(passage, 1))), { demo: true }), r = Object.assign(nouvelleDemande(principal.id, cl, "relance", a9h(plusJours(passage, 5))), { demo: true });
          if (Date.parse(d.prevu_le) <= maintenant) {
            d.statut = "envoye"; d.envoye_le = iso(Date.parse(d.prevu_le) + 5 * 60000);
            if (i % 3 !== 2) { d.ouvert_le = iso(Date.parse(d.envoye_le) + (2 + i % 4) * HEURE); ev.push({ commerce_id: principal.id, type: "passage", source: "email", cree_le: d.ouvert_le, demo: true }); }
            if (i % 3 === 0) { d.clic_le = iso(Date.parse(d.ouvert_le) + 60000); ev.push({ commerce_id: principal.id, type: "clic_google", source: "email", cree_le: d.clic_le, demo: true }); }
            if (prenom === "Tom") { G.oppositions.push({ commerce_id: principal.id, email: cl.email, motif: "lien_email", cree_le: iso(Date.parse(d.envoye_le) + HEURE), demo: true }); r.statut = "annule"; r.motif = "désinscription"; }
            else if (Date.parse(r.prevu_le) <= maintenant) {
              if (d.ouvert_le) { r.statut = "annule"; r.motif = "page d'avis déjà ouverte"; }
              else { r.statut = "envoye"; r.envoye_le = iso(Date.parse(r.prevu_le) + 5 * 60000); if (i % 2) { r.ouvert_le = iso(Date.parse(r.envoye_le) + 3 * HEURE); ev.push({ commerce_id: principal.id, type: "passage", source: "email", cree_le: r.ouvert_le, demo: true }); } }
            }
          }
          G.demandes_avis.push(d, r);
        });
      }
      // Console : prospects de la page de vente et alertes de l'exploitant (fictifs) si la graine n'en donne pas
      if (!G.prospects.length) G.prospects.push(
        { id: "pr-1", email: "contact@boulangerie-exemple.invalid", commerce: "Boulangerie d'exemple", ville: "", metier: "autre", audit_il_y_a_h: 40, rapport_envoye_il_y_a_h: 40, relances: 0, demo: true },
        { id: "pr-2", email: "bonjour@coiffure-exemple.invalid", commerce: "Coiffure d'exemple", ville: "", metier: "beaute", audit_il_y_a_h: 150, rapport_envoye_il_y_a_h: 150, relances: 2, derniere_relance_il_y_a_h: 30, demo: true },
        { id: "pr-3", email: "studio@sport-exemple.invalid", commerce: "Studio d'exemple", ville: "", metier: "sport", audit_il_y_a_h: 80, rapport_envoye_il_y_a_h: 80, relances: 1, rdv_il_y_a_h: 20, demo: true },
        { id: "pr-4", email: "fleurs@fleuriste-exemple.invalid", commerce: "Fleuriste d'exemple", ville: "", metier: "autre", audit_il_y_a_h: 30, rapport_envoye_il_y_a_h: null, relances: 0, demo: true });
      G.prospects.forEach(x => { [["audit", "audit_le"], ["rapport_envoye", "rapport_envoye_le"], ["rdv", "rdv_le"], ["repondu", "repondu_le"], ["desinscrit", "desinscrit_le"], ["derniere_relance", "derniere_relance_le"]].forEach(([k, c]) => {
        const h = x[k + "_il_y_a_h"]; if (h !== undefined) { x[c] = h == null ? null : iso(maintenant - h * HEURE); delete x[k + "_il_y_a_h"]; } }); x.jeton = x.jeton || nouveauJeton(); });
      if (!G.alertes_exploitant.length) G.alertes_exploitant.push(
        { id: "al-1", type: "PHOTOS_EMAIL_REFUSEES", commerce_id: null, detail: { statut: "inconnu", raison: "adresse inconnue", pieces: 2 }, cree_le: iso(maintenant - 20 * HEURE), demo: true },
        { id: "al-2", type: "ERREUR_WORKFLOW", commerce_id: null, detail: { workflow: "RENOM, service du jour", noeud: "Envoyer", message: "Exemple de démonstration : connexion au serveur d'envoi refusée." }, cree_le: iso(maintenant - 70 * HEURE), demo: true });
    }
    // Idée de la semaine du commerce principal : calculée par le même code que le workflow du lundi (calendrier versionné), sans météo
    // (option désactivée par défaut). Une par semaine : une démonstration ouverte la semaine suivante reçoit la nouvelle.
    function assurerIdeeSemaine() {
      if (!TF || !E) return; const pr = E.demo_maj ? E.commerces[E.demo_maj.principal] : (() => { const u = Object.values(E.users).find(x => x.commerce); return u && E.commerces[u.commerce]; })();
      if (!pr) return; const maintenant = Date.now(), lundi = lundiDeParis(new Date(maintenant));
      if (liste("idees").some(x => x.commerce_id === pr.id && x.semaine === lundi)) return;
      const x = ideeDeLaSemaine(TF, pr, lundi, null, pr.ville);
      E.idees.unshift({ id: "idee-semaine-" + lundi, commerce_id: pr.id, titre: x.titre, texte: x.texte, origine: x.origine, statut: "a_valider", semaine: lundi, motif: x.motif,
        cree_le: iso(Math.min(maintenant - HEURE, instantParis(+lundi.slice(0, 4), +lundi.slice(5, 7) - 1, +lundi.slice(8, 10), 7, 0))), demo: true });
      sauver();
    }
    const autoDemo = {
      emailPhotos() { return cfg.emailPhotos ? { adresse: cfg.emailPhotos, demo: false } : { adresse: "photos@renom.example", demo: true }; },
      async importerClients(lignes, consentement) {
        await init(); const c = cur(); pasEnPause(c);
        if (consentement !== true) throw new Error("Cochez la case qui confirme que chaque client de ce fichier a accepté de recevoir cette demande par email.");
        if (!lienAvisPublic(c)) throw new Error("Ajoutez d'abord votre lien d'avis Google dans votre fiche : la demande y renvoie.");
        if (!Array.isArray(lignes) || !lignes.length || lignes.length > AUTO.MAX_CLIENTS) throw new Error("Le fichier doit contenir de 1 à " + AUTO.MAX_CLIENTS + " clients.");
        const auj = aujourdhui(), D_ = liste("demandes_avis"), ign = []; let n = 0;
        lignes.forEach((x, k) => {
          const p = String((x && x.prenom) || "").trim(), em = String((x && x.email) || "").trim().toLowerCase(), d = String((x && x.date_passage) || "");
          const raison = !p || longueur(p) > 60 ? "prénom manquant ou trop long" : !emailValide(em) ? "adresse email invalide" : !dateValide(d) ? "date de passage invalide"
            : d > auj ? "date de passage dans le futur" : ecartJours(auj, d) > AUTO.PASSAGE_MAX_JOURS ? "passage de plus de 14 jours : la demande arriverait trop tard"
            : liste("oppositions").some(o => o.commerce_id === c.id && o.email === em) ? "cette personne a demandé à ne plus recevoir de demande"
            : D_.some(a => a.commerce_id === c.id && a.email === em && a.etape === "demande" && (["a_envoyer", "en_cours"].includes(a.statut) || (a.statut === "envoye" && Date.now() - Date.parse(a.envoye_le) < AUTO.ECART_JOURS * JOUR_MS)))
              ? "déjà sollicitée il y a moins de 90 jours" : null;
          if (raison) { ign.push({ ligne: k + 1, raison }); return; }
          const cl = { id: uid(), commerce_id: c.id, prenom: p, email: em, date_passage: d, consentement: true, importe_le: iso(Date.now()) }; liste("clients_commerce").push(cl);
          const t1 = Math.max(a9h(plusJours(d, 1)), Date.now()), t2 = Math.max(a9h(plusJours(d, 5)), a9h(plusJours(jourIso(t1), 4)));
          D_.push(nouvelleDemande(c.id, cl, "demande", t1), nouvelleDemande(c.id, cl, "relance", t2)); n++;
        });
        jour(c.id, "CLIENTS_IMPORTES", { importes: n, ignores: ign.length }); sauver(); return { importes: n, ignores: ign };
      },
      async demandesAvis() {
        await init(); const c = cur(), t0 = Date.now() - 30 * JOUR_MS, l = liste("demandes_avis").filter(x => x.commerce_id === c.id), dans30 = x => x.envoye_le && Date.parse(x.envoye_le) >= t0;
        const ev = [...liste("collecte_evenements"), ...lireCollecte()].filter(x => x.commerce_id === c.id && x.source === "email" && Date.parse(x.cree_le) >= t0);
        return { periode_jours: 30, clients: liste("clients_commerce").filter(x => x.commerce_id === c.id).length, a_venir: l.filter(x => ["a_envoyer", "en_cours"].includes(x.statut)).length,
          envois: l.filter(x => x.etape === "demande" && x.statut === "envoye" && dans30(x)).length, relances: l.filter(x => x.etape === "relance" && x.statut === "envoye" && dans30(x)).length,
          ouvertures: ev.filter(x => x.type === "passage").length, clics_google: ev.filter(x => x.type === "clic_google").length, oppositions: liste("oppositions").filter(x => x.commerce_id === c.id).length,
          dernieres: l.slice().sort((a, b) => b.prevu_le.localeCompare(a.prevu_le)).slice(0, 20).map(x => ({ prenom: x.prenom, etape: x.etape, statut: x.statut, motif: x.motif, prevu_le: x.prevu_le, envoye_le: x.envoye_le, ouverte: !!(x.ouvert_le || x.clic_le) })) };
      },
      async ajouterOpposition(email) {
        await init(); const c = cur(), em = String(email || "").trim().toLowerCase(); if (!emailValide(em)) throw new Error("Adresse email invalide.");
        if (!liste("oppositions").some(o => o.commerce_id === c.id && o.email === em)) E.oppositions.push({ commerce_id: c.id, email: em, motif: "commercant", cree_le: iso(Date.now()) });
        liste("demandes_avis").forEach(x => { if (x.commerce_id === c.id && x.email === em && x.statut === "a_envoyer") { x.statut = "annule"; x.motif = "opposition"; } });
        jour(c.id, "OPPOSITION_AJOUTEE", {}); sauver();
      },
      async miseEnRoute() { await init(); const c = cur(); etatMiseEnRoute(c.id); tableMR()[c.id].compte = "fait"; sauver(); return etatMiseEnRoute(c.id); },
      async declarerMiseEnRoute(point) {
        await init(); const c = cur(); if (!["google", "metricool"].includes(point)) throw new Error("Seuls l'accès Google et la connexion Metricool se déclarent ici.");
        etatMiseEnRoute(c.id); const e = tableMR()[c.id]; if (e[point] === "a_faire") e[point] = "declare"; jour(c.id, "MISE_EN_ROUTE_DECLAREE", { point }); sauver(); return etatMiseEnRoute(c.id);
      },
      async deciderIdee(id, decision) {
        await init(); const x = mine("idees").find(i => i.id === id); if (!x) throw new Error("Idée introuvable.");
        if (x.statut !== "a_valider") throw new Error("Cette idée est déjà traitée."); if (!["retenue", "ecartee"].includes(decision)) throw new Error("Décision inconnue : retenir ou écarter.");
        x.statut = decision; jour(cur().id, "IDEE_" + decision.toUpperCase(), { idee: id }); sauver();
      },
      // ---- publiques (desinscription.html)
      async desinscriptionInfo(jeton) {
        await init(); const j = String(jeton || ""), d = liste("demandes_avis").find(x => x.jeton === j);
        if (d) return { objet: "demande_avis", emetteur: (E.commerces[d.commerce_id] || {}).nom, langue: (E.commerces[d.commerce_id] || {}).langue || "fr", fait: liste("oppositions").some(o => o.commerce_id === d.commerce_id && o.email === d.email) };
        const p = liste("prospects").find(x => x.jeton === j); if (p) return { objet: "prospect", emetteur: "RENOM", fait: !!p.desinscrit_le };
        throw new Error("Ce lien n'est pas reconnu.");
      },
      async seDesinscrire(jeton) {
        await init(); const j = String(jeton || ""), d = liste("demandes_avis").find(x => x.jeton === j);
        if (d) { if (!E.oppositions.some(o => o.commerce_id === d.commerce_id && o.email === d.email)) E.oppositions.push({ commerce_id: d.commerce_id, email: d.email, motif: "lien_email", cree_le: iso(Date.now()) });
          E.demandes_avis.forEach(x => { if (x.commerce_id === d.commerce_id && x.email === d.email && x.statut === "a_envoyer") { x.statut = "annule"; x.motif = "désinscription"; } });
          jour(d.commerce_id, "DESINSCRIPTION", {}); sauver(); return autoDemo.desinscriptionInfo(j); }
        const p = liste("prospects").find(x => x.jeton === j); if (p) { p.desinscrit_le = p.desinscrit_le || iso(Date.now()); sauver(); return autoDemo.desinscriptionInfo(j); }
        throw new Error("Ce lien n'est pas reconnu.");
      },
      // ---- console
      async adminSante() { await init(); admin(); return Object.values(E.commerces).map(santeDemo).sort((a, b) => a.nom.localeCompare(b.nom)); },
      async adminProspects() { await init(); admin(); return liste("prospects").slice().sort((a, b) => (b.audit_le || "").localeCompare(a.audit_le || "")); },
      async adminProspect(id, action) {
        await init(); admin(); const p = liste("prospects").find(x => x.id === id), k = { rdv: "rdv_le", reponse: "repondu_le", arreter: "desinscrit_le", rapport_envoye: "rapport_envoye_le" }[action];
        if (!p || !k) throw new Error("Prospect ou action inconnus."); p[k] = p[k] || iso(Date.now()); sauver();
      },
      async adminMiseEnRoute(cid, point, etat) {
        await init(); admin(); if (!["a_faire", "declare", "fait"].includes(etat) || !ORDRE_POINTS.includes(point)) throw new Error("Point ou état inconnu.");
        etatMiseEnRoute(cid); tableMR()[cid][point] = etat; jour(cid, "MISE_EN_ROUTE", { point, etat }); sauver(); return etatMiseEnRoute(cid);
      },
    };

    return {
      mode: "demo",
      async session() { await init(); return session ? { email: session, role: E.users[session].role } : null; },
      async envoyerLien(e) { await init(); e = e.trim().toLowerCase(); if (!E.users[e]) throw new Error("En démonstration : " + listeComptes() + "."); return { lien: e }; },
      // Comptes de la graine chargée, pour l'écran de connexion (aucune adresse écrite en dur dans les écrans)
      async comptesDemo() { await init(); return Object.entries(E.users).map(([email, u]) => ({ email, role: u.role, commerce: u.commerce ? (E.commerces[u.commerce] || {}).nom || "" : "" })); },
      async ouvrirLien(e) { await init(); session = e; try { localStorage.setItem(K + ":session", e); } catch (x) {} },
      async quitter() { session = null; try { localStorage.removeItem(K + ":session"); } catch (x) {} },
      async estAdmin() { await init(); return !!session && E.users[session].role === "administrateur"; },
      async commerce() { await init(); return cur(); },
      async enregistrer(ch) { await init(); const c = cur(); FICHE.forEach(k => { if (k in ch) c[k] = ch[k]; }); sauver(); },
      async photos() { await init(); return mine("photos").sort((a, b) => b.cree_le.localeCompare(a.cree_le)); },
      async deposer(f) {
        await init(); const e = verifierFichier(f); if (e) throw new Error(e); const c = cur(); pasEnPause(c);
        const url = f.size < 1.5e6 ? await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); }) : null;
        const p = { id: uid(), commerce_id: c.id, nom_fichier: f.name, statut: "a_traiter", cree_le: new Date().toISOString(), url };
        E.photos.unshift(p); sauver();
        setTimeout(() => { if (p.statut === "a_traiter") { faux.creation(p); sauver(); } }, 1200);   // faux n8n + faux rendu
        if (!c.marque && url) proposerKitDemo(c, url).catch(() => {});   // premières photos : le kit de marque est proposé (comme le moteur)
      },
      // ---- Kit de marque (écran « Votre style ») : mêmes règles que le moteur et la base (espace/web/marque.js, fonction SQL marque_fautes)
      async marque() { await init(); return marqueDemo(cur()); },
      async deposerLogo(f) { await init(); return logoDemo(cur(), f); },
      async reglerMaMarque(p, valider) { await init(); return reglerMaMarqueDemo(cur(), p, valider); },
      async demanderChangementStyle(texte) { await init(); return demanderChangementStyleDemo(cur(), texte); },
      async contenus() { await init(); return mine("contenus").sort((a, b) => b.cree_le.localeCompare(a.cree_le)); },
      async urlVisuel(c) { return c.visuel_url || null; },
      async urlVideo(c) { return c.video_url || null; },
      async valider(id, statut, note) {
        await init(); const c = mine("contenus").find(x => x.id === id);
        if (!c) throw new Error("Contenu introuvable."); if (c.statut !== "a_valider") throw new Error("Ce contenu est déjà traité.");
        if (!["approuve", "modification", "refuse"].includes(statut)) throw new Error("Statut refusé.");
        if (statut === "modification" && !(note || "").trim()) throw new Error("Écrivez un mot pour dire ce qu'il faut modifier.");
        c.statut = statut; c.note_modification = statut === "modification" ? note.trim() : null; c.decide_le = new Date().toISOString(); jour(cur().id, "CONTENU_" + statut.toUpperCase(), { contenu: id }); suivreDepot(c); sauver();
      },
      async idees() { await init(); return mine("idees").sort((a, b) => b.cree_le.localeCompare(a.cree_le)); },
      async demanderIdees() {
        await init(); const c = cur(); pasEnPause(c);
        if (usage(c) >= OFFRES[c.offre_id].publications) throw new Error("Plafond de votre offre atteint ce mois-ci.");
        const d = { id: uid(), commerce_id: c.id, statut: "traitee", mois: mois0(), cree_le: new Date().toISOString() }; E.idees_demandes.push(d);
        ["Une idée de démonstration (faux service) : les coulisses avant l'ouverture", "Une idée de démonstration (faux service) : le geste que vos clients préfèrent"].forEach(t => E.idees.unshift({ id: uid(), commerce_id: c.id, titre: t, texte: "Texte de démonstration : en service, notre IA propose ici une idée liée à votre fiche.", cree_le: new Date().toISOString(), demo: true }));
        jour(c.id, "IDEES", { simule: true }); sauver();
      },
      async calendrier() { await init(); const cs = mine("contenus"); return mine("publications").map(p => ({ ...p, contenu: cs.find(c => c.id === p.contenu_id) })).sort((a, b) => a.prevu_le.localeCompare(b.prevu_le)); },
      async programmer({ contenu_id, reseaux, prevu_le }) {
        await init(); const c = cur(); pasEnPause(c); const ct = mine("contenus").find(x => x.id === contenu_id);
        if (!ct || ct.statut !== "approuve") throw new Error(REGLES.programme);
        if (!(new Date(prevu_le) > new Date())) throw new Error(REGLES.futur);
        if (!reseaux.length) throw new Error("Choisissez au moins un réseau.");
        for (const r of reseaux) if ((E.comptes[c.id][r] || {}).etat !== "connecte") throw new Error("Réseau non connecté : " + r + ".");
        if (reseaux.some(r => !reseauxPour(ct).includes(r))) throw new Error(ct.type === "video" ? "Une vidéo ne se programme pas sur la fiche Google." : "Une story ne se programme pas sur la fiche Google.");
        const son = sonPlateforme(ct, reseaux), pid = uid();
        E.publications.push({ id: pid, commerce_id: c.id, contenu_id, reseaux, prevu_le: new Date(prevu_le).toISOString(), statut: "programme", cree_le: new Date().toISOString(), musique_a_poser: son, musique_posee_le: null });
        ct.statut = "programme"; jour(c.id, "PROGRAMME", { contenu: contenu_id, reseaux }); if (son) jour(c.id, son.code, { publication: pid, reseaux: son.reseaux, simule: true }); suivreDepot(ct); sauver();
      },
      async deplacer(id, prevu_le) { await init(); const p = mine("publications").find(x => x.id === id); if (!p || p.statut !== "programme") throw new Error("Programmation introuvable."); if (!(new Date(prevu_le) > new Date())) throw new Error(REGLES.futur); p.prevu_le = new Date(prevu_le).toISOString(); sauver(); },
      async annuler(id) { await init(); const p = mine("publications").find(x => x.id === id); if (!p || p.statut !== "programme") throw new Error("Programmation introuvable."); p.statut = "annule"; const ct = mine("contenus").find(x => x.id === p.contenu_id); if (ct) ct.statut = "approuve"; jour(cur().id, "PROGRAMMATION_ANNULEE", { contenu: p.contenu_id }); sauver(); },
      async avis() { await init(); return mine("avis").sort((a, b) => b.cree_le.localeCompare(a.cree_le)); },
      async validerAvis(id, statut, texte) {
        await init(); const a = mine("avis").find(x => x.id === id); if (!a) throw new Error("Avis introuvable.");
        if (a.statut !== "a_valider" || a.sensible) throw new Error("Cet avis ne se valide pas ici.");
        if (!["valide", "refuse"].includes(statut)) throw new Error("Statut refusé.");
        if (statut === "valide") { if (!(texte || a.reponse_proposee || "").trim()) throw new Error("Réponse vide."); a.reponse_proposee = (texte ?? a.reponse_proposee).trim(); }
        a.statut = statut; jour(cur().id, "AVIS_" + statut.toUpperCase(), { avis: id }); sauver();
      },
      async comptes() { await init(); const c = cur(); return RESEAUX.map(r => ({ reseau: r, etat: ((E.comptes[c.id] || {})[r] || {}).etat || "non_connecte", detail: ((E.comptes[c.id] || {})[r] || {}).detail || "" })); },
      async compteur() { await init(); return vc(cur()); },
      // Abonnement (table abonnements, écrite par le seul webhook Stripe) : en démonstration, celui de la graine s'il y en a un, sinon aucun.
      async abonnement() { await init(); const c = cur(); const a = (E.abonnements || []).filter(x => x.commerce_id === c.id).sort((x, y) => String(y.maj_le || "").localeCompare(String(x.maj_le || "")))[0];
        return a && STATUTS_ABONNEMENT.includes(a.statut) ? { offre: a.offre, statut: a.statut, stripe_customer: a.stripe_customer || null, remise_lancement_fin: a.remise_lancement_fin || null, maj_le: a.maj_le || null, demo: true } : null; },
      lienAbonnement,
      async journal() { await init(); return mine("journal").slice(0, 100); },
      // ---- Collecte : page publique et retours privés (voir collecteDemo plus haut)
      ...collecteDemo,
      // ---- Mise à jour de l'espace membre (voir majDemo plus haut)
      ...majDemo,
      // ---- Automatisations de service (voir autoDemo plus haut)
      ...autoDemo,
      // ---- Vidéo d'avis
      async avisVideo() { await init(); return mine("avis").map(a => ({ id: a.id, note: a.note, texte: a.texte, auteur: a.auteur || "", sensible: !!a.sensible, cree_le: a.cree_le, demo: !!a.demo })).sort((a, b) => b.cree_le.localeCompare(a.cree_le)); },
      async demandesVideoAvis() { await init(); const c = cur(); return vaDemandes().filter(x => x.commerce_id === c.id).sort((a, b) => b.cree_le.localeCompare(a.cree_le)); },
      async demanderVideoAvis({ avis_ids, fond, style }) {
        await init(); const c = cur(), o = OFFRES[c.offre_id]; pasEnPause(c);
        if (!o.videos) throw new Error("Votre offre ne comprend pas de vidéo.");
        if (reserveesVideos(c) >= o.videos) throw new Error("Le plafond de vidéos de votre offre est atteint ce mois-ci.");
        vaControle(avis_ids, fond, style);
        const choisis = avis_ids.map(id => mine("avis").find(a => a.id === id));
        if (choisis.some(a => !a)) throw new Error("Avis introuvable.");
        for (const a of choisis) { const m = VIDEO_AVIS.motif(a); if (m) throw new Error(m); }
        if (fond === "photos" && !mine("photos").length) throw new Error("Aucune photo déposée : déposez une photo ou choisissez un fond uni.");
        const d = { id: uid(), commerce_id: c.id, avis_ids: [...avis_ids], fond, style, statut: "a_traiter", motif: null, contenu_id: null, mois: mois0(), cree_le: new Date().toISOString(), demo: true };
        vaDemandes().unshift(d); jour(c.id, "VIDEO_AVIS_DEMANDEE", { demande: d.id, simule: true }); sauver();
        setTimeout(() => { faux.videoAvis(d); sauver(); }, 1500);   // faux n8n + faux rendu
        return d.id;
      },
      // ---- Dépôt de vidéos (démonstration) : mêmes règles que la base ; l'envoi des fichiers est SIMULÉ (RENOM_ENVOI.simuler), rien ne quitte le navigateur.
      async depotsVideo() { await init(); const c = cur(); return liste("depots_video").filter(x => x.commerce_id === c.id).sort((a, b) => b.cree_le.localeCompare(a.cree_le)); },
      async compteurVideos() { await init(); const c = cur(), o = OFFRES[c.offre_id];
        return { commerce_id: c.id, mois: mois0(), videos_plafond: o.videos, videos_utilisees: usageVideos(c), videos_reservees: reserveesVideos(c),
          envois_ouverts: liste("depots_video").filter(d => d.commerce_id === c.id && d.statut === "en_envoi" && Date.now() - Date.parse(d.cree_le) < DEPOT_VIDEO.OUVERT_MS).length }; },
      async creerDepotVideo({ note } = {}) {
        await init(); const c = cur(), o = OFFRES[c.offre_id], P = DEPOT_VIDEO.PHRASES; pasEnPause(c);
        const n = String(note || "").trim(); if (n.length > window.RENOM_ENVOI.REGLES.NOTE_MAX) throw new Error(P.note);
        if (!o.videos) throw new Error(P.sans_video);
        if (liste("depots_video").some(d => d.commerce_id === c.id && d.statut === "en_envoi" && Date.now() - Date.parse(d.cree_le) < DEPOT_VIDEO.OUVERT_MS)) throw new Error(P.ouvert);
        if (reserveesVideos(c) >= o.videos) throw new Error(P.plafond);
        const d = { id: "dv-" + uid().slice(0, 8), commerce_id: c.id, fichiers: [], details: [], note: n || null, nb_fichiers: 0, nb_videos: 0, duree_totale_s: null, statut: "en_envoi", motif: null,
          contenu_id: null, mois: mois0(), essais: 0, cree_le: new Date().toISOString(), maj_le: new Date().toISOString(), demo: true, recus: {} };
        E.depots_video.unshift(d); sauver(); return { id: d.id };
      },
      // Fichiers déjà complets dans le dossier du dépôt (reprise après rechargement) : nom -> taille.
      async fichiersRecus(depot) { await init(); const d = liste("depots_video").find(x => x.id === depot && x.commerce_id === cur().id); return d ? { ...(d.recus || {}) } : {}; },
      async envoyerFichierDepot(depot, f, rang, o = {}) {
        await init(); const c = cur(), d = liste("depots_video").find(x => x.id === depot && x.commerce_id === c.id), P = DEPOT_VIDEO.PHRASES;
        if (!d) throw new Error(P.introuvable); if (d.statut !== "en_envoi") throw new Error(P.ferme);
        const nom = window.RENOM_ENVOI.nomDansDepot(rang, f), chemin = c.id + "/rushes/" + d.id + "/" + nom;
        if (o.deja || (d.recus && d.recus[nom] === f.size)) { if (o.onProgress) o.onProgress(f.size, f.size); return { chemin, deja: true }; }
        await window.RENOM_ENVOI.simuler({ fichier: f, onProgress: o.onProgress, onEtat: o.onEtat, signal: o.signal, debit: o.debit || window.RENOM_DEBIT_DEMO });
        d.recus = d.recus || {}; d.recus[nom] = f.size; sauver(); return { chemin, deja: false };
      },
      async finaliserDepotVideo(depot, details) {
        await init(); const c = cur(), d = liste("depots_video").find(x => x.id === depot && x.commerce_id === c.id), P = DEPOT_VIDEO.PHRASES, R = window.RENOM_ENVOI.REGLES;
        if (!d) throw new Error(P.introuvable); if (d.statut !== "en_envoi" || Date.now() - Date.parse(d.cree_le) >= DEPOT_VIDEO.OUVERT_MS) throw new Error(P.ferme);
        const l = (details || []).map(x => ({ chemin: x.chemin, nom: String(x.nom || "").slice(0, 200), type: /\.(mp4|mov|m4v|webm|3gp)$/i.test(x.chemin) ? "video" : "photo", taille: x.taille, duree_s: x.duree_s == null ? null : +x.duree_s }));
        for (const x of l) if (!d.recus || !d.recus[x.chemin.split("/").pop()]) throw new Error("Fichier non reçu : " + x.chemin.split("/").pop() + ".");
        const nv = l.filter(x => x.type === "video").length, np = l.length - nv;
        if (nv < R.VIDEOS_MIN || nv > R.VIDEOS_MAX) throw new Error(P.nb_videos); if (np > R.PHOTOS_MAX) throw new Error(P.nb_photos);
        if (l.some(x => x.type === "video" && x.duree_s != null && Math.round(x.duree_s) > R.DUREE_MAX_S)) throw new Error(P.longue);
        const durees = l.filter(x => x.type === "video" && x.duree_s != null);
        Object.assign(d, { fichiers: l.map(x => x.chemin), details: l, nb_fichiers: l.length, nb_videos: nv, duree_totale_s: durees.length ? Math.round(durees.reduce((a, x) => a + x.duree_s, 0) * 10) / 10 : null,
          statut: "envoye", envoye_le: new Date().toISOString(), maj_le: new Date().toISOString() });
        jour(c.id, "DEPOT_VIDEO", { depot: d.id, videos: nv, photos: np, simule: true }); sauver();
        // Faux n8n puis faux moteur : « en montage » tout de suite, contenu « à valider » ensuite.
        setTimeout(() => { if (d.statut === "envoye") { d.statut = "en_montage"; sauver(); } }, 800);
        setTimeout(() => { faux.montage(d); sauver(); }, window.RENOM_MONTAGE_DEMO_MS || 4000);
        return { id: d.id, statut: d.statut, nb_videos: nv, nb_photos: np, duree_totale_s: d.duree_totale_s };
      },
      async annulerDepotVideo(depot) {
        await init(); const c = cur(), d = liste("depots_video").find(x => x.id === depot && x.commerce_id === c.id), P = DEPOT_VIDEO.PHRASES;
        if (!d) throw new Error(P.introuvable); if (d.statut !== "en_envoi") throw new Error(P.ferme);
        Object.assign(d, { statut: "annule", recus: {}, rushes_effaces_le: new Date().toISOString(), maj_le: new Date().toISOString() }); jour(c.id, "DEPOT_VIDEO_ANNULE", { depot: d.id }); sauver();
      },
      async adminDepotsVideo() { await init(); admin(); return liste("depots_video").map(d => ({ ...d, commerce: (E.commerces[d.commerce_id] || {}).nom })).sort((a, b) => b.cree_le.localeCompare(a.cree_le)); },
      async adminRelancerMontage(id) {
        await init(); admin(); const d = liste("depots_video").find(x => x.id === id), P = DEPOT_VIDEO.PHRASES; if (!d) throw new Error(P.introuvable);
        if (!["envoye", "en_montage", "refuse"].includes(d.statut)) throw new Error(P.relance); if (d.rushes_effaces_le) throw new Error(P.efface);
        const c = E.commerces[d.commerce_id]; if (d.statut === "refuse" && usageVideos(c) + depotsAttente(c, d.id) + vaDemandes().filter(x => x.commerce_id === c.id && ["a_traiter", "en_cours"].includes(x.statut)).length >= OFFRES[c.offre_id].videos) throw new Error(P.plafond);
        Object.assign(d, { statut: "envoye", motif: null, contenu_id: null, essais: (d.essais || 0) + 1, maj_le: new Date().toISOString() }); jour(d.commerce_id, "MONTAGE_RELANCE", { depot: d.id, essai: d.essais }); sauver();
        setTimeout(() => { faux.montage(d); sauver(); }, window.RENOM_MONTAGE_DEMO_MS || 4000);
      },
      // ---- Réponses aux commentaires (démonstration). Aucun réseau n'est appelé : l'accès de Meta n'étant pas accordé, une réponse validée passe
      // dans la file « à publier à la main » de la console, comme le ferait n8n/renom-commentaires-publication.json sans accès.
      async commentaires() { await init(); return liste("commentaires").filter(x => x.commerce_id === cur().id).sort((a, b) => b.cree_le.localeCompare(a.cree_le)); },
      async deciderCommentaire(id, decision, texte) {
        await init(); const x = liste("commentaires").find(y => y.id === id && y.commerce_id === cur().id);
        appliquerDecisionCommentaire(x, decision, texte); jour(cur().id, "COMMENTAIRE_" + String(decision).toUpperCase(), { commentaire: id }); sauver(); return x.statut;
      },
      async adminCommentairesAPublier() { await init(); admin(); return liste("commentaires").filter(x => x.statut === "a_publier_main").map(x => ({ ...x, commerce: (E.commerces[x.commerce_id] || {}).nom })).sort((a, b) => (a.decide_le || "").localeCompare(b.decide_le || "")); },
      async adminCommentairePublie(id) {
        await init(); admin(); const x = liste("commentaires").find(y => y.id === id);
        if (!x || x.statut !== "a_publier_main") throw new Error("Cette réponse n'est pas dans la file à publier à la main.");
        Object.assign(x, { statut: "publie", publie_par: "equipe", reponse: x.reponse_proposee, repondu_le: iso(Date.now()) }); jour(x.commerce_id, "COMMENTAIRE_PUBLIE", { par: "equipe" }); sauver();
      },
      async adminMusiquesAPoser() { await init(); admin(); return liste("publications").filter(x => x.musique_a_poser && !x.musique_posee_le && ["programme", "envoye"].includes(x.statut)).map(x => ({ ...x, commerce: (E.commerces[x.commerce_id] || {}).nom })).sort((a, b) => a.prevu_le.localeCompare(b.prevu_le)); },
      async adminMusiquePosee(id) {
        await init(); admin(); const x = liste("publications").find(y => y.id === id);
        if (!x || !x.musique_a_poser || x.musique_posee_le) throw new Error("Aucun son à poser pour cette publication.");
        x.musique_posee_le = iso(Date.now()); jour(x.commerce_id, "MUSIQUE_PLATEFORME_POSEE", { publication: x.id, par: "equipe" }); sauver();
      },
      // ---- console de PJ
      async adminCommerces() { await init(); admin(); return Object.values(E.commerces).map(c => ({ ...c, compteur: vc(c), comptes: E.comptes[c.id] || {}, alertes: E.avis.filter(a => a.commerce_id === c.id && a.sensible && a.statut === "humain").length, sante: santeDemo(c),
        demandes_style: liste("demandes_style").filter(d => d.commerce_id === c.id && !d.traitee_le).length })); },
      async adminJournal() { await init(); admin(); return E.journal.slice(0, 300).map(j => ({ ...j, commerce: (E.commerces[j.commerce_id] || {}).nom })); },
      async adminAlertes() {
        await init(); admin(); const nom = id => (E.commerces[id] || {}).nom;
        return [...E.avis.filter(a => a.sensible && a.statut === "humain").map(a => ({ type: "Avis sensible", commerce: nom(a.commerce_id), texte: (a.raisons || []).join(", ") + " : " + (a.texte || "").slice(0, 100), date: a.cree_le })),
          ...liste("commentaires").filter(x => x.categorie === "sensible" && x.statut === "humain").map(x => ({ type: "Commentaire sensible", commerce: nom(x.commerce_id), texte: (x.raisons || []).join(", ") + " : " + (x.texte || "texte effacé après 30 jours").slice(0, 100), date: x.cree_le })),
          ...E.journal.filter(j => ["REFUS", "LEGENDE_REFUSEE", "ECHEC_PUBLICATION", "SCHEMA_INCOMPLET"].includes(j.type)).map(j => ({ type: j.type, commerce: nom(j.commerce_id), texte: JSON.stringify(j.detail), date: j.cree_le })),
          ...E.publications.filter(p => p.statut === "echec").map(p => ({ type: "Publication en échec", commerce: nom(p.commerce_id), texte: p.erreur || "", date: p.prevu_le })),
          ...liste("alertes_exploitant").map(a => ({ type: TYPES_ALERTE[a.type] || a.type, commerce: nom(a.commerce_id) || "", texte: texteAlerte(a), date: a.cree_le }))];
      },
      async adminCreer(nom, metier, offre, email) {
        await init(); admin(); if (!nom.trim() || !/.+@.+/.test(email)) throw new Error("Nom et email valides requis.");
        const id = "c-" + uid().slice(0, 8); E.commerces[id] = { id, nom: nom.trim(), metier, ville: "", offre_id: offre, en_pause: false, mots_cles: [], mentions_autorisees: [], couleurs: { fond: "#FFFFFF", texte: "#000000", accent: "#2438FF" }, reglage_avis: "auto_des_4_etoiles", email_validation: email.toLowerCase() };
        E.comptes[id] = Object.fromEntries(RESEAUX.map(r => [r, { etat: "non_connecte" }])); E.invitations.push({ id: uid(), email: email.toLowerCase(), commerce_id: id, statut: "a_envoyer", cree_le: new Date().toISOString() });
        E.users[email.toLowerCase()] = { role: "commerçant", commerce: id }; jour(id, "COMMERCE_CREE", { offre }); sauver(); return id;
      },
      async adminOffre(id, offre) { await init(); admin(); E.commerces[id].offre_id = offre; jour(id, "OFFRE_CHANGEE", { offre }); sauver(); },
      async adminPause(id, pause) { await init(); admin(); E.commerces[id].en_pause = !!pause; jour(id, pause ? "MISE_EN_PAUSE" : "REPRISE", {}); sauver(); },
      async adminInvitations() { await init(); admin(); return E.invitations.map(i => ({ ...i, commerce: (E.commerces[i.commerce_id] || {}).nom })); },
      // ---- Style du commerce réglé par RENOM (console) : mêmes règles que « Votre style », auteur « renom » (fonction SQL admin_regler_marque)
      async adminMarque(cid) { await init(); admin(); const c = E.commerces[cid]; if (!c) throw new Error("Commerce introuvable."); return { commerce: c, ...(await marqueDemo(c)) }; },
      async adminDeposerLogo(cid, f) { await init(); admin(); const c = E.commerces[cid]; if (!c) throw new Error("Commerce introuvable."); return logoDemo(c, f); },
      async adminEnregistrerMarque(cid, kit, valider) { await init(); admin(); const c = E.commerces[cid]; if (!c) throw new Error("Commerce introuvable."); const m = await enregistrerMarqueDemo(c, kit, !!valider, "renom", !!valider);
        demandesStyleDemo(c).forEach(d => { if (!d.traitee_le) d.traitee_le = new Date().toISOString(); }); sauver(); return m; },
      // ---- outils de démonstration (n'existent qu'ici)
      outilsDemo: {
        // Aperçu des emails de validation que le commerçant recevrait (aucun email ne part en démonstration)
        async emailsValidation() {
          await init(); const c = cur(); if (c.notifications && c.notifications.email === false) return [];
          const court = t => { t = String(t || ""); return t.length > 160 ? t.slice(0, t.lastIndexOf(" ", 160)) + "…" : t; };
          return liste("jetons_validation").filter(j => j.commerce_id === c.id).map(j => lireJeton(j.jeton)).filter(r => r.etat === "a_valider").reverse().map(({ j, o }) => ({
            jeton: j.jeton, objet: j.objet, expire_le: j.expire_le, extrait: court(j.objet === "contenu" ? o.legende : o.texte),
            objet_email: j.objet === "avis" ? "Une réponse d'avis attend votre accord" : j.objet === "commentaire" ? "Une réponse à un commentaire attend votre accord"
              : ({ story: "Une story attend votre accord", video: "Une vidéo attend votre accord" })[formatDe(o)] || "Une publication attend votre accord",
            phrase: j.objet === "avis" ? `Un avis de ${o.note} sur 5 a reçu une proposition de réponse. Ouvrez le lien pour la lire, la modifier si besoin, puis décider.`
              : j.objet === "commentaire" ? `Un commentaire ${COMMENTAIRES.RESEAUX[o.reseau] ? "sur " + COMMENTAIRES.RESEAUX[o.reseau] + " " : ""}a reçu une proposition de réponse. Ouvrez le lien pour la lire, la modifier si besoin, puis décider.`
              : `Un nouveau contenu pour ${c.nom} attend votre accord. Ouvrez le lien pour le voir réseau par réseau, puis décider.` }));
        },
        async avisFictif() {
          await init(); const c = cur(); const sens = false, id = uid(); E.avis.unshift({ id, commerce_id: c.id, google_review_id: "demo-" + uid().slice(0, 6), auteur: "Alex D.", note: 2, texte: "L'attente au départ nous a semblé longue.", reponse_proposee: "Bonjour Alex, merci d'avoir pris le temps de nous écrire. Nous sommes désolés que l'attente au départ vous ait semblé longue. Pour en parler, " + (!c.contact ? "écrivez-nous à l'adresse de contact de votre fiche" : /@/.test(c.contact) ? "écrivez-nous à " + c.contact : "contactez-nous par " + c.contact) + ". Nous espérons vous revoir bientôt.", sensible: sens, raisons: [], statut: "a_valider", decision: "validation_commercant", cree_le: new Date().toISOString(), demo: true }); jour(c.id, "AVIS_RECU", { simule: true }); emettreJeton(c.id, "avis", id); sauver();
        },
        async echeances() { await init(); let n = 0; E.publications.forEach(p => { if (p.statut === "programme") { p.statut = "publie"; p.prevu_le = new Date(Date.now() - 60000).toISOString(); n++; const ct = E.contenus.find(c => c.id === p.contenu_id); if (ct) ct.statut = "publie"; jour(p.commerce_id, "PUBLIE", { simule: true }); } });
          // Réponses d'avis validées et actions de fiche validées : publiées (simulé)
          E.avis.forEach(a => { if (a.statut === "valide") { a.statut = "publie"; a.reponse = a.reponse_proposee; a.repondu_le = iso(Date.now()); jour(a.commerce_id, "AVIS_PUBLIE", { simule: true }); n++; } });
          liste("actions_fiche").forEach(a => { if (a.statut === "a_publier") { a.statut = "publie"; a.publie_le = iso(Date.now()); jour(a.commerce_id, "ACTION_FICHE_PUBLIEE", { type: a.type, simule: true }); n++; } });
          sauver(); return n; },
        async rendus() { await init(); E.photos.filter(p => p.statut === "a_traiter").forEach(p => faux.creation(p)); vaDemandes().forEach(d => faux.videoAvis(d)); liste("depots_video").forEach(d => faux.montage(d)); sauver(); },
        // Le service du jour, joué dans le navigateur : les demandes échues passent « envoyées » (rien ne part), avec les mêmes règles d'annulation.
        async serviceDuJour() {
          await init(); let n = 0; const now = Date.now();
          liste("demandes_avis").filter(x => x.statut === "a_envoyer" && Date.parse(x.prevu_le) <= now).sort((a, b) => a.prevu_le.localeCompare(b.prevu_le)).forEach(x => {
            const c = E.commerces[x.commerce_id] || {}, freres = E.demandes_avis.filter(y => y.client_id === x.client_id);
            const motif = c.en_pause ? "commerce en pause" : !lienAvisPublic(c) ? "lien d'avis Google absent" : liste("oppositions").some(o => o.commerce_id === x.commerce_id && o.email === x.email) ? "opposition"
              : x.etape === "relance" && !freres.some(y => y.etape === "demande" && y.statut === "envoye") ? "demande non envoyée"
              : x.etape === "relance" && freres.some(y => y.ouvert_le || y.clic_le) ? "page d'avis déjà ouverte" : null;
            if (motif) { x.statut = "annule"; x.motif = motif; } else { x.statut = "envoye"; x.envoye_le = iso(now); n++; }
          });
          sauver(); return n;
        },
        async reinitialiser() { try { localStorage.removeItem(K); localStorage.removeItem(K + ":retours"); localStorage.removeItem(K + ":collecte"); } catch (e) {} E = null; pret = null; await init(); },
      },
    };
  }

  // =============================================================== SUPABASE
  function supabase() {
    const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.publishableKey);
    let cache = null;
    const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
    // Kit de marque d'un commerce (espace du commerçant et console) : photos et logo du seau « photos » par adresses signées d'une heure.
    const signe = async ch => { try { const r = await sb.storage.from("photos").createSignedUrl(ch, 3600); return r.data && r.data.signedUrl; } catch (e) { return null; } };
    async function marqueDe(c) {
      const MQ = window.RENOM_MARQUE, cat = await MQ.charger();
      const ph = ok(await sb.from("photos").select("id,chemin,nom_fichier,cree_le").eq("commerce_id", c.id).order("cree_le", { ascending: false }).limit(6));
      const urls = await Promise.all(ph.map(p => signe(p.chemin)));
      return { kit: c.marque ? MQ.normaliser(c.marque, c.couleurs, c.metier, c.ton || "", cat) : null, brut: c.marque || null,
        photos: ph.map((p, i) => ({ url: urls[i], nom: p.nom_fichier })).filter(p => p.url), logo: c.marque && c.marque.logo ? await signe(c.marque.logo) : null,
        demandes: ok(await sb.from("demandes_style").select("id,texte,cree_le,traitee_le").eq("commerce_id", c.id).order("cree_le", { ascending: false }).limit(20)) };
    }
    // Logo : seau « photos », <commerce>/marque/logo-<aléa>.<ext> (règles de stockage : storage.sql pour le commerçant, schema.sql pour RENOM). Un SVG est converti en PNG.
    async function logoDe(c, f) {
      const MQ = window.RENOM_MARQUE, e = MQ.controlerLogo(f); if (e) throw Object.assign(new Error("logo " + e), { code: "sty.logo." + e });
      const blob = MQ.estSvg(f) ? await MQ.enPng(f, 1024) : f;
      const ext = MQ.estSvg(f) ? "png" : ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[f.type] || (f.name.split(".").pop() || "png").toLowerCase().replace("jpeg", "jpg"));
      const chemin = c.id + "/marque/logo-" + uid().replace(/[^a-z0-9]/gi, "").slice(0, 12) + "." + ext;
      ok(await sb.storage.from("photos").upload(chemin, blob, { contentType: MQ.estSvg(f) ? "image/png" : f.type }));
      return { chemin, url: URL.createObjectURL(blob) };
    }
    // Contrôle avant l'envoi (mêmes règles que la base, qui a le dernier mot) : rend le kit sans les champs posés par la base.
    async function kitControle(kit, cid) {
      const MQ = window.RENOM_MARQUE, cat = await MQ.charger(), m = MQ.sansBase(kit), f = MQ.fautes(m, cid, cat);
      if (f.length) throw Object.assign(new Error("Kit de marque refusé : " + f.join(", ")), { codes: f });
      return m;
    }
    const self = {
      mode: "supabase",
      async session() { const { data } = await sb.auth.getSession(); if (!data.session) return null; return { email: data.session.user.email, role: (await self.estAdmin()) ? "administrateur" : "commerçant" }; },
      async envoyerLien(e) { ok(await sb.auth.signInWithOtp({ email: e.trim(), options: { shouldCreateUser: false, emailRedirectTo: location.href.split("#")[0] } })); return {}; },
      async ouvrirLien() {},
      async quitter() { cache = null; await sb.auth.signOut(); },
      async estAdmin() { const { data } = await sb.auth.getSession(); if (!data.session) return false; const r = ok(await sb.from("admins").select("user_id").eq("user_id", data.session.user.id).maybeSingle()); return !!r; },
      async commerce() {
        if (cache) return cache;
        const m = ok(await sb.from("membres").select("commerce_id").limit(1).maybeSingle());
        if (!m) throw new Error("Aucun commerce n'est rattaché à ce compte. Contactez RENOM.");
        return (cache = ok(await sb.from("commerces").select("*").eq("id", m.commerce_id).single()));
      },
      async enregistrer(ch) { const c = await self.commerce(); const m = {}; FICHE.forEach(k => { if (k in ch) m[k] = ch[k]; }); ok(await sb.from("commerces").update(m).eq("id", c.id)); cache = null; },
      async photos() { const c = await self.commerce(); return ok(await sb.from("photos").select("id,nom_fichier,statut,cree_le").eq("commerce_id", c.id).order("cree_le", { ascending: false }).limit(100)); },
      async deposer(f) {
        const e = verifierFichier(f); if (e) throw new Error(e);
        const c = await self.commerce(), ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const chemin = c.id + "/" + uid() + "." + ext;
        ok(await sb.storage.from("photos").upload(chemin, f, { contentType: f.type }));
        ok(await sb.from("photos").insert({ commerce_id: c.id, chemin, nom_fichier: f.name }));
      },
      async contenus() { const c = await self.commerce(); return ok(await sb.from("contenus").select("id,type,format,statut,legende,legendes,fichier,note_modification,cree_le,depot_video_id").eq("commerce_id", c.id).order("cree_le", { ascending: false }).limit(100)); },
      // ---- Kit de marque (écran « Votre style ») : colonne commerces.marque ; la base contrôle le kit, pose la version, l'auteur et aligne commerces.couleurs.
      async marque() { return marqueDe(await self.commerce()); },
      async deposerLogo(f) { return logoDe(await self.commerce(), f); },
      // Le commerçant ne règle que son logo, ses expressions et la validation (fonction regler_ma_marque) ; le reste est réglé par RENOM.
      async reglerMaMarque(p, valider) { const r = ok(await sb.rpc("regler_ma_marque", { p: p || {}, p_valider: valider == null ? null : !!valider })); cache = null; return r; },
      async demanderChangementStyle(texte) { return ok(await sb.rpc("demander_changement_style", { p_texte: String(texte || "") })); },
      // ---- Style du commerce réglé par RENOM (console) : fonction admin_regler_marque (n'écrit que commerces.marque ; auteur « renom » posé par la base)
      async adminMarque(cid) { const c = ok(await sb.from("commerces").select("*").eq("id", cid).single()); return { commerce: c, ...(await marqueDe(c)) }; },
      async adminDeposerLogo(cid, f) { return logoDe({ id: cid }, f); },
      async adminEnregistrerMarque(cid, kit, valider) {
        const m = await kitControle({ ...kit, verrouille: !!valider, auto: false }, cid); delete m.valide_par;
        return ok(await sb.rpc("admin_regler_marque", { p_commerce: cid, p_marque: m, p_valider: !!valider }));
      },
      // Une story s'affiche avec son visuel 9:16, les autres contenus avec le visuel 4:5.
      async urlVisuel(ct) { if (!ct.fichier) return null; const base = ct.type === "video" ? ct.fichier.slice(0, ct.fichier.lastIndexOf("/")) : ct.fichier; const r = ok(await sb.storage.from("contenus").createSignedUrl(base + (formatDe(ct) === "story" ? "/visuel-9x16.jpg" : "/visuel-4x5.jpg"), 3600)); return r.signedUrl; },
      async urlVideo(ct) { if (ct.type !== "video" || !ct.fichier) return null; const r = ok(await sb.storage.from("contenus").createSignedUrl(ct.fichier, 3600)); return r.signedUrl; },
      async valider(id, statut, note) {
        if (statut === "modification" && !(note || "").trim()) throw new Error("Écrivez un mot pour dire ce qu'il faut modifier.");
        const r = ok(await sb.from("contenus").update({ statut, note_modification: statut === "modification" ? note.trim() : null }).eq("id", id).select());
        if (!r.length) throw new Error("Ce contenu est déjà traité.");
      },
      async idees() { const c = await self.commerce(); return ok(await sb.from("idees").select("id,titre,texte,cree_le,origine,statut,semaine,motif").eq("commerce_id", c.id).order("cree_le", { ascending: false }).limit(50)); },
      async demanderIdees() { const c = await self.commerce(); ok(await sb.from("idees_demandes").insert({ commerce_id: c.id })); },
      async calendrier() { const c = await self.commerce(); return ok(await sb.from("publications").select("*, contenu:contenus(id,type,legende,fichier,statut)").eq("commerce_id", c.id).order("prevu_le")); },
      async programmer({ contenu_id, reseaux, prevu_le }) { const c = await self.commerce(); ok(await sb.from("publications").insert({ commerce_id: c.id, contenu_id, reseaux, prevu_le: new Date(prevu_le).toISOString() })); },
      async deplacer(id, prevu_le) { ok(await sb.from("publications").update({ prevu_le: new Date(prevu_le).toISOString() }).eq("id", id)); },
      async annuler(id) { ok(await sb.from("publications").update({ statut: "annule" }).eq("id", id)); },
      async avis() { const c = await self.commerce(); return ok(await sb.from("avis").select("id,note,texte,reponse,reponse_proposee,statut,sensible,raisons,decision,cree_le,repondu_le,efface_le").eq("commerce_id", c.id).order("cree_le", { ascending: false }).limit(100)); },
      async validerAvis(id, statut, texte) { const m = { statut }; if (texte != null) m.reponse_proposee = texte; const r = ok(await sb.from("avis").update(m).eq("id", id).select()); if (!r.length) throw new Error("Cet avis ne se valide pas ici."); },
      async comptes() { const c = await self.commerce(); const l = ok(await sb.from("comptes_connectes").select("reseau,etat,detail").eq("commerce_id", c.id)); return RESEAUX.map(r => l.find(x => x.reseau === r) || { reseau: r, etat: "non_connecte", detail: "" }); },
      async compteur() { const c = await self.commerce(); return ok(await sb.from("compteur").select("*").eq("commerce_id", c.id).single()); },
      // Abonnement Stripe du commerce (lecture seule : la table n'est écrite que par le webhook, schema.sql, bloc « abonnements Stripe »).
      async abonnement() { const c = await self.commerce(); const l = ok(await sb.from("abonnements").select("offre,statut,stripe_customer,remise_lancement_fin,maj_le").eq("commerce_id", c.id).order("maj_le", { ascending: false }).limit(1)); return l[0] || null; },
      lienAbonnement,
      async journal() { const c = await self.commerce(); return ok(await sb.from("journal").select("*").eq("commerce_id", c.id).order("cree_le", { ascending: false }).limit(100)); },
      // ---- Collecte : page publique et retours privés
      async jetonAvis() { return (await self.commerce()).jeton_avis; },
      avisPublic: jeton => publicSupabase.avisPublic(jeton),
      deposerRetour: (jeton, r) => publicSupabase.deposerRetour(jeton, r),
      async retoursPrives() { const c = await self.commerce(); return ok(await sb.from("retours_prives").select("id,note,message,prenom,lu,cree_le").eq("commerce_id", c.id).order("cree_le", { ascending: false }).limit(200)); },
      async marquerRetour(id, lu) { const r = ok(await sb.from("retours_prives").update({ lu: !!lu }).eq("id", id).select("id")); if (!r.length) throw new Error("Retour introuvable."); },
      // ---- Collecte : fin
      // ---- Vidéo d'avis (la base refuse elle-même une demande hors règles : déclencheur verifier_demande_video_avis)
      async avisVideo() { const c = await self.commerce(); return ok(await sb.from("avis").select("id,note,texte,auteur,sensible,cree_le,efface_le").eq("commerce_id", c.id).order("cree_le", { ascending: false }).limit(100)); },
      // ---- Réponses aux commentaires : table commentaires (lecture), décisions par la fonction decider_commentaire (la base revérifie tout)
      async commentaires() { const c = await self.commerce(); return ok(await sb.from("commentaires").select("id,reseau,lien,auteur,texte,categorie,raisons,reponse_proposee,reponse,refus,statut,decision,publie_par,erreur,cree_le,ecrit_le,decide_le,repondu_le,efface_le").eq("commerce_id", c.id).order("cree_le", { ascending: false }).limit(100)); },
      async deciderCommentaire(id, decision, texte) { if (decision === "valide" && texte != null) controlerDecisionCommentaire({ statut: "a_valider" }, decision, texte); return ok(await sb.rpc("decider_commentaire", { p_id: id, p_decision: decision, p_texte: texte == null ? null : String(texte) })); },
      async adminCommentairesAPublier() { const cs = ok(await sb.from("commerces").select("id,nom")); return ok(await sb.from("commentaires").select("*").eq("statut", "a_publier_main").order("decide_le")).map(x => ({ ...x, commerce: (cs.find(c => c.id === x.commerce_id) || {}).nom })); },
      async adminCommentairePublie(id) { ok(await sb.rpc("admin_commentaire_publie", { p_id: id })); },
      // Son de plateforme à poser à la main dans Metricool (publications.musique_a_poser, rempli par n8n ; fonction admin_musique_posee).
      async adminMusiquesAPoser() { const cs = ok(await sb.from("commerces").select("id,nom")); return ok(await sb.from("publications").select("id,commerce_id,contenu_id,reseaux,prevu_le,statut,musique_a_poser").not("musique_a_poser", "is", null).is("musique_posee_le", null).in("statut", ["programme", "envoye"]).order("prevu_le")).map(x => ({ ...x, commerce: (cs.find(c => c.id === x.commerce_id) || {}).nom })); },
      async adminMusiquePosee(id) { ok(await sb.rpc("admin_musique_posee", { p_id: id })); },
      // ---- Dépôt de vidéos : table depots_video (lecture, création), fonctions finaliser_depot_video et annuler_depot_video ; fichiers envoyés en TUS
      // (espace/web/envoi.js) dans le seau « photos », <commerce>/rushes/<dépôt>/. La base revérifie tout ; ses refus sont ramenés aux phrases communes.
      async depotsVideo() { const c = await self.commerce(); return ok(await sb.from("depots_video").select("id,statut,motif,note,nb_fichiers,nb_videos,duree_totale_s,details,contenu_id,mois,cree_le,envoye_le,valide_le,rushes_effaces_le").eq("commerce_id", c.id).order("cree_le", { ascending: false }).limit(30)); },
      async compteurVideos() { const c = await self.commerce(); return ok(await sb.from("compteur_videos").select("*").eq("commerce_id", c.id).single()); },
      async creerDepotVideo({ note } = {}) {
        const c = await self.commerce(), n = String(note || "").trim(); if (n.length > window.RENOM_ENVOI.REGLES.NOTE_MAX) throw new Error(DEPOT_VIDEO.PHRASES.note);
        const r = await sb.from("depots_video").insert({ commerce_id: c.id, note: n || null }).select("id").single(); if (r.error) throw new Error(phraseDepot(r.error.message)); return r.data;
      },
      async fichiersRecus(depot) {
        const c = await self.commerce(), r = await sb.storage.from("photos").list(c.id + "/rushes/" + depot, { limit: 100 });
        return Object.fromEntries((r.data || []).filter(x => x.metadata && x.metadata.size != null).map(x => [x.name, +x.metadata.size]));
      },
      async envoyerFichierDepot(depot, f, rang, o = {}) {
        const c = await self.commerce(), chemin = c.id + "/rushes/" + depot + "/" + window.RENOM_ENVOI.nomDansDepot(rang, f);
        if (o.deja) { if (o.onProgress) o.onProgress(f.size, f.size); return { chemin, deja: true }; }
        const jeton = async () => { const { data } = await sb.auth.getSession(); return data && data.session ? data.session.access_token : null; };
        const r = await window.RENOM_ENVOI.envoyer({ fichier: f, seau: "photos", objet: chemin, url: cfg.supabaseUrl, cle: cfg.publishableKey, jeton, onProgress: o.onProgress, onEtat: o.onEtat, signal: o.signal });
        return { chemin, deja: r.deja };
      },
      async finaliserDepotVideo(depot, details) { const r = await sb.rpc("finaliser_depot_video", { p_depot: depot, p_details: details }); if (r.error) throw new Error(phraseDepot(r.error.message)); return r.data; },
      async annulerDepotVideo(depot) { const r = await sb.rpc("annuler_depot_video", { p_depot: depot }); if (r.error) throw new Error(phraseDepot(r.error.message)); },
      async adminDepotsVideo() { const cs = ok(await sb.from("commerces").select("id,nom")); return ok(await sb.from("depots_video").select("*").order("cree_le", { ascending: false }).limit(200)).map(d => ({ ...d, commerce: (cs.find(c => c.id === d.commerce_id) || {}).nom })); },
      async adminRelancerMontage(id) { const r = await sb.rpc("admin_relancer_montage", { p_depot: id }); if (r.error) throw new Error(phraseDepot(r.error.message)); return r.data; },
      async demandesVideoAvis() { const c = await self.commerce(); return ok(await sb.from("videos_avis_demandes").select("id,avis_ids,fond,style,statut,motif,contenu_id,cree_le").eq("commerce_id", c.id).order("cree_le", { ascending: false }).limit(20)); },
      async demanderVideoAvis({ avis_ids, fond, style }) { vaControle(avis_ids, fond, style); const c = await self.commerce(); ok(await sb.from("videos_avis_demandes").insert({ commerce_id: c.id, avis_ids, fond, style })); },
      // ---- Mise à jour de l'espace membre : uniquement les tables et fonctions du contrat (ordres/CONTRAT-MAJ-MEMBRE.md)
      // Résultats : Google interdit de conserver note, nombre d'avis, noms et historique (ordres/BRANCHEMENT.md, « Conformité des résultats »).
      // L'écran Résultats (n >= 2) demande donc une lecture à la demande au workflow n8n renom-resultats-google (config.js, lectureGoogleUrl),
      // avec la session du commerçant ; la base plafonne ces lectures. Rien n'est gardé dans le navigateur. Sans adresse ou en échec : les chiffres
      // de la base seuls, et la raison dans « lecture_google ». Les autres écrans (Collecte : n = 1) ne déclenchent aucune lecture de Google.
      async resultats(n) {
        n = Math.max(1, Math.min(12, +n || 6));
        if (n >= 2 && cfg.lectureGoogleUrl) {
          try {
            const { data } = await sb.auth.getSession(), jeton = data && data.session && data.session.access_token;
            if (jeton) {
              const r = await fetch(cfg.lectureGoogleUrl, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + jeton }, body: JSON.stringify({ p_mois: n }) });
              const R = r.ok ? await r.json() : null;
              if (R && Array.isArray(R.mois)) return R;
            }
          } catch (e) {}
        }
        const R = ok(await sb.rpc("resultats", { p_mois: n }));
        R.lecture_google = { le: new Date().toISOString(), statut: n < 2 ? "non_demandee" : cfg.lectureGoogleUrl ? "indisponible" : "non_branchee" };
        return R;
      },
      async bilanMois() { return ok(await sb.rpc("bilan_mois", {})); },
      async modifierLegende(id, reseau, texte) { ok(await sb.rpc("modifier_legende", { p_contenu: id, p_reseau: reseau, p_texte: controlerLegende(reseau, texte) })); },
      async programmerAuto(id, reseaux) { return ok(await sb.rpc("programmer_auto", { p_contenu: id, p_reseaux: reseaux })); },
      async actionsFiche() { const c = await self.commerce(); return ok(await sb.from("actions_fiche").select("id,type,donnees,statut,cree_le,publie_le").eq("commerce_id", c.id).order("cree_le", { ascending: false }).limit(50)); },
      async creerActionFiche(type, donnees) { return ok(await sb.rpc("creer_action_fiche", { p_type: type, p_donnees: controlerAction(type, donnees) })); },
      async validerActionFiche(id, decision) { ok(await sb.rpc("valider_action_fiche", { p_id: id, p_decision: decision })); },
      async enregistrerDemarrage(rep) { ok(await sb.rpc("enregistrer_demarrage", { p_reponses: controlerDemarrage(rep) })); cache = null; },
      compterCollecte: (jeton, type, canal) => publicSupabase.compterCollecte(jeton, type, canal),
      // ---- Automatisations de service : uniquement les tables et fonctions du bloc « Automatisations de service » de schema.sql
      emailPhotos() { return cfg.emailPhotos ? { adresse: cfg.emailPhotos, demo: false } : null; },
      async importerClients(lignes, consentement) { return ok(await sb.rpc("importer_clients", { p_lignes: lignes, p_consentement: consentement === true })); },
      async demandesAvis() { return ok(await sb.rpc("mes_demandes_avis", {})); },
      async ajouterOpposition(email) { ok(await sb.rpc("ajouter_opposition", { p_email: String(email || "") })); },
      async miseEnRoute() { return ok(await sb.rpc("ma_mise_en_route", {})); },
      async declarerMiseEnRoute(point) { return ok(await sb.rpc("declarer_mise_en_route", { p_point: point })); },
      async deciderIdee(id, decision) { ok(await sb.rpc("decider_idee", { p_id: id, p_decision: decision })); },
      desinscriptionInfo: jeton => publicSupabase.desinscriptionInfo(jeton),
      seDesinscrire: jeton => publicSupabase.seDesinscrire(jeton),
      async adminSante() { return ok(await sb.rpc("admin_sante_clients", {})); },
      async adminProspects() { return ok(await sb.from("prospects").select("*").order("audit_le", { ascending: false }).limit(200)); },
      async adminProspect(id, action) { ok(await sb.rpc("admin_prospect", { p_id: id, p_action: action })); },
      async adminMiseEnRoute(cid, point, etat) { return ok(await sb.rpc("admin_mise_en_route", { p_commerce: cid, p_point: point, p_etat: etat })); },
      objetParJeton: jeton => publicSupabase.objetParJeton(jeton),
      validerParJeton: (jeton, decision, texte) => publicSupabase.validerParJeton(jeton, decision, texte),
      async adminCommerces() {
        const cs = ok(await sb.from("commerces").select("*")), ks = ok(await sb.from("compteur").select("*")), cc = ok(await sb.from("comptes_connectes").select("*")), av = ok(await sb.from("avis").select("commerce_id,statut,sensible"));
        const sa = ok(await sb.rpc("admin_sante_clients", {})) || [], ds = ok(await sb.from("demandes_style").select("commerce_id").is("traitee_le", null));
        return cs.map(c => ({ ...c, compteur: ks.find(k => k.commerce_id === c.id), comptes: Object.fromEntries(cc.filter(x => x.commerce_id === c.id).map(x => [x.reseau, x])), alertes: av.filter(a => a.commerce_id === c.id && a.sensible && a.statut === "humain").length,
          sante: sa.find(s => s.commerce_id === c.id) || null, demandes_style: ds.filter(d => d.commerce_id === c.id).length }));
      },
      async adminJournal() { const cs = ok(await sb.from("commerces").select("id,nom")), j = ok(await sb.from("journal").select("*").order("cree_le", { ascending: false }).limit(300)); return j.map(x => ({ ...x, commerce: (cs.find(c => c.id === x.commerce_id) || {}).nom })); },
      async adminAlertes() {
        const cs = ok(await sb.from("commerces").select("id,nom")), n = id => (cs.find(c => c.id === id) || {}).nom;
        const av = ok(await sb.from("avis").select("*").eq("sensible", true).eq("statut", "humain")), j = ok(await sb.from("journal").select("*").in("type", ["REFUS", "LEGENDE_REFUSEE", "ECHEC_PUBLICATION", "SCHEMA_INCOMPLET"]).order("cree_le", { ascending: false }).limit(50)), p = ok(await sb.from("publications").select("*").eq("statut", "echec"));
        const ae = ok(await sb.from("alertes_exploitant").select("*").order("cree_le", { ascending: false }).limit(50));
        const cm = ok(await sb.from("commentaires").select("commerce_id,raisons,texte,cree_le").eq("categorie", "sensible").eq("statut", "humain"));
        return [...av.map(a => ({ type: "Avis sensible", commerce: n(a.commerce_id), texte: (a.raisons || []).join(", ") + " : " + (a.texte || "").slice(0, 100), date: a.cree_le })), ...j.map(x => ({ type: x.type, commerce: n(x.commerce_id), texte: JSON.stringify(x.detail), date: x.cree_le })), ...p.map(x => ({ type: "Publication en échec", commerce: n(x.commerce_id), texte: x.erreur || "", date: x.prevu_le })),
          ...ae.map(a => ({ type: TYPES_ALERTE[a.type] || a.type, commerce: n(a.commerce_id) || "", texte: texteAlerte(a), date: a.cree_le })),
          ...cm.map(x => ({ type: "Commentaire sensible", commerce: n(x.commerce_id), texte: (x.raisons || []).join(", ") + " : " + (x.texte || "texte effacé après 30 jours").slice(0, 100), date: x.cree_le }))];
      },
      async adminCreer(nom, metier, offre, email) { return ok(await sb.rpc("admin_creer_commerce", { p_nom: nom, p_metier: metier, p_offre: offre, p_email: email })); },
      async adminOffre(id, offre) { ok(await sb.rpc("admin_changer_offre", { p_commerce: id, p_offre: offre })); },
      async adminPause(id, pause) { ok(await sb.rpc("admin_mettre_en_pause", { p_commerce: id, p_pause: !!pause })); },
      async adminInvitations() { const cs = ok(await sb.from("commerces").select("id,nom")); return ok(await sb.from("invitations").select("*").order("cree_le", { ascending: false })).map(i => ({ ...i, commerce: (cs.find(c => c.id === i.commerce_id) || {}).nom })); },
    };
    return self;
  }

  window.RENOM_DATA = cfg.supabaseUrl && cfg.publishableKey && window.supabase ? supabase() : demo();
  window.RENOM_OFFRES = OFFRES; window.RENOM_LANCEMENT = LANCEMENT; window.RENOM_RESEAUX = RESEAUX; window.RENOM_VIDEO_AVIS = VIDEO_AVIS; window.RENOM_COMMENTAIRES = COMMENTAIRES; window.RENOM_DEPOT_VIDEO = DEPOT_VIDEO;
  // ---- Collecte : ce dont la page publique a besoin (aucune session, aucune bibliothèque), et la règle du lien d'avis pour l'espace
  window.RENOM_PUBLIC = cfg.supabaseUrl && cfg.publishableKey ? publicSupabase : window.RENOM_DATA;
  window.RENOM_LIEN_AVIS = lienAvisPublic; window.RENOM_RETOUR = RETOUR;
  // ---- Mise à jour de l'espace membre : règles partagées par les écrans et les pages publiques
  window.RENOM_MAJ = { CRENEAUX, LIMITE_GOOGLE, formatDe, reseauxPour, legendeDe, longueur, partiesParis, prochainCreneau, TYPES_ACTION, aujourdhui };
  // ---- Automatisations de service : règles partagées par les écrans
  window.RENOM_AUTO = { AUTO, lireCsvClients, MODELE_CSV, emailValide };
})();
