# Refino Albion — calculadora

- **Python:** `calculator.py`, `recipes.py`, `formatting.py` — usados pelo Streamlit e como referência.
- **Web (Vercel):** Next.js em `app/`; `**POST /api/calculate`** em `[app/api/calculate/route.ts](app/api/calculate/route.ts)`, com a mesma matemática em `[lib/refino.ts](lib/refino.ts)` (manter alinhado ao Python).

## Desenvolvimento

```bash
npm install
npm run dev
```

Abre o front e a rota `/api/calculate` no mesmo servidor (Node).

### Streamlit (local)

```bash
pip install -r requirements-dev.txt
streamlit run streamlit_app.py
```

### CLI Python (opcional)

```bash
python cli.py
```

## Deploy na Vercel

1. Ligue o repositório na [Vercel](https://vercel.com).
2. Framework: **Next.js** (deteção automática).
3. Build: `npm run build`.

Não há `requirements.txt` na raiz de propósito: evita que a Vercel trate o repo como app Python. O deploy é só Next.js (`npm run build`).

Variáveis de ambiente não são obrigatórias.

## Estrutura


| Caminho         | Função                                 |
| --------------- | -------------------------------------- |
| `app/`          | App Router (UI + `app/api/calculate`)  |
| `lib/refino.ts` | Lógica espelhada para a API Node       |
| `calculator.py` | Núcleo Python (Streamlit / referência) |


