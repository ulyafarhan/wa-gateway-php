# WaAceh Python SDK

```python
from waaceh import WaAceh

client = WaAceh(api_key="sk_live_xxx")
print(client.health())
print(client.send_text("my-session", "628123456789@s.whatsapp.net", "Hello from Python!"))
```
