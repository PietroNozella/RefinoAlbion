/**
 * Espelha calculator.py, recipes.py e formatting.py — manter em sincronia.
 */

export const PRODUCTION_BONUS_SEM_FOCO = 58;
export const PRODUCTION_BONUS_COM_FOCO = 117.3913043478261;
export const RETORNO = rrrFromBonus(PRODUCTION_BONUS_SEM_FOCO);
export const RETORNO_FOCO = rrrFromBonus(PRODUCTION_BONUS_COM_FOCO);
export const TAXA_MERCADO = 0.065;
export const TAXA_MERCADO_SEM_PREMIUM = 0.105;
export const TAXA_ESTACAO_PADRAO = 0;

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

export type MaterialCostInput = {
  qty: number;
  price: number;
};

export function rrrFromBonus(productionBonusPercent: number): number {
  return 1 - 1 / (1 + productionBonusPercent / 100);
}

export function effectiveMaterialCost(
  recipe: MaterialCostInput[],
  rrr: number,
): number {
  return recipe.reduce(
    (total, item) => total + item.qty * item.price * (1 - rrr),
    0,
  );
}

export function focusCost(baseFocusCost: number, focusEfficiency: number): number {
  return Math.ceil(baseFocusCost * 0.5 ** (focusEfficiency / 10000));
}

export function silverPerFocus(extraProfitFromFocus: number, focusSpent: number): number {
  if (focusSpent <= 0) {
    return 0;
  }
  return extraProfitFromFocus / focusSpent;
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
  materiais: MaterialBreakdown[];
  taxa_estacao: number;
  receita_bruta: number;
  receita_liquida: number;
  lucro: number;
  margem: number;
};

export type MaterialBreakdown = {
  tipo: "raw" | "previous";
  quantidade_por_item: number;
  quantidade_necessaria: number;
  preco_unitario: number;
  custo_bruto: number;
  quantidade_retornada: number;
  quantidade_consumida: number;
  custo_efetivo: number;
};

export function calculateRefiningProfit(
  tier: string,
  precoBruto: number,
  precoRefinadoAnterior: number,
  precoVendaRefinado: number,
  quantidade: number,
  retorno: number = RETORNO,
  taxaMercado: number = TAXA_MERCADO,
  taxaEstacaoPorItem: number = TAXA_ESTACAO_PADRAO,
): ResultadoRefino {
  const recipe = getRecipe(tier);
  if (!recipe) {
    throw new Error(`Tier inválido: ${tier}`);
  }
  const { raw_qty, prev_qty } = recipe;

  const materialRecipe = [
    { qty: raw_qty, price: precoBruto },
    { qty: prev_qty, price: precoRefinadoAnterior },
  ];
  const custoBrutoVal =
    raw_qty * precoBruto * quantidade +
    prev_qty * precoRefinadoAnterior * quantidade;
  const custoLiquido =
    effectiveMaterialCost(materialRecipe, retorno) * quantidade;
  const materiais: MaterialBreakdown[] = [
    buildMaterialBreakdown("raw", raw_qty, precoBruto, quantidade, retorno),
    buildMaterialBreakdown(
      "previous",
      prev_qty,
      precoRefinadoAnterior,
      quantidade,
      retorno,
    ),
  ];

  const receitaBruta = precoVendaRefinado * quantidade;
  const receitaLiquida = receitaBruta * (1 - taxaMercado);
  const taxaEstacao = quantidade * taxaEstacaoPorItem;

  const lucro = receitaLiquida - custoLiquido - taxaEstacao;
  const margem = custoLiquido > 0 ? lucro / custoLiquido : 0;

  return {
    tier: tier.toUpperCase(),
    quantidade,
    custo_bruto: custoBrutoVal,
    custo_liquido: custoLiquido,
    materiais,
    taxa_estacao: taxaEstacao,
    receita_bruta: receitaBruta,
    receita_liquida: receitaLiquida,
    lucro,
    margem,
  };
}

function buildMaterialBreakdown(
  tipo: MaterialBreakdown["tipo"],
  quantidadePorItem: number,
  precoUnitario: number,
  quantidade: number,
  retorno: number,
): MaterialBreakdown {
  const quantidadeNecessaria = quantidadePorItem * quantidade;
  const quantidadeRetornada = quantidadeNecessaria * retorno;
  const quantidadeConsumida = quantidadeNecessaria * (1 - retorno);

  return {
    tipo,
    quantidade_por_item: quantidadePorItem,
    quantidade_necessaria: quantidadeNecessaria,
    preco_unitario: precoUnitario,
    custo_bruto: quantidadeNecessaria * precoUnitario,
    quantidade_retornada: quantidadeRetornada,
    quantidade_consumida: quantidadeConsumida,
    custo_efetivo: quantidadeConsumida * precoUnitario,
  };
}

