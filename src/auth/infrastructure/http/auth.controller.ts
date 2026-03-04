import {
    Controller,
    Post,
    Get,
    Body,
    HttpCode,
    HttpStatus,
    UseGuards,
    Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from '../../application/auth.service';
import { ChangePasswordDto, LoginDto, RefreshTokenDto, RegisterDto, UpdateProfileDto } from '../../application/dto/auth.dto';
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

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Logout (invalidate refresh token)' })
    logout(
        @CurrentUser() user: JwtPayload,
        @Body() body: { refreshToken?: string },
    ) {
        return this.authService.logout(user.sub, body.refreshToken);
    }

    @Get('me')
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Get current user profile' })
    getProfile(@CurrentUser() user: JwtPayload) {
        return this.authService.getProfile(user.sub);
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
