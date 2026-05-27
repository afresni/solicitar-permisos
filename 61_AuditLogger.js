/**
 * 61_AuditLogger.gs
 * Wrapper unificado de auditoría hacia LOGS_PERMISOS.
 * Sin acceso directo a Sheets.
 */

/**
 * Registra un evento de auditoría estándar.
 * Degrada silenciosamente si falla el append del log.
 *
 * @param {string} tipoEvento Tipo de evento (se normaliza a mayúsculas).
 * @param {Object=} ctx Contexto opcional del evento.
 * @returns {{ok: boolean, logged: boolean, data?: Object, error?: string}}
 */
function auditEvent(tipoEvento, ctx) {
  var safeCtx = _audit_safeCtx_(ctx);
  var record = _audit_buildBaseRecord_(tipoEvento, safeCtx);

  // Detalle opcional desde ctx
  if (!_audit_isEmpty_(safeCtx.detalle_evento)) {
    record.detalle_evento = String(safeCtx.detalle_evento);
  }

  // Campos opcionales de trazabilidad de cambios
  if (!_audit_isEmpty_(safeCtx.campo_modificado)) record.campo_modificado = String(safeCtx.campo_modificado);
  if (!_audit_isEmpty_(safeCtx.valor_anterior)) record.valor_anterior = String(safeCtx.valor_anterior);
  if (!_audit_isEmpty_(safeCtx.valor_nuevo)) record.valor_nuevo = String(safeCtx.valor_nuevo);

  return _audit_tryAppend_(record);
}

/**
 * Registra un error de auditoría con mensaje y stack (si existe).
 * Degrada silenciosamente si falla el append del log.
 *
 * @param {string} tipoEvento Tipo de evento asociado al error.
 * @param {*} err Error capturado.
 * @param {Object=} ctx Contexto opcional.
 * @returns {{ok: boolean, logged: boolean, data?: Object, error?: string}}
 */
function auditError(tipoEvento, err, ctx) {
  var safeCtx = _audit_safeCtx_(ctx);
  var record = _audit_buildBaseRecord_(tipoEvento, safeCtx);

  var errObj = _audit_extractError_(err);
  var detalle = 'ERROR: ' + errObj.message;
  if (errObj.stack) {
    detalle += '\nSTACK: ' + errObj.stack;
  }

  record.detalle_evento = detalle;
  record.campo_modificado = 'error';
  record.valor_anterior = '';
  record.valor_nuevo = errObj.message;

  return _audit_tryAppend_(record);
}

/**
 * Registra un cambio de estado en auditoría.
 * Degrada silenciosamente si falla el append del log.
 *
 * @param {string} idSolicitud ID de solicitud.
 * @param {string} fromEstado Estado anterior.
 * @param {string} toEstado Estado nuevo.
 * @param {Object=} ctx Contexto opcional.
 * @returns {{ok: boolean, logged: boolean, data?: Object, error?: string}}
 */
function auditStateChange(idSolicitud, fromEstado, toEstado, ctx) {
  var safeCtx = _audit_safeCtx_(ctx);
  var record = _audit_buildBaseRecord_('STATE_CHANGE', safeCtx);

  var fromNorm = _audit_normalizeEstado_(fromEstado);
  var toNorm = _audit_normalizeEstado_(toEstado);

  record.id_solicitud = _audit_isEmpty_(idSolicitud) ? '' : String(idSolicitud);
  record.estado_anterior = fromNorm;
  record.estado_nuevo = toNorm;
  record.campo_modificado = 'estado';
  record.valor_anterior = record.estado_anterior;
  record.valor_nuevo = record.estado_nuevo;

  if (_audit_isEmpty_(record.detalle_evento)) {
    record.detalle_evento = 'Cambio de estado: ' + record.estado_anterior + ' -> ' + record.estado_nuevo;
  }

  return _audit_tryAppend_(record);
}

/**
 * Construye el registro base compatible con LOGS_PERMISOS.
 *
 * Campos:
 * - log_id
 * - id_solicitud
 * - fecha_evento
 * - actor_email
 * - actor_rol
 * - tipo_evento
 * - estado_anterior
 * - estado_nuevo
 * - campo_modificado
 * - valor_anterior
 * - valor_nuevo
 * - detalle_evento
 * - origen
 * - correlacion_id
 *
 * @param {string} tipoEvento Tipo de evento.
 * @param {Object} ctx Contexto.
 * @returns {Object} Registro base.
 * @private
 */
