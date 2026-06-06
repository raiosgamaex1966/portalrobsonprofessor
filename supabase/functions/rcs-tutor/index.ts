import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, settings } = await req.json()
    const apiKey = settings.llm_api_key || Deno.env.get('OPENAI_API_KEY')

    // Aqui você integraria com a OpenAI, Gemini, etc.
    // Exemplo básico com OpenAI:
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.llm_model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: settings.bdz_tutor_greeting || 'Você é o RCS Tutor, um assistente socrático.' },
          ...messages
        ],
      }),
    })

    const data = await response.json()
    const aiMessage = data.choices[0].message.content

    return new Response(JSON.stringify({ text: aiMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
