"""Vercel Serverless: POST /api/calculate — delega para calculator.py."""
from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from calculator import (  # noqa: E402
    RETORNO,
    RETORNO_FOCO,
    TAXA_MERCADO,
    TAXA_MERCADO_SEM_PREMIUM,
    calculate_refining_profit,
)
from formatting import formatar_compacto  # noqa: E402
from recipes import get_recipe  # noqa: E402


def _json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        return

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self) -> None:
        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length) if length else b"{}"
            data = json.loads(raw.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            _json_response(self, 400, {"error": "JSON inválido"})
            return

        try:
            tier = str(data.get("tier", "")).strip()
            preco_bruto = float(data["preco_bruto"])
            preco_refinado_anterior = float(data["preco_refinado_anterior"])
            preco_venda_refinado = float(data["preco_venda_refinado"])
            quantidade = int(data["quantidade"])
            usar_foco = bool(data.get("usar_foco", False))
            premium = bool(data.get("premium", True))
        except (KeyError, TypeError, ValueError):
            _json_response(
                self,
                400,
                {"error": "Campos obrigatórios: tier, preco_bruto, preco_refinado_anterior, preco_venda_refinado, quantidade"},
            )
            return

        retorno = RETORNO_FOCO if usar_foco else RETORNO
        taxa_mercado = TAXA_MERCADO if premium else TAXA_MERCADO_SEM_PREMIUM

        try:
            resultado = calculate_refining_profit(
                tier,
                preco_bruto,
                preco_refinado_anterior,
                preco_venda_refinado,
                quantidade,
                retorno=retorno,
                taxa_mercado=taxa_mercado,
            )
        except ValueError as e:
            _json_response(self, 400, {"error": str(e)})
            return
        except Exception:
            _json_response(self, 500, {"error": "Erro interno"})
            return

        qtd_saida = int(quantidade)
        recipe = get_recipe(tier)
        if recipe is None:
            _json_response(self, 400, {"error": f"Tier inválido: {tier}"})
            return

        t_up = tier.upper()
        n_tier = int(t_up[1:]) if t_up.startswith("T") and len(t_up) > 1 else 0
        label_ref_anterior = f"T{n_tier - 1} refinado"
        qtd_bruto = recipe["raw_qty"] * qtd_saida
        qtd_ref_anterior = recipe["prev_qty"] * qtd_saida

        payload = {
            "resultado": resultado,
            "comprar": {
                "qtd_bruto": qtd_bruto,
                "qtd_ref_anterior": qtd_ref_anterior,
                "label_ref_anterior": label_ref_anterior,
                "tier_bruto_label": f"{tier.upper()} bruto",
            },
            "formatted": {
                "lucro": formatar_compacto(resultado["lucro"]),
                "margem": f"{resultado['margem']:.2%}",
                "custo_bruto": formatar_compacto(resultado["custo_bruto"]),
                "custo_liquido": formatar_compacto(resultado["custo_liquido"]),
                "receita_bruta": formatar_compacto(resultado["receita_bruta"]),
                "receita_liquida": formatar_compacto(resultado["receita_liquida"]),
            },
        }
        _json_response(self, 200, payload)
