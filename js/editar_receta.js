// js/editar_receta.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Leer la ID de la receta desde la URL
const urlParams = new URLSearchParams(window.location.search);
const recetaId = urlParams.get('id');

const form = document.getElementById('form-editar-receta');
const fotoInput = document.getElementById('foto-input');
const fotoPreview = document.getElementById('foto-preview');
const btnSubmit = document.getElementById('btn-submit');

let imagenBase64Actual = null;
let usuarioId = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'index.html';
  } else {
    usuarioId = user.uid;
    if (!recetaId) {
      alert("No se ha especificado ninguna receta para editar.");
      window.location.href = 'perfil.html';
      return;
    }
    await cargarDatosReceta();
  }
});

async function cargarDatosReceta() {
  try {
    const recetaSnap = await getDoc(doc(db, 'recetas', recetaId));
    if (recetaSnap.exists()) {
      const datos = recetaSnap.data();
      
      // Consultamos los datos del usuario actual para ver si es moderador
      const usuarioActualSnap = await getDoc(doc(db, 'usuarios', usuarioId));
      const esModerador = usuarioActualSnap.exists() && usuarioActualSnap.data().rol === 'moderador';
      
      // Seguridad: si no es tuya Y no eres moderador, te echamos
      if (datos.autorId !== usuarioId && !esModerador) {
        alert("No tienes permiso para editar esta receta.");
        window.location.href = 'inicio.html';
        return;
      }

      // Rellenar el formulario
      document.getElementById('titulo').value = datos.titulo || '';
      document.getElementById('categoria').value = datos.categoria || '';
      document.getElementById('dieta').value = datos.dieta || 'Ninguna';
      document.getElementById('ingredientes').value = datos.ingredientes || '';
      document.getElementById('preparacion').value = datos.preparacion || '';
      
      if (datos.alergenos && Array.isArray(datos.alergenos)) {
        document.getElementById('alergenos').value = datos.alergenos.join(', ');
      }

      // Cargar la foto existente
      if (datos.imagenBase64) {
        imagenBase64Actual = datos.imagenBase64;
        fotoPreview.src = imagenBase64Actual;
        fotoPreview.style.display = 'block';
      }

    } else {
      alert("La receta no existe.");
      window.location.href = 'inicio.html';
    }
  } catch (error) {
    console.error("Error al cargar la receta:", error);
    alert("Hubo un error al cargar los datos.");
  }
}

// Si el usuario elige una foto nueva, la convertimos
fotoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onloadend = () => {
    imagenBase64Actual = reader.result;
    fotoPreview.src = imagenBase64Actual;
  };
  reader.readAsDataURL(file);
});

// Guardar los cambios
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Guardando...';

  try {
    const titulo = document.getElementById('titulo').value;
    const categoria = document.getElementById('categoria').value;
    const dieta = document.getElementById('dieta').value;
    const ingredientes = document.getElementById('ingredientes').value;
    const preparacion = document.getElementById('preparacion').value;
    
    const alergenosTexto = document.getElementById('alergenos').value;
    const alergenos = alergenosTexto ? alergenosTexto.split(',').map(a => a.trim()).filter(a => a !== '') : [];

    // Actualizamos el documento en Firestore
    await updateDoc(doc(db, 'recetas', recetaId), {
      titulo: titulo,
      categoria: categoria,
      dieta: dieta,
      alergenos: alergenos,
      ingredientes: ingredientes,
      preparacion: preparacion,
      imagenBase64: imagenBase64Actual
    });

    alert('¡Receta actualizada con éxito!');
    window.location.href = 'perfil.html'; // Volvemos al perfil
  } catch (error) {
    console.error("Error al actualizar:", error);
    alert('Hubo un error al guardar los cambios.');
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Guardar Cambios';
  }
});