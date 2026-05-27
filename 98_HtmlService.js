/**
 * 98_HtmlService.gs
 * Helpers para Google Apps Script HTMLService.
 * Permite incluir archivos HTML parciales dentro de 100_Index.html.
 */

/**
 * Incluye el contenido de un archivo HTML del proyecto.
 *
 * Uso en HTML:
 * <?!= include('101_App'); ?>
 * <?!= include('102_App.js'); ?>
 * <?!= include('103_App.css'); ?>
 *
 * @param {string} filename Nombre del archivo HTML sin extensión.
 * @returns {string} Contenido HTML del archivo.
 * @throws {Error} VALIDATION_ERROR / EXTERNAL_ERROR
 */
function include(filename) {
  var safeName = String(filename === null || filename === undefined ? '' : filename).trim();

  if (!safeName) {
    throw new Error('VALIDATION_ERROR: filename es obligatorio.');
  }

  try {
    return HtmlService.createHtmlOutputFromFile(safeName).getContent();
  } catch (err) {
    throw new Error(
      'EXTERNAL_ERROR: no se pudo incluir el archivo HTML "' +
      safeName +
      '". ' +
      (err && err.message ? err.message : String(err))
    );
  }
}