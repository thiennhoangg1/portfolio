// "Order up" page: ring items into a ticket, then print a receipt that can be
// emailed, copied, or printed.
import { $, $$, onPage, reducedMotion } from './core';
import { blip } from './sound';
import { unlock } from './secrets';

type Line = { id: string; name: string; price: number; qty: number };
const money = (n: number) => `$${n.toFixed(2)}`;
const TAX = 0.089;

onPage(() => {
  const pos = $('[data-pos]');
  if (!pos) return;
  const lines = new Map<string, Line>();
  const list = $('[data-pos-lines]', pos)!;
  const send = $<HTMLButtonElement>('[data-pos-send]', pos)!;
  const printer = $('[data-printer]')!;
  const receipt = $('[data-receipt]')!;
  const form = $<HTMLFormElement>('[data-receipt-form]')!;
  const email = pos.dataset.email!;
  const ticket = pos.dataset.ticket!;
  let printText = '';
  const offs: (() => void)[] = [];
  const on = <K extends keyof HTMLElementEventMap>(el: EventTarget, ev: K, fn: (e: HTMLElementEventMap[K]) => void) => {
    el.addEventListener(ev, fn as EventListener);
    offs.push(() => el.removeEventListener(ev, fn as EventListener));
  };

  const clock = $('[data-pos-clock]', pos)!;
  const tick = () => { clock.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
  tick();
  const clockT = window.setInterval(tick, 15000);
  offs.push(() => clearInterval(clockT));

  const totals = () => {
    const sub = [...lines.values()].reduce((s, l) => s + l.price * l.qty, 0);
    return { sub, tax: sub * TAX, total: sub * (1 + TAX), count: [...lines.values()].reduce((s, l) => s + l.qty, 0) };
  };

  function render() {
    list.replaceChildren();
    if (!lines.size) {
      list.innerHTML = '<li class="pos-empty muted">Tap something on the menu to ring it in.</li>';
    }
    for (const l of lines.values()) {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="pos-qty"><button type="button" data-dec aria-label="Remove one">−</button><span class="mono">${l.qty}</span><button type="button" data-inc aria-label="Add one">+</button></span>
        <span class="pos-line-name"></span>
        <span class="pos-line-price">${money(l.price * l.qty)}</span>`;
      li.querySelector('.pos-line-name')!.textContent = l.name;
      li.dataset.line = l.id;
      list.appendChild(li);
    }
    const t = totals();
    $('[data-pos-sub]', pos!)!.textContent = money(t.sub);
    $('[data-pos-tax]', pos!)!.textContent = money(t.tax);
    $('[data-pos-total]', pos!)!.textContent = money(t.total);
    send.disabled = !lines.size;
    list.scrollTop = list.scrollHeight;
  }

  on(pos, 'click', (e) => {
    const t = e.target as Element;
    const tab = t.closest<HTMLElement>('[data-tab]');
    if (tab) {
      $$('[data-tab]', pos).forEach((b) => { b.classList.toggle('on', b === tab); b.setAttribute('aria-selected', String(b === tab)); });
      $$('[data-panel]', pos).forEach((p) => (p.hidden = p.dataset.panel !== tab.dataset.tab));
      return;
    }
    const item = t.closest<HTMLElement>('[data-item]');
    if (item) {
      const id = item.dataset.item!;
      const l = lines.get(id) ?? { id, name: item.dataset.name!, price: parseFloat(item.dataset.price!), qty: 0 };
      l.qty++;
      lines.set(id, l);
      item.classList.remove('bump');
      void item.offsetWidth;
      item.classList.add('bump');
      setTimeout(() => item.classList.remove('bump'), 160);
      blip('key');
      render();
      return;
    }
    const row = t.closest<HTMLElement>('[data-line]');
    if (row && (t.closest('[data-inc]') || t.closest('[data-dec]'))) {
      const l = lines.get(row.dataset.line!)!;
      l.qty += t.closest('[data-inc]') ? 1 : -1;
      if (l.qty <= 0) lines.delete(l.id);
      render();
      return;
    }
    if (t.closest('[data-pos-clear]')) { lines.clear(); render(); return; }
    if (t.closest('[data-pos-send]') && lines.size) print();
  });

  function receiptLines() {
    const t = totals();
    const now = new Date();
    const rows = [...lines.values()].map((l) => ({ left: `${l.qty} × ${l.name}`, right: money(l.price * l.qty) }));
    return { t, now, rows };
  }

  function print() {
    const { t, now, rows } = receiptLines();
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
    receipt.innerHTML = `
      <p class="r-center r-big">CAFE THIEN</p>
      <p class="r-center">St. Louis, MO · thienhoang.dev</p>
      <div class="r-rule"></div>
      <div class="r-row"><span>Ticket #${ticket}</span><span>${now.toLocaleDateString()}</span></div>
      <div class="r-row"><span>Server: Thien</span><span>${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div>
      <div class="r-rule"></div>
      ${rows.map((r) => `<div class="r-row"><span>${esc(r.left)}</span><span>${r.right}</span></div>`).join('')}
      <div class="r-rule"></div>
      <div class="r-row"><span>Subtotal</span><span>${money(t.sub)}</span></div>
      <div class="r-row"><span>Hype tax</span><span>${money(t.tax)}</span></div>
      <div class="r-row"><b>TOTAL</b><b>${money(t.total)}</b></div>
      <div class="r-row"><span>Paid with</span><span>a conversation</span></div>
      <div class="r-rule"></div>
      <p class="r-center">${t.count} item${t.count === 1 ? '' : 's'} sent to the kitchen.<br />Thanks for stopping by!</p>
      <div class="r-bar" aria-hidden="true"></div>`;
    printText = [
      `CAFE THIEN · Ticket #${ticket}`,
      `${now.toLocaleString()}`,
      '------------------------------',
      ...rows.map((r) => `${r.left}  ${r.right}`),
      '------------------------------',
      `TOTAL ${money(t.total)} (paid with a conversation)`,
    ].join('\n');

    printer.hidden = false;
    receipt.style.setProperty('--printed', '0');
    printer.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    unlock('order-up');
    if (reducedMotion()) { receipt.style.setProperty('--printed', '1'); return; }
    // Feed the paper out in little jerks, like a thermal printer.
    let p = 0;
    const feed = () => {
      p = Math.min(1, p + 0.035 + Math.random() * 0.03);
      receipt.style.setProperty('--printed', String(p));
      blip('key');
      if (p < 1) setTimeout(feed, 70 + Math.random() * 60);
    };
    setTimeout(feed, 500);
  }

  on(form, 'submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const note = String(data.get('note') || '').trim();
    const body = `${note ? `${note}\n\n` : ''}${printText}\n\n${name ? `— ${name}` : ''}`;
    const subject = `Order up: ticket #${ticket}${name ? ` from ${name}` : ''}`;
    location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
  const copyBtn = $('[data-receipt-copy]')!;
  on(copyBtn, 'click', async () => {
    try { await navigator.clipboard.writeText(printText); copyBtn.textContent = 'Copied ✓'; } catch { copyBtn.textContent = 'Copy failed'; }
    setTimeout(() => (copyBtn.textContent = 'Copy'), 1800);
  });
  on($('[data-receipt-print]')!, 'click', () => window.print());

  render();
  return () => offs.forEach((f) => f());
});
