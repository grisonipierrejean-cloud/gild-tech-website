(function () {
  const D = window.RENOM_DATA, $ = id => document.getElementById(id), vue = $("vue");
  const e = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const msg = t => { const m = $("msg"); if (m) m.textContent = t; };
  const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const dh = d => { d = new Date(d); return (d.getDate() === 1 ? "1er" : d.getDate()) + " " + MOIS[d.getMonth()] + ", " + d.getHours() + " h " + String(d.getMinutes()).padStart(2, "0"); };
  const METIERS = { restaurant: "Restaurant", beaute: "Institut de beauté", sport: "Salle de sport ou studio", autre: "Autre commerce" };
  const INVITATION = { a_envoyer: "À envoyer", envoyee: "Envoyée", acceptee: "Acceptée", echec: "Échec" };
  const OFFRES = window.RENOM_OFFRES;
  $("demo").hidden = D.mode !== "demo";
  const entete = (titre, texte) => `<div class="entete"><p class="sur">Console</p><h1>${titre}</h1>${texte ? `<p class="chapo">${texte}</p>` : ""}</div>`;

  // ---------------- Navigation : barre latérale sur ordinateur, onglets du bas sur téléphone
  const trait = d => `<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ENTREES = [
    ["commerces", "Commerces", trait('<path d="M4 10l1.5-5h13L20 10"></path><path d="M5 10v10h14V10"></path><path d="M4 10h16M10 20v-5h4v5"></path>')],
    ["alertes", "Alertes", trait('<path d="M6 16v-5a6 6 0 0112 0v5l1.5 2.5h-15z"></path><path d="M10 21h4"></path>')],
    ["journal", "Journal", trait('<path d="M9 7h10M9 12h10M9 17h10M5 7h.01M5 12h.01M5 17h.01"></path>')],
    ["invitations", "Invitations", trait('<rect x="4" y="6" width="16" height="12" rx="2"></rect><path d="M4 8l8 6 8-6"></path>')],
    ["creer", "Créer", trait('<circle cx="12" cy="12" r="8"></circle><path d="M12 8.5v7M8.5 12h7"></path>')],
  ];
  const large = window.matchMedia("(min-width: 900px)"); let route = "commerces", connecte = false;
  function dessinerNav() {
    document.body.classList.toggle("hors-session", !connecte);
    const lat = $("lat"), haut = $("haut"), onglets = $("onglets"); lat.innerHTML = haut.innerHTML = onglets.innerHTML = "";
    if (!connecte) return;
    const lien = ([r, nom, icone], avecIcone) => `<a href="#/${r}" data-r="${r}"${r === route ? ' aria-current="page"' : ""}>${avecIcone ? `<span class="onglet-icone">${icone}</span>` : ""}<span>${nom}</span></a>`;
    if (large.matches) lat.innerHTML = `<div class="lat-in"><a class="logo" href="console.html">RENOM</a><nav id="nav" class="menu" aria-label="Console"><div class="groupe"><p class="groupe-lib">Console</p>${ENTREES.map(x => lien(x, false)).join("")}</div></nav><button type="button" id="sortir" class="quitter">Quitter</button></div>`;
    else { haut.innerHTML = `<a class="logo" href="console.html">RENOM</a><span class="haut-note">Console</span><button type="button" id="sortir" class="quitter">Quitter</button>`; onglets.innerHTML = ENTREES.map(x => lien(x, true)).join(""); }
  }

  async function refuse() { connecte = false; dessinerNav(); vue.innerHTML = `<div class="connexion"><div class="carte"><p class="logo">RENOM</p><div class="entete"><h1>Accès réservé</h1><p class="chapo">Cette console est réservée à l'administrateur de RENOM.</p></div><a class="bouton second plein" href="index.html">Retour à votre espace</a></div></div>`; }
  async function connexion() {
    connecte = false; dessinerNav();
    // Démonstration : l'adresse de l'administrateur vient de la graine chargée (parcours ou graine publique).
    const admins = D.mode === "demo" && D.comptesDemo ? (await D.comptesDemo()).filter(x => x.role === "administrateur").map(x => x.email) : [];
    vue.innerHTML = `<div class="connexion"><div class="carte"><p class="logo">RENOM</p><div class="entete"><h1>Console</h1><p class="chapo">Connexion de l'administrateur.</p></div>
      <form id="f"><div class="f"><label for="email">Adresse email</label><input id="email" type="email" autocomplete="email" required></div><button class="bouton plein" type="submit">Recevoir le lien</button><p class="msg" id="msg" role="status"></p></form>
      ${admins.length ? `<p class='note'>Démonstration : ${e(admins.join(", "))}.</p>` : ""}</div><p class="retour"><a href="index.html">Retour à l'espace</a></p></div>`;
    $("f").onsubmit = async ev => { ev.preventDefault(); try { const r = await D.envoyerLien($("email").value); if (D.mode === "demo") { await D.ouvrirLien(r.lien); rendre(); } else msg("Si ce compte existe, un lien vient de vous être envoyé."); } catch (er) { msg(er.message); } };
  }

  async function commerces() {
    const l = await D.adminCommerces();
    vue.innerHTML = `${entete("Commerces")}<p class="msg" id="msg" role="status"></p><section class="carte tableau"><table class="tab"><thead><tr><th>Commerce</th><th>Offre</th><th>Ce mois-ci</th><th>Comptes</th><th>Alertes</th><th>État</th></tr></thead><tbody>${l.map(c => {
      const k = c.compteur || {}, cc = Object.values(c.comptes || {}).filter(x => x.etat === "connecte").length;
      return `<tr data-id="${e(c.id)}"><td data-l="Commerce"><p class="fort">${e(c.nom)}</p><p class="note">${e(METIERS[c.metier] || "")}${c.ville ? ", " + e(c.ville) : ""}</p></td>
        <td data-l="Offre"><div class="pile serre"><select data-offre aria-label="Offre de ${e(c.nom)}">${Object.entries(OFFRES).map(([k2, o]) => `<option value="${k2}"${c.offre_id === k2 ? " selected" : ""}>${o.nom}</option>`).join("")}</select><button type="button" class="bouton second petit" data-a="offre">Changer l'offre</button></div></td>
        <td data-l="Ce mois-ci"><p>${k.publications_utilisees} sur ${k.publications_plafond} publications</p><p>${k.videos_utilisees} sur ${k.videos_plafond} vidéos</p></td><td data-l="Comptes">${cc} sur 4 connectés</td><td data-l="Alertes"><span class="${c.alertes ? "fort" : ""}">${c.alertes}</span></td>
        <td data-l="État"><div class="pile serre"><span class="etat${c.en_pause ? "" : " actif"}">${c.en_pause ? "En pause" : "Actif"}</span><button type="button" class="bouton second petit" data-a="pause">${c.en_pause ? "Reprendre" : "Mettre en pause"}</button></div></td></tr>`; }).join("")}</tbody></table></section>`;
    vue.querySelectorAll("tr[data-id]").forEach(tr => tr.addEventListener("click", async ev => {
      const b = ev.target.closest("[data-a]"); if (!b) return; const id = tr.dataset.id, c = l.find(x => x.id === id);
      try { if (b.dataset.a === "offre") await D.adminOffre(id, tr.querySelector("[data-offre]").value); else await D.adminPause(id, !c.en_pause); await commerces(); msg("Enregistré."); } catch (er) { msg(er.message); }
    }));
  }
  async function alertes() {
    const l = await D.adminAlertes();
    vue.innerHTML = `${entete("Alertes")}${l.length ? `<div class="pile">${l.map(a => `<article class="carte"><div class="carte-tete"><h2>${e(a.type)}</h2><span class="note">${dh(a.date)}</span></div><p class="fort">${e(a.commerce || "")}</p><p class="texte2 casse">${e(a.texte)}</p></article>`).join("")}</div>` : `<section class="carte"><p class="texte2">Aucune alerte.</p></section>`}`;
  }
  async function journal() {
    const l = await D.adminJournal();
    vue.innerHTML = `${entete("Journal de toutes les étapes")}<section class="carte"><div class="f etroit"><label for="filtre">Filtrer (commerce ou type)</label><input id="filtre" type="text"></div></section>
      <section class="carte tableau"><table class="tab"><thead><tr><th>Date</th><th>Commerce</th><th>Étape</th><th>Détail</th></tr></thead><tbody id="corps"></tbody></table></section>`;
    const dessiner = () => { const f = $("filtre").value.toLowerCase(); $("corps").innerHTML = l.filter(x => !f || (x.commerce + " " + x.type).toLowerCase().includes(f)).map(x => `<tr><td data-l="Date">${dh(x.cree_le)}</td><td data-l="Commerce">${e(x.commerce || "")}</td><td data-l="Étape"><span class="fort">${e(x.type)}</span></td><td data-l="Détail" class="note casse">${e(JSON.stringify(x.detail))}</td></tr>`).join(""); };
    $("filtre").oninput = dessiner; dessiner();
  }
  async function invitations() {
    const l = await D.adminInvitations();
    vue.innerHTML = `${entete("Invitations", "L'envoi réel du lien passe par le workflow n8n d'invitation (une exécution par invitation). En démonstration, rien n'est envoyé.")}${l.length ? `<section class="carte tableau"><table class="tab"><thead><tr><th>Date</th><th>Commerce</th><th>Email</th><th>État</th></tr></thead><tbody>${l.map(i => `<tr><td data-l="Date">${dh(i.cree_le)}</td><td data-l="Commerce">${e(i.commerce || "")}</td><td data-l="Email" class="casse">${e(i.email)}</td><td data-l="État">${INVITATION[i.statut] ? `<span class="fort">${INVITATION[i.statut]}</span> <span class="note">(${e(i.statut)})</span>` : e(i.statut)}</td></tr>`).join("")}</tbody></table></section>` : `<section class="carte"><p class="texte2">Aucune invitation.</p></section>`}`;
  }
  async function creer() {
    vue.innerHTML = `${entete("Créer un commerce et inviter son propriétaire")}<section class="carte formulaire"><form id="f"><div class="f"><label for="nom">Nom du commerce</label><input id="nom" type="text" required></div>
      <div class="champs deux"><div class="f"><label for="metier">Métier</label><select id="metier">${Object.entries(METIERS).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></div>
      <div class="f"><label for="offre">Offre</label><select id="offre">${Object.entries(OFFRES).map(([k, o]) => `<option value="${k}">${o.nom}</option>`).join("")}</select></div></div>
      <div class="f"><label for="email">Email du propriétaire</label><input id="email" type="email" required></div><button class="bouton" type="submit">Créer et inviter</button><p class="msg" id="msg" role="status"></p></form></section>`;
    $("f").onsubmit = async ev => { ev.preventDefault(); try { await D.adminCreer($("nom").value, $("metier").value, $("offre").value, $("email").value); msg("Commerce créé, invitation en attente d'envoi."); $("f").reset(); } catch (er) { msg(er.message); } };
  }
  const ROUTES = { commerces, alertes, journal, invitations, creer };
  let derniere = null;
  async function rendre() {
    const s = await D.session(); if (!s) return connexion();
    if (s.role !== "administrateur") return refuse();
    const r = location.hash.replace("#/", ""); route = ROUTES[r] ? r : "commerces"; connecte = true; dessinerNav();
    if (derniere !== route) window.scrollTo(0, 0); derniere = route;
    try { await ROUTES[route](); } catch (er) { vue.innerHTML = `<section class="carte"><h1>Un souci est survenu</h1><p>${e(er.message)}</p></section>`; }
  }
  document.addEventListener("click", async ev => { if (ev.target.closest("#sortir")) { await D.quitter(); location.hash = ""; rendre(); } });
  large.addEventListener("change", dessinerNav);
  window.addEventListener("hashchange", rendre); rendre();
})();
