$ErrorActionPreference = "SilentlyContinue"

$os = $null
$fixedDisks = @()
$serviceStatus = @()
$serviceConfig = @()
$startupEntries = @()
$scheduledTasks = @()
$diskInventoryAvailable = $false
$serviceStatusAvailable = $false
$serviceConfigAvailable = $false
$startupInventoryAvailable = $false
$scheduledTaskInventoryAvailable = $false

try { $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop } catch {}
try {
  $fixedDisks = @(Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" -ErrorAction Stop)
  $diskInventoryAvailable = $true
} catch {}
try {
  $serviceStatus = @(Get-Service -ErrorAction Stop)
  $serviceStatusAvailable = $true
} catch {}
try {
  $serviceConfig = @(Get-CimInstance Win32_Service -ErrorAction Stop)
  $serviceConfigAvailable = $true
} catch {}
try {
  $startupEntries = @(Get-CimInstance Win32_StartupCommand -ErrorAction Stop)
  $startupInventoryAvailable = $true
} catch {}
try {
  $scheduledTasks = @(Get-ScheduledTask -ErrorAction Stop)
  $scheduledTaskInventoryAvailable = $true
} catch {}

$disks = @(
  foreach ($disk in $fixedDisks) {
    $size = [double]$disk.Size
    $free = [double]$disk.FreeSpace
    $usedPercent = if ($size -gt 0) {
      [Math]::Round((($size - $free) / $size) * 100)
    } else {
      0
    }
    [ordered]@{ usedPercent = $usedPercent }
  }
)

$payload = [ordered]@{
  platform = "win32"
  generatedAt = [DateTime]::UtcNow.ToString("o")
  processorCount = [Environment]::ProcessorCount
  uptimeHours = [Math]::Round([Environment]::TickCount64 / 3600000, 1)
  memory = [ordered]@{
    totalBytes = [double]$os.TotalVisibleMemorySize * 1024
    freeBytes = [double]$os.FreePhysicalMemory * 1024
  }
  disks = $disks
  services = [ordered]@{
    total = $serviceStatus.Count
    running = @($serviceStatus | Where-Object Status -eq "Running").Count
    automatic = @($serviceConfig | Where-Object StartMode -eq "Auto").Count
    disabled = @($serviceConfig | Where-Object StartMode -eq "Disabled").Count
  }
  startupEntries = $startupEntries.Count
  scheduledTasks = [ordered]@{
    total = $scheduledTasks.Count
    running = @($scheduledTasks | Where-Object State -eq "Running").Count
    ready = @($scheduledTasks | Where-Object State -eq "Ready").Count
    disabled = @($scheduledTasks | Where-Object State -eq "Disabled").Count
  }
  availability = [ordered]@{
    disks = $diskInventoryAvailable
    services = $serviceStatusAvailable -and $serviceConfigAvailable
    startupEntries = $startupInventoryAvailable
    scheduledTasks = $scheduledTaskInventoryAvailable
  }
}

$payload | ConvertTo-Json -Depth 5 -Compress
