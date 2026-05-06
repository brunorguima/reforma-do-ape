import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const askConstructionExpert = async (prompt: string, history: { role: string; parts: string[] }[] = []) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(item => ({ role: item.role, parts: [{ text: item.parts[0] }] })),
        { role: "user", parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: `Você é o "Reformia AI", um especialista sênior em construção civil, reformas e arquitetura no Brasil. 
        Seu objetivo é ajudar proprietários de obras e mestre de obras com:
        1. Normas técnicas (ABNT NBR).
        2. Escolha de materiais (ex: argamassa AC1, AC2, AC3, tintas, tipos de tijolo).
        3. Cálculo de quantitativos básicos (ex: quantos sacos de cimento para um contrapiso).
        4. Dicas de economia e sustentabilidade.
        5. Identificação de problemas patológicos (infiltrações, fissuras).
        
        Seja prático, use termos técnicos do dia-a-dia da obra brasileira mas explique-os se necessário.
        Responda sempre em Português do Brasil.
        Mantenha um tom profissional, prestativo e seguro.`,
        temperature: 0.7,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Desculpe, tive um problema ao processar seu pedido. Verifique sua conexão ou tente novamente.";
  }
};
