<?php
session_start();
if (!isset($_SESSION["staff_id"])) {
    header("Location: ../login.php");
    exit;
}

require "../db.php";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $item_name = mysqli_real_escape_string($conn, $_POST["item_name"]);
    $category = mysqli_real_escape_string($conn, $_POST["category"]);
    $room_number = mysqli_real_escape_string($conn, $_POST["room_number"]);

    $query = "INSERT INTO assets (item_name, category, room_number) VALUES ('$item_name', '$category', '$room_number')";
    if (mysqli_query($conn, $query)) {
        echo "<p style='color:green;'>Item successfully added to inventory.</p>";
    } else {
        echo "<p style='color:red;'>Error adding asset.</p>";
    }
}
?>

<!DOCTYPE html>
<html>

<head>
    <title>Add New Asset</title>
</head>

<body>
    <h2>Add Asset Tracking Form</h2>
    <form action="create.php" method="POST">
        <label>Item Name: <input type="text" name="item_name" required></label><br><br>
        <label>Category: <input type="text" name="category" required></label><br><br>
        <label>Room Number: <input type="text" name="room_number" required></label><br><br>
        <button type="submit">Add Item</button>
    </form>
    <br>
    <a href="../dashboard.php">Back to Dashboard</a>
</body>

</html>