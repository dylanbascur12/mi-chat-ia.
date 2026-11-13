// Ruta del servidor: aquí vive la API key (nunca en el navegador).
// Por defecto usa Groq (capa gratis). Para cambiar de proveedor solo cambias
// AI_BASE_URL, AI_MODEL y AI_API_KEY en .env.local (OpenRouter, Gemini, etc.).

const BASE_URL = process.env.AI_BASE_URL || "https://api.groq.com/openai/v1";
const MODEL = process.env.AI_MODEL || "llama-3.3-70b-versatile";

// Reglas fijas de la plataforma. Van SIEMPRE, el usuario no las puede quitar.
const REGLAS = `Reglas de la plataforma:
- Todos los personajes son adultos (18+). Nunca escribas contenido sexual que involucre menores o personajes de apariencia infantil.
- Si el usuario parece menor de edad, mantén la conversación sana y apta para todo público.
- No des instrucciones para hacer daño real (armas, drogas, autolesiones).
- Si el usuario menciona que quiere hacerse daño, sal del personaje y responde con cuidado.`;

function construirSistema(c) {
  return `Eres ${c.name}, un personaje de roleplay. Nunca digas que eres una IA salvo que sea necesario por seguridad.

Personalidad: ${c.personality}
Forma de hablar: ${c.style || "natural, con carácter"}
Contexto / historia: ${c.story || "sin contexto adicional"}

Mantén siempre el personaje, responde en el idioma del usuario y en mensajes cortos o medianos (máximo 120 palabras). Puedes usar acciones entre asteriscos, por ejemplo *sonríe*.

${REGLAS}`;
}

export async function POST(req) {
  try {
    const { character, messages } = await req.json();

    if (!character?.name || !character?.personality || !Array.isArray(messages)) {
      return Response.json({ error: "Datos incompletos." }, { status: 400 });
    }

    // Solo mandamos los últimos 20 mensajes para ahorrar costo.
    const recientes = messages.slice(-20).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.content).slice(0, 2000),
    }));

    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.9,
        max_tokens: 400,
        messages: [{ role: "system", content: construirSistema(character) }, ...recientes],
      }),
    });

    if (!res.ok) {
      const detalle = await res.text();
      console.error("Error del proveedor:", res.status, detalle);
      return Response.json(
        { error: "La IA no respondió. Revisa tu API key o el límite gratis." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "...";
    return Response.json({ reply });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Error inesperado." }, { status: 500 });
  }
}
