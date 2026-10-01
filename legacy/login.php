<?php
require "db.php";
session_start();

$error = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $username = mysqli_real_escape_string($conn, $_POST["username"]);
    $password = mysqli_real_escape_string($conn, $_POST["password"]);

    $result = mysqli_query($conn, "SELECT * FROM staff WHERE username = '$username'");
    $staff = mysqli_fetch_assoc($result);

    if ($staff && $password === $staff["password"]) {
        $_SESSION["staff_id"] = $staff["id"];
        $_SESSION["username"] = $staff["username"];

        if (isset($_POST["remember_me"])) {
            setcookie("username", $staff["username"], time() + (5 * 24 * 60 * 60));
        }

        header("Location: dashboard.php");
        exit;
    } else {
        $error = "Invalid staff credentials";
    }
}
?>

<!DOCTYPE html>
<html>

<head>
    <title>Staff Login</title>
</head>

<body>
    <h2>Staff Login</h2>
    <?php if (!empty($error))
        echo "<p style='color:red;'>$error</p>"; ?>
    <form action="login.php" method="POST">
        <label>Username: <input type="text" name="username"
                value="<?php echo isset($_COOKIE['username']) ? htmlspecialchars($_COOKIE['username']) : ''; ?>"
                required></label><br><br>
        <label>Password: <input type="password" name="password" required></label><br><br>
        <label><input type="checkbox" name="remember_me"> Remember Me</label><br><br>
        <button type="submit">Login</button>
    </form>
</body>

</html>