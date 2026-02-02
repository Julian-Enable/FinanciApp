// ============================================
// FinanciApp - Main Application Logic
// ============================================

// Firebase SDK imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getAuth,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    enableIndexedDbPersistence
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ============================================
// Firebase Configuration
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyD_dMhaJxNywvp_8hyYDpBk4-j_N-INAhI",
    authDomain: "financiapp-4b3bf.firebaseapp.com",
    projectId: "financiapp-4b3bf",
    storageBucket: "financiapp-4b3bf.firebasestorage.app",
    messagingSenderId: "147250269624",
    appId: "1:147250269624:web:4ce120e7c348436310134d"
};

// Initialize Firebase
let app, auth, db, googleProvider;
let currentUser = null;
let unsubscribers = [];

// App State
const state = {
    debts: [],
    income: [],
    expenses: [],
    fixedExpenses: [],
    currentSection: 'dashboard',
    currentAnalysisDate: new Date()
};

// ============================================
// SVG Icons
// ============================================
const ICONS = {
    // Logo & Brand
    logo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M8 10h8M8 14h8"/></svg>',

    // Dashboard icons
    income: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
    expense: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>',
    balance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    debt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',

    // Categories for debts
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-6.4a2 2 0 0 0-1.85-1.23H8.3a2 2 0 0 0-1.85 1.23L4 11l-3.16.86a1 1 0 0 0-.84.99V16h3"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="17.5" cy="16.5" r="2.5"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
    education: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
    health: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    package: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',

    // Categories for income
    money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    building: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>',
    laptop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="20" x2="22" y2="20"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>',

    // Categories for expenses
    food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
    transport: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-6.4a2 2 0 0 0-1.85-1.23H8.3a2 2 0 0 0-1.85 1.23L4 11l-3.16.86a1 1 0 0 0-.84.99V16h3"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="17.5" cy="16.5" r="2.5"/></svg>',
    entertainment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="11" x2="10" y2="11"/><line x1="8" y1="9" x2="8" y2="13"/><line x1="15" y1="12" x2="15.01" y2="12"/><line x1="18" y1="10" x2="18.01" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/></svg>',
    services: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',

    // Fixed expenses
    fixed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
    lightbulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>',
    tv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>',
    gym: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6.5 6.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM21.5 6.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM2.5 12h2v5.5h-2zM19.5 12h2v5.5h-2zM5.5 10h3v10h-3zM15.5 10h3v10h-3zM8.5 12h7"/></svg>',

    // UI icons
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    pending: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
};

// Map old emoji values to new icon keys (for backward compatibility with existing data)
const EMOJI_TO_ICON = {
    '💳': 'card',
    '🏠': 'home',
    '🚗': 'car',
    '📱': 'phone',
    '🎓': 'education',
    '🏥': 'health',
    '📦': 'package',
    '💵': 'money',
    '💼': 'briefcase',
    '🏢': 'building',
    '💻': 'laptop',
    '📈': 'chart',
    '🎁': 'gift',
    '🍔': 'food',
    '🎮': 'entertainment',
    '💡': 'lightbulb',
    '🎬': 'tv',
    '🏋️': 'gym',
    '🔄': 'fixed',
    '📅': 'calendar'
};

// Helper function to get icon HTML
function getIcon(name, className = '') {
    // Convert emoji to icon key if necessary
    const iconKey = EMOJI_TO_ICON[name] || name;
    return `<span class="icon ${className}">${ICONS[iconKey] || ICONS.package}</span>`;
}

// ============================================
// Initialize App
// ============================================
function initApp() {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        googleProvider = new GoogleAuthProvider();

        // Enable offline persistence
        enableIndexedDbPersistence(db).catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('Persistence failed: Multiple tabs open');
            } else if (err.code === 'unimplemented') {
                console.warn('Persistence not available');
            }
        });

        // Listen for auth state changes
        onAuthStateChanged(auth, handleAuthStateChange);

    } catch (error) {
        console.error('Firebase initialization error:', error);
        showToast('Error al conectar con el servidor', 'error');
    }

    // Setup event listeners
    setupEventListeners();
}

// ============================================
// Authentication
// ============================================
function handleAuthStateChange(user) {
    hideLoading();

    if (user) {
        currentUser = user;
        showScreen('app-screen');
        document.getElementById('user-name').textContent = user.displayName || user.email.split('@')[0];
        subscribeToData();
        updateCurrentMonth();
    } else {
        currentUser = null;
        unsubscribeFromData();
        showScreen('login-screen');
    }
}

async function loginWithGoogle() {
    showLoading();
    try {
        await signInWithPopup(auth, googleProvider);
        showToast('¡Bienvenido!', 'success');
    } catch (error) {
        hideLoading();
        console.error('Google login error:', error);
        showToast('Error al iniciar sesión con Google', 'error');
    }
}

async function loginWithEmail(email, password) {
    showLoading();
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('¡Bienvenido!', 'success');
    } catch (error) {
        hideLoading();
        console.error('Email login error:', error);
        if (error.code === 'auth/invalid-credential') {
            showToast('Email o contraseña incorrectos', 'error');
        } else {
            showToast('Error al iniciar sesión', 'error');
        }
    }
}

async function registerWithEmail(name, email, password) {
    showLoading();
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        showToast('¡Cuenta creada exitosamente!', 'success');
    } catch (error) {
        hideLoading();
        console.error('Register error:', error);
        if (error.code === 'auth/email-already-in-use') {
            showToast('Este email ya está registrado', 'error');
        } else if (error.code === 'auth/weak-password') {
            showToast('La contraseña debe tener al menos 6 caracteres', 'error');
        } else {
            showToast('Error al crear cuenta', 'error');
        }
    }
}

async function logout() {
    try {
        await signOut(auth);
        showToast('Sesión cerrada', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Error al cerrar sesión', 'error');
    }
}

// ============================================
// Data Subscriptions (Real-time sync)
// ============================================
function subscribeToData() {
    if (!currentUser) return;

    // Subscribe to debts (sin orderBy para evitar necesidad de índices)
    const debtsQuery = query(
        collection(db, 'debts'),
        where('userId', '==', currentUser.uid)
    );

    unsubscribers.push(
        onSnapshot(debtsQuery, (snapshot) => {
            state.debts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Ordenar en cliente
            state.debts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            renderDebts();
            updateDashboard();
        }, (error) => {
            console.error('Debts subscription error:', error);
        })
    );

    // Subscribe to income
    const incomeQuery = query(
        collection(db, 'income'),
        where('userId', '==', currentUser.uid)
    );

    unsubscribers.push(
        onSnapshot(incomeQuery, (snapshot) => {
            state.income = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            state.income.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            renderIncome();
            updateDashboard();
        }, (error) => {
            console.error('Income subscription error:', error);
        })
    );

    // Subscribe to expenses
    const expensesQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', currentUser.uid)
    );

    unsubscribers.push(
        onSnapshot(expensesQuery, (snapshot) => {
            state.expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            state.expenses.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            renderExpenses();
            updateDashboard();
        }, (error) => {
            console.error('Expenses subscription error:', error);
        })
    );

    // Subscribe to fixed expenses
    const fixedQuery = query(
        collection(db, 'fixedExpenses'),
        where('userId', '==', currentUser.uid)
    );

    unsubscribers.push(
        onSnapshot(fixedQuery, (snapshot) => {
            state.fixedExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            state.fixedExpenses.sort((a, b) => (a.dueDay || 0) - (b.dueDay || 0));
            renderFixedExpenses();
            updateDashboard();
        }, (error) => {
            console.error('Fixed expenses subscription error:', error);
        })
    );
}

