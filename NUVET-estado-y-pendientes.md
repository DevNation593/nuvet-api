# NuVet API: estado actual y pendientes de implementación

## Qué tiene hoy

La API ya es la base más completa del producto. Es un backend multi-tenant con NestJS, Prisma y PostgreSQL, e incluye módulos para:

- autenticación y usuarios;
- clientes y mascotas;
- citas;
- historia clínica;
- vacunación;
- estética y grooming;
- cirugías;
- tienda e inventario;
- adopciones;
- notificaciones;
- reportes;
- sucursales;
- POS y facturación;
- archivos, auditoría, observabilidad y feature flags.

## Qué falta para la nueva propuesta

### Diferenciación clínica y ecosistema

- Pasaporte médico digital formal de la mascota.
- Historial clínico compartible entre clínicas con autorización del propietario.
- Flujo explícito de consentimiento y trazabilidad de acceso entre sedes o terceros.
- Desparasitación y tratamientos como módulos o entidades dedicadas.
- Veterinarios a domicilio.
- Campañas de vacunación con rutas, zonas y seguimiento.
- Membresías mensuales para mascotas.
- Planes preventivos y paquetes anuales.
- Farmacia y despacho de medicamentos.
- Alertas de medicamentos y controles con reglas claras.
- Expediente de mascotas perdidas.
- Integración con refugios y municipios.
- Red de beneficios entre clínicas, tiendas y cuidadores.
- Seguimiento posoperatorio formal con formularios y fotografías.

### Monetización

- Modelo recurrente para prevención y membresías.
- Cobro por consultas a domicilio.
- Soporte para aliados o integraciones pagadas.

## Lectura técnica

La API no está vacía ni le falta el core; le falta la capa de producto nueva. Hoy el backend resuelve bien la operación de clínica, pero todavía no modela el ecosistema que quieres vender.

La mayor brecha está en nuevas entidades, permisos y flujos de negocio, no en autenticación ni en infraestructura base.

## Prioridad recomendada

1. Consentimiento y compartición de expedientes.
2. Pasaporte médico digital.
3. Membresías y planes preventivos.
4. Domicilio, farmacia y campañas.
5. Integraciones externas y red de aliados.
