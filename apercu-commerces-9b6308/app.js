// Page de vente en deux langues : les textes générés ici suivent <html lang> (fr, ou en pour site/en/).
var RENOM_EN=document.documentElement.lang==='en';
(function(){
var EN=RENOM_EN;
// Page de vente : sélecteur de métier (section « Comment ça marche » et formulaire, synchronisés), formulaire d'audit.
// Le métier choisi est repris dans la demande d'audit (champ caché « metier ») ; « Autre commerce » ouvre un champ libre.
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var NOMS=EN?{restaurant:'Restaurant',beaute:'Beauty salon',sport:'Gym or studio',autre:'Other business'}:{restaurant:'Restaurant',beaute:'Institut de beauté',sport:'Salle ou studio',autre:'Autre commerce'};
var T=EN?{
  noteMetier:function(n){return 'Noted: '+n+'. Your audit request includes it.'},
  metier:'Choose your type of business.',commerce:'Enter the name of your business.',autre:'Tell us what kind of business it is.',
  ville:'Enter your town or city, so we find the right listing.',email:'This email address looks incomplete.',
  ok:'Tick the box so we can send you the audit.',envoi:'Sending…',bouton:'Get my free audit',
  echec:'Your request didn\u2019t go through. Check your connection and try again.',merci:'thank-you.html'
}:{
  noteMetier:function(n){return 'Noté\u00a0: '+n+'. Votre demande d\'audit le reprend.'},
  metier:'Choisissez votre type de commerce.',commerce:'Indiquez le nom de votre commerce.',autre:'Précisez votre commerce.',
  ville:"Indiquez votre ville, pour qu'on trouve la bonne fiche.",email:'Cette adresse email semble incomplète.',
  ok:"Cochez la case pour qu'on puisse vous envoyer l'audit.",envoi:'Envoi en cours…',bouton:'Recevoir mon audit gratuit',
  echec:"L'envoi n'est pas passé. Vérifiez votre connexion et réessayez.",merci:'merci.html'
};
var gm=$('#g-metier'),autre=$('#f-autre'),gAutre=$('#g-autre'),note=$('#metiers-note');
function choisir(m){
  $$('.m-choix').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.m===m))});
  gm.value=m;autre.hidden=(m!=='autre');gAutre.required=(m==='autre');
  if(note)note.textContent=T.noteMetier(NOMS[m]);
}
$$('.m-choix').forEach(function(b){b.addEventListener('click',function(){choisir(b.dataset.m)})});

// ---- Formulaire d'audit
var form=$('#form'),err=$('#err'),btn=$('#envoi');
function erreur(m,champ){err.textContent=m;err.hidden=false;if(champ)champ.focus()}
form.addEventListener('submit',function(e){e.preventDefault();err.hidden=true;
  if(form.website.value)return;
  if(!gm.value)return erreur(T.metier,$('.choix .m-choix'));
  if(!form.commerce.value.trim())return erreur(T.commerce,form.commerce);
  if(gm.value==='autre'&&!gAutre.value.trim())return erreur(T.autre,gAutre);
  if(!form.ville.value.trim())return erreur(T.ville,form.ville);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value.trim()))return erreur(T.email,form.email);
  if(!form.consentement.checked)return erreur(T.ok,form.consentement);
  $('#g-sujet').value='Audit RENOM : '+form.commerce.value+', '+form.ville.value;
  var d=new FormData(form);
  try{sessionStorage.setItem('renom',JSON.stringify({commerce:d.get('commerce'),email:d.get('email')}))}catch(x){}
  btn.disabled=true;btn.textContent=T.envoi;
  var corps=new URLSearchParams(d).toString(),H={'Content-Type':'application/x-www-form-urlencoded'};
  Promise.resolve({ok:true})
  .then(function(r){if(!r.ok)throw 0;location.href=T.merci})
  .catch(function(){btn.disabled=false;btn.textContent=T.bouton;erreur(T.echec)});
});
})();

