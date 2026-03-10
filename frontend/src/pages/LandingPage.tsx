import { useEffect, useState, useRef } from 'react';

/* ─── Types ─────────────────────────────────────────── */
type Lang = 'fr' | 'en';

/* ─── Translations ───────────────────────────────────── */
const T = {
  fr: {
    badge: 'Plateforme de gestion tout-en-un · Adapté à l\'Afrique',
    h1: ['Gérez votre ', 'complexe touristique', ' comme un ', 'pro'],
    heroSub: 'Piscine, restaurant, hôtel, maquis, pressing et plus — tout centralisé en une seule plateforme avec Mobile Money intégré.',
    btnTrial: '🚀 Essai gratuit',
    btnDiscover: 'Découvrir les modules →',
    connexion: 'Connexion',
    trialBtn: 'Essai gratuit',
    navModules: 'Modules', navFeatures: 'Fonctionnalités', navPay: 'Paiements', navTesti: 'Avis',
    statModules: '9+', statModulesL: 'Modules de gestion intégrés',
    statPay: '5', statPayL: 'Opérateurs Mobile Money',
    statAfrica: '100%', statAfricaL: 'Adapté au contexte africain',
    statRapport: '24h', statRapportL: 'Rapports & comptabilité en temps réel',
    modulesTag: '📦 NOS 9 MODULES', modulesH2: ['Une plateforme pour', 'tout votre complexe'],
    modulesSub: 'Chaque département de votre complexe a son propre espace, interconnecté avec la comptabilité centrale.',
    screenshotsTag: '📸 APERÇU EN DIRECT', screenshotsH2: ['L\'application', 'en action'],
    screenshotsSub: 'Interface pensée pour la vitesse et la simplicité. Vos équipes seront opérationnelles en quelques heures.',
    scrTab: ['Caisse', 'Restaurant', 'Pressing'],
    featuresTag: '⚡ FONCTIONNALITÉS', featuresH2: ['Tout ce dont vous avez besoin', 'pour gérer efficacement'],
    featuresSub: 'Des outils puissants conçus pour les réalités du terrain africain.',
    payTag: '💳 PAIEMENTS', payH2: ['Tous les modes de paiement', 'de votre marché'],
    paySub: 'Ollentra accepte tous les moyens de paiement courants en Afrique de l\'Ouest. Chaque transaction est tracée et référencée.',
    workflowTag: '🚀 DÉMARRAGE', workflowH2: 'En ligne en moins de 24h',
    workflowSub: 'Pas de matériel à acheter, pas de logiciel à installer. Ollentra fonctionne sur n\'importe quel navigateur.',
    testiTag: '⭐ TÉMOIGNAGES', testiH2: 'Ils nous font confiance',
    testiSub: 'Des gestionnaires de complexes comme le vôtre utilisent Ollentra au quotidien.',
    ctaH2: ['Prêt à transformer', 'la gestion de votre complexe ?'],
    ctaSub: 'Rejoignez les gestionnaires qui pilotent leur activité sereinement grâce à Ollentra.',
    ctaBtn: '📩 Démarrer l\'essai gratuit',
    ctaNote: 'Réponse sous 24h · Démo gratuite · Sans engagement',
    modalTitle: 'Démarrer votre essai gratuit',
    modalSub: 'Remplissez ce formulaire et nous vous contacterons dans les 24h pour configurer votre espace.',
    fName: 'Prénom et Nom *', fPhone: 'Téléphone (WhatsApp) *', fEmail: 'Email (optionnel)',
    fBusiness: 'Nom de votre complexe *', fCity: 'Ville / Localité', fModules: 'Modules souhaités',
    fMessage: 'Message (optionnel)', fSubmit: 'Envoyer ma demande',
    fSuccess: '🎉 Demande envoyée ! Nous vous contacterons sous 24h.',
    fError: '❌ Erreur. Vérifiez votre connexion et réessayez.',
    footerDesc: 'La plateforme de gestion tout-en-un pour les complexes touristiques et de loisirs en Afrique.',
    copy: '© 2026 Ollentra. Tous droits réservés.',
    customBadge: 'Sur mesure',
    fLoading: '⏳ Envoi en cours...',
    alreadyClient: 'Déjà client ?',
    heroModules: [
      {i:'🏊',n:'Piscine',v:'Tickets & abonnements'},{i:'🍽️',n:'Restaurant',v:'Tables & commandes'},
      {i:'🏨',n:'Hôtel',v:'Réservations'},{i:'🚗',n:'Lavage Auto',v:'Prestations & tickets'},
      {i:'👔',n:'Pressing',v:'Commandes & retrait'},{i:'🎉',n:'Événements',v:'Devis & planning'},
      {i:'🍺',n:'Maquis / Bar',v:'Additions & encaissement'},{i:'🛒',n:'Supérette',v:'Stock & ventes'},
      {i:'📦',n:'Dépôt',v:'Crédit & fournisseurs'},
    ],
    sidebarItems: [
      {i:'🏊',l:'Piscine'},{i:'🍽️',l:'Restaurant'},{i:'🏨',l:'Hôtel'},{i:'🎉',l:'Événements'},
      {i:'🚗',l:'Lavage Auto'},{i:'👔',l:'Pressing'},{i:'🍺',l:'Maquis / Bar'},
      {i:'🛒',l:'Supérette'},{i:'📦',l:'Dépôt'},{i:'🧾',l:'Caisse'},{i:'📊',l:'Mes Rapports'},
    ],
    screenTitles: ['Caisse','Restaurant','Pressing / Repassage'],
    paymentItems: [
      {name:'Espèces',sub:'Paiement direct'},{name:'Orange Money',sub:'Avec référence transaction'},
      {name:'Moov Africa',sub:'Avec référence transaction'},{name:'MTN Money',sub:'Avec référence transaction'},
      {name:'Wave',sub:'Avec référence transaction'},{name:'Carte bancaire',sub:'7 derniers chiffres tracés'},
    ],
    moduleChoices: ['Piscine','Restaurant','Hôtel','Événements','Lavage Auto','Pressing','Maquis / Bar','Supérette','Dépôt'],
    steps: [
      {num:1,title:'Contactez-nous',desc:'Décrivez votre complexe, vos modules et le nombre d\'utilisateurs. On configure tout pour vous.'},
      {num:2,title:'Configuration sur mesure',desc:'On paramètre vos produits, chambres, menus, tarifs et employés. Champs adaptables à votre demande.'},
      {num:3,title:'Formation de votre équipe',desc:'Une session de formation pour vos équipes. Interface simple, prise en main rapide.'},
      {num:4,title:'Go ! Vous gérez en pro',desc:'Votre complexe tourne sur Ollentra. Rapports accessibles depuis votre téléphone.'},
    ],
    testimonials: [
      {stars:5,text:'"Avant Ollentra, je passais des heures à tout noter dans des cahiers. Maintenant, en 30 secondes, j\'ai le chiffre d\'affaires de la journée sur mon téléphone."',initials:'A',name:'Amadou K.',role:'Gérant, Complexe touristique — Côte d\'Ivoire',color:'#1976d2'},
      {stars:5,text:'"Le module dépôt avec le crédit client est une révolution. On sait exactement qui nous doit quoi, et les encaissements par Moov Money sont tracés automatiquement."',initials:'F',name:'Fatou D.',role:'Responsable dépôt — Burkina Faso',color:'#00897b'},
      {stars:5,text:'"J\'ai 3 activités dans mon complexe. Ollentra m\'a donné une vue globale que je n\'avais jamais eue. Mon comptable est ravi."',initials:'M',name:'Michel O.',role:'Directeur, Resort & Loisirs — Congo',color:'#7b1fa2'},
    ],
    modules: [
      {icon:'🏊',title:'Piscine',color:'#1976d2',desc:'Vendez des tickets d\'entrée, gérez les abonnements mensuels/annuels, suivez les entrées journalières et les revenus en temps réel.',tags:['Tickets journaliers','Abonnements','Statistiques']},
      {icon:'🍽️',title:'Restaurant',color:'#e53935',desc:'Prenez les commandes par table, gérez la carte et les prix, envoyez directement en cuisine et encaissez via la caisse centrale.',tags:['Commandes par table','Cuisine en direct','Reçus']},
      {icon:'🏨',title:'Hôtel',color:'#7b1fa2',desc:'Gérez vos chambres, les réservations, les check-in/check-out, les acomptes et les extensions de séjour depuis un seul écran.',tags:['Réservations','Check-in/out','Prolongation séjour']},
      {icon:'🎉',title:'Événements',color:'#c62828',desc:'Planifiez mariages, conférences et fêtes. Créez des devis détaillés, suivez l\'avancement et facturez vos clients.',tags:['Devis automatiques','Planning','Facturation']},
      {icon:'🚗',title:'Lavage Auto',color:'#0097a7',desc:'Enregistrez chaque prestation (lavage intérieur, extérieur, complet), la plaque du véhicule et le montant. Ticket imprimable.',tags:['Types de lavage','Plaque véhicule','Ticket caisse']},
      {icon:'👔',title:'Pressing',color:'#6d4c41',desc:'Créez vos types de vêtements (chemise, pantalon, costume...), enregistrez les commandes et transférez le paiement à la caisse.',tags:['Types vêtements','Commandes','Caisse centrale']},
      {icon:'🍺',title:'Maquis / Bar',color:'#f9a825',desc:'Gérez les ventes de boissons et repas au bar, ouvrez des additions et encaissez en fin de service depuis la caisse centrale.',tags:['Additions ouvertes','Bar & restauration','Encaissement']},
      {icon:'🛒',title:'Supérette',color:'#f57c00',desc:'Gérez votre stock produit par produit avec alerte de rupture, encaissez au panier avec Mobile Money ou espèces.',tags:['Gestion stock','Approvisionnement','Fournisseurs']},
      {icon:'📦',title:'Dépôt',color:'#00897b',desc:'Vendez à vos clients revendeurs, gérez le crédit client avec historique complet, passez et recevez vos commandes fournisseurs.',tags:['Crédit client','Commandes fournisseurs','Mobile Money']},
    ],
    features: [
      {icon:'📊',title:'Rapports & Statistiques',desc:'Visualisez vos revenus par module, par employé, par mode de paiement. Exportez vos données pour votre comptable.'},
      {icon:'🏦',title:'Comptabilité intégrée',desc:'Chaque transaction génère automatiquement une écriture comptable. Suivez vos entrées, sorties et bénéfices en temps réel.'},
      {icon:'📱',title:'Mobile Money natif',desc:'Moov, Orange, Wave, MTN. Chaque paiement lié à sa référence de transaction — aucune perte non tracée.'},
      {icon:'🔔',title:'Alertes de stock',desc:'Recevez une alerte automatique quand un produit atteint son stock minimum. Ne soyez plus jamais en rupture.'},
      {icon:'👥',title:'Multi-utilisateurs & rôles',desc:'Caissiers, serveurs, réceptionnistes, directeur, maire. Chaque employé n\'accède qu\'à son module.'},
      {icon:'🔐',title:'Sécurisé & cloud',desc:'Vos données sont sauvegardées en temps réel dans le cloud. Aucun risque de perte, accessible depuis n\'importe quel appareil.'},
      {icon:'🧾',title:'Caisse centralisée',desc:'Une seule caisse pour encaisser tous les tickets en attente (restaurant, dépôt, piscine). Traçabilité totale.'},
      {icon:'📦',title:'Commandes fournisseurs',desc:'Créez vos bons de commande, enregistrez les réceptions partielles, suivez les paiements.'},
      {icon:'⚙️',title:'Configuration personnalisée',desc:'Certains libellés, champs et paramètres peuvent être adaptés à votre demande selon vos besoins spécifiques.',custom:true},
      {icon:'💬',title:'Interface en français',desc:'Entièrement en français, conçu pour les opérateurs francophones d\'Afrique de l\'Ouest et Centrale.'},
    ],
  },
  en: {
    badge: 'All-in-one management platform · Built for Africa',
    h1: ['Manage your ', 'leisure complex', ' like a ', 'pro'],
    heroSub: 'Pool, restaurant, hotel, bar, laundry and more — all centralized in one platform with Mobile Money integrated.',
    btnTrial: '🚀 Free Trial',
    btnDiscover: 'Discover modules →',
    connexion: 'Login',
    trialBtn: 'Free Trial',
    navModules: 'Modules', navFeatures: 'Features', navPay: 'Payments', navTesti: 'Reviews',
    statModules: '9+', statModulesL: 'Integrated management modules',
    statPay: '5', statPayL: 'Mobile Money operators',
    statAfrica: '100%', statAfricaL: 'Built for African context',
    statRapport: '24h', statRapportL: 'Reports & accounting in real time',
    modulesTag: '📦 OUR 9 MODULES', modulesH2: ['One platform for', 'your entire complex'],
    modulesSub: 'Each department of your complex has its own space, connected to central accounting.',
    screenshotsTag: '📸 LIVE PREVIEW', screenshotsH2: ['The app', 'in action'],
    screenshotsSub: 'Interface designed for speed and simplicity. Your teams will be up and running in hours.',
    scrTab: ['Cashier', 'Restaurant', 'Laundry'],
    featuresTag: '⚡ FEATURES', featuresH2: ['Everything you need', 'to manage efficiently'],
    featuresSub: 'Powerful tools built for African field realities.',
    payTag: '💳 PAYMENTS', payH2: ['All payment methods', 'for your market'],
    paySub: 'Ollentra accepts all common payment methods in West Africa. Every transaction is tracked.',
    workflowTag: '🚀 GETTING STARTED', workflowH2: 'Online in less than 24h',
    workflowSub: 'No hardware to buy, no software to install. Ollentra works on any browser.',
    testiTag: '⭐ TESTIMONIALS', testiH2: 'They trust us',
    testiSub: 'Complex managers like yours use Ollentra every day.',
    ctaH2: ['Ready to transform', 'your complex management?'],
    ctaSub: 'Join managers who run their business smoothly with Ollentra.',
    ctaBtn: '📩 Start free trial',
    ctaNote: 'Reply within 24h · Free demo · No commitment',
    modalTitle: 'Start your free trial',
    modalSub: 'Fill in this form and we will contact you within 24h to set up your space.',
    fName: 'First & Last Name *', fPhone: 'Phone (WhatsApp) *', fEmail: 'Email (optional)',
    fBusiness: 'Your complex name *', fCity: 'City / Location', fModules: 'Desired modules',
    fMessage: 'Message (optional)', fSubmit: 'Send my request',
    fSuccess: '🎉 Request sent! We will contact you within 24h.',
    fError: '❌ Error. Check your connection and try again.',
    footerDesc: 'The all-in-one management platform for tourist and leisure complexes in Africa.',
    copy: '© 2026 Ollentra. All rights reserved.',
    customBadge: 'Custom',
    fLoading: '⏳ Sending...',
    alreadyClient: 'Already a client?',
    heroModules: [
      {i:'🏊',n:'Pool',v:'Tickets & subscriptions'},{i:'🍽️',n:'Restaurant',v:'Tables & orders'},
      {i:'🏨',n:'Hotel',v:'Reservations'},{i:'🚗',n:'Car Wash',v:'Services & tickets'},
      {i:'👔',n:'Laundry',v:'Orders & pickup'},{i:'🎉',n:'Events',v:'Quotes & planning'},
      {i:'🍺',n:'Bar',v:'Tabs & cashout'},{i:'🛒',n:'Store',v:'Stock & sales'},
      {i:'📦',n:'Depot',v:'Credit & suppliers'},
    ],
    sidebarItems: [
      {i:'🏊',l:'Pool'},{i:'🍽️',l:'Restaurant'},{i:'🏨',l:'Hotel'},{i:'🎉',l:'Events'},
      {i:'🚗',l:'Car Wash'},{i:'👔',l:'Laundry'},{i:'🍺',l:'Bar'},
      {i:'🛒',l:'Store'},{i:'📦',l:'Depot'},{i:'🧾',l:'Cashier'},{i:'📊',l:'My Reports'},
    ],
    screenTitles: ['Cashier','Restaurant','Laundry / Ironing'],
    paymentItems: [
      {name:'Cash',sub:'Direct payment'},{name:'Orange Money',sub:'With transaction reference'},
      {name:'Moov Africa',sub:'With transaction reference'},{name:'MTN Money',sub:'With transaction reference'},
      {name:'Wave',sub:'With transaction reference'},{name:'Bank card',sub:'Last 7 digits tracked'},
    ],
    moduleChoices: ['Pool','Restaurant','Hotel','Events','Car Wash','Laundry','Bar','Store','Depot'],
    steps: [
      {num:1,title:'Contact us',desc:'Describe your complex, modules and number of users. We configure everything for you.'},
      {num:2,title:'Custom setup',desc:'We configure your products, rooms, menus, pricing and staff. Fields adaptable on request.'},
      {num:3,title:'Train your team',desc:'A training session for your teams. Simple interface, quick to learn.'},
      {num:4,title:'Go! Manage like a pro',desc:'Your complex runs on Ollentra. Reports accessible from your phone.'},
    ],
    testimonials: [
      {stars:5,text:'"Before Ollentra, I spent hours writing everything in notebooks. Now, in 30 seconds, I have the day\'s revenue on my phone."',initials:'A',name:'Amadou K.',role:'Manager, Tourist Complex — Côte d\'Ivoire',color:'#1976d2'},
      {stars:5,text:'"The depot module with customer credit is a revolution. We know exactly who owes us what, and Moov Money payments are tracked automatically."',initials:'F',name:'Fatou D.',role:'Depot Manager — Burkina Faso',color:'#00897b'},
      {stars:5,text:'"I have 3 activities in my complex. Ollentra gave me an overall view I never had before. My accountant is thrilled."',initials:'M',name:'Michel O.',role:'Director, Resort & Leisure — Congo',color:'#7b1fa2'},
    ],
    modules: [
      {icon:'🏊',title:'Pool',color:'#1976d2',desc:'Sell entry tickets, manage monthly/annual subscriptions, track daily entries and revenue in real time.',tags:['Daily tickets','Subscriptions','Statistics']},
      {icon:'🍽️',title:'Restaurant',color:'#e53935',desc:'Take orders by table, manage the menu and prices, send directly to kitchen and collect via the central cashier.',tags:['Table orders','Live kitchen','Receipts']},
      {icon:'🏨',title:'Hotel',color:'#7b1fa2',desc:'Manage your rooms, reservations, check-in/check-out, deposits and stay extensions from one screen.',tags:['Reservations','Check-in/out','Stay extension']},
      {icon:'🎉',title:'Events',color:'#c62828',desc:'Plan weddings, conferences and parties. Create detailed quotes, track progress and invoice your clients.',tags:['Auto quotes','Planning','Invoicing']},
      {icon:'🚗',title:'Car Wash',color:'#0097a7',desc:'Record each service (interior, exterior, full wash), the vehicle plate and amount. Printable ticket.',tags:['Wash types','Vehicle plate','Cashier ticket']},
      {icon:'👔',title:'Laundry',color:'#6d4c41',desc:'Create your clothing types (shirt, trousers, suit...), record orders and transfer payment to the cashier.',tags:['Clothing types','Orders','Central cashier']},
      {icon:'🍺',title:'Bar',color:'#f9a825',desc:'Manage drink and food sales at the bar, open tabs and collect at end of service from the central cashier.',tags:['Open tabs','Bar & food','Collection']},
      {icon:'🛒',title:'Store',color:'#f57c00',desc:'Manage your stock product by product with low-stock alerts, checkout with Mobile Money or cash.',tags:['Stock management','Restocking','Suppliers']},
      {icon:'📦',title:'Depot',color:'#00897b',desc:'Sell to reseller clients, manage customer credit with full history, place and receive supplier orders.',tags:['Customer credit','Supplier orders','Mobile Money']},
    ],
    features: [
      {icon:'📊',title:'Reports & Statistics',desc:'View your revenue by module, employee, payment method. Export your data for your accountant.'},
      {icon:'🏦',title:'Integrated accounting',desc:'Every transaction automatically generates an accounting entry. Track income, expenses and profit in real time.'},
      {icon:'📱',title:'Native Mobile Money',desc:'Moov, Orange, Wave, MTN. Every payment linked to its transaction reference — no untracked loss.'},
      {icon:'🔔',title:'Stock alerts',desc:'Get an automatic alert when a product reaches its minimum stock. Never run out again.'},
      {icon:'👥',title:'Multi-user & roles',desc:'Cashiers, waiters, receptionists, director, mayor. Each employee only accesses their module.'},
      {icon:'🔐',title:'Secure & cloud',desc:'Your data is backed up in real time to the cloud. No risk of loss, accessible from any device.'},
      {icon:'🧾',title:'Centralized cashier',desc:'One cashier to collect all pending tickets (restaurant, depot, pool). Full traceability.'},
      {icon:'📦',title:'Supplier orders',desc:'Create purchase orders, record partial receipts, track payments.'},
      {icon:'⚙️',title:'Custom configuration',desc:'Certain labels, fields and settings can be adapted to your request based on your specific needs.',custom:true},
      {icon:'💬',title:'French interface',desc:'Fully in French, designed for francophone operators in West and Central Africa.'},
    ],
  }
};

