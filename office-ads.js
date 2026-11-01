/* /verde-office: "Реклами" tab — how the Facebook/Instagram ads are doing, in plain Bulgarian: money spent, people
   reached, clicks to the planner, started configurators and requests (from the Meta pixel and Google Analytics),
   per ad; plus the ads agent's proposals (budget, pause, advice) approved with one click.
   Data comes from /contract-automation/api/ads-agent. Adds its own tab next to the existing ones. */
(function () {
  'use strict';
  var API = location.origin + '/contract-automation/api/ads-agent';
  var LS_DAYS = 'vads-days', LS_VIEW = 'vads-view';
  var USD_BGN = 1.78; // only for the "≈ лв" hint next to dollar amounts

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } return null; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function num(n) { return Number(n || 0).toLocaleString('bg-BG'); }
  function usd(n) { n = Number(n || 0); return n.toFixed(2).replace('.', ',') + ' $'; }
  function usdLv(n) { n = Number(n || 0); return usd(n) + '<span class="vads-lv">≈ ' + Math.round(n * USD_BGN) + ' лв</span>'; }
  function delta(cur, prev) {
    if (!prev) return cur ? '<span class="va-d">нов</span>' : '';
    var d = Math.round((cur - prev) / prev * 100);
    if (!d) return '<span class="va-d">=</span>';
    return '<span class="va-d ' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '+' : '') + d + '%</span>';
  }
  function bgDate(iso) { var p = String(iso || '').slice(0, 10).split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : iso; }
  function bgTime(iso) { return iso ? new Date(iso).toLocaleString('bg-BG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; }

  function css() {
    var s = document.createElement('style');
    s.textContent = [
      '.vads{font:14px/1.55 Montserrat,Arial,sans-serif;color:#2f332f}',
      '.vads .va-card{background:#fff;border:1px solid #e1e4df;border-radius:14px;padding:18px;margin:0 0 16px}',
      '.vads h3{font:700 15px/1.3 Montserrat,Arial,sans-serif;margin:0 0 4px}.vads .va-sub{color:#6a716b;font-size:13px;margin:0 0 12px}',
      '.vads .va-top{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 16px}',
      '.vads .va-btn{min-height:38px;padding:8px 14px;border:1px solid #cfd4cb;border-radius:8px;background:#fff;color:#2f332f;font:600 13px Montserrat,Arial,sans-serif;cursor:pointer}',
      '.vads .va-btn.is-on{background:#2f332f;border-color:#2f332f;color:#fff}.vads .va-btn[disabled]{opacity:.5;cursor:wait}',
      '.vads .va-btn.ok{background:#477448;border-color:#477448;color:#fff}.vads .va-btn.sm{min-height:30px;padding:4px 10px;font-size:12px}',
      '.vads .va-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}',
      '.vads .va-kpi{border:1px solid #e1e4df;border-radius:12px;padding:12px}.vads .va-kpi b{display:block;font-size:22px;line-height:1.2;font-variant-numeric:tabular-nums}',
      '.vads .va-kpi span.l{color:#6a716b;font-size:12px}.vads .va-kpi .vads-lv{display:block;font-size:12px;color:#6a716b;font-weight:500;line-height:1.3}',
      '.vads .va-d{font-size:12px;font-weight:600;margin-left:6px;color:#6a716b}.vads .va-d.up{color:#477448}.vads .va-d.down{color:#9b1c10}',
      '.vads table{width:100%;border-collapse:collapse;font-size:13px}.vads th,.vads td{text-align:left;padding:7px 6px;border-bottom:1px solid #eef0ec;vertical-align:top}',
      '.vads th{color:#6a716b;font-weight:600}.vads td.n,.vads th.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.vads .va-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}',
      '.vads .va-err{color:#9b1c10}.vads .va-muted{color:#6a716b;font-size:13px}.vads code{background:#f3f4f1;padding:1px 5px;border-radius:4px}',
      '.vads .va-help ol{margin:6px 0 0;padding-left:20px}.vads .va-help li{margin:0 0 4px}',
      '.vads .va-views{display:flex;gap:6px;margin:0 0 16px;border-bottom:1px solid #e1e4df}.vads .va-view{border:0;background:none;padding:10px 14px;font:600 14px Montserrat,Arial,sans-serif;color:#6a716b;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}',
      '.vads .va-view.is-on{color:#2f332f;border-bottom-color:#2f332f}.vads .va-badge{display:inline-block;min-width:18px;padding:1px 6px;margin-left:6px;border-radius:9px;background:#c98a2b;color:#fff;font-size:11px;line-height:16px;text-align:center}',
      '.vads .st{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:9px;white-space:nowrap}.vads .st.on{background:#e3efe3;color:#2f5a30}.vads .st.off{background:#eef0ec;color:#6a716b}.vads .st.warn{background:#f6ead6;color:#8a5a12}.vads .st.bad{background:#f7e1de;color:#9b1c10}',
      /* funnel */
      '.vads .fn{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;align-items:end}',
      '.vads .fn div{text-align:center}.vads .fn .bar{background:#477448;border-radius:6px 6px 0 0;margin:0 auto 4px;width:70%;min-height:4px}',
      '.vads .fn b{display:block;font-size:18px}.vads .fn span{font-size:11px;color:#6a716b;display:block;line-height:1.25}',
      /* daily chart */
      '.vads .dc{display:flex;gap:3px;align-items:flex-end;height:120px;border-bottom:1px solid #e1e4df;padding:0 0 2px}',
      '.vads .dc div{flex:1;background:#cfd9cc;border-radius:3px 3px 0 0;min-height:2px;position:relative}.vads .dc div.lead{background:#477448}',
      '.vads .dc div:hover::after{content:attr(data-t);position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:#2f332f;color:#fff;font-size:11px;padding:4px 8px;border-radius:6px;white-space:nowrap;z-index:2}',
      '.vads .dcl{display:flex;gap:3px;font-size:10px;color:#6a716b}.vads .dcl div{flex:1;text-align:center;overflow:hidden;white-space:nowrap}',
      /* proposals */
      '.vads .sp-meta{font-size:12px;color:#6a716b;margin:0 0 8px}.vads .sp-val{font:600 15px/1.4 Montserrat,Arial,sans-serif;margin:0 0 8px}',
      '.vads .sp-why{font-size:13px;margin:0 0 4px}.vads .sp-exp{font-size:12px;color:#477448;margin:0 0 10px}.vads .sp-acts{display:flex;gap:8px;flex-wrap:wrap;align-items:center}',
      '.vads .sp-in{width:90px;border:1px solid #cfd4cb;border-radius:8px;padding:6px 10px;font:600 14px Montserrat,Arial,sans-serif}',
      '.vads .sp-h{border-top:1px solid #eef0ec;padding:10px 0}.vads .sp-h:first-child{border-top:0}.vads .sp-q{font-size:12px;color:#6a716b;margin:0 0 8px}',
      '.vads .thumb{width:44px;height:44px;object-fit:cover;border-radius:6px;vertical-align:middle;margin-right:8px}'
    ].join('');
    document.head.appendChild(s);
  }

  function call(action, extra) {
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Office-Key': window.__verdeOfficeKey || '' },
      body: JSON.stringify(Object.assign({ action: action }, extra || {}))
    }).then(function (res) { return res.json().catch(function () { return { ok: false, error: 'Сървърът не отговори (' + res.status + ')' }; }); });
  }

  function table(head, rows, empty) {
    if (!rows.length) return '<p class="va-muted">' + (empty || 'Още няма данни.') + '</p>';
    return '<div style="overflow:auto"><table><thead><tr>' + head.map(function (h) { return '<th' + (h.n ? ' class="n"' : '') + '>' + h.t + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td' + (head[i].n ? ' class="n"' : '') + '>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function stBadge(row) {
    var s = row.status, cls = s === 'ACTIVE' ? 'on' : /PAUSED|ARCHIVED|DELETED/.test(s) ? 'off' : /DISAPPROVED|ISSUES/.test(s) ? 'bad' : 'warn';
    return '<span class="st ' + cls + '">' + esc(row.statusBg || s) + '</span>';
  }

  function setupHelp() {
    return '<div class="va-card va-help"><h3>Свързване с Meta (веднъж, около 10 минути)</h3>' +
      '<p class="va-sub">За да чете рекламите, агентът има нужда от ключ за достъп от Meta Business. Ще те водя стъпка по стъпка в чата – накратко:</p><ol>' +
      '<li>business.facebook.com → Настройки на бизнеса → Потребители → <b>Системни потребители</b> → „Добавяне“ (име напр. <code>verde-ads-agent</code>, роля „Служител“).</li>' +
      '<li>При системния потребител → „Присвояване на активи“ → рекламният акаунт <b>Verde-M</b> → разреши „Управление на кампании“.</li>' +
      '<li>„Генериране на нов токен“ → избери приложението → отметни <code>ads_read</code> и <code>ads_management</code> → срок „Никога не изтича“ → копирай ключа.</li>' +
      '<li>Webflow → Site settings → Webflow Cloud → средата → Environment variables → <code>META_ACCESS_TOKEN</code> (Secret) = ключът → Save и Redeploy.</li></ol>' +
      '<p class="va-muted" style="margin:8px 0 0">По желание: <code>ADS_MAX_DAILY_USD</code> (таван на дневния бюджет, по подразбиране 25 $) и <code>ADS_TARGET_CPL_USD</code> (цел за цена на запитване, 8 $).</p></div>';
  }

  /* ---------------- Табло ---------------- */

  function funnel(t) {
    var steps = [
      ['Видели', t.impressions, 'показвания'],
      ['Кликнали', t.linkClicks, 'към планера'],
      ['Отворили', t.landingViews, 'страницата'],
      ['Стартирали', t.started, 'конфигуратор'],
      ['Запитвания', t.leads, 'изпратени']
    ];
    var max = Math.max(1, steps[0][1]);
    return '<div class="fn">' + steps.map(function (s, i) {
      var h = i === 0 ? 100 : Math.max(4, Math.round(Math.log(1 + s[1]) / Math.log(1 + max) * 100));
      return '<div><div class="bar" style="height:' + h + 'px"></div><b>' + num(s[1]) + '</b><span>' + s[0] + '<br>' + s[2] + '</span></div>';
    }).join('') + '</div>' +
      '<p class="va-muted" style="margin:10px 0 0">Кликнали от видели: <b>' + (t.ctr || 0).toString().replace('.', ',') + '%</b>' +
      (t.cpc ? ' · един клик струва <b>' + usd(t.cpc) + '</b>' : '') +
      (t.costPerStart ? ' · един стартиран конфигуратор <b>' + usd(t.costPerStart) + '</b>' : '') +
      (t.cpl ? ' · едно запитване <b>' + usd(t.cpl) + '</b>' : '') + '</p>';
  }

  function dailyChart(daily) {
    if (!daily.length) return '<p class="va-muted">Още няма данни по дни.</p>';
    var max = Math.max.apply(null, daily.map(function (d) { return d.m.spend; }).concat([0.01]));
    return '<div class="dc">' + daily.map(function (d) {
      var t = bgDate(d.date) + ': ' + usd(d.m.spend) + ', ' + num(d.m.linkClicks) + ' клика, ' + num(d.m.leads) + ' запитв.';
      return '<div class="' + (d.m.leads ? 'lead' : '') + '" style="height:' + Math.max(2, Math.round(d.m.spend / max * 100)) + '%" data-t="' + esc(t) + '"></div>';
    }).join('') + '</div><div class="dcl">' + daily.map(function (d) { return '<div>' + d.date.slice(8, 10) + '.' + d.date.slice(5, 7) + '</div>'; }).join('') + '</div>' +
      '<p class="va-muted" style="margin:8px 0 0">Височината е похарченото за деня; зелените дни са с запитване. Задръж мишката за числата.</p>';
  }

  function rowsHtml(list, kind) {
    var head = [{ t: kind === 'ad' ? 'Реклама' : kind === 'adset' ? 'Набор' : 'Кампания' }, { t: 'Статус' }];
    if (kind !== 'ad') head.push({ t: 'Бюджет/ден', n: 1 });
    head = head.concat([{ t: 'Похарчено', n: 1 }, { t: 'Достигнати', n: 1 }, { t: 'Кликове', n: 1 }, { t: 'CTR', n: 1 }, { t: 'Старт.', n: 1 }, { t: 'Запитв.', n: 1 }, { t: '$/запитв.', n: 1 }]);
    return table(head, list.map(function (r) {
      var name = (r.thumb ? '<img class="thumb" src="' + esc(r.thumb) + '" alt="">' : '') + '<b>' + esc(r.name) + '</b>' +
        (r.parent ? '<br><span class="va-muted">' + esc(r.parent) + '</span>' : '') +
        (r.target ? '<br><span class="va-muted">' + esc(r.target) + '</span>' : '') +
        (r.text ? '<br><span class="va-muted">„' + esc(r.text) + '“</span>' : '');
      var cells = [name, stBadge(r)];
      if (kind !== 'ad') cells.push(r.budget ? usd(r.budget) : '—');
      return cells.concat([usd(r.m.spend), num(r.m.reach), num(r.m.linkClicks), String(r.m.ctr).replace('.', ',') + '%', num(r.m.started), num(r.m.leads), r.m.cpl != null ? usd(r.m.cpl) : '—']);
    }), 'Няма ' + (kind === 'ad' ? 'реклами' : kind === 'adset' ? 'набори' : 'кампании') + '.');
  }

  function render(box, r, cached) {
    var t = r.totals, p = r.prevTotals;
    var html = '<p class="va-muted">Период: ' + bgDate(r.period.from) + ' – ' + bgDate(r.period.to) + ' (сравнено с предишните ' + r.days + ' дни). Обновено: ' +
      new Date(r.generatedAt).toLocaleString('bg-BG') + (cached ? ' (запазен отчет – „Обнови“ за нови данни)' : '') + '. Данните в Meta закъсняват с до 24 часа.</p>';
    if (r.notes && r.notes.length) html += '<div class="va-card"><ul style="margin:0;padding-left:20px">' + r.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></div>';
    html += '<div class="va-card"><h3>Накратко</h3><p class="va-sub">Всички кампании заедно.</p><div class="va-kpis">' +
      '<div class="va-kpi"><span class="l">Похарчено</span><b>' + usdLv(t.spend) + delta(t.spend, p.spend) + '</b></div>' +
      '<div class="va-kpi"><span class="l">Достигнати хора</span><b>' + num(t.reach) + delta(t.reach, p.reach) + '</b></div>' +
      '<div class="va-kpi"><span class="l">Кликове към планера</span><b>' + num(t.linkClicks) + delta(t.linkClicks, p.linkClicks) + '</b></div>' +
      '<div class="va-kpi"><span class="l">Стартирани конфигуратори</span><b>' + num(t.started) + delta(t.started, p.started) + '</b></div>' +
      '<div class="va-kpi"><span class="l">Запитвания</span><b>' + num(t.leads) + delta(t.leads, p.leads) + '</b></div>' +
      '<div class="va-kpi"><span class="l">Цена на запитване</span><b>' + (t.cpl != null ? usdLv(t.cpl) : '—') + '</b></div></div>' +
      '<p class="va-muted" style="margin:10px 0 0">Цел: до ' + usd(r.settings.targetCpl) + ' за запитване · таван на бюджета: ' + usd(r.settings.maxDaily) + ' на ден' +
      (t.frequency ? ' · всеки човек е видял рекламата средно ' + String(t.frequency).replace('.', ',') + ' пъти' : '') + '</p></div>';
    html += '<div class="va-grid"><div class="va-card"><h3>Пътят на клиента</h3><p class="va-sub">Къде се губят хората между рекламата и запитването.</p>' + funnel(t) + '</div>' +
      '<div class="va-card"><h3>По дни</h3>' + dailyChart(r.daily) + '</div></div>';
    if (r.ga) {
      html += '<div class="va-card"><h3>Какво видя Google Analytics от рекламата</h3><p class="va-sub">Само хора, приели бисквитките – затова числата са по-малки от тези на Meta.</p><div class="va-kpis">' +
        '<div class="va-kpi"><span class="l">Посещения от рекламата</span><b>' + num(r.ga.sessions) + '</b></div>' +
        '<div class="va-kpi"><span class="l">Стартирали конфигуратор</span><b>' + num(r.ga.starts) + '</b></div>' +
        '<div class="va-kpi"><span class="l">AI визуализации</span><b>' + num(r.ga.aiVisuals) + '</b></div>' +
        '<div class="va-kpi"><span class="l">Запитвания</span><b>' + num(r.ga.submits) + '</b></div>' +
        '<div class="va-kpi"><span class="l">Клик на телефона</span><b>' + num(r.ga.phone) + '</b></div></div></div>';
    } else if (r.gaError) html += '<p class="va-muted">Google Analytics не отговори: ' + esc(r.gaError) + '</p>';
    html += '<div class="va-card"><h3>Кампании</h3>' + rowsHtml(r.campaigns, 'campaign') + '</div>';
    html += '<div class="va-card"><h3>Набори (аудитории)</h3>' + rowsHtml(r.adsets, 'adset') + '</div>';
    html += '<div class="va-card"><h3>Реклами</h3>' + rowsHtml(r.ads, 'ad') + '</div>';
    html += '<div class="va-card va-help"><h3>Как да четеш таблото</h3><ol>' +
      '<li><b>Достигнати</b> – различни хора, видели рекламата поне веднъж. <b>Показвания</b> – всички показвания, включително повторни.</li>' +
      '<li><b>CTR</b> – колко от видeлите са кликнали. Под 0,8% – видеото/текстът не привличат; над 1,5% е добре.</li>' +
      '<li><b>Стартирани</b> – пикселът е видял, че човекът е минал първата стъпка на конфигуратора (или е направил AI визуализация).</li>' +
      '<li><b>Запитвания</b> – изпратена заявка от планера. <b>$/запитв.</b> е най-важното число: колко струва един потенциален клиент.</li>' +
      '<li>Първите 5–7 дни Meta „учи“ – числата скачат. Не прави промени в този период; агентът също няма да предлага.</li></ol></div>';
    box.innerHTML = html;
  }

  function startReport(panel) {
    var days = Number(ls(LS_DAYS)) || 7;
    panel.innerHTML = '<div class="va-top"></div><div class="va-body"><p class="va-muted">Зареждам…</p></div>';
    var top = panel.querySelector('.va-top'), body = panel.querySelector('.va-body');
    [[7, 'Последните 7 дни'], [14, '14 дни'], [28, '28 дни'], [90, '90 дни']].forEach(function (d) {
      var b = el('button', 'va-btn', d[1]); b.type = 'button'; b.dataset.days = d[0]; top.appendChild(b);
    });
    var refresh = el('button', 'va-btn', '↻ Обнови'); refresh.type = 'button'; refresh.dataset.fresh = '1'; top.appendChild(refresh);
    var busy = false;
    function load(fresh) {
      if (busy) return; busy = true;
      [].forEach.call(top.children, function (b) { b.disabled = true; b.classList.toggle('is-on', Number(b.dataset.days) === days); });
      body.innerHTML = '<p class="va-muted">Зареждам данните от Meta' + (fresh ? ' (до минута)' : '') + '…</p>';
      call('report', { days: days, fresh: !!fresh }).then(function (d) {
        if (d.ok) render(body, d.report, d.cached);
        else body.innerHTML = '<div class="va-card"><p class="va-err">' + esc(d.error || 'Грешка') + '</p></div>' + (d.setup ? setupHelp() : '');
      }).catch(function (e) { body.innerHTML = '<div class="va-card"><p class="va-err">Няма връзка със сървъра: ' + esc(e.message) + '</p></div>'; })
        .then(function () { busy = false; [].forEach.call(top.children, function (b) { b.disabled = false; }); });
    }
    top.addEventListener('click', function (e) {
      var b = e.target.closest('.va-btn'); if (!b) return;
      if (b.dataset.days) { days = Number(b.dataset.days); ls(LS_DAYS, String(days)); load(false); } else load(true);
    });
    load(false);
  }

  /* ---------------- Предложения ---------------- */

  var KIND = { budget: 'Бюджет', pause: 'Пауза', resume: 'Пускане', advice: 'Съвет' };
  var STATUS = { applied: 'Приложено', done: 'Прието', rejected: 'Отказано', reverted: 'Върнато', failed: 'Неуспешно', stale: 'Изтекло' };

  function startProposals(box, setCount) {
    var state = null, busy = false, autoRan = false;

    function metricsLine(p) {
      var m = {}; try { m = JSON.parse(p.metrics_json || '{}'); } catch (e) { /* ignore */ }
      if (!m.spend && !m.impressions) return '';
      return '<p class="sp-q">За периода: ' + usd(m.spend) + ' похарчени, ' + num(m.reach) + ' достигнати, ' + num(m.linkClicks) + ' клика (' + String(m.ctr || 0).replace('.', ',') + '%), ' +
        num(m.started) + ' стартирали, ' + num(m.leads) + ' запитвания' + (m.cpl != null ? ' по ' + usd(m.cpl) : '') + '.</p>';
    }
    function valueHtml(p) {
      if (p.kind === 'budget') return 'Дневен бюджет на „' + esc(p.target_name) + '“: <span style="color:#9b1c10">' + usd(p.current_value) + '</span> → <input class="sp-in" type="number" step="0.5" min="1" value="' + esc(p.proposed_value) + '"> $ <span class="va-muted">(можеш да промениш числото)</span>';
      if (p.kind === 'pause') return 'Да се спре „' + esc(p.target_name) + '“';
      if (p.kind === 'resume') return 'Да се пусне отново „' + esc(p.target_name) + '“';
      return esc(p.proposed_value) + (p.target_name && p.target_name !== 'Акаунтът' ? ' <span class="va-muted">(' + esc(p.target_name) + ')</span>' : '');
    }
    function card(p) {
      var okText = p.kind === 'advice' ? '✓ Разбрах, ще го направим' : p.kind === 'budget' ? '✓ Одобри и смени бюджета' : '✓ Одобри';
      return '<div class="va-card" data-id="' + esc(p.id) + '"><p class="sp-meta"><b>' + esc(KIND[p.kind] || p.kind) + '</b>' + (p.priority === 1 ? ' · <b style="color:#c98a2b">важно</b>' : '') + ' · ' + bgTime(p.created_at) + '</p>' +
        '<p class="sp-val">' + valueHtml(p) + '</p><p class="sp-why">' + esc(p.reason) + '</p>' +
        (p.expected ? '<p class="sp-exp">Очаквано: ' + esc(p.expected) + '</p>' : '') + metricsLine(p) +
        (p.error ? '<p class="va-err">Последен опит: ' + esc(p.error) + '</p>' : '') +
        '<div class="sp-acts"><button type="button" class="va-btn ok" data-act="approve">' + okText + '</button><button type="button" class="va-btn" data-act="reject">Откажи</button></div></div>';
    }
    function hist(p) {
      return '<div class="sp-h" data-id="' + esc(p.id) + '"><p class="sp-meta"><span class="st ' + (p.status === 'applied' || p.status === 'done' ? 'on' : p.status === 'failed' ? 'bad' : p.status === 'reverted' ? 'warn' : 'off') + '">' + (STATUS[p.status] || p.status) + '</span> ' +
        esc(KIND[p.kind] || p.kind) + ' · ' + esc(p.target_name) + ' · ' + bgTime(p.decided_at || p.created_at) + '</p>' +
        '<div style="font-size:13px">' + (p.kind === 'budget' ? usd(p.current_value) + ' → ' + usd(p.proposed_value) + ' на ден' : p.kind === 'advice' ? esc(p.proposed_value) : p.kind === 'pause' ? 'Спряна' : 'Пусната') + '</div>' +
        (p.status === 'applied' ? '<div class="sp-acts" style="margin-top:6px"><button type="button" class="va-btn sm" data-act="revert">↶ Върни както беше</button></div>' : '') +
        (p.status === 'failed' ? (p.error ? '<p class="va-err" style="font-size:12px">' + esc(p.error) + '</p>' : '') + '<div class="sp-acts" style="margin-top:6px"><button type="button" class="va-btn sm ok" data-act="retry">↻ Опитай пак</button></div>' : '') + '</div>';
    }
    function render(msg, isErr) {
      var d = state || { pending: [], history: [] };
      setCount(d.pending.length);
      var html = '<div class="va-card"><h3>Рекламният агент</h3><p class="va-sub">Всяка неделя сутрин (и при „Провери сега“) чете данните от Meta и Google Analytics и предлага какво да се направи: смяна на бюджет, пауза, нов криейтив, ретаргетинг. ' +
        'Одобреният бюджет или пауза се прилага в Meta веднага и може да се върне. Първата седмица на нова реклама агентът само наблюдава.</p>' +
        '<div class="sp-acts"><button type="button" class="va-btn" data-act="run">↻ Провери сега</button>' +
        '<span class="va-muted">' + (d.lastRun ? 'Последна проверка: ' + bgTime(d.lastRun) : 'Още не е проверявал.') + '</span></div>' +
        (msg ? '<p class="' + (isErr ? 'va-err' : 'va-muted') + '" style="margin:10px 0 0">' + esc(msg) + '</p>' : '') +
        (d.analysis && d.analysis.text ? '<p style="margin:12px 0 0;white-space:pre-wrap">' + esc(d.analysis.text) + '</p>' : '') + '</div>';
      if (d.setup) html += setupHelp();
      if (d.pending.length) html += d.pending.map(card).join('');
      else html += '<div class="va-card"><p class="va-muted" style="margin:0">Няма чакащи предложения.</p></div>';
      if (d.history.length) html += '<div class="va-card"><h3>История</h3>' + d.history.map(hist).join('') + '</div>';
      box.innerHTML = html;
    }
    function act(action, extra, waitText) {
      if (busy) return; busy = true;
      [].forEach.call(box.querySelectorAll('button'), function (b) { b.disabled = true; });
      if (waitText) { var info = box.querySelector('.va-card .va-sub'); if (info) info.insertAdjacentHTML('afterend', '<p class="va-muted" style="margin:10px 0 0">' + esc(waitText) + '</p>'); }
      return call(action, extra).then(function (d) {
        if (d.pending) state = Object.assign({ setup: state && state.setup }, d);
        var msg = '';
        if (d.ok && action === 'approve') msg = 'Готово.';
        if (d.ok && action === 'revert') msg = 'Върнато както беше.';
        if (d.ok && action === 'run') msg = d.run && d.run.created ? 'Агентът направи ' + d.run.created + ' нови предложения.' : 'Агентът не намери нищо, което си струва да се сменя в момента.';
        render(d.ok ? msg : (d.error || 'Грешка'), !d.ok);
      }).catch(function (e) { render('Няма връзка със сървъра: ' + e.message, true); }).then(function () { busy = false; });
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]'); if (!b) return;
      var row = b.closest('[data-id]'), id = row ? row.dataset.id : '', a = b.dataset.act;
      if (a === 'run') return act('run', {}, 'Агентът чете данните и мисли… обикновено 30–90 секунди.');
      if (a === 'approve') { var inp = row.querySelector('.sp-in'); b.textContent = 'Прилагам…'; return act('approve', { id: id, value: inp ? inp.value : undefined }); }
      if (a === 'reject') return act('reject', { id: id });
      if (a === 'retry') { b.textContent = 'Прилагам…'; return act('approve', { id: id }); }
      if (a === 'revert') { if (!confirm('Да върна ли предишната стойност в Meta?')) return; b.textContent = 'Връщам…'; return act('revert', { id: id }); }
    });
    box.innerHTML = '<p class="va-muted">Зареждам предложенията…</p>';
    call('list').then(function (d) {
      if (!d.ok) return render(d.error || 'Грешка', true);
      state = d; render();
      if (d.due && !d.setup && !autoRan) { autoRan = true; act('run', {}, 'Седмичната проверка закъснява – агентът я прави сега (30–90 секунди)…'); }
    }).catch(function (e) { render('Няма връзка със сървъра: ' + e.message, true); });
  }

  function start(panel) {
    panel.innerHTML = '<div class="va-views"><button type="button" class="va-view" data-view="report">Табло</button>' +
      '<button type="button" class="va-view" data-view="props">Предложения<span class="va-badge" hidden></span></button></div>' +
      '<div data-box="report"></div><div data-box="props" hidden></div>';
    var views = panel.querySelector('.va-views'), report = panel.querySelector('[data-box="report"]'), props = panel.querySelector('[data-box="props"]');
    var badge = views.querySelector('.va-badge'), started = {};
    function setCount(n) { badge.hidden = !n; badge.textContent = n; }
    function show(v) {
      [].forEach.call(views.children, function (b) { b.classList.toggle('is-on', b.dataset.view === v); });
      report.hidden = v !== 'report'; props.hidden = v !== 'props'; ls(LS_VIEW, v);
      if (!started[v]) { started[v] = 1; if (v === 'report') startReport(report); else startProposals(props, setCount); }
    }
    views.addEventListener('click', function (e) { var b = e.target.closest('.va-view'); if (b) show(b.dataset.view); });
    show(ls(LS_VIEW) === 'props' ? 'props' : 'report');
    if (!started.props) call('list').then(function (d) { if (d.ok && !started.props) setCount(d.pending.length); }).catch(function () {});
  }

  function mount(bar) {
    if (bar.querySelector('[data-tab="ads"]')) return;
    var shell = bar.parentElement;
    var tab = el('button', 'vo-tab', 'Реклами'); tab.type = 'button'; tab.setAttribute('data-tab', 'ads');
    bar.appendChild(tab);
    var panel = el('div', 'vads'); panel.hidden = true; shell.appendChild(panel);
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
