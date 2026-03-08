const TrialRequest = require('../models/TrialRequest');

/**
 * POST /api/landing/contact
 * Enregistre une demande d'essai gratuit depuis la landing page
 */
exports.submitContact = async (req, res) => {
  try {
    const { full_name, phone, email, business_name, city, modules, message } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, message: 'Le nom complet est requis.' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Le numéro de téléphone est requis.' });
    }
    if (!business_name || !business_name.trim()) {
      return res.status(400).json({ success: false, message: 'Le nom du complexe est requis.' });
    }

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
 * GET /api/landing/requests  (admin only — liste toutes les demandes)
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
 * PATCH /api/landing/requests/:id  (admin — changer le statut)
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
