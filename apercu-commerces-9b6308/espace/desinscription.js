// Page publique de désinscription (desinscription.html#<jeton>), lien obligatoire de chaque email adressé à un tiers :
// demande d'avis (client d'un commerçant) ou relance après l'audit gratuit (prospect). Aucune connexion : le jeton suffit.
// Rien n'est fait à l'ouverture : la personne confirme d'un clic. Démonstration : RENOM_PUBLIC est l'adaptateur de démonstration ;
// Supabase : fonctions publiques desinscription_info et se_desinscrire (bloc « Automatisations de service » de schema.sql).
(function () {
  const P = window.RENOM_PUBLIC, $ = id => document.getElementById(id);
  const jeton = decodeURIComponent(location.hash.replace(/^#\/?/, "")).trim();
  const textes = r => r.objet === "prospect"
    ? { emetteur: "RENOM", explication: "Vous avez demandé un audit de votre fiche Google sur le site de RENOM. Confirmez pour ne plus recevoir nos emails à ce sujet.",
        bouton: "Ne plus recevoir d'email de RENOM", fait: "RENOM ne vous écrira plus au sujet de votre audit." }
    : { emetteur: r.emetteur || "Ce commerce", explication: `${r.emetteur || "Ce commerce"} vous a demandé votre avis après votre visite. Confirmez pour ne plus recevoir de demande de sa part.`,
        bouton: "Ne plus recevoir de demande d'avis", fait: `Vous ne recevrez plus de demande d'avis de ${r.emetteur || "ce commerce"}.` };
  function erreur() { $("chargement").hidden = true; $("page").hidden = true; $("fait").hidden = true; $("erreur").hidden = false; }
  function fait(r) { $("chargement").hidden = true; $("page").hidden = true; $("erreur").hidden = true; $("fait").hidden = false; $("fait-texte").textContent = textes(r).fait; }
  async function charger() {
    $("demo").hidden = !P || P.mode !== "demo";
    if (!P || !P.desinscriptionInfo || !/^[0-9a-f]{32}$/.test(jeton)) return erreur();
    let r; try { r = await P.desinscriptionInfo(jeton); } catch (er) { return erreur(); }
    if (!r) return erreur();
    if (r.fait) return fait(r);
    const x = textes(r);
    $("emetteur").textContent = x.emetteur; $("explication").textContent = x.explication; $("confirmer").textContent = x.bouton; document.title = "Désinscription, " + x.emetteur;
    $("chargement").hidden = true; $("page").hidden = false;
    $("confirmer").onclick = async () => {
      $("confirmer").disabled = true; $("msg").textContent = "Enregistrement.";
      try { fait(await P.seDesinscrire(jeton) || r); } catch (er) { $("confirmer").disabled = false; $("msg").textContent = "L'enregistrement n'a pas abouti. Réessayez dans un instant."; }
    };
  }
  window.addEventListener("hashchange", () => location.reload());
  charger();
})();
