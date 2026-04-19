const axios = require('axios');

const API_KEY = process.env.OPENROUTER_API_KEY;
const API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';

const chat = async (messages) => {
  const res = await axios.post(API_URL, { model: MODEL, messages }, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://careerpathadvisor.com',
    },
    timeout: 60000,
  });
  return res.data.choices[0].message.content;
};

const getChatResponse = async (userMessage) => {
  try {
    return await chat([
      { role: 'system', content: 'You are an expert Career Advisor AI. Help users with career paths, resume tips, and interview preparation. Be professional, supportive, and concise.' },
      { role: 'user', content: userMessage },
    ]);
  } catch (e) {
    console.error('OpenRouter error:', e.message);
    return "I apologize, but I'm having trouble connecting right now. Please try again later.";
  }
};

const analyzeResume = async (resumeText) => {
  try {
    const content = await chat([
      { role: 'system', content: 'You are an expert Resume Reviewer. Analyze the provided resume text and provide a structured review in JSON format. The response must be a single JSON object with keys: "score" (number 0-100), "strengths" (string, comma-separated), "improvements" (string, comma-separated), "feedback" (string), "careerPath" (string). Do not include any text outside the JSON.' },
      { role: 'user', content: `Analyze this resume text:\n\n${resumeText}` },
    ]);
    let cleaned = content;
    if (cleaned.includes('```')) {
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end !== -1) cleaned = cleaned.substring(start, end + 1);
    }
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Resume analysis error:', e.message);
    return { score: 50, strengths: 'Error in AI analysis', improvements: 'Try again later', feedback: 'AI analysis failed.', careerPath: 'Review your skills.' };
  }
};

module.exports = { getChatResponse, analyzeResume };
