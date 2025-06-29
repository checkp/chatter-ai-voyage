
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactRequest {
  email: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, message }: ContactRequest = await req.json();
    
    console.log('Received contact form submission:', { email, message: message.substring(0, 100) + '...' });

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const chatId = Deno.env.get('TELEGRAM_CHAT_ID');

    if (!botToken || !chatId) {
      console.error('Missing Telegram configuration');
      throw new Error('Telegram configuration not found');
    }

    // Format the message for Telegram
    const telegramMessage = `🔔 *New Contact Form Submission*

📧 *Email:* ${email || 'Not provided'}

💬 *Message:*
${message}

⏰ *Submitted:* ${new Date().toLocaleString()}`;

    // Send message to Telegram
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: telegramMessage,
        parse_mode: 'Markdown',
      }),
    });

    if (!telegramResponse.ok) {
      const errorText = await telegramResponse.text();
      console.error('Telegram API error:', errorText);
      throw new Error('Failed to send message to Telegram');
    }

    const telegramResult = await telegramResponse.json();
    console.log('Message sent to Telegram successfully:', telegramResult.message_id);

    return new Response(
      JSON.stringify({ success: true, message: 'Message sent successfully' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in send-telegram-message function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send message',
        details: error.message 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
