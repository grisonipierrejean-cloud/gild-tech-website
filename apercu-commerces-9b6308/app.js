// Page de vente en deux langues : les textes générés ici suivent <html lang> (fr, ou en pour site/en/).
var RENOM_EN=document.documentElement.lang==='en';
(function(){
var EN=RENOM_EN;
// Page de vente : formulaire d'audit (16/10/2026 : nom du commerce, ville, email, lien Google Maps facultatif ; plus de choix du métier).
var $=function(s,r){return (r||document).querySelector(s)};
var form=$('#form');if(!form)return;
var T=EN?{
  commerce:'Enter the name of your business.',ville:'Enter your town or city, so we find the right listing.',email:'This email address looks incomplete.',
  maps:'This doesn\u2019t look like a Google Maps link. Leave it empty if you don\u2019t have one.',
  ok:'Tick the box so we can send you the audit.',envoi:'Sending…',bouton:'Get my free audit',
  echec:'Your request didn\u2019t go through. Check your connection and try again.',merci:'thank-you.html'
}:{
  commerce:'Indiquez le nom de votre commerce.',ville:"Indiquez votre ville, pour qu'on trouve la bonne fiche.",email:'Cette adresse email semble incomplète.',
  maps:"Ce lien ne ressemble pas à un lien Google Maps. Laissez le champ vide si vous ne l'avez pas.",
  ok:"Cochez la case pour qu'on puisse vous envoyer l'audit.",envoi:'Envoi en cours…',bouton:'Recevoir mon audit gratuit',
  echec:"L'envoi n'est pas passé. Vérifiez votre connexion et réessayez.",merci:'merci.html'
};
// Lien Google Maps : facultatif ; même règle que le contrôle de n8n (n8n/build_audit.py), qui l'écarte sinon.
var MAPS=/^https:\/\/(www\.google\.[a-z.]{2,6}\/maps|maps\.google\.[a-z.]{2,6}|maps\.app\.goo\.gl|goo\.gl\/maps)[^\s"<>]*$/;
var err=$('#err'),btn=$('#envoi');
function erreur(m,champ){err.textContent=m;err.hidden=false;if(champ)champ.focus()}
// Le message d'erreur disparaît dès que le visiteur corrige : il ne reste pas affiché à tort.
function effacer(){if(!err.hidden){err.hidden=true;err.textContent=''}}
form.addEventListener('input',effacer);form.addEventListener('change',effacer);
form.addEventListener('submit',function(e){e.preventDefault();err.hidden=true;
  if(form.website.value)return;
  if(!form.commerce.value.trim())return erreur(T.commerce,form.commerce);
  if(!form.ville.value.trim())return erreur(T.ville,form.ville);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value.trim()))return erreur(T.email,form.email);
  var m=form.lien_maps.value.trim();if(m&&!MAPS.test(m))return erreur(T.maps,form.lien_maps);
  if(!form.consentement.checked)return erreur(T.ok,form.consentement);
  $('#g-sujet').value='Audit Renomia : '+form.commerce.value+', '+form.ville.value;
  var d=new FormData(form);
  try{sessionStorage.setItem('renom',JSON.stringify({commerce:d.get('commerce'),email:d.get('email')}))}catch(x){}
  btn.disabled=true;btn.textContent=T.envoi;
  var corps=new URLSearchParams(d).toString(),H={'Content-Type':'application/x-www-form-urlencoded'};
  Promise.resolve({ok:true})
  .then(function(r){if(!r.ok)throw 0;location.href=T.merci})
  .catch(function(){btn.disabled=false;btn.textContent=T.bouton;erreur(T.echec)});
});
})();

