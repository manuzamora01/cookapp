// js/auth.js
import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const btnShowRegister = document.getElementById('btn-show-register');
const btnShowLogin = document.getElementById('btn-show-login');
const formTitle = document.getElementById('form-title');

// Comprobar si ya está logueado para no pedirle contraseña
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = 'inicio.html';
  }
});

// Cambiar entre Login y Registro
btnShowRegister.addEventListener('click', (e) => {
  e.preventDefault();
  loginForm.classList.add('oculto');
  registerForm.classList.remove('oculto');
  formTitle.textContent = 'Crea tu nueva cuenta';
});

btnShowLogin.addEventListener('click', (e) => {
  e.preventDefault();
  registerForm.classList.add('oculto');
  loginForm.classList.remove('oculto');
  formTitle.textContent = 'Inicia sesión en tu cuenta';
});

// Lógica de Inicio de Sesión
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged nos redirigirá automáticamente
  } catch (error) {
    alert("Error al iniciar sesión: Revisa tus credenciales.");
    console.error(error);
  }
});

// Lógica de Registro
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = document.getElementById('reg-nombre').value;
  const apodo = document.getElementById('reg-apodo').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Guardar datos extra en Firestore, tal y como hace la App Móvil
    await setDoc(doc(db, "usuarios", user.uid), {
      nombre: nombre,
      apodo: apodo.toLowerCase(),
      email: email,
      misCategorias: [],
      misDietas: [],
      misAlergenos: []
    });

    alert("¡Cuenta creada con éxito!");
    // onAuthStateChanged nos redirigirá automáticamente
  } catch (error) {
    alert("Error al registrarse: " + error.message);
    console.error(error);
  }
});