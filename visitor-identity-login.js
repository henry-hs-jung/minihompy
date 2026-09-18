(() => {
  'use strict';

  // ============================================================================
  // 분산 미니홈피 로그인 및 중앙 상태 활성화 모듈 (Visitor Identity Login & Activation)
  // 타 미니홈피에서 내 미니홈피로 로그인 의도(login_intent)를 들고 유입되었을 때,
  // 1) 로컬 Supabase 세션을 확인 (이미 세션이 있으면 비밀번호 입력 없이 재사용)
  // 2) 세션이 없으면 로그인 폼을 안내하고 로그인 완료 대기
  // 3) 중앙 /activation-tickets API를 호출하여 활성화 티켓 발급
  // 4) 중앙 /complete#ticket=... 로 이동하여 중앙 세션 토큰 저장 후 원래 미니홈피로 복귀
  // ============================================================================

  window.createMinihompyVisitorLogin = (config, clientProvider) => {
    let busy = false;

    async function handleLoginIntent(loginIntent) {
      if (!config?.enabled || !config?.siteId || !config?.centralUrl) return false;
      if (!loginIntent || busy) return false;

      busy = true;
      const client = clientProvider ? clientProvider() : window.MinihompyBackend?.getClient('admin');
      if (!client?.auth) {
        busy = false;
        return false;
      }

      // 1. 기존 유효한 로컬 Supabase 세션 확인
      try {
        const { data: sessionData } = await client.auth.getSession();
        if (sessionData?.session?.user?.id) {
          // 이미 로그인되어 있음 -> 비밀번호 입력 없이 즉시 중앙 활성화 진행
          await requestActivationTicket(loginIntent, sessionData.session.user.id);
          return true;
        }
      } catch (err) {
        console.warn('로컬 세션 확인 실패, 로그인 대화상자를 엽니다:', err);
      }

      // 2. 로그인되어 있지 않은 경우 -> 로그인 다이얼로그 표시 및 폼 제출 리스너 연동
      const dialog = document.querySelector('.admin-dialog');
      const form = document.querySelector('#admin-login-form');
      const emailInput = document.querySelector('#admin-email');
      const message = document.querySelector('.admin-auth-message');

      if (dialog && form) {
        if (message) {
          message.textContent = '공통 방문자 인증을 위해 내 미니홈피 계정으로 로그인해 주세요.';
        }
        dialog.showModal();
        emailInput?.focus();

        const onSubmit = async () => {
          // 약간의 지연 후 세션이 확보되었는지 확인
          try {
            const { data } = await client.auth.getUser();
            if (data?.user?.id) {
              form.removeEventListener('submit', onSubmit);
              await requestActivationTicket(loginIntent, data.user.id);
            }
          } catch (err) {
            if (message) message.textContent = '인증 정보를 확인하지 못했습니다: ' + err.message;
          }
        };

        // admin-auth.js가 로그인을 성공시켜 getUser()가 유효해진 뒤 활성화 수행
        form.addEventListener('submit', () => setTimeout(onSubmit, 100), { once: true });
      }

      busy = false;
      return false;
    }

    async function requestActivationTicket(loginIntent, localUserId) {
      const { siteId, centralUrl } = config;
      const message = document.querySelector('.admin-auth-message');

      try {
        if (message) message.textContent = '중앙 식별 세션을 활성화하는 중입니다...';

        const res = await fetch(`${centralUrl}/activation-tickets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            login_intent: loginIntent,
            site_id: siteId,
            local_user_id: localUserId,
          }),
          mode: 'cors',
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || '활성화 티켓 발급 실패 (HTTP ' + res.status + ')');
        }

        const data = await res.json();
        const ticket = data.activation_ticket;
        if (!ticket) throw new Error('응답에 활성화 티켓이 없습니다.');

        // URL에서 login_intent 파라미터 정리
        try {
          const url = new URL(location.href);
          url.searchParams.delete('login_intent');
          history.replaceState(null, '', url.pathname + url.search + url.hash);
        } catch { /* Ignore history state errors */ }

        // 중앙 /complete 로 이동하여 중앙 세션 등록
        const completeUrl = `${centralUrl}/complete#ticket=${encodeURIComponent(ticket)}`;
        location.replace(completeUrl);
      } catch (err) {
        busy = false;
        if (message) message.textContent = '방문자 활성화 오류: ' + err.message;
        console.error('Visitor activation error:', err);
      }
    }

    return Object.freeze({
      handleLoginIntent,
      requestActivationTicket,
    });
  };

  // 브라우저 진입 시 URL에 ?login_intent=... 가 있으면 자동 실행
  const checkUrlIntent = () => {
    try {
      const params = new URLSearchParams(location.search);
      const loginIntent = params.get('login_intent');
      if (loginIntent) {
        const config = window.MINIHOMPY_VISITOR_IDENTITY_CONFIG;
        const visitorLogin = window.createMinihompyVisitorLogin(config);
        window.MinihompyVisitorLogin = visitorLogin;
        void visitorLogin.handleLoginIntent(loginIntent);
      }
    } catch { /* Ignore URL parsing errors */ }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkUrlIntent, { once: true });
  } else {
    checkUrlIntent();
  }
})();
