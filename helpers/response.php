<?php
function responder($status, $mensaje, $datos = null) {
    http_response_code($status);
    header('Content-Type: application/json');
    $respuesta = ["mensaje" => $mensaje];
    if ($datos !== null) $respuesta["datos"] = $datos;
    echo json_encode($respuesta);
    exit;
}