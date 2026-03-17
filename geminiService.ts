
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export const generateLeaveReason = async (eventName: string, startDate: string, endDate: string, studentName: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `
      Write a professional, concise (2-3 sentences) leave application reason for a university student.
      Student Name: ${studentName}
      Event Name: ${eventName}
      Event Duration: From ${startDate} to ${endDate}
      
      The tone should be academic and polite, requesting approval to attend. Do not include placeholders.
    `;

    // Using ai.models.generateContent with model and prompt as per updated guidelines
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // response.text is a property getter, not a method
    return response.text || "I would like to request leave to attend this upcoming event.";
  } catch (error) {
    console.error("Gemini generation error:", error);
    return "I request leave to attend this educational event.";
  }
};
