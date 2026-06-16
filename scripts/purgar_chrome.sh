#!/bin/bash

echo "=== Iniciando purga de memoria de Google Chrome ==="

# 1. Cerrar procesos de Chrome de forma forzada
if pgrep -x "chrome" > /dev/null || pgrep -f "Google Chrome" > /dev/null; then
    echo "Cerrando Google Chrome..."
    pkill -f "chrome" || pkill -f "Google Chrome"
    sleep 2
else
    echo "Chrome ya está cerrado."
fi

# 2. Detectar Sistema Operativo y borrar carpetas de caché
OS="$(uname)"
if [ "$OS" = "Linux" ]; then
    echo "Detectado sistema Linux. Eliminando caché..."
    rm -rf ~/.cache/google-chrome/*
    rm -rf ~/.config/google-chrome/Default/Cache/*
    rm -rf ~/.config/google-chrome/Default/GPUCache/*
    rm -rf ~/.config/google-chrome/Default/"Code Cache"/*
    
elif [ "$OS" = "Darwin" ]; then
    echo "Detectado sistema macOS. Eliminando caché..."
    rm -rf ~/Library/Caches/Google/Chrome/*
    rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Application\ Cache/*
    rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Cache/*
    rm -rf ~/Library/Application\ Support/Google/Chrome/Default/GPUCache/*
else
    echo "Sistema operativo no soportado por este script."
    exit 1
fi

# 3. Liberar memoria RAM del sistema (opcional - requiere privilegios sudo en Linux)
if [ "$OS" = "Linux" ] && [ "$EUID" -eq 0 ]; then
    echo "Liberando memoria caché del sistema (PageCache, dentries e inodes)..."
    sync && echo 3 > /proc/sys/vm/drop_caches
elif [ "$OS" = "Darwin" ]; then
    echo "Liberando memoria inactiva del sistema..."
    sudo purge
fi

echo "=== ¡Purga completada con éxito! ==="