/* ─── Operator SVG Logos ────────────────────────────── */
const OrangeSVG = () => (
  <svg viewBox="0 0 120 80" style={{width:'100%',height:'100%',display:'block'}}>
    <rect width="120" height="80" rx="10" fill="#FF6900"/>
    <text x="60" y="56" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold" fontFamily="Arial,Helvetica,sans-serif" letterSpacing="-1">orange</text>
    <text x="107" y="36" fill="white" fontSize="13" fontFamily="Arial,sans-serif">™</text>
  </svg>
);

const MoovSVG = () => (
  <svg viewBox="0 0 120 80" style={{width:'100%',height:'100%',display:'block'}}>
    <rect width="120" height="80" rx="10" fill="#2E5FA3"/>
    <text x="30" y="38" fill="white" fontSize="15" fontWeight="bold" fontFamily="Arial,Helvetica,sans-serif">Moov</text>
    <text x="23" y="56" fill="white" fontSize="15" fontWeight="bold" fontFamily="Arial,Helvetica,sans-serif">Africa</text>
    <path d="M80 10 Q115 40 80 70 Q98 40 80 10Z" fill="#E8640B"/>
    <rect x="88" y="28" width="9" height="9" rx="1" fill="#E8640B" transform="rotate(45 92.5 32.5)"/>
    <rect x="96" y="22" width="7" height="7" rx="1" fill="#E8640B" transform="rotate(45 99.5 25.5)"/>
    <rect x="103" y="17" width="5" height="5" rx="1" fill="#E8640B" transform="rotate(45 105.5 19.5)"/>
  </svg>
);

