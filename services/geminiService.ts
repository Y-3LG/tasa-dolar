
import { GoogleGenAI } from "@google/genai";
import { ExchangeRate } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchBCVRate = async (): Promise<ExchangeRate> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Cuál es la tasa oficial actual del dólar BCV en Venezuela? Responde únicamente con el número decimal usando punto, ejemplo: 36.50. Si no puedes encontrarla, responde con 40.00 como fallback.",
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "40.00";
    const rateMatch = text.match(/\d+(\.\d+)?/);
    const rate = rateMatch ? parseFloat(rateMatch[0]) : 40.00;

    return {
      rate,
      lastUpdate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: "BCV Official"
    };
  } catch (error) {
    console.error("Error fetching BCV rate:", error);
    return {
      rate: 40.00, // Fallback realistic rate
      lastUpdate: "Justo ahora",
      source: "Estimado (Error al conectar)"
    };
  }
};
