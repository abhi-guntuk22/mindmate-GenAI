import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, entryId } = await req.json();
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const mythsFacts = [
      {
        myth: "Talking about mental health means you're weak",
        fact: "Seeking help shows courage and self-awareness. Mental health struggles are common and treatable."
      },
      {
        myth: "Only people with severe problems need mental health support",
        fact: "Mental wellness is for everyone. Taking care of your mind is as important as physical health."
      },
      {
        myth: "Stress and anxiety are just part of being a student",
        fact: "While some stress is normal, persistent anxiety affects learning and well-being. Support is available."
      },
      {
        myth: "Meditation and relaxation are just trends",
        fact: "Mindfulness practices are scientifically proven to reduce stress, improve focus, and enhance emotional regulation."
      },
      {
        myth: "Mental health problems are permanent",
        fact: "With proper support, therapy, and sometimes medication, most mental health conditions are treatable and manageable."
      },
      {
        myth: "You should be able to handle everything on your own",
        fact: "Humans are social beings. Seeking support from friends, family, or professionals is healthy and normal."
      }
    ];

    const systemPrompt = `You are a compassionate AI journal analyst for Indian youth. Analyze the journal entry and provide:

1. EMOTIONAL ANALYSIS: Identify the main emotions and themes (2-3 sentences max)
2. GENTLE REFLECTION: Offer empathetic validation and gentle insights (2-3 sentences max)  
3. MYTH/FACT SUGGESTION: Based on the content, suggest ONE relevant myth-fact pair from the available options

Available Myth-Fact pairs:
${mythsFacts.map((item, index) => `${index + 1}. Myth: "${item.myth}" | Fact: "${item.fact}"`).join('\n')}

Guidelines:
- Use warm, understanding tone
- Be culturally sensitive to Indian context
- Avoid clinical language - be conversational
- Focus on hope and growth
- Keep analysis concise but meaningful
- For the suggestion, just mention which myth/fact number is most relevant

Format your response as:
ANALYSIS: [your emotional analysis and reflection]
SUGGESTION: Myth/Fact #[number] - [brief explanation why it's relevant]`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${systemPrompt}\n\nJournal Entry to analyze:\n"${content}"` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 512,
        },
      }),
    });

    if (!response.ok) {
      console.error('Gemini API error:', await response.text());
      throw new Error('Failed to generate analysis');
    }

    const data = await response.json();
    const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse the response to extract analysis and suggestion
    const analysisParts = analysisText.split('SUGGESTION:');
    const analysis = analysisParts[0]?.replace('ANALYSIS:', '').trim() || "Your journal entry shows thoughtful self-reflection. Thank you for sharing your thoughts and feelings.";
    let suggestion = analysisParts[1]?.trim() || "Consider exploring our Learning Hub for helpful insights about mental wellness.";

    // Extract myth/fact number and provide the full content
    const mythFactMatch = suggestion.match(/Myth\/Fact #(\d+)/);
    if (mythFactMatch) {
      const factNumber = parseInt(mythFactMatch[1]) - 1;
      if (factNumber >= 0 && factNumber < mythsFacts.length) {
        const selectedFact = mythsFacts[factNumber];
        suggestion = `💡 Learning Hub Suggestion: "${selectedFact.myth}" - Actually, ${selectedFact.fact}`;
      }
    }

    return new Response(JSON.stringify({ 
      analysis,
      suggestion,
      entryId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in journal-analysis function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      analysis: "Thank you for sharing your thoughts. Self-reflection through journaling is a wonderful practice for mental wellness.",
      suggestion: "Visit our Learning Hub to explore helpful insights about mental health and wellness."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});