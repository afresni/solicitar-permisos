/**
 * 22_Service_ValidacionSolicitud.gs
 * Servicio único de validación funcional de solicitudes y resoluciones.
 * No accede a Sheets. No usa repositorios.
 */

/**
 * Valida una nueva solicitud funcionalmente.
 * Nunca lanza excepción por errores funcionales: devuelve { ok, errors }.
 *
 * @param {Object} input Datos de solicitud.
 * @param {Object} permisoConfig Configuración del permiso.
 * @returns {{ok: boolean, errors: string[]}} Resultado de validación.
 */
function validateNuevaSolicitud(input, permisoConfig) {
  var errors = [];
  var data = input || {};
  void permisoConfig;

  _validSolicitud_requireFields_(data, [
    'categoria_permiso',
    'permiso_key',
    'tipo_permiso',
    'articulo_referencia_permiso',
    'tipo_computo',
    'fecha_inicio',
    'fecha_fin',
    'justificante_adjunto'
  ], errors);

  var tipoComputo = _validSolicitud_normalizeToken_(data.tipo_computo);

  if (tipoComputo && getTiposComputo().indexOf(tipoComputo) < 0) {
    _validSolicitud_pushError_(errors, 'tipo_computo inválido.');
  }

  var justificante = _validSolicitud_normalizeToken_(data.justificante_adjunto);

  if (justificante && getValoresSiNo().indexOf(justificante) < 0) {
    _validSolicitud_pushError_(errors, 'justificante_adjunto debe ser SI o NO.');
  }

  _validSolicitud_validateFechas_(data.fecha_inicio, data.fecha_fin, errors);
  _validSolicitud_validateHoras_(data.hora_inicio, data.hora_fin, errors, tipoComputo);
  _validSolicitud_validateComputoFields_(data, tipoComputo, errors);

  return {
    ok: errors.length === 0,
    errors: errors
  };
}

/**
 * Valida datos de resolución funcionalmente.
 * Nunca lanza excepción por errores funcionales: devuelve { ok, errors }.
 *
 * @param {Object} inputResolucion Datos de resolución.
 * @param {Object} solicitudActual Solicitud actual.
 * @param {Object} permisoConfig Configuración del permiso.
 * @returns {{ok: boolean, errors: string[]}} Resultado de validación.
 */
function validateResolucion(inputResolucion, solicitudActual, permisoConfig) {
  var errors = [];
  var data = inputResolucion || {};
  var actual = solicitudActual || {};
  void permisoConfig;

  var decision = _validSolicitud_normalizeToken_(data.estado_resolucion);

  if (decision !== 'ACEPTADA' && decision !== 'DENEGADA') {
    _validSolicitud_pushError_(errors, 'La decisión debe ser ACEPTADA o DENEGADA.');
  }

  var fromEstado = _validSolicitud_normalizeToken_(actual.estado);
  var transition = validateEstadoTransition(fromEstado, decision);

  if (!transition.ok) {
    _validSolicitud_pushError_(errors, transition.error || 'Transición de estado inválida.');
  }

  var checkAceptada = _validSolicitud_safeTrim_(data.check_aceptada);
  var checkDenegada = _validSolicitud_safeTrim_(data.check_denegada);

  if (decision === 'ACEPTADA') {
    if (checkAceptada !== 'X') {
      _validSolicitud_pushError_(errors, "En ACEPTADA, check_aceptada debe ser 'X'.");
    }
    if (checkDenegada !== '') {
      _validSolicitud_pushError_(errors, 'En ACEPTADA, check_denegada debe estar vacío.');
    }
  }

  if (decision === 'DENEGADA') {
    if (checkDenegada !== 'X') {
      _validSolicitud_pushError_(errors, "En DENEGADA, check_denegada debe ser 'X'.");
    }
    if (checkAceptada !== '') {
      _validSolicitud_pushError_(errors, 'En DENEGADA, check_aceptada debe estar vacío.');
    }
  }

  if (decision === 'ACEPTADA') {
    var tipoComputo = _validSolicitud_normalizeToken_(actual.tipo_computo);
    _validSolicitud_validateAutorizadosPorComputo_(data, tipoComputo, errors);
  }

  if (!_validSolicitud_isEmpty_(data.fecha_resolucion)) {
    try {
      toDate(data.fecha_resolucion);
    } catch (e) {
      _validSolicitud_pushError_(errors, 'fecha_resolucion inválida.');
    }
  }

  return {
    ok: errors.length === 0,
    errors: errors
  };
}

