"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatarCompacto } from "@/lib/refino";

const TIER_OPTIONS = ["T3", "T4", "T5", "T6", "T7", "T8"];
const resourceThemes = {
  fiber: {
    label: "Tecido",
    city: "Lymhurst",
    accent: "#6b8f3a",
    icon: "/icons/tecido.png",
  },
  ore: {
    label: "Barras",
    city: "Thetford",
    accent: "#7b61ff",
    icon: "/icons/barras-transparent.png",
  },
  stone: {
    label: "Blocos",
    city: "Bridgewatch",
    accent: "#ff8c00",
    icon: "/icons/blocos-transparent.png",
  },
  hide: {
    label: "Couro",
    city: "Martlock",
    accent: "#3498db",
    icon: "/icons/couro-transparent.png",
  },
  wood: {
    label: "Tábuas",
    city: "Fort Sterling",
    accent: "#bdc3c7",
    icon: "/icons/tabua-transparent.png",
  },
} as const;

type ResourceKey = keyof typeof resourceThemes;
type ResourceTheme = (typeof resourceThemes)[ResourceKey];

const resourceItemNames: Record<
  ResourceKey,
  { raw: string; refined: string }
> = {
  fiber: { raw: "algodão", refined: "tecido" },
  ore: { raw: "minério", refined: "barra" },
  stone: { raw: "pedra", refined: "bloco" },
  hide: { raw: "pelego", refined: "couro" },
  wood: { raw: "tronco", refined: "tábua" },
};

const RESOURCE_OPTIONS = Object.entries(resourceThemes).map(([key, theme]) => ({
  key: key as ResourceKey,
  ...theme,
}));

const DEFAULT_RETORNO_SEM_FOCO = "36.71";
const DEFAULT_RETORNO_COM_FOCO = "54";

// Defaults internos do cálculo de foco (não expostos na UI).
// Custo base e eficiência típicos de uma conta Albion com refining especializado.
const DEFAULT_BASE_FOCUS_COST = 1500;
const DEFAULT_FOCUS_EFFICIENCY = 100;

function productionBonusFromReturnPercent(returnPercent: number): number {
  const returnRate = returnPercent / 100;
  return (1 / (1 - returnRate) - 1) * 100;
}

// Classifica o veredito. Aceita margem decimal (ex: 0.23 = 23%).
// SIM: >= 50% | TALVEZ: > 15% | NÃO: <= 15%
type Verdict = "sim" | "talvez" | "nao";

function classifyVerdict(margem: number): Verdict {
  const pct = margem * 100;
  if (pct >= 50) return "sim";
  if (pct > 15) return "talvez";
  return "nao";
}

// Metadados visuais do veredito (texto, emoji e classes de cor Tailwind).
function verdictMeta(v: Verdict): {
  label: string;
  emoji: string;
  border: string;
  bg: string;
  text: string;
  badgeBg: string;
} {
  if (v === "sim") {
    return {
      label: "SIM",
      emoji: "",
      border: "border-[#2ecc71]",
      bg: "bg-[#2ecc71]/10",
      text: "profit-positive",
      badgeBg: "bg-[#2ecc71]",
    };
  }
  if (v === "talvez") {
    return {
      label: "TALVEZ",
      emoji: "",
      border: "border-[#f4b400]",
      bg: "bg-[#f4b400]/10",
      text: "profit-warning",
      badgeBg: "bg-[#f4b400]",
    };
  }
  return {
    label: "NÃO",
    emoji: "X",
    border: "border-[#e74c3c]",
    bg: "bg-[#e74c3c]/10",
    text: "profit-negative",
    badgeBg: "bg-[#e74c3c]",
  };
}

// Piso mínimo de eficiência do foco (silver por foco) para recomendá-lo.
// Refining em Albion costuma usar 10-20 silver/focus como referência mínima.
const SILVER_PER_FOCUS_THRESHOLD = 10;

