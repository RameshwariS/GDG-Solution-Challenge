const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: process.env.NVIDIA_BASE_URL
});

app.post('/api/nvidia', async (req, res) => {
  const { messages } = req.body;

  try {
    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const completion = await openai.chat.completions.create({
      model: "nvidia/llama-3.1-nemotron-70b-instruct",
      messages: [
        {
          role: "system",
          content: "You are an agricultural expert assistant. Provide helpful advice about farming, crops, and weather-related agricultural practices. Keep responses focused on farming and agriculture."
        },
        ...messages
      ],
      temperature: 0.5,
      top_p: 1,
      max_tokens: 1024,
      stream: true,
    });

    // Stream the response
    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Error communicating with NVIDIA API:', error.message);
    res.status(500).json({ 
      error: 'Error calling NVIDIA API',
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
