# CDPDHN: Plataforma de Consulta e Coleta de Dados (front-end PWA de demonstração)

Front-end completo e navegável, instalável como aplicativo (PWA), com **dados 100% fictícios**.
Serve para apresentar e vender o produto antes do back-end existir. Nada sai do aparelho.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173 (sem service worker)
npm test           # 15 testes: schemas, validação, CPF, estatísticas, CSV
npm run build      # gera dist/ com service worker e manifest
npm run preview    # http://localhost:4173 (PWA instalável, funciona offline)
```

Com Docker:

```bash
docker compose up --build   # http://localhost:8080
```

## Roteiro de demonstração (5 minutos)

1. **Entrar**: a árvore se monta. Perfil "Técnica de referência" ou "Coordenação".
2. **Painel**: indicadores dos últimos 6 meses, prioridade, modalidades, vulnerabilidades.
3. **Atendimentos → Novo**: marque *Crianças e adolescentes* + *Situação de rua*.
4. **Ficha**: toque em **Preencher exemplo**, navegue pelas 10 seções, veja campos condicionais
   (ex.: "Como fazer contato com segurança" só aparece se o contato não for seguro).
5. **Menu do usuário → Simular sem internet** e registre: a ficha fica no aparelho.
   Desligue a simulação: ela é enviada sozinha.
6. **Consultar**: abra a ficha; dados sensíveis aparecem mascarados. "Ver dados sensíveis"
   pede o motivo e grava na trilha de auditoria (visível em **Relatórios**).

## Arquitetura

```
src/
  data/
    schemas/*.json     ← os 10 subformulários (JSON Schema 2020-12 + extensões x-ui)
    schema.ts          ← motor: schema → campos, visibilidade condicional, validação, máscaras
    store.ts           ← estado + "API de mentira" (latência simulada, fila offline, auditoria)
    seed.ts            ← gerador determinístico de fichas fictícias relativo à data de hoje
    stats.ts           ← agregações puras (painel e relatórios)
  components/
    Tree3D.tsx         ← árvore 3D procedural em Three.js (sem arquivos 3D)
    FieldRenderer.tsx  ← desenha qualquer campo a partir do schema
    charts.tsx         ← gráficos SVG animados
  pages/               ← Login, Painel, Novo, Ficha, Consultar, Relatórios
```

### Trocar pelos 10 JSON Schemas oficiais

A interface não conhece nenhum campo: ela lê `src/data/schemas/*.json`. Para usar o contrato oficial,
substitua os arquivos mantendo estas extensões:

| Extensão | Uso |
|---|---|
| `x-order` | posição da seção na barra lateral |
| `x-appliesTo` | `["*"]` ou ids de categoria (`criancas`, `situacao_rua`…). Fora delas a seção vira opcional |
| `x-ui.widget` | `textarea`, `radio`, `select`, `checkboxes` (sem isso, o tipo decide) |
| `x-ui.showIf` | `{ "field": "x", "equals": valor }` ou `{ "field": "x", "in": [..] }` |
| `x-ui.sensitive` | campo pessoal sensível: mascarado na consulta, acesso auditado |
| `x-ui.mask` | `cpf` ou `phone` |
| `x-ui.autofill` | `today`, `now`, `user`, `unit`, `code` |

Rode `npm test`: os testes verificam que todo `required` existe em `properties` e que as 10 seções carregam.

### Ligar ao back-end real

Todas as operações estão em `src/data/store.ts` (`login`, `submitDraft`, `syncPending`, `logAccess`)
e já são assíncronas. Trocar o mock por `fetch()` não exige mudar as telas.

## Decisões

- **Fonte Atkinson Hyperlegible** (Braille Institute): distingue 0/O e 1/l/I, essencial para códigos
  como `PR-2026-0381` lidos no celular, sob sol, em campo.
- **Roteamento por hash simples** (`#painel`, `#consultar`): funciona em qualquer hospedagem estática.
- **Gráficos em SVG próprio**: controle total da animação e nenhum peso extra de biblioteca.
- **Três.js carregado sob demanda**: só baixa na tela de entrada e na confirmação de registro.