/**
 * Valida transición de estado para V1.
 *
 * Reglas:
 * - PENDIENTE -> ACEPTADA OK
 * - PENDIENTE -> DENEGADA OK
 * - no permite resolver dos veces
 * - no permite volver a PENDIENTE
 *
 * @param {string} fromEstado Estado origen.
 * @param {string} toEstado Estado destino.
 * @returns {{ok: boolean, error?: string}} Resultado transición.
 */
function validateEstadoTransition(fromEstado, toEstado) {
  var from = _validSolicitud_normalizeToken_(fromEstado);
  var to = _validSolicitud_normalizeToken_(toEstado);

  var fromValid = validateEstadoV1(from);
  if (!fromValid.ok) {
    return { ok: false, error: 'Estado origen inválido: ' + from };
  }

  if (to === 'PENDIENTE') {
    return { ok: false, error: 'No se permite volver a PENDIENTE.' };
  }

  if (to !== 'ACEPTADA' && to !== 'DENEGADA') {
    return { ok: false, error: 'Estado destino inválido para resolución: ' + to };
  }

  if (from !== 'PENDIENTE') {
    return { ok: false, error: 'No se permite resolver dos veces ni cambiar estado resuelto.' };
  }

  return { ok: true };
}

/**
 * Verifica campos obligatorios y agrega errores por faltantes.
 *
 * @param {Object} source Objeto fuente.
 * @param {string[]} fields Campos obligatorios.
 * @param {string[]} errors Acumulador de errores.
 * @private
 */
function _validSolicitud_requireFields_(source, fields, errors) {
  var result = requireFields(source || {}, fields || []);

  if (!result.ok) {
    result.missing.forEach(function(field) {
      _validSolicitud_pushError_(errors, 'Campo obligatorio faltante: ' + field);
    });
  }
}

/**
 * Valida reglas por tipo de cómputo para nueva solicitud.
 *
 * @param {Object} data Solicitud.
 * @param {string} tipoComputo Tipo de cómputo.
 * @param {string[]} errors Acumulador de errores.
 * @private
 */
function _validSolicitud_validateComputoFields_(data, tipoComputo, errors) {
  if (!tipoComputo) return;

  if (tipoComputo === 'DIA_COMPLETO') {
    _validSolicitud_validateRequiredPositiveNumber_(
      data.num_dias_solicitados,
      'num_dias_solicitados',
      1,
      errors
    );

    if (!_validSolicitud_isEmpty_(data.num_dias_solicitados)) {
      var diasD = Number(data.num_dias_solicitados);
      if (Number.isFinite(diasD) && Math.floor(diasD) !== diasD) {
        _validSolicitud_pushError_(errors, 'num_dias_solicitados inválido: debe ser un número entero >= 1.');
      }
    }
    return;
  }

  if (tipoComputo === 'HORAS') {
    if (_validSolicitud_isEmpty_(data.hora_inicio)) {
      _validSolicitud_pushError_(errors, 'hora_inicio es obligatorio para HORAS.');
    }

    if (_validSolicitud_isEmpty_(data.hora_fin)) {
      _validSolicitud_pushError_(errors, 'hora_fin es obligatorio para HORAS.');
    }

    _validSolicitud_validateRequiredPositiveNumber_(
      data.num_horas_solicitadas,
      'num_horas_solicitadas',
      1,
      errors
    );

    if (!_validSolicitud_isEmpty_(data.num_horas_solicitadas)) {
      var horasH = Number(data.num_horas_solicitadas);
      if (Number.isFinite(horasH) && Math.floor(horasH) !== horasH) {
        _validSolicitud_pushError_(errors, 'num_horas_solicitadas inválido: debe ser un número entero >= 1.');
      }
    }
    return;
  }

  if (tipoComputo === 'MIXTO') {
    _validSolicitud_validateRequiredPositiveNumber_(
      data.num_dias_solicitados,
      'num_dias_solicitados',
      1,
      errors
    );

    if (!_validSolicitud_isEmpty_(data.num_dias_solicitados)) {
      var diasM = Number(data.num_dias_solicitados);
      if (Number.isFinite(diasM) && Math.floor(diasM) !== diasM) {
        _validSolicitud_pushError_(errors, 'num_dias_solicitados inválido: debe ser un número entero >= 1.');
      }
    }

    if (_validSolicitud_isEmpty_(data.hora_inicio)) {
      _validSolicitud_pushError_(errors, 'hora_inicio es obligatorio para MIXTO.');
    }

    if (_validSolicitud_isEmpty_(data.hora_fin)) {
      _validSolicitud_pushError_(errors, 'hora_fin es obligatorio para MIXTO.');
    }

    _validSolicitud_validateRequiredPositiveNumber_(
      data.num_horas_solicitadas,
      'num_horas_solicitadas',
      1,
      errors
    );

    if (!_validSolicitud_isEmpty_(data.num_horas_solicitadas)) {
      var horasM = Number(data.num_horas_solicitadas);
      if (Number.isFinite(horasM) && Math.floor(horasM) !== horasM) {
        _validSolicitud_pushError_(errors, 'num_horas_solicitadas inválido: debe ser un número entero >= 1.');
      }
    }
  }
}

