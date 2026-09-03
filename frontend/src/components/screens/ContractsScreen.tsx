import React from 'react';
import { TemplateLibrary } from '../TemplateLibrary';
import { CONTRACT_TEMPLATES } from '../../templates';

export const ContractsScreen: React.FC = () => (
  <TemplateLibrary
    kind="contrato"
    titulo="Contratos"
    subtitulo="Modelos jurídicos prontos. Preencha as partes, salve e retome a qualquer momento."
    templates={CONTRACT_TEMPLATES}
  />
);
