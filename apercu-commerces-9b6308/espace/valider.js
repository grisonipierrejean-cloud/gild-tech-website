// Page publique de validation par lien (valider.html#<jeton>), ouverte depuis l'email « ... attend votre accord ».
// Aucune connexion : le jeton suffit. Il ne sert qu'une fois et vaut 7 jours. Un avis sensible n'est jamais proposé ici.
// Démonstration : RENOM_PUBLIC est l'adaptateur de démonstration (stockage du navigateur). Supabase : fonctions publiques
// objet_par_jeton et valider_par_jeton (voir ordres/CONTRAT-MAJ-MEMBRE.md).
(function () {
  const P = window.RENOM_PUBLIC, M = window.RENOM_MAJ, $ = id => document.getElementById(id);
  const e = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const jeton = decodeURIComponent(location.hash.replace(/^#\/?/, "")).trim();
  const RES = { instagram: "Instagram", facebook: "Facebook", google: "Fiche Google", tiktok: "TikTok" };
  const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const date = d => { d = new Date(d); return (d.getDate() === 1 ? "1er" : d.getDate()) + " " + MOIS[d.getMonth()] + " à " + d.getHours() + " h " + String(d.getMinutes()).padStart(2, "0"); };
  const ETATS = {
    utilise: ["Ce lien a déjà servi", "Un lien de validation ne sert qu'une fois. Ouvrez votre espace pour voir où en est cet élément."],
    expire: ["Ce lien a expiré", "Un lien de validation vaut 7 jours. Ouvrez votre espace pour décider : rien n'a été publié sans vous."],
    traite: ["Déjà traité", "Cet élément a déjà été traité dans votre espace."],
    inconnu: ["Ce lien n'est pas reconnu", "Ouvrez votre espace pour retrouver ce qui attend votre accord."],
  };
  const etatDuMessage = m => { m = String(m || "").toLowerCase(); return /servi|utilis/.test(m) ? "utilise" : /expir/.test(m) ? "expire" : /trait/.test(m) ? "traite" : /reconnu|introuvable|inconnu/.test(m) ? "inconnu" : null; };
  const msg = t => { $("msg").textContent = t; };
  function erreur(cle, titre, texte) {
    const [t, x] = cle ? ETATS[cle] : [titre, texte];
    $("chargement").hidden = true; $("page").hidden = true; $("fait").hidden = true; $("erreur").hidden = false; $("erreur-titre").textContent = t; $("erreur-texte").textContent = x;
  }
  const FAIT = {
    approuve: ["Contenu approuvé", "Il est prêt à être programmé. Vous le retrouvez dans votre espace."],
    modification: ["Demande envoyée", "RENOM refait le contenu avec votre mot. Il vous sera proposé de nouveau."],
    refuse_contenu: ["Contenu refusé", "Il ne sera pas publié."],
    valide: ["Réponse validée", "Elle sera publiée sous l'avis, sur votre fiche Google."],
    refuse_avis: ["Réponse refusée", "Rien n'est publié. Vous pouvez traiter cet avis dans votre espace."],
    valide_commentaire: ["Réponse validée", "Elle sera publiée sous le commentaire. Tant que Meta n'a pas ouvert l'accès à RENOM, notre équipe la publie à la main, sous votre compte."],
    ignore: ["Pas de réponse", "Rien ne sera publié sous ce commentaire."],
  };
  let objet = null;
  async function decider(decision, texte) {
    const boutons = [...document.querySelectorAll("#decision button")]; boutons.forEach(b => { b.disabled = true; }); msg("Envoi en cours.");
    try {
      await P.validerParJeton(jeton, decision, texte);
      const [t, x] = FAIT[decision === "refuse" ? "refuse_" + objet : decision === "valide" && objet === "commentaire" ? "valide_commentaire" : decision];
      $("page").hidden = true; $("fait").hidden = false; $("fait-titre").textContent = t; $("fait-texte").textContent = x;
    } catch (er) {
      const cle = etatDuMessage(er && er.message); if (cle) return erreur(cle);
      boutons.forEach(b => { b.disabled = false; }); msg(er && er.message ? er.message : "L'envoi n'a pas abouti. Réessayez dans un instant.");
    }
  }
  function contenu(o) {
    const f = M.formatDe(o), vertical = f !== "publication";
    $("titre").textContent = f === "story" ? "Une story attend votre accord" : f === "video" ? "Une vidéo attend votre accord" : "Une publication attend votre accord";
    const visuel = o.video_url ? `<video class="visuel vertical" controls preload="metadata" poster="${e(o.visuel_url || "")}" src="${e(o.video_url)}"></video>`
      : o.visuel_url ? `<img class="visuel${vertical ? " vertical" : ""}" src="${e(o.visuel_url)}" alt="Visuel du contenu">` : `<p class="note">Aperçu du visuel non disponible ici : il est visible dans votre espace.</p>`;
    $("objet").innerHTML = `<section class="carte"><h2>Le visuel</h2>${visuel}</section>
      <section class="carte"><h2>La légende, réseau par réseau</h2><ul class="legendes">${M.reseauxPour(o).map(r => { const t = M.legendeDe(o, r); return `<li data-reseau="${r}"><span class="reseau">${RES[r]}</span><p class="texte">${e(t)}</p>${r === "google" && M.longueur(t) > M.LIMITE_GOOGLE ? `<p class="note">Trop long pour la fiche Google (1 500 caractères au plus).</p>` : ""}</li>`; }).join("")}</ul>
        <p class="note">Pour modifier une légende vous-même, ouvrez votre espace. Pour le visuel, demandez une modification à RENOM.</p></section>`;
    $("boutons").innerHTML = `<button type="button" class="bouton" id="approuver">Approuver</button><button type="button" class="bouton second" id="modifier">Demander une modification</button><button type="button" class="lien" id="refuser">Refuser</button>`;
    $("approuver").onclick = () => decider("approuve");
    $("refuser").onclick = () => decider("refuse");
    $("modifier").onclick = () => { $("boutons").hidden = true; $("zone-mot").hidden = false; $("mot").focus(); };
    $("annuler-mot").onclick = () => { $("boutons").hidden = false; $("zone-mot").hidden = true; msg(""); };
    $("envoyer-mot").onclick = () => { const t = $("mot").value.trim(); if (!t) { msg("Écrivez un mot pour dire ce qu'il faut modifier."); $("mot").focus(); return; } decider("modification", t); };
  }
  function avis(o) {
    $("titre").textContent = "Une réponse d'avis attend votre accord";
    const n = +o.note || 0;
    $("objet").innerHTML = `<section class="carte"><h2>L'avis</h2><p class="fort">${n} étoile${n > 1 ? "s" : ""} sur 5${o.auteur ? " · " + e(o.auteur) : ""}</p>${o.texte ? `<p class="citation">« ${e(o.texte)} »</p>` : `<p class="note">Note sans texte.</p>`}</section>
      <section class="carte"><div class="f"><label for="reponse">Réponse proposée, vous pouvez la modifier</label><textarea id="reponse" maxlength="4000">${e(o.reponse_proposee || "")}</textarea></div>
        <p class="note">Elle sera publiée sous l'avis, sur votre fiche Google, telle qu'elle est écrite ici.</p></section>`;
    $("boutons").innerHTML = `<button type="button" class="bouton" id="valider">Valider et publier</button><button type="button" class="lien" id="refuser">Refuser cette réponse</button>`;
    $("valider").onclick = () => { const t = $("reponse").value.trim(); if (!t) { msg("La réponse est vide."); $("reponse").focus(); return; } decider("valide", t); };
    $("refuser").onclick = () => decider("refuse");
  }
  // Réponse à un commentaire Instagram ou Facebook (jamais un commentaire sensible : la base ne crée pas de lien pour lui).
  function commentaire(o) {
    const reseau = { instagram: "Instagram", facebook: "Facebook" }[o.reseau] || "vos réseaux";
    $("titre").textContent = "Une réponse à un commentaire attend votre accord";
    $("objet").innerHTML = `<section class="carte"><h2>Le commentaire, sur ${e(reseau)}</h2>${o.auteur ? `<p class="fort">${e(o.auteur)}</p>` : ""}${o.texte ? `<p class="citation">« ${e(o.texte)} »</p>` : `<p class="note">Texte non disponible.</p>`}</section>
      <section class="carte"><div class="f"><label for="reponse">Réponse proposée, vous pouvez la modifier</label><textarea id="reponse" maxlength="1000">${e(o.reponse_proposee || "")}</textarea></div>
        <p class="note">Elle sera publiée sous le commentaire, telle qu'elle est écrite ici. RENOM n'y met que ce que contient votre fiche.</p></section>`;
    $("boutons").innerHTML = `<button type="button" class="bouton" id="valider">Valider la réponse</button><button type="button" class="lien" id="refuser">Ne pas répondre</button>`;
    $("valider").onclick = () => { const t = $("reponse").value.trim(); if (!t) { msg("La réponse est vide."); $("reponse").focus(); return; } decider("valide", t); };
    $("refuser").onclick = () => decider("ignore");
  }
  async function charger() {
    if (P) $("demo").hidden = P.mode !== "demo";
    if (!P || !P.objetParJeton || !/^[A-Za-z0-9_-]{16,128}$/.test(jeton)) return erreur("inconnu");
    let o;
    try { o = await P.objetParJeton(jeton); } catch (er) { const cle = etatDuMessage(er && er.message); return cle ? erreur(cle) : erreur(null, "La page n'a pas pu se charger", "Vérifiez votre connexion puis réessayez dans un instant."); }
    if (!o) return erreur("inconnu");
    if (o.etat && o.etat !== "a_valider") return erreur(ETATS[o.etat] ? o.etat : "inconnu");
    objet = o.objet === "avis" ? "avis" : o.objet === "commentaire" ? "commentaire" : "contenu";
    const nom = o.commerce || o.nom_commerce || o.nom || "";
    $("commerce").textContent = nom; document.title = "Valider" + (nom ? ", " + nom : "");
    if (objet === "avis") avis(o); else if (objet === "commentaire") commentaire(o); else contenu(o);
    $("expire").textContent = o.expire_le ? `Ce lien sert une seule fois. Il est valable jusqu'au ${date(o.expire_le)}.` : "Ce lien sert une seule fois.";
    $("chargement").hidden = true; $("page").hidden = false;
  }
  window.addEventListener("hashchange", () => location.reload());
  charger();
})();
