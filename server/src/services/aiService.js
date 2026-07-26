const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const schema = {
  type: "object",
  properties: {
    components: {
      type: "array",
      items: { type: "string" },
    },
    execution_flow: {
      type: "array",
      items: {
        type: "object",
        properties: {
          phase: { type: "string" },
          step: { type: "string" },
          sub_flows: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                steps: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              required: ["name", "steps"]
            }
          }
        },
        required: ["phase", "step"]
      }
    },
    backend: {
      type: "object",
      properties: {
        routing: {
          type: "object",
          properties: {
            security_middlewares: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  scope: { type: "string" },
                  purpose: { type: "string" }
                },
                required: ["name"]
              }
            }
          }
        },
        endpoints: {
          type: "array",
          items: {
            type: "object",
            properties: {
              method: { type: "string" },
              path: { type: "string" },
              action: { type: "string" },
              required_role: { type: "string" }
            },
            required: ["method", "path", "action"]
          }
        }
      },
      required: ["endpoints"]
    }
  },
  required: ["execution_flow", "backend"]
};

function chunkDocument(docText) {
  const words = docText.split(/\s+/);
  if (words.length <= 3000) {
    return [docText];
  }
  
  const paragraphs = docText.split(/\n\s*\n/);
  const chunks = [];
  let currentChunk = "";
  
  for (const p of paragraphs) {
    if ((currentChunk.split(/\s+/).length + p.split(/\s+/).length) > 2500) {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = p;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + p;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  
  return chunks.length > 0 ? chunks : [docText];
}

const systemInstruction = `You are an expert software architect. Analyze the provided product requirements and translate them into a technical architecture matching the required JSON schema.
- Break every feature into its distinct sub-flows (e.g. "Login" -> "Normal Login", "SSO Login", "Password Reset").
- Give each sub-flow a concrete, technical ordered list of steps (services, checks, tokens, redirects) — not vague phrasing.
- Infer the REST endpoints each flow needs (method, path, action, required_role).
- Infer any security middleware implied by the doc.
- Only extract what the doc describes or clearly implies — don't invent unrelated features.`;

async function analyzeChunk(chunkText) {
  const response = await ai.models.generateContent({
    model: 'gemini-flash-latest',
    contents: chunkText,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      systemInstruction,
    }
  });
  
  try {
    return JSON.parse(response.text);
  } catch (err) {
    console.error("Failed to parse AI response:", err);
    return null;
  }
}

async function analyzeDocument(docText) {
  const chunks = chunkDocument(docText);
  const results = [];
  
  for (const chunk of chunks) {
    const result = await analyzeChunk(chunk);
    if (result) results.push(result);
  }
  
  if (results.length === 0) {
    throw new Error("Failed to generate valid architecture from document.");
  }
  
  if (results.length === 1) {
    return results[0];
  }
  
  // Merge multiple chunks
  const merged = {
    components: [],
    execution_flow: [],
    backend: {
      routing: { security_middlewares: [] },
      endpoints: []
    }
  };
  
  for (const res of results) {
    if (res.components) merged.components.push(...res.components);
    if (res.execution_flow) merged.execution_flow.push(...res.execution_flow);
    
    if (res.backend?.routing?.security_middlewares) {
      if (!merged.backend.routing) merged.backend.routing = { security_middlewares: [] };
      merged.backend.routing.security_middlewares.push(...res.backend.routing.security_middlewares);
    }
    if (res.backend?.endpoints) {
      merged.backend.endpoints.push(...res.backend.endpoints);
    }
  }
  
  // Deduplicate simple arrays
  merged.components = [...new Set(merged.components)];
  
  return merged;
}

module.exports = {
  analyzeDocument
};
