export const SKILL_LABELS: Record<string, string> = {
  translation: "Орчуулга",
  cleanup: "Зураг цэвэрлэх",
  typesetting: "Текст өрөх",
  proofreading: "Хянах",
};

export const LANGUAGE_LABELS: Record<string, string> = {
  mn: "Монгол",
  en: "Англи",
  zh: "Хятад",
  ja: "Япон",
  ko: "Солонгос",
  ru: "Орос",
};

export function skillLabel(id: string) {
  return SKILL_LABELS[id] || id;
}

export function languageLabel(id: string) {
  return LANGUAGE_LABELS[id] || id;
}
