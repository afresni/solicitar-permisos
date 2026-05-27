/**
 * 21_Service_ProfesorLookup.gs
 * Capa SERVICE para resolver datos de profesor y construir snapshot
 * para SOLICITUDES_PERMISOS.
 * Sin acceso directo a Sheets.
 */

/**
 * Obtiene un profesor activo por email o lanza error.
 *
 * Reglas:
 * - Si no existe profesor: NOT_FOUND
 * - Si existe pero no está activo: FORBIDDEN
 *
 * @param {string} email Email institucional del profesor.
 * @returns {Object} Objeto profesor activo.
 * @throws {Error} VALIDATION_ERROR / NOT_FOUND / FORBIDDEN
 */
function getProfesorActivoByEmailOrThrow(email) {
  var normalizedEmail = _profLookup_normalizeEmail_(email);
  if (!normalizedEmail) {
    throw new Error('VALIDATION_ERROR: email es obligatorio.');
  }

  var profesor = findByEmail(normalizedEmail);
  if (!profesor) {
    throw new Error('NOT_FOUND: profesor no encontrado.');
  }

  var isActive = isActiveByEmail(normalizedEmail);
  if (isActive !== true) {
    throw new Error('FORBIDDEN: profesor inactivo.');
  }

  _profLookup_assertEssentialProfesorData_(profesor);
  return profesor;
}

/**
 * Construye el snapshot de profesor para SOLICITUDES_PERMISOS.
 *
 * Campos exactos:
 * - email_institucional_profesor
 * - nombre_profesor
 * - apellidos_profesor
 * - dni_profesor
 * - etapa
 * - puesto_trabajo
 *
 * @param {string} email Email institucional del profesor.
 * @returns {{
 *   email_institucional_profesor: string,
 *   nombre_profesor: string,
 *   apellidos_profesor: string,
 *   dni_profesor: string,
 *   etapa: string,
 *   puesto_trabajo: string
 * }}
 * @throws {Error} VALIDATION_ERROR / NOT_FOUND / FORBIDDEN / INTEGRITY_ERROR
 */
function buildProfesorSnapshot(email) {
  var profesor = getProfesorActivoByEmailOrThrow(email);

  var snapshot = {
    email_institucional_profesor: _profLookup_normalizeEmail_(profesor.email_institucional),
    nombre_profesor: _profLookup_safeTrim_(profesor.nombre),
    apellidos_profesor: _profLookup_safeTrim_(profesor.apellidos),
    dni_profesor: _profLookup_safeTrim_(profesor.dni),
    etapa: _profLookup_safeTrim_(profesor.etapa),
    puesto_trabajo: _profLookup_safeTrim_(profesor.puesto_trabajo)
  };

  _profLookup_assertSnapshotCompleteness_(snapshot);
  return snapshot;
}

/**
 * Normaliza email para comparación/uso técnico.
 *
 * @param {*} value Valor de email.
 * @returns {string} Email normalizado en minúsculas y trim.
 * @private
 */
function _profLookup_normalizeEmail_(value) {
  return String(value === null || value === undefined ? '' : value).trim().toLowerCase();
}

/**
 * Aplica trim seguro sobre cualquier valor.
 *
 * @param {*} value Valor de entrada.
 * @returns {string} String trim.
 * @private
 */
function _profLookup_safeTrim_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

/**
 * Valida que el objeto profesor tenga datos esenciales no vacíos:
 * - email_institucional
 * - nombre
 * - apellidos
 * - dni
 * - etapa
 * - puesto_trabajo
 *
 * @param {Object} profesor Objeto profesor.
 * @throws {Error} INTEGRITY_ERROR
 * @private
 */
function _profLookup_assertEssentialProfesorData_(profesor) {
  if (!profesor || typeof profesor !== 'object' || Array.isArray(profesor)) {
    throw new Error('INTEGRITY_ERROR: registro de profesor inválido.');
  }

  var essential = {
    email_institucional: _profLookup_normalizeEmail_(profesor.email_institucional),
    nombre: _profLookup_safeTrim_(profesor.nombre),
    apellidos: _profLookup_safeTrim_(profesor.apellidos),
    dni: _profLookup_safeTrim_(profesor.dni),
    etapa: _profLookup_safeTrim_(profesor.etapa),
    puesto_trabajo: _profLookup_safeTrim_(profesor.puesto_trabajo)
  };

  var missing = Object.keys(essential).filter(function(k) {
    return !essential[k];
  });

  if (missing.length > 0) {
    throw new Error('INTEGRITY_ERROR: datos esenciales de profesor incompletos -> ' + missing.join(', '));
  }
}

/**
 * Verifica que el snapshot final esté completo.
 *
 * @param {Object} snapshot Snapshot de salida.
 * @throws {Error} INTEGRITY_ERROR
 * @private
 */
function _profLookup_assertSnapshotCompleteness_(snapshot) {
  var required = [
    'email_institucional_profesor',
    'nombre_profesor',
    'apellidos_profesor',
    'dni_profesor',
    'etapa',
    'puesto_trabajo'
  ];

  var missing = required.filter(function(key) {
    return !_profLookup_safeTrim_(snapshot[key]);
  });

  if (missing.length > 0) {
    throw new Error('INTEGRITY_ERROR: snapshot de profesor incompleto -> ' + missing.join(', '));
  }
}