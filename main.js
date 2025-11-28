// main.js
// MarketplaceApp — отвечает за модалки, карточки категорий, поиск.
// Работает корректно, даже если AuthSystem инициализируется позже:
// подписывается на событие 'authReady'.

class MarketplaceApp {
    constructor() {
        // Если auth готов — инициализируемся, иначе ждём события
        if (window.authSystem) {
            this.init();
        } else {
            document.addEventListener('authReady', () => this.init(), { once: true });
            // Также инициализируем на DOMContentLoaded на всякий случай
            document.addEventListener('DOMContentLoaded', () => {
                if (window.authSystem) this.init();
            }, { once: true });
        }
    }

    init() {
        try {
            this.setupModals();
            this.setupCategoryCards();
            this.setupSearch();
        } catch (err) {
            console.error('MarketplaceApp init error', err);
        }
    }

    // ------- Modals: registration & login tabs -------
    setupModals() {
        const registerBtn = document.getElementById('registerBtn');
        const loginBtn = document.getElementById('loginBtn');
        const registrationModal = document.getElementById('registrationModal');
        const loginModal = document.getElementById('loginModal');
        const closeButtons = document.querySelectorAll('.close-modal');
        const tabs = document.querySelectorAll('.tab');

        if (registerBtn && registrationModal) {
            registerBtn.addEventListener('click', () => {
                registrationModal.style.display = 'flex';
            });
        }

        if (loginBtn && loginModal) {
            loginBtn.addEventListener('click', () => {
                loginModal.style.display = 'flex';
            });
        }

        // Close buttons: hide parent modal instead of assuming IDs
        closeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });

        // Close modals on outside click
        window.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList && target.classList.contains('modal')) {
                target.style.display = 'none';
            }
        });

        // Tabs switching (data-tab attribute expected)
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                if (!tabId) return;

                tabs.forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));

                tab.classList.add('active');
                const content = document.getElementById(`${tabId}-tab`);
                if (content) content.classList.add('active');
            });
        });
    }

    // ------- Category card navigation -------
    setupCategoryCards() {
        const categoryCards = document.querySelectorAll('.category-card');
        if (!categoryCards || categoryCards.length === 0) return;

        categoryCards.forEach(card => {
            card.addEventListener('click', () => {
                const category = card.getAttribute('data-category');
                if (category) this.navigateToCategory(category);
            });
        });
    }

    navigateToCategory(category) {
        const categoryPages = {
            'jobs': 'jobs.html',
            'services': 'services.html',
            'products': 'products.html',
            'realestate': 'realestate.html'
        };

        const page = categoryPages[category];
        if (page) {
            window.location.href = page;
        } else {
            window.authSystem?.showNotification('Неизвестная категория', 'error');
        }
    }

    // ------- Search modal (динамическая вставка) -------
    setupSearch() {
        const startSearchBtn = document.getElementById('startSearch');
        if (startSearchBtn) {
            startSearchBtn.addEventListener('click', () => this.showSearchModal());
        }
    }

    showSearchModal() {
        // Создаём уникальную модалку (чтобы можно было открывать несколько раз)
        const searchModal = document.createElement('div');
        searchModal.className = 'modal';
        searchModal.style.display = 'flex';
        searchModal.style.alignItems = 'center';
        searchModal.style.justifyContent = 'center';
        searchModal.innerHTML = `
            <div class="modal-content" role="dialog" aria-modal="true" aria-label="Поиск">
                <div class="modal-header">
                    <h2>Поиск по платформе</h2>
                    <button class="close-modal" aria-label="Закрыть">&times;</button>
                </div>
                <div class="form-group">
                    <input type="text" id="searchInput" class="form-control" placeholder="Что вы ищете?">
                </div>
                <div class="form-group">
                    <select id="searchCategory" class="form-control">
                        <option value="">Все категории</option>
                        <option value="jobs">Работа</option>
                        <option value="services">Услуги</option>
                        <option value="products">Товары</option>
                        <option value="realestate">Недвижимость</option>
                    </select>
                </div>
                <button class="btn btn-primary" style="width: 100%;" id="performSearch">Искать</button>
            </div>
        `;

        // Append and wire events
        document.body.appendChild(searchModal);

        const closeBtn = searchModal.querySelector('.close-modal');
        if (closeBtn) closeBtn.addEventListener('click', () => searchModal.remove());

        searchModal.addEventListener('click', (e) => {
            if (e.target === searchModal) searchModal.remove();
        });

        const performBtn = searchModal.querySelector('#performSearch');
        performBtn?.addEventListener('click', () => {
            const query = (searchModal.querySelector('#searchInput')?.value || '').trim();
            const category = (searchModal.querySelector('#searchCategory')?.value || '').trim();
            this.performSearch(query, category);
            searchModal.remove();
        });
    }

    performSearch(query, category) {
        if (!query) {
            window.authSystem?.showNotification('Введите поисковый запрос', 'error');
            return;
        }

        const searchParams = new URLSearchParams({
            q: query,
            category: category
        });

        // Перенаправляем на страницу поиска
        window.location.href = `search.html?${searchParams.toString()}`;
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // MarketplaceApp сам дождётся authReady, если auth ещё не инициализирован
    window.marketplaceApp = new MarketplaceApp();
});
