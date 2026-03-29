// js/app.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, query, orderBy, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const recipeContainer = document.getElementById('recipe-container');
const loadingDiv = document.getElementById('loading');
const btnLogout = document.getElementById('btn-logout');

// Guardaremos las recetas aquí para poder leerlas al abrir el modal
let recetasGlobales = [];

onAuthStateChanged(auth, (user) => {
  if (!user) window.location.href = 'index.html';
  else cargarRecetas();
});

btnLogout.addEventListener('click', async () => { await signOut(auth); });

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
    recetasGlobales = []; // Reiniciamos el array

    // Usamos un bucle clásico para tener el índice (i) a mano
    for (let i = 0; i < snapshot.docs.length; i++) {
      const documento = snapshot.docs[i];
      const receta = { id: documento.id, ...documento.data() };
      let autorApodo = 'Anónimo';

      if (receta.autorId) {
        const autorSnap = await getDoc(doc(db, 'usuarios', receta.autorId));
        if (autorSnap.exists()) autorApodo = autorSnap.data().apodo;
      }
      receta.autorApodo = autorApodo; // Lo guardamos para el modal
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

// --- LÓGICA DEL MODAL (Expuesta a global para que el HTML la encuentre) ---
window.abrirModal = (index) => {
  const receta = recetasGlobales[index];
  
  document.getElementById('modal-img').src = receta.imagenBase64 || 'https://via.placeholder.com/300?text=Sin+Foto';
  document.getElementById('modal-title').textContent = receta.titulo;
  // Hacemos que el nombre sea un enlace que mande la ID del autor en la URL
  document.getElementById('modal-author').innerHTML = `<a href="perfil_ajeno.html?id=${receta.autorId}" style="color: var(--color-primario); text-decoration: none;">Por: @${receta.autorApodo}</a>`;
  document.getElementById('modal-ingredients').textContent = receta.ingredientes;
  document.getElementById('modal-steps').textContent = receta.preparacion;

  // Renderizar las etiquetas (Dietas y Alérgenos)
  let tagsHtml = '';
  if (receta.dieta && receta.dieta !== 'Ninguna') {
    tagsHtml += `<span style="background:var(--color-primario); color:#fff; font-size:12px; padding:4px 10px; border-radius:15px; font-weight:bold;">${receta.dieta}</span>`;
  }
  if (receta.alergenos && receta.alergenos.length > 0) {
    tagsHtml += `<span style="background:#FF8A8A; color:#fff; font-size:12px; padding:4px 10px; border-radius:15px; font-weight:bold;">⚠️ Contiene: ${receta.alergenos.join(', ')}</span>`;
  }
  document.getElementById('modal-tags').innerHTML = tagsHtml;

  document.getElementById('modal-receta').classList.add('active');
};

window.cerrarModal = () => {
  document.getElementById('modal-receta').classList.remove('active');
};