/* /verde-office: "Анализ" tab — visitors, where they come from, what they do, the kitchen configurator funnel and
   Google search data, in plain Bulgarian. Data comes from /contract-automation/api/analytics-tool (read-only Google
   service account + optional Claude summary). Adds its own tab next to the existing ones without changing them. */
(function () {
  'use strict';
  var API = location.origin + '/contract-automation/api/analytics-tool';
  var LS_DAYS = 'va-days';
  var SEO_API = location.origin + '/contract-automation/api/seo-agent';
  var LS_VIEW = 'va-view';

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } return null; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function num(n) { return Number(n || 0).toLocaleString('bg-BG'); }
  function delta(cur, prev) {
    if (!prev) return cur ? '<span class="va-d">нов</span>' : '';
    var d = Math.round((cur - prev) / prev * 100);
    if (!d) return '<span class="va-d">=</span>';
    return '<span class="va-d ' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '+' : '') + d + '%</span>';
  }
  function bgDate(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : iso; }

  function css() {
    var s = document.createElement('style');
    s.textContent = [
      '.va{font:14px/1.55 Montserrat,Arial,sans-serif;color:#2f332f}',
      '.va-card{background:#fff;border:1px solid #e1e4df;border-radius:14px;padding:18px;margin:0 0 16px}',
      '.va h3{font:700 15px/1.3 Montserrat,Arial,sans-serif;margin:0 0 4px}.va .va-sub{color:#6a716b;font-size:13px;margin:0 0 12px}',
      '.va-top{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 16px}',
      '.va-btn{min-height:38px;padding:8px 14px;border:1px solid #cfd4cb;border-radius:8px;background:#fff;color:#2f332f;font:600 13px Montserrat,Arial,sans-serif;cursor:pointer}',
      '.va-btn.is-on{background:#2f332f;border-color:#2f332f;color:#fff}.va-btn[disabled]{opacity:.5;cursor:wait}',
      '.va-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}',
      '.va-kpi{border:1px solid #e1e4df;border-radius:12px;padding:12px}.va-kpi b{display:block;font-size:22px;line-height:1.2;font-variant-numeric:tabular-nums}',
      '.va-kpi span.l{color:#6a716b;font-size:12px}',
      '.va-d{font-size:12px;font-weight:600;margin-left:6px;color:#6a716b}.va-d.up{color:#477448}.va-d.down{color:#9b1c10}',
      '.va ul.va-hl{margin:0;padding-left:20px}.va ul.va-hl li{margin:0 0 6px}',
      '.va-ai{white-space:pre-wrap}',
      '.va table{width:100%;border-collapse:collapse;font-size:13px}.va th,.va td{text-align:left;padding:7px 6px;border-bottom:1px solid #eef0ec;vertical-align:top}',
      '.va th{color:#6a716b;font-weight:600}.va td.n,.va th.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.va-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}',
      '.va-err{color:#9b1c10}.va-muted{color:#6a716b;font-size:13px}',
      '.va-bar{height:8px;border-radius:4px;background:#477448;min-width:2px}',
      '.va-help ol{margin:6px 0 0;padding-left:20px}.va-help li{margin:0 0 4px}.va code{background:#f3f4f1;padding:1px 5px;border-radius:4px}',
      '.va-views{display:flex;gap:6px;margin:0 0 16px;border-bottom:1px solid #e1e4df}.va-view{border:0;background:none;padding:10px 14px;font:600 14px Montserrat,Arial,sans-serif;color:#6a716b;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}',
      '.va-view.is-on{color:#2f332f;border-bottom-color:#2f332f}.va-badge{display:inline-block;min-width:18px;padding:1px 6px;margin-left:6px;border-radius:9px;background:#c98a2b;color:#fff;font-size:11px;line-height:16px;text-align:center}',
      '.sp-meta{font-size:12px;color:#6a716b;margin:0 0 8px}.sp-meta a{color:#477448}.sp-old{font-size:13px;color:#9b1c10;margin:0 0 6px;text-decoration:line-through;text-decoration-color:rgba(155,28,16,.35)}',
      '.sp-new{width:100%;box-sizing:border-box;border:1px solid #cfd4cb;border-radius:8px;padding:8px 10px;font:600 14px/1.45 Montserrat,Arial,sans-serif;color:#2f332f;resize:vertical;min-height:44px}',
      '.sp-count{font-size:11px;color:#6a716b;text-align:right;margin:2px 0 8px}.sp-count.bad{color:#9b1c10;font-weight:600}',
      '.sp-why{font-size:13px;margin:0 0 4px}.sp-exp{font-size:12px;color:#477448;margin:0 0 10px}.sp-acts{display:flex;gap:8px;flex-wrap:wrap}',
      '.va-btn.ok{background:#477448;border-color:#477448;color:#fff}.va-btn.sm{min-height:30px;padding:4px 10px;font-size:12px}',
      '.sp-st{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:9px;margin-right:6px}.sp-st.applied{background:#e3efe3;color:#2f5a30}.sp-st.rejected,.sp-st.stale{background:#eef0ec;color:#6a716b}.sp-st.reverted{background:#f6ead6;color:#8a5a12}.sp-st.failed{background:#f7e1de;color:#9b1c10}',
      '.sp-h{border-top:1px solid #eef0ec;padding:10px 0}.sp-h:first-child{border-top:0}.sp-q{font-size:12px;color:#6a716b;margin:0 0 8px}',
      '.cp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}.cp-card h4{font:700 14px/1.3 Montserrat,Arial,sans-serif;margin:0 0 2px}',
      '.cp-card .cp-dom{font-size:12px;color:#6a716b;margin:0 0 8px}.cp-card .cp-dom a{color:#477448}.cp-card dl{margin:0;font-size:13px}.cp-card dt{color:#6a716b;font-size:11px;text-transform:uppercase;letter-spacing:.03em;margin:8px 0 2px}.cp-card dd{margin:0}',
      '.cp-pos td.me{font-weight:700;background:#f3f7f2}.cp-pos td.c{text-align:center}.cp-pos th.c{text-align:center}.cp-pos .best{color:#477448;font-weight:700}',
      '.cp-adv li{margin:0 0 8px}.cp-adv b{display:block}.cp-chg li{margin:0 0 6px}.cp-chg span{color:#6a716b}'
    ].join('');
    document.head.appendChild(s);
  }

  function table(head, rows, empty) {
    if (!rows.length) return '<p class="va-muted">' + (empty || 'Още няма данни.') + '</p>';
    return '<table><thead><tr>' + head.map(function (h) { return '<th' + (h.n ? ' class="n"' : '') + '>' + h.t + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td' + (head[i].n ? ' class="n"' : '') + '>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
  }

  function funnelHtml(ga) {
    var ev = function (n) { var e = ga.events.filter(function (x) { return x.name === n; })[0]; return e ? e.count : 0; };
    var starts = ev('configurator_start'), submits = ev('configurator_submit');
    var html = '<p>Започнат <b>' + num(starts) + '</b> пъти, изпратени запитвания <b>' + num(submits) + '</b>' +
      (starts ? ' (' + Math.round(submits / starts * 100) + '%)' : '') + '.</p>';
    if (ga.needsCustomDimensions) {
      return html + '<p class="va-muted">Разбивката по кухни и стъпки ще се появи, след като добавиш параметрите <code>kitchen</code> и <code>step_name</code> в Google Analytics (инструкция най-долу).</p>';
    }
    var kitchens = {};
    ga.funnel.forEach(function (f) {
      var k = kitchens[f.kitchen || '—'] = kitchens[f.kitchen || '—'] || { start: 0, submit: 0, steps: {}, exits: {} };
      if (f.event === 'configurator_start') k.start += f.count;
      if (f.event === 'configurator_submit') k.submit += f.count;
      if (f.event === 'configurator_step' && f.step) k.steps[f.step] = (k.steps[f.step] || 0) + f.count;
      if (f.event === 'configurator_exit' && f.step) k.exits[f.step] = (k.exits[f.step] || 0) + f.count;
    });
    Object.keys(kitchens).forEach(function (name) {
      var k = kitchens[name];
      var exits = Object.keys(k.exits).sort(function (a, b) { return k.exits[b] - k.exits[a]; });
      html += '<h3 style="margin-top:14px">Кухня: ' + esc(name) + '</h3><p class="va-sub">Започнати ' + num(k.start) + ' · изпратени ' + num(k.submit) + '</p>';
      var steps = Object.keys(k.steps).sort(function (a, b) { return k.steps[b] - k.steps[a]; });
      var max = Math.max.apply(null, [k.start || 1].concat(steps.map(function (s) { return k.steps[s]; })));
      html += table([{ t: 'Стъпка' }, { t: 'Стигнали' , n: 1 }, { t: '' }, { t: 'Спрели тук', n: 1 }],
        steps.map(function (s) { return [esc(s), num(k.steps[s]), '<div class="va-bar" style="width:' + Math.round(k.steps[s] / max * 100) + '%"></div>', num(k.exits[s] || 0)]; }),
        'Още никой не е минал отвъд първата стъпка.');
      if (exits[0]) html += '<p class="va-muted">Най-много се отказват на „' + esc(exits[0]) + '“.</p>';
    });
    return html;
  }

  function render(box, r, cached) {
    var html = '';
    var period = r.ga ? r.ga.period.current : r.gsc ? r.gsc.period.current : null;
    html += '<p class="va-muted">' + (period ? 'Период: ' + bgDate(period.from) + ' – ' + bgDate(period.to) + ' (сравнено с предишните ' + r.days + ' дни). ' : '') +
      'Обновено: ' + new Date(r.generatedAt).toLocaleString('bg-BG') + (cached ? ' (запазен доклад – натисни „Обнови“ за нови данни)' : '') + '</p>';

    if (r.summary) html += '<div class="va-card"><h3>Какво казва анализът</h3><div class="va-ai">' + esc(r.summary) + '</div></div>';
    if (r.highlights && r.highlights.length) html += '<div class="va-card"><h3>Накратко</h3><ul class="va-hl">' + r.highlights.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul></div>';

    if (r.ga) {
      var c = r.ga.totals.current, p = r.ga.totals.previous;
      html += '<div class="va-card"><h3>Посещения на сайта</h3><p class="va-sub">От Google Analytics. Броят се само хората, натиснали „Приемам“ на банера за бисквитки.</p><div class="va-kpis">' +
        '<div class="va-kpi"><span class="l">Посетители</span><b>' + num(c.visitors) + delta(c.visitors, p.visitors) + '</b></div>' +
        '<div class="va-kpi"><span class="l">Посещения</span><b>' + num(c.sessions) + delta(c.sessions, p.sessions) + '</b></div>' +
        '<div class="va-kpi"><span class="l">Важни действия</span><b>' + num(c.keyEvents) + delta(c.keyEvents, p.keyEvents) + '</b></div>' +
        '<div class="va-kpi"><span class="l">Ангажирани посещения</span><b>' + Math.round(c.engagement * 100) + '%</b></div></div></div>';
      html += '<div class="va-grid"><div class="va-card"><h3>Откъде идват</h3>' +
        table([{ t: 'Източник' }, { t: 'Посещения', n: 1 }, { t: 'Важни действия', n: 1 }], r.ga.channels.map(function (x) { return [esc(x.name), num(x.sessions), num(x.keyEvents)]; })) +
        '</div><div class="va-card"><h3>Първа страница, на която влизат</h3>' +
        table([{ t: 'Страница' }, { t: 'Посещения', n: 1 }, { t: 'Важни действия', n: 1 }], r.ga.landingPages.map(function (x) { return [esc(decodeURIComponent(x.page)), num(x.sessions), num(x.keyEvents)]; })) +
        '</div></div>';
      html += '<div class="va-grid"><div class="va-card"><h3>Какво правят</h3>' +
        table([{ t: 'Действие' }, { t: 'Брой', n: 1 }], r.ga.events.map(function (x) { return [esc(x.label), num(x.count)]; }), 'Още няма записани действия.') +
        '</div><div class="va-card"><h3>Конфигуратор</h3>' + funnelHtml(r.ga) + '</div></div>';
    } else if (r.gaError) {
      html += '<div class="va-card"><h3>Google Analytics</h3><p class="va-err">Не успях да прочета данните: ' + esc(r.gaError) + '</p></div>';
    }

    if (r.gsc) {
      var g = r.gsc.totals.current, gp = r.gsc.totals.previous;
      html += '<div class="va-card"><h3>Google търсене</h3><p class="va-sub">От Search Console (данните идват с 2–3 дни закъснение). ' +
        'Показвания = колко пъти сайтът е излязъл в резултатите. Позиция = средното място в Google (1 е най-отгоре).</p><div class="va-kpis">' +
        '<div class="va-kpi"><span class="l">Показвания</span><b>' + num(g.impressions) + delta(g.impressions, gp.impressions) + '</b></div>' +
        '<div class="va-kpi"><span class="l">Кликове</span><b>' + num(g.clicks) + delta(g.clicks, gp.clicks) + '</b></div>' +
        '<div class="va-kpi"><span class="l">Кликнали от видели</span><b>' + g.ctr + '%</b></div>' +
        '<div class="va-kpi"><span class="l">Средна позиция</span><b>' + g.position + '</b></div></div></div>';
      var qHead = [{ t: 'Какво търсят' }, { t: 'Кликове', n: 1 }, { t: 'Показвания', n: 1 }, { t: 'Позиция', n: 1 }];
      var qRow = function (x) { return [esc(x.query), num(x.clicks), num(x.impressions), x.position]; };
      html += '<div class="va-grid"><div class="va-card"><h3>Думи, по които ви намират</h3>' + table(qHead, r.gsc.topQueries.map(qRow)) + '</div>' +
        '<div class="va-card"><h3>Страници в Google</h3>' + table([{ t: 'Страница' }, { t: 'Кликове', n: 1 }, { t: 'Показвания', n: 1 }, { t: 'Позиция', n: 1 }],
          r.gsc.topPages.map(function (x) { return [esc(decodeURIComponent(x.page)), num(x.clicks), num(x.impressions), x.position]; })) + '</div></div>';
      html += '<div class="va-grid"><div class="va-card"><h3>Виждат ви, но не кликват</h3><p class="va-sub">Тези думи излизат често, но заглавието в Google не привлича. Добри кандидати за по-хубаво заглавие и описание.</p>' +
        table(qHead, r.gsc.lowClick.map(qRow), 'Няма такива – добре е.') + '</div>' +
        '<div class="va-card"><h3>Почти на първа страница</h3><p class="va-sub">Места 9–20. Малко повече текст по темата може да ги вкара в първите 10.</p>' +
        table(qHead, r.gsc.almostPage1.map(qRow), 'Няма такива в момента.') + '</div></div>';
    } else if (r.gscError) {
      html += '<div class="va-card"><h3>Google търсене</h3><p class="va-err">Не успях да прочета Search Console: ' + esc(r.gscError) + '</p></div>';
    }

    if (r.summaryError) html += '<p class="va-muted">AI резюмето не се получи: ' + esc(r.summaryError) + '</p>';
    if (r.ga && r.ga.needsCustomDimensions) {
      html += '<div class="va-card va-help"><h3>Как да включиш разбивката на конфигуратора (5 минути, веднъж)</h3><ol>' +
        '<li>Google Analytics → зъбчатото колело (Администратор) → „Персонализирани определения“.</li>' +
        '<li>„Създаване на персонализирани параметри“ → Име: <code>kitchen</code>, Обхват: „Събитие“, Параметър на събитието: <code>kitchen</code> → Запазване.</li>' +
        '<li>Още веднъж: Име <code>step_name</code>, Обхват „Събитие“, Параметър <code>step_name</code> → Запазване.</li>' +
        '<li>Данните започват да се трупат от този момент нататък (до 24 часа).</li></ol></div>';
    }
    box.innerHTML = html;
  }

  function startReport(panel) {
    var days = Number(ls(LS_DAYS)) || 7;
    panel.innerHTML = '<div class="va-top"></div><div class="va-body"><p class="va-muted">Зареждам…</p></div>';
    var top = panel.querySelector('.va-top'), body = panel.querySelector('.va-body');
    [[7, 'Последните 7 дни'], [28, '28 дни'], [90, '90 дни']].forEach(function (d) {
      var b = el('button', 'va-btn', d[1]); b.type = 'button'; b.dataset.days = d[0]; top.appendChild(b);
    });
    var refresh = el('button', 'va-btn', '↻ Обнови'); refresh.type = 'button'; refresh.dataset.fresh = '1'; top.appendChild(refresh);
    var busy = false;
    function load(fresh) {
      if (busy) return; busy = true;
      [].forEach.call(top.children, function (b) { b.disabled = true; b.classList.toggle('is-on', Number(b.dataset.days) === days); });
      body.innerHTML = '<p class="va-muted">Зареждам данните от Google' + (fresh ? ' (може да отнеме до минута)' : '') + '…</p>';
      fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Office-Key': window.__verdeOfficeKey || '' },
        body: JSON.stringify({ action: 'report', days: days, fresh: !!fresh })
      }).then(function (res) { return res.json().catch(function () { return { ok: false, error: 'Сървърът не отговори (' + res.status + ')' }; }); })
        .then(function (d) {
          if (d.ok) render(body, d.report, d.cached);
          else body.innerHTML = '<div class="va-card"><p class="va-err">' + esc(d.error || 'Грешка') + '</p>' +
            (d.setup ? '<p class="va-muted">Ключът на Google трябва да се добави в Webflow → Site settings → Webflow Cloud → средата → Environment variables като <code>GOOGLE_SERVICE_ACCOUNT_JSON</code> (Secret).</p>' : '') + '</div>';
        })
        .catch(function (e) { body.innerHTML = '<div class="va-card"><p class="va-err">Няма връзка със сървъра: ' + esc(e.message) + '</p></div>'; })
        .then(function () { busy = false; [].forEach.call(top.children, function (b) { b.disabled = false; }); });
    }
    top.addEventListener('click', function (e) {
      var b = e.target.closest('.va-btn'); if (!b) return;
      if (b.dataset.days) { days = Number(b.dataset.days); ls(LS_DAYS, String(days)); load(false); } else load(true);
    });
    load(false);
  }

  /* ---------------- SEO предложения ---------------- */

  var FIELD = { title: 'Заглавие в Google', description: 'Описание в Google' };
  var LIMIT = { title: [20, 65], description: [70, 165] };
  var STATUS = { applied: 'Приложено', rejected: 'Отказано', reverted: 'Върнато', failed: 'Неуспешно', stale: 'Изтекло' };
  function bgTime(iso) { return iso ? new Date(iso).toLocaleString('bg-BG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; }

  function seoCall(action, extra) {
    return fetch(SEO_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Office-Key': window.__verdeOfficeKey || '' },
      body: JSON.stringify(Object.assign({ action: action }, extra || {}))
    }).then(function (res) { return res.json().catch(function () { return { ok: false, error: 'Сървърът не отговори (' + res.status + ')' }; }); });
  }

  function startSeo(box, setCount) {
    var state = null, busy = false, autoRan = false;

    function metricsLine(p) {
      var m = {}; try { m = JSON.parse(p.metrics_json || '{}'); } catch (e) { /* ignore */ }
      if (!m.impressions && !m.clicks) return '<p class="sp-q">Почти няма данни от Google за тази страница – предложението е заради правилата или текста.</p>';
      var q = (m.queries || []).slice(0, 3).map(function (x) { return '„' + esc(x.q) + '“ (' + num(x.impressions) + ' показв., поз. ' + x.position + ')'; }).join(', ');
      return '<p class="sp-q">За 28 дни: ' + num(m.impressions) + ' показвания, ' + num(m.clicks) + ' клика (' + m.ctr + '%), средна позиция ' + m.position + '.' + (q ? ' Търсят: ' + q + '.' : '') + '</p>';
    }

    function card(p) {
      return '<div class="va-card" data-id="' + esc(p.id) + '">' +
        '<p class="sp-meta"><b>' + esc(FIELD[p.field]) + '</b> · ' + esc(p.name) + ' · <a href="https://verde-m.com' + esc(p.path) + '" target="_blank" rel="noopener">' + esc(p.path) + '</a>' + (p.priority === 1 ? ' · <b style="color:#c98a2b">важно</b>' : '') + '</p>' +
        '<p class="sp-old">' + esc(p.current_value || '(празно)') + '</p>' +
        '<textarea class="sp-new" rows="' + (p.field === 'title' ? 1 : 3) + '" data-field="' + p.field + '">' + esc(p.proposed_value) + '</textarea>' +
        '<div class="sp-count"></div>' +
        '<p class="sp-why">' + esc(p.reason) + '</p>' +
        (p.expected ? '<p class="sp-exp">Очаквано: ' + esc(p.expected) + '</p>' : '') +
        metricsLine(p) +
        (p.error ? '<p class="va-err">Последен опит: ' + esc(p.error) + '</p>' : '') +
        '<div class="sp-acts"><button type="button" class="va-btn ok" data-act="approve">✓ Одобри и публикувай</button>' +
        '<button type="button" class="va-btn" data-act="reject">Откажи</button></div></div>';
    }

    function hist(p) {
      var rv = null; try { rv = p.review_json ? JSON.parse(p.review_json) : null; } catch (e) { rv = null; }
      return '<div class="sp-h" data-id="' + esc(p.id) + '"><p class="sp-meta"><span class="sp-st ' + p.status + '">' + (STATUS[p.status] || p.status) + '</span>' +
        esc(FIELD[p.field]) + ' · <a href="https://verde-m.com' + esc(p.path) + '" target="_blank" rel="noopener">' + esc(p.path) + '</a> · ' + bgTime(p.decided_at || p.created_at) + '</p>' +
        (p.status === 'applied' || p.status === 'reverted' ? '<p class="sp-old" style="margin:0 0 2px">' + esc((p.old_value != null ? p.old_value : p.current_value) || '(празно)') + '</p>' : '') +
        '<div style="font-size:13px">' + esc(p.final_value || p.proposed_value) + '</div>' +
        (rv ? '<p class="sp-q">След 4 седмици: <b>' + esc(rv.verdict) + '</b> – кликове ' + rv.before.clicks + ' → ' + rv.after.clicks + ', показвания ' + rv.before.impressions + ' → ' + rv.after.impressions + '.</p>' : '') +
        (p.status === 'applied' ? '<div class="sp-acts" style="margin-top:6px"><button type="button" class="va-btn sm" data-act="revert">↶ Върни стария текст</button></div>' : '') +
        (p.status === 'failed' ? (p.error ? '<p class="va-err" style="font-size:12px">' + esc(p.error) + '</p>' : '') +
          '<div class="sp-acts" style="margin-top:6px"><button type="button" class="va-btn sm ok" data-act="retry">↻ Опитай пак</button></div>' : '') + '</div>';
    }

    function counters() {
      [].forEach.call(box.querySelectorAll('.sp-new'), function (t) {
        var lim = LIMIT[t.dataset.field], n = t.value.trim().length, c = t.nextElementSibling;
        c.textContent = n + ' знака (добре е ' + lim[0] + '–' + lim[1] + ')';
        c.classList.toggle('bad', n < lim[0] || n > lim[1]);
      });
    }

    function render(msg, isErr) {
      var d = state || { pending: [], history: [] };
      setCount(d.pending.length);
      var html = '<div class="va-card"><h3>SEO агентът</h3><p class="va-sub">Всяка седмица чете Google търсене и посещенията, преглежда заглавията и описанията на страниците в Google и предлага конкретни подобрения. ' +
        'Одобреното се записва и публикува в сайта веднага. Всяка промяна може да се върне. След 4 седмици агентът проверява дали е помогнала.</p>' +
        '<div class="sp-acts"><button type="button" class="va-btn" data-act="run">↻ Провери сега</button>' +
        '<span class="va-muted" style="align-self:center">' + (d.lastRun ? 'Последна проверка: ' + bgTime(d.lastRun) : 'Още не е проверявал.') + '</span></div>' +
        (msg ? '<p class="' + (isErr ? 'va-err' : 'va-muted') + '" style="margin:10px 0 0">' + esc(msg) + '</p>' : '') +
        (d.analysis && d.analysis.text ? '<p style="margin:12px 0 0;white-space:pre-wrap">' + esc(d.analysis.text) + '</p>' : '') + '</div>';
      if (d.pending.length) html += d.pending.map(card).join('');
      else html += '<div class="va-card"><p class="va-muted" style="margin:0">Няма чакащи предложения.</p></div>';
      if (d.history.length) html += '<div class="va-card"><h3>История</h3>' + d.history.map(hist).join('') + '</div>';
      box.innerHTML = html;
      counters();
    }

    function act(action, extra, waitText) {
      if (busy) return; busy = true;
      [].forEach.call(box.querySelectorAll('button'), function (b) { b.disabled = true; });
      if (waitText) {
        var info = box.querySelector('.va-card .va-sub');
        if (info) info.insertAdjacentHTML('afterend', '<p class="va-muted" style="margin:10px 0 0">' + esc(waitText) + '</p>');
      }
      return seoCall(action, extra).then(function (d) {
        if (d.pending) state = d;
        var msg = '';
        if (d.ok && action === 'approve') msg = 'Готово – промяната е записана и публикувана.';
        if (!d.ok && action === 'approve') msg = d.error || 'Грешка';
        if (d.ok && action === 'revert') msg = 'Старият текст е върнат и публикуван.';
        if (d.ok && action === 'run') msg = d.run && d.run.created ? 'Агентът направи ' + d.run.created + ' нови предложения.' : 'Агентът не намери нищо, което си струва да се сменя в момента.';
        render(d.ok ? msg : (d.error || 'Грешка'), !d.ok);
      }).catch(function (e) { render('Няма връзка със сървъра: ' + e.message, true); })
        .then(function () { busy = false; });
    }

    box.addEventListener('input', function (e) { if (e.target.classList.contains('sp-new')) counters(); });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]'); if (!b) return;
      var row = b.closest('[data-id]'), id = row ? row.dataset.id : '';
      var a = b.dataset.act;
      if (a === 'run') return act('run', {}, 'Агентът анализира данните и пише предложения… обикновено 30–90 секунди.');
      if (a === 'approve') { var t = row.querySelector('.sp-new'); b.textContent = 'Публикувам…'; return act('approve', { id: id, value: t ? t.value : undefined }); }
      if (a === 'reject') return act('reject', { id: id });
      if (a === 'retry') { b.textContent = 'Публикувам…'; return act('approve', { id: id }); }
      if (a === 'revert') { if (!confirm('Да върна ли стария текст и да публикувам сайта?')) return; b.textContent = 'Връщам…'; return act('revert', { id: id }); }
    });

    box.innerHTML = '<p class="va-muted">Зареждам предложенията…</p>';
    seoCall('list').then(function (d) {
      if (!d.ok) return render(d.error || 'Грешка', true);
      state = d; render();
      // safety net: if the weekly run has not happened for over a week, run it now
      if (d.due && !autoRan) { autoRan = true; act('run', {}, 'Седмичната проверка закъснява – агентът я прави сега (30–90 секунди)…'); }
    }).catch(function (e) { render('Няма връзка със сървъра: ' + e.message, true); });
  }

  /* ---------------- Конкуренти ---------------- */

  function startCompetitors(box) {
    var state = null, busy = false;
    function li(arr) { return (arr && arr.length) ? '<ul style="margin:0;padding-left:18px">' + arr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<span class="va-muted">не пише</span>'; }
    function profileCard(p) {
      var f = p.profile || {};
      return '<div class="va-card cp-card"><h4>' + esc(p.name) + '</h4><p class="cp-dom"><a href="https://' + esc(p.domain) + '" target="_blank" rel="noopener">' + esc(p.domain) + '</a> · прочетено ' + bgTime(p.fetched_at) + '</p>' +
        (f.positioning ? '<p style="margin:0 0 6px;font-size:13px"><i>' + esc(f.positioning) + '</i></p>' : '') +
        '<dl><dt>Обещават</dt><dd>' + li(f.promises) + '</dd>' +
        '<dt>Гаранция</dt><dd>' + (f.warranty ? esc(f.warranty) : '<span class="va-muted">не пише</span>') + '</dd>' +
        '<dt>Отстъпки и плащане</dt><dd>' + li(f.discounts) + '</dd>' +
        '<dt>Доказателства</dt><dd>' + li(f.proof) + '</dd>' +
        '<dt>Онлайн инструменти</dt><dd>' + li(f.online_tools) + '</dd>' +
        '<dt>Как карат клиента да действа</dt><dd>' + li(f.cta) + '</dd>' +
        '<dt>Публикувани цени</dt><dd>' + (f.prices_published ? 'да' : 'не') + '</dd></dl>' +
        (f.notes ? '<p class="va-muted" style="margin:8px 0 0">' + esc(f.notes) + '</p>' : '') + '</div>';
    }
    function positionsTable(pos, profiles) {
      if (!pos || !pos.length) return '';
      var doms = profiles.map(function (p) { return p.domain; });
      var cell = function (n, best) { return '<td class="c' + (best ? ' best' : '') + '">' + (n == null ? '–' : n) + '</td>'; };
      var rows = pos.map(function (r) {
        var all = [r.verde].concat(doms.map(function (d) { return r.competitors[d]; })).filter(function (x) { return x != null; });
        var best = all.length ? Math.min.apply(null, all) : null;
        return '<tr><td>' + esc(r.keyword) + '</td>' + cell(r.verde, r.verde != null && r.verde === best).replace('<td class="c', '<td class="c me') +
          doms.map(function (d) { return cell(r.competitors[d], r.competitors[d] != null && r.competitors[d] === best); }).join('') + '</tr>';
      }).join('');
      return '<div class="va-card cp-pos"><h3>Място в Google</h3><p class="va-sub">1 = най-отгоре; „–“ = не е в първите 20 резултата. Търсенията са от България.</p>' +
        '<div style="overflow:auto"><table><thead><tr><th>Търсене</th><th class="c">Верде-М</th>' + profiles.map(function (p) { return '<th class="c">' + esc(p.name.split(' ')[0]) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    }
    function render(msg, isErr) {
      var d = state || { report: null, profiles: [] }, r = d.report;
      var html = '<div class="va-card"><h3>Конкуренти</h3><p class="va-sub">Веднъж месечно агентът чете сайтовете на основните конкуренти за кухни и мебели по поръчка в София, вижда какво обещават и какво е ново при тях' +
        (d.serp ? ', проверява кой на кое място излиза в Google' : '') + ', и ти казва какво да направиш. Конкретните промени по заглавия и описания отиват в „SEO предложения“, отбелязани „Конкуренти:“.</p>' +
        '<div class="sp-acts"><button type="button" class="va-btn" data-act="run">↻ Провери сега</button><span class="va-muted" style="align-self:center">' + (r ? 'Последна проверка: ' + bgTime(r.created_at) : 'Още не е проверявал.') + '</span></div>' +
        (msg ? '<p class="' + (isErr ? 'va-err' : 'va-muted') + '" style="margin:10px 0 0">' + esc(msg) + '</p>' : '') +
        (!d.serp ? '<p class="va-muted" style="margin:10px 0 0">Местата в Google не се проверяват – за това трябва ключ <code>SERPER_API_KEY</code> (serper.dev) в Webflow Cloud → Environment variables.</p>' : '') + '</div>';
      if (r) {
        var changes = [], advice = [], pos = null;
        try { changes = JSON.parse(r.changes_json || '[]'); advice = JSON.parse(r.advice_json || '[]'); pos = r.positions_json ? JSON.parse(r.positions_json) : null; } catch (e) { /* ignore */ }
        var nameOf = function (dom) { var p = d.profiles.filter(function (x) { return x.domain === dom; })[0]; return p ? p.name : dom; };
        html += '<div class="va-card"><h3>Какво казва агентът</h3>' + (r.analysis ? '<p class="va-ai" style="margin:0">' + esc(r.analysis) + '</p>' : '<p class="va-muted" style="margin:0">Няма анализ.</p>') +
          (r.error ? '<p class="va-err">Анализът не се получи докрай: ' + esc(r.error) + '</p>' : '') + '</div>';
        if (changes.length) html += '<div class="va-card"><h3>Какво е ново при тях</h3><ul class="cp-chg" style="margin:0;padding-left:18px">' + changes.map(function (c) { return '<li><b>' + esc(nameOf(c.domain)) + '</b>: ' + esc(c.what) + ' <span>– ' + esc(c.matters) + '</span></li>'; }).join('') + '</ul></div>';
        html += positionsTable(pos, d.profiles);
        if (advice.length) html += '<div class="va-card"><h3>Какво да направиш</h3><ol class="cp-adv" style="margin:0;padding-left:20px">' + advice.map(function (a) { return '<li><b>' + esc(a.title) + (a.priority === 1 ? ' <span style="color:#c98a2b;font-size:12px">важно</span>' : '') + '</b>' + esc(a.text) + '</li>'; }).join('') + '</ol></div>';
      }
      if (d.profiles.length) html += '<h3 style="margin:4px 0 10px">Какво обещават на сайтовете си</h3><div class="cp-grid">' + d.profiles.map(profileCard).join('') + '</div>';
      box.innerHTML = html;
    }
    function act(action, waitText) {
      if (busy) return; busy = true;
      [].forEach.call(box.querySelectorAll('button'), function (b) { b.disabled = true; });
      if (waitText) { var info = box.querySelector('.va-card .va-sub'); if (info) info.insertAdjacentHTML('afterend', '<p class="va-muted" style="margin:10px 0 0">' + esc(waitText) + '</p>'); }
      return seoCall(action).then(function (d) {
        if (d.profiles) state = d;
        var msg = '';
        if (d.ok && action === 'competitors_run') msg = d.run && d.run.created ? 'Готово. Агентът добави ' + d.run.created + ' предложения в „SEO предложения“.' : 'Готово – докладът е обновен.';
        render(d.ok ? msg : (d.error || 'Грешка'), !d.ok);
      }).catch(function (e) { render('Няма връзка със сървъра: ' + e.message, true); }).then(function () { busy = false; });
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]'); if (!b) return;
      if (b.dataset.act === 'run') act('competitors_run', 'Агентът чете сайтовете на конкурентите и пише доклада… обикновено 1–3 минути.');
    });
    box.innerHTML = '<p class="va-muted">Зареждам…</p>';
    seoCall('competitors').then(function (d) { if (!d.ok) return render(d.error || 'Грешка', true); state = d; render(); })
      .catch(function (e) { render('Няма връзка със сървъра: ' + e.message, true); });
  }

  function start(panel) {
    panel.innerHTML = '<div class="va-views"><button type="button" class="va-view" data-view="report">Отчет</button>' +
      '<button type="button" class="va-view" data-view="seo">SEO предложения<span class="va-badge" hidden></span></button>' +
      '<button type="button" class="va-view" data-view="comp">Конкуренти</button></div>' +
      '<div data-box="report"></div><div data-box="seo" hidden></div><div data-box="comp" hidden></div>';
    var views = panel.querySelector('.va-views'), report = panel.querySelector('[data-box="report"]'), seo = panel.querySelector('[data-box="seo"]'), comp = panel.querySelector('[data-box="comp"]');
    var badge = views.querySelector('.va-badge'), started = {};
    function setCount(n) { badge.hidden = !n; badge.textContent = n; }
    function show(v) {
      [].forEach.call(views.children, function (b) { b.classList.toggle('is-on', b.dataset.view === v); });
      report.hidden = v !== 'report'; seo.hidden = v !== 'seo'; comp.hidden = v !== 'comp'; ls(LS_VIEW, v);
      if (!started[v]) { started[v] = 1; if (v === 'report') startReport(report); else if (v === 'comp') startCompetitors(comp); else startSeo(seo, setCount); }
    }
    views.addEventListener('click', function (e) { var b = e.target.closest('.va-view'); if (b) show(b.dataset.view); });
    var saved = ls(LS_VIEW); show(saved === 'seo' || saved === 'comp' ? saved : 'report');
    // show the number of waiting proposals on the tab even before it is opened
    if (!started.seo) seoCall('list').then(function (d) { if (d.ok && !started.seo) setCount(d.pending.length); }).catch(function () {});
  }

  function mount(bar) {
    if (bar.querySelector('[data-tab="analysis"]')) return;
    var shell = bar.parentElement;
    var tab = el('button', 'vo-tab', 'Анализ'); tab.type = 'button'; tab.setAttribute('data-tab', 'analysis');
    bar.appendChild(tab);
    var panel = el('div', 'va'); panel.hidden = true; shell.appendChild(panel);
    var hiddenByUs = [];

    function open() {
      [].forEach.call(bar.querySelectorAll('.vo-tab'), function (b) { b.classList.toggle('is-on', b === tab); });
      [].forEach.call(shell.children, function (c) {
        if (c === bar || c === panel || c.classList.contains('office-header') || c.style.display === 'none' || c.hidden) return;
        hiddenByUs.push([c, c.style.display]); c.style.display = 'none';
      });
      panel.hidden = false; panel.style.display = '';
      if (!panel.dataset.ready) { panel.dataset.ready = '1'; start(panel); }
    }
    function close() {
      if (panel.hidden) return;
      panel.hidden = true; tab.classList.remove('is-on');
      hiddenByUs.forEach(function (x) { x[0].style.display = x[1]; }); hiddenByUs = [];
    }
    // runs before the other tabs' own handlers, so they find the page as they left it
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('.vo-tab'); if (!b) return;
      if (b === tab) { e.stopImmediatePropagation(); open(); } else close();
    }, true);
  }

  css();
  var tries = 0;
  (function wait() {
    var bar = document.querySelector('.office-shell .vo-tabs');
    if (bar) return mount(bar);
    if (++tries < 60) setTimeout(wait, 250);
  })();
})();
