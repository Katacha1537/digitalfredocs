'use client';

import { useState } from 'react';
import { DadosMedico } from '@/lib/prompts';

interface Props {
  onSubmit: (dados: DadosMedico) => void;
  loading: boolean;
}

export default function FormularioMedico({ onSubmit, loading }: Props) {
  const [dados, setDados] = useState<DadosMedico>({
    nomeCompleto: '',
    nomeProfissional: '',
    especialidade: '',
    cidadeUF: '',
    crm: '',
    rqe: '',
    clinica: '',
    instagram: '',
    site: '',
    servicos: '',
    email: '',
    whatsapp: '',
  });

  const formatWhatsApp = (value: string) => {
    let onlyNums = value.replace(/\D/g, '');
    if (onlyNums.startsWith('55') && onlyNums.length >= 12) {
      onlyNums = onlyNums.substring(2);
    }
    onlyNums = onlyNums.substring(0, 11);
    
    if (onlyNums.length === 0) return '';
    if (onlyNums.length <= 2) return `(${onlyNums}`;
    if (onlyNums.length <= 3) return `(${onlyNums.substring(0, 2)}) ${onlyNums.substring(2)}`;
    if (onlyNums.length <= 7) return `(${onlyNums.substring(0, 2)}) ${onlyNums.substring(2, 3)} ${onlyNums.substring(3)}`;
    return `(${onlyNums.substring(0, 2)}) ${onlyNums.substring(2, 3)} ${onlyNums.substring(3, 7)}-${onlyNums.substring(7)}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'whatsapp') {
      setDados(prev => ({ ...prev, [name]: formatWhatsApp(value) }));
    } else {
      setDados(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(dados);
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <form onSubmit={handleSubmit}>
          {/* Dados Essenciais */}
          <div className="form-section-title">Dados do Médico</div>

          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">
                Nome completo <span className="required">*</span>
              </label>
              <input
                type="text"
                name="nomeCompleto"
                value={dados.nomeCompleto}
                onChange={handleChange}
                className="form-input"
                placeholder="Ex.: Dr. Bruno Ferreira Ribeiro"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Especialidade <span className="required">*</span>
              </label>
              <input
                type="text"
                name="especialidade"
                value={dados.especialidade}
                onChange={handleChange}
                className="form-input"
                placeholder="Ex.: Nefrologista"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Cidade / Estado <span className="required">*</span>
              </label>
              <input
                type="text"
                name="cidadeUF"
                value={dados.cidadeUF}
                onChange={handleChange}
                className="form-input"
                placeholder="Ex.: Rondonópolis - MT"
                required
              />
            </div>
          </div>

          <div className="form-divider" />

          {/* Contato */}
          <div className="form-section-title">Contato (para receber o relatório e entrar no banco de dados)</div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">
                E-mail <span className="required">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={dados.email}
                onChange={handleChange}
                className="form-input"
                placeholder="email@clinica.com.br"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                WhatsApp <span className="required">*</span>
              </label>
              <input
                type="text"
                name="whatsapp"
                value={dados.whatsapp}
                onChange={handleChange}
                className="form-input"
                placeholder="(66) 9 9999-9999"
                required
                maxLength={16}
              />
              <span className="form-hint">Com DDD, seu telefone estará seguro.</span>
            </div>
          </div>

          <div className="form-divider" />

          {/* Dados Opcionais */}
          <div className="form-section-title">Dados Adicionais (opcional — melhora a busca)</div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">CRM</label>
              <input
                type="text"
                name="crm"
                value={dados.crm}
                onChange={handleChange}
                className="form-input"
                placeholder="Ex.: CRM-MT 7527"
              />
            </div>

            <div className="form-group">
              <label className="form-label">RQE</label>
              <input
                type="text"
                name="rqe"
                value={dados.rqe}
                onChange={handleChange}
                className="form-input"
                placeholder="Ex.: RQE 4808"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Clínica / Instituição</label>
              <input
                type="text"
                name="clinica"
                value={dados.clinica}
                onChange={handleChange}
                className="form-input"
                placeholder="Ex.: Pronefron"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Instagram</label>
              <input
                type="text"
                name="instagram"
                value={dados.instagram}
                onChange={handleChange}
                className="form-input"
                placeholder="@usuario ou Não informado"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Site</label>
              <input
                type="text"
                name="site"
                value={dados.site}
                onChange={handleChange}
                className="form-input"
                placeholder="https://www.site.com.br"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Serviços principais</label>
              <input
                type="text"
                name="servicos"
                value={dados.servicos}
                onChange={handleChange}
                className="form-input"
                placeholder="Ex.: Consulta, Teleconsulta, Exames"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            id="btn-gerar-relatorio"
          >
            {loading ? (
              <>
                <span className="loading-spinner" />
                Pesquisando presença digital...
              </>
            ) : (
              '⚡ Gerar Auditoria de Presença Digital'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
