<?php
// Car.php
/**
 * The Builder pattern is useful for constructing complex objects step by 
 * step. This pattern allows you to produce different types and representations of 
 * an object using the same construction process.
 */
class Car
{
    private $type;
    private $seats;
    private $engine;
    private $tripComputer;
    private $gps;

    public function setType($type)
    {
        $this->type = $type;
    }

    public function setSeats($seats)
    {
        $this->seats = $seats;
    }

    public function setEngine($engine)
    {
        $this->engine = $engine;
    }

    public function setTripComputer($tripComputer)
    {
        $this->tripComputer = $tripComputer;
    }

    public function setGPS($gps)
    {
        $this->gps = $gps;
    }

    public function getType()
    {
        return $this->type;
    }

    public function getSeats()
    {
        return $this->seats;
    }

    public function getEngine()
    {
        return $this->engine;
    }

    public function hasTripComputer()
    {
        return $this->tripComputer;
    }

    public function hasGPS()
    {
        return $this->gps;
    }
}

// CarBuilder.php
interface CarBuilder
{
    public function setType($type);
    public function setSeats($seats);
    public function setEngine($engine);
    public function setTripComputer($tripComputer);
    public function setGPS($gps);
    public function getResult(): Car;
}



class ConcreteCarBuilder implements CarBuilder
{
    private $car;

    public function __construct()
    {
        $this->car = new Car();
    }

    public function setType($type)
    {
        $this->car->setType($type);
    }

    public function setSeats($seats)
    {
        $this->car->setSeats($seats);
    }

    public function setEngine($engine)
    {
        $this->car->setEngine($engine);
    }

    public function setTripComputer($tripComputer)
    {
        $this->car->setTripComputer($tripComputer);
    }

    public function setGPS($gps)
    {
        $this->car->setGPS($gps);
    }

    public function getResult(): Car
    {
        return $this->car;
    }
}


class Director
{
    private $builder;

    public function setBuilder(CarBuilder $builder)
    {
        $this->builder = $builder;
    }

    public function constructSportsCar()
    {
        $this->builder->setType("Sports Car");
        $this->builder->setSeats(2);
        $this->builder->setEngine("V8");
        $this->builder->setTripComputer(true);
        $this->builder->setGPS(true);
    }

    public function constructSUV()
    {
        $this->builder->setType("SUV");
        $this->builder->setSeats(5);
        $this->builder->setEngine("V6");
        $this->builder->setTripComputer(true);
        $this->builder->setGPS(true);
    }
}

function printCarDetails(Car $car)
{
    echo "Car Type: " . $car->getType() . "\n";
    echo "Seats: " . $car->getSeats() . "\n";
    echo "Engine: " . $car->getEngine() . "\n";
    echo "Trip Computer: " . ($car->hasTripComputer() ? "Yes" : "No") . "\n";
    echo "GPS: " . ($car->hasGPS() ? "Yes" : "No") . "\n";
}

// Main execution
$director = new Director();
$builder = new ConcreteCarBuilder();

$director->setBuilder($builder);

// Construct and display a Sports Car
$director->constructSportsCar();
$sportsCar = $builder->getResult();
echo "Sports Car:\n";
printCarDetails($sportsCar);
echo "\n";

// Construct and display an SUV
$director->constructSUV();
$suv = $builder->getResult();
echo "SUV:\n";
printCarDetails($suv);

?>