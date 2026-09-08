<?php
/**
 * the Singleton pattern ensures that a class has only one 
 * instance and provides a global point of access to that instance. 
 * This pattern is commonly used in scenarios where you need a single, 
 * shared resource throughout your application, such as a database 
 * connection, a logger, or a configuratio
 */

// Singleton.php

class Singleton
{
    private static $instance;

    // Private constructor to prevent instantiation from outside
    private function __construct()
    {
    }

    // Public static method to get the instance
    public static function getInstance(): Singleton
    {
        if (self::$instance === null) {
            self::$instance = new Singleton();
        }
        return self::$instance;
    }

    // Example method of the singleton instance
    public function showMessage()
    {
        echo "Hello, I am a Singleton instance!\n";
    }
}





// require_once 'Singleton.php';

// Get the Singleton instance
$singletonInstance1 = Singleton::getInstance();
$singletonInstance1->showMessage();

// Try to get another instance (should return the same instance)
$singletonInstance2 = Singleton::getInstance();
$singletonInstance2->showMessage();

// Check if both instances are the same
if ($singletonInstance1 === $singletonInstance2) {
    echo "Both instances are the same.\n";
} else {
    echo "Instances are different.\n";
}
