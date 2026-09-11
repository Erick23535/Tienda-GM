<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/NotificacionController.php';

class VentaController {

    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function listar() {
    $limit  = min(200, max(1, (int)($_GET['limit']  ?? 50)));
    $offset = max(0, (int)($_GET['offset'] ?? 0));

    $stmt = $this->db->prepare("
        SELECT v.id_venta, v.fecha_venta, v.total, v.subtotal, v.descuento, v.iva, v.metodo_pago, v.estado, v.estado_envio,
               v.confirmado_cliente, v.fecha_confirmacion,
               v.comprobante_url, v.datos_tarjeta,
               v.direccion_envio, v.ciudad_envio, v.telefono_contacto,
               v.cliente_nombre, v.cliente_cedula, v.cliente_telefono, v.cliente_direccion,
               CONCAT(c.nombres, ' ', c.apellidos) as cliente_registrado,
               c.correo as cliente_correo,
               CONCAT(u.nombres, ' ', u.apellidos) as vendedor,
               GROUP_CONCAT(
                   CONCAT(p.nombre, ' (x', dv.cantidad, ')')
                   SEPARATOR ', '
               ) as productos_resumen
        FROM ventas v
        LEFT JOIN clientes c ON v.id_cliente = c.id_cliente
        LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
        LEFT JOIN detalle_ventas dv ON dv.id_venta = v.id_venta
        LEFT JOIN productos p ON p.id_producto = dv.id_producto
        GROUP BY v.id_venta
        ORDER BY v.fecha_venta DESC
        LIMIT $limit OFFSET $offset
    ");
    $stmt->execute();
    responder(200, "OK", $stmt->fetchAll(PDO::FETCH_ASSOC));
}

    public function obtener($id) {
        $stmt = $this->db->prepare("
            SELECT v.*,
                   CONCAT(c.nombres, ' ', c.apellidos) as cliente_registrado,
                   c.correo as cliente_correo,
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

    public function crear(array $sesion) {
        $body = json_decode(file_get_contents("php://input"), true);

        // El usuario/cliente de la venta se toma de la sesión autenticada,
        // nunca del body, para que no se puedan falsear estos campos.
        if ($sesion['tipo_usuario'] === 'usuario') {
            $id_usuario = $sesion['id_referencia'];
            $id_cliente = $body['id_cliente'] ?? null;
        } else {
            $id_usuario = null;
            $id_cliente = $sesion['id_referencia'];
        }

        $metodo_pago       = $body['metodo_pago']       ?? 'efectivo';
        $descuento         = $body['descuento']          ?? 0;
        $observaciones     = $body['observaciones']      ?? '';
        $comprobante_url   = $body['comprobante_url']    ?? null;
        $datos_tarjeta     = $body['datos_tarjeta']      ?? null;
        $direccion_envio   = $body['direccion_envio']    ?? null;
        $ciudad_envio      = $body['ciudad_envio']       ?? null;
        $telefono_contacto = $body['telefono_contacto']  ?? null;
        $cliente_nombre    = $body['cliente_nombre']     ?? null;
        $cliente_cedula    = $body['cliente_cedula']     ?? null;
        $cliente_telefono  = $body['cliente_telefono']   ?? null;
        $cliente_direccion = $body['cliente_direccion']  ?? null;
        $detalle           = $body['detalle']            ?? [];

        if (empty($detalle)) {
            responder(400, "Los productos son obligatorios.");
        }

        $this->db->beginTransaction();

        try {
            $subtotal = 0;
            $lineas   = []; // datos ya resueltos de cada item, para no releer tras el insert

            foreach ($detalle as $item) {
                // SELECT ... FOR UPDATE bloquea la fila mientras dura la transacción,
                // para que dos ventas concurrentes no descuenten el mismo stock.
                $stmt = $this->db->prepare("
                    SELECT stock_actual, stock_minimo, precio_venta, nombre
                    FROM productos WHERE id_producto = ? AND estado = 'activo'
                    FOR UPDATE
                ");
                $stmt->execute([$item['id_producto']]);
                $producto = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$producto) {
                    $this->db->rollBack();
                    responder(404, "Producto ID {$item['id_producto']} no encontrado.");
                }

                $id_talla = $item['id_talla'] ?? null;
                $talla    = null;

                if ($id_talla) {
                    $stmtTalla = $this->db->prepare("
                        SELECT stock_actual FROM producto_tallas WHERE id_talla = ? FOR UPDATE
                    ");
                    $stmtTalla->execute([$id_talla]);
                    $talla = $stmtTalla->fetch(PDO::FETCH_ASSOC);

                    if (!$talla || $talla['stock_actual'] < $item['cantidad']) {
                        $this->db->rollBack();
                        responder(400, "Stock insuficiente en la talla seleccionada para '{$producto['nombre']}'.");
                    }
                } else {
                    if ($producto['stock_actual'] < $item['cantidad']) {
                        $this->db->rollBack();
                        responder(400, "Stock insuficiente para '{$producto['nombre']}'. Disponible: {$producto['stock_actual']}.");
                    }
                }

                $subtotal += $producto['precio_venta'] * $item['cantidad'];
                $lineas[]  = [
                    'id_producto'    => $item['id_producto'],
                    'nombre'         => $producto['nombre'],
                    'id_talla'       => $id_talla,
                    'cantidad'       => $item['cantidad'],
                    'precio_venta'   => $producto['precio_venta'],
                    'stock_anterior' => $producto['stock_actual'],
                    'stock_minimo'   => $producto['stock_minimo'],
                ];
            }

            $stmt = $this->db->prepare("SELECT valor FROM configuracion WHERE clave = 'iva_activo'");
            $stmt->execute();
            $configIva = $stmt->fetch(PDO::FETCH_ASSOC);
            $ivaActivo = $configIva ? $configIva['valor'] == '1' : true;

            $iva = $ivaActivo ? round(($subtotal - $descuento) * 0.15, 2) : 0;
            if ($iva < 0) $iva = 0;

            $total = $subtotal - $descuento + $iva;
            if ($total < 0) $total = 0;

            $stmt = $this->db->prepare("
    INSERT INTO ventas
        (id_cliente, id_usuario, subtotal, descuento, total, iva,
         metodo_pago, estado, observaciones, comprobante_url, datos_tarjeta,
         direccion_envio, ciudad_envio, telefono_contacto,
         cliente_nombre, cliente_cedula, cliente_telefono, cliente_direccion)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'completada', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
");
            $stmt->execute([
            $id_cliente, $id_usuario, $subtotal,
            $descuento, $total, $iva, $metodo_pago,
            $observaciones, $comprobante_url, $datos_tarjeta,
            $direccion_envio, $ciudad_envio, $telefono_contacto,
            $cliente_nombre, $cliente_cedula, $cliente_telefono, $cliente_direccion
            ]);
            $id_venta = $this->db->lastInsertId();

            $productosStockBajo = [];

            foreach ($lineas as $linea) {
                $subtotalI = $linea['precio_venta'] * $linea['cantidad'];

                $this->db->prepare("
                    INSERT INTO detalle_ventas
                        (id_venta, id_producto, id_talla, cantidad, precio_unitario, subtotal)
                    VALUES (?, ?, ?, ?, ?, ?)
                ")->execute([
                    $id_venta, $linea['id_producto'], $linea['id_talla'],
                    $linea['cantidad'], $linea['precio_venta'], $subtotalI
                ]);

                $stock_nuevo = $linea['stock_anterior'] - $linea['cantidad'];

                $this->db->prepare("
                    UPDATE productos SET stock_actual = ? WHERE id_producto = ?
                ")->execute([$stock_nuevo, $linea['id_producto']]);

                if ($linea['id_talla']) {
                    $this->db->prepare("
                        UPDATE producto_tallas SET stock_actual = stock_actual - ? WHERE id_talla = ?
                    ")->execute([$linea['cantidad'], $linea['id_talla']]);
                }

                $this->db->prepare("
                    INSERT INTO movimientos_inventario
                        (id_producto, id_usuario, tipo_movimiento, cantidad,
                         stock_anterior, stock_nuevo, motivo)
                    VALUES (?, ?, 'salida', ?, ?, ?, ?)
                ")->execute([
                    $linea['id_producto'], $id_usuario,
                    $linea['cantidad'], $linea['stock_anterior'], $stock_nuevo,
                    "Venta #$id_venta"
                ]);

                // Solo se notifica en el momento en que el stock CRUZA el mínimo
                // (no en cada venta posterior mientras siga bajo), para no saturar
                // al admin de notificaciones repetidas del mismo producto.
                if ($stock_nuevo <= $linea['stock_minimo'] && $linea['stock_anterior'] > $linea['stock_minimo']) {
                    $productosStockBajo[] = [
                        'nombre'      => $linea['nombre'],
                        'stock_nuevo' => $stock_nuevo,
                    ];
                }
            }

            $this->db->commit();

            NotificacionController::crear(
                $this->db, $id_cliente, $id_venta,
                "Pedido confirmado",
                "Tu pedido #$id_venta fue recibido y está siendo preparado.",
                "pedido"
            );

            NotificacionController::crearAdmin(
                $this->db, $id_venta,
                "Nuevo pedido recibido",
                "Se registró el pedido #$id_venta por $" . number_format($total, 2) . ".",
                "pedido"
            );

            foreach ($productosStockBajo as $p) {
                NotificacionController::crearAdmin(
                    $this->db, $id_venta,
                    "Stock bajo",
                    "'{$p['nombre']}' quedó con {$p['stock_nuevo']} unidades. Es momento de reabastecer.",
                    "stock_bajo"
                );
            }

            responder(201, "Venta registrada correctamente.", [
                "id_venta" => $id_venta,
                "total"    => $total
            ]);

        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("VentaController::crear - " . $e->getMessage());
            responder(500, "Ocurrió un error al registrar la venta.");
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

                // Si la línea usó una talla específica, devolver también su stock.
                if (!empty($item['id_talla'])) {
                    $this->db->prepare("
                        UPDATE producto_tallas
                        SET stock_actual = stock_actual + ?
                        WHERE id_talla = ?
                    ")->execute([$item['cantidad'], $item['id_talla']]);
                }

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
            error_log("VentaController::anular - " . $e->getMessage());
            responder(500, "Ocurrió un error al anular la venta.");
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

        $stmt = $this->db->prepare("SELECT id_cliente FROM ventas WHERE id_venta = ?");
        $stmt->execute([$id]);
        $venta = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($venta && $venta['id_cliente']) {
            $titulo  = $estado_envio === 'despachado' ? '¡Tu pedido va en camino!' : '¡Pedido entregado!';
            $mensaje = $estado_envio === 'despachado'
                ? "Tu pedido #$id fue despachado y pronto llegará a tu dirección."
                : "Tu pedido #$id ha sido entregado. ¡Gracias por tu compra!";

            NotificacionController::crear($this->db, $venta['id_cliente'], $id, $titulo, $mensaje, 'envio');
        }

        responder(200, "Estado de envío actualizado.");
    }

    public function confirmarRecepcion($id, array $sesion) {
        $stmt = $this->db->prepare("
            SELECT estado_envio, id_cliente FROM ventas WHERE id_venta = ?
        ");
        $stmt->execute([$id]);
        $venta = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$venta) responder(404, "Venta no encontrada.");

        if ((int)$venta['id_cliente'] !== (int)$sesion['id_referencia']) {
            responder(403, "No autorizado.");
        }

        if ($venta['estado_envio'] !== 'despachado' && $venta['estado_envio'] !== 'entregado') {
            responder(400, "Aún no puedes confirmar, tu pedido no ha sido despachado.");
        }

        $this->db->prepare("
            UPDATE ventas SET confirmado_cliente = 1, fecha_confirmacion = NOW()
            WHERE id_venta = ?
        ")->execute([$id]);

        NotificacionController::crearAdmin(
            $this->db, $id,
            "Cliente confirmó recepción",
            "El cliente confirmó que recibió el pedido #$id.",
            "confirmacion"
        );

        responder(200, "Recepción confirmada. ¡Gracias por tu compra!");
    }

    public function listarPorCliente($id_cliente) {
        $stmt = $this->db->prepare("
            SELECT id_venta, fecha_venta, total, metodo_pago, estado, estado_envio,
                   confirmado_cliente, fecha_confirmacion,
                   direccion_envio, ciudad_envio
            FROM ventas
            WHERE id_cliente = ?
            ORDER BY fecha_venta DESC
        ");
        $stmt->execute([$id_cliente]);
        responder(200, "OK", $stmt->fetchAll(PDO::FETCH_ASSOC));
    }
}