import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // 1. Google Girişi (Sadece Auth, DB yazma yok)
    async function loginWithGoogle() {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Kullanıcı veritabanında var mı kontrol et
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            // Zaten varsa son görülmeyi güncelle ve "MEVCUT" (true) dön
            await setDoc(userDocRef, { last_login: new Date().toISOString() }, { merge: true });
            return { isNewUser: false };
        } else {
            // Yoksa "YENİ" (true) dön
            return { isNewUser: true };
        }
    }

    // 2. Kaydı Tamamlama (Kullanıcı Adı Seçildikten Sonra)
    async function completeRegistration(username) {
        if (!currentUser) throw new Error("Kullanıcı oturumu yok.");
        
        await setDoc(doc(db, "users", currentUser.uid), {
            uid: currentUser.uid,
            username: username, // Seçilen kod adı
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            friend_ids: [],
            pending_requests: [],
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString()
        });
    }

    function logout() {
        return signOut(auth);
    }

    useEffect(() => {
        let intervalId;

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);

            // Eğer kullanıcı giriş yapmışsa Heartbeat başlat
            if (user) {
                // 1. İlk girişte güncelle
                updateLastSeen(user.uid);

                // 2. Her 2 dakikada bir "Ben buradayım" sinyali gönder
                intervalId = setInterval(() => {
                    updateLastSeen(user.uid);
                }, 2 * 60 * 1000); 
            }
        });

        return () => {
            unsubscribe();
            if (intervalId) clearInterval(intervalId); // Temizlik
        };
    }, []);

    // Yardımcı Fonksiyon: Son görülmeyi güncelle
    async function updateLastSeen(uid) {
        try {
            const userRef = doc(db, "users", uid);
            // Sadece varsa güncelle, yoksa hata ver (ve catch bloğuna düş)
            await updateDoc(userRef, { last_seen: serverTimestamp() });
        } catch (e) {
            // Eğer döküman yoksa (yani kullanıcı yeni kayıt oluyorsa)
            // HİÇBİR ŞEY YAPMA. Bırak önce kaydını tamamlasın.
            // console.log("Kullanıcı henüz tam kayıtlı değil, heartbeat atlandı.");
        }
    }

    const value = {
        currentUser,
        loginWithGoogle,
        completeRegistration, // Yeni fonksiyon
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}