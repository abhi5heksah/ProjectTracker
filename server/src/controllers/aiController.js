const z = require('zod');
const { analyzeDocument } = require('../services/aiService');

const resultSchema = z.object({
  components: z.array(z.string()).optional(),
  execution_flow: z.array(
    z.object({
      phase: z.string(),
      step: z.string(),
      sub_flows: z.array(
        z.object({
          name: z.string(),
          steps: z.array(z.string())
        })
      ).optional()
    })
  ),
  backend: z.object({
    routing: z.object({
      security_middlewares: z.array(
        z.object({
          name: z.string(),
          scope: z.string().optional(),
          purpose: z.string().optional()
        })
      ).optional()
    }).optional(),
    endpoints: z.array(
      z.object({
        method: z.string(),
        path: z.string(),
        action: z.string(),
        required_role: z.string().optional()
      })
    )
  })
});

const analyzeDoc = async (req, res, next) => {
  try {
    const { docText } = req.body;
    
    if (!docText || typeof docText !== 'string' || docText.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Missing or invalid docText.' });
    }

    const aiResult = await analyzeDocument(docText);

    // Validate structured output
    const validationResult = resultSchema.safeParse(aiResult);

    if (!validationResult.success) {
      console.error("Zod validation failed:", validationResult.error);
      return res.status(422).json({
        success: false,
        message: "Couldn't fully parse this — try adding more detail. The AI returned an invalid architecture structure."
      });
    }

    // Do NOT auto-save to the DB from this endpoint. Return validated JSON only.
    res.status(200).json({
      success: true,
      data: validationResult.data
    });
  } catch (err) {
    if (err.message && err.message.includes('Failed to generate')) {
      return res.status(422).json({ success: false, message: err.message });
    }
    if (err.status === 429 || (err.message && err.message.includes('429'))) {
      return res.status(429).json({ success: false, message: 'Gemini API quota exceeded. Please check your API key billing and quota limits.' });
    }
    console.error("AI Error:", err);
    res.status(500).json({ success: false, message: 'An error occurred while communicating with the AI service. Check the server logs for details.' });
  }
};

module.exports = {
  analyzeDoc
};
