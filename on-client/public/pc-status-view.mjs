// 이 PC의 조회 결과만 표시한다. SDP 연결 표시·AI 입력·원격 전송과 독립적이다.
const REASONS = {
  permission_denied: '읽기 권한이 없습니다. 관리자 권한으로 바꾸기 전에 담당자에게 확인하세요.',
  unsupported: '이 운영체제에서는 이 항목을 조회하지 않습니다.',
  timeout: '조회 시간이 초과됐습니다. 잠시 후 다시 확인하세요.',
};
const bytes = n => `${(n / 1024 ** 3).toFixed(1)} GB`;
const number = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const percent = n => number(n) && n <= 100;
const counter = n => Number.isSafeInteger(n) && n >= 0;
const MAX_SAMPLES = 30;

export function pcMetricText(key, metric) {
  if (metric?.state !== 'ok') return {text: '확인 불가', note: REASONS[metric?.reason] ?? '이번 조회에서 값을 확인하지 못했습니다. 다시 확인해 주세요.', state: 'unavailable'};
  let text, note;
  if (key === 'cpu' && percent(metric.usagePercent)) {
    text = `${metric.usagePercent.toFixed(1)}% 사용`; note = '짧은 구간의 실측값입니다. 계속 높으면 사용 중인 앱을 확인하세요.';
  } else if (key === 'memory' && number(metric.usedBytes) && number(metric.totalBytes) && metric.totalBytes > 0 && metric.usedBytes <= metric.totalBytes) {
    text = `${bytes(metric.usedBytes)} / ${bytes(metric.totalBytes)}`; note = metric.usedBytes / metric.totalBytes >= .85 ? '메모리 사용량이 높습니다. 필요한 작업을 저장하고 사용 중인 앱을 확인하세요.' : '사용 중인 메모리와 전체 메모리입니다.';
  } else if (key === 'disk' && number(metric.freeBytes) && number(metric.totalBytes) && metric.totalBytes > 0 && metric.freeBytes <= metric.totalBytes) {
    text = `${bytes(metric.freeBytes)} 여유 / ${bytes(metric.totalBytes)}`; note = metric.freeBytes / metric.totalBytes < .1 ? '남은 공간이 적습니다. 삭제하기 전에 파일을 확인하고 백업하세요.' : '현재 앱이 있는 디스크의 여유 공간입니다.';
  } else if (key === 'network' && counter(metric.interfaceCount) && counter(metric.ipv4Count)) {
    text = `네트워크 인터페이스 ${metric.interfaceCount}개 · IPv4 구성 ${metric.ipv4Count}개`; note = '로컬 구성 요약입니다. 인터넷 접속이나 ZTNA 허용을 확인한 결과는 아닙니다.';
  } else if (key === 'firewall' && Array.isArray(metric.profiles) && metric.profiles.length === 3 && ['Domain', 'Private', 'Public'].every(name => metric.profiles.some(p => p.name === name && typeof p.enabled === 'boolean'))) {
    text = metric.profiles.map(p => `${p.name} ${p.enabled ? '켜짐' : '꺼짐'}`).join(' · '); note = 'Windows 방화벽 설정을 읽었습니다. 앱이 설정을 바꾸지 않습니다. 보호 전체의 안전 판정은 아닙니다.';
  } else if (key === 'events' && counter(metric.warningCount) && counter(metric.errorCount) && metric.warningCount + metric.errorCount <= 5000 && metric.sampleLimit === 5000 && typeof metric.truncated === 'boolean') {
    text = `최근 24시간 경고 ${metric.warningCount}건 · 오류 ${metric.errorCount}건${metric.truncated ? ' (일부 집계)' : ''}`; note = 'System·Application 기록을 최대 5,000건까지 읽습니다. 오류 건수는 침해 사고 판정이 아닙니다.';
  }
  return text ? {text, note, state: 'measured'} : {text: '확인 불가', note: '응답의 값이나 단위를 확인할 수 없습니다. 정상으로 판단하지 마세요.', state: 'unavailable'};
}

