param([string]$Fixture,[string]$OutputDirectory,[string]$JavaHome)
& (Join-Path (Split-Path -Parent $PSScriptRoot) 'tass-comparison\Run-Algorithm.ps1') -Algorithm GENETIC -Fixture $Fixture -OutputDirectory $OutputDirectory -JavaHome $JavaHome
