from calculator import calculate_refining_profit
from formatting import formatar_compacto


def formatar_resultado(resultado):
    """Formata o resultado do cálculo para exibição no terminal."""
    return (
        f"\nTier: {resultado['tier']}\n"
        f"Quantidade: {resultado['quantidade']}\n"
        f"\n"
        f"Custo bruto: {formatar_compacto(resultado['custo_bruto'])}\n"
        f"Custo após retorno: {formatar_compacto(resultado['custo_liquido'])}\n"
        f"\n"
        f"Receita bruta: {formatar_compacto(resultado['receita_bruta'])}\n"
        f"Receita líquida: {formatar_compacto(resultado['receita_liquida'])}\n"
        f"\n"
        f"Lucro: {formatar_compacto(resultado['lucro'])}\n"
        f"Margem: {resultado['margem']:.2%}"
    )


def main():
    print("=== Calculadora de Refino - Albion Online ===\n")

    # Coleta de inputs
    tier = input("Tier (T3-T8): ").strip()
    preco_bruto = float(input("Preço do recurso bruto (tier atual): "))
    preco_refinado_anterior = float(input("Preço do refinado anterior: "))
    preco_venda_refinado = float(input("Preço de venda do refinado: "))
    quantidade = int(input("Quantidade a refinar: "))

    # Cálculo
    resultado = calculate_refining_profit(
        tier, preco_bruto, preco_refinado_anterior, preco_venda_refinado, quantidade
    )

    # Output formatado
    print(formatar_resultado(resultado))


if __name__ == "__main__":
    main()
