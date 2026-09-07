<?php
// Car.php
/**
 * The Builder pattern is useful for constructing complex objects step by 
 * step. This pattern allows you to produce different types and representations of 
 * an object using the same construction process.
 */

class SQLQuery
{
    private $select = [];
    private $from;
    private $where = [];

    public function addSelect($fields)
    {
        $this->select = array_merge($this->select, $fields);
    }

    public function setFrom($table)
    {
        $this->from = $table;
    }

    public function addWhere($condition)
    {
        $this->where[] = $condition;
    }

    public function getQuery()
    {
        $query = "select " . implode(", ", $this->select);
        $query .= " FROM " . $this->from;
        if (!empty($this->where)) {
            $query .= " WHERE " . implode(" AND ", $this->where);
        }

        return $query;
    }
}

interface SQLQueryBuilder
{
    public function select(array $fields);
    public function from(string $table);
    public function where(string $condition);
    public function getSQLQuery(): SQLQuery;
}

class MySQLQueryBuilder implements SQLQueryBuilder
{
    private $query;

    public function __construct()
    {
        $this->query = new SQLQuery();
    }

    public function select(array $fields){
        $this->query->addSelect($fields);
    }

    public function from(string $table){
        $this->query->setFrom($table);
    }

    public function where(string $condition){
        $this->query->addWhere($condition);
    }

    public function getSQLQuery(): SQLQuery{
        return $this->query;
    }
}


class SQLQureyDirector{
    private $builder;

    public function __construct(SQLQueryBuilder $builder){
        $this->builder = $builder;
    }

    public function buildQuery(){
        $this->builder->select(['id', 'name', 'email']);
        $this->builder->from('users');
        $this->builder->where('status="active"');
    }

    public function getSQLQuery():SQLQuery{
        return $this->builder->getSQLQuery();
    }


}

$builder = new MySqlQueryBuilder();
$director = new SQLQureyDirector($builder);
$director->buildQuery();
$query = $director->getSQLQuery();

echo   $query->getQuery();
