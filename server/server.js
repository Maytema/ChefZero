const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Serve data files
app.get('/data/products.json', (req, res) => {
    res.sendFile(path.join(__dirname, '../data/products.json'));
});

app.get('/data/recipes.json', (req, res) => {
    res.sendFile(path.join(__dirname, '../data/recipes.json'));
});

// API endpoint for future features
app.post('/api/generate-recipe', (req, res) => {
    // Placeholder for AI recipe generation
    res.json({
        success: true,
        message: 'AI recipe generation coming soon!',
        recipe: null
    });
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`🍳 ChefZero server running on http://localhost:${PORT}`);
});
