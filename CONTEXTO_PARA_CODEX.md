# Continuidad del proyecto Intervalo

Este documento resume los acuerdos y el estado del trabajo realizado en una conversación de Codex en la nube. No es una transcripción completa y no sustituye los nuevos pedidos del usuario. Su objetivo es facilitar que Codex local continúe sobre los archivos reales de la computadora.

## Objetivo y etapa actual

- Proyecto grupal de Matemática IV – Cálculo Numérico.
- Método asignado: **bisección** para raíces de ecuaciones no lineales.
- Meta: cubrir los criterios de excelencia de la consigna y comprender cada parte para la defensa. No prometer una calificación.
- Prioridad acordada: terminar y probar la aplicación primero; después preparar informe técnico PDF, presentación y defensa.
- El usuario quiere que los cambios se realicen directamente en su carpeta de Windows, sin descargar ni extraer ZIP en cada modificación.
- Carpeta local indicada: `C:\Proyectos\Intervalo\Intervalo`.
- Antes de editar, comprobar la carpeta abierta, su contenido y las instrucciones locales aplicables. No asumir que esta copia está sincronizada con GitHub ni que contiene metadatos Git: pudo descargarse como ZIP.
- Preservar cualquier cambio local del usuario. No sustituir todo el proyecto por la versión remota sin comparar.

## Repositorio y trabajo en la nube

- Repositorio: `https://github.com/dansaucedo00/matematicas_biseccion`.
- Rama publicada con la aplicación: `codex/intervalo-biseccion`.
- `main` conserva el commit inicial con el README. La aplicación no fue fusionada con main.
- Commit de implementación: `69043e0`.
- Commit del rediseño solicitado: `fbf9202`.
- La copia usada en la nube está en `/workspace/matematicas_biseccion`; no es la carpeta Windows del usuario.
- El usuario autorizó publicar la aplicación y el ZIP en la rama nueva mencionada. Una sesión local debe consultar los pedidos actuales antes de nuevas operaciones remotas que amplíen ese alcance.
- Enlaces de artefactos internos del chat no funcionaron para el usuario. GitHub fue la vía de entrega alternativa.

## Preferencia de diseño más reciente

El usuario rechazó el diseño verde inicial y pidió que todo el frente use **#3E4396**, blanco, negro o colores compatibles.

El rediseño ya realizado usa:

- Principal: `#3E4396`.
- Principal oscuro: `#303477`.
- Fondo lavanda: `#EEEFFB`.
- Violeta de apoyo: `#7148A0`.
- Texto oscuro: `#181A2F`.
- Blanco para superficies y contraste.
- Menú lateral índigo oscuro, botones y selección en el principal, tarjetas con bordes suaves, tipografía de interfaz sans serif y gráficos con la misma paleta.

Los colores están centralizados en los tokens al comienzo de `src/style.css`. Los SVG de los gráficos usan clases CSS. También se actualizó `public/favicon.svg` y el theme-color de `index.html`.

La aplicación local puede seguir mostrando el diseño inicial si el usuario aún no aplicó la actualización. Verificar los archivos reales antes de afirmar que ya ve la versión índigo.

## Tecnologías y ejecución

- TypeScript, HTML y CSS; sin React ni backend de cálculo.
- Vite para desarrollo y compilación.
- mathjs **solo** para analizar y evaluar expresiones matemáticas; no resuelve raíces.
- SVG para gráficos locales.
- Vitest para el motor y validaciones.
- Playwright y axe para flujos y reglas automáticas de accesibilidad.
- Node compatible según `package.json`: 22.12+ de la rama 22, o 24+. En la nube se probó Node 24.19 y npm 11.9.
- `npm ci`: instalación reproducible. Ejecutar desde la carpeta que contiene **package.json y package-lock.json**. El usuario recibió EUSAGE al instalar; la orientación fue comprobar que la terminal no estuviera en la carpeta superior o en la rama inicial.
- `npm run dev`: desarrollo con recarga automática. Usar la dirección que muestre Vite.
- `npm run build`: TypeScript y generación de dist.
- `npm run preview`: servir la compilación.
- `npm test`: pruebas del motor.
- `npm run test:e2e`: pruebas de navegador.
- `npm run format:check`: estilo del código.
- La distribución compilada incluye todos los recursos y funciona sin descargar fuentes, scripts o API de Internet. Necesita un servidor HTTP local, no abrir index.html con doble clic.
- Alternativa de presentación: `scripts/serve.py`, `INICIAR.bat` o `iniciar.sh`, con Python 3. No es requisito para desarrollar con npm.

