'use client';

import { useState } from 'react';
import FormularioMedico from '@/components/FormularioMedico';
import RelatorioView from '@/components/RelatorioView';
import BotoesAcao from '@/components/BotoesAcao';
import { DadosMedico } from '@/lib/prompts';

type Fase = 'formulario' | 'carregando' | 'relatorio';

interface ResultadoAuditoria {
  relatorio: string;
  fontes: { uri?: string; title?: string }[];
  dataAuditoria: string;
}

const PASSOS_LOADING = [
  'Buscando médico no Google e resultados orgânicos...',
  'Analisando Perfil da Empresa no Google Maps...',
  'Verificando site oficial e páginas de tratamentos...',
  'Pesquisando Instagram, LinkedIn e redes sociais...',
  'Consultando Doctoralia, BoaConsulta e diretórios médicos...',
  'Auditando CRM, RQE e conformidade CFM...',
  'Avaliando consistência NAP entre plataformas...',
  'Compilando relatório e checklist estratégico...',
];

export default function Home() {
  const [fase, setFase] = useState<Fase>('formulario');
  const [dadosMedico, setDadosMedico] = useState<DadosMedico | null>(null);
  const [resultado, setResultado] = useState<ResultadoAuditoria | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [passoAtual, setPassoAtual] = useState(0);

  const handleSubmit = async (dados: DadosMedico) => {
    setDadosMedico(dados);
    setErro(null);
    setFase('carregando');
    setPassoAtual(0);

    // Anima os passos durante o carregamento
    const intervalo = setInterval(() => {
      setPassoAtual(p => {
        if (p < PASSOS_LOADING.length - 1) return p + 1;
        return p;
      });
    }, 3500);

    // Envia dados do lead para o Webhook (Google Sheets)
    try {
      fetch('https://script.google.com/macros/s/AKfycbzCG8vFieEnHkOd1FE4qdxtJ1zbqU0M7Bsdhwgp9veIJgC5prItF_TgN0a5inBIuVEudA/exec', {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          name: dados.nomeCompleto,
          email: dados.email,
          phone: dados.whatsapp
        })
      }).catch(e => console.error("Erro no fetch do webhook:", e));
    } catch (e) {
      console.error('Erro ao enviar lead para webhook', e);
    }

    try {
      const response = await fetch('/api/gerar-relatorio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });

      const data = await response.json();
      clearInterval(intervalo);

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar relatório');
      }

      setResultado(data);
      setFase('relatorio');
    } catch (err) {
      clearInterval(intervalo);
      const mensagem = err instanceof Error ? err.message : 'Erro desconhecido';
      setErro(mensagem);
      setFase('formulario');
    }
  };

  const handleNovo = () => {
    setFase('formulario');
    setResultado(null);
    setDadosMedico(null);
    setErro(null);
    setPassoAtual(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-wrapper">
      {/* HEADER */}
      <header className="header">
        <div className="header-brand">
          <div className="brand-logo">
            <span className="free">Free</span>
            <span className="doc">Doc$</span>
          </div>
          <div className="brand-tagline">Estratégia e posicionamento médico</div>
        </div>
        <div className="header-badge">Auditoria 2026</div>
      </header>

      {/* HERO — só mostra na fase formulário */}
      {fase === 'formulario' && (
        <section className="hero">
          <div className="hero-eyebrow">✦ Presença Digital Mínima Viável FreeDoc$</div>
          <h1 className="hero-title">
            Auditoria de Presença<br />
            Digital <span>Médica</span>
          </h1>
          <p className="hero-subtitle">
            Pesquisa completa da presença digital do médico em Google, Instagram,
            LinkedIn, Doctoralia, BoaConsulta e mais. Relatório com nota, análise
            de 10 pilares e checklist de ações para os próximos 90 dias.
          </p>
        </section>
      )}

      {/* FASE: FORMULÁRIO */}
      {fase === 'formulario' && (
        <>
          <FormularioMedico
            onSubmit={handleSubmit}
            loading={false}
          />
          {erro && (
            <div className="form-container">
              <div className="error-message">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <div>
                  <strong>Erro ao gerar relatório:</strong><br />
                  {erro}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* FASE: CARREGANDO */}
      {fase === 'carregando' && (
        <div className="loading-overlay">
          <div className="loading-card">
            <div className="loading-icon" />
            <div className="loading-title">
              Auditando presença digital de<br />
              <span style={{ color: 'var(--gold)' }}>{dadosMedico?.nomeCompleto}</span>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '8px' }}>
              Pesquisando em {Math.round(Math.random() * 20 + 60)}+ fontes públicas...
            </p>
            <ul className="loading-steps">
              {PASSOS_LOADING.map((passo, i) => (
                <li
                  key={i}
                  className={`loading-step ${i <= passoAtual ? 'active' : ''}`}
                >
                  <span className="step-dot" />
                  {passo}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* FASE: RELATÓRIO */}
      {fase === 'relatorio' && resultado && dadosMedico && (
        <div className="relatorio-container">
          <div className="relatorio-header">
            <h2>
              Relatório gerado para{' '}
              <span style={{ color: 'var(--gold)' }}>{dadosMedico.nomeCompleto}</span>
            </h2>
            <span className="relatorio-badge">✓ Concluído</span>
          </div>

          {/* BOTÕES DE AÇÃO */}
          <BotoesAcao
            relatorio={resultado.relatorio}
            nomeMedico={dadosMedico.nomeCompleto}
            especialidade={dadosMedico.especialidade}
            cidade={dadosMedico.cidadeUF}
            email={dadosMedico.email}
            whatsapp={dadosMedico.whatsapp}
            onNovo={handleNovo}
          />

          {/* RELATÓRIO PREMIUM */}
          <RelatorioView
            relatorio={resultado.relatorio}
            nomeMedico={dadosMedico.nomeCompleto}
            especialidade={dadosMedico.especialidade}
            dataAuditoria={resultado.dataAuditoria}
            fontes={resultado.fontes}
          />

          {/* FONTES PESQUISADAS */}
          {resultado.fontes && resultado.fontes.length > 0 && (
            <div className="fontes-section">
              <div className="fontes-title">
                🔍 {resultado.fontes.length} fontes consultadas
              </div>
              <ul className="fontes-list">
                {resultado.fontes.slice(0, 15).map((fonte, i) => (
                  <li key={i}>
                    <a href={fonte.uri} target="_blank" rel="noopener noreferrer">
                      ↗ {fonte.title || fonte.uri}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
