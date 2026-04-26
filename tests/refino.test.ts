import assert from "node:assert/strict";

import {
  calculateRefiningProfit,
  calculateRefiningProfitFromStock,
  compareRefiningProfit,
  effectiveMaterialCost,
  focusCost,
  silverPerFocus,
  rrrFromBonus,
} from "../lib/refino";

function test(name: string, fn: () => void) {
  fn();
  console.log(`ok - ${name}`);
}

function assertClose(actual: number, expected: number, precision = 2) {
  assert.equal(Number(actual.toFixed(precision)), Number(expected.toFixed(precision)));
}

test("calcula RRR pela formula oficial de production bonus", () => {
  assert.equal(Number(rrrFromBonus(58).toFixed(4)), 0.3671);
});

test("calcula custo efetivo dos materiais com RRR", () => {
  const cost = effectiveMaterialCost(
    [
      { qty: 2, price: 100 },
      { qty: 1, price: 50 },
    ],
    rrrFromBonus(58),
  );

  assert.equal(Number(cost.toFixed(2)), 158.23);
});

test("calcula lucro basico sem foco usando custo efetivo", () => {
  const result = calculateRefiningProfit("T4", 100, 50, 250, 10, rrrFromBonus(58), 0);

  assert.equal(Number(result.custo_liquido.toFixed(2)), 1582.28);
  assert.equal(Number(result.receita_liquida.toFixed(2)), 2500);
  assert.equal(Number(result.lucro.toFixed(2)), 917.72);
});

test("detalha materiais necessarios, retornados e consumidos", () => {
  const result = calculateRefiningProfit("T4", 100, 50, 250, 10, rrrFromBonus(58), 0);
  const raw = result.materiais.find((material) => material.tipo === "raw");
  const previous = result.materiais.find((material) => material.tipo === "previous");

  assert.ok(raw);
  assert.ok(previous);
  assert.equal(raw.quantidade_necessaria, 20);
  assert.equal(Number(raw.quantidade_retornada.toFixed(2)), 7.34);
  assert.equal(Number(raw.quantidade_consumida.toFixed(2)), 12.66);
  assert.equal(Number(raw.custo_efetivo.toFixed(2)), 1265.82);
  assert.equal(previous.quantidade_necessaria, 10);
  assert.equal(Number(previous.quantidade_consumida.toFixed(2)), 6.33);
});

test("subtrai taxa de estacao por item do lucro", () => {
  const result = calculateRefiningProfit(
    "T4",
    100,
    50,
    250,
    10,
    rrrFromBonus(58),
    0,
    100,
  );

  assert.equal(result.taxa_estacao, 1000);
  assert.equal(Number(result.lucro.toFixed(2)), -82.28);
});

test("aplica taxa de mercado na receita liquida", () => {
  const result = calculateRefiningProfit("T4", 100, 50, 250, 10, rrrFromBonus(58), 0.065);

  assertClose(result.receita_bruta, 2500);
  assertClose(result.receita_liquida, 2337.5);
});

test("compara lucro sem foco e com foco no mesmo calculo", () => {
  const comparison = compareRefiningProfit("T4", 100, 50, 250, 10, 0, 100);

  assert.equal(Number(comparison.withoutFocus.lucro.toFixed(2)), -82.28);
  assert.equal(Number(comparison.withFocus.lucro.toFixed(2)), 350);
  assert.equal(
    Number(comparison.extraProfitFromFocus.toFixed(2)),
    Number((comparison.withFocus.lucro - comparison.withoutFocus.lucro).toFixed(2)),
  );
});

test("aceita bonus de producao customizado na comparacao", () => {
  const comparison = compareRefiningProfit(
    "T4",
    100,
    50,
    250,
    10,
    0,
    0,
    0,
    0,
    0,
    100,
  );

  assert.equal(Number(comparison.withoutFocus.custo_liquido.toFixed(2)), 2500);
  assert.equal(Number(comparison.withFocus.custo_liquido.toFixed(2)), 1250);
});

test("calcula custo de foco com eficiencia e arredonda para cima", () => {
  assert.equal(focusCost(1000, 10000), 500);
  assert.equal(focusCost(999, 5000), 707);
});

test("retorna foco por item e foco total na comparacao", () => {
  const comparison = compareRefiningProfit("T4", 100, 50, 250, 10, 0, 100, 999, 5000);

  assert.equal(comparison.focusCostPerItem, 707);
  assert.equal(comparison.totalFocusSpent, 7070);
});

test("calcula silver por foco usando lucro extra e foco gasto", () => {
  assert.equal(silverPerFocus(1000, 250), 4);
  assert.equal(silverPerFocus(1000, 0), 0);
});

test("retorna silver por foco na comparacao", () => {
  const comparison = compareRefiningProfit("T4", 100, 50, 250, 10, 0, 100, 999, 5000);

  assert.equal(
    Number(comparison.silverPerFocus.toFixed(4)),
    Number((comparison.extraProfitFromFocus / comparison.totalFocusSpent).toFixed(4)),
  );
});

test("cenario fixo T5 com taxa, estacao e foco", () => {
  const comparison = compareRefiningProfit(
    "T5",
    120,
    380,
    900,
    25,
    0.065,
    15,
    800,
    10000,
  );

  assertClose(comparison.withoutFocus.receita_liquida, 21037.5);
  assertClose(comparison.withoutFocus.custo_bruto, 18500);
  assertClose(comparison.withoutFocus.custo_liquido, 11708.86);
  assertClose(comparison.withoutFocus.taxa_estacao, 375);
  assertClose(comparison.withoutFocus.lucro, 8953.64);
  assertClose(comparison.withFocus.custo_liquido, 8510);
  assertClose(comparison.withFocus.lucro, 12152.5);
  assertClose(comparison.extraProfitFromFocus, 3198.86);
  assert.equal(comparison.focusCostPerItem, 400);
  assert.equal(comparison.totalFocusSpent, 10000);
  assertClose(comparison.silverPerFocus, 0.3199, 4);
});

test("lucro por estoque usa custo consumido e preserva valor da sobra", () => {
  const { resultado } = calculateRefiningProfitFromStock(
    "T4",
    20,
    10,
    100,
    50,
    250,
    rrrFromBonus(58),
    0,
    0,
  );

  assert.equal(Number(resultado.custo_consumido.toFixed(2)), 2500);
  assert.equal(Number(resultado.valor_total_estoque.toFixed(2)), 2500);
  assert.equal(Number(resultado.valor_sobra.toFixed(2)), 0);
  assert.equal(Number(resultado.lucro.toFixed(2)), 1450);
  assert.equal(
    Number(resultado.lucro_sobre_estoque_total.toFixed(2)),
    Number(resultado.lucro.toFixed(2)),
  );
});

test("estoque com sobra separa consumo, sobra e resultado total", () => {
  const { resultado } = calculateRefiningProfitFromStock(
    "T4",
    40,
    10,
    100,
    50,
    250,
    rrrFromBonus(58),
    0,
    10,
  );

  assertClose(resultado.total_refinado_estimado, 15.8);
  assertClose(resultado.consumo_efetivo_bruto, 20);
  assertClose(resultado.consumo_efetivo_ref_anterior, 10);
  assertClose(resultado.custo_consumido, 2500);
  assertClose(resultado.valor_sobra, 2000);
  assertClose(resultado.taxa_estacao, 158);
  assertClose(resultado.lucro, 1292);
  assertClose(resultado.lucro_sobre_estoque_total, 1292);
});
