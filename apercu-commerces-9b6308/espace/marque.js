// Kit de marque dans l'espace (écran « Votre style ») : proposition de couleurs à partir d'un logo, contrôle du kit, aperçus des 3 gabarits.
// Même calcul que moteur/marque.py (regroupement de couleurs en entiers, contraste WCAG 2, couple de polices selon le métier et le ton) :
// sur les mêmes pixels, même kit (test de parité moteur/tests/test_marque_parite.js). Même contrôle que la fonction SQL marque_fautes.
// Les aperçus sont dessinés ici (canvas) avec les règles de moteur/gabarits.py et les mêmes fichiers de polices : ils servent à choisir.
// Le visuel publié est rendu par le moteur ; de petits écarts de rendu du texte (moteur de polices du navigateur) restent possibles.
// Aucune bibliothèque, aucun service externe. Utilisable dans le navigateur (window.RENOM_MARQUE) et dans Node (require).
(function (racine) {
  const STYLES_PHOTO = ["lumineux", "chaleureux", "sombre_contraste", "naturel"], GABARITS = ["plein", "editorial", "annonce"];
  const CLES = ["version", "verrouille", "verrouille_le", "auto", "source", "logo", "logo_fond", "couleurs", "palette", "couple", "police_titres", "police_texte",
    "style_photo", "gabarit_prefere", "gabarit_impose", "mots_signature", "a_eviter", "maj", "valide_par"];
  const AUTEURS = ["commercant", "renom"];   // marque.valide_par : qui a enregistré le kit (posé par la base, voir admin_regler_marque dans schema.sql)
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
    if (m.valide_par != null && !AUTEURS.includes(m.valide_par)) f.push("valide_par");
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

  // ---------------------------------------------------------------- Écran du kit
  // Le style est créé par RENOM. Un seul écran, deux usages :
  //  * mode « renom » (console, panneau « Style du commerce ») : tous les réglages (logo, proposition de couleurs depuis le logo ou les photos,
  //    4 couleurs, polices, ambiance, modèle, expressions), aperçus, « Enregistrer » et « Enregistrer et valider pour le client » ;
  //  * mode « commercant » (espace, « Votre style ») : le style créé par RENOM montré sur ses photos, son logo à déposer, « Ça me plaît »,
  //    « Je voudrais un changement » (texte libre), et ses expressions en option repliée. Aucune couleur, police ni ambiance à choisir.
  // Libellés : clés « con.sty.* » en mode renom quand elles existent, sinon « sty.* ». Mêmes contrôles et mêmes aperçus pour les deux.
  // o = { vue, I (RENOM_I18N), mode, entete: c => html, commerce: async () => commerce,
  //       marque: async () => ({ kit, brut, photos: [{url, nom}], logo: url, demandes: [{texte, cree_le, traitee_le}] }),
  //       deposerLogo: async fichier => ({ chemin, url }), apres: async kit => {} (facultatif),
  //       renom : enregistrer: async (kit, valider) => kit ; commerçant : regler: async (changements, valider) => kit, demander: async texte => {} }
  function ecran(o) {
    const I = o.I, t = I.t, renom = o.mode === "renom", $ = id => document.getElementById(id);
    const tx = (cle, v, l) => t(renom && I.a("con." + cle) ? "con." + cle : cle, v, l);
    const e = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const msg = x => { const m = $("msg"); if (m) m.textContent = x; };
    const C4 = ["principale", "secondaire", "fond", "texte"];
    const sty = { pour: null, c: null, kit: null, brut: null, demandes: [], images: [], photo: 0, logo: null, logoImg: null, logoUrl: null, attente: 0, ouvert: false };
    const langueDe = c => I.langueValide(c && c.langue) || "fr";
    const nomCouple = c => I.langue === "en" ? c.en : c.nom;
    const ratio = r => I.nombre(Math.floor(r * 10) / 10, 1);
    const textesApercu = c => {
      const lg = langueDe(c), h = String(c.horaires || "").split("\n")[0].trim();
      return { texte_visuel: t("sty.exemple.titre", null, lg), accroche: t("sty.exemple.texte", null, lg), annonce: h && h.length <= 70 ? [h] : [] };
    };
    async function chargerLogo(url) { if (!url) return [null, null]; try { const img = await chargerImage(url); return [img, preparerLogo(img)]; } catch (er) { return [null, null]; } }
    // État du kit : [titre, texte]. valide_par (posé par la base) : qui a validé le kit verrouillé, ou qui l'a réglé en dernier ;
    // absent d'un ancien kit : le commerçant ; d'une proposition automatique : personne.
    function etat(k, b) {
      const src = (k.source && k.source.type) || (b && b.source && b.source.type) || "defaut", s = ["logo", "photos"].includes(src) ? src : "defaut";
      const valide = !!(b && b.verrouille), par = b ? (b.valide_par || (b.auto ? "auto" : "commercant")) : null, d = b ? I.date(b.verrouille_le || b.maj || Date.now()) : "";
      if (renom) {
        if (valide) return [t("con.sty.etat.valide." + (par === "renom" ? "renom" : "commercant"), { d }), t("con.sty.etat.valide.texte", { v: b.version })];
        if (b) return [t("con.sty.etat.nonvalide"), t("con.sty.etat.dernier." + par, { d: I.date(b.maj || Date.now()), v: b.version })];
        return [t("con.sty.etat.aucun"), t("con.sty.etat.propose." + s) + " " + t("con.sty.etat.aucun.suite")];
      }
      if (valide && par === "renom") return [t("sty.etat.pret"), t("sty.etat.pret.texte", { d, v: b.version })];
      if (valide) return [t("sty.etat.valide", { d }), t("sty.etat.valide.texte", { v: b.version })];
      if (par === "renom") return [t("sty.etat.renom"), t("sty.etat.renom.texte", { d })];
      return [t("sty.etat.preparation"), t("sty.etat.preparation.texte")];
    }
    async function dessinerTout() {
      const k = sty.kit, c = sty.c; if (!k || !$("sty-grille")) return;
      await polices(k);
      const photo = sty.images[sty.photo] || null, tx_ = textesApercu(c);
      GABARITS.forEach(g => { const cv = $("sty-apercu-" + g); if (cv) dessiner(cv, g, { kit: k, nom: c.nom, photo, logo: sty.logo, textes: tx_ }); });
      if (!renom) return;
      const r = contraste(k.couleurs.texte, k.couleurs.fond), lisible = r >= CONTRASTE_TEXTE;
      $("sty-contraste").innerHTML = `<span class="${lisible ? "" : "fort"}">${t(lisible ? "sty.contraste.ok" : "sty.contraste.ko", { r: ratio(r) })}</span>${lisible ? "" : ` <button type="button" class="bouton second petit" id="sty-corriger">${t("sty.contraste.corriger")}</button>`}`;
      if ($("sty-corriger")) $("sty-corriger").onclick = () => { sty.kit.couleurs = couleursLisibles(sty.kit.couleurs); majCouleurs(); redessiner(); };
      $("sty-valider").disabled = !lisible; $("sty-enregistrer").disabled = !lisible;
      $("sty-illisible").hidden = lisible;
    }
    const redessiner = () => { cancelAnimationFrame(sty.attente); sty.attente = requestAnimationFrame(() => { dessinerTout().catch(() => {}); }); };
    function majCouleurs() { C4.forEach(k => { const i = $("sty-c-" + k); if (i) i.value = sty.kit.couleurs[k].toLowerCase(); }); }
    const lignes = (id, n) => $(id).value.split("\n").map(x => x.trim()).filter(Boolean).slice(0, n).map(x => x.slice(0, MAX_CAR));
    const erreur = er => msg(er.codes ? t("sty.refus", { l: er.codes.map(x => t("sty.f." + x)).join(", ") }) : er.code ? t(er.code) : I.phrase(er.message));
    // ---- Morceaux communs
    const carteApercus = (k, STY_GAB, avecChoix, resume) => `<section class="carte" aria-labelledby="sty-apercus-titre"><div class="carte-tete"><h2 id="sty-apercus-titre">${tx("sty.apercus")}</h2></div>
        ${sty.images.length > 1 ? `<div class="sty-photos" role="group" aria-label="${t("sty.photo.choix")}">${sty.images.map((im, i) => `<button type="button" data-sty-photo="${i}" aria-pressed="${i === sty.photo}"><img src="${e(im.src)}" alt="${t("sty.photo.n", { n: i + 1 })}"></button>`).join("")}</div>` : ""}
        ${sty.images.length ? "" : `<p class="note">${tx("sty.sans.photo")}${renom ? "" : ` <a href="#/photos">${t("photos.deposer")}</a>`}</p>`}
        ${avecChoix ? `<fieldset class="sty-gabarits"><legend class="vh">${t("sty.gab.legende")}</legend><div class="sty-grille" id="sty-grille">${grille(k, STY_GAB, true)}</div>
          <label class="option"><input type="radio" name="sty-gab" value=""${k.gabarit_prefere ? "" : " checked"}><span>${t("sty.gab.varier")}</span></label>
          <label class="option"><input type="checkbox" id="sty-impose"${k.gabarit_impose ? " checked" : ""}${k.gabarit_prefere ? "" : " disabled"}><span>${t("sty.gab.impose")}</span></label>
          <p class="aide">${t("sty.gab.aide")}</p></fieldset>` : `<div class="sty-grille" id="sty-grille">${grille(k, STY_GAB, false)}</div>`}
        ${resume || ""}<p class="note">${tx("sty.apercus.note")}</p></section>`;
    const grille = (k, STY_GAB, avecChoix) => GABARITS.map(g => `<figure class="sty-apercu"><canvas id="sty-apercu-${g}" width="1080" height="1350" role="img" aria-label="${tx("sty.apercu.alt", { g: STY_GAB[g] })}"></canvas>
        <figcaption>${avecChoix ? `<label class="option"><input type="radio" name="sty-gab" value="${g}"${k.gabarit_prefere === g ? " checked" : ""}><span>${t("sty.gab.prefere", { g: STY_GAB[g] })}</span></label>` : `<span class="note">${STY_GAB[g]}</span>`}</figcaption></figure>`).join("");
    const carteLogo = k => `<section class="carte" aria-labelledby="sty-logo-titre"><h2 id="sty-logo-titre">${tx("sty.logo")}</h2>
        <div class="sty-logo" id="sty-logo">${sty.logoUrl ? `<img src="${e(sty.logoUrl)}" alt="${tx("sty.logo.alt")}">` : `<p class="texte2">${t("sty.logo.aucun")}</p>`}</div>
        <div class="actions"><span class="depot-choix"><input id="sty-logo-fichier" class="vh" type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp"><label for="sty-logo-fichier" class="bouton second">${tx(sty.logoUrl ? "sty.logo.changer" : "sty.logo.deposer")}</label></span>
          ${k.logo ? `<button type="button" class="lien" id="sty-logo-retirer">${t("sty.logo.retirer")}</button>` : ""}</div>
        <p class="aide">${tx("sty.logo.aide")}</p></section>`;
    const champsMots = (k, lc) => `<div class="f"><label for="sty-signature">${tx("sty.mots.signature")}</label><textarea id="sty-signature" rows="3"${lc}>${e((k.mots_signature || []).join("\n"))}</textarea><p class="aide">${t("sty.mots.signature.aide")}</p></div>
        <div class="f"><label for="sty-eviter">${t("sty.mots.eviter")}</label><textarea id="sty-eviter" rows="3"${lc}>${e((k.a_eviter || []).join("\n"))}</textarea><p class="aide">${t("sty.mots.eviter.aide")}</p></div>`;
    const listeDemandes = () => sty.demandes.length ? `<ul class="liste sty-demandes">${sty.demandes.slice(0, renom ? 10 : 3).map(x => `<li><p class="note">${t(x.traitee_le ? "sty.demande.traitee" : "sty.demande.attente", { d: I.date(x.cree_le), t: I.date(x.traitee_le || x.cree_le) })}</p><p class="casse">${e(x.texte)}</p></li>`).join("")}</ul>` : "";

    async function rendre() {
      const [c, cat] = await Promise.all([o.commerce(), charger()]);
      if (sty.pour !== c.id) {
        const m = await o.marque(); Object.assign(sty, { pour: c.id, brut: m.brut, photo: 0, logoUrl: m.logo, demandes: m.demandes || [] });
        sty.images = (await Promise.all((m.photos || []).map(p => chargerImage(p.url).catch(() => null)))).filter(Boolean);
        [sty.logoImg, sty.logo] = await chargerLogo(m.logo);
        // Pas encore de kit : proposition calculée ici depuis la première photo (même calcul que le moteur), sinon les couleurs actuelles.
        sty.kit = m.kit || (sty.images.length ? { ...garderCouleurs(proposer({ photos: [pixels(sty.images[0])], metier: c.metier, ton: c.ton || "", cat }), c.couleurs), version: 0 }
          : normaliser(null, c.couleurs, c.metier, c.ton || "", cat));
      }
      sty.c = c;
      const k = sty.kit, b = sty.brut, valide = !!(b && b.verrouille), [titreEtat, texteEtat] = etat(k, b), lgc = langueDe(c), lc = ` lang="${lgc}"`;
      const STY_GAB = I.carte("sty.gab", GABARITS), STY_SP = I.carte("sty.sp", STYLES_PHOTO), STY_C = I.carte("sty.c", C4);
      const attente = sty.demandes.filter(x => !x.traitee_le);
      const enTete = `${o.entete(c)}
        <section class="carte sty-etat${valide ? "" : " a-valider"}" id="sty-etat" aria-live="polite">
          <p class="fort">${titreEtat}</p><p class="texte2">${texteEtat}</p>
          ${attente.length ? `<p class="note" id="sty-demande-attente">${t(renom ? "con.sty.demandes.attente" : "sty.demande.transmise", { n: attente.length, d: I.date(attente[0].cree_le) })}</p>` : ""}</section>`;
      if (renom) {
        // Proposition automatique des couleurs : depuis le logo s'il y en a un, sinon depuis la photo affichée dans les aperçus.
        const depuis = sty.logoImg ? "logo" : sty.images.length ? "photo" : null;
        o.vue.innerHTML = `${enTete}
          ${sty.demandes.length ? `<section class="carte" aria-labelledby="sty-demandes-titre" id="sty-demandes"><h2 id="sty-demandes-titre">${t("con.sty.demandes")}</h2>${listeDemandes()}<p class="aide">${t("con.sty.demandes.aide")}</p></section>` : ""}
          <div class="colonnes sty">
            <div class="pile">
              ${carteApercus(k, STY_GAB, true)}
              <section class="carte" aria-labelledby="sty-couleurs-titre"><h2 id="sty-couleurs-titre">${tx("sty.couleurs")}</h2>
                <div class="coul sty-coul">${C4.map(x => `<div class="f"><input id="sty-c-${x}" type="color" value="${e(k.couleurs[x].toLowerCase())}"><label for="sty-c-${x}">${STY_C[x]}</label></div>`).join("")}</div>
                ${(k.palette || []).length ? `<div class="sty-palette"><p class="note">${t("sty.palette")}</p><div class="sty-pastilles">${k.palette.map(x => `<button type="button" data-sty-pastille="${e(x)}" style="background:${e(x)}" aria-label="${t("sty.palette.choisir", { c: e(x) })}" title="${e(x)}"></button>`).join("")}</div></div>` : ""}
                ${depuis ? `<div class="actions"><button type="button" class="bouton second petit" id="sty-proposer">${t("con.sty.proposer." + depuis)}</button></div>` : ""}
                <p class="texte2" id="sty-contraste" aria-live="polite"></p></section>
              <section class="carte" aria-labelledby="sty-polices-titre"><h2 id="sty-polices-titre">${tx("sty.polices")}</h2><p class="note">${t("sty.polices.note")}</p>
                <fieldset class="sty-couples"><legend class="vh">${tx("sty.polices")}</legend>${cat.couples.map(cp => `<label class="sty-couple"><input class="vh" type="radio" name="sty-couple" value="${cp.id}"${k.police_titres === cp.titres && k.police_texte === cp.texte ? " checked" : ""}>
                  <span class="sty-couple-nom" style="font-family:'RM-${cp.titres}';font-weight:${cat.familles[cp.titres].graisse_titre}">${e(nomCouple(cp))}</span>
                  <span class="sty-couple-ex" style="font-family:'RM-${cp.texte}';font-weight:500"${lc}>${t("sty.polices.exemple", { nom: e(c.nom) }, lgc)}</span>
                  <span class="note">${e(cat.familles[cp.titres].nom)}${cp.titres !== cp.texte ? " · " + e(cat.familles[cp.texte].nom) : ""}</span></label>`).join("")}</fieldset></section>
            </div>
            <div class="pile">
              ${carteLogo(k)}
              <section class="carte" aria-labelledby="sty-video-titre"><h2 id="sty-video-titre">${tx("sty.video")}</h2>
                <fieldset><legend class="vh">${tx("sty.video")}</legend>${STYLES_PHOTO.map(x => `<label class="option sty-option"><input type="radio" name="sty-sp" value="${x}"${k.style_photo === x ? " checked" : ""}><span><span>${STY_SP[x]}</span><span class="note">${t("sty.sp.note." + x)}</span></span></label>`).join("")}</fieldset>
                <p class="note">${t("sty.video.note")}</p></section>
              <section class="carte" aria-labelledby="sty-mots-titre"><h2 id="sty-mots-titre">${tx("sty.mots")}</h2>${champsMots(k, lc)}</section>
              <section class="carte sty-actions"><div class="actions"><button type="button" class="bouton" id="sty-valider">${t("con.sty.valider")}</button><button type="button" class="bouton second" id="sty-enregistrer">${t("con.sty.enregistrer")}</button></div>
                <p class="note" id="sty-illisible" hidden>${t("sty.illisible")}</p><p class="aide">${t("con.sty.valider.aide")}</p><p class="msg" id="msg" role="status"></p></section>
            </div>
          </div>`;
        C4.forEach(x => { $("sty-c-" + x).oninput = ev => { sty.kit.couleurs = { ...sty.kit.couleurs, [x]: ev.target.value.toUpperCase() }; redessiner(); }; });
        o.vue.querySelectorAll("[data-sty-pastille]").forEach(bt => bt.onclick = () => { sty.kit.couleurs = { ...sty.kit.couleurs, principale: bt.dataset.styPastille }; majCouleurs(); redessiner(); });
        o.vue.querySelectorAll("input[name=sty-couple]").forEach(i => i.onchange = () => { const cp = cat.couples.find(x => x.id === i.value); Object.assign(sty.kit, { couple: cp.id, police_titres: cp.titres, police_texte: cp.texte }); redessiner(); });
        o.vue.querySelectorAll("input[name=sty-gab]").forEach(i => i.onchange = () => { sty.kit.gabarit_prefere = i.value || null; $("sty-impose").disabled = !i.value; if (!i.value) { $("sty-impose").checked = false; sty.kit.gabarit_impose = false; } });
        $("sty-impose").onchange = () => { sty.kit.gabarit_impose = $("sty-impose").checked && !!sty.kit.gabarit_prefere; };
        o.vue.querySelectorAll("input[name=sty-sp]").forEach(i => i.onchange = () => { sty.kit.style_photo = i.value; });
        // Le texte en cours de saisie est gardé quand l'écran se redessine (logo, proposition de couleurs).
        const garderMots = () => { sty.kit.mots_signature = lignes("sty-signature", MAX_MOTS); sty.kit.a_eviter = lignes("sty-eviter", MAX_EVITER); };
        $("sty-logo-fichier").onchange = async () => {
          const f = $("sty-logo-fichier").files[0]; if (!f) return;
          try {
            const r = await o.deposerLogo(f), img = await chargerImage(r.url);
            const p = proposer({ logo: pixels(img), metier: c.metier, ton: c.ton || "", logoChemin: r.chemin, cat });
            garderMots(); Object.assign(sty.kit, { logo: r.chemin, logo_fond: p.logo_fond, couleurs: p.couleurs, palette: p.palette,
              source: { type: "logo", photos: (sty.kit.source && Array.isArray(sty.kit.source.photos) && sty.kit.source.photos) || [] } });
            sty.logoUrl = r.url; sty.logoImg = img; sty.logo = preparerLogo(img); await rendre(); msg(tx("sty.logo.lu"));
          } catch (er) { erreur(er); }
        };
        if ($("sty-proposer")) $("sty-proposer").onclick = async () => {
          const p = depuis === "logo" ? proposer({ logo: pixels(sty.logoImg), metier: c.metier, ton: c.ton || "", logoChemin: sty.kit.logo, cat })
            : proposer({ photos: [pixels(sty.images[sty.photo])], metier: c.metier, ton: c.ton || "", cat });
          // Les photos d'origine déjà connues du kit restent listées (aperçus de la démonstration, trace pour le moteur).
          const photosKit = (sty.kit.source && Array.isArray(sty.kit.source.photos) && sty.kit.source.photos) || [];
          garderMots(); Object.assign(sty.kit, { couleurs: p.couleurs, palette: p.palette, source: { type: depuis === "logo" ? "logo" : "photos", photos: photosKit } });
          if (depuis === "logo") sty.kit.logo_fond = p.logo_fond;
          await rendre(); msg(t("con.sty.propose.msg"));
        };
        if ($("sty-logo-retirer")) $("sty-logo-retirer").onclick = async () => { garderMots(); Object.assign(sty.kit, { logo: null, logo_fond: null }); sty.logo = sty.logoImg = sty.logoUrl = null; await rendre(); msg(t("con.sty.logo.retire")); };
        const enregistrer = async valider => {
          garderMots();
          try {
            const m = await o.enregistrer(sty.kit, valider); sty.pour = null; await rendre(); window.scrollTo(0, 0);
            msg(t(m.verrouille ? "con.sty.valide.msg" : "con.sty.enregistre.msg", { v: m.version })); if (o.apres) await o.apres(m);
          } catch (er) { erreur(er); }
        };
        $("sty-valider").onclick = () => enregistrer(true); $("sty-enregistrer").onclick = () => enregistrer(false);
      } else {
        const cp = cat.couples.find(x => x.id === k.couple) || cat.couples.find(x => x.titres === k.police_titres) || null, fam = id => (cat.familles[id] || {}).nom || id;
        const resume = `<div class="sty-resume"><div class="style-nuancier" aria-hidden="true">${C4.map(x => `<span style="background:${e(k.couleurs[x])}"></span>`).join("")}</div>
            <p class="note">${t("sty.resume", { p: e(cp ? nomCouple(cp) : fam(k.police_titres)), f: e(fam(k.police_titres) + (k.police_texte !== k.police_titres ? " · " + fam(k.police_texte) : "")), a: STY_SP[k.style_photo] || "" })}</p></div>`;
        const dejaValide = valide && (b.valide_par || "commercant") === "commercant";
        o.vue.innerHTML = `${enTete}
          <div class="colonnes sty">
            <div class="pile">${carteApercus(k, STY_GAB, false, resume)}</div>
            <div class="pile">
              <section class="carte sty-actions" aria-labelledby="sty-avis-titre"><h2 id="sty-avis-titre">${t("sty.avis.titre")}</h2>
                <div class="actions">${dejaValide ? "" : `<button type="button" class="bouton" id="sty-valider">${t("sty.valider")}</button>`}<button type="button" class="bouton second" id="sty-changement" aria-expanded="${sty.ouvert}" aria-controls="sty-demande-zone">${t("sty.changement")}</button></div>
                <div class="f" id="sty-demande-zone"${sty.ouvert ? "" : " hidden"}><label for="sty-demande">${t("sty.demande.label")}</label><textarea id="sty-demande" rows="4" maxlength="1000"></textarea><p class="aide">${t("sty.demande.aide")}</p>
                  <div class="actions"><button type="button" class="bouton" id="sty-demande-envoyer">${t("sty.demande.envoyer")}</button><button type="button" class="lien" id="sty-demande-annuler">${t("annuler")}</button></div></div>
                ${sty.demandes.length ? `<div class="sty-historique"><p class="note fort">${t("sty.demandes")}</p>${listeDemandes()}</div>` : ""}
                <p class="aide">${t("sty.valider.aide")}</p><p class="msg" id="msg" role="status"></p></section>
              ${carteLogo(k)}
              <details class="carte sty-mots" id="sty-mots"><summary>${t("sty.mots.facultatif")}</summary><div class="sty-mots-corps">${champsMots(k, lc)}
                <div class="actions"><button type="button" class="bouton second" id="sty-mots-enregistrer">${t("sty.mots.enregistrer")}</button></div></div></details>
            </div>
          </div>`;
        const mots = () => ({ mots_signature: lignes("sty-signature", MAX_MOTS), a_eviter: lignes("sty-eviter", MAX_EVITER) });
        const regler = async (p, valider, cle) => {
          try { const m = await o.regler(p, valider); sty.pour = null; await rendre(); msg(t(cle, { v: m.version })); if (o.apres) await o.apres(m); return true; } catch (er) { erreur(er); return false; }
        };
        $("sty-logo-fichier").onchange = async () => {
          const f = $("sty-logo-fichier").files[0]; if (!f) return;
          try {
            const r = await o.deposerLogo(f), img = await chargerImage(r.url);
            const p = proposer({ logo: pixels(img), metier: c.metier, ton: c.ton || "", logoChemin: r.chemin, cat });
            await regler({ logo: r.chemin, logo_fond: p.logo_fond }, null, "sty.logo.enregistre");
          } catch (er) { erreur(er); }
        };
        if ($("sty-logo-retirer")) $("sty-logo-retirer").onclick = () => regler({ logo: null, logo_fond: null }, null, "sty.logo.retire");
        if ($("sty-valider")) $("sty-valider").onclick = async () => { if (await regler(mots(), true, "sty.valide.msg")) window.scrollTo(0, 0); };
        $("sty-mots-enregistrer").onclick = () => regler(mots(), null, "sty.mots.enregistres");
        $("sty-changement").onclick = () => { sty.ouvert = !sty.ouvert; $("sty-demande-zone").hidden = !sty.ouvert; $("sty-changement").setAttribute("aria-expanded", String(sty.ouvert)); if (sty.ouvert) $("sty-demande").focus(); };
        $("sty-demande-annuler").onclick = () => { sty.ouvert = false; $("sty-demande-zone").hidden = true; $("sty-changement").setAttribute("aria-expanded", "false"); };
        $("sty-demande-envoyer").onclick = async () => {
          const x = $("sty-demande").value.trim(); if (!x) { msg(t("sty.demande.vide")); return; }
          try { await o.demander(x); sty.ouvert = false; sty.pour = null; await rendre(); msg(t("sty.demande.envoyee")); if (o.apres) await o.apres(null); } catch (er) { erreur(er); }
        };
      }
      o.vue.querySelectorAll("[data-sty-photo]").forEach(bt => bt.onclick = () => { sty.photo = +bt.dataset.styPhoto; o.vue.querySelectorAll("[data-sty-photo]").forEach(x => x.setAttribute("aria-pressed", String(x === bt))); redessiner(); });
      await dessinerTout();
    }
    return { rendre, oublier() { sty.pour = null; } };
  }

  const API = { STYLES_PHOTO, GABARITS, CLES, AUTEURS, ecran, MAX_MOTS, MAX_EVITER, MAX_CAR, rgb, hexa, estHexa, lum, contraste, melange, echantillons, regrouper, fondDuLogo, tonCle, couplePropose,
    styleDesPhotos, couleursLisibles, proposer, defaut, normaliser, fautes, couleursCommerce, garderCouleurs, controlerLogo, estSvg, canon, sansBase, charger, polices, chargerImage, pixels, preparerLogo, enPng, dessiner,
    catalogue: () => catalogue, policeTitre, policeTexte };
  if (typeof module === "object" && module.exports) module.exports = API; else racine.RENOM_MARQUE = API;
})(typeof window !== "undefined" ? window : globalThis);
