# Fase 1: Pasaporte medico digital

## Estado

Diseno aprobado por el usuario el 2026-07-14.

## Objetivo

Formalizar el pasaporte medico digital de una mascota dentro de la clinica
emisora, usando las entidades clinicas existentes como fuente de verdad y sin
duplicar informacion en una nueva tabla.

La autorizacion de lectura entre clinicas, el modulo de consentimiento y la
trazabilidad completa de accesos se trataran en la Fase 2. Los tratamientos y
desparasitaciones como entidades dedicadas se trataran en la Fase 3.

## Contexto actual

El repositorio ya contiene:

- `PassportModule` y `PassportService`.
- Agregacion de `Pet`, `Vaccination`, `MedicalRecord` y `Surgery`.
- Busqueda cross-tenant por microchip con identidad minima.
- Consentimientos y shares existentes respaldados por auditoria.
- `PassportPrismaService` para consultas cross-tenant controladas.

La implementacion de esta fase debe completar y formalizar el contrato sin
romper los consumidores actuales. El acceso cross-tenant existente se mantiene
como compatibilidad, pero no se amplia en esta fase.

## Alcance

### Incluido

- Contrato DTO explicito para el pasaporte agregado.
- Identidad de la mascota: id, nombre, especie, raza, sexo, fecha de
  nacimiento, color, microchip, foto, peso actual, alergias y esterilizacion.
- Clinica emisora: id y nombre.
- Historial resumido de vacunas.
- Historial resumido de registros medicos.
- Historial resumido de cirugias.
- Evolucion de peso derivada de registros medicos y peso actual.
- Marca temporal de generacion del pasaporte.
- Validacion de ownership, tenant y permisos antes de agregar informacion.
- Redaccion de campos internos y adjuntos privados.
- Auditoria de accesos cross-tenant y mediante share usando la infraestructura
  existente.
- Pruebas de autorizacion, agregacion, redaccion y limites de respuesta.

### Excluido

- Nuevos flujos de consentimiento entre clinicas.
- Cambios al modelo de permisos de consentimiento.
- Nuevas entidades de tratamientos o desparasitaciones.
- Prescripciones, notas internas, adjuntos y credenciales en la respuesta
  publica del pasaporte.
- Duplicacion persistida del pasaporte.
- Migracion de datos o cambio de esquema Prisma, salvo que la implementacion
  revele una necesidad concreta aprobada posteriormente.

## Arquitectura

El pasaporte sera una proyeccion de lectura construida por
`PassportService.aggregate`. Las fuentes de verdad continuaran siendo:

- `Pet` para identidad y estado actual.
- `Vaccination` para vacunas.
- `MedicalRecord` para antecedentes medicos resumidos y peso historico.
- `Surgery` para procedimientos quirurgicos.
- `Tenant` para la clinica emisora.

No se creara una entidad `PetPassport` en esta fase. Esto evita sincronizacion,
duplicacion y migraciones innecesarias.

La resolucion de acceso seguira separando:

- Acceso del propietario dentro del tenant de la mascota.
- Acceso de staff autorizado dentro del tenant.
- Acceso cross-tenant existente, condicionado a consentimiento activo y
  auditado. Este camino sera endurecido y cubierto formalmente en la Fase 2.

Las lecturas cross-tenant continuaran usando `PassportPrismaService`, que evita
el scope automatico del tenant. Cada uso debe tener una razon explicita y una
entrada de auditoria.

## Contrato HTTP

### Obtener pasaporte

`GET /api/v1/passport/pets/:petId`

Devuelve un objeto de pasaporte con bloques de identidad, clinica emisora,
vacunas, registros medicos, cirugias, historial de peso y `generatedAt`.

Cada bloque clinico se limita a 50 registros ordenados desde el mas reciente,
sin paginacion adicional en esta fase.

### Buscar por microchip

`GET /api/v1/passport/lookup?microchip=<value>`

Solo esta disponible para staff autenticado y devuelve identidad minima:
`petId`, nombre, microchip, tenant emisor y nombre de la clinica. Nunca devuelve
datos medicos.

### Shares existentes

Los endpoints actuales de shares se conservan para compatibilidad. No se
introducen nuevos permisos ni nuevos flujos de sharing en esta fase. Su
consentimiento y trazabilidad seran revisados en la Fase 2.

## Seguridad y errores

- `401 Unauthorized` continua bajo responsabilidad del guard JWT global.
- `403 Forbidden` se devuelve cuando el actor no es propietario, staff valido
  o no tiene consentimiento cross-tenant activo.
- `404 Not Found` se devuelve cuando la mascota no existe.
- `petId`, `tenantId` y relaciones no se aceptan como fuente de autoridad desde
  el body o query del cliente.
- La respuesta no incluye `prescriptions`, `notes`, adjuntos, datos de acceso,
  tokens ni secretos.
- Los logs de auditoria no almacenan tokens de share en claro.
- Los accesos cross-tenant registran tenant origen, tenant del actor, actor,
  accion, mascota, IP y user-agent cuando estan disponibles.

## Criterios de aceptacion

1. Un propietario puede leer el pasaporte de su mascota dentro de su clinica.
2. Un veterinario o administrador autorizado puede leerlo dentro de su tenant.
3. Un actor sin ownership ni permiso recibe `403`.
4. Una mascota inexistente produce `404`.
5. La busqueda por microchip nunca devuelve historial medico.
6. El pasaporte contiene solo los campos publicables definidos por el DTO.
7. Los registros de cada categoria respetan el limite de 50 y el orden
   descendente esperado.
8. Los accesos cross-tenant y mediante share quedan auditados sin secretos.
9. Los consumidores existentes no requieren un cambio destructivo de contrato.

## Implementacion y commits

La rama de trabajo sera:

`feat/fase-1-pasaporte-medico`

Los cambios importantes se separaran en commits atomicos, como minimo:

- `feat(passport): formalize passport response contract`
- `fix(passport): enforce passport access boundaries`
- `test(passport): cover passport authorization and redaction`

Los nombres pueden ajustarse al estilo exacto de los commits del repositorio,
pero no se mezclaran contrato, logica y pruebas en un unico commit.

## Verificacion

Se ejecutaran, en este orden:

1. Pruebas focalizadas del modulo passport.
2. `pnpm lint`.
3. `pnpm build:types`.
4. `pnpm build`.

La finalizacion solo se declarara si los criterios de aceptacion son verificables
y los comandos ejecutados reportan exito.

## Rollback

La fase no agrega migraciones de base de datos. El rollback consiste en revertir
los commits de la rama de fase. Si durante la implementacion se identifica una
necesidad real de esquema, se detendra el cambio y se disenara una migracion
aditiva separada antes de continuar.

## Fases posteriores

- Fase 2, rama `feat/fase-2-consentimiento-trazabilidad`: autorizacion
  cross-clinic, consentimiento formal, expiracion/revocacion y trazabilidad
  completa de accesos.
- Fase 3, rama `feat/fase-3-tratamientos-desparasitacion`: entidades dedicadas,
  contratos y reglas de seguimiento para tratamientos y desparasitaciones.