// ---- Calculateur du manque à gagner (section #calcul). Aucun réseau, rien n'est envoyé ni gardé.
// Fourchette : une étoile de plus = +5 à +9 % de chiffre d'affaires (Luca, Harvard Business School, working paper 12-016, 2011 :
// restaurants indépendants de Seattle, notes Yelp). Demi-étoile = moitié de la fourchette. Sources : ordres/SOURCES-PAGE.md.
// Seuils de note : BrightLocal, Local Consumer Review Survey 2026 (68 % : 4 étoiles ou plus ; 31 % : 4,5 ou plus ; États-Unis).
(function(){
var calc=document.getElementById('calc');if(!calc)return;
var EN=RENOM_EN,LOC=EN?'en-GB':'fr-FR';
var BAS=0.05,HAUT=0.09;
var el=function(id){return document.getElementById(id)};
var vide=el('calc-vide'),plein=el('calc-plein'),seuil=el('calc-seuil');
// « 180 000 », « 180000 € », « 4,2 » ou « 4.2 » : espaces, euros et séparateurs de milliers retirés, virgule décimale acceptée.
// En anglais, la virgule sépare les milliers (« 180,000 ») et le point est décimal (« 4.2 ») ; « 4,2 » reste lu 4,2.
function nombre(v){
  v=String(v||'').replace(/[\s  €]/g,'');
  v=EN?v.replace(/,(?=\d{3}(\D|$))/g,'').replace(',','.'):v.replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.');
  if(!/^\d+(\.\d+)?$/.test(v))return NaN;
  return parseFloat(v);
}
// Ordre de grandeur : arrondi à la centaine d'euros, jamais de fausse précision.
function euros(n){
  var r=n>=1000?Math.round(n/100)*100:Math.round(n);
  if(EN)return '€'+r.toLocaleString(LOC,{maximumFractionDigits:0});
  return r.toLocaleString(LOC,{maximumFractionDigits:0}).replace(/ /g,' ')+' €';
}
function noteTexte(n){return n.toLocaleString(LOC,{minimumFractionDigits:1,maximumFractionDigits:1})}
var C=EN?{
  videCa:'Enter your annual turnover: your result appears here.',
  videClients:'Enter your customers per day, average spend and opening days: your result appears here.',
  baseCa:function(x){return 'For '+x+' of turnover a year.'},baseClients:function(x){return 'Your estimated turnover: '+x+' a year.'},
  a:' to ',
  sous4:function(n){return 'At '+n+', you’re below the 4-star line. 68% of consumers surveyed by BrightLocal (US, 2026) will only use a business with four or more stars.'},
  sous45:function(n){return 'At '+n+', you clear the 4-star line. But 31% of consumers surveyed by BrightLocal (US, 2026) will only use a business with 4.5 stars or more.'},
  atout:function(n){return 'At '+n+', your rating is an asset. The challenge is keeping it there, review after review.'},
  noteInvalide:'Ratings run from 1 to 5, for example 4.1.'
}:{
  videCa:'Indiquez votre chiffre d’affaires : le résultat s’affiche ici.',
  videClients:'Indiquez vos clients par jour, votre panier moyen et vos jours d’ouverture : le résultat s’affiche ici.',
  baseCa:function(x){return 'Pour '+x+' de chiffre d’affaires par an.'},baseClients:function(x){return 'Votre chiffre d’affaires estimé : '+x+' par an.'},
  a:' à ',
  sous4:function(n){return 'À '+n+', vous êtes sous la barre des 4 étoiles. 68 % des clients interrogés par BrightLocal (États-Unis, 2026) ne choisissent qu’un commerce noté 4 ou plus.'},
  sous45:function(n){return 'À '+n+', vous passez la barre des 4 étoiles. Mais 31 % des clients interrogés par BrightLocal (États-Unis, 2026) ne choisissent qu’un commerce noté 4,5 ou plus.'},
  atout:function(n){return 'À '+n+', votre note est un atout. Tout l’enjeu est de la garder, avis après avis.'},
  noteInvalide:'La note s’écrit entre 1 et 5, par exemple 4,1.'
};
// Mode par défaut : clients par jour × panier moyen × jours d'ouverture ; le chiffre d'affaires annuel est le second choix.
function mode(){var r=calc.querySelector('input[name="calc-mode"]:checked');return r?r.value:'clients'}
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
    vide.textContent=m==='ca'?C.videCa:C.videClients;
    vide.hidden=false;plein.hidden=true;return;
  }
  vide.hidden=true;plein.hidden=false;
  el('calc-base').textContent=m==='ca'?C.baseCa(euros(ca)):C.baseClients(euros(ca));
  el('calc-bas').textContent=euros(ca*BAS);el('calc-haut').textContent=euros(ca*HAUT);
  el('calc-demi').textContent=euros(ca*BAS/2)+C.a+euros(ca*HAUT/2);
  var n=nombre(el('c-note').value),t='';
  if(!isNaN(n)&&n>=1&&n<=5){
    if(n<4)t=C.sous4(noteTexte(n));
    else if(n<4.5)t=C.sous45(noteTexte(n));
    else t=C.atout(noteTexte(n));
  }else if(String(el('c-note').value).trim())t=C.noteInvalide;
  seuil.textContent=t;seuil.hidden=!t;
}
calc.addEventListener('input',maj);calc.addEventListener('change',maj);
calc.addEventListener('submit',function(e){e.preventDefault();maj()});
maj();
})();
