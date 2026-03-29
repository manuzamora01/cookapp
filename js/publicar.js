// js/publicar.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const form = document.getElementById('form-publicar');
const fotoInput = document.getElementById('foto-input');
const fotoPreview = document.getElementById('foto-preview');
const fotoPlaceholder = document.getElementById('foto-placeholder');
const btnSubmit = document.getElementById('btn-submit');
const btnAddCategoria = document.getElementById('btn-add-categoria');
const inputNuevaCat = document.getElementById('nueva-categoria');

let imagenBase64 = null;
let usuarioId = null;

// --- VARIABLES DE LOS CHIPS ---
let opcionesDieta = ['Ninguna', 'Vegetariana', 'Vegana'];
// LOS 14 ALÉRGENOS OFICIALES DE TU IMAGEN:
let opcionesAlergenos = ['Gluten', 'Crustáceos', 'Moluscos', 'Pescado', 'Huevos', 'Altramuces', 'Mostaza', 'Cacahuetes', 'Frutos secos', 'Soja', 'Sésamo', 'Apio', 'Lácteos', 'Sulfitos'];
let opcionesCategorias = ['Otros', 'Postres'];

// Estados seleccionados
let dietaSeleccionada = 'Ninguna';
let alergenosSeleccionados = [];
let categoriaSeleccionada = '';

// Proteger la ruta y cargar datos
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'index.html';
  } else {
    usuarioId = user.uid;
    await cargarDatosUsuario();
    renderizarDietas();
    renderizarAlergenos();
    renderizarCategorias();
  }
});

// Cargar las categorías del usuario desde Firestore
async function cargarDatosUsuario() {
  try {
    const userSnap = await getDoc(doc(db, 'usuarios', usuarioId));
    if (userSnap.exists()) {
      const data = userSnap.data();
      if (data.misCategorias && data.misCategorias.length > 0) {
        opcionesCategorias = data.misCategorias;
      }
      if (data.misDietas && data.misDietas.length > 0) opcionesDieta = data.misDietas;
      if (data.misAlergenos && data.misAlergenos.length > 0) opcionesAlergenos = data.misAlergenos;
    }
  } catch (error) { console.error("Error al cargar datos:", error); }
}

// --- RENDERIZADO DE CHIPS ---
function renderizarDietas() {
  const cont = document.getElementById('contenedor-dietas');
  cont.innerHTML = '';
  opcionesDieta.forEach(dieta => {
    const div = document.createElement('div');
    div.className = `chip ${dietaSeleccionada === dieta ? 'active' : ''}`;
    div.textContent = dieta;
    div.onclick = () => { dietaSeleccionada = dieta; renderizarDietas(); };
    cont.appendChild(div);
  });
}

function renderizarAlergenos() {
  const cont = document.getElementById('contenedor-alergenos');
  cont.innerHTML = '';
  opcionesAlergenos.forEach(alergeno => {
    const activo = alergenosSeleccionados.includes(alergeno);
    const div = document.createElement('div');
    div.className = `chip chip-peligro ${activo ? 'active' : ''}`;
    div.textContent = alergeno;
    div.onclick = () => {
      if (activo) {
        alergenosSeleccionados = alergenosSeleccionados.filter(a => a !== alergeno);
      } else {
        alergenosSeleccionados.push(alergeno);
      }
      renderizarAlergenos();
    };
    cont.appendChild(div);
  });
}

function renderizarCategorias() {
  const cont = document.getElementById('contenedor-categorias');
  cont.innerHTML = '';
  opcionesCategorias.forEach(cat => {
    const div = document.createElement('div');
    div.className = `chip ${categoriaSeleccionada === cat ? 'active' : ''}`;
    div.textContent = cat;
    div.onclick = () => { categoriaSeleccionada = cat; renderizarCategorias(); };
    cont.appendChild(div);
  });
}

// --- AÑADIR NUEVA CATEGORÍA ---
btnAddCategoria.addEventListener('click', async () => {
  const nuevaCat = inputNuevaCat.value.trim();
  if (nuevaCat && !opcionesCategorias.includes(nuevaCat)) {
    opcionesCategorias.push(nuevaCat);
    categoriaSeleccionada = nuevaCat;
    inputNuevaCat.value = '';
    renderizarCategorias();
    // Guardar en Firestore para que la recuerde siempre
    try {
      await updateDoc(doc(db, 'usuarios', usuarioId), { misCategorias: arrayUnion(nuevaCat) });
    } catch (e) { console.error("No se pudo guardar la categoría en perfil", e); }
  }
});

// --- COMPRESIÓN DE IMAGEN ---
fotoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const MAX_WIDTH = 800;
      let width = img.width;
      let height = img.height;
      if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }

      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      imagenBase64 = canvas.toDataURL('image/jpeg', 0.7);
      
      fotoPlaceholder.style.display = 'none';
      fotoPreview.src = imagenBase64;
      fotoPreview.style.display = 'block';
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

// --- ENVIAR FORMULARIO ---
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!imagenBase64) { alert('Por favor, añade una foto a la receta.'); return; }
  if (!categoriaSeleccionada) { alert('Por favor, selecciona una categoría.'); return; }

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Publicando...';

  try {
    const titulo = document.getElementById('titulo').value;
    const ingredientes = document.getElementById('ingredientes').value;
    const preparacion = document.getElementById('preparacion').value;

    await addDoc(collection(db, 'recetas'), {
      titulo: titulo,
      categoria: categoriaSeleccionada,
      dieta: dietaSeleccionada,
      alergenos: alergenosSeleccionados, // Enviamos el array de chips pulsados
      ingredientes: ingredientes,
      preparacion: preparacion,
      imagenBase64: imagenBase64,
      autorId: usuarioId,
      fecha: serverTimestamp()
    });

    alert('¡Receta publicada con éxito!');
    window.location.href = 'inicio.html';

  } catch (error) {
    console.error("Error al publicar:", error);
    alert('Error real de Firebase: ' + error.message);
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Publicar';
  }
});