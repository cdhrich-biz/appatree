// 안정적인 CSS selector 생성 — 포인팅 모드에서 iframe 내 클릭된 요소를
// 부모 기기의 같은 UI에서도 찾을 수 있도록 label/id/aria 기반 우선순위로 계산.

function escapeAttr(value: string): string {
  return value.replace(/"/g, '\\"');
}

export function computeStableSelector(el: Element): string | null {
  // 1) id 우선
  if (el.id) return `#${CSS.escape(el.id)}`;

  // 2) aria-label (APPATREE의 대부분 상호작용 요소는 aria-label을 갖고 있음)
  const aria = el.getAttribute("aria-label");
  if (aria) return `[aria-label="${escapeAttr(aria)}"]`;

  // 3) data-* 속성
  const dataAttr = Array.from(el.attributes).find((a) => a.name.startsWith("data-"));
  if (dataAttr) return `[${dataAttr.name}="${escapeAttr(dataAttr.value)}"]`;

  // 4) 가장 가까운 aria-label 가진 조상 (클릭된 요소가 아이콘/span일 때 버튼 전체를 하이라이트)
  const ariaAncestor = el.closest("[aria-label]");
  if (ariaAncestor && ariaAncestor !== el) {
    const label = ariaAncestor.getAttribute("aria-label");
    if (label) return `[aria-label="${escapeAttr(label)}"]`;
  }

  // 5) 최후의 fallback — 계층 경로. depth 4 제한.
  const path: string[] = [];
  let current: Element | null = el;
  for (let depth = 0; current && depth < 4; depth++) {
    const parent: Element | null = current.parentElement;
    if (!parent) break;
    const idx = Array.from(parent.children).indexOf(current) + 1;
    path.unshift(`${current.tagName.toLowerCase()}:nth-child(${idx})`);
    current = parent;
  }
  return path.length ? path.join(" > ") : null;
}
