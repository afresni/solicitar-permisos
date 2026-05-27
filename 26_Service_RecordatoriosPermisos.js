/**
 * 26_Service_RecordatoriosPermisos.gs
 * Servicio de reglas para programar y enviar recordatorios de permisos.
 * Sin persistencia y sin acceso directo a Sheets.
 */

/**
 * Determina si se debe programar recordatorio.
 *
 * @param {Object} solicitud Solicitud.
 * @param {number=} thresholdDias Umbral de días. Default: 14.
 * @returns {boolean} true si debe programarse.
 */
function shouldProgramarRecordatorio(solicitud, thresholdDias) {
  var s = solicitud || {};
  var estado = _recPermisos_safeString_(s.estado_resolucion).toUpperCase();

  if (estado !== 'ACEPTADA') return false;
  if (_recPermisos_isEmpty_(s.fecha_inicio)) return false;

  var threshold = _recPermisos_parseThreshold_(thresholdDias);
  var fechaInicio;

  try {
    fechaInicio = toDate(s.fecha_inicio);
  } catch (e) {
    return false;
  }

  var now = nowDate();
  var msDiff = fechaInicio.getTime() - now.getTime();
  var diasDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));

  return diasDiff >= threshold;
}

/**
 * Construye objeto de recordatorio de semana previa compatible con RECORDATORIOS_PERMISOS.
 *
 * @param {Object} solicitud Solicitud.
 * @param {Array<*>} destinatarios Destinatarios.
 * @returns {Object} Objeto recordatorio listo para persistir.
 * @throws {Error} VALIDATION_ERROR
 */
function buildRecordatorioSemanaPrevia(solicitud, destinatarios) {
  var s = solicitud || {};
  var idSolicitud = _recPermisos_safeString_(s.id_solicitud);

  if (!idSolicitud) {
    throw new Error('VALIDATION_ERROR: id_solicitud es obligatorio.');
  }

  if (_recPermisos_isEmpty_(s.fecha_inicio)) {
    throw new Error('VALIDATION_ERROR: fecha_inicio es obligatoria.');
  }

  var normalizedDestinatarios = _recPermisos_normalizeDestinatarios_(destinatarios);

  if (!normalizedDestinatarios.length) {
    throw new Error('VALIDATION_ERROR: destinatarios es obligatorio.');
  }

  var fechaProgramada;

  try {
    fechaProgramada = getSemanaPrevia(s.fecha_inicio);
  } catch (e) {
    throw new Error('VALIDATION_ERROR: fecha_inicio inválida.');
  }

  if (fechaProgramada.getTime() < nowDate().getTime()) {
    throw new Error('VALIDATION_ERROR: fecha_programada ya vencida.');
  }

  return {
    recordatorio_id: generateRecordatorioId(),
    id_solicitud: idSolicitud,
    destinatario_email: normalizedDestinatarios.join(', '),
    destinatario_rol: 'DESTINATARIOS',
    tipo_recordatorio: 'SEMANA_PREVIA',
    canal_envio: 'EMAIL',
    fecha_programada: fechaProgramada,
    enviado: 'NO',
    fecha_envio: '',
    resultado_envio: '',
    intentos_envio: 0,
    ultimo_error: '',
    activo: 'SI',
    creado_el: nowDate(),
    actualizado_el: nowDate()
  };
}

/**
 * Envía recordatorio usando notificación a jefatura.
 *
 * @param {Object} recordatorio Recordatorio.
 * @param {Object} solicitud Solicitud asociada.
 * @returns {{ok: boolean, data: {recordatorio_id: string, sentAt: string}}}
 * @throws {Error} VALIDATION_ERROR / EXTERNAL_ERROR
 */
