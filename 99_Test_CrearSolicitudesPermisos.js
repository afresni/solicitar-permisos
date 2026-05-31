/**
 * 99_Test_CrearSolicitudesPermisos.gs
 *
 * Tests manuales de creación de solicitudes de permisos.
 *
 * Objetivo:
 * - Probar DIAS
 * - Probar HORAS
 * - Probar DIAS_HORAS elegido como DIA_COMPLETO
 * - Probar DIAS_HORAS elegido como HORAS
 *
 * IMPORTANTE:
 * Este test crea solicitudes reales en SOLICITUDES_PERMISOS
 * usando crearSolicitud(payload, actorEmail).
 *
 * También puede enviar emails al responsable si el flujo de creación
 * ya tiene activa la notificación.
 */

/**
 * Ejecutar esta función manualmente desde Apps Script.
 *
 * Requisitos:
 * - El usuario que ejecuta debe existir en PROFESSORAT.
 * - Debe estar activo.
 * - CONFIG_PERMISOS debe tener permisos activos con modalidad_solicitud.
 *
 * @returns {Object} Resultado del test.
 */
function test_crearSolicitudesPermisos_99() {
  var actorEmail = Session.getActiveUser().getEmail();

  if (!actorEmail) {
    throw new Error('No se ha podido detectar el email del usuario ejecutor.');
  }

  actorEmail = String(actorEmail).trim().toLowerCase();

  var profesor = findByEmail(actorEmail);
  if (!profesor) {
    throw new Error('El usuario ejecutor no existe en PROFESSORAT: ' + actorEmail);
  }

  if (isActiveByEmail(actorEmail) !== true) {
    throw new Error('El usuario ejecutor está inactivo en PROFESSORAT: ' + actorEmail);
  }

  var catalogo = _test99_getCatalogoPermisosActivo_();

  var permisoDias = _test99_findPermisoByModalidad_(catalogo, 'DIAS');
  var permisoHoras = _test99_findPermisoByModalidad_(catalogo, 'HORAS');
  var permisoFlexible = _test99_findPermisoByModalidad_(catalogo, 'DIAS_HORAS');

  var profesorPayload = _test99_buildProfesorPayload_(profesor, actorEmail);

  var results = [];

  if (permisoDias) {
    results.push(_test99_runCrearSolicitud_(
      'TEST 1 - Permiso DIAS - 1 día',
      _test99_buildPayloadBase_(profesorPayload, permisoDias, {
        tipo_computo: 'DIA_COMPLETO',
        fecha_inicio: _test99_addDaysIso_(14),
        fecha_fin: _test99_addDaysIso_(14),
        num_dias_solicitados: 1
      }),
      actorEmail
    ));

    results.push(_test99_runCrearSolicitud_(
      'TEST 2 - Permiso DIAS - 2 días consecutivos',
      _test99_buildPayloadBase_(profesorPayload, permisoDias, {
        tipo_computo: 'DIA_COMPLETO',
        fecha_inicio: _test99_addDaysIso_(15),
        fecha_fin: _test99_addDaysIso_(16),
        num_dias_solicitados: 2
      }),
      actorEmail
    ));
  } else {
    results.push(_test99_skip_('TEST 1/2 - No se encontró permiso activo con modalidad_solicitud = DIAS'));
  }

  if (permisoHoras) {
    results.push(_test99_runCrearSolicitud_(
      'TEST 3 - Permiso HORAS - 2 horas',
      _test99_buildPayloadBase_(profesorPayload, permisoHoras, {
        tipo_computo: 'HORAS',
        fecha_inicio: _test99_addDaysIso_(17),
        fecha_fin: _test99_addDaysIso_(17),
        hora_inicio: '09:00',
        hora_fin: '11:00',
        num_horas_solicitadas: 2
      }),
      actorEmail
    ));
  } else {
    results.push(_test99_skip_('TEST 3 - No se encontró permiso activo con modalidad_solicitud = HORAS'));
  }

  if (permisoFlexible) {
    results.push(_test99_runCrearSolicitud_(
      'TEST 4 - Permiso DIAS_HORAS elegido como DIA_COMPLETO',
      _test99_buildPayloadBase_(profesorPayload, permisoFlexible, {
        tipo_computo: 'DIA_COMPLETO',
        fecha_inicio: _test99_addDaysIso_(18),
        fecha_fin: _test99_addDaysIso_(18),
        num_dias_solicitados: 1
      }),
      actorEmail
    ));

    results.push(_test99_runCrearSolicitud_(
      'TEST 5 - Permiso DIAS_HORAS elegido como HORAS',
      _test99_buildPayloadBase_(profesorPayload, permisoFlexible, {
        tipo_computo: 'HORAS',
        fecha_inicio: _test99_addDaysIso_(19),
        fecha_fin: _test99_addDaysIso_(19),
        hora_inicio: '10:00',
        hora_fin: '13:00',
        num_horas_solicitadas: 3
      }),
      actorEmail
    ));
  } else {
    results.push(_test99_skip_('TEST 4/5 - No se encontró permiso activo con modalidad_solicitud = DIAS_HORAS'));
  }

  var summary = {
    ok: true,
    actorEmail: actorEmail,
    created: results.filter(function(r) { return r.status === 'CREATED'; }).length,
    skipped: results.filter(function(r) { return r.status === 'SKIPPED'; }).length,
    failed: results.filter(function(r) { return r.status === 'FAILED'; }).length,
    results: results
  };

  Logger.log(JSON.stringify(summary, null, 2));

  return summary;
}

