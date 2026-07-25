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
require_once __DIR__ . '/controllers/ClienteAdminController.php';
require_once __DIR__ . '/controllers/ProveedorController.php';
require_once __DIR__ . '/controllers/CategoriaController.php';
require_once __DIR__ . '/controllers/PerfilController.php';
require_once __DIR__ . '/controllers/CompraController.php';
require_once __DIR__ . '/controllers/ConfiguracionController.php';

$uri    = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$partes = explode('/', str_replace('tienda-gm-api/', '', $uri));

$recurso = $partes[0] ?? '';
$accion  = $partes[1] ?? '';
$metodo  = $_SERVER['REQUEST_METHOD'];

if ($recurso === 'auth') {
    $controller = new AuthController();
    if ($accion === 'login'  && $metodo === 'POST') $controller->login();
    if ($accion === 'logout' && $metodo === 'POST') $controller->logout();
}

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

if ($recurso === 'clientes') {
    $controller = new ClienteController();
    if ($accion === 'registro'             && $metodo === 'POST') $controller->registro();
    if ($accion === 'login'                && $metodo === 'POST') $controller->login();
    if ($accion === 'preguntas'            && $metodo === 'POST') $controller->obtenerPreguntas();
    if ($accion === 'verificar-respuestas' && $metodo === 'POST') $controller->verificarRespuestas();
    if ($accion === 'nueva-contrasena'     && $metodo === 'POST') $controller->nuevaContrasena();
}

if ($recurso === 'reportes') {
    $controller = new ReporteController();
    if ($accion === 'resumen'       && $metodo === 'GET') $controller->resumen();
    if ($accion === 'ventas-dia'    && $metodo === 'GET') $controller->ventasDelDia();
    if ($accion === 'stock-bajo'    && $metodo === 'GET') $controller->stockBajo();
    if ($accion === 'mas-vendidos'  && $metodo === 'GET') $controller->masVendidos();
    if ($accion === 'ventas-semana' && $metodo === 'GET') $controller->ventasSemana();
}

if ($recurso === 'ventas') {
    $controller = new VentaController();
    if ($accion === 'cliente' && is_numeric($partes[2] ?? '') && $metodo === 'GET') {
        $controller->listarPorCliente($partes[2]);
    }
    if (!$accion && $metodo === 'GET')  $controller->listar();
    if (!$accion && $metodo === 'POST') $controller->crear();
    if ($accion && is_numeric($accion) && !($partes[2] ?? '')) {
        if ($metodo === 'GET') $controller->obtener($accion);
    }
    if (is_numeric($partes[1] ?? '') && ($partes[2] ?? '') === 'anular') {
        if ($metodo === 'PUT') $controller->anular($partes[1]);
    }
    if (is_numeric($partes[1] ?? '') && ($partes[2] ?? '') === 'estado-envio') {
        if ($metodo === 'PUT') $controller->actualizarEstadoEnvio($partes[1]);
    }
}

if ($recurso === 'admin' && $accion === 'clientes') {
    $controller = new ClienteAdminController();
    $subaccion  = $partes[2] ?? '';
    $subid      = $partes[3] ?? '';

    if (!$subaccion && $metodo === 'GET')  $controller->listar();
    if ($subaccion === 'stats' && $metodo === 'GET') $controller->stats();
    if (is_numeric($subaccion) && $metodo === 'GET') $controller->obtener($subaccion);
    if (is_numeric($subaccion) && $subid === 'activar' && $metodo === 'PUT') $controller->toggleActivo($subaccion);
    if (is_numeric($subaccion) && $metodo === 'DELETE') $controller->eliminar($subaccion);
}

if ($recurso === 'proveedores') {
    $controller = new ProveedorController();
    $subaccion  = $partes[2] ?? '';

    if (!$accion && $metodo === 'GET')  $controller->listar();
    if (!$accion && $metodo === 'POST') $controller->crear();
    if ($accion && is_numeric($accion)) {
        if ($metodo === 'PUT' && !$subaccion)             $controller->editar($accion);
        if ($metodo === 'PUT' && $subaccion === 'activar') $controller->toggleActivo($accion);
        if ($metodo === 'DELETE')                          $controller->eliminar($accion);
    }
}

if ($recurso === 'categorias-admin') {
    $controller = new CategoriaController();
    if (!$accion && $metodo === 'GET')  $controller->listar();
    if (!$accion && $metodo === 'POST') $controller->crear();
    if ($accion && is_numeric($accion)) {
        if ($metodo === 'PUT')    $controller->editar($accion);
        if ($metodo === 'DELETE') $controller->eliminar($accion);
    }
}

if ($recurso === 'perfil') {
    $controller = new PerfilController();
    if (!$accion && $metodo === 'GET') $controller->obtener();
    if (!$accion && $metodo === 'PUT') $controller->actualizar();
    if ($accion === 'contrasena' && $metodo === 'PUT') $controller->cambiarContrasena();
}

if ($recurso === 'compras') {
    $controller = new CompraController();
    if (!$accion && $metodo === 'GET')  $controller->listar();
    if (!$accion && $metodo === 'POST') $controller->crear();
    if ($accion === 'proveedores' && $metodo === 'GET') $controller->proveedores();
    if ($accion && is_numeric($accion)) {
        if ($metodo === 'GET') $controller->obtener($accion);
    }
    if (is_numeric($partes[1] ?? '') && ($partes[2] ?? '') === 'anular') {
        if ($metodo === 'PUT') $controller->anular($partes[1]);
    }
}

if ($recurso === 'configuracion') {
    $controller = new ConfiguracionController();
    if (!$accion && $metodo === 'GET') $controller->obtener();
    if (!$accion && $metodo === 'PUT') $controller->actualizar();
}

http_response_code(404);
echo json_encode(["mensaje" => "Ruta no encontrada."]);