<?php
class Database {
    // En local (XAMPP) usa los valores por defecto de abajo. En producción,
    // definir las variables de entorno DB_HOST/DB_NAME/DB_USER/DB_PASSWORD
    // en vez de hardcodear credenciales reales aquí.
    private $host     = "";
    private $db_name  = "";
    private $username = "";
    private $password = "";
    public  $conn;

    public function __construct() {
        $this->host     = getenv('DB_HOST')     ?: 'localhost';
        $this->db_name  = getenv('DB_NAME')     ?: 'tienda_gm';
        $this->username = getenv('DB_USER')     ?: 'root';
        $this->password = getenv('DB_PASSWORD') ?: '';
    }

    public function getConnection() {
        $this->conn = null;
        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4",
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch (PDOException $e) {
            echo json_encode(["error" => "Conexión fallida: " . $e->getMessage()]);
        }
        return $this->conn;
    }
}