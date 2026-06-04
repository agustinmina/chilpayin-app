// 1. Extraemos React directamente del navegador
const { useState, useEffect, useMemo } = React;

// 2. Iconos integrados
const Iconos = {
  Utensils: () => <span>🍽️</span>, Lock: () => <span>🔒</span>, Unlock: () => <span>🔓</span>,
  Store: () => <span>🏪</span>, Truck: () => <span>🚚</span>, MinusCircle: () => <span>➖</span>,
  Calculator: () => <span>🧮</span>, CalendarDays: () => <span>📅</span>, Banknote: () => <span>💵</span>,
  CreditCard: () => <span>💳</span>, PlusCircle: () => <span>➕</span>, ListOrdered: () => <span>📋</span>,
  Trash2: () => <span>🗑️</span>,
};

// 3. Conexión Firebase (El Chilpayin)
const firebaseConfig = {
  apiKey: "AIzaSyB_CBmUwgFviyffpFpJ08n_WCflBIXZVaw",
  authDomain: "chilpayin-4158c.firebaseapp.com",
  projectId: "chilpayin-4158c",
  storageBucket: "chilpayin-4158c.firebasestorage.app",
  messagingSenderId: "187448881352",
  appId: "1:187448881352:web:daebc92bff53fd0e5535fd"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// 4. Precios y equivalencias
const PRECIOS = { 
  entero: 150, mitad: 80, paquete15: 245, paquete2: 310, 
  tortillaMedio: 12, tortillaKilo: 24, refresco: 15 
};
const EQUIVALENCIA_POLLOS = { entero: 1, mitad: 0.5, paquete15: 1.5, paquete2: 2 };
const PIN_PATRON = "1234";

// 5. Componente de diseño para los productos
const ProductoInput = ({ nombre, desc, name, value, onChange }) => (
  <div className="flex justify-between items-center bg-white border border-gray-200 p-2 rounded shadow-sm">
    <div>
      <span className="block font-bold text-gray-700 text-sm">{nombre}</span>
      <span className="block text-xs text-orange-500 font-bold">{desc}</span>
    </div>
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange({ target: { name, value: Math.max(0, value - 1) } })} className="bg-red-500 text-white w-8 h-8 rounded font-black">-</button>
      <input type="number" name={name} value={value === 0 ? '' : value} onChange={onChange} min="0" className="w-12 text-center border rounded font-bold bg-gray-50 outline-none" placeholder="0" />
      <button type="button" onClick={() => onChange({ target: { name, value: value + 1 } })} className="bg-green-500 text-white w-8 h-8 rounded font-black">+</button>
    </div>
  </div>
);

