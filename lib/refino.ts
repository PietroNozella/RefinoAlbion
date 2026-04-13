/**
 * Espelha calculator.py, recipes.py e formatting.py — manter em sincronia.
 */

export const RETORNO = 0.367;
export const RETORNO_FOCO = 0.54;
export const TAXA_MERCADO = 0.065;
export const TAXA_MERCADO_SEM_PREMIUM = 0.105;

const RECIPES: Record<string, { raw_qty: number; prev_qty: number }> = {
  T3: { raw_qty: 2, prev_qty: 1 },
  T4: { raw_qty: 2, prev_qty: 1 },
  T5: { raw_qty: 3, prev_qty: 1 },
  T6: { raw_qty: 4, prev_qty: 1 },
  T7: { raw_qty: 5, prev_qty: 1 },
  T8: { raw_qty: 5, prev_qty: 1 },
};

export function getRecipe(tier: string) {
  return RECIPES[tier.toUpperCase()] ?? null;
}

export function formatarCompacto(n: number): string {
  const neg = n < 0;
  const sign = neg ? "-" : "";
  const x = Math.abs(Number(n));

  if (x >= 1_000_000_000) {
    const v = x / 1_000_000_000;
    return formatScaled(sign, v, "B");
  }
  if (x >= 1_000_000) {
    const v = x / 1_000_000;
    return formatScaled(sign, v, "M");
  }
  if (x >= 1_000) {
    const v = x / 1_000;
    return formatScaled(sign, v, "k");
  }
  return n.toFixed(2);
}

