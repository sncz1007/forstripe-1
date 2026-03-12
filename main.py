import os
import json
import requests
from rich.console import Console
from rich.panel import Panel

console = Console()

# Leer token desde secrets de Replit
TOKEN = os.getenv("EFIPAY_TEST_KEY")

if not TOKEN:
    console.print("[bold red]ERROR: No se encontró el secret EFIPAY_TEST_KEY.[/bold red]")
    console.print("[yellow]Ve a Replit → Secrets → agrega key=EFIPAY_TEST_KEY value=tu_token[/yellow]")
    exit(1)

# Configuración principal
# Posible base URL: https://sag.efipay.co o https://api.efipay.co
BASE_URL = "https://sag.efipay.co"
MONEDA = "CLP"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}


def mostrar_respuesta(resp: requests.Response):
    """Muestra el status code y el JSON de la respuesta con colores."""
    if resp.ok:
        console.print(f"[bold green]✅ {resp.status_code} OK[/bold green]")
    elif resp.status_code == 401:
        console.print(f"[bold red]❌ 401 - No autorizado (token inválido o expirado)[/bold red]")
    elif resp.status_code == 400:
        console.print(f"[bold yellow]⚠️  400 - Datos incorrectos[/bold yellow]")
    elif resp.status_code == 404:
        console.print(f"[bold magenta]🔍 404 - Endpoint no encontrado[/bold magenta]")
    elif resp.status_code == 405:
        console.print(f"[bold yellow]⚠️  405 - Método no permitido[/bold yellow]")
    else:
        console.print(f"[bold red]❌ {resp.status_code} - Error[/bold red]")

    try:
        datos = resp.json()
        console.print_json(json.dumps(datos, indent=2, ensure_ascii=False))
    except Exception:
        console.print(f"[dim]Respuesta sin JSON:[/dim] {resp.text[:500]}")


def opcion_probar_conexion():
    """Prueba la conexión básica al API con varios endpoints posibles."""
    console.print("\n[cyan]→ Probando conexión con Efipay...[/cyan]")
    # Posibles endpoints según docs: /api/v1/merchant, /api/v1/me, /api/v1/profile, /v1/me
    endpoints_a_probar = [
        "/api/v1/merchant",
        "/api/v1/me",
        "/api/v1/profile",
        "/v1/merchant",
        "/v1/me",
        "/api/v1/account",
    ]
    for ep in endpoints_a_probar:
        url = BASE_URL + ep
        console.print(f"  Probando: [dim]{url}[/dim]")
        try:
            resp = requests.get(url, headers=HEADERS, timeout=10)
            if resp.status_code != 404:
                mostrar_respuesta(resp)
                return
        except requests.RequestException as e:
            console.print(f"  [red]Error de conexión: {e}[/red]")
            return
    console.print("[yellow]Ningún endpoint de perfil devolvió 200. Revisa la base URL o los endpoints.[/yellow]")


def opcion_crear_pago():
    """Crea un link de pago / checkout en CLP."""
    console.print("\n[cyan]→ Crear link de pago en CLP[/cyan]")

    try:
        monto_str = input("  Monto en CLP (ej: 15000): ").strip()
        monto = int(monto_str)
    except ValueError:
        console.print("[red]Monto inválido. Ingresa un número entero.[/red]")
        return

    nombre = input("  Nombre del pagador: ").strip() or "Cliente Replit"
    email = input("  Email del pagador: ").strip() or "prueba@replit.com"

    body = {
        "amount": monto,
        "currency": MONEDA,
        "description": "Prueba Replit - Pago en CLP",
        "payer": {
            "name": nombre,
            "email": email,
        },
        "redirect_url": "https://tu-sitio.com/exito",
        "cancel_url": "https://tu-sitio.com/cancelado",
    }

    # Posibles endpoints según docs de Efipay:
    # /api/v1/payment/transaction-checkout
    # /api/v1/payment/generate-payment
    # /api/v1/checkout
    # /api/v1/transactions
    endpoints_a_probar = [
        "/api/v1/payment/transaction-checkout",
        "/api/v1/payment/generate-payment",
        "/api/v1/checkout",
        "/api/v1/transactions",
        "/api/v1/payment-links",
    ]

    console.print(f"\n  [dim]Payload:[/dim]")
    console.print_json(json.dumps(body, indent=2))

    for ep in endpoints_a_probar:
        url = BASE_URL + ep
        console.print(f"\n  Probando POST: [dim]{url}[/dim]")
        try:
            resp = requests.post(url, headers=HEADERS, json=body, timeout=10)
            if resp.status_code != 404 and resp.status_code != 405:
                mostrar_respuesta(resp)
                # Intentar imprimir la URL de pago si existe
                if resp.ok:
                    datos = resp.json()
                    url_pago = (
                        datos.get("payment_url")
                        or datos.get("checkout_url")
                        or datos.get("url")
                        or datos.get("data", {}).get("url")
                        or datos.get("data", {}).get("payment_url")
                    )
                    if url_pago:
                        console.print(f"\n[bold green]🔗 URL de pago:[/bold green] {url_pago}")
                return
        except requests.RequestException as e:
            console.print(f"  [red]Error de conexión: {e}[/red]")
            return

    console.print("[yellow]Ningún endpoint de pago respondió correctamente. Ajusta los endpoints en el código.[/yellow]")


