(() => {
  'use strict';

  // 중앙 공통 방문자 식별 설정 (Distributed Minihompy Shared Visitor Identity Config)
  window.MINIHOMPY_VISITOR_IDENTITY_CONFIG = Object.freeze({
    // 기능 활성화 여부 (비상 시 또는 단독 운영 시 false로 변경하여 중앙 연동 비활성화 가능)
    enabled: true,

    // 중앙 식별 허브에 등록된 이 미니홈피의 고유 UUID
    siteId: 'afd287c3-0f9f-44b4-8811-3cf11774f859',

    // 중앙 식별 서비스 기본 URL (API 및 Page 각각 설정)
    centralApiUrl: 'https://pcwovvdgggpbghvqraex.supabase.co/functions/v1/identity-api',
    centralPageUrl: 'https://pcwovvdgggpbghvqraex.supabase.co/functions/v1/identity-page',

    // 중앙 상태 확인(/health) 타임아웃 제한 (스펙 권장: 1.5초)
    healthTimeoutMs: 1500,

    // 리다이렉트 가드 만료 시간 (2분 = 120,000ms)
    guardTimeoutMs: 120000,
  });
})();
