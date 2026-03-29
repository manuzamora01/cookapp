// js/perfil_ajeno.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Leer la ID del usuario desde la URL (ej: perfil_ajeno.html?id=12345)
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('id');

let currentUser = null;
let recetas = [];
let recetaActualSeleccionada = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) window.location.href = 'index.html';
  else {
    currentUser = user;
    if (!userId) { alert("Usuario no encontrado"); window.location.href = 'inicio.html'; return; }
    await cargarPerfil();
    await cargarRecetas();
    await cargarMisCategorias(); // Para el selector de guardar
  }
});

async function cargarPerfil() {
  const snap = await getDoc(doc(db, 'usuarios', userId));
  if (snap.exists()) {
    const d = snap.data();
    document.getElementById('perfil-nombre').textContent = d.nombre;
    document.getElementById('perfil-apodo').textContent = '@' + d.apodo;
    const avatar = document.getElementById('perfil-avatar');
    if (d.fotoPerfil) avatar.innerHTML = `<img src="${d.fotoPerfil}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    else avatar.textContent = d.apodo.charAt(0).toUpperCase();
  }
}

async function cargarRecetas() {
  const q = query(collection(db, 'recetas'), where('autorId', '==', userId));
  const snapshot = await getDocs(q);
  recetas = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  recetas.sort((a, b) => b.fecha?.seconds - a.fecha?.seconds);

  let htmlStr = '';
  recetas.forEach((r, i) => {
    const img = r.imagenBase64 || 'https://via.placeholder.com/300';
    htmlStr += `
      <div class="recipe-card" onclick="abrirModal(${i})">
        <img src="${img}" class="recipe-img">
        <div class="recipe-title-container">
          <h3 class="recipe-title" style="margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${r.titulo}</h3>
        </div>
      </div>`;
  });
  document.getElementById('recipe-container').innerHTML = htmlStr || '<p style="text-align:center; color:#888;">No tiene recetas.</p>';
}

async function cargarMisCategorias() {
  const snap = await getDoc(doc(db, 'usuarios', currentUser.uid));
  const select = document.getElementById('select-categoria-guardar');
  select.innerHTML = '';
  if (snap.exists() && snap.data().misCategorias) {
    snap.data().misCategorias.forEach(cat => select.innerHTML += `<option value="${cat}">${cat}</option>`);
  }
  select.innerHTML += `<option value="Guardadas">Guardadas (General)</option>`;
}

window.abrirModal = (index) => {
  recetaActualSeleccionada = recetas[index];
  document.getElementById('modal-img').src = recetaActualSeleccionada.imagenBase64 || 'https://via.placeholder.com/300';
  document.getElementById('modal-title').textContent = recetaActualSeleccionada.titulo;
  document.getElementById('modal-ingredients').textContent = recetaActualSeleccionada.ingredientes;
  document.getElementById('modal-steps').textContent = recetaActualSeleccionada.preparacion;
  document.getElementById('modal-receta').classList.add('active');
};

window.cerrarModal = () => document.getElementById('modal-receta').classList.remove('active');

window.guardarReceta = async () => {
  const categoria = document.getElementById('select-categoria-guardar').value;
  try {
    await addDoc(collection(db, 'guardadas'), {
      recetaId: recetaActualSeleccionada.id,
      usuarioId: currentUser.uid,
      categoria: categoria,
      fechaGuardado: serverTimestamp()
    });
    alert('¡Receta guardada en: ' + categoria + '!');
    cerrarModal();
  } catch (error) { alert('Error al guardar.'); }
};