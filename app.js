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
    orderBy,
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
    currentSection: 'dashboard'
};

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

    // Subscribe to debts
    const debtsQuery = query(
        collection(db, 'debts'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
    );

    unsubscribers.push(
        onSnapshot(debtsQuery, (snapshot) => {
            state.debts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderDebts();
            updateDashboard();
        }, (error) => {
            console.error('Debts subscription error:', error);
        })
    );

    // Subscribe to income
    const incomeQuery = query(
        collection(db, 'income'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
    );

    unsubscribers.push(
        onSnapshot(incomeQuery, (snapshot) => {
            state.income = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderIncome();
            updateDashboard();
        }, (error) => {
            console.error('Income subscription error:', error);
        })
    );

    // Subscribe to expenses
    const expensesQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
    );

    unsubscribers.push(
        onSnapshot(expensesQuery, (snapshot) => {
            state.expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderExpenses();
            updateDashboard();
        }, (error) => {
            console.error('Expenses subscription error:', error);
        })
    );
}

function unsubscribeFromData() {
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];
    state.debts = [];
    state.income = [];
    state.expenses = [];
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

async function markPayment(debtId, monthYear, paid) {
    try {
        const debt = state.debts.find(d => d.id === debtId);
        if (!debt) return;

        let payments = debt.payments || [];
        if (paid) {
            if (!payments.includes(monthYear)) {
                payments.push(monthYear);
            }
        } else {
            payments = payments.filter(p => p !== monthYear);
        }

        const paidAmount = payments.length * debt.monthlyPayment;

        await updateDoc(doc(db, 'debts', debtId), {
            payments,
            paidAmount
        });

        showToast(paid ? 'Pago registrado' : 'Pago desmarcado', 'success');
    } catch (error) {
        console.error('Mark payment error:', error);
        showToast('Error al registrar pago', 'error');
    }
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

// ============================================
// Render Functions
// ============================================
function updateDashboard() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate totals
    const totalIncome = state.income.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalExpenses = state.expenses
        .filter(e => {
            const date = e.date ? new Date(e.date) : new Date();
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        })
        .reduce((sum, item) => sum + (item.amount || 0), 0);
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

    // Update upcoming payments
    renderUpcomingPayments();
    renderCalendar();
}

function renderUpcomingPayments() {
    const container = document.getElementById('upcoming-payments-list');
    const now = new Date();
    const currentDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get unpaid debts due this month
    const upcomingDebts = state.debts
        .filter(d => {
            const isPaid = (d.payments || []).includes(monthYear);
            return !isPaid && d.dueDay;
        })
        .sort((a, b) => a.dueDay - b.dueDay);

    if (upcomingDebts.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay pagos próximos</p>';
        document.getElementById('upcoming-count').textContent = '0';
        return;
    }

    document.getElementById('upcoming-count').textContent = upcomingDebts.length;

    container.innerHTML = upcomingDebts.map(debt => {
        const isOverdue = debt.dueDay < currentDay;
        const isDueSoon = debt.dueDay - currentDay <= 3 && debt.dueDay >= currentDay;
        const statusClass = isOverdue ? 'overdue' : (isDueSoon ? 'due-soon' : '');

        return `
            <div class="payment-item ${statusClass}">
                <div class="payment-info">
                    <span class="payment-icon">${debt.icon || '💳'}</span>
                    <div class="payment-details">
                        <h4>${debt.name}</h4>
                        <span>Vence el día ${debt.dueDay}</span>
                    </div>
                </div>
                <span class="payment-amount">${formatCurrency(debt.monthlyPayment)}</span>
                <div class="payment-check" onclick="window.handlePaymentCheck('${debt.id}', '${monthYear}')" title="Marcar como pagado">
                </div>
            </div>
        `;
    }).join('');
}

