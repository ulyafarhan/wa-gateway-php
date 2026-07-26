API_KEY="${API_KEY:?Set API_KEY env var first}"
curl -s -H "X-API-Key: $API_KEY" -X POST -H 'Content-Type: application/json' -d '{"session_id":"default"}' http://localhost:2785/api/sessions
sleep 8
echo '---STATUS---'
curl -s -H "X-API-Key: $API_KEY" http://localhost:2785/api/sessions/default/status
echo ''
echo '---QR---'
curl -s -H "X-API-Key: $API_KEY" http://localhost:2785/api/sessions/default/qr | head -c 200
