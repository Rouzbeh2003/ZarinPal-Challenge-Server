import json
from unittest.mock import patch

import pytest

from apps.analytics.services.llm import OpenAiCompatibleNarrativeGenerator


class FakeResponse:
    def __init__(self, body: dict) -> None:
        self.body = body

    def __enter__(self) -> "FakeResponse":
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def read(self) -> bytes:
        return json.dumps(self.body, ensure_ascii=False).encode("utf-8")


def _generator() -> OpenAiCompatibleNarrativeGenerator:
    return OpenAiCompatibleNarrativeGenerator(
        api_url="https://llm.example/v1/chat/completions",
        api_key="secret",
        model="test-model",
        timeout_seconds=5,
    )


def test_generator_prioritizes_user_question_and_validates_response() -> None:
    narrative = {
        "answer": "ابتدا نرخ ریزش را بررسی کنید.",
        "key_findings": ["نرخ موفقیت ۵۰٪ است."],
        "predicted_needs": [{"need": "بهبود قیف", "confidence": "زیاد", "evidence": "ریزش", "validation": "آزمون"}],
        "growth_opportunities": ["افزایش بازگشت مشتری"],
        "next_actions": [{"action": "قیف را پایش کنید.", "why": "ریزش", "kpi": "conversion", "guardrail": "حاشیه سود"}],
        "caveats": ["این داده‌ها علیت را ثابت نمی‌کنند."],
    }
    provider_response = {"choices": [{"message": {"content": json.dumps(narrative)}}]}

    with patch(
        "apps.analytics.services.llm.request.urlopen", return_value=FakeResponse(provider_response)
    ) as mocked:
        assert (
            _generator().generate(question="مهم‌ترین اقدام چیست؟", evidence={"overview": {}})
            == narrative
        )

    sent = json.loads(mocked.call_args.args[0].data.decode("utf-8"))
    user_message = json.loads(sent["messages"][1]["content"])
    assert user_message["question"] == "مهم‌ترین اقدام چیست؟"
    assert sent["reasoning_effort"] == "none"
    assert "temperature" not in sent
    assert "پرسش کاربر هدف اصلی است" in sent["messages"][0]["content"]


@pytest.mark.parametrize(
    "content",
    [
        {"answer": "پاسخ ناقص"},
        {"answer": "پاسخ", "key_findings": "متن", "predicted_needs": [], "growth_opportunities": [], "next_actions": [], "caveats": []},
    ],
)
def test_generator_rejects_malformed_narrative(content: dict) -> None:
    provider_response = {"choices": [{"message": {"content": json.dumps(content)}}]}

    with (
        patch(
            "apps.analytics.services.llm.request.urlopen",
            return_value=FakeResponse(provider_response),
        ),
        pytest.raises(ValueError),
    ):
        _generator().generate(question="سؤال", evidence={})


def test_generator_rejects_provider_response_without_content() -> None:
    with (
        patch(
            "apps.analytics.services.llm.request.urlopen",
            return_value=FakeResponse({"choices": []}),
        ),
        pytest.raises(ValueError, match="does not contain"),
    ):
        _generator().generate(question="سؤال", evidence={})
