import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
    BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload, UserRole } from '@nuvet/types';
import { PaginationQueryDto, buildPaginationArgs } from '../common/dto/pagination.dto';
import { PetsService } from '../pets/pets.service';
import { CreatePetDto, UpdatePetDto } from '../pets/dto/pet.dto';
import { AppointmentsService } from '../appointments/appointments.service';
import {
    AppointmentListQueryDto,
    CancelAppointmentDto,
    CreateAppointmentDto,
} from '../appointments/dto/appointment.dto';
import { StoreService } from '../store/store.service';
import { CreateOrderDto } from '../store/dto/store.dto';
import { PrismaService } from '../prisma/prisma.service';

class HistorialClienteQueryDto extends PaginationQueryDto {
    @ApiProperty({ description: 'ID de la mascota del cliente' })
    @IsString()
    @IsNotEmpty()
    petId: string;
}

class DisponibilidadClienteQueryDto {
    @ApiProperty({ example: '2026-03-10' })
    @IsString()
    @IsNotEmpty()
    fecha: string;

    @ApiProperty({ description: 'ID del veterinario o personal' })
    @IsString()
    @IsNotEmpty()
    personalId: string;
}

class DisponibilidadClinicaClienteQueryDto {
    @ApiProperty({ example: '2026-03-10' })
    @IsString()
    @IsNotEmpty()
    fecha: string;

    @ApiProperty({ description: 'Tipo de cita', example: 'CONSULTATION' })
    @IsString()
    @IsNotEmpty()
    tipo: string;
}

class ProductosClienteQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    categoria?: string;
}

@ApiTags('cliente')
@ApiBearerAuth('JWT')
@Roles(UserRole.CLIENT)
@Controller({ path: 'cliente', version: '1' })
export class ClienteController {
    constructor(
        private readonly petsService: PetsService,
        private readonly appointmentsService: AppointmentsService,
        private readonly storeService: StoreService,
        private readonly prisma: PrismaService,
    ) {}

    @Get('mascotas')
    @ApiOperation({ summary: 'Listar mascotas del cliente autenticado' })
    listarMascotas(@CurrentUser() user: JwtPayload, @Query() query: PaginationQueryDto) {
        return this.petsService.findAll(user.tenantId, query, user.sub);
    }

    @Post('mascotas')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Crear mascota del cliente autenticado' })
    crearMascota(@CurrentUser() user: JwtPayload, @Body() dto: CreatePetDto) {
        return this.petsService.create(user.tenantId, { ...dto, ownerId: user.sub });
    }

    @Get('mascotas/:id')
    @ApiOperation({ summary: 'Obtener detalle de una mascota propia' })
    obtenerMascota(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.petsService.findOne(user.tenantId, id, user.sub);
    }

    @Patch('mascotas/:id')
    @ApiOperation({ summary: 'Actualizar una mascota propia' })
    actualizarMascota(
        @CurrentUser() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: UpdatePetDto,
    ) {
        return this.petsService.update(user.tenantId, id, dto, user.sub);
    }