export type ComparacaoRefino = {
  withoutFocus: ResultadoRefino;
  withFocus: ResultadoRefino;
  extraProfitFromFocus: number;
  focusCostPerItem: number;
  totalFocusSpent: number;
  silverPerFocus: number;
};

export function compareRefiningProfit(
  tier: string,
  precoBruto: number,
  precoRefinadoAnterior: number,
  precoVendaRefinado: number,
  quantidade: number,
  taxaMercado: number = TAXA_MERCADO,
  taxaEstacaoPorItem: number = TAXA_ESTACAO_PADRAO,
  baseFocusCost: number = 0,
  focusEfficiency: number = 0,
  productionBonusWithoutFocus: number = PRODUCTION_BONUS_SEM_FOCO,
  productionBonusWithFocus: number = PRODUCTION_BONUS_COM_FOCO,
): ComparacaoRefino {
  const withoutFocus = calculateRefiningProfit(
    tier,
    precoBruto,
    precoRefinadoAnterior,
    precoVendaRefinado,
    quantidade,
    rrrFromBonus(productionBonusWithoutFocus),
    taxaMercado,
    taxaEstacaoPorItem,
  );
  const withFocus = calculateRefiningProfit(
    tier,
    precoBruto,
    precoRefinadoAnterior,
    precoVendaRefinado,
    quantidade,
    rrrFromBonus(productionBonusWithFocus),
    taxaMercado,
    taxaEstacaoPorItem,
  );
  const focusCostPerItem = focusCost(baseFocusCost, focusEfficiency);
  const totalFocusSpent = focusCostPerItem * quantidade;

  const extraProfitFromFocus = withFocus.lucro - withoutFocus.lucro;

  return {
    withoutFocus,
    withFocus,
    extraProfitFromFocus,
    focusCostPerItem,
    totalFocusSpent,
    silverPerFocus: silverPerFocus(extraProfitFromFocus, totalFocusSpent),
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

export function calculateRefiningProfitFromStock(
  tier: string,
  estoqueBruto: number,
  estoqueRefAnterior: number,
  precoBruto: number,
  precoRefinadoAnterior: number,
  precoVendaRefinado: number,
  retorno: number = RETORNO,
  taxaMercado: number = TAXA_MERCADO,
  taxaEstacaoPorItem: number = TAXA_ESTACAO_PADRAO,
): { sim: SimulacaoEstoque; resultado: ResultadoRefinoEstoque } {
  const sim = simularRefinoPorEstoque(
    tier,
    estoqueBruto,
    estoqueRefAnterior,
    retorno,
  );
  const custo_inicial =
    estoqueBruto * precoBruto + estoqueRefAnterior * precoRefinadoAnterior;
  const consumo_efetivo_bruto = sim.consumoTotalBruto * (1 - retorno);
  const consumo_efetivo_ref_anterior =
    sim.consumoTotalRefAnterior * (1 - retorno);
  const custo_consumido =
    consumo_efetivo_bruto * precoBruto +
    consumo_efetivo_ref_anterior * precoRefinadoAnterior;
  const valor_sobra_bruto = sim.sobraBruto * precoBruto;
  const valor_sobra_ref_anterior =
    sim.sobraRefAnterior * precoRefinadoAnterior;
  const valor_sobra = valor_sobra_bruto + valor_sobra_ref_anterior;
  const valor_total_estoque = custo_inicial;
  const receita_bruta = precoVendaRefinado * sim.totalRefinadoEstimado;
  const receita_liquida = receita_bruta * (1 - taxaMercado);
  const taxa_estacao = sim.totalRefinadoEstimado * taxaEstacaoPorItem;
  const lucro = receita_liquida - custo_consumido - taxa_estacao;
  const margem = custo_consumido > 0 ? lucro / custo_consumido : 0;
  const lucro_sobre_estoque_total =
    receita_liquida + valor_sobra - valor_total_estoque - taxa_estacao;
  const margem_sobre_estoque_total =
    valor_total_estoque > 0
      ? lucro_sobre_estoque_total / valor_total_estoque
      : 0;

  return {
    sim,
    resultado: {
      tier: tier.toUpperCase(),
      total_refinado: sim.totalRefinado,
      total_refinado_estimado: sim.totalRefinadoEstimado,
      crafts_estimados: sim.craftsEstimados,
      retorno_total_bruto: sim.retornoTotalBruto,
      retorno_total_ref_anterior: sim.retornoTotalRefAnterior,
      consumo_efetivo_bruto,
      consumo_efetivo_ref_anterior,
      sobra_bruto_estimado: sim.sobraBruto,
      sobra_ref_anterior_estimado: sim.sobraRefAnterior,
      valor_sobra_bruto,
      valor_sobra_ref_anterior,
      valor_sobra,
      valor_total_estoque,
      custo_inicial,
      custo_consumido,
      taxa_estacao,
      receita_bruta,
      receita_liquida,
      lucro,
      margem,
      lucro_sobre_estoque_total,
      margem_sobre_estoque_total,
    },
  };
}
