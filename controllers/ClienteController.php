<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

class ClienteController {

    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    // POST /clientes/registro
    public function registro() {
        $body = json_decode(file_get_contents("php://input"), true);

        $nombres    = trim($body['nombres']    ?? '');
        $apellidos  = trim($body['apellidos']  ?? '');
        $correo     = trim($body['correo']     ?? '');
        $contrasena = trim($body['contrasena'] ?? '');
        $pregunta1  = trim($body['pregunta1']  ?? '');
        $respuesta1 = trim($body['respuesta1'] ?? '');
        $pregunta2  = trim($body['pregunta2']  ?? '');
        $respuesta2 = trim($body['respuesta2'] ?? '');

        if (!$nombres || !$apellidos || !$correo || !$contrasena ||
            !$pregunta1 || !$respuesta1 || !$pregunta2 || !$respuesta2) {
            responder(400, "Todos los campos son obligatorios.");
        }

        if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
            responder(400, "El correo no es válido.");
        }

        if (strlen($contrasena) < 6) {
            responder(400, "La contraseña debe tener mínimo 6 caracteres.");
        }

        // Verificar correo duplicado
        $stmt = $this->db->prepare("SELECT id_cliente FROM clientes WHERE correo = ?");
        $stmt->execute([$correo]);
        if ($stmt->fetch()) {
            responder(409, "El correo ya está registrado.");
        }