function unsubscribeFromData() {
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];
    state.debts = [];
    state.income = [];
    state.expenses = [];
    state.fixedExpenses = [];
}

// ============================================
// CRUD Operations
// ============================================
// Debts
async function addDebt(data) {
    try {
        await addDoc(collection(db, 'debts'), {
            ...data,
            userId: currentUser.uid,
            paidAmount: 0,
            payments: [],
            createdAt: serverTimestamp()
        });
        showToast('Deuda agregada', 'success');
        closeModal();
    } catch (error) {
        console.error('Add debt error:', error);
        showToast('Error al agregar deuda', 'error');
    }
}

async function updateDebt(id, data) {
    try {
        await updateDoc(doc(db, 'debts', id), data);
        showToast('Deuda actualizada', 'success');
        closeModal();
    } catch (error) {
        console.error('Update debt error:', error);
        showToast('Error al actualizar deuda', 'error');
    }
}

async function deleteDebt(id) {
    if (!confirm('¿Estás seguro de eliminar esta deuda?')) return;
    try {
        await deleteDoc(doc(db, 'debts', id));
        showToast('Deuda eliminada', 'success');
    } catch (error) {
        console.error('Delete debt error:', error);
        showToast('Error al eliminar deuda', 'error');
    }
}

async function markPayment(debtId, monthYear, paid, customAmount = null) {
    try {
        const debt = state.debts.find(d => d.id === debtId);
        if (!debt) return;

        let paymentHistory = debt.paymentHistory || [];

        if (paid) {
            // Si no hay monto, abrimos modal para registrar abono
            if (customAmount === null) {
                openPaymentModal(debtId, monthYear, debt.monthlyPayment);
                return;
            }

            // Agregar nuevo abono al historial (permite múltiples por mes)
            const paymentId = Date.now().toString();
            paymentHistory.push({
                id: paymentId,
                monthYear,
                amount: customAmount,
                date: new Date().toISOString()
            });

            // Registrar automáticamente como gasto
            await addDoc(collection(db, 'expenses'), {
                name: `Abono: ${debt.name}`,
                amount: customAmount,
                category: 'debt',
                date: new Date().toISOString().split('T')[0],
                userId: currentUser.uid,
                debtId: debtId,
                paymentId: paymentId,
                monthYear: monthYear,
                createdAt: serverTimestamp()
            });
        }

        // Calcular total pagado basado en historial
        const paidAmount = paymentHistory.reduce((sum, p) => sum + (p.amount || 0), 0);

        await updateDoc(doc(db, 'debts', debtId), {
            paymentHistory,
            paidAmount
        });

        showToast('Abono registrado', 'success');
        closeModal();
    } catch (error) {
        console.error('Mark payment error:', error);
        showToast('Error al registrar abono', 'error');
    }
}

// Eliminar un abono específico
async function deletePaymentEntry(debtId, paymentId) {
    if (!confirm('¿Eliminar este abono?')) return;
    try {
        const debt = state.debts.find(d => d.id === debtId);
        if (!debt) return;

        let paymentHistory = (debt.paymentHistory || []).filter(p => p.id !== paymentId);
        const paidAmount = paymentHistory.reduce((sum, p) => sum + (p.amount || 0), 0);

        // Eliminar gasto asociado
        const expenseToDelete = state.expenses.find(e => e.paymentId === paymentId);
        if (expenseToDelete) {
            await deleteDoc(doc(db, 'expenses', expenseToDelete.id));
        }

        await updateDoc(doc(db, 'debts', debtId), {
            paymentHistory,
            paidAmount
        });

        showToast('Abono eliminado', 'success');
    } catch (error) {
        console.error('Delete payment error:', error);
        showToast('Error al eliminar abono', 'error');
    }
}

// Función para abrir modal de pago personalizado
function openPaymentModal(debtId, monthYear, suggestedAmount) {
    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('modal-form');

    title.textContent = 'Registrar Pago';
    form.innerHTML = `
        <input type="hidden" id="payment-debt-id" value="${debtId}">
        <input type="hidden" id="payment-month-year" value="${monthYear}">
        <div class="form-group">
            <label for="payment-amount">Monto a pagar *</label>
            <input type="number" id="payment-amount" value="${suggestedAmount}" placeholder="Monto del pago" required min="0">
            <small style="color: var(--text-muted); font-size: 12px;">Puedes pagar más o menos del monto sugerido</small>
        </div>
        <div class="form-group">
            <label for="payment-notes">Notas (opcional)</label>
            <input type="text" id="payment-notes" placeholder="Ej: Pago parcial, abono extra...">
        </div>
        <button type="submit" class="btn btn-success">Registrar Pago</button>
    `;
    form.dataset.type = 'payment';
    overlay.classList.add('active');
}

// Income
async function addIncome(data) {
    try {
        await addDoc(collection(db, 'income'), {
            ...data,
            userId: currentUser.uid,
            createdAt: serverTimestamp()
        });
        showToast('Ingreso agregado', 'success');
        closeModal();
    } catch (error) {
        console.error('Add income error:', error);
        showToast('Error al agregar ingreso', 'error');
    }
}

async function updateIncome(id, data) {
    try {
        await updateDoc(doc(db, 'income', id), data);
        showToast('Ingreso actualizado', 'success');
        closeModal();
    } catch (error) {
        console.error('Update income error:', error);
        showToast('Error al actualizar ingreso', 'error');
    }
}

async function deleteIncome(id) {
    if (!confirm('¿Estás seguro de eliminar este ingreso?')) return;
    try {
        await deleteDoc(doc(db, 'income', id));
        showToast('Ingreso eliminado', 'success');
    } catch (error) {
        console.error('Delete income error:', error);
        showToast('Error al eliminar ingreso', 'error');
    }
}

// Expenses
async function addExpense(data) {
    try {
        await addDoc(collection(db, 'expenses'), {
            ...data,
            userId: currentUser.uid,
            createdAt: serverTimestamp()
        });
        showToast('Gasto agregado', 'success');
        closeModal();
    } catch (error) {
        console.error('Add expense error:', error);
        showToast('Error al agregar gasto', 'error');
    }
}

async function updateExpense(id, data) {
    try {
        await updateDoc(doc(db, 'expenses', id), data);
        showToast('Gasto actualizado', 'success');
        closeModal();
    } catch (error) {
        console.error('Update expense error:', error);
        showToast('Error al actualizar gasto', 'error');
    }
}

async function deleteExpense(id) {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return;
    try {
        await deleteDoc(doc(db, 'expenses', id));
        showToast('Gasto eliminado', 'success');
    } catch (error) {
        console.error('Delete expense error:', error);
        showToast('Error al eliminar gasto', 'error');
    }
}

// Fixed Expenses
async function addFixedExpense(data) {
    try {
        await addDoc(collection(db, 'fixedExpenses'), {
            ...data,
            userId: currentUser.uid,
            payments: [],
            createdAt: serverTimestamp()
        });
        showToast('Gasto fijo agregado', 'success');
        closeModal();
    } catch (error) {
        console.error('Add fixed expense error:', error);
        showToast('Error al agregar gasto fijo', 'error');
    }
}

