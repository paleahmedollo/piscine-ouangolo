const { AuditLog } = require('../models');

/**
 * Service de création de logs d'audit
 */
const createAuditLog = async (data) => {
  try {
    await AuditLog.create({
      user_id: data.userId || null,
      action: data.action,
      module: data.module,
      entity_type: data.entityType || null,
      entity_id: data.entityId || null,
      details_json: data.details || null,
      ip_address: data.ipAddress || null,
      user_agent: data.userAgent || null
    });
  } catch (error) {
    console.error('Erreur création audit log:', error);
    // Ne pas bloquer l'exécution en cas d'erreur d'audit
  }
};

/**
 * Middleware d'audit automatique pour les routes
 */
const auditMiddleware = (module, action) => {
  return async (req, res, next) => {
    // Stocker la méthode originale send
    const originalSend = res.send;

    res.send = function(body) {
      // Créer le log après la réponse
      const statusCode = res.statusCode;

      // Ne logger que les opérations réussies (2xx)
      if (statusCode >= 200 && statusCode < 300) {
        createAuditLog({
          userId: req.user?.id,
          action: action || `${req.method} ${req.originalUrl}`,
          module: module,
          entityType: req.params.id ? req.baseUrl.split('/').pop() : null,
          entityId: req.params.id ? parseInt(req.params.id) : null,
          details: {
            method: req.method,
            path: req.originalUrl,
            body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? sanitizeBody(req.body) : null,
            statusCode: statusCode
          },
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.headers['user-agent']
        });
      }

      return originalSend.call(this, body);
    };

    next();
  };
};

/**
 * Sanitize le body pour ne pas logger les données sensibles
 */
const sanitizeBody = (body) => {
  if (!body) return null;

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'password_hash', 'token', 'secret'];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
};

/**
 * Helper pour créer un log manuellement dans les controllers
 */
const logAction = async (req, action, module, entityType = null, entityId = null, details = null) => {
  await createAuditLog({
    userId: req.user?.id,
    action,
    module,
    entityType,
    entityId,
    details,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent']
  });
};

module.exports = {
  auditMiddleware,
  createAuditLog,
  logAction
};
