"use client";

import { useCallback, useState } from "react";

const TIER_OPTIONS = ["T3", "T4", "T5", "T6", "T7", "T8"];
const DEFAULT_RETORNO_SEM_FOCO = "36.71";
const DEFAULT_RETORNO_COM_FOCO = "54";

function productionBonusFromReturnPercent(returnPercent: number): number {
  const returnRate = returnPercent / 100;
  return (1 / (1 - returnRate) - 1) * 100;
}

type ApiResultado = {
  tier: string;
  quantidade: number;
  custo_bruto: number;
  custo_liquido: number;
  materiais: ApiMaterial[];
  taxa_estacao: number;
  receita_bruta: number;
  receita_liquida: number;
  lucro: number;
  margem: number;
};

type ApiResponse = {
  resultado: {
    without_focus: ApiResultado;
    with_focus: ApiResultado;
    extra_profit_from_focus: number;
    focus_cost_per_item: number;
    total_focus_spent: number;
    silver_per_focus: number;
  };
  comprar: {
    qtd_bruto: number;
    qtd_ref_anterior: number;
    label_ref_anterior: string;
    tier_bruto_label: string;
  };
  formatted: {
    without_focus: ApiResultadoFormatado;
    with_focus: ApiResultadoFormatado;
    extra_profit_from_focus: string;
    focus_cost_per_item: string;
    total_focus_spent: string;
    silver_per_focus: string;
    focus_status: string;
  };
};

type ApiResultadoFormatado = {
  lucro: string;
  margem: string;
  custo_bruto: string;
  custo_liquido: string;
  materiais: ApiMaterialFormatado[];
  taxa_estacao: string;
  receita_bruta: string;
  receita_liquida: string;
};

type ApiMaterial = {
  tipo: "raw" | "previous";
  quantidade_por_item: number;
  quantidade_necessaria: number;
  preco_unitario: number;
  custo_bruto: number;
  quantidade_retornada: number;
  quantidade_consumida: number;
  custo_efetivo: number;
};

type ApiMaterialFormatado = {
  tipo: "raw" | "previous";
  label: string;
  quantidade_necessaria: string;
  preco_unitario: string;
  custo_bruto: string;
  quantidade_retornada: string;
  quantidade_consumida: string;
  custo_efetivo: string;
};

type ApiResultadoEstoque = {
  tier: string;
  total_refinado: number;
  total_refinado_estimado: number;
  crafts_estimados: number;
  retorno_total_bruto: number;
  retorno_total_ref_anterior: number;
  consumo_efetivo_bruto: number;
  consumo_efetivo_ref_anterior: number;
  sobra_bruto_estimado: number;
  sobra_ref_anterior_estimado: number;
  valor_sobra_bruto: number;
  valor_sobra_ref_anterior: number;
  valor_sobra: number;
  valor_total_estoque: number;
  custo_inicial: number;
  custo_consumido: number;
  taxa_estacao: number;
  receita_bruta: number;
  receita_liquida: number;
  lucro: number;
  margem: number;
  lucro_sobre_estoque_total: number;
  margem_sobre_estoque_total: number;
};

type ApiResponseEstoque = {
  resultado: ApiResultadoEstoque;
  comprar: {
    estoque_bruto_inicial: number;
    estoque_ref_anterior_inicial: number;
    label_ref_anterior: string;
    tier_bruto_label: string;
  };
  formatted: {
    lucro: string;
    margem: string;
    lucro_sobre_estoque_total: string;
    margem_sobre_estoque_total: string;
    valor_total_estoque: string;
    custo_inicial: string;
    custo_consumido: string;
    taxa_estacao: string;
    receita_bruta: string;
    receita_liquida: string;
    total_refinado_estimado: string;
    crafts_estimados: string;
    retorno_total_bruto: string;
    retorno_total_ref_anterior: string;
    consumo_efetivo_bruto: string;
    consumo_efetivo_ref_anterior: string;
    sobra_bruto_estimado: string;
    sobra_ref_anterior_estimado: string;
    valor_sobra_bruto: string;
    valor_sobra_ref_anterior: string;
    valor_sobra: string;
  };
};

