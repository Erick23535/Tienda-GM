<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

class VentaController {

    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function listar() {
        $stmt = $this->db->query("
            SELECT v.id_venta, v.fecha_venta, v.total, v.metodo_pago, v.estado, v.estado_envio,
                   v.comprobante_url, v.datos_tarjeta,
                   v.direccion_envio, v.ciudad_envio, v.telefono_contacto,
                   CONCAT(c.nombres, ' ', c.apellidos) as cliente,
                   CONCAT(u.nombres, ' ', u.apellidos) as vendedor
            FROM ventas v
            LEFT JOIN clientes c ON v.id_cliente = c.id_cliente
            LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
            ORDER BY v.fecha_venta DESC
            LIMIT 50
        ");
        responder(200, "OK", $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function obtener($id) {
        $stmt = $this->db->prepare("
            SELECT v.*,
                   CONCAT(c.nombres, ' ', c.apellidos) as cliente,
                   CONCAT(u.nombres, ' ', u.apellidos) as vendedor
            FROM ventas v
            LEFT JOIN clientes c ON v.id_cliente = c.id_cliente
            LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
            WHERE v.id_venta = ?
        ");
        $stmt->execute([$id]);
        $venta = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$venta) responder(404, "Venta no encontrada.");

        $stmt = $this->db->prepare("
            SELECT dv.*, p.nombre, p.codigo, p.talla, p.color
            FROM detalle_ventas dv
            JOIN productos p ON dv.id_producto = p.id_producto
            WHERE dv.id_venta = ?
        ");
        $stmt->execute([$id]);
        $venta['detalle'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        responder(200, "OK", $venta);
    }

    public function crear() {
        $body = json_decode(file_get_contents("php://input"), true);

        $id_usuario        = $body['id_usuario']        ?? null;
        $id_cliente        = $body['id_cliente']        ?? null;
        $metodo_pago       = $body['metodo_pago']       ?? 'efectivo';
        $descuento         = $body['descuento']          ?? 0;
        $observaciones     = $body['observaciones']      ?? '';
        $comprobante_url   = $body['comprobante_url']    ?? null;
        $datos_tarjeta     = $body['datos_tarjeta']      ?? null;
        $direccion_envio   = $body['direccion_envio']    ?? null;
        $ciudad_envio      = $body['ciudad_envio']       ?? null;
        $telefono_contacto = $body['telefono_contacto']  ?? null;
        $detalle           = $body['detalle']            ?? [];

        if (!$id_usuario || empty($detalle)) {
            responder(400, "Usuario y productos son obligatorios.");
        }

        if ($metodo_pago === 'transferencia' && empty($comprobante_url)) {
            responder(400, "Debes adjuntar el comprobante de transferencia.");
        }

        if ($metodo_pago === 'tarjeta' && empty($datos_tarjeta)) {
            responder(400, "Debes ingresar los datos de la tarjeta.");
        }

        $this->db->beginTransaction();

        try {
            $subtotal = 0;

            foreach ($detalle as $item) {
                $stmt = $this->db->prepare("
                    SELECT stock_actual, precio_venta, nombre
                    FROM productos WHERE id_producto = ? AND estado = 'activo'
                ");
                $stmt->execute([$item['id_producto']]);
                $producto = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$producto) {
                    $this->db->rollBack();
                    responder(404, "Producto ID {$item['id_producto']} no encontrado.");
                }

                if ($producto['stock_actual'] < $item['cantidad']) {
                    $this->db->rollBack();
                    responder(400, "Stock insuficiente para '{$producto['nombre']}'. Disponible: {$producto['stock_actual']}.");
                }

                $subtotal += $producto['precio_venta'] * $item['cantidad'];
            }

            $total = $subtotal - $descuento;
            if ($total < 0) $total = 0;

            $stmt = $this->db->prepare("
                INSERT INTO ventas 
                    (id_cliente, id_usuario, subtotal, descuento, total,
                     metodo_pago, estado, observaciones, comprobante_url, datos_tarjeta,
                     direccion_envio, ciudad_envio, telefono_contacto)
                VALUES (?, ?, ?, ?, ?, ?, 'completada', ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $id_cliente, $id_usuario, $subtotal,
                $descuento, $total, $metodo_pago,
                $observaciones, $comprobante_url, $datos_tarjeta,
                $direccion_envio, $ciudad_envio, $telefono_contacto
            ]);
            $id_venta = $this->db->lastInsertId();

            foreach ($detalle as $item) {
                $stmt = $this->db->prepare("
                    SELECT precio_venta, stock_actual FROM productos
                    WHERE id_producto = ?
                ");
                $stmt->execute([$item['id_producto']]);
                $producto = $stmt->fetch(PDO::FETCH_ASSOC);

                $precio    = $producto['precio_venta'];
                $subtotalI = $precio * $item['cantidad'];

                $this->db->prepare("
                    INSERT INTO detalle_ventas
                        (id_venta, id_producto, cantidad, precio_unitario, subtotal)
                    VALUES (?, ?, ?, ?, ?)
                ")->execute([
                    $id_venta, $item['id_producto'],
                    $item['cantidad'], $precio, $subtotalI
                ]);

                $stock_anterior = $producto['stock_actual'];
                $stock_nuevo    = $stock_anterior - $item['cantidad'];

                $this->db->prepare("
                    UPDATE productos SET stock_actual = ? WHERE id_producto = ?
                ")->execute([$stock_nuevo, $item['id_producto']]);

                $this->db->prepare("
                    INSERT INTO movimientos_inventario
                        (id_producto, id_usuario, tipo_movimiento, cantidad,
                         stock_anterior, stock_nuevo, motivo)
                    VALUES (?, ?, 'salida', ?, ?, ?, ?)
                ")->execute([
                    $item['id_producto'], $id_usuario,
                    $item['cantidad'], $stock_anterior, $stock_nuevo,
                    "Venta #$id_venta"
                ]);
            }

            $this->db->commit();
            responder(201, "Venta registrada correctamente.", [
                "id_venta" => $id_venta,
                "total"    => $total
            ]);

        } catch (Exception $e) {
            $this->db->rollBack();
            responder(500, "Error al registrar la venta: " . $e->getMessage());
        }
    }

    public function anular($id) {
        $stmt = $this->db->prepare("
            SELECT * FROM ventas WHERE id_venta = ? AND estado = 'completada'
        ");
        $stmt->execute([$id]);
        $venta = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$venta) responder(404, "Venta no encontrada o ya anulada.");

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("
                SELECT * FROM detalle_ventas WHERE id_venta = ?
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
                $stock_nuevo    = $stock_anterior + $item['cantidad'];

                $this->db->prepare("
                    UPDATE productos SET stock_actual = ? WHERE id_producto = ?
                ")->execute([$stock_nuevo, $item['id_producto']]);

                $this->db->prepare("
                    INSERT INTO movimientos_inventario
                        (id_producto, id_usuario, tipo_movimiento, cantidad,
                         stock_anterior, stock_nuevo, motivo)
                    VALUES (?, ?, 'devolucion', ?, ?, ?, ?)
                ")->execute([
                    $item['id_producto'], $venta['id_usuario'],
                    $item['cantidad'], $stock_anterior, $stock_nuevo,
                    "Anulación venta #$id"
                ]);
            }

            $this->db->prepare("
                UPDATE ventas SET estado = 'anulada' WHERE id_venta = ?
            ")->execute([$id]);

            $this->db->commit();
            responder(200, "Venta anulada y stock devuelto correctamente.");

        } catch (Exception $e) {
            $this->db->rollBack();
            responder(500, "Error al anular: " . $e->getMessage());
        }
    }

    public function actualizarEstadoEnvio($id) {
        $body = json_decode(file_get_contents("php://input"), true);
        $estado_envio = $body['estado_envio'] ?? '';

        if (!in_array($estado_envio, ['pendiente', 'despachado', 'entregado'])) {
            responder(400, "Estado de envío no válido.");
        }

        $stmt = $this->db->prepare("SELECT id_venta FROM ventas WHERE id_venta = ?");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) responder(404, "Venta no encontrada.");

        $this->db->prepare("UPDATE ventas SET estado_envio = ? WHERE id_venta = ?")
                 ->execute([$estado_envio, $id]);

        responder(200, "Estado de envío actualizado.");
    }

    public function listarPorCliente($id_cliente) {
        $stmt = $this->db->prepare("
            SELECT id_venta, fecha_venta, total, metodo_pago, estado, estado_envio,
                   direccion_envio, ciudad_envio
            FROM ventas
            WHERE id_cliente = ?
            ORDER BY fecha_venta DESC
        ");
        $stmt->execute([$id_cliente]);
        responder(200, "OK", $stmt->fetchAll(PDO::FETCH_ASSOC));
    }
}