<?php
session_start();
if (!isset($_SESSION["staff_id"])) {
    header("Location: ../login.php");
    exit;
}

require "../db.php";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $id = (int) $_POST["id"];
    $room_number = mysqli_real_escape_string($conn, $_POST["room_number"]);

    $query = "UPDATE assets SET room_number = '$room_number' WHERE id = $id";
    if (mysqli_query($conn, $query)) {
        echo "<p style='color:green;'>Asset location successfully updated.</p>";
    } else {
        echo "<p style='color:red;'>Error updating record location.</p>";
    }
}
?>

<!DOCTYPE html>
<html>

<head>
    <title>Update Asset</title>
</head>

<body>
    <h2>Update Equipment Location </h2>
    <form action="update.php" method="POST">
        <label>Asset ID: <input type="number" name="id" required></label><br><br>
        <label>New Room Number: <input type="text" name="room_number" required></label><br><br>
        <button type="submit">Update Asset Location</button>
    </form>
    <br>
    <a href="../dashboard.php">Back to Dashboard</a>
</body>

</html>