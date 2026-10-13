(function(){
// Page de vente : sélecteur de métier (exemples seulement, la promesse ne change pas), téléphone de démonstration, formulaire d'audit.
// Tous les exemples sont fictifs (commerces, prénoms, avis). Sans choix de métier, la page garde son texte générique.
var NB=' ';
var TABLE={nom:"La Table d'exemple",compte:'latabledexemple',initiale:'T',objet:'Le plat du jour',photo:'img/demo-restaurant-avant.webp',visuel:'img/demo-restaurant-apres.webp',
  legende:'Des pâtes fraîches, des herbes, une sauce crémeuse. Un plat simple, préparé à la commande.',creneau:'mardi à 12'+NB+'h',auteur:'Léa M.',
  avis:'Pâtes fraîches excellentes, service attentionné.',auteur2:'Karim B.',avis2:"Très bon dîner, un peu d'attente pour le dessert.",reponse:"Merci Léa pour ce retour sur nos pâtes fraîches. Toute l'équipe sera ravie de vous revoir à table."};
var GEN={chapo:"Ce soir, un client compare votre fiche Google à celle d'en face. Il lit les avis. Il regarde les photos. Il choisit.",
  moments:[['23'+NB+'h'+NB+'40',"La journée est finie. Vous ouvrez votre téléphone. Une étoile. «\u00a0Accueil froid, je ne reviendrai pas.\u00a0» Vous tapez une réponse. Vous l'effacez. À minuit, vous publiez un texte que vous regretterez demain. Ou rien. Et le rien se lit aussi."],
    ['Mardi, 11'+NB+'h',"Votre vitrine est belle aujourd'hui. Personne ne le saura. Votre dernière publication date de l'été."],
    ['Samedi, 15'+NB+'h',"Quelqu'un tape votre métier et votre ville. Votre fiche apparaît à côté de deux autres. Les autres ont des photos du mois dernier et une réponse sous chaque avis. La vôtre a trois photos de 2022. Vous ne saurez jamais qu'il a hésité."],
    ['Un lundi',"Vous découvrez un avis très dur. Il est en ligne depuis trois semaines. Personne n'y a répondu. Tout le monde l'a lu."]],
  cloture:"Ce n'est pas un problème de métier. C'est un problème de temps. Et ça se règle.",
  stop:["Répondre aux avis à minuit, énervé, après la journée.","Chercher quoi publier entre deux clients.","Laisser votre travail du jour sans une seule photo en ligne.","Découvrir un avis grave trois semaines trop tard.","Écrire trois fois la même légende pour trois réseaux.","Vous demander si tout ça sert à quelque chose."],
  tel:TABLE};
var T={
 restaurant:{chapo:"Ce soir, à 19"+NB+"h"+NB+"30, deux clients comparent votre fiche à celle d'en face. Ils lisent les avis. Ils regardent les photos. Ils choisissent.",
  moments:[['23'+NB+'h'+NB+'40',"La salle est rangée, la plonge tourne encore. Vous ouvrez votre téléphone. Une étoile. «\u00a0Attente interminable, serveur débordé.\u00a0» C'était le soir où un cuisinier manquait. Vous tapez une réponse. Vous l'effacez. À minuit, vous publiez un texte que vous regretterez demain. Ou rien. Et le rien se lit aussi."],
    ['Mardi, 11'+NB+'h',"Le plat du jour est magnifique. Personne ne le saura. Le dernier post Instagram date de l'été."],
    ['Samedi, 19'+NB+'h'+NB+'30',"Deux personnes sur le trottoir d'en face tapent «\u00a0restaurant\u00a0» et le nom de votre ville. Les autres fiches ont des photos du mois dernier et une réponse sous chaque avis. La vôtre a trois photos floues de 2022. Vous ne saurez jamais qu'elles ont hésité."],
    ['Un lundi',"Vous découvrez un avis qui parle d'intoxication. Il est en ligne depuis trois semaines. Personne n'y a répondu. Tout le monde l'a lu."]],
  cloture:"Ce n'est pas un problème de cuisine. C'est un problème de temps. Et ça se règle.",
  stop:["Répondre aux avis à minuit, énervé, après le service.","Chercher quoi publier entre deux commandes.","Laisser le plat du jour sans une seule photo en ligne.","Découvrir un avis grave trois semaines trop tard.","Écrire trois fois la même légende pour trois réseaux.","Vous demander si tout ça sert à quelque chose."],
  tel:TABLE},
 beaute:{chapo:"Ce soir, une future cliente compare deux instituts sur son téléphone. Elle lit les avis. Elle regarde les photos. Elle réserve.",
  moments:[['21'+NB+'h'+NB+'15',"Le dernier soin est fini. Vous ouvrez votre téléphone. Une étoile. «\u00a0Rendez-vous décalé, aucune excuse.\u00a0» Vous tapez une réponse. Vous l'effacez. Vous la retapez. Ou rien. Et le rien se lit aussi."],
    ['Mardi, 14'+NB+'h',"Une cliente repart ravie. Le résultat est superbe. Il restera dans votre téléphone. Votre dernière publication date de l'été."],
    ['Jeudi, 20'+NB+'h',"Une future cliente hésite entre vous et l'institut d'à côté. L'autre a des photos récentes et une réponse sous chaque avis. Elle réserve en face. Vous ne saurez jamais qu'elle a hésité."],
    ['Un lundi',"Vous découvrez un avis qui parle d'une réaction après un soin. Il est en ligne depuis trois semaines. Personne n'y a répondu. Tout le monde l'a lu."]],
  cloture:"Ce n'est pas un problème de soins. C'est un problème de temps. Et ça se règle.",
  stop:["Répondre aux avis le soir, après la dernière cliente.","Publier entre deux rendez-vous, quand vous y pensez.","Garder vos plus beaux résultats dans votre téléphone.","Découvrir un avis grave trois semaines trop tard.","Écrire trois fois la même légende pour trois réseaux.","Vous demander si tout ça sert à quelque chose."],
  tel:{nom:"Institut d'exemple",compte:'institutdexemple',initiale:'I',objet:'La cabine ce matin',photo:'img/demo-beaute-avant.webp',visuel:'img/demo-beaute-apres.webp',
   legende:'La cabine est prête. Serviette chaude, lumière douce\u00a0: une heure rien que pour vous.',creneau:'jeudi à 10'+NB+'h',auteur:'Camille R.',
   avis:'Soin du visage très doux, accueil adorable.',auteur2:'Inès D.',avis2:'Massage parfait, cabine très calme.',reponse:'Merci Camille, nous sommes ravis que le soin vous ait plu. À bientôt en cabine.'}},
 sport:{chapo:"Ce soir, quelqu'un cherche une salle près de chez lui. Il lit les avis. Il regarde les photos. Il s'inscrit, chez vous ou ailleurs.",
  moments:[['22'+NB+'h',"Le dernier cours est fini. Vous ouvrez votre téléphone. Une étoile. «\u00a0Cours annulé sans prévenir.\u00a0» Vous tapez une réponse. Vous l'effacez. Ou rien. Et le rien se lit aussi."],
    ['Dimanche soir',"Vous refaites le visuel du planning. Encore. Les vidéos de vos cours dorment dans votre téléphone."],
    ['Lundi, 7'+NB+'h',"Quelqu'un compare trois salles près de chez lui. Les autres publient chaque semaine et répondent à chaque avis. Il s'inscrit ailleurs. Vous ne saurez jamais qu'il a hésité."],
    ['Un jeudi',"Vous découvrez un avis qui parle d'une blessure. Il est en ligne depuis trois semaines. Personne n'y a répondu. Tout le monde l'a lu."]],
  cloture:"Ce n'est pas un problème de coaching. C'est un problème de temps. Et ça se règle.",
  stop:["Répondre aux avis après le dernier cours.","Refaire le visuel du planning chaque dimanche soir.","Annoncer un nouveau cours sans une seule photo.","Découvrir un avis grave trois semaines trop tard.","Écrire trois fois la même légende pour trois réseaux.","Vous demander si tout ça sert à quelque chose."],
  tel:{nom:"Studio d'exemple",compte:'studiodexemple',initiale:'S',objet:'La salle ce matin',photo:'img/demo-sport-avant.webp',visuel:'img/demo-sport-apres.webp',
   legende:'Les tapis sont prêts. Venez essayer un cours cette semaine.',creneau:'lundi à 18'+NB+'h',auteur:'Julien P.',
   avis:'Cours exigeants, coach à l\'écoute, ambiance motivante.',auteur2:'Sarah L.',avis2:'Petits groupes, on progresse vite.',reponse:'Merci Julien. Rendez-vous au prochain cours.'}}
};
T.autre={chapo:"Ce soir, un client compare deux boutiques sur Google. Il lit les avis. Il regarde les photos. Il choisit.",moments:GEN.moments,cloture:GEN.cloture,stop:GEN.stop,tel:TABLE};

var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var choix='';
function texte(cle,val){$$('[data-t="'+cle+'"]').forEach(function(n){n.textContent=val})}
function remplir(m){
  var t=m?T[m]:GEN, p=t.tel;
  texte('chapo',t.chapo);texte('cloture',t.cloture);
  var ol=$('#moments');ol.textContent='';
  t.moments.forEach(function(x){var li=document.createElement('li'),a=document.createElement('p'),b=document.createElement('p');
    a.className='moment-quand';a.textContent=x[0];b.className='moment-texte';b.textContent=x[1];li.appendChild(a);li.appendChild(b);ol.appendChild(li)});
  var ul=$('#stop-liste');ul.textContent='';
  t.stop.forEach(function(x){var li=document.createElement('li');li.textContent=x;ul.appendChild(li)});
  ['nom','compte','initiale','objet','legende','creneau','auteur','avis','reponse','auteur2','avis2'].forEach(function(k){texte(k,p[k])});
  $$('[data-t="photo"]').forEach(function(i){i.src=p.photo});$$('[data-t="visuel"]').forEach(function(i){i.src=p.visuel});
  var vis=m||'restaurant';
  $$('#photos img, .probleme-photo img').forEach(function(i){i.hidden=(i.dataset.m!==vis)});
  $$('#demo figure').forEach(function(f){f.hidden=(f.dataset.m!==(vis==='autre'?'restaurant':vis))});
}
var gm=$('#g-metier'),autre=$('#f-autre'),gAutre=$('#g-autre');
function choisir(m){
  choix=m;
  $$('.m-choix').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.m===m))});
  remplir(m);gm.value=m;autre.hidden=(m!=='autre');gAutre.required=(m==='autre');
}
$$('.m-choix').forEach(function(b){b.addEventListener('click',function(){choisir(b.dataset.m)})});

// ---- Téléphone de démonstration : cinq écrans en boucle, pause possible, aucune boucle si l'utilisateur réduit les animations.
var tel=$('#tel'),pause=$('#tel-pause'),scene=1,minuteur=null,DUREES=[3400,3600,4200,3200,4800];
var calme=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function montrer(n){scene=n;tel.setAttribute('data-scene',String(n));
  $$('.tel-etapes button').forEach(function(b){if(+b.dataset.s===n)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')})}
function suivant(){montrer(scene%5+1);planifier()}
function planifier(){clearTimeout(minuteur);if(pause.getAttribute('aria-pressed')!=='true')minuteur=setTimeout(suivant,DUREES[scene-1])}
function arreter(){clearTimeout(minuteur);pause.setAttribute('aria-pressed','true');pause.textContent='Reprendre'}
pause.addEventListener('click',function(){if(pause.getAttribute('aria-pressed')==='true'){pause.setAttribute('aria-pressed','false');pause.textContent='Mettre en pause';planifier()}else arreter()});
$$('.tel-etapes button').forEach(function(b){b.addEventListener('click',function(){arreter();montrer(+b.dataset.s)})});
if(calme){arreter();montrer(3)}else planifier();

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
