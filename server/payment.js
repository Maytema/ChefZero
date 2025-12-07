const axios = require('axios');

const CRYPTOCLOUD_URL = 'https://api.cryptocloud.plus/v1';
const SHOP_ID = process.env.CRYPTOCLOUD_SHOP_ID;
const API_KEY = process.env.CRYPTOCLOUD_API_KEY;

// Plan configurations
const PLANS = {
    monthly: {
        amount: 299,
        currency: 'RUB',
        description: 'Премиум подписка ChefZero на 1 месяц',
        credits: 9999 // Unlimited
    },
    pack: {
        amount: 99,
        currency: 'RUB',
        description: 'Пакет из 10 ИИ-рецептов ChefZero',
        credits: 10
    }
};

async function createPayment(planType, deviceId) {
    try {
        const plan = PLANS[planType];
        if (!plan) {
            throw new Error('Неверный тип подписки');
        }
        
        const paymentData = {
            amount: plan.amount,
            currency: plan.currency,
            description: plan.description,
            order_id: `chefzero_${deviceId}_${Date.now()}`,
            email: 'user@chefzero.app',
            custom: JSON.stringify({
                plan: planType,
                deviceId: deviceId,
                credits: plan.credits
            }),
            callback_url: `${process.env.APP_URL}/api/payment/callback`,
            success_url: `${process.env.APP_URL}/?payment=success`,
            fail_url: `${process.env.APP_URL}/?payment=failed`
        };
        
        const response = await axios.post(`${CRYPTOCLOUD_URL}/invoice/create`, paymentData, {
            headers: {
                'Authorization': `Token ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data.status === 'success') {
            return {
                id: response.data.result.invoice_id,
                paymentUrl: response.data.result.pay_url,
                amount: plan.amount,
                credits: plan.credits
            };
        } else {
            throw new Error(response.data.error || 'Ошибка создания платежа');
        }
        
    } catch (error) {
        console.error('Create payment error:', error.response?.data || error.message);
        throw error;
    }
}

async function checkPayment(invoiceId) {
    try {
        const response = await axios.get(`${CRYPTOCLOUD_URL}/invoice/info`, {
            params: { uuid: invoiceId },
            headers: {
                'Authorization': `Token ${API_KEY}`
            }
        });
        
        if (response.data.status === 'success') {
            const invoice = response.data.result;
            const custom = JSON.parse(invoice.custom || '{}');
            
            return {
                status: invoice.status,
                amount: invoice.amount,
                currency: invoice.currency,
                paidAt: invoice.paid_at,
                addedCredits: custom.credits || 0,
                plan: custom.plan
            };
        } else {
            throw new Error(response.data.error || 'Ошибка проверки статуса');
        }
        
    } catch (error) {
        console.error('Check payment error:', error.response?.data || error.message);
        throw error;
    }
}

// Webhook handler for CryptoCloud callbacks
async function handleWebhook(data) {
    try {
        const { invoice_id, status } = data;
        
        if (status === 'paid') {
            // Update user limits in your database
            console.log(`Payment ${invoice_id} completed successfully`);
            
            // Here you would:
            // 1. Parse custom data
            // 2. Update user's limits in database
            // 3. Send confirmation email if needed
            
            return { success: true };
        }
        
        return { success: false, reason: 'Payment not completed' };
        
    } catch (error) {
        console.error('Webhook error:', error);
        throw error;
    }
}

module.exports = { createPayment, checkPayment, handleWebhook };
