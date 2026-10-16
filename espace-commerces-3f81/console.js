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
    ["garanties", t("con.entree.garanties"), trait('<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z"></path><path d="M9 12l2 2 4-4"></path>')],
    ["alertes", t("con.entree.alertes"), trait('<path d="M6 16v-5a6 6 0 0112 0v5l1.5 2.5h-15z"></path><path d="M10 21h4"></path>')],
    ["videos", t("con.entree.videos"), trait('<rect x="3" y="7" width="13" height="10" rx="2"></rect><path d="M16 11l5-3v8l-5-3z"></path>')],
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
    if (large.matches) lat.innerHTML = `<div class="lat-in"><a class="logo" href="${I.lien("console.html")}">Renomia</a><nav id="nav" class="menu" aria-label="${t("con.titre")}"><div class="groupe"><p class="groupe-lib">${t("con.titre")}</p>${ENTREES.map(x => lien(x, false)).join("")}</div></nav><div class="lat-pied">${I.selecteur()}<button type="button" id="sortir" class="quitter">${t("quitter")}</button></div></div>`;
    else { haut.innerHTML = `<a class="logo" href="${I.lien("console.html")}">Renomia</a><span class="haut-note">${t("con.titre")}</span>${I.selecteur()}<button type="button" id="sortir" class="quitter">${t("quitter")}</button>`; onglets.innerHTML = ENTREES.map(x => lien(x, true)).join("");
      // La barre défile horizontalement : l'onglet ouvert reste visible.
      const a = onglets.querySelector("[aria-current]"); if (a) onglets.scrollLeft = a.offsetLeft - (onglets.clientWidth - a.offsetWidth) / 2; }
  }

  async function refuse() { connecte = false; dessinerNav(); vue.innerHTML = `<div class="connexion"><div class="carte"><div class="connexion-tete"><p class="logo">Renomia</p>${I.selecteur()}</div><div class="entete"><h1>${t("con.refuse.titre")}</h1><p class="chapo">${t("con.refuse.texte")}</p></div><a class="bouton second plein" href="${I.lien("index.html")}">${t("con.retour.espace")}</a></div></div>`; }
  async function connexion() {
    connecte = false; dessinerNav();
    // Démonstration : l'adresse de l'administrateur vient de la graine chargée (parcours ou graine publique).
    const admins = D.mode === "demo" && D.comptesDemo ? (await D.comptesDemo()).filter(x => x.role === "administrateur").map(x => x.email) : [];
    vue.innerHTML = `<div class="connexion"><div class="carte"><div class="connexion-tete"><p class="logo">Renomia</p>${I.selecteur()}</div><div class="entete"><h1>${t("con.titre")}</h1><p class="chapo">${t("con.connexion")}</p></div>
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
  // Style du commerce (kit de marque) : qui l'a validé et quand, demandes de changement en attente, lien vers le panneau « Style du commerce ».
  const ligneStyle = c => { const m = c.marque, n = +c.demandes_style || 0;
    const etat = m && m.verrouille ? t("con.sty.ligne." + (m.valide_par === "renom" ? "renom" : "commercant"), { d: I.date(m.verrouille_le || m.maj) }) : t(m ? "con.sty.ligne.attente" : "con.sty.ligne.aucun");
    return `<div class="pile serre style-ligne"><p class="note">${etat}</p>${n ? `<p class="note fort">${t("con.sty.ligne.demandes", { n })}</p>` : ""}<a class="bouton second petit" href="${I.lien("console.html")}#/style/${encodeURIComponent(c.id)}" data-style="${e(c.id)}">${t("con.sty.ouvrir")}</a></div>`; };
  async function commerces() {
    const l = (await D.adminCommerces()).sort((a, b) => (RANG[(a.sante || {}).niveau] ?? 3) - (RANG[(b.sante || {}).niveau] ?? 3) || a.nom.localeCompare(b.nom));
    const C = k => t("con.col." + k);
    vue.innerHTML = `${entete(t("con.entree.commerces"), t("con.commerces.chapo"))}<p class="msg" id="msg" role="status"></p><section class="carte tableau"><table class="tab"><thead><tr><th>${C("commerce")}</th><th>${C("sante")}</th><th>${C("mer")}</th><th>${C("offre")}</th><th>${C("mois")}</th><th>${C("comptes")}</th><th>${C("alertes")}</th><th>${C("etat")}</th></tr></thead><tbody>${l.map(c => {
      const k = c.compteur || {}, cc = Object.values(c.comptes || {}).filter(x => x.etat === "connecte").length;
      return `<tr data-id="${e(c.id)}"><td data-l="${C("commerce")}"><p class="fort">${e(c.nom)}</p><p class="note">${e(METIERS[c.metier] || "")}${c.ville ? ", " + e(c.ville) : ""}</p>${ligneStyle(c)}</td>
        <td data-l="${C("sante")}">${sante(c.sante)}</td><td data-l="${C("mer")}">${miseEnRoute(c.sante)}</td>
        <td data-l="${C("offre")}"><div class="pile serre"><select data-offre aria-label="${t("con.offre.de", { nom: e(c.nom) })}">${Object.entries(OFFRES).filter(([k2, o]) => !o.retiree || c.offre_id === k2).map(([k2, o]) => `<option value="${k2}"${c.offre_id === k2 ? " selected" : ""}>${o.nom}${o.retiree ? " " + t("con.offre.retiree") : ""}</option>`).join("")}</select><button type="button" class="bouton second petit" data-a="offre">${t("con.changer.offre")}</button></div></td>
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
  // Tournée du jour (bloc « Prospection quotidienne ») : statut noté par PJ (lien de l'email ou boutons ci-dessous) et prochaine action.
  // Rappels à J+2, J+5, J+10 après « rappeler », annoncés dans l'email de la tournée (jamais d'email au prospect).
  // La tournée ne part que les jours ouvrés : un rappel dû un samedi ou un dimanche arrive le lundi (jours fériés non comptés ici).
  const ouvre = ms => { let d = new Date(ms); while ([0, 6].includes(d.getDay())) d = new Date(d.getTime() + JOUR); return d.getTime(); };
  function etatTournee(p) {
    const r = p.resultat || "propose";
    if (r === "pas_interesse") return [t("con.p.pas.interesse"), t("con.p.opposition.det", { d: jourCourt(p.resultat_le || p.desinscrit_le) })];
    if (r === "pilote") return [t("con.p.pilote"), t("con.p.le", { d: jourCourt(p.resultat_le) })];
    if (r === "rdv") return [t("con.p.rdv"), t("con.p.le", { d: jourCourt(p.resultat_le || p.rdv_le) })];
    if (r === "rappeler") return p.relances >= 3 ? [t("con.p.rappels.finis"), t("con.p.rappels.finis.det")]
      : [t("con.p.rappeler"), t("con.p.rappel.det", { n: p.relances + 1, d: jourCourt(ouvre(new Date(p.resultat_le).getTime() + ECHEANCES[p.relances] * JOUR)) })];
    return [t("con.p.propose"), t("con.p.propose.det", { d: jourCourt(p.propose_le || p.audit_le), c: t("con.canal." + (p.canal || "visite")) })];
  }
  function etatProspect(p) {
    if (p.origine === "tournee") return etatTournee(p);
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
      <p class="msg" id="msg" role="status"></p>${l.length ? `<section class="carte tableau"><table class="tab"><thead><tr><th>${C("prospect")}</th><th>${C("audit")}</th><th>${C("suivi")}</th><th>${C("actions")}</th></tr></thead><tbody>${l.map(p => { const [et, det] = etatProspect(p);
        const fini = p.desinscrit_le || p.rdv_le, tournee = p.origine === "tournee";
        const qui = tournee ? `${t("con.p.tournee")}, ${e([p.code_postal, p.ville].filter(Boolean).join(" "))}, SIRET ${e(p.siret || "")}` : e(p.email);
        const actions = tournee ? (p.resultat === "pas_interesse" || p.resultat === "pilote" ? "" : ["rappeler", "rdv", "pilote"].filter(r => r !== p.resultat)
            .map(r => `<button type="button" class="bouton second petit" data-r="${r}">${t("con.r." + r)}</button>`).join("") + `<button type="button" class="lien" data-r="pas_interesse">${t("con.r.pas_interesse")}</button>`)
          : null;
        return `<tr data-id="${e(p.id)}"><td data-l="${C("prospect")}"><p class="fort">${e(p.commerce || t("con.non.nomme"))}</p><p class="note casse">${qui}</p>${p.note_pj ? `<p class="note">${e(p.note_pj)}</p>` : ""}</td><td data-l="${C("audit")}">${p.audit_le ? jourCourt(p.audit_le) : ""}</td>
          <td data-l="${C("suivi")}"><p class="fort">${et}</p><p class="note">${det}</p></td>
          <td data-l="${C("actions")}"><div class="pile serre">${actions !== null ? actions : fini ? "" : `${!p.rapport_envoye_le ? `<button type="button" class="bouton second petit" data-p="rapport_envoye">${t("con.rapport.envoye")}</button>` : ""}<button type="button" class="bouton second petit" data-p="rdv">${t("con.rdv")}</button>${!p.repondu_le ? `<button type="button" class="bouton second petit" data-p="reponse">${t("con.a.repondu")}</button>` : ""}<button type="button" class="lien" data-p="arreter">${t("con.arreter")}</button>`}</div></td></tr>`; }).join("")}</tbody></table></section>`
      : `<section class="carte"><p class="texte2">${t("con.aucun.prospect")}</p></section>`}`;
    vue.querySelectorAll("[data-p]").forEach(b => b.onclick = async () => { try { await D.adminProspect(b.closest("tr").dataset.id, b.dataset.p); await prospects(); msg(t("enregistre")); } catch (er) { msg(ph(er.message)); } });
    vue.querySelectorAll("[data-r]").forEach(b => b.onclick = async () => { try { await D.adminResultatProspect(b.closest("tr").dataset.id, b.dataset.r); await prospects(); msg(t("enregistre")); } catch (er) { msg(ph(er.message)); } });
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
    // Son de plateforme des vidéos programmées : l'API Metricool ne documente aucun champ pour le poser (moteur/metricool_api.py) ; l'équipe
    // l'ajoute dans l'interface web de Metricool avant l'heure de publication, puis le marque ici (fonction SQL admin_musique_posee).
    const sons = await D.adminMusiquesAPoser(), RS = { instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook" };
    const noms = l => l.map(r => RS[r] || e(r)).join(", ");
    vue.insertAdjacentHTML("beforeend", `<section class="carte" aria-labelledby="sons-titre"><h2 id="sons-titre">${t("con.son.titre")}</h2><p class="texte2">${t("con.son.chapo")}</p></section>
      ${sons.length ? `<div class="pile">${sons.map(x => { const m = x.musique_a_poser || {}; return `<article class="carte" data-pub="${e(x.id)}"><div class="carte-tete"><h2>${e(x.commerce || "")}</h2><span class="note">${t("con.son.prevue", { d: dh(x.prevu_le) })}</span></div>
          <p class="fort">${t("con.son.reseaux", { res: noms(m.reseaux || []) })}</p>
          <p class="note">${m.volume_video == null || m.volume_musique == null ? t("con.son.ambiance.seule", { a: e(m.ambiance || "naturel") }) : t("con.son.ambiance", { a: e(m.ambiance || "naturel"), v: m.volume_video, m: m.volume_musique })}</p>
          ${(m.sans_bibliotheque || []).length ? `<p class="note">${t("con.son.sans", { res: noms(m.sans_bibliotheque) })}</p>` : ""}
          <div class="actions"><button type="button" class="bouton petit" data-son-pose>${t("con.son.pose")}</button></div></article>`; }).join("")}</div>`
      : `<section class="carte"><p class="texte2">${t("con.son.rien")}</p></section>`}`);
    vue.querySelectorAll("[data-son-pose]").forEach(b => b.onclick = async () => { try { await D.adminMusiquePosee(b.closest("article").dataset.pub); await apublier(); msg(t("con.son.enregistre")); } catch (er) { msg(ph(er.message)); } });
  }
  // ---------------- Avis et garanties (trois offres, 16/10/2026 ; bloc « Trois offres » de schema.sql).
  // 1. File des avis de Renomia : Premium, avis 1 à 3 étoiles traités par l'équipe (« Réponse publiée ») ; avis sensibles de toutes les offres :
  //    hors Premium, la réponse est PROPOSÉE au commerçant (admin_avis_proposer), publiée seulement avec son accord (admin_avis_publie, accord coché).
  //    Tant que l'accès à l'API Google n'est pas ouvert, la réponse est publiée à la main sur la fiche, puis notée ici.
  // 2. Commentaires des commerces Premium (gestion par l'équipe). 3. Garantie des délais : départ (accès et premières photos), fiche sous 7 jours,
  //    premier contenu sous 72 h, avis sous 24 h ; manquements → mois offert, appliqué À LA MAIN dans Stripe puis noté ici (ordres/BRANCHEMENT.md).
  // 4. Réseaux retenus et mode délégation. 5. Objectif INTERNE des pilotes (ancienne garantie « 10 avis ») : jamais montré au commerçant.
  const ETAT_OBJ = I.carte("con.obj.etat", ["en_cours", "atteinte", "non_atteint", "condition_manquante"]);
  const ETAT_DELAI = I.carte("delai.etat", ["non_demarre", "en_cours", "tenu", "manque"]);
  const ENGAGEMENT = I.carte("con.engagement", ["fiche_7j", "premier_contenu_72h", "avis_24h"]);
  const RESEAUX_RET = ["instagram", "facebook", "tiktok"], NOM_RES = I.carte("res", ["facebook", "instagram", "google", "tiktok"]);
  const etoiles = n => t("con.etoiles", { n }), COND_O = window.RENOM_CONDITIONS.objectif_interne_pilotes;
  const jourDe = v => v ? String(v).slice(0, 10) : "";
  async function garanties() {
    const [file, dl, gs, cs, cms] = await Promise.all([D.adminFileAvis(), D.adminGarantieDelais(), D.adminGaranties(), D.adminCommerces(), D.adminCommentairesEquipe().catch(() => [])]), C = k => t("con.col." + k);
    const sansObj = cs.filter(c => !gs.some(g => g.commerce_id === c.id)), sansDelais = cs.filter(c => !dl.some(g => g.commerce_id === c.id));
    const manquements = dl.flatMap(g => (g.manquements || []).map(m => ({ ...m, commerce: g.commerce, commerce_id: g.commerce_id })));
    const delai = (d, cle) => !d ? `<p class="note">${t("con.delais.sans.objet")}</p>` : `<p><span class="etat${d.etat === "tenu" ? " actif" : ""}">${ETAT_DELAI[d.etat] || e(d.etat)}</span></p>${d.echeance ? `<p class="note">${t(d.fait_le ? "con.delais.fait" : "con.delais.avant", { d: dh(d.fait_le || d.echeance) })}</p>` : ""}`;
    vue.innerHTML = `${entete(t("con.entree.garanties"), t("con.gar.chapo"))}<p class="msg" id="msg" role="status"></p>
      <section class="carte" aria-labelledby="file-titre"><h2 id="file-titre">${t("con.file.titre")}</h2><p class="texte2">${t("con.file.chapo")}</p></section>
      ${file.length ? `<div class="pile" id="file-avis">${file.map(a => `<article class="carte${a.en_retard ? " attention" : ""}" data-avis="${e(a.id)}" data-mode="${e(a.mode)}"><div class="carte-tete"><h2>${e(a.commerce || "")}</h2><span class="etat${a.en_retard ? "" : " actif"}">${a.traite_le ? t("con.file.traite", { d: dh(a.traite_le) }) : t(a.en_retard ? "con.file.retard" : "con.file.avant", { d: dh(a.echeance) })}</span></div>
          <p class="fort">${etoiles(a.note)} · ${e((OFFRES[a.offre] || {}).nom || a.offre || "")}${a.sensible ? " · " + t("con.file.sensible", { r: e((a.raisons || []).join(", ")) }) : " · " + t("con.file.equipe")}</p>
          ${a.texte ? `<p class="texte2 casse" translate="no">${e(a.texte)}</p>` : `<p class="note">${t("con.texte.efface")}</p>`}<p class="note">${t("con.file.recu", { d: dh(a.recu_le) })}</p>
          <div class="f"><label for="rep-av-${e(a.id)}">${t(a.mode === "equipe" ? "con.file.reponse" : "con.file.reponse.proposer")}</label><textarea id="rep-av-${e(a.id)}" data-rep-avis maxlength="2000" translate="no">${e(a.reponse_proposee || "")}</textarea></div>
          ${a.mode === "equipe" ? `<p class="note">${t("con.file.mode.equipe")}</p>` : `<p class="note">${t("con.file.mode.proposer", { email: a.email_client ? `<span class="casse">${e(a.email_client)}</span>` : t("con.file.sans.email") })}</p>
          ${a.propose_le ? `<p class="note">${t("con.file.proposee", { d: dh(a.propose_le) })}</p>` : ""}<label class="option"><input type="checkbox" data-accord><span>${t("con.file.accord")}</span></label>`}
          <div class="actions"><button type="button" class="bouton second petit" data-copier-avis>${t("con.copier")}</button>${a.mode === "equipe" ? "" : `<button type="button" class="bouton second petit" data-avis-proposer>${t("con.file.proposer")}</button>`}<button type="button" class="bouton petit" data-avis-publie>${t("con.file.publiee")}</button></div></article>`).join("")}</div>`
        : `<section class="carte"><p class="texte2">${t("con.file.vide")}</p></section>`}
      ${cms.length ? `<section class="carte" aria-labelledby="cm-eq-titre"><h2 id="cm-eq-titre">${t("con.cm.equipe.titre")}</h2><p class="texte2">${t("con.cm.equipe.chapo")}</p></section>
        <div class="pile" id="commentaires-equipe">${cms.map(x => `<article class="carte" data-cm="${e(x.id)}"><div class="carte-tete"><h2>${e(x.commerce || "")}</h2><span class="note">${NOM_RES[x.reseau] || e(x.reseau)}</span></div>
          <p class="texte2 casse" translate="no">${e(x.texte || "")}</p><p class="note">${x.auteur ? e(x.auteur) + " · " : ""}${dh(x.recu_le)}</p>
          <div class="f"><label for="cm-eq-${e(x.id)}">${t("con.cm.equipe.reponse")}</label><textarea id="cm-eq-${e(x.id)}" data-cm-texte maxlength="1000" translate="no">${e(x.reponse_proposee || "")}</textarea></div>
          <div class="actions"><button type="button" class="bouton petit" data-cm-d="valide">${t("con.cm.equipe.valider")}</button><button type="button" class="bouton second petit" data-cm-d="ignore">${t("con.cm.equipe.ignorer")}</button></div></article>`).join("")}</div>` : ""}
      <section class="carte tableau" aria-labelledby="delais-titre"><h2 id="delais-titre">${t("con.delais.titre")}</h2><p class="texte2">${t("con.delais.chapo")}</p>
        ${dl.length ? `<table class="tab" id="garantie-delais"><thead><tr><th>${C("commerce")}</th><th>${C("delais.depart")}</th><th>${C("delais.fiche")}</th><th>${C("delais.contenu")}</th><th>${C("delais.avis")}</th><th>${C("actions")}</th></tr></thead><tbody>${dl.map(g => `<tr data-delais="${e(g.commerce_id)}">
          <td data-l="${C("commerce")}"><p class="fort">${e(g.commerce || "")}</p><p class="note">${e((OFFRES[g.offre] || {}).nom || g.offre || "")}</p></td>
          <td data-l="${C("delais.depart")}">${g.depart ? `<p>${dh(g.depart)}</p>` : `<p class="note">${t("con.delais.pas.demarre")}</p>`}<p class="note">${t("con.delais.acces", { d: g.acces_remis_le ? I.date(jourDe(g.acces_remis_le)) : "?" })} · ${t("con.delais.photos", { d: g.photos_recues_le ? I.date(jourDe(g.photos_recues_le)) : "?" })}</p></td>
          <td data-l="${C("delais.fiche")}">${delai(g.fiche)}</td>
          <td data-l="${C("delais.contenu")}">${delai(g.premier_contenu)}</td>
          <td data-l="${C("delais.avis")}"><p class="fort">${(g.avis_en_cours || []).length}</p>${(g.avis_en_cours || []).filter(a => a.en_retard).length ? `<p class="note fort">${t("con.delais.avis.retard", { n: g.avis_en_cours.filter(a => a.en_retard).length })}</p>` : ""}</td>
          <td data-l="${C("actions")}"><div class="pile serre">
            <div class="f etroit"><label for="acc-${e(g.commerce_id)}">${t("con.delais.acces.lib")}</label><input id="acc-${e(g.commerce_id)}" type="date" value="${e(jourDe(g.acces_remis_le))}" data-d="acces_remis_le"></div>
            <div class="f etroit"><label for="pho-${e(g.commerce_id)}">${t("con.delais.photos.lib")}</label><input id="pho-${e(g.commerce_id)}" type="date" value="${e(jourDe(g.photos_recues_le))}" data-d="photos_recues_le"></div>
            <div class="f etroit"><label for="fic-${e(g.commerce_id)}">${t("con.delais.fiche.lib")}</label><input id="fic-${e(g.commerce_id)}" type="date" value="${e(jourDe(g.fiche.fait_le))}" data-d="fiche_optimisee_le"></div>
            <button type="button" class="bouton second petit" data-delais-enregistrer>${t("enregistrer")}</button></div></td></tr>`).join("")}</tbody></table>` : `<p class="texte2">${t("con.delais.aucun")}</p>`}</section>
      ${sansDelais.length ? `<section class="carte formulaire" aria-labelledby="delais-dep-titre"><h2 id="delais-dep-titre">${t("con.delais.demarrer")}</h2><form id="f-delais">
        <div class="champs deux"><div class="f"><label for="dl-commerce">${C("commerce")}</label><select id="dl-commerce">${sansDelais.map(c => `<option value="${e(c.id)}">${e(c.nom)}</option>`).join("")}</select></div>
        <div class="f"><label for="dl-acces">${t("con.delais.acces.lib")}</label><input id="dl-acces" type="date" required></div></div>
        <p class="note">${t("con.delais.regle")}</p><button class="bouton" type="submit">${t("con.delais.demarrer.bouton")}</button></form></section>` : ""}
      <section class="carte tableau" aria-labelledby="mq-titre"><h2 id="mq-titre">${t("con.mq.titre")}</h2><p class="texte2">${t("con.mq.chapo")}</p>
        ${manquements.length ? `<table class="tab" id="manquements"><thead><tr><th>${C("commerce")}</th><th>${C("mq.engagement")}</th><th>${C("mq.mois")}</th><th>${C("etat")}</th><th>${C("actions")}</th></tr></thead><tbody>${manquements.map(m => `<tr data-mq="${e(m.id)}">
          <td data-l="${C("commerce")}"><p class="fort">${e(m.commerce || "")}</p></td>
          <td data-l="${C("mq.engagement")}"><p>${ENGAGEMENT[m.engagement] || e(m.engagement)}</p><p class="note">${t("con.mq.echeance", { d: dh(m.echeance) })}</p></td>
          <td data-l="${C("mq.mois")}"><p>${I.date(m.mois_offert)}</p></td>
          <td data-l="${C("etat")}"><span class="etat${m.statut === "applique" ? " actif" : ""}">${t("con.mq.st." + m.statut)}</span>${m.motif ? `<p class="note casse">${e(m.motif)}</p>` : ""}</td>
          <td data-l="${C("actions")}">${m.statut === "a_appliquer" ? `<div class="pile serre"><button type="button" class="bouton petit" data-mq-d="applique">${t("con.mq.appliquer")}</button>
            <div class="f etroit"><label for="mq-${e(m.id)}">${t("con.mq.motif")}</label><input id="mq-${e(m.id)}" type="text" maxlength="500" data-mq-motif></div><button type="button" class="bouton second petit" data-mq-d="ecarte">${t("con.mq.ecarter")}</button></div>` : ""}</td></tr>`).join("")}</tbody></table>` : `<p class="texte2">${t("con.mq.aucun")}</p>`}</section>
      <section class="carte tableau" aria-labelledby="ret-titre"><h2 id="ret-titre">${t("con.ret.titre")}</h2><p class="texte2">${t("con.ret.chapo")}</p>
        <table class="tab" id="reseaux-retenus"><thead><tr><th>${C("commerce")}</th><th>${C("ret.reseaux")}</th><th>${C("ret.delegation")}</th></tr></thead><tbody>${cs.map(c => { const o = OFFRES[c.offre_id] || {}, ret = Array.isArray(c.reseaux_retenus) ? c.reseaux_retenus : RESEAUX_RET;
          return `<tr data-ret="${e(c.id)}"><td data-l="${C("commerce")}"><p class="fort">${e(c.nom)}</p><p class="note">${e(o.nom || c.offre_id)}</p></td>
          <td data-l="${C("ret.reseaux")}">${o.reseaux_sociaux ? `<div class="pile serre">${RESEAUX_RET.map(r => `<label class="option"><input type="checkbox" value="${r}" data-ret-res${ret.includes(r) ? " checked" : ""}><span>${NOM_RES[r]}</span></label>`).join("")}<button type="button" class="bouton second petit" data-ret-enregistrer>${t("enregistrer")}</button></div>` : `<p class="note">${t("con.ret.google.seul")}</p>`}</td>
          <td data-l="${C("ret.delegation")}">${o.delegation ? `<label class="option"><input type="checkbox" data-delegation${c.delegation_signee_le ? " checked" : ""}><span>${t(c.delegation_signee_le ? "con.ret.delegation.le" : "con.ret.delegation.non", { d: c.delegation_signee_le ? I.date(jourDe(c.delegation_signee_le)) : "" })}</span></label>` : `<p class="note">${t("con.ret.delegation.sans")}</p>`}</td></tr>`; }).join("")}</tbody></table></section>
      <section class="carte tableau" aria-labelledby="gar-titre"><h2 id="gar-titre">${t("con.gar.titre")}</h2><p class="texte2">${t("con.obj.chapo")}</p>${gs.length ? `<table class="tab" id="garanties"><thead><tr><th>${C("commerce")}</th><th>${C("gar.depart")}</th><th>${C("gar.actuel")}</th><th>${C("gar.echeance")}</th><th>${C("etat")}</th><th>${C("actions")}</th></tr></thead><tbody>${gs.map(g => `<tr data-gar="${e(g.commerce_id)}">
          <td data-l="${C("commerce")}"><p class="fort">${e(g.commerce || "")}</p><p class="note">${t("con.gar.jour", { n: g.jour })}</p></td>
          <td data-l="${C("gar.depart")}"><p>${t("con.gar.avis", { n: g.avis_depart })}</p><p class="note">${I.date(g.depart_le)}${g.capture ? " · " + t("con.gar.capture") : ""}</p></td>
          <td data-l="${C("gar.actuel")}"><p class="fort">${t("con.gar.avis", { n: g.avis_actuel })}</p><p class="note">${t("con.gar.gagnes", { n: g.gagnes, o: g.objectif })}${g.source === "releve" ? " · " + t("con.gar.releve", { d: I.date(g.releve_le) }) : ""}</p></td>
          <td data-l="${C("gar.echeance")}"><p>${I.date(g.echeance)}</p>${g.prolongation_jours ? `<p class="note">${t("con.gar.prolongee", { n: g.prolongation_jours })}</p>` : ""}${!g.en_vue && g.etat === "en_cours" && g.jour >= COND_O.rappel_jour ? `<p class="note fort">${t("con.gar.pas.en.vue", { s: g.seuil_en_vue })}</p>` : ""}</td>
          <td data-l="${C("etat")}"><span class="etat${g.etat === "atteinte" ? " actif" : ""}">${ETAT_OBJ[g.etat] || e(g.etat)}</span>${g.cartes_en_place_le ? `<p class="note">${t("con.gar.cartes", { d: I.date(g.cartes_en_place_le) })}</p>` : ""}</td>
          <td data-l="${C("actions")}"><div class="pile serre"><div class="f etroit"><label for="rel-${e(g.commerce_id)}">${t("con.gar.releve.lib")}</label><input id="rel-${e(g.commerce_id)}" type="number" min="0" inputmode="numeric" data-releve></div>
            <button type="button" class="bouton second petit" data-gar-releve>${t("con.gar.enregistrer")}</button>${!g.cartes_en_place_le ? `<button type="button" class="bouton second petit" data-gar-cartes>${t("con.gar.cartes.ok")}</button>` : ""}</div></td></tr>`).join("")}</tbody></table>` : `<p class="texte2">${t("con.gar.aucune")}</p>`}</section>
      ${sansObj.length ? `<section class="carte formulaire" aria-labelledby="gar-dep-titre"><h2 id="gar-dep-titre">${t("con.gar.demarrer")}</h2><form id="f-gar">
        <div class="champs deux"><div class="f"><label for="gar-commerce">${C("commerce")}</label><select id="gar-commerce">${sansObj.map(c => `<option value="${e(c.id)}">${e(c.nom)}</option>`).join("")}</select></div>
        <div class="f"><label for="gar-date">${t("con.gar.date")}</label><input id="gar-date" type="date" required></div></div>
        <div class="champs deux"><div class="f"><label for="gar-avis">${t("con.gar.avis.capture")}</label><input id="gar-avis" type="number" min="0" inputmode="numeric" required></div>
        <div class="f"><label for="gar-cartes">${t("con.gar.cartes.lib")}</label><input id="gar-cartes" type="date"></div></div>
        <p class="note">${t("con.gar.regle")}</p><button class="bouton" type="submit">${t("con.gar.demarrer.bouton")}</button></form></section>` : ""}`;
    const agir = async (f, ok) => { try { await f(); await garanties(); msg(ok || t("enregistre")); } catch (er) { msg(ph(er.message)); } };
    vue.querySelectorAll("[data-copier-avis]").forEach(b => b.onclick = async () => { const x = b.closest("article").querySelector("[data-rep-avis]"); try { await navigator.clipboard.writeText(x.value); msg(t("con.copiee")); } catch (er) { x.select(); msg(t("con.selectionnee")); } });
    vue.querySelectorAll("[data-avis-proposer]").forEach(b => b.onclick = () => { const a = b.closest("article"); agir(() => D.adminAvisProposer(a.dataset.avis, a.querySelector("[data-rep-avis]").value), t("con.file.proposee.msg")); });
    vue.querySelectorAll("[data-avis-publie]").forEach(b => b.onclick = () => { const a = b.closest("article"), acc = a.querySelector("[data-accord]"); agir(() => D.adminAvisPublie(a.dataset.avis, a.querySelector("[data-rep-avis]").value, acc ? acc.checked : false), t("con.file.notee")); });
    vue.querySelectorAll("[data-cm-d]").forEach(b => b.onclick = () => { const a = b.closest("article"); agir(() => D.adminCommentaireDecider(a.dataset.cm, b.dataset.cmD, b.dataset.cmD === "valide" ? a.querySelector("[data-cm-texte]").value : null)); });
    vue.querySelectorAll("[data-delais-enregistrer]").forEach(b => b.onclick = () => { const tr = b.closest("tr"), p = {}; tr.querySelectorAll("[data-d]").forEach(i => { p[i.dataset.d] = i.value || null; }); agir(() => D.adminDelais(tr.dataset.delais, p)); });
    vue.querySelectorAll("[data-mq-d]").forEach(b => b.onclick = () => { const tr = b.closest("tr"), m = tr.querySelector("[data-mq-motif]"); agir(() => D.adminManquement(tr.dataset.mq, b.dataset.mqD, m ? m.value : null)); });
    vue.querySelectorAll("[data-ret-enregistrer]").forEach(b => b.onclick = () => { const tr = b.closest("tr"); agir(() => D.adminReseaux(tr.dataset.ret, [...tr.querySelectorAll("[data-ret-res]:checked")].map(i => i.value))); });
    vue.querySelectorAll("[data-delegation]").forEach(i => i.onchange = () => agir(() => D.adminDelegation(i.closest("tr").dataset.ret, i.checked)));
    vue.querySelectorAll("[data-gar-releve]").forEach(b => b.onclick = () => { const tr = b.closest("tr"), v = tr.querySelector("[data-releve]").value; agir(() => D.adminGarantie(tr.dataset.gar, { avis_releve: v })); });
    vue.querySelectorAll("[data-gar-cartes]").forEach(b => b.onclick = () => agir(() => D.adminGarantie(b.closest("tr").dataset.gar, { cartes_en_place_le: window.RENOM_MAJ.aujourdhui() })));
    const fd = $("f-delais"); if (fd) fd.onsubmit = ev => { ev.preventDefault(); agir(() => D.adminDelais($("dl-commerce").value, { acces_remis_le: $("dl-acces").value })); };
    const f = $("f-gar"); if (f) f.onsubmit = ev => { ev.preventDefault(); agir(() => D.adminGarantie($("gar-commerce").value, { depart_le: $("gar-date").value, avis_depart: $("gar-avis").value, cartes_en_place_le: $("gar-cartes").value || null })); };
  }
  // ---------------- Dépôts de vidéos : par commerce, statut, motif ; relance du montage (fonction SQL admin_relancer_montage, qui revérifie tout).
  const ST_DV = I.carte("dv.st", window.RENOM_DEPOT_VIDEO.STATUTS);
  const RELANCABLE = ["envoye", "en_montage", "refuse"];
  async function videos() {
    const l = await D.adminDepotsVideo(), C = k => t("con.col." + k), sec = d => d == null ? "" : ", " + I.nombre(+d, +d % 1 ? 1 : 0) + " s";
    const parCommerce = {}; l.forEach(d => { (parCommerce[d.commerce || d.commerce_id] = parCommerce[d.commerce || d.commerce_id] || []).push(d); });
    vue.innerHTML = `${entete(t("con.entree.videos"), t("con.videos.chapo"))}<p class="msg" id="msg" role="status"></p>
      ${l.length ? Object.entries(parCommerce).sort((a, b) => a[0].localeCompare(b[0])).map(([nom, ds]) => `<section class="carte tableau"><h2>${e(nom)}</h2><table class="tab"><thead><tr><th>${C("depot")}</th><th>${C("fichiers")}</th><th>${C("statut")}</th><th>${C("actions")}</th></tr></thead><tbody>${ds.map(d =>
        `<tr data-depot="${e(d.id)}"><td data-l="${C("depot")}"><p>${dh(d.cree_le)}</p>${d.note ? `<p class="note casse" translate="no">${e(d.note)}</p>` : ""}</td>
          <td data-l="${C("fichiers")}">${d.nb_videos ? t("dv.depot.contenu", { v: d.nb_videos, p: (d.nb_fichiers || 0) - d.nb_videos, d: "" }) + sec(d.duree_totale_s) : ""}${d.rushes_effaces_le ? `<p class="note">${t("dv.efface.le", { d: I.date(d.rushes_effaces_le) })}</p>` : ""}</td>
          <td data-l="${C("statut")}"><p class="fort">${ST_DV[d.statut] || e(d.statut)}</p>${d.motif ? `<p class="note">${e(ph(d.motif))}</p>` : ""}${d.essais ? `<p class="note">${t("con.essais", { n: d.essais })}</p>` : ""}</td>
          <td data-l="${C("actions")}">${RELANCABLE.includes(d.statut) && !d.rushes_effaces_le && !d.effacement_demande_le ? `<button type="button" class="bouton second petit" data-relancer>${t("con.relancer")}</button>` : ""}</td></tr>`).join("")}</tbody></table></section>`).join("")
        : `<section class="carte"><p class="texte2">${t("con.aucun.depot")}</p></section>`}`;
    vue.querySelectorAll("[data-relancer]").forEach(b => b.onclick = async () => { b.disabled = true; try { await D.adminRelancerMontage(b.closest("tr").dataset.depot); await videos(); msg(t("con.relance.ok")); } catch (er) { b.disabled = false; msg(ph(er.message)); } });
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
      <div class="f"><label for="offre">${t("con.col.offre")}</label><select id="offre">${Object.entries(OFFRES).filter(([k, o]) => !o.retiree).map(([k, o]) => `<option value="${k}">${o.nom}</option>`).join("")}</select></div></div>
      <div class="f"><label for="email">${t("con.email.proprio")}</label><input id="email" type="email" required></div><button class="bouton" type="submit">${t("con.creer.inviter")}</button><p class="msg" id="msg" role="status"></p></form></section>`;
    $("f").onsubmit = async ev => { ev.preventDefault(); try { await D.adminCreer($("nom").value, $("metier").value, $("offre").value, $("email").value); msg(t("con.cree")); $("f").reset(); } catch (er) { msg(ph(er.message)); } };
  }
  // ---------------- Style du commerce : le kit de marque est créé et réglé par Renomia ici (même écran et mêmes règles que « Votre style », marque.js).
  // Proposition automatique depuis le logo, sinon depuis les photos ; « Enregistrer » ou « Enregistrer et valider pour le client » (fonction SQL admin_regler_marque).
  const MQ = window.RENOM_MARQUE, ecransStyle = {};
  async function style(cid) {
    if (!cid) { location.hash = "#/commerces"; return; }
    // Une lecture du commerce et de son kit par affichage complet ; relue après chaque enregistrement et à chaque ouverture du panneau.
    const x = ecransStyle[cid] || (ecransStyle[cid] = (() => {
      let lu = null; const lire = async () => lu || (lu = await D.adminMarque(cid));
      const ecran = MQ.ecran({ vue, I, mode: "renom",
        entete: c => `<div class="entete"><p class="sur">${t("con.sty.titre")}</p><h1>${e(c.nom)}</h1><p class="chapo">${t("con.sty.chapo")}</p></div><p class="retour-liste"><a href="#/commerces">${t("con.sty.retour")}</a></p>`,
        commerce: async () => (await lire()).commerce, marque: lire,
        deposerLogo: f => D.adminDeposerLogo(cid, f), enregistrer: async (k, v) => { const m = await D.adminEnregistrerMarque(cid, k, v); lu = null; return m; } });
      return { ...ecran, oublier() { lu = null; ecran.oublier(); } };
    })());
    x.oublier(); await x.rendre();
  }
  const ROUTES = { commerces, prospects, garanties, alertes, videos, apublier, journal, invitations, creer, style };
  let derniere = null;
  async function rendre() {
    const s = await D.session(); if (!s) return connexion();
    if (s.role !== "administrateur") return refuse();
    const [r, param] = location.hash.replace("#/", "").split("/"); const ecran = ROUTES[r] ? r : "commerces";
    route = ecran === "style" ? "commerces" : ecran; connecte = true; dessinerNav();   // le panneau « Style du commerce » dépend de l'entrée Commerces
    const cle = ecran + "/" + (param || ""); if (derniere !== cle) window.scrollTo(0, 0); derniere = cle;
    try { await ROUTES[ecran](param ? decodeURIComponent(param) : undefined); } catch (er) { vue.innerHTML = `<section class="carte"><h1>${t("souci")}</h1><p>${e(ph(er.message))}</p></section>`; }
  }
  document.addEventListener("click", async ev => { if (ev.target.closest("#sortir")) { await D.quitter(); location.hash = ""; rendre(); } });
  large.addEventListener("change", dessinerNav);
  window.addEventListener("hashchange", rendre); rendre();
})();