function enviarRecordatorio(recordatorio, solicitud) {
  var r = recordatorio || {};
  var s = solicitud || {};

  var recordatorioId = _recPermisos_safeString_(r.recordatorio_id);

  if (!recordatorioId) {
    throw new Error('VALIDATION_ERROR: recordatorio_id es obligatorio.');
  }

  var idSolicitud = _recPermisos_safeString_(s.id_solicitud);

  if (!idSolicitud) {
    throw new Error('VALIDATION_ERROR: id_solicitud es obligatorio.');
  }

  if (_recPermisos_isEmpty_(s.fecha_inicio)) {
    throw new Error('VALIDATION_ERROR: fecha_inicio es obligatoria.');
  }

  var destinatariosRaw = _recPermisos_extractDestinatariosFromRecordatorio_(r);
  var destinatarios = _recPermisos_normalizeDestinatarios_(destinatariosRaw);

  if (!destinatarios.length) {
    throw new Error('VALIDATION_ERROR: destinatarios es obligatorio.');
  }

  try {
    notificarJefaturaResolucion(s, destinatarios);
  } catch (e) {
    throw new Error('EXTERNAL_ERROR: error enviando recordatorio. ' + (e && e.message ? e.message : String(e)));
  }

  return {
    ok: true,
    data: {
      recordatorio_id: recordatorioId,
      sentAt: new Date().toISOString()
    }
  };
}

/**
 * Parsea umbral de días con default 14.
 *
 * @param {*} thresholdDias Umbral de entrada.
 * @returns {number} Umbral válido.
 * @private
 */
function _recPermisos_parseThreshold_(thresholdDias) {
  if (thresholdDias === null || thresholdDias === undefined || thresholdDias === '') {
    return 14;
  }

  var n = Number(thresholdDias);

  if (!Number.isFinite(n) || n < 0) {
    return 14;
  }

  return n;
}

/**
 * Normaliza lista de destinatarios desde emails/objetos.
 *
 * @param {Array<*>} destinatarios Entrada.
 * @returns {string[]} Emails normalizados, únicos, no vacíos.
 * @private
 */
function _recPermisos_normalizeDestinatarios_(destinatarios) {
  if (!Array.isArray(destinatarios)) return [];

  var seen = {};
  var out = [];

  destinatarios.forEach(function(item) {
    var email = '';

    if (typeof item === 'string') {
      email = item;
    } else if (item && typeof item === 'object') {
      if (!_recPermisos_isEmpty_(item.email_responsable)) {
        email = item.email_responsable;
      } else if (!_recPermisos_isEmpty_(item.email)) {
        email = item.email;
      } else if (!_recPermisos_isEmpty_(item.destinatario_email)) {
        email = item.destinatario_email;
      } else if (!_recPermisos_isEmpty_(item.value)) {
        email = item.value;
      }
    }

    email = _recPermisos_safeString_(email).toLowerCase();

    if (
      !_recPermisos_isEmpty_(email) &&
      email.indexOf('@') > 0 &&
      !seen[email]
    ) {
      seen[email] = true;
      out.push(email);
    }
  });

  return out;
}

/**
 * Extrae destinatarios desde recordatorio.
 *
 * @param {Object} recordatorio Recordatorio.
 * @returns {Array<*>} Entrada normalizable.
 * @private
 */
function _recPermisos_extractDestinatariosFromRecordatorio_(recordatorio) {
  if (recordatorio && Array.isArray(recordatorio.destinatarios)) {
    return recordatorio.destinatarios;
  }

  var raw = _recPermisos_safeString_(recordatorio && recordatorio.destinatario_email);

  if (!raw) return [];

  return raw.split(',').map(function(x) {
    return _recPermisos_safeString_(x);
  });
}

/**
 * Convierte valor a string seguro.
 *
 * @param {*} value Valor.
 * @returns {string} String seguro.
 * @private
 */
function _recPermisos_safeString_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

/**
 * Evalúa vacío técnico.
 *
 * @param {*} value Valor.
 * @returns {boolean} true si vacío.
 * @private
 */
function _recPermisos_isEmpty_(value) {
  return _recPermisos_safeString_(value) === '';
}