async function updateFixedExpense(id, data) {
    try {
        await updateDoc(doc(db, 'fixedExpenses', id), data);
        showToast('Gasto fijo actualizado', 'success');
        closeModal();
    } catch (error) {
        console.error('Update fixed expense error:', error);
        showToast('Error al actualizar gasto fijo', 'error');
    }
}

async function deleteFixedExpense(id) {
    if (!confirm('¿Estás seguro de eliminar este gasto fijo?')) return;
    try {
        await deleteDoc(doc(db, 'fixedExpenses', id));
        showToast('Gasto fijo eliminado', 'success');
    } catch (error) {
        console.error('Delete fixed expense error:', error);
        showToast('Error al eliminar gasto fijo', 'error');
    }
}

async function markFixedPayment(fixedId, monthYear, paid, customAmount = null) {
    try {
        const fixed = state.fixedExpenses.find(f => f.id === fixedId);
        if (!fixed) return;

        let paymentHistory = fixed.paymentHistory || [];

        if (paid) {
            // Si no hay monto, abrimos modal
            if (customAmount === null) {
                openFixedPaymentModal(fixedId, monthYear, fixed.amount);
                return;
            }

            // Agregar nuevo abono (permite múltiples por mes)
            const paymentId = Date.now().toString();
            paymentHistory.push({
                id: paymentId,
                monthYear,
                amount: customAmount,
                date: new Date().toISOString()
            });

            // Registrar automáticamente como gasto
            await addDoc(collection(db, 'expenses'), {
                name: `${fixed.name}`,
                amount: customAmount,
                category: 'fixed',
                date: new Date().toISOString().split('T')[0],
                userId: currentUser.uid,
                fixedId: fixedId,
                paymentId: paymentId,
                monthYear: monthYear,
                createdAt: serverTimestamp()
            });
        }

        await updateDoc(doc(db, 'fixedExpenses', fixedId), { paymentHistory });
        showToast('Abono registrado', 'success');
        closeModal();
    } catch (error) {
        console.error('Mark fixed payment error:', error);
        showToast('Error al registrar abono', 'error');
    }
}

// Eliminar un abono específico de gasto fijo
async function deleteFixedPaymentEntry(fixedId, paymentId) {
    if (!confirm('¿Eliminar este abono?')) return;
    try {
        const fixed = state.fixedExpenses.find(f => f.id === fixedId);
        if (!fixed) return;

        let paymentHistory = (fixed.paymentHistory || []).filter(p => p.id !== paymentId);

        // Eliminar gasto asociado
        const expenseToDelete = state.expenses.find(e => e.paymentId === paymentId);
        if (expenseToDelete) {
            await deleteDoc(doc(db, 'expenses', expenseToDelete.id));
        }

        await updateDoc(doc(db, 'fixedExpenses', fixedId), { paymentHistory });
        showToast('Abono eliminado', 'success');
    } catch (error) {
        console.error('Delete fixed payment error:', error);
        showToast('Error al eliminar abono', 'error');
    }
}

function openFixedPaymentModal(fixedId, monthYear, suggestedAmount) {
    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('modal-form');

    title.textContent = 'Registrar Pago de Gasto Fijo';
    form.innerHTML = `
        <input type="hidden" id="fixed-payment-id" value="${fixedId}">
        <input type="hidden" id="fixed-payment-month" value="${monthYear}">
        <div class="form-group">
            <label for="fixed-payment-amount">Monto a pagar *</label>
            <input type="number" id="fixed-payment-amount" value="${suggestedAmount}" placeholder="Monto del pago" required min="0">
        </div>
        <button type="submit" class="btn btn-success">Registrar Pago</button>
    `;
    form.dataset.type = 'fixed-payment';
    overlay.classList.add('active');
}

// ============================================
// Render Functions
// ============================================
function updateDashboard() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthYear = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    // Calculate totals
    // Filter incomes by current month (like expenses)
    const totalIncome = state.income
        .filter(i => {
            if (!i.date) return false; // Skip income without date
            const date = new Date(i.date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        })
        .reduce((sum, item) => sum + (item.amount || 0), 0);

    // Regular expenses this month (exclude debt/fixed which are already counted from paymentHistory)
    const regularExpenses = state.expenses
        .filter(e => {
            // Exclude debt payments and fixed payments (they're counted from paymentHistory)
            if (e.category === 'debt' || e.category === 'fixed' || e.debtId || e.fixedId) {
                return false;
            }
            const date = e.date ? new Date(e.date) : new Date();
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        })
        .reduce((sum, item) => sum + (item.amount || 0), 0);

    // Debt payments made this month (from paymentHistory)
    const debtPaymentsThisMonth = state.debts.reduce((sum, debt) => {
        const monthPayments = (debt.paymentHistory || [])
            .filter(p => p.monthYear === monthYear);
        return sum + monthPayments.reduce((s, p) => s + (p.amount || 0), 0);
    }, 0);

    // Fixed expense payments made this month (from paymentHistory)
    const fixedPaymentsThisMonth = state.fixedExpenses.reduce((sum, fixed) => {
        const monthPayments = (fixed.paymentHistory || [])
            .filter(p => p.monthYear === monthYear);
        return sum + monthPayments.reduce((s, p) => s + (p.amount || 0), 0);
    }, 0);

    // Total ALL expenses (for real balance)
    const totalExpenses = regularExpenses + debtPaymentsThisMonth + fixedPaymentsThisMonth;

    const totalDebts = state.debts.reduce((sum, d) => sum + ((d.totalAmount || 0) - (d.paidAmount || 0)), 0);
    const balance = totalIncome - totalExpenses;

    // Update UI
    document.getElementById('total-income').textContent = formatCurrency(totalIncome);
    document.getElementById('total-expenses').textContent = formatCurrency(totalExpenses);
    document.getElementById('total-balance').textContent = formatCurrency(balance);
    document.getElementById('total-debts').textContent = formatCurrency(totalDebts);

    // Balance color
    const balanceEl = document.getElementById('total-balance');
    balanceEl.style.color = balance >= 0 ? 'var(--accent-secondary)' : 'var(--accent-danger)';

    // Update upcoming payments and analysis
    renderUpcomingPayments();
    renderCalendar();
    renderAnalysis();
}

// ============================================
// Financial Analysis
// ============================================
window.changeAnalysisMonth = (offset) => {
    // Clone current analysis date
    const currentDate = new Date(state.currentAnalysisDate);
    // Set to 1st of month to avoid issues when navigating from 31st to Feb
    currentDate.setDate(1);
    currentDate.setMonth(currentDate.getMonth() + offset);
    state.currentAnalysisDate = currentDate;
    renderAnalysis();
};

