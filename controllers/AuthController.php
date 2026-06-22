<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

class AuthController {

    private $db;

    public function __construct() {
        $database  = new Database();
        $this->db  = $database->getConnection();
    }

    // POST /auth/login
    public function login() {
        $body = json_decode(file_get_contents("php://input"), true);

        $correo     = trim($body['correo']     ?? '');
        $contrasena = trim($body['contrasena'] ?? '');

        if (!$correo || !$contrasena) {
            responder(400, "Correo y contraseña son obligatorios.");
        }

        // Buscar usuario
        $stmt = $this->db->prepare("
            SELECT * FROM usuarios
            WHERE correo = ? AND activo = 1
            LIMIT 1
        ");
        $stmt->execute([$correo]);
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

        $exitoso = $usuario && password_verify($contrasena, $usuario['contrasena_hash']);

        // Registrar intento
        $this->db->prepare("
            INSERT INTO intentos_login (correo_intentado, ip, exitoso)
            VALUES (?, ?, ?)
        ")->execute([$correo, $_SERVER['REMOTE_ADDR'], $exitoso ? 1 : 0]);

        if (!$exitoso) {
            responder(401, "Correo o contraseña incorrectos.");
        }

        // Generar token de sesión
        $token  = bin2hex(random_bytes(32));
        $expira = date('Y-m-d H:i:s', strtotime('+8 hours'));

        $this->db->prepare("
            INSERT INTO sesiones (tipo_usuario, id_referencia, token_sesion, expira_en, ip, dispositivo)
            VALUES ('usuario', ?, ?, ?, ?, ?)
        ")->execute([
            $usuario['id_usuario'], $token, $expira,
            $_SERVER['REMOTE_ADDR'],
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]);

        responder(200, "Login exitoso.", [
            "token"     => $token,
            "rol"       => $usuario['rol'],
            "nombres"   => $usuario['nombres'],
            "apellidos" => $usuario['apellidos']
        ]);
    }

    // POST /auth/logout
    public function logout() {
        $headers = getallheaders();
        $token   = str_replace('Bearer ', '', $headers['Authorization'] ?? '');

        if (!$token) responder(400, "Token requerido.");

        $this->db->prepare("DELETE FROM sesiones WHERE token_sesion = ?")
                 ->execute([$token]);

        responder(200, "Sesión cerrada.");
    }
}