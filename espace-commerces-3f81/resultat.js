// Page du lien « résultat » de l'email « Tournée du jour » (resultat.html?r=<résultat>#<jeton>), pour PJ : rien n'est fait à l'ouverture,
// le résultat proposé par le lien est présélectionné et PJ confirme. Démonstration : RENOM_PUBLIC est l'adaptateur de démonstration ;
// Supabase : fonctions publiques prospect_par_jeton et resultat_par_jeton (bloc « Prospection quotidienne » de schema.sql).
(function () {
  const P = window.RENOM_PUBLIC, $ = id => document.getElementById(id);
  const jeton = decodeURIComponent(location.hash.replace(/^#\/?/, "")).trim();
  const propose = new URLSearchParams(location.search).get("r");
  const NOMS = { rdv: "Rendez-vous", rappeler: "Rappeler", pilote: "Pilote signé", pas_interesse: "Pas intéressé", propose: "Proposé, aucun résultat noté" };
  const EFFETS = { rdv: "Les rappels s'arrêtent. Préparez le rendez-vous avec le script de l'appel de découverte.",
    rappeler: "Rappels annoncés dans l'email de la tournée à J+2, J+5 puis J+10. Aucun email au commerce.",
    pilote: "Le prospect sort de la tournée. Créez son invitation dans la console.",
    pas_interesse: "Les rappels s'arrêtent et l'entreprise (SIREN) entre dans la liste d'opposition : plus jamais proposée." };
  let choix = Object.keys(EFFETS).includes(propose) ? propose : null;
  function erreur(m) { $("chargement").hidden = true; $("page").hidden = true; $("fait").hidden = true; $("erreur").hidden = false; if (m) $("erreur-texte").textContent = m; }
  function choisir(r) {
    choix = r;
    document.querySelectorAll("[data-r]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.r === r)));
    $("effet").textContent = r ? EFFETS[r] : "Choisissez le résultat.";
    $("enregistrer").disabled = !r;
  }
  async function charger() {
    $("demo").hidden = !P || P.mode !== "demo";
    if (!P || !P.prospectParJeton || !/^[0-9a-f]{64}$/.test(jeton)) return erreur("Ce lien n'est pas reconnu.");
    let r; try { r = await P.prospectParJeton(jeton); } catch (er) { return erreur(er.message); }
    if (!r) return erreur("Ce lien n'est pas reconnu.");
    $("commerce").textContent = [r.commerce, [r.code_postal, r.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    $("contexte").textContent = `${r.canal === "appel" ? "Appel" : "Visite"} de la tournée. Résultat noté jusqu'ici : ${NOMS[r.resultat || "propose"] || r.resultat}. Ce lien sert une seule fois.`;
    document.title = "Résultat : " + (r.commerce || "prospect");
    $("chargement").hidden = true; $("page").hidden = false;
    document.querySelectorAll("[data-r]").forEach(b => b.onclick = () => choisir(b.dataset.r));
    choisir(choix);
    $("enregistrer").onclick = async () => {
      if (!choix) return;
      $("enregistrer").disabled = true; $("msg").textContent = "Enregistrement.";
      try {
        await P.resultatParJeton(jeton, choix, $("note").value.trim() || null);
        $("page").hidden = true; $("fait").hidden = false;
        $("fait-texte").textContent = `${r.commerce || "Prospect"} : ${NOMS[choix]}. ${EFFETS[choix]}`;
      } catch (er) { $("enregistrer").disabled = false; $("msg").textContent = er.message || "Le service ne répond pas. Réessayez dans un instant."; }
    };
  }
  window.addEventListener("hashchange", () => location.reload());
  charger();
})();
