/**
 * 91_Test_DataSeed.gs
 * Seed de datos mínimos de prueba para MVP permisos.
 * No borra ni sobrescribe datos existentes.
 */

/**
 * Inserta profesor demo si no existe.
 *
 * @returns {{ok:boolean,created:boolean,data?:Object,message?:string,error?:string}}
 */
function seedProfesorDemo() {
  try {
    if (typeof createProfesor !== 'function') {
      throw new Error('CONFIG_ERROR: función createProfesor no disponible.');
    }

    var email = 'demo@colegiosjm.es';
    var existente = _seedDemo_findProfesorByEmail_(email);

    if (existente) {
      var msgExists = 'Profesor demo ya existe: ' + email;
      Logger.log('[seedProfesorDemo] %s', msgExists);
      return { ok: true, created: false, data: existente, message: msgExists };
    }

    var payload = {
      profesor_id: 'PROF_DEMO',
      email_institucional: email,
      nombre: 'Profesor',
      apellidos: 'Demo',
      dni: '00000000X',
      etapa: 'ESO',
      puesto_trabajo: 'Docente',
      departamento_o_unidad: 'Departamento General',
      activo: true,
      fecha_alta: nowDate(),
      creado_el: nowDate(),
      actualizado_el: nowDate()
    };

    var created = createProfesor(payload);
    Logger.log('[seedProfesorDemo] Profesor demo creado: %s', email);

    return { ok: true, created: true, data: created };
  } catch (err) {
    var e = err && err.message ? err.message : String(err);
    Logger.log('[seedProfesorDemo][ERROR] %s', e);
    return { ok: false, created: false, error: e };
  }
}

/**
 * Inserta permiso demo si no existe.
 *
 * @returns {{ok:boolean,created:boolean,data?:Object,message?:string,error?:string}}
 */
function seedPermisosDemo() {
  try {
    if (typeof createPermiso !== 'function') {
      throw new Error('CONFIG_ERROR: función createPermiso no disponible.');
    }

    var permisoKey = 'DEMO_MEDICO';
    var existente = _seedDemo_findPermisoByKey_(permisoKey);

    if (existente) {
      var msgExists = 'Permiso demo ya existe: ' + permisoKey;
      Logger.log('[seedPermisosDemo] %s', msgExists);
      return { ok: true, created: false, data: existente, message: msgExists };
    }

    var payload = {
      categoria_permiso: 'Permisos retribuidos',
      permiso_key: permisoKey,
      tipo_permiso: 'Visita médica',
      articulo_referencia: 'Art. 41',
      unidad_control: 'HORAS',
      maximo_por_curso: 12,
      requiere_acumulado: 'SI',
      requiere_justificante: 'SI',
      tipo_computo_default: 'HORAS',
      activo: 'SI',
      orden: 999,
      observaciones: 'Registro demo',
      creado_el: nowDate(),
      actualizado_el: nowDate()
    };

    var created = createPermiso(payload);
    Logger.log('[seedPermisosDemo] Permiso demo creado: %s', permisoKey);

    return { ok: true, created: true, data: created };
  } catch (err) {
    var e = err && err.message ? err.message : String(err);
    Logger.log('[seedPermisosDemo][ERROR] %s', e);
    return { ok: false, created: false, error: e };
  }
}

/**
 * Inserta responsable demo si no existe.
 *
 * @returns {{ok:boolean,created:boolean,data?:Object,message?:string,error?:string}}
 */
function seedResponsablesDemo() {
  try {
    if (typeof createResponsable !== 'function') {
      throw new Error('CONFIG_ERROR: función createResponsable no disponible.');
    }

    var email = 'direccion@colegiosjm.es';
    var existente = _seedDemo_findResponsable_(email, 'ESO', 'Permisos retribuidos', 'DIRECCION');

    if (existente) {
      var msgExists = 'Responsable demo ya existe: ' + email;
      Logger.log('[seedResponsablesDemo] %s', msgExists);
      return { ok: true, created: false, data: existente, message: msgExists };
    }

    var payload = {
      responsable_id: 'RESP_DEMO_DIRECCION',
      nombre_responsable: 'Dirección Demo',
      email_responsable: email,
      rol: 'DIRECCION',
      etapa: 'ESO',
      categoria_permiso: 'Permisos retribuidos',
      puede_resolver: 'SI',
      recibe_notificaciones: 'SI',
      recibe_recordatorios: 'SI',
      orden_prioridad: 1,
      activo: 'SI',
      creado_el: nowDate(),
      actualizado_el: nowDate()
    };

    var created = createResponsable(payload);
    Logger.log('[seedResponsablesDemo] Responsable demo creado: %s', email);

    return { ok: true, created: true, data: created };
  } catch (err) {
    var e = err && err.message ? err.message : String(err);
    Logger.log('[seedResponsablesDemo][ERROR] %s', e);
    return { ok: false, created: false, error: e };
  }
}

