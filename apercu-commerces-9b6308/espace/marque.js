// Kit de marque dans l'espace (écran « Votre style ») : proposition de couleurs à partir d'un logo, contrôle du kit, aperçus des 3 gabarits.
// Même calcul que moteur/marque.py (regroupement de couleurs en entiers, contraste WCAG 2, couple de polices selon le métier et le ton) :
// sur les mêmes pixels, même kit (test de parité moteur/tests/test_marque_parite.js). Même contrôle que la fonction SQL marque_fautes.
// Les aperçus sont dessinés ici (canvas) avec les règles de moteur/gabarits.py et les mêmes fichiers de polices : ils servent à choisir.
// Le visuel publié est rendu par le moteur ; de petits écarts de rendu du texte (moteur de polices du navigateur) restent possibles.
// Aucune bibliothèque, aucun service externe. Utilisable dans le navigateur (window.RENOM_MARQUE) et dans Node (require).
(function (racine) {
  const STYLES_PHOTO = ["lumineux", "chaleureux", "sombre_contraste", "naturel"], GABARITS = ["plein", "editorial", "annonce"];
  const CLES = ["version", "verrouille", "verrouille_le", "auto", "source", "logo", "logo_fond", "couleurs", "palette", "couple", "police_titres", "police_texte",
    "style_photo", "gabarit_prefere", "gabarit_impose", "mots_signature", "a_eviter", "maj"];
  const MAX_MOTS = 5, MAX_EVITER = 10, MAX_CAR = 60, CONTRASTE_TEXTE = 4.5, CONTRASTE_GRAPHIQUE = 3;
  const STYLE_METIER = { restaurant: "chaleureux", beaute: "lumineux", sport: "naturel", autre: "naturel" };

  // ---------------------------------------------------------------- Couleurs
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const hexa = c => "#" + c.map(x => x.toString(16).padStart(2, "0")).join("").toUpperCase();
  const estHexa = v => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const contraste = (a, b) => { a = typeof a === "string" ? rgb(a) : a; b = typeof b === "string" ? rgb(b) : b; const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const div = (s, n) => Math.floor((2 * s + n) / (2 * n));
  const melange = (a, b, pm) => a.map((x, i) => Math.floor((x * (1000 - pm) + b[i] * pm + 500) / 1000));
  const chroma = c => Math.max(...c) - Math.min(...c);
  const dist2 = (a, b) => a.reduce((s, x, i) => s + (x - b[i]) * (x - b[i]), 0);
  const cmpTuple = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const x = a[i], y = b[i]; if (Array.isArray(x)) { const r = cmpTuple(x, y); if (r) return r; } else if (x !== y) return x < y ? -1 : 1; } return 0; };
  const maxPar = (l, cle) => l.reduce((m, x) => m === null || cmpTuple(cle(x), cle(m)) > 0 ? x : m, null);
  const minPar = (l, cle) => l.reduce((m, x) => m === null || cmpTuple(cle(x), cle(m)) < 0 ? x : m, null);

  // ---------------------------------------------------------------- Regroupement de couleurs (mêmes règles que moteur/marque.py)
  function echantillons(data, w, h) {
    const pas = Math.max(1, Math.floor(Math.max(w, h) / 96)), out = [];
    for (let y = 0; y < h; y += pas) for (let x = 0; x < w; x += pas) {
      const i = (y * w + x) * 4;
      out.push([data[i], data[i + 1], data[i + 2], data[i + 3], x === 0 || y === 0 || x + pas >= w || y + pas >= h]);
    }
    return out;
  }
  function regrouper(ech, seuil = 48, maxGroupes = 8) {
    const seaux = new Map();
    for (const [r, g, b, a] of ech) {
      if (a < 128) continue;
      const k = (r >> 4) << 8 | (g >> 4) << 4 | (b >> 4), s = seaux.get(k) || [0, 0, 0, 0];
      s[0]++; s[1] += r; s[2] += g; s[3] += b; seaux.set(k, s);
    }
    const groupes = [], centre = g => [div(g[1], g[0]), div(g[2], g[0]), div(g[3], g[0])];
    for (const [, [n, sr, sg, sb]] of [...seaux.entries()].sort((x, y) => (y[1][0] - x[1][0]) || (x[0] - y[0]))) {
      const c = [div(sr, n), div(sg, n), div(sb, n)];
      let meilleur = null, md = null;
      for (const g of groupes) { const d = dist2(c, centre(g)); if ((d <= seuil * seuil || groupes.length >= maxGroupes) && (md === null || d < md)) { meilleur = g; md = d; } }
      if (meilleur === null) groupes.push([n, sr, sg, sb]);
      else { meilleur[0] += n; meilleur[1] += sr; meilleur[2] += sg; meilleur[3] += sb; }
    }
    return groupes.map(g => [centre(g), g[0]]).sort((x, y) => (y[1] - x[1]) || cmpTuple(x[0], y[0]));
  }
  function fondDuLogo(ech, groupes) {
    const bord = ech.filter(e => e[4]), opaques = bord.filter(e => e[3] >= 128);
    if (!bord.length || opaques.length * 10 < bord.length * 6 || !groupes.length) return null;
    const seaux = new Map();
    for (const [r, g, b] of opaques) { const k = (r >> 4) << 8 | (g >> 4) << 4 | (b >> 4); seaux.set(k, (seaux.get(k) || 0) + 1); }
    const k = [...seaux.entries()].sort((x, y) => (y[1] - x[1]) || (x[0] - y[0]))[0][0];
    const c = [(k >> 8) * 16 + 8, ((k >> 4) & 15) * 16 + 8, (k & 15) * 16 + 8];
    return minPar(groupes, g => [dist2(g[0], c), g[0]])[0];
  }

  // ---------------------------------------------------------------- Proposition
  const sansAccents = t => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const tonCle = ton => { const t = sansAccents(ton); return t.includes("sobre") ? "sobre" : (t.includes("enjou") || t.includes("ludique")) ? "enjoue" : t.includes("chaleur") ? "chaleureux" : "_"; };
  const couplePropose = (cat, metier, ton) => { const p = cat.propositions[metier] || cat.propositions.autre; return p[tonCle(ton)] || p._; };
  function styleDesPhotos(ech) {
    const px = ech.filter(e => e[3] >= 128); if (!px.length) return "naturel";
    const n = px.length; let l = 0, ch = 0;
    for (const [r, g, b] of px) { l += 2126 * r + 7152 * g + 722 * b; if (r >= g && g > b) ch += r - b; }
    l = Math.floor(l / n); ch = Math.floor(ch * 1000 / (n * 255));
    if (l < 841500) return "sombre_contraste";
    if (l > 1581000 && ch < 120) return "lumineux";
    if (ch >= 100) return "chaleureux";
    return "naturel";
  }
  function couleursLisibles(c) {
    c = { ...c };
    if (contraste(c.texte, c.fond) < CONTRASTE_TEXTE) c.texte = contraste("#111111", c.fond) >= contraste("#FFFFFF", c.fond) ? "#111111" : "#FFFFFF";
    return c;
  }
  // logo : {data, w, h} (pixels RGBA) ou null ; photos : liste de {data, w, h}. cat : polices/couples.json.
  function proposer({ logo = null, photos = [], metier = "autre", ton = "", logoChemin = null, sourcePhotos = [], cat }) {
    let ech = [], groupes = [], fondLogo = null, source;
    if (logo) { ech = echantillons(logo.data, logo.w, logo.h); groupes = regrouper(ech); fondLogo = fondDuLogo(ech, groupes); source = { type: "logo" }; }
    else if (photos.length) { ech = photos.flatMap(p => echantillons(p.data, p.w, p.h)); groupes = regrouper(ech); source = { type: "photos", photos: [...sourcePhotos] }; }
    else source = { type: "defaut" };
    const pareil = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
    const total = groupes.filter(([c]) => !pareil(c, fondLogo)).reduce((s, [, n]) => s + n, 0);
    const cands = groupes.filter(([c, n]) => !pareil(c, fondLogo) && n * 100 >= Math.max(1, total) * 3);
    const score = ([c, n]) => [chroma(c) * Math.sqrt(n), -(c[0] + c[1] + c[2])];
    const chromatiques = cands.filter(([c]) => chroma(c) >= 40);
    let principale = chromatiques.length ? maxPar(chromatiques, score)[0] : cands.length ? minPar(cands, ([c]) => [lum(c), c])[0] : [31, 31, 31];
    const autres = cands.filter(([c]) => dist2(c, principale) >= 3600 && lum(c) < 0.8 && (!!logo || chroma(c) >= 40));
    const secondaire = autres.length ? maxPar(autres, ([c, n]) => [(chroma(c) + 30) * Math.sqrt(n), -(c[0] + c[1] + c[2])])[0]
      : melange(principale, lum(principale) > 0.2 ? [0, 0, 0] : [255, 255, 255], 450);
    const fond = fondLogo && lum(fondLogo) >= 0.8 ? fondLogo : melange(principale, [255, 255, 255], 940);
    if (!logo && groupes.length) for (let i = 0; i < 20 && contraste(principale, fond) < CONTRASTE_GRAPHIQUE; i++) principale = melange(principale, [0, 0, 0], 100);
    const texte = melange(principale, [0, 0, 0], 820);
    const couple = couplePropose(cat, metier, ton), cp = cat.couples.find(x => x.id === couple);
    return { version: 0, auto: true, verrouille: false, source, logo: logoChemin, logo_fond: fondLogo ? hexa(fondLogo) : (logo ? "transparent" : null),
      couleurs: couleursLisibles({ principale: hexa(principale), secondaire: hexa(secondaire), fond: hexa(fond), texte: hexa(texte) }),
      palette: groupes.slice(0, 6).map(([c]) => hexa(c)), couple, police_titres: cp.titres, police_texte: cp.texte,
      style_photo: (!logo && groupes.length) ? styleDesPhotos(ech) : (STYLE_METIER[metier] || "naturel"),
      gabarit_prefere: null, gabarit_impose: false, mots_signature: [], a_eviter: [] };
  }
  function defaut(couleurs, metier, ton, cat) {
    const c = couleurs || {}, k = proposer({ metier, ton, cat });
    return { ...k, couleurs: couleursLisibles({ principale: c.accent || "#2438FF", secondaire: c.accent || "#2438FF", fond: c.fond || "#FFFFFF", texte: c.texte || "#000000" }),
      couple: "franc", police_titres: "bricolage", police_texte: "figtree", palette: [] };
  }
  // Kit complet et sûr (toute valeur hors liste remplacée par la valeur par défaut), comme marque.normaliser du moteur.
  function normaliser(m, couleurs, metier, ton, cat) {
    const base = defaut(couleurs, metier, ton, cat);
    if (!m || typeof m !== "object") return base;
    const k = { ...base }; CLES.forEach(x => { if (x in m && m[x] != null) k[x] = m[x]; });
    const cc = m.couleurs && typeof m.couleurs === "object" ? m.couleurs : {};
    k.couleurs = couleursLisibles(Object.fromEntries(["principale", "secondaire", "fond", "texte"].map(x => [x, estHexa(cc[x]) ? cc[x].toUpperCase() : base.couleurs[x]])));
    if (!(k.police_titres in cat.familles)) k.police_titres = base.police_titres;
    if (!cat.textes.includes(k.police_texte)) k.police_texte = base.police_texte;
    if (!STYLES_PHOTO.includes(k.style_photo)) k.style_photo = base.style_photo;
    if (!GABARITS.includes(k.gabarit_prefere)) k.gabarit_prefere = null;
    k.gabarit_impose = !!k.gabarit_impose && k.gabarit_prefere !== null;
    [["mots_signature", MAX_MOTS], ["a_eviter", MAX_EVITER]].forEach(([x, n]) => { k[x] = (Array.isArray(k[x]) ? k[x] : []).map(s => String(s).trim().slice(0, MAX_CAR)).filter(Boolean).slice(0, n); });
    k.version = +m.version || 0; k.verrouille = !!m.verrouille;
    return k;
  }
  // Fautes d'un kit : mêmes règles que la fonction SQL marque_fautes (la base a le dernier mot). Messages en clés i18n (marque.f.*).
  function fautes(m, cid, cat) {
    const f = [];
    if (!m || typeof m !== "object" || Array.isArray(m)) return ["objet"];
    Object.keys(m).forEach(k => { if (!CLES.includes(k)) f.push("cle"); });
    const c = m.couleurs;
    if (!c || ["principale", "secondaire", "fond", "texte"].some(x => !estHexa(c[x]))) f.push("couleurs");
    else if (contraste(c.texte, c.fond) < CONTRASTE_TEXTE) f.push("contraste");
    if (!(m.police_titres in cat.familles)) f.push("police_titres");
    if (!cat.textes.includes(m.police_texte)) f.push("police_texte");
    if (!STYLES_PHOTO.includes(m.style_photo)) f.push("style_photo");
    if (m.gabarit_prefere != null && !GABARITS.includes(m.gabarit_prefere)) f.push("gabarit");
    const liste = (x, n) => x == null || (Array.isArray(x) && x.length <= n && x.every(s => typeof s === "string" && s.trim().length >= 1 && s.trim().length <= MAX_CAR));
    if (!liste(m.mots_signature, MAX_MOTS)) f.push("mots_signature");
    if (!liste(m.a_eviter, MAX_EVITER)) f.push("a_eviter");
    if (m.logo != null && !new RegExp("^" + cid + "/marque/[A-Za-z0-9._-]{1,80}\\.(png|jpg|jpeg|webp)$").test(m.logo)) f.push("logo");
    return [...new Set(f)];
  }
  const couleursCommerce = k => ({ fond: k.couleurs.fond, texte: k.couleurs.texte, accent: k.couleurs.principale });
  // Couleurs déjà choisies par le commerçant (différentes des couleurs par défaut du schéma) : gardées par une proposition tirée des photos,
  // comme dans le moteur (rendu_cloud.proposer_kit). Un logo déposé, lui, donne les couleurs de la marque.
  const COULEURS_DEFAUT = { fond: "#FFFFFF", texte: "#000000", accent: "#2438FF" };
  function garderCouleurs(kit, couleurs) {
    const c = couleurs || {};
    if (!c.fond || ["fond", "texte", "accent"].every(x => String(c[x] || "").toUpperCase() === COULEURS_DEFAUT[x])) return kit;
    return { ...kit, couleurs: couleursLisibles({ principale: c.accent, secondaire: kit.couleurs.secondaire, fond: c.fond, texte: c.texte }) };
  }
  // Logo accepté : PNG, SVG, JPEG, WebP, 5 Mo au plus. Rend le code de refus (clé i18n sty.logo.*) ou null.
  const TYPES_LOGO = ["image/png", "image/svg+xml", "image/jpeg", "image/webp"];
  const controlerLogo = f => !(TYPES_LOGO.includes(f.type) || /\.(png|svg|jpe?g|webp)$/i.test(f.name || "")) ? "format" : f.size > 5 * 1024 * 1024 ? "taille" : null;
  const estSvg = f => f.type === "image/svg+xml" || /\.svg$/i.test(f.name || "");
  // Comparaison de deux kits sans tenir compte de l'ordre des clés ni des champs posés par la base.
  const canon = o => JSON.stringify(o, (k, v) => v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(x => [x, v[x]])) : v);
  const sansBase = m => { const x = { ...m }; delete x.version; delete x.maj; delete x.verrouille_le; return x; };

  // ---------------------------------------------------------------- Navigateur : polices, images, aperçus
  let catalogue = null;
  async function charger(base = "") {
    if (catalogue) return catalogue;
    const r = await fetch(base + "fonts/couples.json", { cache: "no-cache" }); catalogue = await r.json();
    if (typeof FontFace === "function" && typeof document !== "undefined") {
      for (const [id, f] of Object.entries(catalogue.familles)) {
        const variable = !["dmserif", "zillaslab"].includes(id);
        const ff = new FontFace("RM-" + id, `url(${base}fonts/${f.fichier})`, { weight: variable ? "100 1000" : String(f.graisse_titre), display: "swap" });
        document.fonts.add(ff);
      }
    }
    return catalogue;
  }
  const policeTitre = (k, t) => `${(catalogue.familles[k.police_titres] || {}).graisse_titre || 700} ${t}px "RM-${k.police_titres}"`;
  const policeTexte = (k, t, g = 500) => `${g} ${t}px "RM-${k.police_texte}"`;
  async function polices(k) { if (typeof document === "undefined") return; await Promise.all([document.fonts.load(policeTitre(k, 60)), document.fonts.load(policeTexte(k, 30, 500)), document.fonts.load(policeTexte(k, 30, 700))]).catch(() => {}); }
  // Image d'une autre origine (adresse signée du stockage) : demandée en CORS pour que ses pixels restent lisibles (logo, extraction des couleurs).
  const chargerImage = src => new Promise((ok, ko) => { const i = new Image(); i.decoding = "async";
    if (/^https?:/.test(src) && typeof location !== "undefined" && !src.startsWith(location.origin)) i.crossOrigin = "anonymous";
    i.onload = () => ok(i); i.onerror = () => ko(new Error("image")); i.src = src; });
  function pixels(img, max = 0) {
    let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    if (max && Math.max(w, h) > max) { const r = max / Math.max(w, h); w = Math.round(w * r); h = Math.round(h * r); }
    const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h);
    return { data: x.getImageData(0, 0, w, h).data, w, h, canvas: c };
  }
  // Logo prêt à poser : marges transparentes retirées (comme marque.charger_logo), opacité et couleur moyenne connues.
  function preparerLogo(img) {
    const p = pixels(img, 1200); let x0 = p.w, y0 = p.h, x1 = -1, y1 = -1, minA = 255;
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) { const a = p.data[(y * p.w + x) * 4 + 3]; if (a >= 16) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; } }
    if (x1 < 0) { x0 = 0; y0 = 0; x1 = p.w - 1; y1 = p.h - 1; }
    const c = document.createElement("canvas"); c.width = x1 - x0 + 1; c.height = y1 - y0 + 1; c.getContext("2d").drawImage(p.canvas, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
    const q = document.createElement("canvas"); q.width = q.height = 32; const qx = q.getContext("2d", { willReadFrequently: true }); qx.drawImage(c, 0, 0, 32, 32);
    const d = qx.getImageData(0, 0, 32, 32).data; let n = 0, s = [0, 0, 0];
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < minA) minA = d[i + 3]; if (d[i + 3] >= 128) { n++; s[0] += d[i]; s[1] += d[i + 1]; s[2] += d[i + 2]; } }
    const all = c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data; let opaque = true;
    for (let i = 3; i < all.length; i += 4) if (all[i] < 250) { opaque = false; break; }
    return { canvas: c, opaque, couleur: n ? s.map(v => Math.floor(v / n)) : [0, 0, 0] };
  }
  // Un SVG est converti en PNG avant le dépôt (le moteur ne lit pas le SVG ; un SVG peut contenir du script).
  async function enPng(fichier, cote = 1024) {
    const url = URL.createObjectURL(fichier);
    try {
      const img = await chargerImage(url); let w = img.naturalWidth || cote, h = img.naturalHeight || cote; const r = cote / Math.max(w, h); w = Math.round(w * r); h = Math.round(h * r);
      const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h);
      return await new Promise(ok => c.toBlob(b => ok(b), "image/png"));
    } finally { URL.revokeObjectURL(url); }
  }

  // ---- Gabarits (4x5, 1080 x 1350) : règles de moteur/gabarits.py
  const W = 1080, H = 1350;
  const encreSur = (fond, c) => { for (const x of [rgb(c.texte), rgb(c.fond), [0, 0, 0], [255, 255, 255]]) if (contraste(x, fond) >= 4.5) return x; return [0, 0, 0]; };
  const couleurLibelle = (fond, c) => { for (const x of [c.secondaire, c.accent]) if (x && contraste(rgb(x), fond) >= 4.5) return rgb(x); return encreSur(fond, c); };
  const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  function coupe(x, texte, police, largeur) {
    x.font = police; const l = []; let cur = "";
    for (const mot of texte.split(/\s+/).filter(Boolean)) { const t = (cur + " " + mot).trim(); if (x.measureText(t).width <= largeur) cur = t; else { l.push(cur); cur = mot; } }
    if (cur) l.push(cur); return l;
  }
  function ajuste(x, texte, fab, largeur, tmax, tmin, lmax) {
    for (let t = tmax; t >= tmin; t -= 2) { const p = fab(t), L = coupe(x, texte, p, largeur); x.font = p; if (L.length <= lmax && L.every(l => x.measureText(l).width <= largeur)) return [p, t, L]; }
    const p = fab(tmin); return [p, tmin, coupe(x, texte, p, tmin === 0 ? 1 : largeur)];
  }
  function ecrire(x, t, px, py, police, couleur) { x.font = police; x.fillStyle = couleur; x.textBaseline = "alphabetic"; const m = x.measureText(t); x.fillText(t, px, py + (m.fontBoundingBoxAscent || 0)); }
  function capitales(x, t, px, py, police, couleur, suivi = 3) { x.font = police; for (const ch of t.toUpperCase()) { ecrire(x, ch, px, py, police, couleur); px += x.measureText(ch).width + suivi; } return px; }
  const largeurCap = (x, t, police, suivi = 3) => { x.font = police; return [...t.toUpperCase()].reduce((s, ch) => s + x.measureText(ch).width + suivi, 0); };
  function photoRect(x, img, dx, dy, dw, dh) {
    if (!img) { x.fillStyle = "#3A3C44"; x.fillRect(dx, dy, dw, dh); return; }
    const sw = img.naturalWidth || img.width, sh = img.naturalHeight || img.height, rs = sw / sh, rd = dw / dh;
    const cw = rs > rd ? sh * rd : sw, ch = rs > rd ? sh : sw / rd;
    x.drawImage(img, (sw - cw) * 0.5, (sh - ch) * 0.45, cw, ch, dx, dy, dw, dh);
  }
  function poserLogo(x, logo, k, droite, centre, hauteur, fond, largeurMax) {
    if (!logo) return null;
    const lw0 = logo.canvas.width, lh0 = logo.canvas.height, r = Math.min(hauteur / lh0, largeurMax / lw0);
    const lw = Math.max(1, Math.round(lw0 * r)), lh = Math.max(1, Math.round(lh0 * r)), px = droite - lw, py = Math.round(centre - lh / 2);
    let gauche = px;
    if (!logo.opaque && contraste(logo.couleur, fond) < 2) {
      const pastille = [rgb(k.couleurs.fond), rgb(k.couleurs.texte)].reduce((a, b) => contraste(b, logo.couleur) > contraste(a, logo.couleur) ? b : a);
      const pad = Math.max(6, Math.floor(hauteur / 6)); x.fillStyle = css(pastille); x.beginPath(); x.roundRect(px - pad, py - pad, lw + 2 * pad, lh + 2 * pad, pad); x.fill(); gauche = px - pad;
    }
    x.save();
    if (logo.opaque) { x.beginPath(); x.roundRect(px, py, lw, lh, Math.max(4, Math.floor(lh / 8))); x.clip(); }
    x.drawImage(logo.canvas, px, py, lw, lh); x.restore();
    return gauche;
  }
  // textes : {texte_visuel, accroche, annonce: [..]} ; photo : image ou null ; logo : preparerLogo(...) ou null.
  function dessiner(canvas, gabarit, { kit, nom, photo, logo, textes }) {
    canvas.width = W; canvas.height = H; const x = canvas.getContext("2d"), k = kit;
    const c = { fond: k.couleurs.fond, texte: k.couleurs.texte, accent: k.couleurs.principale, secondaire: k.couleurs.secondaire };
    const titre = t => policeTitre(k, t), corps = (t, g = 500) => policeTexte(k, t, g), fond = rgb(c.fond), accent = rgb(c.accent);
    x.clearRect(0, 0, W, H);
    if (gabarit === "plein") {
      photoRect(x, photo, 0, 0, W, H);
      const marge = 56, pad = 40, [pt, tt, lignes] = ajuste(x, textes.texte_visuel, titre, W - 2 * marge - 2 * pad, 84, 52, 3), pn = corps(26, 700);
      const ht = lignes.length * Math.floor(tt * 1.12), ch = pad + 30 + 18 + ht + pad, y0 = H - 140 - ch - 1;
      x.fillStyle = css(fond, 242 / 255); x.fillRect(marge, y0, W - 2 * marge + 1, ch + 1);
      x.fillStyle = css(accent); x.fillRect(marge, y0, 11, ch + 1);
      const ink = css(encreSur(fond, c)), gauche = poserLogo(x, logo, k, W - marge - pad, y0 + pad + 7, 46, fond, 240);
      if (gauche === null || marge + pad + largeurCap(x, nom, pn) + 24 <= gauche) capitales(x, nom, marge + pad, y0 + pad - 6, pn, css(couleurLibelle(fond, c)));
      let y = y0 + pad + 40; for (const l of lignes) { ecrire(x, l, marge + pad, y, pt, ink); y += Math.floor(tt * 1.12); }
    } else if (gabarit === "editorial") {
      const m = 56; x.fillStyle = css(fond); x.fillRect(0, 0, W, H);
      const ink = css(encreSur(fond, c)), pn = corps(24, 700), [pt, tt, lt] = ajuste(x, textes.texte_visuel, titre, W - 2 * m, 80, 48, 3), pp = corps(32, 500);
      const petit = coupe(x, textes.accroche, pp, W - 2 * m).slice(0, 3), hT = lt.length * Math.floor(tt * 1.1), hP = petit.length * Math.floor(32 * 1.4);
      const ph = H - 2 * m - (28 + 20 + hT + 24 + 2 + 22 + hP) - 32;
      photoRect(x, photo, m, m, W - 2 * m, ph);
      let y = m + ph + 32; const pl = couleurLibelle(fond, c), gauche = poserLogo(x, logo, k, W - m, y + 12, 44, fond, 240);
      if (gauche === null || m + largeurCap(x, nom, pn) + 24 <= gauche) capitales(x, nom, m, y, pn, css(pl));
      y += 48; for (const l of lt) { ecrire(x, l, m, y, pt, ink); y += Math.floor(tt * 1.1); }
      y += 24; x.fillStyle = css(pl); x.fillRect(m, y, W - 2 * m + 1, 3); y += 24;
      for (const l of petit) { ecrire(x, l, m, y, pp, ink); y += Math.floor(32 * 1.4); }
    } else {
      const m = 64, barre = 120; x.fillStyle = css(fond); x.fillRect(0, 0, W, H);
      const ink = css(encreSur(fond, c)), inkAcc = css(encreSur(accent, c)); x.fillStyle = css(accent); x.fillRect(0, 0, W, barre + 1);
      const pn = corps(30, 700), gauche = poserLogo(x, logo, k, W - m, barre / 2, 64, accent, 300);
      if (gauche === null || m + largeurCap(x, nom, pn, 4) + 24 <= gauche) capitales(x, nom, m, barre / 2 - 18, pn, inkAcc, 4);
      const [pt, tt, lt] = ajuste(x, textes.texte_visuel, titre, W - 2 * m, 120, 64, 4), pp = corps(36, 600);
      const info = (textes.annonce && textes.annonce.length ? textes.annonce : [textes.accroche]).slice(0, 4).flatMap(t => coupe(x, t, pp, W - 2 * m));
      const hT = lt.length * Math.floor(tt * 1.08), hI = info.length * Math.floor(36 * 1.5), photoH = H - barre - (56 + hT + 36 + hI + 40);
      let y = barre + 56; for (const l of lt) { ecrire(x, l, m, y, pt, ink); y += Math.floor(tt * 1.08); }
      y += 36; for (const l of info) { ecrire(x, l, m, y, pp, ink); y += Math.floor(36 * 1.5); }
      photoRect(x, photo, 0, H - photoH, W, photoH);
    }
  }

  const API = { STYLES_PHOTO, GABARITS, CLES, MAX_MOTS, MAX_EVITER, MAX_CAR, rgb, hexa, estHexa, lum, contraste, melange, echantillons, regrouper, fondDuLogo, tonCle, couplePropose,
    styleDesPhotos, couleursLisibles, proposer, defaut, normaliser, fautes, couleursCommerce, garderCouleurs, controlerLogo, estSvg, canon, sansBase, charger, polices, chargerImage, pixels, preparerLogo, enPng, dessiner,
    catalogue: () => catalogue, policeTitre, policeTexte };
  if (typeof module === "object" && module.exports) module.exports = API; else racine.RENOM_MARQUE = API;
})(typeof window !== "undefined" ? window : globalThis);
