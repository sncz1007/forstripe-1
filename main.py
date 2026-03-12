# pip install requests rich
import json
import requests
from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich import print as rprint

# Configuración principal
BASE_URL = "https://api.efipay.co"
TOKEN = "746|BxUXfyKmVCtyhSbJpvEB2n5vmfz91zhaihLgZYgx9c6054e7"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

console = Console()


def mostrar_respuesta(resp: requests.Response):
    """Muestra el status code y el JSON de la respuesta de forma bonita."""
    if resp.ok:
        color = "green"
        estado = "✅ OK"
    elif resp.status_code == 401:
        color = "red"
        estado = "❌ 401 - No autorizado (token inválido)"
    elif resp.status_code == 400:
        color = "yellow"
        estado = "⚠️  400 - Datos incorrectos"
    elif resp.status_code == 404:
        color = "magenta"
        estado = "🔍 404 - Endpoint no encontrado"
    else:
        color = "red"
        estado = f"❌ {resp.status_code} - Error"

    console.print(f"\n[bold {color}]{estado}[/bold {color}]")
    try:
        datos = resp.json()
        console.print_json(json.dumps(datos, indent=2, ensure_ascii=False))
    except Exception:
        console.print(f"[dim]Respuesta sin JSON:[/dim] {resp.text[:500]}")


def opcion_info_comercio():
    """Obtiene información del comercio / cuenta asociada al token."""
    console.print("\n[cyan]→ Consultando información del comercio...[/cyan]")
    # Posibles endpoints: /v1/merchant, /v1/me, /v1/profile, /api/user
    endpoints = ["/v1/me", "/v1/merchant", "/v1/profile", "/api/user"]
    for ep in endpoints:
        try:
            url = BASE_URL + ep
            console.print(f"  Probando: [dim]{url}[/dim]")
            resp = requests.get(url, headers=HEADERS, timeout=10)
            if resp.status_code != 404:
                mostrar_respuesta(resp)
                return
        except requests.RequestException as e:
            console.print(f"  [red]Error de conexión en {ep}: {e}[/red]")
    console.print("[yellow]Ningún endpoint de perfil respondió con éxito. Ajusta los endpoints en el código.[/yellow]")


def opcion_listar_planes():
    """Lista los planes de suscripción existentes."""
    console.print("\n[cyan]→ Listando planes de suscripción...[/cyan]")
    # Posibles endpoints: /v1/plans, /v1/subscription-plans, /api/plans
    endpoints = ["/v1/plans", "/v1/subscription-plans", "/api/plans", "/v1/subscriptions/plans"]
    for ep in endpoints:
        try:
            url = BASE_URL + ep
            console.print(f"  Probando: [dim]{url}[/dim]")
            resp = requests.get(url, headers=HEADERS, timeout=10)
            if resp.status_code != 404:
                mostrar_respuesta(resp)
                return
        except requests.RequestException as e:
            console.print(f"  [red]Error de conexión en {ep}: {e}[/red]")
    console.print("[yellow]Ningún endpoint de planes respondió. Ajusta los endpoints en el código.[/yellow]")


def opcion_crear_plan():
    """Crea un plan de suscripción de prueba."""
    console.print("\n[cyan]→ Creando plan de suscripción de prueba...[/cyan]")
    body = {
        "name": "Plan Test Replit",
        "amount": 10000,
        "currency": "COP",
        "interval": "monthly",
        "interval_count": 1,
        "description": "Plan de prueba creado desde Replit",
        "trial_period_days": 0,
    }
    # Posibles endpoints: /v1/plans, /v1/subscription-plans, /api/plans
    endpoints = ["/v1/plans", "/v1/subscription-plans", "/api/plans"]
    for ep in endpoints:
        try:
            url = BASE_URL + ep
            console.print(f"  Probando POST a: [dim]{url}[/dim]")
            resp = requests.post(url, headers=HEADERS, json=body, timeout=10)
            if resp.status_code != 404:
                mostrar_respuesta(resp)
                return
        except requests.RequestException as e:
            console.print(f"  [red]Error de conexión en {ep}: {e}[/red]")
    console.print("[yellow]Ningún endpoint de creación de plan respondió. Ajusta los endpoints en el código.[/yellow]")


