(function(){
// Page de vente : sélecteur de métier (section « Comment ça marche » et formulaire, synchronisés), formulaire d'audit.
// Le métier choisi est repris dans la demande d'audit (champ caché « metier ») ; « Autre commerce » ouvre un champ libre.
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var NOMS={restaurant:'Restaurant',beaute:'Institut de beauté',sport:'Salle ou studio',autre:'Autre commerce'};
var gm=$('#g-metier'),autre=$('#f-autre'),gAutre=$('#g-autre'),note=$('#metiers-note');
function choisir(m){
  $$('.m-choix').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.m===m))});
  gm.value=m;autre.hidden=(m!=='autre');gAutre.required=(m==='autre');
  if(note)note.textContent='Noté\u00a0: '+NOMS[m]+'. Votre demande d\'audit le reprend.';
}
$$('.m-choix').forEach(function(b){b.addEventListener('click',function(){choisir(b.dataset.m)})});

// ---- Formulaire d'audit
var form=$('#form'),err=$('#err'),btn=$('#envoi');
function erreur(m,champ){err.textContent=m;err.hidden=false;if(champ)champ.focus()}
form.addEventListener('submit',function(e){e.preventDefault();err.hidden=true;
  if(form.website.value)return;
  if(!gm.value)return erreur('Choisissez votre type de commerce.',$('.choix .m-choix'));
  if(!form.commerce.value.trim())return erreur('Indiquez le nom de votre commerce.',form.commerce);
  if(gm.value==='autre'&&!gAutre.value.trim())return erreur('Précisez votre commerce.',gAutre);
  if(!form.ville.value.trim())return erreur("Indiquez votre ville, pour qu'on trouve la bonne fiche.",form.ville);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value.trim()))return erreur('Cette adresse email semble incomplète.',form.email);
  if(!form.consentement.checked)return erreur("Cochez la case pour qu'on puisse vous envoyer l'audit.",form.consentement);
  $('#g-sujet').value='Audit RENOM : '+form.commerce.value+', '+form.ville.value;
  var d=new FormData(form);
  try{sessionStorage.setItem('renom',JSON.stringify({commerce:d.get('commerce'),email:d.get('email')}))}catch(x){}
  btn.disabled=true;btn.textContent='Envoi en cours…';
  var corps=new URLSearchParams(d).toString(),H={'Content-Type':'application/x-www-form-urlencoded'};
  Promise.resolve({ok:true})
  .then(function(r){if(!r.ok)throw 0;location.href='merci.html'})
  .catch(function(){btn.disabled=false;btn.textContent='Recevoir mon audit gratuit';erreur("L'envoi n'est pas passé. Vérifiez votre connexion et réessayez.")});
});
})();

// ---- Calculateur du manque à gagner (section #calcul). Aucun réseau, rien n'est envoyé ni gardé.
// Fourchette : une étoile de plus = +5 à +9 % de chiffre d'affaires (Luca, Harvard Business School, working paper 12-016, 2011 :
// restaurants indépendants de Seattle, notes Yelp). Demi-étoile = moitié de la fourchette. Sources : ordres/SOURCES-PAGE.md.
// Seuils de note : BrightLocal, Local Consumer Review Survey 2026 (68 % : 4 étoiles ou plus ; 31 % : 4,5 ou plus ; États-Unis).
(function(){
var calc=document.getElementById('calc');if(!calc)return;
var BAS=0.05,HAUT=0.09;
var el=function(id){return document.getElementById(id)};
var vide=el('calc-vide'),plein=el('calc-plein'),seuil=el('calc-seuil');
// « 180 000 », « 180000 € », « 4,2 » ou « 4.2 » : espaces, euros et séparateurs de milliers retirés, virgule décimale acceptée.
function nombre(v){
  v=String(v||'').replace(/[\s  €]/g,'').replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.');
  if(!/^\d+(\.\d+)?$/.test(v))return NaN;
  return parseFloat(v);
}
// Ordre de grandeur : arrondi à la centaine d'euros, jamais de fausse précision.
function euros(n){
  var r=n>=1000?Math.round(n/100)*100:Math.round(n);
  return r.toLocaleString('fr-FR',{maximumFractionDigits:0}).replace(/ /g,' ')+' €';
}
function noteTexte(n){return n.toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1})}
function mode(){var r=calc.querySelector('input[name="calc-mode"]:checked');return r?r.value:'ca'}
function chiffreAffaires(){
  if(mode()==='ca')return nombre(el('c-ca').value);
  var c=nombre(el('c-clients').value),p=nombre(el('c-panier').value),j=nombre(el('c-jours').value);
  if(isNaN(c)||isNaN(p)||isNaN(j)||j>366)return NaN;
  return c*p*j;
}
function maj(){
  var ca=chiffreAffaires(),m=mode();
  el('calc-ca').hidden=(m!=='ca');el('calc-clients').hidden=(m==='ca');
  if(isNaN(ca)||ca<=0){
    vide.textContent=m==='ca'?'Indiquez votre chiffre d’affaires : le résultat s’affiche ici.':'Indiquez vos clients par jour, votre panier moyen et vos jours d’ouverture : le résultat s’affiche ici.';
    vide.hidden=false;plein.hidden=true;return;
  }
  vide.hidden=true;plein.hidden=false;
  el('calc-base').textContent=m==='ca'?'Pour '+euros(ca)+' de chiffre d’affaires par an.':'Votre chiffre d’affaires estimé : '+euros(ca)+' par an.';
  el('calc-bas').textContent=euros(ca*BAS);el('calc-haut').textContent=euros(ca*HAUT);
  el('calc-demi').textContent=euros(ca*BAS/2)+' à '+euros(ca*HAUT/2);
  var n=nombre(el('c-note').value),t='';
  if(!isNaN(n)&&n>=1&&n<=5){
    if(n<4)t='À '+noteTexte(n)+', vous êtes sous la barre des 4 étoiles. 68 % des clients interrogés par BrightLocal (États-Unis, 2026) ne choisissent qu’un commerce noté 4 ou plus.';
    else if(n<4.5)t='À '+noteTexte(n)+', vous passez la barre des 4 étoiles. Mais 31 % des clients interrogés par BrightLocal (États-Unis, 2026) ne choisissent qu’un commerce noté 4,5 ou plus.';
    else t='À '+noteTexte(n)+', votre note est un atout. Tout l’enjeu est de la garder, avis après avis.';
  }else if(String(el('c-note').value).trim())t='La note s’écrit entre 1 et 5, par exemple 4,1.';
  seuil.textContent=t;seuil.hidden=!t;
}
calc.addEventListener('input',maj);calc.addEventListener('change',maj);
calc.addEventListener('submit',function(e){e.preventDefault();maj()});
maj();
})();
