<?php
/**
 * Abstract Factory   lets you produce families
 * of related objects without specifying their concrete classes.
 */
// Define the Button interface

interface Connection
{
    public function connect();
}

interface QueryBuilder
{
    public function buildSelectQuery($table): string;
}

class MySqlConnection implements Connection
{
    public function connect()
    {
        return "MySql Connect";
    }
}

class PostgreeConnection implements Connection
{
    public function connect()
    {
        return "Postgree Connect ";
    }
}


class MySqlQueryBuilder implements QueryBuilder
{
    public function buildSelectQuery($table): string
    {
        return "SELECT * FROM {$table} (MySQL)";
    }
}


class PostgreeQueryBuilder implements QueryBuilder
{
    public function buildSelectQuery($table): string
    {
        return "SELECT * FROM {$table} (Postgree)";
    }
}

// abstract factory

interface DatabaseFactory
{
    public function createConnection(): Connection;
    public function createQueryBuilder(): QueryBuilder;
}


class MySqlFactory implements DatabaseFactory
{
    public function createConnection(): Connection
    {
        return new MySqlConnection();
    }

    public function createQueryBuilder(): QueryBuilder
    {
        return new MySqlQueryBuilder();
    }
}

class PostgreeFactory implements DatabaseFactory
{
    public function createConnection(): Connection
    {
        return new PostgreeConnection();
    }

    public function createQueryBuilder(): QueryBuilder
    {
        return new PostgreeQueryBuilder();
    }
}

class DatabaseClient
{
    private $connection;
    private $queryBuilder;

    public function __construct(DatabaseFactory $factory)
    {
        $this->connection = $factory->createConnection();
        $this->queryBuilder = $factory->createQueryBuilder();
    }

    public function performQuery($table)
    {
        $connectionResult = $this->connection->connect();
        $query = $this->queryBuilder->buildSelectQuery($table);

        echo $connectionResult. PHP_EOL;
        echo "Executing Query" . $query . PHP_EOL;
    }
}


// Client Code
function clientCode(DatabaseFactory $factory)
{
    $dbClient = new DatabaseClient($factory);
    $dbClient->performQuery('users');
}

// Usage Example
echo "Using MySQL Factory:" . PHP_EOL;
$mysqlFactory = new MySqlFactory();
clientCode($mysqlFactory);

echo PHP_EOL;

echo "Using PostgreSQL Factory:" . PHP_EOL;
$postgreFactory = new PostgreeFactory();
clientCode($postgreFactory);