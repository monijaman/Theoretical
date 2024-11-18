<?php 

/**
 * Adapter is a structural design pattern that allows 
 * objects with incompatible interfaces to collaborate.
 */

 interface BookInterface {
    public function getAuthorAndTitle(): string;
  }

  class LegacySimpleBook {
    private $author;
    private $title;
  
    public function __construct($author, $title) {
      $this->author = $author;
      $this->title = $title;
    }
  
    public function getAuthor(): string {
      return $this->author;
    }
  
    public function getTitle(): string {
      return $this->title;
    }
  }
 

  class LegacyBookAdapter implements BookInterface {
    private $legacyBook;
  
    public function __construct(LegacySimpleBook $legacyBook) {
      $this->legacyBook = $legacyBook;
    }
  
    public function getAuthorAndTitle(): string {
      return $this->legacyBook->getAuthor() . ' by ' . $this->legacyBook->getTitle();
    }
  }

  $legacyBook = new LegacySimpleBook('John Doe', 'My Awesome Book');

// Legacy usage (incompatible)
// echo $legacyBook->getAuthor(); // This wouldn't work in your application

// Adapter usage (compatible)
$adapter = new LegacyBookAdapter($legacyBook);
echo $adapter->getAuthorAndTitle(); // Output: John Doe by My Awesome Book

  