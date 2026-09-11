<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

class ResenaController {

    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    // GET /resenas/producto/{id} — público: cualquiera puede leer las
    // reseñas de un producto, incluso navegando sin cuenta.
    public function porProducto($idProducto) {
        $stmt = $this->db->prepare("
            SELECT r.id_resena, r.calificacion, r.comentario, r.fecha_creacion,
                   r.id_cliente, CONCAT(c.nombres, ' ', c.apellidos) AS cliente_nombre
            FROM resenas_productos r
            JOIN clientes c ON c.id_cliente = r.id_cliente
            WHERE r.id_producto = ?
            ORDER BY r.fecha_creacion DESC
        ");
        $stmt->execute([$idProducto]);
        $resenas = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $total = count($resenas);
        $promedio = $total > 0
            ? round(array_sum(array_column($resenas, 'calificacion')) / $total, 1)
            : null;

        responder(200, "OK", [
            "promedio" => $promedio,
            "total"    => $total,
            "resenas"  => $resenas,
        ]);
    }

    // POST /resenas — crea o actualiza (si ya existe) la reseña del
    // cliente autenticado para ese producto. Un cliente = una reseña por
    // producto; volver a enviar la actualiza en vez de duplicarla.
    public function guardar($idCliente) {
        $body = json_decode(file_get_contents("php://input"), true);

        $idProducto   = $body['id_producto']   ?? null;
        $calificacion = $body['calificacion']  ?? null;
        $comentario   = trim($body['comentario'] ?? '');

        if (!$idProducto || !is_numeric($calificacion)) {
            responder(400, "Producto y calificación son obligatorios.");
        }
        $calificacion = (int)$calificacion;
        if ($calificacion < 1 || $calificacion > 5) {
            responder(400, "La calificación debe ser entre 1 y 5.");
        }
        if (mb_strlen($comentario) > 1000) {
            responder(400, "El comentario es demasiado largo.");
        }

        $stmt = $this->db->prepare("SELECT id_producto FROM productos WHERE id_producto = ?");
        $stmt->execute([$idProducto]);
        if (!$stmt->fetch()) responder(404, "Producto no encontrado.");

        $stmt = $this->db->prepare("
            INSERT INTO resenas_productos (id_producto, id_cliente, calificacion, comentario)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                calificacion = VALUES(calificacion),
                comentario = VALUES(comentario),
                fecha_actualizacion = NOW()
        ");
        $stmt->execute([$idProducto, $idCliente, $calificacion, $comentario ?: null]);

        responder(200, "Reseña guardada. ¡Gracias por tu opinión!");
    }

    // DELETE /resenas/{id} — el cliente borra su propia reseña.
    public function eliminar($idResena, $idCliente) {
        $stmt = $this->db->prepare("SELECT id_cliente FROM resenas_productos WHERE id_resena = ?");
        $stmt->execute([$idResena]);
        $resena = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$resena) responder(404, "Reseña no encontrada.");
        if ((int)$resena['id_cliente'] !== (int)$idCliente) {
            responder(403, "No puedes eliminar la reseña de otro cliente.");
        }

        $this->db->prepare("DELETE FROM resenas_productos WHERE id_resena = ?")->execute([$idResena]);
        responder(200, "Reseña eliminada.");
    }
}
