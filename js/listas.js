// js/listas.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

let currentUser = null;
let pestañaActiva = 'misCategorias';
let datosListas = { misCategorias: [], misDietas: [], misAlergenos: [] };

onAuthStateChanged(auth, async (user) => {
  if (!user) window.location.href = 'index.html';
  else {
    currentUser = user;
    await cargarListas();
    renderizarLista();
  }
});

async function cargarListas() {
  const snap = await getDoc(doc(db, 'usuarios', currentUser.uid));
  if (snap.exists()) {
    const data = snap.data();
    datosListas.misCategorias = data.misCategorias || [];
    datosListas.misDietas = data.misDietas || ['Ninguna', 'Vegetariana', 'Vegana'];
    datosListas.misAlergenos = data.misAlergenos || ['Gluten', 'Lácteos', 'Huevos'];
  }
}

window.cambiarPestaña = (pestaña, btnElement) => {
  pestañaActiva = pestaña;
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  btnElement.classList.add('active');
  renderizarLista();
};

window.añadirItem = async () => {
  const input = document.getElementById('input-nuevo');
  const valor = input.value.trim();
  if (!valor || datosListas[pestañaActiva].includes(valor)) return;

  try {
    await updateDoc(doc(db, 'usuarios', currentUser.uid), {
      [pestañaActiva]: arrayUnion(valor)
    });
    datosListas[pestañaActiva].push(valor);
    input.value = '';
    renderizarLista();
  } catch (error) { alert("Error al añadir"); }
};

window.borrarItem = async (valor) => {
  if (!confirm(`¿Borrar "${valor}"?`)) return;
  try {
    await updateDoc(doc(db, 'usuarios', currentUser.uid), {
      [pestañaActiva]: arrayRemove(valor)
    });
    datosListas[pestañaActiva] = datosListas[pestañaActiva].filter(i => i !== valor);
    renderizarLista();
  } catch (error) { alert("Error al borrar"); }
};

function renderizarLista() {
  const contenedor = document.getElementById('contenedor-lista');
  const items = datosListas[pestañaActiva];
  
  if (items.length === 0) {
    contenedor.innerHTML = '<p style="text-align:center; color:#888;">No hay elementos.</p>';
    return;
  }

  let htmlStr = '';
  items.forEach(item => {
    htmlStr += `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:15px; border-bottom:1px solid #EAEAEA;">
        <span style="font-size: 16px;">${item}</span>
        <i class="bi bi-trash3-fill" style="color: #FF5A5A; cursor: pointer; font-size: 18px;" onclick="borrarItem('${item}')"></i>
      </div>
    `;
  });
  contenedor.innerHTML = htmlStr;
}