    @Delete('mascotas/:id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Eliminar (desactivar) una mascota propia' })
    async eliminarMascota(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        await this.petsService.findOne(user.tenantId, id, user.sub);
        await this.prisma.pet.update({ where: { id }, data: { isActive: false } });
        return { mensaje: 'Mascota desactivada correctamente' };
    }

    @Get('citas')
    @ApiOperation({ summary: 'Listar citas del cliente autenticado' })
    listarCitas(@CurrentUser() user: JwtPayload, @Query() query: AppointmentListQueryDto) {
        return this.appointmentsService.findAll(user.tenantId, query, query, user.sub);
    }

    @Get('citas/personal')
    @ApiOperation({ summary: 'Listar personal asignable para reserva de citas del cliente' })
    listarPersonalCitas(@CurrentUser() user: JwtPayload) {
        return this.appointmentsService.getAssignableStaff(user.tenantId);
    }

    @Get('citas/:id')
    @ApiOperation({ summary: 'Obtener detalle de una cita propia' })
    obtenerCita(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.appointmentsService.findOne(user.tenantId, id, user.sub);
    }

    @Post('citas')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Crear cita para una mascota propia' })
    crearCita(@CurrentUser() user: JwtPayload, @Body() dto: CreateAppointmentDto) {
        return this.appointmentsService.create(user.tenantId, dto, user.sub);
    }

    @Delete('citas/:id')
    @ApiOperation({ summary: 'Cancelar cita propia' })
    cancelarCita(
        @CurrentUser() user: JwtPayload,
        @Param('id') id: string,
        @Body() body: CancelAppointmentDto,
    ) {
        return this.appointmentsService.cancel(user.tenantId, id, body.reason, user.sub, user.sub);
    }

    @Get('citas/disponibilidad')
    @ApiOperation({ summary: 'Consultar disponibilidad para reserva de cita' })
    disponibilidad(
        @CurrentUser() user: JwtPayload,
        @Query() query: DisponibilidadClienteQueryDto,
    ) {
        return this.appointmentsService.getAvailability(user.tenantId, query.fecha, query.personalId);
    }

    @Get('citas/disponibilidad-clinica')
    @ApiOperation({ summary: 'Consultar disponibilidad por clínica (asignación automática de personal)' })
    disponibilidadClinica(
        @CurrentUser() user: JwtPayload,
        @Query() query: DisponibilidadClinicaClienteQueryDto,
    ) {
        return this.appointmentsService.getClinicAvailability(user.tenantId, query.fecha, query.tipo);
    }

    @Get('historial/consultas')
    @ApiOperation({ summary: 'Listar consultas del historial de una mascota propia' })
    async historialConsultas(@CurrentUser() user: JwtPayload, @Query() query: HistorialClienteQueryDto) {
        const pet = await this.prisma.pet.findFirst({
            where: { id: query.petId, tenantId: user.tenantId, ownerId: user.sub, isActive: true },
        });
        if (!pet) throw new BadRequestException('Mascota no encontrada para este cliente');

        const { skip, take, page, limit } = buildPaginationArgs(query);
        const [registros, total] = await Promise.all([
            this.prisma.medicalRecord.findMany({
                where: { tenantId: user.tenantId, petId: query.petId, pet: { ownerId: user.sub } },
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: { vet: { select: { id: true, firstName: true, lastName: true } } },
            }),
            this.prisma.medicalRecord.count({
                where: { tenantId: user.tenantId, petId: query.petId, pet: { ownerId: user.sub } },
            }),
        ]);

        return {
            success: true,
            data: registros,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
                hasNextPage: page * limit < total,
                hasPrevPage: page > 1,
            },
        };
    }

    @Get('historial/vacunas')
    @ApiOperation({ summary: 'Listar vacunas del historial de una mascota propia' })
    async historialVacunas(@CurrentUser() user: JwtPayload, @Query() query: HistorialClienteQueryDto) {
        const pet = await this.prisma.pet.findFirst({
            where: { id: query.petId, tenantId: user.tenantId, ownerId: user.sub, isActive: true },
        });
        if (!pet) throw new BadRequestException('Mascota no encontrada para este cliente');

        const { skip, take, page, limit } = buildPaginationArgs(query);
        const [vacunas, total] = await Promise.all([
            this.prisma.vaccination.findMany({
                where: { tenantId: user.tenantId, petId: query.petId, pet: { ownerId: user.sub } },
                skip,
                take,
                orderBy: { administeredAt: 'desc' },
                include: { vet: { select: { id: true, firstName: true, lastName: true } } },
            }),
            this.prisma.vaccination.count({
                where: { tenantId: user.tenantId, petId: query.petId, pet: { ownerId: user.sub } },
            }),
        ]);

        return {
            success: true,
            data: vacunas,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
                hasNextPage: page * limit < total,
                hasPrevPage: page > 1,
            },
        };
    }

    @Get('tienda/productos')
    @ApiOperation({ summary: 'Listar catálogo de tienda para cliente' })
    productosTienda(@CurrentUser() user: JwtPayload, @Query() query: ProductosClienteQueryDto) {
        return this.storeService.findAllProducts(user.tenantId, query, query.categoria);
    }

    @Get('tienda/ordenes')
    @ApiOperation({ summary: 'Listar órdenes del cliente autenticado' })
    ordenesTienda(@CurrentUser() user: JwtPayload, @Query() query: PaginationQueryDto) {
        return this.storeService.findClientOrders(user.tenantId, user.sub, query);
    }

    @Post('tienda/ordenes')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Crear orden de tienda del cliente autenticado' })
    crearOrdenTienda(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrderDto) {
        return this.storeService.createOrder(user.tenantId, user.sub, dto);
    }
}