function renderAnalysis() {
    try {
        const now = state.currentAnalysisDate;
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Set month label
        const monthLabel = now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        document.getElementById('analysis-month').textContent = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

        // Calculate totals for current month
        const monthExpenses = state.expenses.filter(e => {
            if (!e.date) return false;
            // Fix timezone issue: Parse YYYY-MM-DD strictly
            const [year, month, day] = e.date.split('-').map(Number);
            // Compare directly with current month/year
            return (month - 1) === currentMonth && year === currentYear;
        });

        // Filter incomes by current month (same as expenses and dashboard)
        const monthIncome = state.income
            .filter(i => {
                if (!i.date) return false;
                const [year, month, day] = i.date.split('-').map(Number);
                return (month - 1) === currentMonth && year === currentYear;
            })
            .reduce((sum, i) => sum + (i.amount || 0), 0);

        // Fix: Exclude Debt Payments and Fixed Expense Payments from Variable Expenses 
        // to avoid double counting with "Total Obligations"
        const variableExpenses = monthExpenses.reduce((sum, e) => {
            if (e.category === 'debt' || e.category === 'fixed' || e.debtId || e.fixedId) return sum;
            return sum + Number(e.amount || 0);
        }, 0);

        // Calculate Monthly Obligations (Fixed Expenses + Debt Payments)
        // We assume these are monthly commitments regardless of payment status
        // Fix: Use Number() to prevent string concatenation if values come as strings from DB
        const totalFixedObligations = state.fixedExpenses.reduce((sum, f) => sum + Number(f.amount || 0), 0);
        const totalDebtObligations = state.debts.reduce((sum, d) => sum + Number(d.monthlyPayment || 0), 0);
        const totalObligations = totalFixedObligations + totalDebtObligations;

        // Total Monthly Outflow (Variable + Obligations)
        const totalOutflow = variableExpenses + totalObligations;

        // Financial Metrics based on REAL income received this month
        const freeCashFlow = monthIncome - totalOutflow;
        const spendingPercentage = monthIncome > 0 ? (totalOutflow / monthIncome * 100) : 0;
        const debtRatio = monthIncome > 0 ? (totalObligations / monthIncome * 100) : 0;

        document.getElementById('analysis-income').textContent = formatCurrency(monthIncome);
        document.getElementById('analysis-expenses').textContent = formatCurrency(totalOutflow);

        // Cash Flow styling
        const cashFlowEl = document.getElementById('analysis-cashflow');
        cashFlowEl.textContent = formatCurrency(freeCashFlow);
        cashFlowEl.style.color = freeCashFlow >= 0 ? 'var(--accent-secondary)' : 'var(--accent-danger)';

        // Update Professional Metrics Cards
        document.getElementById('metric-obligations').textContent = formatCurrency(totalObligations);
        document.getElementById('metric-variable').textContent = formatCurrency(variableExpenses);

        // Debt Ratio Logic
        const debtRatioEl = document.getElementById('metric-debt-ratio');
        const debtStatusEl = document.getElementById('metric-debt-status');
        debtRatioEl.textContent = `${Math.round(debtRatio)}%`;

        if (debtRatio <= 30) {
            debtRatioEl.style.color = 'var(--accent-secondary)';
            debtStatusEl.textContent = 'Endeudamiento Saludable';
        } else if (debtRatio <= 45) {
            debtRatioEl.style.color = 'var(--accent-warning)';
            debtStatusEl.textContent = 'Endeudamiento Moderado';
        } else {
            debtRatioEl.style.color = 'var(--accent-danger)';
            debtStatusEl.textContent = 'Alto Endeudamiento';
        }

        document.getElementById('analysis-percentage').textContent = `${Math.round(spendingPercentage)}%`;

        // Update spending bar
        const spendingFill = document.getElementById('spending-fill');
        const cappedPercentage = Math.min(spendingPercentage, 100);
        spendingFill.style.width = `${cappedPercentage}%`;

        // Status text based on Cash Flow
        const statusText = document.getElementById('spending-status');
        if (freeCashFlow > monthIncome * 0.2) { // Saving > 20%
            spendingFill.style.background = 'var(--accent-secondary)';
            statusText.textContent = `Excelente: Tienes ${formatCurrency(freeCashFlow)} disponibles para ahorro/inversión`;
        } else if (freeCashFlow >= 0) {
            spendingFill.style.background = 'var(--accent-warning)';
            statusText.textContent = `Balanceado: Te quedan ${formatCurrency(freeCashFlow)} libres`;
        } else {
            spendingFill.style.background = 'var(--accent-danger)';
            statusText.textContent = `Déficit: Estás gastando ${formatCurrency(Math.abs(freeCashFlow))} más de lo que ganas`;
        }

        // Category analysis with recommended limits
        const categoryConfig = {
            debt: { name: 'Deudas/Créditos', icon: ICONS.card, limit: 35, essential: true },
            fixed: { name: 'Gastos Fijos', icon: ICONS.fixed, limit: 30, essential: true },
            food: { name: 'Comida', icon: ICONS.food, limit: 15, essential: true },
            transport: { name: 'Transporte', icon: ICONS.transport, limit: 10, essential: true },
            entertainment: { name: 'Entretenimiento', icon: ICONS.entertainment, limit: 5, essential: false },
            services: { name: 'Servicios', icon: ICONS.services, limit: 5, essential: false },
            health: { name: 'Salud', icon: ICONS.health, limit: 10, essential: true },
            other: { name: 'Otros', icon: ICONS.package, limit: 10, essential: false }
        };

        // Calculate expenses by category
        const categoryTotals = {};

        // Add real variable expenses
        monthExpenses.forEach(e => {
            // Exclude debt/fixed related expenses as we will add the TOTAL obligations manually
            if (e.category === 'debt' || e.category === 'fixed' || e.debtId || e.fixedId) return;

            const cat = e.category || 'other';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + (e.amount || 0);
        });

        // Add TOTAL OBLIGATIONS to the analysis (Debts + Fixed)
        // This ensures the chart and recommendations reflect the committed money, not just what's been paid
        if (totalDebtObligations > 0) categoryTotals['debt'] = (categoryTotals['debt'] || 0) + totalDebtObligations;
        if (totalFixedObligations > 0) categoryTotals['fixed'] = (categoryTotals['fixed'] || 0) + totalFixedObligations;

        // Initialize empty arrays
        // We will populate them later

        // Generate donut chart
        const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];
        let conicGradient = '';
        let currentAngle = 0;
        let legendHTML = '';
        let colorIndex = 0;

        Object.entries(categoryTotals)
            .forEach(([cat, amount]) => {
                const percentage = totalOutflow > 0 ? (amount / totalOutflow * 100) : 0;
                const angle = percentage * 3.6;
                const color = colors[colorIndex % colors.length];

                conicGradient += `${color} ${currentAngle}deg ${currentAngle + angle}deg, `;
                currentAngle += angle;

                const config = categoryConfig[cat] || { name: cat, icon: ICONS.package };
                legendHTML += `
                <div class="legend-item-analysis">
                    <span class="legend-color" style="background: ${color}"></span>
                    <span class="legend-text">
                        <span class="legend-name">${config.name}</span>
                        <span class="legend-value">${Math.round(percentage)}%</span>
                    </span>
                </div>
            `;
                colorIndex++;
            });

        if (conicGradient) {
            conicGradient = conicGradient.slice(0, -2);
            document.getElementById('donut-chart').style.background = `conic-gradient(${conicGradient})`;
        }
        document.getElementById('chart-total').textContent = formatCurrency(totalOutflow);
        document.getElementById('chart-legend').innerHTML = legendHTML;

        // Generate category cards
        // Generate category cards
        const cardsContainer = document.getElementById('category-cards');
        let cardsHTML = '';

        // Safely initialize analysis arrays
        let warnings = [];
        let dangers = [];
        // We use local variables to ensure fresh state on every render

        Object.entries(categoryConfig).forEach(([cat, config]) => {
            const amount = categoryTotals[cat] || 0;
            const percentageOfIncome = monthIncome > 0 ? (amount / monthIncome * 100) : 0;

            let status, statusClass, recommendation;
            if (percentageOfIncome <= config.limit * 0.7) {
                status = 'good';
                statusClass = 'status-good';
                recommendation = 'Dentro del presupuesto ideal';
            } else if (percentageOfIncome <= config.limit) {
                status = 'warning';
                statusClass = 'status-warning';
                recommendation = `Cerca del límite (${config.limit}%)`;
                if (!config.essential) warnings.push(config.name);
            } else {
                status = 'danger';
                statusClass = 'status-danger';
                recommendation = `Excede el límite recomendado de ${config.limit}%`;
                dangers.push({ name: config.name, excess: percentageOfIncome - config.limit, essential: config.essential });
            }

            if (amount > 0) {
                cardsHTML += `
                <div class="category-card ${statusClass}">
                    <div class="category-header">
                        <span class="category-name">
                            ${config.icon}
                            ${config.name}
                        </span>
                        <span class="category-percentage ${status}">${percentageOfIncome.toFixed(1)}%</span>
                    </div>
                    <div class="category-bar">
                        <div class="category-bar-fill ${status}" style="width: ${Math.min(percentageOfIncome / config.limit * 100, 100)}%"></div>
                    </div>
                    <div class="category-details">
                        <span>${formatCurrency(amount)}</span>
                        <span>Límite: ${config.limit}% del ingreso</span>
                    </div>
                    <div class="category-recommendation ${status}">${recommendation}</div>
                </div>
            `;
            }
        });
        cardsContainer.innerHTML = cardsHTML || '<p class="empty-state">No hay gastos este mes para analizar</p>';

        // Generate health indicator and recommendations
        const healthIndicator = document.getElementById('health-indicator');
        const healthTitle = document.getElementById('health-title');
        const healthDescription = document.getElementById('health-description');
        const recommendationsContainer = document.getElementById('recommendations');

        let healthClass, healthIcon;
        if (spendingPercentage <= 50 && dangers.length === 0) {
            healthClass = 'excellent';
            healthIcon = ICONS.check;
            healthTitle.textContent = 'Excelente Salud Financiera';
            healthDescription.textContent = 'Estás ahorrando más del 50% de tus ingresos. ¡Sigue así!';
        } else if (spendingPercentage <= 70 && dangers.length === 0) {
            healthClass = 'good';
            healthIcon = ICONS.check;
            healthTitle.textContent = 'Buena Salud Financiera';
            healthDescription.textContent = 'Tienes un balance saludable entre ingresos y gastos.';
        } else if (spendingPercentage <= 90 || dangers.length <= 2) {
            healthClass = 'warning';
            healthIcon = ICONS.clock;
            healthTitle.textContent = 'Atención Requerida';
            healthDescription.textContent = 'Algunos gastos están por encima del límite recomendado.';
        } else {
            healthClass = 'danger';
            healthIcon = ICONS.expense;
            healthTitle.textContent = 'Situación Crítica';
            healthDescription.textContent = 'Estás gastando más de lo recomendado. Revisa tus gastos.';
        }

        healthIndicator.className = `health-indicator ${healthClass}`;
        healthIndicator.querySelector('.health-icon').innerHTML = healthIcon;

        // Generate recommendations
        let recsHTML = '';

        dangers.filter(d => !d.essential).forEach(d => {
            recsHTML += `
            <div class="recommendation-item">
                <span class="recommendation-icon danger">${ICONS.expense}</span>
                <span><strong>${d.name}</strong> excede ${d.excess.toFixed(1)}% el límite. Considera reducir estos gastos.</span>
            </div>
        `;
        });

        dangers.filter(d => d.essential).forEach(d => {
            recsHTML += `
            <div class="recommendation-item">
                <span class="recommendation-icon warning">${ICONS.clock}</span>
                <span><strong>${d.name}</strong> está alto. Busca alternativas más económicas.</span>
            </div>
        `;
        });

        if (spendingPercentage > 70 && dangers.length === 0) {
            recsHTML += `
            <div class="recommendation-item">
                <span class="recommendation-icon tip">${ICONS.chart}</span>
                <span>Intenta reducir gastos generales para aumentar tu ahorro mensual.</span>
            </div>
        `;
        }

        if (recsHTML === '') {
            recsHTML = `
            <div class="recommendation-item">
                <span class="recommendation-icon tip">${ICONS.check}</span>
                <span>¡Vas muy bien! Mantén este ritmo de gastos controlados.</span>
            </div>
        `;
        }

        recommendationsContainer.innerHTML = recsHTML || '<p class="empty-state">No hay alertas de salud financiera por ahora.</p>';

    } catch (error) {
        console.error("Error inside renderAnalysis:", error);
        document.getElementById('health-title').textContent = "Error de Cálculo";
        document.getElementById('health-description').textContent = "Revisa la consola para más detalles.";
        if (typeof showToast === 'function') showToast("Error al cargar análisis", "error");
    }
}

