<?php
header('Content-Type: application/json');

// Lista blanca de orígenes permitidos. Agregar aquí el dominio de producción
// cuando exista (ej. 'https://tienda-gm.com').
$origenesPermitidos = [
    'http://localhost:8100',
    'http://localhost:4200',
    'capacitor://localhost',
];
$origen = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origen, $origenesPermitidos, true)) {
    header("Access-Control-Allow-Origin: $origen");
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/helpers/auth.php';
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
require_once __DIR__ . '/controllers/NotificacionController.php';
require_once __DIR__ . '/controllers/ProductoTallaController.php';
require_once __DIR__ . '/controllers/FavoritoController.php';
require_once __DIR__ . '/controllers/ResenaController.php';

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
    $subaccion  = $partes[2] ?? '';

    // Los GET son catálogo público (tienda); solo se protegen las escrituras.
    if ($metodo !== 'GET') autenticar(['usuario']);

    if ($accion === 'categorias' && $metodo === 'GET') $controller->categorias();
    if (!$accion && $metodo === 'GET')                  $controller->listar();
    if (!$accion && $metodo === 'POST')                 $controller->crear();

    if ($accion && is_numeric($accion) && $subaccion === 'tallas') {
        $tallaController = new ProductoTallaController();
        if ($metodo === 'GET') $tallaController->listar($accion);
        if ($metodo === 'PUT') $tallaController->guardar($accion);
    }

    if ($accion && is_numeric($accion) && !$subaccion) {
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

if ($recurso === 'ventas') {
    $controller = new VentaController();

    if ($accion === 'cliente' && is_numeric($partes[2] ?? '') && $metodo === 'GET') {
        // Historial de pedidos del propio cliente.
        $sesion = autenticar(['cliente']);
        verificarPropietario($sesion, $partes[2]);
        $controller->listarPorCliente($partes[2]);
    } elseif (!$accion && $metodo === 'POST') {
        // Crear venta: lo usa tanto el POS del admin como el checkout del cliente.
        $sesion = autenticar(['usuario', 'cliente']);
        $controller->crear($sesion);
    } elseif (is_numeric($partes[1] ?? '') && ($partes[2] ?? '') === 'confirmar-recepcion') {
        // El cliente confirma la recepción de su propio pedido.
        $sesion = autenticar(['cliente']);
        if ($metodo === 'PUT') $controller->confirmarRecepcion($partes[1], $sesion);
    } else {
        // Listar, obtener, anular y actualizar envío son de administración.
        autenticar(['usuario']);

        if (!$accion && $metodo === 'GET') $controller->listar();
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
}

if ($recurso === 'admin' && $accion === 'clientes') {
    autenticar(['usuario']);
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
    autenticar(['usuario']);
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
    autenticar(['usuario']);
    $controller = new CategoriaController();
    if (!$accion && $metodo === 'GET')  $controller->listar();
    if (!$accion && $metodo === 'POST') $controller->crear();
    if ($accion && is_numeric($accion)) {
        if ($metodo === 'PUT')    $controller->editar($accion);
        if ($metodo === 'DELETE') $controller->eliminar($accion);
    }
}

if ($recurso === 'perfil') {
    $sesion     = autenticar(['usuario']);
    $controller = new PerfilController();
    if (!$accion && $metodo === 'GET') $controller->obtener($sesion);
    if (!$accion && $metodo === 'PUT') $controller->actualizar($sesion);
    if ($accion === 'contrasena' && $metodo === 'PUT') $controller->cambiarContrasena($sesion);
}

if ($recurso === 'compras') {
    autenticar(['usuario']);
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
    // La lectura de configuración la necesita también la tienda pública
    // (ej. si el IVA está activo); solo la escritura requiere ser admin.
    if (!$accion && $metodo === 'GET') $controller->obtener();
    if (!$accion && $metodo === 'PUT') { autenticar(['usuario']); $controller->actualizar(); }
}

if ($recurso === 'notificaciones') {
    $controller = new NotificacionController();

    if ($accion === 'cliente' && is_numeric($partes[2] ?? '')) {
        $sesion = autenticar(['cliente']);
        verificarPropietario($sesion, $partes[2]);

        if (($partes[3] ?? '') === 'no-leidas' && $metodo === 'GET') {
            $controller->contarNoLeidas($partes[2]);
        }
        if (($partes[3] ?? '') === 'leer-todas' && $metodo === 'PUT') {
            $controller->marcarTodasLeidas($partes[2]);
        }
        if (!($partes[3] ?? '') && $metodo === 'GET') {
            $controller->listarPorCliente($partes[2]);
        }
    }
    if (is_numeric($accion) && ($partes[2] ?? '') === 'leer' && $metodo === 'PUT') {
        $sesion = autenticar(['cliente']);
        $controller->marcarLeida($accion, $sesion);
    }
}

if ($recurso === 'notificaciones-admin') {
    autenticar(['usuario']);
    $controller = new NotificacionController();

    if ($accion === 'no-leidas' && $metodo === 'GET') {
        $controller->contarNoLeidasAdmin();
    }
    if ($accion === 'leer-todas' && $metodo === 'PUT') {
        $controller->marcarTodasLeidasAdmin();
    }
    if (!$accion && $metodo === 'GET') {
        $controller->listarAdmin();
    }
    if (is_numeric($accion) && ($partes[2] ?? '') === 'leer' && $metodo === 'PUT') {
        $controller->marcarLeidaAdmin($accion);
    }
}

if ($recurso === 'reportes') {
    autenticar(['usuario']);
    $controller = new ReporteController();
    if ($accion === 'resumen'         && $metodo === 'GET') $controller->resumen();
    if ($accion === 'ventas-dia'      && $metodo === 'GET') $controller->ventasDelDia();
    if ($accion === 'stock-bajo'      && $metodo === 'GET') $controller->stockBajo();
    if ($accion === 'mas-vendidos'    && $metodo === 'GET') $controller->masVendidos();
    if ($accion === 'proveedores-top' && $metodo === 'GET') $controller->proveedoresTop();
    if ($accion === 'ventas-semana'   && $metodo === 'GET') $controller->ventasSemana();
    if ($accion === 'productos-vendidos' && $metodo === 'GET') $controller->productosVendidos();
}

if ($recurso === 'favoritos') {
    $controller = new FavoritoController();

    if ($accion === 'cliente' && is_numeric($partes[2] ?? '')) {
        $sesion = autenticar(['cliente']);
        verificarPropietario($sesion, $partes[2]);

        if (($partes[3] ?? '') === 'ids' && $metodo === 'GET') {
            $controller->listarIds($partes[2]);
        }
        if (!($partes[3] ?? '') && $metodo === 'GET') {
            $controller->listar($partes[2]);
        }
    }
    if (!$accion && $metodo === 'POST') {
        $sesion = autenticar(['cliente']);
        $controller->toggle($sesion['id_referencia']);
    }
}

if ($recurso === 'resenas') {
    $controller = new ResenaController();

    if ($accion === 'producto' && is_numeric($partes[2] ?? '') && $metodo === 'GET') {
        // Público: se puede ver reseñas navegando sin cuenta.
        $controller->porProducto($partes[2]);
    }
    if (!$accion && $metodo === 'POST') {
        $sesion = autenticar(['cliente']);
        $controller->guardar($sesion['id_referencia']);
    }
    if (is_numeric($accion) && $metodo === 'DELETE') {
        $sesion = autenticar(['cliente']);
        $controller->eliminar($accion, $sesion['id_referencia']);
    }
}

http_response_code(404);
echo json_encode(["mensaje" => "Ruta no encontrada."]);
