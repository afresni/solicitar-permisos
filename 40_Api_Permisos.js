/**
 * 40_Api_Permisos.gs
 * API de profesor para:
 * - crear solicitud
 * - consultar mis solicitudes
 * - obtener catálogo de permisos activos
 *
 * Sin acceso directo a Sheets.
 * Sin router/endpoints HTTP.
 */

/**
 * Crea una solicitud para el actor actual/provisto.
 *
 * @param {*} request Request de entrada.
 * @returns {{ok: boolean, data?: any, error?: {code: string, message: string, details?: any}}}
 */
function apiCrearSolicitud(request) {
  try {
    var req = _apiPermisos_parseRequest_(request);
    var actorEmail = _apiPermisos_getActorEmail_(req);
    var payload = req.payload || {};

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('VALIDATION_ERROR: payload inválido.');
    }

    var result = crearSolicitud(payload, actorEmail);
    return _apiPermisos_buildResponse_(true, result, null);
  } catch (err) {
    return _apiPermisos_buildResponse_(false, null, _apiPermisos_handleError_(err));
  }
}

/**
 * Devuelve las solicitudes del actor actual/provisto.
 *
 * @param {*} request Request de entrada.
 * @returns {{ok: boolean, data?: any, error?: {code: string, message: string, details?: any}}}
 */
function apiGetMisSolicitudes(request) {
  try {
    var req = _apiPermisos_parseRequest_(request);
    var actorEmail = _apiPermisos_getActorEmail_(req);

    var data = listByProfesor(actorEmail);
    return _apiPermisos_buildResponse_(true, data, null);
  } catch (err) {
    return _apiPermisos_buildResponse_(false, null, _apiPermisos_handleError_(err));
  }
}

/**
 * Devuelve catálogo de permisos activos.
 *
 * @param {*} request Request de entrada no usado.
 * @returns {{ok: boolean, data?: any, error?: {code: string, message: string, details?: any}}}
 */
function apiGetCatalogoPermisos(request) {
  try {
    void request;

    var data = listActivos();
    return _apiPermisos_buildResponse_(true, data, null);
  } catch (err) {
    return _apiPermisos_buildResponse_(false, null, _apiPermisos_handleError_(err));
  }
}

/**
 * Parsea request en objeto consistente.
 *
 * @param {*} request Entrada API.
 * @returns {{actorEmail?: string, payload?: Object}} Request normalizado.
 * @private
 */
function _apiPermisos_parseRequest_(request) {
  if (request === null || request === undefined) {
    return {};
  }

  if (typeof request === 'string') {
    try {
      var parsed = JSON.parse(request);
      return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
    } catch (e) {
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
 * @param {boolean} ok Estado de operación.
 * @param {*} data Payload de éxito.
 * @param {{code:string,message:string,details?:any}=} error Objeto de error normalizado.
 * @returns {{ok:boolean,data?:any,error?:{code:string,message:string,details?:any}}}
 * @private
 */
function _apiPermisos_buildResponse_(ok, data, error) {
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
 * Normaliza un error a formato API estándar y código funcional conocido.
 *
 * @param {*} err Error de entrada.
 * @returns {{code:string,message:string,details?:any}} Error normalizado.
 * @private
 */
function _apiPermisos_handleError_(err) {
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

  var match = rawMessage.match(/^([A-Z_]+)\s*:\s*(.*)$/);
  if (match) {
    var candidate = match[1];
    if (allowedCodes[candidate]) {
      code = candidate;
      message = match[2] || rawMessage;
    }
  }

  var errorObj = {
    code: code,
    message: message
  };

  var flags = getFeatureFlags ? getFeatureFlags() : {};
  if (
    flags &&
    flags.ENABLE_DEBUG_STACK === true &&
    err &&
    err.stack
  ) {
    errorObj.details = {
      stack: String(err.stack)
    };
  }

  return errorObj;
}

/**
 * Obtiene actor email:
 * - request.actorEmail si viene
 * - si no, sesión con getCurrentUserEmailOrThrow()
 *
 * @param {{actorEmail?:string}=} req Request normalizado.
 * @returns {string} Email actor normalizado.
 * @throws {Error} AUTH_REQUIRED / VALIDATION_ERROR / FORBIDDEN / CONFIG_ERROR
 * @private
 */
function _apiPermisos_getActorEmail_(req) {
  var actorFromReq = req && req.actorEmail
    ? String(req.actorEmail).trim().toLowerCase()
    : '';

  if (actorFromReq) {
    assertInstitutionalUser(actorFromReq);
    return actorFromReq;
  }

  var actorFromSession = getCurrentUserEmailOrThrow();
  var normalized = String(actorFromSession === null || actorFromSession === undefined ? '' : actorFromSession)
    .trim()
    .toLowerCase();

  if (!normalized) {
    throw new Error('AUTH_REQUIRED: actor no disponible.');
  }

  assertInstitutionalUser(normalized);

  return normalized;
}