const MTNSVG = () => (
  <svg viewBox="0 0 120 80" style={{width:'100%',height:'100%',display:'block'}}>
    <rect width="120" height="80" rx="10" fill="#FFCB00"/>
    <ellipse cx="60" cy="40" rx="52" ry="30" fill="none" stroke="#1a1a1a" strokeWidth="5"/>
    <text x="60" y="50" textAnchor="middle" fill="#1a1a1a" fontSize="24" fontWeight="900" fontFamily="Arial Black,Arial,sans-serif">MTN</text>
  </svg>
);

const WaveSVG = () => (
  <svg viewBox="0 0 120 80" style={{width:'100%',height:'100%',display:'block'}}>
    <rect width="120" height="80" rx="10" fill="#40BDE8"/>
    {/* Body */}
    <ellipse cx="60" cy="50" rx="20" ry="24" fill="#1a1a1a"/>
    {/* Belly */}
    <ellipse cx="60" cy="52" rx="12" ry="16" fill="white"/>
    {/* Eyes */}
    <circle cx="54" cy="40" r="3.5" fill="white"/>
    <circle cx="66" cy="40" r="3.5" fill="white"/>
    <circle cx="55" cy="40.5" r="1.5" fill="#1a1a1a"/>
    <circle cx="67" cy="40.5" r="1.5" fill="#1a1a1a"/>
    {/* Beak */}
    <ellipse cx="60" cy="46" rx="4.5" ry="2.8" fill="#E8640B"/>
    {/* Left wing waving */}
    <path d="M40 45 Q30 52 38 60 Q44 54 44 46Z" fill="#1a1a1a"/>
    {/* Feet */}
    <ellipse cx="52" cy="73" rx="6" ry="4" fill="#E8640B"/>
    <ellipse cx="68" cy="73" rx="6" ry="4" fill="#E8640B"/>
    {/* Wave text */}
    <text x="60" y="11" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial,sans-serif">Wave</text>
  </svg>
);

const EspecesSVG = ({ label = 'Espèces' }: { label?: string }) => (
  <svg viewBox="0 0 120 80" style={{width:'100%',height:'100%',display:'block'}}>
    <rect width="120" height="80" rx="10" fill="#2e7d32"/>
    <rect x="10" y="20" width="100" height="40" rx="6" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1.5"/>
    <rect x="20" y="28" width="80" height="24" rx="4" fill="rgba(255,255,255,.12)"/>
    <circle cx="60" cy="40" r="10" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="1.5"/>
    <text x="60" y="44" textAnchor="middle" fill="rgba(255,255,255,.9)" fontSize="11" fontWeight="bold" fontFamily="Arial,sans-serif">FCFA</text>
    <circle cx="22" cy="40" r="5" fill="rgba(255,255,255,.2)"/>
    <circle cx="98" cy="40" r="5" fill="rgba(255,255,255,.2)"/>
    <text x="60" y="70" textAnchor="middle" fill="rgba(255,255,255,.7)" fontSize="9" fontFamily="Arial,sans-serif">{label}</text>
  </svg>
);

