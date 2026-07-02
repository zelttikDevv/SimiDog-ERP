// Este script se ejecuta UNA VEZ desde la consola del navegador
// para crear los usuarios iniciales en Firebase

import { auth, db } from "../src/lib/firebase.js";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export async function initializeUsers() {
  const users = [
    {
      email: "admin@simidog.com",
      password: "admin123",
      role: "admin",
      branchId: null
    },
    {
      email: "recepcion1@simidog.com",
      password: "recepcion123",
      role: "recepcionista",
      branchId: "sucursal-11av"
    },
    {
      email: "recepcion2@simidog.com",
      password: "recepcion123",
      role: "recepcionista",
      branchId: "sucursal-65av"
    }
  ];

  for (const user of users) {
    try {
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        user.email,
        user.password
      );

      // Guardar datos adicionales en Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        createdAt: new Date()
      });

      console.log(`Usuario creado: ${user.email}`);
    } catch (error) {
      console.error(`Error creando ${user.email}:`, error.message);
    }
  }
}

// Para ejecutar: abrir consola del navegador y pegar:
// import('./scripts/init-users.js').then(m => m.initializeUsers())
