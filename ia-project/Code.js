const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'); 

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('AgroSystem Suite | Coadyuvante Designer')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL) // Permite el renderizado en iframes
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * MOTOR DE DISEÑO INVERSO PARA COADYUVANTES A MEDIDA
 */
function diseñarCoadyuvanteIA(datos) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);

    if (!GEMINI_API_KEY) {
      throw new Error("Clave de acceso de Gemini (API KEY) no encontrada en Script Properties.");
    }

    // Convertimos la matriz de funcionalidades recibida del frontend en texto legible para el prompt
    let matrizTexto = datos.matriz.map(item => `- ${item.funcionalidad}: Potencia Objetivo ${item.potencia_deseada}`).join("\n");

    const promptEstrategico = `Eres el Director Científico Global de I+D en Fisicoquímica de Superficies y Adyuvantes de Especialidad Agrícola.
Tu misión es diseñar la fórmula óptima de un Coadyuvante comercial con base en los siguientes requerimientos de mercado:

- CULTIVOS DE ENFOQUE: ${datos.cultivos}
- PLAGUICIDA/ACOMPAÑANTE EN TANQUE: ${datos.plaguicidas}
- MARCO REGULATORIO / ECOLÓGICO: ${datos.organico}

MATRIZ DE INTENSIDAD REQUERIDA (Escala 1 al 4, donde 4 representa el máximo desempeño):
${matrizTexto}

TAREA:
Establece la mezcla de materias primas ideales (ej. alcoholes etoxilados, organosiliconas, aceites vegetales metilados, agentes quelantes, tampones, etc.) que cumplan con la matriz sin romper las restricciones de sustentabilidad (si se solicitó OMRI, usa componentes orgánicos naturales).

Devuelve EXCLUSIVAMENTE un JSON puro, sin decoradores markdown ni texto explicativo externo:
{
  "dificultad": "Baja / Moderada / Crítica (Evalúa qué tan difícil es balancear estas intensidades solicitadas)",
  "estabilidad_estimada": "Porcentaje (Ej: 96%)",
  "costo_relativo": "Económico / Estándar / Premium",
  "evaluacion_tecnica": "Dictamen corporativo justificando científicamente la sinergia de los tensoactivos o solventes seleccionados para alcanzar los niveles de potencia deseados, la interacción con la cera del cultivo y su compatibilidad con el plaguicida.",
  "componentes": [
    {"nombre": "Componente Específico o Familia Química 1", "funcion": "Rol en la fórmula (ej: Humectante / Penetrante)", "porcentaje": "Masa % sugerida (ej: 50%)"},
    {"nombre": "Componente Específico o Familia Química 2", "funcion": "Rol en la fórmula", "porcentaje": "Masa % sugerida (ej: 30%)"},
    {"nombre": "Componente Específico o Familia Química 3", "funcion": "Rol en la fórmula", "porcentaje": "Masa % sugerida (ej: 20%)"}
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
 * CONEXIÓN CORE CON GEMINI 3.5 FLASH
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
  
  try {
    const respuesta = UrlFetchApp.fetch(url, opciones);
    const codigo = respuesta.getResponseCode();
    const texto = respuesta.getContentText();
    
    if (codigo !== 200) {
      throw new Error(`HTTP ${codigo}: ${texto}`);
    }
    
    const json = JSON.parse(texto);
    const textoIA = json.candidates[0].content.parts[0].text;
    
    return { success: true, datosFormulacion: JSON.parse(textoLimpioParaJson(textoIA)) };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// Limpieza auxiliar por si la IA llegara a colocar texto fuera del bloque JSON
function textoLimpioParaJson(txt) {
  let inicio = txt.indexOf('{');
  let fin = txt.lastIndexOf('}');
  if (inicio !== -1 && fin !== -1) {
    return txt.substring(inicio, fin + 1);
  }
  return txt;
}