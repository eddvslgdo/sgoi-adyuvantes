const SPREADSHEET_HUB_ID = "1T9CM87reRMYViVTcT6I4Ov4KJuhVauilpSHPouKoLmQ";

function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  template.appUrl = ScriptApp.getService().getUrl();
  return template.evaluate()
      .setTitle('Portal de Gestión Corporativa')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createTemplateFromFile(filename).evaluate().getContent();
}

/**
 * Lee la configuración de módulos desde la pestaña CONFIG_MODULOS o devuelve un respaldo
 */
function obtenerModulosConfig() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_HUB_ID);
    const sheet = ss.getSheetByName("CONFIG_MODULOS");
    
    // Si la pestaña no existe o el ID está mal, mandamos el respaldo directo
    if (!sheet) {
      return obtenerModulosRespaldo();
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return obtenerModulosRespaldo(); // Si solo están los encabezados
    
    const headers = data.shift(); // Quitar los encabezados
    
    let modulos = data.map(row => ({
      id: String(row[0] || ""),
      modulo: String(row[1] || ""),
      url: String(row[2] || ""),
      icono: String(row[3] || "apps"),
      orden: Number(row[4] || 0)
    })).filter(r => r.modulo !== "" && r.modulo !== "undefined");
    
    if (modulos.length === 0) return obtenerModulosRespaldo();
    
    modulos.sort((a, b) => a.orden - b.orden);
    return modulos;
  } catch(e) {
    console.error("Error en obtenerModulosConfig: " + e.message);
    return obtenerModulosRespaldo(); // Si truena, activar botones de respaldo
  }
}

// Botones por defecto si el Sheets falla o está vacío
function obtenerModulosRespaldo() {
  return [
    { id: "1", modulo: "🏠 Resumen General", url: "local", icono: "dashboard", orden: 1 },
    { id: "2", modulo: "📦 Gestión de Inventario", url: "https://script.google.com/a/macros/polakgrupo.com/s/AKfycbyCmYmXQ6a_xedCawdiPKgM_0BTDiqdbHOQGDXW5vBknBXnRRNgDpKLmtBLElM_jpiUqg/exec", icono: "inventory", orden: 2 },
    { id: "3", modulo: "🔬 Catálogo de SKUs", url: "https://script.google.com/a/macros/polakgrupo.com/s/AKfycbw1gEPqlX0atoZN1y1OvscAYndBVYEqcOPJ_p-mb9J3M--oepF4qANGQCUtj0ew69g/exec", icono: "assignment", orden: 3 }
  
  ];
}

function obtenerKpisGlobales() {
  return { skusTotales: 0, pagosPendientes: "$0.00", enviosTransito: 0 };
}