def opcion_crear_link_pago():
    """Crea un link de pago / checkout de una sola transacción."""
    console.print("\n[cyan]→ Creando link de pago (checkout)...[/cyan]")
    body = {
        "amount": 5000,
        "currency": "COP",
        "description": "Prueba desde Replit",
        "redirect_url": "https://replit.com",
        "cancel_url": "https://replit.com",
    }
    # Posibles endpoints: /v1/checkout, /v1/payment-links, /v1/transactions, /api/checkout
    endpoints = ["/v1/checkout", "/v1/payment-links", "/v1/transactions", "/api/checkout", "/v1/charges"]
    for ep in endpoints:
        try:
            url = BASE_URL + ep
            console.print(f"  Probando POST a: [dim]{url}[/dim]")
            resp = requests.post(url, headers=HEADERS, json=body, timeout=10)
            if resp.status_code != 404:
                mostrar_respuesta(resp)
                return
        except requests.RequestException as e:
            console.print(f"  [red]Error de conexión en {ep}: {e}[/red]")
    console.print("[yellow]Ningún endpoint de checkout respondió. Ajusta los endpoints en el código.[/yellow]")


def opcion_consultar_transaccion():
    """Consulta una transacción específica por ID."""
    console.print("\n[cyan]→ Consultar transacción[/cyan]")
    tx_id = input("  Ingresa el ID de la transacción: ").strip()
    if not tx_id:
        console.print("[red]ID no puede estar vacío.[/red]")
        return
    # Posibles endpoints: /v1/transactions/{id}, /v1/charges/{id}, /api/transactions/{id}
    endpoints = [
        f"/v1/transactions/{tx_id}",
        f"/v1/charges/{tx_id}",
        f"/api/transactions/{tx_id}",
        f"/v1/payment-links/{tx_id}",
    ]
    for ep in endpoints:
        try:
            url = BASE_URL + ep
            console.print(f"  Probando: [dim]{url}[/dim]")
            resp = requests.get(url, headers=HEADERS, timeout=10)
            if resp.status_code != 404:
                mostrar_respuesta(resp)
                return
        except requests.RequestException as e:
            console.print(f"  [red]Error de conexión en {ep}: {e}[/red]")
    console.print("[yellow]Transacción no encontrada en ningún endpoint conocido.[/yellow]")


def mostrar_menu():
    """Muestra el menú principal."""
    console.print(Panel(
        "[bold cyan]Tester de API Efipay - Modo Pruebas - Token sandbox activado[/bold cyan]\n"
        "[dim]Base URL:[/dim] " + BASE_URL + "\n"
        "[dim]Token:[/dim] " + TOKEN[:20] + "...",
        title="[bold green]EFIPAY API TESTER[/bold green]",
        border_style="green"
    ))
    console.print("\n[bold]Opciones disponibles:[/bold]")
    console.print("  [yellow]1[/yellow] - Información del comercio / mi cuenta")
    console.print("  [yellow]2[/yellow] - Listar planes de suscripción")
    console.print("  [yellow]3[/yellow] - Crear plan de suscripción de prueba")
    console.print("  [yellow]4[/yellow] - Crear link de pago / checkout")
    console.print("  [yellow]5[/yellow] - Consultar transacción por ID")
    console.print("  [yellow]6[/yellow] - Salir\n")


def main():
    """Función principal con menú interactivo."""
    opciones = {
        "1": opcion_info_comercio,
        "2": opcion_listar_planes,
        "3": opcion_crear_plan,
        "4": opcion_crear_link_pago,
        "5": opcion_consultar_transaccion,
    }

    while True:
        mostrar_menu()
        try:
            eleccion = input("Elige una opción (1-6): ").strip()
        except (KeyboardInterrupt, EOFError):
            console.print("\n[bold red]Saliendo...[/bold red]")
            break

        if eleccion == "6":
            console.print("\n[bold green]¡Hasta luego![/bold green]")
            break
        elif eleccion in opciones:
            try:
                opciones[eleccion]()
            except Exception as e:
                console.print(f"\n[bold red]Error inesperado: {e}[/bold red]")
        else:
            console.print("[red]Opción no válida. Elige entre 1 y 6.[/red]")

        input("\n[Presiona Enter para continuar...]")


if __name__ == "__main__":
    main()