### Navegador de pruebas en Windows

`playwright.config.ts` usa `CHROMIUM_PATH` si está presente, o `/usr/bin/chromium` como valor del entorno Linux original. Esta ruta de respaldo no existe normalmente en Windows.

Se puede instalar Chromium con `npx playwright install chromium`, obtener su ruta con:

```sh
node --input-type=module -e "import { chromium } from '@playwright/test'; console.log(chromium.executablePath())"
```

Luego configurar `CHROMIUM_PATH` para la terminal correspondiente. No diagnosticar una ruta Linux faltante como un defecto del algoritmo. Una mejora futura posible es hacer portable la detección del navegador, si el usuario la solicita.

## Comportamiento y decisiones matemáticas

- Algoritmo propio en `src/numerical/bisection.ts`. No sustituirlo por un solver de bibliotecas.
- Condiciones: función continua en el intervalo y signos opuestos, salvo solución numérica detectada en un extremo.
- Se detectan extremos con evaluación cero antes de exigir cambio de signo.
- Punto medio: matemáticamente `(a+b)/2`; en código `a + (b-a)/2` con controles de rango.
- Criterio predeterminado del material: **b_k - a_k < epsilon**, desigualdad estricta.
- No reemplazarlo silenciosamente por residuo menor a tolerancia ni por <=.
- La fila inicial es k = 0: cuatro reducciones equivalen a cinco evaluaciones del punto medio.
- El máximo limita las evaluaciones del punto medio, entre 1 y 10000.
- El resultado y la cota corresponden al intervalo registrado en la última fila.
- Cota teórica del punto medio: `(b-a)/2`. Se almacena `max(c-a, b-c)` para contemplar el redondeo del punto medio.
- Residuo: `abs(f(c))`. No es equivalente al error en x.
- El error verdadero requiere una raíz de referencia. No afirmar que disminuye en cada fila; lo que se reduce a la mitad es el ancho y su cota teórica.
- Estados diferentes: tolerancia alcanzada, cero numérico, raíz en extremo, máximo de evaluaciones y límite de precisión.
- Un cero de la evaluación IEEE 754 no demuestra exactitud simbólica.
- Agotar el máximo no demuestra divergencia.
- Sin cambio de signo no significa ausencia de raíces: x^2 en [-1,1] es un contraejemplo.
- Una discontinuidad puede dar signos opuestos sin raíz: 1/x en [-1,1].
- Gramática restringida: x, pi, e; +, -, *, /, ^; sin, cos, tan, exp, log natural, sqrt, abs; ángulos en radianes. Exponentes constantes finitos. No eval ni asignaciones o acceso a objetos.
- Control conservador de dominio mediante intervalos; puede rechazar expresiones válidas por sobreestimación. No es prueba simbólica universal ni aritmética intervalar con redondeo dirigido. Mantener estas limitaciones explícitas.
- No reutilizar los valores redondeados de pantalla para continuar iteraciones.

## Ejemplos y referencias

Ejemplo principal de la Unidad 2:

- f(x) = x^3 - 5*x - 6.
- Intervalo refinado [2.6, 2.7], epsilon = 0.01.
- Puntos medios aproximados: 2.65, 2.675, 2.6875, 2.69375, 2.690625.
- Cinco evaluaciones, cuatro reducciones; ancho final aproximadamente 0.00625.
- Resultado 2.690625; cota aproximadamente 0.003125.
- Referencia de mayor precisión: 2.689095323637659.

Otros ejemplos: x^2 - 2 en [1,2], referencia sqrt(2); cos(x)-x en [0,1], referencia 0.7390851332151607.

La guía general propone x^3 - 4*x - 1 en [1,2], pero f(1) = -4 y f(2) = -1. No tiene cambio de signo. Se documentó como caso de rechazo; [2,3] sí tiene cambio de signo.

