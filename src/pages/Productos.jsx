import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase/firebase";
import { useAuth } from "../auth/AuthProvider";

// ── Componente de Celda de Stock ─────────────────────────────
function StockCell({ product }) {
  if (!product.active)
    return (
      <span className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">
        Inactivo
      </span>
    );
  if (product.status === "out")
    return (
      <div className="flex items-center gap-2 text-red-600">
        <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
        <span className="text-sm font-black uppercase">Agotado</span>
      </div>
    );
  if (product.status === "low")
    return (
      <div className="flex items-center gap-2 text-amber-700">
        <div className="w-2 h-2 rounded-full bg-amber-600" />
        <span className="text-sm font-semibold">{product.stock} (Bajo)</span>
      </div>
    );
  return (
    <div className="flex items-center gap-2 text-slate-700">
      <div className="w-2 h-2 rounded-full bg-green-700" />
      <span className="text-sm font-semibold">
        {product.stock.toLocaleString()} ud
      </span>
    </div>
  );
}

export default function Productos() {
  const { userName, role: authRole } = useAuth();
  const [productsData, setProductsData] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(
    "Todos los productos",
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [parametros, setParametros] = useState({ porcentajeInteres: 15 });

  // Suscripción a Firebase - Productos
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "productos"), (snapshot) => {
      setProductsData(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    });
    return () => unsub();
  }, []);

  // Suscripción a Firebase - Categorías
  useEffect(() => {
    const unsubCat = onSnapshot(collection(db, "categorias"), (snapshot) => {
      setCategorias(
        snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            nombre: data.nombre || data.categoria || data.descripcion || doc.id
          };
        })
      );
    });
    const unsubParam = onSnapshot(doc(db, "parametros", "general"), (docSnap) => {
      if (docSnap.exists()) {
        setParametros(docSnap.data());
      }
    });
    return () => {
      unsubCat();
      unsubParam();
    };
  }, []);

  // Lógica de Mapeo de Productos
  const products = useMemo(() => {
    return productsData.map((p) => {
      let dynStatus = "ok";
      if (p.stock <= 10) dynStatus = "out";
      else if (p.stock <= 20) dynStatus = "low";

      return {
        ...p,
        id: p.id,
        name: p.nombre || "Sin Nombre",
        sku: p.productoId || p.id.substring(0, 6).toUpperCase(),
        category: p.categoria || "Sin categoría",
        price: `L ${p.precioContado || 0}`,
        priceNum: p.precioContado || 0,
        stock: p.stock || 0,
        status: dynStatus,
        active: p.estado !== "Inactivo",
        img: p.imagenUrl || "https://via.placeholder.com/150?text=Sin+Foto",
      };
    });
  }, [productsData]);

  // Lógica de Filtrado
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        selectedCategory === "Todos los productos" ||
        p.category === selectedCategory;
      const matchesStatus =
        statusFilter === "all" ? true : p.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [search, products, selectedCategory, statusFilter]);

  // Contadores para filtros
  const counts = useMemo(
    () => ({
      all: products.filter((p) => p.active).length,
      low: products.filter((p) => p.status === "low" && p.active).length,
      out: products.filter((p) => p.status === "out" && p.active).length,
    }),
    [products],
  );

  // ── Función de Reporte (HTML imprimible) ────────────────────────
  const handleExportReport = (type) => {
    let listToExport = [];
    let statusLabel = "TODOS LOS PRODUCTOS";

    if (type === "ok") {
      listToExport = filtered.filter((p) => p.status === "ok");
      statusLabel = "PRODUCTOS EN STOCK";
    } else if (type === "low") {
      listToExport = filtered.filter((p) => p.status === "low");
      statusLabel = "ALERTA DE BAJO STOCK";
    } else if (type === "out") {
      listToExport = filtered.filter((p) => p.status === "out");
      statusLabel = "PRODUCTOS AGOTADOS";
    } else {
      listToExport = filtered;
    }

    const totalItems = listToExport.length;
    const stockTotal = listToExport.reduce((acc, curr) => acc + curr.stock, 0);
    const dateStr = new Date().toLocaleDateString("es-HN");

    const reportHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8"/>
        <title>Reporte de Inventario - Comisariato Pro</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800&family=Inter:wght@400;600&display=swap" rel="stylesheet"/>
        <style>
          @media print { @page { size: A4; margin: 0; } body { background-color: white !important; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } }
          .a4-canvas { width: 210mm; min-height: 297mm; background-color: white; margin: 0 auto; padding: 3rem; }
          body { font-family: 'Inter', sans-serif; }
          .font-headline { font-family: 'Manrope', sans-serif; }
        </style>
      </head>
      <body class="bg-gray-100">
        <div class="a4-canvas shadow-2xl flex flex-col mx-auto my-8">
          <header class="w-full pb-4 border-b-2 border-[#00450d] flex justify-between items-end mb-10">
            <div class="flex flex-col">
              <span class="text-2xl font-extrabold tracking-tighter text-[#00450d] font-headline uppercase">COMISARIATO PRO</span>
              <span class="font-headline uppercase tracking-widest text-[11px] font-bold text-[#00450d] mt-1">${statusLabel} - ${dateStr}</span>
            </div>
            <div class="text-right text-[#00450d] font-headline font-bold text-[10px] tracking-widest">ID-INV-${Date.now().toString().slice(-6)}</div>
          </header>

          <section class="grid grid-cols-3 gap-6 mb-10">
            <div class="bg-[#f2f4f2] p-5 border-l-4 border-[#00450d]">
              <p class="font-headline text-[9px] uppercase tracking-wider text-gray-500 mb-1">Total de SKUs</p>
              <p class="text-xl font-bold text-[#00450d] font-headline">${totalItems}</p>
            </div>
            <div class="bg-[#f2f4f2] p-5 border-l-4 border-[#523327]">
              <p class="font-headline text-[9px] uppercase tracking-wider text-gray-500 mb-1">Unidades Existentes</p>
              <p class="text-xl font-bold text-[#523327] font-headline">${stockTotal.toLocaleString()}</p>
            </div>
            <div class="bg-[#00450d] p-5 text-white">
              <p class="font-headline text-[9px] uppercase tracking-wider text-green-200 mb-1">Estado Filtro</p>
              <p class="text-xl font-bold font-headline uppercase">${type}</p>
            </div>
          </section>

          <section class="flex-grow">
            <table class="w-full text-left border-collapse">
              <thead class="bg-[#e1e3e1]">
                <tr>
                  <th class="px-4 py-3 font-headline font-bold text-[10px] uppercase tracking-wider text-[#00450d]">SKU</th>
                  <th class="px-4 py-3 font-headline font-bold text-[10px] uppercase tracking-wider text-[#00450d]">Producto</th>
                  <th class="px-4 py-3 font-headline font-bold text-[10px] uppercase tracking-wider text-[#00450d]">Categoría</th>
                  <th class="px-4 py-3 font-headline font-bold text-[10px] uppercase tracking-wider text-[#00450d] text-right">Stock</th>
                  <th class="px-4 py-3 font-headline font-bold text-[10px] uppercase tracking-wider text-[#00450d] text-right">Precio</th>
                </tr>
              </thead>
              <tbody class="text-[12px]">
                ${listToExport
                  .map(
                    (p) => `
                  <tr class="border-b border-gray-100">
                    <td class="px-4 py-3 font-mono text-gray-400">${p.sku}</td>
                    <td class="px-4 py-3 font-bold text-gray-800">${p.name}</td>
                    <td class="px-4 py-3 text-gray-500">${p.category}</td>
                    <td class="px-4 py-3 font-bold text-right ${p.status === "out" ? "text-red-600" : "text-gray-700"}">${p.stock}</td>
                    <td class="px-4 py-3 font-bold text-[#00450d] text-right">${p.price}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </section>

          <footer class="mt-auto border-t border-gray-100 pt-12 pb-6">
            <div class="grid grid-cols-2 gap-12 w-full px-4 mb-8">
              <div class="flex flex-col items-center">
                <div class="w-full border-b border-gray-400 mb-2"></div>
                <p class="font-headline text-[9px] uppercase tracking-wider font-bold text-[#00450d]">Encargado de Almacén</p>
              </div>
              <div class="flex flex-col items-center">
                <div class="w-full border-b border-gray-400 mb-2"></div>
                <p class="font-headline text-[9px] uppercase tracking-wider font-bold text-[#00450d]">Gerencia General</p>
              </div>
            </div>
            <div class="flex justify-between items-end pt-4 border-t border-green-50">
              <p class="font-headline text-[8px] uppercase tracking-wider text-gray-400 italic text-left">Documento confidencial - Comisariato Pro HN.</p>
              <p class="font-headline text-[9px] uppercase tracking-wider font-bold text-[#00450d]">Emisión: ${dateStr}</p>
            </div>
          </footer>
        </div>
        <div class="fixed bottom-8 right-8 no-print">
          <button onclick="window.print()" class="bg-[#00450d] text-white px-8 py-3 rounded-full font-bold shadow-xl">Imprimir Reporte</button>
        </div>
      </body>
      </html>
    `;

    const printWin = window.open("", "_blank");
    printWin.document.write(reportHtml);
    printWin.document.close();
  };

  // ── Guardado en Firebase ──────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const stockVal = parseInt(formData.get("stock"));
    const priceVal = parseFloat(formData.get("price"));

    const productData = {
      nombre: formData.get("name"),
      productoId: formData.get("sku"),
      categoria: formData.get("category"),
      precioContado: priceVal,
      precioCredito: priceVal * (1 + (parametros.porcentajeInteres || 0) / 100),
      stock: stockVal,
      imagenUrl:
        formData.get("img_url") ||
        "https://via.placeholder.com/150?text=Sin+Foto",
      descripcion: "",
      tipoModificacion: selectedProduct ? "Actualización de Producto" : "Creación de Producto",
      usuarioModifico: auth.currentUser?.email || "Admin",
      fechaModificacion: Timestamp.now(),
    };

    try {
      if (selectedProduct) {
        await updateDoc(doc(db, "productos", selectedProduct.id), productData);
      } else {
        productData.estado = "Activo";
        productData.fechaRegistro = Timestamp.now();
        await setDoc(doc(collection(db, "productos")), productData);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error guardando producto:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="max-w-7xl mx-auto space-y-8"
    >
      {/* Título y Acciones */}
      <div className="pt-2 md:pt-3 flex flex-col md:flex-row md:justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight font-headline">
            Inventario
          </h2>
          <p className="text-slate-500 font-medium">
            Gestión de suministros y control de stock.
          </p>

          <div className="relative w-full sm:max-w-xs mt-4">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              className="w-full bg-slate-100 border-none rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-green-700 outline-none"
              placeholder="Buscar por nombre o SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Botón de Reporte */}
          <div className="relative group text-sm font-bold w-full sm:w-auto z-40">
            <button className="w-full sm:w-auto bg-slate-200 text-slate-700 px-6 py-3 rounded-2xl flex items-center justify-center gap-2 border border-slate-300">
              <span className="material-symbols-outlined text-lg">
                download
              </span>
              REPORTE
              <span className="material-symbols-outlined text-sm">
                expand_more
              </span>
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex flex-col p-2">
              <button
                onClick={() => handleExportReport("all")}
                className="px-4 py-2 hover:bg-slate-50 text-left rounded-xl text-slate-700 italic"
              >
                Todo el inventario
              </button>
              <button
                onClick={() => handleExportReport("ok")}
                className="px-4 py-2 hover:bg-slate-50 text-left rounded-xl text-slate-700"
              >
                En stock
              </button>
              <button
                onClick={() => handleExportReport("low")}
                className="px-4 py-2 hover:bg-slate-50 text-left rounded-xl text-amber-600"
              >
                Bajo stock
              </button>
              <button
                onClick={() => handleExportReport("out")}
                className="px-4 py-2 hover:bg-slate-50 text-left rounded-xl text-red-600"
              >
                Agotados
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedProduct(null);
              setIsModalOpen(true);
            }}
            className="w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-green-900/20 transition-all active:scale-95 whitespace-nowrap"
          >
            <span className="material-symbols-outlined">add_circle</span> Nuevo
            Producto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Sidebar de Filtros */}
        <aside className="col-span-12 lg:col-span-3 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-8 sticky top-24">
            {/* Categorías desde Firebase */}
            <div>
              <h3 className="font-black text-slate-800 text-[10px] mb-4 uppercase tracking-widest opacity-50">
                Categorías
              </h3>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory("Todos los productos")}
                  className={`w-full text-left px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    selectedCategory === "Todos los productos"
                      ? "bg-green-50 text-green-800 ring-1 ring-green-100"
                      : "text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  Todos los productos
                </button>
                {categorias.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.nombre)}
                    className={`w-full text-left px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      selectedCategory === cat.nombre
                        ? "bg-green-50 text-green-800 ring-1 ring-green-100"
                        : "text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    {cat.nombre}
                  </button>
                ))}
              </div>
            </div>

            {/* Estado de Stock */}
            <div>
              <h3 className="font-black text-slate-800 text-[10px] mb-4 uppercase tracking-widest opacity-50">
                Estado Stock
              </h3>
              <div className="space-y-1">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`w-full flex justify-between px-4 py-2 rounded-xl text-sm font-bold ${
                    statusFilter === "all"
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-400"
                  }`}
                >
                  Todos <span className="opacity-60">{counts.all}</span>
                </button>
                <button
                  onClick={() => setStatusFilter("low")}
                  className={`w-full flex justify-between px-4 py-2 rounded-xl text-sm font-bold ${
                    statusFilter === "low"
                      ? "bg-amber-50 text-amber-700"
                      : "text-slate-400"
                  }`}
                >
                  Bajo Stock{" "}
                  <span className="bg-amber-600 text-white px-2 rounded-full text-[10px] font-black">
                    {counts.low}
                  </span>
                </button>
                <button
                  onClick={() => setStatusFilter("out")}
                  className={`w-full flex justify-between px-4 py-2 rounded-xl text-sm font-bold ${
                    statusFilter === "out"
                      ? "bg-red-50 text-red-700"
                      : "text-slate-400"
                  }`}
                >
                  Agotados{" "}
                  <span className="bg-red-600 text-white px-2 rounded-full text-[10px] font-black">
                    {counts.out}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Tabla de Productos */}
        <div className="col-span-12 lg:col-span-9 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Producto
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Categoría
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Precio
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Stock
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className={`group hover:bg-slate-50/80 transition-all ${
                    !p.active ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-6 py-4 flex items-center gap-4">
                    <img
                      src={p.img}
                      alt={p.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                    />
                    <div>
                      <p className="font-bold text-slate-900 text-sm">
                        {p.name}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        SKU: {p.sku}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase">
                      {p.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                    {p.price}
                  </td>
                  <td className="px-6 py-4">
                    <StockCell product={p} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setSelectedProduct(p);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">
                          edit
                        </span>
                      </button>
                      <button
                        onClick={async () => {
                          const docRef = doc(db, "productos", p.id);
                          await updateDoc(docRef, {
                            estado: p.active ? "Inactivo" : "Activo",
                            fechaModificacion: Timestamp.now(),
                            tipoModificacion: "Cambio de Estado de Producto",
                            usuarioModifico: auth.currentUser?.email || "Admin",
                          });
                        }}
                        className={`p-2 rounded-lg transition-colors ${
                          p.active
                            ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                            : "text-green-600 hover:bg-green-50"
                        }`}
                      >
                        <span className="material-symbols-outlined text-lg">
                          {p.active ? "block" : "check_circle"}
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-20 text-center">
              <span className="material-symbols-outlined text-slate-200 text-6xl mb-4">
                search_off
              </span>
              <p className="text-slate-400 font-bold italic">
                No hay productos que coincidan con los filtros.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE PRODUCTO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row my-8 relative"
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="md:hidden absolute top-4 right-4 z-50 bg-white/50 backdrop-blur p-2 rounded-full text-slate-800"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            {/* Lado izquierdo: Preview de Imagen */}
            <div className="w-full md:w-2/5 bg-slate-50 border-r border-slate-100 p-8 flex flex-col items-center justify-center relative">
              <div className="hidden md:block absolute top-8 left-8">
                <h3 className="text-xl font-black text-slate-900 tracking-tight font-headline uppercase">
                  {selectedProduct ? "Edición" : "Registro"}
                </h3>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">
                  Ficha de Producto
                </p>
              </div>

              <div className="w-full aspect-square mt-2 md:mt-16 rounded-3xl overflow-hidden bg-white shadow-sm border border-slate-200 flex items-center justify-center relative group">
                <img
                  id="img-preview"
                  src={
                    selectedProduct?.img ||
                    "https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg"
                  }
                  alt="Preview"
                  className="w-full h-full object-cover transition-all group-hover:scale-105"
                  onError={(e) => {
                    e.target.src =
                      "https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg";
                  }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <span className="text-white font-bold text-sm tracking-widest uppercase">
                    Vista Previa
                  </span>
                </div>
              </div>

              <div className="w-full mt-6 space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                  URL de Portada
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    link
                  </span>
                  <input
                    name="img_url"
                    id="img_url_input"
                    defaultValue={
                      selectedProduct?.img !==
                      "https://via.placeholder.com/150?text=Sin+Foto"
                        ? selectedProduct?.img
                        : ""
                    }
                    placeholder="https://ejemplo.com/foto.jpg"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-all font-mono"
                    onChange={(e) => {
                      const imgEl = document.getElementById("img-preview");
                      if (imgEl) {
                        imgEl.src =
                          e.target.value.trim() ||
                          "https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg";
                      }
                    }}
                  />
                </div>
                <p className="text-[9px] text-slate-400 text-center uppercase tracking-wider font-bold mt-2">
                  Pega el link público de la foto
                </p>
              </div>
            </div>

            {/* Lado derecho: Formulario */}
            <div className="w-full md:w-3/5 p-8 lg:p-10 bg-white flex flex-col">
              <div className="md:hidden mb-6">
                <h3 className="text-xl font-black text-slate-900 tracking-tight font-headline uppercase">
                  {selectedProduct ? "Editar Producto" : "Nuevo Producto"}
                </h3>
              </div>

              <form
                onSubmit={handleSave}
                className="space-y-5 flex-grow flex flex-col justify-between"
              >
                <div className="space-y-5">
                  {/* Nombre */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                      Nombre Comercial
                    </label>
                    <input
                      name="name"
                      defaultValue={selectedProduct?.name}
                      placeholder="Ej. Arroz Blanco 5lb"
                      className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-green-600 transition-colors"
                      onKeyPress={(e) => {
                        if (!/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_]+$/.test(e.key))
                          e.preventDefault();
                      }}
                      required
                    />
                  </div>

                  {/* SKU y Categoría */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                        Código SKU
                      </label>
                      <input
                        name="sku"
                        defaultValue={selectedProduct?.sku}
                        placeholder="Ej. ARR-001"
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-green-600 transition-colors"
                        onKeyPress={(e) => {
                          if (!/^[a-zA-Z0-9\-_]+$/.test(e.key))
                            e.preventDefault();
                        }}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                        Categoría
                      </label>
                      <div className="relative">
                        <select
                          name="category"
                          defaultValue={selectedProduct?.category || ""}
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-green-600 transition-colors appearance-none cursor-pointer"
                          required
                        >
                          <option value="" disabled>
                            Seleccione una categoría
                          </option>
                          {categorias.map((c) => (
                            <option key={c.id} value={c.nombre}>
                              {c.nombre}
                            </option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                          expand_more
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Precio y Stock */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                        Costo al Contado (L)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">
                          L
                        </span>
                        <input
                          name="price"
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={selectedProduct?.priceNum}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-green-600 transition-colors"
                          onKeyDown={(e) => {
                            if (["e", "E", "+", "-"].includes(e.key))
                              e.preventDefault();
                          }}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                        Stock Inicial Físico
                      </label>
                      <div className="relative">
                        <input
                          name="stock"
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={selectedProduct?.stock}
                          placeholder="0"
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-green-600 transition-colors"
                          onKeyDown={(e) => {
                            if (["e", "E", "+", "-", ".", ","].includes(e.key))
                              e.preventDefault();
                          }}
                          required
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-[10px] text-slate-400 uppercase">
                          Unidades
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex gap-4 pt-6 mt-auto">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black tracking-widest uppercase text-[10px] hover:bg-slate-200 transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-green-800 text-white rounded-2xl font-black tracking-widest uppercase text-[10px] hover:bg-green-700 shadow-xl shadow-green-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">
                      save
                    </span>
                    {selectedProduct
                      ? "Actualizar Inventario"
                      : "Registrar Producto"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