function renderUpcomingPayments() {
    const container = document.getElementById('upcoming-payments-list');
    const now = new Date();
    const currentDay = now.getDate();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get unpaid debts due this month
    const upcomingDebts = state.debts
        .filter(d => {
            const monthPayments = (d.paymentHistory || []).filter(p => p.monthYear === monthYear);
            return monthPayments.length === 0 && d.dueDay;
        })
        .map(d => ({ ...d, type: 'debt', payAmount: d.monthlyPayment }));

    // Get unpaid fixed expenses due this month
    const upcomingFixed = state.fixedExpenses
        .filter(f => {
            const monthPayments = (f.paymentHistory || []).filter(p => p.monthYear === monthYear);
            return monthPayments.length === 0 && f.dueDay;
        })
        .map(f => ({ ...f, type: 'fixed', payAmount: f.amount }));

    // Combine and sort by due day
    const allUpcoming = [...upcomingDebts, ...upcomingFixed].sort((a, b) => a.dueDay - b.dueDay);

    if (allUpcoming.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay pagos próximos</p>';
        document.getElementById('upcoming-count').textContent = '0';
        return;
    }

    document.getElementById('upcoming-count').textContent = allUpcoming.length;

    container.innerHTML = allUpcoming.map(item => {
        const isOverdue = item.dueDay < currentDay;
        const isDueSoon = item.dueDay - currentDay <= 3 && item.dueDay >= currentDay;
        const statusClass = isOverdue ? 'overdue' : (isDueSoon ? 'due-soon' : '');
        const typeLabel = item.type === 'fixed' ? 'Gasto Fijo' : 'Deuda';
        const iconKey = item.type === 'fixed' ? (item.icon || 'fixed') : (item.icon || 'card');

        return `
            <div class="payment-item ${statusClass}">
                <div class="payment-info">
                    <span class="payment-icon">${getIcon(iconKey)}</span>
                    <div class="payment-details">
                        <h4>${item.name}</h4>
                        <span>Vence día ${item.dueDay} · ${typeLabel}</span>
                    </div>
                </div>
                <span class="payment-amount">${formatCurrency(item.payAmount)}</span>
                <div class="payment-check" onclick="window.${item.type === 'fixed' ? 'handleFixedPayment' : 'handlePaymentCheck'}('${item.id}', '${monthYear}')" title="Registrar pago">
                </div>
            </div>
        `;
    }).join('');
}

