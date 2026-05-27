/**
 * 06_Utils_Sheet.gs
 * Utilidades técnicas de Spreadsheet.
 */

/**
 * Devuelve el spreadsheet activo del entorno Apps Script.
 *
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet} Spreadsheet activo.
 * @throws {Error} Si no existe un spreadsheet activo disponible.
 */
function _getSpreadsheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('CONFIG_ERROR: Spreadsheet activo no disponible.');
  }
  return ss;
}

/**
 * Obtiene una hoja por nombre o lanza error si no existe.
 *
 * @param {string} sheetName Nombre exacto de la hoja.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} Hoja encontrada.
 * @throws {Error} Si la hoja no existe.
 */
function getSheetOrThrow(sheetName) {
  const ss = _getSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('NOT_FOUND: Hoja no encontrada -> ' + sheetName);
  }
  return sheet;
}

/**
 * Devuelve un mapa de cabeceras (columna -> índice 1-based) para una hoja.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Hoja objetivo.
 * @returns {Object<string, number>} Mapa de cabeceras con índices de columna (1-based).
 * @throws {Error} Si la hoja no tiene cabecera.
 */
function getHeaderMap(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) {
    throw new Error('INTEGRITY_ERROR: Hoja sin cabecera -> ' + sheet.getName());
  }
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};
  headers.forEach(function(h, i) {
    const key = String(h || '').trim();
    if (key) {
      map[key] = i + 1;
    }
  });
  return map;
}

/**
 * Convierte una fila (array de valores) a objeto según el mapa de cabeceras.
 *
 * @param {Array<*>} rowValues Valores de fila.
 * @param {Object<string, number>} headerMap Mapa de cabeceras con índices 1-based.
 * @returns {Object<string, *>} Objeto con claves de cabecera y valores de fila.
 */
function rowToObject(rowValues, headerMap) {
  const obj = {};
  Object.keys(headerMap).forEach(function(key) {
    obj[key] = rowValues[headerMap[key] - 1];
  });
  return obj;
}

/**
 * Convierte un objeto a array de fila respetando el orden de cabeceras recibido.
 *
 * @param {Object<string, *>} obj Objeto origen.
 * @param {string[]} headerOrder Orden de columnas.
 * @returns {Array<*>} Fila ordenada por cabeceras.
 */
function objectToRow(obj, headerOrder) {
  return headerOrder.map(function(col) {
    return Object.prototype.hasOwnProperty.call(obj, col) ? obj[col] : '';
  });
}

/**
 * Añade una fila al final de la hoja a partir de un objeto.
 *
 * @param {string} sheetName Nombre de la hoja destino.
 * @param {Object<string, *>} obj Objeto con datos a insertar.
 * @returns {number} Índice de fila (1-based) donde se insertó.
 * @throws {Error} Si la hoja no existe o la cabecera es inválida.
 */
function appendObject(sheetName, obj) {
  const sheet = getSheetOrThrow(sheetName);
  const headerMap = getHeaderMap(sheet);
  const headerOrder = Object.keys(headerMap).sort(function(a, b) {
    return headerMap[a] - headerMap[b];
  });
  const row = objectToRow(obj, headerOrder);
  sheet.appendRow(row);
  return sheet.getLastRow();
}

/**
 * Actualiza una fila existente por índice con un patch de campos.
 *
 * @param {string} sheetName Nombre de la hoja destino.
 * @param {number} rowIndex Índice de fila (1-based) a actualizar; debe ser >= 2.
 * @param {Object<string, *>} objPatch Campos y valores a actualizar.
 * @throws {Error} Si el índice es inválido o alguna columna no existe en cabecera.
 */
function updateRowByIndex(sheetName, rowIndex, objPatch) {
  const sheet = getSheetOrThrow(sheetName);
  if (rowIndex < 2) {
    throw new Error('VALIDATION_ERROR: rowIndex inválido -> ' + rowIndex);
  }
  const headerMap = getHeaderMap(sheet);
  Object.keys(objPatch || {}).forEach(function(key) {
    if (!Object.prototype.hasOwnProperty.call(headerMap, key)) {
      throw new Error('CONFIG_ERROR: Columna no existe en hoja ' + sheetName + ' -> ' + key);
    }
    sheet.getRange(rowIndex, headerMap[key]).setValue(objPatch[key]);
  });
}