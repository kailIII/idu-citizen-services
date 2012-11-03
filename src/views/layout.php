<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='utf-8' />
    <title><?php echo $title ?></title>
    <script type='text/javascript' src='http://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js'></script>
    <script type='text/javascript' src='http://openlayers.org/api/2.12/OpenLayers.js'></script>
    <script type='text/javascript' src='js/underscore-min.js'></script>
    <script type='text/javascript' src='js/backbone-min.js'></script>
    <script type='text/javascript' src='js/bootstrap-min.js'></script>
    <script type='text/javascript' src='js/ocs-public-portal.js'></script>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="css/bootstrap-min.css" rel="stylesheet">
    <link href="css/bootstrap-responsive-min.css" rel="stylesheet">
    <link href="css/styles.css" rel="stylesheet">
</head>
<body>
    <div class="container-fluid">
        <h1><?php echo $title ?></h1>
        <?php if(isset($warning_message)): ?>
            <div class="alert">
                <button type="button" class="close" data-dismiss="alert">×</button>
                <strong>Atención!</strong> <?php echo $warning_message ?>
            </div>
        <?php endif ?>
        <?php if(isset($error_message)): ?>
            <div class="alert  alert-error">
                <button type="button" class="close" data-dismiss="alert">×</button>
                <strong>Error!</strong> <?php echo $error_message ?>
            </div>
        <?php endif ?>
        <?php if(isset($success_message)): ?>
            <div class="alert alert-success">
                <button type="button" class="close" data-dismiss="alert">×</button>
                <?php echo $success_message ?>
            </div>
        <?php endif ?>

        <div class="row-fluid">
            <?php echo $content_for_layout;?>
        </div>
    </div>
</body>
</html>