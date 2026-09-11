<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

class NotificacionController {

    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    // ==================== CLIENTE ====================

    // GET /notificaciones/cliente/{id_cliente}
    public function listarPorCliente($id_cliente) {
        $stmt = $this->db->prepare("
            SELECT * FROM notificaciones
            WHERE id_cliente = ?
            ORDER BY fecha_creacion DESC
            LIMIT 30
        ");
        $stmt->execute([$id_cliente]);
        responder(200, "OK", $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // GET /notificaciones/cliente/{id_cliente}/no-leidas
    public function contarNoLeidas($id_cliente) {
        $stmt = $this->db->prepare("
            SELECT COUNT(*) as total FROM notificaciones
            WHERE id_cliente = ? AND leida = 0
        ");
        $stmt->execute([$id_cliente]);
        $fila = $stmt->fetch(PDO::FETCH_ASSOC);
        responder(200, "OK", ["total" => (int)$fila['total']]);
    }

    // PUT /notificaciones/{id}/leer
    public function marcarLeida($id, array $sesion) {
        $stmt = $this->db->prepare("SELECT id_cliente FROM notificaciones WHERE id_notificacion = ?");
        $stmt->execute([$id]);
        $notif = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$notif) responder(404, "Notificación no encontrada.");
        if ((int)$notif['id_cliente'] !== (int)$sesion['id_referencia']) {
            responder(403, "No autorizado.");
        }

        $this->db->prepare("UPDATE notificaciones SET leida = 1 WHERE id_notificacion = ?")
                 ->execute([$id]);
        responder(200, "Notificación marcada como leída.");
    }

    // PUT /notificaciones/cliente/{id_cliente}/leer-todas
    public function marcarTodasLeidas($id_cliente) {
        $this->db->prepare("UPDATE notificaciones SET leida = 1 WHERE id_cliente = ?")
                 ->execute([$id_cliente]);
        responder(200, "Todas las notificaciones marcadas como leídas.");
    }

    // Método interno reutilizable (llamado desde VentaController)
    public static function crear($db, $id_cliente, $id_venta, $titulo, $mensaje, $tipo = 'pedido') {
        if (!$id_cliente) return;
        $stmt = $db->prepare("
            INSERT INTO notificaciones (id_cliente, id_venta, titulo, mensaje, tipo)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$id_cliente, $id_venta, $titulo, $mensaje, $tipo]);
    }

    // ==================== ADMIN ====================

    // GET /notificaciones-admin
    public function listarAdmin() {
        $stmt = $this->db->query("
            SELECT * FROM notificaciones_admin
            ORDER BY fecha_creacion DESC
            LIMIT 30
        ");
        responder(200, "OK", $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // GET /notificaciones-admin/no-leidas
    public function contarNoLeidasAdmin() {
        $stmt = $this->db->query("
            SELECT COUNT(*) as total FROM notificaciones_admin WHERE leida = 0
        ");
        $fila = $stmt->fetch(PDO::FETCH_ASSOC);
        responder(200, "OK", ["total" => (int)$fila['total']]);
    }

    // PUT /notificaciones-admin/{id}/leer
    public function marcarLeidaAdmin($id) {
        $this->db->prepare("UPDATE notificaciones_admin SET leida = 1 WHERE id_notificacion = ?")
                 ->execute([$id]);
        responder(200, "Notificación marcada como leída.");
    }

    // PUT /notificaciones-admin/leer-todas
    public function marcarTodasLeidasAdmin() {
        $this->db->prepare("UPDATE notificaciones_admin SET leida = 1")->execute();
        responder(200, "Todas las notificaciones marcadas como leídas.");
    }

    // Método interno reutilizable (llamado desde VentaController)
    public static function crearAdmin($db, $id_venta, $titulo, $mensaje, $tipo = 'pedido') {
        $stmt = $db->prepare("
            INSERT INTO notificaciones_admin (id_venta, titulo, mensaje, tipo)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$id_venta, $titulo, $mensaje, $tipo]);
    }
}