// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ¡ATENCIÓN! REEMPLAZA ESTO CON LOS DATOS DE TU FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCGoTbeqSGO6eFOQCd1Je1TplNheqluuwg",
  authDomain: "cookapp-6a98d.firebaseapp.com",
  projectId: "cookapp-6a98d",
  storageBucket: "cookapp-6a98d.firebasestorage.app",
  messagingSenderId: "912172117999",
  appId: "1:912172117999:web:f76f0ed59878f9c750901a"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);