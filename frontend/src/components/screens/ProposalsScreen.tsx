import React from 'react';
import { TemplateLibrary } from '../TemplateLibrary';
import { PROPOSAL_TEMPLATES } from '../../templates';

export const ProposalsScreen: React.FC = () => (
  <TemplateLibrary
    kind="proposta"
    titulo="Propostas"
    subtitulo="Escolha um modelo, preencha os campos e salve a sua versão para editar quando quiser."
    templates={PROPOSAL_TEMPLATES}
  />
);
