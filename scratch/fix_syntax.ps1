$content = Get-Content src/routes/admin.js
$toDelete = @(18834, 18835, 18836, 18972, 18973, 18974, 19102, 19103, 19104, 19245, 19246, 19247)
$newContent = @()
for ($i = 0; $i -lt $content.Length; $i++) {
    if ($toDelete -contains $i) {
        continue
    }
    $newContent += $content[$i]
}
$newContent | Set-Content src/routes/admin.js
