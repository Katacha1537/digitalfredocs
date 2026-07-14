'use client';

import React from 'react';

interface Props {
  relatorio: string;
  nomeMedico: string;
  especialidade: string;
  dataAuditoria: string;
}

// ----------------------------------------------------------------------
// FUNÇÕES PARSER E HTML
// ----------------------------------------------------------------------

function extrairNota(texto: string): string {
  const match = texto.match(/(\d{1,3})\/100/);
  return match ? match[1] : '0';
}

function extrairClassificacao(texto: string): string {
  const match = texto.match(/(?:Classificação|qualitativa)[\s:]*([^\n]+)/i);
  return match ? match[1].trim() : 'Presença Digital Avaliada';
}

function markdownParaHTML(md: string): string {
  let html = md
    .replace(/&(?!amp;|lt;|gt;|quot;)/g, '&amp;')
    // Títulos (Subtítulos das seções, como 3.1, 3.2)
    .replace(/^#### (.+)$/gm, '<h4 class="pdf-h4">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="pdf-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="pdf-h2">$1</h2>')
    // Se a IA usar "1. Subtitulo" e não for o cabeçalho mestre
    .replace(/^# (.+)$/gm, '<h1 class="pdf-h1">$1</h1>')
    // Status Chips inline para "Status: Aprovado"
    .replace(/Status:\s*([^\n]+)/gi, (match, p1) => {
      let color = 'amber';
      const s = p1.toLowerCase();
      if (s.includes('não aprov') || s.includes('crítico')) color = 'red';
      else if (s.includes('aprovado com') || s.includes('parcialmente')) color = 'amber';
      else if (s.includes('aprovado')) color = 'green';
      return `<div class="status-chip ${color}">Status: ${p1}</div>`;
    })
    // Formatação
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Callouts (Blockquotes)
    .replace(/^> (.+)$/gm, '<div class="callout gold"><div class="callout-body">$1</div></div>')
    // Listas
    .replace(/^\- (.+)$/gm, '<li class="pdf-li">$1</li>')
    // Tabelas
    .replace(/\|(.+)\|/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim() && !c.match(/^[-\s|]+$/));
      if(cells.length === 0) return '';
      return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
    })
    // Parágrafos
    .replace(/\n\n/g, '</p><p class="pdf-p">')
    .replace(/\n/g, '<br />');

  // Envolve <li> em <ul>
  html = html.replace(/(<li class="pdf-li">.+?<\/li>(\s*<br \/>)*)+/gs, (match) => {
    return `<ul class="pdf-ul">${match.replace(/<br \/>/g, '')}</ul>`;
  });

  // Envolve <tr> em <table>
  html = html.replace(/(<tr>.+?<\/tr>)/gs, (match) => {
    return `<table class="pdf-table">${match}</table>`;
  });
  html = html.replace(/<table class="pdf-table">(<table class="pdf-table">)/g, '$1');
  html = html.replace(/(<\/table>)<\/table>/g, '$1');

  // Ajusta Table thead
  html = html.replace(/<table class="pdf-table"><tr>(<td>.+?<\/td>)+<\/tr>/g, (match) => {
    return match.replace('<tr>', '<thead><tr>').replace('</tr>', '</tr></thead><tbody>') + '</tbody>';
  });
  html = html.replace(/<thead><tr>(.*?)<\/tr><\/thead>/gs, (match, content) => {
    const headers = content.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>');
    return `<thead><tr>${headers}</tr></thead>`;
  });

  // Limpeza de tags soltas
  html = `<p class="pdf-p">${html}</p>`;
  html = html.replace(/<p class="pdf-p">\s*(<h[1-6]>|<ul|<table|<div class="callout|<div class="status-chip)/g, '$1');
  html = html.replace(/(<\/h[1-6]>|<\/ul>|<\/table>|<\/div>)\s*<\/p>/g, '$1');
  html = html.replace(/<p class="pdf-p">\s*(?:<br \/>\s*)+/g, '<p class="pdf-p">');
  html = html.replace(/<p class="pdf-p">\s*<\/p>/g, '');

  return html;
}

