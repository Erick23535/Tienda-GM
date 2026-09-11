<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

class ProductoController {

    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function listar() {
    $stmt = $this->db->prepare("
        SELECT p.*, c.nombre AS categoria, v.nombre AS proveedor
        FROM productos p
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        LEFT JOIN proveedores v ON p.id_proveedor = v.id_proveedor
        ORDER BY p.id_producto DESC
    ");
    $stmt->execute();
    $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if ($productos) {
        $ids          = array_column($productos, 'id_producto');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        $stmtTallas = $this->db->prepare("
            SELECT id_producto, id_talla, talla, stock_actual
            FROM producto_tallas WHERE id_producto IN ($placeholders)
        ");
        $stmtTallas->execute($ids);

        $tallasPorProducto = [];
        foreach ($stmtTallas->fetchAll(PDO::FETCH_ASSOC) as $t) {
            $tallasPorProducto[$t['id_producto']][] = $t;
        }

        foreach ($productos as &$p) {
            $p['tallas'] = $tallasPorProducto[$p['id_producto']] ?? [];
        }
        unset($p);

        $stmtResenas = $this->db->prepare("
            SELECT id_producto, AVG(calificacion) AS promedio, COUNT(*) AS total
            FROM resenas_productos WHERE id_producto IN ($placeholders)
            GROUP BY id_producto
        ");
        $stmtResenas->execute($ids);

        $resenasPorProducto = [];
        foreach ($stmtResenas->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $resenasPorProducto[$r['id_producto']] = $r;
        }

        foreach ($productos as &$p) {
            $r = $resenasPorProducto[$p['id_producto']] ?? null;
            $p['calificacion_promedio'] = $r ? round((float)$r['promedio'], 1) : null;
            $p['total_resenas'] = $r ? (int)$r['total'] : 0;
        }
        unset($p);
    }

    responder(200, "OK", $productos);
}

   public function obtener($id) {
    $stmt = $this->db->prepare("
        SELECT p.*, c.nombre AS categoria, v.nombre AS proveedor
        FROM productos p
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        LEFT JOIN proveedores v ON p.id_proveedor = v.id_proveedor
        WHERE p.id_producto = ?
    ");
    $stmt->execute([$id]);
    $producto = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$producto) responder(404, "Producto no encontrado.");

    $stmt = $this->db->prepare("
        SELECT id_talla, talla, stock_actual FROM producto_tallas
        WHERE id_producto = ? ORDER BY talla ASC
    ");
    $stmt->execute([$id]);
    $producto['tallas'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $stmt = $this->db->prepare("
        SELECT AVG(calificacion) AS promedio, COUNT(*) AS total
        FROM resenas_productos WHERE id_producto = ?
    ");
    $stmt->execute([$id]);
    $r = $stmt->fetch(PDO::FETCH_ASSOC);
    $producto['calificacion_promedio'] = $r && $r['total'] > 0 ? round((float)$r['promedio'], 1) : null;
    $producto['total_resenas'] = $r ? (int)$r['total'] : 0;

    responder(200, "OK", $producto);
    }

    public function crear() {
        $body = json_decode(file_get_contents("php://input"), true);

        $campos = ['id_categoria','nombre','codigo','precio_compra','precio_venta','stock_actual'];
        foreach ($campos as $campo) {
            $valor = $body[$campo] ?? null;
            if (empty($valor) && $valor !== 0) {
                responder(400, "El campo '$campo' es obligatorio.");
            }
        }

        $stmt = $this->db->prepare("
            INSERT INTO productos 
                (id_categoria, id_proveedor, codigo, nombre, talla, color, marca,
                 imagen_url, precio_compra, precio_venta, precio_original, stock_actual, stock_minimo, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')
        ");
        $stmt->execute([
            $body['id_categoria'],
            $body['id_proveedor']  ?? null,
            $body['codigo'],
            $body['nombre'],
            $body['talla']         ?? null,
            $body['color']         ?? null,
            $body['marca']         ?? null,
            $body['imagen_url']    ?? null,
            $body['precio_compra'],
            $body['precio_venta'],
            $body['precio_original'] ?? null,
            $body['stock_actual'],
            $body['stock_minimo']  ?? 5,
        ]);

        $id = $this->db->lastInsertId();
        responder(201, "Producto creado correctamente.", ["id_producto" => $id]);
    }

    public function editar($id) {
        $body = json_decode(file_get_contents("php://input"), true);

        $stmt = $this->db->prepare("
            UPDATE productos SET
                id_categoria    = ?,
                id_proveedor    = ?,
                codigo          = ?,
                nombre          = ?,
                talla           = ?,
                color           = ?,
                marca           = ?,
                imagen_url      = ?,
                precio_compra   = ?,
                precio_venta    = ?,
                precio_original = ?,
                stock_actual    = ?,
                stock_minimo    = ?,
                estado          = ?
            WHERE id_producto = ?
        ");
        $stmt->execute([
            $body['id_categoria'],
            $body['id_proveedor']  ?? null,
            $body['codigo'],
            $body['nombre'],
            $body['talla']         ?? null,
            $body['color']         ?? null,
            $body['marca']         ?? null,
            $body['imagen_url']    ?? null,
            $body['precio_compra'],
            $body['precio_venta'],
            $body['precio_original'] ?? null,
            $body['stock_actual'],
            $body['stock_minimo']  ?? 5,
            $body['estado']        ?? 'activo',
            $id
        ]);

        responder(200, "Producto actualizado correctamente.");
    }

    public function eliminar($id) {
        $stmt = $this->db->prepare("
            SELECT COUNT(*) as total FROM detalle_ventas WHERE id_producto = ?
        ");
        $stmt->execute([$id]);
        $fila = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($fila['total'] > 0) {
            responder(400, "No se puede eliminar, el producto tiene ventas registradas.");
        }

        $this->db->prepare("DELETE FROM productos WHERE id_producto = ?")
                 ->execute([$id]);

        responder(200, "Producto eliminado correctamente.");
    }

    public function categorias() {
        $stmt = $this->db->query("SELECT * FROM categorias ORDER BY nombre");
        $categorias = $stmt->fetchAll(PDO::FETCH_ASSOC);
        responder(200, "OK", $categorias);
    }
}