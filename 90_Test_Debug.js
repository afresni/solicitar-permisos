/**
 * 90_Test_Debug.gs
 * Funciones manuales de prueba para verificar el backend MVP.
 * No modifica datos reales salvo verificación estructural.
 */

/**
 * Prueba healthcheck del backend.
 *
 * @returns {*} Resultado de healthcheck().
 */
function testHealthcheck() {
  try {
    var result = healthcheck();
    Logger.log('[testHealthcheck] %s', JSON.stringify(result));
    return result;
  } catch (err) {
    var errorResult = {
      ok: false,
      error: {
        message: err && err.message ? err.message : String(err)
      }
    };
    Logger.log('[testHealthcheck][ERROR] %s', JSON.stringify(errorResult));
    return errorResult;
  }
}

/**
 * Prueba consulta de catálogo de permisos activos.
 *
 * @returns {*} Resultado de apiGetCatalogoPermisos().
 */
function testCatalogoPermisos() {
  try {
    var result = apiGetCatalogoPermisos({});
    Logger.log('[testCatalogoPermisos] %s', JSON.stringify(result));
    return result;
  } catch (err) {
    var errorResult = {
      ok: false,
      error: {
        message: err && err.message ? err.message : String(err)
      }
    };
    Logger.log('[testCatalogoPermisos][ERROR] %s', JSON.stringify(errorResult));
    return errorResult;
  }
}

/**
 * Prueba consulta de solicitudes del usuario actual.
 *
 * @returns {*} Resultado de apiGetMisSolicitudes().
 */
function testMisSolicitudes() {
  try {
    var result = apiGetMisSolicitudes({});
    Logger.log('[testMisSolicitudes] %s', JSON.stringify(result));
    return result;
  } catch (err) {
    var errorResult = {
      ok: false,
      error: {
        message: err && err.message ? err.message : String(err)
      }
    };
    Logger.log('[testMisSolicitudes][ERROR] %s', JSON.stringify(errorResult));
    return errorResult;
  }
}

/**
 * Prueba consulta administrativa de solicitudes pendientes.
 *
 * @returns {*} Resultado de apiGetSolicitudesPendientes().
 */
function testSolicitudesPendientes() {
  try {
    var result = apiGetSolicitudesPendientes({});
    Logger.log('[testSolicitudesPendientes] %s', JSON.stringify(result));
    return result;
  } catch (err) {
    var errorResult = {
      ok: false,
      error: {
        message: err && err.message ? err.message : String(err)
      }
    };
    Logger.log('[testSolicitudesPendientes][ERROR] %s', JSON.stringify(errorResult));
    return errorResult;
  }
}

/**
 * Prueba verificación de estructura de hojas.
 * Nota: realiza solo verificación técnica.
 *
 * @returns {*} Resultado de verifySheetsStructure().
 */
function testSetupSheetsVerify() {
  try {
    var result = verifySheetsStructure();
    Logger.log('[testSetupSheetsVerify] %s', JSON.stringify(result));
    return result;
  } catch (err) {
    var errorResult = {
      ok: false,
      error: {
        message: err && err.message ? err.message : String(err)
      }
    };
    Logger.log('[testSetupSheetsVerify][ERROR] %s', JSON.stringify(errorResult));
    return errorResult;
  }
}