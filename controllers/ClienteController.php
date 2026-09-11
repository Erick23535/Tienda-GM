<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

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

        $stmt = $this->db->prepare("SELECT id_cliente FROM clientes WHERE correo = ?");
        $stmt->execute([$correo]);
        if ($stmt->fetch()) {
            responder(409, "El correo ya está registrado.");
        }

        $hash = password_hash($contrasena, PASSWORD_BCRYPT);
        // Las respuestas de seguridad también se hashean: si la BD se filtra,
        // no quedan expuestas en texto plano.
        $hashRespuesta1 = password_hash(strtolower($respuesta1), PASSWORD_BCRYPT);
        $hashRespuesta2 = password_hash(strtolower($respuesta2), PASSWORD_BCRYPT);

        $stmt = $this->db->prepare("
            INSERT INTO clientes
                (nombres, apellidos, correo, contrasena_hash,
                 pregunta1, respuesta1, pregunta2, respuesta2,
                 activo, correo_verificado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
        ");
        $stmt->execute([
            $nombres, $apellidos, $correo, $hash,
            $pregunta1, $hashRespuesta1,
            $pregunta2, $hashRespuesta2
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

        $ip = $_SERVER['REMOTE_ADDR'];
        if (demasiadosIntentos($this->db, $correo, $ip)) {
            responder(429, "Demasiados intentos. Intenta de nuevo en unos minutos.");
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
            "id_cliente" => $cliente['id_cliente'],
            "token"      => $token,
            "nombres"    => $cliente['nombres'],
            "apellidos"  => $cliente['apellidos'],
            "correo"     => $cliente['correo']
        ]);
    }

    // POST /clientes/preguntas
    public function obtenerPreguntas() {
        $body   = json_decode(file_get_contents("php://input"), true);
        $correo = trim($body['correo'] ?? '');

        if (!$correo) responder(400, "El correo es obligatorio.");

        $ip = $_SERVER['REMOTE_ADDR'];
        if (demasiadosIntentos($this->db, $correo, $ip)) {
            responder(429, "Demasiados intentos. Intenta de nuevo en unos minutos.");
        }

        $stmt = $this->db->prepare("
            SELECT pregunta1, pregunta2
            FROM clientes
            WHERE correo = ? AND activo = 1
            LIMIT 1
        ");
        $stmt->execute([$correo]);
        $cliente = $stmt->fetch(PDO::FETCH_ASSOC);

        // Se registra como "intento" tanto si existe la cuenta como si no,
        // para frenar el barrido de correos (enumeración de usuarios).
        $this->db->prepare("
            INSERT INTO intentos_login (correo_intentado, ip, exitoso)
            VALUES (?, ?, ?)
        ")->execute([$correo, $ip, $cliente ? 1 : 0]);

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

        $ip = $_SERVER['REMOTE_ADDR'];
        if (demasiadosIntentos($this->db, $correo, $ip)) {
            responder(429, "Demasiados intentos. Intenta de nuevo en unos minutos.");
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

        $correcta1 = $this->coincideRespuesta($respuesta1, $cliente['respuesta1']);
        $correcta2 = $this->coincideRespuesta($respuesta2, $cliente['respuesta2']);

        $this->db->prepare("
            INSERT INTO intentos_login (correo_intentado, ip, exitoso)
            VALUES (?, ?, ?)
        ")->execute([$correo, $ip, ($correcta1 && $correcta2) ? 1 : 0]);

        if (!$correcta1 || !$correcta2) {
            responder(401, "Las respuestas no son correctas.");
        }

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

    // Compara una respuesta de seguridad con el valor guardado. Soporta
    // el hash bcrypt (registros nuevos) y, como respaldo, el texto plano
    // en minúsculas que usaban los registros creados antes de este cambio.
    private function coincideRespuesta(string $respuesta, ?string $guardada): bool {
        if ($guardada === null) return false;

        if (str_starts_with($guardada, '$2y$') || str_starts_with($guardada, '$2a$') || str_starts_with($guardada, '$2b$')) {
            return password_verify(strtolower($respuesta), $guardada);
        }

        return hash_equals($guardada, strtolower($respuesta));
    }
}