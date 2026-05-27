/**
 * 20_Service_AuthInstitucional.gs
 * Servicio de autenticación/autorización institucional.
 * Sin endpoints, sin modificación de datos.
 */

/**
 * Obtiene el email del usuario actual desde sesión.
 *
 * @returns {string} Email normalizado del usuario actual.
 * @throws {Error} AUTH_REQUIRED
 */
function getCurrentUserEmailOrThrow() {
  var email = _auth_getSessionEmail_();

  if (!email) {
    throw new Error('AUTH_REQUIRED: usuario no autenticado o sin email disponible.');
  }

  return email;
}

/**
 * Verifica que un email pertenezca al dominio institucional permitido.
 *
 * @param {string} email Email a validar.
 * @returns {boolean} true si el usuario es institucional.
 * @throws {Error} VALIDATION_ERROR / FORBIDDEN / CONFIG_ERROR
 */
function assertInstitutionalUser(email) {
  var normalizedEmail = _auth_normalizeEmail_(email);

  if (!normalizedEmail) {
    throw new Error('VALIDATION_ERROR: email es obligatorio.');
  }

  var allowedDomains = _auth_getAllowedDomains_();
  var isAllowed = isInstitutionalEmail(normalizedEmail, allowedDomains);

  if (!isAllowed) {
    throw new Error('FORBIDDEN: email no permitido para acceso institucional.');
  }

  return true;
}

/**
 * Verifica si un usuario puede resolver solicitudes para etapa/categoría.
 *
 * Solo se permite si aparece como responsable activo con rol:
 * - DIRECCION
 * - AUTORIZADO
 *
 * JEFATURA no puede resolver.
 *
 * @param {string} email Email del usuario.
 * @param {string} etapa Etapa de la solicitud.
 * @param {string} categoriaPermiso Categoría de permiso.
 * @returns {boolean} true si puede resolver.
 * @throws {Error} VALIDATION_ERROR / FORBIDDEN / CONFIG_ERROR
 */
function assertCanResolve(email, etapa, categoriaPermiso) {
  var normalizedEmail = _auth_normalizeEmail_(email);

  if (!normalizedEmail) {
    throw new Error('VALIDATION_ERROR: email es obligatorio.');
  }

  if (String(etapa === null || etapa === undefined ? '' : etapa).trim() === '') {
    throw new Error('VALIDATION_ERROR: etapa es obligatoria.');
  }

  if (String(categoriaPermiso === null || categoriaPermiso === undefined ? '' : categoriaPermiso).trim() === '') {
    throw new Error('VALIDATION_ERROR: categoriaPermiso es obligatoria.');
  }

  assertInstitutionalUser(normalizedEmail);

  var resolutor = findResolutor(etapa, categoriaPermiso);

  if (resolutor) {
    var resolutorEmail = _auth_normalizeEmail_(resolutor.email_responsable);
    var resolutorRole = String(resolutor.rol === null || resolutor.rol === undefined ? '' : resolutor.rol)
      .trim()
      .toUpperCase();

    if (
      resolutorEmail === normalizedEmail &&
      (resolutorRole === 'DIRECCION' || resolutorRole === 'AUTORIZADO')
    ) {
      return true;
    }
  }

  var jefaturas = listJefaturas(etapa, categoriaPermiso) || [];
  var isJefatura = jefaturas.some(function(item) {
    return _auth_normalizeEmail_(item.email_responsable) === normalizedEmail;
  });

  if (isJefatura) {
    throw new Error('FORBIDDEN: rol JEFATURA no autorizado para resolver.');
  }

  var notificables = listNotificables(etapa, categoriaPermiso) || [];
  void notificables;

  throw new Error('FORBIDDEN: usuario sin permisos de resolución para etapa/categoría.');
}

/**
 * Obtiene email de sesión activo y lo normaliza.
 *
 * @returns {string} Email normalizado o cadena vacía si no disponible.
 * @private
 */
function _auth_getSessionEmail_() {
  var raw = '';

  try {
    raw = Session.getActiveUser().getEmail();
  } catch (e) {
    raw = '';
  }

  return _auth_normalizeEmail_(raw);
}

/**
 * Normaliza email en minúsculas y trim.
 *
 * @param {*} value Valor de email.
 * @returns {string} Email normalizado o vacío.
 * @private
 */
function _auth_normalizeEmail_(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .toLowerCase();
}

/**
 * Devuelve dominios permitidos desde APP_CONFIG.ALLOWED_DOMAINS.
 *
 * Si no existe o está vacío, lanza CONFIG_ERROR.
 *
 * @returns {string[]} Lista de dominios permitidos.
 * @throws {Error} CONFIG_ERROR
 * @private
 */
function _auth_getAllowedDomains_() {
  var cfg = getProjectConfig();
  var domains = cfg && Array.isArray(cfg.ALLOWED_DOMAINS) ? cfg.ALLOWED_DOMAINS : [];

  var normalizedDomains = domains.map(function(d) {
    return String(d === null || d === undefined ? '' : d)
      .trim()
      .toLowerCase();
  }).filter(function(d) {
    return d !== '';
  });

  if (!normalizedDomains.length) {
    throw new Error('CONFIG_ERROR: ALLOWED_DOMAINS no configurado.');
  }

  return normalizedDomains;
}