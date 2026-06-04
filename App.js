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
const COSTO_PROVEEDOR_TORTILLA = 21; // Precio por Kg que le pagas al repartidor
const EQUIVALENCIA_POLLOS = { entero: 1, mitad: 0.5, paquete15: 1.5, paquete2: 2 };
const PIN_PATRON = "1234";

// 5. Componente de diseño para los productos
const ProductoInput = ({ nombre, desc, name, value, onChange }) => (
  <div className="flex justify-between items-center bg-white border border-gray-200 p-2 rounded shadow-sm">
    <div>
      <span className="block font-bold text-gray-700 text-sm">{nombre}</span>
      <span className="block text-xs text-orange-500 font-bold">{desc}</span>
    </div>
    <input type="number" name={name} value={value === 0 ? '' : value} onChange={onChange} min="0" className="w-16 text-center border rounded p-1 font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" placeholder="0" />
  </div>
);

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
  
  // Nuevo: Estados para tortilla del proveedor
  const [tortillaProv, setTortillaProv] = useState({ dejo: 0, regreso: 0 });

  const hoyStr = new Date().toLocaleDateString('es-MX');

  const [ventas, setVentas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [stockPollos, setStockPollos] = useState(0);
  const [stockRefrescos, setStockRefrescos] = useState(0);

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

    // Cargar datos de tortilla del día
    const unsubTortilla = db.collection('inventario_tortilla').doc(hoyStr.replace(/\//g, '-')).onSnapshot((doc) => {
      if (doc.exists) setTortillaProv(doc.data());
    });

    return () => { unsubVentas(); unsubGastos(); unsubStock(); unsubTortilla(); };
  }, [user]);

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

  const actualizarTortillaProv = async (campo, valor) => {
    const nuevaData = { ...tortillaProv, [campo]: parseFloat(valor) || 0 };
    setTortillaProv(nuevaData);
    await db.collection('inventario_tortilla').doc(hoyStr.replace(/\//g, '-')).set(nuevaData);
  };

  const registrarVenta = async (e, tipo) => {
    e.preventDefault();
    if (totalOrden === 0 && costoEnvio === 0) return setModalAlerta({ visible: true, mensaje: "La orden está en ceros." });
    if (!user) return setModalAlerta({ visible: true, mensaje: "Conectando..." });

    const nuevaVenta = {
      id: Date.now(), tipo, fechaDia: hoyStr,
      hora: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      detalles: { ...orden }, total: totalOrden, pollosTotales: pollosOrden, refrescosTotales: refrescosOrden, metodoPago: orden.metodoPago
    };

    await db.collection('ventas').add(nuevaVenta);
    await db.collection('config').doc('stock').set({
        pollos: stockPollos - pollosOrden, refrescos: stockRefrescos - refrescosOrden
    }, { merge: true });
    
    setOrden({ entero: 0, mitad: 0, paquete15: 0, paquete2: 0, tortillaMedio: 0, tortillaKilo: 0, refresco: 0, domicilio: '', notasEnvio: '', metodoPago: 'efectivo' });
  };

  const calcularResumen = (listaVentas, listaGastos) => {
    return listaVentas.reduce((acc, v) => {
      acc.ventasTotales += v.total;
      acc.ingresoEfectivo += v.metodoPago === 'efectivo' ? v.total : 0;
      acc.ingresoTransferencia += v.metodoPago === 'transferencia' ? v.total : 0;
      return acc;
    }, { ventasTotales: 0, ingresoEfectivo: 0, ingresoTransferencia: 0, totalGastos: listaGastos.reduce((sum, g) => sum + g.monto, 0) });
  };

  const resHoy = calcularResumen(ventas.filter(v => v.fechaDia === hoyStr), gastos.filter(g => g.fechaDia === hoyStr));
  const kgVendidosTortilla = (tortillaProv.dejo - tortillaProv.regreso);
  const pagoTortillaProveedor = kgVendidosTortilla * COSTO_PROVEEDOR_TORTILLA;
  const totalCajaEfectivo = resHoy.ingresoEfectivo - resHoy.totalGastos - pagoTortillaProveedor;

  const menuTabs = [
    { id: 'local', icon: Iconos.Store, label: 'Local' },
    { id: 'domicilio', icon: Iconos.Truck, label: 'Envíos' },
    { id: 'gastos', icon: Iconos.MinusCircle, label: 'Gastos' }
  ];
  if (esPatron) {
    menuTabs.push({ id: 'cierre', icon: Iconos.Calculator, label: 'Caja/Stock' });
    menuTabs.push({ id: 'historial', icon: Iconos.CalendarDays, label: 'Historial' });
  }

  // Seccion de ventas igual a la tuya...
  const subtotalPollo = (orden.entero || 0) * PRECIOS.entero + (orden.mitad || 0) * PRECIOS.mitad + (orden.paquete15 || 0) * PRECIOS.paquete15 + (orden.paquete2 || 0) * PRECIOS.paquete2;
  const subtotalComplementos = (orden.tortillaMedio || 0) * PRECIOS.tortillaMedio + (orden.tortillaKilo || 0) * PRECIOS.tortillaKilo + (orden.refresco || 0) * PRECIOS.refresco;
  const costoEnvio = parseFloat(orden.domicilio) || 0;
  const totalOrden = subtotalPollo + subtotalComplementos + costoEnvio;
  const pollosOrden = (orden.entero || 0) * EQUIVALENCIA_POLLOS.entero + (orden.mitad || 0) * EQUIVALENCIA_POLLOS.mitad + (orden.paquete15 || 0) * EQUIVALENCIA_POLLOS.paquete15 + (orden.paquete2 || 0) * EQUIVALENCIA_POLLOS.paquete2;
  const refrescosOrden = (orden.refresco || 0);

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 pb-10">
      {/* MODALES (Igual a tu código original) */}
      {modalAlerta.visible && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full text-center">
            <p className="text-lg font-bold mb-6">{modalAlerta.mensaje}</p>
            <button onClick={() => setModalAlerta({ visible: false, mensaje: '' })} className="bg-orange-500 text-white px-6 py-2 rounded-lg font-bold w-full">Entendido</button>
          </div>
        </div>
      )}

      {modalPin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full text-center border-t-8 border-orange-600">
            <h2 className="text-xl font-black mb-4">Acceso de Patrón</h2>
            <input type="password" value={inputPin} onChange={(e) => setInputPin(e.target.value)} placeholder="PIN" className="w-full text-center text-2xl p-3 border-2 rounded-lg mb-4" />
            <button onClick={verificarPin} className="w-full bg-orange-600 text-white py-2 rounded font-bold">Entrar</button>
          </div>
        </div>
      )}

      <header className="bg-gray-900 text-white shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto p-4 flex items-center justify-between">
          <h1 className="text-xl font-black text-orange-500 flex items-center gap-2"><Iconos.Utensils /> EL CHILPAYIN</h1>
          <button onClick={() => esPatron ? cerrarSesionPatron() : setModalPin(true)} className={`px-3 py-1.5 rounded font-bold text-sm ${esPatron ? 'bg-green-600' : 'bg-gray-700'}`}>
            {esPatron ? 'Patrón' : 'Empleado'}
          </button>
        </div>
        <div className="flex overflow-x-auto bg-gray-800">
          {menuTabs.map(tab => (
            <button key={tab.id} onClick={() => setVista(tab.id)} className={`flex-1 py-3 text-xs font-bold text-center flex flex-col items-center ${vista === tab.id ? 'bg-orange-500 text-white' : 'text-gray-400'}`}>
              <tab.icon /> {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto mt-6 px-4">
        {/* VISTA LOCAL / DOMICILIO (Igual que tu código) */}
        {(vista === 'local' || vista === 'domicilio') && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <section className="bg-white rounded-xl shadow p-4 border-t-4 border-orange-500">
               <h2 className="font-bold mb-4">Nueva Venta</h2>
               <div className="space-y-3">
                 <ProductoInput nombre="Pollo Entero" desc="$150" name="entero" value={orden.entero} onChange={handleOrdenChange} />
                 <ProductoInput nombre="Medio Pollo" desc="$80" name="mitad" value={orden.mitad} onChange={handleOrdenChange} />
                 <ProductoInput nombre="Refresco" desc="$15" name="refresco" value={orden.refresco} onChange={handleOrdenChange} />
                 <ProductoInput nombre="Tortilla (1/2 Kg)" desc="$12" name="tortillaMedio" value={orden.tortillaMedio} onChange={handleOrdenChange} />
                 <ProductoInput nombre="Tortilla (1 Kg)" desc="$24" name="tortillaKilo" value={orden.tortillaKilo} onChange={handleOrdenChange} />
               </div>
               
               <div className="flex gap-2 mt-4">
                  <button type="button" onClick={() => setOrden({...orden, metodoPago: 'efectivo'})} className={`flex-1 py-2 rounded border-2 ${orden.metodoPago === 'efectivo' ? 'border-green-500 bg-green-50 text-green-700 font-bold' : 'text-gray-400'}`}>Efectivo</button>
                  <button type="button" onClick={() => setOrden({...orden, metodoPago: 'transferencia'})} className={`flex-1 py-2 rounded border-2 ${orden.metodoPago === 'transferencia' ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold' : 'text-gray-400'}`}>Transferencia</button>
               </div>

               <div className="bg-gray-100 p-4 rounded mt-4 flex justify-between">
                 <span className="font-bold">Total:</span>
                 <span className="text-2xl font-black text-red-600">${totalOrden.toFixed(2)}</span>
               </div>
               <button onClick={(e) => registrarVenta(e, vista)} className="w-full bg-orange-600 text-white py-3 rounded-lg mt-4 font-bold">Registrar</button>
             </section>
           </div>
        )}

        {/* VISTA CORTE (Con Tortillas y Transferencias) */}
        {esPatron && vista === 'cierre' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow border-t-4 border-orange-500">
              <h3 className="font-black text-lg mb-4">Inventario de Tortilla (Proveedor)</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Kg que dejó:</label>
                  <input type="number" value={tortillaProv.dejo} onChange={(e) => actualizarTortillaProv('dejo', e.target.value)} className="w-full p-2 border rounded text-center text-lg font-bold" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Kg que se lleva:</label>
                  <input type="number" value={tortillaProv.regreso} onChange={(e) => actualizarTortillaProv('regreso', e.target.value)} className="w-full p-2 border rounded text-center text-lg font-bold" />
                </div>
              </div>
              <div className="bg-orange-50 p-3 rounded flex justify-between items-center border border-orange-200">
                <span className="font-bold">Debes pagar al repartidor ({kgVendidosTortilla} kg):</span>
                <span className="font-black text-xl text-orange-700">${pagoTortillaProveedor.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow border-t-4 border-green-500">
              <h3 className="font-black text-lg mb-4 text-gray-800">Resumen de Caja</h3>
              <div className="space-y-2 font-bold">
                <div className="flex justify-between"><span>Efectivo Bruto:</span> <span className="text-green-600">${resHoy.ingresoEfectivo.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Transferencias:</span> <span className="text-purple-600">${resHoy.ingresoTransferencia.toFixed(2)}</span></div>
                <div className="flex justify-between text-red-600 border-t pt-2"><span>Gastos:</span> <span>-${resHoy.totalGastos.toFixed(2)}</span></div>
                <div className="flex justify-between text-orange-600"><span>Pago Tortilla:</span> <span>-${pagoTortillaProveedor.toFixed(2)}</span></div>
              </div>
              <div className="mt-6 bg-gray-900 text-white p-4 rounded-lg text-center">
                <span className="block text-xs uppercase opacity-70">Efectivo que debe haber en caja</span>
                <span className="text-4xl font-black">${totalCajaEfectivo.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
