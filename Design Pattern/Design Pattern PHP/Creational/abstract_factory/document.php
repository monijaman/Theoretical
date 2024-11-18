<?php
/**
 * Abstract Factory   lets you produce families
 * of related objects without specifying their concrete classes.
 * 
 * Scenario: Your application needs to generate documents in different formats 
 * (e.g., PDF, Word, HTML). Each format requires different components
 *  (e.g., headers, footers, content sections). Handling all formats directly 
 * in the client code would make it complex and difficult to maintain.
 */
// Define the Button interface

interface Header
{
    public function render();
}

interface Footer
{
    public function render();
}

interface Content
{
    public function render();
}

class PDFHeader implements Header
{
    public function render()
    {
        echo "Rendering PDF Header\n";
    }
}

class PDFFooter implements Footer
{
    public function render()
    {
        echo "Rendering PDF Footer\n";
    }
}

class PDFConent implements content
{
    public function render()
    {
        echo "Rendering PDF Content\n";
    }
}


class WordHeader implements Header
{
    public function render()
    {
        echo "Rendering Word Header\n";
    }
}

class WordFooter implements Footer
{
    public function render()
    {
        echo "Rendering Word Footer\n";
    }
}

class WordContent implements Content
{
    public function render()
    {
        echo "Rendering Word Content \n";
    }
}
/**
 * Summary of DocumentFactory
 */
interface DocumentFactory
{
    public function createHeader(): Header;
    public function createFooter(): Footer;
    public function createContent(): Content;
}

class PDFDocumentFactory implements DocumentFactory
{
    public function createHeader(): Header
    {
        return new PDFHeader();
    }


    public function createFooter(): Footer
    {
        return new PDFFooter();
    }

    public function createContent(): Content
    {
        return new PDFConent();
    }
}

class WordDocumentFactory implements DocumentFactory
{
    public function createHeader(): Header
    {
        return new WordHeader();
    }

    public function createFooter(): Footer
    {
        return new WordFooter();
    }

    public function createContent(): Content
    {
        return new WordContent();
    }
}

class Document{
    private $header;
    private $footer;
    private $content;

    public function __construct(DocumentFactory $factory){
        $this->header = $factory->createHeader();
        $this->footer = $factory->createFooter();
        $this->content = $factory->createContent();
    }

    public function render(){
        $this->header->render();
        $this->content->render();
        $this->footer->render();
    }
}

function clientCode(DocumentFactory $factory){
    $document = new Document($factory);
    $document->render();
}

$factory = new PDFDocumentFactory();
clientCode($factory);

$factory = new WordDocumentFactory();
clientCode($factory);