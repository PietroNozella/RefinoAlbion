from recipes import get_recipe

# Constantes do sistema
RETORNO = 0.367
RETORNO_FOCO = 0.54
TAXA_MERCADO = 0.065
TAXA_MERCADO_SEM_PREMIUM = 0.105
TAXA_ESTACAO = 0.0


def calcular_custo_bruto(raw_qty, preco_bruto, prev_qty, preco_refinado_anterior, quantidade):
    """Custo total dos materiais sem considerar retorno."""
    custo_raw = raw_qty * preco_bruto * quantidade
    custo_prev = prev_qty * preco_refinado_anterior * quantidade
    return custo_raw + custo_prev


def aplicar_retorno(custo_bruto, retorno=RETORNO):
    """Custo líquido após descontar o retorno de materiais."""
    return custo_bruto * (1 - retorno)


def calcular_receita(preco_venda_refinado, quantidade, taxa_mercado=TAXA_MERCADO):
    """Retorna receita bruta e líquida (após taxa do mercado)."""
    receita_bruta = preco_venda_refinado * quantidade
    receita_liquida = receita_bruta * (1 - taxa_mercado)
    return receita_bruta, receita_liquida


def calculate_refining_profit(
    tier,
    preco_bruto,
    preco_refinado_anterior,
    preco_venda_refinado,
    quantidade,
    retorno=RETORNO,
    taxa_mercado=TAXA_MERCADO,
):
    """Calcula lucro e margem do refino para um tier específico."""
    recipe = get_recipe(tier)
    if recipe is None:
        raise ValueError(f"Tier inválido: {tier}")

    raw_qty = recipe["raw_qty"]
    prev_qty = recipe["prev_qty"]

    # Custo dos materiais
    custo_bruto = calcular_custo_bruto(
        raw_qty, preco_bruto, prev_qty, preco_refinado_anterior, quantidade
    )
    custo_liquido = aplicar_retorno(custo_bruto, retorno)

    # Receita da venda
    receita_bruta, receita_liquida = calcular_receita(
        preco_venda_refinado, quantidade, taxa_mercado
    )

    # Lucro e margem
    lucro = receita_liquida - custo_liquido
    margem = lucro / custo_liquido if custo_liquido > 0 else 0

    return {
        "tier": tier.upper(),
        "quantidade": quantidade,
        "custo_bruto": custo_bruto,
        "custo_liquido": custo_liquido,
        "receita_bruta": receita_bruta,
        "receita_liquida": receita_liquida,
        "lucro": lucro,
        "margem": margem,
    }
