// =========================================================
// CONFIG GILD-TECH — Fichier unique à modifier pour brancher
// le webhook n8n et gérer les endpoints externes.
// =========================================================

window.GILDTECH_CONFIG = {
  // URL du webhook n8n qui reçoit les leads du calculateur.
  // Workflow : "GILD-TECH — Calculateur Leads" (peejay.app.n8n.cloud)
  // Branche : Webhook → Format Data → [Google Sheets + Gmail + Respond OK]
  WEBHOOK_LEADS: 'https://peejay.app.n8n.cloud/webhook/calculateur-leads',

  // Fallback Formspree (en cas d'indispo n8n).
  // Créer un formulaire gratuit sur https://formspree.io et coller l'endpoint.
  // Format: https://formspree.io/f/xxxxx
  FORMSPREE_FALLBACK: '',

  // Mode debug : log les leads dans la console.
  DEBUG: true,

  // Timeout du webhook avant fallback (ms).
  WEBHOOK_TIMEOUT: 5000,

  // Lien Calendly (réutilisable partout).
  CALENDLY_URL: 'https://calendly.com/ops-gild-tech/30min',

  // Contact
  CONTACT_EMAIL: 'contact@gild-tech.com',
  CONTACT_WHATSAPP: '33699080539',
  LINKEDIN_URL: 'https://www.linkedin.com/company/gild-tech/'
};
