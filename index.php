<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/ProductoController.php';
require_once __DIR__ . '/controllers/ClienteController.php';
require_once __DIR__ . '/controllers/ReporteController.php';
require_once __DIR__ . '/controllers/VentaController.php';

$uri    = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$partes = explode('/', str_replace('tienda-gm-api/', '', $uri));

$recurso = $partes[0] ?? '';
$accion  = $partes[1] ?? '';
$metodo  = $_SERVER['REQUEST_METHOD'];

// Rutas auth admin
if ($recurso === 'auth') {
    $controller = new AuthController();
    if ($accion === 'login'  && $metodo === 'POST') $controller->login();
    if ($accion === 'logout' && $metodo === 'POST') $controller->logout();
}

// Rutas productos
if ($recurso === 'productos') {
    $controller = new ProductoController();
    if ($accion === 'categorias' && $metodo === 'GET') $controller->categorias();
    if (!$accion && $metodo === 'GET')                  $controller->listar();
    if (!$accion && $metodo === 'POST')                 $controller->crear();
    if ($accion && is_numeric($accion)) {
        if ($metodo === 'GET')    $controller->obtener($accion);
        if ($metodo === 'PUT')    $controller->editar($accion);
        if ($metodo === 'DELETE') $controller->eliminar($accion);
    }
}

// Rutas clientes
if ($recurso === 'clientes') {
    $controller = new ClienteController();
    if ($accion === 'registro'             && $metodo === 'POST') $controller->registro();
    if ($accion === 'login'                && $metodo === 'POST') $controller->login();
    if ($accion === 'preguntas'            && $metodo === 'POST') $controller->obtenerPreguntas();
    if ($accion === 'verificar-respuestas' && $metodo === 'POST') $controller->verificarRespuestas();
    if ($accion === 'nueva-contrasena'     && $metodo === 'POST') $controller->nuevaContrasena();
}

// Rutas reportes
if ($recurso === 'reportes') {
    $controller = new ReporteController();
    if ($accion === 'resumen'       && $metodo === 'GET') $controller->resumen();
    if ($accion === 'ventas-dia'    && $metodo === 'GET') $controller->ventasDelDia();
    if ($accion === 'stock-bajo'    && $metodo === 'GET') $controller->stockBajo();
    if ($accion === 'mas-vendidos'  && $metodo === 'GET') $controller->masVendidos();
    if ($accion === 'ventas-semana' && $metodo === 'GET') $controller->ventasSemana();
}

// Rutas ventas
if ($recurso === 'ventas') {
    $controller = new VentaController();
    if (!$accion && $metodo === 'GET')  $controller->listar();
    if (!$accion && $metodo === 'POST') $controller->crear();
    if ($accion && is_numeric($accion)) {
        if ($metodo === 'GET') $controller->obtener($accion);
    }
    if (is_numeric($partes[1] ?? '') && ($partes[2] ?? '') === 'anular') {
        if ($metodo === 'PUT') $controller->anular($partes[1]);
    }
}

http_response_code(404);
echo json_encode(["mensaje" => "Ruta no encontrada."]);