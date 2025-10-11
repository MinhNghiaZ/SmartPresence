# PowerShell script to create PWA icons from favicon.ico using .NET

Write-Host "Creating PWA icons from favicon.ico..." -ForegroundColor Green
Write-Host ""

$icoPath = "public/favicon.ico"
$output192 = "public/pwa-192x192.png"
$output512 = "public/pwa-512x512.png"

# Check if favicon.ico exists
if (-not (Test-Path $icoPath)) {
    Write-Host "Error: favicon.ico not found in public/ folder" -ForegroundColor Red
    exit 1
}

try {
    # Load System.Drawing assembly
    Add-Type -AssemblyName System.Drawing
    
    Write-Host "Loading favicon.ico..." -ForegroundColor Cyan
    
    # Load the ICO file
    $icon = [System.Drawing.Icon]::new($icoPath)
    
    # Convert icon to bitmap
    $bitmap = $icon.ToBitmap()
    
    Write-Host "Loaded: $($bitmap.Width)x$($bitmap.Height) pixels" -ForegroundColor Green
    Write-Host ""
    
    # Function to resize and save
    function Resize-And-Save {
        param($sourceBitmap, $targetSize, $outputPath)
        
        Write-Host "Creating ${targetSize}x${targetSize} icon..." -ForegroundColor Cyan
        
        # Create new bitmap with target size
        $resized = New-Object System.Drawing.Bitmap($targetSize, $targetSize)
        $graphics = [System.Drawing.Graphics]::FromImage($resized)
        
        # Set high quality rendering
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        
        # Draw the resized image
        $graphics.DrawImage($sourceBitmap, 0, 0, $targetSize, $targetSize)
        
        # Save as PNG
        $resized.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        # Cleanup
        $graphics.Dispose()
        $resized.Dispose()
        
        Write-Host "Saved: $outputPath" -ForegroundColor Green
    }
    
    # Create 192x192 icon
    Resize-And-Save -sourceBitmap $bitmap -targetSize 192 -outputPath $output192
    
    # Create 512x512 icon
    Resize-And-Save -sourceBitmap $bitmap -targetSize 512 -outputPath $output512
    
    # Cleanup
    $bitmap.Dispose()
    $icon.Dispose()
    
    Write-Host ""
    Write-Host "Success! PWA icons created:" -ForegroundColor Green
    Write-Host "  - $output192 (192x192)" -ForegroundColor Yellow
    Write-Host "  - $output512 (512x512)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Run: npm run build"
    Write-Host "2. Run: npm run preview"
    Write-Host "3. Open Chrome DevTools -> Application -> Manifest"
    Write-Host "4. Deploy to production and test on Android!"
    
} catch {
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Use Logo_EIU.png instead (better quality)" -ForegroundColor Yellow
    Write-Host "Or use online tool: https://realfavicongenerator.net/" -ForegroundColor Yellow
}
