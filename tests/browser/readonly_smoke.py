"""Unauthenticated browser smoke. No login, credentials, POST or real mutations.

This verifies the public access boundary, NOT authenticated operational flows.
Run: python tests/browser/readonly_smoke.py --base-url https://candinho.duckdns.org
"""
import argparse
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='https://candinho.duckdns.org')
    args = parser.parse_args()
    base = args.base_url.rstrip('/')
    parsed = urlsplit(base)
    if parsed.scheme not in ('http', 'https') or not parsed.netloc or parsed.username or parsed.password:
        parser.error('Use an HTTP(S) origin without credentials.')
    if parsed.path or parsed.query or parsed.fragment:
        parser.error('Use only the origin, without path/query/fragment.')
    routes = [
        '/company/estoque/lotes', '/company/estoque/sabores',
        '/company/produtos/sabores/historico',
        '/company/fitness/consignacoes', '/company/fitness/movimentacoes',
        '/company/gestao/central',
    ]
    count = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            for width, height in [(1366, 768), (390, 844)]:
                context = browser.new_context(viewport={'width': width, 'height': height})
                # Reject every mutating request, including telemetry and RPC POSTs.
                context.route('**/*', lambda route: route.continue_()
                              if route.request.method in ('GET', 'HEAD') else route.abort())
                page = context.new_page()
                for route in routes:
                    response = page.goto(base + route, wait_until='networkidle', timeout=60000)
                    assert response and response.status < 500, f'Server failure: {route}'
                    assert urlsplit(page.url).path == '/login', f'Expected login boundary: {route}'
                    # Assert rendered login controls, not merely an HTTP redirect.
                    assert page.locator('input').count() > 0, f'Login did not render: {route}'
                    assert page.locator('button').count() > 0, f'Login action absent: {route}'
                    count += 1
                    print(f'PASS {width}x{height} {route} -> /login')
                context.close()
        finally:
            browser.close()
    print(f'{count} read-only browser checks passed. No authentication or write requests permitted.')


if __name__ == '__main__':
    main()
