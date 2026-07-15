import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { montarPrompt1, montarPromptPesquisa, DadosMedico } from '@/lib/prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatarResultadosSerper(serperData: any): string {
  let resultadoText = '';

  if (serperData.knowledgeGraph) {
    const kg = serperData.knowledgeGraph;
    resultadoText += `--- PAINEL DE CONHECIMENTO DO GOOGLE (KNOWLEDGE GRAPH) ---\n`;
    resultadoText += `Título: ${kg.title || ''}\n`;
    resultadoText += `Tipo: ${kg.type || ''}\n`;
    if (kg.description) resultadoText += `Descrição: ${kg.description}\n`;
    if (kg.attributes) {
      for (const [chave, valor] of Object.entries(kg.attributes)) {
        resultadoText += `${chave}: ${valor}\n`;
      }
    }
    resultadoText += `\n`;
  }

  if (serperData.localResults && serperData.localResults.length > 0) {
    resultadoText += `--- RESULTADOS LOCAIS / GOOGLE MAPS ---\n`;
    for (const local of serperData.localResults) {
      resultadoText += `Nome da Clínica/Consultório: ${local.title || ''}\n`;
      resultadoText += `Endereço: ${local.address || ''}\n`;
      if (local.phoneNumber) resultadoText += `Telefone: ${local.phoneNumber}\n`;
      if (local.website) resultadoText += `Website cadastrado: ${local.website}\n`;
      resultadoText += `Avaliação Média: ${local.rating || 'Sem avaliações'} (${local.ratingCount || 0} avaliações)\n`;
      resultadoText += `\n`;
    }
  }

  if (serperData.organic && serperData.organic.length > 0) {
    resultadoText += `--- RESULTADOS ORGÂNICOS DE PESQUISA ---\n`;
    for (const item of serperData.organic) {
      resultadoText += `Título: ${item.title || ''}\n`;
      resultadoText += `Link: ${item.link || ''}\n`;
      resultadoText += `Resumo: ${item.snippet || ''}\n`;
      resultadoText += `\n`;
    }
  }

  return resultadoText || 'Nenhum resultado relevante encontrado na pesquisa do Google.';
}

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
    // STEP 1: PESQUISA WEB / OSINT (SERPER.DEV COM FALLBACK PARA GEMINI NATIVO)
    // =========================================================================
    let dadosBrutosPesquisa = '';
    let fontes: { uri: string; title: string }[] = [];
    const queryBusca = `"${dados.nomeCompleto}" "${dados.especialidade}" "${dados.cidadeUF}"`;
    const modelosGemini = ['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-2.0-pro-exp-02-05', 'gemini-1.5-flash'];

    // 1. Tentar Pesquisa via Serper.dev
    if (process.env.SERPER_API_KEY) {
      try {
        console.log(`Iniciando busca com Serper.dev para: ${queryBusca}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

        const serperRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': process.env.SERPER_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: queryBusca,
            gl: 'br',
            hl: 'pt-br',
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!serperRes.ok) {
          throw new Error(`Erro na API do Serper: Status ${serperRes.status}`);
        }

        const serperData = await serperRes.json();
        const dadosBrutosSerper = formatarResultadosSerper(serperData);

        // Extrair fontes
        const fontesSerper: { uri: string; title: string }[] = [];
        if (serperData.localResults) {
          for (const local of serperData.localResults) {
            if (local.website) {
              fontesSerper.push({ uri: local.website, title: `${local.title || 'Clínica'} (Website)` });
            }
          }
        }
        if (serperData.organic) {
          for (const item of serperData.organic) {
            if (item.link) {
              fontesSerper.push({ uri: item.link, title: item.title || item.link });
            }
          }
        }
        
        fontes = fontesSerper.filter((f, index, self) =>
          self.findIndex(t => t.uri === f.uri) === index
        );

        // Compilar resultados com Gemini (sem a ferramenta de pesquisa local)
        const promptCompilacao = `Você é um pesquisador especialista em OSINT (Open Source Intelligence) focado em marketing e presença digital médica.
Analise os resultados brutos da busca do Google abaixo e retorne um relatório super detalhado e consolidado de dados brutos sobre a presença online do médico.
Foque em extrair links, dados de perfil, quantidade de avaliações, informações de contato (NAP), descrições de biografia, existência de site e serviços prestados.

IMPORTANTE: 
1. Não invente nenhuma informação. Apenas consolide o que está nos resultados.
2. Para evitar bloqueios de cópia (recitation), NÃO copie e cole parágrafos inteiros ou biografias exatas dos sites. Sempre RESUMA e PARAFRASEE as informações com as suas próprias palavras.

MÉDICO A SER PESQUISADO:
- Nome completo: ${dados.nomeCompleto}
- Especialidade: ${dados.especialidade}
- Cidade/Estado: ${dados.cidadeUF}
- CRM: ${dados.crm || 'Não informado'}
- Instagram: ${dados.instagram || 'Não informado'}
- Clínica: ${dados.clinica || 'Não informado'}

RESULTADOS BRUTOS DA PESQUISA NO GOOGLE:
${dadosBrutosSerper}
`;

        let compilationResult;
        let compilationSuccess = false;
        let lastCompilationError = null;

        for (const modelName of modelosGemini) {
          try {
            console.log(`Compilando dados do Serper com modelo: ${modelName}...`);
            const geminiModel = genAI.getGenerativeModel({ model: modelName });
            compilationResult = await geminiModel.generateContent(promptCompilacao);
            compilationSuccess = true;
            break;
          } catch (e: any) {
            console.warn(`Erro na compilação do Serper com modelo ${modelName}:`, e.message);
            lastCompilationError = e;
          }
        }

        if (!compilationSuccess || !compilationResult) {
          throw new Error(`Falha ao compilar dados do Serper com Gemini: ${lastCompilationError?.message}`);
        }

        dadosBrutosPesquisa = compilationResult.response.text();
        console.log('Busca e compilação via Serper.dev concluídas com sucesso!');

      } catch (err: any) {
        console.error('Falha no fluxo do Serper.dev, acionando fallback nativo do Gemini. Erro:', err.message);
      }
    } else {
      console.log('SERPER_API_KEY não configurada. Usando busca nativa do Gemini diretamente.');
    }

    // 2. Fallback: Usar busca nativa do Gemini (Search Grounding) se o Serper falhou ou não está configurado
    if (!dadosBrutosPesquisa) {
      console.log('Iniciando busca nativa do Gemini (Search Grounding)...');
      const promptPesquisa = montarPromptPesquisa(dados);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const searchTool: any = { googleSearch: {} };
      let geminiResult;
      let geminiSuccess = false;
      let lastGeminiError = null;

      for (const modelName of modelosGemini) {
        try {
          console.log(`Tentando pesquisa web com modelo nativo: ${modelName}...`);
          const geminiModel = genAI.getGenerativeModel({
            model: modelName,
            tools: [searchTool],
          });
          geminiResult = await geminiModel.generateContent(promptPesquisa);
          geminiSuccess = true;
          break; // Funcionou, sai do loop
        } catch (e: any) {
          console.warn(`Erro no modelo nativo ${modelName}:`, e.message);
          lastGeminiError = e;
        }
      }

      if (!geminiSuccess || !geminiResult) {
        throw new Error(`O motor de busca do Google (Gemini) está indisponível no momento após tentar múltiplos modelos. Tente novamente em alguns minutos. Erro: ${lastGeminiError?.message}`);
      }

      const geminiResponse = geminiResult.response;
      dadosBrutosPesquisa = geminiResponse.text();

      // Extrair fontes usadas (grounding metadata) do Gemini
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const candidate = geminiResponse.candidates?.[0] as any;
      const groundingMetadata = candidate?.groundingMetadata;
      const fontesNativas = groundingMetadata?.groundingChunks?.map((chunk: { web?: { uri?: string; title?: string } }) => ({
        uri: chunk.web?.uri,
        title: chunk.web?.title,
      })).filter((f: { uri?: string }) => f.uri) || [];

      fontes = fontesNativas;
      console.log('Busca nativa do Gemini concluída com sucesso!');
    }

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
