def formatar_compacto(n: float) -> str:
    """Formata valores grandes de forma curta (ex.: 100_000 -> '100k')."""
    x = abs(float(n))
    neg = n < 0
    sign = "-" if neg else ""

    if x >= 1_000_000_000:
        v, suf = x / 1_000_000_000, "B"
    elif x >= 1_000_000:
        v, suf = x / 1_000_000, "M"
    elif x >= 1_000:
        v, suf = x / 1_000, "k"
    else:
        return f"{n:.2f}"

    if abs(v - round(v)) < 1e-9:
        return f"{sign}{int(round(v))}{suf}"
    texto = f"{v:.2f}".rstrip("0").rstrip(".")
    return f"{sign}{texto}{suf}"
