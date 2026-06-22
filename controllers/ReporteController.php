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

        // Total ventas del mes
        $stmt = $this->db->query("
            SELECT COALESCE(SUM(total), 0) as ingresos_mes
            FROM ventas
            WHERE MONTH(fecha_venta) = MONTH(NOW())
            AND YEAR(fecha_venta) = YEAR(NOW())
            AND estado = 'completada'
        ");
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
            "ventas_hoy"     => (int)$hoy['total_ventas'],
            "ingresos_hoy"   => (float)$hoy['ingresos_hoy'],
            "ingresos_mes"   => (float)$mes['ingresos_mes'],
            "stock_bajo"     => (int)$stockBajo['stock_bajo'],
            "total_clientes" => (int)$clientes['total_clientes']
        ]);
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
            SELECT p.nombre, p.codigo, p.talla, p.color,
                   SUM(dv.cantidad) as total_vendido,
                   SUM(dv.subtotal) as total_ingresos
            FROM detalle_ventas dv
            JOIN productos p ON dv.id_producto = p.id_producto
            JOIN ventas v ON dv.id_venta = v.id_venta
            WHERE v.estado = 'completada'
            GROUP BY dv.id_producto
            ORDER BY total_vendido DESC
            LIMIT 10
        ");
        $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        responder(200, "OK", $productos);
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