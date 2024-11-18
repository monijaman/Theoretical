<?php 

/**
 * The Strategy Pattern is a behavioral design pattern that enables 
 * selecting an algorithm's behavior at runtime. It defines a family of algorithms, 
 * encapsulates each one, and makes them interchangeable. The strategy pattern lets 
 * the algorithm vary independently from clients that use it.
 */
interface PaymentStrategy
{
    public function pay($amount);
}

 
class CreditCardStrategy implements PaymentStrategy
{
    private $name;
    private $cardNumber;
    private $cvv;
    private $expiryDate;

    public function __construct($name, $cardNumber, $cvv, $expiryDate)
    {
        $this->name = $name;
        $this->cardNumber = $cardNumber;
        $this->cvv = $cvv;
        $this->expiryDate = $expiryDate;
    }

    public function pay($amount)
    {
        echo "Paying $amount using Credit Card\n";
    }
}

 
class PayPalStrategy implements PaymentStrategy
{
    private $email;

    public function __construct($email)
    {
        $this->email = $email;
    }

    public function pay($amount)
    {
        echo "Paying $amount using PayPal\n";
    }
}