function _audit_buildBaseRecord_(tipoEvento, ctx) {
  return {
    log_id: _audit_isEmpty_(ctx.log_id)
      ? generateLogId()
      : String(ctx.log_id),
    id_solicitud: _audit_isEmpty_(ctx.id_solicitud) ? '' : String(ctx.id_solicitud),
    fecha_evento: _audit_isEmpty_(ctx.fecha_evento) ? nowDate() : ctx.fecha_evento,
    actor_email: _audit_normalizeEmail_(ctx.actor_email),
    actor_rol: _audit_isEmpty_(ctx.actor_rol) ? '' : String(ctx.actor_rol),
    tipo_evento: _audit_normalizeTipoEvento_(tipoEvento),
    estado_anterior: _audit_isEmpty_(ctx.estado_anterior) ? '' : String(ctx.estado_anterior),
    estado_nuevo: _audit_isEmpty_(ctx.estado_nuevo) ? '' : String(ctx.estado_nuevo),
    campo_modificado: _audit_isEmpty_(ctx.campo_modificado) ? '' : String(ctx.campo_modificado),
    valor_anterior: _audit_isEmpty_(ctx.valor_anterior) ? '' : String(ctx.valor_anterior),
    valor_nuevo: _audit_isEmpty_(ctx.valor_nuevo) ? '' : String(ctx.valor_nuevo),
    detalle_evento: _audit_isEmpty_(ctx.detalle_evento) ? '' : String(ctx.detalle_evento),
    origen: _audit_isEmpty_(ctx.origen) ? 'SISTEMA' : String(ctx.origen),
    correlacion_id: _audit_isEmpty_(ctx.correlacion_id) ? '' : String(ctx.correlacion_id)
  };
}

/**
 * Intenta appendLog y degrada silenciosamente si falla.
 *
 * @param {Object} record Registro a persistir.
 * @returns {{ok: boolean, logged: boolean, data?: Object, error?: string}}
 * @private
 */
function _audit_tryAppend_(record) {
  try {
    var res = appendLog(record);
    return {
      ok: true,
      logged: true,
      data: res
    };
  } catch (e) {
    return {
      ok: true,
      logged: false,
      error: _audit_errorToString_(e)
    };
  }
}

/**
 * Normaliza tipo de evento a mayúsculas.
 *
 * @param {string} tipoEvento Tipo de evento.
 * @returns {string} Tipo de evento normalizado.
 * @private
 */
function _audit_normalizeTipoEvento_(tipoEvento) {
  return String(tipoEvento === null || tipoEvento === undefined ? '' : tipoEvento)
    .trim()
    .toUpperCase();
}

/**
 * Normaliza email con trim y minúsculas.
 *
 * @param {*} value Valor de email.
 * @returns {string} Email normalizado o vacío.
 * @private
 */
function _audit_normalizeEmail_(value) {
  return String(value === null || value === undefined ? '' : value).trim().toLowerCase();
}

/**
 * Normaliza estado con trim y mayúsculas.
 *
 * @param {*} value Estado de entrada.
 * @returns {string} Estado normalizado o vacío.
 * @private
 */
function _audit_normalizeEstado_(value) {
  return String(value === null || value === undefined ? '' : value).trim().toUpperCase();
}

/**
 * Garantiza contexto objeto.
 *
 * @param {*} ctx Contexto de entrada.
 * @returns {Object} Contexto normalizado.
 * @private
 */
function _audit_safeCtx_(ctx) {
  if (!ctx || typeof ctx !== 'object' || Array.isArray(ctx)) {
    return {};
  }
  return ctx;
}

/**
 * Extrae mensaje y stack de un error.
 *
 * @param {*} err Error de entrada.
 * @returns {{message: string, stack: string}} Error normalizado.
 * @private
 */
function _audit_extractError_(err) {
  if (!err) {
    return { message: 'Error desconocido.', stack: '' };
  }

  var message = '';
  var stack = '';

  if (typeof err === 'string') {
    message = err;
  } else {
    message = err.message ? String(err.message) : String(err);
    stack = err.stack ? String(err.stack) : '';
  }

  return { message: message, stack: stack };
}

/**
 * Convierte error a string seguro.
 *
 * @param {*} err Error a convertir.
 * @returns {string} Texto de error.
 * @private
 */
function _audit_errorToString_(err) {
  var parsed = _audit_extractError_(err);
  return parsed.stack ? (parsed.message + ' | ' + parsed.stack) : parsed.message;
}

/**
 * Comprueba vacío técnico.
 *
 * @param {*} value Valor a evaluar.
 * @returns {boolean} true si vacío.
 * @private
 */
function _audit_isEmpty_(value) {
  return value === null || value === undefined || String(value).trim() === '';
}