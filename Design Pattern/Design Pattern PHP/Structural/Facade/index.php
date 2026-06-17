<?php 
/**
 * Facades are a design pattern used to provide a static 
 * interface to classes that are available in the application's 
 * service container. Facades allow you to access these objects in
 *  a more readable and convenient way.
 */

 // UserService.php

 
class Calculator
{
    public function add($a, $b)
    {
        return $a + $b;
    }

    public function subtract($a, $b)
    {
        return $a - $b;
    }
}


// CalculatorFacade.php
class CalculatorFacade
{
    protected static $calculator;

    protected static function getCalculator()
    {
        if (!self::$calculator) {
            self::$calculator = new Calculator();
        }

        return self::$calculator;
    }

    public static function __callStatic($method, $args)
    {
        $instance = self::getCalculator();
        return call_user_func_array([$instance, $method], $args);
    }
}

$sum = CalculatorFacade::add(1, 2);
$difference = CalculatorFacade::subtract(5, 3);

echo "Sum: " . $sum . "\n"; // Outputs: Sum: 3
echo "Difference: " . $difference . "\n"; // Outputs: Difference: 2