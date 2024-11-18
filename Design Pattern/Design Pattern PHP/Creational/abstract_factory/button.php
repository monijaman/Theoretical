<?php
/**
 * Abstract Factory   lets you produce families
 * of related objects without specifying their concrete classes.
 */
// Define the Button interface

interface Button {
    public function render();
}

interface Checkbox{
    public function render();
}

class WindowsButton implements Button {
    public function render() {
        echo "Render Windows Buttton\n";
    }
}

class MacButton implements Button {
    public function render(){
        echo "Render Mac Button\n";
    }
}

class WindowsCheckbox implements Checkbox{
    public function render(){
        echo "Render Windows Checkbox\n";
    }
}

class MacOSCheckbox implements Checkbox{
    public function render(){
        echo "render Mac Checkbo\n";
    }
}

interface GUIFactory{
    public function createButton():Button;
    public function createCheckbox():Checkbox;
}

class WindowsFactory implements GUIFactory{
    public function createButton():Button{
        return new windowsButton();
    }

    public function createCheckbox():Checkbox{
        return new WindowsCheckbox();
    }
}

class MacOSFactory implements GUIFactory{

    public function createButton():Button{
        return new MacButton();
    }
    public function createCheckbox(): Checkbox{
        return new MacOSCheckbox();
    }
}


class Application{
    private $button;
    private $checkbox;
    public function __construct( GUIFactory $factory){
        $this->button = $factory->createButton();
        $this->checkbox = $factory->createCheckbox();
    }

    public function render(){
        $this->button->render();
        $this->checkbox->render();
    }
}

 function clientCode(GUIFactory $gUIFactory){
    $app = new Application($gUIFactory);
    $app->render();
 }
 
 if(PHP_OS_FAMILY=='Windows'){
    clientCode(new WindowsFactory());
 }else{
    clientCode(new MacOSFactory());
 }