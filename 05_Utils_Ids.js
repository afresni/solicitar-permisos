/**
 * 05_Utils_Ids.gs
 * Generación de IDs técnicos para V1.
 */

/**
 * Genera un identificador de solicitud con formato:
 * PERM-YYYY-YYYY-XXXXXX
 *
 * @param {string} cursoEscolar Curso escolar en formato YYYY-YYYY.
 * @param {number} seq Secuencia numérica positiva para el consecutivo.
 * @returns {string} ID de solicitud generado.
 * @throws {Error} Si cursoEscolar es vacío/inválido o seq no es válido.
 */
function generateSolicitudId(cursoEscolar, seq) {
  const safeCurso = String(cursoEscolar || '').trim();
  if (!safeCurso) {
    throw new Error('VALIDATION_ERROR: curso_escolar es obligatorio para ID solicitud.');
  }
  if (!/^\d{4}-\d{4}$/.test(safeCurso)) {
    throw new Error('VALIDATION_ERROR: curso_escolar inválido.');
  }

  const n = Number(seq);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error('VALIDATION_ERROR: seq inválido para ID solicitud.');
  }

  return 'PERM-' + safeCurso + '-' + _padLeft_(Math.floor(n), 6);
}

/**
 * Genera un identificador único para eventos de log.
 *
 * @returns {string} ID de log con prefijo LOG-.
 */
function generateLogId() {
  return 'LOG-' + Utilities.getUuid();
}

/**
 * Genera un identificador único para recordatorios.
 *
 * @returns {string} ID de recordatorio con prefijo REM-.
 */
function generateRecordatorioId() {
  return 'REM-' + Utilities.getUuid();
}

/**
 * Valida si un ID de solicitud cumple el patrón oficial V1.
 *
 * @param {string} id ID a validar.
 * @returns {boolean} true si el formato es válido.
 */
function isValidSolicitudId(id) {
  if (typeof id !== 'string') return false;
  return /^PERM-\d{4}-\d{4}-\d{6}$/.test(id.trim());
}

/**
 * Rellena por la izquierda con ceros hasta el ancho indicado.
 *
 * @param {number|string} num Número base a convertir en string.
 * @param {number} width Ancho total deseado.
 * @returns {string} Valor con padding a la izquierda.
 */
function _padLeft_(num, width) {
  const s = String(num);
  if (s.length >= width) return s;
  return new Array(width - s.length + 1).join('0') + s;
}