def opcion_consultar_transaccion():
    """Consulta el estado de una transacción por ID o referencia."""
    console.print("\n[cyan]→ Consultar transacción[/cyan]")
    tx_id = input("  Ingresa el ID o referencia de la transacción: ").strip()
    if not tx_id:
        console.print("[red]El ID no puede estar vacío.[/red]")
        return

    # Posibles endpoints según docs de Efipay:
    # /api/v1/transactions/{id}
    # /api/v1/payment/status/{id}
    # /api/v1/payment/{id}
    endpoints_a_probar = [
        f"/api/v1/transactions/{tx_id}",
        f"/api/v1/payment/status/{tx_id}",
        f"/api/v1/payment/{tx_id}",
        f"/api/v1/checkout/{tx_id}",
    ]

    for ep in endpoints_a_probar:
        url = BASE_URL + ep
        console.print(f"  Probando: [dim]{url}[/dim]")
        try:
            resp = requests.get(url, headers=HEADERS, timeout=10)
            if resp.status_code != 404:
                mostrar_respuesta(resp)
                return
        except requests.RequestException as e:
            console.print(f"  [red]Error de conexión: {e}[/red]")
            return

    console.print("[yellow]Transacción no encontrada en ningún endpoint conocido.[/yellow]")


def mostrar_menu():
    """Muestra el menú principal."""
    console.print(Panel(
        "[bold cyan]Tester Efipay - Modo pruebas - Pesos Chilenos (CLP) - Token desde Replit Secrets[/bold cyan]\n"
        f"[dim]Base URL:[/dim] {BASE_URL}\n"
        f"[dim]Moneda:[/dim] {MONEDA}\n"
        f"[dim]Token:[/dim] {TOKEN[:15]}...",
        title="[bold green]EFIPAY API TESTER[/bold green]",
        border_style="green"
    ))
    console.print("\n[bold]Opciones disponibles:[/bold]")
    console.print("  [yellow]1[/yellow] - Probar conexión básica (perfil/merchant)")
    console.print("  [yellow]2[/yellow] - Crear link de pago en CLP")
    console.print("  [yellow]3[/yellow] - Consultar estado de transacción")
    console.print("  [yellow]4[/yellow] - Salir\n")


def main():
    opciones = {
        "1": opcion_probar_conexion,
        "2": opcion_crear_pago,
        "3": opcion_consultar_transaccion,
    }

    while True:
        mostrar_menu()
        try:
            eleccion = input("Elige una opción (1-4): ").strip()
        except (KeyboardInterrupt, EOFError):
            console.print("\n[bold red]Saliendo...[/bold red]")
            break

        if eleccion == "4":
            console.print("\n[bold green]¡Hasta luego![/bold green]")
            break
        elif eleccion in opciones:
            try:
                opciones[eleccion]()
            except Exception as e:
                console.print(f"\n[bold red]Error inesperado: {e}[/bold red]")
        else:
            console.print("[red]Opción no válida. Elige entre 1 y 4.[/red]")

        input("\nPresiona Enter para continuar...")


if __name__ == "__main__":
    main()

# ─────────────────────────────────────────────────────────────────
# INSTRUCCIONES PARA REPLIT:
# 1. Ve a Secrets (ícono 🔒 en el panel izquierdo)
#    → Agrega key=EFIPAY_TEST_KEY  value=tu_token_de_prueba
# 2. Instala dependencias en la Shell:
#    pip install requests rich
# 3. Corre el script:
#    python main.py
# ─────────────────────────────────────────────────────────────────
