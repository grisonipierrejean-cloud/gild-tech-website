// Page publique de dépôt d'avis (avis.html#<jeton>). Ouverte par le client final d'un commerce, sans connexion.
// Règle de conformité : la page est la même pour tous. Ce script ne lit la note choisie que pour dessiner les étoiles,
// écrire « Votre note » et l'enregistrer avec un message privé. Il ne touche JAMAIS au lien Google après l'affichage.
(function () {
  const P = window.RENOM_PUBLIC, $ = id => document.getElementById(id);
  const jeton = decodeURIComponent(location.hash.replace(/^#\/?/, "")).trim();
  let note = null, envoye = false;

  // ---- Couleurs du commerce, avec garde-fous de lisibilité
  const HEX = /^#[0-9a-f]{6}$/i;
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  function appliquerCouleurs(co) {
    const r = document.documentElement.style, fond = HEX.test(co.fond || "") ? co.fond : null, texte = HEX.test(co.texte || "") ? co.texte : null, accent = HEX.test(co.accent || "") ? co.accent : null;
    if (fond && texte && contraste(fond, texte) >= 4.5) { r.setProperty("--fond", fond); r.setProperty("--texte", texte); }
    if (accent) {
      r.setProperty("--accent", accent); r.setProperty("--sur-accent", contraste(accent, "#FFFFFF") >= contraste(accent, "#0B0D12") ? "#FFFFFF" : "#0B0D12");
      r.setProperty("--etoile", contraste(accent, "#FFFFFF") >= 3 ? accent : "#0B0D12");
    }
  }

  function erreur(titre, texte) { $("chargement").hidden = true; $("page").hidden = true; $("erreur").hidden = false; $("erreur-titre").textContent = titre; $("erreur-texte").textContent = texte; }

  // ---- Les cinq étoiles : de vrais boutons, utilisables au clavier (Tab, Entrée, Espace, flèches)
  const etoiles = [...document.querySelectorAll(".etoile")];
  function choisir(n) {
    note = n;
    etoiles.forEach(b => { const i = +b.dataset.note; b.classList.toggle("pleine", i <= n); b.setAttribute("aria-pressed", i === n ? "true" : "false"); });
    $("etat-note").textContent = "Votre note : " + n + " sur 5.";
  }
  etoiles.forEach((b, i) => {
    b.addEventListener("click", () => choisir(+b.dataset.note));
    b.addEventListener("keydown", ev => {
      const d = ev.key === "ArrowRight" || ev.key === "ArrowUp" ? 1 : ev.key === "ArrowLeft" || ev.key === "ArrowDown" ? -1 : 0; if (!d) return;
      ev.preventDefault(); etoiles[Math.max(0, Math.min(4, i + d))].focus();
    });
  });

  // ---- Message privé
  const msg = t => { $("msg").textContent = t; };
  $("prive").addEventListener("click", () => {
    const z = $("zone-prive"), ouvrir = z.hidden; z.hidden = !ouvrir; $("prive").setAttribute("aria-expanded", ouvrir ? "true" : "false");
    if (ouvrir) $("message").focus();
  });
  $("zone-prive").addEventListener("submit", async ev => {
    ev.preventDefault(); if (envoye) return;
    if (!note) { msg("Choisissez d'abord une note, en haut de la page."); etoiles[0].focus(); return; }
    const b = $("envoyer"); b.disabled = true; msg("Envoi en cours.");
    try {
      await P.deposerRetour(jeton, { note, message: $("message").value, prenom: $("prenom").value });
      envoye = true; $("zone-prive").hidden = true; $("prive").hidden = true;
      msg("Merci. Votre message a été transmis au commerçant. Il n'est pas publié.");
    } catch (er) { b.disabled = false; msg(er && er.message ? er.message : "L'envoi n'a pas abouti. Réessayez dans un instant."); }
  });

  // ---- Chargement : nom, couleurs et lien d'avis du commerce, rien d'autre
  async function charger() {
    if (!P || !/^[0-9a-f]{32}$/.test(jeton)) return erreur("Ce lien n'est pas reconnu", "Demandez au commerce un nouveau lien ou scannez de nouveau son code.");
    let c;
    try { c = await P.avisPublic(jeton); } catch (er) { return erreur("La page n'a pas pu se charger", "Vérifiez votre connexion puis réessayez dans un instant."); }
    if (!c) return erreur("Ce lien n'est pas reconnu", "Demandez au commerce un nouveau lien ou scannez de nouveau son code.");
    // Sans lien Google utilisable, la page reste fermée : le message privé n'est jamais proposé seul.
    let lien = null; try { const u = new URL(String(c.lien_avis || "")); if (u.protocol === "https:") lien = u.href; } catch (er) {}
    if (!lien) return erreur("Cette page n'est pas encore active", "Le commerce n'a pas encore renseigné son lien d'avis Google.");
    appliquerCouleurs(c.couleurs || {});
    $("commerce").textContent = c.nom; document.title = "Votre avis, " + c.nom;
    $("google").href = lien;
    $("demo").hidden = P.mode !== "demo";
    $("chargement").hidden = true; $("page").hidden = false;
    compter("passage");
  }
  // ---- Mesure de la collecte : un passage au chargement, un clic vers la fiche au clic sur le bouton. On compte, sans rien
  // changer au bouton (ni texte, ni lien, ni style) et sans retarder l'ouverture : la page reste la même pour toutes les notes.
  const compter = type => { try { if (P.compterCollecte) P.compterCollecte(jeton, type).catch(() => {}); } catch (er) {} };
  $("google").addEventListener("click", () => compter("clic_google"));
  window.addEventListener("hashchange", () => location.reload());
  charger();
})();
