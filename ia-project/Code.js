const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'); 

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('AgroSystem Suite | RAG Designer')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * FUNCIÓN PARA LEER LA BASE DE DATOS DE MATERIAS PRIMAS (RAG)
 */
function obtenerInventario() {
  try {
    // ID de la hoja proporcionada
    const libro = SpreadsheetApp.openById('1duNXyrgmefH09rgX_SlhaW0nuu7neETE4vvCg_A65qM');
    const hoja = libro.getSheetByName('db_materia_prima');
    
    if (!hoja) throw new Error("No se encontró la pestaña 'db_materia_prima'.");

    const datos = hoja.getDataRange().getValues();
    const encabezados = datos.shift(); // Saca la primera fila (títulos)
    
    // Convierte las filas en un arreglo de objetos JSON
    const inventario = datos.map(fila => {
      let obj = {};
      encabezados.forEach((titulo, index) => {
        if (titulo) obj[titulo.toString().trim()] = fila[index];
      });
      return obj;
    });
    
    return inventario;
  } catch (e) {
    throw new Error("Error al leer la base de datos de Sheets: " + e.message);
  }
}

/**
 * MOTOR DE DISEÑO INVERSO (RAG + GEMINI)
 */
function diseñarCoadyuvanteIA(datos) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);

    if (!GEMINI_API_KEY) throw new Error("API KEY de Gemini no configurada.");

    // 1. Obtener los materiales disponibles en tiempo real
    const inventarioJSON = obtenerInventario();
    const inventarioTexto = JSON.stringify(inventarioJSON);

    let matrizTexto = datos.matriz.map(item => `- ${item.funcionalidad}: Nivel ${item.potencia_deseada}`).join("\n");

    // 2. Prompt Experto inyectando el inventario
    const promptEstrategico = `Eres el Director Científico Senior de Formulación Agrícola.
Tu misión es diseñar un coadyuvante basado ESTRICTAMENTE en la siguiente base de datos de materias primas de nuestra empresa:

INVENTARIO DISPONIBLE (JSON):
${inventarioTexto}

REQUERIMIENTOS DEL CLIENTE:
- Cultivos: ${datos.cultivos}
- Plaguicida Acompañante: ${datos.plaguicidas}
- Certificación: ${datos.organico}
- Perfil de Desempeño Solicitado (Escala 1 al 4):
${matrizTexto}

INSTRUCCIONES TÉCNICAS:
1. Formula usando EXCLUSIVAMENTE los componentes del inventario proporcionado.
2. Considera los valores de HLB, pH y Tensión Superficial provistos en la base de datos para justificar la compatibilidad física y el desempeño solicitado.
3. Si la exigencia del cliente requiere una propiedad que NINGÚN componente del inventario actual puede satisfacer, indícalo en el campo "recomendacion_compras" proponiendo la familia química que deberíamos adquirir. Si el inventario es suficiente, deja ese campo vacío.

Devuelve EXCLUSIVAMENTE un JSON puro con esta estructura:
{
  "dificultad": "Baja / Moderada / Crítica",
  "estabilidad_estimada": "Porcentaje (Ej: 95%)",
  "costo_relativo": "Económico / Estándar / Premium",
  "evaluacion_tecnica": "Dictamen justificando matemáticamente la selección basada en el balance HLB, la Tensión Superficial (mN/m) de los componentes elegidos y el pH del sistema.",
  "recomendacion_compras": "Sugerencia de materia prima a comprar si hace falta para alcanzar el objetivo, o texto vacío si no es necesario.",
  "componentes": [
    {
      "sap": "Código SAP del inventario (Ej. 40433)",
      "nombre": "COMPONENTE exacto del inventario",
      "funcion": "Justificación técnica del rol",
      "porcentaje": "Masa % sugerida"
    }
  ]
}`;

    return ejecutarPeticionGemini(promptEstrategico);

  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * CONEXIÓN AL MOTOR IA CON ALGORITMO DE RESISTENCIA (EXPONENTIAL BACKOFF)
 */
function ejecutarPeticionGemini(promptTexto) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const payload = {
    "contents": [{ "parts": [{"text": promptTexto}] }],
    "generationConfig": { "response_mime_type": "application/json" }
  };
  
  const opciones = { 
    'method': 'post', 
    'contentType': 'application/json', 
    'payload': JSON.stringify(payload), 
    'muteHttpExceptions': true 
  };
  
  // CONFIGURACIÓN DE RESISTENCIA
  const maxReintentos = 5; // Aumentamos la insistencia a 5 intentos (antes 3)
  let delay = 4000; // Comenzamos esperando 4 segundos en el primer fallo
  
  for (let intento = 1; intento <= maxReintentos; intento++) {
    try {
      const respuesta = UrlFetchApp.fetch(url, opciones);
      const codigo = respuesta.getResponseCode();
      const texto = respuesta.getContentText();
      
      // Si la IA responde correctamente a la primera (o en algún reintento)
      if (codigo === 200) {
        const json = JSON.parse(texto);
        return { success: true, datosFormulacion: JSON.parse(json.candidates[0].content.parts[0].text) };
      }
      
      // Si el servidor de Google dice "estoy saturado" (503) o "espera" (429)
      if ((codigo === 429 || codigo === 503) && intento < maxReintentos) {
        Utilities.sleep(delay); // El script se pausa en silencio
        delay *= 2; // El próximo intento esperará el doble (4s, 8s, 16s, 32s...)
        continue; // Vuelve a intentar
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
  // Al no tener try/catch, esto obligará a Google a sacar la ventana de permisos
  SpreadsheetApp.openById('1duNXyrgmefH09rgX_SlhaW0nuu7neETE4vvCg_A65qM');
}