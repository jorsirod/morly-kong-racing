# Mecánicas y habilidades

Estado actualizado: el piloto jugable usa las reglas aprobadas posteriormente. Las secciones siguientes conservan la investigación y propuestas originales; las reglas implementadas de esta sección prevalecen cuando difieren.

## Reglas implementadas

- Tres básicos propios por piloto; personaje y carro se eligen por separado.
- Caja +3 cargas, reserva máxima 6; básico cuesta 1, especial 5. Carrera 0 al comenzar; práctica y batalla 3.
- Especial de impacto: 1,5 s de aturdimiento y 1 s de protección después; básico de giro: 0,45 s. Un lanzamiento/ráfaga sólo golpea y puntúa una vez por rival, incluso un búmeran.
- Humo y talco producen nube y deslizamiento, sin aturdimiento. Pintura afecta una parte de la vista. Los controles quedan visibles.
- Batalla: básico 1 punto; especial 2 puntos por rival/lanzamiento. Tres minutos sin eliminación.
- Banda anime durante unos 0,7 s, sin detener la carrera.
- **Revisión 2 (9 oct 2026):** ayuda de apuntado suave para proyectiles (cono de ±20°, 48 m, giro máximo 1,15 rad/s durante 1,5 s; se puede esquivar). El objeto se gasta al golpear; nubes y búmeran siguen. La especial del six-pack y la del PS3 salpican a 5,5 m del objetivo; la chinela salta una vez a otro rival a menos de 9 m. Todo sigue limitado a un golpe/puntuación por rival y lanzamiento.
- Cajas en 8 filas de tres a lo ancho de la pista por vuelta (antes 28 cajas sueltas); siguen dando +3 hasta 6. Reaparecen a los 7 s.
- Derrape en dos niveles (azul 0,6 / naranja 1,5 de carga) con empujón inmediato al soltar (+3 / +5 m/s) y turbo de 0,8 / 1,3 s. Salida con turbo si se presiona derrape en los últimos 0,7 s del 3-2-1; antes de tiempo no da nada.
- Rebufo: 1,1 s detrás de otro carro (15 m, cono angosto) da un empujón corto; luego 1,8 s de espera. Ayuda limitada a los rezagados: hasta +4,5 % de velocidad máxima si van a más de 40 m del líder (carrera y copa, igual para humanos y bots).

- Morly viste camisola de Lakers; Calín camisa blanca y gorra roja.
- Jorsi se inclina al lanzar la mochila, con un corazón de punta hacia abajo y cara sonriente que aparece pintado. Es una animación provisional.
- La invocación de Claudia muestra una invitada estilizada con lentes y dispara cebollas. La leche deja una zona resbalosa, aturde 1,5 s y desliza 2,7 s.

La fuente de los valores efectivos es `shared/content.ts` y `shared/simulation.ts`. Los efectos se deben equilibrar jugando con la pandilla.

## Sistema de ataques — confirmado

- Cada personaje tiene tres ataques básicos diferentes.
- Recoger ítems en la pista permite usar sus ataques propios y acumular carga para una habilidad especial que el jugador activa.
- La especial debe tener mayor impacto y causar una inmovilización más larga que un básico. Se busca variedad entre ataques contra un rival, varios rivales o zonas.
- Cantidad de cargas y duraciones fijadas posteriormente, en las reglas implementadas de arriba.

## Semilla — Jorge López

### Ataques elegidos por el usuario

1. Botella de cerveza Victoria.
2. Paquete de cigarros Marlboro.
3. Cenicero.

**Especial: «Acompáñame a comprar bicha».** Lanza un six-pack completo. Al activar el ataque aparece una banda estilo anime con el nombre de la habilidad.

### Efectos propuestos, pendientes de confirmar

- **Victoria:** proyectil hacia delante; hace girar al kart alcanzado y lo frena brevemente.
- **Marlboro:** al impactar genera una nube de humo que reduce brevemente la visibilidad del rival, conservando visibles los controles.
- **Cenicero:** se deja detrás como obstáculo; quien lo pisa da un pequeño salto y pierde velocidad.
- **Especial:** el six-pack impacta y las seis botellas estallan alrededor del objetivo, con posibilidad de alcanzar a rivales cercanos. Inmovilización mayor que el básico.
- La banda de la especial aparece arriba mientras continúa la carrera. El rostro de Semilla en la banda es una propuesta.

## Chete — Jorge Moraga

### Historia y ataques elegidos por el usuario

Chete era «el de dinero» del grupo.

1. Billete.
2. Monedas.
3. Diamante.

**Especial: «Si yo me voy nadie juega play».** Lanza un PlayStation 3. Se presenta con la banda estilo anime y el nombre del ataque.

### Efectos propuestos, pendientes de confirmar

- **Billete:** se pega frente a la cámara del rival alcanzado y tapa parcialmente su visión durante un momento, conservando visibles los controles.
- **Monedas:** lanza varias en abanico; pueden alcanzar a más de un rival, con una breve pérdida de velocidad por impacto.
- **Diamante:** proyectil recto que hace girar al kart alcanzado y lo frena brevemente.
- **Especial:** lanza la consola hacia delante; al caer produce una onda de impacto que inmoviliza durante más tiempo a los rivales dentro de un radio pequeño.

## Morly — Marlon Pérez (Marlon Hernán)

### Ataques elegidos por el usuario

1. Botella de Toña.
2. Botella de Ron Plata.
3. Bolsa de hielo.

