/**
 * 25_Service_NotificacionesPermisos.gs
 * Servicio de notificaciones EMAIL para permisos/licencias.
 * Sin acceso directo a Sheets, sin persistencia.
 */

/**
 * Notifica al profesor la resolución de su solicitud.
 *
 * @param {Object} solicitud Datos de solicitud/resolución.
 * @returns {{ok: boolean, data: {recipients: string[], subject: string, sentAt: string}}}
 */
function notificarResolucionProfesor(solicitud) {
  var s = solicitud || {};
  _notif_assertEstadoResolucion_(s);

  var recipients = _notif_normalizeEmailList_([s.email_institucional_profesor]);
  if (!recipients.length) {
    throw new Error('VALIDATION_ERROR: destinatario profesor vacío.');
  }

  var subject = _notif_buildSubject_(_notif_getEventType_(s.estado_resolucion));
  var body = _notif_buildBody_('RESOLUCION_PROFESOR', s, null);

  _notif_sendEmail_(recipients, subject, body);

  return {
    ok: true,
    data: {
      recipients: recipients,
      subject: subject,
      sentAt: new Date().toISOString()
    }
  };
}

/**
 * Notifica a dirección/resolutor la resolución emitida.
 *
 * @param {Object} solicitud Datos de solicitud/resolución.
 * @returns {{ok: boolean, data: {recipients: string[], subject: string, sentAt: string}}}
 */
function notificarResolucionDireccion(solicitud) {
  var s = solicitud || {};
  _notif_assertEstadoResolucion_(s);

  var recipients = _notif_normalizeEmailList_([s.email_resuelve]);
  if (!recipients.length) {
    throw new Error('VALIDATION_ERROR: destinatario dirección vacío.');
  }

  var subject = _notif_buildSubject_(_notif_getEventType_(s.estado_resolucion));
  var body = _notif_buildBody_('RESOLUCION_DIRECCION', s, null);

  _notif_sendEmail_(recipients, subject, body);

  return {
    ok: true,
    data: {
      recipients: recipients,
      subject: subject,
      sentAt: new Date().toISOString()
    }
  };
}

/**
 * Notifica a jefatura la resolución de una solicitud.
 *
 * @param {Object} solicitud Datos de solicitud/resolución.
 * @param {Array<*>} jefaturaEmails Lista de emails u objetos.
 * @returns {{ok: boolean, data: {recipients: string[], subject: string, sentAt: string}}}
 */
function notificarJefaturaResolucion(solicitud, jefaturaEmails) {
  var s = solicitud || {};
  _notif_assertEstadoResolucion_(s);

  var recipients = _notif_normalizeEmailList_(jefaturaEmails);
  if (!recipients.length) {
    throw new Error('VALIDATION_ERROR: destinatarios de jefatura vacíos.');
  }

  var subject = _notif_buildSubject_(_notif_getEventType_(s.estado_resolucion));
  var body = _notif_buildBody_('RESOLUCION_JEFATURA', s, null);

  _notif_sendEmail_(recipients, subject, body);

  return {
    ok: true,
    data: {
      recipients: recipients,
      subject: subject,
      sentAt: new Date().toISOString()
    }
  };
}

/**
 * Notifica a dirección un exceso de acumulado detectado.
 *
 * @param {Object} solicitud Datos de solicitud/resolución.
 * @param {Object} detalleExceso Detalle del exceso.
 * @returns {{ok: boolean, data: {recipients: string[], subject: string, sentAt: string}}}
 */
function notificarExcesoADireccion(solicitud, detalleExceso) {
  var s = solicitud || {};
  var d = detalleExceso || {};

  var recipients = _notif_normalizeEmailList_([s.email_resuelve]);
  if (!recipients.length) {
    throw new Error('VALIDATION_ERROR: destinatario dirección vacío para alerta de exceso.');
  }

  var subject = _notif_buildSubject_('Exceso acumulado detectado');
  var body = _notif_buildBody_('EXCESO_ACUMULADO', s, d);

  _notif_sendEmail_(recipients, subject, body);

  return {
    ok: true,
    data: {
      recipients: recipients,
      subject: subject,
      sentAt: new Date().toISOString()
    }
  };
}

