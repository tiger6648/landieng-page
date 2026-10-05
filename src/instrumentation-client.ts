import posthog from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

// 키가 없으면(로컬 등) 추적하지 않음
if (key) {
  posthog.init(key, {
    // next.config.ts의 /ingest 리버스 프록시를 거쳐 광고 차단기를 피함
    api_host: "/ingest",
    ui_host:
      process.env.NEXT_PUBLIC_POSTHOG_REGION === "eu"
        ? "https://eu.posthog.com"
        : "https://us.posthog.com",
    defaults: "2026-08-30",
    // 관리자 페이지는 문의자 개인정보가 보이므로 수집하지 않음
    before_send: (event) =>
      event?.properties.$pathname?.startsWith("/admin") ? null : event,
  });
}
