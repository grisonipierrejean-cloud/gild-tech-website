// Page publique de dépôt d'avis (avis.html#<jeton>). Ouverte par le client final d'un commerce, sans connexion.
// Règle de conformité : la page est la même pour tous. Ce script ne lit la note choisie que pour dessiner les étoiles,
// écrire « Votre note » et l'enregistrer avec un message privé. Il ne touche JAMAIS au lien Google après l'affichage.
(function () {
  const P = window.RENOM_PUBLIC, $ = id => document.getElementById(id);
  // Textes : espace/web/i18n.js. Langue : ?lang=, puis le choix enregistré, puis celle du commerce (connue au chargement), sinon le français.
  // La page reste la même pour toutes les notes, dans les deux langues : seule la langue change le texte, jamais la note.
  const I = window.RENOM_I18N, t = I.t;
  const jeton = decodeURIComponent(location.hash.replace(/^#\/?/, "")).trim();
  // Automatisations de service : page ouverte depuis l'email de demande d'avis (avis.html?source=email&envoi=<jeton>). Sert à la mesure
  // seulement ; la page, ses boutons et le lien Google restent exactement les mêmes.
  const q = new URLSearchParams(location.search), canal = q.get("source") === "email" && /^[0-9a-f]{32}$/.test(q.get("envoi") || "") ? { source: "email", envoi: q.get("envoi") } : null;
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
  const libellesEtoiles = () => etoiles.forEach(b => b.setAttribute("aria-label", t("etoiles", { n: +b.dataset.note })));
  libellesEtoiles();
  function choisir(n) {
    note = n;
    etoiles.forEach(b => { const i = +b.dataset.note; b.classList.toggle("pleine", i <= n); b.setAttribute("aria-pressed", i === n ? "true" : "false"); });
    $("etat-note").textContent = t("avis.pub.votre.note", { n });
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
    if (!note) { msg(t("avis.pub.note.dabord")); etoiles[0].focus(); return; }
    const b = $("envoyer"); b.disabled = true; msg(t("envoi.en.cours"));
    try {
      await P.deposerRetour(jeton, { note, message: $("message").value, prenom: $("prenom").value });
      envoye = true; $("zone-prive").hidden = true; $("prive").hidden = true;
      msg(t("avis.pub.merci"));
    } catch (er) { b.disabled = false; msg(er && er.message ? I.phrase(er.message) : t("pub.envoi.echec")); }
  });

  // ---- Chargement : nom, couleurs et lien d'avis du commerce, rien d'autre
  async function charger() {
    if (!P || !/^[0-9a-f]{32}$/.test(jeton)) return erreur(t("pub.lien.inconnu"), t("avis.pub.demander"));
    let c;
    try { c = await P.avisPublic(jeton); } catch (er) { return erreur(t("pub.chargement.echec"), t("pub.verifier.connexion")); }
    if (!c) return erreur(t("pub.lien.inconnu"), t("avis.pub.demander"));
    // Langue du commerce : par défaut, la page parle à ses clients dans leur langue (sauf ?lang= ou choix enregistré).
    I.depuisCommerce(c.langue); libellesEtoiles();
    // Sans lien Google utilisable, la page reste fermée : le message privé n'est jamais proposé seul.
    let lien = null; try { const u = new URL(String(c.lien_avis || "")); if (u.protocol === "https:") lien = u.href; } catch (er) {}
    if (!lien) return erreur(t("avis.pub.inactive"), t("avis.pub.inactive.texte"));
    appliquerCouleurs(c.couleurs || {});
    $("commerce").textContent = c.nom; document.title = t("avis.pub.titre.nom", { nom: c.nom });
    $("google").href = lien;
    $("demo").hidden = P.mode !== "demo";
    $("chargement").hidden = true; $("page").hidden = false;
    compter("passage");
  }
  // ---- Mesure de la collecte : un passage au chargement, un clic vers la fiche au clic sur le bouton. On compte, sans rien
  // changer au bouton (ni texte, ni lien, ni style) et sans retarder l'ouverture : la page reste la même pour toutes les notes.
  const compter = type => { try { if (P.compterCollecte) P.compterCollecte(jeton, type, canal).catch(() => {}); } catch (er) {} };
  $("google").addEventListener("click", () => compter("clic_google"));
  window.addEventListener("hashchange", () => location.reload());
  charger();
})();