function renderDebts() {
    const container = document.getElementById('debts-list');

    if (state.debts.length === 0) {
        container.innerHTML = '<p class="empty-state">No tienes deudas registradas. ¡Muy bien! 🎉</p>';
        return;
    }

    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    container.innerHTML = state.debts.map(debt => {
        const progress = debt.totalAmount > 0 ? ((debt.paidAmount || 0) / debt.totalAmount * 100) : 0;
        const remaining = (debt.totalAmount || 0) - (debt.paidAmount || 0);
        const isPaidThisMonth = (debt.payments || []).includes(monthYear);

        return `
            <div class="debt-card">
                <div class="debt-header">
                    <div class="debt-title">
                        <span>${debt.icon || '💳'}</span>
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
                        <span class="label">Pago mensual</span>
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
                <div class="debt-payment">
                    <div class="debt-payment-info">
                        <span class="next-payment">Día de pago: ${debt.dueDay || '-'}</span>
                    </div>
                    <div class="payment-check ${isPaidThisMonth ? 'checked' : ''}" 
                         onclick="window.handlePaymentCheck('${debt.id}', '${monthYear}')"
                         title="${isPaidThisMonth ? 'Marcar como no pagado' : 'Marcar como pagado'}">
                    </div>
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
                <span class="item-icon">${item.icon || '💵'}</span>
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

    const categoryIcons = {
        food: '🍔',
        transport: '🚗',
        entertainment: '🎮',
        services: '📱',
        health: '🏥',
        other: '📦'
    };

    container.innerHTML = filtered.map(item => `
        <div class="item-card">
            <div class="item-left">
                <span class="item-icon">${categoryIcons[item.category] || '📦'}</span>
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
                const isPaid = (d.payments || []).includes(monthYear);
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
                                <h4>${p.icon || '💳'} ${p.name}</h4>
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
                        <option value="💳" ${data?.icon === '💳' ? 'selected' : ''}>💳 Tarjeta</option>
                        <option value="🏠" ${data?.icon === '🏠' ? 'selected' : ''}>🏠 Vivienda</option>
                        <option value="🚗" ${data?.icon === '🚗' ? 'selected' : ''}>🚗 Vehículo</option>
                        <option value="📱" ${data?.icon === '📱' ? 'selected' : ''}>📱 Tecnología</option>
                        <option value="🎓" ${data?.icon === '🎓' ? 'selected' : ''}>🎓 Educación</option>
                        <option value="🏥" ${data?.icon === '🏥' ? 'selected' : ''}>🏥 Salud</option>
                        <option value="📦" ${data?.icon === '📦' ? 'selected' : ''}>📦 Otro</option>
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
                        <option value="💵" ${data?.icon === '💵' ? 'selected' : ''}>💵 Dinero</option>
                        <option value="💼" ${data?.icon === '💼' ? 'selected' : ''}>💼 Salario</option>
                        <option value="🏢" ${data?.icon === '🏢' ? 'selected' : ''}>🏢 Empresa</option>
                        <option value="💻" ${data?.icon === '💻' ? 'selected' : ''}>💻 Freelance</option>
                        <option value="🏠" ${data?.icon === '🏠' ? 'selected' : ''}>🏠 Arriendo</option>
                        <option value="📈" ${data?.icon === '📈' ? 'selected' : ''}>📈 Inversiones</option>
                        <option value="🎁" ${data?.icon === '🎁' ? 'selected' : ''}>🎁 Otro</option>
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
                        <option value="food" ${data?.category === 'food' ? 'selected' : ''}>🍔 Comida</option>
                        <option value="transport" ${data?.category === 'transport' ? 'selected' : ''}>🚗 Transporte</option>
                        <option value="entertainment" ${data?.category === 'entertainment' ? 'selected' : ''}>🎮 Entretenimiento</option>
                        <option value="services" ${data?.category === 'services' ? 'selected' : ''}>📱 Servicios</option>
                        <option value="health" ${data?.category === 'health' ? 'selected' : ''}>🏥 Salud</option>
                        <option value="other" ${data?.category === 'other' ? 'selected' : ''}>📦 Otros</option>
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
    if (!debt) return;
    const isPaid = (debt.payments || []).includes(monthYear);
    markPayment(debtId, monthYear, !isPaid);
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

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', initApp);
