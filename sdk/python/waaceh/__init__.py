"""WaAceh Python SDK — WhatsApp Gateway API"""
import httpx
from typing import Optional, List, Dict, Any

class WaAceh:
    def __init__(self, api_key: str, base_url: str = "https://waaceh.biz.id"):
        self.base_url = base_url.rstrip("/")
        self.headers = {"x-api-key": api_key, "Content-Type": "application/json"}
        self.client = httpx.Client(headers=self.headers, timeout=30)

    def _request(self, method: str, path: str, **kwargs) -> dict:
        r = self.client.request(method, f"{self.base_url}{path}", **kwargs)
        r.raise_for_status()
        return r.json()

    def health(self) -> dict:
        return self._request("GET", "/api/health")

    def list_sessions(self) -> list:
        return self._request("GET", "/api/sessions")

    def create_session(self, session_id: str, **kwargs) -> dict:
        return self._request("POST", "/api/sessions", json={"session_id": session_id, **kwargs})

    def get_session_status(self, session_id: str) -> dict:
        return self._request("GET", f"/api/sessions/{session_id}/status")

    def send_text(self, session_id: str, chat_id: str, text: str) -> dict:
        return self._request("POST", f"/api/sessions/{session_id}/messages/send-text", json={"chatId": chat_id, "text": text})

    def send_image(self, session_id: str, chat_id: str, image_url: str, caption: str = "") -> dict:
        return self._request("POST", f"/api/sessions/{session_id}/messages/send-image", json={"chatId": chat_id, "imageUrl": image_url, "caption": caption})

    def send_buttons(self, session_id: str, chat_id: str, text: str, buttons: list, footer: str = "") -> dict:
        return self._request("POST", f"/api/sessions/{session_id}/messages/send-buttons", json={"chatId": chat_id, "text": text, "buttons": buttons, "footer": footer})

    def send_list(self, session_id: str, chat_id: str, text: str, sections: list, title: str = "", button_text: str = "Pilih") -> dict:
        return self._request("POST", f"/api/sessions/{session_id}/messages/send-list", json={"chatId": chat_id, "text": text, "sections": sections, "title": title, "buttonText": button_text})

    def send_poll(self, session_id: str, chat_id: str, question: str, options: list, selectable_count: int = 1) -> dict:
        return self._request("POST", f"/api/sessions/{session_id}/messages/send-poll", json={"chatId": chat_id, "question": question, "options": options, "selectableCount": selectable_count})

    def send_reaction(self, session_id: str, chat_id: str, message_id: str, emoji: str) -> dict:
        return self._request("POST", f"/api/sessions/{session_id}/messages/react", json={"chatId": chat_id, "messageId": message_id, "emoji": emoji})

    def list_contacts(self, session_id: str) -> list:
        return self._request("GET", f"/api/sessions/{session_id}/users")

    def list_groups(self, session_id: str) -> list:
        return self._request("GET", f"/api/sessions/{session_id}/groups")

    def list_labels(self, session_id: str) -> list:
        return self._request("GET", f"/api/sessions/{session_id}/labels")

    def create_label(self, session_id: str, name: str, color: str = "#6366f1") -> dict:
        return self._request("POST", f"/api/sessions/{session_id}/labels", json={"name": name, "color": color})

    def get_qr(self, session_id: str) -> dict:
        return self._request("GET", f"/api/sessions/{session_id}/qr")

    def broadcast(self, session_id: str, numbers: list, message: str) -> dict:
        return self._request("POST", f"/api/sessions/{session_id}/broadcast", json={"numbers": numbers, "message": message})
