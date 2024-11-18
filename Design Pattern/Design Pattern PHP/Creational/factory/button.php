<?php
interface Button
{
    public function render();
}

class windowsButton implements Button
{
    public function render()
    {
        echo "Render Windows Button";
    }
}

class macOSButton implements Button
{
    public function render()
    {
        echo "Render Mac Button";
    }
}

abstract class GUIFactory
{
    abstract public function createButton(): Button;
}

class windowsFactory extends GUIFactory
{
    public function createButton(): Button
    {
        return new windowsButton();
    }
}

class MacOSFactory extends GUIFactory
{
    public function createButton(): Button
    {
        return new macOSButton();
    }
}

class Application
{
    private $button;

    public function __construct(GUIFactory $factory)
    {
        $this->button = $factory->createButton();
    }
    public function render(){
        $this->button->render();
    }
}

$factory = new windowsFactory();
$app = new Application($factory);
$app->render();

$factory = new MacOSFactory();
$app =  new Application($factory);
$app->render();