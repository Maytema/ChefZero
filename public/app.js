class FridgeChefsApp {
    constructor() {
        this.selectedProducts = [];
        this.currentRecipes = [];
        this.currentShareRecipe = null;
        this.allProducts = [];
        this.fuse = null;
        this.aiUsageCount = parseInt(localStorage.getItem('aiUsageCount') || '0');
        this.maxFreeAIUses = 3;
        this.phoneInput = null;
        this.isCategoriesCollapsed = false;
        
        this.init();
    }

    async init() {
        await this.loadProducts();
        this.initFuse();
        this.setupEventListeners();
        this.renderSelectedChips();
        this.updateSelectedCount();
        this.updateAIUsageCounter();
        this.setupPhoneInput();
        this.setupBurgerMenu();
    }

    async loadProducts() {
        try {
            const response = await fetch('/api/products');
            const data = await response.json();
            
            if (data.success) {
                this.categories = data.categories;
                this.allProducts = [];
                
                Object.entries(data.categories).forEach(([categoryName, products]) => {
                    products.forEach(product => {
                        this.allProducts.push({
                            ...product,
                            category: categoryName
                        });
                    });
                });
                
                this.renderCategories();
            }
        } catch (error) {
            console.error('Error loading products:', error);
            this.showError('Ошибка загрузки продуктов');
        }
    }

    initFuse() {
        if (this.allProducts.length > 0) {
            this.fuse = new Fuse(this.allProducts, {
                keys: ['name'],
                threshold: 0.3,
                includeScore: true,
                distance: 100
            });
        }
    }

    renderCategories() {
        const container = document.getElementById('categories-container');
        container.innerHTML = '';

        Object.entries(this.categories).forEach(([categoryName, products]) => {
            const categoryElement = this.createCategoryElement(categoryName, products);
            container.appendChild(categoryElement);
        });

        this.setupCategoryToggles();
    }

    createCategoryElement(name, products) {
        const div = document.createElement('div');
        div.className = 'category';
        div.innerHTML = `
            <div class="category-header" data-category="${name}">
                <div class="category-name">
                    <span class="category-emoji">${this.getCategoryEmoji(name)}</span>
                    ${name}
                </div>
                <div class="category-count">${products.length}</div>
                <span class="category-toggle">›</span>
            </div>
            <div class="category-products">
                ${products.map(product => `
                    <div class="product-item ${this.isProductSelected(product.id) ? 'selected' : ''}" 
                         data-id="${product.id}">
                        <span class="product-emoji">${product.icon}</span>
                        <span class="product-name">${product.name}</span>
                    </div>
                `).join('')}
            </div>
        `;
        return div;
    }

    getCategoryEmoji(category) {
        const emojiMap = {
            'Базовые': '🧂',
            'Овощи': '🥦',
            'Молочные': '🥛',
            'Мясо и птица': '🍗',
            'Рыба и морепродукты': '🐟',
            'Крупы и макароны': '🍚',
            'Фрукты и ягоды': '🍎',
            'Соусы и специи': '🌶️',
            'Хлеб и выпечка': '🍞'
        };
        return emojiMap[category] || '📦';
    }

    setupCategoryToggles() {
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.closest('.product-item')) return;
                
                const category = header.closest('.category');
                category.classList.toggle('active');
                
                const toggle = header.querySelector('.category-toggle');
                toggle.textContent = category.classList.contains('active') ? '▼' : '›';
            });
        });

        document.querySelectorAll('.product-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleProduct(parseInt(item.dataset.id));
            });
        });
    }

    setupEventListeners() {
        // Поиск
        const searchInput = document.getElementById('search');
        searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        searchInput.addEventListener('focus', () => {
            if (searchInput.value.length > 0) {
                document.getElementById('search-results').classList.add('active');
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                document.getElementById('search-results').classList.remove('active');
            }
        });

        // Очистка выбранных
        document.getElementById('clear-selected').addEventListener('click', () => {
            this.clearSelectedProducts();
        });

        // Найти рецепты
        document.getElementById('find-recipes').addEventListener('click', () => {
            this.findRecipes();
        });

        // ИИ рецепт
        document.getElementById('ai-recipe-btn').addEventListener('click', () => {
            this.generateAIRecipe();
        });

        // Премиум
        document.getElementById('show-premium').addEventListener('click', () => {
            this.showModal('premium-modal');
        });

        document.getElementById('close-modal').addEventListener('click', () => {
            this.hideModal('premium-modal');
        });

        document.getElementById('buy-premium').addEventListener('click', () => {
            this.showPaymentModal();
        });

        // Отправка рецепта
        document.getElementById('cancel-share').addEventListener('click', () => {
            this.hideModal('share-modal');
        });

        document.getElementById('send-recipe').addEventListener('click', () => {
            this.sendRecipe();
        });

        // Оплата
        document.getElementById('proceed-payment').addEventListener('click', () => {
            this.processPayment();
        });

        document.getElementById('cancel-payment').addEventListener('click', () => {
            this.hideModal('donate-modal');
        });

        // Переключение категорий
        document.getElementById('toggle-categories').addEventListener('click', () => {
            this.toggleAllCategories();
        });

        // Модалки
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });

        // Опции в модалках
        document.querySelectorAll('.modal-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const modal = option.closest('.modal-content');
                modal.querySelectorAll('.modal-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');
            });
        });
    }

    setupPhoneInput() {
        const phoneElement = document.getElementById('whatsapp-phone');
        if (phoneElement) {
            this.phoneInput = window.intlTelInput(phoneElement, {
                initialCountry: "tj",
                separateDialCode: true,
                utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
            });
        }
    }

    setupBurgerMenu() {
        const burgerMenu = document.getElementById('burger-menu');
        const sidebar = document.getElementById('sidebar');
        const sidebarClose = document.getElementById('sidebar-close');

        burgerMenu.addEventListener('click', () => {
            sidebar.classList.add('active');
        });

        sidebarClose.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.sidebar') && !e.target.closest('.burger-menu')) {
                sidebar.classList.remove('active');
            }
        });
    }

    handleSearch(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const resultsContainer = document.getElementById('search-results');
        
        if (term === '') {
            resultsContainer.classList.remove('active');
            resultsContainer.innerHTML = '';
            return;
        }

        if (!this.fuse) return;

        const results = this.fuse.search(term).slice(0, 10); // Ограничиваем 10 результатами
        
        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="search-empty">
                    <div style="font-size: 24px; margin-bottom: 10px;">🔍</div>
                    <p>Ничего не найдено</p>
                    <p style="font-size: 12px; margin-top: 5px;">Попробуйте другие слова</p>
                </div>
            `;
        } else {
            resultsContainer.innerHTML = results.map(result => {
                const product = result.item;
                return `
                    <div class="search-item ${this.isProductSelected(product.id) ? 'selected' : ''}" 
                         data-id="${product.id}">
                        <span class="search-item-emoji">${product.icon}</span>
                        <span class="search-item-name">${product.name}</span>
                        <span class="search-item-category">${product.category}</span>
                    </div>
                `;
            }).join('');
            
            // Добавляем обработчики кликов
            resultsContainer.querySelectorAll('.search-item').forEach(item => {
                item.addEventListener('click', () => {
                    this.toggleProduct(parseInt(item.dataset.id));
                });
            });
        }
        
        resultsContainer.classList.add('active');
    }

    toggleProduct(productId) {
        const product = this.allProducts.find(p => p.id === productId);
        if (!product) return;

        const existingIndex = this.selectedProducts.findIndex(p => p.id === productId);
        
        if (existingIndex >= 0) {
            // Удаляем продукт
            this.selectedProducts.splice(existingIndex, 1);
        } else {
            // Добавляем продукт
            this.selectedProducts.push({
                id: productId,
                name: product.name,
                icon: product.icon,
                category: product.category
            });
        }

        // Обновляем UI
        this.updateProductSelectionUI(productId);
        this.renderSelectedChips();
        this.updateSelectedCount();
    }

    updateProductSelectionUI(productId) {
        // Обновляем в результатах поиска
        const searchItem = document.querySelector(`.search-item[data-id="${productId}"]`);
        if (searchItem) {
            searchItem.classList.toggle('selected', this.isProductSelected(productId));
        }

        // Обновляем в категориях
        const categoryItem = document.querySelector(`.product-item[data-id="${productId}"]`);
        if (categoryItem) {
            categoryItem.classList.toggle('selected', this.isProductSelected(productId));
        }
    }

    isProductSelected(productId) {
        return this.selectedProducts.some(p => p.id === productId);
    }

    renderSelectedChips() {
        const container = document.getElementById('chips-container');
        
        if (this.selectedProducts.length === 0) {
            container.innerHTML = `
                <div class="empty-chips">
                    <p style="color: #95a5a6; font-style: italic; padding: 10px;">
                        Выберите продукты из списка или воспользуйтесь поиском
                    </p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.selectedProducts.map(product => `
            <div class="chip" data-id="${product.id}">
                <span class="chip-emoji">${product.icon}</span>
                <span class="chip-name">${product.name}</span>
                <button class="chip-remove" title="Удалить">×</button>
            </div>
        `).join('');

        // Добавляем обработчики удаления
        container.querySelectorAll('.chip-remove').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const chip = button.closest('.chip');
                const productId = parseInt(chip.dataset.id);
                this.toggleProduct(productId);
            });
        });
    }

    clearSelectedProducts() {
        if (this.selectedProducts.length === 0) return;
        
        if (confirm(`Удалить все выбранные продукты (${this.selectedProducts.length})?`)) {
            // Снимаем выделение со всех продуктов
            this.selectedProducts.forEach(product => {
                this.updateProductSelectionUI(product.id);
            });
            
            this.selectedProducts = [];
            this.renderSelectedChips();
            this.updateSelectedCount();
        }
    }

    updateSelectedCount() {
        document.getElementById('selected-count').textContent = this.selectedProducts.length;
    }

    updateAIUsageCounter() {
        const counter = document.getElementById('ai-usage-counter');
        if (counter) {
            const remaining = this.maxFreeAIUses - this.aiUsageCount;
            counter.textContent = `ИИ-рецепты: ${remaining}/${this.maxFreeAIUses} бесплатно`;
            counter.style.background = remaining > 0 
                ? 'linear-gradient(135deg, #74b9ff, #0984e3)'
                : 'linear-gradient(135deg, #e74c3c, #c0392b)';
        }
    }

    async findRecipes() {
        if (this.selectedProducts.length === 0) {
            this.showError('Выберите хотя бы один продукт');
            return;
        }

        const button = document.getElementById('find-recipes');
        const originalText = button.innerHTML;
        button.innerHTML = '🔍 Ищем...';
        button.disabled = true;

        try {
            const ingredients = this.selectedProducts.map(p => p.name);
            const response = await fetch('/api/find-recipes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ingredients })
            });

            const data = await response.json();
            
            if (data.success) {
                this.currentRecipes = data.recipes;
                this.showRecipes(data.recipes);
                document.getElementById('results-count').textContent = data.count;
                document.getElementById('results-section').style.display = 'block';
                
                // Прокручиваем к результатам
                document.getElementById('results-section').scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            } else {
                this.showError('Не удалось найти рецепты');
            }
        } catch (error) {
            console.error('Error finding recipes:', error);
            this.showError('Ошибка соединения');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    async generateAIRecipe() {
        if (this.selectedProducts.length === 0) {
            this.showError('Выберите продукты для генерации рецепта');
            return;
        }
        
        // Проверка лимита
        if (this.aiUsageCount >= this.maxFreeAIUses) {
            this.showModal('premium-modal');
            return;
        }

        const button = document.getElementById('ai-recipe-btn');
        const originalText = button.innerHTML;
        button.innerHTML = '🧠 Генерируем...';
        button.disabled = true;

        try {
            const ingredients = this.selectedProducts.map(p => p.name);
            const response = await fetch('/api/generate-ai-recipes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ingredients,
                    maxRecipes: 2 
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.aiUsageCount++;
                localStorage.setItem('aiUsageCount', this.aiUsageCount);
                this.updateAIUsageCounter();
                
                // Добавляем ИИ-рецепты
                this.currentRecipes = [...data.recipes, ...this.currentRecipes];
                this.showRecipes(this.currentRecipes);
                document.getElementById('results-section').style.display = 'block';
                
                // Прокручиваем к результатам
                document.getElementById('results-section').scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
                
                this.showSuccess('ИИ-рецепт успешно создан!');
            } else {
                this.showError('Ошибка генерации рецепта');
            }
        } catch (error) {
            console.error('AI generation error:', error);
            this.showError('Ошибка генерации ИИ-рецепта');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    showRecipes(recipes) {
        const container = document.getElementById('results-container');
        
        if (recipes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">😔</div>
                    <p>Не найдено рецептов для выбранных продуктов</p>
                    <p>Попробуйте выбрать другие ингредиенты</p>
                </div>
            `;
            return;
        }

        container.innerHTML = recipes.map(recipe => `
            <div class="recipe-card ${recipe.aiGenerated ? 'ai-recipe' : ''}" data-id="${recipe.id}">
                ${recipe.aiGenerated ? '<div class="ai-badge">🧠 ИИ-рецепт</div>' : ''}
                <div class="recipe-title">${recipe.name}</div>
                <div class="recipe-meta">
                    <span>⏱️ ${recipe.time}</span>
                    <span>🎚️ ${recipe.difficulty}</span>
                    ${recipe.aiGenerated ? '<span>🤖 Сгенерировано ИИ</span>' : ''}
                </div>
                
                <div class="recipe-ingredients">
                    ${recipe.ingredients.map(ing => `
                        <span class="ingredient-tag">${ing}</span>
                    `).join('')}
                </div>
                
                <div class="recipe-steps">
                    <h4>Приготовление:</h4>
                    <ol>
                        ${recipe.steps.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                </div>
                
                <div class="recipe-actions">
                    <button class="btn-small btn-share" onclick="app.shareRecipe(${recipe.id})">
                        📤 Отправить себе
                    </button>
                    <button class="btn-small btn-download" onclick="app.downloa