## Funcionalidades existentes

- Formulario editable con función, a, b, tolerancia y máximo.
- Tres ejemplos precargados.
- Tabla de iteraciones completa, con más filas bajo demanda para no saturar el DOM.
- Selección por fila, deslizador y flechas de paso a paso.
- Gráfico de función e intervalo y gráfico de convergencia en escala logarítmica.
- Resultado final con estado, conteo, cota y residuo.
- Exportación CSV/JSON con precisión completa e impresión.
- Historial local limitado a ocho problemas, eliminable; no se envía a servidores.
- Secciones: Calculadora, Fundamento, Casos de prueba y El proyecto.
- Doce casos ejecutables en la propia interfaz, incluyendo rechazos esperados.
- Diseño adaptable, acceso por teclado y etiquetas accesibles.

## Archivos principales

- `src/numerical/bisection.ts`: motor puro.
- `src/expressions/parser.ts`: gramática, evaluación y dominio.
- `src/main.ts`: interfaz, navegación, historial y exportaciones.
- `src/charts.ts`: gráficos.
- `src/content.ts`: teoría, ejemplos y casos.
- `src/style.css`: diseño, tokens, adaptación e impresión.
- `tests/bisection.test.ts`: pruebas del núcleo.
- `tests/e2e/app.spec.ts`: flujos y accesibilidad.
- `README.md`: uso y decisiones técnicas.
- `entrega/`: ZIP completo, actualización de frente, instrucciones y capturas publicadas en GitHub.

## Verificación ya realizada

En la versión de rediseño fbf9202, en el entorno de nube:

- Compilación TypeScript/Vite aprobada.
- 74 pruebas de núcleo y validaciones aprobadas.
- 6 pruebas de navegador aprobadas también contra dist servido por Python.
- Recorrido de cálculo, pasos, gráficos, exportaciones, historial, entradas inválidas y vista móvil comprobados.
- Reglas automáticas axe de las cuatro secciones aprobadas; no equivalen a una auditoría manual completa.
- Sin solicitudes de recursos de Internet en el recorrido móvil verificado.
- ZIP completos y de actualización verificados con testzip.

Estos resultados no prueban que las mismas herramientas estén instaladas en la PC del usuario ni validan modificaciones locales posteriores. Comprobar lo necesario en la máquina local.

## Consigna y entregables pendientes

Los PDF adjuntos en la conversación original fueron `Trabajo_practico.pdf` y `UNIDAD_2_2025.pdf`, sección de bisección desde la página 13. No están incluidos automáticamente en la carpeta local ni en este resumen. Para cotejar detalles nuevos de la consigna, pedirlos si no están disponibles.

Ponderación: implementación 30%; fundamento 20%; funcionamiento y validación 15%; diseño 10%; pruebas y análisis 10%; documentación 10%; presentación 5%.

Informe pendiente: portada con universidad/facultad/carrera/asignatura/título/integrantes/docente/semestre-año; tecnologías; fundamento, fórmulas, algoritmo, aplicación, convergencia, parada y error; arquitectura y módulos; diagrama o pseudocódigo; implementación; pruebas con resultados y referencias; análisis y conclusiones. No inventar datos académicos faltantes.

Presentación pendiente: demostrar ejemplos en tiempo real, interpretar resultados y preparar preguntas. Todos los integrantes deben conocer el algoritmo y el sistema; la evaluación es individual y grupal. El material permite apoyo de IA siempre que se comprenda y defienda el código.

La aplicación y sus comprobantes impresos no sustituyen ese informe final. No empezar a inventar un informe completo cuando el usuario está pidiendo ajustes de la aplicación.

## Cómo retomar en Codex local

1. Leer este documento y README.md.
2. Inspeccionar la copia local y los cambios del usuario.
3. Confirmar qué versión visual y herramientas existen realmente.
4. Atender el nuevo pedido editando los archivos de la carpeta abierta.
5. Ejecutar las comprobaciones pertinentes e informar resultados reales, sin atribuir a Windows verificaciones hechas solo en la nube.
6. Mantener este resumen actualizado cuando se acuerden decisiones importantes.
