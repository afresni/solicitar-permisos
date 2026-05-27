/**
 * 41_Api_AdminPermisos.gs
 * API administrativa para:
 * - resolver solicitudes
 * - consultar solicitudes pendientes
 * - consultar detalle de una solicitud
 *
 * Sin acceso directo a Sheets.
 * Sin router/endpoints HTTP.
 */

/**
 * Resuelve una solicitud.
 *
 * @param {*} request Request de entrada.
 * @returns {{ok: boolean, data?: any, error?: {code: string, message: string, details?: any}}}
 */
function apiResolverSolicitud(request) {
  try {
    var req = _apiAdmin_parseRequest_(request);
    var payload = _apiAdmin_requirePayloadObject_(req);
    var actorEmail = _apiAdmin_getActorEmail_(req);

    if (!payload.idSolicitud) {
      throw new Error('VALIDATION_ERROR: idSolicitud es obligatorio.');
    }

    if (!payload.decision) {
      throw new Error('VALIDATION_ERROR: decision es obligatorio.');
    }

    if (
      payload.datosResolucion === undefined ||
      payload.datosResolucion === null ||
      typeof payload.datosResolucion !== 'object' ||
      Array.isArray(payload.datosResolucion)
    ) {
      throw new Error('VALIDATION_ERROR: datosResolucion es obligatorio y debe ser objeto.');
    }

    var result = resolverSolicitud(
      String(payload.idSolicitud),
      String(payload.decision),
      payload.datosResolucion,
      actorEmail
    );

    return _apiAdmin_buildResponse_(true, result, null);
  } catch (err) {
    return _apiAdmin_buildResponse_(false, null, _apiAdmin_handleError_(err));
  }
}

/**
 * Obtiene todas las solicitudes en estado PENDIENTE.
 *
 * @param {*} request Request de entrada.
 * @returns {{ok: boolean, data?: any, error?: {code: string, message: string, details?: any}}}
 */
function apiGetSolicitudesPendientes(request) {
  try {
    var req = _apiAdmin_parseRequest_(request);
    var actorEmail = _apiAdmin_getActorEmail_(req);

    assertCanResolve(actorEmail, 'TODAS', 'TODAS');

    var pendientes = listByEstado('PENDIENTE');
    return _apiAdmin_buildResponse_(true, pendientes, null);
  } catch (err) {
    return _apiAdmin_buildResponse_(false, null, _apiAdmin_handleError_(err));
  }
}

/**
 * Obtiene detalle de una solicitud por id.
 *
 * @param {*} request Request de entrada.
 * @returns {{ok: boolean, data?: any, error?: {code: string, message: string, details?: any}}}
 */
function apiGetDetalleSolicitud(request) {
  try {
    var req = _apiAdmin_parseRequest_(request);
    var payload = _apiAdmin_requirePayloadObject_(req);
    var actorEmail = _apiAdmin_getActorEmail_(req);

    var idSolicitud = String(payload.idSolicitud === null || payload.idSolicitud === undefined ? '' : payload.idSolicitud).trim();

    if (!idSolicitud) {
      throw new Error('VALIDATION_ERROR: idSolicitud es obligatorio.');
    }

    var solicitud = findById(idSolicitud);

    if (!solicitud) {
      throw new Error('NOT_FOUND: solicitud no encontrada.');
    }

    assertCanResolve(actorEmail, solicitud.etapa, solicitud.categoria_permiso);

    return _apiAdmin_buildResponse_(true, solicitud, null);
  } catch (err) {
    return _apiAdmin_buildResponse_(false, null, _apiAdmin_handleError_(err));
  }
}

/**
 * Parsea request a objeto consistente.
 *
 * @param {*} request Entrada API.
 * @returns {Object} Request normalizado.
 * @private
 */
function _apiAdmin_parseRequest_(request) {
  if (request === null || request === undefined) {
    return {};
  }

  if (typeof request === 'string') {
    try {
      var parsed = JSON.parse(request);

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('VALIDATION_ERROR: request JSON inválido.');
      }

      return parsed;
    } catch (e) {
      if (String(e.message || '').indexOf('VALIDATION_ERROR:') === 0) {
        throw e;
      }

      throw new Error('VALIDATION_ERROR: request JSON inválido.');
    }
  }

  if (typeof request === 'object' && !Array.isArray(request)) {
    return request;
  }

  throw new Error('VALIDATION_ERROR: formato de request inválido.');
}

