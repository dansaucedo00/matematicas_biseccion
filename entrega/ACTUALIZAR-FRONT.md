# Actualizar el diseño de Intervalo en Windows

La paleta principal ahora es #3E4396, con blanco, texto oscuro y lavandas.

1. Si la aplicación está iniciada, detenela con Ctrl+C en la terminal.
2. Conservá una copia de tu carpeta C:\Proyectos\Intervalo\Intervalo antes de reemplazar archivos.
3. Descargá Intervalo-actualizacion-front.zip desde la carpeta entrega de la rama codex/intervalo-biseccion en GitHub (Download raw file).
4. Extraé el ZIP en una carpeta temporal. Dentro encontrarás src, public, dist e index.html.
5. Copiá ese contenido DENTRO de C:\Proyectos\Intervalo\Intervalo. Aceptá reemplazar los archivos con el mismo nombre. Copiá las carpetas combinando su contenido: no borres tu carpeta src, que contiene el resto del proyecto. No hace falta reemplazar node_modules ni los archivos de dependencias.
6. En VS Code, abrí la carpeta C:\Proyectos\Intervalo\Intervalo y una terminal nueva. Ejecutá npm run dev y abrí la dirección que indique Vite.
7. Si seguís viendo los colores anteriores, recargá con Ctrl+F5 y comprobá que abriste la carpeta correcta.

Los cuatro archivos de código actualizados son:

- src/style.css
- src/charts.ts
- public/favicon.svg
- index.html

También se incluye dist con la versión compilada actualizada. El algoritmo numérico no cambia. Si hiciste modificaciones propias en alguno de esos cuatro archivos, comparalos antes de reemplazarlos.

Comprobaciones realizadas: compilación TypeScript/Vite, 74 pruebas del motor y validaciones, seis pruebas de navegador sobre la versión compilada, incluyendo la vista móvil y reglas automáticas de accesibilidad de las cuatro secciones.
