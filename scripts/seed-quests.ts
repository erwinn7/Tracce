import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDocs, collection } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyBxvA77qCowtLJrwwtDQrlX24-83XZXkPE",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "tracce-corse.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "tracce-corse",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "tracce-corse.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "695640493161",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:695640493161:web:5490c26032a94a23e3a6f8",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedQuests() {
  console.log('🌲 Démarrage du peuplement des quêtes dans Firestore...');
  const questsPath = path.resolve('public/data/quests.json');
  const catalog = JSON.parse(fs.readFileSync(questsPath, 'utf-8'));

  console.log(`📋 ${catalog.quests.length} quêtes trouvées dans quests.json`);

  for (const quest of catalog.quests) {
    // Écriture dans la collection 'quests'
    const questRef = doc(db, 'quests', quest.id);
    await setDoc(questRef, quest, { merge: true });

    // Également dans 'custom_quests' au cas où
    const customRef = doc(db, 'custom_quests', quest.id);
    await setDoc(customRef, quest, { merge: true });

    console.log(`  ✅ Quête synchronisée : ${quest.name} (${quest.id})`);
  }

  // Vérification
  const snap = await getDocs(collection(db, 'quests'));
  console.log(`✨ Terminé ! Collection Firestore 'quests' contient désormais ${snap.size} documents.`);
  process.exit(0);
}

seedQuests().catch((err) => {
  console.error('❌ Erreur lors du peuplement Firestore :', err);
  process.exit(1);
});
