import { NextResponse } from "next/server";
import {
  MaterialBreakdown,
  PRODUCTION_BONUS_COM_FOCO,
  PRODUCTION_BONUS_SEM_FOCO,
  TAXA_MERCADO,
  TAXA_MERCADO_SEM_PREMIUM,
  ResultadoRefino,
  compareRefiningProfit,
  formatarCompacto,
  getRecipe,
} from "@/lib/refino";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(request: Request) {
  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  let tier: string;
  let preco_bruto: number;
  let preco_refinado_anterior: number;
  let preco_venda_refinado: number;
  let quantidade: number;
  let station_fee_per_item: number;
  let base_focus_cost: number;
  let focus_efficiency: number;
  let production_bonus_without_focus: number;
  let production_bonus_with_focus: number;
  let premium: boolean;

  try {
    tier = String(data.tier ?? "").trim();
    preco_bruto = Number(data.preco_bruto);
    preco_refinado_anterior = Number(data.preco_refinado_anterior);
    preco_venda_refinado = Number(data.preco_venda_refinado);
    quantidade = Math.trunc(Number(data.quantidade));
    station_fee_per_item = Number(data.station_fee_per_item ?? 0);
    base_focus_cost = Number(data.base_focus_cost ?? 0);
    focus_efficiency = Number(data.focus_efficiency ?? 0);
    production_bonus_without_focus = Number(
      data.production_bonus_without_focus ?? PRODUCTION_BONUS_SEM_FOCO,
    );
    production_bonus_with_focus = Number(
      data.production_bonus_with_focus ?? PRODUCTION_BONUS_COM_FOCO,
    );
    premium = data.premium !== undefined ? Boolean(data.premium) : true;
    if (
      Number.isNaN(preco_bruto) ||
      Number.isNaN(preco_refinado_anterior) ||
      Number.isNaN(preco_venda_refinado) ||
      Number.isNaN(station_fee_per_item) ||
      station_fee_per_item < 0 ||
      Number.isNaN(base_focus_cost) ||
      base_focus_cost < 0 ||
      Number.isNaN(focus_efficiency) ||
      focus_efficiency < 0 ||
      Number.isNaN(production_bonus_without_focus) ||
      production_bonus_without_focus < 0 ||
      Number.isNaN(production_bonus_with_focus) ||
      production_bonus_with_focus < 0 ||
      Number.isNaN(quantidade) ||
      quantidade < 1
    ) {
      throw new Error("invalid");
    }
  } catch {
    return NextResponse.json(
      {
        error:
          "Campos obrigatórios: tier, preco_bruto, preco_refinado_anterior, preco_venda_refinado, quantidade",
      },
      { status: 400 },
    );
  }

  const taxa_mercado = premium ? TAXA_MERCADO : TAXA_MERCADO_SEM_PREMIUM;

  let comparison;
  try {
    comparison = compareRefiningProfit(
      tier,
      preco_bruto,
      preco_refinado_anterior,
      preco_venda_refinado,
      quantidade,
      taxa_mercado,
      station_fee_per_item,
      base_focus_cost,
      focus_efficiency,
      production_bonus_without_focus,
      production_bonus_with_focus,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const recipe = getRecipe(tier);
  if (!recipe) {
    return NextResponse.json({ error: `Tier inválido: ${tier}` }, { status: 400 });
  }

  const tUp = tier.toUpperCase();
  const nTier =
    tUp.startsWith("T") && tUp.length > 1 ? parseInt(tUp.slice(1), 10) : 0;
  const labelRefAnterior = `T${nTier - 1} refinado`;

  const formatMaterial = (material: MaterialBreakdown) => ({
    tipo: material.tipo,
    label:
      material.tipo === "raw"
        ? `${tier.toUpperCase()} bruto`
        : labelRefAnterior,
    quantidade_necessaria: formatarCompacto(material.quantidade_necessaria),
    preco_unitario: formatarCompacto(material.preco_unitario),
    custo_bruto: formatarCompacto(material.custo_bruto),
    quantidade_retornada: formatarCompacto(material.quantidade_retornada),
    quantidade_consumida: formatarCompacto(material.quantidade_consumida),
    custo_efetivo: formatarCompacto(material.custo_efetivo),
  });

  const formatResult = (resultado: ResultadoRefino) => ({
    lucro: formatarCompacto(resultado.lucro),
    margem: `${(resultado.margem * 100).toFixed(2)}%`,
    custo_bruto: formatarCompacto(resultado.custo_bruto),
    custo_liquido: formatarCompacto(resultado.custo_liquido),
    materiais: resultado.materiais.map(formatMaterial),
    taxa_estacao: formatarCompacto(resultado.taxa_estacao),
    receita_bruta: formatarCompacto(resultado.receita_bruta),
    receita_liquida: formatarCompacto(resultado.receita_liquida),
  });

  const getQuantidadeConsumida = (
    resultado: ResultadoRefino,
    tipo: MaterialBreakdown["tipo"],
  ) =>
    resultado.materiais.find((material) => material.tipo === tipo)
      ?.quantidade_consumida ?? 0;

  const arredondarCompraEstimativa = (valor: number) => Math.ceil(valor);

  const formatCompraEstimativa = (resultado: ResultadoRefino) => ({
    qtd_bruto_estimado: formatarCompacto(
      arredondarCompraEstimativa(getQuantidadeConsumida(resultado, "raw")),
    ),
    qtd_ref_anterior_estimado: formatarCompacto(
      arredondarCompraEstimativa(
        getQuantidadeConsumida(resultado, "previous"),
      ),
    ),
  });

  const payload = {
    resultado: {
      without_focus: comparison.withoutFocus,
      with_focus: comparison.withFocus,
      extra_profit_from_focus: comparison.extraProfitFromFocus,
      focus_cost_per_item: comparison.focusCostPerItem,
      total_focus_spent: comparison.totalFocusSpent,
      silver_per_focus: comparison.silverPerFocus,
    },
    comprar: {
      sem_foco: {
        qtd_bruto_estimado: formatarCompacto(
          arredondarCompraEstimativa(
          getQuantidadeConsumida(comparison.withoutFocus, "raw"),
          ),
        ),
        qtd_ref_anterior_estimado: formatarCompacto(
          arredondarCompraEstimativa(
            getQuantidadeConsumida(comparison.withoutFocus, "previous"),
          ),
        ),
      },
      com_foco: {
        qtd_bruto_estimado: formatarCompacto(
          arredondarCompraEstimativa(getQuantidadeConsumida(comparison.withFocus, "raw")),
        ),
        qtd_ref_anterior_estimado: formatarCompacto(
          arredondarCompraEstimativa(
            getQuantidadeConsumida(comparison.withFocus, "previous"),
          ),
        ),
      },
      label_ref_anterior: labelRefAnterior,
      tier_bruto_label: `${tier.toUpperCase()} bruto`,
    },
    formatted: {
      without_focus: formatResult(comparison.withoutFocus),
      with_focus: formatResult(comparison.withFocus),
      comprar: {
        sem_foco: formatCompraEstimativa(comparison.withoutFocus),
        com_foco: formatCompraEstimativa(comparison.withFocus),
      },
      extra_profit_from_focus: formatarCompacto(comparison.extraProfitFromFocus),
      focus_cost_per_item: formatarCompacto(comparison.focusCostPerItem),
      total_focus_spent: formatarCompacto(comparison.totalFocusSpent),
      silver_per_focus: formatarCompacto(comparison.silverPerFocus),
      focus_status:
        comparison.silverPerFocus > 0
          ? "Foco aumenta o lucro neste cenÃ¡rio."
          : "Foco nÃ£o compensa neste cenÃ¡rio.",
    },
  };

  return NextResponse.json(payload);
}
