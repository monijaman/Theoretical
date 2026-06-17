<?php
/**
 * Abstract Factory   lets you produce families
 * of related objects without specifying their concrete classes.
 */
// Define the Button interface
interface Button
{
    public function paint();
}

// Define the Checkbox interface
interface Checkbox
{
    public function paint();
}

// Define the WindowsButton class that implements the Button interface
class WindowsButton implements Button
{
    public function paint()
    {
        echo "Rendering a button in Windows style.\n";
    }
}

// Define the MacOSButton class that implements the Button interface
class MacOSButton implements Button
{
    public function paint()
    {
        echo "Rendering a button in MacOS style.\n";
    }
}

// Define the WindowsCheckbox class that implements the Checkbox interface
class WindowsCheckbox implements Checkbox
{
    public function paint()
    {
        echo "Rendering a checkbox in Windows style.\n";
    }
}

// Define the MacOSCheckbox class that implements the Checkbox interface
class MacOSCheckbox implements Checkbox
{
    public function paint()
    {
        echo "Rendering a checkbox in MacOS style.\n";
    }
}

// Define the abstract GUIFactory class
abstract class GUIFactory
{
    abstract public function createButton(): Button;
    abstract public function createCheckbox(): Checkbox;
}

// Define the WindowsFactory class that extends the GUIFactory abstract class
class WindowsFactory extends GUIFactory
{
    public function createButton(): Button
    {
        return new WindowsButton();
    }

    public function createCheckbox(): Checkbox
    {
        return new WindowsCheckbox();
    }
}

// Define the MacOSFactory class that extends the GUIFactory abstract class
class MacOSFactory extends GUIFactory
{
    public function createButton(): Button
    {
        return new MacOSButton();
    }

    public function createCheckbox(): Checkbox
    {
        return new MacOSCheckbox();
    }
}

// Client code to use the factories and create GUI components
function renderGUI(GUIFactory $factory)
{
    $button = $factory->createButton();
    $checkbox = $factory->createCheckbox();

    $button->paint();
    $checkbox->paint();
}

// Main execution

// Render Windows GUI
echo "Windows GUI:\n";
$windowsFactory = new WindowsFactory();
renderGUI($windowsFactory);

// Render MacOS GUI
echo "\nMacOS GUI:\n";
$macosFactory = new MacOSFactory();
renderGUI($macosFactory);

?>