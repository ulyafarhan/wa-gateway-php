<?php

namespace WaAceh\WAGateway\Laravel;

use WaAceh\WAGateway\WAGateway;
use Illuminate\Support\ServiceProvider;

class WAGatewayServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../../config/wa-gateway.php', 'wa-gateway');

        $this->app->singleton(WAGateway::class, function ($app) {
            $config = $app['config']['wa-gateway'];
            return new WAGateway(
                apiKey: $config['api_key'] ?? '',
                baseUrl: $config['base_url'] ?? 'http://localhost:2785',
                timeout: $config['timeout'] ?? 30,
            );
        });
    }

    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__ . '/../../config/wa-gateway.php' => config_path('wa-gateway.php'),
            ], 'wa-gateway-config');
        }
    }
}
