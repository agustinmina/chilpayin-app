const { useState, useEffect, useMemo } = React;

const Iconos = {
  Utensils: () => <span>🍽️</span>, Lock: () => <span>🔒</span>, Unlock: () => <span>🔓</span>,
  Store: () => <span>🏪</span>, Truck: () => <span>🚚</span>, MinusCircle: () => <span>➖</span>,
  Calculator: () => <span>🧮</span>, CalendarDays: () => <span>📅</span>, Banknote: () => <span>💵</span>,
  CreditCard: () => <span>💳</span>, PlusCircle: () => <span>➕</span>, ListOrdered: () => <span>📋</span>,
  Trash2: () => <span>🗑️</span>,
};

// NOTA DE SEGURIDAD: Mañana rotaremos esta clave en Firebase Console por seguridad.
const firebaseConfig = {
  apiKey: "AIzaSyB_CBmUwgFviyffpFpJ08n_WCfLBIXZVaw",
  authDomain: "chilpayin-4158c.firebaseapp.com",
  projectId: "chilpayin-4158c",
  storageBucket: "chilpayin-4158c.firebasestorage.app",
  messagingSenderId: "187448881352",
  appId: "1:187448881352:web:daebc92bff53fd0e5535fd"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const PRECIOS = { entero: 150, mitad: 80, paquete15: 245, paquete2: 310, tortillaMedio: 12, tortillaKilo: 24, refresco: 15 };
const PIN_PATRON = "1234";

function App() {
  const [user, setUser] = useState(null);
  const [vista, setVista] = useState('local');
  const [esPatron, setEsPatron] = useState(false);
  const [orden, setOrden] = useState({ entero: 0, mitad: 0, paquete15: 0, paquete2: 0, tortillaMedio: 0, tortillaKilo: 0, refresco: 0, domicilio: '', notasEnvio: '', metodoPago: 'efectivo' });
  const [ventas, setVentas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const hoyStr = new Date().toLocaleDateString('es-MX');

  useEffect(() => {
    auth.signInAnonymously();
    return auth.onAuthStateChanged(setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubV = db.collection('ventas').onSnapshot(s => setVentas(s.docs.map(d => ({ dbId: d.id, ...d.data() }))));
    const unsubG = db.collection('gastos').onSnapshot(s => setGastos(s.docs.map(d => ({ dbId: d.id, ...d.data() }))));
    return () => { unsubV(); unsubG(); };
  }, [user]);

  const totalOrden = (orden.entero * PRECIOS.entero) + (orden.mitad * PRECIOS.mitad) + (orden.paquete15 * PRECIOS.paquete15) + (orden.paquete2 * PRECIOS.paquete2) + (orden.tortillaMedio * PRECIOS.tortillaMedio) + (orden.tortillaKilo * PRECIOS.tortillaKilo) + (orden.refresco * PRECIOS.refresco) + (parseFloat(orden.domicilio) || 0);

  const registrarVenta = async (e) => {
    e.preventDefault();
    await db.collection('ventas').add({ 
      id: Date.now(), fechaDia: hoyStr, hora: new Date().toLocaleTimeString(), 
      detalles: { ...orden }, total: totalOrden, metodoPago: orden.metodoPago 
    });
    setOrden({ entero: 0, mitad: 0, paquete15: 0, paquete2: 0, tortillaMedio: 0, tortillaKilo: 0, refresco: 0, domicilio: '', notasEnvio: '', metodoPago: 'efectivo' });
  };

  const calcularResumen = (listaVentas, listaGastos) => {
    return listaVentas.reduce((acc, v) => {
      acc.ventas += v.total;
      acc.efectivo += v.metodoPago === 'efectivo' ? v.total : 0;
      acc.transf += v.metodoPago === 'transferencia' ? v.total : 0;
      acc.tortillas = (acc.tortillas || 0) + (v.detalles.tortillaMedio || 0) + (v.detalles.tortillaKilo * 2 || 0);
      return acc;
    }, { ventas: 0, efectivo: 0, transf: 0, tortillas: 0, gastos: listaGastos.reduce((s, g) => s + g.monto, 0) });
  };

  const res = calcularResumen(ventas.filter(v => v.fechaDia === hoyStr), gastos.filter(g => g.fechaDia === hoyStr));

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <header className="bg-gray-900 text-white p-4 rounded-xl mb-4 flex justify-between">
        <h1 className="font-black text-orange-500">EL CHILPAYIN</h1>
        <button onClick={() => setEsPatron(!esPatron)} className="text-xs bg-gray-700 px-2 rounded">{esPatron ? 'Patrón' : 'Empleado'}</button>
      </header>

      <div className="flex gap-2 mb-4">
        {['local', 'cierre', 'historial'].map(v => (
          <button key={v} onClick={() => setVista(v)} className={`px-4 py-2 rounded font-bold ${vista === v ? 'bg-orange-500 text-white' : 'bg-white'}`}>{v}</button>
        ))}
      </div>

      {vista === 'local' && (
        <form onSubmit={registrarVenta} className="bg-white p-4 rounded-xl shadow space-y-2">
           <input type="number" placeholder="Entero" className="w-full border p-2" onChange={(e) => setOrden({...orden, entero: parseInt(e.target.value)||0})} />
           <input type="number" placeholder="1/2 Tortilla" className="w-full border p-2" onChange={(e) => setOrden({...orden, tortillaMedio: parseInt(e.target.value)||0})} />
           <button type="submit" className="w-full bg-orange-600 text-white p-3 rounded">Registrar Venta (${totalOrden})</button>
        </form>
      )}

      {vista === 'cierre' && esPatron && (
        <div className="bg-white p-6 rounded-xl shadow space-y-2">
          <h2 className="font-black text-lg">Corte de Caja - Hoy</h2>
          <p>Ventas: ${res.ventas.toFixed(2)}</p>
          <p className="text-green-600">Efectivo: ${res.efectivo.toFixed(2)}</p>
          <p className="text-purple-600">Transferencias: ${res.transf.toFixed(2)}</p>
          <p className="text-red-600">Costo Tortilla (Pago Prov): -${(res.tortillas * 21).toFixed(2)}</p>
          <div className="text-xl font-black border-t mt-2">Caja Real: ${(res.efectivo - (res.tortillas * 21) - res.gastos).toFixed(2)}</div>
        </div>
      )}
    </div>
  );
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
