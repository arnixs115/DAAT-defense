// 기존 PC 실측 컴포넌트와 제공 보안 기록 목록을 읽기 전용으로 요약하는 대시보드.
// 별도 네트워크 요청·예제 측정값·보안 판정은 만들지 않는다.
const PC_EVENT = 'alekov:pc-status';
const SERIES = [
  { key: 'cpu', label: 'CPU 사용', color: 'cpu' },
  { key: 'memory', label: '메모리 사용', color: 'memory' },
  { key: 'disk', label: '디스크 사용', color: 'disk' },
];
const MAX_SAMPLES = 30;

export function mountDashboard(pcHost) {
  const doc = pcHost.ownerDocument;
  const win = doc.defaultView;
  const link = doc.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/dashboard.css';
  doc.head.append(link);

  const section = doc.createElement('section');
  section.className = 'ops-dashboard card';
  section.setAttribute('aria-labelledby', 'ops-dashboard-title');
  section.dataset.testid = 'ops-dashboard';

  const header = doc.createElement('div');
  header.className = 'ops-dashboard-header';
  const titleBlock = doc.createElement('div');
  const title = doc.createElement('h2');
  title.id = 'ops-dashboard-title';
  title.textContent = '관제 대시보드';
  const subtitle = doc.createElement('p');
  subtitle.className = 'ops-dashboard-subtitle';
  subtitle.textContent = '내 PC의 읽기 전용 실측과 제공 화면의 보안 기록을 구분해 봅니다. 안전 판정이나 차단 기능은 아닙니다.';
  titleBlock.append(title, subtitle);
  const currentStatus = doc.createElement('p');
  currentStatus.className = 'ops-dashboard-status';
  currentStatus.setAttribute('role', 'status');
  currentStatus.setAttribute('aria-live', 'polite');
  currentStatus.textContent = '내 PC 실측 조회 전 · 예시 값은 표시하지 않습니다.';
  header.append(titleBlock, currentStatus);
  section.append(header);

  const cards = doc.createElement('div');
  cards.className = 'ops-dashboard-cards';
  cards.setAttribute('aria-label', '내 PC 상태 카드');
  const cardNodes = new Map();
  const cardDefinitions = [
    ['cpu', 'CPU'],
    ['memory', '메모리'],
    ['disk', '디스크'],
    ['firewall', 'Windows 방화벽'],
  ];
  for (const [key, labelText] of cardDefinitions) {
    const card = doc.createElement('article');
    card.className = 'ops-metric-card';
    card.dataset.metric = key;
    const heading = doc.createElement('h3');
    heading.textContent = labelText;
    const value = doc.createElement('p');
    value.className = 'ops-metric-value';
    value.textContent = '확인 불가';
    const detail = doc.createElement('p');
    detail.className = 'ops-metric-detail';
    detail.textContent = '실측 조회 전';
    const source = doc.createElement('p');
    source.className = 'ops-metric-source';
    source.textContent = '실측 자료 없음 · 예시 값 없음';
    card.append(heading, value, detail, source);
    cards.append(card);
    cardNodes.set(key, { card, value, detail, source });
  }
  section.append(cards);

  const panels = doc.createElement('div');
  panels.className = 'ops-dashboard-panels';
  const trendPanel = doc.createElement('section');
  trendPanel.className = 'ops-dashboard-panel';
  trendPanel.setAttribute('aria-labelledby', 'ops-trend-title');
  const trendTitle = doc.createElement('h3');
  trendTitle.id = 'ops-trend-title';
  trendTitle.textContent = '실측 추이';
  const trendNote = doc.createElement('p');
  trendNote.className = 'ops-panel-note';
  trendNote.textContent = '이 앱을 켠 뒤 성공한 실측만 기록합니다. 예시 값이나 저장된 과거 값은 포함하지 않습니다.';
  const chart = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chart.classList.add('ops-trend-chart');
  chart.setAttribute('viewBox', '0 0 720 240');
  chart.setAttribute('role', 'img');
  chart.setAttribute('aria-label', 'CPU·메모리·디스크 사용률의 세션 내 실측 추이. 아직 측정하지 않았습니다.');
  const chartTitle = doc.createElementNS('http://www.w3.org/2000/svg', 'title');
  chartTitle.textContent = '세션 내 PC 실측 추이';
  chart.append(chartTitle);
  const legend = doc.createElement('ul');
  legend.className = 'ops-chart-legend';
  for (const series of SERIES) {
    const item = doc.createElement('li');
    const swatch = doc.createElement('span');
    swatch.className = `ops-legend-swatch ops-series-${series.color}`;
    swatch.setAttribute('aria-hidden', 'true');
    const text = doc.createElement('span');
    text.textContent = `${series.label} (%)`;
    item.append(swatch, text);
    legend.append(item);
  }
  const trendSummary = doc.createElement('p');
  trendSummary.className = 'ops-trend-summary';
  trendSummary.setAttribute('aria-live', 'polite');
  trendSummary.textContent = '실측 표본이 없습니다.';
  trendPanel.append(trendTitle, trendNote, chart, legend, trendSummary);

  const recordsPanel = doc.createElement('section');
  recordsPanel.className = 'ops-dashboard-panel';
  recordsPanel.setAttribute('aria-labelledby', 'ops-records-title');
  const recordsTitle = doc.createElement('h3');
  recordsTitle.id = 'ops-records-title';
  recordsTitle.textContent = '보안 기록';
  const recordsSource = doc.createElement('p');
  recordsSource.className = 'ops-panel-note';
  recordsSource.setAttribute('role', 'status');
  recordsSource.setAttribute('aria-live', 'polite');
  recordsSource.textContent = '제공 화면의 기록 자료 모드를 확인하는 중입니다.';
  const records = doc.createElement('ul');
  records.className = 'ops-recent-records';
  records.setAttribute('aria-label', '제공 화면의 기록 목록');
  const recordsLimit = doc.createElement('p');
  recordsLimit.className = 'ops-panel-note';
  recordsLimit.textContent = '제공 화면에 표시된 순서에서 최대 5건을 요약합니다. 전체 기록과 실시간 위협 탐지는 아닙니다.';
  recordsPanel.append(recordsTitle, recordsSource, records, recordsLimit);
  panels.append(trendPanel, recordsPanel);
  section.append(panels);
  pcHost.parentNode.insertBefore(section, pcHost);

  const samples = [];
  let currentPcStatus = 'idle';
  let disposed = false;

  const makeText = (tag, text, className) => {
    const node = doc.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const metricNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const percent = (value) => metricNumber(value) && value <= 100;
  const updateCard = (key, valueText, detailText, sourceText, state) => {
    const item = cardNodes.get(key);
    if (!item) return;
    item.value.textContent = valueText;
    item.detail.textContent = detailText;
    item.source.textContent = sourceText;
    item.card.dataset.state = state;
  };
  const sourceMetric = (key) => pcHost.querySelector(`[data-metric="${key}"]`);
  const renderCards = (state, measuredAt = '') => {
    const formattedTime = measuredAt && Number.isFinite(Date.parse(measuredAt))
      ? new Date(measuredAt).toLocaleString('ko-KR')
      : '시각 확인 불가';
    if (state === 'loading') {
      currentStatus.textContent = '내 PC 실측 조회 중 · 이전 값은 현재 값으로 표시하지 않습니다.';
      for (const [key] of cardDefinitions) updateCard(key, '조회 중', '새 측정 결과를 기다리는 중입니다.', '현재 실측 대기 · 예시 값 없음', 'loading');
      return;
    }
    if (state === 'error') {
      currentStatus.textContent = '이번 PC 실측을 확인하지 못했습니다. 이전 값은 현재 상태로 표시하지 않습니다.';
      for (const [key] of cardDefinitions) updateCard(key, '확인 불가', '이번 조회에서 현재 값을 확인하지 못했습니다.', '조회 실패 · 실측값 없음 · 예시 값 없음', 'unavailable');
      return;
    }
    if (state === 'idle') {
      currentStatus.textContent = '내 PC 실측 조회 전 · 예시 값은 표시하지 않습니다.';
      for (const [key] of cardDefinitions) updateCard(key, '확인 불가', '사용자가 아직 PC 상태를 조회하지 않았습니다.', '실측 자료 없음 · 예시 값 없음', 'unavailable');
      return;
    }

    const metricKeys = { cpu: 'cpu', memory: 'memory', disk: 'disk', firewall: 'firewall' };
    let measuredCount = 0;
    for (const [key, metricKey] of Object.entries(metricKeys)) {
      const source = sourceMetric(metricKey);
      const isMeasured = source?.dataset.state === 'measured';
      const value = source?.querySelector('.pc-value')?.textContent?.trim() || '확인 불가';
      const note = source?.querySelector('.muted')?.textContent?.trim() || '이번 조회에서 값을 확인하지 못했습니다.';
      if (isMeasured) {
        measuredCount += 1;
        updateCard(key, value, note, `실측 · 이 PC · ${formattedTime}`, 'measured');
      } else {
        updateCard(key, '확인 불가', note, `이번 실측에서 확인 불가 · ${formattedTime}`, 'unavailable');
      }
    }
    currentStatus.textContent = `이 PC 실측 · ${formattedTime} · 카드 확인 ${measuredCount}/4 · 예시 값 미포함`;
  };

  const extractSample = (data, measuredAt) => {
    const metrics = data?.metrics;
    const cpu = metrics?.cpu;
    const memory = metrics?.memory;
    const disk = metrics?.disk;
    const values = {};
    if (cpu?.state === 'ok' && percent(cpu.usagePercent)) values.cpu = cpu.usagePercent;
    if (memory?.state === 'ok' && metricNumber(memory.usedBytes) && metricNumber(memory.totalBytes)
      && memory.totalBytes > 0 && memory.usedBytes <= memory.totalBytes) {
      values.memory = (memory.usedBytes / memory.totalBytes) * 100;
    }
    if (disk?.state === 'ok' && metricNumber(disk.freeBytes) && metricNumber(disk.totalBytes)
      && disk.totalBytes > 0 && disk.freeBytes <= disk.totalBytes) {
      values.disk = ((disk.totalBytes - disk.freeBytes) / disk.totalBytes) * 100;
    }
    if (Object.keys(values).length === 0) return null;
    return { measuredAt, values };
  };

  const svgElement = (name, attributes = {}) => {
    const element = doc.createElementNS('http://www.w3.org/2000/svg', name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
    return element;
  };
  const renderChart = () => {
    chart.replaceChildren();
    const accessibleTitle = doc.createElementNS('http://www.w3.org/2000/svg', 'title');
    accessibleTitle.textContent = samples.length
      ? `세션 내 실측 추이, ${samples.length}회 측정`
      : '세션 내 실측 추이, 측정 자료 없음';
    chart.append(accessibleTitle);
    const xStart = 48;
    const xEnd = 700;
    const yTop = 20;
    const yBottom = 190;
    for (const tick of [0, 50, 100]) {
      const y = yBottom - (tick / 100) * (yBottom - yTop);
      chart.append(svgElement('line', { x1: xStart, y1: y, x2: xEnd, y2: y, class: 'ops-chart-grid' }));
      const label = svgElement('text', { x: 8, y: y + 4, class: 'ops-chart-axis' });
      label.textContent = `${tick}%`;
      chart.append(label);
    }
    if (samples.length === 0) {
      chart.setAttribute('aria-label', 'CPU·메모리·디스크 사용률의 세션 내 실측 추이. 측정 자료가 없습니다.');
      return;
    }
    const xAt = (index) => samples.length === 1
      ? (xStart + xEnd) / 2
      : xStart + (index / (samples.length - 1)) * (xEnd - xStart);
    const yAt = (value) => yBottom - (value / 100) * (yBottom - yTop);
    for (const series of SERIES) {
      const coords = samples.map((sample, index) => {
        const value = sample.values[series.key];
        return typeof value === 'number' ? { index, value, x: xAt(index), y: yAt(value), sample } : null;
      });
      for (let index = 1; index < coords.length; index += 1) {
        const previous = coords[index - 1];
        const current = coords[index];
        if (!previous || !current) continue;
        chart.append(svgElement('line', {
          x1: previous.x, y1: previous.y, x2: current.x, y2: current.y,
          class: `ops-chart-line ops-series-${series.color}`,
        }));
      }
      for (const point of coords.filter(Boolean)) {
        const circle = svgElement('circle', {
          cx: point.x, cy: point.y, r: 4,
          class: `ops-chart-point ops-series-${series.color}`,
        });
        const titleNode = doc.createElementNS('http://www.w3.org/2000/svg', 'title');
        titleNode.textContent = `${series.label}: ${point.value.toFixed(1)}% · ${new Date(point.sample.measuredAt).toLocaleString('ko-KR')}`;
        circle.append(titleNode);
        chart.append(circle);
      }
    }
    chart.setAttribute('aria-label', `CPU·메모리·디스크 사용률의 세션 내 실측 추이. 실측 ${samples.length}회. 퍼센트 단위.`);
  };
  const renderTrendSummary = () => {
    if (samples.length === 0) {
      trendSummary.textContent = '실측 표본이 없습니다. 「내 PC 확인」 또는 「10초마다 확인」을 직접 사용하면 실제 조회된 값만 추가됩니다.';
      return;
    }
    const latest = samples[samples.length - 1];
    const values = SERIES
      .filter((series) => typeof latest.values[series.key] === 'number')
      .map((series) => `${series.label} ${latest.values[series.key].toFixed(1)}%`);
    trendSummary.textContent = `실측 표본 ${samples.length}회 · 최근 ${new Date(latest.measuredAt).toLocaleString('ko-KR')} · ${values.length ? values.join(' · ') : '표시 가능한 값 없음'}. 이 기록은 앱 실행 중 메모리에만 있으며 새로고침하면 초기화됩니다.`;
  };

  const renderRecords = () => {
    records.replaceChildren();
    const badge = doc.getElementById('mode-badge');
    const mode = badge?.dataset.mode || 'unknown';
    const modeText = {
      connected: '연결됨',
      demo: '예제 자료 · 실제 기록이 아님',
      disconnected: '연결 없음',
      unknown: '확인 불가',
      loading: '모드 확인 중',
    }[mode] || '확인 불가';
    recordsSource.textContent = `제공 기록 자료 모드: ${modeText}. 이 목록은 제공 화면이 표시한 기록을 요약하며 PC 실측 추이와 별도입니다.`;

    const sourceList = doc.getElementById('records-list');
    if (!sourceList) {
      records.append(makeText('li', '제공 화면의 기록 목록을 찾을 수 없습니다.', 'ops-record-empty'));
      return;
    }
    const eventNodes = Array.from(sourceList.querySelectorAll(':scope > li.event'));
    if (eventNodes.length === 0) {
      const sourceMessage = Array.from(sourceList.children)
        .map((node) => node.textContent?.replace(/\s+/g, ' ').trim())
        .find((text) => text && text.length > 0);
      let message;
      if (mode === 'disconnected') {
        message = '연결 없음은 이번 과정의 정상 상태일 수 있습니다. 개인 인증 자료를 요청하지 말고, 연결되지 않은 목록을 실제 기록이나 안전 판정으로 해석하지 마세요.';
      } else if (mode === 'demo') {
        message = sourceMessage || '예제 자료에서 표시할 보안 기록을 확인할 수 없습니다. 실제 기록이 아닙니다.';
      } else if (mode === 'connected' && sourceMessage) {
        message = sourceMessage;
      } else {
        message = '현재 제공 화면에서 표시 중인 기록 항목이 없습니다. 조회 실패·연결 없음과 구분하고, 기록이 없다는 사실만으로 안전을 판단하지 마세요.';
      }
      records.append(makeText('li', message, 'ops-record-empty'));
      return;
    }
    for (const sourceEvent of eventNodes.slice(0, 5)) {
      const item = doc.createElement('li');
      item.className = 'ops-record-item';
      const sourceHeading = sourceEvent.querySelector('.event-head h3');
      const headingText = sourceHeading?.textContent?.replace(/\s+/g, ' ').trim() || '보안 기록';
      const fullText = sourceEvent.textContent?.replace(/\s+/g, ' ').trim() || '';
      const remainder = fullText.startsWith(headingText)
        ? fullText.slice(headingText.length).trim()
        : fullText;
      item.append(makeText('h4', headingText, 'ops-record-title'));
      item.append(makeText('p', remainder.slice(0, 260) || '기록 세부 내용은 제공 화면에서 확인하세요.', 'ops-record-description'));
      records.append(item);
    }
  };

  const onPcStatus = (event) => {
    if (disposed) return;
    const detail = event?.detail || {};
    currentPcStatus = detail.state || 'unknown';
    renderCards(currentPcStatus, detail.measuredAt || '');
    if (currentPcStatus === 'ok') {
      const sample = extractSample(detail.data, detail.measuredAt);
      if (sample && !samples.some((existing) => existing.measuredAt === sample.measuredAt)) {
        samples.push(sample);
        if (samples.length > MAX_SAMPLES) samples.splice(0, samples.length - MAX_SAMPLES);
        renderChart();
        renderTrendSummary();
      }
    }
  };
  win.addEventListener(PC_EVENT, onPcStatus);

  const sourceList = doc.getElementById('records-list');
  const recordsObserver = sourceList
    ? new win.MutationObserver(renderRecords)
    : null;
  recordsObserver?.observe(sourceList, { childList: true, subtree: true, characterData: true });
  const badge = doc.getElementById('mode-badge');
  const modeObserver = badge
    ? new win.MutationObserver(renderRecords)
    : null;
  modeObserver?.observe(badge, { attributes: true, childList: true, characterData: true, subtree: true });

  renderCards('idle');
  renderChart();
  renderTrendSummary();
  renderRecords();

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      win.removeEventListener(PC_EVENT, onPcStatus);
      recordsObserver?.disconnect();
      modeObserver?.disconnect();
      section.remove();
      link.remove();
    },
  };
}
