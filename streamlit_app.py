# Uso local: pip install -r requirements.txt && streamlit run streamlit_app.py
import streamlit as st

from calculator import calculate_refining_profit
from formatting import formatar_compacto
from recipes import get_recipe

TIER_OPTIONS = ["T3", "T4", "T5", "T6", "T7", "T8"]

st.set_page_config(page_title="Refino Albion", layout="centered")

st.title("Calculadora de Refino - Albion Online")
st.caption("Lucro e margem por lote refinado.")

tier = st.selectbox("Tier", TIER_OPTIONS, index=2)

c1, c2 = st.columns(2)
with c1:
    preco_bruto = st.number_input(
        "Preço recurso bruto",
        min_value=0.0,
        value=0.0,
        step=1.0,
        format="%.2f",
    )
    preco_refinado_anterior = st.number_input(
        "Preço refinado anterior",
        min_value=0.0,
        value=0.0,
        step=1.0,
        format="%.2f",
    )
with c2:
    preco_venda_refinado = st.number_input(
        "Valor produto refinado",
        min_value=0.0,
        value=0.0,
        step=1.0,
        format="%.2f",
    )
    quantidade = st.number_input(
        "Quantidade (refinado desejado)", min_value=1, value=1, step=1
    )

try:
    resultado = calculate_refining_profit(
        tier,
        preco_bruto,
        preco_refinado_anterior,
        preco_venda_refinado,
        int(quantidade),
    )
except ValueError as e:
    st.error(str(e))
    st.stop()

qtd_saida = int(quantidade)
recipe = get_recipe(tier)
n_tier = int(tier[1:])
label_ref_anterior = f"T{n_tier - 1} refinado"
qtd_bruto = recipe["raw_qty"] * qtd_saida
qtd_ref_anterior = recipe["prev_qty"] * qtd_saida

st.subheader("Comprar")
b1, b2 = st.columns(2)
b1.metric(f"{tier} bruto", f"{qtd_bruto}")
b2.metric(label_ref_anterior, f"{qtd_ref_anterior}")

st.subheader("Resultado")

m1, m2 = st.columns(2)
m1.metric("Lucro", formatar_compacto(resultado["lucro"]))
m2.metric("Margem", f"{resultado['margem']:.2%}")

st.write(
    f"**Tier:** {resultado['tier']} · **Quantidade:** {resultado['quantidade']}"
)

r1, r2 = st.columns(2)
with r1:
    st.metric("Custo bruto", formatar_compacto(resultado["custo_bruto"]))
    st.metric("Custo após retorno", formatar_compacto(resultado["custo_liquido"]))
with r2:
    st.metric("Receita bruta", formatar_compacto(resultado["receita_bruta"]))
    st.metric("Receita líquida", formatar_compacto(resultado["receita_liquida"]))
