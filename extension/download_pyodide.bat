@echo off
echo Creating directories...
mkdir pyodide
mkdir pyodide\packages

echo Downloading Pyodide files...
curl -L "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js" -o "pyodide\pyodide.js"
curl -L "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.asm.js" -o "pyodide\pyodide.asm.js"
curl -L "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.asm.wasm" -o "pyodide\pyodide.asm.wasm"
curl -L "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.asm.data" -o "pyodide\pyodide.asm.data"

echo Downloading packages...
curl -L "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/packages/micropip.json" -o "pyodide\packages\micropip.json"

echo Done! 