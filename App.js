// 1. Extraemos React directamente del navegador
const { useState, useEffect, useMemo } = React;

// 2. Iconos integrados
const Iconos = {
  Utensils: () => <span>🍽️</span>, Lock: () => <span>🔒</span>, Unlock: () => <span>🔓</span>,
  Store: () => <span>🏪</span>, Truck: () => <span>🚚</span>, MinusCircle: () => <span>➖</span>,
  Calculator: () => <span>🧮</span>, CalendarDays: () => <span>📅</span>, Banknote: () => <span>💵</span>,
  CreditCard: () => <span>💳</span>, PlusCircle: () => <span>➕</span>, ListOrdered: () => <span>📋</span>,
  Trash2: () => <span>🗑️</span>, Download: () => <span>📥</span>, TrendingUp: () => <span>📈</span>,
  Star: () => <span>⭐</span>, Users: () => <span>👥</span>, Search: () => <span>🔍</span>
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
const db = firebase.firestore();

// 4. Precios y equivalencias ACTUALIZADOS
const PRECIOS = { 
  asado: 150,
  sabor: 155, // Chiltepín, Enchipotlado, Encebollado, Crujiente
  mitad: 80,
  paquete15Asado: 250,      // Paquete 1.5 Asado
  paquete15Sabor: 255,      // Paquete 1 Sabor + 1/2 Asado
  paquete2Asados: 320,      // Paquete 2 Pollos Asados
  paquete2Sabores: 325,     // Paquete 2 Pollos (1 Asado + 1 Sabor)
  mixto: 150,
  paqueteFamiliar: 290,
  tortillaMedio: 12,
  tortillaKilo: 24,
  refresco: 30,
  salchichas: 20,
  frijoles: 20 
};

const EQUIVALENCIA_POLLOS = { 
  entero: 1, chiltepin: 1, enchipotlado: 1, encebollado: 1, crujienteEntero: 1,
  mitad: 0.5, crujienteMitad: 0.5,
  paquete15: 1.5, paqSaborMedio: 1.5, paquete2: 2, paq2Sabores: 2,
  mixto: 1, paqueteFamiliar: 1.5 
};

const PIN_PATRON = "1234";

// 5. Componente de diseño para productos
const ProductoInput = ({ nombre, desc, name, value, onChange }) => (
  <div className="flex justify-between items-center bg-white border border-gray-200 p-2 rounded shadow-sm">
    <div>
      <span className="block font-bold text-gray-700 text-sm">{nombre}</span>
      <span className="block text-xs text-orange-500 font-bold">{desc}</span>
    </div>
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange({ target: { name, value: Math.max(0, (Number(value) || 0) - 1) } })} className="bg-red-500 text-white w-8 h-8 rounded font-black">-</button>
      <input type="number" name={name} value={value === 0 || value === '' ? '' : value} onChange={onChange} min="0" className="w-12 text-center border rounded font-bold bg-gray-50 outline-none" placeholder="0" />
      <button type="button" onClick={() => onChange({ target: { name, value: (Number(value) || 0) + 1 } })} className="bg-green-500 text-white w-8 h-8 rounded font-black">+</button>
    </div>
  </div>
);