const CarteSVG = ({ label = 'Carte bancaire' }: { label?: string }) => (
  <svg viewBox="0 0 120 80" style={{width:'100%',height:'100%',display:'block'}}>
    <rect width="120" height="80" rx="10" fill="#37474f"/>
    <rect x="8" y="16" width="104" height="48" rx="8" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.5"/>
    <rect x="8" y="30" width="104" height="14" fill="rgba(255,255,255,.12)"/>
    <rect x="18" y="48" width="18" height="12" rx="2" fill="#FFCB00" opacity=".8"/>
    <rect x="40" y="52" width="30" height="3" rx="1" fill="rgba(255,255,255,.4)"/>
    <rect x="40" y="57" width="20" height="2" rx="1" fill="rgba(255,255,255,.25)"/>
    <text x="60" y="72" textAnchor="middle" fill="rgba(255,255,255,.7)" fontSize="9" fontFamily="Arial,sans-serif">{label}</text>
  </svg>
);

/* ─── Payment SVGs (order matches T.paymentItems) ──────── */
// Note: paySvgs is now computed inside the component to support i18n labels


/* ─── App Mockup Screens ─────────────────────────────── */
function CaisseScreen() {
  return (
    <div className="mk-content">
      <div className="mk-tabs">
        <div className="mk-tab active">💰 ENCAISSEMENT <span className="mk-badge">1</span></div>
        <div className="mk-tab">📊 CLÔTURER MA CAISSE</div>
      </div>
      <div className="mk-mod-grid">
        {[{e:'🏊',l:'Piscine',s:'Clôture directe'},{e:'🍽️',l:'Restaurant',b:'1 ticket',sel:true},{e:'🏨',l:'Hôtel',s:'Clôture directe'},{e:'🎉',l:'Événements',s:'Clôture directe'},{e:'🚗',l:'Lavage',s:'Aucun'},{e:'👔',l:'Pressing',s:'Aucun'},{e:'🍺',l:'Maquis',s:'Aucun'},{e:'🛒',l:'Supérette',s:'Aucun'},{e:'📦',l:'Dépôt',s:'Aucun'}].map(m => (
          <div key={m.l} className={`mk-mod${m.sel?' sel':''}`}>
            <div className="mk-mod-ico">{m.e}</div>
            <div className="mk-mod-lbl">{m.l}</div>
            {m.b ? <div className="mk-mod-badge">{m.b}</div> : <div className="mk-mod-sub">{m.s}</div>}
          </div>
        ))}
      </div>
      <div className="mk-ticket-panel">
        <div className="mk-panel-hdr"><span className="mk-panel-title">🧾 Restaurant — Tickets en attente</span><span className="mk-panel-badge">1 ticket</span></div>
        <div className="mk-ticket-row">
          <div><div className="mk-t-ref">Table 103</div><div className="mk-t-sub">Riz sauce arachide ×3</div></div>
          <div className="mk-t-time">13:41</div>
          <div className="mk-t-total">16 500 FCFA</div>
          <button className="mk-btn-pay">💰 Encaisser</button>
        </div>
      </div>
    </div>
  );
}

function RestaurantScreen() {
  return (
    <div className="mk-content">
      <div className="mk-stats4">
        {[{n:'1',l:'Ventes'},{n:'3 000 F',l:'Recette'},{n:'1/4',l:'Tables',o:true},{n:'1',l:'Actives',o:true}].map(s => (
          <div key={s.l} className="mk-stat4"><div className={`mk-stat4-n${s.o?' orange':''}`}>{s.n}</div><div className="mk-stat4-l">{s.l}</div></div>
        ))}
      </div>
      <div className="mk-tabs" style={{marginBottom:10}}>
        {['NOUVELLE COMMANDE','TICKETS','TABLES'].map(t => <div key={t} className="mk-tab">{t}</div>)}
        <div className="mk-tab active">🍳 CUISINE <span className="mk-badge">1</span></div>
        <div className="mk-tab">VENTES</div>
      </div>
      <div style={{fontWeight:700,fontSize:13,color:'#1e3a6b',marginBottom:6}}>🔍 Commandes en cuisine <span className="mk-badge" style={{marginLeft:6}}>1</span></div>
      <div style={{fontWeight:600,fontSize:11,color:'#ef4444',marginBottom:8}}>● Nouvelles (1)</div>
      <div className="mk-order-card">
        <div className="mk-order-hdr"><span className="mk-order-tbl">Table 103</span><span className="mk-order-hr">13:41</span></div>
        <div className="mk-order-items">× 3 Riz sauce arachide</div>
        <button className="mk-btn-recv">🖐 Accuser réception</button>
      </div>
    </div>
  );
}

function PressingScreen() {
  return (
    <div className="mk-content">
      <div className="mk-stats4" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
        {[{n:'0',l:'Commandes du jour'},{n:'0',l:'En attente (Caisse)',o:true},{n:'16',l:'Types actifs',p:true}].map(s => (
          <div key={s.l} className="mk-stat4"><div className={`mk-stat4-n${s.o?' orange':s.p?' purple':''}`}>{s.n}</div><div className="mk-stat4-l">{s.l}</div></div>
        ))}
      </div>
      <div className="mk-info-banner">🏪 <strong>Paiements à la Caisse</strong> — Les commandes sont enregistrées ici. Le client règle à la Caisse.</div>
      <div className="mk-actions">
        <button className="mk-action-btn brown">+ Nouvelle Commande</button>
        <button className="mk-action-btn orange-btn">🏪 Aller à la Caisse</button>
        <button className="mk-action-btn blue-btn">↻ Actualiser</button>
      </div>
      <div className="mk-tabs" style={{marginBottom:8}}>
        <div className="mk-tab active">COMMANDES DU JOUR (0)</div>
        <div className="mk-tab">EN ATTENTE CAISSE</div>
        <div className="mk-tab">GESTION DES TYPES</div>
      </div>
      <div className="mk-tbl-hdr">
        {['#','Client','Articles','Montant','Statut','Heure','Ticket'].map(h => <div key={h} className="mk-th">{h}</div>)}
      </div>
      <div className="mk-empty">Aucune commande aujourd'hui</div>
    </div>
  );
}

