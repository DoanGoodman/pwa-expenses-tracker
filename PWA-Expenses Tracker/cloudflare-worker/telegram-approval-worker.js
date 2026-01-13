/**
 * Telegram Approval Worker for PWA Expenses Tracker
 * Handles permission approval workflow via Telegram bot
 * 
 * Environment Variables Required:
 * - TELEGRAM_BOT_TOKEN: Bot token from @BotFather
 * - TELEGRAM_ADMIN_CHAT_ID: Admin's Telegram chat ID
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_KEY: Supabase service role key (for bypassing RLS)
 */

const TELEGRAM_API = 'https://api.telegram.org/bot';

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            // Route: /notify - Send approval request to Telegram
            if (url.pathname === '/notify' && request.method === 'POST') {
                return await handleNotify(request, env, corsHeaders);
            }

            // Route: /webhook - Handle Telegram callbacks
            if (url.pathname === '/webhook' && request.method === 'POST') {
                return await handleWebhook(request, env, corsHeaders);
            }

            // Route: /setup - Set webhook URL (run once)
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

/**
 * Handle permission request notification
 */
async function handleNotify(request, env, corsHeaders) {
    const { userId, userEmail, featureName } = await request.json();

    if (!userId || !userEmail) {
        return new Response(JSON.stringify({ error: 'Missing userId or userEmail' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const message = `🔔 *Yêu cầu truy cập tính năng*\n\n` +
        `👤 *Người dùng:* ${userEmail}\n` +
        `📱 *Tính năng:* ${featureName || 'Tải hoá đơn'}\n` +
        `🆔 *User ID:* \`${userId}\`\n\n` +
        `Vui lòng chọn hành động:`;

    const keyboard = {
        inline_keyboard: [
            [
                { text: '✅ Phê duyệt', callback_data: `approve:${userId}` },
                { text: '❌ Từ chối', callback_data: `reject:${userId}` }
            ]
        ]
    };

    const telegramResponse = await sendTelegramMessage(
        env.TELEGRAM_BOT_TOKEN,
        env.TELEGRAM_ADMIN_CHAT_ID,
        message,
        keyboard
    );

    return new Response(JSON.stringify({ success: true, telegramResponse }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

/**
 * Handle Telegram webhook callbacks
 */
async function handleWebhook(request, env, corsHeaders) {
    const update = await request.json();

    // Handle callback_query (button clicks)
    if (update.callback_query) {
        const callbackData = update.callback_query.data;
        const [action, userId] = callbackData.split(':');
        const callbackQueryId = update.callback_query.id;
        const messageId = update.callback_query.message.message_id;
        const chatId = update.callback_query.message.chat.id;
        const adminUsername = update.callback_query.from.username || update.callback_query.from.first_name;

        // Update permission in Supabase
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        const updateResult = await updatePermissionStatus(env, userId, newStatus, adminUsername);

        // Answer callback query
        await answerCallbackQuery(env.TELEGRAM_BOT_TOKEN, callbackQueryId,
            action === 'approve' ? '✅ Đã phê duyệt!' : '❌ Đã từ chối!');

        // Edit original message to show result
        const statusEmoji = action === 'approve' ? '✅' : '❌';
        const statusText = action === 'approve' ? 'ĐÃ PHÊ DUYỆT' : 'ĐÃ TỪ CHỐI';
        const editedMessage = update.callback_query.message.text +
            `\n\n${statusEmoji} *${statusText}* bởi @${adminUsername}`;

        await editTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, messageId, editedMessage);

        return new Response('OK', { headers: corsHeaders });
    }

    return new Response('OK', { headers: corsHeaders });
}

/**
 * Setup Telegram webhook (run once after deployment)
 */
async function setupWebhook(request, env, corsHeaders) {
    const url = new URL(request.url);
    const webhookUrl = `${url.origin}/webhook`;

    const response = await fetch(
        `${TELEGRAM_API}${env.TELEGRAM_BOT_TOKEN}/setWebhook`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: webhookUrl })
        }
    );

    const result = await response.json();
    return new Response(JSON.stringify({ webhookUrl, result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

/**
 * Update permission status in Supabase
 */
async function updatePermissionStatus(env, userId, status, respondedBy) {
    const response = await fetch(
        `${env.SUPABASE_URL}/rest/v1/feature_permissions?user_id=eq.${userId}&feature_name=eq.receipt_scanner`,
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'apikey': env.SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
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

/**
 * Send message to Telegram
 */
async function sendTelegramMessage(token, chatId, text, replyMarkup = null) {
    const body = {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
    };

    if (replyMarkup) {
        body.reply_markup = replyMarkup;
    }

    const response = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    return await response.json();
}

/**
 * Answer callback query (acknowledge button click)
 */
async function answerCallbackQuery(token, callbackQueryId, text) {
    await fetch(`${TELEGRAM_API}${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            callback_query_id: callbackQueryId,
            text: text
        })
    });
}

/**
 * Edit existing message
 */
async function editTelegramMessage(token, chatId, messageId, text) {
    await fetch(`${TELEGRAM_API}${token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'Markdown'
        })
    });
}
