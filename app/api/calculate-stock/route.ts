import { NextResponse } from "next/server";
import {
  RETORNO,
  RETORNO_FOCO,
  TAXA_MERCADO,
  TAXA_MERCADO_SEM_PREMIUM,
  calculateRefiningProfitFromStock,
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
  let estoque_bruto: number;
  let estoque_ref_anterior: number;
  let preco_bruto: number;
  let preco_refinado_anterior: number;
  let preco_venda_refinado: number;
  let station_fee_per_item: number;
  let usar_foco: boolean;
  let premium: boolean;

  try {
    tier = String(data.tier ?? "").trim();
    estoque_bruto = Math.trunc(Number(data.estoque_bruto));
    estoque_ref_anterior = Math.trunc(Number(data.estoque_ref_anterior));
    preco_bruto = Number(data.preco_bruto);
    preco_refinado_anterior = Number(data.preco_refinado_anterior);
    preco_venda_refinado = Number(data.preco_venda_refinado);
    station_fee_per_item = Number(data.station_fee_per_item ?? 0);
    usar_foco = Boolean(data.usar_foco);
    premium = data.premium !== undefined ? Boolean(data.premium) : true;
    if (
      Number.isNaN(estoque_bruto) ||
      Number.isNaN(estoque_ref_anterior) ||
      Number.isNaN(preco_bruto) ||
      Number.isNaN(preco_refinado_anterior) ||
      Number.isNaN(preco_venda_refinado) ||
      Number.isNaN(station_fee_per_item) ||
      station_fee_per_item < 0 ||
      estoque_bruto < 0 ||
      estoque_ref_anterior < 0
    ) {
      throw new Error("invalid");
    }
    if (estoque_bruto === 0 && estoque_ref_anterior === 0) {
      return NextResponse.json(
        {
          error:
            "Informe estoque bruto ou estoque de refinado anterior (pelo menos um > 0).",
        },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json(
      {
        error:
          "Campos obrigatórios: tier, estoque_bruto, estoque_ref_anterior, preco_bruto, preco_refinado_anterior, preco_venda_refinado",
      },
      { status: 400 },
    );
  }

  const recipe = getRecipe(tier);
  if (!recipe) {
    return NextResponse.json({ error: `Tier inválido: ${tier}` }, { status: 400 });
  }

  const retorno = usar_foco ? RETORNO_FOCO : RETORNO;
  const taxa_mercado = premium ? TAXA_MERCADO : TAXA_MERCADO_SEM_PREMIUM;

  let resultado;
  try {
    ({ resultado } = calculateRefiningProfitFromStock(
      tier,
      estoque_bruto,
      estoque_ref_anterior,
      preco_bruto,
      preco_refinado_anterior,
      preco_venda_refinado,
      retorno,
      taxa_mercado,
      station_fee_per_item,
    ));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const tUp = tier.toUpperCase();
  const nTier =
    tUp.startsWith("T") && tUp.length > 1 ? parseInt(tUp.slice(1), 10) : 0;
  const labelRefAnterior = `T${nTier - 1} refinado`;
  const margemStr = `${(resultado.margem * 100).toFixed(2)}%`;
  const margemEstoqueTotalStr = `${(
    resultado.margem_sobre_estoque_total * 100
  ).toFixed(2)}%`;

  const payload = {
    resultado,
    comprar: {
      estoque_bruto_inicial: estoque_bruto,
      estoque_ref_anterior_inicial: estoque_ref_anterior,
      label_ref_anterior: labelRefAnterior,
      tier_bruto_label: `${tier.toUpperCase()} bruto`,
    },
    formatted: {
      lucro: formatarCompacto(resultado.lucro),
      margem: margemStr,
      lucro_sobre_estoque_total: formatarCompacto(
        resultado.lucro_sobre_estoque_total,
      ),
      margem_sobre_estoque_total: margemEstoqueTotalStr,
      valor_total_estoque: formatarCompacto(resultado.valor_total_estoque),
      custo_inicial: formatarCompacto(resultado.custo_inicial),
      custo_consumido: formatarCompacto(resultado.custo_consumido),
      taxa_estacao: formatarCompacto(resultado.taxa_estacao),
      receita_bruta: formatarCompacto(resultado.receita_bruta),
      receita_liquida: formatarCompacto(resultado.receita_liquida),
      total_refinado_estimado: resultado.total_refinado_estimado.toFixed(2),
      crafts_estimados: resultado.crafts_estimados.toFixed(2),
      retorno_total_bruto: resultado.retorno_total_bruto.toFixed(2),
      retorno_total_ref_anterior:
        resultado.retorno_total_ref_anterior.toFixed(2),
      consumo_efetivo_bruto: resultado.consumo_efetivo_bruto.toFixed(2),
      consumo_efetivo_ref_anterior:
        resultado.consumo_efetivo_ref_anterior.toFixed(2),
      sobra_bruto_estimado: resultado.sobra_bruto_estimado.toFixed(2),
      sobra_ref_anterior_estimado:
        resultado.sobra_ref_anterior_estimado.toFixed(2),
      valor_sobra_bruto: formatarCompacto(resultado.valor_sobra_bruto),
      valor_sobra_ref_anterior: formatarCompacto(
        resultado.valor_sobra_ref_anterior,
      ),
      valor_sobra: formatarCompacto(resultado.valor_sobra),
    },
  };

  return NextResponse.json(payload);
}