function mountDashboard(pcHost) {
  const doc = pcHost.ownerDocument, win = doc.defaultView;
  const node = (tag, text = '', className = '') => {
    const el = doc.createElement(tag);
    if (text) el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  const dashboard = node('section', '', 'card provided');
  dashboard.setAttribute('aria-labelledby', 'dashboard-title');
  dashboard.dataset.testid = 'ops-dashboard';
  const header = node('div', '', 'dashboard-header');
  const heading = node('h2', '관제 대시보드'); heading.id = 'dashboard-title';
  const description = node('p', '내 PC 실측과 제공 화면의 보안 기록을 구분해 봅니다. 이 대시보드는 안전 판정이나 위협 탐지 기능이 아닙니다.', 'muted');
  const pcStatus = node('p', '내 PC 실측 조회 전 · 예시 값은 표시하지 않습니다.', 'muted');
  pcStatus.setAttribute('role', 'status'); pcStatus.setAttribute('aria-live', 'polite');
  header.append(heading, description, pcStatus); dashboard.append(header);

  const cardGrid = node('div', '', 'grid-2');
  cardGrid.setAttribute('aria-label', '내 PC 실측 상태 카드');
  const cards = new Map();
  for (const [key, label] of [['cpu', 'CPU'], ['memory', '메모리'], ['disk', '디스크'], ['firewall', 'Windows 방화벽']]) {
    const card = node('article', '', 'card dashboard-metric');
    const title = node('h3', label), value = node('p', '확인 불가'), detail = node('p', '실측 조회 전', 'muted'), source = node('p', '실측 자료 없음 · 예시 값 없음', 'muted');
    value.setAttribute('aria-live', 'polite'); card.append(title, value, detail, source); cardGrid.append(card);
    cards.set(key, {card, value, detail, source});
  }
  dashboard.append(cardGrid);

  const panels = node('div', '', 'grid-2');
  const trendPanel = node('section', '', 'card');
  trendPanel.setAttribute('aria-labelledby', 'dashboard-trend-title');
  const trendTitle = node('h3', '실측 추이'); trendTitle.id = 'dashboard-trend-title';
  const trendNote = node('p', '이 앱을 켠 뒤 성공한 조회만 기록합니다. 예시 값이나 저장된 과거 값은 사용하지 않습니다.', 'muted');
  const chart = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chart.setAttribute('viewBox', '0 0 600 220'); chart.setAttribute('role', 'img');
  chart.setAttribute('aria-label', '세션 내 CPU·메모리·디스크 실측 추이. 측정 자료가 없습니다.');
  chart.setAttribute('width', '100%'); chart.setAttribute('height', '220');
  const legend = node('ul');
  for (const label of ['CPU 사용률', '메모리 사용률', '디스크 사용률']) legend.append(node('li', label));
  const trendSummary = node('p', '실측 표본이 없습니다.', 'muted'); trendSummary.setAttribute('aria-live', 'polite');
  trendPanel.append(trendTitle, trendNote, chart, legend, trendSummary);

  const recordsPanel = node('section', '', 'card');
  recordsPanel.setAttribute('aria-labelledby', 'dashboard-records-title');
  const recordsTitle = node('h3', '최근 보안 기록'); recordsTitle.id = 'dashboard-records-title';
  const recordsSource = node('p', '제공 화면의 기록 자료를 확인하는 중입니다.', 'muted');
  recordsSource.setAttribute('role', 'status'); recordsSource.setAttribute('aria-live', 'polite');
  const recordList = node('ul'); recordList.setAttribute('aria-label', '최근 보안 기록 요약');
  const recordsNote = node('p', '제공 화면에 나온 순서에서 최대 5건을 요약합니다. 전체 로그나 실시간 위협 탐지가 아닙니다.', 'muted');
  recordsPanel.append(recordsTitle, recordsSource, recordList, recordsNote);
  panels.append(trendPanel, recordsPanel); dashboard.append(panels);
  pcHost.parentNode.insertBefore(dashboard, pcHost);

  const samples = [];
  const series = [
    {key: 'cpu', label: 'CPU', color: '#1d4ed8'},
    {key: 'memory', label: '메모리', color: '#047857'},
    {key: 'disk', label: '디스크', color: '#b45309'},
  ];
  const svg = (tag, attrs = {}) => {
    const el = doc.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
    return el;
  };
  function renderChart() {
    chart.replaceChildren();
    const title = doc.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = samples.length ? `세션 내 실제 PC 실측 ${samples.length}회` : '세션 내 실측 자료 없음';
    chart.append(title);
    const left = 42, right = 585, top = 15, bottom = 178;
    for (const tick of [0, 50, 100]) {
      const y = bottom - tick / 100 * (bottom - top);
      chart.append(svg('line', {x1:left, y1:y, x2:right, y2:y, stroke:'#cbd5e1', 'stroke-width':1}));
      const label = svg('text', {x:3, y:y + 4, fill:'#334155', 'font-size':12}); label.textContent = `${tick}%`; chart.append(label);
    }
    if (!samples.length) return;
    for (const item of series) {
      const points = samples.map((sample, index) => ({sample, index, value:sample[item.key]})).filter(point => Number.isFinite(point.value));
      const x = i => samples.length === 1 ? (left + right) / 2 : left + i / (samples.length - 1) * (right - left);
      const y = value => bottom - value / 100 * (bottom - top);
      for (let i = 1; i < points.length; i += 1) {
        chart.append(svg('line', {x1:x(points[i-1].index), y1:y(points[i-1].value), x2:x(points[i].index), y2:y(points[i].value), stroke:item.color, 'stroke-width':2}));
      }
      for (const point of points) {
        const dot = svg('circle', {cx:x(point.index), cy:y(point.value), r:4, fill:item.color});
        const hint = doc.createElementNS('http://www.w3.org/2000/svg', 'title');
        hint.textContent = `${item.label} ${point.value.toFixed(1)}% · ${new Date(point.sample.at).toLocaleString('ko-KR')}`;
        dot.append(hint); chart.append(dot);
      }
    }
    chart.setAttribute('aria-label', `세션 내 CPU·메모리·디스크 실측 추이, ${samples.length}회 측정, 백분율`);
  }
  function renderTrendSummary() {
    if (!samples.length) {trendSummary.textContent = '실측 표본이 없습니다. 「내 PC 확인」 또는 자동 확인을 직접 사용하면 실제 조회 값만 추가됩니다.'; return;}
    const latest = samples[samples.length - 1];
    const values = series.filter(item => Number.isFinite(latest[item.key])).map(item => `${item.label} ${latest[item.key].toFixed(1)}%`);
    trendSummary.textContent = `실측 ${samples.length}회 · 최근 ${new Date(latest.at).toLocaleString('ko-KR')} · ${values.join(' · ') || '표시 가능한 값 없음'}. 메모리상의 세션 자료이며 새로고침하면 초기화됩니다.`;
  }
  function renderRecords() {
    recordList.replaceChildren();
    const mode = doc.getElementById('mode-badge')?.dataset.mode || 'unknown';
    const labels = {connected:'연결됨', demo:'예제 자료(demo) · 실제 기록 아님', disconnected:'연결 없음', unknown:'확인 불가', loading:'모드 확인 중'};
    recordsSource.textContent = `제공 기록 자료 모드: ${labels[mode] || '확인 불가'}. PC 실측 추이와 별도입니다.`;
    const source = doc.getElementById('records-list');
    const eventNodes = source ? Array.from(source.querySelectorAll(':scope > li.event')) : [];
    if (!eventNodes.length) {
      const sourceMessage = source ? Array.from(source.children).map(el => el.textContent?.replace(/\s+/g, ' ').trim()).find(Boolean) : '';
      let message;
      if (mode === 'disconnected') message = '연결 없음은 이번 과정에서 정상일 수 있습니다. 이를 실제 기록 없음이나 안전 판정으로 해석하지 마세요.';
      else if (mode === 'demo') message = sourceMessage || '예제 자료에서 표시할 기록이 없습니다. 실제 기록이 아닙니다.';
      else if (mode === 'connected' && sourceMessage) message = sourceMessage;
      else message = '제공 화면에 현재 표시된 기록 항목이 없습니다. 기록 없음은 조회 실패·미연결과 다르며, 안전을 보장하지 않습니다.';
      recordList.append(node('li', message)); return;
    }
    for (const event of eventNodes.slice(0, 5)) {
      const item = node('li');
      const head = event.querySelector('.event-head h3')?.textContent?.replace(/\s+/g, ' ').trim() || '보안 기록';
      const content = event.textContent?.replace(/\s+/g, ' ').trim() || '';
      item.append(node('strong', head), node('p', content.startsWith(head) ? content.slice(head.length).trim().slice(0, 260) : content.slice(0, 260)));
      recordList.append(item);
    }
  }
  const recordsList = doc.getElementById('records-list');
  const recordsObserver = recordsList ? new win.MutationObserver(renderRecords) : null;
  recordsObserver?.observe(recordsList, {childList:true, subtree:true, characterData:true});
  const badge = doc.getElementById('mode-badge');
  const modeObserver = badge ? new win.MutationObserver(renderRecords) : null;
  modeObserver?.observe(badge, {attributes:true, childList:true, characterData:true, subtree:true});

  function update({state, measuredAt = '', metrics = {}}) {
    const measuredTime = Number.isFinite(Date.parse(measuredAt)) ? new Date(measuredAt).toLocaleString('ko-KR') : '시각 확인 불가';
    const setCard = (key, value, detail, source, status) => {
      const row = cards.get(key); row.value.textContent = value; row.detail.textContent = detail; row.source.textContent = source; row.card.dataset.state = status;
    };
    if (state === 'loading') {
      pcStatus.textContent = '내 PC 실측 조회 중 · 이전 값은 현재 값으로 표시하지 않습니다.';
      for (const [key] of cards) setCard(key, '조회 중', '새 측정 결과 대기 중', '현재 실측 대기 · 예시 값 없음', 'loading');
      return;
    }
    if (state === 'error') {
      pcStatus.textContent = '이번 PC 실측을 확인하지 못했습니다. 이전 값은 현재 상태로 표시하지 않습니다.';
      for (const [key] of cards) setCard(key, '확인 불가', '이번 조회에서 값을 확인하지 못했습니다.', '조회 실패 · 실측값 없음 · 예시 값 없음', 'unavailable');
      return;
    }
    if (state === 'idle') {
      pcStatus.textContent = '내 PC 실측 조회 전 · 예시 값은 표시하지 않습니다.';
      for (const [key] of cards) setCard(key, '확인 불가', '사용자가 아직 조회하지 않았습니다.', '실측 자료 없음 · 예시 값 없음', 'unavailable');
      return;
    }
    let available = 0;
    for (const [key] of cards) {
      const metric = metrics[key];
      if (metric?.state === 'measured' && metric.text) {
        available += 1; setCard(key, metric.text, metric.note, `실측 · 이 PC · ${measuredTime}`, 'measured');
      } else setCard(key, '확인 불가', metric?.note || '이번 조회에서 값을 확인하지 못했습니다.', `이번 실측에서 확인 불가 · ${measuredTime}`, 'unavailable');
    }
    pcStatus.textContent = `이 PC 실측 · ${measuredTime} · 카드 확인 ${available}/4 · 예시 값 미포함`;
    const sample = metrics.sample;
    if (sample && !samples.some(item => item.at === measuredAt)) {
      samples.push({at: measuredAt, ...sample});
      if (samples.length > MAX_SAMPLES) samples.splice(0, samples.length - MAX_SAMPLES);
      renderChart(); renderTrendSummary();
    }
  }
  renderChart(); renderTrendSummary(); renderRecords();
  return {update, dispose() {recordsObserver?.disconnect(); modeObserver?.disconnect(); dashboard.remove();}};
}

export function mountPcStatus(host, {fetchImpl = globalThis.fetch?.bind(globalThis), intervalMs = 10000, timeoutMs = 10000} = {}) {
  const doc = host.ownerDocument, win = doc.defaultView;
  const make = (tag, text, cls) => {const node = doc.createElement(tag); if (text) node.textContent = text; if (cls) node.className = cls; return node;};
  const dashboard = mountDashboard(host);
  const heading = make('h2', '내 PC 상태');
  const intro = make('p', '이 앱을 실행한 PC의 값을 읽습니다. 제공된 조회 기능이며 학생 구현 성취와 구분합니다. 이 결과는 AI나 외부 서버로 자동 전송하지 않습니다.', 'muted');
  const refresh = make('button', '내 PC 확인', 'btn'); refresh.type = 'button';
  const label = make('label', '', 'pc-auto'); const auto = doc.createElement('input'); auto.type = 'checkbox';
  label.append(auto, doc.createTextNode(' 10초마다 확인 (앱 탭이 보이는 동안)'));
  const status = make('p', '아직 조회하지 않았습니다.', 'muted'); status.setAttribute('role', 'status');
  const grid = make('div', '', 'pc-metrics');
  const rows = new Map();
  for (const [key, title] of Object.entries({cpu: 'CPU', memory: '메모리', disk: '디스크', network: '네트워크', firewall: 'Windows 방화벽', events: 'Windows 기록'})) {
    const article = make('article', '', 'pc-metric'), value = make('p', '아직 조회하지 않음', 'pc-value'), note = make('p', '', 'muted');
    article.append(make('h3', title), value, note); grid.append(article); rows.set(key, {article, value, note});
  }
  host.replaceChildren(heading, intro, refresh, label, status, grid);
  let disposed = false, controller = null, generation = 0, timer = null;
  function stopTimer() {if (timer !== null) win.clearTimeout(timer); timer = null;}
  function next() {stopTimer(); if (!disposed && auto.checked && !doc.hidden) timer = win.setTimeout(() => {void read();}, Math.max(10000, intervalMs));}
  function unavailable() {for (const row of rows.values()) {row.article.dataset.state = 'unavailable'; row.value.textContent = '이번 조회 확인 불가'; row.note.textContent = '이전 값을 현재 상태로 표시하지 않습니다.';}}
  async function read() {
    if (disposed || doc.hidden) return;
    stopTimer(); controller?.abort(); const own = ++generation, abort = new AbortController(); controller = abort;
    dashboard.update({state:'loading'});
    refresh.disabled = true; status.textContent = '이 PC에서 읽는 중…';
    let timedOut = false;
    const deadline = win.setTimeout(() => {timedOut = true; abort.abort();}, timeoutMs);
    try {
      const stopped = new Promise((_, reject) => abort.signal.addEventListener('abort', () => reject(Error('cancelled')), {once: true}));
      const result = await Promise.race([Promise.resolve().then(async () => {
        const response = await fetchImpl('/api/pc/status', {cache: 'no-store', signal: abort.signal});
        if (!response.ok) throw Error('failed'); return response.json();
      }), stopped]);
      if (disposed || own !== generation) return;
      const data = result?.ok === true ? result.data : null;
      const measured = typeof data?.measuredAt === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(data.measuredAt) ? Date.parse(data.measuredAt) : NaN;
      if (data?.schema !== 'aleph.on.pc-status.v1' || data.source !== 'local-pc' || !Number.isFinite(measured) || Math.abs(Date.now() - measured) > 60000) throw Error('stale');
      const cardMetrics = {};
      for (const [key, row] of rows) {
        const info = pcMetricText(key, data.metrics?.[key]);
        row.article.dataset.state = info.state; row.value.textContent = info.text; row.note.textContent = info.note;
        if (['cpu','memory','disk','firewall'].includes(key)) cardMetrics[key] = info;
      }
      const cpu = data.metrics?.cpu, memory = data.metrics?.memory, disk = data.metrics?.disk;
      const sample = {};
      if (cpu?.state === 'ok' && percent(cpu.usagePercent)) sample.cpu = cpu.usagePercent;
      if (memory?.state === 'ok' && number(memory.usedBytes) && number(memory.totalBytes) && memory.totalBytes > 0 && memory.usedBytes <= memory.totalBytes) sample.memory = memory.usedBytes / memory.totalBytes * 100;
      if (disk?.state === 'ok' && number(disk.freeBytes) && number(disk.totalBytes) && disk.totalBytes > 0 && disk.freeBytes <= disk.totalBytes) sample.disk = (disk.totalBytes - disk.freeBytes) / disk.totalBytes * 100;
      dashboard.update({state:'ok', measuredAt:data.measuredAt, metrics:{...cardMetrics, sample:Object.keys(sample).length ? sample : null}});
      status.textContent = `이 PC 마지막 실측 · ${new Date(measured).toLocaleString('ko-KR')} · 보안 서버 연결 상태와 별도`;
    } catch {
      if (disposed || own !== generation) return;
      unavailable(); dashboard.update({state:'error'});
      status.textContent = timedOut ? REASONS.timeout : '이번 상태를 확인하지 못했습니다. 앱이 실행 중인지 확인하고 다시 조회하세요.';
    } finally {
      win.clearTimeout(deadline);
      if (!disposed && own === generation) {controller = null; refresh.disabled = false; next();}
    }
  }
  const visibility = () => {
    if (doc.hidden) {stopTimer(); generation++; controller?.abort(); controller = null; refresh.disabled = false; unavailable(); dashboard.update({state:'error'}); status.textContent = '화면을 보지 않는 동안 자동 확인을 멈췄습니다.';}
    else if (auto.checked) void read();
  };
  refresh.addEventListener('click', read);
  const onAuto = () => {if (auto.checked) void read(); else stopTimer();}; auto.addEventListener('change', onAuto);
  doc.addEventListener('visibilitychange', visibility);
  const dispose = () => {if (disposed) return; disposed = true; generation++; stopTimer(); controller?.abort(); refresh.removeEventListener('click', read); auto.removeEventListener('change', onAuto); doc.removeEventListener('visibilitychange', visibility); dashboard.dispose(); win.removeEventListener('pagehide', dispose);};
  win.addEventListener('pagehide', dispose, {once: true});
  return {read, dispose};
}
