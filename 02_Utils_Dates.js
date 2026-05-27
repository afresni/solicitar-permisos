/**
 * 02_Utils_Dates.gs
 * Utilidades de fechas para V1.
 */

/**
 * Convierte distintos formatos de entrada a un objeto Date válido.
 * Soporta:
 * - Date válido
 * - timestamp numérico (ms)
 * - string en formato dd/MM/yyyy (parseo explícito y seguro)
 * - string en formato yyyy-MM-dd (parseo explícito y seguro)
 * - string parseable por Date solo como último recurso
 *
 * @param {*} value Valor de fecha a convertir.
 * @returns {Date} Fecha válida.
 * @throws {Error} Si la fecha es inválida o vacía.
 */
function toDate(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return new Date(value.getTime());
  }

  if (typeof value === 'number') {
    const fromNumber = new Date(value);
    if (!isNaN(fromNumber.getTime())) return fromNumber;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error('VALIDATION_ERROR: Fecha vacía.');
    }

    // Formato seguro explícito: dd/MM/yyyy
    var matchEsDate = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (matchEsDate) {
      var dd = Number(matchEsDate[1]);
      var mm = Number(matchEsDate[2]);
      var yyyy = Number(matchEsDate[3]);

      var dEs = new Date(yyyy, mm - 1, dd);
      if (
        !isNaN(dEs.getTime()) &&
        dEs.getFullYear() === yyyy &&
        dEs.getMonth() === (mm - 1) &&
        dEs.getDate() === dd
      ) {
        return dEs;
      }
      throw new Error('VALIDATION_ERROR: Fecha inválida -> ' + value);
    }

    // Formato seguro explícito: yyyy-MM-dd
    var matchIsoDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (matchIsoDate) {
      var isoY = Number(matchIsoDate[1]);
      var isoM = Number(matchIsoDate[2]);
      var isoD = Number(matchIsoDate[3]);

      var dIso = new Date(isoY, isoM - 1, isoD);
      if (
        !isNaN(dIso.getTime()) &&
        dIso.getFullYear() === isoY &&
        dIso.getMonth() === (isoM - 1) &&
        dIso.getDate() === isoD
      ) {
        return dIso;
      }
      throw new Error('VALIDATION_ERROR: Fecha inválida -> ' + value);
    }

    // Compatibilidad adicional: string parseable (fallback controlado)
    var parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  throw new Error('VALIDATION_ERROR: Fecha inválida -> ' + value);
}

/**
 * Formatea una fecha según patrón y zona horaria.
 *
 * @param {*} dateValue Fecha de entrada.
 * @param {string=} pattern Patrón de formato (por defecto yyyy-MM-dd).
 * @param {string=} timezone Zona horaria (por defecto configuración del proyecto).
 * @returns {string} Fecha formateada.
 */
function formatDate(dateValue, pattern, timezone) {
  const date = toDate(dateValue);
  const tz = timezone || getProjectConfig().TIMEZONE;
  const fmt = pattern || 'yyyy-MM-dd';
  return Utilities.formatDate(date, tz, fmt);
}

/**
 * Comprueba si la fecha A es menor o igual que la fecha B.
 *
 * @param {*} a Fecha inicial.
 * @param {*} b Fecha final.
 * @returns {boolean} true si A <= B.
 */
function isBeforeOrEqual(a, b) {
  const da = toDate(a).getTime();
  const db = toDate(b).getTime();
  return da <= db;
}

/**
 * Calcula el curso escolar a partir de una fecha.
 * Regla: de septiembre a diciembre => YYYY-(YYYY+1),
 * de enero a agosto => (YYYY-1)-YYYY.
 *
 * @param {*} dateValue Fecha de referencia.
 * @returns {string} Curso escolar en formato YYYY-YYYY.
 */
function getCursoEscolarFromDate(dateValue) {
  const date = toDate(dateValue);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (month >= 9) {
    return year + '-' + (year + 1);
  }
  return (year - 1) + '-' + year;
}

/**
 * Obtiene la fecha equivalente a una semana antes de la fecha indicada.
 *
 * @param {*} fechaInicio Fecha base.
 * @returns {Date} Fecha con 7 días menos.
 */
function getSemanaPrevia(fechaInicio) {
  const start = toDate(fechaInicio);
  const weekBefore = new Date(start.getTime());
  weekBefore.setDate(weekBefore.getDate() - 7);
  return weekBefore;
}

/**
 * Devuelve la fecha/hora actual del sistema.
 *
 * @returns {Date} Fecha actual.
 */
function nowDate() {
  return new Date();
}