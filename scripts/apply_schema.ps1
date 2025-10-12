# PowerShell script to apply the SQL schema for TerraGenesis AI
# Prompts for MySQL root password and applies sql/land_management.sql
# Verifies tables after applying

param(
    [string]$SchemaFile = "sql/land_management.sql",
    [string]$Database = "terragenesis_ai"
)

Write-Host "Applying schema from $SchemaFile to database $Database using Node fallback..."

# Use MYSQL_ROOT_PASSWORD env var if present; otherwise prompt securely
if ($env:MYSQL_ROOT_PASSWORD) {
    $PlainPwd = $env:MYSQL_ROOT_PASSWORD
    $envWasSet = $true
} else {
    $secure = Read-Host -AsSecureString "Enter MySQL root password (input hidden)"
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $PlainPwd = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    $envWasSet = $false
}

# Export password for the Node-based applier to consume
$env:MYSQL_ROOT_PASSWORD = $PlainPwd

Write-Host "Running: node scripts/apply_schema_node.js"
& node scripts/apply_schema_node.js

# Clear env var if we set it inside this script
if (-not $envWasSet) { Remove-Item Env:MYSQL_ROOT_PASSWORD -ErrorAction SilentlyContinue }

Write-Host "Done."
