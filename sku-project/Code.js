function doGet() {
  return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('Dashboard de SKUs')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 1. OBTENER DATOS (Ahora incluye Observaciones en la columna F / índice 5)
function obtenerTodosLosDatos() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const hojas = libro.getSheets();
  let todosLosDatos = [];
  
  hojas.forEach(hoja => {
    const nombreHoja = hoja.getName();
    if(!isNaN(nombreHoja) && nombreHoja !== "Papelera" && nombreHoja.trim() !== "") {
      const datos = hoja.getDataRange().getValues();
      if(datos.length > 1) { 
        datos.shift(); 
        const datosMapeados = datos.map(fila => {
          return { 
            ano: nombreHoja, 
            nombreSku: fila[0], 
            nombreReal: fila[1], 
            skuFert: fila[2], 
            skuHawa: fila[3], 
            status: fila[4],
            observaciones: fila[5] || "" // NUEVO CAMPO
          };
        });
        todosLosDatos = todosLosDatos.concat(datosMapeados);
      }
    }
  });
  return todosLosDatos;
}

// 2. GUARDAR NUEVO (Con prevención de duplicados)
function guardarNuevoSKU(datos) {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(datos.ano.toString());
  
  if (!hoja) {
    hoja = libro.insertSheet(datos.ano.toString());
    hoja.appendRow(['Nombre SKU', 'Nombre Real', 'SKU FERT', 'SKU HAWA', 'Status', 'Observaciones']);
    hoja.getRange("A1:F1").setBackground("#343a40").setFontColor("white").setFontWeight("bold");
  }
  
  // PREVENCIÓN DE DUPLICADOS
  const data = hoja.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim().toLowerCase() === datos.nombreSku.trim().toLowerCase()) {
      throw new Error(`El SKU "${datos.nombreSku}" ya se encuentra registrado en el año ${datos.ano}.`);
    }
  }
  
  hoja.appendRow([datos.nombreSku, datos.nombreReal, datos.skuFert, datos.skuHawa, datos.status, datos.observaciones]);
  return "Registro iniciado correctamente.";
}

// 3. ACTUALIZAR EXISTENTE
function actualizarSKU(datos, nombreSkuOriginal) {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = libro.getSheetByName(datos.ano.toString());
  if (!hoja) throw new Error("No se encontró la hoja del año.");

  const data = hoja.getDataRange().getValues();
  let rowIndex = -1;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === nombreSkuOriginal) { rowIndex = i + 1; break; }
  }

  if (rowIndex > -1) {
    hoja.getRange(rowIndex, 1, 1, 6).setValues([[datos.nombreSku, datos.nombreReal, datos.skuFert, datos.skuHawa, datos.status, datos.observaciones]]);
    return "SKU actualizado correctamente.";
  } else {
    throw new Error("No se encontró el SKU original.");
  }
}

// 4. ENVIAR A PAPELERA
function enviarAPapelera(ano, nombreSku) {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const hojaOrigen = libro.getSheetByName(ano.toString());
  if (!hojaOrigen) throw new Error("Hoja origen no encontrada");

  let papelera = libro.getSheetByName("Papelera");
  if (!papelera) {
    papelera = libro.insertSheet("Papelera");
    papelera.appendRow(['Año Original', 'Nombre SKU', 'Nombre Real', 'SKU FERT', 'SKU HAWA', 'Status Anterior', 'Observaciones']);
    papelera.getRange("A1:G1").setBackground("#dc3545").setFontColor("white").setFontWeight("bold");
  }

  const data = hojaOrigen.getDataRange().getValues();
  let rowIndex = -1; let filaMover = null;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === nombreSku) { rowIndex = i + 1; filaMover = data[i]; break; }
  }

  if (rowIndex > -1) {
    papelera.appendRow([ano, filaMover[0], filaMover[1], filaMover[2], filaMover[3], filaMover[4], filaMover[5]]);
    hojaOrigen.deleteRow(rowIndex);
    return "Movido a la papelera de reciclaje.";
  } else {
    throw new Error("SKU no encontrado.");
  }
}

// 5. LEER PAPELERA
function obtenerDatosPapelera() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const papelera = libro.getSheetByName("Papelera");
  if (!papelera) return [];
  
  const datos = papelera.getDataRange().getValues();
  if (datos.length > 1) {
    datos.shift();
    return datos.map(fila => {
      return { ano: fila[0], nombreSku: fila[1], nombreReal: fila[2], skuFert: fila[3], skuHawa: fila[4], status: fila[5], observaciones: fila[6] };
    });
  }
  return [];
}

// 6. RESTAURAR DESDE PAPELERA
function restaurarDePapelera(nombreSku) {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const papelera = libro.getSheetByName("Papelera");
  if (!papelera) throw new Error("No hay papelera.");

  const data = papelera.getDataRange().getValues();
  let rowIndex = -1; let filaRestaurar = null;

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === nombreSku) { rowIndex = i + 1; filaRestaurar = data[i]; break; }
  }

  if (rowIndex > -1) {
    const ano = filaRestaurar[0];
    let hojaDestino = libro.getSheetByName(ano.toString());
    if (!hojaDestino) {
      hojaDestino = libro.insertSheet(ano.toString());
      hojaDestino.appendRow(['Nombre SKU', 'Nombre Real', 'SKU FERT', 'SKU HAWA', 'Status', 'Observaciones']);
      hojaDestino.getRange("A1:F1").setBackground("#343a40").setFontColor("white").setFontWeight("bold");
    }
    
    hojaDestino.appendRow([filaRestaurar[1], filaRestaurar[2], filaRestaurar[3], filaRestaurar[4], filaRestaurar[5], filaRestaurar[6]]);
    papelera.deleteRow(rowIndex);
    return "Restaurado con éxito a su año original.";
  } else {
    throw new Error("SKU no encontrado en la papelera.");
  }
}

// 7. VACIAR PAPELERA (NUEVA)
function vaciarPapelera(anoFiltro) {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const papelera = libro.getSheetByName("Papelera");
  if (!papelera) return "No hay datos en la papelera.";

  if (anoFiltro === "TODOS") {
    if(papelera.getLastRow() > 1) {
      papelera.deleteRows(2, papelera.getLastRow() - 1);
    }
    return "La papelera ha sido vaciada por completo.";
  } else {
    // Borramos de abajo hacia arriba para no alterar los índices de las filas
    const data = papelera.getDataRange().getValues();
    let borradas = 0;
    for (let i = data.length - 1; i > 0; i--) {
      if (data[i][0].toString() === anoFiltro.toString()) {
        papelera.deleteRow(i + 1);
        borradas++;
      }
    }
    return `Se eliminaron permanentemente ${borradas} registros del año ${anoFiltro}.`;
  }
}