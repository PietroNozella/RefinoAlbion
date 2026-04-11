# Refino Albion — calculadora

Lógica em Python (`calculator.py`, `recipes.py`, `formatting.py`). Interface web com **Next.js**; API serverless em **`api/calculate.py`** na Vercel.

## Desenvolvimento

### Só interface Next (sem API Python local)

```bash
npm install
npm run dev
```

`POST /api/calculate` não roda com `next dev` sozinho. Use o fluxo abaixo para testar o cálculo end-to-end.

### Next + API Python (recomendado)

```bash
npm install
npx vercel dev
```

Abre o URL indicado no terminal (front + functions Python).

### Streamlit (legado / local)

```bash
pip install -r requirements-dev.txt
streamlit run streamlit_app.py
```

## Deploy na Vercel

1. Conecte o repositório na [Vercel](https://vercel.com).
2. Framework: **Next.js** (deteção automática via `package.json`).
3. Build: `npm run build`; output: `.next` (padrão).
4. A função Python em `api/calculate.py` é empacotada com `requirements.txt` na raiz.

Variáveis de ambiente não são obrigatórias para esta calculadora.

## Estrutura

| Caminho | Função |
|--------|--------|
| `app/` | App Router Next.js |
| `api/calculate.py` | `POST /api/calculate` (JSON) |
| `calculator.py` | Núcleo do lucro/margem |
