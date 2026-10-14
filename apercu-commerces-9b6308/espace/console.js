(function () {
  const D = window.RENOM_DATA, $ = id => document.getElementById(id), vue = $("vue");
  // Textes, dates et nombres : espace/web/i18n.js (français ou anglais).
  const I = window.RENOM_I18N, t = I.t, ph = I.phrase;
  const e = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const msg = x => { const m = $("msg"); if (m) m.textContent = x; };
  const dh = I.dateHeureCourte;
  const METIERS = I.carte("metier", ["restaurant", "beaute", "sport", "autre"]);
  const INVITATION = I.carte("con.inv", ["a_envoyer", "envoyee", "acceptee", "echec"]);
  const OFFRES = window.RENOM_OFFRES;
  $("demo").hidden = D.mode !== "demo";
  const entete = (titre, texte) => `<div class="entete"><p class="sur">${t("con.sur")}</p><h1>${titre}</h1>${texte ? `<p class="chapo">${texte}</p>` : ""}</div>`;

  // ---------------- Navigation : barre latérale sur ordinateur, onglets du bas sur téléphone
  const trait = d => `<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ENTREES = [
    ["commerces", t("con.entree.commerces"), trait('<path d="M4 10l1.5-5h13L20 10"></path><path d="M5 10v10h14V10"></path><path d="M4 10h16M10 20v-5h4v5"></path>')],
    ["prospects", t("con.entree.prospects"), trait('<circle cx="9" cy="8" r="3.5"></circle><path d="M3 20c.8-3.6 3.2-5.5 6-5.5s5.2 1.9 6 5.5"></path><path d="M16 6.5h5M18.5 4v5"></path>')],
    ["alertes", t("con.entree.alertes"), trait('<path d="M6 16v-5a6 6 0 0112 0v5l1.5 2.5h-15z"></path><path d="M10 21h4"></path>')],
    ["apublier", t("con.entree.apublier"), trait('<path d="M5 12h11"></path><path d="M12 6l6 6-6 6"></path><path d="M5 5v14"></path>')],
    ["journal", t("con.entree.journal"), trait('<path d="M9 7h10M9 12h10M9 17h10M5 7h.01M5 12h.01M5 17h.01"></path>')],
    ["invitations", t("con.entree.invitations"), trait('<rect x="4" y="6" width="16" height="12" rx="2"></rect><path d="M4 8l8 6 8-6"></path>')],
    ["creer", t("con.entree.creer"), trait('<circle cx="12" cy="12" r="8"></circle><path d="M12 8.5v7M8.5 12h7"></path>')],
  ];
  const large = window.matchMedia("(min-width: 900px)"); let route = "commerces", connecte = false;
  function dessinerNav() {
    document.body.classList.toggle("hors-session", !connecte);
    const lat = $("lat"), haut = $("haut"), onglets = $("onglets"); lat.innerHTML = haut.innerHTML = onglets.innerHTML = "";
    if (!connecte) return;
    const lien = ([r, nom, icone], avecIcone) => `<a href="#/${r}" data-r="${r}"${r === route ? ' aria-current="page"' : ""}>${avecIcone ? `<span class="onglet-icone">${icone}</span>` : ""}<span>${nom}</span></a>`;
    if (large.matches) lat.innerHTML = `<div class="lat-in"><a class="logo" href="${I.lien("console.html")}">RENOM</a><nav id="nav" class="menu" aria-label="${t("con.titre")}"><div class="groupe"><p class="groupe-lib">${t("con.titre")}</p>${ENTREES.map(x => lien(x, false)).join("")}</div></nav><div class="lat-pied">${I.selecteur()}<button type="button" id="sortir" class="quitter">${t("quitter")}</button></div></div>`;
    else { haut.innerHTML = `<a class="logo" href="${I.lien("console.html")}">RENOM</a><span class="haut-note">${t("con.titre")}</span>${I.selecteur()}<button type="button" id="sortir" class="quitter">${t("quitter")}</button>`; onglets.innerHTML = ENTREES.map(x => lien(x, true)).join("");
      // La barre défile horizontalement : l'onglet ouvert reste visible.
      const a = onglets.querySelector("[aria-current]"); if (a) onglets.scrollLeft = a.offsetLeft - (onglets.clientWidth - a.offsetWidth) / 2; }
  }

  async function refuse() { connecte = false; dessinerNav(); vue.innerHTML = `<div class="connexion"><div class="carte"><div class="connexion-tete"><p class="logo">RENOM</p>${I.selecteur()}</div><div class="entete"><h1>${t("con.refuse.titre")}</h1><p class="chapo">${t("con.refuse.texte")}</p></div><a class="bouton second plein" href="${I.lien("index.html")}">${t("con.retour.espace")}</a></div></div>`; }
  async function connexion() {
    connecte = false; dessinerNav();
    // Démonstration : l'adresse de l'administrateur vient de la graine chargée (parcours ou graine publique).
    const admins = D.mode === "demo" && D.comptesDemo ? (await D.comptesDemo()).filter(x => x.role === "administrateur").map(x => x.email) : [];
    vue.innerHTML = `<div class="connexion"><div class="carte"><div class="connexion-tete"><p class="logo">RENOM</p>${I.selecteur()}</div><div class="entete"><h1>${t("con.titre")}</h1><p class="chapo">${t("con.connexion")}</p></div>
      <form id="f"><div class="f"><label for="email">${t("cx.email")}</label><input id="email" type="email" autocomplete="email" required></div><button class="bouton plein" type="submit">${t("cx.recevoir")}</button><p class="msg" id="msg" role="status"></p></form>
      ${admins.length ? `<p class='note'>${t("con.demo", { l: e(admins.join(", ")) })}</p>` : ""}</div><p class="retour"><a href="${I.lien("index.html")}">${t("con.retour")}</a></p></div>`;
    $("f").onsubmit = async ev => { ev.preventDefault(); try { const r = await D.envoyerLien($("email").value); if (D.mode === "demo") { await D.ouvrirLien(r.lien); rendre(); } else msg(t("con.envoye")); } catch (er) { msg(ph(er.message)); } };
  }

  // Score de santé (automatisations de service) : niveau en toutes lettres et raisons en clair. Règles : fonction SQL sante_de (schema.sql), les mêmes en démonstration.
  const NIVEAUX = I.carte("con.niveau", ["vert", "orange", "rouge"]), RANG = { rouge: 0, orange: 1, vert: 2 };
  const COURT = I.carte("con.court", ["compte", "google", "metricool", "demarrage"]);
  const sante = s => s ? `<p><span class="sante sante-${e(s.niveau)}">${NIVEAUX[s.niveau] || e(s.niveau)}</span></p>${s.raisons.length ? `<ul class="raisons">${s.raisons.map(r => `<li>${e(ph(r))}</li>`).join("")}</ul>` : `<p class="note">${t("con.rien.signaler")}</p>`}` : `<p class="note">${t("con.non.calcule")}</p>`;
  const miseEnRoute = s => { const m = s && s.mise_en_route; if (!m) return ""; const reste = m.points.filter(x => x.etat !== "fait");
    return `<p>${t("sur", { a: m.faits, b: m.total })}</p>${reste.map(x => `<p class="note">${COURT[x.point] || e(x.point)}${t("deux.points")}${t(x.etat === "declare" ? "con.mer.declare" : "con.mer.afaire")}</p>${["google", "metricool"].includes(x.point) ? `<button type="button" class="bouton second petit" data-mer="${e(x.point)}">${t("con.verifie", { x: x.point === "google" ? "Google" : "Metricool" })}</button>` : ""}`).join("")}`; };
  async function commerces() {
    const l = (await D.adminCommerces()).sort((a, b) => (RANG[(a.sante || {}).niveau] ?? 3) - (RANG[(b.sante || {}).niveau] ?? 3) || a.nom.localeCompare(b.nom));
    const C = k => t("con.col." + k);
    vue.innerHTML = `${entete(t("con.entree.commerces"), t("con.commerces.chapo"))}<p class="msg" id="msg" role="status"></p><section class="carte tableau"><table class="tab"><thead><tr><th>${C("commerce")}</th><th>${C("sante")}</th><th>${C("mer")}</th><th>${C("offre")}</th><th>${C("mois")}</th><th>${C("comptes")}</th><th>${C("alertes")}</th><th>${C("etat")}</th></tr></thead><tbody>${l.map(c => {
      const k = c.compteur || {}, cc = Object.values(c.comptes || {}).filter(x => x.etat === "connecte").length;
      return `<tr data-id="${e(c.id)}"><td data-l="${C("commerce")}"><p class="fort">${e(c.nom)}</p><p class="note">${e(METIERS[c.metier] || "")}${c.ville ? ", " + e(c.ville) : ""}</p></td>
        <td data-l="${C("sante")}">${sante(c.sante)}</td><td data-l="${C("mer")}">${miseEnRoute(c.sante)}</td>
        <td data-l="${C("offre")}"><div class="pile serre"><select data-offre aria-label="${t("con.offre.de", { nom: e(c.nom) })}">${Object.entries(OFFRES).map(([k2, o]) => `<option value="${k2}"${c.offre_id === k2 ? " selected" : ""}>${o.nom}</option>`).join("")}</select><button type="button" class="bouton second petit" data-a="offre">${t("con.changer.offre")}</button></div></td>
        <td data-l="${C("mois")}"><p>${t("con.pub.sur", { a: k.publications_utilisees, b: k.publications_plafond })}</p><p>${t("con.vid.sur", { a: k.videos_utilisees, b: k.videos_plafond })}</p></td><td data-l="${C("comptes")}">${t("con.connectes", { n: cc })}</td><td data-l="${C("alertes")}"><span class="${c.alertes ? "fort" : ""}">${c.alertes}</span></td>
        <td data-l="${C("etat")}"><div class="pile serre"><span class="etat${c.en_pause ? "" : " actif"}">${t(c.en_pause ? "con.en.pause" : "con.actif")}</span><button type="button" class="bouton second petit" data-a="pause">${t(c.en_pause ? "con.reprendre" : "con.pause")}</button></div></td></tr>`; }).join("")}</tbody></table></section>`;
    vue.querySelectorAll("tr[data-id]").forEach(tr => tr.addEventListener("click", async ev => {
      const b = ev.target.closest("[data-a]"); if (!b) return; const id = tr.dataset.id, c = l.find(x => x.id === id);
      try { if (b.dataset.a === "offre") await D.adminOffre(id, tr.querySelector("[data-offre]").value); else await D.adminPause(id, !c.en_pause); await commerces(); msg(t("enregistre")); } catch (er) { msg(ph(er.message)); }
    }));
    vue.querySelectorAll("[data-mer]").forEach(b => b.onclick = async () => { try { await D.adminMiseEnRoute(b.closest("tr").dataset.id, b.dataset.mer, "fait"); await commerces(); msg(t("enregistre")); } catch (er) { msg(ph(er.message)); } });
  }
  // ---------------- Prospects (audit gratuit de la page de vente) : relances J+2, J+5, J+10 envoyées par le service du jour
  const ECHEANCES = [2, 5, 10], JOUR = 86400000;
  const jourCourt = I.jourMoisCourt;
  function etatProspect(p) {
    if (p.desinscrit_le) return [t("con.p.arrete"), t("con.p.arrete.det", { d: jourCourt(p.desinscrit_le) })];
    if (p.rdv_le) return [t("con.p.rdv"), t("con.p.le", { d: jourCourt(p.rdv_le) })];
    if (p.repondu_le) return [t("con.p.repondu"), t("con.p.repondu.det", { d: jourCourt(p.repondu_le) })];
    if (!p.rapport_envoye_le) return [t("con.p.pas.envoye"), t("con.p.pas.envoye.det")];
    if (p.relances >= 3) return [t("con.p.finies"), t("con.p.finies.det")];
    return [t("con.p.en.relance"), t("con.p.relance.det", { n: p.relances, d: jourCourt(new Date(p.rapport_envoye_le).getTime() + ECHEANCES[p.relances] * JOUR) })];
  }
  async function prospects() {
    const l = await D.adminProspects(), C = k => t("con.col." + k);
    vue.innerHTML = `${entete(t("con.entree.prospects"), t("con.prospects.chapo"))}
      <p class="msg" id="msg" role="status"></p>${l.length ? `<section class="carte tableau"><table class="tab"><thead><tr><th>${C("prospect")}</th><th>${C("audit")}</th><th>${C("relances")}</th><th>${C("actions")}</th></tr></thead><tbody>${l.map(p => { const [et, det] = etatProspect(p);
        const fini = p.desinscrit_le || p.rdv_le;
        return `<tr data-id="${e(p.id)}"><td data-l="${C("prospect")}"><p class="fort">${e(p.commerce || t("con.non.nomme"))}</p><p class="note casse">${e(p.email)}</p></td><td data-l="${C("audit")}">${p.audit_le ? jourCourt(p.audit_le) : ""}</td>
          <td data-l="${C("relances")}"><p class="fort">${et}</p><p class="note">${det}</p></td>
          <td data-l="${C("actions")}"><div class="pile serre">${fini ? "" : `${!p.rapport_envoye_le ? `<button type="button" class="bouton second petit" data-p="rapport_envoye">${t("con.rapport.envoye")}</button>` : ""}<button type="button" class="bouton second petit" data-p="rdv">${t("con.rdv")}</button>${!p.repondu_le ? `<button type="button" class="bouton second petit" data-p="reponse">${t("con.a.repondu")}</button>` : ""}<button type="button" class="lien" data-p="arreter">${t("con.arreter")}</button>`}</div></td></tr>`; }).join("")}</tbody></table></section>`
      : `<section class="carte"><p class="texte2">${t("con.aucun.prospect")}</p></section>`}`;
    vue.querySelectorAll("[data-p]").forEach(b => b.onclick = async () => { try { await D.adminProspect(b.closest("tr").dataset.id, b.dataset.p); await prospects(); msg(t("enregistre")); } catch (er) { msg(ph(er.message)); } });
  }
  // Alertes : le type et le texte viennent de la base. Les phrases connues sont traduites ; ce qui est cité (texte d'un avis ou d'un commentaire,
  // message d'erreur d'un workflow) reste tel qu'il a été écrit, marqué translate="no". Rend [partie traduite, partie citée].
  const texteAlerte = x => { const s = String(x || ""); if (I.langue === "fr") return [s, ""];
    const tr = ph(s); if (tr !== s) return [tr, ""];
    const i = s.indexOf(" : "), tete = i > 0 ? s.slice(0, i).split(", ") : [];
    if (tete.length && tete.every(r => ph(r) !== r)) return [tete.map(r => ph(r)).join(", ") + ": ", s.slice(i + 3)];
    return ["", s]; };
  const alerteHtml = x => {
    // Erreur de workflow : « <workflow>, nœud <nœud> : <message> » ; le nom du workflow, celui du nœud et le message restent tels quels.
    const w = I.langue !== "fr" && String(x || "").match(/^(.*), nœud (.*?) : ([\s\S]*)$/);
    if (w) return `<span translate="no">${e(w[1])}</span>, ${t("con.noeud")} <span translate="no">${e(w[2])}</span>: <span translate="no">${e(w[3])}</span>`;
    const [a, b] = texteAlerte(x); return e(a) + (b ? `<span translate="no">${e(b)}</span>` : ""); };
  async function alertes() {
    const l = await D.adminAlertes();
    vue.innerHTML = `${entete(t("con.alertes"))}${l.length ? `<div class="pile">${l.map(a => `<article class="carte"><div class="carte-tete"><h2>${e(ph(a.type))}</h2><span class="note">${dh(a.date)}</span></div><p class="fort">${e(a.commerce || "")}</p><p class="texte2 casse">${alerteHtml(a.texte)}</p></article>`).join("")}</div>` : `<section class="carte"><p class="texte2">${t("con.aucune.alerte")}</p></section>`}`;
  }
  // ---------------- File « à publier à la main » : réponses aux commentaires validées par le commerçant, tant que l'accès de Meta n'est pas accordé
  // (ou si l'API a refusé). Texte prêt à copier, lien vers la publication ; « Publiée » une fois la réponse collée sous le commentaire, sous le compte du commerce.
  const RESEAUX_CM = { instagram: "Instagram", facebook: "Facebook" };
  async function apublier() {
    const l = await D.adminCommentairesAPublier();
    vue.innerHTML = `${entete(t("con.apublier.titre"), t("con.apublier.chapo"))}
      <p class="msg" id="msg" role="status"></p>${l.length ? `<div class="pile">${l.map(x => `<article class="carte" data-id="${e(x.id)}"><div class="carte-tete"><h2>${e(x.commerce || "")}</h2><span class="note">${t("con.validee.le", { res: RESEAUX_CM[x.reseau] || e(x.reseau), d: dh(x.decide_le || x.cree_le) })}</span></div>
          ${x.texte ? `<p class="note">${t("con.commentaire.de", { de: x.auteur ? t("con.de", { a: e(x.auteur) }) : "", x: `<span translate="no">${e(x.texte)}</span>` })}</p>` : `<p class="note">${t("con.texte.efface")}</p>`}
          <div class="f"><label for="rep-${e(x.id)}">${t("con.rep.coller")}</label><textarea id="rep-${e(x.id)}" readonly data-rep translate="no">${e(x.reponse_proposee || "")}</textarea></div>
          ${x.erreur ? `<p class="note">${e(ph(x.erreur))}</p>` : ""}
          <div class="actions"><button type="button" class="bouton second petit" data-copier>${t("con.copier")}</button>${x.lien ? `<a class="bouton second petit" href="${e(x.lien)}" target="_blank" rel="noopener">${t("con.ouvrir.sur", { res: RESEAUX_CM[x.reseau] || t("con.le.reseau") })}</a>` : ""}<button type="button" class="bouton petit" data-publie>${t("con.publiee")}</button></div></article>`).join("")}</div>`
      : `<section class="carte"><p class="texte2">${t("con.rien.apublier")}</p></section>`}`;
    vue.querySelectorAll("[data-copier]").forEach(b => b.onclick = async () => { const x = b.closest("article").querySelector("[data-rep]"); try { await navigator.clipboard.writeText(x.value); msg(t("con.copiee")); } catch (er) { x.select(); msg(t("con.selectionnee")); } });
    vue.querySelectorAll("[data-publie]").forEach(b => b.onclick = async () => { try { await D.adminCommentairePublie(b.closest("article").dataset.id); await apublier(); msg(t("con.publiee.equipe")); } catch (er) { msg(ph(er.message)); } });
  }
  async function journal() {
    const l = await D.adminJournal(), C = k => t("con.col." + k);
    vue.innerHTML = `${entete(t("con.journal.titre"))}<section class="carte"><div class="f etroit"><label for="filtre">${t("con.filtrer")}</label><input id="filtre" type="text"></div></section>
      <section class="carte tableau"><table class="tab"><thead><tr><th>${C("date")}</th><th>${C("commerce")}</th><th>${C("etape")}</th><th>${C("detail")}</th></tr></thead><tbody id="corps"></tbody></table></section>`;
    const dessiner = () => { const f = $("filtre").value.toLowerCase(); $("corps").innerHTML = l.filter(x => !f || (x.commerce + " " + x.type).toLowerCase().includes(f)).map(x => `<tr><td data-l="${C("date")}">${dh(x.cree_le)}</td><td data-l="${C("commerce")}">${e(x.commerce || "")}</td><td data-l="${C("etape")}"><span class="fort">${e(x.type)}</span></td><td data-l="${C("detail")}" class="note casse" translate="no">${e(JSON.stringify(x.detail))}</td></tr>`).join(""); };
    $("filtre").oninput = dessiner; dessiner();
  }
  async function invitations() {
    const l = await D.adminInvitations(), C = k => t("con.col." + k);
    vue.innerHTML = `${entete(t("con.entree.invitations"), t("con.invitations.chapo"))}${l.length ? `<section class="carte tableau"><table class="tab"><thead><tr><th>${C("date")}</th><th>${C("commerce")}</th><th>${C("email")}</th><th>${C("etat")}</th></tr></thead><tbody>${l.map(i => `<tr><td data-l="${C("date")}">${dh(i.cree_le)}</td><td data-l="${C("commerce")}">${e(i.commerce || "")}</td><td data-l="${C("email")}" class="casse">${e(i.email)}</td><td data-l="${C("etat")}">${INVITATION[i.statut] ? `<span class="fort">${INVITATION[i.statut]}</span> <span class="note">(${e(i.statut)})</span>` : e(i.statut)}</td></tr>`).join("")}</tbody></table></section>` : `<section class="carte"><p class="texte2">${t("con.aucune.invitation")}</p></section>`}`;
  }
  async function creer() {
    vue.innerHTML = `${entete(t("con.creer.titre"))}<section class="carte formulaire"><form id="f"><div class="f"><label for="nom">${t("fiche.nom")}</label><input id="nom" type="text" required></div>
      <div class="champs deux"><div class="f"><label for="metier">${t("fiche.metier")}</label><select id="metier">${Object.entries(METIERS).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></div>
      <div class="f"><label for="offre">${t("con.col.offre")}</label><select id="offre">${Object.entries(OFFRES).map(([k, o]) => `<option value="${k}">${o.nom}</option>`).join("")}</select></div></div>
      <div class="f"><label for="email">${t("con.email.proprio")}</label><input id="email" type="email" required></div><button class="bouton" type="submit">${t("con.creer.inviter")}</button><p class="msg" id="msg" role="status"></p></form></section>`;
    $("f").onsubmit = async ev => { ev.preventDefault(); try { await D.adminCreer($("nom").value, $("metier").value, $("offre").value, $("email").value); msg(t("con.cree")); $("f").reset(); } catch (er) { msg(ph(er.message)); } };
  }
  const ROUTES = { commerces, prospects, alertes, apublier, journal, invitations, creer };
  let derniere = null;
  async function rendre() {
    const s = await D.session(); if (!s) return connexion();
    if (s.role !== "administrateur") return refuse();
    const r = location.hash.replace("#/", ""); route = ROUTES[r] ? r : "commerces"; connecte = true; dessinerNav();
    if (derniere !== route) window.scrollTo(0, 0); derniere = route;
    try { await ROUTES[route](); } catch (er) { vue.innerHTML = `<section class="carte"><h1>${t("souci")}</h1><p>${e(ph(er.message))}</p></section>`; }
  }
  document.addEventListener("click", async ev => { if (ev.target.closest("#sortir")) { await D.quitter(); location.hash = ""; rendre(); } });
  large.addEventListener("change", dessinerNav);
  window.addEventListener("hashchange", rendre); rendre();
})();
