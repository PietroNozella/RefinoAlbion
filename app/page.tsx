"use client";

import { useCallback, useState } from "react";

const TIER_OPTIONS = ["T3", "T4", "T5", "T6", "T7", "T8"];

type ApiResultado = {
  tier: string;
  quantidade: number;
  custo_bruto: number;
  custo_liquido: number;
  receita_bruta: number;
  receita_liquida: number;
  lucro: number;
  margem: number;
};

type ApiResponse = {
  resultado: ApiResultado;
  comprar: {
    qtd_bruto: number;
    qtd_ref_anterior: number;
    label_ref_anterior: string;
    tier_bruto_label: string;
  };
  formatted: {
    lucro: string;
    margem: string;
    custo_bruto: string;
    custo_liquido: string;
    receita_bruta: string;
    receita_liquida: string;
  };
};

export default function Home() {
  const [tier, setTier] = useState("T5");
  const [precoBruto, setPrecoBruto] = useState("");
  const [precoRefAnt, setPrecoRefAnt] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [usarFoco, setUsarFoco] = useState(false);
  const [premium, setPremium] = useState(true);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    precoBruto.trim() !== "" &&
    precoRefAnt.trim() !== "" &&
    precoVenda.trim() !== "" &&
    quantidade.trim() !== "";

  const runCalc = useCallback(async () => {
    setError(null);
    setData(null);
    if (!canSubmit) {
      setError("Preencha preços e quantidade.");
      return;
    }
    const pb = Number(precoBruto);
    const pra = Number(precoRefAnt);
    const pv = Number(precoVenda);
    const q = Number(quantidade);
    if ([pb, pra, pv, q].some((n) => Number.isNaN(n))) {
      setError("Use apenas números válidos.");
      return;
    }
    if (q < 1 || !Number.isInteger(q)) {
      setError("Quantidade deve ser um inteiro ≥ 1.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          preco_bruto: pb,
          preco_refinado_anterior: pra,
          preco_venda_refinado: pv,
          quantidade: q,
          usar_foco: usarFoco,
          premium,
        }),
      });
      let json: (ApiResponse & { error?: string }) | null = null;
      try {
        json = (await res.json()) as ApiResponse & { error?: string };
      } catch {
        setError(`Resposta inválida (${res.status}).`);
        return;
      }
      if (!json) return;
      if (!res.ok) {
        setError(json.error ?? `Erro ${res.status}`);
        return;
      }
      if ("error" in json && json.error) {
        setError(json.error);
        return;
      }
      setData(json as ApiResponse);
    } catch {
      setError("Não foi possível chamar a API.");
    } finally {
      setLoading(false);
    }
  }, [
    canSubmit,
    tier,
    precoBruto,
    precoRefAnt,
    precoVenda,
    quantidade,
    usarFoco,
    premium,
  ]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-8 px-4 py-10">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Calculadora de Refino — Albion Online
        </h1>
        <p className="text-sm text-zinc-400">Lucro e margem por lote refinado.</p>
      </header>

      <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-xl">
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Tier
          </span>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-emerald-500/40 focus:border-emerald-600 focus:ring-2"
          >
            {TIER_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Preço recurso bruto"
            value={precoBruto}
            onChange={setPrecoBruto}
            inputMode="decimal"
          />
          <Field
            label="Preço refinado anterior"
            value={precoRefAnt}
            onChange={setPrecoRefAnt}
            inputMode="decimal"
          />
          <Field
            label="Valor produto refinado"
            value={precoVenda}
            onChange={setPrecoVenda}
            inputMode="decimal"
          />
          <Field
            label="Quantidade (refinado desejado)"
            value={quantidade}
            onChange={setQuantidade}
            inputMode="numeric"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={usarFoco}
              onChange={(e) => setUsarFoco(e.target.checked)}
              className="size-4 rounded border-zinc-600 bg-zinc-900 text-emerald-600 focus:ring-emerald-500"
            />
            Usar foco (retorno 54%)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={premium}
              onChange={(e) => setPremium(e.target.checked)}
              className="size-4 rounded border-zinc-600 bg-zinc-900 text-emerald-600 focus:ring-emerald-500"
            />
            Premium (taxa mercado 6,5%)
          </label>
        </div>

        <button
          type="button"
          onClick={runCalc}
          disabled={loading || !canSubmit}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Calculando…" : "Calcular"}
        </button>

        {!canSubmit && (
          <p className="text-center text-sm text-zinc-500">
            Preencha preços e quantidade para ver o resultado.
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
      </section>

      {data && (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-medium text-white">Comprar</h2>
            <div className="grid grid-cols-2 gap-3">
              <Metric
                label={data.comprar.tier_bruto_label}
                value={String(data.comprar.qtd_bruto)}
              />
              <Metric
                label={data.comprar.label_ref_anterior}
                value={String(data.comprar.qtd_ref_anterior)}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-white">Resultado</h2>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Lucro" value={data.formatted.lucro} accent />
              <Metric label="Margem" value={data.formatted.margem} accent />
            </div>
            <p className="text-sm text-zinc-400">
              <span className="text-zinc-300">Tier:</span>{" "}
              {data.resultado.tier}
              <span className="mx-2 text-zinc-600">·</span>
              <span className="text-zinc-300">Quantidade:</span>{" "}
              {data.resultado.quantidade}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
                <Row label="Custo bruto" value={data.formatted.custo_bruto} />
                <Row
                  label="Custo após retorno"
                  value={data.formatted.custo_liquido}
                />
              </div>
              <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
                <Row
                  label="Receita bruta"
                  value={data.formatted.receita_bruta}
                />
                <Row
                  label="Receita líquida"
                  value={data.formatted.receita_liquida}
                />
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "decimal" | "numeric";
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/40"
        placeholder="—"
      />
    </label>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-3 ${
        accent
          ? "border-emerald-800/60 bg-emerald-950/30"
          : "border-zinc-800 bg-zinc-900/40"
      }`}
    >
      <p className="text-xs text-zinc-500">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold tabular-nums ${accent ? "text-emerald-400" : "text-zinc-100"}`}
      >
        {value}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="tabular-nums text-zinc-200">{value}</span>
    </div>
  );
}
