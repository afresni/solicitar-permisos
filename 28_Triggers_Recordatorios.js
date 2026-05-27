/**
 * 28_Triggers_Recordatorios.gs
 * Gestión de triggers y procesamiento automático de recordatorios.
 * Sin HTML, sin endpoints, sin PDF.
 */

/**
 * Procesa recordatorios pendientes y envía los que ya están listos.
 *
 * @returns {{ok:boolean,data:{processed:number,sent:number,failed:number}}}
 */
function procesarRecordatoriosPendientes() {
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);
  } catch (eLock) {
    throw new Error('CONFLICT: no se pudo obtener lock de procesamiento.');
  }

  try {
    var pendientes = listPendientes() || [];
    var now = nowDate();

    var processed = 0;
    var sent = 0;
    var failed = 0;

    pendientes.forEach(function(recordatorio) {
      if (!_triggerRecordatorios_isReadyToSend_(recordatorio, now)) {
        return;
      }

      processed += 1;

      try {
        _triggerRecordatorios_sendOne_(recordatorio);
        _triggerRecordatorios_markAsSent_(recordatorio);
        sent += 1;
      } catch (err) {
        _triggerRecordatorios_markAsError_(recordatorio, err);
        failed += 1;
      }
    });

    return {
      ok: true,
      data: {
        processed: processed,
        sent: sent,
        failed: failed
      }
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (eRelease) {}
  }
}

/**
 * Instala trigger time-driven cada hora.
 * Evita duplicados para procesarRecordatoriosPendientes.
 *
 * @returns {{ok:boolean,data:{created:boolean,triggerCount:number}}}
 */
function instalarTriggerRecordatorios() {
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);
  } catch (eLock) {
    throw new Error('CONFLICT: no se pudo obtener lock de instalación de trigger.');
  }

  try {
    var triggers = ScriptApp.getProjectTriggers();
    var exists = triggers.some(function(t) {
      return t.getHandlerFunction && t.getHandlerFunction() === 'procesarRecordatoriosPendientes';
    });

    if (!exists) {
      ScriptApp.newTrigger('procesarRecordatoriosPendientes')
        .timeBased()
        .everyHours(1)
        .create();
    }

    var updated = ScriptApp.getProjectTriggers().filter(function(t) {
      return t.getHandlerFunction && t.getHandlerFunction() === 'procesarRecordatoriosPendientes';
    });

    return {
      ok: true,
      data: {
        created: !exists,
        triggerCount: updated.length
      }
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (eRelease) {}
  }
}

/**
 * Elimina todos los triggers de procesarRecordatoriosPendientes.
 *
 * @returns {{ok:boolean,data:{deleted:number}}}
 */
function eliminarTriggersRecordatorios() {
  var triggers = ScriptApp.getProjectTriggers();
  var deleted = 0;

  triggers.forEach(function(t) {
    if (t.getHandlerFunction && t.getHandlerFunction() === 'procesarRecordatoriosPendientes') {
      ScriptApp.deleteTrigger(t);
      deleted += 1;
    }
  });

  return {
    ok: true,
    data: {
      deleted: deleted
    }
  };
}

/**
 * Envía un recordatorio individual.
 *
 * @param {Object} recordatorio Recordatorio pendiente.
 * @throws {Error} Si no se puede enviar.
 * @private
 */
function _triggerRecordatorios_sendOne_(recordatorio) {
  var recordatorioId = String(recordatorio.recordatorio_id === null || recordatorio.recordatorio_id === undefined ? '' : recordatorio.recordatorio_id)
    .trim()
    .toUpperCase();

  if (!recordatorioId) {
    throw new Error('VALIDATION_ERROR: recordatorio_id obligatorio.');
  }

  var fresh = findRecordatorioById(recordatorioId);

  if (!fresh) {
    throw new Error('NOT_FOUND: recordatorio no encontrado.');
  }

  if (String(fresh.enviado || '').trim().toUpperCase() === 'SI') {
    throw new Error('CONFLICT: recordatorio ya enviado.');
  }

  var idSolicitud = String(fresh.id_solicitud === null || fresh.id_solicitud === undefined ? '' : fresh.id_solicitud).trim();

  if (!idSolicitud) {
    throw new Error('VALIDATION_ERROR: id_solicitud obligatorio en recordatorio.');
  }

  var solicitud = findById(idSolicitud);

  if (!solicitud) {
    throw new Error('NOT_FOUND: solicitud no encontrada para recordatorio.');
  }

  enviarRecordatorio(fresh, solicitud);
}

/**
 * Determina si un recordatorio está listo para envío.
 *
 * @param {Object} recordatorio Recordatorio.
 * @param {Date} now Fecha/hora actual.
 * @returns {boolean} true si debe enviarse.
 * @private
 */
function _triggerRecordatorios_isReadyToSend_(recordatorio, now) {
  var r = recordatorio || {};
  var activo = String(r.activo === null || r.activo === undefined ? '' : r.activo).trim().toUpperCase();
  var enviado = String(r.enviado === null || r.enviado === undefined ? '' : r.enviado).trim().toUpperCase();

  if (activo !== 'SI') return false;
  if (enviado === 'SI') return false;
  if (!r.fecha_programada) return false;

  try {
    var programada = toDate(r.fecha_programada);
    return programada.getTime() <= now.getTime();
  } catch (e) {
    return false;
  }
}

/**
 * Marca recordatorio como enviado correctamente.
 *
 * @param {Object} recordatorio Recordatorio enviado.
 * @private
 */
function _triggerRecordatorios_markAsSent_(recordatorio) {
  var now = nowDate();

  updateRecordatorio(recordatorio.recordatorio_id, {
    enviado: 'SI',
    fecha_envio: now,
    resultado_envio: 'OK',
    actualizado_el: now
  });
}

/**
 * Marca recordatorio como error de envío.
 *
 * @param {Object} recordatorio Recordatorio con fallo.
 * @param {*} err Error capturado.
 * @private
 */
function _triggerRecordatorios_markAsError_(recordatorio, err) {
  var now = nowDate();
  var prevIntentos = Number(recordatorio.intentos_envio);

  if (!Number.isFinite(prevIntentos)) {
    prevIntentos = 0;
  }

  var msg = '';

  if (err && err.message) {
    msg = String(err.message);
  } else {
    msg = String(err || 'Error desconocido.');
  }

  if (msg.length > 1000) {
    msg = msg.substring(0, 1000);
  }

  updateRecordatorio(recordatorio.recordatorio_id, {
    fecha_envio: now,
    resultado_envio: 'ERROR',
    ultimo_error: msg,
    intentos_envio: prevIntentos + 1,
    actualizado_el: now
  });
}