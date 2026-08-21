import json
from collections.abc import Iterator
from typing import Any
from urllib import request

SYSTEM_PROMPT = """\
شما مشاور ارشد رشد، عملیات، تجربه مشتری و سلامت مالی پذیرندگان هستید و باید فقط به زبان فارسی پاسخ دهید. موفقیت پرداخت فقط یکی از ابعاد تحلیل است، نه کل تحلیل.

قواعد الزامی:
1. پرسش کاربر هدف اصلی است؛ در فیلد answer ابتدا همان پرسش را مستقیم، مشخص و کوتاه پاسخ دهید.
2. فقط از evidence تجمیعی ورودی استفاده کنید. عدد، علت یا واقعیتی خارج از آن نسازید.
3. میان همبستگی و علیت تفاوت بگذارید و بدون شاهد ادعای علی نکنید.
4. اگر شواهد برای پاسخ قطعی کافی نیست، صریحاً محدودیت را بگویید و بهترین اقدام قابل آزمون را پیشنهاد کنید.
5. اعداد پولی evidence بر حسب ریال و نرخ‌ها بین صفر و یک هستند؛ نرخ‌ها را به درصد خوانا تبدیل کنید.
6. تحلیل را در ابعاد تقاضا و بازگشت مشتری، ارزش سبد و فروش، تجربه خرید، عملیات و تطبیق، ریسک، و سپس سلامت پرداخت بررسی کنید.
7. predicted_needs پیش‌بینی قطعی نیست؛ هر نیاز را به‌عنوان فرضیه رتبه‌بندی‌شده همراه با شاهد، اطمینان و روش اعتبارسنجی بیان کنید.
8. توصیه‌ها باید اجرایی، اولویت‌بندی‌شده، قابل سنجش و شامل guardrail باشند. اگر داده لازم موجود نیست دقیقاً بگویید چه داده‌ای باید اضافه شود.
9. از تکرار صرف نرخ موفقیت پرداخت پرهیز کنید و حداقل دو بعد غیرپرداختی را، در صورت وجود شاهد، پوشش دهید.
10. اگر peer_comparison.available درست است، مقایسه با هم‌صنف‌ها را با عدد و بدون حدس تحلیل کنید. این benchmark تجمیعی است و نباید درباره پذیرنده مشخص دیگری ادعا بسازید.

فقط یک JSON معتبر با همین ساختار برگردانید:
{
  "answer": "پاسخ مستقیم فارسی در 2 تا 4 جمله",
  "key_findings": ["حداکثر 4 یافته همراه با عدد شاهد"],
  "predicted_needs": [{"need":"نیاز احتمالی", "confidence":"زیاد/متوسط/کم", "evidence":"شاهد", "validation":"روش اعتبارسنجی"}],
  "growth_opportunities": ["فرصت رشد همراه با KPI"],
  "next_actions": [{"action":"اقدام", "why":"دلیل", "kpi":"شاخص", "guardrail":"خط قرمز"}],
  "caveats": ["محدودیت‌ها یا نکات احتیاطی"]
}
همهٔ کلیدها الزامی‌اند. predicted_needs و next_actions آرایه object و سایر فهرست‌ها آرایه رشته‌اند.
"""


class OpenAiCompatibleNarrativeGenerator:
    """Generate Persian narrative from aggregate evidence through a compatible chat API."""

    def __init__(self, *, api_url: str, api_key: str, model: str, timeout_seconds: int) -> None:
        self.api_url = api_url
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = timeout_seconds

    def generate(self, *, question: str | None, evidence: dict[str, Any]) -> dict[str, Any]:
        content = "".join(self.generate_stream(question=question, evidence=evidence))
        if not content:
            raise ValueError("LLM response does not contain message content")
        return _validate_narrative(json.loads(content))

    def generate_stream(
        self, *, question: str | None, evidence: dict[str, Any]
    ) -> Iterator[str]:
        """Yield content deltas from an OpenAI-compatible SSE response."""
        payload = {
            "model": self.model,
            "stream": True,
            "reasoning_effort": "none",
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT,
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "question": question or "مهم‌ترین اقدام‌های این پذیرنده چیست؟",
                            "evidence": evidence,
                        },
                        ensure_ascii=False,
                        default=str,
                    ),
                },
            ],
        }
        http_request = request.Request(
            self.api_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
            method="POST",
        )
        with request.urlopen(http_request, timeout=self.timeout_seconds) as response:  # noqa: S310
            for raw_line in response:
                line = raw_line.decode("utf-8").strip()
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    chunk = json.loads(data)
                    choices = chunk.get("choices", [])
                    content = choices[0]["delta"].get("content") if choices else None
                except (json.JSONDecodeError, AttributeError, KeyError, TypeError) as error:
                    raise ValueError("LLM stream contains an invalid chunk") from error
                if content:
                    yield content

    @staticmethod
    def validate_streamed_content(content: str) -> dict[str, Any]:
        return _validate_narrative(json.loads(content))


def _validate_narrative(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError("Narrative response must be a JSON object")

    answer = value.get("answer")
    if not isinstance(answer, str) or not answer.strip():
        raise ValueError("Narrative answer must be a non-empty string")

    narrative: dict[str, Any] = {"answer": answer.strip()}
    for field in ("key_findings", "growth_opportunities", "caveats"):
        items = value.get(field)
        if not isinstance(items, list) or not all(isinstance(item, str) for item in items):
            raise ValueError(f"Narrative {field} must be an array of strings")
        narrative[field] = [item.strip() for item in items if item.strip()][:4]
    needs = value.get("predicted_needs")
    if not isinstance(needs, list) or not all(isinstance(item, dict) for item in needs):
        raise ValueError("Narrative predicted_needs must be an array of objects")
    narrative["predicted_needs"] = needs[:4]
    actions = value.get("next_actions")
    if not isinstance(actions, list) or not all(isinstance(item, dict) for item in actions):
        raise ValueError("Narrative next_actions must be an array of objects")
    narrative["next_actions"] = actions[:5]
    return narrative
