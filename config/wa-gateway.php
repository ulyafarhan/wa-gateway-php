<?php

return [
    'api_key' => env('WA_GATEWAY_API_KEY', ''),
    'base_url' => env('WA_GATEWAY_BASE_URL', 'http://localhost:2785'),
    'timeout' => (int) env('WA_GATEWAY_TIMEOUT', 30),
];
