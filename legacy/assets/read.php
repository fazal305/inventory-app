<?php
session_start();
if (!isset($_SESSION["staff_id"])) {
    header("Location: ../login.php");
    exit;
}

require "../db.php";

$result = mysqli_query($conn, "SELECT * FROM assets");
?>

<!DOCTYPE html>
<html>

<head>
    <title>View Assets Inventory</title>
</head>

<body>
    <h2>Hardware & Office Equipment List</h2>
    <table border="1" cellpadding="5" cellspacing="0">
        <tr>
            <th>Asset ID</th>
            <th>Item Name</th>
            <th>Category</th>
            <th>Room Location</th>
        </tr>
        <?php while ($row = mysqli_fetch_assoc($result)) { ?>
            <tr>
                <td><?php echo $row["id"]; ?></td>
                <td><?php echo htmlspecialchars($row["item_name"]); ?></td>
                <td><?php echo htmlspecialchars($row["category"]); ?></td>
                <td><?php echo htmlspecialchars($row["room_number"]); ?></td>
            </tr>
        <?php } ?>
    </table>
    <br>
    <a href="../dashboard.php">Back to Dashboard</a>
</body>

</html>