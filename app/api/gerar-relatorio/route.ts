import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { montarPrompt1, montarPromptPesquisa, DadosMedico } from '@/lib/prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dados: DadosMedico = body;

    if (!dados.nomeCompleto || !dados.especialidade || !dados.cidadeUF) {
      return NextResponse.json(
        { error: 'Nome completo, especialidade e cidade são obrigatórios.' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY || !process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Chaves da API (OpenAI ou Gemini) não configuradas. Adicione OPENAI_API_KEY e GEMINI_API_KEY no .env.local' },
        { status: 500 }
      );
    }

    // =========================================================================
    // STEP 1: GEMINI (PESQUISA WEB / OSINT)
    // =========================================================================
    const promptPesquisa = montarPromptPesquisa(dados);

    // Fallback de modelos caso haja erro 503 ou de Quota (High Demand)
    const modelosGemini = ['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-2.0-pro-exp-02-05', 'gemini-1.5-flash'];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchTool: any = { googleSearch: {} };
    let geminiResult;
    let geminiSuccess = false;
    let lastGeminiError = null;

    for (const modelName of modelosGemini) {
      try {
        console.log(`Tentando pesquisa web com modelo: ${modelName}...`);
        const geminiModel = genAI.getGenerativeModel({
          model: modelName,
          tools: [searchTool],
        });
        geminiResult = await geminiModel.generateContent(promptPesquisa);
        geminiSuccess = true;
        break; // Funcionou, sai do loop
      } catch (e: any) {
        console.warn(`Erro no modelo ${modelName}:`, e.message);
        lastGeminiError = e;
      }
    }

    if (!geminiSuccess || !geminiResult) {
      throw new Error(`O motor de busca do Google (Gemini) está indisponível no momento após tentar múltiplos modelos. Tente novamente em alguns minutos. Erro: ${lastGeminiError?.message}`);
    }
    const geminiResponse = geminiResult.response;
    const dadosBrutosPesquisa = geminiResponse.text();

    // Extrair fontes usadas (grounding metadata) do Gemini
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidate = geminiResponse.candidates?.[0] as any;
    const groundingMetadata = candidate?.groundingMetadata;
    const fontes = groundingMetadata?.groundingChunks?.map((chunk: { web?: { uri?: string; title?: string } }) => ({
      uri: chunk.web?.uri,
      title: chunk.web?.title,
    })).filter((f: { uri?: string }) => f.uri) || [];

    // =========================================================================
    // STEP 2: OPENAI (AUDITORIA E FORMATAÇÃO)
    // =========================================================================
    const promptMestre = montarPrompt1(dados);

    // Injetamos os dados pesquisados do Gemini no prompt da OpenAI
    const instrucaoOpenAI = `${promptMestre}
    
---
ATENÇÃO - DADOS DE PESQUISA COLETADOS:
Abaixo estão os dados reais coletados da web sobre o médico. 
Baseie a sua análise estritamente nessas informações. Se algo não constar aqui, marque como "não verificável publicamente".

DADOS COLETADOS NA WEB:
${dadosBrutosPesquisa}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.6-sol",
      messages: [{ role: "user", content: instrucaoOpenAI }],
    });

    const relatorioFinal = completion.choices[0].message.content || "";

    return NextResponse.json({
      relatorio: relatorioFinal,
      fontes: fontes,
      dataAuditoria: new Date().toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: `Erro ao gerar relatório: ${mensagem}` },
      { status: 500 }
    );
  }
}
