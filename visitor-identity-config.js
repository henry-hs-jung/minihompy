(() => {
  'use strict';

  // 중앙 공통 방문자 식별 설정 (Distributed Minihompy Shared Visitor Identity Config)
  window.MINIHOMPY_VISITOR_IDENTITY_CONFIG = Object.freeze({
    enabled: true,

    // 중앙 식별 허브에 등록된 이 미니홈피의 고유 UUID
    siteId: 'd81c92b5-3dd0-47be-8b0e-c3af50ac87b8',

    // 중앙 식별 서비스 기본 URL
    centralApiUrl: 'https://pcwovvdgggpbghvqraex.supabase.co/functions/v1/identity-api',
    centralPageUrl: 'https://pcwovvdgggpbghvqraex.supabase.co/functions/v1/identity-page',

    // 중앙 상태 확인(/health) 타임아웃 제한 (스펙 권장: 1.5초)
    healthTimeoutMs: 1500,

    // 리다이렉트 가드 만료 시간 (2분 = 120,000ms)
    guardTimeoutMs: 120000,
  });
})();
