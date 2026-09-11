<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

class FavoritoController {

    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    // GET /favoritos/cliente/{id_cliente}
    public function listar($id_cliente) {
        $stmt = $this->db->prepare("
            SELECT f.id_favorito, f.fecha_agregado, p.*
            FROM favoritos f
            JOIN productos p ON f.id_producto = p.id_producto
            WHERE f.id_cliente = ?
            ORDER BY f.fecha_agregado DESC
        ");
        $stmt->execute([$id_cliente]);
        responder(200, "OK", $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // GET /favoritos/cliente/{id_cliente}/ids — solo IDs, para marcar corazones en el catálogo
    public function listarIds($id_cliente) {
        $stmt = $this->db->prepare("
            SELECT id_producto FROM favoritos WHERE id_cliente = ?
        ");
        $stmt->execute([$id_cliente]);
        $filas = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $ids = array_map(fn($f) => (int)$f['id_producto'], $filas);
        responder(200, "OK", $ids);
    }

    // POST /favoritos — alterna (agrega si no existe, quita si existe)
    // $id_cliente viene de la sesión autenticada, no del body.
    public function toggle($id_cliente) {
        $body = json_decode(file_get_contents("php://input"), true);
        $id_producto = $body['id_producto'] ?? null;

        if (!$id_producto) {
            responder(400, "El producto es obligatorio.");
        }

        $stmt = $this->db->prepare("
            SELECT id_favorito FROM favoritos WHERE id_cliente = ? AND id_producto = ?
        ");
        $stmt->execute([$id_cliente, $id_producto]);
        $existe = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existe) {
            $this->db->prepare("DELETE FROM favoritos WHERE id_favorito = ?")
                     ->execute([$existe['id_favorito']]);
            responder(200, "Eliminado de favoritos.", ["favorito" => false]);
        } else {
            $this->db->prepare("
                INSERT INTO favoritos (id_cliente, id_producto) VALUES (?, ?)
            ")->execute([$id_cliente, $id_producto]);
            responder(200, "Agregado a favoritos.", ["favorito" => true]);
        }
    }
}