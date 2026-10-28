/**
 * ==============================================================================
 * DISEÑO UX / UI
 * ==============================================================================
 * (Rol: UX/UI)
 * @description
 * Asistente interactivo en 4 pasos, diseñado a partir de un mockup inicial.
 * 
 * DECISIONES DE EXPERIENCIA DE USUARIO (UX):
 * - Flujo guiado tipo Stepper para minimizar la sobrecarga cognitiva del usuario.
 * - Prevención de errores irreversibles: separación estricta entre vista previa,
 *   confirmación visual (Paso 3) y la ejecución destructiva en base de datos.
 * - Jerarquía visual y accesibilidad en el reporte de estados y descarga de rechazos.
 * ==============================================================================
 */

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { sileo } from "sileo";
import { useAuth } from "../../auth/AuthProvider";
import { almacenFirestore } from "../../importacion/almacenFirestore";
import { cargarContexto } from "../../importacion/contexto";
import { cuentasFirebase } from "../../importacion/cuentasFirebase";
import { ErrorRevalidacion, ejecutarImportacion } from "../../importacion/ejecutar";
import { ESQUEMAS } from "../../importacion/esquemas";
import { ErrorCandado } from "../../importacion/historial";
import { ErrorArchivo, leerExcel } from "../../importacion/leerExcel";
import { descargarArchivo, generarPlantilla, generarReporteRechazos } from "../../importacion/reporte";
import { MODOS, validar, validarEncabezados } from "../../importacion/validar";
import { ACTIONS, hasPermission } from "../../utils/roles";
import { RUTA_MODULO } from "./estados";
import ModalDetalleFila from "./ModalDetalleFila";
import { ModalCancelar, ModalConfirmar } from "./ModalesConfirmacion";
import Paso1Seleccion from "./Paso1Seleccion";
import Paso2VistaPrevia from "./Paso2VistaPrevia";
import Paso3Confirmacion from "./Paso3Confirmacion";
import Paso4Resultado from "./Paso4Resultado";
import StepperHeader from "./StepperHeader";

const BotonPrincipal = ({ children, ...props }) => (
  <button
    {...props}
    className="flex-1 sm:flex-none text-xs font-bold px-7 py-3 rounded-2xl flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white shadow-xl shadow-green-900/20 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
  >
    {children}
  </button>
);

