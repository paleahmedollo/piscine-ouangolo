const { Op } = require('sequelize');
const TrialRequest = require('../models/TrialRequest');
const LandingVisitor = require('../models/LandingVisitor');

/* ── Géolocalisation IP via ip-api.com (gratuit, sans clé) ─────────────────── */
async function geolocateIP(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168') || ip.startsWith('10.')) {
    return { country: null, city: null };
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`);
    const data = await res.json();
    if (data.status === 'success') {
      return { country: data.country || null, city: data.city || null };
    }
  } catch (_) { /* silencieux */ }
  return { country: null, city: null };
}

/**
 * POST /api/landing/contact
 */
exports.submitContact = async (req, res) => {
  try {
    const { full_name, phone, email, business_name, city, modules, message } = req.body;

    if (!full_name || !full_name.trim())
      return res.status(400).json({ success: false, message: 'Le nom complet est requis.' });
    if (!phone || !phone.trim())
      return res.status(400).json({ success: false, message: 'Le numéro de téléphone est requis.' });
    if (!business_name || !business_name.trim())
      return res.status(400).json({ success: false, message: 'Le nom du complexe est requis.' });

    const request = await TrialRequest.create({
      full_name: full_name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : null,
      business_name: business_name.trim(),
      city: city ? city.trim() : null,
      modules: Array.isArray(modules) ? JSON.stringify(modules) : null,
      message: message ? message.trim() : null,
      status: 'new',
    });

    console.log(`✅ Nouvelle demande d'essai: ${request.full_name} — ${request.phone} — ${request.business_name}`);

    return res.status(201).json({
      success: true,
      message: 'Votre demande a été enregistrée avec succès. Nous vous contacterons dans les 24h.',
      id: request.id,
    });
  } catch (err) {
    console.error('Landing contact error:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur. Veuillez réessayer.' });
  }
};

/**
 * POST /api/landing/visit  — Enregistre une visite (public, sans auth)
 */
exports.trackVisit = async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['cf-connecting-ip']
      || req.socket?.remoteAddress
      || null;

    const source = req.body.source || req.headers['origin'] || null;

    // Géolocalisation en arrière-plan (non bloquant pour la réponse)
    res.status(201).json({ success: true });

    const { country, city } = await geolocateIP(ip);
    await LandingVisitor.create({
      ip,
      user_agent: req.headers['user-agent'] || null,
      referrer: req.body.referrer || req.headers['referer'] || null,
      lang: req.body.lang || 'fr',
      source,
      country,
      city,
    });
  } catch (err) {
    // Ne pas bloquer si erreur
    if (!res.headersSent) res.status(200).json({ success: true });
  }
};

/**
 * GET /api/landing/requests  (admin)
 */
exports.listRequests = async (req, res) => {
  try {
    const requests = await TrialRequest.findAll({
      order: [['createdAt', 'DESC']],
    });
    return res.json({ success: true, data: requests });
  } catch (err) {
    console.error('Landing list error:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

/**
 * GET /api/landing/visitors  (admin) — uniquement production (pas UAT)
 */
exports.listVisitors = async (req, res) => {
  try {
    const whereClause = {
      [Op.or]: [
        { source: null },
        { source: { [Op.notLike]: '%uat%' } },
      ],
    };
    const visitors = await LandingVisitor.findAll({
      where: whereClause,
      order: [['visited_at', 'DESC']],
      limit: 500,
    });
    const total = await LandingVisitor.count({ where: whereClause });
    return res.json({ success: true, data: visitors, total });
  } catch (err) {
    console.error('Landing visitors error:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

/**
 * PATCH /api/landing/requests/:id  (admin)
 */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const request = await TrialRequest.findByPk(id);
    if (!request) return res.status(404).json({ success: false, message: 'Demande introuvable.' });
    await request.update({ status, notes });
    return res.json({ success: true, data: request });
  } catch (err) {
    console.error('Landing update error:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

/**
 * DELETE /api/landing/requests/:id  (admin)
 */
exports.deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await TrialRequest.findByPk(id);
    if (!request) return res.status(404).json({ success: false, message: 'Demande introuvable.' });
    await request.destroy();
    return res.json({ success: true });
  } catch (err) {
    console.error('Landing delete error:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};
