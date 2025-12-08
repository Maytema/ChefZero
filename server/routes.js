const express = require('express');
const router = express.Router();
const { generateRecipe } = require('./gemini');
const { createPayment, checkPayment } = require('./payment');
const products = require('../data/products.json');
const recipes = require('../data/recipes.json');

// Get all products
router.get('/products', (req, res) => {
    res.json(products);
});

// Get all recipes (for testing)
router.get('/recipes', (req, res) => {
    res.json(recipes.slice(0, 50));
});

// Get categories
router.get('/categories', (req, res) => {
    const categories = [...new Set(products.map(p => p.category))];
    res.json(categories.map(cat => ({
        name: cat,
        count: products.filter(p => p.category === cat).length,
        icon: getCategoryIcon(cat)
    })));
});

// Find recipes by products
router.post('/recipes/find', (req, res) => {
    const { products: selectedProducts } = req.body;
    
    if (!selectedProducts || !Array.isArray(selectedProducts)) {
        return res.status(400).json({ error: 'Нет продуктов для поиска' });
    }
    
    // Extract product names from keys (format: "id_name")
    const productNames = selectedProducts.map(p => {
        const parts = p.split('_');
        return parts.slice(1).join('_').toLowerCase();
    });
    
    // Find recipes that contain at least one of the products
    const matchedRecipes = recipes.filter(recipe => {
        const recipeText = `${recipe.title} ${recipe.ingredients.join(' ')} ${recipe.description}`.toLowerCase();
        return productNames.some(product => recipeText.includes(product));
    }).slice(0, 50); // Ограничиваем для производительности
    
    res.json(matchedRecipes);
});

// Generate AI recipe
router.post('/ai/recipe', async (req, res) => {
    try {
        const { products } = req.body;
        
        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ error: 'Добавьте продукты для генерации рецепта' });
        }
        
        const recipe = await generateRecipe(products);
        res.json(recipe);
        
    } catch (error) {
        console.error('AI recipe error:', error);
        res.status(500).json({ 
            error: 'Ошибка генерации рецепта',
            fallback: true,
            recipe: getFallbackRecipe(req.body.products || [])
        });
    }
});

function getFallbackRecipe(products) {
    return {
        title: "Вкусное блюдо из " + products.slice(0, 3).join(', '),
        portions: 2,
        time: "20-30 минут",
        difficulty: "просто",
        ingredients: products.map(p => `200 г ${p}`).concat(["соль", "перец", "растительное масло"]),
        steps: [
            "1. Подготовьте все ингредиенты",
            "2. Нарежьте продукты небольшими кусочками",
            "3. Обжарьте на среднем огне до готовности",
            "4. Подавайте горячим, украсив зеленью"
        ],
        image: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&h=400&fit=crop"
    };
}

function getCategoryIcon(category) {
    const icons = {
        'овощи': 'fas fa-carrot',
        'мясо': 'fas fa-drumstick-bite',
        'молочные': 'fas fa-cheese',
        'крупы': 'fas fa-bread-slice',
        'фрукты': 'fas fa-apple-alt',
        'специи': 'fas fa-mortar-pestle',
        'рыба': 'fas fa-fish',
        'напитки': 'fas fa-wine-bottle',
        'выпечка': 'fas fa-cookie-bite',
        'бакалея': 'fas fa-shopping-basket'
    };
    return icons[category] || 'fas fa-question';
}

// Create payment
router.post('/payment/create', async (req, res) => {
    try {
        const { plan, deviceId } = req.body;
        const payment = await createPayment(plan, deviceId);
        res.json(payment);
    } catch (error) {
        console.error('Payment creation error:', error);
        res.status(500).json({ error: 'Ошибка создания платежа' });
    }
});

// Check payment status
router.get('/payment/status/:id', async (req, res) => {
    try {
        const status = await checkPayment(req.params.id);
        res.json(status);
    } catch (error) {
        console.error('Payment status error:', error);
        res.status(500).json({ error: 'Ошибка проверки статуса' });
    }
});

// Health check
router.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        counts: {
            products: products.length,
            recipes: recipes.length
        }
    });
});

module.exports = router;