/* ─── Ollentra Shield Logo (fidèle au vrai logo) ─────── */
const OllentraLogo = ({ size = 38 }: { size?: number }) => (
  <svg width={size} height={Math.round(size * 1.1)} viewBox="0 0 50 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer shield — bleu */}
    <path d="M7 7 L25 2 L43 7 L48 15 L48 33 C48 46 36 53 25 55 C14 53 2 46 2 33 L2 15 Z" fill="#1565c0"/>
    {/* Inner shield — blanc (effet double-bordure) */}
    <path d="M10 10 L25 6 L40 10 L44.5 17 L44.5 33 C44.5 43 34.5 49.5 25 51.5 C15.5 49.5 5.5 43 5.5 33 L5.5 17 Z" fill="white"/>
    {/* Checkmark + flèche montante droite */}
    <path d="M14 32 L22 40 L38 20" stroke="#1565c0" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    {/* Angle flèche coin supérieur droit */}
    <path d="M33 14 L42 14 L42 23" stroke="#1565c0" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

/* ─── CSS ─────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--blue:#1565c0;--teal:#00897b;--dark:#0a1628;--gray:#64748b;--light:#f1f5f9}
.lp-root{font-family:'Inter',sans-serif;background:#fff;color:#0a1628;overflow-x:hidden;scroll-behavior:smooth}
/* NAVBAR */
nav.lp-nav{position:fixed;top:0;left:0;right:0;z-index:999;display:flex;align-items:center;justify-content:space-between;padding:14px 5%;backdrop-filter:blur(20px);background:rgba(255,255,255,.92);border-bottom:1px solid rgba(21,101,192,.1);transition:box-shadow .3s;gap:12px}
nav.lp-nav.scrolled{box-shadow:0 4px 30px rgba(0,0,0,.08)}
.nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none;flex-shrink:0}
.nav-logo-text{font-size:20px;font-weight:800;color:#0a1628;letter-spacing:-.5px}
.nav-logo-text em{color:#1565c0;font-style:normal}
.nav-links{display:flex;gap:24px;list-style:none;flex:1;justify-content:center}
.nav-links a{text-decoration:none;color:#64748b;font-size:14px;font-weight:500;transition:color .2s}
.nav-links a:hover{color:#1565c0}
.nav-actions{display:flex;align-items:center;gap:10px;flex-shrink:0}
/* LANGUAGE SELECTOR */
.lang-selector{position:relative}
.lang-btn{display:flex;align-items:center;gap:6px;background:none;border:1.5px solid #e2e8f0;padding:7px 12px;border-radius:8px;font-size:13px;font-weight:500;color:#374151;cursor:pointer;transition:border-color .2s}
.lang-btn:hover{border-color:#1565c0;color:#1565c0}
.lang-dropdown{position:absolute;top:calc(100% + 6px);right:0;background:#fff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.12);overflow:hidden;min-width:140px;z-index:1000}
.lang-option{padding:10px 16px;font-size:13px;font-weight:500;color:#374151;cursor:pointer;display:flex;align-items:center;gap:8px;transition:background .2s}
.lang-option:hover{background:#f1f5f9}
.lang-option.active{background:#eff6ff;color:#1565c0;font-weight:700}
/* NAVBAR BUTTONS */
.nav-connexion{background:#fff;color:#1565c0;border:1.5px solid #1565c0;padding:8px 18px;border-radius:50px;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;transition:all .2s}
.nav-connexion:hover{background:#eff6ff}
.nav-trial{background:#1565c0;color:#fff;border:none;padding:9px 20px;border-radius:50px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;transition:transform .2s,box-shadow .2s;display:inline-block}
.nav-trial:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(21,101,192,.4)}
/* HERO */
.hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:110px 6% 80px;background:linear-gradient(160deg,#0a1628 0%,#132340 40%,#0d2f5e 70%,#003d6b 100%);position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(21,101,192,.4) 0%,transparent 70%)}
.hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);padding:8px 18px;border-radius:50px;color:#93c5fd;font-size:13px;font-weight:600;margin-bottom:28px;backdrop-filter:blur(10px);position:relative;z-index:1;animation:fadeDown .8s ease both}
.badge-dot{width:7px;height:7px;background:#4ade80;border-radius:50%;animation:pulse 2s infinite}
.hero h1{font-size:clamp(2.2rem,5.5vw,4rem);font-weight:900;color:#fff;line-height:1.1;max-width:820px;margin-bottom:24px;position:relative;z-index:1;animation:fadeUp .8s .1s ease both}
.accent{color:#60a5fa}.accent2{color:#34d399}
.hero p.hero-sub{font-size:clamp(.95rem,2vw,1.15rem);color:rgba(255,255,255,.72);max-width:600px;line-height:1.7;margin-bottom:40px;position:relative;z-index:1;animation:fadeUp .8s .2s ease both}
.hero-btns{display:flex;gap:16px;flex-wrap:wrap;justify-content:center;position:relative;z-index:1;animation:fadeUp .8s .3s ease both}
.btn-primary{background:linear-gradient(135deg,#1976d2,#00897b);color:#fff;padding:16px 34px;border-radius:50px;font-size:16px;font-weight:700;text-decoration:none;border:none;cursor:pointer;box-shadow:0 8px 32px rgba(21,101,192,.45);transition:transform .2s,box-shadow .2s;display:inline-block}
.btn-primary:hover{transform:translateY(-3px);box-shadow:0 12px 40px rgba(21,101,192,.55)}
.btn-secondary{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.3);padding:16px 34px;border-radius:50px;font-size:16px;font-weight:600;text-decoration:none;backdrop-filter:blur(10px);transition:background .2s;display:inline-block}
.btn-secondary:hover{background:rgba(255,255,255,.2)}
.hero-visual{position:relative;z-index:1;margin-top:60px;width:100%;max-width:900px;animation:fadeUp .8s .4s ease both}
.hero-screen{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);border-radius:20px;padding:24px;backdrop-filter:blur(20px)}
.screen-bar{display:flex;gap:6px;margin-bottom:16px}
.screen-bar span{width:12px;height:12px;border-radius:50%}
.dot-r{background:#ff5f57}.dot-y{background:#febc2e}.dot-g{background:#28c840}
.screen-modules{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.screen-mod{background:rgba(255,255,255,.08);border-radius:12px;padding:14px 10px;text-align:center;border:1px solid rgba(255,255,255,.1);transition:transform .3s,background .3s}
.screen-mod:hover{transform:translateY(-4px);background:rgba(255,255,255,.14)}
.sm-icon{font-size:24px;margin-bottom:6px}
.sm-name{color:rgba(255,255,255,.9);font-size:12px;font-weight:600}
.sm-val{color:rgba(255,255,255,.5);font-size:10px;margin-top:3px}
/* STATS */
.stats-bar{background:#1565c0;padding:56px 6%}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:32px;max-width:1000px;margin:0 auto;text-align:center}
.stat-item .num{font-size:2.8rem;font-weight:900;color:#fff}
.stat-item .unit{font-size:1.5rem;color:#93c5fd}
.stat-item p{color:rgba(255,255,255,.7);font-size:13px;margin-top:6px}
/* SECTIONS */
section.lp-section{padding:90px 6%}
.section-tag{display:inline-block;background:rgba(21,101,192,.1);color:#1565c0;padding:6px 16px;border-radius:50px;font-size:12px;font-weight:700;margin-bottom:16px;letter-spacing:.5px}
.lp-h2{font-size:clamp(1.7rem,3.8vw,2.6rem);font-weight:800;color:#0a1628;line-height:1.2;margin-bottom:14px}
.subtitle{font-size:1rem;color:#64748b;max-width:600px;line-height:1.7;margin-bottom:52px}
.text-center{text-align:center}.mx-auto{margin-left:auto;margin-right:auto}
/* MODULES */
.modules-bg{background:#f1f5f9}
.modules-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:22px}
.module-card{background:#fff;border-radius:16px;padding:30px;box-shadow:0 4px 20px rgba(0,0,0,.06);border:1px solid rgba(0,0,0,.06);transition:transform .3s,box-shadow .3s;position:relative;overflow:hidden}
.module-card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:var(--cc)}
.module-card:hover{transform:translateY(-6px);box-shadow:0 20px 60px rgba(0,0,0,.12)}
.module-icon{width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:18px}
.module-card h3{font-size:1.15rem;font-weight:700;margin-bottom:10px;color:#0a1628}
.module-card p{color:#64748b;font-size:13.5px;line-height:1.6;margin-bottom:18px}
.module-tags{display:flex;flex-wrap:wrap;gap:7px}
.tag{font-size:11px;font-weight:600;padding:3px 10px;border-radius:50px}
/* SCREENSHOTS */
.screenshots-bg{background:#fff}
.scr-tabs{display:flex;border-radius:12px;overflow:hidden;border:1.5px solid #e2e8f0;width:fit-content;margin:0 auto 36px}
.scr-tab{padding:11px 26px;font-size:13px;font-weight:600;border:none;background:#f8faff;color:#64748b;cursor:pointer;transition:all .2s}
.scr-tab.active{background:#1565c0;color:#fff}
.app-frame{border-radius:16px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.15);border:1px solid #e2e8f0;max-width:900px;margin:0 auto}
.app-frame-bar{background:#f1f5f9;padding:10px 16px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #e2e8f0}
.app-frame-bar span{width:12px;height:12px;border-radius:50%}
.app-frame-url{margin-left:10px;background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:3px 12px;font-size:11px;color:#64748b;flex:1;max-width:260px}
.app-body{display:flex;height:420px}
/* Sidebar */
.mk-sidebar{width:185px;background:#1e3a6b;display:flex;flex-direction:column;padding:0;flex-shrink:0;overflow:hidden}
.mk-sidebar-logo{display:flex;align-items:center;gap:8px;padding:14px 12px;border-bottom:1px solid rgba(255,255,255,.1)}
.mk-sidebar-logo-text{color:#fff;font-size:13px;font-weight:800}
.mk-nav-item{display:flex;align-items:center;gap:8px;padding:7px 12px;color:rgba(255,255,255,.65);font-size:11px;font-weight:500;cursor:pointer;transition:background .2s}
.mk-nav-item:hover{background:rgba(255,255,255,.08)}
.mk-nav-item.active{background:rgba(255,255,255,.15);color:#fff;font-weight:700}
.mk-nav-icon{font-size:13px;width:16px;text-align:center}
/* Main area */
.mk-main{flex:1;background:#f5f7fb;display:flex;flex-direction:column;overflow:hidden}
.mk-topbar{background:#fff;padding:10px 18px;border-bottom:1px solid #e5e9f0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.mk-page-title{font-size:14px;font-weight:700;color:#1e3a6b}
.mk-user{text-align:right}
.mk-user-name{font-size:10px;font-weight:600;color:#1e3a6b}
.mk-user-role{font-size:9px;color:#64748b}
.mk-content{flex:1;padding:14px;overflow:hidden;display:flex;flex-direction:column;gap:10px}
/* Tabs */
.mk-tabs{display:flex;gap:0;border-bottom:1px solid #e5e9f0;margin-bottom:12px;overflow-x:auto}
.mk-tab{padding:7px 14px;font-size:10px;font-weight:600;color:#64748b;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:4px}
.mk-tab.active{color:#1565c0;border-bottom-color:#1565c0}
.mk-badge{background:#ef4444;color:#fff;border-radius:50px;font-size:9px;padding:1px 5px;font-weight:700}
/* Caisse module grid */
.mk-mod-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:10px}
.mk-mod{background:#fff;border-radius:9px;padding:9px 6px;text-align:center;border:1.5px solid #e5e9f0;cursor:pointer;transition:all .2s}
.mk-mod.sel{border-color:#1565c0;background:#eff6ff}
.mk-mod-ico{font-size:18px;margin-bottom:3px}
.mk-mod-lbl{font-size:9px;font-weight:700;color:#1e3a6b}
.mk-mod-sub{font-size:8px;color:#94a3b8;margin-top:2px}
.mk-mod-badge{display:inline-block;background:#f97316;color:#fff;border-radius:50px;font-size:8px;padding:1px 5px;margin-top:2px;font-weight:700}
/* Ticket panel */
.mk-ticket-panel{background:#fff;border-radius:9px;padding:10px;border:1px solid #e5e9f0}
.mk-panel-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.mk-panel-title{font-size:10px;font-weight:700;color:#1e3a6b}
.mk-panel-badge{background:#f97316;color:#fff;border-radius:50px;font-size:9px;padding:1px 7px;font-weight:700}
.mk-ticket-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px;background:#f8faff;border-radius:7px}
.mk-t-ref{font-size:10px;font-weight:700;color:#1e3a6b}
.mk-t-sub{font-size:8px;color:#64748b;margin-top:2px}
.mk-t-time{font-size:9px;color:#64748b;white-space:nowrap}
.mk-t-total{font-size:11px;font-weight:800;color:#16a34a;white-space:nowrap}
.mk-btn-pay{background:#1565c0;color:#fff;border:none;padding:5px 10px;border-radius:20px;font-size:9px;font-weight:700;cursor:pointer;white-space:nowrap}
/* Restaurant stats */
.mk-stats4{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:10px}
.mk-stat4{background:#fff;border-radius:7px;padding:8px;border:1px solid #e5e9f0;text-align:center}
.mk-stat4-n{font-size:14px;font-weight:800;color:#1e3a6b}
.mk-stat4-n.orange{color:#f97316}
.mk-stat4-n.purple{color:#7b1fa2}
.mk-stat4-l{font-size:8px;color:#94a3b8;margin-top:1px}
/* Order card */
.mk-order-card{background:#fff;border:2px solid #ef4444;border-radius:10px;padding:10px}
.mk-order-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px}
.mk-order-tbl{font-size:12px;font-weight:800;color:#1e3a6b}
.mk-order-hr{font-size:9px;color:#94a3b8}
.mk-order-items{font-size:10px;color:#374151;margin-bottom:8px;padding:5px;background:#f8faff;border-radius:5px}
.mk-btn-recv{background:#ef4444;color:#fff;border:none;padding:7px;border-radius:7px;font-size:10px;font-weight:700;width:100%;cursor:pointer}
/* Pressing */
.mk-info-banner{background:#eff6ff;border:1px solid #bfdbfe;border-radius:7px;padding:7px 10px;font-size:9px;color:#1565c0;display:flex;align-items:center;gap:5px}
.mk-actions{display:flex;gap:6px;margin-top:8px;margin-bottom:8px}
.mk-action-btn{padding:6px 10px;border-radius:7px;font-size:9px;font-weight:600;cursor:pointer;border:1.5px solid;white-space:nowrap}
.mk-action-btn.brown{background:#4a3728;color:#fff;border-color:#4a3728}
.mk-action-btn.orange-btn{background:#fff;color:#f57c00;border-color:#f57c00}
.mk-action-btn.blue-btn{background:#fff;color:#1565c0;border-color:#1565c0}
.mk-tbl-hdr{display:grid;grid-template-columns:0.4fr 1fr 1fr 1fr 1fr 1fr 1fr;gap:4px;padding:5px 7px;background:#4a3728;border-radius:6px;margin-bottom:5px}
.mk-th{font-size:8px;font-weight:700;color:#fff}
.mk-empty{text-align:center;padding:18px;color:#94a3b8;font-size:10px}
/* FEATURES */
.features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:22px}
.feature-card{padding:26px;border-radius:16px;background:#f1f5f9;border:1px solid rgba(0,0,0,.05);transition:transform .3s;position:relative}
.feature-card:hover{transform:translateY(-4px)}
.feature-card.custom-card{background:linear-gradient(135deg,#eff6ff,#f0fdf4);border-color:rgba(21,101,192,.15)}
.feature-icon{font-size:34px;margin-bottom:14px}
.feature-card h3{font-size:1rem;font-weight:700;margin-bottom:7px}
.feature-card p{color:#64748b;font-size:13.5px;line-height:1.6}
.custom-badge{position:absolute;top:14px;right:14px;background:#1565c0;color:#fff;font-size:9px;font-weight:700;padding:2px 8px;border-radius:50px}
/* PAYMENTS — NEW LAYOUT */
.payment-bg{background:#0a1628}
.payment-bg .lp-h2{color:#fff}
.payment-bg .subtitle{color:rgba(255,255,255,.6)}
.payment-bg .section-tag{background:rgba(255,255,255,.1);color:#93c5fd}
.payment-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:14px}
.payment-card{border-radius:14px;padding:14px 10px;text-align:center;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);backdrop-filter:blur(10px);transition:transform .3s,background .3s}
.payment-card:hover{transform:translateY(-4px);background:rgba(255,255,255,.1)}
.pay-logo{width:100%;height:52px;border-radius:8px;overflow:hidden;margin-bottom:8px}
.pay-name{font-weight:700;font-size:12px;color:#fff}
.pay-sub{display:none}
/* WORKFLOW */
.workflow-bg{background:#f1f5f9}
.workflow-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:28px}
.step{text-align:center;padding:28px 18px}
.step-num{width:52px;height:52px;border-radius:50%;background:#1565c0;color:#fff;font-size:20px;font-weight:800;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;box-shadow:0 8px 24px rgba(21,101,192,.35)}
.step h3{font-size:1rem;font-weight:700;margin-bottom:8px}
.step p{color:#64748b;font-size:13.5px;line-height:1.6}
/* TESTIMONIALS */
.testi-bg{background:linear-gradient(135deg,#f8faff 0%,#eff6ff 100%)}
.testimonials-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:22px}
.testimonial-card{background:#fff;border-radius:16px;padding:28px;box-shadow:0 4px 24px rgba(0,0,0,.07);border:1px solid rgba(21,101,192,.08)}
.stars{color:#f59e0b;font-size:17px;margin-bottom:14px}
.testi-text{color:#64748b;font-size:14.5px;line-height:1.7;margin-bottom:18px;font-style:italic}
.author{display:flex;align-items:center;gap:12px}
.author-avatar{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:15px}
.author-name{font-weight:700;font-size:13px}
.author-role{color:#64748b;font-size:11px}
/* CTA */
.cta-bg{background:linear-gradient(135deg,#1565c0 0%,#00897b 100%);text-align:center;padding:90px 6%}
.cta-bg .lp-h2{color:#fff;font-size:clamp(1.8rem,4vw,3rem);margin-bottom:18px}
.cta-bg .cta-sub{color:rgba(255,255,255,.8);font-size:1.05rem;margin-bottom:36px;max-width:520px;margin-left:auto;margin-right:auto}
.btn-white{background:#fff;color:#1565c0;padding:16px 40px;border-radius:50px;font-size:16px;font-weight:800;text-decoration:none;display:inline-block;box-shadow:0 12px 40px rgba(0,0,0,.2);transition:transform .2s;cursor:pointer;border:none}
.btn-white:hover{transform:translateY(-3px)}
.cta-note{color:rgba(255,255,255,.55);font-size:12px;margin-top:16px}
/* FOOTER */
footer.lp-footer{background:#0a1628;color:rgba(255,255,255,.5);padding:56px 6% 36px;text-align:center}
.footer-logo{font-size:22px;font-weight:900;color:#fff;margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:10px}
.footer-logo em{color:#60a5fa;font-style:normal}
.footer-desc{font-size:13.5px;line-height:1.7;max-width:420px;margin:0 auto 28px}
.footer-links{display:flex;gap:22px;justify-content:center;flex-wrap:wrap;margin-bottom:28px}
.footer-links a{color:rgba(255,255,255,.5);text-decoration:none;font-size:13px;transition:color .2s}
.footer-links a:hover{color:#fff}
.footer-hr{border:none;border-top:1px solid rgba(255,255,255,.1);margin-bottom:20px}
.copy{font-size:12px}
/* MODAL */
.modal-overlay{position:fixed;inset:0;background:rgba(10,22,40,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px);animation:fadeDown .25s ease}
.modal-box{background:#fff;border-radius:20px;padding:36px;max-width:540px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 30px 80px rgba(0,0,0,.3);position:relative;animation:fadeUp .3s ease}
.modal-close{position:absolute;top:16px;right:16px;background:#f1f5f9;border:none;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#64748b;transition:background .2s}
.modal-close:hover{background:#e2e8f0}
.modal-title{font-size:1.4rem;font-weight:800;color:#0a1628;margin-bottom:8px}
.modal-sub{font-size:13.5px;color:#64748b;margin-bottom:24px;line-height:1.6}
.form-group{margin-bottom:16px}
.form-label{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px}
.form-input{width:100%;padding:11px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;color:#0a1628;font-family:'Inter',sans-serif;transition:border-color .2s;outline:none}
.form-input:focus{border-color:#1565c0}
.form-textarea{min-height:80px;resize:vertical}
.form-modules{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.module-check{display:flex;align-items:center;gap:6px;cursor:pointer}
.module-check input{accent-color:#1565c0;cursor:pointer}
.module-check span{font-size:12px;color:#374151;font-weight:500}
.form-submit{width:100%;padding:14px;background:linear-gradient(135deg,#1565c0,#00897b);color:#fff;border:none;border-radius:50px;font-size:15px;font-weight:700;cursor:pointer;margin-top:8px;transition:transform .2s,box-shadow .2s;font-family:'Inter',sans-serif}
.form-submit:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 24px rgba(21,101,192,.4)}
.form-submit:disabled{opacity:.6;cursor:not-allowed}
.form-success{text-align:center;padding:24px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;color:#166534;font-weight:600;font-size:15px;margin-top:8px}
.form-error{text-align:center;padding:12px;background:#fef2f2;border-radius:10px;border:1px solid #fecaca;color:#991b1b;font-size:13px;margin-top:8px}
/* ANIMATIONS */
@keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:.7}}
.reveal{opacity:0;transform:translateY(36px);transition:opacity .7s,transform .7s}
.reveal.visible{opacity:1;transform:translateY(0)}
/* FLOATING BUTTONS */
.floating-btns{position:fixed;bottom:24px;right:24px;z-index:9000;display:flex;flex-direction:column;gap:12px;align-items:flex-end}
.float-btn{width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.25);transition:transform .2s,box-shadow .2s;text-decoration:none}
.float-btn:hover{transform:scale(1.12);box-shadow:0 8px 28px rgba(0,0,0,.35)}
.float-wa{background:#25D366}
.float-tg{background:#2AABEE}
/* RESPONSIVE */
@media(max-width:900px){.mk-sidebar{width:130px}.mk-nav-item{font-size:10px;padding:6px 8px}.mk-stats4{grid-template-columns:repeat(2,1fr)}.mk-mod-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:768px){.nav-links{display:none}.screen-modules{grid-template-columns:repeat(2,1fr)}.hero-btns{flex-direction:column;align-items:center}.app-body{height:auto}.mk-sidebar{display:none}}
`;

/* ─── Main Component ─────────────────────────────────── */
export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('fr');
  const [langOpen, setLangOpen] = useState(false);
  const [showTrial, setShowTrial] = useState(false);
  const [activeScreen, setActiveScreen] = useState(0);
  const [form, setForm] = useState({ full_name:'', phone:'', email:'', business_name:'', city:'', modules:[] as string[], message:'' });
  const [formStatus, setFormStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
  const langRef = useRef<HTMLDivElement>(null);
  const t = T[lang];

  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'lp-styles';
    style.textContent = CSS;
    document.head.appendChild(style);

    const onScroll = () => {
      document.getElementById('lp-nav')?.classList.toggle('scrolled', window.scrollY > 30);
    };
    window.addEventListener('scroll', onScroll);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), i * 80);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    const onClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);

    return () => {
      document.getElementById('lp-styles')?.remove();
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  // Re-observe .reveal elements when language changes (stable keys prevent remounts,
  // but this is a safety net for any element that may have lost its visible class)
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), i * 80);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [lang]);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const toggleModule = (mod: string) => {
    setForm(prev => ({
      ...prev,
      modules: prev.modules.includes(mod) ? prev.modules.filter(m => m !== mod) : [...prev.modules, mod]
    }));
  };

  const BACKEND = import.meta.env.VITE_BACKEND_URL || 'https://ouangolo-backend.onrender.com';

  // Tracking visiteur au chargement de la page
  useEffect(() => {
    try {
      fetch(`${BACKEND}/api/landing/visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referrer: document.referrer || null,
          lang,
          source: window.location.hostname,
        }),
      }).catch(() => {});
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeModal = () => {
    setShowTrial(false);
    setFormStatus('idle');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('loading');
    try {
      const res = await fetch(`${BACKEND}/api/landing/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setFormStatus('success');
        setForm({ full_name:'', phone:'', email:'', business_name:'', city:'', modules:[], message:'' });
        // Fermer le modal automatiquement après 3 secondes
        setTimeout(() => closeModal(), 3000);
      } else {
        setFormStatus('error');
      }
    } catch {
      setFormStatus('error');
    }
  };

  const WA_LINK = 'https://wa.me/2250506332240';
  const TG_LINK = 'https://t.me/+2250506332240';
  const APP_URL = 'https://ollentra.onrender.com';
  const paySvgs = [
    <EspecesSVG key="esp" label={t.paymentItems[0].name}/>,
    <OrangeSVG key="ora"/>,
    <MoovSVG key="moo"/>,
    <MTNSVG key="mtn"/>,
    <WaveSVG key="wav"/>,
    <CarteSVG key="car" label={t.paymentItems[5].name}/>,
  ];
  const screens = [<CaisseScreen key="c"/>, <RestaurantScreen key="r"/>, <PressingScreen key="p"/>];
  const sidebarItems = t.sidebarItems.map((item, idx) => ({
    ...item,
    a: (idx === 9 && activeScreen === 0) || (idx === 1 && activeScreen === 1) || (idx === 5 && activeScreen === 2),
  }));

  return (
    <div className="lp-root">

      {/* ── NAVBAR ── */}
      <nav className="lp-nav" id="lp-nav">
        <a href="#" className="nav-logo">
          <OllentraLogo size={36} />
          <span className="nav-logo-text">Ollen<em>tra</em></span>
        </a>
        <ul className="nav-links">
          <li><a href="#lp-modules" onClick={e=>{e.preventDefault();scrollTo('lp-modules')}}>{t.navModules}</a></li>
          <li><a href="#lp-features" onClick={e=>{e.preventDefault();scrollTo('lp-features')}}>{t.navFeatures}</a></li>
          <li><a href="#lp-payments" onClick={e=>{e.preventDefault();scrollTo('lp-payments')}}>{t.navPay}</a></li>
          <li><a href="#lp-testi" onClick={e=>{e.preventDefault();scrollTo('lp-testi')}}>{t.navTesti}</a></li>
        </ul>
        <div className="nav-actions">
          {/* Language */}
          <div className="lang-selector" ref={langRef}>
            <button className="lang-btn" onClick={()=>setLangOpen(o=>!o)}>
              {lang==='fr'?'Français':'English'} <span>▾</span>
            </button>
            {langOpen && (
              <div className="lang-dropdown">
                <div className={`lang-option${lang==='fr'?' active':''}`} onClick={()=>{setLang('fr');setLangOpen(false)}}>Français</div>
                <div className={`lang-option${lang==='en'?' active':''}`} onClick={()=>{setLang('en');setLangOpen(false)}}>English</div>
              </div>
            )}
          </div>
          <a href={APP_URL} target="_blank" rel="noopener noreferrer" className="nav-connexion">{t.connexion}</a>
          <button className="nav-trial" onClick={()=>setShowTrial(true)}>{t.trialBtn}</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-badge"><span className="badge-dot"></span>{t.badge}</div>
        <h1>{t.h1[0]}<span className="accent">{t.h1[1]}</span>{t.h1[2]}<span className="accent2">{t.h1[3]}</span></h1>
        <p className="hero-sub">{t.heroSub}</p>
        <div className="hero-btns">
          <button className="btn-primary" onClick={()=>setShowTrial(true)}>{t.btnTrial}</button>
          <a href="#lp-modules" className="btn-secondary" onClick={e=>{e.preventDefault();scrollTo('lp-modules')}}>{t.btnDiscover}</a>
        </div>
        <div className="hero-visual">
          <div className="hero-screen">
            <div className="screen-bar"><span className="dot-r"/><span className="dot-y"/><span className="dot-g"/></div>
            <div className="screen-modules">
              {t.heroModules.map((m,idx)=>(
                <div className="screen-mod" key={idx}>
                  <div className="sm-icon">{m.i}</div>
                  <div className="sm-name">{m.n}</div>
                  <div className="sm-val">{m.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div className="stats-bar">
        <div className="stats-grid">
          {[{n:t.statModules,l:t.statModulesL},{n:t.statPay,l:t.statPayL},{n:t.statAfrica,u:'',l:t.statAfricaL},{n:t.statRapport,l:t.statRapportL}].map((s,idx)=>(
            <div className="stat-item reveal" key={idx}>
              <div className="num">{s.n}</div>
              <p>{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── MODULES ── */}
      <section className="lp-section modules-bg" id="lp-modules">
        <div className="text-center">
          <span className="section-tag">{t.modulesTag}</span>
          <h2 className="lp-h2">{t.modulesH2[0]}<br/>{t.modulesH2[1]}</h2>
          <p className="subtitle mx-auto">{t.modulesSub}</p>
        </div>
        <div className="modules-grid">
          {t.modules.map((m,idx)=>(
            <div className="module-card reveal" key={idx} style={{'--cc':m.color} as React.CSSProperties}>
              <div className="module-icon" style={{background:m.color+'20'}}>{m.icon}</div>
              <h3>{m.title}</h3>
              <p>{m.desc}</p>
              <div className="module-tags">
                {m.tags.map(tag=><span className="tag" key={tag} style={{background:m.color+'18',color:m.color}}>{tag}</span>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SCREENSHOTS ── */}
      <section className="lp-section screenshots-bg" id="lp-screenshots">
        <div className="text-center">
          <span className="section-tag">{t.screenshotsTag}</span>
          <h2 className="lp-h2">{t.screenshotsH2[0]}<br/><span style={{color:'#1565c0'}}>{t.screenshotsH2[1]}</span></h2>
          <p className="subtitle mx-auto">{t.screenshotsSub}</p>
        </div>
        <div className="scr-tabs">
          {t.scrTab.map((tab,i)=>(
            <button key={i} className={`scr-tab${activeScreen===i?' active':''}`} onClick={()=>setActiveScreen(i)}>{tab}</button>
          ))}
        </div>
        <div className="app-frame reveal">
            <div className="app-body">
            {/* Sidebar */}
            <div className="mk-sidebar">
              <div className="mk-sidebar-logo">
                <OllentraLogo size={22}/>
                <span className="mk-sidebar-logo-text">OLLENTRA</span>
              </div>
              {sidebarItems.map((item,idx)=>(
                <div key={idx} className={`mk-nav-item${item.a?' active':''}`}>
                  <span className="mk-nav-icon">{item.i}</span>{item.l}
                </div>
              ))}
            </div>
            {/* Main */}
            <div className="mk-main">
              <div className="mk-topbar">
                <div className="mk-page-title">{t.screenTitles[activeScreen]}</div>
                <div className="mk-user">
                  <div className="mk-user-name">Pale Ahmed · Administrateur Général</div>
                  <div className="mk-user-role">admin</div>
                </div>
              </div>
              {screens[activeScreen]}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="lp-section" id="lp-features">
        <div className="text-center">
          <span className="section-tag">{t.featuresTag}</span>
          <h2 className="lp-h2">{t.featuresH2[0]}<br/>{t.featuresH2[1]}</h2>
          <p className="subtitle mx-auto">{t.featuresSub}</p>
        </div>
        <div className="features-grid">
          {t.features.map((f,idx)=>(
            <div className={`feature-card reveal${f.custom?' custom-card':''}`} key={idx}>
              {f.custom && <span className="custom-badge">{t.customBadge}</span>}
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PAYMENTS ── */}
      <section className="lp-section payment-bg" id="lp-payments">
        <div className="text-center">
          <span className="section-tag">{t.payTag}</span>
          <h2 className="lp-h2">{t.payH2[0]}<br/>{t.payH2[1]}</h2>
          <p className="subtitle mx-auto">{t.paySub}</p>
        </div>
        <div className="payment-grid">
          {t.paymentItems.map((p,i)=>(
            <div className="payment-card reveal" key={i}>
              <div className="pay-logo">{paySvgs[i]}</div>
              <div className="pay-name">{p.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WORKFLOW ── */}
      <section className="lp-section workflow-bg">
        <div className="text-center">
          <span className="section-tag">{t.workflowTag}</span>
          <h2 className="lp-h2">{t.workflowH2}</h2>
          <p className="subtitle mx-auto">{t.workflowSub}</p>
        </div>
        <div className="workflow-steps">
          {t.steps.map(s=>(
            <div className="step reveal" key={s.num}>
              <div className="step-num">{s.num}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="lp-section testi-bg" id="lp-testi">
        <div className="text-center">
          <span className="section-tag">{t.testiTag}</span>
          <h2 className="lp-h2">{t.testiH2}</h2>
          <p className="subtitle mx-auto">{t.testiSub}</p>
        </div>
        <div className="testimonials-grid">
          {t.testimonials.map((tt,idx)=>(
            <div className="testimonial-card reveal" key={idx}>
              <div className="stars">{'★'.repeat(tt.stars)}</div>
              <p className="testi-text">{tt.text}</p>
              <div className="author">
                <div className="author-avatar" style={{background:tt.color}}>{tt.initials}</div>
                <div><div className="author-name">{tt.name}</div><div className="author-role">{tt.role}</div></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-bg" id="lp-contact">
        <h2 className="lp-h2">{t.ctaH2[0]}<br/>{t.ctaH2[1]}</h2>
        <p className="cta-sub">{t.ctaSub}</p>
        <button className="btn-white" onClick={()=>setShowTrial(true)}>{t.ctaBtn}</button>
        <p className="cta-note">{t.ctaNote}</p>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="footer-logo"><OllentraLogo size={28}/><span>Ollentra</span></div>
        <p className="footer-desc">{t.footerDesc}</p>
        <div className="footer-links">
          {[t.navModules,t.navFeatures,t.navPay,t.navTesti].map(l=><a key={l} href="#">{l}</a>)}
        </div>
        <hr className="footer-hr"/>
        <div className="copy">{t.copy}</div>
      </footer>

      {/* ── TRIAL MODAL ── */}
      {/* ── BOUTONS FLOTTANTS WhatsApp + Telegram ── */}
      <div className="floating-btns">
        <a className="float-btn float-tg" href={TG_LINK} target="_blank" rel="noopener noreferrer" title="Telegram">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="white"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.67 4.297 12.8c-.658-.204-.671-.658.136-.975l11.57-4.461c.548-.196 1.027.131.891.857z"/></svg>
        </a>
        <a className="float-btn float-wa" href={WA_LINK} target="_blank" rel="noopener noreferrer" title="WhatsApp">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
        </a>
      </div>

      {showTrial && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)closeModal()}}>
          <div className="modal-box">
            <button className="modal-close" onClick={closeModal}>✕</button>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
              <OllentraLogo size={32}/>
              <div>
                <div className="modal-title">{t.modalTitle}</div>
              </div>
            </div>
            <p className="modal-sub">{t.modalSub}</p>

            {formStatus==='success' ? (
              <div className="form-success">{t.fSuccess}</div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div className="form-group">
                    <label className="form-label">{t.fName}</label>
                    <input className="form-input" type="text" required value={form.full_name} onChange={e=>setForm(p=>({...p,full_name:e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t.fPhone}</label>
                    <input className="form-input" type="tel" required value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div className="form-group">
                    <label className="form-label">{t.fEmail}</label>
                    <input className="form-input" type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t.fCity}</label>
                    <input className="form-input" type="text" value={form.city} onChange={e=>setForm(p=>({...p,city:e.target.value}))}/>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.fBusiness}</label>
                  <input className="form-input" type="text" required value={form.business_name} onChange={e=>setForm(p=>({...p,business_name:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.fModules}</label>
                  <div className="form-modules">
                    {t.moduleChoices.map(mod=>(
                      <label className="module-check" key={mod}>
                        <input type="checkbox" checked={form.modules.includes(mod)} onChange={()=>toggleModule(mod)}/>
                        <span>{mod}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.fMessage}</label>
                  <textarea className="form-input form-textarea" value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))}/>
                </div>
                {formStatus==='error' && <div className="form-error">{t.fError}</div>}
                <button className="form-submit" type="submit" disabled={formStatus==='loading'}>
                  {formStatus==='loading' ? t.fLoading : t.fSubmit}
                </button>
                <p style={{textAlign:'center',fontSize:12,color:'#94a3b8',marginTop:10}}>
                  {t.alreadyClient} <a href={APP_URL} target="_blank" rel="noopener noreferrer" style={{color:'#1565c0',fontWeight:600}}>{t.connexion} →</a>
                </p>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
