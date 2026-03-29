// js/app.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, query, orderBy, getDocs, doc, getDoc, addDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const recipeContainer = document.getElementById('recipe-container');
const loadingDiv = document.getElementById('loading');
const btnLogout = document.getElementById('btn-logout');

let recetasGlobales = [];
let currentUser = null;
let currentUserData = null; // Guardaremos aquí tus datos (incluyendo tu rol de moderador)
let recetaActualSeleccionada = null; // Para saber qué receta estamos viendo en el modal

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'index.html';
  } else {
    currentUser = user;
    await cargarDatosUsuario();
    cargarRecetas();
  }
});

btnLogout.addEventListener('click', async () => { await signOut(auth); });

// Cargar tus datos (Categorías para el selector de guardar y Rol de moderador)
async function cargarDatosUsuario() {
  const userSnap = await getDoc(doc(db, 'usuarios', currentUser.uid));
  if (userSnap.exists()) {
    currentUserData = userSnap.data();
    
    // Rellenamos el selector de guardar recetas
    const select = document.getElementById('select-categoria-guardar');
    select.innerHTML = '';
    if (currentUserData.misCategorias) {
      currentUserData.misCategorias.forEach(cat => select.innerHTML += `<option value="${cat}">${cat}</option>`);
    }
    select.innerHTML += `<option value="Guardadas">Guardadas (General)</option>`;
  }
}

async function cargarRecetas() {
  try {
    const q = query(collection(db, 'recetas'), orderBy('fecha', 'desc'));
    const snapshot = await getDocs(q);
    loadingDiv.style.display = 'none';

    if (snapshot.empty) {
      recipeContainer.innerHTML = '<p style="grid-column: span 2; text-align: center; color: #888;">No hay recetas publicadas aún.</p>';
      return;
    }

    let htmlStr = '';
    recetasGlobales = []; 

    for (let i = 0; i < snapshot.docs.length; i++) {
      const documento = snapshot.docs[i];
      const receta = { id: documento.id, ...documento.data() };
      let autorApodo = 'Anónimo';

      if (receta.autorId) {
        const autorSnap = await getDoc(doc(db, 'usuarios', receta.autorId));
        if (autorSnap.exists()) autorApodo = autorSnap.data().apodo;
      }
      receta.autorApodo = autorApodo; 
      recetasGlobales.push(receta);

      const imagenUrl = receta.imagenBase64 || 'https://via.placeholder.com/300?text=Sin+Foto';
      const dietaChip = (receta.dieta && receta.dieta !== 'Ninguna') ? `<span style="display:inline-block; background:var(--color-primario); color:#fff; font-size:10px; padding:2px 8px; border-radius:10px; margin-top:5px;">${receta.dieta}</span>` : '';

      htmlStr += `
        <div class="recipe-card" onclick="abrirModal(${i})">
          <img src="${imagenUrl}" alt="${receta.titulo}" class="recipe-img">
          <div class="recipe-info">
            <h3 class="recipe-title">${receta.titulo}</h3>
            <p class="recipe-author">@${autorApodo}</p>
            ${dietaChip}
          </div>
        </div>
      `;
    }
    recipeContainer.innerHTML = htmlStr;
  } catch (error) {
    console.error("Error al cargar recetas:", error);
    loadingDiv.innerHTML = '<p style="color: #FF5A5A;">Error al cargar las recetas.</p>';
  }
}

// --- LÓGICA DEL MODAL ---
window.abrirModal = (index) => {
  recetaActualSeleccionada = recetasGlobales[index];
  
  document.getElementById('modal-img').src = recetaActualSeleccionada.imagenBase64 || 'https://via.placeholder.com/300?text=Sin+Foto';
  document.getElementById('modal-title').textContent = recetaActualSeleccionada.titulo;
  document.getElementById('modal-author').innerHTML = `<a href="perfil_ajeno.html?id=${recetaActualSeleccionada.autorId}" style="color: var(--color-primario); text-decoration: none;">Por: @${recetaActualSeleccionada.autorApodo}</a>`;
  document.getElementById('modal-ingredients').textContent = recetaActualSeleccionada.ingredientes;
  document.getElementById('modal-steps').textContent = recetaActualSeleccionada.preparacion;

  let tagsHtml = '';
  if (recetaActualSeleccionada.dieta && recetaActualSeleccionada.dieta !== 'Ninguna') tagsHtml += `<span style="background:var(--color-primario); color:#fff; font-size:12px; padding:4px 10px; border-radius:15px; font-weight:bold;">${recetaActualSeleccionada.dieta}</span>`;
  if (recetaActualSeleccionada.alergenos && recetaActualSeleccionada.alergenos.length > 0) tagsHtml += `<span style="background:#FF8A8A; color:#fff; font-size:12px; padding:4px 10px; border-radius:15px; font-weight:bold;">⚠️ Contiene: ${recetaActualSeleccionada.alergenos.join(', ')}</span>`;
  document.getElementById('modal-tags').innerHTML = tagsHtml;

  // 1. Mostrar Guardar (si no es tuya)
  if (recetaActualSeleccionada.autorId !== currentUser.uid) {
    document.getElementById('modal-seccion-guardar').style.display = 'block';
  } else {
    document.getElementById('modal-seccion-guardar').style.display = 'none';
  }

  // 2. Mostrar Borrar/Editar (si es tuya O si eres MODERADOR)
  if (recetaActualSeleccionada.autorId === currentUser.uid || (currentUserData && currentUserData.rol === 'moderador')) {
    document.getElementById('modal-seccion-mod').style.display = 'flex';
  } else {
    document.getElementById('modal-seccion-mod').style.display = 'none';
  }

  document.getElementById('modal-receta').classList.add('active');
};

window.cerrarModal = () => document.getElementById('modal-receta').classList.remove('active');

// --- ACCIONES DEL MODAL ---
window.guardarRecetaDesdeInicio = async () => {
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

window.borrarRecetaDesdeInicio = async () => {
  if (!confirm('¿Seguro que quieres borrar esta receta para siempre?')) return;
  try {
    await deleteDoc(doc(db, 'recetas', recetaActualSeleccionada.id));
    alert('Receta borrada correctamente.');
    cerrarModal();
    cargarRecetas(); // Recargar la lista para que desaparezca
  } catch (error) { alert('Error al borrar la receta.'); }
};

window.editarRecetaDesdeInicio = () => {
  window.location.href = `editar_receta.html?id=${recetaActualSeleccionada.id}`;
};