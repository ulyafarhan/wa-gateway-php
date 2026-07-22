<?php

namespace WaAceh\WAGateway\Laravel;

use WaAceh\WAGateway\WAGateway;
use Illuminate\Support\Facades\Facade;

class WAGatewayFacade extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return WAGateway::class;
    }
}
