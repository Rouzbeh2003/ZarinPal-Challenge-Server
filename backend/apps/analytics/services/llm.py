import json
from typing import Any
from urllib import request


class OpenAiCompatibleNarrativeGenerator:
    """Generate Persian narrative from aggregate evidence through a compatible chat API."""

    def __init__(self, *, api_url: str, api_key: str, model: str, timeout_seconds: int) -> None:
        self.api_url = api_url
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = timeout_seconds

    def generate(self, *, question: str | None, evidence: dict[str, Any]) -> dict[str, Any]:
        payload = {
            "model": self.model,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a Persian payment analytics advisor. Use only supplied aggregate "
                        "evidence. Never claim causality. Return JSON with answer, key_findings, "
                        "next_actions, and caveats. Do not invent numbers."
                    ),
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
            result = json.loads(response.read().decode("utf-8"))
        content = result["choices"][0]["message"]["content"]
        narrative = json.loads(content)
        if not isinstance(narrative, dict):
            raise ValueError("Narrative response must be a JSON object")
        return narrative
