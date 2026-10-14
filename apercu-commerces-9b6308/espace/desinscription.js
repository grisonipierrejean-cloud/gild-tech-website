// Page publique de désinscription (desinscription.html#<jeton>), lien obligatoire de chaque email adressé à un tiers :
// demande d'avis (client d'un commerçant) ou relance après l'audit gratuit (prospect). Aucune connexion : le jeton suffit.
// Rien n'est fait à l'ouverture : la personne confirme d'un clic. Démonstration : RENOM_PUBLIC est l'adaptateur de démonstration ;
// Supabase : fonctions publiques desinscription_info et se_desinscrire (bloc « Automatisations de service » de schema.sql).
(function () {
  const P = window.RENOM_PUBLIC, $ = id => document.getElementById(id);
  // Textes : espace/web/i18n.js. Langue : ?lang=, puis le choix enregistré, puis celle du commerce qui écrit (prospect : RENOM, en français), sinon le français.
  const I = window.RENOM_I18N, t = I.t;
  const jeton = decodeURIComponent(location.hash.replace(/^#\/?/, "")).trim();
  const textes = r => r.objet === "prospect"
    ? { emetteur: "RENOM", explication: t("des.prospect.explication"), bouton: t("des.prospect.bouton"), fait: t("des.prospect.fait") }
    : { emetteur: r.emetteur || t("des.ce.commerce"), explication: t("des.explication", { e: r.emetteur || t("des.ce.commerce") }),
        bouton: t("des.bouton"), fait: t("des.fait.texte", { e: r.emetteur || t("des.ce.commerce.min") }) };
  function erreur() { $("chargement").hidden = true; $("page").hidden = true; $("fait").hidden = true; $("erreur").hidden = false; }
  function fait(r) { $("chargement").hidden = true; $("page").hidden = true; $("erreur").hidden = true; $("fait").hidden = false; $("fait-texte").textContent = textes(r).fait; }
  async function charger() {
    $("demo").hidden = !P || P.mode !== "demo";
    if (!P || !P.desinscriptionInfo || !/^[0-9a-f]{32}$/.test(jeton)) return erreur();
    let r; try { r = await P.desinscriptionInfo(jeton); } catch (er) { return erreur(); }
    if (!r) return erreur();
    if (r.objet !== "prospect") I.depuisCommerce(r.langue);
    if (r.fait) return fait(r);
    const x = textes(r);
    $("emetteur").textContent = x.emetteur; $("explication").textContent = x.explication; $("confirmer").textContent = x.bouton; document.title = t("des.titre.nom", { e: x.emetteur });
    $("chargement").hidden = true; $("page").hidden = false;
    $("confirmer").onclick = async () => {
      $("confirmer").disabled = true; $("msg").textContent = t("des.enregistrement");
      try { fait(await P.seDesinscrire(jeton) || r); } catch (er) { $("confirmer").disabled = false; $("msg").textContent = t("des.echec"); }
    };
  }
  window.addEventListener("hashchange", () => location.reload());
  charger();
})();
