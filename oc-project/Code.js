function doGet() {
    return HtmlService.createTemplateFromFile('Index')
        .evaluate()
        .setTitle('Gestor de Pagos y Órdenes de Compra')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getInitialData() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Catálogo de Proveedores
    const sheetProv = ss.getSheetByName('id_proveedores');
    const dataProv = sheetProv.getDataRange().getValues();
    const suppliers = [];
    for (let i = 1; i < dataProv.length; i++) {
        if (dataProv[i][0]) {
            suppliers.push({
                name: dataProv[i][0],
                id: dataProv[i][1],
                asociado: dataProv[i][2]
            });
        }
    }

    // 2. Historial y Métricas
    const sheetOC = ss.getSheetByName('oc_pagos');
    const dataOC = sheetOC.getDataRange().getValues();
    const records = [];

    let totalOC = 0, finalizados = 0, enProceso = 0, atrasados = 0, pendientes = 0, cancelados = 0;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (let i = 1; i < dataOC.length; i++) {
        const row = dataOC[i];
        const status = row[7] ? row[7].toString().toUpperCase().trim() : '';
        const proveedorNombre = row[1];

        // Buscar asociado para la lógica de Barteleu
        let asociado = '';
        const provMatch = suppliers.find(s => s.name === proveedorNombre);
        if (provMatch) asociado = provMatch.asociado;

        if (status === 'CANCELADA') {
            cancelados++;
        } else {
            totalOC++; // Solo contamos las activas para el total
            if (status === 'FINALIZADO') finalizados++;
            if (status === 'EN PROCESO') enProceso++;
            if (status === 'PENDIENTE') pendientes++;

            if (row[8]) {
                const pDate = new Date(row[8]);
                if (status === 'EN PROCESO' && pDate < hoy) atrasados++;
            }
        }

        let pagoProgStr = row[8] ? Utilities.formatDate(new Date(row[8]), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '';
        let fechaStr = row[6] ? Utilities.formatDate(new Date(row[6]), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '';

        records.push({
            rowNum: i + 1,
            id: row[0],
            proveedor: proveedorNombre,
            asociado: asociado, // Nuevo dato para saber si es Barteleu
            oc: row[2] || 'S/N',
            ceCoste: row[3],
            cuentaMayor: row[4],
            comentarios: row[5],
            fecha: fechaStr,
            status: row[7],
            pagoProgramado: pagoProgStr
        });
    }

    return {
        suppliers: suppliers,
        records: records.reverse(), // Enviamos todos para poder filtrar en frontend
        metrics: { totalOC, finalizados, enProceso, atrasados, pendientes, cancelados }
    };
}

function guardarNuevaOC(form) {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('oc_pagos');
        const fechaVal = form.fecha ? new Date(form.fecha + 'T00:00:00') : new Date();
        const pagoProgVal = form.pagoProgramado ? new Date(form.pagoProgramado + 'T00:00:00') : '';
        const estatusInicial = (form.oc && form.oc.trim() !== '') ? 'EN PROCESO' : 'PENDIENTE';

        sheet.appendRow([form.id, form.proveedor, form.oc, form.ceCoste, form.cuentaMayor, form.comentarios, fechaVal, estatusInicial, pagoProgVal]);
        return { success: true };
    } catch (e) { return { success: false, error: e.toString() }; }
}

function cambiarEstatusOC(rowNum, nuevoEstatus) {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('oc_pagos');
        sheet.getRange(rowNum, 8).setValue(nuevoEstatus);
        return { success: true };
    } catch (e) { return { success: false, error: e.toString() }; }
}

function actualizarOC(rowNum, form) {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('oc_pagos');

        sheet.getRange(rowNum, 3).setValue(form.oc);
        sheet.getRange(rowNum, 4).setValue(form.ceCoste);
        sheet.getRange(rowNum, 5).setValue(form.cuentaMayor);
        sheet.getRange(rowNum, 6).setValue(form.comentarios);

        const currentStatus = sheet.getRange(rowNum, 8).getValue();
        if (currentStatus === 'PENDIENTE' && form.oc && form.oc.trim() !== '') {
            sheet.getRange(rowNum, 8).setValue('EN PROCESO');
        }
        return { success: true };
    } catch (e) { return { success: false, error: e.toString() }; }
}

function guardarNuevoProveedor(form) {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('id_proveedores');
        sheet.appendRow([form.nombre.toUpperCase(), form.id, form.asociado]);
        return { success: true };
    } catch (e) { return { success: false, error: e.toString() }; }
}

/**
 * NUEVA FUNCIÓN: Guarda en la pestaña oc_reembolsos
 */
function guardarOCReembolso(form) {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('oc_reembolsos');
        const fechaVal = form.fecha ? new Date(form.fecha + 'T00:00:00') : new Date();

        // Columnas: OC POLAQUIMI | ID | ASOCIADO | PROVEEDOR | OC | CE. COSTE | CUENTA MAYOR | COMENTARIOS | FECHA | STATUS
        sheet.appendRow([
            form.ocPadre,
            form.idNuevo,
            form.asociado,
            form.proveedorNuevo,
            form.ocNueva,
            form.ceCoste,
            form.cuentaMayor,
            form.comentarios,
            fechaVal,
            'FINALIZADO' // O el estatus por defecto que manejes en reembolsos
        ]);
        return { success: true };
    } catch (e) { return { success: false, error: e.toString() }; }
}