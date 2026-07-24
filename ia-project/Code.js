// 1. Obtener la llave (Esto SÍ puede ir suelto arriba, porque no depende de los datos del usuario)
const GEMINI_API_KEY =
  PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");

function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("AgroSystem Suite | RAG Designer")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

/**
 * FUNCIÓN PARA LEER LA BASE DE DATOS DE MATERIAS PRIMAS (RAG)
 */
function obtenerInventario() {
  try {
    const libro = SpreadsheetApp.openById(
      "1duNXyrgmefH09rgX_SlhaW0nuu7neETE4vvCg_A65qM",
    );
    const hoja = libro.getSheetByName("db_materia_prima");

    if (!hoja) throw new Error("No se encontró la pestaña 'db_materia_prima'.");

    const datos = hoja.getDataRange().getValues();
    const encabezados = datos.shift();

    const inventario = datos.map((fila) => {
      let obj = {};
      encabezados.forEach((titulo, index) => {
        if (titulo) obj[titulo.toString().trim()] = fila[index];
      });
      return obj;
    });

    return inventario;
  } catch (e) {
    throw new Error("Error al leer Google Sheets: " + e.message);
  }
}

/**
 * MOTOR DE DISEÑO INVERSO (RAG + GEMINI)
 */
function diseñarCoadyuvanteIA(datos) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);

    if (!GEMINI_API_KEY)
      throw new Error(
        "API KEY de Gemini no configurada en las Propiedades del Script.",
      );

    // 1. Obtener los materiales disponibles
    const inventarioJSON = obtenerInventario();
    const inventarioTexto = JSON.stringify(inventarioJSON);
    let matrizTexto = datos.matriz
      .map((item) => `- ${item.funcionalidad}: Nivel ${item.potencia_deseada}`)
      .join("\n");

    // 2. Prompt Estratégico Nivel Experto (Arquitectura Comercial Dinámica)
    const promptEstrategico = `Eres el Director Científico Senior de Formulación Agrícola.
Tu misión es diseñar un coadyuvante (PRODUCTO COMERCIAL TERMINADO).

INVENTARIO DISPONIBLE (JSON):
${inventarioTexto}

REQUERIMIENTOS DEL CLIENTE:
- Cultivos: ${datos.cultivos}
- Plaguicida Acompañante: ${datos.plaguicidas}
- Certificación exigida: ${datos.organico}
- Perfil de Desempeño Solicitado:
${matrizTexto}

INSTRUCCIONES TÉCNICAS ESTRICTAS Y OBLIGATORIAS:
1. ECOSISTEMA COMERCIAL COMPLETO: Tu objetivo es entregar un producto final listo para venta. ESTÁ PROHIBIDO formular únicamente mezclando activos puros. SIEMPRE debes estructurar una arquitectura completa que incluya: Activos principales, Emulsificantes/Surfactantes, Acondicionadores de mezcla/Compatibilizantes, y OBLIGATORIAMENTE un Vehículo/Diluyente (ej. "Agua desionizada (C.S.P.)", SAP: N/A, u otro solvente) para completar el 100%.
2. LÓGICA DE BALANCE DE MATERIA: No tienes límites numéricos predefinidos. Analiza internamente la compatibilidad fisicoquímica, interacciones estéricas, pH y HLB global para definir los porcentajes exactos. Si el producto requiere una carga activa alta o baja, justifícalo con base en la estabilidad termodinámica de la mezcla.
3. PERFIL DE DESEMPEÑO REAL (EXTRAS): Evalúa la fórmula final. Determina su eficacia (1 al 4) para las funciones solicitadas y añade beneficios extra reales. ¡SÉ EXTREMADAMENTE CRÍTICO! Es químicamente imposible que una fórmula sea perfecta en todo. Califica con 1 (Malo) o 2 (Regular) lo que la fórmula no cubra eficientemente.
4. REGLA OMRI Y EXTERNOS: Si se exige certificación orgánica y el inventario no tiene insumos viables, formula la mezcla ideal utilizando materias primas "EXTERNAS" del mercado global.
5. SÍNTESIS, ESTABILIDAD Y PRUEBAS: Define el método de laboratorio paso a paso, pruebas CIPAC a 54°C/Frío, y evaluaciones fisicoquímicas adicionales.

Devuelve EXCLUSIVAMENTE un JSON puro con esta estructura:
{
  "dificultad": "Baja / Moderada / Crítica",
  "estabilidad_estimada": "Porcentaje (Ej: 95%)",
  "costo_relativo": "Económico / Estándar / Premium",
  "evaluacion_tecnica": "Dictamen profundo sobre interacciones químicas, solubilidad y justificación de las proporciones elegidas.",
  "recomendacion_compras": "Justifica qué materiales EXTERNOS se deben comprar, de ser necesario.",
  "protocolo_estabilidad": "Parámetros de prueba a 54°C, frío y tiempo de anaquel.",
  "diagrama_manufactura": "Pasos para preparar el prototipo a escala de laboratorio.",
  "evaluaciones_adicionales": "Pruebas recomendadas para asegurar el éxito.",
  "perfil_funcionalidad": [
    {
      "propiedad": "Nombre de la propiedad",
      "nivel": 3
    }
  ],
  "componentes": [
    {
      "sap": "Código SAP (Usa 'N/A' para el vehículo, o 'EXTERNO' para compras)",
      "nombre": "COMPONENTE",
      "funcion": "Justificación precisa de su rol en la arquitectura",
      "porcentaje": "Masa %"
    }
  ]
}`;

    // AQUÍ PASAMOS EL MODELO A LA SIGUIENTE FUNCIÓN
    return ejecutarPeticionGemini(promptEstrategico, datos.modelo_ia);
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * CONEXIÓN AL MOTOR IA CON BACKOFF EXPONENCIAL Y LIMPIEZA DE JSON
 */
/**
 * CONEXIÓN AL MOTOR IA CON BACKOFF EXPONENCIAL Y LIMPIEZA DE JSON
 */
function ejecutarPeticionGemini(promptTexto, modeloRecibido) {
  // 1. Filtro robusto con los nombres CORRECTOS y ACTUALES para tu API
  let modeloSeleccionado = "gemini-3.5-flash-lite"; // Motor rápido por defecto
  
  if (modeloRecibido && modeloRecibido.includes("pro")) {
    // Si seleccionas el modo experto, usamos la versión más capaz
    modeloSeleccionado = "gemini-3.5-flash"; 
  }

  // 2. Construir la URL con el modelo validado
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

  const maxReintentos = 5;
  let delay = 4000;

  for (let intento = 1; intento <= maxReintentos; intento++) {
    try {
      const respuesta = UrlFetchApp.fetch(url, opciones);
      const codigo = respuesta.getResponseCode();
      const texto = respuesta.getContentText();

      if (codigo === 200) {
        const json = JSON.parse(texto);
        let textoIA = json.candidates[0].content.parts[0].text;

        textoIA = textoIA
          .replace(/```json/gi, "")
          .replace(/```/gi, "")
          .trim();

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
