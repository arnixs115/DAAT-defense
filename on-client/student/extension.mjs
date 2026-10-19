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
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
