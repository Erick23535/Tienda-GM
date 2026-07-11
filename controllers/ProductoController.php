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
        responder(200, "OK", $producto);
    }

    public function crear() {
        $body = json_decode(file_get_contents("php://input"), true);

        $campos = ['id_categoria','nombre','codigo','precio_compra','precio_venta','stock_actual'];
        foreach ($campos as $campo) {
            if (empty($body[$campo]) && $body[$campo] !== 0) {
                responder(400, "El campo '$campo' es obligatorio.");
            }
        }

        $stmt = $this->db->prepare("
            INSERT INTO productos 
                (id_categoria, id_proveedor, codigo, nombre, talla, color, marca,
                 imagen_url, precio_compra, precio_venta, stock_actual, stock_minimo, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')
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
                id_categoria  = ?,
                id_proveedor  = ?,
                codigo        = ?,
                nombre        = ?,
                talla         = ?,
                color         = ?,
                marca         = ?,
                imagen_url    = ?,
                precio_compra = ?,
                precio_venta  = ?,
                stock_actual  = ?,
                stock_minimo  = ?,
                estado        = ?
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