// ---- Simulateur (page secondaire site/simulateur.html, en/simulator.html ; retiré de la page de vente le 16/10/2026). Aucun réseau, rien n'est envoyé ni gardé.
// Fourchette : une étoile de plus = +5 à +9 % de chiffre d'affaires (Luca, Harvard Business School, working paper 12-016, 2011 :
// restaurants indépendants de Seattle, notes Yelp). Sources : ordres/SOURCES-PAGE.md.
// Objectif atteignable (décision du 14/10/2026) : 4,5 si la note est entre 3,5 et 4,4 ; note + 1 sous 3,5 ; à 4,5 ou plus, aucun chiffre.
// Gain = (objectif − note) × 5 à 9 % du chiffre d'affaires annuel.
// Seuils de note : BrightLocal, Local Consumer Review Survey 2026 (68 % : 4 étoiles ou plus ; 31 % : 4,5 ou plus ; États-Unis).
(function(){
var calc=document.getElementById('calc');if(!calc)return;
var EN=RENOM_EN,LOC=EN?'en-GB':'fr-FR';
var BAS=0.05,HAUT=0.09,CIBLE=4.5,PALIER=3.5;
var el=function(id){return document.getElementById(id)};
var vide=el('calc-vide'),plein=el('calc-plein'),seuil=el('calc-seuil'),gain=el('calc-gain'),sommet=el('calc-sommet');
// « 180 000 », « 180000 € », « 4,2 » ou « 4.2 » : espaces, euros et séparateurs de milliers retirés, virgule décimale acceptée.
// En anglais, la virgule sépare les milliers (« 180,000 ») et le point est décimal (« 4.2 ») ; « 4,2 » reste lu 4,2.
function nombre(v){
  v=String(v||'').replace(/[\s\u00a0\u202f€]/g,'');
  v=EN?v.replace(/,(?=\d{3}(\D|$))/g,'').replace(',','.'):v.replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.');
  if(!/^\d+(\.\d+)?$/.test(v))return NaN;
  return parseFloat(v);
}
// Ordre de grandeur : arrondi à la centaine d'euros, jamais de fausse précision.
function euros(n){
  var r=n>=1000?Math.round(n/100)*100:Math.round(n);
  if(EN)return '€'+r.toLocaleString(LOC,{maximumFractionDigits:0});
  return r.toLocaleString(LOC,{maximumFractionDigits:0}).replace(/\u202f/g,'\u00a0')+'\u00a0€';
}
function noteTexte(n){return n.toLocaleString(LOC,{minimumFractionDigits:1,maximumFractionDigits:1})}
var C=EN?{
  videCa:'Enter your annual turnover and your rating: your result appears here.',
  videClients:'Enter your customers per day, average spend, opening days and rating: your result appears here.',
  videNote:'Now enter your current Google rating: your result appears here.',
  baseCa:function(x){return 'For '+x+' of turnover a year.'},baseClients:function(x){return 'Your estimated turnover: '+x+' a year.'},
  passer:function(a,b){return 'Going from '+a+' to '+b+' is worth:'},
  sommet:function(n){return 'At '+n+', you’re already at the top: the challenge is to stay above the others.'},
  sous4:function(n){return 'At '+n+', you’re below the 4-star line. 68% of consumers surveyed by BrightLocal (US, 2026) will only use a business with four or more stars.'},
  sous45:function(n){return 'At '+n+', you clear the 4-star line. But 31% of consumers surveyed by BrightLocal (US, 2026) will only use a business with 4.5 stars or more.'},
  noteInvalide:'Ratings run from 1 to 5, for example 4.1.'
}:{
  videCa:'Indiquez votre chiffre d’affaires et votre note : le résultat s’affiche ici.',
  videClients:'Indiquez vos clients par jour, votre panier moyen, vos jours d’ouverture et votre note : le résultat s’affiche ici.',
  videNote:'Indiquez maintenant votre note Google actuelle : le résultat s’affiche ici.',
  baseCa:function(x){return 'Pour '+x+' de chiffre d’affaires par an.'},baseClients:function(x){return 'Votre chiffre d’affaires estimé : '+x+' par an.'},
  passer:function(a,b){return 'Passer de '+a+' à '+b+' représente :'},
  sommet:function(n){return 'À '+n+', vous êtes déjà en haut : l’enjeu est de rester au-dessus des autres.'},
  sous4:function(n){return 'À '+n+', vous êtes sous la barre des 4 étoiles. 68 % des clients interrogés par BrightLocal (États-Unis, 2026) ne choisissent qu’un commerce noté 4 ou plus.'},
  sous45:function(n){return 'À '+n+', vous passez la barre des 4 étoiles. Mais 31 % des clients interrogés par BrightLocal (États-Unis, 2026) ne choisissent qu’un commerce noté 4,5 ou plus.'},
  noteInvalide:'La note s’écrit entre 1 et 5, par exemple 4,1.'
};
// Objectif atteignable pour une note n (au dixième) ; null à 4,5 ou plus (rien à chiffrer).
function objectif(n){return n>=CIBLE?null:n>=PALIER?CIBLE:Math.round((n+1)*10)/10}
// Mode par défaut : clients par jour × panier moyen × jours d'ouverture ; le chiffre d'affaires annuel est le second choix.
function mode(){var r=calc.querySelector('input[name="calc-mode"]:checked');return r?r.value:'clients'}
function chiffreAffaires(){
  if(mode()==='ca')return nombre(el('c-ca').value);
  var c=nombre(el('c-clients').value),p=nombre(el('c-panier').value),j=nombre(el('c-jours').value);
  if(isNaN(c)||isNaN(p)||isNaN(j)||j>366)return NaN;
  return c*p*j;
}
function montrerVide(m){vide.textContent=m;vide.hidden=false;plein.hidden=true}
function maj(){
  var ca=chiffreAffaires(),m=mode();
  el('calc-ca').hidden=(m!=='ca');el('calc-clients').hidden=(m==='ca');
  if(isNaN(ca)||ca<=0)return montrerVide(m==='ca'?C.videCa:C.videClients);
  var brut=String(el('c-note').value).trim(),n=nombre(brut);
  if(!brut)return montrerVide(C.videNote);
  if(isNaN(n)||n<1||n>5)return montrerVide(C.noteInvalide);
  n=Math.round(n*10)/10;
  vide.hidden=true;plein.hidden=false;
  el('calc-base').textContent=m==='ca'?C.baseCa(euros(ca)):C.baseClients(euros(ca));
  var o=objectif(n);
  gain.hidden=(o===null);sommet.hidden=(o!==null);
  if(o===null){sommet.textContent=C.sommet(noteTexte(n))}
  else{
    var ecart=Math.round((o-n)*10)/10;
    el('calc-lib').textContent=C.passer(noteTexte(n),noteTexte(o));
    el('calc-bas').textContent=euros(ca*ecart*BAS);el('calc-haut').textContent=euros(ca*ecart*HAUT);
  }
  var s=n<4?C.sous4(noteTexte(n)):n<CIBLE?C.sous45(noteTexte(n)):'';
  seuil.textContent=s;seuil.hidden=!s;
}
calc.addEventListener('input',maj);calc.addEventListener('change',maj);
calc.addEventListener('submit',function(e){e.preventDefault();maj()});
maj();
})();
