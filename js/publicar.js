// js/publicar.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const form = document.getElementById('form-publicar');
const fotoInput = document.getElementById('foto-input');
const fotoPreview = document.getElementById('foto-preview');
const btnSubmit = document.getElementById('btn-submit');

let imagenBase64 = null;
let usuarioId = null;

// Proteger la ruta
onAuthStateChanged(auth, (user) => {
  if (!user) window.location.href = 'index.html';
  else usuarioId = user.uid;
});

// Previsualizar la foto y convertir a Base64
// Previsualizar la foto, REDIMENSIONARLA y convertir a Base64 comprimido
fotoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    // Creamos una imagen en memoria
    const img = new Image();
    img.onload = () => {
      // Configuramos el tamaño máximo (800px de ancho es ideal para móviles)
      const MAX_WIDTH = 800;
      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }

      // Creamos un lienzo (canvas) para dibujar la imagen más pequeña
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Extraemos la imagen comprimida en formato JPEG con calidad al 70% (0.7)
      imagenBase64 = canvas.toDataURL('image/jpeg', 0.7);
      
      // La mostramos en la web
      fotoPreview.src = imagenBase64;
      fotoPreview.style.display = 'block';
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

// Enviar el formulario
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!imagenBase64) {
    alert('Por favor, añade una foto a la receta.');
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Publicando...';

  try {
    const titulo = document.getElementById('titulo').value;
    const categoria = document.getElementById('categoria').value;
    const dieta = document.getElementById('dieta').value;
    const ingredientes = document.getElementById('ingredientes').value;
    const preparacion = document.getElementById('preparacion').value;
    
    // Convertir el texto de alérgenos en un Array (lista)
    const alergenosTexto = document.getElementById('alergenos').value;
    const alergenos = alergenosTexto ? alergenosTexto.split(',').map(a => a.trim()).filter(a => a !== '') : [];

    await addDoc(collection(db, 'recetas'), {
      titulo: titulo,
      categoria: categoria,
      dieta: dieta,
      alergenos: alergenos,
      ingredientes: ingredientes,
      preparacion: preparacion,
      imagenBase64: imagenBase64,
      autorId: usuarioId,
      fecha: serverTimestamp()
    });

    alert('¡Receta publicada con éxito!');
    window.location.href = 'inicio.html'; // Volvemos a inicio para verla

  } catch (error) {
    console.error("Error al publicar:", error);
    alert('Hubo un error al publicar la receta.');
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Publicar Receta';
  }
});