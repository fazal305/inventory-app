<?php
session_start();
if (!isset($_SESSION["staff_id"])) {
    header("Location: ../login.php");
    exit;
}

require "../db.php";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $id = (int) $_POST["id"];

    $query = "DELETE FROM assets WHERE id = $id";
    if (mysqli_query($conn, $query)) {
        echo "<p style='color:green;'>Asset tracking item removed successfully.</p>";
    } else {
        echo "<p style='color:red;'>Error removing specified hardware record.</p>";
    }
}
?>

<!DOCTYPE html>
<html>

<head>
    <title>Delete Equipment</title>
</head>

<body>
    <h2>Remove Hardware Record</h2>
    <form action="delete.php" method="POST">
        <label>Asset ID Target: <input type="number" name="id" required></label><br><br>
        <button type="submit"
            onclick="return confirm('Are you sure you want to permanently delete this device?');">Delete Asset</button>
    </form>
    <br>
    <a href="../dashboard.php">Back to Dashboard</a>
</body>

</html>