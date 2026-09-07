import { GoogleGenerativeAI } from '@google/generative-ai';

// Uses the API key from environment
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || 'dummy_key');

/**
 * Predicts the next crop based on NPK, history, and season.
 * @param {Object} params - { currentCrop, npk: { n, p, k }, historyData, region, season }
 * @returns {Promise<Object>} prediction data
 */
export async function getCropPrediction({ currentCrop, npk, historyData, region, season }) {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    console.warn('VITE_GEMINI_API_KEY not found, using fallback prediction.');
    return {
      recommendedCrop: 'Soybean',
      confidenceScore: 85,
      expectedPriceRange: '4200 - 4600 Rs/Q',
      recommendedSowingWindow: 'June 2nd week - July 1st week',
      reasoning: 'Fallback reasoning: Based on typical crop rotations and current NPK values.',
    };
  }

  const prompt = `
You are an expert Indian agronomist and ML model. Based on the following data, recommend the best crop for the upcoming season to maximize profit and maintain soil health.

Farmer's Region: ${region}
Current Season: ${season}
Current Crop in field: ${currentCrop || 'None'}
Soil NPK values: N=${npk?.n || 0}, P=${npk?.p || 0}, K=${npk?.k || 0}
Recent Market Data (Historical Prices): ${JSON.stringify(historyData)}

Provide the prediction in strict JSON format:
{
  "recommendedCrop": "Crop Name",
  "confidenceScore": 92,
  "expectedPriceRange": "Min - Max Rs/Quintal",
  "recommendedSowingWindow": "Dates/Months",
  "reasoning": "A short, forward-looking explanation (e.g., 'Sugarcane harvest is in 3 months → Coriander prices typically spike in summer → Consider intercropping or next-season planning')."
}`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('ML Crop Advisor Error:', error);
    return {
      recommendedCrop: 'Unknown',
      confidenceScore: 0,
      expectedPriceRange: 'N/A',
      recommendedSowingWindow: 'N/A',
      reasoning: 'Failed to generate prediction. Please try again later.',
    };
  }
}