// 6. LA APLICACIÓN PRINCIPAL
function App() {
  const [user, setUser] = useState(null);
  const [vista, setVista] = useState('local');
  const [esPatron, setEsPatron] = useState(false);

  const [modalAlerta, setModalAlerta] = useState({ visible: false, mensaje: '' });
  const [modalConfirmacion, setModalConfirmacion] = useState({ visible: false, mensaje: '', action: null });
  const [modalPin, setModalPin] = useState(false);
  const [inputPin, setInputPin] = useState('');

  const [orden, setOrden] = useState({ 
    entero: 0, mitad: 0, paquete15: 0, paquete2: 0, 
    tortillaMedio: 0, tortillaKilo: 0, refresco: 0, 
    domicilio: '', notasEnvio: '', metodoPago: 'efectivo' 
  });
  
  const [nuevoGasto, setNuevoGasto] = useState({ descripcion: '', monto: '' });
  const [ingresoPollo, setIngresoPollo] = useState('');
  const [ingresoRefresco, setIngresoRefresco] = useState('');
  const [tortillaProv, setTortillaProv] = useState({ dejo: 0, regreso: 0 });
  
  const hoyStr = new Date().toLocaleDateString('es-MX');

  const [ventas, setVentas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [stockPollos, setStockPollos] = useState(0);
  const [stockRefrescos, setStockRefrescos] = useState(0);

  // Iniciar sesión y conectar base de datos
  useEffect(() => {
    auth.signInAnonymously().catch(err => console.error("Error Auth:", err));
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const unsubVentas = db.collection('ventas').onSnapshot((snap) => {
      const v = snap.docs.map(d => ({ dbId: d.id, ...d.data() }));
      setVentas(v.sort((a, b) => b.id - a.id));
    });

    const unsubGastos = db.collection('gastos').onSnapshot((snap) => {
      const g = snap.docs.map(d => ({ dbId: d.id, ...d.data() }));
      setGastos(g.sort((a, b) => b.id - a.id));
    });

    const unsubStock = db.collection('config').doc('stock').onSnapshot((docSnap) => {
      if (docSnap.exists) {
        setStockPollos(docSnap.data().pollos || 0);
        setStockRefrescos(docSnap.data().refrescos || 0);
      }
    });

    const unsubTortilla = db.collection('inventario_tortilla').doc(hoyStr.replace(/\//g, '-')).onSnapshot((doc) => {
      if (doc.exists) setTortillaProv(doc.data());
    });

    return () => { unsubVentas(); unsubGastos(); unsubStock(); unsubTortilla(); };
  }, [user]);

  // Funciones lógicas
  const verificarPin = () => {
    if (inputPin === PIN_PATRON) {
      setEsPatron(true); setModalPin(false); setInputPin('');
    } else {
      setModalAlerta({ visible: true, mensaje: "PIN Incorrecto." }); setInputPin('');
    }
  };

  const cerrarSesionPatron = () => { setEsPatron(false); setVista('local'); };

  const handleOrdenChange = (e) => {
    const { name, value } = e.target;
    if (name === 'notasEnvio' || name === 'metodoPago') {
      setOrden(prev => ({ ...prev, [name]: value }));
    } else {
      setOrden(prev => ({ ...prev, [name]: value === '' ? 0 : Math.max(0, parseInt(value) || 0) }));
    }
  };

  const agregarStockPollo = async (e) => {
    e.preventDefault();
    const cantidad = parseFloat(ingresoPollo);
    if (isNaN(cantidad) || cantidad <= 0) return setModalAlerta({ visible: true, mensaje: "Ingresa cantidad válida." });
    if (user) await db.collection('config').doc('stock').set({ pollos: stockPollos + cantidad }, { merge: true });
    setIngresoPollo('');
  };

  const agregarStockRefresco = async (e) => {
    e.preventDefault();
    const cantidad = parseInt(ingresoRefresco);
    if (isNaN(cantidad) || cantidad <= 0) return setModalAlerta({ visible: true, mensaje: "Ingresa cantidad válida." });
    if (user) await db.collection('config').doc('stock').set({ refrescos: stockRefrescos + cantidad }, { merge: true });
    setIngresoRefresco('');
  };

  const actualizarTortillaProv = async (campo, valor) => {
    const nuevaData = { ...tortillaProv, [campo]: parseFloat(valor) || 0 };
    setTortillaProv(nuevaData);
    await db.collection('inventario_tortilla').doc(hoyStr.replace(/\//g, '-')).set(nuevaData);
  };

  // Cálculos de la orden
  const subtotalPollo = (orden.entero || 0) * PRECIOS.entero + (orden.mitad || 0) * PRECIOS.mitad + (orden.paquete15 || 0) * PRECIOS.paquete15 + (orden.paquete2 || 0) * PRECIOS.paquete2;
  const subtotalComplementos = (orden.tortillaMedio || 0) * PRECIOS.tortillaMedio + (orden.tortillaKilo || 0) * PRECIOS.tortillaKilo + (orden.refresco || 0) * PRECIOS.refresco;
  const costoEnvio = parseFloat(orden.domicilio) || 0;
  const totalOrden = subtotalPollo + subtotalComplementos + costoEnvio;
  
  const pollosOrden = (orden.entero || 0) * EQUIVALENCIA_POLLOS.entero + (orden.mitad || 0) * EQUIVALENCIA_POLLOS.mitad + (orden.paquete15 || 0) * EQUIVALENCIA_POLLOS.paquete15 + (orden.paquete2 || 0) * EQUIVALENCIA_POLLOS.paquete2;
  const refrescosOrden = (orden.refresco || 0);

  const registrarVenta = async (e, tipo) => {
    e.preventDefault();
    if (totalOrden === 0 && costoEnvio === 0) return setModalAlerta({ visible: true, mensaje: "La orden está en ceros." });
    if (tipo === 'domicilio' && costoEnvio === 0 && !orden.notasEnvio) return setModalAlerta({ visible: true, mensaje: "Agrega costo de envío o dirección." });
    if (!user) return setModalAlerta({ visible: true, mensaje: "Conectando a tu base de datos..." });

    const nuevaVenta = {
      id: Date.now(), tipo, fechaDia: hoyStr,
      hora: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      detalles: { ...orden }, subtotalPollo, subtotalComplementos, costoEnvio,
      total: totalOrden, pollosTotales: pollosOrden, refrescosTotales: refrescosOrden, metodoPago: orden.metodoPago
    };

    await db.collection('ventas').add(nuevaVenta);
    await db.collection('config').doc('stock').set({
        pollos: stockPollos - pollosOrden, refrescos: stockRefrescos - refrescosOrden
    }, { merge: true });
    
    setOrden({ entero: 0, mitad: 0, paquete15: 0, paquete2: 0, tortillaMedio: 0, tortillaKilo: 0, refresco: 0, domicilio: '', notasEnvio: '', metodoPago: 'efectivo' });
  };

  const registrarGasto = async (e) => {
    e.preventDefault();
    const monto = parseFloat(nuevoGasto.monto);
    if (!nuevoGasto.descripcion || isNaN(monto) || monto <= 0) return setModalAlerta({ visible: true, mensaje: "Gasto inválido." });
    if (user) await db.collection('gastos').add({ id: Date.now(), fechaDia: hoyStr, descripcion: nuevoGasto.descripcion, monto: monto });
    setNuevoGasto({ descripcion: '', monto: '' });
  };

  const eliminarRegistro = (dbId, idOriginal, tipo) => {
    if(!esPatron) return setModalAlerta({ visible: true, mensaje: "Solo el patrón puede eliminar registros." });
    setModalConfirmacion({
      visible: true, mensaje: `¿Eliminar permanentemente de tu base de datos?`,
      action: async () => {
        if (!user) return;
        if (tipo === 'venta') {
          const v = ventas.find(v => v.id === idOriginal);
          if (v) {
            await db.collection('ventas').doc(dbId).delete();
            await db.collection('config').doc('stock').set({
                pollos: stockPollos + v.pollosTotales, refrescos: stockRefrescos + (v.refrescosTotales || 0)
            }, { merge: true });
          }
        }
        if (tipo === 'gasto') await db.collection('gastos').doc(dbId).delete();
      }
    });
  };

  const ventasHoy = ventas.filter(v => v.fechaDia === hoyStr);
  const gastosHoy = gastos.filter(g => g.fechaDia === hoyStr);

  const calcularResumen = (listaVentas, listaGastos) => {
    return listaVentas.reduce((acc, v) => {
      acc.ventasTotales += v.total;
      acc.ingresoEfectivo += v.metodoPago === 'efectivo' ? v.total : 0;
      acc.ingresoTransferencia += v.metodoPago === 'transferencia' ? v.total : 0;
      acc.pollos += v.pollosTotales;
      acc.paquete15Vendidos += (v.detalles.paquete15 || 0);
      acc.paquete2Vendidos += (v.detalles.paquete2 || 0);
      return acc;
    }, { ventasTotales: 0, ingresoEfectivo: 0, ingresoTransferencia: 0, pollos: 0, paquete15Vendidos: 0, paquete2Vendidos: 0, totalGastos: listaGastos.reduce((sum, g) => sum + g.monto, 0) });
  };

  const resHoy = calcularResumen(ventasHoy, gastosHoy);
  
  // Descuentos de paquetes (15 por paq 1.5 / 10 por paq 2)
  const descPaquetesHoy = (resHoy.paquete15Vendidos * 15) + (resHoy.paquete2Vendidos * 10);
  
  // Cálculo pago de tortillas
  const kgVendidosTortilla = (tortillaProv.dejo || 0) - (tortillaProv.regreso || 0);
  const pagoTortillaProveedor = kgVendidosTortilla * 21; // $21 por kilo al proveedor

  // Efectivo Final Físico
  const corteNetoFisicoHoy = resHoy.ingresoEfectivo - descPaquetesHoy - resHoy.totalGastos - pagoTortillaProveedor;

  const historialDias = useMemo(() => {
    const grupos = {};
    ventas.forEach(v => {
      if (!grupos[v.fechaDia]) grupos[v.fechaDia] = { fecha: v.fechaDia, ventas: [], gastos: [] };
      grupos[v.fechaDia].ventas.push(v);
    });
    gastos.forEach(g => {
      if (!grupos[g.fechaDia]) grupos[g.fechaDia] = { fecha: g.fechaDia, ventas: [], gastos: [] };
      grupos[g.fechaDia].gastos.push(g);
    });
    return Object.values(grupos).sort((a, b) => new Date(b.fecha.split('/').reverse().join('-')) - new Date(a.fecha.split('/').reverse().join('-')));
  }, [ventas, gastos]);

  const menuTabs = [
    { id: 'local', icon: Iconos.Store, label: 'Local' },
    { id: 'domicilio', icon: Iconos.Truck, label: 'Envíos' },
    { id: 'gastos', icon: Iconos.MinusCircle, label: 'Gastos' }
  ];
  if (esPatron) {
    menuTabs.push({ id: 'cierre', icon: Iconos.Calculator, label: 'Caja/Stock' });
    menuTabs.push({ id: 'historial', icon: Iconos.CalendarDays, label: 'Historial' });
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 pb-10">
      
      {/* MODALES */}
      {modalAlerta.visible && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full text-center">
            <p className="text-lg font-bold mb-6">{modalAlerta.mensaje}</p>
            <button onClick={() => setModalAlerta({ visible: false, mensaje: '' })} className="bg-orange-500 text-white px-6 py-2 rounded-lg font-bold w-full">Entendido</button>
          </div>
        </div>
      )}

      {modalConfirmacion.visible && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full text-center">
            <p className="text-lg font-bold mb-6">{modalConfirmacion.mensaje}</p>
            <div className="flex gap-4">
              <button onClick={() => setModalConfirmacion({ visible: false, mensaje: '', action: null })} className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-bold">Cancelar</button>
              <button onClick={() => { modalConfirmacion.action(); setModalConfirmacion({ visible: false, mensaje: '', action: null }); }} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-bold">Sí, Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {modalPin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full text-center border-t-8 border-orange-600">
            <h2 className="text-xl font-black mb-4">Acceso de Patrón</h2>
            <input type="password" value={inputPin} onChange={(e) => setInputPin(e.target.value)} placeholder="Ingresa PIN" className="w-full text-center text-2xl tracking-[0.5em] p-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 outline-none mb-4" />
            <div className="flex gap-4">
              <button onClick={() => { setModalPin(false); setInputPin(''); }} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded font-bold">Cancelar</button>
              <button onClick={verificarPin} className="flex-1 bg-orange-600 text-white py-2 rounded font-bold">Entrar</button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-gray-900 text-white shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto p-4 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 text-orange-500">
            <Iconos.Utensils /> EL CHILPAYIN
            {!user && <span className="text-[10px] bg-red-600 text-white px-2 py-1 rounded ml-2">Cargando...</span>}
          </h1>
          <button onClick={() => esPatron ? cerrarSesionPatron() : setModalPin(true)} className={`flex items-center gap-2 px-3 py-1.5 rounded font-bold text-sm transition-colors ${esPatron ? 'bg-green-600' : 'bg-gray-700'}`}>
            {esPatron ? <><Iconos.Unlock /> Patrón</> : <><Iconos.Lock /> Empleado</>}
          </button>
        </div>
        <div className="flex overflow-x-auto bg-gray-800 scrollbar-hide">
          {menuTabs.map(tab => (
            <button key={tab.id} onClick={() => setVista(tab.id)} className={`flex-1 min-w-[90px] py-3 text-xs sm:text-sm font-bold text-center flex flex-col items-center justify-center gap-1 ${vista === tab.id ? 'bg-orange-500 text-white border-b-4 border-orange-700' : 'text-gray-400'}`}>
              <tab.icon /> {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto mt-6 px-2 sm:px-4">
        {/* VENTAS LOCAL Y ENVÍOS */}
        {(vista === 'local' || vista === 'domicilio') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-6">
              <div className={`bg-white rounded-xl shadow-lg border-t-4 overflow-hidden ${vista === 'local' ? 'border-orange-500' : 'border-blue-500'}`}>
                <div className="p-3 border-b flex items-center justify-between bg-gray-50">
                  <div className="flex items-center gap-2">
                    {vista === 'local' ? <Iconos.Store /> : <Iconos.Truck />}
                    <h2 className="text-lg font-bold text-gray-800">{vista === 'local' ? 'Venta en Mostrador' : 'Servicio a Domicilio'}</h2>
                  </div>
                </div>
                <form onSubmit={(e) => registrarVenta(e, vista)} className="p-4 space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-1 mb-2">Asados y Paquetes</h3>
                    <ProductoInput nombre="Pollo Entero" desc={`$${PRECIOS.entero}`} name="entero" value={orden.entero} onChange={handleOrdenChange} />
                    <ProductoInput nombre="Medio Pollo" desc={`$${PRECIOS.mitad}`} name="mitad" value={orden.mitad} onChange={handleOrdenChange} />
                    <ProductoInput nombre="Paquete 1.5 Pollos" desc={`$${PRECIOS.paquete15}`} name="paquete15" value={orden.paquete15} onChange={handleOrdenChange} />
                    <ProductoInput nombre="Paquete 2 Pollos" desc={`$${PRECIOS.paquete2}`} name="paquete2" value={orden.paquete2} onChange={handleOrdenChange} />
                  </div>
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-1 mb-2">Complementos Extras</h3>
                    <ProductoInput nombre="Tortilla (1/2 Kg)" desc={`$${PRECIOS.tortillaMedio}`} name="tortillaMedio" value={orden.tortillaMedio} onChange={handleOrdenChange} />
                    <ProductoInput nombre="Tortilla (1 Kg)" desc={`$${PRECIOS.tortillaKilo}`} name="tortillaKilo" value={orden.tortillaKilo} onChange={handleOrdenChange} />
                    <ProductoInput nombre="Refresco" desc={`$${PRECIOS.refresco}`} name="refresco" value={orden.refresco} onChange={handleOrdenChange} />
                  </div>
                  {vista === 'domicilio' && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 space-y-3 mt-4">
                      <div className="flex items-center justify-between gap-2">
                        <label className="font-semibold text-gray-700 text-sm">Costo Envío ($)</label>
                        <input type="number" name="domicilio" min="0" placeholder="0" value={orden.domicilio} onChange={handleOrdenChange} className="w-20 text-center border-gray-300 rounded-md p-2 font-bold" />
                      </div>
                      <input type="text" name="notasEnvio" placeholder="Dirección o Repartidor..." value={orden.notasEnvio} onChange={handleOrdenChange} className="w-full text-sm p-2 border rounded" />
                    </div>
                  )}
                  <div className="pt-2">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Método de Pago</h3>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setOrden({...orden, metodoPago: 'efectivo'})} className={`flex-1 py-2 flex items-center justify-center gap-2 rounded border-2 font-bold ${orden.metodoPago === 'efectivo' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-gray-50 text-gray-400'}`}><Iconos.Banknote /> Efectivo</button>
                        <button type="button" onClick={() => setOrden({...orden, metodoPago: 'transferencia'})} className={`flex-1 py-2 flex items-center justify-center gap-2 rounded border-2 font-bold ${orden.metodoPago === 'transferencia' ? 'bg-purple-100 border-purple-500 text-purple-700' : 'bg-gray-50 text-gray-400'}`}><Iconos.CreditCard /> Transf.</button>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center border mt-4">
                    <span className="text-gray-600 font-bold uppercase text-sm">Total a Cobrar</span>
                    <span className="text-3xl font-black text-red-600">${totalOrden.toFixed(2)}</span>
                  </div>
                  <button type="submit" className={`w-full text-white font-bold py-3 rounded-lg shadow-md flex items-center justify-center gap-2 text-lg ${vista === 'local' ? 'bg-orange-600' : 'bg-blue-600'}`}><Iconos.PlusCircle /> Registrar Venta</button>
                </form>
              </div>
            </section>
            
            {/* Lista en Vivo (Lado Derecho) */}
            <section className="lg:col-span-6">
              <div className="bg-white rounded-xl shadow-lg border-t-4 border-gray-400 overflow-hidden mt-6 lg:mt-0">
                <div className="bg-gray-50 p-3 border-b flex items-center gap-2">
                  <Iconos.ListOrdered />
                  <h2 className="text-sm font-bold text-gray-700">Registro de Hoy (En vivo)</h2>
                </div>
                <div className="max-h-[500px] overflow-y-auto">
                  {ventasHoy.length === 0 ? (
                    <p className="p-6 text-center text-gray-400 text-sm">Sin ventas registradas hoy.</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {ventasHoy.map((v) => (
                        <li key={v.dbId || v.id} className="p-3 hover:bg-gray-50 flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded">{v.hora}</span>
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${v.metodoPago === 'efectivo' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>{v.metodoPago}</span>
                              {v.tipo === 'domicilio' && <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700">Envío</span>}
                            </div>
                            <p className="text-xs text-gray-600 font-medium leading-relaxed mt-1">
                              {v.detalles.entero > 0 && `${v.detalles.entero} Ent `}
                              {v.detalles.mitad > 0 && `${v.detalles.mitad} Mit `}
                              {v.detalles.paquete15 > 0 && `${v.detalles.paquete15} Pq(1.5) `}
                              {v.detalles.paquete2 > 0 && `${v.detalles.paquete2} Pq(2) `}
                              {v.detalles.tortillaMedio > 0 && `${v.detalles.tortillaMedio} Tort(½) `}
                              {v.detalles.tortillaKilo > 0 && `${v.detalles.tortillaKilo} Tort(1kg) `}
                              {v.detalles.refresco > 0 && `${v.detalles.refresco} Ref `}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-2">
                            <span className="font-bold text-gray-800">${v.total.toFixed(2)}</span>
                            {esPatron && <button onClick={() => eliminarRegistro(v.dbId, v.id, 'venta')} className="text-red-400 hover:text-red-600 p-1"><Iconos.Trash2 /></button>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* GASTOS */}
        {vista === 'gastos' && (
          <div className="max-w-lg mx-auto bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-500">
            <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2"><Iconos.MinusCircle /> Registrar Gasto Físico</h3>
            <p className="text-sm text-gray-500 mb-4">Ingresa el dinero que sacaste de la caja (Ej. Hielo, Bolsas).</p>
            <form onSubmit={registrarGasto} className="flex flex-col gap-3 mb-6">
              <input type="text" placeholder="Ej. Hielo..." value={nuevoGasto.descripcion} onChange={(e) => setNuevoGasto({...nuevoGasto, descripcion: e.target.value})} className="w-full p-3 border rounded font-bold text-sm outline-none focus:border-red-500" />
              <div className="flex gap-3">
                <span className="p-3 bg-gray-100 border rounded text-gray-500 font-bold">$</span>
                <input type="number" placeholder="0.00" value={nuevoGasto.monto} onChange={(e) => setNuevoGasto({...nuevoGasto, monto: e.target.value})} className="flex-1 p-3 border rounded font-bold text-center outline-none focus:border-red-500" />
                <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-6 font-bold rounded shadow-md"><Iconos.PlusCircle /></button>
              </div>
            </form>

            <h4 className="font-bold text-sm text-gray-400 uppercase tracking-widest border-b pb-2 mb-3">Gastos de Hoy</h4>
            <ul className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
              {gastosHoy.length === 0 ? (
                <li className="text-sm text-gray-400 italic py-2">No hay gastos registrados hoy.</li>
              ) : (
                gastosHoy.map(g => (
                  <li key={g.dbId || g.id} className="py-2 flex justify-between items-center text-sm">
                    <span className="text-gray-700 uppercase font-bold">{g.descripcion}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-red-600 font-black">-${g.monto.toFixed(2)}</span>
                      {esPatron && <button onClick={() => eliminarRegistro(g.dbId, g.id, 'gasto')} className="text-red-400 hover:text-red-600"><Iconos.Trash2 /></button>}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {/* CIERRE Y STOCK (SOLO PATRÓN) */}
        {esPatron && vista === 'cierre' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Columna Izquierda: Stock e Inventario Tortilla */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-indigo-500">
                <h3 className="font-black text-gray-800 text-lg mb-4">Control de Stock (Pollos y Refrescos)</h3>
                <div className="space-y-4">
                  <div className="bg-indigo-50 p-4 rounded-lg flex justify-between items-center border border-indigo-100">
                    <span className="font-bold text-indigo-900">Pollos en Stock:</span>
                    <span className={`text-2xl font-black ${stockPollos <= 5 ? 'text-red-600' : 'text-indigo-600'}`}>{stockPollos}</span>
                  </div>
                  <form onSubmit={agregarStockPollo} className="flex gap-2">
                    <input type="number" step="0.5" placeholder="Ingresar Pollos" value={ingresoPollo} onChange={(e) => setIngresoPollo(e.target.value)} className="flex-1 border p-2 rounded text-center font-bold outline-none focus:border-indigo-500" />
                    <button type="submit" className="bg-indigo-600 text-white px-4 rounded font-bold">Sumar</button>
                  </form>

                  <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center border border-blue-100 mt-4">
                    <span className="font-bold text-blue-900">Refrescos en Stock:</span>
                    <span className={`text-2xl font-black ${stockRefrescos <= 5 ? 'text-red-600' : 'text-blue-600'}`}>{stockRefrescos}</span>
                  </div>
                  <form onSubmit={agregarStockRefresco} className="flex gap-2">
                    <input type="number" placeholder="Ingresar Refrescos" value={ingresoRefresco} onChange={(e) => setIngresoRefresco(e.target.value)} className="flex-1 border p-2 rounded text-center font-bold outline-none focus:border-blue-500" />
                    <button type="submit" className="bg-blue-600 text-white px-4 rounded font-bold">Sumar</button>
                  </form>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-yellow-500">
                <h3 className="font-black text-gray-800 text-lg mb-4">Inventario Tortilla (Proveedor a $21)</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">KG Que Dejó:</label>
                    <input type="number" value={tortillaProv.dejo} onChange={(e) => actualizarTortillaProv('dejo', e.target.value)} className="w-full p-2 border rounded text-center text-lg font-bold" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">KG Que Regresa:</label>
                    <input type="number" value={tortillaProv.regreso} onChange={(e) => actualizarTortillaProv('regreso', e.target.value)} className="w-full p-2 border rounded text-center text-lg font-bold" />
                  </div>
                </div>
                <div className="bg-yellow-50 p-3 rounded flex justify-between items-center border border-yellow-200">
                  <span className="font-bold text-yellow-800">Costo a Pagar ({kgVendidosTortilla} kg):</span>
                  <span className="font-black text-xl text-yellow-700">${pagoTortillaProveedor.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Corte de Caja Maestro */}
            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-500">
              <h3 className="font-black text-gray-800 text-lg mb-4">Corte de Caja (Hoy)</h3>
              <div className="space-y-2 text-sm font-bold text-gray-600">
                <div className="flex justify-between p-2 bg-gray-50 rounded"><span>Ventas Totales (Bruto):</span> <span>${resHoy.ventasTotales.toFixed(2)}</span></div>
                <div className="flex justify-between p-2 bg-green-50 text-green-800 rounded"><span>Cobrado en Efectivo:</span> <span>${resHoy.ingresoEfectivo.toFixed(2)}</span></div>
                <div className="flex justify-between p-2 bg-purple-50 text-purple-800 rounded"><span>Cobrado x Transferencia:</span> <span>${resHoy.ingresoTransferencia.toFixed(2)}</span></div>
                
                <div className="my-2 border-b-2 border-dashed border-gray-200"></div>
                
                <div className="flex justify-between p-2 text-red-600"><span>Gastos Físicos:</span> <span>-${resHoy.totalGastos.toFixed(2)}</span></div>
                <div className="flex justify-between p-2 text-orange-600"><span>Desc. Paquetes ($15 y $10):</span> <span>-${descPaquetesHoy.toFixed(2)}</span></div>
                <div className="flex justify-between p-2 text-yellow-600"><span>Pago Tortilla Proveedor:</span> <span>-${pagoTortillaProveedor.toFixed(2)}</span></div>
              </div>
              <div className="mt-6 p-4 bg-green-600 rounded-lg text-white text-center shadow-inner">
                <span className="block text-sm uppercase tracking-wider mb-1 font-semibold">Dinero Físico Neto en Caja</span>
                <span className="text-4xl font-black">${corteNetoFisicoHoy.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* HISTORIAL DETALLADO (SOLO PATRÓN) */}
        {esPatron && vista === 'historial' && (
          <div className="bg-white rounded-xl shadow-lg border-t-4 border-gray-800 overflow-hidden">
            <h3 className="font-black text-white bg-gray-800 p-4 text-lg">Historial de Días Anteriores</h3>
            <div className="divide-y-4 divide-gray-200">
              {historialDias.length === 0 ? (
                 <p className="p-6 text-center text-gray-500 font-bold">No hay registros de días anteriores todavía.</p>
              ) : (
                historialDias.map(dia => {
                  const resDia = calcularResumen(dia.ventas, dia.gastos);
                  return (
                    <div key={dia.fecha} className="p-4 sm:p-6 bg-gray-50">
                      <h4 className="font-black text-xl text-orange-600 mb-4">{dia.fecha}</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="bg-white p-3 rounded shadow-sm border border-gray-100 text-center">
                          <span className="block text-[10px] text-gray-400 uppercase font-bold">Ventas Totales</span>
                          <span className="block text-lg font-black text-gray-800">${resDia.ventasTotales.toFixed(2)}</span>
                        </div>
                        <div className="bg-white p-3 rounded shadow-sm border border-green-100 text-center">
                          <span className="block text-[10px] text-gray-400 uppercase font-bold">Efectivo</span>
                          <span className="block text-lg font-black text-green-600">${resDia.ingresoEfectivo.toFixed(2)}</span>
                        </div>
                        <div className="bg-white p-3 rounded shadow-sm border border-purple-100 text-center">
                          <span className="block text-[10px] text-gray-400 uppercase font-bold">Transferencias</span>
                          <span className="block text-lg font-black text-purple-600">${resDia.ingresoTransferencia.toFixed(2)}</span>
                        </div>
                        <div className="bg-white p-3 rounded shadow-sm border border-red-100 text-center">
                          <span className="block text-[10px] text-gray-400 uppercase font-bold">Gastos Físicos</span>
                          <span className="block text-lg font-black text-red-600">${resDia.totalGastos.toFixed(2)}</span>
                        </div>
                        <div className="bg-white p-3 rounded shadow-sm border border-blue-100 text-center">
                          <span className="block text-[10px] text-gray-400 uppercase font-bold">Pollos Vend.</span>
                          <span className="block text-lg font-black text-blue-600">{resDia.pollos}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// 7. Renderizamos la aplicación
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
