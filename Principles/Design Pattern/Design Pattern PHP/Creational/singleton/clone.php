<?php
/**
 * the Singleton pattern ensures that a class has only one 
 * instance and provides a global point of access to that instance. 
 * This pattern is commonly used in scenarios where you need a single, 
 * shared resource throughout your application, such as a database 
 * connection, a logger, or a configuratio
 */

// Singleton.php
class Singleton {
    private static $instance = null;

    private function __construct() {
        // Initialization code
    }

    private function __clone() {
        // Prevent cloning
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new Singleton();
        }
        return self::$instance;
    }
}

// Client Code
$singleton1 = Singleton::getInstance();
$singleton2 = Singleton::getInstance();
$singleton3 = clone $singleton1;
// Check if both instances are the same
if ($singleton1 === $singleton2) {
    echo "The instances are the same.\n";
} 

if ($singleton1 === $singleton3)  {
    echo "The instances and 3 are the same.\n";
} else {
    echo "The instances are different.\n";
}

// Attempting to clone the Singleton instance (will result in an error)
// $singleton3 = clone $singleton1; // Fatal error: Call to private method Singleton::__clone() from context

