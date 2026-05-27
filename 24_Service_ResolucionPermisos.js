/**
 * 24_Service_ResolucionPermisos.gs
 * Servicio de reglas de resolución de permisos.
 * Construye patch consistente para ACEPTADA o DENEGADA.
 * Sin acceso a Sheets.
 */

/**
 * Verifica que la decisión sea válida para resolución.
 *
 * @param {string} decision Decisión de resolución.
 * @returns {boolean} true si es ACEPTADA o DENEGADA.
 * @throws {Error} VALIDATION_ERROR si la decisión no es válida.
 */
function assertDecisionAllowed(decision) {
  var safeDecision = _resPermisos_normalizeToken_(decision);
  if (safeDecision !== 'ACEPTADA' && safeDecision !== 'DENEGADA') {
    throw new Error('VALIDATION_ERROR: decision inválida. Debe ser ACEPTADA o DENEGADA.');
  }
  return true;
}

/**
 * Construye el patch de resolución para SOLICITUDES_PERMISOS.
 *
 * Campos incluidos:
 * - estado
 * - estado_resolucion
 * - check_aceptada
 * - check_denegada
 * - dias_autorizados
 * - horas_autorizadas
 * - observaciones_direccion
 * - fecha_resolucion
 * - nombre_resuelve
 * - email_resuelve
 * - actualizado_el
 * - actualizado_por_email
 *
 * Reglas:
 * - Solo ACEPTADA / DENEGADA.
 * - Si no viene fecha_resolucion, usa nowDate().
 * - Si ACEPTADA y no vienen autorizados, usa solicitados según tipo_computo.
 * - Si DENEGADA y no vienen autorizados, deja vacíos.
 * - Ejecuta validateEstadoTransition y validateResolucion.
 *
 * @param {Object} solicitud Solicitud actual.
 * @param {string} decision Decisión (ACEPTADA o DENEGADA).
 * @param {Object} datosResolucion Datos de resolución.
 * @param {Object} resolutor Datos del resolutor (nombre/email).
 * @returns {Object} Patch listo para update de SOLICITUDES_PERMISOS.
 * @throws {Error} VALIDATION_ERROR / CONFLICT
 */
function buildResolucionPatch(solicitud, decision, datosResolucion, resolutor) {
  var sol = solicitud || {};
  var datos = datosResolucion || {};
  var res = resolutor || {};

  if (!sol || typeof sol !== 'object' || Array.isArray(sol)) {
    throw new Error('VALIDATION_ERROR: solicitud inválida.');
  }

  if (_resPermisos_normalizeToken_(sol.estado) !== 'PENDIENTE') {
    throw new Error('CONFLICT: la solicitud ya está resuelta o no puede resolverse.');
  }

  if (_resPermisos_isEmpty_(res.nombre_resuelve) || _resPermisos_isEmpty_(res.email_resuelve)) {
    throw new Error('VALIDATION_ERROR: nombre_resuelve y email_resuelve son obligatorios.');
  }

  assertDecisionAllowed(decision);
  var safeDecision = _resPermisos_normalizeToken_(decision);

  var transition = validateEstadoTransition(sol.estado, safeDecision);
  if (!transition.ok) {
    throw new Error('VALIDATION_ERROR: ' + (transition.error || 'Transición de estado inválida.'));
  }

  var checks = _resPermisos_buildChecks_(safeDecision);

  var fechaResolucion = _resPermisos_isEmpty_(datos.fecha_resolucion)
    ? nowDate()
    : datos.fecha_resolucion;

  var autorizados = _resPermisos_buildAutorizados_(sol, safeDecision, datos);

  var patch = {
    estado: safeDecision,
    estado_resolucion: safeDecision,
    check_aceptada: checks.check_aceptada,
    check_denegada: checks.check_denegada,
    dias_autorizados: autorizados.dias_autorizados,
    horas_autorizadas: autorizados.horas_autorizadas,
    observaciones_direccion: _resPermisos_isEmpty_(datos.observaciones_direccion)
      ? ''
      : datos.observaciones_direccion,
    fecha_resolucion: fechaResolucion,
    nombre_resuelve: _resPermisos_isEmpty_(res.nombre_resuelve) ? '' : res.nombre_resuelve,
    email_resuelve: _resPermisos_isEmpty_(res.email_resuelve) ? '' : res.email_resuelve,
    actualizado_el: nowDate(),
    actualizado_por_email: _resPermisos_isEmpty_(res.email_resuelve) ? '' : res.email_resuelve
  };

  var validationInput = {
    estado_resolucion: patch.estado_resolucion,
    check_aceptada: patch.check_aceptada,
    check_denegada: patch.check_denegada,
    dias_autorizados: patch.dias_autorizados,
    horas_autorizadas: patch.horas_autorizadas,
    fecha_resolucion: patch.fecha_resolucion
  };

  var validation = validateResolucion(validationInput, sol, null);
  if (!validation.ok) {
    throw new Error('VALIDATION_ERROR: ' + validation.errors.join(' | '));
  }

  return patch;
}

