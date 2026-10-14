(function () {
  const D = window.RENOM_DATA, $ = id => document.getElementById(id), vue = $("vue");
  // Textes, dates et nombres : espace/web/i18n.js (français ou anglais). Les contenus du commerce (légendes, avis, réponses, idées) restent dans sa langue.
  const I = window.RENOM_I18N, t = I.t, ph = I.phrase;
  const e = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MOIS = I.mois(), JOURS = I.joursCourts();
  const ST_PHOTO = I.carte("st.photo", ["a_traiter", "en_cours", "traitee", "refusee"]);
  const ST_CONTENU = I.carte("st.contenu", ["a_valider", "approuve", "modification", "programme", "publie", "refuse"]);
  const ST_PUB = I.carte("st.pub", ["programme", "envoye", "publie", "echec", "annule"]);
  const ST_AVIS = I.carte("st.avis", ["nouveau", "a_valider", "valide", "publie", "humain", "refuse"]);
  const METIERS = I.carte("metier", ["restaurant", "beaute", "sport", "autre"]);
  const RES = I.carte("res", ["facebook", "instagram", "google", "tiktok"]);
  const ETAT = I.carte("etat", ["non_connecte", "en_attente", "connecte", "erreur"]);
  const ETAPES = I.carte("etape", ["PRODUIT", "PUBLIE", "PROGRAMME", "PROGRAMMATION_ANNULEE", "IDEES", "CONTENU_APPROUVE", "CONTENU_MODIFICATION", "CONTENU_REFUSE", "REFUS", "LEGENDE_REFUSEE", "ECHEC_PUBLICATION",
    "AVIS_RECU", "AVIS_A_VALIDER", "AVIS_VALIDE", "AVIS_REFUSE", "AVIS_PUBLIE", "AVIS_SENSIBLE", "MISE_EN_PAUSE", "REPRISE", "OFFRE_CHANGEE", "COMMERCE_CREE", "LEGENDE_MODIFIEE", "EMAIL_VALIDATION",
    "ACTION_FICHE", "ACTION_FICHE_VALIDEE", "ACTION_FICHE_REFUSEE", "ACTION_FICHE_PUBLIEE", "DEMARRAGE", "COMMENTAIRE_VALIDE", "COMMENTAIRE_IGNORE", "COMMENTAIRE_CLOS", "COMMENTAIRE_PUBLIE",
    "AVIS_EFFACES_30_JOURS", "COMMENTAIRES_EFFACES_30_JOURS", "ABONNEMENT_EN_ATTENTE", "ABONNEMENT_ACTIF", "ABONNEMENT_IMPAYE", "ABONNEMENT_RESILIE"]);
  const ST_ABO = I.carte("abo.st", ["en_attente", "actif", "impaye", "resilie"]);
  const M = window.RENOM_MAJ;
  const nombre = I.nombre;
  const moisDe = m => new Date(m.slice(0, 7) + "-15T12:00:00");
  const hm = I.hm;
  const creneauxTexte = metier => I.liste((M.CRENEAUX[metier] || M.CRENEAUX.autre).map(x => hm(x)));

  // ---------------- Dates et heures, dans la langue de l'interface (i18n.js)
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const jourMois = I.jourMois, date = I.date, heure = I.heure, heureCourte = I.heureCourte, dateHeure = I.dateHeure;
  const memeJour = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const jourRelatif = d => { const j = new Date(d), n = new Date(), h = new Date(Date.now() - 86400000); return memeJour(j, n) ? t("jour.aujourdhui") : memeJour(j, h) ? t("jour.hier") : cap(date(d)); };
  const jourLocal = d => { d = new Date(d); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const heureLocale = d => { d = new Date(d); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
  const demain = () => jourLocal(Date.now() + 86400000);

  const cut = (s, n) => s.length > n ? s.slice(0, s.lastIndexOf(" ", n)) + "…" : s;
  const msg = x => { const m = $("msg"); if (m) m.textContent = x; };
  const urlSure = async x => { try { return x ? await D.urlVisuel(x) : null; } catch (er) { return null; } };
  const videoSure = async x => { try { return x && x.type === "video" ? await D.urlVideo(x) : null; } catch (er) { return null; } };
  $("demo").hidden = D.mode !== "demo";
  // Langue du commerce : les contenus écrits pour lui (légendes, avis, réponses, idées) gardent sa langue ; l'attribut lang le dit au navigateur.
  let langueCommerce = "fr";
  const lc = () => ` lang="${langueCommerce}"`;

  // ---------------- Morceaux d'écran partagés
  const pauseBandeau = c => c && c.en_pause ? `<div class="alerte" role="alert"><div><p class="fort">${t("pause.titre")}</p><p>${t("pause.texte")}</p></div></div>` : "";
  const entete = (sur, titre, texte) => `<div class="entete">${sur ? `<p class="sur">${sur}</p>` : ""}<h1>${titre}</h1>${texte ? `<p class="chapo">${texte}</p>` : ""}</div>`;
  const jauge = (u, n) => `<div class="jauge" role="img" aria-label="${t("sur", { a: u, b: n })}"><span style="width:${n ? Math.min(100, u / n * 100) : 0}%"></span></div>`;
  const mesure = (nom, u, n) => `<div class="mesure"><div class="mesure-tete"><span>${nom}</span><span>${t("sur.chiffre", { a: `<span class="chiffre">${u}</span>`, b: n })}</span></div>${jauge(u, n)}</div>`;
  const vignette = u => u ? `<img class="vignette" src="${e(u)}" alt="">` : `<span class="vignette vide" aria-hidden="true"></span>`;
  const FORMAT_LIB = I.carte("format.lib", ["publication", "story", "video"]);
  const media = (x, u, v) => `<div class="media">${v ? `<video class="visuel" controls preload="metadata" poster="${e(u || "")}" src="${e(v)}"></video>` : u ? `<img class="visuel" src="${e(u)}" alt="${t("visuel.alt")}">` : `<div class="visuel vide">${t("apercu.indispo")}</div>`}</div>`;
  // Les trois décisions sur un contenu à valider : mêmes boutons et mêmes appels sur l'accueil et sur l'écran Contenus.
  // La légende se modifie soi-même (voir blocReseaux) ; « Demander une modification à RENOM » reste pour ce qu'on ne peut pas faire seul, comme le visuel.
  const decisions = (x, refus) => `<div class="actions" data-choix><button type="button" class="bouton" data-a="approuve">${t("dec.approuver")}</button><button type="button" class="bouton second" data-a="modif">${t("dec.modif")}</button><button type="button" class="lien" data-a="refuse">${refus}</button></div>
    <div class="f" data-zone hidden><label for="mot-${e(x.id)}">${t("dec.mot")}</label><textarea id="mot-${e(x.id)}" data-mot></textarea>
      <div class="actions"><button type="button" class="bouton" data-a="envoyer-modif">${t("dec.envoyer")}</button><button type="button" class="lien" data-a="fermer-modif">${t("annuler")}</button></div></div>`;
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
        await apres(); msg(t("enregistre")); majCompteurs();
      } catch (er) { msg(ph(er.message)); }
    }));
  }
  function brancherAvis(racine, apres) {
    racine.querySelectorAll("[data-avis]").forEach(a => a.addEventListener("click", async ev => {
      const b = ev.target.closest("[data-a]"); if (!b) return;
      try { await D.validerAvis(a.dataset.avis, b.dataset.a, b.dataset.a === "valide" ? a.querySelector("[data-texte]").value : null); await apres(); msg(t("enregistre")); majCompteurs(); } catch (er) { msg(ph(er.message)); }
    }));
  }
  const reponseAValider = x => `<div class="f"><label for="rep-${e(x.id)}">${t("rep.proposee")}</label><textarea id="rep-${e(x.id)}" class="haut-texte" data-texte${lc()}>${e(x.reponse_proposee || "")}</textarea></div>
    <div class="actions"><button type="button" class="bouton" data-a="valide">${t("rep.valider")}</button><button type="button" class="lien" data-a="refuse">${t("rep.refuser")}</button></div>`;
  const etoiles = n => n == null ? t("note.effacee") : t("etoiles", { n });
  // Avis de plus de 30 jours : texte, note et auteur effacés (règle « Content storage » de l'API Google Business Profile) ; notre réponse reste.
  const citation = x => x.efface_le ? `<p class="note efface">${t("avis.efface")}</p>` : x.texte ? `<p class="citation"${lc()}>${t("guillemets", { x: e(x.texte) })}</p>` : `<p class="citation">${t("avis.sans.texte")}</p>`;
  const raisonsTexte = l => (l || []).map(r => ph(r)).join(", ");

  // ---------------- Aperçu au format du réseau et légende par réseau (Contenus et Accueil)
  // Un cadre sobre qui rappelle la publication sur chaque réseau. Aucun logo de marque : le nom du réseau suffit.
  const ORDRE_RES = ["instagram", "facebook", "google", "tiktok"];
  const vus = new Map(), choixRes = {};   // contenu affiché (id -> {x, u, v}) ; réseau choisi par contenu
  let nomCommerce = "";
  function cadre(id) {
    const { x, u, v } = vus.get(id), r = choixRes[id] || "instagram", f = M.formatDe(x), vertical = f !== "publication" || r === "tiktok";
    if (!M.reseauxPour(x).includes(r)) return `<div class="cadre-vide"><p class="texte2">${t(f === "video" ? "cadre.video.google" : "cadre.story.google")}</p><p class="note">${t("cadre.choisir")}</p></div>`;
    const l = M.legendeDe(x, r), n = M.longueur(l), lim = r === "google" ? M.LIMITE_GOOGLE : 0;
    const visuel = v ? `<video class="visuel" controls preload="metadata" poster="${e(u || "")}" src="${e(v)}"></video>` : u ? `<img class="visuel" src="${e(u)}" alt="${t("visuel.alt")}">` : `<div class="visuel vide">${t("apercu.indispo")}</div>`;
    const tete = `<div class="cadre-tete"><span class="avatar" aria-hidden="true">${e((nomCommerce || "R").charAt(0).toUpperCase())}</span><span class="cadre-nom">${e(nomCommerce)}</span><span class="cadre-res">${RES[r]}${f === "story" ? t("cadre.story") : ""}</span></div>`;
    const texte = `<p class="cadre-texte" data-legende${lc()}>${r === "instagram" && f === "publication" ? `<span class="fort">${e(nomCommerce)}</span> ` : ""}${e(l)}</p>`;
    const corps = r === "facebook" ? tete + (f === "publication" ? texte + visuel : visuel + texte) : r === "tiktok" ? visuel + tete + texte : tete + visuel + texte;
    return `<div class="cadre cadre-${r}${vertical ? " vertical" : ""}">${corps}</div>
      <p class="note" data-compte>${t("car", { n })}${lim ? t("car.sur", { lim: nombre(lim) }) + (n > lim ? t("car.trop.google") : "") : ""}</p>`;
  }
  function blocReseaux(x, u, v) {
    vus.set(x.id, { x, u, v }); const r = choixRes[x.id] || "instagram", modifiable = (x.statut === "a_valider" || x.statut === "approuve") && M.reseauxPour(x).includes(r);
    return `<div class="reseaux" data-reseaux="${e(x.id)}">
      <div class="res-onglets" role="tablist" aria-label="${t("res.onglets")}">${ORDRE_RES.map(k => `<button type="button" role="tab" id="t-${e(x.id)}-${k}" data-res="${k}" aria-selected="${k === r}" tabindex="${k === r ? 0 : -1}">${RES[k]}</button>`).join("")}</div>
      <div class="res-panneau" role="tabpanel" aria-labelledby="t-${e(x.id)}-${r}">${cadre(x.id)}</div>
      ${modifiable ? `<div class="f" data-edition hidden><label for="leg-${e(x.id)}">${t("leg.pour", { res: RES[r] })}</label><textarea id="leg-${e(x.id)}" class="haut-texte" data-texte-legende${lc()}></textarea>
        <p class="note" data-compte-edition aria-live="polite"></p>
        <div class="actions"><button type="button" class="bouton petit" data-a="leg-enregistrer">${t("leg.enregistrer")}</button><button type="button" class="lien" data-a="leg-annuler">${t("annuler")}</button></div></div>
        <button type="button" class="lien leg-modifier" data-a="leg-modifier">${t("leg.modifier", { res: RES[r] })}</button>` : ""}
    </div>`;
  }
  const compteEdition = (r, x) => { const n = M.longueur(x), lim = r === "google" ? M.LIMITE_GOOGLE : 0; return `${t("car", { n })}${lim ? t("car.sur", { lim: nombre(lim) }) : ""}${lim && n > lim ? t("car.trop.google.phrase") : ""}`; };
  function redessinerReseaux(b, focus) {
    const id = b.dataset.reseaux, { x, u, v } = vus.get(id); const d = document.createElement("div"); d.innerHTML = blocReseaux(x, u, v); const neuf = d.firstElementChild; b.replaceWith(neuf);
    if (focus) neuf.querySelector(`[data-res="${choixRes[id]}"]`).focus();
  }
  // Programmer au meilleur créneau : réseaux connectés compatibles avec le format, créneau de départ du métier.
  async function programmerAuto(id) {
    const [x, cpt] = await Promise.all([D.contenus().then(l => l.find(y => y.id === id)), D.comptes()]);
    if (!x) throw new Error(t("err.contenu.introuvable"));
    const res = cpt.filter(k => k.etat === "connecte").map(k => k.reseau).filter(r => M.reseauxPour(x).includes(r));
    if (!res.length) throw new Error(t("err.aucun.reseau"));
    const quand = await D.programmerAuto(id, res); approuveRecent = null;
    return t("auto.programme", { quand: I.dateHeureDans(quand), res: res.map(r => RES[r]).join(", ") });
  }
  const boutonsAuto = (id, metier) => `<div class="actions"><button type="button" class="bouton" data-auto="${e(id)}">${t("auto.bouton")}</button><a class="bouton second" href="#/calendrier">${t("auto.moi")}</a></div>
    <p class="note">${t("auto.creneaux", { h: creneauxTexte(metier) })}</p>`;
  async function proposition(c) {
    if (!approuveRecent) return ""; const x = (await D.contenus()).find(y => y.id === approuveRecent);
    if (!x || x.statut !== "approuve") { approuveRecent = null; return ""; }
    return `<section class="carte proposition" id="proposition"><div><p class="fort">${t("prop.titre")}</p><p class="texte2">${t("prop.texte")}</p></div>${boutonsAuto(x.id, c.metier)}</section>`;
  }
  // Un seul écouteur pour tout l'écran : onglets de réseau, édition de la légende, programmation au meilleur créneau.
  let ecranCourant = null;
  vue.addEventListener("click", async ev => {
    const onglet = ev.target.closest("[data-res]");
    if (onglet) { const b = onglet.closest("[data-reseaux]"); choixRes[b.dataset.reseaux] = onglet.dataset.res; redessinerReseaux(b, true); return; }
    const auto = ev.target.closest("[data-auto]");
    if (auto) { auto.disabled = true; try { const m = await programmerAuto(auto.dataset.auto); await ecranCourant(); msg(m); majCompteurs(); } catch (er) { auto.disabled = false; msg(ph(er.message)); } return; }
    const a = ev.target.closest("[data-a^='leg-']"); if (!a) return;
    const b = a.closest("[data-reseaux]"), id = b.dataset.reseaux, r = choixRes[id] || "instagram", ed = b.querySelector("[data-edition]"), ta = b.querySelector("[data-texte-legende]"), bt = b.querySelector(".leg-modifier");
    if (a.dataset.a === "leg-modifier") { ta.value = M.legendeDe(vus.get(id).x, r); b.querySelector("[data-compte-edition]").textContent = compteEdition(r, ta.value); ed.hidden = false; bt.hidden = true; ta.focus(); return; }
    if (a.dataset.a === "leg-annuler") { ed.hidden = true; bt.hidden = false; bt.focus(); return; }
    try { await D.modifierLegende(id, r, ta.value); await ecranCourant(); msg(t("leg.enregistree", { res: RES[r] })); } catch (er) { msg(ph(er.message)); }
  });
  vue.addEventListener("input", ev => { const ta = ev.target.closest("[data-texte-legende]"); if (!ta) return; const b = ta.closest("[data-reseaux]"); b.querySelector("[data-compte-edition]").textContent = compteEdition(choixRes[b.dataset.reseaux] || "instagram", ta.value); });
  vue.addEventListener("keydown", ev => {
    const k = ev.target.closest("[data-res]"); if (!k || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(ev.key)) return; ev.preventDefault();
    const i = ORDRE_RES.indexOf(k.dataset.res), j = ev.key === "Home" ? 0 : ev.key === "End" ? 3 : (i + (ev.key === "ArrowRight" ? 1 : 3)) % 4, b = k.closest("[data-reseaux]");
    choixRes[b.dataset.reseaux] = ORDRE_RES[j]; redessinerReseaux(b, true);
  });

  // ---------------- Navigation : barre latérale sur ordinateur, onglets du bas sur téléphone
  // Barre latérale : Accueil, Résultats, Créer, Publier, Réputation, Mon commerce. Téléphone : 5 onglets (le calendrier rejoint Créer).
  const GROUPES = [
    { id: "accueil", nom: t("groupe.accueil"), ecrans: ["accueil"], seul: true },
    { id: "resultats", nom: t("groupe.resultats"), ecrans: ["resultats"], seul: true },
    { id: "creer", nom: t("groupe.creer"), ecrans: ["photos", "contenus"], compte: "contenus" },
    { id: "publier", nom: t("groupe.publier"), ecrans: ["calendrier"], mobile: "creer" },
    { id: "reputation", nom: t("groupe.reputation"), court: t("groupe.reputation.court"), ecrans: ["avis", "commentaires", "collecte", "fichegoogle"], compte: "avis" },
    { id: "commerce", nom: t("groupe.commerce"), court: t("groupe.commerce.court"), ecrans: ["fiche", "offre", "comptes", "notifications"] },
  ];
  const ECRANS = I.carte("ecran", ["accueil", "resultats", "photos", "contenus", "calendrier", "avis", "commentaires", "collecte", "fichegoogle", "fiche", "offre", "comptes", "notifications", "demarrage"]);
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
  const GALERIE = trait('<rect x="4" y="4" width="16" height="16" rx="3"></rect><circle cx="9" cy="9.5" r="1.5"></circle><path d="M4 16l4.5-4.5 4 4 3-3L20 17"></path>');
  const CAMERA = trait('<rect x="3" y="7" width="13" height="10" rx="2"></rect><path d="M16 11l5-3v8l-5-3z"></path>');
  const FILM = trait('<rect x="4" y="4" width="16" height="16" rx="3"></rect><path d="M10 9l5 3-5 3z"></path>');
  const large = window.matchMedia("(min-width: 900px)");
  const nb = { contenus: 0, avis: 0, commentaires: 0 }; let offreNom = "", route = "accueil", connecte = false;
  const compte = k => `<span class="nb" data-nb="${k}"${nb[k] ? "" : " hidden"}><span data-n>${nb[k] || ""}</span><span class="vh">${t("nav.a.traiter")}</span></span>`;
  const lienMenu = r => `<a href="#/${r}" data-r="${r}"${r === route ? ' aria-current="page"' : ""}><span>${ECRANS[r]}</span>${["contenus", "avis", "commentaires"].includes(r) ? compte(r) : r === "collecte" ? compte("retours") : ""}</a>`;
  function dessinerNav() {
    document.body.classList.toggle("hors-session", !connecte);
    const lat = $("lat"), haut = $("haut"), sous = $("sous"), onglets = $("onglets");
    lat.innerHTML = haut.innerHTML = sous.innerHTML = onglets.innerHTML = "";
    if (!connecte) return;
    if (large.matches) {
      lat.innerHTML = `<div class="lat-in"><a class="logo" href="#/accueil">RENOM</a><nav id="nav" class="menu" aria-label="${t("nav.espace")}"><div class="groupe">${GROUPES.filter(g => g.seul).map(g => lienMenu(g.ecrans[0])).join("")}</div>${GROUPES.filter(g => !g.seul).map(g =>
        `<div class="groupe"><p class="groupe-lib">${g.nom}</p>${g.ecrans.map(lienMenu).join("")}</div>`).join("")}</nav><div class="lat-pied">${I.selecteur()}<button type="button" id="sortir" class="quitter">${t("quitter")}</button></div></div>`;
      return;
    }
    const GM = groupesMobile(), actif = GM.find(g => g.ecrans.includes(route)) || GM[0];
    // « Quitter » : dans l'en-tête quand le groupe Mon commerce est ouvert (à la suite des liens du groupe, il se retrouvait seul sur une ligne).
    haut.innerHTML = `<a class="logo" href="#/accueil">RENOM</a><span class="haut-note" id="haut-offre">${offreNom ? t("offre.nom", { nom: e(offreNom) }) : ""}</span>${I.selecteur()}${actif.id === "commerce" ? `<button type="button" id="sortir" class="quitter">${t("quitter")}</button>` : ""}`;
    sous.innerHTML = actif.ecrans.length > 1 ? actif.ecrans.map(lienMenu).join("") : "";
    sous.setAttribute("aria-label", actif.nom);
    // Chaque onglet mène au premier écran de son groupe ; data-ecrans liste tous les écrans du groupe.
    onglets.setAttribute("aria-label", t("nav.espace"));
    onglets.innerHTML = GM.map(g => `<a href="#/${g.ecrans[0]}" data-r="${g.ecrans[0]}" data-ecrans="${g.ecrans.join(" ")}"${g === actif ? ` aria-current="${g.ecrans[0] === route ? "page" : "true"}"` : ""}>
      <span class="onglet-icone">${ICONES[g.id]}${g.compte ? compte(g.compte) : ""}</span><span>${g.court || g.nom}</span></a>`).join("");
  }
  async function majCompteurs() {
    try {
      const [ct, av, k, cm] = await Promise.all([D.contenus(), D.avis(), D.compteur(), D.commentaires().catch(() => [])]);
      nb.contenus = ct.filter(x => x.statut === "a_valider").length;
      nb.avis = av.filter(x => (x.statut === "a_valider" && !x.sensible) || x.statut === "humain").length;
      nb.commentaires = k.commentaires_inclus ? cm.filter(x => x.statut === "a_valider" || x.statut === "humain").length : 0;
      offreNom = k.offre_nom || "";
      nb.retours = await retoursNonLus(); nb.reputation = nb.avis + nb.commentaires + nb.retours;   // ---- Collecte
    } catch (er) { return; }
    document.querySelectorAll("[data-nb]").forEach(s => { const n = nb[s.dataset.nb]; s.hidden = !n; s.querySelector("[data-n]").textContent = n || ""; });
    const o = $("haut-offre"); if (o) o.textContent = offreNom ? t("offre.nom", { nom: offreNom }) : "";
  }

  // ---------------- Connexion
  // Démonstration : les comptes affichés sont ceux de la graine chargée (parcours ou graine publique), jamais écrits en dur.
  const comptesTexte = l => I.liste(l.map(x => `${x.email} (${x.role === "administrateur" ? t("cx.console") : x.commerce || t("cx.commercant")})`), "ou");
  async function connexion() {
    const comptesDemo = D.mode === "demo" && D.comptesDemo ? await D.comptesDemo() : [];
    vue.innerHTML = `<div class="connexion"><div class="carte">
      <div class="connexion-tete"><p class="logo">RENOM</p>${I.selecteur()}</div>
      <div class="entete"><h1>${t("cx.titre")}</h1><p class="chapo">${t("cx.chapo")}</p></div>
      <form id="f"><div class="f"><label for="email">${t("cx.email")}</label><input id="email" name="email" type="email" autocomplete="email" required></div>
      <button class="bouton plein" type="submit">${t("cx.recevoir")}</button><p class="msg" id="msg" role="status"></p></form>
      ${comptesDemo.length ? `<div class="entrer-demo" id="entrer-demo"><p class="fort">${t("cx.visite")}</p>${comptesDemo.map(c => `<button type="button" class="bouton second" data-entrer="${e(c.email)}">${c.role === "administrateur" ? t("cx.console.exploitant") : e(c.commerce || c.email)}</button>`).join("")}</div>
      <p class="note" id="comptes-demo">${t("cx.demo", { comptes: e(comptesTexte(comptesDemo)) })}</p>` : ""}</div>
      <p class="retour"><a href="../">${t("cx.retour.site")}</a></p></div>`;
    const entrer = async em => { await D.ouvrirLien(em); if (await D.estAdmin()) location.href = I.lien("console.html"); else aller("accueil"); };
    document.querySelectorAll("[data-entrer]").forEach(b => { b.onclick = () => entrer(b.dataset.entrer); });
    $("f").onsubmit = async ev => {
      ev.preventDefault(); msg(t("envoi.en.cours"));
      try {
        const r = await D.envoyerLien($("email").value);
        if (D.mode === "demo") { $("msg").innerHTML = `${t("cx.lien.pret")} <button type="button" class="lien" id="ouvrir">${t("cx.ouvrir.lien")}</button>`; $("ouvrir").onclick = async () => { await D.ouvrirLien(r.lien); const adm = await D.estAdmin(); if (adm) location.href = I.lien("console.html"); else aller("accueil"); }; }
        else msg(t("cx.envoye"));
      } catch (er) { msg(ph(er.message)); }
    };
  }

  // ---------------- Automatisations de service : mise en route (4 étapes) et idée de la semaine
  const AU = window.RENOM_AUTO;
  const ETATS_MR = I.carte("mer.etat", ["a_faire", "declare", "fait"]);
  function blocMiseEnRoute(mr) {
    if (!mr || !mr.points || mr.faits >= mr.total) return "";
    const lib = Object.fromEntries(AU.AUTO.POINTS.map(x => [x.point, { ...x, titre: I.ou("mer.titre." + x.point, x.titre), aide: I.ou("mer.aide." + x.point, x.aide) }]));
    return `<section class="carte mise-en-route" id="mise-en-route" aria-labelledby="mer-titre"><div class="carte-tete"><h2 id="mer-titre">${t("mer.titre", { a: mr.faits, b: mr.total })}</h2></div>
      ${jauge(mr.faits, mr.total)}
      <ol class="liste etapes">${mr.points.map(x => { const p = lib[x.point] || { titre: x.point, aide: "" };
        const action = x.etat !== "a_faire" ? "" : p.declarable ? `<button type="button" class="bouton second petit" data-declarer="${e(x.point)}">${t("mer.fait")}</button>`
          : x.point === "demarrage" ? `<a class="bouton second petit" href="#/demarrage">${t("mer.repondre")}</a>` : "";
        return `<li data-point="${e(x.point)}"><div><p class="fort">${e(p.titre)}</p>${x.etat === "fait" ? "" : `<p class="note">${e(p.aide)}</p>`}</div>
          <div class="pile serre etape-etat"><span class="etat${x.etat === "fait" ? " actif" : ""}">${ETATS_MR[x.etat] || e(x.etat)}</span>${action}</div></li>`; }).join("")}</ol></section>`;
  }
  const ORIGINES = I.carte("idee.origine", ["calendrier", "meteo", "saison"]);
  function blocIdeeSemaine(x) {
    if (!x) return "";
    return `<section class="carte" id="idee-semaine" data-idee="${e(x.id)}" aria-labelledby="idee-titre"><div class="carte-tete"><h2 id="idee-titre">${t("idee.semaine")}</h2><span class="note">${ORIGINES[x.origine] || ""}</span></div>
      <p class="fort"${lc()}>${e(x.titre)}</p><p class="texte2"${lc()}>${e(x.texte)}</p>${x.motif ? `<p class="note"${lc()}>${e(x.motif)}</p>` : ""}
      <div class="actions"><button type="button" class="bouton" data-decider-idee="retenue">${t("idee.retenir")}</button><button type="button" class="lien" data-decider-idee="ecartee">${t("idee.ecarter")}</button></div>
      <p class="note">${t("idee.note")}</p></section>`;
  }
  function brancherAutomatisations(racine, apres) {
    racine.querySelectorAll("[data-declarer]").forEach(b => b.onclick = async () => { try { await D.declarerMiseEnRoute(b.dataset.declarer); await apres(); msg(t("mer.merci")); } catch (er) { msg(ph(er.message)); } });
    racine.querySelectorAll("[data-decider-idee]").forEach(b => b.onclick = async () => {
      const id = b.closest("[data-idee]").dataset.idee, d = b.dataset.deciderIdee;
      try { await D.deciderIdee(id, d); await apres(); msg(t(d === "retenue" ? "idee.retenue.msg" : "idee.ecartee.msg")); majCompteurs(); } catch (er) { msg(ph(er.message)); } });
  }

  // ---------------- Accueil
  // Bilan du mois : 4 chiffres au plus et une phrase. Mêmes données que l'email du 1er du mois (fonction bilan_mois).
  const bandeauDemo = () => D.mode === "demo" ? `<div class="bandeau-demo" role="note"><p class="fort">${t("demo.chiffres")}</p><p>${t("demo.chiffres.texte")}</p></div>` : "";
  function bilanBloc(b) {
    if (!b) return "";
    const m = moisDe(b.mois || k0()), notes = b.note_debut != null && b.note_fin != null, n = x => +x || 0;
    const morceaux = [t("bilan.publie", { r: n(b.reponses_publiees), p: n(b.publications) }),
      t(b.avis_obtenus_source === "avis_recus" ? "bilan.recu" : "bilan.obtenu", { n: n(b.avis_obtenus) }) + (notes ? (b.note_fin === b.note_debut ? t("bilan.note.reste", { n: nombre(b.note_fin, 1) }) : t("bilan.note.passe", { a: nombre(b.note_debut, 1), b: nombre(b.note_fin, 1) })) : ".")];
    if (n(b.a_valider)) morceaux.push(t("bilan.attend", { n: n(b.a_valider) }));
    const chiffre = (lib, val) => `<div class="bilan-chiffre"><dt>${lib}</dt><dd class="chiffre">${val}</dd></div>`;
    return `<section class="carte bilan" aria-labelledby="bilan-titre"><div class="carte-tete"><h2 id="bilan-titre">${t("bilan.titre", { mois: m.getMonth() })}</h2><span class="note">${t("bilan.a.ce.jour")}</span></div>
      ${D.mode === "demo" ? `<p class="note bilan-demo"><span class="fort">${t("demo.chiffres.point")}</span> ${t("bilan.demo")}</p>` : ""}
      <p class="texte2">${morceaux.join(" ")}</p>
      <dl class="bilan-chiffres">${chiffre(t("bilan.reponses"), nombre(n(b.reponses_publiees)))}${chiffre(t("bilan.publications"), nombre(n(b.publications)))}${chiffre(t("bilan.note"), notes ? nombre(b.note_fin, 1) : `<a href="#/resultats">${t("voir.resultats")}</a>`)}${chiffre(t("bilan.avis"), nombre(n(b.avis_obtenus)))}</dl>
      <p class="pied"><a href="#/resultats">${t("bilan.tous")}</a></p></section>`;
  }
  const k0 = () => new Date().toISOString().slice(0, 7) + "-01";
  const plusTard = id => { try { return localStorage.getItem("renom-demarrage-plus-tard:" + id) === "1"; } catch (er) { return false; } };
  async function accueil() {
    const c0 = await D.commerce();
    if (!c0.demarrage_fini && !plusTard(c0.id)) return demarrage();
    const [c, k, p, ct, av, cal, bilan, mr, ids, cm0] = await Promise.all([D.commerce(), D.compteur(), D.photos(), D.contenus(), D.avis(), D.calendrier(), D.bilanMois().catch(() => null),
      D.miseEnRoute().catch(() => null), D.idees().catch(() => []), D.commentaires().catch(() => [])]);
    const cm = k.commentaires_inclus ? cm0 : [], cmValider = cm.filter(x => x.statut === "a_valider"), cmHumains = cm.filter(x => x.statut === "humain");
    const idee = ids.find(x => x.semaine && x.statut === "a_valider") || null;
    nomCommerce = c.nom;
    const aValider = ct.filter(x => x.statut === "a_valider"), reponses = av.filter(x => x.statut === "a_valider" && !x.sensible), humains = av.filter(x => x.statut === "humain");
    const prochaines = cal.filter(x => x.statut === "programme").slice(0, 3), premier = aValider[0], avis1 = reponses[0], dernier = premier ? null : (ct.find(x => x.statut !== "refuse") || ct[0]);
    const [u1, v1, ...vign] = await Promise.all([urlSure(premier || dernier), videoSure(premier || dernier), ...prochaines.map(x => urlSure(x.contenu))]);
    // Sous-titre aligné sur « une photo, un clic » : le nombre de validations (contenus, réponses aux avis, réponses aux commentaires), le même
    // que le bilan du mois et les jetons de validation, et leur durée (environ 40 secondes chacune). Les alertes ont leur propre bandeau.
    const mois = new Date(k.mois + "T12:00:00"), nv = aValider.length + reponses.length + cmValider.length, na = humains.length + cmHumains.length + (idee ? 1 : 0);
    const phrase = nv ? t("acc.validations", { n: nv, m: Math.max(1, Math.round(nv * 40 / 60)) }) : na ? t("acc.choses", { n: na }) : t(mr && mr.faits < mr.total ? "acc.reste.mer" : "acc.a.jour");
    const raisons = [...new Set(humains.flatMap(x => x.raisons || []))];
    const ficheRemplie = c.specialites || c.ton || c.horaires;
    vue.innerHTML = `${pauseBandeau(c)}
      <div class="entete-accueil"><div class="entete"><p class="sur">${t("acc.bonjour")}</p><h1>${e(c.nom)}</h1><p class="chapo">${phrase}</p></div>
        <a class="bouton grand" id="envoyer-photo" href="#/photos">${APPAREIL}<span>${t("acc.envoyer.photo")}</span></a></div>
      <p class="msg" id="msg" role="status"></p>
      ${blocMiseEnRoute(mr)}
      ${!c.demarrage_fini ? `<section class="alerte"><div><p class="fort">${t("acc.dem.titre")}</p><p>${t("acc.dem.texte")}</p></div><a class="bouton second" href="#/demarrage">${t("acc.dem.reprendre")}</a></section>` : ""}
      ${bilanBloc(bilan)}
      ${carteStyle(c)}
      <section class="carte a-valider"${premier ? ` data-contenu="${e(premier.id)}"` : ""}>
          <div class="carte-tete"><h2>${t(premier ? "acc.contenu.un" : "acc.contenu.aucun")}</h2>${aValider.length > 1 ? `<a href="#/contenus">${t("voir.les", { n: aValider.length })}</a>` : `<a href="#/contenus">${t("acc.ouvrir.contenus")}</a>`}</div>
          ${premier ? `<div class="apercu-reseaux">${blocReseaux(premier, u1, v1)}<div class="apercu-texte">
            <p class="meta">${FORMAT_LIB[M.formatDe(premier)]}</p>
            <p class="note visible">${t("acc.legende.note")}</p>${decisions(premier, t("refuser"))}</div></div>`
          : dernier ? `<div class="apercu${v1 ? " avec-video" : ""}">${media(dernier, u1, v1)}<div class="apercu-texte">
            <p class="meta">${t("acc.dernier", { type: t(dernier.type === "video" ? "type.video.courte" : "type.publication"), quand: I.minusculeDebut(jourRelatif(dernier.cree_le)) })}</p><p class="legende"${lc()}>${e(dernier.legende || "")}</p>
            <p class="etat">${ST_CONTENU[dernier.statut] || e(dernier.statut)}</p></div></div>`
          : `<p class="texte2">${t("acc.contenus.vide")}</p>`}
        </section>
      ${blocIdeeSemaine(idee)}
      ${await proposition(c)}
      <div class="rangee">
        <section class="carte moitie"${avis1 ? ` data-avis="${e(avis1.id)}"` : ""}>
          <div class="carte-tete"><h2>${t(avis1 ? "acc.avis.un" : "acc.avis.aucun")}</h2>${avis1 ? `<span class="note">${etoiles(avis1.note)}</span>` : ""}</div>
          ${avis1 ? `${citation(avis1)}${avis1.auteur && !avis1.efface_le ? `<p class="note">${e(avis1.auteur)}</p>` : ""}${reponseAValider(avis1)}${reponses.length > 1 ? `<p class="note pied"><a href="#/avis">${t("acc.avis.voir", { n: reponses.length })}</a></p>` : ""}`
          : `<p class="texte2">${t(c.reglage_avis === "tout_automatique" ? "avis.tout.auto" : "acc.avis.regle")}</p><p class="pied"><a href="#/avis">${t("acc.ouvrir.avis")}</a></p>`}
        </section>
        <section class="carte moitie">
          <div class="carte-tete"><h2>${t("acc.prochaines")}</h2></div>
          ${prochaines.length ? `<ul class="liste">${prochaines.map((x, i) => `<li class="avec-vignette">${vignette(vign[i])}<div><p class="fort">${dateHeure(x.prevu_le)}</p><p class="note">${x.reseaux.map(r => RES[r]).join(", ")}</p></div></li>`).join("")}</ul>`
          : `<p class="texte2">${t("acc.rien.programme")}</p>`}
          <p class="pied"><a href="#/calendrier">${t("acc.ouvrir.calendrier")}</a></p>
        </section>
      </div>
      ${humains.length ? `<section class="alerte"><div><p class="fort">${t("acc.humains.titre", { n: humains.length })}</p>
        <p>${raisons.length ? t("acc.motif", { r: e(raisonsTexte(raisons)) }) + " " : ""}${t("acc.humains.texte", { n: humains.length })}</p></div><a class="bouton second" href="#/avis">${t("acc.humains.lire", { n: humains.length })}</a></section>` : ""}
      ${cmHumains.length ? `<section class="alerte" id="alerte-commentaires"><div><p class="fort">${t("acc.cm.titre", { n: cmHumains.length })}</p>
        <p>${t("acc.cm.texte")}</p></div><a class="bouton second" href="#/commentaires">${t("acc.cm.lire", { n: cmHumains.length })}</a></section>` : ""}
      ${cmValider.length ? `<section class="carte" data-commentaire="${e(cmValider[0].id)}" id="accueil-commentaire"><div class="carte-tete"><h2>${t("acc.cm.un")}</h2>${cmValider.length > 1 ? `<a href="#/commentaires">${t("voir.les", { n: cmValider.length })}</a>` : `<a href="#/commentaires">${t("acc.ouvrir.commentaires")}</a>`}</div>
        ${corpsCommentaire(cmValider[0])}</section>` : ""}
      <div class="rangee">
        <section class="carte moitie"><div class="carte-tete"><h2>${t("acc.ou")}</h2></div>
          <ul class="liste"><li><a href="#/contenus">${t("acc.ou.contenus")}</a><span class="fort">${aValider.length}</span></li>
          <li><a href="#/avis">${t("acc.ou.reponses")}</a><span class="fort">${reponses.length}</span></li>
          <li><a href="#/avis">${t("acc.ou.humains")}</a><span class="fort">${humains.length}</span></li>
          ${k.commentaires_inclus ? `<li><a href="#/commentaires">${t("acc.ou.commentaires")}</a><span class="fort">${cmValider.length}</span></li>` : ""}
          <li><a href="#/photos">${t("acc.ou.photos")}</a><span class="fort">${p.filter(x => x.statut === "a_traiter").length}</span></li></ul></section>
        <section class="carte etroite"><div class="carte-tete"><h2>${t("acc.fiche")}</h2><span class="note">${e(METIERS[c.metier] || "")}${c.ville ? ", " + e(c.ville) : ""}</span></div>
          <p class="texte2">${t(ficheRemplie ? "acc.fiche.remplie" : "acc.fiche.vide")}</p>
          <p class="pied"><a class="bouton second" href="#/fiche">${t("acc.ouvrir.fiche")}</a></p></section>
        <section class="carte etroite">
          <div class="carte-tete"><h2>${t("offre.titre.nom", { nom: e(k.offre_nom) })}</h2><span class="note">${cap(MOIS[mois.getMonth()])} ${mois.getFullYear()}</span></div>
          ${mesure(t("mes.publications"), k.publications_utilisees, k.publications_plafond)}
          ${k.videos_plafond ? mesure(t("mes.videos"), k.videos_utilisees, k.videos_plafond) : `<div class="mesure-tete"><span>${t("mes.videos")}</span><span class="note">${t("non.comprises.offre")}</span></div>`}
          <div class="pied"><p class="note">${t("acc.compteur.zero", { mois: (mois.getMonth() + 1) % 12 })}</p><a href="#/offre">${t("acc.voir.offre")}</a></div>
        </section>
      </div>`;
    brancherDecisions(vue, accueil); brancherAvis(vue, accueil); brancherAutomatisations(vue, accueil); brancherCommentaires(vue, accueil);
  }

  // ---------------- Fiche
  async function fiche() {
    const c = await D.commerce(), v = k => e(c[k] ?? ""), co = c.couleurs || {};
    const dm = c.demarrage || {}, sienne = x => x ? `<span${lc()}>${e(x)}</span>` : "";
    const rep = (lib, val) => `<li><span class="note">${lib}</span><span>${val || `<span class="note">${t("fiche.pas.reponse")}</span>`}</span></li>`;
    vue.innerHTML = `${entete(t("fiche.sur"), t("fiche.titre"), t("fiche.chapo"))}
    <section class="carte fiche demarrage-resume"><div class="carte-tete"><h2>${t("fiche.dem.titre")}</h2><a href="#/demarrage">${t(c.demarrage_fini ? "fiche.dem.modifier" : "fiche.dem.repondre")}</a></div>
      ${c.demarrage ? `<ul class="liste reponses">${rep(t("q.phrase.titre"), sienne(dm.phrase))}${rep(t("q.distinctions.titre"), sienne(dm.distinctions))}${rep(t("fiche.dem.ton"), e(TONS_LIB[dm.ton] || ""))}${rep(t("q.interdits.titre"), sienne(dm.interdits))}${rep(t("fiche.dem.action"), dm.action ? e(ACTIONS_LIB[dm.action]) + (dm.action_detail ? t("deux.points") + sienne(dm.action_detail) : "") : "")}</ul>`
      : `<p class="texte2">${t("fiche.dem.vide")}</p>`}</section>
    <form id="f" class="fiche">
      <section class="carte"><h2>${t("fiche.commerce")}</h2><div class="champs">
        <div class="f toute"><label for="nom">${t("fiche.nom")}</label><input id="nom" type="text" value="${v("nom")}" required></div>
        <div class="f"><label for="metier">${t("fiche.metier")}</label><select id="metier">${Object.entries(METIERS).map(([k, l]) => `<option value="${k}"${c.metier === k ? " selected" : ""}>${l}</option>`).join("")}</select></div>
        <div class="f"><label for="ville">${t("fiche.ville")}</label><input id="ville" type="text" value="${v("ville")}"></div>
        <div class="f toute"><label for="horaires">${t("fiche.horaires")}</label><textarea id="horaires"${lc()}>${v("horaires")}</textarea></div></div></section>
      <section class="carte"><h2>${t("fiche.propose")}</h2><div class="champs">
        <div class="f toute"><label for="specialites">${t("fiche.specialites")}</label><textarea id="specialites"${lc()}>${v("specialites")}</textarea><p class="aide">${t("fiche.specialites.aide")}</p></div>
        <div class="f toute"><label for="ton">${t("fiche.ton")}</label><input id="ton" type="text" value="${v("ton")}"${lc()}><p class="aide">${t("fiche.ton.aide")}</p></div>
        <div class="f"><label for="mots_cles">${t("fiche.mots")}</label><input id="mots_cles" type="text" value="${e((c.mots_cles || []).join(", "))}"${lc()}></div>
        <div class="f"><label for="mentions">${t("fiche.mentions")}</label><input id="mentions" type="text" value="${e((c.mentions_autorisees || []).join(", "))}"${lc()}><p class="aide">${t("fiche.mentions.aide")}</p></div></div></section>
      <section class="carte"><h2>${t("fiche.contact.titre")}</h2><div class="champs">
        <div class="f"><label for="contact">${t("fiche.contact")}</label><input id="contact" type="text" value="${v("contact")}"></div>
        <div class="f"><label for="email_validation">${t("fiche.email")}</label><input id="email_validation" type="email" value="${v("email_validation")}"></div></div></section>
      <section class="carte"><h2>${t("fiche.avis.titre")}</h2>
        <div class="f"><label for="lien_avis">${t("fiche.lien")}</label><input id="lien_avis" type="url" value="${v("lien_avis")}"><p class="aide">${t("fiche.lien.aide")}</p></div>
        <fieldset><legend>${t("fiche.reponses")}</legend>
          <label class="option"><input type="radio" name="reglage" value="auto_des_4_etoiles"${c.reglage_avis !== "tout_automatique" ? " checked" : ""}><span>${t("fiche.reglage.4")}</span></label>
          <label class="option"><input type="radio" name="reglage" value="tout_automatique"${c.reglage_avis === "tout_automatique" ? " checked" : ""}><span>${t("fiche.reglage.tout")}</span></label>
          <p class="aide">${t("fiche.reglage.aide")}</p></fieldset></section>
      <section class="carte" id="fiche-style"><h2>${t("fiche.couleurs")}</h2>
        <div class="style-accueil-corps"><p class="texte2">${t("fiche.couleurs.style")}</p><div class="style-nuancier" aria-hidden="true">${[co.accent, co.fond, co.texte].filter(Boolean).map(x => `<span style="background:${e(x)}"></span>`).join("")}</div></div>
        <p class="pied"><a class="bouton second" href="#/style">${t("fiche.couleurs.lien")}</a></p></section>
      <div class="actions pied-formulaire"><button class="bouton" type="submit">${t("enregistrer")}</button><p class="msg" id="msg" role="status"></p></div></form>`;
    const liste = id => $(id).value.split(",").map(s => s.trim()).filter(Boolean);
    $("f").onsubmit = async ev => {
      ev.preventDefault();
      try {
        await D.enregistrer({ nom: $("nom").value.trim(), metier: $("metier").value, ville: $("ville").value.trim(), specialites: $("specialites").value.trim(), horaires: $("horaires").value.trim(), ton: $("ton").value.trim(),
          mots_cles: liste("mots_cles"), mentions_autorisees: liste("mentions"), contact: $("contact").value.trim(), email_validation: $("email_validation").value.trim(), lien_avis: $("lien_avis").value.trim(),
          reglage_avis: document.querySelector("input[name=reglage]:checked").value });   // couleurs : écran « Votre style » (kit de marque)
        msg(t("fiche.enregistree"));
      } catch (er) { msg(t("fiche.echec", { m: ph(er.message) })); }
    };
  }

  // ---------------- Photos
  async function photos() {
    const [c, l, s] = await Promise.all([D.commerce(), D.photos(), D.session()]), boite = D.emailPhotos ? D.emailPhotos() : null;
    vue.innerHTML = `${pauseBandeau(c)}${entete(t("groupe.creer"), t("photos.titre"), t("photos.chapo"))}
      <div class="rangee">
        <section class="carte moitie"><h2>${t("photos.deposer")}</h2>
          <form id="f"><div class="f"><div class="depot">
            <span class="depot-choix"><input id="appareil" class="vh" type="file" accept="image/*" capture="environment"><label for="appareil" class="bouton second appareil-photo">${APPAREIL}<span>${t("photos.prendre")}</span></label></span>
            <span class="depot-choix"><input id="fichiers" class="vh" type="file" accept="image/*" multiple><label for="fichiers" class="bouton second">${GALERIE}<span class="sur-tel">${t("photos.galerie")}</span><span class="sur-ordi">${t("photos.choisir")}</span></label></span>
            <span class="note" id="choisies" aria-live="polite">${t("photos.aucune.choisie")}</span></div>
          <p class="aide">${t("photos.aide")}</p></div>
          <button class="bouton" type="submit">${t("envoyer")}</button><p class="msg" id="msg" role="status"></p></form></section>
        <section class="carte moitie"><div class="carte-tete"><h2>${t("photos.deja")}</h2>${l.length ? `<span class="note">${t("photos.n", { n: l.length })}</span>` : ""}</div>
          ${l.length ? `<ul class="liste">${l.map(x => `<li><div><p class="fort casse">${e(x.nom_fichier || t("photo"))}</p><p class="note">${cap(date(x.cree_le))}${x.source === "email" ? t("photos.par.email") : ""}</p></div><span class="etat">${ST_PHOTO[x.statut] || e(x.statut)}</span></li>`).join("")}</ul>` : `<p class="texte2">${t("photos.vide")}</p>`}</section>
      </div>
      ${await blocDepotVideo(c)}
      ${boite ? `<section class="carte" id="photos-email"><h2>${t("photos.email.titre")}</h2>
        <p class="texte2">${t("photos.email.texte", { adresse: `<span class="fort casse" id="adresse-photos">${e(boite.adresse)}</span>`, compte: s && s.email ? ` (<span class="casse">${e(s.email)}</span>)` : "" })}</p>
        ${boite.demo ? `<p class="note">${t("photos.email.demo")}</p>` : ""}</section>` : ""}`;
    // Deux façons de choisir (appareil photo, galerie) ; l'envoi reste le même pour les deux.
    const choisies = () => [...$("appareil").files, ...$("fichiers").files];
    $("appareil").onchange = $("fichiers").onchange = () => { const fs = choisies(); $("choisies").textContent = !fs.length ? t("photos.aucune.choisie") : fs.length === 1 ? fs[0].name : t("photos.n.choisies", { n: fs.length }); };
    $("f").onsubmit = async ev => {
      ev.preventDefault(); const fs = choisies();
      if (!fs.length) { msg(t("photos.choisir.une")); return; }
      let ok = 0; const erreurs = [];
      for (const f of fs) { msg(t("photos.envoi.de", { nom: f.name })); try { await D.deposer(f); ok++; } catch (er) { erreurs.push(f.name + t("deux.points") + ph(er.message)); } }
      await photos(); msg(t("photos.deposees", { n: ok }) + (erreurs.length ? t("photos.refusees", { l: erreurs.join(" ; ") }) : ""));
    };
    brancherDepotVideo();
  }

  // ---------------- Dépôt de vidéos (écran Photos et vidéos). Règles et envoi : espace/web/envoi.js ; base : bloc « Dépôt de vidéos » de schema.sql.
  // État gardé hors de l'écran : un envoi continue si l'on change d'écran, et l'écran le retrouve à son retour.
  const EN = window.RENOM_ENVOI, DV = window.RENOM_DEPOT_VIDEO;
  const ST_DV = I.carte("dv.st", DV.STATUTS);
  const dv = { fichiers: [], envoi: false, interrompu: false, reseau: "", ctrl: null, note: "", n: 0, depot: null };
  const mo = n => nombre(Math.max(0.1, n / EN.MO), n < 10 * EN.MO ? 1 : 0);
  const taille = n => t("dv.f.mo", { n: mo(n) });
  const secondes = d => t("dv.f.secondes", { n: nombre(d, d < 10 && d % 1 ? 1 : 0) });
  const pourcent = x => x.f.size ? Math.min(100, Math.floor((x.envoyes || 0) / x.f.size * 100)) : 0;
  function etatFichier(x) {
    const c = x.ctrl;
    if (!c) return t("dv.f.controle");
    if (c.raison === "lourde") return t("dv.r.lourde", { t: taille(c.taille), max: nombre(EN.REGLES.VIDEO_MAX_MO) });
    if (c.raison === "longue") return t("dv.r.longue", { d: secondes(c.duree), max: EN.REGLES.DUREE_MAX_S });
    if (c.raison) return t("dv.r." + c.raison);
    if (x.etat === "recu") return t("dv.f.recu");
    if (x.etat === "envoi") return t("dv.f.envoi", { p: pourcent(x) });
    if (x.etat === "interrompu") return t("dv.f.interrompu", { p: pourcent(x) });
    return dv.envoi ? t("dv.f.attente") : t("dv.f.ok");
  }
  const metaFichier = x => !x.ctrl || x.ctrl.raison === "format" ? "" : x.ctrl.genre === "photo" ? t("dv.f.photo", { t: taille(x.f.size) })
    : t("dv.f.video", { d: x.ctrl.duree == null ? t("dv.f.duree.inconnue") : secondes(x.ctrl.duree), t: taille(x.f.size) });
  const ligneFichier = x => `<li data-dvf="${x.id}"${x.ctrl && x.ctrl.raison ? ' class="refuse"' : ""}><div><p class="fort casse">${e(x.f.name)}</p><p class="note" data-dv-meta>${metaFichier(x)}</p></div>
    <span class="etat${x.etat === "recu" ? " actif" : ""}" data-dv-etat>${etatFichier(x)}</span>
    ${!dv.envoi && x.etat !== "recu" ? `<button type="button" class="lien petit-lien" data-dv-retirer="${x.id}" aria-label="${e(t("dv.retirer.nom", { nom: x.f.name }))}">${t("dv.retirer")}</button>` : ""}
    ${x.ctrl && !x.ctrl.raison && (dv.envoi || x.etat) ? `<div class="jauge" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pourcent(x)}" aria-label="${e(x.f.name)}"><span style="width:${pourcent(x)}%"></span></div>` : ""}</li>`;
  const valables = () => dv.fichiers.filter(x => x.ctrl && !x.ctrl.raison);
  function dvDessinerListe() {
    const ul = $("dv-fichiers"); if (!ul) return;
    ul.innerHTML = dv.fichiers.map(ligneFichier).join("");
    const ok = valables(), nv = ok.filter(x => x.ctrl.genre === "video").length, np = ok.length - nv;
    $("dv-choisies").textContent = dv.fichiers.length ? t("dv.choisies", { v: nv, p: np }) : t("dv.aucun.fichier");
    $("dv-lourde").hidden = !dv.fichiers.some(x => x.ctrl && x.ctrl.raison === "lourde");
    const b = $("dv-envoyer"); if (b) { b.textContent = t(dv.interrompu ? "dv.reprendre" : "dv.envoyer"); b.disabled = dv.envoi; }
    document.querySelectorAll("#depot-video input[type=file]").forEach(i => { i.disabled = dv.envoi; });
    if ($("dv-note")) $("dv-note").disabled = dv.envoi;
  }
  // Mise à jour d'une ligne pendant l'envoi, sans redessiner l'écran (la page reste lisible et le défilement ne saute pas).
  function dvMajLigne(x) {
    const li = document.querySelector(`[data-dvf="${x.id}"]`); if (!li) return;
    li.querySelector("[data-dv-etat]").textContent = etatFichier(x); li.querySelector("[data-dv-etat]").classList.toggle("actif", x.etat === "recu");
    const j = li.querySelector(".jauge"); if (j) { const p = pourcent(x); j.setAttribute("aria-valuenow", p); j.firstElementChild.style.width = p + "%"; }
  }
  const dvMsg = x => { const m = $("dv-msg"); if (m) m.textContent = x; };
  async function ajouterFichiers(liste) {
    for (const f of liste) { const x = { id: "f" + (++dv.n), f, ctrl: null, etat: "", envoyes: 0 }; dv.fichiers.push(x); }
    dv.interrompu = false; dvDessinerListe();
    await Promise.all(dv.fichiers.filter(x => !x.ctrl).map(async x => { x.ctrl = await EN.controler(x.f); }));
    dvDessinerListe();
  }
  window.addEventListener("beforeunload", ev => { if (dv.envoi) { ev.preventDefault(); ev.returnValue = t("dv.quitter"); return t("dv.quitter"); } });
  async function envoyerDepot(ouvert) {
    if (dv.envoi) return;
    const ok = valables(), nv = ok.filter(x => x.ctrl.genre === "video").length, np = ok.length - nv;
    if (dv.fichiers.some(x => !x.ctrl)) return;
    const ens = EN.controlerEnsemble(nv, np); if (ens) { dvMsg(t("dv.ens." + ens.code, { n: ens.n })); return; }
    dv.envoi = true; dv.interrompu = false; dv.ctrl = new AbortController(); dvDessinerListe();
    let x = null;
    try {
      const depot = dv.depot || (ouvert ? ouvert.id : (await D.creerDepotVideo({ note: $("dv-note") ? $("dv-note").value : dv.note })).id); dv.depot = depot;
      const recus = await D.fichiersRecus(depot);
      for (let i = 0; i < ok.length; i++) {
        x = ok[i]; dvMsg(dv.reseau === "hors_ligne" ? t("dv.hors.ligne") : t("dv.envoi.en.cours", { i: i + 1, n: ok.length }));
        if (x.etat === "recu" && x.chemin) continue;
        // Fichier déjà complet dans le dossier du dépôt (envoi repris après un rechargement) : il ne repart pas.
        x.etat = "envoi"; dvMajLigne(x);
        const r = await D.envoyerFichierDepot(depot, x.f, i, { signal: dv.ctrl.signal, deja: recus[EN.nomDansDepot(i, x.f)] === x.f.size,
          onProgress: (a) => { x.envoyes = a; dvMajLigne(x); },
          onEtat: et => { dv.reseau = et; dvMsg(et === "hors_ligne" ? t("dv.hors.ligne") : et === "nouvel_essai" ? t("dv.nouvel.essai") : t("dv.envoi.en.cours", { i: i + 1, n: ok.length })); } });
        x.chemin = r.chemin; x.etat = "recu"; x.envoyes = x.f.size; dvMajLigne(x);
      }
      x = null;
      const res = await D.finaliserDepotVideo(depot, ok.map(y => ({ chemin: y.chemin, nom: y.f.name, taille: y.f.size, duree_s: y.ctrl.duree })));
      dv.fichiers = []; dv.envoi = false; dv.note = ""; dv.depot = null;
      await photos(); dvMsg(t("dv.envoye", { v: res.nb_videos, p: res.nb_photos })); majCompteurs();
    } catch (er) {
      dv.envoi = false; if (x && x.etat === "envoi") x.etat = "interrompu"; dv.interrompu = !!x;
      dvDessinerListe(); dvMsg(er && er.annule ? ph(er.message) : x ? t("dv.interrompu") + (er && er.statut ? " (" + ph(er.message) + ")" : "") : ph(er.message));
      if (!x) await dvRafraichirSuivi();
    }
  }
  const dvLigneDepot = d => {
    const duree = d.duree_totale_s != null ? secondes(+d.duree_totale_s) : "";
    return `<li data-depot="${e(d.id)}"><div><p class="fort">${t("dv.depot.du", { d: cap(date(d.cree_le)) })}</p>
      ${d.statut !== "en_envoi" && d.nb_videos ? `<p class="note">${t("dv.depot.contenu", { v: d.nb_videos, p: (d.nb_fichiers || 0) - d.nb_videos, d: duree })}</p>` : ""}
      ${d.note ? `<p class="note">${t("dv.depot.note", { x: `<span${lc()}>${e(d.note)}</span>` })}</p>` : ""}
      ${d.motif && ["refuse", "abandonne"].includes(d.statut) ? `<p class="texte2 dv-motif">${e(ph(d.motif))}</p>` : ""}
      ${d.statut === "a_valider" ? `<p><a href="#/contenus">${t("dv.voir.valider")}</a></p>` : ""}
      ${d.rushes_effaces_le ? `<p class="note">${t("dv.efface.le", { d: date(d.rushes_effaces_le) })}</p>` : ""}</div>
      <span class="etat${d.statut === "a_valider" ? " actif" : ""}">${ST_DV[d.statut] || e(d.statut)}</span></li>`;
  };
  const dvSuivi = l => `<div class="carte-tete"><h2>${t("dv.suivi.titre")}</h2></div>${l.length ? `<ul class="liste">${l.map(dvLigneDepot).join("")}</ul>` : `<p class="texte2">${t("dv.suivi.vide")}</p>`}
    <p class="note">${t("dv.conservation")}</p>`;
  let dvMinuteur = null;
  async function dvRafraichirSuivi() {
    const s_ = $("dv-suivi"); if (!s_) return; const l = await D.depotsVideo(); s_.innerHTML = dvSuivi(l); dvSurveiller(l);
  }
  // Tant qu'un dépôt est envoyé ou en montage et que l'écran reste ouvert : le suivi se relit toutes les 15 secondes (une lecture de la table).
  function dvSurveiller(l) {
    clearTimeout(dvMinuteur);
    if (l.some(d => ["envoye", "en_montage"].includes(d.statut))) dvMinuteur = setTimeout(() => { if (ecranCourant === photos && !dv.envoi && $("dv-suivi")) dvRafraichirSuivi().catch(() => {}); }, window.RENOM_SUIVI_MS || 15000);
  }
  let dvOuvert = null;
  async function blocDepotVideo(c) {
    const [k, l] = await Promise.all([D.compteurVideos(), D.depotsVideo()]), o = window.RENOM_OFFRES[c.offre_id] || {};
    if (!k.videos_plafond) return `<section class="carte" id="depot-video"><h2>${t("dv.sans.titre")}</h2><p class="texte2">${t("dv.sans.texte", { offre: e(o.nom || c.offre_id) })}</p>
      <p class="pied"><a class="bouton second" href="#/offre">${t("dv.voir.offres")}</a></p></section>${l.length ? `<section class="carte" id="dv-suivi">${dvSuivi(l)}</section>` : ""}`;
    dvOuvert = l.find(d => d.statut === "en_envoi" && Date.now() - Date.parse(d.cree_le) < DV.OUVERT_MS) || null;
    const attente = k.videos_reservees - k.videos_utilisees, plein = k.videos_reservees >= k.videos_plafond && !dvOuvert;
    const plans = t("dv.plans." + (c.metier === "restaurant" ? "restaurant" : "autre"));
    return `<section class="carte" id="depot-video" aria-labelledby="dv-titre">
      <div class="carte-tete"><h2 id="dv-titre">${t("dv.titre")}</h2><span class="note" id="dv-compteur">${t("dv.compteur", { a: k.videos_reservees, b: k.videos_plafond })}${attente > 0 ? t("dv.compteur.attente", { n: attente }) : ""}</span></div>
      <p class="texte2">${t("dv.chapo")}</p>
      ${dvOuvert && !dv.envoi ? `<div class="alerte dv-ouvert" role="status"><div><p class="fort">${t("dv.ouvert.titre")}</p><p>${t("dv.ouvert.texte", { d: I.dateHeureDans(dvOuvert.cree_le) })}</p>
        <p><button type="button" class="lien" id="dv-annuler">${t("dv.annuler")}</button></p></div></div>` : ""}
      <div class="dv-grille">
        <div class="dv-guide"><h3>${t("dv.guide.titre")}</h3><ol class="dv-points">${[1, 2, 3, 4, 5].map(i => `<li>${t("dv.guide." + i)}</li>`).join("")}</ol>
          <h3>${t("dv.plans.titre." + (c.metier === "restaurant" ? "restaurant" : "autre"))}</h3><ul class="dv-points">${plans.map(x => `<li>${x}</li>`).join("")}</ul></div>
        ${plein ? `<div><p class="texte2" id="dv-plein">${t("dv.plafond")}</p><p class="msg" id="dv-msg" role="status" aria-live="polite"></p></div>` : `<form id="fv" class="dv-form" novalidate><div class="f"><div class="depot">
            <span class="depot-choix"><input id="filmer" class="vh" type="file" accept="video/*" capture="environment"><label for="filmer" class="bouton second appareil-photo">${CAMERA}<span>${t("dv.filmer")}</span></label></span>
            <span class="depot-choix"><input id="videos" class="vh" type="file" accept="video/*" multiple><label for="videos" class="bouton second">${FILM}<span>${t("dv.choisir")}</span></label></span>
            <span class="depot-choix"><input id="photos-depot" class="vh" type="file" accept="image/*" multiple><label for="photos-depot" class="bouton second">${GALERIE}<span>${t("dv.photos")}</span></label></span>
            <span class="note" id="dv-choisies" aria-live="polite">${t("dv.aucun.fichier")}</span></div>
            <p class="aide">${t("dv.aide", { duree: EN.REGLES.DUREE_MAX_S, max: nombre(EN.REGLES.VIDEO_MAX_MO) })}</p></div>
          <ul class="liste dv-fichiers" id="dv-fichiers" aria-live="off"></ul>
          <div class="alerte dv-lourde" id="dv-lourde" hidden><div><p class="fort">${t("dv.lourde.titre")}</p><p>${t("dv.lourde.texte")}</p><p>${t("dv.lourde.iphone")}</p><p>${t("dv.lourde.android")}</p></div></div>
          ${dvOuvert ? "" : `<div class="f"><label for="dv-note">${t("dv.note")}</label><textarea id="dv-note" maxlength="${EN.REGLES.NOTE_MAX}" rows="2" aria-describedby="dv-note-aide">${e(dv.note)}</textarea><p class="aide" id="dv-note-aide">${t("dv.note.aide")}</p></div>`}
          <button class="bouton" type="submit" id="dv-envoyer">${t("dv.envoyer")}</button><p class="msg" id="dv-msg" role="status" aria-live="polite"></p></form>`}
      </div></section>
      <section class="carte" id="dv-suivi">${dvSuivi(l)}</section>`;
  }
  function brancherDepotVideo() {
    D.depotsVideo().then(dvSurveiller).catch(() => {});
    if (!$("fv")) return;
    dvDessinerListe();
    ["filmer", "videos", "photos-depot"].forEach(id => { $(id).onchange = async () => { const l = [...$(id).files]; $(id).value = ""; if (l.length) await ajouterFichiers(l); }; });
    $("dv-fichiers").onclick = ev => { const b = ev.target.closest("[data-dv-retirer]"); if (!b || dv.envoi) return; dv.fichiers = dv.fichiers.filter(x => x.id !== b.dataset.dvRetirer); dvDessinerListe(); };
    if ($("dv-note")) $("dv-note").oninput = () => { dv.note = $("dv-note").value; };
    $("fv").onsubmit = ev => { ev.preventDefault(); envoyerDepot(dvOuvert); };
    if ($("dv-annuler")) $("dv-annuler").onclick = async () => { try { await D.annulerDepotVideo(dvOuvert.id); dv.fichiers = []; dv.interrompu = false; dv.depot = null; await photos(); dvMsg(t("dv.annule")); } catch (er) { dvMsg(ph(er.message)); } };
    if ($("dv-annuler") && dv.depot && dvOuvert && dv.depot !== dvOuvert.id) dv.depot = null;
    if (dv.envoi) dvMsg(dv.reseau === "hors_ligne" ? t("dv.hors.ligne") : t("dv.envoi.en.cours", { i: valables().findIndex(x => x.etat !== "recu") + 1, n: valables().length }));
  }

  // ---------------- Contenus
  const FILTRES = ["a_valider", "approuve", "programme", "publie", "autres"].map(k => [k, t("filtre." + k)]);
  const VIDE_FILTRE = I.carte("filtre.vide", ["a_valider", "approuve", "programme", "publie", "autres"]);
  const famille = x => FILTRES.some(f => f[0] === x.statut) ? x.statut : "autres";
  let filtre = null;
  // Les idées sont fusionnées dans Contenus : bouton « Proposer des idées », qui ouvre le panneau des idées.
  let ideesOuvertes = false;
  async function panneauIdees(c) {
    const [k, l] = await Promise.all([D.compteur(), D.idees()]), plein = k.publications_utilisees >= k.publications_plafond;
    return `<section class="carte" id="idees" aria-labelledby="idees-titre"><div class="carte-tete"><h2 id="idees-titre">${t("idees.titre")}</h2><button type="button" class="lien" id="fermer-idees">${t("fermer")}</button></div>
        <p class="texte2">${t("idees.texte", { a: k.publications_utilisees, b: k.publications_plafond })}</p>
        <div class="actions"><button type="button" class="bouton" id="demande"${plein || c.en_pause ? " disabled" : ""}>${t("idees.demander")}</button><p class="msg" id="msg-idees" role="status">${plein ? t("idees.plafond") : ""}</p></div>
        ${l.length ? `<ul class="liste idees">${l.map(x => `<li${x.semaine ? ` data-idee="${e(x.id)}"` : ""}><div><p class="fort"${lc()}>${e(x.titre)}</p><p class="texte2"${lc()}>${e(x.texte)}</p>
          ${x.semaine ? `<p class="note">${t("idee.semaine")}${x.motif ? `. <span${lc()}>${e(x.motif)}</span>` : ""}</p>${x.statut === "a_valider" ? `<div class="actions"><button type="button" class="bouton second petit" data-decider-idee="retenue">${t("idee.retenir")}</button><button type="button" class="lien" data-decider-idee="ecartee">${t("idee.ecarter")}</button></div>` : ""}` : ""}</div>
          <span class="note">${x.semaine && x.statut !== "a_valider" ? t(x.statut === "retenue" ? "idee.retenue" : "idee.ecartee") + ", " : ""}${cap(date(x.cree_le))}</span></li>`).join("")}</ul>` : `<p class="texte2">${t("idees.vide")}</p>`}</section>`;
  }
  async function contenus() {
    const [c, l] = await Promise.all([D.commerce(), D.contenus()]), nbf = Object.fromEntries(FILTRES.map(f => [f[0], l.filter(x => famille(x) === f[0]).length]));
    nomCommerce = c.nom;
    if (!filtre) filtre = (FILTRES.find(f => nbf[f[0]]) || FILTRES[0])[0];
    const liste = l.filter(x => famille(x) === filtre), urls = await Promise.all(liste.map(urlSure)), vids = await Promise.all(liste.map(videoSure));
    const formatCourt = x => t("format.court." + M.formatDe(x));
    vue.innerHTML = `${pauseBandeau(c)}<div class="entete-accueil">${entete(t("groupe.creer"), t("contenus.titre"), t("contenus.chapo"))}
        <button type="button" class="bouton second" id="proposer-idees" aria-expanded="${ideesOuvertes}" aria-controls="idees">${t("idees.titre")}</button></div>
      ${ideesOuvertes ? await panneauIdees(c) : ""}
      ${await proposition(c)}
      ${l.length ? `<div class="filtres" role="group" aria-label="${t("filtres.aria")}">${FILTRES.map(([k, nom]) => `<button type="button" data-f="${k}" aria-pressed="${k === filtre}">${nom}, ${nbf[k]}</button>`).join("")}</div>
      <p class="msg" id="msg" role="status"></p>
      ${liste.length ? `<div class="cartes">${liste.map((x, i) => `<article class="carte contenu" data-contenu="${e(x.id)}">
        <p class="meta"><span>${formatCourt(x)}${x.depot_video_id ? " · " + t("dv.montage.de.vos") : ""} · ${jourRelatif(x.cree_le)}</span><span class="etat${x.statut === "a_valider" ? " actif" : ""}">${ST_CONTENU[x.statut] || e(x.statut)}</span></p>
        ${blocReseaux(x, urls[i], vids[i])}<div class="contenu-corps">
        ${x.note_modification ? `<p class="note">${t("contenus.demande")}<span${lc()}>${e(x.note_modification)}</span></p>` : ""}
        ${x.statut === "a_valider" ? decisions(x, t("contenus.refuser")) : x.statut === "approuve" ? boutonsAuto(x.id, c.metier) : ""}</div></article>`).join("")}</div>`
      : `<section class="carte"><p class="texte2">${VIDE_FILTRE[filtre]}</p></section>`}`
      : `<section class="carte"><h2>${t("contenus.vide.titre")}</h2><p class="texte2">${t("contenus.vide.texte")}</p><p class="pied"><a class="bouton" href="#/photos">${t("photos.deposer")}</a></p></section><p class="msg" id="msg" role="status"></p>`}`;
    vue.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { filtre = b.dataset.f; contenus(); });
    // Téléphone : les filtres défilent sur une ligne ; le filtre choisi reste visible après le nouveau rendu.
    const fl = vue.querySelector(".filtres"), fp = fl && fl.querySelector("[aria-pressed=true]");
    if (fp && fl.scrollWidth > fl.clientWidth) fl.scrollLeft += fp.getBoundingClientRect().left - fl.getBoundingClientRect().left - 8;
    $("proposer-idees").onclick = async () => { ideesOuvertes = !ideesOuvertes; await contenus(); if (ideesOuvertes) $("demande").focus(); };
    if ($("fermer-idees")) $("fermer-idees").onclick = async () => { ideesOuvertes = false; await contenus(); $("proposer-idees").focus(); };
    if ($("demande")) $("demande").onclick = async () => { try { await D.demanderIdees(); await contenus(); msg(t("idees.enregistree")); majCompteurs(); } catch (er) { $("msg-idees").textContent = ph(er.message); } };
    brancherDecisions(vue, contenus); brancherAutomatisations(vue, contenus);
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
      grille = `<ul class="liste semaine" aria-label="${t("cal.semaine.aria")}">` + Array.from({ length: 7 }, (_, i) => { const d = new Date(lundi); d.setDate(lundi.getDate() + i); const it = du(d);
        return `<li${memeJour(d, aujourd) ? ' aria-current="date"' : ""}><p class="fort">${I.jourEtDate(d)}</p><div>${it.length ? it.map(x => `<p>${heure(x.prevu_le)} · ${x.reseaux.map(r => RES[r]).join(", ")} · <span${lc()}>${e(cut(x.contenu?.legende || "", 60))}</span></p>`).join("") : `<p class="note">${t("cal.rien")}</p>`}</div></li>`; }).join("") + "</ul>";
    }
    const titre = cal.mode === "mois" ? `${cap(MOIS[ref.getMonth()])} ${ref.getFullYear()}` : t("cal.semaine.du", { d: date(lundi) });
    vue.innerHTML = `${pauseBandeau(c)}${entete(t("groupe.publier"), t("cal.titre"), t("cal.chapo"))}
      <div class="rangee">
        <section class="carte large"><div class="carte-tete"><h2>${titre}</h2>
          <div class="actions serre"><button type="button" class="bouton second petit" data-m="semaine" aria-pressed="${cal.mode === "semaine"}">${t("cal.semaine")}</button><button type="button" class="bouton second petit" data-m="mois" aria-pressed="${cal.mode === "mois"}">${t("cal.mois")}</button>
          <button type="button" class="bouton second petit" data-n="-1">${t("cal.precedent")}</button><button type="button" class="bouton second petit" data-n="1">${t("cal.suivant")}</button></div></div>${grille}</section>
        <section class="carte etroite"><h2>${t("cal.programmer.titre")}</h2>${prets.length ? `<form id="f">
          <div class="f"><label for="contenu">${t("cal.contenu")}</label><select id="contenu">${prets.map(x => `<option value="${e(x.id)}">${t(x.type === "video" ? "type.video" : "type.publication.cap")}${t("deux.points")}${e(cut(x.legende || "", 70))}</option>`).join("")}</select></div>
          <div class="champs deux"><div class="f"><label for="jour">${t("cal.date")}</label><input id="jour" type="date" value="${demain()}" required></div><div class="f"><label for="heure">${t("cal.heure")}</label><input id="heure" type="time" value="12:00" required></div></div>
          <fieldset><legend>${t("cal.reseaux")}</legend>${window.RENOM_RESEAUX.map(r => `<label class="option"><input type="checkbox" name="res" value="${r}"${connectes.includes(r) ? "" : " disabled"}><span>${RES[r]}${connectes.includes(r) ? "" : t("cal.non.connecte")}</span></label>`).join("")}
          <p class="aide">${t("cal.plafond.aide")}</p></fieldset>
          <button class="bouton" type="submit">${t("cal.programmer")}</button><p class="msg" id="msg" role="status"></p></form>` : `<p class="texte2">${t("cal.aucun.pret")}</p><p class="msg" id="msg" role="status"></p>`}</section>
      </div>
      <section class="carte"><div class="carte-tete"><h2>${t("cal.vos")}</h2>${l.length ? `<span class="note">${l.length}</span>` : ""}</div>${l.length ? `<ul class="liste programmations">${l.map((x, i) => `<li class="avec-vignette" data-id="${e(x.id)}">${vignette(vign[i])}<div class="prog">
        <p><span class="fort">${dateHeure(x.prevu_le)}</span> · ${x.reseaux.map(r => RES[r]).join(", ")} · <span class="etat${x.statut === "programme" ? " actif" : ""}">${ST_PUB[x.statut] || e(x.statut)}</span></p>
        <p class="note"${lc()}>${e(cut(x.contenu?.legende || "", 90))}</p>${x.erreur ? `<p class="note">${e(ph(x.erreur))}</p>` : ""}
        ${x.statut === "programme" ? `<div class="actions serre"><input type="date" data-nj value="${jourLocal(x.prevu_le)}" aria-label="${t("cal.nouvelle.date")}"><input type="time" data-nh value="${heureLocale(x.prevu_le)}" aria-label="${t("cal.nouvelle.heure")}"><button type="button" class="bouton second petit" data-a="deplacer">${t("cal.deplacer")}</button><button type="button" class="lien" data-a="annuler">${t("annuler")}</button></div>` : ""}</div></li>`).join("")}</ul>` : `<p class="texte2">${t("cal.aucune")}</p>`}</section>`;
    vue.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { cal.mode = b.dataset.m; calendrier(); });
    vue.querySelectorAll("[data-n]").forEach(b => b.onclick = () => { const n = +b.dataset.n, d = new Date(cal.ref); if (cal.mode === "mois") d.setMonth(d.getMonth() + n); else d.setDate(d.getDate() + 7 * n); cal.ref = d; calendrier(); });
    if ($("f")) $("f").onsubmit = async ev => {
      ev.preventDefault(); const res = [...document.querySelectorAll("input[name=res]:checked")].map(x => x.value);
      try { await D.programmer({ contenu_id: $("contenu").value, reseaux: res, prevu_le: new Date($("jour").value + "T" + $("heure").value).toISOString() }); await calendrier(); msg(t("cal.programme")); } catch (er) { msg(ph(er.message)); }
    };
    vue.querySelectorAll("li[data-id]").forEach(li => li.addEventListener("click", async ev => {
      const b = ev.target.closest("[data-a]"); if (!b) return;
      try { if (b.dataset.a === "annuler") await D.annuler(li.dataset.id); else await D.deplacer(li.dataset.id, new Date(li.querySelector("[data-nj]").value + "T" + li.querySelector("[data-nh]").value).toISOString()); await calendrier(); msg(t("enregistre")); } catch (er) { msg(ph(er.message)); }
    }));
  }

  // ---------------- Avis
  async function avis() {
    const [c, l0] = await Promise.all([D.commerce(), D.avis()]);
    const rang = x => x.statut === "a_valider" && !x.sensible ? 0 : x.sensible || x.statut === "humain" ? 1 : 2, l = l0.map((x, i) => [x, i]).sort((a, b) => rang(a[0]) - rang(b[0]) || a[1] - b[1]).map(x => x[0]);
    vue.innerHTML = `${entete(t("avis.sur"), t("avis.titre"))}
      <div class="colonnes">
        <div class="pile">${l.length ? l.map(x => `<article class="carte avis${x.sensible ? " attention" : ""}" data-avis="${e(x.id)}">
          <div class="carte-tete"><p class="fort">${etoiles(x.note)}</p><p class="etat${x.statut === "a_valider" && !x.sensible ? " actif" : ""}">${ST_AVIS[x.statut] || e(x.statut)}</p></div>
          ${citation(x)}<p class="note">${x.auteur && !x.efface_le ? e(x.auteur) + " · " : ""}${t("recu.le", { d: date(x.cree_le) })}</p>
          ${x.sensible ? `<div class="encart" role="alert"><p class="fort">${t("avis.sensible", { r: e(raisonsTexte(x.raisons)) })}</p><p>${t("avis.sensible.texte")}</p></div>` : ""}
          ${x.statut === "a_valider" && !x.sensible ? reponseAValider(x) : ""}
          ${x.statut === "publie" || x.statut === "valide" ? `<p class="reponse"><span class="fort">${t(x.decision === "publication_automatique" ? "avis.rep.auto" : "avis.rep.validee")}</span> <span${lc()}>${e(x.reponse || x.reponse_proposee || "")}</span></p>` : ""}</article>`).join("")
          : `<section class="carte"><h2>${t("avis.vide.titre")}</h2><p class="texte2">${t("avis.vide.texte")}</p></section>`}
          <p class="msg" id="msg" role="status"></p></div>
        <section class="carte"><h2>${t("reglage")}</h2><p class="texte2">${t(c.reglage_avis === "tout_automatique" ? "avis.tout.auto" : "avis.reglage.4")}</p>
          <p class="note">${t("avis.sensible.jamais")}</p><p class="pied"><a href="#/fiche">${t("avis.modifier.reglage")}</a></p></section>
      </div>`;
    brancherAvis(vue, avis);
  }

  // ---- Collecte : début. Page publique d'avis, QR code et carte A6, demande par WhatsApp, retours privés.
  // Conformité Google : la page publique est la même pour tous les clients ; rien ici ne trie selon la note.
  // La carte A6 et le message WhatsApp s'adressent aux clients du commerce : ils sont écrits dans la langue du commerce.
  nb.retours = 0; nb.reputation = 0;
  GROUPES.find(g => g.id === "reputation").compte = "reputation";   // onglet du téléphone : avis à traiter et retours non lus
  const retoursNonLus = async () => { try { return (await D.retoursPrives()).filter(x => !x.lu).length; } catch (er) { return 0; } };
  const HOTE_GOOGLE = /(^|\.)(google\.[a-z.]{2,6}|g\.page|goo\.gl|g\.co)$/i;
  // Lien Google proposé par la page publique : même règle que la base (https obligatoire, sinon identifiant de lieu).
  function lienAvis(c) {
    const lien = window.RENOM_LIEN_AVIS(c); if (!lien) return null;
    const deLaFiche = lien === String(c.lien_avis || "").trim(); let hote = ""; try { hote = new URL(lien).hostname; } catch (er) {}
    return { lien, source: t(!deLaFiche ? "col.lien.construit" : HOTE_GOOGLE.test(hote) ? "col.lien.fiche" : "col.lien.douteux") };
  }
  const lienPagePublique = jeton => new URL("avis.html#" + jeton, location.href.split("#")[0]).href;
  function qrSvg(texte) { const q = qrcode(0, "M"); q.addData(texte); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); }
  // Numéro au format international : indicatif précédé de + ou de 00, puis 8 à 15 chiffres au total. Renvoie les chiffres seuls, ou null.
  function numeroInternational(saisie) {
    let n = String(saisie || "").trim().replace(/\(0\)/g, "").replace(/[\s.\-()  ]/g, "");
    if (n.startsWith("+")) n = n.slice(1); else if (n.startsWith("00")) n = n.slice(2); else return null;
    if (!/^[1-9]\d{7,14}$/.test(n)) return null;
    if (n.startsWith("33") && !/^33[1-9]\d{8}$/.test(n)) return null;   // France : pas de 0 après l'indicatif, neuf chiffres
    return n;
  }
  const messageWhatsApp = (c, prenom, lien) => t("wa.message", { prenom: prenom ? " " + prenom : "", nom: c.nom, lien }, langueCommerce);
  const lienWhatsApp = (numero, texte) => "https://wa.me/" + numero + "?text=" + encodeURIComponent(texte);
  const retourPrive = x => `<li data-retour="${e(x.id)}"><div class="retour-prive">
      <p><span class="fort">${etoiles(x.note)}</span>${x.prenom ? " · " + e(x.prenom) : ""} · <span class="etat${x.lu ? "" : " actif"}">${t(x.lu ? "retour.lu" : "retour.non.lu")}</span></p>
      ${x.message ? `<p class="citation"${lc()}>${t("guillemets", { x: e(x.message) })}</p>` : `<p class="note">${t("retour.sans.message")}</p>`}
      <p class="note">${t("recu.le", { d: date(x.cree_le) })}, ${heure(x.cree_le)}</p></div>
      <button type="button" class="lien" data-lu="${x.lu ? "0" : "1"}">${t(x.lu ? "retour.marquer.non.lu" : "retour.marquer.lu")}</button></li>`;
  async function dessinerRetours() {
    const zone = $("retours"); if (!zone) return; const l = await D.retoursPrives(), non = l.filter(x => !x.lu).length;
    zone.innerHTML = `<div class="carte-tete"><h2>${t("retours.titre")}</h2>${l.length ? `<span class="note" id="retours-compte">${non ? t("retours.non.lus", { n: non, total: l.length }) : t("retours.tous.lus", { n: l.length })}</span>` : ""}</div>
      <p class="note">${t("retours.note")}</p>
      ${l.length ? `<ul class="liste retours">${l.map(retourPrive).join("")}</ul>` : `<p class="texte2">${t("retours.vide")}</p>`}
      <p class="msg" id="retours-msg" role="status"></p>`;
    zone.querySelectorAll("[data-lu]").forEach(b => b.onclick = async () => {
      try { await D.marquerRetour(b.closest("[data-retour]").dataset.retour, b.dataset.lu === "1"); await dessinerRetours(); majCompteurs(); } catch (er) { $("retours-msg").textContent = ph(er.message); }
    });
  }
  // Mesure de la collecte : passages sur la page d'avis, clics vers Google, retours privés, nouveaux avis (lus sur la fiche Google à la demande,
  // jamais conservés : sans lecture, « Voir Résultats », jamais un zéro inventé).
  const MESURES = ["passages", "clics_google", "retours_prives", "nouveaux_avis"].map(k => [k, t("mesure." + k)]);
  const valeurMesure = (m, k) => k === "nouveaux_avis" && m[k] == null ? `<a href="#/resultats">${t("voir.resultats")}</a>` : nombre(+m[k] || 0);
  const chiffresCollecte = (m, deux) => `<dl class="bilan-chiffres${deux ? " deux" : ""}">${MESURES.map(([k, lib]) => `<div class="bilan-chiffre"><dt>${lib}</dt><dd class="chiffre" data-mesure="${k}">${valeurMesure(m, k)}</dd></div>`).join("")}</dl>`;
  const blocMesure = m => m ? `<section class="carte" id="mesure-collecte"><div class="carte-tete"><h2>${t("ce.mois")}</h2>${D.mode === "demo" ? `<span class="note">${t("demo.chiffres")}</span>` : ""}</div>
      ${chiffresCollecte(m)}<p class="note">${t("col.mesure.note")}</p></section>` : "";
  async function collecte() {
    const c = await D.commerce(), l = lienAvis(c), co = c.couleurs || {}, page = l ? lienPagePublique(await D.jetonAvis()) : null;
    const mesure = await D.resultats(1).then(r => r && r.collecte).catch(() => null), dem = await D.demandesAvis().catch(() => null);
    const local = D.mode === "demo" || /^(localhost|127\.|\[::1\])/.test(location.host), lgc = langueCommerce;
    const carteA6 = id => `<div class="a6" lang="${lgc}" style="background:${e(co.fond || "#fff")};color:${e(co.texte || "#000")}"><div><p class="a6-nom">${e(c.nom)}</p><h3>${t("a6.titre", null, lgc)}</h3></div>
      <p>${t("a6.texte", null, lgc)}</p><div class="qr"${id ? ` id="${id}"` : ""}>${qrSvg(page)}</div></div>`;
    const regle = `<section class="carte"><h2>${t("col.regle.titre")}</h2><p class="texte2">${t("col.regle.texte")}</p></section>`;
    if (!l) {
      vue.innerHTML = `${entete(t("groupe.reputation"), t("ecran.collecte"), t("col.chapo"))}
        <div class="pile">${regle}${blocMesure(mesure)}
          <section class="carte"><h2>${t("col.manque.titre")}</h2><p class="texte2">${t("col.manque.texte")}</p>
          <p class="note">${t("col.manque.note")}</p></section></div>`;
      return;
    }
    vue.innerHTML = `${entete(t("groupe.reputation"), t("ecran.collecte"), t("col.chapo"))}
      <div class="colonnes collecte">
        <div class="pile">
          ${regle}
          ${blocMesure(mesure)}
          <section class="carte"><h2>${t("col.page.titre")}</h2>
            <p class="texte2">${t("col.page.texte")}</p>
            <p id="lien" class="casse fort">${e(page)}</p>
            <div class="actions"><button type="button" class="bouton" id="imprimer">${t("col.imprimer")}</button><a class="bouton second" id="ouvrir-lien" href="${e(page)}" target="_blank" rel="noopener">${t("col.ouvrir")}</a><button type="button" class="lien" id="copier">${t("col.copier")}</button></div>
            <p class="msg" id="msg" role="status"></p>
            <p class="note">${t("col.bouton.google")}<span id="lien-google" class="casse">${e(l.lien)}</span>. ${e(l.source)}</p>
            ${local ? `<p class="note" id="note-adresse">${t("col.adresse.demo")}</p>` : ""}</section>
          ${blocDemandesEmail(dem)}
          <section class="carte" id="retours"></section>
          <section class="carte"><h2>${t("wa.titre")}</h2>
            <p class="texte2">${t("wa.texte")}</p>
            <div class="encart"><p><span class="fort">${t("wa.respecter")}</span> ${t("wa.regle")}</p></div>
            <form id="wa" novalidate><div class="champs">
              <div class="f"><label for="wa-prenom">${t("wa.prenom")}</label><input id="wa-prenom" type="text" autocomplete="off" maxlength="60"></div>
              <div class="f"><label for="wa-numero">${t("wa.numero")}</label><input id="wa-numero" type="tel" inputmode="tel" autocomplete="off" placeholder="${t("wa.exemple.numero")}" aria-describedby="wa-aide"></div>
              <p class="aide toute" id="wa-aide">${t("wa.aide")}</p>
              <div class="f toute"><label for="wa-message">${t("wa.message.lib")}</label><textarea id="wa-message" class="haut-texte" lang="${lgc}"></textarea></div></div>
              <div class="actions"><button class="bouton" type="submit">${t("wa.ouvrir")}</button><p class="msg" id="wa-msg" role="status"></p></div></form></section>
        </div>
        <section class="carte carte-apercu"><h2>${t("a6.apercu")}</h2><div class="apercu-a6" id="apercu">${carteA6("qr")}</div><p class="note">${t("a6.note")}</p></section>
      </div>
      <div class="zone-a6">${carteA6("")}</div>`;
    $("imprimer").onclick = () => window.print();
    $("copier").onclick = async () => { try { await navigator.clipboard.writeText(page); msg(t("col.copie")); } catch (er) { msg(t("col.copie.echec")); } };
    // WhatsApp : le message suit le prénom tant que le commerçant ne l'a pas réécrit lui-même.
    const waMsg = x => { $("wa-msg").textContent = x; }; let reecrit = false;
    const proposer = () => { if (!reecrit) $("wa-message").value = messageWhatsApp(c, $("wa-prenom").value.trim(), page); };
    proposer(); $("wa-prenom").oninput = proposer; $("wa-message").oninput = () => { reecrit = true; };
    $("wa").onsubmit = ev => {
      ev.preventDefault(); const numero = numeroInternational($("wa-numero").value), texte = $("wa-message").value.trim();
      if (!numero) { waMsg(t("wa.numero.ko")); $("wa-numero").focus(); return; }
      if (!texte.includes(page)) { waMsg(t("wa.garder.lien")); $("wa-message").focus(); return; }
      window.open(lienWhatsApp(numero, texte), "_blank", "noopener");
      $("wa-numero").value = ""; $("wa-prenom").value = ""; reecrit = false; proposer();
      waMsg(t("wa.ouvre"));
    };
    brancherDemandesEmail();
    await dessinerRetours();
  }
  // ---- Automatisations de service : demande d'avis par email (import CSV, mesure, liste d'opposition)
  const ST_DEMANDE = I.carte("dem.st", ["a_envoyer", "en_cours", "envoye", "annule", "echec"]);
  const CHIFFRES_DEMANDES = ["envois", "ouvertures", "clics_google", "relances"].map(k => [k, t("dem.chiffre." + k)]);
  function blocDemandesEmail(m) {
    if (!m) return "";
    const modele = "data:text/csv;charset=utf-8," + encodeURIComponent(AU.MODELE_CSV);
    return `<section class="carte" id="demandes-email" aria-labelledby="dem-email-titre"><div class="carte-tete"><h2 id="dem-email-titre">${t("dem.titre")}</h2>${D.mode === "demo" ? `<span class="note">${t("demo.chiffres")}</span>` : ""}</div>
      <p class="texte2">${t("dem.texte")}</p>
      <div class="encart"><p><span class="fort">${t("dem.regles")}</span> ${t("dem.regles.texte")}</p></div>
      <form id="import-clients" novalidate>
        <div class="f"><div class="depot"><input id="csv" class="vh" type="file" accept=".csv,text/csv,text/plain"><label for="csv" class="bouton second">${t("dem.choisir")}</label><span class="note casse" id="csv-nom" aria-live="polite">${t("dem.aucun.fichier")}</span></div>
          <p class="aide">${t("dem.aide")} <a href="${modele}" download="${t("dem.modele.nom")}">${t("dem.modele")}</a></p></div>
        <label class="option consentement"><input type="checkbox" id="consentement"><span>${t("dem.consentement")}</span></label>
        <div class="actions"><button class="bouton" type="submit" id="importer">${t("dem.importer")}</button></div>
        <p class="msg" id="msg-import" role="status"></p><ul class="liste" id="import-ignores" hidden></ul></form>
      <dl class="bilan-chiffres deux">${CHIFFRES_DEMANDES.map(([k, lib]) => `<div class="bilan-chiffre"><dt>${lib}</dt><dd class="chiffre" data-demandes="${k}">${nombre(+m[k] || 0)}</dd></div>`).join("")}</dl>
      <p class="note">${t("dem.periode", { j: m.periode_jours || 30, a_venir: `<span data-demandes="a_venir">${nombre(+m.a_venir || 0)}</span>`, opp: `<span data-demandes="oppositions">${nombre(+m.oppositions || 0)}</span>` })}</p>
      ${(m.dernieres || []).length ? `<details class="dernieres"><summary>${t("dem.dernieres", { n: m.dernieres.length })}</summary><ul class="liste">${m.dernieres.map(x => `<li><div><p class="fort">${e(x.prenom || t("dem.client"))}</p>
        <p class="note">${t(x.etape === "relance" ? "dem.rappel" : "dem.demande")}, ${cap(date(x.envoye_le || x.prevu_le))}${x.ouverte ? t("dem.page.ouverte") : ""}${x.motif ? " (" + e(ph(x.motif)) + ")" : ""}</p></div><span class="etat">${ST_DEMANDE[x.statut] || e(x.statut)}</span></li>`).join("")}</ul></details>` : ""}
      <form id="opposition" novalidate><div class="f"><label for="opp-email">${t("dem.opp.label")}</label><input id="opp-email" type="email" autocomplete="off"></div>
        <div class="actions"><button class="bouton second" type="submit">${t("dem.opp.bouton")}</button></div><p class="msg" id="msg-opp" role="status"></p></form></section>`;
  }
  function brancherDemandesEmail() {
    if (!$("import-clients")) return;
    $("csv").onchange = () => { const f = $("csv").files[0]; $("csv-nom").textContent = f ? f.name : t("dem.aucun.fichier"); };
    $("import-clients").onsubmit = async ev => {
      ev.preventDefault(); const m = x => { $("msg-import").textContent = x; }, ul = $("import-ignores"); ul.hidden = true; ul.innerHTML = "";
      const f = $("csv").files[0]; if (!f) { m(t("dem.choisir.dabord")); return; }
      if (!$("consentement").checked) { m(t("dem.cocher")); $("consentement").focus(); return; }
      try {
        const lignes = AU.lireCsvClients(await f.text()), r = await D.importerClients(lignes, true), ign = r.ignores || [];
        await collecte();
        $("msg-import").textContent = t("dem.importes", { n: r.importes }) + (ign.length ? t("dem.ecartees", { n: ign.length }) : "") + t("dem.partent");
        if (ign.length) { const u = $("import-ignores"); u.hidden = false; u.innerHTML = ign.map(x => `<li><div><p class="fort">${t("dem.ligne", { n: x.ligne + 1 })}</p><p class="note">${e(ph(x.raison))}</p></div></li>`).join(""); }
        $("demandes-email").scrollIntoView({ block: "nearest" });
      } catch (er) { m(ph(er.message)); }
    };
    $("opposition").onsubmit = async ev => {
      ev.preventDefault(); const em = $("opp-email").value.trim();
      try { await D.ajouterOpposition(em); await collecte(); $("msg-opp").textContent = t("dem.opp.ok"); } catch (er) { $("msg-opp").textContent = ph(er.message); }
    };
  }
  // ---- Collecte : fin

  // ---------------- Comptes connectés
  const AIDE = I.carte("compte.aide", ["google", "facebook", "instagram", "tiktok"]);
  async function comptes() {
    const l = await D.comptes();
    vue.innerHTML = `${entete(t("groupe.commerce"), t("ecran.comptes"), (D.mode === "demo" ? t("comptes.demo") + " " : "") + t("comptes.chapo"))}
      <div class="cartes comptes">${l.map(x => `<article class="carte"><h2>${RES[x.reseau]} <span class="etat${x.etat === "connecte" ? " actif" : ""}">· ${ETAT[x.etat] || e(x.etat)}</span></h2><p class="texte2">${AIDE[x.reseau]}</p>${x.detail ? `<p class="note pied">${e(ph(x.detail))}</p>` : ""}</article>`).join("")}</div>`;
  }

  // ---------------- Offre
  const LANC = window.RENOM_LANCEMENT || { duree_mois: 3, date_limite: "2026-12-31" };
  const dateLimiteLancement = () => I.dateLongue(LANC.date_limite);
  const euros = x => t("euros", { x: nombre(x) });
  async function offre() {
    const [k, j, c, ab] = await Promise.all([D.compteur(), D.journal(), D.commerce(), D.abonnement ? D.abonnement().catch(() => null) : null]); const o = window.RENOM_OFFRES[k.offre] || {}, mois = new Date(k.mois + "T12:00:00");
    // Abonnement Stripe : état écrit par le webhook (table abonnements) ; bouton seulement si un lien est configuré (config.js, stripe).
    const lien = D.lienAbonnement ? D.lienAbonnement(ab, c, k.offre) : null, remise = ab && ab.remise_lancement_fin && ab.statut !== "resilie" && ab.remise_lancement_fin >= window.RENOM_MAJ.aujourdhui();
    vue.innerHTML = `${pauseBandeau(c)}${entete(t("offre.sur"), t("offre.titre.nom", { nom: e(k.offre_nom) }))}
      <div class="rangee">
        <section class="carte moitie"><div class="carte-tete"><h2>${t("ce.mois")}</h2><span class="note">${cap(MOIS[mois.getMonth()])} ${mois.getFullYear()}</span></div>
          ${mesure(t("offre.pub.utilisees"), k.publications_utilisees, k.publications_plafond)}
          ${k.videos_plafond ? mesure(t("offre.vid.utilisees"), k.videos_utilisees, k.videos_plafond) : `<div class="mesure-tete"><span>${t("mes.videos")}</span><span class="note">${t("non.comprises.offre")}</span></div>`}
          <div class="mesure-tete" id="offre-commentaires"><span>${t("offre.rep.commentaires")}</span>${k.commentaires_inclus ? `<span>${t("offre.cm.sans.plafond", { n: `<span class="chiffre">${nombre(+k.commentaires_repondus || 0)}</span>` })}</span>` : `<span class="note">${t("non.comprises.offre")}</span>`}</div>
          <p class="note pied">${t("offre.compteur.debut")}</p></section>
        <section class="carte moitie"><h2>${t("offre.inclus")}</h2><ul class="liste"><li><span>${t("offre.inc.publications")}</span><span class="fort">${o.publications ?? k.publications_plafond}</span></li><li><span>${t("offre.inc.videos")}</span><span class="fort">${(o.videos ?? k.videos_plafond) || t("non.comprises")}</span></li><li><span>${t("offre.inc.avis")}</span><span class="fort">${t("comprises")}</span></li><li><span>${t("offre.inc.commentaires")}</span><span class="fort">${t(k.commentaires_inclus ? "comprises" : "non.comprises")}</span></li><li><span>${t("offre.inc.concurrents")}</span><span class="fort">${t("comprise")}</span></li><li><span>${t("offre.inc.bilan")}</span><span class="fort">${t("compris")}</span></li></ul>
          <p class="note pied">${t("offre.idees.compte")}</p></section>
      </div>
      ${o.prix_ht ? `<section class="carte" id="offre-prix"><h2>${t("offre.prix.titre")}</h2><p class="prix-offre"><span class="chiffre">${euros(o.prix_ht)}</span> ${t("offre.ht.mois")}</p>
        <p class="texte2 lecture">${t("offre.lancement", { date: dateLimiteLancement(), mois: LANC.duree_mois, prix: euros(o.prix_lancement_ht) })}</p>
        <p class="note">${t("offre.cgv")}</p></section>` : ""}
      <section class="carte" id="offre-abonnement"><div class="carte-tete"><h2>${t("abo.titre")}</h2>${ab ? `<span class="etat${ab.statut === "actif" ? " actif" : ""}" id="abo-statut">${ST_ABO[ab.statut] || e(ab.statut)}</span>` : ""}</div>
        <p class="texte2 lecture">${ab ? t("abo.texte." + ab.statut) : t("abo.aucun")}</p>
        ${remise ? `<p class="texte2 lecture" id="abo-remise">${t("abo.remise", { date: I.dateLongue(ab.remise_lancement_fin) })}</p>` : ""}
        ${lien ? `<p class="pied"><a class="bouton" id="offre-payer" href="${e(lien)}" target="_blank" rel="noopener">${t("abo.bouton")}</a></p><p class="note">${t(ab && ab.statut !== "resilie" ? "abo.note.portail" : lien.includes("prefilled_promo_code=") ? "abo.note.paiement.code" : "abo.note.paiement")}</p>`
          : D.mode === "demo" ? `<p class="note">${t("abo.demo")}</p>` : ""}</section>
      <section class="carte"><h2>${t("offre.plafond.titre")}</h2><p class="texte2 lecture">${t("offre.plafond.texte")}</p></section>
      <section class="carte"><h2>${t("offre.historique")}</h2>${j.length ? `<ul class="liste">${j.slice(0, 12).map(x => `<li><span>${e(ETAPES[x.type] || cap(String(x.type || "").toLowerCase().replace(/_/g, " ")))}${x.detail && x.detail.raison ? `<span class="note">${t("deux.points")}${e(ph(x.detail.raison))}</span>` : ""}</span><span class="note">${cap(date(x.cree_le))}</span></li>`).join("")}</ul>` : `<p class="texte2">${t("offre.aucune.etape")}</p>`}</section>`;
  }

  // ---------------- Résultats : ce que RENOM rapporte, mois par mois. Aucun chiffre inventé : la portée attend les statistiques des réseaux.
  const pctTaux = x => x == null ? null : Math.round(+x <= 1 ? +x * 100 : +x);   // la base peut rendre une proportion (0 à 1) ou un pourcentage
  const delaiTexte = h => h == null ? t("delai.aucun.periode") : +h < 1 ? t("delai.moins.heure") : +h < 48 ? t("delai.h", { n: nombre(Math.round(+h)) }) : t("delai.jours", { n: nombre(Math.round(+h / 24)) });
  const NOMS_PILIERS = I.carte("pilier", ["profil", "categories", "photos", "avis", "engagement"]);
  // Libellé d'un pilier : traduit d'après sa clé quand elle est connue, sinon le nom donné par la base.
  const nomPilier = (cle, nom) => NOMS_PILIERS[cle] || nom || cle;
  const piliersDe = p => Array.isArray(p) ? p.map(x => ({ nom: nomPilier(x.cle, x.nom), note: +x.note || 0, sur: +x.sur || 20 }))
    : p && typeof p === "object" ? Object.entries(p).map(([k, v]) => v && typeof v === "object" ? { nom: nomPilier(k, v.nom), note: +v.note || 0, sur: +v.sur || 20 } : { nom: nomPilier(k), note: +v || 0, sur: 20 }) : [];
  const moisLong = m => { const d = moisDe(m); return MOIS[d.getMonth()] + " " + d.getFullYear(); };
  const moisCourt = m => I.moisCourt(moisDe(m).getMonth());
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
        ${pleins.map(([p, i]) => `<span class="c-point" style="left:${X(i)}%;top:${Y(p.v)}%" title="${e(p.lib + t("deux.points") + o.fmt(p.v))}"></span>`).join("")}
        ${etiquette(premier, "debut")}${dernier !== premier ? etiquette(dernier, "fin") : ""}</div>
      <div class="c-mois" aria-hidden="true">${pts.map((p, i) => `<span style="left:${X(i)}%">${p.court}</span>`).join("")}</div></figure>`;
  }
  // Google interdit à RENOM de garder note, nombre d'avis, noms et historique (ordres/BRANCHEMENT.md, « Conformité des résultats ») : ces chiffres
  // sont lus à l'ouverture de la page (lecture_google). La phrase dit ce qui a été lu, ou pourquoi rien ne l'a été.
  function lectureTexte(lg) {
    if (!lg || lg.statut === "non_demandee") return "";
    if (lg.statut === "ok") return t("lecture.ok", { h: lg.le ? ` (${heure(lg.le)})` : "" });
    if (lg.statut === "limite") return t("lecture.limite");
    if (lg.statut === "non_branchee") return t("lecture.non.branchee");
    return t("lecture.echec");
  }
  async function resultats() {
    const [c, R] = await Promise.all([D.commerce(), D.resultats(6)]), mois = (R && R.mois) || [], avecNote = mois.filter(m => m.note != null), lg = (R && R.lecture_google) || {};
    const prem = avecNote[0], dern = avecNote[avecNote.length - 1], rep = (R && R.reponses) || {}, audit = (R && R.audit) || [], conc = (R && R.concurrents) || [], themes = (R && R.themes) || [], col = (R && R.collecte) || {};
    const pts = k => mois.map(m => ({ v: m[k] == null ? null : +m[k], lib: moisLong(m.mois), court: moisCourt(m.mois) }));
    const periode = mois.length ? t("res.periode", { a: moisLong(mois[0].mois), b: moisLong(mois[mois.length - 1].mois) }) : "";
    const ecart = (a, b, d) => { const x = Math.round((b - a) * 10 ** d) / 10 ** d; return x > 0 ? "+" + nombre(x, d) : x < 0 ? "−" + nombre(-x, d) : t("res.stable"); };
    const taux = pctTaux(rep.taux), dernierAudit = audit[audit.length - 1];
    const maxTheme = Math.max(1, ...themes.map(x => (+x.positif || 0) + (+x.negatif || 0)));
    const actuelConc = x => (x.mois || [])[x.mois.length - 1] || {}, actuel = mois[mois.length - 1] || {}, enCours = dern && dern === actuel;
    const nonLu = t(lg.fiche === "non_reliee" ? "res.fiche.non.reliee" : "res.note.non.lue");
    const lecture = lectureTexte(lg), nonLue = t("non.lue"), nonLuM = t("non.lu");
    vue.innerHTML = `${entete(t("groupe.resultats"), t("res.titre"), t("res.chapo") + (periode ? ", " + periode : "") + ".")}
      ${bandeauDemo()}
      ${lecture ? `<p class="note lecture-google" id="lecture-google">${e(lecture)}</p>` : ""}
      <div class="rangee">
        <section class="carte moitie" aria-labelledby="r-note"><div class="carte-tete"><h2 id="r-note">${t("bilan.note")}</h2>${prem && dern && prem !== dern ? `<span class="note">${t("res.depuis", { x: ecart(+prem.note, +dern.note, 1), mois: MOIS[moisDe(prem.mois).getMonth()] })}</span>` : ""}</div>
          ${dern ? `<p><span class="chiffre grand-chiffre">${nombre(dern.note, 1)}</span> <span class="note">${t(enCours ? "res.sur5.auj" : "res.sur5.fin", { mois: moisLong(dern.mois) })}</span></p>` : ""}
          ${courbe(pts("note"), { fmt: v => nombre(v, 1), pas: 0.4, min: 1, alt: t("res.note.alt", { l: avecNote.map(m => moisLong(m.mois) + " " + nombre(m.note, 1)).join(", ") }), vide: nonLu })}
          ${lg.historique_reconstitue && avecNote.length > 1 ? `<p class="note" id="historique-note">${t("res.historique")}</p>` : ""}</section>
        <section class="carte moitie" aria-labelledby="r-nb"><div class="carte-tete"><h2 id="r-nb">${t("res.nb.avis")}</h2>${prem && dern && prem !== dern ? `<span class="note">${t("res.depuis", { x: ecart(+prem.nb_avis, +dern.nb_avis, 0), mois: MOIS[moisDe(prem.mois).getMonth()] })}</span>` : ""}</div>
          ${dern ? `<p><span class="chiffre grand-chiffre">${nombre(dern.nb_avis)}</span> <span class="note">${t("res.avis.total")}</span></p>` : ""}
          ${courbe(pts("nb_avis"), { fmt: v => nombre(v), pas: 2, min: 0, alt: t("res.nb.alt", { l: avecNote.map(m => moisLong(m.mois) + " " + nombre(m.nb_avis)).join(", ") }), vide: lg.fiche === "non_reliee" ? nonLu : t("res.nb.non.lu") })}</section>
      </div>
      ${avecNote.length ? `<details class="carte details-chiffres"><summary>${t("res.voir.chiffres")}</summary>
        <table class="tab compact"><thead><tr><th>${t("res.col.mois")}</th><th>${t("res.col.note")}</th><th>${t("res.col.total")}</th><th>${t("res.col.recus")}</th><th>${t("res.col.reponses")}</th><th>${t("res.col.delai")}</th><th>${t("res.col.publications")}</th></tr></thead><tbody>
        ${mois.map(m => `<tr><td data-l="${t("res.col.mois")}">${cap(moisLong(m.mois))}</td><td data-l="${t("res.col.note")}">${m.note == null ? nonLue : nombre(m.note, 1)}</td><td data-l="${t("res.col.total")}">${m.nb_avis == null ? nonLuM : nombre(m.nb_avis)}</td><td data-l="${t("res.col.recus")}">${nombre(+m.avis_recus || 0)}</td><td data-l="${t("res.l.reponses")}">${nombre(+m.reponses || 0)}</td><td data-l="${t("res.l.delai")}">${m.delai_moyen_h == null ? t("res.aucune.reponse") : delaiTexte(m.delai_moyen_h)}</td><td data-l="${t("res.col.publications")}">${nombre(+m.publications || 0)}</td></tr>`).join("")}</tbody></table></details>` : ""}
      <div class="rangee">
        <section class="carte etroite" aria-labelledby="r-rep"><h2 id="r-rep">${t("res.rep.titre")}</h2>
          ${taux == null ? `<p class="texte2">${t("res.rep.aucun")}</p>` : `<dl class="bilan-chiffres deux"><div class="bilan-chiffre"><dt>${t("res.taux")}</dt><dd class="chiffre" id="taux">${t("pourcent", { n: nombre(taux) })}</dd></div><div class="bilan-chiffre"><dt>${t("res.l.delai")}</dt><dd class="chiffre" id="delai">${delaiTexte(rep.delai_moyen_h)}</dd></div></dl>
          <p class="note">${t("res.rep.note", { n: mois.length })}</p>`}</section>
        <section class="carte large" aria-labelledby="r-audit"><div class="carte-tete"><h2 id="r-audit">${t("res.score.titre")}</h2><span class="note">${t("etat.actuel")}</span></div>
          ${dernierAudit ? `<p><span class="chiffre grand-chiffre">${nombre(+dernierAudit.score)}</span> <span class="note">${t("res.score.sur")}</span></p>
          <div class="audit"><div class="pile serre piliers">${piliersDe(dernierAudit.piliers).map(p => mesure(e(p.nom), p.note, p.sur)).join("")}</div></div>
          <p class="note">${t("res.score.note")}</p>`
          : `<p class="texte2">${t(lg.score === "non_reliee" ? "res.score.non.reliee" : "res.score.non.calcule")}</p>`}</section>
      </div>
      <section class="carte" aria-labelledby="r-conc"><div class="carte-tete"><h2 id="r-conc">${t("res.conc.titre")}</h2><span class="note">${t("etat.actuel")}</span></div>
        ${conc.length ? `<p class="note" id="conc-mention">${t("res.conc.mention")}</p>
          <div class="defile"><table class="comparatif"><thead><tr><th>${t("res.col.commerce")}</th><th>${t("res.col.note")}</th><th>${t("res.col.avis")}</th></tr></thead><tbody>
          <tr class="vous"><td data-l="${t("res.col.commerce")}"><span class="fort">${e(c.nom)}</span> ${t("res.vous")}</td><td data-l="${t("res.col.note")}">${actuel.note == null ? nonLue : nombre(actuel.note, 1)}</td><td data-l="${t("res.col.avis")}">${actuel.nb_avis == null ? nonLuM : nombre(actuel.nb_avis)}</td></tr>
          ${conc.map(x => { const b = actuelConc(x); return `<tr><td data-l="${t("res.col.commerce")}">${e(x.nom)}</td><td data-l="${t("res.col.note")}">${b.note == null ? nonLue : nombre(b.note, 1)}</td><td data-l="${t("res.col.avis")}">${b.nb_avis == null ? nonLuM : nombre(b.nb_avis)}</td></tr>`; }).join("")}</tbody></table></div>`
        : `<p class="texte2">${t("res.conc.aucun")}</p>`}</section>
      <div class="rangee">
        <section class="carte moitie" aria-labelledby="r-themes"><h2 id="r-themes">${t("res.themes.titre")}</h2>
          ${themes.length ? `<ul class="liste themes">${themes.map(x => { const p = +x.positif || 0, n = +x.negatif || 0; return `<li><div class="theme"><p class="fort"${lc()}>${e(x.theme)}</p><div class="t-barre" aria-hidden="true">${p ? `<span class="t-pos" style="width:${p / maxTheme * 100}%"></span>` : ""}${n ? `<span class="t-neg" style="width:${n / maxTheme * 100}%"></span>` : ""}</div></div><p class="note t-compte">${t("res.themes.compte", { p, n })}</p></li>`; }).join("")}</ul>
          <p class="note">${t("res.themes.legende")}</p>` : `<p class="texte2">${t(lg.themes === "insuffisants" ? "res.themes.insuffisants" : "res.themes.aucun")}</p>`}
          <p class="note" id="themes-note">${t("res.themes.note", { n: lg.themes_avis ? ` (${t("res.n.avis", { n: lg.themes_avis })})` : "" })}</p></section>
        <section class="carte moitie" aria-labelledby="r-col"><div class="carte-tete"><h2 id="r-col">${t("res.collecte.titre")}</h2><a href="#/collecte">${t("res.collecte.ouvrir")}</a></div>${chiffresCollecte(col, true)}
          <p class="note">${t("res.collecte.note")}</p></section>
      </div>
      <section class="carte" aria-labelledby="r-portee"><h2 id="r-portee">${t("res.portee.titre")}</h2><p class="texte2" id="portee">${t("res.portee")}</p></section>`;
  }

  // ---------------- Fiche Google : photos, offre, événement, horaires exceptionnels. Le commerçant valide, rien ne part seul.
  const TYPES_ACT = I.carte("act.type", ["photos", "offre", "evenement", "horaires"]);
  const ST_ACT = I.carte("act.st", ["a_valider", "a_publier", "publie", "refuse"]);
  let typeAction = "photos";
  const jourTexte = j => cap(date(j + "T12:00:00"));
  const resumeAction = (a, ph_) => { const d = a.donnees || {};
    if (a.type === "photos") { const noms = (d.photos || []).map(id => (ph_.find(p => p.id === id) || {}).nom_fichier).filter(Boolean); const n = (d.photos || []).length; return `${t("photos.n", { n })}${noms.length ? t("deux.points") + e(noms.join(", ")) : ""}`; }
    if (a.type === "horaires") return `${jourTexte(d.date)}${t("deux.points")}${d.ferme ? t("act.ferme.journee") : t("act.de.a", { a: hm(d.ouverture), b: hm(d.fermeture) })}`;
    return `<span${lc()}>${e(d.titre)}</span>${t("act.du.au", { a: date(d.debut + "T12:00:00"), b: date(d.fin + "T12:00:00") })}${d.conditions ? `${t("act.conditions")}<span${lc()}>${e(d.conditions)}</span>` : ""}`; };
  function champsAction(ph_) {
    const auj = M.aujourdhui(), dates = `<div class="champs deux"><div class="f"><label for="af-debut">${t("act.debut")}</label><input id="af-debut" type="date" min="${auj}" required></div><div class="f"><label for="af-fin">${t("act.fin")}</label><input id="af-fin" type="date" min="${auj}" required></div></div>`;
    const titre = lib => `<div class="f"><label for="af-titre">${lib}</label><input id="af-titre" type="text" maxlength="120" required></div>`;
    return { photos: ph_.length ? `<fieldset><legend>${t("act.photos.legend")}</legend>${ph_.slice(0, 12).map(p => `<label class="option"><input type="checkbox" name="af-photo" value="${e(p.id)}"><span class="casse">${t("act.photo.deposee", { nom: e(p.nom_fichier || t("photo")), d: date(p.cree_le) })}</span></label>`).join("")}</fieldset>`
        : `<p class="texte2">${t("act.aucune.photo")}</p>`,
      offre: titre(t("act.titre.offre")) + dates + `<div class="f"><label for="af-conditions">${t("act.conditions.lib")}</label><textarea id="af-conditions" maxlength="1500"></textarea><p class="aide">${t("act.conditions.aide")}</p></div>`,
      evenement: titre(t("act.titre.evenement")) + dates,
      horaires: `<div class="f"><label for="af-date">${t("cal.date")}</label><input id="af-date" type="date" min="${auj}" required></div>
        <label class="option"><input type="checkbox" id="af-ferme"><span>${t("act.ferme")}</span></label>
        <div class="champs deux" id="af-heures"><div class="f"><label for="af-ouverture">${t("act.ouverture")}</label><input id="af-ouverture" type="time"></div><div class="f"><label for="af-fermeture">${t("act.fermeture")}</label><input id="af-fermeture" type="time"></div></div>` }[typeAction];
  }
  async function ficheGoogle() {
    const [c, l, ph_] = await Promise.all([D.commerce(), D.actionsFiche(), D.photos()]);
    vue.innerHTML = `${pauseBandeau(c)}${entete(t("groupe.reputation"), t("act.titre"), t("act.chapo"))}
      <div class="rangee">
        <section class="carte moitie" aria-labelledby="af-titre-carte"><h2 id="af-titre-carte">${t("act.preparer.titre")}</h2>
          <form id="af"><div class="f"><label for="af-type">${t("act.quoi")}</label><select id="af-type">${Object.entries(TYPES_ACT).map(([k, lib]) => `<option value="${k}"${k === typeAction ? " selected" : ""}>${lib}</option>`).join("")}</select></div>
            <div class="pile" id="af-champs">${champsAction(ph_)}</div>
            <div class="actions"><button class="bouton" type="submit">${t("act.preparer")}</button></div><p class="msg" id="msg" role="status"></p></form></section>
        <section class="carte moitie" aria-labelledby="af-liste-titre"><div class="carte-tete"><h2 id="af-liste-titre">${t("act.vos")}</h2>${l.length ? `<span class="note">${l.length}</span>` : ""}</div>
          <p class="note">${t("act.note")}${D.mode === "demo" ? " " + t("act.demo") : ""}</p>
          ${l.length ? `<ul class="liste actions-fiche">${l.map(a => `<li data-action="${e(a.id)}"><div class="prog"><p><span class="fort">${TYPES_ACT[a.type] || e(a.type)}</span> · <span class="etat${a.statut === "a_valider" ? " actif" : ""}">${ST_ACT[a.statut] || e(a.statut)}</span></p>
            <p class="texte2">${resumeAction(a, ph_)}</p><p class="note">${a.statut === "publie" && a.publie_le ? t("act.publie.le", { d: date(a.publie_le) }) : t("act.prepare.le", { d: date(a.cree_le) })}${a.demo ? t("act.exemple.demo") : ""}</p>
            ${a.statut === "a_valider" ? `<div class="actions serre"><button type="button" class="bouton petit" data-d="approuve">${t("valider")}</button><button type="button" class="lien" data-d="refuse">${t("refuser")}</button></div>` : ""}</div></li>`).join("")}</ul>`
          : `<p class="texte2">${t("act.aucune")}</p>`}</section>
      </div>`;
    const brancherChamps = () => { const f = $("af-ferme"); if (f) f.onchange = () => { $("af-heures").hidden = f.checked; }; };
    brancherChamps();
    $("af-type").onchange = () => { typeAction = $("af-type").value; $("af-champs").innerHTML = champsAction(ph_); brancherChamps(); msg(""); };
    $("af").onsubmit = async ev => {
      ev.preventDefault(); const v = id => ($(id) ? $(id).value : "");
      const d = typeAction === "photos" ? { photos: [...document.querySelectorAll("input[name=af-photo]:checked")].map(x => x.value) }
        : typeAction === "horaires" ? { date: v("af-date"), ferme: $("af-ferme").checked, ouverture: v("af-ouverture"), fermeture: v("af-fermeture") }
        : { titre: v("af-titre"), debut: v("af-debut"), fin: v("af-fin"), conditions: v("af-conditions") };
      try { await D.creerActionFiche(typeAction, d); await ficheGoogle(); msg(t("act.preparee")); } catch (er) { msg(ph(er.message)); }
    };
    vue.querySelectorAll("[data-action]").forEach(li => li.addEventListener("click", async ev => {
      const b = ev.target.closest("[data-d]"); if (!b) return;
      try { await D.validerActionFiche(li.dataset.action, b.dataset.d); await ficheGoogle(); msg(t(b.dataset.d === "approuve" ? "act.valide" : "act.refusee")); } catch (er) { msg(ph(er.message)); }
    }));
  }

  // ---------------- Application installable (écran Notifications) : marche à suivre iPhone et Android, bouton direct quand le navigateur le permet.
  let invitationInstall = null;
  window.addEventListener("beforeinstallprompt", ev => { ev.preventDefault(); invitationInstall = ev; const b = $("installer-maintenant"); if (b) b.hidden = false; });
  window.addEventListener("appinstalled", () => { invitationInstall = null; if (ecranCourant === notifications) rendre(); });
  const installee = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  function blocInstaller() {
    return `<section class="carte" id="installer" aria-labelledby="inst-titre"><h2 id="inst-titre">${t("inst.titre")}</h2>
      ${installee() ? `<p class="texte2">${t("inst.deja")}</p>`
      : `<p class="texte2">${t("inst.texte")}</p>
      <ul class="liste reponses"><li><span class="fort">iPhone</span><span>${t("inst.iphone")}</span></li>
        <li><span class="fort">Android</span><span>${t("inst.android")}</span></li></ul>
      <div class="actions"><button type="button" class="bouton second" id="installer-maintenant"${invitationInstall ? "" : " hidden"}>${t("inst.maintenant")}</button></div>`}</section>`;
  }
  document.addEventListener("click", async ev => {
    if (!ev.target.closest("#installer-maintenant") || !invitationInstall) return;
    const i = invitationInstall; invitationInstall = null; ev.target.closest("#installer-maintenant").hidden = true; i.prompt(); try { await i.userChoice; } catch (er) {}
  });

  // ---------------- Notifications : email de validation (lien à usage unique, 7 jours). WhatsApp : pas maintenant.
  async function notifications() {
    const [c, s] = await Promise.all([D.commerce(), D.session()]), n = c.notifications || { email: true, whatsapp: false };
    const adresse = c.email_validation || (s && s.email) || "";
    vue.innerHTML = `${entete(t("groupe.commerce"), t("ecran.notifications"), t("notif.chapo"))}
      <div class="rangee">
        <section class="carte moitie" aria-labelledby="n-titre"><h2 id="n-titre">${t("notif.comment")}</h2><form id="f-notif">
          <fieldset><legend>${t("notif.canaux")}</legend>
            <label class="option"><input type="checkbox" id="notif-email"${n.email !== false ? " checked" : ""}><span>${t("notif.email")}${adresse ? t("notif.a", { adresse: `<span class="casse">${e(adresse)}</span>` }) : ""}</span></label>
            <label class="option"><input type="checkbox" id="notif-whatsapp" disabled><span>${t("notif.whatsapp")}</span></label>
            <p class="aide">${t("notif.whatsapp.aide")}</p></fieldset>
          <div class="actions"><button class="bouton" type="submit">${t("enregistrer")}</button></div><p class="msg" id="msg" role="status"></p></form></section>
        <section class="carte moitie"><h2>${t("notif.lien.titre")}</h2>
          <ul class="liste"><li>${t("notif.lien.1")}</li><li>${t("notif.lien.2")}</li><li>${t("notif.lien.3")}</li><li>${t("notif.lien.4")}</li></ul>
          <p class="note">${t("notif.adresse")}</p></section>
      </div>
      ${blocInstaller()}
      ${D.mode === "demo" ? `<section class="carte" aria-labelledby="n-demo"><h2 id="n-demo">${t("demonstration")}</h2><p class="texte2">${t("notif.demo")}</p>
        <div class="actions"><button type="button" class="bouton second" id="voir-email" aria-expanded="false" aria-controls="apercu-email">${t("notif.voir.email")}</button></div><div id="apercu-email" class="pile" hidden></div></section>` : ""}`;
    $("f-notif").onsubmit = async ev => { ev.preventDefault(); try { await D.enregistrer({ notifications: { email: $("notif-email").checked, whatsapp: false } }); msg(t("reglage.enregistre")); } catch (er) { msg(ph(er.message)); } };
    if ($("voir-email")) $("voir-email").onclick = async () => {
      const z = $("apercu-email"), ouvrir = z.hidden; z.hidden = !ouvrir; $("voir-email").setAttribute("aria-expanded", String(ouvrir)); if (!ouvrir) return;
      const l = await D.outilsDemo.emailsValidation();
      // L'email part dans la langue du commerce : son contenu est montré tel qu'il serait reçu.
      const lgc = langueCommerce, tc = (k, v) => t(k, v, lgc);
      z.innerHTML = l.length ? l.map(m => `<article class="email" aria-label="${t("email.apercu", { objet: e(m.objet_email) })}">
          <dl class="email-tete"><div><dt>${t("email.de")}</dt><dd>RENOM</dd></div><div><dt>${t("email.a")}</dt><dd class="casse">${adresse ? e(adresse) : t("email.adresse.compte")}</dd></div><div><dt>${t("email.objet")}</dt><dd lang="${lgc}">${e(m.objet_email)}</dd></div></dl>
          <div class="email-corps" lang="${lgc}"><p>${tc("email.bonjour")}</p><p>${e(m.phrase)}</p>${m.extrait ? `<p class="citation">${tc("guillemets", { x: e(m.extrait) })}</p>` : ""}
            <p><a class="bouton" data-lien-validation href="valider.html#${e(m.jeton)}" target="_blank" rel="noopener">${tc("email.voir.decider")}</a></p>
            <p class="note">${tc("email.lien.note", { d: I.date(m.expire_le, lgc) })}</p></div></article>`).join("")
        : `<p class="texte2">${t("email.rien")}</p>`;
    };
  }

  // ---------------- Démarrage en 5 questions (premier accès). Chaque question peut être passée ; la fiche complète reste accessible.
  const TONS_LIB = I.carte("ton", ["chaleureux", "sobre", "enjoue"]);
  const ACTIONS_LIB = I.carte("action", ["reserver", "appeler", "venir", "acheter"]);
  const QUESTIONS = [
    { cle: "phrase" },
    { cle: "distinctions" },
    { cle: "ton", choix: TONS_LIB },
    { cle: "interdits" },
    { cle: "action", choix: ACTIONS_LIB, detail: t("q.action.detail") },
  ].map(q => ({ ...q, titre: t("q." + q.cle + ".titre"), aide: t("q." + q.cle + ".aide") }));
  const dem = { pour: null, i: 0, rep: {}, fini: false };
  async function demarrage() {
    const c = await D.commerce();
    if (dem.pour !== c.id) Object.assign(dem, { pour: c.id, i: 0, rep: { ...(c.demarrage || {}) }, fini: false });
    if (dem.fini) {
      vue.innerHTML = `${entete(t("dem5.fini"), e(c.nom), t("dem5.fini.chapo"))}
        <section class="carte style-accueil" id="dem-style"><h2>${t("dem5.style.titre")}</h2><p class="texte2">${t("dem5.style.texte")}</p>
          <p class="pied"><a class="bouton" href="#/style">${t("dem5.style.bouton")}</a></p></section>
        <section class="carte"><h2>${t("dem5.maintenant")}</h2><p class="texte2">${t("dem5.maintenant.texte")}</p>
          <div class="actions"><button type="button" class="bouton" id="dem-accueil">${t("dem5.accueil")}</button><a class="bouton second" href="#/fiche">${t("dem5.voir.fiche")}</a></div></section>`;
      $("dem-accueil").onclick = () => { dem.pour = null; aller("accueil"); };
      return;
    }
    const q = QUESTIONS[dem.i], v = dem.rep[q.cle] || "";
    vue.innerHTML = `${entete(t("dem5.titre"), e(c.nom), t("dem5.chapo"))}
      <section class="carte demarrage">
        <div class="mesure"><div class="mesure-tete"><span class="fort">${t("dem5.question", { n: dem.i + 1 })}</span></div>${jauge(dem.i + 1, 5)}</div>
        <form id="dem-f" novalidate>
          ${q.choix ? `<fieldset><legend class="q-titre" id="q-titre">${q.titre}</legend><p class="aide">${q.aide}</p>${Object.entries(q.choix).map(([k, lib]) => `<label class="option"><input type="radio" name="dem-choix" value="${k}"${v === k ? " checked" : ""}><span>${lib}</span></label>`).join("")}</fieldset>
            ${q.detail ? `<div class="f"><label for="dem-detail">${q.detail}</label><input id="dem-detail" type="text" maxlength="200" value="${e(dem.rep.action_detail || "")}"></div>` : ""}`
          : `<div class="f"><label for="dem-champ" class="q-titre" id="q-titre">${q.titre}</label><p class="aide" id="q-aide">${q.aide}</p><textarea id="dem-champ" class="haut-texte" maxlength="600" aria-describedby="q-aide"${lc()}>${e(v)}</textarea></div>`}
          <div class="actions"><button class="bouton" type="submit" id="dem-suivant">${t(dem.i === 4 ? "dem5.terminer" : "dem5.suivant")}</button><button type="button" class="bouton second" id="dem-passer">${t("dem5.passer")}</button>${dem.i ? `<button type="button" class="lien" id="dem-precedent">${t("dem5.precedente")}</button>` : ""}</div>
          <p class="msg" id="msg" role="status"></p></form></section>
      <p class="note"><button type="button" class="lien" id="dem-plus-tard">${t("dem5.plus.tard")}</button> ${t("dem5.plus.tard.note")}</p>`;
    const lire = () => { if (q.choix) { const x = document.querySelector("input[name=dem-choix]:checked"); dem.rep[q.cle] = x ? x.value : ""; if (q.detail) dem.rep.action_detail = $("dem-detail").value.trim(); } else dem.rep[q.cle] = $("dem-champ").value.trim(); };
    const avancer = async () => {
      if (dem.i < 4) { dem.i++; await demarrage(); const f = vue.querySelector("#dem-champ, input[name=dem-choix]"); if (f) f.focus(); return; }
      try {
        await D.enregistrerDemarrage(dem.rep);
        const c2 = await D.commerce(), r = dem.rep, pre = {};   // la fiche est préremplie, sans écraser ce qui y est déjà
        if (!c2.specialites && (r.phrase || r.distinctions)) pre.specialites = [r.phrase, r.distinctions].filter(Boolean).join("\n");
        // Le ton de la fiche est écrit dans la langue du commerce (RENOM écrit dans cette langue).
        if (!c2.ton && TONS_LIB[r.ton]) pre.ton = t("ton." + r.ton, null, langueCommerce).toLowerCase();
        if (Object.keys(pre).length) await D.enregistrer(pre);
        dem.fini = true; await demarrage(); majCompteurs();
      } catch (er) { msg(ph(er.message)); }
    };
    $("dem-f").onsubmit = async ev => { ev.preventDefault(); lire(); await avancer(); };
    $("dem-passer").onclick = async () => { await avancer(); };
    if ($("dem-precedent")) $("dem-precedent").onclick = async () => { lire(); dem.i--; await demarrage(); };
    $("dem-plus-tard").onclick = () => { try { localStorage.setItem("renom-demarrage-plus-tard:" + c.id, "1"); } catch (er) {} dem.pour = null; aller("accueil"); };
  }

  // ---- Réponses aux commentaires ----------------------------------------------------------------------------------
  // Écran du groupe « Réputation ». Instagram et Facebook (offres Croissance et Signature). Classement et réponse proposés par RENOM, décision du
  // commerçant ; un commentaire sensible n'est jamais traité par RENOM. Publication par l'API de Meta, ou par l'équipe tant que l'accès n'est pas accordé.
  const CO = window.RENOM_COMMENTAIRES;
  const CM_CATEGORIES = I.carte("cm.cat", Object.keys(CO.CATEGORIES)), CM_ETATS = I.carte("cm.etat", Object.keys(CO.ETATS));
  const rangCommentaire = x => x.statut === "a_valider" ? 0 : x.statut === "humain" ? 1 : ["valide", "a_publier_main"].includes(x.statut) ? 2 : x.statut === "publie" ? 3 : 4;
  const texteCommentaire = x => x.efface_le ? `<p class="note efface">${t("cm.efface")}</p>`
    : x.texte ? `<p class="citation"${lc()}>${t("guillemets", { x: e(x.texte) })}</p>` : `<p class="citation">${t("cm.sans.texte")}</p>`;
  const lienPublication = x => x.lien ? `<a href="${e(x.lien)}" target="_blank" rel="noopener">${t("cm.ouvrir.sur", { res: CO.RESEAUX[x.reseau] || t("cm.le.reseau") })}</a>` : "";
  function corpsCommentaire(x) {
    const reseau = CO.RESEAUX[x.reseau] || e(x.reseau), sensible = x.statut === "humain" || x.categorie === "sensible";
    let suite = "";
    if (x.statut === "a_valider") suite = `${(x.refus || []).length && !x.reponse_proposee ? `<p class="note">${t("cm.ecartee", { r: e(raisonsTexte(x.refus)) })}</p>` : ""}
      <div class="f"><label for="cm-${e(x.id)}">${t("rep.proposee")}</label><textarea id="cm-${e(x.id)}" class="haut-texte" maxlength="${CO.LIMITE}" data-texte-c${lc()}>${e(x.reponse_proposee || "")}</textarea></div>
      <div class="actions"><button type="button" class="bouton" data-c="valide">${t("cm.valider")}</button><button type="button" class="lien" data-c="ignore">${t("cm.ne.pas.repondre")}</button></div>`;
    else if (x.statut === "humain") suite = `<div class="encart" role="alert"><p class="fort">${t("cm.sensible")}${(x.raisons || []).length ? t("deux.points") + e(raisonsTexte(x.raisons)) : ""}.</p>
      <p>${t("cm.sensible.texte", { res: reseau })}</p></div>
      <div class="actions"><button type="button" class="bouton second" data-c="clos">${t("cm.traite")}</button>${lienPublication(x)}</div>`;
    else if (x.statut === "valide" || x.statut === "a_publier_main") suite = `<p class="reponse"><span class="fort">${t("avis.rep.validee")}</span> <span${lc()}>${e(x.reponse_proposee || "")}</span></p>
      <p class="note">${t(x.statut === "a_publier_main" ? "cm.publiee.equipe" : "cm.publication.cours")}</p>`;
    else if (x.statut === "publie") suite = `<p class="reponse"><span class="fort">${t(x.publie_par === "equipe" ? "cm.rep.equipe" : x.decision === "publication_automatique" ? "avis.rep.auto" : "cm.rep.publiee")}</span> <span${lc()}>${e(x.reponse || x.reponse_proposee || "")}</span></p>`;
    else if (x.statut === "ignore") suite = `<p class="note">${t(x.categorie === "spam" ? "cm.spam" : "cm.choisi.pas")}</p>`;
    else if (x.statut === "clos") suite = `<p class="note">${t("cm.traite.par.vous")}</p>`;
    return `<div class="carte-tete"><p class="fort">${reseau} · ${CM_CATEGORIES[x.categorie] || e(x.categorie)}</p><p class="etat${x.statut === "a_valider" || sensible && x.statut === "humain" ? " actif" : ""}">${CM_ETATS[x.statut] || e(x.statut)}</p></div>
      ${texteCommentaire(x)}<p class="note">${x.auteur && !x.efface_le ? e(x.auteur) + " · " : ""}${t("recu.le", { d: date(x.cree_le) })}</p>${suite}`;
  }
  function brancherCommentaires(racine, apres) {
    racine.querySelectorAll("[data-commentaire]").forEach(a => a.addEventListener("click", async ev => {
      const b = ev.target.closest("[data-c]"); if (!b) return; const d = b.dataset.c, ta = a.querySelector("[data-texte-c]");
      try {
        await D.deciderCommentaire(a.dataset.commentaire, d, d === "valide" && ta ? ta.value : null); await apres(); majCompteurs();
        msg(t(d === "valide" ? "cm.validee.msg" : d === "ignore" ? "cm.ignore.msg" : "enregistre"));
      } catch (er) { msg(ph(er.message)); }
    }));
  }
  async function commentaires() {
    const [c, k, l0] = await Promise.all([D.commerce(), D.compteur(), D.commentaires().catch(() => [])]);
    const titre = entete(t("cm.sur"), t("ecran.commentaires"), t("cm.chapo"));
    if (!k.commentaires_inclus) {
      vue.innerHTML = `${titre}<section class="carte"><h2>${t("cm.offre.titre")}</h2>
        <p class="texte2 lecture">${t("cm.offre.texte")}</p><p class="pied"><a href="#/offre">${t("acc.voir.offre")}</a></p></section>`;
      return;
    }
    const l = l0.map((x, i) => [x, i]).sort((a, b) => rangCommentaire(a[0]) - rangCommentaire(b[0]) || a[1] - b[1]).map(x => x[0]);
    const visibles = l.filter(x => !(x.statut === "ignore" && x.categorie === "spam")), spams = l.filter(x => x.statut === "ignore" && x.categorie === "spam");
    vue.innerHTML = `${pauseBandeau(c)}${titre}<p class="msg" id="msg" role="status"></p>
      <div class="colonnes">
        <div class="pile">${visibles.length ? visibles.map(x => `<article class="carte avis${x.statut === "humain" ? " attention" : ""}" data-commentaire="${e(x.id)}">${corpsCommentaire(x)}</article>`).join("")
          : `<section class="carte"><h2>${t("cm.vide.titre")}</h2><p class="texte2">${t("cm.vide.texte")}</p></section>`}
          ${spams.length ? `<details class="carte"><summary>${t("cm.spams", { n: spams.length })}</summary><div class="pile">${spams.map(x => `<div data-commentaire="${e(x.id)}">${corpsCommentaire(x)}</div>`).join("")}</div></details>` : ""}</div>
        <div class="pile">
          <section class="carte"><h2>${t("reglage")}</h2><form id="f-cm">
            <label class="option"><input type="checkbox" id="cm-auto"${c.commentaires_compliments_auto ? " checked" : ""}><span>${t("cm.auto")}</span></label>
            <p class="aide">${t("cm.auto.aide")}</p>
            <div class="actions"><button class="bouton second petit" type="submit">${t("enregistrer")}</button></div></form></section>
          <section class="carte"><h2>${t("cm.comment")}</h2><ul class="liste">
            <li>${t("cm.c1")}</li>
            <li>${t("cm.c2")}</li>
            <li>${t("cm.c3")}</li>
            <li>${t("cm.c4")}</li>
            <li>${t("cm.c5")}</li></ul>
            <p class="note pied">${t("cm.ce.mois", { n: +k.commentaires_repondus || 0 })}</p></section>
        </div>
      </div>`;
    $("f-cm").onsubmit = async ev => { ev.preventDefault(); try { await D.enregistrer({ commentaires_compliments_auto: $("cm-auto").checked }); msg(t($("cm-auto").checked ? "cm.reglage.auto" : "cm.reglage.accord")); } catch (er) { msg(ph(er.message)); } };
    brancherCommentaires(vue, commentaires);
  }
  // ---- fin du bloc Réponses aux commentaires -----------------------------------------------------------------------

  // ---- Vidéo d'avis ------------------------------------------------------------------------------------------------
  // Écran du groupe « Créer » : choisir 2 à 4 avis, un fond, un style ; la vidéo arrive dans « Contenus », à valider.
  // Tout ce qui concerne la vidéo d'avis est dans ce bloc (écran, entrée de menu, libellés du journal) ; les règles sont dans donnees.js.
  const VA = window.RENOM_VIDEO_AVIS;
  GROUPES.find(g => g.id === "creer").ecrans.push("videoavis"); ECRANS.videoavis = t("ecran.videoavis");
  Object.assign(ETAPES, I.carte("etape", ["VIDEO_AVIS", "VIDEO_AVIS_DEMANDEE", "VIDEO_AVIS_REFUSEE", "DEPOT_VIDEO", "DEPOT_VIDEO_ANNULE", "MONTAGE", "MONTAGE_RELANCE", "RUSHES_A_EFFACER", "RUSHES_EFFACES", "MUSIQUE_PLATEFORME_NON_POSEE", "MUSIQUE_PLATEFORME_POSEE"]));
  const ST_VA = I.carte("va.st", ["a_traiter", "en_cours", "traitee", "refusee"]);
  // Noms des styles et des fonds : ceux de donnees.js (égalité testée avec le moteur), traduits à l'affichage d'après leur identifiant.
  const vaNomStyle = s => I.ou("va.style." + s.id, s.nom), vaFond = f => ({ nom: I.ou("va.fond." + f.id, f.nom), note: I.ou("va.fond.note." + f.id, f.note) });
  const va = { choisis: [], fond: null, style: "franc", veille: null };
  // Figtree de l'aperçu : la version variable du moteur (« Figtree Variable », style.css), pas les fichiers statiques de l'interface.
  const vaPolice = p => `font-family:'${p[0] === "Figtree" ? "Figtree Variable" : p[0]}',system-ui,sans-serif;font-variation-settings:${p[1]}`;
  // Même calcul de contraste que le moteur (gabarits.py) : le texte de l'aperçu prend la couleur que la vidéo prendra.
  const vaLum = h => { const v = parseInt(h.slice(1), 16), f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(v >> 16) + 0.7152 * f((v >> 8) & 255) + 0.0722 * f(v & 255); };
  const vaContraste = (a, b) => { const [x, y] = [vaLum(a), vaLum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  // Étoiles dessinées (formes), jamais un caractère : pleines jusqu'à la note, en contour ensuite.
  const vaEtoiles = n => `<svg class="va-etoiles" viewBox="0 0 116 20" role="img" aria-label="${etoiles(n)}">${[0, 1, 2, 3, 4].map(i => `<path transform="translate(${i * 24})" d="M10 1.2l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L1.4 7.5l6-.8z" ${i < n ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.3"'}></path>`).join("")}</svg>`;
  const vaDemande = x => { const f = VA.FONDS.find(y => y.id === x.fond), s = VA.STYLES.find(y => y.id === x.style);
    return `<li><div><p class="fort">${t("va.dem.resume", { n: x.avis_ids.length, fond: e(f ? vaFond(f).nom : x.fond), style: e(s ? vaNomStyle(s) : x.style) })}</p><p class="note">${t("va.dem.quand", { jour: I.minusculeDebut(jourRelatif(x.cree_le)), h: heure(x.cree_le) })}${x.demo ? t("va.rendu.simule") : ""}</p>
      ${x.statut === "refusee" && x.motif ? `<p class="note">${t("va.motif")}${e(ph(x.motif))}</p>` : ""}${x.statut === "traitee" ? `<p class="note"><a class="lien-seul" href="#/contenus">${t("va.a.valider")}</a></p>` : ""}</div><span class="etat${x.statut === "a_traiter" || x.statut === "en_cours" ? " actif" : ""}">${ST_VA[x.statut] || e(x.statut)}</span></li>`; };
  const vaQuota = k => t("va.quota", { a: k.videos_utilisees, b: k.videos_plafond });
  async function vaSuivre() {
    // Tant qu'une demande attend son rendu, on relit son état toutes les deux secondes, sans redessiner l'écran (la sélection reste).
    clearTimeout(va.veille); if (route !== "videoavis" || !$("va-demandes")) return;
    const [dm, k] = await Promise.all([D.demandesVideoAvis(), D.compteur()]);
    $("va-demandes").innerHTML = dm.length ? `<ul class="liste">${dm.slice(0, 6).map(vaDemande).join("")}</ul>` : `<p class="texte2">${t("va.aucune.demande")}</p>`;
    if ($("va-quota")) $("va-quota").innerHTML = vaQuota(k);
    majCompteurs();
    if (dm.some(x => x.statut === "a_traiter" || x.statut === "en_cours")) va.veille = setTimeout(() => vaSuivre().catch(() => {}), 2000);
  }
  async function videoAvis() {
    const [c, k, tous, ph_] = await Promise.all([D.commerce(), D.compteur(), D.avisVideo(), D.photos()]);
    const titre = entete(t("groupe.creer"), t("ecran.videoavis"), t("va.chapo"));
    if (!k.videos_plafond) {
      vue.innerHTML = `${pauseBandeau(c)}${titre}<section class="carte"><h2>${t("va.offre.titre")}</h2>
        <p class="texte2 lecture">${t("va.offre.texte", { nom: e(k.offre_nom) })}</p><p class="pied"><a href="#/offre">${t("acc.voir.offre")}</a></p></section>`;
      return;
    }
    const motifs = new Map(tous.map(a => [a.id, VA.motif(a)])), bons = tous.filter(a => !motifs.get(a.id)), autres = tous.filter(a => motifs.get(a.id));
    va.choisis = va.choisis.filter(id => bons.some(a => a.id === id));
    if (!va.fond || (va.fond === "photos" && !ph_.length)) va.fond = ph_.length ? "photos" : "uni";
    const co = c.couleurs || {};
    vue.innerHTML = `${pauseBandeau(c)}${titre}
      <div class="colonnes va">
        <div class="pile">
          <section class="carte"><div class="carte-tete"><h2>${t("va.avis.titre")}</h2><span class="note" id="va-compte"></span></div>
            <p class="note">${t("va.avis.note")}</p>
            <p class="note" id="va-30-jours">${t("va.30.jours")}</p>
            ${bons.length ? `<ul class="liste va-avis">${bons.map(a => `<li><label class="option va-choix"><input type="checkbox" name="va-avis" value="${e(a.id)}"${va.choisis.includes(a.id) ? " checked" : ""}>
              <span class="va-texte"><span class="fort">${e(a.auteur)} · ${etoiles(a.note)}</span><span class="citation"${lc()}>${t("guillemets.insec", { x: e(a.texte) })}</span>
              <span class="note">${t("va.car", { n: VA.longueur(a.texte), lim: VA.LIMITE })}<span data-rang></span></span></span></label></li>`).join("")}</ul>`
            : `<p class="texte2">${t("va.aucun.avis")}</p>`}
            ${autres.length ? `<details class="va-refus"><summary>${t("va.non.proposes", { n: autres.length })}</summary><ul class="liste">${autres.map(a => `<li><div><p class="fort">${e(a.auteur || t("va.auteur.inconnu"))} · ${etoiles(a.note)}</p><p class="citation"${lc()}>${t("guillemets.insec", { x: e(cut(a.texte || "", 140)) })}</p><p class="note">${e(ph(motifs.get(a.id)))}</p></div></li>`).join("")}</ul></details>` : ""}
          </section>
          <section class="carte"><h2>${t("va.fond.titre")}</h2><fieldset><legend class="vh">${t("va.fond.legend")}</legend>
            ${VA.FONDS.map(f0 => { const f = { ...f0, ...vaFond(f0) }, sans = f.id === "photos" && !ph_.length; return `<label class="option va-choix"><input type="radio" name="va-fond" value="${f.id}"${va.fond === f.id ? " checked" : ""}${sans ? " disabled" : ""}><span class="va-texte"><span>${f.nom}${sans ? t("va.sans.photo") : ""}</span><span class="note">${f.note}</span></span></label>`; }).join("")}</fieldset></section>
          <section class="carte"><h2>${t("va.typo.titre")}</h2><p class="note">${t("va.typo.note")}</p>
            <fieldset class="va-styles"><legend class="vh">${t("va.typo.legend")}</legend>${VA.STYLES.map(s => `<label class="va-style"><input class="vh" type="radio" name="va-style" value="${s.id}"${va.style === s.id ? " checked" : ""}>
              <span class="va-style-nom" style="${vaPolice(s.titre)}">${vaNomStyle(s)}</span><span class="va-style-ex" style="${vaPolice(s.texte)}">${t("va.typo.exemple")}</span></label>`).join("")}</fieldset></section>
        </div>
        <div class="pile">
          <section class="carte"><div class="carte-tete"><h2>${t("va.apercu")}</h2><span class="note">${t("va.indicatif")}</span></div>
            <div class="va-apercu" id="va-apercu"></div>
            <p class="note">${t("va.apercu.note")}</p></section>
          <section class="carte"><h2>${t("va.creer.titre")}</h2><p class="texte2" id="va-quota">${vaQuota(k)}</p>
            <p class="note">${t("va.creer.note")}</p>
            <div class="actions"><button type="button" class="bouton" id="va-creer">${t("va.creer")}</button></div><p class="msg" id="msg" role="status"></p></section>
          <section class="carte"><h2>${t("va.demandes")}</h2><div id="va-demandes"></div></section>
        </div>
      </div>`;
    const cases = [...vue.querySelectorAll("input[name=va-avis]")];
    const maj = () => {
      const n = va.choisis.length, premier = bons.find(a => a.id === va.choisis[0]), s = VA.STYLES.find(x => x.id === va.style) || VA.STYLES[0];
      $("va-compte").textContent = t("va.compte", { n, max: VA.MAX });
      cases.forEach(i => { i.disabled = !i.checked && n >= VA.MAX; const r = va.choisis.indexOf(i.value); i.closest("label").querySelector("[data-rang]").textContent = r < 0 ? "" : t("va.position", { n: r + 1 }); });
      $("va-creer").disabled = n < VA.MIN || !!c.en_pause;
      if (!$("msg").dataset.fixe) msg(n < VA.MIN ? t("va.cocher", { min: VA.MIN, n }) : "");
      // Aperçu : couleurs de la fiche pour un fond uni ; pour les photos, un fond sombre neutre tient lieu de photo assombrie.
      const hex = (x, d) => /^#[0-9a-f]{6}$/i.test(x || "") ? x : d, accent = hex(co.accent, "#2438FF");
      const fond = va.fond === "photos" ? "#26282E" : va.fond === "accent" ? accent : hex(co.fond, "#FFFFFF");
      const encre = va.fond === "photos" ? "#FFFFFF" : [hex(co.texte, "#000000"), hex(co.fond, "#FFFFFF"), "#000000", "#FFFFFF"].find(x => vaContraste(x, fond) >= 4.5) || "#000000";
      const etoile = va.fond === "uni" && vaContraste(accent, fond) >= 3 ? accent : encre;
      const texte = premier ? premier.texte : t("va.apercu.vide"), taille = Math.max(13, Math.min(21, 21 - (VA.longueur(texte) - 60) / 22));
      const ap = $("va-apercu"); ap.style.background = fond; ap.style.color = encre;
      ap.innerHTML = `<p class="va-ap-nom" style="${vaPolice(s.auteur)}">${e(c.nom)}</p><div class="va-ap-centre"><span style="color:${etoile}">${vaEtoiles(premier ? premier.note : 5)}</span>
        <p class="va-ap-texte" style="${vaPolice(s.texte)};font-size:${taille.toFixed(1)}px"${premier ? lc() : ""}>${e(texte)}</p><p class="va-ap-auteur" style="${vaPolice(s.auteur)}">${premier ? e(premier.auteur) : ""}</p></div>`;
    };
    cases.forEach(i => i.onchange = () => { delete $("msg").dataset.fixe; if (i.checked) va.choisis.push(i.value); else va.choisis = va.choisis.filter(x => x !== i.value); maj(); });
    vue.querySelectorAll("input[name=va-fond]").forEach(i => i.onchange = () => { va.fond = i.value; maj(); });
    vue.querySelectorAll("input[name=va-style]").forEach(i => i.onchange = () => { va.style = i.value; maj(); });
    $("va-creer").onclick = async () => {
      try {
        $("va-creer").disabled = true; await D.demanderVideoAvis({ avis_ids: va.choisis, fond: va.fond, style: va.style });
        va.choisis = []; await videoAvis(); $("msg").dataset.fixe = "1"; msg(t("va.enregistree"));
      } catch (er) { $("msg").dataset.fixe = "1"; msg(ph(er.message)); $("va-creer").disabled = va.choisis.length < VA.MIN; }
    };
    maj(); await vaSuivre();
  }
  // ---- fin du bloc Vidéo d'avis ------------------------------------------------------------------------------------

  // ---- Votre style (kit de marque) ---------------------------------------------------------------------------------
  // Le style est créé par RENOM (console, panneau « Style du commerce ») à partir du logo et des photos. Écran du groupe « Mon commerce » :
  // le style montré sur les photos du commerce (aperçus des 3 gabarits), le logo à déposer, « Ça me plaît », « Je voudrais un changement »,
  // et les expressions maison / à éviter en option repliée. Aucune couleur, police ni ambiance à choisir ici.
  // Tant que rien n'est validé, les contenus partent avec le style proposé. Écran partagé avec la console : marque.js, fonction ecran.
  const MQ = window.RENOM_MARQUE;
  GROUPES.find(g => g.id === "commerce").ecrans.splice(1, 0, "style"); ECRANS.style = t("ecran.style");
  Object.assign(ETAPES, I.carte("etape", ["MARQUE_PROPOSEE", "MARQUE_ENREGISTREE", "MARQUE_VALIDEE", "MARQUE_REGLEE_RENOM", "MARQUE_VALIDEE_RENOM", "STYLE_CHANGEMENT_DEMANDE",
    "MARQUE_APERCUS", "LOGO_ILLISIBLE", "VIDEO_GENEREE_REFUSEE"]));
  const styleEcran = MQ.ecran({ vue, I, mode: "commercant", entete: () => entete(t("sty.sur"), t("ecran.style"), t("sty.chapo")),
    commerce: () => D.commerce(), marque: () => D.marque(), deposerLogo: f => D.deposerLogo(f),
    regler: (p, v) => D.reglerMaMarque(p, v), demander: x => D.demanderChangementStyle(x), apres: async () => majCompteurs() });
  // Carte de l'accueil : « Votre style est prêt » quand RENOM l'a validé, « Nous créons votre style » avant ; rien une fois que le commerçant l'a validé.
  const carteStyle = c => {
    const m = c.marque, pret = !!(m && m.verrouille && m.valide_par === "renom");
    if (m && m.verrouille && !pret) return "";
    const k = pret ? "acc.style.pret" : "acc.style";
    return `<section class="carte style-accueil" id="carte-style" aria-labelledby="carte-style-titre"><div class="style-accueil-corps">
      <div><h2 id="carte-style-titre">${t(k + ".titre")}</h2><p class="texte2">${t(k + ".texte")}</p></div>
      ${m && m.couleurs ? `<div class="style-nuancier" aria-hidden="true">${["principale", "secondaire", "fond", "texte"].map(x => `<span style="background:${e(m.couleurs[x])}"></span>`).join("")}</div>` : ""}</div>
      <p class="pied"><a class="bouton" href="#/style">${t("acc.style.bouton")}</a></p></section>`;
  };
  const style = () => styleEcran.rendre();
  // ---- fin du bloc Votre style ------------------------------------------------------------------------------------

  // ---------------- Routage
  const ROUTES = { connexion, accueil, resultats, fiche, photos, contenus, calendrier, avis, commentaires, collecte, fichegoogle: ficheGoogle, comptes, offre, notifications, demarrage, videoavis: videoAvis, style };
  const aller = r => { if (location.hash === "#/" + r) rendre(); else location.hash = "#/" + r; };
  let derniere = null, langueLue = null;
  async function rendre() {
    const r = (location.hash.replace("#/", "") || "accueil").split("?")[0], s = await D.session();
    // Ancienne adresse (par exemple #/idees) : remplacée par la nouvelle, sans ajouter d'étape dans l'historique.
    if (ANCIENNES[r]) { if (r === "idees") ideesOuvertes = true; history.replaceState(null, "", "#/" + ANCIENNES[r]); return rendre(); }
    if (!s) { connecte = false; derniere = null; dessinerNav(); return connexion(); }
    if (s.role === "administrateur" && D.mode === "demo" && !/(\?|&)voir\b/.test(location.search)) { location.href = I.lien("console.html"); return; }
    // Langue : sans choix explicite (?lang= ou sélecteur), l'espace prend celle du commerce (la page se recharge une fois si elle change).
    if (s.role !== "administrateur" && langueLue !== s.email) {
      try { const c = await D.commerce(); langueCommerce = I.langueValide(c && c.langue) || "fr"; langueLue = s.email; if (I.depuisCommerce(langueCommerce)) return; } catch (er) {}
    }
    connecte = true; route = ECRANS[r] ? r : "accueil"; dessinerNav();
    if (derniere !== route) { filtre = null; window.scrollTo(0, 0); if (route !== "contenus") ideesOuvertes = false; } derniere = route;
    ecranCourant = ROUTES[route];
    try { await ROUTES[route](); } catch (er) { vue.innerHTML = `<section class="carte"><h1>${t("souci")}</h1><p>${e(ph(er.message))}</p></section>`; }
    vue.focus({ preventScroll: true }); majCompteurs();
  }
  document.addEventListener("click", async ev => { if (ev.target.closest("#sortir")) { await D.quitter(); aller("accueil"); } });
  document.querySelectorAll("[data-o]").forEach(b => b.onclick = async () => { await D.outilsDemo[b.dataset.o](); rendre(); });
  large.addEventListener("change", () => { dessinerNav(); majCompteurs(); });
  window.addEventListener("hashchange", rendre); rendre();
  // Application installable : service worker (fichiers statiques de l'espace seulement, réseau d'abord pour la page et les scripts : voir sw.js).
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });
})();
