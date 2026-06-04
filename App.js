import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, ShoppingCart, DollarSign, Utensils, Trash2, TrendingUp, Truck, MapPin, Calculator, CalendarDays, Store, ClipboardList, MinusCircle, PackagePlus, CreditCard, Banknote, ListOrdered, Lock, Unlock } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB_CBmUwgFviyffpFpJ08n_WCfLBIXZVaw",
  authDomain: "chilpayin-4158c.firebaseapp.com",
  projectId: "chilpayin-4158c",
  storageBucket: "chilpayin-4158c.firebasestorage.app",
  messagingSenderId: "187448881352",
  appId: "1:187448881352:web:daebc92bff53fd0e5535fd"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const PRECIOS = { entero: 150, mitad: 80, paquete15: 245, paquete2: 310, tortillaMedio: 12, tortillaKilo: 24, refresco: 15 };
const EQUIVALENCIA_POLLOS = { entero: 1, mitad: 0.5, paquete15: 1.5, paquete2: 2 };
const PIN_PATRON = "1234";

export default function App() {
  const [user, setUser] = useState(null);
  const [vista, setVista] = useState('local');
  const [esPatron, setEsPatron] = useState(false);
  const [ventas, setVentas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [stockPollos, setStockPollos] = useState(0);
  const [stockRefrescos, setStockRefrescos] = useState(0);

  useEffect(() => {
    signInAnonymously(auth);
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubVentas = onSnapshot(collection(db, 'ventas'), (snap) => setVentas(snap.docs.map(d => ({ dbId: d.id, ...d.data() }))));
    const unsubGastos = onSnapshot(collection(db, 'gastos'), (snap) => setGastos(snap.docs.map(d => ({ dbId: d.id, ...d.data() }))));
    const unsubStock = onSnapshot(doc(db, 'config', 'stock'), (docSnap) => {
      if (docSnap.exists()) {
        setStockPollos(docSnap.data().pollos || 0);
        setStockRefrescos(docSnap.data().refrescos || 0);
      }
    });
    return () => { unsubVentas(); unsubGastos(); unsubStock(); };
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-black text-orange-600 text-center">EL CHILPAYIN</h1>
      <p className="text-center text-gray-500">Sistema Conectado</p>
    </div>
  );
}