'use client';

import { useState } from 'react';
import { gerarPDF, gerarTextoEmail, gerarTextoWhatsApp } from '@/lib/pdf-generator';

interface Props {
  relatorio: string;
  nomeMedico: string;
  especialidade: string;
  cidade: string;
  email: string;
  whatsapp: string;
  onNovo: () => void;
}

export default function BotoesAcao({ relatorio, nomeMedico, especialidade, cidade, email, whatsapp, onNovo }: Props) {
  const [gerando, setGerando] = useState(false);

  const handleDownloadPDF = async () => {
    setGerando(true);
    try {
      await gerarPDF('relatorio-conteudo', nomeMedico, especialidade);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setGerando(false);
    }
  };



  return (
    <div className="acoes-bar">


      {/* Download PDF */}
      <button
        className="btn-acao btn-acao-pdf"
        onClick={handleDownloadPDF}
        disabled={gerando}
        id="btn-baixar-pdf"
      >
        {gerando ? (
          <>
            <span className="loading-spinner" style={{ borderColor: 'rgba(199,162,91,0.3)', borderTopColor: 'var(--gold)' }} />
            Gerando PDF...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Baixar PDF
          </>
        )}
      </button>

      {/* Nova Auditoria */}
      <button
        className="btn-acao btn-acao-novo"
        onClick={onNovo}
        id="btn-nova-auditoria"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10"/>
          <path d="M3.51 15a9 9 0 1 0 .49-3.01"/>
        </svg>
        Nova Auditoria
      </button>
    </div>
  );
}
