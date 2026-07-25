<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

class PerfilController {

    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    // GET /perfil — obtener datos del admin
    public function obtener() {
        $headers = getallheaders();
        $token   = str_replace('Bearer ', '', $headers['Authorization'] ?? '');

        if (!$token) responder(401, "Token requerido.");

        $stmt = $this->db->prepare("
            SELECT u.id_usuario, u.nombre_usuario, u.correo,
                   u.nombres, u.apellidos, u.rol, u.activo,
                   u.created_at,
                   COUNT(DISTINCT v.id_venta) as total_ventas,
                   COALESCE(SUM(v.total), 0) as total_procesado
            FROM usuarios u
            JOIN sesiones s ON s.id_referencia = u.id_usuario
                AND s.tipo_usuario = 'usuario'
                AND s.token_sesion = ?
                AND s.expira_en > NOW()
            LEFT JOIN ventas v ON v.id_usuario = u.id_usuario
                AND v.estado = 'completada'
            WHERE u.activo = 1
            GROUP BY u.id_usuario
        ");
        $stmt->execute([$token]);
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$usuario) responder(401, "Sesión inválida.");

        responder(200, "OK", $usuario);
    }

    // PUT /perfil — actualizar datos
    public function actualizar() {
        $headers = getallheaders();
        $token   = str_replace('Bearer ', '', $headers['Authorization'] ?? '');
        $body    = json_decode(file_get_contents("php://input"), true);

        if (!$token) responder(401, "Token requerido.");

        // Obtener usuario por token
        $stmt = $this->db->prepare("
            SELECT id_referencia FROM sesiones
            WHERE token_sesion = ? AND tipo_usuario = 'usuario' AND expira_en > NOW()
        ");
        $stmt->execute([$token]);
        $sesion = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$sesion) responder(401, "Sesión inválida.");

        $id = $sesion['id_referencia'];

        if (empty($body['nombres']) || empty($body['apellidos'])) {
            responder(400, "Nombres y apellidos son obligatorios.");
        }

        // Verificar correo único
        $stmt = $this->db->prepare("
            SELECT id_usuario FROM usuarios
            WHERE correo = ? AND id_usuario != ?
        ");
        $stmt->execute([$body['correo'], $id]);
        if ($stmt->fetch()) {
            responder(409, "El correo ya está en uso por otro usuario.");
        }

        $this->db->prepare("
            UPDATE usuarios SET
                nombres  = ?,
                apellidos = ?,
                correo   = ?
            WHERE id_usuario = ?
        ")->execute([
            $body['nombres'],
            $body['apellidos'],
            $body['correo'],
            $id
        ]);

        // Actualizar localStorage nombre
        $stmt = $this->db->prepare("
            SELECT nombres, apellidos FROM usuarios WHERE id_usuario = ?
        ");
        $stmt->execute([$id]);
        $u = $stmt->fetch(PDO::FETCH_ASSOC);

        responder(200, "Perfil actualizado correctamente.", [
            "nombres"   => $u['nombres'],
            "apellidos" => $u['apellidos']
        ]);
    }

    // PUT /perfil/contrasena — cambiar contraseña
    public function cambiarContrasena() {
        $headers = getallheaders();
        $token   = str_replace('Bearer ', '', $headers['Authorization'] ?? '');
        $body    = json_decode(file_get_contents("php://input"), true);

        if (!$token) responder(401, "Token requerido.");

        $stmt = $this->db->prepare("
            SELECT id_referencia FROM sesiones
            WHERE token_sesion = ? AND tipo_usuario = 'usuario' AND expira_en > NOW()
        ");
        $stmt->execute([$token]);
        $sesion = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$sesion) responder(401, "Sesión inválida.");

        $id            = $sesion['id_referencia'];
        $actual        = trim($body['contrasena_actual']  ?? '');
        $nueva         = trim($body['contrasena_nueva']   ?? '');
        $confirmar     = trim($body['confirmar']          ?? '');

        if (!$actual || !$nueva || !$confirmar) {
            responder(400, "Todos los campos son obligatorios.");
        }

        if (strlen($nueva) < 6) {
            responder(400, "La nueva contraseña debe tener mínimo 6 caracteres.");
        }

        if ($nueva !== $confirmar) {
            responder(400, "Las contraseñas nuevas no coinciden.");
        }

        // Verificar contraseña actual
        $stmt = $this->db->prepare("
            SELECT contrasena_hash FROM usuarios WHERE id_usuario = ?
        ");
        $stmt->execute([$id]);
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!password_verify($actual, $usuario['contrasena_hash'])) {
            responder(401, "La contraseña actual es incorrecta.");
        }

        $hash = password_hash($nueva, PASSWORD_BCRYPT);
        $this->db->prepare("
            UPDATE usuarios SET contrasena_hash = ? WHERE id_usuario = ?
        ")->execute([$hash, $id]);

        responder(200, "Contraseña actualizada correctamente.");
    }
}