/**
 * Construye checks de resolución en función de la decisión.
 *
 * @param {string} decision Decisión normalizada.
 * @returns {{check_aceptada: string, check_denegada: string}} Checks.
 * @private
 */
function _resPermisos_buildChecks_(decision) {
  if (decision === 'ACEPTADA') {
    return { check_aceptada: 'X', check_denegada: '' };
  }
  return { check_aceptada: '', check_denegada: 'X' };
}

/**
 * Construye días/horas autorizadas según decisión y datos recibidos.
 *
 * Reglas:
 * - ACEPTADA:
 *   - si vienen en datosResolucion, usarlos.
 *   - si no vienen, usar solicitados según tipo_computo.
 * - DENEGADA:
 *   - si vienen en datosResolucion, respetarlos.
 *   - si no vienen, dejar vacíos.
 * - Forzado por tipo_computo:
 *   - HORAS => dias_autorizados = ''
 *   - DIA_COMPLETO => horas_autorizadas = ''
 *
 * @param {Object} solicitud Solicitud actual.
 * @param {string} decision Decisión normalizada.
 * @param {Object} datosResolucion Datos de resolución.
 * @returns {{dias_autorizados: *, horas_autorizadas: *}} Valores autorizados.
 * @private
 */
function _resPermisos_buildAutorizados_(solicitud, decision, datosResolucion) {
  var tipoComputo = _resPermisos_normalizeToken_(solicitud.tipo_computo);

  var hasDias = !_resPermisos_isEmpty_(datosResolucion.dias_autorizados);
  var hasHoras = !_resPermisos_isEmpty_(datosResolucion.horas_autorizadas);

  var dias = hasDias ? datosResolucion.dias_autorizados : '';
  var horas = hasHoras ? datosResolucion.horas_autorizadas : '';

  if (decision === 'ACEPTADA') {
    if (!hasDias && (tipoComputo === 'DIA_COMPLETO' || tipoComputo === 'MIXTO')) {
      dias = _resPermisos_isEmpty_(solicitud.num_dias_solicitados) ? '' : solicitud.num_dias_solicitados;
    }
    if (!hasHoras && (tipoComputo === 'HORAS' || tipoComputo === 'MIXTO')) {
      horas = _resPermisos_isEmpty_(solicitud.num_horas_solicitadas) ? '' : solicitud.num_horas_solicitadas;
    }
  } else if (decision === 'DENEGADA') {
    if (!hasDias) dias = '';
    if (!hasHoras) horas = '';
  }

  if (tipoComputo === 'HORAS') {
    dias = '';
  } else if (tipoComputo === 'DIA_COMPLETO') {
    horas = '';
  }

  return {
    dias_autorizados: dias,
    horas_autorizadas: horas
  };
}

/**
 * Normaliza token textual a mayúsculas.
 *
 * @param {*} value Valor a normalizar.
 * @returns {string} String trim en mayúsculas.
 * @private
 */
function _resPermisos_normalizeToken_(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .toUpperCase();
}

/**
 * Comprueba vacío técnico.
 *
 * @param {*} value Valor a comprobar.
 * @returns {boolean} true si está vacío.
 * @private
 */
function _resPermisos_isEmpty_(value) {
  return value === null || value === undefined || String(value).trim() === '';
}