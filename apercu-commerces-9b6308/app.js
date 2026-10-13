(function(){
var NB=' ';
var T={restaurant:{h:["Un avis à une étoile sans réponse ","travaille contre vous ce soir encore."],l:["Répondre aux avis à minuit, après le service.","Chercher quoi publier entre deux commandes.","Laisser le plat du jour sans une seule photo en ligne.","Découvrir un avis assassin trois semaines trop tard."]},
beaute:{h:["Votre dernière publication date de quand"+NB+"? ","Vos futures clientes, elles, ont regardé."],l:["Publier entre deux clientes, quand vous y pensez.","Garder vos plus beaux résultats dans votre téléphone.","Laisser des créneaux vides sans que personne le sache.","Découvrir un avis assassin trois semaines trop tard."]},
sport:{h:["Le studio d'à côté publie chaque semaine. ","Et vous, c'était quand"+NB+"?"],l:["Refaire le visuel du planning chaque dimanche soir.","Filmer vos cours sans jamais monter les vidéos.","Laisser des cours à moitié vides sans rien annoncer.","Découvrir un avis assassin trois semaines trop tard."]}};
T.autre=T.restaurant;
var m0=document.getElementById('g-metier'),other=document.getElementById('f-autre');
function set(m){var t=T[m];
var h=document.getElementById('titre');h.textContent='';h.appendChild(document.createTextNode(t.h[0]));
h.appendChild(document.createTextNode(t.h[1]));
var ul=document.getElementById('stop-liste');ul.textContent='';
t.l.forEach(function(x){var li=document.createElement('li');li.textContent=x;ul.appendChild(li)});
document.querySelectorAll('.tab').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.m===m))});
document.querySelectorAll('#photos img').forEach(function(i){i.hidden=(i.dataset.m!==m)});
document.querySelectorAll('#demo figure').forEach(function(i){i.hidden=(i.dataset.m!==(m==='autre'?'restaurant':m))});
m0.value=m;other.hidden=(m!=='autre');document.getElementById('g-autre').required=(m==='autre');}
document.querySelectorAll('.tab').forEach(function(b){b.addEventListener('click',function(){set(b.dataset.m)})});
set('restaurant');
var form=document.getElementById('form'),err=document.getElementById('err'),btn=document.getElementById('envoi');
form.addEventListener('submit',function(e){e.preventDefault();err.hidden=true;
if(form.website.value)return;
document.getElementById('g-sujet').value='Audit RENOM : '+form.commerce.value+', '+form.ville.value;
var d=new FormData(form);
try{sessionStorage.setItem('renom',JSON.stringify({commerce:d.get('commerce'),email:d.get('email')}))}catch(x){}
btn.disabled=true;
Promise.resolve({ok:true}).toString()})
.then(function(r){if(!r.ok)throw 0;location.href='merci.html'})
.catch(function(){btn.disabled=false;err.textContent="L'envoi a échoué. Réessayez dans un instant.";err.hidden=false});});
})();
