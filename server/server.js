import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/data', express.static(path.join(__dirname, '../data')));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Загрузка данных
const products = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/products.json')));
const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/recipes.json')));

// API: Продукты
app.get('/api/products', (req, res) => {
    res.json({ products, categories: /* группировка по cat */ });
});

// Поиск рецептов (TheMealDB + локальный fallback)
app.post('/api/find-recipes', async (req, res) => {
    const { ingredients } = req.body;
    // TheMealDB: fetch по одному, комбинируем
    let externalRecipes = [];
    for (let ing of ingredients.slice(0,3)) { // Лимит для скорости
        try {
            const mealRes = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ing)}`);
            const data = await mealRes.json();
            externalRecipes = externalRecipes.concat(data.meals || []);
        } catch (e) { console.log('TheMealDB error'); }
    }
    // Локальный fallback
    const local = recipes.filter(r => ingredients.some(i => r.ingredients.includes(i)));
    const combined = [...new Set(externalRecipes.map(m => ({...m, time: 20, difficulty: 'Средне'}))), ...local.slice(0,10)];
    res.json({ recipes: combined });
});

// ИИ-рецепт
app.post('/api/generate-ai-recipe', async (req, res) => {
    const { ingredients } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Генерируй простой рецепт на русском из ингредиентов: ${ingredients.join(', ')}. Включи: title, time (мин), difficulty (Легко/Средне/Сложно), ingredients (список), steps (нумерованный список 5-7 шагов). Реалистично для дома. JSON формат.`;
    const result = await model.generateContent(prompt);
    const recipe = JSON.parse(result.response.text()); // Парсинг
    res.json({ recipe });
});

// Фото (заглушка, используй Gemini Vision для реала)
app.post('/api/analyze-photo', (req, res) => {
    // TODO: Интеграция с Gemini Vision
    res.json({ products: [1,3] }); // Пример: яйца, помидоры
});

// Health
app.get('/health', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
