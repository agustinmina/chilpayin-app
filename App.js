// 1. Extraemos React directamente del navegador
const { useState, useEffect, useMemo } = React;

// 2. Iconos integrados
const Iconos = {
  Utensils: () => <span>🍽️</span>, Lock: () => <span>🔒</span>, Unlock: () => <span>🔓</span>,
  Store: () => <span>🏪</span>, Truck: () => <span>🚚</span>, MinusCircle: () => <span>➖</span>,
  Calculator: () => <span>🧮</span>, CalendarDays: () => <span>📅</span>, Banknote: () => <span>💵</span>,
  CreditCard: () => <span>💳</span>, PlusCircle: () => <span>➕</span>, ListOrdered: () => <span>📋</span>,
  Trash2: () => <span>🗑️</span>, Download: () => <span>📥</span>, TrendingUp: () => <span>📈</span>,
  Star: () => <span>⭐</span>, Users: () => <span>👥</span>
};

// 3. Conexión Firebase (El Chilpayin)
const firebaseConfig = {
  apiKey: "PEGAR_AQUI_TU_NUEVA_LLAVE",
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
  tortillaMedio: 12, tortillaKilo: 24, refresco: 30 
};
const EQUIVALENCIA_POLLOS = { entero: 1, mitad: 0.5, paquete15: 1.5, paquete2: 2 };
const PIN_PATRON = "1234";

