<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

class ProveedorController {

    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    // GET /proveedores
    public function listar() {
        $stmt = $this->db->query("
            SELECT p.*, COUNT(pr.id_producto) as total_productos
            FROM proveedores p
            LEFT JOIN productos pr ON p.id_proveedor = pr.id_proveedor
            GROUP BY p.id_proveedor
            ORDER BY p.activo DESC, p.nombre ASC
        ");
        responder(200, "OK", $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // POST /proveedores
    public function crear() {
        $body = json_decode(file_get_contents("php://input"), true);

        if (empty($body['nombre'])) {
            responder(400, "El nombre es obligatorio.");
        }

        $stmt = $this->db->prepare("
            INSERT INTO proveedores (nombre, ruc, telefono, correo, direccion, activo)
            VALUES (?, ?, ?, ?, ?, 1)
        ");
        $stmt->execute([
            $body['nombre'],
            $body['ruc']       ?? null,
            $body['telefono']  ?? null,
            $body['correo']    ?? null,
            $body['direccion'] ?? null,
        ]);

        responder(201, "Proveedor creado.", ["id" => $this->db->lastInsertId()]);
    }

    // PUT /proveedores/{id}
    public function editar($id) {
        $body = json_decode(file_get_contents("php://input"), true);

        if (empty($body['nombre'])) {
            responder(400, "El nombre es obligatorio.");
        }

        $this->db->prepare("
            UPDATE proveedores SET
                nombre    = ?,
                ruc       = ?,
                telefono  = ?,
                correo    = ?,
                direccion = ?
            WHERE id_proveedor = ?
        ")->execute([
            $body['nombre'],
            $body['ruc']       ?? null,
            $body['telefono']  ?? null,
            $body['correo']    ?? null,
            $body['direccion'] ?? null,
            $id
        ]);

        responder(200, "Proveedor actualizado.");
    }

    // PUT /proveedores/{id}/activar — activar/desactivar
    public function toggleActivo($id) {
        $stmt = $this->db->prepare("SELECT activo FROM proveedores WHERE id_proveedor = ?");
        $stmt->execute([$id]);
        $proveedor = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$proveedor) responder(404, "Proveedor no encontrado.");

        $nuevo = $proveedor['activo'] ? 0 : 1;

        $this->db->prepare("UPDATE proveedores SET activo = ? WHERE id_proveedor = ?")
                 ->execute([$nuevo, $id]);

        $msg = $nuevo ? "Proveedor activado." : "Proveedor desactivado.";
        responder(200, $msg, ["activo" => $nuevo]);
    }

    // DELETE /proveedores/{id} — solo si no tiene ningún historial
    public function eliminar($id) {
        $stmt = $this->db->prepare("SELECT COUNT(*) as total FROM productos WHERE id_proveedor = ?");
        $stmt->execute([$id]);
        if ($stmt->fetch(PDO::FETCH_ASSOC)['total'] > 0) {
            responder(400, "No se puede eliminar, tiene productos asociados. Puedes desactivarlo en su lugar.");
        }

        $stmt = $this->db->prepare("SELECT COUNT(*) as total FROM compras WHERE id_proveedor = ?");
        $stmt->execute([$id]);
        if ($stmt->fetch(PDO::FETCH_ASSOC)['total'] > 0) {
            responder(400, "No se puede eliminar, tiene compras en el historial. Puedes desactivarlo en su lugar.");
        }

        $this->db->prepare("DELETE FROM proveedores WHERE id_proveedor = ?")
                 ->execute([$id]);

        responder(200, "Proveedor eliminado.");
    }
}