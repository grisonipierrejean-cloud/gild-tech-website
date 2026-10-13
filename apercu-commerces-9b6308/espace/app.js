(function () {
  const D = window.RENOM_DATA, $ = id => document.getElementById(id), vue = $("vue");
  const e = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const JOURS_LONGS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const NOMBRES = ["zéro", "une", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze"];
  const ST_PHOTO = { a_traiter: "À traiter", en_cours: "En cours", traitee: "Traitée", refusee: "Refusée" };
  const ST_CONTENU = { a_valider: "À valider", approuve: "Approuvé", modification: "Modification demandée", programme: "Programmé", publie: "Publié", refuse: "Refusé" };
  const ST_PUB = { programme: "Programmé", envoye: "Envoyé", publie: "Publié", echec: "Échec", annule: "Annulé" };
  const ST_AVIS = { nouveau: "Nouveau", a_valider: "À valider", valide: "Validé, publication en cours", publie: "Réponse publiée", humain: "À traiter par une personne", refuse: "Réponse refusée" };
  const METIERS = { restaurant: "Restaurant", beaute: "Institut de beauté", sport: "Salle de sport ou studio", autre: "Autre commerce" };
  const RES = { facebook: "Facebook", instagram: "Instagram", google: "Fiche Google", tiktok: "TikTok" };
  const ETAT = { non_connecte: "Non connecté", en_attente: "En attente", connecte: "Connecté", erreur: "Erreur" };
  const ETAPES = { PRODUIT: "Contenu créé", PUBLIE: "Publication mise en ligne", PROGRAMME: "Publication programmée", PROGRAMMATION_ANNULEE: "Programmation annulée", IDEES: "Idées proposées",
    CONTENU_APPROUVE: "Contenu approuvé", CONTENU_MODIFICATION: "Modification demandée", CONTENU_REFUSE: "Contenu refusé", REFUS: "Photo refusée", LEGENDE_REFUSEE: "Légende refusée", ECHEC_PUBLICATION: "Publication en échec",
    AVIS_RECU: "Avis reçu", AVIS_A_VALIDER: "Réponse d'avis à valider", AVIS_VALIDE: "Réponse d'avis validée", AVIS_REFUSE: "Réponse d'avis refusée", AVIS_PUBLIE: "Réponse d'avis publiée", AVIS_SENSIBLE: "Avis sensible signalé",
    MISE_EN_PAUSE: "Commerce mis en pause", REPRISE: "Reprise du commerce", OFFRE_CHANGEE: "Offre modifiée", COMMERCE_CREE: "Commerce créé",
    LEGENDE_MODIFIEE: "Légende modifiée par vous", EMAIL_VALIDATION: "Email de validation préparé", ACTION_FICHE: "Action de fiche Google préparée", ACTION_FICHE_VALIDEE: "Action de fiche Google validée",
    ACTION_FICHE_REFUSEE: "Action de fiche Google refusée", ACTION_FICHE_PUBLIEE: "Action de fiche Google publiée", DEMARRAGE: "Démarrage terminé" };
  const M = window.RENOM_MAJ, MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const nombre = (x, d) => Number(x).toLocaleString("fr-FR", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  const moisDe = m => new Date(m.slice(0, 7) + "-15T12:00:00");
  const hm = s => { const [h, mi] = s.split(":").map(Number); return h + " h" + (mi ? " " + String(mi).padStart(2, "0") : ""); };
  const creneauxTexte = metier => (M.CRENEAUX[metier] || M.CRENEAUX.autre).map(hm).join(" et ");

  // ---------------- Dates et heures, en français
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const jourMois = d => { d = new Date(d); return (d.getDate() === 1 ? "1er" : d.getDate()) + " " + MOIS[d.getMonth()]; };
  const date = d => jourMois(d) + (new Date(d).getFullYear() !== new Date().getFullYear() ? " " + new Date(d).getFullYear() : "");
  const heure = d => { d = new Date(d); return d.getHours() + " h " + String(d.getMinutes()).padStart(2, "0"); };
  const heureCourte = d => { d = new Date(d); return d.getHours() + "h" + String(d.getMinutes()).padStart(2, "0"); };
  const dateHeure = d => cap(JOURS_LONGS[new Date(d).getDay()]) + " " + date(d) + ", " + heure(d);
  const memeJour = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const jourRelatif = d => { const j = new Date(d), n = new Date(), h = new Date(Date.now() - 86400000); return memeJour(j, n) ? "Aujourd'hui" : memeJour(j, h) ? "Hier" : cap(date(d)); };
  const jourLocal = d => { d = new Date(d); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const heureLocale = d => { d = new Date(d); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
  const demain = () => jourLocal(Date.now() + 86400000);

  const cut = (s, n) => s.length > n ? s.slice(0, s.lastIndexOf(" ", n)) + "…" : s;
  const msg = t => { const m = $("msg"); if (m) m.textContent = t; };
  const pluriel = (n, un, plusieurs) => n > 1 ? plusieurs : un;
  const urlSure = async x => { try { return x ? await D.urlVisuel(x) : null; } catch (er) { return null; } };
  const videoSure = async x => { try { return x && x.type === "video" ? await D.urlVideo(x) : null; } catch (er) { return null; } };
  $("demo").hidden = D.mode !== "demo";

  // ---------------- Morceaux d'écran partagés
  const pauseBandeau = c => c && c.en_pause ? `<div class="alerte" role="alert"><div><p class="fort">Votre commerce est en pause</p><p>Votre commerce est en pause : aucune nouvelle création ni programmation n'est possible. Contactez RENOM.</p></div></div>` : "";
  const entete = (sur, titre, texte) => `<div class="entete">${sur ? `<p class="sur">${sur}</p>` : ""}<h1>${titre}</h1>${texte ? `<p class="chapo">${texte}</p>` : ""}</div>`;
  const jauge = (u, t) => `<div class="jauge" role="img" aria-label="${u} sur ${t}"><span style="width:${t ? Math.min(100, u / t * 100) : 0}%"></span></div>`;
  const mesure = (nom, u, t) => `<div class="mesure"><div class="mesure-tete"><span>${nom}</span><span><span class="chiffre">${u}</span> sur ${t}</span></div>${jauge(u, t)}</div>`;
  const vignette = u => u ? `<img class="vignette" src="${e(u)}" alt="">` : `<span class="vignette vide" aria-hidden="true"></span>`;
  const FORMAT_LIB = { publication: "Publication, format 4 par 5", story: "Story, format 9 par 16", video: "Vidéo courte, format 9 par 16" };
  const media = (x, u, v) => `<div class="media">${v ? `<video class="visuel" controls preload="metadata" poster="${e(u || "")}" src="${e(v)}"></video>` : u ? `<img class="visuel" src="${e(u)}" alt="Visuel du contenu">` : `<div class="visuel vide">Aperçu non disponible</div>`}</div>`;
  // Les trois décisions sur un contenu à valider : mêmes boutons et mêmes appels sur l'accueil et sur l'écran Contenus.
  // La légende se modifie soi-même (voir blocReseaux) ; « Demander une modification à RENOM » reste pour ce qu'on ne peut pas faire seul, comme le visuel.
  const decisions = (x, refus) => `<div class="actions" data-choix><button type="button" class="bouton" data-a="approuve">Approuver</button><button type="button" class="bouton second" data-a="modif">Demander une modification à RENOM</button><button type="button" class="lien" data-a="refuse">${refus}</button></div>
    <div class="f" data-zone hidden><label for="mot-${e(x.id)}">Votre mot pour RENOM (par exemple sur le visuel)</label><textarea id="mot-${e(x.id)}" data-mot></textarea>
      <div class="actions"><button type="button" class="bouton" data-a="envoyer-modif">Envoyer la demande</button><button type="button" class="lien" data-a="fermer-modif">Annuler</button></div></div>`;
  let approuveRecent = null;   // dernier contenu approuvé : on propose de le programmer au meilleur créneau
  function brancherDecisions(racine, apres) {
    racine.querySelectorAll("[data-contenu]").forEach(a => a.addEventListener("click", async ev => {
      const b = ev.target.closest("[data-a]"); if (!b) return; const id = a.dataset.contenu, act = b.dataset.a, zone = a.querySelector("[data-zone]"), choix = a.querySelector("[data-choix]");
      if (!["approuve", "modif", "fermer-modif", "envoyer-modif", "refuse"].includes(act)) return;
      try {
        if (act === "modif") { zone.hidden = false; choix.hidden = true; a.querySelector("[data-mot]").focus(); return; }
        if (act === "fermer-modif") { zone.hidden = true; choix.hidden = false; return; }
        if (act === "envoyer-modif") await D.valider(id, "modification", a.querySelector("[data-mot]").value);
        else await D.valider(id, act);
        approuveRecent = act === "approuve" ? id : null;
        await apres(); msg("Enregistré."); majCompteurs();
      } catch (er) { msg(er.message); }
    }));
  }
  function brancherAvis(racine, apres) {
    racine.querySelectorAll("[data-avis]").forEach(a => a.addEventListener("click", async ev => {
      const b = ev.target.closest("[data-a]"); if (!b) return;
      try { await D.validerAvis(a.dataset.avis, b.dataset.a, b.dataset.a === "valide" ? a.querySelector("[data-texte]").value : null); await apres(); msg("Enregistré."); majCompteurs(); } catch (er) { msg(er.message); }
    }));
  }
  const reponseAValider = x => `<div class="f"><label for="rep-${e(x.id)}">Réponse proposée, vous pouvez la modifier</label><textarea id="rep-${e(x.id)}" class="haut-texte" data-texte>${e(x.reponse_proposee || "")}</textarea></div>
    <div class="actions"><button type="button" class="bouton" data-a="valide">Valider et publier</button><button type="button" class="lien" data-a="refuse">Refuser cette réponse</button></div>`;
  const etoiles = n => `${n} étoile${n > 1 ? "s" : ""} sur 5`;
  const citation = x => x.texte ? `<p class="citation">« ${e(x.texte)} »</p>` : `<p class="citation">(note sans texte)</p>`;

  // ---------------- Aperçu au format du réseau et légende par réseau (Contenus et Accueil)
  // Un cadre sobre qui rappelle la publication sur chaque réseau. Aucun logo de marque : le nom du réseau suffit.
  const ORDRE_RES = ["instagram", "facebook", "google", "tiktok"];
  const vus = new Map(), choixRes = {};   // contenu affiché (id -> {x, u, v}) ; réseau choisi par contenu
  let nomCommerce = "";
  function cadre(id) {
    const { x, u, v } = vus.get(id), r = choixRes[id] || "instagram", f = M.formatDe(x), vertical = f !== "publication" || r === "tiktok";
    if (!M.reseauxPour(x).includes(r)) return `<div class="cadre-vide"><p class="texte2">${f === "video" ? "Une vidéo" : "Une story"} ne se publie pas sur la fiche Google.</p><p class="note">Choisissez Instagram, Facebook ou TikTok pour voir l'aperçu.</p></div>`;
    const l = M.legendeDe(x, r), n = M.longueur(l), lim = r === "google" ? M.LIMITE_GOOGLE : 0;
    const visuel = v ? `<video class="visuel" controls preload="metadata" poster="${e(u || "")}" src="${e(v)}"></video>` : u ? `<img class="visuel" src="${e(u)}" alt="Visuel du contenu">` : `<div class="visuel vide">Aperçu non disponible</div>`;
    const tete = `<div class="cadre-tete"><span class="avatar" aria-hidden="true">${e((nomCommerce || "R").charAt(0).toUpperCase())}</span><span class="cadre-nom">${e(nomCommerce)}</span><span class="cadre-res">${RES[r]}${f === "story" ? ", story" : ""}</span></div>`;
    const texte = `<p class="cadre-texte" data-legende>${r === "instagram" && f === "publication" ? `<span class="fort">${e(nomCommerce)}</span> ` : ""}${e(l)}</p>`;
    const corps = r === "facebook" ? tete + (f === "publication" ? texte + visuel : visuel + texte) : r === "tiktok" ? visuel + tete + texte : tete + visuel + texte;
    return `<div class="cadre cadre-${r}${vertical ? " vertical" : ""}">${corps}</div>
      <p class="note" data-compte>${nombre(n)} ${pluriel(n, "caractère", "caractères")}${lim ? ` sur ${nombre(lim)} au plus${n > lim ? ", trop long pour la fiche Google" : ""}` : ""}</p>`;
  }
  function blocReseaux(x, u, v) {
    vus.set(x.id, { x, u, v }); const r = choixRes[x.id] || "instagram", modifiable = (x.statut === "a_valider" || x.statut === "approuve") && M.reseauxPour(x).includes(r);
    return `<div class="reseaux" data-reseaux="${e(x.id)}">
      <div class="res-onglets" role="tablist" aria-label="Aperçu par réseau">${ORDRE_RES.map(k => `<button type="button" role="tab" id="t-${e(x.id)}-${k}" data-res="${k}" aria-selected="${k === r}" tabindex="${k === r ? 0 : -1}">${RES[k]}</button>`).join("")}</div>
      <div class="res-panneau" role="tabpanel" aria-labelledby="t-${e(x.id)}-${r}">${cadre(x.id)}</div>
      ${modifiable ? `<div class="f" data-edition hidden><label for="leg-${e(x.id)}">Légende pour ${RES[r]}</label><textarea id="leg-${e(x.id)}" class="haut-texte" data-texte-legende></textarea>
        <p class="note" data-compte-edition aria-live="polite"></p>
        <div class="actions"><button type="button" class="bouton petit" data-a="leg-enregistrer">Enregistrer la légende</button><button type="button" class="lien" data-a="leg-annuler">Annuler</button></div></div>
        <button type="button" class="lien leg-modifier" data-a="leg-modifier">Modifier la légende ${RES[r]}</button>` : ""}
    </div>`;
  }
  const compteEdition = (r, t) => { const n = M.longueur(t), lim = r === "google" ? M.LIMITE_GOOGLE : 0; return `${nombre(n)} ${pluriel(n, "caractère", "caractères")}${lim ? ` sur ${nombre(lim)} au plus` : ""}${lim && n > lim ? ". Trop long pour la fiche Google." : ""}`; };
  function redessinerReseaux(b, focus) {
    const id = b.dataset.reseaux, { x, u, v } = vus.get(id); const t = document.createElement("div"); t.innerHTML = blocReseaux(x, u, v); const neuf = t.firstElementChild; b.replaceWith(neuf);
    if (focus) neuf.querySelector(`[data-res="${choixRes[id]}"]`).focus();
  }
  // Programmer au meilleur créneau : réseaux connectés compatibles avec le format, créneau de départ du métier.
  async function programmerAuto(id) {
    const [x, cpt] = await Promise.all([D.contenus().then(l => l.find(y => y.id === id)), D.comptes()]);
    if (!x) throw new Error("Contenu introuvable.");
    const res = cpt.filter(k => k.etat === "connecte").map(k => k.reseau).filter(r => M.reseauxPour(x).includes(r));
    if (!res.length) throw new Error("Aucun réseau connecté pour ce contenu. Connectez un réseau dans « Comptes connectés ».");
    const t = await D.programmerAuto(id, res); approuveRecent = null;
    return `Programmé ${dateHeure(t).replace(/^./, c => c.toLowerCase())}, sur ${res.map(r => RES[r]).join(", ")}. C'est le prochain créneau libre de départ pour votre métier. Vous pouvez le déplacer dans le calendrier.`;
  }
  const boutonsAuto = (id, metier) => `<div class="actions"><button type="button" class="bouton" data-auto="${e(id)}">Programmer au meilleur créneau</button><a class="bouton second" href="#/calendrier">Choisir moi-même</a></div>
    <p class="note">Créneaux de départ pour votre métier : ${creneauxTexte(metier)}, heure de Paris, au moins 2 heures après maintenant. Ils seront remplacés par vos meilleurs horaires réels quand les statistiques des réseaux seront branchées.</p>`;
  async function proposition(c) {
    if (!approuveRecent) return ""; const x = (await D.contenus()).find(y => y.id === approuveRecent);
    if (!x || x.statut !== "approuve") { approuveRecent = null; return ""; }
    return `<section class="carte proposition" id="proposition"><div><p class="fort">Contenu approuvé. Le programmer maintenant ?</p><p class="texte2">RENOM le place au prochain créneau libre, sur vos réseaux connectés.</p></div>${boutonsAuto(x.id, c.metier)}</section>`;
  }
  // Un seul écouteur pour tout l'écran : onglets de réseau, édition de la légende, programmation au meilleur créneau.
  let ecranCourant = null;
  vue.addEventListener("click", async ev => {
    const onglet = ev.target.closest("[data-res]");
    if (onglet) { const b = onglet.closest("[data-reseaux]"); choixRes[b.dataset.reseaux] = onglet.dataset.res; redessinerReseaux(b, true); return; }
    const auto = ev.target.closest("[data-auto]");
    if (auto) { auto.disabled = true; try { const m = await programmerAuto(auto.dataset.auto); await ecranCourant(); msg(m); majCompteurs(); } catch (er) { auto.disabled = false; msg(er.message); } return; }
    const a = ev.target.closest("[data-a^='leg-']"); if (!a) return;
    const b = a.closest("[data-reseaux]"), id = b.dataset.reseaux, r = choixRes[id] || "instagram", ed = b.querySelector("[data-edition]"), ta = b.querySelector("[data-texte-legende]"), bt = b.querySelector(".leg-modifier");
    if (a.dataset.a === "leg-modifier") { ta.value = M.legendeDe(vus.get(id).x, r); b.querySelector("[data-compte-edition]").textContent = compteEdition(r, ta.value); ed.hidden = false; bt.hidden = true; ta.focus(); return; }
    if (a.dataset.a === "leg-annuler") { ed.hidden = true; bt.hidden = false; bt.focus(); return; }
    try { await D.modifierLegende(id, r, ta.value); await ecranCourant(); msg(`Légende ${RES[r]} enregistrée.`); } catch (er) { msg(er.message); }
  });
  vue.addEventListener("input", ev => { const ta = ev.target.closest("[data-texte-legende]"); if (!ta) return; const b = ta.closest("[data-reseaux]"); b.querySelector("[data-compte-edition]").textContent = compteEdition(choixRes[b.dataset.reseaux] || "instagram", ta.value); });
  vue.addEventListener("keydown", ev => {
    const t = ev.target.closest("[data-res]"); if (!t || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(ev.key)) return; ev.preventDefault();
    const i = ORDRE_RES.indexOf(t.dataset.res), j = ev.key === "Home" ? 0 : ev.key === "End" ? 3 : (i + (ev.key === "ArrowRight" ? 1 : 3)) % 4, b = t.closest("[data-reseaux]");
    choixRes[b.dataset.reseaux] = ORDRE_RES[j]; redessinerReseaux(b, true);
  });

  // ---------------- Navigation : barre latérale sur ordinateur, onglets du bas sur téléphone
  // Barre latérale : Accueil, Résultats, Créer, Publier, Réputation, Mon commerce. Téléphone : 5 onglets (le calendrier rejoint Créer).
  const GROUPES = [
    { id: "accueil", nom: "Accueil", ecrans: ["accueil"], seul: true },
    { id: "resultats", nom: "Résultats", ecrans: ["resultats"], seul: true },
    { id: "creer", nom: "Créer", ecrans: ["photos", "contenus"], compte: "contenus" },
    { id: "publier", nom: "Publier", ecrans: ["calendrier"], mobile: "creer" },
    { id: "reputation", nom: "Réputation", court: "Avis", ecrans: ["avis", "collecte", "fichegoogle"], compte: "avis" },
    { id: "commerce", nom: "Mon commerce", court: "Commerce", ecrans: ["fiche", "offre", "comptes", "notifications"] },
  ];
  const ECRANS = { accueil: "Accueil", resultats: "Résultats", photos: "Photos", contenus: "Contenus", calendrier: "Calendrier", avis: "Avis Google", collecte: "Collecte d'avis", fichegoogle: "Fiche Google",
    fiche: "Fiche", offre: "Offre", comptes: "Comptes connectés", notifications: "Notifications", demarrage: "Démarrage" };
  // Anciennes adresses : elles mènent toujours quelque part (aucun lien cassé).
  const ANCIENNES = { idees: "contenus" };
  const groupesMobile = () => GROUPES.filter(g => !g.mobile).map(g => ({ ...g, ecrans: [...g.ecrans, ...GROUPES.filter(x => x.mobile === g.id).flatMap(x => x.ecrans)] }));
  const trait = d => `<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICONES = {
    accueil: trait('<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"></path>'),
    resultats: trait('<path d="M4 20h16"></path><path d="M6 16l4-5 3 3 5-7"></path>'),
    creer: trait('<rect x="4" y="4" width="16" height="16" rx="3"></rect><path d="M4 16l4.5-4.5 4 4 3-3L20 17"></path>'),
    publier: trait('<rect x="4" y="5" width="16" height="15" rx="3"></rect><path d="M4 10h16M9 3v4M15 3v4"></path>'),
    reputation: trait('<path d="M12 4l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z"></path>'),
    commerce: trait('<path d="M4 10l1.5-5h13L20 10"></path><path d="M5 10v10h14V10"></path><path d="M4 10h16M10 20v-5h4v5"></path>'),
  };
  const APPAREIL = trait('<path d="M4 8h3l2-3h6l2 3h3v11H4z"></path><circle cx="12" cy="13" r="3.5"></circle>');
  const large = window.matchMedia("(min-width: 900px)");
  const nb = { contenus: 0, avis: 0 }; let offreNom = "", route = "accueil", connecte = false;
  const compte = k => `<span class="nb" data-nb="${k}"${nb[k] ? "" : " hidden"}><span data-n>${nb[k] || ""}</span><span class="vh"> à traiter</span></span>`;
  const lienMenu = r => `<a href="#/${r}" data-r="${r}"${r === route ? ' aria-current="page"' : ""}><span>${ECRANS[r]}</span>${r === "contenus" || r === "avis" ? compte(r) : r === "collecte" ? compte("retours") : ""}</a>`;
  function dessinerNav() {
    document.body.classList.toggle("hors-session", !connecte);
    const lat = $("lat"), haut = $("haut"), sous = $("sous"), onglets = $("onglets");
    lat.innerHTML = haut.innerHTML = sous.innerHTML = onglets.innerHTML = "";
    if (!connecte) return;
    if (large.matches) {
      lat.innerHTML = `<div class="lat-in"><a class="logo" href="#/accueil">RENOM</a><nav id="nav" class="menu" aria-label="Navigation de l'espace"><div class="groupe">${GROUPES.filter(g => g.seul).map(g => lienMenu(g.ecrans[0])).join("")}</div>${GROUPES.filter(g => !g.seul).map(g =>
        `<div class="groupe"><p class="groupe-lib">${g.nom}</p>${g.ecrans.map(lienMenu).join("")}</div>`).join("")}</nav><button type="button" id="sortir" class="quitter">Quitter</button></div>`;
      return;
    }
    const GM = groupesMobile(), actif = GM.find(g => g.ecrans.includes(route)) || GM[0];
    haut.innerHTML = `<a class="logo" href="#/accueil">RENOM</a><span class="haut-note" id="haut-offre">${offreNom ? "Offre " + e(offreNom) : ""}</span>`;
    sous.innerHTML = actif.ecrans.length > 1 ? actif.ecrans.map(lienMenu).join("") + (actif.id === "commerce" ? `<button type="button" id="sortir" class="quitter">Quitter</button>` : "") : "";
    sous.setAttribute("aria-label", actif.nom);
    // Chaque onglet mène au premier écran de son groupe ; data-ecrans liste tous les écrans du groupe.
    onglets.innerHTML = GM.map(g => `<a href="#/${g.ecrans[0]}" data-r="${g.ecrans[0]}" data-ecrans="${g.ecrans.join(" ")}"${g === actif ? ` aria-current="${g.ecrans[0] === route ? "page" : "true"}"` : ""}>
      <span class="onglet-icone">${ICONES[g.id]}${g.compte ? compte(g.compte) : ""}</span><span>${g.court || g.nom}</span></a>`).join("");
  }
  async function majCompteurs() {
    try {
      const [ct, av, k] = await Promise.all([D.contenus(), D.avis(), D.compteur()]);
      nb.contenus = ct.filter(x => x.statut === "a_valider").length;
      nb.avis = av.filter(x => (x.statut === "a_valider" && !x.sensible) || x.statut === "humain").length;
      offreNom = k.offre_nom || "";
      nb.retours = await retoursNonLus(); nb.reputation = nb.avis + nb.retours;   // ---- Collecte
    } catch (er) { return; }
    document.querySelectorAll("[data-nb]").forEach(s => { const n = nb[s.dataset.nb]; s.hidden = !n; s.querySelector("[data-n]").textContent = n || ""; });
    const o = $("haut-offre"); if (o) o.textContent = offreNom ? "Offre " + offreNom : "";
  }

  // ---------------- Connexion
  // Démonstration : les comptes affichés sont ceux de la graine chargée (parcours ou graine publique), jamais écrits en dur.
  const comptesTexte = l => { const t = l.map(x => `${x.email} (${x.role === "administrateur" ? "console" : x.commerce || "commerçant"})`); return t.length > 1 ? t.slice(0, -1).join(", ") + " ou " + t[t.length - 1] : t.join(""); };
  async function connexion() {
    const comptesDemo = D.mode === "demo" && D.comptesDemo ? await D.comptesDemo() : [];
    vue.innerHTML = `<div class="connexion"><div class="carte">
      <p class="logo">RENOM</p>
      <div class="entete"><h1>Votre espace</h1><p class="chapo">Saisissez l'adresse email de votre compte. Nous vous envoyons un lien de connexion : pas de mot de passe à retenir.</p></div>
      <form id="f"><div class="f"><label for="email">Adresse email</label><input id="email" name="email" type="email" autocomplete="email" required></div>
      <button class="bouton plein" type="submit">Recevoir le lien</button><p class="msg" id="msg" role="status"></p></form>
      ${comptesDemo.length ? `<div class="entrer-demo" id="entrer-demo"><p class="fort">Visite directe de la démonstration</p>${comptesDemo.map(c => `<button type="button" class="bouton second" data-entrer="${e(c.email)}">${c.role === "administrateur" ? "Console de l'exploitant" : e(c.commerce || c.email)}</button>`).join("")}</div>
      <p class="note" id="comptes-demo">Démonstration : saisissez ${e(comptesTexte(comptesDemo))}.</p>` : ""}</div>
      <p class="retour"><a href="../">Retour au site</a></p></div>`;
    const entrer = async em => { await D.ouvrirLien(em); if (await D.estAdmin()) location.href = "console.html"; else aller("accueil"); };
    document.querySelectorAll("[data-entrer]").forEach(b => { b.onclick = () => entrer(b.dataset.entrer); });
    $("f").onsubmit = async ev => {
      ev.preventDefault(); msg("Envoi en cours.");
      try {
        const r = await D.envoyerLien($("email").value);
        if (D.mode === "demo") { $("msg").innerHTML = `Lien de démonstration prêt. <button type="button" class="lien" id="ouvrir">Ouvrir le lien</button>`; $("ouvrir").onclick = async () => { await D.ouvrirLien(r.lien); const adm = await D.estAdmin(); if (adm) location.href = "console.html"; else aller("accueil"); }; }
        else msg("Si ce compte existe, un lien de connexion vient de vous être envoyé. Ouvrez-le depuis cet appareil.");
      } catch (er) { msg(er.message); }
    };
  }

  // ---------------- Accueil
  // Bilan du mois : 4 chiffres au plus et une phrase. Mêmes données que l'email du 1er du mois (fonction bilan_mois).
  const bandeauDemo = () => D.mode === "demo" ? `<div class="bandeau-demo" role="note"><p class="fort">Chiffres de démonstration</p><p>Ces chiffres sont fictifs. En service, ils viennent des relevés mensuels de votre fiche Google et de votre espace.</p></div>` : "";
  function bilanBloc(b) {
    if (!b) return "";
    const m = moisDe(b.mois || k0()), notes = b.note_debut != null && b.note_fin != null, n = x => +x || 0;
    const morceaux = [`RENOM a publié ${n(b.reponses_publiees)} ${pluriel(n(b.reponses_publiees), "réponse", "réponses")} à vos avis et ${n(b.publications)} ${pluriel(n(b.publications), "publication", "publications")}.`,
      `Vous avez obtenu ${n(b.avis_obtenus)} ${pluriel(n(b.avis_obtenus), "nouvel avis", "nouveaux avis")}${notes ? (b.note_fin === b.note_debut ? ` et votre note reste à ${nombre(b.note_fin, 1)}.` : ` et votre note passe de ${nombre(b.note_debut, 1)} à ${nombre(b.note_fin, 1)}.`) : "."}`];
    if (n(b.a_valider)) morceaux.push(n(b.a_valider) === 1 ? "Une chose attend votre accord." : `${n(b.a_valider)} choses attendent votre accord.`);
    const chiffre = (lib, val) => `<div class="bilan-chiffre"><dt>${lib}</dt><dd class="chiffre">${val}</dd></div>`;
    return `<section class="carte bilan" aria-labelledby="bilan-titre"><div class="carte-tete"><h2 id="bilan-titre">Votre mois ${/^[aeiouyéè]/i.test(MOIS[m.getMonth()]) ? "d'" : "de "}${MOIS[m.getMonth()]}</h2><span class="note">À ce jour</span></div>
      ${D.mode === "demo" ? `<p class="note bilan-demo"><span class="fort">Chiffres de démonstration.</span> En service, ces chiffres viennent de votre fiche Google et de votre espace.</p>` : ""}
      <p class="texte2">${morceaux.join(" ")}</p>
      <dl class="bilan-chiffres">${chiffre("Réponses publiées", nombre(n(b.reponses_publiees)))}${chiffre("Publications", nombre(n(b.publications)))}${chiffre("Note Google", notes ? nombre(b.note_fin, 1) : "Pas de relevé")}${chiffre("Avis obtenus", nombre(n(b.avis_obtenus)))}</dl>
      <p class="pied"><a href="#/resultats">Voir tous vos résultats</a></p></section>`;
  }
  const k0 = () => new Date().toISOString().slice(0, 7) + "-01";
  const plusTard = id => { try { return localStorage.getItem("renom-demarrage-plus-tard:" + id) === "1"; } catch (er) { return false; } };
  async function accueil() {
    const c0 = await D.commerce();
    if (!c0.demarrage_fini && !plusTard(c0.id)) return demarrage();
    const [c, k, p, ct, av, cal, bilan] = await Promise.all([D.commerce(), D.compteur(), D.photos(), D.contenus(), D.avis(), D.calendrier(), D.bilanMois().catch(() => null)]);
    nomCommerce = c.nom;
    const aValider = ct.filter(x => x.statut === "a_valider"), reponses = av.filter(x => x.statut === "a_valider" && !x.sensible), humains = av.filter(x => x.statut === "humain");
    const prochaines = cal.filter(x => x.statut === "programme").slice(0, 3), premier = aValider[0], avis1 = reponses[0], dernier = premier ? null : (ct.find(x => x.statut !== "refuse") || ct[0]);
    const [u1, v1, ...vign] = await Promise.all([urlSure(premier || dernier), videoSure(premier || dernier), ...prochaines.map(x => urlSure(x.contenu))]);
    const mois = new Date(k.mois + "T12:00:00"), n = aValider.length + reponses.length + humains.length;
    const phrase = !n ? "Tout est à jour." : n === 1 ? "Une chose vous attend aujourd'hui." : `${cap(NOMBRES[n] || String(n))} choses vous attendent aujourd'hui.`;
    const raisons = [...new Set(humains.flatMap(x => x.raisons || []))];
    const ficheRemplie = c.specialites || c.ton || c.horaires;
    vue.innerHTML = `${pauseBandeau(c)}
      <div class="entete-accueil"><div class="entete"><p class="sur">Bonjour</p><h1>${e(c.nom)}</h1><p class="chapo">${phrase}</p></div>
        <a class="bouton grand" href="#/photos">${APPAREIL}<span>Déposer des photos</span></a></div>
      <p class="msg" id="msg" role="status"></p>
      ${!c.demarrage_fini ? `<section class="alerte"><div><p class="fort">Votre démarrage n'est pas terminé</p><p>Cinq questions pour que RENOM écrive comme vous. Chacune peut être passée.</p></div><a class="bouton second" href="#/demarrage">Reprendre le démarrage</a></section>` : ""}
      ${bilanBloc(bilan)}
      ${await proposition(c)}
      <div class="rangee">
        <section class="carte large"${premier ? ` data-contenu="${e(premier.id)}"` : ""}>
          <div class="carte-tete"><h2>${premier ? "Un contenu à valider" : "Aucun contenu à valider"}</h2>${aValider.length > 1 ? `<a href="#/contenus">Voir les ${aValider.length}</a>` : `<a href="#/contenus">Ouvrir les contenus</a>`}</div>
          ${premier ? `<div class="apercu-reseaux">${blocReseaux(premier, u1, v1)}<div class="apercu-texte">
            <p class="meta">${FORMAT_LIB[M.formatDe(premier)]}</p>
            <p class="note visible">Légende écrite à partir de votre photo et de votre fiche. Vous pouvez la modifier vous-même, réseau par réseau. Rien ne sort sans votre accord.</p>${decisions(premier, "Refuser")}</div></div>`
          : dernier ? `<div class="apercu${v1 ? " avec-video" : ""}">${media(dernier, u1, v1)}<div class="apercu-texte">
            <p class="meta">Dernier contenu créé : ${dernier.type === "video" ? "vidéo courte" : "publication"}, ${jourRelatif(dernier.cree_le).toLowerCase()}</p><p class="legende">${e(dernier.legende || "")}</p>
            <p class="etat">${ST_CONTENU[dernier.statut] || e(dernier.statut)}</p></div></div>`
          : `<p class="texte2">Les contenus créés à partir de vos photos arrivent ici. Vous les approuvez, vous demandez une modification ou vous les refusez.</p>`}
        </section>
        <section class="carte etroite">
          <div class="carte-tete"><h2>Offre ${e(k.offre_nom)}</h2><span class="note">${cap(MOIS[mois.getMonth()])} ${mois.getFullYear()}</span></div>
          ${mesure("Publications", k.publications_utilisees, k.publications_plafond)}
          ${k.videos_plafond ? mesure("Vidéos", k.videos_utilisees, k.videos_plafond) : `<div class="mesure-tete"><span>Vidéos</span><span class="note">Non comprises dans votre offre</span></div>`}
          <div class="pied"><p class="note">Le compteur repart à zéro le 1er ${MOIS[(mois.getMonth() + 1) % 12]}.</p><a href="#/offre">Voir votre offre</a></div>
        </section>
      </div>
      <div class="rangee">
        <section class="carte moitie"${avis1 ? ` data-avis="${e(avis1.id)}"` : ""}>
          <div class="carte-tete"><h2>${avis1 ? "Une réponse d'avis à valider" : "Aucune réponse d'avis à valider"}</h2>${avis1 ? `<span class="note">${etoiles(avis1.note)}</span>` : ""}</div>
          ${avis1 ? `${citation(avis1)}${reponseAValider(avis1)}${reponses.length > 1 ? `<p class="note pied"><a href="#/avis">Voir les ${reponses.length} réponses à valider</a></p>` : ""}`
          : `<p class="texte2">${c.reglage_avis === "tout_automatique" ? "Toutes les réponses sont publiées automatiquement." : "Les réponses aux avis de 1 à 3 étoiles attendent ici votre accord avant d'être publiées."}</p><p class="pied"><a href="#/avis">Ouvrir les avis</a></p>`}
        </section>
        <section class="carte moitie">
          <div class="carte-tete"><h2>Prochaines publications</h2></div>
          ${prochaines.length ? `<ul class="liste">${prochaines.map((x, i) => `<li class="avec-vignette">${vignette(vign[i])}<div><p class="fort">${dateHeure(x.prevu_le)}</p><p class="note">${x.reseaux.map(r => RES[r]).join(", ")}</p></div></li>`).join("")}</ul>`
          : `<p class="texte2">Rien de programmé. Les contenus approuvés se programment dans le calendrier.</p>`}
          <p class="pied"><a href="#/calendrier">Ouvrir le calendrier</a></p>
        </section>
      </div>
      ${humains.length ? `<section class="alerte"><div><p class="fort">${humains.length > 1 ? humains.length + " avis demandent votre attention" : "Un avis demande votre attention"}</p>
        <p>${raisons.length ? "Motif signalé : " + e(raisons.join(", ")) + ". " : ""}Aucune réponse n'a été préparée : c'est à vous de ${humains.length > 1 ? "les" : "le"} traiter.</p></div><a class="bouton second" href="#/avis">Lire ${humains.length > 1 ? "les avis" : "l'avis"}</a></section>` : ""}
      <div class="rangee">
        <section class="carte moitie"><div class="carte-tete"><h2>Où vous en êtes</h2></div>
          <ul class="liste"><li><a href="#/contenus">Contenus à valider</a><span class="fort">${aValider.length}</span></li>
          <li><a href="#/avis">Réponses d'avis à valider</a><span class="fort">${reponses.length}</span></li>
          <li><a href="#/avis">Avis à traiter par une personne</a><span class="fort">${humains.length}</span></li>
          <li><a href="#/photos">Photos en attente de traitement</a><span class="fort">${p.filter(x => x.statut === "a_traiter").length}</span></li></ul></section>
        <section class="carte moitie"><div class="carte-tete"><h2>Votre fiche</h2><span class="note">${e(METIERS[c.metier] || "")}${c.ville ? ", " + e(c.ville) : ""}</span></div>
          <p class="texte2">${ficheRemplie ? "Votre fiche est renseignée. Vérifiez-la dès que quelque chose change." : "Votre fiche est vide : RENOM n'écrit que ce qu'elle contient. Renseignez-la avant de déposer vos premières photos."}</p>
          <p class="pied"><a class="bouton second" href="#/fiche">Ouvrir la fiche</a></p></section>
      </div>`;
    brancherDecisions(vue, accueil); brancherAvis(vue, accueil);
  }

  // ---------------- Fiche
  async function fiche() {
    const c = await D.commerce(), v = k => e(c[k] ?? ""), co = c.couleurs || {};
    const dm = c.demarrage || {}, rep = (lib, val) => `<li><span class="note">${lib}</span><span>${val ? e(val) : `<span class="note">Pas de réponse</span>`}</span></li>`;
    vue.innerHTML = `${entete("Votre fiche", "Ce que RENOM peut dire de vous", "RENOM n'écrit que ce que cette fiche contient. Écrivez seulement ce qui est vrai.")}
    <section class="carte fiche demarrage-resume"><div class="carte-tete"><h2>Vos réponses de démarrage</h2><a href="#/demarrage">${c.demarrage_fini ? "Modifier vos réponses" : "Répondre aux 5 questions"}</a></div>
      ${c.demarrage ? `<ul class="liste reponses">${rep("Votre commerce en une phrase", dm.phrase)}${rep("Ce qui vous distingue", dm.distinctions)}${rep("Le ton", TONS_LIB[dm.ton])}${rep("Ce qu'on ne doit jamais dire ni promettre", dm.interdits)}${rep("L'action demandée aux clients", dm.action ? ACTIONS_LIB[dm.action] + (dm.action_detail ? " : " + dm.action_detail : "") : "")}</ul>`
      : `<p class="texte2">Cinq questions, une à la fois, pour que RENOM écrive comme vous. Vos réponses préremplissent cette fiche.</p>`}</section>
    <form id="f" class="fiche">
      <section class="carte"><h2>Votre commerce</h2><div class="champs">
        <div class="f toute"><label for="nom">Nom du commerce</label><input id="nom" type="text" value="${v("nom")}" required></div>
        <div class="f"><label for="metier">Métier</label><select id="metier">${Object.entries(METIERS).map(([k, l]) => `<option value="${k}"${c.metier === k ? " selected" : ""}>${l}</option>`).join("")}</select></div>
        <div class="f"><label for="ville">Ville</label><input id="ville" type="text" value="${v("ville")}"></div>
        <div class="f toute"><label for="horaires">Horaires</label><textarea id="horaires">${v("horaires")}</textarea></div></div></section>
      <section class="carte"><h2>Ce que vous proposez</h2><div class="champs">
        <div class="f toute"><label for="specialites">Spécialités ou prestations</label><textarea id="specialites">${v("specialites")}</textarea><p class="aide">Écrivez seulement ce qui est vrai : RENOM n'affirmera rien d'autre.</p></div>
        <div class="f toute"><label for="ton">Ton souhaité</label><input id="ton" type="text" value="${v("ton")}"><p class="aide">Par exemple : chaleureux et simple.</p></div>
        <div class="f"><label for="mots_cles">Mots-clés, séparés par des virgules</label><input id="mots_cles" type="text" value="${e((c.mots_cles || []).join(", "))}"></div>
        <div class="f"><label for="mentions">Mentions que vous autorisez, séparées par des virgules</label><input id="mentions" type="text" value="${e((c.mentions_autorisees || []).join(", "))}"><p class="aide">Par exemple « fait maison » ou « bio ». RENOM n'emploiera ces mots que si vous les écrivez ici.</p></div></div></section>
      <section class="carte"><h2>Contact et alertes</h2><div class="champs">
        <div class="f"><label for="contact">Contact à donner aux clients mécontents</label><input id="contact" type="text" value="${v("contact")}"></div>
        <div class="f"><label for="email_validation">Email pour vos alertes</label><input id="email_validation" type="email" value="${v("email_validation")}"></div></div></section>
      <section class="carte"><h2>Avis Google</h2>
        <div class="f"><label for="lien_avis">Lien pour laisser un avis Google</label><input id="lien_avis" type="url" value="${v("lien_avis")}"><p class="aide">Copiez-le depuis business.google.com : Lire les avis, puis Obtenir plus d'avis.</p></div>
        <fieldset><legend>Réponses aux avis Google</legend>
          <label class="option"><input type="radio" name="reglage" value="auto_des_4_etoiles"${c.reglage_avis !== "tout_automatique" ? " checked" : ""}><span>Automatiques à partir de 4 étoiles, vous validez les avis de 1 à 3 étoiles</span></label>
          <label class="option"><input type="radio" name="reglage" value="tout_automatique"${c.reglage_avis === "tout_automatique" ? " checked" : ""}><span>Toutes automatiques</span></label>
          <p class="aide">Un avis qui parle de santé, d'accident, d'accusation grave ou de menace n'est jamais traité automatiquement : vous êtes alerté.</p></fieldset></section>
      <section class="carte"><h2>Vos couleurs</h2><div class="coul">
        <div class="f"><input id="c_fond" type="color" value="${e(co.fond || "#FFFFFF")}"><label for="c_fond">Fond</label></div>
        <div class="f"><input id="c_texte" type="color" value="${e(co.texte || "#000000")}"><label for="c_texte">Texte</label></div>
        <div class="f"><input id="c_accent" type="color" value="${e(co.accent || "#2438FF")}"><label for="c_accent">Accent</label></div></div></section>
      <div class="actions pied-formulaire"><button class="bouton" type="submit">Enregistrer</button><p class="msg" id="msg" role="status"></p></div></form>`;
    const liste = id => $(id).value.split(",").map(s => s.trim()).filter(Boolean);
    $("f").onsubmit = async ev => {
      ev.preventDefault();
      try {
        await D.enregistrer({ nom: $("nom").value.trim(), metier: $("metier").value, ville: $("ville").value.trim(), specialites: $("specialites").value.trim(), horaires: $("horaires").value.trim(), ton: $("ton").value.trim(),
          mots_cles: liste("mots_cles"), mentions_autorisees: liste("mentions"), contact: $("contact").value.trim(), email_validation: $("email_validation").value.trim(), lien_avis: $("lien_avis").value.trim(),
          couleurs: { fond: $("c_fond").value, texte: $("c_texte").value, accent: $("c_accent").value }, reglage_avis: document.querySelector("input[name=reglage]:checked").value });
        msg("Fiche enregistrée.");
      } catch (er) { msg("Échec de l'enregistrement : " + er.message); }
    };
  }

  // ---------------- Photos
  async function photos() {
    const [c, l] = await Promise.all([D.commerce(), D.photos()]);
    vue.innerHTML = `${pauseBandeau(c)}${entete("Créer", "Vos photos", "Déposez les photos de votre commerce : chacune sert à créer un contenu, que vous validez ensuite.")}
      <div class="rangee">
        <section class="carte moitie"><h2>Déposer des photos</h2>
          <form id="f"><div class="f"><div class="depot"><input id="fichiers" class="vh" type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple><label for="fichiers" class="bouton second">Choisir des photos</label><span class="note" id="choisies" aria-live="polite">Aucune photo choisie</span></div>
          <p class="aide">JPEG, PNG, WebP ou HEIC, 50 Mo au plus chacune.</p></div>
          <button class="bouton" type="submit">Envoyer</button><p class="msg" id="msg" role="status"></p></form></section>
        <section class="carte moitie"><div class="carte-tete"><h2>Déjà déposées</h2>${l.length ? `<span class="note">${l.length} ${pluriel(l.length, "photo", "photos")}</span>` : ""}</div>
          ${l.length ? `<ul class="liste">${l.map(x => `<li><div><p class="fort casse">${e(x.nom_fichier || "Photo")}</p><p class="note">${cap(date(x.cree_le))}</p></div><span class="etat">${ST_PHOTO[x.statut] || e(x.statut)}</span></li>`).join("")}</ul>` : `<p class="texte2">Aucune photo pour le moment.</p>`}</section>
      </div>`;
    $("fichiers").onchange = () => { const fs = [...$("fichiers").files]; $("choisies").textContent = !fs.length ? "Aucune photo choisie" : fs.length === 1 ? fs[0].name : fs.length + " photos choisies"; };
    $("f").onsubmit = async ev => {
      ev.preventDefault(); const fs = [...$("fichiers").files];
      if (!fs.length) { msg("Choisissez au moins une photo."); return; }
      let ok = 0; const erreurs = [];
      for (const f of fs) { msg(`Envoi de ${f.name}.`); try { await D.deposer(f); ok++; } catch (er) { erreurs.push(f.name + " : " + er.message); } }
      await photos(); msg(`${ok} photo(s) déposée(s).` + (erreurs.length ? " Refusée(s) : " + erreurs.join(" ; ") : ""));
    };
  }

  // ---------------- Contenus
  const FILTRES = [["a_valider", "À valider"], ["approuve", "Approuvés"], ["programme", "Programmés"], ["publie", "Publiés"], ["autres", "Autres"]];
  const VIDE_FILTRE = { a_valider: "Rien à valider pour le moment.", approuve: "Aucun contenu approuvé en attente de programmation.", programme: "Aucun contenu programmé.", publie: "Aucun contenu publié pour le moment.", autres: "Aucun contenu en modification ni refusé." };
  const famille = x => FILTRES.some(f => f[0] === x.statut) ? x.statut : "autres";
  let filtre = null;
  // Les idées sont fusionnées dans Contenus : bouton « Proposer des idées », qui ouvre le panneau des idées.
  let ideesOuvertes = false;
  async function panneauIdees(c) {
    const [k, l] = await Promise.all([D.compteur(), D.idees()]), plein = k.publications_utilisees >= k.publications_plafond;
    return `<section class="carte" id="idees" aria-labelledby="idees-titre"><div class="carte-tete"><h2 id="idees-titre">Proposer des idées</h2><button type="button" class="lien" id="fermer-idees">Fermer</button></div>
        <p class="texte2">Des idées de publications liées à votre fiche et aux temps forts de votre métier. <strong>Une demande compte pour une publication de votre offre</strong> : ${k.publications_utilisees} sur ${k.publications_plafond} utilisées ce mois-ci.</p>
        <div class="actions"><button type="button" class="bouton" id="demande"${plein || c.en_pause ? " disabled" : ""}>Demander des idées</button><p class="msg" id="msg-idees" role="status">${plein ? "Le plafond de votre offre est atteint ce mois-ci." : ""}</p></div>
        ${l.length ? `<ul class="liste idees">${l.map(x => `<li><div><p class="fort">${e(x.titre)}</p><p class="texte2">${e(x.texte)}</p></div><span class="note">${cap(date(x.cree_le))}</span></li>`).join("")}</ul>` : `<p class="texte2">Aucune idée pour le moment.</p>`}</section>`;
  }
  async function contenus() {
    const [c, l] = await Promise.all([D.commerce(), D.contenus()]), nbf = Object.fromEntries(FILTRES.map(f => [f[0], l.filter(x => famille(x) === f[0]).length]));
    nomCommerce = c.nom;
    if (!filtre) filtre = (FILTRES.find(f => nbf[f[0]]) || FILTRES[0])[0];
    const liste = l.filter(x => famille(x) === filtre), urls = await Promise.all(liste.map(urlSure)), vids = await Promise.all(liste.map(videoSure));
    const formatCourt = x => ({ publication: "Publication", story: "Story", video: "Vidéo courte" })[M.formatDe(x)];
    vue.innerHTML = `${pauseBandeau(c)}<div class="entete-accueil">${entete("Créer", "Vos contenus", "Rien ne sort sans votre accord. Vous pouvez modifier la légende vous-même, réseau par réseau. Pour le visuel, demandez une modification à RENOM.")}
        <button type="button" class="bouton second" id="proposer-idees" aria-expanded="${ideesOuvertes}" aria-controls="idees">Proposer des idées</button></div>
      ${ideesOuvertes ? await panneauIdees(c) : ""}
      ${await proposition(c)}
      ${l.length ? `<div class="filtres" role="group" aria-label="Filtrer les contenus par état">${FILTRES.map(([k, nom]) => `<button type="button" data-f="${k}" aria-pressed="${k === filtre}">${nom}, ${nbf[k]}</button>`).join("")}</div>
      <p class="msg" id="msg" role="status"></p>
      ${liste.length ? `<div class="cartes">${liste.map((x, i) => `<article class="carte contenu" data-contenu="${e(x.id)}">
        <p class="meta"><span>${formatCourt(x)} · ${jourRelatif(x.cree_le)}</span><span class="etat${x.statut === "a_valider" ? " actif" : ""}">${ST_CONTENU[x.statut] || e(x.statut)}</span></p>
        ${blocReseaux(x, urls[i], vids[i])}<div class="contenu-corps">
        ${x.note_modification ? `<p class="note">Votre demande : ${e(x.note_modification)}</p>` : ""}
        ${x.statut === "a_valider" ? decisions(x, "Refuser ce contenu") : x.statut === "approuve" ? boutonsAuto(x.id, c.metier) : ""}</div></article>`).join("")}</div>`
      : `<section class="carte"><p class="texte2">${VIDE_FILTRE[filtre]}</p></section>`}`
      : `<section class="carte"><h2>Aucun contenu pour le moment</h2><p class="texte2">Déposez vos photos : les contenus créés apparaîtront ici.</p><p class="pied"><a class="bouton" href="#/photos">Déposer des photos</a></p></section><p class="msg" id="msg" role="status"></p>`}`;
    vue.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { filtre = b.dataset.f; contenus(); });
    $("proposer-idees").onclick = async () => { ideesOuvertes = !ideesOuvertes; await contenus(); if (ideesOuvertes) $("demande").focus(); };
    if ($("fermer-idees")) $("fermer-idees").onclick = async () => { ideesOuvertes = false; await contenus(); $("proposer-idees").focus(); };
    if ($("demande")) $("demande").onclick = async () => { try { await D.demanderIdees(); await contenus(); msg("Demande enregistrée. Les idées sont dans le panneau ci-dessus."); majCompteurs(); } catch (er) { $("msg-idees").textContent = er.message; } };
    brancherDecisions(vue, contenus);
  }

  // ---------------- Calendrier
  const cal = { mode: "mois", ref: new Date() };
  async function calendrier() {
    const [c, l, ct, cpt] = await Promise.all([D.commerce(), D.calendrier(), D.contenus(), D.comptes()]);
    const actifs = l.filter(x => x.statut !== "annule"), prets = ct.filter(x => x.statut === "approuve");
    const connectes = cpt.filter(x => x.etat === "connecte").map(x => x.reseau), vign = await Promise.all(l.map(x => urlSure(x.contenu)));
    const ref = new Date(cal.ref), aujourd = new Date(); let grille = "";
    const du = d => actifs.filter(x => memeJour(new Date(x.prevu_le), d));
    const lundi = (() => { const d = new Date(ref); d.setDate(ref.getDate() - ((ref.getDay() + 6) % 7)); return d; })();
    if (cal.mode === "mois") {
      const p = new Date(ref.getFullYear(), ref.getMonth(), 1), dec = (p.getDay() + 6) % 7, n = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
      grille = `<div class="cal" role="grid" aria-label="${MOIS[ref.getMonth()]} ${ref.getFullYear()}">${JOURS.map(j => `<div class="ent">${j}</div>`).join("")}` + Array.from({ length: Math.ceil((dec + n) / 7) * 7 }, (_, i) => {
        const j = i - dec + 1; if (j < 1 || j > n) return `<div class="hors"></div>`; const d = new Date(ref.getFullYear(), ref.getMonth(), j), it = du(d);
        return `<div${memeJour(d, aujourd) ? ' aria-current="date"' : ""}><span class="n">${j}</span>${it.map(x => `<span data-cell>${heureCourte(x.prevu_le)}</span>`).join("")}</div>`; }).join("") + "</div>";
    } else {
      grille = `<ul class="liste semaine" aria-label="Semaine">` + Array.from({ length: 7 }, (_, i) => { const d = new Date(lundi); d.setDate(lundi.getDate() + i); const it = du(d);
        return `<li${memeJour(d, aujourd) ? ' aria-current="date"' : ""}><p class="fort">${cap(JOURS_LONGS[d.getDay()])} ${jourMois(d)}</p><div>${it.length ? it.map(x => `<p>${heure(x.prevu_le)} · ${x.reseaux.map(r => RES[r]).join(", ")} · ${e(cut(x.contenu?.legende || "", 60))}</p>`).join("") : `<p class="note">Rien de programmé</p>`}</div></li>`; }).join("") + "</ul>";
    }
    const titre = cal.mode === "mois" ? `${cap(MOIS[ref.getMonth()])} ${ref.getFullYear()}` : "Semaine du " + date(lundi);
    vue.innerHTML = `${pauseBandeau(c)}${entete("Publier", "Votre calendrier", "Choisissez le jour, l'heure et les réseaux de chaque contenu approuvé.")}
      <div class="rangee">
        <section class="carte large"><div class="carte-tete"><h2>${titre}</h2>
          <div class="actions serre"><button type="button" class="bouton second petit" data-m="semaine" aria-pressed="${cal.mode === "semaine"}">Semaine</button><button type="button" class="bouton second petit" data-m="mois" aria-pressed="${cal.mode === "mois"}">Mois</button>
          <button type="button" class="bouton second petit" data-n="-1">Précédent</button><button type="button" class="bouton second petit" data-n="1">Suivant</button></div></div>${grille}</section>
        <section class="carte etroite"><h2>Programmer un contenu approuvé</h2>${prets.length ? `<form id="f">
          <div class="f"><label for="contenu">Contenu</label><select id="contenu">${prets.map(x => `<option value="${e(x.id)}">${x.type === "video" ? "Vidéo" : "Publication"} : ${e(cut(x.legende || "", 70))}</option>`).join("")}</select></div>
          <div class="champs deux"><div class="f"><label for="jour">Date</label><input id="jour" type="date" value="${demain()}" required></div><div class="f"><label for="heure">Heure</label><input id="heure" type="time" value="12:00" required></div></div>
          <fieldset><legend>Réseaux</legend>${window.RENOM_RESEAUX.map(r => `<label class="option"><input type="checkbox" name="res" value="${r}"${connectes.includes(r) ? "" : " disabled"}><span>${RES[r]}${connectes.includes(r) ? "" : " (non connecté)"}</span></label>`).join("")}
          <p class="aide">Le plafond de votre offre est déjà respecté : chaque contenu est créé dans la limite de votre offre, et ne se programme qu'une fois.</p></fieldset>
          <button class="bouton" type="submit">Programmer</button><p class="msg" id="msg" role="status"></p></form>` : `<p class="texte2">Aucun contenu approuvé à programmer. Approuvez d'abord un contenu dans l'écran <a href="#/contenus">Contenus</a>.</p><p class="msg" id="msg" role="status"></p>`}</section>
      </div>
      <section class="carte"><div class="carte-tete"><h2>Vos programmations</h2>${l.length ? `<span class="note">${l.length}</span>` : ""}</div>${l.length ? `<ul class="liste programmations">${l.map((x, i) => `<li class="avec-vignette" data-id="${e(x.id)}">${vignette(vign[i])}<div class="prog">
        <p><span class="fort">${dateHeure(x.prevu_le)}</span> · ${x.reseaux.map(r => RES[r]).join(", ")} · <span class="etat${x.statut === "programme" ? " actif" : ""}">${ST_PUB[x.statut] || e(x.statut)}</span></p>
        <p class="note">${e(cut(x.contenu?.legende || "", 90))}</p>${x.erreur ? `<p class="note">${e(x.erreur)}</p>` : ""}
        ${x.statut === "programme" ? `<div class="actions serre"><input type="date" data-nj value="${jourLocal(x.prevu_le)}" aria-label="Nouvelle date"><input type="time" data-nh value="${heureLocale(x.prevu_le)}" aria-label="Nouvelle heure"><button type="button" class="bouton second petit" data-a="deplacer">Déplacer</button><button type="button" class="lien" data-a="annuler">Annuler</button></div>` : ""}</div></li>`).join("")}</ul>` : `<p class="texte2">Aucune programmation.</p>`}</section>`;
    vue.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { cal.mode = b.dataset.m; calendrier(); });
    vue.querySelectorAll("[data-n]").forEach(b => b.onclick = () => { const n = +b.dataset.n, d = new Date(cal.ref); if (cal.mode === "mois") d.setMonth(d.getMonth() + n); else d.setDate(d.getDate() + 7 * n); cal.ref = d; calendrier(); });
    if ($("f")) $("f").onsubmit = async ev => {
      ev.preventDefault(); const res = [...document.querySelectorAll("input[name=res]:checked")].map(x => x.value);
      try { await D.programmer({ contenu_id: $("contenu").value, reseaux: res, prevu_le: new Date($("jour").value + "T" + $("heure").value).toISOString() }); await calendrier(); msg("Programmé."); } catch (er) { msg(er.message); }
    };
    vue.querySelectorAll("li[data-id]").forEach(li => li.addEventListener("click", async ev => {
      const b = ev.target.closest("[data-a]"); if (!b) return;
      try { if (b.dataset.a === "annuler") await D.annuler(li.dataset.id); else await D.deplacer(li.dataset.id, new Date(li.querySelector("[data-nj]").value + "T" + li.querySelector("[data-nh]").value).toISOString()); await calendrier(); msg("Enregistré."); } catch (er) { msg(er.message); }
    }));
  }

  // ---------------- Avis
  async function avis() {
    const [c, l0] = await Promise.all([D.commerce(), D.avis()]);
    const rang = x => x.statut === "a_valider" && !x.sensible ? 0 : x.sensible || x.statut === "humain" ? 1 : 2, l = l0.map((x, i) => [x, i]).sort((a, b) => rang(a[0]) - rang(b[0]) || a[1] - b[1]).map(x => x[0]);
    vue.innerHTML = `${entete("Votre réputation Google", "Avis et réponses")}
      <div class="colonnes">
        <div class="pile">${l.length ? l.map(x => `<article class="carte avis${x.sensible ? " attention" : ""}" data-avis="${e(x.id)}">
          <div class="carte-tete"><p class="fort">${etoiles(x.note)}</p><p class="etat${x.statut === "a_valider" && !x.sensible ? " actif" : ""}">${ST_AVIS[x.statut] || e(x.statut)}</p></div>
          ${citation(x)}<p class="note">Reçu le ${date(x.cree_le)}${x.demo ? " · avis fictif de démonstration" : ""}</p>
          ${x.sensible ? `<div class="encart" role="alert"><p class="fort">Avis sensible : ${e((x.raisons || []).join(", "))}.</p><p>Aucune réponse n'a été préparée ni publiée : une personne doit le traiter. RENOM a été alerté.</p></div>` : ""}
          ${x.statut === "a_valider" && !x.sensible ? reponseAValider(x) : ""}
          ${x.statut === "publie" || x.statut === "valide" ? `<p class="reponse"><span class="fort">${x.decision === "publication_automatique" ? "Réponse publiée automatiquement :" : "Réponse validée :"}</span> ${e(x.reponse || x.reponse_proposee || "")}</p>` : ""}</article>`).join("")
          : `<section class="carte"><h2>Aucun avis pour le moment</h2><p class="texte2">Les avis de votre fiche Google apparaîtront ici dès que la connexion à Google sera active.</p></section>`}
          <p class="msg" id="msg" role="status"></p></div>
        <section class="carte"><h2>Réglage</h2><p class="texte2">${c.reglage_avis === "tout_automatique" ? "Toutes les réponses sont publiées automatiquement." : "Les réponses aux avis de 4 et 5 étoiles sont publiées automatiquement. Vous validez celles des avis de 1 à 3 étoiles ici."}</p>
          <p class="note">Un avis sensible n'est jamais traité automatiquement.</p><p class="pied"><a href="#/fiche">Modifier ce réglage</a></p></section>
      </div>`;
    brancherAvis(vue, avis);
  }

  // ---- Collecte : début. Page publique d'avis, QR code et carte A6, demande par WhatsApp, retours privés.
  // Conformité Google : la page publique est la même pour tous les clients ; rien ici ne trie selon la note.
  nb.retours = 0; nb.reputation = 0;
  GROUPES.find(g => g.id === "reputation").compte = "reputation";   // onglet du téléphone : avis à traiter et retours non lus
  const retoursNonLus = async () => { try { return (await D.retoursPrives()).filter(x => !x.lu).length; } catch (er) { return 0; } };
  const HOTE_GOOGLE = /(^|\.)(google\.[a-z.]{2,6}|g\.page|goo\.gl|g\.co)$/i;
  // Lien Google proposé par la page publique : même règle que la base (https obligatoire, sinon identifiant de lieu).
  function lienAvis(c) {
    const lien = window.RENOM_LIEN_AVIS(c); if (!lien) return null;
    const deLaFiche = lien === String(c.lien_avis || "").trim(); let hote = ""; try { hote = new URL(lien).hostname; } catch (er) {}
    return { lien, source: !deLaFiche ? "Lien construit à partir de l'identifiant de lieu : sa forme n'est pas confirmée par la documentation de Google. Remplacez-le par le lien copié depuis business.google.com."
      : HOTE_GOOGLE.test(hote) ? "Lien enregistré dans votre fiche." : "Lien enregistré dans votre fiche. Il ne ressemble pas à une adresse Google : vérifiez-le." };
  }
  const lienPagePublique = jeton => new URL("avis.html#" + jeton, location.href.split("#")[0]).href;
  function qrSvg(texte) { const q = qrcode(0, "M"); q.addData(texte); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); }
  // Numéro au format international : indicatif précédé de + ou de 00, puis 8 à 15 chiffres au total. Renvoie les chiffres seuls, ou null.
  function numeroInternational(saisie) {
    let n = String(saisie || "").trim().replace(/\(0\)/g, "").replace(/[\s.\-()  ]/g, "");
    if (n.startsWith("+")) n = n.slice(1); else if (n.startsWith("00")) n = n.slice(2); else return null;
    if (!/^[1-9]\d{7,14}$/.test(n)) return null;
    if (n.startsWith("33") && !/^33[1-9]\d{8}$/.test(n)) return null;   // France : pas de 0 après l'indicatif, neuf chiffres
    return n;
  }
  const messageWhatsApp = (c, prenom, lien) => `Bonjour${prenom ? " " + prenom : ""}, merci de votre visite chez ${c.nom}. Votre avis, quel qu'il soit, nous aide à nous améliorer. Vous pouvez le donner ici : ${lien}`;
  const lienWhatsApp = (numero, texte) => "https://wa.me/" + numero + "?text=" + encodeURIComponent(texte);
  const retourPrive = x => `<li data-retour="${e(x.id)}"><div class="retour-prive">
      <p><span class="fort">${etoiles(x.note)}</span>${x.prenom ? " · " + e(x.prenom) : ""} · <span class="etat${x.lu ? "" : " actif"}">${x.lu ? "Lu" : "Non lu"}</span></p>
      ${x.message ? `<p class="citation">« ${e(x.message)} »</p>` : `<p class="note">Note laissée sans message.</p>`}
      <p class="note">Reçu le ${date(x.cree_le)}, ${heure(x.cree_le)}</p></div>
      <button type="button" class="lien" data-lu="${x.lu ? "0" : "1"}">${x.lu ? "Marquer comme non lu" : "Marquer comme lu"}</button></li>`;
  async function dessinerRetours() {
    const zone = $("retours"); if (!zone) return; const l = await D.retoursPrives(), non = l.filter(x => !x.lu).length;
    zone.innerHTML = `<div class="carte-tete"><h2>Retours privés</h2>${l.length ? `<span class="note" id="retours-compte">${non ? non + " non " + pluriel(non, "lu", "lus") + " sur " + l.length : l.length + " " + pluriel(l.length, "retour, lu", "retours, tous lus")}</span>` : ""}</div>
      <p class="note">Les messages écrits depuis votre page d'avis arrivent ici. Ils ne sont pas publiés et vous seul les lisez.</p>
      ${l.length ? `<ul class="liste retours">${l.map(retourPrive).join("")}</ul>` : `<p class="texte2">Aucun retour privé pour le moment.</p>`}
      <p class="msg" id="retours-msg" role="status"></p>`;
    zone.querySelectorAll("[data-lu]").forEach(b => b.onclick = async () => {
      try { await D.marquerRetour(b.closest("[data-retour]").dataset.retour, b.dataset.lu === "1"); await dessinerRetours(); majCompteurs(); } catch (er) { $("retours-msg").textContent = er.message; }
    });
  }
  // Mesure de la collecte : passages sur la page d'avis, clics vers Google, retours privés, nouveaux avis (écart entre deux relevés).
  const MESURES = [["passages", "Passages sur votre page d'avis"], ["clics_google", "Clics vers Google"], ["retours_prives", "Retours privés"], ["nouveaux_avis", "Nouveaux avis"]];
  const chiffresCollecte = (m, deux) => `<dl class="bilan-chiffres${deux ? " deux" : ""}">${MESURES.map(([k, lib]) => `<div class="bilan-chiffre"><dt>${lib}</dt><dd class="chiffre" data-mesure="${k}">${nombre(+m[k] || 0)}</dd></div>`).join("")}</dl>`;
  const blocMesure = m => m ? `<section class="carte" id="mesure-collecte"><div class="carte-tete"><h2>Ce mois-ci</h2>${D.mode === "demo" ? `<span class="note">Chiffres de démonstration</span>` : ""}</div>
      ${chiffresCollecte(m)}<p class="note">Nouveaux avis : écart entre deux relevés de votre fiche Google. Un clic vers Google ne garantit pas qu'un avis a été publié.</p></section>` : "";
  async function collecte() {
    const c = await D.commerce(), l = lienAvis(c), co = c.couleurs || {}, page = l ? lienPagePublique(await D.jetonAvis()) : null;
    const mesure = await D.resultats(1).then(r => r && r.collecte).catch(() => null);
    const local = D.mode === "demo" || /^(localhost|127\.|\[::1\])/.test(location.host);
    const carteA6 = id => `<div class="a6" style="background:${e(co.fond || "#fff")};color:${e(co.texte || "#000")}"><div><p class="a6-nom">${e(c.nom)}</p><h3>Vous avez passé un moment chez nous ?</h3></div>
      <p>Votre avis, quel qu'il soit, nous aide à nous améliorer et aide d'autres personnes à nous trouver. Scannez le code pour le donner.</p><div class="qr"${id ? ` id="${id}"` : ""}>${qrSvg(page)}</div></div>`;
    const regle = `<section class="carte"><h2>La règle à respecter</h2><p class="texte2">Votre page d'avis et votre carte s'adressent <strong>à tous vos clients, sans exception</strong>. Règles de Google : aucune contrepartie (remise, cadeau), aucun tri entre clients contents et mécontents, aucune pression sur place, aucune demande de contenu précis.</p></section>`;
    if (!l) {
      vue.innerHTML = `${entete("Réputation", "Collecte d'avis", "Une même page pour tous vos clients : ils publient leur avis sur Google ou vous écrivent en privé.")}
        <div class="pile">${regle}${blocMesure(mesure)}
          <section class="carte"><h2>Il manque votre lien Google</h2><p class="texte2">Ajoutez dans <a href="#/fiche">votre fiche</a> le lien pour laisser un avis Google (business.google.com, Lire les avis, Obtenir plus d'avis). Il doit commencer par https://.</p>
          <p class="note">Tant que ce lien manque, votre page d'avis reste fermée : le message privé n'est jamais proposé sans le bouton Google.</p></section></div>`;
      return;
    }
    vue.innerHTML = `${entete("Réputation", "Collecte d'avis", "Une même page pour tous vos clients : ils publient leur avis sur Google ou vous écrivent en privé.")}
      <div class="colonnes collecte">
        <div class="pile">
          ${regle}
          ${blocMesure(mesure)}
          <section class="carte"><h2>Votre page d'avis</h2>
            <p class="texte2">Quelle que soit la note choisie, la page propose les deux mêmes boutons : publier son avis sur Google, ou vous écrire en privé.</p>
            <p id="lien" class="casse fort">${e(page)}</p>
            <div class="actions"><button type="button" class="bouton" id="imprimer">Imprimer la carte A6</button><a class="bouton second" id="ouvrir-lien" href="${e(page)}" target="_blank" rel="noopener">Ouvrir la page</a><button type="button" class="lien" id="copier">Copier le lien</button></div>
            <p class="msg" id="msg" role="status"></p>
            <p class="note">Le bouton Google de cette page ouvre : <span id="lien-google" class="casse">${e(l.lien)}</span>. ${e(l.source)}</p>
            ${local ? `<p class="note" id="note-adresse">Cette adresse est celle de la démonstration. N'imprimez la carte qu'une fois l'espace installé à son adresse définitive : le code de la carte contient cette adresse.</p>` : ""}</section>
          <section class="carte" id="retours"></section>
          <section class="carte"><h2>Demander par WhatsApp</h2>
            <p class="texte2">Le message part de votre propre WhatsApp, quand vous l'envoyez vous-même dans l'application. RENOM n'envoie rien et n'enregistre pas le numéro.</p>
            <div class="encart"><p><span class="fort">À respecter :</span> envoyez la même demande à tous vos clients, sans contrepartie, et seulement à ceux qui vous ont donné leur numéro.</p></div>
            <form id="wa" novalidate><div class="champs">
              <div class="f"><label for="wa-prenom">Prénom de votre client (facultatif)</label><input id="wa-prenom" type="text" autocomplete="off" maxlength="60"></div>
              <div class="f"><label for="wa-numero">Son numéro, au format international</label><input id="wa-numero" type="tel" inputmode="tel" autocomplete="off" placeholder="+33 6 12 34 56 78" aria-describedby="wa-aide"></div>
              <p class="aide toute" id="wa-aide">Avec l'indicatif du pays et sans le 0 qui le suit. Exemple : +33 6 12 34 56 78.</p>
              <div class="f toute"><label for="wa-message">Message, vous pouvez le modifier</label><textarea id="wa-message" class="haut-texte"></textarea></div></div>
              <div class="actions"><button class="bouton" type="submit">Ouvrir WhatsApp</button><p class="msg" id="wa-msg" role="status"></p></div></form></section>
        </div>
        <section class="carte carte-apercu"><h2>Aperçu de la carte (A6)</h2><div class="apercu-a6" id="apercu">${carteA6("qr")}</div><p class="note">Le code ouvre votre page d'avis.</p></section>
      </div>
      <div class="zone-a6">${carteA6("")}</div>`;
    $("imprimer").onclick = () => window.print();
    $("copier").onclick = async () => { try { await navigator.clipboard.writeText(page); msg("Lien copié."); } catch (er) { msg("La copie n'a pas abouti : sélectionnez le lien ci-dessus pour le copier."); } };
    // WhatsApp : le message suit le prénom tant que le commerçant ne l'a pas réécrit lui-même.
    const waMsg = t => { $("wa-msg").textContent = t; }; let reecrit = false;
    const proposer = () => { if (!reecrit) $("wa-message").value = messageWhatsApp(c, $("wa-prenom").value.trim(), page); };
    proposer(); $("wa-prenom").oninput = proposer; $("wa-message").oninput = () => { reecrit = true; };
    $("wa").onsubmit = ev => {
      ev.preventDefault(); const numero = numeroInternational($("wa-numero").value), texte = $("wa-message").value.trim();
      if (!numero) { waMsg("Numéro non reconnu. Écrivez-le au format international, avec l'indicatif du pays et sans le 0 qui le suit : +33 6 12 34 56 78."); $("wa-numero").focus(); return; }
      if (!texte.includes(page)) { waMsg("Gardez dans le message le lien de votre page d'avis."); $("wa-message").focus(); return; }
      window.open(lienWhatsApp(numero, texte), "_blank", "noopener");
      $("wa-numero").value = ""; $("wa-prenom").value = ""; reecrit = false; proposer();
      waMsg("WhatsApp s'ouvre avec votre message. Il ne part que lorsque vous l'envoyez.");
    };
    await dessinerRetours();
  }
  // ---- Collecte : fin

  // ---------------- Comptes connectés
  const AIDE = {
    google: "Pour que RENOM réponde à vos avis et publie sur votre fiche : sur business.google.com, Paramètres du profil, Personnes et accès, invitez l'adresse que RENOM vous indiquera avec le rôle Gestionnaire. Vous restez propriétaire et pouvez retirer l'accès à tout moment.",
    facebook: "Donnez à RENOM l'accès à votre Page Facebook (Paramètres de la Page, Accès à la Page). Étapes exactes à confirmer à l'écran lors de la première connexion.",
    instagram: "Votre compte doit être professionnel (Business ou Créateur) et lié à votre Page Facebook. RENOM le vérifie avec vous lors de la connexion.",
    tiktok: "La connexion de TikTok viendra après Facebook et Instagram. Rien à faire pour le moment.",
  };
  async function comptes() {
    const l = await D.comptes();
    vue.innerHTML = `${entete("Mon commerce", "Comptes connectés", (D.mode === "demo" ? "En démonstration, aucun compte n'est réellement connecté. " : "") + "RENOM ne publie sur un réseau que si vous l'avez connecté, et seulement ce que vous avez approuvé.")}
      <div class="cartes comptes">${l.map(x => `<article class="carte"><h2>${RES[x.reseau]} <span class="etat${x.etat === "connecte" ? " actif" : ""}">· ${ETAT[x.etat] || e(x.etat)}</span></h2><p class="texte2">${AIDE[x.reseau]}</p>${x.detail ? `<p class="note pied">${e(x.detail)}</p>` : ""}</article>`).join("")}</div>`;
  }

  // ---------------- Offre
  async function offre() {
    const [k, j, c] = await Promise.all([D.compteur(), D.journal(), D.commerce()]); const o = window.RENOM_OFFRES[k.offre] || {}, mois = new Date(k.mois + "T12:00:00");
    vue.innerHTML = `${pauseBandeau(c)}${entete("Votre offre", "Offre " + e(k.offre_nom))}
      <div class="rangee">
        <section class="carte moitie"><div class="carte-tete"><h2>Ce mois-ci</h2><span class="note">${cap(MOIS[mois.getMonth()])} ${mois.getFullYear()}</span></div>
          ${mesure("Publications utilisées", k.publications_utilisees, k.publications_plafond)}
          ${k.videos_plafond ? mesure("Vidéos utilisées", k.videos_utilisees, k.videos_plafond) : `<div class="mesure-tete"><span>Vidéos</span><span class="note">Non comprises dans votre offre</span></div>`}
          <p class="note pied">Le compteur repart à zéro au début du mois.</p></section>
        <section class="carte moitie"><h2>Ce qui est inclus chaque mois</h2><ul class="liste"><li><span>Publications (visuels aux formats 4 par 5 et 9 par 16, légende)</span><span class="fort">${o.publications ?? k.publications_plafond}</span></li><li><span>Vidéos courtes</span><span class="fort">${(o.videos ?? k.videos_plafond) || "Non comprises"}</span></li><li><span>Réponses aux avis Google</span><span class="fort">Comprises</span></li></ul>
          <p class="note pied">Une demande d'idées compte pour une publication.</p></section>
      </div>
      <section class="carte"><h2>Quand le plafond est atteint</h2><p class="texte2 lecture">Toute nouvelle photo reste visible dans votre espace mais ne produit rien : elle est marquée « refusée » avec le motif écrit dans votre historique. Les contenus déjà créés, la programmation et les réponses aux avis continuent. Le compteur repart à zéro au début du mois. Pour produire davantage, contactez RENOM pour changer d'offre.</p></section>
      <section class="carte"><h2>Historique récent</h2>${j.length ? `<ul class="liste">${j.slice(0, 12).map(x => `<li><span>${e(ETAPES[x.type] || cap(String(x.type || "").toLowerCase().replace(/_/g, " ")))}${x.detail && x.detail.raison ? `<span class="note"> : ${e(x.detail.raison)}</span>` : ""}</span><span class="note">${cap(date(x.cree_le))}</span></li>`).join("")}</ul>` : `<p class="texte2">Aucune étape pour le moment.</p>`}</section>`;
  }

  // ---------------- Résultats : ce que RENOM rapporte, mois par mois. Aucun chiffre inventé : la portée attend les statistiques des réseaux.
  const pctTaux = t => t == null ? null : Math.round(+t <= 1 ? +t * 100 : +t);   // la base peut rendre une proportion (0 à 1) ou un pourcentage
  const delaiTexte = h => h == null ? "Pas de réponse sur la période" : +h < 1 ? "moins d'une heure" : +h < 48 ? `${nombre(Math.round(+h))} h` : `${nombre(Math.round(+h / 24))} jours`;
  const NOMS_PILIERS = { profil: "Complétude du profil", categories: "Catégories et attributs", photos: "Photos", avis: "Avis", engagement: "Signaux d'engagement" };
  const piliersDe = p => Array.isArray(p) ? p.map(x => ({ nom: x.nom || NOMS_PILIERS[x.cle] || x.cle, note: +x.note || 0, sur: +x.sur || 20 }))
    : p && typeof p === "object" ? Object.entries(p).map(([k, v]) => v && typeof v === "object" ? { nom: v.nom || NOMS_PILIERS[k] || k, note: +v.note || 0, sur: +v.sur || 20 } : { nom: NOMS_PILIERS[k] || k, note: +v || 0, sur: 20 }) : [];
  const moisLong = m => { const d = moisDe(m); return MOIS[d.getMonth()] + " " + d.getFullYear(); };
  const moisCourt = m => MOIS_COURTS[moisDe(m).getMonth()];
  const deMois = m => (/^[aeiouyéè]/i.test(moisLong(m)) ? "d'" : "de ") + moisLong(m);
  // Courbe simple : un trait de 2 px (SVG), des points et les libellés en HTML pour rester lisibles à toutes les largeurs.
  function courbe(pts, o) {
    const vals = pts.filter(p => p.v != null).map(p => p.v); if (!vals.length) return `<p class="texte2">${o.vide}</p>`;
    let lo = Math.min(...vals), hi = Math.max(...vals); const marge = Math.max((hi - lo) * 0.25, o.pas || 1); lo -= marge; hi += marge; if (o.min != null) lo = Math.max(o.min, lo);
    const X = i => pts.length === 1 ? 50 : 6 + i * 88 / (pts.length - 1), Y = v => 100 - (v - lo) / (hi - lo) * 100;
    const pleins = pts.map((p, i) => [p, i]).filter(([p]) => p.v != null), [premier, dernier] = [pleins[0], pleins[pleins.length - 1]];
    const etiquette = ([p, i], cote) => `<span class="c-val ${cote}" style="left:${X(i)}%;top:${Y(p.v)}%">${o.fmt(p.v)}</span>`;
    return `<figure class="courbe"><div class="c-zone" role="img" aria-label="${e(o.alt)}">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="0" x2="100" y1="100" y2="100" class="c-base"></line><line x1="0" x2="100" y1="50" y2="50" class="c-grille"></line>
          <polyline points="${pleins.map(([p, i]) => X(i) + "," + Y(p.v)).join(" ")}" class="c-trait"></polyline></svg>
        ${pleins.map(([p, i]) => `<span class="c-point" style="left:${X(i)}%;top:${Y(p.v)}%" title="${e(p.lib + " : " + o.fmt(p.v))}"></span>`).join("")}
        ${etiquette(premier, "debut")}${dernier !== premier ? etiquette(dernier, "fin") : ""}</div>
      <div class="c-mois" aria-hidden="true">${pts.map((p, i) => `<span style="left:${X(i)}%">${p.court}</span>`).join("")}</div></figure>`;
  }
  async function resultats() {
    const [c, R] = await Promise.all([D.commerce(), D.resultats(6)]), mois = (R && R.mois) || [], avecNote = mois.filter(m => m.note != null);
    const prem = avecNote[0], dern = avecNote[avecNote.length - 1], rep = (R && R.reponses) || {}, audit = (R && R.audit) || [], conc = (R && R.concurrents) || [], themes = (R && R.themes) || [], col = (R && R.collecte) || {};
    const pts = k => mois.map(m => ({ v: m[k] == null ? null : +m[k], lib: moisLong(m.mois), court: moisCourt(m.mois) }));
    const periode = mois.length ? `de ${moisLong(mois[0].mois)} à ${moisLong(mois[mois.length - 1].mois)}` : "";
    const ecart = (a, b, d) => { const x = Math.round((b - a) * 10 ** d) / 10 ** d; return x > 0 ? "+" + nombre(x, d) : x < 0 ? "−" + nombre(-x, d) : "stable"; };
    const taux = pctTaux(rep.taux), dernierAudit = audit[audit.length - 1], premierAudit = audit[0];
    const maxTheme = Math.max(1, ...themes.map(t => (+t.positif || 0) + (+t.negatif || 0)));
    const derniereConc = x => (x.mois || [])[x.mois.length - 1] || {}, premiereConc = x => (x.mois || [])[0] || {};
    vue.innerHTML = `${entete("Résultats", "Ce que RENOM vous rapporte", "Vos avis Google, vos réponses, votre fiche et votre collecte, mois par mois" + (periode ? ", " + periode : "") + ".")}
      ${bandeauDemo()}
      <div class="rangee">
        <section class="carte moitie" aria-labelledby="r-note"><div class="carte-tete"><h2 id="r-note">Note Google</h2>${prem && dern && prem !== dern ? `<span class="note">${ecart(+prem.note, +dern.note, 1)} depuis ${MOIS[moisDe(prem.mois).getMonth()]}</span>` : ""}</div>
          ${dern ? `<p><span class="chiffre grand-chiffre">${nombre(dern.note, 1)}</span> <span class="note">sur 5, relevé ${deMois(dern.mois)}</span></p>` : ""}
          ${courbe(pts("note"), { fmt: v => nombre(v, 1), pas: 0.4, min: 1, alt: "Note Google mois par mois : " + avecNote.map(m => moisLong(m.mois) + " " + nombre(m.note, 1)).join(", ") + ".", vide: "Pas encore de relevé de votre fiche Google. Les relevés sont mensuels." })}</section>
        <section class="carte moitie" aria-labelledby="r-nb"><div class="carte-tete"><h2 id="r-nb">Nombre d'avis</h2>${prem && dern && prem !== dern ? `<span class="note">${ecart(+prem.nb_avis, +dern.nb_avis, 0)} depuis ${MOIS[moisDe(prem.mois).getMonth()]}</span>` : ""}</div>
          ${dern ? `<p><span class="chiffre grand-chiffre">${nombre(dern.nb_avis)}</span> <span class="note">avis au total sur votre fiche</span></p>` : ""}
          ${courbe(pts("nb_avis"), { fmt: v => nombre(v), pas: 2, min: 0, alt: "Nombre total d'avis mois par mois : " + avecNote.map(m => moisLong(m.mois) + " " + nombre(m.nb_avis)).join(", ") + ".", vide: "Pas encore de relevé de votre fiche Google." })}</section>
      </div>
      ${avecNote.length ? `<details class="carte details-chiffres"><summary>Voir les chiffres mois par mois</summary>
        <table class="tab compact"><thead><tr><th>Mois</th><th>Note</th><th>Avis au total</th><th>Avis reçus</th><th>Réponses publiées</th><th>Délai moyen de réponse</th><th>Publications</th></tr></thead><tbody>
        ${mois.map(m => `<tr><td data-l="Mois">${cap(moisLong(m.mois))}</td><td data-l="Note">${m.note == null ? "Pas de relevé" : nombre(m.note, 1)}</td><td data-l="Avis au total">${m.nb_avis == null ? "Pas de relevé" : nombre(m.nb_avis)}</td><td data-l="Avis reçus">${nombre(+m.avis_recus || 0)}</td><td data-l="Réponses">${nombre(+m.reponses || 0)}</td><td data-l="Délai moyen">${m.delai_moyen_h == null ? "Aucune réponse" : delaiTexte(m.delai_moyen_h)}</td><td data-l="Publications">${nombre(+m.publications || 0)}</td></tr>`).join("")}</tbody></table></details>` : ""}
      <div class="rangee">
        <section class="carte etroite" aria-labelledby="r-rep"><h2 id="r-rep">Réponses à vos avis</h2>
          ${taux == null ? `<p class="texte2">Aucun avis reçu sur la période.</p>` : `<dl class="bilan-chiffres deux"><div class="bilan-chiffre"><dt>Taux de réponse</dt><dd class="chiffre" id="taux">${nombre(taux)} %</dd></div><div class="bilan-chiffre"><dt>Délai moyen</dt><dd class="chiffre" id="delai">${delaiTexte(rep.delai_moyen_h)}</dd></div></dl>
          <p class="note">Sur les avis reçus ces ${mois.length} derniers mois. Un avis sensible n'a pas de réponse automatique : il compte comme non répondu tant qu'une personne ne l'a pas traité.</p>`}</section>
        <section class="carte large" aria-labelledby="r-audit"><div class="carte-tete"><h2 id="r-audit">Score de votre fiche Google</h2>${dernierAudit && premierAudit && dernierAudit !== premierAudit ? `<span class="note">${ecart(+premierAudit.score, +dernierAudit.score, 0)} points depuis ${MOIS[moisDe(premierAudit.mois).getMonth()]}</span>` : ""}</div>
          ${dernierAudit ? `<p><span class="chiffre grand-chiffre">${nombre(+dernierAudit.score)}</span> <span class="note">sur 100, audit ${deMois(dernierAudit.mois)}</span></p>
          <div class="audit">
            <div class="barres" role="img" aria-label="Score mois par mois : ${e(audit.map(a => moisLong(a.mois) + " " + a.score).join(", "))}.">${audit.map((a, i) => `<div class="barre" title="${e(moisLong(a.mois) + " : " + a.score + " sur 100")}"><span class="b-val">${i === 0 || i === audit.length - 1 ? nombre(+a.score) : ""}</span><span class="b-zone"><span class="b-col" style="height:${Math.max(2, +a.score)}%"></span></span><span class="b-mois">${moisCourt(a.mois)}</span></div>`).join("")}</div>
            <div class="pile serre piliers">${piliersDe(dernierAudit.piliers).map(p => mesure(e(p.nom), p.note, p.sur)).join("")}</div></div>
          <p class="note">Cinq piliers notés sur 20, calculés à partir de ce que l'API Google Places laisse voir de votre fiche.</p>` : `<p class="texte2">Pas encore d'audit mensuel de votre fiche.</p>`}</section>
      </div>
      <section class="carte" aria-labelledby="r-conc"><div class="carte-tete"><h2 id="r-conc">Vous et vos concurrents</h2><span class="note">Relevés ${dern ? deMois(dern.mois) : "de ce mois"}</span></div>
        ${conc.length ? `<div class="defile"><table class="comparatif"><thead><tr><th>Commerce</th><th>Note</th><th>Avis</th><th>Avis gagnés</th></tr></thead><tbody>
          <tr class="vous"><td data-l="Commerce"><span class="fort">${e(c.nom)}</span> (vous)</td><td data-l="Note">${dern ? nombre(dern.note, 1) : "Pas de relevé"}</td><td data-l="Avis">${dern ? nombre(dern.nb_avis) : "Pas de relevé"}</td><td data-l="Avis gagnés">${prem && dern ? ecart(+prem.nb_avis, +dern.nb_avis, 0) : "Pas de relevé"}</td></tr>
          ${conc.map(x => { const a = premiereConc(x), b = derniereConc(x); return `<tr><td data-l="Commerce">${e(x.nom)}</td><td data-l="Note">${b.note == null ? "Pas de relevé" : nombre(b.note, 1)}</td><td data-l="Avis">${b.nb_avis == null ? "Pas de relevé" : nombre(b.nb_avis)}</td><td data-l="Avis gagnés">${a.nb_avis != null && b.nb_avis != null ? ecart(+a.nb_avis, +b.nb_avis, 0) : "Pas de relevé"}</td></tr>`; }).join("")}</tbody></table></div>`
        : `<p class="texte2">Aucun concurrent suivi pour le moment. Indiquez à RENOM jusqu'à 3 commerces à suivre.</p>`}</section>
      <div class="rangee">
        <section class="carte moitie" aria-labelledby="r-themes"><h2 id="r-themes">Ce que disent vos avis</h2>
          ${themes.length ? `<ul class="liste themes">${themes.map(t => { const p = +t.positif || 0, n = +t.negatif || 0; return `<li><div class="theme"><p class="fort">${e(t.theme)}</p><div class="t-barre" aria-hidden="true">${p ? `<span class="t-pos" style="width:${p / maxTheme * 100}%"></span>` : ""}${n ? `<span class="t-neg" style="width:${n / maxTheme * 100}%"></span>` : ""}</div></div><p class="note t-compte">${p} ${pluriel(p, "positif", "positifs")} · ${n} ${pluriel(n, "négatif", "négatifs")}</p></li>`; }).join("")}</ul>
          <p class="note">Nombre d'avis qui parlent de chaque thème. Trait bleu : mentions positives. Trait foncé : mentions négatives.</p>` : `<p class="texte2">Pas encore d'analyse des thèmes de vos avis.</p>`}</section>
        <section class="carte moitie" aria-labelledby="r-col"><div class="carte-tete"><h2 id="r-col">Collecte d'avis, ce mois-ci</h2><a href="#/collecte">Ouvrir la collecte</a></div>${chiffresCollecte(col, true)}
          <p class="note">Passages et clics comptés sur votre page d'avis. Nouveaux avis : écart entre deux relevés de votre fiche Google.</p></section>
      </div>
      <section class="carte" aria-labelledby="r-portee"><h2 id="r-portee">Portée de vos publications</h2><p class="texte2" id="portee">Disponible quand les statistiques des réseaux seront branchées.</p></section>`;
  }

  // ---------------- Fiche Google : photos, offre, événement, horaires exceptionnels. Le commerçant valide, rien ne part seul.
  const TYPES_ACT = { photos: "Ajouter des photos à la fiche", offre: "Créer une offre", evenement: "Créer un événement", horaires: "Horaires exceptionnels" };
  const ST_ACT = { a_valider: "À valider", a_publier: "À publier", publie: "Publié", refuse: "Refusé" };
  let typeAction = "photos";
  const jourTexte = j => cap(date(j + "T12:00:00"));
  const resumeAction = (a, ph) => { const d = a.donnees || {};
    if (a.type === "photos") { const noms = (d.photos || []).map(id => (ph.find(p => p.id === id) || {}).nom_fichier).filter(Boolean); const n = (d.photos || []).length; return `${n} ${pluriel(n, "photo", "photos")}${noms.length ? " : " + e(noms.join(", ")) : ""}`; }
    if (a.type === "horaires") return `${jourTexte(d.date)} : ${d.ferme ? "fermé toute la journée" : "de " + hm(d.ouverture) + " à " + hm(d.fermeture)}`;
    return `${e(d.titre)}, du ${date(d.debut + "T12:00:00")} au ${date(d.fin + "T12:00:00")}${d.conditions ? `. Conditions : ${e(d.conditions)}` : ""}`; };
  function champsAction(ph) {
    const auj = M.aujourdhui(), dates = `<div class="champs deux"><div class="f"><label for="af-debut">Début</label><input id="af-debut" type="date" min="${auj}" required></div><div class="f"><label for="af-fin">Fin</label><input id="af-fin" type="date" min="${auj}" required></div></div>`;
    const titre = lib => `<div class="f"><label for="af-titre">${lib}</label><input id="af-titre" type="text" maxlength="120" required></div>`;
    return { photos: ph.length ? `<fieldset><legend>Photos à ajouter à votre fiche</legend>${ph.slice(0, 12).map(p => `<label class="option"><input type="checkbox" name="af-photo" value="${e(p.id)}"><span class="casse">${e(p.nom_fichier || "Photo")}, déposée le ${date(p.cree_le)}</span></label>`).join("")}</fieldset>`
        : `<p class="texte2">Aucune photo déposée. <a href="#/photos">Déposez d'abord des photos</a>.</p>`,
      offre: titre("Titre de l'offre") + dates + `<div class="f"><label for="af-conditions">Conditions (facultatif)</label><textarea id="af-conditions" maxlength="1500"></textarea><p class="aide">Écrivez seulement ce qui est vrai et que vous appliquerez.</p></div>`,
      evenement: titre("Titre de l'événement") + dates,
      horaires: `<div class="f"><label for="af-date">Date</label><input id="af-date" type="date" min="${auj}" required></div>
        <label class="option"><input type="checkbox" id="af-ferme"><span>Fermé toute la journée</span></label>
        <div class="champs deux" id="af-heures"><div class="f"><label for="af-ouverture">Ouverture</label><input id="af-ouverture" type="time"></div><div class="f"><label for="af-fermeture">Fermeture</label><input id="af-fermeture" type="time"></div></div>` }[typeAction];
  }
  async function ficheGoogle() {
    const [c, l, ph] = await Promise.all([D.commerce(), D.actionsFiche(), D.photos()]);
    vue.innerHTML = `${pauseBandeau(c)}${entete("Réputation", "Votre fiche Google", "Ajoutez des photos, une offre, un événement ou des horaires exceptionnels. Vous relisez puis validez : rien ne part seul.")}
      <div class="rangee">
        <section class="carte moitie" aria-labelledby="af-titre-carte"><h2 id="af-titre-carte">Préparer une action</h2>
          <form id="af"><div class="f"><label for="af-type">Ce que vous voulez faire</label><select id="af-type">${Object.entries(TYPES_ACT).map(([k, lib]) => `<option value="${k}"${k === typeAction ? " selected" : ""}>${lib}</option>`).join("")}</select></div>
            <div class="pile" id="af-champs">${champsAction(ph)}</div>
            <div class="actions"><button class="bouton" type="submit">Préparer l'action</button></div><p class="msg" id="msg" role="status"></p></form></section>
        <section class="carte moitie" aria-labelledby="af-liste-titre"><div class="carte-tete"><h2 id="af-liste-titre">Vos actions</h2>${l.length ? `<span class="note">${l.length}</span>` : ""}</div>
          <p class="note">À valider : relisez, puis validez ou refusez. À publier : RENOM la met sur votre fiche. ${D.mode === "demo" ? "En démonstration, rien n'est envoyé à Google." : ""}</p>
          ${l.length ? `<ul class="liste actions-fiche">${l.map(a => `<li data-action="${e(a.id)}"><div class="prog"><p><span class="fort">${TYPES_ACT[a.type] || e(a.type)}</span> · <span class="etat${a.statut === "a_valider" ? " actif" : ""}">${ST_ACT[a.statut] || e(a.statut)}</span></p>
            <p class="texte2">${resumeAction(a, ph)}</p><p class="note">${a.statut === "publie" && a.publie_le ? "Publié le " + date(a.publie_le) : "Préparé le " + date(a.cree_le)}${a.demo ? " · exemple de démonstration" : ""}</p>
            ${a.statut === "a_valider" ? `<div class="actions serre"><button type="button" class="bouton petit" data-d="approuve">Valider</button><button type="button" class="lien" data-d="refuse">Refuser</button></div>` : ""}</div></li>`).join("")}</ul>`
          : `<p class="texte2">Aucune action pour le moment.</p>`}</section>
      </div>`;
    const brancherChamps = () => { const f = $("af-ferme"); if (f) f.onchange = () => { $("af-heures").hidden = f.checked; }; };
    brancherChamps();
    $("af-type").onchange = () => { typeAction = $("af-type").value; $("af-champs").innerHTML = champsAction(ph); brancherChamps(); msg(""); };
    $("af").onsubmit = async ev => {
      ev.preventDefault(); const v = id => ($(id) ? $(id).value : "");
      const d = typeAction === "photos" ? { photos: [...document.querySelectorAll("input[name=af-photo]:checked")].map(x => x.value) }
        : typeAction === "horaires" ? { date: v("af-date"), ferme: $("af-ferme").checked, ouverture: v("af-ouverture"), fermeture: v("af-fermeture") }
        : { titre: v("af-titre"), debut: v("af-debut"), fin: v("af-fin"), conditions: v("af-conditions") };
      try { await D.creerActionFiche(typeAction, d); await ficheGoogle(); msg("Action préparée. Relisez-la puis validez-la : rien ne part sans votre accord."); } catch (er) { msg(er.message); }
    };
    vue.querySelectorAll("[data-action]").forEach(li => li.addEventListener("click", async ev => {
      const b = ev.target.closest("[data-d]"); if (!b) return;
      try { await D.validerActionFiche(li.dataset.action, b.dataset.d); await ficheGoogle(); msg(b.dataset.d === "approuve" ? "Validé. RENOM publiera cette action sur votre fiche." : "Action refusée. Rien ne sera publié."); } catch (er) { msg(er.message); }
    }));
  }

  // ---------------- Notifications : email de validation (lien à usage unique, 7 jours). WhatsApp : pas maintenant.
  async function notifications() {
    const [c, s] = await Promise.all([D.commerce(), D.session()]), n = c.notifications || { email: true, whatsapp: false };
    const adresse = c.email_validation || (s && s.email) || "";
    vue.innerHTML = `${entete("Mon commerce", "Notifications", "Quand un contenu ou une réponse d'avis attend votre accord, RENOM vous prévient. Vous décidez depuis le message, sans vous connecter.")}
      <div class="rangee">
        <section class="carte moitie" aria-labelledby="n-titre"><h2 id="n-titre">Comment être prévenu</h2><form id="f-notif">
          <fieldset><legend>Canaux</legend>
            <label class="option"><input type="checkbox" id="notif-email"${n.email !== false ? " checked" : ""}><span>Par email${adresse ? `, à <span class="casse">${e(adresse)}</span>` : ""}</span></label>
            <label class="option"><input type="checkbox" id="notif-whatsapp" disabled><span>Par WhatsApp : non disponible pour l'instant</span></label>
            <p class="aide">WhatsApp demande un compte Meta Business. Ce canal n'est pas proposé pour l'instant.</p></fieldset>
          <div class="actions"><button class="bouton" type="submit">Enregistrer</button></div><p class="msg" id="msg" role="status"></p></form></section>
        <section class="carte moitie"><h2>Le lien de validation</h2>
          <ul class="liste"><li>Il ouvre le contenu ou la réponse proposée, sans mot de passe.</li><li>Il sert une seule fois.</li><li>Il est valable 7 jours.</li><li>Un avis sensible n'est jamais envoyé par lien : il se traite dans votre espace.</li></ul>
          <p class="note">L'adresse se change dans <a href="#/fiche">votre fiche</a>, champ « Email pour vos alertes ».</p></section>
      </div>
      ${D.mode === "demo" ? `<section class="carte" aria-labelledby="n-demo"><h2 id="n-demo">Démonstration</h2><p class="texte2">En démonstration, aucun email ne part. Vous pouvez voir ce que vous recevriez.</p>
        <div class="actions"><button type="button" class="bouton second" id="voir-email" aria-expanded="false" aria-controls="apercu-email">Voir l'email de validation</button></div><div id="apercu-email" class="pile" hidden></div></section>` : ""}`;
    $("f-notif").onsubmit = async ev => { ev.preventDefault(); try { await D.enregistrer({ notifications: { email: $("notif-email").checked, whatsapp: false } }); msg("Réglage enregistré."); } catch (er) { msg(er.message); } };
    if ($("voir-email")) $("voir-email").onclick = async () => {
      const z = $("apercu-email"), ouvrir = z.hidden; z.hidden = !ouvrir; $("voir-email").setAttribute("aria-expanded", String(ouvrir)); if (!ouvrir) return;
      const l = await D.outilsDemo.emailsValidation();
      z.innerHTML = l.length ? l.map(m => `<article class="email" aria-label="Aperçu de l'email : ${e(m.objet_email)}">
          <dl class="email-tete"><div><dt>De</dt><dd>RENOM</dd></div><div><dt>À</dt><dd class="casse">${e(adresse || "l'adresse de votre compte")}</dd></div><div><dt>Objet</dt><dd>${e(m.objet_email)}</dd></div></dl>
          <div class="email-corps"><p>Bonjour,</p><p>${e(m.phrase)}</p>${m.extrait ? `<p class="citation">« ${e(m.extrait)} »</p>` : ""}
            <p><a class="bouton" data-lien-validation href="valider.html#${e(m.jeton)}" target="_blank" rel="noopener">Voir et décider</a></p>
            <p class="note">Ce lien sert une seule fois. Il est valable jusqu'au ${date(m.expire_le)}. Sans décision de votre part, rien n'est publié.</p></div></article>`).join("")
        : `<p class="texte2">Rien n'attend votre accord pour le moment : aucun email ne partirait.</p>`;
    };
  }

  // ---------------- Démarrage en 5 questions (premier accès). Chaque question peut être passée ; la fiche complète reste accessible.
  const TONS_LIB = { chaleureux: "Chaleureux", sobre: "Sobre", enjoue: "Enjoué" };
  const ACTIONS_LIB = { reserver: "Réserver", appeler: "Appeler", venir: "Venir sur place", acheter: "Acheter en ligne" };
  const QUESTIONS = [
    { cle: "phrase", titre: "Votre commerce en une phrase", aide: "Ce que vous faites, et pour qui." },
    { cle: "distinctions", titre: "Ce qui vous distingue", aide: "Deux ou trois points, un par ligne. Seulement ce qui est vrai." },
    { cle: "ton", titre: "Le ton de vos publications", aide: "La façon dont RENOM vous fait parler.", choix: TONS_LIB },
    { cle: "interdits", titre: "Ce qu'on ne doit jamais dire ni promettre", aide: "Par exemple : un prix, une promotion, un résultat garanti, un mot que vous n'aimez pas." },
    { cle: "action", titre: "L'action à demander à vos clients", aide: "Ce que vos publications invitent à faire.", choix: ACTIONS_LIB, detail: "Le lien ou le numéro (facultatif)" },
  ];
  const dem = { pour: null, i: 0, rep: {}, fini: false };
  async function demarrage() {
    const c = await D.commerce();
    if (dem.pour !== c.id) Object.assign(dem, { pour: c.id, i: 0, rep: { ...(c.demarrage || {}) }, fini: false });
    if (dem.fini) {
      vue.innerHTML = `${entete("Démarrage terminé", e(c.nom), "Merci. Vos réponses préremplissent votre fiche. Vérifiez-la quand vous voulez : RENOM n'écrit que ce qu'elle contient.")}
        <section class="carte"><h2>Et maintenant ?</h2><p class="texte2">Déposez quelques photos de votre commerce : chacune sert à créer un contenu, que vous validez.</p>
          <div class="actions"><button type="button" class="bouton" id="dem-accueil">Aller à l'accueil</button><a class="bouton second" href="#/fiche">Voir votre fiche</a></div></section>`;
      $("dem-accueil").onclick = () => { dem.pour = null; aller("accueil"); };
      return;
    }
    const q = QUESTIONS[dem.i], v = dem.rep[q.cle] || "";
    vue.innerHTML = `${entete("Démarrage en 5 questions", e(c.nom), "Une question à la fois. Vos réponses préremplissent votre fiche. Chaque question peut être passée.")}
      <section class="carte demarrage">
        <div class="mesure"><div class="mesure-tete"><span class="fort">Question ${dem.i + 1} sur 5</span></div>${jauge(dem.i + 1, 5)}</div>
        <form id="dem-f" novalidate>
          ${q.choix ? `<fieldset><legend class="q-titre" id="q-titre">${q.titre}</legend><p class="aide">${q.aide}</p>${Object.entries(q.choix).map(([k, lib]) => `<label class="option"><input type="radio" name="dem-choix" value="${k}"${v === k ? " checked" : ""}><span>${lib}</span></label>`).join("")}</fieldset>
            ${q.detail ? `<div class="f"><label for="dem-detail">${q.detail}</label><input id="dem-detail" type="text" maxlength="200" value="${e(dem.rep.action_detail || "")}"></div>` : ""}`
          : `<div class="f"><label for="dem-champ" class="q-titre" id="q-titre">${q.titre}</label><p class="aide" id="q-aide">${q.aide}</p><textarea id="dem-champ" class="haut-texte" maxlength="600" aria-describedby="q-aide">${e(v)}</textarea></div>`}
          <div class="actions"><button class="bouton" type="submit" id="dem-suivant">${dem.i === 4 ? "Terminer" : "Suivant"}</button><button type="button" class="bouton second" id="dem-passer">Passer cette question</button>${dem.i ? `<button type="button" class="lien" id="dem-precedent">Question précédente</button>` : ""}</div>
          <p class="msg" id="msg" role="status"></p></form></section>
      <p class="note"><button type="button" class="lien" id="dem-plus-tard">Faire plus tard</button> La fiche complète reste accessible dans « Mon commerce ».</p>`;
    const lire = () => { if (q.choix) { const x = document.querySelector("input[name=dem-choix]:checked"); dem.rep[q.cle] = x ? x.value : ""; if (q.detail) dem.rep.action_detail = $("dem-detail").value.trim(); } else dem.rep[q.cle] = $("dem-champ").value.trim(); };
    const avancer = async () => {
      if (dem.i < 4) { dem.i++; await demarrage(); const f = vue.querySelector("#dem-champ, input[name=dem-choix]"); if (f) f.focus(); return; }
      try {
        await D.enregistrerDemarrage(dem.rep);
        const c2 = await D.commerce(), r = dem.rep, pre = {};   // la fiche est préremplie, sans écraser ce qui y est déjà
        if (!c2.specialites && (r.phrase || r.distinctions)) pre.specialites = [r.phrase, r.distinctions].filter(Boolean).join("\n");
        if (!c2.ton && TONS_LIB[r.ton]) pre.ton = TONS_LIB[r.ton].toLowerCase();
        if (Object.keys(pre).length) await D.enregistrer(pre);
        dem.fini = true; await demarrage(); majCompteurs();
      } catch (er) { msg(er.message); }
    };
    $("dem-f").onsubmit = async ev => { ev.preventDefault(); lire(); await avancer(); };
    $("dem-passer").onclick = async () => { await avancer(); };
    if ($("dem-precedent")) $("dem-precedent").onclick = async () => { lire(); dem.i--; await demarrage(); };
    $("dem-plus-tard").onclick = () => { try { localStorage.setItem("renom-demarrage-plus-tard:" + c.id, "1"); } catch (er) {} dem.pour = null; aller("accueil"); };
  }

  // ---- Vidéo d'avis ------------------------------------------------------------------------------------------------
  // Écran du groupe « Créer » : choisir 2 à 4 avis, un fond, un style ; la vidéo arrive dans « Contenus », à valider.
  // Tout ce qui concerne la vidéo d'avis est dans ce bloc (écran, entrée de menu, libellés du journal) ; les règles sont dans donnees.js.
  const VA = window.RENOM_VIDEO_AVIS;
  GROUPES.find(g => g.id === "creer").ecrans.push("videoavis"); ECRANS.videoavis = "Vidéo d'avis";
  Object.assign(ETAPES, { VIDEO_AVIS: "Vidéo d'avis créée", VIDEO_AVIS_DEMANDEE: "Vidéo d'avis demandée", VIDEO_AVIS_REFUSEE: "Vidéo d'avis refusée" });
  const ST_VA = { a_traiter: "En attente de rendu", en_cours: "Rendu en cours", traitee: "Vidéo créée", refusee: "Demande refusée" };
  const va = { choisis: [], fond: null, style: "franc", veille: null };
  const vaPolice = p => `font-family:'${p[0]}',system-ui,sans-serif;font-variation-settings:${p[1]}`;
  // Même calcul de contraste que le moteur (gabarits.py) : le texte de l'aperçu prend la couleur que la vidéo prendra.
  const vaLum = h => { const v = parseInt(h.slice(1), 16), f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(v >> 16) + 0.7152 * f((v >> 8) & 255) + 0.0722 * f(v & 255); };
  const vaContraste = (a, b) => { const [x, y] = [vaLum(a), vaLum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  // Étoiles dessinées (formes), jamais un caractère : pleines jusqu'à la note, en contour ensuite.
  const vaEtoiles = n => `<svg class="va-etoiles" viewBox="0 0 116 20" role="img" aria-label="${etoiles(n)}">${[0, 1, 2, 3, 4].map(i => `<path transform="translate(${i * 24})" d="M10 1.2l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L1.4 7.5l6-.8z" ${i < n ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.3"'}></path>`).join("")}</svg>`;
  const vaDemande = x => { const f = VA.FONDS.find(y => y.id === x.fond), s = VA.STYLES.find(y => y.id === x.style);
    return `<li><div><p class="fort">${x.avis_ids.length} avis · ${e(f ? f.nom : x.fond)} · style ${e(s ? s.nom : x.style)}</p><p class="note">Demandée ${jourRelatif(x.cree_le).toLowerCase()} à ${heure(x.cree_le)}${x.demo ? " · rendu simulé (démonstration)" : ""}</p>
      ${x.statut === "refusee" && x.motif ? `<p class="note">Motif : ${e(x.motif)}</p>` : ""}${x.statut === "traitee" ? `<p class="note"><a href="#/contenus">À valider dans vos contenus</a></p>` : ""}</div><span class="etat${x.statut === "a_traiter" || x.statut === "en_cours" ? " actif" : ""}">${ST_VA[x.statut] || e(x.statut)}</span></li>`; };
  const vaQuota = k => `<strong>Une vidéo d'avis compte pour une vidéo de votre offre</strong> : ${k.videos_utilisees} sur ${k.videos_plafond} ${pluriel(k.videos_utilisees, "utilisée", "utilisées")} ce mois-ci.`;
  async function vaSuivre() {
    // Tant qu'une demande attend son rendu, on relit son état toutes les deux secondes, sans redessiner l'écran (la sélection reste).
    clearTimeout(va.veille); if (route !== "videoavis" || !$("va-demandes")) return;
    const [dem, k] = await Promise.all([D.demandesVideoAvis(), D.compteur()]);
    $("va-demandes").innerHTML = dem.length ? `<ul class="liste">${dem.slice(0, 6).map(vaDemande).join("")}</ul>` : `<p class="texte2">Aucune demande pour le moment.</p>`;
    if ($("va-quota")) $("va-quota").innerHTML = vaQuota(k);
    majCompteurs();
    if (dem.some(x => x.statut === "a_traiter" || x.statut === "en_cours")) va.veille = setTimeout(() => vaSuivre().catch(() => {}), 2000);
  }
  async function videoAvis() {
    const [c, k, tous, ph] = await Promise.all([D.commerce(), D.compteur(), D.avisVideo(), D.photos()]);
    const titre = entete("Créer", "Vidéo d'avis", "Choisissez de 2 à 4 avis de votre fiche Google. RENOM en fait une vidéo verticale, que vous validez dans vos contenus avant toute publication.");
    if (!k.videos_plafond) {
      vue.innerHTML = `${pauseBandeau(c)}${titre}<section class="carte"><h2>Votre offre ne comprend pas de vidéo</h2>
        <p class="texte2 lecture">L'offre ${e(k.offre_nom)} ne comprend aucune vidéo : la vidéo d'avis ne peut pas être créée. Pour en créer, contactez RENOM pour changer d'offre.</p><p class="pied"><a href="#/offre">Voir votre offre</a></p></section>`;
      return;
    }
    const motifs = new Map(tous.map(a => [a.id, VA.motif(a)])), bons = tous.filter(a => !motifs.get(a.id)), autres = tous.filter(a => motifs.get(a.id));
    va.choisis = va.choisis.filter(id => bons.some(a => a.id === id));
    if (!va.fond || (va.fond === "photos" && !ph.length)) va.fond = ph.length ? "photos" : "uni";
    const co = c.couleurs || {};
    vue.innerHTML = `${pauseBandeau(c)}${titre}
      <div class="colonnes va">
        <div class="pile">
          <section class="carte"><div class="carte-tete"><h2>1. Les avis à citer</h2><span class="note" id="va-compte"></span></div>
            <p class="note">Chaque avis est cité mot pour mot, avec le prénom de son auteur et l'initiale de son nom. Rien n'est corrigé, raccourci ni ajouté. L'ordre de la vidéo est celui dans lequel vous cochez.</p>
            ${bons.length ? `<ul class="liste va-avis">${bons.map(a => `<li><label class="option va-choix"><input type="checkbox" name="va-avis" value="${e(a.id)}"${va.choisis.includes(a.id) ? " checked" : ""}>
              <span class="va-texte"><span class="fort">${e(a.auteur)} · ${etoiles(a.note)}</span><span class="citation">«&nbsp;${e(a.texte)}&nbsp;»</span>
              <span class="note">${VA.longueur(a.texte)} caractères sur ${VA.LIMITE} au plus${a.demo ? " · avis fictif de démonstration" : ""}<span data-rang></span></span></span></label></li>`).join("")}</ul>`
            : `<p class="texte2">Aucun avis proposable pour le moment. Les avis de 4 et 5 étoiles de votre fiche Google apparaîtront ici dès que la connexion à Google sera active.</p>`}
            ${autres.length ? `<details class="va-refus"><summary>Avis non proposés, et pourquoi (${autres.length})</summary><ul class="liste">${autres.map(a => `<li><div><p class="fort">${e(a.auteur || "Auteur inconnu")} · ${etoiles(a.note)}</p><p class="citation">«&nbsp;${e(cut(a.texte || "", 140))}&nbsp;»</p><p class="note">${e(motifs.get(a.id))}</p></div></li>`).join("")}</ul></details>` : ""}
          </section>
          <section class="carte"><h2>2. Le fond</h2><fieldset><legend class="vh">Fond de la vidéo</legend>
            ${VA.FONDS.map(f => { const sans = f.id === "photos" && !ph.length; return `<label class="option va-choix"><input type="radio" name="va-fond" value="${f.id}"${va.fond === f.id ? " checked" : ""}${sans ? " disabled" : ""}><span class="va-texte"><span>${f.nom}${sans ? " (aucune photo déposée)" : ""}</span><span class="note">${f.note}</span></span></label>`; }).join("")}</fieldset></section>
          <section class="carte"><h2>3. La typographie</h2><p class="note">Cinq styles, bâtis sur deux familles de polices libres.</p>
            <fieldset class="va-styles"><legend class="vh">Style de typographie</legend>${VA.STYLES.map(s => `<label class="va-style"><input class="vh" type="radio" name="va-style" value="${s.id}"${va.style === s.id ? " checked" : ""}>
              <span class="va-style-nom" style="${vaPolice(s.titre)}">${s.nom}</span><span class="va-style-ex" style="${vaPolice(s.texte)}">Le texte de l'avis s'écrit ainsi.</span></label>`).join("")}</fieldset></section>
        </div>
        <div class="pile">
          <section class="carte"><div class="carte-tete"><h2>Aperçu</h2><span class="note">Indicatif</span></div>
            <div class="va-apercu" id="va-apercu"></div>
            <p class="note">Premier avis choisi, dans le style et sur le fond choisis. La mise en lignes définitive est faite au rendu de la vidéo.</p></section>
          <section class="carte"><h2>Créer la vidéo</h2><p class="texte2" id="va-quota">${vaQuota(k)}</p>
            <p class="note">Vidéo verticale, sans musique ni voix dans cette version. Rien n'est publié sans votre accord.</p>
            <div class="actions"><button type="button" class="bouton" id="va-creer">Créer la vidéo</button></div><p class="msg" id="msg" role="status"></p></section>
          <section class="carte"><h2>Vos demandes</h2><div id="va-demandes"></div></section>
        </div>
      </div>`;
    const cases = [...vue.querySelectorAll("input[name=va-avis]")];
    const maj = () => {
      const n = va.choisis.length, premier = bons.find(a => a.id === va.choisis[0]), s = VA.STYLES.find(x => x.id === va.style) || VA.STYLES[0];
      $("va-compte").textContent = `${n} sur ${VA.MAX} au plus`;
      cases.forEach(i => { i.disabled = !i.checked && n >= VA.MAX; const r = va.choisis.indexOf(i.value); i.closest("label").querySelector("[data-rang]").textContent = r < 0 ? "" : ` · en position ${r + 1} dans la vidéo`; });
      $("va-creer").disabled = n < VA.MIN || !!c.en_pause;
      if (!$("msg").dataset.fixe) msg(n < VA.MIN ? `Cochez au moins ${VA.MIN} avis${n ? ` (${n} pour le moment)` : ""}.` : "");
      // Aperçu : couleurs de la fiche pour un fond uni ; pour les photos, un fond sombre neutre tient lieu de photo assombrie.
      const hex = (x, d) => /^#[0-9a-f]{6}$/i.test(x || "") ? x : d, accent = hex(co.accent, "#2438FF");
      const fond = va.fond === "photos" ? "#26282E" : va.fond === "accent" ? accent : hex(co.fond, "#FFFFFF");
      const encre = va.fond === "photos" ? "#FFFFFF" : [hex(co.texte, "#000000"), hex(co.fond, "#FFFFFF"), "#000000", "#FFFFFF"].find(x => vaContraste(x, fond) >= 4.5) || "#000000";
      const etoile = va.fond === "uni" && vaContraste(accent, fond) >= 3 ? accent : encre;
      const texte = premier ? premier.texte : "Cochez un avis : son texte s'affiche ici, tel qu'il a été écrit.", taille = Math.max(13, Math.min(21, 21 - (VA.longueur(texte) - 60) / 22));
      const ap = $("va-apercu"); ap.style.background = fond; ap.style.color = encre;
      ap.innerHTML = `<p class="va-ap-nom" style="${vaPolice(s.auteur)}">${e(c.nom)}</p><div class="va-ap-centre"><span style="color:${etoile}">${vaEtoiles(premier ? premier.note : 5)}</span>
        <p class="va-ap-texte" style="${vaPolice(s.texte)};font-size:${taille.toFixed(1)}px">${e(texte)}</p><p class="va-ap-auteur" style="${vaPolice(s.auteur)}">${premier ? e(premier.auteur) : ""}</p></div>`;
    };
    cases.forEach(i => i.onchange = () => { delete $("msg").dataset.fixe; if (i.checked) va.choisis.push(i.value); else va.choisis = va.choisis.filter(x => x !== i.value); maj(); });
    vue.querySelectorAll("input[name=va-fond]").forEach(i => i.onchange = () => { va.fond = i.value; maj(); });
    vue.querySelectorAll("input[name=va-style]").forEach(i => i.onchange = () => { va.style = i.value; maj(); });
    $("va-creer").onclick = async () => {
      try {
        $("va-creer").disabled = true; await D.demanderVideoAvis({ avis_ids: va.choisis, fond: va.fond, style: va.style });
        va.choisis = []; await videoAvis(); $("msg").dataset.fixe = "1"; msg("Demande enregistrée. La vidéo arrivera dans vos contenus, à valider.");
      } catch (er) { $("msg").dataset.fixe = "1"; msg(er.message); $("va-creer").disabled = va.choisis.length < VA.MIN; }
    };
    maj(); await vaSuivre();
  }
  // ---- fin du bloc Vidéo d'avis ------------------------------------------------------------------------------------

  // ---------------- Routage
  const ROUTES = { connexion, accueil, resultats, fiche, photos, contenus, calendrier, avis, collecte, fichegoogle: ficheGoogle, comptes, offre, notifications, demarrage, videoavis: videoAvis };
  const aller = r => { if (location.hash === "#/" + r) rendre(); else location.hash = "#/" + r; };
  let derniere = null;
  async function rendre() {
    const r = (location.hash.replace("#/", "") || "accueil").split("?")[0], s = await D.session();
    // Ancienne adresse (par exemple #/idees) : remplacée par la nouvelle, sans ajouter d'étape dans l'historique.
    if (ANCIENNES[r]) { if (r === "idees") ideesOuvertes = true; history.replaceState(null, "", "#/" + ANCIENNES[r]); return rendre(); }
    if (!s) { connecte = false; derniere = null; dessinerNav(); return connexion(); }
    if (s.role === "administrateur" && D.mode === "demo" && !/(\?|&)voir\b/.test(location.search)) { location.href = "console.html"; return; }
    connecte = true; route = ECRANS[r] ? r : "accueil"; dessinerNav();
    if (derniere !== route) { filtre = null; window.scrollTo(0, 0); if (route !== "contenus") ideesOuvertes = false; } derniere = route;
    ecranCourant = ROUTES[route];
    try { await ROUTES[route](); } catch (er) { vue.innerHTML = `<section class="carte"><h1>Un souci est survenu</h1><p>${e(er.message)}</p></section>`; }
    vue.focus({ preventScroll: true }); majCompteurs();
  }
  document.addEventListener("click", async ev => { if (ev.target.closest("#sortir")) { await D.quitter(); aller("accueil"); } });
  document.querySelectorAll("[data-o]").forEach(b => b.onclick = async () => { await D.outilsDemo[b.dataset.o](); rendre(); });
  large.addEventListener("change", () => { dessinerNav(); majCompteurs(); });
  window.addEventListener("hashchange", rendre); rendre();
})();