/**
 * Ejecuta una creación de solicitud y captura resultado.
 *
 * @param {string} label Nombre del test.
 * @param {Object} payload Payload de solicitud.
 * @param {string} actorEmail Email actor.
 * @returns {Object}
 * @private
 */
function _test99_runCrearSolicitud_(label, payload, actorEmail) {
  try {
    var result = crearSolicitud(payload, actorEmail);

    return {
      status: 'CREATED',
      label: label,
      id_solicitud: result && result.id_solicitud ? result.id_solicitud : '',
      estado: result && result.estado ? result.estado : '',
      permiso_key: payload.permiso_key,
      tipo_permiso: payload.tipo_permiso,
      tipo_computo_enviado: payload.tipo_computo,
      fecha_inicio: payload.fecha_inicio,
      fecha_fin: payload.fecha_fin,
      num_dias_solicitados: payload.num_dias_solicitados || '',
      num_horas_solicitadas: payload.num_horas_solicitadas || ''
    };
  } catch (e) {
    return {
      status: 'FAILED',
      label: label,
      permiso_key: payload && payload.permiso_key ? payload.permiso_key : '',
      tipo_computo_enviado: payload && payload.tipo_computo ? payload.tipo_computo : '',
      error: e && e.message ? e.message : String(e)
    };
  }
}

/**
 * Resultado de test omitido.
 *
 * @param {string} label Etiqueta.
 * @returns {Object}
 * @private
 */
function _test99_skip_(label) {
  return {
    status: 'SKIPPED',
    label: label
  };
}

/**
 * Obtiene catálogo activo de CONFIG_PERMISOS.
 *
 * @returns {Object[]}
 * @private
 */
function _test99_getCatalogoPermisosActivo_() {
  var catalogo = [];

  if (typeof listActivos === 'function') {
    catalogo = listActivos();
  } else if (typeof listConfigPermisosActivos === 'function') {
    catalogo = listConfigPermisosActivos();
  } else {
    throw new Error(
      'No se encontró función para listar CONFIG_PERMISOS activos. ' +
      'Revisa si existe listActivos() o listConfigPermisosActivos().'
    );
  }

  if (!Array.isArray(catalogo)) {
    throw new Error('El catálogo de permisos no es un array.');
  }

  return catalogo.filter(function(item) {
    return String(item.activo || '').toUpperCase() !== 'FALSE';
  });
}

/**
 * Busca el primer permiso activo por modalidad_solicitud.
 *
 * @param {Object[]} catalogo Catálogo.
 * @param {string} modalidad Modalidad: DIAS, HORAS, DIAS_HORAS.
 * @returns {Object|null}
 * @private
 */
function _test99_findPermisoByModalidad_(catalogo, modalidad) {
  modalidad = String(modalidad || '').trim().toUpperCase();

  for (var i = 0; i < catalogo.length; i++) {
    var item = catalogo[i] || {};
    var itemModalidad = String(item.modalidad_solicitud || '').trim().toUpperCase();

    if (itemModalidad === modalidad) {
      return item;
    }
  }

  return null;
}

