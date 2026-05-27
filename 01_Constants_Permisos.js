/**
 * 01_Constants_Permisos.gs
 * Constantes cerradas de dominio para V1.
 */

const CONST_PERMISOS = Object.freeze({
  ESTADOS_V1: Object.freeze([
    'PENDIENTE',
    'ACEPTADA',
    'DENEGADA'
  ]),

  TIPOS_COMPUTO: Object.freeze([
    'DIA_COMPLETO',
    'HORAS',
    'MIXTO'
  ]),

  UNIDADES_CONTROL: Object.freeze([
    'DIAS',
    'HORAS',
    'SIN_LIMITE',
    'DOCUMENTO_ESPECIFICO'
  ]),

  CANALES_ENVIO: Object.freeze([
    'EMAIL'
  ]),

  ROLES_RESPONSABLES: Object.freeze([
    'DIRECCION',
    'AUTORIZADO',
    'JEFATURA'
  ]),

  ETAPAS: Object.freeze([
    'INFANTIL',
    'PRIMARIA',
    'ESO',
    'PAS',
    'TODAS'
  ]),

  CATEGORIAS_PERMISO: Object.freeze([
    'Permisos retribuidos',
    'Otros permisos retribuidos',
    'Permisos no retribuidos',
    'TODAS'
  ]),

  BOOL_SI_NO: Object.freeze([
    'SI',
    'NO'
  ])
});

/**
 * Devuelve los estados funcionales permitidos para V1.
 * @returns {string[]} Lista de estados.
 */
function getEstadosV1() {
  return CONST_PERMISOS.ESTADOS_V1.slice();
}

/**
 * Devuelve los tipos de cómputo permitidos en V1.
 * @returns {string[]} Lista de tipos de cómputo.
 */
function getTiposComputo() {
  return CONST_PERMISOS.TIPOS_COMPUTO.slice();
}

/**
 * Devuelve las unidades de control disponibles para permisos.
 * @returns {string[]} Lista de unidades de control.
 */
function getUnidadesControl() {
  return CONST_PERMISOS.UNIDADES_CONTROL.slice();
}

/**
 * Devuelve los canales de envío habilitados.
 * @returns {string[]} Lista de canales de envío.
 */
function getCanalesEnvio() {
  return CONST_PERMISOS.CANALES_ENVIO.slice();
}

/**
 * Devuelve los roles válidos para responsables.
 * @returns {string[]} Lista de roles.
 */
function getRolesResponsables() {
  return CONST_PERMISOS.ROLES_RESPONSABLES.slice();
}

/**
 * Devuelve las etapas configuradas para el proyecto.
 * @returns {string[]} Lista de etapas.
 */
function getEtapas() {
  return CONST_PERMISOS.ETAPAS.slice();
}

/**
 * Devuelve las categorías de permiso permitidas.
 * @returns {string[]} Lista de categorías de permiso.
 */
function getCategoriasPermiso() {
  return CONST_PERMISOS.CATEGORIAS_PERMISO.slice();
}

/**
 * Devuelve los valores binarios SI/NO usados en configuraciones.
 * @returns {string[]} Lista de valores SI/NO.
 */
function getValoresSiNo() {
  return CONST_PERMISOS.BOOL_SI_NO.slice();
}