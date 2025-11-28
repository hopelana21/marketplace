// auth.js
// AuthSystem — отвечает за регистрацию, логин, логаут и уведомления.
// Сразу выставляет window.authSystem и эмиттит событие 'authReady' после инициализации.

class AuthSystem {
    constructor() {
        // restore or init storage
        this.users = this._load('marketplaceUsers') || [];
        this.currentUser = this._load('currentUser') || null;

        // выставляем глобально как можно раньше, чтобы другие модули могли на него подписаться
        window.authSystem = this;

        try {
            this.init();
        } catch (err) {
            // логируем, но не роняем приложение
            console.error('AuthSystem init failed:', err);
        }
    }

    init() {
        this._bindOnce = false;
        this.checkAuthStatus();
        this._setupEventListenersSafely();

        // Сигнал для других модулей, что auth готов
        document.dispatchEvent(new Event('authReady'));
    }

    // ------- Helpers for localStorage -------
    _load(key) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.warn('Failed to parse localStorage key', key, e);
            return null;
        }
    }

    _save(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('Failed to save to localStorage', key, e);
        }
    }

    // ------- Event listeners setup -------
    _setupEventListenersSafely() {
        if (this._bindOnce) return;
        this._bindOnce = true;

        // Use optional chaining and null checks — avoid throwing if element missing
        const consumerForm = document.getElementById('consumerForm');
        const providerForm = document.getElementById('providerForm');
        const loginForm = document.getElementById('loginForm');
        const logoutBtn = document.getElementById('logoutBtn');
        const forgotPassword = document.getElementById('forgotPassword');

        if (consumerForm) consumerForm.addEventListener('submit', (e) => this.handleRegistration(e, 'consumer'));
        if (providerForm) providerForm.addEventListener('submit', (e) => this.handleRegistration(e, 'provider'));
        if (loginForm) loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.handleLogout());
        if (forgotPassword) forgotPassword.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleForgotPassword();
        });
    }

    // ------- Registration -------
    handleRegistration(e, userType) {
        if (e && e.preventDefault) e.preventDefault();
        const form = e.target;
        if (!form) return this.showNotification('Форма не найдена', 'error');

        const formData = new FormData(form);
        const nameField = userType === 'consumer' ? 'consumerName' : 'providerName';
        const emailField = userType === 'consumer' ? 'consumerEmail' : 'providerEmail';
        const phoneField = userType === 'consumer' ? 'consumerPhone' : 'providerPhone';
        const passwordField = userType === 'consumer' ? 'consumerPassword' : 'providerPassword';

        const userData = {
            id: this.generateId(),
            type: userType,
            name: (formData.get(nameField) || '').trim(),
            email: (formData.get(emailField) || '').trim().toLowerCase(),
            phone: (formData.get(phoneField) || '').trim(),
            password: (formData.get(passwordField) || '').toString(),
            registrationDate: new Date().toISOString(),
            ...(userType === 'provider' && {
                category: (formData.get('providerCategory') || '').trim(),
                description: (formData.get('providerDescription') || '').trim()
            })
        };

        if (!userData.email) {
            this.showNotification('Введите email', 'error');
            return;
        }
        if (!userData.password) {
            this.showNotification('Введите пароль', 'error');
            return;
        }

        // Check existing
        if (this.users.find(user => user.email === userData.email)) {
            this.showNotification('Пользователь с таким email уже существует', 'error');
            return;
        }

        this.users.push(userData);
        this.saveUsers();

        this.showNotification('Регистрация прошла успешно! Теперь вы можете войти в систему.', 'success');
        this.closeModalSafe('registrationModal');
        try { form.reset(); } catch (e) {}
    }

    // ------- Login -------
    handleLogin(e) {
        if (e && e.preventDefault) e.preventDefault();
        const form = e.target;
        if (!form) return this.showNotification('Форма логина не найдена', 'error');

        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        const email = (emailInput?.value || '').trim().toLowerCase();
        const password = (passwordInput?.value || '').toString();

        const user = this.users.find(u => u.email === email && u.password === password);

        if (user) {
            this.currentUser = user;
            this._save('currentUser', user);
            this.showNotification(`Добро пожаловать, ${user.name || 'пользователь'}!`, 'success');
            this.closeModalSafe('loginModal');
            try { form.reset(); } catch (e) {}
            this.updateUI();

            // Redirect but keep small delay so user увидит уведомление
            setTimeout(() => {
                if (user.type === 'provider') {
                    window.location.href = 'provider-dashboard.html';
                } else {
                    window.location.href = 'consumer-dashboard.html';
                }
            }, 700);
        } else {
            this.showNotification('Неверный email или пароль', 'error');
        }
    }

    // ------- Logout -------
    handleLogout() {
        this.currentUser = null;
        try { localStorage.removeItem('currentUser'); } catch (e) {}
        this.showNotification('Вы вышли из системы', 'info');
        this.updateUI();

        // Redirect to home page after short delay
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 400);
    }

    // ------- Forgot password (simple) -------
    handleForgotPassword() {
        const email = prompt('Введите ваш email для восстановления пароля:');
        if (!email) return;
        const user = this.users.find(u => u.email === email.trim().toLowerCase());
        if (user) {
            this.showNotification('Инструкции по восстановлению пароля отправлены на ваш email (симуляция).', 'info');
        } else {
            this.showNotification('Пользователь с таким email не найден', 'error');
        }
    }

    // ------- UI / State helpers -------
    checkAuthStatus() {
        // Re-load currentUser from storage to be resilient
        this.currentUser = this._load('currentUser') || this.currentUser;
        this.updateUI();
    }

    updateUI() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const userProfile = document.getElementById('userProfile');
        const userName = document.getElementById('userName');

        if (this.currentUser) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (registerBtn) registerBtn.style.display = 'none';
            if (userProfile) userProfile.style.display = 'flex';
            if (userName) userName.textContent = this.currentUser.name || '';
        } else {
            if (loginBtn) loginBtn.style.display = 'block';
            if (registerBtn) registerBtn.style.display = 'block';
            if (userProfile) userProfile.style.display = 'none';
            if (userName) userName.textContent = '';
        }
    }

    generateId() {
        // короткий но достаточно уникальный id
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    saveUsers() {
        this._save('marketplaceUsers', this.users);
    }

    closeModalSafe(modalId) {
        const el = document.getElementById(modalId);
        if (el) {
            // Если модалка была удалена из DOM где-то ещё — проверяем
            try { el.style.display = 'none'; } catch (e) {}
        }
    }

    // ------- Уведомления -------
    showNotification(message, type = 'info') {
        try {
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.innerHTML = `
                <div class="notification-content">
                    <span>${message}</span>
                    <button class="notification-close" aria-label="Close notification">&times;</button>
                </div>
            `;

            // Basic inline styles (можно переопределить в CSS)
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
                color: white;
                padding: 12px 16px;
                border-radius: 6px;
                box-shadow: 0 6px 18px rgba(0,0,0,.12);
                z-index: 10000;
                max-width: 340px;
                font-family: sans-serif;
            `;

            notification.querySelector('.notification-content').style.cssText = `
                display: flex;
                gap: 12px;
                align-items: center;
                justify-content: space-between;
            `;
            const closeBtn = notification.querySelector('.notification-close');
            if (closeBtn) {
                closeBtn.style.cssText = `
                    background: transparent;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                `;
                closeBtn.addEventListener('click', () => {
                    if (notification.parentNode) notification.parentNode.removeChild(notification);
                });
            }

            document.body.appendChild(notification);

            // Auto-remove
            setTimeout(() => {
                if (notification.parentNode) notification.parentNode.removeChild(notification);
            }, 5000);
        } catch (err) {
            console.error('Notification failed', err);
        }
    }
}

// Create instance when DOM ready — but constructor already sets window.authSystem early
document.addEventListener('DOMContentLoaded', () => {
    if (!window.authSystem) {
        // Если по каким-то причинам конструктор не был вызван — создаем
        new AuthSystem();
    } else {
        // пересинхронизируем UI
        try { window.authSystem.checkAuthStatus(); } catch (e) {}
    }
});

// Создаём инстанс прямо сейчас (для случаев, когда script подключен в head)
if (!window.authSystem) {
    new AuthSystem();
}