// 6. LA APLICACIÓN PRINCIPAL
function App() {
  const [vista, setVista] = useState('local');
  const [esPatron, setEsPatron] = useState(false);

  const [modalAlerta, setModalAlerta] = useState({ visible: false, mensaje: '' });
  const [modalConfirmacion, setModalConfirmacion] = useState({ visible: false, mensaje: '', action: null });
  const [modalPin, setModalPin] = useState(false);
  const [inputPin, setInputPin] = useState('');

  const [orden, setOrden] = useState({ 
    entero: 0, chiltepin: 0, enchipotlado: 0, encebollado: 0, mitad: 0,
    crujienteEntero: 0, crujienteMitad: 0, 
    paquete15: 0, paqSaborMedio: 0, paquete2: 0, paq2Sabores: 0, mixto: 0, paqueteFamiliar: 0,
    extraManual: '',
    tortillaMedio: 0, tortillaKilo: 0, refresco: 0, salchichas: 0, frijoles: 0,
    domicilio: '', notasEnvio: '', metodoPago: 'efectivo',
    telefono: '', nombreCliente: ''
  });
  
  // Estados para autocompletado de clientes
  const [busquedaTelefonos, setBusquedaTelefonos] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [busquedaNombres, setBusquedaNombres] = useState([]);
  const [mostrarSugerenciasNombre, setMostrarSugerenciasNombre] = useState(false);

  const [nuevoGasto, setNuevoGasto] = useState({ descripcion: '', monto: '' });
  const [ingresoPollo, setIngresoPollo] = useState('');
  const [ingresoRefresco, setIngresoRefresco] = useState('');
  const [mermaPollo, setMermaPollo] = useState('');
  const [mermaRefresco, setMermaRefresco] = useState('');
  
  const [nuevoClienteManual, setNuevoClienteManual] = useState({ telefono: '', nombre: '' });
  const [clientesAgenda, setClientesAgenda] = useState([]);

  const [tortillaProv, setTortillaProv] = useState({ dejo: 0, regreso: 0 });
  const [entradasHoy, setEntradasHoy] = useState({ pollos: 0, refrescos: 0 });
  const [costoPolloUnidad, setCostoPolloUnidad] = useState(72); 
  
  const hoyStr = new Date().toLocaleDateString('es-MX');

  const [ventas, setVentas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [historialTortillas, setHistorialTortillas] = useState({});
  
  const [stockPollos, setStockPollos] = useState(0);
  const [stockRefrescos, setStockRefrescos] = useState(0);

  useEffect(() => {
    const unsubVentas = db.collection('ventas').onSnapshot((snap) => {
      const v = snap.docs.map(d => ({ dbId: d.id, ...d.data() }));
      setVentas(v.sort((a, b) => b.id - a.id));
    });

    const unsubGastos = db.collection('gastos').onSnapshot((snap) => {
      const g = snap.docs.map(d => ({ dbId: d.id, ...d.data() }));
      setGastos(g.sort((a, b) => b.id - a.id));
    });

    const unsubClientes = db.collection('clientes').onSnapshot((snap) => {
      const c = snap.docs.map(d => d.data());
      setClientesAgenda(c);
    });

    const unsubStock = db.collection('config').doc('stock').onSnapshot((docSnap) => {
      if (docSnap.exists) {
        setStockPollos(docSnap.data().pollos || 0);
        setStockRefrescos(docSnap.data().refrescos || 0);
      }
    });

    const unsubCostos = db.collection('config').doc('costos').onSnapshot((docSnap) => {
      if (docSnap.exists && docSnap.data().costoPollo) {
        setCostoPolloUnidad(docSnap.data().costoPollo);
      }
    });

    const unsubTortilla = db.collection('inventario_tortilla').doc(hoyStr.replace(/\//g, '-')).onSnapshot((doc) => {
      if (doc.exists) setTortillaProv(doc.data());
    });

    const unsubHistorialTortillas = db.collection('inventario_tortilla').onSnapshot((snap) => {
      const hist = {};
      snap.forEach(doc => { hist[doc.id] = doc.data(); });
      setHistorialTortillas(hist);
    });

    const unsubEntradas = db.collection('entradas_diarias').doc(hoyStr.replace(/\//g, '-')).onSnapshot((doc) => {
      if (doc.exists) setEntradasHoy(doc.data());
    });

    return () => { unsubVentas(); unsubGastos(); unsubClientes(); unsubStock(); unsubCostos(); unsubTortilla(); unsubHistorialTortillas(); unsubEntradas(); };
  }, []);

  const ventasHoy = ventas.filter(v => v.fechaDia === hoyStr);
  const gastosHoy = gastos.filter(g => g.fechaDia === hoyStr);

  const verificarPin = () => {
    if (inputPin === PIN_PATRON) {
      setEsPatron(true); setModalPin(false); setInputPin('');
    } else {
      setModalAlerta({ visible: true, mensaje: "PIN Incorrecto." }); setInputPin('');
    }
  };

  const cerrarSesionPatron = () => { setEsPatron(false); setVista('local'); };

  const clientesVIP = useMemo(() => {
    const mapa = {};
    clientesAgenda.forEach(c => {
      mapa[c.telefono] = {
        telefono: c.telefono,
        nombre: c.nombre,
        totalPollos: 0,
        totalPedidos: 0,
        fechas: new Set()
      };
    });

    ventas.forEach(v => {
      if (v.telefono && typeof v.telefono === 'string' && v.telefono.length === 10) {
        if (!mapa[v.telefono]) {
          mapa[v.telefono] = {
            telefono: v.telefono,
            nombre: v.nombreCliente || 'Cliente Sin Nombre',
            totalPollos: 0,
            totalPedidos: 0,
            fechas: new Set()
          };
        }
        mapa[v.telefono].totalPollos += v.pollosTotales || 0;
        mapa[v.telefono].totalPedidos += 1;
        mapa[v.telefono].fechas.add(v.fechaDia);
        if (v.nombreCliente && v.nombreCliente !== 'Cliente Sin Nombre') {
          mapa[v.telefono].nombre = v.nombreCliente; 
        }
      }
    });

    return Object.values(mapa).sort((a, b) => b.totalPollos - a.totalPollos);
  }, [ventas, clientesAgenda]);

  const handleOrdenChange = (e) => {
    const { name, value } = e.target;
    if (['notasEnvio', 'metodoPago', 'nombreCliente', 'domicilio'].includes(name)) {
      setOrden(prev => ({ ...prev, [name]: value }));
    } else if (name === 'extraManual') {
      setOrden(prev => ({ ...prev, extraManual: value }));
    } else if (name !== 'telefono') {
      setOrden(prev => ({ ...prev, [name]: value === '' ? 0 : Math.max(0, parseInt(value) || 0) }));
    }
  };

  const handleTelefonoChange = (e) => {
    const valor = e.target.value.replace(/\D/g, '').slice(0, 10);
    setOrden(prev => ({ ...prev, telefono: valor }));

    if (valor.length > 2) {
      const coincidencias = [];
      const vistos = new Set();
      
      clientesVIP.forEach(c => {
        if (c.telefono.includes(valor) && !vistos.has(c.telefono)) {
          coincidencias.push({ telefono: c.telefono, nombre: c.nombre });
          vistos.add(c.telefono);
        }
      });
      
      setBusquedaTelefonos(coincidencias.slice(0, 5));
      setMostrarSugerencias(true);
    } else {
      setMostrarSugerencias(false);
    }
  };

  const handleNombreChange = (e) => {
    const valor = e.target.value;
    setOrden(prev => ({ ...prev, nombreCliente: valor }));

    if (valor.length > 2) {
      const coincidencias = [];
      const vistos = new Set();
      const valLower = valor.toLowerCase();
      
      clientesVIP.forEach(c => {
        if (c.nombre && c.nombre.toLowerCase().includes(valLower) && !vistos.has(c.telefono)) {
          coincidencias.push({ telefono: c.telefono, nombre: c.nombre });
          vistos.add(c.telefono);
        }
      });
      
      setBusquedaNombres(coincidencias.slice(0, 5));
      setMostrarSugerenciasNombre(true);
    } else {
      setMostrarSugerenciasNombre(false);
    }
  };

  const seleccionarClientePredictivo = (cliente) => {
    setOrden(prev => ({ ...prev, telefono: cliente.telefono, nombreCliente: cliente.nombre }));
    setMostrarSugerencias(false);
    setMostrarSugerenciasNombre(false);
  };

  const agregarClienteManual = async (e) => {
    e.preventDefault();
    const tel = nuevoClienteManual.telefono.replace(/\D/g, '');
    if (tel.length !== 10 || !nuevoClienteManual.nombre) {
      return setModalAlerta({ visible: true, mensaje: "Ingresa 10 dígitos y el nombre." });
    }
    try {
      await db.collection('clientes').doc(tel).set({
        telefono: tel,
        nombre: nuevoClienteManual.nombre,
        agregadoManual: true
      }, { merge: true });
      setNuevoClienteManual({ telefono: '', nombre: '' });
      setModalAlerta({ visible: true, mensaje: "¡Cliente guardado con éxito!" });
    } catch (error) {
      setModalAlerta({ visible: true, mensaje: "Error al guardar. Revisa conexión." });
    }
  };

  const agregarStockPollo = async (e) => {
    e.preventDefault();
    const cantidad = parseFloat(ingresoPollo);
    if (isNaN(cantidad) || cantidad <= 0) return setModalAlerta({ visible: true, mensaje: "Ingresa cantidad válida." });
    await db.collection('config').doc('stock').set({ pollos: firebase.firestore.FieldValue.increment(cantidad) }, { merge: true });
    await db.collection('entradas_diarias').doc(hoyStr.replace(/\//g, '-')).set({ pollos: firebase.firestore.FieldValue.increment(cantidad) }, { merge: true });
    setIngresoPollo('');
  };

  const restarMermaPollo = async (e) => {
    e.preventDefault();
    const cantidad = parseFloat(mermaPollo);
    if (isNaN(cantidad) || cantidad <= 0) return setModalAlerta({ visible: true, mensaje: "Ingresa cantidad válida." });
    await db.collection('config').doc('stock').set({ pollos: firebase.firestore.FieldValue.increment(-cantidad) }, { merge: true });
    setMermaPollo('');
  };

  const agregarStockRefresco = async (e) => {
    e.preventDefault();
    const cantidad = parseInt(ingresoRefresco);
    if (isNaN(cantidad) || cantidad <= 0) return setModalAlerta({ visible: true, mensaje: "Ingresa cantidad válida." });
    await db.collection('config').doc('stock').set({ refrescos: firebase.firestore.FieldValue.increment(cantidad) }, { merge: true });
    await db.collection('entradas_diarias').doc(hoyStr.replace(/\//g, '-')).set({ refrescos: firebase.firestore.FieldValue.increment(cantidad) }, { merge: true });
    setIngresoRefresco('');
  };

  const restarMermaRefresco = async (e) => {
    e.preventDefault();
    const cantidad = parseInt(mermaRefresco);
    if (isNaN(cantidad) || cantidad <= 0) return setModalAlerta({ visible: true, mensaje: "Ingresa cantidad válida." });
    await db.collection('config').doc('stock').set({ refrescos: firebase.firestore.FieldValue.increment(-cantidad) }, { merge: true });
    setMermaRefresco('');
  };

  const actualizarTortillaProv = async (campo, valor) => {
    const nuevaData = { ...tortillaProv, [campo]: parseFloat(valor) || 0 };
    setTortillaProv(nuevaData);
    await db.collection('inventario_tortilla').doc(hoyStr.replace(/\//g, '-')).set(nuevaData);
  };

  const guardarCostoMateriaPrima = async (nuevoCosto) => {
    const costo = parseFloat(nuevoCosto);
    if (!isNaN(costo) && costo > 0) {
      setCostoPolloUnidad(costo);
      await db.collection('config').doc('costos').set({ costoPollo: costo }, { merge: true });
    }
  };

  // CÁLCULOS MATEMÁTICOS DE LA ORDEN CON NUMERACIÓN ESTRICTA
  const subtotalPollo = 
    (Number(orden.entero) || 0) * PRECIOS.asado +
    (Number(orden.chiltepin) || 0) * PRECIOS.sabor +
    (Number(orden.enchipotlado) || 0) * PRECIOS.sabor +
    (Number(orden.encebollado) || 0) * PRECIOS.sabor +
    (Number(orden.mitad) || 0) * PRECIOS.mitad +
    (Number(orden.paquete15) || 0) * PRECIOS.paquete15Asado +
    (Number(orden.paqSaborMedio) || 0) * PRECIOS.paquete15Sabor +
    (Number(orden.paquete2) || 0) * PRECIOS.paquete2Asados +
    (Number(orden.paq2Sabores) || 0) * PRECIOS.paquete2Sabores +
    (Number(orden.mixto) || 0) * PRECIOS.mixto +
    (Number(orden.paqueteFamiliar) || 0) * PRECIOS.paqueteFamiliar;

  const subtotalCrujiente = 
    (Number(orden.crujienteEntero) || 0) * PRECIOS.sabor +
    (Number(orden.crujienteMitad) || 0) * PRECIOS.mitad;

  const subtotalComplementos = 
    (Number(orden.tortillaMedio) || 0) * PRECIOS.tortillaMedio +
    (Number(orden.tortillaKilo) || 0) * PRECIOS.tortillaKilo +
    (Number(orden.refresco) || 0) * PRECIOS.refresco +
    (Number(orden.salchichas) || 0) * PRECIOS.salchichas +
    (Number(orden.frijoles) || 0) * PRECIOS.frijoles;

  const extraManualMonto = Number(orden.extraManual) || 0;
  const costoEnvio = Number(orden.domicilio) || 0;

  const totalOrden = subtotalPollo + subtotalCrujiente + subtotalComplementos + extraManualMonto + costoEnvio;

  const pollosOrden = 
    (Number(orden.entero) || 0) * 1 +
    (Number(orden.chiltepin) || 0) * 1 +
    (Number(orden.enchipotlado) || 0) * 1 +
    (Number(orden.encebollado) || 0) * 1 +
    (Number(orden.crujienteEntero) || 0) * 1 +
    (Number(orden.mitad) || 0) * 0.5 +
    (Number(orden.crujienteMitad) || 0) * 0.5 +
    (Number(orden.paquete15) || 0) * 1.5 +
    (Number(orden.paqSaborMedio) || 0) * 1.5 +
    (Number(orden.paquete2) || 0) * 2 +
    (Number(orden.paq2Sabores) || 0) * 2 +
    (Number(orden.mixto) || 0) * 1 +
    (Number(orden.paqueteFamiliar) || 0) * 1.5;

  const refrescosEnPaquetes = 
    (Number(orden.paquete15) || 0) + 
    (Number(orden.paqSaborMedio) || 0) + 
    (Number(orden.paquete2) || 0) + 
    (Number(orden.paq2Sabores) || 0) + 
    (Number(orden.paqueteFamiliar) || 0);

  const refrescosOrden = (Number(orden.refresco) || 0) + refrescosEnPaquetes;

  const registrarVenta = async (e, tipo) => {
    e.preventDefault();
    if (totalOrden === 0 && costoEnvio === 0) return setModalAlerta({ visible: true, mensaje: "La orden está en ceros." });
    if (tipo === 'domicilio' && !orden.telefono) return setModalAlerta({ visible: true, mensaje: "Ingresa el teléfono del cliente." });

    const nuevaVenta = {
      id: Date.now(), tipo, fechaDia: hoyStr,
      hora: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      detalles: { ...orden, extraManual: extraManualMonto }, 
      subtotalPollo, subtotalCrujiente, subtotalComplementos, extraManual: extraManualMonto, costoEnvio,
      total: totalOrden, pollosTotales: pollosOrden, refrescosTotales: refrescosOrden, metodoPago: orden.metodoPago,
      telefono: orden.telefono || '', nombreCliente: orden.nombreCliente || '', notasEnvio: orden.notasEnvio || ''
    };

    try {
      if (orden.telefono && orden.telefono.length === 10 && orden.nombreCliente) {
         await db.collection('clientes').doc(orden.telefono).set({
            telefono: orden.telefono, nombre: orden.nombreCliente
         }, { merge: true });
      }
      await db.collection('ventas').add(nuevaVenta);
      
      await db.collection('config').doc('stock').set({ 
        pollos: firebase.firestore.FieldValue.increment(-pollosOrden), 
        refrescos: firebase.firestore.FieldValue.increment(-refrescosOrden) 
      }, { merge: true });

      setOrden({ 
        entero: 0, chiltepin: 0, enchipotlado: 0, encebollado: 0, mitad: 0, 
        crujienteEntero: 0, crujienteMitad: 0, 
        paquete15: 0, paqSaborMedio: 0, paquete2: 0, paq2Sabores: 0, mixto: 0, paqueteFamiliar: 0,
        extraManual: '',
        tortillaMedio: 0, tortillaKilo: 0, refresco: 0, salchichas: 0, frijoles: 0, 
        domicilio: '', notasEnvio: '', metodoPago: 'efectivo', telefono: '', nombreCliente: '' 
      });
      setBusquedaTelefonos([]);
      setBusquedaNombres([]);
      setMostrarSugerencias(false);
      setMostrarSugerenciasNombre(false);
    } catch (error) {
       setModalAlerta({ visible: true, mensaje: "Error al registrar la venta en la base de datos." });
    }
  };

  const registrarGasto = async (e) => {
    e.preventDefault();
    const monto = parseFloat(nuevoGasto.monto);
    if (!nuevoGasto.descripcion || isNaN(monto) || monto <= 0) return setModalAlerta({ visible: true, mensaje: "Gasto inválido." });
    await db.collection('gastos').add({ id: Date.now(), fechaDia: hoyStr, descripcion: nuevoGasto.descripcion, monto: monto });
    setNuevoGasto({ descripcion: '', monto: '' });
  };

  const eliminarRegistro = (dbId, idOriginal, tipo) => {
    if(!esPatron) return setModalAlerta({ visible: true, mensaje: "Solo el patrón puede eliminar registros." });
    setModalConfirmacion({
      visible: true, mensaje: `¿Eliminar permanentemente de tu base de datos?`,
      action: async () => {
        if (tipo === 'venta') {
          const v = ventas.find(v => v.id === idOriginal);
          if (v) {
            await db.collection('ventas').doc(dbId).delete();
            await db.collection('config').doc('stock').set({ 
              pollos: firebase.firestore.FieldValue.increment(v.pollosTotales || 0), 
              refrescos: firebase.firestore.FieldValue.increment(v.refrescosTotales || 0) 
            }, { merge: true });
          }
        }
        if (tipo === 'gasto') await db.collection('gastos').doc(dbId).delete();
      }
    });
  };

  const calcularResumen = (listaVentas, listaGastos) => {
    return listaVentas.reduce((acc, v) => {
      let det = v.detalles || {};
      acc.ventasTotales += v.total || 0;
      acc.ingresoEfectivo += v.metodoPago === 'efectivo' ? (v.total || 0) : 0;
      acc.ingresoTransferencia += v.metodoPago === 'transferencia' ? (v.total || 0) : 0;
      acc.pollos += v.pollosTotales || 0;
      
      const refPaq = (det.refresco || 0) + (det.paquete15 || 0) + (det.paqSaborMedio || 0) + (det.paquete2 || 0) + (det.paq2Sabores || 0) + (det.crujientePaq15 || 0) + (det.crujientePaq2 || 0) + (det.paqueteFamiliar || 0);
      acc.refrescosVendidos += refPaq;
      
      acc.salchichasVendidas += (det.salchichas || 0);
      acc.frijolesVendidos += (det.frijoles || 0);
      acc.extrasManualesTotales += (det.extraManual ? Number(det.extraManual) : 0);

      acc.crujientesReales += (det.crujienteEntero || 0) + (det.crujienteMitad || 0)*0.5 + (det.crujientePaq15 || 0)*1.5 + (det.crujientePaq2 || 0)*2 + (det.mixto || 0)*0.5;
      
      acc.paquetesDescuento += (det.paquete15 || 0)*20 + (det.paqSaborMedio || 0)*20 + (det.paquete2 || 0)*20 + (det.paq2Sabores || 0)*20 + (det.paqueteFamiliar || 0)*15;
      
      if (v.tipo === 'domicilio') {
          acc.cantidadEnvios += 1;
          if (v.metodoPago === 'efectivo') acc.costoEnvioEfectivo += (v.costoEnvio || 0);
          else acc.costoEnvioTransferencia += (v.costoEnvio || 0);
      }
      return acc;
    }, { 
      ventasTotales: 0, ingresoEfectivo: 0, ingresoTransferencia: 0, pollos: 0, 
      refrescosVendidos: 0, crujientesReales: 0, paquetesDescuento: 0, 
      salchichasVendidas: 0, frijolesVendidos: 0, extrasManualesTotales: 0,
      cantidadEnvios: 0, costoEnvioEfectivo: 0, costoEnvioTransferencia: 0,
      totalGastos: listaGastos.reduce((sum, g) => sum + (g.monto || 0), 0)
    });
  };

  const resHoy = calcularResumen(ventasHoy, gastosHoy);
  
  const pollosInicialHoy = stockPollos + resHoy.pollos - (entradasHoy.pollos || 0);
  const refrescosInicialHoy = stockRefrescos + resHoy.refrescosVendidos - (entradasHoy.refrescos || 0);

  const dineroSalchichas = resHoy.salchichasVendidas * PRECIOS.salchichas;
  const dineroFrijoles = resHoy.frijolesVendidos * PRECIOS.frijoles;
  const totalRetiroExtras = dineroSalchichas + dineroFrijoles;

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

  const exportarExcel = () => {
    let tablaHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <style>
          table { font-family: Arial, sans-serif; border-collapse: collapse; text-align: center; width: 100%; }
          th { border: 1px solid #dddddd; padding: 8px; }
          td { border: 1px solid #dddddd; padding: 8px; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th colspan="13" style="background-color: #ea580c; color: white; font-size: 24px; font-weight: bold; padding: 15px; text-align: center;">EL CHILPAYIN - REPORTE DE VENTAS Y UTILIDAD</th>
            </tr>
            <tr style="background-color: #1f2937; color: white; font-weight: bold;">
              <th>Fecha</th>
              <th>Pollos Vendidos</th>
              <th>Salchichas</th>
              <th>Frijoles</th>
              <th>Ventas Brutas</th>
              <th>Efectivo Cobrado</th>
              <th>Transferencias</th>
              <th>Gastos Físicos</th>
              <th>Retiro Extras</th>
              <th>Pago Tortillería</th>
              <th>Pago Repartidor</th>
              <th>Ganancia Neta (Utilidad Libre)</th>
              <th>Diezmo Sugerido (10%)</th>
            </tr>
          </thead>
          <tbody>
    `;

    historialDias.forEach(dia => {
      const rDia = calcularResumen(dia.ventas, dia.gastos);
      const dPaqDia = rDia.paquetesDescuento || 0;
      const tortillaDia = historialTortillas[dia.fecha.replace(/\//g, '-')] || { dejo: 0, regreso: 0 };
      const pTortillaDia = ((tortillaDia.dejo || 0) - (tortillaDia.regreso || 0)) * 21;
      
      const vNetasReales = (rDia.ingresoEfectivo + rDia.ingresoTransferencia) - dPaqDia;
      const cProduccion = rDia.pollos * costoPolloUnidad;
      const pEnvios = rDia.costoEnvioEfectivo + rDia.costoEnvioTransferencia;
      
      const extrasMontoDia = (rDia.salchichasVendidas * PRECIOS.salchichas) + (rDia.frijolesVendidos * PRECIOS.frijoles);

      const utilDia = vNetasReales - cProduccion - pTortillaDia - rDia.totalGastos - pEnvios - extrasMontoDia;
      const diezDia = utilDia > 0 ? utilDia * 0.10 : 0;

      tablaHTML += `
        <tr>
          <td style="font-weight: bold;">${dia.fecha}</td>
          <td style="color: #2563eb; font-weight: bold;">${rDia.pollos}</td>
          <td style="color: #ea580c; font-weight: bold;">${rDia.salchichasVendidas}</td>
          <td style="color: #9a3412; font-weight: bold;">${rDia.frijolesVendidos}</td>
          <td>$${rDia.ventasTotales.toFixed(2)}</td>
          <td style="color: #16a34a; font-weight: bold;">$${rDia.ingresoEfectivo.toFixed(2)}</td>
          <td style="color: #9333ea; font-weight: bold;">$${rDia.ingresoTransferencia.toFixed(2)}</td>
          <td style="color: #dc2626;">-$${rDia.totalGastos.toFixed(2)}</td>
          <td style="color: #dc2626;">-$${extrasMontoDia.toFixed(2)}</td>
          <td style="color: #eab308;">-$${pTortillaDia.toFixed(2)}</td>
          <td style="color: #dc2626;">-$${pEnvios.toFixed(2)}</td>
          <td style="background-color: #dcfce7; font-weight: bold; color: #166534;">$${utilDia.toFixed(2)}</td>
          <td style="background-color: #fef9c3; font-weight: bold; color: #854d0e;">$${diezDia.toFixed(2)}</td>
        </tr>
      `;
    });

    tablaHTML += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tablaHTML], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Reporte_Chilpayin_${hoyStr.replace(/\//g, '-')}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const kgVendidosTortilla = (tortillaProv.dejo || 0) - (tortillaProv.regreso || 0);
  const pTortillaProveedor = kgVendidosTortilla * 21;
  const pEnviosRepartidorEfectivo = resHoy.costoEnvioEfectivo || 0;
  const descPaquetesHoy = resHoy.paquetesDescuento || 0;
  
  const corteNetoFisicoHoy = resHoy.ingresoEfectivo - descPaquetesHoy - resHoy.totalGastos - pTortillaProveedor - pEnviosRepartidorEfectivo - totalRetiroExtras;

  const ventasNetasReales = (resHoy.ingresoEfectivo + resHoy.ingresoTransferencia) - descPaquetesHoy;
  const costoTotalProduccion = resHoy.pollos * costoPolloUnidad;
  const utilidadRealHoy = ventasNetasReales - costoTotalProduccion - pTortillaProveedor - resHoy.totalGastos - (resHoy.costoEnvioEfectivo + resHoy.costoEnvioTransferencia) - totalRetiroExtras;
  const diezmoSugerido = utilidadRealHoy > 0 ? utilidadRealHoy * 0.10 : 0;

  const menuTabs = [
    { id: 'local', icon: Iconos.Store, label: 'Local' },
    { id: 'domicilio', icon: Iconos.Truck, label: 'Envíos' },
    { id: 'gastos', icon: Iconos.MinusCircle, label: 'Gastos' }
  ];
  if (esPatron) {
    menuTabs.push({ id: 'cierre', icon: Iconos.Calculator, label: 'Caja/Stock' });
    menuTabs.push({ id: 'utilidad', icon: Iconos.TrendingUp, label: 'Utilidad' });
    menuTabs.push({ id: 'vip', icon: Iconos.Star, label: 'VIP' });
    menuTabs.push({ id: 'historial', icon: Iconos.CalendarDays, label: 'Historial' });
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 pb-10">
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
            <input type="password" value={inputPin} onChange={(e) => setInputPin(e.target.value)} placeholder="PIN" className="w-full text-center text-2xl tracking-[0.5em] p-3 border-2 rounded-lg focus:border-orange-500 outline-none mb-4" />
            <div className="flex gap-4">
              <button onClick={() => { setModalPin(false); setInputPin(''); }} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded font-bold">Cancelar</button>
              <button onClick={verificarPin} className="flex-1 bg-orange-600 text-white py-2 rounded font-bold">Entrar</button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-gray-900 text-white shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto p-4 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-orange-500 flex items-center gap-2"><Iconos.Utensils /> EL CHILPAYIN</h1>
          <button onClick={() => esPatron ? cerrarSesionPatron() : setModalPin(true)} className={`px-3 py-1.5 rounded font-bold text-sm ${esPatron ? 'bg-green-600' : 'bg-gray-700'}`}>
            {esPatron ? 'Patrón' : 'Empleado'}
          </button>
        </div>
        <div className="flex overflow-x-auto bg-gray-800 scrollbar-hide">
          {menuTabs.map(tab => (
            <button key={tab.id} onClick={() => setVista(tab.id)} className={`flex-1 min-w-[90px] py-3 text-xs sm:text-sm font-bold text-center flex flex-col items-center gap-1 ${vista === tab.id ? 'bg-orange-500 text-white border-b-4 border-orange-700' : 'text-gray-400'}`}>
              <tab.icon /> {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto mt-6 px-2 sm:px-4">
        {(vista === 'local' || vista === 'domicilio') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-7 space-y-4">
              
              {/* BLOQUE 1: POLLOS TRADICIONALES */}
              <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
                <h3 className="text-sm font-black text-orange-600 uppercase tracking-wider border-b pb-1">Pollos Tradicionales y Sabores</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <ProductoInput nombre="Pollo Asado" desc="$150" name="entero" value={orden.entero} onChange={handleOrdenChange} />
                  <ProductoInput nombre="Chiltepín" desc="$155" name="chiltepin" value={orden.chiltepin} onChange={handleOrdenChange} />
                  <ProductoInput nombre="Enchipotlado" desc="$155" name="enchipotlado" value={orden.enchipotlado} onChange={handleOrdenChange} />
                  <ProductoInput nombre="Encebollado" desc="$155" name="encebollado" value={orden.encebollado} onChange={handleOrdenChange} />
                  <ProductoInput nombre="Mitad Asado" desc="$80" name="mitad" value={orden.mitad} onChange={handleOrdenChange} />
                </div>
              </div>

              {/* BLOQUE 2: CRUJAN Y PAQUETES */}
              <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3 border-l-4 border-l-amber-500">
                <h3 className="text-sm font-black text-amber-600 uppercase tracking-wider border-b pb-1">Pollo Crujiente y Paquetes</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <ProductoInput nombre="Crujiente Entero" desc="$155" name="crujienteEntero" value={orden.crujienteEntero} onChange={handleOrdenChange} />
                  <ProductoInput nombre="Crujiente Mitad" desc="$80" name="crujienteMitad" value={orden.crujienteMitad} onChange={handleOrdenChange} />
                </div>

                <div className="border-t pt-2 mt-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Paquetes Especiales</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <ProductoInput nombre="Paquete Asado (1.5)" desc="$250" name="paquete15" value={orden.paquete15} onChange={handleOrdenChange} />
                    <ProductoInput nombre="Paq. Sabor + 1/2 Asado" desc="$255" name="paqSaborMedio" value={orden.paqSaborMedio} onChange={handleOrdenChange} />
                    <ProductoInput nombre="Paq. 2 Pollos (1 Asado + 1 Sabor)" desc="$325" name="paq2Sabores" value={orden.paq2Sabores} onChange={handleOrdenChange} />
                    <ProductoInput nombre="Paq. 2 Pollos Asados" desc="$320" name="paquete2" value={orden.paquete2} onChange={handleOrdenChange} />
                    <ProductoInput nombre="Pollo Mixto" desc="$150" name="mixto" value={orden.mixto} onChange={handleOrdenChange} />
                    <ProductoInput nombre="Paquete Familiar" desc="$290" name="paqueteFamiliar" value={orden.paqueteFamiliar} onChange={handleOrdenChange} />
                  </div>
                </div>
              </div>

              {/* BLOQUE 3: COMPLEMENTOS Y EXTRAS */}
              <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
                <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider border-b pb-1">Complementos y Bebidas</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <ProductoInput nombre="Tortilla 1/2 Kg" desc="$12" name="tortillaMedio" value={orden.tortillaMedio} onChange={handleOrdenChange} />
                  <ProductoInput nombre="Tortilla 1 Kg" desc="$24" name="tortillaKilo" value={orden.tortillaKilo} onChange={handleOrdenChange} />
                  <ProductoInput nombre="Refresco 1.5L" desc="$30" name="refresco" value={orden.refresco} onChange={handleOrdenChange} />
                  <ProductoInput nombre="Salchichas" desc="$20" name="salchichas" value={orden.salchichas} onChange={handleOrdenChange} />
                  <ProductoInput nombre="Frijoles" desc="$20" name="frijoles" value={orden.frijoles} onChange={handleOrdenChange} />
                </div>
              </div>

              {/* BLOQUE 4: CARGO EXTRA MANUAL */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 shadow-sm">
                <h3 className="text-sm font-black text-orange-700 uppercase mb-2 flex items-center gap-2">
                  <Iconos.PlusCircle /> Cobro Extra (Manual)
                </h3>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-700">$</span>
                  <input 
                    type="number" 
                    name="extraManual" 
                    value={orden.extraManual} 
                    onChange={handleOrdenChange} 
                    placeholder="Monto extra manual" 
                    min="0"
                    step="0.5"
                    className="w-full p-2.5 border rounded-lg font-bold text-lg text-gray-800 bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

            </section>

            {/* COLUMNA DERECHA: RESUMEN Y ENVÍO */}
            <section className="lg:col-span-5 space-y-4">
              {vista === 'domicilio' && (
                <div className="bg-gray-900 text-white p-4 rounded-xl shadow-inner space-y-3">
                  <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest border-b border-gray-800 pb-1 flex items-center gap-2">
                    <Iconos.Star /> Búsqueda VIP e Información
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
                    <div className="relative">
                      <label className="block text-[10px] text-gray-400 uppercase font-black mb-1">Buscar Número</label>
                      <input 
                        type="text" 
                        name="telefono" 
                        placeholder="Ej. 921..." 
                        value={orden.telefono} 
                        onChange={handleTelefonoChange} 
                        onFocus={() => orden.telefono.length > 2 && setMostrarSugerencias(true)} 
                        className="w-full text-gray-900 font-bold p-2.5 rounded-lg text-sm outline-none" 
                      />
                      {mostrarSugerencias && busquedaTelefonos.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white text-gray-900 border rounded-b-lg shadow-xl z-20 max-h-40 overflow-y-auto">
                          {busquedaTelefonos.map((c, idx) => (
                            <div key={idx} onMouseDown={() => seleccionarClientePredictivo(c)} className="p-2 hover:bg-orange-100 cursor-pointer text-xs border-b">
                              <span className="font-bold block">{c.telefono}</span>
                              <span className="text-gray-600">{c.nombre}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <label className="block text-[10px] text-gray-400 uppercase font-black mb-1">Nombre Cliente</label>
                      <input 
                        type="text" 
                        name="nombreCliente" 
                        placeholder="Nombre" 
                        value={orden.nombreCliente} 
                        onChange={handleNombreChange} 
                        onFocus={() => orden.nombreCliente.length > 2 && setMostrarSugerenciasNombre(true)} 
                        className="w-full text-gray-900 font-bold p-2.5 rounded-lg text-sm outline-none" 
                      />
                      {mostrarSugerenciasNombre && busquedaNombres.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white text-gray-900 border rounded-b-lg shadow-xl z-20 max-h-40 overflow-y-auto">
                          {busquedaNombres.map((c, idx) => (
                            <div key={idx} onMouseDown={() => seleccionarClientePredictivo(c)} className="p-2 hover:bg-orange-100 cursor-pointer text-xs border-b">
                              <span className="font-bold block">{c.nombre}</span>
                              <span className="text-gray-600">{c.telefono}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase font-black mb-1">Costo Envio ($)</label>
                      <input type="number" name="domicilio" value={orden.domicilio} onChange={handleOrdenChange} placeholder="0" className="w-full text-gray-900 font-bold p-2.5 rounded-lg text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase font-black mb-1">Notas Envío</label>
                      <input type="text" name="notasEnvio" value={orden.notasEnvio} onChange={handleOrdenChange} placeholder="Dirección / Ref" className="w-full text-gray-900 font-bold p-2.5 rounded-lg text-sm outline-none" />
                    </div>
                  </div>
                </div>
              )}

              {/* COBRO FINAL */}
              <div className="bg-white rounded-xl shadow-lg border p-5 space-y-4">
                <h3 className="text-base font-black text-gray-800 border-b pb-2 flex justify-between items-center">
                  <span>Resumen de Cobro</span>
                  <span className="text-2xl text-orange-600 font-black">${totalOrden.toFixed(2)}</span>
                </h3>

                <div className="space-y-1 text-sm text-gray-600 border-b pb-3">
                  <div className="flex justify-between"><span>Pollos:</span><span className="font-bold">${subtotalPollo.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Crujiente:</span><span className="font-bold">${subtotalCrujiente.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Complementos:</span><span className="font-bold">${subtotalComplementos.toFixed(2)}</span></div>
                  {extraManualMonto > 0 && <div className="flex justify-between text-orange-600 font-bold"><span>Extra Manual:</span><span>+${extraManualMonto.toFixed(2)}</span></div>}
                  {costoEnvio > 0 && <div className="flex justify-between text-blue-600 font-bold"><span>Envío:</span><span>+${costoEnvio.toFixed(2)}</span></div>}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-500 uppercase">Método de Pago</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setOrden(prev => ({ ...prev, metodoPago: 'efectivo' }))} className={`py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 ${orden.metodoPago === 'efectivo' ? 'bg-green-600 text-white shadow' : 'bg-gray-100 text-gray-700'}`}>
                      <Iconos.Banknote /> Efectivo
                    </button>
                    <button type="button" onClick={() => setOrden(prev => ({ ...prev, metodoPago: 'transferencia' }))} className={`py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 ${orden.metodoPago === 'transferencia' ? 'bg-purple-600 text-white shadow' : 'bg-gray-100 text-gray-700'}`}>
                      <Iconos.CreditCard /> Transferencia
                    </button>
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={(e) => registrarVenta(e, vista)} 
                  className={`w-full py-3.5 rounded-xl text-white font-black text-lg shadow-lg hover:opacity-90 transition ${vista === 'local' ? 'bg-orange-600' : 'bg-blue-600'}`}
                >
                  Registrar Venta (${totalOrden.toFixed(2)})
                </button>
              </div>
            </section>
          </div>
        )}

        {/* VISTA GASTOS */}
        {vista === 'gastos' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-600"><Iconos.MinusCircle /> Registrar Gasto</h2>
              <form onSubmit={registrarGasto} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
                  <input type="text" value={nuevoGasto.descripcion} onChange={(e) => setNuevoGasto(prev => ({ ...prev, descripcion: e.target.value }))} placeholder="Ej. Carbón, Verduras..." className="w-full p-2.5 border rounded-lg outline-none font-bold" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Monto ($)</label>
                  <input type="number" value={nuevoGasto.monto} onChange={(e) => setNuevoGasto(prev => ({ ...prev, monto: e.target.value }))} placeholder="0.00" className="w-full p-2.5 border rounded-lg outline-none font-bold" />
                </div>
                <button type="submit" className="w-full bg-red-600 text-white py-3 rounded-lg font-bold shadow">Guardar Gasto</button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border">
              <h3 className="font-bold text-lg mb-3">Gastos de Hoy ({hoyStr})</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {gastosHoy.map(g => (
                  <div key={g.dbId} className="flex justify-between items-center p-3 bg-red-50 border border-red-100 rounded-lg">
                    <div>
                      <span className="font-bold block text-gray-800">{g.descripcion}</span>
                      <span className="text-xs text-red-500 font-bold">${g.monto.toFixed(2)}</span>
                    </div>
                    {esPatron && (
                      <button onClick={() => eliminarRegistro(g.dbId, g.id, 'gasto')} className="text-red-600 hover:bg-red-200 p-2 rounded"><Iconos.Trash2 /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VISTA CIERRE / STOCK */}
        {vista === 'cierre' && esPatron && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl shadow border border-l-4 border-l-blue-500">
                <h3 className="font-black text-gray-700 mb-2">Stock Actual Pollos</h3>
                <p className="text-3xl font-black text-blue-600">{stockPollos.toFixed(1)} <span className="text-sm font-normal text-gray-500">piezas</span></p>
                <form onSubmit={agregarStockPollo} className="mt-3 flex gap-2">
                  <input type="number" value={ingresoPollo} onChange={(e) => setIngresoPollo(e.target.value)} placeholder="Entrada hoy" className="w-full p-2 border rounded font-bold text-sm" />
                  <button type="submit" className="bg-blue-600 text-white px-4 rounded font-bold text-sm">Entrada</button>
                </form>
                <form onSubmit={restarMermaPollo} className="mt-2 flex gap-2">
                  <input type="number" value={mermaPollo} onChange={(e) => setMermaPollo(e.target.value)} placeholder="Merma" className="w-full p-2 border rounded font-bold text-sm" />
                  <button type="submit" className="bg-red-600 text-white px-4 rounded font-bold text-sm">Merma</button>
                </form>
              </div>

              <div className="bg-white p-5 rounded-xl shadow border border-l-4 border-l-green-500">
                <h3 className="font-black text-gray-700 mb-2">Stock Actual Refrescos</h3>
                <p className="text-3xl font-black text-green-600">{stockRefrescos} <span className="text-sm font-normal text-gray-500">piezas</span></p>
                <form onSubmit={agregarStockRefresco} className="mt-3 flex gap-2">
                  <input type="number" value={ingresoRefresco} onChange={(e) => setIngresoRefresco(e.target.value)} placeholder="Entrada hoy" className="w-full p-2 border rounded font-bold text-sm" />
                  <button type="submit" className="bg-green-600 text-white px-4 rounded font-bold text-sm">Entrada</button>
                </form>
                <form onSubmit={restarMermaRefresco} className="mt-2 flex gap-2">
                  <input type="number" value={mermaRefresco} onChange={(e) => setMermaRefresco(e.target.value)} placeholder="Merma" className="w-full p-2 border rounded font-bold text-sm" />
                  <button type="submit" className="bg-red-600 text-white px-4 rounded font-bold text-sm">Merma</button>
                </form>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow border space-y-4">
              <h3 className="font-black text-lg text-gray-800 border-b pb-2">Control de Tortillas (Proveedor)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kg Dejados</label>
                  <input type="number" value={tortillaProv.dejo || ''} onChange={(e) => actualizarTortillaProv('dejo', e.target.value)} placeholder="0" className="w-full p-2 border rounded font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kg Regresados</label>
                  <input type="number" value={tortillaProv.regreso || ''} onChange={(e) => actualizarTortillaProv('regreso', e.target.value)} placeholder="0" className="w-full p-2 border rounded font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pago Proveedor ($21/kg)</label>
                  <p className="text-xl font-black text-orange-600 p-2">${pTortillaProveedor.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VISTA UTILIDAD */}
        {vista === 'utilidad' && esPatron && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow border space-y-4">
              <h2 className="text-xl font-black text-gray-800 border-b pb-2 flex justify-between items-center">
                <span>Resumen Financiero - Hoy ({hoyStr})</span>
                <button onClick={exportarExcel} className="bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Iconos.Download /> Exportar Excel</button>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <span className="block text-xs font-bold text-gray-500 uppercase">Ventas Brutas</span>
                  <span className="text-2xl font-black text-gray-800">${resHoy.ventasTotales.toFixed(2)}</span>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <span className="block text-xs font-bold text-green-700 uppercase">Efectivo Cobrado</span>
                  <span className="text-2xl font-black text-green-700">${resHoy.ingresoEfectivo.toFixed(2)}</span>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <span className="block text-xs font-bold text-purple-700 uppercase">Transferencias</span>
                  <span className="text-2xl font-black text-purple-700">${resHoy.ingresoTransferencia.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2">
                <h3 className="font-bold text-amber-900 border-b border-amber-200 pb-1">Corte Neto Físico en Caja</h3>
                <div className="flex justify-between text-sm text-amber-800"><span>Efectivo Cobrado:</span><span>${resHoy.ingresoEfectivo.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm text-red-600"><span>Gastos Físicos:</span><span>-${resHoy.totalGastos.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm text-red-600"><span>Tortillería:</span><span>-${pTortillaProveedor.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm text-red-600"><span>Retiro Extras:</span><span>-${totalRetiroExtras.toFixed(2)}</span></div>
                <div className="flex justify-between text-base font-black text-amber-950 border-t pt-1"><span>Efectivo Neto a Entregar:</span><span>${corteNetoFisicoHoy.toFixed(2)}</span></div>
              </div>

              <div className="bg-green-900 text-white p-5 rounded-xl space-y-3">
                <h3 className="font-black text-orange-400 text-lg border-b border-gray-700 pb-1">Utilidad Libre Real</h3>
                <div className="flex justify-between text-sm"><span>Ventas Reales:</span><span className="font-bold">${ventasNetasReales.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm text-red-300"><span>Costo Pollo (${costoPolloUnidad}/u):</span><span>-${costoTotalProduccion.toFixed(2)}</span></div>
                <div className="flex justify-between text-xl font-black text-green-400 border-t border-gray-700 pt-2"><span>Ganancia Neta:</span><span>${utilidadRealHoy.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm text-yellow-300 border-t border-gray-800 pt-1"><span>Diezmo Sugerido (10%):</span><span>${diezmoSugerido.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* VISTA VIP */}
        {vista === 'vip' && esPatron && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow border">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-orange-600"><Iconos.Star /> Clientes VIP</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100 font-bold border-b">
                    <tr>
                      <th className="p-2">Cliente</th>
                      <th className="p-2">Teléfono</th>
                      <th className="p-2">Pollos Comprados</th>
                      <th className="p-2">Pedidos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesVIP.map((c, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-bold">{c.nombre}</td>
                        <td className="p-2">{c.telefono}</td>
                        <td className="p-2 font-bold text-orange-600">{c.totalPollos}</td>
                        <td className="p-2">{c.totalPedidos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VISTA HISTORIAL */}
        {vista === 'historial' && esPatron && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow border">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Iconos.CalendarDays /> Historial de Ventas</h2>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {ventas.map(v => (
                  <div key={v.dbId} className="p-4 border rounded-lg bg-gray-50 flex justify-between items-center">
                    <div>
                      <span className="font-bold block text-gray-800">{v.fechaDia} - {v.hora} ({v.tipo.toUpperCase()})</span>
                      <span className="text-xs text-gray-600 block">{v.nombreCliente} {v.telefono}</span>
                      <span className="text-xs font-bold text-orange-600">${v.total.toFixed(2)} ({v.metodoPago})</span>
                    </div>
                    <button onClick={() => eliminarRegistro(v.dbId, v.id, 'venta')} className="text-red-600 p-2 hover:bg-red-100 rounded"><Iconos.Trash2 /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
