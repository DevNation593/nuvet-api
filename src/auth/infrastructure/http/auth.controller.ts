import {
    Controller,
    Post,
    Get,
    Body,
    HttpCode,
    HttpStatus,
    UseGuards,
    Patch,
    Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from '../../application/auth.service';
import {
    ChangePasswordDto,
    ForgotPasswordDto,
    LoginDto,
    RefreshTokenDto,
    RegisterClientDto,
    RegisterDto,
    ResetPasswordDto,
    UpdateProfileDto,
    VerifyEmailDto,
} from '../../application/dto/auth.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '@nuvet/types';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    @Public()
    @HttpCode(HttpStatus.FORBIDDEN)
    @ApiOperation({ summary: 'Public registration disabled' })
    @ApiResponse({ status: 403, description: 'Public registration is disabled' })
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('register-client')
    @Public()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary:
            'Registro público de un cliente (dueño de mascota) en una clínica existente. Devuelve sesión lista para auto-login.',
    })
    @ApiResponse({ status: 201, description: 'Cuenta creada, sesión devuelta' })
    @ApiResponse({ status: 400, description: 'tenantSlug inválido o sin clínicas activas' })
    @ApiResponse({ status: 409, description: 'Email ya registrado en esta clínica' })
    registerClient(@Body() dto: RegisterClientDto) {
        return this.authService.registerClient(dto);
    }

    @Post('login')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Authenticate user and get tokens' })
    @ApiResponse({ status: 200, description: 'Login successful with tokens' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Post('refresh')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Rotate refresh token to get new access token' })
    @ApiResponse({ status: 200, description: 'Tokens refreshed' })
    @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
    refresh(@Body() dto: RefreshTokenDto) {
        return this.authService.refreshToken(dto);
    }

    @Post('forgot-password')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Request password reset email' })
    @ApiResponse({ status: 200, description: 'Reset email sent if account exists' })
    forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto);
    }

    @Post('reset-password')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset password using token from email' })
    @ApiResponse({ status: 200, description: 'Password reset successful' })
    @ApiResponse({ status: 400, description: 'Invalid or expired token' })
    resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto);
    }

    @Post('verify-email')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify email address using token' })
    @ApiResponse({ status: 200, description: 'Email verified' })
    @ApiResponse({ status: 400, description: 'Invalid or expired token' })
    verifyEmail(@Body() dto: VerifyEmailDto) {
        return this.authService.verifyEmail(dto);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Logout (invalidate refresh token)' })
    @ApiResponse({ status: 200, description: 'Logged out successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    logout(
        @CurrentUser() user: JwtPayload,
        @Body() body: { refreshToken?: string },
    ) {
        return this.authService.logout(user.sub, body?.refreshToken);
    }

    @Get('me')
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Get current user profile' })
    getProfile(@CurrentUser() user: JwtPayload) {
        return this.authService.getProfile(user.sub);
    }

    @Get('home-summary')
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Get home dashboard summary metrics' })
    getHomeSummary(
        @CurrentUser() user: JwtPayload,
        @Query('date') date?: string,
        @Query('includeAppointments') includeAppointments?: string,
        @Query('includePos') includePos?: string,
        @Query('includeStore') includeStore?: string,
        @Query('includeDiscounts') includeDiscounts?: string,
    ) {
        return this.authService.getHomeSummary(user.tenantId, {
            date,
            includeAppointments: includeAppointments === 'true',
            includePos: includePos === 'true',
            includeStore: includeStore === 'true',
            includeDiscounts: includeDiscounts === 'true',
        });
    }

    @Patch('me')
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Update current user profile' })
    updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
        return this.authService.updateProfile(user.sub, dto);
    }

    @Patch('change-password')
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Change current user password' })
    changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
        return this.authService.changePassword(user.sub, dto);
    }
}
