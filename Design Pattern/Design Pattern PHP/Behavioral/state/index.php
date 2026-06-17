<?php

/**
 * The state pattern allows an object to alter its behavior when its 
 * internal state changes. The object will appear to change its class.
 */

// State.php
interface State
{
    public function handle(TrafficLight $context);
}




class RedState implements State
{
    public function handle(TrafficLight $context)
    {
        echo "Red Light - Stop\n";
        $context->setState(new GreenState());
    }
}



class YellowState implements State
{
    public function handle(TrafficLight $context)
    {
        echo "Yellow Light - Caution\n";
        $context->setState(new RedState());
    }
}



class GreenState implements State
{
    public function handle(TrafficLight $context)
    {
        echo "Green Light - Go\n";
        $context->setState(new YellowState());
    }
}

 
class TrafficLight
{
    private $state;

    public function __construct(State $state)
    {
        $this->setState($state);
    }

    public function setState(State $state)
    {
        $this->state = $state;
    }

    public function request()
    {
        $this->state->handle($this);
    }
}



// index.php
 
$trafficLight = new TrafficLight(new RedState());

for ($i = 0; $i < 6; $i++) {
    $trafficLight->request();
}
