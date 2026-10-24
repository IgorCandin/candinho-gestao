/* eslint-disable @typescript-eslint/no-require-imports -- Isolated read-only navigation fixtures. */
const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { load, common, ids } = require('./helpers/company-navigation-fixtures.cjs');

function fixture({ missing = false, swipe = { previous: { href: '/company/clientes/fitness/previous' }, next: { href: '/company/clientes/fitness/next' } } } = {}) {
  const calls = [], navigators = [];
  const Page = load('src/app/(app)/company/clientes/fitness/[id]/page.tsx', {
    ...common,
    '@/lib/data': {
      getFitnessCustomer: async id => { calls.push(['customer', id]); return missing ? null : { id, name: 'Cliente fictício', total_purchases: 1, total_spent: 50, notes: 'Observação preservada' }; },
      getFitnessSales: async () => [{ id: ids.sale, customer_id: ids.customer, quoted_on: '2026-10-24', total_amount: 50, product_summary: 'Produto fictício', status_label: 'Ativa' }, { id: 'other-sale', customer_id: 'other', product_summary: 'Não exibir' }],
      getEntitySwipeNavigation: async (...args) => { calls.push(['swipe', ...args]); return swipe; },
    },
    '@/components/entity-swipe-navigator': { EntitySwipeNavigator: props => { navigators.push(props); return React.createElement('nav', { 'aria-label': 'Navegação de fichas' }, ...[props.previous, props.next].filter(Boolean).map(target => React.createElement('a', { key: target.href, href: target.href }, target.href))); } },
  }).default;
  return { calls, navigators, render: async () => renderToStaticMarkup(await Page({ params: Promise.resolve({ id: ids.customer }) })) };
}

test('Company Fitness restores existing swipe with Company context and preserves profile/sales', async () => {
  const f = fixture(), html = await f.render();
  assert.deepEqual(f.calls.find(call => call[0] === 'swipe'), ['swipe', 'fitness_customer', ids.customer, true]);
  assert.equal(f.navigators.length, 1);
  assert.match(html, /href="\/company\/clientes\/fitness\/next"/);
  assert.match(html, new RegExp(`/company/clientes/fitness/${ids.customer}/editar`));
  assert.match(html, new RegExp(`/company/concluir/fitness/${ids.sale}`));
  assert.match(html, /Observação preservada/);
  assert.doesNotMatch(html, /Não exibir|href="\/fitness\//);
});

test('Company Fitness passes empty boundaries unchanged and retains missing-customer 404', async () => {
  const f = fixture({ swipe: { previous: null, next: null } });
  await f.render();
  assert.deepEqual(f.navigators, [{ previous: null, next: null }]);
  await assert.rejects(fixture({ missing: true }).render(), /NOT_FOUND/);
});

test('existing navigator supports Company arrows/mobile swipe without hijacking table or vertical gestures', () => {
  const events = {}, pushes = [], effects = [];
  const oldDocument = global.document, oldElement = global.HTMLElement;
  class Element { constructor(blocked = false) { this.blocked = blocked; } closest() { return this.blocked; } }
  global.HTMLElement = Element;
  global.document = { addEventListener: (name, fn) => { events[name] = fn; }, removeEventListener: name => { delete events[name]; } };
  try {
    const { EntitySwipeNavigator: Navigator } = load('src/components/entity-swipe-navigator.tsx', {
      react: { ...React, useEffect: effect => { effects.push(effect()); } },
      'next/navigation': { useRouter: () => ({ push: href => pushes.push(href) }) },
    });
    const previous = { href: '/company/clientes/fitness/previous' }, next = { href: '/company/clientes/fitness/next' };
    const tree = Navigator({ previous, next });
    const buttons = React.Children.toArray(tree.props.children).filter(child => child.type === 'button');
    buttons[0].props.onClick(); buttons[1].props.onClick();
    const gesture = (dx, dy = 0, blocked = false) => {
      events.touchstart({ target: new Element(blocked), touches: [{ clientX: 200, clientY: 200 }] });
      events.touchend({ changedTouches: [{ clientX: 200 + dx, clientY: 200 + dy }] });
    };
    gesture(-100); gesture(100); gesture(-100, 200); gesture(-30); gesture(-100, 0, true);
    assert.deepEqual(pushes, [previous.href, next.href, next.href, previous.href]);
    effects.forEach(cleanup => cleanup());
    assert.deepEqual(events, {});
  } finally { global.document = oldDocument; global.HTMLElement = oldElement; }
});
