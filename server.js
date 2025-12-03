import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000;

// Настройки
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Подключение к Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ========== БАЗА ДАННЫХ ==========
const RECIPES_DB = [
  {
    id: 1,
    name: "Омлет с овощами",
    ingredients: ["яйца", "помидоры", "лук", "сыр"],
    time: "15 мин",
    difficulty: "легко",
    steps: ["1. Взбить яйца", "2. Нарезать овощи", "3. Жарить 5 минут"]
  },
  {
    id: 2,
    name: "Картофель с курицей",
    ingredients: ["картофель", "курица", "лук", "морковь"],
    time: "40 мин",
    difficulty: "средне",
    steps: ["1. Нарезать всё", "2. Обжарить", "3. Тушить 30 минут"]
  },
  // ... 150+ рецептов
];

const INGREDIENTS_DB = [
  { id: 1, name: "яйца", icon: "🥚", category: "молочные" },
  { id: 2, name: "картофель", icon: "🥔", category: "овощи" },
  { id: 3, name: "помидоры", icon: "🍅", category: "овощи" },
  { id: 4, name: "лук", icon: "🧅", category: "овощи" },
  { id: 5, name: "морковь", icon: "🥕", category: "овощи" },
  { id: 6, name: "курица", icon: "🍗", category: "мясо" },
  { id: 7, name: "сыр", icon: "🧀", category: "молочные" },
  { id: 8, name: "рис", icon: "🍚", category: "крупы" },
  { id: 9, name: "макароны", icon: "🍝", category: "крупы" },
  { id: 10, name: "сметана", icon: "🥛", category: "молочные" },
  // ... 140+ других продуктов
];

// ========== API ЭНДПОИНТЫ ==========

// Получить все ингредиенты
app.get('/api/ingredients', (req, res) => {
  res.json(INGREDIENTS_DB);
});

// Поиск рецептов по ингредиентам
app.post('/api/find-recipes', async (req, res) => {
  const { ingredients, userId } = req.body;
  
  // Проверяем лимиты пользователя
  const user = await getUserUsage(userId);
  
  if (user.free_used >= 3 && user.paid_used >= 10) {
    return res.json({ 
      error: "Лимит исчерпан", 
      upgrade: true 
    });
  }
  
  // Ищем рецепты в базе
  const matchedRecipes = RECIPES_DB.filter(recipe => {
    return ingredients.some(ing => 
      recipe.ingredients.includes(ing.toLowerCase())
    );
  }).slice(0, 2); // Первые 2 рецепта
  
  // Увеличиваем счетчик
  if (user.free_used < 3) {
    await updateUserUsage(userId, 'free', user.free_used + 1);
  } else {
    await updateUserUsage(userId, 'paid', user.paid_used + 1);
  }
  
  res.json({ 
    recipes: matchedRecipes,
    usage: {
      free_left: 3 - Math.min(user.free_used + 1, 3),
      paid_left: 10 - Math.min(user.paid_used, 10)
    }
  });
});

// Генерация ИИ-рецептов (Gemini API)
app.post('/api/ai-recipes', async (req, res) => {
  const { ingredients, preferences } = req.body;
  
  // Здесь будет интеграция с Gemini API
  const aiRecipes = [{
    id: Date.now(),
    name: "Специальный рецепт от ИИ",
    ingredients: ingredients,
    time: "25 мин",
    difficulty: "средне",
    steps: [
      "1. Подготовить все ингредиенты",
      "2. Смешать согласно рецепту",
      "3. Готовить 20 минут"
    ],
    isAI: true
  }];
  
  res.json({ recipes: aiRecipes });
});

// Покупка дополнительных рецептов
app.post('/api/buy-recipes', async (req, res) => {
  const { userId, amount } = req.body;
  
  // Здесь будет интеграция с платежной системой
  // Пока просто добавляем рецепты
  
  await updateUserUsage(userId, 'paid', 0); // Сбрасываем счетчик
  
  res.json({ 
    success: true, 
    message: `Куплено ${amount} рецептов за 99₽` 
  });
});

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

async function getUserUsage(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error || !data) {
    return { free_used: 0, paid_used: 0 };
  }
  
  return data;
}

async function updateUserUsage(userId, type, value) {
  const user = await getUserUsage(userId);
  
  const updateData = type === 'free' 
    ? { free_used: value }
    : { paid_used: value };
  
  if (user.free_used === 0 && user.paid_used === 0) {
    // Создаем нового пользователя
    await supabase.from('users').insert([{
      user_id: userId,
      free_used: type === 'free' ? value : 0,
      paid_used: type === 'paid' ? value : 0
    }]);
  } else {
    // Обновляем существующего
    await supabase
      .from('users')
      .update(updateData)
      .eq('user_id', userId);
  }
}

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});
