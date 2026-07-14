'use client';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function gerarPDF(
  elementoId: string,
  nomeMedico: string,
  especialidade: string
): Promise<void> {
  const elemento = document.getElementById(elementoId);
  if (!elemento) {
    throw new Error('Elemento do relatório não encontrado');
  }

  // Salvar estilos originais
  const originalStyle = elemento.style.cssText;
  
  // Preparar elemento para captura
  elemento.style.width = '900px';
  elemento.style.maxWidth = '900px';
  elemento.style.overflow = 'visible';
  elemento.style.height = 'auto';

  try {
    const canvas = await html2canvas(elemento, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#F7F6F3',
      windowWidth: 900,
      scrollY: 0,
    });

    // Restaurar estilos
    elemento.style.cssText = originalStyle;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210; // A4 mm
    const pageHeight = 297; // A4 mm
    const margin = 0;
    const contentWidth = pageWidth - 2 * margin;

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgWidth / imgHeight;
    
    const pdfImgWidth = contentWidth;
    const pdfImgHeight = pdfImgWidth / ratio;
    
    // Número de páginas
    const totalPages = Math.ceil(pdfImgHeight / pageHeight);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();
      
      const yOffset = -page * pageHeight;
      pdf.addImage(imgData, 'JPEG', margin, yOffset, pdfImgWidth, pdfImgHeight);
    }

    // Metadados do PDF
    pdf.setProperties({
      title: `Auditoria de Presença Digital — ${nomeMedico}`,
      subject: `Relatório FreeDoc$ — ${especialidade}`,
      author: 'FreeDoc$ — Estratégia e posicionamento médico',
      creator: 'FreeDoc$ Platform',
    });

    // Nome do arquivo
    const nomeArquivo = `FreeDocs_Auditoria_${nomeMedico.replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`;
    pdf.save(nomeArquivo);
  } catch (error) {
    // Restaurar estilos em caso de erro
    elemento.style.cssText = originalStyle;
    throw error;
  }
}

export function gerarTextoEmail(nomeMedico: string, especialidade: string, cidade: string, relatorio: string): string {
  // Extrair nota do relatório se disponível
  const notaMatch = relatorio.match(/(\d{1,3})\/100/);
  const nota = notaMatch ? notaMatch[1] : '—';
  
  // Extrair diagnóstico central (primeiros 300 chars após "Diagnóstico Executivo")
  const diagMatch = relatorio.match(/DIAGNÓSTICO EXECUTIVO[\s\S]{0,50}\n([\s\S]{100,400})/i);
  const diag = diagMatch ? diagMatch[1].substring(0, 300).trim() + '...' : '';

  return `Olá,

Segue o resumo executivo da sua Auditoria de Presença Digital Mínima FreeDoc$ 2026.

📋 MÉDICO: ${nomeMedico}
🩺 ESPECIALIDADE: ${especialidade}
📍 CIDADE: ${cidade}
📊 NOTA GERAL: ${nota}/100

${diag ? `DIAGNÓSTICO EXECUTIVO:\n${diag}\n\n` : ''}Para acessar o relatório completo com análise detalhada, checklist de ações e plano de 90 dias, baixe o PDF em anexo ou acesse a plataforma FreeDoc$.

---
FreeDoc$ | Estratégia, posicionamento e crescimento médico`;
}

export function gerarTextoWhatsApp(nomeMedico: string, especialidade: string, cidade: string, relatorio: string): string {
  const notaMatch = relatorio.match(/(\d{1,3})\/100/);
  const nota = notaMatch ? notaMatch[1] : '—';

  return `*🏥 Auditoria de Presença Digital FreeDoc$ 2026*

*Médico:* ${nomeMedico}
*Especialidade:* ${especialidade}
*Cidade:* ${cidade}
*Nota geral:* ${nota}/100

Seu relatório completo de auditoria digital foi gerado! Ele inclui análise de 10 pilares da sua presença digital, checklist de ações imediatas e plano estratégico para os próximos 90 dias.

_FreeDoc$ | Estratégia e posicionamento médico_`;
}
