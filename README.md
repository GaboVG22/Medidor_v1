# FotoMedidor de Zonas

Aplicación web estática para cargar una fotografía, calibrar una escala con una distancia conocida y delinear una zona con dedo, lápiz digital o mouse. Calcula área, perímetro, largo dominante, ancho máximo, ancho equivalente y ancho/alto aproximado.

## Uso recomendado

1. Tomar una foto lo más perpendicular posible a la superficie.
2. Incluir una referencia de medida conocida en el mismo plano de la zona a medir: regla, huincha, moneda, ancho de una pieza conocida, etc.
3. Cargar la foto.
4. Dibujar la línea de calibración sobre la referencia e ingresar su largo real.
5. Delinear el contorno de la zona.
6. Presionar **Cerrar y calcular**.

## Limitaciones

- La medición es aproximada.
- Si la foto tiene mucha perspectiva, la escala no será uniforme.
- La referencia de calibración debe estar en el mismo plano que la zona medida.
- No reemplaza levantamientos topográficos, fotogrametría profesional ni medición directa en terreno.

## Publicación en GitHub Pages

Sube todos los archivos de esta carpeta al repositorio. Luego activa GitHub Pages desde Settings → Pages → Deploy from branch → main / root.

No requiere npm, Vite ni build.
