from __future__ import annotations

SUPPORTED_LANGUAGES = {
    "en": "English",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "hi": "Hindi",
    "es": "Spanish",
    "pt": "Portuguese",
    "fr": "French",
    "de": "German",
    "ar": "Arabic",
    "ru": "Russian",
}

_LANGUAGE_INSTRUCTIONS = {
    "en": "Respond in English.",
    "zh": "请用中文回复。",
    "ja": "日本語で回答してください。",
    "ko": "한국어로 응답하세요.",
    "hi": "हिंदी में उत्तर दें।",
    "es": "Responda en español.",
    "pt": "Responda em português.",
    "fr": "Répondez en français.",
    "de": "Antworten Sie auf Deutsch.",
    "ar": ".الرد باللغة العربية",
    "ru": "Ответьте на русском языке.",
}


def get_language_instruction(lang: str) -> str:
    return _LANGUAGE_INSTRUCTIONS.get(lang, "Respond in English.")


def translate_output(text: str, target_lang: str) -> str:
    if target_lang == "en":
        return text
    return f"[{target_lang.upper()}]: {text}"
