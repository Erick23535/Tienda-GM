<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

class ConfiguracionController {

    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    // GET /configuracion
    public function obtener() {
        $stmt = $this->db->query("SELECT clave, valor FROM configuracion");
        $filas = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $config = [];
        foreach ($filas as $f) {
            $config[$f['clave']] = $f['valor'];
        }

        responder(200, "OK", $config);
    }

    // PUT /configuracion
    public function actualizar() {
        $body = json_decode(file_get_contents("php://input"), true);

        foreach ($body as $clave => $valor) {
            $stmt = $this->db->prepare("
                INSERT INTO configuracion (clave, valor) VALUES (?, ?)
                ON DUPLICATE KEY UPDATE valor = ?
            ");
            $stmt->execute([$clave, $valor, $valor]);
        }

        responder(200, "Configuración actualizada.");
    }
}