/**
 * Construye respuesta API estándar.
 *
 * @param {boolean} ok Estado de éxito.
 * @param {*} data Datos de respuesta.
 * @param {{code:string,message:string,details?:any}=} error Error normalizado.
 * @returns {{ok:boolean,data?:any,error?:{code:string,message:string,details?:any}}}
 * @private
 */
function _apiAdmin_buildResponse_(ok, data, error) {
  if (ok) {
    return {
      ok: true,
      data: data
    };
  }

  return {
    ok: false,
    error: error || {
      code: 'UNKNOWN_ERROR',
      message: 'Error desconocido.'
    }
  };
}

/**
 * Normaliza errores a formato API con códigos permitidos.
 *
 * @param {*} err Error capturado.
 * @returns {{code:string,message:string,details?:any}} Error normalizado.
 * @private
 */
function _apiAdmin_handleError_(err) {
  var allowedCodes = {
    AUTH_REQUIRED: true,
    FORBIDDEN: true,
    VALIDATION_ERROR: true,
    NOT_FOUND: true,
    CONFLICT: true,
    CONFIG_ERROR: true,
    INTEGRITY_ERROR: true,
    EXTERNAL_ERROR: true,
    UNKNOWN_ERROR: true
  };

  var rawMessage = '';

  if (typeof err === 'string') {
    rawMessage = err;
  } else if (err && err.message) {
    rawMessage = String(err.message);
  } else {
    rawMessage = 'UNKNOWN_ERROR: Error desconocido.';
  }

  var code = 'UNKNOWN_ERROR';
  var message = rawMessage;

  var m = rawMessage.match(/^([A-Z_]+)\s*:\s*(.*)$/);

  if (m) {
    var candidate = m[1];

    if (allowedCodes[candidate]) {
      code = candidate;
      message = m[2] || rawMessage;
    }
  }

  var errorObj = {
    code: code,
    message: message
  };

  var flags = (typeof getFeatureFlags === 'function') ? getFeatureFlags() : {};
  var debugStack = !!(flags && flags.ENABLE_DEBUG_STACK === true);

  if (debugStack && err && err.stack) {
    errorObj.details = {
      stack: String(err.stack)
    };
  }

  return errorObj;
}

/**
 * Obtiene actor desde request.actorEmail o sesión.
 * Siempre valida actor institucional explícitamente.
 *
 * @param {Object} req Request normalizado.
 * @returns {string} Email actor normalizado.
 * @throws {Error} AUTH_REQUIRED / FORBIDDEN / VALIDATION_ERROR
 * @private
 */
function _apiAdmin_getActorEmail_(req) {
  var actorFromReq = '';

  if (req && req.actorEmail !== undefined && req.actorEmail !== null) {
    actorFromReq = String(req.actorEmail).trim().toLowerCase();
  }

  var actor = actorFromReq || String(getCurrentUserEmailOrThrow()).trim().toLowerCase();

  if (!actor) {
    throw new Error('AUTH_REQUIRED: actor no disponible.');
  }

  assertInstitutionalUser(actor);

  return actor;
}

/**
 * Exige que req.payload sea objeto.
 * Si no existe, usa req como payload.
 *
 * @param {Object} req Request normalizado.
 * @returns {Object} Payload objeto.
 * @throws {Error} VALIDATION_ERROR
 * @private
 */
function _apiAdmin_requirePayloadObject_(req) {
  if (!req || typeof req !== 'object' || Array.isArray(req)) {
    throw new Error('VALIDATION_ERROR: request inválido.');
  }

  if (req.payload === undefined) {
    return req;
  }

  if (req.payload === null || typeof req.payload !== 'object' || Array.isArray(req.payload)) {
    throw new Error('VALIDATION_ERROR: payload debe ser objeto.');
  }

  return req.payload;
}