type Modo = "lote" | "estoque";

export default function Home() {
  const [modo, setModo] = useState<Modo>("lote");
  const [tier, setTier] = useState("T5");
  const [precoBruto, setPrecoBruto] = useState("");
  const [precoRefAnt, setPrecoRefAnt] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  const [taxaEstacao, setTaxaEstacao] = useState("");
  const [custoBaseFoco, setCustoBaseFoco] = useState("");
  const [eficienciaFoco, setEficienciaFoco] = useState("");
  const [retornoSemFoco, setRetornoSemFoco] = useState(
    DEFAULT_RETORNO_SEM_FOCO,
  );
  const [retornoComFoco, setRetornoComFoco] = useState(
    DEFAULT_RETORNO_COM_FOCO,
  );
  const [quantidade, setQuantidade] = useState("");
  const [estoqueBruto, setEstoqueBruto] = useState("");
  const [estoqueRefAnt, setEstoqueRefAnt] = useState("");
  const [usarFoco, setUsarFoco] = useState(false);
  const [premium, setPremium] = useState(true);
  const [mostrarAvancado, setMostrarAvancado] = useState(false);

  const [data, setData] = useState<ApiResponse | ApiResponseEstoque | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setModoSafe = (m: Modo) => {
    setModo(m);
    setData(null);
    setError(null);
  };

  const canSubmitLote =
    precoBruto.trim() !== "" &&
    precoRefAnt.trim() !== "" &&
    precoVenda.trim() !== "" &&
    quantidade.trim() !== "";

  const canSubmitEstoque =
    precoBruto.trim() !== "" &&
    precoRefAnt.trim() !== "" &&
    precoVenda.trim() !== "" &&
    (estoqueBruto.trim() !== "" || estoqueRefAnt.trim() !== "");

  const runCalc = useCallback(async () => {
    setError(null);
    setData(null);
    if (!canSubmitLote) {
      setError("Preencha preços e quantidade.");
      return;
    }
    const pb = Number(precoBruto);
    const pra = Number(precoRefAnt);
    const pv = Number(precoVenda);
    const te = Number(taxaEstacao.trim() === "" ? "0" : taxaEstacao);
    const cbf = Number(custoBaseFoco.trim() === "" ? "0" : custoBaseFoco);
    const ef = Number(eficienciaFoco.trim() === "" ? "0" : eficienciaFoco);
    const rsf = Number(
      retornoSemFoco.trim() === "" ? DEFAULT_RETORNO_SEM_FOCO : retornoSemFoco,
    );
    const rcf = Number(
      retornoComFoco.trim() === "" ? DEFAULT_RETORNO_COM_FOCO : retornoComFoco,
    );
    const q = Number(quantidade);
    if ([pb, pra, pv, te, cbf, ef, rsf, rcf, q].some((n) => Number.isNaN(n))) {
      setError("Use apenas números válidos.");
      return;
    }
    if (te < 0) {
      setError("Taxa da estaÃ§Ã£o deve ser um nÃºmero â‰¥ 0.");
      return;
    }
    if (cbf < 0 || ef < 0) {
      setError("Custo base e eficiencia de foco devem ser numeros >= 0.");
      return;
    }
    if (rsf < 0 || rcf < 0 || rsf >= 100 || rcf >= 100) {
      setError("Retorno de materiais deve ser um percentual entre 0 e 99,99.");
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
          station_fee_per_item: te,
          base_focus_cost: cbf,
          focus_efficiency: ef,
          production_bonus_without_focus: productionBonusFromReturnPercent(rsf),
          production_bonus_with_focus: productionBonusFromReturnPercent(rcf),
          quantidade: q,
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
    canSubmitLote,
    tier,
    precoBruto,
    precoRefAnt,
    precoVenda,
    taxaEstacao,
    custoBaseFoco,
    eficienciaFoco,
    retornoSemFoco,
    retornoComFoco,
    quantidade,
    premium,
  ]);

  const runCalcEstoque = useCallback(async () => {
    setError(null);
    setData(null);
    if (!canSubmitEstoque) {
      setError("Preencha preços e estoques (pelo menos um recurso).");
      return;
    }
    const pb = Number(precoBruto);
    const pra = Number(precoRefAnt);
    const pv = Number(precoVenda);
    const te = Number(taxaEstacao.trim() === "" ? "0" : taxaEstacao);
    const eb = Math.trunc(Number(estoqueBruto === "" ? "0" : estoqueBruto));
    const er = Math.trunc(Number(estoqueRefAnt === "" ? "0" : estoqueRefAnt));
    if ([pb, pra, pv, te].some((n) => Number.isNaN(n))) {
      setError("Use apenas números válidos nos preços.");
      return;
    }
    if (te < 0) {
      setError("Taxa da estaÃ§Ã£o deve ser um nÃºmero â‰¥ 0.");
      return;
    }
    if (Number.isNaN(eb) || Number.isNaN(er) || eb < 0 || er < 0) {
      setError("Estoques devem ser inteiros ≥ 0.");
      return;
    }
    if (eb === 0 && er === 0) {
      setError("Informe estoque bruto ou refinado anterior (pelo menos um > 0).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/calculate-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          estoque_bruto: eb,
          estoque_ref_anterior: er,
          preco_bruto: pb,
          preco_refinado_anterior: pra,
          preco_venda_refinado: pv,
          station_fee_per_item: te,
          usar_foco: usarFoco,
          premium,
        }),
      });
      let json: (ApiResponseEstoque & { error?: string }) | null = null;
      try {
        json = (await res.json()) as ApiResponseEstoque & { error?: string };
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
      setData(json as ApiResponseEstoque);
    } catch {
      setError("Não foi possível chamar a API.");
    } finally {
      setLoading(false);
    }
  }, [
    canSubmitEstoque,
    tier,
    precoBruto,
    precoRefAnt,
    precoVenda,
    taxaEstacao,
    estoqueBruto,
    estoqueRefAnt,
    usarFoco,
    premium,
  ]);

  const onCalcular = () => {
    if (modo === "lote") runCalc();
    else runCalcEstoque();
  };

  const canSubmit = modo === "lote" ? canSubmitLote : canSubmitEstoque;

  const isDataLote = (
    d: ApiResponse | ApiResponseEstoque,
  ): d is ApiResponse => "qtd_bruto" in d.comprar;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-8 px-4 py-10">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Calculadora de Refino — Albion Online
        </h1>
        <p className="text-sm text-zinc-400">Lucro e margem por lote refinado.</p>
      </header>

      <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-xl">
        <div className="flex rounded-lg border border-zinc-700 bg-zinc-950/80 p-1">
          <button
            type="button"
            onClick={() => setModoSafe("lote")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              modo === "lote"
                ? "bg-emerald-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Por quantidade
          </button>
          <button
            type="button"
            onClick={() => setModoSafe("estoque")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              modo === "estoque"
                ? "bg-emerald-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Por estoque (re-refino)
          </button>
        </div>

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
          {modo === "lote" ? (
            <Field
              label="Quantidade (refinado desejado)"
              value={quantidade}
              onChange={setQuantidade}
              inputMode="numeric"
            />
          ) : (
            <>
              <Field
                label="Estoque bruto (inicial)"
                value={estoqueBruto}
                onChange={setEstoqueBruto}
                inputMode="numeric"
              />
              <Field
                label="Estoque refinado anterior (inicial)"
                value={estoqueRefAnt}
                onChange={setEstoqueRefAnt}
                inputMode="numeric"
              />
            </>
          )}
        </div>

        <details
          open={mostrarAvancado}
          onToggle={(event) => setMostrarAvancado(event.currentTarget.open)}
          className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"
        >
          <summary className="cursor-pointer text-sm font-medium text-zinc-200">
            Avancado
          </summary>
          <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2">
            {modo === "lote" && (
              <>
                <Field
                  label="Retorno sem foco (%)"
                  value={retornoSemFoco}
                  onChange={setRetornoSemFoco}
                  inputMode="decimal"
                />
                <Field
                  label="Retorno com foco (%)"
                  value={retornoComFoco}
                  onChange={setRetornoComFoco}
                  inputMode="decimal"
                />
                <Field
                  label="Custo base de foco"
                  value={custoBaseFoco}
                  onChange={setCustoBaseFoco}
                  inputMode="decimal"
                />
                <Field
                  label="Eficiencia de foco"
                  value={eficienciaFoco}
                  onChange={setEficienciaFoco}
                  inputMode="decimal"
                />
              </>
            )}
            <Field
              label="Taxa da estacao por item"
              value={taxaEstacao}
              onChange={setTaxaEstacao}
              inputMode="decimal"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 pt-3 text-sm">
            <input
              type="checkbox"
              checked={premium}
              onChange={(e) => setPremium(e.target.checked)}
              className="size-4 rounded border-zinc-600 bg-zinc-900 text-emerald-600 focus:ring-emerald-500"
            />
            Premium (taxa mercado 6,5%)
          </label>
        </details>

        {modo === "estoque" && (
          <p className="text-xs leading-relaxed text-zinc-500">
            Estimativa acumulada: usa consumo líquido esperado com retorno
            (foco ou não) para projetar múltiplos re-refinos até o esgotamento.
            Use preço 0 para recurso coletado.
          </p>
        )}

        <div className="flex flex-wrap gap-4">
          {modo === "estoque" && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={usarFoco}
                onChange={(e) => setUsarFoco(e.target.checked)}
                className="size-4 rounded border-zinc-600 bg-zinc-900 text-emerald-600 focus:ring-emerald-500"
              />
              Usar foco (retorno 54%)
            </label>
          )}
        </div>

        <button
          type="button"
          onClick={onCalcular}
          disabled={loading || !canSubmit}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Calculando…" : "Calcular"}
        </button>

        {!canSubmit && (
          <p className="text-center text-sm text-zinc-500">
            {modo === "lote"
              ? "Preencha preços e quantidade para ver o resultado."
              : "Preencha preços e estoques iniciais (pelo menos um recurso)."}
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
      </section>

      {data && isDataLote(data) && (
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
            <h2 className="text-lg font-medium text-white">Comparativo</h2>
            <div className="grid grid-cols-1 gap-3">
              <Metric
                label="Silver por foco"
                value={data.formatted.silver_per_focus}
                accent={data.resultado.silver_per_focus > 0}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Metric
                label="Lucro extra do foco"
                value={data.formatted.extra_profit_from_focus}
                accent
              />
              <Metric
                label="Quantidade"
                value={String(data.resultado.without_focus.quantidade)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Metric
                label="Foco por item"
                value={data.formatted.focus_cost_per_item}
              />
              <Metric
                label="Foco total"
                value={data.formatted.total_focus_spent}
              />
            </div>
            <p className="text-sm text-zinc-400">{data.formatted.focus_status}</p>
            <p className="text-sm text-zinc-400">
              <span className="text-zinc-300">Tier:</span>{" "}
              {data.resultado.without_focus.tier}
              <span className="mx-2 text-zinc-600">·</span>
              <span className="text-zinc-300">Quantidade:</span>{" "}
              {data.resultado.without_focus.quantidade}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
                <p className="text-sm font-medium text-zinc-200">Sem foco</p>
                <Row label="Lucro" value={data.formatted.without_focus.lucro} />
                <Row label="Margem" value={data.formatted.without_focus.margem} />
                <Row label="Custo bruto" value={data.formatted.without_focus.custo_bruto} />
                <Row
                  label="Custo após retorno"
                  value={data.formatted.without_focus.custo_liquido}
                />
                <Row
                  label="Taxa da estaÃ§Ã£o"
                  value={data.formatted.without_focus.taxa_estacao}
                />
              </div>
              <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
                <p className="text-sm font-medium text-zinc-200">Com foco</p>
                <Row label="Lucro" value={data.formatted.with_focus.lucro} />
                <Row label="Margem" value={data.formatted.with_focus.margem} />
                <Row
                  label="Custo bruto"
                  value={data.formatted.with_focus.custo_bruto}
                />
                <Row
                  label="Custo após retorno"
                  value={data.formatted.with_focus.custo_liquido}
                />
                <Row
                  label="Taxa da estacao"
                  value={data.formatted.with_focus.taxa_estacao}
                />
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-zinc-400">
                O retorno reduz o consumo real dos materiais. Ele nao entra como venda extra.
              </p>
              <MaterialBreakdownCard
                title="Materiais sem foco"
                materiais={data.formatted.without_focus.materiais}
              />
              <MaterialBreakdownCard
                title="Materiais com foco"
                materiais={data.formatted.with_focus.materiais}
              />
            </div>
          </section>
        </>
      )}

      {data && !isDataLote(data) && (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-medium text-white">Estoque inicial</h2>
            <div className="grid grid-cols-2 gap-3">
              <Metric
                label={data.comprar.tier_bruto_label}
                value={String(data.comprar.estoque_bruto_inicial)}
              />
              <Metric
                label={data.comprar.label_ref_anterior}
                value={String(data.comprar.estoque_ref_anterior_inicial)}
              />
            </div>
            <p className="text-sm text-zinc-400">
              <span className="text-zinc-300">Valor de mercado do estoque:</span>{" "}
              {data.formatted.valor_total_estoque}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-white">Estimativa</h2>
            <div className="grid grid-cols-2 gap-3">
              <Metric
                label="Refinados estimados"
                value={data.formatted.total_refinado_estimado}
                accent
              />
              <Metric
                label="Refinados inteiros (base)"
                value={String(data.resultado.total_refinado)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Metric
                label="Crafts estimados"
                value={data.formatted.crafts_estimados}
                accent
              />
              <Metric
                label="Retorno total bruto"
                value={data.formatted.retorno_total_bruto}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Metric
                label={`Retorno total ${data.comprar.label_ref_anterior}`}
                value={data.formatted.retorno_total_ref_anterior}
              />
              <Metric
                label="Consumo efetivo bruto"
                value={data.formatted.consumo_efetivo_bruto}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Metric
                label={`Consumo efetivo ${data.comprar.label_ref_anterior}`}
                value={data.formatted.consumo_efetivo_ref_anterior}
              />
              <Metric
                label="Sobra bruto (estimada)"
                value={data.formatted.sobra_bruto_estimado}
              />
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Metric
                label={`Sobra ${data.comprar.label_ref_anterior} (estimada)`}
                value={data.formatted.sobra_ref_anterior_estimado}
              />
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Metric label="Valor da sobra" value={data.formatted.valor_sobra} />
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
              <span className="text-zinc-300">Custo consumido:</span>{" "}
              {data.formatted.custo_consumido}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
                <Row
                  label="Valor total do estoque"
                  value={data.formatted.valor_total_estoque}
                />
                <Row
                  label="Custo consumido"
                  value={data.formatted.custo_consumido}
                />
                <Row
                  label="Valor da sobra"
                  value={data.formatted.valor_sobra}
                />
                <Row
                  label="Taxa da estaÃ§Ã£o"
                  value={data.formatted.taxa_estacao}
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
                <Row
                  label="Resultado sobre estoque total"
                  value={data.formatted.lucro_sobre_estoque_total}
                />
                <Row
                  label="Margem sobre estoque total"
                  value={data.formatted.margem_sobre_estoque_total}
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
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
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

function MaterialBreakdownCard({
  title,
  materiais,
}: {
  title: string;
  materiais: ApiMaterialFormatado[];
}) {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
      <p className="text-sm font-medium text-zinc-200">{title}</p>
      <div className="space-y-3">
        {materiais.map((material) => (
          <div key={material.tipo} className="space-y-2 border-t border-zinc-800 pt-3 first:border-t-0 first:pt-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-zinc-300">
                {material.label}
              </span>
              <span className="text-xs tabular-nums text-zinc-500">
                preco {material.preco_unitario}
              </span>
            </div>
            <Row label="Necessario" value={material.quantidade_necessaria} />
            <Row label="Retorno estimado" value={material.quantidade_retornada} />
            <Row label="Consumido efetivo" value={material.quantidade_consumida} />
            <Row label="Custo efetivo" value={material.custo_efetivo} />
          </div>
        ))}
      </div>
    </div>
  );
}
