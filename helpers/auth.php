<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/response.php';

// Verifica el Bearer token contra la tabla `sesiones` y corta la ejecución
// (401) si no hay una sesión válida del tipo esperado.
function autenticar(array $tiposPermitidos = ['usuario']): array {
    $headers = getallheaders();
    $token   = str_replace('Bearer ', '', $headers['Authorization'] ?? '');

    if (!$token) {
        responder(401, "Token requerido.");
    }

    $db = (new Database())->getConnection();

    $placeholders = implode(',', array_fill(0, count($tiposPermitidos), '?'));
    $stmt = $db->prepare("
        SELECT tipo_usuario, id_referencia
        FROM sesiones
        WHERE token_sesion = ?
        AND tipo_usuario IN ($placeholders)
        AND expira_en > NOW()
        LIMIT 1
    ");
    $stmt->execute(array_merge([$token], $tiposPermitidos));
    $sesion = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$sesion) {
        responder(401, "Sesión inválida o expirada.");
    }

    return $sesion;
}

// Corta con 403 si la sesión (de tipo cliente) no es dueña del id solicitado.
function verificarPropietario(array $sesion, $idEsperado): void {
    if ($sesion['tipo_usuario'] === 'cliente' && (int)$sesion['id_referencia'] !== (int)$idEsperado) {
        responder(403, "No autorizado.");
    }
}

// true si hubo demasiados intentos fallidos recientes para ese correo+IP.
function demasiadosIntentos(PDO $db, string $correo, string $ip, int $ventanaMinutos = 15, int $maximo = 5): bool {
    $stmt = $db->prepare("
        SELECT COUNT(*) as total
        FROM intentos_login
        WHERE correo_intentado = ?
        AND ip = ?
        AND exitoso = 0
        AND fecha > (NOW() - INTERVAL ? MINUTE)
    ");
    $stmt->execute([$correo, $ip, $ventanaMinutos]);
    $fila = $stmt->fetch(PDO::FETCH_ASSOC);

    return $fila && (int)$fila['total'] >= $maximo;
}
