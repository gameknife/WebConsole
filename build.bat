@echo off
setlocal enabledelayedexpansion
rem Builds the frontend, embeds it into the Go backend, and produces a single
rem self-contained backend\webconsole.exe that serves the API, static
rem ROM/cover/save assets and the SPA from one origin.
rem
rem Requires `npm` and `go` on PATH. Run from a terminal where Node is available
rem (e.g. fnm/nvm shell). Usage:  build.bat

set "ROOT=%~dp0"
set "EMBED=%ROOT%backend\internal\web\dist"

where npm >nul 2>nul || (echo [error] npm not found on PATH & goto :fail)
where go  >nul 2>nul || (echo [error] go not found on PATH  & goto :fail)

echo ==^> Building frontend
pushd "%ROOT%frontend" || goto :fail
if exist package-lock.json (
  call npm ci || (popd & goto :fail)
) else (
  call npm install || (popd & goto :fail)
)
call npm run build || (popd & goto :fail)
popd

echo ==^> Embedding frontend into backend
if exist "%EMBED%" rmdir /s /q "%EMBED%"
mkdir "%EMBED%" || goto :fail
xcopy "%ROOT%frontend\dist" "%EMBED%" /E /I /Y >nul || goto :fail
rem keep the embed dir tracked / non-empty for go:embed in dev checkouts
type nul > "%EMBED%\.gitkeep"

echo ==^> Building backend single binary
pushd "%ROOT%backend" || goto :fail
go build -o webconsole.exe ./cmd/webconsole || (popd & goto :fail)
popd

echo.
echo Done: backend\webconsole.exe
echo Run it:  cd backend ^&^& webconsole.exe   then open http://localhost:8080
exit /b 0

:fail
echo.
echo Build failed (errorlevel %errorlevel%).
exit /b 1
