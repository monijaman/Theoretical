<?php

interface vehicle
{
    public function drive();
}

class car implements vehicle
{
    public function drive()
    {
        echo "driving car";
    }
}

class truck implements vehicle
{
    public function drive()
    {
        echo "driving truck";
    }
}


class vehicleFactory
{
    public static function createVehicle($type): vehicle
    {
        switch ($type) {
            case 'car':
                return new car();
            case 'truck':
                return new truck();
            default:
                throw new Exception("Vehicle are not supported");
        }
    }
}

$vehicle = vehicleFactory::createVehicle('car');
$vehicle->drive();

class Motorcycle implements vehicle
{
    public function drive()
    {
        echo "Driving bike";
    }
}

class extendVehicleFactory extends vehicleFactory
{
    public static function createVehicle($type): vehicle
    {
        switch ($type) {
            case 'motorcycle':
                return new Motorcycle();

            default:
                throw new Exception("vehicle are no supported");
        }
    }
}

$vehicle = extendVehicleFactory::createVehicle('motorcycle');
$vehicle->drive();