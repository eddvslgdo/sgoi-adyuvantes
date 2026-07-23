// backend/Code.js

// =========================================================================
// CONFIGURACIÓN DE TUS BASES DE DATOS (GOOGLE SHEETS) Y DRIVE
// =========================================================================
const SPREADSHEET_DEV_ID  = "1p18r_v2BLm2XDXjIJUIAeMjDb6AtXnNCw1xionxOAoI";
const SPREADSHEET_PROD_ID = "1932HvsH4XklqBmhfvPeRIyU1DcXFExIMlQFhu5Psy3I";
const CARPETA_MAESTRA_ID  = "1xVUezFzImVV89d_K7SYi7nqWRFU0p2fJ";

const ENTORNO_ACTUAL = "DEV"; 

function obtenerBaseDeDatos() {
  const id = ENTORNO_ACTUAL === "DEV" ? SPREADSHEET_DEV_ID : SPREADSHEET_PROD_ID;
  return SpreadsheetApp.openById(id);
}

// =========================================================================
// PUNTOS DE ENTRADA HTTP (API REST)
// =========================================================================

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Catálogo PLM Insumos')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    let contenido = (e.parameter && e.parameter.datos) ? e.parameter.datos : e.postData.contents;
    const peticion = JSON.parse(contenido);
    let respuestaData = null;

    if (peticion.accion === 'obtenerProductos') {
      respuestaData = obtenerProductosDesdeSheets();
    } 
    else if (peticion.accion === 'guardarProducto') {
      respuestaData = guardarProductoEnSheets(peticion.payload);
    }
    else if (peticion.accion === 'editarProducto') {
      respuestaData = editarProductoEnSheets(peticion.payload);
    }
    else if (peticion.accion === 'eliminarProducto') {
      respuestaData = eliminarProductoEnSheets(peticion.payload);
    }
    else if (peticion.accion === 'convertirAMaestro') {
      respuestaData = convertirProductoEnMaestroEnSheets(peticion.payload);
    }
    else {
      throw new Error("Acción no reconocida en el sistema.");
    }

    return ContentService.createTextOutput(JSON.stringify({ exito: true, data: respuestaData }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ exito: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// =========================================================================
// LÓGICA DE NEGOCIO EVOLUTIVA
// =========================================================================

function obtenerProductosDesdeSheets() {
  const libro = obtenerBaseDeDatos();
  const hoja = libro.getSheetByName("Productos");
  if (!hoja) throw new Error("La pestaña 'Productos' no existe.");

  const valores = hoja.getDataRange().getValues();
  if (valores.length <= 1) return [];

  const encabezados = valores[0];
  const filas = valores.slice(1);

  return filas.map(fila => {
    let objeto = {};
    encabezados.forEach((cabecera, index) => {
      objeto[cabecera] = fila[index];
    });
    return objeto;
  });
}

function guardarProductoEnSheets(nuevoProducto) {
  // Simulación para ejecución manual desde el editor web de Google
  if (!nuevoProducto || typeof nuevoProducto !== 'object') {
    nuevoProducto = {
      codigoDesarrollo: "DP-28-17/2026",
      nombreComercial: "Producto X",
      idPadre: "" // Vacío si es un producto raíz
    };
  }

  const libro = obtenerBaseDeDatos();
  const hoja = libro.getSheetByName("Productos");
  if (!hoja) throw new Error("La pestaña 'Productos' no existe.");

  const rango = hoja.getDataRange();
  const valores = rango.getValues();
  const encabezados = valores[0];

  // 1. GENERACIÓN DE ID CORRELATIVO AUTOMÁTICO
  let nuevoId = 1;
  if (valores.length > 1) {
    const ids = valores.slice(1).map(f => parseInt(f[0]) || 0);
    nuevoId = Math.max(...ids) + 1;
  }
  nuevoProducto.id = nuevoId;

  // 2. CREACIÓN DE ESTRUCTURA HIERÁRQUICA EN DRIVE
  const carpetaMaestra = DriveApp.getFolderById(CARPETA_MAESTRA_ID);
  
  // Nombre de carpeta: "NombreComercial (Codigo)"
  const nombreCarpetaRaiz = `${nuevoProducto.nombreComercial} (${nuevoProducto.codigoDesarrollo})`;
  const carpetaProducto = carpetaMaestra.createFolder(nombreCarpetaRaiz);
  
  // Creación de subcarpetas estandarizadas
  carpetaProducto.createFolder("01_Hojas_de_Seguridad_HDS");
  carpetaProducto.createFolder("02_Fichas_Tecnicas_FT");
  carpetaProducto.createFolder("03_Videos_Demostracion");

  nuevoProducto.folderId = carpetaProducto.getId();
  nuevoProducto.folderUrl = carpetaProducto.getUrl();

  // 3. MAPEO E INSERCIÓN EN SHEET
  const nuevaFila = encabezados.map(cabecera => {
    return nuevoProducto[cabecera] !== undefined ? nuevoProducto[cabecera] : "";
  });

  hoja.appendRow(nuevaFila);

  return { exito: true, mensaje: "Estructura PLM creada con éxito." };
}

function editarProductoEnSheets({ id, nuevoNombre }) {
  const hoja = obtenerBaseDeDatos().getSheetByName("Productos");
  const datos = hoja.getDataRange().getValues();
  
  // Recorremos las filas (saltando el encabezado) para encontrar el ID
  for (let i = 1; i < datos.length; i++) {
    if (datos[i][0] == id) { 
      // La columna 3 es el "nombreComercial"
      hoja.getRange(i + 1, 3).setValue(nuevoNombre);
      return { mensaje: "Nombre actualizado correctamente" };
    }
  }
  throw new Error("Producto no encontrado en la base de datos.");
}

function eliminarProductoEnSheets({ id }) {
  const hoja = obtenerBaseDeDatos().getSheetByName("Productos");
  const datos = hoja.getDataRange().getValues();
  
  for (let i = 1; i < datos.length; i++) {
    if (datos[i][0] == id) {
      hoja.deleteRow(i + 1);
      return { mensaje: "Producto eliminado correctamente" };
    }
  }
  throw new Error("Producto no encontrado en la base de datos.");
}


function convertirProductoEnMaestroEnSheets({ id, nuevoNombre }) {
  const hoja = obtenerBaseDeDatos().getSheetByName("Productos");
  const datos = hoja.getDataRange().getValues();
  
  for (let i = 1; i < datos.length; i++) {
    if (datos[i][0] == id) {
      // Le asignamos el nuevo nombre comercial (Columna 3)
      hoja.getRange(i + 1, 3).setValue(nuevoNombre);
      // Le borramos el idPadre para independizarlo (Columna 4)
      hoja.getRange(i + 1, 4).setValue("");
      return { mensaje: "Producto graduado a Maestro con éxito" };
    }
  }
  throw new Error("Producto no encontrado en la base de datos.");
}