        // Guardar con respuestas en minúsculas para comparación flexible
        $hash = password_hash($contrasena, PASSWORD_BCRYPT);
        $stmt = $this->db->prepare("
            INSERT INTO clientes
                (nombres, apellidos, correo, contrasena_hash,
                 pregunta1, respuesta1, pregunta2, respuesta2,
                 activo, correo_verificado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
        ");
        $stmt->execute([
            $nombres, $apellidos, $correo, $hash,
            $pregunta1, strtolower($respuesta1),
            $pregunta2, strtolower($respuesta2)
        ]);

        responder(201, "Registro exitoso. Ya puedes iniciar sesión.");
    }

    // POST /clientes/login
    public function login() {
        $body       = json_decode(file_get_contents("php://input"), true);
        $correo     = trim($body['correo']     ?? '');
        $contrasena = trim($body['contrasena'] ?? '');

        if (!$correo || !$contrasena) {
            responder(400, "Correo y contraseña son obligatorios.");
        }

        // Verificar intentos fallidos
        $stmt = $this->db->prepare("
            SELECT COUNT(*) as intentos FROM intentos_login
            WHERE ip = ? AND exitoso = 0
            AND fecha > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
        ");
        $stmt->execute([$_SERVER['REMOTE_ADDR']]);
        if ($stmt->fetch(PDO::FETCH_ASSOC)['intentos'] >= 5) {
            responder(429, "Demasiados intentos. Espera 15 minutos.");
        }

        $stmt = $this->db->prepare("
            SELECT * FROM clientes WHERE correo = ? AND activo = 1 LIMIT 1
        ");
        $stmt->execute([$correo]);
        $cliente = $stmt->fetch(PDO::FETCH_ASSOC);

        $exitoso = $cliente && password_verify($contrasena, $cliente['contrasena_hash']);

        $this->db->prepare("
            INSERT INTO intentos_login (correo_intentado, ip, exitoso)
            VALUES (?, ?, ?)
        ")->execute([$correo, $_SERVER['REMOTE_ADDR'], $exitoso ? 1 : 0]);

        if (!$exitoso) {
            responder(401, "Correo o contraseña incorrectos.");
        }

        // Generar sesión
        $token  = bin2hex(random_bytes(32));
        $expira = date('Y-m-d H:i:s', strtotime('+8 hours'));

        $this->db->prepare("
            INSERT INTO sesiones
                (tipo_usuario, id_referencia, token_sesion, expira_en, ip, dispositivo)
            VALUES ('cliente', ?, ?, ?, ?, ?)
        ")->execute([
            $cliente['id_cliente'], $token, $expira,
            $_SERVER['REMOTE_ADDR'],
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]);

        responder(200, "Login exitoso.", [
            "token"     => $token,
            "nombres"   => $cliente['nombres'],
            "apellidos" => $cliente['apellidos'],
            "correo"    => $cliente['correo']
        ]);
    }

    // POST /clientes/preguntas — obtener preguntas por correo
    public function obtenerPreguntas() {
        $body   = json_decode(file_get_contents("php://input"), true);
        $correo = trim($body['correo'] ?? '');

        if (!$correo) responder(400, "El correo es obligatorio.");

        $stmt = $this->db->prepare("
            SELECT pregunta1, pregunta2
            FROM clientes
            WHERE correo = ? AND activo = 1
            LIMIT 1
        ");
        $stmt->execute([$correo]);
        $cliente = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$cliente) {
            responder(404, "No existe una cuenta con ese correo.");
        }

        responder(200, "OK", [
            "pregunta1" => $cliente['pregunta1'],
            "pregunta2" => $cliente['pregunta2']
        ]);
    }

    // POST /clientes/verificar-respuestas
    public function verificarRespuestas() {
        $body       = json_decode(file_get_contents("php://input"), true);
        $correo     = trim($body['correo']     ?? '');
        $respuesta1 = strtolower(trim($body['respuesta1'] ?? ''));
        $respuesta2 = strtolower(trim($body['respuesta2'] ?? ''));

        if (!$correo || !$respuesta1 || !$respuesta2) {
            responder(400, "Todos los campos son obligatorios.");
        }

        $stmt = $this->db->prepare("
            SELECT id_cliente, respuesta1, respuesta2
            FROM clientes
            WHERE correo = ? AND activo = 1
            LIMIT 1
        ");
        $stmt->execute([$correo]);
        $cliente = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$cliente) {
            responder(404, "No existe una cuenta con ese correo.");
        }

        if ($respuesta1 !== $cliente['respuesta1'] ||
            $respuesta2 !== $cliente['respuesta2']) {
            responder(401, "Las respuestas no son correctas.");
        }

        // Generar token temporal para cambiar contraseña (5 minutos)
        $token  = bin2hex(random_bytes(32));
        $expira = date('Y-m-d H:i:s', strtotime('+5 minutes'));

        $this->db->prepare("
            INSERT INTO tokens_recuperacion
                (tipo_usuario, id_referencia, token, correo, expira_en)
            VALUES ('cliente', ?, ?, ?, ?)
        ")->execute([$cliente['id_cliente'], $token, $correo, $expira]);

        responder(200, "Respuestas correctas.", ["token" => $token]);
    }

    // POST /clientes/nueva-contrasena
    public function nuevaContrasena() {
        $body       = json_decode(file_get_contents("php://input"), true);
        $token      = trim($body['token']      ?? '');
        $contrasena = trim($body['contrasena'] ?? '');

        if (!$token || !$contrasena) {
            responder(400, "Token y contraseña son obligatorios.");
        }

        if (strlen($contrasena) < 6) {
            responder(400, "La contraseña debe tener mínimo 6 caracteres.");
        }

        $stmt = $this->db->prepare("
            SELECT * FROM tokens_recuperacion
            WHERE token = ? AND usado = 0
            AND expira_en > NOW()
            AND tipo_usuario = 'cliente'
        ");
        $stmt->execute([$token]);
        $registro = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$registro) {
            responder(400, "El token no es válido o ya expiró.");
        }

        $hash = password_hash($contrasena, PASSWORD_BCRYPT);
        $this->db->prepare("
            UPDATE clientes SET contrasena_hash = ? WHERE id_cliente = ?
        ")->execute([$hash, $registro['id_referencia']]);

        $this->db->prepare("
            UPDATE tokens_recuperacion SET usado = 1 WHERE id_token = ?
        ")->execute([$registro['id_token']]);

        responder(200, "Contraseña actualizada correctamente.");
    }
}