<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

class ReporteController {

    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    // GET /reportes/resumen — tarjetas del dashboard
    public function resumen() {
        // Total ventas de hoy
        $stmt = $this->db->query("
            SELECT COUNT(*) as total_ventas, COALESCE(SUM(total), 0) as ingresos_hoy
            FROM ventas
            WHERE DATE(fecha_venta) = CURDATE()
            AND estado = 'completada'
        ");
        $hoy = $stmt->fetch(PDO::FETCH_ASSOC);

        // Ingresos del periodo: por defecto el mes en curso, o un rango
        // explícito si el admin filtra por fechas desde el dashboard.
        $desde = $_GET['desde'] ?? null;
        $hasta = $_GET['hasta'] ?? null;
        $fechaValida = fn($f) => is_string($f) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $f);

        if ($fechaValida($desde) && $fechaValida($hasta)) {
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as ventas_periodo, COALESCE(SUM(total), 0) as ingresos_mes
                FROM ventas
                WHERE DATE(fecha_venta) BETWEEN ? AND ?
                AND estado = 'completada'
            ");
            $stmt->execute([$desde, $hasta]);
            $rangoPersonalizado = true;
        } else {
            $stmt = $this->db->query("
                SELECT COUNT(*) as ventas_periodo, COALESCE(SUM(total), 0) as ingresos_mes
                FROM ventas
                WHERE MONTH(fecha_venta) = MONTH(NOW())
                AND YEAR(fecha_venta) = YEAR(NOW())
                AND estado = 'completada'
            ");
            $rangoPersonalizado = false;
        }
        $mes = $stmt->fetch(PDO::FETCH_ASSOC);

        // Total productos con stock bajo
        $stmt = $this->db->query("
            SELECT COUNT(*) as stock_bajo
            FROM productos
            WHERE stock_actual <= stock_minimo AND estado = 'activo'
        ");
        $stockBajo = $stmt->fetch(PDO::FETCH_ASSOC);

        // Total clientes registrados
        $stmt = $this->db->query("
            SELECT COUNT(*) as total_clientes FROM clientes WHERE activo = 1
        ");
        $clientes = $stmt->fetch(PDO::FETCH_ASSOC);

        responder(200, "OK", [
            "ventas_hoy"          => (int)$hoy['total_ventas'],
            "ingresos_hoy"        => (float)$hoy['ingresos_hoy'],
            "ingresos_mes"        => (float)$mes['ingresos_mes'],
            "ventas_periodo"      => (int)$mes['ventas_periodo'],
            "ingresos_rango_personalizado" => $rangoPersonalizado,
            "stock_bajo"          => (int)$stockBajo['stock_bajo'],
            "total_clientes"      => (int)$clientes['total_clientes']
        ]);
    }

    // GET /reportes/productos-vendidos — detalle por producto para el
    // reporte imprimible de ingresos (mismo rango que /reportes/resumen).
    public function productosVendidos() {
        $desde = $_GET['desde'] ?? null;
        $hasta = $_GET['hasta'] ?? null;
        $fechaValida = fn($f) => is_string($f) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $f);

        if ($fechaValida($desde) && $fechaValida($hasta)) {
            $condicionFecha = "DATE(v.fecha_venta) BETWEEN ? AND ?";
            $params = [$desde, $hasta];
        } else {
            $condicionFecha = "MONTH(v.fecha_venta) = MONTH(NOW()) AND YEAR(v.fecha_venta) = YEAR(NOW())";
            $params = [];
        }

        $stmt = $this->db->prepare("
            SELECT p.nombre, p.codigo, p.talla, p.color, p.marca,
                   SUM(dv.cantidad) as cantidad_vendida,
                   SUM(dv.subtotal) as ingresos
            FROM detalle_ventas dv
            JOIN ventas v ON v.id_venta = dv.id_venta
            JOIN productos p ON p.id_producto = dv.id_producto
            WHERE v.estado = 'completada'
            AND $condicionFecha
            GROUP BY dv.id_producto
            ORDER BY cantidad_vendida DESC
        ");
        $stmt->execute($params);
        responder(200, "OK", $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // GET /reportes/ventas-dia — ventas de hoy detalladas
    public function ventasDelDia() {
        $stmt = $this->db->query("
            SELECT v.id_venta, v.fecha_venta, v.total, v.metodo_pago, v.estado,
                   CONCAT(c.nombres, ' ', c.apellidos) as cliente,
                   CONCAT(u.nombres, ' ', u.apellidos) as vendedor
            FROM ventas v
            LEFT JOIN clientes c ON v.id_cliente = c.id_cliente
            LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
            WHERE DATE(v.fecha_venta) = CURDATE()
            ORDER BY v.fecha_venta DESC
        ");
        $ventas = $stmt->fetchAll(PDO::FETCH_ASSOC);
        responder(200, "OK", $ventas);
    }

    // GET /reportes/stock-bajo — productos con stock bajo
    public function stockBajo() {
        $stmt = $this->db->query("
            SELECT p.id_producto, p.codigo, p.nombre, p.talla, p.color,
                   p.stock_actual, p.stock_minimo, c.nombre as categoria
            FROM productos p
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
            WHERE p.stock_actual <= p.stock_minimo AND p.estado = 'activo'
            ORDER BY p.stock_actual ASC
        ");
        $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        responder(200, "OK", $productos);
    }

    // GET /reportes/mas-vendidos — top 10 productos más vendidos
    public function masVendidos() {
    $stmt = $this->db->query("
        SELECT 
            p.id_producto,
            p.codigo,
            p.nombre,
            p.talla,
            p.imagen_url,
            SUM(dv.cantidad) as total_vendido,
            SUM(dv.subtotal) as total_ingresos
        FROM detalle_ventas dv
        JOIN productos p ON dv.id_producto = p.id_producto
        JOIN ventas v ON dv.id_venta = v.id_venta
        WHERE v.estado = 'completada'
        GROUP BY p.id_producto
        ORDER BY total_vendido DESC
        LIMIT 10
    ");
    responder(200, "OK", $stmt->fetchAll(PDO::FETCH_ASSOC));
}

    // GET /reportes/proveedores-top
public function proveedoresTop() {
    $stmt = $this->db->query("
        SELECT 
            p.id_proveedor,
            p.nombre,
            p.ruc,
            COUNT(c.id_compra) as total_compras,
            SUM(c.total) as total_invertido
        FROM proveedores p
        JOIN compras c ON p.id_proveedor = c.id_proveedor
        WHERE c.estado = 'recibida'
        GROUP BY p.id_proveedor
        ORDER BY total_invertido DESC
        LIMIT 10
    ");
    responder(200, "OK", $stmt->fetchAll(PDO::FETCH_ASSOC));
}

    // GET /reportes/ventas-semana — ventas de los últimos 7 días
    public function ventasSemana() {
        $stmt = $this->db->query("
            SELECT DATE(fecha_venta) as fecha,
                   COUNT(*) as cantidad,
                   COALESCE(SUM(total), 0) as total
            FROM ventas
            WHERE fecha_venta >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            AND estado = 'completada'
            GROUP BY DATE(fecha_venta)
            ORDER BY fecha ASC
        ");
        $ventas = $stmt->fetchAll(PDO::FETCH_ASSOC);
        responder(200, "OK", $ventas);
    }
}