// ----------------------------------------------------------------------
// EXTRATOR ROBUSTO DE MÓDULOS
// ----------------------------------------------------------------------
const ALL_MODULES = [
  "DIAGNÓSTICO EXECUTIVO", 
  "RESULTADO POR PILAR", 
  "ANÁLISE DETALHADA", 
  "PÁGINAS INDIVIDUAIS", 
  "CHECKLIST", 
  "SITUAÇÃO FINAL"
];

function extractModuleLines(linhas: string[], keywords: string[]): string[] {
  let inModule = false;
  const content = [];
  
  for(const linha of linhas) {
    const upper = linha.toUpperCase();
    
    // Verifica se a linha atual é o título de QUALQUER módulo mestre
    let isAnyModuleHeader = false;
    // Padrões de cabeçalho comuns gerados pela IA
    if (upper.startsWith('#') || upper.match(/^\d+\./) || upper.includes('SEÇÃO')) {
      if (linha.length < 80) {
        for (const k of ALL_MODULES) {
          if (upper.includes(k)) {
            isAnyModuleHeader = true;
            break;
          }
        }
      }
    }

    if (isAnyModuleHeader) {
      // É o NOSSO módulo?
      let isOurModule = false;
      for (const k of keywords) {
        if (upper.includes(k)) {
          isOurModule = true; 
          break;
        }
      }
      
      if (isOurModule) {
        inModule = true;
        continue; // Pula a linha do título
      } else {
        // Se começou outro módulo, paramos de ler.
        inModule = false;
      }
    }
    
    if (inModule) {
      content.push(linha);
    }
  }
  
  return content;
}

// ----------------------------------------------------------------------
// COMPONENTES PREMIUM (REPORTLAB STYLE)
// ----------------------------------------------------------------------

const PdfPage = ({ children, dark = false, num = '' }: { children: React.ReactNode, dark?: boolean, num?: string }) => (
  <div className={`pdf-page ${dark ? 'pdf-page-dark' : ''}`}>
    {!dark && (
      <div className="pdf-header">
        <div className="pdf-header-text">Auditoria de Presença Digital Mínima</div>
        <div className="pdf-header-text" style={{ textAlign: 'right' }}>Relatório Confidencial</div>
      </div>
    )}
    <div style={{ position: 'relative', zIndex: 10 }}>
      {children}
    </div>
    {!dark && (
      <div className="pdf-footer">
        <div className="pdf-footer-text" style={{ color: '#252A31', fontWeight: 700 }}>FreeDoc$ | Estratégia, posicionamento e crescimento médico</div>
        <div className="pdf-footer-text">{num}</div>
      </div>
    )}
  </div>
);

const DividerPage = ({ num, title, subtitle }: { num: string, title: string, subtitle: string }) => (
  <PdfPage dark>
    <div className="divider-bg-graphite" />
    <div className="divider-bar" />
    <div className="divider-brand"><span className="c-free">Free</span><span className="c-doc">Doc$</span></div>
    <div className="divider-content">
      <div className="divider-num">{num}</div>
      <div className="divider-title">{title}</div>
      <div className="divider-hr" />
      <div className="divider-desc">{subtitle}</div>
    </div>
  </PdfPage>
);

const ScoreCard = ({ score, classificacao }: { score: string, classificacao: string }) => (
  <div className="score-card">
    <div className="sc-box">
      <div className="sc-num">{score}</div>
      <div className="sc-max">/100</div>
    </div>
    <div className="sc-sep" />
    <div className="sc-text">
      <div className="sc-label">NOTA GERAL ESTIMADA</div>
      <div className="sc-desc">{classificacao.replace(/\*/g, '').toUpperCase()}</div>
    </div>
  </div>
);

