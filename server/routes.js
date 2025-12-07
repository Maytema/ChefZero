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
    }).slice(0, 20);
    
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
        res.status(500).json({ error: 'Ошибка генерации рецепта', details: error.message });
    }
});

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
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
