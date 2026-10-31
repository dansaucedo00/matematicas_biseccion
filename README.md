# Intervalo · Laboratorio de bisección

Sistema educativo para Matemática IV – Cálculo Numérico. Implementa **bisección propia**, sin solucionadores externos de raíces. La interfaz y el contenido están en español.

## Empezar a desarrollar

Requisitos: Node.js **22.12+ o 24 LTS** y npm. Entorno verificado con Node 24.19 y npm 11.9.

```sh
cd /workspace/matematicas_biseccion
npm ci
npm run dev
```

En otra computadora, entra primero en la carpeta donde descargaste el proyecto. Vite muestra la dirección local al iniciarse. Detén el proceso con Ctrl+C.

## Preparar la presentación sin Internet

En una computadora con las dependencias instaladas:

```sh
npm run build
```

La carpeta `dist` contiene todos los recursos de la aplicación: no usa CDN, fuentes remotas, API ni servidor de cálculo.

Para ejecutar **la versión compilada** sin npm ni Internet, se necesita Python 3:

```sh
python3 scripts/serve.py
```

Abre `http://127.0.0.1:4173`. En Windows puedes usar `py -3 scripts/serve.py` o `INICIAR.bat`; en Linux/macOS, `./iniciar.sh`. Un puerto ocupado se cambia con `--port 4174`. El servidor solo escucha en la computadora local de forma predeterminada. No abras `dist/index.html` por doble clic: los módulos requieren servir los archivos por HTTP.

Alternativa con Node: `npm run preview`. No es necesario volver a instalar paquetes para cada demostración. Prueba el equipo de presentación con Internet desactivado antes de la clase.

## Funcionalidades

- Función editable, extremos, tolerancia y máximo de evaluaciones del punto medio.
- Tres ejemplos: el de la Unidad 2, √2 y cos(x) − x.
- Tabla completa, selección de filas, deslizador y navegación paso a paso.
- Gráficos SVG de la función y del ancho en escala logarítmica.
- Estados diferenciados: tolerancia, cero numérico, extremo, máximo y precisión.
- Exportación CSV/JSON con precisión completa e impresión desde el navegador.
- Historial local de hasta ocho problemas, eliminable. No envía datos a un servidor.
- Fundamento matemático y doce casos ejecutables de validación.
- Interfaz adaptable, navegación por teclado, etiquetas y mensajes accesibles.

La aplicación abre el ejemplo de clase ya calculado. Tras editar un campo se invalidan los resultados anteriores; hay que volver a calcular. El gráfico anterior queda identificado hasta ejecutar el nuevo problema.

## Convención matemática

Se usa el criterio de la Unidad 2: **ancho del intervalo < tolerancia**, con desigualdad estricta. La fila k = 0 corresponde al intervalo inicial: cuatro reducciones significan cinco evaluaciones de c. El máximo limita estas evaluaciones, no las reducciones.

Se devuelve el punto medio del intervalo que aparece en la última fila. La cota teórica es `(b-a)/2`; por redondeo del punto medio se almacena `max(c-a, b-c)`. El residuo `abs(f(c))` se informa por separado. Si la evaluación de un extremo o un punto medio produce cero, se informa un **cero numérico**, no una demostración simbólica.

El ejemplo `x^3 - 5*x - 6`, [2.6, 2.7], ε = 0.01 produce c ≈ **2.690625**, cinco puntos medios y cuatro reducciones. La cota final es aproximadamente **0.003125**.

## Expresiones admitidas y limitaciones

Variable `x`; constantes `pi`, `e`; operaciones `+ - * / ^`; funciones `sin cos tan exp log sqrt abs` con un argumento. Ángulos en radianes; `log` es natural. Usa punto decimal en la función. Los campos de extremos y tolerancia admiten punto o coma decimal y notación científica. Los exponentes deben ser constantes finitas. Se restringen longitud y complejidad, no se usa `eval`, y se excluyen asignaciones y acceso a objetos.

