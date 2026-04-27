# REFINE FORGE

<p align="left">
  <img src="https://img.shields.io/badge/Next.js-111111?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-111111?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-111111?style=for-the-badge&logo=typescript&logoColor=3178C6" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-111111?style=for-the-badge&logo=tailwindcss&logoColor=38BDF8" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Vercel-111111?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

Aplicação web para análise de lucratividade de refino no Albion, com foco em decisão rápida sobre lote e re-refino.

O projeto foi estruturado como um produto comercial, com interface web e uma camada de cálculo centralizada para manter consistência entre os cenários exibidos ao usuário.

## O que o sistema faz

- Calcula lucro, margem e custo de refino por tier
- Compara cenários com e sem foco
- Estima consumo, retorno e sobra de materiais
- Analisa re-refino a partir de estoque já disponível
- Exibe uma visão prática para apoiar decisão operacional

## Modos disponíveis

- **Por quantidade**: estimativa de compra, gasto e lucro para atingir uma meta de quantidade
- **Por estoque**: estimativa de re-refino a partir de recursos em inventário

## Entradas principais

- Tier do recurso
- Preço do recurso bruto
- Preço do refinado anterior
- Preço de venda do refinado
- Quantidade ou estoque disponível
- Taxa de estação
- Parâmetros de retorno e uso de foco
- Configuração de premium, quando aplicável

## Saídas principais

- Lucro estimado
- Margem estimada
- Receita bruta e líquida
- Custo bruto e custo efetivo
- Compra estimada com re-refino
- Breakdown de materiais por etapa
- Indicadores de viabilidade com e sem foco
- Estimativa de re-refino por estoque

## Estrutura técnica

- **Frontend**: Next.js com App Router
- **Lógica de cálculo**: centralizada em `lib/refino.ts`
- **API**: rotas `POST /api/calculate` e `POST /api/calculate-stock`

## Observações

- A aplicação mantém a lógica de cálculo alinhada entre interface e API.
- O repositório concentra apenas a descrição do produto e sua implementação técnica.
- Por se tratar de uma ferramenta comercial, este README evita instruções operacionais internas desnecessárias.
