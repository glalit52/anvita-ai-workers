"use client";
import { useApp } from "./store";

const hi = {
  "nav.home": "होम",
  "nav.ask": "अन्विता से पूछें",
  "nav.workers": "AI वर्कर्स",
  "nav.approvals": "मंज़ूरियाँ",
  "nav.inbox": "हैंडऑफ़ इनबॉक्स",
  "nav.build": "बनाएँ",
  "nav.integrations": "इंटीग्रेशन",
  "nav.knowledge": "नॉलेज",
  "nav.memory": "मेमोरी और स्किल्स",
  "nav.analytics": "एनालिटिक्स",
  "nav.settings": "सेटिंग्स",
  "nav.help": "मदद और डॉक्स",
  "nav.pinned": "पिन किए वर्कर्स",
  "nav.notifications": "सूचनाएँ",
  "top.search": "खोजें या अन्विता से पूछें…",
  "top.credits": "क्रेडिट",
  "home.greeting.morning": "सुप्रभात",
  "home.greeting.afternoon": "नमस्कार",
  "home.greeting.evening": "शुभ संध्या",
  "home.title": "आज अन्विता आपका कौन-सा काम संभाले?",
  "home.attention": "आपका ध्यान चाहिए",
  "home.attention.sub": "लोगों के इंतज़ार में मंज़ूरियाँ, हैंडऑफ़ और समस्याएँ",
  "home.suggestions": "अन्विता ने दोहराया जाने वाला काम देखा",
  "home.automate": "ऑटोमेट करें",
  "home.notnow": "अभी नहीं",
  "composer.placeholder": "अन्विता से कुछ भी करवाएँ — रिपोर्ट, GST मिलान, ईमेल ड्राफ़्ट, डैशबोर्ड…",
  "common.viewAll": "सभी देखें",
  "common.save": "सेव करें",
  "common.cancel": "रद्द करें",
  "suggestions.card": "3 ऑटोमेशन सुझाए गए",
  "suggestions.cardSub": "अन्विता ने #finance और #support में दोहराया काम देखा।",
  "suggestions.review": "सुझाव देखें →",
} as const;

export type TKey = keyof typeof hi;

const en: Record<TKey, string> = {
  "nav.home": "Home",
  "nav.ask": "Ask Anvita",
  "nav.workers": "AI Workers",
  "nav.approvals": "Approvals",
  "nav.inbox": "Handoff inbox",
  "nav.build": "Build",
  "nav.integrations": "Integrations",
  "nav.knowledge": "Knowledge",
  "nav.memory": "Memory & Skills",
  "nav.analytics": "Analytics",
  "nav.settings": "Settings",
  "nav.help": "Help & docs",
  "nav.pinned": "Pinned Workers",
  "nav.notifications": "Notifications",
  "top.search": "Search or ask Anvita…",
  "top.credits": "credits",
  "home.greeting.morning": "Good morning",
  "home.greeting.afternoon": "Good afternoon",
  "home.greeting.evening": "Good evening",
  "home.title": "What should Anvita take off your plate today?",
  "home.attention": "Needs your attention",
  "home.attention.sub": "Approvals, handoffs and issues waiting on people",
  "home.suggestions": "Anvita noticed repeated work",
  "home.automate": "Automate it",
  "home.notnow": "Not now",
  "composer.placeholder": "Ask Anvita to do anything — pull a report, reconcile GST, draft emails, build a dashboard…",
  "common.viewAll": "View all",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "suggestions.card": "3 automations suggested",
  "suggestions.cardSub": "Anvita noticed repeated work in #finance and #support.",
  "suggestions.review": "Review suggestions →",
};

export function useT() {
  const lang = useApp((s) => s.profile.language);
  return (key: TKey) => (lang === "hi" ? hi[key] : en[key]);
}