/**
 * Inserta una solicitud demo PENDIENTE si no existe.
 *
 * @returns {{ok:boolean,created:boolean,data?:Object,message?:string,error?:string}}
 */
function seedSolicitudDemo() {
  try {
    var now = nowDate();
    var curso = getCursoEscolarFromDate(now);
    var seqBase = Number(String(now.getTime()).slice(-6));
    if (!Number.isFinite(seqBase) || seqBase < 1) seqBase = 1;

    var idSolicitud = generateSolicitudId(curso, seqBase);
    var existente = _seedDemo_findSolicitudById_(idSolicitud);

    if (existente) {
      var msgExists = 'Solicitud demo ya existe: ' + idSolicitud;
      Logger.log('[seedSolicitudDemo] %s', msgExists);
      return { ok: true, created: false, data: existente, message: msgExists };
    }

    var fechaInicio = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15);
    var fechaFin = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15);

    var payload = {
      id_solicitud: idSolicitud,
      estado: 'PENDIENTE',
      curso_escolar: curso,
      creado_el: nowDate(),
      actualizado_el: nowDate(),
      creado_por_email: 'demo@colegiosjm.es',
      actualizado_por_email: 'demo@colegiosjm.es',
      email_institucional_profesor: 'demo@colegiosjm.es',
      nombre_profesor: 'Profesor',
      apellidos_profesor: 'Demo',
      dni_profesor: '00000000X',
      etapa: 'ESO',
      puesto_trabajo: 'Docente',
      categoria_permiso: 'Permisos retribuidos',
      permiso_key: 'DEMO_MEDICO',
      tipo_permiso: 'Visita médica',
      articulo_referencia_permiso: 'Art. 41',
      tipo_computo: 'HORAS',
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      hora_inicio: '10:00',
      hora_fin: '11:00',
      num_dias_solicitados: '',
      num_horas_solicitadas: 1,
      observaciones_profesor: 'Solicitud demo para pruebas',
      justificante_adjunto: 'NO',
      estado_resolucion: '',
      check_aceptada: '',
      check_denegada: ''
    };

    var created = createSolicitud(payload);
    Logger.log('[seedSolicitudDemo] Solicitud demo creada: %s', idSolicitud);

    return { ok: true, created: true, data: created };
  } catch (err) {
    var e = err && err.message ? err.message : String(err);
    Logger.log('[seedSolicitudDemo][ERROR] %s', e);
    return { ok: false, created: false, error: e };
  }
}

/**
 * Ejecuta todos los seeds demo en orden.
 *
 * @returns {{
 *   ok:boolean,
 *   data:{
 *     profesor:*,
 *     permiso:*,
 *     responsable:*,
 *     solicitud:*
 *   }
 * }}
 */
function seedAllDemoData() {
  var profesor = seedProfesorDemo();
  var permiso = seedPermisosDemo();
  var responsable = seedResponsablesDemo();
  var solicitud = seedSolicitudDemo();

  var ok = !!(profesor.ok && permiso.ok && responsable.ok && solicitud.ok);

  var result = {
    ok: ok,
    data: {
      profesor: profesor,
      permiso: permiso,
      responsable: responsable,
      solicitud: solicitud
    }
  };

  Logger.log('[seedAllDemoData] %s', JSON.stringify(result));
  return result;
}

/**
 * Busca profesor por email usando utilidades ya disponibles.
 *
 * @param {string} email Email institucional.
 * @returns {Object|null}
 * @private
 */
function _seedDemo_findProfesorByEmail_(email) {
  try {
    if (typeof findByEmail === 'function') {
      return findByEmail(email);
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Busca permiso por key.
 *
 * @param {string} permisoKey Clave de permiso.
 * @returns {Object|null}
 * @private
 */
function _seedDemo_findPermisoByKey_(permisoKey) {
  try {
    if (typeof findByPermisoKey === 'function') {
      return findByPermisoKey(permisoKey);
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Busca responsable por combinación mínima.
 *
 * @param {string} email Email responsable.
 * @param {string} etapa Etapa.
 * @param {string} categoria Categoría.
 * @param {string} rol Rol.
 * @returns {Object|null}
 * @private
 */
function _seedDemo_findResponsable_(email, etapa, categoria, rol) {
  try {
    if (typeof listNotificables !== 'function') return null;
    var list = listNotificables(etapa, categoria) || [];
    for (var i = 0; i < list.length; i++) {
      var r = list[i] || {};
      if (
        String(r.email_responsable || '').toLowerCase().trim() === String(email || '').toLowerCase().trim() &&
        String(r.rol || '').trim() === String(rol || '').trim()
      ) {
        return r;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Busca solicitud por ID.
 *
 * @param {string} idSolicitud ID de solicitud.
 * @returns {Object|null}
 * @private
 */
function _seedDemo_findSolicitudById_(idSolicitud) {
  try {
    if (typeof findById === 'function') {
      return findById(idSolicitud);
    }
    return null;
  } catch (e) {
    return null;
  }
}