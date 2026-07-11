<?php
class Database {
    private $host     = "localhost";
    private $db_name  = "tienda_gm";
    private $username = "root";
    private $password = "";       // en XAMPP por defecto está vacío
    public  $conn;

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