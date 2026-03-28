import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { collection, onSnapshot, doc, setDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "../firebase/firebase";
import { useAuth } from "../auth/AuthProvider";

// ÔöÇÔöÇ Datos Iniciales ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
const INITIAL_PRODUCTS = [
  {
    id: 1,
    name: "Az├║car Refinada Est├índar",
    sku: "AZU-001-ST",
    category: "Granos y Cereales",
    price: "L 12.50 / kg",
    stock: 1250,
    status: "ok",
    active: true,
    img: "https://images.unsplash.com/photo-1581447100595-3a8175b058fe?q=80&w=200&auto=format&fit=crop",
  },
  {
    id: 2,
    name: "Fertilizante Nitrogenado",
    sku: "FER-992-AG",
    category: "Insumos",
    price: "L 450.00 / sac",
    stock: 12,
    status: "low",
    active: true,
    img: "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?q=80&w=200&auto=format&fit=crop",
  },
  {
    id: 3,
    name: 'Machete de Zafra 22"',
    sku: "HER-012-MQ",
    category: "Herramientas",
    price: "L 18.75 / ud",
    stock: 85,
    status: "ok",
    active: true,
    img: "https://images.unsplash.com/photo-1595130792344-90696954848d?q=80&w=200&auto=format&fit=crop",
  },
  {
    id: 4,
    name: "Arroz de Grano Largo",
    sku: "ARR-005-ST",
    category: "Granos y Cereales",
    price: "L 1.20 / kg",
    stock: 0,
    status: "out",
    active: true,
    img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=200&auto=format&fit=crop",
  },
];

// ÔöÇÔöÇ Componente de Celda de Stock ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
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
  const [selectedCategory, setSelectedCategory] = useState("Todos los productos");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "productos"), (snapshot) => {
      setProductsData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const products = useMemo(() => {
    return productsData.map(p => {
      let dynStatus = "ok";
      if (p.stock === 0) dynStatus = "out";
      else if (p.stock < 20) dynStatus = "low";

      return {
        ...p,
        id: p.id,
        name: p.nombre || "Sin Nombre",
        sku: p.productoId || p.id.substring(0, 6).toUpperCase(),
        category: p.categoria || "Sin categor├¡a",
        price: `L ${p.precioContado || 0}`,
        priceNum: p.precioContado || 0,
        stock: p.stock || 0,
        status: dynStatus,
        active: p.estado !== "Inactivo",
        img: p.imagenUrl || "https://via.placeholder.com/150?text=Sin+Foto"
      };
    });
  }, [productsData]);

  // L├│gica de Filtrado
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
      precioCredito: priceVal * 1.15,
      stock: stockVal,
      imagenUrl: formData.get("img_url") || "https://via.placeholder.com/150?text=Sin+Foto",
      descripcion: "",
      tipoModificacion: selectedProduct ? "Actualizaci├│n" : "Creaci├│n",
      usuarioModifico: auth.currentUser?.email || "Admin",
      fechaModificacion: Timestamp.now()
    };

    try {
      if (selectedProduct) {
        const docRef = doc(db, "productos", selectedProduct.id);
        await updateDoc(docRef, productData);
      } else {
        productData.estado = "Activo";
        productData.fechaRegistro = Timestamp.now();
        const docRef = doc(collection(db, "productos"));
        await setDoc(docRef, productData);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error guardando producto:", error);
    }
  };

  return (
    <>
      {/* Header con Buscador - Est├ítico para consistencia */}
      <header className="sticky top-0 -mx-6 md:-mx-10 px-6 md:px-10 h-16 flex justify-between items-center z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 mb-8 -mt-6 md:-mt-10 pt-4 pb-4">
        <div className="relative w-full max-w-md mt-2 md:mt-0">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            search
          </span>
          <input
            className="w-full bg-slate-100 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-green-700 outline-none"
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 ml-6 shrink-0">
          <button className="relative text-slate-600 hover:text-green-900 transition-all">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-600 rounded-full border-2 border-white" />
          </button>
          <button className="text-slate-600 hover:text-green-900 transition-all">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-gray-900 uppercase">
              {userName || "Comisariato Pro"}
            </p>
            <p className="text-[10px] text-slate-500 capitalize">
              {authRole || "Region Central"}
            </p>
          </div>
        </div>
      </header>

      {/* CONTENEDOR CON TRANSICI├ôN (Framer Motion) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="max-w-7xl mx-auto space-y-8"
      >
        {/* T├¡tulo y Bot├│n de Acci├│n */}
        <div className="pt-2 md:pt-3 flex justify-between items-end">
          <div>
            <h2
              className="text-3xl font-black text-slate-900 tracking-tight"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Inventario
            </h2>
            <p className="text-slate-500 font-medium">
              Gesti├│n de suministros y control de stock.
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedProduct(null);
              setIsModalOpen(true);
            }}
            className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-green-900/20 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">add_circle</span>{" "}
            Nuevo Producto
          </button>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar de Filtros Locales */}
          <aside className="col-span-12 lg:col-span-3 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-8 sticky top-24">
              <div>
                <h3 className="font-black text-slate-800 text-[10px] mb-4 uppercase tracking-widest opacity-50">
                  Categor├¡as
                </h3>
                <div className="space-y-1">
                  {[
                    "Todos los productos",
                    "Granos y Cereales",
                    "Insumos",
                    "Herramientas",
                  ].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        selectedCategory === cat
                          ? "bg-green-50 text-green-800 ring-1 ring-green-100"
                          : "text-slate-400 hover:bg-slate-50"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

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

          {/* Tabla de Resultados */}
          <div className="col-span-12 lg:col-span-9 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Producto
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Categor├¡a
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
                        className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200 shadow-sm"
                      />
                      <div>
                        <p className="font-bold text-slate-900 text-sm leading-tight">
                          {p.name}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          SKU: {p.sku}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-tight">
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
                              tipoModificacion: "Cambio de Estado",
                              usuarioModifico: auth.currentUser?.email || "Admin"
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
      </motion.div>

      {/* Modal - Con animaci├│n propia */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-green-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.form
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onSubmit={handleSave}
            className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden"
          >
            <div className="p-8 bg-green-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black">
                  {selectedProduct ? "Editar" : "Nuevo"} Producto
                </h3>
                <p className="text-green-200 text-[10px] font-bold uppercase tracking-widest">
                  Informaci├│n de Inventario
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-10 space-y-5">
              <div className="grid grid-cols-12 gap-5">
                <div className="col-span-12">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
                    URL de Imagen
                  </label>
                  <input
                    name="img_url"
                    defaultValue={selectedProduct?.img}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-green-700 text-sm font-bold"
                    placeholder="https://..."
                  />
                </div>
                <div className="col-span-8">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
                    Nombre
                  </label>
                  <input
                    name="name"
                    required
                    defaultValue={selectedProduct?.name}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-green-700 text-sm font-bold"
                  />
                </div>
                <div className="col-span-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
                    SKU
                  </label>
                  <input
                    name="sku"
                    required
                    defaultValue={selectedProduct?.sku}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-green-700 text-sm font-bold text-center"
                  />
                </div>
                <div className="col-span-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
                    Categor├¡a
                  </label>
                  <select
                    name="category"
                    defaultValue={selectedProduct?.category}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none font-bold text-sm appearance-none"
                  >
                    <option>Granos y Cereales</option>
                    <option>Insumos</option>
                    <option>Herramientas</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
                    Precio
                  </label>
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    required
                    defaultValue={selectedProduct?.priceNum || ""}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-green-700 text-sm font-bold"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
                    Stock
                  </label>
                  <input
                    name="stock"
                    type="number"
                    required
                    defaultValue={selectedProduct?.stock}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-green-700 text-sm font-bold"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-green-800 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-green-900 transition-all active:scale-95 uppercase tracking-widest mt-4"
              >
                {selectedProduct ? "Actualizar" : "Registrar"}
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </>
  );
}
