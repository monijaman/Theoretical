<?php

/**
 * The Prototype pattern is used to create new objects by copying or 
 * cloning existing objects, known as prototypes, without relying 
 * on their specific classes. This pattern allows you to produce new 
 * instances quickly and efficiently by copying existing instances, 
 * which can be especially useful when the creation of a new object is costly or complex.
 * */


// CarPrototype.php
interface CarPrototype
{
    public function clone(): CarPrototype;
}

class Car implements CarPrototype
{
    private $model;
    private $color;

    public function __construct($model, $color)
    {
        $this->model = $model;
        $this->color = $color;
    }

    public function getModel()
    {
        return $this->model;
    }

    public function getColor()
    {
        return $this->color;
    }

    public function clone(): CarPrototype
    {
        // Perform shallow copy
        return clone $this;
    }
}

// Create a prototype car
$prototypeCar = new Car("Prototype Model", "Red");

// Clone the prototype to create a new instance
$newCar = $prototypeCar->clone();

// Demonstrate the cloned car
echo "Prototype Car - Model: " . $prototypeCar->getModel() . ", Color: " . $prototypeCar->getColor() . "\n";
echo "Cloned Car - Model: " . $newCar->getModel() . ", Color: " . $newCar->getColor() . "\n";