/**
 * Construye los datos de profesor necesarios para payload.
 *
 * @param {Object} profesor Registro de PROFESSORAT.
 * @param {string} actorEmail Email actor.
 * @returns {Object}
 * @private
 */
function _test99_buildProfesorPayload_(profesor, actorEmail) {
  var nombre = _test99_firstNonEmpty_([
    profesor.nombre,
    profesor.nom,
    profesor.Nombre,
    profesor.NOMBRE
  ]);

  var apellidos = _test99_firstNonEmpty_([
    profesor.apellidos,
    profesor.llinatges,
    profesor.Apellidos,
    profesor.APELLIDOS
  ]);

  var dni = _test99_firstNonEmpty_([
    profesor.dni,
    profesor.DNI,
    profesor.nif,
    profesor.NIF
  ]);

  var etapa = _test99_firstNonEmpty_([
    profesor.etapa,
    profesor.Etapa,
    profesor.ETAPA
  ]);

  var puestoTrabajo = _test99_firstNonEmpty_([
    profesor.puesto_trabajo,
    profesor.Puesto_trabajo,
    profesor.PUESTO_TRABAJO,
    profesor.carrec,
    profesor.cargo
  ]);

  if (!nombre) nombre = 'TEST';
  if (!apellidos) apellidos = 'USUARIO';
  if (!dni) dni = '00000000T';
  if (!etapa) etapa = 'ESO';
  if (!puestoTrabajo) puestoTrabajo = 'Otro';

  return {
    email_institucional: actorEmail,
    nombre_profesor: nombre,
    apellidos_profesor: apellidos,
    dni_profesor: dni,
    etapa: etapa,
    puesto_trabajo: puestoTrabajo
  };
}

/**
 * Construye payload base de solicitud.
 *
 * @param {Object} profesorPayload Datos profesor.
 * @param {Object} permiso Permiso CONFIG_PERMISOS.
 * @param {Object} specific Datos específicos.
 * @returns {Object}
 * @private
 */
function _test99_buildPayloadBase_(profesorPayload, permiso, specific) {
  specific = specific || {};

  return {
    nombre_profesor: profesorPayload.nombre_profesor,
    apellidos_profesor: profesorPayload.apellidos_profesor,
    dni_profesor: profesorPayload.dni_profesor,
    etapa: profesorPayload.etapa,
    puesto_trabajo: profesorPayload.puesto_trabajo,

    categoria_permiso: permiso.categoria_permiso || '',
    permiso_key: permiso.permiso_key || '',
    tipo_permiso: permiso.tipo_permiso || '',
    articulo_referencia_permiso: permiso.articulo_referencia || '',
    tipo_computo: specific.tipo_computo || '',
    unidad_control: permiso.unidad_control || '',
    maximo_por_curso: permiso.maximo_por_curso || '',
    requiere_acumulado: permiso.requiere_acumulado || '',

    fecha_inicio: specific.fecha_inicio || '',
    fecha_fin: specific.fecha_fin || '',

    hora_inicio: specific.hora_inicio || '',
    hora_fin: specific.hora_fin || '',

    num_dias_solicitados: specific.num_dias_solicitados || '',
    num_horas_solicitadas: specific.num_horas_solicitadas || '',

    observaciones_profesor: '[TEST AUTOMÁTICO] ' + (specific.tipo_computo || ''),
    justificante_adjunto: permiso.requiere_justificante || 'NO'
  };
}

/**
 * Devuelve la primera cadena no vacía.
 *
 * @param {Array<*>} values Valores.
 * @returns {string}
 * @private
 */
function _test99_firstNonEmpty_(values) {
  for (var i = 0; i < values.length; i++) {
    var v = values[i];
    if (v !== null && v !== undefined && String(v).trim() !== '') {
      return String(v).trim();
    }
  }
  return '';
}

/**
 * Devuelve fecha ISO sumando días a hoy.
 *
 * @param {number} days Días desde hoy.
 * @returns {string} yyyy-MM-dd
 * @private
 */
function _test99_addDaysIso_(days) {
  var date = new Date();
  date.setDate(date.getDate() + Number(days || 0));

  var timezone = Session.getScriptTimeZone() || 'Europe/Madrid';

  return Utilities.formatDate(date, timezone, 'yyyy-MM-dd');
}