export default function ImportacionWizard() {
  const { modulo } = useParams();
  const esquema = ESQUEMAS[modulo];
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const [paso, setPaso] = useState(1);
  const [modo, setModo] = useState(MODOS.SOLO_NUEVOS);
  const [archivo, setArchivo] = useState(null);
  const [lectura, setLectura] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [clasificacion, setClasificacion] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [filaDetalle, setFilaDetalle] = useState(null);
  const [modalCancelar, setModalCancelar] = useState(false);
  const [modalConfirmar, setModalConfirmar] = useState(false);
  const [ejecutando, setEjecutando] = useState(false);
  const [progreso, setProgreso] = useState(null);
  const [resultado, setResultado] = useState(null);

  // Mientras se escribe en la base, el navegador avisa antes de cerrar la pestaña
  useEffect(() => {
    if (!ejecutando) return undefined;
    const avisar = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [ejecutando]);

  const { mapa, ignorados } = useMemo(
    () => (lectura ? validarEncabezados(esquema, lectura.encabezados) : { mapa: {}, ignorados: [] }),
    [esquema, lectura],
  );
  const puedeVerModulo = hasPermission(role, esquema.moduloPermiso, ACTIONS.VIEW);
  const origen = puedeVerModulo ? esquema.nombre : "Importaciones";
  const volverAlOrigen = () => navigate(puedeVerModulo ? RUTA_MODULO[esquema.id] : "/importaciones");

  const reiniciar = () => {
    setPaso(1);
    setArchivo(null);
    setLectura(null);
    setError(null);
    setClasificacion(null);
    setAviso(null);
    setFiltro("todos");
    setBusqueda("");
    setProgreso(null);
    setResultado(null);
  };

  const seleccionarArchivo = async (elegido) => {
    setCargando(true);
    setError(null);
    try {
      const leido = await leerExcel(elegido, { topeFilas: esquema.topeFilas });
      const { faltantes } = validarEncabezados(esquema, leido.encabezados);
      if (faltantes.length) {
        throw new ErrorArchivo(
          "Faltan columnas obligatorias",
          `No se encontraron las columnas obligatorias: ${faltantes.join(", ")}. Descargá la plantilla para ver el formato.`,
        );
      }
      setArchivo(elegido);
      setLectura(leido);
    } catch (e) {
      setArchivo(null);
      setLectura(null);
      setError(e instanceof ErrorArchivo ? e : { titulo: "No se pudo leer el archivo", mensaje: e.message });
    } finally {
      setCargando(false);
    }
  };

  const irAVistaPrevia = async () => {
    setCargando(true);
    setError(null);
    try {
      const contexto = await cargarContexto(almacenFirestore, esquema);
      setClasificacion(validar({ esquema, encabezados: lectura.encabezados, filas: lectura.filas, modo, contexto }));
      setAviso(null);
      setFiltro("todos");
      setPaso(2);
    } catch (e) {
      console.error(e);
      setError({ titulo: "No se pudieron cargar los datos del sistema", mensaje: "Revisá tu conexión y volvé a intentar." });
    } finally {
      setCargando(false);
    }
  };

  const ejecutar = async () => {
    setModalConfirmar(false);
    if (!hasPermission(role, esquema.moduloPermiso, ACTIONS.IMPORT)) {
      sileo.error({ title: "Sin permiso", description: "Tu rol ya no tiene permiso para importar en este módulo." });
      return;
    }
    setEjecutando(true);
    setProgreso({ procesadas: 0, total: clasificacion.resumen.recibidos });
    setPaso(4);
    try {
      const r = await ejecutarImportacion({
        almacen: almacenFirestore,
        cuentas: cuentasFirebase,
        esquema,
        encabezados: lectura.encabezados,
        filas: lectura.filas,
        clasificacion,
        modo,
        archivo: { nombre: archivo.name, pesoBytes: archivo.size, hoja: lectura.hoja },
        usuario: { uid: user.uid, correo: user.email, rol: role },
        alAvanzar: setProgreso,
      });
      setResultado(r);
    } catch (e) {
      if (e instanceof ErrorRevalidacion) {
        setClasificacion(e.clasificacionNueva);
        setAviso("Los datos del sistema cambiaron desde la vista previa. Revisá la nueva clasificación antes de confirmar otra vez.");
        setPaso(2);
      } else if (e instanceof ErrorCandado) {
        sileo.error({ title: "Importación en curso", description: e.message });
        setPaso(3);
      } else {
        console.error(e);
        sileo.error({ title: "No se pudo completar la importación", description: e.message || "Error inesperado" });
        setPaso(3);
      }
    } finally {
      setEjecutando(false);
    }
  };

  const descargarPlantilla = async () =>
    descargarArchivo(await generarPlantilla(esquema), `plantilla_${esquema.id}.xlsx`);
  const descargarRechazos = async () =>
    descargarArchivo(await generarReporteRechazos(esquema, clasificacion.filas), `rechazados_${resultado?.folio || esquema.id}.xlsx`);

  const resumen = clasificacion?.resumen;
  const hayRechazos = (resumen?.rechazados ?? 0) > 0;

  return (
    <div className="pb-28 space-y-8">
      <StepperHeader
        pasoActual={paso}
        esquema={esquema}
        origen={origen}
        bloqueado={ejecutando}
        onVolver={() => (paso > 1 && paso < 4 ? setModalCancelar(true) : volverAlOrigen())}
        onIrAPaso={setPaso}
      />

      {paso === 1 && (
        <Paso1Seleccion
          esquema={esquema}
          modo={modo}
          onCambiarModo={setModo}
          archivo={archivo}
          lectura={lectura}
          columnasIgnoradas={ignorados}
          cargando={cargando}
          error={error}
          onCerrarError={() => setError(null)}
          onSeleccionarArchivo={seleccionarArchivo}
          onQuitarArchivo={reiniciar}
          onDescargarPlantilla={descargarPlantilla}
        />
      )}
      {paso === 2 && clasificacion && (
        <Paso2VistaPrevia
          esquema={esquema}
          clasificacion={clasificacion}
          mapa={mapa}
          filtro={filtro}
          onFiltro={setFiltro}
          busqueda={busqueda}
          onBusqueda={setBusqueda}
          onVerFila={setFilaDetalle}
          aviso={aviso}
        />
      )}
      {paso === 3 && clasificacion && (
        <Paso3Confirmacion esquema={esquema} archivo={archivo} lectura={lectura} clasificacion={clasificacion} modo={modo} />
      )}
      {paso === 4 && (
        <Paso4Resultado
          progreso={progreso}
          resultado={resultado}
          esquema={esquema}
          hayRechazos={hayRechazos}
          onDescargarRechazos={descargarRechazos}
          onVerHistorial={() => navigate("/importaciones")}
          onNueva={reiniciar}
        />
      )}

      {paso < 4 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-4 shadow-xl">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={() => (archivo ? setModalCancelar(true) : volverAlOrigen())}
              className="text-xs font-bold text-slate-500 hover:text-red-600 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-base">close</span>
              Cancelar importación
            </button>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {paso > 1 && (
                <button
                  onClick={() => setPaso(paso - 1)}
                  className="flex-1 sm:flex-none text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-5 py-3 rounded-2xl flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  Atrás
                </button>
              )}
              {paso === 1 && (
                <BotonPrincipal disabled={!lectura || !!error || cargando} onClick={irAVistaPrevia}>
                  Siguiente <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </BotonPrincipal>
              )}
              {paso === 2 && (
                <BotonPrincipal onClick={() => setPaso(3)}>
                  Siguiente <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </BotonPrincipal>
              )}
              {paso === 3 && (
                <BotonPrincipal disabled={resumen.nuevos + resumen.actualizar === 0} onClick={() => setModalConfirmar(true)}>
                  <span className="material-symbols-outlined text-base">check_circle</span> Confirmar importación
                </BotonPrincipal>
              )}
            </div>
          </div>
        </div>
      )}

      <ModalCancelar
        abierto={modalCancelar}
        onCerrar={() => setModalCancelar(false)}
        onConfirmar={() => {
          setModalCancelar(false);
          volverAlOrigen();
        }}
      />
      {resumen && (
        <ModalConfirmar abierto={modalConfirmar} onCerrar={() => setModalConfirmar(false)} onConfirmar={ejecutar} esquema={esquema} resumen={resumen} />
      )}
      <ModalDetalleFila fila={filaDetalle} esquema={esquema} onCerrar={() => setFilaDetalle(null)} />
    </div>
  );
}
