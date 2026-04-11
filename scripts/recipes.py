# Receitas de refino por tier
# raw_qty = quantidade de recursos brutos do tier atual
# prev_qty = quantidade de refinados do tier anterior
RECIPES = {
    "T3": {"raw_qty": 2, "prev_qty": 1},
    "T4": {"raw_qty": 2, "prev_qty": 1},
    "T5": {"raw_qty": 3, "prev_qty": 1},
    "T6": {"raw_qty": 4, "prev_qty": 1},
    "T7": {"raw_qty": 5, "prev_qty": 1},
    "T8": {"raw_qty": 5, "prev_qty": 1},
}


def get_recipe(tier):
    """Retorna a receita do tier ou None se não existir."""
    return RECIPES.get(tier.upper())
