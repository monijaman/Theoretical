<?php

/**
 * The Factory Method pattern is a creational design pattern
 * that provides an interface for creating objects but allows 
 * subclasses to alter the type of objects that will be created.
 * This pattern delegates the instantiation process to subclasses. 
 **/


// Interface defining a common method for all notification types.
interface Notification
{
    public function send($message);
}

// Concrete implementation of the Notification interface for Email.
class EmailNotification implements Notification
{
    public function send($message)
    {
        echo "Sending Email with message: $message\n";
    }
}

// Concrete implementation of the Notification interface for SMS.
class SMSNotification implements Notification
{
    public function send($message)
    {
        echo "Sending SMS with message: $message\n";
    }
}

// Abstract factory class declaring the factory method.
abstract class NotificationFactory
{
    // Abstract method that concrete factories must implement.
    abstract public function createNotification(): Notification;
}

// Concrete factory for creating EmailNotification instances.
class EmailNotificationFactory extends NotificationFactory
{
    public function createNotification(): Notification
    {
        return new EmailNotification();
    }
}

// Concrete factory for creating SMSNotification instances.
class SMSNotificationFactory extends NotificationFactory
{
    public function createNotification(): Notification
    {
        return new SMSNotification();
    }
}

// Function to send a notification using the provided factory.
function sendNotification(NotificationFactory $factory, $message)
{
    // Create the notification using the factory method.
    $notification = $factory->createNotification();
    // Send the notification with the provided message.
    $notification->send($message);
}

// Create an instance of the EmailNotificationFactory.
$emailFactory = new EmailNotificationFactory();
// Send an email notification.
sendNotification($emailFactory, "Hello via Email!");

// Create an instance of the SMSNotificationFactory.
$smsFactory = new SMSNotificationFactory();
// Send an SMS notification.
sendNotification($smsFactory, "Hello via SMS!");

?>