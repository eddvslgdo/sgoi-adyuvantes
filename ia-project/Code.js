// 1. Obtener la API Key globalmente de las Propiedades del Script
const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

/**
 * SERVIDOR DE LA APLICACIÓN WEB (WEB APP)
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("AgroSystem Suite | RAG Designer")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function obtenerInventario() {
  try {
    const libro = SpreadsheetApp.openById("1duNXyrgmefH09rgX_SlhaW0nuu7neETE4vvCg_A65qM");
    const hoja = libro.getSheetByName("db_materia_prima");

    if (!hoja) throw new Error("No se encontró la pestaña 'db_materia_prima'.");

    const datos = hoja.getDataRange().getValues();
    const encabezados = datos.shift().map(h => h.toString().trim());

    return datos.map((fila) => {
      let obj = {};
      encabezados.forEach((titulo, index) => {
        if (titulo) {
          // Normalizamos las llaves de acceso
          const clave = titulo.toLowerCase().replace(/[^a-z0-0]/g, "_");
          obj[clave] = fila[index];
        }
      });
      
      // Mapeo garantizado para los nombres de tu Sheet
      return {
        sap: obj["sap"] || fila[0],
        nombre_comercial: obj["componente"] || fila[1], // Ej: SURFACPOL 909
        nombre_quimico: obj["nombre_quimico___comun"] || obj["nombre_quimico"] || fila[2],
        ph: obj["ph"] || fila[3],
        tension: obj["tension_superficial__mn_m_"] || fila[4],
        hlb: obj["hlb"] || fila[5],
        funcion: obj["propiedades_de_coadyuvantes"] || fila[6]
      };
    });
  } catch (e) {
    throw new Error("Error al leer Google Sheets: " + e.message);
  }
}

/**
 * MOTOR DE COMUNICACIÓN HTTP CON LA API DE GEMINI (BACKOFF EXPONENCIAL)
 */
function ejecutarPeticionGemini(promptTexto, modeloRecibido) {
  // Configuración de enrutamiento de modelos estables
  let modeloSeleccionado = "gemini-3.5-flash-lite"; 
  
  if (modeloRecibido && (modeloRecibido.includes("pro") || modeloRecibido.includes("1.5-pro"))) {
    modeloSeleccionado = "gemini-3.5-flash"; // Motor con mayor poder de razonamiento
  } else if (modeloRecibido && modeloRecibido.includes("flash")) {
    modeloSeleccionado = "gemini-3.5-flash-lite";
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modeloSeleccionado}:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    contents: [{ parts: [{ text: promptTexto }] }],
    generationConfig: { response_mime_type: "application/json" },
  };

  const opciones = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  const maxReintentos = 3;
  let delay = 2000;

  for (let intento = 1; intento <= maxReintentos; intento++) {
    try {
      const respuesta = UrlFetchApp.fetch(url, opciones);
      const codigo = respuesta.getResponseCode();
      const texto = respuesta.getContentText();

      if (codigo === 200) {
        const json = JSON.parse(texto);
        let textoIA = json.candidates[0].content.parts[0].text;

        // Limpieza de formato Markdown de la respuesta JSON
        textoIA = textoIA.replace(/```json/gi, "").replace(/```/gi, "").trim();

        return { success: true, datosFormulacion: JSON.parse(textoIA) };
      }

      if ((codigo === 429 || codigo === 503) && intento < maxReintentos) {
        Utilities.sleep(delay);
        delay *= 2;
        continue;
      }

      throw new Error(`Error API HTTP ${codigo}: ${texto}`);
    } catch (error) {
      if (intento === maxReintentos) {
        return { success: false, error: error.toString() };
      }
      Utilities.sleep(delay);
      delay *= 2;
    }
  }
}

function forzarAutorizacion() {
  SpreadsheetApp.openById("1duNXyrgmefH09rgX_SlhaW0nuu7neETE4vvCg_A65qM");
}