function renderDebts() {
    const container = document.getElementById('debts-list');

    if (state.debts.length === 0) {
        container.innerHTML = '<p class="empty-state">No tienes deudas registradas</p>';
        return;
    }

    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthName = now.toLocaleDateString('es-ES', { month: 'short' });

    container.innerHTML = state.debts.map(debt => {
        const progress = debt.totalAmount > 0 ? ((debt.paidAmount || 0) / debt.totalAmount * 100) : 0;
        const remaining = (debt.totalAmount || 0) - (debt.paidAmount || 0);

        // Obtener abonos de este mes
        const monthPayments = (debt.paymentHistory || []).filter(p => p.monthYear === monthYear);
        const monthTotal = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        return `
            <div class="debt-card">
                <div class="debt-header">
                    <div class="debt-title">
                        ${getIcon(debt.icon || 'card')}
                        <h4>${debt.name}</h4>
                    </div>
                    <div class="debt-actions">
                        <button class="btn-icon" onclick="window.editDebt('${debt.id}')" title="Editar">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="btn-icon delete" onclick="window.deleteDebt('${debt.id}')" title="Eliminar">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="debt-info">
                    <div class="debt-row">
                        <span class="label">Total de la deuda</span>
                        <span class="value">${formatCurrency(debt.totalAmount)}</span>
                    </div>
                    <div class="debt-row">
                        <span class="label">Cuota mensual</span>
                        <span class="value">${formatCurrency(debt.monthlyPayment)}</span>
                    </div>
                    <div class="debt-row">
                        <span class="label">Restante por pagar</span>
                        <span class="value highlight">${formatCurrency(remaining)}</span>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                </div>
                <span class="progress-text">${progress.toFixed(1)}% pagado</span>
                
                <div class="month-payments">
                    <div class="month-payments-header">
                        <span>${getIcon('calendar')} Abonos ${monthName.toUpperCase()}: ${formatCurrency(monthTotal)}</span>
                        <button class="btn btn-sm btn-success" onclick="window.addPayment('${debt.id}', '${monthYear}')">+ Abonar</button>
                    </div>
                    ${monthPayments.length > 0 ? `
                        <div class="payments-list-mini">
                            ${monthPayments.map(p => `
                                <div class="payment-entry">
                                    <span class="payment-entry-date">${new Date(p.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                                    <span class="payment-entry-amount">${formatCurrency(p.amount)}</span>
                                    <button class="btn-icon-mini delete" onclick="window.deletePayment('${debt.id}', '${p.id}')" title="Eliminar">×</button>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="no-payments">Sin abonos este mes</p>'}
                </div>
            </div>
        `;
    }).join('');
}

function renderIncome() {
    const container = document.getElementById('income-list');

    if (state.income.length === 0) {
        container.innerHTML = '<p class="empty-state">No tienes ingresos registrados</p>';
        return;
    }

    container.innerHTML = state.income.map(item => `
        <div class="item-card">
            <div class="item-left">
                <span class="item-icon">${getIcon(item.icon || 'money')}</span>
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <span>${item.frequency || 'Mensual'}</span>
                </div>
            </div>
            <div class="item-right">
                <span class="item-amount income">${formatCurrency(item.amount)}</span>
                <div class="debt-actions">
                    <button class="btn-icon" onclick="window.editIncome('${item.id}')" title="Editar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="btn-icon delete" onclick="window.deleteIncome('${item.id}')" title="Eliminar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderExpenses() {
    const container = document.getElementById('expenses-list');
    const filter = document.getElementById('expense-category-filter').value;

    let filtered = state.expenses;
    if (filter !== 'all') {
        filtered = state.expenses.filter(e => e.category === filter);
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay gastos registrados</p>';
        return;
    }

    const categoryIconsMap = {
        debt: 'card',
        fixed: 'fixed',
        food: 'food',
        transport: 'transport',
        entertainment: 'entertainment',
        services: 'services',
        health: 'health',
        other: 'package'
    };

    container.innerHTML = filtered.map(item => `
        <div class="item-card">
            <div class="item-left">
                <span class="item-icon">${getIcon(categoryIconsMap[item.category] || 'package')}</span>
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <span>${item.date ? formatDate(item.date) : 'Sin fecha'}</span>
                </div>
            </div>
            <div class="item-right">
                <span class="item-amount expense">-${formatCurrency(item.amount)}</span>
                <div class="debt-actions">
                    <button class="btn-icon" onclick="window.editExpense('${item.id}')" title="Editar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="btn-icon delete" onclick="window.deleteExpense('${item.id}')" title="Eliminar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderFixedExpenses() {
    const container = document.getElementById('fixed-list');

    if (state.fixedExpenses.length === 0) {
        container.innerHTML = '<p class="empty-state">No tienes gastos fijos registrados</p>';
        return;
    }

    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthName = now.toLocaleDateString('es-ES', { month: 'short' });

    container.innerHTML = state.fixedExpenses.map(fixed => {
        // Obtener abonos de este mes
        const monthPayments = (fixed.paymentHistory || []).filter(p => p.monthYear === monthYear);
        const monthTotal = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        return `
            <div class="debt-card">
                <div class="debt-header">
                    <div class="debt-title">
                        ${getIcon(fixed.icon || 'fixed')}
                        <h4>${fixed.name}</h4>
                    </div>
                    <div class="debt-actions">
                        <button class="btn-icon" onclick="window.editFixed('${fixed.id}')" title="Editar">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="btn-icon delete" onclick="window.deleteFixed('${fixed.id}')" title="Eliminar">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="debt-info">
                    <div class="debt-row">
                        <span class="label">Monto mensual</span>
                        <span class="value highlight">${formatCurrency(fixed.amount)}</span>
                    </div>
                    <div class="debt-row">
                        <span class="label">Día de vencimiento</span>
                        <span class="value">${fixed.dueDay || '-'}</span>
                    </div>
                </div>
                
                <div class="month-payments">
                    <div class="month-payments-header">
                        <span>${getIcon('calendar')} Abonos ${monthName.toUpperCase()}: ${formatCurrency(monthTotal)}</span>
                        <button class="btn btn-sm btn-success" onclick="window.addFixedPayment('${fixed.id}', '${monthYear}')">+ Abonar</button>
                    </div>
                    ${monthPayments.length > 0 ? `
                        <div class="payments-list-mini">
                            ${monthPayments.map(p => `
                                <div class="payment-entry">
                                    <span class="payment-entry-date">${new Date(p.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                                    <span class="payment-entry-amount">${formatCurrency(p.amount)}</span>
                                    <button class="btn-icon-mini delete" onclick="window.deleteFixedPayment('${fixed.id}', '${p.id}')" title="Eliminar">×</button>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="no-payments">Sin abonos este mes</p>'}
                </div>
            </div>
        `;
    }).join('');
}

function renderCalendar() {
    const container = document.getElementById('calendar-list');
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Get all payments for current and next month
    const months = [
        { month: currentMonth, year: currentYear },
        { month: (currentMonth + 1) % 12, year: currentMonth === 11 ? currentYear + 1 : currentYear }
    ];

    let html = '';

    months.forEach(({ month, year }) => {
        const monthYear = `${year}-${String(month + 1).padStart(2, '0')}`;
        const monthName = new Date(year, month).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

        const payments = state.debts
            .filter(d => d.dueDay)
            .map(d => {
                // Verificar si tiene abonos en este mes usando paymentHistory
                const monthPayments = (d.paymentHistory || []).filter(p => p.monthYear === monthYear);
                const isPaid = monthPayments.length > 0;
                const dueDate = new Date(year, month, d.dueDay);
                const isOverdue = !isPaid && dueDate < now;

                return {
                    ...d,
                    dueDate,
                    isPaid,
                    isOverdue,
                    monthYear
                };
            })
            .sort((a, b) => a.dueDay - b.dueDay);

        if (payments.length === 0) return;

        const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

        html += `
            <div class="calendar-month">
                <h4>${monthName}</h4>
                ${payments.map(p => `
                    <div class="calendar-item ${p.isPaid ? 'paid' : ''} ${p.isOverdue ? 'overdue' : ''}">
                        <div class="calendar-item-left">
                            <div class="calendar-date">
                                <span class="day">${p.dueDay}</span>
                                <span class="weekday">${weekdays[p.dueDate.getDay()]}</span>
                            </div>
                            <div class="calendar-details">
                                <h4>${getIcon(p.icon || 'card')} ${p.name}</h4>
                                <span>${formatCurrency(p.monthlyPayment)}</span>
                            </div>
                        </div>
                        <div class="payment-check ${p.isPaid ? 'checked' : ''}" 
                             onclick="window.handlePaymentCheck('${p.id}', '${p.monthYear}')"
                             title="${p.isPaid ? 'Marcar como no pagado' : 'Marcar como pagado'}">
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    });

    container.innerHTML = html || '<p class="empty-state">No hay pagos programados</p>';
}

// ============================================
// Modal Functions
// ============================================
function openModal(type, data = null) {
    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('modal-form');

    let formHtml = '';

    switch (type) {
        case 'debt':
            title.textContent = data ? 'Editar Deuda' : 'Nueva Deuda';
            formHtml = `
                <input type="hidden" id="edit-id" value="${data?.id || ''}">
                <div class="form-group">
                    <label for="debt-icon">Icono</label>
                    <select id="debt-icon">
                        <option value="card" ${data?.icon === 'card' ? 'selected' : ''}>Tarjeta</option>
                        <option value="home" ${data?.icon === 'home' ? 'selected' : ''}>Vivienda</option>
                        <option value="car" ${data?.icon === 'car' ? 'selected' : ''}>Vehículo</option>
                        <option value="phone" ${data?.icon === 'phone' ? 'selected' : ''}>Tecnología</option>
                        <option value="education" ${data?.icon === 'education' ? 'selected' : ''}>Educación</option>
                        <option value="health" ${data?.icon === 'health' ? 'selected' : ''}>Salud</option>
                        <option value="package" ${data?.icon === 'package' ? 'selected' : ''}>Otro</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="debt-name">Nombre de la deuda *</label>
                    <input type="text" id="debt-name" value="${data?.name || ''}" placeholder="Ej: Tarjeta Visa" required>
                </div>
                <div class="form-group">
                    <label for="debt-total">Monto total de la deuda *</label>
                    <input type="number" id="debt-total" value="${data?.totalAmount || ''}" placeholder="Ej: 5000000" required min="0">
                </div>
                <div class="form-group">
                    <label for="debt-monthly">Pago mensual *</label>
                    <input type="number" id="debt-monthly" value="${data?.monthlyPayment || ''}" placeholder="Ej: 250000" required min="0">
                </div>
                <div class="form-group">
                    <label for="debt-due">Día de vencimiento mensual (1-31) *</label>
                    <input type="number" id="debt-due" value="${data?.dueDay || ''}" placeholder="Ej: 15" required min="1" max="31">
                </div>
                <button type="submit" class="btn btn-primary">${data ? 'Actualizar' : 'Agregar'} Deuda</button>
            `;
            break;

        case 'income':
            title.textContent = data ? 'Editar Ingreso' : 'Nuevo Ingreso';
            formHtml = `
                <input type="hidden" id="edit-id" value="${data?.id || ''}">
                <div class="form-group">
                    <label for="income-icon">Icono</label>
                    <select id="income-icon">
                        <option value="money" ${data?.icon === 'money' ? 'selected' : ''}>Dinero</option>
                        <option value="briefcase" ${data?.icon === 'briefcase' ? 'selected' : ''}>Salario</option>
                        <option value="building" ${data?.icon === 'building' ? 'selected' : ''}>Empresa</option>
                        <option value="laptop" ${data?.icon === 'laptop' ? 'selected' : ''}>Freelance</option>
                        <option value="home" ${data?.icon === 'home' ? 'selected' : ''}>Arriendo</option>
                        <option value="chart" ${data?.icon === 'chart' ? 'selected' : ''}>Inversiones</option>
                        <option value="gift" ${data?.icon === 'gift' ? 'selected' : ''}>Otro</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="income-name">Nombre del ingreso *</label>
                    <input type="text" id="income-name" value="${data?.name || ''}" placeholder="Ej: Salario mensual" required>
                </div>
                <div class="form-group">
                    <label for="income-amount">Monto *</label>
                    <input type="number" id="income-amount" value="${data?.amount || ''}" placeholder="Ej: 3500000" required min="0">
                </div>
                <div class="form-group">
                    <label for="income-date">Fecha de recepción *</label>
                    <input type="date" id="income-date" value="${data?.date || new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="form-group">
                    <label for="income-frequency">Frecuencia</label>
                    <select id="income-frequency">
                        <option value="Mensual" ${data?.frequency === 'Mensual' ? 'selected' : ''}>Mensual</option>
                        <option value="Quincenal" ${data?.frequency === 'Quincenal' ? 'selected' : ''}>Quincenal</option>
                        <option value="Semanal" ${data?.frequency === 'Semanal' ? 'selected' : ''}>Semanal</option>
                        <option value="Único" ${data?.frequency === 'Único' ? 'selected' : ''}>Único</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">${data ? 'Actualizar' : 'Agregar'} Ingreso</button>
            `;
            break;

        case 'expense':
            title.textContent = data ? 'Editar Gasto' : 'Nuevo Gasto';
            const today = new Date().toISOString().split('T')[0];
            formHtml = `
                <input type="hidden" id="edit-id" value="${data?.id || ''}">
                <div class="form-group">
                    <label for="expense-category">Categoría</label>
                    <select id="expense-category">
                        <option value="food" ${data?.category === 'food' ? 'selected' : ''}>Comida</option>
                        <option value="transport" ${data?.category === 'transport' ? 'selected' : ''}>Transporte</option>
                        <option value="entertainment" ${data?.category === 'entertainment' ? 'selected' : ''}>Entretenimiento</option>
                        <option value="services" ${data?.category === 'services' ? 'selected' : ''}>Servicios</option>
                        <option value="health" ${data?.category === 'health' ? 'selected' : ''}>Salud</option>
                        <option value="other" ${data?.category === 'other' ? 'selected' : ''}>Otros</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="expense-name">Descripción *</label>
                    <input type="text" id="expense-name" value="${data?.name || ''}" placeholder="Ej: Almuerzo" required>
                </div>
                <div class="form-group">
                    <label for="expense-amount">Monto *</label>
                    <input type="number" id="expense-amount" value="${data?.amount || ''}" placeholder="Ej: 25000" required min="0">
                </div>
                <div class="form-group">
                    <label for="expense-date">Fecha</label>
                    <input type="date" id="expense-date" value="${data?.date || today}">
                </div>
                <button type="submit" class="btn btn-primary">${data ? 'Actualizar' : 'Agregar'} Gasto</button>
            `;
            break;

        case 'fixed':
            title.textContent = data ? 'Editar Gasto Fijo' : 'Nuevo Gasto Fijo';
            formHtml = `
                <input type="hidden" id="edit-id" value="${data?.id || ''}">
                <div class="form-group">
                    <label for="fixed-icon">Icono</label>
                    <select id="fixed-icon">
                        <option value="home" ${data?.icon === 'home' ? 'selected' : ''}>Arriendo/Vivienda</option>
                        <option value="lightbulb" ${data?.icon === 'lightbulb' ? 'selected' : ''}>Servicios Públicos</option>
                        <option value="phone" ${data?.icon === 'phone' ? 'selected' : ''}>Celular/Internet</option>
                        <option value="tv" ${data?.icon === 'tv' ? 'selected' : ''}>Suscripciones</option>
                        <option value="car" ${data?.icon === 'car' ? 'selected' : ''}>Transporte</option>
                        <option value="gym" ${data?.icon === 'gym' ? 'selected' : ''}>Gimnasio</option>
                        <option value="fixed" ${data?.icon === 'fixed' ? 'selected' : ''}>Otro</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="fixed-name">Nombre del gasto fijo *</label>
                    <input type="text" id="fixed-name" value="${data?.name || ''}" placeholder="Ej: Arriendo, Netflix" required>
                </div>
                <div class="form-group">
                    <label for="fixed-amount">Monto mensual *</label>
                    <input type="number" id="fixed-amount" value="${data?.amount || ''}" placeholder="Ej: 800000" required min="0">
                </div>
                <div class="form-group">
                    <label for="fixed-due">Día de vencimiento (1-31) *</label>
                    <input type="number" id="fixed-due" value="${data?.dueDay || ''}" placeholder="Ej: 10" required min="1" max="31">
                </div>
                <button type="submit" class="btn btn-primary">${data ? 'Actualizar' : 'Agregar'} Gasto Fijo</button>
            `;
            break;
    }

    form.innerHTML = formHtml;
    form.dataset.type = type;
    overlay.classList.add('active');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const type = form.dataset.type;
    const editId = document.getElementById('edit-id')?.value;

    switch (type) {
        case 'debt':
            const debtData = {
                icon: document.getElementById('debt-icon').value,
                name: document.getElementById('debt-name').value,
                totalAmount: parseFloat(document.getElementById('debt-total').value),
                monthlyPayment: parseFloat(document.getElementById('debt-monthly').value),
                dueDay: parseInt(document.getElementById('debt-due').value)
            };
            if (editId) {
                updateDebt(editId, debtData);
            } else {
                addDebt(debtData);
            }
            break;

        case 'income':
            const incomeData = {
                icon: document.getElementById('income-icon').value,
                name: document.getElementById('income-name').value,
                amount: parseFloat(document.getElementById('income-amount').value),
                date: document.getElementById('income-date').value,
                frequency: document.getElementById('income-frequency').value
            };
            if (editId) {
                updateIncome(editId, incomeData);
            } else {
                addIncome(incomeData);
            }
            break;

        case 'expense':
            const expenseData = {
                category: document.getElementById('expense-category').value,
                name: document.getElementById('expense-name').value,
                amount: parseFloat(document.getElementById('expense-amount').value),
                date: document.getElementById('expense-date').value
            };
            if (editId) {
                updateExpense(editId, expenseData);
            } else {
                addExpense(expenseData);
            }
            break;

        case 'payment':
            const paymentDebtId = document.getElementById('payment-debt-id').value;
            const paymentMonthYear = document.getElementById('payment-month-year').value;
            const paymentAmount = parseFloat(document.getElementById('payment-amount').value);
            markPayment(paymentDebtId, paymentMonthYear, true, paymentAmount);
            break;

        case 'fixed':
            const fixedData = {
                icon: document.getElementById('fixed-icon').value,
                name: document.getElementById('fixed-name').value,
                amount: parseFloat(document.getElementById('fixed-amount').value),
                dueDay: parseInt(document.getElementById('fixed-due').value)
            };
            if (editId) {
                updateFixedExpense(editId, fixedData);
            } else {
                addFixedExpense(fixedData);
            }
            break;

        case 'fixed-payment':
            const fixedPaymentId = document.getElementById('fixed-payment-id').value;
            const fixedPaymentMonth = document.getElementById('fixed-payment-month').value;
            const fixedPaymentAmount = parseFloat(document.getElementById('fixed-payment-amount').value);
            markFixedPayment(fixedPaymentId, fixedPaymentMonth, true, fixedPaymentAmount);
            break;
    }
}

// ============================================
// UI Helpers
// ============================================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function showSection(sectionId) {
    state.currentSection = sectionId;
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(`${sectionId}-section`).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-section="${sectionId}"]`).classList.add('active');
}

function showLoading() {
    document.getElementById('loading-overlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.remove('active');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️'}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount || 0);
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function updateCurrentMonth() {
    const now = new Date();
    const monthName = now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    document.getElementById('current-month').textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
    // Login/Register
    document.getElementById('google-login-btn').addEventListener('click', loginWithGoogle);

    document.getElementById('email-login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        loginWithEmail(email, password);
    });

    document.getElementById('register-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        registerWithEmail(name, email, password);
    });

    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('register-screen');
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('login-screen');
    });

    document.getElementById('logout-btn').addEventListener('click', logout);

    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            showSection(btn.dataset.section);
        });
    });

    // Add buttons
    document.getElementById('add-debt-btn').addEventListener('click', () => openModal('debt'));
    document.getElementById('add-income-btn').addEventListener('click', () => openModal('income'));
    document.getElementById('add-expense-btn').addEventListener('click', () => openModal('expense'));
    document.getElementById('add-fixed-btn').addEventListener('click', () => openModal('fixed'));

    // Modal
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') closeModal();
    });
    document.getElementById('modal-form').addEventListener('submit', handleFormSubmit);

    // Expense filter
    document.getElementById('expense-category-filter').addEventListener('change', renderExpenses);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

// ============================================
// Global Functions (for onclick handlers)
// ============================================
window.handlePaymentCheck = (debtId, monthYear) => {
    const debt = state.debts.find(d => d.id === debtId);
    if (debt) openPaymentModal(debtId, monthYear, debt.monthlyPayment);
};

window.editDebt = (id) => {
    const debt = state.debts.find(d => d.id === id);
    if (debt) openModal('debt', debt);
};

window.deleteDebt = deleteDebt;

window.editIncome = (id) => {
    const item = state.income.find(i => i.id === id);
    if (item) openModal('income', item);
};

window.deleteIncome = deleteIncome;

window.editExpense = (id) => {
    const item = state.expenses.find(e => e.id === id);
    if (item) openModal('expense', item);
};

window.deleteExpense = deleteExpense;

// Debt payment globals
window.addPayment = (debtId, monthYear) => {
    const debt = state.debts.find(d => d.id === debtId);
    if (debt) openPaymentModal(debtId, monthYear, debt.monthlyPayment);
};

window.deletePayment = deletePaymentEntry;

window.handlePaymentCheck = (debtId, monthYear) => {
    const debt = state.debts.find(d => d.id === debtId);
    if (debt) openPaymentModal(debtId, monthYear, debt.monthlyPayment);
};

// Fixed Expenses globals
window.addFixedPayment = (fixedId, monthYear) => {
    const fixed = state.fixedExpenses.find(f => f.id === fixedId);
    if (fixed) openFixedPaymentModal(fixedId, monthYear, fixed.amount);
};

window.deleteFixedPayment = deleteFixedPaymentEntry;

window.handleFixedPayment = (fixedId, monthYear) => {
    const fixed = state.fixedExpenses.find(f => f.id === fixedId);
    if (fixed) openFixedPaymentModal(fixedId, monthYear, fixed.amount);
};

window.editFixed = (id) => {
    const item = state.fixedExpenses.find(f => f.id === id);
    if (item) openModal('fixed', item);
};

window.deleteFixed = deleteFixedExpense;

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', initApp);
