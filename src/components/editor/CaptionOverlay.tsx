import { OUTPUT_HEIGHT, OUTPUT_WIDTH } from "@/lib/clips";

// src/lib/server/render.ts의 ASS 스타일(글자 84, 테두리 6, 아래 여백 420, 좌우 80)을 화면 비율로 옮긴 것
const cq = (px: number) => `${(px / OUTPUT_WIDTH) * 100}cqw`;

/** 미리보기 위에 완성 영상과 같은 위치·크기로 자막을 겹쳐 보여 준다. 부모에 @container 필요 */
export default function CaptionOverlay({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <p
      className="pointer-events-none absolute inset-x-0 text-center font-bold whitespace-pre-wrap text-white"
      style={{
        bottom: `${(420 / OUTPUT_HEIGHT) * 100}%`,
        paddingInline: cq(80),
        fontFamily: '"Malgun Gothic", "맑은 고딕", sans-serif',
        fontSize: cq(84),
        lineHeight: 1.15,
        WebkitTextStroke: `${cq(12)} black`,
        paintOrder: "stroke fill",
      }}
    >
      {text.trim()}
    </p>
  );
}
