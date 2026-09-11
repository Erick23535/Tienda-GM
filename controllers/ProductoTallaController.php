<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

class ProductoTallaController {

    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    // GET /productos/{id}/tallas
    public function listar($id_producto) {
        $stmt = $this->db->prepare("
            SELECT * FROM producto_tallas
            WHERE id_producto = ?
            ORDER BY talla ASC
        ");
        $stmt->execute([$id_producto]);
        responder(200, "OK", $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // PUT /productos/{id}/tallas — reemplaza todas las tallas del producto
    public function guardar($id_producto) {
        $body = json_decode(file_get_contents("php://input"), true);
        $tallas = $body['tallas'] ?? [];

        $this->db->beginTransaction();
        try {
            // Borra las tallas actuales y vuelve a insertar (más simple que hacer diff)
            $this->db->prepare("DELETE FROM producto_tallas WHERE id_producto = ?")
                     ->execute([$id_producto]);

            $stockTotal = 0;
            foreach ($tallas as $t) {
                if (empty($t['talla'])) continue;
                $stock = (int)($t['stock_actual'] ?? 0);
                $stockTotal += $stock;

                $this->db->prepare("
                    INSERT INTO producto_tallas (id_producto, talla, stock_actual)
                    VALUES (?, ?, ?)
                ")->execute([$id_producto, $t['talla'], $stock]);
            }

            // Sincroniza el stock_actual general del producto con la suma de tallas
            $this->db->prepare("
                UPDATE productos SET stock_actual = ? WHERE id_producto = ?
            ")->execute([$stockTotal, $id_producto]);

            $this->db->commit();
            responder(200, "Tallas guardadas correctamente.");
        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("ProductoTallaController::guardar - " . $e->getMessage());
            responder(500, "Ocurrió un error al guardar las tallas.");
        }
    }
}