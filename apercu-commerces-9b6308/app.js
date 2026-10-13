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
