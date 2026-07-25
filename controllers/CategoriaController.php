<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

class CategoriaController {

    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function listar() {
        $stmt = $this->db->query("
            SELECT c.*, COUNT(p.id_producto) as total_productos
            FROM categorias c
            LEFT JOIN productos p ON c.id_categoria = p.id_categoria
            GROUP BY c.id_categoria
            ORDER BY c.nombre ASC
        ");
        responder(200, "OK", $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function crear() {
        $body = json_decode(file_get_contents("php://input"), true);

        if (empty($body['nombre'])) {
            responder(400, "El nombre es obligatorio.");
        }

        $stmt = $this->db->prepare("
            INSERT INTO categorias (nombre, descripcion, imagen_url) VALUES (?, ?, ?)
        ");
        $stmt->execute([
            $body['nombre'],
            $body['descripcion'] ?? null,
            $body['imagen_url']  ?? null
        ]);

        responder(201, "Categoría creada.", ["id" => $this->db->lastInsertId()]);
    }

    public function editar($id) {
        $body = json_decode(file_get_contents("php://input"), true);

        if (empty($body['nombre'])) {
            responder(400, "El nombre es obligatorio.");
        }

        $this->db->prepare("
            UPDATE categorias SET nombre = ?, descripcion = ?, imagen_url = ?
            WHERE id_categoria = ?
        ")->execute([
            $body['nombre'],
            $body['descripcion'] ?? null,
            $body['imagen_url']  ?? null,
            $id
        ]);

        responder(200, "Categoría actualizada.");
    }

    public function eliminar($id) {
        $stmt = $this->db->prepare("
            SELECT COUNT(*) as total FROM productos WHERE id_categoria = ?
        ");
        $stmt->execute([$id]);
        if ($stmt->fetch(PDO::FETCH_ASSOC)['total'] > 0) {
            responder(400, "No se puede eliminar, tiene productos asociados.");
        }

        $this->db->prepare("DELETE FROM categorias WHERE id_categoria = ?")
                 ->execute([$id]);

        responder(200, "Categoría eliminada.");
    }
}