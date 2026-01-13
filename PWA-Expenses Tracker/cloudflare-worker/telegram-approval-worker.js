/**
 * Telegram Approval Worker for PWA Expenses Tracker
 * Handles permission approval workflow via Telegram bot
 */

const TELEGRAM_API = 'https://api.telegram.org/bot';

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            if (url.pathname === '/notify' && request.method === 'POST') {
                return await handleNotify(request, env, corsHeaders);
            }

            if (url.pathname === '/webhook' && request.method === 'POST') {
                return await handleWebhook(request, env, corsHeaders);
            }

            if (url.pathname === '/setup') {
                return await setupWebhook(request, env, corsHeaders);
            }

            return new Response('Not Found', { status: 404, headers: corsHeaders });
        } catch (error) {
            console.error('Worker error:', error);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
};

async function handleNotify(request, env, corsHeaders) {
    const { userId, userEmail, featureName } = await request.json();

    if (!userId || !userEmail) {
        return new Response(JSON.stringify({ error: 'Missing userId or userEmail' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const message = "Yeu cau truy cap tinh nang\n\n" +
        "Nguoi dung: " + userEmail + "\n" +
        "Tinh nang: " + (featureName || "Tai hoa don") + "\n" +
        "User ID: " + userId + "\n\n" +
        "Vui long chon hanh dong:";

    const keyboard = {
        inline_keyboard: [
            [
                { text: 'Phe duyet', callback_data: 'approve:' + userId },
                { text: 'Tu choi', callback_data: 'reject:' + userId }
            ]
        ]
    };

    const body = {
        chat_id: env.TELEGRAM_ADMIN_CHAT_ID,
        text: message,
        reply_markup: keyboard
    };

    const response = await fetch(TELEGRAM_API + env.TELEGRAM_BOT_TOKEN + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const telegramResponse = await response.json();

    return new Response(JSON.stringify({ success: true, telegramResponse }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

async function handleWebhook(request, env, corsHeaders) {
    const update = await request.json();

    if (update.callback_query) {
        const callbackData = update.callback_query.data;
        const parts = callbackData.split(':');
        const action = parts[0];
        const userId = parts[1];
        const callbackQueryId = update.callback_query.id;
        const messageId = update.callback_query.message.message_id;
        const chatId = update.callback_query.message.chat.id;
        const adminUsername = update.callback_query.from.username || update.callback_query.from.first_name;

        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        await updatePermissionStatus(env, userId, newStatus, adminUsername);

        await fetch(TELEGRAM_API + env.TELEGRAM_BOT_TOKEN + '/answerCallbackQuery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                callback_query_id: callbackQueryId,
                text: action === 'approve' ? 'Da phe duyet!' : 'Da tu choi!'
            })
        });

        const statusText = action === 'approve' ? 'DA PHE DUYET' : 'DA TU CHOI';
        const editedMessage = update.callback_query.message.text + '\n\n' + statusText + ' boi @' + adminUsername;

        await fetch(TELEGRAM_API + env.TELEGRAM_BOT_TOKEN + '/editMessageText', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: editedMessage
            })
        });

        return new Response('OK', { headers: corsHeaders });
    }

    return new Response('OK', { headers: corsHeaders });
}

async function setupWebhook(request, env, corsHeaders) {
    const url = new URL(request.url);
    const webhookUrl = url.origin + '/webhook';

    const response = await fetch(TELEGRAM_API + env.TELEGRAM_BOT_TOKEN + '/setWebhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl })
    });

    const result = await response.json();
    return new Response(JSON.stringify({ webhookUrl, result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

async function updatePermissionStatus(env, userId, status, respondedBy) {
    const response = await fetch(
        env.SUPABASE_URL + '/rest/v1/feature_permissions?user_id=eq.' + userId + '&feature_name=eq.receipt_scanner',
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'apikey': env.SUPABASE_SERVICE_KEY,
                'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_KEY,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                status: status,
                responded_at: new Date().toISOString(),
                responded_by: respondedBy
            })
        }
    );

    return { success: response.ok, status: response.status };
}