**Especial: «Chinelazo Voltio Impact!!»**

### Efectos propuestos, pendientes de confirmar

- **Toña:** lanzamiento recto que hace derrapar brevemente al kart alcanzado.
- **Ron Plata:** lanzamiento con rebote en la pista, capaz de amenazar a más de un rival.
- **Bolsa de hielo:** se deja en el suelo como trampa resbalosa; el kart que la pisa patina.
- **Especial:** aparece la banda estilo anime y Morly lanza una chinela cargada de electricidad; al impactar, aturde brevemente al rival y puede saltar a otro kart cercano. El usuario aprobó esta idea.

## Coconitas — Luis Carlos Peña

### Ataques elegidos por el usuario

1. Una pelota de básquet.
2. Dos pelotas de básquet.
3. Una botella de Flor de Caña.

**Especial: «Kokonit Fatality».** Es una explosión gigante de talco.

### Efectos propuestos, pendientes de confirmar

- **Una pelota:** rebota hacia delante y hace dar un pequeño salto al kart que golpea.
- **Dos pelotas:** salen separadas en abanico para cubrir dos trayectorias.
- **Flor de Caña:** proyectil recto que hace perder el control brevemente al rival alcanzado.
- **Especial:** aparece la banda estilo anime y estalla una nube grande de talco que cubre a los rivales en un área; reduce brevemente su visibilidad, dejando los controles visibles. La nube afecta a varios rivales y no los inmoviliza, para que se distinga de las especiales de impacto directo.

## Calín — Memo Benavente

### Ataques elegidos por el usuario

1. Una hoja de cannabis.
2. Dos hojas de cannabis.
3. Tres hojas de cannabis.

**Especial: «Ármate 1».** Una explosión de humo.

### Efectos propuestos

- **Una hoja:** proyectil recto que frena brevemente a un rival.
- **Dos hojas:** dos proyectiles en abanico para cubrir una zona más amplia.
- **Tres hojas:** abanico de tres proyectiles; si más de uno impacta al mismo kart, aumenta un poco el frenado.
- **Especial:** aparece la banda estilo anime con «Ármate 1» y estalla una nube de humo alrededor de Calín; los rivales cercanos pierden velocidad y ven la pista nublada brevemente, con los controles siempre visibles.

## Sap Heinz — el usuario lo escribió «Zaphains» en esta descripción

### Ataques elegidos por el usuario

1. Un sapito.
2. Dos sapitos.
3. Tres sapitos.

**Especial: «Pizza de la rotonda».** Lanza una pizza grande.

### Efectos propuestos

- **Un sapito:** proyectil que rebota por la pista y frena brevemente al kart alcanzado.
- **Dos sapitos:** dos proyectiles que salen en paralelo.
- **Tres sapitos:** tres proyectiles en abanico para cubrir más ancho de pista.
- **Especial:** aparece la banda estilo anime con el nombre y lanza una pizza grande; el impacto inmoviliza al rival durante más tiempo que un básico.

## Enanonitas — Randall Rodas

### Ataques elegidos por el usuario

1. Una cebolla.
2. Dos cebollas.
3. Tres cebollas.

**Especial: «Yo te invoco, Claudia Salinas».** Invoca a Claudia, quien lanza cebollas y aturde a los rivales que alcanza.

### Efectos propuestos

- **Una cebolla:** proyectil recto que frena brevemente al rival alcanzado.
- **Dos cebollas:** dos proyectiles en abanico.
- **Tres cebollas:** tres proyectiles que cubren una franja más ancha de la pista.
- **Especial:** aparece la banda estilo anime; una invitada caricaturesca con lentes lanza una ráfaga de cebollas y aturde a los rivales alcanzados durante más tiempo que los básicos. El diseño se mantiene juguetón y estilizado.

## Jorsi

### Especial elegida por el usuario

**«Yo te pinto la mochila».** En la animación, Jorsi agarra una mochila y, mirando hacia abajo, le pinta un corazón con una carita feliz adentro.

### Ataques básicos inventados como propuesta

1. **Plumazo de pintura:** lanza un pincel; al golpear, salpica pintura y frena brevemente al rival.
2. **Lápiz con resorte:** lanza un lápiz que rebota una vez y hace girar al kart alcanzado.
3. **Borrador volador:** un borrador sale y regresa como búmeran; puede golpear al mismo rival al ir y al volver, con efecto breve cada vez.

### Efecto propuesto para la especial

Al terminar el dibujo, el corazón pintado se desprende como un sello grande y cae sobre una zona de la pista; los rivales alcanzados quedan cubiertos de pintura y se inmovilizan más tiempo que con un básico. La duración y el área quedan por ajustar.

## Raulín — Raúl González

### Ataques elegidos por el usuario

1. Un pepino.
2. Dos pepinos.
3. Tres pepinos.

**Especial: «Balde de leche».** Lanza un balde gigantesco de leche que hace resbalar e inmoviliza a los rivales.

### Efectos propuestos

- **Un pepino:** lanzamiento recto que hace perder velocidad brevemente al rival alcanzado.
- **Dos pepinos:** dos pepinos en abanico.
- **Tres pepinos:** tres pepinos en abanico más ancho.
- **Especial:** aparece la banda estilo anime y cae el balde enorme; la leche cubre una zona de la pista y los rivales alcanzados resbalan y quedan inmovilizados durante más tiempo que con un básico. El tamaño del área y la duración quedan para ajustar en pruebas.
