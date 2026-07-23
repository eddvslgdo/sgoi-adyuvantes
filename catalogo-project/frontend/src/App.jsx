import React, { useEffect, useState } from "react";
import { llamarBackend } from "./api";

function App() {
  const [vistaActual, setVistaActual] = useState("registro");
  const [productos, setProductos] = useState([]);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [error, setError] = useState(null);

  const [modoRegistro, setModoRegistro] = useState("maestro");
  const [codigoDesarrollo, setCodigoDesarrollo] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [idPadre, setIdPadre] = useState("");

  const [cargandoGlobal, setCargandoGlobal] = useState(false);
  const [modalBorrar, setModalBorrar] = useState({ activo: false, id: null });
  const [modalConvertir, setModalConvertir] = useState({
    activo: false,
    id: null,
    nuevoNombre: "",
  });
  const [modalRenombrar, setModalRenombrar] = useState({
    activo: false,
    id: null,
    nombreActual: "",
  });

  const [filasExpandidas, setFilasExpandidas] = useState({});
  const [productoDetalle, setProductoDetalle] = useState(null);

  const cargarProductos = async () => {
    try {
      const data = await llamarBackend("obtenerProductos");
      setProductos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al cargar:", err);
      setError("No se pudo conectar con la base de datos.");
    } finally {
      setCargandoInicial(false);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  const refrescarManual = async () => {
    setCargandoGlobal(true);
    await cargarProductos();
    setCargandoGlobal(false);
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();
    if (modoRegistro === "variante" && !idPadre) {
      alert("Selecciona a qué producto maestro pertenece esta variante.");
      return;
    }

    setCargandoGlobal(true);
    const insumoPLM = {
      codigoDesarrollo,
      nombreComercial,
      idPadre: modoRegistro === "variante" ? idPadre : "",
    };

    try {
      await llamarBackend("guardarProducto", insumoPLM);
      setCodigoDesarrollo("");
      setNombreComercial("");
      setIdPadre("");
      await cargarProductos();
      setVistaActual("inventario");
      if (modoRegistro === "variante") {
        setFilasExpandidas({ [idPadre]: true });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoGlobal(false);
    }
  };

  const confirmarBorrado = async () => {
    const id = modalBorrar.id;
    setModalBorrar({ activo: false, id: null });
    setCargandoGlobal(true);
    try {
      await llamarBackend("eliminarProducto", { id });
      await cargarProductos();
      if (productoDetalle && productoDetalle.id === id)
        setProductoDetalle(null);
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoGlobal(false);
    }
  };

  const prepararConversion = () => {
    setModalConvertir({
      activo: true,
      id: productoDetalle.id,
      nuevoNombre: "",
    });
    setProductoDetalle(null);
  };

  const ejecutarConversion = async () => {
    if (!modalConvertir.nuevoNombre.trim()) {
      alert(
        "Debes asignar un nombre comercial para poder graduar el producto.",
      );
      return;
    }
    setCargandoGlobal(true);
    try {
      await llamarBackend("convertirAMaestro", {
        id: modalConvertir.id,
        nuevoNombre: modalConvertir.nuevoNombre,
      });
      setModalConvertir({ activo: false, id: null, nuevoNombre: "" });
      await cargarProductos();
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoGlobal(false);
    }
  };

  const iniciarEdicion = (e, producto) => {
    e.stopPropagation();
    setModalRenombrar({
      activo: true,
      id: producto.id,
      nombreActual: producto.nombreComercial || "",
    });
  };

  const ejecutarRenombrado = async () => {
    setCargandoGlobal(true);
    try {
      await llamarBackend("editarProducto", {
        id: modalRenombrar.id,
        nuevoNombre: modalRenombrar.nombreActual,
      });
      if (productoDetalle && productoDetalle.id === modalRenombrar.id) {
        setProductoDetalle((prev) => ({
          ...prev,
          nombreComercial: modalRenombrar.nombreActual,
        }));
      }
      setModalRenombrar({ activo: false, id: null, nombreActual: "" });
      await cargarProductos();
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoGlobal(false);
    }
  };

  const prepararNuevaVarianteDesdeTabla = (e, padreId) => {
    e.stopPropagation();
    setModoRegistro("variante");
    setIdPadre(padreId);
    setVistaActual("registro");
  };

  const toggleExpandirFila = (padreId) => {
    setFilasExpandidas((prev) => {
      if (prev[padreId]) return {};
      return { [padreId]: true };
    });
  };

  const abrirModalDetalles = (producto) => {
    setProductoDetalle(producto);
  };

  const productosMaestros = productos.filter((p) => !p.idPadre);
  const obtenerVariantes = (padreId) =>
    productos.filter((p) => p.idPadre == padreId);

  const renderizarFilaJSX = (p, esVariante = false) => {
    const variantes = esVariante ? [] : obtenerVariantes(p.id);
    const estaExpandido = filasExpandidas[p.id];

    return (
      <React.Fragment key={`frag-${p.id}`}>
        <tr
          className={
            esVariante
              ? "fila-variante fila-clickable"
              : "fila-maestro fila-clickable"
          }
          onClick={() => {
            if (!esVariante && variantes.length > 0) {
              toggleExpandirFila(p.id);
            } else {
              abrirModalDetalles(p);
            }
          }}
        >
          <td data-label="Código R&D">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {!esVariante && variantes.length > 0 ? (
                <button
                  className="btn-chevron"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpandirFila(p.id);
                  }}
                >
                  {estaExpandido ? "▼" : "▶"}
                </button>
              ) : (
                !esVariante && (
                  <div style={{ width: "24px", flexShrink: 0 }}></div>
                )
              )}
              {esVariante && (
                <span
                  style={{
                    color: "#94a3b8",
                    marginLeft: "32px",
                    fontWeight: "bold",
                  }}
                >
                  ↳
                </span>
              )}
              <span className="code-text">{p.codigoDesarrollo || "N/A"}</span>
            </div>
          </td>

          <td data-label="Nombre Comercial">
            <div className="td-value">
              <span
                style={{
                  fontWeight: p.nombreComercial ? "bold" : "normal",
                  fontStyle: p.nombreComercial ? "normal" : "italic",
                  color: p.nombreComercial ? "#000" : "#888",
                }}
              >
                {p.nombreComercial || "En Desarrollo (Fase R&D)"}
              </span>
            </div>
          </td>

          <td data-label="Acciones">
            <div className="acciones-grupo">
              {/* MAGIA: El botón Detalles AHORA SOLO APARECE EN LOS MAESTROS */}
              {!esVariante && (
                <button
                  className="btn-accion btn-detalles"
                  onClick={(e) => {
                    e.stopPropagation();
                    abrirModalDetalles(p);
                  }}
                >
                  👁️ Detalles
                </button>
              )}

              {!esVariante && (
                <button
                  className="btn-accion btn-variante"
                  onClick={(e) => prepararNuevaVarianteDesdeTabla(e, p.id)}
                  title="Añadir Variante"
                >
                  + Variante
                </button>
              )}

              {/* Botones para Escritorio (Iconos minimalistas) */}
              <button
                className="btn-icon-minimal btn-editar-min hide-mobile"
                onClick={(e) => iniciarEdicion(e, p)}
                title="Editar Nombre"
              >
                ✏️
              </button>
              <button
                className="btn-icon-minimal btn-borrar-min hide-mobile"
                onClick={(e) => {
                  e.stopPropagation();
                  setModalBorrar({ activo: true, id: p.id });
                }}
                title="Borrar Insumo"
              >
                🗑️
              </button>

              {/* Botones para Celular (Sólidos y con texto) */}
              <button
                className="btn-accion btn-editar-solid show-mobile"
                onClick={(e) => iniciarEdicion(e, p)}
              >
                ✏️ Editar
              </button>
              <button
                className="btn-accion btn-borrar-solid show-mobile"
                onClick={(e) => {
                  e.stopPropagation();
                  setModalBorrar({ activo: true, id: p.id });
                }}
              >
                🗑️ Borrar
              </button>
            </div>
          </td>
        </tr>

        {!esVariante &&
          estaExpandido &&
          variantes.map((variante) => renderizarFilaJSX(variante, true))}
      </React.Fragment>
    );
  };

  return (
    <div className="app-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body, html { margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Inter', sans-serif; color: #0f172a; }
        * { box-sizing: border-box; }

        .spinner { border: 4px solid rgba(255, 255, 255, 0.3); border-top: 4px solid #ffffff; border-radius: 50%; width: 45px; height: 45px; animation: girar 1s linear infinite; }
        @keyframes girar { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        .overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(5px); display: flex; justify-content: center; align-items: center; z-index: 9999; padding: 20px; }
        .modal-card { background: #ffffff; padding: 30px; border-radius: 12px; text-align: center; max-width: 420px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); position: relative; }
        
        .modal-detalles-grande { max-width: 800px; width: 100%; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); position: relative; display: flex; flex-direction: column; max-height: 90vh; }
        .modal-detalles-header { background: #2c3e50; padding: 25px 30px; color: #fff; display: flex; justify-content: space-between; align-items: flex-start; }
        .modal-detalles-body { padding: 30px; overflow-y: auto; text-align: left; }
        .btn-cerrar-modal { background: rgba(255,255,255,0.1); border: none; color: #fff; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; justify-content: center; align-items: center; transition: 0.2s; }
        .btn-cerrar-modal:hover { background: rgba(255,255,255,0.25); }
        
        .dropzones-container { display: flex; gap: 15px; margin-top: 15px; flex-wrap: wrap; }
        .dropzone-box { flex: 1; min-width: 120px; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 25px 15px; text-align: center; background: #f8fafc; color: #64748b; transition: all 0.2s; cursor: pointer; display: flex; flex-direction: column; align-items: center; }
        .dropzone-box:hover { border-color: #0284c7; background: #f0f9ff; color: #0284c7; }
        .dropzone-icon { font-size: 28px; margin-bottom: 8px; }

        .app-wrapper { min-height: 100vh; display: flex; flex-direction: column; }
        .app-container { padding: 30px; max-width: 1300px; margin: 0 auto; width: 100%; flex-grow: 1; }

        .header-nav { background: #ffffff; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 10px rgba(0,0,0,0.03); width: 100%; }
        .header-inner { max-width: 1300px; margin: 0 auto; padding: 0 30px; height: 75px; display: flex; align-items: center; justify-content: flex-start; gap: 40px; }
        .header-title { margin: 0; color: #2c3e50; font-size: 1.5rem; font-weight: 800; }
        .nav-tabs { display: flex; height: 100%; }
        .tab-btn { padding: 0 25px; font-size: 15px; font-weight: 600; border: none; cursor: pointer; background: transparent; color: #64748b; border-bottom: 4px solid transparent; transition: all 0.2s ease; display: flex; align-items: center; gap: 8px; height: 100%; }
        .tab-btn:hover { color: #2c3e50; background: #f8fafc; }
        .tab-btn.active { color: #1b5e20; border-bottom: 4px solid #1b5e20; background: #f8fafc; }

        .card-view { background: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; }
        .modo-btn-container { display: flex; gap: 12px; margin-bottom: 25px; }
        .modo-btn { flex: 1; padding: 14px; border: 2px solid #e2e8f0; border-radius: 8px; background: #f8fafc; cursor: pointer; font-weight: 600; font-size: 14px; color: #64748b; transition: all 0.2s ease; }
        .modo-btn.active-maestro { border-color: #1b5e20; background: #e8f5e9; color: #1b5e20; }
        .modo-btn.active-variante { border-color: #e65100; background: #fff3e0; color: #e65100; }
        
        .form-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .form-label { font-size: 13px; font-weight: 600; color: #475569; }
        .form-input { padding: 12px 16px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 14px; outline: none; transition: all 0.2s; color: #0f172a; background: #fff; width: 100%; }
        .form-input:focus { border-color: #1b5e20; box-shadow: 0 0 0 3px rgba(27,94,32,0.1); }
        .btn-submit { background: #2c3e50; color: #fff; padding: 14px; border-radius: 8px; font-weight: 600; border: none; cursor: pointer; margin-top: 10px; transition: background 0.2s; }
        .btn-submit:hover { background: #1a252f; }

        .table-wrapper { background: #ffffff; border-radius: 10px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); overflow: hidden; border: 1px solid #e2e8f0; }
        .tabla-plm { width: 100%; border-collapse: collapse; text-align: left; table-layout: fixed; }
        .tabla-plm th:nth-child(1) { width: 25%; }
        .tabla-plm th:nth-child(2) { width: 35%; }
        .tabla-plm th:nth-child(3) { width: 40%; text-align: right; }

        .tabla-plm th { background: #2c3e50; color: #ffffff; padding: 16px 24px; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
        .tabla-plm td { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 14px; vertical-align: middle; word-wrap: break-word; }
        
        .fila-clickable { cursor: pointer; transition: background 0.15s ease, box-shadow 0.15s ease; }
        .fila-maestro { background-color: #ffffff; }
        .fila-maestro:hover { background-color: #f8fafc; box-shadow: inset 4px 0 0 #0284c7; }
        .fila-variante { background-color: #f8fafc; }
        .fila-variante:hover { background-color: #f1f5f9; box-shadow: inset 4px 0 0 #0284c7; }

        .code-text { font-family: monospace; background: #e2e8f0; padding: 4px 8px; border-radius: 6px; font-size: 13px; color: #1e293b; font-weight: 600; white-space: nowrap; }
        .badge { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; letter-spacing: 0.3px; }

        .btn-chevron { width: 24px; height: 24px; border-radius: 4px; background: transparent; border: none; outline: none; cursor: pointer; color: #64748b; font-size: 10px; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .btn-chevron:hover { background: #e2e8f0; color: #0f172a; }
        .btn-chevron:focus { outline: none; }

/* --- BOTONES DE ACCIÓN TOTALMENTE UNIFICADOS Y SIMÉTRICOS --- */
        .acciones-grupo { 
          display: flex; 
          gap: 8px; 
          align-items: center; 
          justify-content: flex-end; 
          flex-wrap: wrap; 
        }
        
        .btn-accion { 
          height: 36px; /* 🔒 ALTO FIJO ESTRICTO PARA TODOS */
          padding: 0 14px; /* Eliminamos el padding vertical para que el alto mande */
          border: none; 
          border-radius: 6px; 
          cursor: pointer; 
          font-weight: 600; 
          font-size: 13px; 
          color: #fff; 
          transition: all 0.2s ease; 
          display: inline-flex; 
          align-items: center; 
          justify-content: center; 
          gap: 6px; 
          text-decoration: none; 
          box-sizing: border-box; /* Asegura que el alto incluya bordes si los hay */
          white-space: nowrap; /* Evita que el texto intente bajarse */
        }
        
        .btn-accion:hover { 
          opacity: 0.85; 
          transform: translateY(-1px); 
          box-shadow: 0 4px 6px rgba(0,0,0,0.08); 
        }
        
        /* Colores sólidos y limpios */
        .btn-detalles { background: #8b5cf6; }
        .btn-variante { background: #0288d1; }
        .btn-editar-solid { background: #f57c00; }
        .btn-borrar-solid { background: #dc2626; } /* Rojo sólido definitivo */

        /* Estilos de los modales (Se mantienen igual) */
        .btn-drive-large { background: #4338ca; color: #fff !important; font-size: 14px; padding: 12px 24px; border-radius: 8px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none; transition: 0.2s; font-weight: 600; }
        .btn-drive-large:hover { background: #3730a3; }
        .btn-convertir { background: #10b981; color: #fff; font-size: 14px; padding: 10px 16px; border-radius: 8px; font-weight: 600; border: none; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 6px; width: 100%; justify-content: center; margin-top: 15px; }
        .btn-convertir:hover { background: #059669; }

        /* MAGIA: AQUÍ REGRESA LA CLASE DEL BOTÓN DE DRIVE */
        .btn-drive-large { background: #4338ca; color: #fff !important; font-size: 14px; padding: 12px 24px; border-radius: 8px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none; transition: 0.2s; font-weight: 600; }
        .btn-drive-large:hover { background: #3730a3; }

        .show-mobile { display: none !important; }
        .btn-editar-solid { background: #f57c00; color: #fff; }
        .btn-borrar-solid { background: #dc2626; color: #fff; }

        @media (max-width: 768px) {
          .app-container { padding: 12px; }
          .header-inner { flex-direction: column; height: auto; padding: 16px 15px 0 15px; gap: 12px; }
          .header-title { text-align: center; width: 100%; }
          .nav-tabs { width: 100%; justify-content: space-between; }
          .tab-btn { flex: 1; justify-content: center; padding: 12px 0; font-size: 14px; }
          .modo-btn-container { flex-direction: column; gap: 10px; }

          .table-wrapper { background: transparent; border: none; box-shadow: none; overflow: visible; }
          .tabla-plm, .tabla-plm tbody, .tabla-plm tr, .tabla-plm td { display: block; width: 100%; }
          .tabla-plm thead { display: none; }
          
          .tabla-plm tr { background: #ffffff; margin-bottom: 16px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.04); padding: 16px 12px; position: relative; }
          .fila-variante { border-left: 4px solid #0284c7 !important; background: #f8fafc; }

          .tabla-plm td { padding: 10px 0; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
          .tabla-plm td:last-child { border-bottom: none; padding-bottom: 0; padding-top: 16px; }
          .tabla-plm td::before { content: attr(data-label) ":"; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; flex-shrink: 0; text-align: left; }
          .td-value { flex-grow: 1; text-align: right; display: flex; justify-content: flex-end; align-items: center; word-break: break-word; }
          
          .hide-mobile { display: none !important; }
          .show-mobile { display: inline-flex !important; }

          .tabla-plm td[data-label="Acciones"] { flex-direction: column; align-items: stretch; border-top: 1px dashed #e2e8f0; margin-top: 8px; }
          .tabla-plm td[data-label="Acciones"]::before { display: none; }
          
          .acciones-grupo { width: 100%; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; }
          .btn-accion { flex: 1; min-width: calc(50% - 8px); justify-content: center; padding: 10px 4px; font-size: 12.5px; }
        }
      `}</style>

      {(cargandoGlobal ||
        modalBorrar.activo ||
        modalConvertir.activo ||
        modalRenombrar.activo) && (
        <div className="overlay" style={{ zIndex: 10000 }}>
          {cargandoGlobal && (
            <div style={{ textAlign: "center" }}>
              <div className="spinner" style={{ margin: "0 auto" }}></div>
              <p
                style={{ color: "#fff", marginTop: "15px", fontWeight: "bold" }}
              >
                Procesando en la nube...
              </p>
            </div>
          )}

          {modalBorrar.activo && !cargandoGlobal && (
            <div className="modal-card">
              <h2
                style={{ marginTop: 0, color: "#d32f2f", fontSize: "1.2rem" }}
              >
                ⚠️ Confirmar Eliminación
              </h2>
              <p
                style={{
                  color: "#555",
                  marginBottom: "20px",
                  fontSize: "14px",
                }}
              >
                Esta acción no se puede deshacer. ¿Continuar?
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setModalBorrar({ activo: false, id: null })}
                  style={{
                    flex: 1,
                    padding: "12px",
                    border: "none",
                    borderRadius: "6px",
                    background: "#e0e0e0",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarBorrado}
                  style={{
                    flex: 1,
                    padding: "12px",
                    border: "none",
                    borderRadius: "6px",
                    background: "#d32f2f",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          )}

          {modalConvertir.activo && !cargandoGlobal && (
            <div className="modal-card">
              <div
                style={{
                  background: "#ecfdf5",
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 15px auto",
                  fontSize: "24px",
                }}
              >
                🚀
              </div>
              <h2
                style={{ marginTop: 0, color: "#0f172a", fontSize: "1.3rem" }}
              >
                Graduar a Maestro
              </h2>
              <p
                style={{
                  color: "#64748b",
                  fontSize: "14px",
                  marginBottom: "20px",
                  lineHeight: "1.5",
                }}
              >
                Asigna su <b>Nombre Comercial</b> definitivo:
              </p>
              <input
                type="text"
                autoFocus
                className="form-input"
                placeholder="Ej. Liquid Max PRO"
                style={{
                  width: "100%",
                  marginBottom: "20px",
                  padding: "14px",
                  fontSize: "15px",
                  textAlign: "center",
                }}
                value={modalConvertir.nuevoNombre}
                onChange={(e) =>
                  setModalConvertir({
                    ...modalConvertir,
                    nuevoNombre: e.target.value,
                  })
                }
              />
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() =>
                    setModalConvertir({
                      activo: false,
                      id: null,
                      nuevoNombre: "",
                    })
                  }
                  style={{
                    flex: 1,
                    padding: "12px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#f1f5f9",
                    color: "#475569",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={ejecutarConversion}
                  style={{
                    flex: 1,
                    padding: "12px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#10b981",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}

          {modalRenombrar.activo && !cargandoGlobal && (
            <div className="modal-card">
              <div
                style={{
                  background: "#fff7ed",
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 15px auto",
                  fontSize: "24px",
                }}
              >
                ✏️
              </div>
              <h2
                style={{ marginTop: 0, color: "#0f172a", fontSize: "1.3rem" }}
              >
                Editar Nombre Comercial
              </h2>
              <p
                style={{
                  color: "#64748b",
                  fontSize: "14px",
                  marginBottom: "20px",
                  lineHeight: "1.5",
                }}
              >
                Escribe el nuevo nombre para este insumo:
              </p>
              <input
                type="text"
                autoFocus
                className="form-input"
                placeholder="Nombre comercial"
                style={{
                  width: "100%",
                  marginBottom: "20px",
                  padding: "14px",
                  fontSize: "15px",
                  textAlign: "center",
                }}
                value={modalRenombrar.nombreActual}
                onChange={(e) =>
                  setModalRenombrar({
                    ...modalRenombrar,
                    nombreActual: e.target.value,
                  })
                }
              />
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() =>
                    setModalRenombrar({
                      activo: false,
                      id: null,
                      nombreActual: "",
                    })
                  }
                  style={{
                    flex: 1,
                    padding: "12px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#f1f5f9",
                    color: "#475569",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={ejecutarRenombrado}
                  style={{
                    flex: 1,
                    padding: "12px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#f57c00",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {productoDetalle && !cargandoGlobal && (
        <div className="overlay" onClick={() => setProductoDetalle(null)}>
          <div
            className="modal-detalles-grande"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-detalles-header">
              <div>
                <span
                  className="badge"
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    color: "#fff",
                    marginBottom: "10px",
                  }}
                >
                  {productoDetalle.idPadre
                    ? "ADN Variante"
                    : "Producto Maestro"}
                </span>
                <h2
                  style={{
                    margin: "0 0 5px 0",
                    fontSize: "1.8rem",
                    wordBreak: "break-all",
                  }}
                >
                  {productoDetalle.nombreComercial ||
                    productoDetalle.codigoDesarrollo}
                </h2>
                <p
                  style={{
                    margin: 0,
                    opacity: 0.8,
                    fontFamily: "monospace",
                    fontSize: "14px",
                  }}
                >
                  {productoDetalle.nombreComercial
                    ? productoDetalle.codigoDesarrollo
                    : "En Desarrollo (Fase R&D)"}
                </p>
              </div>
              <button
                className="btn-cerrar-modal"
                onClick={() => setProductoDetalle(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-detalles-body">
              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 250px" }}>
                  <h3
                    style={{
                      color: "#0f172a",
                      borderBottom: "2px solid #e2e8f0",
                      paddingBottom: "10px",
                      marginTop: 0,
                    }}
                  >
                    Detalles Técnicos
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "15px",
                      marginTop: "15px",
                    }}
                  >
                    <div>
                      <span className="form-label">
                        ID Interno de Base de Datos:
                      </span>
                      <p style={{ margin: "5px 0 0 0", color: "#334155" }}>
                        #{productoDetalle.id}
                      </p>
                    </div>
                    {productoDetalle.idPadre && (
                      <div>
                        <span className="form-label">
                          Derivado del Padre ID:
                        </span>
                        <p style={{ margin: "5px 0 0 0", color: "#334155" }}>
                          #{productoDetalle.idPadre}
                        </p>
                        <button
                          className="btn-convertir"
                          onClick={prepararConversion}
                        >
                          🚀 Convertir a Producto
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ flex: "1 1 350px" }}>
                  <h3
                    style={{
                      color: "#0f172a",
                      borderBottom: "2px solid #e2e8f0",
                      paddingBottom: "10px",
                      marginTop: 0,
                    }}
                  >
                    Repositorio de Archivos
                  </h3>
                  <div style={{ marginTop: "15px" }}>
                    {productoDetalle.folderUrl ? (
                      <a
                        href={productoDetalle.folderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-drive-large"
                      >
                        📂 Abrir Carpeta Maestra en Drive
                      </a>
                    ) : (
                      <p style={{ color: "#ef4444", fontWeight: "bold" }}>
                        ⚠️ Este producto no tiene un repositorio vinculado.
                      </p>
                    )}
                    <div className="dropzones-container">
                      <div className="dropzone-box">
                        <div className="dropzone-icon">📄</div>
                        <div style={{ fontWeight: "bold", fontSize: "13px" }}>
                          Ficha Técnica (FT)
                        </div>
                        <div style={{ fontSize: "11px", marginTop: "5px" }}>
                          Arrastra aquí
                        </div>
                      </div>
                      <div className="dropzone-box">
                        <div className="dropzone-icon">🧪</div>
                        <div style={{ fontWeight: "bold", fontSize: "13px" }}>
                          Seguridad (HDS)
                        </div>
                        <div style={{ fontSize: "11px", marginTop: "5px" }}>
                          Arrastra aquí
                        </div>
                      </div>
                    </div>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#94a3b8",
                        textAlign: "center",
                        marginTop: "10px",
                      }}
                    >
                      *Los archivos se subirán a la subcarpeta correspondiente
                      en Google Drive.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="header-nav">
        <div className="header-inner">
          <h2 className="header-title">Sistema PLM</h2>
          <div className="nav-tabs">
            <button
              className={`tab-btn ${vistaActual === "registro" ? "active" : ""}`}
              onClick={() => setVistaActual("registro")}
            >
              📝 Registro
            </button>
            <button
              className={`tab-btn ${vistaActual === "inventario" ? "active" : ""}`}
              onClick={() => setVistaActual("inventario")}
            >
              🗄️ Catálogo
            </button>
          </div>
        </div>
      </header>

      <main className="app-container">
        {vistaActual === "registro" && (
          <div className="card-view">
            <h3
              style={{
                marginTop: 0,
                borderBottom: "1px solid #eee",
                paddingBottom: "10px",
              }}
            >
              Nuevo Ingreso
            </h3>
            <div className="modo-btn-container">
              <button
                type="button"
                className={`modo-btn ${modoRegistro === "maestro" ? "active-maestro" : ""}`}
                onClick={() => {
                  setModoRegistro("maestro");
                  setIdPadre("");
                }}
              >
                📦 Producto Maestro
              </button>
              <button
                type="button"
                className={`modo-btn ${modoRegistro === "variante" ? "active-variante" : ""}`}
                onClick={() => setModoRegistro("variante")}
              >
                🧬 Añadir Variante
              </button>
            </div>
            <form onSubmit={manejarEnvio}>
              {modoRegistro === "variante" && (
                <div className="form-group">
                  <label className="form-label">Selecciona el Maestro:</label>
                  <select
                    className="form-input"
                    value={idPadre}
                    onChange={(e) => setIdPadre(e.target.value)}
                    required
                  >
                    <option value="">-- Elige un producto --</option>
                    {productosMaestros.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombreComercial || p.codigoDesarrollo}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Código R&D / Desarrollo:</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Ej: DP-14-16/2026"
                  value={codigoDesarrollo}
                  onChange={(e) => setCodigoDesarrollo(e.target.value)}
                  required
                />
              </div>
              {modoRegistro === "maestro" && (
                <div className="form-group">
                  <label className="form-label">
                    Nombre Comercial (Opcional):
                  </label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Fase de desarrollo (Vacío)"
                    value={nombreComercial}
                    onChange={(e) => setNombreComercial(e.target.value)}
                  />
                </div>
              )}
              <button
                type="submit"
                className="btn-submit"
                style={{ width: "100%" }}
              >
                Guardar Registro
              </button>
            </form>
          </div>
        )}

        {vistaActual === "inventario" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <h3 style={{ margin: 0 }}>Catálogo Activo</h3>
              <button
                onClick={refrescarManual}
                style={{
                  padding: "8px 15px",
                  background: "#fff",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                🔄 Refrescar
              </button>
            </div>

            {cargandoInicial && (
              <p style={{ textAlign: "center", padding: "20px" }}>
                Cargando datos...
              </p>
            )}

            {!cargandoInicial && !error && (
              <div className="table-wrapper">
                <table className="tabla-plm">
                  <thead>
                    <tr>
                      <th>Código R&D</th>
                      <th>Nombre Comercial</th>
                      <th style={{ textAlign: "right" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosMaestros.map((p) => renderizarFilaJSX(p, false))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