/**
 * Construye subject estándar.
 *
 * @param {string} eventType Tipo de evento legible.
 * @returns {string} Asunto final.
 * @private
 */
function _notif_buildSubject_(eventType) {
  return '[PERMISOS] ' + _notif_safeString_(eventType);
}

/**
 * Construye body en texto plano.
 *
 * @param {string} mode Modo de notificación.
 * @param {Object} solicitud Datos de solicitud.
 * @param {Object|null} extra Datos extra opcionales.
 * @returns {string} Cuerpo del email.
 * @private
 */
function _notif_buildBody_(mode, solicitud, extra) {
  var s = solicitud || {};
  var e = extra || {};

  var lineas = [
    'Notificación automática del sistema de permisos',
    '',
    'ID solicitud: ' + _notif_safeString_(s.id_solicitud),
    'Profesor/a: ' + (_notif_safeString_(s.nombre_profesor) + ' ' + _notif_safeString_(s.apellidos_profesor)).trim(),
    'Categoría permiso: ' + _notif_safeString_(s.categoria_permiso),
    'Curso escolar: ' + _notif_safeString_(s.curso_escolar),
    'Permiso: ' + _notif_safeString_(s.tipo_permiso),
    'Estado resolución: ' + _notif_safeString_(s.estado_resolucion),
    'Fecha solicitud: ' + _notif_safeString_(s.fecha_solicitud),
    'Fecha resolución: ' + _notif_safeString_(s.fecha_resolucion),
    'Fecha inicio: ' + _notif_safeString_(s.fecha_inicio),
    'Fecha fin: ' + _notif_safeString_(s.fecha_fin)
  ];

  if (mode === 'EXCESO_ACUMULADO') {
    lineas.push('');
    lineas.push('Detalle de exceso acumulado:');
    lineas.push('Acumulado previo: ' + _notif_safeString_(e.acumulado_previo_curso));
    lineas.push('Acumulado posterior: ' + _notif_safeString_(e.acumulado_post_resolucion));
    lineas.push('Máximo permitido: ' + _notif_safeString_(e.maximo_por_curso));
  }

  return lineas.join('\n');
}

/**
 * Envía email en texto plano.
 *
 * @param {string[]} recipients Destinatarios normalizados.
 * @param {string} subject Asunto.
 * @param {string} body Cuerpo.
 * @private
 */
function _notif_sendEmail_(recipients, subject, body) {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error('VALIDATION_ERROR: recipients vacío.');
  }

  subject = _notif_safeString_(subject);
  body = _notif_safeString_(body);

  if (_notif_isEmpty_(subject)) {
    throw new Error('VALIDATION_ERROR: subject obligatorio.');
  }

  if (_notif_isEmpty_(body)) {
    throw new Error('VALIDATION_ERROR: body obligatorio.');
  }

  var to = recipients.join(', ');
  if (_notif_isEmpty_(to)) {
    throw new Error('VALIDATION_ERROR: recipients inválido.');
  }

  try {
    MailApp.sendEmail({
      to: to,
      subject: subject,
      body: body,
      name: 'Sistema Permisos'
    });
  } catch (e) {
    throw new Error('EXTERNAL_ERROR: fallo enviando email. ' + (e && e.message ? e.message : String(e)));
  }
}

/**
 * Normaliza lista de emails.
 *
 * @param {Array<*>} list Lista de entrada.
 * @returns {string[]} Lista normalizada y única.
 * @private
 */
function _notif_normalizeEmailList_(list) {
  if (!Array.isArray(list)) return [];

  var seen = {};
  var out = [];

  list.forEach(function(item) {
    var candidate = '';

    if (typeof item === 'string') {
      candidate = item;
    } else if (item && typeof item === 'object') {
      if (!_notif_isEmpty_(item.email_responsable)) {
        candidate = item.email_responsable;
      } else if (!_notif_isEmpty_(item.email)) {
        candidate = item.email;
      } else if (!_notif_isEmpty_(item.value)) {
        candidate = item.value;
      }
    }

    candidate = _notif_safeString_(candidate).toLowerCase();

    if (
      !_notif_isEmpty_(candidate) &&
      candidate.includes('@') &&
      !seen[candidate]
    ) {
      seen[candidate] = true;
      out.push(candidate);
    }
  });

  return out;
}

