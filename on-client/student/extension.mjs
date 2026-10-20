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
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
