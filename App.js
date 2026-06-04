// 1. Extraemos las herramientas de React sin usar comandos 'import'
const { useState, useEffect } = React;

// 2. Tu configuración exacta de Firebase para El Chilpayin
const firebaseConfig = {
  apiKey: "AIzaSyB_CBmUwgFViyffpFpJ08n_WcFLB1XZVaw",
  authDomain: "chilpayin-4158c.firebaseapp.com",
  projectId: "chilpayin-4158c",
  storageBucket: "chilpayin-4158c.firebasestorage.app",
  messagingSenderId: "187448881352",
  appId: "1:187448881352:web:daebc92bff53fd0e5535fd"
};

// Inicializamos Firebase usando la variable global
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// 3. Tus precios oficiales y configuración
const PRECIOS = { entero: 150, mitad: 80, paquete15: 245, paquete2: 310, tortillaMedio: 12, tortillaKilo: 24, refresco: 15 };
const EQUIVALENCIA_POLLOS = { entero: 1, mitad: 0.5, paquete15: 1.5, paquete2: 2 };
const PIN_PATRON = "1234";

function App() {
  const [user, setUser] = useState(null);
  const [pinActivo, setPinActivo] = useState(false);
  const [pinInput, setPinInput] = useState("");
  
  // Memoria temporal de la venta actual
  const [pedido, setPedido] = useState({
    entero: 0, mitad: 0, paquete15: 0, paquete2: 0, tortillaMedio: 0, tortillaKilo: 0, refresco: 0
  });

  // Conexión anónima de seguridad
  useEffect(() => {
    auth.signInAnonymously();
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe();
  }, []);

  const manejarPin = (e) => {
    e.preventDefault();
    if (pinInput === PIN_PATRON) {
      setPinActivo(true);
    } else {
      alert("PIN incorrecto, intenta de nuevo.");
      setPinInput("");
    }
  };

  const agregarProducto = (producto) => {
    setPedido({ ...pedido, [producto]: pedido[producto] + 1 });
  };

  const quitarProducto = (producto) => {
    if (pedido[producto] > 0) {
      setPedido({ ...pedido, [producto]: pedido[producto] - 1 });
    }
  };

  const calcularTotal = () => {
    return Object.keys(pedido).reduce((total, key) => total + (pedido[key] * PRECIOS[key]), 0);
  };

  const registrarVenta = async () => {
    const total = calcularTotal();
    if (total === 0) return alert("Agrega productos antes de registrar la venta.");

    // Calculamos el descuento de inventario
    const pollosVendidos = 
      (pedido.entero * EQUIVALENCIA_POLLOS.entero) + 
      (pedido.mitad * EQUIVALENCIA_POLLOS.mitad) + 
      (pedido.paquete15 * EQUIVALENCIA_POLLOS.paquete15) + 
      (pedido.paquete2 * EQUIVALENCIA_POLLOS.paquete2);

    try {
      await db.collection('ventas').add({
        pedido,
        total,
        pollosVendidos,
        refrescosVendidos: pedido.refresco,
        fecha: firebase.firestore.FieldValue.serverTimestamp()
      });
      alert("¡Venta registrada con éxito en la base de datos!");
      // Limpiamos la pantalla para el siguiente cliente
      setPedido({ entero: 0, mitad: 0, paquete15: 0, paquete2: 0, tortillaMedio: 0, tortillaKilo: 0, refresco: 0 });
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error de conexión al intentar guardar la venta.");
    }
  };

  // PANTALLA 1: Bloqueo de seguridad
  if (!pinActivo) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm">
          <h1 className="text-3xl font-black text-orange-600 text-center mb-2">EL CHILPAYIN</h1>
          <p className="text-gray-500 text-center mb-6 font-bold">ACCESO AL SISTEMA</p>
          <form onSubmit={manejarPin} className="flex flex-col gap-4">
            <input 
              type="password" 
              placeholder="Ingresa tu PIN" 
              className="p-4 border-2 border-gray-300 rounded-lg text-center text-2xl tracking-[0.5em] focus:border-orange-500 outline-none transition-colors"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
            />
            <button type="submit" className="bg-orange-600 text-white p-4 rounded-lg font-black text-xl hover:bg-orange-700 transition-colors">
              ENTRAR
            </button>
          </form>
        </div>
      </div>
    );
  }

  // PANTALLA 2: Sistema de Ventas (Caja)
  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl p-4 sm:p-8">
        <h1 className="text-3xl sm:text-4xl font-black text-orange-600 text-center mb-8 border-b-4 border-orange-100 pb-4">CAJA - EL CHILPAYIN</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Zona Izquierda: Productos */}
          <div>
            <h2 className="text-2xl font-black text-gray-800 mb-4 bg-orange-100 p-2 rounded-t-lg">Pollo Asado y Paquetes</h2>
            <div className="flex flex-col gap-3 mb-8">
              {['entero', 'mitad', 'paquete15', 'paquete2'].map(prod => (
                <div key={prod} className="flex justify-between items-center bg-white border-2 border-gray-100 p-3 rounded-lg shadow-sm">
                  <span className="capitalize font-bold text-gray-700 text-lg">
                    {prod.replace('paquete15', 'Paquete 1.5').replace('paquete2', 'Paquete 2')} <span className="text-orange-500">(${PRECIOS[prod]})</span>
                  </span>
                  <div className="flex items-center gap-4 bg-gray-100 rounded-lg p-1">
                    <button onClick={() => quitarProducto(prod)} className="bg-red-500 hover:bg-red-600 text-white w-10 h-10 rounded-md font-black text-xl shadow">-</button>
                    <span className="w-6 text-center font-black text-xl">{pedido[prod]}</span>
                    <button onClick={() => agregarProducto(prod)} className="bg-green-500 hover:bg-green-600 text-white w-10 h-10 rounded-md font-black text-xl shadow">+</button>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="text-2xl font-black text-gray-800 mb-4 bg-blue-100 p-2 rounded-t-lg">Complementos Extras</h2>
            <div className="flex flex-col gap-3">
              {['tortillaMedio', 'tortillaKilo', 'refresco'].map(prod => (
                <div key={prod} className="flex justify-between items-center bg-white border-2 border-gray-100 p-3 rounded-lg shadow-sm">
                  <span className="capitalize font-bold text-gray-700 text-lg">
                    {prod.replace('tortillaMedio', '1/2 Kg Tortilla').replace('tortillaKilo', '1 Kg Tortilla')} <span className="text-blue-500">(${PRECIOS[prod]})</span>
                  </span>
                  <div className="flex items-center gap-4 bg-gray-100 rounded-lg p-1">
                    <button onClick={() => quitarProducto(prod)} className="bg-red-500 hover:bg-red-600 text-white w-10 h-10 rounded-md font-black text-xl shadow">-</button>
                    <span className="w-6 text-center font-black text-xl">{pedido[prod]}</span>
                    <button onClick={() => agregarProducto(prod)} className="bg-green-500 hover:bg-green-600 text-white w-10 h-10 rounded-md font-black text-xl shadow">+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Zona Derecha: Cobro Total */}
          <div className="bg-gray-50 p-6 rounded-2xl border-4 border-gray-200 flex flex-col justify-between h-full min-h-[300px]">
            <div>
              <h2 className="text-2xl font-black text-gray-800 mb-4 border-b-2 border-gray-200 pb-2 text-center">Total a Cobrar</h2>
              <div className="text-6xl font-black text-green-600 text-center my-10 tracking-tighter">
                ${calcularTotal()}
              </div>
            </div>
            
            <button 
              onClick={registrarVenta}
              className="w-full bg-orange-600 text-white p-5 rounded-xl font-black text-2xl hover:bg-orange-700 shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              CERRAR VENTA
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}

// Inyección final a tu página HTML
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