/**
 * Valida que exista estado_resolucion.
 *
 * @param {Object} solicitud Solicitud.
 * @throws {Error} VALIDATION_ERROR si falta estado_resolucion.
 * @private
 */
function _notif_assertEstadoResolucion_(solicitud) {
  if (_notif_isEmpty_(solicitud.estado_resolucion)) {
    throw new Error('VALIDATION_ERROR: estado_resolucion obligatorio.');
  }
}

/**
 * Devuelve texto de evento según estado.
 *
 * @param {*} estadoResolucion Estado de resolución.
 * @returns {string} Texto de evento.
 * @private
 */
function _notif_getEventType_(estadoResolucion) {
  var estado = _notif_safeString_(estadoResolucion).toUpperCase();

  if (estado === 'ACEPTADA') return 'Solicitud aceptada';
  if (estado === 'DENEGADA') return 'Solicitud denegada';

  return 'Solicitud resuelta';
}

/**
 * Convierte valor a string seguro.
 *
 * @param {*} value Valor de entrada.
 * @returns {string} String sin null/undefined.
 * @private
 */
function _notif_safeString_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

/**
 * Comprueba vacío técnico.
 *
 * @param {*} value Valor a evaluar.
 * @returns {boolean} true si está vacío.
 * @private
 */
function _notif_isEmpty_(value) {
  return _notif_safeString_(value) === '';
}
/**
 * Notifica nueva solicitud al responsable resolutor.
 *
 * @param {Object} solicitud Datos solicitud.
 * @param {Object} responsable Responsable.
 * @returns {Object}
 */
function notificarNuevaSolicitudResponsable(
  solicitud,
  responsable
) {

  var s = solicitud || {};
  var r = responsable || {};

  var recipient = _notif_safeString_(
    r.email_responsable
  ).toLowerCase();

  if (_notif_isEmpty_(recipient)) {
    throw new Error(
      'VALIDATION_ERROR: email responsable obligatorio.'
    );
  }

  var webAppUrl = ScriptApp.getService().getUrl();

  var aceptarUrl =
    webAppUrl +
    '?action=resolver' +
    '&id=' + encodeURIComponent(s.id_solicitud) +
    '&decision=ACEPTADA';

  var denegarUrl =
    webAppUrl +
    '?action=resolver' +
    '&id=' + encodeURIComponent(s.id_solicitud) +
    '&decision=DENEGADA';

  var adminUrl =
    webAppUrl +
    '?action=admin' +
    '&id=' + encodeURIComponent(s.id_solicitud);

  var subject =
    '[PERMISOS] Nueva solicitud pendiente';

  var htmlBody =
    '<h2>Nueva solicitud pendiente</h2>' +

    '<p><strong>ID:</strong> ' +
    _notif_safeString_(s.id_solicitud) +
    '</p>' +

    '<p><strong>Profesor/a:</strong> ' +
    _notif_safeString_(s.nombre_profesor) + ' ' +
    _notif_safeString_(s.apellidos_profesor) +
    '</p>' +

    '<p><strong>Permiso:</strong> ' +
    _notif_safeString_(s.tipo_permiso) +
    '</p>' +

    '<p><strong>Fecha inicio:</strong> ' +
    _notif_safeString_(s.fecha_inicio) +
    '</p>' +

    '<p><strong>Fecha fin:</strong> ' +
    _notif_safeString_(s.fecha_fin) +
    '</p>' +

    '<hr>' +

    '<p>' +
    '<a href="' + aceptarUrl + '">' +
    '✅ ACEPTAR</a>' +
    '</p>' +

    '<p>' +
    '<a href="' + denegarUrl + '">' +
    '❌ DENEGAR</a>' +
    '</p>' +

    '<p>' +
    '<a href="' + adminUrl + '">' +
    '🛠 ABRIR PANEL ADMIN</a>' +
    '</p>';

  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    htmlBody: htmlBody,
    body:
      'Nueva solicitud pendiente: ' +
      _notif_safeString_(s.id_solicitud),
    name: 'Sistema Permisos'
  });

  return {
    ok: true,
    data: {
      recipient: recipient,
      subject: subject,
      sentAt: new Date().toISOString()
    }
  };
}