/**
 * Valida campos autorizados según tipo de cómputo.
 *
 * @param {Object} data Datos de resolución.
 * @param {string} tipoComputo Tipo de cómputo.
 * @param {string[]} errors Acumulador de errores.
 * @private
 */
function _validSolicitud_validateAutorizadosPorComputo_(data, tipoComputo, errors) {
  if (tipoComputo === 'DIA_COMPLETO') {
    _validSolicitud_validateRequiredPositiveNumber_(
      data.dias_autorizados,
      'dias_autorizados',
      1,
      errors
    );

    if (!_validSolicitud_isEmpty_(data.dias_autorizados)) {
      var diasD = Number(data.dias_autorizados);
      if (Number.isFinite(diasD) && Math.floor(diasD) !== diasD) {
        _validSolicitud_pushError_(errors, 'dias_autorizados inválido: debe ser un número entero >= 1.');
      }
    }
    return;
  }

  if (tipoComputo === 'HORAS') {
    _validSolicitud_validateRequiredPositiveNumber_(
      data.horas_autorizadas,
      'horas_autorizadas',
      1,
      errors
    );

    if (!_validSolicitud_isEmpty_(data.horas_autorizadas)) {
      var horasH = Number(data.horas_autorizadas);
      if (Number.isFinite(horasH) && Math.floor(horasH) !== horasH) {
        _validSolicitud_pushError_(errors, 'horas_autorizadas inválido: debe ser un número entero >= 1.');
      }
    }
    return;
  }

  if (tipoComputo === 'MIXTO') {
    _validSolicitud_validateRequiredPositiveNumber_(
      data.dias_autorizados,
      'dias_autorizados',
      1,
      errors
    );

    if (!_validSolicitud_isEmpty_(data.dias_autorizados)) {
      var diasM = Number(data.dias_autorizados);
      if (Number.isFinite(diasM) && Math.floor(diasM) !== diasM) {
        _validSolicitud_pushError_(errors, 'dias_autorizados inválido: debe ser un número entero >= 1.');
      }
    }

    _validSolicitud_validateRequiredPositiveNumber_(
      data.horas_autorizadas,
      'horas_autorizadas',
      1,
      errors
    );

    if (!_validSolicitud_isEmpty_(data.horas_autorizadas)) {
      var horasM = Number(data.horas_autorizadas);
      if (Number.isFinite(horasM) && Math.floor(horasM) !== horasM) {
        _validSolicitud_pushError_(errors, 'horas_autorizadas inválido: debe ser un número entero >= 1.');
      }
    }
    return;
  }

  _validSolicitud_pushError_(errors, 'tipo_computo de solicitud actual inválido para resolución.');
}

/**
 * Valida número obligatorio y positivo.
 *
 * @param {*} value Valor a validar.
 * @param {string} fieldName Nombre del campo.
 * @param {number} min Valor mínimo permitido.
 * @param {string[]} errors Acumulador de errores.
 * @private
 */
