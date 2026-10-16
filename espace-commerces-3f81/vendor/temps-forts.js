// Idée de la semaine : temps forts du calendrier (moteur/temps_forts/temps-forts.json) et météo du lendemain (Open-Meteo, facultative).
// Recopié dans le nœud Code du workflow n8n hebdomadaire (n8n/build_automatisations.py), avec les données JSON placées devant
// (« const DONNEES = {...} »), et copié tel quel dans espace/web/vendor/ pour la démonstration. Testé par moteur/tests/test_service.js.
// Dates en calendrier civil (aucune heure, aucun fuseau).
// Priorité : 1. un temps fort du métier annoncé 7 à 13 jours avant (préparer à l'avance) ; 2. un jour férié 2 à 8 jours avant (horaires) ;
// 3. la météo notable de demain (si l'option est active) ; 4. l'idée de la saison en cours. Les fenêtres font 7 jours : chaque date tombe dans
// la fenêtre d'un seul lundi, donc un temps fort n'est jamais proposé deux semaines de suite. Une idée par commerce et par semaine, « à valider ».
const JOURS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const J = (a, m, j) => new Date(Date.UTC(a, m - 1, j));
const iso = d => d.toISOString().slice(0, 10);
const plus = (d, n) => new Date(d.getTime() + n * 86400000);
const deIso = s => { const [a, m, j] = String(s).split("-").map(Number); return J(a, m, j); };
const jourSemaine = d => d.getUTCDay() === 0 ? 7 : d.getUTCDay();          // 1 = lundi ... 7 = dimanche (ISO)
const enLettres = d => `${JOURS_FR[d.getUTCDay()]} ${d.getUTCDate() === 1 ? "1er" : d.getUTCDate()} ${MOIS_FR[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

// Dimanche de Pâques (calendrier grégorien) : algorithme anonyme de Meeus, Jones et Butcher.
function paques(an) {
  const a = an % 19, b = Math.floor(an / 100), c = an % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
  return J(an, mois, jour);
}
// n-ième jour de la semaine (1 = lundi ... 7 = dimanche) d'un mois ; rang -1 = le dernier.
function nIeme(an, mois, js, rang) {
  if (rang > 0) { const p = J(an, mois, 1); return plus(p, ((js - jourSemaine(p) + 7) % 7) + 7 * (rang - 1)); }
  const fin = new Date(Date.UTC(an, mois, 0));                               // jour 0 du mois suivant = dernier jour du mois
  return plus(fin, -((jourSemaine(fin) - js + 7) % 7));
}
function dateDe(regle, an) {
  let d;
  if (regle.type === "fixe") d = J(an, regle.mois, regle.jour);
  else if (regle.type === "paques") d = paques(an);
  else if (regle.type === "n_ieme") d = nIeme(an, regle.mois, regle.jour_semaine, regle.rang);
  else if (regle.type === "jour_semaine_apres") { const p = J(an, regle.mois, regle.a_partir_du); d = plus(p, (regle.jour_semaine - jourSemaine(p) + 7) % 7); }
  else if (regle.type === "fete_des_meres") { const der = nIeme(an, 5, 7, -1), pentecote = plus(paques(an), 49); d = iso(der) === iso(pentecote) ? plus(der, 7) : der; }
  else throw new Error("règle inconnue : " + regle.type);
  return plus(d, regle.decalage || 0);
}
// Temps forts d'un métier entre deux dates (incluses), triés par date.
function tempsForts(D, metier, debut, fin) {
  const r = [];
  for (const an of new Set([debut.getUTCFullYear(), fin.getUTCFullYear()]))
    for (const ev of D.evenements) if (ev.metiers.includes(metier)) { const d = dateDe(ev.regle, an); if (d >= debut && d <= fin) r.push({ ev, date: d }); }
  return r.sort((a, b) => a.date - b.date || a.ev.id.localeCompare(b.ev.id));
}
// Prévision Open-Meteo (réponse JSON de /v1/forecast avec daily=temperature_2m_max,precipitation_sum) -> catégorie du lendemain ou null.
function meteoDuLendemain(D, reponse, demain) {
  const dl = reponse && reponse.daily; if (!dl || !Array.isArray(dl.time)) return null;
  const k = dl.time.indexOf(demain); if (k < 0) return null;
  const tmax = Number(dl.temperature_2m_max && dl.temperature_2m_max[k]), pluie = Number(dl.precipitation_sum && dl.precipitation_sum[k]);
  if (!Number.isFinite(tmax) || !Number.isFinite(pluie)) return null;
  const s = D.meteo.seuils;
  const categorie = pluie >= s.pluie_min_mm ? "pluie" : tmax >= s.chaleur_tmax_min && pluie < s.chaleur_pluie_max ? "chaleur" : tmax <= s.froid_tmax_max ? "froid" : null;
  return categorie ? { categorie, tmax, pluie, date: demain } : null;
}
function saisonDe(D, d) {
  const an = d.getUTCFullYear(), debuts = D.saisons.map(s => ({ s, d: J(an, s.debut.mois, s.debut.jour) })).sort((a, b) => a.d - b.d);
  const avant = debuts.filter(x => x.d <= d); return (avant.length ? avant[avant.length - 1] : debuts[debuts.length - 1]).s;   // avant le 1er mars : l'hiver commencé en décembre
}
// L'idée de la semaine d'un commerce. lundi : « AAAA-MM-JJ » (un lundi) ; meteo : réponse Open-Meteo ou null (option désactivée, position inconnue).
// Rend { titre, texte, origine, motif, date_evenement } : motif est un fait daté et vérifiable, jamais un chiffre inventé.
function ideeDeLaSemaine(D, commerce, lundi, meteo, ville) {
  const L = deIso(lundi); if (jourSemaine(L) !== 1) throw new Error("la semaine se désigne par son lundi");
  const metier = D.metiers.includes(commerce.metier) ? commerce.metier : "autre";
  const [a0, a1] = D.fenetre_defaut, [f0, f1] = D.fenetre_ferie;
  const candidats = [...tempsForts(D, metier, plus(L, a0), plus(L, a1)).filter(x => !x.ev.ferie), ...tempsForts(D, metier, plus(L, f0), plus(L, f1)).filter(x => x.ev.ferie)];
  if (candidats.length) {
    const { ev, date } = candidats[0];
    const idee = ev.ferie ? { titre: D.idee_ferie.titre, texte: D.idee_ferie.texte.replace("{jour}", enLettres(date).replace(/ \d{4}$/, "") + " (" + ev.nom.replace(/ \(jour férié\)$/, "") + ")") } : ev.idee;
    return { titre: idee.titre, texte: idee.texte, origine: "calendrier", motif: `${ev.nom} : ${enLettres(date)}`, date_evenement: iso(date) };
  }
  const demain = iso(plus(L, 1)), m = meteo ? meteoDuLendemain(D, meteo, demain) : null;
  if (m) {
    const idee = D.meteo.idees[m.categorie][metier];
    const pluie = m.pluie >= 1 ? `${String(Math.round(m.pluie * 10) / 10).replace(".", ",")} mm de pluie` : "sans pluie";
    return { titre: idee.titre, texte: idee.texte, origine: "meteo", motif: `Prévision Open-Meteo pour ${enLettres(deIso(demain))}${ville ? " à " + ville : ""} : ${Math.round(m.tmax)} °C au plus, ${pluie}`, date_evenement: demain };
  }
  const s = saisonDe(D, L), idee = s.idees[metier];
  return { titre: idee.titre, texte: idee.texte, origine: "saison", motif: `Saison en cours : ${s.nom} (saison météorologique)`, date_evenement: null };
}
// Adresse de la prévision. Usage commercial : point d'accès client payant (customer-api.open-meteo.com, clé API), voir ordres/BRANCHEMENT.md.
function urlMeteo(lat, lon, cle) {
  if (lat == null || lon == null || lat === "" || lon === "" || !Number.isFinite(+lat) || !Number.isFinite(+lon)) return null;
  const q = `latitude=${(+lat).toFixed(4)}&longitude=${(+lon).toFixed(4)}&daily=temperature_2m_max,precipitation_sum&timezone=Europe%2FParis&forecast_days=3`;
  return cle ? `https://customer-api.open-meteo.com/v1/forecast?${q}&apikey=${encodeURIComponent(cle)}` : null;   // jamais l'adresse gratuite (usage non commercial)
}
// Lundi de la semaine en cours, heure de Paris.
function lundiDeParis(maintenant) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(maintenant || new Date()).map(x => [x.type, x.value]));
  const d = J(+p.year, +p.month, +p.day); return iso(plus(d, 1 - jourSemaine(d)));
}

// Node (tests) : export ; navigateur (démonstration de l'espace, copie dans espace/web/vendor/) : fonctions globales ; n8n : ligne retirée à la copie.
if (typeof module === "object" && module.exports) module.exports = { paques, nIeme, dateDe, tempsForts, meteoDuLendemain, ideeDeLaSemaine, urlMeteo, lundiDeParis, saisonDe, iso, deIso, enLettres };
