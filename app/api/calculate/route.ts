import { NextResponse } from "next/server";
import {
  RETORNO,
  RETORNO_FOCO,
  TAXA_MERCADO,
  TAXA_MERCADO_SEM_PREMIUM,
  calculateRefiningProfit,
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
  let usar_foco: boolean;
  let premium: boolean;

  try {
    tier = String(data.tier ?? "").trim();
    preco_bruto = Number(data.preco_bruto);
    preco_refinado_anterior = Number(data.preco_refinado_anterior);
    preco_venda_refinado = Number(data.preco_venda_refinado);
    quantidade = Math.trunc(Number(data.quantidade));
    usar_foco = Boolean(data.usar_foco);
    premium = data.premium !== undefined ? Boolean(data.premium) : true;
    if (
      Number.isNaN(preco_bruto) ||
      Number.isNaN(preco_refinado_anterior) ||
      Number.isNaN(preco_venda_refinado) ||
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

  const retorno = usar_foco ? RETORNO_FOCO : RETORNO;
  const taxa_mercado = premium ? TAXA_MERCADO : TAXA_MERCADO_SEM_PREMIUM;

  let resultado;
  try {
    resultado = calculateRefiningProfit(
      tier,
      preco_bruto,
      preco_refinado_anterior,
      preco_venda_refinado,
      quantidade,
      retorno,
      taxa_mercado,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const qtdSaida = quantidade;
  const recipe = getRecipe(tier);
  if (!recipe) {
    return NextResponse.json({ error: `Tier inválido: ${tier}` }, { status: 400 });
  }

  const tUp = tier.toUpperCase();
  const nTier =
    tUp.startsWith("T") && tUp.length > 1 ? parseInt(tUp.slice(1), 10) : 0;
  const labelRefAnterior = `T${nTier - 1} refinado`;
  const qtdBruto = recipe.raw_qty * qtdSaida;
  const qtdRefAnterior = recipe.prev_qty * qtdSaida;

  const margemStr = `${(resultado.margem * 100).toFixed(2)}%`;

  const payload = {
    resultado,
    comprar: {
      qtd_bruto: qtdBruto,
      qtd_ref_anterior: qtdRefAnterior,
      label_ref_anterior: labelRefAnterior,
      tier_bruto_label: `${tier.toUpperCase()} bruto`,
    },
    formatted: {
      lucro: formatarCompacto(resultado.lucro),
      margem: margemStr,
      custo_bruto: formatarCompacto(resultado.custo_bruto),
      custo_liquido: formatarCompacto(resultado.custo_liquido),
      receita_bruta: formatarCompacto(resultado.receita_bruta),
      receita_liquida: formatarCompacto(resultado.receita_liquida),
    },
  };

  return NextResponse.json(payload);
}
