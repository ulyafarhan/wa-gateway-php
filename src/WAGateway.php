<?php

namespace WaAceh\WAGateway;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class WAGateway
{
    private Client $http;
    private string $apiKey;
    private string $baseUrl;

    public function __construct(string $apiKey, string $baseUrl = 'http://localhost:2785', int $timeout = 30)
    {
        $this->apiKey = $apiKey;
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->http = new Client([
            'timeout' => $timeout,
            'headers' => [
                'Content-Type' => 'application/json',
                'X-Api-Key' => $apiKey,
            ],
        ]);
    }

    private function request(string $method, string $path, ?array $body = null): array
    {
        try {
            $opts = [];
            if ($body !== null) $opts['json'] = $body;
            $res = $this->http->request($method, $this->baseUrl . $path, $opts);
            return json_decode((string)$res->getBody(), true) ?? [];
        } catch (GuzzleException $e) {
            if ($e->hasResponse()) {
                $data = json_decode((string)$e->getResponse()->getBody(), true);
                throw new WAGatewayException(
                    $data['error'] ?? $e->getMessage(),
                    $e->getResponse()->getStatusCode()
                );
            }
            throw new WAGatewayException($e->getMessage(), 0, $e);
        }
    }

    public function health(): array
    {
        return $this->request('GET', '/api/health');
    }

    public function getSessions(): array
    {
        return $this->request('GET', '/api/sessions');
    }

    public function createSession(string $sessionId, array $options = []): array
    {
        return $this->request('POST', '/api/sessions', array_merge(
            ['session_id' => $sessionId],
            $options
        ));
    }

    public function getSessionStatus(string $sessionId): array
    {
        return $this->request('GET', "/api/sessions/{$sessionId}/status");
    }

    public function getQR(string $sessionId, string $format = 'json'): array
    {
        return $this->request('GET', "/api/sessions/{$sessionId}/qr?format={$format}");
    }

    public function deleteSession(string $sessionId): array
    {
        return $this->request('DELETE', "/api/sessions/{$sessionId}");
    }

    public function sendText(string $sessionId, string $chatId, string $text, string $priority = 'normal'): array
    {
        return $this->request('POST', "/api/sessions/{$sessionId}/messages", [
            'type' => 'text', 'chatId' => $chatId, 'text' => $text, 'priority' => $priority,
        ]);
    }

    public function sendImage(string $sessionId, string $chatId, string $imageUrl, string $caption = ''): array
    {
        return $this->request('POST', "/api/sessions/{$sessionId}/messages", [
            'type' => 'image', 'chatId' => $chatId, 'imageUrl' => $imageUrl, 'caption' => $caption,
        ]);
    }

    public function sendDocument(string $sessionId, string $chatId, string $documentUrl, string $fileName = 'file'): array
    {
        return $this->request('POST', "/api/sessions/{$sessionId}/messages", [
            'type' => 'document', 'chatId' => $chatId, 'documentUrl' => $documentUrl, 'fileName' => $fileName,
        ]);
    }

    public function sendButton(string $sessionId, string $chatId, string $text, array $buttons): array
    {
        return $this->request('POST', "/api/sessions/{$sessionId}/messages", [
            'type' => 'button', 'chatId' => $chatId, 'text' => $text, 'buttons' => $buttons,
        ]);
    }

    public function sendTemplate(string $sessionId, string $chatId, string $templateId, array $variables = []): array
    {
        return $this->request('POST', "/api/sessions/{$sessionId}/messages", [
            'type' => 'template', 'chatId' => $chatId, 'templateId' => $templateId, 'variables' => $variables,
        ]);
    }

    public function getMessages(string $sessionId): array
    {
        return $this->request('GET', "/api/sessions/{$sessionId}/messages");
    }

    public function getIncoming(string $sessionId): array
    {
        return $this->request('GET', "/api/sessions/{$sessionId}/incoming");
    }

    public function sendBroadcast(string $sessionId, array $numbers, string $message, array $opts = []): array
    {
        return $this->request('POST', "/api/sessions/{$sessionId}/broadcast", array_merge(
            ['numbers' => $numbers, 'message' => $message], $opts
        ));
    }

    public function getBroadcastStatus(string $sessionId, string $broadcastId): array
    {
        return $this->request('GET', "/api/sessions/{$sessionId}/broadcast/{$broadcastId}");
    }

    public function getBehaviorConfig(string $sessionId): array
    {
        return $this->request('GET', "/api/sessions/{$sessionId}/behavior");
    }

    public function setBehaviorConfig(string $sessionId, array $config): array
    {
        return $this->request('POST', "/api/sessions/{$sessionId}/behavior", $config);
    }

    public function getFAQs(string $sessionId): array
    {
        return $this->request('GET', "/api/sessions/{$sessionId}/faq");
    }

    public function addFAQ(string $sessionId, string $question, string $answer, array $keywords = [], string $intent = ''): array
    {
        return $this->request('POST', "/api/sessions/{$sessionId}/faq", [
            'question' => $question, 'answer' => $answer, 'keywords' => $keywords, 'intent' => $intent,
        ]);
    }

    public function deleteFAQ(string $sessionId, string $faqId): array
    {
        return $this->request('DELETE', "/api/sessions/{$sessionId}/faq/{$faqId}");
    }

    public function getTemplates(string $sessionId): array
    {
        return $this->request('GET', "/api/sessions/{$sessionId}/templates");
    }

    public function addTemplate(string $sessionId, string $intent, array $templates): array
    {
        return $this->request('POST', "/api/sessions/{$sessionId}/templates", [
            'intent' => $intent, 'templates' => $templates,
        ]);
    }

    public function deleteTemplate(string $sessionId, string $templateId): array
    {
        return $this->request('DELETE', "/api/sessions/{$sessionId}/templates/{$templateId}");
    }

    public function getAnalyticsSummary(string $sessionId): array
    {
        return $this->request('GET', "/api/sessions/{$sessionId}/analytics/summary");
    }

    public function getAnalyticsVolume(string $sessionId, int $days = 7): array
    {
        return $this->request('GET', "/api/sessions/{$sessionId}/analytics/volume?days={$days}");
    }

    public function getUsers(string $sessionId): array
    {
        return $this->request('GET', "/api/sessions/{$sessionId}/users");
    }

    public function getUserProfile(string $sessionId, string $userId): array
    {
        return $this->request('GET', "/api/sessions/{$sessionId}/users/{$userId}");
    }

    public function setUserPersona(string $sessionId, string $userId, string $persona): array
    {
        return $this->request('PUT', "/api/sessions/{$sessionId}/users/{$userId}/persona", [
            'persona' => $persona,
        ]);
    }

    public function ensureSession(string $sessionId, array $options = []): array
    {
        try {
            return $this->getSessionStatus($sessionId);
        } catch (WAGatewayException $e) {
            if ($e->getCode() === 404) return $this->createSession($sessionId, $options);
            throw $e;
        }
    }

    public function sendTextWithRetry(string $sessionId, string $chatId, string $text, int $retries = 3, int $delayMs = 1000): array
    {
        $last = null;
        for ($i = 0; $i < $retries; $i++) {
            try {
                return $this->sendText($sessionId, $chatId, $text);
            } catch (WAGatewayException $e) {
                $last = $e;
                if ($i < $retries - 1) usleep($delayMs * 1000 * ($i + 1));
            }
        }
        throw $last;
    }
}
