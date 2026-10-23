// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView() {
  return {
    renderIdentity({ me, devices, sessions } = {}) {
      const root = document.createElement('div');
      const deviceLabels = {
        compliant: '보안 기준 충족',
        noncompliant: '보안 기준 미충족',
        unknown: '확인 불가',
      };
      const sessionLabels = {
        active: '활성',
        expired: '만료',
        revoked: '철회됨',
        unknown: '확인 불가',
      };
      const modeLabels = {
        connected: '연결됨',
        demo: '예제 자료',
        disconnected: '연결 없음',
        unknown: '확인 불가',
      };
      const addText = (parent, tag, text) => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        parent.append(node);
        return node;
      };
      const valueText = (value) => typeof value === 'string' && value.length > 0 ? value : '확인 불가';
      const statusText = (labels, value) => labels[value]
        ? `${labels[value]} (${value})`
        : '확인 불가';
      const modeText = (resource) => modeLabels[resource?.mode] || modeLabels.unknown;
      const errorText = (resource) => {
        const message = resource?.error?.message;
        return typeof message === 'string' && message.length > 0
          ? `연결 실패 또는 확인 불가: ${message}`
          : '연결 실패 또는 확인 불가: 서버 오류 메시지를 확인할 수 없습니다.';
      };
      const renderResource = (title, resource, renderData) => {
        const section = document.createElement('section');
        addText(section, 'h3', title);
        addText(section, 'p', `자료 모드: ${modeText(resource)}`);
        if (resource?.status === 'loading') {
          addText(section, 'p', '불러오는 중');
        } else if (resource?.status === 'error') {
          addText(section, 'p', errorText(resource));
        } else if (resource?.status === 'ok') {
          renderData(section, resource.data);
        } else {
          addText(section, 'p', '확인 불가');
        }
        root.append(section);
      };

      renderResource('로그인 사용자·현재 기기·세션', me, (section, data) => {
        const user = data?.user;
        const device = data?.device;
        const session = data?.session;
        addText(section, 'p', `사용자: ${valueText(user?.label)} (ID: ${valueText(user?.id)})`);
        addText(section, 'p', `기기: ${valueText(device?.label)} (ID: ${valueText(device?.id)}) · ${statusText(deviceLabels, device?.status)}`);
        addText(section, 'p', `세션 ID: ${valueText(session?.id)} · ${statusText(sessionLabels, session?.status)}`);
      });

      renderResource('기기 목록', devices, (section, data) => {
        if (!Array.isArray(data) || data.length === 0) {
          addText(section, 'p', '기기 목록에 표시할 항목이 없습니다.');
          return;
        }
        const list = document.createElement('ul');
        for (const device of data) {
          const item = document.createElement('li');
          item.textContent = `${valueText(device?.label)} (ID: ${valueText(device?.id)}) · ${statusText(deviceLabels, device?.status)}`;
          list.append(item);
        }
        section.append(list);
      });

      renderResource('세션 목록', sessions, (section, data) => {
        if (!Array.isArray(data) || data.length === 0) {
          addText(section, 'p', '세션 목록에 표시할 항목이 없습니다.');
          return;
        }
        const list = document.createElement('ul');
        for (const session of data) {
          const item = document.createElement('li');
          item.textContent = `세션 ID: ${valueText(session?.id)} · ${statusText(sessionLabels, session?.status)}`;
          list.append(item);
        }
        section.append(list);
      });

      return root;
    },
    renderDecision({ status, mode, data, error, appId } = {}) {
      const root = document.createElement('div');
      const addText = (tag, text) => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        root.append(node);
        return node;
      };
      const valueText = (value) => typeof value === 'string' && value.length > 0 ? value : '확인 불가';
      const addAppId = (value, label = '업무 앱 ID') => {
        if (typeof value === 'string' && value.length > 0) addText('p', `${label}: ${value}`);
      };
      const decisionLabels = {
        allow: '접근 허용(allow)',
        deny: '접근 거부(deny)',
        challenge: '추가 인증 또는 확인 필요(challenge)',
        unknown: '확인 불가(unknown)',
      };

      if (status === 'idle') {
        addText('p', '앱을 골라 접속을 요청하세요.');
        addAppId(appId, '선택한 앱 ID');
      } else if (status === 'loading') {
        addText('p', '판정 확인 중');
        addAppId(appId, '요청한 앱 ID');
      } else if (status === 'error') {
        const message = typeof error?.message === 'string' && error.message.length > 0
          ? error.message
          : '오류 메시지를 확인할 수 없습니다.';
        addText('p', `요청 실패: ${message}`);
        addText('p', '요청 실패는 접근 거부 판정이 아닙니다.');
        addAppId(appId, '요청한 앱 ID');
      } else if (status === 'ok') {
        const knownDecision = typeof data?.decision === 'string' && Object.hasOwn(decisionLabels, data.decision);
        const decisionText = knownDecision ? decisionLabels[data.decision] : decisionLabels.unknown;
        addText('p', `접근 판정: ${decisionText}`);
        const resultAppId = typeof data?.appId === 'string' && data.appId.length > 0 ? data.appId : appId;
        addAppId(resultAppId, '판정 앱 ID');
        addText('p', `판정 이유: ${valueText(data?.reason)}`);
        addText('p', `판정 시각: ${valueText(data?.checkedAt)}`);
        if (knownDecision && data.decision === 'allow') {
          addText('p', '정책상 접근 허용이며 실제 앱 접속 성공을 보장하지 않습니다.');
        } else if (knownDecision && data.decision === 'challenge') {
          addText('p', '이 앱은 추가 확인 절차를 대신 수행하지 않습니다.');
        }
      } else {
        addText('p', '판정 상태를 확인할 수 없습니다.');
        addAppId(appId);
      }

      return root;
    },
    renderEvents({ status, mode, data, error } = {}) {
      const root = document.createElement('div');
      const addText = (parent, tag, text) => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        parent.append(node);
        return node;
      };
      const valueText = (value) => value === undefined || value === null || value === ''
        ? '확인 불가'
        : String(value);
      const modeLabels = {
        connected: '연결됨',
        demo: '예제 자료',
        disconnected: '연결 없음',
        unknown: '확인 불가',
      };
      const modeText = modeLabels[mode] || modeLabels.unknown;
      addText(root, 'p', `자료 모드: ${modeText}`);

      const isContractMismatch = status === 'CONTRACT_MISMATCH' || error?.code === 'CONTRACT_MISMATCH';
      if (isContractMismatch) {
        const message = typeof error?.message === 'string' && error.message.length > 0
          ? `: ${error.message}`
          : '';
        addText(root, 'p', `확인 불가${message}`);
        return root;
      }
      if (status === 'loading') {
        addText(root, 'p', '기록을 불러오는 중입니다.');
        return root;
      }
      if (status === 'error') {
        const message = typeof error?.message === 'string' && error.message.length > 0
          ? error.message
          : '오류 메시지를 확인할 수 없습니다.';
        addText(root, 'p', `기록을 불러오지 못했습니다: ${message}`);
        return root;
      }
      if (status !== 'ok') {
        addText(root, 'p', status === 'idle' ? '기록을 불러오기 전입니다.' : '기록 상태를 확인할 수 없습니다.');
        return root;
      }
      if (!Array.isArray(data)) {
        addText(root, 'p', '확인 불가: 기록 자료 형식이 올바르지 않습니다.');
        return root;
      }
      if (data.length === 0) {
        addText(root, 'p', '표시할 기록이 없습니다.');
        return root;
      }

      const events = data.map((event) => event).sort((a, b) => {
        const aTime = Date.parse(String(a?.at ?? ''));
        const bTime = Date.parse(String(b?.at ?? ''));
        const difference = bTime - aTime;
        return Number.isNaN(difference) ? 0 : difference;
      });
      const kindLabel = (kind) => {
        if (kind === 'access') return '접속 기록(access)';
        if (kind === 'xdr') return 'XDR 경보(xdr)';
        return `확인 불가(${valueText(kind)})`;
      };
      const appLabel = (appId) => appId === undefined || appId === null || appId === ''
        ? '앱을 확인할 수 없습니다(appId 없음)'
        : String(appId);
      const stateLabel = (field, value) => {
        const labels = field === 'access'
          ? { allowed: '접근 허용', denied: '접근 거부', unknown: '확인 불가' }
          : field === 'session'
            ? { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' }
            : { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' };
        const raw = value === undefined || value === null || value === '' ? 'unknown' : String(value);
        const meaning = labels[raw] || '확인 불가';
        return `${meaning}(${raw})`;
      };
      const uniqueValues = (field) => Array.from(new Set(events.map((event) => {
        const value = event?.[field];
        return value === undefined || value === null ? '' : String(value);
      }))).sort();

      const filterBar = document.createElement('div');
      const filterValues = { kind: 'all', appId: 'all', access: 'all' };
      const addFilter = (labelText, field, values, labelForValue) => {
        const label = document.createElement('label');
        label.textContent = labelText;
        const select = document.createElement('select');
        select.setAttribute('aria-label', labelText);
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = '전체';
        select.append(allOption);
        for (const value of values) {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = labelForValue(value);
          select.append(option);
        }
        label.append(select);
        filterBar.append(label);
        select.addEventListener('change', () => {
          filterValues[field] = select.value;
          selectedEvent = null;
          renderList();
        });
      };
      addFilter('기록 종류', 'kind', uniqueValues('kind'), (value) => value === '' ? '확인 불가' : kindLabel(value));
      addFilter('업무 앱', 'appId', uniqueValues('appId'), (value) => value === '' ? '앱을 확인할 수 없습니다(appId 없음)' : value);
      addFilter('접속 상태', 'access', uniqueValuesFromState(), (value) => stateLabel('access', value));
      root.append(filterBar);

      const count = document.createElement('p');
      const list = document.createElement('div');
      const detailHost = document.createElement('div');
      root.append(count, list, detailHost);
      let selectedEvent = null;

      function uniqueValuesFromState() {
        return Array.from(new Set(events.map((event) => {
          const value = event?.state?.access;
          return value === undefined || value === null ? '' : String(value);
        }))).sort();
      }

      function renderDetail(event) {
        detailHost.replaceChildren();
        if (!event) return;
        const detail = document.createElement('section');
        detail.setAttribute('data-student-event-detail', valueText(event.id));
        addText(detail, 'h3', `사건 ID: ${valueText(event.id)}`);
        addText(detail, 'p', `업무 앱: ${appLabel(event.appId)}`);

        addText(detail, 'h4', '근거');
        if (Array.isArray(event.evidence) && event.evidence.length > 0) {
          const evidenceList = document.createElement('ul');
          for (const evidence of event.evidence) {
            addText(evidenceList, 'li', `근거 ID: ${valueText(evidence?.id)} · ${valueText(evidence?.text)}`);
          }
          detail.append(evidenceList);
        } else {
          addText(detail, 'p', '표시할 근거가 없습니다.');
        }

        addText(detail, 'h4', '규칙');
        if (Array.isArray(event.rules) && event.rules.length > 0) {
          const rulesList = document.createElement('ul');
          for (const rule of event.rules) {
            addText(rulesList, 'li', `규칙 ID: ${valueText(rule?.id)} · ${valueText(rule?.text)}`);
          }
          detail.append(rulesList);
        } else {
          addText(detail, 'p', '표시할 규칙이 없습니다.');
        }

        addText(detail, 'h4', '기록 상태');
        addText(detail, 'p', `접속 상태: ${stateLabel('access', event.state?.access)}`);
        addText(detail, 'p', `세션 상태: ${stateLabel('session', event.state?.session)}`);
        addText(detail, 'p', `기기 상태: ${stateLabel('device', event.state?.device)}`);

        if (Array.isArray(event.supportedActions) && event.supportedActions.length > 0) {
          addText(detail, 'h4', '미지원 조치');
          for (const action of event.supportedActions) {
            if (typeof action !== 'string' || action.length === 0) continue;
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = `${action} 미지원`;
            button.setAttribute('aria-label', `${action} 미지원`);
            button.disabled = true;
            detail.append(button);
            addText(detail, 'p', '아직 지원하지 않는 조치입니다. 조치 실행 연결은 준비 중이며 요청을 보내지 않습니다.');
          }
        }
        detailHost.append(detail);
      }

      function renderList() {
        list.replaceChildren();
        detailHost.replaceChildren();
        const visibleEvents = events.filter((event) => {
          const eventKind = event?.kind === undefined || event?.kind === null ? '' : String(event.kind);
          const eventAppId = event?.appId === undefined || event?.appId === null ? '' : String(event.appId);
          const eventAccess = event?.state?.access === undefined || event?.state?.access === null ? '' : String(event.state.access);
          return (filterValues.kind === 'all' || eventKind === filterValues.kind)
            && (filterValues.appId === 'all' || eventAppId === filterValues.appId)
            && (filterValues.access === 'all' || eventAccess === filterValues.access);
        });
        count.textContent = `표시 기록 수: ${visibleEvents.length}`;
        if (visibleEvents.length === 0) {
          addText(list, 'p', '필터 조건에 맞는 기록이 없습니다.');
          return;
        }
        for (const event of visibleEvents) {
          const row = document.createElement('article');
          const eventId = valueText(event?.id);
          row.setAttribute('data-student-event-id', eventId);
          addText(row, 'h3', `사건 ID: ${eventId}`);
          addText(row, 'p', `시각: ${valueText(event?.at)}`);
          addText(row, 'p', `종류: ${kindLabel(event?.kind)}`);
          addText(row, 'p', `업무 앱: ${appLabel(event?.appId)}`);
          addText(row, 'p', `요약: ${valueText(event?.summary)}`);
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = `${eventId} 상세`;
          button.setAttribute('aria-label', `${eventId} 상세`);
          button.addEventListener('click', () => {
            selectedEvent = event;
            renderDetail(selectedEvent);
          });
          row.append(button);
          list.append(row);
        }
      }

      renderList();
      return root;
    },
    renderStatus({ devices, sessions, notifications, diagnostics, mode } = {}) {
      const root = document.createElement('div');
      const addText = (parent, tag, text) => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        parent.append(node);
        return node;
      };
      const modeLabels = {
        connected: '연결됨',
        demo: '예제 자료',
        disconnected: '연결 없음',
        unknown: '확인 불가',
      };
      const deviceLabels = {
        compliant: '보안 기준 충족',
        noncompliant: '보안 기준 미충족',
        unknown: '확인 불가',
      };
      const sessionLabels = {
        active: '활성',
        expired: '만료',
        revoked: '철회됨',
        unknown: '확인 불가',
      };
      const valueText = (value) => value === undefined || value === null || value === ''
        ? '확인 불가'
        : String(value);
      const statusText = (labels, value) => labels[value]
        ? `${labels[value]} (${value})`
        : `확인 불가 (${valueText(value)})`;
      const modeText = (value) => modeLabels[value] || modeLabels.unknown;
      const section = (title) => {
        const node = document.createElement('section');
        addText(node, 'h3', title);
        root.append(node);
        return node;
      };
      const errorMessage = (resource) => {
        const message = resource?.error?.message;
        return typeof message === 'string' && message.length > 0
          ? message
          : '오류 메시지를 확인할 수 없습니다.';
      };
      const isTimeout = (resource) => /TIMEOUT|TIMED_OUT/i.test(String(resource?.error?.code || ''))
        || /시간\s*초과|timed?\s*out|timeout/i.test(String(resource?.error?.message || ''));
      const renderRetry = (target) => addText(target, 'p', '다시 시도하려면 위쪽 「다시 불러오기」 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다.');

      addText(root, 'p', `전체 연결 모드: ${modeText(mode)}`);

      const deviceSection = section('기기 목록');
      addText(deviceSection, 'p', `자료 모드: ${modeText(devices?.mode)}`);
      if (devices?.status === 'loading') {
        addText(deviceSection, 'p', '기기 목록을 불러오는 중입니다.');
      } else if (devices?.status === 'error') {
        addText(deviceSection, 'p', `기기 목록을 불러오지 못했습니다${isTimeout(devices) ? ' (시간 초과)' : ''}: ${errorMessage(devices)}`);
        renderRetry(deviceSection);
      } else if (devices?.status === 'ok') {
        if (!Array.isArray(devices.data)) {
          addText(deviceSection, 'p', '기기 목록을 확인할 수 없습니다. 응답 형식이 올바르지 않습니다.');
        } else if (devices.data.length === 0) {
          addText(deviceSection, 'p', '등록된 기기가 없습니다.');
        } else {
          const list = document.createElement('ul');
          for (const device of devices.data) {
            const item = document.createElement('li');
            item.textContent = `기기: ${valueText(device?.label)} (ID: ${valueText(device?.id)}) · ${statusText(deviceLabels, device?.status)}`;
            list.append(item);
          }
          deviceSection.append(list);
        }
      } else {
        addText(deviceSection, 'p', '기기 목록 상태를 확인할 수 없습니다.');
      }

      const sessionSection = section('세션 목록');
      addText(sessionSection, 'p', `자료 모드: ${modeText(sessions?.mode)}`);
      addText(sessionSection, 'p', '현재 검증된 연결 한 개만 표시합니다. 지난 세션 전체 목록이 아닙니다.');
      if (sessions?.status === 'loading') {
        addText(sessionSection, 'p', '세션 목록을 불러오는 중입니다.');
      } else if (sessions?.status === 'error') {
        addText(sessionSection, 'p', `세션 목록을 불러오지 못했습니다${isTimeout(sessions) ? ' (시간 초과)' : ''}: ${errorMessage(sessions)}`);
        renderRetry(sessionSection);
      } else if (sessions?.status === 'ok') {
        if (!Array.isArray(sessions.data)) {
          addText(sessionSection, 'p', '세션 목록을 확인할 수 없습니다. 응답 형식이 올바르지 않습니다.');
        } else if (sessions.data.length === 0) {
          addText(sessionSection, 'p', '현재 연결이 없습니다.');
        } else {
          const list = document.createElement('ul');
          for (const session of sessions.data) {
            const item = document.createElement('li');
            item.textContent = `세션 ID: ${valueText(session?.id)} · ${statusText(sessionLabels, session?.status)}`;
            list.append(item);
          }
          sessionSection.append(list);
        }
      } else {
        addText(sessionSection, 'p', '세션 목록 상태를 확인할 수 없습니다.');
      }

      const notificationSection = section('알림');
      if (!Array.isArray(notifications)) {
        addText(notificationSection, 'p', '알림 정보를 확인할 수 없습니다.');
      } else if (notifications.length === 0) {
        addText(notificationSection, 'p', '주의할 알림이 없습니다.');
      } else {
        const list = document.createElement('ul');
        for (const notification of notifications) {
          const item = document.createElement('li');
          addText(item, 'p', `자료(resource): ${valueText(notification?.resource)}`);
          const code = notification?.code;
          const safeCode = typeof code === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(code)
            ? code
            : '확인 불가';
          addText(item, 'p', `알림 코드: ${safeCode}`);
          addText(item, 'p', `내용: ${valueText(notification?.message)}`);
          if (['devices', 'device', 'sessions', 'session'].includes(notification?.resource)) {
            addText(item, 'p', '연결 상태를 확인하고, 필요하면 위쪽 「다시 불러오기」를 직접 누르세요.');
          }
          list.append(item);
        }
        notificationSection.append(list);
      }

      const diagnosticsSection = section('도움정보');
      addText(diagnosticsSection, 'p', '도움 요청에 필요한 비밀 없는 진단 정보입니다. 아래의 안전한 항목을 확인한 뒤 복사할 수 있으며, 자동으로 전송되지 않습니다.');
      addText(diagnosticsSection, 'p', `자료 모드: ${modeText(diagnostics?.mode)}`);
      let safeDiagnostics = null;
      if (diagnostics?.status === 'loading') {
        addText(diagnosticsSection, 'p', '도움정보를 불러오는 중입니다.');
      } else if (diagnostics?.status === 'error') {
        addText(diagnosticsSection, 'p', `도움정보를 불러오지 못했습니다${isTimeout(diagnostics) ? ' (시간 초과)' : ''}: ${errorMessage(diagnostics)}`);
      } else if (diagnostics?.status === 'ok') {
        const data = diagnostics.data;
        const safeValue = (value, field) => {
          if (typeof value !== 'string' || value.length === 0 || value.length > 200
            || !/^[A-Za-z0-9][A-Za-z0-9._:@/+ -]*$/.test(value)
            || /Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|(?:api[_ -]?key|authorization|password|비밀번호|토큰)\s*[:=]\s*\S+/i.test(value)) {
            return null;
          }
          if (field === 'engine.mode' && !['connected', 'demo', 'disconnected'].includes(value)) return null;
          if (field === 'engine.code' && !/^[A-Z0-9][A-Z0-9_.:-]{0,79}$/.test(value)) return null;
          if (field === 'checkedAt' && !Number.isFinite(Date.parse(value))) return null;
          return value;
        };
        safeDiagnostics = {
          requestId: safeValue(data?.requestId, 'requestId'),
          component: safeValue(data?.component, 'component'),
          version: safeValue(data?.version, 'version'),
          checkedAt: safeValue(data?.checkedAt, 'checkedAt'),
          engine: {
            mode: safeValue(data?.engine?.mode, 'engine.mode'),
            code: safeValue(data?.engine?.code, 'engine.code'),
          },
        };
        const fields = [
          ['requestId', safeDiagnostics.requestId],
          ['component', safeDiagnostics.component],
          ['version', safeDiagnostics.version],
          ['checkedAt', safeDiagnostics.checkedAt],
          ['engine.mode', safeDiagnostics.engine.mode],
          ['engine.code', safeDiagnostics.engine.code],
        ];
        const list = document.createElement('ul');
        for (const [name, value] of fields) addText(list, 'li', `${name}: ${value ?? '확인 불가'}`);
        diagnosticsSection.append(list);
        const hasAllFields = fields.every(([, value]) => typeof value === 'string');
        if (hasAllFields) {
          const copyText = JSON.stringify(safeDiagnostics, null, 2);
          const preview = document.createElement('pre');
          preview.textContent = copyText;
          diagnosticsSection.append(preview);
          const copyButton = document.createElement('button');
          copyButton.type = 'button';
          copyButton.textContent = '도움정보 복사';
          copyButton.setAttribute('aria-label', '도움정보 복사');
          copyButton.addEventListener('click', async () => {
            try {
              if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') throw new Error('CLIPBOARD_UNAVAILABLE');
              await navigator.clipboard.writeText(copyText);
              addText(diagnosticsSection, 'p', '안전한 도움정보를 클립보드에 복사했습니다.');
            } catch {
              addText(diagnosticsSection, 'p', '자동 복사를 사용할 수 없습니다. 위에 표시된 안전한 도움정보를 직접 선택해 복사하세요.');
            }
          });
          diagnosticsSection.append(copyButton);
        } else {
          addText(diagnosticsSection, 'p', '일부 진단 항목을 안전하게 확인할 수 없어 복사할 수 없습니다.');
        }
      } else {
        addText(diagnosticsSection, 'p', diagnostics?.status === 'idle' ? '도움정보 조회 전입니다.' : '도움정보 상태를 확인할 수 없습니다.');
      }

      return root;
    },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection({ status, mode, data, error, checkedAt } = {}) {
      const root = document.createElement('div');
      const addText = (tag, text) => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        root.append(node);
        return node;
      };
      const modeLabels = {
        connected: '연결됨(connected)',
        demo: '예제 자료(demo) · 실제 연결 아님',
        disconnected: '연결 없음(disconnected)',
        unknown: '연결 상태 확인 불가(unknown)',
      };
      const modeText = modeLabels[mode] || modeLabels.unknown;
      const safeCodeGuidance = {
        ON_AI_PROVISIONING_PENDING: '권한 준비 중 또는 확인 불가입니다. 담당자에게 계정 연결과 앱 권한을 확인해 주세요.',
        ON_AI_TRANSPORT_PENDING: 'AI 연결 경로를 확인할 수 없습니다. 담당자에게 확인해 주세요.',
        WB_CLCO_AUTH_REQUIRED: '인증 실패입니다. 계정 연결을 다시 확인하고, 계속되면 담당자에게 문의해 주세요.',
        WB_CLCO_INVALID_TOKEN: '인증 정보를 확인할 수 없습니다. 비밀값을 복사하지 말고 계정 연결을 다시 확인한 뒤, 계속되면 담당자에게 문의해 주세요.',
        WB_CLCO_ACCESS_BLOCKED: '접근이 제한됐습니다. 계정 연결을 다시 확인하고, 앱 이용 권한을 담당자에게 확인해 주세요.',
        WB_CLCO_COHORT_BUDGET_EXHAUSTED: '반 사용량 한도에 도달했습니다. 담당자에게 확인해 주세요.',
        WB_CLCO_LIMIT_REACHED: '이용 한도에 도달했습니다. 담당자에게 확인해 주세요.',
        WB_CLCO_RATE_LIMITED: '요청이 제한됐습니다. 잠시 뒤 직접 다시 점검해 주세요.',
        WB_CLCO_SESSION_CLOSED: '현재 이용 시간이 아닙니다. 이용 시간을 확인해 주세요.',
        WB_CLCO_TIMEOUT: '요청 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검해 주세요.',
        REQUEST_TIMEOUT: '요청 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검해 주세요.',
        ENGINE_TIMEOUT: '요청 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검해 주세요.',
        TIMEOUT: '요청 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검해 주세요.',
        WB_CLCO_NETWORK_ERROR: '네트워크 오류입니다. 연결을 확인한 뒤 잠시 후 직접 다시 점검해 주세요.',
        NETWORK_ERROR: '네트워크 오류입니다. 연결을 확인한 뒤 잠시 후 직접 다시 점검해 주세요.',
        WB_CLCO_SERVER_UNAVAILABLE: 'AI 서버가 응답하지 않습니다. 잠시 후 직접 다시 점검해 주세요.',
        WB_CLCO_CANCELLED: '점검이 취소됐습니다. 이전 결과는 현재 결과가 아닙니다.',
        CANCELLED: '점검이 취소됐습니다. 이전 결과는 현재 결과가 아닙니다.',
        REQUEST_CANCELLED: '점검이 취소됐습니다. 이전 결과는 현재 결과가 아닙니다.',
        MODEL_NOT_CONFIGURED: '사용할 모델이 설정되지 않았습니다. 담당자에게 모델 허용 설정을 확인해 주세요.',
        ON_AI_MODEL_LIST_EMPTY: '사용할 수 있는 모델이 없습니다. 담당자에게 모델 허용 설정을 확인해 주세요.',
        ON_AI_AUTHORIZATION_CHANGED: '점검 중 권한이 변경됐습니다. 담당자에게 현재 권한을 확인해 주세요.',
        WB_CLCO_INVALID_RESPONSE: '서버 응답 형식을 확인할 수 없습니다. 담당자에게 확인해 주세요.',
        INVALID_RESPONSE: '서버 응답 형식을 확인할 수 없습니다. 담당자에게 확인해 주세요.',
        AI_REQUEST_UNVERIFIED: 'AI 연결 또는 응답을 확인할 수 없습니다. 담당자에게 확인해 주세요.',
      };
      const safeCode = typeof error?.code === 'string' && Object.hasOwn(safeCodeGuidance, error.code)
        ? error.code
        : 'AI_REQUEST_UNVERIFIED';
      const isSafeMessage = (value) => typeof value === 'string'
        && value.trim().length > 0
        && value.length <= 400
        && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)
        && !/Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|(?:api[_ -]?key|authorization|password|비밀번호|토큰)\s*[:=]\s*\S+/i.test(value);
      const safeMessage = safeCode !== 'AI_REQUEST_UNVERIFIED' && isSafeMessage(error?.message)
        ? error.message
        : safeCodeGuidance[safeCode];
      const addMode = () => addText('p', `자료 모드: ${modeText}`);

      addMode();
      if (mode === 'demo') {
        addText('p', '예제 자료는 실제 운영 권한이나 실제 AI 연결을 증명하지 않습니다.');
      }
      if (status === 'idle') {
        addText('p', 'AI 연결 점검 전입니다. 점검하려면 제공 화면의 「현재 API 연결 점검」을 직접 누르세요.');
      } else if (status === 'loading') {
        addText('p', 'AI 연결 점검 중입니다. 자동 재점검은 하지 않습니다.');
      } else if (status === 'error') {
        addText('p', `AI 연결 점검 실패 · 오류 코드: ${safeCode}`);
        addText('p', `오류 안내: ${safeMessage}`);
        addText('p', `코드별 후속 안내: ${safeCodeGuidance[safeCode]}`);
        addText('p', '이 점검 실패는 업무 앱 판정이나 보안 기록의 실패를 뜻하지 않습니다. 다시 점검하려면 제공 화면의 버튼을 직접 누르세요.');
      } else if (status === 'ok') {
        const validAuthorization = data?.audienceAuthorization === 'test' || data?.audienceAuthorization === 'verified';
        const validCount = Number.isInteger(data?.modelCount) && data.modelCount >= 0;
        if (data?.transportChecked !== true || !validAuthorization || !validCount) {
          addText('p', 'AI 연결 점검 결과를 확인할 수 없습니다. 응답 형식이 계약과 다릅니다.');
          return root;
        }
        if (data.audienceAuthorization === 'test') {
          addText('p', '시험 연결 점검(test) · 실제 앱 권한 확인이 아닙니다.');
        } else {
          addText('p', '앱 권한 확인 후 점검(verified) · 점검 시각 기준입니다.');
        }
        addText('p', `모델 수: ${data.modelCount}`);
        addText('p', `점검 시각: ${typeof checkedAt === 'string' && checkedAt.length > 0 ? checkedAt : '확인 불가'}`);
        addText('p', '모델 목록 연결만 점검했습니다. 사건 설명은 아직 실행하지 않았으며, 설명 성공을 의미하지 않습니다.');
      } else {
        addText('p', 'AI 연결 점검 상태를 확인할 수 없습니다.');
      }
      return root;
    },
    renderExplanation({ event, explanation, checkedAt } = {}) {
      const root = document.createElement('div');
      const addText = (tag, text) => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        root.append(node);
        return node;
      };
      const safeCodes = {
        ON_AI_PROVISIONING_PENDING: 'AI 권한이 준비되지 않았거나 확인되지 않았습니다.',
        WB_CLCO_AUTH_REQUIRED: '인증 실패입니다. 계정 연결과 앱 승인을 확인해 주세요.',
        WB_CLCO_ACCESS_BLOCKED: '접근이 제한됐습니다. 앱 이용 권한을 담당자에게 확인해 주세요.',
        WB_CLCO_COHORT_BUDGET_EXHAUSTED: '반 사용량 한도에 도달했습니다.',
        WB_CLCO_LIMIT_REACHED: '이용 한도에 도달했습니다.',
        WB_CLCO_RATE_LIMITED: '요청이 제한됐습니다. 잠시 후 직접 다시 시도해 주세요.',
        WB_CLCO_SESSION_CLOSED: '현재 이용 시간이 아닙니다.',
        WB_CLCO_TIMEOUT: 'AI 응답 시간이 초과됐습니다.',
        WB_CLCO_NETWORK_ERROR: '네트워크 오류로 AI 서버에 연결할 수 없습니다.',
        WB_CLCO_CANCELLED: 'AI 설명 요청이 취소됐습니다.',
        MODEL_NOT_CONFIGURED: '사용할 모델이 설정되지 않았습니다.',
        ON_AI_MODEL_LIST_EMPTY: '사용할 수 있는 모델이 없습니다.',
        ON_AI_INVALID_INPUT: '설명에 필요한 사건 근거를 확인할 수 없습니다.',
        ON_AI_INVALID_OUTPUT: 'AI 설명의 근거 또는 응답 형식을 확인할 수 없습니다.',
        AI_REQUEST_UNVERIFIED: 'AI 연결 또는 응답을 확인할 수 없습니다.',
      };
      const code = typeof explanation?.error?.code === 'string' && Object.hasOwn(safeCodes, explanation.error.code)
        ? explanation.error.code
        : 'AI_REQUEST_UNVERIFIED';
      const rawMessage = explanation?.error?.message;
      const safeMessage = code !== 'AI_REQUEST_UNVERIFIED'
        && typeof rawMessage === 'string'
        && rawMessage.trim().length > 0
        && rawMessage.length <= 400
        && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(rawMessage)
        && !/Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|(?:api[_ -]?key|authorization|password|비밀번호|토큰)\s*[:=]\s*\S+/i.test(rawMessage)
        ? rawMessage
        : safeCodes[code];

      if (!event) {
        addText('p', '보안 기록에서 설명할 사건을 먼저 선택하세요.');
        return root;
      }
      if (explanation?.status === 'loading') {
        addText('p', '선택한 사건의 AI 설명을 요청 중입니다.');
        return root;
      }
      if (explanation?.status === 'error') {
        addText('p', `AI 설명 실패 · 오류 코드: ${code}`);
        addText('p', `오류 안내: ${safeMessage}`);
        addText('p', '기존 보안 기록은 그대로이며, AI 설명 실패는 기록이나 접근 판정을 바꾸지 않습니다.');
        return root;
      }
      if (explanation?.status === 'ok') {
        const eventId = typeof event.id === 'string' && event.id.length > 0 ? event.id : null;
        const summary = explanation.data?.summary;
        if (eventId === null || typeof summary !== 'string' || summary.length === 0) {
          addText('p', 'AI 설명 결과 또는 사건 ID를 확인할 수 없습니다. 기존 보안 기록은 그대로입니다.');
          return root;
        }
        root.setAttribute('data-student-explanation-event', eventId);
        addText('h3', `사건 ID: ${eventId}`);
        addText('h4', 'AI 설명(참고용)');
        addText('p', summary);
        return root;
      }
      if (explanation?.status === 'idle') {
        addText('p', '이 사건의 AI 설명은 아직 요청하지 않았습니다.');
      } else {
        addText('p', 'AI 설명 상태를 확인할 수 없습니다. 기존 보안 기록은 그대로입니다.');
      }
      return root;
    },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
