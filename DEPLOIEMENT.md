# 🚀 Guide de déploiement — Gild-Tech

Ce document t'emmène **de zéro à gild-tech.com en ligne** en moins de 30 minutes.

---

## 📦 Étape 1 — Mettre en ligne le site (Netlify, 5 min)

### Pourquoi Netlify ?
- **Gratuit** (suffisant pour ton trafic actuel)
- **Déploiement en drag-and-drop**
- **HTTPS automatique** avec certificat Let's Encrypt
- **CDN mondial** (site rapide partout)
- **Domaine personnalisé** simple à brancher

### Procédure

1. **Aller sur** https://app.netlify.com/signup
2. **S'inscrire** avec ton email Google ou GitHub
3. Sur le dashboard, cliquer **"Add new site"** → **"Deploy manually"**
4. **Ouvrir Finder** et aller dans `/Users/pierrejeqn/Desktop/GildTech MultiAgent/site/`
5. **Glisser-déposer** le dossier **site** entier dans la zone de drop de Netlify
6. Netlify attribue une URL temporaire type : `https://amazing-curie-a1b2c3.netlify.app`

✅ **Le site est déjà en ligne** sur cette URL temporaire. Test-le.

---

## 🌐 Étape 2 — Brancher le domaine gild-tech.com (10 min)

### A) Trouver où est enregistré gild-tech.com

Lance cette commande dans un terminal :

```bash
whois gild-tech.com | grep -iE "registrar|name server"
```

Tu verras le registrar (OVH, Gandi, Namecheap, GoDaddy, ou Lovable si acheté via eux).

### B) Si le domaine est chez Lovable

1. Aller sur Lovable → Settings → Domains
2. **Retirer le domaine** de Lovable (tu ne perds PAS le domaine, juste le lien vers Lovable)
3. Passer à l'étape C

### C) Pointer le domaine vers Netlify

**Dans Netlify** :
1. Dashboard → ton site → **Domain management**
2. **Add custom domain** → taper `gild-tech.com`
3. Netlify te donne 2 DNS à configurer :
   - `A` record : `75.2.60.5`
   - `CNAME www` : vers `[ton-site].netlify.app`

**Dans ton registrar** (OVH / Gandi / etc.) :
1. Aller dans la zone DNS du domaine
2. **Supprimer** les anciens enregistrements A/CNAME qui pointent vers Lovable
3. **Ajouter** les enregistrements donnés par Netlify
4. Sauvegarder

**Propagation DNS** : 5 min à 24h (en général < 1h).

### D) Activer HTTPS

Une fois que Netlify voit que ton domaine pointe bien sur lui :
1. Domain management → **HTTPS** → **Verify DNS configuration**
2. **Provision certificate** (automatique via Let's Encrypt)
3. **Force HTTPS** (bouton à activer)

✅ Ton site est sur **https://gild-tech.com** et **https://www.gild-tech.com**.

---

## 🔍 Étape 3 — Google Search Console (5 min)

### Objectif
Indexer ton site dans Google. Sans ça, tu n'apparais pas dans les résultats.

### Procédure

1. **Aller sur** https://search.google.com/search-console
2. Se connecter avec ton compte Google
3. **Add property** → **Domain** → taper `gild-tech.com`
4. Google te donne un **enregistrement TXT DNS** à ajouter dans ton registrar

**Dans ton registrar** :
1. Zone DNS → ajouter un `TXT` record avec la valeur fournie
2. Sauvegarder

**Retour Search Console** :
5. **Verify** (une fois la propagation DNS faite, 5-30 min)

### Soumettre le sitemap

Une fois vérifié :
1. Search Console → ton domaine → **Sitemaps** (menu gauche)
2. Ajouter : `https://gild-tech.com/sitemap.xml`
3. **Submit**

✅ Google va commencer à crawler ton site dans les 24-72h.

### Bonus : Google Business Profile

Si tu veux apparaître dans Google Maps et les résultats locaux FR :
1. https://www.google.com/business/
2. Créer une fiche **Gild-Tech** (Girlden LTD)
3. Catégorie : "Agence de marketing" ou "Agence web"
4. Zone : France entière (pas d'adresse physique si tu préfères)

---

## 🖼️ Étape 4 — OG image (FAIT ✅)

Fichier `og-image.png` déjà généré dans `/site/` (1200x630 px, 285 KB).
Prêt à être servi par Netlify dès le déploiement.

Test d'aperçu LinkedIn après déploiement :
- https://www.linkedin.com/post-inspector/ → coller `https://gild-tech.com/`
- Tu dois voir : headline "Vos prospects n'attendent pas...", logo, CTA

Si l'aperçu est cassé : clique **"Refresh"** dans LinkedIn Post Inspector.

---

## ✅ Checklist finale

Une fois tout en ligne, vérifie :

- [ ] https://gild-tech.com charge le site (pas Lovable)
- [ ] https://www.gild-tech.com redirige vers la version sans www
- [ ] Le cadenas HTTPS est vert dans le navigateur
- [ ] Le toggle FR/EN fonctionne
- [ ] Les 4 pages légales s'ouvrent : `/mentions-legales.html`, `/cgv.html`, `/confidentialite.html`, `/cookies.html`
- [ ] https://gild-tech.com/sitemap.xml retourne le XML
- [ ] https://gild-tech.com/robots.txt retourne le texte
- [ ] Aperçu LinkedIn OK via Post Inspector
- [ ] Search Console : propriété vérifiée + sitemap soumis

---

## 🚨 Troubleshooting

**Le site montre encore Lovable après changement DNS** → vide le cache navigateur (Cmd+Shift+R) ou teste en navigation privée.

**Erreur 404 sur les pages légales** → vérifie que tu as bien uploadé le dossier `site/` complet (avec les 5 fichiers HTML).

**OG image ne s'affiche pas sur LinkedIn** → utilise `og-image.png` (pas .svg) dans les meta tags. Refresh via LinkedIn Post Inspector.

**Propagation DNS lente** → patiente jusqu'à 24h max. Pour vérifier en live : https://dnschecker.org/

---

## 📞 Support

Si blocage : contact@gild-tech.com ou support Netlify (chat in-app).
