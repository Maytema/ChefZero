const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const IMAGE_PROMPT_TEMPLATE = `Ты — профессиональный шеф-повар.  
Создай подробный рецепт ТОЛЬКО из этих продуктов: {{список продуктов}}  
Дополнительно можно использовать: соль, перец, растительное масло, воду, сахар, муку (до 100 г).  
Язык: русский, тон дружелюбный и понятный новичкам.  

Верни ТОЛЬКО JSON без каких-либо дополнительных текстов и комментариев:

{
  "title": "Название блюда",
  "portions": 2,
  "time": "25 минут",
  "difficulty": "просто",
  "ingredients": ["100 г курицы", "2 яйца"],
  "steps": ["1. Разогрейте сковороду", "2. Приготовьте"],
  "imagePrompt": "фотография готового блюда <title> на деревянном столе, тёплое освещение, аппетитно, 4k"
}`;

async function generateRecipe(products) {
    try {
        const prompt = IMAGE_PROMPT_TEMPLATE.replace('{{список продуктов}}', products.join(', '));
        
        console.log('🔍 Gemini запрос:', prompt);
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('📝 Gemini ответ:', text);
        
        // Очищаем ответ от markdown и лишнего текста
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Не удалось извлечь JSON из ответа: ' + text.substring(0, 200));
        }
        
        const cleanedJson = jsonMatch[0]
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
            
        const recipe = JSON.parse(cleanedJson);
        
        // Генерация изображения через Gemini
        try {
            const imageResult = await model.generateContent([
                recipe.imagePrompt,
                "Сгенерируй фото еды. Только изображение, без текста."
            ]);
            // В реальности Gemini 1.5 Flash не генерирует изображения напрямую
            // Нужно использовать другой сервис, например, Stable Diffusion API
            recipe.image = await generateImageWithAPI(recipe.title);
        } catch (imageError) {
            console.log('🖼️ Использую fallback изображение');
            recipe.image = getFallbackImage(recipe.title);
        }
        
        return recipe;
        
    } catch (error) {
        console.error('❌ Gemini API error:', error.message);
        // Возвращаем fallback рецепт
        return getFallbackRecipe(products);
    }
}

// Заглушка для генерации изображений
async function generateImageWithAPI(title) {
    // Здесь должен быть вызов к API генерации изображений
    // Например: Stability AI, DALL-E, или другой сервис
    return getFallbackImage(title);
}

function getFallbackImage(title) {
    // Красивые fallback изображения с Unsplash
    const foodImages = [
        'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=600&h=400&fit=crop'
    ];
    return foodImages[Math.floor(Math.random() * foodImages.length)];
}

function getFallbackRecipe(products) {
    return {
        title: "Вкусное блюдо из " + products.join(', '),
        portions: 2,
        time: "20-30 минут",
        difficulty: "просто",
        ingredients: products.map(p => `200 г ${p}`).concat(["соль", "перец", "растительное масло"]),
        steps: [
            "1. Подготовьте все ингредиенты",
            "2. Нарежьте продукты небольшими кусочками",
            "3. Обжарьте на среднем огне до готовности",
            "4. Подавайте горячим"
        ],
        image: getFallbackImage("Блюдо")
    };
}

module.exports = { generateRecipe };
