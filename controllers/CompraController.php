<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

class CompraController {

    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    // GET /compras — listar compras
    public function listar() {
        $limit  = min(200, max(1, (int)($_GET['limit']  ?? 50)));
        $offset = max(0, (int)($_GET['offset'] ?? 0));

        $stmt = $this->db->prepare("
            SELECT c.id_compra, c.fecha_compra, c.total, c.estado,
                   p.nombre as proveedor,
                   CONCAT(u.nombres, ' ', u.apellidos) as usuario,
                   GROUP_CONCAT(
                       CONCAT(pr.nombre, ' (x', dc.cantidad, ')')
                       SEPARATOR ', '
                   ) as productos_resumen
            FROM compras c
            LEFT JOIN proveedores p ON c.id_proveedor = p.id_proveedor
            LEFT JOIN usuarios u ON c.id_usuario = u.id_usuario
            LEFT JOIN detalle_compras dc ON dc.id_compra = c.id_compra
            LEFT JOIN productos pr ON pr.id_producto = dc.id_producto
            GROUP BY c.id_compra
            ORDER BY c.fecha_compra DESC
            LIMIT $limit OFFSET $offset
        ");
        $stmt->execute();
        responder(200, "OK", $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // GET /compras/{id} — detalle
    public function obtener($id) {
        $stmt = $this->db->prepare("
            SELECT c.*,
                   p.nombre as proveedor,
                   CONCAT(u.nombres, ' ', u.apellidos) as usuario
            FROM compras c
            LEFT JOIN proveedores p ON c.id_proveedor = p.id_proveedor
            LEFT JOIN usuarios u ON c.id_usuario = u.id_usuario
            WHERE c.id_compra = ?
        ");
        $stmt->execute([$id]);
        $compra = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$compra) responder(404, "Compra no encontrada.");

        $stmt = $this->db->prepare("
            SELECT dc.*, pr.nombre, pr.codigo, pr.talla, pr.color
            FROM detalle_compras dc
            JOIN productos pr ON dc.id_producto = pr.id_producto
            WHERE dc.id_compra = ?
        ");
        $stmt->execute([$id]);
        $compra['detalle'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        responder(200, "OK", $compra);
    }

    // POST /compras — registrar compra
    public function crear() {
        $body = json_decode(file_get_contents("php://input"), true);

        $id_proveedor = $body['id_proveedor'] ?? null;
        $id_usuario   = $body['id_usuario']   ?? null;
        $detalle      = $body['detalle']       ?? [];

        if (!$id_proveedor || !$id_usuario || empty($detalle)) {
            responder(400, "Proveedor, usuario y productos son obligatorios.");
        }

        $this->db->beginTransaction();

        try {
            $total = 0;

            // Calcular total
            foreach ($detalle as $item) {
                $total += $item['precio_unitario'] * $item['cantidad'];
            }

            // Insertar compra
            $stmt = $this->db->prepare("
                INSERT INTO compras (id_proveedor, id_usuario, total, estado)
                VALUES (?, ?, ?, 'recibida')
            ");
            $stmt->execute([$id_proveedor, $id_usuario, $total]);
            $id_compra = $this->db->lastInsertId();

            // Insertar detalle y aumentar stock
            foreach ($detalle as $item) {
                $subtotal = $item['precio_unitario'] * $item['cantidad'];
                $id_talla = $item['id_talla'] ?? null;

                $this->db->prepare("
                    INSERT INTO detalle_compras
                        (id_compra, id_producto, id_talla, cantidad, precio_unitario, subtotal)
                    VALUES (?, ?, ?, ?, ?, ?)
                ")->execute([
                    $id_compra,
                    $item['id_producto'],
                    $id_talla,
                    $item['cantidad'],
                    $item['precio_unitario'],
                    $subtotal
                ]);

                // Obtener stock actual (bloquea la fila mientras dura la transacción)
                $stmt = $this->db->prepare("
                    SELECT stock_actual FROM productos WHERE id_producto = ? FOR UPDATE
                ");
                $stmt->execute([$item['id_producto']]);
                $producto = $stmt->fetch(PDO::FETCH_ASSOC);

                $stock_anterior = $producto['stock_actual'];
                $stock_nuevo    = $stock_anterior + $item['cantidad'];

                // Actualizar stock general y precio de compra
                $this->db->prepare("
                    UPDATE productos SET
                        stock_actual  = ?,
                        precio_compra = ?
                    WHERE id_producto = ?
                ")->execute([$stock_nuevo, $item['precio_unitario'], $item['id_producto']]);

                // Si el producto maneja tallas, suma el stock también a la talla recibida
                if ($id_talla) {
                    $this->db->prepare("
                        UPDATE producto_tallas SET stock_actual = stock_actual + ? WHERE id_talla = ?
                    ")->execute([$item['cantidad'], $id_talla]);
                }

                // Registrar movimiento
                $this->db->prepare("
                    INSERT INTO movimientos_inventario
                        (id_producto, id_usuario, tipo_movimiento, cantidad,
                         stock_anterior, stock_nuevo, motivo)
                    VALUES (?, ?, 'entrada', ?, ?, ?, ?)
                ")->execute([
                    $item['id_producto'], $id_usuario,
                    $item['cantidad'], $stock_anterior, $stock_nuevo,
                    "Compra #$id_compra"
                ]);
            }

            $this->db->commit();
            responder(201, "Compra registrada correctamente.", [
                "id_compra" => $id_compra,
                "total"     => $total
            ]);

        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("CompraController - " . $e->getMessage());
            responder(500, "Ocurrió un error al procesar la solicitud.");
        }
    }

    // PUT /compras/{id}/anular
    public function anular($id) {
        $stmt = $this->db->prepare("
            SELECT * FROM compras WHERE id_compra = ? AND estado = 'recibida'
        ");
        $stmt->execute([$id]);
        $compra = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$compra) responder(404, "Compra no encontrada o ya anulada.");

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("
                SELECT * FROM detalle_compras WHERE id_compra = ?
            ");
            $stmt->execute([$id]);
            $detalle = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($detalle as $item) {
                $stmt = $this->db->prepare("
                    SELECT stock_actual FROM productos WHERE id_producto = ?
                ");
                $stmt->execute([$item['id_producto']]);
                $producto = $stmt->fetch(PDO::FETCH_ASSOC);

                $stock_anterior = $producto['stock_actual'];
                $stock_nuevo    = max(0, $stock_anterior - $item['cantidad']);

                $this->db->prepare("
                    UPDATE productos SET stock_actual = ? WHERE id_producto = ?
                ")->execute([$stock_nuevo, $item['id_producto']]);

                // Si la línea usó una talla específica, revertir también su stock.
                if (!empty($item['id_talla'])) {
                    $this->db->prepare("
                        UPDATE producto_tallas
                        SET stock_actual = GREATEST(0, stock_actual - ?)
                        WHERE id_talla = ?
                    ")->execute([$item['cantidad'], $item['id_talla']]);
                }

                $this->db->prepare("
                    INSERT INTO movimientos_inventario
                        (id_producto, id_usuario, tipo_movimiento, cantidad,
                         stock_anterior, stock_nuevo, motivo)
                    VALUES (?, ?, 'devolucion', ?, ?, ?, ?)
                ")->execute([
                    $item['id_producto'], $compra['id_usuario'],
                    $item['cantidad'], $stock_anterior, $stock_nuevo,
                    "Anulación compra #$id"
                ]);
            }

            $this->db->prepare("
                UPDATE compras SET estado = 'anulada' WHERE id_compra = ?
            ")->execute([$id]);

            $this->db->commit();
            responder(200, "Compra anulada y stock revertido.");

        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("CompraController - " . $e->getMessage());
            responder(500, "Ocurrió un error al procesar la solicitud.");
        }
    }

    // GET /compras/proveedores — para el select
    public function proveedores() {
        $stmt = $this->db->query("SELECT id_proveedor, nombre FROM proveedores ORDER BY nombre");
        responder(200, "OK", $stmt->fetchAll(PDO::FETCH_ASSOC));
    }
}