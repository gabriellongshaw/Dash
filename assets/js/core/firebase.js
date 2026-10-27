let cached = null;

const firebaseConfig = {
  apiKey: "AIzaSyD3xzWI80MYUkgK6QhVXbgQV4OU312JYDs",
  authDomain: "dash-game-5bdf1.firebaseapp.com",
  projectId: "dash-game-5bdf1",
  storageBucket: "dash-game-5bdf1.firebasestorage.app",
  messagingSenderId: "290554058051",
  appId: "1:290554058051:web:8e8d480a7773ea859d4bf6",
  measurementId: "G-9DNJ91WJFK"
};

export function loadFirebase() {
  if (window.__dashRedirect) return new Promise(() => {});
  if (!cached) {
    cached = (async () => {
      const [appMod, authMod, fsMod] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/10.5.2/firebase-firestore.js')
      ]);
      const app = appMod.initializeApp(firebaseConfig, 'dash');
      return { auth: authMod.getAuth(app), db: fsMod.getFirestore(app), authMod, fsMod };
    })();
    cached.catch(() => {
      cached = null;
    });
  }
  return cached;
}