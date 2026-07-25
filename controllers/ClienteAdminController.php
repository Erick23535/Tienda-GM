<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

class ClienteAdminController {

    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    // GET /admin/clientes — listar todos
    public function listar() {
        $busqueda = $_GET['busqueda'] ?? '';

        $sql = "
            SELECT id_cliente, nombres, apellidos, correo,
                   telefono, fecha_registro, activo, correo_verificado
            FROM clientes
        ";

        if ($busqueda) {
            $sql .= " WHERE nombres LIKE :b OR apellidos LIKE :b2
                      OR correo LIKE :b3 OR cedula LIKE :b4";
        }

        $sql .= " ORDER BY fecha_registro DESC";

        $stmt = $this->db->prepare($sql);

        if ($busqueda) {
            $like = "%$busqueda%";
            $stmt->bindValue(':b',  $like);
            $stmt->bindValue(':b2', $like);
            $stmt->bindValue(':b3', $like);
            $stmt->bindValue(':b4', $like);
        }

        $stmt->execute();
        $clientes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        responder(200, "OK", $clientes);
    }

    // GET /admin/clientes/{id} — ver detalle
    public function obtener($id) {
        $stmt = $this->db->prepare("
            SELECT c.*,
                   COUNT(DISTINCT v.id_venta) as total_compras,
                   COALESCE(SUM(v.total), 0) as total_gastado
            FROM clientes c
            LEFT JOIN ventas v ON c.id_cliente = v.id_cliente
                AND v.estado = 'completada'
            WHERE c.id_cliente = ?
            GROUP BY c.id_cliente
        ");
        $stmt->execute([$id]);
        $cliente = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$cliente) responder(404, "Cliente no encontrado.");
        responder(200, "OK", $cliente);
    }

    // PUT /admin/clientes/{id}/activar — activar/desactivar
    public function toggleActivo($id) {
        $stmt = $this->db->prepare("
            SELECT activo FROM clientes WHERE id_cliente = ?
        ");
        $stmt->execute([$id]);
        $cliente = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$cliente) responder(404, "Cliente no encontrado.");

        $nuevo = $cliente['activo'] ? 0 : 1;

        $this->db->prepare("
            UPDATE clientes SET activo = ? WHERE id_cliente = ?
        ")->execute([$nuevo, $id]);

        $msg = $nuevo ? "Cliente activado." : "Cliente desactivado.";
        responder(200, $msg, ["activo" => $nuevo]);
    }

    // DELETE /admin/clientes/{id} — eliminar
    public function eliminar($id) {
        $stmt = $this->db->prepare("
            SELECT COUNT(*) as total FROM ventas WHERE id_cliente = ?
        ");
        $stmt->execute([$id]);
        $fila = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($fila['total'] > 0) {
            responder(400, "No se puede eliminar, el cliente tiene ventas registradas.");
        }

        $this->db->prepare("DELETE FROM clientes WHERE id_cliente = ?")
                 ->execute([$id]);

        responder(200, "Cliente eliminado correctamente.");
    }

    // GET /admin/clientes/stats — estadísticas generales
    public function stats() {
        $stmt = $this->db->query("
            SELECT
                COUNT(*) as total,
                SUM(activo = 1) as activos,
                SUM(activo = 0) as inactivos,
                SUM(correo_verificado = 1) as verificados
            FROM clientes
        ");
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);
        responder(200, "OK", $stats);
    }
}