function _validSolicitud_validateRequiredPositiveNumber_(value, fieldName, min, errors) {
  if (_validSolicitud_isEmpty_(value)) {
    _validSolicitud_pushError_(errors, fieldName + ' es obligatorio.');
    return;
  }

  var result = validateNumberRange(value, min, null);

  if (!result.ok) {
    _validSolicitud_pushError_(errors, fieldName + ' inválido: ' + result.error);
  }
}

/**
 * Valida fechas de solicitud.
 *
 * @param {*} fechaInicio Fecha inicio.
 * @param {*} fechaFin Fecha fin.
 * @param {string[]} errors Acumulador de errores.
 * @private
 */
function _validSolicitud_validateFechas_(fechaInicio, fechaFin, errors) {
  if (_validSolicitud_isEmpty_(fechaInicio) || _validSolicitud_isEmpty_(fechaFin)) {
    return;
  }

  try {
    toDate(fechaInicio);
  } catch (e1) {
    _validSolicitud_pushError_(errors, 'fecha_inicio inválida.');
  }

  try {
    toDate(fechaFin);
  } catch (e2) {
    _validSolicitud_pushError_(errors, 'fecha_fin inválida.');
  }

  try {
    if (!isBeforeOrEqual(fechaInicio, fechaFin)) {
      _validSolicitud_pushError_(errors, 'fecha_inicio debe ser menor o igual que fecha_fin.');
    }
  } catch (e3) {
    // Ya reportado por parseo inválido.
  }
}

/**
 * Valida coherencia básica de horas.
 *
 * @param {*} horaInicio Hora inicio.
 * @param {*} horaFin Hora fin.
 * @param {string[]} errors Acumulador de errores.
 * @param {string} tipoComputo Tipo de cómputo.
 * @private
 */
function _validSolicitud_validateHoras_(horaInicio, horaFin, errors, tipoComputo) {
  var needsHours = tipoComputo === 'HORAS' || tipoComputo === 'MIXTO';

  if (!needsHours) return;

  if (_validSolicitud_isEmpty_(horaInicio) || _validSolicitud_isEmpty_(horaFin)) {
    return;
  }

  var start = String(horaInicio).trim();
  var end = String(horaFin).trim();
  var hhmm = /^([01]\d|2[0-3]):([0-5]\d)$/;

  if (!hhmm.test(start)) {
    _validSolicitud_pushError_(errors, 'hora_inicio inválida (formato esperado HH:mm).');
  }

  if (!hhmm.test(end)) {
    _validSolicitud_pushError_(errors, 'hora_fin inválida (formato esperado HH:mm).');
  }

  if (hhmm.test(start) && hhmm.test(end)) {
    var sParts = start.split(':');
    var eParts = end.split(':');
    var sMin = Number(sParts[0]) * 60 + Number(sParts[1]);
    var eMin = Number(eParts[0]) * 60 + Number(eParts[1]);

    if (sMin >= eMin) {
      _validSolicitud_pushError_(errors, 'hora_inicio debe ser menor que hora_fin.');
    }
  }
}

/**
 * Agrega error al acumulador evitando duplicados.
 *
 * @param {string[]} errors Acumulador de errores.
 * @param {string} message Mensaje de error.
 * @private
 */
function _validSolicitud_pushError_(errors, message) {
  var msg = String(message || 'Error de validación.');

  if (errors.indexOf(msg) < 0) {
    errors.push(msg);
  }
}

/**
 * Comprueba si un valor se considera vacío.
 *
 * @param {*} value Valor a evaluar.
 * @returns {boolean} true si está vacío.
 * @private
 */
function _validSolicitud_isEmpty_(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

/**
 * Normaliza tokens técnicos a mayúsculas.
 *
 * @param {*} value Valor a normalizar.
 * @returns {string} Token normalizado.
 * @private
 */
function _validSolicitud_normalizeToken_(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .toUpperCase();
}

/**
 * Trim seguro sin cambiar mayúsculas/minúsculas.
 *
 * @param {*} value Valor a normalizar.
 * @returns {string} Texto normalizado.
 * @private
 */
function _validSolicitud_safeTrim_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}