// 5. Componente de diseño
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
    crujienteEntero: 0, crujienteMitad: 0, crujientePaq15: 0, crujientePaq2: 0,
    tortillaMedio: 0, tortillaKilo: 0, refresco: 0, 
    domicilio: '', notasEnvio: '', metodoPago: 'efectivo',
    telefono: '', nombreCliente: ''
  });
  
  const [nuevoGasto, setNuevoGasto] = useState({ descripcion: '', monto: '' });
  const [ingresoPollo, setIngresoPollo] = useState('');
  const [ingresoRefresco, setIngresoRefresco] = useState('');
  const [mermaPollo, setMermaPollo] = useState('');
  const [mermaRefresco, setMermaRefresco] = useState('');
  
  // NUEVO: Agenda manual de clientes
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

    // Leer la agenda manual
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
  }, [user]);

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

  // INTELIGENCIA DE AUTOCOMPLETADO
  const handleOrdenChange = (e) => {
    const { name, value } = e.target;
    if (name === 'notasEnvio' || name === 'metodoPago' || name === 'nombreCliente') {
      setOrden(prev => ({ ...prev, [name]: value }));
    } else if (name === 'telefono') {
      const numClean = value.replace(/\D/g, '').slice(0, 10);
      setOrden(prev => {
        const updated = { ...prev, telefono: numClean };
        if (numClean.length === 10) {
          // 1. Buscar primero en la Agenda Manual
          const clienteAgenda = clientesAgenda.find(c => c.telefono === numClean);
          if (clienteAgenda) {
            updated.nombreCliente = clienteAgenda.nombre;
          } else {
            // 2. Si no está en la agenda, buscar en el historial de ventas
            const historialCliente = ventas.find(v => v.telefono === numClean);
            if (historialCliente) {
              updated.nombreCliente = historialCliente.nombreCliente || '';
              updated.notasEnvio = historialCliente.notasEnvio || '';
            }
          }
        }
        return updated;
      });
    } else {
      setOrden(prev => ({ ...prev, [name]: value === '' ? 0 : Math.max(0, parseInt(value) || 0) }));
    }
  };

  // REGISTRAR CLIENTE DESDE LA LIBRETA
  const agregarClienteManual = async (e) => {
    e.preventDefault();
    const tel = nuevoClienteManual.telefono.replace(/\D/g, '');
    if (tel.length !== 10 || !nuevoClienteManual.nombre) {
      return setModalAlerta({ visible: true, mensaje: "Ingresa 10 dígitos y el nombre." });
    }
    if (user) {
      await db.collection('clientes').doc(tel).set({
        telefono: tel,
        nombre: nuevoClienteManual.nombre,
        agregadoManual: true
      }, { merge: true });
      setNuevoClienteManual({ telefono: '', nombre: '' });
      setModalAlerta({ visible: true, mensaje: "¡Cliente guardado en la agenda!" });
    }
  };

  // CONSTRUCCIÓN DE LA TABLA VIP (Fusiona ventas y agenda)
  const clientesVIP = useMemo(() => {
    const mapa = {};
    
    // Primero, metemos a los que agregaste manualmente a la libreta
    clientesAgenda.forEach(c => {
      mapa[c.telefono] = {
        telefono: c.telefono,
        nombre: c.nombre,
        totalPollos: 0,
        totalPedidos: 0,
        fechas: new Set()
      };
    });

    // Luego, procesamos todas las ventas para sumarles pollos y pedidos
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
        // Actualizar nombre si en una venta pusieron uno mejor
        if (v.nombreCliente && v.nombreCliente !== 'Cliente Sin Nombre') {
          mapa[v.telefono].nombre = v.nombreCliente; 
        }
      }
    });

    return Object.values(mapa).sort((a, b) => b.totalPollos - a.totalPollos);
  }, [ventas, clientesAgenda]);

  const agregarStockPollo = async (e) => {
    e.preventDefault();
    const cantidad = parseFloat(ingresoPollo);
    if (isNaN(cantidad) || cantidad <= 0) return setModalAlerta({ visible: true, mensaje: "Ingresa cantidad válida." });
    if (user) {
      await db.collection('config').doc('stock').set({ pollos: stockPollos + cantidad }, { merge: true });
      await db.collection('entradas_diarias').doc(hoyStr.replace(/\//g, '-')).set({ pollos: (entradasHoy.pollos || 0) + cantidad }, { merge: true });
    }
    setIngresoPollo('');
  };

  const restarMermaPollo = async (e) => {
    e.preventDefault();
    const cantidad = parseFloat(mermaPollo);
    if (isNaN(cantidad) || cantidad <= 0) return setModalAlerta({ visible: true, mensaje: "Ingresa cantidad válida." });
    if (user) await db.collection('config').doc('stock').set({ pollos: stockPollos - cantidad }, { merge: true });
    setMermaPollo('');
  };

  const agregarStockRefresco = async (e) => {
    e.preventDefault();
    const cantidad = parseInt(ingresoRefresco);
    if (isNaN(cantidad) || cantidad <= 0) return setModalAlerta({ visible: true, mensaje: "Ingresa cantidad válida." });
    if (user) {
      await db.collection('config').doc('stock').set({ refrescos: stockRefrescos + cantidad }, { merge: true });
      await db.collection('entradas_diarias').doc(hoyStr.replace(/\//g, '-')).set({ refrescos: (entradasHoy.refrescos || 0) + cantidad }, { merge: true });
    }
    setIngresoRefresco('');
  };

  const restarMermaRefresco = async (e) => {
    e.preventDefault();
    const cantidad = parseInt(mermaRefresco);
    if (isNaN(cantidad) || cantidad <= 0) return setModalAlerta({ visible: true, mensaje: "Ingresa cantidad válida." });
    if (user) await db.collection('config').doc('stock').set({ refrescos: stockRefrescos - cantidad }, { merge: true });
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
      if (user) await db.collection('config').doc('costos').set({ costoPollo: costo }, { merge: true });
    }
  };

  const subtotalPollo = (orden.entero || 0) * PRECIOS.entero + (orden.mitad || 0) * PRECIOS.mitad + (orden.paquete15 || 0) * PRECIOS.paquete15 + (orden.paquete2 || 0) * PRECIOS.paquete2;
  const subtotalCrujiente = (orden.crujienteEntero || 0) * PRECIOS.entero + (orden.crujienteMitad || 0) * PRECIOS.mitad + (orden.crujientePaq15 || 0) * PRECIOS.paquete15 + (orden.crujientePaq2 || 0) * PRECIOS.paquete2;
  const subtotalComplementos = (orden.tortillaMedio || 0) * PRECIOS.tortillaMedio + (orden.tortillaKilo || 0) * PRECIOS.tortillaKilo + (orden.refresco || 0) * PRECIOS.refresco;
  const costoEnvio = parseFloat(orden.domicilio) || 0;
  const totalOrden = subtotalPollo + subtotalCrujiente + subtotalComplementos + costoEnvio;
  
  const pollosOrden = (orden.entero || 0) * EQUIVALENCIA_POLLOS.entero + (orden.mitad || 0) * EQUIVALENCIA_POLLOS.mitad + (orden.paquete15 || 0) * EQUIVALENCIA_POLLOS.paquete15 + (orden.paquete2 || 0) * EQUIVALENCIA_POLLOS.paquete2 + (orden.crujienteEntero || 0) * EQUIVALENCIA_POLLOS.entero + (orden.crujienteMitad || 0) * EQUIVALENCIA_POLLOS.mitad + (orden.crujientePaq15 || 0) * EQUIVALENCIA_POLLOS.paquete15 + (orden.crujientePaq2 || 0) * EQUIVALENCIA_POLLOS.paquete2;
  
  const refrescosEnPaquetes = (orden.paquete15 || 0) + (orden.paquete2 || 0) + (orden.crujientePaq15 || 0) + (orden.crujientePaq2 || 0);
  const refrescosOrden = (orden.refresco || 0) + refrescosEnPaquetes;

  const registrarVenta = async (e, tipo) => {
    e.preventDefault();
    if (totalOrden === 0 && costoEnvio === 0) return setModalAlerta({ visible: true, mensaje: "La orden está en ceros." });
    if (tipo === 'domicilio' && !orden.telefono) return setModalAlerta({ visible: true, mensaje: "Ingresa el teléfono del cliente." });
    if (!user) return setModalAlerta({ visible: true, mensaje: "Conectando a tu base de datos..." });

    const nuevaVenta = {
      id: Date.now(), tipo, fechaDia: hoyStr,
      hora: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      detalles: { ...orden }, subtotalPollo, subtotalCrujiente, subtotalComplementos, costoEnvio,
      total: totalOrden, pollosTotales: pollosOrden, refrescosTotales: refrescosOrden, metodoPago: orden.metodoPago,
      telefono: orden.telefono || '', nombreCliente: orden.nombreCliente || '', notasEnvio: orden.notasEnvio || ''
    };

    // Si pusieron nombre nuevo al cliente, lo actualizamos también en la Agenda invisible
    if (orden.telefono && orden.telefono.length === 10 && orden.nombreCliente) {
       await db.collection('clientes').doc(orden.telefono).set({
          telefono: orden.telefono, nombre: orden.nombreCliente
       }, { merge: true });
    }

    await db.collection('ventas').add(nuevaVenta);
    await db.collection('config').doc('stock').set({ pollos: stockPollos - pollosOrden, refrescos: stockRefrescos - refrescosOrden }, { merge: true });
    
    setOrden({ entero: 0, mitad: 0, paquete15: 0, paquete2: 0, crujienteEntero: 0, crujienteMitad: 0, crujientePaq15: 0, crujientePaq2: 0, tortillaMedio: 0, tortillaKilo: 0, refresco: 0, domicilio: '', notasEnvio: '', metodoPago: 'efectivo', telefono: '', nombreCliente: '' });
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
            await db.collection('config').doc('stock').set({ pollos: stockPollos + (v.pollosTotales || 0), refrescos: stockRefrescos + (v.refrescosTotales || 0) }, { merge: true });
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
      acc.refrescosVendidos += (det.refresco || 0) + (det.paquete15 || 0) + (det.paquete2 || 0) + (det.crujientePaq15 || 0) + (det.crujientePaq2 || 0);
      
      acc.crujientesReales += (det.crujienteEntero || 0) + (det.crujienteMitad || 0)*0.5 + (det.crujientePaq15 || 0)*1.5 + (det.crujientePaq2 || 0)*2;
      acc.paquetesDescuento += (det.paquete15 || 0)*15 + (det.paquete2 || 0)*10 + (det.crujientePaq15 || 0)*15 + (det.crujientePaq2 || 0)*10;
      
      if (v.tipo === 'domicilio') {
          acc.cantidadEnvios += 1;
          if (v.metodoPago === 'efectivo') acc.costoEnvioEfectivo += (v.costoEnvio || 0);
          else acc.costoEnvioTransferencia += (v.costoEnvio || 0);
      }
      return acc;
    }, { 
      ventasTotales: 0, ingresoEfectivo: 0, ingresoTransferencia: 0, pollos: 0, 
      refrescosVendidos: 0, crujientesReales: 0, paquetesDescuento: 0, 
      cantidadEnvios: 0, costoEnvioEfectivo: 0, costoEnvioTransferencia: 0,
      totalGastos: listaGastos.reduce((sum, g) => sum + (g.monto || 0), 0)
    });
  };

  const resHoy = calcularResumen(ventasHoy, gastosHoy);
  
  const pollosInicialHoy = stockPollos + resHoy.pollos - (entradasHoy.pollos || 0);
  const refrescosInicialHoy = stockRefrescos + resHoy.refrescosVendidos - (entradasHoy.refrescos || 0);

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
              <th colspan="10" style="background-color: #ea580c; color: white; font-size: 24px; font-weight: bold; padding: 15px; text-align: center;">EL CHILPAYIN - REPORTE DE VENTAS Y UTILIDAD</th>
            </tr>
            <tr style="background-color: #1f2937; color: white; font-weight: bold;">
              <th>Fecha</th>
              <th>Pollos Vendidos</th>
              <th>Ventas Brutas</th>
              <th>Efectivo Cobrado</th>
              <th>Transferencias</th>
              <th>Gastos Físicos</th>
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
      
      const utilDia = vNetasReales - cProduccion - pTortillaDia - rDia.totalGastos - pEnvios;
      const diezDia = utilDia > 0 ? utilDia * 0.10 : 0;

      tablaHTML += `
        <tr>
          <td style="font-weight: bold;">${dia.fecha}</td>
          <td style="color: #2563eb; font-weight: bold;">${rDia.pollos}</td>
          <td>$${rDia.ventasTotales.toFixed(2)}</td>
          <td style="color: #16a34a; font-weight: bold;">$${rDia.ingresoEfectivo.toFixed(2)}</td>
          <td style="color: #9333ea; font-weight: bold;">$${rDia.ingresoTransferencia.toFixed(2)}</td>
          <td style="color: #dc2626;">-$${rDia.totalGastos.toFixed(2)}</td>
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
  
  const corteNetoFisicoHoy = resHoy.ingresoEfectivo - descPaquetesHoy - resHoy.totalGastos - pTortillaProveedor - pEnviosRepartidorEfectivo;

  const ventasNetasReales = (resHoy.ingresoEfectivo + resHoy.ingresoTransferencia) - descPaquetesHoy;
  const costoTotalProduccion = resHoy.pollos * costoPolloUnidad;
  const utilidadRealHoy = ventasNetasReales - costoTotalProduccion - pTortillaProveedor - resHoy.totalGastos - (resHoy.costoEnvioEfectivo + resHoy.costoEnvioTransferencia);
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
            <section className="lg:col-span-6">
              <div className={`bg-white rounded-xl shadow-lg border-t-4 overflow-hidden ${vista === 'local' ? 'border-orange-500' : 'border-blue-500'}`}>
                <div className="p-3 border-b flex items-center justify-between bg-gray-50">
                  <div className="flex items-center gap-2">
                    {vista === 'local' ? <Iconos.Store /> : <Iconos.Truck />}
                    <h2 className="text-lg font-bold text-gray-800">{vista === 'local' ? 'Venta en Mostrador' : 'Servicio a Domicilio'}</h2>
                  </div>
                </div>
                <form onSubmit={(e) => registrarVenta(e, vista)} className="p-4 space-y-4">
                  
                  {vista === 'domicilio' && (
                    <div className="bg-gray-900 text-white p-4 rounded-xl shadow-inner space-y-3">
                       <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest border-b border-gray-800 pb-1 flex items-center gap-2"><Iconos.Star /> Identificador VIP</h3>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                         <div>
                           <label className="block text-[10px] text-gray-400 uppercase font-black mb-1">Teléfono (Celular)</label>
                           <input type="text" name="telefono" placeholder="10 dígitos..." value={orden.telefono} onChange={handleOrdenChange} className="w-full text-gray-900 font-bold p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-orange-500" />
                         </div>
                         <div>
                           <label className="block text-[10px] text-gray-400 uppercase font-black mb-1">Nombre Completo</label>
                           <input type="text" name="nombreCliente" placeholder="Ej. Juan Pérez..." value={orden.nombreCliente} onChange={handleOrdenChange} className="w-full text-gray-900 font-bold p-2.5 rounded-lg text-sm bg-white outline-none" />
                         </div>
                       </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-1 mb-2">Pollo Asado</h3>
                    <ProductoInput nombre="Pollo Entero" desc={`$${PRECIOS.entero}`} name="entero" value={orden.entero} onChange={handleOrdenChange} />
                    <ProductoInput nombre="Medio Pollo" desc={`$${PRECIOS.mitad}`} name="mitad" value={orden.mitad} onChange={handleOrdenChange} />
                    <ProductoInput nombre="Paquete 1.5 Pollos" desc={`$${PRECIOS.paquete15}`} name="paquete15" value={orden.paquete15} onChange={handleOrdenChange} />
                    <ProductoInput nombre="Paquete 2 Pollos" desc={`$${PRECIOS.paquete2}`} name="paquete2" value={orden.paquete2} onChange={handleOrdenChange} />
                  </div>

                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-black text-orange-600 uppercase tracking-widest border-b pb-1 mb-2">Pollo Crujiente</h3>
                    <ProductoInput nombre="Crujiente Entero" desc={`$${PRECIOS.entero}`} name="crujienteEntero" value={orden.crujienteEntero} onChange={handleOrdenChange} />
                    <ProductoInput nombre="Medio Crujiente" desc={`$${PRECIOS.mitad}`} name="crujienteMitad" value={orden.crujienteMitad} onChange={handleOrdenChange} />
                    <ProductoInput nombre="Paq. 1.5 Crujiente" desc={`$${PRECIOS.paquete15}`} name="crujientePaq15" value={orden.crujientePaq15} onChange={handleOrdenChange} />
                    <ProductoInput nombre="Paq. 2 Crujiente" desc={`$${PRECIOS.paquete2}`} name="crujientePaq2" value={orden.crujientePaq2} onChange={handleOrdenChange} />
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
                      <input type="text" name="notasEnvio" placeholder="Dirección de entrega completa..." value={orden.notasEnvio} onChange={handleOrdenChange} className="w-full text-sm p-2 border rounded font-semibold bg-white" />
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
                      {ventasHoy.map((v) => {
                        let det = v.detalles || {};
                        return (
                        <li key={v.dbId || v.id} className="p-3 hover:bg-gray-50 flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded">{v.hora}</span>
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${v.metodoPago === 'efectivo' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>{v.metodoPago}</span>
                              {v.tipo === 'domicilio' && <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700">Envío</span>}
                            </div>
                            {v.nombreCliente && (
                              <p className="text-xs font-black text-gray-800 uppercase">👤 {v.nombreCliente} <span className="text-gray-400 font-normal">({v.telefono})</span></p>
                            )}
                            <p className="text-xs text-gray-600 font-medium leading-relaxed mt-1">
                              {det.entero > 0 && `${det.entero} Asad(Ent) `}
                              {det.mitad > 0 && `${det.mitad} Asad(Mit) `}
                              {det.paquete15 > 0 && `${det.paquete15} AsadPq(1.5) `}
                              {det.paquete2 > 0 && `${det.paquete2} AsadPq(2) `}
                              {det.crujienteEntero > 0 && `${det.crujienteEntero} Cruj(Ent) `}
                              {det.crujienteMitad > 0 && `${det.crujienteMitad} Cruj(Mit) `}
                              {det.crujientePaq15 > 0 && `${det.crujientePaq15} CrujPq(1.5) `}
                              {det.crujientePaq2 > 0 && `${det.crujientePaq2} CrujPq(2) `}
                              {det.tortillaMedio > 0 && `${det.tortillaMedio} Tort(½) `}
                              {det.tortillaKilo > 0 && `${det.tortillaKilo} Tort(1kg) `}
                              {det.refresco > 0 && `${det.refresco} Ref `}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-2">
                            <span className="font-bold text-gray-800">${(v.total || 0).toFixed(2)}</span>
                            {esPatron && <button onClick={() => eliminarRegistro(v.dbId, v.id, 'venta')} className="text-red-400 hover:text-red-600 p-1"><Iconos.Trash2 /></button>}
                          </div>
                        </li>
                      )})}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {vista === 'gastos' && (
          <div className="max-w-lg mx-auto bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-500">
            <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2"><Iconos.MinusCircle /> Registrar Gasto Físico</h3>
            <p className="text-sm text-gray-500 mb-4">Usa esta ventana SOLO para el dinero que sacas de la caja (Ej. Hielo, Bolsas, Limpieza).</p>
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
                      <span className="text-red-600 font-black">-${(g.monto || 0).toFixed(2)}</span>
                      {esPatron && <button onClick={() => eliminarRegistro(g.dbId, g.id, 'gasto')} className="text-red-400 hover:text-red-600"><Iconos.Trash2 /></button>}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {esPatron && vista === 'cierre' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-indigo-500">
                <h3 className="font-black text-gray-800 text-lg mb-4">Stock de Mercancía Físico</h3>
                <div className="space-y-4">
                  <div className="bg-indigo-50 p-4 rounded-lg flex flex-col gap-2 border border-indigo-100">
                    <div className="flex justify-between items-center border-b border-indigo-200 pb-2 mb-1">
                      <span className="font-black text-indigo-900">Stock Real en Hielera:</span>
                      <span className={`text-4xl font-black ${stockPollos <= 5 ? 'text-red-600' : 'text-indigo-600'}`}>{stockPollos}</span>
                    </div>
                    <form onSubmit={agregarStockPollo} className="flex gap-2">
                      <input type="number" step="0.5" placeholder="Sumar Compras (+)" value={ingresoPollo} onChange={(e) => setIngresoPollo(e.target.value)} className="flex-1 border p-2 rounded text-center font-bold outline-none focus:border-indigo-500" />
                      <button type="submit" className="bg-indigo-600 text-white px-4 rounded font-bold">Sumar</button>
                    </form>
                    <form onSubmit={restarMermaPollo} className="flex gap-2 mt-1">
                      <input type="number" step="0.5" placeholder="Restar Mermas (-)" value={mermaPollo} onChange={(e) => setMermaPollo(e.target.value)} className="flex-1 border border-red-300 p-2 rounded text-center font-bold outline-none text-red-600 focus:border-red-500" />
                      <button type="submit" className="bg-red-600 text-white px-4 rounded font-bold">Restar</button>
                    </form>
                    <div className="flex justify-between text-indigo-800 font-bold text-xs mt-2 opacity-80">
                      <span>Iniciaste el día con: {pollosInicialHoy}</span>
                      <span>Vendidos hoy: {resHoy.pollos}</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg flex flex-col gap-2 border border-blue-100 mt-4">
                    <div className="flex justify-between items-center border-b border-blue-200 pb-2 mb-1">
                      <span className="font-black text-blue-900">Refrescos Reales:</span>
                      <span className={`text-4xl font-black ${stockRefrescos <= 5 ? 'text-red-600' : 'text-blue-600'}`}>{stockRefrescos}</span>
                    </div>
                    <form onSubmit={agregarStockRefresco} className="flex gap-2">
                      <input type="number" placeholder="Sumar Compras (+)" value={ingresoRefresco} onChange={(e) => setIngresoRefresco(e.target.value)} className="flex-1 border p-2 rounded text-center font-bold outline-none focus:border-blue-500" />
                      <button type="submit" className="bg-blue-600 text-white px-4 rounded font-bold">Sumar</button>
                    </form>
                    <form onSubmit={restarMermaRefresco} className="flex gap-2 mt-1">
                      <input type="number" placeholder="Restar Mermas (-)" value={mermaRefresco} onChange={(e) => setMermaRefresco(e.target.value)} className="flex-1 border border-red-300 p-2 rounded text-center font-bold outline-none text-red-600 focus:border-red-500" />
                      <button type="submit" className="bg-red-600 text-white px-4 rounded font-bold">Restar</button>
                    </form>
                    <div className="flex justify-between text-blue-800 font-bold text-xs mt-2 opacity-80">
                      <span>Iniciaste el día con: {refrescosInicialHoy}</span>
                      <span>Vendidos hoy: {resHoy.refrescosVendidos}</span>
                    </div>
                  </div>
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
                  <span className="font-black text-xl text-yellow-700">${pTortillaProveedor.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-500 h-fit">
              <h3 className="font-black text-gray-800 text-lg mb-4">Corte de Caja de Hoy (Físico)</h3>
              <div className="space-y-2 text-sm font-bold text-gray-600">
                <div className="flex justify-between p-2 bg-gray-50 rounded"><span>Ventas Totales (Bruto):</span> <span>${resHoy.ventasTotales.toFixed(2)}</span></div>
                <div className="flex justify-between p-2 bg-green-50 text-green-800 rounded"><span>Cobrado en Efectivo:</span> <span>${resHoy.ingresoEfectivo.toFixed(2)}</span></div>
                <div className="flex justify-between p-2 bg-purple-50 text-purple-800 rounded"><span>Cobrado x Transferencia:</span> <span>${resHoy.ingresoTransferencia.toFixed(2)}</span></div>
                
                <div className="flex justify-between p-2 bg-blue-50 text-blue-800 rounded mt-2">
                  <span>Envíos a Domicilio Realizados:</span> <span>{resHoy.cantidadEnvios} Viajes</span>
                </div>

                <div className="my-2 border-b-2 border-dashed border-gray-200"></div>
                
                <div className="flex justify-between p-2 text-red-600"><span>Gastos Físicos de Caja:</span> <span>-${resHoy.totalGastos.toFixed(2)}</span></div>
                <div className="flex justify-between p-2 text-orange-600"><span>Desc. Paquetes:</span> <span>-${descPaquetesHoy.toFixed(2)}</span></div>
                <div className="flex justify-between p-2 text-yellow-600"><span>Pago Tortilla Proveedor:</span> <span>-${pTortillaProveedor.toFixed(2)}</span></div>
                <div className="flex justify-between p-2 text-blue-600"><span>Pago a Repartidores (En Efectivo):</span> <span>-${pEnviosRepartidorEfectivo.toFixed(2)}</span></div>
              </div>
              <div className="mt-6 p-4 bg-green-600 rounded-lg text-white text-center shadow-inner">
                <span className="block text-sm uppercase tracking-wider mb-1 font-semibold">Dinero Físico Neto en Caja</span>
                <span className="text-4xl font-black">${corteNetoFisicoHoy.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {esPatron && vista === 'utilidad' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-orange-500">
              <h2 className="font-black text-xl text-gray-800 mb-2">Cálculo de Ganancia Real y Diezmo</h2>
              <div className="flex items-center gap-4 bg-orange-50 p-4 rounded-lg border border-orange-200 mb-6">
                 <div>
                    <label className="block text-xs font-bold text-orange-800 uppercase mb-1">Costo Operativo por Pollo ($)</label>
                    <input type="number" step="0.5" value={costoPolloUnidad} onChange={(e) => setCostoPolloUnidad(e.target.value)} onBlur={(e) => guardarCostoMateriaPrima(e.target.value)} className="w-32 p-2 border rounded font-black text-xl text-center outline-none focus:border-orange-500" />
                 </div>
                 <div className="text-sm font-semibold text-orange-900 opacity-80 leading-tight">
                    El sistema multiplicará este costo operativo por los {resHoy.pollos} pollos vendidos hoy.
                 </div>
              </div>

              <div className="space-y-2 text-sm font-bold text-gray-700 bg-gray-50 p-4 rounded-lg border">
                <div className="flex justify-between pb-2 border-b"><span>(+) Ingresos Netos de Hoy:</span> <span className="text-green-600">${ventasNetasReales.toFixed(2)}</span></div>
                <div className="flex justify-between pt-2"><span>(-) Costo de Producción:</span> <span className="text-red-600">-${costoTotalProduccion.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>(-) Costo de Tortillas:</span> <span className="text-red-600">-${pTortillaProveedor.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>(-) Pago Envíos Totales:</span> <span className="text-red-600">-${(resHoy.costoEnvioEfectivo + resHoy.costoEnvioTransferencia).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>(-) Otros Gastos Físicos del Local:</span> <span className="text-red-600">-${resHoy.totalGastos.toFixed(2)}</span></div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="p-6 bg-gray-900 text-white rounded-xl shadow text-center">
                    <span className="block text-xs uppercase opacity-80 tracking-widest mb-2 font-bold">Ganancia Libre del Día</span>
                    <span className="text-4xl font-black">${utilidadRealHoy.toFixed(2)}</span>
                 </div>
                 <div className="p-6 bg-yellow-500 text-yellow-900 rounded-xl shadow text-center border-2 border-yellow-600">
                    <span className="block text-xs uppercase opacity-80 tracking-widest mb-2 font-black">Diezmo Sugerido (10%)</span>
                    <span className="text-5xl font-black text-white drop-shadow-md">${diezmoSugerido.toFixed(2)}</span>
                 </div>
              </div>
            </div>
          </div>
        )}

        {esPatron && vista === 'vip' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* NUEVO: PANEL DE IMPORTACIÓN MANUAL */}
            <div className="bg-gray-900 rounded-xl shadow-lg border-t-4 border-blue-500 overflow-hidden text-white p-4 sm:p-6">
              <h3 className="font-black text-lg flex items-center gap-2 mb-2"><Iconos.Users /> Importar Cliente a la Agenda (Sin Ventas)</h3>
              <p className="text-xs text-gray-400 mb-4">Mete aquí los números de tu libreta vieja. Cuando el cajero teclee este número en un envío, el nombre aparecerá solo.</p>
              
              <form onSubmit={agregarClienteManual} className="flex flex-col sm:flex-row gap-3">
                 <input type="text" placeholder="Teléfono a 10 dígitos..." value={nuevoClienteManual.telefono} onChange={(e) => setNuevoClienteManual({...nuevoClienteManual, telefono: e.target.value.replace(/\D/g, '').slice(0, 10)})} className="flex-1 p-3 rounded-lg font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" />
                 <input type="text" placeholder="Nombre completo..." value={nuevoClienteManual.nombre} onChange={(e) => setNuevoClienteManual({...nuevoClienteManual, nombre: e.target.value})} className="flex-1 p-3 rounded-lg font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" />
                 <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors"><Iconos.PlusCircle /> Guardar Cliente</button>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow-lg border-t-4 border-orange-500 overflow-hidden">
               <div className="bg-gray-800 p-4 text-white">
                  <h3 className="font-black text-lg flex items-center gap-2"><Iconos.Star /> Bóveda de Fidelización: Clientes VIP</h3>
                  <p className="text-xs text-gray-400 mt-1">Análisis de lealtad basado en el número de pedidos a domicilio y volumen total de pollos.</p>
               </div>
               <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                  {clientesVIP.length === 0 ? (
                    <p className="text-sm text-gray-500 italic text-center py-6">Aún no hay clientes registrados con número telefónico.</p>
                  ) : (
                    clientesVIP.map((cliente, index) => {
                      let colorFondo = "bg-gray-50 border-gray-200";
                      let etiquetaStatus = "Cliente Nuevo / Importado";
                      let colorBadge = "bg-gray-200 text-gray-600 border-gray-300";

                      if (cliente.totalPedidos > 0 && cliente.totalPedidos <= 2) {
                        colorBadge = "bg-red-100 text-red-800 border-red-200";
                        etiquetaStatus = "Cliente Ocasional";
                      } else if (cliente.totalPedidos >= 3 && cliente.totalPedidos <= 6) {
                        colorFondo = "bg-blue-50/50 border-blue-100";
                        etiquetaStatus = "Cliente Frecuente";
                        colorBadge = "bg-blue-100 text-blue-800 border-blue-200";
                      } else if (cliente.totalPedidos >= 7) {
                        colorFondo = "bg-green-50 border-green-200 ring-2 ring-green-600/20";
                        etiquetaStatus = "👑 VIP MASTER";
                        colorBadge = "bg-green-600 text-white font-black";
                      }

                      return (
                        <div key={cliente.telefono} className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${colorFondo}`}>
                           <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                 <span className="font-black text-gray-400 text-sm">#{index + 1}</span>
                                 <h4 className="font-black text-base text-gray-900 uppercase">{cliente.nombre}</h4>
                                 <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${colorBadge}`}>{etiquetaStatus}</span>
                              </div>
                              <p className="text-sm font-mono text-gray-600 font-bold">📞 Teléfono: {cliente.telefono}</p>
                              <div className="pt-1 flex flex-wrap gap-1 items-center">
                                 <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">Fechas de compra:</span>
                                 {Array.from(cliente.fechas).length === 0 ? <span className="text-[9px] text-gray-400 italic">Solo en agenda</span> : Array.from(cliente.fechas).map(f => (
                                   <span key={f} className="text-[9px] font-bold bg-white border px-1.5 py-0.5 rounded text-gray-500 shadow-sm">{f}</span>
                                 ))}
                              </div>
                           </div>
                           
                           <div className="flex gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 justify-between">
                              <div className="text-center bg-white px-3 py-1.5 rounded-lg border shadow-sm">
                                 <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">Pedidos</span>
                                 <span className="text-xl font-black text-gray-800">{cliente.totalPedidos}</span>
                              </div>
                              <div className="text-center bg-white px-3 py-1.5 rounded-lg border shadow-sm">
                                 <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">Pollos</span>
                                 <span className="text-xl font-black text-orange-600">{cliente.totalPollos} kg</span>
                              </div>
                           </div>
                        </div>
                      );
                    })
                  )}
               </div>
            </div>
          </div>
        )}

        {esPatron && vista === 'historial' && (
          <div className="bg-white rounded-xl shadow-lg border-t-4 border-gray-800 overflow-hidden">
            <div className="bg-gray-800 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
               <h3 className="font-black text-white text-lg">Historial de Auditoría</h3>
               <button onClick={exportarExcel} className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg border border-green-500 w-full sm:w-auto justify-center"><Iconos.Download /> EXPORTAR EXCEL (DISEÑO VIP)</button>
            </div>
            <div className="divide-y-4 divide-gray-200">
              {historialDias.length === 0 ? (
                 <p className="p-6 text-center text-gray-500 font-bold">No hay registros de días anteriores todavía.</p>
              ) : (
                historialDias.map(dia => {
                  const resDia = calcularResumen(dia.ventas, dia.gastos);
                  const descPaquetesDia = resDia.paquetesDescuento || 0;
                  const tortillaDia = historialTortillas[dia.fecha.replace(/\//g, '-')] || { dejo: 0, regreso: 0 };
                  const kgTortillaDia = (tortillaDia.dejo || 0) - (tortillaDia.regreso || 0);
                  const pTortillaDia = kgTortillaDia * 21;
                  const pEnviosEfectivoDia = resDia.costoEnvioEfectivo || 0;

                  const efectivoNetoFisicoDia = resDia.ingresoEfectivo - resDia.totalGastos - descPaquetesDia - pTortillaDia - pEnviosEfectivoDia;

                  return (
                    <div key={dia.fecha} className="p-4 sm:p-6 bg-gray-50">
                      <h4 className="font-black text-xl text-orange-600 mb-4">{dia.fecha}</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="bg-white p-3 rounded shadow-sm border border-gray-100 text-center">
                          <span className="block text-[10px] text-gray-400 uppercase font-bold">Ventas Totales</span>
                          <span className="block text-lg font-black text-gray-800">${resDia.ventasTotales.toFixed(2)}</span>
                        </div>
                        <div className="bg-white p-3 rounded shadow-sm border border-purple-100 text-center">
                          <span className="block text-[10px] text-gray-400 uppercase font-bold">Transferencias</span>
                          <span className="block text-lg font-black text-purple-600">${resDia.ingresoTransferencia.toFixed(2)}</span>
                        </div>
                        <div className="bg-white p-3 rounded shadow-sm border border-blue-100 text-center">
                          <span className="block text-[10px] text-gray-400 uppercase font-bold">Pollos Vendidos</span>
                          <span className="block text-lg font-black text-blue-600">{resDia.pollos}</span>
                        </div>
                        
                        <div className="bg-white p-3 rounded shadow-sm border border-green-100 text-center">
                          <span className="block text-[10px] text-gray-400 uppercase font-bold">Efectivo Cobrado</span>
                          <span className="block text-lg font-black text-green-600">${resDia.ingresoEfectivo.toFixed(2)}</span>
                        </div>
                        <div className="bg-white p-3 rounded shadow-sm border border-red-100 text-center">
                          <span className="block text-[10px] text-gray-400 uppercase font-bold">Gastos Físicos</span>
                          <span className="block text-lg font-black text-red-600">-${resDia.totalGastos.toFixed(2)}</span>
                        </div>
                        <div className="bg-white p-3 rounded shadow-sm border border-blue-100 text-center">
                          <span className="block text-[10px] text-gray-400 uppercase font-bold">Envíos Pagados</span>
                          <span className="block text-lg font-black text-blue-600">{resDia.cantidadEnvios} (-${pEnviosEfectivoDia} Efc)</span>
                        </div>
                        
                        <div className="col-span-2 sm:col-span-3 bg-green-600 p-4 rounded-lg shadow-md text-center text-white mt-2">
                           <span className="block text-xs uppercase font-bold opacity-80 tracking-widest mb-1">Efectivo Físico Neto</span>
                           <span className="block text-3xl font-black">${efectivoNetoFisicoDia.toFixed(2)}</span>
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

// 7. Renderizamos la aplicación en el DOM
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
