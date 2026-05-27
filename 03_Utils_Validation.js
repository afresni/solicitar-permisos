/**
 * 03_Utils_Validation.gs
 * Validaciones técnicas genéricas.
 */

/**
 * Valida si un email pertenece a uno de los dominios institucionales permitidos.
 * Si no se pasan dominios permitidos, valida únicamente estructura básica con '@'.
 *
 * @param {string} email Email a validar.
 * @param {string[]=} allowedDomains Lista de dominios permitidos.
 * @returns {boolean} true si el email es válido para los dominios indicados.
 */
function isInstitutionalEmail(email, allowedDomains) {
  if (typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) return false;

  const domains = (allowedDomains || []).map(function(d) {
    return String(d).trim().toLowerCase();
  }).filter(Boolean);

  if (!domains.length) {
    return true;
  }

  const parts = normalized.split('@');
  const domain = parts[parts.length - 1];
  return domains.indexOf(domain) >= 0;
}

/**
 * Comprueba campos obligatorios en un objeto.
 * Considera vacío solo:
 * - null
 * - undefined
 * - string vacío tras trim
 *
 * Nota: valores false y 0 se consideran válidos (no vacíos).
 *
 * @param {Object} obj Objeto origen.
 * @param {string[]} fields Lista de campos obligatorios.
 * @returns {{ok: boolean, missing: string[]}} Resultado de validación.
 */
function requireFields(obj, fields) {
  const missing = [];
  const source = obj || {};

  (fields || []).forEach(function(field) {
    const val = source[field];

    var isEmpty = false;
    if (val === null || val === undefined) {
      isEmpty = true;
    } else if (typeof val === 'string' && val.trim() === '') {
      isEmpty = true;
    }

    if (isEmpty) {
      missing.push(field);
    }
  });

  return {
    ok: missing.length === 0,
    missing: missing
  };
}

/**
 * Verifica si un valor pertenece a una lista/enumeración.
 *
 * @param {*} value Valor a validar.
 * @param {Array} enumValues Lista de valores permitidos.
 * @returns {boolean} true si pertenece al enum.
 */
function isInEnum(value, enumValues) {
  if (!Array.isArray(enumValues)) return false;
  return enumValues.indexOf(value) >= 0;
}

/**
 * Valida que un valor sea numérico y esté dentro de un rango opcional.
 *
 * @param {*} value Valor a validar.
 * @param {?number} min Mínimo permitido (incluido), o null/undefined para sin mínimo.
 * @param {?number} max Máximo permitido (incluido), o null/undefined para sin máximo.
 * @returns {{ok: boolean, value?: number, error?: string}} Resultado de validación.
 */
function validateNumberRange(value, min, max) {
  const n = Number(value);
  if (isNaN(n)) {
    return { ok: false, error: 'Debe ser numérico.' };
  }
  if (min !== null && min !== undefined && n < min) {
    return { ok: false, error: 'Debe ser >= ' + min };
  }
  if (max !== null && max !== undefined && n > max) {
    return { ok: false, error: 'Debe ser <= ' + max };
  }
  return { ok: true, value: n };
}

/**
 * Valida que un estado pertenezca al catálogo V1 de estados.
 *
 * @param {*} value Estado a validar.
 * @returns {{ok: boolean, error?: string}} Resultado estándar de validación.
 */
function validateEstadoV1(value) {
  if (isInEnum(value, getEstadosV1())) {
    return { ok: true };
  }
  return {
    ok: false,
    error: 'Estado inválido para V1: ' + value
  };
}