La continuidad se revisa conservadoramente mediante aritmética de intervalos para la gramática admitida. Detecta, entre otros, denominadores que pueden ser cero, polos de tangente y dominios de logaritmo y raíz. **No es un demostrador simbólico universal ni aritmética intervalar con redondeo dirigido.** Puede rechazar expresiones válidas por sobreestimación: simplifica la expresión o reduce el intervalo. Las garantías teóricas suponen continuidad y evaluaciones fiables; la aritmética es IEEE 754 de doble precisión. La aplicación no busca todas las raíces ni resuelve problemas con precisión arbitraria.

Para intervalos o valores extremos, el gráfico puede no ser representable: se conserva la información numérica. El gráfico es orientativo y nunca decide la convergencia.

## Verificaciones

```sh
npm test             # algoritmo, propiedades, dominios y entradas
npm run build        # comprobación TypeScript y compilación
npm run test:e2e     # flujos reales en Chromium y comprobaciones axe
```

Playwright usa `/usr/bin/chromium` en este entorno. En otra máquina instala un Chromium compatible y define `CHROMIUM_PATH` con su ruta. También puedes instalar el Chromium de Playwright con `npx playwright install chromium` y apuntar `CHROMIUM_PATH` al ejecutable instalado. Las pruebas levantan Vite en el puerto 5173; se necesita permiso para abrir procesos/puertos locales.

Los casos visibles verifican éxitos y rechazos esperados. √2 se contrasta con `Math.SQRT2`; la raíz cúbica de referencia es 2.689095323637659 y la de cos(x) − x, 0.7390851332151607. Las referencias no son usadas por el algoritmo de resolución.

## Estructura

```text
src/numerical/bisection.ts  Motor puro, resultados e historial de iteraciones
src/expressions/parser.ts  Gramática restringida, evaluación y dominio
src/charts.ts              Gráficos SVG sin servicios externos
src/main.ts                Formulario, navegación, historial y exportaciones
src/content.ts             Ejemplos, teoría y casos reproducibles
src/style.css              Diseño adaptable e impresión
tests/bisection.test.ts    Pruebas matemáticas y validaciones
tests/e2e/app.spec.ts      Flujos, móvil y accesibilidad
scripts/serve.py           Arranque local de la versión compilada
```

`mathjs` interpreta y evalúa expresiones; no calcula las raíces. El algoritmo de bisección es código del proyecto. Vite construye la aplicación, Vitest prueba el motor, Playwright verifica la interfaz y axe comprueba reglas automáticas de accesibilidad. Las comprobaciones automáticas no equivalen a una auditoría manual completa.

## Alcance de esta entrega

Incluye aplicación funcional, pruebas, instrucciones de ejecución y código fuente. El informe técnico en PDF, los datos de integrantes/docente y las diapositivas se preparan en la siguiente etapa. La impresión de resultados es un comprobante de cálculo, no el informe técnico final.

Material de referencia: guía del trabajo práctico de Matemática IV y Unidad 2 (2025), sección bisección, páginas 13–19 del PDF proporcionado. La guía general propone `x^3-4*x-1` en [1,2], que no tiene cambio de signo; se incluye como caso de rechazo. [2,3] sí permite iniciar el método.

## Paleta e interfaz

El diseño usa **#3E4396** como color principal, blanco, texto oscuro y tonos lavanda. Los tokens están centralizados al inicio de `src/style.css`. El menú lateral, los botones, las tarjetas, los estados, las tablas, los gráficos y el favicon usan esta paleta. La curva de f(x) usa el color principal y el punto medio usa un violeta de apoyo con trazo diferenciado.

Para actualizar una copia descargada anteriormente en Windows, consulta `entrega/ACTUALIZAR-FRONT.md`. La actualización visual no cambia dependencias ni el algoritmo.
