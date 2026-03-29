// js/perfil.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const recipeContainer = document.getElementById('recipe-container');
const loadingDiv = document.getElementById('loading');
const btnLogout = document.getElementById('btn-logout');

const tabPropias = document.getElementById('tab-propias');
const tabGuardadas = document.getElementById('tab-guardadas');
const buscadorInput = document.getElementById('buscador-perfil');

let currentUser = null;
let misRecetas = [];
let recetasGuardadas = [];
let pestañaActiva = 'propias';

// Filtros actuales
let textoBusqueda = '';
let catSeleccionada = '';
let dietaSeleccionada = '';
let alergenoSeleccionado = '';

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'index.html';
  } else {
    currentUser = user;
    await cargarPerfilUsuario(user.uid);
    await cargarMisRecetas(user.uid);
    await cargarRecetasGuardadas(user.uid);
    extraerFiltrosUnicos(); // Llenar los select de los filtros
    renderizarRecetas();
  }
});

btnLogout.addEventListener('click', async () => { await signOut(auth); });

// --- CARGAR DATOS ---
window.cargarPerfilUsuario = async function(uid) {
  try {
    const userSnap = await getDoc(doc(db, 'usuarios', uid));
    if (userSnap.exists()) {
      window.datosUsuarioActual = userSnap.data();
      document.getElementById('perfil-nombre').textContent = window.datosUsuarioActual.nombre;
      document.getElementById('perfil-apodo').textContent = '@' + window.datosUsuarioActual.apodo;
      
      const avatarDiv = document.getElementById('perfil-avatar');
      if (window.datosUsuarioActual.fotoPerfil) {
        avatarDiv.innerHTML = `<img src="${window.datosUsuarioActual.fotoPerfil}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
      } else {
        avatarDiv.textContent = window.datosUsuarioActual.apodo.charAt(0).toUpperCase();
      }
    }
  } catch (error) { console.error("Error al cargar usuario:", error); }
}

async function cargarMisRecetas(uid) {
  try {
    const q = query(collection(db, 'recetas'), where('autorId', '==', uid));
    const snapshot = await getDocs(q);
    misRecetas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    misRecetas.sort((a, b) => b.fecha?.seconds - a.fecha?.seconds);
  } catch (error) { console.error("Error al cargar mis recetas:", error); }
}

async function cargarRecetasGuardadas(uid) {
  try {
    const qGuardadas = query(collection(db, 'guardadas'), where('usuarioId', '==', uid));
    const snapshotGuardadas = await getDocs(qGuardadas);
    recetasGuardadas = [];
    
    for (const documento of snapshotGuardadas.docs) {
      const datosGuardado = documento.data();
      const recetaSnap = await getDoc(doc(db, 'recetas', datosGuardado.recetaId));
      
      if (recetaSnap.exists()) {
        const recetaReal = recetaSnap.data();
        let autorApodo = 'Anónimo';
        if (recetaReal.autorId) {
          const autorSnap = await getDoc(doc(db, 'usuarios', recetaReal.autorId));
          if (autorSnap.exists()) autorApodo = autorSnap.data().apodo;
        }
        recetasGuardadas.push({ ...recetaReal, id: datosGuardado.recetaId, autorApodo: autorApodo, categoriaGuardada: datosGuardado.categoria });
      }
    }
  } catch (error) { console.error("Error al cargar recetas guardadas:", error); }
}

// --- LÓGICA DE BUSCADOR Y FILTROS ---
buscadorInput.addEventListener('input', (e) => {
  textoBusqueda = e.target.value.toLowerCase();
  renderizarRecetas();
});

function extraerFiltrosUnicos() {
  const todas = [...misRecetas, ...recetasGuardadas];
  const categorias = new Set();
  const dietas = new Set();
  const alergenos = new Set();

  todas.forEach(r => {
    if (r.categoria) categorias.add(r.categoria);
    if (r.categoriaGuardada) categorias.add(r.categoriaGuardada);
    if (r.dieta && r.dieta !== 'Ninguna') dietas.add(r.dieta);
    if (r.alergenos) r.alergenos.forEach(a => alergenos.add(a));
  });

  const selectCat = document.getElementById('filtro-categoria');
  const selectDieta = document.getElementById('filtro-dieta');
  const selectAlergeno = document.getElementById('filtro-alergeno');

  categorias.forEach(c => selectCat.innerHTML += `<option value="${c}">${c}</option>`);
  dietas.forEach(d => selectDieta.innerHTML += `<option value="${d}">${d}</option>`);
  alergenos.forEach(a => selectAlergeno.innerHTML += `<option value="${a}">${a}</option>`);
}

window.abrirModalFiltros = () => document.getElementById('modal-filtros').classList.add('active');
window.cerrarModalFiltros = () => document.getElementById('modal-filtros').classList.remove('active');

window.aplicarFiltros = () => {
  catSeleccionada = document.getElementById('filtro-categoria').value;
  dietaSeleccionada = document.getElementById('filtro-dieta').value;
  alergenoSeleccionado = document.getElementById('filtro-alergeno').value;
  
  // Cambiar el color del icono si hay filtros activos
  const iconoFiltro = document.getElementById('btn-abrir-filtros');
  if (catSeleccionada || dietaSeleccionada || alergenoSeleccionado) {
    iconoFiltro.style.color = 'var(--color-primario)';
  } else {
    iconoFiltro.style.color = '#888';
  }

  cerrarModalFiltros();
  renderizarRecetas();
};

window.limpiarFiltros = () => {
  document.getElementById('filtro-categoria').value = '';
  document.getElementById('filtro-dieta').value = '';
  document.getElementById('filtro-alergeno').value = '';
  window.aplicarFiltros();
};

// --- RENDERIZADO CON FILTROS APLICADOS ---
function renderizarRecetas() {
  loadingDiv.style.display = 'none';
  const listaBase = pestañaActiva === 'propias' ? misRecetas : recetasGuardadas;

  // Filtrar la lista
  const listaFiltrada = listaBase.filter(receta => {
    const coincideTexto = (receta.titulo || '').toLowerCase().includes(textoBusqueda) || (receta.autorApodo || '').toLowerCase().includes(textoBusqueda);
    const coincideCategoria = catSeleccionada ? (receta.categoria === catSeleccionada || receta.categoriaGuardada === catSeleccionada) : true;
    const coincideDieta = dietaSeleccionada ? receta.dieta === dietaSeleccionada : true;
    const coincideAlergeno = alergenoSeleccionado ? (receta.alergenos && receta.alergenos.includes(alergenoSeleccionado)) : true;
    
    return coincideTexto && coincideCategoria && coincideDieta && coincideAlergeno;
  });

  if (listaFiltrada.length === 0) {
    recipeContainer.innerHTML = '<p style="grid-column: span 2; text-align: center; color: #888;">No se encontraron recetas con estos filtros.</p>';
    return;
  }

  let htmlStr = '';
  listaFiltrada.forEach((receta) => {
    // Buscamos el índice original para que el modal abra la receta correcta
    const indexOriginal = listaBase.findIndex(r => r.id === receta.id);
    
    const imagenUrl = receta.imagenBase64 || 'https://via.placeholder.com/300?text=Sin+Foto';
    const etiquetaGuardada = (pestañaActiva === 'guardadas' && receta.categoriaGuardada) 
      ? `<span style="position:absolute; bottom:5px; left:5px; background:rgba(168, 230, 207, 0.9); color:#333; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:10px;">${receta.categoriaGuardada}</span>` : '';

    htmlStr += `
      <div class="recipe-card" onclick="abrirModal(${indexOriginal})">
        <div style="position:relative;">
          <img src="${imagenUrl}" alt="${receta.titulo}" class="recipe-img">
          ${etiquetaGuardada}
        </div>
        <div class="recipe-title-container">
          <h3 class="recipe-title" style="margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${receta.titulo}</h3>
          ${pestañaActiva === 'guardadas' ? `<i class="bi bi-bookmark-fill bookmark-icon"></i>` : ''}
        </div>
      </div>
    `;
  });

  recipeContainer.innerHTML = htmlStr;
}

// --- EVENTOS PESTAÑAS ---
tabPropias.addEventListener('click', () => {
  pestañaActiva = 'propias';
  tabPropias.classList.add('active'); tabGuardadas.classList.remove('active');
  renderizarRecetas();
});
tabGuardadas.addEventListener('click', () => {
  pestañaActiva = 'guardadas';
  tabGuardadas.classList.add('active'); tabPropias.classList.remove('active');
  renderizarRecetas();
});

// --- LÓGICA DEL MODAL DE RECETA ---
window.abrirModal = (index) => {
  const listaActual = pestañaActiva === 'propias' ? misRecetas : recetasGuardadas;
  const receta = listaActual[index];
  
  document.getElementById('modal-img').src = receta.imagenBase64 || 'https://via.placeholder.com/300?text=Sin+Foto';
  document.getElementById('modal-title').textContent = receta.titulo;
  document.getElementById('modal-author').textContent = pestañaActiva === 'guardadas' ? 'Por: @' + receta.autorApodo : '';
  document.getElementById('modal-ingredients').textContent = receta.ingredientes;
  document.getElementById('modal-steps').textContent = receta.preparacion;

  let tagsHtml = '';
  if (receta.dieta && receta.dieta !== 'Ninguna') tagsHtml += `<span style="background:var(--color-primario); color:#fff; font-size:12px; padding:4px 10px; border-radius:15px; font-weight:bold;">${receta.dieta}</span>`;
  if (receta.alergenos && receta.alergenos.length > 0) tagsHtml += `<span style="background:#FF8A8A; color:#fff; font-size:12px; padding:4px 10px; border-radius:15px; font-weight:bold;">⚠️ Contiene: ${receta.alergenos.join(', ')}</span>`;
  document.getElementById('modal-tags').innerHTML = tagsHtml;

  document.getElementById('modal-receta').classList.add('active');
};
window.cerrarModal = () => document.getElementById('modal-receta').classList.remove('active');

// --- LÓGICA DE EDITAR PERFIL (Se mantiene intacta) ---
const modalEditar = document.getElementById('modal-editar-perfil');
const formEditar = document.getElementById('form-editar-perfil');
const inputFotoPerfil = document.getElementById('input-foto-perfil');
const previewFotoPerfil = document.getElementById('preview-foto-perfil');
const btnGuardarPerfil = document.getElementById('btn-guardar-perfil');
let nuevaFotoBase64 = null;

window.abrirModalEditarPerfil = () => {
  if (window.datosUsuarioActual) {
    document.getElementById('edit-nombre').value = window.datosUsuarioActual.nombre || '';
    document.getElementById('edit-apodo').value = window.datosUsuarioActual.apodo || '';
    if (window.datosUsuarioActual.fotoPerfil) {
      previewFotoPerfil.src = window.datosUsuarioActual.fotoPerfil;
      nuevaFotoBase64 = window.datosUsuarioActual.fotoPerfil;
    }
  }
  modalEditar.classList.add('active');
};
window.cerrarModalEditarPerfil = () => modalEditar.classList.remove('active');

inputFotoPerfil.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onloadend = () => { nuevaFotoBase64 = reader.result; previewFotoPerfil.src = nuevaFotoBase64; };
  reader.readAsDataURL(file);
});

formEditar.addEventListener('submit', async (e) => {
  e.preventDefault();
  btnGuardarPerfil.disabled = true; btnGuardarPerfil.textContent = 'Guardando...';
  try {
    await updateDoc(doc(db, 'usuarios', currentUser.uid), {
      nombre: document.getElementById('edit-nombre').value,
      apodo: document.getElementById('edit-apodo').value.toLowerCase(),
      fotoPerfil: nuevaFotoBase64
    });
    alert('Perfil actualizado con éxito');
    window.location.reload();
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    alert('Hubo un error al actualizar el perfil.');
  } finally {
    btnGuardarPerfil.disabled = false; btnGuardarPerfil.textContent = 'Guardar Cambios';
  }
});