// Decide se o foco compensa: precisa render mais lucro absoluto e ter eficiência mínima.
function recommendFocus(
  lucroComFoco: number,
  lucroSemFoco: number,
  silverPorFoco: number,
): boolean {
  if (lucroComFoco <= lucroSemFoco) return false;
  return silverPorFoco >= SILVER_PER_FOCUS_THRESHOLD;
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
    sem_foco: ApiCompraEstimativa;
    com_foco: ApiCompraEstimativa;
    label_ref_anterior: string;
    tier_bruto_label: string;
  };
  formatted: {
    without_focus: ApiResultadoFormatado;
    with_focus: ApiResultadoFormatado;
    comprar: {
      sem_foco: ApiCompraEstimativaFormatada;
      com_foco: ApiCompraEstimativaFormatada;
    };
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

type ApiCompraEstimativa = {
  qtd_bruto_estimado: number;
  qtd_ref_anterior_estimado: number;
};

type ApiCompraEstimativaFormatada = {
  qtd_bruto_estimado: string;
  qtd_ref_anterior_estimado: string;
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
  const [tierInfoOpen, setTierInfoOpen] = useState(false);
  const [resourceKey, setResourceKey] = useState<ResourceKey>("fiber");
  const [precoBruto, setPrecoBruto] = useState("");
  const [precoRefAnt, setPrecoRefAnt] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  const [taxaEstacao, setTaxaEstacao] = useState("");
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
  const tierInfoRef = useRef<HTMLLabelElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!tierInfoRef.current?.contains(event.target as Node)) {
        setTierInfoOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTierInfoOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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
    const rsf = Number(
      retornoSemFoco.trim() === "" ? DEFAULT_RETORNO_SEM_FOCO : retornoSemFoco,
    );
    const rcf = Number(
      retornoComFoco.trim() === "" ? DEFAULT_RETORNO_COM_FOCO : retornoComFoco,
    );
    const q = Number(quantidade);
    if ([pb, pra, pv, te, rsf, rcf, q].some((n) => Number.isNaN(n))) {
      setError("Use apenas números válidos.");
      return;
    }
    if (te < 0) {
      setError("Taxa da estação deve ser um número >= 0.");
      return;
    }
    if (rsf < 0 || rcf < 0 || rsf >= 100 || rcf >= 100) {
      setError("Retorno de materiais deve ser um percentual entre 0 e 99,99.");
      return;
    }
    if (q < 1 || !Number.isInteger(q)) {
      setError("Quantidade deve ser um inteiro >= 1.");
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
          base_focus_cost: DEFAULT_BASE_FOCUS_COST,
          focus_efficiency: DEFAULT_FOCUS_EFFICIENCY,
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
      setError("Taxa da estação deve ser um número >= 0.");
      return;
    }
    if (Number.isNaN(eb) || Number.isNaN(er) || eb < 0 || er < 0) {
      setError("Estoques devem ser inteiros >= 0.");
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
  const resourceTheme = resourceThemes[resourceKey];
  const resourceItemName = resourceItemNames[resourceKey];
  const focoAtivo = usarFoco;
  const previousTier = `T${Number(tier.replace("T", "")) - 1}`;
  const formatQuantidadeDisplay = (value: string | number) =>
    typeof value === "number" ? formatarCompacto(value) : value;
  const fieldLabels = {
    rawPrice: `Preço ${resourceItemName.raw} ${tier}`,
    previousRefinedPrice: `Preço ${resourceItemName.refined} ${previousTier}`,
    refinedPrice: `Preço ${resourceItemName.refined} ${tier}`,
    rawStock: `Estoque ${resourceItemName.raw} ${tier}`,
    previousRefinedStock: `Estoque ${resourceItemName.refined} ${previousTier}`,
  };
  const themeStyle = {
    "--resource-accent": resourceTheme.accent,
  } as CSSProperties;

  const isDataLote = (
    d: ApiResponse | ApiResponseEstoque,
  ): d is ApiResponse => "sem_foco" in d.comprar;

  return (
      <main
        className="city-theme mx-auto flex min-h-dvh max-w-lg flex-col gap-8 px-4 py-10"
        style={themeStyle}
      >
        <header className="space-y-2 text-center">
          <h1
            className="text-3xl font-bold uppercase tracking-[0.22em]"
            style={{ color: resourceTheme.accent }}
          >
            REFINE FORGE
          </h1>
          <p className="text-sm font-medium text-[#d8c9a8]">Maximize seu lucro no refino</p>
        </header>

      <section className="game-card space-y-4 rounded-lg p-4">
        <div className="accent-border flex rounded-md border bg-[#0b0f14] p-1">
          <button
            type="button"
            onClick={() => setModoSafe("lote")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              modo === "lote"
                ? "accent-tab-active shadow-inner"
                : "text-[#d8c9a8] hover:text-[var(--resource-accent)]"
            }`}
          >
            Por quantidade
          </button>
          <button
            type="button"
            onClick={() => setModoSafe("estoque")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              modo === "estoque"
                ? "accent-tab-active shadow-inner"
                : "text-[#d8c9a8] hover:text-[var(--resource-accent)]"
            }`}
          >
            Por estoque
          </button>
        </div>

          <label ref={tierInfoRef} className="block space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-xs font-bold uppercase tracking-wide"
                style={{ color: "var(--resource-accent)" }}
              >
                Tier
              </span>
              <button
                type="button"
                aria-label="Ver ajuda sobre tier"
                aria-expanded={tierInfoOpen}
                onClick={() => setTierInfoOpen((current) => !current)}
                className="flex size-5 items-center justify-center rounded-full border border-zinc-700 text-[11px] font-bold text-zinc-300 transition hover:border-[var(--resource-accent)] hover:bg-[color-mix(in_srgb,var(--resource-accent)_12%,transparent)] hover:text-[var(--resource-accent)]"
              >
                i
              </button>
            </div>
            {tierInfoOpen ? (
              <div className="space-y-1 rounded-lg border border-zinc-700 bg-zinc-950/90 px-3 py-2 text-xs leading-relaxed text-zinc-300 shadow-lg">
                <p className="font-semibold text-zinc-100">
                  Use apenas o tier base do recurso.
                </p>
                <p>
                  Se o recurso for encantado ou não, não precisa se preocupar:
                  a lógica de refino é a mesma. Exemplo: para T4.1, informe T4.
                </p>
              </div>
            ) : null}
            <div className="relative">
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="game-input w-full appearance-none rounded-md px-3 py-2 pr-10 text-sm outline-none"
              >
                {TIER_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-[#d8c9a8]">
                v
              </span>
            </div>
          </label>

          <div className="space-y-1">
            <span
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: "var(--resource-accent)" }}
            >
              Recurso
            </span>
            <ResourceSelect value={resourceKey} onChange={setResourceKey} />
          </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label={fieldLabels.rawPrice}
            value={precoBruto}
            onChange={setPrecoBruto}
            inputMode="decimal"
          />
          <Field
            label={fieldLabels.previousRefinedPrice}
            value={precoRefAnt}
            onChange={setPrecoRefAnt}
            inputMode="decimal"
          />
          <Field
            label={fieldLabels.refinedPrice}
            value={precoVenda}
            onChange={setPrecoVenda}
            inputMode="decimal"
          />
          {modo === "lote" ? (
            <Field
              label="Quantidade desejada"
              value={quantidade}
              onChange={setQuantidade}
              inputMode="numeric"
            />
          ) : (
            <>
              <Field
                label={fieldLabels.rawStock}
                value={estoqueBruto}
                onChange={setEstoqueBruto}
                inputMode="numeric"
              />
              <Field
                label={fieldLabels.previousRefinedStock}
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
          className="game-panel space-y-5 rounded-lg p-4"
        >
          <summary className="cursor-pointer text-sm font-bold text-[#f3ead7]">
            Configurações avançadas
          </summary>

          {/* Grupo: Retorno de materiais - só relevante no modo lote */}
          {modo === "lote" && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-[#b8944d]">
                Retorno de materiais
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  label="Retorno sem foco"
                  value={retornoSemFoco}
                  onChange={setRetornoSemFoco}
                  inputMode="decimal"
                />
                <Field
                  label="Retorno com foco"
                  value={retornoComFoco}
                  onChange={setRetornoComFoco}
                  inputMode="decimal"
                />
              </div>
            </div>
          )}

          {/* Grupo: Custos operacionais */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-[#b8944d]">
              Custos
            </p>
              <Field
              label="Taxa da estação"
              value={taxaEstacao}
              onChange={setTaxaEstacao}
              inputMode="decimal"
            />
          </div>

          {/* Grupo: Mercado / conta */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-[#b8944d]">
              Mercado
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#f3ead7]">
              <input
                type="checkbox"
                checked={premium}
                onChange={(e) => setPremium(e.target.checked)}
                className="accent-border size-4 rounded border bg-[#0e1319] text-[var(--resource-accent)] focus:ring-[var(--resource-accent)]"
              />
              <span style={{ color: "var(--resource-accent)" }}>Conta Premium</span>
              <span className="text-[#9c8f77]">(taxa 6,5%)</span>
            </label>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-[#b8944d]">
              Foco
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#f3ead7]">
              <input
                type="checkbox"
                checked={usarFoco}
                onChange={(e) => setUsarFoco(e.target.checked)}
                className="accent-border size-4 rounded border bg-[#0e1319] text-[var(--resource-accent)] focus:ring-[var(--resource-accent)]"
              />
              <span style={{ color: "var(--resource-accent)" }}>Usar foco</span>
            </label>
          </div>
        </details>

        {modo === "estoque" && (
          <p className="text-xs leading-relaxed text-[#9c8f77]">
            Estimativa acumulada: usa consumo líquido esperado com retorno
            (foco ou não) para projetar múltiplos re-refinos até o esgotamento.
            Use preço 0 para recurso coletado.
          </p>
        )}

        {modo === "lote" && (
          <p className="text-xs leading-relaxed text-[#9c8f77]">
            Estimativa com re-refino: usa o retorno esperado de cada cenário
            para calcular quanto comprar, quanto gastar e o lucro da meta
            final.
          </p>
        )}

        <button
          type="button"
          onClick={onCalcular}
          disabled={loading || !canSubmit}
          className="game-action w-full rounded-md px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Calculando..." : "Calcular"}
        </button>

        {!canSubmit && (
          <p className="text-center text-sm text-[#9c8f77]">
            {modo === "lote"
              ? "Preencha preços e quantidade para ver o resultado."
              : "Preencha preços e estoques iniciais (pelo menos um recurso)."}
          </p>
        )}
        {error && (
          <p className="rounded-md border border-[#e74c3c]/70 bg-[#e74c3c]/10 px-3 py-2 text-sm text-[#e74c3c]">
            {error}
          </p>
        )}
      </section>

      {data && isDataLote(data) && (() => {
        if (!focoAtivo) {
          const verdict = classifyVerdict(data.resultado.without_focus.margem);
          const meta = verdictMeta(verdict);

          return (
            <>
              <section className="game-card space-y-3 rounded-lg p-4">
                <p className="accent-text text-sm font-bold uppercase tracking-wide">
                  Lucro do refino
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className={`space-y-1 rounded-lg border p-3 ${meta.border} ${meta.bg}`}>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#b8944d]">Lucro</p>
                    <p className="gold-text text-2xl font-bold tabular-nums">
                      {data.formatted.without_focus.lucro}
                    </p>
                    <p className="text-sm tabular-nums text-[#d8c9a8]">
                      {data.formatted.without_focus.margem}
                    </p>
                  </div>

                  <div className="game-panel space-y-1 rounded-lg p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#b8944d]">Meta</p>
                    <p className="text-2xl font-bold tabular-nums text-[#f3ead7]">
                      {formatQuantidadeDisplay(data.resultado.without_focus.quantidade)}
                    </p>
                    <p className="text-xs text-[#9c8f77]">recursos desejados</p>
                  </div>
                </div>

                <div className="accent-divider flex items-center justify-between gap-3 border-t pt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wide text-[#b8944d]">Vale a pena</span>
                    <span className={`rounded-md px-3 py-1 text-sm font-bold text-[#1b1004] ${meta.badgeBg}`}>
                      {meta.label}
                    </span>
                  </div>
                  <span className="text-xs text-[#9c8f77]">
                    Gasto estimado: {data.formatted.without_focus.custo_liquido}
                  </span>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-[#b8944d]">
                  Compra estimada
                </h3>
                <p className="text-xs leading-relaxed text-[#9c8f77]">
                  Compra baseada na sobra do retorno para atingir só a quantidade desejada.
                </p>
                <div className="game-panel space-y-2 rounded-lg p-3">
                  <Metric
                    label={data.comprar.tier_bruto_label}
                    value={formatQuantidadeDisplay(
                      data.formatted.comprar.sem_foco.qtd_bruto_estimado,
                    )}
                  />
                  <Metric
                    label={data.comprar.label_ref_anterior}
                    value={
                      formatQuantidadeDisplay(
                        data.formatted.comprar.sem_foco.qtd_ref_anterior_estimado,
                      )
                    }
                  />
                </div>
              </section>

            </>
          );
        }
        // Foco só é recomendado se rende mais lucro absoluto e tem eficiência mínima
        // (silver/foco >= threshold). Evita recomendar foco com retorno desprezível.
        const focoCompensa = recommendFocus(
          data.resultado.with_focus.lucro,
          data.resultado.without_focus.lucro,
          data.resultado.silver_per_focus,
        );
        const focoFmt = data.formatted.with_focus;
        const semFocoFmt = data.formatted.without_focus;
        const focoMeta = verdictMeta(classifyVerdict(data.resultado.with_focus.margem));
        const semFocoMeta = verdictMeta(classifyVerdict(data.resultado.without_focus.margem));
        const diffLucro = data.resultado.with_focus.lucro - data.resultado.without_focus.lucro;
        const diffLucroFormatado = data.formatted.extra_profit_from_focus;
        const focoBadge = focoCompensa ? "BOA" : "BAIXA";
        const focoBadgeBg = focoCompensa ? "bg-[#2ecc71]" : "bg-[#c3423f]";

        return (
          <>
            <section className="game-card space-y-3 rounded-lg p-4">
              <p className="accent-text text-sm font-bold uppercase tracking-wide">Lucro com foco</p>

              <div className="grid grid-cols-2 gap-3">
                <div className={`space-y-1 rounded-lg border p-3 ${focoMeta.border} ${focoMeta.bg}`}>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#b8944d]">Lucro com foco</p>
                  <p className="gold-text text-2xl font-bold tabular-nums">
                    {focoFmt.lucro}
                  </p>
                  <p className="text-sm tabular-nums text-[#d8c9a8]">
                    {focoFmt.margem}
                  </p>
                </div>

                <div className={`space-y-1 rounded-lg border p-3 ${semFocoMeta.border} ${semFocoMeta.bg}`}>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#b8944d]">Lucro sem foco</p>
                  <p className="text-2xl font-bold tabular-nums text-[#f3ead7]">
                    {semFocoFmt.lucro}
                  </p>
                  <p className="text-sm tabular-nums text-[#d8c9a8]">
                    {semFocoFmt.margem}
                  </p>
                </div>
              </div>

              <div className="accent-divider flex items-center justify-between gap-3 border-t pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-[#b8944d]">Eficiência do foco</span>
                  <span className={`rounded-md px-3 py-1 text-sm font-bold text-[#1b1004] ${focoBadgeBg}`}>
                    {focoBadge}
                  </span>
                </div>
                <span className="text-sm tabular-nums text-[#b8944d]">
                  Ganho com foco: <span className={diffLucro >= 0 ? "profit-positive" : "profit-negative"}>{diffLucro >= 0 ? "+" : ""}{diffLucroFormatado}</span>
                </span>
              </div>
            </section>

            {/* Compra estimada com re-refino */}
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#b8944d]">
                Compra estimada
              </h3>
              <p className="text-xs leading-relaxed text-[#9c8f77]">
                Compra baseada na sobra do retorno para atingir só a quantidade desejada.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="game-panel space-y-2 rounded-lg p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#b8944d]">
                    Sem foco
                  </p>
                  <Metric
                    label={data.comprar.tier_bruto_label}
                    value={formatQuantidadeDisplay(
                      data.formatted.comprar.sem_foco.qtd_bruto_estimado,
                    )}
                  />
                  <Metric
                    label={data.comprar.label_ref_anterior}
                    value={
                      formatQuantidadeDisplay(
                        data.formatted.comprar.sem_foco
                          .qtd_ref_anterior_estimado,
                      )
                    }
                  />
                </div>
                <div className="game-panel space-y-2 rounded-lg p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#b8944d]">
                    Com foco
                  </p>
                  <Metric
                    label={data.comprar.tier_bruto_label}
                    value={formatQuantidadeDisplay(
                      data.formatted.comprar.com_foco.qtd_bruto_estimado,
                    )}
                  />
                  <Metric
                    label={data.comprar.label_ref_anterior}
                    value={
                      formatQuantidadeDisplay(
                        data.formatted.comprar.com_foco
                          .qtd_ref_anterior_estimado,
                      )
                    }
                  />
                </div>
              </div>
            </section>

          </>
        );
      })()}

      {data && !isDataLote(data) && (() => {
        const verdict = classifyVerdict(data.resultado.margem);
        const meta = verdictMeta(verdict);

        return (
        <>
          {/* Card principal: lucro + margem + veredito + contexto */}
          <section className="game-card space-y-3 rounded-lg p-4">
            <p className="accent-text text-sm font-bold uppercase tracking-wide">Lucro do refino</p>

            <div className="grid grid-cols-2 gap-3">
              {/* Painel de lucro */}
              <div className={`space-y-1 rounded-lg border p-3 ${meta.border} ${meta.bg}`}>
                <p className="text-xs font-bold uppercase tracking-wide text-[#b8944d]">Lucro</p>
                <p className="gold-text text-2xl font-bold tabular-nums">
                  {data.formatted.lucro}
                </p>
                <p className="text-sm tabular-nums text-[#d8c9a8]">
                  {data.formatted.margem}
                </p>
              </div>

              {/* Painel de produção */}
              <div className="game-panel space-y-1 rounded-lg p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[#b8944d]">Produção</p>
                <p className="text-2xl font-bold tabular-nums text-[#f3ead7]">
                  {data.formatted.total_refinado_estimado}
                </p>
                <p className="text-xs text-[#9c8f77]">refinados estimados</p>
              </div>
            </div>

            {/* Veredito + contexto */}
            <div className="accent-divider flex items-center justify-between gap-3 border-t pt-3">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-[#b8944d]">Vale a pena</span>
                <span className={`rounded-md px-3 py-1 text-sm font-bold text-[#1b1004] ${meta.badgeBg}`}>
                  {meta.label} {meta.emoji}
                </span>
              </div>
            </div>
          </section>

        </>
        );
      })()}
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
        <span
          className="text-xs font-bold uppercase tracking-wide"
          style={{ color: "var(--resource-accent)" }}
        >
          {label}
        </span>
        <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="game-input w-full rounded-md px-3 py-2 text-sm outline-none placeholder:text-[#766848]"
        placeholder="-"
      />
    </label>
  );
}

function ResourceSelect({
  value,
  onChange,
}: {
  value: ResourceKey;
  onChange: (value: ResourceKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selectedTheme = resourceThemes[value];

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="game-input flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm outline-none"
        style={{ color: selectedTheme.accent }}
      >
        <span className="flex min-w-0 items-center gap-3">
          {selectedTheme.icon ? (
            <Image
              src={selectedTheme.icon}
              alt=""
              aria-hidden="true"
              width={22}
              height={22}
              className="h-[22px] w-[22px] shrink-0 object-contain"
            />
          ) : null}
          <span className="truncate">
            {selectedTheme.label} - {selectedTheme.city}
          </span>
        </span>
        <span className="shrink-0 text-xs text-[#d8c9a8]">v</span>
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-md border border-[#3a2f1f] bg-[#12161c] p-1 shadow-[0_18px_35px_rgba(0,0,0,0.45)]"
        >
          {RESOURCE_OPTIONS.map((option) => {
            const isSelected = option.key === value;

            return (
              <button
                key={option.key}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.key);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition ${
                  isSelected
                    ? "bg-[rgba(255,255,255,0.08)] text-[#fff7e2]"
                    : "text-[#f3ead7] hover:bg-[rgba(255,255,255,0.05)]"
                }`}
              >
                {option.icon ? (
                  <Image
                    src={option.icon}
                    alt=""
                    aria-hidden="true"
                    width={20}
                    height={20}
                    className="h-5 w-5 shrink-0 object-contain"
                  />
                ) : null}
                <span className="min-w-0 truncate">
                  {option.label} - {option.city}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
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
            ? "border-[#2ecc71]/70 bg-[#2ecc71]/10"
            : "game-panel"
        }`}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--resource-accent)" }}
        >
          {label}
        </p>
        <p
          className={`mt-1 text-lg font-semibold tabular-nums ${accent ? "profit-positive" : "text-[#f3ead7]"}`}
        >
        {value}
      </p>
    </div>
  );
}

  function Row({ label, value }: { label: string; value: string }) {
    return (
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span style={{ color: "var(--resource-accent)" }}>{label}</span>
        <span className="tabular-nums text-[#f3ead7]">{value}</span>
      </div>
    );
  }

// Bloco principal do veredito: lucro grande, silver/foco (opcional) e badge SIM/TALVEZ/NÃO.
// Bloco principal do veredito.
// Separa visualmente: (1) lucro do melhor cenário, (2) badge SIM/TALVEZ/NÃO da margem,
// (3) info do foco (compensa? eficiência? ganho extra?), (4) cenário recomendado.
// `focoInfo` é opcional - quando ausente (modo estoque), nada de foco aparece.
function VerdictCard({
  lucroFormatado,
  margem,
  cenarioLabel,
  focoInfo,
}: {
  lucroFormatado: string;
  margem: number;
  cenarioLabel?: string;
  focoInfo?: {
    compensa: boolean;
    silverPorFoco: number;
    silverPorFocoFormatado: string;
    ganhoExtraFormatado: string;
  };
}) {
  // Define o nível de recomendação a partir da margem retornada pela API.
  const verdict = classifyVerdict(margem);
  const meta = verdictMeta(verdict);

  return (
    <section
      className={`game-card space-y-4 rounded-lg border ${meta.border} ${meta.bg} p-5`}
    >
      {/* (1) Lucro total - destaque máximo */}
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-[#b8944d]">Lucro</p>
        <p className="gold-text text-4xl font-bold tabular-nums">
          {lucroFormatado}
        </p>
      </div>

      {/* (2) Veredito de "vale a pena refinar" - baseado só na margem */}
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-wide text-[#b8944d]">
          Vale a pena
        </span>
        <span
          className={`rounded-md px-3 py-1 text-sm font-bold text-[#1b1004] ${meta.badgeBg}`}
        >
          {meta.label}
        </span>
      </div>

      {/* (3) Info do foco - compensa? quanto rende? quanto extra? */}
      {focoInfo && (
        <div className="game-panel space-y-2 rounded-lg p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs uppercase tracking-wide text-[#b8944d]">
              Foco compensa?
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-bold text-[#1b1004] ${
                focoInfo.compensa ? "bg-[#2ecc71]" : "bg-[#e74c3c]"
              }`}
            >
              {focoInfo.compensa ? "SIM" : "NÃO"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[#9c8f77]">
                Eficiência (silver/foco)
              </p>
              <p className="mt-0.5 text-base font-semibold tabular-nums text-[#f3ead7]">
                {focoInfo.silverPorFocoFormatado}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[#9c8f77]">
                Ganho extra do foco
              </p>
              <p className="mt-0.5 text-base font-semibold tabular-nums text-[#f3ead7]">
                {focoInfo.ganhoExtraFormatado}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* (4) Cenário recomendado */}
      {cenarioLabel && (
        <p className="text-xs text-[#d8c9a8]">{cenarioLabel}</p>
      )}
    </section>
  );
}

// Linha compacta de métricas secundárias (margem, receita, custo, etc.).
function SummaryRow({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="game-panel rounded-lg px-3 py-2"
        >
          <p className="text-[10px] uppercase tracking-wide text-[#9c8f77]">
            {item.label}
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#f3ead7]">
            {item.value}
          </p>
        </div>
      ))}
    </section>
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
    <div className="game-panel space-y-3 rounded-lg p-3">
      <p className="text-sm font-bold text-[#f3ead7]">{title}</p>
      <div className="space-y-3">
        {materiais.map((material) => (
          <div key={material.tipo} className="accent-divider space-y-2 border-t pt-3 first:border-t-0 first:pt-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-[#f3ead7]">
                {material.label}
              </span>
              <span className="text-xs tabular-nums text-[#9c8f77]">
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



