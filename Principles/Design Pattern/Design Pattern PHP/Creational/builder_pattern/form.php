<?php
// From
/**
 * The Builder pattern is useful for constructing complex objects step by 
 * step. This pattern allows you to produce different types and representations of 
 * an object using the same construction process.
 */

class Form
{
    private $fields = [];

    public function addField($name, $type, $label)
    {
        $this->fields[] = ['name' => $name, 'type' => $type, 'label' => $label];

    }

    public function render()
    {
        $formHTML = "<form>";
        foreach ($this->fields as $field) {
            $formHTML .= "<label>{$field['label']}</label>";
            $formHTML .= "<input type='{$field['type']}' name='{$field['name']}' />";
            $formHTML .= "<br />";
        }
        $formHTML .= "<button type='submit'>Submit</button>";
        $formHTML .= "</form>";

        return $formHTML;
    }
}

interface formBuilder
{
    public function addTextField($name, $label);
    public function addEmailField($name, $label);
    public function addPasswordField($name, $label);
    public function getForm(): Form;
}


class ContactFormBuilder implements formBuilder
{
    private $form;

    public function __construct()
    {
        $this->form = new Form();
    }

    public function addTextField($name, $label)
    {
        $this->form->addField($name, 'text', $label);
    }

    public function addEmailField($name, $label)
    {
        $this->form->addField($name, 'email', $label);
    }

    public function addPasswordField($name, $label)
    {
        $this->form->addField($name, 'password', $label);
    }

    public function getForm(): Form
    {
        return $this->form;
    }
}

class FormDirector
{
    private $builder;

    public function __construct(FormBuilder $builder)
    {
        $this->builder = $builder;
    }

    public function buildForm()
    {
        $this->builder->addTextField('name', 'Your Name');
        $this->builder->addEmailField('email', 'Your Email');
        $this->builder->addPasswordField('password', 'Your Password');
    }

    public function getForm(): Form
    {
        return $this->builder->getForm();
    }

}

$builder = new ContactFormBuilder();
$director = new FormDirector($builder);
$director->buildForm();
$form = $director->getForm();
echo $form->render();