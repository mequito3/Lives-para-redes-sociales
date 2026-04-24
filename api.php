<?php
/**
 * Live Jukebox PHP API
 * Optimized for Hostinger Deployment
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Detección automática de entorno (Local vs Hostinger)
$is_local = ($_SERVER['REMOTE_ADDR'] == '127.0.0.1' || $_SERVER['REMOTE_ADDR'] == '::1' || strpos($_SERVER['HTTP_HOST'] ?? '', 'localhost') !== false);

if ($is_local) {
    $db_host = getenv('DB_HOST') ?: 'localhost';
    $db_user = getenv('DB_USER') ?: 'root';
    $db_pass = getenv('DB_PASSWORD') ?: '';
    $db_name = getenv('DB_NAME') ?: 'livejukebox';
} else {
    $db_host = getenv('DB_HOST') ?: '127.0.0.1';
    $db_user = getenv('DB_USER') ?: 'u636084353_lives';
    $db_pass = getenv('DB_PASSWORD') ?: 'livesRedes123';
    $db_name = getenv('DB_NAME') ?: 'u636084353_lives';
}

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database connection failed", "error" => $e->getMessage()]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
// Robust path detection
$path = isset($_SERVER['PATH_INFO']) ? $_SERVER['PATH_INFO'] : '';
if (empty($path)) {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    // Find where /api/ starts in the URI
    $api_pos = strpos($uri, '/api/');
    if ($api_pos !== false) {
        $path = substr($uri, $api_pos);
    }
}
if (empty($path)) {
    $path = isset($_GET['url']) ? '/' . $_GET['url'] : '/';
}

// Router
if ($path == '/api/songs') {
    if ($method == 'GET') {
        getSongs($pdo);
    } elseif ($method == 'POST') {
        addSong($pdo);
    }
} elseif (preg_match('/^\/api\/songs\/(\d+)$/', $path, $matches)) {
    $id = $matches[1];
    if ($method == 'PUT') {
        updateSong($pdo, $id);
    } elseif ($method == 'DELETE') {
        deleteSong($pdo, $id);
    }
} elseif ($path == '/api/status') {
    if ($method == 'GET') {
        getStatus($pdo);
    } elseif ($method == 'PUT') {
        updateStatus($pdo);
    }
} else {
    // If running as a catch-all for a specific file, check action query param
    $action = isset($_GET['action']) ? $_GET['action'] : '';
    
    switch ($action) {
        case 'get_songs': getSongs($pdo); break;
        case 'add_song': addSong($pdo); break;
        case 'update_song': updateSong($pdo, $_GET['id']); break;
        case 'delete_song': deleteSong($pdo, $_GET['id']); break;
        case 'get_status': getStatus($pdo); break;
        case 'update_status': updateStatus($pdo); break;
        default:
            http_response_code(404);
            echo json_encode(["status" => "error", "message" => "Endpoint not found: " . $path]);
            break;
    }
}

// Functions

function getSongs($pdo) {
    $stmt = $pdo->prepare("SELECT id, usuario, youtube_id, titulo, miniatura, reproducida, duracion, votos, votos_usuarios as votosUsuarios, created_at as createdAt FROM song_requests WHERE reproducida = 0 ORDER BY votos DESC, created_at ASC");
    $stmt->execute();
    $songs = $stmt->fetchAll();
    
    // Parse JSON strings to objects
    foreach ($songs as &$song) {
        $song['reproducida'] = (bool)$song['reproducida'];
        $song['id'] = (int)$song['id'];
        $song['votos'] = (int)$song['votos'];
        $song['duracion'] = (int)$song['duracion'];
        $votos = json_decode($song['votosUsuarios'], true);
        $song['votosUsuarios'] = is_array($votos) ? $votos : [];
    }
    
    echo json_encode($songs);
}

function addSong($pdo) {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!$data) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "No data provided"]);
        return;
    }
    
    $stmt = $pdo->prepare("INSERT INTO song_requests (usuario, youtube_id, titulo, miniatura, reproducida, duracion, votos, votos_usuarios) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $data['usuario'],
        $data['youtube_id'],
        $data['titulo'],
        $data['miniatura'],
        isset($data['reproducida']) ? ($data['reproducida'] ? 1 : 0) : 0,
        isset($data['duracion']) ? (int)$data['duracion'] : 240,
        isset($data['votos']) ? (int)$data['votos'] : 0,
        isset($data['votosUsuarios']) ? json_encode($data['votosUsuarios']) : '[]'
    ]);
    
    echo json_encode(["id" => $pdo->lastInsertId()]);
}

function updateSong($pdo, $id) {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!$data) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "No data provided"]);
        return;
    }
    
    $fields = [];
    $values = [];
    
    if (isset($data['votos'])) {
        $fields[] = "votos = ?";
        $values[] = (int)$data['votos'];
    }
    if (isset($data['votosUsuarios'])) {
        $fields[] = "votos_usuarios = ?";
        $values[] = json_encode($data['votosUsuarios']);
    }
    if (isset($data['reproducida'])) {
        $fields[] = "reproducida = ?";
        $values[] = $data['reproducida'] ? 1 : 0;
    }
    
    if (empty($fields)) {
        echo json_encode(["success" => true, "message" => "No updates requested"]);
        return;
    }
    
    $values[] = (int)$id;
    $stmt = $pdo->prepare("UPDATE song_requests SET " . implode(", ", $fields) . " WHERE id = ?");
    $stmt->execute($values);
    
    echo json_encode(["success" => true]);
}

function deleteSong($pdo, $id) {
    $stmt = $pdo->prepare("DELETE FROM song_requests WHERE id = ?");
    $stmt->execute([(int)$id]);
    echo json_encode(["success" => true]);
}

function getStatus($pdo) {
    $stmt = $pdo->prepare("SELECT is_live as isLive FROM streamer_status WHERE id = 1");
    $stmt->execute();
    $status = $stmt->fetch();
    
    if (!$status) {
        echo json_encode(["isLive" => true]);
    } else {
        $status['isLive'] = (bool)$status['isLive'];
        echo json_encode($status);
    }
}

function updateStatus($pdo) {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['isLive'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "isLive parameter required"]);
        return;
    }
    
    $isLive = $data['isLive'] ? 1 : 0;
    $stmt = $pdo->prepare("UPDATE streamer_status SET is_live = ? WHERE id = 1");
    $stmt->execute([$isLive]);
    
    echo json_encode(["success" => true]);
}
