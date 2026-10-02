<?php
session_start();

if (!isset($_SESSION["staff_id"])) {
    header("Location: login.php");
    exit;
}
?>
<!DOCTYPE html>
<html>

<head>
    <title>IT Inventory Dashboard</title>
</head>

<body>
    <p>Welcome, <?php echo htmlspecialchars($_SESSION["username"]); ?>!</p>

    <h3>Navigation</h3>
    <ul>
        <li><a href="assets/create.php">Add New Asset</a></li>
        <li><a href="assets/read.php">View Asset Inventory</a></li>
        <li><a href="assets/update.php">Update Asset Location</a></li>
        <li><a href="assets/delete.php">Remove Asset Record</a></li>
    </ul>

    <p><a href="logout.php">Logout</a></p>
</body>

</html>