import { useEffect } from 'react';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--blue:#1565c0;--blue2:#1976d2;--teal:#00897b;--orange:#f57c00;--green:#2e7d32;--dark:#0a1628;--dark2:#132340;--gray:#64748b;--light:#f1f5f9;--white:#ffffff;--radius:16px;--shadow:0 20px 60px rgba(0,0,0,.12)}
.lp-root{font-family:'Inter',sans-serif;background:#fff;color:#0a1628;overflow-x:hidden;scroll-behavior:smooth}
nav{position:fixed;top:0;left:0;right:0;z-index:999;display:flex;align-items:center;justify-content:space-between;padding:18px 6%;backdrop-filter:blur(20px);background:rgba(255,255,255,.88);border-bottom:1px solid rgba(21,101,192,.1);transition:box-shadow .3s}
nav.scrolled{box-shadow:0 4px 30px rgba(0,0,0,.08)}
.nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
.logo-icon{width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#1565c0,#00897b);display:flex;align-items:center;justify-content:center;font-size:20px}
.logo-text{font-size:22px;font-weight:800;color:#0a1628;letter-spacing:-.5px}
.logo-text em{color:#1565c0;font-style:normal}
.nav-links{display:flex;gap:32px;list-style:none}
.nav-links a{text-decoration:none;color:#64748b;font-size:15px;font-weight:500;transition:color .2s}
.nav-links a:hover{color:#1565c0}
.nav-cta{background:#1565c0;color:#fff;border:none;padding:10px 22px;border-radius:50px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;transition:transform .2s,box-shadow .2s}
.nav-cta:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(21,101,192,.35)}
.hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:120px 6% 80px;background:linear-gradient(160deg,#0a1628 0%,#132340 40%,#0d2f5e 70%,#003d6b 100%);position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(21,101,192,.4) 0%,transparent 70%)}
.hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);padding:8px 18px;border-radius:50px;color:#93c5fd;font-size:13px;font-weight:600;margin-bottom:28px;backdrop-filter:blur(10px);position:relative;z-index:1;animation:fadeDown .8s ease both}
.badge-dot{width:7px;height:7px;background:#4ade80;border-radius:50%;animation:pulse 2s infinite}
.hero h1{font-size:clamp(2.4rem,6vw,4.2rem);font-weight:900;color:#fff;line-height:1.1;max-width:820px;margin-bottom:24px;position:relative;z-index:1;animation:fadeUp .8s .1s ease both}
.accent{color:#60a5fa}.accent2{color:#34d399}
.hero p.hero-sub{font-size:clamp(1rem,2vw,1.2rem);color:rgba(255,255,255,.72);max-width:600px;line-height:1.7;margin-bottom:40px;position:relative;z-index:1;animation:fadeUp .8s .2s ease both}
.hero-btns{display:flex;gap:16px;flex-wrap:wrap;justify-content:center;position:relative;z-index:1;animation:fadeUp .8s .3s ease both}
.btn-primary{background:linear-gradient(135deg,#1976d2,#00897b);color:#fff;padding:16px 36px;border-radius:50px;font-size:16px;font-weight:700;text-decoration:none;border:none;cursor:pointer;box-shadow:0 8px 32px rgba(21,101,192,.45);transition:transform .2s,box-shadow .2s;display:inline-block}
.btn-primary:hover{transform:translateY(-3px);box-shadow:0 12px 40px rgba(21,101,192,.55)}
.btn-secondary{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.3);padding:16px 36px;border-radius:50px;font-size:16px;font-weight:600;text-decoration:none;backdrop-filter:blur(10px);transition:background .2s;display:inline-block}
.btn-secondary:hover{background:rgba(255,255,255,.2)}
.hero-visual{position:relative;z-index:1;margin-top:60px;width:100%;max-width:900px;animation:fadeUp .8s .4s ease both}
.hero-screen{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);border-radius:20px;padding:24px;backdrop-filter:blur(20px)}
.screen-bar{display:flex;gap:6px;margin-bottom:16px}
.screen-bar span{width:12px;height:12px;border-radius:50%}
.dot-r{background:#ff5f57}.dot-y{background:#febc2e}.dot-g{background:#28c840}
.screen-modules{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.screen-mod{background:rgba(255,255,255,.08);border-radius:12px;padding:16px 12px;text-align:center;border:1px solid rgba(255,255,255,.1);transition:transform .3s,background .3s}
.screen-mod:hover{transform:translateY(-4px);background:rgba(255,255,255,.14)}
.sm-icon{font-size:28px;margin-bottom:8px}
.sm-name{color:rgba(255,255,255,.9);font-size:13px;font-weight:600}
.sm-val{color:rgba(255,255,255,.5);font-size:11px;margin-top:4px}
.stats-bar{background:#1565c0;padding:60px 6%}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:32px;max-width:1000px;margin:0 auto;text-align:center}
.stat-item .num{font-size:3rem;font-weight:900;color:#fff}
.stat-item .unit{font-size:1.6rem;color:#93c5fd}
.stat-item p{color:rgba(255,255,255,.7);font-size:14px;margin-top:6px}
section.lp-section{padding:100px 6%}
.section-tag{display:inline-block;background:rgba(21,101,192,.1);color:#1565c0;padding:6px 16px;border-radius:50px;font-size:13px;font-weight:700;margin-bottom:16px;letter-spacing:.5px}
.lp-h2{font-size:clamp(1.8rem,4vw,2.8rem);font-weight:800;color:#0a1628;line-height:1.2;margin-bottom:16px}
.subtitle{font-size:1.05rem;color:#64748b;max-width:600px;line-height:1.7;margin-bottom:56px}
.text-center{text-align:center}.mx-auto{margin-left:auto;margin-right:auto}
.modules-bg{background:#f1f5f9}
.modules-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}
.module-card{background:#fff;border-radius:16px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,.06);border:1px solid rgba(0,0,0,.06);transition:transform .3s,box-shadow .3s;position:relative;overflow:hidden}
.module-card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:var(--cc)}
.module-card:hover{transform:translateY(-6px);box-shadow:0 20px 60px rgba(0,0,0,.12)}
.module-icon{width:56px;height:56px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:20px}
.module-card h3{font-size:1.2rem;font-weight:700;margin-bottom:10px;color:#0a1628}
.module-card p{color:#64748b;font-size:14px;line-height:1.6;margin-bottom:20px}
.module-tags{display:flex;flex-wrap:wrap;gap:8px}
.tag{font-size:11px;font-weight:600;padding:4px 10px;border-radius:50px}
.features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}
.feature-card{padding:28px;border-radius:16px;background:#f1f5f9;border:1px solid rgba(0,0,0,.05);transition:transform .3s}
.feature-card:hover{transform:translateY(-4px)}
.feature-icon{font-size:36px;margin-bottom:16px}
.feature-card h3{font-size:1.05rem;font-weight:700;margin-bottom:8px}
.feature-card p{color:#64748b;font-size:14px;line-height:1.6}
.payment-bg{background:#0a1628}
.payment-bg .lp-h2{color:#fff}
.payment-bg .subtitle{color:rgba(255,255,255,.6)}
.payment-bg .section-tag{background:rgba(255,255,255,.1);color:#93c5fd}
.payment-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px}
.payment-card{border-radius:16px;padding:28px 20px;text-align:center;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);backdrop-filter:blur(10px);transition:transform .3s,background .3s}
.payment-card:hover{transform:translateY(-4px);background:rgba(255,255,255,.1)}
.pay-icon{font-size:42px;margin-bottom:12px}
.pay-name{font-weight:700;font-size:15px;color:#fff}
.pay-sub{color:rgba(255,255,255,.5);font-size:12px;margin-top:4px}
.workflow-bg{background:#f1f5f9}
.workflow-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:32px}
.step{text-align:center;padding:32px 20px}
.step-num{width:56px;height:56px;border-radius:50%;background:#1565c0;color:#fff;font-size:22px;font-weight:800;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;box-shadow:0 8px 24px rgba(21,101,192,.35)}
.step h3{font-size:1.05rem;font-weight:700;margin-bottom:10px}
.step p{color:#64748b;font-size:14px;line-height:1.6}
.testi-bg{background:linear-gradient(135deg,#f8faff 0%,#eff6ff 100%)}
.testimonials-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}
.testimonial-card{background:#fff;border-radius:16px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,.07);border:1px solid rgba(21,101,192,.08)}
.stars{color:#f59e0b;font-size:18px;margin-bottom:16px}
.testimonial-card p.testi-text{color:#64748b;font-size:15px;line-height:1.7;margin-bottom:20px;font-style:italic}
.author{display:flex;align-items:center;gap:12px}
.author-avatar{width:44px;height:44px;border-radius:50%;background:#1565c0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px}
.author-name{font-weight:700;font-size:14px}
.author-role{color:#64748b;font-size:12px}
.cta-bg{background:linear-gradient(135deg,#1565c0 0%,#00897b 100%);text-align:center;padding:100px 6%}
.cta-bg .lp-h2{color:#fff;font-size:clamp(1.8rem,4vw,3rem);margin-bottom:20px}
.cta-bg p.cta-sub{color:rgba(255,255,255,.8);font-size:1.1rem;margin-bottom:40px;max-width:540px;margin-left:auto;margin-right:auto}
.btn-white{background:#fff;color:#1565c0;padding:18px 44px;border-radius:50px;font-size:17px;font-weight:800;text-decoration:none;display:inline-block;box-shadow:0 12px 40px rgba(0,0,0,.2);transition:transform .2s}
.btn-white:hover{transform:translateY(-3px)}
.cta-note{color:rgba(255,255,255,.6);font-size:13px;margin-top:20px}
footer.lp-footer{background:#0a1628;color:rgba(255,255,255,.5);padding:60px 6% 40px;text-align:center}
.footer-logo{font-size:24px;font-weight:900;color:#fff;margin-bottom:12px}
.footer-logo em{color:#60a5fa;font-style:normal}
.footer-desc{font-size:14px;line-height:1.7;max-width:440px;margin:0 auto 32px}
.footer-links{display:flex;gap:24px;justify-content:center;flex-wrap:wrap;margin-bottom:32px}
.footer-links a{color:rgba(255,255,255,.5);text-decoration:none;font-size:14px;transition:color .2s}
.footer-links a:hover{color:#fff}
.footer-hr{border:none;border-top:1px solid rgba(255,255,255,.1);margin-bottom:24px}
.copy{font-size:13px}
@keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:.7}}
.reveal{opacity:0;transform:translateY(40px);transition:opacity .7s,transform .7s}
.reveal.visible{opacity:1;transform:translateY(0)}
@media(max-width:768px){.nav-links{display:none}.screen-modules{grid-template-columns:repeat(2,1fr)}.hero-btns{flex-direction:column;align-items:center}}
`;

const modules = [
  { icon:'🏊', title:'Piscine', color:'#1976d2', desc:'Vendez des tickets d\'entrée, gérez les abonnements mensuels/annuels, suivez les entrées journalières et les revenus en temps réel.', tags:['Tickets journaliers','Abonnements','Statistiques'] },
  { icon:'🍽️', title:'Restaurant', color:'#e53935', desc:'Prenez les commandes par table, gérez la carte et les prix, encaissez directement ou via la caisse centrale avec impression de reçus.', tags:['Commandes par table','Caisse intégrée','Reçus'] },
  { icon:'🏨', title:'Hôtel', color:'#7b1fa2', desc:'Gérez vos chambres, les réservations, les check-in/check-out, les acomptes et les extensions de séjour depuis un seul écran.', tags:['Réservations','Check-in/out','Prolongation séjour'] },
  { icon:'🛒', title:'Superette', color:'#f57c00', desc:'Gérez votre stock produit par produit avec alerte de rupture, encaissez directement au panier avec Mobile Money ou espèces.', tags:['Gestion stock','Approvisionnement','Fournisseurs'] },
  { icon:'🍺', title:'Dépôt de boissons', color:'#00897b', desc:'Vendez à vos clients revendeurs, gérez le crédit client avec historique complet, passez et recevez vos commandes fournisseurs.', tags:['Crédit client','Commandes fournisseurs','Mobile Money'] },
  { icon:'🎉', title:'Événements', color:'#c62828', desc:'Planifiez mariages, conférences et fêtes. Créez des devis détaillés, suivez l\'avancement et facturez vos clients en quelques clics.', tags:['Devis automatiques','Planning','Facturation'] },
];

const features = [
  { icon:'📊', title:'Rapports & Statistiques', desc:'Visualisez vos revenus par module, par employé, par mode de paiement. Exportez vos données pour votre comptable en un clic.' },
  { icon:'🏦', title:'Comptabilité intégrée', desc:'Chaque transaction génère automatiquement une écriture comptable. Suivez vos entrées, sorties et bénéfices en temps réel.' },
  { icon:'📱', title:'Mobile Money natif', desc:'Moov Money, Orange Money, Wave, MTN Money et carte bancaire. Chaque paiement lié à sa référence de transaction.' },
  { icon:'🔔', title:'Alertes de stock', desc:'Recevez une alerte automatique quand un produit atteint son stock minimum. Ne soyez plus jamais en rupture.' },
  { icon:'👥', title:'Multi-utilisateurs & rôles', desc:'Créez des comptes pour vos caissiers, serveurs, réceptionnistes. Chaque employé n\'accède qu\'à son module.' },
  { icon:'🔐', title:'Sécurisé & fiable', desc:'Vos données sont sauvegardées en temps réel dans le cloud. Aucun risque de perte, accessible depuis n\'importe quel appareil.' },
  { icon:'🧾', title:'Caisse centralisée', desc:'Une seule caisse pour encaisser tous les tickets en attente (restaurant, dépôt, piscine). Zéro confusion, traçabilité totale.' },
  { icon:'📦', title:'Commandes fournisseurs', desc:'Créez vos bons de commande, enregistrez les réceptions partielles, suivez les paiements avec numérotation automatique.' },
  { icon:'💬', title:'Interface en français', desc:'Entièrement en français, conçu pour les opérateurs francophones d\'Afrique de l\'Ouest et Centrale.' },
];

const payments = [
  { icon:'💵', name:'Espèces', sub:'Paiement direct', border:'rgba(76,175,80,.3)' },
  { icon:'🟢', name:'Moov Money', sub:'Avec référence transaction', border:'rgba(76,175,80,.4)' },
  { icon:'🟠', name:'Orange Money', sub:'Avec référence transaction', border:'rgba(244,81,30,.4)' },
  { icon:'🔵', name:'Wave', sub:'Avec référence transaction', border:'rgba(21,101,192,.4)' },
  { icon:'🟡', name:'MTN Money', sub:'Avec référence transaction', border:'rgba(255,193,7,.4)' },
  { icon:'💳', name:'Carte bancaire', sub:'7 derniers chiffres tracés', border:'rgba(156,39,176,.4)' },
];

const steps = [
  { num:1, title:'Contactez-nous', desc:'Décrivez votre complexe, vos modules et le nombre d\'utilisateurs. On configure tout pour vous.' },
  { num:2, title:'Configuration sur mesure', desc:'On paramètre vos produits, chambres, menus, tarifs et employés selon vos besoins.' },
  { num:3, title:'Formation de votre équipe', desc:'Une session de formation pour vos équipes. Interface simple, prise en main rapide.' },
  { num:4, title:'Go ! Vous gérez en pro', desc:'Votre complexe tourne sur Ollentra. Vous avez accès aux rapports depuis votre téléphone.' },
];

const testimonials = [
  { stars:5, text:'"Avant Ollentra, je passais des heures à tout noter dans des cahiers. Maintenant, en 30 secondes, j\'ai le chiffre d\'affaires de la journée sur mon téléphone."', initials:'A', name:'Amadou K.', role:'Gérant, Complexe touristique — Côte d\'Ivoire', color:'#1976d2' },
  { stars:5, text:'"Le module dépôt avec le crédit client est une révolution pour nous. On sait exactement qui nous doit quoi, et les encaissements par Moov Money sont tracés automatiquement."', initials:'F', name:'Fatou D.', role:'Responsable dépôt — Burkina Faso', color:'#00897b' },
  { stars:5, text:'"J\'ai 3 activités dans mon complexe. Ollentra m\'a donné une vue globale que je n\'avais jamais eue. Mon comptable est ravi, tout est déjà organisé pour lui."', initials:'M', name:'Michel O.', role:'Directeur, Resort & Loisirs — Congo', color:'#7b1fa2' },
];

export default function LandingPage() {
  useEffect(() => {
    // Inject CSS
    const style = document.createElement('style');
    style.id = 'lp-styles';
    style.textContent = CSS;
    document.head.appendChild(style);

    // Navbar scroll
    const onScroll = () => {
      document.getElementById('lp-nav')?.classList.toggle('scrolled', window.scrollY > 30);
    };
    window.addEventListener('scroll', onScroll);

    // Reveal on scroll
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), i * 80);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    reveals.forEach(el => observer.observe(el));

    return () => {
      document.getElementById('lp-styles')?.remove();
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="lp-root">
      {/* NAVBAR */}
      <nav id="lp-nav">
        <a href="#" className="nav-logo">
          <span className="logo-icon">🌊</span>
          <span className="logo-text">Ollen<em>tra</em></span>
        </a>
        <ul className="nav-links">
          <li><a href="#lp-modules" onClick={e => { e.preventDefault(); scrollTo('lp-modules'); }}>Modules</a></li>
          <li><a href="#lp-features" onClick={e => { e.preventDefault(); scrollTo('lp-features'); }}>Fonctionnalités</a></li>
          <li><a href="#lp-payments" onClick={e => { e.preventDefault(); scrollTo('lp-payments'); }}>Paiements</a></li>
          <li><a href="#lp-testi" onClick={e => { e.preventDefault(); scrollTo('lp-testi'); }}>Avis</a></li>
        </ul>
        <a href="#lp-contact" className="nav-cta" onClick={e => { e.preventDefault(); scrollTo('lp-contact'); }}>Demander une démo</a>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-badge">
          <span className="badge-dot"></span>
          Plateforme de gestion tout-en-un · Adapté à l'Afrique
        </div>
        <h1>Gérez votre <span className="accent">complexe touristique</span><br />comme un <span className="accent2">pro</span></h1>
        <p className="hero-sub">Piscine, restaurant, hôtel, superette, dépôt de boissons et événements — tout centralisé en une seule plateforme intelligente avec Mobile Money intégré.</p>
        <div className="hero-btns">
          <a href="#lp-contact" className="btn-primary" onClick={e => { e.preventDefault(); scrollTo('lp-contact'); }}>🚀 Demander une démo gratuite</a>
          <a href="#lp-modules" className="btn-secondary" onClick={e => { e.preventDefault(); scrollTo('lp-modules'); }}>Découvrir les modules →</a>
        </div>
        <div className="hero-visual">
          <div className="hero-screen">
            <div className="screen-bar">
              <span className="dot-r"></span>
              <span className="dot-y"></span>
              <span className="dot-g"></span>
            </div>
            <div className="screen-modules">
              {[{i:'🏊',n:'Piscine',v:'Tickets & abonnements'},{i:'🍽️',n:'Restaurant',v:'Tables & commandes'},{i:'🏨',n:'Hôtel',v:'Réservations & chambres'},{i:'🛒',n:'Superette',v:'Stock & ventes'},{i:'🍺',n:'Dépôt',v:'Boissons & crédit client'},{i:'🎉',n:'Événements',v:'Devis & planning'}].map(m => (
                <div className="screen-mod" key={m.n}>
                  <div className="sm-icon">{m.i}</div>
                  <div className="sm-name">{m.n}</div>
                  <div className="sm-val">{m.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className="stats-bar">
        <div className="stats-grid">
          {[{num:'6',unit:'+',label:'Modules de gestion intégrés'},{num:'5',unit:'',label:'Modes de paiement Mobile Money'},{num:'100',unit:'%',label:'Adapté au contexte africain'},{num:'24',unit:'h',label:'Rapports & comptabilité en temps réel'}].map(s => (
            <div className="stat-item reveal" key={s.label}>
              <div className="num">{s.num}<span className="unit">{s.unit}</span></div>
              <p>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* MODULES */}
      <section className="lp-section modules-bg" id="lp-modules">
        <div className="text-center">
          <span className="section-tag">📦 NOS MODULES</span>
          <h2 className="lp-h2">Une plateforme pour<br />tout votre complexe</h2>
          <p className="subtitle mx-auto">Chaque département de votre complexe a son propre espace de gestion, interconnecté avec la comptabilité centrale.</p>
        </div>
        <div className="modules-grid">
          {modules.map(m => (
            <div className="module-card reveal" key={m.title} style={{ '--cc': m.color } as React.CSSProperties}>
              <div className="module-icon" style={{ background: m.color + '20' }}>{m.icon}</div>
              <h3>{m.title}</h3>
              <p>{m.desc}</p>
              <div className="module-tags">
                {m.tags.map(t => (
                  <span className="tag" key={t} style={{ background: m.color + '18', color: m.color }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-section" id="lp-features">
        <div className="text-center">
          <span className="section-tag">⚡ FONCTIONNALITÉS</span>
          <h2 className="lp-h2">Tout ce dont vous avez besoin<br />pour gérer efficacement</h2>
          <p className="subtitle mx-auto">Des outils puissants conçus pour les réalités du terrain africain, sans complexité inutile.</p>
        </div>
        <div className="features-grid">
          {features.map(f => (
            <div className="feature-card reveal" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PAIEMENTS */}
      <section className="lp-section payment-bg" id="lp-payments">
        <div className="text-center">
          <span className="section-tag">💳 PAIEMENTS</span>
          <h2 className="lp-h2">Tous les modes de paiement<br />de votre marché</h2>
          <p className="subtitle mx-auto">Ollentra accepte tous les moyens de paiement courants en Afrique de l'Ouest. Chaque transaction est tracée et référencée.</p>
        </div>
        <div className="payment-grid">
          {payments.map(p => (
            <div className="payment-card reveal" key={p.name} style={{ borderColor: p.border }}>
              <div className="pay-icon">{p.icon}</div>
              <div className="pay-name">{p.name}</div>
              <div className="pay-sub">{p.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="lp-section workflow-bg">
        <div className="text-center">
          <span className="section-tag">🚀 DÉMARRAGE</span>
          <h2 className="lp-h2">En ligne en moins de 24h</h2>
          <p className="subtitle mx-auto">Pas de matériel à acheter, pas de logiciel à installer. Ollentra fonctionne sur n'importe quel navigateur.</p>
        </div>
        <div className="workflow-steps">
          {steps.map(s => (
            <div className="step reveal" key={s.num}>
              <div className="step-num">{s.num}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="lp-section testi-bg" id="lp-testi">
        <div className="text-center">
          <span className="section-tag">⭐ TÉMOIGNAGES</span>
          <h2 className="lp-h2">Ils nous font confiance</h2>
          <p className="subtitle mx-auto">Des gestionnaires de complexes comme le vôtre utilisent Ollentra au quotidien.</p>
        </div>
        <div className="testimonials-grid">
          {testimonials.map(t => (
            <div className="testimonial-card reveal" key={t.name}>
              <div className="stars">{'★'.repeat(t.stars)}</div>
              <p className="testi-text">{t.text}</p>
              <div className="author">
                <div className="author-avatar" style={{ background: t.color }}>{t.initials}</div>
                <div>
                  <div className="author-name">{t.name}</div>
                  <div className="author-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-bg" id="lp-contact">
        <h2 className="lp-h2">Prêt à transformer<br />la gestion de votre complexe ?</h2>
        <p className="cta-sub">Rejoignez les gestionnaires qui pilotent leur activité sereinement grâce à Ollentra.</p>
        <a href="mailto:contact@ollentra.com" className="btn-white">📩 Contacter l'équipe Ollentra</a>
        <p className="cta-note">Réponse sous 24h · Démo gratuite · Sans engagement</p>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="footer-logo">Ollen<em>tra</em></div>
        <p className="footer-desc">La plateforme de gestion tout-en-un pour les complexes touristiques et de loisirs en Afrique.</p>
        <div className="footer-links">
          {['Modules','Fonctionnalités','Paiements','Témoignages','Contact'].map(l => (
            <a key={l} href="#">{l}</a>
          ))}
        </div>
        <hr className="footer-hr" />
        <div className="copy">© 2026 Ollentra. Tous droits réservés. Conçu pour l'Afrique 🌍</div>
      </footer>
    </div>
  );
}