const Callout = ({ title, body, color = 'gold' }: { title: string, body: string, color?: string }) => (
  <div className={`callout ${color}`}>
    <div className="callout-title">{title}</div>
    <div className="callout-body">{body}</div>
  </div>
);

const PillarBar = ({ label, score, sit }: { label: string, score: number, sit: string }) => {
  const isHigh = score >= 7;
  const isMid = score >= 5 && score < 7;
  const fillClass = isHigh ? 'high' : isMid ? 'mid' : 'low';
  const pct = score * 10;
  
  return (
    <div className="pillar-container">
      <div className="pillar-header">
        <span>{label}</span>
        <span className="pillar-score">{score}/10</span>
      </div>
      <div className="pillar-track">
        <div className={`pillar-fill ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>
      <div style={{ fontSize: '11px', color: '#66717C' }}>{sit}</div>
    </div>
  );
};

// ----------------------------------------------------------------------
// MAIN VIEW
// ----------------------------------------------------------------------

export default function RelatorioView({ relatorio, nomeMedico, especialidade, dataAuditoria }: Props) {
  
  const linhas = relatorio.split('\n');
  const notaGeral = extrairNota(relatorio);
  const classificacaoGeral = extrairClassificacao(relatorio);

  // EXTRAIR OS 6 MÓDULOS DE FORMA RÍGIDA
  const linesDiag = extractModuleLines(linhas, ["DIAGNÓSTICO EXECUTIVO"]);
  const linesPilar = extractModuleLines(linhas, ["RESULTADO POR PILAR"]);
  const linesAnalise = extractModuleLines(linhas, ["ANÁLISE DETALHADA"]);
  const linesPaginas = extractModuleLines(linhas, ["PÁGINAS INDIVIDUAIS", "PÁGINAS", "ARQUITETURA"]);
  const linesChecklist = extractModuleLines(linhas, ["CHECKLIST"]);
  const linesConclusao = extractModuleLines(linhas, ["SITUAÇÃO FINAL"]);

  // Processa as barras de Pilar a partir das linhas do Módulo 2
  const pilares: {label: string, score: number, sit: string}[] = [];
  let inTable = false;
  for (const linha of linesPilar) {
    if (linha.includes('|') && (linha.includes('Pilar') || linha.includes('Nota'))) {
      inTable = true;
      continue;
    }
    if (inTable && linha.includes('---')) continue;
    if (inTable && linha.trim() === '') {
      inTable = false;
      continue;
    }
    if (inTable && linha.includes('|')) {
      const parts = linha.split('|').map(p => p.trim()).filter(p => p);
      if (parts.length >= 3) {
        const scoreMatch = parts[1].match(/\d+/);
        pilares.push({
          label: parts[0],
          score: scoreMatch ? parseInt(scoreMatch[0]) : 0,
          sit: parts[2]
        });
      }
    }
  }

  // Fallback se não tiver tabela parseável
  if (pilares.length === 0 && linesPilar.length > 0) {
     pilares.push({ label: 'Presença Digital', score: parseInt(notaGeral) / 10, sit: 'Análise não extraída' });
  }

  return (
    <div id="relatorio-conteudo">
      
      {/* =========================================
          CAPA PREMIUM
      ========================================= */}
      <PdfPage dark>
        <div className="cover-top">
          <div className="cover-brand"><span className="c-free">Free</span><span className="c-doc">Doc$</span></div>
        </div>
        <div className="cover-body">
          <div className="cover-eyebrow">Auditoria Estratégica</div>
          <div className="cover-title">Presença Digital<br/>Mínima</div>
          <div className="cover-sub">{nomeMedico}</div>
          <div className="cover-meta">{especialidade}</div>
          
          <div style={{ marginTop: '80px' }} />
          <ScoreCard score={notaGeral} classificacao={classificacaoGeral} />
          
          <div style={{ marginTop: '60px' }} />
          <div className="cover-meta">Data da auditoria: {dataAuditoria}</div>
          <div className="cover-meta">Relatório executivo de diagnóstico, consistência, autoridade e conversão.</div>
        </div>
      </PdfPage>

      {/* =========================================
          ESCOPO E SUMÁRIO (TOC)
      ========================================= */}
      <PdfPage num="01">
        <div className="pdf-h1" style={{ marginTop: '30px' }}>Escopo e critérios da auditoria</div>
        <hr style={{ border: 'none', height: '1px', background: 'var(--line)', margin: '20px 0' }} />
        <div className="pdf-caption">Escopo</div>
        <p className="pdf-p">Resultados publicamente indexados no Google, site, Instagram, Google/Maps, LinkedIn, Doctoralia, BoaConsulta e YouTube. Não foram avaliados dados privados, como alcance, tráfego do site, conversão do WhatsApp ou painel interno do Google.</p>
        
        <div style={{ marginTop: '20px' }} />
        <Callout 
          title="LIMITAÇÃO TÉCNICA" 
          body="A análise representa a presença digital pública encontrada na data da auditoria. Métricas internas e painéis privados não foram considerados." 
          color="blue" 
        />
        
        <div style={{ marginTop: '40px' }} />
        <div className="pdf-h2">Leitura executiva do documento</div>
        <table className="pdf-table" style={{ marginTop: '10px' }}>
          <tbody>
            <tr>
              <td><strong style={{ fontSize: '18px', color: 'var(--gold)' }}>01</strong></td>
              <td><strong>Diagnóstico executivo</strong><br/><span style={{ fontSize: '11px', color: 'var(--muted)' }}>Nota, classificação, ativos atuais e diagnóstico central.</span></td>
            </tr>
            <tr>
              <td><strong style={{ fontSize: '18px', color: 'var(--gold)' }}>02</strong></td>
              <td><strong>Resultado por pilar</strong><br/><span style={{ fontSize: '11px', color: 'var(--muted)' }}>Avaliação comparativa de componentes da presença digital.</span></td>
            </tr>
            <tr>
              <td><strong style={{ fontSize: '18px', color: 'var(--gold)' }}>03</strong></td>
              <td><strong>Análise detalhada</strong><br/><span style={{ fontSize: '11px', color: 'var(--muted)' }}>Site, Instagram, Google, Doctoralia, LinkedIn.</span></td>
            </tr>
            <tr>
              <td><strong style={{ fontSize: '18px', color: 'var(--gold)' }}>04</strong></td>
              <td><strong>Páginas individuais</strong><br/><span style={{ fontSize: '11px', color: 'var(--muted)' }}>Arquitetura de aquisição e produtos médicos.</span></td>
            </tr>
            <tr>
              <td><strong style={{ fontSize: '18px', color: 'var(--gold)' }}>05</strong></td>
              <td><strong>Checklist FreeDoc$</strong><br/><span style={{ fontSize: '11px', color: 'var(--muted)' }}>Plano de execução para 7, 30 e 90 dias.</span></td>
            </tr>
            <tr>
              <td><strong style={{ fontSize: '18px', color: 'var(--gold)' }}>06</strong></td>
              <td><strong>Situação final</strong><br/><span style={{ fontSize: '11px', color: 'var(--muted)' }}>Conformidade com a presença digital mínima.</span></td>
            </tr>
          </tbody>
        </table>
      </PdfPage>

      {/* =========================================
          MÓDULO 1: DIAGNÓSTICO EXECUTIVO
      ========================================= */}
      {linesDiag.length > 0 && (
        <React.Fragment>
          <DividerPage num="01" title="Diagnóstico executivo" subtitle="Leitura geral da autoridade, ativos atuais e visão macro da presença digital." />
          <PdfPage num="02">
            <div className="pdf-h1" style={{ marginTop: '30px' }}>Diagnóstico executivo</div>
            <ScoreCard score={notaGeral} classificacao={classificacaoGeral} />
            <div style={{ marginTop: '30px' }} />
            <div 
              className="pdf-markdown-content"
              dangerouslySetInnerHTML={{ __html: markdownParaHTML(linesDiag.join('\n')) }} 
            />
          </PdfPage>
        </React.Fragment>
      )}

      {/* =========================================
          MÓDULO 2: RESULTADO POR PILAR
      ========================================= */}
      {linesPilar.length > 0 && (
        <React.Fragment>
          <DividerPage num="02" title="Resultado por pilar" subtitle="Avaliação comparativa de 10 componentes da presença digital." />
          <PdfPage num="03">
            <div className="pdf-h1" style={{ marginTop: '30px' }}>Resultado por Pilar</div>
            <p className="pdf-p">A leitura abaixo evidencia onde a presença atual já possui base e onde estão os maiores gargalos de execução.</p>
            <div style={{ marginTop: '30px' }} />
            
            {pilares.map((p, i) => (
              <PillarBar key={i} label={p.label} score={p.score} sit={p.sit} />
            ))}

            <div style={{ marginTop: '40px' }} />
            <div 
              className="pdf-markdown-content"
              dangerouslySetInnerHTML={{ __html: markdownParaHTML(linesPilar.join('\n').replace(/\|.*\|/g, '')) }} 
            />
          </PdfPage>
        </React.Fragment>
      )}

      {/* =========================================
          MÓDULO 3: ANÁLISE DETALHADA
      ========================================= */}
      {linesAnalise.length > 0 && (
        <React.Fragment>
          <DividerPage num="03" title="Análise detalhada" subtitle="Avaliação canal a canal, com pontos positivos, riscos e inconsistências." />
          <PdfPage num="04">
            <div className="pdf-h1" style={{ marginTop: '30px' }}>Análise detalhada</div>
            <div 
              className="pdf-markdown-content"
              dangerouslySetInnerHTML={{ __html: markdownParaHTML(linesAnalise.join('\n')) }} 
            />
          </PdfPage>
        </React.Fragment>
      )}

      {/* =========================================
          MÓDULO 4: PÁGINAS INDIVIDUAIS
      ========================================= */}
      {linesPaginas.length > 0 && (
        <React.Fragment>
          <DividerPage num="04" title="Páginas individuais" subtitle="Arquitetura de aquisição e conversão para produtos médicos." />
          <PdfPage num="05">
            <div className="pdf-h1" style={{ marginTop: '30px' }}>Páginas Individuais e Arquitetura</div>
            <div 
              className="pdf-markdown-content"
              dangerouslySetInnerHTML={{ __html: markdownParaHTML(linesPaginas.join('\n')) }} 
            />
          </PdfPage>
        </React.Fragment>
      )}

      {/* =========================================
          MÓDULO 5: CHECKLIST FREEDOC$
      ========================================= */}
      {linesChecklist.length > 0 && (
        <React.Fragment>
          <DividerPage num="05" title="Checklist FreeDoc$" subtitle="Plano de execução estruturado para 7, 30 e 90 dias." />
          <PdfPage num="06">
            <div className="pdf-h1" style={{ marginTop: '30px' }}>Checklist FreeDoc$</div>
            <div 
              className="pdf-markdown-content"
              dangerouslySetInnerHTML={{ __html: markdownParaHTML(linesChecklist.join('\n')) }} 
            />
          </PdfPage>
        </React.Fragment>
      )}

      {/* =========================================
          MÓDULO 6: SITUAÇÃO FINAL
      ========================================= */}
      {linesConclusao.length > 0 && (
        <React.Fragment>
          <DividerPage num="06" title="Situação Final" subtitle="Conclusão sobre a conformidade com a presença digital mínima." />
          <PdfPage num="07">
            <div className="pdf-h1" style={{ marginTop: '30px' }}>Situação Final</div>
            <div 
              className="pdf-markdown-content"
              dangerouslySetInnerHTML={{ __html: markdownParaHTML(linesConclusao.join('\n')) }} 
            />
          </PdfPage>
        </React.Fragment>
      )}

    </div>
  );
}
