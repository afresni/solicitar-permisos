/**
 * 23_Service_AcumuladosPermisos.gs
 * Servicio para calcular acumulados por profesor, permiso y curso escolar.
 * Sin acceso directo a Sheets.
 */

/**
 * Calcula acumulado previo de solicitudes ACEPTADAS por:
 * - email_institucional_profesor
 * - permiso_key
 * - curso_escolar
 *
 * @param {string} email Email institucional del profesor.
 * @param {string} permisoKey Clave de permiso.
 * @param {string} cursoEscolar Curso escolar.
 * @param {string} unidadControl Unidad de control (HORAS | DIAS).
 * @returns {number} Acumulado previo.
 * @throws {Error} VALIDATION_ERROR
 */
function calcularAcumuladoPrevio(email, permisoKey, cursoEscolar, unidadControl) {
  var safeEmail = _acumPermisos_normalizeEmail_(email);
  var safePermisoKey = _acumPermisos_safeToken_(permisoKey).toUpperCase();
  var safeCurso = _acumPermisos_safeToken_(cursoEscolar).toUpperCase();
  var safeUnidad = _acumPermisos_safeToken_(unidadControl).toUpperCase();

  if (!safeEmail) {
    throw new Error('VALIDATION_ERROR: email es obligatorio.');
  }

  if (!safePermisoKey) {
    throw new Error('VALIDATION_ERROR: permisoKey es obligatorio.');
  }

  if (!safeCurso) {
    throw new Error('VALIDATION_ERROR: cursoEscolar es obligatorio.');
  }

  if (safeUnidad !== 'HORAS' && safeUnidad !== 'DIAS') {
    return 0;
  }

  var aceptadas = listAceptadasByProfesorPermisoCurso(
    safeEmail,
    safePermisoKey,
    safeCurso
  ) || [];

  var total = 0;

  aceptadas.forEach(function(item) {
    if (safeUnidad === 'HORAS') {
      total += _acumPermisos_toNumber_(item.horas_autorizadas);
    } else if (safeUnidad === 'DIAS') {
      total += _acumPermisos_toNumber_(item.dias_autorizados);
    }
  });

  return total;
}

/**
 * Simula acumulado posterior tras autorizar una nueva cantidad.
 *
 * @param {*} acumuladoPrevio Acumulado previo.
 * @param {*} solicitudAutorizada Cantidad autorizada a sumar.
 * @returns {number} Acumulado posterior.
 * @throws {Error} VALIDATION_ERROR
 */
function simularAcumuladoPosterior(acumuladoPrevio, solicitudAutorizada) {
  var previo = _acumPermisos_parseRequiredNumber_(
    acumuladoPrevio,
    'acumuladoPrevio'
  );

  var autorizada = _acumPermisos_isEmpty_(solicitudAutorizada)
    ? 0
    : _acumPermisos_parseRequiredNumber_(
        solicitudAutorizada,
        'solicitudAutorizada'
      );

  return previo + autorizada;
}

/**
 * Evalúa si el acumulado posterior supera el máximo permitido por curso.
 *
 * @param {*} maximoPorCurso Máximo permitido por curso.
 * @param {*} acumuladoPosterior Acumulado posterior calculado.
 * @returns {boolean} true si hay exceso.
 */
function evaluarExceso(maximoPorCurso, acumuladoPosterior) {
  if (_acumPermisos_isEmpty_(maximoPorCurso)) {
    return false;
  }

  var max = Number(maximoPorCurso);
  if (!Number.isFinite(max)) {
    return false;
  }

  var post = Number(acumuladoPosterior);
  if (!Number.isFinite(post)) {
    return false;
  }

  return post > max;
}

/**
 * Normaliza token textual.
 *
 * @param {*} value Valor de entrada.
 * @returns {string} Token trim.
 * @private
 */
function _acumPermisos_safeToken_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

/**
 * Normaliza email para comparación técnica.
 *
 * @param {*} value Email de entrada.
 * @returns {string} Email trim + lowercase.
 * @private
 */
function _acumPermisos_normalizeEmail_(value) {
  return _acumPermisos_safeToken_(value).toLowerCase();
}

/**
 * Convierte valor numérico de forma tolerante.
 * Valores vacíos o no numéricos se consideran 0.
 *
 * @param {*} value Valor de entrada.
 * @returns {number} Número normalizado.
 * @private
 */
function _acumPermisos_toNumber_(value) {
  var n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Convierte valor a número requerido.
 *
 * @param {*} value Valor de entrada.
 * @param {string} fieldName Nombre del campo para mensaje de error.
 * @returns {number} Número parseado.
 * @throws {Error} VALIDATION_ERROR
 * @private
 */
function _acumPermisos_parseRequiredNumber_(value, fieldName) {
  var n = Number(value);

  if (!Number.isFinite(n)) {
    throw new Error('VALIDATION_ERROR: ' + fieldName + ' debe ser numérico.');
  }

  return n;
}

/**
 * Comprueba vacío técnico.
 *
 * @param {*} value Valor a evaluar.
 * @returns {boolean} true si vacío.
 * @private
 */
function _acumPermisos_isEmpty_(value) {
  return value === null || value === undefined || String(value).trim() === '';
}