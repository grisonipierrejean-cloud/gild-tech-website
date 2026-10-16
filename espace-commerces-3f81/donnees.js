// Couche de données de l'espace : UNE interface, DEUX adaptateurs.
//   - démonstration (navigateur seulement, faux services) : config.js vide ;
//   - Supabase : config.js renseigné (supabaseUrl, publishableKey).
// Les écrans n'appellent que RENOM_DATA : passer de l'un à l'autre ne change aucun écran.
(function () {
  const cfg = window.RENOM_CONFIG || {};
  // Offres (moteur/offres.json et moteur/offres_retirees.json, égalité testée par moteur/tests/test_commentaires.js). Trois offres en vente depuis le 16/10/2026 :
  // Essentiel (fiche Google seule), Standard (réseaux retenus), Premium (16 contenus dont 4 vidéos, mode délégation). Unité : contenus originaux par mois
  // (publications + vidéos). Croissance et Signature : retirées (retiree: true), gardées pour un ancien commerce ; jamais proposées. Aucun plafond de commentaires.
  const OFFRES = {
    essentiel: { nom: "Essentiel", contenus: 2, publications: 2, videos: 0, reseaux_sociaux: false, commentaires: false, tiktok: false, avis_auto: false, delegation: false, frais_mise_en_route: false, prix_ht: 79, prix_semestriel_ht: 395 },
    standard: { nom: "Standard", contenus: 8, publications: 8, videos: 0, reseaux_sociaux: true, commentaires: true, tiktok: true, avis_auto: true, delegation: false, frais_mise_en_route: true, prix_ht: 190, prix_semestriel_ht: 950 },
    premium: { nom: "Premium", contenus: 16, publications: 12, videos: 4, reseaux_sociaux: true, commentaires: true, tiktok: true, avis_auto: true, delegation: true, frais_mise_en_route: true, prix_ht: 390, prix_semestriel_ht: 1950 },
    croissance: { nom: "Croissance", contenus: 20, publications: 16, videos: 4, reseaux_sociaux: true, commentaires: true, tiktok: true, avis_auto: true, delegation: false, retiree: true },
    signature: { nom: "Signature", contenus: 32, publications: 24, videos: 8, reseaux_sociaux: true, commentaires: true, tiktok: true, avis_auto: true, delegation: false, retiree: true } };
  const OFFRES_EN_VENTE = Object.keys(OFFRES).filter(k => !OFFRES[k].retiree);
  const MSG_OFFRES = "Offres en vente : Essentiel, Standard, Premium.";
  // Chiffres de la garantie des délais, des relances, de la délégation et du paiement (moteur/conditions_offre.json, conditions_offre() de schema.sql)
  // et frais de mise en route (site/legal.json : Standard et Premium seulement).
  const CONDITIONS = { garantie_delais: { fiche_optimisee_jours: 7, premier_contenu_heures: 72, avis_traite_heures: 24, alerte_fiche_avant_heures: 48, alerte_contenu_avant_heures: 24,
      alerte_avis_avant_heures: 4, contrepartie: "mois_suivant_offert" },
    avis: { collecte_minutes: 15, relances_client_heures: [4, 24] }, delegation: { publication_auto_heures: 48 }, semestriel: { mois_payes: 5, mois_couverts: 6 },
    objectif_interne_pilotes: { nouveaux_avis: 10, jours: 60, rappel_jour: 45, en_vue_pct: 75, fermeture_prolonge_au_dela_de_jours: 7 },
    mise_en_route: { prix_ht: 190, offerts_jusqu_au: "2026-11-30", offres: ["standard", "premium"] } };
  // Réseaux où un commerce peut publier (même règle que reseaux_autorises() de schema.sql et redaction.reseaux_du_commerce) : la fiche Google toujours ;
  // Instagram, Facebook, TikTok si l'offre comprend les réseaux sociaux ET s'ils sont retenus (aucun choix enregistré : ceux de l'offre).
  const reseauxAutorises = c => { const o = OFFRES[(c || {}).offre_id] || {}, ret = Array.isArray((c || {}).reseaux_retenus) ? c.reseaux_retenus : ["instagram", "facebook", "tiktok"];
    return ["instagram", "facebook", "google", "tiktok"].filter(r => r === "google" || (o.reseaux_sociaux && ret.includes(r) && (r !== "tiktok" || o.tiktok))); };
  const FICHE = ["nom", "metier", "ville", "ton", "specialites", "horaires", "mots_cles", "mentions_autorisees", "contact", "email_validation", "couleurs", "reglage_avis", "lien_avis", "notifications", "commentaires_compliments_auto"];
  const RESEAUX = ["facebook", "instagram", "google", "tiktok"];
  // Même refus que le déclencheur a_reseaux_retenus de schema.sql : un réseau hors de l'offre ou non retenu à la mise en route ne se programme pas.
  const horsOffre = (c, r) => { if (!reseauxAutorises(c).includes(r)) throw new Error("réseau non compris dans l'offre ou non retenu pour ce commerce : " + r); };
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
      // apercu_9x16_url : visuel TikTok d'une publication photo (bloc SQL « Aperçus par réseau », 15/10/2026) ; absent d'un lien plus ancien.
      if (r.contenu) { const c = r.contenu; return { ...base, type: c.type, format: c.format, legende: c.legende || "", legendes: c.legendes || null, visuel_url: c.apercu_url || null, visuel_9x16_url: c.apercu_9x16_url || null, video_url: null }; }
      if (r.avis) { const a = r.avis; return { ...base, note: a.note, texte: a.texte || "", auteur: a.auteur || "", reponse_proposee: a.reponse_proposee || "" }; }
      if (r.commentaire) { const m = r.commentaire; return { ...base, reseau: m.reseau, categorie: m.categorie, texte: m.texte || "", auteur: m.auteur || "", reponse_proposee: m.reponse_proposee || "", recu_le: m.recu_le }; }
      return r;
    },
    async validerParJeton(jeton, decision, texte) { await rpcPublic("valider_par_jeton", { p_jeton: String(jeton || ""), p_decision: decision, p_texte: texte == null ? null : String(texte) }); },
    // ---- Tournée du jour (bloc « Prospection quotidienne » de schema.sql) : lien « résultat » de l'email de PJ (resultat.html#<jeton>), sans connexion
    async prospectParJeton(jeton) { return premierDe(await rpcPublic("prospect_par_jeton", { p_jeton: String(jeton || "") })); },
    async resultatParJeton(jeton, resultat, note) { return premierDe(await rpcPublic("resultat_par_jeton", { p_jeton: String(jeton || ""), p_resultat: resultat, p_note: note == null ? null : String(note) })); },
  };
  // Résultats possibles d'un prospect de la tournée et effet (mêmes règles que appliquer_resultat_prospect de schema.sql).
  const RESULTATS_TOURNEE = ["pas_interesse", "rappeler", "rdv", "pilote"];
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
  // Visuel d'un contenu dans le seau « contenus », par réseau : même règle que la publication (moteur/metricool_api.chemin_media,
  // n8n/build_ordre10.py CHEMIN_MEDIA) : story -> visuel-story.jpg ; publication photo -> visuel-9x16.jpg pour TikTok (15/10/2026),
  // visuel-4x5.jpg pour les autres réseaux et sans réseau. Vidéo : son affiche (visuel-4x5.jpg du dossier), jamais le MP4.
  const photoPublication = c => !!c && c.type !== "video" && formatDe(c) === "publication";
  const cheminVisuel = (c, reseau) => {
    if (!c || !c.fichier) return null;
    if (c.type === "video") return c.fichier.slice(0, c.fichier.lastIndexOf("/")) + "/visuel-4x5.jpg";
    return c.fichier + (formatDe(c) === "story" ? "/visuel-story.jpg" : reseau === "tiktok" ? "/visuel-9x16.jpg" : "/visuel-4x5.jpg");
  };
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
  // Avis effacé, ou reçu (entrée dans Renomia) il y a plus de 30 jours. Sans date connue : non.
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
      : /60 secondes/.test(x) ? P.longue : /déjà effacées/.test(x) ? P.efface : /seul un dépôt/.test(x) ? P.relance : /commerce en pause/.test(x) ? "Votre commerce est en pause : contactez Renomia."
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
    if (x.statut === "humain") { if (decision !== "clos") throw new Error("Un commentaire sensible ne reçoit pas de réponse de Renomia : répondez-y vous-même sur le réseau, puis marquez-le comme traité."); return { statut: "clos" }; }
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
      { point: "google", titre: "Donner à Renomia l'accès gestionnaire de votre fiche Google", aide: "Sur business.google.com : Paramètres du profil, Personnes et accès, Ajouter, l'adresse que Renomia vous indique, rôle Gestionnaire. Vous restez propriétaire.", declarable: true },
      { point: "metricool", titre: "Connecter vos réseaux à notre outil de programmation", aide: "Ouvrez le lien de connexion de notre outil de programmation que Renomia vous envoie, puis connectez Facebook et Instagram. Renomia publie ensuite pour vous, seulement ce que vous avez approuvé.", declarable: true },
      { point: "demarrage", titre: "Répondre aux 5 questions de démarrage", aide: "Cinq questions courtes pour que Renomia écrive comme vous. Chacune peut être passée." },
    ],
    ETATS: { a_faire: "À faire", declare: "Fait selon vous, Renomia vérifie", fait: "Fait" },
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
    ABONNEMENT_RESILIE: "Abonnement résilié",
    // Trois offres (bloc « Trois offres » de schema.sql) : garantie des délais, mode délégation, objectif interne des pilotes
    DELAI_FICHE_BIENTOT: "Garantie : fiche à optimiser bientôt", DELAI_CONTENU_BIENTOT: "Garantie : premier contenu à proposer bientôt", DELAI_AVIS_BIENTOT: "Garantie : avis à traiter bientôt",
    MOIS_OFFERT_A_APPLIQUER: "Garantie manquée : mois offert à appliquer", OBJECTIF_PILOTE_J45: "Objectif interne des pilotes : J+45, pas en vue",
    OBJECTIF_PILOTE_NON_ATTEINT: "Objectif interne des pilotes : non atteint", VALIDATION_TACITE_A_PROGRAMMER: "Mode délégation : contenu validé, à programmer" };
  const texteAlerte = a => { const d = a.detail || {};
    if (a.type === "ERREUR_WORKFLOW") return `${d.workflow || "Workflow inconnu"}, nœud ${d.noeud || "inconnu"} : ${d.message || ""}`;
    if (a.type === "PHOTOS_EMAIL_REFUSEES") return `${d.pieces || 0} pièce(s) jointe(s) refusée(s) : ${d.raison || d.statut || ""}. Rien n'a été déposé.`;
    if (a.type === "MISE_EN_ROUTE_BLOQUEE") return `${d.jours} jours après la création, il reste : ${(d.restants || []).map(r => r.point).join(", ")}.`;
    if (a.type === "PAIEMENT_REFUSE") return `Abonnement ${d.abonnement || ""} : appeler le commerçant sous 24 h.${d.test ? " (mode test)" : ""}`;
    if (a.type === "ABONNEMENT_SANS_COMMERCE") return `Abonnement ${d.abonnement || ""} payé sans commerce rattaché : le rattacher dans l'éditeur SQL.${d.test ? " (mode test)" : ""}`;
    if (a.type === "REMISE_LANCEMENT_DEJA_UTILISEE") return `Abonnement ${d.abonnement || ""} : retirer la remise dans Stripe (une fois par commerce).${d.test ? " (mode test)" : ""}`;
    if (a.type === "OBJECTIF_PILOTE_J45") return `${d.gagnes} nouveau(x) avis sur ${d.objectif} au jour ${d.jour} (seuil en vue : ${d.seuil_en_vue}). Objectif interne, aucune conséquence de facturation.`;
    if (a.type === "OBJECTIF_PILOTE_NON_ATTEINT") return `${d.gagnes} nouveau(x) avis sur ${d.objectif} à l'échéance du ${d.echeance}. Objectif interne, aucune conséquence de facturation.`;
    if (/^DELAI_/.test(a.type)) return `Échéance : ${String(d.echeance || "").slice(0, 16).replace("T", " ")} (UTC).`;
    if (a.type === "MOIS_OFFERT_A_APPLIQUER") return `Mois offert : ${d.mois_offert}. L'appliquer à la main dans Stripe, puis le noter dans la console.`;
    if (a.type === "VALIDATION_TACITE_A_PROGRAMMER") return `Contenu validé sans réponse en 48 h, non programmé : ${d.raison || "raison inconnue"}. Le programmer à la main.`;
    if (a.type === "ABONNEMENT_RESILIE") return `Abonnement ${d.abonnement || ""} : arrêter les publications en fin de période, retirer les accès sous 7 jours ouvrés.${d.test ? " (mode test)" : ""}`;
    if (/_A_EFFACER$/.test(a.type)) return `Toujours en attente d'une personne. Texte effacé le ${String(d.efface_le || "").slice(0, 10)} (règle des 30 jours) : à traiter avant.`;
    return JSON.stringify(d); };
  // ---- Paiement Stripe : lien du bouton « Payer / gérer mon abonnement » (adresses publiques de config.js, stripe : {liens, portail, fraisOffertsJusquAu},
  // écrites par outils/stripe_catalogue.py ; liens[offre][rythme][frais], rythme « mensuel » ou « semestriel » (6 mois payés d'avance, 1 offert), frais
  // « offerts » (Standard et Premium, souscription jusqu'au 30/11/2026 inclus), « factures » (190 € HT une fois) ou « sans_frais » (Essentiel). Abonnement en cours : portail client ; aucun abonnement ou
  // abonnement résilié : lien de paiement de l'offre, avec l'identifiant du commerce (client_reference_id, relu par le webhook). Aucun code promotionnel.
  // Rien de configuré : pas de bouton (null). Source : https://docs.stripe.com/payment-links/url-parameters, lue le 14/10/2026.
  const STATUTS_ABONNEMENT = ["en_attente", "actif", "impaye", "resilie"];
  const fraisOfferts = (maintenant, s) => (maintenant || new Date().toISOString().slice(0, 10)) <= ((s && s.fraisOffertsJusquAu) || CONDITIONS.mise_en_route.offerts_jusqu_au);
  function lienAbonnement(ab, c, offre, maintenant, rythme) {
    const s = cfg.stripe || {}, https = u => typeof u === "string" && /^https:\/\/[^\s"<>]+$/.test(u) ? u : null;
    // Abonnement en cours (même impayé) : jamais le lien de paiement, qui créerait un second abonnement ; seulement le portail.
    if (ab && ab.statut !== "resilie") return https(s.portail);
    if (!OFFRES_EN_VENTE.includes(offre)) return null;   // offre retirée : aucun lien de paiement
    const r = ((s.liens || {})[offre] || {})[rythme === "semestriel" ? "semestriel" : "mensuel"] || {};
    // Essentiel : aucuns frais de mise en route, un seul lien (« sans_frais ») ; Standard et Premium : « offerts » jusqu'au 30/11/2026 inclus, puis « factures ».
    const base = https(!(OFFRES[offre] || {}).frais_mise_en_route ? r.sans_frais : fraisOfferts(maintenant, s) ? (r.offerts || r.factures) : r.factures);
    if (!base || !c || !/^[A-Za-z0-9_-]{1,200}$/.test(String(c.id || ""))) return null;
    return base + (base.includes("?") ? "&" : "?") + ["client_reference_id=" + encodeURIComponent(c.id), "locale=fr"].join("&");
  }
  const MODELE_CSV = "prenom;email;date_passage\nCamille;camille@exemple.fr;" + new Date().toISOString().slice(0, 10) + "\n";
  // ---- fin des règles communes des automatisations

  // =============================================================== DÉMONSTRATION
  // Version de production (outils/espace_prod.py) : adaptateur de démonstration retiré, jamais de données fictives.
  function demo() { throw new Error("Configuration absente : config.js doit donner supabaseUrl et publishableKey."); }

  // =============================================================== SUPABASE
  // Adresse de retour du lien de connexion : la page ouverte (index.html ou console.html), dans son dossier, sans fragment ni « ?reset ».
  // Jamais une origine écrite en dur : marche sous un sous-dossier (https://hote/dossier/) comme à la racine d'un domaine.
  // Elle doit figurer dans Supabase, Authentication, URL Configuration, Redirect URLs (sinon Supabase renvoie vers la Site URL).
  function retourConnexion() { const u = new URL(location.href); u.hash = ""; u.searchParams.delete("reset"); return u.href; }
  // config.js renseigné mais bibliothèque Supabase absente (vendor/supabase.js non servi) : JAMAIS la démonstration à la place.
  // L'écran de connexion s'affiche ; toute action dit que le service est indisponible.
  function indisponible() {
    const msg = "Le service ne répond pas (bibliothèque de connexion absente). Rechargez la page ; si cela continue, contactez-nous.";
    return new Proxy({ mode: "indisponible", async session() { return null; }, async estAdmin() { return false; } },
      { get: (o, k) => k in o ? o[k] : k === "then" || typeof k === "symbol" ? undefined : async () => { throw new Error(msg); } });
  }
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
    // Logo : seau « photos », <commerce>/marque/logo-<aléa>.<ext> (règles de stockage : storage.sql pour le commerçant, schema.sql pour Renomia). Un SVG est converti en PNG.
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
      async envoyerLien(e) { ok(await sb.auth.signInWithOtp({ email: e.trim(), options: { shouldCreateUser: false, emailRedirectTo: retourConnexion() } })); return {}; },
      async ouvrirLien() {},
      async quitter() { cache = null; await sb.auth.signOut(); },
      async estAdmin() { const { data } = await sb.auth.getSession(); if (!data.session) return false; const r = ok(await sb.from("admins").select("user_id").eq("user_id", data.session.user.id).maybeSingle()); return !!r; },
      async commerce() {
        if (cache) return cache;
        const m = ok(await sb.from("membres").select("commerce_id").limit(1).maybeSingle());
        if (!m) throw new Error("Aucun commerce n'est rattaché à ce compte. Contactez Renomia.");
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
      // Le commerçant ne règle que son logo, ses expressions et la validation (fonction regler_ma_marque) ; le reste est réglé par Renomia.
      async reglerMaMarque(p, valider) { const r = ok(await sb.rpc("regler_ma_marque", { p: p || {}, p_valider: valider == null ? null : !!valider })); cache = null; return r; },
      async demanderChangementStyle(texte) { return ok(await sb.rpc("demander_changement_style", { p_texte: String(texte || "") })); },
      // ---- Style du commerce réglé par Renomia (console) : fonction admin_regler_marque (n'écrit que commerces.marque ; auteur « renom » posé par la base)
      async adminMarque(cid) { const c = ok(await sb.from("commerces").select("*").eq("id", cid).single()); return { commerce: c, ...(await marqueDe(c)) }; },
      async adminDeposerLogo(cid, f) { return logoDe({ id: cid }, f); },
      async adminEnregistrerMarque(cid, kit, valider) {
        const m = await kitControle({ ...kit, verrouille: !!valider, auto: false }, cid); delete m.valide_par;
        return ok(await sb.rpc("admin_regler_marque", { p_commerce: cid, p_marque: m, p_valider: !!valider }));
      },
      // Fichier publié sur le réseau demandé (cheminVisuel) : une story montre visuel-story.jpg (celui qui part, gabarit « plein »), plus le 9x16
      // de la publication ; une publication photo montre le 9x16 pour TikTok, le 4x5 sinon.
      async urlVisuel(ct, reseau) { const ch = cheminVisuel(ct, reseau); if (!ch) return null; const r = ok(await sb.storage.from("contenus").createSignedUrl(ch, 3600)); return r.signedUrl; },
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
      async avis() { const c = await self.commerce(); return ok(await sb.from("avis").select("id,note,texte,reponse,reponse_proposee,statut,sensible,raisons,decision,cree_le,repondu_le,efface_le,escalade_le").eq("commerce_id", c.id).order("cree_le", { ascending: false }).limit(100)); },
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
      async adminResultatProspect(id, resultat, note) { return ok(await sb.rpc("admin_resultat_prospect", { p_id: id, p_resultat: resultat, p_note: note == null ? null : String(note) })); },
      prospectParJeton: jeton => publicSupabase.prospectParJeton(jeton),
      resultatParJeton: (jeton, resultat, note) => publicSupabase.resultatParJeton(jeton, resultat, note),
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
      // ---- Garanties (bloc « Modèle Vincent » de schema.sql) : file des avis de Renomia, publication notée, garantie des 10 avis
      async maGarantieDelais() { const c = await self.commerce(); return ok(await sb.rpc("ma_garantie_delais", { p_commerce: c.id })); },
      async adminFileAvis() { return ok(await sb.rpc("admin_file_avis", {})) || []; },
      async adminAvisPublie(id, reponse, accord) { ok(await sb.rpc("admin_avis_publie", { p_id: id, p_reponse: reponse, p_accord_client: !!accord })); },
      async adminAvisProposer(id, reponse) { return ok(await sb.rpc("admin_avis_proposer", { p_id: id, p_reponse: reponse })); },
      async adminGarantieDelais() { return ok(await sb.rpc("admin_garantie_delais", {})) || []; },
      async adminDelais(cid, p) { return ok(await sb.rpc("admin_delais", { p_commerce: cid, p: p || {} })); },
      async adminManquement(id, statut, motif) { return ok(await sb.rpc("admin_manquement", { p_id: id, p_statut: statut, p_motif: motif || null })); },
      async adminReseaux(cid, reseaux) { return ok(await sb.rpc("admin_reseaux", { p_commerce: cid, p_reseaux: reseaux })); },
      async adminDelegation(cid, signee) { return ok(await sb.rpc("admin_delegation", { p_commerce: cid, p_signee: !!signee })); },
      async adminCommentairesEquipe() { return ok(await sb.rpc("admin_commentaires_equipe", {})) || []; },
      async adminCommentaireDecider(id, decision, texte) { return ok(await sb.rpc("admin_commentaire_decider", { p_id: id, p_decision: decision, p_texte: texte || null })); },
      async adminGaranties() { return ok(await sb.rpc("admin_garanties", {})) || []; },
      async adminGarantie(cid, p) { return ok(await sb.rpc("admin_garantie", { p_commerce: cid, p: p || {} })); },
      async adminPause(id, pause) { ok(await sb.rpc("admin_mettre_en_pause", { p_commerce: id, p_pause: !!pause })); },
      async adminInvitations() { const cs = ok(await sb.from("commerces").select("id,nom")); return ok(await sb.from("invitations").select("*").order("cree_le", { ascending: false })).map(i => ({ ...i, commerce: (cs.find(c => c.id === i.commerce_id) || {}).nom })); },
    };
    return self;
  }

  window.RENOM_DATA = cfg.supabaseUrl && cfg.publishableKey ? (window.supabase && window.supabase.createClient ? supabase() : indisponible()) : demo();
  window.RENOM_OFFRES = OFFRES; window.RENOM_OFFRES_EN_VENTE = OFFRES_EN_VENTE; window.RENOM_RESEAUX_AUTORISES = reseauxAutorises; window.RENOM_CONDITIONS = CONDITIONS; window.RENOM_RESEAUX = RESEAUX; window.RENOM_VIDEO_AVIS = VIDEO_AVIS; window.RENOM_COMMENTAIRES = COMMENTAIRES; window.RENOM_DEPOT_VIDEO = DEPOT_VIDEO;
  // ---- Collecte : ce dont la page publique a besoin (aucune session, aucune bibliothèque), et la règle du lien d'avis pour l'espace
  window.RENOM_PUBLIC = cfg.supabaseUrl && cfg.publishableKey ? publicSupabase : window.RENOM_DATA;
  window.RENOM_LIEN_AVIS = lienAvisPublic; window.RENOM_RETOUR = RETOUR;
  // ---- Mise à jour de l'espace membre : règles partagées par les écrans et les pages publiques
  window.RENOM_MAJ = { CRENEAUX, LIMITE_GOOGLE, formatDe, reseauxPour, legendeDe, longueur, partiesParis, prochainCreneau, TYPES_ACTION, aujourdhui, photoPublication, cheminVisuel };
  // ---- Automatisations de service : règles partagées par les écrans
  window.RENOM_AUTO = { AUTO, lireCsvClients, MODELE_CSV, emailValide };
})();