function formatScaled(sign: string, v: number, suf: string): string {
  if (Math.abs(v - Math.round(v)) < 1e-9) {
    return `${sign}${Math.round(v)}${suf}`;
  }
  let texto = v.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${sign}${texto}${suf}`;
}

export type ResultadoRefino = {
  tier: string;
  quantidade: number;
  custo_bruto: number;
  custo_liquido: number;
  receita_bruta: number;
  receita_liquida: number;
  lucro: number;
  margem: number;
};

export function calculateRefiningProfit(
  tier: string,
  precoBruto: number,
  precoRefinadoAnterior: number,
  precoVendaRefinado: number,
  quantidade: number,
  retorno: number = RETORNO,
  taxaMercado: number = TAXA_MERCADO,
): ResultadoRefino {
  const recipe = getRecipe(tier);
  if (!recipe) {
    throw new Error(`Tier inválido: ${tier}`);
  }
  const { raw_qty, prev_qty } = recipe;

  const custoBrutoVal =
    raw_qty * precoBruto * quantidade +
    prev_qty * precoRefinadoAnterior * quantidade;
  const custoLiquido = custoBrutoVal * (1 - retorno);

  const receitaBruta = precoVendaRefinado * quantidade;
  const receitaLiquida = receitaBruta * (1 - taxaMercado);

  const lucro = receitaLiquida - custoLiquido;
  const margem = custoLiquido > 0 ? lucro / custoLiquido : 0;

  return {
    tier: tier.toUpperCase(),
    quantidade,
    custo_bruto: custoBrutoVal,
    custo_liquido: custoLiquido,
    receita_bruta: receitaBruta,
    receita_liquida: receitaLiquida,
    lucro,
    margem,
  };
}

export type SimulacaoEstoque = {
  craftsEstimados: number;
  totalRefinado: number;
  totalRefinadoEstimado: number;
  retornoTotalBruto: number;
  retornoTotalRefAnterior: number;
  consumoTotalBruto: number;
  consumoTotalRefAnterior: number;
  sobraBruto: number;
  sobraRefAnterior: number;
};

/** Estima re-refino por consumo líquido esperado (sem floor por craft). */
export function simularRefinoPorEstoque(
  tier: string,
  estoqueBruto: number,
  estoqueRefAnterior: number,
  retorno: number,
): SimulacaoEstoque {
  const recipe = getRecipe(tier);
  if (!recipe) {
    throw new Error(`Tier inválido: ${tier}`);
  }
  if (retorno < 0 || retorno >= 1) {
    throw new Error("Retorno inválido para estimativa");
  }

  const { raw_qty, prev_qty } = recipe;
  const consumoLiquidoBruto = raw_qty * (1 - retorno);
  const consumoLiquidoPrev = prev_qty * (1 - retorno);

  if (consumoLiquidoBruto <= 0 || consumoLiquidoPrev <= 0) {
    throw new Error("Consumo líquido inválido para estimativa");
  }

  const craftsEstimados = Math.min(
    estoqueBruto / consumoLiquidoBruto,
    estoqueRefAnterior / consumoLiquidoPrev,
  );
  const craftsValidos = Number.isFinite(craftsEstimados)
    ? Math.max(0, craftsEstimados)
    : 0;

  const totalRefinado = Math.floor(craftsValidos);
  const totalRefinadoEstimado = craftsValidos;
  const consumoTotalBruto = totalRefinadoEstimado * raw_qty;
  const consumoTotalRefAnterior = totalRefinadoEstimado * prev_qty;
  const retornoTotalBruto = consumoTotalBruto * retorno;
  const retornoTotalRefAnterior = consumoTotalRefAnterior * retorno;
  const sobraBruto = Math.max(0, estoqueBruto - consumoLiquidoBruto * craftsValidos);
  const sobraRefAnterior = Math.max(
    0,
    estoqueRefAnterior - consumoLiquidoPrev * craftsValidos,
  );

  return {
    craftsEstimados: craftsValidos,
    totalRefinado,
    totalRefinadoEstimado,
    retornoTotalBruto,
    retornoTotalRefAnterior,
    consumoTotalBruto,
    consumoTotalRefAnterior,
    sobraBruto,
    sobraRefAnterior,
  };
}

export type ResultadoRefinoEstoque = {
  tier: string;
  total_refinado: number;
  total_refinado_estimado: number;
  crafts_estimados: number;
  retorno_total_bruto: number;
  retorno_total_ref_anterior: number;
  sobra_bruto_estimado: number;
  sobra_ref_anterior_estimado: number;
  custo_inicial: number;
  receita_bruta: number;
  receita_liquida: number;
  lucro: number;
  margem: number;
};

export function calculateRefiningProfitFromStock(
  tier: string,
  estoqueBruto: number,
  estoqueRefAnterior: number,
  precoBruto: number,
  precoRefinadoAnterior: number,
  precoVendaRefinado: number,
  retorno: number = RETORNO,
  taxaMercado: number = TAXA_MERCADO,
): { sim: SimulacaoEstoque; resultado: ResultadoRefinoEstoque } {
  const sim = simularRefinoPorEstoque(
    tier,
    estoqueBruto,
    estoqueRefAnterior,
    retorno,
  );
  const custo_inicial =
    estoqueBruto * precoBruto + estoqueRefAnterior * precoRefinadoAnterior;
  const receita_bruta = precoVendaRefinado * sim.totalRefinadoEstimado;
  const receita_liquida = receita_bruta * (1 - taxaMercado);
  const lucro = receita_liquida - custo_inicial;
  const margem = custo_inicial > 0 ? lucro / custo_inicial : 0;

  return {
    sim,
    resultado: {
      tier: tier.toUpperCase(),
      total_refinado: sim.totalRefinado,
      total_refinado_estimado: sim.totalRefinadoEstimado,
      crafts_estimados: sim.craftsEstimados,
      retorno_total_bruto: sim.retornoTotalBruto,
      retorno_total_ref_anterior: sim.retornoTotalRefAnterior,
      sobra_bruto_estimado: sim.sobraBruto,
      sobra_ref_anterior_estimado: sim.sobraRefAnterior,
      custo_inicial,
      receita_bruta,
      receita_liquida,
      lucro,
      margem,
    },
  };
}
