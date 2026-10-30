# Confirms the source-cell evidence cited in README.md without requiring Excel.
param([Parameter(Mandatory = $true)][string]$WorkbookDirectory)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$testDir = (Resolve-Path -LiteralPath $WorkbookDirectory).Path
$culture = [Globalization.CultureInfo]::InvariantCulture

function Read-ZipXml($archive, $entryName) {
    $entry = $archive.GetEntry($entryName)
    if ($null -eq $entry) { throw "Missing $entryName" }
    $reader = [IO.StreamReader]::new($entry.Open())
    try { return [xml]$reader.ReadToEnd() } finally { $reader.Dispose() }
}

function Open-SourceWorkbook($fileName) {
    $archive = [IO.Compression.ZipFile]::OpenRead((Join-Path $testDir $fileName))
    try {
        $book = Read-ZipXml $archive 'xl/workbook.xml'
        $shared = @()
        if ($archive.GetEntry('xl/sharedStrings.xml')) {
            $sharedXml = Read-ZipXml $archive 'xl/sharedStrings.xml'
            $shared = @($sharedXml.SelectNodes("//*[local-name()='si']") | ForEach-Object { $_.InnerText })
        }
        $sheetNames = @($book.SelectNodes("//*[local-name()='sheet']") | ForEach-Object { $_.GetAttribute('name') })
        return [pscustomobject]@{ Archive = $archive; Shared = $shared; SheetNames = $sheetNames }
    } catch { $archive.Dispose(); throw }
}

function Get-SourceSheet($source, $index, $expectedName) {
    if ($source.SheetNames[$index - 1] -ne $expectedName) {
        throw "Sheet $index changed: expected '$expectedName', found '$($source.SheetNames[$index - 1])'"
    }
    return Read-ZipXml $source.Archive "xl/worksheets/sheet$index.xml"
}

function Get-Cell($source, $sheet, $ref) {
    $cell = $sheet.SelectSingleNode("//*[local-name()='c' and @r='$ref']")
    if ($null -eq $cell) { return [pscustomobject]@{ Value = $null; Formula = $null } }
    $v = $cell.SelectSingleNode("./*[local-name()='v']")
    $inline = $cell.SelectSingleNode("./*[local-name()='is']")
    $formula = $cell.SelectSingleNode("./*[local-name()='f']")
    $value = if ($cell.GetAttribute('t') -eq 's' -and $v) { $source.Shared[[int]$v.InnerText] }
             elseif ($inline) { $inline.InnerText }
             elseif ($v) { $v.InnerText }
             else { $null }
    return [pscustomobject]@{ Value = $value; Formula = if ($formula) { $formula.InnerText } else { $null } }
}

function Assert-Number($source, $sheet, $ref, [double]$expected) {
    $cell = Get-Cell $source $sheet $ref
    if ($null -eq $cell.Value) { throw "$ref is blank; expected $expected" }
    $actual = [double]::Parse($cell.Value, $culture)
    if ([Math]::Abs($actual - $expected) -gt 0.0000001) { throw "$ref expected $expected, found $actual" }
}

$e26 = Open-SourceWorkbook 'TỔ VẬT LÝ - PCCM NH26-27.xlsx'
try {
    $s = Get-SourceSheet $e26 2 'Tổ VẬT LÝ NH 26-27'
    foreach ($check in @(
        @('F7',8),@('H7',13.2),@('J7',4),@('N7',17.2),
        @('H8',4),@('H10',5),@('H12',4.2),@('F64',2),@('G64',2),@('H64',4),
        @('U7',13),@('W7',20.2),@('Y7',4),@('AC7',24.2),
        @('U65',0),@('U71',1),@('U72',1),@('W71',3),@('W72',3),
        @('W65',6),@('Y65',4),@('AC65',10),
        @('H31',23.4),@('N31',23.4),@('S31',19),
        @('W39',29.2),@('AC39',29.2),@('AG39',19),
        @('H57',12),@('J57',4),@('L57',4),@('N57',20),@('S57',17),
        @('F10',4),@('G10',1.25),@('H10',5),@('F12',3),@('G12',1.4),@('H12',4.2)
    )) { Assert-Number $e26 $s $check[0] $check[1] }
    $u65 = Get-Cell $e26 $s 'U65'
    if ($u65.Formula -ne 'SUM(U66:U70)') { throw "U65 formula changed: $($u65.Formula)" }
    $d37 = Get-Cell $e26 $s 'D37'
    if ($d37.Value -ne 'CN') { throw 'D37 subject marker changed' }
    foreach ($check in @(
        @('E8','A3'),@('E10','A5; A6; A8; A9'),@('E12','A2; A3; A4'),
        @('E64','A1; A4'),@('T71','A3 (CHUYÊN ĐỀ)'),@('T72','TH (CHUYÊN ĐỀ)')
    )) {
        $cell = Get-Cell $e26 $s $check[0]
        if ($cell.Value -ne $check[1]) { throw "$($check[0]) expected '$($check[1])', found '$($cell.Value)'" }
    }
    $e79 = Get-Cell $e26 $s 'E79'
    if ($e79.Value -ne 'CHUYÊN ĐỀ A1 + A2') { throw 'E79 special-demand marker changed' }
    $classSheet = Get-SourceSheet $e26 1 'PCCM 2026 _ 2027'
    if (-not (Get-Cell $e26 $classSheet 'F5').Value) { throw 'Class sheet F5 unexpectedly blank' }
    Write-Output 'PASS E26: cited cells and stale U65 formula confirmed'
} finally { $e26.Archive.Dispose() }

$e25 = Open-SourceWorkbook 'PCCM 25-26 - TỔ VẬT LÝ - đã điều chỉnh hk2.xlsx'
try {
    $historical = Get-SourceSheet $e25 2 'tổ VẬT LÝ 24-25'
    if ((Get-Cell $e25 $historical 'E16').Value -ne 'NGHỈ THAI SẢN') { throw 'Historical leave note changed' }
    Assert-Number $e25 $historical 'F16' 0
    Assert-Number $e25 $historical 'H16' 0
    Write-Output 'PASS E25: historical leave evidence confirmed'
} finally { $e25.Archive.Dispose() }

$e26d = Open-SourceWorkbook 'DỰ KIẾN _PCCM 2026_2027 gui TTCM.xlsx'
try {
    $draft = Get-SourceSheet $e26d 1 'Tổ VẬT LÝ NH 26-27'
    Assert-Number $e26d $draft 'H7' 13.2
    Write-Output 'PASS E26D: draft-year source confirmed'
} finally { $e26d.Archive.Dispose() }
